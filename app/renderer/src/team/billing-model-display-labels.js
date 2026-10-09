// billing-model-display-labels.js
import { redactModelAliasesForDisplay } from "../generation/domestic-model-display-aliases.js";
import { getRuntimeConfig } from "../vendor.js";
import { normalizeLegacyModelId } from "../generation/normalize-skill-detail-metadata.js";
import { resolveModelDisplayName } from "../generation/text-models.js";

const LEGACY_MEDIA_DISPLAY_NAME = "媒体";

const AGENT_DISPLAY_NAME = "Agent";

const MEDIAKIT_ENHANCE_BILLING_KEY = "mediakit-enhance-video";

const MEDIAKIT_ENHANCE_BILLING_PREFIX = `${MEDIAKIT_ENHANCE_BILLING_KEY}-`;

const MINIMAX_H3_BILLING_KEY = "minimax-h3";

const MINIMAX_H3_MAX_BILLING_KEY = "minimax-h3-max";

const MINIMAX_H3_CONTEXT_IR_BILLING_KEY = `${MINIMAX_H3_BILLING_KEY}-context-ir`;

const BILLING_MODEL_DISPLAY_LABELS = {
  jimeng_remove_background: {
    key: "canvas.removeBg.label",
    fallback: "Remove Background",
  },
  jimeng_remove_bg: {
    key: "canvas.removeBg.label",
    fallback: "Remove Background",
  },
  "Remove Background": {
    key: "canvas.removeBg.label",
    fallback: "Remove Background",
  },
  "mediakit-erase-subtitle": {
    key: "canvas.eraseSubtitle.label",
    fallback: "Erase Subtitles",
  },
  "mediakit-asr": {
    key: "canvas.asr.label",
    fallback: "Subtitle generation",
  },
  "mediakit-separate-voice": {
    key: "canvas.extractAudio",
    fallback: "Extract audio",
  },
  image_super_resolution: {
    key: "canvas.superResolution.label",
    fallback: "HD",
  },
  video_super_resolution: {
    key: "canvas.superResolution.label",
    fallback: "HD",
  },
  h3_video_super_resolution: {
    key: "credits.minimaxH3SuperResolution",
    fallback: "MiniMax H3 Super Resolution",
  },
  "mediakit_enhance-professional": {
    key: "credits.imageEnhance",
    fallback: "Image HD",
  },
  // Seedream 图层分离的大/小两档模型，账单不区分规格，统一显示为同一个功能名
  "seedream-layer-decompose-large": {
    key: "credits.layerDecompose",
    fallback: "Split Layers",
  },
  "seedream-layer-decompose-small": {
    key: "credits.layerDecompose",
    fallback: "Split Layers",
  },
  "gpt-image-1.5": {
    fallback: "GPT Image 1.5",
  },
  "qwen-image-edit": {
    fallback: "Qwen Image Edit",
  },
  "kling-avatar": {
    fallback: "Kling Avatar",
  },
  "kling-lip-sync": {
    fallback: "Kling Lip Sync",
  },
  "kling-v1-5": {
    fallback: "Kling 1.5",
  },
  "kling-v2": {
    fallback: "Kling 2.0",
  },
  "kling-v2-1": {
    fallback: "Kling 2.1",
  },
  "kling-v2-5-turbo": {
    fallback: "Kling 2.5 Turbo",
  },
  "kling-v2-6": {
    fallback: "Kling 2.6",
  },
  "kling-v2-master": {
    fallback: "Kling 2.6 Master",
  },
  [MINIMAX_H3_CONTEXT_IR_BILLING_KEY]: {
    key: "credits.minimaxH3PromptExpansion",
    fallback: "MiniMax H3 Prompt Expansion",
  },
  "MiniMax-H3": {
    fallback: "MiniMax H3",
  },
  "music-gen": {
    key: "credits.musicTitle",
    fallback: "Music Generation",
  },
  voice_clone: {
    key: "canvas.voiceClone.nodeName",
    fallback: "Voice Clone",
  },
  "voice-clone": {
    key: "canvas.voiceClone.nodeName",
    fallback: "Voice Clone",
  },
  voice_design: {
    key: "canvas.voiceDesign.nodeName",
    fallback: "Voice Design",
  },
  "voice-design": {
    key: "canvas.voiceDesign.nodeName",
    fallback: "Voice Design",
  },
  voice_isolation: {
    key: "canvas.voiceIsolate",
    fallback: "Voice Isolator",
  },
  "voice-isolation": {
    key: "canvas.voiceIsolate",
    fallback: "Voice Isolator",
  },
  // Vibe DAG 扣费的展示名，由 workflow 侧 Apollo design_dag_config 按 logical_dag_id
  // 下发（DAG 的 model_key 恒为 "template"，只能靠 display_name 区分）。
  // 复用画布入口的既有文案 key，保证账单与用户在画布上看到的名字一致。
  anyangle: {
    key: "canvas.multiAngle",
    fallback: "AnyAngle",
  },
  relight: {
    key: "canvas.relight",
    fallback: "Relight",
  },
  storyboard: {
    key: "canvas.storyboardGrid",
    fallback: "Storyboard",
  },
};

