// grid-slot-layout.js
import { sizeOf } from "./use-active-mode.js";
import { nodeToRect } from "./layout-category-lanes.js";
import { CanvasMode } from "./compute-group-bounds-from-children.js";
import { DEFAULT_PLACEMENT_GAP } from "./ungroup-in-canvas.js";
import { findFreePositionForRects } from "./find-free-position-for-rects.js";
const DEFAULT_NODE_WIDTH = 350;
const MAX_COLS = 8;
function computeMaxRowWidth(nodes, gap, mode) {
  if (nodes.length === 0)
    return MAX_COLS * DEFAULT_NODE_WIDTH + (MAX_COLS - 1) * gap;
  const maxW = Math.max(...nodes.map((node) => sizeOf(node, mode).width));
  return maxW * MAX_COLS + gap * (MAX_COLS - 1);
}
export class GridSlotLayout {
  name = "grid-slot";
  compute(nodes, _edges, options) {
    if (nodes.length === 0) return new Map();
    const mode = options?.mode ?? CanvasMode.Workflow;
    const gap = options?.spacing?.x ?? DEFAULT_PLACEMENT_GAP;
    const maxRowW = computeMaxRowWidth(nodes, gap, mode);
    const positions = new Map();
    let curX = 0;
    let curY = 0;
    let colCount = 0;
    let rowMaxH = 0;
    let accW = 0;
    for (const node of nodes) {
      const sz = sizeOf(node, mode);
      if (colCount > 0) {
        const widthIfAdd = accW + gap + sz.width;
        if (colCount >= MAX_COLS || widthIfAdd > maxRowW) {
          curX = 0;
          curY += rowMaxH + gap;
          colCount = 0;
          rowMaxH = 0;
          accW = 0;
        }
      }
      positions.set(node.id, {
        x: curX,
        y: curY,
      });
      curX += sz.width + gap;
      accW += (colCount > 0 ? gap : 0) + sz.width;
      rowMaxH = Math.max(rowMaxH, sz.height);
      colCount++;
    }
    return positions;
  }
  /**
   * Row-first incremental placement.
   *
   * Adapts CanvasNode → Rect, then delegates each placement to the
   * shared `findFreePositionForRects` algorithm in @hilo/protocol.
   * Each just-placed node is appended to the occupied list so that
   * successive new nodes don't overlap each other.
   */
  computeIncremental(existingNodes, newNodes, _edges, options) {
    if (newNodes.length === 0) return new Map();
    const mode = options?.mode ?? CanvasMode.Workflow;
    const gap = options?.spacing?.x ?? DEFAULT_PLACEMENT_GAP;
    if (existingNodes.length === 0) {
      return this.compute(newNodes, [], options);
    }
    const occupied = existingNodes.map((node) => nodeToRect(node, mode));
    const result = new Map();
    for (const node of newNodes) {
      const sz = sizeOf(node, mode);
      const pos = findFreePositionForRects(occupied, sz, {
        gap,
      });
      result.set(node.id, pos);
      occupied.push({
        x: pos.x,
        y: pos.y,
        w: sz.width,
        h: sz.height,
      });
    }
    return result;
  }
}
