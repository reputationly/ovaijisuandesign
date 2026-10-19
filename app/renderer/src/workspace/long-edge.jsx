import { __jsx } from "../shared/jsx-runtime.js";
export function longEdge(width, height) {
  if (!width || !height || width <= 0 || height <= 0) return void 0;
  return Math.max(width, height);
}
export const DESIGN_CONTEXT_OPEN = "<design_context>\n";
export const DESIGN_CONTEXT_CLOSE = "\n</design_context>";
export const LEADING_CONTEXT_RE = /^<design_context>\n([\s\S]*?)\n<\/design_context>(?:\n\n([\s\S]*))?$/;
export function prependHiddenContext(content2, context) {
  const existing2 = LEADING_CONTEXT_RE.exec(content2);
  const body2 = existing2 ? `${context}

${existing2[1]}` : context;
  return `${DESIGN_CONTEXT_OPEN}${body2}${DESIGN_CONTEXT_CLOSE}

${existing2 ? existing2[2] ?? "" : content2}`;
}
export function mapStoryboardPricing(raw2) {
  if (!raw2 || typeof raw2 !== "object" || Array.isArray(raw2)) return void 0;
  const creditCost = raw2.creditCost;
  return typeof creditCost === "number" && Number.isFinite(creditCost) && creditCost >= 0 ? {
    creditCost
  } : void 0;
}
export function mapH3ContextIrPricing(raw2) {
  if (!raw2 || typeof raw2 !== "object" || Array.isArray(raw2)) return void 0;
  const value = raw2;
  const input = value.input_credit_per_million_tokens;
  const output2 = value.output_credit_per_million_tokens;
  if (typeof input !== "number" || !Number.isFinite(input) || input < 0 || typeof output2 !== "number" || !Number.isFinite(output2) || output2 < 0) {
    return void 0;
  }
  return {
    inputCreditPerMillionTokens: input,
    outputCreditPerMillionTokens: output2
  };
}
export function mapPricingResponse(raw2) {
  const ttsRaw = raw2.tts;
  const musicRaw = raw2.music;
  return {
    enabled: raw2.enabled,
    video: raw2.video ?? [],
    image: (raw2.image ?? []).map(model => ({
      ...model,
      // Fixed-price models may omit detailed costs in the cloud response.
      imageCosts: Array.isArray(model.imageCosts) ? model.imageCosts : []
    })),
    tts: ttsRaw ? {
      hdCreditPerChar: ttsRaw.hd_credit_per_char ?? 1,
      turboCreditPerChar: ttsRaw.turbo_credit_per_char ?? 0.6,
      hdModels: ttsRaw.hd_models ?? [],
      turboModels: ttsRaw.turbo_models ?? []
    } : void 0,
    music: musicRaw ? {
      oncePrice: musicRaw.once_price ?? 0,
      elevenLabsMusicV1PerMinute: musicRaw["11labs_music_v1_per_minute"] ?? 0,
      elevenLabsMusicV2PerMinute: musicRaw["11labs_music_v2_per_minute"] ?? 0
    } : void 0,
    text: raw2.text ?? void 0,
    tool: raw2.tool ?? [],
    h3ContextIr: mapH3ContextIrPricing(raw2.h3_context_ir),
    storyboard: mapStoryboardPricing(raw2.storyboard),
    promotionEndUnix: typeof raw2.promotionEndUnix === "number" ? raw2.promotionEndUnix : void 0,
    sessionStatsSinceMs: typeof raw2.session_stats_since_ms === "number" ? raw2.session_stats_since_ms : void 0
  };
}