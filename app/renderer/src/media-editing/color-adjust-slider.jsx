// color-adjust-slider.jsx
import { __jsx } from "../shared/jsx-runtime.js";
import { Slider } from "../generation/slider.jsx";
export function ColorAdjustSlider({
  label,
  value,
  min: min2,
  max: max2,
  disabled: disabled2,
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
        min={min2}
        max={max2}
        step={1}
        disabled={disabled2}
        aria-label={label}
        thumbProps={{
          "data-action-ui-id": dataActionUiId,
        }}
        onValueChange={(next2) =>
          onChange(Array.isArray(next2) ? next2[0] : next2)
        }
      />
    </div>
  );
}
