import { randomUUID } from "node:crypto";
import { copyFile, mkdir, readdir, readFile, rm, stat } from "node:fs/promises";
import path from "node:path";

import { canvasFileSchema, type CanvasFile, emptyCanvas, parseCanvasFile } from "@ov/protocol";

import { atomicWriteJson } from "../common/atomic-write.js";
import { stableCanvasHash } from "./canvas-hash.js";

/** 渲染端删除时带上的证据。 */
export interface DeletionIntent {
  operationId: string;
  removedNodeIds: string[];
  removedEdgeIds?: string[];
  highBlastConfirmed?: boolean;
}

/** gateway 内部改画布时带上的证据。 */
export interface SystemMutationIntent {
  operationId: string;
  reason: string;
  removedNodeIds: string[];
  removedEdgeIds: string[];
  allowHighBlast?: boolean;
}

/** 大面积删除（≥10 个、剩下不到一半）只有这些内部原因可以放行。 */
const HIGH_BLAST_REASONS = new Set([
  "timeline-migration",
  "explicit-node-delete",
  "node-id-migration",
  "group-reconciliation",
  "reference-materialization",
  "placeholder-cleanup",
]);

const BACKUP_MAX_COUNT = 10;
const BACKUP_MAX_BYTES = 100 * 1024 * 1024;
const REJECTED_MAX_COUNT = 5;
const REJECTED_MAX_BYTES = 50 * 1024 * 1024;

export class CanvasDestructiveSaveRejectedError extends Error {
  constructor(
    readonly reason: "missing_deletion_evidence" | "high_blast_confirmation_required",
    readonly currentNodeCount: number,
    readonly incomingNodeCount: number,
  ) {
    super(`canvas save rejected: ${reason}`);
  }
}

export class CanvasInvalidSaveRejectedError extends Error {
  constructor(readonly problems: string[]) {
    super(`canvas snapshot invalid: ${problems.join("; ")}`);
  }
}

export interface WriteOptions {
  source?: "renderer" | "gateway";
  deletionIntent?: DeletionIntent;
  systemMutationIntent?: SystemMutationIntent;
}

/**
 * `.hilo/canvas.json` 的读写。调用方负责串行（CanvasService 的 canvasLock）。
 *
 * 读：按 mtime+size 缓存；文件不存在是空画布，**读坏了或解析失败直接抛错，绝不回退成
 * 空画布** —— 回退的话下一次写入就把用户的整张画布覆盖成空的。
 *
 * 写：结构校验 → 缩水保护 → 原子写。缩水保护防的是"一个过期的快照把别人刚加的节点
 * 冲掉"和"一次误操作清空画布"：
 * - 只要有节点或边消失，就必须有删除证据覆盖所有消失项；
 * - 大面积删除（≥10 个且剩下不到一半，节点和边分别算）还要显式确认，确认了也先备份。
 */
export class CanvasPersistence {
  private cache?: { canvas: CanvasFile; mtimeMs: number; size: number };
  private lastHash?: string;
  private loading?: Promise<CanvasFile>;

  constructor(private readonly hiloDir: string) {}

  get file(): string {
    return path.join(this.hiloDir, "canvas.json");
  }

