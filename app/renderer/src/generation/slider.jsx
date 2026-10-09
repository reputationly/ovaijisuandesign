// slider.jsx
import {
  reactExports,
  SliderControl$1,
  SliderIndicator,
  SliderRoot,
  SliderThumb,
  SliderTrack,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { cn$5 } from "../infra/dialog-content.jsx";
import { Tooltip$1 } from "./missing-asset-card.jsx";

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
  const appearance =
    count2 > 1 || orientation === "vertical" ? "standard" : variant;
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
  const {
    className: thumbClassName,
    style: thumbStyle,
    ...otherThumbProps
  } = thumbProps ?? {};
  const isLockedPrefix = (root2, target, clientX) => {
    if (
      offset2 <= 0 ||
      !(target instanceof Element) ||
      target.closest('[data-slot="slider-thumb"]')
    )
      return false;
    const bounds = root2
      .querySelector('[data-slot="slider-control"]')
      ?.getBoundingClientRect();
    const rtl = getComputedStyle(root2).direction === "rtl";
    return (
      bounds !== void 0 &&
      (rtl ? clientX > bounds.right : clientX < bounds.left)
    );
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
        const touch2 = event.touches[0];
        if (
          touch2 &&
          isLockedPrefix(event.currentTarget, event.target, touch2.clientX)
        ) {
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
              .filter(
                (tick) =>
                  Number.isFinite(tick) && tick > axisMin && tick < max2,
              )
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
              className: (state2) =>
                cn$5(
                  "hilo-slider__thumb",
                  typeof thumbClassName === "function"
                    ? thumbClassName(state2)
                    : thumbClassName,
                ),
              style: (state2) => ({
                ...(appearance === "filled"
                  ? {
                      insetInlineStart: `clamp(${offset2 > 0 ? -4 : 4}px, calc(${max2 === min2 && axisMin < min2 ? 100 : ((state2.values[0] - state2.min) / (state2.max - state2.min || 1)) * 100}% - 4px), calc(100% - 4px))`,
                    }
                  : {}),
                ...(typeof thumbStyle === "function"
                  ? thumbStyle(state2)
                  : thumbStyle),
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
