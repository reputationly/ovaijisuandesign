// use-history-rail-state.js
import { CHAT_CONTENT_MAX_WIDTH_PX } from "./ae.jsx";
import { reactExports } from "../vendor.js";

const MIN_TURNS_FOR_RAIL = 5;

const RAIL_RESERVED_GUTTER_PX = 48;

const MIN_CONTAINER_WIDTH_PX =
  CHAT_CONTENT_MAX_WIDTH_PX + RAIL_RESERVED_GUTTER_PX * 2;

const COMPACT_RAIL_MIN_CONTAINER_WIDTH_PX = 320;

function resolveHistoryRailMode(containerWidth) {
  if (containerWidth < COMPACT_RAIL_MIN_CONTAINER_WIDTH_PX) return "hidden";
  if (containerWidth < MIN_CONTAINER_WIDTH_PX) return "compact";
  return "full";
}

function shouldShowHistoryRail(containerWidth, turnCount) {
  return (
    resolveHistoryRailMode(containerWidth) !== "hidden" &&
    turnCount >= MIN_TURNS_FOR_RAIL
  );
}

function findActiveTurns(scrollTop, clientHeight, items) {
  if (items.length === 0) return [];
  const viewportBottom = scrollTop + clientHeight;
  const visible = [];
  for (const item of items) {
    if (item.start >= viewportBottom) break;
    if (item.start + item.size > scrollTop) visible.push(item.index);
  }
  if (visible.length > 0) return visible;
  if (viewportBottom <= (items[0]?.start ?? 0)) return [items[0]?.index ?? 0];
  return [items.at(-1)?.index ?? 0];
}

export function useHistoryRailState(options) {
  const {
    scrollRef,
    turnCount,
    virtualItems,
    resetKey,
    enabled = true,
  } = options;
  const [showRail, setShowRail] = reactExports.useState(false);
  const [mode2, setMode] = reactExports.useState("hidden");
  const [activeIndex, setActiveIndex] = reactExports.useState(-1);
  const [activeIndexes, setActiveIndexes] = reactExports.useState([]);
  const rafIdRef = reactExports.useRef(null);
  const virtualItemsRef = reactExports.useRef(virtualItems);
  virtualItemsRef.current = virtualItems;
  const cancelRaf = reactExports.useCallback(() => {
    if (rafIdRef.current != null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
  }, []);
  const recompute = reactExports.useCallback(() => {
    if (!enabled) return;
    if (rafIdRef.current != null) return;
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;
      const el = scrollRef.current;
      if (!el) return;
      const nextMode = resolveHistoryRailMode(el.clientWidth);
      const shouldShow = shouldShowHistoryRail(el.clientWidth, turnCount);
      setShowRail((prev) => (prev === shouldShow ? prev : shouldShow));
      setMode((prev) => {
        const resolved = shouldShow ? nextMode : "hidden";
        return prev === resolved ? prev : resolved;
      });
      if (!shouldShow) return;
      const nextIndexes = findActiveTurns(
        el.scrollTop,
        el.clientHeight,
        virtualItemsRef.current,
      );
      const next2 = nextIndexes.at(-1) ?? -1;
      setActiveIndexes((prev) =>
        prev.length === nextIndexes.length &&
        prev.every((value, index2) => value === nextIndexes[index2])
          ? prev
          : nextIndexes,
      );
      setActiveIndex((prev) => (prev === next2 ? prev : next2));
    });
  }, [scrollRef, turnCount, enabled]);
  reactExports.useEffect(() => {
    if (!enabled) return;
    const el = scrollRef.current;
    if (!el) return;
    recompute();
    const handler = () => recompute();
    el.addEventListener("scroll", handler, {
      passive: true,
    });
    return () => {
      el.removeEventListener("scroll", handler);
      cancelRaf();
    };
  }, [scrollRef, recompute, cancelRaf, enabled]);
  reactExports.useEffect(() => {
    if (!enabled) return;
    const el = scrollRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer2 = new ResizeObserver(() => recompute());
    observer2.observe(el);
    return () => observer2.disconnect();
  }, [scrollRef, recompute, enabled]);
  reactExports.useEffect(() => {
    if (!enabled) return;
    recompute();
  }, [turnCount, virtualItems, recompute, enabled]);
  reactExports.useEffect(() => {
    const lastIndex = turnCount > 0 ? turnCount - 1 : -1;
    setActiveIndex(lastIndex);
    setActiveIndexes(lastIndex >= 0 ? [lastIndex] : []);
  }, [resetKey]);
  return {
    showRail: enabled && showRail,
    mode: enabled ? mode2 : "hidden",
    activeIndex,
    activeIndexes,
  };
}
