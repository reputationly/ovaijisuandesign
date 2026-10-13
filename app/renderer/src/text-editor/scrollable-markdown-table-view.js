// scrollable-markdown-table-view.js
import {
  closeHistory,
  Decoration2,
  Selection,
  Step,
  StepMap,
  StepResult,
  TableView2,
  undo$1 as undo,
  undoDepth$1 as undoDepth,
} from "../vendor.js";
import { HorizontalRuleWidget } from "../vendor-inline/codemirror/line2.js";
export const hiddenMark = Decoration2.replace({});
export const horizontalRule = Decoration2.replace({
  widget: new HorizontalRuleWidget(),
});
export const blankLine = Decoration2.line({
  class: "cm-md-blank",
});
export const blankLineExtra = Decoration2.line({
  class: "cm-md-blank cm-md-blank-extra",
});
export const LEAF_PLACEHOLDER = "￼";
export const DIFF_REVIEW_SYNC_META = "canvasDiffReviewSync";
function cloneSession(session) {
  return {
    ...session,
    hunks: session.hunks.map((hunk) => ({
      ...hunk,
    })),
  };
}
class DiffReviewBoundaryStep extends Step {
  apply(doc) {
    return StepResult.ok(doc);
  }
  getMap() {
    return StepMap.empty;
  }
  invert() {
    return this;
  }
  map() {
    return this;
  }
  toJSON() {
    return {
      stepType: "canvasDiffReviewBoundary",
    };
  }
}
export class DiffReviewHistoryStep extends Step {
  before;
  after;
  constructor(before, after) {
    super();
    this.before = cloneSession(before);
    this.after = cloneSession(after);
  }
  apply(doc) {
    return StepResult.ok(doc);
  }
  getMap() {
    return StepMap.empty;
  }
  invert() {
    return new DiffReviewHistoryStep(this.after, this.before);
  }
  map() {
    return this;
  }
  toJSON() {
    return {
      stepType: "canvasDiffReviewHistory",
      before: this.before,
      after: this.after,
    };
  }
}
export function getDiffReviewHistorySnapshot(transaction) {
  for (let index = transaction.steps.length - 1; index >= 0; index -= 1) {
    const step = transaction.steps[index];
    if (step instanceof DiffReviewHistoryStep) return cloneSession(step.after);
  }
  return null;
}
export function selectionNearPosition(doc, position) {
  return Selection.near(
    doc.resolve(Math.max(0, Math.min(position, doc.content.size))),
  );
}
export function selectionFromSnapshot(doc, snapshot, fallbackPosition) {
  try {
    return Selection.fromJSON(doc, snapshot);
  } catch {
    return selectionNearPosition(doc, fallbackPosition);
  }
}
export function closeDiffReviewHistoryGroup(editor) {
  if (editor.isDestroyed) return;
  const transaction = closeHistory(editor.state.tr);
  transaction.setMeta("addToHistory", false);
  transaction.setMeta(DIFF_REVIEW_SYNC_META, true);
  editor.view.dispatch(transaction);
}
export function recordFinalizedBoundary(editor) {
  const transaction = closeHistory(editor.state.tr).step(
    new DiffReviewBoundaryStep(),
  );
  transaction.setMeta(DIFF_REVIEW_SYNC_META, true);
  editor.view.dispatch(transaction);
}
export function rewindReviewHistory(editor, targetDepth) {
  let state = editor.state;
  let currentDepth = undoDepth(state);
  while (currentDepth > targetDepth) {
    let nextState = null;
    const handled = undo(state, (transaction) => {
      nextState = state.apply(transaction);
    });
    if (!handled || !nextState) break;
    state = nextState;
    currentDepth = undoDepth(state);
  }
  if (state !== editor.state) editor.view.updateState(state);
}
export function restoreEditorSelection(editor, selection, fallbackPosition) {
  const transaction = editor.state.tr.setSelection(
    selectionFromSnapshot(editor.state.doc, selection, fallbackPosition),
  );
  transaction.setMeta("addToHistory", false);
  transaction.setMeta(DIFF_REVIEW_SYNC_META, true);
  editor.view.dispatch(transaction);
}
export function replaceEditorMarkdown(
  editor,
  markdown,
  addToHistory,
  selection,
  fallbackPosition = 0,
) {
  let chain = editor
    .chain()
    .command(({ tr }) => {
      if (addToHistory) closeHistory(tr);
      else tr.setMeta("addToHistory", false);
      tr.setMeta(DIFF_REVIEW_SYNC_META, true);
      return true;
    })
    .setContent(markdown, {
      contentType: "markdown",
    });
  if (selection) {
    chain = chain.command(({ tr }) => {
      tr.setSelection(
        selectionFromSnapshot(tr.doc, selection, fallbackPosition),
      );
      return true;
    });
  }
  chain.run();
}
export const MARKDOWN_TABLE_CELL_MAX_WIDTH = 200;
const OVERLAY_SCROLLBAR_TRACK_SELECTOR = ".hilo-overlay-scrollbar-track";
function isOverlayScrollbarChrome(node) {
  return (
    node instanceof Element &&
    (node.matches(OVERLAY_SCROLLBAR_TRACK_SELECTOR) ||
      node.closest(OVERLAY_SCROLLBAR_TRACK_SELECTOR) !== null)
  );
}
export class ScrollableMarkdownTableView extends TableView2 {
  constructor(
    node,
    cellMinWidth,
    cellMaxWidth = MARKDOWN_TABLE_CELL_MAX_WIDTH,
  ) {
    super(node, cellMinWidth);
    this.dom.classList.add("canvas-markdown-table-scroll-shell");
    this.dom.style.setProperty(
      "--canvas-markdown-table-cell-max-width",
      `${cellMaxWidth}px`,
    );
    this.applyAdaptiveTableWidth();
    const scrollViewport = document.createElement("div");
    scrollViewport.className =
      "canvas-markdown-table-scroll-viewport native-scrollbar-hidden";
    this.dom.insertBefore(scrollViewport, this.table);
    scrollViewport.appendChild(this.table);
  }
  update(node) {
    const updated = super.update(node);
    if (updated) this.applyAdaptiveTableWidth();
    return updated;
  }
  ignoreMutation(mutation) {
    if (isOverlayScrollbarChrome(mutation.target)) return true;
    if (mutation.type === "childList" && mutation.target === this.dom) {
      const changedNodes = [...mutation.addedNodes, ...mutation.removedNodes];
      if (
        changedNodes.length > 0 &&
        changedNodes.every(isOverlayScrollbarChrome)
      )
        return true;
    }
    return super.ignoreMutation(mutation);
  }
  applyAdaptiveTableWidth() {
    this.table.style.width = "max-content";
    this.table.style.minWidth = "100%";
  }
}
