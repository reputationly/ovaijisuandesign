// use-auto-scroll.js
import { reactExports } from "../vendor.js";

const NEAR_BOTTOM_THRESHOLD_PX = 80;

const BOTTOM_REENGAGE_THRESHOLD_PX = 1;

export function useAutoScroll(trigger, resetKey, options = {}) {
  const fallbackContainerRef = reactExports.useRef(null);
  const containerRef = options.scrollRef ?? fallbackContainerRef;
  const enabled = options.enabled ?? true;
  const scrollToBottomRef = reactExports.useRef(void 0);
  const isNearBottom = reactExports.useRef(true);
  const lastScrollTop = reactExports.useRef(0);
  const pendingResetRef = reactExports.useRef(true);
  const previousResetKeyRef = reactExports.useRef(resetKey);
  const pendingTriggerRef = reactExports.useRef(false);
  const previousTriggerRef = reactExports.useRef(trigger);
  scrollToBottomRef.current = options.scrollToBottom;
  const scrollToBottom = reactExports.useCallback(() => {
    if (!enabled) return;
    const customScrollToBottom = scrollToBottomRef.current;
    if (customScrollToBottom) {
      customScrollToBottom();
      return;
    }
    const scrollElement = containerRef.current;
    if (!scrollElement) return;
    scrollElement.scrollTop = scrollElement.scrollHeight;
  }, [containerRef, enabled]);
  const checkNearBottom = reactExports.useCallback(() => {
    if (!enabled) return;
    const scrollElement = containerRef.current;
    if (!scrollElement) return;
    const previousScrollTop = lastScrollTop.current;
    lastScrollTop.current = scrollElement.scrollTop;
    const distanceFromBottom = scrollElement.scrollHeight - scrollElement.scrollTop - scrollElement.clientHeight;
    if (distanceFromBottom <= BOTTOM_REENGAGE_THRESHOLD_PX) {
      isNearBottom.current = true;
      return;
    }
    if (scrollElement.scrollTop < previousScrollTop) {
      isNearBottom.current = false;
      return;
    }
    if (!isNearBottom.current) {
      return;
    }
    isNearBottom.current = distanceFromBottom < NEAR_BOTTOM_THRESHOLD_PX;
  }, [containerRef, enabled]);
  reactExports.useEffect(() => {
    if (!enabled) return;
    const scrollElement = containerRef.current;
    if (!scrollElement) return;
    lastScrollTop.current = scrollElement.scrollTop;
    scrollElement.addEventListener("scroll", checkNearBottom, {
      passive: true,
    });
    return () => scrollElement.removeEventListener("scroll", checkNearBottom);
  }, [checkNearBottom, containerRef, enabled]);
  reactExports.useEffect(() => {
    if (!Object.is(previousResetKeyRef.current, resetKey)) {
      previousResetKeyRef.current = resetKey;
      pendingResetRef.current = true;
    }
    if (!enabled) return;
    if (!pendingResetRef.current) return;
    pendingResetRef.current = false;
    const scrollElement = containerRef.current;
    if (!scrollElement) return;
    isNearBottom.current = true;
    lastScrollTop.current = scrollElement.scrollTop;
    scrollToBottom();
  }, [resetKey, enabled, containerRef, scrollToBottom]);
  reactExports.useEffect(() => {
    if (!Object.is(previousTriggerRef.current, trigger)) {
      previousTriggerRef.current = trigger;
      pendingTriggerRef.current = true;
    }
    if (!enabled) return;
    if (!pendingTriggerRef.current) return;
    pendingTriggerRef.current = false;
    const scrollElement = containerRef.current;
    if (!scrollElement || !isNearBottom.current) return;
    scrollToBottom();
  }, [trigger, enabled, containerRef, scrollToBottom]);
  return containerRef;
}
