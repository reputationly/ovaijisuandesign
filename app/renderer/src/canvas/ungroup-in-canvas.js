// ungroup-in-canvas.js
import { CanvasNodeType } from "../vendor.js";
import { withParentId } from "./compute-group-bounds-from-children.js";
export function ungroupInCanvas(canvas, groupId2) {
  const mode2 = canvas.mode;
  const groupNode = canvas.nodes.find((node) => node.id === groupId2);
  if (!groupNode || groupNode.type !== CanvasNodeType.Group) {
    return {
      canvas,
      removedNodeIds: [],
      updatedNodes: [],
      removed: false,
    };
  }
  const groupModes = new Set();
  for (const mode of Object.keys(groupNode.positions ?? {})) {
    groupModes.add(mode);
  }
  const groupAbsByMode = new Map();
  for (const mode of groupModes) {
    const position = groupNode.positions?.[mode];
    if (position) groupAbsByMode.set(mode, position);
  }
  if (!groupAbsByMode.has(mode2)) {
    const availableModes = Array.from(groupAbsByMode.keys());
    return {
      canvas,
      removedNodeIds: [],
      updatedNodes: [],
      removed: false,
      error: {
        code: "incomplete-positions",
        mode: mode2,
        missingNodeIds: [groupId2],
        availableModes,
      },
    };
  }
  const updatedChildren = [];
  const nextNodes = [];
  for (const node2 of canvas.nodes) {
    if (node2.id === groupId2) continue;
    if (node2.parentId === groupId2) {
      const newPositions = {
        ...(node2.positions ?? {}),
      };
      for (const [mode, groupAbs] of groupAbsByMode) {
        const relativePosition = node2.positions?.[mode];
        if (!relativePosition) continue;
        newPositions[mode] = {
          x: relativePosition.x + groupAbs.x,
          y: relativePosition.y + groupAbs.y,
        };
      }
      const next2 = withParentId(
        {
          ...node2,
          positions: newPositions,
        },
        void 0,
      );
      nextNodes.push(next2);
      updatedChildren.push(next2);
      continue;
    }
    nextNodes.push(node2);
  }
  return {
    canvas: {
      ...canvas,
      nodes: nextNodes,
      edges: canvas.edges,
    },
    removedNodeIds: [groupId2],
    updatedNodes: updatedChildren,
    removed: true,
  };
}
export function isGroupedNode(node2) {
  return typeof node2.groupId === "string" && node2.groupId.length > 0;
}
export function collectGroupMembers(nodes, groupId2) {
  const members = [];
  for (let nodeIndex = 0; nodeIndex < nodes.length; nodeIndex += 1) {
    if (nodes[nodeIndex].groupId === groupId2)
      members.push({
        node: nodes[nodeIndex],
        i: nodeIndex,
      });
  }
  members.sort((leftMember, rightMember) => {
    const leftRound = Number.isInteger(leftMember.node.round)
      ? leftMember.node.round
      : Number.MAX_SAFE_INTEGER;
    const rightRound = Number.isInteger(rightMember.node.round)
      ? rightMember.node.round
      : Number.MAX_SAFE_INTEGER;
    if (leftRound !== rightRound) return leftRound - rightRound;
    return leftMember.i - rightMember.i;
  });
  return members.map((groupMember) => groupMember.node);
}
export function resolveMainNode(members) {
  if (members.length === 0) return void 0;
  return members.find((node) => node.meta?.hidden !== true) ?? members[0];
}
export function resolveGroupMainId(nodes, nodeId) {
  const node2 = nodes.find((node) => node.id === nodeId);
  if (!node2 || !isGroupedNode(node2)) return nodeId;
  const main2 = resolveMainNode(collectGroupMembers(nodes, node2.groupId));
  return main2?.id ?? nodeId;
}
export function pickSuccessorMain(remaining, removedSortedIndex) {
  if (remaining.length === 0) return void 0;
  const sorted = remaining
    .map((node2, index) => ({
      node: node2,
      i: index,
    }))
    .sort((leftMember, rightMember) => {
      const leftRound = Number.isInteger(leftMember.node.round)
        ? leftMember.node.round
        : Number.MAX_SAFE_INTEGER;
      const rightRound = Number.isInteger(rightMember.node.round)
        ? rightMember.node.round
        : Number.MAX_SAFE_INTEGER;
      if (leftRound !== rightRound) return leftRound - rightRound;
      return leftMember.i - rightMember.i;
    })
    .map((groupMember) => groupMember.node);
  const successorIndex = Math.max(0, removedSortedIndex);
  return (sorted[successorIndex] ?? sorted[sorted.length - 1])?.id;
}
export function removeGroup(nodes, groupId2) {
  const removed = new Set();
  for (const node of nodes) if (node.groupId === groupId2) removed.add(node.id);
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
export function imageNodeAssetId(node2) {
  if (typeof node2.assetId === "string" && node2.assetId.length > 0)
    return node2.assetId;
  const nestedAssetId = node2.data?.assetId;
  if (typeof nestedAssetId === "string" && nestedAssetId.length > 0) return nestedAssetId;
  return node2.id;
}
export function mirrorAssetIdIntoData(node2) {
  const assetId = imageNodeAssetId(node2);
  if (!assetId || assetId === node2.id) return node2;
  const data2 = node2.data ?? {};
  if (data2.assetId === assetId) return node2;
  return {
    ...node2,
    data: {
      ...data2,
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
  const updatedNodes = nodes.map((node) => {
    if (node.id === nodeId) {
      updatedIds.push(node.id);
      const next2 = {
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
        next2.size = {
          ...oldMain.size,
        };
      if (oldMain.sizes)
        next2.sizes = {
          ...oldMain.sizes,
        };
      if (oldMain.parentId !== void 0) next2.parentId = oldMain.parentId;
      else delete next2.parentId;
      return mirrorAssetIdIntoData(next2);
    }
    if (node.id === oldMain.id) {
      updatedIds.push(node.id);
      const { parentId: _parentId, ...rest } = node;
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
    nodes: updatedNodes,
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
