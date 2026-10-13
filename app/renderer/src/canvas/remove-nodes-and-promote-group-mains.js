// remove-nodes-and-promote-group-mains.js
import { parseNodeId } from "./find-free-position-from-anchor.js";
import { getNodePosition, setNodePosition, sizeOf } from "./use-active-mode.js";
import {
  collectGroupMembers,
  pickSuccessorMain,
  rectsOverlap,
  ungroupInCanvas,
} from "./ungroup-in-canvas.js";
import { isAssetBackedNode } from "./compute-group-bounds-from-children.js";
import { CanvasNodeType } from "../vendor.js";
import { buildCanvasFileSnapshot } from "./runtime-node-to-file-node.js";
export function removeNodesAndPromoteGroupMains(nodes, removedNodeIds) {
  const affectedGroupIds = new Set();
  const removedVisibleMainByGroup = new Map();
  const removedMainIndexByGroup = new Map();
  for (const node of nodes) {
    if (removedNodeIds.has(node.id) && node.groupId)
      affectedGroupIds.add(node.groupId);
  }
  for (const groupId of affectedGroupIds) {
    const members = collectGroupMembers(nodes, groupId);
    const main = members.find((member) => member.meta?.hidden !== true);
    if (!main || !removedNodeIds.has(main.id)) continue;
    removedMainIndexByGroup.set(
      groupId,
      members.findIndex((member) => member.id === main.id),
    );
    const runtimeMain = nodes.find((node) => node.id === main.id);
    if (runtimeMain) removedVisibleMainByGroup.set(groupId, runtimeMain);
  }
  let remaining = nodes.filter((node) => !removedNodeIds.has(node.id));
  for (const groupId of affectedGroupIds) {
    const members = remaining.filter((node) => node.groupId === groupId);
    if (
      members.length === 0 ||
      members.some((node) => node.meta?.hidden !== true)
    )
      continue;
    const successorId = pickSuccessorMain(
      members,
      removedMainIndexByGroup.get(groupId) ?? 0,
    );
    const successor =
      members.find((node) => node.id === successorId) ?? members[0];
    const previousMain = removedVisibleMainByGroup.get(groupId);
    remaining = remaining.map((node) => {
      if (node.id !== successor.id) return node;
      const next = {
        ...node,
        meta: {
          ...(node.meta ?? {}),
          hidden: false,
        },
      };
      if (previousMain) {
        next.positions = {
          ...(previousMain.positions ?? {}),
        };
        if (previousMain.size)
          next.size = {
            ...previousMain.size,
          };
        if (previousMain.sizes)
          next.sizes = {
            ...previousMain.sizes,
          };
        if (previousMain.parentId !== void 0)
          next.parentId = previousMain.parentId;
        else delete next.parentId;
      }
      const assetId =
        next.assetId ??
        (next.data && typeof next.data === "object"
          ? next.data.assetId
          : void 0);
      return typeof assetId === "string" && assetId.length > 0
        ? {
            ...next,
            data: {
              ...next.data,
              assetId,
            },
          }
        : next;
    });
  }
  return remaining;
}
const IN_FLIGHT_NODE_STATUSES = new Set(["pending", "generating", "loading"]);
export function isInFlightNode(node) {
  if (!node) return false;
  const status = node.data?.status;
  return typeof status === "string" && IN_FLIGHT_NODE_STATUSES.has(status);
}
export function isRetainedGenerationNode(node) {
  if (!node) return false;
  const status = node.data?.status;
  return status === "recoverable_error" || status === "status_unknown";
}
function historyTraversalBlock(current, candidate, isProtectedNode) {
  if (!candidate) return "empty";
  const candidateById = new Map(
    candidate.nodes.map((node) => [node.id, node]),
  );
  for (const node of current.nodes) {
    if (!isProtectedNode(node)) continue;
    const twin = candidateById.get(node.id);
    if (!twin || !isProtectedNode(twin)) return "in-flight";
  }
  return "none";
}
export function decideHistoryStep(current, candidate) {
  const inFlightBlock = historyTraversalBlock(
    current,
    candidate,
    isInFlightNode,
  );
  if (inFlightBlock === "in-flight")
    return {
      allow: false,
      blockReason: "generating",
    };
  const retainedBlock = historyTraversalBlock(
    current,
    candidate,
    isRetainedGenerationNode,
  );
  if (retainedBlock === "in-flight")
    return {
      allow: false,
      blockReason: "task_retained",
    };
  return {
    allow: inFlightBlock === "none" && retainedBlock === "none",
  };
}
export function isChildFullyInsideParent(
  childAbsPos,
  childSize,
  parentAbsPos,
  parentSize,
) {
  if (!parentSize) return false;
  const cw = childSize?.width ?? 0;
  const ch = childSize?.height ?? 0;
  return (
    childAbsPos.x >= parentAbsPos.x &&
    childAbsPos.y >= parentAbsPos.y &&
    childAbsPos.x + cw <= parentAbsPos.x + parentSize.width &&
    childAbsPos.y + ch <= parentAbsPos.y + parentSize.height
  );
}
export function isChildFullyOutsideParent(
  childAbsPos,
  childSize,
  parentAbsPos,
  parentSize,
) {
  if (!parentSize) return false;
  const cw = childSize?.width ?? 0;
  const ch = childSize?.height ?? 0;
  return (
    childAbsPos.x + cw <= parentAbsPos.x ||
    childAbsPos.y + ch <= parentAbsPos.y ||
    childAbsPos.x >= parentAbsPos.x + parentSize.width ||
    childAbsPos.y >= parentAbsPos.y + parentSize.height
  );
}
const COMFYUI_PLUGIN_ID = "comfyui";
function readComfyUiWorkflowIdentity(node) {
  if (!node.data || typeof node.data !== "object") return void 0;
  const data = node.data;
  if (data.pluginId !== COMFYUI_PLUGIN_ID) return void 0;
  for (const key of ["currentWorkflowId", "sourceTemplateId"]) {
    const value = data[key];
    if (typeof value !== "string") continue;
    const identity = value.trim();
    if (identity) return identity;
  }
  return void 0;
}
function readTemplateCopyOrdinal(node) {
  if (!node.data || typeof node.data !== "object") return 0;
  const ordinal = node.data.comfyuiTemplateCopyOrdinal;
  return typeof ordinal === "number" && Number.isInteger(ordinal) && ordinal > 0
    ? ordinal
    : 0;
}
export function assignComfyUiTemplateCopyOrdinals(existingNodes, pastedNodes) {
  const nextOrdinalByTemplate = new Map();
  for (const node of existingNodes) {
    const workflowIdentity = readComfyUiWorkflowIdentity(node);
    if (!workflowIdentity) continue;
    nextOrdinalByTemplate.set(
      workflowIdentity,
      Math.max(
        nextOrdinalByTemplate.get(workflowIdentity) ?? 0,
        readTemplateCopyOrdinal(node),
      ),
    );
  }
  return pastedNodes.map((node) => {
    const workflowIdentity = readComfyUiWorkflowIdentity(node);
    if (!workflowIdentity || !node.data || typeof node.data !== "object")
      return node;
    const nextOrdinal = (nextOrdinalByTemplate.get(workflowIdentity) ?? 0) + 1;
    nextOrdinalByTemplate.set(workflowIdentity, nextOrdinal);
    return {
      ...node,
      data: {
        ...node.data,
        comfyuiTemplateCopyOrdinal: nextOrdinal,
      },
    };
  });
}
export function backfillLegacyComfyUiTemplateCopyOrdinals(nodes) {
  const templatesWithOrdinals = new Set();
  for (const node of nodes) {
    const workflowIdentity = readComfyUiWorkflowIdentity(node);
    if (workflowIdentity && readTemplateCopyOrdinal(node) > 0) {
      templatesWithOrdinals.add(workflowIdentity);
    }
  }
  const nextOrdinalByTemplate = new Map();
  return nodes.map((node) => {
    const workflowIdentity = readComfyUiWorkflowIdentity(node);
    if (
      !workflowIdentity ||
      templatesWithOrdinals.has(workflowIdentity) ||
      !node.data ||
      typeof node.data !== "object"
    ) {
      return node;
    }
    const nextOrdinal = (nextOrdinalByTemplate.get(workflowIdentity) ?? 0) + 1;
    nextOrdinalByTemplate.set(workflowIdentity, nextOrdinal);
    return {
      ...node,
      data: {
        ...node.data,
        comfyuiTemplateCopyOrdinal: nextOrdinal,
      },
    };
  });
}
export function planGroupAwareRemoval(
  graph,
  mode,
  requestedNodeIds,
  requestedEdgeIds,
) {
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
  let snapshot = buildCanvasFileSnapshot(graph, mode);
  const ungroupedChildrenByGroupId = new Map();
  const refusedGroupIds = new Set();
  for (const id of requestedNodeIds) {
    if (nodeById.get(id)?.type !== CanvasNodeType.Group) continue;
    const result = ungroupInCanvas(snapshot, id);
    if (!result.removed) {
      refusedGroupIds.add(id);
      continue;
    }
    snapshot = result.canvas;
    ungroupedChildrenByGroupId.set(id, result.updatedNodes);
  }
  const edgeById = new Map(graph.edges.map((edge) => [edge.id, edge]));
  return {
    removalNodeIds: requestedNodeIds.filter((id) => !refusedGroupIds.has(id)),
    removalEdgeIds: requestedEdgeIds.filter((id) => {
      const edge = edgeById.get(id);
      return (
        !edge ||
        (!refusedGroupIds.has(edge.source) && !refusedGroupIds.has(edge.target))
      );
    }),
    ungroupedChildrenByGroupId,
  };
}
export function isBoxOutsideRect(box, rect) {
  const boxRect = {
    x: box.minX,
    y: box.minY,
    w: box.maxX - box.minX,
    h: box.maxY - box.minY,
  };
  const targetRect = {
    x: rect.x,
    y: rect.y,
    w: rect.width,
    h: rect.height,
  };
  return !rectsOverlap(boxRect, targetRect);
}
export function computeNodeGroupBounds(nodes, mode) {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const node of nodes) {
    const size = sizeOf(node, mode);
    const pos = getNodePosition(node, mode);
    minX = Math.min(minX, pos.x);
    minY = Math.min(minY, pos.y);
    maxX = Math.max(maxX, pos.x + size.width);
    maxY = Math.max(maxY, pos.y + size.height);
  }
  return {
    minX,
    minY,
    maxX,
    maxY,
    center: {
      x: (minX + maxX) / 2,
      y: (minY + maxY) / 2,
    },
  };
}
export function centerNodeGroupAt(nodes, target, mode) {
  const topLevel = nodes.filter(
    (node) => !node.parentId && node.meta?.hidden !== true,
  );
  if (topLevel.length === 0) return;
  const { center } = computeNodeGroupBounds(topLevel, mode);
  const { x: cx, y: cy } = center;
  const dx = target.x - cx;
  const dy = target.y - cy;
  for (const node of topLevel) {
    const cur = getNodePosition(node, mode);
    setNodePosition(node, mode, {
      x: cur.x + dx,
      y: cur.y + dy,
    });
  }
}
export function expandSelectionWithGroupChildren(allNodes, selectedIds) {
  const result = new Set(selectedIds);
  for (const node of allNodes) {
    if (node.type !== CanvasNodeType.Group) continue;
    if (!result.has(node.id)) continue;
    for (const candidate of allNodes) {
      if (candidate.parentId === node.id) result.add(candidate.id);
    }
  }
  const selectedGroupIds = new Set();
  for (const node of allNodes) {
    if (
      result.has(node.id) &&
      typeof node.groupId === "string" &&
      node.groupId.length > 0
    ) {
      selectedGroupIds.add(node.groupId);
    }
  }
  if (selectedGroupIds.size > 0) {
    for (const candidate of allNodes) {
      if (candidate.groupId && selectedGroupIds.has(candidate.groupId))
        result.add(candidate.id);
    }
  }
  return result;
}
export function normalizeOrphanChildForClipboard(
  node,
  allNodes,
  copiedIds,
  mode,
) {
  if (node.groupId && node.meta?.hidden === true) {
    const groupMembers = allNodes.filter((memberNode) => memberNode.groupId === node.groupId);
    const main = groupMembers.find((mainNodeCandidate) => mainNodeCandidate.meta?.hidden !== true);
    const mainCopied = main ? copiedIds.has(main.id) : false;
    if (!mainCopied) {
      const mainPos = main
        ? getNodePosition(main, mode)
        : getNodePosition(node, mode);
      const { groupId: _g, round: _r, ...rest } = node;
      return {
        ...rest,
        meta: {
          ...(rest.meta ?? {}),
          hidden: false,
        },
        positions: {
          ...node.positions,
          [mode]: {
            x: mainPos.x,
            y: mainPos.y,
          },
        },
      };
    }
  }
  if (!node.parentId || copiedIds.has(node.parentId)) return node;
  const parent = allNodes.find((parentNode) => parentNode.id === node.parentId);
  if (!parent)
    return {
      ...node,
      parentId: void 0,
    };
  const parentPos = getNodePosition(parent, mode);
  const childRel = getNodePosition(node, mode);
  return {
    ...node,
    parentId: void 0,
    positions: {
      ...node.positions,
      [mode]: {
        x: parentPos.x + childRel.x,
        y: parentPos.y + childRel.y,
      },
    },
  };
}
export function resolveNodeAssetId(node) {
  if (typeof node.assetId === "string" && node.assetId.length > 0)
    return node.assetId;
  const dataAssetId = node.data?.assetId;
  if (typeof dataAssetId === "string" && dataAssetId.length > 0)
    return dataAssetId;
  const parsed = parseNodeId(node.id).assetId;
  return parsed.length > 0 ? parsed : void 0;
}
export function collectClipboardAssetPaths(nodes, resolveAssetPath) {
  const result = {};
  for (const node of nodes) {
    if (!isAssetBackedNode(node.type)) continue;
    const assetId = resolveNodeAssetId(node);
    if (!assetId || result[assetId]) continue;
    const dataPath = node.data?.path;
    if (typeof dataPath === "string" && dataPath.length > 0) {
      result[assetId] = dataPath;
      continue;
    }
    const resolved = resolveAssetPath?.(assetId);
    if (typeof resolved === "string" && resolved.length > 0) {
      result[assetId] = resolved;
    }
  }
  return Object.keys(result).length > 0 ? result : void 0;
}
