// keep-tag-in-canvas.js
import { FreePathShape, pointInBounds, Shape } from "./free-path-shape.js";
export function createOffscreen(width, height) {
  const canvasElement = document.createElement("canvas");
  canvasElement.width = width;
  canvasElement.height = height;
  return canvasElement;
}
function loadImageWith(src, crossOrigin) {
  return new Promise((resolve, reject) => {
    const imageElement = new Image();
    if (crossOrigin !== null) imageElement.crossOrigin = crossOrigin;
    imageElement.onload = () => resolve(imageElement);
    imageElement.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    imageElement.src = src;
  });
}
export function loadImage(src) {
  return loadImageWith(src, "anonymous").catch(() => loadImageWith(src, null));
}
export class RectangleShape extends Shape {
  draw(context) {
    const { x, y, width, height, style } = this.data;
    if (width === 0 || height === 0) return;
    context.save();
    context.lineWidth = style.strokeWidth;
    context.strokeStyle = style.stroke;
    if (style.fill) {
      context.fillStyle = style.fill;
      context.fillRect(x, y, width, height);
    }
    context.strokeRect(x, y, width, height);
    context.restore();
  }
  hitTest(point) {
    const padding = Math.max(8, this.data.style.strokeWidth);
    const bounds = this.getBounds();
    if (this.data.style.fill) return pointInBounds(point, bounds, padding);
    const outer = pointInBounds(point, bounds, padding);
    const inner = pointInBounds(point, bounds, -padding);
    return outer && !inner;
  }
  getBounds() {
    const { x, y, width, height } = this.data;
    return {
      x: width >= 0 ? x : x + width,
      y: height >= 0 ? y : y + height,
      width: Math.abs(width),
      height: Math.abs(height),
    };
  }
  move(deltaX, deltaY) {
    this.data.x += deltaX;
    this.data.y += deltaY;
  }
  resize(bounds) {
    this.data.x = bounds.x;
    this.data.y = bounds.y;
    this.data.width = bounds.width;
    this.data.height = bounds.height;
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
export function inferSide(card, anchorX, anchorY) {
  const centerX = card.x + card.w / 2;
  const centerY = card.y + card.h / 2;
  const deltaX = anchorX - centerX;
  const deltaY = anchorY - centerY;
  if (Math.abs(deltaX) >= Math.abs(deltaY)) {
    return deltaX < 0 ? "left" : "right";
  }
  return deltaY < 0 ? "top" : "bottom";
}
export function keepTagInCanvas(data, canvasWidth, canvasHeight) {
  if (canvasWidth <= 0 || canvasHeight <= 0) return false;
  const margin = 4;
  const cardW = Math.max(1, data.width);
  const cardH = Math.max(1, data.height);
  const anchorSide = inferSide(
    {
      x: data.x,
      y: data.y,
      w: cardW,
      h: cardH,
    },
    data.anchorX,
    data.anchorY,
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
        x: data.anchorX,
        y: data.anchorY,
      },
      side,
      cardW,
      cardH,
    );
  const inCanvas = (cardPosition) =>
    cardPosition.x >= margin &&
    cardPosition.y >= margin &&
    cardPosition.x + cardW <= canvasWidth - margin &&
    cardPosition.y + cardH <= canvasHeight - margin;
  let next = fits(preferredCardSide);
  if (!inCanvas(next)) {
    const alternate = fits(anchorSide);
    if (inCanvas(alternate)) next = alternate;
    else {
      next = {
        x: Math.max(margin, Math.min(next.x, canvasWidth - cardW - margin)),
        y: Math.max(margin, Math.min(next.y, canvasHeight - cardH - margin)),
      };
    }
  }
  const changed = data.x !== next.x || data.y !== next.y;
  data.x = next.x;
  data.y = next.y;
  return changed;
}
function parseHex(v2) {
  let r2 = "";
  let g = "";
  let b3 = "";
  let a2 = "";
  if (v2.length > 5) {
    r2 = v2.substring(1, 3);
    g = v2.substring(3, 5);
    b3 = v2.substring(5, 7);
    a2 = v2.substring(7, 9);
  } else {
    r2 = v2.substring(1, 2);
    g = v2.substring(2, 3);
    b3 = v2.substring(3, 4);
    a2 = v2.substring(4, 5);
    r2 += r2;
    g += g;
    b3 += b3;
    a2 += a2;
  }
  return {
    red: parseInt(r2, 16),
    green: parseInt(g, 16),
    blue: parseInt(b3, 16),
    alpha: a2 ? parseInt(a2, 16) / 255 : 1,
  };
}
function isLightColor(hex) {
  const rgb = parseHex(hex);
  if (!rgb) return false;
  const [redChannel, greenChannel, blueChannel] = rgb;
  return (redChannel * 299 + greenChannel * 587 + blueChannel * 114) / 1e3 > 165;
}
export function pickContrastColor(hex) {
  return isLightColor(hex) ? "#1C1C1E" : "#FFFFFF";
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
  onPointerDown(pointerEvent) {}
  onPointerMove(pointerEvent) {}
  onPointerUp(pointerEvent) {}
  onDoubleClick(mouseEvent) {}
  onKeyDown(keyboardEvent) {}
  onActivate() {}
  onDeactivate() {}
}
export class BrushTool extends Tool {
  cursor = "crosshair";
  working = null;
  onPointerDown(pointerEvent) {
    if (pointerEvent.button !== 0) return;
    const data = {
      id: uid("brush"),
      type: "brush",
      points: [pointerEvent.point],
      style: {
        ...this.editor.getStyle(),
      },
    };
    this.working = new FreePathShape(data);
    this.editor.setPreviewShape(this.working);
  }
  onPointerMove(pointerEvent) {
    if (!this.working) return;
    this.working.addPoint(pointerEvent.point);
    this.editor.requestPreviewRender();
  }
  onPointerUp(pointerEvent) {
    if (!this.working) return;
    this.editor.setPreviewShape(null);
    if (this.working.data.points.length > 1) {
      this.editor.addShape(this.working.data);
    }
    this.working = null;
  }
}
