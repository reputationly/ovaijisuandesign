// remap-clipboard.js
import { DEFAULT_PLACEMENT_GAP } from "./ungroup-in-canvas.js";
import { isAssetBackedNode } from "./compute-group-bounds-from-children.js";
import {
  deriveEdgeId,
  isUnmaterialisedGenerationNode,
} from "./find-free-position-from-anchor.js";

const PASTE_OFFSET = DEFAULT_PLACEMENT_GAP;

export let copiedSystemText = null;

export function setCopiedSystemText(text) {
  copiedSystemText = text;
}

export let clipboard = null;

let pasteCounter = 0;

export function setClipboard(data) {
  clipboard = data;
  pasteCounter = 0;
  copiedSystemText = null;
}

export function remapClipboard(data, options) {
  if (!options?.skipOffset) {
    pasteCounter++;
  }
  const offset = options?.skipOffset
    ? {
        x: 0,
        y: 0,
      }
    : {
        x: PASTE_OFFSET * pasteCounter,
        y: PASTE_OFFSET * pasteCounter,
      };
  const idMap = new Map();
  for (const node of data.nodes) {
    idMap.set(node.id, crypto.randomUUID());
  }
  const groupIdMap = new Map();
  for (const node of data.nodes) {
    if (
      typeof node.groupId === "string" &&
      node.groupId.length > 0 &&
      !groupIdMap.has(node.groupId)
    ) {
      groupIdMap.set(node.groupId, crypto.randomUUID());
    }
  }
  const nodes = data.nodes.map((node) => {
    const newParentId =
      node.parentId && idMap.has(node.parentId)
        ? idMap.get(node.parentId)
        : void 0;
    const newGroupId =
      node.groupId && groupIdMap.has(node.groupId)
        ? groupIdMap.get(node.groupId)
        : void 0;
    const isGroupSub = newGroupId != null && node.meta?.hidden === true;
    const isTopLevel = newParentId == null && !isGroupSub;
    const remappedPositions = {};
    for (const [positionKey, position] of Object.entries(node.positions ?? {})) {
      if (!position) continue;
      remappedPositions[positionKey] = isTopLevel
        ? {
            x: position.x + offset.x,
            y: position.y + offset.y,
          }
        : {
            x: position.x,
            y: position.y,
          };
    }
    const clonedData = structuredClone(node.data) ?? {};
    const hasAsset =
      (typeof node.assetId === "string" && node.assetId.length > 0) ||
      (typeof clonedData.assetId === "string" && clonedData.assetId.length > 0);
    const hasTransientOwnership =
      isUnmaterialisedGenerationNode(node) ||
      (!hasAsset &&
        (typeof clonedData.generationAttemptId === "string" ||
          typeof clonedData.cloudTaskId === "string" ||
          typeof clonedData.providerTaskId === "string"));
    const pasteAsEmpty =
      hasTransientOwnership && !hasAsset && isAssetBackedNode(node.type);
    if (hasTransientOwnership) {
      for (const key of [
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
        delete clonedData[key];
      }
    }
    if (!pasteAsEmpty) clonedData.cloneOf = node.id;
    if (
      typeof node.assetId === "string" &&
      node.assetId.length > 0 &&
      clonedData.assetId == null
    ) {
      clonedData.assetId = node.assetId;
    }
    const nextMeta = {
      ...node.meta,
      cloneOf: node.id,
    };
    if (pasteAsEmpty) {
      delete nextMeta.cloneOf;
      delete nextMeta.hidden;
    }
    return {
      ...node,
      id: idMap.get(node.id) ?? node.id,
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
  const internalEdges = data.edges
    .filter((edge) => idMap.has(edge.source) && idMap.has(edge.target))
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
  const inheritedEdges = (data.inheritedSourceEdges ?? [])
    .filter((edge) => idMap.has(edge.target) && !idMap.has(edge.source))
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
