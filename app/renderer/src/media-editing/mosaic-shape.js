// mosaic-shape.js
import {
  distanceToSegment,
  pointInBounds,
  pointsBounds,
  Shape,
} from "./free-path-shape.js";
import { createOffscreen } from "./keep-tag-in-canvas.js";

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

export class MosaicShape extends Shape {
  // 笔刷模式渲染时复用的临时 canvas，避免每次拖动都 createElement('canvas')
  brushTmp = null;
  brushTmpCtx = null;
  draw(ctx, helpers) {
    if (!helpers) return;
    const source = helpers.getProcessedSource(
      this.data.mode,
      this.data.strength,
    );
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
      if (distanceToSegment(p3, points[i2], points[i2 + 1]) <= half)
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
