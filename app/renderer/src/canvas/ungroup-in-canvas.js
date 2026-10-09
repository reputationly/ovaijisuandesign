// ungroup-in-canvas.js
import { CanvasNodeType } from "../vendor.js";
import { withParentId } from "./compute-group-bounds-from-children.js";

export function ungroupInCanvas(canvas, groupId2) {
  const mode2 = canvas.mode;
  const groupNode = canvas.nodes.find((n2) => n2.id === groupId2);
  if (!groupNode || groupNode.type !== CanvasNodeType.Group) {
    return {
      canvas,
      removedNodeIds: [],
      updatedNodes: [],
      removed: false,
    };
  }
  const groupModes = new Set();
  for (const m3 of Object.keys(groupNode.positions ?? {})) {
    groupModes.add(m3);
  }
  const groupAbsByMode = new Map();
  for (const m3 of groupModes) {
    const p3 = groupNode.positions?.[m3];
    if (p3) groupAbsByMode.set(m3, p3);
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
      for (const [m3, groupAbs] of groupAbsByMode) {
        const rel = node2.positions?.[m3];
        if (!rel) continue;
        newPositions[m3] = {
          x: rel.x + groupAbs.x,
          y: rel.y + groupAbs.y,
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
  for (let i2 = 0; i2 < nodes.length; i2 += 1) {
    if (nodes[i2].groupId === groupId2)
      members.push({
        node: nodes[i2],
        i: i2,
      });
  }
  members.sort((a2, b3) => {
    const ra = Number.isInteger(a2.node.round)
      ? a2.node.round
      : Number.MAX_SAFE_INTEGER;
    const rb = Number.isInteger(b3.node.round)
      ? b3.node.round
      : Number.MAX_SAFE_INTEGER;
    if (ra !== rb) return ra - rb;
    return a2.i - b3.i;
  });
  return members.map((x2) => x2.node);
}

export function resolveMainNode(members) {
  if (members.length === 0) return void 0;
  return members.find((m3) => m3.meta?.hidden !== true) ?? members[0];
}

export function resolveGroupMainId(nodes, nodeId) {
  const node2 = nodes.find((n2) => n2.id === nodeId);
  if (!node2 || !isGroupedNode(node2)) return nodeId;
  const main2 = resolveMainNode(collectGroupMembers(nodes, node2.groupId));
  return main2?.id ?? nodeId;
}

export function pickSuccessorMain(remaining, removedSortedIndex) {
  if (remaining.length === 0) return void 0;
  const sorted = remaining
    .map((node2, i2) => ({
      node: node2,
      i: i2,
    }))
    .sort((a2, b3) => {
      const ra = Number.isInteger(a2.node.round)
        ? a2.node.round
        : Number.MAX_SAFE_INTEGER;
      const rb = Number.isInteger(b3.node.round)
        ? b3.node.round
        : Number.MAX_SAFE_INTEGER;
      if (ra !== rb) return ra - rb;
      return a2.i - b3.i;
    })
    .map((x2) => x2.node);
  const idx = Math.max(0, removedSortedIndex);
  return (sorted[idx] ?? sorted[sorted.length - 1])?.id;
}

export function removeGroup(nodes, groupId2) {
  const removed = new Set();
  for (const n2 of nodes) if (n2.groupId === groupId2) removed.add(n2.id);
  if (removed.size === 0) {
    return {
      nodes: nodes.slice(),
      removedIds: [],
      updatedIds: [],
    };
  }
  return {
    nodes: nodes.filter((n2) => !removed.has(n2.id)),
    removedIds: [...removed],
    updatedIds: [],
  };
}

export function imageNodeAssetId(node2) {
  if (typeof node2.assetId === "string" && node2.assetId.length > 0)
    return node2.assetId;
  const da = node2.data?.assetId;
  if (typeof da === "string" && da.length > 0) return da;
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
  const target = nodes.find((n2) => n2.id === nodeId);
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
  const out = nodes.map((n2) => {
    if (n2.id === nodeId) {
      updatedIds.push(n2.id);
      const next2 = {
        ...n2,
        meta: {
          ...(n2.meta ?? {}),
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
    if (n2.id === oldMain.id) {
      updatedIds.push(n2.id);
      const { parentId: _p, ...rest } = n2;
      return {
        ...rest,
        meta: {
          ...(n2.meta ?? {}),
          hidden: true,
        },
        positions: {},
      };
    }
    return n2;
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

export function rectsOverlap$1(a2, b3, margin = 0) {
  return (
    a2.x < b3.x + b3.w + margin &&
    a2.x + a2.w + margin > b3.x &&
    a2.y < b3.y + b3.h + margin &&
    a2.y + a2.h + margin > b3.y
  );
}
