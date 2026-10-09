// use-coach-mark.js
import { reactExports, useStorage } from "../vendor.js";
import { TRACK_EVENTS } from "../infra/track-events.js";
import { trackEvent } from "../infra/sanitize-track-props.js";
const DEFAULT_AUTO_DISMISS_MS = 8e3;
const DEFAULT_OPEN_DELAY_MS = 500;
export function useCoachMark(markId, enabled = true, options = {}) {
  const {
    autoClose = true,
    autoCloseMs = DEFAULT_AUTO_DISMISS_MS,
    openDelayMs = DEFAULT_OPEN_DELAY_MS,
    pauseOnHover = true,
    persistOnOpen = false,
  } = options;
  const [dismissedMarks, setDismissedMarks] = useStorage(
    "global.dismissedCoachMarks",
  );
  const [isOpen, setIsOpen] = reactExports.useState(false);
  const timerRef = reactExports.useRef(null);
  const hoveredRef = reactExports.useRef(false);
  const dismissedRef = reactExports.useRef(false);
  const openedRef = reactExports.useRef(false);
  const persistSeen = reactExports.useCallback(() => {
    setDismissedMarks((prev) => {
      const arr = Array.isArray(prev) ? prev : [];
      return arr.includes(markId) ? arr : [...arr, markId];
    });
  }, [markId, setDismissedMarks]);
  reactExports.useEffect(() => {
    if (
      !openedRef.current &&
      Array.isArray(dismissedMarks) &&
      dismissedMarks.includes(markId)
    ) {
      dismissedRef.current = true;
    }
  }, [dismissedMarks, markId]);
  reactExports.useEffect(() => {
    if (!enabled || dismissedRef.current || openedRef.current) return;
    if (Array.isArray(dismissedMarks) && dismissedMarks.includes(markId)) {
      dismissedRef.current = true;
      return;
    }
    const openTimer = setTimeout(() => {
      if (dismissedRef.current) return;
      openedRef.current = true;
      setIsOpen(true);
      if (persistOnOpen) persistSeen();
      trackEvent(TRACK_EVENTS.COACH_MARK_SHOW, {
        mark_id: markId,
      });
    }, openDelayMs);
    return () => clearTimeout(openTimer);
  }, [
    enabled,
    dismissedMarks,
    markId,
    openDelayMs,
    persistOnOpen,
    persistSeen,
  ]);
  const clearTimer2 = reactExports.useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);
  const dismiss = reactExports.useCallback(
    (method) => {
      if (dismissedRef.current) return;
      dismissedRef.current = true;
      clearTimer2();
      setIsOpen(false);
      trackEvent(TRACK_EVENTS.COACH_MARK_DISMISS, {
        mark_id: markId,
        method,
      });
      persistSeen();
    },
    [markId, clearTimer2, persistSeen],
  );
  const startTimer = reactExports.useCallback(() => {
    clearTimer2();
    if (!autoClose) return;
    timerRef.current = setTimeout(() => {
      if (!hoveredRef.current) {
        dismiss("timeout");
      }
    }, autoCloseMs);
  }, [clearTimer2, dismiss, autoCloseMs, autoClose]);
  reactExports.useEffect(() => {
    if (isOpen) startTimer();
    return clearTimer2;
  }, [isOpen, startTimer, clearTimer2]);
  reactExports.useEffect(() => {
    if (!isOpen) return;
    const handler = (e2) => {
      if (e2.key === "Escape") {
        e2.stopPropagation();
        dismiss("close");
      }
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [isOpen, dismiss]);
  const onPointerEnter = reactExports.useCallback(() => {
    if (!pauseOnHover) return;
    hoveredRef.current = true;
    clearTimer2();
  }, [clearTimer2, pauseOnHover]);
  const onPointerLeave = reactExports.useCallback(() => {
    if (!pauseOnHover) return;
    hoveredRef.current = false;
    if (isOpen) startTimer();
  }, [isOpen, startTimer, pauseOnHover]);
  const holdOpen = reactExports.useCallback(() => {
    hoveredRef.current = true;
    clearTimer2();
  }, [clearTimer2]);
  return {
    isOpen,
    dismiss,
    onPointerEnter,
    onPointerLeave,
    holdOpen,
  };
}
