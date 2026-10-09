// slider.jsx
import { reactExports, CompositedSvg, useTranslation, SliderRoot, SliderControl$1, SliderTrack, SliderIndicator, SliderThumb } from "../vendor.js";
import { BACKEND_ELEVENLABS_MUSIC } from "../m15/push-inline.js";
import { cn$5 } from "../asset-center/shared/use-browser-overlay-dialog-props.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { MIN_MUSIC_BILLING_SECONDS } from "./calc-video-cost-breakdown.jsx";
import { Tooltip$1 } from "./create-tracker.jsx";
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
    const seconds = Math.max(Math.ceil(durationMS / 1e3), MIN_MUSIC_BILLING_SECONDS);
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
  const cost = model.costs?.find((entry) => entry.resolutions?.includes(resolution));
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
  const bare = modelId.includes("/") ? modelId.slice(modelId.indexOf("/") + 1) : modelId;
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
export function mediaExtensionDisabledDurationOptions(sourceDurationSec, capability) {
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
export function isMediaExtensionInputDurationValid(sourceDurationSec, capability) {
  if (!capability || !isFinitePositive(sourceDurationSec)) return false;
  return (
    sourceDurationSec >= capability.inputMinDurationSec &&
    sourceDurationSec <= capability.inputMaxDurationSec
  );
}
export function isMediaExtensionOutputDurationValid(sourceDurationSec, outputDuration, capability) {
  if (!isMediaExtensionInputDurationValid(sourceDurationSec, capability) || !capability) {
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
function useSliderBoundaryHint(enabled, boundaryKey) {
  const [open, setOpen] = reactExports.useState(false);
  const cleanupRef = reactExports.useRef(null);
  const timerRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    setOpen(false);
    return () => {
      cleanupRef.current?.();
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, [enabled, boundaryKey]);
  const start2 = (root2) => {
    if (!enabled) return;
    cleanupRef.current?.();
    const doc2 = root2.ownerDocument;
    const win2 = doc2.defaultView;
    let shown = false;
    const inspect = (clientX) => {
      const control = root2.querySelector('[data-slot="slider-control"]');
      if (!control || shown) return;
      const bounds = control.getBoundingClientRect();
      const rtl = win2?.getComputedStyle(root2).direction === "rtl";
      if (rtl ? clientX <= bounds.right + 2 : clientX >= bounds.left - 2) return;
      shown = true;
      setOpen(true);
      if (timerRef.current !== null) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setOpen(false), 1e3);
    };
    const handlePointerMove = (event) => {
      if (event.buttons === 0) {
        stop();
        return;
      }
      inspect(event.clientX);
    };
    const handleTouchMove = (event) => {
      if (event.touches.length === 1) inspect(event.touches[0].clientX);
    };
    const stop = () => {
      doc2.removeEventListener("pointermove", handlePointerMove);
      doc2.removeEventListener("touchmove", handleTouchMove);
      doc2.removeEventListener("pointerup", stop);
      doc2.removeEventListener("pointercancel", stop);
      doc2.removeEventListener("touchend", stop);
      doc2.removeEventListener("touchcancel", stop);
      win2?.removeEventListener("blur", stop);
      cleanupRef.current = null;
    };
    cleanupRef.current = stop;
    doc2.addEventListener("pointermove", handlePointerMove);
    doc2.addEventListener("touchmove", handleTouchMove, {
      passive: true,
    });
    doc2.addEventListener("pointerup", stop);
    doc2.addEventListener("pointercancel", stop);
    doc2.addEventListener("touchend", stop);
    doc2.addEventListener("touchcancel", stop);
    win2?.addEventListener("blur", stop);
  };
  return {
    open: enabled && open,
    start: start2,
  };
}
export function Slider$1({
  className,
  variant = "standard",
  size: size2 = "default",
  markerValue,
  trackAppearance = "neutral",
  thumbSize = 16,
  visualMin,
  ticks,
  minBoundaryMessage,
  thumbProps,
  value,
  defaultValue: defaultValue2,
  orientation = "horizontal",
  ...props
}) {
  const values3 = value ?? defaultValue2 ?? 0;
  const count2 = Array.isArray(values3) ? values3.length : 1;
  const appearance = count2 > 1 || orientation === "vertical" ? "standard" : variant;
  const min2 = props.min ?? 0;
  const max2 = props.max ?? 100;
  const axisMin =
    appearance === "filled" &&
    typeof visualMin === "number" &&
    Number.isFinite(visualMin) &&
    visualMin < min2 &&
    max2 >= min2
      ? visualMin
      : min2;
  const offset2 = max2 > min2 ? (min2 - axisMin) / (max2 - axisMin) : 0;
  const boundaryHint = useSliderBoundaryHint(
    offset2 > 0 && !props.disabled && Boolean(minBoundaryMessage),
    `${min2}:${max2}:${axisMin}:${minBoundaryMessage ?? ""}`,
  );
  const { className: thumbClassName, style: thumbStyle, ...otherThumbProps } = thumbProps ?? {};
  const isLockedPrefix = (root2, target, clientX) => {
    if (
      offset2 <= 0 ||
      !(target instanceof Element) ||
      target.closest('[data-slot="slider-thumb"]')
    )
      return false;
    const bounds = root2.querySelector('[data-slot="slider-control"]')?.getBoundingClientRect();
    const rtl = getComputedStyle(root2).direction === "rtl";
    return bounds !== void 0 && (rtl ? clientX > bounds.right : clientX < bounds.left);
  };
  const slider = (
    <SliderRoot
      {...props}
      value={value}
      defaultValue={defaultValue2}
      orientation={orientation}
      data-orientation={orientation}
      data-slot="slider"
      data-variant={appearance}
      data-size={size2}
      data-track-appearance={appearance === "rounded" ? trackAppearance : void 0}
      data-thumb-size={appearance === "rounded" ? thumbSize : void 0}
      data-visual-min={axisMin}
      onPointerDownCapture={(event) => {
        if (isLockedPrefix(event.currentTarget, event.target, event.clientX)) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        if (event.button === 0) boundaryHint.start(event.currentTarget);
        props.onPointerDownCapture?.(event);
      }}
      onTouchStartCapture={(event) => {
        const touch2 = event.touches[0];
        if (touch2 && isLockedPrefix(event.currentTarget, event.target, touch2.clientX)) {
          event.stopPropagation();
          return;
        }
        if (event.touches.length === 1) boundaryHint.start(event.currentTarget);
        props.onTouchStartCapture?.(event);
      }}
      className={(state2) =>
        cn$5(
          "hilo-slider w-full min-w-0",
          typeof className === "function" ? className(state2) : className,
        )
      }
    >
      <SliderControl$1
        className="hilo-slider__control"
        data-slot="slider-control"
        style={
          offset2 > 0
            ? {
                marginInlineStart: `${offset2 * 100}%`,
              }
            : void 0
        }
      >
        <SliderTrack
          className="hilo-slider__track"
          data-slot="slider-track"
          style={
            offset2 > 0
              ? {
                  width: `${100 / (1 - offset2)}%`,
                  marginInlineStart: `${(-offset2 / (1 - offset2)) * 100}%`,
                  flexShrink: 0,
                }
              : void 0
          }
        >
          {appearance === "rounded" &&
            markerValue !== void 0 &&
            Number.isFinite(markerValue) &&
            max2 > min2 &&
            markerValue >= min2 &&
            markerValue <= max2 && (
              <span
                aria-hidden="true"
                className="hilo-slider__marker"
                data-slot="slider-marker"
                style={{
                  insetInlineStart: `${((markerValue - min2) / (max2 - min2)) * 100}%`,
                }}
              />
            )}
          <SliderIndicator
            className="hilo-slider__indicator"
            data-slot="slider-range"
            style={
              axisMin < min2
                ? (state2) => ({
                    width: `${Math.min(100, Math.max(0, ((state2.values[0] - axisMin) / (max2 - axisMin)) * 100))}%`,
                  })
                : void 0
            }
          />
          {appearance === "filled" &&
            [...new Set(ticks)]
              .filter((tick) => Number.isFinite(tick) && tick > axisMin && tick < max2)
              .map((tick) => (
                <span
                  key={tick}
                  aria-hidden="true"
                  className="hilo-slider__tick"
                  data-slot="slider-tick"
                  style={{
                    insetInlineStart: `${((tick - axisMin) / (max2 - axisMin)) * 100}%`,
                  }}
                />
              ))}
        </SliderTrack>
        {Array.from(
          {
            length: count2,
          },
          (_2, index2) =>
            reactExports.createElement(SliderThumb, {
              ...otherThumbProps,
              key: index2,
              index: index2,
              "aria-label": otherThumbProps["aria-label"] ?? props["aria-label"],
              "aria-labelledby": otherThumbProps["aria-labelledby"] ?? props["aria-labelledby"],
              "aria-describedby": otherThumbProps["aria-describedby"] ?? props["aria-describedby"],
              "data-slot": "slider-thumb",
              "data-action-ui-id": otherThumbProps["data-action-ui-id"] ?? "slider.thumb",
              className: (state2) =>
                cn$5(
                  "hilo-slider__thumb",
                  typeof thumbClassName === "function" ? thumbClassName(state2) : thumbClassName,
                ),
              style: (state2) => ({
                ...(appearance === "filled"
                  ? {
                      insetInlineStart: `clamp(${offset2 > 0 ? -4 : 4}px, calc(${max2 === min2 && axisMin < min2 ? 100 : ((state2.values[0] - state2.min) / (state2.max - state2.min || 1)) * 100}% - 4px), calc(100% - 4px))`,
                    }
                  : {}),
                ...(typeof thumbStyle === "function" ? thumbStyle(state2) : thumbStyle),
              }),
            }),
        )}
      </SliderControl$1>
    </SliderRoot>
  );
  return minBoundaryMessage ? (
    <Tooltip$1
      content={minBoundaryMessage}
      open={boundaryHint.open}
      closeOnClick={false}
      side="top"
      className="duration-150 data-open:zoom-in-95 data-closed:zoom-out-95 motion-reduce:animate-none"
    >
      {slider}
    </Tooltip$1>
  ) : (
    slider
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
  return <div className="text-xs font-medium text-muted-foreground mb-2.5">{children2}</div>;
}
function MaximizeIcon() {
  return (
    <CompositedSvg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 7V3h4M11 3h4v4M15 11v4h-4M7 15H3v-4" />
    </CompositedSvg>
  );
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
export function parseRatio(value) {
  const m3 = value.match(/^(\d+)\s*[:x]\s*(\d+)$/i);
  if (!m3) return null;
  const w3 = Number(m3[1]);
  const h2 = Number(m3[2]);
  if (!w3 || !h2) return null;
  return [w3, h2];
}
const isAutoOption = (opt) => opt.toLowerCase() === "auto";
const OPT_BASE =
  "border rounded-sm transition-colors duration-150 cursor-pointer disabled:cursor-default";
const OPT_DEFAULT =
  "border-border bg-transparent text-foreground/70 hover:enabled:bg-[var(--canvas-controls-hover)] hover:enabled:text-foreground";
export const PARAM_OPTION_SELECTED_CLASS =
  "border-[var(--canvas-param-selected-border)] bg-[var(--canvas-param-selected-bg)] text-foreground";
const OPT_DISABLED = "opacity-40";
function optClass(selected2, optDisabled) {
  return [
    OPT_BASE,
    selected2 ? PARAM_OPTION_SELECTED_CLASS : OPT_DEFAULT,
    optDisabled && !selected2 ? OPT_DISABLED : "",
  ]
    .filter(Boolean)
    .join(" ");
}
export function AspectRatioGrid({
  options,
  value,
  onChange,
  disabled: disabled2,
  disabledOptions,
}) {
  const { t: t2 } = useTranslation();
  const autoOption = options.find(isAutoOption);
  const ratioOptions = options.filter((o2) => !isAutoOption(o2));
  const handlePick = (opt, optDisabled) => (e2) => {
    e2.stopPropagation();
    if (optDisabled || disabled2) return;
    onChange?.(opt);
  };
  return (
    <div className="flex flex-col gap-1.5">
      {autoOption && (
        <button
          type="button"
          onClick={handlePick(autoOption, disabled2 || (disabledOptions?.has(autoOption) ?? false))}
          disabled={disabled2 || (disabledOptions?.has(autoOption) ?? false)}
          className={`${optClass(value === autoOption, disabled2 || (disabledOptions?.has(autoOption) ?? false))} flex items-center justify-center gap-2 px-3.5 py-2.5`}
          data-action-ui-id="popover.aspect-ratio-option"
          data-aspect-ratio={autoOption}
        >
          <MaximizeIcon />
          <span className="text-[13px]">
            {t2("canvas.param.option.auto", {
              defaultValue: "Auto",
            })}
          </span>
        </button>
      )}
      <div className="grid grid-cols-5 gap-1.5">
        {ratioOptions.map((opt) => {
          const optDisabled = disabled2 || (disabledOptions?.has(opt) ?? false);
          const selected2 = opt === value;
          const label =
            opt.toLowerCase() === "adaptive"
              ? t2("canvas.param.option.auto", {
                  defaultValue: "Auto",
                })
              : opt;
          return (
            <button
              key={opt}
              type="button"
              onClick={handlePick(opt, optDisabled)}
              disabled={optDisabled}
              className={`${optClass(selected2, optDisabled)} flex flex-col items-center justify-center gap-1 py-2.5 px-1`}
              data-action-ui-id="popover.aspect-ratio-option"
              data-aspect-ratio={opt}
            >
              <AspectRatioIcon ratio={opt} />
              <span className="text-[11px] leading-none">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
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
function decimalsOf(step) {
  if (!Number.isFinite(step)) return 0;
  const s2 = String(step);
  const dot2 = s2.indexOf(".");
  return dot2 < 0 ? 0 : s2.length - dot2 - 1;
}
function formatNumber$3(n2, decimals) {
  const s2 = n2.toFixed(decimals);
  return decimals === 0 ? s2 : s2.replace(/\.?0+$/, "") || "0";
}
function parseValue(value, fallback) {
  const n2 = Number(value);
  return Number.isFinite(n2) ? n2 : fallback;
}
export function ParamSlider({
  label,
  value,
  min: min2,
  max: max2,
  step,
  marks,
  onChange,
  disabled: disabled2,
  variant = "standard",
}) {
  const decimals = decimalsOf(step);
  const numeric2 = parseValue(value, min2);
  const display = formatNumber$3(numeric2, decimals);
  const emit2 = (n2) => {
    if (!onChange || disabled2) return;
    const clamped = Math.min(max2, Math.max(min2, n2));
    onChange(formatNumber$3(clamped, decimals));
  };
  const atMin = numeric2 <= min2 + step / 2;
  const atMax = numeric2 >= max2 - step / 2;
  return (
    <div>
      <div className="hilo-slider-field__header flex items-center justify-between">
        <ParamSectionLabel>{label}</ParamSectionLabel>
        <ParamStepper
          decreaseDisabled={disabled2 || atMin}
          increaseDisabled={disabled2 || atMax}
          onDecrease={() => emit2(numeric2 - step)}
          onIncrease={() => emit2(numeric2 + step)}
        >
          <span className="text-[13px] font-medium tabular-nums text-[var(--canvas-controls-text)] min-w-[2.5rem] text-center">
            {display}
          </span>
        </ParamStepper>
      </div>
      {variant === "filled" ? (
        <Slider$1
          variant="filled"
          size="compact"
          value={numeric2}
          min={min2}
          max={max2}
          step={step}
          disabled={disabled2}
          aria-label={label}
          thumbProps={{
            "data-action-ui-id": "canvas.params.slider-thumb",
          }}
          onValueChange={(v2) => {
            const next2 = Array.isArray(v2) ? v2[0] : v2;
            if (typeof next2 === "number") emit2(next2);
          }}
          onPointerDown={(e2) => e2.stopPropagation()}
          data-action-ui-id="canvas.params.speed-slider"
        />
      ) : (
        <SliderRoot
          value={numeric2}
          min={min2}
          max={max2}
          step={step}
          disabled={disabled2}
          onValueChange={(v2) => {
            const next2 = Array.isArray(v2) ? v2[0] : v2;
            if (typeof next2 === "number") emit2(next2);
          }}
          onPointerDown={(e2) => e2.stopPropagation()}
          className="data-horizontal:w-full px-1.5"
        >
          <SliderControl$1 className="relative flex w-full touch-none items-center select-none data-disabled:opacity-50 py-1.5">
            <SliderTrack
              data-slot="slider-track"
              className="relative grow overflow-hidden rounded-full bg-[var(--canvas-controls-hover)] border border-[var(--canvas-controls-border)] select-none h-1.5"
            >
              <SliderIndicator
                data-slot="slider-range"
                className="rounded-full bg-[var(--canvas-controls-active)] select-none h-full"
              />
            </SliderTrack>
            <SliderThumb
              data-slot="slider-thumb"
              data-action-ui-id="canvas.params.slider-thumb"
              className={[
                "relative block size-3.5 shrink-0 select-none cursor-pointer rounded-full",
                "bg-white border-[1.5px] border-[var(--canvas-controls-active)]",
                "shadow-[0_1px_2px_rgba(0,0,0,0.12)]",
                "transition-[box-shadow,transform] duration-150",
                "after:absolute after:-inset-2",
                "hover:enabled:shadow-[0_1px_3px_rgba(0,0,0,0.18)]",
                "active:scale-95",
                "focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-[var(--canvas-node-border-selected)]",
                "disabled:pointer-events-none disabled:opacity-50",
              ].join(" ")}
            />
          </SliderControl$1>
        </SliderRoot>
      )}
      {marks && marks.length > 0 && (
        // Position every stop from 0% to 100% by index so the first and last
        // values sit on the track ends and every interval between them is equal.
        <div className="hilo-slider-field__marks relative h-4 mx-1.5">
          {marks.map((mark2, idx) => {
            const markNum = Number(mark2);
            if (!Number.isFinite(markNum)) return null;
            const active2 = Math.abs(markNum - numeric2) < step / 2;
            const pct = marks.length === 1 ? 0 : (idx / (marks.length - 1)) * 100;
            const alignment =
              idx === 0
                ? "translate-x-0"
                : idx === marks.length - 1
                  ? "-translate-x-full"
                  : "-translate-x-1/2";
            return (
              <button
                key={mark2}
                type="button"
                disabled={disabled2}
                onClick={(e2) => {
                  e2.stopPropagation();
                  emit2(markNum);
                }}
                style={{
                  left: `${pct}%`,
                }}
                className={[
                  "absolute top-0 text-center text-[10px] tabular-nums px-1 py-0.5 transition-colors duration-150 cursor-pointer disabled:cursor-default whitespace-nowrap",
                  alignment,
                  active2
                    ? "text-[var(--canvas-controls-text)]"
                    : "text-[var(--canvas-controls-text-muted)] hover:enabled:text-[var(--canvas-controls-text)]",
                ].join(" ")}
              >
                {mark2}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
