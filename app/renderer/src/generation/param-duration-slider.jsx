// param-duration-slider.jsx
import { reactExports, useTranslation } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { nearestDuration } from "./model-param-select.jsx";
import { Slider } from "./slider.jsx";
import { ParamSectionLabel, ParamStepper } from "./resolution-tabs.jsx";
import { Input } from "../media-editing/input.jsx";
export function ParamDurationSlider({
  label,
  options,
  value,
  onChange,
  disabled,
  disabledOptions,
}) {
  const { t: translate } = useTranslation();
  const [draft, setDraft] = reactExports.useState(null);
  const [preview, setPreview] = reactExports.useState(null);
  const [pointerActive, setPointerActive] = reactExports.useState(false);
  const available = options.filter((option) => !disabledOptions?.has(option));
  const inactive = disabled || available.length === 0;
  const min = Number(available[0] ?? options[0]);
  const max = Number(available.at(-1) ?? options.at(-1));
  const numeric = Number(nearestDuration(Number(value), available) ?? value);
  const displayValue =
    preview === null ? value : (nearestDuration(preview, available) ?? value);
  const previous = available
    .filter((option) => Number(option) < numeric)
    .at(-1);
  const next = available.find((option) => Number(option) > numeric);
  const handleStep = (option) => {
    if (inactive || option === void 0) return;
    setDraft(null);
    setPreview(null);
    onChange(option);
  };
  const rawInterval = Math.max(1, max / 3);
  const magnitude = 10 ** Math.floor(Math.log10(rawInterval));
  const interval =
    ([1, 2, 5, 10].find((unit) => unit * magnitude >= rawInterval) ?? 10) *
    magnitude;
  const marks = [0];
  for (let mark = interval; mark < max; mark += interval) {
    if (max - mark >= interval / 2) marks.push(mark);
  }
  if (max > 0) marks.push(max);
  const handleSliderCommit = (next) => {
    handleChange(typeof next === "number" ? next : next[0]);
    setPreview(null);
    setPointerActive(false);
  };
  const handleChange = (seconds) => {
    const next = nearestDuration(seconds, available);
    if (!inactive && next !== void 0) onChange(next);
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
          decreaseDisabled={inactive || previous === void 0}
          increaseDisabled={inactive || next === void 0}
          onDecrease={() => handleStep(previous)}
          onIncrease={() => handleStep(next)}
        >
          <div className="relative w-12 shrink-0">
            <Input
              type="number"
              aria-label={label}
              data-action-ui-id="canvas.params.duration-input"
              min={min}
              max={max}
              step={1}
              value={draft ?? displayValue}
              disabled={inactive}
              onChange={(event) => {
                const next = event.target.value;
                setDraft(next);
                if (available.includes(next)) onChange(next);
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
      <Slider
        variant="filled"
        size="compact"
        visualMin={0}
        minBoundaryMessage={translate("canvas.param.durationRange", {
          min,
          max,
        })}
        ticks={marks}
        aria-label={label}
        value={preview ?? numeric}
        min={min}
        max={max}
        step={pointerActive ? 0.01 : 1}
        disabled={inactive || available.length < 2}
        onValueChange={(next) => {
          setDraft(null);
          setPreview(Array.isArray(next) ? next[0] : next);
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
      <div
        aria-hidden="true"
        className="hilo-slider-field__marks relative mx-1.5 h-5"
      >
        {marks.map((seconds) => {
          const alignment =
            seconds === 0
              ? "translate-x-0"
              : seconds === max
                ? "-translate-x-full rtl:translate-x-full"
                : "-translate-x-1/2 rtl:translate-x-1/2";
          const active = seconds === Number(displayValue);
          return (
            <span
              key={seconds}
              data-action-ui-id={
                seconds === 0
                  ? "canvas.params.duration-min"
                  : seconds === max
                    ? "canvas.params.duration-max"
                    : "canvas.params.duration-mark"
              }
              style={{
                insetInlineStart: `${max > 0 ? (seconds / max) * 100 : 0}%`,
              }}
              className={`absolute top-0 px-1 py-0.5 text-center text-[10px] whitespace-nowrap tabular-nums ${alignment} ${active ? "text-[var(--canvas-controls-text)]" : "text-[var(--canvas-controls-text-muted)]"} ${inactive || (seconds > 0 && seconds < min) || disabledOptions?.has(String(seconds)) ? "opacity-40" : ""}`}
            >
              {seconds}s
            </span>
          );
        })}
      </div>
    </div>
  );
}
