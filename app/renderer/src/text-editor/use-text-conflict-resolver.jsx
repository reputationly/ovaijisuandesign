// use-text-conflict-resolver.jsx
import { __jsx } from "../shared/jsx-runtime.js";
import {
  ChevronDown,
  ChevronUp,
  reactExports,
  useTranslation,
} from "../vendor.js";
import { myersLineHunks } from "./myers-line-hunks.js";
import { coarseLineHunk } from "./build-asr-gateway-request.js";

const CONFLICT_CONTEXT_LINES = 2;

const CONFLICT_MAX_HUNKS = 200;

function splitConflictLines(text2) {
  return text2.length === 0 ? [] : text2.split("\n");
}

function comparisonKey(line) {
  const withoutTrailing = line.replace(/[ \t]+$/, "");
  const indent2 = /^[ \t]*/.exec(withoutTrailing)?.[0] ?? "";
  const body2 = withoutTrailing.slice(indent2.length);
  if (body2.length > 0 && /^[\s|:-]+$/.test(body2)) {
    return indent2 + body2.replace(/\s+/g, "").replace(/-{2,}/g, "-");
  }
  return indent2 + body2.replace(/[ \t]{2,}/g, " ");
}

function groupAdjacent(hunks, context) {
  const groups = [];
  let current2 = null;
  for (const hunk of hunks) {
    if (current2) {
      const previous2 = current2[current2.length - 1];
      const gap = hunk.oldStart - (previous2.oldStart + previous2.oldCount);
      if (gap <= context * 2) {
        current2.push(hunk);
        continue;
      }
    }
    current2 = [hunk];
    groups.push(current2);
  }
  return groups;
}

function buildConflictDiff(externalText, mineText) {
  const externalLines = splitConflictLines(externalText);
  const mineLines = splitConflictLines(mineText);
  const externalKeys = externalLines.map(comparisonKey);
  const mineKeys = mineLines.map(comparisonKey);
  let coarse = false;
  let raw2 = myersLineHunks(externalKeys, mineKeys);
  if (raw2 === null) {
    coarse = true;
    const fallback = coarseLineHunk(externalKeys, mineKeys);
    raw2 = fallback ? [fallback] : [];
  }
  let groups = groupAdjacent(raw2, CONFLICT_CONTEXT_LINES);
  if (groups.length > CONFLICT_MAX_HUNKS) {
    coarse = true;
    const fallback = coarseLineHunk(externalKeys, mineKeys);
    groups = fallback ? [[fallback]] : [];
  }
  const hunks = groups.map((group, index2) => {
    const first2 = group[0];
    const last2 = group[group.length - 1];
    const externalStart = first2.oldStart;
    const externalEnd = last2.oldStart + last2.oldCount;
    const mineStart = first2.newStart;
    const mineEnd = last2.newStart + last2.newCount;
    return {
      id: `conflict-${index2}-${externalStart}-${externalEnd}`,
      externalStart,
      externalCount: externalEnd - externalStart,
      mineStart,
      mineCount: mineEnd - mineStart,
      externalLines: externalLines.slice(externalStart, externalEnd),
      mineLines: mineLines.slice(mineStart, mineEnd),
      contextBefore: externalLines.slice(
        Math.max(0, externalStart - CONFLICT_CONTEXT_LINES),
        externalStart,
      ),
      contextAfter: externalLines.slice(
        externalEnd,
        externalEnd + CONFLICT_CONTEXT_LINES,
      ),
    };
  });
  return {
    hunks,
    coarse,
  };
}

function isConflictFullyResolved(hunks, choices) {
  return hunks.every((hunk) => choices[hunk.id] !== void 0);
}

function countUnresolvedConflicts(hunks, choices) {
  return hunks.reduce(
    (total, hunk) => (choices[hunk.id] === void 0 ? total + 1 : total),
    0,
  );
}

function mergeConflictChoices(externalText, hunks, choices) {
  const externalLines = splitConflictLines(externalText);
  const merged = [];
  let cursor = 0;
  for (const hunk of hunks) {
    if (hunk.externalStart > cursor)
      merged.push(...externalLines.slice(cursor, hunk.externalStart));
    merged.push(
      ...(choices[hunk.id] === "external"
        ? hunk.externalLines
        : hunk.mineLines),
    );
    cursor = hunk.externalStart + hunk.externalCount;
  }
  merged.push(...externalLines.slice(cursor));
  return merged.join("\n");
}

