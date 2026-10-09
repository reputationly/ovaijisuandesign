// use-text-version-preview.jsx
import { TEXT_VERSION_TIER_S_MAX_BYTES } from "../generation/to-workspace-browser-url.js";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight$1,
  Copy,
  dedupedToast,
  GitCompare,
  Markdown$1,
  reactExports,
  remarkGfm,
  RotateCcw,
  useTranslation,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { bumpFileVersion } from "../infra/use-plugin-metadata-store.js";
import { useCanvasBridge } from "../media-editing/package.jsx";
import { CanvasActionsContext } from "../media-editing/use-canvas-actions.js";
import { TextDiffHunkView } from "./text-diff-hunk-view.jsx";

const COPY_NODE_GAP = 48;

const CONTENT_PAGE_BYTES = 256 * 1024;

const SCROLL_LOAD_THRESHOLD_PX = 400;

const MARKDOWN_RENDER_MAX_BYTES = TEXT_VERSION_TIER_S_MAX_BYTES;

const DIFF_PREF_KEY = "hilo:canvas:text-version:diff-enabled";

function readDiffPreference() {
  try {
    return window.localStorage.getItem(DIFF_PREF_KEY) !== "0";
  } catch {
    return true;
  }
}

function writeDiffPreference(enabled) {
  try {
    window.localStorage.setItem(DIFF_PREF_KEY, enabled ? "1" : "0");
  } catch {}
}

