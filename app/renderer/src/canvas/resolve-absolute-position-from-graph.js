// resolve-absolute-position-from-graph.js

export function resolveAbsolutePositionFromGraph(node2, mode2, graphNodes) {
  const position = node2.positions?.[mode2];
  if (!position) return void 0;
  if (!node2.parentId) return position;
  let absX = position.x;
  let absY = position.y;
  let currentParentId = node2.parentId;
  while (currentParentId) {
    const parent = graphNodes.find((node) => node.id === currentParentId);
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
