// arrow-shape.js
import { withReferenceNavigationSnapshot } from "../m02/decode-worker-pool.jsx";
import { I2VPopoverInner } from "./i2-v-popover-inner.jsx";
export const I2VPopover = withReferenceNavigationSnapshot(I2VPopoverInner, "i2v");
export function shouldShowImageBottomPopover({
  selected: selected2,
  deferredSelected,
  isInteractiveSelect,
  isExpandedMediaOverlayVisible,
  isModalActive,
  rotateEditing,
  splitEditing,
  imageEditing,
  colorAdjustOpen,
  showEnhancePopover,
  showMultiAnglePopover,
  showStoryboardGridPopover,
  showRelightPopover,
  showWatermarkPopover,
  showLayerDecomposePrompt,
}) {
  return (
    selected2 &&
    deferredSelected &&
    isInteractiveSelect &&
    !isExpandedMediaOverlayVisible &&
    !isModalActive &&
    !rotateEditing &&
    !splitEditing &&
    !imageEditing &&
    !colorAdjustOpen &&
    !showEnhancePopover &&
    !showMultiAnglePopover &&
    !showStoryboardGridPopover &&
    !showRelightPopover &&
    !showWatermarkPopover &&
    !showLayerDecomposePrompt
  );
}
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
export function pointInBounds(p3, b3, padding = 0) {
  return (
    p3.x >= b3.x - padding &&
    p3.x <= b3.x + b3.width + padding &&
    p3.y >= b3.y - padding &&
    p3.y <= b3.y + b3.height + padding
  );
}
export function distanceToSegment(p3, a2, b3) {
  const dx = b3.x - a2.x;
  const dy = b3.y - a2.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(p3.x - a2.x, p3.y - a2.y);
  let t2 = ((p3.x - a2.x) * dx + (p3.y - a2.y) * dy) / lenSq;
  t2 = Math.max(0, Math.min(1, t2));
  const projX = a2.x + t2 * dx;
  const projY = a2.y + t2 * dy;
  return Math.hypot(p3.x - projX, p3.y - projY);
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
function pointInEllipseInflated(p3, cx2, cy, rx, ry) {
  if (rx <= 0 || ry <= 0) return false;
  const nx = (p3.x - cx2) / rx;
  const ny = (p3.y - cy) / ry;
  return nx * nx + ny * ny <= 1;
}
export function pointsBounds(points) {
  if (points.length === 0)
    return {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    };
  let minX = points[0].x;
  let maxX = points[0].x;
  let minY = points[0].y;
  let maxY = points[0].y;
  for (let i2 = 1; i2 < points.length; i2++) {
    const p3 = points[i2];
    if (p3.x < minX) minX = p3.x;
    if (p3.x > maxX) maxX = p3.x;
    if (p3.y < minY) minY = p3.y;
    if (p3.y > maxY) maxY = p3.y;
  }
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}
export class Shape {
  data;
  constructor(data2) {
    this.data = data2;
  }
  get id() {
    return this.data.id;
  }
  get type() {
    return this.data.type;
  }
  get style() {
    return this.data.style;
  }
  /**
   * 选中外框可由公共逻辑画，不强制各形状自己实现。
   * uiScale = "屏幕 CSS 像素 / canvas 逻辑像素"（即外层 ReactFlow viewport zoom），
   * 用来把虚线宽度 / dash / 外扩量按 1/uiScale 反缩，让用户看到的选框始终是
   * 固定屏幕像素大小，不会随画布缩放被一起放大。
   */
  drawSelection(ctx, uiScale = 1) {
    const b3 = this.getBounds();
    const inv = uiScale > 0 ? 1 / uiScale : 1;
    ctx.save();
    ctx.strokeStyle = this.data.style.selectionStroke ?? "#3370FF";
    ctx.lineWidth = inv;
    const dash2 = this.data.style.selectionLineDash ?? [4, 4];
    ctx.setLineDash(dash2.map((value) => value * inv));
    const pad = 2 * inv;
    ctx.strokeRect(b3.x - pad, b3.y - pad, b3.width + pad * 2, b3.height + pad * 2);
    ctx.restore();
  }
}
export class ArrowShape extends Shape {
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
    ctx.lineTo(baseX + perpX * headWidth * 0.5, baseY + perpY * headWidth * 0.5);
    ctx.lineTo(baseX - perpX * headWidth * 0.5, baseY - perpY * headWidth * 0.5);
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
export class EllipseShape extends Shape {
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
export class FreePathShape extends Shape {
  draw(ctx) {
    const { points, style: style2 } = this.data;
    if (points.length === 0) return;
    ctx.save();
    ctx.lineWidth = style2.strokeWidth;
    ctx.strokeStyle = style2.stroke;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    if (points.length === 1) {
      const p3 = points[0];
      ctx.arc(p3.x, p3.y, style2.strokeWidth / 2, 0, Math.PI * 2);
      ctx.fillStyle = style2.stroke;
      ctx.fill();
    } else {
      ctx.moveTo(points[0].x, points[0].y);
      for (let i2 = 1; i2 < points.length - 1; i2++) {
        const p3 = points[i2];
        const next2 = points[i2 + 1];
        const cx2 = (p3.x + next2.x) / 2;
        const cy = (p3.y + next2.y) / 2;
        ctx.quadraticCurveTo(p3.x, p3.y, cx2, cy);
      }
      const last2 = points[points.length - 1];
      ctx.lineTo(last2.x, last2.y);
      ctx.stroke();
    }
    ctx.restore();
  }
  hitTest(p3) {
    const padding = Math.max(8, this.data.style.strokeWidth);
    const points = this.data.points;
    if (points.length === 0) return false;
    if (points.length === 1) {
      return Math.hypot(p3.x - points[0].x, p3.y - points[0].y) <= padding;
    }
    for (let i2 = 0; i2 < points.length - 1; i2++) {
      if (distanceToSegment(p3, points[i2], points[i2 + 1]) <= padding) return true;
    }
    return false;
  }
  getBounds() {
    return pointsBounds(this.data.points);
  }
  move(dx, dy) {
    for (const p3 of this.data.points) {
      p3.x += dx;
      p3.y += dy;
    }
  }
  resize(b3) {
    const cur = this.getBounds();
    if (cur.width === 0 || cur.height === 0) return;
    const sx = b3.width / cur.width;
    const sy = b3.height / cur.height;
    for (const p3 of this.data.points) {
      p3.x = b3.x + (p3.x - cur.x) * sx;
      p3.y = b3.y + (p3.y - cur.y) * sy;
    }
  }
  /** 给画笔工具实时追加点用。 */
  addPoint(p3) {
    this.data.points.push(p3);
  }
}
export class LineShape extends Shape {
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
