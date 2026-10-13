// arrow-shape.js
import { distanceToSegment, FreePathShape, Shape } from "./free-path-shape.js";
import { MosaicShape } from "./mosaic-shape.js";
import { RectangleShape } from "./keep-tag-in-canvas.js";
import { TagShape } from "./tag-shape.js";
import { TextShape } from "./text-shape.js";

function pointsToBounds(firstPoint, secondPoint) {
  const left = Math.min(firstPoint.x, secondPoint.x);
  const topEdge = Math.min(firstPoint.y, secondPoint.y);
  const width = Math.abs(secondPoint.x - firstPoint.x);
  const height = Math.abs(secondPoint.y - firstPoint.y);
  return {
    x: left,
    y: topEdge,
    width,
    height,
  };
}

function pointInEllipse(point, bounds) {
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;
  const radiusX = bounds.width / 2;
  const radiusY = bounds.height / 2;
  if (radiusX <= 0 || radiusY <= 0) return false;
  const normalizedX = (point.x - centerX) / radiusX;
  const normalizedY = (point.y - centerY) / radiusY;
  return normalizedX * normalizedX + normalizedY * normalizedY <= 1;
}

function pointInEllipseInflated(point, centerX, centerY, radiusX, radiusY) {
  if (radiusX <= 0 || radiusY <= 0) return false;
  const normalizedX = (point.x - centerX) / radiusX;
  const normalizedY = (point.y - centerY) / radiusY;
  return normalizedX * normalizedX + normalizedY * normalizedY <= 1;
}

function pointOnEllipseStroke(point, bounds, padding) {
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;
  const radiusX = bounds.width / 2;
  const radiusY = bounds.height / 2;
  if (radiusX <= 0 || radiusY <= 0) return false;
  const inner = pointInEllipseInflated(point, centerX, centerY, radiusX - padding, radiusY - padding);
  const outer = pointInEllipseInflated(point, centerX, centerY, radiusX + padding, radiusY + padding);
  return outer && !inner;
}

