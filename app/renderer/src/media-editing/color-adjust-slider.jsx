// color-adjust-slider.jsx
import { __jsx } from "../shared/jsx-runtime.js";
import { Slider } from "../generation/slider.jsx";
export function ColorAdjustSlider({
  label,
  value,
  min,
  max,
  disabled,
  onChange,
  dataActionUiId,
}) {
  return (
    <div className="flex flex-col">
      <div className="hilo-slider-field__header flex items-center justify-between text-[13px]">
        <span className="text-foreground/70">{label}</span>
        <span className="font-mono tabular-nums text-muted-foreground">
          {value}
        </span>
      </div>
      <Slider
        variant="rounded"
        size="compact"
        value={value}
        min={min}
        max={max}
        step={1}
        disabled={disabled}
        aria-label={label}
        thumbProps={{
          "data-action-ui-id": dataActionUiId,
        }}
        onValueChange={(next) =>
          onChange(Array.isArray(next) ? next[0] : next)
        }
      />
    </div>
  );
}
