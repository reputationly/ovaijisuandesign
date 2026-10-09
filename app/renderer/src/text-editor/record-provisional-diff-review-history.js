// record-provisional-diff-review-history.js
import { undoDepth$1 as undoDepth } from "../vendor.js";
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
  const selection2 = editor.state.selection.toJSON();
  const selectionPosition = editor.state.selection.from;
  if (!editorIsAtBaseline)
    replaceEditorMarkdown(editor, baselineMarkdown, false);
  replaceEditorMarkdown(editor, appliedMarkdown, true);
  closeDiffReviewHistoryGroup(editor);
  restoreEditorSelection(editor, selection2, selectionPosition);
  return historyDepthAtStart;
}
