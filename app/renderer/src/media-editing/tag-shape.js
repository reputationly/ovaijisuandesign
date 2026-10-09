// tag-shape.js
import {
  ANCHOR_GAP,
  ANCHOR_RADIUS,
  DEFAULT_FONT_SIZE,
  inferSide,
  PADDING_X,
  PADDING_Y,
  POINTER_HEIGHT,
  TAG_ANCHOR_OFFSET,
} from "./keep-tag-in-canvas.js";
import { pointInBounds, Shape } from "./free-path-shape.js";

const CORNER_RADIUS = 6;

const POINTER_BASE = 8;

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

export class TagShape extends Shape {
  draw(ctx) {
    const { text: text2, style: style2 } = this.data;
    const fontSize = style2.fontSize ?? DEFAULT_FONT_SIZE;
    const fontFamily =
      style2.fontFamily ??
      'system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';
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
    const anchorRadius = Math.max(
      1,
      this.data.style.tagAnchorRadius ?? ANCHOR_RADIUS,
    );
    return Math.hypot(dx, dy) <= anchorRadius + 4;
  }
  getBounds() {
    const {
      x: x2,
      y: y4,
      width,
      height,
      anchorX,
      anchorY,
      style: style2,
    } = this.data;
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
