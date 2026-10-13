// mosaic-tool.js
import { MosaicShape } from "./mosaic-shape.js";
import { RectangleShape, Tool, uid as createUniqueId } from "./keep-tag-in-canvas.js";

function pickStrength(style, mode) {
  if (mode === "blur") return Math.max(1, style.blurRadius ?? 8);
  return Math.max(1, style.mosaicBlockSize ?? 12);
}

export class MosaicTool extends Tool {
  cursor = "crosshair";
  // 矩形拖拽态
  start = null;
  previewRect = null;
  // 笔刷态
  working = null;
  onPointerDown(pointerEvent) {
    if (pointerEvent.button !== 0) return;
    const style = this.editor.getStyle();
    if ((style.mosaicShape ?? "rectangle") === "brush") {
      this.startBrush(pointerEvent.point, style);
    } else {
      this.startRect(pointerEvent.point);
    }
  }
  onPointerMove(pointerEvent) {
    if (this.working) {
      this.working.addPoint(pointerEvent.point);
      this.editor.requestPreviewRender();
      return;
    }
    if (this.start && this.previewRect) {
      const minX = Math.min(this.start.x, pointerEvent.point.x);
      const minY = Math.min(this.start.y, pointerEvent.point.y);
      const width = Math.abs(pointerEvent.point.x - this.start.x);
      const height = Math.abs(pointerEvent.point.y - this.start.y);
      this.previewRect.data.x = minX;
      this.previewRect.data.y = minY;
      this.previewRect.data.width = width;
      this.previewRect.data.height = height;
      this.editor.requestPreviewRender();
    }
  }
  onPointerUp(pointerEvent) {
    if (this.working) {
      const shape = this.working;
      this.working = null;
      this.editor.setPreviewShape(null);
      if (shape.data.shape === "brush" && shape.data.points.length > 0) {
        this.editor.addShapeInstance(shape);
      }
      return;
    }
    if (this.start) {
      const minX = Math.min(this.start.x, pointerEvent.point.x);
      const minY = Math.min(this.start.y, pointerEvent.point.y);
      const width = Math.abs(pointerEvent.point.x - this.start.x);
      const height = Math.abs(pointerEvent.point.y - this.start.y);
      this.editor.setPreviewShape(null);
      this.previewRect = null;
      this.start = null;
      if (width < 4 || height < 4) return;
      const style = this.editor.getStyle();
      const mode = style.mosaicMode ?? "mosaic";
      const shape = new MosaicShape({
        id: createUniqueId("mosaic"),
        type: "mosaic",
        shape: "rectangle",
        x: minX,
        y: minY,
        width,
        height,
        mode,
        strength: pickStrength(style, mode),
        style: {
          ...style,
        },
      });
      this.editor.addShapeInstance(shape);
    }
  }
  // ---------- 内部 ----------
  startRect(point) {
    this.start = point;
    this.previewRect = new RectangleShape({
      id: "preview",
      type: "rectangle",
      x: point.x,
      y: point.y,
      width: 0,
      height: 0,
      style: {
        stroke: "#3370FF",
        strokeWidth: 1,
      },
    });
    this.editor.setPreviewShape(this.previewRect);
  }
  startBrush(point, style) {
    const mode = style.mosaicMode ?? "mosaic";
    const brushSize = Math.max(2, style.mosaicBrushSize ?? 24);
    const shape = new MosaicShape({
      id: createUniqueId("mosaic"),
      type: "mosaic",
      shape: "brush",
      points: [point],
      brushSize,
      mode,
      strength: pickStrength(style, mode),
      style: {
        ...style,
      },
    });
    this.working = shape;
    this.editor.setPreviewShape(shape);
  }
}
