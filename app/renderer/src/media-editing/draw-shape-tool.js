// draw-shape-tool.js
import { createShape } from "./arrow-shape.js";
import { Tool, uid as createUniqueId } from "./keep-tag-in-canvas.js";

export class DrawShapeTool extends Tool {
  cursor = "crosshair";
  startPoint = null;
  workingShape = null;
  shapeType;
  constructor(editor, type) {
    super(editor);
    this.shapeType = type;
  }
  onPointerDown(pointerEvent) {
    if (pointerEvent.button !== 0) return;
    this.startPoint = pointerEvent.point;
    const data = this.buildInitialData(pointerEvent.point, this.editor.getStyle());
    this.workingShape = createShape(data);
    this.editor.setPreviewShape(this.workingShape);
  }
  onPointerMove(pointerEvent) {
    if (!this.startPoint || !this.workingShape) return;
    this.updateShape(this.workingShape, this.startPoint, pointerEvent.point);
    this.editor.requestPreviewRender();
  }
  onPointerUp(pointerEvent) {
    if (!this.startPoint || !this.workingShape) return;
    this.updateShape(this.workingShape, this.startPoint, pointerEvent.point);
    const shapeBounds = this.workingShape.getBounds();
    const tooSmall =
      this.shapeType === "line" || this.shapeType === "arrow"
        ? Math.hypot(
            pointerEvent.point.x - this.startPoint.x,
            pointerEvent.point.y - this.startPoint.y,
          ) < 4
        : shapeBounds.width < 4 || shapeBounds.height < 4;
    this.editor.setPreviewShape(null);
    if (!tooSmall) {
      this.editor.addShape(this.workingShape.data);
    }
    this.startPoint = null;
    this.workingShape = null;
  }
  buildInitialData(initialPoint, style) {
    const shapeId = createUniqueId(this.shapeType);
    const baseStyle = {
      ...style,
    };
    switch (this.shapeType) {
      case "rectangle":
        return {
          id: shapeId,
          type: "rectangle",
          x: initialPoint.x,
          y: initialPoint.y,
          width: 0,
          height: 0,
          style: baseStyle,
        };
      case "ellipse":
        return {
          id: shapeId,
          type: "ellipse",
          x: initialPoint.x,
          y: initialPoint.y,
          width: 0,
          height: 0,
          style: baseStyle,
        };
      case "line":
        return {
          id: shapeId,
          type: "line",
          x1: initialPoint.x,
          y1: initialPoint.y,
          x2: initialPoint.x,
          y2: initialPoint.y,
          style: baseStyle,
        };
      case "arrow":
        return {
          id: shapeId,
          type: "arrow",
          x1: initialPoint.x,
          y1: initialPoint.y,
          x2: initialPoint.x,
          y2: initialPoint.y,
          style: baseStyle,
        };
    }
  }
  updateShape(shape, start, current) {
    const data = shape.data;
    if (data.type === "rectangle" || data.type === "ellipse") {
      data.x = Math.min(start.x, current.x);
      data.y = Math.min(start.y, current.y);
      data.width = Math.abs(current.x - start.x);
      data.height = Math.abs(current.y - start.y);
    } else if (data.type === "line" || data.type === "arrow") {
      data.x1 = start.x;
      data.y1 = start.y;
      data.x2 = current.x;
      data.y2 = current.y;
    }
  }
}
