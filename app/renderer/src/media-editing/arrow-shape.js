// arrow-shape.js
import { distanceToSegment, FreePathShape, Shape } from "./free-path-shape.js";
import { MosaicShape } from "./mosaic-shape.js";
import { RectangleShape } from "./keep-tag-in-canvas.js";
import { TagShape } from "./tag-shape.js";
import { TextShape } from "./text-shape.js";

function pointsToBounds(p1, p22) {
  const x2 = Math.min(p1.x, p22.x);
  const y4 = Math.min(p1.y, p22.y);
  const width = Math.abs(p22.x - p1.x);
  const height = Math.abs(p22.y - p1.y);
  return {
    x: x2,
    y: y4,
    width,
    height,
  };
}

function pointInEllipse(p3, b3) {
  const cx2 = b3.x + b3.width / 2;
  const cy = b3.y + b3.height / 2;
  const rx = b3.width / 2;
  const ry = b3.height / 2;
  if (rx <= 0 || ry <= 0) return false;
  const nx = (p3.x - cx2) / rx;
  const ny = (p3.y - cy) / ry;
  return nx * nx + ny * ny <= 1;
}

function pointInEllipseInflated(p3, cx2, cy, rx, ry) {
  if (rx <= 0 || ry <= 0) return false;
  const nx = (p3.x - cx2) / rx;
  const ny = (p3.y - cy) / ry;
  return nx * nx + ny * ny <= 1;
}

function pointOnEllipseStroke(p3, b3, padding) {
  const cx2 = b3.x + b3.width / 2;
  const cy = b3.y + b3.height / 2;
  const rx = b3.width / 2;
  const ry = b3.height / 2;
  if (rx <= 0 || ry <= 0) return false;
  const inner = pointInEllipseInflated(p3, cx2, cy, rx - padding, ry - padding);
  const outer = pointInEllipseInflated(p3, cx2, cy, rx + padding, ry + padding);
  return outer && !inner;
}

class ArrowShape extends Shape {
  draw(ctx) {
    const { x1, y1, x2, y2: y22, style: style2 } = this.data;
    const dx = x2 - x1;
    const dy = y22 - y1;
    const len = Math.hypot(dx, dy);
    if (len === 0) return;
    const headLen = Math.max(12, style2.strokeWidth * 4);
    const headWidth = Math.max(8, style2.strokeWidth * 3);
    const ux = dx / len;
    const uy = dy / len;
    const bodyEndX = x2 - ux * headLen * 0.5;
    const bodyEndY = y22 - uy * headLen * 0.5;
    ctx.save();
    ctx.lineWidth = style2.strokeWidth;
    ctx.strokeStyle = style2.stroke;
    ctx.fillStyle = style2.stroke;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(bodyEndX, bodyEndY);
    ctx.stroke();
    const baseX = x2 - ux * headLen;
    const baseY = y22 - uy * headLen;
    const perpX = -uy;
    const perpY = ux;
    ctx.beginPath();
    ctx.moveTo(x2, y22);
    ctx.lineTo(
      baseX + perpX * headWidth * 0.5,
      baseY + perpY * headWidth * 0.5,
    );
    ctx.lineTo(
      baseX - perpX * headWidth * 0.5,
      baseY - perpY * headWidth * 0.5,
    );
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  hitTest(p3) {
    const padding = Math.max(8, this.data.style.strokeWidth);
    const a2 = {
      x: this.data.x1,
      y: this.data.y1,
    };
    const b3 = {
      x: this.data.x2,
      y: this.data.y2,
    };
    return distanceToSegment(p3, a2, b3) <= padding;
  }
  getBounds() {
    return pointsToBounds(
      {
        x: this.data.x1,
        y: this.data.y1,
      },
      {
        x: this.data.x2,
        y: this.data.y2,
      },
    );
  }
  move(dx, dy) {
    this.data.x1 += dx;
    this.data.y1 += dy;
    this.data.x2 += dx;
    this.data.y2 += dy;
  }
  resize(b3) {
    const cur = this.getBounds();
    if (cur.width === 0 && cur.height === 0) {
      this.data.x1 = b3.x;
      this.data.y1 = b3.y;
      this.data.x2 = b3.x + b3.width;
      this.data.y2 = b3.y + b3.height;
      return;
    }
    const sx = cur.width === 0 ? 1 : b3.width / cur.width;
    const sy = cur.height === 0 ? 1 : b3.height / cur.height;
    this.data.x1 = b3.x + (this.data.x1 - cur.x) * sx;
    this.data.y1 = b3.y + (this.data.y1 - cur.y) * sy;
    this.data.x2 = b3.x + (this.data.x2 - cur.x) * sx;
    this.data.y2 = b3.y + (this.data.y2 - cur.y) * sy;
  }
}

class EllipseShape extends Shape {
  draw(ctx) {
    const { x: x2, y: y4, width, height, style: style2 } = this.data;
    if (width === 0 || height === 0) return;
    const cx2 = x2 + width / 2;
    const cy = y4 + height / 2;
    const rx = Math.abs(width / 2);
    const ry = Math.abs(height / 2);
    ctx.save();
    ctx.lineWidth = style2.strokeWidth;
    ctx.strokeStyle = style2.stroke;
    ctx.beginPath();
    ctx.ellipse(cx2, cy, rx, ry, 0, 0, Math.PI * 2);
    if (style2.fill) {
      ctx.fillStyle = style2.fill;
      ctx.fill();
    }
    ctx.stroke();
    ctx.restore();
  }
  hitTest(p3) {
    const padding = Math.max(8, this.data.style.strokeWidth);
    const b3 = this.getBounds();
    if (this.data.style.fill) return pointInEllipse(p3, b3);
    return pointOnEllipseStroke(p3, b3, padding);
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

class LineShape extends Shape {
  draw(ctx) {
    const { x1, y1, x2, y2: y22, style: style2 } = this.data;
    ctx.save();
    ctx.lineWidth = style2.strokeWidth;
    ctx.strokeStyle = style2.stroke;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y22);
    ctx.stroke();
    ctx.restore();
  }
  hitTest(p3) {
    const padding = Math.max(8, this.data.style.strokeWidth);
    const a2 = {
      x: this.data.x1,
      y: this.data.y1,
    };
    const b3 = {
      x: this.data.x2,
      y: this.data.y2,
    };
    return distanceToSegment(p3, a2, b3) <= padding;
  }
  getBounds() {
    return pointsToBounds(
      {
        x: this.data.x1,
        y: this.data.y1,
      },
      {
        x: this.data.x2,
        y: this.data.y2,
      },
    );
  }
  move(dx, dy) {
    this.data.x1 += dx;
    this.data.y1 += dy;
    this.data.x2 += dx;
    this.data.y2 += dy;
  }
  resize(b3) {
    const cur = this.getBounds();
    if (cur.width === 0 || cur.height === 0) {
      this.data.x1 = b3.x;
      this.data.y1 = b3.y;
      this.data.x2 = b3.x + b3.width;
      this.data.y2 = b3.y + b3.height;
      return;
    }
    const sx = b3.width / cur.width;
    const sy = b3.height / cur.height;
    this.data.x1 = b3.x + (this.data.x1 - cur.x) * sx;
    this.data.y1 = b3.y + (this.data.y1 - cur.y) * sy;
    this.data.x2 = b3.x + (this.data.x2 - cur.x) * sx;
    this.data.y2 = b3.y + (this.data.y2 - cur.y) * sy;
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
