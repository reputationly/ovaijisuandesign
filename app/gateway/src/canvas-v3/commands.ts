import { EDITOR_CODECS, editorCodecForNode } from "../editor-v3/codecs.js";
import { EditorSourceFiles } from "../editor-v3/source-files.js";
import { canvasV3Error, invalidCanvasV3Command } from "./errors.js";
import { CanvasV3ContentService } from "./content.service.js";
import {
  type CanvasV3ClipboardPaste,
  type CanvasV3Command,
  type CanvasV3ContentImport,
  type CanvasV3GenerationStart,
  type CanvasV3Document,
  type CanvasV3Edge,
  type CanvasV3ImportItem,
  type CanvasV3Node,
  type CanvasV3Patch,
  type CanvasV3Size,
  applyCanvasV3Patch,
  canvasV3Equal,
  invertCanvasV3Patch,
  parseCanvasV3Patch,
} from "./protocol.js";

export interface CanvasV3Effect {
  patch: CanvasV3Patch;
  undo: CanvasV3Command | null;
  compositionIds: string[];
  protectedNodeIds?: string[];
}

function nodeOf(document: CanvasV3Document, nodeId: string): CanvasV3Node | undefined {
  return Object.hasOwn(document.nodes, nodeId) ? document.nodes[nodeId] : undefined;
}

function world(nodes: Record<string, CanvasV3Node>, node: CanvasV3Node): { x: number; y: number } {
  let x = node.position.x;
  let y = node.position.y;
  let parent = node.parentId;
  const seen = new Set([node.id]);
  while (parent !== null) {
    if (seen.has(parent) || !Object.hasOwn(nodes, parent)) throw new Error("Invalid sticker parent");
    seen.add(parent);
    const frame = nodes[parent];
    if (!frame) throw new Error("Invalid sticker parent");
    x += frame.position.x;
    y += frame.position.y;
    parent = frame.parentId;
  }
  return { x, y };
}

function relative(nodes: Record<string, CanvasV3Node>, sticker: CanvasV3Node, target: CanvasV3Node): { x: number; y: number } {
  const stickerWorld = world(nodes, sticker);
  const targetWorld = world(nodes, target);
  return { x: (stickerWorld.x - targetWorld.x) / target.size.width, y: (stickerWorld.y - targetWorld.y) / target.size.height };
}

/** 贴纸跟着目标走。直接拖贴纸时改偏移，目标自己动时改贴纸的相对坐标。 */
export function reconcileCanvasV3StickerPatch(document: CanvasV3Document, initial: CanvasV3Patch): CanvasV3Patch {
  if (!initial.nodes.length && !initial.edges.length) return initial;
  const patch = parseCanvasV3Patch(initial);
  const nodes: Record<string, CanvasV3Node> = { ...document.nodes };
  const edits = new Map(patch.nodes.map((edit) => [edit.id, edit]));
  for (const edit of patch.nodes) {
    if (!canvasV3Equal(document.nodes[edit.id] ?? null, edit.before)) throw new Error(`Sticker patch before mismatch: ${edit.id}`);
    if (edit.after) nodes[edit.id] = edit.after;
    else delete nodes[edit.id];
  }
  for (const node of Object.values(nodes)) {
    const attachment = node.attachment as { targetId: string; offset: { x: number; y: number } } | undefined;
    if (node.kind !== "sticker" || !attachment) continue;
    const target = nodes[attachment.targetId];
    let after: CanvasV3Node;
    if (!target) {
      const prior = document.nodes[attachment.targetId];
      if (!prior || edits.get(attachment.targetId)?.after !== null) throw new Error("Invalid sticker target");
      const { attachment: _attachment, ...detached } = node;
      after = detached;
    } else {
      if (target.kind === "sticker") throw new Error("Invalid sticker target");
      const before = document.nodes[node.id];
      const currentWorld = world(nodes, node);
      const previousWorld = before ? world(document.nodes, before) : currentWorld;
      const explicitEdit = edits.get(node.id);
      const priorTarget = document.nodes[target.id];
      const targetWorld = world(nodes, target);
      const priorTargetWorld = priorTarget ? world(document.nodes, priorTarget) : targetWorld;
      const movedWithDifferentAncestor = currentWorld.x - previousWorld.x !== targetWorld.x - priorTargetWorld.x || currentWorld.y - previousWorld.y !== targetWorld.y - priorTargetWorld.y;
      const directlyMoved = before && !canvasV3Equal(previousWorld, currentWorld) && (movedWithDifferentAncestor || (explicitEdit?.after && (!canvasV3Equal(before.position, node.position) || before.parentId !== node.parentId)));
      if (directlyMoved) {
        after = { ...node, attachment: { targetId: target.id, offset: relative(nodes, node, target) } };
      } else {
        const parent = node.parentId === null ? undefined : nodes[node.parentId];
        const parentWorld = node.parentId === null || !parent ? { x: 0, y: 0 } : world(nodes, parent);
        after = {
          ...node,
          position: {
            x: targetWorld.x + attachment.offset.x * target.size.width - parentWorld.x,
            y: targetWorld.y + attachment.offset.y * target.size.height - parentWorld.y,
          },
        };
      }
    }
    const before = document.nodes[node.id] ?? null;
    if (!canvasV3Equal(before, after)) edits.set(node.id, { id: node.id, before, after });
    else edits.delete(node.id);
  }
  return { ...patch, nodes: [...edits.values()] };
}

