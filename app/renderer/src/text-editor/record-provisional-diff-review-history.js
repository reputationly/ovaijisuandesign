// record-provisional-diff-review-history.js
import { undoDepth } from "prosemirror-history";
import {
  closeDiffReviewHistoryGroup,
  replaceEditorMarkdown,
  restoreEditorSelection,
} from "./scrollable-markdown-table-view.js";
export function recordProvisionalDiffReviewHistory(
  editor,
  baselineMarkdown,
  appliedMarkdown,
  editorIsAtBaseline,
) {
  const historyDepthAtStart = undoDepth(editor.state);
  const selection = editor.state.selection.toJSON();
  const selectionPosition = editor.state.selection.from;
  if (!editorIsAtBaseline)
    replaceEditorMarkdown(editor, baselineMarkdown, false);
  replaceEditorMarkdown(editor, appliedMarkdown, true);
  closeDiffReviewHistoryGroup(editor);
  restoreEditorSelection(editor, selection, selectionPosition);
  return historyDepthAtStart;
}
