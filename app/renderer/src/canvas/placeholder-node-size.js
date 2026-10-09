// placeholder-node-size.js
import {
  AUDIO_CARD_SIZE,
  computeNodeSize,
  defaultNodeSizeForType,
  IMAGE_CARD_DEFAULT_SIZE,
  isIdleEmptyVideoNode,
  parseAspectRatio,
  VIDEO_EMPTY_CARD_SIZE,
} from "./compute-group-bounds-from-children.js";

const PLACEHOLDER_CARD_WIDTH = 350;

const PLACEHOLDER_CARD_HEIGHTS = {
  pending: 188,
  queue_paused: 188,
  generating: 248,
  error: 216,
  // Recovery-retained failure renders the same error chrome as `error`.
  recoverable_error: 216,
  // Unknown submit outcome uses neutral chrome with the same footprint.
  status_unknown: 216,
};

export function placeholderNodeSize(status, aspectRatio, mediaType) {
  if (
    status !== "error" &&
    status !== "recoverable_error" &&
    status !== "status_unknown"
  ) {
    if (mediaType === "audio") return AUDIO_CARD_SIZE;
    const ratio = parseAspectRatio(aspectRatio);
    if (ratio) {
      const media = computeNodeSize(ratio.w, ratio.h);
      if (media) return media;
    }
    if (mediaType === "image" || mediaType === "video")
      return IMAGE_CARD_DEFAULT_SIZE;
  }
  const height =
    PLACEHOLDER_CARD_HEIGHTS[status] ?? PLACEHOLDER_CARD_HEIGHTS.generating;
  return {
    width: PLACEHOLDER_CARD_WIDTH,
    height,
  };
}

export function resolveNodeFootprint(node2, mode2, fallback) {
  if (isIdleEmptyVideoNode(node2)) {
    return VIDEO_EMPTY_CARD_SIZE;
  }
  if (node2.type === "placeholder") {
    const data2 = node2.data;
    return placeholderNodeSize(
      data2?.status,
      data2?.aspectRatio,
      data2?.mediaType,
    );
  }
  return (
    node2.sizes?.[mode2] ??
    node2.size ??
    fallback ??
    defaultNodeSizeForType(node2.type)
  );
}
