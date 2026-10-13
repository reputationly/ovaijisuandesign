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
    const { x, y, width, height, style: style2 } = this.data;
    if (width === 0 || height === 0) return;
    context.save();
    context.lineWidth = style2.strokeWidth;
    context.strokeStyle = style2.stroke;
    if (style2.fill) {
      context.fillStyle = style2.fill;
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
  const inCanvas = (cardPosition) =>
    cardPosition.x >= margin &&
    cardPosition.y >= margin &&
    cardPosition.x + cardW <= canvasWidth - margin &&
    cardPosition.y + cardH <= canvasHeight - margin;
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
  let colorHex = hex2.trim();
  if (colorHex.startsWith("#")) colorHex = colorHex.slice(1);
  if (colorHex.length === 3) colorHex = colorHex.replace(/(.)/g, "$1$1");
  if (colorHex.length !== 6) return null;
  const redChannel = Number.parseInt(colorHex.slice(0, 2), 16);
  const green = Number.parseInt(colorHex.slice(2, 4), 16);
  const blue = Number.parseInt(colorHex.slice(4, 6), 16);
  if (Number.isNaN(redChannel) || Number.isNaN(green) || Number.isNaN(blue)) return null;
  return [redChannel, green, blue];
}
function isLightColor(hex2) {
  const rgb2 = parseHex(hex2);
  if (!rgb2) return false;
  const [redChannel, green, blue] = rgb2;
  return (redChannel * 299 + green * 587 + blue * 114) / 1e3 > 165;
}
export function pickContrastColor(hex2) {
  return isLightColor(hex2) ? "#1C1C1E" : "#FFFFFF";
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
  onPointerDown(unusedPointerEvent) {}
  onPointerMove(unusedPointerEvent) {}
  onPointerUp(unusedPointerEvent) {}
  onDoubleClick(unusedMouseEvent) {}
  onKeyDown(unusedKeyboardEvent) {}
  onActivate() {}
  onDeactivate() {}
}
export class BrushTool extends Tool {
  cursor = "crosshair";
  working = null;
  onPointerDown(pointerEvent) {
    if (pointerEvent.button !== 0) return;
    const data2 = {
      id: uid("brush"),
      type: "brush",
      points: [pointerEvent.point],
      style: {
        ...this.editor.getStyle(),
      },
    };
    this.working = new FreePathShape(data2);
    this.editor.setPreviewShape(this.working);
  }
  onPointerMove(pointerEvent) {
    if (!this.working) return;
    this.working.addPoint(pointerEvent.point);
    this.editor.requestPreviewRender();
  }
  onPointerUp(unusedPointerEvent) {
    if (!this.working) return;
    this.editor.setPreviewShape(null);
    if (this.working.data.points.length > 1) {
      this.editor.addShape(this.working.data);
    }
    this.working = null;
  }
}
