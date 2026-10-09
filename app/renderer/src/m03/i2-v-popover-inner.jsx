// i2-v-popover-inner.jsx
import {
  jsxRuntimeExports,
  useTranslation,
  useReactFlow,
  useCanvasBridge,
  useCanvasActions,
  reactExports,
  dedupedToast,
  useAssetMetadataApi,
  FileClock,
  MINIMAX_H3_TEXT_ONLY_DEFAULT_RATIO,
  useModelRegistryStore,
} from "../vendor.js";
import {
  composePromptWithReferenceText,
  pickPersistableModelParams,
} from "../m01/prune-persisted-node-data.js";
import {
  translateOptionValue,
  findModelByStoredId,
  normalizeParamsForModel,
  getDefaultParams,
  migrateParamsForModel,
  enforceConstraints,
  popoverDraftIsDirty,
  getDisabledOptions,
  paramI18nKey,
  paramPlaceholderI18nKey,
  paramLabelFallback,
  paramPlaceholderFallback,
  attachmentExtraHeight,
  buildPromotionClickHandler,
  resolveDefaultReferencePaths,
  stripDerivedReferenceParams,
} from "../m01/resolve-reference-texts.js";
import {
  ASPECT_RATIO_PARAM_KEYS,
  IMAGE_MODE_KEY,
  isDraftSubmitFormDisabled,
  shouldPersistPopoverDraftOnUnmount,
  submitWithPersistedPopoverDraft,
} from "../m01/use-lightbox-media-actions.jsx";
import { getAdjacentNodePosition } from "../m01/use-media-node-actions.jsx";
import { Tooltip$1 } from "../m01/create-tracker.jsx";
import {
  calculateVideoDurationExcesses,
  calculateAudioDurationExcesses,
} from "../m02/thumb-chip.jsx";
import {
  nextAtPickerState,
  isHailuo03Model,
  aggregateReferenceVideoDurations,
  maxReferenceVideoDuration,
  resolveVideoPricingId,
  HAILUO03_VIDEO_CONTINUATION_PRICING_ID,
  calcVideoCostBreakdown,
  resolveVideoBillingTooltip,
} from "../m01/calc-video-cost-breakdown.jsx";
import {
  ParamSectionLabel,
  AspectRatioGrid,
  ResolutionTabs,
  mediaExtensionDurationOptions,
  mediaExtensionDisabledDurationOptions,
  isMediaExtensionInputDurationValid,
  isMediaExtensionOutputDurationValid,
} from "../m01/slider.jsx";
import { ModelChip } from "../m01/model-chip.jsx";
import {
  parsePromptToTiptap,
  useReferenceTextContent,
  extractCanvasEditorText,
  countPromptCharacters,
  useAssetsRefValidate,
  extractCanvasEditorSubmitText,
  collectTextChipPaths,
  loadReferenceTextContent,
  compileChipPromptForModel,
  countCompiledMediaPromptCharacters,
  removeCanvasSubjectReferences,
} from "../m01/use-assets-ref-validate.js";
import { usePopoverOpenTrack, useVideoReferenceNavigation } from "../m02/decode-worker-pool.jsx";
import {
  useAttachmentState,
  DEFAULT_TEXT_REFERENCE_MAX,
  AUDIO_TOTAL_MAX_SEC,
  VIDEO_TOTAL_MAX_SEC,
} from "../m02/use-attachment-state.js";
import {
  isCanvasReferenceUri,
  isCanvasSubjectReference,
} from "../m01/table-document-to-llm-content.js";
import {
  ParamTabs,
  ParamTextarea,
  GeneratingButton,
  DualSubmitButtons,
  SubmitButton,
} from "../m01/param-tabs.jsx";
import { PopoverShell, VideoPopoverReferenceSection } from "../m02/use-direct-reference-picker.jsx";
import {
  RichPromptInput,
  getReferenceVideoDurationsMs,
  hasUnsupportedReferenceAudioFormat,
} from "../m02/rich-prompt-input.jsx";
import { MentionPickerPopover } from "../m02/mention-picker-popover.jsx";
import { ParamsChip, ParamsPopup } from "../m01/params-popup.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  PromptPlaceholder,
  useAttachmentReplacement,
  useMediaFileRefSwitch,
} from "./i2-i-popover-inner.jsx";
import { CountChip } from "./image-node-toolbar-section.jsx";
import {
  ADAPTIVE_RATIO_VALUES,
  LEGACY_SEEDANCE_25_TASK_TYPE_PARAM$1,
  MINIMAX_H3_BACKEND_ID,
  MINIMAX_H3_MODEL_ID$2,
  ModelParamSelect,
  ParamDurationSlider,
  ProviderTaskIdChip,
  SEEDANCE_25_INHERITED_VIDEO_MODES,
  SEEDANCE_25_VIDEO_EDIT_MODE,
  SEEDANCE_25_VIDEO_EXTEND_MODE,
  buildHailuo03BillingDetails,
  buildVideoCostFormula,
  hasAnyVideoInput,
  hasContinuousDurationOptions,
  isHailuo03FreeGenerationEligible,
  isHailuo03VideoTrialClaimAvailable,
  isSeedance25InheritedVideoMode,
  isSeedance25Model,
  isSeedance25VideoEditMode,
  isSeedanceModel,
  migrateLegacySeedance25GenerationModeParams,
  nearestDuration,
  normalizeIdentifier$1,
  referenceVideoBudgetDisabledDurationOptions,
  referenceVideoCombinedBudgetSec,
  requiresReferenceImageForI2V,
  resolveHailuo03TrialClaimResolution,
  resolveSeedance25AvailableImageMode,
  resolveSeedance25ImageModeChangeParams,
  resolveSeedance25ImageModeOptions,
  resolveSeedance25VideoExtendDefaultDuration,
  resolveSeedance25VideoInputTotalDuration,
  resolveSpecialI2VRouteKind,
  shouldSwitchHailuo03TrialClaimResolution,
} from "./param-duration-slider.jsx";
function requiresPromptForI2V(model) {
  if (!model) return false;
  if (normalizeIdentifier$1(model.backend) === MINIMAX_H3_BACKEND_ID) return true;
  return [model.id, model.model_name, model.pricingId, model.name].some(
    (value) => normalizeIdentifier$1(value) === MINIMAX_H3_MODEL_ID$2,
  );
}
function hasReferenceMedia(imagePaths, videoPaths, audioPaths) {
  return [...imagePaths, ...videoPaths, ...audioPaths].some((path2) => path2.trim().length > 0);
}
function isAdaptiveRatio(value) {
  return value !== void 0 && ADAPTIVE_RATIO_VALUES.has(value.toLowerCase());
}
function resolveVideoRatioParam(model, params) {
  const key2 = ["aspect_ratio", "ratio"].find(
    (candidate) => model?.params?.[candidate] !== void 0 || params[candidate] !== void 0,
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
function shouldDisableH3AdaptiveRatio(model, imageMode, imagePaths, videoPaths, audioPaths) {
  if (!requiresPromptForI2V(model)) return false;
  if (imageMode === "text-to-video") return true;
  if (imageMode !== "reference") return false;
  if (model?.params?.image_mode?.options?.includes("text-to-video")) return false;
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
    ...(disableFixed ? options.filter((option2) => !isAdaptiveRatio(option2)) : []),
  ]);
  const visibleOptions = options.filter((option2) => !constraintDisabledOptions.has(option2));
  return {
    options: visibleOptions.length > 0 ? visibleOptions : options,
    disabledOptions,
  };
}
function resolveEffectiveH3VideoParams(model, params, imagePaths, videoPaths, audioPaths) {
  const imageMode = params.image_mode ?? "reference";
  if (!shouldDisableH3AdaptiveRatio(model, imageMode, imagePaths, videoPaths, audioPaths)) {
    return params;
  }
  const ratioParam = resolveVideoRatioParam(model, params);
  if (!ratioParam || !isAdaptiveRatio(ratioParam.currentValue)) return params;
  return {
    ...params,
    [ratioParam.key]: ratioParam.fixedValue,
  };
}
function resolveEffectiveSeedance25VideoParams(model, params, imageMode, imagePaths) {
  if (!shouldForceSeedance25AdaptiveRatio(model, imageMode, imagePaths)) {
    return params;
  }
  const ratioParam = resolveVideoRatioParam(model, params);
  if (!ratioParam || ratioParam.currentValue?.trim().toLowerCase() === "adaptive") return params;
  return {
    ...params,
    [ratioParam.key]: "adaptive",
  };
}
function resolveSeedance25SubmitParams(model, params, imageMode) {
  const next2 = {
    ...params,
  };
  delete next2[LEGACY_SEEDANCE_25_TASK_TYPE_PARAM$1];
  if (!isSeedance25InheritedVideoMode(model, imageMode)) return next2;
  if (imageMode === SEEDANCE_25_VIDEO_EDIT_MODE || imageMode === SEEDANCE_25_VIDEO_EXTEND_MODE) {
    const ratioParam = resolveVideoRatioParam(model, next2);
    if (ratioParam) next2[ratioParam.key] = "adaptive";
  }
  if (imageMode === SEEDANCE_25_VIDEO_EDIT_MODE) next2.duration = "-1";
  return next2;
}
function resolveEffectiveI2VVideoParams(
  model,
  params,
  imageMode,
  imagePaths,
  videoPaths,
  audioPaths,
) {
  const h3Params = resolveEffectiveH3VideoParams(model, params, imagePaths, videoPaths, audioPaths);
  return resolveEffectiveSeedance25VideoParams(model, h3Params, imageMode, imagePaths);
}
function isMissingH3FirstLastFrameImage(model, imageMode, imagePaths, hasPrompt = false) {
  return (
    requiresPromptForI2V(model) &&
    imageMode === "first-last-frame" &&
    !hasPrompt &&
    !imagePaths.some((path2) => path2.trim().length > 0)
  );
}
function isUnsupportedTailOnlyFirstLastFrameI2V(model, imageMode, imagePaths) {
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
function getMissingRequiredAttachmentForI2V(model, imagePaths, _videoPaths, audioPaths) {
  if (isMissingRequiredReferenceImageForI2V(model, imagePaths)) return "image";
  const routeKind = resolveSpecialI2VRouteKind(model);
  if (routeKind === "kling-avatar" && !audioPaths.some(Boolean)) return "audio";
  return void 0;
}
function getSpecialI2VCostDurationAttachmentKind(model) {
  const routeKind = resolveSpecialI2VRouteKind(model);
  if (routeKind === "kling-avatar") return "audio";
  return void 0;
}
function isMissingSpecialI2VCostDurationForPreview(model, _videoPaths, audioPaths, durationSec) {
  const durationKind = getSpecialI2VCostDurationAttachmentKind(model);
  if (!durationKind) return false;
  const hasRequiredAttachment = audioPaths.some(Boolean);
  return !hasRequiredAttachment || durationSec == null || durationSec <= 0;
}
function buildSpecialI2VSubmitParams(model, params, _videoPaths, audioPaths) {
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
function I2VAspectRatioField({
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
  const forceAdaptive = shouldForceSeedance25AdaptiveRatio(model, imageMode, imagePaths);
  const inheritsSourceVideoRatio = imageMode === "video-edit" || imageMode === "video-extend";
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
const VIDEO_EXTENSION_MODE = "video-extension";
const VIDEO_EXTENSION_AUDIO_PARAM = "generate_audio";
const VIDEO_EXTENSION_DROPPED_PARAM_KEYS = ["ratio", "aspect_ratio", VIDEO_EXTENSION_AUDIO_PARAM];
const DEFAULT_VIDEO_EXTENSION_CAPABILITY = {
  inputMinDurationSec: 1,
  inputMaxDurationSec: 20,
  outputMinDurationSec: 5,
  outputMaxDurationSec: 20,
};
function videoExtensionDurationOptions(capability) {
  return mediaExtensionDurationOptions(capability);
}
function videoExtensionDisabledDurationOptions(sourceDurationSec, capability) {
  return mediaExtensionDisabledDurationOptions(sourceDurationSec, capability);
}
function isVideoExtensionInputDurationValid(sourceDurationSec, capability) {
  return isMediaExtensionInputDurationValid(sourceDurationSec, capability);
}
function isVideoExtensionOutputDurationValid(sourceDurationSec, outputDuration, capability) {
  return isMediaExtensionOutputDurationValid(sourceDurationSec, outputDuration, capability);
}
function shouldHideVideoExtensionParam(paramKey) {
  return paramKey === VIDEO_EXTENSION_AUDIO_PARAM;
}
function sanitizeVideoExtensionSubmitParams(params) {
  const next2 = {
    ...params,
  };
  for (const key2 of VIDEO_EXTENSION_DROPPED_PARAM_KEYS) {
    delete next2[key2];
  }
  return next2;
}
function resolveI2VImageMode(params, model) {
  const fromParams = params[IMAGE_MODE_KEY];
  if (
    fromParams === "first-last-frame" ||
    fromParams === "reference" ||
    fromParams === VIDEO_EXTENSION_MODE
  ) {
    return fromParams;
  }
  if (model?.imageMode) return model.imageMode;
  if ((model?.max_refs ?? 0) > 2) return "reference";
  if (!model) return "reference";
  return "first-last-frame";
}
function resolveI2VDefaultImagePaths({
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
function imageModeOptionLabel(t2, opt) {
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
function resolveI2VPrefillOverride({ models, prompt, modelId, params }) {
  const override = {};
  const nextPrompt = typeof prompt === "string" ? prompt : "";
  if (nextPrompt.trim().length > 0) override.prompt = nextPrompt;
  const model = findModelByStoredId(models, modelId);
  if (model) {
    override.model = {
      id: model.id,
      params: normalizeParamsForModel(
        model,
        migrateLegacySeedance25GenerationModeParams(model, stripDerivedReferenceParams(params)),
      ),
    };
  }
  return override;
}
function resolveSeedance25VideoInputDurationSummary(videoPaths, assets) {
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
function resolveCanvasImageMode(params, model) {
  if (params[IMAGE_MODE_KEY] === "text-to-video") return "text-to-video";
  return resolveI2VImageMode(params, model);
}
const MAX_VIDEOS_PER_SUBMIT$1 = 4;
const VIDEO_COUNT_OPTIONS = [1, 2, 3, 4];
const MINIMAX_H3_REFERENCE_MEDIA_MAX_SEC = 15;
const MINIMAX_H3_REFERENCE_VIDEO_MIN_FPS = 23.5;
const MINIMAX_H3_REFERENCE_VIDEO_MAX_FPS = 60.5;
const MINIMAX_H3_PRICING_ID = "MiniMax-H3";
const SEEDANCE_25_EDIT_INPUT_MIN_SEC = 4;
const SEEDANCE_25_IMAGE_MODES = [
  "reference",
  "first-last-frame",
  SEEDANCE_25_VIDEO_EDIT_MODE,
  SEEDANCE_25_VIDEO_EXTEND_MODE,
];
const LEGACY_SEEDANCE_25_TASK_TYPE_PARAM = "omni_reference_task_type";
function ensureSeedance25DirectImageModes(model) {
  if (!isSeedance25Model(model)) return model;
  const params = {
    ...model.params,
  };
  const imageModeDefinition = params.image_mode;
  delete params[LEGACY_SEEDANCE_25_TASK_TYPE_PARAM];
  params.image_mode = {
    type: "select",
    label: imageModeDefinition?.label ?? "生成方式",
    options: [...SEEDANCE_25_IMAGE_MODES],
    default: "reference",
  };
  return {
    ...model,
    params,
  };
}
function devLogI2V(event, payload) {
  return;
}
const STANDARD_PARAMS = [
  {
    id: "image_mode",
    i18nKey: "canvas.param.std.imageMode",
    fallbackLabel: "Generation Mode",
    aliases: ["image_mode"],
  },
  {
    id: "aspect_ratio",
    i18nKey: "canvas.param.std.aspectRatio",
    fallbackLabel: "Aspect Ratio",
    aliases: ASPECT_RATIO_PARAM_KEYS,
  },
  {
    id: "resolution",
    i18nKey: "canvas.param.std.resolution",
    fallbackLabel: "Resolution",
    aliases: ["resolution"],
  },
  {
    id: "duration",
    i18nKey: "canvas.param.std.duration",
    fallbackLabel: "Duration",
    aliases: ["duration"],
  },
];
function resolveImageMode(params, model) {
  const fromParams = params[IMAGE_MODE_KEY];
  if (fromParams === SEEDANCE_25_VIDEO_EDIT_MODE || fromParams === SEEDANCE_25_VIDEO_EXTEND_MODE) {
    return fromParams;
  }
  return resolveCanvasImageMode(params, model);
}
function summarizeParams(t2, model, modelParams) {
  if (!model) return "";
  const parts = [];
  let hasAuto = false;
  const imageMode = resolveImageMode(modelParams, model);
  const isSeedance25VideoEdit = isSeedance25VideoEditMode(model, imageMode);
  const hiddenParams = new Set(model.hiddenParamsByImageMode?.[imageMode] ?? []);
  for (const std of STANDARD_PARAMS) {
    const matchedKey = std.aliases.find((a2) => model.params[a2]);
    if (!matchedKey) continue;
    if (hiddenParams.has(matchedKey)) continue;
    if (isSeedance25VideoEdit && std.id === "duration") continue;
    if (modelParams[IMAGE_MODE_KEY] === VIDEO_EXTENSION_MODE && std.id === "aspect_ratio") {
      continue;
    }
    const value = modelParams[matchedKey] ?? model.params[matchedKey].default;
    if (!value || value === "auto") {
      if (value === "auto") hasAuto = true;
      continue;
    }
    if (std.id === "image_mode") {
      parts.push(imageModeOptionLabel(t2, value));
    } else if (std.id === "duration") {
      parts.push(`${value}s`);
    } else {
      parts.push(translateOptionValue(t2, value));
    }
  }
  if (parts.length === 0 && hasAuto)
    return t2("canvas.param.option.auto", {
      defaultValue: "Auto",
    });
  return parts.join(" · ");
}
export function I2VPopoverInner({
  onSubmit,
  onClose,
  listVideoModels,
  defaultImagePath,
  resolveFileUrl,
  creditCost,
  onSelectedModelChange,
  replaceNodeId,
  defaultPrompt,
  defaultPromptJson,
  defaultModelId,
  defaultParams,
  prefillApplyToken,
  lastUsedModelId,
  lastUsedParams,
  defaultImagePaths,
  defaultImageDraftPaths,
  selfAssetIds,
  defaultAudioPaths,
  defaultVideoPaths,
  nodeId,
  isGenerating = false,
  onAspectRatioChange,
  onSaveDraft,
  originalGenerationDraft,
  showCountChip = true,
  submitLabel,
  renderShell,
  defaultTextPaths,
  hasUpstreamText,
  referenceTextContent = "",
  providerTaskId,
  suppressImageAspectRejectedToast = false,
  popoverGapOffset = 0,
  navigationSnapshot,
}) {
  const { t: t2, i18n } = useTranslation();
  const assetMetadataStore = useAssetMetadataApi();
  const paramsAnchorRef = reactExports.useRef(null);
  const popoverHostId = nodeId ?? replaceNodeId ?? "unknown";
  const [promptText, setPromptText] = reactExports.useState(defaultPrompt ?? "");
  const [count2, setCount] = reactExports.useState(navigationSnapshot?.count ?? 1);
  const buildPromptContent = reactExports.useCallback(
    (prompt, promptJson) => {
      if (promptJson) {
        try {
          return JSON.parse(promptJson);
        } catch {}
      }
      if (!prompt) return "";
      const assets2 = assetMetadataStore.getState().assets;
      return parsePromptToTiptap(prompt, (path2) => {
        let hit;
        assets2.forEach((meta2) => {
          if (hit) return;
          if (meta2.path === path2) {
            hit = {
              path: meta2.path,
              name: meta2.name,
              type: meta2.type,
            };
          }
        });
        if (!hit) return null;
        const kind =
          hit.type === "video" || hit.type === "audio" || hit.type === "text" ? hit.type : "image";
        return {
          path: hit.path,
          filename: hit.name,
          kind,
        };
      });
    },
    [assetMetadataStore],
  );
  const initialEditorContent = reactExports.useMemo(
    () => buildPromptContent(defaultPrompt, defaultPromptJson),
    [buildPromptContent, defaultPrompt, defaultPromptJson],
  );
  const [editorContentOverride, setEditorContentOverride] = reactExports.useState(null);
  const [editorContentRevision, setEditorContentRevision] = reactExports.useState(0);
  const [expanded, setExpanded] = reactExports.useState(navigationSnapshot?.expanded ?? false);
  const [paramsOpen, setParamsOpen] = reactExports.useState(false);
  const [isPreparing, setIsPreparing] = reactExports.useState(false);
  const [referenceVideoForClip, setReferenceVideoForClip] = reactExports.useState(null);
  const [referenceAudioForClip, setReferenceAudioForClip] = reactExports.useState(null);
  const {
    accountSubmissionAllowed = true,
    beforeAccountSubmission = () => true,
    pricingConfig,
    hailuo03VideoTrial,
    claimHailuo03VideoTrial: claimHailuo03VideoTrial2,
    refreshHailuo03VideoTrial,
    loadTextContent,
    saveLastUsedModelParams,
    onPromotionToast,
    cropImage,
  } = useCanvasBridge();
  const { attachDraftOnNextDerived, focusDerivedNode, getNodeIdByPath } = useCanvasActions();
  const reactFlow = useReactFlow();
  usePopoverOpenTrack({
    popoverType: "i2v",
    nodeId: nodeId ?? replaceNodeId ?? "",
    hasDefault: !!(defaultPrompt || defaultModelId),
  });
  reactExports.useEffect(() => {
    void refreshHailuo03VideoTrial?.().catch(() => void 0);
  }, []);
  const [videoModels, setVideoModels] = reactExports.useState([]);
  const [modelsLoading, setModelsLoading] = reactExports.useState(false);
  const [selectedModelId, setSelectedModelId] = reactExports.useState("");
  const [modelParams, setModelParams] = reactExports.useState({});
  const registryVideoModels = useModelRegistryStore((s2) => s2.video);
  const userPickedModelRef = reactExports.useRef(false);
  const selectedModel = videoModels.find((m3) => m3.id === selectedModelId);
  const isMiniMaxH3MaxReferenceModel = [
    selectedModel?.id,
    selectedModel?.model_name,
    selectedModel?.pricingId,
  ].some((value) => value === "MiniMax-H3-Max");
  reactExports.useEffect(() => {
    onSelectedModelChange?.(selectedModel?.id, selectedModel?.name);
  }, [onSelectedModelChange, selectedModel?.id, selectedModel?.name]);
  const isPromptRequired =
    selectedModel?.promptRequired === true || requiresPromptForI2V(selectedModel);
  const maxRefs = selectedModel?.max_refs ?? 0;
  const maxVideoRefs = selectedModel?.max_video_refs ?? 0;
  const maxAudioRefs = selectedModel?.max_audio_refs ?? 0;
  const maxVideoAudioRefs = selectedModel?.max_video_audio_refs;
  const imageMode = resolveImageMode(modelParams, selectedModel);
  const isFirstLastFrame = imageMode === "first-last-frame";
  const isTextToVideo = imageMode === "text-to-video";
  const isVideoExtension = imageMode === VIDEO_EXTENSION_MODE;
  const isSeedance25VideoEdit = isSeedance25VideoEditMode(selectedModel, imageMode);
  const isSeedance25InheritedVideo = isSeedance25InheritedVideoMode(selectedModel, imageMode);
  const isSeedance25VideoExtend = isSeedance25InheritedVideo && !isSeedance25VideoEdit;
  const isMiniMaxH3VideoModel =
    selectedModelId === "MiniMax-H3" ||
    isHailuo03Model(selectedModel) ||
    isMiniMaxH3MaxReferenceModel;
  const miniMaxH3ReferenceMediaMaxSec = isMiniMaxH3VideoModel
    ? MINIMAX_H3_REFERENCE_MEDIA_MAX_SEC
    : void 0;
  const referenceAudioLimits = selectedModel?.referenceMediaLimits?.audio;
  const referenceVideoLimits = selectedModel?.referenceMediaLimits?.video;
  const referenceAudioTotalMaxSec =
    referenceAudioLimits?.totalMaxDurationSec ??
    miniMaxH3ReferenceMediaMaxSec ??
    AUDIO_TOTAL_MAX_SEC;
  const referenceVideoTotalMaxSec =
    referenceVideoLimits?.totalMaxDurationSec ??
    miniMaxH3ReferenceMediaMaxSec ??
    VIDEO_TOTAL_MAX_SEC;
  const videoExtensionCapability = isVideoExtension
    ? (selectedModel?.videoExtension ?? DEFAULT_VIDEO_EXTENSION_CAPABILITY)
    : void 0;
  const initImagePaths = reactExports.useMemo(
    () =>
      resolveI2VDefaultImagePaths({
        liveImagePaths: defaultImagePaths,
        draftImagePaths: defaultImageDraftPaths,
        fallbackImagePath: defaultImagePath,
        imageMode,
      }),
    [defaultImageDraftPaths, defaultImagePath, defaultImagePaths, imageMode],
  );
  const maxFileRefs = selectedModel?.max_file_refs ?? 0;
  const hasFileSlot = maxFileRefs > 0;
  const attachmentState = useAttachmentState({
    defaultPrompt,
    defaultImagePaths: initImagePaths,
    defaultVideoPaths,
    defaultAudioPaths,
    defaultTextPaths,
    maxImageRefs: maxRefs,
    maxVideoRefs,
    maxAudioRefs,
    maxVideoAudioRefs,
    maxTextRefs: hasFileSlot ? 0 : DEFAULT_TEXT_REFERENCE_MAX,
    maxFileRefs,
    ...(selectedModel?.referenceFileExtensions
      ? {
          fileExtensions: selectedModel.referenceFileExtensions,
        }
      : {}),
    audioPerClipMinSec: referenceAudioLimits?.minDurationSec,
    audioPerClipMaxSec: referenceAudioLimits?.maxDurationSec ?? miniMaxH3ReferenceMediaMaxSec,
    audioTotalMaxSec: referenceAudioTotalMaxSec,
    videoPerClipMinSec: isSeedance25VideoEdit
      ? SEEDANCE_25_EDIT_INPUT_MIN_SEC
      : (videoExtensionCapability?.inputMinDurationSec ?? referenceVideoLimits?.minDurationSec),
    videoPerClipMaxSec:
      videoExtensionCapability?.inputMaxDurationSec ?? referenceVideoLimits?.maxDurationSec,
    videoTotalMaxSec: referenceVideoTotalMaxSec,
    // Reference videos (non video-extension) must sit in [24, 60] average fps.
    // Mirrors the gateway hailuo03 pre-submit check; the picker resolves fps
    // on demand since it is not carried in the eager asset store.
    videoMinFps:
      isMiniMaxH3VideoModel && !isVideoExtension ? MINIMAX_H3_REFERENCE_VIDEO_MIN_FPS : void 0,
    videoMaxFps:
      isMiniMaxH3VideoModel && !isVideoExtension ? MINIMAX_H3_REFERENCE_VIDEO_MAX_FPS : void 0,
    imageInputLimits: selectedModel?.inputMediaLimits,
    suppressImageAspectRejectedToast,
    imageMode,
    hostNodeId: nodeId ?? replaceNodeId,
    resolveFileUrl,
  });
  const currentReferenceTextContent = useReferenceTextContent(
    attachmentState.textPaths,
    loadTextContent,
    referenceTextContent,
  );
  const hasSeedance25VideoInput = hasAnyVideoInput(attachmentState.videoPaths);
  reactExports.useEffect(() => {
    const availableImageMode = resolveSeedance25AvailableImageMode(
      selectedModel,
      imageMode,
      hasSeedance25VideoInput,
    );
    if (availableImageMode === imageMode) return;
    setModelParams((current2) =>
      resolveSeedance25ImageModeChangeParams(selectedModel, current2, availableImageMode),
    );
  }, [selectedModel, imageMode, hasSeedance25VideoInput]);
  const effectiveModelParams = reactExports.useMemo(
    () =>
      resolveEffectiveI2VVideoParams(
        selectedModel,
        modelParams,
        imageMode,
        attachmentState.imagePaths,
        attachmentState.videoPaths,
        attachmentState.audioPaths,
      ),
    [
      selectedModel,
      modelParams,
      imageMode,
      attachmentState.imagePaths,
      attachmentState.videoPaths,
      attachmentState.audioPaths,
    ],
  );
  const isHailuo03VideoTrialClaimAvailableForCurrentContext = isHailuo03VideoTrialClaimAvailable({
    model: selectedModel,
    selectedModelId,
    eligibility: hailuo03VideoTrial?.eligibility,
    imageMode,
    imagePaths: attachmentState.imagePaths,
    videoPaths: attachmentState.videoPaths,
    audioPaths: attachmentState.audioPaths,
  });
  const isHailuo03VideoTrialEligible = isHailuo03FreeGenerationEligible({
    model: selectedModel,
    selectedModelId,
    eligibility: hailuo03VideoTrial?.eligibility,
    imageMode,
    imagePaths: attachmentState.imagePaths,
    videoPaths: attachmentState.videoPaths,
    audioPaths: attachmentState.audioPaths,
    modelParams,
  });
  const hailuo03TrialRemainingCount = Math.max(
    0,
    Math.floor(hailuo03VideoTrial?.remainingCount ?? 0),
  );
  const hasHailuo03FreeTrial =
    isHailuo03VideoTrialEligible &&
    hailuo03VideoTrial?.claimed === true &&
    hailuo03TrialRemainingCount > 0;
  const canClaimHailuo03VideoTrial =
    isHailuo03VideoTrialClaimAvailableForCurrentContext &&
    hailuo03VideoTrial?.claimed !== true &&
    hailuo03VideoTrial?.claimable === true &&
    !!claimHailuo03VideoTrial2;
  const hailuo03VideoTrialClaimHint = reactExports.useMemo(() => {
    const remoteHint = hailuo03VideoTrial?.claimHint?.trim();
    if (remoteHint) return remoteHint;
    return "";
  }, [hailuo03VideoTrial?.claimHint]);
  const editorRef = reactExports.useRef(null);
  const removedSubjectReferencesRef = reactExports.useRef(false);
  const [atPickerState, setAtPickerState] = reactExports.useState({
    open: false,
    query: "",
    rect: null,
    getRect: null,
    triggerRange: null,
  });
  const [editorHasText, setEditorHasText] = reactExports.useState(!!defaultPrompt);
  const [promptLength, setPromptLength] = reactExports.useState(0);
  const [isClaimingHailuo03Trial, setIsClaimingHailuo03Trial] = reactExports.useState(false);
  const showH3GuideLink = isMiniMaxH3VideoModel && !editorHasText;
  const h3GuideUrl = i18n?.language?.startsWith("zh")
    ? "https://vrfi1sk8a0.feishu.cn/wiki/FIWjwgL33ipnkekzk30crmKUnIh"
    : "https://app.notion.com/p/MiniMax-H3-Next-Generation-Open-Weights-General-Purpose-Multimodal-Video-Model-3acbb3a8c3ae81618844cb0a3904e247";
  const handleH3GuideClick = reactExports.useCallback(() => {
    const platform2 = window.__HILO_PLATFORM__;
    if (platform2?.shell?.openExternal) {
      void platform2.shell.openExternal(h3GuideUrl);
    } else {
      window.open(h3GuideUrl, "_blank", "noopener,noreferrer");
    }
  }, [h3GuideUrl]);
  const promptPlaceholder = t2("canvas.promptDescribe", {
    defaultValue: "Describe anything you want to generate",
  });
  const promptEmptyState = ({ openAtPicker }) => (
    <PromptPlaceholder
      description={
        showH3GuideLink
          ? t2("canvas.promptDescribeH3", {
              defaultValue: "描述你要生成的内容",
            })
          : promptPlaceholder
      }
      atPrefix={t2("canvas.promptAtPrefix", {
        defaultValue: "，点击 ",
      })}
      atSuffix={t2("canvas.promptAtSuffix", {
        defaultValue: " 添加参考内容。",
      })}
      onAtClick={openAtPicker}
      guide={
        showH3GuideLink
          ? {
              prefix: `${t2("canvas.promptDescribeH3Connector", {
                defaultValue: "，或",
              })}${t2("canvas.promptDescribeH3GuidePrefix", {
                defaultValue: "探索",
              })}`,
              label: t2("canvas.promptDescribeH3Guide", {
                defaultValue: "H3创作指南",
              }),
              onClick: handleH3GuideClick,
            }
          : void 0
      }
    />
  );
  reactExports.useEffect(() => {
    const nextPrompt = typeof defaultPrompt === "string" ? defaultPrompt : "";
    const shouldHydrate =
      nextPrompt.trim().length > 0 && !defaultPromptJson && !promptText.trim() && !editorHasText;
    if (!shouldHydrate || removedSubjectReferencesRef.current) return;
    setPromptText(nextPrompt);
    setEditorHasText(true);
    setEditorContentRevision((revision) => revision + 1);
  }, [defaultPrompt, defaultPromptJson, editorHasText, promptText]);
  const formDisabled = isDraftSubmitFormDisabled(modelsLoading, isPreparing);
  const paramsSummary = reactExports.useMemo(
    () => summarizeParams(t2, selectedModel, effectiveModelParams),
    [t2, selectedModel, effectiveModelParams],
  );
  const effectiveCount = showCountChip
    ? Math.max(1, Math.min(MAX_VIDEOS_PER_SUBMIT$1, Math.floor(count2)))
    : 1;
  const assets = attachmentState.metadataAssets;
  const sourceVideoPath = attachmentState.videoPaths.find(Boolean);
  const sourceVideoMeta = reactExports.useMemo(() => {
    if ((!isVideoExtension && !isSeedance25InheritedVideo) || !sourceVideoPath) return void 0;
    for (const meta2 of assets.values()) {
      if (meta2.path === sourceVideoPath && meta2.type === "video") return meta2;
    }
    return void 0;
  }, [isVideoExtension, isSeedance25InheritedVideo, sourceVideoPath, assets]);
  const sourceVideoDurationSec =
    typeof sourceVideoMeta?.durationSec === "number" &&
    Number.isFinite(sourceVideoMeta.durationSec) &&
    sourceVideoMeta.durationSec > 0
      ? sourceVideoMeta.durationSec
      : void 0;
  const extensionSourceDurationSec = isVideoExtension ? sourceVideoDurationSec : void 0;
  const seedance25VideoInputDurationSummary = reactExports.useMemo(
    () => resolveSeedance25VideoInputDurationSummary(attachmentState.videoPaths, assets.values()),
    [assets, attachmentState.videoPaths],
  );
  const seedance25VideoInputPathKey = seedance25VideoInputDurationSummary.pathKey;
  const seedance25VideoInputTotalDurationSec = isSeedance25InheritedVideo
    ? seedance25VideoInputDurationSummary.totalDurationSec
    : void 0;
  const seedance25VideoExtendDefaultDuration = isSeedance25VideoExtend
    ? resolveSeedance25VideoExtendDefaultDuration(seedance25VideoInputTotalDurationSec)
    : void 0;
  const seedance25VideoExtendDurationUserControlledRef = reactExports.useRef(
    defaultParams?.duration !== void 0,
  );
  const seedance25VideoExtendSourceKeyRef = reactExports.useRef(seedance25VideoInputPathKey);
  const effectiveDurationOptions = reactExports.useMemo(() => {
    const declared = selectedModel?.params.duration?.options ?? [];
    if (!isVideoExtension) return declared;
    return videoExtensionDurationOptions(videoExtensionCapability);
  }, [isVideoExtension, videoExtensionCapability, selectedModel?.params.duration?.options]);
  const disabledExtensionDurationOptions = reactExports.useMemo(
    () =>
      isVideoExtension
        ? videoExtensionDisabledDurationOptions(
            extensionSourceDurationSec,
            videoExtensionCapability,
          )
        : new Set(),
    [isVideoExtension, extensionSourceDurationSec, videoExtensionCapability],
  );
  const referenceVideoRawTotalSec = reactExports.useMemo(() => {
    if (imageMode === "first-last-frame" || attachmentState.videoPaths.length === 0) return 0;
    const pathToDurationSec = new Map();
    assets.forEach((meta2) => {
      if (meta2.path && typeof meta2.durationSec === "number" && meta2.durationSec > 0) {
        pathToDurationSec.set(meta2.path, meta2.durationSec);
      }
    });
    return attachmentState.videoPaths.reduce(
      (total, path2) => total + (pathToDurationSec.get(path2) ?? 0),
      0,
    );
  }, [imageMode, attachmentState.videoPaths, assets]);
  const referenceVideoBudgetDisabledDurations = reactExports.useMemo(
    () =>
      referenceVideoBudgetDisabledDurationOptions(
        selectedModel?.params.duration?.options ?? [],
        referenceVideoRawTotalSec,
        referenceVideoCombinedBudgetSec(selectedModel),
      ),
    [selectedModel, referenceVideoRawTotalSec],
  );
  reactExports.useEffect(() => {
    if (!selectedModel?.params.duration || effectiveDurationOptions.length === 0) return;
    const sourceChanged = seedance25VideoExtendSourceKeyRef.current !== seedance25VideoInputPathKey;
    seedance25VideoExtendSourceKeyRef.current = seedance25VideoInputPathKey;
    if (sourceChanged) seedance25VideoExtendDurationUserControlledRef.current = false;
    const shouldApplySeedance25VideoExtendDefault =
      !seedance25VideoExtendDurationUserControlledRef.current &&
      seedance25VideoExtendDefaultDuration;
    setModelParams((current2) => {
      const enabledDurations = effectiveDurationOptions.filter(
        (option2) =>
          !disabledExtensionDurationOptions.has(option2) &&
          !referenceVideoBudgetDisabledDurations.has(option2),
      );
      const firstEnabledDuration = enabledDurations[0];
      if (!firstEnabledDuration) return current2;
      if (shouldApplySeedance25VideoExtendDefault) {
        return current2.duration === seedance25VideoExtendDefaultDuration
          ? current2
          : {
              ...current2,
              duration: seedance25VideoExtendDefaultDuration,
            };
      }
      if (isVideoExtension) {
        return current2.duration === firstEnabledDuration
          ? current2
          : {
              ...current2,
              duration: firstEnabledDuration,
            };
      }
      if (
        effectiveDurationOptions.includes(current2.duration) &&
        !referenceVideoBudgetDisabledDurations.has(current2.duration)
      ) {
        return current2;
      }
      const fallback =
        nearestDuration(Number(current2.duration), enabledDurations) ?? firstEnabledDuration;
      return current2.duration === fallback
        ? current2
        : {
            ...current2,
            duration: fallback,
          };
    });
    if (shouldApplySeedance25VideoExtendDefault) {
      seedance25VideoExtendDurationUserControlledRef.current = true;
    }
  }, [
    disabledExtensionDurationOptions,
    referenceVideoBudgetDisabledDurations,
    effectiveDurationOptions,
    isVideoExtension,
    seedance25VideoExtendDefaultDuration,
    selectedModel,
    seedance25VideoInputPathKey,
  ]);
  const referenceVideoBillingDurations = reactExports.useMemo(() => {
    if (imageMode === "first-last-frame" || attachmentState.videoPaths.length === 0) {
      return {
        inputSec: 0,
        maxSec: 0,
      };
    }
    const durationsMs = getReferenceVideoDurationsMs(
      attachmentState.videoPaths,
      assets,
      attachmentState.referenceResolutions,
    );
    return {
      inputSec: aggregateReferenceVideoDurations(durationsMs),
      maxSec: maxReferenceVideoDuration(durationsMs),
    };
  }, [imageMode, attachmentState.videoPaths, attachmentState.referenceResolutions, assets]);
  const referenceVideoInputSec = referenceVideoBillingDurations.inputSec;
  const referenceVideoMaxSec = referenceVideoBillingDurations.maxSec;
  const specialCostDurationSec = reactExports.useMemo(() => {
    const durationKind = getSpecialI2VCostDurationAttachmentKind(selectedModel);
    if (!durationKind) return void 0;
    const path2 =
      durationKind === "audio"
        ? attachmentState.audioPaths.find(Boolean)
        : attachmentState.videoPaths.find(Boolean);
    if (!path2) return void 0;
    let durationSec;
    assets.forEach((meta2) => {
      if (durationSec != null) return;
      if (
        meta2.type === durationKind &&
        meta2.path === path2 &&
        typeof meta2.durationSec === "number" &&
        meta2.durationSec > 0
      ) {
        durationSec = meta2.durationSec;
      }
    });
    return durationSec;
  }, [selectedModel, attachmentState.audioPaths, attachmentState.videoPaths, assets]);
  const videoPricingInput = reactExports.useMemo(() => {
    if (!selectedModel) return void 0;
    const resolutionKey = ["resolution", "mode"].find((k2) => selectedModel.params[k2]);
    const soundKey = ["generate_audio", "sound", "enable_sound"].find(
      (k2) => selectedModel.params[k2],
    );
    const resolution = resolutionKey ? modelParams[resolutionKey] : void 0;
    const soundValue = soundKey ? modelParams[soundKey] : void 0;
    const hasSound = soundValue === "true" || soundValue === "on";
    const usesSpecialCostDuration = !modelParams.duration && specialCostDurationSec != null;
    const duration = isSeedance25VideoEdit
      ? referenceVideoMaxSec
      : modelParams.duration
        ? Number(modelParams.duration)
        : specialCostDurationSec;
    const hasReferenceVideo =
      !usesSpecialCostDuration &&
      imageMode !== "first-last-frame" &&
      attachmentState.videoPaths.length > 0;
    const pricingModelId = resolveVideoPricingId(selectedModel, isVideoExtension);
    const inputDurationForPricing =
      pricingModelId === HAILUO03_VIDEO_CONTINUATION_PRICING_ID
        ? 0
        : usesSpecialCostDuration
          ? 0
          : referenceVideoInputSec;
    const imageCountForPricing =
      pricingModelId === HAILUO03_VIDEO_CONTINUATION_PRICING_ID
        ? 0
        : attachmentState.referenceCounts.image;
    return {
      pricingModelId,
      resolution,
      duration,
      hasReferenceVideo,
      hasSound,
      inputDurationForPricing,
      imageCountForPricing,
    };
  }, [
    selectedModel,
    attachmentState.referenceCounts.image,
    attachmentState.videoPaths,
    modelParams,
    specialCostDurationSec,
    imageMode,
    referenceVideoInputSec,
    referenceVideoMaxSec,
    isVideoExtension,
    isSeedance25VideoEdit,
  ]);
  const inheritedVideoDurationSec = isSeedance25InheritedVideo
    ? seedance25VideoInputTotalDurationSec
    : sourceVideoDurationSec;
  const isCostPreviewDurationMissing =
    (isSeedance25InheritedVideo && inheritedVideoDurationSec === void 0) ||
    isMissingSpecialI2VCostDurationForPreview(
      selectedModel,
      attachmentState.videoPaths,
      attachmentState.audioPaths,
      specialCostDurationSec,
    );
  const referenceVideoDurationExceeded =
    calculateVideoDurationExcesses(attachmentState.items, referenceVideoTotalMaxSec).size > 0;
  const referenceAudioDurationExceeded =
    calculateAudioDurationExcesses(attachmentState.items, referenceAudioTotalMaxSec).size > 0;
  const referenceClipDurationInvalid = attachmentState.items.some(
    (item) => (item.kind === "audio" || item.kind === "video") && item.durationOutOfRange,
  );
  const isBillingEstimateBlockedByInvalidInput =
    referenceVideoDurationExceeded ||
    referenceAudioDurationExceeded ||
    referenceClipDurationInvalid;
  const videoCostBreakdown = reactExports.useMemo(() => {
    if (
      isCostPreviewDurationMissing ||
      isBillingEstimateBlockedByInvalidInput ||
      !pricingConfig ||
      !videoPricingInput
    ) {
      return void 0;
    }
    return calcVideoCostBreakdown(
      pricingConfig,
      videoPricingInput.pricingModelId,
      videoPricingInput.resolution,
      videoPricingInput.duration,
      videoPricingInput.hasReferenceVideo,
      videoPricingInput.hasSound,
      videoPricingInput.inputDurationForPricing,
      void 0,
      videoPricingInput.imageCountForPricing,
    );
  }, [
    isBillingEstimateBlockedByInvalidInput,
    isCostPreviewDurationMissing,
    pricingConfig,
    videoPricingInput,
  ]);
  const calculatedCreditCost =
    videoCostBreakdown == null ? void 0 : videoCostBreakdown.total * effectiveCount;
  const computedCreditCost = isBillingEstimateBlockedByInvalidInput
    ? void 0
    : (creditCost ?? (isCostPreviewDurationMissing ? 0 : calculatedCreditCost));
  const computedBillingEstimateFormula = reactExports.useMemo(() => {
    if (!videoCostBreakdown) return void 0;
    if (creditCost != null && creditCost !== calculatedCreditCost) return void 0;
    return buildVideoCostFormula(videoCostBreakdown, effectiveCount, {
      generatedVideo: (seconds, rate) =>
        t2("canvas.billing.formula.generatedVideo", {
          seconds,
          rate,
          defaultValue: "生成视频 {{seconds}} 秒 × {{rate}} 积分/秒",
        }),
      inputVideo: (seconds, rate) =>
        t2("canvas.billing.formula.inputVideo", {
          seconds,
          rate,
          defaultValue: "输入视频 {{seconds}} 秒 × {{rate}} 积分/秒",
        }),
      inputImages: (count22, rate) =>
        t2("canvas.billing.formula.inputImages", {
          count: count22,
          rate,
          defaultValue: "超额图片 {{count}} 张 × {{rate}} 积分/张",
        }),
      inputMediaFree: t2("canvas.billing.formula.inputMediaFree", {
        defaultValue: "输入素材 0 积分",
      }),
      fixedCost: (cost) =>
        t2("canvas.billing.formula.fixedCost", {
          cost,
          defaultValue: "基础费用 {{cost}} 积分",
        }),
      multipleOutputs: (formula, count22) =>
        t2("canvas.billing.formula.multipleOutputs", {
          formula,
          count: count22,
          defaultValue: "({{formula}}) × {{count}}",
        }),
    });
  }, [calculatedCreditCost, creditCost, effectiveCount, t2, videoCostBreakdown]);
  const computedBillingDetails = reactExports.useMemo(() => {
    if (!videoCostBreakdown || videoPricingInput?.pricingModelId !== MINIMAX_H3_PRICING_ID) {
      return void 0;
    }
    return buildHailuo03BillingDetails(videoCostBreakdown, {
      heading: t2("canvas.billing.panel.heading", {
        defaultValue: "价格说明",
      }),
      generatedVideo: t2("canvas.billing.panel.generatedVideo", {
        defaultValue: "生成视频",
      }),
      inputMedia: t2("canvas.billing.panel.inputMedia", {
        defaultValue: "输入素材",
      }),
      video: t2("canvas.billing.panel.video", {
        defaultValue: "视频",
      }),
      audio: t2("canvas.billing.panel.audio", {
        defaultValue: "音频",
      }),
      images: t2("canvas.billing.panel.images", {
        defaultValue: "图片",
      }),
      free: t2("canvas.billing.panel.free", {
        defaultValue: "免费",
      }),
      creditsPerSecond: (rate) =>
        t2("canvas.billing.panel.ratePerSecond", {
          rate,
          defaultValue: "{{rate}} 积分/秒",
        }),
      imagePricing: (freeCount, firstPaidIndex, rate) =>
        t2("canvas.billing.panel.imagePricing", {
          freeCount,
          firstPaidIndex,
          rate,
          defaultValue: "前 {{freeCount}} 张免费，第 {{firstPaidIndex}} 张起 {{rate}} 积分/张",
        }),
    });
  }, [t2, videoCostBreakdown, videoPricingInput?.pricingModelId]);
  const computedBillingTooltip = reactExports.useMemo(() => {
    if (computedBillingDetails) return void 0;
    if (!pricingConfig || !videoPricingInput) return void 0;
    return resolveVideoBillingTooltip(
      pricingConfig,
      videoPricingInput.pricingModelId,
      videoPricingInput.resolution,
      videoPricingInput.duration,
      videoPricingInput.hasReferenceVideo,
      videoPricingInput.hasSound,
    );
  }, [computedBillingDetails, pricingConfig, videoPricingInput]);
  const hailuo03TrialCostBadge = hasHailuo03FreeTrial ? (
    <span
      className="inline-flex shrink-0 items-center gap-1 text-[12px] leading-none tracking-tight text-[var(--canvas-controls-text)]"
      data-action-ui-id="popover.hailuo03-free-badge"
    >
      <span>
        {t2("canvas.hailuo03Trial.freeLabel", {
          defaultValue: "免费",
        })}
      </span>
      <span className="opacity-50" aria-hidden="true">
        ·
      </span>
      <span className="font-medium tabular-nums">
        {t2("canvas.hailuo03Trial.remaining", {
          count: hailuo03TrialRemainingCount,
          defaultValue: "剩余 {{count}} 次",
        })}
      </span>
    </span>
  ) : (
    void 0
  );
  const aspectRatioKey = reactExports.useMemo(() => {
    if (!selectedModel || isVideoExtension || isSeedance25InheritedVideo) return void 0;
    return ["aspect_ratio", "ratio"].find((k2) => selectedModel.params[k2]);
  }, [isSeedance25InheritedVideo, isVideoExtension, selectedModel]);
  const sourceAspectRatio =
    (isVideoExtension || isSeedance25InheritedVideo) &&
    sourceVideoMeta?.width &&
    sourceVideoMeta.height &&
    sourceVideoMeta.width > 0 &&
    sourceVideoMeta.height > 0
      ? `${sourceVideoMeta.width}:${sourceVideoMeta.height}`
      : void 0;
  const aspectRatioValue = aspectRatioKey ? effectiveModelParams[aspectRatioKey] : void 0;
  reactExports.useEffect(() => {
    if (isVideoExtension || isSeedance25InheritedVideo) return;
    onAspectRatioChange?.(aspectRatioValue);
  }, [aspectRatioValue, isSeedance25InheritedVideo, isVideoExtension, onAspectRatioChange]);
  reactExports.useEffect(() => {
    let cancelled = false;
    const applyModels = (models, source) => {
      if (cancelled) return;
      const i2vModels = models
        .filter((m3) => m3.max_refs >= 1 && !m3.hideInModelPicker)
        .map(ensureSeedance25DirectImageModes);
      setVideoModels(i2vModels);
      devLogI2V("model-list-loaded", {
        count: i2vModels.length,
        modelIds: i2vModels.map((m3) => m3.id),
        userPicked: userPickedModelRef.current,
      });
      if (userPickedModelRef.current) {
        devLogI2V("model-seed-skipped-user-picked", {
          selectedModelId: draftSnapshotRef.current.selectedModelId,
        });
        return;
      }
      if (i2vModels.length > 0) {
        const preselect = findModelByStoredId(i2vModels, defaultModelId);
        if (preselect) {
          setSelectedModelId(preselect.id);
          setModelParams(
            migrateLegacySeedance25GenerationModeParams(
              preselect,
              normalizeParamsForModel(preselect, stripDerivedReferenceParams(defaultParams)),
            ),
          );
          devLogI2V("model-seeded-default", {
            selectedModelId: preselect.id,
          });
        } else {
          const lastUsedMatch = findModelByStoredId(i2vModels, lastUsedModelId);
          if (lastUsedMatch) {
            setSelectedModelId(lastUsedMatch.id);
            setModelParams(
              migrateLegacySeedance25GenerationModeParams(
                lastUsedMatch,
                normalizeParamsForModel(lastUsedMatch, stripDerivedReferenceParams(lastUsedParams)),
              ),
            );
            devLogI2V("model-seeded-last-used", {
              selectedModelId: lastUsedMatch.id,
            });
          } else {
            setSelectedModelId(i2vModels[0].id);
            setModelParams(
              migrateLegacySeedance25GenerationModeParams(
                i2vModels[0],
                getDefaultParams(i2vModels[0]),
              ),
            );
            devLogI2V("model-seeded-first", {
              selectedModelId: i2vModels[0].id,
            });
          }
        }
      }
    };
    const hasRegistryVideoModels = registryVideoModels.length > 0;
    if (hasRegistryVideoModels) {
      applyModels(registryVideoModels);
    }
    if (!listVideoModels) {
      setModelsLoading(false);
      return () => {
        cancelled = true;
      };
    }
    setModelsLoading(!hasRegistryVideoModels);
    devLogI2V("model-list-request", {
      userPicked: userPickedModelRef.current,
    });
    listVideoModels()
      .then((models) => {
        applyModels(models);
      })
      .catch((err) => {
        console.error(err);
        devLogI2V("model-list-failed", {
          message: err instanceof Error ? err.message : String(err),
        });
      })
      .finally(() => {
        if (!cancelled) setModelsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    listVideoModels,
    defaultModelId,
    defaultParams,
    lastUsedModelId,
    lastUsedParams,
    popoverHostId,
    registryVideoModels,
  ]);
  const prefillApplyTokenRef = reactExports.useRef(prefillApplyToken);
  reactExports.useEffect(() => {
    if (prefillApplyToken === void 0) return;
    if (prefillApplyTokenRef.current === prefillApplyToken) return;
    prefillApplyTokenRef.current = prefillApplyToken;
    const override = resolveI2VPrefillOverride({
      models: videoModels,
      prompt: defaultPrompt,
      modelId: defaultModelId,
      params: defaultParams,
    });
    attachmentState.clearPaths();
    if (override.prompt !== void 0) {
      setPromptText(override.prompt);
      setEditorHasText(true);
      setEditorContentRevision((revision) => revision + 1);
    }
    userPickedModelRef.current = false;
    if (!override.model) return;
    setSelectedModelId(override.model.id);
    const overrideModel = videoModels.find((model) => model.id === override.model?.id);
    setModelParams(
      overrideModel
        ? migrateLegacySeedance25GenerationModeParams(overrideModel, override.model.params)
        : override.model.params,
    );
    devLogI2V("prefill-token-applied", {
      selectedModelId: override.model.id,
    });
  }, [
    prefillApplyToken,
    attachmentState.clearPaths,
    defaultPrompt,
    defaultModelId,
    defaultParams,
    videoModels,
    popoverHostId,
  ]);
  const handleModelChange = reactExports.useCallback(
    (modelId) => {
      userPickedModelRef.current = true;
      setSelectedModelId(modelId);
      const model = videoModels.find((m3) => m3.id === modelId);
      if (model) {
        setModelParams(
          migrateLegacySeedance25GenerationModeParams(
            model,
            migrateParamsForModel(selectedModel, model, modelParams),
          ),
        );
      }
    },
    [videoModels, selectedModel, modelParams, popoverHostId],
  );
  const handleParamChange = reactExports.useCallback(
    (key2, value) => {
      if (key2 === IMAGE_MODE_KEY) {
        seedance25VideoExtendDurationUserControlledRef.current = false;
      } else if (key2 === "duration" && isSeedance25VideoExtend) {
        seedance25VideoExtendDurationUserControlledRef.current = true;
      }
      setModelParams((prev) => {
        const next2 =
          key2 === IMAGE_MODE_KEY
            ? resolveSeedance25ImageModeChangeParams(
                selectedModel,
                prev,
                value,
                seedance25VideoInputTotalDurationSec,
              )
            : {
                ...prev,
                [key2]: value,
              };
        return selectedModel ? enforceConstraints(next2, selectedModel) : next2;
      });
    },
    [isSeedance25VideoExtend, seedance25VideoInputTotalDurationSec, selectedModel],
  );
  const handleClaimHailuo03VideoTrial = reactExports.useCallback(
    async (e2) => {
      e2.stopPropagation();
      if (!claimHailuo03VideoTrial2 || isClaimingHailuo03Trial) return;
      setIsClaimingHailuo03Trial(true);
      try {
        const status = await claimHailuo03VideoTrial2();
        if (status?.claimed) {
          setModelParams((prev) => {
            if (
              !shouldSwitchHailuo03TrialClaimResolution({
                model: selectedModel,
                selectedModelId,
                modelParams: prev,
                eligibility: status.eligibility,
              })
            ) {
              return prev;
            }
            const resolution = resolveHailuo03TrialClaimResolution({
              model: selectedModel,
              selectedModelId,
              modelParams: prev,
              eligibility: status.eligibility,
            });
            if (!resolution) return prev;
            const next2 = {
              ...prev,
              resolution,
            };
            return selectedModel ? enforceConstraints(next2, selectedModel) : next2;
          });
          dedupedToast.success(
            t2("canvas.hailuo03Trial.claimSuccess", {
              count: status.remainingCount || status.freeCount,
              defaultValue: "已领取 {{count}} 次免费机会",
            }),
          );
          await refreshHailuo03VideoTrial?.();
          return;
        }
        dedupedToast.error(
          t2("canvas.hailuo03Trial.claimFailed", {
            defaultValue: "暂时无法领取免费机会，请稍后重试",
          }),
        );
      } catch {
        dedupedToast.error(
          t2("canvas.hailuo03Trial.claimFailed", {
            defaultValue: "暂时无法领取免费机会，请稍后重试",
          }),
        );
      } finally {
        setIsClaimingHailuo03Trial(false);
      }
    },
    [
      claimHailuo03VideoTrial2,
      isClaimingHailuo03Trial,
      refreshHailuo03VideoTrial,
      selectedModel,
      selectedModelId,
      t2,
    ],
  );
  const modelRequiredAttachment = getMissingRequiredAttachmentForI2V(
    selectedModel,
    attachmentState.imagePaths,
    attachmentState.videoPaths,
    attachmentState.audioPaths,
  );
  const isMissingH3FrameImage = isMissingH3FirstLastFrameImage(
    selectedModel,
    imageMode,
    attachmentState.imagePaths,
  );
  const hasUnsupportedTailOnlyFrame = isUnsupportedTailOnlyFirstLastFrameI2V(
    selectedModel,
    imageMode,
    attachmentState.imagePaths,
  );
  const sourceVideoCount = attachmentState.videoPaths.filter(
    (path2) => path2.trim().length > 0,
  ).length;
  const missingRequiredAttachment =
    (isVideoExtension || isSeedance25InheritedVideo) && sourceVideoCount === 0
      ? "video"
      : isMissingH3FrameImage || hasUnsupportedTailOnlyFrame
        ? "image"
        : imageMode === "reference" &&
            isMiniMaxH3MaxReferenceModel &&
            !attachmentState.imagePaths.some(Boolean) &&
            !attachmentState.videoPaths.some(Boolean)
          ? "image"
          : modelRequiredAttachment;
  const requiredAttachmentActionLabel =
    missingRequiredAttachment === "video"
      ? t2("canvas.imageSlot.entryVideo")
      : missingRequiredAttachment === "audio"
        ? t2("canvas.imageSlot.entryAudio", {
            defaultValue: "选择参考音频",
          })
        : hasUnsupportedTailOnlyFrame
          ? t2("canvas.imageSlot.firstFrame")
          : t2("canvas.imageSlot.entry");
  const missingRequiredAttachmentMessage = selectedModel?.name
    ? `${selectedModel.name}: ${requiredAttachmentActionLabel}`
    : requiredAttachmentActionLabel;
  let videoExtensionValidationMessage;
  if (isVideoExtension && !missingRequiredAttachment) {
    if (extensionSourceDurationSec === void 0) {
      videoExtensionValidationMessage = t2("canvas.videoExtension.durationUnavailable", {
        defaultValue: "无法读取原视频时长，请更换视频",
      });
    } else if (
      !isVideoExtensionInputDurationValid(extensionSourceDurationSec, videoExtensionCapability)
    ) {
      videoExtensionValidationMessage = t2("canvas.videoExtension.inputDurationRange", {
        defaultValue: "上传视频时长需在 2-15 秒之间",
      });
    } else if (
      !isVideoExtensionOutputDurationValid(
        extensionSourceDurationSec,
        modelParams.duration,
        videoExtensionCapability,
      )
    ) {
      videoExtensionValidationMessage = t2("canvas.videoExtension.outputDurationRange", {
        defaultValue: "续写后的总时长必须大于原视频，且最长 20 秒",
      });
    }
  }
  let seedance25InheritedVideoValidationMessage;
  if (isSeedance25InheritedVideo && !missingRequiredAttachment) {
    if (seedance25VideoInputTotalDurationSec === void 0) {
      seedance25InheritedVideoValidationMessage = t2(
        "canvas.seedance25.omniMode.durationUnavailable",
        {
          defaultValue: "无法读取输入视频时长，请更换视频",
        },
      );
    }
  }
  const isPromptOverLimit =
    !!selectedModel?.promptMaxLength && promptLength > selectedModel.promptMaxLength;
  const promptRequiredForSubmit = isPromptRequired || isVideoExtension;
  const effectiveHasUpstreamText = hasUpstreamText || attachmentState.textPaths.length > 0;
  const isMissingRequiredPrompt =
    promptRequiredForSubmit && !editorHasText && !effectiveHasUpstreamText;
  const submitTitle =
    videoExtensionValidationMessage ??
    seedance25InheritedVideoValidationMessage ??
    (referenceVideoDurationExceeded
      ? t2("canvas.videoSlot.totalTooLong", {
          defaultValue: "参考视频总时长超过 {{max}} 秒，请减少视频数量或更换更短的视频",
          max: referenceVideoTotalMaxSec,
        })
      : referenceAudioDurationExceeded
        ? t2("canvas.audioSlot.totalTooLong", {
            defaultValue: "参考音频总时长超过 {{max}} 秒，请减少音频数量或更换更短的音频",
            max: referenceAudioTotalMaxSec,
          })
        : referenceClipDurationInvalid
          ? t2("canvas.mediaSlot.durationOutOfRange", {
              defaultValue: "参考媒体时长不符合当前模型要求",
            })
          : missingRequiredAttachment
            ? missingRequiredAttachmentMessage
            : isMissingRequiredPrompt
              ? t2("canvas.promptRequired", {
                  defaultValue: "输入 prompt",
                })
              : t2("canvas.generate"));
  const canSubmit =
    accountSubmissionAllowed &&
    !!selectedModelId &&
    !isMissingRequiredPrompt &&
    !missingRequiredAttachment &&
    !videoExtensionValidationMessage &&
    !seedance25InheritedVideoValidationMessage &&
    !referenceVideoDurationExceeded &&
    !referenceAudioDurationExceeded &&
    !referenceClipDurationInvalid &&
    !isPreparing &&
    !isPromptOverLimit;
  const showDualButtons = !replaceNodeId && !!nodeId;
  const onSaveDraftRef = reactExports.useRef(onSaveDraft);
  onSaveDraftRef.current = onSaveDraft;
  const draftSnapshotRef = reactExports.useRef({
    promptText,
    selectedModelId,
    modelParams,
    imagePaths: attachmentState.imagePaths,
    videoPaths: attachmentState.videoPaths,
    audioPaths: attachmentState.audioPaths,
    textPaths: attachmentState.textPaths,
  });
  draftSnapshotRef.current = {
    promptText,
    selectedModelId,
    modelParams,
    imagePaths: attachmentState.imagePaths,
    videoPaths: attachmentState.videoPaths,
    audioPaths: attachmentState.audioPaths,
    textPaths: attachmentState.textPaths,
  };
  const modelLoadedRef = reactExports.useRef(false);
  modelLoadedRef.current = !modelsLoading && !!selectedModelId;
  const submittedRef = reactExports.useRef(false);
  const { navigationSavedRef, ...referenceNavigation } = useVideoReferenceNavigation({
    nodeId: nodeId ?? replaceNodeId,
    editorRef,
    expanded,
    count: count2,
    snapshot: navigationSnapshot,
    defaultImagePaths,
    defaultVideoPaths,
    defaultAudioPaths,
    defaultTextPaths,
    onSaveDraft,
    prompt: promptText,
    modelId: selectedModelId,
    params: stripDerivedReferenceParams(modelParams),
    paths: attachmentState,
  });
  const draftBaselineRef = reactExports.useRef(null);
  if (modelLoadedRef.current && draftBaselineRef.current === null) {
    draftBaselineRef.current = {
      prompt: promptText,
      modelId: selectedModelId,
      params: {
        ...modelParams,
      },
      // `useAttachmentState` reconciles the live graph order in an effect when
      // async model hydration changes the effective image mode. During the
      // render that first sees a loaded model, its state can still contain the
      // pre-reconcile graph order. The popover's resolved defaults already
      // include the draft slot assignment for this opening, so use them as the
      // pristine baseline instead of capturing that transient order. Otherwise
      // a second swap back to the graph order is incorrectly considered clean
      // and the latest slot assignment is never persisted.
      imagePaths: [...initImagePaths],
      videoPaths: [...attachmentState.videoPaths],
      audioPaths: [...attachmentState.audioPaths],
      textPaths: [...attachmentState.textPaths],
    };
  }
  reactExports.useEffect(
    () => () => {
      const shouldPersist = shouldPersistPopoverDraftOnUnmount(
        submittedRef.current,
        modelLoadedRef.current,
      );
      devLogI2V("unmount-cleanup", {
        submitted: submittedRef.current,
        modelLoaded: modelLoadedRef.current,
        selectedModelId: draftSnapshotRef.current.selectedModelId,
        imageCount: draftSnapshotRef.current.imagePaths.length,
        videoCount: draftSnapshotRef.current.videoPaths.length,
        audioCount: draftSnapshotRef.current.audioPaths.length,
      });
      if (navigationSavedRef.current || !shouldPersist) return;
      const editor = editorRef.current;
      const snapshot2 = draftSnapshotRef.current;
      const editorAlive = editor && !editor.isDestroyed;
      const livePrompt = editorAlive ? extractCanvasEditorText(editor) : snapshot2.promptText;
      const baseline = draftBaselineRef.current;
      if (baseline) {
        const isDirty = popoverDraftIsDirty(baseline, {
          prompt: livePrompt,
          modelId: snapshot2.selectedModelId,
          params: snapshot2.modelParams,
          imagePaths: snapshot2.imagePaths,
          videoPaths: snapshot2.videoPaths,
          audioPaths: snapshot2.audioPaths,
          textPaths: snapshot2.textPaths,
        });
        devLogI2V("unmount-dirty-check", {
          baselineModelId: baseline.modelId,
          liveModelId: snapshot2.selectedModelId,
        });
        if (!isDirty) return;
      }
      onSaveDraftRef.current?.({
        prompt: livePrompt,
        promptJson: editorAlive ? JSON.stringify(editor.getJSON()) : void 0,
        modelId: snapshot2.selectedModelId,
        params: stripDerivedReferenceParams(snapshot2.modelParams),
        imagePaths: snapshot2.imagePaths,
        videoPaths: snapshot2.videoPaths,
        audioPaths: snapshot2.audioPaths,
        textPaths: snapshot2.textPaths,
      });
    },
    [popoverHostId, navigationSavedRef],
  );
  const handleRestoreOriginalDraft = reactExports.useCallback(
    (e2) => {
      e2.stopPropagation();
      if (!originalGenerationDraft) return;
      const override = resolveI2VPrefillOverride({
        models: videoModels,
        prompt: originalGenerationDraft.prompt,
        modelId: originalGenerationDraft.modelId,
        params: originalGenerationDraft.params,
      });
      const nextPrompt = originalGenerationDraft.prompt ?? "";
      const nextPromptJson = originalGenerationDraft.promptJson;
      const nextModelId = override.model?.id ?? originalGenerationDraft.modelId ?? selectedModelId;
      const nextParams = override.model?.params ?? {
        ...(originalGenerationDraft.params ?? {}),
      };
      userPickedModelRef.current = true;
      if (nextModelId) setSelectedModelId(nextModelId);
      setModelParams(nextParams);
      setPromptText(nextPrompt);
      setEditorHasText(nextPrompt.trim().length > 0);
      setPromptLength(countPromptCharacters(nextPrompt));
      setEditorContentOverride(buildPromptContent(nextPrompt, nextPromptJson));
      setEditorContentRevision((revision) => revision + 1);
      const snapshot2 = draftSnapshotRef.current;
      draftSnapshotRef.current = {
        ...snapshot2,
        promptText: nextPrompt,
        selectedModelId: nextModelId,
        modelParams: nextParams,
      };
      draftBaselineRef.current = {
        prompt: nextPrompt,
        modelId: nextModelId,
        params: {
          ...nextParams,
        },
        imagePaths: [...snapshot2.imagePaths],
        videoPaths: [...snapshot2.videoPaths],
        audioPaths: [...snapshot2.audioPaths],
        textPaths: [...snapshot2.textPaths],
      };
      onSaveDraftRef.current?.({
        prompt: nextPrompt,
        ...(nextPromptJson
          ? {
              promptJson: nextPromptJson,
            }
          : {}),
        ...(nextModelId
          ? {
              modelId: nextModelId,
            }
          : {}),
        params: nextParams,
        imagePaths: snapshot2.imagePaths,
        videoPaths: snapshot2.videoPaths,
        audioPaths: snapshot2.audioPaths,
        textPaths: snapshot2.textPaths,
      });
    },
    [originalGenerationDraft, videoModels, selectedModelId, buildPromptContent],
  );
  const { validate: checkReferencesBeforeSubmit } = useAssetsRefValidate({
    submit: {
      editorRef,
      promptText,
      setPromptText,
      attachmentState,
    },
  });
  const submitFilePath = attachmentState.filePaths[0];
  const doSubmit = reactExports.useCallback(
    async (e2, replaceId) => {
      e2.stopPropagation();
      if (missingRequiredAttachment) {
        dedupedToast.error(missingRequiredAttachmentMessage);
        return;
      }
      if (videoExtensionValidationMessage) {
        dedupedToast.error(videoExtensionValidationMessage);
        return;
      }
      if (seedance25InheritedVideoValidationMessage) {
        dedupedToast.error(seedance25InheritedVideoValidationMessage);
        return;
      }
      if (!canSubmit) return;
      if (!beforeAccountSubmission()) return;
      if (!(await checkReferencesBeforeSubmit())) return;
      if (isVideoExtension && sourceAspectRatio) {
        onAspectRatioChange?.(sourceAspectRatio);
      } else if (isSeedance25InheritedVideo && sourceAspectRatio) {
        onAspectRatioChange?.(sourceAspectRatio);
      }
      const trimmed = attachmentState.imagePaths;
      const trimmedVideos = attachmentState.videoPaths;
      const trimmedAudios = attachmentState.audioPaths;
      const strippedModelParams = {
        ...stripDerivedReferenceParams(modelParams),
      };
      const cleanModelParams = isVideoExtension
        ? sanitizeVideoExtensionSubmitParams(strippedModelParams)
        : strippedModelParams;
      const effectiveSubmitModelParams = resolveEffectiveI2VVideoParams(
        selectedModel,
        cleanModelParams,
        imageMode,
        trimmed,
        trimmedVideos,
        trimmedAudios,
      );
      const seedance25SubmitModelParams = resolveSeedance25SubmitParams(
        selectedModel,
        effectiveSubmitModelParams,
        imageMode,
      );
      const submitParams = buildSpecialI2VSubmitParams(
        selectedModel,
        seedance25SubmitModelParams,
        trimmedVideos,
        trimmedAudios,
      );
      if (submitFilePath) submitParams.file_url = submitFilePath;
      if (trimmedAudios.length > 0 && isSeedanceModel(selectedModel)) {
        const badAudio = trimmedAudios.find(hasUnsupportedReferenceAudioFormat);
        if (badAudio) {
          dedupedToast.error(
            t2("canvas.audioSlot.formatUnsupported", {
              defaultValue: "参考音频仅支持 mp3 / wav 格式，请更换音频文件",
            }),
          );
          return;
        }
      }
      if (trimmedAudios.length > 0 || trimmedVideos.length > 0) {
        const pathToDuration = new Map();
        assets.forEach((meta2) => {
          if (
            meta2.path &&
            !pathToDuration.has(`${meta2.type}:${meta2.path}`) &&
            typeof meta2.durationSec === "number" &&
            meta2.durationSec > 0
          ) {
            pathToDuration.set(`${meta2.type}:${meta2.path}`, meta2.durationSec);
          }
        });
        if (trimmedAudios.length > 0) {
          let totalAudioSec = 0;
          for (const p3 of trimmedAudios) totalAudioSec += pathToDuration.get(`audio:${p3}`) ?? 0;
          if (totalAudioSec > referenceAudioTotalMaxSec) {
            dedupedToast.error(
              t2("canvas.audioSlot.totalTooLong", {
                defaultValue: "参考音频总时长超过 {{max}} 秒，请减少音频数量或更换更短的音频",
                max: referenceAudioTotalMaxSec,
              }),
            );
            return;
          }
        }
        if (trimmedVideos.length > 0) {
          let totalVideoSec = 0;
          for (const p3 of trimmedVideos) totalVideoSec += pathToDuration.get(`video:${p3}`) ?? 0;
          if (totalVideoSec > referenceVideoTotalMaxSec) {
            dedupedToast.error(
              t2("canvas.videoSlot.totalTooLong", {
                defaultValue: "参考视频总时长超过 {{max}} 秒，请减少视频数量或更换更短的视频",
                max: referenceVideoTotalMaxSec,
              }),
            );
            return;
          }
        }
      }
      const editor = editorRef.current;
      const rawPrompt = editor ? extractCanvasEditorText(editor) : promptText;
      const authoredPrompt = editor ? extractCanvasEditorSubmitText(editor) : promptText;
      const chipPromptJson = editor ? JSON.stringify(editor.getJSON()) : void 0;
      const hasPersistentReferences =
        (editor ? collectTextChipPaths(editor).length > 0 : false) ||
        [
          ...attachmentState.imagePaths,
          ...attachmentState.videoPaths,
          ...attachmentState.audioPaths,
          ...attachmentState.textPaths,
        ].some(isCanvasReferenceUri);
      setPromptText(rawPrompt);
      setIsPreparing(true);
      let selectedReferenceText = "";
      try {
        selectedReferenceText = await loadReferenceTextContent(
          attachmentState.textPaths,
          loadTextContent,
          currentReferenceTextContent,
        );
      } catch {
        dedupedToast.error(
          t2("canvas.reference.unavailable", "Reference unavailable. Please select again."),
        );
        return;
      } finally {
        setIsPreparing(false);
      }
      if (promptRequiredForSubmit && !selectedReferenceText && !authoredPrompt.trim()) {
        dedupedToast.error(
          t2("canvas.promptRequired", {
            defaultValue: "输入 prompt",
          }),
        );
        return;
      }
      if (!replaceId && nodeId && hasPersistentReferences && chipPromptJson) {
        attachDraftOnNextDerived(nodeId, "i2v", {
          prompt: rawPrompt,
          promptJson: chipPromptJson,
          modelId: selectedModelId,
          params: {
            ...cleanModelParams,
          },
          imagePaths: trimmed,
          videoPaths: trimmedVideos,
          audioPaths: trimmedAudios,
          textPaths: attachmentState.textPaths,
        });
      }
      const referencePaths = {
        imagePaths: trimmed,
        videoPaths: trimmedVideos,
        audioPaths: trimmedAudios,
      };
      const compiled = compileChipPromptForModel(authoredPrompt, referencePaths);
      const promptForSubmit = composePromptWithReferenceText(selectedReferenceText, compiled.text);
      const finalPromptLength = countCompiledMediaPromptCharacters(
        authoredPrompt,
        selectedReferenceText,
        referencePaths,
      );
      if (selectedModel?.promptMaxLength && finalPromptLength > selectedModel.promptMaxLength) {
        setPromptLength(finalPromptLength);
        dedupedToast.error(
          t2("canvas.prompt.tooLong", {
            current: finalPromptLength,
            max: selectedModel.promptMaxLength,
          }),
        );
        return;
      }
      if (compiled.unresolved.length > 0) {
        dedupedToast.warning(
          `以下引用未在附件中找到，已保留原文: ${compiled.unresolved.map((u4) => `@${u4.path}`).join(", ")}`,
        );
      }
      const submittedDraft = {
        prompt: rawPrompt,
        promptJson: chipPromptJson,
        modelId: selectedModelId,
        params: cleanModelParams,
        imagePaths: trimmed,
        videoPaths: trimmedVideos,
        audioPaths: trimmedAudios,
        textPaths: attachmentState.textPaths,
      };
      setIsPreparing(true);
      let accepted = false;
      try {
        accepted = await submitWithPersistedPopoverDraft({
          draft: submittedDraft,
          saveDraft: onSaveDraftRef.current,
          markSubmitted: () => {
            submittedRef.current = true;
          },
          submit: () =>
            onSubmit(
              promptForSubmit,
              selectedModelId,
              submitParams,
              trimmed,
              trimmedVideos,
              trimmedAudios,
              replaceId,
              // Display-form prompt for persistence — see I2VPopoverProps.onSubmit.
              rawPrompt,
              effectiveCount,
              attachmentState.textPaths,
            ),
        });
      } finally {
        setIsPreparing(false);
      }
      if (!accepted) return;
      if (selectedModel && saveLastUsedModelParams) {
        const lastUsedModelParams = {
          ...cleanModelParams,
        };
        delete lastUsedModelParams[LEGACY_SEEDANCE_25_TASK_TYPE_PARAM];
        if (isSeedance25InheritedVideo) lastUsedModelParams.image_mode = "reference";
        saveLastUsedModelParams(
          "i2v",
          selectedModelId,
          pickPersistableModelParams(lastUsedModelParams, selectedModel),
        );
      }
      onClose();
    },
    [
      onSubmit,
      onClose,
      promptText,
      selectedModelId,
      selectedModel,
      modelParams,
      imageMode,
      attachmentState.imagePaths,
      attachmentState.videoPaths,
      attachmentState.audioPaths,
      attachmentState.textPaths,
      submitFilePath,
      currentReferenceTextContent,
      assets,
      t2,
      canSubmit,
      beforeAccountSubmission,
      checkReferencesBeforeSubmit,
      missingRequiredAttachment,
      missingRequiredAttachmentMessage,
      videoExtensionValidationMessage,
      seedance25InheritedVideoValidationMessage,
      isVideoExtension,
      isSeedance25InheritedVideo,
      sourceAspectRatio,
      onAspectRatioChange,
      loadTextContent,
      attachDraftOnNextDerived,
      nodeId,
      saveLastUsedModelParams,
      effectiveCount,
      referenceAudioTotalMaxSec,
      referenceVideoTotalMaxSec,
      promptRequiredForSubmit,
    ],
  );
  const inGeneratingState = isGenerating || isPreparing;
  const pendingSubmitRef = reactExports.useRef(null);
  const handleConfirm = reactExports.useCallback(
    (e2) => {
      if (modelsLoading || !selectedModelId) {
        pendingSubmitRef.current = {
          kind: "confirm",
        };
        return;
      }
      void doSubmit(e2, replaceNodeId);
    },
    [doSubmit, modelsLoading, replaceNodeId, selectedModelId],
  );
  const handleNewNode = reactExports.useCallback(
    (e2) => {
      if (modelsLoading || !selectedModelId) {
        pendingSubmitRef.current = {
          kind: "new",
        };
        return;
      }
      void doSubmit(e2, void 0);
    },
    [doSubmit, modelsLoading, selectedModelId],
  );
  const handleReplace = reactExports.useCallback(
    (e2) => {
      if (modelsLoading || !selectedModelId) {
        pendingSubmitRef.current = nodeId
          ? {
              kind: "replace",
              targetNodeId: nodeId,
            }
          : {
              kind: "confirm",
            };
        return;
      }
      void doSubmit(e2, nodeId);
    },
    [doSubmit, modelsLoading, nodeId, selectedModelId],
  );
  reactExports.useEffect(() => {
    if (modelsLoading || !selectedModelId) return;
    const pending2 = pendingSubmitRef.current;
    if (!pending2) return;
    pendingSubmitRef.current = null;
    const syntheticEvent = {
      stopPropagation: () => void 0,
    };
    if (pending2.kind === "confirm") void doSubmit(syntheticEvent, replaceNodeId);
    else if (pending2.kind === "new") void doSubmit(syntheticEvent, void 0);
    else void doSubmit(syntheticEvent, pending2.targetNodeId);
  }, [doSubmit, modelsLoading, replaceNodeId, selectedModelId]);
  const handleAttachmentClick = reactExports.useCallback((item) => {
    if (item.kind === "file") return;
    editorRef.current?.commands.insertCanvasFileRef({
      path: item.path,
      filename: item.name,
      kind: item.kind,
    });
  }, []);
  const handleRemoveAttachment = reactExports.useCallback(
    (path2) => {
      attachmentState.removePath(path2, {
        tearEdge: true,
      });
      editorRef.current?.commands.removeCanvasFileRefsByPath(path2);
    },
    [attachmentState],
  );
  const replacement = useAttachmentReplacement(attachmentState, editorRef);
  const handleFrameImagePathsUpdate = reactExports.useCallback(
    (nextPaths) => {
      const retainedPaths = new Set(nextPaths.filter(Boolean));
      for (const path2 of attachmentState.imagePaths) {
        if (path2 && !retainedPaths.has(path2)) {
          editorRef.current?.commands.removeCanvasFileRefsByPath(path2);
        }
      }
      attachmentState.replaceImagePaths(nextPaths);
    },
    [attachmentState.imagePaths, attachmentState.replaceImagePaths],
  );
  const handleClipReferenceVideo = reactExports.useCallback(
    (item) => {
      handleRemoveAttachment(item.path);
      setReferenceVideoForClip(item);
    },
    [handleRemoveAttachment],
  );
  const handleClipReferenceAudio = reactExports.useCallback(
    (item) => {
      handleRemoveAttachment(item.path);
      setReferenceAudioForClip(item);
    },
    [handleRemoveAttachment],
  );
  const handleReferenceVideoClipExport = reactExports.useCallback(
    async (blob, filename) => {
      if (!referenceVideoForClip || !cropImage) return;
      const sourceNodeId = getNodeIdByPath(referenceVideoForClip.path);
      if (!sourceNodeId) {
        dedupedToast.error(
          t2("canvas.videoSlot.clipSourceMissing", {
            defaultValue: "找不到原视频，无法裁剪",
          }),
        );
        return;
      }
      const clippedNodeId = await cropImage(
        sourceNodeId,
        blob,
        filename,
        getAdjacentNodePosition(reactFlow, sourceNodeId, 350),
      );
      focusDerivedNode(clippedNodeId);
      setReferenceVideoForClip(null);
    },
    [cropImage, focusDerivedNode, getNodeIdByPath, reactFlow, referenceVideoForClip, t2],
  );
  const handleReferenceAudioClipExport = reactExports.useCallback(
    async (blob, filename) => {
      if (!referenceAudioForClip || !cropImage) return;
      const sourceNodeId = getNodeIdByPath(referenceAudioForClip.path);
      if (!sourceNodeId) {
        dedupedToast.error(
          t2("canvas.audioSlot.clipSourceMissing", {
            defaultValue: "找不到原音频，无法裁剪",
          }),
        );
        return;
      }
      const clippedNodeId = await cropImage(
        sourceNodeId,
        blob,
        filename,
        getAdjacentNodePosition(reactFlow, sourceNodeId, 350),
      );
      focusDerivedNode(clippedNodeId);
      setReferenceAudioForClip(null);
    },
    [cropImage, focusDerivedNode, getNodeIdByPath, reactFlow, referenceAudioForClip, t2],
  );
  const handleAtTrigger = reactExports.useCallback((query, rect, getRect2, triggerRange) => {
    setAtPickerState((state2) =>
      nextAtPickerState(state2, {
        query,
        rect,
        getRect: getRect2,
        triggerRange,
      }),
    );
  }, []);
  const handleFileRefSwitchSelect = useMediaFileRefSwitch(attachmentState);
  const handleAtSelect = reactExports.useCallback(
    (meta2, assetId, sourceNodeId) => {
      const rawKind = meta2.type;
      if (rawKind === "text") {
        const admitted = attachmentState.addPaths(
          [
            {
              path: meta2.path,
              sourceNodeId: sourceNodeId ?? assetId,
            },
          ],
          "text",
        );
        if (!admitted.includes(meta2.path)) {
          setAtPickerState((state2) => ({
            ...state2,
            open: false,
          }));
          return;
        }
        editorRef.current?.commands.replaceAtTriggerWithFileRef(
          {
            path: meta2.path,
            filename: meta2.name,
            kind: "text",
          },
          atPickerState.triggerRange ?? void 0,
        );
        setAtPickerState((s2) => ({
          ...s2,
          open: false,
        }));
        return;
      }
      const kind = rawKind;
      if (kind !== "image" && kind !== "video" && kind !== "audio") return;
      handleFileRefSwitchSelect(meta2, assetId, sourceNodeId);
      editorRef.current?.commands.replaceAtTriggerWithFileRef(
        {
          path: meta2.path,
          filename: meta2.name,
          kind,
        },
        atPickerState.triggerRange ?? void 0,
      );
      setAtPickerState((s2) => ({
        ...s2,
        open: false,
      }));
    },
    [attachmentState, atPickerState.triggerRange, handleFileRefSwitchSelect],
  );
  const handleEditorUpdate = reactExports.useCallback((hasContent2, textLen) => {
    setEditorHasText(hasContent2);
    setPromptLength(textLen);
  }, []);
  const handleEditorReady = reactExports.useCallback(
    (editor) => {
      if (!isFirstLastFrame) return;
      if (removeCanvasSubjectReferences(editor).length > 0)
        removedSubjectReferencesRef.current = true;
      setPromptText(extractCanvasEditorText(editor));
    },
    [isFirstLastFrame],
  );
  const resolveFinalPromptCharacterCount = reactExports.useCallback(
    (serializedPrompt) =>
      countCompiledMediaPromptCharacters(serializedPrompt, currentReferenceTextContent, {
        imagePaths: attachmentState.imagePaths,
        videoPaths: attachmentState.videoPaths,
        audioPaths: attachmentState.audioPaths,
      }),
    [
      attachmentState.imagePaths,
      attachmentState.videoPaths,
      attachmentState.audioPaths,
      currentReferenceTextContent,
    ],
  );
  const handleFileRefsAdded = reactExports.useCallback(
    (refs) => {
      const imageAdds = [];
      const videoAdds = [];
      const audioAdds = [];
      const textAdds = [];
      for (const ref of refs) {
        if (isFirstLastFrame && isCanvasSubjectReference(ref.path)) {
          editorRef.current?.commands.removeCanvasFileRefsByPath(ref.path);
          attachmentState.removePath(ref.path);
          continue;
        }
        if (ref.kind === "image") imageAdds.push(ref.path);
        else if (ref.kind === "video") videoAdds.push(ref.path);
        else if (ref.kind === "audio") audioAdds.push(ref.path);
        else if (ref.kind === "text") textAdds.push(ref.path);
      }
      if (!isTextToVideo && imageAdds.length > 0) attachmentState.addPaths(imageAdds, "image");
      if (!isTextToVideo && videoAdds.length > 0) attachmentState.addPaths(videoAdds, "video");
      if (!isTextToVideo && audioAdds.length > 0) attachmentState.addPaths(audioAdds, "audio");
      if (textAdds.length > 0) {
        const admitted = new Set(attachmentState.addPaths(textAdds, "text"));
        for (const path2 of textAdds) {
          if (!admitted.has(path2)) editorRef.current?.commands.removeCanvasFileRefsByPath(path2);
        }
      }
    },
    [attachmentState, isTextToVideo, isFirstLastFrame],
  );
  const existingPathSet = reactExports.useMemo(
    () =>
      new Set([
        ...attachmentState.imagePaths,
        ...attachmentState.videoPaths,
        ...attachmentState.audioPaths,
        ...attachmentState.textPaths,
        ...attachmentState.filePaths,
      ]),
    [
      attachmentState.imagePaths,
      attachmentState.videoPaths,
      attachmentState.audioPaths,
      attachmentState.textPaths,
      attachmentState.filePaths,
    ],
  );
  const atPickerKindFilter = attachmentState.modelSupportedKindsForAtPicker;
  const renderedParamElements = reactExports.useMemo(() => {
    if (!selectedModel) return null;
    const elements = [];
    const consumedKeys = new Set();
    const hiddenParams = new Set(selectedModel.hiddenParamsByImageMode?.[imageMode] ?? []);
    for (const std of STANDARD_PARAMS) {
      const matchedKey = std.aliases.find((a2) => selectedModel.params[a2]);
      const def = matchedKey ? selectedModel.params[matchedKey] : void 0;
      const stdLabel = t2(std.i18nKey, {
        defaultValue: std.fallbackLabel,
      });
      if (matchedKey) consumedKeys.add(matchedKey);
      if (matchedKey && hiddenParams.has(matchedKey)) continue;
      if (isSeedance25VideoEdit && std.id === "duration") continue;
      if (std.id === "image_mode") {
        if (def && matchedKey) {
          const disabled2 = getDisabledOptions(
            matchedKey,
            modelParams,
            selectedModel.paramConstraints,
          );
          const imageModeOptions = resolveSeedance25ImageModeOptions(
            selectedModel,
            (def.options ?? []).filter((opt) => opt !== VIDEO_EXTENSION_MODE),
            hasSeedance25VideoInput,
          );
          elements.push(
            <ParamTabs
              key={`std-${std.id}`}
              label={stdLabel}
              options={imageModeOptions}
              value={modelParams[matchedKey] ?? def.default}
              onChange={(v2) => handleParamChange(matchedKey, v2)}
              disabled={formDisabled}
              disabledOptions={disabled2}
              getOptionLabel={(opt) => imageModeOptionLabel(t2, opt)}
              variant="track"
              trackColumns={isSeedance25Model(selectedModel) ? 2 : void 0}
            />,
          );
        }
        continue;
      }
      if (isVideoExtension && std.id === "aspect_ratio") continue;
      if (def && matchedKey) {
        const disabled2 = getDisabledOptions(
          matchedKey,
          modelParams,
          selectedModel.paramConstraints,
        );
        const disabledFieldOptions =
          std.id === "duration"
            ? new Set([
                ...disabled2,
                ...disabledExtensionDurationOptions,
                ...referenceVideoBudgetDisabledDurations,
              ])
            : disabled2;
        const fieldValue =
          std.id === "aspect_ratio"
            ? (effectiveModelParams[matchedKey] ?? def.default)
            : (modelParams[matchedKey] ?? def.default);
        const fieldOptions =
          isVideoExtension && std.id === "duration"
            ? effectiveDurationOptions
            : (def.options ?? []);
        const fieldOnChange = (v2) => handleParamChange(matchedKey, v2);
        if (std.id === "aspect_ratio") {
          elements.push(
            <I2VAspectRatioField
              key={`std-${std.id}`}
              model={selectedModel}
              imageMode={imageMode}
              imagePaths={attachmentState.imagePaths}
              videoPaths={attachmentState.videoPaths}
              audioPaths={attachmentState.audioPaths}
              options={fieldOptions}
              value={fieldValue}
              onChange={fieldOnChange}
              disabled={formDisabled}
              disabledOptions={disabled2}
              label={stdLabel}
            />,
          );
        } else if (std.id === "resolution") {
          const getResolutionTooltip = (opt) => {
            if (!isMiniMaxH3VideoModel || disabled2.has(opt)) return void 0;
            if (opt === "768P") {
              return t2("canvas.param.resolutionTooltip.h3.768P", {
                defaultValue: "成本低，适合多次抽卡；结果满意后可超分至 2K，提高画质和细节",
              });
            }
            if (opt === "2K") {
              return t2("canvas.param.resolutionTooltip.h3.2K", {
                defaultValue: "直接生成 2K 视频，画质与细节更好",
              });
            }
            return void 0;
          };
          elements.push(
            <div key={`std-${std.id}`}>
              <ParamSectionLabel>{stdLabel}</ParamSectionLabel>
              <ResolutionTabs
                options={fieldOptions}
                value={fieldValue}
                onChange={fieldOnChange}
                disabled={formDisabled}
                disabledOptions={disabled2}
                getOptionTooltip={getResolutionTooltip}
              />
            </div>,
          );
        } else if (std.id === "duration" && hasContinuousDurationOptions(fieldOptions)) {
          elements.push(
            <ParamDurationSlider
              key={`std-${std.id}-${selectedModel.id}-${fieldOptions.join(",")}`}
              label={stdLabel}
              options={fieldOptions}
              value={fieldValue}
              onChange={fieldOnChange}
              disabled={formDisabled}
              disabledOptions={disabledFieldOptions}
            />,
          );
        } else {
          elements.push(
            <ParamTabs
              key={`std-${std.id}`}
              label={stdLabel}
              options={fieldOptions}
              value={fieldValue}
              onChange={fieldOnChange}
              disabled={formDisabled}
              disabledOptions={disabledFieldOptions}
              optionUnit={std.id === "duration" ? "seconds" : void 0}
              getDisabledOptionTooltip={
                isVideoExtension && std.id === "duration"
                  ? () =>
                      t2("canvas.videoExtension.durationOptionDisabled", {
                        defaultValue:
                          "The final duration must start from the whole second after rounding up the source video duration.",
                      })
                  : void 0
              }
              getOptionLabel={
                isVideoExtension && std.id === "duration" ? (opt) => `${opt}s` : void 0
              }
              grouped={isVideoExtension && std.id === "duration"}
            />,
          );
        }
      }
    }
    for (const [key2, def] of Object.entries(selectedModel.params)) {
      if (consumedKeys.has(key2)) continue;
      if (hiddenParams.has(key2)) continue;
      if (isVideoExtension && shouldHideVideoExtensionParam(key2)) continue;
      if (def.type === "select" && (!def.options || def.options.length <= 1)) continue;
      if (def.type === "textarea") {
        const labelKey = paramI18nKey(key2, def.label);
        const placeholderKey = paramPlaceholderI18nKey(key2);
        elements.push(
          <ParamTextarea
            key={key2}
            label={
              labelKey
                ? t2(labelKey, {
                    defaultValue: paramLabelFallback(key2, def.label),
                  })
                : paramLabelFallback(key2, def.label)
            }
            value={modelParams[key2] ?? def.default ?? ""}
            onChange={(v2) => handleParamChange(key2, v2)}
            disabled={formDisabled}
            placeholder={
              placeholderKey
                ? t2(placeholderKey, {
                    defaultValue: paramPlaceholderFallback(key2, def.placeholder),
                  })
                : paramPlaceholderFallback(key2, def.placeholder)
            }
          />,
        );
        continue;
      }
      elements.push(
        <ModelParamSelect
          key={key2}
          paramKey={key2}
          definition={def}
          value={modelParams[key2] ?? def.default}
          onChange={(v2) => handleParamChange(key2, v2)}
          disabled={formDisabled}
          disabledOptions={getDisabledOptions(key2, modelParams, selectedModel.paramConstraints)}
        />,
      );
    }
    return elements;
  }, [
    selectedModel,
    modelParams,
    effectiveModelParams,
    formDisabled,
    handleParamChange,
    t2,
    isVideoExtension,
    effectiveDurationOptions,
    disabledExtensionDurationOptions,
    referenceVideoBudgetDisabledDurations,
    imageMode,
    attachmentState.imagePaths,
    attachmentState.videoPaths,
    attachmentState.audioPaths,
    isMiniMaxH3VideoModel,
    hasSeedance25VideoInput,
    isSeedance25VideoEdit,
  ]);
  const hasConfigurableParams = (renderedParamElements?.length ?? 0) > 0;
  const attachmentChipCount = isTextToVideo
    ? 0
    : isFirstLastFrame
      ? 2
      : attachmentState.items.length + (attachmentState.showAddButton ? 1 : 0);
  const extraHeight = attachmentExtraHeight(attachmentChipCount);
  const body2 = (
    <>
      <VideoPopoverReferenceSection
        isTextToVideo={isTextToVideo}
        isFirstLastFrame={isFirstLastFrame}
        imagePaths={attachmentState.imagePaths}
        resolveFileUrl={resolveFileUrl}
        onUpdatePaths={handleFrameImagePathsUpdate}
        attachments={{
          items: attachmentState.items,
          disabled: formDisabled,
          videoDurationLimitSec: referenceVideoTotalMaxSec,
          audioDurationLimitSec: referenceAudioTotalMaxSec,
          onClipVideo: handleClipReferenceVideo,
          onClipAudio: handleClipReferenceAudio,
          showAddButton: attachmentState.showAddButton,
          onReplace: replacement.replaceAttachment,
          onRemove: handleRemoveAttachment,
          onAdd: () => {
            void attachmentState.openPicker();
          },
          onItemClick: handleAttachmentClick,
          getLocateAction: referenceNavigation.getLocateAction,
        }}
        expanded={expanded}
        onToggle={() => setExpanded((v2) => !v2)}
        videoClipItem={referenceVideoForClip}
        audioClipItem={referenceAudioForClip}
        onCloseVideoClip={() => setReferenceVideoForClip(null)}
        onCloseAudioClip={() => setReferenceAudioForClip(null)}
        onExportVideoClip={handleReferenceVideoClipExport}
        onExportAudioClip={handleReferenceAudioClipExport}
      />
      <div className="flex-1 min-h-0">
        <RichPromptInput
          key={editorContentRevision}
          initialContent={editorContentOverride ?? initialEditorContent}
          editorRef={editorRef}
          onEditorReady={(editor) => {
            handleEditorReady(editor);
            referenceNavigation.onEditorReady(editor);
          }}
          disabled={formDisabled}
          placeholder=""
          onClose={onClose}
          blockKeyHandlers={inGeneratingState || atPickerState.open}
          onAtTrigger={handleAtTrigger}
          onAtDismiss={() =>
            setAtPickerState((s2) => ({
              ...s2,
              open: false,
            }))
          }
          onUpdate={handleEditorUpdate}
          resolveCharacterCount={resolveFinalPromptCharacterCount}
          resolveFileUrl={resolveFileUrl}
          fileRefSwitchConfig={
            formDisabled
              ? void 0
              : {
                  kindFilter: atPickerKindFilter,
                  existingPaths: existingPathSet,
                  excludeAssetIds: selfAssetIds,
                  constraints: attachmentState.pickerConstraints,
                  onSelectAsset: handleFileRefSwitchSelect,
                }
          }
          onFileRefsAdded={handleFileRefsAdded}
          onDirectReferencesRemoved={(paths) => {
            for (const path2 of paths) attachmentState.removePath(path2);
          }}
          maxLength={selectedModel?.promptMaxLength}
          emptyStateAction={promptEmptyState}
          counterLeadingAction={
            providerTaskId ? <ProviderTaskIdChip value={providerTaskId} compact={true} /> : void 0
          }
        />
        {atPickerState.open && atPickerState.rect && (
          <MentionPickerPopover
            query={atPickerState.query}
            anchorRect={atPickerState.rect}
            getAnchorRect={atPickerState.getRect ?? void 0}
            kindFilter={atPickerKindFilter}
            hideSubjects={imageMode === "first-last-frame"}
            existingPaths={existingPathSet}
            excludeAssetIds={selfAssetIds}
            constraints={attachmentState.pickerConstraints}
            resolveFileUrl={resolveFileUrl}
            onSelect={handleAtSelect}
            onClose={() =>
              setAtPickerState((s2) => ({
                ...s2,
                open: false,
              }))
            }
          />
        )}
      </div>
      <div className="relative flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <ModelChip
            models={videoModels}
            selectedModelId={selectedModelId}
            onChange={handleModelChange}
            loading={modelsLoading}
            disabled={formDisabled}
            onPromotionClick={buildPromotionClickHandler(onPromotionToast)}
          />
          {hasConfigurableParams && (
            <>
              <span aria-hidden={true} className="w-px h-3 bg-foreground/15 shrink-0" />
              <ParamsChip
                anchorRef={paramsAnchorRef}
                summary={paramsSummary}
                open={paramsOpen}
                onToggle={() => setParamsOpen((v2) => !v2)}
                disabled={formDisabled || !selectedModel}
              />
            </>
          )}
          {showCountChip && (
            <>
              <span aria-hidden={true} className="w-px h-3 bg-foreground/15 shrink-0" />
              <CountChip
                value={effectiveCount}
                maxCount={MAX_VIDEOS_PER_SUBMIT$1}
                options={VIDEO_COUNT_OPTIONS}
                onChange={setCount}
                disabled={formDisabled}
              />
            </>
          )}
          {originalGenerationDraft && (
            <>
              <span aria-hidden={true} className="w-px h-3 bg-foreground/15 shrink-0" />
              <Tooltip$1 content={t2("canvas.popover.restoreOriginalDraft")} side="top">
                <button
                  type="button"
                  data-action-ui-id="popover.restore-original-draft"
                  aria-label={t2("canvas.popover.restoreOriginalDraft")}
                  onClick={handleRestoreOriginalDraft}
                  disabled={formDisabled}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[var(--canvas-controls-text-muted)] transition-colors duration-150 hover:bg-[var(--canvas-controls-hover)] hover:text-[var(--canvas-controls-text)] disabled:cursor-default disabled:opacity-40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--canvas-controls-border)]"
                >
                  <FileClock size={16} strokeWidth={1} />
                </button>
              </Tooltip$1>
            </>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {canClaimHailuo03VideoTrial && (
            <Tooltip$1 content={hailuo03VideoTrialClaimHint} side="top">
              <button
                type="button"
                className="h-8 rounded-md border border-[var(--canvas-controls-border)] px-2.5 text-[13px] font-medium text-[var(--canvas-controls-text)] transition-colors duration-150 hover:enabled:bg-[var(--canvas-controls-hover)] disabled:cursor-default disabled:opacity-50"
                onClick={handleClaimHailuo03VideoTrial}
                disabled={formDisabled || isClaimingHailuo03Trial}
                data-action-ui-id="popover.hailuo03-claim-trial"
              >
                {isClaimingHailuo03Trial
                  ? t2("canvas.hailuo03Trial.claiming", {
                      defaultValue: "领取中...",
                    })
                  : t2("canvas.hailuo03Trial.claim", {
                      defaultValue: "领取免费机会",
                    })}
              </button>
            </Tooltip$1>
          )}
          {inGeneratingState ? (
            <GeneratingButton label={t2("canvas.generating")} />
          ) : showDualButtons ? (
            <DualSubmitButtons
              submitting={false}
              canSubmit={canSubmit}
              creditCost={computedCreditCost}
              costBadge={hailuo03TrialCostBadge}
              billingTooltip={computedBillingTooltip}
              billingDetails={computedBillingDetails}
              billingEstimateFormula={computedBillingEstimateFormula}
              onNewNode={handleNewNode}
              onReplace={handleReplace}
              disabledTitle={!canSubmit ? submitTitle : void 0}
            />
          ) : (
            <SubmitButton
              submitting={false}
              canSubmit={canSubmit}
              loading={modelsLoading}
              creditCost={computedCreditCost}
              costBadge={hailuo03TrialCostBadge}
              billingTooltip={computedBillingTooltip}
              billingDetails={computedBillingDetails}
              billingEstimateFormula={computedBillingEstimateFormula}
              onClick={handleConfirm}
              title={typeof submitLabel === "string" ? submitLabel : submitTitle}
            />
          )}
        </div>
        {paramsOpen && selectedModel && hasConfigurableParams && (
          <ParamsPopup anchorRef={paramsAnchorRef} onClose={() => setParamsOpen(false)}>
            {renderedParamElements}
          </ParamsPopup>
        )}
      </div>
    </>
  );
  if (renderShell)
    return (
      <>
        {renderShell({
          onClose,
          expanded,
          children: body2,
        })}
      </>
    );
  return (
    <PopoverShell
      promptLayout={true}
      onClose={onClose}
      expanded={expanded}
      extraHeight={extraHeight + (isMiniMaxH3VideoModel ? 56 : 40)}
      gapOffset={popoverGapOffset}
    >
      {body2}
    </PopoverShell>
  );
}
