// draw-shape-tool.js
import { createShape } from "./arrow-shape.js";
import { Tool, uid } from "./keep-tag-in-canvas.js";

export class DrawShapeTool extends Tool {
  cursor = "crosshair";
  startPoint = null;
  workingShape = null;
  shapeType;
  constructor(editor, type2) {
    super(editor);
    this.shapeType = type2;
  }
  onPointerDown(e2) {
    if (e2.button !== 0) return;
    this.startPoint = e2.point;
    const data2 = this.buildInitialData(e2.point, this.editor.getStyle());
    this.workingShape = createShape(data2);
    this.editor.setPreviewShape(this.workingShape);
  }
  onPointerMove(e2) {
    if (!this.startPoint || !this.workingShape) return;
    this.updateShape(this.workingShape, this.startPoint, e2.point);
    this.editor.requestPreviewRender();
  }
  onPointerUp(e2) {
    if (!this.startPoint || !this.workingShape) return;
    this.updateShape(this.workingShape, this.startPoint, e2.point);
    const b3 = this.workingShape.getBounds();
    const tooSmall =
      this.shapeType === "line" || this.shapeType === "arrow"
        ? Math.hypot(
            e2.point.x - this.startPoint.x,
            e2.point.y - this.startPoint.y,
          ) < 4
        : b3.width < 4 || b3.height < 4;
    this.editor.setPreviewShape(null);
    if (!tooSmall) {
      this.editor.addShape(this.workingShape.data);
    }
    this.startPoint = null;
    this.workingShape = null;
  }
  buildInitialData(p3, style2) {
    const id2 = uid(this.shapeType);
    const baseStyle = {
      ...style2,
    };
    switch (this.shapeType) {
      case "rectangle":
        return {
          id: id2,
          type: "rectangle",
          x: p3.x,
          y: p3.y,
          width: 0,
          height: 0,
          style: baseStyle,
        };
      case "ellipse":
        return {
          id: id2,
          type: "ellipse",
          x: p3.x,
          y: p3.y,
          width: 0,
          height: 0,
          style: baseStyle,
        };
      case "line":
        return {
          id: id2,
          type: "line",
          x1: p3.x,
          y1: p3.y,
          x2: p3.x,
          y2: p3.y,
          style: baseStyle,
        };
      case "arrow":
        return {
          id: id2,
          type: "arrow",
          x1: p3.x,
          y1: p3.y,
          x2: p3.x,
          y2: p3.y,
          style: baseStyle,
        };
    }
  }
  updateShape(shape, start2, current2) {
    const data2 = shape.data;
    if (data2.type === "rectangle" || data2.type === "ellipse") {
      data2.x = Math.min(start2.x, current2.x);
      data2.y = Math.min(start2.y, current2.y);
      data2.width = Math.abs(current2.x - start2.x);
      data2.height = Math.abs(current2.y - start2.y);
    } else if (data2.type === "line" || data2.type === "arrow") {
      data2.x1 = start2.x;
      data2.y1 = start2.y;
      data2.x2 = current2.x;
      data2.y2 = current2.y;
    }
  }
}
