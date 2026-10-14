// use-bottom-anchor-state.js
import reactExports from "react";

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
  const [state, setState] = reactExports.useState("hidden");
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
    const scrollElement = scrollRef.current;
    if (!scrollElement) return;
    const distance = scrollElement.scrollHeight - scrollElement.scrollTop - scrollElement.clientHeight;
    const isNearBottom = distance < NEAR_BOTTOM_PX;
    const isShortContent = scrollElement.scrollHeight <= scrollElement.clientHeight + NEAR_BOTTOM_PX;
    isNearBottomRef.current = isNearBottom;
    isShortContentRef.current = isShortContent;
    setState((prev) => {
      if (prev === "scrolling-to-bottom") return prev;
      if (isShortContent || distance <= HIDE_THRESHOLD_PX) {
        if (prev !== "hidden") {
          setUnreadCount(0);
        }
        return "hidden";
      }
      if (distance > SHOW_THRESHOLD_PX) {
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
    const scrollElement = scrollRef.current;
    if (!scrollElement) return;
    recomputeState();
    const handler = () => recomputeState();
    scrollElement.addEventListener("scroll", handler, {
      passive: true,
    });
    return () => scrollElement.removeEventListener("scroll", handler);
  }, [scrollRef, recomputeState, enabled]);
  reactExports.useEffect(() => {
    if (!enabled) return;
    const scrollElement = scrollRef.current;
    if (!scrollElement || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => recomputeState());
    observer.observe(scrollElement);
    return () => observer.disconnect();
  }, [scrollRef, recomputeState, enabled]);
  reactExports.useEffect(() => {
    if (!enabled) return;
    if (prevTokenRef.current === lastMessageToken) return;
    const prev = prevTokenRef.current;
    prevTokenRef.current = lastMessageToken;
    if (prev == null) return;
    if (isNearBottomRef.current) return;
    setUnreadCount((currentUnreadCount) => currentUnreadCount + 1);
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
    state: enabled ? state : "hidden",
    unreadCount: enabled ? unreadCount : 0,
    goToBottom,
  };
}
