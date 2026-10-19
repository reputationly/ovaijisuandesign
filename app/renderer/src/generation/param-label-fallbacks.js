// param-label-fallbacks.js
import { normalizeLegacyModelId } from "./normalize-skill-detail-metadata.js";
import { getDisabledOptions } from "./resolve-reference-texts.js";
import { ASPECT_RATIO_PARAM_KEYS } from "../media-editing/use-warn-missing-asset-meta.jsx";
import { isCanvasReferenceUri } from "../text-editor/table-document-to-llm-content.js";
import {
  getPopoverDraft,
  REFERENCE_PROMPT_PREAMBLE,
  REFERENCE_TEXT_CLOSE,
  REFERENCE_TEXT_OPEN,
  resolveActiveNodeDraft,
  USER_PROMPT_CLOSE,
  USER_PROMPT_OPEN,
} from "../canvas/is-reexecutable-generation-node.js";

function parseReferenceTextPrompt(prompt) {
  const prefix = `${REFERENCE_PROMPT_PREAMBLE}

${REFERENCE_TEXT_OPEN}`;
  if (!prompt.startsWith(prefix)) return void 0;
  const referenceOnlySuffix = REFERENCE_TEXT_CLOSE;
  const userSeparator = `${REFERENCE_TEXT_CLOSE}${USER_PROMPT_OPEN}`;
  if (prompt.endsWith(USER_PROMPT_CLOSE)) {
    const separatorIndex = prompt.lastIndexOf(userSeparator);
    if (separatorIndex < prefix.length) return void 0;
    return {
      referenceText: prompt.slice(prefix.length, separatorIndex),
      userPrompt: prompt.slice(
        separatorIndex + userSeparator.length,
        -USER_PROMPT_CLOSE.length,
      ),
    };
  }
  if (!prompt.endsWith(referenceOnlySuffix)) return void 0;
  return {
    referenceText: prompt.slice(prefix.length, -referenceOnlySuffix.length),
    userPrompt: "",
  };
}

const MODEL_PARAM_ALIAS_GROUPS = [ASPECT_RATIO_PARAM_KEYS];

const PARAM_I18N_KEYS = {
  aspect_ratio: "canvas.params.aspectRatio",
  audio: "canvas.params.generateAudio",
  audio_url: "canvas.params.audioUrl",
  background: "canvas.params.background",
  chaos: "canvas.params.chaos",
  clarity: "canvas.params.clarity",
  cover_feature_id: "canvas.params.coverFeatureId",
  duration: "canvas.params.duration",
  music_length_ms: "canvas.params.duration",
  emotion: "canvas.params.emotion",
  enable_sound: "canvas.params.sound",
  generate_audio: "canvas.params.generateAudio",
  image_mode: "canvas.params.imageMode",
  is_instrumental: "canvas.params.musicMode",
  keep_original_sound: "canvas.params.keepOriginalSound",
  lyrics: "canvas.params.lyrics",
  mode: "canvas.params.quality",
  output_format: "canvas.params.outputFormat",
  pitch: "canvas.params.pitch",
  quality: "canvas.params.imageQuality",
  ratio: "canvas.params.ratio",
  reference_type: "canvas.params.referenceType",
  resolution: "canvas.params.resolution",
  sample_rate: "canvas.params.sampleRate",
  sound: "canvas.params.sound",
  speed: "canvas.params.speed",
  stylize: "canvas.params.stylize",
  version: "canvas.params.version",
  voice_id: "canvas.params.voiceId",
  volume: "canvas.params.volume",
  weird: "canvas.params.weird",
};

const PARAM_LABEL_FALLBACKS = {
  aspect_ratio: "Aspect Ratio",
  audio: "Sound",
  audio_url: "Original Audio URL",
  background: "Background",
  chaos: "Chaos",
  clarity: "Clarity",
  cover_feature_id: "Cover Feature ID",
  duration: "Duration",
  music_length_ms: "Duration",
  emotion: "Emotion",
  enable_sound: "Sound",
  generate_audio: "With Audio",
  image_mode: "Generation Mode",
  is_instrumental: "Music Mode",
  keep_original_sound: "Keep Original Sound",
  lyrics: "Lyrics",
  mode: "Quality",
  output_format: "Output Format",
  pitch: "Pitch",
  quality: "Image Quality",
  ratio: "Aspect Ratio",
  reference_type: "Reference Type",
  resolution: "Resolution",
  sample_rate: "Sample Rate",
  sound: "Sound",
  speed: "Speed",
  stylize: "Stylize",
  version: "Version",
  voice_id: "Voice",
  volume: "Volume",
  weird: "Weird",
};

