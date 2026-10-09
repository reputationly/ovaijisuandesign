// build-model-pricing-name-maps.js
import { LEGACY_HAILUO_MODEL_ALIASES } from "./normalize-skill-detail-metadata.js";
import { IMAGE_MODELS } from "./image-models.js";
import { VIDEO_MODELS } from "./video-models.js";
import { AUDIO_MODELS } from "./audio-models.js";

const PRICING_TO_PUBLIC_MODEL_EXCLUSIONS = new Set(["MiniMax-H3"]);

function buildModelPricingNameMaps() {
  const publicToPricing = new Map();
  const pricingToPublic = new Map();
  const add2 = (entry) => {
    const pricingModel = (
      entry.pricingId ??
      entry.model_name ??
      entry.id
    ).trim();
    if (!pricingModel) return;
    for (const rawPublicModel of [
      entry.id,
      entry.model_name,
      entry.publicToken,
      pricingModel,
    ]) {
      const publicModel = rawPublicModel?.trim();
      if (!publicModel) continue;
      publicToPricing.set(publicModel, pricingModel);
    }
    const preferredPublicModel = (
      entry.model_name ??
      entry.publicToken ??
      entry.id
    ).trim();
    if (
      preferredPublicModel &&
      !PRICING_TO_PUBLIC_MODEL_EXCLUSIONS.has(pricingModel) &&
      !pricingToPublic.has(pricingModel)
    ) {
      pricingToPublic.set(pricingModel, preferredPublicModel);
    }
  };
  for (const entry of [...IMAGE_MODELS, ...VIDEO_MODELS, ...AUDIO_MODELS]) {
    add2(entry);
  }
  for (const alias of LEGACY_HAILUO_MODEL_ALIASES) {
    for (const publicModel of [...alias.publicModels, alias.pricingModel]) {
      publicToPricing.set(publicModel, alias.pricingModel);
    }
    if (
      !PRICING_TO_PUBLIC_MODEL_EXCLUSIONS.has(alias.pricingModel) &&
      !pricingToPublic.has(alias.pricingModel)
    ) {
      pricingToPublic.set(alias.pricingModel, alias.preferredPublicModel);
    }
  }
  return {
    publicToPricing,
    pricingToPublic,
  };
}

let cachedModelPricingNameMaps = null;

function getModelPricingNameMaps() {
  cachedModelPricingNameMaps ??= buildModelPricingNameMaps();
  return cachedModelPricingNameMaps;
}

export function resolveModelPricingName(model) {
  const normalized = model.trim();
  if (!normalized) return normalized;
  return (
    getModelPricingNameMaps().publicToPricing.get(normalized) ?? normalized
  );
}
