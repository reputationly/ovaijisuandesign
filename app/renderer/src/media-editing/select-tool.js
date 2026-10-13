// select-tool.js
import { cornerCursor, hitHandle } from "./hit-handle.js";
import { Tool } from "./keep-tag-in-canvas.js";

function computeResize(orig, corner, current) {
  let firstCornerX = orig.x;
  let firstCornerY = orig.y;
  let secondCornerX = orig.x + orig.width;
  let secondCornerY = orig.y + orig.height;
  if (corner === "nw") {
    firstCornerX = current.x;
    firstCornerY = current.y;
  } else if (corner === "ne") {
    secondCornerX = current.x;
    firstCornerY = current.y;
  } else if (corner === "sw") {
    firstCornerX = current.x;
    secondCornerY = current.y;
  } else if (corner === "se") {
    secondCornerX = current.x;
    secondCornerY = current.y;
  }
  return {
    x: Math.min(firstCornerX, secondCornerX),
    y: Math.min(firstCornerY, secondCornerY),
    width: Math.abs(secondCornerX - firstCornerX),
    height: Math.abs(secondCornerY - firstCornerY),
  };
}

export class SelectTool extends Tool {
  cursor = "default";
  mode = {
    kind: "idle",
  };
  onActivate() {
    this.editor.setCursor("default");
  }
  onPointerDown(pointerEvent) {
    if (pointerEvent.button !== 0) return;
    const selected = this.editor.getSelectedShape();
    if (selected) {
      const corner = hitHandle(
        pointerEvent.point,
        selected.getBounds(),
        this.editor.getUiScale(),
      );
      if (corner) {
        this.mode = {
          kind: "resize",
          corner,
          start: pointerEvent.point,
          original: selected.getBounds(),
        };
        this.editor.beginInteraction();
        return;
      }
      if (selected.hitTest(pointerEvent.point)) {
        this.mode = {
          kind: "move",
          start: pointerEvent.point,
          original: selected.getBounds(),
        };
        this.editor.beginInteraction();
        return;
      }
    }
    const hitShape = this.editor.findShapeAt(pointerEvent.point);
    this.editor.select(hitShape?.id ?? null);
    if (hitShape) {
      this.mode = {
        kind: "move",
        start: pointerEvent.point,
        original: hitShape.getBounds(),
      };
      this.editor.beginInteraction();
    } else {
      this.mode = {
        kind: "idle",
      };
    }
  }
  onPointerMove(pointerEvent) {
    const selected = this.editor.getSelectedShape();
    if (!selected) {
      const hitShape = this.editor.findShapeAt(pointerEvent.point);
      this.editor.setCursor(hitShape ? "move" : "default");
      return;
    }
    if (this.mode.kind === "idle") {
      const corner = hitHandle(
        pointerEvent.point,
        selected.getBounds(),
        this.editor.getUiScale(),
      );
      if (corner) {
        this.editor.setCursor(cornerCursor(corner));
      } else if (selected.hitTest(pointerEvent.point)) {
        this.editor.setCursor("move");
      } else {
        this.editor.setCursor("default");
      }
      return;
    }
    if (this.mode.kind === "move") {
      const deltaX = pointerEvent.point.x - this.mode.start.x;
      const deltaY = pointerEvent.point.y - this.mode.start.y;
      const orig = this.mode.original;
      selected.resize({
        x: orig.x + deltaX,
        y: orig.y + deltaY,
        width: orig.width,
        height: orig.height,
      });
      this.editor.requestRender();
    } else if (this.mode.kind === "resize") {
      const newBounds = computeResize(
        this.mode.original,
        this.mode.corner,
        pointerEvent.point,
      );
      selected.resize(newBounds);
      this.editor.requestRender();
    }
  }
  onPointerUp(_pointerEvent) {
    if (this.mode.kind !== "idle") {
      this.editor.commitInteraction();
    }
    this.mode = {
      kind: "idle",
    };
  }
  onKeyDown(keyboardEvent) {
    if (keyboardEvent.key === "Delete" || keyboardEvent.key === "Backspace") {
      this.editor.deleteSelected();
    } else if (keyboardEvent.key === "Escape") {
      this.editor.select(null);
    }
  }
}
