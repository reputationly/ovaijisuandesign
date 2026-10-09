// markdown-fullscreen.jsx
import {
  jsxRuntimeExports,
  reactExports,
  LEAF_PLACEHOLDER,
  useTranslation,
  dedupedToast,
  Dialog$1,
  CanvasActionsContext,
  useDiffReviewStore,
  recordProvisionalDiffReviewHistory,
  getDiffReviewHistorySnapshot,
  Undo2,
  Redo2,
  useEditor,
  ScrollableMarkdownTable,
  TableRow$1,
  TableHeader$1,
  TableCell$1,
  Markdown,
  src_default$1,
  AnnotationHighlight,
  BlurSelectionHighlight,
  DIFF_REVIEW_SYNC_META,
  getAnnotationHistorySnapshot,
  splitCompletedReviewFromUserEdit,
  useAnnotations,
  useEditorHistoryShortcuts,
  TextSelection,
  EditorContent,
} from "../vendor.js";
import {
  DialogContent$1,
  DialogHeader$1,
  DialogTitle$1,
  DialogFooter$1,
  DialogDescription$1,
} from "../m02/thumb-chip.jsx";
import { Button$2 } from "../m01/use-media-node-actions.jsx";
import {
  selectHasPendingHunksForNode,
  AnnotationGutter,
  AnnotationInput,
} from "../m04/table-node-inner.jsx";
import { useCanvasRootElement } from "../m03/comfy-ui-plugin-launcher.jsx";
import { src_default } from "../m02/use-direct-reference-picker.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { CodeMirrorSourceEditor } from "./code-mirror-source-editor.jsx";
import { buildPmSelectionState, buildTextareaSelectionState } from "./delete-markup-backward.js";
import {
  DiffReviewHighlight,
  MAX_FIND_MATCHES,
  computeReplacement,
  findMatchesInText,
  replaceAllInText,
} from "./diff-review-highlight.js";
import {
  MarkdownTableScrollbars,
  TableContextMenu,
  buildFormatItems,
  extractTableGridAtSelection,
  preserveMarkdownFidelity,
  resolveLineHeight,
  scrollTextareaToOffset,
  tableDocumentFromGrid,
} from "./table-context-menu.jsx";
import {
  FullscreenShell,
  SelectionFormatToolbar,
  TextSaveStatus,
  decideFullscreenCloseAction,
  startTextAnnotation,
  useDebouncedDraftSave,
  useEditingSelectionReporter,
  useExternalRevisionSync,
  useFindEscapeClose,
} from "./use-debounced-draft-save.jsx";
import { useDiffReview } from "./use-diff-review.js";
import {
  FIND_MATCH_ACTIVE_CLASS,
  FindHighlight,
  beginDiffReviewWriteAckEpoch,
  clearDiffReviewWriteAcks,
  consumeDiffReviewWriteAck,
  createDiffReviewWriteAckTracker,
  enqueueDiffReviewWriteAck,
  findPluginKey,
  hashDiffReviewMarkdown,
  pendingDiffReviewWriteAckCount,
  reconstructDiffReviewBaseline,
  resetProseMirrorHistory,
  searchPmDoc,
  useFindController,
} from "./use-find-controller.jsx";
import {
  EditorHistoryControls,
  ToolbarBtn,
  ToolbarSeparator$1,
  serializeMarkdownDocument,
  useSourceDiffReview,
} from "./use-source-diff-review.jsx";
import { useTextConflictResolver, useTextDocumentDirty } from "./use-text-conflict-resolver.jsx";
import { useTextVersionPanel } from "./use-text-version-preview.jsx";
function DiffPendingDialog({ open, onDismiss }) {
  const { t: t2 } = useTranslation();
  return (
    <Dialog$1
      open={open}
      onOpenChange={(next2) => {
        if (!next2) onDismiss();
      }}
    >
      <DialogContent$1 showCloseButton={false}>
        <DialogHeader$1>
          <DialogTitle$1>{t2("canvas.diffPendingTitle", "还有未处理的修改")}</DialogTitle$1>
          <DialogDescription$1>
            {t2(
              "canvas.diffPendingDescription",
              "当前还有 AI 修改未处理，请先接受或撤销所有修改后再关闭编辑。",
            )}
          </DialogDescription$1>
        </DialogHeader$1>
        <DialogFooter$1>
          <Button$2 variant="default" onClick={onDismiss}>
            {t2("canvas.diffPendingConfirm", "去处理")}
          </Button$2>
        </DialogFooter$1>
      </DialogContent$1>
    </Dialog$1>
  );
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
      ? buildTextareaSelectionState(el.value, el.selectionStart, el.selectionEnd)
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
  const sourceDiffReviewActiveRef = reactExports.useRef(sourceDiffReview.active);
  sourceDiffReviewActiveRef.current = sourceDiffReview.active;
  const getMineMarkdown = reactExports.useCallback(() => getCurrentValue(), [getCurrentValue]);
  const handleConflictResolved = reactExports.useCallback(
    (merged) => {
      externalUpdatedWhileEditingRef.current = false;
      if (getCurrentValue() !== merged) applySync(merged);
      const activeReview = useDiffReviewStore.getState().session;
      if (activeReview && activeReview.nodeId === sourceNodeId) {
        useDiffReviewStore.getState().finishSessionForUserEdit(activeReview.requestId);
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
    [getCurrentValue, openConflict, resetBaseline, resumeDraftSave, scheduleDraftSaveFrom],
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
      dedupedToast.error(t2("canvas.textConflict.blockedClose", "请先处理完所有冲突再退出"));
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
  const scheduleSelectionReport = useEditingSelectionReporter(onEditingSelectionChange);
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
      current2.canUndo === next2.canUndo && current2.canRedo === next2.canRedo ? current2 : next2,
    );
  }, []);
  const lineHeightRef = reactExports.useRef(null);
  const findAdapter = reactExports.useMemo(
    () => ({
      search(query, options) {
        if (isCodeMirror) {
          const result = codeMirrorRef.current?.findMatches(query, options, MAX_FIND_MATCHES);
          return {
            matches: result?.matches ?? [],
            limited: result?.limited ?? false,
            caretPos: codeMirrorRef.current?.getCaretPosition() ?? 0,
          };
        }
        const value = getCurrentValue();
        const { matches: matches2, limited } = findMatchesInText(value, query, options, {
          maxMatches: MAX_FIND_MATCHES,
        });
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
        if (!el || el.selectionStart == null || el.selectionEnd == null) return "";
        return el.value.slice(el.selectionStart, el.selectionEnd);
      },
      focusEditor: focusCurrentEditor,
      replaceOne(match2, query, options, replacement) {
        const matchedText = isCodeMirror
          ? (codeMirrorRef.current?.getText(match2.from, match2.to) ?? "")
          : getCurrentValue().slice(match2.from, match2.to);
        const expanded = computeReplacement(matchedText, query, options, replacement);
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
  const sourceEditorBlocked = sourceDiffReview.active || conflict.active || versionPanel.previewing;
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
      activeElement2.closest('[data-action-ui-id="canvas-text-large-markdown-editor"]') !== null;
    if (belongsToSourceEditor) activeElement2.blur();
  }, [sourceEditorBlocked]);
  return (
    <FullscreenShell
      find={find2}
      onClose={handleClose}
      saveStatus={
        <TextSaveStatus draftStatus={draftSaveStatus} versionSaving={versionPanel.versionSaving} />
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
            <SourceEditorHistoryControls editorRef={codeMirrorRef} availability={sourceHistory} />
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
      <DiffPendingDialog open={diffPendingOpen} onDismiss={() => setDiffPendingOpen(false)} />
    </FullscreenShell>
  );
}
export function MarkdownFullscreen({
  initialMarkdown,
  onClose,
  onDraftChange,
  externalRevision,
  sourceNodeId,
  documentPath,
  onAnnotationsChange,
  onAnnotationActivate,
  subscribeAnnotationCommand,
  onEditingSelectionChange,
  getCloseBlockReason,
}) {
  const { t: t2 } = useTranslation();
  const closedRef = reactExports.useRef(false);
  const initializedRef = reactExports.useRef(false);
  const userEditedRef = reactExports.useRef(false);
  const externalUpdatedWhileEditingRef = reactExports.useRef(false);
  const programmaticUpdateRef = reactExports.useRef(false);
  const externalMarkdownRef = reactExports.useRef(initialMarkdown);
  externalMarkdownRef.current = initialMarkdown;
  const dirtyState = useTextDocumentDirty();
  const markDirty = dirtyState.markDirty;
  const [diffPendingOpen, setDiffPendingOpen] = reactExports.useState(false);
  const hasPendingDiffReview = useDiffReviewStore((state2) =>
    selectHasPendingHunksForNode(state2, sourceNodeId),
  );
  const hasPendingDiffReviewRef = reactExports.useRef(hasPendingDiffReview);
  hasPendingDiffReviewRef.current = hasPendingDiffReview;
  const [contentRevision, setContentRevision] = reactExports.useState(0);
  const reviewReverting = useDiffReviewStore((state2) => state2.reverting);
  const reviewRequestId = useDiffReviewStore((state2) => state2.session?.requestId ?? null);
  const expectedReviewWriteAcksRef = reactExports.useRef(createDiffReviewWriteAckTracker());
  reactExports.useEffect(() => {
    if (reviewRequestId) {
      beginDiffReviewWriteAckEpoch(expectedReviewWriteAcksRef.current, reviewRequestId);
    }
  }, [reviewRequestId]);
  const deferredReviewMarkdownRef = reactExports.useRef(null);
  const {
    status: draftSaveStatus,
    latestDraftRef,
    scheduleDraftSave,
    pauseDraftSave,
    resumeDraftSave,
    forceDraftSave,
    flushDraftSave,
    flushDraftSaveAsync,
    resetBaseline,
  } = useDebouncedDraftSave(initialMarkdown, onDraftChange);
  const findRef = reactExports.useRef(null);
  const scheduleSelectionReport = useEditingSelectionReporter(onEditingSelectionChange);
  const fsEditor = useEditor({
    extensions: [
      src_default,
      ScrollableMarkdownTable,
      TableRow$1,
      TableHeader$1,
      TableCell$1,
      Markdown,
      src_default$1.configure({
        placeholder: t2("canvas.editorPlaceholder"),
      }),
      FindHighlight,
      AnnotationHighlight,
      DiffReviewHighlight,
      BlurSelectionHighlight,
    ],
    content: "",
    editorProps: {
      attributes: {
        class: "outline-none min-h-[200px] text-sm",
        style: "color: var(--fg-default, #141414); caret-color: var(--canvas-text-accent)",
      },
    },
    onCreate: ({ editor }) => {
      preserveMarkdownFidelity(editor);
    },
    onSelectionUpdate: ({ editor }) => {
      if (!initializedRef.current) return;
      scheduleSelectionReport(() => buildPmSelectionState(editor.state));
    },
    onUpdate: ({ editor, transaction }) => {
      if (!initializedRef.current) return;
      scheduleSelectionReport(() => buildPmSelectionState(editor.state));
      if (programmaticUpdateRef.current || transaction.getMeta(DIFF_REVIEW_SYNC_META)) return;
      if (getAnnotationHistorySnapshot(transaction)) return;
      const reviewSnapshot = getDiffReviewHistorySnapshot(transaction);
      const markdown2 = editor.getMarkdown();
      if (reviewSnapshot) {
        enqueueDiffReviewWriteAck(
          expectedReviewWriteAcksRef.current,
          markdown2,
          reviewSnapshot.requestId,
        );
        markDirty();
        scheduleDraftSave(markdown2);
        flushDraftSave();
        findRef.current?.refresh();
        return;
      }
      const activeReview = useDiffReviewStore.getState().session;
      if (activeReview && activeReview.nodeId === sourceNodeId) {
        const reviewedMarkdown = serializeMarkdownDocument(editor, transaction.before);
        if (reviewedMarkdown !== null) {
          const baseline =
            activeReview.baselineMarkdown ??
            reconstructDiffReviewBaseline(reviewedMarkdown, activeReview) ??
            reviewedMarkdown;
          splitCompletedReviewFromUserEdit(
            editor,
            baseline,
            reviewedMarkdown,
            markdown2,
            activeReview.historyDepthAtStart,
          );
        }
        useDiffReviewStore.getState().finishSessionForUserEdit(activeReview.requestId);
      }
      userEditedRef.current = true;
      markDirty();
      scheduleDraftSave(markdown2);
      findRef.current?.refresh();
    },
  });
  reactExports.useEffect(() => {
    if (!fsEditor || initializedRef.current) return;
    if (initialMarkdown) {
      fsEditor
        .chain()
        .command(({ tr: tr2 }) => {
          tr2.setMeta("addToHistory", false);
          return true;
        })
        .setContent(initialMarkdown, {
          contentType: "markdown",
        })
        .run();
    }
    resetProseMirrorHistory(fsEditor);
    initializedRef.current = true;
    setContentRevision((rev) => rev + 1);
    if (useDiffReviewStore.getState().pendingScrollToFirstHunkNodeId !== sourceNodeId) {
      const frame2 = requestAnimationFrame(() => {
        if (!fsEditor.isDestroyed) fsEditor.commands.focus("start");
      });
      return () => cancelAnimationFrame(frame2);
    }
  }, [fsEditor, initialMarkdown, sourceNodeId]);
  const canvasRootEl = useCanvasRootElement();
  const handleAnnotationConflict = reactExports.useCallback(() => {
    dedupedToast.error(t2("canvas.annotationConflict", "选区与已有批注重叠，请重新选择"));
  }, [t2]);
  const annotations = useAnnotations(fsEditor, {
    onSnapshotsChange: onAnnotationsChange,
    onActivate: onAnnotationActivate,
    onConflict: handleAnnotationConflict,
  });
  const handleAnnotationStart = reactExports.useCallback(() => {
    startTextAnnotation(getCloseBlockReason, annotations.begin, () => {
      dedupedToast.warning(
        t2(
          "canvas.annotationAgentRunning",
          "Text Assistant is running. Annotation is unavailable.",
        ),
      );
    });
  }, [annotations.begin, getCloseBlockReason, t2]);
  const editorAnnotationsRef = reactExports.useRef(annotations);
  editorAnnotationsRef.current = annotations;
  useEditorHistoryShortcuts(fsEditor, sourceNodeId);
  reactExports.useEffect(() => {
    if (!subscribeAnnotationCommand) return;
    return subscribeAnnotationCommand((cmd2) => editorAnnotationsRef.current.handleCommand(cmd2));
  }, [subscribeAnnotationCommand]);
  const [editorAreaEl, setEditorAreaEl] = reactExports.useState(null);
  const applySync = reactExports.useCallback(
    (md) => {
      if (!fsEditor) return false;
      const reviewState = useDiffReviewStore.getState();
      if (reviewState.reverting && reviewState.session?.nodeId === sourceNodeId) {
        deferredReviewMarkdownRef.current = md;
        return false;
      }
      if (consumeDiffReviewWriteAck(expectedReviewWriteAcksRef.current, md)) {
        setContentRevision((rev) => rev + 1);
        return fsEditor.getMarkdown() === md;
      }
      if (pendingDiffReviewWriteAckCount(expectedReviewWriteAcksRef.current) > 0) {
        clearDiffReviewWriteAcks(expectedReviewWriteAcksRef.current);
      }
      const activeReview = reviewState.session;
      if (
        activeReview &&
        activeReview.nodeId === sourceNodeId &&
        activeReview.baselineMarkdown === void 0
      ) {
        const baselineMarkdown = fsEditor.getMarkdown();
        if (baselineMarkdown !== md) markDirty();
        const requestId = activeReview.requestId;
        const expectedContentHash = activeReview.contentHash;
        void hashDiffReviewMarkdown(md)
          .then((contentHash) => {
            if (fsEditor.isDestroyed || contentHash !== expectedContentHash) return;
            const current2 = useDiffReviewStore.getState().session;
            if (
              !current2 ||
              current2.requestId !== requestId ||
              current2.baselineMarkdown !== void 0
            )
              return;
            editorAnnotationsRef.current.reset();
            const historyDepthAtStart = recordProvisionalDiffReviewHistory(
              fsEditor,
              baselineMarkdown,
              md,
              true,
            );
            useDiffReviewStore
              .getState()
              .setBaselineMarkdown(requestId, baselineMarkdown, historyDepthAtStart);
            setContentRevision((rev) => rev + 1);
          })
          .catch(() => {});
        return true;
      }
      editorAnnotationsRef.current.reset();
      if (fsEditor.getMarkdown() !== md) markDirty();
      programmaticUpdateRef.current = true;
      try {
        fsEditor
          .chain()
          .command(({ tr: tr2 }) => {
            tr2.setMeta("addToHistory", false);
            return true;
          })
          .setContent(md, {
            contentType: "markdown",
          })
          .run();
        resetProseMirrorHistory(fsEditor);
      } finally {
        programmaticUpdateRef.current = false;
      }
      setContentRevision((rev) => rev + 1);
      return true;
    },
    [fsEditor, sourceNodeId, markDirty],
  );
  const getMineMarkdown = reactExports.useCallback(
    () => fsEditor?.getMarkdown() ?? initialMarkdown,
    [fsEditor, initialMarkdown],
  );
  const handleConflictResolved = reactExports.useCallback(
    (merged) => {
      externalUpdatedWhileEditingRef.current = false;
      if (fsEditor && !fsEditor.isDestroyed && fsEditor.getMarkdown() !== merged) {
        applySync(merged);
      }
      userEditedRef.current = true;
      forceDraftSave(merged);
    },
    [applySync, forceDraftSave, fsEditor],
  );
  const conflict = useTextConflictResolver({
    getMineMarkdown,
    onResolved: handleConflictResolved,
  });
  const openConflict = conflict.open;
  const handleExternalConflict = reactExports.useCallback(
    (external) => {
      if (hasPendingDiffReviewRef.current) {
        externalUpdatedWhileEditingRef.current = false;
        resumeDraftSave();
        return;
      }
      if (openConflict(external)) return;
      const current2 = fsEditor?.getMarkdown() ?? external;
      externalUpdatedWhileEditingRef.current = false;
      resetBaseline(external);
      resumeDraftSave();
      if (current2 !== external) scheduleDraftSave(current2);
    },
    [fsEditor, openConflict, resetBaseline, resumeDraftSave, scheduleDraftSave],
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
  reactExports.useEffect(() => {
    if (reviewReverting || deferredReviewMarkdownRef.current === null) return;
    const markdown2 = deferredReviewMarkdownRef.current;
    deferredReviewMarkdownRef.current = null;
    if (consumeDiffReviewWriteAck(expectedReviewWriteAcksRef.current, markdown2)) {
      if (fsEditor?.getMarkdown() === markdown2) resetBaseline(markdown2);
      setContentRevision((rev) => rev + 1);
      return;
    }
    const shouldResetBaseline = applySync(markdown2);
    if (shouldResetBaseline !== false) resetBaseline(markdown2);
  }, [reviewReverting, applySync, resetBaseline, fsEditor]);
  const handleReviewDocumentApplied = reactExports.useCallback(
    (markdown2) => {
      const requestId = useDiffReviewStore.getState().session?.requestId;
      if (requestId) {
        enqueueDiffReviewWriteAck(expectedReviewWriteAcksRef.current, markdown2, requestId);
      }
      resetBaseline(markdown2);
      setContentRevision((rev) => rev + 1);
    },
    [resetBaseline],
  );
  useDiffReview(fsEditor, sourceNodeId, contentRevision, {
    sourceMarkdown: initialMarkdown,
    onReviewDocumentApplied: handleReviewDocumentApplied,
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
    if (!fsEditor) {
      finalizeClose();
      return;
    }
    if (hasPendingDiffReviewRef.current) {
      setDiffPendingOpen(true);
      return;
    }
    if (conflict.active) {
      dedupedToast.error(t2("canvas.textConflict.blockedClose", "请先处理完所有冲突再退出"));
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
    latestDraftRef.current = fsEditor.getMarkdown();
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
    fsEditor,
    latestDraftRef,
    onDraftChange,
    openConflict,
    t2,
  ]);
  const findAdapter = reactExports.useMemo(
    () => ({
      search(query, options) {
        if (!fsEditor)
          return {
            matches: [],
            limited: false,
            caretPos: 0,
          };
        const { matches: matches2, limited } = searchPmDoc(
          fsEditor.state.doc,
          query,
          options,
          MAX_FIND_MATCHES,
        );
        return {
          matches: matches2,
          limited,
          caretPos: fsEditor.state.selection.from,
        };
      },
      activate(matches2, index2) {
        if (!fsEditor) return;
        if (index2 < 0 || index2 >= matches2.length) return;
        fsEditor.view.dispatch(
          fsEditor.state.tr.setMeta(findPluginKey, {
            ranges: matches2,
            activeIndex: index2,
          }),
        );
        requestAnimationFrame(() => {
          fsEditor.view.dom.querySelector(`.${FIND_MATCH_ACTIVE_CLASS}`)?.scrollIntoView({
            block: "nearest",
          });
        });
      },
      clear() {
        if (!fsEditor) return;
        fsEditor.view.dispatch(
          fsEditor.state.tr.setMeta(findPluginKey, {
            ranges: [],
            activeIndex: -1,
          }),
        );
      },
      getSelectedText() {
        if (!fsEditor) return "";
        const { from: from2, to } = fsEditor.state.selection;
        return from2 === to ? "" : fsEditor.state.doc.textBetween(from2, to, "\n");
      },
      focusEditor() {
        fsEditor?.commands.focus();
      },
      replaceOne(match2, query, options, replacement) {
        if (!fsEditor) return;
        const matched = fsEditor.state.doc.textBetween(
          match2.from,
          match2.to,
          void 0,
          LEAF_PLACEHOLDER,
        );
        const expanded = computeReplacement(matched, query, options, replacement);
        const tr2 = fsEditor.state.tr.insertText(expanded, match2.from, match2.to);
        tr2.setSelection(TextSelection.create(tr2.doc, match2.from + expanded.length));
        fsEditor.view.dispatch(tr2);
      },
      replaceAll(query, options, replacement) {
        if (!fsEditor) return;
        const { matches: matches2 } = searchPmDoc(fsEditor.state.doc, query, options);
        if (matches2.length === 0) return;
        const tr2 = fsEditor.state.tr;
        for (let i2 = matches2.length - 1; i2 >= 0; i2--) {
          const m3 = matches2[i2];
          const matched = fsEditor.state.doc.textBetween(m3.from, m3.to, void 0, LEAF_PLACEHOLDER);
          tr2.insertText(computeReplacement(matched, query, options, replacement), m3.from, m3.to);
        }
        fsEditor.view.dispatch(tr2);
      },
    }),
    [fsEditor],
  );
  const find2 = useFindController(findAdapter);
  findRef.current = find2;
  useFindEscapeClose(find2, handleClose);
  const [tableCtxPos, setTableCtxPos] = reactExports.useState(null);
  const closeTableCtxMenu = reactExports.useCallback(() => setTableCtxPos(null), []);
  const handleEditorContextMenu = reactExports.useCallback(
    (e2) => {
      if (!fsEditor) return;
      if (!e2.target.closest("td, th")) return;
      e2.preventDefault();
      const coords = fsEditor.view.posAtCoords({
        left: e2.clientX,
        top: e2.clientY,
      });
      if (coords) fsEditor.chain().setTextSelection(coords.pos).run();
      setTableCtxPos({
        x: e2.clientX,
        y: e2.clientY,
      });
    },
    [fsEditor],
  );
  const canvasActions = reactExports.useContext(CanvasActionsContext);
  const handleConvertToNode = reactExports.useMemo(() => {
    if (!canvasActions || !fsEditor) return void 0;
    return () => {
      const grid = extractTableGridAtSelection(fsEditor);
      if (!grid) return;
      const doc2 = tableDocumentFromGrid(grid, t2("canvas.table.untitledColumn", "Untitled"));
      void canvasActions.addTableNodeFromDocument(doc2, sourceNodeId).then((nodeId) => {
        if (nodeId) dedupedToast.success(t2("canvas.mdTable.toNodeDone", "已插入表格节点"));
        else dedupedToast.error(t2("canvas.mdTable.toNodeFailed", "插入表格节点失败"));
      });
    };
  }, [canvasActions, fsEditor, sourceNodeId, t2]);
  const formatItems = reactExports.useMemo(
    () => (fsEditor ? buildFormatItems(fsEditor, t2) : []),
    [fsEditor, t2],
  );
  const flushForVersionSave = reactExports.useCallback(async () => {
    if (fsEditor) latestDraftRef.current = fsEditor.getMarkdown();
    await flushDraftSaveAsync();
  }, [fsEditor, flushDraftSaveAsync, latestDraftRef]);
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
    // A snapshot taken mid-review would checkpoint hunks the user has neither
    // accepted nor undone — same reason closing is blocked. An unresolved
    // conflict merge is blocked for exactly the same reason.
    disabled: hasPendingDiffReview || conflict.active,
    dirty: dirtyState,
    getContent: getMineMarkdown,
  });
  return (
    <FullscreenShell
      saveStatus={
        <TextSaveStatus draftStatus={draftSaveStatus} versionSaving={versionPanel.versionSaving} />
      }
      headerLeft={
        conflict.active
          ? conflict.headerLeft
          : versionPanel.previewing
            ? versionPanel.previewHeaderLeft
            : null
      }
      overlay={conflict.active ? conflict.body : versionPanel.preview}
      hideFind={versionPanel.previewing || conflict.active}
      hideClose={versionPanel.previewing}
      toolbarActions={
        conflict.active ? (
          conflict.toolbarActions
        ) : versionPanel.previewing ? (
          versionPanel.previewToolbar
        ) : fsEditor ? (
          <>
            <EditorHistoryControls editor={fsEditor} nodeId={sourceNodeId} />
            <ToolbarSeparator$1 />
            {versionPanel.toolbarButtons}
          </>
        ) : (
          versionPanel.toolbarButtons
        )
      }
      find={find2}
      onClose={handleClose}
    >
      {fsEditor && (
        <SelectionFormatToolbar
          editor={fsEditor}
          formatItems={formatItems}
          annotate={{
            label: t2("canvas.annotate", "批注"),
            onClick: handleAnnotationStart,
          }}
        />
      )}
      <div ref={setEditorAreaEl} className="relative" onContextMenu={handleEditorContextMenu}>
        <EditorContent editor={fsEditor} />
        <MarkdownTableScrollbars editorRoot={editorAreaEl} />
        {fsEditor && (
          <AnnotationGutter
            editor={fsEditor}
            markers={annotations.markers}
            activeId={annotations.activeId}
            anchorEl={editorAreaEl}
            onActivate={annotations.activate}
          />
        )}
      </div>
      {fsEditor && tableCtxPos && (
        <TableContextMenu
          editor={fsEditor}
          position={tableCtxPos}
          onClose={closeTableCtxMenu}
          onConvertToNode={handleConvertToNode}
        />
      )}
      {versionPanel.dialog}
      <DiffPendingDialog open={diffPendingOpen} onDismiss={() => setDiffPendingOpen(false)} />
      {annotations.pending && (
        <AnnotationInput
          editor={fsEditor}
          annotationId={annotations.pending.id}
          value={annotations.pendingComment}
          placeholder={t2("canvas.annotationPlaceholder", "添加批注……")}
          portalTarget={canvasRootEl}
          boundsEl={editorAreaEl}
          onChange={annotations.updatePendingComment}
          onClose={annotations.closePending}
        />
      )}
    </FullscreenShell>
  );
}
