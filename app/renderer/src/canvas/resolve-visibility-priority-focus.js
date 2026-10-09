// resolve-visibility-priority-focus.js
import {
  CANVAS_VIEWPORT_STORAGE_VERSION,
  hasValidViewportSize,
  isFiniteNumber,
} from "./resolve-canvas-focus-targets.js";
function parseCanvasViewportSnapshot(serialized) {
  let value;
  try {
    value = JSON.parse(serialized);
  } catch {
    return void 0;
  }
  if (typeof value !== "object" || value === null) return void 0;
  const candidate = value;
  if (
    candidate.version !== CANVAS_VIEWPORT_STORAGE_VERSION ||
    !isFiniteNumber(candidate.centerX) ||
    !isFiniteNumber(candidate.centerY) ||
    !isFiniteNumber(candidate.zoom) ||
    candidate.zoom <= 0
  ) {
    return void 0;
  }
  return {
    version: CANVAS_VIEWPORT_STORAGE_VERSION,
    centerX: candidate.centerX,
    centerY: candidate.centerY,
    zoom: candidate.zoom,
  };
}
function serializeCanvasViewport(viewport, size2) {
  if (
    !hasValidViewportSize(size2) ||
    !isFiniteNumber(viewport.x) ||
    !isFiniteNumber(viewport.y) ||
    !isFiniteNumber(viewport.zoom) ||
    viewport.zoom <= 0
  ) {
    return void 0;
  }
  const centerX = (size2.width / 2 - viewport.x) / viewport.zoom;
  const centerY = (size2.height / 2 - viewport.y) / viewport.zoom;
  if (!Number.isFinite(centerX) || !Number.isFinite(centerY)) return void 0;
  const snapshot2 = {
    version: CANVAS_VIEWPORT_STORAGE_VERSION,
    centerX,
    centerY,
    zoom: viewport.zoom,
  };
  return JSON.stringify(snapshot2);
}
function resolveStoredCanvasViewport(
  serialized,
  { width, height, minZoom, maxZoom },
) {
  if (
    !serialized ||
    !hasValidViewportSize({
      width,
      height,
    }) ||
    !Number.isFinite(minZoom) ||
    !Number.isFinite(maxZoom) ||
    minZoom <= 0 ||
    maxZoom < minZoom
  ) {
    return void 0;
  }
  const snapshot2 = parseCanvasViewportSnapshot(serialized);
  if (!snapshot2) return void 0;
  const zoom2 = Math.min(maxZoom, Math.max(minZoom, snapshot2.zoom));
  const x2 = width / 2 - snapshot2.centerX * zoom2;
  const y4 = height / 2 - snapshot2.centerY * zoom2;
  if (!Number.isFinite(x2) || !Number.isFinite(y4)) return void 0;
  return {
    x: x2,
    y: y4,
    zoom: zoom2,
  };
}
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
function intersects(first2, second) {
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
  if (nodeRects.some((rect) => intersects(rect, viewportRect)))
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
