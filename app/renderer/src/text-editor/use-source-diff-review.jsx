// use-source-diff-review.jsx
import { useVirtualizer } from "../infra/use-virtualizer.js";
import reactExports from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronUp } from "../media-editing/lucide-icon-wraps.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { TextDiffHunkView } from "./text-diff-hunk-view.jsx";
import { useDiffReviewStore } from "./use-diff-review-store.js";
import { isDiffReviewSessionReady } from "./is-diff-review-session-ready.js";
import { hashDiffReviewMarkdown } from "./build-decorations.js";

const DIFF_SAMPLE_HEAD_LINES = 100;

const DIFF_SAMPLE_TAIL_LINES = 100;

const DIFF_SAMPLE_MAX_LINE_CHARS = 8 * 1024;

function countNewlines(text) {
  let count = 0;
  for (let index = 0; index < text.length; index += 1) {
    if (text.charCodeAt(index) === 10) count += 1;
  }
  return count;
}

function sampleLine(text) {
  if (text.length <= DIFF_SAMPLE_MAX_LINE_CHARS)
    return {
      text,
      truncated: false,
    };
  const sideLength = Math.floor((DIFF_SAMPLE_MAX_LINE_CHARS - 3) / 2);
  return {
    text: `${text.slice(0, sideLength)} … ${text.slice(-sideLength)}`,
    truncated: true,
  };
}

function sampleChangedText(text) {
  if (text === "") {
    return {
      lineCount: 0,
      lines: [],
      truncated: false,
      trailingNewline: false,
    };
  }
  const head = [];
  const tail = new Array(DIFF_SAMPLE_TAIL_LINES);
  let tailCount = 0;
  let lineCount = 0;
  let cursor = 0;
  let truncatedLine = false;
  while (cursor < text.length) {
    const newline = text.indexOf("\n", cursor);
    const end = newline === -1 ? text.length : newline;
    const sampled = sampleLine(text.slice(cursor, end));
    truncatedLine ||= sampled.truncated;
    const line = {
      text: sampled.text,
      offset: lineCount,
    };
    if (lineCount < DIFF_SAMPLE_HEAD_LINES) {
      head.push(line);
    } else {
      tail[tailCount % DIFF_SAMPLE_TAIL_LINES] = line;
      tailCount += 1;
    }
    lineCount += 1;
    if (newline === -1 || newline === text.length - 1) break;
    cursor = newline + 1;
  }
  const retainedTailCount = Math.min(tailCount, DIFF_SAMPLE_TAIL_LINES);
  const retainedTail = [];
  const tailStart =
    tailCount > DIFF_SAMPLE_TAIL_LINES ? tailCount % DIFF_SAMPLE_TAIL_LINES : 0;
  for (let index = 0; index < retainedTailCount; index += 1) {
    const line = tail[(tailStart + index) % DIFF_SAMPLE_TAIL_LINES];
    if (line) retainedTail.push(line);
  }
  const omitted = lineCount > DIFF_SAMPLE_HEAD_LINES + DIFF_SAMPLE_TAIL_LINES;
  return {
    lineCount,
    lines: omitted
      ? [
          ...head,
          {
            text: "…",
            offset: -1,
            omitted: true,
          },
          ...retainedTail,
        ]
      : [...head, ...retainedTail],
    truncated: omitted || truncatedLine,
    trailingNewline: text.endsWith("\n"),
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
      const text = marksTrailingNewline
        ? `${line.text}${line.text ? " " : ""}↵`
        : line.text;
      return kind === "del"
        ? {
            kind,
            oldLine: startLine + line.offset,
            text,
          }
        : {
            kind:kind,
            newLine: startLine + line.offset,
            text,
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
  const { t } = useTranslation();
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
            {t("canvas.diffReview.undo", "撤销")}
          </button>
          <button
            type="button"
            disabled={blocked}
            onClick={() => onAccept(entry.id)}
            className="h-6 rounded-md bg-foreground px-2 text-xs font-medium text-background transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
            data-action-ui-id="canvas-source-diff-review-accept"
          >
            {t("canvas.diffReview.accept", "接受")}
          </button>
        </div>
      }
    />
  );
}

