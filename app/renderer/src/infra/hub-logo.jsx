// hub-logo.jsx
import { reactExports } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { cn$2 } from "./dialog-content.jsx";

const WINK_DURATION_MS = 560;

const BLINK_DURATION_MS = 240;

const BLINK_DELAY_MIN_MS = 2600;

const BLINK_DELAY_RANGE_MS = 1300;

const BLINK_COUNT = 2;

const MOTION_ATTRIBUTE = "data-hub-logo-motion";

function prefersReducedMotion$1() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function setMotion(elements, motion) {
  for (const element2 of elements) {
    if (!element2) continue;
    element2.removeAttribute(MOTION_ATTRIBUTE);
    void element2.getBoundingClientRect();
    element2.setAttribute(MOTION_ATTRIBUTE, motion);
  }
}

function clearMotion(elements) {
  for (const element2 of elements) {
    element2?.removeAttribute(MOTION_ATTRIBUTE);
  }
}

function useHubLogoHoverAnimation({ enabled, leftEyeRef, rightEyeRef }) {
  const activeRef = reactExports.useRef(false);
  const timersRef = reactExports.useRef(new Set());
  const schedule2 = reactExports.useCallback((callback, delayMs) => {
    const timerId = window.setTimeout(() => {
      timersRef.current.delete(timerId);
      callback();
    }, delayMs);
    timersRef.current.add(timerId);
  }, []);
  const reset2 = reactExports.useCallback(() => {
    for (const timerId of timersRef.current) {
      window.clearTimeout(timerId);
    }
    timersRef.current.clear();
    activeRef.current = false;
    clearMotion([leftEyeRef.current, rightEyeRef.current]);
  }, [leftEyeRef, rightEyeRef]);
  reactExports.useEffect(() => {
    if (!enabled) {
      reset2();
      return reset2;
    }
    const motionQuery =
      typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-reduced-motion: reduce)")
        : null;
    const handleMotionPreferenceChange = (event) => {
      if (event.matches) reset2();
    };
    if (motionQuery?.matches) reset2();
    motionQuery?.addEventListener("change", handleMotionPreferenceChange);
    return () => {
      motionQuery?.removeEventListener("change", handleMotionPreferenceChange);
      reset2();
    };
  }, [enabled, reset2]);
  return reactExports.useCallback(() => {
    if (!enabled || activeRef.current || prefersReducedMotion$1()) return;
    activeRef.current = true;
    setMotion([leftEyeRef.current], "wink");
    schedule2(() => clearMotion([leftEyeRef.current]), WINK_DURATION_MS);
    let blinkCount = 0;
    const scheduleBlink = () => {
      const delayMs = BLINK_DELAY_MIN_MS + Math.random() * BLINK_DELAY_RANGE_MS;
      schedule2(() => {
        const eyes = [leftEyeRef.current, rightEyeRef.current];
        setMotion(eyes, "blink");
        schedule2(() => clearMotion(eyes), BLINK_DURATION_MS);
        blinkCount += 1;
        if (blinkCount < BLINK_COUNT) {
          scheduleBlink();
          return;
        }
        schedule2(() => {
          activeRef.current = false;
        }, BLINK_DURATION_MS);
      }, delayMs);
    };
    scheduleBlink();
  }, [enabled, leftEyeRef, rightEyeRef, schedule2]);
}

const EYE_ROTATION = (28.8202 * Math.PI) / 180;

const EYE_COS = Math.cos(EYE_ROTATION);

const EYE_SIN = Math.sin(EYE_ROTATION);

const EYE_TRAVEL_SCALE = 1.3;

const EYE_TRAVEL_A = (5.58216 - 4.25085) * EYE_TRAVEL_SCALE;

const EYE_TRAVEL_B = (7.06529 - 5.6272) * EYE_TRAVEL_SCALE;

const EYE_RIM_REACH = 0.88;

const EYE_FALLOFF = 26;

const ACTIVE_EASING = 0.1;

const IDLE_EASING = 0.08;

const EYES = [
  {
    centerX: 10.789,
    centerY: 32.0297,
    restX: 10.7172 - 10.789,
    restY: 32.088 - 32.0297,
  },
  {
    centerX: 37.4316,
    centerY: 46.6895,
    restX: 37.3652 - 37.4316,
    restY: 46.7917 - 46.6895,
  },
];

