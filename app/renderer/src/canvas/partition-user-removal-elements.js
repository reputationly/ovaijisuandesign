// partition-user-removal-elements.js
import { clipboard } from "./remap-clipboard.js";
import { CanvasNodeType } from "../vendor.js";
import {
  isEmptyNode,
  isUnmaterialisedGenerationNode,
} from "./find-free-position-from-anchor.js";
import { buildIncrementalNodeData } from "./build-incremental-node-data.js";

function isCloneNode(node2) {
  return node2.meta?.cloneOf != null;
}

export const INTERNAL_COPY_HTML_ATTRIBUTE = "data-hilo-canvas-internal-copy";

export function isTransientPlaceholder(node2) {
  return node2.type === "placeholder" && isUnmaterialisedGenerationNode(node2);
}

export function getClipboard() {
  return clipboard;
}

const IN_FLIGHT_PLACEHOLDER_STATUS = new Set([
  "pending",
  "generating",
  "loading",
]);

export function isNodeGenerating(node2) {
  if (!node2) return false;
  const status = node2.data?.status;
  return typeof status === "string" && IN_FLIGHT_PLACEHOLDER_STATUS.has(status);
}

export function isNodeDeleteProtected(node2) {
  if (!node2) return false;
  const status = node2.data?.status;
  if (typeof status !== "string") return false;
  if (IN_FLIGHT_PLACEHOLDER_STATUS.has(status)) return true;
  if (status === "recoverable_error") return true;
  if (status === "status_unknown" && node2.type !== "placeholder") return true;
  return false;
}

export function partitionDeletableIds(ids2, resolveNode2) {
  const deletableIds = [];
  let blockedGenerating = 0;
  let blockedRetained = 0;
  for (const nodeId of ids2) {
    const node2 = resolveNode2(nodeId);
    if (!isNodeDeleteProtected(node2)) {
      deletableIds.push(nodeId);
    } else if (isNodeGenerating(node2)) {
      blockedGenerating += 1;
    } else {
      blockedRetained += 1;
    }
  }
  const blockedCount = blockedGenerating + blockedRetained;
  return {
    deletableIds,
    blockedCount,
    ...(blockedCount > 0
      ? {
          blockedReason: blockedGenerating > 0 ? "generating" : "task_retained",
        }
      : {}),
  };
}

export function isEdgeAttachedToProtectedNode(edge, protectedNodeIds) {
  if (!edge || protectedNodeIds.size === 0) return false;
  return (
    (edge.source != null && protectedNodeIds.has(edge.source)) ||
    (edge.target != null && protectedNodeIds.has(edge.target))
  );
}

export function partitionUserRemovalElements({
  nodes,
  edges,
  requestedNodeIds,
  requestedEdgeIds,
  enforceProtection,
}) {
  const nodeById = new Map(nodes.map((node2) => [node2.id, node2]));
  const requestedNodes = Array.from(new Set(requestedNodeIds), (requestedNodeId) =>
    nodeById.get(requestedNodeId),
  ).filter((node2) => node2 != null);
  const deletableNodeIds = new Set();
  const blockedNodeIds = new Set();
  let blockedGenerating = false;
  for (const node2 of requestedNodes) {
    if (enforceProtection && isNodeDeleteProtected(node2)) {
      blockedNodeIds.add(node2.id);
      if (isNodeGenerating(node2)) blockedGenerating = true;
    } else {
      deletableNodeIds.add(node2.id);
    }
  }
  const edgeById = new Map(edges.map((edge) => [edge.id, edge]));
  const blockedEdgeIds = new Set();
  const deletableEdgeIds = new Set();
  const protectedNodeIds = new Set(blockedNodeIds);
  if (enforceProtection) {
    for (const node2 of nodes) {
      if (isNodeDeleteProtected(node2)) protectedNodeIds.add(node2.id);
    }
  }
  for (const edgeId of requestedEdgeIds) {
    const edge = edgeById.get(edgeId);
    if (!edge) continue;
    const endpointsSurvive =
      !deletableNodeIds.has(edge.source) && !deletableNodeIds.has(edge.target);
    if (
      enforceProtection &&
      endpointsSurvive &&
      isEdgeAttachedToProtectedNode(edge, protectedNodeIds)
    ) {
      blockedEdgeIds.add(edgeId);
      if (
        isNodeGenerating(nodeById.get(edge.source)) ||
        isNodeGenerating(nodeById.get(edge.target))
      ) {
        blockedGenerating = true;
      }
    } else {
      deletableEdgeIds.add(edgeId);
    }
  }
  for (const edge of edges) {
    if (
      deletableNodeIds.has(edge.source) ||
      deletableNodeIds.has(edge.target)
    ) {
      deletableEdgeIds.add(edge.id);
    }
  }
  const blockedCount = blockedNodeIds.size + blockedEdgeIds.size;
  return {
    deletableNodeIds,
    deletableEdgeIds,
    blockedCount,
    ...(blockedCount > 0
      ? {
          blockedReason: blockedGenerating ? "generating" : "task_retained",
        }
      : {}),
  };
}

