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
function clampCropRect(r2, containerWidth, containerHeight) {
  const minW = minCropFraction(containerWidth);
  const minH = minCropFraction(containerHeight);
  const w3 = clamp(r2.width, minW, 1);
  const h2 = clamp(r2.height, minH, 1);
  const x2 = clamp(r2.x, 0, 1 - w3);
  const y4 = clamp(r2.y, 0, 1 - h2);
  return {
    x: x2,
    y: y4,
    width: w3,
    height: h2,
  };
}
function fitAspectRectToBounds({
  rect,
  handle: handle2,
  normRatio,
  minW,
  minH,
}) {
  let { x: x2, y: y4, width, height } = rect;
  if (handle2 === "l" || handle2 === "r") {
    const centerY = y4 + height / 2;
    const right = x2 + width;
    const maxHeightFromCenter = 2 * Math.min(centerY, 1 - centerY);
    const maxWidthFromCenter = maxHeightFromCenter * normRatio;
    const maxWidthFromEdge = handle2 === "r" ? 1 - x2 : right;
    const maxWidth = Math.max(
      Math.min(maxWidthFromEdge, maxWidthFromCenter),
      minW,
    );
    width = clamp(width, minW, maxWidth);
    height = width / normRatio;
    y4 = centerY - height / 2;
    if (handle2 === "l") x2 = right - width;
  } else if (handle2 === "t" || handle2 === "b") {
    const centerX = x2 + width / 2;
    const bottom = y4 + height;
    const maxWidthFromCenter = 2 * Math.min(centerX, 1 - centerX);
    const maxHeightFromCenter = maxWidthFromCenter / normRatio;
    const maxHeightFromEdge = handle2 === "b" ? 1 - y4 : bottom;
    const maxHeight = Math.max(
      Math.min(maxHeightFromEdge, maxHeightFromCenter),
      minH,
    );
    height = clamp(height, minH, maxHeight);
    width = height * normRatio;
    x2 = centerX - width / 2;
    if (handle2 === "t") y4 = bottom - height;
  } else {
    const right = x2 + width;
    const bottom = y4 + height;
    const anchorX = handle2 === "tl" || handle2 === "bl" ? right : x2;
    const anchorY = handle2 === "tl" || handle2 === "tr" ? bottom : y4;
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
    if (handle2 === "tl" || handle2 === "bl") x2 = anchorX - width;
    else x2 = anchorX;
    if (handle2 === "tl" || handle2 === "tr") y4 = anchorY - height;
    else y4 = anchorY;
  }
  return clampCropRect({
    x: x2,
    y: y4,
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
  const { x: ix, y: iy, width: iw, height: ih } = initialRect;
  let left = ix;
  let top2 = iy;
  let right = ix + iw;
  let bottom = iy + ih;
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
      let fX = 1;
      let fY = 1;
      const dw = rawW - iw;
      const dh = rawH - ih;
      if (rawW < minW && Math.abs(dw) > 1e-6) {
        fX = (iw - minW) / -dw;
      }
      if (rawH < minH && Math.abs(dh) > 1e-6) {
        fY = (ih - minH) / -dh;
      }
      const f2 = clamp(Math.min(fX, fY), 0, 1);
      left = movesLeft ? ix + deltaX * f2 : ix;
      top2 = movesTop ? iy + deltaY * f2 : iy;
      right = movesRight ? ix + iw + deltaX * f2 : ix + iw;
      bottom = movesBottom ? iy + ih + deltaY * f2 : iy + ih;
    }
  }
  if (movesLeft) left = clamp(left, 0, right - minW);
  if (movesRight) right = clamp(right, left + minW, 1);
  if (movesTop) top2 = clamp(top2, 0, bottom - minH);
  if (movesBottom) bottom = clamp(bottom, top2 + minH, 1);
  let width = right - left;
  let height = bottom - top2;
  let x2 = left;
  let y4 = top2;
  if (aspectRatio != null && aspectRatio > 0) {
    const imageAspect =
      containerWidth && containerHeight ? containerWidth / containerHeight : 1;
    const normRatio = aspectRatio / imageAspect;
    const desiredH = width / normRatio;
    if (handle2 === "l" || handle2 === "r") {
      const cy = y4 + height / 2;
      height = desiredH;
      y4 = cy - height / 2;
    } else if (handle2 === "t" || handle2 === "b") {
      const cx2 = x2 + width / 2;
      width = height * normRatio;
      x2 = cx2 - width / 2;
    } else {
      const anchorBottom = y4 + height;
      height = desiredH;
      if (handle2 === "tl" || handle2 === "tr") y4 = anchorBottom - height;
    }
    ({
      x: x2,
      y: y4,
      width,
      height,
    } = fitAspectRectToBounds({
      rect: {
        x: x2,
        y: y4,
        width,
        height,
      },
      handle: handle2,
      normRatio,
      minW,
      minH,
    }));
  }
  x2 = clamp(x2, 0, 1 - width);
  y4 = clamp(y4, 0, 1 - height);
  return {
    x: x2,
    y: y4,
    width,
    height,
  };
}