function isMiniMaxH3BillingKey(model) {
  const normalized = model.toLowerCase();
  return (
    normalized === MINIMAX_H3_BILLING_KEY ||
    normalized.startsWith(`${MINIMAX_H3_BILLING_KEY}-`)
  );
}

function getBillingModelLabel(model, t2, region) {
  const normalized = model?.trim();
  if (!normalized) return void 0;
  const normalizedBillingKey = normalized.toLowerCase();
  if (normalizedBillingKey === MINIMAX_H3_MAX_BILLING_KEY) {
    return t2
      ? t2("credits.minimaxH3Max", {
          defaultValue: "MiniMax H3 Max",
        })
      : "MiniMax H3 Max";
  }
  const label =
    BILLING_MODEL_DISPLAY_LABELS[normalized] ??
    // Vibe DAG 的展示名来自人工维护的 Apollo 配置，大小写不受代码约束
    // （"Relight" / "relight" 都可能写进去），所以精确匹配未命中时再按小写兜一次。
    BILLING_MODEL_DISPLAY_LABELS[normalizedBillingKey] ??
    (normalizedBillingKey === MINIMAX_H3_CONTEXT_IR_BILLING_KEY
      ? BILLING_MODEL_DISPLAY_LABELS[MINIMAX_H3_CONTEXT_IR_BILLING_KEY]
      : void 0) ??
    (normalized === MEDIAKIT_ENHANCE_BILLING_KEY ||
    normalized.startsWith(MEDIAKIT_ENHANCE_BILLING_PREFIX)
      ? {
          key: "canvas.enhanceVideo.label",
          fallback: "HD & FPS",
        }
      : void 0);
  if (label) {
    const fallback = redactModelAliasesForDisplay(label.fallback, region);
    return label.key && t2
      ? t2(label.key, {
          defaultValue: fallback,
        })
      : fallback;
  }
  return isMiniMaxH3BillingKey(normalized) ? "MiniMax H3" : void 0;
}

function normalizeCatalogMediaType(type2) {
  return type2.trim().toLowerCase() === "music"
    ? "audio"
    : type2.trim().toLowerCase();
}

function getCatalogModelDisplayName(metadata, models) {
  if (!models?.length) return void 0;
  if (!metadata.modelDisplayName.trim()) return void 0;
  const candidates2 = new Set(
    [metadata.modelDisplayName, metadata.modelKey]
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  );
  if (candidates2.size === 0) return void 0;
  const mediaType = normalizeCatalogMediaType(metadata.mediaType);
  const match2 = models.find((model) => {
    if (mediaType && normalizeCatalogMediaType(model.type) !== mediaType)
      return false;
    return [model.id, model.display_name, model.model_name].some((value) =>
      value ? candidates2.has(value.trim().toLowerCase()) : false,
    );
  });
  return match2?.display_name.trim() || void 0;
}

export function getBillingModelDisplayName(metadata, t2, models) {
  const isAgent =
    metadata.billingType.trim().toLowerCase() === "token" ||
    metadata.mediaType.trim().toLowerCase() === "agent";
  if (isAgent) {
    return t2
      ? t2("credits.tabAgent", {
          defaultValue: AGENT_DISPLAY_NAME,
        })
      : AGENT_DISPLAY_NAME;
  }
  const rawModelKey = metadata.modelKey.trim();
  const displayName2 = metadata.modelDisplayName.trim();
  const modelKey = rawModelKey || displayName2;
  const fallbackName = displayName2 || modelKey || LEGACY_MEDIA_DISPLAY_NAME;
  if (!modelKey) return fallbackName;
  const region = getRuntimeConfig().region;
  const catalogDisplayName = getCatalogModelDisplayName(metadata, models);
  if (catalogDisplayName)
    return redactModelAliasesForDisplay(catalogDisplayName, region);
  const billingModelLabel =
    getBillingModelLabel(modelKey, t2, region) ??
    getBillingModelLabel(metadata.modelDisplayName, t2, region);
  if (billingModelLabel) return billingModelLabel;
  if (displayName2 && (!rawModelKey || displayName2 !== rawModelKey)) {
    if (normalizeLegacyModelId(displayName2) !== displayName2) {
      return redactModelAliasesForDisplay(displayName2, region);
    }
    const mediaType2 = metadata.mediaType || "image";
    const resolvedByDisplay = resolveModelDisplayName(
      "",
      displayName2,
      region,
      mediaType2,
    );
    return redactModelAliasesForDisplay(resolvedByDisplay, region);
  }
  const mediaType = metadata.mediaType || "image";
  const resolved = resolveModelDisplayName("", modelKey, region, mediaType);
  if (resolved !== modelKey) return resolved;
  return redactModelAliasesForDisplay(fallbackName, region);
}
