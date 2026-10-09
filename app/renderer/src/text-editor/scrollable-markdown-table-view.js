// scrollable-markdown-table-view.js
import {
  closeHistory,
  Decoration2,
  Selection,
  Step,
  StepMap,
  StepResult,
  TableView2,
  undo$1,
  undoDepth$1,
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
  apply(doc2) {
    return StepResult.ok(doc2);
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
  apply(doc2) {
    return StepResult.ok(doc2);
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
  for (let index2 = transaction.steps.length - 1; index2 >= 0; index2 -= 1) {
    const step = transaction.steps[index2];
    if (step instanceof DiffReviewHistoryStep) return cloneSession(step.after);
  }
  return null;
}

export function selectionNearPosition(doc2, position2) {
  return Selection.near(
    doc2.resolve(Math.max(0, Math.min(position2, doc2.content.size))),
  );
}

export function selectionFromSnapshot(doc2, snapshot2, fallbackPosition) {
  try {
    return Selection.fromJSON(doc2, snapshot2);
  } catch {
    return selectionNearPosition(doc2, fallbackPosition);
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
  let state2 = editor.state;
  let currentDepth = undoDepth$1(state2);
  while (currentDepth > targetDepth) {
    let nextState = null;
    const handled = undo$1(state2, (transaction) => {
      nextState = state2.apply(transaction);
    });
    if (!handled || !nextState) break;
    state2 = nextState;
    currentDepth = undoDepth$1(state2);
  }
  if (state2 !== editor.state) editor.view.updateState(state2);
}

export function restoreEditorSelection(editor, selection2, fallbackPosition) {
  const transaction = editor.state.tr.setSelection(
    selectionFromSnapshot(editor.state.doc, selection2, fallbackPosition),
  );
  transaction.setMeta("addToHistory", false);
  transaction.setMeta(DIFF_REVIEW_SYNC_META, true);
  editor.view.dispatch(transaction);
}

export function replaceEditorMarkdown(
  editor,
  markdown2,
  addToHistory,
  selection2,
  fallbackPosition = 0,
) {
  let chain = editor
    .chain()
    .command(({ tr: tr2 }) => {
      if (addToHistory) closeHistory(tr2);
      else tr2.setMeta("addToHistory", false);
      tr2.setMeta(DIFF_REVIEW_SYNC_META, true);
      return true;
    })
    .setContent(markdown2, {
      contentType: "markdown",
    });
  if (selection2) {
    chain = chain.command(({ tr: tr2 }) => {
      tr2.setSelection(
        selectionFromSnapshot(tr2.doc, selection2, fallbackPosition),
      );
      return true;
    });
  }
  chain.run();
}

export const MARKDOWN_TABLE_CELL_MAX_WIDTH = 200;

const OVERLAY_SCROLLBAR_TRACK_SELECTOR = ".hilo-overlay-scrollbar-track";

function isOverlayScrollbarChrome(node2) {
  return (
    node2 instanceof Element &&
    (node2.matches(OVERLAY_SCROLLBAR_TRACK_SELECTOR) ||
      node2.closest(OVERLAY_SCROLLBAR_TRACK_SELECTOR) !== null)
  );
}

export class ScrollableMarkdownTableView extends TableView2 {
  constructor(
    node2,
    cellMinWidth,
    cellMaxWidth = MARKDOWN_TABLE_CELL_MAX_WIDTH,
  ) {
    super(node2, cellMinWidth);
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
  update(node2) {
    const updated = super.update(node2);
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
