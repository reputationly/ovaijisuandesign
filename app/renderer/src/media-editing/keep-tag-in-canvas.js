// keep-tag-in-canvas.js
import { FreePathShape, pointInBounds, Shape } from "./free-path-shape.js";

export function createOffscreen(width, height) {
  const c3 = document.createElement("canvas");
  c3.width = width;
  c3.height = height;
  return c3;
}

function loadImageWith(src, crossOrigin) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (crossOrigin !== null) img.crossOrigin = crossOrigin;
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

export function loadImage$4(src) {
  return loadImageWith(src, "anonymous").catch(() => loadImageWith(src, null));
}

export class RectangleShape extends Shape {
  draw(ctx) {
    const { x: x2, y: y4, width, height, style: style2 } = this.data;
    if (width === 0 || height === 0) return;
    ctx.save();
    ctx.lineWidth = style2.strokeWidth;
    ctx.strokeStyle = style2.stroke;
    if (style2.fill) {
      ctx.fillStyle = style2.fill;
      ctx.fillRect(x2, y4, width, height);
    }
    ctx.strokeRect(x2, y4, width, height);
    ctx.restore();
  }
  hitTest(p3) {
    const padding = Math.max(8, this.data.style.strokeWidth);
    const b3 = this.getBounds();
    if (this.data.style.fill) return pointInBounds(p3, b3, padding);
    const outer = pointInBounds(p3, b3, padding);
    const inner = pointInBounds(p3, b3, -padding);
    return outer && !inner;
  }
  getBounds() {
    const { x: x2, y: y4, width, height } = this.data;
    return {
      x: width >= 0 ? x2 : x2 + width,
      y: height >= 0 ? y4 : y4 + height,
      width: Math.abs(width),
      height: Math.abs(height),
    };
  }
  move(dx, dy) {
    this.data.x += dx;
    this.data.y += dy;
  }
  resize(b3) {
    this.data.x = b3.x;
    this.data.y = b3.y;
    this.data.width = b3.width;
    this.data.height = b3.height;
  }
}

export const ANCHOR_RADIUS = 2.5;

export const ANCHOR_GAP = 1;

export const PADDING_X = 6;

export const PADDING_Y = 2;

export const POINTER_HEIGHT = 4;

export const DEFAULT_FONT_SIZE = 13;

export const TAG_ANCHOR_OFFSET = POINTER_HEIGHT + ANCHOR_GAP + ANCHOR_RADIUS;

export const TAG_PADDING_X = PADDING_X;

export const TAG_PADDING_Y = PADDING_Y;

export const TAG_DEFAULT_FONT_SIZE = DEFAULT_FONT_SIZE;

export function placeCardForAnchor(anchor, side, cardW, cardH) {
  if (side === "left") {
    return {
      x: anchor.x - TAG_ANCHOR_OFFSET - cardW,
      y: anchor.y - cardH / 2,
    };
  }
  if (side === "right") {
    return {
      x: anchor.x + TAG_ANCHOR_OFFSET,
      y: anchor.y - cardH / 2,
    };
  }
  if (side === "top") {
    return {
      x: anchor.x - cardW / 2,
      y: anchor.y - TAG_ANCHOR_OFFSET - cardH,
    };
  }
  return {
    x: anchor.x - cardW / 2,
    y: anchor.y + TAG_ANCHOR_OFFSET,
  };
}

export function inferSide(card, ax, ay) {
  const cx2 = card.x + card.w / 2;
  const cy = card.y + card.h / 2;
  const dx = ax - cx2;
  const dy = ay - cy;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx < 0 ? "left" : "right";
  }
  return dy < 0 ? "top" : "bottom";
}

