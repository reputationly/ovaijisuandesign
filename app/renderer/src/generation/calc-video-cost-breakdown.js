// calc-video-cost-breakdown.js
import { matchesResolution } from "./select-content.jsx";
import { videoCostMatchesNonResolutionFilters } from "./resolve-video-billing-tooltip.js";

const HAILUO03_DEFAULT_FREE_IMAGE_COUNT = 5;

const HAILUO03_MAX_DEFAULT_FREE_IMAGE_COUNT = 2;

function normalizePricingKey(key2) {
  return key2.trim().toLowerCase().replace(/_/g, "-");
}

function isHailuo03PricingId(modelId) {
  const normalized = normalizePricingKey(modelId);
  return normalized === "minimax-h3" || normalized.startsWith("minimax-h3-");
}

function isHailuo03MaxPricingId(modelId) {
  const normalized = normalizePricingKey(modelId);
  return (
    normalized === "minimax-h3-max" || normalized === "minimax-h3-max-turbo"
  );
}

function videoCostPerImageFree(modelId, cost) {
  if (typeof cost.costPerImageFree === "number")
    return Math.max(0, cost.costPerImageFree);
  if (isHailuo03MaxPricingId(modelId))
    return HAILUO03_MAX_DEFAULT_FREE_IMAGE_COUNT;
  return isHailuo03PricingId(modelId) ? HAILUO03_DEFAULT_FREE_IMAGE_COUNT : 0;
}

function createVideoCostBreakdown({
  modelId,
  cost,
  fixedCost = 0,
  costPerSecond = 0,
  referenceVideoCostPerSecond = costPerSecond,
  outputDurationSec = 0,
  inputVideoDurationSec = 0,
  imageCount,
}) {
  const inputImageCount = Math.max(0, imageCount);
  const costPerImage =
    cost?.costPerImage && cost.costPerImage > 0 ? cost.costPerImage : 0;
  const freeImageCount =
    costPerImage > 0 && cost ? videoCostPerImageFree(modelId, cost) : 0;
  const billableImageCount = Math.max(0, inputImageCount - freeImageCount);
  const imageCost = costPerImage * billableImageCount;
  return {
    total:
      fixedCost +
      costPerSecond * outputDurationSec +
      referenceVideoCostPerSecond * inputVideoDurationSec +
      imageCost,
    fixedCost,
    costPerSecond,
    ...(referenceVideoCostPerSecond !== costPerSecond
      ? {
          referenceVideoCostPerSecond,
        }
      : {}),
    outputDurationSec,
    inputVideoDurationSec,
    inputImageCount,
    freeImageCount,
    billableImageCount,
    costPerImage,
  };
}

export function calcVideoCostBreakdown(
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
  if (!pricing?.video) return void 0;
  const model = pricing.video.find((m3) => m3.modelID === modelId);
  if (!model) return void 0;
  for (const c3 of model.videoCosts) {
    if (
      !videoCostMatchesNonResolutionFilters(
        c3,
        hasReferenceVideo,
        hasSound,
        fps,
      )
    )
      continue;
    const resMatch = matchesResolution(c3.resolutions, resolution);
    if (c3.costPerSecond && c3.costPerSecond > 0 && resMatch) {
      if (!durationSec || durationSec <= 0) {
        return model.defaultCost > 0
          ? createVideoCostBreakdown({
              modelId,
              fixedCost: model.defaultCost,
              imageCount,
            })
          : void 0;
      }
      const chargeableInputDurationSec =
        hasReferenceVideo && inputDurationSec > 0 ? inputDurationSec : 0;
      const chargeableOutputDurationSec = Math.ceil(durationSec);
      const referenceVideoCostPerSecond =
        c3.costPerReferenceVideoSecond && c3.costPerReferenceVideoSecond > 0
          ? c3.costPerReferenceVideoSecond
          : c3.costPerSecond;
      return createVideoCostBreakdown({
        modelId,
        cost: c3,
        costPerSecond: c3.costPerSecond,
        referenceVideoCostPerSecond,
        outputDurationSec: chargeableOutputDurationSec,
        inputVideoDurationSec: chargeableInputDurationSec,
        imageCount,
      });
    }
    const dur = durationSec ?? 0;
    if (!c3.resolutions?.length && c3.durations?.includes(dur)) {
      return c3.realCost > 0
        ? createVideoCostBreakdown({
            modelId,
            cost: c3,
            fixedCost: c3.realCost,
            imageCount,
          })
        : void 0;
    }
    if (
      matchesResolution(c3.resolutions, resolution) &&
      c3.durations?.includes(dur)
    ) {
      return c3.realCost > 0
        ? createVideoCostBreakdown({
            modelId,
            cost: c3,
            fixedCost: c3.realCost,
            imageCount,
          })
        : void 0;
    }
  }
  return model.defaultCost > 0
    ? createVideoCostBreakdown({
        modelId,
        fixedCost: model.defaultCost,
        imageCount,
      })
    : void 0;
}
