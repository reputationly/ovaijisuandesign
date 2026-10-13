// resolution-tabs.jsx
import { __jsx } from "../shared/jsx-runtime.js";
import { CompositedSvg, useTranslation } from "../vendor.js";
import { Tooltip } from "./missing-asset-card.jsx";
import { cn } from "../infra/dialog-content.jsx";
import { BACKEND_ELEVENLABS_MUSIC } from "./normalize-skill-detail-metadata.js";
import { MIN_MUSIC_BILLING_SECONDS } from "./select-content.jsx";
function musicLengthValueToMs(value) {
  const trimmed = value?.trim();
  if (!trimmed || trimmed === "auto" || trimmed === "custom") return void 0;
  const seconds = /^(\d+)s$/.exec(trimmed);
  if (seconds) return Number(seconds[1]) * 1e3;
  const minutes = /^(\d+)m$/.exec(trimmed);
  if (minutes) return Number(minutes[1]) * 6e4;
  const mmss = /^(\d{1,2}):(\d{1,2})$/.exec(trimmed);
  if (mmss) {
    const mins = Number(mmss[1]);
    const secs = Number(mmss[2]);
    if (secs < 60) return (mins * 60 + secs) * 1e3;
  }
  return void 0;
}
function resolveElevenLabsMusicPerMinute(music, model) {
  const perMinute =
    model.model_name === "music_v1"
      ? music.elevenLabsMusicV1PerMinute
      : music.elevenLabsMusicV2PerMinute;
  return perMinute && perMinute > 0 ? perMinute : void 0;
}
export function calcMusicCostDisplay(pricing, model, params) {
  const music = pricing?.music;
  if (!music) return void 0;
  if (model?.backend === BACKEND_ELEVENLABS_MUSIC) {
    const perMinute = resolveElevenLabsMusicPerMinute(music, model);
    if (perMinute == null) return void 0;
    const lengthValue = params?.music_length_ms;
    if (!lengthValue || lengthValue === "auto")
      return {
        kind: "per-minute",
        credits: perMinute,
      };
    const durationMS = musicLengthValueToMs(lengthValue);
    if (!durationMS || durationMS <= 0) return void 0;
    const seconds = Math.max(
      Math.ceil(durationMS / 1e3),
      MIN_MUSIC_BILLING_SECONDS,
    );
    return Math.ceil((seconds * perMinute) / 60);
  }
  if (music.oncePrice <= 0) return void 0;
  return music.oncePrice;
}
export function getModelBaseCost(pricing, modelId, mediaType) {
  if (!pricing) return void 0;
  {
    const videoModel = pricing.video?.find(
      (pricingModel) => pricingModel.modelID === modelId,
    );
    if (!videoModel) return void 0;
    if (videoModel.defaultCost > 0) return videoModel.defaultCost;
    const first = videoModel.videoCosts?.[0];
    if (first?.realCost && first.realCost > 0) return first.realCost;
    return void 0;
  }
}
export function calcToolCost(pricing, modelId, resolution, sourceDurationSec) {
  if (!pricing?.tool) return void 0;
  const model = pricing.tool.find(
    (pricingModel) => pricingModel.modelID === modelId,
  );
  if (!model) return void 0;
  const cost = model.costs?.find((entry) =>
    entry.resolutions?.includes(resolution),
  );
  if (cost) {
    if (cost.costPerSecond && cost.costPerSecond > 0) {
      if (
        sourceDurationSec === void 0 ||
        !Number.isFinite(sourceDurationSec) ||
        sourceDurationSec <= 0
      ) {
        return void 0;
      }
      return cost.costPerSecond * Math.ceil(sourceDurationSec);
    }
    return cost.realCost > 0 ? cost.realCost : void 0;
  }
  return model.defaultCost > 0 ? model.defaultCost : void 0;
}
export function calcTextCost(pricing, modelId) {
  if (!pricing?.text) return void 0;
  const bare = modelId.includes("/")
    ? modelId.slice(modelId.indexOf("/") + 1)
    : modelId;
  const entry = pricing.text.find((translate) => translate.modelID === bare);
  return entry?.defaultCost;
}
function isFinitePositive(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}
export function mediaExtensionDurationOptions(capability) {
  if (!capability) return [];
  const firstDuration = Math.ceil(capability.outputMinDurationSec);
  const lastDuration = Math.floor(capability.outputMaxDurationSec);
  if (firstDuration > lastDuration) return [];
  return Array.from(
    {
      length: lastDuration - firstDuration + 1,
    },
    (_unusedArg, index) => String(firstDuration + index),
  );
}
export function mediaExtensionDisabledDurationOptions(
  sourceDurationSec,
  capability,
) {
  if (!capability || !isFinitePositive(sourceDurationSec)) return new Set();
  const minimumOutputDuration = Math.max(
    Math.ceil(capability.outputMinDurationSec),
    Math.ceil(sourceDurationSec) + 1,
  );
  return new Set(
    mediaExtensionDurationOptions(capability).filter(
      (option) => Number(option) < minimumOutputDuration,
    ),
  );
}
export function isMediaExtensionInputDurationValid(
  sourceDurationSec,
  capability,
) {
  if (!capability || !isFinitePositive(sourceDurationSec)) return false;
  return (
    sourceDurationSec >= capability.inputMinDurationSec &&
    sourceDurationSec <= capability.inputMaxDurationSec
  );
}
export function isMediaExtensionOutputDurationValid(
  sourceDurationSec,
  outputDuration,
  capability,
) {
  if (
    !isMediaExtensionInputDurationValid(sourceDurationSec, capability) ||
    !capability
  ) {
    return false;
  }
  const parsedOutput = Number(outputDuration);
  const minimumOutputDuration = Math.max(
    Math.ceil(capability.outputMinDurationSec),
    Math.ceil(sourceDurationSec) + 1,
  );
  return (
    Number.isInteger(parsedOutput) &&
    parsedOutput >= minimumOutputDuration &&
    parsedOutput <= capability.outputMaxDurationSec
  );
}
const BUTTON_CLASS = [
  "flex items-center justify-center size-5 rounded-md border text-[13px] leading-none",
  "border-[var(--canvas-controls-border)] bg-[var(--canvas-controls-hover)]",
  "text-[var(--canvas-controls-text-muted)] transition-colors duration-150",
  "hover:enabled:text-[var(--canvas-controls-text)] hover:enabled:border-[var(--canvas-node-border-selected)]",
  "disabled:opacity-40 disabled:cursor-default cursor-pointer",
].join(" ");
export function ParamStepper({
  children,
  onDecrease,
  onIncrease,
  decreaseDisabled,
  increaseDisabled,
  actionPrefix = "canvas.params.slider",
  className,
}) {
  const { t: translate } = useTranslation();
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <button
        type="button"
        disabled={decreaseDisabled}
        onClick={(event) => {
          event.stopPropagation();
          onDecrease();
        }}
        aria-label={translate("canvas.param.slider.decrease", {
          defaultValue: "Decrease",
        })}
        data-action-ui-id={`${actionPrefix}-decrease`}
        className={BUTTON_CLASS}
      >
        <span className="-translate-y-px">−</span>
      </button>
      {children}
      <button
        type="button"
        disabled={increaseDisabled}
        onClick={(event) => {
          event.stopPropagation();
          onIncrease();
        }}
        aria-label={translate("canvas.param.slider.increase", {
          defaultValue: "Increase",
        })}
        data-action-ui-id={`${actionPrefix}-increase`}
        className={BUTTON_CLASS}
      >
        <span className="-translate-y-px">+</span>
      </button>
    </div>
  );
}
export function ParamSectionLabel({ children }) {
  return (
    <div className="text-xs font-medium text-muted-foreground mb-2.5">
      {children}
    </div>
  );
}
export function parseRatio(value) {
  const sizeMatch = value.match(/^(\d+)\s*[:x]\s*(\d+)$/i);
  if (!sizeMatch) return null;
  const width = Number(sizeMatch[1]);
  const height = Number(sizeMatch[2]);
  if (!width || !height) return null;
  return [width, height];
}
export function AspectRatioIcon({ ratio }) {
  const parsed = parseRatio(ratio);
  const maxSize = 14;
  let rectW = maxSize;
  let rectH = maxSize;
  if (parsed) {
    const [width, height] = parsed;
    if (width >= height) {
      rectW = maxSize;
      rectH = (maxSize * height) / width;
    } else {
      rectH = maxSize;
      rectW = (maxSize * width) / height;
    }
  }
  const x = (18 - rectW) / 2;
  const y = (18 - rectH) / 2;
  const radius = Math.min(2, rectW / 4, rectH / 4);
  return (
    <CompositedSvg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <rect x={x} y={y} width={rectW} height={rectH} rx={radius} />
    </CompositedSvg>
  );
}
const OPT_BASE =
  "border rounded-sm transition-colors duration-150 cursor-pointer disabled:cursor-default";
