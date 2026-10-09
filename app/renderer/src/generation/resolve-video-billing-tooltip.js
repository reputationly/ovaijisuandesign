// resolve-video-billing-tooltip.js
import { matchesResolution } from "./select-content.jsx";

export function videoCostMatchesNonResolutionFilters(
  cost,
  hasReferenceVideo,
  hasSound,
  fps,
) {
  if (
    cost.hasReferenceVideo != null &&
    cost.hasReferenceVideo !== hasReferenceVideo
  )
    return false;
  if (cost.hasSound != null && cost.hasSound !== hasSound) return false;
  if (cost.fps?.length && (fps == null || !cost.fps.includes(fps)))
    return false;
  return true;
}

function referenceVideoBillingDuration(durationMs) {
  if (durationMs <= 0) return 0;
  const decisecond = Math.floor(durationMs / 100);
  return Math.ceil(decisecond / 10);
}

export function aggregateReferenceVideoDurations(durationsMs) {
  return durationsMs.reduce(
    (total, durationMs) => total + referenceVideoBillingDuration(durationMs),
    0,
  );
}

export function maxReferenceVideoDuration(durationsMs) {
  return durationsMs.reduce(
    (longest, durationMs) =>
      Math.max(longest, referenceVideoBillingDuration(durationMs)),
    0,
  );
}

export function resolveVideoBillingTooltip(
  pricing,
  modelId,
  resolution,
  durationSec,
  hasReferenceVideo = false,
  hasSound = false,
  fps,
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
    const dur = durationSec ?? 0;
    if (
      (c3.costPerSecond && c3.costPerSecond > 0 && resMatch) ||
      (!c3.resolutions?.length && c3.durations?.includes(dur)) ||
      (matchesResolution(c3.resolutions, resolution) &&
        c3.durations?.includes(dur))
    ) {
      return (
        c3.billingTooltip?.trim() || model.billingTooltip?.trim() || void 0
      );
    }
  }
  return model.billingTooltip?.trim() || void 0;
}

export function calcImageCost(
  pricing,
  modelId,
  resolution,
  quality,
  refCount = 0,
) {
  if (!pricing?.image) return void 0;
  const model = pricing.image.find((m3) => m3.modelID === modelId);
  if (!model) return void 0;
  if (resolution) {
    const resLower = resolution.toLowerCase();
    const qualLower = quality?.toLowerCase();
    for (const c3 of model.imageCosts) {
      if (!c3.resolutions?.some((r2) => r2.toLowerCase() === resLower))
        continue;
      if (
        c3.qualities?.length &&
        (qualLower == null ||
          !c3.qualities.some((q2) => q2.toLowerCase() === qualLower))
      )
        continue;
      if (c3.realCost <= 0) return void 0;
      const billable = c3.refCountPrice
        ? Math.max(0, refCount - (c3.refCountFree ?? 0))
        : 0;
      const addOn =
        billable > 0 && c3.refCountPrice ? billable * c3.refCountPrice : 0;
      return c3.realCost + addOn;
    }
  }
  return model.defaultCost > 0 ? model.defaultCost : void 0;
}

export function calcTTSCost(pricing, modelName, charCount) {
  const tts = pricing?.tts;
  if (!tts || charCount <= 0) return void 0;
  if (tts.turboModels?.includes(modelName)) {
    const rate = tts.turboCreditPerChar > 0 ? tts.turboCreditPerChar : 3e-3;
    return Math.ceil(charCount * rate);
  }
  if (tts.hdModels?.includes(modelName)) {
    const rate = tts.hdCreditPerChar > 0 ? tts.hdCreditPerChar : 5e-3;
    return Math.ceil(charCount * rate);
  }
  return void 0;
}

export function isPerMinuteCreditCost(value) {
  return typeof value === "object" && value?.kind === "per-minute";
}
