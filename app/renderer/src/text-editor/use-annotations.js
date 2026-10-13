// use-annotations.js
import {
  AnnotationHistoryStep,
  annotationPluginKey,
  getAnnotationHistorySnapshot,
  getAnnotationMarks,
  getAnnotationSelectionRanges,
} from "./configuration2.js";
import { closeHistory, reactExports, TextSelection } from "../vendor.js";

function dispatchMeta(editor, meta2) {
  editor.view.dispatch(editor.state.tr.setMeta(annotationPluginKey, meta2));
}

function addAnnotationMark(editor, mark2) {
  dispatchMeta(editor, {
    kind: "add",
    mark: mark2,
  });
}

function removeAnnotationMark(editor, id) {
  dispatchMeta(editor, {
    kind: "remove",
    id,
  });
}

function clearAnnotationMarks(editor) {
  dispatchMeta(editor, {
    kind: "clear",
  });
}

function setActiveAnnotationMark(editor, id) {
  dispatchMeta(editor, {
    kind: "setActive",
    id,
  });
}

function createAnnotationCaretSelection(doc2, ranges) {
  const first2 = ranges[0];
  return first2 ? TextSelection.near(doc2.resolve(first2.to), -1) : null;
}

function rangesOverlap(a, b) {
  return a.from < b.to && b.from < a.to;
}

function findConflictingIds(next2, existing, ignoreId) {
  const out = new Set();
  for (const annotation of existing) {
    if (rangesOverlap(next2, annotation)) out.add(annotation.id);
  }
  return [...out];
}

function orderByPosition(items) {
  return [...items].sort((a, b) => a.from - b.from || a.to - b.to);
}

function groupAnnotationRanges(items) {
  const byId = new Map();
  for (const item of orderByPosition(items)) {
    const ranges = byId.get(item.id);
    if (ranges) ranges.push(item);
    else byId.set(item.id, [item]);
  }
  return [...byId.entries()].map(([id, ranges]) => ({
    id,
    from: ranges[0].from,
    to: ranges[ranges.length - 1].to,
    ranges,
  }));
}

function buildQuote(text2, maxLen = 40) {
  const normalized = text2.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLen) return normalized;
  return `${normalized.slice(0, maxLen)}…`;
}

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

function annotationStatesEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function recordAnnotationHistory(editor, before, after) {
  editor.view.dispatch(
    closeHistory(editor.state.tr).step(
      new AnnotationHistoryStep(before, after),
    ),
  );
}

export function useAnnotations(editor, options = {}) {
  const { onSnapshotsChange, onActivate, onConflict } = options;
  const [version2, bump] = reactExports.useReducer((count) => count + 1, 0);
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
          Math.min(
            editor.state.doc.content.size,
            to + ANNOTATION_ANCHOR_CONTEXT_LENGTH,
          ),
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
    const id = nextAnnotationId();
    for (const range2 of ranges)
      addAnnotationMark(editor, {
        id,
        ...range2,
      });
    const nextPending = {
      id,
    };
    pendingRef.current = nextPending;
    setPending(nextPending);
    activeIdRef.current = id;
    setActiveId(id);
    setActiveAnnotationMark(editor, id);
    const caretSelection = createAnnotationCaretSelection(
      editor.state.doc,
      ranges,
    );
    if (caretSelection)
      editor.view.dispatch(editor.state.tr.setSelection(caretSelection));
    bump();
  }, [editor, onConflict]);
  const updatePendingComment = reactExports.useCallback(
    (text2) => {
      const pendingAnnotation = pendingRef.current;
      if (!pendingAnnotation) return;
      replaceComments({
        ...commentsRef.current,
        [pendingAnnotation.id]: text2,
      });
    },
    [replaceComments],
  );
  const closePending = reactExports.useCallback(() => {
    if (!editor) return;
    const pendingAnnotation = pendingRef.current;
    if (!pendingAnnotation) return;
    const before =
      editStartRef.current ??
      captureAnnotationState(editor, commentsRef.current);
    let nextComments = commentsRef.current;
    const text2 = (nextComments[pendingAnnotation.id] ?? "").trim();
    if (!text2) {
      removeAnnotationMark(editor, pendingAnnotation.id);
      if (pendingAnnotation.id in nextComments) {
        nextComments = {
          ...nextComments,
        };
        delete nextComments[pendingAnnotation.id];
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
    (id) => {
      if (
        !editor ||
        !getAnnotationMarks(editor).some((mark2) => mark2.id === id)
      )
        return;
      editStartRef.current = captureAnnotationState(
        editor,
        commentsRef.current,
      );
      activeIdRef.current = id;
      setActiveId(id);
      setActiveAnnotationMark(editor, id);
      onActivate?.(id);
      const nextPending = {
        id,
      };
      pendingRef.current = nextPending;
      setPending(nextPending);
      requestAnimationFrame(() => {
        editor.view.dom
          .querySelector(`[data-annotation-id="${id}"]`)
          ?.scrollIntoView({
            block: "center",
            behavior: "smooth",
          });
      });
      bump();
    },
    [editor, onActivate],
  );
  const remove2 = reactExports.useCallback(
    (id) => {
      if (!editor) return;
      const before = captureAnnotationState(editor, commentsRef.current);
      if (
        !before.marks.some((mark2) => mark2.id === id) &&
        !(id in before.comments)
      )
        return;
      removeAnnotationMark(editor, id);
      const nextComments = {
        ...commentsRef.current,
      };
      delete nextComments[id];
      replaceComments(nextComments);
      recordChange(before, captureAnnotationState(editor, nextComments));
      editStartRef.current = null;
      if (pendingRef.current?.id === id) {
        pendingRef.current = null;
        setPending(null);
      }
      if (activeIdRef.current === id) {
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
    if (before.marks.length === 0 && Object.keys(before.comments).length === 0)
      return;
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
