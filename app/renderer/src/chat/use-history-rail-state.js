// use-history-rail-state.js
import { CHAT_CONTENT_MAX_WIDTH_PX } from "./chat-content-width.jsx";
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
  const [mode, setMode] = reactExports.useState("hidden");
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
      const scrollElement = scrollRef.current;
      if (!scrollElement) return;
      const nextMode = resolveHistoryRailMode(scrollElement.clientWidth);
      const shouldShow = shouldShowHistoryRail(scrollElement.clientWidth, turnCount);
      setShowRail((prev) => (prev === shouldShow ? prev : shouldShow));
      setMode((prev) => {
        const resolved = shouldShow ? nextMode : "hidden";
        return prev === resolved ? prev : resolved;
      });
      if (!shouldShow) return;
      const nextIndexes = findActiveTurns(
        scrollElement.scrollTop,
        scrollElement.clientHeight,
        virtualItemsRef.current,
      );
      const next = nextIndexes.at(-1) ?? -1;
      setActiveIndexes((prev) =>
        prev.length === nextIndexes.length &&
        prev.every((value, index) => value === nextIndexes[index])
          ? prev
          : nextIndexes,
      );
      setActiveIndex((prev) => (prev === next ? prev : next));
    });
  }, [scrollRef, turnCount, enabled]);
  reactExports.useEffect(() => {
    if (!enabled) return;
    const scrollElement = scrollRef.current;
    if (!scrollElement) return;
    recompute();
    const handler = () => recompute();
    scrollElement.addEventListener("scroll", handler, {
      passive: true,
    });
    return () => {
      scrollElement.removeEventListener("scroll", handler);
      cancelRaf();
    };
  }, [scrollRef, recompute, cancelRaf, enabled]);
  reactExports.useEffect(() => {
    if (!enabled) return;
    const scrollElement = scrollRef.current;
    if (!scrollElement || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => recompute());
    observer.observe(scrollElement);
    return () => observer.disconnect();
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
    mode: enabled ? mode : "hidden",
    activeIndex,
    activeIndexes,
  };
}
