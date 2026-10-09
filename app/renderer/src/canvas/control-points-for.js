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

function calcOffset$1(d2) {
  return d2 >= 0 ? 0.5 * d2 : 6.25 * Math.sqrt(-d2);
}

export function controlPointsFor(p3, side = "right") {
  if (side === "left") {
    const offset22 = calcOffset$1(p3.sx - p3.tx);
    return {
      sx: p3.sx,
      sy: p3.sy,
      cp1x: p3.sx - offset22,
      cp1y: p3.sy,
      cp2x: p3.tx + offset22,
      cp2y: p3.ty,
      tx: p3.tx,
      ty: p3.ty,
    };
  }
  const offset2 = calcOffset$1(p3.tx - p3.sx);
  return {
    sx: p3.sx,
    sy: p3.sy,
    cp1x: p3.sx + offset2,
    cp1y: p3.sy,
    cp2x: p3.tx - offset2,
    cp2y: p3.ty,
    tx: p3.tx,
    ty: p3.ty,
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

function notify$1() {
  for (const cb of subscribers) cb();
}

export let hoveredId = null;

export function setHoveredEdgeId(id2) {
  if (hoveredId === id2) return;
  hoveredId = id2;
  notify$1();
}

export function clearHoveredEdgeIdIfMatches(expected) {
  if (hoveredId !== expected) return;
  hoveredId = null;
  notify$1();
}
