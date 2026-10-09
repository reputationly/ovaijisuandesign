// use-text-version-preview.jsx
import { jsxRuntimeExports, reactExports, useTranslation, ChevronRight$1, dedupedToast, Markdown$1, remarkGfm, ArrowLeft, ChevronLeft, GitCompare, Copy, RotateCcw, Save } from "../vendor.js";
import { bumpFileVersion } from "../infra/create-html-iframe-pool-store.jsx";
import { useCanvasBridge, CanvasActionsContext } from "../media-editing/parse-item.jsx";
import { useDiffReviewStore } from "./use-diff-review-store.js";
import { TEXT_VERSION_TIER_S_MAX_BYTES } from "../generation/text-models.js";
import { selectAgentWriteSignalForNode } from "./table-node-inner.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  NameTextVersionDialog,
  TextDiffHunkView,
  TextVersionHistoryMenu,
  useTextVersionLabeler,
  useVersionBaselineDirtySync,
} from "./use-text-conflict-resolver.jsx";
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
function useTextVersionPreview({
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
  const [diffEnabled, setDiffEnabled] = reactExports.useState(readDiffPreference);
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
        setContent2((prev) => (offset2 === 0 ? res.content : prev + res.content));
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
      if (el.scrollHeight - el.scrollTop - el.clientHeight > SCROLL_LOAD_THRESHOLD_PX) return;
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
          ? t2("canvas.textVersion.restoredWithSnapshot", "已还原，还原前的内容已存为新版本")
          : t2("canvas.textVersion.restored", "已恢复该版本"),
      );
      onRestored();
      onClose();
    } catch {
      dedupedToast.error(t2("canvas.textVersion.restoreFailed", "恢复失败"));
    } finally {
      setBusy(false);
    }
  }, [textVersions, versionId, sourceNodeId, prepareForReplace, t2, label, onRestored, onClose]);
  const handleCopyToCanvas = reactExports.useCallback(async () => {
    if (!textVersions || !versionId) return;
    setBusy(true);
    try {
      const source = sourceNodeId ? canvasActions?.getNodeById(sourceNodeId) : void 0;
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
      if (created) dedupedToast.success(t2("canvas.textVersion.copiedToCanvas", "已复制到画布"));
      else dedupedToast.error(t2("canvas.textVersion.copyFailed", "复制到画布失败"));
    } catch {
      dedupedToast.error(t2("canvas.textVersion.copyFailed", "复制到画布失败"));
    } finally {
      setBusy(false);
    }
  }, [textVersions, versionId, sourceNodeId, canvasActions, t2]);
  const renderAsMarkdown = (version2?.contentBytes ?? 0) <= MARKDOWN_RENDER_MAX_BYTES;
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
        <div className="min-w-0 flex-1 truncate text-sm font-medium text-foreground" title={label}>
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
                ? t2("canvas.textVersion.diffCoarse", "改动过多，仅显示合并后的变更区域。")
                : t2("canvas.textVersion.diffTruncated", "改动过多，仅显示前 {{count}} 处。", {
                    count: diff.hunks.length,
                  })}
            </div>
          )}
          <div className="min-h-0 flex-1 overflow-y-auto py-4 px-6" onScroll={handleScroll}>
            {error && <div className="text-xs text-destructive">{error}</div>}
            {!error && diffEnabled && (
              <div className="flex flex-col gap-3">
                {diff?.hunks.length === 0 && (
                  <div className="text-xs text-muted-foreground">
                    {t2("canvas.textVersion.noChanges", "与当前内容一致，没有差异。")}
                  </div>
                )}
                {diff?.hunks.map((hunk) => (
                  <TextDiffHunkView key={`${hunk.oldStart}-${hunk.newStart}`} hunk={hunk} />
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
function useTextVersions({ path: path2, nodeId, flushBeforeSave }) {
  const { textVersions } = useCanvasBridge();
  const [versions, setVersions] = reactExports.useState([]);
  const [quota, setQuota] = reactExports.useState(void 0);
  const [loading, setLoading] = reactExports.useState(false);
  const [saving, setSaving] = reactExports.useState(false);
  const requestSeqRef = reactExports.useRef(0);
  const available = !!textVersions && !!path2;
  const refresh = reactExports.useCallback(async () => {
    if (!textVersions || !path2) return;
    const seq2 = requestSeqRef.current + 1;
    requestSeqRef.current = seq2;
    setLoading(true);
    try {
      const res = await textVersions.list(path2);
      if (requestSeqRef.current !== seq2) return;
      setVersions(res.versions);
      setQuota(res.quota);
    } catch {
      if (requestSeqRef.current === seq2) setVersions([]);
    } finally {
      if (requestSeqRef.current === seq2) setLoading(false);
    }
  }, [textVersions, path2]);
  reactExports.useEffect(() => {
    void refresh();
  }, [refresh]);
  const save = reactExports.useCallback(
    async (input) => {
      if (!textVersions || !path2) return null;
      setSaving(true);
      try {
        await flushBeforeSave?.();
        const res = await textVersions.save({
          path: path2,
          ...(input?.title !== void 0
            ? {
                title: input.title,
              }
            : {}),
          ...(input?.note !== void 0
            ? {
                note: input.note,
              }
            : {}),
          ...(input?.noteSource
            ? {
                noteSource: input.noteSource,
              }
            : {}),
          ...(nodeId
            ? {
                nodeId,
              }
            : {}),
        });
        await refresh();
        return res.version;
      } finally {
        setSaving(false);
      }
    },
    [textVersions, path2, nodeId, flushBeforeSave, refresh],
  );
  const rename = reactExports.useCallback(
    async (id2, patch2) => {
      if (!textVersions) return false;
      setSaving(true);
      try {
        await textVersions.update(id2, patch2);
        await refresh();
        return true;
      } catch {
        return false;
      } finally {
        setSaving(false);
      }
    },
    [textVersions, refresh],
  );
  const summarize = reactExports.useCallback(
    async (opts) => {
      if (!textVersions || !path2) return null;
      if (!opts?.versionId) await flushBeforeSave?.();
      const res = await textVersions.summarize({
        path: path2,
        ...(opts?.versionId
          ? {
              versionId: opts.versionId,
            }
          : {}),
      });
      return {
        title: res.title,
        note: res.note,
      };
    },
    [textVersions, path2, flushBeforeSave],
  );
  const remove2 = reactExports.useCallback(
    async (id2) => {
      if (!textVersions) return;
      await textVersions.remove(id2);
      await refresh();
    },
    [textVersions, refresh],
  );
  const setPinned = reactExports.useCallback(
    async (id2, pinned) => {
      if (!textVersions) return;
      await textVersions.update(id2, {
        pinned,
      });
      await refresh();
    },
    [textVersions, refresh],
  );
  return {
    available,
    versions,
    quota,
    loading,
    saving,
    refresh,
    save,
    rename,
    summarize,
    remove: remove2,
    setPinned,
  };
}
function shouldDisableVersionSave(state2) {
  if (state2.dirty === void 0) return false;
  return !state2.dirty && state2.hasVersions;
}
function shouldShowCurrentVersionTag(dirty) {
  return dirty !== true;
}
export function useTextVersionPanel({
  path: path2,
  nodeId,
  flushBeforeSave,
  prepareForReplace,
  disabled: disabled2,
  dirty,
  getContent,
}) {
  const { t: t2 } = useTranslation();
  const versions = useTextVersions({
    path: path2,
    nodeId,
    flushBeforeSave,
  });
  const labelOf = useTextVersionLabeler(versions.versions);
  const agentWriteSignal = useDiffReviewStore((state2) =>
    selectAgentWriteSignalForNode(state2, nodeId),
  );
  const refreshVersions = versions.refresh;
  reactExports.useEffect(() => {
    if (!agentWriteSignal) return;
    void refreshVersions();
  }, [agentWriteSignal, refreshVersions]);
  const [namingId, setNamingId] = reactExports.useState(null);
  const [previewVersion, setPreviewVersion] = reactExports.useState(null);
  const namingVersion = reactExports.useMemo(
    () => (namingId ? (versions.versions.find((v2) => v2.id === namingId) ?? null) : null),
    [namingId, versions.versions],
  );
  const handleSave = reactExports.useCallback(async () => {
    try {
      const saved = await versions.save();
      if (!saved) {
        dedupedToast.error(t2("canvas.textVersion.saveFailed", "保存版本失败"));
        return;
      }
      dirty?.clearDirty();
      dedupedToast.success(t2("canvas.textVersion.saved", "已保存版本"), {
        action: {
          label: t2("canvas.textVersion.name", "命名"),
          onClick: () => setNamingId(saved.id),
        },
        // Long enough to be a real offer rather than a flash the user has to
        // race; the history list keeps naming reachable after it expires.
        duration: 2e3,
      });
    } catch {
      dedupedToast.error(t2("canvas.textVersion.saveFailed", "保存版本失败"));
    }
  }, [versions, t2, dirty]);
  const handleConfirmName = reactExports.useCallback(
    async (input) => {
      if (!namingId) return;
      const ok2 = await versions.rename(namingId, input);
      if (!ok2) {
        dedupedToast.error(t2("canvas.textVersion.saveFailed", "保存版本失败"));
        return;
      }
      setNamingId(null);
    },
    [namingId, versions, t2],
  );
  const handleGenerateName = reactExports.useCallback(
    () =>
      versions.summarize(
        namingId
          ? {
              versionId: namingId,
            }
          : void 0,
      ),
    [versions, namingId],
  );
  const handleClosePreview = reactExports.useCallback(() => setPreviewVersion(null), []);
  const handleRestored = reactExports.useCallback(() => {
    void versions.refresh();
  }, [versions]);
  const previewIndex = reactExports.useMemo(
    () =>
      previewVersion
        ? versions.versions.findIndex((version2) => version2.id === previewVersion.id)
        : -1,
    [previewVersion, versions.versions],
  );
  const previousPreviewVersion = previewIndex >= 0 ? versions.versions[previewIndex + 1] : void 0;
  const nextPreviewVersion = previewIndex > 0 ? versions.versions[previewIndex - 1] : void 0;
  const handlePreviousPreview = reactExports.useCallback(() => {
    if (previousPreviewVersion) setPreviewVersion(previousPreviewVersion);
  }, [previousPreviewVersion]);
  const handleNextPreview = reactExports.useCallback(() => {
    if (nextPreviewVersion) setPreviewVersion(nextPreviewVersion);
  }, [nextPreviewVersion]);
  const preview = useTextVersionPreview({
    version: previewVersion,
    label: previewVersion ? labelOf(previewVersion) : "",
    ...(nodeId
      ? {
          sourceNodeId: nodeId,
        }
      : {}),
    ...(prepareForReplace
      ? {
          prepareForReplace,
        }
      : {}),
    onClose: handleClosePreview,
    ...(previousPreviewVersion
      ? {
          onPrevious: handlePreviousPreview,
        }
      : {}),
    ...(nextPreviewVersion
      ? {
          onNext: handleNextPreview,
        }
      : {}),
    onRestored: handleRestored,
  });
  useVersionBaselineDirtySync({
    latestVersionHash: versions.versions[0]?.contentHash,
    getContent,
    dirty,
    loading: versions.loading,
    saving: versions.saving,
  });
  const saveDisabledForNoChanges = shouldDisableVersionSave({
    dirty: dirty?.dirty,
    hasVersions: versions.versions.length > 0,
  });
  const saveDisabled = disabled2 || versions.saving || saveDisabledForNoChanges;
  if (!versions.available) {
    return {
      toolbarButtons: null,
      versionSaving: false,
      preview: null,
      previewHeaderLeft: null,
      previewToolbar: null,
      dialog: null,
      previewing: false,
    };
  }
  return {
    versionSaving: versions.saving,
    toolbarButtons: (
      <>
        <TextVersionHistoryMenu
          versions={versions.versions}
          labelOf={labelOf}
          showCurrentTag={shouldShowCurrentVersionTag(dirty?.dirty)}
          disabled={disabled2}
          onSelect={setPreviewVersion}
          onRename={(version2) => setNamingId(version2.id)}
        />
        <button
          type="button"
          title={
            saveDisabledForNoChanges
              ? t2("canvas.textVersion.saveNoChanges", "没有新的修改")
              : t2("canvas.textVersion.saveTitle", "保存版本")
          }
          disabled={saveDisabled}
          onClick={handleSave}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
          data-action-ui-id="canvas-text-version-save"
        >
          <Save size={16} strokeWidth={1.5} aria-hidden="true" />
        </button>
      </>
    ),
    preview: preview.body,
    previewHeaderLeft: preview.headerLeft,
    previewToolbar: preview.toolbarActions,
    dialog: (
      <NameTextVersionDialog
        version={namingVersion}
        fallbackLabel={namingVersion ? labelOf(namingVersion) : ""}
        saving={versions.saving}
        onClose={() => setNamingId(null)}
        onConfirm={handleConfirmName}
        onGenerate={handleGenerateName}
      />
    ),
    previewing: previewVersion !== null,
  };
}
