// tool-slider.jsx
import { reactExports } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { Slider } from "../generation/slider.jsx";
const DEFAULT_THUMB_SIZE = 16;
export function ToolSlider({
  label,
  value,
  min = 0,
  max = 100,
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
    markerValue ?? (min < 0 && max > 0 ? 0 : void 0);
  const cleanupRef = reactExports.useRef(void 0);
  reactExports.useEffect(() => () => cleanupRef.current?.(), []);
  const getValueFromClientX = (clientX) => {
    const track = trackRef.current;
    if (!track) return min;
    const rect = track.getBoundingClientRect();
    const usableWidth = Math.max(1, rect.width - thumbSize);
    const x2 = Math.max(
      0,
      Math.min(clientX - rect.left - thumbRadius, usableWidth),
    );
    const ratio = x2 / usableWidth;
    const raw = min + ratio * (max - min);
    const snapped =
      step && step > 0 ? Math.round(raw / step) * step : Math.round(raw);
    return Math.max(min, Math.min(max, snapped));
  };
  const handleMouseDown = (mouseEvent) => {
    mouseEvent.preventDefault();
    mouseEvent.stopPropagation();
    cleanupRef.current?.();
    onChange(getValueFromClientX(mouseEvent.clientX));
    const handleMouseMove = (mouseMoveEvent) => {
      onChange(getValueFromClientX(mouseMoveEvent.clientX));
    };
    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("blur", handleMouseUp);
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("blur", handleMouseUp);
    cleanupRef.current = handleMouseUp;
  };
  const handleTouchStart = (touchEvent) => {
    touchEvent.stopPropagation();
    cleanupRef.current?.();
    const touch = touchEvent.touches[0];
    if (!touch) return;
    onChange(getValueFromClientX(touch.clientX));
    const handleTouchMove = (touchMoveEvent) => {
      const point = touchMoveEvent.touches[0];
      if (point) onChange(getValueFromClientX(point.clientX));
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
  const handleKeyDown = (event) => {
    let nextValue = null;
    if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      nextValue = value - keyboardStep;
    } else if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      nextValue = value + keyboardStep;
    } else if (event.key === "Home") {
      nextValue = min;
    } else if (event.key === "End") {
      nextValue = max;
    }
    if (nextValue === null) return;
    event.preventDefault();
    event.stopPropagation();
    onChange(Math.max(min, Math.min(max, nextValue)));
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
        <Slider
          variant="rounded"
          size="compact"
          value={value}
          min={min}
          max={max}
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
          onMouseDownCapture={handleMouseDown}
          onTouchStartCapture={handleTouchStart}
          onKeyDownCapture={handleKeyDown}
        />
      </div>
    </div>
  );
}
