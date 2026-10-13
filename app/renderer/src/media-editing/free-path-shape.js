// free-path-shape.js
import { withReferenceNavigationSnapshot } from "./get-reference-navigation-defaults.jsx";
import { I2VPopoverInner } from "../generation/i2-v-popover-inner.jsx";

export const I2VPopover = withReferenceNavigationSnapshot(
  I2VPopoverInner,
  "i2v",
);

export function shouldShowImageBottomPopover({
  selected,
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
    selected &&
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

export function pointInBounds(point, bounds, padding = 0) {
  return (
    point.x >= bounds.x - padding &&
    point.x <= bounds.x + bounds.width + padding &&
    point.y >= bounds.y - padding &&
    point.y <= bounds.y + bounds.height + padding
  );
}

export function distanceToSegment(point, startPoint, endPoint) {
  const segmentX = endPoint.x - startPoint.x;
  const segmentY = endPoint.y - startPoint.y;
  const lenSq = segmentX * segmentX + segmentY * segmentY;
  if (lenSq === 0) return Math.hypot(point.x - startPoint.x, point.y - startPoint.y);
  let segmentRatio = ((point.x - startPoint.x) * segmentX + (point.y - startPoint.y) * segmentY) / lenSq;
  segmentRatio = Math.max(0, Math.min(1, segmentRatio));
  const projX = startPoint.x + segmentRatio * segmentX;
  const projY = startPoint.y + segmentRatio * segmentY;
  return Math.hypot(point.x - projX, point.y - projY);
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
  for (let pointIndex = 1; pointIndex < points.length; pointIndex++) {
    const point = points[pointIndex];
    if (point.x < minX) minX = point.x;
    if (point.x > maxX) maxX = point.x;
    if (point.y < minY) minY = point.y;
    if (point.y > maxY) maxY = point.y;
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
  constructor(data) {
    this.data = data;
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
  drawSelection(context, uiScale = 1) {
    const bounds = this.getBounds();
    const inverseScale = uiScale > 0 ? 1 / uiScale : 1;
    context.save();
    context.strokeStyle = this.data.style.selectionStroke ?? "#3370FF";
    context.lineWidth = inverseScale;
    const dash = this.data.style.selectionLineDash ?? [4, 4];
    context.setLineDash(dash.map((value) => value * inverseScale));
    const selectionPadding = 2 * inverseScale;
    context.strokeRect(
      bounds.x - selectionPadding,
      bounds.y - selectionPadding,
      bounds.width + selectionPadding * 2,
      bounds.height + selectionPadding * 2,
    );
    context.restore();
  }
}

export class FreePathShape extends Shape {
  draw(context) {
    const { points, style } = this.data;
    if (points.length === 0) return;
    context.save();
    context.lineWidth = style.strokeWidth;
    context.strokeStyle = style.stroke;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.beginPath();
    if (points.length === 1) {
      const point = points[0];
      context.arc(point.x, point.y, style.strokeWidth / 2, 0, Math.PI * 2);
      context.fillStyle = style.stroke;
      context.fill();
    } else {
      context.moveTo(points[0].x, points[0].y);
      for (let pointIndex = 1; pointIndex < points.length - 1; pointIndex++) {
        const point = points[pointIndex];
        const next = points[pointIndex + 1];
        const centerX = (point.x + next.x) / 2;
        const centerY = (point.y + next.y) / 2;
        context.quadraticCurveTo(point.x, point.y, centerX, centerY);
      }
      const last = points[points.length - 1];
      context.lineTo(last.x, last.y);
      context.stroke();
    }
    context.restore();
  }
  hitTest(point) {
    const padding = Math.max(8, this.data.style.strokeWidth);
    const points = this.data.points;
    if (points.length === 0) return false;
    if (points.length === 1) {
      return Math.hypot(point.x - points[0].x, point.y - points[0].y) <= padding;
    }
    for (let pointIndex = 0; pointIndex < points.length - 1; pointIndex++) {
      if (distanceToSegment(point, points[pointIndex], points[pointIndex + 1]) <= padding)
        return true;
    }
    return false;
  }
  getBounds() {
    return pointsBounds(this.data.points);
  }
  move(deltaX, deltaY) {
    for (const point of this.data.points) {
      point.x += deltaX;
      point.y += deltaY;
    }
  }
  resize(bounds) {
    const currentBounds = this.getBounds();
    if (currentBounds.width === 0 || currentBounds.height === 0) return;
    const scaleX = bounds.width / currentBounds.width;
    const scaleY = bounds.height / currentBounds.height;
    for (const point of this.data.points) {
      point.x = bounds.x + (point.x - currentBounds.x) * scaleX;
      point.y = bounds.y + (point.y - currentBounds.y) * scaleY;
    }
  }
  /** 给画笔工具实时追加点用。 */
  addPoint(point) {
    this.data.points.push(point);
  }
}