  async read(): Promise<CanvasFile> {
    let st;
    try {
      st = await stat(this.file);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        this.cache = undefined;
        return emptyCanvas();
      }
      throw err;
    }
    if (this.cache && this.cache.mtimeMs === st.mtimeMs && this.cache.size === st.size) return this.cache.canvas;
    this.loading ??= this.load(st).finally(() => (this.loading = undefined));
    return this.loading;
  }

  private async load(st: { mtimeMs: number; size: number }): Promise<CanvasFile> {
    let raw: string;
    try {
      raw = await readFile(this.file, "utf8");
    } catch (err) {
      this.cache = undefined;
      throw new Error(`Canvas load failed for ${this.file}: ${(err as Error).message}. Refusing to fall back to empty canvas`);
    }
    let parsed: CanvasFile;
    try {
      parsed = parseCanvasFile(JSON.parse(raw));
    } catch (err) {
      this.cache = undefined;
      throw new Error(
        `Canvas parse failed for ${this.file}: ${(err as Error).message}. Refusing to fall back to empty canvas to prevent overwriting existing data.`,
      );
    }
    const canvas = canonicalizePositions(parsed);
    this.cache = { canvas, mtimeMs: st.mtimeMs, size: st.size };
    this.lastHash = stableCanvasHash(canvas);
    return canvas;
  }

  /** 写入。和上次写的一样就跳过。返回是否真的写了。 */
  async write(next: CanvasFile, opts: WriteOptions = {}): Promise<boolean> {
    const canvas = canonicalizePositions(next);
    const problems = validate(canvas);
    if (problems.length) {
      await this.saveRejected(canvas, 0).catch(() => undefined);
      throw new CanvasInvalidSaveRejectedError(problems);
    }
    const hash = stableCanvasHash(canvas);
    if (hash === this.lastHash) return false;
    const previous = await this.read().catch(() => undefined);
    if (previous) await this.guard(previous, canvas, opts);
    await mkdir(this.hiloDir, { recursive: true });
    await atomicWriteJson(this.file, canvas);
    const st = await stat(this.file);
    this.cache = { canvas, mtimeMs: st.mtimeMs, size: st.size };
    this.lastHash = hash;
    return true;
  }

  private async guard(prev: CanvasFile, next: CanvasFile, opts: WriteOptions): Promise<void> {
    const nextNodes = new Set(next.nodes.map((n) => n.id));
    const nextEdges = new Set(next.edges.map((e) => e.id));
    const goneNodes = prev.nodes.filter((n) => !nextNodes.has(n.id)).map((n) => n.id);
    const goneEdges = prev.edges.filter((e) => !nextEdges.has(e.id));
    if (goneNodes.length === 0 && goneEdges.length === 0) return;

    const intent = opts.deletionIntent ?? opts.systemMutationIntent;
    const okNodes = new Set(intent?.removedNodeIds ?? []);
    const okEdges = new Set(intent?.removedEdgeIds ?? []);
    const covered =
      !!intent?.operationId?.trim() &&
      goneNodes.every((id) => okNodes.has(id)) &&
      // 端点落在被删节点上的边自动算授权：删节点必然带走它的边。
      goneEdges.every((e) => okEdges.has(e.id) || okNodes.has(e.source) || okNodes.has(e.target));
    if (!covered) {
      await this.saveRejected(next, prev.nodes.length).catch(() => undefined);
      throw new CanvasDestructiveSaveRejectedError("missing_deletion_evidence", prev.nodes.length, next.nodes.length);
    }

    const highBlast =
      (prev.nodes.length >= 10 && next.nodes.length < prev.nodes.length * 0.5) ||
      (prev.edges.length >= 10 && next.edges.length < prev.edges.length * 0.5);
    if (!highBlast) return;
    const confirmed =
      opts.deletionIntent?.highBlastConfirmed === true ||
      (opts.systemMutationIntent?.allowHighBlast === true && HIGH_BLAST_REASONS.has(opts.systemMutationIntent.reason));
    if (!confirmed) {
      await this.saveRejected(next, prev.nodes.length).catch(() => undefined);
      throw new CanvasDestructiveSaveRejectedError("high_blast_confirmation_required", prev.nodes.length, next.nodes.length);
    }
    await this.backup(prev);
  }

  /** 大面积删除前的安全备份。失败就阻止这次写入 —— 没有退路的删除不做。 */
  private async backup(prev: CanvasFile): Promise<void> {
    const dir = path.join(this.hiloDir, "canvas-backups");
    await mkdir(dir, { recursive: true });
    const name = `canvas-${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID().slice(0, 8)}-nodes${prev.nodes.length}-edges${prev.edges.length}.json`;
    try {
      await copyFile(this.file, path.join(dir, name)).catch(async () => atomicWriteJson(path.join(dir, name), prev));
    } catch (err) {
      throw new Error(`Canvas safety backup failed: ${(err as Error).message}`);
    }
    await prune(dir, /^canvas-.*\.json$/, BACKUP_MAX_COUNT, BACKUP_MAX_BYTES, name);
  }

  private async saveRejected(canvas: CanvasFile, from: number): Promise<void> {
    const dir = path.join(this.hiloDir, "canvas-backups", "rejected");
    await mkdir(dir, { recursive: true });
    const name = `rejected-canvas-${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID().slice(0, 8)}-nodes${canvas.nodes?.length ?? 0}-from${from}.json`;
    await atomicWriteJson(path.join(dir, name), canvas);
    await prune(dir, /^rejected-canvas-.*\.json$/, REJECTED_MAX_COUNT, REJECTED_MAX_BYTES, name);
  }
}

