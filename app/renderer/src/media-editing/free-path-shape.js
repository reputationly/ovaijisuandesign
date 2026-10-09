// free-path-shape.js
import { withReferenceNavigationSnapshot } from "./get-reference-navigation-defaults.jsx";
import { I2VPopoverInner } from "../generation/i2-v-popover-inner.jsx";

export const I2VPopover = withReferenceNavigationSnapshot(
  I2VPopoverInner,
  "i2v",
);

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
    ctx.strokeRect(
      b3.x - pad,
      b3.y - pad,
      b3.width + pad * 2,
      b3.height + pad * 2,
    );
    ctx.restore();
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
      if (distanceToSegment(p3, points[i2], points[i2 + 1]) <= padding)
        return true;
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
