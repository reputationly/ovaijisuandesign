// resolve-absolute-position-from-graph.js

export function resolveAbsolutePositionFromGraph(node2, mode2, graphNodes) {
  const pos = node2.positions?.[mode2];
  if (!pos) return void 0;
  if (!node2.parentId) return pos;
  let absX = pos.x;
  let absY = pos.y;
  let currentParentId = node2.parentId;
  while (currentParentId) {
    const parent = graphNodes.find((n2) => n2.id === currentParentId);
    if (!parent) break;
    const parentPos = parent.positions?.[mode2];
    if (!parentPos) break;
    absX += parentPos.x;
    absY += parentPos.y;
    currentParentId = parent.parentId;
  }
  return {
    x: absX,
    y: absY,
  };
}
