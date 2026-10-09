// layout-unsaved-nodes.js
import { isFiniteCanvasPosition } from "./find-free-position-from-anchor.js";

function deepEqualJsonLike(a2, b3) {
  if (Object.is(a2, b3)) return true;
  if (a2 === null || b3 === null) return false;
  if (typeof a2 !== "object" || typeof b3 !== "object") return false;
  if (Array.isArray(a2)) {
    if (!Array.isArray(b3) || a2.length !== b3.length) return false;
    for (let i2 = 0; i2 < a2.length; i2++) {
      if (!deepEqualJsonLike(a2[i2], b3[i2])) return false;
    }
    return true;
  }
  if (Array.isArray(b3)) return false;
  const aObj = a2;
  const bObj = b3;
  const keys2 = new Set([...Object.keys(aObj), ...Object.keys(bObj)]);
  for (const k2 of keys2) {
    if (!deepEqualJsonLike(aObj[k2], bObj[k2])) return false;
  }
  return true;
}

function sizeEqual(a2, b3) {
  if (a2 === b3) return true;
  if (!a2 || !b3) return false;
  return a2.width === b3.width && a2.height === b3.height;
}

function positionsEqual(a2, b3) {
  const aKeys = Object.keys(a2);
  const bKeys = Object.keys(b3);
  if (aKeys.length !== bKeys.length) return false;
  for (const k2 of aKeys) {
    const ap = a2[k2];
    const bp = b3[k2];
    if (!ap || !bp) {
      if (ap !== bp) return false;
      continue;
    }
    if (ap.x !== bp.x || ap.y !== bp.y) return false;
  }
  return true;
}

function sizesEqual(a2, b3) {
  if (a2 === b3) return true;
  if (!a2 || !b3)
    return (
      a2 === b3 ||
      (Object.keys(a2 ?? {}).length === 0 && Object.keys(b3 ?? {}).length === 0)
    );
  const aKeys = Object.keys(a2);
  const bKeys = Object.keys(b3);
  if (aKeys.length !== bKeys.length) return false;
  for (const k2 of aKeys) {
    if (!sizeEqual(a2[k2], b3[k2])) return false;
  }
  return true;
}

function areCanvasNodesContentEqual(a2, b3) {
  if (a2 === b3) return true;
  if (a2.id !== b3.id) return false;
  if (a2.type !== b3.type) return false;
  if (a2.parentId !== b3.parentId) return false;
  if (a2.groupId !== b3.groupId) return false;
  if (a2.round !== b3.round) return false;
  if (!sizeEqual(a2.size, b3.size)) return false;
  if (!sizesEqual(a2.sizes, b3.sizes)) return false;
  if (!positionsEqual(a2.positions, b3.positions)) return false;
  if (!deepEqualJsonLike(a2.meta, b3.meta)) return false;
  if (!deepEqualJsonLike(a2.data, b3.data)) return false;
  return true;
}

export function reuseUnchangedNodeRefs(freshNodes, currentNodes) {
  const lookup = Array.isArray(currentNodes)
    ? new Map(currentNodes.map((n2) => [n2.id, n2]))
    : currentNodes;
  for (let i2 = 0; i2 < freshNodes.length; i2++) {
    const next2 = freshNodes[i2];
    const prev = lookup.get(next2.id);
    if (prev && areCanvasNodesContentEqual(prev, next2)) {
      freshNodes[i2] = prev;
    }
  }
  return freshNodes;
}

function partitionByPosition(nodes, allSavedNodes, mode2) {
  const withSaved = [];
  const withoutSaved = [];
  for (const n2 of nodes) {
    const savedNode = allSavedNodes.get(n2.id);
    (n2.meta?.hidden || isFiniteCanvasPosition(savedNode?.positions?.[mode2])
      ? withSaved
      : withoutSaved
    ).push(n2);
  }
  return {
    withSaved,
    withoutSaved,
  };
}

function applyPositions(nodes, positions, mode2) {
  return nodes.map((n2) => {
    const pos = positions.get(n2.id);
    return pos
      ? {
          ...n2,
          positions: {
            ...n2.positions,
            [mode2]: pos,
          },
        }
      : n2;
  });
}

export function layoutUnsavedNodes(
  instance2,
  nodes,
  allSavedNodes,
  mode2,
  edges,
  anchor,
) {
  const { withSaved, withoutSaved } = partitionByPosition(
    nodes,
    allSavedNodes,
    mode2,
  );
  if (withoutSaved.length === 0) {
    return {
      nodes,
      needsPersist: false,
    };
  }
  const positions = instance2.layout.computeIncremental(
    "dagre",
    withSaved,
    withoutSaved,
    edges,
    {
      mode: mode2,
      ...(anchor
        ? {
            anchor,
          }
        : {}),
    },
  );
  return {
    nodes: applyPositions(nodes, positions, mode2),
    needsPersist: true,
  };
}
