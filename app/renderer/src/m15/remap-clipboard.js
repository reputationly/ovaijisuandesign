// remap-clipboard.js
import { CanvasNodeType } from "../vendor.js";
import { buildIncrementalNodeData } from "./build-incremental-node-data.js";
import { isAssetBackedNode } from "./group-nodes-in-canvas.js";
import { CANVAS_COMMAND_IDS, COMMAND_DEFINITIONS } from "./node-tag-rings-canvas.jsx";
import { DEFAULT_PLACEMENT_GAP } from "./reconcile-group-geometry-for-mode.js";
import {
  deriveEdgeId,
  isCloneNode,
  isEmptyNode,
  isUnmaterialisedGenerationNode,
} from "./resolve-derived-collision.js";
const DEFINITIONS_BY_ID = new Map(
  COMMAND_DEFINITIONS.map((definition2) => [definition2.id, definition2]),
);
export function createCanvasCommandRegistry(resolveHandlers) {
  return {
    definitions: COMMAND_DEFINITIONS,
    get(id2) {
      const definition2 = DEFINITIONS_BY_ID.get(id2);
      if (!definition2) throw new Error(`Unknown canvas command: ${id2}`);
      return definition2;
    },
    hasHandler(id2) {
      return typeof resolveHandlers()[id2] === "function";
    },
    execute(id2, source) {
      const handler = resolveHandlers()[id2];
      if (!handler) return false;
      handler(source);
      return true;
    },
  };
}
export function resolveCanvasShortcut(event) {
  if (event.metaKey || event.ctrlKey || event.altKey) return void 0;
  if (event.shiftKey && event.code === "KeyI") return CANVAS_COMMAND_IDS.assets;
  if (event.shiftKey && event.key === "?") return CANVAS_COMMAND_IDS.shortcuts;
  if (event.shiftKey && event.code === "Digit2") {
    return event.repeat ? void 0 : CANVAS_COMMAND_IDS.focusSelection;
  }
  if (event.shiftKey) return void 0;
  switch (event.code) {
    case "Escape":
      return CANVAS_COMMAND_IDS.select;
    case "KeyN":
      return CANVAS_COMMAND_IDS.addNode;
    case "KeyV":
      return CANVAS_COMMAND_IDS.select;
    case "KeyH":
      return CANVAS_COMMAND_IDS.handTool;
    case "KeyS":
      return event.repeat ? void 0 : CANVAS_COMMAND_IDS.sticker;
    case "KeyM":
      return CANVAS_COMMAND_IDS.minimap;
    case "F1":
      return CANVAS_COMMAND_IDS.help;
    default:
      return void 0;
  }
}
const INTERNAL_COPY_MARKER = "​[hilo-canvas-internal-copy]​";
const INTERNAL_COPY_HTML_ATTRIBUTE = "data-hilo-canvas-internal-copy";
export const INTERNAL_COPY_HTML_MARKER = `<span ${INTERNAL_COPY_HTML_ATTRIBUTE}="true"></span>`;
export function hasInternalCopyMarker(text2, html2) {
  return text2 === INTERNAL_COPY_MARKER || html2.includes(INTERNAL_COPY_HTML_ATTRIBUTE);
}
let copiedSystemText = null;
export function setCopiedSystemText(text2) {
  copiedSystemText = text2;
}
export function getCopiedSystemText() {
  return copiedSystemText;
}
let clipboard = null;
let pasteCounter = 0;
const PASTE_OFFSET = DEFAULT_PLACEMENT_GAP;
export function isTransientPlaceholder(node2) {
  return node2.type === "placeholder" && isUnmaterialisedGenerationNode(node2);
}
export function setClipboard(data2) {
  clipboard = data2;
  pasteCounter = 0;
  copiedSystemText = null;
}
export function getClipboard() {
  return clipboard;
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
      node2.parentId && idMap.has(node2.parentId) ? idMap.get(node2.parentId) : void 0;
    const newGroupId =
      node2.groupId && groupIdMap.has(node2.groupId) ? groupIdMap.get(node2.groupId) : void 0;
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
    const pasteAsEmpty = hasTransientOwnership && !hasAsset && isAssetBackedNode(node2.type);
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
const IN_FLIGHT_PLACEHOLDER_STATUS = new Set(["pending", "generating", "loading"]);
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
  for (const id2 of ids2) {
    const node2 = resolveNode2(id2);
    if (!isNodeDeleteProtected(node2)) {
      deletableIds.push(id2);
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
  const requestedNodes = Array.from(new Set(requestedNodeIds), (id2) => nodeById.get(id2)).filter(
    (node2) => node2 != null,
  );
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
  for (const id2 of requestedEdgeIds) {
    const edge = edgeById.get(id2);
    if (!edge) continue;
    const endpointsSurvive =
      !deletableNodeIds.has(edge.source) && !deletableNodeIds.has(edge.target);
    if (
      enforceProtection &&
      endpointsSurvive &&
      isEdgeAttachedToProtectedNode(edge, protectedNodeIds)
    ) {
      blockedEdgeIds.add(id2);
      if (
        isNodeGenerating(nodeById.get(edge.source)) ||
        isNodeGenerating(nodeById.get(edge.target))
      ) {
        blockedGenerating = true;
      }
    } else {
      deletableEdgeIds.add(id2);
    }
  }
  for (const edge of edges) {
    if (deletableNodeIds.has(edge.source) || deletableNodeIds.has(edge.target)) {
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
export function selectMouseAnchor(opts) {
  const { mouseScreen, containerRect, screenToFlow } = opts;
  if (!mouseScreen || !containerRect) return null;
  const { x: x2, y: y4 } = mouseScreen;
  if (
    x2 < containerRect.left ||
    x2 > containerRect.right ||
    y4 < containerRect.top ||
    y4 > containerRect.bottom
  ) {
    return null;
  }
  return screenToFlow(mouseScreen);
}
export function selectDropAnchor(opts) {
  return selectMouseAnchor(opts) ?? opts.viewportCenter();
}
export function collectCommittablePositionChanges(changes) {
  const moves = [];
  for (const change of changes) {
    if (
      change.type !== "position" ||
      change.positionChangeSource !== "keyboard" ||
      !change.position
    ) {
      continue;
    }
    moves.push({
      id: change.id,
      position: change.position,
    });
  }
  return moves;
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
      typeof node2.assetId === "string" && node2.assetId.length > 0 ? node2.assetId : void 0;
    if (!assetId || node2.id === assetId) continue;
    const meta2 = metaByAssetId.get(assetId);
    if (meta2) entries2.push([node2.id, meta2]);
  }
  return entries2;
}
export function buildPersistedNodeAssetMetaEntries(savedNodes, metaByAssetId, resolveFileUrlById) {
  const entries2 = [];
  const seen2 = new Set(metaByAssetId.keys());
  for (const node2 of savedNodes) {
    const assetId =
      typeof node2.assetId === "string" && node2.assetId.length > 0 ? node2.assetId : void 0;
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
  const collectSubordinateAssetId = (n2) => {
    if (typeof n2.assetId === "string" && n2.assetId.length > 0) {
      subordinateAssetIds.add(n2.assetId);
    }
    const dataAssetId = n2.data?.assetId;
    if (typeof dataAssetId === "string" && dataAssetId.length > 0) {
      subordinateAssetIds.add(dataAssetId);
    }
  };
  for (const n2 of savedNodes) {
    allSavedNodes.set(n2.id, n2);
    const isPluginFileNode =
      n2.type === CanvasNodeType.File && typeof n2.data?.pluginId === "string";
    if (isPluginFileNode) {
      standaloneNodes.push(n2);
      continue;
    }
    const isGroupedSub = !!n2.groupId && n2.meta?.hidden === true;
    if (n2.meta?.hidden || isGroupedSub) {
      collectSubordinateAssetId(n2);
      standaloneNodes.push(n2);
      continue;
    }
    if (isCloneNode(n2)) {
      cloneNodes.push(n2);
      continue;
    }
    if (isEmptyNode(n2) && !n2.assetId) {
      standaloneNodes.push(n2);
      continue;
    }
    if (n2.assetId) {
      savedByAssetId.set(n2.assetId, n2);
    } else {
      standaloneNodes.push(n2);
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
export function filterVisibleItems(items, hiddenAssetIds, subordinateAssetIds, savedByAssetId) {
  return items.filter(
    (item) =>
      !hiddenAssetIds.has(item.id) &&
      (!subordinateAssetIds.has(item.id) || savedByAssetId.has(item.id)),
  );
}
export function displaySizeFromData(type2, data2) {
  if (type2 !== "image") return void 0;
  const value = data2?.displaySize;
  if (!value || typeof value !== "object") return void 0;
  const { width, height } = value;
  if (typeof width !== "number" || width <= 0 || typeof height !== "number" || height <= 0) {
    return void 0;
  }
  return {
    width: Math.round(width),
    height: Math.round(height),
  };
}
