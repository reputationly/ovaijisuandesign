// layout-unsaved-nodes.js
import { isFiniteCanvasPosition } from "./find-free-position-from-anchor.js";

function deepEqualJsonLike(leftValue, rightValue) {
  if (Object.is(leftValue, rightValue)) return true;
  if (leftValue === null || rightValue === null) return false;
  if (typeof leftValue !== "object" || typeof rightValue !== "object") return false;
  if (Array.isArray(leftValue)) {
    if (!Array.isArray(rightValue) || leftValue.length !== rightValue.length) return false;
    for (let index = 0; index < leftValue.length; index++) {
      if (!deepEqualJsonLike(leftValue[index], rightValue[index])) return false;
    }
    return true;
  }
  if (Array.isArray(rightValue)) return false;
  const aObj = leftValue;
  const bObj = rightValue;
  const keys = new Set([...Object.keys(aObj), ...Object.keys(bObj)]);
  for (const key of keys) {
    if (!deepEqualJsonLike(aObj[key], bObj[key])) return false;
  }
  return true;
}

function sizeEqual(leftSize, rightSize) {
  if (leftSize === rightSize) return true;
  if (!leftSize || !rightSize) return false;
  return leftSize.width === rightSize.width && leftSize.height === rightSize.height;
}

function positionsEqual(leftPositions, rightPositions) {
  const aKeys = Object.keys(leftPositions);
  const bKeys = Object.keys(rightPositions);
  if (aKeys.length !== bKeys.length) return false;
  for (const key of aKeys) {
    const ap = leftPositions[key];
    const bp = rightPositions[key];
    if (!ap || !bp) {
      if (ap !== bp) return false;
      continue;
    }
    if (ap.x !== bp.x || ap.y !== bp.y) return false;
  }
  return true;
}

function sizesEqual(leftSizes, rightSizes) {
  if (leftSizes === rightSizes) return true;
  if (!leftSizes || !rightSizes)
    return (
      leftSizes === rightSizes ||
      (Object.keys(leftSizes ?? {}).length === 0 && Object.keys(rightSizes ?? {}).length === 0)
    );
  const aKeys = Object.keys(leftSizes);
  const bKeys = Object.keys(rightSizes);
  if (aKeys.length !== bKeys.length) return false;
  for (const key of aKeys) {
    if (!sizeEqual(leftSizes[key], rightSizes[key])) return false;
  }
  return true;
}

function areCanvasNodesContentEqual(leftNode, rightNode) {
  if (leftNode === rightNode) return true;
  if (leftNode.id !== rightNode.id) return false;
  if (leftNode.type !== rightNode.type) return false;
  if (leftNode.parentId !== rightNode.parentId) return false;
  if (leftNode.groupId !== rightNode.groupId) return false;
  if (leftNode.round !== rightNode.round) return false;
  if (!sizeEqual(leftNode.size, rightNode.size)) return false;
  if (!sizesEqual(leftNode.sizes, rightNode.sizes)) return false;
  if (!positionsEqual(leftNode.positions, rightNode.positions)) return false;
  if (!deepEqualJsonLike(leftNode.meta, rightNode.meta)) return false;
  if (!deepEqualJsonLike(leftNode.data, rightNode.data)) return false;
  return true;
}

export function reuseUnchangedNodeRefs(freshNodes, currentNodes) {
  const lookup = Array.isArray(currentNodes)
    ? new Map(currentNodes.map((node) => [node.id, node]))
    : currentNodes;
  for (let nodeIndex = 0; nodeIndex < freshNodes.length; nodeIndex++) {
    const next = freshNodes[nodeIndex];
    const prev = lookup.get(next.id);
    if (prev && areCanvasNodesContentEqual(prev, next)) {
      freshNodes[nodeIndex] = prev;
    }
  }
  return freshNodes;
}

function partitionByPosition(nodes, allSavedNodes, mode) {
  const withSaved = [];
  const withoutSaved = [];
  for (const node of nodes) {
    const savedNode = allSavedNodes.get(node.id);
    (node.meta?.hidden || isFiniteCanvasPosition(savedNode?.positions?.[mode])
      ? withSaved
      : withoutSaved
    ).push(node);
  }
  return {
    withSaved,
    withoutSaved,
  };
}

function applyPositions(nodes, positions, mode) {
  return nodes.map((node) => {
    const pos = positions.get(node.id);
    return pos
      ? {
          ...node,
          positions: {
            ...node.positions,
            [mode]: pos,
          },
        }
      : node;
  });
}

export function layoutUnsavedNodes(
  instance,
  nodes,
  allSavedNodes,
  mode,
  edges,
  anchor,
) {
  const { withSaved, withoutSaved } = partitionByPosition(
    nodes,
    allSavedNodes,
    mode,
  );
  if (withoutSaved.length === 0) {
    return {
      nodes,
      needsPersist: false,
    };
  }
  const positions = instance.layout.computeIncremental(
    "dagre",
    withSaved,
    withoutSaved,
    edges,
    {
      mode,
      ...(anchor
        ? {
            anchor,
          }
        : {}),
    },
  );
  return {
    nodes: applyPositions(nodes, positions, mode),
    needsPersist: true,
  };
}
