// locate-hunks-in-doc.js
import {
  reactExports,
  Step,
  StepResult,
  StepMap,
  StateEffect,
  Decoration2,
  Selection,
  closeHistory,
  undoDepth$1,
  undo$1,
  TableView2,
  Table$2,
} from "../vendor.js";
import {
  AnnotationHistoryStep,
  addAnnotationMark,
  buildQuote,
  clearAnnotationMarks,
  createAnnotationCaretSelection,
  findConflictingIds,
  getAnnotationHistorySnapshot,
  getAnnotationMarks,
  getAnnotationSelectionRanges,
  groupAnnotationRanges,
  removeAnnotationMark,
  setActiveAnnotationMark,
} from "./annotation-highlight.js";
import { HorizontalRuleWidget } from "../vendor-inline/codemirror/line2.js";
import {
  buildMarkdownNormalizeMap,
  collapseRenderedText,
  stripInlineMarkChars,
  stripInlineMarkCharsWithMap,
} from "../generation/push-inline.js";
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
export const setSourceFindHighlights = StateEffect.define();
const sourceFindMatch = Decoration2.mark({
  class: "canvas-find-match",
});
const sourceFindMatchActive = Decoration2.mark({
  class: "canvas-find-match canvas-find-match-active",
});
const MAX_SOURCE_FIND_DECORATIONS = 2e3;
export function buildSourceFindDecorations(docLength, { matches: matches2, activeIndex }) {
  const ranges = [];
  const push2 = (match2, active2) => {
    if (match2.from < 0 || match2.from >= match2.to || match2.to > docLength) return;
    ranges.push((active2 ? sourceFindMatchActive : sourceFindMatch).range(match2.from, match2.to));
  };
  const count2 = Math.min(matches2.length, MAX_SOURCE_FIND_DECORATIONS);
  for (let i2 = 0; i2 < count2; i2++) push2(matches2[i2], i2 === activeIndex);
  if (activeIndex >= count2 && activeIndex < matches2.length) push2(matches2[activeIndex], true);
  return Decoration2.set(ranges, true);
}
export const LEAF_PLACEHOLDER = "￼";
function isInsideTableCell(doc2, pos) {
  try {
    const $pos = doc2.resolve(Math.min(Math.max(pos, 0), doc2.content.size));
    for (let depth2 = $pos.depth; depth2 > 0; depth2--) {
      const name2 = $pos.node(depth2).type.name;
      if (name2 === "tableCell" || name2 === "tableHeader") return true;
    }
  } catch {}
  return false;
}
function buildDocTextIndex(doc2) {
  const segments = [];
  const parts = [];
  let textStart = 0;
  doc2.descendants((node2, pos) => {
    if (!node2.isTextblock) return true;
    const text2 = node2.textBetween(0, node2.content.size, void 0, LEAF_PLACEHOLDER);
    segments.push({
      textStart,
      pmStart: pos + 1,
      length: text2.length,
      isTableCell: isInsideTableCell(doc2, pos + 1),
    });
    parts.push(text2);
    textStart += text2.length + 1;
    return false;
  });
  return {
    text: parts.join("\n"),
    segments,
  };
}
function toPmPos(index2, offset2, bias) {
  const { segments } = index2;
  if (segments.length === 0) return null;
  for (let i2 = 0; i2 < segments.length; i2++) {
    const seg = segments[i2];
    const segEnd = seg.textStart + seg.length;
    if (offset2 < seg.textStart) {
      if (bias === "start") return seg.pmStart;
      const prev = segments[i2 - 1];
      return prev ? prev.pmStart + prev.length : seg.pmStart;
    }
    if (offset2 <= segEnd) {
      return seg.pmStart + (offset2 - seg.textStart);
    }
  }
  const last2 = segments[segments.length - 1];
  return last2.pmStart + last2.length;
}
function collapseWithMap(text2) {
  const chars2 = [];
  const map3 = [];
  let pendingSpace = -1;
  for (let i2 = 0; i2 < text2.length; i2++) {
    const ch = text2[i2];
    if (ch === " " || ch === "\n" || ch === "	" || ch === "\r" || ch === LEAF_PLACEHOLDER) {
      if (pendingSpace < 0) pendingSpace = i2;
      continue;
    }
    if (pendingSpace >= 0 && chars2.length > 0) {
      chars2.push(" ");
      map3.push(pendingSpace);
    }
    pendingSpace = -1;
    chars2.push(ch);
    map3.push(i2);
  }
  return {
    collapsed: chars2.join(""),
    map: map3,
  };
}
function normalizeMarkdownSnippet(markdown2) {
  if (!markdown2) return "";
  return collapseRenderedText(buildMarkdownNormalizeMap(markdown2).normalized).trim();
}
const TABLE_DELIM_LINE = /^[|\s:-]+$/;
function parseTableRowCells(markdown2) {
  const lines = markdown2
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines.length === 0) return null;
  const cells2 = [];
  for (const line of lines) {
    if (!line.includes("|")) return null;
    if (TABLE_DELIM_LINE.test(line) && line.includes("-")) continue;
    let parts = line.split("|");
    if (parts.length > 0 && parts[0]?.trim() === "") parts = parts.slice(1);
    if (parts.length > 0 && parts[parts.length - 1]?.trim() === "") parts = parts.slice(0, -1);
    for (const part of parts) cells2.push(part.trim());
  }
  return cells2.length > 0 ? cells2 : null;
}
function splitTableHunkCells(index2, hunk, textFrom, textTo) {
  const overlaps = (seg) =>
    Math.max(seg.textStart, textFrom) < Math.min(seg.textStart + seg.length, textTo);
  const covered = index2.segments.filter((seg) => seg.isTableCell && overlaps(seg));
  if (covered.length < 2) return null;
  if (index2.segments.some((seg) => !seg.isTableCell && overlaps(seg))) return null;
  const oldCells = parseTableRowCells(hunk.originalText);
  const newCells = parseTableRowCells(hunk.replacement);
  if (!oldCells || !newCells) return null;
  if (oldCells.length !== covered.length || newCells.length !== covered.length) return null;
  const cells2 = [];
  for (let i2 = 0; i2 < covered.length; i2++) {
    const seg = covered[i2];
    const oldCell = oldCells[i2];
    const newCell = newCells[i2];
    const docCellText = index2.text.slice(seg.textStart, seg.textStart + seg.length);
    if (normalizeMarkdownSnippet(docCellText) !== normalizeMarkdownSnippet(newCell)) return null;
    if (normalizeMarkdownSnippet(oldCell) === normalizeMarkdownSnippet(newCell)) continue;
    const cellFrom = toPmPos(index2, Math.max(seg.textStart, textFrom), "start");
    const cellTo = toPmPos(index2, Math.min(seg.textStart + seg.length, textTo), "end");
    if (cellFrom === null || cellTo === null || cellTo <= cellFrom) return null;
    cells2.push({
      from: cellFrom,
      to: cellTo,
      deletedMarkdown: oldCell,
    });
  }
  return cells2.length > 0 ? cells2 : null;
}
function collectOccurrences(haystack, needle, cap2 = 50) {
  const out = [];
  let cursor = 0;
  while (out.length < cap2) {
    const idx = haystack.indexOf(needle, cursor);
    if (idx < 0) break;
    out.push(idx);
    cursor = idx + 1;
  }
  return out;
}
const CONTEXT_PROBE_CHARS = 14;
export function locateHunksInDoc(doc2, hunks) {
  const result = new Map();
  if (hunks.length === 0) return result;
  const index2 = buildDocTextIndex(doc2);
  const { collapsed, map: map3 } = collapseWithMap(index2.text);
  const usedRanges = [];
  const overlapsUsed = (from2, to) =>
    usedRanges.some((r2) => Math.max(r2.from, from2) < Math.min(r2.to, to));
  for (const hunk of hunks) {
    const needle = normalizeMarkdownSnippet(hunk.replacement);
    const prefixProbe = normalizeMarkdownSnippet(hunk.reversePrefix).slice(-CONTEXT_PROBE_CHARS);
    const suffixProbe = normalizeMarkdownSnippet(hunk.reverseSuffix).slice(0, CONTEXT_PROBE_CHARS);
    if (!needle) {
      result.set(hunk.id, locateDeletionPoint(index2, collapsed, map3, prefixProbe, suffixProbe));
      continue;
    }
    let candidates2 = collectOccurrences(collapsed, needle);
    let candidateLength = needle.length;
    let candidateMap = null;
    if (candidates2.length === 0) {
      const strippedHay = stripInlineMarkCharsWithMap(collapsed);
      const strippedNeedle = stripInlineMarkChars(needle).trim();
      if (strippedNeedle) {
        candidates2 = collectOccurrences(strippedHay.stripped, strippedNeedle);
        candidateLength = strippedNeedle.length;
        candidateMap = strippedHay.map;
      }
    }
    const toCollapsedRange = (idx) => {
      if (!candidateMap)
        return {
          start: idx,
          endChar: idx + candidateLength - 1,
        };
      const start2 = candidateMap[idx];
      const endChar = candidateMap[idx + candidateLength - 1];
      return start2 === void 0 || endChar === void 0
        ? null
        : {
            start: start2,
            endChar,
          };
    };
    if (candidates2.length > 1 && prefixProbe) {
      const byPrefix = candidates2.filter((idx) => {
        const range2 = toCollapsedRange(idx);
        if (!range2) return false;
        return collapsed
          .slice(Math.max(0, range2.start - prefixProbe.length - 1), range2.start)
          .includes(prefixProbe);
      });
      if (byPrefix.length > 0) candidates2 = byPrefix;
    }
    if (candidates2.length > 1 && suffixProbe) {
      const bySuffix = candidates2.filter((idx) => {
        const range2 = toCollapsedRange(idx);
        if (!range2) return false;
        return collapsed
          .slice(range2.endChar + 1, range2.endChar + 1 + suffixProbe.length + 1)
          .includes(suffixProbe);
      });
      if (bySuffix.length > 0) candidates2 = bySuffix;
    }
    const chosen = candidates2.find((idx) => {
      const range2 = toCollapsedRange(idx);
      if (!range2) return false;
      const from22 = map3[range2.start];
      const to2 = map3[range2.endChar] + 1;
      return from22 !== void 0 && to2 !== void 0 && !overlapsUsed(from22, to2);
    });
    const chosenRange = chosen === void 0 ? null : toCollapsedRange(chosen);
    if (!chosenRange) {
      result.set(hunk.id, null);
      continue;
    }
    const textFrom = map3[chosenRange.start];
    const textTo = map3[chosenRange.endChar] + 1;
    usedRanges.push({
      from: textFrom,
      to: textTo,
    });
    const from2 = toPmPos(index2, textFrom, "start");
    const to = toPmPos(index2, textTo, "end");
    if (from2 === null || to === null || to <= from2) {
      result.set(hunk.id, null);
      continue;
    }
    const cells2 = splitTableHunkCells(index2, hunk, textFrom, textTo);
    result.set(
      hunk.id,
      cells2
        ? {
            from: from2,
            to,
            cells: cells2,
          }
        : {
            from: from2,
            to,
          },
    );
  }
  return result;
}
function locateDeletionPoint(index2, collapsed, map3, prefixProbe, suffixProbe) {
  if (prefixProbe) {
    const candidates2 = collectOccurrences(collapsed, prefixProbe);
    for (const idx of candidates2) {
      const end2 = idx + prefixProbe.length;
      const suffixIndex = suffixProbe ? collapsed.indexOf(suffixProbe, end2) : -1;
      if (suffixProbe && (suffixIndex < end2 || suffixIndex > end2 + 1)) continue;
      const sourceOffset =
        suffixIndex >= 0
          ? map3[suffixIndex]
          : map3[end2 - 1] !== void 0
            ? map3[end2 - 1] + 1
            : void 0;
      if (sourceOffset === void 0) continue;
      const pm = toPmPos(index2, sourceOffset, suffixIndex >= 0 ? "start" : "end");
      return pm !== null
        ? {
            from: pm,
            to: pm,
          }
        : null;
    }
    return null;
  }
  if (suffixProbe) {
    const idx = collapsed.indexOf(suffixProbe);
    if (idx < 0) return null;
    const first2 = map3[idx];
    if (first2 === void 0) return null;
    const pm = toPmPos(index2, first2, "start");
    return pm !== null
      ? {
          from: pm,
          to: pm,
        }
      : null;
  }
  return null;
}
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
class DiffReviewHistoryStep extends Step {
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
function selectionNearPosition(doc2, position2) {
  return Selection.near(doc2.resolve(Math.max(0, Math.min(position2, doc2.content.size))));
}
function selectionFromSnapshot(doc2, snapshot2, fallbackPosition) {
  try {
    return Selection.fromJSON(doc2, snapshot2);
  } catch {
    return selectionNearPosition(doc2, fallbackPosition);
  }
}
function locateHunkPosition(doc2, hunk) {
  const range2 = locateHunksInDoc(doc2, [hunk]).get(hunk.id);
  return range2 ? (range2.cells?.[0]?.from ?? range2.from) : null;
}
function locateTransitionAnchor(editor, transition2) {
  if (transition2.kind !== "revert" || !transition2.focusHunkId) return null;
  const hunk = transition2.before.hunks.find(
    (candidate) => candidate.id === transition2.focusHunkId,
  );
  const afterHunk = transition2.after.hunks.find(
    (candidate) => candidate.id === transition2.focusHunkId,
  );
  if (!hunk || !afterHunk || hunk.status === afterHunk.status) return null;
  const position2 = locateHunkPosition(editor.state.doc, hunk);
  return position2 === null
    ? null
    : {
        hunk,
        position: position2,
      };
}
export function recordDiffReviewTransition(editor, transition2) {
  if (editor.isDestroyed || (transition2.kind === "revert" && transition2.content === void 0))
    return false;
  const selectionBefore = editor.state.selection.toJSON();
  const selectionPositionBefore = editor.state.selection.from;
  const transitionAnchor = locateTransitionAnchor(editor, transition2);
  if (transitionAnchor !== null) {
    const selectionTransaction = editor.state.tr.setSelection(
      selectionNearPosition(editor.state.doc, transitionAnchor.position),
    );
    selectionTransaction.setMeta("addToHistory", false);
    selectionTransaction.setMeta(DIFF_REVIEW_SYNC_META, true);
    editor.view.dispatch(selectionTransaction);
  }
  let chain = editor.chain().command(({ tr: tr2 }) => {
    closeHistory(tr2);
    tr2.step(new DiffReviewHistoryStep(transition2.before, transition2.after));
    if (transition2.kind === "revert") tr2.setMeta(DIFF_REVIEW_SYNC_META, true);
    return true;
  });
  if (transition2.kind === "revert") {
    chain = chain.setContent(transition2.content ?? "", {
      contentType: "markdown",
    });
    chain = chain.command(({ tr: tr2 }) => {
      if (transitionAnchor === null) {
        tr2.setSelection(selectionFromSnapshot(tr2.doc, selectionBefore, selectionPositionBefore));
        return true;
      }
      const revertedHunk = {
        ...transitionAnchor.hunk,
        originalText: transitionAnchor.hunk.replacement,
        replacement: transitionAnchor.hunk.originalText,
      };
      const revertedPosition =
        locateHunkPosition(tr2.doc, revertedHunk) ?? transitionAnchor.position;
      tr2.setSelection(selectionNearPosition(tr2.doc, revertedPosition));
      return true;
    });
  }
  const recorded = chain.run();
  if (recorded) closeDiffReviewHistoryGroup(editor);
  return recorded;
}
function closeDiffReviewHistoryGroup(editor) {
  if (editor.isDestroyed) return;
  const transaction = closeHistory(editor.state.tr);
  transaction.setMeta("addToHistory", false);
  transaction.setMeta(DIFF_REVIEW_SYNC_META, true);
  editor.view.dispatch(transaction);
}
export function recordProvisionalDiffReviewHistory(
  editor,
  baselineMarkdown,
  appliedMarkdown,
  editorIsAtBaseline,
) {
  const historyDepthAtStart = undoDepth$1(editor.state);
  const selection2 = editor.state.selection.toJSON();
  const selectionPosition = editor.state.selection.from;
  if (!editorIsAtBaseline) replaceEditorMarkdown(editor, baselineMarkdown, false);
  replaceEditorMarkdown(editor, appliedMarkdown, true);
  closeDiffReviewHistoryGroup(editor);
  restoreEditorSelection(editor, selection2, selectionPosition);
  return historyDepthAtStart;
}
export function collapseDiffReviewHistory(
  editor,
  baselineMarkdown,
  finalMarkdown,
  historyDepthAtStart = 0,
) {
  if (editor.isDestroyed) return;
  const selection2 = editor.state.selection.toJSON();
  const selectionPosition = editor.state.selection.from;
  const scrollSnapshot = captureScrollTop(editor);
  rewindReviewHistory(editor, historyDepthAtStart);
  if (editor.getMarkdown() !== baselineMarkdown) {
    replaceEditorMarkdown(editor, baselineMarkdown, false);
  }
  restoreEditorSelection(editor, selection2, selectionPosition);
  if (baselineMarkdown !== finalMarkdown) {
    replaceEditorMarkdown(editor, finalMarkdown, true, selection2, selectionPosition);
  } else {
    recordFinalizedBoundary(editor);
  }
  closeDiffReviewHistoryGroup(editor);
  restoreEditorSelection(editor, selection2, selectionPosition);
  restoreScrollTop(scrollSnapshot);
}
function diffReviewScroller(editor) {
  if (editor.isDestroyed) return null;
  const dom = editor.view.dom;
  const scroller = dom.closest("[data-diff-scroll-root]") ?? dom.parentElement;
  return scroller instanceof HTMLElement ? scroller : null;
}
function captureScrollTop(editor) {
  const el = diffReviewScroller(editor);
  return el
    ? {
        el,
        top: el.scrollTop,
      }
    : null;
}
function restoreScrollTop(snapshot2) {
  if (!snapshot2) return;
  const { el, top: top2 } = snapshot2;
  el.scrollTop = top2;
  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(() => {
      el.scrollTop = top2;
    });
  }
}
export function splitCompletedReviewFromUserEdit(
  editor,
  baselineMarkdown,
  reviewedMarkdown,
  userMarkdown,
  historyDepthAtStart = 0,
) {
  if (editor.isDestroyed) return;
  const selection2 = editor.state.selection.toJSON();
  const selectionPosition = editor.state.selection.from;
  rewindReviewHistory(editor, historyDepthAtStart);
  if (editor.getMarkdown() !== baselineMarkdown) {
    replaceEditorMarkdown(editor, baselineMarkdown, false);
  }
  if (baselineMarkdown !== reviewedMarkdown) {
    replaceEditorMarkdown(editor, reviewedMarkdown, true);
    closeDiffReviewHistoryGroup(editor);
  }
  if (reviewedMarkdown !== userMarkdown) {
    replaceEditorMarkdown(editor, userMarkdown, true);
    closeDiffReviewHistoryGroup(editor);
  } else if (baselineMarkdown === reviewedMarkdown) {
    recordFinalizedBoundary(editor);
  }
  restoreEditorSelection(editor, selection2, selectionPosition);
}
function recordFinalizedBoundary(editor) {
  const transaction = closeHistory(editor.state.tr).step(new DiffReviewBoundaryStep());
  transaction.setMeta(DIFF_REVIEW_SYNC_META, true);
  editor.view.dispatch(transaction);
}
function rewindReviewHistory(editor, targetDepth) {
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
function restoreEditorSelection(editor, selection2, fallbackPosition) {
  const transaction = editor.state.tr.setSelection(
    selectionFromSnapshot(editor.state.doc, selection2, fallbackPosition),
  );
  transaction.setMeta("addToHistory", false);
  transaction.setMeta(DIFF_REVIEW_SYNC_META, true);
  editor.view.dispatch(transaction);
}
function replaceEditorMarkdown(editor, markdown2, addToHistory, selection2, fallbackPosition = 0) {
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
      tr2.setSelection(selectionFromSnapshot(tr2.doc, selection2, fallbackPosition));
      return true;
    });
  }
  chain.run();
}
const MARKDOWN_TABLE_CELL_MIN_WIDTH = 60;
const MARKDOWN_TABLE_CELL_MAX_WIDTH = 200;
const OVERLAY_SCROLLBAR_TRACK_SELECTOR = ".hilo-overlay-scrollbar-track";
function isOverlayScrollbarChrome(node2) {
  return (
    node2 instanceof Element &&
    (node2.matches(OVERLAY_SCROLLBAR_TRACK_SELECTOR) ||
      node2.closest(OVERLAY_SCROLLBAR_TRACK_SELECTOR) !== null)
  );
}
class ScrollableMarkdownTableView extends TableView2 {
  constructor(node2, cellMinWidth, cellMaxWidth = MARKDOWN_TABLE_CELL_MAX_WIDTH) {
    super(node2, cellMinWidth);
    this.dom.classList.add("canvas-markdown-table-scroll-shell");
    this.dom.style.setProperty("--canvas-markdown-table-cell-max-width", `${cellMaxWidth}px`);
    this.applyAdaptiveTableWidth();
    const scrollViewport = document.createElement("div");
    scrollViewport.className = "canvas-markdown-table-scroll-viewport native-scrollbar-hidden";
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
      if (changedNodes.length > 0 && changedNodes.every(isOverlayScrollbarChrome)) return true;
    }
    return super.ignoreMutation(mutation);
  }
  applyAdaptiveTableWidth() {
    this.table.style.width = "max-content";
    this.table.style.minWidth = "100%";
  }
}
export const ScrollableMarkdownTable = Table$2.extend({
  addNodeView() {
    const cellMinWidth = this.options.cellMinWidth;
    return ({ node: node2 }) =>
      new ScrollableMarkdownTableView(node2, cellMinWidth, MARKDOWN_TABLE_CELL_MAX_WIDTH);
  },
}).configure({
  resizable: false,
  cellMinWidth: MARKDOWN_TABLE_CELL_MIN_WIDTH,
});
let annotationCounter = 0;
function nextAnnotationId() {
  annotationCounter += 1;
  return `anno-${Date.now().toString(36)}-${annotationCounter}`;
}
const ANNOTATION_ANCHOR_CONTEXT_LENGTH = 32;
function captureAnnotationState(editor, comments) {
  return {
    marks: getAnnotationMarks(editor).map((mark2) => ({
      ...mark2,
    })),
    comments: {
      ...comments,
    },
  };
}
function annotationStatesEqual(a2, b3) {
  return JSON.stringify(a2) === JSON.stringify(b3);
}
function recordAnnotationHistory(editor, before, after) {
  editor.view.dispatch(
    closeHistory(editor.state.tr).step(new AnnotationHistoryStep(before, after)),
  );
}
export function useAnnotations(editor, options = {}) {
  const { onSnapshotsChange, onActivate, onConflict } = options;
  const [version2, bump] = reactExports.useReducer((n2) => n2 + 1, 0);
  const [comments, setComments] = reactExports.useState({});
  const [pending2, setPending] = reactExports.useState(null);
  const [activeId, setActiveId] = reactExports.useState(null);
  const commentsRef = reactExports.useRef(comments);
  commentsRef.current = comments;
  const pendingRef = reactExports.useRef(pending2);
  pendingRef.current = pending2;
  const editStartRef = reactExports.useRef(null);
  const activeIdRef = reactExports.useRef(activeId);
  activeIdRef.current = activeId;
  const replaceComments = reactExports.useCallback((next2) => {
    commentsRef.current = next2;
    setComments(next2);
  }, []);
  reactExports.useEffect(() => {
    if (!editor) return;
    const handler = ({ transaction }) => {
      const restored = getAnnotationHistorySnapshot(transaction);
      if (restored) {
        replaceComments({
          ...restored.comments,
        });
        editStartRef.current = null;
        pendingRef.current = null;
        activeIdRef.current = null;
        setPending(null);
        setActiveId(null);
        onActivate?.(null);
      }
      if (transaction.docChanged) bump();
    };
    editor.on("transaction", handler);
    return () => {
      editor.off("transaction", handler);
    };
  }, [editor, onActivate, replaceComments]);
  const annotationGroups = reactExports.useMemo(() => {
    if (!editor) return [];
    return groupAnnotationRanges(
      getAnnotationMarks(editor).filter((mark2) => mark2.from < mark2.to),
    );
  }, [editor, version2]);
  const markers = reactExports.useMemo(() => {
    let seq2 = 0;
    return annotationGroups.map((group) => {
      const live = !!(comments[group.id] ?? "").trim();
      if (live) seq2 += 1;
      return {
        id: group.id,
        from: group.from,
        to: group.to,
        seq: live ? seq2 : null,
      };
    });
  }, [annotationGroups, comments]);
  const snapshots2 = reactExports.useMemo(() => {
    if (!editor) return [];
    const out = [];
    for (const group of annotationGroups) {
      const comment2 = (comments[group.id] ?? "").trim();
      if (!comment2) continue;
      const targets = group.ranges.map(({ from: from2, to }) => ({
        exact: editor.state.doc.textBetween(from2, to, " ", " "),
        prefix: editor.state.doc.textBetween(
          Math.max(0, from2 - ANNOTATION_ANCHOR_CONTEXT_LENGTH),
          from2,
          " ",
          " ",
        ),
        suffix: editor.state.doc.textBetween(
          to,
          Math.min(editor.state.doc.content.size, to + ANNOTATION_ANCHOR_CONTEXT_LENGTH),
          " ",
          " ",
        ),
      }));
      const selectedText = targets.map((target) => target.exact).join(" ");
      out.push({
        id: group.id,
        seq: out.length + 1,
        quote: buildQuote(selectedText),
        comment: comment2,
        targets,
      });
    }
    return out;
  }, [editor, annotationGroups, comments]);
  const snapshotsKey = JSON.stringify(snapshots2);
  reactExports.useEffect(() => {
    onSnapshotsChange?.(snapshots2);
  }, [snapshotsKey, onSnapshotsChange]);
  const recordChange = reactExports.useCallback(
    (before, after) => {
      if (!editor || annotationStatesEqual(before, after)) return;
      recordAnnotationHistory(editor, before, after);
    },
    [editor],
  );
  const begin = reactExports.useCallback(() => {
    if (!editor) return;
    const ranges = getAnnotationSelectionRanges(editor.state.selection);
    if (ranges.length === 0) return;
    const existingMarks = getAnnotationMarks(editor);
    const hasConflict = ranges.some(
      (range2) => findConflictingIds(range2, existingMarks).length > 0,
    );
    if (hasConflict) {
      onConflict?.();
      return;
    }
    editStartRef.current = captureAnnotationState(editor, commentsRef.current);
    const id2 = nextAnnotationId();
    for (const range2 of ranges)
      addAnnotationMark(editor, {
        id: id2,
        ...range2,
      });
    const nextPending = {
      id: id2,
    };
    pendingRef.current = nextPending;
    setPending(nextPending);
    activeIdRef.current = id2;
    setActiveId(id2);
    setActiveAnnotationMark(editor, id2);
    const caretSelection = createAnnotationCaretSelection(editor.state.doc, ranges);
    if (caretSelection) editor.view.dispatch(editor.state.tr.setSelection(caretSelection));
    bump();
  }, [editor, onConflict]);
  const updatePendingComment = reactExports.useCallback(
    (text2) => {
      const p3 = pendingRef.current;
      if (!p3) return;
      replaceComments({
        ...commentsRef.current,
        [p3.id]: text2,
      });
    },
    [replaceComments],
  );
  const closePending = reactExports.useCallback(() => {
    if (!editor) return;
    const p3 = pendingRef.current;
    if (!p3) return;
    const before = editStartRef.current ?? captureAnnotationState(editor, commentsRef.current);
    let nextComments = commentsRef.current;
    const text2 = (nextComments[p3.id] ?? "").trim();
    if (!text2) {
      removeAnnotationMark(editor, p3.id);
      if (p3.id in nextComments) {
        nextComments = {
          ...nextComments,
        };
        delete nextComments[p3.id];
        replaceComments(nextComments);
      }
    }
    recordChange(before, captureAnnotationState(editor, nextComments));
    editStartRef.current = null;
    pendingRef.current = null;
    activeIdRef.current = null;
    setActiveAnnotationMark(editor, null);
    setActiveId(null);
    setPending(null);
    onActivate?.(null);
    bump();
  }, [editor, onActivate, recordChange, replaceComments]);
  const activate = reactExports.useCallback(
    (id2) => {
      if (!editor || !getAnnotationMarks(editor).some((mark2) => mark2.id === id2)) return;
      editStartRef.current = captureAnnotationState(editor, commentsRef.current);
      activeIdRef.current = id2;
      setActiveId(id2);
      setActiveAnnotationMark(editor, id2);
      onActivate?.(id2);
      const nextPending = {
        id: id2,
      };
      pendingRef.current = nextPending;
      setPending(nextPending);
      requestAnimationFrame(() => {
        editor.view.dom.querySelector(`[data-annotation-id="${id2}"]`)?.scrollIntoView({
          block: "center",
          behavior: "smooth",
        });
      });
      bump();
    },
    [editor, onActivate],
  );
  const remove2 = reactExports.useCallback(
    (id2) => {
      if (!editor) return;
      const before = captureAnnotationState(editor, commentsRef.current);
      if (!before.marks.some((mark2) => mark2.id === id2) && !(id2 in before.comments)) return;
      removeAnnotationMark(editor, id2);
      const nextComments = {
        ...commentsRef.current,
      };
      delete nextComments[id2];
      replaceComments(nextComments);
      recordChange(before, captureAnnotationState(editor, nextComments));
      editStartRef.current = null;
      if (pendingRef.current?.id === id2) {
        pendingRef.current = null;
        setPending(null);
      }
      if (activeIdRef.current === id2) {
        activeIdRef.current = null;
        setActiveId(null);
        onActivate?.(null);
      }
      bump();
    },
    [editor, onActivate, recordChange, replaceComments],
  );
  const clearAll = reactExports.useCallback(() => {
    if (!editor) return;
    const before = captureAnnotationState(editor, commentsRef.current);
    if (before.marks.length === 0 && Object.keys(before.comments).length === 0) return;
    clearAnnotationMarks(editor);
    replaceComments({});
    recordChange(before, captureAnnotationState(editor, {}));
    editStartRef.current = null;
    pendingRef.current = null;
    activeIdRef.current = null;
    setPending(null);
    setActiveId(null);
    onActivate?.(null);
    bump();
  }, [editor, onActivate, recordChange, replaceComments]);
  const reset2 = reactExports.useCallback(() => {
    if (!editor) return;
    clearAnnotationMarks(editor);
    replaceComments({});
    editStartRef.current = null;
    pendingRef.current = null;
    activeIdRef.current = null;
    setPending(null);
    setActiveId(null);
    onActivate?.(null);
    bump();
  }, [editor, onActivate, replaceComments]);
  const handleCommand = reactExports.useCallback(
    (cmd2) => {
      switch (cmd2.type) {
        case "locate":
          activate(cmd2.id);
          break;
        case "delete":
          remove2(cmd2.id);
          break;
        case "clear":
          clearAll();
          break;
        case "clearSelection":
          if (editor && !editor.state.selection.empty) {
            editor.commands.setTextSelection(editor.state.selection.to);
          }
          break;
      }
    },
    [activate, remove2, clearAll, editor],
  );
  const pendingComment = pending2 ? (comments[pending2.id] ?? "") : "";
  const hasAny = snapshots2.length > 0;
  return {
    snapshots: snapshots2,
    markers,
    activeId,
    pending: pending2,
    pendingComment,
    hasAny,
    begin,
    updatePendingComment,
    closePending,
    activate,
    remove: remove2,
    clearAll,
    reset: reset2,
    handleCommand,
  };
}
