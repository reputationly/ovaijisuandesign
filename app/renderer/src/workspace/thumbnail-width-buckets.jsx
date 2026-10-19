import { withUrlSearchParams } from "./get-base-url.jsx";
export const THUMBNAIL_WIDTH_BUCKETS = [64, 128, 256, 512, 1024, 2048];

export const MAX_THUMBNAIL_DPR = 2;

export const MAX_THUMBNAIL_WIDTH = 2048;

export function thumbnailWidth(displayWidth) {
  const deviceDpr = typeof window !== "undefined" ? window.devicePixelRatio : 1;
  const dpr = Math.min(
    typeof deviceDpr === "number" && Number.isFinite(deviceDpr) && deviceDpr > 0 ? deviceDpr : 1,
    MAX_THUMBNAIL_DPR,
  );
  const physicalWidth2 = Math.max(1, Math.ceil(displayWidth * dpr));
  return THUMBNAIL_WIDTH_BUCKETS.find((bucket) => physicalWidth2 <= bucket) ?? MAX_THUMBNAIL_WIDTH;
}

export function withThumbnail(url2, displayWidth, options2) {
  return withThumbnailWidth(url2, thumbnailWidth(displayWidth), options2);
}

export function withThumbnailWidth(url2, pixelWidth, options2) {
  if (!url2) return url2;
  return withUrlSearchParams(url2, {
    w: pixelWidth,
    thumbnail_format: options2?.format,
    thumbnail_fallback: options2?.fallback,
  });
}
