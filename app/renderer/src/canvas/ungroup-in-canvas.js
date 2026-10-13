// ungroup-in-canvas.js
import { CanvasNodeType } from "../vendor.js";
import { withParentId } from "./compute-group-bounds-from-children.js";
export function ungroupInCanvas(canvas, groupId) {
  const mode = canvas.mode;
  const groupNode = canvas.nodes.find((node) => node.id === groupId);
  if (!groupNode || groupNode.type !== CanvasNodeType.Group) {
    return {
      canvas,
      removedNodeIds: [],
      updatedNodes: [],
      removed: false,
    };
  }
  const groupModes = new Set();
  for (const layoutMode of Object.keys(groupNode.positions ?? {})) {
    groupModes.add(layoutMode);
  }
  const groupAbsByMode = new Map();
  for (const layoutMode of groupModes) {
    const position = groupNode.positions?.[layoutMode];
    if (position) groupAbsByMode.set(layoutMode, position);
  }
  if (!groupAbsByMode.has(mode)) {
    const availableModes = Array.from(groupAbsByMode.keys());
    return {
      canvas,
      removedNodeIds: [],
      updatedNodes: [],
      removed: false,
      error: {
        code: "incomplete-positions",
        mode,
        missingNodeIds: [groupId],
        availableModes,
      },
    };
  }
  const updatedChildren = [];
  const nextNodes = [];
  for (const node of canvas.nodes) {
    if (node.id === groupId) continue;
    if (node.parentId === groupId) {
      const newPositions = {
        ...(node.positions ?? {}),
      };
      for (const [layoutMode, groupAbs] of groupAbsByMode) {
        const rel = node.positions?.[layoutMode];
        if (!rel) continue;
        newPositions[layoutMode] = {
          x: rel.x + groupAbs.x,
          y: rel.y + groupAbs.y,
        };
      }
      const next = withParentId(
        {
          ...node,
          positions: newPositions,
        },
        void 0,
      );
      nextNodes.push(next);
      updatedChildren.push(next);
      continue;
    }
    nextNodes.push(node);
  }
  return {
    canvas: {
      ...canvas,
      nodes: nextNodes,
      edges: canvas.edges,
    },
    removedNodeIds: [groupId],
    updatedNodes: updatedChildren,
    removed: true,
  };
}
export function isGroupedNode(node) {
  return typeof node.groupId === "string" && node.groupId.length > 0;
}
export function collectGroupMembers(nodes, groupId) {
  const members = [];
  for (let nodeIndex = 0; nodeIndex < nodes.length; nodeIndex += 1) {
    if (nodes[nodeIndex].groupId === groupId)
      members.push({
        node: nodes[nodeIndex],
        i: nodeIndex,
      });
  }
  members.sort((leftMember, rightMember) => {
    const ra = Number.isInteger(leftMember.node.round)
      ? leftMember.node.round
      : Number.MAX_SAFE_INTEGER;
    const rb = Number.isInteger(rightMember.node.round)
      ? rightMember.node.round
      : Number.MAX_SAFE_INTEGER;
    if (ra !== rb) return ra - rb;
    return leftMember.i - rightMember.i;
  });
  return members.map((groupMember) => groupMember.node);
}
export function resolveMainNode(members) {
  if (members.length === 0) return void 0;
  return members.find((node) => node.meta?.hidden !== true) ?? members[0];
}
export function resolveGroupMainId(nodes, nodeId) {
  const node = nodes.find((candidateNode) => candidateNode.id === nodeId);
  if (!node || !isGroupedNode(node)) return nodeId;
  const main = resolveMainNode(collectGroupMembers(nodes, node.groupId));
  return main?.id ?? nodeId;
}
export function pickSuccessorMain(remaining, removedSortedIndex) {
  if (remaining.length === 0) return void 0;
  const sorted = remaining
    .map((node, index) => ({
      node,
      i: index,
    }))
    .sort((leftMember, rightMember) => {
      const ra = Number.isInteger(leftMember.node.round)
        ? leftMember.node.round
        : Number.MAX_SAFE_INTEGER;
      const rb = Number.isInteger(rightMember.node.round)
        ? rightMember.node.round
        : Number.MAX_SAFE_INTEGER;
      if (ra !== rb) return ra - rb;
      return leftMember.i - rightMember.i;
    })
    .map((groupMember) => groupMember.node);
  const idx = Math.max(0, removedSortedIndex);
  return (sorted[idx] ?? sorted[sorted.length - 1])?.id;
}
export function removeGroup(nodes, groupId) {
  const removed = new Set();
  for (const node of nodes) if (node.groupId === groupId) removed.add(node.id);
  if (removed.size === 0) {
    return {
      nodes: nodes.slice(),
      removedIds: [],
      updatedIds: [],
    };
  }
  return {
    nodes: nodes.filter((node) => !removed.has(node.id)),
    removedIds: [...removed],
    updatedIds: [],
  };
}
export function imageNodeAssetId(node) {
  if (typeof node.assetId === "string" && node.assetId.length > 0)
    return node.assetId;
  const da = node.data?.assetId;
  if (typeof da === "string" && da.length > 0) return da;
  return node.id;
}
export function mirrorAssetIdIntoData(node) {
  const assetId = imageNodeAssetId(node);
  if (!assetId || assetId === node.id) return node;
  const data = node.data ?? {};
  if (data.assetId === assetId) return node;
  return {
    ...node,
    data: {
      ...data,
      assetId,
    },
  };
}
export function promoteToMain(nodes, nodeId) {
  const target = nodes.find((node) => node.id === nodeId);
  if (!target || !isGroupedNode(target)) {
    return {
      nodes: nodes.slice(),
      removedIds: [],
      updatedIds: [],
    };
  }
  const members = collectGroupMembers(nodes, target.groupId);
  const oldMain = resolveMainNode(members);
  if (!oldMain || oldMain.id === nodeId) {
    return {
      nodes: nodes.slice(),
      removedIds: [],
      updatedIds: [],
    };
  }
  const updatedIds = [];
  const out = nodes.map((node) => {
    if (node.id === nodeId) {
      updatedIds.push(node.id);
      const next = {
        ...node,
        meta: {
          ...(node.meta ?? {}),
          hidden: false,
        },
        positions: {
          ...oldMain.positions,
        },
      };
      if (oldMain.size)
        next.size = {
          ...oldMain.size,
        };
      if (oldMain.sizes)
        next.sizes = {
          ...oldMain.sizes,
        };
      if (oldMain.parentId !== void 0) next.parentId = oldMain.parentId;
      else delete next.parentId;
      return mirrorAssetIdIntoData(next);
    }
    if (node.id === oldMain.id) {
      updatedIds.push(node.id);
      const { parentId: _p, ...rest } = node;
      return {
        ...rest,
        meta: {
          ...(node.meta ?? {}),
          hidden: true,
        },
        positions: {},
      };
    }
    return node;
  });
  return {
    nodes: out,
    removedIds: [],
    updatedIds,
    repointFollow: {
      from: oldMain.id,
      to: nodeId,
    },
  };
}
export const DEFAULT_WORKFLOW_NODE_SPACING = 100;
export const DEFAULT_PLACEMENT_GAP = DEFAULT_WORKFLOW_NODE_SPACING;
export const DEFAULT_WORKFLOW_LAYER_SPACING = 100;
export function rectsOverlap(firstRect, secondRect, margin = 0) {
  return (
    firstRect.x < secondRect.x + secondRect.w + margin &&
    firstRect.x + firstRect.w + margin > secondRect.x &&
    firstRect.y < secondRect.y + secondRect.h + margin &&
    firstRect.y + firstRect.h + margin > secondRect.y
  );
}
