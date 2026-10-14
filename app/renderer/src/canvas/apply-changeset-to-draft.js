// apply-changeset-to-draft.js
import { CanvasNodeType } from "./canvas-geometry.js";
import {
  fileNodeToRuntimeNode,
  shouldClearAssetIdForServerNode,
  validIncomingAssetId,
} from "./node-registry.js";

export function applyChangesetToDraft(draft, changes, mode) {
  const removedSet =
    changes.removedNodeIds && changes.removedNodeIds.length > 0
      ? new Set(changes.removedNodeIds)
      : null;
  const updatedById =
    changes.updatedNodes && changes.updatedNodes.length > 0
      ? new Map(changes.updatedNodes.map((fileNode) => [fileNode.id, fileNode]))
      : null;
  const addedRuntime =
    changes.addedNodes && changes.addedNodes.length > 0
      ? changes.addedNodes.map((fileNode) => fileNodeToRuntimeNode(fileNode, mode))
      : null;
  if (!removedSet && !updatedById && !addedRuntime) return;
  const next = [];
  for (const node of draft.nodes) {
    if (removedSet?.has(node.id)) continue;
    const updated = updatedById?.get(node.id);
    if (updated) {
      const updatedPositions = updated.positions ?? {};
      const shouldClearPositions =
        typeof updated.groupId === "string" &&
        updated.groupId.length > 0 &&
        updated.meta?.hidden === true &&
        Object.keys(updatedPositions).length === 0;
      const mergedPositions = shouldClearPositions
        ? {}
        : {
            ...(node.positions ?? {}),
            ...updatedPositions,
          };
      const merged = {
        ...node,
        type: updated.type,
        positions: mergedPositions,
      };
      if (updated.data) {
        merged.data = {
          ...node.data,
          ...updated.data,
        };
      }
      const incomingAssetId = validIncomingAssetId(updated.assetId);
      if (incomingAssetId) {
        merged.assetId = incomingAssetId;
      } else if (shouldClearAssetIdForServerNode(updated)) {
        delete merged.assetId;
        const mergedData = merged.data;
        if (mergedData && typeof mergedData === "object") {
          const nextData = {
            ...mergedData,
          };
          delete nextData.assetId;
          merged.data = nextData;
        }
      }
      if (updated.parentId === void 0) {
        delete merged.parentId;
      } else {
        merged.parentId = updated.parentId;
      }
      if ("groupId" in updated) {
        if (updated.groupId) {
          merged.groupId = updated.groupId;
        } else {
          delete merged.groupId;
        }
      }
      if ("round" in updated) {
        if (Number.isInteger(updated.round)) {
          merged.round = updated.round;
        } else {
          delete merged.round;
        }
      }
      if (updated.type === CanvasNodeType.Group) {
        const resolved = updated.sizes?.[mode] ?? updated.size;
        if (resolved) merged.size = resolved;
        if (updated.sizes)
          merged.sizes = {
            ...(node.sizes ?? {}),
            ...updated.sizes,
          };
      } else if (updated.size) {
        merged.size = updated.size;
      }
      next.push(merged);
      continue;
    }
    next.push(node);
  }
  if (addedRuntime) {
    const existingIds = new Set(next.map((node) => node.id));
    for (const added of addedRuntime) {
      if (existingIds.has(added.id)) continue;
      existingIds.add(added.id);
      next.push(added);
    }
  }
  draft.nodes = next;
}
