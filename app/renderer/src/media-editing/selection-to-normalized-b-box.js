// selection-to-normalized-b-box.js

export function isEditableTarget(target) {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable;
}
export function selectionToNormalizedBBox(rect) {
  const toNormalizedCoordinate = (value) => Math.max(0, Math.min(999, Math.round(value * 999)));
  return {
    x1: toNormalizedCoordinate(Math.min(rect.x1, rect.x2)),
    y1: toNormalizedCoordinate(Math.min(rect.y1, rect.y2)),
    x2: toNormalizedCoordinate(Math.max(rect.x1, rect.x2)),
    y2: toNormalizedCoordinate(Math.max(rect.y1, rect.y2)),
  };
}
