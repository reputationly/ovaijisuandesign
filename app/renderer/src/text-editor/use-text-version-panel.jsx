// use-text-version-panel.jsx
import {
  dedupedToast,
  jsxRuntimeExports,
  Pencil,
  reactExports,
  Save,
  Trans,
  useTranslation,
} from "../vendor.js";
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
  DropdownMenu$1,
  DropdownMenuTrigger$1,
} from "../media-editing/use-warn-missing-asset-meta.jsx";
import {
  DropdownMenuContent$1,
  DropdownMenuItem$1,
} from "../media-editing/audio-lightbox.jsx";
import { Tooltip$1 } from "../generation/missing-asset-card.jsx";
import { Dialog$1 } from "../canvas/separator.jsx";
import {
  DialogContent$1,
  DialogFooter$1,
  DialogHeader$1,
  DialogTitle$1,
} from "../media-editing/use-preview-text.jsx";
import { Input$1, Label$1 } from "../media-editing/input.jsx";
import { Button$2 } from "../canvas/node-shell-inner.jsx";
import { useTextVersionPreview } from "./use-text-version-preview.jsx";
import { useDiffReviewStore } from "./use-diff-review-store.js";
import { selectAgentWriteSignalForNode } from "./annotation-gutter.jsx";

async function sha256Hex(text2) {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) return null;
  try {
    const digest = await subtle.digest(
      "SHA-256",
      new TextEncoder().encode(text2),
    );
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
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

function TextVersionHistoryMenu({
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
                ? versions.find(
                    (source) => source.id === version2.restoredFromVersionId,
                  )
                : void 0;
            const storedNote = version2.note.trim();
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
              ? t2(
                  "canvas.textVersion.autoSnapshotTargetNote",
                  "还原「{{name}}」时自动保存",
                  {
                    name: restoreSourceLabel,
                  },
                )
              : storedNote;
            return (
              <DropdownMenuItem$1
                key={version2.id}
                onClick={() => onSelect(version2)}
                className="group/version shrink-0 flex-col items-start gap-0.5"
              >
                <div className="flex w-full items-center gap-1.5">
                  <span className="min-w-0 flex-1 truncate">
                    {labelOf(version2)}
                  </span>
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
  if (version2.origin === "initial")
    return t2("canvas.textVersion.initial", "初始版本");
  if (version2.origin === "restore")
    return t2("canvas.textVersion.autoSnapshot", "还原前的内容");
  if (version2.origin === "agent")
    return t2("canvas.textVersion.agentSnapshot", "Agent 修改前自动保存");
  return t2("canvas.textVersion.unnamed", "版本 {{n}}", {
    n: position2,
  });
}

function useTextVersionLabeler(versions) {
  const { t: t2 } = useTranslation();
  return reactExports.useMemo(() => {
    const numbers = textVersionNumbers(versions);
    return (version2) =>
      resolveTextVersionLabel(
        version2,
        numbers.get(version2.id) ?? versions.length + 1,
        t2,
      );
  }, [versions, t2]);
}

function NameTextVersionDialog({
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
        dedupedToast.error(
          t2("canvas.textVersion.aiNoteFailed", "AI 生成失败，请手动填写"),
        );
      }
    } catch {
      dedupedToast.error(
        t2("canvas.textVersion.aiNoteFailed", "AI 生成失败，请手动填写"),
      );
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
          <DialogTitle$1>
            {t2("canvas.textVersion.nameTitle", "命名版本")}
          </DialogTitle$1>
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
              placeholder={t2(
                "canvas.textVersion.notePlaceholder",
                "这个版本改了什么？",
              )}
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
            {saving
              ? t2("canvas.textVersion.saving", "保存中…")
              : t2("canvas.save", "保存")}
          </Button$2>
        </DialogFooter$1>
      </DialogContent$1>
    </Dialog$1>
  );
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
    () =>
      namingId
        ? (versions.versions.find((v2) => v2.id === namingId) ?? null)
        : null,
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
            (version2) => version2.id === previewVersion.id,
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