function LineBlock({ lines, tone, dimmed }) {
  const { t: t2 } = useTranslation();
  const background =
    tone === "external"
      ? "var(--canvas-diff-del-bg, oklch(0.63 0.21 25 / 0.12))"
      : tone === "mine"
        ? "var(--canvas-diff-add-bg, oklch(0.72 0.19 145 / 0.18))"
        : void 0;
  return (
    <div
      className={`font-mono text-xs leading-relaxed transition-opacity ${dimmed ? "opacity-40" : ""}`}
      style={{
        background,
      }}
    >
      {lines.length === 0 ? (
        <div className="px-3 py-px text-muted-foreground">
          {t2("canvas.textConflict.emptySide", "（这一侧没有内容）")}
        </div>
      ) : (
        lines.map((line, index2) => (
          <div
            key={`${tone}-${index2}`}
            className="whitespace-pre-wrap break-words px-3 py-px text-foreground"
          >
            {line === "" ? " " : line}
          </div>
        ))
      )}
    </div>
  );
}

function ChoiceButton({
  selected: selected2,
  onClick,
  children: children2,
  dataActionUiId,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected2}
      className={`h-7 rounded-md px-2 text-xs transition-colors ${selected2 ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
      data-action-ui-id={dataActionUiId}
    >
      {children2}
    </button>
  );
}

function ConflictHunkView({
  hunk,
  index: index2,
  choice,
  onChoose,
  registerRef,
}) {
  const { t: t2 } = useTranslation();
  return (
    <div
      ref={(el) => registerRef(hunk.id, el)}
      className="overflow-hidden rounded-lg border border-border"
      data-action-ui-id="canvas-text-conflict-hunk"
    >
      <div className="flex items-center justify-between gap-2 bg-muted px-3 py-1.5">
        <span className="text-xs text-muted-foreground">
          {t2("canvas.textConflict.hunkLabel", "第 {{index}} 处冲突", {
            index: index2 + 1,
          })}
          {choice === void 0 && (
            <span className="ml-2 text-foreground">
              {t2("canvas.textConflict.unresolvedTag", "待处理")}
            </span>
          )}
        </span>
        <div className="flex items-center gap-1">
          <ChoiceButton
            selected={choice === "external"}
            onClick={() => onChoose(hunk.id, "external")}
            dataActionUiId="canvas-text-conflict-use-external"
          >
            {t2("canvas.textConflict.useExternal", "用 Agent 的")}
          </ChoiceButton>
          <ChoiceButton
            selected={choice === "mine"}
            onClick={() => onChoose(hunk.id, "mine")}
            dataActionUiId="canvas-text-conflict-use-mine"
          >
            {t2("canvas.textConflict.useMine", "用我的")}
          </ChoiceButton>
        </div>
      </div>
      {hunk.contextBefore.length > 0 && (
        <LineBlock lines={hunk.contextBefore} tone="context" />
      )}
      <div className="border-y border-border">
        <div className="bg-muted/50 px-3 py-1 text-[11px] text-muted-foreground">
          {t2("canvas.textConflict.externalSide", "Agent 的修改")}
        </div>
        <LineBlock
          lines={hunk.externalLines}
          tone="external"
          dimmed={choice === "mine"}
        />
        <div className="border-t border-border bg-muted/50 px-3 py-1 text-[11px] text-muted-foreground">
          {t2("canvas.textConflict.mineSide", "我的修改")}
        </div>
        <LineBlock
          lines={hunk.mineLines}
          tone="mine"
          dimmed={choice === "external"}
        />
      </div>
      {hunk.contextAfter.length > 0 && (
        <LineBlock lines={hunk.contextAfter} tone="context" />
      )}
    </div>
  );
}

export function useTextConflictResolver({ getMineMarkdown, onResolved }) {
  const { t: t2 } = useTranslation();
  const [session, setSession] = reactExports.useState(null);
  const [choices, setChoices] = reactExports.useState({});
  const [activeIndex, setActiveIndex] = reactExports.useState(0);
  const hunkElsRef = reactExports.useRef(new Map());
  const getMineRef = reactExports.useRef(getMineMarkdown);
  getMineRef.current = getMineMarkdown;
  const onResolvedRef = reactExports.useRef(onResolved);
  onResolvedRef.current = onResolved;
  const open = reactExports.useCallback((externalMarkdown) => {
    const mine = getMineRef.current();
    const { hunks, coarse } = buildConflictDiff(externalMarkdown, mine);
    if (hunks.length === 0) {
      setSession(null);
      setChoices({});
      onResolvedRef.current(mine);
      return false;
    }
    hunkElsRef.current.clear();
    setSession({
      external: externalMarkdown,
      mine,
      hunks,
      coarse,
    });
    setChoices({});
    setActiveIndex(0);
    return true;
  }, []);
  const registerRef = reactExports.useCallback((id2, el) => {
    if (el) hunkElsRef.current.set(id2, el);
    else hunkElsRef.current.delete(id2);
  }, []);
  const choose = reactExports.useCallback((id2, choice) => {
    setChoices((prev) => ({
      ...prev,
      [id2]: choice,
    }));
  }, []);
  const chooseAll = reactExports.useCallback(
    (choice) => {
      if (!session) return;
      const next2 = {};
      for (const hunk of session.hunks) next2[hunk.id] = choice;
      setChoices(next2);
    },
    [session],
  );
  const step = reactExports.useCallback(
    (dir) => {
      if (!session || session.hunks.length === 0) return;
      setActiveIndex((prev) => {
        const total = session.hunks.length;
        const next2 = (prev + dir + total) % total;
        const hunk = session.hunks[next2];
        if (hunk)
          hunkElsRef.current.get(hunk.id)?.scrollIntoView({
            block: "center",
          });
        return next2;
      });
    },
    [session],
  );
  const resolved = session
    ? isConflictFullyResolved(session.hunks, choices)
    : true;
  const unresolvedCount = session
    ? countUnresolvedConflicts(session.hunks, choices)
    : 0;
  const complete = reactExports.useCallback(() => {
    if (!session || !isConflictFullyResolved(session.hunks, choices)) return;
    const merged = mergeConflictChoices(
      session.external,
      session.hunks,
      choices,
    );
    hunkElsRef.current.clear();
    setSession(null);
    setChoices({});
    onResolvedRef.current(merged);
  }, [session, choices]);
  const headerLeft = reactExports.useMemo(() => {
    if (!session) return null;
    const total = session.hunks.length;
    const navBtnClass =
      "flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";
    return (
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="text-sm font-medium text-foreground">
          {t2("canvas.textConflict.title", "需要处理的冲突")}
        </span>
        <span className="text-xs text-muted-foreground">
          {t2("canvas.textConflict.counter", "{{current}} / {{total}} 处", {
            current: Math.min(activeIndex + 1, total),
            total,
          })}
        </span>
        <button
          type="button"
          title={t2("canvas.textConflict.prev", "上一处")}
          onClick={() => step(-1)}
          className={navBtnClass}
          data-action-ui-id="canvas-text-conflict-prev"
        >
          <ChevronUp size={14} strokeWidth={1.5} aria-hidden="true" />
        </button>
        <button
          type="button"
          title={t2("canvas.textConflict.next", "下一处")}
          onClick={() => step(1)}
          className={navBtnClass}
          data-action-ui-id="canvas-text-conflict-next"
        >
          <ChevronDown size={14} strokeWidth={1.5} aria-hidden="true" />
        </button>
      </div>
    );
  }, [session, activeIndex, step, t2]);
  const toolbarActions = reactExports.useMemo(() => {
    if (!session) return null;
    return (
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => chooseAll("external")}
          className="h-7 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          data-action-ui-id="canvas-text-conflict-use-all-external"
        >
          {t2("canvas.textConflict.useAllExternal", "全部用 Agent 的")}
        </button>
        <button
          type="button"
          onClick={() => chooseAll("mine")}
          className="h-7 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          data-action-ui-id="canvas-text-conflict-use-all-mine"
        >
          {t2("canvas.textConflict.useAllMine", "全部用我的")}
        </button>
        <button
          type="button"
          onClick={complete}
          disabled={!resolved}
          className="h-7 rounded-md bg-foreground px-2.5 text-xs font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          data-action-ui-id="canvas-text-conflict-done"
        >
          {resolved
            ? t2("canvas.textConflict.done", "完成合并")
            : t2("canvas.textConflict.remaining", "还有 {{count}} 处未处理", {
                count: unresolvedCount,
              })}
        </button>
      </div>
    );
  }, [session, chooseAll, complete, resolved, unresolvedCount, t2]);
  const body2 = reactExports.useMemo(() => {
    if (!session) return null;
    return (
      <div
        className="absolute inset-0 z-10 flex flex-col bg-background"
        data-action-ui-id="canvas-text-conflict-page"
      >
        <div className="shrink-0 bg-muted px-4 py-2 text-xs text-muted-foreground">
          {t2(
            "canvas.textConflict.banner",
            "你编辑期间 Agent 也改了这个文件。请逐处选择保留哪一侧，全部处理完成后才能退出编辑。",
          )}
          {session.coarse &&
            ` ${t2("canvas.textConflict.coarseHint", "改动过多，已合并为一个区块展示。")}`}
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-6 py-4">
          {session.hunks.map((hunk, index2) => (
            <ConflictHunkView
              key={hunk.id}
              hunk={hunk}
              index={index2}
              choice={choices[hunk.id]}
              onChoose={choose}
              registerRef={registerRef}
            />
          ))}
        </div>
      </div>
    );
  }, [session, choices, choose, registerRef, t2]);
  return {
    active: session !== null,
    open,
    headerLeft,
    toolbarActions,
    body: body2,
  };
}