/** positions 只保留 workflow / freeform，且坐标是有限数。 */
export function canonicalizePositions(c: CanvasFile): CanvasFile {
  return {
    ...c,
    nodes: c.nodes.map((n) => {
      const positions: Record<string, { x: number; y: number }> = {};
      for (const [k, p] of Object.entries(n.positions ?? {})) {
        if ((k === "workflow" || k === "freeform") && Number.isFinite(p?.x) && Number.isFinite(p?.y)) positions[k] = p;
      }
      return { ...n, positions };
    }),
  };
}

/** 结构校验：重复 id、悬空边、悬空 parent、parent 成环、两个文本节点共用一个资产。 */
export function validate(c: CanvasFile): string[] {
  const out: string[] = [];
  const parsed = canvasFileSchema.safeParse(c);
  if (!parsed.success) out.push(...parsed.error.issues.slice(0, 5).map((i) => `${i.path.join(".")}: ${i.message}`));
  const ids = new Set<string>();
  const textAssets = new Set<string>();
  for (const n of c.nodes ?? []) {
    if (ids.has(n.id)) out.push(`duplicate node id ${n.id}`);
    ids.add(n.id);
    if (n.type === "text" && n.assetId) {
      if (textAssets.has(n.assetId)) out.push(`two text nodes share asset ${n.assetId}`);
      textAssets.add(n.assetId);
    }
  }
  const edgeIds = new Set<string>();
  for (const e of c.edges ?? []) {
    if (edgeIds.has(e.id)) out.push(`duplicate edge id ${e.id}`);
    edgeIds.add(e.id);
    if (!ids.has(e.source) || !ids.has(e.target)) out.push(`edge ${e.id} has a missing endpoint`);
  }
  const byId = new Map((c.nodes ?? []).map((n) => [n.id, n]));
  for (const n of c.nodes ?? []) {
    if (!n.parentId) continue;
    if (!byId.has(n.parentId)) {
      out.push(`node ${n.id} has a missing parent ${n.parentId}`);
      continue;
    }
    const seen = new Set([n.id]);
    let p: string | undefined = n.parentId;
    while (p) {
      if (seen.has(p)) {
        out.push(`parent cycle at ${n.id}`);
        break;
      }
      seen.add(p);
      p = byId.get(p)?.parentId;
    }
  }
  return out;
}

/** 按文件名排序删最旧的，直到数量和总大小都不超；`keep` 这份不删。 */
async function prune(dir: string, re: RegExp, maxCount: number, maxBytes: number, keep: string): Promise<void> {
  const names = (await readdir(dir)).filter((n) => re.test(n)).sort();
  const sizes = new Map<string, number>();
  for (const n of names) sizes.set(n, (await stat(path.join(dir, n)).catch(() => ({ size: 0 }))).size);
  let total = [...sizes.values()].reduce((a, b) => a + b, 0);
  let count = names.length;
  for (const n of names) {
    if (count <= maxCount && total <= maxBytes) break;
    if (n === keep) continue;
    await rm(path.join(dir, n), { force: true });
    count--;
    total -= sizes.get(n) ?? 0;
  }
}
