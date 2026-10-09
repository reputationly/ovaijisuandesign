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
  for (const node2 of nodes) {
    if (removedNodeIds.has(node2.id) && node2.groupId)
      affectedGroupIds.add(node2.groupId);
  }
  for (const groupId2 of affectedGroupIds) {
    const members = collectGroupMembers(nodes, groupId2);
    const main2 = members.find((member) => member.meta?.hidden !== true);
    if (!main2 || !removedNodeIds.has(main2.id)) continue;
    removedMainIndexByGroup.set(
      groupId2,
      members.findIndex((member) => member.id === main2.id),
    );
    const runtimeMain = nodes.find((node2) => node2.id === main2.id);
    if (runtimeMain) removedVisibleMainByGroup.set(groupId2, runtimeMain);
  }
  let remaining = nodes.filter((node2) => !removedNodeIds.has(node2.id));
  for (const groupId2 of affectedGroupIds) {
    const members = remaining.filter((node2) => node2.groupId === groupId2);
    if (
      members.length === 0 ||
      members.some((node2) => node2.meta?.hidden !== true)
    )
      continue;
    const successorId = pickSuccessorMain(
      members,
      removedMainIndexByGroup.get(groupId2) ?? 0,
    );
    const successor =
      members.find((node2) => node2.id === successorId) ?? members[0];
    const previousMain = removedVisibleMainByGroup.get(groupId2);
    remaining = remaining.map((node2) => {
      if (node2.id !== successor.id) return node2;
      const next2 = {
        ...node2,
        meta: {
          ...(node2.meta ?? {}),
          hidden: false,
        },
      };
      if (previousMain) {
        next2.positions = {
          ...(previousMain.positions ?? {}),
        };
        if (previousMain.size)
          next2.size = {
            ...previousMain.size,
          };
        if (previousMain.sizes)
          next2.sizes = {
            ...previousMain.sizes,
          };
        if (previousMain.parentId !== void 0)
          next2.parentId = previousMain.parentId;
        else delete next2.parentId;
      }
      const assetId =
        next2.assetId ??
        (next2.data && typeof next2.data === "object"
          ? next2.data.assetId
          : void 0);
      return typeof assetId === "string" && assetId.length > 0
        ? {
            ...next2,
            data: {
              ...next2.data,
              assetId,
            },
          }
        : next2;
    });
  }
  return remaining;
}
const IN_FLIGHT_NODE_STATUSES = new Set(["pending", "generating", "loading"]);
export function isInFlightNode(node2) {
  if (!node2) return false;
  const status = node2.data?.status;
  return typeof status === "string" && IN_FLIGHT_NODE_STATUSES.has(status);
}
export function isRetainedGenerationNode(node2) {
  if (!node2) return false;
  const status = node2.data?.status;
  return status === "recoverable_error" || status === "status_unknown";
}
function historyTraversalBlock(current2, candidate, isProtectedNode) {
  if (!candidate) return "empty";
  const candidateById = new Map(
    candidate.nodes.map((node2) => [node2.id, node2]),
  );
  for (const node2 of current2.nodes) {
    if (!isProtectedNode(node2)) continue;
    const twin = candidateById.get(node2.id);
    if (!twin || !isProtectedNode(twin)) return "in-flight";
  }
  return "none";
}
export function decideHistoryStep(current2, candidate) {
  const inFlightBlock = historyTraversalBlock(
    current2,
    candidate,
    isInFlightNode,
  );
  if (inFlightBlock === "in-flight")
    return {
      allow: false,
      blockReason: "generating",
    };
  const retainedBlock = historyTraversalBlock(
    current2,
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
function readComfyUiWorkflowIdentity(node2) {
  if (!node2.data || typeof node2.data !== "object") return void 0;
  const data2 = node2.data;
  if (data2.pluginId !== COMFYUI_PLUGIN_ID) return void 0;
  for (const key2 of ["currentWorkflowId", "sourceTemplateId"]) {
    const value = data2[key2];
    if (typeof value !== "string") continue;
    const identity2 = value.trim();
    if (identity2) return identity2;
  }
  return void 0;
}
function readTemplateCopyOrdinal(node2) {
  if (!node2.data || typeof node2.data !== "object") return 0;
  const ordinal = node2.data.comfyuiTemplateCopyOrdinal;
  return typeof ordinal === "number" && Number.isInteger(ordinal) && ordinal > 0
    ? ordinal
    : 0;
}
export function assignComfyUiTemplateCopyOrdinals(existingNodes, pastedNodes) {
  const nextOrdinalByTemplate = new Map();
  for (const node2 of existingNodes) {
    const workflowIdentity = readComfyUiWorkflowIdentity(node2);
    if (!workflowIdentity) continue;
    nextOrdinalByTemplate.set(
      workflowIdentity,
      Math.max(
        nextOrdinalByTemplate.get(workflowIdentity) ?? 0,
        readTemplateCopyOrdinal(node2),
      ),
    );
  }
  return pastedNodes.map((node2) => {
    const workflowIdentity = readComfyUiWorkflowIdentity(node2);
    if (!workflowIdentity || !node2.data || typeof node2.data !== "object")
      return node2;
    const nextOrdinal = (nextOrdinalByTemplate.get(workflowIdentity) ?? 0) + 1;
    nextOrdinalByTemplate.set(workflowIdentity, nextOrdinal);
    return {
      ...node2,
      data: {
        ...node2.data,
        comfyuiTemplateCopyOrdinal: nextOrdinal,
      },
    };
  });
}
export function backfillLegacyComfyUiTemplateCopyOrdinals(nodes) {
  const templatesWithOrdinals = new Set();
  for (const node2 of nodes) {
    const workflowIdentity = readComfyUiWorkflowIdentity(node2);
    if (workflowIdentity && readTemplateCopyOrdinal(node2) > 0) {
      templatesWithOrdinals.add(workflowIdentity);
    }
  }
  const nextOrdinalByTemplate = new Map();
  return nodes.map((node2) => {
    const workflowIdentity = readComfyUiWorkflowIdentity(node2);
    if (
      !workflowIdentity ||
      templatesWithOrdinals.has(workflowIdentity) ||
      !node2.data ||
      typeof node2.data !== "object"
    ) {
      return node2;
    }
    const nextOrdinal = (nextOrdinalByTemplate.get(workflowIdentity) ?? 0) + 1;
    nextOrdinalByTemplate.set(workflowIdentity, nextOrdinal);
    return {
      ...node2,
      data: {
        ...node2.data,
        comfyuiTemplateCopyOrdinal: nextOrdinal,
      },
    };
  });
}
export function planGroupAwareRemoval(
  graph,
  mode2,
  requestedNodeIds,
  requestedEdgeIds,
) {
  const nodeById = new Map(graph.nodes.map((node2) => [node2.id, node2]));
  let snapshot2 = buildCanvasFileSnapshot(graph, mode2);
  const ungroupedChildrenByGroupId = new Map();
  const refusedGroupIds = new Set();
  for (const id2 of requestedNodeIds) {
    if (nodeById.get(id2)?.type !== CanvasNodeType.Group) continue;
    const result = ungroupInCanvas(snapshot2, id2);
    if (!result.removed) {
      refusedGroupIds.add(id2);
      continue;
    }
    snapshot2 = result.canvas;
    ungroupedChildrenByGroupId.set(id2, result.updatedNodes);
  }
  const edgeById = new Map(graph.edges.map((edge) => [edge.id, edge]));
  return {
    removalNodeIds: requestedNodeIds.filter((id2) => !refusedGroupIds.has(id2)),
    removalEdgeIds: requestedEdgeIds.filter((id2) => {
      const edge = edgeById.get(id2);
      return (
        !edge ||
        (!refusedGroupIds.has(edge.source) && !refusedGroupIds.has(edge.target))
      );
    }),
    ungroupedChildrenByGroupId,
  };
}
export function isBoxOutsideRect(box2, rect) {
  const a2 = {
    x: box2.minX,
    y: box2.minY,
    w: box2.maxX - box2.minX,
    h: box2.maxY - box2.minY,
  };
  const b3 = {
    x: rect.x,
    y: rect.y,
    w: rect.width,
    h: rect.height,
  };
  return !rectsOverlap(a2, b3);
}
export function computeNodeGroupBounds(nodes, mode2) {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const node2 of nodes) {
    const size2 = sizeOf(node2, mode2);
    const pos = getNodePosition(node2, mode2);
    minX = Math.min(minX, pos.x);
    minY = Math.min(minY, pos.y);
    maxX = Math.max(maxX, pos.x + size2.width);
    maxY = Math.max(maxY, pos.y + size2.height);
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
export function centerNodeGroupAt(nodes, target, mode2) {
  const topLevel = nodes.filter(
    (n2) => !n2.parentId && n2.meta?.hidden !== true,
  );
  if (topLevel.length === 0) return;
  const { center } = computeNodeGroupBounds(topLevel, mode2);
  const { x: cx2, y: cy } = center;
  const dx = target.x - cx2;
  const dy = target.y - cy;
  for (const node2 of topLevel) {
    const cur = getNodePosition(node2, mode2);
    setNodePosition(node2, mode2, {
      x: cur.x + dx,
      y: cur.y + dy,
    });
  }
}
export function expandSelectionWithGroupChildren(allNodes, selectedIds) {
  const result = new Set(selectedIds);
  for (const node2 of allNodes) {
    if (node2.type !== CanvasNodeType.Group) continue;
    if (!result.has(node2.id)) continue;
    for (const candidate of allNodes) {
      if (candidate.parentId === node2.id) result.add(candidate.id);
    }
  }
  const selectedGroupIds = new Set();
  for (const node2 of allNodes) {
    if (
      result.has(node2.id) &&
      typeof node2.groupId === "string" &&
      node2.groupId.length > 0
    ) {
      selectedGroupIds.add(node2.groupId);
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
  node2,
  allNodes,
  copiedIds,
  mode2,
) {
  if (node2.groupId && node2.meta?.hidden === true) {
    const groupMembers = allNodes.filter((n2) => n2.groupId === node2.groupId);
    const main2 = groupMembers.find((n2) => n2.meta?.hidden !== true);
    const mainCopied = main2 ? copiedIds.has(main2.id) : false;
    if (!mainCopied) {
      const mainPos = main2
        ? getNodePosition(main2, mode2)
        : getNodePosition(node2, mode2);
      const { groupId: _g, round: _r, ...rest } = node2;
      return {
        ...rest,
        meta: {
          ...(rest.meta ?? {}),
          hidden: false,
        },
        positions: {
          ...node2.positions,
          [mode2]: {
            x: mainPos.x,
            y: mainPos.y,
          },
        },
      };
    }
  }
  if (!node2.parentId || copiedIds.has(node2.parentId)) return node2;
  const parent = allNodes.find((p3) => p3.id === node2.parentId);
  if (!parent)
    return {
      ...node2,
      parentId: void 0,
    };
  const parentPos = getNodePosition(parent, mode2);
  const childRel = getNodePosition(node2, mode2);
  return {
    ...node2,
    parentId: void 0,
    positions: {
      ...node2.positions,
      [mode2]: {
        x: parentPos.x + childRel.x,
        y: parentPos.y + childRel.y,
      },
    },
  };
}
export function resolveNodeAssetId(node2) {
  if (typeof node2.assetId === "string" && node2.assetId.length > 0)
    return node2.assetId;
  const dataAssetId = node2.data?.assetId;
  if (typeof dataAssetId === "string" && dataAssetId.length > 0)
    return dataAssetId;
  const parsed = parseNodeId(node2.id).assetId;
  return parsed.length > 0 ? parsed : void 0;
}
export function collectClipboardAssetPaths(nodes, resolveAssetPath) {
  const result = {};
  for (const node2 of nodes) {
    if (!isAssetBackedNode(node2.type)) continue;
    const assetId = resolveNodeAssetId(node2);
    if (!assetId || result[assetId]) continue;
    const dataPath = node2.data?.path;
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
