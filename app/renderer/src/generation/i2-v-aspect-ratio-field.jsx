// i2-v-aspect-ratio-field.jsx
import {
  ADAPTIVE_RATIO_VALUES,
  hasModelName,
  isSeedance25InheritedVideoMode,
  isSeedance25Model,
  KLING_AVATAR_MODEL_NAMES,
  LEGACY_SEEDANCE_25_TASK_TYPE_PARAM as LEGACY_SEEDANCE_25_TASK_TYPE_PARAM$1,
  normalizeIdentifier,
  resolveSpecialI2VRouteKind,
  SEEDANCE_25_INHERITED_VIDEO_MODES,
  SEEDANCE_25_VIDEO_EDIT_MODE,
  SEEDANCE_25_VIDEO_EXTEND_MODE,
} from "./model-param-select.jsx";
import {
  findModelByStoredId,
  normalizeParamsForModel,
  resolveDefaultReferencePaths,
  stripDerivedReferenceParams,
} from "./param-label-fallbacks.js";
import { migrateLegacySeedance25GenerationModeParams } from "./resolve-seedance25-image-mode-change-params.js";
import {
  isMediaExtensionInputDurationValid,
  isMediaExtensionOutputDurationValid,
  mediaExtensionDisabledDurationOptions,
  mediaExtensionDurationOptions,
  ParamSectionLabel,
} from "./resolution-tabs.jsx";
import { useTranslation } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { AspectRatioGrid } from "./aspect-ratio-grid.jsx";
import { MINIMAX_H3_TEXT_ONLY_DEFAULT_RATIO } from "./normalize-skill-detail-metadata.js";
const HAILUO_23_MODEL_NAMES = new Set([
  "MiniMax-Hailuo-2.3",
  "MiniMax-Hailuo-2.3-Fast",
  "Hailuo 2.3",
  "Hailuo 2.3 Fast",
]);
const MINIMAX_H3_MODEL_ID = "minimax-h3";
const MINIMAX_H3_BACKEND_ID = "minimax-v3";
const REQUIRED_REFERENCE_IMAGE_MODEL_NAMES = new Set([
  ...HAILUO_23_MODEL_NAMES,
  ...KLING_AVATAR_MODEL_NAMES,
]);
function requiresReferenceImageForI2V(model) {
  if (!model) return false;
  if (model.referenceImageRequired === true) return true;
  return (
    resolveSpecialI2VRouteKind(model) !== void 0 ||
    hasModelName(model, REQUIRED_REFERENCE_IMAGE_MODEL_NAMES)
  );
}
function resolveSeedance25VideoInputTotalDuration(sourceVideoDurationsSec) {
  if (sourceVideoDurationsSec.length === 0) return void 0;
  let totalDurationSec = 0;
  for (const durationSec of sourceVideoDurationsSec) {
    if (
      typeof durationSec !== "number" ||
      !Number.isFinite(durationSec) ||
      durationSec <= 0
    ) {
      return void 0;
    }
    totalDurationSec += durationSec;
  }
  return Number.isFinite(totalDurationSec) ? totalDurationSec : void 0;
}
export function requiresPromptForI2V(model) {
  if (!model) return false;
  if (normalizeIdentifier(model.backend) === MINIMAX_H3_BACKEND_ID) return true;
  return [model.id, model.model_name, model.pricingId, model.name].some(
    (value) => normalizeIdentifier(value) === MINIMAX_H3_MODEL_ID,
  );
}
function hasReferenceMedia(imagePaths, videoPaths, audioPaths) {
  return [...imagePaths, ...videoPaths, ...audioPaths].some(
    (path2) => path2.trim().length > 0,
  );
}
function isAdaptiveRatio(value) {
  return value !== void 0 && ADAPTIVE_RATIO_VALUES.has(value.toLowerCase());
}
function resolveVideoRatioParam(model, params) {
  const key2 = ["aspect_ratio", "ratio"].find(
    (candidate) =>
      model?.params?.[candidate] !== void 0 || params[candidate] !== void 0,
  );
  if (!key2) return void 0;
  const definition2 = model?.params?.[key2];
  return {
    key: key2,
    currentValue: params[key2] ?? definition2?.default,
    fixedValue:
      definition2?.options?.find((option2) => !isAdaptiveRatio(option2)) ??
      MINIMAX_H3_TEXT_ONLY_DEFAULT_RATIO,
  };
}
function shouldDisableH3AdaptiveRatio(
  model,
  imageMode,
  imagePaths,
  videoPaths,
  audioPaths,
) {
  if (!requiresPromptForI2V(model)) return false;
  if (imageMode === "text-to-video") return true;
  if (imageMode !== "reference") return false;
  if (model?.params?.image_mode?.options?.includes("text-to-video"))
    return false;
  return !hasReferenceMedia(imagePaths, videoPaths, audioPaths);
}
function shouldForceSeedance25AdaptiveRatio(model, imageMode, imagePaths) {
  return (
    isSeedance25Model(model) &&
    ((imageMode === "first-last-frame" &&
      imagePaths.slice(0, 2).some((path2) => path2.trim().length > 0)) ||
      SEEDANCE_25_INHERITED_VIDEO_MODES.has(imageMode))
  );
}
function resolveI2VAspectRatioOptions(
  options,
  constraintDisabledOptions,
  disableAdaptive,
  disableFixed = false,
) {
  const disabledOptions = new Set([
    ...constraintDisabledOptions,
    ...(disableAdaptive ? ADAPTIVE_RATIO_VALUES : []),
    ...(disableFixed
      ? options.filter((option2) => !isAdaptiveRatio(option2))
      : []),
  ]);
  const visibleOptions = options.filter(
    (option2) => !constraintDisabledOptions.has(option2),
  );
  return {
    options: visibleOptions.length > 0 ? visibleOptions : options,
    disabledOptions,
  };
}
function resolveEffectiveH3VideoParams(
  model,
  params,
  imagePaths,
  videoPaths,
  audioPaths,
) {
  const imageMode = params.image_mode ?? "reference";
  if (
    !shouldDisableH3AdaptiveRatio(
      model,
      imageMode,
      imagePaths,
      videoPaths,
      audioPaths,
    )
  ) {
    return params;
  }
  const ratioParam = resolveVideoRatioParam(model, params);
  if (!ratioParam || !isAdaptiveRatio(ratioParam.currentValue)) return params;
  return {
    ...params,
    [ratioParam.key]: ratioParam.fixedValue,
  };
}
function resolveEffectiveSeedance25VideoParams(
  model,
  params,
  imageMode,
  imagePaths,
) {
  if (!shouldForceSeedance25AdaptiveRatio(model, imageMode, imagePaths)) {
    return params;
  }
  const ratioParam = resolveVideoRatioParam(model, params);
  if (
    !ratioParam ||
    ratioParam.currentValue?.trim().toLowerCase() === "adaptive"
  )
    return params;
  return {
    ...params,
    [ratioParam.key]: "adaptive",
  };
}
export function resolveSeedance25SubmitParams(model, params, imageMode) {
  const next2 = {
    ...params,
  };
  delete next2[LEGACY_SEEDANCE_25_TASK_TYPE_PARAM$1];
  if (!isSeedance25InheritedVideoMode(model, imageMode)) return next2;
  if (
    imageMode === SEEDANCE_25_VIDEO_EDIT_MODE ||
    imageMode === SEEDANCE_25_VIDEO_EXTEND_MODE
  ) {
    const ratioParam = resolveVideoRatioParam(model, next2);
    if (ratioParam) next2[ratioParam.key] = "adaptive";
  }
  if (imageMode === SEEDANCE_25_VIDEO_EDIT_MODE) next2.duration = "-1";
  return next2;
}
export function resolveEffectiveI2VVideoParams(
  model,
  params,
  imageMode,
  imagePaths,
  videoPaths,
  audioPaths,
) {
  const h3Params = resolveEffectiveH3VideoParams(
    model,
    params,
    imagePaths,
    videoPaths,
    audioPaths,
  );
  return resolveEffectiveSeedance25VideoParams(
    model,
    h3Params,
    imageMode,
    imagePaths,
  );
}
export function isMissingH3FirstLastFrameImage(
  model,
  imageMode,
  imagePaths,
  hasPrompt = false,
) {
  return (
    requiresPromptForI2V(model) &&
    imageMode === "first-last-frame" &&
    !hasPrompt &&
    !imagePaths.some((path2) => path2.trim().length > 0)
  );
}
export function isUnsupportedTailOnlyFirstLastFrameI2V(
  model,
  imageMode,
  imagePaths,
) {
  return (
    model?.supportsLastFrameOnly !== true &&
    imageMode === "first-last-frame" &&
    !imagePaths[0]?.trim() &&
    !!imagePaths[1]?.trim()
  );
}
function isMissingRequiredReferenceImageForI2V(model, imagePaths) {
  return requiresReferenceImageForI2V(model) && !imagePaths.some(Boolean);
}
export function getMissingRequiredAttachmentForI2V(
  model,
  imagePaths,
  _videoPaths,
  audioPaths,
) {
  if (isMissingRequiredReferenceImageForI2V(model, imagePaths)) return "image";
  const routeKind = resolveSpecialI2VRouteKind(model);
  if (routeKind === "kling-avatar" && !audioPaths.some(Boolean)) return "audio";
  return void 0;
}
export function getSpecialI2VCostDurationAttachmentKind(model) {
  const routeKind = resolveSpecialI2VRouteKind(model);
  if (routeKind === "kling-avatar") return "audio";
  return void 0;
}
export function isMissingSpecialI2VCostDurationForPreview(
  model,
  _videoPaths,
  audioPaths,
  durationSec,
) {
  const durationKind = getSpecialI2VCostDurationAttachmentKind(model);
  if (!durationKind) return false;
  const hasRequiredAttachment = audioPaths.some(Boolean);
  return !hasRequiredAttachment || durationSec == null || durationSec <= 0;
}
export function buildSpecialI2VSubmitParams(
  model,
  params,
  _videoPaths,
  audioPaths,
) {
  const routeKind = resolveSpecialI2VRouteKind(model);
  if (!routeKind) return params;
  const next2 = {
    ...params,
  };
  if (routeKind === "kling-avatar") {
    next2.type = "avatar";
    const audioPath = audioPaths.find(Boolean);
    if (audioPath) next2.sound_file = audioPath;
  }
  return next2;
}
export function I2VAspectRatioField({
  model,
  imageMode,
  imagePaths,
  videoPaths,
  audioPaths,
  options,
  value,
  onChange,
  disabled: disabled2,
  disabledOptions,
  label,
}) {
  const { t: t2 } = useTranslation();
  const disableAdaptive = shouldDisableH3AdaptiveRatio(
    model,
    imageMode,
    imagePaths,
    videoPaths,
    audioPaths,
  );
  const forceAdaptive = shouldForceSeedance25AdaptiveRatio(
    model,
    imageMode,
    imagePaths,
  );
  const inheritsSourceVideoRatio =
    imageMode === "video-edit" || imageMode === "video-extend";
  const ratioState = resolveI2VAspectRatioOptions(
    options,
    disabledOptions,
    disableAdaptive,
    forceAdaptive,
  );
  return (
    <div>
      <ParamSectionLabel>{label}</ParamSectionLabel>
      {forceAdaptive ? (
        <p className="mb-2 text-xs leading-4 text-muted-foreground">
          {t2(
            inheritsSourceVideoRatio
              ? "canvas.param.seedance25InheritedVideoRatioHint"
              : "canvas.param.seedance25AdaptiveRatioHint",
            {
              defaultValue: inheritsSourceVideoRatio
                ? "视频编辑和视频续写的宽高比跟随输入视频，仅支持自适应"
                : "首尾帧模式下，宽高比跟随素材，仅支持自适应",
            },
          )}
        </p>
      ) : null}
      <AspectRatioGrid
        options={ratioState.options}
        value={value}
        onChange={onChange}
        disabled={disabled2}
        disabledOptions={ratioState.disabledOptions}
      />
    </div>
  );
}
export const VIDEO_EXTENSION_MODE = "video-extension";
const VIDEO_EXTENSION_AUDIO_PARAM = "generate_audio";
const VIDEO_EXTENSION_DROPPED_PARAM_KEYS = [
  "ratio",
  "aspect_ratio",
  VIDEO_EXTENSION_AUDIO_PARAM,
];
export const DEFAULT_VIDEO_EXTENSION_CAPABILITY = {
  inputMinDurationSec: 1,
  inputMaxDurationSec: 20,
  outputMinDurationSec: 5,
  outputMaxDurationSec: 20,
};
export function videoExtensionDurationOptions(capability) {
  return mediaExtensionDurationOptions(capability);
}
export function videoExtensionDisabledDurationOptions(
  sourceDurationSec,
  capability,
) {
  return mediaExtensionDisabledDurationOptions(sourceDurationSec, capability);
}
export function isVideoExtensionInputDurationValid(
  sourceDurationSec,
  capability,
) {
  return isMediaExtensionInputDurationValid(sourceDurationSec, capability);
}
export function isVideoExtensionOutputDurationValid(
  sourceDurationSec,
  outputDuration,
  capability,
) {
  return isMediaExtensionOutputDurationValid(
    sourceDurationSec,
    outputDuration,
    capability,
  );
}
export function shouldHideVideoExtensionParam(paramKey) {
  return paramKey === VIDEO_EXTENSION_AUDIO_PARAM;
}
export function sanitizeVideoExtensionSubmitParams(params) {
  const next2 = {
    ...params,
  };
  for (const key2 of VIDEO_EXTENSION_DROPPED_PARAM_KEYS) {
    delete next2[key2];
  }
  return next2;
}
export function resolveI2VDefaultImagePaths({
  liveImagePaths,
  draftImagePaths,
  fallbackImagePath,
  imageMode,
}) {
  const livePaths =
    liveImagePaths && liveImagePaths.length > 0
      ? liveImagePaths
      : fallbackImagePath
        ? [fallbackImagePath]
        : [];
  return resolveDefaultReferencePaths(livePaths, draftImagePaths, {
    preserveDraftSlots: imageMode === "first-last-frame",
  });
}
export function imageModeOptionLabel(t2, opt) {
  if (opt === "first-last-frame") {
    return t2("canvas.imageMode.firstLastFrame");
  }
  if (opt === "reference") {
    return t2("canvas.imageMode.omniReference");
  }
  if (opt === "text-to-video") {
    return t2("canvas.imageMode.textToVideo", {
      defaultValue: "Text to Video",
    });
  }
  if (opt === VIDEO_EXTENSION_MODE) {
    return t2("canvas.imageMode.videoExtension", {
      defaultValue: "Extend Video",
    });
  }
  if (opt === SEEDANCE_25_VIDEO_EDIT_MODE) {
    return t2("canvas.seedance25.omniMode.edit", {
      defaultValue: "视频编辑",
    });
  }
  if (opt === SEEDANCE_25_VIDEO_EXTEND_MODE) {
    return t2("canvas.seedance25.omniMode.extend", {
      defaultValue: "视频续写",
    });
  }
  return opt;
}
export function resolveI2VPrefillOverride({ models, prompt, modelId, params }) {
  const override = {};
  const nextPrompt = typeof prompt === "string" ? prompt : "";
  if (nextPrompt.trim().length > 0) override.prompt = nextPrompt;
  const model = findModelByStoredId(models, modelId);
  if (model) {
    override.model = {
      id: model.id,
      params: normalizeParamsForModel(
        model,
        migrateLegacySeedance25GenerationModeParams(
          model,
          stripDerivedReferenceParams(params),
        ),
      ),
    };
  }
  return override;
}
export function resolveSeedance25VideoInputDurationSummary(videoPaths, assets) {
  const filledPaths = videoPaths.filter((path2) => path2.trim().length > 0);
  const pathToDuration = new Map();
  for (const meta2 of assets) {
    if (
      (!meta2.type || meta2.type === "video") &&
      meta2.path &&
      typeof meta2.durationSec === "number" &&
      Number.isFinite(meta2.durationSec) &&
      meta2.durationSec > 0
    ) {
      pathToDuration.set(meta2.path, meta2.durationSec);
    }
  }
  return {
    pathKey: filledPaths.join("\0"),
    totalDurationSec: resolveSeedance25VideoInputTotalDuration(
      filledPaths.map((path2) => pathToDuration.get(path2)),
    ),
  };
}
const MINIMAX_H3_MAX_MODEL_ALIASES = new Set([
  "minimax-h3-max",
  "minimax-h3-max-turbo",
  "h3-max",
  "h3-max-turbo",
]);
export function isMiniMaxH3MaxModelValue(value) {
  if (typeof value !== "string") return false;
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-");
  return MINIMAX_H3_MAX_MODEL_ALIASES.has(normalized);
}
export const MAX_VIDEOS_PER_SUBMIT = 4;
export const VIDEO_COUNT_OPTIONS = [1, 2, 3, 4];
export const MINIMAX_H3_REFERENCE_MEDIA_MAX_SEC = 15;
export const MINIMAX_H3_REFERENCE_VIDEO_MIN_FPS = 23.5;
export const MINIMAX_H3_REFERENCE_VIDEO_MAX_FPS = 60.5;
export const MINIMAX_H3_PRICING_ID = "MiniMax-H3";
export const SEEDANCE_25_EDIT_INPUT_MIN_SEC = 4;
export const LEGACY_SEEDANCE_25_TASK_TYPE_PARAM = "omni_reference_task_type";
export function devLogI2V(event, payload) {
  return;
}
