// text-save-status.jsx
import { reactExports, useTranslation } from "../vendor.js";
import { useCanvasActive } from "../media-editing/package.jsx";
import { __jsx } from "../shared/jsx-runtime.js";

function selectionAnchorsEqual(leftAnchor, rightAnchor) {
  if (leftAnchor === rightAnchor) return true;
  if (!leftAnchor || !rightAnchor) return false;
  return (
    leftAnchor.exact === rightAnchor.exact &&
    leftAnchor.prefix === rightAnchor.prefix &&
    leftAnchor.suffix === rightAnchor.suffix &&
    leftAnchor.occurrence === rightAnchor.occurrence
  );
}

function editingSelectionStatesEqual(leftState, rightState) {
  const aAnchors = leftState.anchors ?? (leftState.anchor ? [leftState.anchor] : []);
  const bAnchors = rightState.anchors ?? (rightState.anchor ? [rightState.anchor] : []);
  return (
    aAnchors.length === bAnchors.length &&
    aAnchors.every((anchor, index2) =>
      selectionAnchorsEqual(anchor, bAnchors[index2]),
    ) &&
    selectionAnchorsEqual(leftState.anchor, rightState.anchor) &&
    (leftState.oversizedLength ?? null) === (rightState.oversizedLength ?? null)
  );
}

const DRAFT_SAVE_INDICATOR_DELAY_MS = 400;

const DRAFT_SAVED_INDICATOR_DURATION_MS = 1500;

export function TextSaveStatus({ draftStatus, versionSaving }) {
  const { t: translate } = useTranslation();
  const [visibleDraftStatus, setVisibleDraftStatus] =
    reactExports.useState(null);
  const savingWasVisibleRef = reactExports.useRef(false);
  reactExports.useEffect(() => {
    let timer2;
    if (versionSaving) {
      savingWasVisibleRef.current = false;
      setVisibleDraftStatus(null);
    } else if (draftStatus === "saving") {
      setVisibleDraftStatus(null);
      timer2 = window.setTimeout(() => {
        savingWasVisibleRef.current = true;
        setVisibleDraftStatus("saving");
      }, DRAFT_SAVE_INDICATOR_DELAY_MS);
    } else if (draftStatus === "failed") {
      savingWasVisibleRef.current = false;
      setVisibleDraftStatus("failed");
    } else if (draftStatus === "saved" && savingWasVisibleRef.current) {
      savingWasVisibleRef.current = false;
      setVisibleDraftStatus("saved");
      timer2 = window.setTimeout(
        () => setVisibleDraftStatus(null),
        DRAFT_SAVED_INDICATOR_DURATION_MS,
      );
    } else {
      savingWasVisibleRef.current = false;
      setVisibleDraftStatus(null);
    }
    return () => {
      if (timer2 !== void 0) window.clearTimeout(timer2);
    };
  }, [draftStatus, versionSaving]);
  const label = versionSaving
    ? translate("canvas.textVersion.savingStatus", "正在保存版本…")
    : visibleDraftStatus === "saving"
      ? translate("canvas.textDraft.saving", "正在保存…")
      : visibleDraftStatus === "saved"
        ? translate("canvas.textDraft.saved", "已保存")
        : visibleDraftStatus === "failed"
          ? translate("canvas.textDraft.saveFailed", "保存失败")
          : null;
  if (!label) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className={`mr-2 shrink-0 text-[12px] ${visibleDraftStatus === "failed" && !versionSaving ? "text-destructive" : "text-muted-foreground"}`}
      data-action-ui-id="canvas-text-save-status"
    >
      {label}
    </div>
  );
}

function useEscapeClose(onClose) {
  const active2 = useCanvasActive();
  reactExports.useEffect(() => {
    if (!active2) return;
    const handleKeyDown2 = (keyboardEvent) => {
      if (keyboardEvent.key === "Escape") {
        keyboardEvent.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown2);
    return () => document.removeEventListener("keydown", handleKeyDown2);
  }, [active2, onClose]);
}

export function useFindEscapeClose(find2, onCloseModal) {
  const findRef = reactExports.useRef(find2);
  findRef.current = find2;
  const handleEscape = reactExports.useCallback(() => {
    if (findRef.current.isOpen) {
      findRef.current.close();
      return;
    }
    onCloseModal();
  }, [onCloseModal]);
  useEscapeClose(handleEscape);
}

const EDITING_SELECTION_DEBOUNCE_MS = 250;

const EMPTY_EDITING_SELECTION = {
  anchor: null,
};

export function useEditingSelectionReporter(onEditingSelectionChange) {
  const callbackRef = reactExports.useRef(onEditingSelectionChange);
  callbackRef.current = onEditingSelectionChange;
  const lastReportedRef = reactExports.useRef(EMPTY_EDITING_SELECTION);
  const timerRef = reactExports.useRef(null);
  const schedule2 = reactExports.useCallback((compute) => {
    if (!callbackRef.current) return;
    if (timerRef.current != null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      const next2 = compute();
      if (editingSelectionStatesEqual(lastReportedRef.current, next2)) return;
      lastReportedRef.current = next2;
      callbackRef.current?.(next2);
    }, EDITING_SELECTION_DEBOUNCE_MS);
  }, []);
  reactExports.useEffect(() => {
    return () => {
      if (timerRef.current != null) window.clearTimeout(timerRef.current);
      if (
        !editingSelectionStatesEqual(
          lastReportedRef.current,
          EMPTY_EDITING_SELECTION,
        )
      ) {
        lastReportedRef.current = EMPTY_EDITING_SELECTION;
        callbackRef.current?.(EMPTY_EDITING_SELECTION);
      }
    };
  }, []);
  return schedule2;
}

export function decideFullscreenCloseAction(state2) {
  if (!state2.userEdited) return "close-without-save";
  if (state2.externalUpdatedWhileEditing) return "show-conflict";
  return "flush-and-close";
}
