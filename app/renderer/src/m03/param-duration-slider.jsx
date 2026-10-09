// param-duration-slider.jsx
import {
  useTranslation,
  reactExports,
  dedupedToast,
  Copy,
  VIDEO_MODELS,
  BACKEND_KLING_AVATAR,
} from "../vendor.js";
import { paramI18nKey, paramLabelFallback } from "../m01/resolve-reference-texts.js";
import { CanvasSwitch } from "../m01/calc-video-cost-breakdown.jsx";
import { Slider$1, ParamSectionLabel, ParamStepper } from "../m01/slider.jsx";
import {
  useReferenceNavigationSnapshot,
  getReferenceNavigationDefaults,
} from "../m02/decode-worker-pool.jsx";
import { ParamTabs } from "../m01/param-tabs.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { I2IPopoverInner } from "./i2-i-popover-inner.jsx";
import { Input$1 } from "./use-plugin-host.jsx";
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
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <CanvasSwitch
          aria-label={label}
          data-action-ui-id="canvas.params.generate-audio-switch"
          checked={checked}
          disabled={disabled2 || disabledOptions.has(checked ? "false" : "true")}
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
      nearest === void 0 || Math.abs(Number(option2) - value) < Math.abs(Number(nearest) - value)
        ? option2
        : nearest,
    void 0,
  );
}
export function ParamDurationSlider({
  label,
  options,
  value,
  onChange,
  disabled: disabled2,
  disabledOptions,
}) {
  const { t: t2 } = useTranslation();
  const [draft, setDraft] = reactExports.useState(null);
  const [preview, setPreview] = reactExports.useState(null);
  const [pointerActive, setPointerActive] = reactExports.useState(false);
  const available = options.filter((option2) => !disabledOptions?.has(option2));
  const inactive = disabled2 || available.length === 0;
  const min2 = Number(available[0] ?? options[0]);
  const max2 = Number(available.at(-1) ?? options.at(-1));
  const numeric2 = Number(nearestDuration(Number(value), available) ?? value);
  const displayValue = preview === null ? value : (nearestDuration(preview, available) ?? value);
  const previous2 = available.filter((option2) => Number(option2) < numeric2).at(-1);
  const next2 = available.find((option2) => Number(option2) > numeric2);
  const handleStep = (option2) => {
    if (inactive || option2 === void 0) return;
    setDraft(null);
    setPreview(null);
    onChange(option2);
  };
  const rawInterval = Math.max(1, max2 / 3);
  const magnitude = 10 ** Math.floor(Math.log10(rawInterval));
  const interval2 =
    ([1, 2, 5, 10].find((unit) => unit * magnitude >= rawInterval) ?? 10) * magnitude;
  const marks = [0];
  for (let mark2 = interval2; mark2 < max2; mark2 += interval2) {
    if (max2 - mark2 >= interval2 / 2) marks.push(mark2);
  }
  if (max2 > 0) marks.push(max2);
  const handleSliderCommit = (next22) => {
    handleChange(typeof next22 === "number" ? next22 : next22[0]);
    setPreview(null);
    setPointerActive(false);
  };
  const handleChange = (seconds) => {
    const next22 = nearestDuration(seconds, available);
    if (!inactive && next22 !== void 0) onChange(next22);
  };
  const handleCommit = () => {
    if (draft !== null && draft.trim() !== "") handleChange(Number(draft));
    setDraft(null);
  };
  return (
    <div data-action-ui-id="canvas.params.duration-control">
      <div className="hilo-slider-field__header flex items-center justify-between gap-3">
        <ParamSectionLabel>{label}</ParamSectionLabel>
        <ParamStepper
          className="h-7 shrink-0"
          actionPrefix="canvas.params.duration"
          decreaseDisabled={inactive || previous2 === void 0}
          increaseDisabled={inactive || next2 === void 0}
          onDecrease={() => handleStep(previous2)}
          onIncrease={() => handleStep(next2)}
        >
          <div className="relative w-12 shrink-0">
            <Input$1
              type="number"
              aria-label={label}
              data-action-ui-id="canvas.params.duration-input"
              min={min2}
              max={max2}
              step={1}
              value={draft ?? displayValue}
              disabled={inactive}
              onChange={(event) => {
                const next22 = event.target.value;
                setDraft(next22);
                if (available.includes(next22)) onChange(next22);
              }}
              onBlur={handleCommit}
              onPointerDown={(event) => event.stopPropagation()}
              onKeyDown={(event) => {
                event.stopPropagation();
                if (event.key === "Enter") event.currentTarget.blur();
                if (event.key === "Escape") {
                  event.preventDefault();
                  setDraft(null);
                }
              }}
              className="h-7 w-full rounded-md border-transparent bg-transparent pr-4 pl-0 text-center text-[13px] font-medium tabular-nums shadow-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[11px] text-muted-foreground"
            >
              s
            </span>
          </div>
        </ParamStepper>
      </div>
      <Slider$1
        variant="filled"
        size="compact"
        visualMin={0}
        minBoundaryMessage={t2("canvas.param.durationRange", {
          min: min2,
          max: max2,
        })}
        ticks={marks}
        aria-label={label}
        value={preview ?? numeric2}
        min={min2}
        max={max2}
        step={pointerActive ? 0.01 : 1}
        disabled={inactive || available.length < 2}
        onValueChange={(next22) => {
          setDraft(null);
          setPreview(Array.isArray(next22) ? next22[0] : next22);
        }}
        onValueCommitted={handleSliderCommit}
        onPointerDownCapture={() => setPointerActive(true)}
        onPointerCancel={() => {
          setPreview(null);
          setPointerActive(false);
        }}
        onPointerDown={(event) => event.stopPropagation()}
        className="min-w-0"
        thumbProps={{
          "data-action-ui-id": "canvas.params.duration-slider",
        }}
      />
      <div aria-hidden="true" className="hilo-slider-field__marks relative mx-1.5 h-5">
        {marks.map((seconds) => {
          const alignment =
            seconds === 0
              ? "translate-x-0"
              : seconds === max2
                ? "-translate-x-full rtl:translate-x-full"
                : "-translate-x-1/2 rtl:translate-x-1/2";
          const active2 = seconds === Number(displayValue);
          return (
            <span
              key={seconds}
              data-action-ui-id={
                seconds === 0
                  ? "canvas.params.duration-min"
                  : seconds === max2
                    ? "canvas.params.duration-max"
                    : "canvas.params.duration-mark"
              }
              style={{
                insetInlineStart: `${max2 > 0 ? (seconds / max2) * 100 : 0}%`,
              }}
              className={`absolute top-0 px-1 py-0.5 text-center text-[10px] whitespace-nowrap tabular-nums ${alignment} ${active2 ? "text-[var(--canvas-controls-text)]" : "text-[var(--canvas-controls-text-muted)]"} ${inactive || (seconds > 0 && seconds < min2) || disabledOptions?.has(String(seconds)) ? "opacity-40" : ""}`}
            >
              {seconds}s
            </span>
          );
        })}
      </div>
    </div>
  );
}
function formatProviderTaskIdPreview(value) {
  if (value.length <= 18) return value;
  return `${value.slice(0, 7)}...${value.slice(-6)}`;
}
export function ProviderTaskIdChip({ value, display = "label", compact = false }) {
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
      <span className={display === "value" ? "truncate font-mono text-[11px]" : "truncate"}>
        {display === "value" ? formatProviderTaskIdPreview(value) : label}
      </span>
      <Copy size={12} strokeWidth={1} aria-hidden={true} className="shrink-0" />
    </button>
  );
}
export function referenceVideoCombinedBudgetSec(model) {
  if (!model) return void 0;
  const declared = model.referenceMediaLimits?.video?.combinedWithOutputMaxDurationSec;
  if (declared !== void 0) return declared;
  const registryModel = VIDEO_MODELS.find(
    (entry) =>
      entry.id === model.id ||
      (model.model_name !== void 0 && entry.model_name === model.model_name),
  );
  return registryModel?.referenceMediaLimits?.video?.combinedWithOutputMaxDurationSec;
}
export function referenceVideoBudgetDisabledDurationOptions(
  options,
  referenceVideoTotalSec,
  combinedMaxSec,
) {
  if (combinedMaxSec === void 0 || !(referenceVideoTotalSec > 0)) return new Set();
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
    parts.push(copy2.generatedVideo(breakdown.outputDurationSec, breakdown.costPerSecond));
  }
  const referenceVideoRate = breakdown.referenceVideoCostPerSecond ?? breakdown.costPerSecond;
  if (referenceVideoRate > 0 && breakdown.inputVideoDurationSec > 0) {
    parts.push(copy2.inputVideo(breakdown.inputVideoDurationSec, referenceVideoRate));
  }
  if (breakdown.costPerImage > 0 && breakdown.billableImageCount > 0) {
    parts.push(copy2.inputImages(breakdown.billableImageCount, breakdown.costPerImage));
  }
  const hasPaidInput =
    breakdown.inputVideoDurationSec > 0 ||
    (breakdown.costPerImage > 0 && breakdown.billableImageCount > 0);
  if (breakdown.costPerSecond > 0 && !hasPaidInput) {
    parts.push(copy2.inputMediaFree);
  }
  if (parts.length === 0) return void 0;
  const formula = parts.join(" + ");
  return outputCount > 1 ? copy2.multipleOutputs(formula, outputCount) : formula;
}
const HAILUO03_VIDEO_CONTINUATION_SUB_TYPE$1 = "hailuo03_video_continuation";
function hasPath$1(paths) {
  return paths.some((path2) => path2.trim().length > 0);
}
function normalizedString(value) {
  return typeof value === "string" ? value.trim() : "";
}
function includesString$2(values3, value) {
  return values3.includes(value);
}
function modelValues$1(model, selectedModelId) {
  return [selectedModelId, model?.id, model?.model_name, model?.pricingId, model?.name].filter(
    (value) => typeof value === "string",
  );
}
function isHailuo03VideoTrialModel$1(model, selectedModelId, eligibility) {
  if (!eligibility) return false;
  return modelValues$1(model, selectedModelId).some((value) =>
    includesString$2(eligibility.models, value),
  );
}
function subTypeForImageMode(imageMode) {
  return imageMode === "video-extension" ? HAILUO03_VIDEO_CONTINUATION_SUB_TYPE$1 : "";
}
function isHailuo03VideoTrialEligibleResolution$1(eligibility, modelParams) {
  if (!eligibility) return false;
  return includesString$2(eligibility.resolutions, normalizedString(modelParams.resolution));
}
function areHailuo03VideoTrialReferencesEligible$1({
  eligibility,
  imageMode,
  imagePaths,
  videoPaths,
  audioPaths,
}) {
  if (!eligibility) return false;
  if (!eligibility.allowReferenceImages && hasPath$1(imagePaths)) return false;
  if (!eligibility.allowReferenceAudios && hasPath$1(audioPaths)) return false;
  if (
    imageMode !== "video-extension" &&
    !eligibility.allowReferenceVideos &&
    hasPath$1(videoPaths)
  ) {
    return false;
  }
  return true;
}
export function shouldSwitchHailuo03TrialClaimResolution({
  model,
  selectedModelId,
  modelParams,
  eligibility,
}) {
  return (
    resolveHailuo03TrialClaimResolution({
      model,
      selectedModelId,
      modelParams,
      eligibility,
    }) != null
  );
}
export function resolveHailuo03TrialClaimResolution({
  model,
  selectedModelId,
  modelParams,
  eligibility,
}) {
  if (!isHailuo03VideoTrialModel$1(model, selectedModelId, eligibility)) return void 0;
  if (isHailuo03VideoTrialEligibleResolution$1(eligibility, modelParams)) return void 0;
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
    isHailuo03VideoTrialModel$1(model, selectedModelId, eligibility) &&
    (eligibility?.resolutions.length ?? 0) > 0 &&
    includesString$2(eligibility?.subTypes ?? [], subType) &&
    areHailuo03VideoTrialReferencesEligible$1({
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
    isHailuo03VideoTrialModel$1(model, selectedModelId, eligibility) &&
    includesString$2(eligibility?.subTypes ?? [], subType) &&
    isHailuo03VideoTrialEligibleResolution$1(eligibility, modelParams) &&
    areHailuo03VideoTrialReferencesEligible$1({
      eligibility,
      imageMode,
      imagePaths,
      videoPaths,
      audioPaths,
    })
  );
}
const HAILUO_23_MODEL_NAMES = new Set([
  "MiniMax-Hailuo-2.3",
  "MiniMax-Hailuo-2.3-Fast",
  "Hailuo 2.3",
  "Hailuo 2.3 Fast",
]);
export const MINIMAX_H3_MODEL_ID$2 = "minimax-h3";
export const MINIMAX_H3_BACKEND_ID = "minimax-v3";
export const ADAPTIVE_RATIO_VALUES = new Set(["adaptive", "auto"]);
const KLING_AVATAR_MODEL_NAMES = new Set(["kling-avatar", "Kling Avatar"]);
const REQUIRED_REFERENCE_IMAGE_MODEL_NAMES = new Set([
  ...HAILUO_23_MODEL_NAMES,
  ...KLING_AVATAR_MODEL_NAMES,
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
const SEEDANCE_25_MODEL_IDENTIFIERS = new Set(["seedance2.5", "seedance-2.5", "sd-2.5"]);
export const SEEDANCE_25_VIDEO_EDIT_MODE = "video-edit";
export const SEEDANCE_25_VIDEO_EXTEND_MODE = "video-extend";
export const SEEDANCE_25_INHERITED_VIDEO_MODES = new Set([
  SEEDANCE_25_VIDEO_EDIT_MODE,
  SEEDANCE_25_VIDEO_EXTEND_MODE,
]);
const SEEDANCE_25_VIDEO_EXTEND_OFFSET_SEC = 5;
const SEEDANCE_25_MAX_DURATION_SEC = 30;
export const LEGACY_SEEDANCE_25_TASK_TYPE_PARAM$1 = "omni_reference_task_type";
function hasModelName(model, names) {
  if (!model) return false;
  return [model.id, model.model_name, model.pricingId, model.name].some(
    (value) => typeof value === "string" && names.has(value),
  );
}
export function normalizeIdentifier$1(value) {
  return typeof value === "string"
    ? value
        .trim()
        .toLowerCase()
        .replace(/[\s_]+/g, "-")
    : "";
}
export function resolveSpecialI2VRouteKind(model) {
  if (!model) return void 0;
  if (model.backend === BACKEND_KLING_AVATAR || hasModelName(model, KLING_AVATAR_MODEL_NAMES)) {
    return "kling-avatar";
  }
  return void 0;
}
export function requiresReferenceImageForI2V(model) {
  if (!model) return false;
  if (model.referenceImageRequired === true) return true;
  return (
    resolveSpecialI2VRouteKind(model) !== void 0 ||
    hasModelName(model, REQUIRED_REFERENCE_IMAGE_MODEL_NAMES)
  );
}
export function isSeedanceModel(model) {
  return hasModelName(model, SEEDANCE_MODEL_NAMES);
}
export function isSeedance25Model(model) {
  if (!model) return false;
  return [model.id, model.model_name, model.pricingId, model.name].some((value) =>
    SEEDANCE_25_MODEL_IDENTIFIERS.has(normalizeIdentifier$1(value)),
  );
}
export function isSeedance25InheritedVideoMode(model, imageMode) {
  return isSeedance25Model(model) && SEEDANCE_25_INHERITED_VIDEO_MODES.has(imageMode);
}
export function isSeedance25VideoEditMode(model, imageMode) {
  return isSeedance25Model(model) && imageMode === SEEDANCE_25_VIDEO_EDIT_MODE;
}
export function hasAnyVideoInput(videoPaths) {
  return videoPaths.some((path2) => path2.trim().length > 0);
}
export function resolveSeedance25ImageModeOptions(model, options, hasVideoInput) {
  if (!isSeedance25Model(model) || hasVideoInput) return [...options];
  return options.filter((option2) => !SEEDANCE_25_INHERITED_VIDEO_MODES.has(option2));
}
export function resolveSeedance25AvailableImageMode(model, imageMode, hasVideoInput) {
  return !hasVideoInput && isSeedance25InheritedVideoMode(model, imageMode)
    ? "reference"
    : imageMode;
}
export function resolveSeedance25VideoExtendDefaultDuration(sourceVideoDurationSec) {
  if (
    typeof sourceVideoDurationSec !== "number" ||
    !Number.isFinite(sourceVideoDurationSec) ||
    sourceVideoDurationSec <= 0
  ) {
    return void 0;
  }
  return String(
    Math.min(
      Math.ceil(sourceVideoDurationSec + SEEDANCE_25_VIDEO_EXTEND_OFFSET_SEC),
      SEEDANCE_25_MAX_DURATION_SEC,
    ),
  );
}
export function resolveSeedance25VideoInputTotalDuration(sourceVideoDurationsSec) {
  if (sourceVideoDurationsSec.length === 0) return void 0;
  let totalDurationSec = 0;
  for (const durationSec of sourceVideoDurationsSec) {
    if (typeof durationSec !== "number" || !Number.isFinite(durationSec) || durationSec <= 0) {
      return void 0;
    }
    totalDurationSec += durationSec;
  }
  return Number.isFinite(totalDurationSec) ? totalDurationSec : void 0;
}
export function resolveSeedance25ImageModeChangeParams(
  model,
  currentParams,
  nextImageMode,
  sourceVideoDurationSec,
) {
  const nextParams = {
    ...currentParams,
    image_mode: nextImageMode,
  };
  if (!isSeedance25Model(model) || currentParams.image_mode === nextImageMode) return nextParams;
  const defaultDuration =
    nextImageMode === SEEDANCE_25_VIDEO_EXTEND_MODE
      ? (resolveSeedance25VideoExtendDefaultDuration(sourceVideoDurationSec) ??
        model?.params?.duration?.default)
      : model?.params?.duration?.default;
  if (defaultDuration !== void 0) nextParams.duration = defaultDuration;
  return nextParams;
}
export function migrateLegacySeedance25GenerationModeParams(model, params) {
  const next2 = {
    ...(params ?? {}),
  };
  const legacyTaskType = next2[LEGACY_SEEDANCE_25_TASK_TYPE_PARAM$1];
  delete next2[LEGACY_SEEDANCE_25_TASK_TYPE_PARAM$1];
  if (!isSeedance25Model(model) || !legacyTaskType) return next2;
  const imageMode = next2.image_mode;
  if (imageMode && imageMode !== "reference") return next2;
  if (legacyTaskType === "edit") next2.image_mode = SEEDANCE_25_VIDEO_EDIT_MODE;
  else if (legacyTaskType === "extend") next2.image_mode = SEEDANCE_25_VIDEO_EXTEND_MODE;
  else next2.image_mode = "reference";
  return next2;
}