function contentUnavailable(message = "Composition is unavailable"): never {
  throw canvasV3Error(409, "CANVAS_V3_CONTENT_UNAVAILABLE", message);
}

function itemUnavailable(message: string): never {
  throw canvasV3Error(409, "CANVAS_V3_ITEM_UNAVAILABLE", message);
}

type Projected = {
  state: string;
  members?: { resource: string | null }[];
  resources?: Record<string, { versions?: { versionId: string; deleted?: boolean; availability?: string }[] }>;
};

/** 布局可以改。换组合身份、选中不存在的版本，或者新绑编辑器源，按内容是否还在拒绝。 */
async function validatePatch(document: CanvasV3Document, patch: CanvasV3Patch, content: CanvasV3ContentService): Promise<void> {
  const cache = new Map<string, Projected>();
  for (const change of patch.nodes) {
    const node = nodeOf(document, change.id);
    const after = change.after;
    if (node?.kind === "composition" && after?.kind === "composition" && after.compositionId !== node.compositionId) {
      throw canvasV3Error(409, "CANVAS_V3_CONTENT_IDENTITY", "Canvas content identity cannot be replaced");
    }
    if (after?.kind === "composition") {
      const previous = node?.kind === "composition" ? node : undefined;
      const activeChanged = !previous || !canvasV3Equal(previous.activeItem, after.activeItem);
      const membersChanged = !!previous && !canvasV3Equal(previous.memberSelections, after.memberSelections);
      if (activeChanged || membersChanged) {
        const compositionId = String(after.compositionId);
        let projected = cache.get(compositionId);
        if (!projected) {
          projected = (await content.project(compositionId)) as Projected;
          cache.set(compositionId, projected);
        }
        if (projected.state !== "ready") contentUnavailable();
        if (activeChanged) assertItem(projected, after.activeItem);
        const selections = (after.memberSelections ?? {}) as Record<string, { type?: string; resourceId?: string }>;
        for (const [resourceId, selection] of Object.entries(selections)) {
          const previousSelections = (previous?.memberSelections ?? {}) as Record<string, unknown>;
          if (canvasV3Equal(previousSelections[resourceId], selection)) continue;
          if (!projected.members?.some((member) => member.resource === resourceId)) itemUnavailable("Selected resource is not a composition member");
          if (selection.type === "generation-request") continue;
          if (selection.type === "version" && selection.resourceId !== resourceId) itemUnavailable("Selected version belongs to another member");
          assertItem(projected, selection, resourceId);
        }
      }
    }
  }
}

