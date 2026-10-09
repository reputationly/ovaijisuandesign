// use-diff-review.js
import {
  reactExports,
  useTranslation,
  useDiffReviewStore,
  collapseRenderedText,
  buildMarkdownNormalizeMap,
  stripInlineMarkChars,
  recordProvisionalDiffReviewHistory,
  getDiffReviewHistorySnapshot,
  recordDiffReviewTransition,
  collapseDiffReviewHistory,
  renderDeletedMarkdown,
  locateHunksInDoc,
} from "../vendor.js";
import { selectPendingHunksForNode } from "../m04/table-node-inner.jsx";
import {
  clearDiffReviewHunks,
  scrollToDiffHunk,
  setDiffReviewHunks,
} from "./diff-review-highlight.js";
import { reconstructVerifiedDiffReviewBaseline } from "./use-find-controller.jsx";
function containsMarkdownTableRow(markdown2) {
  return markdown2.split("\n").some((line) => /^\s*\|.*\|\s*$/.test(line));
}
function countNewlines$1(text2) {
  let count2 = 0;
  for (let index2 = 0; index2 < text2.length; index2 += 1) {
    if (text2.charCodeAt(index2) === 10) count2 += 1;
  }
  return count2;
}
const MARKDOWN_DELIMITER_POINTS = new Set(["#", "*", "_", "~", "`", "-", "+", ">", "|"]);
const MARKDOWN_BLOCK_PREFIX =
  /^(?: {0,3})(?:#{1,6}(?:[ \t]+|$)|[-+*>][ \t]+|\d{1,9}[.)][ \t]+|`{3,}|~{3,})/;
function locatableRenderedText(markdown2) {
  const normalized = collapseRenderedText(buildMarkdownNormalizeMap(markdown2).normalized).trim();
  return stripInlineMarkChars(normalized.replace(MARKDOWN_BLOCK_PREFIX, "")).trim();
}
function commonPrefixLength(left, right) {
  const limit = Math.min(left.length, right.length);
  let length2 = 0;
  while (length2 < limit && left[length2] === right[length2]) length2 += 1;
  return length2;
}
function commonSuffixLength(left, right, prefixLength) {
  let length2 = 0;
  while (
    length2 < left.length - prefixLength &&
    length2 < right.length - prefixLength &&
    left[left.length - length2 - 1] === right[right.length - length2 - 1]
  ) {
    length2 += 1;
  }
  return length2;
}
function containsNewline(points, from2, to) {
  for (let index2 = from2; index2 < to; index2 += 1) {
    if (points[index2] === "\n") return true;
  }
  return false;
}
function alignMultilineBoundaries(left, right, prefixLength, suffixLength) {
  const changeHasNewline =
    containsNewline(left, prefixLength, left.length - suffixLength) ||
    containsNewline(right, prefixLength, right.length - suffixLength);
  if (!changeHasNewline)
    return {
      prefixLength,
      suffixLength,
    };
  let alignedPrefix = prefixLength;
  if (alignedPrefix > 0 && alignedPrefix < left.length && alignedPrefix < right.length) {
    const previousNewline = left.lastIndexOf("\n", alignedPrefix - 1);
    alignedPrefix = previousNewline + 1;
  }
  let alignedSuffix = commonSuffixLength(left, right, alignedPrefix);
  if (alignedSuffix === 0)
    return {
      prefixLength: alignedPrefix,
      suffixLength: 0,
    };
  const leftStart = left.length - alignedSuffix;
  const rightStart = right.length - alignedSuffix;
  const leftAtLineBoundary = leftStart === alignedPrefix || left[leftStart - 1] === "\n";
  const rightAtLineBoundary = rightStart === alignedPrefix || right[rightStart - 1] === "\n";
  if (leftAtLineBoundary && rightAtLineBoundary) {
    return {
      prefixLength: alignedPrefix,
      suffixLength: alignedSuffix,
    };
  }
  const firstNewline = left.indexOf("\n", leftStart);
  if (firstNewline < 0 || firstNewline >= left.length - 1) alignedSuffix = 0;
  else alignedSuffix = left.length - firstNewline - 1;
  return {
    prefixLength: alignedPrefix,
    suffixLength: alignedSuffix,
  };
}
function markerRunStart(points, boundary) {
  const previousNewline = points.lastIndexOf("\n", boundary - 1);
  const lineStart = previousNewline + 1;
  const nextNewline = points.indexOf("\n", lineStart);
  const lineEnd2 = nextNewline < 0 ? points.length : nextNewline;
  const blockPrefix = MARKDOWN_BLOCK_PREFIX.exec(points.slice(lineStart, lineEnd2).join(""));
  if (blockPrefix) {
    const blockPrefixEnd = lineStart + Array.from(blockPrefix[0]).length;
    if (boundary > lineStart && boundary < blockPrefixEnd) return lineStart;
  }
  if (
    boundary <= 0 ||
    boundary >= points.length ||
    !MARKDOWN_DELIMITER_POINTS.has(points[boundary - 1]) ||
    !MARKDOWN_DELIMITER_POINTS.has(points[boundary])
  ) {
    return boundary;
  }
  let start2 = boundary - 1;
  while (start2 > 0 && MARKDOWN_DELIMITER_POINTS.has(points[start2 - 1])) start2 -= 1;
  return start2;
}
function markerRunEnd(points, boundary) {
  if (
    boundary <= 0 ||
    boundary >= points.length ||
    !MARKDOWN_DELIMITER_POINTS.has(points[boundary - 1]) ||
    !MARKDOWN_DELIMITER_POINTS.has(points[boundary])
  ) {
    return boundary;
  }
  let end2 = boundary;
  while (end2 < points.length && MARKDOWN_DELIMITER_POINTS.has(points[end2])) end2 += 1;
  return end2;
}
function alignMarkdownDelimiterBoundaries(left, right, prefixLength, suffixLength) {
  const alignedPrefix = Math.min(
    markerRunStart(left, prefixLength),
    markerRunStart(right, prefixLength),
  );
  let alignedSuffix =
    alignedPrefix === prefixLength ? suffixLength : commonSuffixLength(left, right, alignedPrefix);
  const leftStart = left.length - alignedSuffix;
  const rightStart = right.length - alignedSuffix;
  const leftRunEnd = markerRunEnd(left, leftStart);
  const rightRunEnd = markerRunEnd(right, rightStart);
  const droppedPoints = Math.max(leftRunEnd - leftStart, rightRunEnd - rightStart);
  alignedSuffix = Math.max(0, alignedSuffix - droppedPoints);
  return {
    prefixLength: alignedPrefix,
    suffixLength: alignedSuffix,
  };
}
function minimizeDiffReviewHunk(hunk) {
  const { originalText, replacement } = hunk;
  if (
    originalText === replacement ||
    (containsMarkdownTableRow(originalText) && containsMarkdownTableRow(replacement))
  ) {
    return hunk;
  }
  const originalPoints = Array.from(originalText);
  const replacementPoints = Array.from(replacement);
  let prefixPoints = commonPrefixLength(originalPoints, replacementPoints);
  let suffixPoints = commonSuffixLength(originalPoints, replacementPoints, prefixPoints);
  ({ prefixLength: prefixPoints, suffixLength: suffixPoints } = alignMultilineBoundaries(
    originalPoints,
    replacementPoints,
    prefixPoints,
    suffixPoints,
  ));
  ({ prefixLength: prefixPoints, suffixLength: suffixPoints } = alignMarkdownDelimiterBoundaries(
    originalPoints,
    replacementPoints,
    prefixPoints,
    suffixPoints,
  ));
  if (prefixPoints === 0 && suffixPoints === 0) return hunk;
  const commonPrefix = originalPoints.slice(0, prefixPoints).join("");
  const commonSuffix =
    suffixPoints > 0 ? originalPoints.slice(originalPoints.length - suffixPoints).join("") : "";
  const minimizedOriginal = originalPoints
    .slice(prefixPoints, originalPoints.length - suffixPoints)
    .join("");
  const minimizedReplacement = replacementPoints
    .slice(prefixPoints, replacementPoints.length - suffixPoints)
    .join("");
  const fullVisibleOriginal = locatableRenderedText(originalText);
  const fullVisibleReplacement = locatableRenderedText(replacement);
  if (
    fullVisibleReplacement &&
    fullVisibleOriginal === fullVisibleReplacement &&
    locatableRenderedText(minimizedReplacement) !== fullVisibleReplacement
  ) {
    return {
      ...hunk,
      replacement: fullVisibleReplacement,
    };
  }
  return {
    ...hunk,
    originalText: minimizedOriginal,
    replacement: minimizedReplacement,
    newStart: hunk.newStart + commonPrefix.length,
    newEnd: hunk.newEnd - commonSuffix.length,
    reversePrefix: `${hunk.reversePrefix}${commonPrefix}`,
    reverseSuffix: `${commonSuffix}${hunk.reverseSuffix}`,
    startLine: hunk.startLine + countNewlines$1(commonPrefix),
  };
}
function enclosingTableKey(doc2, pos) {
  try {
    const $pos = doc2.resolve(Math.min(Math.max(pos, 0), doc2.content.size));
    if ($pos.depth === 0) return null;
    return $pos.node(1).type.name === "table" ? `${$pos.before(1)}:${$pos.after(1)}` : null;
  } catch {
    return null;
  }
}
function enclosingHeadingLevel(doc2, pos) {
  try {
    const $pos = doc2.resolve(Math.min(Math.max(pos, 0), doc2.content.size));
    const node2 = $pos.depth > 0 ? $pos.node(1) : null;
    if (node2?.type.name === "heading") {
      const level = node2.attrs.level;
      return typeof level === "number" ? level : 1;
    }
  } catch {}
  return null;
}
function withEnclosingBlockPrefix(markdown2, doc2, pos) {
  if (markdown2.includes("\n")) return markdown2;
  const trimmed = markdown2.trimStart();
  if (trimmed === "" || /^(#{1,6}\s|>|[-*+]\s|\d+\.\s|```)/.test(trimmed)) return markdown2;
  const level = enclosingHeadingLevel(doc2, pos);
  return level ? `${"#".repeat(level)} ${markdown2}` : markdown2;
}
export function useDiffReview(editor, nodeId, contentRevision, options = {}) {
  const { sourceMarkdown, onReviewDocumentApplied } = options;
  const { t: t2 } = useTranslation();
  const session = useDiffReviewStore((state2) => state2.session);
  const reverting = useDiffReviewStore((state2) => state2.reverting);
  const acceptHunk = useDiffReviewStore((state2) => state2.acceptHunk);
  const acceptHunks = useDiffReviewStore((state2) => state2.acceptHunks);
  const requestUndo = useDiffReviewStore((state2) => state2.requestUndo);
  const pendingHunks = reactExports.useMemo(
    () =>
      selectPendingHunksForNode(
        {
          session,
        },
        nodeId,
      ),
    [session, nodeId],
  );
  const presentationHunks = reactExports.useMemo(
    () => pendingHunks.map(minimizeDiffReviewHunk),
    [pendingHunks],
  );
  const reviewBlocked =
    reverting || (!!session && session.nodeId === nodeId && session.baselineMarkdown === void 0);
  const [activeIndex, setActiveIndex] = reactExports.useState(0);
  const [modificationCount, setModificationCount] = reactExports.useState(0);
  const locatedIdsRef = reactExports.useRef([]);
  reactExports.useEffect(() => {
    if (!editor || !nodeId) return;
    const syncEditable = (state2) => {
      if (editor.isDestroyed) return;
      const ownsReview = state2.session?.nodeId === nodeId;
      const reviewReady = state2.session?.baselineMarkdown !== void 0;
      editor.setEditable(!(ownsReview && (state2.reverting || !reviewReady)), false);
    };
    syncEditable(useDiffReviewStore.getState());
    const unsubscribe = useDiffReviewStore.subscribe(syncEditable);
    return () => {
      unsubscribe();
      if (!editor.isDestroyed) editor.setEditable(true, false);
    };
  }, [editor, nodeId]);
  reactExports.useEffect(() => {
    if (
      !editor ||
      editor.isDestroyed ||
      !session ||
      session.nodeId !== nodeId ||
      session.baselineMarkdown !== void 0
    )
      return;
    let cancelled = false;
    const appliedMarkdown = sourceMarkdown ?? editor.getMarkdown();
    void reconstructVerifiedDiffReviewBaseline(appliedMarkdown, session)
      .then((baseline) => {
        if (cancelled || editor.isDestroyed || baseline === null) return;
        const current2 = useDiffReviewStore.getState().session;
        if (
          !current2 ||
          current2.requestId !== session.requestId ||
          current2.baselineMarkdown !== void 0
        )
          return;
        const historyDepthAtStart = recordProvisionalDiffReviewHistory(
          editor,
          baseline,
          appliedMarkdown,
          false,
        );
        useDiffReviewStore
          .getState()
          .setBaselineMarkdown(current2.requestId, baseline, historyDepthAtStart);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [editor, session, nodeId, sourceMarkdown]);
  reactExports.useEffect(() => {
    if (!editor || !nodeId) return;
    const handleTransaction = ({ transaction }) => {
      const restored = getDiffReviewHistorySnapshot(transaction);
      if (!restored || restored.nodeId !== nodeId) return;
      useDiffReviewStore.getState().restoreHistorySession(restored);
    };
    editor.on("transaction", handleTransaction);
    return () => {
      editor.off("transaction", handleTransaction);
    };
  }, [editor, nodeId]);
  reactExports.useEffect(() => {
    if (!editor || !nodeId) return;
    const handler = (transition2) => {
      if (
        editor.isDestroyed ||
        transition2.before.nodeId !== nodeId ||
        transition2.after.nodeId !== nodeId
      )
        return false;
      if (
        transition2.before.baselineMarkdown === void 0 ||
        (transition2.kind === "revert" && transition2.content === void 0)
      )
        return false;
      if (!recordDiffReviewTransition(editor, transition2)) return false;
      useDiffReviewStore.getState().restoreHistorySession(transition2.after);
      if (transition2.kind === "revert" && transition2.content !== void 0) {
        onReviewDocumentApplied?.(transition2.content);
      }
      if (!transition2.after.hunks.some((hunk) => hunk.status === "pending")) {
        const baseline = transition2.after.baselineMarkdown;
        if (baseline === void 0) return false;
        collapseDiffReviewHistory(
          editor,
          baseline,
          editor.getMarkdown(),
          transition2.after.historyDepthAtStart,
        );
        useDiffReviewStore.getState().finishHistorySession(transition2.after.requestId);
      }
      return true;
    };
    useDiffReviewStore.getState().setHistoryHandler(handler);
    return () => {
      if (useDiffReviewStore.getState().historyHandler === handler) {
        useDiffReviewStore.getState().setHistoryHandler(null);
      }
    };
  }, [editor, nodeId, onReviewDocumentApplied]);
  reactExports.useEffect(() => {
    if (!editor || !nodeId) return;
    useDiffReviewStore.getState().setActiveEditorNodeId(nodeId);
    return () => {
      if (useDiffReviewStore.getState().activeEditorNodeId === nodeId) {
        useDiffReviewStore.getState().setActiveEditorNodeId(null);
      }
    };
  }, [editor, nodeId]);
  const handleUndo = reactExports.useCallback(
    (hunkId) => {
      void requestUndo([hunkId]);
    },
    [requestUndo],
  );
  const handleAccept = reactExports.useCallback(
    (hunkId) => {
      acceptHunk(hunkId);
    },
    [acceptHunk],
  );
  const handleUndoGroup = reactExports.useCallback(
    (hunkIds) => {
      void requestUndo(hunkIds);
    },
    [requestUndo],
  );
  const handleAcceptGroup = reactExports.useCallback(
    (hunkIds) => {
      acceptHunks(hunkIds);
    },
    [acceptHunks],
  );
  const renderMarkdown = reactExports.useCallback(
    (markdown2, context) => {
      if (!editor) return null;
      return renderDeletedMarkdown(editor, markdown2, context);
    },
    [editor],
  );
  reactExports.useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    if (presentationHunks.length === 0) {
      locatedIdsRef.current = [];
      clearDiffReviewHunks(editor);
      return;
    }
    const doc2 = editor.state.doc;
    const ranges = locateHunksInDoc(doc2, presentationHunks);
    const views = [];
    const navIds = [];
    const seenTableKeys = new Set();
    let modifications = 0;
    for (const hunk of presentationHunks) {
      const range2 = ranges.get(hunk.id);
      if (!range2) {
        modifications++;
        continue;
      }
      let repId;
      if (range2.cells && range2.cells.length > 0) {
        range2.cells.forEach((cell, index2) => {
          views.push({
            id: `${hunk.id}::c${index2}`,
            controlId: hunk.id,
            from: cell.from,
            to: cell.to,
            deletedMarkdown: cell.deletedMarkdown,
            deletedContext: {
              sourceMarkdown: cell.deletedMarkdown,
              prefix: hunk.reversePrefix,
              suffix: hunk.reverseSuffix,
            },
            zeroWidth: false,
          });
        });
        repId = `${hunk.id}::c0`;
      } else {
        views.push({
          id: hunk.id,
          controlId: hunk.id,
          from: range2.from,
          to: range2.to,
          deletedMarkdown: withEnclosingBlockPrefix(hunk.originalText, doc2, range2.from),
          deletedContext: {
            sourceMarkdown: hunk.originalText,
            prefix: hunk.reversePrefix,
            suffix: hunk.reverseSuffix,
          },
          zeroWidth: range2.from === range2.to,
        });
        repId = hunk.id;
      }
      const tableKey = enclosingTableKey(doc2, range2.cells?.[0]?.from ?? range2.from);
      if (tableKey) {
        if (seenTableKeys.has(tableKey)) continue;
        seenTableKeys.add(tableKey);
      }
      modifications++;
      navIds.push(repId);
    }
    locatedIdsRef.current = navIds;
    setModificationCount(modifications);
    setDiffReviewHunks(editor, views, {
      undoLabel: t2("canvas.diffReview.undo", "撤销"),
      acceptLabel: t2("canvas.diffReview.accept", "接受"),
      disabled: reviewBlocked,
      onUndo: handleUndo,
      onAccept: handleAccept,
      onUndoGroup: handleUndoGroup,
      onAcceptGroup: handleAcceptGroup,
      renderMarkdown,
    });
    const firstNavId = navIds[0];
    if (nodeId && firstNavId && useDiffReviewStore.getState().consumeScrollToFirstHunk(nodeId)) {
      setActiveIndex(0);
      requestAnimationFrame(() => {
        if (!editor.isDestroyed) scrollToDiffHunk(editor, firstNavId);
      });
    }
    return () => {
      if (!editor.isDestroyed) clearDiffReviewHunks(editor);
    };
  }, [
    editor,
    nodeId,
    presentationHunks,
    reviewBlocked,
    contentRevision,
    handleUndo,
    handleAccept,
    handleUndoGroup,
    handleAcceptGroup,
    renderMarkdown,
    t2,
  ]);
  reactExports.useEffect(() => {
    setActiveIndex((index2) => Math.min(index2, Math.max(0, modificationCount - 1)));
  }, [modificationCount]);
  const step = reactExports.useCallback(
    (dir) => {
      if (!editor || pendingHunks.length === 0) return;
      const located = locatedIdsRef.current;
      if (located.length === 0) return;
      setActiveIndex((prev) => {
        const next2 = (prev + dir + located.length) % located.length;
        const id2 = located[next2];
        if (id2) scrollToDiffHunk(editor, id2);
        return next2;
      });
    },
    [editor, pendingHunks.length],
  );
  reactExports.useEffect(() => {
    const setNavigation = useDiffReviewStore.getState().setNavigation;
    if (pendingHunks.length === 0) {
      setNavigation(null);
      return;
    }
    const total = Math.max(modificationCount, 1);
    setNavigation({
      current: Math.min(activeIndex + 1, total),
      total,
      step,
    });
    return () => {
      setNavigation(null);
    };
  }, [pendingHunks.length, modificationCount, activeIndex, step]);
}
