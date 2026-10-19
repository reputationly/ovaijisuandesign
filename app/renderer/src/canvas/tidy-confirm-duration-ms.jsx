import { CompositedSvg } from "../media-editing/icon-compositing.js";
import { default as reactExports } from "react";
import { useTranslation } from "react-i18next";
import { __jsx } from "../shared/jsx-runtime.js";
export const TIDY_CONFIRM_DURATION_MS = 5e3;

export function CountdownRing({ durationMs }) {
  return (
    <CompositedSvg width="16" height="16" viewBox="0 0 16 16" className="shrink-0 -rotate-90" aria-hidden="true">
      <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.2" />
      <circle
        cx="8"
        cy="8"
        r="7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="43.98"
        style={{
          animation: `canvas-countdown-ring ${durationMs}ms linear forwards`,
        }}
      />
    </CompositedSvg>
  );
}

export const CANVAS_FOCUS_ROOT_SELECTOR = '[role="application"][data-canvas-version], [data-hilo-canvas-root]';

export function findCanvasFocusRoot(anchor2) {
  return anchor2?.closest(CANVAS_FOCUS_ROOT_SELECTOR) ?? null;
}

export function canvasFinalFocus(anchor2) {
  return () => findCanvasFocusRoot(anchor2.current) ?? true;
}

export function useTidyConfirmation({ onRevertLayout, subscribeInvalidation }) {
  const [menuOpen, setMenuOpen] = reactExports.useState(false);
  const [confirmOpen, setConfirmOpen] = reactExports.useState(false);
  const mountedRef = reactExports.useRef(true);
  const timerRef = reactExports.useRef(null);
  const checkpointRef = reactExports.useRef(null);
  const unsubscribeRef = reactExports.useRef(null);
  const clearTimer2 = reactExports.useCallback(() => {
    if (timerRef.current === null) return;
    clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);
  const unsubscribeInvalidation = reactExports.useCallback(() => {
    unsubscribeRef.current?.();
    unsubscribeRef.current = null;
  }, []);
  const dismiss = reactExports.useCallback(() => {
    clearTimer2();
    unsubscribeInvalidation();
    checkpointRef.current = null;
    if (mountedRef.current) setConfirmOpen(false);
  }, [clearTimer2, unsubscribeInvalidation]);
  reactExports.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearTimer2();
      unsubscribeInvalidation();
      checkpointRef.current = null;
    };
  }, [clearTimer2, unsubscribeInvalidation]);
  const runTidy = reactExports.useCallback(
    async (action2) => {
      setMenuOpen(false);
      clearTimer2();
      unsubscribeInvalidation();
      checkpointRef.current = null;
      setConfirmOpen(false);
      const result = await action2();
      if (!mountedRef.current || !result?.changed || !result.checkpoint) return false;
      checkpointRef.current = result.checkpoint;
      setConfirmOpen(true);
      timerRef.current = setTimeout(dismiss, TIDY_CONFIRM_DURATION_MS);
      unsubscribeRef.current = subscribeInvalidation?.(dismiss) ?? null;
      return true;
    },
    [clearTimer2, dismiss, subscribeInvalidation, unsubscribeInvalidation],
  );
  const revert2 = reactExports.useCallback(() => {
    const checkpoint = checkpointRef.current;
    dismiss();
    if (checkpoint) onRevertLayout(checkpoint);
  }, [dismiss, onRevertLayout]);
  const handleMenuOpenChange = reactExports.useCallback(
    (open) => setMenuOpen(confirmOpen ? false : open),
    [confirmOpen],
  );
  return {
    menuOpen,
    confirmOpen,
    handleMenuOpenChange,
    runTidy,
    keep: dismiss,
    revert: revert2,
  };
}

export function TidyConfirmationPopover({ open, positionClass, uiIdPrefix, onKeep, onRevert }) {
  const { t: t2 } = useTranslation();
  const popoverRef = reactExports.useRef(null);
  const restoreCanvasFocus = reactExports.useCallback(() => {
    const popover = popoverRef.current;
    const root2 = findCanvasFocusRoot(popover);
    const active2 = document.activeElement;
    if (root2 && (!active2 || active2 === document.body || popover?.contains(active2)))
      root2.focus({
        preventScroll: true,
      });
  }, []);
  reactExports.useEffect(() => {
    if (!open) return;
    const handleEscape = (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      restoreCanvasFocus();
      onKeep();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onKeep, open, restoreCanvasFocus]);
  if (!open) return null;
  return (
    <div
      ref={popoverRef}
      data-action-ui-id={`${uiIdPrefix}-confirm`}
      role="dialog"
      aria-label={t2("canvas.tidy.confirmKeep")}
      aria-live="polite"
      className={`absolute ${positionClass} z-50 min-w-[208px] animate-[canvas-menu-in_100ms_ease-out] rounded-lg border p-2 shadow-[var(--canvas-shadow-menu)]`}
      style={{
        background: "var(--canvas-controls-bg)",
        borderColor: "var(--canvas-controls-border)",
        borderWidth: "var(--divider-width)",
        color: "var(--canvas-controls-text)",
      }}
    >
      <p className="px-1 pb-2 text-xs">{t2("canvas.tidy.confirmKeep")}</p>
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          data-action-ui-id={`${uiIdPrefix}-revert`}
          onClick={() => {
            restoreCanvasFocus();
            onRevert();
          }}
          className="h-7 cursor-pointer select-none rounded-md px-2.5 text-xs text-[var(--canvas-controls-text-muted)] transition-colors hover:bg-[var(--canvas-controls-hover)] hover:text-[var(--canvas-controls-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        >
          {t2("canvas.tidy.revert")}
        </button>
        <button
          type="button"
          data-action-ui-id={`${uiIdPrefix}-keep`}
          onClick={() => {
            restoreCanvasFocus();
            onKeep();
          }}
          className="flex h-7 cursor-pointer select-none items-center gap-1.5 rounded-md bg-[var(--canvas-controls-text)] px-2.5 text-xs text-[var(--canvas-controls-bg)] transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        >
          <CountdownRing durationMs={TIDY_CONFIRM_DURATION_MS} />
          <span>{t2("canvas.tidy.keep")}</span>
        </button>
      </div>
    </div>
  );
}
