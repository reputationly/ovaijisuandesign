// use-debounced-draft-save.jsx
import { jsxRuntimeExports, reactExports, useTranslation, reactDomExports, BubbleMenu, Search } from "../vendor.js";
import { useCanvasActive } from "../media-editing/parse-item.jsx";
import { AnnotationIcon, CloseIcon$1 } from "./generating-media-area.jsx";
import { useCanvasRootElement } from "../media-editing/comfy-ui-plugin-launcher.jsx";
import { useSuspendCanvasInteractions } from "./use-inline-rename.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { editingSelectionStatesEqual } from "../text-editor/code-mirror-source-editor.jsx";
import { FindBar } from "../text-editor/use-find-controller.jsx";
import { ToolbarBtn, ToolbarSeparator$1 } from "../text-editor/use-source-diff-review.jsx";
export function startTextAnnotation(getCloseBlockReason, onStart, onAgentRunning) {
  if (getCloseBlockReason?.() === "agent-running") {
    onAgentRunning();
    return false;
  }
  onStart();
  return true;
}
export function SelectionFormatToolbar({ editor, formatItems, annotate }) {
  return (
    <BubbleMenu
      editor={editor}
      options={{
        placement: "top",
        offset: 8,
      }}
      shouldShow={({ editor: ed, state: state2 }) => {
        if (!ed.isEditable) return false;
        const { from: from2, to } = state2.selection;
        return from2 !== to;
      }}
      className="canvas-toolbar-surface"
      data-canvas-toolbar="true"
      data-density="compact"
    >
      {formatItems.map((item) => (
        <ToolbarBtn key={item.id} item={item} contextToolbar={true} />
      ))}
      {annotate && (
        <>
          <ToolbarSeparator$1 contextToolbar={true} />
          <button
            type="button"
            title={annotate.label}
            onMouseDown={(e2) => e2.preventDefault()}
            onClick={annotate.onClick}
            className="canvas-toolbar-action"
            data-action-ui-id="canvas-text-annotate"
          >
            <AnnotationIcon size={16} />
            <span className="whitespace-nowrap">{annotate.label}</span>
          </button>
        </>
      )}
    </BubbleMenu>
  );
}
export function FullscreenShell({
  toolbarActions,
  saveStatus,
  headerLeft,
  overlay,
  hideFind,
  hideClose,
  find: find2,
  editorOwnsScroll,
  onClose,
  children: children2,
}) {
  const { t: t2 } = useTranslation();
  const canvasRootEl = useCanvasRootElement();
  useCanvasShortcutGuard();
  const findItem = reactExports.useMemo(
    () =>
      find2 && !hideFind
        ? {
            id: "find",
            label: t2("canvas.find.title", "查找"),
            icon: <Search size={16} strokeWidth={1.5} />,
            onClick: () => find2.open(),
            active: find2.isOpen,
            dataActionUiId: "canvas-text-find-open",
          }
        : null,
    [find2, hideFind, t2],
  );
  const handlePanelKeyDown = reactExports.useCallback(
    (e2) => {
      if (
        find2 &&
        !hideFind &&
        (e2.metaKey || e2.ctrlKey) &&
        !e2.altKey &&
        !e2.shiftKey &&
        e2.key.toLowerCase() === "f"
      ) {
        e2.preventDefault();
        find2.open();
      } else if (find2?.isOpen && e2.key === "Escape") {
        e2.preventDefault();
        find2.close();
      }
      e2.stopPropagation();
    },
    [find2, hideFind],
  );
  return reactDomExports.createPortal(
    <div
      role="dialog"
      data-canvas-chrome="true"
      className={`canvas-text-fullscreen-editor tiptap-editor-wrapper ${canvasRootEl ? "absolute" : "fixed"} inset-0 z-[10100] flex flex-col animate-[lightbox-fade-in_0.15s_ease-out]`}
      style={{
        background: "var(--canvas-node-bg, #fff)",
      }}
      onKeyDown={handlePanelKeyDown}
      onKeyUp={(e2) => e2.stopPropagation()}
      onContextMenu={(e2) => e2.stopPropagation()}
    >
      <div
        className="flex items-center shrink-0 px-3 py-2"
        style={{
          borderBottom: "1px solid var(--canvas-node-border, #e0e0e0)",
        }}
      >
        <div className="flex min-w-0 flex-1 items-center">{headerLeft}</div>
        {saveStatus}
        <div className="flex items-center gap-0.5">
          {toolbarActions}
          {findItem && <ToolbarBtn item={findItem} />}
          {!hideClose && (
            <button
              type="button"
              title={t2("canvas.close")}
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-[var(--bg-subtle,#f5f5f5)]"
              style={{
                color: "var(--fg-muted, #666)",
              }}
            >
              <CloseIcon$1 />
            </button>
          )}
        </div>
      </div>
      <div className="relative min-h-0 flex-1">
        {find2?.isOpen && <FindBar controller={find2} />}
        <div className="flex h-full min-h-0">
          <div
            className={
              editorOwnsScroll
                ? "h-full min-w-0 flex-1 overflow-hidden pl-8"
                : "h-full flex-1 overflow-y-auto py-4 px-8"
            }
            data-diff-scroll-root="true"
          >
            {children2}
          </div>
        </div>
        {overlay}
      </div>
    </div>,
    canvasRootEl ?? document.body,
  );
}
const DRAFT_SAVE_INDICATOR_DELAY_MS = 400;
const DRAFT_SAVED_INDICATOR_DURATION_MS = 1500;
export function TextSaveStatus({ draftStatus, versionSaving }) {
  const { t: t2 } = useTranslation();
  const [visibleDraftStatus, setVisibleDraftStatus] = reactExports.useState(null);
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
    ? t2("canvas.textVersion.savingStatus", "正在保存版本…")
    : visibleDraftStatus === "saving"
      ? t2("canvas.textDraft.saving", "正在保存…")
      : visibleDraftStatus === "saved"
        ? t2("canvas.textDraft.saved", "已保存")
        : visibleDraftStatus === "failed"
          ? t2("canvas.textDraft.saveFailed", "保存失败")
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
    const handleKeyDown2 = (e2) => {
      if (e2.key === "Escape") {
        e2.stopPropagation();
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
function useCanvasShortcutGuard() {
  const active2 = useCanvasActive();
  useSuspendCanvasInteractions(true);
  reactExports.useEffect(() => {
    if (!active2) return;
    const isInEditor = (target) =>
      target instanceof HTMLElement &&
      (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
    const deleteKeyCapture = (e2) => {
      if (e2.key !== "Delete" && e2.key !== "Backspace") return;
      if (isInEditor(e2.target)) return;
      e2.stopPropagation();
      e2.stopImmediatePropagation();
    };
    const shortcutBubble = (e2) => {
      if (e2.key === "Escape") return;
      const meta2 = e2.metaKey || e2.ctrlKey;
      if (meta2 || (e2.shiftKey && (e2.code === "Digit1" || e2.code === "Digit2"))) {
        e2.stopPropagation();
      }
    };
    const clipboardCapture = (e2) => {
      if (isInEditor(e2.target)) return;
      e2.stopPropagation();
    };
    document.addEventListener("keydown", deleteKeyCapture, true);
    document.addEventListener("keydown", shortcutBubble);
    document.addEventListener("copy", clipboardCapture, true);
    document.addEventListener("cut", clipboardCapture, true);
    document.addEventListener("paste", clipboardCapture, true);
    return () => {
      document.removeEventListener("keydown", deleteKeyCapture, true);
      document.removeEventListener("keydown", shortcutBubble);
      document.removeEventListener("copy", clipboardCapture, true);
      document.removeEventListener("cut", clipboardCapture, true);
      document.removeEventListener("paste", clipboardCapture, true);
    };
  }, [active2]);
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
      if (!editingSelectionStatesEqual(lastReportedRef.current, EMPTY_EDITING_SELECTION)) {
        lastReportedRef.current = EMPTY_EDITING_SELECTION;
        callbackRef.current?.(EMPTY_EDITING_SELECTION);
      }
    };
  }, []);
  return schedule2;
}
export function useDebouncedDraftSave(initialMarkdown, onDraftChange) {
  const [status, setStatus] = reactExports.useState("idle");
  const latestDraftRef = reactExports.useRef(initialMarkdown);
  const latestDraftReaderRef = reactExports.useRef(null);
  const lastPersistedDraftRef = reactExports.useRef(initialMarkdown);
  const timerRef = reactExports.useRef(null);
  const pausedRef = reactExports.useRef(false);
  const activeWriteDraftRef = reactExports.useRef(null);
  const queuedWriteRef = reactExports.useRef(null);
  const writeLoopRef = reactExports.useRef(null);
  const lastWriteFailureRef = reactExports.useRef(null);
  const onDraftChangeRef = reactExports.useRef(onDraftChange);
  onDraftChangeRef.current = onDraftChange;
  const setLatestDraft = reactExports.useCallback((markdown2) => {
    latestDraftReaderRef.current = null;
    latestDraftRef.current = markdown2;
  }, []);
  const readLatestDraft = reactExports.useCallback(() => {
    const reader = latestDraftReaderRef.current;
    if (!reader) return latestDraftRef.current;
    const markdown2 = reader();
    latestDraftRef.current = markdown2;
    return markdown2;
  }, []);
  const runDraftChange = reactExports.useCallback((markdown2, force = false) => {
    if (!onDraftChangeRef.current || pausedRef.current) return;
    if (
      !force &&
      (markdown2 === lastPersistedDraftRef.current ||
        markdown2 === activeWriteDraftRef.current ||
        markdown2 === queuedWriteRef.current)
    )
      return;
    queuedWriteRef.current = markdown2;
    if (writeLoopRef.current) return;
    const startWriteLoop = () => {
      if (writeLoopRef.current || pausedRef.current || queuedWriteRef.current === null) return;
      setStatus("saving");
      let tracked;
      const loop = (async () => {
        while (queuedWriteRef.current !== null && !pausedRef.current) {
          const next2 = queuedWriteRef.current;
          queuedWriteRef.current = null;
          activeWriteDraftRef.current = next2;
          try {
            await onDraftChangeRef.current?.(next2);
            lastPersistedDraftRef.current = next2;
            lastWriteFailureRef.current = null;
          } catch (error) {
            lastWriteFailureRef.current = {
              markdown: next2,
              error: error instanceof Error ? error : new Error("Failed to persist text draft"),
            };
          } finally {
            activeWriteDraftRef.current = null;
          }
        }
      })();
      tracked = loop.finally(() => {
        if (writeLoopRef.current !== tracked) return;
        writeLoopRef.current = null;
        if (queuedWriteRef.current !== null && !pausedRef.current) {
          startWriteLoop();
          return;
        }
        setStatus(lastWriteFailureRef.current ? "failed" : "saved");
      });
      writeLoopRef.current = tracked;
    };
    startWriteLoop();
  }, []);
  const flushDraftSave = reactExports.useCallback(() => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const nextMarkdown = readLatestDraft();
    if (
      !pausedRef.current &&
      onDraftChangeRef.current &&
      nextMarkdown !== lastPersistedDraftRef.current
    ) {
      runDraftChange(nextMarkdown);
    }
    return nextMarkdown;
  }, [readLatestDraft, runDraftChange]);
  const flushDraftSaveAsync = reactExports.useCallback(async () => {
    while (true) {
      const flushedMarkdown = flushDraftSave();
      while (writeLoopRef.current) await writeLoopRef.current;
      const latestMarkdown = readLatestDraft();
      if (latestMarkdown !== flushedMarkdown) continue;
      if (latestMarkdown !== lastPersistedDraftRef.current) {
        throw lastWriteFailureRef.current?.error ?? new Error("Failed to persist text draft");
      }
      lastWriteFailureRef.current = null;
      setStatus("saved");
      return;
    }
  }, [flushDraftSave, readLatestDraft]);
  const schedulePendingSave = reactExports.useCallback(() => {
    if (!onDraftChangeRef.current || pausedRef.current) return;
    if (timerRef.current != null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      const currentMarkdown = readLatestDraft();
      if (pausedRef.current || currentMarkdown === lastPersistedDraftRef.current) return;
      runDraftChange(currentMarkdown);
    }, 800);
  }, [readLatestDraft, runDraftChange]);
  const scheduleDraftSave = reactExports.useCallback(
    (nextMarkdown) => {
      setLatestDraft(nextMarkdown);
      schedulePendingSave();
    },
    [schedulePendingSave, setLatestDraft],
  );
  const scheduleDraftSaveFrom = reactExports.useCallback(
    (readMarkdown) => {
      latestDraftReaderRef.current = readMarkdown;
      schedulePendingSave();
    },
    [schedulePendingSave],
  );
  const pauseDraftSave = reactExports.useCallback(() => {
    pausedRef.current = true;
    queuedWriteRef.current = null;
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);
  const resumeDraftSave = reactExports.useCallback(() => {
    pausedRef.current = false;
  }, []);
  const forceDraftSave = reactExports.useCallback(
    (markdown2) => {
      if (timerRef.current != null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setLatestDraft(markdown2);
      pausedRef.current = false;
      runDraftChange(markdown2, true);
    },
    [runDraftChange, setLatestDraft],
  );
  const resetBaseline = reactExports.useCallback(
    (nextMarkdown) => {
      if (timerRef.current != null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setLatestDraft(nextMarkdown);
      lastPersistedDraftRef.current = nextMarkdown;
      lastWriteFailureRef.current = null;
      setStatus("idle");
    },
    [setLatestDraft],
  );
  const flushRef = reactExports.useRef(flushDraftSave);
  flushRef.current = flushDraftSave;
  reactExports.useEffect(() => {
    return () => {
      flushRef.current();
    };
  }, []);
  return {
    status,
    latestDraftRef,
    setLatestDraft,
    scheduleDraftSave,
    scheduleDraftSaveFrom,
    pauseDraftSave,
    resumeDraftSave,
    forceDraftSave,
    flushDraftSave,
    flushDraftSaveAsync,
    resetBaseline,
  };
}
export function decideFullscreenCloseAction(state2) {
  if (!state2.userEdited) return "close-without-save";
  if (state2.externalUpdatedWhileEditing) return "show-conflict";
  return "flush-and-close";
}
export function useExternalRevisionSync({
  externalRevision,
  externalMarkdown,
  userEditedRef,
  externalUpdatedWhileEditingRef,
  applySync,
  resetBaseline,
  onConflictLatch,
  onConflict,
}) {
  const seenRevisionRef = reactExports.useRef(externalRevision);
  const seenMarkdownRef = reactExports.useRef(externalMarkdown);
  const pendingRevisionMarkdownRef = reactExports.useRef(null);
  const unmatchedMarkdownRef = reactExports.useRef(null);
  const awaitingConflictMarkdownRef = reactExports.useRef(false);
  const onConflictLatchRef = reactExports.useRef(onConflictLatch);
  onConflictLatchRef.current = onConflictLatch;
  const onConflictRef = reactExports.useRef(onConflict);
  onConflictRef.current = onConflict;
  reactExports.useEffect(() => {
    const previousMarkdown = seenMarkdownRef.current;
    const markdownChanged = externalMarkdown !== previousMarkdown;
    seenMarkdownRef.current = externalMarkdown;
    const revisionChanged = externalRevision !== seenRevisionRef.current;
    const latchConflict = (loadedMarkdown) => {
      if (!externalUpdatedWhileEditingRef.current) onConflictLatchRef.current?.();
      externalUpdatedWhileEditingRef.current = true;
      if (loadedMarkdown === null) {
        awaitingConflictMarkdownRef.current = true;
        return;
      }
      awaitingConflictMarkdownRef.current = false;
      onConflictRef.current?.(loadedMarkdown);
    };
    if (revisionChanged) {
      seenRevisionRef.current = externalRevision;
      if (userEditedRef.current) {
        pendingRevisionMarkdownRef.current = null;
        unmatchedMarkdownRef.current = null;
        latchConflict(markdownChanged ? externalMarkdown : null);
        return;
      }
      const loadedMarkdown = markdownChanged ? externalMarkdown : unmatchedMarkdownRef.current;
      unmatchedMarkdownRef.current = null;
      if (loadedMarkdown === null) {
        pendingRevisionMarkdownRef.current = externalMarkdown;
        return;
      }
      pendingRevisionMarkdownRef.current = null;
      const shouldResetBaseline = applySync(loadedMarkdown);
      if (shouldResetBaseline !== false) resetBaseline(loadedMarkdown);
      return;
    }
    const pendingMarkdown = pendingRevisionMarkdownRef.current;
    if (pendingMarkdown !== null && externalMarkdown !== pendingMarkdown) {
      pendingRevisionMarkdownRef.current = null;
      unmatchedMarkdownRef.current = null;
      if (userEditedRef.current) {
        latchConflict(externalMarkdown);
        return;
      }
      const shouldResetBaseline = applySync(externalMarkdown);
      if (shouldResetBaseline !== false) resetBaseline(externalMarkdown);
      return;
    }
    if (markdownChanged) {
      unmatchedMarkdownRef.current = externalMarkdown;
      if (awaitingConflictMarkdownRef.current) {
        awaitingConflictMarkdownRef.current = false;
        onConflictRef.current?.(externalMarkdown);
      }
    }
  }, [
    externalRevision,
    externalMarkdown,
    applySync,
    resetBaseline,
    userEditedRef,
    externalUpdatedWhileEditingRef,
  ]);
}
