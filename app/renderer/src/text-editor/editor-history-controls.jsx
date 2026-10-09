// editor-history-controls.jsx
import { __jsx } from "../shared/jsx-runtime.js";
import {
  jsxRuntimeExports,
  redo$1 as redo,
  Redo2,
  redoDepth$1 as redoDepth,
  undo$1 as undo,
  Undo2,
  undoDepth$1,
  useEditorState$1 as useEditorState,
  useTranslation,
} from "../vendor.js";
import { useDiffReviewStore } from "./use-diff-review-store.js";
export function ToolbarSeparator({ contextToolbar = false }) {
  if (contextToolbar)
    return <div className="canvas-toolbar-separator" aria-hidden="true" />;
  return (
    <div
      className="mx-1 h-4 w-px"
      style={{
        background: "var(--border-default, #e0e0e0)",
      }}
    />
  );
}
export function ToolbarBtn({ item, contextToolbar = false }) {
  return (
    <>
      {item.separator && <ToolbarSeparator contextToolbar={contextToolbar} />}
      <button
        type="button"
        title={typeof item.label === "string" ? item.label : void 0}
        onClick={item.onClick}
        disabled={item.disabled}
        className={
          contextToolbar
            ? "canvas-toolbar-action"
            : "flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-[var(--bg-subtle,#f5f5f5)] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
        }
        data-active={contextToolbar ? item.active : void 0}
        style={
          contextToolbar
            ? void 0
            : {
                color: "var(--fg-muted, #666)",
                background: item.active ? "var(--bg-subtle, #f5f5f5)" : void 0,
              }
        }
        data-action-ui-id={item.dataActionUiId}
      >
        {item.icon}
      </button>
    </>
  );
}
function getEditorHistoryAvailability(state2) {
  return {
    canUndo: undoDepth$1(state2) > 0,
    canRedo: redoDepth(state2) > 0,
  };
}
export function EditorHistoryControls({ editor, nodeId }) {
  const { t: t2 } = useTranslation();
  const reviewReverting = useDiffReviewStore((state2) => state2.reverting);
  const reviewSession = useDiffReviewStore((state2) => state2.session);
  const availability = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) =>
      currentEditor
        ? {
            ...getEditorHistoryAvailability(currentEditor.state),
            undoDepth: undoDepth$1(currentEditor.state),
          }
        : {
            canUndo: false,
            canRedo: false,
            undoDepth: 0,
          },
  }) ?? {
    canUndo: false,
    canRedo: false,
    undoDepth: 0,
  };
  if (!editor) return null;
  const reviewUndoBlocked =
    reviewSession !== null &&
    reviewSession.nodeId === nodeId &&
    (reviewSession.baselineMarkdown === void 0 ||
      availability.undoDepth <= (reviewSession.historyDepthAtStart ?? 0) + 1);
  return (
    <>
      <ToolbarBtn
        item={{
          id: "undo",
          label: t2("canvas.undo", "Undo"),
          icon: <Undo2 size={16} strokeWidth={1.5} aria-hidden="true" />,
          disabled:
            reviewReverting || reviewUndoBlocked || !availability.canUndo,
          onClick: () => {
            editor.commands.focus();
            undo(editor.state, editor.view.dispatch);
          },
          dataActionUiId: "canvas-text-undo",
        }}
      />
      <ToolbarBtn
        item={{
          id: "redo",
          label: t2("canvas.redo", "Redo"),
          icon: <Redo2 size={16} strokeWidth={1.5} aria-hidden="true" />,
          disabled: reviewReverting || !availability.canRedo,
          onClick: () => {
            editor.commands.focus();
            redo(editor.state, editor.view.dispatch);
          },
          dataActionUiId: "canvas-text-redo",
        }}
      />
    </>
  );
}
