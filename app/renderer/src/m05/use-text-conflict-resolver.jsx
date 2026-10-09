// use-text-conflict-resolver.jsx
import {
  reactExports,
  useTranslation,
  ChevronDown,
  ChevronUp,
  History,
  Pencil,
  Trans,
  dedupedToast,
  Dialog$1,
  Sparkles,
} from "../vendor.js";
import { myersLineHunks, coarseLineHunk } from "../m01/myers-line-hunks.js";
import {
  DropdownMenu$1,
  DropdownMenuTrigger$1,
  DropdownMenuContent$1,
  DropdownMenuItem$1,
} from "../m01/use-lightbox-media-actions.jsx";
import { Tooltip$1 } from "../m01/create-tracker.jsx";
import {
  textVersionNumbers,
  TEXT_VERSION_TITLE_MAX_CHARS,
  TEXT_VERSION_NOTE_MAX_CHARS,
} from "../m01/text-models.js";
import {
  DialogContent$1,
  DialogHeader$1,
  DialogTitle$1,
  DialogFooter$1,
} from "../m02/thumb-chip.jsx";
import { Label$1, Input$1 } from "../m03/use-plugin-host.jsx";
import { Button$2 } from "../m01/use-media-node-actions.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  CONFLICT_CONTEXT_LINES,
  CONFLICT_MAX_HUNKS,
  splitConflictLines,
} from "./table-context-menu.jsx";
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
      contextAfter: externalLines.slice(externalEnd, externalEnd + CONFLICT_CONTEXT_LINES),
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
  return hunks.reduce((total, hunk) => (choices[hunk.id] === void 0 ? total + 1 : total), 0);
}
function mergeConflictChoices(externalText, hunks, choices) {
  const externalLines = splitConflictLines(externalText);
  const merged = [];
  let cursor = 0;
  for (const hunk of hunks) {
    if (hunk.externalStart > cursor)
      merged.push(...externalLines.slice(cursor, hunk.externalStart));
    merged.push(...(choices[hunk.id] === "external" ? hunk.externalLines : hunk.mineLines));
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
function ChoiceButton({ selected: selected2, onClick, children: children2, dataActionUiId }) {
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
function ConflictHunkView({ hunk, index: index2, choice, onChoose, registerRef }) {
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
      {hunk.contextBefore.length > 0 && <LineBlock lines={hunk.contextBefore} tone="context" />}
      <div className="border-y border-border">
        <div className="bg-muted/50 px-3 py-1 text-[11px] text-muted-foreground">
          {t2("canvas.textConflict.externalSide", "Agent 的修改")}
        </div>
        <LineBlock lines={hunk.externalLines} tone="external" dimmed={choice === "mine"} />
        <div className="border-t border-border bg-muted/50 px-3 py-1 text-[11px] text-muted-foreground">
          {t2("canvas.textConflict.mineSide", "我的修改")}
        </div>
        <LineBlock lines={hunk.mineLines} tone="mine" dimmed={choice === "external"} />
      </div>
      {hunk.contextAfter.length > 0 && <LineBlock lines={hunk.contextAfter} tone="context" />}
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
  const resolved = session ? isConflictFullyResolved(session.hunks, choices) : true;
  const unresolvedCount = session ? countUnresolvedConflicts(session.hunks, choices) : 0;
  const complete = reactExports.useCallback(() => {
    if (!session || !isConflictFullyResolved(session.hunks, choices)) return;
    const merged = mergeConflictChoices(session.external, session.hunks, choices);
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
async function sha256Hex(text2) {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) return null;
  try {
    const digest = await subtle.digest("SHA-256", new TextEncoder().encode(text2));
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return null;
  }
}
export function useTextDocumentDirty() {
  const [dirty, setDirty] = reactExports.useState(false);
  const dirtyRef = reactExports.useRef(false);
  const markDirty = reactExports.useCallback(() => {
    if (dirtyRef.current) return;
    dirtyRef.current = true;
    setDirty(true);
  }, []);
  const clearDirty = reactExports.useCallback(() => {
    if (!dirtyRef.current) return;
    dirtyRef.current = false;
    setDirty(false);
  }, []);
  return reactExports.useMemo(
    () => ({
      dirty,
      markDirty,
      clearDirty,
    }),
    [dirty, markDirty, clearDirty],
  );
}
export function useVersionBaselineDirtySync({
  latestVersionHash,
  getContent,
  dirty,
  loading,
  saving,
}) {
  const markDirty = dirty?.markDirty;
  const clearDirty = dirty?.clearDirty;
  reactExports.useEffect(() => {
    if (!markDirty || !clearDirty || !getContent || !latestVersionHash) return;
    if (loading || saving) return;
    let cancelled = false;
    void sha256Hex(getContent()).then((hash2) => {
      if (cancelled || !hash2) return;
      if (hash2 === latestVersionHash) clearDirty();
      else markDirty();
    });
    return () => {
      cancelled = true;
    };
  }, [latestVersionHash, getContent, markDirty, clearDirty, loading, saving]);
}
const LEGACY_RESTORE_AUTO_NOTES = new Set([
  "还原版本前自动保存",
  "Saved automatically before restoring a version",
]);
const TARGETED_RESTORE_AUTO_NOTE_PATTERNS = [
  /^还原(?:到)?「.+」(?:前|时)自动保存$/,
  /^Automatically saved before restoring to .+$/,
  /^Automatically saved when restoring .+$/,
];
function formatVersionTimestamp(ms, locale) {
  try {
    return new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(ms));
  } catch {
    return new Date(ms).toLocaleString();
  }
}
export function TextVersionHistoryMenu({
  versions,
  labelOf,
  showCurrentTag,
  disabled: disabled2,
  onSelect,
  onRename,
}) {
  const { i18n, t: t2 } = useTranslation();
  const [open, setOpen] = reactExports.useState(false);
  return (
    <DropdownMenu$1 open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger$1
        title={t2("canvas.textVersion.historyTitle", "历史版本")}
        disabled={disabled2}
        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
        data-action-ui-id="canvas-text-version-history"
      >
        <History size={16} strokeWidth={1.5} aria-hidden="true" />
      </DropdownMenuTrigger$1>
      <DropdownMenuContent$1
        align="end"
        positionerClassName="z-[10000]"
        className="nowheel autohide-scrollbar max-h-[min(20rem,var(--available-height,20rem))] w-64 overscroll-contain"
      >
        {versions.length === 0 ? (
          <div className="px-3 py-6 text-center text-[12px] opacity-60">
            {t2("canvas.textVersion.empty", "暂无历史版本")}
          </div>
        ) : (
          versions.map((version2, index2) => {
            const restoreSource =
              version2.origin === "restore" && version2.restoredFromVersionId
                ? versions.find((source) => source.id === version2.restoredFromVersionId)
                : void 0;
            const storedNote = version2.note.trim();
            const isRestoreOperationNote =
              restoreSource &&
              (LEGACY_RESTORE_AUTO_NOTES.has(storedNote) ||
                TARGETED_RESTORE_AUTO_NOTE_PATTERNS.some((pattern) => pattern.test(storedNote)));
            const restoreSourceLabel = restoreSource ? labelOf(restoreSource) : "";
            const displayNote = isRestoreOperationNote
              ? t2("canvas.textVersion.autoSnapshotTargetNote", "还原「{{name}}」时自动保存", {
                  name: restoreSourceLabel,
                })
              : storedNote;
            return (
              <DropdownMenuItem$1
                key={version2.id}
                onClick={() => onSelect(version2)}
                className="group/version shrink-0 flex-col items-start gap-0.5"
              >
                <div className="flex w-full items-center gap-1.5">
                  <span className="min-w-0 flex-1 truncate">{labelOf(version2)}</span>
                  {index2 === 0 && showCurrentTag && (
                    <span className="shrink-0 rounded bg-foreground px-1.5 py-0.5 text-[10px] leading-none text-background">
                      {t2("canvas.textVersion.current", "当前")}
                    </span>
                  )}
                  <button
                    type="button"
                    title={t2("canvas.textVersion.name", "命名")}
                    aria-label={t2("canvas.textVersion.name", "命名")}
                    onClick={(event) => {
                      event.stopPropagation();
                      setOpen(false);
                      onRename(version2);
                    }}
                    className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-foreground focus-visible:opacity-100 group-hover/version:opacity-100"
                    data-action-ui-id="canvas-text-version-rename"
                  >
                    <Pencil size={12} strokeWidth={1.5} aria-hidden="true" />
                  </button>
                </div>
                {displayNote && (
                  <Tooltip$1 content={displayNote} side="right">
                    {isRestoreOperationNote ? (
                      <span className="w-full truncate text-[11px] text-muted-foreground">
                        <Trans
                          i18nKey="canvas.textVersion.autoSnapshotTargetNoteRich"
                          defaults="还原「<target>{{name}}</target>」时自动保存"
                          values={{
                            name: restoreSourceLabel,
                          }}
                          components={{
                            target: <span className="font-medium text-foreground" />,
                          }}
                        />
                      </span>
                    ) : (
                      <span className="w-full truncate text-[11px] opacity-70">{displayNote}</span>
                    )}
                  </Tooltip$1>
                )}
                <span className="text-[11px] opacity-60">
                  {formatVersionTimestamp(version2.createdAt, i18n.language)}
                </span>
              </DropdownMenuItem$1>
            );
          })
        )}
      </DropdownMenuContent$1>
    </DropdownMenu$1>
  );
}
function resolveTextVersionLabel(version2, position2, t2) {
  const title = version2.title.trim();
  if (title) return title;
  if (version2.origin === "initial") return t2("canvas.textVersion.initial", "初始版本");
  if (version2.origin === "restore") return t2("canvas.textVersion.autoSnapshot", "还原前的内容");
  if (version2.origin === "agent")
    return t2("canvas.textVersion.agentSnapshot", "Agent 修改前自动保存");
  return t2("canvas.textVersion.unnamed", "版本 {{n}}", {
    n: position2,
  });
}
export function useTextVersionLabeler(versions) {
  const { t: t2 } = useTranslation();
  return reactExports.useMemo(() => {
    const numbers = textVersionNumbers(versions);
    return (version2) =>
      resolveTextVersionLabel(version2, numbers.get(version2.id) ?? versions.length + 1, t2);
  }, [versions, t2]);
}
export function NameTextVersionDialog({
  version: version2,
  fallbackLabel,
  saving,
  onClose,
  onConfirm,
  onGenerate,
}) {
  const { t: t2 } = useTranslation();
  const [title, setTitle] = reactExports.useState("");
  const [note, setNote] = reactExports.useState("");
  const [noteSource, setNoteSource] = reactExports.useState("manual");
  const [generating, setGenerating] = reactExports.useState(false);
  const versionId = version2?.id ?? null;
  reactExports.useEffect(() => {
    if (!version2) return;
    setTitle(version2.title);
    setNote(version2.note);
    setNoteSource(version2.noteSource);
    setGenerating(false);
  }, [versionId]);
  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const generated = await onGenerate();
      if (generated && (generated.title || generated.note)) {
        if (generated.title) setTitle(generated.title);
        if (generated.note) setNote(generated.note);
        setNoteSource("ai");
      } else {
        dedupedToast.error(t2("canvas.textVersion.aiNoteFailed", "AI 生成失败，请手动填写"));
      }
    } catch {
      dedupedToast.error(t2("canvas.textVersion.aiNoteFailed", "AI 生成失败，请手动填写"));
    } finally {
      setGenerating(false);
    }
  };
  return (
    <Dialog$1
      open={version2 !== null}
      onOpenChange={(next2) => {
        if (!next2) onClose();
      }}
    >
      <DialogContent$1 showCloseButton={false}>
        <DialogHeader$1>
          <DialogTitle$1>{t2("canvas.textVersion.nameTitle", "命名版本")}</DialogTitle$1>
        </DialogHeader$1>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label$1 htmlFor="text-version-title">
                {t2("canvas.textVersion.titleLabel", "标题")}
              </Label$1>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={generating}
                className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                data-action-ui-id="canvas-text-version-ai-note"
              >
                <Sparkles size={13} strokeWidth={1.5} aria-hidden="true" />
                {generating
                  ? t2("canvas.textVersion.aiNoteGenerating", "生成中…")
                  : t2("canvas.textVersion.aiNote", "AI 一键填写")}
              </button>
            </div>
            <Input$1
              id="text-version-title"
              value={title}
              maxLength={TEXT_VERSION_TITLE_MAX_CHARS}
              placeholder={fallbackLabel}
              onChange={(e2) => setTitle(e2.target.value)}
              data-action-ui-id="canvas-text-version-title"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label$1 htmlFor="text-version-note">
              {t2("canvas.textVersion.noteLabel", "备注")}
            </Label$1>
            <textarea
              id="text-version-note"
              value={note}
              rows={4}
              maxLength={TEXT_VERSION_NOTE_MAX_CHARS}
              placeholder={t2("canvas.textVersion.notePlaceholder", "这个版本改了什么？")}
              onChange={(e2) => {
                setNote(e2.target.value);
                setNoteSource("manual");
              }}
              className="w-full resize-none rounded-md border border-input bg-transparent px-2.5 py-2 text-xs outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
              data-action-ui-id="canvas-text-version-note"
            />
          </div>
        </div>
        <DialogFooter$1>
          <Button$2 variant="outline" onClick={onClose} disabled={saving}>
            {t2("canvas.cancel", "取消")}
          </Button$2>
          <Button$2
            variant="default"
            disabled={saving}
            onClick={() =>
              onConfirm({
                title: title.trim(),
                note: note.trim(),
                noteSource,
              })
            }
            data-action-ui-id="canvas-text-version-confirm"
          >
            {saving ? t2("canvas.textVersion.saving", "保存中…") : t2("canvas.save", "保存")}
          </Button$2>
        </DialogFooter$1>
      </DialogContent$1>
    </Dialog$1>
  );
}
export function TextDiffHunkView({ hunk, headerActions, containerRef, dataActionUiId }) {
  return (
    <div
      ref={containerRef}
      className="overflow-hidden rounded-md border border-border"
      data-action-ui-id={dataActionUiId}
    >
      <div className="flex items-center justify-between gap-2 bg-muted px-3 py-1 font-mono text-[11px] text-muted-foreground">
        <span>{`@@ -${hunk.oldStart},${hunk.oldCount} +${hunk.newStart},${hunk.newCount} @@`}</span>
        {headerActions}
      </div>
      <div className="font-mono text-xs leading-relaxed">
        {hunk.lines.map((line, index2) => (
          <div
            key={`${hunk.oldStart}-${hunk.newStart}-${index2}`}
            className="flex gap-2 px-3 py-px"
            style={{
              // Canvas diff tokens are shared by inline Agent review and
              // version comparison, including their Light/Dark values.
              background:
                line.kind === "add"
                  ? "var(--canvas-diff-add-bg, oklch(0.72 0.19 145 / 0.18))"
                  : line.kind === "del"
                    ? "var(--canvas-diff-del-bg, oklch(0.63 0.21 25 / 0.12))"
                    : void 0,
            }}
          >
            <span className="w-10 shrink-0 select-none text-right text-muted-foreground">
              {line.oldLine ?? ""}
            </span>
            <span className="w-10 shrink-0 select-none text-right text-muted-foreground">
              {line.newLine ?? ""}
            </span>
            <span className="w-3 shrink-0 select-none text-muted-foreground">
              {line.kind === "add" ? "+" : line.kind === "del" ? "-" : " "}
            </span>
            <span className="whitespace-pre-wrap break-words text-foreground">{line.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
