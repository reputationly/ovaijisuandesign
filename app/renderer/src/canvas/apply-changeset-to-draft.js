// apply-changeset-to-draft.js
import { CanvasNodeType } from "../vendor.js";
import {
  fileNodeToRuntimeNode,
  shouldClearAssetIdForServerNode,
  validIncomingAssetId,
} from "./node-registry.js";

export function applyChangesetToDraft(draft, changes, mode2) {
  const removedSet =
    changes.removedNodeIds && changes.removedNodeIds.length > 0
      ? new Set(changes.removedNodeIds)
      : null;
  const updatedById =
    changes.updatedNodes && changes.updatedNodes.length > 0
      ? new Map(changes.updatedNodes.map((n2) => [n2.id, n2]))
      : null;
  const addedRuntime =
    changes.addedNodes && changes.addedNodes.length > 0
      ? changes.addedNodes.map((n2) => fileNodeToRuntimeNode(n2, mode2))
      : null;
  if (!removedSet && !updatedById && !addedRuntime) return;
  const next2 = [];
  for (const node2 of draft.nodes) {
    if (removedSet?.has(node2.id)) continue;
    const updated = updatedById?.get(node2.id);
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
            ...(node2.positions ?? {}),
            ...updatedPositions,
          };
      const merged = {
        ...node2,
        type: updated.type,
        positions: mergedPositions,
      };
      if (updated.data) {
        merged.data = {
          ...node2.data,
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
        const resolved = updated.sizes?.[mode2] ?? updated.size;
        if (resolved) merged.size = resolved;
        if (updated.sizes)
          merged.sizes = {
            ...(node2.sizes ?? {}),
            ...updated.sizes,
          };
      } else if (updated.size) {
        merged.size = updated.size;
      }
      next2.push(merged);
      continue;
    }
    next2.push(node2);
  }
  if (addedRuntime) {
    const existingIds = new Set(next2.map((n2) => n2.id));
    for (const added of addedRuntime) {
      if (existingIds.has(added.id)) continue;
      existingIds.add(added.id);
      next2.push(added);
    }
  }
  draft.nodes = next2;
}
