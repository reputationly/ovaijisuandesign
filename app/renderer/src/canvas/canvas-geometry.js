// 画布命中、拖拽和自动平移的几何留在画布目录，不再经 from-vendor 转发。


export const CanvasNodeType = {
  Image: "image",
  Video: "video",
  Audio: "audio",
  Text: "text",
  File: "file",
  Placeholder: "placeholder",
  Table: "table",
  Group: "group",
  Sticker: "sticker"
};
export const AUTO_PAN_DISTANCE = 40;
export const maskAutoPanSides = ([xMovement, yMovement], suppressed) => [suppressed.left && xMovement > 0 || suppressed.right && xMovement < 0 ? 0 : xMovement, suppressed.top && yMovement > 0 || suppressed.bottom && yMovement < 0 ? 0 : yMovement];
export function hasDraggedAncestor(node, draggedIds, nodeLookup) {
  let parentId = node.parentId;
  while (parentId) {
    if (draggedIds.has(parentId)) return true;
    parentId = nodeLookup.get(parentId)?.parentId;
  }
  return false;
}
export function getDragSnapReferenceBounds(nodeLookup, dragItems) {
  const draggedIds = new Set(dragItems.keys());
  const references = [];
  for (const [id, node] of nodeLookup) {
    const width = node.measured.width;
    const height = node.measured.height;
    if (draggedIds.has(id) || hasDraggedAncestor(node, draggedIds, nodeLookup) || node.hidden || !width || !height) {
      continue;
    }
    references.push({
      id,
      x: node.internals.positionAbsolute.x,
      y: node.internals.positionAbsolute.y,
      width,
      height,
      parentId: node.parentId,
      type: node.type,
      data: node.data
    });
  }
  return references;
}
export function getDragSnapAffectedIds(nodeLookup, dragItems) {
  const dragRootIds = new Set(dragItems.keys());
  const affectedIds = [];
  for (const [id, node] of nodeLookup) {
    if (dragRootIds.has(id) || hasDraggedAncestor(node, dragRootIds, nodeLookup)) {
      affectedIds.push(id);
    }
  }
  return affectedIds;
}
export function getDragBounds(previews) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const preview of previews) {
    minX = Math.min(minX, preview.positionAbsolute.x);
    minY = Math.min(minY, preview.positionAbsolute.y);
    maxX = Math.max(maxX, preview.positionAbsolute.x + preview.width);
    maxY = Math.max(maxY, preview.positionAbsolute.y + preview.height);
  }
  return {
    x: minX,
    y: minY,
    width: Math.max(0, maxX - minX),
    height: Math.max(0, maxY - minY)
  };
}
export function interpolateNumber(start, end) {
  return start = +start, end = +end, function (progress) {
    return start * (1 - progress) + end * progress;
  };
}
export const AUTO_PAN_ARM_SLACK = 10;
export function getNodesSelectionActiveOnPointerUp(selectionInProgress, selectedNodeCount) {
  return selectionInProgress ? selectedNodeCount >= 2 : void 0;
}
export const edgeZones = (x, y, bounds) => ({
  left: x < AUTO_PAN_DISTANCE,
  right: x > bounds.width - AUTO_PAN_DISTANCE,
  top: y < AUTO_PAN_DISTANCE,
  bottom: y > bounds.height - AUTO_PAN_DISTANCE
});
export const DEFAULT_LARGE_MOVE_FACTOR = 4;
export function getKeyboardMoveFactor({
  shiftKey,
  snapToGrid,
  snapGridShiftMultiplier
}) {
  if (!shiftKey) return 1;
  return snapToGrid ? snapGridShiftMultiplier : DEFAULT_LARGE_MOVE_FACTOR;
}
export const OVERSCAN_PX = 300;
export const RECOMPUTE_DELTA_PX = OVERSCAN_PX / 2;
export function cascadeAbsolutePosition(parentId, dx, dy, nodeLookup, parentLookup) {
  const stack = [parentId];
  while (stack.length > 0) {
    const currentId = stack.pop();
    const children = parentLookup.get(currentId);
    if (!children || children.size === 0) continue;
    for (const childId of children.keys()) {
      const childNode = nodeLookup.get(childId);
      if (!childNode) continue;
      const prev = childNode.internals.positionAbsolute;
      childNode.internals.positionAbsolute = {
        x: prev.x + dx,
        y: prev.y + dy
      };
      stack.push(childId);
    }
  }
}
export function flowPointToMiniMap(point, layout) {
  return {
    x: layout.offsetX + (point.x - layout.viewBox.x) * layout.scale,
    y: layout.offsetY + (point.y - layout.viewBox.y) * layout.scale
  };
}
export function findHitTarget(nodeLookup, dropFlow, sourceId, excludedTargets) {
  let bestId = null;
  let bestZ = Number.NEGATIVE_INFINITY;
  for (const [id, node] of nodeLookup) {
    if (id === sourceId) continue;
    if (node.type === CanvasNodeType.Group) continue;
    if (excludedTargets?.has(id)) continue;
    if (node.hidden) continue;
    const width = node.measured?.width ?? node.width ?? 0;
    const height = node.measured?.height ?? node.height ?? 0;
    if (width <= 0 || height <= 0) continue;
    const {
      x,
      y
    } = node.internals.positionAbsolute;
    if (dropFlow.x < x || dropFlow.x > x + width) continue;
    if (dropFlow.y < y || dropFlow.y > y + height) continue;
    const zIndex = node.internals.z ?? 0;
    if (zIndex >= bestZ) {
      bestZ = zIndex;
      bestId = id;
    }
  }
  return bestId;
}
