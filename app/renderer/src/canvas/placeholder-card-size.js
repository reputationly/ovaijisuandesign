import { placeholderNodeSize } from "./placeholder-node-size.js";

function isUsableDisplaySize(value) {
  if (!value || typeof value !== "object") return false;
  const size2 = value;
  return (
    typeof size2.width === "number" &&
    Number.isFinite(size2.width) &&
    size2.width > 0 &&
    typeof size2.height === "number" &&
    Number.isFinite(size2.height) &&
    size2.height > 0
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
