import { placeholderNodeSize } from "./placeholder-node-size.js";

function isUsableDisplaySize(value) {
  if (!value || typeof value !== "object") return false;
  const size = value;
  return (
    typeof size.width === "number" &&
    Number.isFinite(size.width) &&
    size.width > 0 &&
    typeof size.height === "number" &&
    Number.isFinite(size.height) &&
    size.height > 0
  );
}

export function resolvePlaceholderCardSize(
  status,
  aspectRatio,
  mediaType,
  placeholderDisplaySize,
) {
  if (isUsableDisplaySize(placeholderDisplaySize)) {
    return placeholderDisplaySize;
  }
  return placeholderNodeSize(status, aspectRatio, mediaType);
}
