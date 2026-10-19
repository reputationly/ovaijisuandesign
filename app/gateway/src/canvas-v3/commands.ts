import { EDITOR_CODECS, editorCodecForNode } from "../editor-v3/codecs.js";
import { EditorSourceFiles } from "../editor-v3/source-files.js";
import { canvasV3Error, invalidCanvasV3Command } from "./errors.js";
import { CanvasV3ContentService } from "./content.service.js";
import {
  type CanvasV3Command,
  type CanvasV3Document,
  type CanvasV3Node,
  type CanvasV3Patch,
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

export async function executeCanvasV3Command(document: CanvasV3Document, command: CanvasV3Command, content: CanvasV3ContentService, sources: EditorSourceFiles): Promise<{ patch: CanvasV3Patch; effects: { undo: CanvasV3Command | null; compositionIds: string[] } }> {
  if (command.type === "canvas.patch") {
    const effect = await runPatch(document, command, content, sources);
    return { patch: effect.patch, effects: { undo: effect.undo, compositionIds: [] } };
  }
  let current = document;
  const patch: CanvasV3Patch = { type: "canvas.patch", nodes: [], edges: [] };
  const undos: CanvasV3Command[] = [];
  for (const item of command.commands) {
    if (item.type !== "canvas.patch") throw invalidCanvasV3Command();
    const effect = await runPatch(current, item, content, sources);
    current = applyCanvasV3Patch(current, effect.patch, true);
    mergePatch(patch, effect.patch);
    if (effect.undo) undos.unshift(effect.undo);
  }
  const only = undos[0];
  const undo = undos.length === 0 || !only ? null : undos.length === 1 ? only : { type: "canvas.batch" as const, commands: undos };
  return { patch, effects: { undo, compositionIds: [] } };
}
