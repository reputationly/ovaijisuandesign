// calc-crop-rect.js
import { clamp } from "../canvas/use-start-crop-from-node.js";
const MIN_CROP_RATIO = 0.05;
const HANDLE_SIZE_PX = 24;
const MIN_CROP_PX = HANDLE_SIZE_PX * 2;
function minCropFraction(containerPx) {
  if (containerPx && containerPx > 0) {
    return Math.max(MIN_CROP_RATIO, MIN_CROP_PX / containerPx);
  }
  return MIN_CROP_RATIO;
}
function clampCropRect(cropRect, containerWidth, containerHeight) {
  const minW = minCropFraction(containerWidth);
  const minH = minCropFraction(containerHeight);
  const cropWidth = clamp(cropRect.width, minW, 1);
  const cropHeight = clamp(cropRect.height, minH, 1);
  const cropX = clamp(cropRect.x, 0, 1 - cropWidth);
  const cropY = clamp(cropRect.y, 0, 1 - cropHeight);
  return {
    x: cropX,
    y: cropY,
    width: cropWidth,
    height: cropHeight,
  };
}
function fitAspectRectToBounds({
  rect,
  handle: handle2,
  normRatio,
  minW,
  minH,
}) {
  let { x: cropX, y: cropY, width, height } = rect;
  if (handle2 === "l" || handle2 === "r") {
    const centerY = cropY + height / 2;
    const right = cropX + width;
    const maxHeightFromCenter = 2 * Math.min(centerY, 1 - centerY);
    const maxWidthFromCenter = maxHeightFromCenter * normRatio;
    const maxWidthFromEdge = handle2 === "r" ? 1 - cropX : right;
    const maxWidth = Math.max(
      Math.min(maxWidthFromEdge, maxWidthFromCenter),
      minW,
    );
    width = clamp(width, minW, maxWidth);
    height = width / normRatio;
    cropY = centerY - height / 2;
    if (handle2 === "l") cropX = right - width;
  } else if (handle2 === "t" || handle2 === "b") {
    const centerX = cropX + width / 2;
    const bottom = cropY + height;
    const maxWidthFromCenter = 2 * Math.min(centerX, 1 - centerX);
    const maxHeightFromCenter = maxWidthFromCenter / normRatio;
    const maxHeightFromEdge = handle2 === "b" ? 1 - cropY : bottom;
    const maxHeight = Math.max(
      Math.min(maxHeightFromEdge, maxHeightFromCenter),
      minH,
    );
    height = clamp(height, minH, maxHeight);
    width = height * normRatio;
    cropX = centerX - width / 2;
    if (handle2 === "t") cropY = bottom - height;
  } else {
    const right = cropX + width;
    const bottom = cropY + height;
    const anchorX = handle2 === "tl" || handle2 === "bl" ? right : cropX;
    const anchorY = handle2 === "tl" || handle2 === "tr" ? bottom : cropY;
    const maxWidthFromEdge =
      handle2 === "tl" || handle2 === "bl" ? anchorX : 1 - anchorX;
    const maxHeightFromEdge =
      handle2 === "tl" || handle2 === "tr" ? anchorY : 1 - anchorY;
    const maxWidth = Math.max(
      Math.min(maxWidthFromEdge, maxHeightFromEdge * normRatio),
      minW,
    );
    width = clamp(width, minW, maxWidth);
    height = width / normRatio;
    if (handle2 === "tl" || handle2 === "bl") cropX = anchorX - width;
    else cropX = anchorX;
    if (handle2 === "tl" || handle2 === "tr") cropY = anchorY - height;
    else cropY = anchorY;
  }
  return clampCropRect({
    x: cropX,
    y: cropY,
    width,
    height,
  });
}
export function calcCropRect({
  initialRect,
  deltaX,
  deltaY,
  handle: handle2,
  aspectRatio,
  containerWidth,
  containerHeight,
}) {
  let minW = minCropFraction(containerWidth);
  let minH = minCropFraction(containerHeight);
  if (
    aspectRatio != null &&
    aspectRatio > 0 &&
    containerWidth &&
    containerHeight
  ) {
    const minWFromH = (HANDLE_SIZE_PX * 2 * aspectRatio) / containerWidth;
    const minHFromW = (HANDLE_SIZE_PX * 2) / (aspectRatio * containerHeight);
    minW = Math.max(minW, minWFromH);
    minH = Math.max(minH, minHFromW);
  }
  if (handle2 === null) {
    return clampCropRect(
      {
        ...initialRect,
        x: initialRect.x + deltaX,
        y: initialRect.y + deltaY,
      },
      containerWidth,
      containerHeight,
    );
  }
  const { x: initialX, y: initialY, width: initialWidth, height: initialHeight } = initialRect;
  let left = initialX;
  let top2 = initialY;
  let right = initialX + initialWidth;
  let bottom = initialY + initialHeight;
  const movesLeft = handle2 === "tl" || handle2 === "bl" || handle2 === "l";
  const movesRight = handle2 === "tr" || handle2 === "br" || handle2 === "r";
  const movesTop = handle2 === "tl" || handle2 === "tr" || handle2 === "t";
  const movesBottom = handle2 === "bl" || handle2 === "br" || handle2 === "b";
  const isCorner = movesLeft !== movesRight && movesTop !== movesBottom;
  if (movesLeft) left += deltaX;
  if (movesRight) right += deltaX;
  if (movesTop) top2 += deltaY;
  if (movesBottom) bottom += deltaY;
  if (isCorner) {
    const rawW = right - left;
    const rawH = bottom - top2;
    if (rawW < minW || rawH < minH) {
      let horizontalScaleFactor = 1;
      let verticalScaleFactor = 1;
      const widthDelta = rawW - initialWidth;
      const heightDelta = rawH - initialHeight;
      if (rawW < minW && Math.abs(widthDelta) > 1e-6) {
        horizontalScaleFactor = (initialWidth - minW) / -widthDelta;
      }
      if (rawH < minH && Math.abs(heightDelta) > 1e-6) {
        verticalScaleFactor = (initialHeight - minH) / -heightDelta;
      }
      const resizeFactor = clamp(Math.min(horizontalScaleFactor, verticalScaleFactor), 0, 1);
      left = movesLeft ? initialX + deltaX * resizeFactor : initialX;
      top2 = movesTop ? initialY + deltaY * resizeFactor : initialY;
      right = movesRight ? initialX + initialWidth + deltaX * resizeFactor : initialX + initialWidth;
      bottom = movesBottom ? initialY + initialHeight + deltaY * resizeFactor : initialY + initialHeight;
    }
  }
  if (movesLeft) left = clamp(left, 0, right - minW);
  if (movesRight) right = clamp(right, left + minW, 1);
  if (movesTop) top2 = clamp(top2, 0, bottom - minH);
  if (movesBottom) bottom = clamp(bottom, top2 + minH, 1);
  let width = right - left;
  let height = bottom - top2;
  let cropX = left;
  let cropY = top2;
  if (aspectRatio != null && aspectRatio > 0) {
    const imageAspect =
      containerWidth && containerHeight ? containerWidth / containerHeight : 1;
    const normRatio = aspectRatio / imageAspect;
    const desiredH = width / normRatio;
    if (handle2 === "l" || handle2 === "r") {
      const centerY = cropY + height / 2;
      height = desiredH;
      cropY = centerY - height / 2;
    } else if (handle2 === "t" || handle2 === "b") {
      const centerX = cropX + width / 2;
      width = height * normRatio;
      cropX = centerX - width / 2;
    } else {
      const anchorBottom = cropY + height;
      height = desiredH;
      if (handle2 === "tl" || handle2 === "tr") cropY = anchorBottom - height;
    }
    ({
      x: cropX,
      y: cropY,
      width,
      height,
    } = fitAspectRectToBounds({
      rect: {
        x: cropX,
        y: cropY,
        width,
        height,
      },
      handle: handle2,
      normRatio,
      minW,
      minH,
    }));
  }
  cropX = clamp(cropX, 0, 1 - width);
  cropY = clamp(cropY, 0, 1 - height);
  return {
    x: cropX,
    y: cropY,
    width,
    height,
  };
}
