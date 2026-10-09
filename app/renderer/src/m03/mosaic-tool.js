// mosaic-tool.js
import {
  MosaicShape,
  RectangleShape,
  TAG_DEFAULT_FONT_SIZE,
  TagShape,
  Tool,
  placeCardForAnchor,
  uid,
} from "./mosaic-shape.js";
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
function pickStrength(style2, mode2) {
  if (mode2 === "blur") return Math.max(1, style2.blurRadius ?? 8);
  return Math.max(1, style2.mosaicBlockSize ?? 12);
}
const HANDLE_SIZE$1 = 8;
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
      const corner = hitHandle(e2.point, selected2.getBounds(), this.editor.getUiScale());
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
      const corner = hitHandle(e2.point, selected2.getBounds(), this.editor.getUiScale());
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
      const newBounds = computeResize(this.mode.original, this.mode.corner, e2.point);
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
export function hitHandle(p3, b3, uiScale = 1) {
  const half = uiScale > 0 ? HANDLE_SIZE$1 / uiScale : HANDLE_SIZE$1;
  const corners = [
    {
      c: "nw",
      x: b3.x,
      y: b3.y,
    },
    {
      c: "ne",
      x: b3.x + b3.width,
      y: b3.y,
    },
    {
      c: "sw",
      x: b3.x,
      y: b3.y + b3.height,
    },
    {
      c: "se",
      x: b3.x + b3.width,
      y: b3.y + b3.height,
    },
  ];
  for (const { c: c3, x: x2, y: y4 } of corners) {
    if (Math.abs(p3.x - x2) <= half && Math.abs(p3.y - y4) <= half) return c3;
  }
  return null;
}
export function cornerCursor(c3) {
  return c3 === "nw" || c3 === "se" ? "nwse-resize" : "nesw-resize";
}
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
export function drawSelectionHandles(ctx, b3, uiScale = 1, style2) {
  const positions = [
    {
      x: b3.x,
      y: b3.y,
    },
    {
      x: b3.x + b3.width,
      y: b3.y,
    },
    {
      x: b3.x,
      y: b3.y + b3.height,
    },
    {
      x: b3.x + b3.width,
      y: b3.y + b3.height,
    },
  ];
  const size2 = uiScale > 0 ? HANDLE_SIZE$1 / uiScale : HANDLE_SIZE$1;
  const stroke = uiScale > 0 ? 1.5 / uiScale : 1.5;
  ctx.save();
  ctx.fillStyle = style2?.selectionHandleFill ?? "#FFFFFF";
  ctx.strokeStyle = style2?.selectionHandleStroke ?? style2?.selectionStroke ?? "#3370FF";
  ctx.lineWidth = stroke;
  for (const p3 of positions) {
    ctx.beginPath();
    ctx.rect(p3.x - size2 / 2, p3.y - size2 / 2, size2, size2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}
const MIN_DRAG_DISTANCE = 8;
const PLACEHOLDER_WIDTH = 44;
const PLACEHOLDER_HEIGHT = 26;
export class TagTool extends Tool {
  cursor = "crosshair";
  anchor = null;
  workingShape = null;
  constructor(editor) {
    super(editor);
  }
  onPointerDown(e2) {
    if (e2.button !== 0) return;
    this.anchor = e2.point;
    const data2 = this.buildInitialData(e2.point, this.editor.getStyle());
    this.workingShape = new TagShape(data2);
    this.placeCardOnSide("right");
    this.editor.setPreviewShape(this.workingShape);
  }
  onPointerMove(e2) {
    if (!this.anchor || !this.workingShape) return;
    const dx = e2.point.x - this.anchor.x;
    const dy = e2.point.y - this.anchor.y;
    const dist2 = Math.hypot(dx, dy);
    if (dist2 >= MIN_DRAG_DISTANCE) {
      let cardSide;
      if (Math.abs(dx) >= Math.abs(dy)) {
        cardSide = dx >= 0 ? "right" : "left";
      } else {
        cardSide = dy >= 0 ? "bottom" : "top";
      }
      this.placeCardOnSide(cardSide);
    }
    this.editor.requestPreviewRender();
  }
  onPointerUp(_e2) {
    if (!this.anchor || !this.workingShape) return;
    const data2 = this.workingShape.data;
    const shape = this.workingShape;
    this.editor.setPreviewShape(null);
    this.workingShape = null;
    this.anchor = null;
    this.editor.beginInteraction();
    this.editor.addShapeInstanceWithoutHistory(shape);
    this.editor.openTagTextEditor(data2.id);
  }
  /**
   * 把 working shape 的卡片摆到 anchor 的指定侧紧贴。
   * anchor 保持在落点位置不变 —— Tag.draw 内部会推断 inferSide 并校正紧贴，
   * 落点本身就在校正后的精确位置上，因此不需要在这里二次计算 anchor。
   */
  placeCardOnSide(cardSide) {
    if (!this.workingShape || !this.anchor) return;
    const data2 = this.workingShape.data;
    const pos = placeCardForAnchor(this.anchor, cardSide, data2.width, data2.height);
    data2.x = pos.x;
    data2.y = pos.y;
    data2.anchorX = this.anchor.x;
    data2.anchorY = this.anchor.y;
  }
  buildInitialData(anchor, style2) {
    return {
      id: uid("tag"),
      type: "tag",
      anchorX: anchor.x,
      anchorY: anchor.y,
      // x/y 会被 placeCardOnSide 覆盖，这里给个占位
      x: anchor.x,
      y: anchor.y,
      width: PLACEHOLDER_WIDTH,
      height: PLACEHOLDER_HEIGHT,
      text: "",
      // tag 字号沿用 editor 当前 style.fontSize（toolbar 的字号下拉），
      // 仅在未设置时回退到 TAG_DEFAULT_FONT_SIZE
      style: {
        ...style2,
        fontSize: style2.fontSize ?? TAG_DEFAULT_FONT_SIZE,
      },
    };
  }
}
export class TextTool extends Tool {
  cursor = "text";
  onPointerDown(e2) {
    if (e2.button !== 0) return;
    this.editor.openTextEditor(e2.point);
  }
}
export function buildTextShapeData(point2, text2, style2) {
  return {
    id: uid("text"),
    type: "text",
    x: point2.x,
    y: point2.y,
    text: text2,
    width: 0,
    height: 0,
    style: {
      ...style2,
    },
  };
}
export class EventBus {
  listeners = new Map();
  on(type2, handler) {
    let set2 = this.listeners.get(type2);
    if (!set2) {
      set2 = new Set();
      this.listeners.set(type2, set2);
    }
    set2.add(handler);
    return () => this.off(type2, handler);
  }
  off(type2, handler) {
    this.listeners.get(type2)?.delete(handler);
  }
  emit(type2, payload) {
    const set2 = this.listeners.get(type2);
    if (!set2) return;
    for (const h2 of Array.from(set2)) {
      try {
        h2(payload);
      } catch (e2) {
        console.error("[EventBus] handler error", e2);
      }
    }
  }
  clear() {
    this.listeners.clear();
  }
}
