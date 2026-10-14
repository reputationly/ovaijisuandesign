// coach-mark-popup.jsx
import jsxRuntimeExports from "react/jsx-runtime";
import reactDomExports from "react-dom";
import reactExports from "react";
import { useTranslation } from "react-i18next";
import { Loader2, X$7 as CloseIcon } from "../media-editing/lucide-icon-wraps.js";
import { PopoverPopup, PopoverPortal, PopoverPositioner, PopoverRoot } from "../infra/base-ui.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { mergeTailwindClasses as cn } from "../infra/dialog-content.jsx";
function extractDominantColor(img) {
  try {
    const imageWidth = img.naturalWidth || img.width;
    const imageHeight = img.naturalHeight || img.height;
    if (!imageWidth || !imageHeight) return null;
    const canvas = document.createElement("canvas");
    canvas.width = imageWidth;
    canvas.height = imageHeight;
    const ctx = canvas.getContext("2d", {
      willReadFrequently: false,
    });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0);
    const { data } = ctx.getImageData(0, 0, imageWidth, imageHeight);
    const buckets = new Map();
    for (let pixelOffset = 0; pixelOffset < data.length; pixelOffset += 4) {
      if ((data[pixelOffset + 3] ?? 0) < 200) continue;
      const red = data[pixelOffset] ?? 0;
      const green = data[pixelOffset + 1] ?? 0;
      const blue = data[pixelOffset + 2] ?? 0;
      const bucketKey = `${red >> 4}-${green >> 4}-${blue >> 4}`;
      const colorBucket = buckets.get(bucketKey);
      if (colorBucket) {
        colorBucket.r += red;
        colorBucket.g += green;
        colorBucket.b += blue;
        colorBucket.count += 1;
      } else {
        buckets.set(bucketKey, {
          r: red,
          g: green,
          b: blue,
          count: 1,
        });
      }
    }
    let winner = null;
    for (const bucket of buckets.values()) {
      if (!winner || bucket.count > winner.count) winner = bucket;
    }
    if (!winner) return null;
    return `rgb(${Math.round(winner.r / winner.count)}, ${Math.round(winner.g / winner.count)}, ${Math.round(winner.b / winner.count)})`;
  } catch {
    return null;
  }
}
const ARROW_SIZE = 12;
const ARROW_INSET = 16;
function getArrowStyle(side, anchorRect, popupRect) {
  const anchorCenterX = anchorRect.left + anchorRect.width / 2;
  const anchorCenterY = anchorRect.top + anchorRect.height / 2;
  const maxLeft = Math.max(
    ARROW_INSET,
    popupRect.width - ARROW_INSET - ARROW_SIZE,
  );
  const maxTop = Math.max(
    ARROW_INSET,
    popupRect.height - ARROW_INSET - ARROW_SIZE,
  );
  const left = Math.min(
    Math.max(anchorCenterX - popupRect.left - ARROW_SIZE / 2, ARROW_INSET),
    maxLeft,
  );
  const arrowTop = Math.min(
    Math.max(anchorCenterY - popupRect.top - ARROW_SIZE / 2, ARROW_INSET),
    maxTop,
  );
  if (side === "top" || side === "bottom")
    return {
      left,
    };
  return {
    top: arrowTop,
  };
}
const ARROW_CLASS = {
  // side = where the bubble sits relative to the anchor → arrow points back at anchor.
  bottom: "cm-arrow cm-arrow--up",
  top: "cm-arrow cm-arrow--down",
  right: "cm-arrow cm-arrow--left",
  left: "cm-arrow cm-arrow--right",
};
function SpotlightMask({ anchorRef, padding, onClickOutside }) {
  const [rect, setRect] = reactExports.useState(null);
  const measure = reactExports.useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const anchorRect = el.getBoundingClientRect();
    setRect({
      top: anchorRect.top,
      left: anchorRect.left,
      width: anchorRect.width,
      height: anchorRect.height,
    });
  }, [anchorRef]);
  reactExports.useEffect(() => {
    const el = anchorRef.current;
    measure();
    let resizeObserver;
    if (el) {
      resizeObserver = new ResizeObserver(measure);
      resizeObserver.observe(el);
    }
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [anchorRef, measure]);
  if (!rect) return null;
  return reactDomExports.createPortal(
    <button
      type="button"
      tabIndex={-1}
      data-slot="coach-mark-mask"
      onClick={onClickOutside}
      className="fixed inset-0 z-40 cursor-default border-none bg-transparent p-0 motion-safe:animate-in motion-safe:fade-in-0 duration-300"
    >
      <div
        className="absolute rounded-lg"
        style={{
          top: rect.top - padding,
          left: rect.left - padding,
          width: rect.width + padding * 2,
          height: rect.height + padding * 2,
          boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.5)",
          pointerEvents: "none",
        }}
      />
    </button>,
    document.body,
  );
}
export function CoachMarkPopup({
  open,
  onDismiss,
  title,
  description,
  anchorRef,
  anchorEl,
  side = "bottom",
  sideOffset = 10,
  align = "start",
  ctaLabel,
  ctaLoading = false,
  spotlightPadding = 4,
  showSpotlight = false,
  showClose = false,
  showLeftClose = false,
  media,
  preloadUrls,
  hideArrow = false,
  stepCurrent,
  stepTotal,
  actionUiId,
  onPointerEnter,
  onPointerLeave,
  children,
}) {
  const { t: translate } = useTranslation();
  const popupRef = reactExports.useRef(null);
  const [arrowStyle, setArrowStyle] = reactExports.useState(null);
  const [renderedSide, setRenderedSide] = reactExports.useState(side);
  const [mediaError, setMediaError] = reactExports.useState(false);
  const [mediaBgColor, setMediaBgColor] = reactExports.useState(media?.bgColor);
  const [lastMediaUrl, setLastMediaUrl] = reactExports.useState(media?.url);
  if (media?.url !== lastMediaUrl) {
    setLastMediaUrl(media?.url);
    setMediaError(false);
    setMediaBgColor(media?.bgColor);
  }
  reactExports.useEffect(() => {
    if (!open || !preloadUrls?.length) return;
    for (const url of preloadUrls) {
      if (!url) continue;
      const image = new Image();
      image.src = url;
    }
  }, [open, preloadUrls]);
  const updateArrowStyle = reactExports.useCallback(() => {
    const anchor = anchorEl ?? anchorRef.current;
    const popup = popupRef.current;
    if (!anchor || !popup) return;
    const actualSide = popup.parentElement?.getAttribute("data-side") ?? side;
    setRenderedSide(actualSide);
    setArrowStyle(
      getArrowStyle(
        actualSide,
        anchor.getBoundingClientRect(),
        popup.getBoundingClientRect(),
      ),
    );
  }, [anchorRef, anchorEl, side]);
  reactExports.useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(updateArrowStyle);
    const anchor = anchorEl ?? anchorRef.current;
    const popup = popupRef.current;
    const observer = new ResizeObserver(updateArrowStyle);
    if (anchor) observer.observe(anchor);
    if (popup) observer.observe(popup);
    window.addEventListener("resize", updateArrowStyle);
    window.addEventListener("scroll", updateArrowStyle, true);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", updateArrowStyle);
      window.removeEventListener("scroll", updateArrowStyle, true);
    };
  }, [anchorRef, anchorEl, open, updateArrowStyle]);
  if (anchorEl === null) return null;
  const hasMedia = media !== void 0;
  const hasSteps = Boolean(stepCurrent && stepTotal && stepTotal > 1);
  return (
    <>
      {open && showSpotlight && (
        <SpotlightMask
          anchorRef={anchorRef}
          padding={spotlightPadding}
          onClickOutside={() => onDismiss("close")}
        />
      )}
      <PopoverRoot open={open}>
        <PopoverPortal>
          <PopoverPositioner
            side={side}
            sideOffset={sideOffset}
            align={align}
            anchor={anchorEl ?? anchorRef}
            className="isolate z-50"
          >
            <PopoverPopup
              ref={popupRef}
              onAnimationEnd={updateArrowStyle}
              onTransitionEnd={updateArrowStyle}
              data-slot="coach-mark"
              data-action-ui-id={actionUiId}
              onPointerEnter={onPointerEnter}
              onPointerLeave={onPointerLeave}
              className={cn(
                "cm overflow-visible",
                hasMedia && "cm--with-media",
                // Enter (`data-open`) is snappy at 200ms; exit (`data-closed`)
                // is a soft 1s fade so timeout dismissal feels gentle rather
                // than a snap. ease-out keeps the early part of the exit
                // expressive and the tail subtle.
                "origin-(--transform-origin) duration-200 data-closed:duration-1000 data-closed:ease-out",
                // Enter animation: fade + zoom + slide in from the anchored
                // edge. The exit animation deliberately only fades — no zoom,
                // no slide — so the bubble dissolves in place without any
                // size or position shift.
                "motion-safe:data-open:animate-in motion-safe:data-open:fade-in-0 motion-safe:data-open:zoom-in-95",
                "motion-safe:data-closed:animate-out motion-safe:data-closed:fade-out-0",
                "motion-safe:data-[side=bottom]:data-open:slide-in-from-top-2 motion-safe:data-[side=top]:data-open:slide-in-from-bottom-2",
                "motion-safe:data-[side=left]:data-open:slide-in-from-right-2 motion-safe:data-[side=right]:data-open:slide-in-from-left-2",
              )}
            >
              {hasMedia && (
                <div
                  className={cn(
                    "cm-media",
                    (!media?.url || mediaError) && "cm-media--placeholder",
                  )}
                  style={
                    mediaBgColor
                      ? {
                          backgroundColor: mediaBgColor,
                        }
                      : void 0
                  }
                >
                  {media?.url && !mediaError ? (
                    media.type === "video" ? (
                      <video
                        src={media.url}
                        autoPlay={true}
                        muted={true}
                        loop={true}
                        playsInline={true}
                        onError={() => setMediaError(true)}
                      >
                        <track kind="captions" />
                      </video>
                    ) : (
                      <img
                        src={media.url}
                        alt=""
                        crossOrigin="anonymous"
                        onError={() => setMediaError(true)}
                        onLoad={(loadEvent) => {
                          if (mediaBgColor) return;
                          const color = extractDominantColor(loadEvent.currentTarget);
                          if (color) setMediaBgColor(color);
                        }}
                      />
                    )
                  ) : (
                    <span>
                      {translate("coachMark.mediaPlaceholder", "媒体占位（待补图）")}
                    </span>
                  )}
                  {(!media?.url || mediaError) && (
                    <div className="cm-media-overlay" />
                  )}
                </div>
              )}
              {showClose && (
                <button
                  type="button"
                  className="cm-close"
                  aria-label={translate("common.close")}
                  onClick={() => onDismiss("close")}
                >
                  <CloseIcon size={14} strokeWidth={1.75} />
                </button>
              )}
              <div className="cm-content">
                <p className="cm-title">{title}</p>
                <p className="cm-desc">{description}</p>
                {children}
                <div
                  className={cn(
                    "cm-footer",
                    hasSteps ? "cm-footer--steps" : "cm-footer--no-steps",
                  )}
                >
                  {hasSteps && (
                    <div className="cm-steps" aria-hidden="true">
                      {Array.from(
                        {
                          length: stepTotal,
                        },
                        (_unusedArg, stepIndex) => (
                          <span
                            key={stepIndex}
                            className={cn(
                              "cm-step",
                              stepIndex < stepCurrent && "is-active",
                            )}
                          />
                        ),
                      )}
                    </div>
                  )}
                  <div className="cm-actions">
                    {showLeftClose && (
                      <button
                        type="button"
                        className="cm-left-close"
                        aria-label={translate("common.close")}
                        data-action-ui-id={
                          actionUiId ? `${actionUiId}-left-close` : void 0
                        }
                        disabled={ctaLoading}
                        onClick={() => onDismiss("close")}
                      >
                        <CloseIcon size={16} strokeWidth={2} />
                      </button>
                    )}
                    <button
                      type="button"
                      className="cm-cta"
                      data-action-ui-id={
                        actionUiId ? `${actionUiId}-cta` : void 0
                      }
                      disabled={ctaLoading}
                      onClick={() => onDismiss("button")}
                    >
                      {ctaLoading && (
                        <Loader2
                          size={12}
                          strokeWidth={1}
                          className="cm-cta-spinner"
                        />
                      )}
                      {ctaLabel ?? translate("coachMark.gotIt", "Got it")}
                    </button>
                  </div>
                </div>
              </div>
              {!hideArrow && (
                <div
                  className={ARROW_CLASS[renderedSide]}
                  style={arrowStyle ?? void 0}
                />
              )}
            </PopoverPopup>
          </PopoverPositioner>
        </PopoverPortal>
      </PopoverRoot>
    </>
  );
}