/** 新绑的编辑器源必须已经存在，而且只能出现在一个同类节点上。已有绑定不能换成另一份源。 */
async function validateEditorBindings(document: CanvasV3Document, patch: CanvasV3Patch, sources: EditorSourceFiles): Promise<void> {
  const bound = (node: CanvasV3Node | null | undefined) => (node && editorCodecForNode(node.kind) ? node.sourceResourceId : undefined);
  const introduced: { kind: string; sourceResourceId: string }[] = [];
  for (const change of patch.nodes) {
    const next = bound(change.after);
    const previous = bound(change.before);
    if (change.before && change.after && previous !== undefined && previous !== next) {
      throw canvasV3Error(409, "CANVAS_V3_CONTENT_IDENTITY", "Editor source binding cannot be replaced");
    }
    if (change.after && typeof next === "string" && next !== previous) introduced.push({ kind: change.after.kind, sourceResourceId: next });
  }
  if (!introduced.length) return;
  const preview = applyCanvasV3Patch(document, patch, true);
  for (const item of introduced) {
    const source = await sources.read(item.sourceResourceId).catch(() => undefined);
    if (!source || EDITOR_CODECS[source.capabilityId].nodeKind !== item.kind) contentUnavailable("Editor source is unavailable");
    const views = Object.values(preview.nodes).filter((node) => node.kind === item.kind && node.sourceResourceId === item.sourceResourceId);
    if (views.length > 1) throw canvasV3Error(409, "CANVAS_V3_CONTENT_IDENTITY", "An editor source is shown by one node");
  }
}

function assertItem(projected: Projected, ref: unknown, memberResourceId?: string): void {
  if (ref == null) return;
  const item = ref as { type?: string; resourceId?: string; versionId?: string; taskId?: string; outputKey?: string };
  if (item.type === "task-output") itemUnavailable("Task output is not selectable in the composition");
  if (item.type !== "version" || !item.resourceId || !item.versionId) itemUnavailable("Version does not belong to the composition");
  if (memberResourceId && item.resourceId !== memberResourceId) itemUnavailable("Selected version belongs to another member");
  const resource = projected.resources?.[item.resourceId];
  const version = resource?.versions?.find((entry) => entry.versionId === item.versionId && !entry.deleted);
  if (!version || version.availability !== "available") itemUnavailable("Version does not belong to the composition");
}

function mergePatch(target: CanvasV3Patch, patch: CanvasV3Patch): void {
  for (const change of patch.nodes) {
    const existing = target.nodes.find((item) => item.id === change.id);
    if (existing) existing.after = change.after;
    else target.nodes.push({ ...change });
  }
  for (const change of patch.edges) {
    const existing = target.edges.find((item) => item.id === change.id);
    if (existing) existing.after = change.after;
    else target.edges.push({ ...change });
  }
  target.nodes = target.nodes.filter((change) => !canvasV3Equal(change.before, change.after));
  target.edges = target.edges.filter((change) => !canvasV3Equal(change.before, change.after));
}

/** 各类内容的默认落位尺寸，和渲染层 `CANVAS_V3_DEFAULT_NODE_SIZES` 保持一致。 */
const IMPORT_SIZES: Record<string, CanvasV3Size> = {
  image: { width: 350, height: 350 },
  video: { width: 350, height: 280 },
  audio: { width: 350, height: 150 },
  text: { width: 350, height: 500 },
  table: { width: 350, height: 200 },
  file: { width: 350, height: 200 },
};

function importUnavailable(message: string): never {
  throw canvasV3Error(409, "CANVAS_V3_CONTENT_UNAVAILABLE", message);
}

/** 画布上已经有了的组合 id：复用组合之前先避开它们，免得两个节点共用一份内容。 */
function mountedCompositions(document: CanvasV3Document): Set<string> {
  const ids = new Set<string>();
  for (const node of Object.values(document.nodes)) {
    if (node.kind === "composition" && typeof node.compositionId === "string") ids.add(node.compositionId);
  }
  return ids;
}

function compositionNode(node: CanvasV3Node, compositionId: string, activeItem: { type: "version"; resourceId: string; versionId: string }, item: CanvasV3ImportItem): CanvasV3Node {
  const after: CanvasV3Node = {
    id: node.id,
    parentId: node.parentId,
    // 占位符还是默认尺寸时渲染层会带上自然尺寸；没带就沿用原来的框。
    position: node.position,
    size: item.size ?? node.size,
    zIndex: node.zIndex,
    hidden: node.hidden,
    kind: "composition",
    compositionId,
    activeItem,
    draft: null,
  };
  if (node.containerKind === "subject") after.containerKind = "subject";
  if (node.presentation === "panorama") after.presentation = "panorama";
  return after;
}

