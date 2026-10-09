// param-slider.jsx
import {
  SliderControl$1 as SliderControl,
  SliderIndicator,
  SliderRoot,
  SliderThumb,
  SliderTrack,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { Slider } from "./slider.jsx";
import { ParamSectionLabel, ParamStepper } from "./resolution-tabs.jsx";
function decimalsOf(step) {
  if (!Number.isFinite(step)) return 0;
  const s2 = String(step);
  const dot2 = s2.indexOf(".");
  return dot2 < 0 ? 0 : s2.length - dot2 - 1;
}
function formatNumber(n2, decimals) {
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
  const display = formatNumber(numeric2, decimals);
  const emit2 = (n2) => {
    if (!onChange || disabled2) return;
    const clamped = Math.min(max2, Math.max(min2, n2));
    onChange(formatNumber(clamped, decimals));
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
        <Slider
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
          {marks.map((mark2, idx) => {
            const markNum = Number(mark2);
            if (!Number.isFinite(markNum)) return null;
            const active2 = Math.abs(markNum - numeric2) < step / 2;
            const pct =
              marks.length === 1 ? 0 : (idx / (marks.length - 1)) * 100;
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
