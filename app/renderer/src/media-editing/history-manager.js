// history-manager.js

export let HistoryManager$1 = class HistoryManager {
  undoStack = [];
  redoStack = [];
  limit;
  constructor(limit = 50) {
    this.limit = limit;
  }
  push(snapshot2) {
    this.undoStack.push(snapshot2);
    if (this.undoStack.length > this.limit) {
      this.undoStack.shift();
    }
    this.redoStack.length = 0;
  }
  /**
   * 调用前需把"当前状态"传进来作为 redoStack 的入栈值。
   * 返回 undo 后应当被采用的 shapes 数组。
   */
  undo(currentSnapshot) {
    const previous2 = this.undoStack.pop();
    if (!previous2) return null;
    this.redoStack.push(currentSnapshot);
    return previous2;
  }
  redo(currentSnapshot) {
    const next2 = this.redoStack.pop();
    if (!next2) return null;
    this.undoStack.push(currentSnapshot);
    return next2;
  }
  get canUndo() {
    return this.undoStack.length > 0;
  }
  get canRedo() {
    return this.redoStack.length > 0;
  }
  clear() {
    this.undoStack.length = 0;
    this.redoStack.length = 0;
  }
};

export const DEFAULT_STYLE = {
  stroke: "#FF3B30",
  fill: void 0,
  strokeWidth: 3,
  fontSize: 18,
  fontFamily:
    'system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif',
  fontWeight: 500,
  mosaicMode: "mosaic",
  mosaicShape: "rectangle",
  mosaicBlockSize: 12,
  mosaicBrushSize: 24,
  blurRadius: 8,
  tagBackground: "rgba(0, 0, 0, 0.6)",
  tagTextColor: "#FFFFFF",
  textVariant: "plain",
};

export function cloneShapeData(data2) {
  const cloned = {
    ...data2,
    style: {
      ...data2.style,
    },
  };
  if ("points" in cloned) {
    cloned.points = cloned.points.map((p3) => ({
      x: p3.x,
      y: p3.y,
    }));
  }
  return cloned;
}
