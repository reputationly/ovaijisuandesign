// use-bottom-anchor-state.js
import { reactExports } from "../vendor.js";

const SHOW_THRESHOLD_PX = 200;

const HIDE_THRESHOLD_PX = 80;

const NEAR_BOTTOM_PX = 80;

function prefersReducedMotion() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function useBottomAnchorState(options) {
  const {
    scrollRef,
    lastMessageToken,
    isStreaming,
    resetKey,
    scrollToBottom,
    enabled = true,
  } = options;
  const [state2, setState] = reactExports.useState("hidden");
  const [unreadCount, setUnreadCount] = reactExports.useState(0);
  const isNearBottomRef = reactExports.useRef(true);
  const isShortContentRef = reactExports.useRef(true);
  const prevTokenRef = reactExports.useRef(lastMessageToken);
  const scrollingTimeoutRef = reactExports.useRef(null);
  const clearScrollingTimeout = reactExports.useCallback(() => {
    if (scrollingTimeoutRef.current != null) {
      clearTimeout(scrollingTimeoutRef.current);
      scrollingTimeoutRef.current = null;
    }
  }, []);
  const recomputeState = reactExports.useCallback(() => {
    if (!enabled) return;
    const el = scrollRef.current;
    if (!el) return;
    const distance2 = el.scrollHeight - el.scrollTop - el.clientHeight;
    const isNearBottom = distance2 < NEAR_BOTTOM_PX;
    const isShortContent = el.scrollHeight <= el.clientHeight + NEAR_BOTTOM_PX;
    isNearBottomRef.current = isNearBottom;
    isShortContentRef.current = isShortContent;
    setState((prev) => {
      if (prev === "scrolling-to-bottom") return prev;
      if (isShortContent || distance2 <= HIDE_THRESHOLD_PX) {
        if (prev !== "hidden") {
          setUnreadCount(0);
        }
        return "hidden";
      }
      if (distance2 > SHOW_THRESHOLD_PX) {
        if (isStreaming) return "streaming-away";
        if (unreadCount > 0) return "new-content";
        return "visible";
      }
      if (prev === "hidden") return "hidden";
      if (isStreaming) return "streaming-away";
      if (unreadCount > 0) return "new-content";
      return "visible";
    });
  }, [scrollRef, isStreaming, unreadCount, enabled]);
  reactExports.useEffect(() => {
    if (!enabled) return;
    const el = scrollRef.current;
    if (!el) return;
    recomputeState();
    const handler = () => recomputeState();
    el.addEventListener("scroll", handler, {
      passive: true,
    });
    return () => el.removeEventListener("scroll", handler);
  }, [scrollRef, recomputeState, enabled]);
  reactExports.useEffect(() => {
    if (!enabled) return;
    const el = scrollRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer2 = new ResizeObserver(() => recomputeState());
    observer2.observe(el);
    return () => observer2.disconnect();
  }, [scrollRef, recomputeState, enabled]);
  reactExports.useEffect(() => {
    if (!enabled) return;
    if (prevTokenRef.current === lastMessageToken) return;
    const prev = prevTokenRef.current;
    prevTokenRef.current = lastMessageToken;
    if (prev == null) return;
    if (isNearBottomRef.current) return;
    setUnreadCount((c3) => c3 + 1);
    queueMicrotask(recomputeState);
  }, [lastMessageToken, recomputeState, enabled]);
  reactExports.useEffect(() => {
    if (!enabled) return;
    recomputeState();
  }, [isStreaming, recomputeState, enabled]);
  reactExports.useEffect(() => {
    clearScrollingTimeout();
    setState("hidden");
    setUnreadCount(0);
    isNearBottomRef.current = true;
    prevTokenRef.current = lastMessageToken;
  }, [resetKey]);
  reactExports.useEffect(
    () => () => clearScrollingTimeout(),
    [clearScrollingTimeout],
  );
  const goToBottom = reactExports.useCallback(() => {
    if (!enabled) return;
    clearScrollingTimeout();
    setState("scrolling-to-bottom");
    setUnreadCount(0);
    const useSmooth = !prefersReducedMotion();
    scrollToBottom(useSmooth ? "smooth" : "instant");
    scrollingTimeoutRef.current = setTimeout(() => {
      scrollingTimeoutRef.current = null;
      setState((prev) => (prev === "scrolling-to-bottom" ? "hidden" : prev));
      recomputeState();
    }, 600);
  }, [scrollToBottom, recomputeState, clearScrollingTimeout, enabled]);
  return {
    state: enabled ? state2 : "hidden",
    unreadCount: enabled ? unreadCount : 0,
    goToBottom,
  };
}
