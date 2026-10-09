// source-text-fullscreen.jsx
import {
  compileFindPattern,
  computeReplacement,
  computeReplacementWith,
  findMatchesInText,
  MAX_FIND_MATCHES,
} from "./paragraph-line-placement.js";
import {
  dedupedToast,
  jsxRuntimeExports,
  reactExports,
  Redo2,
  Undo2,
  useTranslation,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { ToolbarBtn, ToolbarSeparator$1 } from "./editor-history-controls.jsx";
import { buildTextareaSelectionState } from "../vendor-inline/codemirror/delete-markup-backward.js";
import { DiffPendingDialog } from "./diff-pending-dialog.jsx";
import { useDiffReviewStore } from "./use-diff-review-store.js";
import { CodeMirrorSourceEditor } from "./code-mirror-source-editor.jsx";
import { FullscreenShell } from "./find-bar.jsx";
import {
  decideFullscreenCloseAction,
  TextSaveStatus,
  useEditingSelectionReporter,
  useFindEscapeClose,
} from "../canvas/text-save-status.jsx";
import { useDebouncedDraftSave } from "../canvas/use-debounced-draft-save.js";
import { useExternalRevisionSync } from "../canvas/use-external-revision-sync.js";
import { useFindController } from "./use-find-controller.js";
import { useSourceDiffReview } from "./use-source-diff-review.jsx";
import { useTextConflictResolver } from "./use-text-conflict-resolver.jsx";
import { useTextDocumentDirty } from "./text-diff-hunk-view.jsx";
import { useTextVersionPanel } from "./use-text-version-panel.jsx";

function countNewlinesBefore(text2, offset2) {
  let count2 = 0;
  const end2 = Math.min(offset2, text2.length);
  for (let i2 = 0; i2 < end2; i2++) {
    if (text2.charCodeAt(i2) === 10) count2++;
  }
  return count2;
}

function scrollTextareaToOffset(textarea, offset2, lineHeight) {
  if (!Number.isFinite(lineHeight) || lineHeight <= 0) return;
  const line = countNewlinesBefore(textarea.value, offset2);
  const target = line * lineHeight - textarea.clientHeight / 2;
  textarea.scrollTop = Math.max(0, target);
}

function resolveLineHeight(textarea) {
  const raw2 = window.getComputedStyle(textarea).lineHeight;
  const parsed = Number.parseFloat(raw2);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 20;
}

function replaceAllInText(text2, query, options, replacement, maxMatches) {
  const pattern = compileFindPattern(query, options);
  if (!pattern)
    return {
      text: text2,
      count: 0,
    };
  const { matches: matches2 } = findMatchesInText(text2, query, options, {
    maxMatches: Number.POSITIVE_INFINITY,
    pattern,
  });
  if (matches2.length === 0)
    return {
      text: text2,
      count: 0,
    };
  let out = "";
  let last2 = 0;
  for (const m3 of matches2) {
    const matched = text2.slice(m3.from, m3.to);
    out +=
      text2.slice(last2, m3.from) +
      (options.regex
        ? computeReplacementWith(pattern, matched, replacement)
        : replacement);
    last2 = m3.to;
  }
  out += text2.slice(last2);
  return {
    text: out,
    count: matches2.length,
  };
}

function SourceEditorHistoryControls({ editorRef, availability }) {
  const { t: t2 } = useTranslation();
  return (
    <>
      <ToolbarBtn
        item={{
          id: "undo",
          label: t2("canvas.undo", "Undo"),
          icon: <Undo2 size={16} strokeWidth={1.5} aria-hidden="true" />,
          disabled: !availability.canUndo,
          onClick: () => {
            editorRef.current?.focus();
            editorRef.current?.undo();
          },
          dataActionUiId: "canvas-text-undo",
        }}
      />
      <ToolbarBtn
        item={{
          id: "redo",
          label: t2("canvas.redo", "Redo"),
          icon: <Redo2 size={16} strokeWidth={1.5} aria-hidden="true" />,
          disabled: !availability.canRedo,
          onClick: () => {
            editorRef.current?.focus();
            editorRef.current?.redo();
          },
          dataActionUiId: "canvas-text-redo",
        }}
      />
    </>
  );
}

export function SourceTextFullscreen({
  initialMarkdown,
  onClose,
  onDraftChange,
  externalRevision,
  onEditingSelectionChange,
  subscribeAnnotationCommand,
  documentPath,
  sourceNodeId,
  editorKind,
}) {
  const { t: t2 } = useTranslation();
  const textareaRef = reactExports.useRef(null);
  const codeMirrorRef = reactExports.useRef(null);
  const isCodeMirror = editorKind === "codemirror";
  const closedRef = reactExports.useRef(false);
  const userEditedRef = reactExports.useRef(false);
  const externalUpdatedWhileEditingRef = reactExports.useRef(false);
  const externalMarkdownRef = reactExports.useRef(initialMarkdown);
  externalMarkdownRef.current = initialMarkdown;
  const dirtyState = useTextDocumentDirty();
  const markDirty = dirtyState.markDirty;
  const [diffPendingOpen, setDiffPendingOpen] = reactExports.useState(false);
  const {
    status: draftSaveStatus,
    setLatestDraft,
    scheduleDraftSaveFrom,
    pauseDraftSave,
    resumeDraftSave,
    forceDraftSave,
    flushDraftSave,
    flushDraftSaveAsync,
    resetBaseline,
  } = useDebouncedDraftSave(initialMarkdown, onDraftChange);
  const getCurrentValue = reactExports.useCallback(
    () =>
      isCodeMirror
        ? (codeMirrorRef.current?.getValue() ?? initialMarkdown)
        : (textareaRef.current?.value ?? initialMarkdown),
    [initialMarkdown, isCodeMirror],
  );
  const setCurrentValue = reactExports.useCallback(
    (value) => {
      if (isCodeMirror) codeMirrorRef.current?.setValue(value);
      else if (textareaRef.current) textareaRef.current.value = value;
    },
    [isCodeMirror],
  );
  const getCurrentSelectionState = reactExports.useCallback(() => {
    if (isCodeMirror)
      return (
        codeMirrorRef.current?.getSelectionState() ?? {
          anchor: null,
        }
      );
    const el = textareaRef.current;
    return el
      ? buildTextareaSelectionState(
          el.value,
          el.selectionStart,
          el.selectionEnd,
        )
      : {
          anchor: null,
        };
  }, [isCodeMirror]);
  const focusCurrentEditor = reactExports.useCallback(() => {
    if (isCodeMirror) codeMirrorRef.current?.focus();
    else textareaRef.current?.focus();
  }, [isCodeMirror]);
  const applySync = reactExports.useCallback(
    (md) => {
      const current2 = getCurrentValue();
      if (current2 !== md) markDirty();
      setCurrentValue(md);
      return true;
    },
    [getCurrentValue, markDirty, setCurrentValue],
  );
  const handleSourceReviewDocumentApplied = reactExports.useCallback(
    (markdown2) => {
      if (getCurrentValue() !== markdown2) applySync(markdown2);
      resetBaseline(markdown2);
    },
    [applySync, getCurrentValue, resetBaseline],
  );
  const sourceDiffReview = useSourceDiffReview(sourceNodeId, {
    sourceMarkdown: initialMarkdown,
    readCurrentMarkdown: getCurrentValue,
    onReviewDocumentApplied: handleSourceReviewDocumentApplied,
  });
  const sourceDiffReviewActiveRef = reactExports.useRef(
    sourceDiffReview.active,
  );
  sourceDiffReviewActiveRef.current = sourceDiffReview.active;
  const getMineMarkdown = reactExports.useCallback(
    () => getCurrentValue(),
    [getCurrentValue],
  );
  const handleConflictResolved = reactExports.useCallback(
    (merged) => {
      externalUpdatedWhileEditingRef.current = false;
      if (getCurrentValue() !== merged) applySync(merged);
      const activeReview = useDiffReviewStore.getState().session;
      if (activeReview && activeReview.nodeId === sourceNodeId) {
        useDiffReviewStore
          .getState()
          .finishSessionForUserEdit(activeReview.requestId);
      }
      userEditedRef.current = true;
      forceDraftSave(merged);
    },
    [applySync, forceDraftSave, getCurrentValue, sourceNodeId],
  );
  const conflict = useTextConflictResolver({
    getMineMarkdown,
    onResolved: handleConflictResolved,
  });
  const openConflict = conflict.open;
  const handleExternalConflict = reactExports.useCallback(
    (external) => {
      if (openConflict(external)) return;
      const current2 = getCurrentValue();
      externalUpdatedWhileEditingRef.current = false;
      resetBaseline(external);
      resumeDraftSave();
      if (current2 !== external) scheduleDraftSaveFrom(getCurrentValue);
    },
    [
      getCurrentValue,
      openConflict,
      resetBaseline,
      resumeDraftSave,
      scheduleDraftSaveFrom,
    ],
  );
  useExternalRevisionSync({
    externalRevision,
    externalMarkdown: initialMarkdown,
    userEditedRef,
    externalUpdatedWhileEditingRef,
    applySync,
    resetBaseline,
    onConflictLatch: pauseDraftSave,
    onConflict: handleExternalConflict,
  });
  const finalizeClose = reactExports.useCallback(
    (md) => {
      if (closedRef.current) return;
      closedRef.current = true;
      onClose(md);
    },
    [onClose],
  );
  const handleClose = reactExports.useCallback(() => {
    if (closedRef.current) return;
    if (conflict.active) {
      dedupedToast.error(
        t2("canvas.textConflict.blockedClose", "请先处理完所有冲突再退出"),
      );
      return;
    }
    if (sourceDiffReviewActiveRef.current) {
      setDiffPendingOpen(true);
      return;
    }
    const action = decideFullscreenCloseAction({
      userEdited: userEditedRef.current,
      externalUpdatedWhileEditing: externalUpdatedWhileEditingRef.current,
    });
    if (action === "close-without-save") {
      finalizeClose();
      return;
    }
    setLatestDraft(getCurrentValue());
    if (action === "show-conflict") {
      openConflict(externalMarkdownRef.current);
      return;
    }
    const markdown2 = flushDraftSave();
    finalizeClose(onDraftChange ? void 0 : markdown2);
  }, [
    conflict.active,
    finalizeClose,
    flushDraftSave,
    getCurrentValue,
    onDraftChange,
    openConflict,
    setLatestDraft,
    t2,
  ]);
  const scheduleSelectionReport = useEditingSelectionReporter(
    onEditingSelectionChange,
  );
  const reportSourceSelection = reactExports.useCallback(() => {
    scheduleSelectionReport(getCurrentSelectionState);
  }, [getCurrentSelectionState, scheduleSelectionReport]);
  reactExports.useEffect(() => {
    if (!subscribeAnnotationCommand) return;
    return subscribeAnnotationCommand((cmd2) => {
      if (cmd2.type !== "clearSelection") return;
      if (isCodeMirror) {
        codeMirrorRef.current?.clearSelection();
      } else {
        const el = textareaRef.current;
        if (el && el.selectionStart !== el.selectionEnd) {
          el.setSelectionRange(el.selectionEnd, el.selectionEnd);
        }
      }
      reportSourceSelection();
    });
  }, [subscribeAnnotationCommand, isCodeMirror, reportSourceSelection]);
  const findRef = reactExports.useRef(null);
  const handleDocumentChange = reactExports.useCallback(
    (readValue) => {
      userEditedRef.current = true;
      markDirty();
      scheduleDraftSaveFrom(readValue);
      findRef.current?.refresh();
      reportSourceSelection();
    },
    [markDirty, reportSourceSelection, scheduleDraftSaveFrom],
  );
  const [sourceHistory, setSourceHistory] = reactExports.useState({
    canUndo: false,
    canRedo: false,
  });
  const handleHistoryAvailabilityChange = reactExports.useCallback((next2) => {
    setSourceHistory((current2) =>
      current2.canUndo === next2.canUndo && current2.canRedo === next2.canRedo
        ? current2
        : next2,
    );
  }, []);
  const lineHeightRef = reactExports.useRef(null);
  const findAdapter = reactExports.useMemo(
    () => ({
      search(query, options) {
        if (isCodeMirror) {
          const result = codeMirrorRef.current?.findMatches(
            query,
            options,
            MAX_FIND_MATCHES,
          );
          return {
            matches: result?.matches ?? [],
            limited: result?.limited ?? false,
            caretPos: codeMirrorRef.current?.getCaretPosition() ?? 0,
          };
        }
        const value = getCurrentValue();
        const { matches: matches2, limited } = findMatchesInText(
          value,
          query,
          options,
          {
            maxMatches: MAX_FIND_MATCHES,
          },
        );
        return {
          matches: matches2,
          limited,
          caretPos: textareaRef.current?.selectionStart ?? 0,
        };
      },
      activate(matches2, index2) {
        const match2 = matches2[index2];
        if (!match2) return;
        if (isCodeMirror) {
          codeMirrorRef.current?.setFindMatches(matches2, index2);
          return;
        }
        const el = textareaRef.current;
        if (!el) return;
        el.setSelectionRange(match2.from, match2.to);
        lineHeightRef.current ??= resolveLineHeight(el);
        scrollTextareaToOffset(el, match2.from, lineHeightRef.current);
      },
      clear() {
        if (isCodeMirror) codeMirrorRef.current?.clearFindMatches();
      },
      getSelectedText() {
        if (isCodeMirror) return codeMirrorRef.current?.getSelectedText() ?? "";
        const el = textareaRef.current;
        if (!el || el.selectionStart == null || el.selectionEnd == null)
          return "";
        return el.value.slice(el.selectionStart, el.selectionEnd);
      },
      focusEditor: focusCurrentEditor,
      replaceOne(match2, query, options, replacement) {
        const matchedText = isCodeMirror
          ? (codeMirrorRef.current?.getText(match2.from, match2.to) ?? "")
          : getCurrentValue().slice(match2.from, match2.to);
        const expanded = computeReplacement(
          matchedText,
          query,
          options,
          replacement,
        );
        if (isCodeMirror) {
          codeMirrorRef.current?.replaceRange(match2.from, match2.to, expanded);
          return;
        }
        const el = textareaRef.current;
        if (!el) return;
        el.setRangeText(expanded, match2.from, match2.to, "end");
        handleDocumentChange(() => el.value);
      },
      replaceAll(query, options, replacement) {
        if (isCodeMirror) {
          codeMirrorRef.current?.replaceAll(query, options, replacement);
          return;
        }
        const { text: text2, count: count2 } = replaceAllInText(
          getCurrentValue(),
          query,
          options,
          replacement,
        );
        if (count2 === 0) return;
        const el = textareaRef.current;
        if (!el) return;
        el.value = text2;
        handleDocumentChange(() => el.value);
      },
    }),
    [focusCurrentEditor, getCurrentValue, handleDocumentChange, isCodeMirror],
  );
  const find2 = useFindController(findAdapter);
  findRef.current = find2;
  useFindEscapeClose(find2, handleClose);
  const handleInput = reactExports.useCallback(
    (e2) => {
      const el = e2.currentTarget;
      handleDocumentChange(() => el.value);
    },
    [handleDocumentChange],
  );
  const flushForVersionSave = reactExports.useCallback(async () => {
    setLatestDraft(getCurrentValue());
    await flushDraftSaveAsync();
  }, [flushDraftSaveAsync, getCurrentValue, setLatestDraft]);
  const prepareForVersionReplace = reactExports.useCallback(async () => {
    await flushForVersionSave();
    userEditedRef.current = false;
    externalUpdatedWhileEditingRef.current = false;
  }, [flushForVersionSave]);
  const versionPanel = useTextVersionPanel({
    path: documentPath,
    ...(sourceNodeId
      ? {
          nodeId: sourceNodeId,
        }
      : {}),
    flushBeforeSave: flushForVersionSave,
    prepareForReplace: prepareForVersionReplace,
    // Snapshotting mid-review/conflict would checkpoint a document the user
    // has not finished resolving — same reason closing is blocked.
    disabled: sourceDiffReview.active || conflict.active,
    dirty: dirtyState,
    getContent: getCurrentValue,
  });
  const sourceEditorBlocked =
    sourceDiffReview.active || conflict.active || versionPanel.previewing;
  reactExports.useEffect(() => {
    if (sourceEditorBlocked) return;
    requestAnimationFrame(focusCurrentEditor);
  }, [focusCurrentEditor, sourceEditorBlocked]);
  reactExports.useEffect(() => {
    if (!sourceEditorBlocked) return;
    const activeElement2 = document.activeElement;
    if (!(activeElement2 instanceof HTMLElement)) return;
    const belongsToSourceEditor =
      activeElement2 === textareaRef.current ||
      activeElement2.closest(
        '[data-action-ui-id="canvas-text-large-markdown-editor"]',
      ) !== null;
    if (belongsToSourceEditor) activeElement2.blur();
  }, [sourceEditorBlocked]);
  return (
    <FullscreenShell
      find={find2}
      onClose={handleClose}
      saveStatus={
        <TextSaveStatus
          draftStatus={draftSaveStatus}
          versionSaving={versionPanel.versionSaving}
        />
      }
      hideFind={sourceEditorBlocked}
      hideClose={versionPanel.previewing}
      headerLeft={
        conflict.active
          ? conflict.headerLeft
          : sourceDiffReview.active
            ? sourceDiffReview.headerLeft
            : versionPanel.previewHeaderLeft
      }
      toolbarActions={
        conflict.active ? (
          conflict.toolbarActions
        ) : sourceDiffReview.active ? (
          sourceDiffReview.toolbarActions
        ) : versionPanel.previewing ? (
          versionPanel.previewToolbar
        ) : isCodeMirror ? (
          <>
            <SourceEditorHistoryControls
              editorRef={codeMirrorRef}
              availability={sourceHistory}
            />
            <ToolbarSeparator$1 />
            {versionPanel.toolbarButtons}
          </>
        ) : (
          versionPanel.toolbarButtons
        )
      }
      overlay={
        conflict.active
          ? conflict.body
          : sourceDiffReview.active
            ? sourceDiffReview.body
            : versionPanel.preview
      }
      editorOwnsScroll={true}
    >
      <div
        className="h-full min-h-0 w-full"
        inert={sourceEditorBlocked ? true : void 0}
        aria-hidden={sourceEditorBlocked ? true : void 0}
        data-action-ui-id="canvas-text-source-editor-surface"
      >
        {isCodeMirror ? (
          <CodeMirrorSourceEditor
            ref={codeMirrorRef}
            initialValue={initialMarkdown}
            readOnly={sourceEditorBlocked}
            onDocumentChange={handleDocumentChange}
            onSelectionChange={reportSourceSelection}
            onHistoryAvailabilityChange={handleHistoryAvailabilityChange}
          />
        ) : (
          <textarea
            ref={textareaRef}
            defaultValue={initialMarkdown}
            readOnly={sourceEditorBlocked}
            onInput={handleInput}
            onSelect={reportSourceSelection}
            spellCheck={false}
            className="canvas-text-fullscreen-plain-editor h-full w-full resize-none border-0 bg-transparent py-4 pr-8 text-sm text-foreground outline-none whitespace-pre-wrap break-words"
          />
        )}
      </div>
      {versionPanel.dialog}
      <DiffPendingDialog
        open={diffPendingOpen}
        onDismiss={() => setDiffPendingOpen(false)}
      />
    </FullscreenShell>
  );
}
