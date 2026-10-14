// param-slider.jsx
import { SliderControl$1 as SliderControl, SliderIndicator, SliderRoot, SliderThumb, SliderTrack } from "../infra/base-ui.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { Slider } from "./slider.jsx";
import { ParamSectionLabel, ParamStepper } from "./resolution-tabs.jsx";
function decimalsOf(step) {
  if (!Number.isFinite(step)) return 0;
  const stepText = String(step);
  const dot = stepText.indexOf(".");
  return dot < 0 ? 0 : stepText.length - dot - 1;
}
function formatNumber(numberValue, decimals) {
  const stepText = numberValue.toFixed(decimals);
  return decimals === 0 ? stepText : stepText.replace(/\.?0+$/, "") || "0";
}
function parseValue(value, fallback) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}
export function ParamSlider({
  label,
  value,
  min,
  max,
  step,
  marks,
  onChange,
  disabled,
  variant = "standard",
}) {
  const decimals = decimalsOf(step);
  const numeric = parseValue(value, min);
  const display = formatNumber(numeric, decimals);
  const emit = (numberValue) => {
    if (!onChange || disabled) return;
    const clamped = Math.min(max, Math.max(min, numberValue));
    onChange(formatNumber(clamped, decimals));
  };
  const atMin = numeric <= min + step / 2;
  const atMax = numeric >= max - step / 2;
  return (
    <div>
      <div className="hilo-slider-field__header flex items-center justify-between">
        <ParamSectionLabel>{label}</ParamSectionLabel>
        <ParamStepper
          decreaseDisabled={disabled || atMin}
          increaseDisabled={disabled || atMax}
          onDecrease={() => emit(numeric - step)}
          onIncrease={() => emit(numeric + step)}
        >
          <span className="text-[13px] font-medium tabular-nums text-[var(--canvas-controls-text)] min-w-[2.5rem] text-center">
            {display}
          </span>
        </ParamStepper>
      </div>
      {variant === "filled" ? (
        <Slider
          variant="filled"
          size="compact"
          value={numeric}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          aria-label={label}
          thumbProps={{
            "data-action-ui-id": "canvas.params.slider-thumb",
          }}
          onValueChange={(value) => {
            const next = Array.isArray(value) ? value[0] : value;
            if (typeof next === "number") emit(next);
          }}
          onPointerDown={(pointerEvent) => pointerEvent.stopPropagation()}
          data-action-ui-id="canvas.params.speed-slider"
        />
      ) : (
        <SliderRoot
          value={numeric}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          onValueChange={(value) => {
            const next = Array.isArray(value) ? value[0] : value;
            if (typeof next === "number") emit(next);
          }}
          onPointerDown={(pointerEvent) => pointerEvent.stopPropagation()}
          className="data-horizontal:w-full px-1.5"
        >
          <SliderControl className="relative flex w-full touch-none items-center select-none data-disabled:opacity-50 py-1.5">
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
          </SliderControl>
        </SliderRoot>
      )}
      {marks && marks.length > 0 && (
        // Position every stop from 0% to 100% by index so the first and last
        // values sit on the track ends and every interval between them is equal.
        <div className="hilo-slider-field__marks relative h-4 mx-1.5">
          {marks.map((mark, markIndex) => {
            const markNum = Number(mark);
            if (!Number.isFinite(markNum)) return null;
            const active = Math.abs(markNum - numeric) < step / 2;
            const percentage =
              marks.length === 1 ? 0 : (markIndex / (marks.length - 1)) * 100;
            const alignment =
              markIndex === 0
                ? "translate-x-0"
                : markIndex === marks.length - 1
                  ? "-translate-x-full"
                  : "-translate-x-1/2";
            return (
              <button
                key={mark}
                type="button"
                disabled={disabled}
                onClick={(clickEvent) => {
                  clickEvent.stopPropagation();
                  emit(markNum);
                }}
                style={{
                  left: `${percentage}%`,
                }}
                className={[
                  "absolute top-0 text-center text-[10px] tabular-nums px-1 py-0.5 transition-colors duration-150 cursor-pointer disabled:cursor-default whitespace-nowrap",
                  alignment,
                  active
                    ? "text-[var(--canvas-controls-text)]"
                    : "text-[var(--canvas-controls-text-muted)] hover:enabled:text-[var(--canvas-controls-text)]",
                ].join(" ")}
              >
                {mark}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
