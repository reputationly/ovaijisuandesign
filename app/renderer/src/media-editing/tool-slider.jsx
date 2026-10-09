// tool-slider.jsx
import { reactExports } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { Slider$1 } from "../generation/slider.jsx";

const DEFAULT_THUMB_SIZE = 16;

export function ToolSlider({
  label,
  value,
  min: min2 = 0,
  max: max2 = 100,
  step,
  onChange,
  formatValue,
  className = "",
  labelClassName,
  valueClassName,
  showValue = true,
  trackAppearance,
  trackStyle,
  thumbStyle,
  markerValue,
  thumbSize = DEFAULT_THUMB_SIZE,
  dataActionUiId,
}) {
  const trackRef = reactExports.useRef(null);
  const thumbRadius = thumbSize / 2;
  const resolvedMarkerValue =
    markerValue ?? (min2 < 0 && max2 > 0 ? 0 : void 0);
  const cleanupRef = reactExports.useRef(void 0);
  reactExports.useEffect(() => () => cleanupRef.current?.(), []);
  const getValueFromClientX = (clientX) => {
    const track = trackRef.current;
    if (!track) return min2;
    const rect = track.getBoundingClientRect();
    const usableWidth = Math.max(1, rect.width - thumbSize);
    const x2 = Math.max(
      0,
      Math.min(clientX - rect.left - thumbRadius, usableWidth),
    );
    const ratio = x2 / usableWidth;
    const raw2 = min2 + ratio * (max2 - min2);
    const snapped =
      step && step > 0 ? Math.round(raw2 / step) * step : Math.round(raw2);
    return Math.max(min2, Math.min(max2, snapped));
  };
  const handleMouseDown2 = (e2) => {
    e2.preventDefault();
    e2.stopPropagation();
    cleanupRef.current?.();
    onChange(getValueFromClientX(e2.clientX));
    const handleMouseMove2 = (moveEvent) => {
      onChange(getValueFromClientX(moveEvent.clientX));
    };
    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove2);
      document.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("blur", handleMouseUp);
    };
    document.addEventListener("mousemove", handleMouseMove2);
    document.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("blur", handleMouseUp);
    cleanupRef.current = handleMouseUp;
  };
  const handleTouchStart = (e2) => {
    e2.stopPropagation();
    cleanupRef.current?.();
    const touch2 = e2.touches[0];
    if (!touch2) return;
    onChange(getValueFromClientX(touch2.clientX));
    const handleTouchMove = (moveEvent) => {
      const point2 = moveEvent.touches[0];
      if (point2) onChange(getValueFromClientX(point2.clientX));
    };
    const handleTouchEnd = () => {
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
      document.removeEventListener("touchcancel", handleTouchEnd);
      window.removeEventListener("blur", handleTouchEnd);
    };
    document.addEventListener("touchmove", handleTouchMove, {
      passive: true,
    });
    document.addEventListener("touchend", handleTouchEnd);
    document.addEventListener("touchcancel", handleTouchEnd);
    window.addEventListener("blur", handleTouchEnd);
    cleanupRef.current = handleTouchEnd;
  };
  const displayValue = formatValue ? formatValue(value) : `${value}%`;
  const keyboardStep = step && step > 0 ? step : 1;
  const handleKeyDown2 = (event) => {
    let nextValue = null;
    if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      nextValue = value - keyboardStep;
    } else if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      nextValue = value + keyboardStep;
    } else if (event.key === "Home") {
      nextValue = min2;
    } else if (event.key === "End") {
      nextValue = max2;
    }
    if (nextValue === null) return;
    event.preventDefault();
    event.stopPropagation();
    onChange(Math.max(min2, Math.min(max2, nextValue)));
  };
  return (
    <div className={`flex flex-col ${className}`}>
      {label && (
        <div className="hilo-slider-field__header flex items-baseline justify-between gap-3">
          <span
            className={
              labelClassName ??
              "text-hl_text_02 text-[13px] font-medium leading-5"
            }
          >
            {label}
          </span>
          {showValue && (
            <span
              className={`tabular-nums text-[13px] leading-5 ${valueClassName ?? "text-hl_text_00 font-semibold"}`}
            >
              {displayValue}
            </span>
          )}
        </div>
      )}
      <div ref={trackRef}>
        <Slider$1
          variant="rounded"
          size="compact"
          value={value}
          min={min2}
          max={max2}
          step={keyboardStep}
          markerValue={resolvedMarkerValue}
          trackAppearance={trackAppearance}
          thumbSize={thumbSize}
          aria-label={label}
          style={
            trackStyle
              ? {
                  "--slider-rounded-track": trackStyle.background,
                }
              : void 0
          }
          thumbProps={{
            style: thumbStyle,
            getAriaValueText: () => displayValue,
            "data-action-ui-id": dataActionUiId,
          }}
          onPointerDownCapture={(event) => event.stopPropagation()}
          onMouseDownCapture={handleMouseDown2}
          onTouchStartCapture={handleTouchStart}
          onKeyDownCapture={handleKeyDown2}
        />
      </div>
    </div>
  );
}