class ArrowShape extends Shape {
  draw(canvasContext) {
    const { x1: startX, y1: startY, x2: endX, y2: endY, style } = this.data;
    const deltaX = endX - startX;
    const deltaY = endY - startY;
    const segmentLength = Math.hypot(deltaX, deltaY);
    if (segmentLength === 0) return;
    const headLen = Math.max(12, style.strokeWidth * 4);
    const headWidth = Math.max(8, style.strokeWidth * 3);
    const directionX = deltaX / segmentLength;
    const directionY = deltaY / segmentLength;
    const bodyEndX = endX - directionX * headLen * 0.5;
    const bodyEndY = endY - directionY * headLen * 0.5;
    canvasContext.save();
    canvasContext.lineWidth = style.strokeWidth;
    canvasContext.strokeStyle = style.stroke;
    canvasContext.fillStyle = style.stroke;
    canvasContext.lineCap = "round";
    canvasContext.lineJoin = "round";
    canvasContext.beginPath();
    canvasContext.moveTo(startX, startY);
    canvasContext.lineTo(bodyEndX, bodyEndY);
    canvasContext.stroke();
    const baseX = endX - directionX * headLen;
    const baseY = endY - directionY * headLen;
    const perpX = -directionY;
    const perpY = directionX;
    canvasContext.beginPath();
    canvasContext.moveTo(endX, endY);
    canvasContext.lineTo(
      baseX + perpX * headWidth * 0.5,
      baseY + perpY * headWidth * 0.5,
    );
    canvasContext.lineTo(
      baseX - perpX * headWidth * 0.5,
      baseY - perpY * headWidth * 0.5,
    );
    canvasContext.closePath();
    canvasContext.fill();
    canvasContext.restore();
  }
  hitTest(point) {
    const padding = Math.max(8, this.data.style.strokeWidth);
    const segmentStart = {
      x: this.data.x1,
      y: this.data.y1,
    };
    const segmentEnd = {
      x: this.data.x2,
      y: this.data.y2,
    };
    return distanceToSegment(point, segmentStart, segmentEnd) <= padding;
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
  move(deltaX, deltaY) {
    this.data.x1 += deltaX;
    this.data.y1 += deltaY;
    this.data.x2 += deltaX;
    this.data.y2 += deltaY;
  }
  resize(newBounds) {
    const currentBounds = this.getBounds();
    if (currentBounds.width === 0 && currentBounds.height === 0) {
      this.data.x1 = newBounds.x;
      this.data.y1 = newBounds.y;
      this.data.x2 = newBounds.x + newBounds.width;
      this.data.y2 = newBounds.y + newBounds.height;
      return;
    }
    const scaleX = currentBounds.width === 0 ? 1 : newBounds.width / currentBounds.width;
    const scaleY = currentBounds.height === 0 ? 1 : newBounds.height / currentBounds.height;
    this.data.x1 = newBounds.x + (this.data.x1 - currentBounds.x) * scaleX;
    this.data.y1 = newBounds.y + (this.data.y1 - currentBounds.y) * scaleY;
    this.data.x2 = newBounds.x + (this.data.x2 - currentBounds.x) * scaleX;
    this.data.y2 = newBounds.y + (this.data.y2 - currentBounds.y) * scaleY;
  }
}

class EllipseShape extends Shape {
  draw(canvasContext) {
    const { x: originX, y: originY, width, height, style } = this.data;
    if (width === 0 || height === 0) return;
    const centerX = originX + width / 2;
    const centerY = originY + height / 2;
    const radiusX = Math.abs(width / 2);
    const radiusY = Math.abs(height / 2);
    canvasContext.save();
    canvasContext.lineWidth = style.strokeWidth;
    canvasContext.strokeStyle = style.stroke;
    canvasContext.beginPath();
    canvasContext.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
    if (style.fill) {
      canvasContext.fillStyle = style.fill;
      canvasContext.fill();
    }
    canvasContext.stroke();
    canvasContext.restore();
  }
  hitTest(point) {
    const padding = Math.max(8, this.data.style.strokeWidth);
    const bounds = this.getBounds();
    if (this.data.style.fill) return pointInEllipse(point, bounds);
    return pointOnEllipseStroke(point, bounds, padding);
  }
  getBounds() {
    const { x: originX, y: originY, width, height } = this.data;
    return {
      x: width >= 0 ? originX : originX + width,
      y: height >= 0 ? originY : originY + height,
      width: Math.abs(width),
      height: Math.abs(height),
    };
  }
  move(deltaX, deltaY) {
    this.data.x += deltaX;
    this.data.y += deltaY;
  }
  resize(newBounds) {
    this.data.x = newBounds.x;
    this.data.y = newBounds.y;
    this.data.width = newBounds.width;
    this.data.height = newBounds.height;
  }
}

class LineShape extends Shape {
  draw(canvasContext) {
    const { x1: startX, y1: startY, x2: endX, y2: endY, style } = this.data;
    canvasContext.save();
    canvasContext.lineWidth = style.strokeWidth;
    canvasContext.strokeStyle = style.stroke;
    canvasContext.lineCap = "round";
    canvasContext.beginPath();
    canvasContext.moveTo(startX, startY);
    canvasContext.lineTo(endX, endY);
    canvasContext.stroke();
    canvasContext.restore();
  }
  hitTest(point) {
    const padding = Math.max(8, this.data.style.strokeWidth);
    const segmentStart = {
      x: this.data.x1,
      y: this.data.y1,
    };
    const segmentEnd = {
      x: this.data.x2,
      y: this.data.y2,
    };
    return distanceToSegment(point, segmentStart, segmentEnd) <= padding;
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
  move(deltaX, deltaY) {
    this.data.x1 += deltaX;
    this.data.y1 += deltaY;
    this.data.x2 += deltaX;
    this.data.y2 += deltaY;
  }
  resize(newBounds) {
    const currentBounds = this.getBounds();
    if (currentBounds.width === 0 || currentBounds.height === 0) {
      this.data.x1 = newBounds.x;
      this.data.y1 = newBounds.y;
      this.data.x2 = newBounds.x + newBounds.width;
      this.data.y2 = newBounds.y + newBounds.height;
      return;
    }
    const scaleX = newBounds.width / currentBounds.width;
    const scaleY = newBounds.height / currentBounds.height;
    this.data.x1 = newBounds.x + (this.data.x1 - currentBounds.x) * scaleX;
    this.data.y1 = newBounds.y + (this.data.y1 - currentBounds.y) * scaleY;
    this.data.x2 = newBounds.x + (this.data.x2 - currentBounds.x) * scaleX;
    this.data.y2 = newBounds.y + (this.data.y2 - currentBounds.y) * scaleY;
  }
}

export function createShape(data) {
  switch (data.type) {
    case "rectangle":
      return new RectangleShape(data);
    case "ellipse":
      return new EllipseShape(data);
    case "line":
      return new LineShape(data);
    case "arrow":
      return new ArrowShape(data);
    case "brush":
      return new FreePathShape(data);
    case "text":
      return new TextShape(data);
    case "tag":
      return new TagShape(data);
    case "mosaic":
      return new MosaicShape(data);
  }
}