function mix(currentValue, targetValue, factor) {
  return currentValue + (targetValue - currentValue) * factor;
}

function pupilTargetFor(eye, svgX, svgY) {
  const dx = svgX - eye.centerX;
  const dy = svgY - eye.centerY;
  const dist2 = Math.hypot(dx, dy);
  if (dist2 < 1e-3)
    return {
      x: -eye.restX,
      y: -eye.restY,
    };
  const localX = (dx * EYE_COS + dy * EYE_SIN) / dist2;
  const localY = (dy * EYE_COS - dx * EYE_SIN) / dist2;
  const rim =
    1 / Math.sqrt((localX / EYE_TRAVEL_A) ** 2 + (localY / EYE_TRAVEL_B) ** 2);
  const reach = (dist2 / (dist2 + EYE_FALLOFF)) * EYE_RIM_REACH * rim;
  const travelX = localX * reach;
  const travelY = localY * reach;
  return {
    x: travelX * EYE_COS - travelY * EYE_SIN - eye.restX,
    y: travelX * EYE_SIN + travelY * EYE_COS - eye.restY,
  };
}

export function HubLogo({
  size: size2 = 20,
  className,
  alt = "MiniMax Design",
  winkOnHover = false,
  eyeTrackingScope,
  onPointerEnter,
  ...rest
}) {
  const wrapRef = reactExports.useRef(null);
  const svgRef = reactExports.useRef(null);
  const leftPupilRef = reactExports.useRef(null);
  const rightPupilRef = reactExports.useRef(null);
  const leftEyeMotionRef = reactExports.useRef(null);
  const rightEyeMotionRef = reactExports.useRef(null);
  const rafRef = reactExports.useRef(0);
  const pointerInsideRef = reactExports.useRef(false);
  const currentRef = reactExports.useRef(
    EYES.map(() => ({
      x: 0,
      y: 0,
    })),
  ).current;
  const targetRef = reactExports.useRef(
    EYES.map(() => ({
      x: 0,
      y: 0,
    })),
  ).current;
  const pupilRefs = reactExports.useRef([leftPupilRef, rightPupilRef]).current;
  const idPrefix = reactExports.useId().replace(/:/g, "");
  const maskId = `${idPrefix}-hub-logo-clip`;
  const leftEyeClipId = `${idPrefix}-hub-logo-left-eye-clip`;
  const rightEyeClipId = `${idPrefix}-hub-logo-right-eye-clip`;
  const render2 = reactExports.useCallback(() => {
    rafRef.current = 0;
    const easing = pointerInsideRef.current ? ACTIVE_EASING : IDLE_EASING;
    let settled = true;
    currentRef.forEach((current2, index2) => {
      const target = targetRef[index2];
      current2.x = mix(current2.x, target.x, easing);
      current2.y = mix(current2.y, target.y, easing);
      pupilRefs[index2].current?.setAttribute(
        "transform",
        `translate(${current2.x.toFixed(3)} ${current2.y.toFixed(3)})`,
      );
      if (
        Math.abs(target.x - current2.x) > 0.02 ||
        Math.abs(target.y - current2.y) > 0.02
      ) {
        settled = false;
      }
    });
    if (!settled) {
      rafRef.current = window.requestAnimationFrame(render2);
    }
  }, [currentRef, pupilRefs, targetRef]);
  const schedule2 = reactExports.useCallback(() => {
    if (!rafRef.current) rafRef.current = window.requestAnimationFrame(render2);
  }, [render2]);
  const playHoverAnimation = useHubLogoHoverAnimation({
    enabled: winkOnHover,
    leftEyeRef: leftEyeMotionRef,
    rightEyeRef: rightEyeMotionRef,
  });
  const handlePointerEnter = reactExports.useCallback(
    (event) => {
      onPointerEnter?.(event);
      playHoverAnimation();
    },
    [onPointerEnter, playHoverAnimation],
  );
  reactExports.useEffect(() => {
    const motionQuery =
      typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-reduced-motion: reduce)")
        : null;
    const resetEyes = () => {
      pointerInsideRef.current = false;
      targetRef.forEach((target) => {
        target.x = 0;
        target.y = 0;
      });
      schedule2();
    };
    const resetEyesImmediately = () => {
      pointerInsideRef.current = false;
      if (rafRef.current) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
      EYES.forEach((_eye, index2) => {
        currentRef[index2].x = 0;
        currentRef[index2].y = 0;
        targetRef[index2].x = 0;
        targetRef[index2].y = 0;
        pupilRefs[index2].current?.removeAttribute("transform");
      });
    };
    const closestTrackingScope = eyeTrackingScope
      ? wrapRef.current?.closest(eyeTrackingScope)
      : null;
    const trackingScope =
      closestTrackingScope instanceof HTMLElement ? closestTrackingScope : null;
    const handlePointerMove = (e2) => {
      if (motionQuery?.matches) {
        resetEyesImmediately();
        return;
      }
      pointerInsideRef.current = true;
      const ctm = svgRef.current?.getScreenCTM();
      if (!ctm) return;
      const svgPoint = new DOMPoint(e2.clientX, e2.clientY).matrixTransform(
        ctm.inverse(),
      );
      EYES.forEach((eye, index2) => {
        const target = pupilTargetFor(eye, svgPoint.x, svgPoint.y);
        targetRef[index2].x = target.x;
        targetRef[index2].y = target.y;
      });
      schedule2();
    };
    const handleMotionPreferenceChange = (event) => {
      if (event.matches) resetEyesImmediately();
    };
    if (trackingScope) {
      trackingScope.addEventListener("pointermove", handlePointerMove, {
        passive: true,
      });
      trackingScope.addEventListener("pointerleave", resetEyesImmediately);
      document.documentElement.addEventListener("pointerleave", resetEyes);
      window.addEventListener("blur", resetEyes);
      motionQuery?.addEventListener("change", handleMotionPreferenceChange);
    }
    return () => {
      if (trackingScope) {
        trackingScope.removeEventListener("pointermove", handlePointerMove);
        trackingScope.removeEventListener("pointerleave", resetEyesImmediately);
        document.documentElement.removeEventListener("pointerleave", resetEyes);
        window.removeEventListener("blur", resetEyes);
        motionQuery?.removeEventListener(
          "change",
          handleMotionPreferenceChange,
        );
      }
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
    };
  }, [currentRef, eyeTrackingScope, pupilRefs, schedule2, targetRef]);
  return (
    <span
      ref={wrapRef}
      role="img"
      aria-label={alt}
      className={cn$2("inline-flex shrink-0 text-foreground", className)}
      style={{
        width: size2,
        height: size2,
      }}
      onPointerEnter={handlePointerEnter}
      {...rest}
    >
      <svg
        ref={svgRef}
        viewBox="0 0 58 58"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        width={size2}
        height={size2}
        aria-hidden="true"
      >
        <path
          d="M2.7749 2.77518H55.2244V55.2247H6.73934C4.54984 55.2247 2.7749 53.4497 2.7749 51.2602V2.77518Z"
          fill="#BBBBFE"
          stroke="currentColor"
          strokeWidth="1.18933"
        />
        <rect
          width="5.55021"
          height="5.55021"
          rx="2.77511"
          fill="currentColor"
        />
        <rect
          x="52.4497"
          width="5.55021"
          height="5.55021"
          rx="2.77511"
          fill="currentColor"
        />
        <rect
          x="52.4497"
          y="52.4494"
          width="5.55021"
          height="5.55021"
          rx="2.77511"
          fill="currentColor"
        />
        <mask
          id={maskId}
          style={{
            maskType: "alpha",
          }}
          maskUnits="userSpaceOnUse"
          x="2"
          y="2"
          width="54"
          height="54"
        >
          <path
            d="M2.45801 2.45795H55.2247V55.2246H6.42245C4.23295 55.2246 2.45801 53.4497 2.45801 51.2602V2.45795Z"
            fill="#D9D9D9"
          />
        </mask>
        <clipPath id={leftEyeClipId}>
          <ellipse
            cx="10.789"
            cy="32.0297"
            rx="5.58216"
            ry="7.06529"
            transform="rotate(28.8202 10.789 32.0297)"
          />
        </clipPath>
        <clipPath id={rightEyeClipId}>
          <ellipse
            cx="37.4316"
            cy="46.6895"
            rx="5.58216"
            ry="7.06529"
            transform="rotate(28.8202 37.4316 46.6895)"
          />
        </clipPath>
        <g mask={`url(#${maskId})`}>
          <path
            d="M19.4547 17.0183C19.4547 17.0183 18.5176 12.0551 12.6135 12.8052C9.79697 13.1626 10.0744 15.9838 11.8222 16.228C13.57 16.4721 16.4381 16.3907 15.2559 19.5983"
            fill="black"
          />
          <path
            d="M44.8388 31.0783C44.8388 31.0783 49.5328 29.2134 52.0592 34.6021C53.2649 37.1725 50.7333 38.4482 49.5915 37.1025C48.4498 35.7568 46.9835 33.2906 44.9068 36.006"
            fill="black"
          />
          <path
            d="M4.67629 26.3061C0.480435 32.3936 1.86134 38.9911 3.07627 41.5288C0.350103 42.3787 -3.27708 47.0208 -1.09406 50.5403C2.11247 55.7099 7.61026 54.6313 9.95833 53.4459C9.42368 55.0585 9.21126 58.8049 12.6388 60.889C16.0663 62.973 19.4913 60.7631 20.7754 59.3976C21.1886 62.1924 23.2129 67.5358 28.0049 66.5509C32.7969 65.566 33.7955 60.6907 33.6958 58.3761C36.2888 58.7368 41.6626 56.9804 45.6221 48.835C50.5714 38.6531 45.5859 28.7277 43.3486 25.8522C39.9308 21.4597 32.9665 16.9414 25.8961 16.2496C18.8258 15.5578 9.9211 18.6966 4.67629 26.3061Z"
            fill="black"
          />
          <ellipse
            cx="10.789"
            cy="32.0297"
            rx="5.58216"
            ry="7.06529"
            transform="rotate(28.8202 10.789 32.0297)"
            fill="white"
          />
          <g clipPath={`url(#${leftEyeClipId})`}>
            <g ref={leftPupilRef}>
              <g
                ref={leftEyeMotionRef}
                className="hub-logo-eye-motion"
                data-hub-logo-eye="left"
              >
                <ellipse
                  cx="10.7172"
                  cy="32.088"
                  rx="4.25085"
                  ry="5.6272"
                  transform="rotate(28.8202 10.7172 32.088)"
                  fill="black"
                />
                <ellipse
                  data-hub-logo-highlight={true}
                  cx="12.8002"
                  cy="29.7414"
                  rx="0.914104"
                  ry="0.974875"
                  transform="rotate(28.8202 12.8002 29.7414)"
                  fill="white"
                />
              </g>
            </g>
          </g>
          <ellipse
            cx="37.4316"
            cy="46.6895"
            rx="5.58216"
            ry="7.06529"
            transform="rotate(28.8202 37.4316 46.6895)"
            fill="white"
          />
          <g clipPath={`url(#${rightEyeClipId})`}>
            <g ref={rightPupilRef}>
              <g
                ref={rightEyeMotionRef}
                className="hub-logo-eye-motion"
                data-hub-logo-eye="right"
              >
                <ellipse
                  cx="37.3652"
                  cy="46.7917"
                  rx="4.25085"
                  ry="5.6272"
                  transform="rotate(28.8202 37.3652 46.7917)"
                  fill="black"
                />
                <ellipse
                  data-hub-logo-highlight={true}
                  cx="39.0336"
                  cy="44.1327"
                  rx="0.914104"
                  ry="0.974875"
                  transform="rotate(28.8202 39.0336 44.1327)"
                  fill="white"
                />
              </g>
            </g>
          </g>
        </g>
        <rect
          x="4.91553"
          y="52.4494"
          width="5.23306"
          height="2.77511"
          fill="black"
        />
        <path
          d="M2.7749 2.77518H55.2244V55.2247H6.73934C4.54984 55.2247 2.7749 53.4497 2.7749 51.2602V2.77518Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.18933"
        />
      </svg>
    </span>
  );
}
