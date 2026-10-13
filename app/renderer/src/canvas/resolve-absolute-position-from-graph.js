// resolve-absolute-position-from-graph.js

export function resolveAbsolutePositionFromGraph(targetNode, mode, graphNodes) {
  const pos = targetNode.positions?.[mode];
  if (!pos) return void 0;
  if (!targetNode.parentId) return pos;
  let absX = pos.x;
  let absY = pos.y;
  let currentParentId = targetNode.parentId;
  while (currentParentId) {
    const parent = graphNodes.find((node) => node.id === currentParentId);
    if (!parent) break;
    const parentPos = parent.positions?.[mode];
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