/**
 * `content.import` 是渲染层唯一的"把资源放进画布"入口（拖入、粘贴、上传、表格新建都走它）。
 * 这里把它翻译成一条 `canvas.patch`：
 *   - 目标节点不存在 → 按 `placement` 建一个指向该资源组合的组合节点；
 *   - 目标节点是占位符 → 校验类别一致后换成组合节点；
 *   - 目标节点已经是组合 → 只把 `activeItem` 切到这一版。
 * 一份资源在画布上需要有属于自己的组合，没有就按命令 id 建一个。
 */
async function importPatch(document: CanvasV3Document, command: CanvasV3ContentImport, content: CanvasV3ContentService, keyPrefix: string): Promise<CanvasV3Patch> {
  const nodes: CanvasV3Patch["nodes"] = [];
  const edges: CanvasV3Patch["edges"] = [];
  const mounted = mountedCompositions(document);
  const importing = new Set(command.items.map((item) => item.nodeId));
  const edgeIds = new Set<string>();
  for (const item of command.items) {
    const target = await content.importTarget({ resourceId: item.resourceId, versionId: item.versionId });
    const before = Object.hasOwn(document.nodes, item.nodeId) ? (document.nodes[item.nodeId] ?? null) : null;
    const activeItem = { type: "version" as const, resourceId: item.resourceId, versionId: item.versionId };
    let after: CanvasV3Node;
    if (before === null) {
      if (!item.placement) importUnavailable("Imported content needs a placement");
      const sizes = IMPORT_SIZES[target.mediaKind] ?? { width: 350, height: 200 };
      const compositionId = await content.contentComposition(`${keyPrefix}:${item.nodeId}`, item.resourceId, target, mounted);
      mounted.add(compositionId);
      after = {
        id: item.nodeId,
        parentId: item.placement.parentId,
        position: item.placement.position,
        size: item.size ?? item.placement.size ?? sizes,
        zIndex: item.placement.zIndex,
        hidden: false,
        kind: "composition",
        compositionId,
        activeItem,
        draft: null,
        ...(item.placement.containerKind === "subject" ? { containerKind: "subject" } : {}),
        ...(item.placement.presentation === "panorama" ? { presentation: "panorama" } : {}),
      };
    } else if (before.kind === "placeholder") {
      if (before.expectedKind !== target.mediaKind) importUnavailable("Import target kind does not match the content");
      const compositionId = await content.contentComposition(`${keyPrefix}:${item.nodeId}`, item.resourceId, target, mounted);
      mounted.add(compositionId);
      after = compositionNode(before, compositionId, activeItem, item);
    } else if (before.kind === "composition") {
      // 组合已经存在：只切选中版本，内容必须本来就属于这个组合（`validatePatch` 会再核对一次）。
      after = { ...before, activeItem, ...(item.size ? { size: item.size } : {}) };
    } else {
      importUnavailable("Import target must be a content node");
    }
    if (canvasV3Equal(before, after)) continue;
    nodes.push({ id: item.nodeId, before, after });
    for (const edge of item.edges ?? []) {
      if (edgeIds.has(edge.id)) throw invalidCanvasV3Command();
      if (!Object.hasOwn(document.nodes, edge.source) && !importing.has(edge.source)) importUnavailable("Import edge source is missing");
      edgeIds.add(edge.id);
      if (Object.hasOwn(document.edges, edge.id)) throw invalidCanvasV3Command();
      edges.push({ id: edge.id, before: null, after: { id: edge.id, source: edge.source, target: item.nodeId } });
    }
  }
  // 每一项都没改到东西：这类命令没有可落的结果（重放会先命中收据，走不到这里）。
  if (!nodes.length) throw invalidCanvasV3Command();
  return { type: "canvas.patch", nodes, edges };
}

/** 快照里的组合节点要换 id，附着在节点上的引用也要跟着换。 */
function remappedAttachment(node: CanvasV3Node, ids: Record<string, string>): CanvasV3Node {
  const attachment = node.attachment as { targetId?: string; offset?: { x: number; y: number } } | undefined;
  if (node.kind !== "sticker" || !attachment || typeof attachment.targetId !== "string") return node;
  const target = ids[attachment.targetId];
  return target ? { ...node, attachment: { ...attachment, targetId: target } } : node;
}

