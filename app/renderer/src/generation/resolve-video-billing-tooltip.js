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
  const model = pricing.video.find((m3Value) => m3Value.modelID === modelId);
  if (!model) return void 0;
  for (const c3Value of model.videoCosts) {
    if (
      !videoCostMatchesNonResolutionFilters(
        c3Value,
        hasReferenceVideo,
        hasSound,
        fps,
      )
    )
      continue;
    const resMatch = matchesResolution(c3Value.resolutions, resolution);
    const dur = durationSec ?? 0;
    if (
      (c3Value.costPerSecond && c3Value.costPerSecond > 0 && resMatch) ||
      (!c3Value.resolutions?.length && c3Value.durations?.includes(dur)) ||
      (matchesResolution(c3Value.resolutions, resolution) &&
        c3Value.durations?.includes(dur))
    ) {
      return (
        c3Value.billingTooltip?.trim() || model.billingTooltip?.trim() || void 0
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
  const model = pricing.image.find((m3Value) => m3Value.modelID === modelId);
  if (!model) return void 0;
  if (resolution) {
    const resLower = resolution.toLowerCase();
    const qualLower = quality?.toLowerCase();
    for (const c3Value of model.imageCosts) {
      if (!c3Value.resolutions?.some((result) => result.toLowerCase() === resLower))
        continue;
      if (
        c3Value.qualities?.length &&
        (qualLower == null ||
          !c3Value.qualities.some((q) => q.toLowerCase() === qualLower))
      )
        continue;
      if (c3Value.realCost <= 0) return void 0;
      const billable = c3Value.refCountPrice
        ? Math.max(0, refCount - (c3Value.refCountFree ?? 0))
        : 0;
      const addOn =
        billable > 0 && c3Value.refCountPrice ? billable * c3Value.refCountPrice : 0;
      return c3Value.realCost + addOn;
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
