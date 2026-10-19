// use-text-version-panel.jsx
import { Trans } from "react-i18next";
import jsxRuntimeExports from "react/jsx-runtime";
import reactExports from "react";
import { useTranslation } from "react-i18next";
import { Pencil, Save } from "../media-editing/lucide-icon-wraps.js";
import { dedupedToast } from "../infra/agent-http-client.js";
import {
  TEXT_VERSION_NOTE_MAX_CHARS,
  TEXT_VERSION_TITLE_MAX_CHARS,
  textVersionNumbers,
} from "../generation/to-workspace-browser-url.js";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  History,
  Sparkles,
  useCanvasBridge,
} from "../media-editing/package.jsx";
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from "../media-editing/use-warn-missing-asset-meta.jsx";
import {
  DropdownMenuContent,
  DropdownMenuItem,
} from "../media-editing/audio-lightbox.jsx";
import { Tooltip } from "../generation/missing-asset-card.jsx";
import { Dialog } from "../canvas/separator.jsx";
import {
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../media-editing/use-preview-text.jsx";
import { Input, Label } from "../media-editing/input.jsx";
import { Button } from "../canvas/node-shell-inner.jsx";
import { useTextVersionPreview } from "./use-text-version-preview.jsx";
import { useDiffReviewStore } from "./use-diff-review-store.js";
import { selectAgentWriteSignalForNode } from "./annotation-gutter.jsx";
/**
 * 产物里有两个 `sha256Hex`：一个是**同步**的手写实现（`sha256Hex`），
 * 一个是**异步**的 `crypto.subtle` 版本（`sha256Hex$1`）。本文件用的是**异步**那个，
 * 还原时 `$1` 被剥掉、留下了同步实现，于是 `.then(...)` 报
 * 「sha256Hex(...).then is not a function」。
 */
async function sha256Hex(text) {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) return null;
  try {
    const digest = await subtle.digest("SHA-256", new TextEncoder().encode(text));
    return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  } catch {
    return null;
  }
}
function useVersionBaselineDirtySync({
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
    void sha256Hex(getContent()).then((hash) => {
      if (cancelled || !hash) return;
      if (hash === latestVersionHash) clearDirty();
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
function TextVersionHistoryMenu({
  versions,
  labelOf,
  showCurrentTag,
  disabled,
  onSelect,
  onRename,
}) {
  const { i18n, t } = useTranslation();
  const [open, setOpen] = reactExports.useState(false);
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        title={t("canvas.textVersion.historyTitle", "历史版本")}
        disabled={disabled}
        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
        data-action-ui-id="canvas-text-version-history"
      >
        <History size={16} strokeWidth={1.5} aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        positionerClassName="z-[10000]"
        className="nowheel autohide-scrollbar max-h-[min(20rem,var(--available-height,20rem))] w-64 overscroll-contain"
      >
        {versions.length === 0 ? (
          <div className="px-3 py-6 text-center text-[12px] opacity-60">
            {t("canvas.textVersion.empty", "暂无历史版本")}
          </div>
        ) : (
          versions.map((version, index) => {
            const restoreSource =
              version.origin === "restore" && version.restoredFromVersionId
                ? versions.find(
                    (source) => source.id === version.restoredFromVersionId,
                  )
                : void 0;
            const storedNote = version.note.trim();
            const isRestoreOperationNote =
              restoreSource &&
              (LEGACY_RESTORE_AUTO_NOTES.has(storedNote) ||
                TARGETED_RESTORE_AUTO_NOTE_PATTERNS.some((pattern) =>
                  pattern.test(storedNote),
                ));
            const restoreSourceLabel = restoreSource
              ? labelOf(restoreSource)
              : "";
            const displayNote = isRestoreOperationNote
              ? t(
                  "canvas.textVersion.autoSnapshotTargetNote",
                  "还原「{{name}}」时自动保存",
                  {
                    name: restoreSourceLabel,
                  },
                )
              : storedNote;
            return (
              <DropdownMenuItem
                key={version.id}
                onClick={() => onSelect(version)}
                className="group/version shrink-0 flex-col items-start gap-0.5"
              >
                <div className="flex w-full items-center gap-1.5">
                  <span className="min-w-0 flex-1 truncate">
                    {labelOf(version)}
                  </span>
                  {index === 0 && showCurrentTag && (
                    <span className="shrink-0 rounded bg-foreground px-1.5 py-0.5 text-[10px] leading-none text-background">
                      {t("canvas.textVersion.current", "当前")}
                    </span>
                  )}
                  <button
                    type="button"
                    title={t("canvas.textVersion.name", "命名")}
                    aria-label={t("canvas.textVersion.name", "命名")}
                    onClick={(event) => {
                      event.stopPropagation();
                      setOpen(false);
                      onRename(version);
                    }}
                    className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-foreground focus-visible:opacity-100 group-hover/version:opacity-100"
                    data-action-ui-id="canvas-text-version-rename"
                  >
                    <Pencil size={12} strokeWidth={1.5} aria-hidden="true" />
                  </button>
                </div>
                {displayNote && (
                  <Tooltip content={displayNote} side="right">
                    {isRestoreOperationNote ? (
                      <span className="w-full truncate text-[11px] text-muted-foreground">
                        <Trans
                          i18nKey="canvas.textVersion.autoSnapshotTargetNoteRich"
                          defaults="还原「<target>{{name}}</target>」时自动保存"
                          values={{
                            name: restoreSourceLabel,
                          }}
                          components={{
                            target: (
                              <span className="font-medium text-foreground" />
                            ),
                          }}
                        />
                      </span>
                    ) : (
                      <span className="w-full truncate text-[11px] opacity-70">
                        {displayNote}
                      </span>
                    )}
                  </Tooltip>
                )}
                <span className="text-[11px] opacity-60">
                  {formatVersionTimestamp(version.createdAt, i18n.language)}
                </span>
              </DropdownMenuItem>
            );
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
function resolveTextVersionLabel(version, position, t) {
  const title = version.title.trim();
  if (version.versionNumber !== void 0)
    return title ? `V${version.versionNumber} ${title}` : `V${version.versionNumber}`;
  if (title) return title;
  if (version.origin === "initial") return t("canvas.textVersion.initial", "初始版本");
  if (version.origin === "restore") return t("canvas.textVersion.autoSnapshot", "还原前的内容");
  if (version.origin === "agent") return t("canvas.textVersion.agentSnapshot", "Agent 修改前自动保存");
  return t("canvas.textVersion.unnamed", "版本 {{n}}", {
    n: position,
  });
}
function useTextVersionLabeler(versions) {
  const { t } = useTranslation();
  return reactExports.useMemo(() => {
    const numbers = textVersionNumbers(versions);
    return (version) =>
      resolveTextVersionLabel(
        version,
        numbers.get(version.id) ?? versions.length + 1,
        t,
      );
  }, [versions, t]);
}
function NameTextVersionDialog({
  version,
  fallbackLabel,
  saving,
  onClose,
  onConfirm,
  onGenerate,
}) {
  const { t } = useTranslation();
  const [title, setTitle] = reactExports.useState("");
  const [note, setNote] = reactExports.useState("");
  const [noteSource, setNoteSource] = reactExports.useState("manual");
  const [generating, setGenerating] = reactExports.useState(false);
  const versionId = version?.id ?? null;
  reactExports.useEffect(() => {
    if (!version) return;
    setTitle(version.title);
    setNote(version.note);
    setNoteSource(version.noteSource);
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
        dedupedToast.error(
          t("canvas.textVersion.aiNoteFailed", "AI 生成失败，请手动填写"),
        );
      }
    } catch {
      dedupedToast.error(
        t("canvas.textVersion.aiNoteFailed", "AI 生成失败，请手动填写"),
      );
    } finally {
      setGenerating(false);
    }
  };
  return (
    <Dialog
      open={version !== null}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>
            {t("canvas.textVersion.nameTitle", "命名版本")}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="text-version-title">
                {t("canvas.textVersion.titleLabel", "标题")}
              </Label>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={generating}
                className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                data-action-ui-id="canvas-text-version-ai-note"
              >
                <Sparkles size={13} strokeWidth={1.5} aria-hidden="true" />
                {generating
                  ? t("canvas.textVersion.aiNoteGenerating", "生成中…")
                  : t("canvas.textVersion.aiNote", "AI 一键填写")}
              </button>
            </div>
            <Input
              id="text-version-title"
              value={title}
              maxLength={TEXT_VERSION_TITLE_MAX_CHARS}
              placeholder={fallbackLabel}
              onChange={(changeEvent) => setTitle(changeEvent.target.value)}
              data-action-ui-id="canvas-text-version-title"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="text-version-note">
              {t("canvas.textVersion.noteLabel", "备注")}
            </Label>
            <textarea
              id="text-version-note"
              value={note}
              rows={4}
              maxLength={TEXT_VERSION_NOTE_MAX_CHARS}
              placeholder={t(
                "canvas.textVersion.notePlaceholder",
                "这个版本改了什么？",
              )}
              onChange={(changeEvent) => {
                setNote(changeEvent.target.value);
                setNoteSource("manual");
              }}
              className="w-full resize-none rounded-md border border-input bg-transparent px-2.5 py-2 text-xs outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
              data-action-ui-id="canvas-text-version-note"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            {t("canvas.cancel", "取消")}
          </Button>
          <Button
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
            {saving
              ? t("canvas.textVersion.saving", "保存中…")
              : t("canvas.save", "保存")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
function useTextVersions({ path, nodeId, flushBeforeSave }) {
  const { textVersions } = useCanvasBridge();
  const [versions, setVersions] = reactExports.useState([]);
  const [quota, setQuota] = reactExports.useState(void 0);
  const [loading, setLoading] = reactExports.useState(false);
  const [saving, setSaving] = reactExports.useState(false);
  const requestSeqRef = reactExports.useRef(0);
  const available = !!textVersions && !!path;
  const refresh = reactExports.useCallback(async () => {
    if (!textVersions || !path) return;
    const seq = requestSeqRef.current + 1;
    requestSeqRef.current = seq;
    setLoading(true);
    try {
      const res = await textVersions.list(path);
      if (requestSeqRef.current !== seq) return;
      setVersions(res.versions);
      setQuota(res.quota);
    } catch {
      if (requestSeqRef.current === seq) setVersions([]);
    } finally {
      if (requestSeqRef.current === seq) setLoading(false);
    }
  }, [textVersions, path]);
  reactExports.useEffect(() => {
    void refresh();
  }, [refresh]);
  const save = reactExports.useCallback(
    async (input) => {
      if (!textVersions || !path) return null;
      setSaving(true);
      try {
        await flushBeforeSave?.();
        const res = await textVersions.save({
          path,
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
    [textVersions, path, nodeId, flushBeforeSave, refresh],
  );
  const rename = reactExports.useCallback(
    async (id, patch) => {
      if (!textVersions) return false;
      setSaving(true);
      try {
        await textVersions.update(id, patch);
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
      if (!textVersions || !path) return null;
      if (!opts?.versionId) await flushBeforeSave?.();
      const res = await textVersions.summarize({
        path,
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
    [textVersions, path, flushBeforeSave],
  );
  const remove = reactExports.useCallback(
    async (id) => {
      if (!textVersions) return;
      await textVersions.remove(id);
      await refresh();
    },
    [textVersions, refresh],
  );
  const setPinned = reactExports.useCallback(
    async (id, pinned) => {
      if (!textVersions) return;
      await textVersions.update(id, {
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
    remove,
    setPinned,
  };
}
function shouldDisableVersionSave(state) {
  if (state.dirty === void 0) return false;
  return !state.dirty && state.hasVersions;
}
function shouldShowCurrentVersionTag(dirty) {
  return dirty !== true;
}
export function useTextVersionPanel({
  path,
  nodeId,
  flushBeforeSave,
  prepareForReplace,
  disabled,
  dirty,
  getContent,
}) {
  const { t } = useTranslation();
  const versions = useTextVersions({
    path,
    nodeId,
    flushBeforeSave,
  });
  const labelOf = useTextVersionLabeler(versions.versions);
  const agentWriteSignal = useDiffReviewStore((state) =>
    selectAgentWriteSignalForNode(state, nodeId),
  );
  const refreshVersions = versions.refresh;
  reactExports.useEffect(() => {
    if (!agentWriteSignal) return;
    void refreshVersions();
  }, [agentWriteSignal, refreshVersions]);
  const [namingId, setNamingId] = reactExports.useState(null);
  const [previewVersion, setPreviewVersion] = reactExports.useState(null);
  const namingVersion = reactExports.useMemo(
    () =>
      namingId
        ? (versions.versions.find((version) => version.id === namingId) ?? null)
        : null,
    [namingId, versions.versions],
  );
  const handleSave = reactExports.useCallback(async () => {
    try {
      const saved = await versions.save();
      if (!saved) {
        dedupedToast.error(t("canvas.textVersion.saveFailed", "保存版本失败"));
        return;
      }
      dirty?.clearDirty();
      dedupedToast.success(t("canvas.textVersion.saved", "已保存版本"), {
        action: {
          label: t("canvas.textVersion.name", "命名"),
          onClick: () => setNamingId(saved.id),
        },
        // Long enough to be a real offer rather than a flash the user has to
        // race; the history list keeps naming reachable after it expires.
        duration: 2e3,
      });
    } catch {
      dedupedToast.error(t("canvas.textVersion.saveFailed", "保存版本失败"));
    }
  }, [versions, t, dirty]);
  const handleConfirmName = reactExports.useCallback(
    async (input) => {
      if (!namingId) return;
      const ok = await versions.rename(namingId, input);
      if (!ok) {
        dedupedToast.error(t("canvas.textVersion.saveFailed", "保存版本失败"));
        return;
      }
      setNamingId(null);
    },
    [namingId, versions, t],
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
  const handleClosePreview = reactExports.useCallback(
    () => setPreviewVersion(null),
    [],
  );
  const handleRestored = reactExports.useCallback(() => {
    void versions.refresh();
  }, [versions]);
  const previewIndex = reactExports.useMemo(
    () =>
      previewVersion
        ? versions.versions.findIndex(
            (version) => version.id === previewVersion.id,
          )
        : -1,
    [previewVersion, versions.versions],
  );
  const previousPreviewVersion =
    previewIndex >= 0 ? versions.versions[previewIndex + 1] : void 0;
  const nextPreviewVersion =
    previewIndex > 0 ? versions.versions[previewIndex - 1] : void 0;
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
  const saveDisabled = disabled || versions.saving || saveDisabledForNoChanges;
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
          disabled={disabled}
          onSelect={setPreviewVersion}
          onRename={(version) => setNamingId(version.id)}
        />
        <button
          type="button"
          title={
            saveDisabledForNoChanges
              ? t("canvas.textVersion.saveNoChanges", "没有新的修改")
              : t("canvas.textVersion.saveTitle", "保存版本")
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

const K2 = new Uint32Array([
  1116352408, 1899447441, 3049323471, 3921009573, 961987163, 1508970993, 2453635748, 2870763221, 3624381080, 310598401,
  607225278, 1426881987, 1925078388, 2162078206, 2614888103, 3248222580, 3835390401, 4022224774, 264347078, 604807628,
  770255983, 1249150122, 1555081692, 1996064986, 2554220882, 2821834349, 2952996808, 3210313671, 3336571891, 3584528711,
  113926993, 338241895, 666307205, 773529912, 1294757372, 1396182291, 1695183700, 1986661051, 2177026350, 2456956037,
  2730485921, 2820302411, 3259730800, 3345764771, 3516065817, 3600352804, 4094571909, 275423344, 430227734, 506948616,
  659060556, 883997877, 958139571, 1322822218, 1537002063, 1747873779, 1955562222, 2024104815, 2227730452, 2361852424,
  2428436474, 2756734187, 3204031479, 3329325298,
]);
