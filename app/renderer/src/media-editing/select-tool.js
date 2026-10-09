// select-tool.js
import { cornerCursor, hitHandle } from "./hit-handle.js";
import { Tool } from "./keep-tag-in-canvas.js";

function computeResize(orig, corner, current2) {
  let x1 = orig.x;
  let y1 = orig.y;
  let x2 = orig.x + orig.width;
  let y22 = orig.y + orig.height;
  if (corner === "nw") {
    x1 = current2.x;
    y1 = current2.y;
  } else if (corner === "ne") {
    x2 = current2.x;
    y1 = current2.y;
  } else if (corner === "sw") {
    x1 = current2.x;
    y22 = current2.y;
  } else if (corner === "se") {
    x2 = current2.x;
    y22 = current2.y;
  }
  return {
    x: Math.min(x1, x2),
    y: Math.min(y1, y22),
    width: Math.abs(x2 - x1),
    height: Math.abs(y22 - y1),
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
  onPointerDown(e2) {
    if (e2.button !== 0) return;
    const selected2 = this.editor.getSelectedShape();
    if (selected2) {
      const corner = hitHandle(
        e2.point,
        selected2.getBounds(),
        this.editor.getUiScale(),
      );
      if (corner) {
        this.mode = {
          kind: "resize",
          corner,
          start: e2.point,
          original: selected2.getBounds(),
        };
        this.editor.beginInteraction();
        return;
      }
      if (selected2.hitTest(e2.point)) {
        this.mode = {
          kind: "move",
          start: e2.point,
          original: selected2.getBounds(),
        };
        this.editor.beginInteraction();
        return;
      }
    }
    const hit = this.editor.findShapeAt(e2.point);
    this.editor.select(hit?.id ?? null);
    if (hit) {
      this.mode = {
        kind: "move",
        start: e2.point,
        original: hit.getBounds(),
      };
      this.editor.beginInteraction();
    } else {
      this.mode = {
        kind: "idle",
      };
    }
  }
  onPointerMove(e2) {
    const selected2 = this.editor.getSelectedShape();
    if (!selected2) {
      const hit = this.editor.findShapeAt(e2.point);
      this.editor.setCursor(hit ? "move" : "default");
      return;
    }
    if (this.mode.kind === "idle") {
      const corner = hitHandle(
        e2.point,
        selected2.getBounds(),
        this.editor.getUiScale(),
      );
      if (corner) {
        this.editor.setCursor(cornerCursor(corner));
      } else if (selected2.hitTest(e2.point)) {
        this.editor.setCursor("move");
      } else {
        this.editor.setCursor("default");
      }
      return;
    }
    if (this.mode.kind === "move") {
      const dx = e2.point.x - this.mode.start.x;
      const dy = e2.point.y - this.mode.start.y;
      const orig = this.mode.original;
      selected2.resize({
        x: orig.x + dx,
        y: orig.y + dy,
        width: orig.width,
        height: orig.height,
      });
      this.editor.requestRender();
    } else if (this.mode.kind === "resize") {
      const newBounds = computeResize(
        this.mode.original,
        this.mode.corner,
        e2.point,
      );
      selected2.resize(newBounds);
      this.editor.requestRender();
    }
  }
  onPointerUp(_e2) {
    if (this.mode.kind !== "idle") {
      this.editor.commitInteraction();
    }
    this.mode = {
      kind: "idle",
    };
  }
  onKeyDown(e2) {
    if (e2.key === "Delete" || e2.key === "Backspace") {
      this.editor.deleteSelected();
    } else if (e2.key === "Escape") {
      this.editor.select(null);
    }
  }
}
