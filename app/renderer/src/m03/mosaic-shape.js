// mosaic-shape.js
import {
  ArrowShape,
  EllipseShape,
  FreePathShape,
  LineShape,
  Shape,
  distanceToSegment,
  pointInBounds,
  pointsBounds,
} from "./arrow-shape.js";
export function createOffscreen(width, height) {
  const c3 = document.createElement("canvas");
  c3.width = width;
  c3.height = height;
  return c3;
}
export function loadImage$4(src) {
  return loadImageWith(src, "anonymous").catch(() => loadImageWith(src, null));
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
export function clearCanvas(ctx) {
  const c3 = ctx.canvas;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, c3.width, c3.height);
  ctx.restore();
}
export class MosaicShape extends Shape {
  // 笔刷模式渲染时复用的临时 canvas，避免每次拖动都 createElement('canvas')
  brushTmp = null;
  brushTmpCtx = null;
  draw(ctx, helpers) {
    if (!helpers) return;
    const source = helpers.getProcessedSource(this.data.mode, this.data.strength);
    if (!source) return;
    if (this.data.shape === "rectangle") {
      this.drawRect(ctx, source, this.data);
    } else {
      this.drawBrush(ctx, source, this.data);
    }
  }
  drawRect(ctx, source, data2) {
    const b3 = normalizeBounds(data2);
    if (b3.width <= 0 || b3.height <= 0) return;
    ctx.save();
    ctx.beginPath();
    ctx.rect(b3.x, b3.y, b3.width, b3.height);
    ctx.clip();
    ctx.drawImage(source, 0, 0);
    ctx.restore();
  }
  drawBrush(ctx, source, data2) {
    const { points, brushSize } = data2;
    if (points.length === 0 || brushSize <= 0) return;
    const b3 = brushBounds(points, brushSize);
    if (b3.width <= 0 || b3.height <= 0) return;
    const tmpW = Math.max(1, Math.ceil(b3.width));
    const tmpH = Math.max(1, Math.ceil(b3.height));
    const tmp = this.acquireBrushTmp(tmpW, tmpH);
    const tctx = tmp.ctx;
    tctx.clearRect(0, 0, tmp.canvas.width, tmp.canvas.height);
    tctx.drawImage(source, -b3.x, -b3.y);
    tctx.globalCompositeOperation = "destination-in";
    tctx.lineWidth = brushSize;
    tctx.lineCap = "round";
    tctx.lineJoin = "round";
    tctx.strokeStyle = "#000";
    tctx.fillStyle = "#000";
    tctx.beginPath();
    if (points.length === 1) {
      const p3 = points[0];
      tctx.arc(p3.x - b3.x, p3.y - b3.y, brushSize / 2, 0, Math.PI * 2);
      tctx.fill();
    } else {
      tctx.moveTo(points[0].x - b3.x, points[0].y - b3.y);
      for (let i2 = 1; i2 < points.length - 1; i2++) {
        const p3 = points[i2];
        const next2 = points[i2 + 1];
        const cx2 = (p3.x + next2.x) / 2;
        const cy = (p3.y + next2.y) / 2;
        tctx.quadraticCurveTo(p3.x - b3.x, p3.y - b3.y, cx2 - b3.x, cy - b3.y);
      }
      const last2 = points[points.length - 1];
      tctx.lineTo(last2.x - b3.x, last2.y - b3.y);
      tctx.stroke();
    }
    tctx.globalCompositeOperation = "source-over";
    ctx.drawImage(tmp.canvas, b3.x, b3.y);
  }
  /**
   * 取或重建 brush 用临时 canvas。仅当尺寸不足时扩容（不缩容），减少 resize 抖动。
   */
  acquireBrushTmp(w3, h2) {
    if (!this.brushTmp || !this.brushTmpCtx) {
      this.brushTmp = createOffscreen(w3, h2);
      this.brushTmpCtx = this.brushTmp.getContext("2d");
      return {
        canvas: this.brushTmp,
        ctx: this.brushTmpCtx,
      };
    }
    if (this.brushTmp.width < w3 || this.brushTmp.height < h2) {
      this.brushTmp.width = Math.max(this.brushTmp.width, w3);
      this.brushTmp.height = Math.max(this.brushTmp.height, h2);
      this.brushTmpCtx = this.brushTmp.getContext("2d");
    }
    return {
      canvas: this.brushTmp,
      ctx: this.brushTmpCtx,
    };
  }
  hitTest(p3) {
    if (this.data.shape === "rectangle") {
      return pointInBounds(p3, this.getBounds(), 0);
    }
    const { points, brushSize } = this.data;
    if (points.length === 0) return false;
    const half = brushSize / 2;
    if (points.length === 1) {
      return Math.hypot(p3.x - points[0].x, p3.y - points[0].y) <= half;
    }
    for (let i2 = 0; i2 < points.length - 1; i2++) {
      if (distanceToSegment(p3, points[i2], points[i2 + 1]) <= half) return true;
    }
    return false;
  }
  getBounds() {
    if (this.data.shape === "rectangle") {
      return normalizeBounds(this.data);
    }
    return brushBounds(this.data.points, this.data.brushSize);
  }
  move(dx, dy) {
    if (this.data.shape === "rectangle") {
      this.data.x += dx;
      this.data.y += dy;
    } else {
      for (const p3 of this.data.points) {
        p3.x += dx;
        p3.y += dy;
      }
    }
  }
  resize(b3) {
    if (this.data.shape === "rectangle") {
      this.data.x = b3.x;
      this.data.y = b3.y;
      this.data.width = b3.width;
      this.data.height = b3.height;
      return;
    }
    const cur = brushBounds(this.data.points, this.data.brushSize);
    if (cur.width === 0 || cur.height === 0) return;
    const innerCur = {
      x: cur.x + this.data.brushSize / 2,
      y: cur.y + this.data.brushSize / 2,
      width: Math.max(1e-3, cur.width - this.data.brushSize),
      height: Math.max(1e-3, cur.height - this.data.brushSize),
    };
    const innerB = {
      x: b3.x + this.data.brushSize / 2,
      y: b3.y + this.data.brushSize / 2,
      width: Math.max(1e-3, b3.width - this.data.brushSize),
      height: Math.max(1e-3, b3.height - this.data.brushSize),
    };
    const sx = innerB.width / innerCur.width;
    const sy = innerB.height / innerCur.height;
    for (const p3 of this.data.points) {
      p3.x = innerB.x + (p3.x - innerCur.x) * sx;
      p3.y = innerB.y + (p3.y - innerCur.y) * sy;
    }
  }
  /** 给笔刷工具实时追加点用。 */
  addPoint(p3) {
    if (this.data.shape === "brush") {
      this.data.points.push(p3);
    }
  }
}
function normalizeBounds(d2) {
  return {
    x: d2.width >= 0 ? d2.x : d2.x + d2.width,
    y: d2.height >= 0 ? d2.y : d2.y + d2.height,
    width: Math.abs(d2.width),
    height: Math.abs(d2.height),
  };
}
function brushBounds(points, brushSize) {
  const half = brushSize / 2;
  const b3 = pointsBounds(points);
  return {
    x: b3.x - half,
    y: b3.y - half,
    width: b3.width + brushSize,
    height: b3.height + brushSize,
  };
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
const ANCHOR_RADIUS = 2.5;
const ANCHOR_GAP = 1;
const PADDING_X = 6;
const PADDING_Y = 2;
const CORNER_RADIUS = 6;
const POINTER_BASE = 8;
const POINTER_HEIGHT = 4;
const DEFAULT_FONT_SIZE = 13;
const TAG_ANCHOR_OFFSET = POINTER_HEIGHT + ANCHOR_GAP + ANCHOR_RADIUS;
export const TAG_PADDING_X = PADDING_X;
export const TAG_PADDING_Y = PADDING_Y;
export const TAG_DEFAULT_FONT_SIZE = DEFAULT_FONT_SIZE;
export class TagShape extends Shape {
  draw(ctx) {
    const { text: text2, style: style2 } = this.data;
    const fontSize = style2.fontSize ?? DEFAULT_FONT_SIZE;
    const fontFamily =
      style2.fontFamily ?? 'system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';
    const fontWeight = style2.fontWeight ?? 500;
    const lineHeight = 1.4;
    const bg = style2.tagBackground ?? "rgba(0, 0, 0, 0.6)";
    const fg = style2.tagTextColor ?? "#FFFFFF";
    const anchorColor = style2.stroke ?? "#FF3B30";
    const anchorRadius = Math.max(1, style2.tagAnchorRadius ?? ANCHOR_RADIUS);
    const anchorOffset = Math.max(TAG_ANCHOR_OFFSET, anchorRadius + ANCHOR_GAP);
    ctx.save();
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    const maxInnerWidth = this.data.maxWidth
      ? Math.max(fontSize, this.data.maxWidth - PADDING_X * 2)
      : Number.POSITIVE_INFINITY;
    const lines = wrapTagLines(text2 || " ", ctx, maxInnerWidth);
    let maxLineW = 0;
    for (const line of lines) {
      const w3 = ctx.measureText(line || " ").width;
      if (w3 > maxLineW) maxLineW = w3;
    }
    const lineH = fontSize * lineHeight;
    const innerW = Math.max(maxLineW, fontSize);
    const innerH = Math.max(lineH * lines.length, lineH);
    const cardW = innerW + PADDING_X * 2;
    const cardH = innerH + PADDING_Y * 2;
    this.data.width = cardW;
    this.data.height = cardH;
    const x2 = this.data.x;
    const y4 = this.data.y;
    const cx2 = x2 + cardW / 2;
    const r2 = Math.min(CORNER_RADIUS, cardH / 2, cardW / 2);
    const card = {
      x: x2,
      y: y4,
      w: cardW,
      h: cardH,
    };
    const side = inferSide(card, this.data.anchorX, this.data.anchorY);
    const corrected = computeAnchorPosition(card, side, anchorOffset);
    this.data.anchorX = corrected.x;
    this.data.anchorY = corrected.y;
    ctx.beginPath();
    drawRoundedRect(ctx, x2, y4, cardW, cardH, r2);
    appendPointerPath(ctx, card, side);
    ctx.fillStyle = bg;
    ctx.fill();
    ctx.fillStyle = fg;
    lines.forEach((line, i2) => {
      const ly = y4 + PADDING_Y + lineH * (i2 + 0.5);
      ctx.fillText(line, cx2, ly);
    });
    ctx.beginPath();
    ctx.arc(corrected.x, corrected.y, anchorRadius, 0, Math.PI * 2);
    ctx.fillStyle = anchorColor;
    ctx.fill();
    ctx.restore();
  }
  hitTest(p3) {
    if (pointInBounds(p3, this.getBounds(), 4)) return true;
    const dx = p3.x - this.data.anchorX;
    const dy = p3.y - this.data.anchorY;
    const anchorRadius = Math.max(1, this.data.style.tagAnchorRadius ?? ANCHOR_RADIUS);
    return Math.hypot(dx, dy) <= anchorRadius + 4;
  }
  getBounds() {
    const { x: x2, y: y4, width, height, anchorX, anchorY, style: style2 } = this.data;
    const anchorRadius = Math.max(1, style2.tagAnchorRadius ?? ANCHOR_RADIUS);
    const minX = Math.min(x2, anchorX - anchorRadius);
    const minY = Math.min(y4, anchorY - anchorRadius);
    const maxX = Math.max(x2 + width, anchorX + anchorRadius);
    const maxY = Math.max(y4 + height, anchorY + anchorRadius);
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }
  move(dx, dy) {
    this.data.x += dx;
    this.data.y += dy;
    this.data.anchorX += dx;
    this.data.anchorY += dy;
  }
  resize(b3) {
    const cur = this.getBounds();
    const dx = b3.x - cur.x;
    const dy = b3.y - cur.y;
    this.move(dx, dy);
  }
}
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
function wrapTagLines(text2, ctx, maxWidth) {
  if (!Number.isFinite(maxWidth)) return text2.split("\n");
  const result = [];
  for (const sourceLine of text2.split("\n")) {
    let line = "";
    for (const char of sourceLine || " ") {
      const candidate = line + char;
      if (line && ctx.measureText(candidate).width > maxWidth) {
        result.push(line);
        line = char;
      } else {
        line = candidate;
      }
    }
    result.push(line || " ");
  }
  return result;
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
function inferSide(card, ax, ay) {
  const cx2 = card.x + card.w / 2;
  const cy = card.y + card.h / 2;
  const dx = ax - cx2;
  const dy = ay - cy;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx < 0 ? "left" : "right";
  }
  return dy < 0 ? "top" : "bottom";
}
function computeAnchorPosition(card, side, anchorOffset = TAG_ANCHOR_OFFSET) {
  const cx2 = card.x + card.w / 2;
  const cy = card.y + card.h / 2;
  if (side === "left")
    return {
      x: card.x - anchorOffset,
      y: cy,
    };
  if (side === "right")
    return {
      x: card.x + card.w + anchorOffset,
      y: cy,
    };
  if (side === "top")
    return {
      x: cx2,
      y: card.y - anchorOffset,
    };
  return {
    x: cx2,
    y: card.y + card.h + anchorOffset,
  };
}
function drawRoundedRect(ctx, x2, y4, w3, h2, r2) {
  ctx.moveTo(x2 + r2, y4);
  ctx.lineTo(x2 + w3 - r2, y4);
  ctx.quadraticCurveTo(x2 + w3, y4, x2 + w3, y4 + r2);
  ctx.lineTo(x2 + w3, y4 + h2 - r2);
  ctx.quadraticCurveTo(x2 + w3, y4 + h2, x2 + w3 - r2, y4 + h2);
  ctx.lineTo(x2 + r2, y4 + h2);
  ctx.quadraticCurveTo(x2, y4 + h2, x2, y4 + h2 - r2);
  ctx.lineTo(x2, y4 + r2);
  ctx.quadraticCurveTo(x2, y4, x2 + r2, y4);
  ctx.closePath();
}
function appendPointerPath(ctx, card, side) {
  const half = POINTER_BASE / 2;
  const cx2 = card.x + card.w / 2;
  const cy = card.y + card.h / 2;
  if (side === "left") {
    const baseX = card.x;
    const tipX = baseX - POINTER_HEIGHT;
    ctx.moveTo(baseX, cy - half);
    ctx.lineTo(tipX, cy);
    ctx.lineTo(baseX, cy + half);
    ctx.closePath();
  } else if (side === "right") {
    const baseX = card.x + card.w;
    const tipX = baseX + POINTER_HEIGHT;
    ctx.moveTo(baseX, cy - half);
    ctx.lineTo(tipX, cy);
    ctx.lineTo(baseX, cy + half);
    ctx.closePath();
  } else if (side === "top") {
    const baseY = card.y;
    const tipY = baseY - POINTER_HEIGHT;
    ctx.moveTo(cx2 - half, baseY);
    ctx.lineTo(cx2, tipY);
    ctx.lineTo(cx2 + half, baseY);
    ctx.closePath();
  } else {
    const baseY = card.y + card.h;
    const tipY = baseY + POINTER_HEIGHT;
    ctx.moveTo(cx2 - half, baseY);
    ctx.lineTo(cx2, tipY);
    ctx.lineTo(cx2 + half, baseY);
    ctx.closePath();
  }
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
const baselineCache = new Map();
function measureFirstLineBaseline(font, lineHeight) {
  const key2 = `${font}|${lineHeight}`;
  const cached = baselineCache.get(key2);
  if (cached !== void 0) return cached;
  const probeWrap = document.createElement("div");
  probeWrap.style.cssText = [
    "position:absolute",
    "visibility:hidden",
    "left:-9999px",
    "top:0",
    "padding:0",
    "margin:0",
    "border:0",
    "white-space:pre",
    `font:${font}`,
    `line-height:${lineHeight}`,
  ].join(";");
  const baselineProbe = document.createElement("span");
  baselineProbe.style.cssText = "display:inline-block;width:0;height:0;vertical-align:baseline";
  probeWrap.appendChild(baselineProbe);
  probeWrap.appendChild(document.createTextNode("Mg"));
  document.body.appendChild(probeWrap);
  const wrapRect = probeWrap.getBoundingClientRect();
  const probeRect = baselineProbe.getBoundingClientRect();
  const baselineY = probeRect.bottom - wrapRect.top;
  document.body.removeChild(probeWrap);
  baselineCache.set(key2, baselineY);
  return baselineY;
}
const LINE_HEIGHT_RATIO = 1.4;
const TEXT_VARIANT_METRICS = {
  /** filled：背景内边距系数（基于字号）。padX 0.45×、padY 0.18×，下限保证小字号也有手感。 */
  filledPadXRatio: 0.45,
  filledPadYRatio: 0.18,
  filledMinPadX: 4,
  filledMinPadY: 2,
  /** outlined：固定细描边宽度（不按字号比例放大），与示意图视觉一致。 */
  outlinedStrokeWidth: 0.5,
};
export class TextShape extends Shape {
  draw(ctx) {
    const { text: text2, x: x2, y: y4, style: style2 } = this.data;
    if (!text2) return;
    const fontSize = style2.fontSize ?? 18;
    const fontFamily =
      style2.fontFamily || 'system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';
    const fontWeight = style2.fontWeight ?? 400;
    const fontShort = `${fontWeight} ${fontSize}px ${fontFamily}`;
    const variant = style2.textVariant ?? "plain";
    const mainColor = style2.stroke;
    const inverseColor = style2.textOutlineColor ?? pickContrastColor(mainColor);
    ctx.save();
    ctx.font = fontShort;
    ctx.textBaseline = "alphabetic";
    ctx.lineJoin = "round";
    ctx.miterLimit = 2;
    const lineHeight = fontSize * LINE_HEIGHT_RATIO;
    const baselineOffset = measureFirstLineBaseline(fontShort, LINE_HEIGHT_RATIO);
    const lines = text2.split("\n");
    let maxWidth = 0;
    for (const line of lines) {
      const w3 = ctx.measureText(line).width;
      if (w3 > maxWidth) maxWidth = w3;
    }
    const textBoxH = lines.length * lineHeight;
    if (variant === "filled") {
      const padX = Math.max(
        TEXT_VARIANT_METRICS.filledMinPadX,
        fontSize * TEXT_VARIANT_METRICS.filledPadXRatio,
      );
      const padY = Math.max(
        TEXT_VARIANT_METRICS.filledMinPadY,
        fontSize * TEXT_VARIANT_METRICS.filledPadYRatio,
      );
      const cardW = maxWidth + padX * 2;
      const cardH = textBoxH + padY * 2;
      const cardX = x2 - padX;
      const cardY = y4 - padY;
      ctx.fillStyle = mainColor;
      ctx.fillRect(cardX, cardY, cardW, cardH);
      ctx.fillStyle = inverseColor;
      lines.forEach((line, i2) => {
        ctx.fillText(line, x2, y4 + baselineOffset + i2 * lineHeight);
      });
      this.data.width = cardW;
      this.data.height = cardH;
    } else if (variant === "outlined") {
      const strokeW = TEXT_VARIANT_METRICS.outlinedStrokeWidth;
      ctx.lineWidth = strokeW;
      ctx.strokeStyle = mainColor;
      ctx.fillStyle = inverseColor;
      lines.forEach((line, i2) => {
        const lx = x2;
        const ly = y4 + baselineOffset + i2 * lineHeight;
        ctx.strokeText(line, lx, ly);
      });
      const padPerSide = strokeW / 2;
      this.data.width = maxWidth + padPerSide * 2;
      this.data.height = textBoxH + padPerSide * 2;
    } else {
      ctx.fillStyle = mainColor;
      lines.forEach((line, i2) => {
        ctx.fillText(line, x2, y4 + baselineOffset + i2 * lineHeight);
      });
      this.data.width = maxWidth;
      this.data.height = textBoxH;
    }
    ctx.restore();
  }
  hitTest(p3) {
    return pointInBounds(p3, this.getBounds(), 4);
  }
  getBounds() {
    const { x: x2, y: y4, width, height, style: style2 } = this.data;
    const fontSize = style2.fontSize ?? 18;
    const variant = style2.textVariant ?? "plain";
    if (variant === "filled") {
      const padX = Math.max(
        TEXT_VARIANT_METRICS.filledMinPadX,
        fontSize * TEXT_VARIANT_METRICS.filledPadXRatio,
      );
      const padY = Math.max(
        TEXT_VARIANT_METRICS.filledMinPadY,
        fontSize * TEXT_VARIANT_METRICS.filledPadYRatio,
      );
      return {
        x: x2 - padX,
        y: y4 - padY,
        width: Math.max(width, fontSize + padX * 2),
        height: Math.max(height, fontSize + padY * 2),
      };
    }
    return {
      x: x2,
      y: y4,
      width: Math.max(width, fontSize),
      height: Math.max(height, fontSize),
    };
  }
  move(dx, dy) {
    this.data.x += dx;
    this.data.y += dy;
  }
  resize(b3) {
    const cur = this.getBounds();
    if (cur.height > 0) {
      const ratio = b3.height / cur.height;
      this.data.style = {
        ...this.data.style,
        fontSize: Math.max(8, Math.round((this.data.style.fontSize ?? 18) * ratio)),
      };
    }
    const variant = this.data.style.textVariant ?? "plain";
    if (variant === "filled") {
      const fontSize = this.data.style.fontSize ?? 18;
      const padX = Math.max(
        TEXT_VARIANT_METRICS.filledMinPadX,
        fontSize * TEXT_VARIANT_METRICS.filledPadXRatio,
      );
      const padY = Math.max(
        TEXT_VARIANT_METRICS.filledMinPadY,
        fontSize * TEXT_VARIANT_METRICS.filledPadYRatio,
      );
      this.data.x = b3.x + padX;
      this.data.y = b3.y + padY;
    } else {
      this.data.x = b3.x;
      this.data.y = b3.y;
    }
  }
}
export function createShape(data2) {
  switch (data2.type) {
    case "rectangle":
      return new RectangleShape(data2);
    case "ellipse":
      return new EllipseShape(data2);
    case "line":
      return new LineShape(data2);
    case "arrow":
      return new ArrowShape(data2);
    case "brush":
      return new FreePathShape(data2);
    case "text":
      return new TextShape(data2);
    case "tag":
      return new TagShape(data2);
    case "mosaic":
      return new MosaicShape(data2);
  }
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
        ? Math.hypot(e2.point.x - this.startPoint.x, e2.point.y - this.startPoint.y) < 4
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
