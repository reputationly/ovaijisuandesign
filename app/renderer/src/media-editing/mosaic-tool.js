// mosaic-tool.js
import { MosaicShape } from "./mosaic-shape.js";
import { RectangleShape, Tool, uid } from "./keep-tag-in-canvas.js";

function pickStrength(style2, mode2) {
  if (mode2 === "blur") return Math.max(1, style2.blurRadius ?? 8);
  return Math.max(1, style2.mosaicBlockSize ?? 12);
}

export class MosaicTool extends Tool {
  cursor = "crosshair";
  // 矩形拖拽态
  start = null;
  previewRect = null;
  // 笔刷态
  working = null;
  onPointerDown(e2) {
    if (e2.button !== 0) return;
    const style2 = this.editor.getStyle();
    if ((style2.mosaicShape ?? "rectangle") === "brush") {
      this.startBrush(e2.point, style2);
    } else {
      this.startRect(e2.point);
    }
  }
  onPointerMove(e2) {
    if (this.working) {
      this.working.addPoint(e2.point);
      this.editor.requestPreviewRender();
      return;
    }
    if (this.start && this.previewRect) {
      const x2 = Math.min(this.start.x, e2.point.x);
      const y4 = Math.min(this.start.y, e2.point.y);
      const width = Math.abs(e2.point.x - this.start.x);
      const height = Math.abs(e2.point.y - this.start.y);
      this.previewRect.data.x = x2;
      this.previewRect.data.y = y4;
      this.previewRect.data.width = width;
      this.previewRect.data.height = height;
      this.editor.requestPreviewRender();
    }
  }
  onPointerUp(e2) {
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
      const x2 = Math.min(this.start.x, e2.point.x);
      const y4 = Math.min(this.start.y, e2.point.y);
      const width = Math.abs(e2.point.x - this.start.x);
      const height = Math.abs(e2.point.y - this.start.y);
      this.editor.setPreviewShape(null);
      this.previewRect = null;
      this.start = null;
      if (width < 4 || height < 4) return;
      const style2 = this.editor.getStyle();
      const mode2 = style2.mosaicMode ?? "mosaic";
      const shape = new MosaicShape({
        id: uid("mosaic"),
        type: "mosaic",
        shape: "rectangle",
        x: x2,
        y: y4,
        width,
        height,
        mode: mode2,
        strength: pickStrength(style2, mode2),
        style: {
          ...style2,
        },
      });
      this.editor.addShapeInstance(shape);
    }
  }
  // ---------- 内部 ----------
  startRect(point2) {
    this.start = point2;
    this.previewRect = new RectangleShape({
      id: "preview",
      type: "rectangle",
      x: point2.x,
      y: point2.y,
      width: 0,
      height: 0,
      style: {
        stroke: "#3370FF",
        strokeWidth: 1,
      },
    });
    this.editor.setPreviewShape(this.previewRect);
  }
  startBrush(point2, style2) {
    const mode2 = style2.mosaicMode ?? "mosaic";
    const brushSize = Math.max(2, style2.mosaicBrushSize ?? 24);
    const shape = new MosaicShape({
      id: uid("mosaic"),
      type: "mosaic",
      shape: "brush",
      points: [point2],
      brushSize,
      mode: mode2,
      strength: pickStrength(style2, mode2),
      style: {
        ...style2,
      },
    });
    this.working = shape;
    this.editor.setPreviewShape(shape);
  }
}
