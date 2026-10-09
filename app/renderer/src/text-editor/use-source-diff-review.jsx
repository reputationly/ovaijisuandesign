// use-source-diff-review.jsx
import {
  ChevronDown,
  ChevronUp,
  reactExports,
  useTranslation,
  useVirtualizer,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { TextDiffHunkView } from "./text-diff-hunk-view.jsx";
import { useDiffReviewStore } from "./use-diff-review-store.js";
import { isDiffReviewSessionReady } from "./is-diff-review-session-ready.js";
import { hashDiffReviewMarkdown } from "./build-decorations.js";

const DIFF_SAMPLE_HEAD_LINES = 100;

const DIFF_SAMPLE_TAIL_LINES = 100;

const DIFF_SAMPLE_MAX_LINE_CHARS = 8 * 1024;

function countNewlines(text2) {
  let count2 = 0;
  for (let index2 = 0; index2 < text2.length; index2 += 1) {
    if (text2.charCodeAt(index2) === 10) count2 += 1;
  }
  return count2;
}

function sampleLine(text2) {
  if (text2.length <= DIFF_SAMPLE_MAX_LINE_CHARS)
    return {
      text: text2,
      truncated: false,
    };
  const sideLength = Math.floor((DIFF_SAMPLE_MAX_LINE_CHARS - 3) / 2);
  return {
    text: `${text2.slice(0, sideLength)} … ${text2.slice(-sideLength)}`,
    truncated: true,
  };
}

function sampleChangedText(text2) {
  if (text2 === "") {
    return {
      lineCount: 0,
      lines: [],
      truncated: false,
      trailingNewline: false,
    };
  }
  const head2 = [];
  const tail = new Array(DIFF_SAMPLE_TAIL_LINES);
  let tailCount = 0;
  let lineCount = 0;
  let cursor = 0;
  let truncatedLine = false;
  while (cursor < text2.length) {
    const newline2 = text2.indexOf("\n", cursor);
    const end2 = newline2 === -1 ? text2.length : newline2;
    const sampled = sampleLine(text2.slice(cursor, end2));
    truncatedLine ||= sampled.truncated;
    const line = {
      text: sampled.text,
      offset: lineCount,
    };
    if (lineCount < DIFF_SAMPLE_HEAD_LINES) {
      head2.push(line);
    } else {
      tail[tailCount % DIFF_SAMPLE_TAIL_LINES] = line;
      tailCount += 1;
    }
    lineCount += 1;
    if (newline2 === -1 || newline2 === text2.length - 1) break;
    cursor = newline2 + 1;
  }
  const retainedTailCount = Math.min(tailCount, DIFF_SAMPLE_TAIL_LINES);
  const retainedTail = [];
  const tailStart =
    tailCount > DIFF_SAMPLE_TAIL_LINES ? tailCount % DIFF_SAMPLE_TAIL_LINES : 0;
  for (let index2 = 0; index2 < retainedTailCount; index2 += 1) {
    const line = tail[(tailStart + index2) % DIFF_SAMPLE_TAIL_LINES];
    if (line) retainedTail.push(line);
  }
  const omitted = lineCount > DIFF_SAMPLE_HEAD_LINES + DIFF_SAMPLE_TAIL_LINES;
  return {
    lineCount,
    lines: omitted
      ? [
          ...head2,
          {
            text: "…",
            offset: -1,
            omitted: true,
          },
          ...retainedTail,
        ]
      : [...head2, ...retainedTail],
    truncated: omitted || truncatedLine,
    trailingNewline: text2.endsWith("\n"),
  };
}

function buildSourceDiffReviewEntries(hunks) {
  let precedingAppliedLineDelta = 0;
  let precedingUndoneLineDelta = 0;
  return hunks.map((hunk) => {
    const oldSample = sampleChangedText(hunk.originalText);
    const newSample = sampleChangedText(hunk.replacement);
    const originalNewStart = Math.max(1, hunk.startLine);
    const oldStart = Math.max(1, originalNewStart - precedingAppliedLineDelta);
    const newStart = Math.max(1, originalNewStart - precedingUndoneLineDelta);
    const trailingNewlineChanged =
      oldSample.trailingNewline !== newSample.trailingNewline;
    const toDiffLine = (line, kind, startLine, sample) => {
      if (line.omitted)
        return {
          kind: "context",
          text: line.text,
        };
      const marksTrailingNewline =
        trailingNewlineChanged &&
        sample.trailingNewline &&
        line.offset === sample.lineCount - 1;
      const text2 = marksTrailingNewline
        ? `${line.text}${line.text ? " " : ""}↵`
        : line.text;
      return kind === "del"
        ? {
            kind,
            oldLine: startLine + line.offset,
            text: text2,
          }
        : {
            kind,
            newLine: startLine + line.offset,
            text: text2,
          };
    };
    const lines = [
      ...oldSample.lines.map((line) =>
        toDiffLine(line, "del", oldStart, oldSample),
      ),
      ...newSample.lines.map((line) =>
        toDiffLine(line, "add", newStart, newSample),
      ),
    ];
    const lineDelta =
      countNewlines(hunk.replacement) - countNewlines(hunk.originalText);
    precedingAppliedLineDelta += lineDelta;
    if (hunk.status === "undone") precedingUndoneLineDelta += lineDelta;
    return {
      id: hunk.id,
      status: hunk.status,
      truncated: oldSample.truncated || newSample.truncated,
      diff: {
        oldStart,
        oldCount: oldSample.lineCount,
        newStart,
        newCount: newSample.lineCount,
        lines,
      },
    };
  });
}

const SOURCE_DIFF_VIRTUALIZE_HUNK_THRESHOLD = 30;

function SourceDiffReviewCard({ entry, blocked, onUndo, onAccept }) {
  const { t: t2 } = useTranslation();
  return (
    <TextDiffHunkView
      hunk={entry.diff}
      dataActionUiId="canvas-source-diff-review-hunk"
      headerActions={
        <div className="flex shrink-0 items-center gap-1 font-sans">
          <button
            type="button"
            disabled={blocked}
            onClick={() => onUndo(entry.id)}
            className="h-6 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
            data-action-ui-id="canvas-source-diff-review-undo"
          >
            {t2("canvas.diffReview.undo", "撤销")}
          </button>
          <button
            type="button"
            disabled={blocked}
            onClick={() => onAccept(entry.id)}
            className="h-6 rounded-md bg-foreground px-2 text-xs font-medium text-background transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
            data-action-ui-id="canvas-source-diff-review-accept"
          >
            {t2("canvas.diffReview.accept", "接受")}
          </button>
        </div>
      }
    />
  );
}

const SourceDiffReviewList = reactExports.forwardRef(
  function SourceDiffReviewList2(
    { entries: entries2, blocked, onUndo, onAccept },
    forwardedRef,
  ) {
    const scrollRef = reactExports.useRef(null);
    const virtualized = entries2.length > SOURCE_DIFF_VIRTUALIZE_HUNK_THRESHOLD;
    const virtualizer = useVirtualizer({
      count: virtualized ? entries2.length : 0,
      getScrollElement: () => scrollRef.current,
      estimateSize: (index2) =>
        44 + (entries2[index2]?.diff.lines.length ?? 1) * 21,
      getItemKey: (index2) => entries2[index2]?.id ?? index2,
      initialRect: {
        width: 800,
        height: 600,
      },
      overscan: 3,
    });
    reactExports.useImperativeHandle(
      forwardedRef,
      () => ({
        scrollToIndex(index2) {
          if (virtualized) {
            virtualizer.scrollToIndex(index2, {
              align: "center",
            });
            return;
          }
          const child = scrollRef.current?.children.item(index2);
          if (child instanceof HTMLElement)
            child.scrollIntoView({
              block: "center",
            });
        },
      }),
      [virtualized, virtualizer],
    );
    if (!virtualized) {
      return (
        <div
          ref={scrollRef}
          className="min-h-0 flex-1 overflow-y-auto px-6 py-4"
        >
          {entries2.map((entry) => (
            <div key={entry.id} className="pb-3">
              <SourceDiffReviewCard
                entry={entry}
                blocked={blocked}
                onUndo={onUndo}
                onAccept={onAccept}
              />
            </div>
          ))}
        </div>
      );
    }
    const virtualRows = virtualizer.getVirtualItems();
    if (virtualRows.length === 0) {
      return (
        <div
          ref={scrollRef}
          className="min-h-0 flex-1 overflow-y-auto px-6 py-4"
        >
          {entries2.slice(0, 10).map((entry) => (
            <div key={entry.id} className="pb-3">
              <SourceDiffReviewCard
                entry={entry}
                blocked={blocked}
                onUndo={onUndo}
                onAccept={onAccept}
              />
            </div>
          ))}
        </div>
      );
    }
    return (
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
        <div
          className="relative w-full"
          style={{
            height: virtualizer.getTotalSize(),
          }}
        >
          {virtualRows.map((virtualRow) => {
            const entry = entries2[virtualRow.index];
            if (!entry) return null;
            return (
              <div
                key={entry.id}
                ref={virtualizer.measureElement}
                data-index={virtualRow.index}
                className="absolute top-0 left-0 w-full pb-3"
                style={{
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <SourceDiffReviewCard
                  entry={entry}
                  blocked={blocked}
                  onUndo={onUndo}
                  onAccept={onAccept}
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  },
);

export function useSourceDiffReview(nodeId, options) {
  const { sourceMarkdown, readCurrentMarkdown, onReviewDocumentApplied } =
    options;
  const { t: t2 } = useTranslation();
  const session = useDiffReviewStore((state2) => state2.session);
  const queuedSession = useDiffReviewStore((state2) => state2.queuedSession);
  const reverting = useDiffReviewStore((state2) => state2.reverting);
  const acceptHunk = useDiffReviewStore((state2) => state2.acceptHunk);
  const acceptAll = useDiffReviewStore((state2) => state2.acceptAll);
  const requestUndo = useDiffReviewStore((state2) => state2.requestUndo);
  const readCurrentMarkdownRef = reactExports.useRef(readCurrentMarkdown);
  readCurrentMarkdownRef.current = readCurrentMarkdown;
  const onReviewDocumentAppliedRef = reactExports.useRef(
    onReviewDocumentApplied,
  );
  onReviewDocumentAppliedRef.current = onReviewDocumentApplied;
  const ownsSession = session !== null && session.nodeId === nodeId;
  const entries2 = reactExports.useMemo(() => {
    if (!ownsSession || !session) return [];
    return buildSourceDiffReviewEntries(session.hunks).filter(
      (entry) => entry.status === "pending",
    );
  }, [ownsSession, session]);
  const active2 = entries2.length > 0;
  const ready =
    ownsSession && session ? isDiffReviewSessionReady(session) : false;
  const reviewBlocked = reverting || !ready;
  const [activeIndex, setActiveIndex] = reactExports.useState(0);
  const activeIndexRef = reactExports.useRef(0);
  const listRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (!nodeId) return;
    useDiffReviewStore.getState().setActiveEditorNodeId(nodeId);
    return () => {
      if (useDiffReviewStore.getState().activeEditorNodeId === nodeId) {
        useDiffReviewStore.getState().setActiveEditorNodeId(null);
      }
    };
  }, [nodeId]);
  reactExports.useEffect(() => {
    const activeCandidate =
      ownsSession && session && !isDiffReviewSessionReady(session)
        ? session
        : null;
    const queuedCandidate =
      queuedSession &&
      queuedSession.nodeId === nodeId &&
      queuedSession.contentReady !== true
        ? queuedSession
        : null;
    if (!activeCandidate && !queuedCandidate) return;
    let cancelled = false;
    void hashDiffReviewMarkdown(sourceMarkdown)
      .then((hash2) => {
        if (cancelled || hash2 === null) return;
        if (readCurrentMarkdownRef.current() !== sourceMarkdown) return;
        if (queuedCandidate && hash2 === queuedCandidate.contentHash) {
          useDiffReviewStore
            .getState()
            .promoteQueuedSession(queuedCandidate.requestId);
          return;
        }
        if (!activeCandidate || hash2 !== activeCandidate.contentHash) return;
        const current2 = useDiffReviewStore.getState().session;
        if (
          !current2 ||
          current2.requestId !== activeCandidate.requestId ||
          current2.nodeId !== nodeId
        )
          return;
        useDiffReviewStore
          .getState()
          .setContentReady(activeCandidate.requestId);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [ownsSession, session, queuedSession, nodeId, sourceMarkdown]);
  reactExports.useEffect(() => {
    if (!ownsSession || !session || !nodeId) return;
    const handler = (transition2) => {
      if (
        transition2.before.nodeId !== nodeId ||
        transition2.after.nodeId !== nodeId ||
        !isDiffReviewSessionReady(transition2.before)
      )
        return false;
      if (transition2.kind === "revert") {
        if (transition2.content === void 0) return false;
        const queued = useDiffReviewStore.getState().queuedSession;
        const supersededByLoadedQueue =
          queued?.nodeId === nodeId && queued.contentReady === true;
        if (!supersededByLoadedQueue) {
          onReviewDocumentAppliedRef.current(transition2.content);
        }
      }
      useDiffReviewStore.getState().restoreHistorySession(transition2.after);
      if (!transition2.after.hunks.some((hunk) => hunk.status === "pending")) {
        useDiffReviewStore
          .getState()
          .finishHistorySession(transition2.after.requestId);
      }
      return true;
    };
    useDiffReviewStore.getState().setHistoryHandler(handler);
    return () => {
      if (useDiffReviewStore.getState().historyHandler === handler) {
        useDiffReviewStore.getState().setHistoryHandler(null);
      }
    };
  }, [ownsSession, session, nodeId]);
  reactExports.useEffect(() => {
    const next2 = Math.min(
      activeIndexRef.current,
      Math.max(0, entries2.length - 1),
    );
    activeIndexRef.current = next2;
    setActiveIndex(next2);
  }, [entries2.length]);
  const step = reactExports.useCallback(
    (direction) => {
      if (entries2.length === 0) return;
      const next2 =
        (activeIndexRef.current + direction + entries2.length) %
        entries2.length;
      activeIndexRef.current = next2;
      setActiveIndex(next2);
      listRef.current?.scrollToIndex(next2);
    },
    [entries2.length],
  );
  const undoOne = reactExports.useCallback(
    (id2) => {
      if (reviewBlocked) return;
      void requestUndo([id2]);
    },
    [requestUndo, reviewBlocked],
  );
  const acceptOne = reactExports.useCallback(
    (id2) => {
      if (reviewBlocked) return;
      acceptHunk(id2);
    },
    [acceptHunk, reviewBlocked],
  );
  const undoAll = reactExports.useCallback(() => {
    if (reviewBlocked) return;
    void requestUndo();
  }, [requestUndo, reviewBlocked]);
  const keepAll = reactExports.useCallback(() => {
    if (reviewBlocked) return;
    acceptAll();
  }, [acceptAll, reviewBlocked]);
  const headerLeft = reactExports.useMemo(() => {
    if (!active2) return null;
    const navClass =
      "flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50";
    return (
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="text-sm font-medium text-foreground">
          {t2("canvas.diffReview.counter", "{{current}} / {{total}} 处修改", {
            current: Math.min(activeIndex + 1, entries2.length),
            total: entries2.length,
          })}
        </span>
        <button
          type="button"
          title={t2("canvas.diffReview.prev", "上一处")}
          onClick={() => step(-1)}
          className={navClass}
          data-action-ui-id="canvas-source-diff-review-prev"
        >
          <ChevronUp size={14} strokeWidth={1.5} aria-hidden="true" />
        </button>
        <button
          type="button"
          title={t2("canvas.diffReview.next", "下一处")}
          onClick={() => step(1)}
          className={navClass}
          data-action-ui-id="canvas-source-diff-review-next"
        >
          <ChevronDown size={14} strokeWidth={1.5} aria-hidden="true" />
        </button>
      </div>
    );
  }, [active2, activeIndex, entries2.length, step, t2]);
  const toolbarActions = reactExports.useMemo(() => {
    if (!active2) return null;
    return (
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={reviewBlocked}
          onClick={undoAll}
          className="h-7 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
          data-action-ui-id="canvas-source-diff-review-undo-all"
        >
          {t2("canvas.diffReview.undoAll", "全部撤销")}
        </button>
        <button
          type="button"
          disabled={reviewBlocked}
          onClick={keepAll}
          className="h-7 rounded-md bg-foreground px-2.5 text-xs font-medium text-background transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
          data-action-ui-id="canvas-source-diff-review-accept-all"
        >
          {t2("canvas.diffReview.acceptAll", "全部接受")}
        </button>
      </div>
    );
  }, [active2, reviewBlocked, undoAll, keepAll, t2]);
  const body2 = reactExports.useMemo(() => {
    if (!active2) return null;
    const truncated = entries2.some((entry) => entry.truncated);
    return (
      <div
        className="absolute inset-0 z-10 flex min-h-0 flex-col bg-background"
        data-action-ui-id="canvas-source-diff-review-page"
      >
        {truncated && (
          <div className="shrink-0 bg-muted px-4 py-2 text-xs text-muted-foreground">
            {t2(
              "canvas.diffReview.truncated",
              "改动内容过大，已仅展示每处修改的首尾片段。",
            )}
          </div>
        )}
        <SourceDiffReviewList
          ref={listRef}
          entries={entries2}
          blocked={reviewBlocked}
          onUndo={undoOne}
          onAccept={acceptOne}
        />
      </div>
    );
  }, [active2, entries2, reviewBlocked, undoOne, acceptOne, t2]);
  return {
    active: active2,
    ready,
    headerLeft,
    toolbarActions,
    body: body2,
  };
}