export function keepTagInCanvas(data2, canvasWidth, canvasHeight) {
  if (canvasWidth <= 0 || canvasHeight <= 0) return false;
  const margin = 4;
  const cardW = Math.max(1, data2.width);
  const cardH = Math.max(1, data2.height);
  const anchorSide = inferSide(
    {
      x: data2.x,
      y: data2.y,
      w: cardW,
      h: cardH,
    },
    data2.anchorX,
    data2.anchorY,
  );
  const preferredCardSide =
    anchorSide === "left"
      ? "right"
      : anchorSide === "right"
        ? "left"
        : anchorSide === "top"
          ? "bottom"
          : "top";
  const fits = (side) =>
    placeCardForAnchor(
      {
        x: data2.anchorX,
        y: data2.anchorY,
      },
      side,
      cardW,
      cardH,
    );
  const inCanvas = (p3) =>
    p3.x >= margin &&
    p3.y >= margin &&
    p3.x + cardW <= canvasWidth - margin &&
    p3.y + cardH <= canvasHeight - margin;
  let next2 = fits(preferredCardSide);
  if (!inCanvas(next2)) {
    const alternate = fits(anchorSide);
    if (inCanvas(alternate)) next2 = alternate;
    else {
      next2 = {
        x: Math.max(margin, Math.min(next2.x, canvasWidth - cardW - margin)),
        y: Math.max(margin, Math.min(next2.y, canvasHeight - cardH - margin)),
      };
    }
  }
  const changed = data2.x !== next2.x || data2.y !== next2.y;
  data2.x = next2.x;
  data2.y = next2.y;
  return changed;
}

function parseHex(hex2) {
  if (!hex2) return null;
  let h2 = hex2.trim();
  if (h2.startsWith("#")) h2 = h2.slice(1);
  if (h2.length === 3) h2 = h2.replace(/(.)/g, "$1$1");
  if (h2.length !== 6) return null;
  const r2 = Number.parseInt(h2.slice(0, 2), 16);
  const g2 = Number.parseInt(h2.slice(2, 4), 16);
  const b3 = Number.parseInt(h2.slice(4, 6), 16);
  if (Number.isNaN(r2) || Number.isNaN(g2) || Number.isNaN(b3)) return null;
  return [r2, g2, b3];
}

function isLightColor$1(hex2) {
  const rgb2 = parseHex(hex2);
  if (!rgb2) return false;
  const [r2, g2, b3] = rgb2;
  return (r2 * 299 + g2 * 587 + b3 * 114) / 1e3 > 165;
}

export function pickContrastColor(hex2) {
  return isLightColor$1(hex2) ? "#1C1C1E" : "#FFFFFF";
}

let counter = 0;

export function uid(prefix = "sh") {
  counter = (counter + 1) % 1e6;
  return `${prefix}_${Date.now().toString(36)}_${counter.toString(36)}`;
}

export class Tool {
  editor;
  /** 鼠标光标样式，由 Editor 在切换工具时应用到 canvas */
  cursor = "default";
  constructor(editor) {
    this.editor = editor;
  }
  onPointerDown(_e2) {}
  onPointerMove(_e2) {}
  onPointerUp(_e2) {}
  onDoubleClick(_e2) {}
  onKeyDown(_e2) {}
  onActivate() {}
  onDeactivate() {}
}

export class BrushTool extends Tool {
  cursor = "crosshair";
  working = null;
  onPointerDown(e2) {
    if (e2.button !== 0) return;
    const data2 = {
      id: uid("brush"),
      type: "brush",
      points: [e2.point],
      style: {
        ...this.editor.getStyle(),
      },
    };
    this.working = new FreePathShape(data2);
    this.editor.setPreviewShape(this.working);
  }
  onPointerMove(e2) {
    if (!this.working) return;
    this.working.addPoint(e2.point);
    this.editor.requestPreviewRender();
  }
  onPointerUp(_e2) {
    if (!this.working) return;
    this.editor.setPreviewShape(null);
    if (this.working.data.points.length > 1) {
      this.editor.addShape(this.working.data);
    }
    this.working = null;
  }
}
