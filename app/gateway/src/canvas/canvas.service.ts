import { randomUUID } from "node:crypto";
import { readFile, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { type AssetRow, toAssetInfo } from "@ov/assets";
import type { CanvasEdge, CanvasFile, CanvasNode, CanvasUpdated } from "@ov/protocol";

import { atomicWriteFile } from "../common/atomic-write.js";
import { AssetsService } from "../common/assets.service.js";
import { GatewayEventBus } from "../common/gateway-event-bus.js";
import { WorkspacePathService } from "../common/workspace-path.service.js";
import { AsyncMutex } from "./async-mutex.js";
import { textContentHash } from "./canvas-hash.js";
import {
  absolutePosition,
  boundsOf,
  computeNodeSize,
  defaultNodeSize,
  effectiveSize,
  GROUP_PADDING,
  parseRatio,
  placeholderNodeSize,
  positionOf,
  type Point,
  type Rect,
  resolveDerivedOrFreePosition,
  type Size,
} from "./canvas-geometry.js";
import { CanvasPersistence, type DeletionIntent, type SystemMutationIntent } from "./canvas-persistence.js";
import { PluginStorage } from "./plugin-storage.js";
import { applyTextEdits, revertTextEdits, type TextEdit } from "./text-edits.js";
import { buildTableDocument, newTablePath, serializeTableDocument, type TableInput } from "./table-document.js";

const MODE = "workflow";
const GROUP_LABEL_MAX = 40;
const SOURCE_TOOL = "hub_canvas_write_node";

type UpdatePayload = Omit<CanvasUpdated, "type" | "origin"> & { origin?: CanvasUpdated["origin"] };

export interface PlaceholderInput {
  sourceNodeId?: string;
  prompt: string;
  model: string;
  mediaType?: string;
  aspectRatio?: string;
  backend?: string;
  model_id?: string;
  params?: Record<string, unknown>;
  source_tool?: string;
  generationAttemptId?: string;
  referenceImageAssetIds?: string[];
}

export interface GroupResult {
  groupId: string | null;
  addedNodes: CanvasNode[];
  removedNodeIds: string[];
  updatedNodes: CanvasNode[];
  skippedNodes?: { nodeId: string; reason: string; parentId?: string }[];
}

interface Mutation<T> {
  canvas?: CanvasFile;
  result: T;
  event?: UpdatePayload;
  intent?: Omit<SystemMutationIntent, "operationId">;
}

/**
 * 画布的读 / 改。所有写操作都在同一把锁里做"读 → 改 → 带证据写 → 广播"。
 *
 * **gateway 自己加的节点和边要等渲染层确认。** 渲染层是按整份快照保存的，它交上来的
 * 快照可能是 MCP 刚加节点之前的旧版本：直接写的话新节点就被冲掉了，而缩水保护
 * 会把这次保存当成没有证据的删除拒掉。所以 gateway 新增的 id 记在待确认集合里，
 * 渲染层保存时漏了、又不在它的删除意图里的，补回去并以 `origin:"reconcile"` 广播；
 * 保存里包含了才算确认。
 */
@Injectable()
export class CanvasService {
  private readonly log = new Logger("Canvas");
  private persistence?: CanvasPersistence;
  private pluginStore?: PluginStorage;
  private readonly lock = new AsyncMutex();
  private readonly nodeLocks = new Map<string, AsyncMutex>();
  private readonly pendingNodes = new Set<string>();
  private readonly pendingEdges = new Set<string>();
  private selection: string[] = [];
  private editing?: { nodeId: string; editSessionId: string };

  constructor(
    private readonly paths: WorkspacePathService,
    private readonly assets: AssetsService,
    private readonly bus: GatewayEventBus,
  ) {}

  private get store(): CanvasPersistence {
    this.persistence ??= new CanvasPersistence(this.paths.hiloDir);
    return this.persistence;
  }

  getCanvas(): Promise<CanvasFile> {
    return this.store.read();
  }

  private nodeLock(id: string): AsyncMutex {
    let m = this.nodeLocks.get(id);
    if (!m) this.nodeLocks.set(id, (m = new AsyncMutex()));
    return m;
  }

  /** 发 `canvas:updated`，空数组的 key 省掉，全空就不发。 */
  private emitUpdate(p: UpdatePayload): void {
    const out: Record<string, unknown> = { type: "canvas_updated" };
    for (const [k, v] of Object.entries(p)) {
      if (v === undefined) continue;
      if (Array.isArray(v) && v.length === 0) continue;
      out[k] = v;
    }
    if (Object.keys(out).length <= (p.origin ? 2 : 1)) return;
    this.bus.emit("canvas:updated", out);
  }

  private async mutate<T>(fn: (c: CanvasFile) => Mutation<T> | Promise<Mutation<T>>): Promise<T> {
    return this.lock.runExclusive(async () => {
      const current = await this.store.read();
      const m = await fn(structuredClone(current));
      if (m.canvas) {
        const intent = m.intent
          ? { systemMutationIntent: { operationId: randomUUID(), ...m.intent } }
          : { systemMutationIntent: undefined };
        await this.store.write(m.canvas, { source: "gateway", ...intent });
      }
      if (m.event) this.emitUpdate(m.event);
      return m.result;
    });
  }

  // -------------------------------------------------------------------------
  // 渲染层整份保存
  // -------------------------------------------------------------------------

  async replaceCanvas(incoming: CanvasFile, deletionIntent?: DeletionIntent): Promise<{ ok: true }> {
    return this.lock.runExclusive(async () => {
      const current = await this.store.read();
      const currentNodes = new Map(current.nodes.map((n) => [n.id, n]));
      const currentEdges = new Map(current.edges.map((e) => [e.id, e]));
      const explicit = new Set(deletionIntent?.operationId?.trim() ? deletionIntent.removedNodeIds : []);
      const explicitEdges = new Set(deletionIntent?.operationId?.trim() ? (deletionIntent.removedEdgeIds ?? []) : []);
      const next: CanvasFile = { ...incoming, nodes: [...incoming.nodes], edges: [...incoming.edges] };
      const inNodes = new Set(next.nodes.map((n) => n.id));
      const inEdges = new Set(next.edges.map((e) => e.id));

      const replayedNodes: CanvasNode[] = [];
      for (const id of [...this.pendingNodes]) {
        const node = currentNodes.get(id);
        if (!node) this.pendingNodes.delete(id);
        else if (inNodes.has(id)) this.pendingNodes.delete(id);
        else if (!explicit.has(id)) {
          next.nodes.push(node);
          inNodes.add(id);
          replayedNodes.push(node);
        }
      }
      const replayedEdges: CanvasEdge[] = [];
      for (const id of [...this.pendingEdges]) {
        const edge = currentEdges.get(id);
        if (!edge) this.pendingEdges.delete(id);
        else if (inEdges.has(id)) this.pendingEdges.delete(id);
        else if (!explicitEdges.has(id) && inNodes.has(edge.source) && inNodes.has(edge.target)) {
          next.edges.push(edge);
          replayedEdges.push(edge);
        }
      }
      await this.store.write(next, { source: "renderer", deletionIntent });
      if (replayedNodes.length || replayedEdges.length) {
        this.emitUpdate({ addedNodes: replayedNodes, addedEdges: replayedEdges, origin: "reconcile" });
      }
      return { ok: true as const };
    });
  }

  // -------------------------------------------------------------------------
  // 查询
  // -------------------------------------------------------------------------

  private assetOf(node: CanvasNode): AssetRow | undefined {
    const id = node.assetId ?? (node.data?.assetId as string | undefined);
    return id ? this.assets.byId(id) : undefined;
  }

  private metadataOf(row?: AssetRow): Record<string, any> {
    if (!row?.metadata) return {};
    try {
      return JSON.parse(row.metadata) as Record<string, any>;
    } catch {
      return {};
    }
  }

  summary(node: CanvasNode): Record<string, unknown> {
    const asset = this.assetOf(node);
    const meta = this.metadataOf(asset);
    const data = (node.data ?? {}) as Record<string, any>;
    const out: Record<string, unknown> = {
      id: node.id,
      type: node.type,
      name: asset?.name ?? (node.type === "file" ? data.name : undefined) ?? data.name,
    };
    if (data.pluginId) out.pluginId = data.pluginId;
    if (node.type === "group" && typeof data.label === "string" && data.label.trim()) out.label = data.label;
    const prompt = (meta.prompt ?? data.prompt ?? meta.description ?? data.description) as string | undefined;
    if (typeof prompt === "string" && prompt.trim()) {
      const t = prompt.trim();
      out.promptSnippet = t.length > 100 ? t.slice(0, 100) + "…" : t;
    }
    return out;
  }

  async listNodes(q: { type?: string; limit?: number; offset?: number }) {
    const c = await this.getCanvas();
    const nodes = c.nodes.filter((n) => !q.type || n.type === q.type);
    const offset = q.offset ?? 0;
    const limit = q.limit ?? 50;
    return { count: nodes.length, nodes: nodes.slice(offset, offset + limit).map((n) => this.summary(n)) };
  }

  async nodeDetails(ids: string[]) {
    const c = await this.getCanvas();
    const byId = new Map(c.nodes.map((n) => [n.id, n]));
    const nodes: Record<string, unknown>[] = [];
    const missing: string[] = [];
    for (const id of [...new Set(ids)]) {
      const node = byId.get(id);
      if (!node) {
        missing.push(id);
        continue;
      }
      nodes.push(await this.detail(c, node));
    }
    return missing.length ? { nodes, missing } : { nodes };
  }

  private async detail(c: CanvasFile, node: CanvasNode): Promise<Record<string, unknown>> {
    const asset = this.assetOf(node);
    const meta = this.metadataOf(asset);
    const data = (node.data ?? {}) as Record<string, any>;
    const out: Record<string, unknown> = {
      id: node.id,
      type: node.type,
      name: asset?.name ?? data.name ?? (typeof data.path === "string" ? path.basename(data.path) : undefined),
    };
    if (data.pluginId) out.pluginId = data.pluginId;
    const prompt = meta.prompt ?? data.prompt;
    if (prompt) out.prompt = prompt;
    const keep = ["model", "model_id", "description", "voice_id", "width", "height", "duration_ms", "fps", "reference_images", "reference_audios", "reference_videos", "error_message"];
    const metadata = Object.fromEntries(keep.filter((k) => meta[k] != null).map((k) => [k, meta[k]]));
    if (asset?.width != null) metadata.width ??= asset.width;
    if (asset?.height != null) metadata.height ??= asset.height;
    if (asset?.duration_ms != null) metadata.duration_ms ??= asset.duration_ms;
    if (Object.keys(metadata).length) out.metadata = metadata;
    const incoming = c.edges.filter((e) => e.target === node.id).map((e) => ({ source: e.source, target: e.target, type: e.type }));
    const outgoing = c.edges.filter((e) => e.source === node.id).map((e) => ({ source: e.source, target: e.target, type: e.type }));
    if (incoming.length) out.incomingEdges = incoming;
    if (outgoing.length) out.outgoingEdges = outgoing;
    if ((node.type === "image" || node.type === "video" || node.type === "audio") && asset && !asset.path.includes("..")) out.filePath = asset.path;
    if (node.type === "text" && asset) {
      const abs = this.paths.resolve(asset.path);
      const content = abs ? await readFile(abs, "utf8").catch(() => undefined) : undefined;
      if (content !== undefined) {
        out.textContent = content;
        out.textContentHash = textContentHash(content);
      }
    }
    if (node.type === "group") {
      const kids = c.nodes.filter((n) => n.parentId === node.id).map((n) => n.id).sort();
      out.childIds = kids.slice(0, 50);
      if (kids.length > 50) out.childIdsTotal = kids.length;
    }
    return out;
  }

  async search(q: { query: string; type?: string; fields?: string; limit?: number; offset?: number }) {
    const fields = new Set((q.fields ?? "name,prompt").split(",").map((s) => s.trim()).filter(Boolean));
    const needle = q.query.toLowerCase();
    const c = await this.getCanvas();
    const hits: Record<string, unknown>[] = [];
    const late: Record<string, unknown>[] = [];
    for (const n of c.nodes) {
      if (q.type && n.type !== q.type) continue;
      const s = this.summary(n);
      const asset = this.assetOf(n);
      const meta = this.metadataOf(asset);
      const data = (n.data ?? {}) as Record<string, any>;
      const name = [asset?.name, data.name, data.pluginId].filter(Boolean).join(" ").toLowerCase();
      const prompt = String(meta.prompt ?? data.prompt ?? meta.description ?? "").toLowerCase();
      if (fields.has("name") && name.includes(needle)) hits.push({ ...s, matchedField: "name" });
      else if (fields.has("prompt") && prompt.includes(needle)) hits.push({ ...s, matchedField: "prompt" });
      else if (fields.has("textContent") && n.type === "text" && asset) {
        const abs = this.paths.resolve(asset.path);
        const content = abs ? await readFile(abs, "utf8").catch(() => "") : "";
        if (content.toLowerCase().includes(needle)) late.push({ ...s, matchedField: "textContent" });
      }
    }
    const all = [...hits, ...late];
    const offset = q.offset ?? 0;
    return { count: all.length, matches: all.slice(offset, offset + (q.limit ?? 50)) };
  }

  // -------------------------------------------------------------------------
  // 节点增删
  // -------------------------------------------------------------------------

  /** 在 `c` 上加一个资产节点（原地改 c）。返回新节点和新边。 */
  private addAssetNode(
    c: CanvasFile,
    row: AssetRow,
    opts: { position?: Point; sourceNodeIds?: string[]; extraData?: Record<string, unknown>; size?: Size } = {},
  ): { node: CanvasNode; edges: CanvasEdge[] } {
    const type = toAssetInfo(row).type;
    const size = opts.size ?? (type === "text" ? undefined : computeNodeSize(row.width, row.height));
    const pos =
      opts.position ?? resolveDerivedOrFreePosition(c, MODE, size ?? effectiveSize({ id: "", type, positions: {} } as CanvasNode, MODE), opts.sourceNodeIds);
    const primary = c.nodes.find((n) => n.assetId === row.id && !(n.meta as any)?.cloneOf);
    const node: CanvasNode = {
      id: randomUUID(),
      type,
      positions: { [MODE]: pos },
      assetId: row.id,
      ...(size ? { size } : {}),
      ...(opts.extraData ? { data: { ...opts.extraData } } : {}),
      ...(primary ? { meta: { cloneOf: primary.id } } : {}),
    };
    c.nodes.push(node);
    const edges = this.addDerivationEdges(c, opts.sourceNodeIds ?? [], node.id);
    this.pendingNodes.add(node.id);
    return { node, edges };
  }

  /** 来源 → 目标的派生边。自环、重复、不存在的来源、已有的边都跳过。 */
  private addDerivationEdges(c: CanvasFile, sources: string[], target: string, extra: Record<string, unknown> = {}): CanvasEdge[] {
    const have = new Set(c.nodes.map((n) => n.id));
    const edgeIds = new Set(c.edges.map((e) => e.id));
    const out: CanvasEdge[] = [];
    for (const src of [...new Set(sources)]) {
      const id = `${src}->${target}`;
      if (src === target || !have.has(src) || edgeIds.has(id)) continue;
      const edge: CanvasEdge = { id, source: src, target, type: "derivation", data: { time: new Date().toISOString(), ...extra } };
      c.edges.push(edge);
      edgeIds.add(id);
      out.push(edge);
      this.pendingEdges.add(id);
    }
    return out;
  }

  async deleteNodes(ids: string[]) {
    return this.mutate((c) => {
      const targets = new Set(ids.filter((id) => c.nodes.some((n) => n.id === id)));
      if (targets.size === 0) return { result: { removedNodeIds: [] as string[], removedEdgeIds: [] as string[] } };
      const updated: CanvasNode[] = [];
      // 被删的组先解散：子节点转成绝对坐标、摘掉 parentId，否则它们会跟着组一起消失。
      for (const g of c.nodes.filter((n) => targets.has(n.id) && n.type === "group")) {
        for (const kid of c.nodes.filter((n) => n.parentId === g.id && !targets.has(n.id))) {
          const abs = absolutePosition(c, kid, MODE);
          if (abs) kid.positions = { ...kid.positions, [MODE]: abs };
          delete kid.parentId;
          updated.push(kid);
        }
      }
      const removedEdgeIds = c.edges.filter((e) => targets.has(e.source) || targets.has(e.target)).map((e) => e.id);
      c.nodes = c.nodes.filter((n) => !targets.has(n.id));
      c.edges = c.edges.filter((e) => !removedEdgeIds.includes(e.id));
      for (const id of targets) this.nodeLocks.delete(id);
      const removedNodeIds = [...targets];
      return {
        canvas: c,
        result: { removedNodeIds, removedEdgeIds },
        event: { removedNodeIds, removedEdgeIds, updatedNodes: updated },
        intent: { reason: "explicit-node-delete", removedNodeIds, removedEdgeIds, allowHighBlast: true },
      };
    });
  }

  async mediaNode(dto: { assetPath: string; position?: Point; sourceNodeIds?: string[]; allowDuplicate?: boolean }) {
    const rel = dto.assetPath.replace(/\\/g, "/").replace(/^\.\//, "");
    const row = this.assets.byPath(rel);
    if (!row) throw new NotFoundException(`Asset not tracked at "${dto.assetPath}". Import or generate the media into the workspace asset vault first, then retry.`);
    const type = toAssetInfo(row).type;
    if (type !== "image" && type !== "video" && type !== "audio") {
      throw new BadRequestException(`Cannot place asset of type "${type}" as canvas media. Use canvas_write_node with kind=text or kind=table for authored content.`);
    }
    return this.mutate((c) => {
      const primary = c.nodes.find((n) => n.assetId === row.id && !(n.meta as any)?.cloneOf);
      if (primary && !dto.allowDuplicate) {
        const edges = this.addDerivationEdges(c, dto.sourceNodeIds ?? [], primary.id);
        return {
          canvas: edges.length ? c : undefined,
          result: { nodeId: primary.id, assetId: row.id, assetType: type, reused: true },
          event: edges.length ? { addedEdges: edges } : undefined,
        };
      }
      const { node, edges } = this.addAssetNode(c, row, { position: dto.position, sourceNodeIds: dto.sourceNodeIds });
      return {
        canvas: c,
        result: { nodeId: node.id, assetId: row.id, assetType: type, reused: false },
        event: { addedNodes: [node], addedEdges: edges },
      };
    });
  }

  // -------------------------------------------------------------------------
  // 文本节点
  // -------------------------------------------------------------------------

  async writeTextNode(dto: {
    content: string;
    nodeId?: string;
    name?: string;
    position?: Point;
    sourceNodeIds?: string[];
    mode?: "replace" | "append" | "prepend";
    appendSeparator?: "auto-newline" | "none";
    expectedContentHash?: string;
  }) {
    if (!dto.nodeId) {
      if (dto.mode) throw new BadRequestException("`mode` is only valid when patching an existing node (provide `nodeId`).");
      return this.createTextNode(dto);
    }
    return this.updateTextNode(dto as typeof dto & { nodeId: string });
  }

  /** 新建：`.md` 放在工作区根目录，文件名取 name，重名 `name(1).md`。 */
  private async createTextNode(dto: { content: string; name?: string; position?: Point; sourceNodeIds?: string[] }) {
    const base = (dto.name ?? "").replace(/\.[^./\\]+$/, "").replace(/[/\\:*?"<>|\x00-\x1f]/g, " ").trim() || "untitled";
    let rel = `${base}.md`;
    for (let n = 1; await exists(this.paths.resolve(rel)!); n++) rel = `${base}(${n}).md`;
    const abs = this.paths.resolve(rel)!;
    const tmp = path.join(path.dirname(abs), `.${path.basename(abs)}.tmp-${randomUUID()}`);
    await writeFile(tmp, dto.content);
    await rename(tmp, abs);
    const snippet = dto.content.trim().split("\n")[0]!.slice(0, 100);
    const row = await this.assets.enroll(rel, { description: snippet, source_tool: SOURCE_TOOL });
    return this.mutate((c) => {
      const { node, edges } = this.addAssetNode(c, row, {
        position: dto.position,
        sourceNodeIds: dto.sourceNodeIds,
        extraData: { source_tool: SOURCE_TOOL, promptSeedSource: "agent" },
      });
      return {
        canvas: c,
        result: { nodeId: node.id, assetId: row.id, path: rel, contentLength: dto.content.length, created: true },
        event: { addedNodes: [node], addedEdges: edges },
      };
    });
  }

  /**
   * 改文本节点的 data。值为 undefined 的键表示删掉。节点不在或不是文本节点回 null，
   * 调用方（文本生成）据此判断用户是否在生成途中删了卡。
   */
  async updateTextNodeData(nodeId: string, patch: Record<string, unknown>): Promise<CanvasNode | null> {
    return this.mutate((c) => {
      const node = c.nodes.find((n) => n.id === nodeId);
      if (!node || node.type !== "text") return { result: null };
      const data: Record<string, unknown> = { ...(node.data ?? {}) };
      for (const [k, v] of Object.entries(patch)) {
        if (v === undefined) delete data[k];
        else data[k] = v;
      }
      node.data = data;
      return { canvas: c, result: node, event: { updatedNodes: [node] } };
    });
  }

  /**
   * 给还没有文件的空文本节点原地挂上一个文本资产（id、位置、边都不动）。
   * 节点已经有资产时不覆盖，回 `attached: false` 和现有节点，调用方改用那份资产。
   */
  async attachAssetToTextNode(nodeId: string, row: AssetRow): Promise<{ node: CanvasNode; attached: boolean } | null> {
    return this.mutate<{ node: CanvasNode; attached: boolean } | null>((c) => {
      const idx = c.nodes.findIndex((n) => n.id === nodeId);
      const target = c.nodes[idx];
      if (!target || target.type !== "text") return { result: null };
      if (target.assetId) return { result: { node: target, attached: false } };
      const { isEmpty: _dropped, ...rest } = target;
      const node: CanvasNode = {
        ...rest,
        assetId: row.id,
        data: { ...(target.data ?? {}), assetId: row.id, path: row.path, name: row.name ?? path.basename(row.path) },
      };
      c.nodes[idx] = node;
      return { canvas: c, result: { node, attached: true }, event: { updatedNodes: [node] } };
    });
  }

  /** 为一个已登记的文本资产新建节点，有来源时贴着来源放并连派生边。 */
  async addTextAssetNode(row: AssetRow, sourceNodeId?: string): Promise<string> {
    return this.mutate((c) => {
      const sources = sourceNodeId && c.nodes.some((n) => n.id === sourceNodeId) ? [sourceNodeId] : [];
      const { node, edges } = this.addAssetNode(c, row, { sourceNodeIds: sources });
      return { canvas: c, result: node.id, event: { addedNodes: [node], addedEdges: edges } };
    });
  }

  private async textTarget(nodeId: string, short = false) {
    const c = await this.getCanvas();
    const node = c.nodes.find((n) => n.id === nodeId);
    if (!node) throw new NotFoundException(`Canvas node not found: ${nodeId}`);
    if (node.type !== "text") {
      throw new BadRequestException(
        short ? `Node is not a text node: ${nodeId} (type=${node.type})` : `Node is not a text node: ${nodeId} (type=${node.type}). Use canvas_update_text_node only on text nodes.`,
      );
    }
    if (!node.assetId) throw new NotFoundException(`Text node has no asset reference: ${nodeId}`);
    const row = this.assets.byId(node.assetId);
    const abs = row && this.paths.resolve(row.path);
    if (!row || !abs) throw new NotFoundException(`Asset not found for node: ${nodeId}`);
    return { node, row, abs };
  }

  private async updateTextNode(dto: {
    nodeId: string;
    content: string;
    mode?: "replace" | "append" | "prepend";
    appendSeparator?: "auto-newline" | "none";
    expectedContentHash?: string;
  }) {
    const { node, row, abs } = await this.textTarget(dto.nodeId);
    return this.nodeLock(node.id).runExclusive(async () => {
      const existing = await readFile(abs, "utf8").catch(() => "");
      const hash = textContentHash(existing);
      if (dto.expectedContentHash && dto.expectedContentHash !== hash) {
        throw new ConflictException(
          `Text node content changed since your last read (current contentHash: ${hash}). Re-run canvas_grep_text or canvas_read_text and retry with fresh content.`,
        );
      }
      const sep = (joinEnd: string) => (dto.appendSeparator === "none" ? "" : joinEnd && !joinEnd.endsWith("\n") ? "\n" : "");
      const next =
        dto.mode === "append" ? existing + sep(existing) + dto.content : dto.mode === "prepend" ? dto.content + sep(dto.content) + existing : dto.content;
      await writeFile(abs, next);
      if (existing && next !== existing) {
        this.bus.emit("document-edit:result", {
          type: "document_edit_result",
          requestId: `agent-${randomUUID()}`,
          nodeId: node.id,
          status: "applied",
          origin: "agent",
          previousContentHash: hash,
          contentHash: textContentHash(next),
        });
      }
      this.emitUpdate({ origin: "mcp-write", updatedNodes: [{ ...node, data: { ...(node.data ?? {}), textRevision: Date.now() } }] });
      return { nodeId: node.id, assetId: row.id, contentLength: next.length, created: false };
    });
  }

  async applyTextEdits(dto: { requestId?: string; editSessionId?: string; nodeId: string; expectedContentHash: string; edits: TextEdit[] }) {
    const { node, abs } = await this.textTarget(dto.nodeId, true);
    const requestId = dto.requestId ?? `agent-${randomUUID()}`;
    const origin = dto.requestId ? "annotation" : "agent";
    return this.nodeLock(node.id).runExclusive(async () => {
      const content = await readFile(abs, "utf8");
      const previousContentHash = textContentHash(content);
      const head = { requestId, ...(dto.editSessionId ? { editSessionId: dto.editSessionId } : {}), nodeId: node.id };
      if (previousContentHash !== dto.expectedContentHash) {
        const out = {
          ...head,
          status: "conflict" as const,
          origin,
          previousContentHash,
          contentHash: previousContentHash,
          results: dto.edits.map((e) => ({
            annotationId: e.annotationId,
            ...(e.targetIndex !== undefined ? { targetIndex: e.targetIndex } : {}),
            status: "conflict",
            reason: "version_changed",
          })),
        };
        this.bus.emit("document-edit:result", { type: "document_edit_result", ...out });
        return out;
      }
      const r = applyTextEdits(content, dto.edits);
      if (!r.ok) {
        const out = { ...head, status: "conflict" as const, origin, previousContentHash, contentHash: previousContentHash, results: r.results };
        this.bus.emit("document-edit:result", { type: "document_edit_result", ...out });
        return out;
      }
      await atomicWriteFile(abs, r.content);
      const out = {
        ...head,
        status: "applied" as const,
        origin,
        previousContentHash,
        contentHash: textContentHash(r.content),
        results: r.results,
        appliedEdits: r.applied,
      };
      this.bus.emit("document-edit:result", { type: "document_edit_result", ...out });
      this.emitUpdate({ origin: "mcp-write", updatedNodes: [{ ...node, data: { ...(node.data ?? {}), textRevision: Date.now() } }] });
      return out;
    });
  }

  async revertTextEdits(dto: { nodeId: string; edits: TextEdit[] }) {
    const { node, abs } = await this.textTarget(dto.nodeId, true);
    return this.nodeLock(node.id).runExclusive(async () => {
      const content = await readFile(abs, "utf8");
      const r = revertTextEdits(content, dto.edits);
      if (r.appliedCount > 0) {
        await atomicWriteFile(abs, r.content);
        this.emitUpdate({ origin: "mcp-write", updatedNodes: [{ ...node, data: { ...(node.data ?? {}), textRevision: Date.now() } }] });
      }
      return { nodeId: node.id, status: r.appliedCount > 0 ? "applied" : "conflict", contentHash: textContentHash(r.content), content: r.content, results: r.results };
    });
  }

  // -------------------------------------------------------------------------
  // 分组
  // -------------------------------------------------------------------------

  async group(dto: { nodeIds: string[]; label?: string; layout?: "grid" | "vertical" }): Promise<GroupResult> {
    return this.mutate<GroupResult>((c) => this.groupWithin(c, dto));
  }

  /** 分组本体，在调用方已持有的锁和画布副本上做（新建节点后要在同一次写入里成组的路径也用它）。 */
  private groupWithin(c: CanvasFile, dto: { nodeIds: string[]; label?: string; layout?: "grid" | "vertical" }): Mutation<GroupResult> {
    const label = normalizeLabel(dto.label);
    const byId = new Map(c.nodes.map((n) => [n.id, n]));
    const skippedNodes: { nodeId: string; reason: string; parentId?: string }[] = [];
    const members: CanvasNode[] = [];
    for (const id of [...new Set(dto.nodeIds)]) {
      const n = byId.get(id);
      if (!n) skippedNodes.push({ nodeId: id, reason: "unknown" });
      else if (n.parentId) skippedNodes.push({ nodeId: id, reason: "already-grouped", parentId: n.parentId });
      else members.push(n);
    }
    const empty: GroupResult = { groupId: null, addedNodes: [], removedNodeIds: [], updatedNodes: [], ...(skippedNodes.length ? { skippedNodes } : {}) };
    if (members.length < 2) return { result: empty };
    const missing = members.filter((m) => !positionOf(m, MODE)).map((m) => m.id);
    if (missing.length) {
      throw new BadRequestException({
        code: "incomplete-positions",
        mode: MODE,
        missingNodeIds: missing,
        ...(skippedNodes.length ? { skippedNodes } : {}),
        message: `Cannot group nodes: ${missing.length} participant(s) lack ${MODE} positions.`,
      });
    }

    // 选择里已有组：并进第一个组，其余的组解散。
    const groups = members.filter((m) => m.type === "group");
    const removedNodeIds: string[] = [];
    let group: CanvasNode;
    let added: CanvasNode[] = [];
    if (groups.length) {
      group = groups[0]!;
      for (const g of groups.slice(1)) {
        for (const kid of c.nodes.filter((n) => n.parentId === g.id)) reparent(c, kid, group);
        removedNodeIds.push(g.id);
      }
      c.nodes = c.nodes.filter((n) => !removedNodeIds.includes(n.id));
      for (const m of members.filter((m) => m.type !== "group")) reparent(c, m, group);
      group.data = { ...(group.data ?? {}), frameMode: "auto" };
    } else {
      const rects = members.map((m) => ({ ...positionOf(m, MODE)!, ...effectiveSize(m, MODE) }));
      const b = boundsOf(rects);
      group = {
        id: `group-${randomUUID()}`,
        type: "group",
        positions: { [MODE]: { x: b.x - GROUP_PADDING.x, y: b.y - GROUP_PADDING.top } },
        size: { width: b.width + GROUP_PADDING.x * 2, height: b.height + GROUP_PADDING.top + GROUP_PADDING.bottom },
        sizes: { [MODE]: { width: b.width + GROUP_PADDING.x * 2, height: b.height + GROUP_PADDING.top + GROUP_PADDING.bottom } },
        data: label ? { label } : {},
        meta: { zIndex: -100 },
      };
      c.nodes.push(group);
      for (const m of members) reparent(c, m, group);
      added = [group];
      this.pendingNodes.add(group.id);
    }
    if (dto.layout) relayoutGroup(c, group, dto.layout);
    fitGroup(c, group);
    const kids = c.nodes.filter((n) => n.parentId === group.id);
    const updatedNodes = groups.length ? [group, ...kids] : kids;
    return {
      canvas: c,
      result: { groupId: group.id, addedNodes: added, removedNodeIds, updatedNodes, ...(skippedNodes.length ? { skippedNodes } : {}) },
      event: { addedNodes: added, removedNodeIds, updatedNodes },
      intent: removedNodeIds.length
        ? { reason: "group-reconciliation", removedNodeIds, removedEdgeIds: [], allowHighBlast: true }
        : undefined,
    };
  }

  async ungroup(groupId: string) {
    return this.mutate((c) => {
      const g = c.nodes.find((n) => n.id === groupId);
      if (!g || g.type !== "group") return { result: { removed: false, removedNodeIds: [] as string[], updatedNodes: [] as CanvasNode[] } };
      const gp = positionOf(g, MODE);
      if (!gp) {
        throw new BadRequestException({
          code: "incomplete-positions",
          mode: MODE,
          missingNodeIds: [groupId],
          availableModes: Object.keys(g.positions ?? {}),
          message: `Cannot ungroup: group lacks ${MODE} position.`,
        });
      }
      const updatedNodes: CanvasNode[] = [];
      for (const kid of c.nodes.filter((n) => n.parentId === groupId)) {
        for (const [mode, p] of Object.entries(kid.positions ?? {})) {
          const pp = g.positions?.[mode];
          if (pp) kid.positions[mode] = { x: p.x + pp.x, y: p.y + pp.y };
        }
        delete kid.parentId;
        updatedNodes.push(kid);
      }
      c.nodes = c.nodes.filter((n) => n.id !== groupId);
      return {
        canvas: c,
        result: { removed: true, removedNodeIds: [groupId], updatedNodes },
        event: { removedNodeIds: [groupId], updatedNodes },
        intent: { reason: "group-reconciliation", removedNodeIds: [groupId], removedEdgeIds: [], allowHighBlast: true },
      };
    });
  }

  /**
   * 把"这一轮产出的"节点归成一组。有会话时只看这个会话生成的；没有会话时，以已分组
   * 资产里最新的创建时间为界，只收比它新的 —— 否则会把用户早就整理好的东西再圈一遍。
   */
  async groupRecentOutputs(label: string | undefined, sessionId: string | undefined) {
    const c = await this.getCanvas();
    const grouped = c.nodes.filter((n) => n.parentId);
    const threshold = sessionId ? 0 : Math.max(0, ...grouped.map((n) => this.assetOf(n)?.created_at ?? 0));
    const candidates = c.nodes.filter((n) => {
      if (n.type === "group" || n.type === "placeholder" || (n.meta as any)?.cloneOf || n.parentId) return false;
      const row = this.assetOf(n);
      if (!row) return false;
      const meta = this.metadataOf(row);
      if (meta.model === "user_uploaded" || meta.model === "imported") return false;
      if (sessionId) return meta.session_id === sessionId;
      return row.created_at > threshold;
    });
    if (!sessionId && threshold === 0 && grouped.length === 0 && candidates.length > 0 && c.nodes.some((n) => n.type === "group")) {
      return { groupId: null, groupedCount: 0, reason: "no-session-scope" };
    }
    if (candidates.length < 2) return { groupId: null, groupedCount: 0, reason: "insufficient-candidates" };
    const r = await this.group({ nodeIds: candidates.map((n) => n.id), label, layout: "grid" });
    if (!r.groupId) return { groupId: null, groupedCount: 0, reason: "no-op" };
    return { groupId: r.groupId, groupedCount: candidates.length, ...(normalizeLabel(label) ? { label: normalizeLabel(label) } : {}) };
  }

  // -------------------------------------------------------------------------
  // 占位卡
  // -------------------------------------------------------------------------

  async createPlaceholder(dto: { sourceNodeId: string; prompt: string; model: string; mediaType?: string; aspectRatio?: string }) {
    return this.addPlaceholder(dto);
  }

  /**
   * 建一张"生成中"的占位卡。来源可选：有来源时贴着来源往下排、连派生边，并清掉同来源同 prompt
   * 之前失败的卡（这次重试就是替它的）；没有来源时找一块空地。
   */
  async addPlaceholder(dto: PlaceholderInput): Promise<{ placeholderId: string }> {
    return this.mutate((c) => {
      let source: CanvasNode | undefined;
      if (dto.sourceNodeId) {
        source =
          c.nodes.find((n) => n.id === dto.sourceNodeId) ?? singleOrUndefined(c.nodes.filter((n) => n.assetId === dto.sourceNodeId));
        if (!source) {
          throw new BadRequestException({
            code: "PLACEHOLDER_SOURCE_NOT_FOUND",
            message: "Source node not found on canvas",
            sourceNodeId: dto.sourceNodeId,
            referenceAssetIds: dto.referenceImageAssetIds ?? [],
            candidateNodeIds: [],
          });
        }
      }
      const stale = source
        ? c.edges
            .filter((e) => e.source === source.id)
            .map((e) => c.nodes.find((n) => n.id === e.target))
            .filter((n): n is CanvasNode => !!n && n.type === "placeholder" && (n.data as any)?.status === "error" && (n.data as any)?.prompt === dto.prompt)
            .map((n) => n.id)
        : [];
      const removedEdgeIds = c.edges.filter((e) => stale.includes(e.source) || stale.includes(e.target)).map((e) => e.id);
      c.nodes = c.nodes.filter((n) => !stale.includes(n.id));
      c.edges = c.edges.filter((e) => !removedEdgeIds.includes(e.id));

      let aspectRatio = parseRatio(dto.aspectRatio) ? dto.aspectRatio : undefined;
      if (!aspectRatio && source && dto.mediaType !== "audio") {
        const row = this.assetOf(source);
        if (row?.width && row.height) aspectRatio = `${row.width}:${row.height}`;
      }
      const createdAt = new Date().toISOString();
      const size = placeholderNodeSize("generating", aspectRatio, dto.mediaType);
      const refs = dto.referenceImageAssetIds ?? [];
      const node: CanvasNode = {
        id: randomUUID(),
        type: "placeholder",
        positions: { [c.mode]: resolveDerivedOrFreePosition(c, c.mode, size, source ? [source.id] : []) },
        size,
        data: {
          prompt: dto.prompt,
          model: dto.model,
          status: "generating",
          createdAt,
          generationStartedAt: createdAt,
          ...(dto.generationAttemptId ? { generationAttemptId: dto.generationAttemptId } : {}),
          ...(refs.length ? { referenceImageIds: refs } : {}),
          ...(dto.backend ? { backend: dto.backend } : {}),
          ...(dto.model_id ? { model_id: dto.model_id } : {}),
          ...(dto.params && Object.keys(dto.params).length ? { params: dto.params } : {}),
          ...(dto.source_tool ? { source_tool: dto.source_tool } : {}),
          ...(dto.mediaType ? { mediaType: dto.mediaType } : {}),
          ...(aspectRatio ? { aspectRatio } : {}),
        },
      };
      c.nodes.push(node);
      this.pendingNodes.add(node.id);
      const edges = source ? this.addDerivationEdges(c, [source.id], node.id, { prompt: dto.prompt, model: dto.model }) : [];
      return {
        canvas: c,
        result: { placeholderId: node.id },
        event: { addedNodes: [node], addedEdges: edges, removedNodeIds: stale, removedEdgeIds },
        intent: stale.length ? { reason: "placeholder-cleanup", removedNodeIds: stale, removedEdgeIds, allowHighBlast: true } : undefined,
      };
    });
  }

  /**
   * 生成结果上画布。占位卡还在就**原地填**：id、位置、父组、边都不动，渲染层只收到一次
   * `updatedNodes`，节点不会卸载重挂；占位卡没了（用户删了）就当新节点加，贴着来源放。
   */
  async fillGeneratedNode(dto: { placeholderId?: string; replace?: boolean; sourceNodeId?: string; row: AssetRow; data: Record<string, unknown> }): Promise<string> {
    return this.mutate((c) => {
      const type = toAssetInfo(dto.row).type;
      const size = computeNodeSize(dto.row.width, dto.row.height) ?? defaultNodeSize(type);
      // `replace`：调用方点名要替换的已有节点（任意类型，例如"重新生成这张图"），同样原地填。
      const target = dto.placeholderId ? c.nodes.find((n) => n.id === dto.placeholderId && (n.type === "placeholder" || dto.replace)) : undefined;
      if (target) {
        const data: Record<string, unknown> = { ...(target.data ?? {}), ...dto.data, assetId: dto.row.id };
        for (const k of ["status", "errorMessage", "errorReason", "generationAttemptId", "generationStartedAt", "retryPayload", "mediaType", "aspectRatio"]) delete data[k];
        const node: CanvasNode = { ...target, type, assetId: dto.row.id, size, data };
        c.nodes[c.nodes.indexOf(target)] = node;
        this.pendingNodes.add(node.id);
        return { canvas: c, result: node.id, event: { updatedNodes: [node] } };
      }
      const sources = dto.sourceNodeId && c.nodes.some((n) => n.id === dto.sourceNodeId) ? [dto.sourceNodeId] : [];
      const { node, edges } = this.addAssetNode(c, dto.row, { sourceNodeIds: sources, extraData: dto.data, size });
      return { canvas: c, result: node.id, event: { addedNodes: [node], addedEdges: edges } };
    });
  }

  /**
   * 占位卡标成失败。`recoverable`：任务可能还在平台上跑（例如 gateway 重启时没来得及记下
   * 任务号），卡片提示用户自己决定要不要重新生成，而不是给一个"重试"按钮让它再付一次钱。
   */
  async failPlaceholder(dto: { placeholderId: string; errorMessage: string; errorReason?: string; retryPayload?: unknown; recoverable?: boolean }) {
    await this.mutate((c) => {
      const node = c.nodes.find((n) => n.id === dto.placeholderId);
      if (!node || node.type !== "placeholder") return { result: undefined };
      const msg = dto.errorMessage.trim().length >= 4 ? dto.errorMessage : "生成失败，请重试";
      const concurrency = /并发|concurren/i.test(msg);
      node.data = {
        ...(node.data ?? {}),
        status: dto.recoverable ? "recoverable_error" : "error",
        errorMessage: msg,
        ...(dto.errorReason || concurrency ? { errorReason: dto.errorReason ?? "CONCURRENCY_LIMIT" } : {}),
        ...(dto.retryPayload !== undefined ? { retryPayload: dto.retryPayload } : {}),
      };
      node.size = placeholderNodeSize((node.data as any).status, (node.data as any).aspectRatio, (node.data as any).mediaType);
      return { canvas: c, result: undefined, event: { origin: "generation-status", updatedNodes: [node] } };
    });
  }

  async cleanupPlaceholder(id: string) {
    await this.mutate((c) => {
      const node = c.nodes.find((n) => n.id === id);
      if (!node || node.type !== "placeholder") return { result: undefined };
      const removedEdgeIds = c.edges.filter((e) => e.source === id || e.target === id).map((e) => e.id);
      c.nodes = c.nodes.filter((n) => n.id !== id);
      c.edges = c.edges.filter((e) => !removedEdgeIds.includes(e.id));
      return {
        canvas: c,
        result: undefined,
        event: { removedNodeIds: [id], removedEdgeIds },
        intent: { reason: "placeholder-cleanup", removedNodeIds: [id], removedEdgeIds, allowHighBlast: true },
      };
    });
  }

  /**
   * 从一个来源派生出一批占位卡（分镜、多角度这类「一次出好几张」的玩法），两张以上时圈成一组。
   * 建卡和成组在同一次写入里，只发一帧事件 —— 分两次的话渲染层会先看到一堆散卡再看到它们被收进组里。
   */
  async placeholderGroup(dto: {
    sourceNodeId: string;
    cells: { prompt: string; model: string; mediaType?: string; aspectRatio?: string }[];
    label?: string;
    layout?: "grid" | "vertical";
  }) {
    return this.mutate((c) => {
      const source = this.findSource(c, dto.sourceNodeId);
      const row = this.assetOf(source);
      const created: CanvasNode[] = [];
      const addedEdges: CanvasEdge[] = [];
      dto.cells.forEach((cell, i) => {
        let aspectRatio = parseRatio(cell.aspectRatio) ? cell.aspectRatio : undefined;
        if (!aspectRatio && cell.mediaType !== "audio" && row?.width && row.height) aspectRatio = `${row.width}:${row.height}`;
        const size = placeholderNodeSize("generating", aspectRatio, cell.mediaType);
        const createdAt = new Date().toISOString();
        const node: CanvasNode = {
          id: randomUUID(),
          type: "placeholder",
          positions: { [c.mode]: resolveDerivedOrFreePosition(c, c.mode, size, [source.id]) },
          size,
          data: {
            prompt: cell.prompt,
            model: cell.model,
            status: "generating",
            createdAt,
            generationStartedAt: createdAt,
            params: { order: String(i) },
            ...(cell.mediaType ? { mediaType: cell.mediaType } : {}),
            ...(aspectRatio ? { aspectRatio } : {}),
          },
        };
        c.nodes.push(node);
        this.pendingNodes.add(node.id);
        created.push(node);
        addedEdges.push(...this.addDerivationEdges(c, [source.id], node.id, { prompt: cell.prompt, model: cell.model }));
      });
      const groupId = this.groupFresh(c, created, dto.label, dto.layout ?? "grid");
      return {
        canvas: c,
        result: { placeholderIds: created.map((n) => n.id), groupId },
        event: { addedNodes: this.freshNodes(c, created, groupId), addedEdges },
      };
    });
  }

  /** 把一批已有资产各放一个新节点（不复用已有节点），从来源连边，两个以上成组。找不到的资产丢掉。 */
  async nodesGroup(dto: { sourceNodeId: string; assetIds: string[]; label?: string; layout?: "grid" | "vertical" }) {
    return this.mutate((c) => {
      const source = this.findSource(c, dto.sourceNodeId);
      const rows = dto.assetIds.map((id) => this.assets.byId(id)).filter((r): r is AssetRow => !!r);
      if (rows.length === 0) return { result: { nodeIds: [] as string[], groupId: null as string | null } };
      const created: CanvasNode[] = [];
      const addedEdges: CanvasEdge[] = [];
      rows.forEach((row, i) => {
        const meta = this.metadataOf(row);
        const { node, edges } = this.addAssetNode(c, row, {
          sourceNodeIds: [source.id],
          extraData: {
            name: row.name,
            path: row.path,
            params: { order: String(i) },
            ...(typeof meta.prompt === "string" && meta.prompt ? { prompt: meta.prompt } : {}),
            ...(typeof meta.model === "string" && meta.model ? { model: meta.model } : {}),
            ...(row.width ? { width: row.width } : {}),
            ...(row.height ? { height: row.height } : {}),
          },
        });
        created.push(node);
        addedEdges.push(...edges);
      });
      const groupId = this.groupFresh(c, created, dto.label, dto.layout ?? "grid");
      return {
        canvas: c,
        result: { nodeIds: created.map((n) => n.id), groupId },
        event: { addedNodes: this.freshNodes(c, created, groupId), addedEdges },
      };
    });
  }

  private findSource(c: CanvasFile, sourceNodeId: string): CanvasNode {
    const source = c.nodes.find((n) => n.id === sourceNodeId) ?? singleOrUndefined(c.nodes.filter((n) => n.assetId === sourceNodeId));
    if (!source) throw new BadRequestException({ code: "PLACEHOLDER_SOURCE_NOT_FOUND", message: "Source node not found on canvas", sourceNodeId });
    return source;
  }

  /** 两个以上才成组。成组失败不连累已经建好的节点，只是不圈起来。返回组 id。 */
  private groupFresh(c: CanvasFile, created: CanvasNode[], label: string | undefined, layout: "grid" | "vertical"): string | null {
    if (created.length < 2) return null;
    try {
      const r = this.groupWithin(c, { nodeIds: created.map((n) => n.id), label, layout });
      if (r.canvas) {
        c.nodes = r.canvas.nodes;
        c.edges = r.canvas.edges;
      }
      return r.result.groupId;
    } catch (err) {
      this.log.warn(`成组失败，节点保持散放：${(err as Error).message}`);
      return null;
    }
  }

  /** 新建节点的最终状态（成组后的相对坐标、parentId），组节点排最前。都放进 addedNodes，不再重复出现在 updatedNodes。 */
  private freshNodes(c: CanvasFile, created: CanvasNode[], groupId: string | null): CanvasNode[] {
    const ids = new Set([...(groupId ? [groupId] : []), ...created.map((n) => n.id)]);
    const out = c.nodes.filter((n) => ids.has(n.id));
    return out.sort((a, b) => Number(b.type === "group") - Number(a.type === "group"));
  }

  /**
   * 把图片组里的几张拆出来单独放：排在主图右边一字排开，去掉组标记、显示出来、补上主图的提示词和模型，
   * 并从主图连派生边。
   */
  async splitSubImages(body: unknown) {
    const b = (body && typeof body === "object" ? body : {}) as { nodeId?: unknown; imageIds?: unknown };
    const imageIds = Array.isArray(b.imageIds) ? b.imageIds.filter((x): x is string => typeof x === "string" && x !== "") : [];
    if (typeof b.nodeId !== "string" || !b.nodeId || imageIds.length === 0) {
      throw new BadRequestException("nodeId and non-empty imageIds[] are required");
    }
    const mainId = b.nodeId;
    return this.mutate((c) => {
      const main = c.nodes.find((n) => n.id === mainId);
      const wanted = new Set(imageIds);
      const members = main
        ? c.nodes.filter((n) => n.id !== main.id && (wanted.has(n.id) || (!!n.assetId && wanted.has(n.assetId))) && (!main.groupId || n.groupId === main.groupId))
        : [];
      if (!main || members.length === 0) return { result: { splitNodeIds: [] as string[], removed: 0 } };
      const origin = positionOf(main, MODE) ?? { x: 0, y: 0 };
      const w = effectiveSize(main, MODE).width;
      const md = (main.data ?? {}) as Record<string, unknown>;
      const addedEdges: CanvasEdge[] = [];
      members.forEach((m, i) => {
        delete m.groupId;
        delete m.round;
        m.positions = { ...m.positions, [MODE]: { x: origin.x + (i + 1) * (w + 24), y: origin.y } };
        m.meta = { ...(m.meta ?? {}), hidden: false };
        const data = { ...(m.data ?? {}) } as Record<string, unknown>;
        if (data.prompt === undefined && md.prompt !== undefined) data.prompt = md.prompt;
        if (data.model === undefined && md.model !== undefined) data.model = md.model;
        m.data = data;
        addedEdges.push(...this.addDerivationEdges(c, [main.id], m.id));
      });
      return {
        canvas: c,
        result: { splitNodeIds: members.map((m) => m.id), removed: members.length },
        event: { updatedNodes: members, addedEdges, origin: "user-add" },
      };
    });
  }

  // -------------------------------------------------------------------------
  // 文件节点
  // -------------------------------------------------------------------------

  /**
   * 文件节点两种外观：卡片（固定 350×76）和预览（可调大小）。没点名时，给了宽高或是 html 就预览，其余卡片。
   * 已有节点被复用时形状参数不同就原地改，免得同一个文件在画布上出现两份。
   */
  async fileNode(dto: { assetPath: string; position?: Point; sourceNodeIds?: string[]; allowDuplicate?: boolean; viewMode?: "card" | "preview"; width?: number; height?: number }) {
    const rel = dto.assetPath.replace(/\\/g, "/").replace(/^\.\//, "");
    const row = this.assets.byPath(rel);
    if (!row) throw new NotFoundException(`Asset not tracked at "${dto.assetPath}". Import or upload the file into the workspace asset vault first, then retry.`);
    const type = toAssetInfo(row).type;
    if (type !== "file") {
      throw new BadRequestException(`Cannot place asset of type "${type}" as a file node. Use media-node for image/video/audio and text-node for text.`);
    }
    const sized = dto.width !== undefined || dto.height !== undefined;
    const viewMode = dto.viewMode ?? (sized || /\.html?$/i.test(row.path) ? "preview" : "card");
    const warnings: string[] = [];
    if (viewMode === "card" && sized) {
      warnings.push('width/height ignored in card mode — card frame is fixed at 350x76. Pass viewMode: "preview" to use a custom size.');
    }
    const size =
      viewMode === "card" ? { width: 350, height: 76 } : { width: Math.max(320, Math.round(dto.width ?? 820)), height: Math.max(200, Math.round(dto.height ?? 480)) };
    const fileType = path.extname(row.path).replace(/^\./, "").toLowerCase();
    const extra = warnings.length ? { warnings } : {};
    return this.mutate((c) => {
      const primary = c.nodes.find((n) => n.assetId === row.id && !(n.meta as any)?.cloneOf);
      if (primary && !dto.allowDuplicate) {
        const edges = this.addDerivationEdges(c, dto.sourceNodeIds ?? [], primary.id);
        const cur = effectiveSize(primary, MODE);
        const reshaped = (primary.data as any)?.viewMode !== viewMode || cur.width !== size.width || cur.height !== size.height;
        if (reshaped) {
          primary.size = size;
          if (primary.sizes?.[MODE]) primary.sizes = { ...primary.sizes, [MODE]: size };
          primary.data = { ...(primary.data ?? {}), viewMode };
        }
        const changed = reshaped || edges.length > 0;
        return {
          canvas: changed ? c : undefined,
          result: { nodeId: primary.id, assetId: row.id, fileType, viewMode, size, reused: true, ...extra },
          event: changed ? { updatedNodes: reshaped ? [primary] : [], addedEdges: edges } : undefined,
        };
      }
      const { node, edges } = this.addAssetNode(c, row, { position: dto.position, sourceNodeIds: dto.sourceNodeIds, size, extraData: { viewMode } });
      return {
        canvas: c,
        result: { nodeId: node.id, assetId: row.id, fileType, viewMode, size, reused: false, ...extra },
        event: { addedNodes: [node], addedEdges: edges },
      };
    });
  }

  /** 插件节点：file 类型且挂着 pluginId。插件节点本身不在我们的范围里，这里只守住接口。 */
  private async pluginIdOf(nodeId: string): Promise<string> {
    const node = (await this.getCanvas()).nodes.find((n) => n.id === nodeId);
    const pluginId = (node?.data as any)?.pluginId;
    if (!node || node.type !== "file" || typeof pluginId !== "string" || !pluginId.trim()) {
      throw new BadRequestException(`Node is not an installed HTML-plugin node: ${nodeId}`);
    }
    return pluginId;
  }

  private get pluginStorage(): PluginStorage {
    this.pluginStore ??= new PluginStorage(this.assets.vault.db);
    return this.pluginStore;
  }

  async writePluginData(dto: { nodeId: string; key: string; value?: unknown; deleteKey?: boolean }) {
    const pluginId = await this.pluginIdOf(dto.nodeId);
    const r = this.pluginStorage.write(dto.nodeId, pluginId, dto.key, dto.value, dto.deleteKey === true);
    if (r.changed) this.bus.emit("plugin-storage:changed", { type: "plugin_storage_changed", nodeId: dto.nodeId });
    return { nodeId: dto.nodeId, key: dto.key, keys: r.keys, totalBytes: r.totalBytes };
  }

  async readPluginData(dto: { nodeId: string; key?: string }) {
    await this.pluginIdOf(dto.nodeId);
    return { nodeId: dto.nodeId, ...this.pluginStorage.read(dto.nodeId, dto.key) };
  }

  // -------------------------------------------------------------------------
  // 编辑产物（ffmpeg / 拼接 / 配音轨）
  // -------------------------------------------------------------------------

  /**
   * 编辑产物上画布。`replaceNodeId` 指向的节点还在就原地替换（例如给临时视频配上音轨后，
   * 画布上只留最终版）；否则新建节点，从来源节点和各输入素材的节点连派生边。
   */
  async placeDerivedMedia(dto: {
    row: AssetRow;
    replaceNodeId?: string;
    sourceNodeId?: string;
    referenceAssetIds?: string[];
    data: Record<string, unknown>;
  }): Promise<string> {
    if (dto.replaceNodeId && (await this.getCanvas()).nodes.some((n) => n.id === dto.replaceNodeId)) {
      return this.fillGeneratedNode({ placeholderId: dto.replaceNodeId, replace: true, row: dto.row, data: dto.data });
    }
    return this.mutate((c) => {
      const sources: string[] = [];
      if (dto.sourceNodeId && c.nodes.some((n) => n.id === dto.sourceNodeId)) sources.push(dto.sourceNodeId);
      for (const assetId of dto.referenceAssetIds ?? []) {
        const n = c.nodes.find((x) => x.assetId === assetId && !(x.meta as any)?.cloneOf);
        if (n) sources.push(n.id);
      }
      const type = toAssetInfo(dto.row).type;
      const size = computeNodeSize(dto.row.width, dto.row.height) ?? defaultNodeSize(type);
      const { node, edges } = this.addAssetNode(c, dto.row, { sourceNodeIds: sources, extraData: dto.data, size });
      return { canvas: c, result: node.id, event: { addedNodes: [node], addedEdges: edges } };
    });
  }

  /**
   * 用户自己把一个已登记的资产放上画布（右键"添加到画布"、从资源面板拖、粘贴、裁剪出的新图）。
   *
   * `replaceNodeId` 指向的节点还在就**原地填**：id、位置不动，只广播 `updatedNodes`，渲染层不卸载
   * 重挂；不在了就当新节点加。`sourceNodeId` 连一条来源 → 新节点的派生边，`targetNodeId`
   * 连一条新节点 → 目标的边（例如给视频节点挂参考图）。广播带 `origin:"user-add"`：
   * 用户自己放的东西不该弹"新节点已生成"的提示，哪怕资产元数据里还留着上次生成的 model。
   */
  async addNodeByAsset(
    row: AssetRow,
    dto: { position?: Point; sourceNodeId?: string; replaceNodeId?: string; targetNodeId?: string },
  ): Promise<string> {
    const info = toAssetInfo(row);
    const m = this.metadataOf(row);
    const data: Record<string, unknown> = { name: info.name, path: info.path };
    if (m.prompt) data.prompt = m.prompt;
    if (m.description) data.description = m.description;
    if (m.model) data.model = m.model;
    if (m.voice_id) data.voiceId = m.voice_id;
    for (const [from, to] of [
      ["reference_images", "referenceImageIds"],
      ["reference_audios", "referenceAudioIds"],
      ["reference_videos", "referenceVideoIds"],
    ] as const) {
      if (Array.isArray(m[from]) && m[from].length) data[to] = m[from];
    }
    if (info.width != null) data.width = info.width;
    if (info.height != null) data.height = info.height;
    if (info.duration != null) data.duration = info.duration;
    const size = computeNodeSize(info.width, info.height) ?? defaultNodeSize(info.type);
    return this.mutate((c) => {
      const target = dto.replaceNodeId ? c.nodes.find((n) => n.id === dto.replaceNodeId) : undefined;
      if (target) {
        const { isEmpty: _dropped, ...rest } = target as CanvasNode & { isEmpty?: unknown };
        const node: CanvasNode = { ...rest, type: info.type, assetId: row.id, size, data };
        c.nodes[c.nodes.indexOf(target)] = node;
        this.pendingNodes.add(node.id);
        return { canvas: c, result: node.id, event: { updatedNodes: [node], origin: "user-add" } };
      }
      if (dto.replaceNodeId) this.log.warn(`add-node 要填的节点 ${dto.replaceNodeId} 已经不在了，改为新加一个`);
      const sources = dto.sourceNodeId ? [dto.sourceNodeId] : [];
      const { node, edges } = this.addAssetNode(c, row, { position: dto.position, sourceNodeIds: sources, extraData: data, size });
      if (dto.targetNodeId && c.nodes.some((n) => n.id === dto.targetNodeId)) {
        edges.push(...this.addDerivationEdges(c, [node.id], dto.targetNodeId));
      }
      return { canvas: c, result: node.id, event: { addedNodes: [node], addedEdges: edges, origin: "user-add" } };
    });
  }

  /**
   * 文件改了名：引用这个资产的节点上的名字和路径跟着改，画布标签才不会停在旧名字上。
   * 尽力而为 —— 文件和资产库已经改好了，这里失败只是标签晚一点更新，不能让改名本身失败。
   */
  async renameAssetNodes(assetId: string, newName: string, newPath: string): Promise<void> {
    try {
      await this.mutate((c) => {
        const updated: CanvasNode[] = [];
        for (const n of c.nodes) {
          if (n.assetId !== assetId) continue;
          const data = { ...(n.data ?? {}) } as Record<string, unknown>;
          if (data.name === newName && data.path === newPath) continue;
          data.name = newName;
          data.path = newPath;
          n.data = data;
          updated.push(n);
        }
        return updated.length ? { canvas: c, result: undefined, event: { updatedNodes: updated } } : { result: undefined };
      });
    } catch (err) {
      this.log.warn(`改名后更新画布节点失败 asset=${assetId}: ${(err as Error).message}`);
    }
  }

  /**
   * 资产挪了位置（移动、文件夹改名、撤销）：节点上记着的路径跟着换。只改本来就带 `data.path` 的节点 ——
   * 其余节点按 assetId 解析，本来就不受影响。尽力而为，失败不影响挪动本身。
   */
  async syncAssetPaths(moved: { id: string; path: string }[]): Promise<void> {
    if (moved.length === 0) return;
    const byId = new Map(moved.map((m) => [m.id, m.path]));
    try {
      await this.mutate((c) => {
        const updated: CanvasNode[] = [];
        for (const n of c.nodes) {
          const next = n.assetId ? byId.get(n.assetId) : undefined;
          const data = n.data as Record<string, unknown> | undefined;
          if (!next || typeof data?.path !== "string" || data.path === next) continue;
          n.data = { ...data, path: next, ...(typeof data.name === "string" ? { name: path.posix.basename(next) } : {}) };
          updated.push(n);
        }
        return updated.length ? { canvas: c, result: undefined, event: { updatedNodes: updated } } : { result: undefined };
      });
    } catch (err) {
      this.log.warn(`挪动后更新画布节点路径失败: ${(err as Error).message}`);
    }
  }

  // -------------------------------------------------------------------------
  // 表格节点
  // -------------------------------------------------------------------------

  /** 有 nodeId 替换已有表格的内容，没有就新建。 */
  async writeTableNode(dto: TableInput & { nodeId?: string; title?: string; position?: Point; sourceNodeIds?: string[] }) {
    if (dto.nodeId) {
      const r = await this.replaceTableContent(dto.nodeId, dto);
      return { nodeId: dto.nodeId, ...r, created: false };
    }
    const r = await this.createTableNode(dto);
    return { ...r, created: true };
  }

  /** 新建：`.htable` 写进 `.hilo/tables/`，节点没给位置就找一块空地。 */
  private async createTableNode(dto: TableInput & { title?: string; position?: Point; sourceNodeIds?: string[] }) {
    const tablePath = newTablePath();
    const doc = buildTableDocument(dto);
    await atomicWriteFile(path.join(this.paths.root, tablePath), serializeTableDocument(doc));
    return this.mutate((c) => {
      const size = defaultNodeSize("table");
      const title = dto.title?.trim();
      const node: CanvasNode = {
        id: randomUUID(),
        type: "table",
        positions: { [MODE]: dto.position ?? resolveDerivedOrFreePosition(c, MODE, size) },
        size,
        data: { tablePath, ...(title ? { title } : {}) },
      };
      c.nodes.push(node);
      this.pendingNodes.add(node.id);
      const edges = this.addDerivationEdges(c, dto.sourceNodeIds ?? [], node.id);
      return {
        canvas: c,
        result: { nodeId: node.id, tablePath, columnCount: doc.columns.length, rowCount: doc.rows.length },
        event: { addedNodes: [node], addedEdges: edges },
      };
    });
  }

  /**
   * 整表替换。广播带一个新的 `tableRevision`，渲染层看到它变了才会从盘上重读 ——
   * 节点本身的其他字段没变，不带它渲染层会以为什么都没发生。
   */
  private async replaceTableContent(nodeId: string, dto: TableInput & { title?: string }) {
    const c0 = await this.getCanvas();
    const node = c0.nodes.find((n) => n.id === nodeId);
    if (!node) throw new NotFoundException(`Canvas node not found: ${nodeId}`);
    if (node.type !== "table") {
      throw new BadRequestException(`Node is not a table node: ${nodeId} (type=${node.type}). Use canvas_write_node with kind=table only on table nodes.`);
    }
    const tablePath = (node.data as any)?.tablePath as string | undefined;
    if (!tablePath) throw new NotFoundException(`Table node has no tablePath: ${nodeId}`);
    if (!dto.columns?.length) throw new BadRequestException("Replacing a table requires at least one column in `columns`.");
    const abs = this.paths.resolve(tablePath);
    if (!abs) throw new BadRequestException(`Invalid tablePath on node: ${nodeId}`);
    const doc = buildTableDocument(dto);
    return this.nodeLock(nodeId).runExclusive(async () => {
      await atomicWriteFile(abs, serializeTableDocument(doc));
      const title = dto.title?.trim();
      // 标题落盘（不然渲染层没开着时改名就丢了）；tableRevision 只随广播走，不进 canvas.json。
      const updated = await this.mutate((c) => {
        const n = c.nodes.find((x) => x.id === nodeId);
        if (!n) return { result: node };
        if (title && (n.data as any)?.title !== title) {
          n.data = { ...(n.data ?? {}), title };
          return { canvas: c, result: n };
        }
        return { result: n };
      });
      this.emitUpdate({ origin: "mcp-write", updatedNodes: [{ ...updated, data: { ...(updated.data ?? {}), tablePath, tableRevision: Date.now() } }] });
      return { tablePath, columnCount: doc.columns.length, rowCount: doc.rows.length };
    });
  }

  // -------------------------------------------------------------------------
  // 聚焦 / 选中
  // -------------------------------------------------------------------------

  async focus(ids: string[], padding?: number, duration?: number) {
    const c = await this.getCanvas();
    const have = new Set(c.nodes.map((n) => n.id));
    const focused = ids.filter((id) => have.has(id));
    const missing = ids.filter((id) => !have.has(id));
    if (focused.length) this.bus.emit("canvas:focus", { type: "canvas_focus", nodeIds: focused, padding, duration });
    return { focused, missing };
  }

  setSelection(ids: string[]): void {
    this.selection = [...ids];
  }

  setTextEditState(s: { nodeId: string; editSessionId: string; active: boolean }): void {
    if (s.active) this.editing = { nodeId: s.nodeId, editSessionId: s.editSessionId };
    else if (this.editing?.nodeId === s.nodeId && this.editing.editSessionId === s.editSessionId) this.editing = undefined;
  }

  async getSelection() {
    const c = await this.getCanvas();
    const byId = new Map(c.nodes.map((n) => [n.id, n]));
    const nodeIds = this.selection.filter((id) => byId.has(id));
    const out: Record<string, unknown> = { nodeIds, nodes: nodeIds.map((id) => this.summary(byId.get(id)!)) };
    if (this.editing) {
      const n = byId.get(this.editing.nodeId);
      out.editing = { ...this.editing, ...(n ? { node: this.summary(n) } : {}) };
    }
    return out;
  }
}

function normalizeLabel(label?: string): string | undefined {
  const t = label?.trim();
  return t ? t.slice(0, GROUP_LABEL_MAX) : undefined;
}

function singleOrUndefined<T>(xs: T[]): T | undefined {
  return xs.length === 1 ? xs[0] : undefined;
}

async function exists(p: string): Promise<boolean> {
  return stat(p).then(
    () => true,
    () => false,
  );
}

/** 把节点挂到组下：坐标换成相对组的。 */
function reparent(c: CanvasFile, node: CanvasNode, group: CanvasNode): void {
  const abs = absolutePosition(c, node, MODE);
  const gp = absolutePosition(c, group, MODE);
  if (abs && gp) node.positions = { ...node.positions, [MODE]: { x: abs.x - gp.x, y: abs.y - gp.y } };
  node.parentId = group.id;
}

/**
 * 组内重排。grid：按 `data.params.order` → 行（y）→ 列（x）排序，列数取 √n，格子取成员
 * 最大宽高，间距 100；vertical：一列排下来。
 */
function relayoutGroup(c: CanvasFile, group: CanvasNode, layout: "grid" | "vertical"): void {
  const kids = c.nodes.filter((n) => n.parentId === group.id);
  if (kids.length === 0) return;
  const cell = {
    width: Math.max(...kids.map((k) => effectiveSize(k, MODE).width)),
    height: Math.max(...kids.map((k) => effectiveSize(k, MODE).height)),
  };
  const order = (n: CanvasNode) => {
    const o = Number((n.data as any)?.params?.order);
    return Number.isFinite(o) ? o : Infinity;
  };
  kids.sort((a, b) => {
    const d = order(a) - order(b);
    if (d !== 0 && Number.isFinite(d)) return d;
    const pa = positionOf(a, MODE) ?? { x: 0, y: 0 };
    const pb = positionOf(b, MODE) ?? { x: 0, y: 0 };
    return Math.abs(pa.y - pb.y) > cell.height / 2 ? pa.y - pb.y : pa.x - pb.x;
  });
  const cols = layout === "vertical" ? 1 : Math.max(1, Math.round(Math.sqrt(kids.length)));
  kids.forEach((k, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const size = effectiveSize(k, MODE);
    k.positions = {
      ...k.positions,
      [MODE]: {
        x: GROUP_PADDING.x + col * (cell.width + 100) + Math.round((cell.width - size.width) / 2),
        y: GROUP_PADDING.top + row * (cell.height + 100),
      },
    };
  });
}

/** 组框贴合成员：成员外包框 + 内边距。子节点坐标跟着平移，保持绝对位置不变。 */
function fitGroup(c: CanvasFile, group: CanvasNode): void {
  const kids = c.nodes.filter((n) => n.parentId === group.id);
  const gp = positionOf(group, MODE);
  if (!gp || kids.length === 0) return;
  const rects: Rect[] = kids.map((k) => ({ ...positionOf(k, MODE)!, ...effectiveSize(k, MODE) }));
  const b = boundsOf(rects);
  const dx = b.x - GROUP_PADDING.x;
  const dy = b.y - GROUP_PADDING.top;
  for (const k of kids) {
    const p = positionOf(k, MODE)!;
    k.positions = { ...k.positions, [MODE]: { x: p.x - dx, y: p.y - dy } };
  }
  group.positions = { ...group.positions, [MODE]: { x: gp.x + dx, y: gp.y + dy } };
  const size = { width: b.width + GROUP_PADDING.x * 2, height: b.height + GROUP_PADDING.top + GROUP_PADDING.bottom };
  group.size = size;
  group.sizes = { ...(group.sizes ?? {}), [MODE]: size };
}
