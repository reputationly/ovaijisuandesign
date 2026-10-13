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
function serializeCanvasViewport(viewport, size) {
  if (
    !hasValidViewportSize(size) ||
    !isFiniteNumber(viewport.x) ||
    !isFiniteNumber(viewport.y) ||
    !isFiniteNumber(viewport.zoom) ||
    viewport.zoom <= 0
  ) {
    return void 0;
  }
  const centerX = (size.width / 2 - viewport.x) / viewport.zoom;
  const centerY = (size.height / 2 - viewport.y) / viewport.zoom;
  if (!Number.isFinite(centerX) || !Number.isFinite(centerY)) return void 0;
  const snapshot = {
    version: CANVAS_VIEWPORT_STORAGE_VERSION,
    centerX,
    centerY,
    zoom: viewport.zoom,
  };
  return JSON.stringify(snapshot);
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
  const snapshot = parseCanvasViewportSnapshot(serialized);
  if (!snapshot) return void 0;
  const zoom = Math.min(maxZoom, Math.max(minZoom, snapshot.zoom));
  const viewportX = width / 2 - snapshot.centerX * zoom;
  const viewportY = height / 2 - snapshot.centerY * zoom;
  if (!Number.isFinite(viewportX) || !Number.isFinite(viewportY)) return void 0;
  return {
    x: viewportX,
    y: viewportY,
    zoom,
  };
}
export function readCanvasViewport(storage, key, options) {
  try {
    return resolveStoredCanvasViewport(storage.getItem(key), options);
  } catch {
    return void 0;
  }
}
export function writeCanvasViewport(storage, key, viewport, size) {
  const serialized = serializeCanvasViewport(viewport, size);
  if (!serialized) return;
  try {
    storage.setItem(key, serialized);
  } catch {}
}
function intersects(first, second) {
  return (
    first.x < second.x + second.width &&
    first.x + first.width > second.x &&
    first.y < second.y + second.height &&
    first.y + first.height > second.y
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
    const distance = deltaX * deltaX + deltaY * deltaY;
    if (distance >= nearestDistance) continue;
    nearestDistance = distance;
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