const OPT_DEFAULT =
  "border-border bg-transparent text-foreground/70 hover:enabled:bg-[var(--canvas-controls-hover)] hover:enabled:text-foreground";
export const PARAM_OPTION_SELECTED_CLASS =
  "border-[var(--canvas-param-selected-border)] bg-[var(--canvas-param-selected-bg)] text-foreground";
const OPT_DISABLED = "opacity-40";
export function optClass(selected, optDisabled) {
  return [
    OPT_BASE,
    selected ? PARAM_OPTION_SELECTED_CLASS : OPT_DEFAULT,
    optDisabled && !selected ? OPT_DISABLED : "",
  ]
    .filter(Boolean)
    .join(" ");
}
export function ResolutionTabs({
  options,
  value,
  onChange,
  disabled,
  disabledOptions,
  getOptionLabel,
  getOptionTooltip,
}) {
  const { t: translate } = useTranslation();
  return (
    <div className="flex gap-1.5">
      {options.map((opt) => {
        const optDisabled = disabled || (disabledOptions?.has(opt) ?? false);
        const selected = opt === value;
        const label =
          getOptionLabel?.(opt) ??
          translate(`canvas.param.option.${opt}`, {
            defaultValue: opt,
          });
        const tooltip = getOptionTooltip?.(opt);
        const widthClass = options.length === 1 ? "w-1/2" : "flex-1";
        const button = (
          <button
            key={opt}
            type="button"
            onClick={(clickEvent) => {
              clickEvent.stopPropagation();
              if (!optDisabled) onChange?.(opt);
            }}
            disabled={optDisabled}
            className={`${optClass(selected, optDisabled)} ${tooltip ? "w-full" : widthClass} h-7 px-4 text-[13px] text-center`}
          >
            {label}
          </button>
        );
        return tooltip ? (
          <Tooltip key={opt} content={tooltip}>
            <span className={`flex min-w-0 ${widthClass}`}>{button}</span>
          </Tooltip>
        ) : (
          button
        );
      })}
    </div>
  );
}
