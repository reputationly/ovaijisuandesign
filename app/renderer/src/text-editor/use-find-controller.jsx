// use-find-controller.jsx
import { reactExports, PluginKey, Extension, Plugin, DecorationSet, Decoration$1, useTranslation, ChevronDown, ChevronRight$1, WholeWord, Regex, ChevronUp, X$7 } from "../vendor.js";
import { LEAF_PLACEHOLDER } from "./locate-hunks-in-doc.js";
import { CaseSensitive, Replace, ReplaceAll } from "../media-editing/parse-item.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  compileFindPattern,
  findMatchesInText,
  pickInitialMatchIndex,
  stepMatchIndex,
} from "./diff-review-highlight.js";
export const findPluginKey = new PluginKey("canvasFindHighlight");
const FIND_MATCH_CLASS = "canvas-find-match";
export const FIND_MATCH_ACTIVE_CLASS = "canvas-find-match-active";
const MAX_FIND_DECORATIONS = 2e3;
function buildDecorations$1(doc2, meta2) {
  if (meta2.ranges.length === 0) return DecorationSet.empty;
  const decorations2 = [];
  const push2 = ({ from: from2, to }, active2) => {
    if (from2 >= to || to > doc2.content.size) return;
    decorations2.push(
      Decoration$1.inline(from2, to, {
        class: active2 ? `${FIND_MATCH_CLASS} ${FIND_MATCH_ACTIVE_CLASS}` : FIND_MATCH_CLASS,
      }),
    );
  };
  const count2 = Math.min(meta2.ranges.length, MAX_FIND_DECORATIONS);
  for (let i2 = 0; i2 < count2; i2++) {
    push2(meta2.ranges[i2], i2 === meta2.activeIndex);
  }
  if (meta2.activeIndex >= count2 && meta2.activeIndex < meta2.ranges.length) {
    push2(meta2.ranges[meta2.activeIndex], true);
  }
  return DecorationSet.create(doc2, decorations2);
}
export const FindHighlight = Extension.create({
  name: "canvasFindHighlight",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: findPluginKey,
        state: {
          init() {
            return DecorationSet.empty;
          },
          apply(tr2, prev) {
            const meta2 = tr2.getMeta(findPluginKey);
            if (meta2) return buildDecorations$1(tr2.doc, meta2);
            if (tr2.docChanged) return prev.map(tr2.mapping, tr2.doc);
            return prev;
          },
        },
        props: {
          decorations(state2) {
            return findPluginKey.getState(state2) ?? DecorationSet.empty;
          },
        },
      }),
    ];
  },
});
export function searchPmDoc(doc2, query, options, maxMatches) {
  const pattern = compileFindPattern(query, options);
  if (!pattern)
    return {
      matches: [],
      limited: false,
    };
  const matches2 = [];
  const cap2 = maxMatches ?? Number.POSITIVE_INFINITY;
  let limited = false;
  doc2.descendants((node2, pos) => {
    if (limited) return false;
    if (!node2.isTextblock) return true;
    const text2 = node2.textBetween(0, node2.content.size, void 0, LEAF_PLACEHOLDER);
    if (text2) {
      const remaining = cap2 - matches2.length;
      const result = findMatchesInText(text2, query, options, {
        maxMatches: remaining,
        baseOffset: pos + 1,
        pattern,
      });
      matches2.push(...result.matches);
      if (result.limited || matches2.length >= cap2) limited = true;
    }
    return false;
  });
  return {
    matches: matches2,
    limited,
  };
}
export async function hashDiffReviewMarkdown(markdown2) {
  if (!globalThis.crypto?.subtle) return null;
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(markdown2),
  );
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
export function resetProseMirrorHistory(editor) {
  const plugins = editor.state.plugins;
  const withoutHistory = plugins.filter((plugin) => plugin.spec.key?.key !== "history$");
  if (withoutHistory.length === plugins.length) return;
  const stateWithoutHistory = editor.state.reconfigure({
    plugins: withoutHistory,
  });
  editor.view.updateState(
    stateWithoutHistory.reconfigure({
      plugins,
    }),
  );
}
export async function reconstructVerifiedDiffReviewBaseline(postApplyMarkdown, session) {
  const contentHash = await hashDiffReviewMarkdown(postApplyMarkdown);
  if (contentHash !== session.contentHash) return null;
  return reconstructDiffReviewBaseline(postApplyMarkdown, session);
}
export function reconstructDiffReviewBaseline(postApplyMarkdown, session) {
  if (session.hunks.every((hunk) => hunk.status === "undone")) return postApplyMarkdown;
  if (session.hunks.some((hunk) => hunk.status === "undone")) return null;
  let markdown2 = postApplyMarkdown;
  const hunks = session.hunks
    .map((hunk, index2) => ({
      hunk,
      index: index2,
    }))
    .sort((a2, b3) => b3.hunk.newStart - a2.hunk.newStart || b3.index - a2.index)
    .map(({ hunk }) => hunk);
  for (const hunk of hunks) {
    if (markdown2.slice(hunk.newStart, hunk.newEnd) !== hunk.replacement) return null;
    markdown2 = `${markdown2.slice(0, hunk.newStart)}${hunk.originalText}${markdown2.slice(hunk.newEnd)}`;
  }
  return markdown2;
}
const DIFF_REVIEW_WRITE_ACK_TTL_MS = 15e3;
const MAX_PENDING_DIFF_REVIEW_WRITE_ACKS = 32;
export function createDiffReviewWriteAckTracker() {
  return {
    epoch: null,
    pending: [],
  };
}
export function beginDiffReviewWriteAckEpoch(tracker2, epoch) {
  if (tracker2.epoch === epoch) return;
  tracker2.epoch = epoch;
  tracker2.pending = [];
}
function pruneExpiredDiffReviewWriteAcks(tracker2, now2) {
  if (tracker2.pending.length === 0) return;
  tracker2.pending = tracker2.pending.filter((entry) => entry.expiresAt > now2);
}
export function enqueueDiffReviewWriteAck(tracker2, markdown2, epoch, now2 = Date.now()) {
  beginDiffReviewWriteAckEpoch(tracker2, epoch);
  pruneExpiredDiffReviewWriteAcks(tracker2, now2);
  tracker2.pending.push({
    markdown: markdown2,
    expiresAt: now2 + DIFF_REVIEW_WRITE_ACK_TTL_MS,
  });
  if (tracker2.pending.length > MAX_PENDING_DIFF_REVIEW_WRITE_ACKS) {
    tracker2.pending.splice(0, tracker2.pending.length - MAX_PENDING_DIFF_REVIEW_WRITE_ACKS);
  }
}
export function consumeDiffReviewWriteAck(tracker2, markdown2, now2 = Date.now()) {
  pruneExpiredDiffReviewWriteAcks(tracker2, now2);
  const index2 = tracker2.pending.findIndex((entry) => entry.markdown === markdown2);
  if (index2 < 0) return false;
  tracker2.pending.splice(index2, 1);
  return true;
}
export function pendingDiffReviewWriteAckCount(tracker2, now2 = Date.now()) {
  pruneExpiredDiffReviewWriteAcks(tracker2, now2);
  return tracker2.pending.length;
}
export function clearDiffReviewWriteAcks(tracker2) {
  tracker2.pending = [];
}
const SEARCH_DEBOUNCE_MS = 150;
const DEFAULT_OPTIONS$1 = {
  matchCase: false,
  wholeWord: false,
  regex: false,
};
const INITIAL_STATE = {
  isOpen: false,
  query: "",
  options: DEFAULT_OPTIONS$1,
  total: 0,
  limited: false,
  currentIndex: -1,
  replaceOpen: false,
  replaceValue: "",
};
export function useFindController(adapter) {
  const adapterRef = reactExports.useRef(adapter);
  adapterRef.current = adapter;
  const [state2, setState] = reactExports.useState(INITIAL_STATE);
  const stateRef = reactExports.useRef(state2);
  const matchesRef = reactExports.useRef([]);
  const inputRef = reactExports.useRef(null);
  const debounceRef = reactExports.useRef(null);
  const update2 = reactExports.useCallback((patch2) => {
    stateRef.current = {
      ...stateRef.current,
      ...patch2,
    };
    setState(stateRef.current);
  }, []);
  const cancelPendingSearch = reactExports.useCallback(() => {
    if (debounceRef.current != null) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  }, []);
  reactExports.useEffect(() => cancelPendingSearch, [cancelPendingSearch]);
  const runSearch = reactExports.useCallback(() => {
    const a2 = adapterRef.current;
    const { query, options } = stateRef.current;
    if (!query) {
      a2.clear();
      matchesRef.current = [];
      update2({
        total: 0,
        limited: false,
        currentIndex: -1,
      });
      return;
    }
    const { matches: matches2, limited, caretPos } = a2.search(query, options);
    matchesRef.current = matches2;
    const initialIndex = pickInitialMatchIndex(matches2, caretPos);
    update2({
      total: matches2.length,
      limited,
      currentIndex: initialIndex,
    });
    if (matches2.length === 0) {
      a2.clear();
    } else {
      a2.activate(matches2, initialIndex);
    }
  }, [update2]);
  const scheduleSearch = reactExports.useCallback(
    (immediate) => {
      cancelPendingSearch();
      if (immediate) {
        runSearch();
        return;
      }
      debounceRef.current = window.setTimeout(() => {
        debounceRef.current = null;
        runSearch();
      }, SEARCH_DEBOUNCE_MS);
    },
    [cancelPendingSearch, runSearch],
  );
  const focusInput = reactExports.useCallback(() => {
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  }, []);
  const open = reactExports.useCallback(() => {
    const selected2 = adapterRef.current.getSelectedText();
    const seed = selected2 && !selected2.includes("\n") ? selected2 : "";
    const patch2 = {};
    if (seed && seed !== stateRef.current.query) patch2.query = seed;
    if (!stateRef.current.isOpen) patch2.isOpen = true;
    if (Object.keys(patch2).length > 0) update2(patch2);
    if (stateRef.current.query) scheduleSearch(true);
    focusInput();
  }, [focusInput, scheduleSearch, update2]);
  const close2 = reactExports.useCallback(() => {
    if (!stateRef.current.isOpen) return;
    cancelPendingSearch();
    matchesRef.current = [];
    update2({
      isOpen: false,
      total: 0,
      limited: false,
      currentIndex: -1,
    });
    adapterRef.current.clear();
    adapterRef.current.focusEditor();
  }, [cancelPendingSearch, update2]);
  const setQuery = reactExports.useCallback(
    (next22) => {
      update2({
        query: next22,
      });
      scheduleSearch(false);
    },
    [scheduleSearch, update2],
  );
  const toggleOption = reactExports.useCallback(
    (key2) => {
      const options = stateRef.current.options;
      update2({
        options: {
          ...options,
          [key2]: !options[key2],
        },
      });
      scheduleSearch(true);
    },
    [scheduleSearch, update2],
  );
  const step = reactExports.useCallback(
    (dir) => {
      const { currentIndex, total } = stateRef.current;
      const nextIndex = stepMatchIndex(currentIndex, total, dir);
      update2({
        currentIndex: nextIndex,
      });
      if (nextIndex >= 0) adapterRef.current.activate(matchesRef.current, nextIndex);
    },
    [update2],
  );
  const next2 = reactExports.useCallback(() => step(1), [step]);
  const prev = reactExports.useCallback(() => step(-1), [step]);
  const refresh = reactExports.useCallback(() => {
    if (!stateRef.current.isOpen || !stateRef.current.query) return;
    scheduleSearch(false);
  }, [scheduleSearch]);
  const toggleReplaceOpen = reactExports.useCallback(() => {
    update2({
      replaceOpen: !stateRef.current.replaceOpen,
    });
  }, [update2]);
  const setReplaceValue = reactExports.useCallback(
    (value) => {
      update2({
        replaceValue: value,
      });
    },
    [update2],
  );
  const replaceCurrent = reactExports.useCallback(() => {
    const { query, options, currentIndex, replaceValue } = stateRef.current;
    const match2 = matchesRef.current[currentIndex];
    if (!query || !match2) return;
    adapterRef.current.replaceOne(match2, query, options, replaceValue);
    scheduleSearch(true);
  }, [scheduleSearch]);
  const replaceAll2 = reactExports.useCallback(() => {
    const { query, options, replaceValue } = stateRef.current;
    if (!query) return;
    adapterRef.current.replaceAll(query, options, replaceValue);
    scheduleSearch(true);
  }, [scheduleSearch]);
  return {
    isOpen: state2.isOpen,
    open,
    close: close2,
    query: state2.query,
    setQuery,
    options: state2.options,
    toggleOption,
    currentIndex: state2.currentIndex,
    total: state2.total,
    limited: state2.limited,
    next: next2,
    prev,
    refresh,
    inputRef,
    replaceOpen: state2.replaceOpen,
    toggleReplaceOpen,
    replaceValue: state2.replaceValue,
    setReplaceValue,
    replaceCurrent,
    replaceAll: replaceAll2,
  };
}
function FindBtn({
  icon,
  title,
  onClick,
  variant,
  active: active2,
  disabled: disabled2,
  dataActionUiId,
}) {
  const toggle = variant === "toggle";
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      onMouseDown={(e2) => e2.preventDefault()}
      disabled={disabled2}
      className={
        toggle
          ? "flex h-5 w-5 shrink-0 items-center justify-center rounded transition-colors"
          : "flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-[var(--bg-subtle,#f5f5f5)] disabled:pointer-events-none disabled:opacity-40"
      }
      style={
        toggle
          ? {
              background: active2 ? "var(--bg-subtle-hover, #e8e8e8)" : "transparent",
              color: active2 ? "var(--fg-default, #141414)" : "var(--fg-muted, #666)",
            }
          : {
              color: "var(--fg-muted, #666)",
            }
      }
      data-action-ui-id={dataActionUiId}
    >
      {icon}
    </button>
  );
}
export function FindBar({ controller }) {
  const { t: t2 } = useTranslation();
  const { query, options, total, currentIndex, limited, replaceOpen, replaceValue } = controller;
  const patternInvalid = reactExports.useMemo(
    () => query !== "" && compileFindPattern(query, options) == null,
    [query, options],
  );
  const handleInputKeyDown = reactExports.useCallback(
    (e2) => {
      if (e2.key === "Enter") {
        e2.preventDefault();
        if (e2.shiftKey) controller.prev();
        else controller.next();
      } else if (e2.key === "Escape") {
        e2.preventDefault();
        e2.stopPropagation();
        controller.close();
      }
    },
    [controller],
  );
  const handleReplaceKeyDown = reactExports.useCallback(
    (e2) => {
      if (e2.key === "Enter") {
        e2.preventDefault();
        controller.replaceCurrent();
      } else if (e2.key === "Escape") {
        e2.preventDefault();
        e2.stopPropagation();
        controller.close();
      }
    },
    [controller],
  );
  const inputBoxStyle = {
    background: "var(--bg-subtle, #f5f5f5)",
    border: "1px solid var(--canvas-node-border, #e0e0e0)",
  };
  return (
    <div
      className="absolute top-2 right-4 z-10 flex items-start gap-0.5 rounded-md py-1 pr-1 pl-0.5"
      style={{
        background: "var(--canvas-node-bg, #fff)",
        border: "1px solid var(--canvas-node-border, #e0e0e0)",
        boxShadow: "var(--canvas-shadow-dropdown, 0 4px 12px rgba(0, 0, 0, 0.12))",
      }}
      data-action-ui-id="canvas-text-find-bar"
    >
      <button
        type="button"
        title={t2("canvas.find.toggleReplace", "切换替换")}
        onClick={controller.toggleReplaceOpen}
        onMouseDown={(e2) => e2.preventDefault()}
        className="flex w-4 items-center justify-center self-stretch rounded transition-colors hover:bg-[var(--bg-subtle,#f5f5f5)]"
        style={{
          color: "var(--fg-muted, #666)",
        }}
        data-action-ui-id="canvas-text-find-toggle-replace"
      >
        {replaceOpen ? (
          <ChevronDown size={14} strokeWidth={1.5} />
        ) : (
          <ChevronRight$1 size={14} strokeWidth={1.5} />
        )}
      </button>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1">
          <div
            className="flex h-7 items-center gap-0.5 rounded-md pr-0.5 pl-1.5"
            style={{
              ...inputBoxStyle,
              border: `1px solid ${patternInvalid ? "var(--fg-danger, #e5484d)" : "var(--canvas-node-border, #e0e0e0)"}`,
            }}
          >
            <input
              ref={controller.inputRef}
              value={query}
              onChange={(e2) => controller.setQuery(e2.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder={t2("canvas.find.placeholder", "查找")}
              spellCheck={false}
              className="w-40 border-0 bg-transparent text-xs outline-none"
              style={{
                color: "var(--fg-default, #141414)",
              }}
              data-action-ui-id="canvas-text-find-input"
            />
            <FindBtn
              variant="toggle"
              icon={<CaseSensitive size={14} strokeWidth={1.5} />}
              title={t2("canvas.find.matchCase", "区分大小写")}
              active={options.matchCase}
              onClick={() => controller.toggleOption("matchCase")}
              dataActionUiId="canvas-text-find-match-case"
            />
            <FindBtn
              variant="toggle"
              icon={<WholeWord size={14} strokeWidth={1.5} />}
              title={t2("canvas.find.wholeWord", "全字匹配")}
              active={options.wholeWord}
              onClick={() => controller.toggleOption("wholeWord")}
              dataActionUiId="canvas-text-find-whole-word"
            />
            <FindBtn
              variant="toggle"
              icon={<Regex size={14} strokeWidth={1.5} />}
              title={t2("canvas.find.regex", "使用正则表达式")}
              active={options.regex}
              onClick={() => controller.toggleOption("regex")}
              dataActionUiId="canvas-text-find-regex"
            />
          </div>
          <span
            className="min-w-12 px-0.5 text-center text-[11px] tabular-nums"
            style={{
              color: "var(--fg-muted, #666)",
            }}
            data-action-ui-id="canvas-text-find-count"
          >
            {total > 0
              ? `${currentIndex + 1}/${total}${limited ? "+" : ""}`
              : t2("canvas.find.noResults", "无结果")}
          </span>
          <FindBtn
            variant="nav"
            icon={<ChevronUp size={14} strokeWidth={1.5} />}
            title={t2("canvas.find.previous", "上一个匹配")}
            onClick={controller.prev}
            disabled={total === 0}
            dataActionUiId="canvas-text-find-prev"
          />
          <FindBtn
            variant="nav"
            icon={<ChevronDown size={14} strokeWidth={1.5} />}
            title={t2("canvas.find.next", "下一个匹配")}
            onClick={controller.next}
            disabled={total === 0}
            dataActionUiId="canvas-text-find-next"
          />
          <FindBtn
            variant="nav"
            icon={<X$7 size={14} strokeWidth={1.5} />}
            title={t2("canvas.close")}
            onClick={controller.close}
            dataActionUiId="canvas-text-find-close"
          />
        </div>
        {replaceOpen && (
          <div className="flex items-center gap-1">
            <div className="flex h-7 items-center rounded-md pl-1.5" style={inputBoxStyle}>
              <input
                value={replaceValue}
                onChange={(e2) => controller.setReplaceValue(e2.target.value)}
                onKeyDown={handleReplaceKeyDown}
                placeholder={t2("canvas.find.replacePlaceholder", "替换")}
                spellCheck={false}
                className="w-40 border-0 bg-transparent text-xs outline-none"
                style={{
                  color: "var(--fg-default, #141414)",
                }}
                data-action-ui-id="canvas-text-find-replace-input"
              />
              <span aria-hidden={true} className="w-[66px] shrink-0" />
            </div>
            <FindBtn
              variant="nav"
              icon={<Replace size={14} strokeWidth={1.5} />}
              title={t2("canvas.find.replace", "替换")}
              onClick={controller.replaceCurrent}
              disabled={total === 0}
              dataActionUiId="canvas-text-find-replace-one"
            />
            <FindBtn
              variant="nav"
              icon={<ReplaceAll size={14} strokeWidth={1.5} />}
              title={t2("canvas.find.replaceAll", "全部替换")}
              onClick={controller.replaceAll}
              disabled={total === 0}
              dataActionUiId="canvas-text-find-replace-all"
            />
          </div>
        )}
      </div>
    </div>
  );
}
