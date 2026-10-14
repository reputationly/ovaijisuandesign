// layout-category-lanes.js
import { CanvasNodeType } from "./canvas-geometry.js";
import { CanvasMode } from "./compute-group-bounds-from-children.js";
import { getNodePosition, sizeOf } from "./use-active-mode.js";
export function topoSortLevels(nodeIds, children, parents) {
  const levels = new Map();
  const inDegree = new Map();
  for (const id of nodeIds) {
    inDegree.set(id, parents.get(id)?.length ?? 0);
  }
  const queue = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) {
      queue.push(id);
      levels.set(id, 0);
    }
  }
  let idx = 0;
  while (idx < queue.length) {
    const current = queue[idx++];
    const currentLevel = levels.get(current) ?? 0;
    for (const child of children.get(current) ?? []) {
      const newLevel = currentLevel + 1;
      levels.set(child, Math.max(levels.get(child) ?? 0, newLevel));
      const remaining = (inDegree.get(child) ?? 0) - 1;
      inDegree.set(child, remaining);
      if (remaining === 0) {
        queue.push(child);
      }
    }
  }
  for (const id of nodeIds) {
    if (!levels.has(id)) levels.set(id, 0);
  }
  return levels;
}
export function buildAdjacency(nodeIds, edges) {
  const children = new Map();
  const parents = new Map();
  for (const id of nodeIds) {
    children.set(id, []);
    parents.set(id, []);
  }
  for (const edge of edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) continue;
    children.get(edge.source)?.push(edge.target);
    parents.get(edge.target)?.push(edge.source);
  }
  return {
    children,
    parents,
  };
}
export const COLLISION_MARGIN = 40;
export function rectsOverlap(rectA, rectB, margin = COLLISION_MARGIN) {
  return (
    rectA.x < rectB.x + rectB.w + margin &&
    rectB.x < rectA.x + rectA.w + margin &&
    rectA.y < rectB.y + rectB.h + margin &&
    rectB.y < rectA.y + rectA.h + margin
  );
}
export function nodeToRect(node, mode) {
  const resolvedMode = mode ?? CanvasMode.Workflow;
  const sz = sizeOf(node, resolvedMode);
  const pos = getNodePosition(node, resolvedMode);
  return {
    x: pos.x,
    y: pos.y,
    w: sz.width,
    h: sz.height,
  };
}
const CATEGORY_LANE_ORDER = [
  CanvasNodeType.Image,
  CanvasNodeType.Video,
  CanvasNodeType.Audio,
  CanvasNodeType.Text,
  CanvasNodeType.File,
  CanvasNodeType.Table,
  // Groups are opaque containers that may mix types internally — they get
  // their own lane rather than being torn open.
  CanvasNodeType.Group,
  // Still-generating slots sit last so that, once they resolve into a real
  // asset, the finished node moves to its type lane instead of shuffling the
  // whole board.
  CanvasNodeType.Placeholder,
];
const OTHER_CATEGORY_LANE = "other";
const LANE_RANK = new Map(
  CATEGORY_LANE_ORDER.map((category, index) => [category, index]),
);
function resolveCategoryLane(nodeType) {
  return LANE_RANK.has(nodeType) ? nodeType : OTHER_CATEGORY_LANE;
}
const DEFAULT_ITEM_GAP = 100;
const DEFAULT_LANE_GAP_RATIO = 2.5;
const DEFAULT_MAX_COLS = 8;
export function layoutCategoryLanes(items, options) {
  const positions = new Map();
  if (items.length === 0) return positions;
  const itemGap = DEFAULT_ITEM_GAP;
  const laneGap = Math.round(itemGap * DEFAULT_LANE_GAP_RATIO);
  const maxCols = Math.max(1, DEFAULT_MAX_COLS);
  const buckets = new Map();
  for (const item of items) {
    const lane = resolveCategoryLane(item.type);
    const bucket = buckets.get(lane);
    if (bucket) bucket.push(item);
    else buckets.set(lane, [item]);
  }
  const orderedLanes = [...buckets.keys()].sort(
    (firstLane, secondLane) =>
      (LANE_RANK.get(firstLane) ?? CATEGORY_LANE_ORDER.length) -
      (LANE_RANK.get(secondLane) ?? CATEGORY_LANE_ORDER.length),
  );
  let laneTop = 0;
  for (const lane of orderedLanes) {
    const bucket = buckets.get(lane);
    if (!bucket || bucket.length === 0) continue;
    const cols = Math.min(maxCols, bucket.length);
    const rows = Math.ceil(bucket.length / cols);
    const colWidths = new Array(cols).fill(0);
    const rowHeights = new Array(rows).fill(0);
    bucket.forEach((item, index) => {
      const columnIndex = index % cols;
      const rowIndex = Math.floor(index / cols);
      if (item.width > colWidths[columnIndex]) colWidths[columnIndex] = item.width;
      if (item.height > rowHeights[rowIndex]) rowHeights[rowIndex] = item.height;
    });
    const colX = new Array(cols).fill(0);
    for (let columnIndex = 1; columnIndex < cols; columnIndex++)
      colX[columnIndex] = colX[columnIndex - 1] + colWidths[columnIndex - 1] + itemGap;
    const rowY = new Array(rows).fill(0);
    for (let rowIndex = 1; rowIndex < rows; rowIndex++)
      rowY[rowIndex] = rowY[rowIndex - 1] + rowHeights[rowIndex - 1] + itemGap;
    bucket.forEach((item, index) => {
      const columnIndex = index % cols;
      const rowIndex = Math.floor(index / cols);
      positions.set(item.id, {
        x: colX[columnIndex],
        y: laneTop + rowY[rowIndex],
      });
    });
    laneTop += rowY[rows - 1] + rowHeights[rows - 1] + laneGap;
  }
  return positions;
}
