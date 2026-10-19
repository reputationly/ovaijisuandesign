import { default as reactExports } from "react";
export function clamp$d(value, min2, max2) {
  return Math.max(min2, Math.min(max2, value));
}
export const ASPECT_RATIOS = {
  free: null,
  "1:1": 1,
  "4:3": 4 / 3,
  "3:4": 3 / 4,
  "16:9": 16 / 9,
  "9:16": 9 / 16
};
export const MIN_CROP_RATIO = 0.05;
export const HANDLE_SIZE_PX = 24;
export const MIN_CROP_PX = HANDLE_SIZE_PX * 2;
export const DEFAULT_CROP = {
  x: 0.1,
  y: 0.1,
  width: 0.8,
  height: 0.8
};
export function minCropFraction(containerPx) {
  if (containerPx && containerPx > 0) {
    return Math.max(MIN_CROP_RATIO, MIN_CROP_PX / containerPx);
  }
  return MIN_CROP_RATIO;
}
export function clampCropRect(r2, containerWidth, containerHeight) {
  const minW = minCropFraction(containerWidth);
  const minH = minCropFraction(containerHeight);
  const w3 = clamp$d(r2.width, minW, 1);
  const h2 = clamp$d(r2.height, minH, 1);
  const x2 = clamp$d(r2.x, 0, 1 - w3);
  const y4 = clamp$d(r2.y, 0, 1 - h2);
  return {
    x: x2,
    y: y4,
    width: w3,
    height: h2
  };
}
export function fitAspectRectToBounds({
  rect,
  handle: handle2,
  normRatio,
  minW,
  minH
}) {
  let {
    x: x2,
    y: y4,
    width,
    height
  } = rect;
  if (handle2 === "l" || handle2 === "r") {
    const centerY = y4 + height / 2;
    const right = x2 + width;
    const maxHeightFromCenter = 2 * Math.min(centerY, 1 - centerY);
    const maxWidthFromCenter = maxHeightFromCenter * normRatio;
    const maxWidthFromEdge = handle2 === "r" ? 1 - x2 : right;
    const maxWidth = Math.max(Math.min(maxWidthFromEdge, maxWidthFromCenter), minW);
    width = clamp$d(width, minW, maxWidth);
    height = width / normRatio;
    y4 = centerY - height / 2;
    if (handle2 === "l") x2 = right - width;
  } else if (handle2 === "t" || handle2 === "b") {
    const centerX = x2 + width / 2;
    const bottom = y4 + height;
    const maxWidthFromCenter = 2 * Math.min(centerX, 1 - centerX);
    const maxHeightFromCenter = maxWidthFromCenter / normRatio;
    const maxHeightFromEdge = handle2 === "b" ? 1 - y4 : bottom;
    const maxHeight = Math.max(Math.min(maxHeightFromEdge, maxHeightFromCenter), minH);
    height = clamp$d(height, minH, maxHeight);
    width = height * normRatio;
    x2 = centerX - width / 2;
    if (handle2 === "t") y4 = bottom - height;
  } else {
    const right = x2 + width;
    const bottom = y4 + height;
    const anchorX = handle2 === "tl" || handle2 === "bl" ? right : x2;
    const anchorY = handle2 === "tl" || handle2 === "tr" ? bottom : y4;
    const maxWidthFromEdge = handle2 === "tl" || handle2 === "bl" ? anchorX : 1 - anchorX;
    const maxHeightFromEdge = handle2 === "tl" || handle2 === "tr" ? anchorY : 1 - anchorY;
    const maxWidth = Math.max(Math.min(maxWidthFromEdge, maxHeightFromEdge * normRatio), minW);
    width = clamp$d(width, minW, maxWidth);
    height = width / normRatio;
    if (handle2 === "tl" || handle2 === "bl") x2 = anchorX - width;else x2 = anchorX;
    if (handle2 === "tl" || handle2 === "tr") y4 = anchorY - height;else y4 = anchorY;
  }
  return clampCropRect({
    x: x2,
    y: y4,
    width,
    height
  });
}
export function calcCropRect({
  initialRect,
  deltaX,
  deltaY,
  handle: handle2,
  aspectRatio: aspectRatio2,
  containerWidth,
  containerHeight
}) {
  let minW = minCropFraction(containerWidth);
  let minH = minCropFraction(containerHeight);
  if (aspectRatio2 != null && aspectRatio2 > 0 && containerWidth && containerHeight) {
    const minWFromH = HANDLE_SIZE_PX * 2 * aspectRatio2 / containerWidth;
    const minHFromW = HANDLE_SIZE_PX * 2 / (aspectRatio2 * containerHeight);
    minW = Math.max(minW, minWFromH);
    minH = Math.max(minH, minHFromW);
  }
  if (handle2 === null) {
    return clampCropRect({
      ...initialRect,
      x: initialRect.x + deltaX,
      y: initialRect.y + deltaY
    }, containerWidth, containerHeight);
  }
  const {
    x: ix,
    y: iy,
    width: iw,
    height: ih
  } = initialRect;
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
      const f2 = clamp$d(Math.min(fX, fY), 0, 1);
      left = movesLeft ? ix + deltaX * f2 : ix;
      top2 = movesTop ? iy + deltaY * f2 : iy;
      right = movesRight ? ix + iw + deltaX * f2 : ix + iw;
      bottom = movesBottom ? iy + ih + deltaY * f2 : iy + ih;
    }
  }
  if (movesLeft) left = clamp$d(left, 0, right - minW);
  if (movesRight) right = clamp$d(right, left + minW, 1);
  if (movesTop) top2 = clamp$d(top2, 0, bottom - minH);
  if (movesBottom) bottom = clamp$d(bottom, top2 + minH, 1);
  let width = right - left;
  let height = bottom - top2;
  let x2 = left;
  let y4 = top2;
  if (aspectRatio2 != null && aspectRatio2 > 0) {
    const imageAspect = containerWidth && containerHeight ? containerWidth / containerHeight : 1;
    const normRatio = aspectRatio2 / imageAspect;
    const desiredH = width / normRatio;
    if (handle2 === "l" || handle2 === "r") {
      const cy = y4 + height / 2;
      height = desiredH;
      y4 = cy - height / 2;
    } else if (handle2 === "t" || handle2 === "b") {
      const cx = x2 + width / 2;
      width = height * normRatio;
      x2 = cx - width / 2;
    } else {
      const anchorBottom = y4 + height;
      height = desiredH;
      if (handle2 === "tl" || handle2 === "tr") y4 = anchorBottom - height;
    }
    ({
      x: x2,
      y: y4,
      width,
      height
    } = fitAspectRectToBounds({
      rect: {
        x: x2,
        y: y4,
        width,
        height
      },
      handle: handle2,
      normRatio,
      minW,
      minH
    }));
  }
  x2 = clamp$d(x2, 0, 1 - width);
  y4 = clamp$d(y4, 0, 1 - height);
  return {
    x: x2,
    y: y4,
    width,
    height
  };
}
export function cropImageToBlob(imageSrc, cropRect, originalWidth, originalHeight) {
  return new Promise((resolve, reject2) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const sx = Math.round(cropRect.x * originalWidth);
      const sy = Math.round(cropRect.y * originalHeight);
      const sw = Math.round(cropRect.width * originalWidth);
      const sh = Math.round(cropRect.height * originalHeight);
      const canvas = document.createElement("canvas");
      canvas.width = sw;
      canvas.height = sh;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject2(new Error("Failed to get canvas 2d context"));
        return;
      }
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
      canvas.toBlob(blob => {
        if (blob) resolve(blob);else reject2(new Error("canvas.toBlob returned null"));
      }, "image/png", 1);
    };
    img.onerror = () => reject2(new Error(`Failed to load image: ${imageSrc}`));
    img.src = imageSrc;
  });
}
export function cropRectForAspectRatio(ratio, containerWidth, containerHeight) {
  if (ratio == null) return DEFAULT_CROP;
  const imageAspect = containerWidth && containerHeight ? containerWidth / containerHeight : 1;
  const normRatio = ratio / imageAspect;
  let w3;
  let h2;
  if (normRatio >= 1) {
    w3 = 0.8;
    h2 = w3 / normRatio;
    if (h2 > 0.8) {
      h2 = 0.8;
      w3 = h2 * normRatio;
    }
  } else {
    h2 = 0.8;
    w3 = h2 * normRatio;
    if (w3 > 0.8) {
      w3 = 0.8;
      h2 = w3 / normRatio;
    }
  }
  return {
    x: (1 - w3) / 2,
    y: (1 - h2) / 2,
    width: w3,
    height: h2
  };
}
export function useImageCrop(containerWidth, containerHeight) {
  const [cropRect, setCropRect] = reactExports.useState(DEFAULT_CROP);
  const [aspectRatio2, setAspectRatioState] = reactExports.useState("free");
  const [isDragging2, setIsDragging] = reactExports.useState(false);
  const [activeHandle, setActiveHandle] = reactExports.useState(null);
  const dragRef = reactExports.useRef(null);
  const rafRef = reactExports.useRef(null);
  const latestRef = reactExports.useRef({
    containerWidth,
    containerHeight,
    aspectRatio: aspectRatio2
  });
  latestRef.current = {
    containerWidth,
    containerHeight,
    aspectRatio: aspectRatio2
  };
  const handleMove = reactExports.useCallback(e2 => {
    const drag2 = dragRef.current;
    if (!drag2) return;
    const {
      containerWidth: cw,
      containerHeight: ch,
      aspectRatio: ar
    } = latestRef.current;
    if (!cw || !ch) return;
    const deltaX = (e2.clientX - drag2.startX) / cw;
    const deltaY = (e2.clientY - drag2.startY) / ch;
    const numericRatio = ASPECT_RATIOS[ar];
    const next2 = calcCropRect({
      initialRect: drag2.initialRect,
      deltaX,
      deltaY,
      handle: drag2.handle,
      aspectRatio: numericRatio,
      containerWidth: cw,
      containerHeight: ch
    });
    setCropRect(next2);
  }, []);
  reactExports.useEffect(() => {
    if (!isDragging2) return;
    let pendingEvent = null;
    const onMove = e2 => {
      if (e2.cancelable) e2.preventDefault();
      pendingEvent = e2;
      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null;
          if (pendingEvent) {
            handleMove(pendingEvent);
            pendingEvent = null;
          }
        });
      }
    };
    const onUp = () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (pendingEvent) {
        handleMove(pendingEvent);
        pendingEvent = null;
      }
      setIsDragging(false);
      setActiveHandle(null);
      dragRef.current = null;
    };
    window.addEventListener("pointermove", onMove, {
      passive: false
    });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [isDragging2, handleMove]);
  const handlePointerDown = reactExports.useCallback((e2, handle2 = null) => {
    if (!e2.isPrimary) return;
    e2.stopPropagation();
    e2.preventDefault();
    dragRef.current = {
      startX: e2.clientX,
      startY: e2.clientY,
      initialRect: {
        ...cropRect
      },
      handle: handle2
    };
    setIsDragging(true);
    setActiveHandle(handle2);
  }, [cropRect]);
  const setAspectRatio = reactExports.useCallback(preset2 => {
    setAspectRatioState(preset2);
    const ratio = ASPECT_RATIOS[preset2];
    const {
      containerWidth: cw,
      containerHeight: ch
    } = latestRef.current;
    setCropRect(cropRectForAspectRatio(ratio, cw, ch));
  }, []);
  const reset2 = reactExports.useCallback(() => {
    setAspectRatioState("free");
    setCropRect(DEFAULT_CROP);
  }, []);
  return {
    cropRect,
    aspectRatio: aspectRatio2,
    isDragging: isDragging2,
    activeHandle,
    handlePointerDown,
    setAspectRatio,
    setCropRect,
    reset: reset2
  };
}