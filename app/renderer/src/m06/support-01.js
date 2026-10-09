// support-01.js
import {
  resolveStoredCanvasViewport,
  serializeCanvasViewport,
} from "./sticker-cursor-preview-content.jsx";
export function readCanvasViewport(storage, key2, options) {
  try {
    return resolveStoredCanvasViewport(storage.getItem(key2), options);
  } catch {
    return void 0;
  }
}
export function writeCanvasViewport(storage, key2, viewport, size2) {
  const serialized = serializeCanvasViewport(viewport, size2);
  if (!serialized) return;
  try {
    storage.setItem(key2, serialized);
  } catch {}
}
function intersects$1(first2, second) {
  return (
    first2.x < second.x + second.width &&
    first2.x + first2.width > second.x &&
    first2.y < second.y + second.height &&
    first2.y + first2.height > second.y
  );
}
export function resolveVisibilityPriorityFocus({
  fitAllZoom,
  minReadableZoom,
  nodeRects,
  viewportRect,
}) {
  if (nodeRects.some((rect) => intersects$1(rect, viewportRect)))
    return {
      type: "keep",
    };
  if (fitAllZoom >= minReadableZoom)
    return {
      type: "fit-all",
    };
  const viewportCenterX = viewportRect.x + viewportRect.width / 2;
  const viewportCenterY = viewportRect.y + viewportRect.height / 2;
  let nearestNodeId = nodeRects[0]?.id;
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (const rect of nodeRects) {
    const deltaX = rect.x + rect.width / 2 - viewportCenterX;
    const deltaY = rect.y + rect.height / 2 - viewportCenterY;
    const distance2 = deltaX * deltaX + deltaY * deltaY;
    if (distance2 >= nearestDistance) continue;
    nearestDistance = distance2;
    nearestNodeId = rect.id;
  }
  return nearestNodeId
    ? {
        nodeId: nearestNodeId,
        type: "focus-nearest",
      }
    : {
        type: "keep",
      };
}
