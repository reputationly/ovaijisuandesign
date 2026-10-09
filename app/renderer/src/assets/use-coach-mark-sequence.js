// use-coach-mark-sequence.js
import { reactExports, useStorage } from "../vendor.js";
import { resolveSeenRevision } from "./wrap-as-asset-center-error.js";
import { TRACK_EVENTS } from "../infra/track-events.js";
import { trackEvent } from "../infra/sanitize-track-props.js";

const DEFAULT_OPEN_DELAY_MS = 400;

function stepRevision(step) {
  return step.revision ?? 1;
}

function appendSeenEntries(prev, markId, maxRevision) {
  const arr = Array.isArray(prev) ? prev : [];
  const additions = [
    markId,
    ...(maxRevision > 1 ? [`${markId}@${maxRevision}`] : []),
  ].filter((id2) => !arr.includes(id2));
  return additions.length ? [...arr, ...additions] : arr;
}

export function useCoachMarkSequence(
  markId,
  steps,
  enabled = true,
  openDelayMs = DEFAULT_OPEN_DELAY_MS,
  options = {},
) {
  const { persistOnEscape = true, onIncompleteEscape } = options;
  const [dismissedMarks, setDismissedMarks, setDismissedMarksAsync] =
    useStorage("global.dismissedCoachMarks");
  const [isOpen, setIsOpen] = reactExports.useState(false);
  const [index2, setIndex] = reactExports.useState(0);
  const indexRef = reactExports.useRef(0);
  const dismissedRef = reactExports.useRef(false);
  const openedRef = reactExports.useRef(false);
  const lockedSeenRef = reactExports.useRef(null);
  const maxRevision = steps.reduce(
    (max2, s2) => Math.max(max2, stepRevision(s2)),
    1,
  );
  const seenRevision =
    lockedSeenRef.current ?? resolveSeenRevision(dismissedMarks, markId);
  const visibleSteps = steps.filter((s2) => stepRevision(s2) > seenRevision);
  const stepTotal = visibleSteps.length;
  const stepsRef = reactExports.useRef(visibleSteps);
  stepsRef.current = visibleSteps;
  reactExports.useEffect(() => {
    if (openedRef.current) return;
    dismissedRef.current =
      resolveSeenRevision(dismissedMarks, markId) >= maxRevision;
  }, [dismissedMarks, markId, maxRevision]);
  const persistDismissed = reactExports.useCallback(() => {
    setDismissedMarks((prev) => appendSeenEntries(prev, markId, maxRevision));
  }, [markId, maxRevision, setDismissedMarks]);
  reactExports.useEffect(() => {
    if (!enabled || stepTotal === 0) return;
    if (dismissedRef.current || openedRef.current) return;
    const seenNow = resolveSeenRevision(dismissedMarks, markId);
    if (seenNow >= maxRevision) {
      dismissedRef.current = true;
      return;
    }
    const timer2 = setTimeout(() => {
      if (dismissedRef.current) return;
      openedRef.current = true;
      lockedSeenRef.current = seenNow;
      stepsRef.current[0]?.onEnter?.();
      indexRef.current = 0;
      setIndex(0);
      setIsOpen(true);
      trackEvent(TRACK_EVENTS.COACH_MARK_SHOW, {
        mark_id: markId,
        step: 1,
      });
    }, openDelayMs);
    return () => clearTimeout(timer2);
  }, [enabled, stepTotal, dismissedMarks, markId, openDelayMs, maxRevision]);
  const finish = reactExports.useCallback(
    (method) => {
      setIsOpen(false);
      if (dismissedRef.current) return;
      dismissedRef.current = true;
      persistDismissed();
      trackEvent(TRACK_EVENTS.COACH_MARK_DISMISS, {
        mark_id: markId,
        method,
      });
    },
    [markId, persistDismissed],
  );
  const next2 = reactExports.useCallback(() => {
    const nextIdx = indexRef.current + 1;
    if (nextIdx >= stepTotal) {
      finish("button");
      return;
    }
    indexRef.current = nextIdx;
    stepsRef.current[nextIdx]?.onEnter?.();
    trackEvent(TRACK_EVENTS.COACH_MARK_SHOW, {
      mark_id: markId,
      step: nextIdx + 1,
    });
    setIndex(nextIdx);
  }, [stepTotal, finish, markId]);
  const dismiss = reactExports.useCallback(
    (method) => finish(method),
    [finish],
  );
  const closeWithoutPersisting = reactExports.useCallback(
    (method) => {
      setIsOpen(false);
      trackEvent(TRACK_EVENTS.COACH_MARK_DISMISS, {
        mark_id: markId,
        method,
      });
    },
    [markId],
  );
  const persistSeen = reactExports.useCallback(
    async (revision = maxRevision) => {
      try {
        await setDismissedMarksAsync((prev) =>
          appendSeenEntries(prev, markId, revision),
        );
      } catch {}
    },
    [markId, maxRevision, setDismissedMarksAsync],
  );
  reactExports.useEffect(() => {
    if (!isOpen) return;
    const handler = (e2) => {
      if (e2.key === "Escape") {
        e2.stopPropagation();
        if (persistOnEscape) {
          dismiss("close");
        } else {
          closeWithoutPersisting("close");
          onIncompleteEscape?.();
        }
      }
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [
    isOpen,
    dismiss,
    closeWithoutPersisting,
    persistOnEscape,
    onIncompleteEscape,
  ]);
  return {
    isOpen,
    index: index2,
    stepCurrent: index2 + 1,
    stepTotal,
    isLast: index2 >= stepTotal - 1,
    visibleSteps,
    next: next2,
    dismiss,
    closeWithoutPersisting,
    persistSeen,
    isDismissed: dismissedRef.current,
  };
}