const SourceDiffReviewList = reactExports.forwardRef(
  function SourceDiffReviewList(
    { entries, blocked, onUndo, onAccept },
    forwardedRef,
  ) {
    const scrollRef = reactExports.useRef(null);
    const virtualized = entries.length > SOURCE_DIFF_VIRTUALIZE_HUNK_THRESHOLD;
    const virtualizer = useVirtualizer({
      count: virtualized ? entries.length : 0,
      getScrollElement: () => scrollRef.current,
      estimateSize: (index) =>
        44 + (entries[index]?.diff.lines.length ?? 1) * 21,
      getItemKey: (index) => entries[index]?.id ?? index,
      initialRect: {
        width: 800,
        height: 600,
      },
      overscan: 3,
    });
    reactExports.useImperativeHandle(
      forwardedRef,
      () => ({
        scrollToIndex(index) {
          if (virtualized) {
            virtualizer.scrollToIndex(index, {
              align: "center",
            });
            return;
          }
          const child = scrollRef.current?.children.item(index);
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
          {entries.map((entry) => (
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
          {entries.slice(0, 10).map((entry) => (
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
            const entry = entries[virtualRow.index];
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
  const { t } = useTranslation();
  const session = useDiffReviewStore((state) => state.session);
  const queuedSession = useDiffReviewStore((state) => state.queuedSession);
  const reverting = useDiffReviewStore((state) => state.reverting);
  const acceptHunk = useDiffReviewStore((state) => state.acceptHunk);
  const acceptAll = useDiffReviewStore((state) => state.acceptAll);
  const requestUndo = useDiffReviewStore((state) => state.requestUndo);
  const readCurrentMarkdownRef = reactExports.useRef(readCurrentMarkdown);
  readCurrentMarkdownRef.current = readCurrentMarkdown;
  const onReviewDocumentAppliedRef = reactExports.useRef(
    onReviewDocumentApplied,
  );
  onReviewDocumentAppliedRef.current = onReviewDocumentApplied;
  const ownsSession = session !== null && session.nodeId === nodeId;
  const entries = reactExports.useMemo(() => {
    if (!ownsSession || !session) return [];
    return buildSourceDiffReviewEntries(session.hunks).filter(
      (entry) => entry.status === "pending",
    );
  }, [ownsSession, session]);
  const active = entries.length > 0;
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
      .then((hash) => {
        if (cancelled || hash === null) return;
        if (readCurrentMarkdownRef.current() !== sourceMarkdown) return;
        if (queuedCandidate && hash === queuedCandidate.contentHash) {
          useDiffReviewStore
            .getState()
            .promoteQueuedSession(queuedCandidate.requestId);
          return;
        }
        if (!activeCandidate || hash !== activeCandidate.contentHash) return;
        const current = useDiffReviewStore.getState().session;
        if (
          !current ||
          current.requestId !== activeCandidate.requestId ||
          current.nodeId !== nodeId
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
    const handler = (transition) => {
      if (
        transition.before.nodeId !== nodeId ||
        transition.after.nodeId !== nodeId ||
        !isDiffReviewSessionReady(transition.before)
      )
        return false;
      if (transition.kind === "revert") {
        if (transition.content === void 0) return false;
        const queued = useDiffReviewStore.getState().queuedSession;
        const supersededByLoadedQueue =
          queued?.nodeId === nodeId && queued.contentReady === true;
        if (!supersededByLoadedQueue) {
          onReviewDocumentAppliedRef.current(transition.content);
        }
      }
      useDiffReviewStore.getState().restoreHistorySession(transition.after);
      if (!transition.after.hunks.some((hunk) => hunk.status === "pending")) {
        useDiffReviewStore
          .getState()
          .finishHistorySession(transition.after.requestId);
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
    const next = Math.min(
      activeIndexRef.current,
      Math.max(0, entries.length - 1),
    );
    activeIndexRef.current = next;
    setActiveIndex(next);
  }, [entries.length]);
  const step = reactExports.useCallback(
    (direction) => {
      if (entries.length === 0) return;
      const next =
        (activeIndexRef.current + direction + entries.length) %
        entries.length;
      activeIndexRef.current = next;
      setActiveIndex(next);
      listRef.current?.scrollToIndex(next);
    },
    [entries.length],
  );
  const undoOne = reactExports.useCallback(
    (id) => {
      if (reviewBlocked) return;
      void requestUndo([id]);
    },
    [requestUndo, reviewBlocked],
  );
  const acceptOne = reactExports.useCallback(
    (id) => {
      if (reviewBlocked) return;
      acceptHunk(id);
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
    if (!active) return null;
    const navClass =
      "flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50";
    return (
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="text-sm font-medium text-foreground">
          {t("canvas.diffReview.counter", "{{current}} / {{total}} 处修改", {
            current: Math.min(activeIndex + 1, entries.length),
            total: entries.length,
          })}
        </span>
        <button
          type="button"
          title={t("canvas.diffReview.prev", "上一处")}
          onClick={() => step(-1)}
          className={navClass}
          data-action-ui-id="canvas-source-diff-review-prev"
        >
          <ChevronUp size={14} strokeWidth={1.5} aria-hidden="true" />
        </button>
        <button
          type="button"
          title={t("canvas.diffReview.next", "下一处")}
          onClick={() => step(1)}
          className={navClass}
          data-action-ui-id="canvas-source-diff-review-next"
        >
          <ChevronDown size={14} strokeWidth={1.5} aria-hidden="true" />
        </button>
      </div>
    );
  }, [active, activeIndex, entries.length, step, t]);
  const toolbarActions = reactExports.useMemo(() => {
    if (!active) return null;
    return (
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={reviewBlocked}
          onClick={undoAll}
          className="h-7 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
          data-action-ui-id="canvas-source-diff-review-undo-all"
        >
          {t("canvas.diffReview.undoAll", "全部撤销")}
        </button>
        <button
          type="button"
          disabled={reviewBlocked}
          onClick={keepAll}
          className="h-7 rounded-md bg-foreground px-2.5 text-xs font-medium text-background transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
          data-action-ui-id="canvas-source-diff-review-accept-all"
        >
          {t("canvas.diffReview.acceptAll", "全部接受")}
        </button>
      </div>
    );
  }, [active, reviewBlocked, undoAll, keepAll, t]);
  const body = reactExports.useMemo(() => {
    if (!active) return null;
    const truncated = entries.some((entry) => entry.truncated);
    return (
      <div
        className="absolute inset-0 z-10 flex min-h-0 flex-col bg-background"
        data-action-ui-id="canvas-source-diff-review-page"
      >
        {truncated && (
          <div className="shrink-0 bg-muted px-4 py-2 text-xs text-muted-foreground">
            {t(
              "canvas.diffReview.truncated",
              "改动内容过大，已仅展示每处修改的首尾片段。",
            )}
          </div>
        )}
        <SourceDiffReviewList
          ref={listRef}
          entries={entries}
          blocked={reviewBlocked}
          onUndo={undoOne}
          onAccept={acceptOne}
        />
      </div>
    );
  }, [active, entries, reviewBlocked, undoOne, acceptOne, t]);
  return {
    active,
    ready,
    headerLeft,
    toolbarActions,
    body,
  };
}
