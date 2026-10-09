// use-canvas-tag-download.jsx
import { reactExports, useTranslation, dedupedToast, Plus, API_PATHS, Check, Minus, getRuntimeConfig } from "../vendor.js";
import { Tooltip, TooltipTrigger, Icon } from "../m15/graph.jsx";
import { useCanvasAssetNodeIds } from "../m15/track-events.js";
import { useGatewayFetch } from "../m15/use-resizable-width.js";
import { useMediaActions } from "../m10/use-media-actions.jsx";
import {
  isCanvasKeywordTag,
  validateCanvasTagName,
  isTagNameTaken,
  isCanvasColorTag,
} from "../m01/normalize-tag-registry.js";
import { TooltipContent } from "../asset-center/shared/use-browser-overlay-dialog-props.jsx";
import { getCanvasTagPresentationColor } from "../m11/asset-panel-overlay-host.jsx";
import { Input3 } from "../asset-center/shared/select-content.jsx";
import { useCanvasTags, aggregateTagState, useTagRegistry } from "../m11/use-canvas-tags.jsx";
import { PROJECT_EXPORT_ACTIVITY_HEARTBEAT_INTERVAL_MS } from "../m01/text-models.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { useCanvasTagNameInputLimit } from "./canvas-global-tag-manager.jsx";
import {
  buildAllTaggedDownloadPlan,
  buildSingleTagDownloadPlan,
  useCanvasTagName,
} from "./use-asset-picker-host.jsx";
const TAG_RENAME_DOUBLE_CLICK_WINDOW_MS = 280;
function TagRow({
  tag,
  label,
  state: state2,
  disabled: disabled2,
  onToggle,
  allowRename,
  resolvedNames,
  onRename,
  onEditingChange,
  onBlurSave,
}) {
  const { t: t2 } = useTranslation();
  const tagNameInputLimit = useCanvasTagNameInputLimit();
  const [editing, setEditing] = reactExports.useState(false);
  const [draft, setDraft] = reactExports.useState(label);
  const [saving, setSaving] = reactExports.useState(false);
  const savingRef = reactExports.useRef(false);
  const renameInputRef = reactExports.useRef(null);
  const selectionIntentTimerRef = reactExports.useRef(null);
  reactExports.useEffect(() => setDraft(label), [label]);
  reactExports.useEffect(
    () => () => {
      if (selectionIntentTimerRef.current) clearTimeout(selectionIntentTimerRef.current);
    },
    [],
  );
  reactExports.useEffect(() => {
    if (!editing) return;
    const input = renameInputRef.current;
    if (!input) return;
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }, [editing]);
  const finishRename = () => {
    setEditing(false);
    onEditingChange?.(false);
  };
  const cancelRename = () => {
    setDraft(label);
    finishRename();
  };
  const commitRename = async () => {
    if (savingRef.current) return;
    const name2 = draft.trim();
    const validation = validateCanvasTagName(name2);
    const duplicate = isTagNameTaken(name2, resolvedNames, tag.id);
    if (validation || duplicate) {
      dedupedToast.error(
        t2(
          duplicate
            ? "canvasTags.nameTaken"
            : validation === "required"
              ? "canvasTags.nameRequired"
              : "canvasTags.nameTooLong",
        ),
      );
      cancelRename();
      return;
    }
    if (name2 === label) {
      finishRename();
      return;
    }
    savingRef.current = true;
    setSaving(true);
    try {
      await onRename(name2);
      finishRename();
    } catch {
      setDraft(label);
      finishRename();
      dedupedToast.error(t2("canvasTags.saveFailed"));
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };
  const isColorTag = isCanvasColorTag(tag);
  const marker = isColorTag ? (
    <span
      className="size-[13px] shrink-0 rounded-full ring-1 ring-border"
      style={{
        backgroundColor: getCanvasTagPresentationColor(tag.color),
      }}
      aria-hidden={true}
    />
  ) : (
    <span
      className="size-[13px] shrink-0 rounded-full border-[1px] border-solid border-[rgba(0,0,0,0.4)] dark:border-[rgba(255,255,255,0.6)]"
      aria-hidden={true}
    />
  );
  const handleSelectionIntent = () => {
    if (!allowRename) {
      onToggle();
      return;
    }
    if (selectionIntentTimerRef.current) return;
    selectionIntentTimerRef.current = setTimeout(() => {
      selectionIntentTimerRef.current = null;
      onToggle();
    }, TAG_RENAME_DOUBLE_CLICK_WINDOW_MS);
  };
  if (editing) {
    return (
      <div className="flex h-8 w-full items-center gap-2.5 rounded-md py-1.5 pr-2 pl-[9px] text-[13px]">
        {marker}
        <input
          ref={renameInputRef}
          value={draft}
          disabled={saving}
          aria-label={label}
          className="h-5 min-w-0 flex-1 border-0 bg-transparent p-0 text-inherit outline-none disabled:opacity-50"
          onChange={(event) => setDraft(tagNameInputLimit.acceptChange(event.target.value))}
          onCompositionStart={tagNameInputLimit.startComposition}
          onCompositionEnd={(event) =>
            setDraft(tagNameInputLimit.finishComposition(event.currentTarget.value))
          }
          onBlur={() => {
            onBlurSave?.();
            void commitRename();
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void commitRename();
            }
            if (event.key === "Escape") {
              event.preventDefault();
              event.stopPropagation();
              cancelRename();
            }
          }}
        />
      </div>
    );
  }
  return (
    <button
      type="button"
      aria-pressed={state2 === "mixed" ? "mixed" : state2 === "all"}
      disabled={disabled2}
      data-action-ui-id="canvas.node-tag-option"
      data-tag-id={tag.id}
      className="flex min-h-8 w-full cursor-pointer items-center gap-2.5 rounded-md py-1.5 pr-2 pl-[9px] text-[13px] outline-hidden select-none hover:bg-popup-item-hover focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
      onClick={handleSelectionIntent}
      onDoubleClick={(event) => {
        if (!allowRename || disabled2) return;
        if (selectionIntentTimerRef.current) {
          clearTimeout(selectionIntentTimerRef.current);
          selectionIntentTimerRef.current = null;
        }
        event.preventDefault();
        event.stopPropagation();
        setDraft(label);
        setEditing(true);
        onEditingChange?.(true);
      }}
    >
      {marker}
      <span className="min-w-0 flex-1 truncate text-left">{label}</span>
      <span
        data-slot="menu-selection-indicator"
        className="flex size-4 shrink-0 items-center justify-center text-muted-foreground"
        aria-hidden={true}
      >
        {state2 === "all" ? (
          <Icon icon={Check} size="md" strokeWidth={2} />
        ) : state2 === "mixed" ? (
          <Icon icon={Minus} size="md" strokeWidth={2} />
        ) : null}
      </span>
    </button>
  );
}
export function CanvasTagPickerPanel({
  assets,
  allowRename = false,
  embedded = false,
  selectionMode = "toggle",
  onRenameEditingChange,
  onRenameBlurSave,
}) {
  const { t: t2 } = useTranslation();
  const tagNameInputLimit = useCanvasTagNameInputLimit();
  const tagName = useCanvasTagName();
  const {
    registry: registry2,
    toggleTagForAssets,
    assignTagToAssets,
    createTag,
    updateTag,
  } = useCanvasTags();
  const [creating, setCreating] = reactExports.useState(false);
  const [newName, setNewName] = reactExports.useState("");
  const [creatingSaving, setCreatingSaving] = reactExports.useState(false);
  const [pendingTagIds, setPendingTagIds] = reactExports.useState(() => new Set());
  const creatingSavingRef = reactExports.useRef(false);
  const pendingTagIdsRef = reactExports.useRef(new Set());
  const resolvedNames = reactExports.useMemo(
    () => new Map(registry2.tags.map((tag) => [tag.id, tagName(tag)])),
    [registry2.tags, tagName],
  );
  const duplicateTag = reactExports.useMemo(() => {
    const name2 = newName.trim();
    if (!name2) return void 0;
    return registry2.tags.find((tag) => tagName(tag).trim() === name2);
  }, [newName, registry2.tags, tagName]);
  const pendingCreateName = creatingSaving ? newName.trim() : "";
  const pendingKeywordCommitted = Boolean(
    pendingCreateName &&
    registry2.tags.some(
      (tag) => isCanvasKeywordTag(tag) && tagName(tag).trim() === pendingCreateName,
    ),
  );
  const nameValidation = validateCanvasTagName(newName);
  const changeSelection = reactExports.useCallback(
    async (tag, state2) => {
      if (pendingTagIdsRef.current.has(tag.id)) return;
      if (selectionMode === "single" && tag.kind === "color" && state2 === "all") return;
      pendingTagIdsRef.current.add(tag.id);
      setPendingTagIds((current2) => new Set(current2).add(tag.id));
      try {
        if (selectionMode === "single" && tag.kind === "color") {
          await assignTagToAssets(tag.id, assets);
        } else {
          await toggleTagForAssets(tag.id, assets);
        }
      } catch {
        dedupedToast.error(t2("canvasTags.saveFailed"));
      } finally {
        pendingTagIdsRef.current.delete(tag.id);
        setPendingTagIds((current2) => {
          const next2 = new Set(current2);
          next2.delete(tag.id);
          return next2;
        });
      }
    },
    [assets, assignTagToAssets, selectionMode, t2, toggleTagForAssets],
  );
  const resetCreate = () => {
    setNewName("");
    setCreating(false);
    onRenameEditingChange?.(false);
  };
  const handleCreate = async () => {
    if (creatingSavingRef.current) return;
    const name2 = newName.trim();
    if (!name2) {
      resetCreate();
      return;
    }
    if (nameValidation) {
      dedupedToast.error(
        t2(nameValidation === "required" ? "canvasTags.nameRequired" : "canvasTags.nameTooLong"),
      );
      resetCreate();
      return;
    }
    creatingSavingRef.current = true;
    setCreatingSaving(true);
    try {
      if (duplicateTag) {
        await assignTagToAssets(duplicateTag.id, assets);
      } else {
        await createTag(name2, assets);
      }
      resetCreate();
    } catch {
      dedupedToast.error(t2("canvasTags.saveFailed"));
      resetCreate();
    } finally {
      creatingSavingRef.current = false;
      setCreatingSaving(false);
    }
  };
  const surfaceClass = embedded
    ? "text-popover-foreground"
    : "elevated-surface-border rounded-lg bg-popover p-1.5 text-popover-foreground shadow-lg";
  const colorTags = registry2.tags.filter(isCanvasColorTag);
  const keywordTags = registry2.tags.filter(isCanvasKeywordTag);
  return (
    <div data-action-ui-id="canvas.node-tag-picker" className={`w-[212px] ${surfaceClass}`}>
      <div className="max-h-[min(32rem,var(--available-height,32rem))] overflow-y-auto">
        {colorTags.length > 0 ? (
          <div>
            <div className="mb-0.5 px-2 py-1">
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      type="button"
                      className="cursor-help text-[13px] font-normal text-muted-foreground outline-hidden focus-visible:ring-2 focus-visible:ring-ring/50"
                    >
                      {t2("canvasTags.colorLabels")}
                    </button>
                  }
                />
                <TooltipContent className="max-w-64" side="top" align="start">
                  {t2("canvasTags.canvasLabelInfo")}
                </TooltipContent>
              </Tooltip>
            </div>
            {colorTags.map((tag) => {
              const state2 = aggregateTagState(tag.id, assets);
              return (
                <TagRow
                  key={tag.id}
                  tag={tag}
                  label={tagName(tag)}
                  state={state2}
                  disabled={pendingTagIds.has(tag.id)}
                  allowRename={allowRename}
                  resolvedNames={resolvedNames}
                  onToggle={() => changeSelection(tag, state2)}
                  onRename={async (name2) => {
                    await updateTag(tag.id, {
                      name: name2,
                    });
                  }}
                  onEditingChange={onRenameEditingChange}
                  onBlurSave={onRenameBlurSave}
                />
              );
            })}
          </div>
        ) : null}
        <div className="mx-2 my-2 border-t border-border/60" aria-hidden={true} />
        <div>
          <div className="mb-0.5 flex h-8 items-center justify-between px-2">
            <div className="flex items-center">
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      type="button"
                      className="cursor-help text-[13px] font-normal text-muted-foreground outline-hidden focus-visible:ring-2 focus-visible:ring-ring/50"
                    >
                      {t2("canvasTags.keywords")}
                    </button>
                  }
                />
                <TooltipContent className="max-w-64" side="top" align="start">
                  {t2("canvasTags.keywordInfo")}
                </TooltipContent>
              </Tooltip>
            </div>
            <button
              type="button"
              disabled={creating}
              aria-label={t2("canvasTags.newKeyword")}
              data-action-ui-id="canvas.node-tag-create"
              className="-mr-1 flex h-[22px] shrink-0 cursor-default items-center gap-0.5 rounded-full border border-border px-[7px] text-[11px] text-foreground/70 outline-hidden hover:border-foreground/80 hover:bg-popup-item-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
              onClick={() => {
                setNewName("");
                setCreating(true);
                onRenameEditingChange?.(true);
              }}
            >
              <Icon icon={Plus} size="xs" strokeWidth={1.5} aria-hidden={true} />
              <span>{t2("canvasTags.add")}</span>
            </button>
          </div>
          {keywordTags.map((tag) => {
            const state2 = aggregateTagState(tag.id, assets);
            return (
              <TagRow
                key={tag.id}
                tag={tag}
                label={tagName(tag)}
                state={state2}
                disabled={pendingTagIds.has(tag.id)}
                allowRename={allowRename}
                resolvedNames={resolvedNames}
                onToggle={() => changeSelection(tag, state2)}
                onRename={async (name2) => {
                  await updateTag(tag.id, {
                    name: name2,
                  });
                }}
                onEditingChange={onRenameEditingChange}
                onBlurSave={onRenameBlurSave}
              />
            );
          })}
          {creating && !pendingKeywordCommitted ? (
            <div className="flex h-8 w-full items-center gap-2.5 py-0.5 pr-2 pl-[9px]">
              <span
                className="size-[13px] shrink-0 rounded-full border-[1px] border-solid border-[rgba(0,0,0,0.4)] dark:border-[rgba(255,255,255,0.6)]"
                aria-hidden={true}
              />
              <Input3
                autoFocus={true}
                value={newName}
                disabled={creatingSaving}
                placeholder={t2("canvasTags.keywordPlaceholder")}
                aria-label={t2("canvasTags.keywordPlaceholder")}
                data-action-ui-id="canvas.node-tag-create-input"
                className="h-7 flex-1 rounded-[8px] border-[0.75px] px-2 text-[13px] focus-visible:ring-0"
                onChange={(event) => setNewName(tagNameInputLimit.acceptChange(event.target.value))}
                onCompositionStart={tagNameInputLimit.startComposition}
                onCompositionEnd={(event) =>
                  setNewName(tagNameInputLimit.finishComposition(event.currentTarget.value))
                }
                onBlur={() => {
                  onRenameBlurSave?.();
                  void handleCreate();
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void handleCreate();
                  }
                  if (event.key === "Escape") {
                    event.preventDefault();
                    event.stopPropagation();
                    resetCreate();
                  }
                }}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
class CanvasTagDownloadActivityError extends Error {
  constructor(options = {}) {
    super("Canvas tag download lifecycle protection is unavailable", options);
    this.name = "CanvasTagDownloadActivityError";
  }
}
const ACTIVITY_REQUEST_TIMEOUT_MS = 5e3;
const RELEASE_RECOVERY_BASE_MS = 1e3;
const RELEASE_RECOVERY_MAX_MS = 3e4;
async function withCanvasTagDownloadActivity({
  gatewayFetch: gatewayFetch2,
  ownerPid,
  task,
  workspaceDir,
}) {
  if (!ownerPid || ownerPid < 1) throw new CanvasTagDownloadActivityError();
  const leaseId = crypto.randomUUID();
  const beginRequest = {
    dir: workspaceDir,
    leaseId,
    ownerPid,
    operation: "canvas-tag-download",
  };
  const leaseRequest = {
    leaseId,
  };
  let heartbeatTimer;
  let heartbeatInFlight;
  const handlePageHide = () => {
    void postActivity(gatewayFetch2, API_PATHS.projectArchiveActivityEnd, leaseRequest, {
      keepalive: true,
    }).catch(() => void 0);
  };
  try {
    try {
      await postActivity(gatewayFetch2, API_PATHS.projectArchiveActivityBegin, beginRequest);
    } catch (error) {
      throw new CanvasTagDownloadActivityError({
        cause: error,
      });
    }
    window.addEventListener("pagehide", handlePageHide, {
      once: true,
    });
    heartbeatTimer = setInterval(() => {
      if (heartbeatInFlight) return;
      heartbeatInFlight = renewActivity(gatewayFetch2, beginRequest, leaseRequest)
        .catch((error) => logActivityWarning("heartbeat", error))
        .finally(() => {
          heartbeatInFlight = void 0;
        });
    }, PROJECT_EXPORT_ACTIVITY_HEARTBEAT_INTERVAL_MS);
    return await task();
  } finally {
    window.removeEventListener("pagehide", handlePageHide);
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    await heartbeatInFlight;
    try {
      await postActivity(gatewayFetch2, API_PATHS.projectArchiveActivityEnd, leaseRequest);
    } catch (error) {
      logActivityWarning("release", error);
      scheduleReleaseRecovery(gatewayFetch2, leaseRequest);
    }
  }
}
async function postActivity(gatewayFetch2, path2, body2, options = {}) {
  return gatewayFetch2(path2, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body2),
    timeoutMs: ACTIVITY_REQUEST_TIMEOUT_MS,
    ...options,
  });
}
async function renewActivity(gatewayFetch2, beginRequest, leaseRequest) {
  const response = await postActivity(
    gatewayFetch2,
    API_PATHS.projectArchiveActivityHeartbeat,
    leaseRequest,
  );
  const raw2 = await response.json();
  const heartbeat = mapHeartbeatResponse(raw2);
  if (heartbeat.renewed) return;
  await postActivity(gatewayFetch2, API_PATHS.projectArchiveActivityBegin, beginRequest);
}
function mapHeartbeatResponse(raw2) {
  if (!raw2 || typeof raw2 !== "object") {
    throw new Error("Workspace export activity heartbeat returned a malformed response");
  }
  const renewed = Reflect.get(raw2, "renewed");
  if (typeof renewed !== "boolean") {
    throw new Error("Workspace export activity heartbeat response is missing renewed");
  }
  return {
    renewed,
  };
}
function scheduleReleaseRecovery(gatewayFetch2, leaseRequest, attempt = 0) {
  const delayMs = Math.min(RELEASE_RECOVERY_BASE_MS * 2 ** attempt, RELEASE_RECOVERY_MAX_MS);
  setTimeout(() => {
    void postActivity(gatewayFetch2, API_PATHS.projectArchiveActivityEnd, leaseRequest).catch(
      (error) => {
        logActivityWarning("release recovery", error);
        scheduleReleaseRecovery(gatewayFetch2, leaseRequest, attempt + 1);
      },
    );
  }, delayMs);
}
function logActivityWarning(phase, error) {
  window.hilo?.logger?.warn(
    `[canvas-tag-download] activity ${phase} failed: ${error instanceof Error ? error.message : String(error)}`,
    "canvas-tag-download",
  );
}
export function useCanvasTagDownload({
  workspaceAssets,
  workspaceId: workspaceId2,
  workspaceRoot,
}) {
  const { t: t2 } = useTranslation();
  const registry2 = useTagRegistry();
  const resolveTagName = useCanvasTagName();
  const canvasNodeIdsByAsset = useCanvasAssetNodeIds(workspaceId2);
  const gatewayFetch2 = useGatewayFetch();
  const { saveManyAs } = useMediaActions();
  const rendererPid = getRuntimeConfig().rendererPid;
  const [downloadingTagId, setDownloadingTagId] = reactExports.useState();
  const [downloadingAll, setDownloadingAll] = reactExports.useState(false);
  const [downloadProgress, setDownloadProgress] = reactExports.useState();
  const activeDownloadControllerRef = reactExports.useRef(void 0);
  const runDownloadRef = reactExports.useRef(async () => {});
  const pendingRetryRef = reactExports.useRef(void 0);
  const mountedRef = reactExports.useRef(true);
  const workspaceIdentityRef = reactExports.useRef({
    workspaceId: workspaceId2,
    workspaceRoot,
  });
  workspaceIdentityRef.current = {
    workspaceId: workspaceId2,
    workspaceRoot,
  };
  const canvasAssetIds = reactExports.useMemo(
    () => new Set(canvasNodeIdsByAsset.keys()),
    [canvasNodeIdsByAsset],
  );
  const planOptions = reactExports.useMemo(
    () =>
      workspaceRoot
        ? {
            assets: workspaceAssets,
            canvasAssetIds,
            tags: registry2.tags,
            workspaceRoot,
            resolveTagName,
          }
        : void 0,
    [canvasAssetIds, registry2.tags, resolveTagName, workspaceAssets, workspaceRoot],
  );
  reactExports.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  const runDownload = reactExports.useCallback(
    async ({ files, rootFolderName, tagId }) => {
      if (activeDownloadControllerRef.current || !workspaceRoot) return;
      const sourceWorkspaceId = workspaceId2;
      const sourceWorkspaceRoot = workspaceRoot;
      const controller = new AbortController();
      activeDownloadControllerRef.current = controller;
      setDownloadingTagId(tagId);
      setDownloadingAll(!tagId);
      setDownloadProgress({
        failedCount: 0,
        processedCount: 0,
        savedCount: 0,
        totalCount: files.length,
      });
      try {
        await withCanvasTagDownloadActivity({
          gatewayFetch: gatewayFetch2,
          ownerPid: rendererPid,
          workspaceDir: workspaceRoot,
          task: () =>
            saveManyAs(files, {
              rootFolderName,
              dialogTitle: t2("canvasTags.selectDownloadFolder"),
              signal: controller.signal,
              onRetry: (failedFiles) => {
                const currentWorkspace = workspaceIdentityRef.current;
                if (
                  !mountedRef.current ||
                  currentWorkspace.workspaceId !== sourceWorkspaceId ||
                  currentWorkspace.workspaceRoot !== sourceWorkspaceRoot
                ) {
                  return;
                }
                const retry = {
                  request: {
                    files: failedFiles,
                    rootFolderName,
                    tagId,
                  },
                  workspaceId: sourceWorkspaceId,
                  workspaceRoot: sourceWorkspaceRoot,
                };
                if (activeDownloadControllerRef.current) {
                  pendingRetryRef.current = retry;
                  return;
                }
                void runDownloadRef.current(retry.request);
              },
              onProgress: (progress) => {
                if (mountedRef.current && activeDownloadControllerRef.current === controller) {
                  setDownloadProgress(progress);
                }
              },
            }),
        });
      } catch (error) {
        dedupedToast.error(
          t2(
            error instanceof CanvasTagDownloadActivityError
              ? "projectArchive.export.failure.activityUnavailable"
              : "common.saveFailed",
          ),
        );
      } finally {
        if (activeDownloadControllerRef.current === controller) {
          activeDownloadControllerRef.current = void 0;
          if (mountedRef.current) {
            setDownloadingTagId(void 0);
            setDownloadingAll(false);
            setDownloadProgress(void 0);
          }
          const pendingRetry = pendingRetryRef.current;
          pendingRetryRef.current = void 0;
          const currentWorkspace = workspaceIdentityRef.current;
          if (
            pendingRetry &&
            mountedRef.current &&
            currentWorkspace.workspaceId === pendingRetry.workspaceId &&
            currentWorkspace.workspaceRoot === pendingRetry.workspaceRoot
          ) {
            void runDownloadRef.current(pendingRetry.request);
          }
        }
      }
    },
    [gatewayFetch2, rendererPid, saveManyAs, t2, workspaceId2, workspaceRoot],
  );
  runDownloadRef.current = runDownload;
  const downloadTag = reactExports.useCallback(
    async (tag) => {
      if (!planOptions || activeDownloadControllerRef.current) return;
      const plan = buildSingleTagDownloadPlan(planOptions, tag.id);
      if (plan.files.length === 0) return;
      await runDownload({
        files: plan.files,
        rootFolderName: resolveTagName(tag),
        tagId: tag.id,
      });
    },
    [planOptions, resolveTagName, runDownload],
  );
  const downloadAllTagged = reactExports.useCallback(async () => {
    if (!planOptions || activeDownloadControllerRef.current) return;
    const plan = buildAllTaggedDownloadPlan(planOptions);
    if (plan.files.length === 0) return;
    await runDownload({
      files: plan.files,
      rootFolderName: t2("canvasTags.downloadAllFolderName"),
    });
  }, [planOptions, runDownload, t2]);
  const cancelDownload = reactExports.useCallback(() => {
    activeDownloadControllerRef.current?.abort();
  }, []);
  return {
    cancelDownload,
    downloadEnabled: Boolean(planOptions && rendererPid),
    downloadProgress,
    downloadingAll,
    downloadingTagId,
    downloadAllTagged,
    downloadTag,
  };
}
