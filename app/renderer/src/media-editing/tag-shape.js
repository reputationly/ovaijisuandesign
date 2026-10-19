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

export const CORNER_RADIUS = 6;

export const POINTER_BASE = 8;

function wrapTagLines(text, context, maxWidth) {
  if (!Number.isFinite(maxWidth)) return text.split("\n");
  const result = [];
  for (const sourceLine of text.split("\n")) {
    let line = "";
    for (const char of sourceLine || " ") {
      const candidate = line + char;
      if (line && context.measureText(candidate).width > maxWidth) {
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
  const centerX = card.x + card.w / 2;
  const centerY = card.y + card.h / 2;
  if (side === "left")
    return {
      x: card.x - anchorOffset,
      y: centerY,
    };
  if (side === "right")
    return {
      x: card.x + card.w + anchorOffset,
      y: centerY,
    };
  if (side === "top")
    return {
      x: centerX,
      y: card.y - anchorOffset,
    };
  return {
    x: centerX,
    y: card.y + card.h + anchorOffset,
  };
}

function drawRoundedRect(context, x, y, width, height, radius) {
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
}

function appendPointerPath(context, card, side) {
  const half = POINTER_BASE / 2;
  const centerX = card.x + card.w / 2;
  const centerY = card.y + card.h / 2;
  if (side === "left") {
    const baseX = card.x;
    const tipX = baseX - POINTER_HEIGHT;
    context.moveTo(baseX, centerY - half);
    context.lineTo(tipX, centerY);
    context.lineTo(baseX, centerY + half);
    context.closePath();
  } else if (side === "right") {
    const baseX = card.x + card.w;
    const tipX = baseX + POINTER_HEIGHT;
    context.moveTo(baseX, centerY - half);
    context.lineTo(tipX, centerY);
    context.lineTo(baseX, centerY + half);
    context.closePath();
  } else if (side === "top") {
    const baseY = card.y;
    const tipY = baseY - POINTER_HEIGHT;
    context.moveTo(centerX - half, baseY);
    context.lineTo(centerX, tipY);
    context.lineTo(centerX + half, baseY);
    context.closePath();
  } else {
    const baseY = card.y + card.h;
    const tipY = baseY + POINTER_HEIGHT;
    context.moveTo(centerX - half, baseY);
    context.lineTo(centerX, tipY);
    context.lineTo(centerX + half, baseY);
    context.closePath();
  }
}

export class TagShape extends Shape {
  draw(context) {
    const { text, style } = this.data;
    const fontSize = style.fontSize ?? DEFAULT_FONT_SIZE;
    const fontFamily =
      style.fontFamily ??
      'system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';
    const fontWeight = style.fontWeight ?? 500;
    const lineHeight = 1.4;
    const backgroundColor = style.tagBackground ?? "rgba(0, 0, 0, 0.6)";
    const textColor = style.tagTextColor ?? "#FFFFFF";
    const anchorColor = style.stroke ?? "#FF3B30";
    const anchorRadius = Math.max(1, style.tagAnchorRadius ?? ANCHOR_RADIUS);
    const anchorOffset = Math.max(TAG_ANCHOR_OFFSET, anchorRadius + ANCHOR_GAP);
    context.save();
    context.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    context.textBaseline = "middle";
    context.textAlign = "center";
    const maxInnerWidth = this.data.maxWidth
      ? Math.max(fontSize, this.data.maxWidth - PADDING_X * 2)
      : Number.POSITIVE_INFINITY;
    const lines = wrapTagLines(text || " ", context, maxInnerWidth);
    let maxLineW = 0;
    for (const line of lines) {
      const measuredWidth = context.measureText(line || " ").width;
      if (measuredWidth > maxLineW) maxLineW = measuredWidth;
    }
    const lineH = fontSize * lineHeight;
    const innerW = Math.max(maxLineW, fontSize);
    const innerH = Math.max(lineH * lines.length, lineH);
    const cardW = innerW + PADDING_X * 2;
    const cardH = innerH + PADDING_Y * 2;
    this.data.width = cardW;
    this.data.height = cardH;
    const x = this.data.x;
    const y = this.data.y;
    const centerX = x + cardW / 2;
    const cornerRadius = Math.min(CORNER_RADIUS, cardH / 2, cardW / 2);
    const card = {
      x,
      y,
      w: cardW,
      h: cardH,
    };
    const side = inferSide(card, this.data.anchorX, this.data.anchorY);
    const corrected = computeAnchorPosition(card, side, anchorOffset);
    this.data.anchorX = corrected.x;
    this.data.anchorY = corrected.y;
    context.beginPath();
    drawRoundedRect(context, x, y, cardW, cardH, cornerRadius);
    appendPointerPath(context, card, side);
    context.fillStyle = backgroundColor;
    context.fill();
    context.fillStyle = textColor;
    lines.forEach((line, lineIndex) => {
      const lineY = y + PADDING_Y + lineH * (lineIndex + 0.5);
      context.fillText(line, centerX, lineY);
    });
    context.beginPath();
    context.arc(corrected.x, corrected.y, anchorRadius, 0, Math.PI * 2);
    context.fillStyle = anchorColor;
    context.fill();
    context.restore();
  }
  hitTest(point) {
    if (pointInBounds(point, this.getBounds(), 4)) return true;
    const deltaX = point.x - this.data.anchorX;
    const deltaY = point.y - this.data.anchorY;
    const anchorRadius = Math.max(
      1,
      this.data.style.tagAnchorRadius ?? ANCHOR_RADIUS,
    );
    return Math.hypot(deltaX, deltaY) <= anchorRadius + 4;
  }
  getBounds() {
    const {
      x,
      y,
      width,
      height,
      anchorX,
      anchorY,
      style,
    } = this.data;
    const anchorRadius = Math.max(1, style.tagAnchorRadius ?? ANCHOR_RADIUS);
    const minX = Math.min(x, anchorX - anchorRadius);
    const minY = Math.min(y, anchorY - anchorRadius);
    const maxX = Math.max(x + width, anchorX + anchorRadius);
    const maxY = Math.max(y + height, anchorY + anchorRadius);
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }
  move(deltaX, deltaY) {
    this.data.x += deltaX;
    this.data.y += deltaY;
    this.data.anchorX += deltaX;
    this.data.anchorY += deltaY;
  }
  resize(bounds) {
    const currentBounds = this.getBounds();
    const deltaX = bounds.x - currentBounds.x;
    const deltaY = bounds.y - currentBounds.y;
    this.move(deltaX, deltaY);
  }
}
