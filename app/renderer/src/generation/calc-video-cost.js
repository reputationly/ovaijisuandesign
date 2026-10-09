// calc-video-cost.js
import { calcVideoCostBreakdown } from "./calc-video-cost-breakdown.js";

export function calcVideoCost(
  pricing,
  modelId,
  resolution,
  durationSec,
  hasReferenceVideo = false,
  hasSound = false,
  inputDurationSec = 0,
  fps,
  imageCount = 0,
) {
  return calcVideoCostBreakdown(
    pricing,
    modelId,
    resolution,
    durationSec,
    hasReferenceVideo,
    hasSound,
    inputDurationSec,
    fps,
    imageCount,
  )?.total;
}