/**
 * `clipboard.paste` 带的是**一整份子文档快照**：这里把它按 `ids` 改名、按 `offset` 平移根节点，
 * 组合节点则建出全新的组合（成员仍是同一批资源，粘贴不复制文件）。
 * 子节点坐标是相对父级的，只有根节点吃 `offset`。
 */
async function pastePatch(document: CanvasV3Document, command: CanvasV3ClipboardPaste, content: CanvasV3ContentService, keyPrefix: string): Promise<CanvasV3Patch> {
  const snapshot = command.snapshot.document;
  const nodes: CanvasV3Patch["nodes"] = [];
  const edges: CanvasV3Patch["edges"] = [];
  for (const node of Object.values(snapshot.nodes).sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))) {
    const nextId = command.ids[node.id];
    if (!nextId) throw invalidCanvasV3Command();
    if (Object.hasOwn(document.nodes, nextId)) throw invalidCanvasV3Command();
    const parentId = node.parentId === null ? null : (command.ids[node.parentId] ?? null);
    if (node.parentId !== null && parentId === null) throw invalidCanvasV3Command();
    let after: CanvasV3Node = {
      ...node,
      id: nextId,
      parentId,
      position: node.parentId === null ? { x: node.position.x + command.offset.x, y: node.position.y + command.offset.y } : node.position,
    };
    after = remappedAttachment(after, command.ids);
    if (node.kind === "composition") {
      const entry = command.snapshot.content[node.id];
      if (!entry) importUnavailable("Pasted composition is incomplete");
      const pasted = await content.pastedComposition(`${keyPrefix}:${nextId}`, entry, command.sources);
      after.compositionId = pasted.compositionId;
      const active = node.activeItem as { type?: string; resourceId?: string; versionId?: string } | null | undefined;
      const remapped = active?.resourceId ? pasted.remap.get(active.resourceId) : undefined;
      after.activeItem = active && remapped ? { type: "version", resourceId: remapped.resourceId, versionId: remapped.versionId } : (node.activeItem ?? null);
    }
    nodes.push({ id: nextId, before: null, after });
  }
  for (const edge of Object.values(snapshot.edges)) {
    const nextId = command.ids[edge.id];
    const source = command.ids[edge.source];
    const target = command.ids[edge.target];
    if (!nextId || !source || !target) throw invalidCanvasV3Command();
    if (Object.hasOwn(document.edges, nextId)) throw invalidCanvasV3Command();
    edges.push({
      id: nextId,
      before: null,
      after: { ...edge, id: nextId, source, target },
    });
  }
  if (!nodes.length) throw invalidCanvasV3Command();
  return { type: "canvas.patch", nodes, edges };
}

/**
 * `generation.start` 只负责把画布改成"待生成"：节点变成组合、记下 draft 与 pendingGeneration。
 * 真正的任务提交由渲染层在收到收据后自己做（`executeRequest` 之后才提交），网关不调平台。
 */
