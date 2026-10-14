// slider.jsx
import reactExports from "react";
import { SliderControl$1 as SliderControl, SliderIndicator, SliderRoot, SliderThumb, SliderTrack } from "../infra/base-ui.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { cn } from "../infra/dialog-content.jsx";
import { Tooltip } from "./missing-asset-card.jsx";
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
  const start = (root) => {
    if (!enabled) return;
    cleanupRef.current?.();
    const doc = root.ownerDocument;
    const win = doc.defaultView;
    let shown = false;
    const inspect = (clientX) => {
      const control = root.querySelector('[data-slot="slider-control"]');
      if (!control || shown) return;
      const bounds = control.getBoundingClientRect();
      const rtl = win?.getComputedStyle(root).direction === "rtl";
      if (rtl ? clientX <= bounds.right + 2 : clientX >= bounds.left - 2)
        return;
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
      doc.removeEventListener("pointermove", handlePointerMove);
      doc.removeEventListener("touchmove", handleTouchMove);
      doc.removeEventListener("pointerup", stop);
      doc.removeEventListener("pointercancel", stop);
      doc.removeEventListener("touchend", stop);
      doc.removeEventListener("touchcancel", stop);
      win?.removeEventListener("blur", stop);
      cleanupRef.current = null;
    };
    cleanupRef.current = stop;
    doc.addEventListener("pointermove", handlePointerMove);
    doc.addEventListener("touchmove", handleTouchMove, {
      passive: true,
    });
    doc.addEventListener("pointerup", stop);
    doc.addEventListener("pointercancel", stop);
    doc.addEventListener("touchend", stop);
    doc.addEventListener("touchcancel", stop);
    win?.addEventListener("blur", stop);
  };
  return {
    open: enabled && open,
    start,
  };
}
export function Slider({
  className,
  variant = "standard",
  size = "default",
  markerValue,
  trackAppearance = "neutral",
  thumbSize = 16,
  visualMin,
  ticks,
  minBoundaryMessage,
  thumbProps,
  value,
  defaultValue,
  orientation = "horizontal",
  ...props
}) {
  const values = value ?? defaultValue ?? 0;
  const count = Array.isArray(values) ? values.length : 1;
  const appearance =
    count > 1 || orientation === "vertical" ? "standard" : variant;
  const min = props.min ?? 0;
  const max = props.max ?? 100;
  const axisMin =
    appearance === "filled" &&
    typeof visualMin === "number" &&
    Number.isFinite(visualMin) &&
    visualMin < min &&
    max >= min
      ? visualMin
      : min;
  const offset = max > min ? (min - axisMin) / (max - axisMin) : 0;
  const boundaryHint = useSliderBoundaryHint(
    offset > 0 && !props.disabled && Boolean(minBoundaryMessage),
    `${min}:${max}:${axisMin}:${minBoundaryMessage ?? ""}`,
  );
  const {
    className: thumbClassName,
    style: thumbStyle,
    ...otherThumbProps
  } = thumbProps ?? {};
  const isLockedPrefix = (root, target, clientX) => {
    if (
      offset <= 0 ||
      !(target instanceof Element) ||
      target.closest('[data-slot="slider-thumb"]')
    )
      return false;
    const bounds = root
      .querySelector('[data-slot="slider-control"]')
      ?.getBoundingClientRect();
    const rtl = getComputedStyle(root).direction === "rtl";
    return (
      bounds !== void 0 &&
      (rtl ? clientX > bounds.right : clientX < bounds.left)
    );
  };
  const slider = (
    <SliderRoot
      {...props}
      value={value}
      defaultValue={defaultValue}
      orientation={orientation}
      data-orientation={orientation}
      data-slot="slider"
      data-variant={appearance}
      data-size={size}
      data-track-appearance={
        appearance === "rounded" ? trackAppearance : void 0
      }
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
        const touch = event.touches[0];
        if (
          touch &&
          isLockedPrefix(event.currentTarget, event.target, touch.clientX)
        ) {
          event.stopPropagation();
          return;
        }
        if (event.touches.length === 1) boundaryHint.start(event.currentTarget);
        props.onTouchStartCapture?.(event);
      }}
      className={(state) =>
        cn(
          "hilo-slider w-full min-w-0",
          typeof className === "function" ? className(state) : className,
        )
      }
    >
      <SliderControl
        className="hilo-slider__control"
        data-slot="slider-control"
        style={
          offset > 0
            ? {
                marginInlineStart: `${offset * 100}%`,
              }
            : void 0
        }
      >
        <SliderTrack
          className="hilo-slider__track"
          data-slot="slider-track"
          style={
            offset > 0
              ? {
                  width: `${100 / (1 - offset)}%`,
                  marginInlineStart: `${(-offset / (1 - offset)) * 100}%`,
                  flexShrink: 0,
                }
              : void 0
          }
        >
          {appearance === "rounded" &&
            markerValue !== void 0 &&
            Number.isFinite(markerValue) &&
            max > min &&
            markerValue >= min &&
            markerValue <= max && (
              <span
                aria-hidden="true"
                className="hilo-slider__marker"
                data-slot="slider-marker"
                style={{
                  insetInlineStart: `${((markerValue - min) / (max - min)) * 100}%`,
                }}
              />
            )}
          <SliderIndicator
            className="hilo-slider__indicator"
            data-slot="slider-range"
            style={
              axisMin < min
                ? (state) => ({
                    width: `${Math.min(100, Math.max(0, ((state.values[0] - axisMin) / (max - axisMin)) * 100))}%`,
                  })
                : void 0
            }
          />
          {appearance === "filled" &&
            [...new Set(ticks)]
              .filter(
                (tick) =>
                  Number.isFinite(tick) && tick > axisMin && tick < max,
              )
              .map((tick) => (
                <span
                  key={tick}
                  aria-hidden="true"
                  className="hilo-slider__tick"
                  data-slot="slider-tick"
                  style={{
                    insetInlineStart: `${((tick - axisMin) / (max - axisMin)) * 100}%`,
                  }}
                />
              ))}
        </SliderTrack>
        {Array.from(
          {
            length: count,
          },
          (_unusedArg, index) =>
            reactExports.createElement(SliderThumb, {
              ...otherThumbProps,
              key: index,
              index,
              "aria-label":
                otherThumbProps["aria-label"] ?? props["aria-label"],
              "aria-labelledby":
                otherThumbProps["aria-labelledby"] ?? props["aria-labelledby"],
              "aria-describedby":
                otherThumbProps["aria-describedby"] ??
                props["aria-describedby"],
              "data-slot": "slider-thumb",
              "data-action-ui-id":
                otherThumbProps["data-action-ui-id"] ?? "slider.thumb",
              className: (state) =>
                cn(
                  "hilo-slider__thumb",
                  typeof thumbClassName === "function"
                    ? thumbClassName(state)
                    : thumbClassName,
                ),
              style: (state) => ({
                ...(appearance === "filled"
                  ? {
                      insetInlineStart: `clamp(${offset > 0 ? -4 : 4}px, calc(${max === min && axisMin < min ? 100 : ((state.values[0] - state.min) / (state.max - state.min || 1)) * 100}% - 4px), calc(100% - 4px))`,
                    }
                  : {}),
                ...(typeof thumbStyle === "function"
                  ? thumbStyle(state)
                  : thumbStyle),
              }),
            }),
        )}
      </SliderControl>
    </SliderRoot>
  );
  return minBoundaryMessage ? (
    <Tooltip
      content={minBoundaryMessage}
      open={boundaryHint.open}
      closeOnClick={false}
      side="top"
      className="duration-150 data-open:zoom-in-95 data-closed:zoom-out-95 motion-reduce:animate-none"
    >
      {slider}
    </Tooltip>
  ) : (
    slider
  );
}