export function useTextVersionPreview({
  version: version2,
  label,
  sourceNodeId,
  prepareForReplace,
  onClose,
  onPrevious,
  onNext,
  onRestored,
}) {
  const { t: t2 } = useTranslation();
  const { textVersions } = useCanvasBridge();
  const canvasActions = reactExports.useContext(CanvasActionsContext);
  const [diffEnabled, setDiffEnabled] =
    reactExports.useState(readDiffPreference);
  const [diff, setDiff] = reactExports.useState(null);
  const [content2, setContent2] = reactExports.useState("");
  const [contentOffset, setContentOffset] = reactExports.useState(0);
  const [contentEof, setContentEof] = reactExports.useState(false);
  const [loading, setLoading] = reactExports.useState(false);
  const [error, setError] = reactExports.useState(null);
  const [busy, setBusy] = reactExports.useState(false);
  const loadingMoreRef = reactExports.useRef(false);
  const versionId = version2?.id ?? null;
  reactExports.useEffect(() => {
    setDiff(null);
    setContent2("");
    setContentOffset(0);
    setContentEof(false);
    setError(null);
  }, [versionId]);
  reactExports.useEffect(() => {
    if (!textVersions || !diffEnabled || !versionId || diff) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    textVersions
      .diff({
        from: versionId,
      })
      .then((res) => {
        if (!cancelled) setDiff(res);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [textVersions, diffEnabled, versionId, diff]);
  reactExports.useEffect(() => {
    if (!textVersions || diffEnabled || !versionId || diff) return;
    let cancelled = false;
    textVersions
      .diff({
        from: versionId,
      })
      .then((res) => {
        if (!cancelled) setDiff(res);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [textVersions, diffEnabled, versionId, diff]);
  const loadContentPage = reactExports.useCallback(
    async (offset2) => {
      if (!textVersions || !versionId || loadingMoreRef.current) return;
      loadingMoreRef.current = true;
      setLoading(true);
      try {
        const res = await textVersions.readContent(versionId, {
          offset: offset2,
          limit: CONTENT_PAGE_BYTES,
        });
        setContent2((prev) =>
          offset2 === 0 ? res.content : prev + res.content,
        );
        setContentOffset(res.offset + res.length);
        setContentEof(res.eof);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        loadingMoreRef.current = false;
        setLoading(false);
      }
    },
    [textVersions, versionId],
  );
  reactExports.useEffect(() => {
    if (diffEnabled || !versionId) return;
    void loadContentPage(0);
  }, [diffEnabled, versionId, loadContentPage]);
  const handleScroll = reactExports.useCallback(
    (event) => {
      if (diffEnabled || contentEof || loadingMoreRef.current) return;
      const el = event.currentTarget;
      if (
        el.scrollHeight - el.scrollTop - el.clientHeight >
        SCROLL_LOAD_THRESHOLD_PX
      )
        return;
      void loadContentPage(contentOffset);
    },
    [diffEnabled, contentEof, contentOffset, loadContentPage],
  );
  const handleToggleDiff = reactExports.useCallback(() => {
    setDiffEnabled((prev) => {
      const next2 = !prev;
      writeDiffPreference(next2);
      return next2;
    });
  }, []);
  const handleRestore = reactExports.useCallback(async () => {
    if (!textVersions || !versionId) return;
    setBusy(true);
    try {
      await prepareForReplace?.();
      const res = await textVersions.restore(versionId, {
        // Only the note is localized here (the gateway has no i18n surface).
        // The snapshot itself contains the live content being replaced; name
        // the restore TARGET so the row cannot be mistaken for target content.
        autoSnapshotNote: t2(
          "canvas.textVersion.autoSnapshotTargetNote",
          "还原「{{name}}」时自动保存",
          {
            name: label,
          },
        ),
        ...(sourceNodeId
          ? {
              nodeId: sourceNodeId,
            }
          : {}),
      });
      bumpFileVersion(res.path);
      dedupedToast.success(
        res.autoSnapshot
          ? t2(
              "canvas.textVersion.restoredWithSnapshot",
              "已还原，还原前的内容已存为新版本",
            )
          : t2("canvas.textVersion.restored", "已恢复该版本"),
      );
      onRestored();
      onClose();
    } catch {
      dedupedToast.error(t2("canvas.textVersion.restoreFailed", "恢复失败"));
    } finally {
      setBusy(false);
    }
  }, [
    textVersions,
    versionId,
    sourceNodeId,
    prepareForReplace,
    t2,
    label,
    onRestored,
    onClose,
  ]);
  const handleCopyToCanvas = reactExports.useCallback(async () => {
    if (!textVersions || !versionId) return;
    setBusy(true);
    try {
      const source = sourceNodeId
        ? canvasActions?.getNodeById(sourceNodeId)
        : void 0;
      const position2 = source
        ? {
            x: source.position.x + source.size.width + COPY_NODE_GAP,
            y: source.position.y,
          }
        : {
            x: 0,
            y: 0,
          };
      const created = await textVersions.materializeToCanvas(versionId, {
        position: position2,
        ...(sourceNodeId
          ? {
              sourceNodeId,
            }
          : {}),
      });
      if (created)
        dedupedToast.success(
          t2("canvas.textVersion.copiedToCanvas", "已复制到画布"),
        );
      else
        dedupedToast.error(
          t2("canvas.textVersion.copyFailed", "复制到画布失败"),
        );
    } catch {
      dedupedToast.error(t2("canvas.textVersion.copyFailed", "复制到画布失败"));
    } finally {
      setBusy(false);
    }
  }, [textVersions, versionId, sourceNodeId, canvasActions, t2]);
  const renderAsMarkdown =
    (version2?.contentBytes ?? 0) <= MARKDOWN_RENDER_MAX_BYTES;
  const contentEl = reactExports.useMemo(
    () =>
      renderAsMarkdown ? (
        <div className="ProseMirror cv-skip text-sm">
          <Markdown$1 remarkPlugins={[remarkGfm]}>{content2}</Markdown$1>
        </div>
      ) : (
        <pre className="whitespace-pre-wrap break-words font-sans text-sm text-foreground">
          {content2}
        </pre>
      ),
    [content2, renderAsMarkdown],
  );
  if (!version2) {
    return {
      headerLeft: null,
      toolbarActions: null,
      body: null,
    };
  }
  const contentMissing = version2.objectState === "missing";
  const matchesCurrent = diff?.total === 0;
  return {
    headerLeft: (
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <button
          type="button"
          onClick={onClose}
          className="flex h-7 shrink-0 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          data-action-ui-id="canvas-text-version-back"
        >
          <ArrowLeft size={14} strokeWidth={1.5} aria-hidden="true" />
          {t2("canvas.textVersion.back", "返回编辑")}
        </button>
        <div
          className="min-w-0 flex-1 truncate text-sm font-medium text-foreground"
          title={label}
        >
          {label}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            title={t2("canvas.textVersion.previous", "上一个版本")}
            aria-label={t2("canvas.textVersion.previous", "上一个版本")}
            onClick={onPrevious}
            disabled={!onPrevious}
            className="flex h-7 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
            data-action-ui-id="canvas-text-version-previous"
          >
            <ChevronLeft size={14} strokeWidth={1.5} aria-hidden="true" />
            {t2("canvas.textVersion.previous", "上一个版本")}
          </button>
          <button
            type="button"
            title={t2("canvas.textVersion.next", "下一个版本")}
            aria-label={t2("canvas.textVersion.next", "下一个版本")}
            onClick={onNext}
            disabled={!onNext}
            className="flex h-7 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
            data-action-ui-id="canvas-text-version-next"
          >
            {t2("canvas.textVersion.next", "下一个版本")}
            <ChevronRight$1 size={14} strokeWidth={1.5} aria-hidden="true" />
          </button>
        </div>
      </div>
    ),
    toolbarActions: (
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={handleToggleDiff}
          aria-pressed={diffEnabled}
          className={`flex h-7 items-center gap-1 rounded-md px-2 text-xs transition-colors ${diffEnabled ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
          data-action-ui-id="canvas-text-version-diff-toggle"
        >
          <GitCompare size={14} strokeWidth={1.5} aria-hidden="true" />
          {t2("canvas.textVersion.diff", "与当前对比")}
        </button>
        <button
          type="button"
          onClick={handleCopyToCanvas}
          disabled={busy || contentMissing}
          className="flex h-7 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
          data-action-ui-id="canvas-text-version-copy-to-canvas"
        >
          <Copy size={14} strokeWidth={1.5} aria-hidden="true" />
          {t2("canvas.textVersion.copyToCanvas", "复制到画布")}
        </button>
        <button
          type="button"
          onClick={handleRestore}
          disabled={busy || contentMissing || matchesCurrent}
          className="flex h-7 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
          data-action-ui-id="canvas-text-version-restore"
        >
          <RotateCcw size={14} strokeWidth={1.5} aria-hidden="true" />
          {matchesCurrent
            ? t2("canvas.textVersion.restoreNoChanges", "当前内容已是此版本")
            : t2("canvas.textVersion.restore", "恢复此版本")}
        </button>
      </div>
    ),
    body: (
      <div className="absolute inset-0 z-10 flex bg-background">
        <div className="flex min-w-0 flex-1 flex-col">
          {contentMissing && (
            <div className="shrink-0 bg-muted px-4 py-2 text-xs text-muted-foreground">
              {t2(
                "canvas.textVersion.contentMissingHint",
                "该版本的内容未随项目导出，只保留了标题和备注。",
              )}
            </div>
          )}
          {diffEnabled && diff && (diff.truncated || diff.coarse) && (
            <div className="shrink-0 bg-muted px-4 py-2 text-xs text-muted-foreground">
              {diff.coarse
                ? t2(
                    "canvas.textVersion.diffCoarse",
                    "改动过多，仅显示合并后的变更区域。",
                  )
                : t2(
                    "canvas.textVersion.diffTruncated",
                    "改动过多，仅显示前 {{count}} 处。",
                    {
                      count: diff.hunks.length,
                    },
                  )}
            </div>
          )}
          <div
            className="min-h-0 flex-1 overflow-y-auto py-4 px-6"
            onScroll={handleScroll}
          >
            {error && <div className="text-xs text-destructive">{error}</div>}
            {!error && diffEnabled && (
              <div className="flex flex-col gap-3">
                {diff?.hunks.length === 0 && (
                  <div className="text-xs text-muted-foreground">
                    {t2(
                      "canvas.textVersion.noChanges",
                      "与当前内容一致，没有差异。",
                    )}
                  </div>
                )}
                {diff?.hunks.map((hunk) => (
                  <TextDiffHunkView
                    key={`${hunk.oldStart}-${hunk.newStart}`}
                    hunk={hunk}
                  />
                ))}
              </div>
            )}
            {!error && !diffEnabled && contentEl}
            {loading && (
              <div className="py-3 text-xs text-muted-foreground">
                {t2("canvas.loading", "加载中…")}
              </div>
            )}
          </div>
        </div>
      </div>
    ),
  };
}
