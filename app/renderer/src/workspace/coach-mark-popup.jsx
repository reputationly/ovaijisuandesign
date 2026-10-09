// coach-mark-popup.jsx
import {
  jsxRuntimeExports,
  Loader2,
  PopoverPopup,
  PopoverPortal,
  PopoverPositioner,
  PopoverRoot,
  reactDomExports,
  reactExports,
  useTranslation,
  X$7,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { cn$2 } from "../infra/dialog-content.jsx";

function extractDominantColor(img) {
  try {
    const w3 = img.naturalWidth || img.width;
    const h2 = img.naturalHeight || img.height;
    if (!w3 || !h2) return null;
    const canvas = document.createElement("canvas");
    canvas.width = w3;
    canvas.height = h2;
    const ctx = canvas.getContext("2d", {
      willReadFrequently: false,
    });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0);
    const { data: data2 } = ctx.getImageData(0, 0, w3, h2);
    const buckets2 = new Map();
    for (let i2 = 0; i2 < data2.length; i2 += 4) {
      if ((data2[i2 + 3] ?? 0) < 200) continue;
      const r2 = data2[i2] ?? 0;
      const g2 = data2[i2 + 1] ?? 0;
      const b3 = data2[i2 + 2] ?? 0;
      const key2 = `${r2 >> 4}-${g2 >> 4}-${b3 >> 4}`;
      const cur = buckets2.get(key2);
      if (cur) {
        cur.r += r2;
        cur.g += g2;
        cur.b += b3;
        cur.count += 1;
      } else {
        buckets2.set(key2, {
          r: r2,
          g: g2,
          b: b3,
          count: 1,
        });
      }
    }
    let winner = null;
    for (const bucket of buckets2.values()) {
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
  const top2 = Math.min(
    Math.max(anchorCenterY - popupRect.top - ARROW_SIZE / 2, ARROW_INSET),
    maxTop,
  );
  if (side === "top" || side === "bottom")
    return {
      left,
    };
  return {
    top: top2,
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
    const r2 = el.getBoundingClientRect();
    setRect({
      top: r2.top,
      left: r2.left,
      width: r2.width,
      height: r2.height,
    });
  }, [anchorRef]);
  reactExports.useEffect(() => {
    const el = anchorRef.current;
    measure();
    let ro;
    if (el) {
      ro = new ResizeObserver(measure);
      ro.observe(el);
    }
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      ro?.disconnect();
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
  children: children2,
}) {
  const { t: t2 } = useTranslation();
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
    for (const url2 of preloadUrls) {
      if (!url2) continue;
      const img = new Image();
      img.src = url2;
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
    const frame2 = requestAnimationFrame(updateArrowStyle);
    const anchor = anchorEl ?? anchorRef.current;
    const popup = popupRef.current;
    const observer2 = new ResizeObserver(updateArrowStyle);
    if (anchor) observer2.observe(anchor);
    if (popup) observer2.observe(popup);
    window.addEventListener("resize", updateArrowStyle);
    window.addEventListener("scroll", updateArrowStyle, true);
    return () => {
      cancelAnimationFrame(frame2);
      observer2.disconnect();
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
              className={cn$2(
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
                  className={cn$2(
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
                        onLoad={(e2) => {
                          if (mediaBgColor) return;
                          const color2 = extractDominantColor(e2.currentTarget);
                          if (color2) setMediaBgColor(color2);
                        }}
                      />
                    )
                  ) : (
                    <span>
                      {t2("coachMark.mediaPlaceholder", "媒体占位（待补图）")}
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
                  aria-label={t2("common.close")}
                  onClick={() => onDismiss("close")}
                >
                  <X$7 size={14} strokeWidth={1.75} />
                </button>
              )}
              <div className="cm-content">
                <p className="cm-title">{title}</p>
                <p className="cm-desc">{description}</p>
                {children2}
                <div
                  className={cn$2(
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
                        (_2, i2) => (
                          <span
                            key={i2}
                            className={cn$2(
                              "cm-step",
                              i2 < stepCurrent && "is-active",
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
                        aria-label={t2("common.close")}
                        data-action-ui-id={
                          actionUiId ? `${actionUiId}-left-close` : void 0
                        }
                        disabled={ctaLoading}
                        onClick={() => onDismiss("close")}
                      >
                        <X$7 size={16} strokeWidth={2} />
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
                      {ctaLabel ?? t2("coachMark.gotIt", "Got it")}
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
