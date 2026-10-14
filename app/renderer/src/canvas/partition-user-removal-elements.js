// partition-user-removal-elements.js
import { clipboard } from "./remap-clipboard.js";
import { CanvasNodeType } from "./canvas-geometry.js";
import {
  isEmptyNode,
  isUnmaterialisedGenerationNode,
} from "./find-free-position-from-anchor.js";
import { buildIncrementalNodeData } from "./build-incremental-node-data.js";

function isCloneNode(node) {
  return node.meta?.cloneOf != null;
}

export const INTERNAL_COPY_HTML_ATTRIBUTE = "data-hilo-canvas-internal-copy";

export function isTransientPlaceholder(node) {
  return node.type === "placeholder" && isUnmaterialisedGenerationNode(node);
}

export function getClipboard() {
  return clipboard;
}

const IN_FLIGHT_PLACEHOLDER_STATUS = new Set([
  "pending",
  "generating",
  "loading",
]);

export function isNodeGenerating(node) {
  if (!node) return false;
  const status = node.data?.status;
  return typeof status === "string" && IN_FLIGHT_PLACEHOLDER_STATUS.has(status);
}

export function isNodeDeleteProtected(node) {
  if (!node) return false;
  const status = node.data?.status;
  if (typeof status !== "string") return false;
  if (IN_FLIGHT_PLACEHOLDER_STATUS.has(status)) return true;
  if (status === "recoverable_error") return true;
  if (status === "status_unknown" && node.type !== "placeholder") return true;
  return false;
}

export function partitionDeletableIds(ids, resolveNode) {
  const deletableIds = [];
  let blockedGenerating = 0;
  let blockedRetained = 0;
  for (const id of ids) {
    const node = resolveNode(id);
    if (!isNodeDeleteProtected(node)) {
      deletableIds.push(id);
    } else if (isNodeGenerating(node)) {
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
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const requestedNodes = Array.from(new Set(requestedNodeIds), (id) =>
    nodeById.get(id),
  ).filter((node) => node != null);
  const deletableNodeIds = new Set();
  const blockedNodeIds = new Set();
  let blockedGenerating = false;
  for (const node of requestedNodes) {
    if (enforceProtection && isNodeDeleteProtected(node)) {
      blockedNodeIds.add(node.id);
      if (isNodeGenerating(node)) blockedGenerating = true;
    } else {
      deletableNodeIds.add(node.id);
    }
  }
  const edgeById = new Map(edges.map((edge) => [edge.id, edge]));
  const blockedEdgeIds = new Set();
  const deletableEdgeIds = new Set();
  const protectedNodeIds = new Set(blockedNodeIds);
  if (enforceProtection) {
    for (const node of nodes) {
      if (isNodeDeleteProtected(node)) protectedNodeIds.add(node.id);
    }
  }
  for (const id of requestedEdgeIds) {
    const edge = edgeById.get(id);
    if (!edge) continue;
    const endpointsSurvive =
      !deletableNodeIds.has(edge.source) && !deletableNodeIds.has(edge.target);
    if (
      enforceProtection &&
      endpointsSurvive &&
      isEdgeAttachedToProtectedNode(edge, protectedNodeIds)
    ) {
      blockedEdgeIds.add(id);
      if (
        isNodeGenerating(nodeById.get(edge.source)) ||
        isNodeGenerating(nodeById.get(edge.target))
      ) {
        blockedGenerating = true;
      }
    } else {
      deletableEdgeIds.add(id);
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
  const entries = [];
  for (const node of savedNodes) {
    const assetId =
      typeof node.assetId === "string" && node.assetId.length > 0
        ? node.assetId
        : void 0;
    if (!assetId || node.id === assetId) continue;
    const meta = metaByAssetId.get(assetId);
    if (meta) entries.push([node.id, meta]);
  }
  return entries;
}

export function buildPersistedNodeAssetMetaEntries(
  savedNodes,
  metaByAssetId,
  resolveFileUrlById,
) {
  const entries = [];
  const seen = new Set(metaByAssetId.keys());
  for (const node of savedNodes) {
    const assetId =
      typeof node.assetId === "string" && node.assetId.length > 0
        ? node.assetId
        : void 0;
    if (!assetId || seen.has(assetId)) continue;
    const { meta } = buildIncrementalNodeData(node, resolveFileUrlById);
    if (!meta) continue;
    seen.add(assetId);
    entries.push([assetId, meta]);
  }
  return entries;
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
