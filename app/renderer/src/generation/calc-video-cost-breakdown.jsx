// calc-video-cost-breakdown.jsx
import { reactExports, SwitchRoot, SwitchThumb, useSelectGroupContext, useBaseUiId, useIsoLayoutEffect, useRenderElement, SelectRoot, SelectValue$2, SelectTrigger$2, SelectIcon, ChevronDownIcon$1, SelectPortal, SelectPositioner, SelectPopup, SelectList, SelectItem$2, SelectItemText, SelectItemIndicator, SelectScrollUpArrow, ChevronUpIcon, SelectScrollDownArrow } from "../vendor.js";
import { SelectGroup$1, Separator$1 } from "../canvas/canvas-surface-recovery-scheduler.jsx";
import { CheckIcon$5 } from "../media-editing/parse-item.jsx";
import { BACKEND_MINIMAX_TTS, BACKEND_SEEDAUDIO, BACKEND_MINIMAX_MUSIC, BACKEND_ELEVENLABS_MUSIC } from "./push-inline.js";
import { cn$5 } from "../infra/use-browser-overlay-dialog-props.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { getDefaultParams } from "./resolve-reference-texts.js";
export const PROMPT_FONT_SIZE_STEP = 1;
const MUSIC_TAB_BACKENDS = new Set([BACKEND_MINIMAX_MUSIC, BACKEND_ELEVENLABS_MUSIC]);
const SPEECH_TAB_BACKENDS = new Set([BACKEND_MINIMAX_TTS, BACKEND_SEEDAUDIO]);
export function isAudioModeBackend(backend, audioMode, model) {
  if (audioMode === "extension") return !!model?.audioExtension;
  if (model?.audioExtension) return audioMode === "tts";
  if (!backend) return false;
  return audioMode === "music" ? MUSIC_TAB_BACKENDS.has(backend) : SPEECH_TAB_BACKENDS.has(backend);
}
export function audioModeForModel(model) {
  return isAudioModeBackend(model?.backend, "music") ? "music" : "tts";
}
export function modelBelongsToAudioMode(model, audioMode) {
  if (audioMode === "extension") return !!model.audioExtension;
  if (model.audioExtension) return audioMode === "tts";
  return isAudioModeBackend(model.backend, audioMode);
}
export function resolveModelSelection(models, modelId, rememberedParams) {
  const model = models.find((candidate) => candidate.id === modelId);
  if (!model) return void 0;
  return {
    modelId: model.id,
    params: {
      ...getDefaultParams(model),
      ...(rememberedParams ?? {}),
    },
  };
}
export function resolveAudioModeSelection(models, nextMode, remembered) {
  const rememberedModelId = remembered?.modelId;
  const rememberedModel = rememberedModelId
    ? models.find(
        (model) => model.id === rememberedModelId && modelBelongsToAudioMode(model, nextMode),
      )
    : void 0;
  const candidate =
    rememberedModel ??
    (nextMode === "tts"
      ? (models.find(
          (model) => modelBelongsToAudioMode(model, nextMode) && !model.audioExtension,
        ) ?? models.find((model) => modelBelongsToAudioMode(model, nextMode)))
      : models.find((model) => modelBelongsToAudioMode(model, nextMode)));
  if (!candidate) return void 0;
  return {
    modelId: candidate.id,
    params:
      rememberedModel && remembered
        ? {
            ...getDefaultParams(candidate),
            ...remembered.params,
          }
        : getDefaultParams(candidate),
  };
}
function sortedRecordEntries(record2) {
  return Object.entries(record2 ?? {}).sort(([left], [right]) => {
    if (left === right) return 0;
    return left < right ? -1 : 1;
  });
}
export function createPopoverModelInitializationKey({
  modelBackends,
  initialAudioMode,
  defaultModelId,
  defaultParams,
  lastUsedModelId,
  lastUsedParams,
}) {
  const normalizedBackends = [...new Set(modelBackends ?? [])].sort();
  return JSON.stringify([
    normalizedBackends,
    initialAudioMode ?? "",
    defaultModelId ?? "",
    sortedRecordEntries(defaultParams),
    lastUsedModelId ?? "",
    sortedRecordEntries(lastUsedParams),
  ]);
}
export function stringRecordsEqual(left, right) {
  const leftKeys = Object.keys(left);
  if (leftKeys.length !== Object.keys(right).length) return false;
  return leftKeys.every((key2) => left[key2] === right[key2]);
}
export function getPlaceholder(mode2, model, initialAudioMode) {
  if (mode2 === "text") {
    return {
      key: "canvas.txt.text.placeholder",
      defaultValue:
        "写下你想讲的故事、场景或角色设定。例如：落魄赘婿被丈母娘当众羞辱，转身亮出隐藏的亿万富豪身份。",
    };
  }
  if (model?.audioExtension || (!model && initialAudioMode === "extension")) {
    return {
      key: "canvas.txt.audioExtension.placeholder",
      defaultValue: "描述希望如何续写这段音频...",
    };
  }
  if (
    isAudioModeBackend(model?.backend, "music", model) ||
    (!model && initialAudioMode === "music")
  ) {
    return {
      key: "canvas.txt.music.placeholder",
      defaultValue: "Describe the music style...",
    };
  }
  return {
    key: "canvas.txt.tts.placeholder",
    defaultValue: "Enter text to read aloud...",
  };
}
export function Switch({ className, size: size2 = "default", tone = "brand", ...props }) {
  return (
    <SwitchRoot
      className={cn$5(
        "peer relative inline-flex shrink-0 cursor-pointer items-center rounded-full shadow-xs transition-colors after:absolute after:-inset-x-1 after:-inset-y-2 focus-visible:outline-none focus-visible:ring-1 disabled:cursor-not-allowed disabled:opacity-50 data-[unchecked]:bg-input data-[unchecked]:hover:bg-foreground/15",
        size2 === "sm" ? "h-4 w-7 p-0.5" : "h-5 w-10 p-[3px]",
        tone === "neutral"
          ? "focus-visible:ring-ring/35 data-[checked]:bg-foreground/65 data-[checked]:hover:bg-foreground/75"
          : "focus-visible:ring-brand-accent/35 data-[checked]:bg-brand-accent data-[checked]:hover:bg-brand-accent/90",
        className,
      )}
      {...props}
    >
      <SwitchThumb
        className={cn$5(
          "pointer-events-none block rounded-full shadow-none ring-1 ring-foreground/5 transition-transform duration-150 ease-out will-change-transform data-[unchecked]:translate-x-0",
          size2 === "sm"
            ? "h-3 w-3.5 data-[checked]:translate-x-2.5"
            : "h-3.5 w-[18px] data-[checked]:translate-x-4",
          tone === "neutral" ? "bg-background" : "bg-brand-accent-foreground",
        )}
      />
    </SwitchRoot>
  );
}
export function CanvasSwitch({
  size: size2,
  checked,
  onCheckedChange,
  "aria-label": ariaLabel,
  disabled: disabled2,
  "data-action-ui-id": actionUiId,
}) {
  return (
    <Switch
      size={size2}
      tone="neutral"
      checked={checked}
      onCheckedChange={onCheckedChange}
      aria-label={ariaLabel}
      disabled={disabled2}
      data-action-ui-id={actionUiId}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    />
  );
}
const SelectGroupLabel = reactExports.forwardRef(
  function SelectGroupLabel2(componentProps, forwardedRef) {
    const { className, render: render2, id: idProp, ...elementProps } = componentProps;
    const { setLabelId } = useSelectGroupContext();
    const id2 = useBaseUiId(idProp);
    useIsoLayoutEffect(() => {
      setLabelId(id2);
    }, [id2, setLabelId]);
    const element2 = useRenderElement("div", componentProps, {
      ref: forwardedRef,
      props: [
        {
          id: id2,
        },
        elementProps,
      ],
    });
    return element2;
  },
);
export const Select$2 = SelectRoot;
export function SelectGroup({ className, ...props }) {
  return (
    <SelectGroup$1 data-slot="select-group" className={cn$5("scroll-my-1", className)} {...props} />
  );
}
export function SelectValue$1({ className, ...props }) {
  return (
    <SelectValue$2
      data-slot="select-value"
      className={cn$5("flex min-w-0 flex-1 text-left", className)}
      {...props}
    />
  );
}
export function SelectTrigger$1({
  className,
  size: size2 = "default",
  children: children2,
  ...props
}) {
  return (
    <SelectTrigger$2
      data-slot="select-trigger"
      data-size={size2}
      className={cn$5(
        "flex w-full items-center justify-between gap-1.5 rounded-md border border-input bg-transparent py-2 pr-2 pl-2.5 text-xs whitespace-nowrap transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/20 data-placeholder:text-muted-foreground data-[size=default]:h-8 data-[size=sm]:h-7 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-1.5 dark:bg-input/30 dark:hover:bg-input/50 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      {children2}
      <SelectIcon
        render={<ChevronDownIcon$1 className="pointer-events-none size-4 text-muted-foreground" />}
      />
    </SelectTrigger$2>
  );
}
export function SelectContent$1({
  className,
  children: children2,
  side = "bottom",
  sideOffset = 4,
  align = "start",
  alignOffset = 0,
  alignItemWithTrigger = false,
  disableExitAnimation = false,
  ...props
}) {
  return (
    <SelectPortal>
      <SelectPositioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        alignItemWithTrigger={alignItemWithTrigger}
        className="isolate z-[10001]"
      >
        <SelectPopup
          data-slot="select-content"
          data-align-trigger={alignItemWithTrigger}
          data-motion-exit-disabled={disableExitAnimation || void 0}
          className={cn$5(
            "isolate z-[10001] max-h-(--available-height) w-(--anchor-width) min-w-36 origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-[16px] bg-[var(--canvas-controls-bg)] p-1 text-popover-foreground shadow-lg dp-motion-quick-zoom",
            className,
          )}
          {...props}
        >
          <SelectScrollUpButton$1 />
          <SelectList>{children2}</SelectList>
          <SelectScrollDownButton$1 />
        </SelectPopup>
      </SelectPositioner>
    </SelectPortal>
  );
}
export function SelectLabel({ className, ...props }) {
  return (
    <SelectGroupLabel
      data-slot="select-label"
      className={cn$5("px-2 py-2 text-xs text-muted-foreground", className)}
      {...props}
    />
  );
}
export function SelectItem$1({ className, children: children2, showIndicator = true, ...props }) {
  return (
    <SelectItem$2
      data-slot="select-item"
      className={cn$5(
        "list-row-hit-area relative flex w-full cursor-default items-center gap-2 rounded-sm py-2 pr-8 pl-3 text-xs text-[var(--canvas-controls-text)] outline-hidden select-none transition-colors hover:bg-[var(--canvas-controls-hover)] focus:bg-[var(--canvas-controls-hover)] data-highlighted:bg-[var(--canvas-controls-hover)] data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
        className,
      )}
      {...props}
    >
      <SelectItemText className="flex min-w-0 flex-1 gap-2 truncate">{children2}</SelectItemText>
      {showIndicator && (
        <SelectItemIndicator
          render={
            <span
              data-slot="select-item-indicator"
              className="pointer-events-none absolute right-2 flex size-4 items-center justify-center"
            />
          }
        >
          <CheckIcon$5 className="pointer-events-none" />
        </SelectItemIndicator>
      )}
    </SelectItem$2>
  );
}
export function SelectSeparator({ className, ...props }) {
  return (
    <Separator$1
      data-slot="select-separator"
      className={cn$5("pointer-events-none -mx-1 h-px bg-border", className)}
      {...props}
    />
  );
}
function SelectScrollUpButton$1({ className, ...props }) {
  return (
    <SelectScrollUpArrow
      data-slot="select-scroll-up-button"
      className={cn$5(
        "top-0 z-10 flex w-full cursor-default items-center justify-center bg-[var(--canvas-controls-bg)] py-1 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      <ChevronUpIcon />
    </SelectScrollUpArrow>
  );
}
function SelectScrollDownButton$1({ className, ...props }) {
  return (
    <SelectScrollDownArrow
      data-slot="select-scroll-down-button"
      className={cn$5(
        "bottom-0 z-10 flex w-full cursor-default items-center justify-center bg-[var(--canvas-controls-bg)] py-1 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      <ChevronDownIcon$1 />
    </SelectScrollDownArrow>
  );
}
export function nextAtPickerState(state2, payload) {
  if (state2.open && payload.triggerRange.from === payload.triggerRange.to) {
    return {
      ...state2,
      open: false,
    };
  }
  return {
    open: true,
    ...payload,
  };
}
export const HAILUO03_VIDEO_CONTINUATION_PRICING_ID = "MiniMax-H3-video-continuation";
const HAILUO03_AUDIO_CONTINUATION_PRICING_ID = "MiniMax-H3-audio-continuation";
const HAILUO03_MODEL_ALIASES = new Set([
  "MiniMax-H3",
  "MiniMax-H3 Audio",
  HAILUO03_VIDEO_CONTINUATION_PRICING_ID,
  HAILUO03_AUDIO_CONTINUATION_PRICING_ID,
]);
const HAILUO03_DEFAULT_FREE_IMAGE_COUNT = 5;
const HAILUO03_MAX_DEFAULT_FREE_IMAGE_COUNT = 2;
export function resolvePricingId(model) {
  return model.pricingId ?? model.model_name ?? model.id;
}
export function isHailuo03Model(model) {
  if (!model) return false;
  return [model.id, model.model_name, model.pricingId, model.name].some(
    (value) => typeof value === "string" && HAILUO03_MODEL_ALIASES.has(value),
  );
}
export function resolveVideoPricingId(model, isVideoExtension) {
  if (isVideoExtension && isHailuo03Model(model)) {
    return HAILUO03_VIDEO_CONTINUATION_PRICING_ID;
  }
  return resolvePricingId(model);
}
export function resolveAudioPricingId(model) {
  if (model.audioExtension && isHailuo03Model(model)) {
    return HAILUO03_AUDIO_CONTINUATION_PRICING_ID;
  }
  return resolvePricingId(model);
}
function normalizePricingKey(key2) {
  return key2.trim().toLowerCase().replace(/_/g, "-");
}
function matchesResolution(configured, query) {
  if (!configured?.length) return true;
  if (query == null) return false;
  const normalizedQuery = query.trim().toLowerCase();
  return configured.some((value) => value.trim().toLowerCase() === normalizedQuery);
}
function isHailuo03PricingId(modelId) {
  const normalized = normalizePricingKey(modelId);
  return normalized === "minimax-h3" || normalized.startsWith("minimax-h3-");
}
function isHailuo03MaxPricingId(modelId) {
  const normalized = normalizePricingKey(modelId);
  return normalized === "minimax-h3-max" || normalized === "minimax-h3-max-turbo";
}
function videoCostPerImageFree(modelId, cost) {
  if (typeof cost.costPerImageFree === "number") return Math.max(0, cost.costPerImageFree);
  if (isHailuo03MaxPricingId(modelId)) return HAILUO03_MAX_DEFAULT_FREE_IMAGE_COUNT;
  return isHailuo03PricingId(modelId) ? HAILUO03_DEFAULT_FREE_IMAGE_COUNT : 0;
}
function createVideoCostBreakdown({
  modelId,
  cost,
  fixedCost = 0,
  costPerSecond = 0,
  referenceVideoCostPerSecond = costPerSecond,
  outputDurationSec = 0,
  inputVideoDurationSec = 0,
  imageCount,
}) {
  const inputImageCount = Math.max(0, imageCount);
  const costPerImage = cost?.costPerImage && cost.costPerImage > 0 ? cost.costPerImage : 0;
  const freeImageCount = costPerImage > 0 && cost ? videoCostPerImageFree(modelId, cost) : 0;
  const billableImageCount = Math.max(0, inputImageCount - freeImageCount);
  const imageCost = costPerImage * billableImageCount;
  return {
    total:
      fixedCost +
      costPerSecond * outputDurationSec +
      referenceVideoCostPerSecond * inputVideoDurationSec +
      imageCost,
    fixedCost,
    costPerSecond,
    ...(referenceVideoCostPerSecond !== costPerSecond
      ? {
          referenceVideoCostPerSecond,
        }
      : {}),
    outputDurationSec,
    inputVideoDurationSec,
    inputImageCount,
    freeImageCount,
    billableImageCount,
    costPerImage,
  };
}
function videoCostMatchesNonResolutionFilters(cost, hasReferenceVideo, hasSound, fps) {
  if (cost.hasReferenceVideo != null && cost.hasReferenceVideo !== hasReferenceVideo) return false;
  if (cost.hasSound != null && cost.hasSound !== hasSound) return false;
  if (cost.fps?.length && (fps == null || !cost.fps.includes(fps))) return false;
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
    (longest, durationMs) => Math.max(longest, referenceVideoBillingDuration(durationMs)),
    0,
  );
}
export function calcVideoCost(
  pricing,
  modelId,
  resolution,
  durationSec,
  hasReferenceVideo = false,
  hasSound = false,
  inputDurationSec = 0,
  fps,
  imageCount = 0,
) {
  return calcVideoCostBreakdown(
    pricing,
    modelId,
    resolution,
    durationSec,
    hasReferenceVideo,
    hasSound,
    inputDurationSec,
    fps,
    imageCount,
  )?.total;
}
export function calcVideoCostBreakdown(
  pricing,
  modelId,
  resolution,
  durationSec,
  hasReferenceVideo = false,
  hasSound = false,
  inputDurationSec = 0,
  fps,
  imageCount = 0,
) {
  if (!pricing?.video) return void 0;
  const model = pricing.video.find((m3) => m3.modelID === modelId);
  if (!model) return void 0;
  for (const c3 of model.videoCosts) {
    if (!videoCostMatchesNonResolutionFilters(c3, hasReferenceVideo, hasSound, fps)) continue;
    const resMatch = matchesResolution(c3.resolutions, resolution);
    if (c3.costPerSecond && c3.costPerSecond > 0 && resMatch) {
      if (!durationSec || durationSec <= 0) {
        return model.defaultCost > 0
          ? createVideoCostBreakdown({
              modelId,
              fixedCost: model.defaultCost,
              imageCount,
            })
          : void 0;
      }
      const chargeableInputDurationSec =
        hasReferenceVideo && inputDurationSec > 0 ? inputDurationSec : 0;
      const chargeableOutputDurationSec = Math.ceil(durationSec);
      const referenceVideoCostPerSecond =
        c3.costPerReferenceVideoSecond && c3.costPerReferenceVideoSecond > 0
          ? c3.costPerReferenceVideoSecond
          : c3.costPerSecond;
      return createVideoCostBreakdown({
        modelId,
        cost: c3,
        costPerSecond: c3.costPerSecond,
        referenceVideoCostPerSecond,
        outputDurationSec: chargeableOutputDurationSec,
        inputVideoDurationSec: chargeableInputDurationSec,
        imageCount,
      });
    }
    const dur = durationSec ?? 0;
    if (!c3.resolutions?.length && c3.durations?.includes(dur)) {
      return c3.realCost > 0
        ? createVideoCostBreakdown({
            modelId,
            cost: c3,
            fixedCost: c3.realCost,
            imageCount,
          })
        : void 0;
    }
    if (matchesResolution(c3.resolutions, resolution) && c3.durations?.includes(dur)) {
      return c3.realCost > 0
        ? createVideoCostBreakdown({
            modelId,
            cost: c3,
            fixedCost: c3.realCost,
            imageCount,
          })
        : void 0;
    }
  }
  return model.defaultCost > 0
    ? createVideoCostBreakdown({
        modelId,
        fixedCost: model.defaultCost,
        imageCount,
      })
    : void 0;
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
    if (!videoCostMatchesNonResolutionFilters(c3, hasReferenceVideo, hasSound, fps)) continue;
    const resMatch = matchesResolution(c3.resolutions, resolution);
    const dur = durationSec ?? 0;
    if (
      (c3.costPerSecond && c3.costPerSecond > 0 && resMatch) ||
      (!c3.resolutions?.length && c3.durations?.includes(dur)) ||
      (matchesResolution(c3.resolutions, resolution) && c3.durations?.includes(dur))
    ) {
      return c3.billingTooltip?.trim() || model.billingTooltip?.trim() || void 0;
    }
  }
  return model.billingTooltip?.trim() || void 0;
}
export function calcImageCost(pricing, modelId, resolution, quality, refCount = 0) {
  if (!pricing?.image) return void 0;
  const model = pricing.image.find((m3) => m3.modelID === modelId);
  if (!model) return void 0;
  if (resolution) {
    const resLower = resolution.toLowerCase();
    const qualLower = quality?.toLowerCase();
    for (const c3 of model.imageCosts) {
      if (!c3.resolutions?.some((r2) => r2.toLowerCase() === resLower)) continue;
      if (
        c3.qualities?.length &&
        (qualLower == null || !c3.qualities.some((q2) => q2.toLowerCase() === qualLower))
      )
        continue;
      if (c3.realCost <= 0) return void 0;
      const billable = c3.refCountPrice ? Math.max(0, refCount - (c3.refCountFree ?? 0)) : 0;
      const addOn = billable > 0 && c3.refCountPrice ? billable * c3.refCountPrice : 0;
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
export const MIN_MUSIC_BILLING_SECONDS = 3;
export function isPerMinuteCreditCost(value) {
  return typeof value === "object" && value?.kind === "per-minute";
}
