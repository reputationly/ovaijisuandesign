// control-points-for.js
import { isPluginNode } from "./separator.jsx";
const INDICATOR_MAX_AREA_RATIO = 0.04;
export function isMinimapViewportIndicatorVisible(viewportAreaRatio) {
  return (
    Number.isFinite(viewportAreaRatio) &&
    viewportAreaRatio >= 0 &&
    viewportAreaRatio <= INDICATOR_MAX_AREA_RATIO
  );
}
export function sourceHandleSide(entry, source, target) {
  if (!isPluginNode(entry)) return "right";
  if (source && target) {
    const sourceCenterX = source.x + source.width / 2;
    const targetCenterX = target.x + target.width / 2;
    return targetCenterX >= sourceCenterX ? "right" : "left";
  }
  return "left";
}
export function readNodeBox(entry) {
  if (!entry) return null;
  const pos = entry.internals?.positionAbsolute ?? entry.position;
  if (!pos) return null;
  const width = entry.measured?.width ?? entry.width ?? 0;
  const height = entry.measured?.height ?? entry.height ?? 0;
  if (width <= 0 || height <= 0) return null;
  return {
    x: pos.x,
    y: pos.y,
    width,
    height,
  };
}
function pointsForRightLeft(source, target) {
  return {
    sx: source.x + source.width,
    sy: source.y + source.height / 2,
    tx: target.x,
    ty: target.y + target.height / 2,
  };
}
export function pointsForSide(source, target, side) {
  if (side === "left") {
    return {
      sx: source.x,
      sy: source.y + source.height / 2,
      tx: target.x + target.width,
      ty: target.y + target.height / 2,
    };
  }
  return pointsForRightLeft(source, target);
}
function calcOffset(delta) {
  return delta >= 0 ? 0.5 * delta : 6.25 * Math.sqrt(-delta);
}
export function controlPointsFor(connectionPoints, side = "right") {
  if (side === "left") {
    const offset = calcOffset(connectionPoints.sx - connectionPoints.tx);
    return {
      sx: connectionPoints.sx,
      sy: connectionPoints.sy,
      cp1x: connectionPoints.sx - offset,
      cp1y: connectionPoints.sy,
      cp2x: connectionPoints.tx + offset,
      cp2y: connectionPoints.ty,
      tx: connectionPoints.tx,
      ty: connectionPoints.ty,
    };
  }
  const offset = calcOffset(connectionPoints.tx - connectionPoints.sx);
  return {
    sx: connectionPoints.sx,
    sy: connectionPoints.sy,
    cp1x: connectionPoints.sx + offset,
    cp1y: connectionPoints.sy,
    cp2x: connectionPoints.tx - offset,
    cp2y: connectionPoints.ty,
    tx: connectionPoints.tx,
    ty: connectionPoints.ty,
  };
}
export function isEdgeVisible(edge, nodeLookup, onlySelectedNodes) {
  return (
    !edge.hidden &&
    (!onlySelectedNodes ||
      nodeLookup.get(edge.source)?.selected === true ||
      nodeLookup.get(edge.target)?.selected === true)
  );
}
export const subscribers = new Set();
function notify() {
  for (const cb of subscribers) cb();
}
export let hoveredId = null;
export function setHoveredEdgeId(id) {
  if (hoveredId === id) return;
  hoveredId = id;
  notify();
}
export function clearHoveredEdgeIdIfMatches(expected) {
  if (hoveredId !== expected) return;
  hoveredId = null;
  notify();
}