const PARAM_PLACEHOLDER_I18N_KEYS = {
  audio_url: "canvas.params.placeholder.audioUrl",
  cover_feature_id: "canvas.params.placeholder.coverFeatureId",
  lyrics: "canvas.params.placeholder.lyrics",
};

const PARAM_PLACEHOLDER_FALLBACKS = {
  audio_url: "https://... or Hilo workspace relative path",
  cover_feature_id: "Returned by preprocessing; leave empty for one-step mode",
  lyrics: "Optional lyrics",
};

const I18N_KEY_RE = /^[a-z][\w-]*(\.[\w-]+)+$/i;

const HAN_RE = new RegExp("\\p{Script=Han}", "u");

function humanizeParamKey(paramKey) {
  return paramKey
    .split("_")
    .filter(Boolean)
    .map((part) => {
      const upper = part.toUpperCase();
      if (upper === "URL" || upper === "ID") return upper;
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(" ");
}

export function paramI18nKey(paramKey, rawLabel) {
  return (
    PARAM_I18N_KEYS[paramKey] ??
    (rawLabel && I18N_KEY_RE.test(rawLabel) ? rawLabel : void 0)
  );
}

export function paramLabelFallback(paramKey, rawLabel) {
  if (PARAM_LABEL_FALLBACKS[paramKey]) return PARAM_LABEL_FALLBACKS[paramKey];
  if (rawLabel && !I18N_KEY_RE.test(rawLabel) && !HAN_RE.test(rawLabel))
    return rawLabel;
  return humanizeParamKey(paramKey);
}

export function paramPlaceholderI18nKey(paramKey) {
  return PARAM_PLACEHOLDER_I18N_KEYS[paramKey];
}

export function paramPlaceholderFallback(paramKey, rawPlaceholder) {
  if (PARAM_PLACEHOLDER_FALLBACKS[paramKey])
    return PARAM_PLACEHOLDER_FALLBACKS[paramKey];
  if (rawPlaceholder && !HAN_RE.test(rawPlaceholder)) return rawPlaceholder;
  return void 0;
}

function modelMatchesStoredId(model, storedModelId) {
  const id = normalizeLegacyModelId(storedModelId?.trim());
  if (!id) return false;
  return (
    model.id === id ||
    model.model_name === id ||
    model.pricingId === id ||
    model.name === id
  );
}

export function findModelByStoredId(models, storedModelId) {
  return models.find((model) => modelMatchesStoredId(model, storedModelId));
}

export function translateOptionValue(translate, value) {
  if (!value) return value;
  if (value === "auto" || value === "adaptive") {
    return translate("canvas.param.option.auto", {
      defaultValue: "Auto",
    });
  }
  return translate(`canvas.param.option.${value}`, {
    defaultValue: value,
  });
}

export function getDefaultParams(model) {
  const result = {};
  for (const [key, def] of Object.entries(model.params)) {
    result[key] = def.default;
  }
  return result;
}

function migrationSourceKeys(targetKey) {
  const aliasGroup = MODEL_PARAM_ALIAS_GROUPS.find((group) =>
    group.includes(targetKey),
  );
  if (!aliasGroup) return [targetKey];
  return [targetKey, ...aliasGroup.filter((key) => key !== targetKey)];
}

export function isPromotionActive(promotion, now = Date.now()) {
  if (!promotion) return false;
  const { startTime, endTime } = promotion;
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) return false;
  return now >= startTime && now <= endTime;
}

export function hasPromotionToastCopy(promotion) {
  return Boolean(promotion?.toast?.trim());
}

export function buildPromotionClickHandler(onPromotionToast) {
  if (!onPromotionToast) return void 0;
  return (model) => {
    if (!model.promotion) return;
    if (!hasPromotionToastCopy(model.promotion)) return;
    onPromotionToast({
      title: model.promotion.toastTitle,
      toast: model.promotion.toast,
    });
  };
}

export function enforceConstraints(params, model) {
  if (!model.paramConstraints?.length) return params;
  const result = {
    ...params,
  };
  let changed = true;
  while (changed) {
    changed = false;
    for (const [key, def] of Object.entries(model.params)) {
      if (def.type !== "select" || !def.options) continue;
      const disabled = getDisabledOptions(
        key,
        result,
        model.paramConstraints,
      );
      if (disabled.has(result[key])) {
        const fallback = def.options.find((option) => !disabled.has(option));
        if (fallback && fallback !== result[key]) {
          result[key] = fallback;
          changed = true;
        }
      }
    }
  }
  return result;
}

export function migrateParamsForModel(
  previousModel,
  nextModel,
  previousParams,
) {
  const result = getDefaultParams(nextModel);
  if (!previousModel) return enforceConstraints(result, nextModel);
  for (const [targetKey, targetDef] of Object.entries(nextModel.params)) {
    const sourceKey = migrationSourceKeys(targetKey).find(
      (key) =>
        previousModel.params[key] !== void 0 &&
        previousParams[key] !== void 0,
    );
    if (!sourceKey) continue;
    const value = previousParams[sourceKey];
    if (targetDef.type === "select" && !targetDef.options?.includes(value))
      continue;
    result[targetKey] = value;
  }
  return enforceConstraints(result, nextModel);
}

export function normalizeParamsForModel(model, params) {
  const result = getDefaultParams(model);
  for (const [key, value] of Object.entries(params ?? {})) {
    const def = model.params[key];
    if (!def) continue;
    if (def.type === "select" && def.options && !def.options.includes(value))
      continue;
    result[key] = value;
  }
  return enforceConstraints(result, model);
}

export function basename$c(path) {
  if (!path) return "";
  const parts = path.split("/");
  return parts[parts.length - 1] || path;
}

export function restoreDirectReferencePaths(saved, live) {
  return [
    ...new Set([
      ...(saved ?? []).filter(
        (path) => isCanvasReferenceUri(path) || live.includes(path),
      ),
      ...live,
    ]),
  ];
}

export function resolveDefaultReferencePaths(
  referencePaths,
  draftPaths,
  options,
) {
  const live = referencePaths ?? [];
  const ref = draftPaths?.some(isCanvasReferenceUri)
    ? restoreDirectReferencePaths(draftPaths, live)
    : live;
  if (options?.preserveDraftSlots && draftPaths) {
    const filledDraft = draftPaths.filter(Boolean);
    const remainingPathCounts = new Map();
    for (const path of ref) {
      remainingPathCounts.set(path, (remainingPathCounts.get(path) ?? 0) + 1);
    }
    for (const path of filledDraft) {
      const remaining = remainingPathCounts.get(path) ?? 0;
      if (remaining <= 1) remainingPathCounts.delete(path);
      else remainingPathCounts.set(path, remaining - 1);
    }
    const sameLiveReferences =
      filledDraft.length === ref.length && remainingPathCounts.size === 0;
    if (sameLiveReferences) return [...draftPaths];
  }
  return [...ref];
}

export function resolveDraftReferencePaths(referencePaths, draftPaths) {
  if (draftPaths !== void 0) return [...draftPaths];
  return [...(referencePaths ?? [])];
}

export function resolveEditableTextReferencePaths(
  referencePaths,
  liveEdgePaths,
  draftPaths,
) {
  const selected = draftPaths !== void 0 ? draftPaths : (referencePaths ?? []);
  return [
    ...new Set([
      ...selected.filter(Boolean),
      ...(liveEdgePaths ?? []).filter(Boolean),
    ]),
  ];
}

export function resolveActivePopoverDraft(data, key) {
  const status = data && typeof data === "object" ? data.status : void 0;
  const draft = resolveActiveNodeDraft(getPopoverDraft(data, key), status);
  if (!draft || (key !== "i2i" && key !== "i2v")) return draft;
  const parsed = parseReferenceTextPrompt(draft.prompt ?? "");
  if (!parsed) return draft;
  const sanitized = {
    ...draft,
    prompt: parsed.userPrompt,
  };
  delete sanitized.promptJson;
  return sanitized;
}

const DERIVED_REFERENCE_PARAM_KEYS = new Set([
  "reference_images",
  "reference_videos",
  "reference_audios",
  "sound_file",
  "video_url",
]);

export function stripDerivedReferenceParams(params) {
  if (!params) return params;
  let next;
  for (const key of DERIVED_REFERENCE_PARAM_KEYS) {
    if (key in params) {
      next ??= {
        ...params,
      };
      delete next[key];
    }
  }
  return next ?? params;
}

function stringArraysEqual(leftArray = [], rightArray = []) {
  if (leftArray.length !== rightArray.length) return false;
  for (let index = 0; index < leftArray.length; index++) {
    if (leftArray[index] !== rightArray[index]) return false;
  }
  return true;
}

function stringMapsEqual(leftMap = {}, rightMap = {}) {
  const aKeys = Object.keys(leftMap);
  if (aKeys.length !== Object.keys(rightMap).length) return false;
  for (const key of aKeys) {
    if (leftMap[key] !== rightMap[key]) return false;
  }
  return true;
}

export function buildOriginalGenerationDraft(
  prompt,
  modelId,
  params,
  imagePaths,
) {
  const hasPrompt = typeof prompt === "string";
  const hasModel = typeof modelId === "string" && modelId.length > 0;
  const hasParams = !!params && Object.keys(params).length > 0;
  const hasImagePaths = imagePaths.length > 0;
  if (!hasPrompt && !hasModel && !hasParams && !hasImagePaths) return void 0;
  return {
    ...(hasPrompt
      ? {
          prompt,
        }
      : {}),
    ...(hasModel
      ? {
          modelId,
        }
      : {}),
    ...(hasParams
      ? {
          params,
        }
      : {}),
    ...(hasImagePaths
      ? {
          imagePaths: [...imagePaths],
        }
      : {}),
  };
}

export function draftOverridesOriginalGeneration(draft, original) {
  if (!draft || !original) return false;
  if (
    typeof draft.prompt === "string" &&
    draft.prompt.trim().length > 0 &&
    draft.prompt.trim() !== (original.prompt ?? "").trim()
  ) {
    return true;
  }
  if (
    typeof draft.modelId === "string" &&
    draft.modelId.length > 0 &&
    draft.modelId !== original.modelId
  ) {
    return true;
  }
  if (draft.params && !stringMapsEqual(draft.params, original.params ?? {})) {
    return true;
  }
  return false;
}

export function popoverDraftHasUserEdits(draft, baseline) {
  if (!draft) return false;
  if (draft.source === "user" || draft.source === "submitted") return true;
  if (draft.source === "generation") return false;
  if (
    typeof draft.prompt === "string" &&
    draft.prompt.trim() !== (baseline.prompt ?? "").trim()
  ) {
    return true;
  }
  if (typeof draft.modelId === "string" && draft.modelId.length > 0) {
    const modelIds = new Set((baseline.modelIds ?? []).filter(Boolean));
    if (modelIds.size > 0 && !modelIds.has(draft.modelId)) return true;
  }
  if (draft.params && !stringMapsEqual(draft.params, baseline.params ?? {}))
    return true;
  return false;
}

export function popoverDraftIsDirty(baseline, live) {
  if (baseline.prompt.trim() !== live.prompt.trim()) return true;
  if (baseline.modelId !== live.modelId) return true;
  if (!stringMapsEqual(baseline.params, live.params)) return true;
  if (!stringArraysEqual(baseline.imagePaths, live.imagePaths)) return true;
  if (!stringArraysEqual(baseline.videoPaths, live.videoPaths)) return true;
  if (!stringArraysEqual(baseline.audioPaths, live.audioPaths)) return true;
  if (!stringArraysEqual(baseline.textPaths, live.textPaths)) return true;
  return false;
}

const ATTACHMENT_CHIPS_PER_ROW = 10;

const ATTACHMENT_ROW_HEIGHT = 52;

export function attachmentExtraHeight(itemCount) {
  if (itemCount <= ATTACHMENT_CHIPS_PER_ROW) return 0;
  const rows = Math.ceil(itemCount / ATTACHMENT_CHIPS_PER_ROW);
  return (rows - 1) * ATTACHMENT_ROW_HEIGHT;
}
