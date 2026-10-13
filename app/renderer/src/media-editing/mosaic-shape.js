// mosaic-shape.js
import {
  distanceToSegment,
  pointInBounds,
  pointsBounds,
  Shape,
} from "./free-path-shape.js";
import { createOffscreen } from "./keep-tag-in-canvas.js";

function normalizeBounds(rectangleData) {
  return {
    x: rectangleData.width >= 0 ? rectangleData.x : rectangleData.x + rectangleData.width,
    y: rectangleData.height >= 0 ? rectangleData.y : rectangleData.y + rectangleData.height,
    width: Math.abs(rectangleData.width),
    height: Math.abs(rectangleData.height),
  };
}

function brushBounds(points, brushSize) {
  const half = brushSize / 2;
  const bounds = pointsBounds(points);
  return {
    x: bounds.x - half,
    y: bounds.y - half,
    width: bounds.width + brushSize,
    height: bounds.height + brushSize,
  };
}

export class MosaicShape extends Shape {
  // 笔刷模式渲染时复用的临时 canvas，避免每次拖动都 createElement('canvas')
  brushTmp = null;
  brushTmpCtx = null;
  draw(context, helpers) {
    if (!helpers) return;
    const source = helpers.getProcessedSource(
      this.data.mode,
      this.data.strength,
    );
    if (!source) return;
    if (this.data.shape === "rectangle") {
      this.drawRect(context, source, this.data);
    } else {
      this.drawBrush(context, source, this.data);
    }
  }
  drawRect(context, source, data) {
    const bounds = normalizeBounds(data);
    if (bounds.width <= 0 || bounds.height <= 0) return;
    context.save();
    context.beginPath();
    context.rect(bounds.x, bounds.y, bounds.width, bounds.height);
    context.clip();
    context.drawImage(source, 0, 0);
    context.restore();
  }
  drawBrush(context, source, data) {
    const { points, brushSize } = data;
    if (points.length === 0 || brushSize <= 0) return;
    const bounds = brushBounds(points, brushSize);
    if (bounds.width <= 0 || bounds.height <= 0) return;
    const tmpW = Math.max(1, Math.ceil(bounds.width));
    const tmpH = Math.max(1, Math.ceil(bounds.height));
    const temporaryCanvas = this.acquireBrushTmp(tmpW, tmpH);
    const tctx = temporaryCanvas.ctx;
    tctx.clearRect(0, 0, temporaryCanvas.canvas.width, temporaryCanvas.canvas.height);
    tctx.drawImage(source, -bounds.x, -bounds.y);
    tctx.globalCompositeOperation = "destination-in";
    tctx.lineWidth = brushSize;
    tctx.lineCap = "round";
    tctx.lineJoin = "round";
    tctx.strokeStyle = "#000";
    tctx.fillStyle = "#000";
    tctx.beginPath();
    if (points.length === 1) {
      const point = points[0];
      tctx.arc(point.x - bounds.x, point.y - bounds.y, brushSize / 2, 0, Math.PI * 2);
      tctx.fill();
    } else {
      tctx.moveTo(points[0].x - bounds.x, points[0].y - bounds.y);
      for (let pointIndex = 1; pointIndex < points.length - 1; pointIndex++) {
        const point = points[pointIndex];
        const next = points[pointIndex + 1];
        const midpointX = (point.x + next.x) / 2;
        const midpointY = (point.y + next.y) / 2;
        tctx.quadraticCurveTo(point.x - bounds.x, point.y - bounds.y, midpointX - bounds.x, midpointY - bounds.y);
      }
      const last = points[points.length - 1];
      tctx.lineTo(last.x - bounds.x, last.y - bounds.y);
      tctx.stroke();
    }
    tctx.globalCompositeOperation = "source-over";
    context.drawImage(temporaryCanvas.canvas, bounds.x, bounds.y);
  }
  /**
   * 取或重建 brush 用临时 canvas。仅当尺寸不足时扩容（不缩容），减少 resize 抖动。
   */
  acquireBrushTmp(width, height) {
    if (!this.brushTmp || !this.brushTmpCtx) {
      this.brushTmp = createOffscreen(width, height);
      this.brushTmpCtx = this.brushTmp.getContext("2d");
      return {
        canvas: this.brushTmp,
        ctx: this.brushTmpCtx,
      };
    }
    if (this.brushTmp.width < width || this.brushTmp.height < height) {
      this.brushTmp.width = Math.max(this.brushTmp.width, width);
      this.brushTmp.height = Math.max(this.brushTmp.height, height);
      this.brushTmpCtx = this.brushTmp.getContext("2d");
    }
    return {
      canvas: this.brushTmp,
      ctx: this.brushTmpCtx,
    };
  }
  hitTest(point) {
    if (this.data.shape === "rectangle") {
      return pointInBounds(point, this.getBounds(), 0);
    }
    const { points, brushSize } = this.data;
    if (points.length === 0) return false;
    const half = brushSize / 2;
    if (points.length === 1) {
      return Math.hypot(point.x - points[0].x, point.y - points[0].y) <= half;
    }
    for (let pointIndex = 0; pointIndex < points.length - 1; pointIndex++) {
      if (distanceToSegment(point, points[pointIndex], points[pointIndex + 1]) <= half)
        return true;
    }
    return false;
  }
  getBounds() {
    if (this.data.shape === "rectangle") {
      return normalizeBounds(this.data);
    }
    return brushBounds(this.data.points, this.data.brushSize);
  }
  move(deltaX, deltaY) {
    if (this.data.shape === "rectangle") {
      this.data.x += deltaX;
      this.data.y += deltaY;
    } else {
      for (const point of this.data.points) {
        point.x += deltaX;
        point.y += deltaY;
      }
    }
  }
  resize(bounds) {
    if (this.data.shape === "rectangle") {
      this.data.x = bounds.x;
      this.data.y = bounds.y;
      this.data.width = bounds.width;
      this.data.height = bounds.height;
      return;
    }
    const currentBounds = brushBounds(this.data.points, this.data.brushSize);
    if (currentBounds.width === 0 || currentBounds.height === 0) return;
    const innerCur = {
      x: currentBounds.x + this.data.brushSize / 2,
      y: currentBounds.y + this.data.brushSize / 2,
      width: Math.max(1e-3, currentBounds.width - this.data.brushSize),
      height: Math.max(1e-3, currentBounds.height - this.data.brushSize),
    };
    const innerB = {
      x: bounds.x + this.data.brushSize / 2,
      y: bounds.y + this.data.brushSize / 2,
      width: Math.max(1e-3, bounds.width - this.data.brushSize),
      height: Math.max(1e-3, bounds.height - this.data.brushSize),
    };
    const scaleX = innerB.width / innerCur.width;
    const scaleY = innerB.height / innerCur.height;
    for (const point of this.data.points) {
      point.x = innerB.x + (point.x - innerCur.x) * scaleX;
      point.y = innerB.y + (point.y - innerCur.y) * scaleY;
    }
  }
  /** 给笔刷工具实时追加点用。 */
  addPoint(point) {
    if (this.data.shape === "brush") {
      this.data.points.push(point);
    }
  }
}
