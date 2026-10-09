// resolution-tabs.jsx
import { __jsx } from "../shared/jsx-runtime.js";
import { CompositedSvg, useTranslation } from "../vendor.js";
import { Tooltip$1 } from "./missing-asset-card.jsx";
import { cn$5 } from "../infra/dialog-content.jsx";
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
    const model2 = pricing.video?.find((m3) => m3.modelID === modelId);
    if (!model2) return void 0;
    if (model2.defaultCost > 0) return model2.defaultCost;
    const first2 = model2.videoCosts?.[0];
    if (first2?.realCost && first2.realCost > 0) return first2.realCost;
    return void 0;
  }
}

export function calcToolCost(pricing, modelId, resolution, sourceDurationSec) {
  if (!pricing?.tool) return void 0;
  const model = pricing.tool.find((m3) => m3.modelID === modelId);
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
  const entry = pricing.text.find((t2) => t2.modelID === bare);
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
    (_2, index2) => String(firstDuration + index2),
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
      (option2) => Number(option2) < minimumOutputDuration,
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

const BUTTON_CLASS$1 = [
  "flex items-center justify-center size-5 rounded-md border text-[13px] leading-none",
  "border-[var(--canvas-controls-border)] bg-[var(--canvas-controls-hover)]",
  "text-[var(--canvas-controls-text-muted)] transition-colors duration-150",
  "hover:enabled:text-[var(--canvas-controls-text)] hover:enabled:border-[var(--canvas-node-border-selected)]",
  "disabled:opacity-40 disabled:cursor-default cursor-pointer",
].join(" ");

export function ParamStepper({
  children: children2,
  onDecrease,
  onIncrease,
  decreaseDisabled,
  increaseDisabled,
  actionPrefix = "canvas.params.slider",
  className,
}) {
  const { t: t2 } = useTranslation();
  return (
    <div className={cn$5("flex items-center gap-1.5", className)}>
      <button
        type="button"
        disabled={decreaseDisabled}
        onClick={(event) => {
          event.stopPropagation();
          onDecrease();
        }}
        aria-label={t2("canvas.param.slider.decrease", {
          defaultValue: "Decrease",
        })}
        data-action-ui-id={`${actionPrefix}-decrease`}
        className={BUTTON_CLASS$1}
      >
        <span className="-translate-y-px">−</span>
      </button>
      {children2}
      <button
        type="button"
        disabled={increaseDisabled}
        onClick={(event) => {
          event.stopPropagation();
          onIncrease();
        }}
        aria-label={t2("canvas.param.slider.increase", {
          defaultValue: "Increase",
        })}
        data-action-ui-id={`${actionPrefix}-increase`}
        className={BUTTON_CLASS$1}
      >
        <span className="-translate-y-px">+</span>
      </button>
    </div>
  );
}

export function ParamSectionLabel({ children: children2 }) {
  return (
    <div className="text-xs font-medium text-muted-foreground mb-2.5">
      {children2}
    </div>
  );
}

export function parseRatio(value) {
  const m3 = value.match(/^(\d+)\s*[:x]\s*(\d+)$/i);
  if (!m3) return null;
  const w3 = Number(m3[1]);
  const h2 = Number(m3[2]);
  if (!w3 || !h2) return null;
  return [w3, h2];
}

export function AspectRatioIcon({ ratio }) {
  const parsed = parseRatio(ratio);
  const maxSize = 14;
  let rectW = maxSize;
  let rectH = maxSize;
  if (parsed) {
    const [w3, h2] = parsed;
    if (w3 >= h2) {
      rectW = maxSize;
      rectH = (maxSize * h2) / w3;
    } else {
      rectH = maxSize;
      rectW = (maxSize * w3) / h2;
    }
  }
  const x2 = (18 - rectW) / 2;
  const y4 = (18 - rectH) / 2;
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
      <rect x={x2} y={y4} width={rectW} height={rectH} rx={radius} />
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

export function optClass(selected2, optDisabled) {
  return [
    OPT_BASE,
    selected2 ? PARAM_OPTION_SELECTED_CLASS : OPT_DEFAULT,
    optDisabled && !selected2 ? OPT_DISABLED : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export function ResolutionTabs({
  options,
  value,
  onChange,
  disabled: disabled2,
  disabledOptions,
  getOptionLabel,
  getOptionTooltip,
}) {
  const { t: t2 } = useTranslation();
  return (
    <div className="flex gap-1.5">
      {options.map((opt) => {
        const optDisabled = disabled2 || (disabledOptions?.has(opt) ?? false);
        const selected2 = opt === value;
        const label =
          getOptionLabel?.(opt) ??
          t2(`canvas.param.option.${opt}`, {
            defaultValue: opt,
          });
        const tooltip = getOptionTooltip?.(opt);
        const widthClass = options.length === 1 ? "w-1/2" : "flex-1";
        const button = (
          <button
            key={opt}
            type="button"
            onClick={(e2) => {
              e2.stopPropagation();
              if (!optDisabled) onChange?.(opt);
            }}
            disabled={optDisabled}
            className={`${optClass(selected2, optDisabled)} ${tooltip ? "w-full" : widthClass} h-7 px-4 text-[13px] text-center`}
          >
            {label}
          </button>
        );
        return tooltip ? (
          <Tooltip$1 key={opt} content={tooltip}>
            <span className={`flex min-w-0 ${widthClass}`}>{button}</span>
          </Tooltip$1>
        ) : (
          button
        );
      })}
    </div>
  );
}
