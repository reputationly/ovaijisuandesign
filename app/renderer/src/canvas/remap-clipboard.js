// remap-clipboard.js
import { DEFAULT_PLACEMENT_GAP } from "./ungroup-in-canvas.js";
import { isAssetBackedNode } from "./compute-group-bounds-from-children.js";
import {
  deriveEdgeId,
  isUnmaterialisedGenerationNode,
} from "./find-free-position-from-anchor.js";

const PASTE_OFFSET = DEFAULT_PLACEMENT_GAP;

export let copiedSystemText = null;

export function setCopiedSystemText(text2) {
  copiedSystemText = text2;
}

export let clipboard = null;

let pasteCounter = 0;

export function setClipboard(data2) {
  clipboard = data2;
  pasteCounter = 0;
  copiedSystemText = null;
}

export function remapClipboard(data2, options) {
  if (!options?.skipOffset) {
    pasteCounter++;
  }
  const offset2 = options?.skipOffset
    ? {
        x: 0,
        y: 0,
      }
    : {
        x: PASTE_OFFSET * pasteCounter,
        y: PASTE_OFFSET * pasteCounter,
      };
  const idMap = new Map();
  for (const node2 of data2.nodes) {
    idMap.set(node2.id, crypto.randomUUID());
  }
  const groupIdMap = new Map();
  for (const node2 of data2.nodes) {
    if (
      typeof node2.groupId === "string" &&
      node2.groupId.length > 0 &&
      !groupIdMap.has(node2.groupId)
    ) {
      groupIdMap.set(node2.groupId, crypto.randomUUID());
    }
  }
  const nodes = data2.nodes.map((node2) => {
    const newParentId =
      node2.parentId && idMap.has(node2.parentId)
        ? idMap.get(node2.parentId)
        : void 0;
    const newGroupId =
      node2.groupId && groupIdMap.has(node2.groupId)
        ? groupIdMap.get(node2.groupId)
        : void 0;
    const isGroupSub = newGroupId != null && node2.meta?.hidden === true;
    const isTopLevel = newParentId == null && !isGroupSub;
    const remappedPositions = {};
    for (const [m3, p3] of Object.entries(node2.positions ?? {})) {
      if (!p3) continue;
      remappedPositions[m3] = isTopLevel
        ? {
            x: p3.x + offset2.x,
            y: p3.y + offset2.y,
          }
        : {
            x: p3.x,
            y: p3.y,
          };
    }
    const clonedData = structuredClone(node2.data) ?? {};
    const hasAsset =
      (typeof node2.assetId === "string" && node2.assetId.length > 0) ||
      (typeof clonedData.assetId === "string" && clonedData.assetId.length > 0);
    const hasTransientOwnership =
      isUnmaterialisedGenerationNode(node2) ||
      (!hasAsset &&
        (typeof clonedData.generationAttemptId === "string" ||
          typeof clonedData.cloudTaskId === "string" ||
          typeof clonedData.providerTaskId === "string"));
    const pasteAsEmpty =
      hasTransientOwnership && !hasAsset && isAssetBackedNode(node2.type);
    if (hasTransientOwnership) {
      for (const key2 of [
        "generationAttemptId",
        "cloudTaskId",
        "cloudTraceId",
        "providerTaskId",
        "status",
        "createdAt",
        "generationStartedAt",
        "estimatedRemainingWaitMinutes",
        "estimatedRemainingWaitSeconds",
        "error",
        "errorMessage",
        "errorReason",
        "retryPayload",
      ]) {
        delete clonedData[key2];
      }
    }
    if (!pasteAsEmpty) clonedData.cloneOf = node2.id;
    if (
      typeof node2.assetId === "string" &&
      node2.assetId.length > 0 &&
      clonedData.assetId == null
    ) {
      clonedData.assetId = node2.assetId;
    }
    const nextMeta = {
      ...node2.meta,
      cloneOf: node2.id,
    };
    if (pasteAsEmpty) {
      delete nextMeta.cloneOf;
      delete nextMeta.hidden;
    }
    return {
      ...node2,
      id: idMap.get(node2.id) ?? node2.id,
      parentId: pasteAsEmpty ? void 0 : newParentId,
      groupId: pasteAsEmpty ? void 0 : newGroupId,
      positions: remappedPositions,
      data: clonedData,
      ...(pasteAsEmpty
        ? {
            isEmpty: true,
          }
        : {}),
      // Mark as a clone of the source node by default — it shares the source's
      // asset. The paste transformer strips `cloneOf` for branches that mint a
      // FRESH asset (cross-workspace media, file/text/table duplication), since
      // those become primary nodes for a new asset. Origin/clone is the
      // explicit `cloneOf` marker, not the id format.
      meta: nextMeta,
    };
  });
  const internalEdges = data2.edges
    .filter((e2) => idMap.has(e2.source) && idMap.has(e2.target))
    .map((edge) => {
      const newSource = idMap.get(edge.source) ?? edge.source;
      const newTarget = idMap.get(edge.target) ?? edge.target;
      return {
        ...edge,
        id: deriveEdgeId(newSource, newTarget),
        source: newSource,
        target: newTarget,
        data: edge.data != null ? structuredClone(edge.data) : void 0,
      };
    });
  const inheritedEdges = (data2.inheritedSourceEdges ?? [])
    .filter((e2) => idMap.has(e2.target) && !idMap.has(e2.source))
    .map((edge) => {
      const newTarget = idMap.get(edge.target) ?? edge.target;
      return {
        ...edge,
        id: deriveEdgeId(edge.source, newTarget),
        source: edge.source,
        target: newTarget,
        data: edge.data != null ? structuredClone(edge.data) : void 0,
      };
    });
  return {
    nodes,
    edges: [...internalEdges, ...inheritedEdges],
  };
}
