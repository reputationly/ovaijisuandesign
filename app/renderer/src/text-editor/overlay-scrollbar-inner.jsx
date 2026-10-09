// overlay-scrollbar-inner.jsx
import { reactExports } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";

const MIN_THUMB_PX = 24;

const TRACK_THICKNESS = 10;

const EDGE_GAP = 3;

function OverlayScrollbarInner({
  targetRef,
  orientation,
  placement = "overlay",
}) {
  const horizontal = orientation === "horizontal";
  const sticky = horizontal && placement === "sticky";
  const [metrics, setMetrics] = reactExports.useState(null);
  const [dragging, setDragging] = reactExports.useState(false);
  const activeDragRef = reactExports.useRef(null);
  const cleanupActiveDrag = reactExports.useCallback((updateDraggingState) => {
    const activeDrag = activeDragRef.current;
    if (!activeDrag) return;
    window.removeEventListener("pointermove", activeDrag.onMove);
    window.removeEventListener("pointerup", activeDrag.onEnd);
    window.removeEventListener("pointercancel", activeDrag.onEnd);
    document.body.style.userSelect = activeDrag.previousUserSelect;
    activeDragRef.current = null;
    if (updateDraggingState) setDragging(false);
  }, []);
  reactExports.useEffect(
    () => () => cleanupActiveDrag(false),
    [cleanupActiveDrag],
  );
  const measure = reactExports.useCallback(() => {
    const el = targetRef.current;
    if (!el) return;
    const client2 = horizontal ? el.clientWidth : el.clientHeight;
    const scrollSize = horizontal ? el.scrollWidth : el.scrollHeight;
    if (scrollSize <= client2 + 1) {
      setMetrics(null);
      return;
    }
    const trackPx = client2 - EDGE_GAP * 2 - TRACK_THICKNESS;
    const thumbPx = Math.max(
      MIN_THUMB_PX,
      Math.round((client2 / scrollSize) * trackPx),
    );
    const maxOffset2 = trackPx - thumbPx;
    const maxScroll = scrollSize - client2;
    const scrollPos = horizontal ? el.scrollLeft : el.scrollTop;
    const offsetPx = maxScroll > 0 ? (scrollPos / maxScroll) * maxOffset2 : 0;
    setMetrics((prev) =>
      prev &&
      prev.trackPx === trackPx &&
      prev.thumbPx === thumbPx &&
      prev.offsetPx === offsetPx
        ? prev
        : {
            trackPx,
            thumbPx,
            offsetPx,
          },
    );
  }, [targetRef, horizontal]);
  reactExports.useEffect(() => {
    const el = targetRef.current;
    if (!el) return;
    const onScroll = () => measure();
    el.addEventListener("scroll", onScroll, {
      passive: true,
    });
    return () => el.removeEventListener("scroll", onScroll);
  }, [targetRef, measure]);
  reactExports.useEffect(() => {
    const el = targetRef.current;
    if (!el) return;
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => ro.disconnect();
  }, [targetRef, measure]);
  const beginThumbDrag = reactExports.useCallback(
    (e2) => {
      e2.preventDefault();
      e2.stopPropagation();
      if (e2.button !== 0) return;
      const el = targetRef.current;
      if (!el || !metrics) return;
      const startPos = horizontal ? e2.clientX : e2.clientY;
      const startScroll = horizontal ? el.scrollLeft : el.scrollTop;
      const client2 = horizontal ? el.clientWidth : el.clientHeight;
      const scrollSize = horizontal ? el.scrollWidth : el.scrollHeight;
      const maxScroll = scrollSize - client2;
      const maxOffset2 = metrics.trackPx - metrics.thumbPx;
      cleanupActiveDrag(false);
      setDragging(true);
      const previousUserSelect = document.body.style.userSelect;
      document.body.style.userSelect = "none";
      const onMove = (ev) => {
        if (maxOffset2 <= 0) return;
        const delta = (horizontal ? ev.clientX : ev.clientY) - startPos;
        const next2 = startScroll + (delta / maxOffset2) * maxScroll;
        if (horizontal) el.scrollLeft = next2;
        else el.scrollTop = next2;
      };
      const onEnd = () => cleanupActiveDrag(true);
      activeDragRef.current = {
        onMove,
        onEnd,
        previousUserSelect,
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onEnd);
      window.addEventListener("pointercancel", onEnd);
    },
    [targetRef, metrics, horizontal, cleanupActiveDrag],
  );
  const handleTrackPointerDown = reactExports.useCallback(
    (e2) => {
      if (e2.button !== 0) return;
      e2.preventDefault();
      e2.stopPropagation();
      const el = targetRef.current;
      if (!el || !metrics) return;
      const rect = e2.currentTarget.getBoundingClientRect();
      const clickPos = horizontal
        ? e2.clientX - rect.left
        : e2.clientY - rect.top;
      const maxOffset2 = metrics.trackPx - metrics.thumbPx;
      if (maxOffset2 <= 0) return;
      const client2 = horizontal ? el.clientWidth : el.clientHeight;
      const scrollSize = horizontal ? el.scrollWidth : el.scrollHeight;
      const targetOffset = Math.max(
        0,
        Math.min(maxOffset2, clickPos - metrics.thumbPx / 2),
      );
      const next2 = (targetOffset / maxOffset2) * (scrollSize - client2);
      if (horizontal) el.scrollLeft = next2;
      else el.scrollTop = next2;
    },
    [targetRef, metrics, horizontal],
  );
  if (!metrics) return null;
  const trackStyle = horizontal
    ? sticky
      ? {
          width: `calc(100% - ${EDGE_GAP * 2 + TRACK_THICKNESS}px)`,
          marginLeft: EDGE_GAP,
          bottom: 0,
          height: TRACK_THICKNESS,
        }
      : {
          left: EDGE_GAP,
          right: EDGE_GAP + TRACK_THICKNESS,
          bottom: 0,
          height: TRACK_THICKNESS,
        }
    : {
        top: EDGE_GAP,
        bottom: EDGE_GAP + TRACK_THICKNESS,
        right: 0,
        width: TRACK_THICKNESS,
      };
  const thumbStyle = horizontal
    ? {
        width: metrics.thumbPx,
        height: 6,
        transform: `translateX(${metrics.offsetPx}px)`,
      }
    : {
        height: metrics.thumbPx,
        width: 6,
        transform: `translateY(${metrics.offsetPx}px)`,
      };
  return (
    // Pointer-only affordance mirroring a native scrollbar; keyboard users
    // scroll the container directly (arrow / PageUp / PageDown still work).
    <div
      aria-hidden="true"
      contentEditable={false}
      onPointerDown={handleTrackPointerDown}
      className={`hilo-overlay-scrollbar-track ${sticky ? "sticky" : "absolute"} z-30 flex select-none`}
      data-orientation={orientation}
      data-placement={sticky ? "sticky" : "overlay"}
      style={{
        ...trackStyle,
        ...(sticky
          ? {
              background: "var(--canvas-node-bg, #fff)",
            }
          : {}),
        alignItems: horizontal ? "flex-end" : "center",
        justifyContent: horizontal ? "flex-start" : "flex-end",
        flexDirection: horizontal ? "row" : "column",
        pointerEvents: "auto",
      }}
    >
      <div
        onPointerDown={beginThumbDrag}
        className={`hilo-overlay-scrollbar-thumb rounded-full ${dragging ? "dragging" : ""}`}
        style={{
          ...thumbStyle,
          marginBottom: horizontal ? 2 : 0,
          marginRight: horizontal ? 0 : 2,
        }}
      />
    </div>
  );
}

export const OverlayScrollbar = reactExports.memo(OverlayScrollbarInner);