export function partitionUserRemovalNodes(nodes, requestedNodeIds) {
  return partitionUserRemovalElements({
    nodes,
    edges: [],
    requestedNodeIds,
    requestedEdgeIds: [],
    enforceProtection: true,
  });
}

export function normaliseHandle(value) {
  if (typeof value !== "string") return void 0;
  if (value === "" || value === "null" || value === "undefined") return void 0;
  return value;
}

export function buildNodeIdMetaAliases(savedNodes, metaByAssetId) {
  const entries2 = [];
  for (const node2 of savedNodes) {
    const assetId =
      typeof node2.assetId === "string" && node2.assetId.length > 0
        ? node2.assetId
        : void 0;
    if (!assetId || node2.id === assetId) continue;
    const meta2 = metaByAssetId.get(assetId);
    if (meta2) entries2.push([node2.id, meta2]);
  }
  return entries2;
}

export function buildPersistedNodeAssetMetaEntries(
  savedNodes,
  metaByAssetId,
  resolveFileUrlById,
) {
  const entries2 = [];
  const seen2 = new Set(metaByAssetId.keys());
  for (const node2 of savedNodes) {
    const assetId =
      typeof node2.assetId === "string" && node2.assetId.length > 0
        ? node2.assetId
        : void 0;
    if (!assetId || seen2.has(assetId)) continue;
    const { meta: meta2 } = buildIncrementalNodeData(node2, resolveFileUrlById);
    if (!meta2) continue;
    seen2.add(assetId);
    entries2.push([assetId, meta2]);
  }
  return entries2;
}

export function buildSavedNodeIndex(savedNodes, hiddenAssetIds) {
  const savedByAssetId = new Map();
  const hidden = new Set(hiddenAssetIds);
  const allSavedNodes = new Map();
  const cloneNodes = [];
  const standaloneNodes = [];
  const subordinateAssetIds = new Set();
  const collectSubordinateAssetId = (node) => {
    if (typeof node.assetId === "string" && node.assetId.length > 0) {
      subordinateAssetIds.add(node.assetId);
    }
    const dataAssetId = node.data?.assetId;
    if (typeof dataAssetId === "string" && dataAssetId.length > 0) {
      subordinateAssetIds.add(dataAssetId);
    }
  };
  for (const node of savedNodes) {
    allSavedNodes.set(node.id, node);
    const isPluginFileNode =
      node.type === CanvasNodeType.File && typeof node.data?.pluginId === "string";
    if (isPluginFileNode) {
      standaloneNodes.push(node);
      continue;
    }
    const isGroupedSub = !!node.groupId && node.meta?.hidden === true;
    if (node.meta?.hidden || isGroupedSub) {
      collectSubordinateAssetId(node);
      standaloneNodes.push(node);
      continue;
    }
    if (isCloneNode(node)) {
      cloneNodes.push(node);
      continue;
    }
    if (isEmptyNode(node) && !node.assetId) {
      standaloneNodes.push(node);
      continue;
    }
    if (node.assetId) {
      savedByAssetId.set(node.assetId, node);
    } else {
      standaloneNodes.push(node);
    }
  }
  return {
    savedByAssetId,
    hiddenAssetIds: hidden,
    allSavedNodes,
    cloneNodes,
    standaloneNodes,
    subordinateAssetIds,
  };
}

export function filterVisibleItems(
  items,
  hiddenAssetIds,
  subordinateAssetIds,
  savedByAssetId,
) {
  return items.filter(
    (item) =>
      !hiddenAssetIds.has(item.id) &&
      (!subordinateAssetIds.has(item.id) || savedByAssetId.has(item.id)),
  );
}
