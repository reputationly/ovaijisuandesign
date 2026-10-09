// param-duration-slider.jsx
import { reactExports, useTranslation } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { nearestDuration } from "./model-param-select.jsx";
import { Slider$1 } from "./slider.jsx";
import { ParamSectionLabel, ParamStepper } from "./resolution-tabs.jsx";
import { Input$1 } from "../media-editing/input.jsx";

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
  const displayValue =
    preview === null ? value : (nearestDuration(preview, available) ?? value);
  const previous2 = available
    .filter((option2) => Number(option2) < numeric2)
    .at(-1);
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
    ([1, 2, 5, 10].find((unit) => unit * magnitude >= rawInterval) ?? 10) *
    magnitude;
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
      <div
        aria-hidden="true"
        className="hilo-slider-field__marks relative mx-1.5 h-5"
      >
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