async function generationPatch(document: CanvasV3Document, command: CanvasV3GenerationStart, content: CanvasV3ContentService, keyPrefix: string): Promise<CanvasV3Patch> {
  const before = Object.hasOwn(document.nodes, command.nodeId) ? (document.nodes[command.nodeId] ?? null) : null;
  if (before === null && !command.create) importUnavailable("Generation needs an existing node or a create block");
  if (before !== null && before.kind !== "placeholder" && before.kind !== "composition") importUnavailable("Generation target must be a content node");
  const kind = command.create?.expectedKind ?? (before?.kind === "placeholder" ? String(before.expectedKind) : String(before?.kind ?? "image"));
  const compositionId = before?.kind === "composition" && typeof before.compositionId === "string"
    ? before.compositionId
    : await content.generationComposition(`${keyPrefix}:${command.nodeId}`, kind);
  const pending = command.historyRequest ? { pendingGeneration: command.historyRequest } : {};
  let after: CanvasV3Node;
  if (before?.kind === "composition") {
    // 组合节点：保留组合与容器信息，只刷新 draft / 生成态。
    after = { ...before, draft: command.draft, ...pending };
    if (command.outputCompositionId !== undefined && command.outputCompositionId !== before.compositionId) {
      importUnavailable("Generation output belongs to another composition");
    }
  } else {
    const placement = before ?? command.create;
    if (!placement) throw invalidCanvasV3Command();
    after = {
      id: command.nodeId,
      parentId: "parentId" in placement ? placement.parentId : null,
      position: placement.position,
      size: "size" in placement ? placement.size : { width: 350, height: 350 },
      zIndex: "zIndex" in placement ? placement.zIndex : 0,
      hidden: before?.hidden ?? false,
      kind: "composition",
      compositionId,
      activeItem: null,
      draft: command.draft,
      ...pending,
      ...(before?.presentation === "panorama" ? { presentation: "panorama" } : {}),
    };
  }
  const nodes: CanvasV3Patch["nodes"] = canvasV3Equal(before, after) ? [] : [{ id: command.nodeId, before, after }];
  const edges: CanvasV3Patch["edges"] = [];
  for (const edge of command.create?.edges ?? []) {
    if (Object.hasOwn(document.edges, edge.id) || Object.hasOwn(document.nodes, edge.id)) throw invalidCanvasV3Command();
    if (!Object.hasOwn(document.nodes, edge.source) && edge.source !== command.nodeId) importUnavailable("Generation edge source is missing");
    edges.push({ id: edge.id, before: null, after: { id: edge.id, source: edge.source, target: command.nodeId } });
  }
  if (!nodes.length && !edges.length) throw invalidCanvasV3Command();
  return { type: "canvas.patch", nodes, edges };
}

async function runPatch(document: CanvasV3Document, command: CanvasV3Patch, content: CanvasV3ContentService, sources: EditorSourceFiles): Promise<CanvasV3Effect> {
  let patch: CanvasV3Patch;
  try {
    patch = reconcileCanvasV3StickerPatch(document, command);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Invalid Canvas V3")) throw error;
    throw invalidCanvasV3Command();
  }
  await validatePatch(document, patch, content);
  await validateEditorBindings(document, patch, sources);
  try {
    applyCanvasV3Patch(document, patch, true);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Invalid Canvas V3")) throw error;
    throw invalidCanvasV3Command();
  }
  return {
    patch,
    undo: patch.nodes.length || patch.edges.length ? invertCanvasV3Patch(patch) : null,
    compositionIds: [],
  };
}

/** 一条命令（可能是批量里的第几条）落到画布上要改什么。导入先翻译成补丁，其余直接用。 */
async function patchOf(document: CanvasV3Document, command: CanvasV3Patch | CanvasV3ContentImport | CanvasV3ClipboardPaste | CanvasV3GenerationStart, content: CanvasV3ContentService, keyPrefix: string): Promise<CanvasV3Patch> {
  if (command.type === "content.import") return importPatch(document, command, content, keyPrefix);
  if (command.type === "clipboard.paste") return pastePatch(document, command, content, keyPrefix);
  if (command.type === "generation.start") return generationPatch(document, command, content, keyPrefix);
  return command;
}

export async function executeCanvasV3Command(document: CanvasV3Document, command: CanvasV3Command, content: CanvasV3ContentService, sources: EditorSourceFiles, commandId: string): Promise<{ patch: CanvasV3Patch; effects: { undo: CanvasV3Command | null; compositionIds: string[] } }> {
  if (command.type !== "canvas.batch") {
    const patch = await patchOf(document, command, content, commandId);
    const effect = await runPatch(document, patch, content, sources);
    return { patch: effect.patch, effects: { undo: effect.undo, compositionIds: [] } };
  }
  let current = document;
  const patch: CanvasV3Patch = { type: "canvas.patch", nodes: [], edges: [] };
  const undos: CanvasV3Command[] = [];
  for (const [index, item] of command.commands.entries()) {
    if (item.type === "canvas.batch") throw invalidCanvasV3Command();
    const effect = await runPatch(current, await patchOf(current, item, content, `${commandId}:${index}`), content, sources);
    current = applyCanvasV3Patch(current, effect.patch, true);
    mergePatch(patch, effect.patch);
    if (effect.undo) undos.unshift(effect.undo);
  }
  const only = undos[0];
  const undo = undos.length === 0 || !only ? null : undos.length === 1 ? only : { type: "canvas.batch" as const, commands: undos };
  return { patch, effects: { undo, compositionIds: [] } };
}
