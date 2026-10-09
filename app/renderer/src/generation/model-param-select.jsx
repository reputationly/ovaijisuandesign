// model-param-select.jsx
import { Copy, dedupedToast, reactExports, useTranslation } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  getReferenceNavigationDefaults,
  useReferenceNavigationSnapshot,
} from "../media-editing/get-reference-navigation-defaults.jsx";
import { I2IPopoverInner } from "./i2-i-popover-inner.jsx";
import { VIDEO_MODELS } from "./video-models.js";
import { paramI18nKey, paramLabelFallback } from "./param-label-fallbacks.js";
import { CanvasSwitch } from "./select-content.jsx";
import { ParamTabs } from "./param-tabs.jsx";
import { BACKEND_KLING_AVATAR } from "./normalize-skill-detail-metadata.js";
export const I2IPopover = reactExports.memo(function I2IPopover2(props) {
  const { snapshot: snapshot2 } = useReferenceNavigationSnapshot(
    props.nodeId ?? props.replaceNodeId,
    "i2i",
  );
  return (
    <I2IPopoverInner
      {...props}
      {...getReferenceNavigationDefaults(snapshot2, props)}
      navigationSnapshot={snapshot2}
    />
  );
});
export function ModelParamSelect({
  paramKey,
  definition: definition2,
  value,
  onChange,
  disabled: disabled2,
  disabledOptions,
}) {
  const { t: t2 } = useTranslation();
  const labelKey = paramI18nKey(paramKey, definition2.label);
  const fallback = paramLabelFallback(paramKey, definition2.label);
  const label = labelKey
    ? t2(labelKey, {
        defaultValue: fallback,
      })
    : fallback;
  if (
    paramKey === "generate_audio" &&
    definition2.options?.includes("true") &&
    definition2.options.includes("false")
  ) {
    const checked = value === "true";
    return (
      <div className="flex min-h-8 items-center justify-between gap-3">
        <span className="text-xs font-medium text-muted-foreground">
          {label}
        </span>
        <CanvasSwitch
          aria-label={label}
          data-action-ui-id="canvas.params.generate-audio-switch"
          checked={checked}
          disabled={
            disabled2 || disabledOptions.has(checked ? "false" : "true")
          }
          onCheckedChange={(next2) => onChange(String(next2))}
        />
      </div>
    );
  }
  const getOptionLabel = (option2) => {
    if (option2 === "true")
      return t2("canvas.params.generateAudio.on", {
        defaultValue: "有声",
      });
    if (option2 === "false")
      return t2("canvas.params.generateAudio.off", {
        defaultValue: "无声",
      });
    return option2;
  };
  return (
    <ParamTabs
      label={label}
      options={definition2.options ?? []}
      value={value}
      onChange={onChange}
      disabled={disabled2}
      disabledOptions={disabledOptions}
      getOptionLabel={paramKey === "generate_audio" ? getOptionLabel : void 0}
    />
  );
}
export function hasContinuousDurationOptions(options) {
  return (
    options.length > 8 &&
    options.every((option2, index2) => {
      const seconds = Number(option2);
      return (
        option2.trim() !== "" &&
        Number.isInteger(seconds) &&
        seconds > 0 &&
        (index2 === 0 || seconds === Number(options[index2 - 1]) + 1)
      );
    })
  );
}
export function nearestDuration(value, options) {
  if (!Number.isFinite(value)) return void 0;
  return options.reduce(
    (nearest, option2) =>
      nearest === void 0 ||
      Math.abs(Number(option2) - value) < Math.abs(Number(nearest) - value)
        ? option2
        : nearest,
    void 0,
  );
}
function formatProviderTaskIdPreview(value) {
  if (value.length <= 18) return value;
  return `${value.slice(0, 7)}...${value.slice(-6)}`;
}
export function ProviderTaskIdChip({
  value,
  display = "label",
  compact = false,
}) {
  const { t: t2 } = useTranslation();
  const label = t2("canvas.providerTaskId", {
    defaultValue: "Task ID",
  });
  const compactLabel = t2("canvas.copyProviderTaskId", {
    defaultValue: "Copy ID",
  });
  const handleCopy = reactExports.useCallback(
    (e2) => {
      e2.stopPropagation();
      navigator.clipboard
        .writeText(value)
        .then(() => dedupedToast.success(t2("fileExplorer.copiedToClipboard")))
        .catch(() => dedupedToast.error(t2("fileExplorer.copyFailed")));
    },
    [value, t2],
  );
  if (compact) {
    return (
      <button
        type="button"
        onClick={handleCopy}
        onPointerDown={(e2) => e2.stopPropagation()}
        title={`${label}: ${value}`}
        aria-label={`${compactLabel}: ${value}`}
        className="pointer-events-auto flex shrink-0 items-center text-[11px] font-light tabular-nums text-muted-foreground/70 transition-colors hover:text-foreground focus-visible:outline-none"
        style={{
          fontFamily: "'PingFang SC', 'Microsoft YaHei', sans-serif",
        }}
        data-action-ui-id="canvas.provider-task-id-copy"
      >
        <span>{compactLabel}</span>
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={handleCopy}
      onPointerDown={(e2) => e2.stopPropagation()}
      title={`${label}: ${value}`}
      aria-label={`${t2("canvas.copyContent")} ${label}: ${value}`}
      className="h-8 max-w-[170px] shrink-0 rounded-[4px] px-2 text-[12px] font-normal leading-[20px] text-[var(--canvas-controls-text-muted)] hover:bg-[var(--canvas-controls-hover)] hover:text-[var(--canvas-controls-text)] transition-colors duration-150 flex items-center gap-1 disabled:cursor-default disabled:opacity-40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--canvas-controls-border)]"
      data-action-ui-id="canvas.provider-task-id-copy"
    >
      <span
        className={
          display === "value" ? "truncate font-mono text-[11px]" : "truncate"
        }
      >
        {display === "value" ? formatProviderTaskIdPreview(value) : label}
      </span>
      <Copy size={12} strokeWidth={1} aria-hidden={true} className="shrink-0" />
    </button>
  );
}
export function referenceVideoCombinedBudgetSec(model) {
  if (!model) return void 0;
  const declared =
    model.referenceMediaLimits?.video?.combinedWithOutputMaxDurationSec;
  if (declared !== void 0) return declared;
  const registryModel = VIDEO_MODELS.find(
    (entry) =>
      entry.id === model.id ||
      (model.model_name !== void 0 && entry.model_name === model.model_name),
  );
  return registryModel?.referenceMediaLimits?.video
    ?.combinedWithOutputMaxDurationSec;
}
export function referenceVideoBudgetDisabledDurationOptions(
  options,
  referenceVideoTotalSec,
  combinedMaxSec,
) {
  if (combinedMaxSec === void 0 || !(referenceVideoTotalSec > 0))
    return new Set();
  const maxOutputSec = combinedMaxSec - Math.ceil(referenceVideoTotalSec);
  return new Set(options.filter((option2) => Number(option2) > maxOutputSec));
}
export function buildHailuo03BillingDetails(breakdown, copy2) {
  if (breakdown.costPerSecond <= 0) return void 0;
  const inputRows = [
    {
      label: copy2.video,
      description: copy2.creditsPerSecond(
        breakdown.referenceVideoCostPerSecond ?? breakdown.costPerSecond,
      ),
    },
    {
      label: copy2.audio,
      description: copy2.free,
    },
  ];
  if (breakdown.costPerImage > 0) {
    inputRows.push({
      label: copy2.images,
      description: copy2.imagePricing(
        breakdown.freeImageCount,
        breakdown.freeImageCount + 1,
        breakdown.costPerImage,
      ),
    });
  }
  return {
    heading: copy2.heading,
    leadingRows: [
      {
        label: copy2.generatedVideo,
        description: copy2.creditsPerSecond(breakdown.costPerSecond),
      },
    ],
    section: {
      heading: copy2.inputMedia,
      rows: inputRows,
    },
  };
}
export function buildVideoCostFormula(breakdown, outputCount, copy2) {
  const parts = [];
  if (breakdown.fixedCost > 0) {
    parts.push(copy2.fixedCost(breakdown.fixedCost));
  }
  if (breakdown.costPerSecond > 0 && breakdown.outputDurationSec > 0) {
    parts.push(
      copy2.generatedVideo(
        breakdown.outputDurationSec,
        breakdown.costPerSecond,
      ),
    );
  }
  const referenceVideoRate =
    breakdown.referenceVideoCostPerSecond ?? breakdown.costPerSecond;
  if (referenceVideoRate > 0 && breakdown.inputVideoDurationSec > 0) {
    parts.push(
      copy2.inputVideo(breakdown.inputVideoDurationSec, referenceVideoRate),
    );
  }
  if (breakdown.costPerImage > 0 && breakdown.billableImageCount > 0) {
    parts.push(
      copy2.inputImages(breakdown.billableImageCount, breakdown.costPerImage),
    );
  }
  const hasPaidInput =
    breakdown.inputVideoDurationSec > 0 ||
    (breakdown.costPerImage > 0 && breakdown.billableImageCount > 0);
  if (breakdown.costPerSecond > 0 && !hasPaidInput) {
    parts.push(copy2.inputMediaFree);
  }
  if (parts.length === 0) return void 0;
  const formula = parts.join(" + ");
  return outputCount > 1
    ? copy2.multipleOutputs(formula, outputCount)
    : formula;
}
const HAILUO03_VIDEO_CONTINUATION_SUB_TYPE = "hailuo03_video_continuation";
function hasPath(paths) {
  return paths.some((path2) => path2.trim().length > 0);
}
function normalizedString(value) {
  return typeof value === "string" ? value.trim() : "";
}
function includesString(values3, value) {
  return values3.includes(value);
}
function modelValues(model, selectedModelId) {
  return [
    selectedModelId,
    model?.id,
    model?.model_name,
    model?.pricingId,
    model?.name,
  ].filter((value) => typeof value === "string");
}
function isHailuo03VideoTrialModel(model, selectedModelId, eligibility) {
  if (!eligibility) return false;
  return modelValues(model, selectedModelId).some((value) =>
    includesString(eligibility.models, value),
  );
}
function subTypeForImageMode(imageMode) {
  return imageMode === "video-extension"
    ? HAILUO03_VIDEO_CONTINUATION_SUB_TYPE
    : "";
}
function isHailuo03VideoTrialEligibleResolution(eligibility, modelParams) {
  if (!eligibility) return false;
  return includesString(
    eligibility.resolutions,
    normalizedString(modelParams.resolution),
  );
}
function areHailuo03VideoTrialReferencesEligible({
  eligibility,
  imageMode,
  imagePaths,
  videoPaths,
  audioPaths,
}) {
  if (!eligibility) return false;
  if (!eligibility.allowReferenceImages && hasPath(imagePaths)) return false;
  if (!eligibility.allowReferenceAudios && hasPath(audioPaths)) return false;
  if (
    imageMode !== "video-extension" &&
    !eligibility.allowReferenceVideos &&
    hasPath(videoPaths)
  ) {
    return false;
  }
  return true;
}
export function resolveHailuo03TrialClaimResolution({
  model,
  selectedModelId,
  modelParams,
  eligibility,
}) {
  if (!isHailuo03VideoTrialModel(model, selectedModelId, eligibility))
    return void 0;
  if (isHailuo03VideoTrialEligibleResolution(eligibility, modelParams))
    return void 0;
  return eligibility?.resolutions[0];
}
export function isHailuo03VideoTrialClaimAvailable({
  model,
  selectedModelId,
  eligibility,
  imageMode,
  imagePaths = [],
  videoPaths,
  audioPaths = [],
}) {
  const subType = subTypeForImageMode(imageMode);
  return (
    isHailuo03VideoTrialModel(model, selectedModelId, eligibility) &&
    (eligibility?.resolutions.length ?? 0) > 0 &&
    includesString(eligibility?.subTypes ?? [], subType) &&
    areHailuo03VideoTrialReferencesEligible({
      eligibility,
      imageMode,
      imagePaths,
      videoPaths,
      audioPaths,
    })
  );
}
export function isHailuo03FreeGenerationEligible({
  model,
  selectedModelId,
  eligibility,
  imageMode,
  imagePaths = [],
  videoPaths,
  audioPaths = [],
  modelParams,
}) {
  const subType = subTypeForImageMode(imageMode);
  return (
    isHailuo03VideoTrialModel(model, selectedModelId, eligibility) &&
    includesString(eligibility?.subTypes ?? [], subType) &&
    isHailuo03VideoTrialEligibleResolution(eligibility, modelParams) &&
    areHailuo03VideoTrialReferencesEligible({
      eligibility,
      imageMode,
      imagePaths,
      videoPaths,
      audioPaths,
    })
  );
}
export const ADAPTIVE_RATIO_VALUES = new Set(["adaptive", "auto"]);
export const KLING_AVATAR_MODEL_NAMES = new Set([
  "kling-avatar",
  "Kling Avatar",
]);
const SEEDANCE_MODEL_NAMES = new Set([
  "seedance2.0",
  "seedance2.0-fast",
  "seedance2.0-mini",
  "seedance2.5",
  "Seedance 2.0",
  "Seedance 2.0 Fast",
  "Seedance 2.0 Mini",
  "Seedance 2.5",
]);
const SEEDANCE_25_MODEL_IDENTIFIERS = new Set([
  "seedance2.5",
  "seedance-2.5",
  "sd-2.5",
]);
export const SEEDANCE_25_VIDEO_EDIT_MODE = "video-edit";
export const SEEDANCE_25_VIDEO_EXTEND_MODE = "video-extend";
export const SEEDANCE_25_INHERITED_VIDEO_MODES = new Set([
  SEEDANCE_25_VIDEO_EDIT_MODE,
  SEEDANCE_25_VIDEO_EXTEND_MODE,
]);
export const LEGACY_SEEDANCE_25_TASK_TYPE_PARAM = "omni_reference_task_type";
export function hasModelName(model, names) {
  if (!model) return false;
  return [model.id, model.model_name, model.pricingId, model.name].some(
    (value) => typeof value === "string" && names.has(value),
  );
}
export function normalizeIdentifier(value) {
  return typeof value === "string"
    ? value
        .trim()
        .toLowerCase()
        .replace(/[\s_]+/g, "-")
    : "";
}
export function resolveSpecialI2VRouteKind(model) {
  if (!model) return void 0;
  if (
    model.backend === BACKEND_KLING_AVATAR ||
    hasModelName(model, KLING_AVATAR_MODEL_NAMES)
  ) {
    return "kling-avatar";
  }
  return void 0;
}
export function isSeedanceModel(model) {
  return hasModelName(model, SEEDANCE_MODEL_NAMES);
}
export function isSeedance25Model(model) {
  if (!model) return false;
  return [model.id, model.model_name, model.pricingId, model.name].some(
    (value) => SEEDANCE_25_MODEL_IDENTIFIERS.has(normalizeIdentifier(value)),
  );
}
export function isSeedance25InheritedVideoMode(model, imageMode) {
  return (
    isSeedance25Model(model) && SEEDANCE_25_INHERITED_VIDEO_MODES.has(imageMode)
  );
}
export function isSeedance25VideoEditMode(model, imageMode) {
  return isSeedance25Model(model) && imageMode === SEEDANCE_25_VIDEO_EDIT_MODE;
}
export function hasAnyVideoInput(videoPaths) {
  return videoPaths.some((path2) => path2.trim().length > 0);
}
