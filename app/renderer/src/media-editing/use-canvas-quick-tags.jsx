// use-canvas-quick-tags.jsx
import { isAbsoluteLocalFilePath } from "../settings/restart-banner.jsx";
import { joinFilePath } from "../assets/use-file-explorer-canvas-integration.js";
import {
  selectDownloadableCanvasAssets,
  useCanvasTagName,
} from "../assets/use-canvas-model-registry-hydration.js";
import { getFileName } from "../canvas/uploading-assets.jsx";
import { API_PATHS, getRuntimeConfig, reactExports, useTranslation } from "../vendor.js";
import { dedupedToast, useAssetMetadataApi } from "../infra/agent-http-client.js";
import { PROJECT_EXPORT_ACTIVITY_HEARTBEAT_INTERVAL_MS } from "../generation/to-workspace-browser-url.js";
import { useCanvasAssetNodeIds } from "../infra/use-canvas-node-assets-store.js";
import { useGatewayFetch } from "../generation/use-model-catalog-scope-key.js";
import { useMediaActions } from "../settings/use-media-actions.js";
import { useTagRegistry } from "../canvas/conflict-resolution-dialog.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { Popover } from "../assets/credit-query-keys.jsx";
import { getAssetMetaByNodeIdFromStore } from "../canvas/fullscreen-icon.jsx";
import {
  isCanvasColorTag,
  MAX_VISIBLE_CANVAS_TAG_COLORS,
  PRESET_COLOR_NAME_KEYS,
  resolveTagIds,
} from "../infra/parse-connector-selection.js";
import { useCanvasTags } from "../canvas/use-canvas-tags.js";
import { PopoverContent } from "../team/hailuo-credit-row.jsx";
import { CanvasGlobalTagManager } from "../canvas/canvas-global-tag-manager.jsx";
import { CanvasTagPickerPanel } from "../canvas/canvas-tag-picker-panel.jsx";
const TAG_FILTER_FOCUS_ZOOM = 0.8;
const TAG_FILTER_MIN_READABLE_ZOOM = 0.25;
function isEditableTarget(target) {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT" ||
    target.isContentEditable
  );
}
function hasForegroundKeyboardSurface(target) {
  const selector =
    '[role="dialog"]:not([aria-hidden="true"]), [role="menu"]:not([aria-hidden="true"]), [role="listbox"]:not([aria-hidden="true"])';
  if (target instanceof Element && target.closest(selector)) return true;
  return document.querySelector(selector) !== null;
}
function releaseTagFilterToolbarFocus() {
  const activeElement = document.activeElement;
  if (
    activeElement instanceof HTMLElement &&
    activeElement.closest('[data-action-ui-id="canvas.tag-filter-toolbar"]')
  ) {
    activeElement.blur();
  }
}
function useCanvasTagFilter({
  canvasViewRef,
  isPresented,
  workspaceAssets,
  workspaceId,
}) {
  const canvasNodeIdsByAsset = useCanvasAssetNodeIds(workspaceId);
  const [activeTagId, setActiveTagIdState] = reactExports.useState();
  const [focusedNodeId, setFocusedNodeId] = reactExports.useState(null);
  const getMatchedNodeIds = reactExports.useCallback(
    (tagId) => {
      if (!tagId) return [];
      const matchingAssetIds = new Set(
        workspaceAssets
          .filter((asset) => asset.tagIds?.includes(tagId))
          .map((asset) => asset.id),
      );
      const nodeIds = [];
      for (const [assetId, assetNodeIds] of canvasNodeIdsByAsset) {
        if (matchingAssetIds.has(assetId)) nodeIds.push(...assetNodeIds);
      }
      return nodeIds;
    },
    [canvasNodeIdsByAsset, workspaceAssets],
  );
  const matchedNodeIds = reactExports.useMemo(
    () => getMatchedNodeIds(activeTagId),
    [activeTagId, getMatchedNodeIds],
  );
  const cancelPendingFocus = reactExports.useCallback(() => {
    canvasViewRef.current?.cancelPendingFocus();
  }, [canvasViewRef]);
  const focusOverview = reactExports.useCallback(
    (nodeIds) => {
      if (isPresented === false || nodeIds.length === 0) return;
      canvasViewRef.current?.focusNodeIds(nodeIds, {
        expandAncestorGroups: true,
        visibilityPriority: {
          minReadableZoom: TAG_FILTER_MIN_READABLE_ZOOM,
        },
      });
    },
    [canvasViewRef, isPresented],
  );
  const focusNode = reactExports.useCallback(
    (nodeId) => {
      if (isPresented === false) return;
      canvasViewRef.current?.focusNodeIds([nodeId], {
        expandAncestorGroups: true,
        zoom: TAG_FILTER_FOCUS_ZOOM,
      });
    },
    [canvasViewRef, isPresented],
  );
  const setActiveTagId = reactExports.useCallback(
    (tagId) => {
      cancelPendingFocus();
      setActiveTagIdState(tagId);
      setFocusedNodeId(null);
      if (tagId) focusOverview(getMatchedNodeIds(tagId));
    },
    [cancelPendingFocus, focusOverview, getMatchedNodeIds],
  );
  const clearFilter = reactExports.useCallback(
    () => setActiveTagId(void 0),
    [setActiveTagId],
  );
  const locateNode = reactExports.useCallback(
    (nodeId) => {
      cancelPendingFocus();
      focusNode(nodeId);
    },
    [cancelPendingFocus, focusNode],
  );
  const focusPrevious = reactExports.useCallback(() => {
    if (matchedNodeIds.length < 2) return;
    const currentIndex = focusedNodeId
      ? matchedNodeIds.indexOf(focusedNodeId)
      : -1;
    const previousIndex =
      currentIndex < 0
        ? matchedNodeIds.length - 1
        : (currentIndex - 1 + matchedNodeIds.length) % matchedNodeIds.length;
    const previousNodeId = matchedNodeIds[previousIndex];
    if (!previousNodeId) return;
    setFocusedNodeId(previousNodeId);
    focusNode(previousNodeId);
  }, [focusNode, focusedNodeId, matchedNodeIds]);
  const focusNext = reactExports.useCallback(() => {
    if (matchedNodeIds.length < 2) return;
    const currentIndex = focusedNodeId
      ? matchedNodeIds.indexOf(focusedNodeId)
      : -1;
    const nextNodeId =
      matchedNodeIds[(currentIndex + 1) % matchedNodeIds.length];
    if (!nextNodeId) return;
    setFocusedNodeId(nextNodeId);
    focusNode(nextNodeId);
  }, [focusNode, focusedNodeId, matchedNodeIds]);
  const focusedNodeIndex = focusedNodeId
    ? matchedNodeIds.indexOf(focusedNodeId)
    : -1;
  reactExports.useEffect(() => {
    if (!focusedNodeId || focusedNodeIndex >= 0) return;
    cancelPendingFocus();
    setFocusedNodeId(null);
    focusOverview(matchedNodeIds);
  }, [
    cancelPendingFocus,
    focusOverview,
    focusedNodeId,
    focusedNodeIndex,
    matchedNodeIds,
  ]);
  const presented = isPresented !== false;
  const wasPresentedRef = reactExports.useRef(presented);
  reactExports.useEffect(() => {
    if (wasPresentedRef.current === presented) return;
    wasPresentedRef.current = presented;
    cancelPendingFocus();
    if (!presented || !activeTagId) return;
    if (focusedNodeId && focusedNodeIndex >= 0) focusNode(focusedNodeId);
    else focusOverview(matchedNodeIds);
  }, [
    activeTagId,
    cancelPendingFocus,
    focusNode,
    focusOverview,
    focusedNodeId,
    focusedNodeIndex,
    matchedNodeIds,
    presented,
  ]);
  const previousWorkspaceIdRef = reactExports.useRef(workspaceId);
  reactExports.useEffect(() => {
    if (previousWorkspaceIdRef.current === workspaceId) return;
    previousWorkspaceIdRef.current = workspaceId;
    cancelPendingFocus();
  }, [cancelPendingFocus, workspaceId]);
  reactExports.useEffect(() => cancelPendingFocus, [cancelPendingFocus]);
  const returnToOverview = reactExports.useCallback(() => {
    cancelPendingFocus();
    setFocusedNodeId(null);
    focusOverview(matchedNodeIds);
  }, [cancelPendingFocus, focusOverview, matchedNodeIds]);
  const handleKeyboardShortcut = reactExports.useCallback(
    (event) => {
      if (
        !activeTagId ||
        !presented ||
        event.defaultPrevented ||
        event.isComposing ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        isEditableTarget(event.target) ||
        hasForegroundKeyboardSurface(event.target)
      ) {
        return false;
      }
      if (event.key === "ArrowLeft" && matchedNodeIds.length > 1)
        focusPrevious();
      else if (event.key === "ArrowRight" && matchedNodeIds.length > 1)
        focusNext();
      else if (event.key === "Escape") {
        if (!focusedNodeId) {
          clearFilter();
          releaseTagFilterToolbarFocus();
        } else returnToOverview();
      } else return false;
      return true;
    },
    [
      activeTagId,
      clearFilter,
      focusNext,
      focusPrevious,
      focusedNodeId,
      matchedNodeIds.length,
      presented,
      returnToOverview,
    ],
  );
  reactExports.useEffect(() => {
    if (!activeTagId || !presented) return;
    const handleActiveFilterKeyDown = (event) => {
      if (!handleKeyboardShortcut(event)) return;
      event.preventDefault();
      event.stopPropagation();
    };
    window.addEventListener("keydown", handleActiveFilterKeyDown, true);
    return () =>
      window.removeEventListener("keydown", handleActiveFilterKeyDown, true);
  }, [activeTagId, handleKeyboardShortcut, presented]);
  return {
    activeTagId,
    clearFilter,
    focusNext,
    focusPrevious,
    focusedNodeIndex: focusedNodeIndex < 0 ? null : focusedNodeIndex,
    handleKeyboardShortcut,
    locateNode,
    matchedNodeIds,
    setActiveTagId,
    tagFilterActive: activeTagId !== void 0,
  };
}
function resolveAssetSourcePath(workspaceRoot, filePath) {
  return isAbsoluteLocalFilePath(filePath)
    ? filePath
    : joinFilePath(workspaceRoot, filePath);
}
function buildSingleTagDownloadPlan(options, tagId) {
  const assets = selectDownloadableCanvasAssets(
    options.assets,
    options.canvasAssetIds,
  ).filter((asset) => asset.tagIds?.includes(tagId));
  return {
    assetCount: assets.length,
    files: assets.map((asset) => ({
      filePath: resolveAssetSourcePath(options.workspaceRoot, asset.path),
      fileName: getFileName(asset.path),
    })),
  };
}
function buildAllTaggedDownloadPlan(options) {
  const assets = selectDownloadableCanvasAssets(
    options.assets,
    options.canvasAssetIds,
  );
  const assetsByTag = new Map();
  for (const asset of assets) {
    for (const tagId of asset.tagIds ?? []) {
      const taggedAssets = assetsByTag.get(tagId);
      if (taggedAssets) taggedAssets.push(asset);
      else assetsByTag.set(tagId, [asset]);
    }
  }
  const files = [];
  for (const tag of options.tags) {
    const folderName = options.resolveTagName(tag);
    for (const asset of assetsByTag.get(tag.id) ?? []) {
      files.push({
        filePath: resolveAssetSourcePath(options.workspaceRoot, asset.path),
        fileName: getFileName(asset.path),
        folderName,
      });
    }
  }
  const includedAssetIds = new Set(
    options.tags.flatMap((tag) =>
      (assetsByTag.get(tag.id) ?? []).map((asset) => asset.id),
    ),
  );
  return {
    assetCount: includedAssetIds.size,
    files,
  };
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
async function postActivity(gatewayFetch, path, body, options = {}) {
  return gatewayFetch(path, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
    timeoutMs: ACTIVITY_REQUEST_TIMEOUT_MS,
    ...options,
  });
}
function mapHeartbeatResponse(responseBody) {
  if (!responseBody || typeof responseBody !== "object") {
    throw new Error(
      "Workspace export activity heartbeat returned a malformed response",
    );
  }
  const renewed = Reflect.get(responseBody, "renewed");
  if (typeof renewed !== "boolean") {
    throw new Error(
      "Workspace export activity heartbeat response is missing renewed",
    );
  }
  return {
    renewed,
  };
}
async function renewActivity(gatewayFetch, beginRequest, leaseRequest) {
  const response = await postActivity(
    gatewayFetch,
    API_PATHS.projectArchiveActivityHeartbeat,
    leaseRequest,
  );
  const responseBody = await response.json();
  const heartbeat = mapHeartbeatResponse(responseBody);
  if (heartbeat.renewed) return;
  await postActivity(
    gatewayFetch,
    API_PATHS.projectArchiveActivityBegin,
    beginRequest,
  );
}
function logActivityWarning(phase, error) {
  window.hilo?.logger?.warn(
    `[canvas-tag-download] activity ${phase} failed: ${error instanceof Error ? error.message : String(error)}`,
    "canvas-tag-download",
  );
}
function scheduleReleaseRecovery(gatewayFetch, leaseRequest, attempt = 0) {
  const delayMs = Math.min(
    RELEASE_RECOVERY_BASE_MS * 2 ** attempt,
    RELEASE_RECOVERY_MAX_MS,
  );
  setTimeout(() => {
    void postActivity(
      gatewayFetch,
      API_PATHS.projectArchiveActivityEnd,
      leaseRequest,
    ).catch((error) => {
      logActivityWarning("release recovery", error);
      scheduleReleaseRecovery(gatewayFetch, leaseRequest, attempt + 1);
    });
  }, delayMs);
}
async function withCanvasTagDownloadActivity({
  gatewayFetch,
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
    void postActivity(
      gatewayFetch,
      API_PATHS.projectArchiveActivityEnd,
      leaseRequest,
      {
        keepalive: true,
      },
    ).catch(() => void 0);
  };
  try {
    try {
      await postActivity(
        gatewayFetch,
        API_PATHS.projectArchiveActivityBegin,
        beginRequest,
      );
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
      heartbeatInFlight = renewActivity(
        gatewayFetch,
        beginRequest,
        leaseRequest,
      )
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
      await postActivity(
        gatewayFetch,
        API_PATHS.projectArchiveActivityEnd,
        leaseRequest,
      );
    } catch (error) {
      logActivityWarning("release", error);
      scheduleReleaseRecovery(gatewayFetch, leaseRequest);
    }
  }
}
function useCanvasTagDownload({
  workspaceAssets,
  workspaceId,
  workspaceRoot,
}) {
  const { t } = useTranslation();
  const registry = useTagRegistry();
  const resolveTagName = useCanvasTagName();
  const canvasNodeIdsByAsset = useCanvasAssetNodeIds(workspaceId);
  const gatewayFetch = useGatewayFetch();
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
    workspaceId,
    workspaceRoot,
  });
  workspaceIdentityRef.current = {
    workspaceId,
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
            tags: registry.tags,
            workspaceRoot,
            resolveTagName,
          }
        : void 0,
    [
      canvasAssetIds,
      registry.tags,
      resolveTagName,
      workspaceAssets,
      workspaceRoot,
    ],
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
      const sourceWorkspaceId = workspaceId;
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
          gatewayFetch,
          ownerPid: rendererPid,
          workspaceDir: workspaceRoot,
          task: () =>
            saveManyAs(files, {
              rootFolderName,
              dialogTitle: t("canvasTags.selectDownloadFolder"),
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
                if (
                  mountedRef.current &&
                  activeDownloadControllerRef.current === controller
                ) {
                  setDownloadProgress(progress);
                }
              },
            }),
        });
      } catch (error) {
        dedupedToast.error(
          t(
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
    [gatewayFetch, rendererPid, saveManyAs, t, workspaceId, workspaceRoot],
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
      rootFolderName: t("canvasTags.downloadAllFolderName"),
    });
  }, [planOptions, runDownload, t]);
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
const TAG_TRIGGER_SELECTOR =
  '[data-action-ui-id="canvas.node-tag-switch"], [data-action-ui-id="canvas.node-tag-trigger"]';
export function useCanvasQuickTags({
  canvasViewRef,
  closeNodeContextMenu,
  isActive,
  isPresented,
  toolbarPlacement,
  workspaceAssets,
  workspaceId,
  workspaceRoot,
}) {
  const { t } = useTranslation();
  const assetMetadataStore = useAssetMetadataApi();
  const { registry: tagRegistry, toggleTagForAssets } = useCanvasTags();
  const [picker, setPicker] = reactExports.useState(null);
  const tagRenameEditingRef = reactExports.useRef(false);
  const preservePickerAfterRenameBlurRef = reactExports.useRef(false);
  const tagTriggerPointerDownRef = reactExports.useRef(false);
  const tagFilter = useCanvasTagFilter({
    canvasViewRef,
    isPresented: isPresented ?? isActive,
    workspaceAssets,
    workspaceId,
  });
  const tagDownload = useCanvasTagDownload({
    workspaceAssets,
    workspaceId,
    workspaceRoot,
  });
  const { activeTagId, setActiveTagId } = tagFilter;
  const resolveTagColors = reactExports.useCallback(
    (tagIds) =>
      resolveTagIds(tagIds, tagRegistry)
        .filter(isCanvasColorTag)
        .slice(0, MAX_VISIBLE_CANVAS_TAG_COLORS)
        .map((tag) => ({
          id: tag.id,
          color: tag.color,
          name:
            tag.name ||
            t(tag.legacyNameKey ?? PRESET_COLOR_NAME_KEYS[tag.id] ?? "") ||
            tag.id,
          active: tag.id === activeTagId,
        })),
    [activeTagId, tagRegistry, t],
  );
  const handleNodeTagRequest = reactExports.useCallback(
    (nodeId, anchor) => {
      const assetPath = getAssetMetaByNodeIdFromStore(
        assetMetadataStore,
        nodeId,
      )?.path;
      if (
        !assetPath ||
        !workspaceAssets.some((asset) => asset.path === assetPath)
      )
        return;
      closeNodeContextMenu();
      const stableAnchor = anchor.closest(".react-flow__node") ?? anchor;
      tagRenameEditingRef.current = false;
      preservePickerAfterRenameBlurRef.current = false;
      setPicker((current) => {
        if (current?.nodeId !== nodeId) {
          return {
            nodeId,
            assetPath,
            anchor: stableAnchor,
            trigger: anchor,
            open: true,
          };
        }
        return {
          ...current,
          trigger: anchor,
          open: !current.open,
        };
      });
    },
    [assetMetadataStore, closeNodeContextMenu, workspaceAssets],
  );
  const handleNodeTagRemoveRequest = reactExports.useCallback(
    async (nodeId, tagId) => {
      const assetMeta = getAssetMetaByNodeIdFromStore(
        assetMetadataStore,
        nodeId,
      );
      const asset = assetMeta?.path
        ? workspaceAssets.find(
            (workspaceAsset) => workspaceAsset.path === assetMeta.path,
          )
        : void 0;
      const currentTagIds = assetMeta?.tagIds ?? asset?.tagIds ?? [];
      if (!asset || !currentTagIds.includes(tagId)) return;
      setPicker((current) =>
        current?.nodeId === nodeId
          ? {
              ...current,
              open: false,
            }
          : current,
      );
      try {
        await toggleTagForAssets(tagId, [
          {
            ...asset,
            tagIds: currentTagIds,
          },
        ]);
      } catch {
        dedupedToast.error(t("canvasTags.saveFailed"));
      }
    },
    [assetMetadataStore, t, toggleTagForAssets, workspaceAssets],
  );
  const handleQuickTagSelectionChange = reactExports.useCallback((nodeIds) => {
    if (tagRenameEditingRef.current || preservePickerAfterRenameBlurRef.current)
      return;
    setPicker((current) =>
      current && !nodeIds.includes(current.nodeId)
        ? {
            ...current,
            open: false,
          }
        : current,
    );
  }, []);
  const handleTagRenameEditingChange = reactExports.useCallback((editing) => {
    tagRenameEditingRef.current = editing;
  }, []);
  const preservePickerAfterRenameBlur = reactExports.useCallback(() => {
    preservePickerAfterRenameBlurRef.current = true;
  }, []);
  reactExports.useEffect(() => {
    if (isActive === false) setPicker(null);
  }, [isActive]);
  reactExports.useEffect(() => {
    if (!picker) {
      tagRenameEditingRef.current = false;
      preservePickerAfterRenameBlurRef.current = false;
    }
  }, [picker]);
  reactExports.useEffect(() => {
    const handlePointerDown = (event) => {
      preservePickerAfterRenameBlurRef.current = false;
      tagTriggerPointerDownRef.current =
        event.target instanceof Element &&
        !!event.target.closest(TAG_TRIGGER_SELECTOR);
    };
    const handlePointerEnd = () => {
      tagTriggerPointerDownRef.current = false;
    };
    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("pointerup", handlePointerEnd, true);
    document.addEventListener("pointercancel", handlePointerEnd, true);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("pointerup", handlePointerEnd, true);
      document.removeEventListener("pointercancel", handlePointerEnd, true);
    };
  }, []);
  reactExports.useEffect(() => {
    if (
      activeTagId &&
      !tagRegistry.tags.some((tag) => tag.id === activeTagId)
    ) {
      setActiveTagId(void 0);
    }
  }, [activeTagId, setActiveTagId, tagRegistry.tags]);
  const asset = picker
    ? workspaceAssets.find(
        (workspaceAsset) => workspaceAsset.path === picker.assetPath,
      )
    : void 0;
  const quickTagPopover = (
    <Popover
      open={!!picker?.open && !!asset}
      onOpenChange={(open, eventDetails) => {
        if (open) return;
        const target = eventDetails.event.target;
        const focusTarget =
          eventDetails.event instanceof FocusEvent
            ? eventDetails.event.relatedTarget
            : null;
        if (
          (eventDetails.reason === "outside-press" &&
            target instanceof Element &&
            target.closest(TAG_TRIGGER_SELECTOR)) ||
          (eventDetails.reason === "focus-out" &&
            (tagTriggerPointerDownRef.current ||
              (focusTarget instanceof Element &&
                focusTarget.closest(TAG_TRIGGER_SELECTOR))))
        ) {
          eventDetails.cancel();
          return;
        }
        const wasEditing = tagRenameEditingRef.current;
        if (
          !wasEditing &&
          preservePickerAfterRenameBlurRef.current &&
          eventDetails.reason === "escape-key"
        ) {
          preservePickerAfterRenameBlurRef.current = false;
          setPicker((current) =>
            current
              ? {
                  ...current,
                  open: false,
                }
              : current,
          );
          return;
        }
        if (wasEditing || preservePickerAfterRenameBlurRef.current) {
          eventDetails.cancel();
          if (wasEditing && eventDetails.reason === "outside-press") {
            preservePickerAfterRenameBlurRef.current = true;
          }
          return;
        }
        setPicker((current) =>
          current
            ? {
                ...current,
                open: false,
              }
            : current,
        );
      }}
      onOpenChangeComplete={(open) => {
        if (open) return;
        setPicker((current) =>
          current?.nodeId === picker?.nodeId && !current?.open
            ? null
            : current,
        );
      }}
    >
      {picker && asset && (
        <PopoverContent
          anchor={picker.anchor}
          side="right"
          align="start"
          sideOffset={8}
          finalFocus={() =>
            picker.trigger.isConnected ? picker.trigger : false
          }
          className="w-auto gap-0 p-1.5"
          data-action-ui-id="canvas.node-tag-popover"
        >
          <CanvasTagPickerPanel
            assets={[asset]}
            allowRename={true}
            embedded={true}
            selectionMode="single"
            onRenameEditingChange={handleTagRenameEditingChange}
            onRenameBlurSave={preservePickerAfterRenameBlur}
          />
        </PopoverContent>
      )}
    </Popover>
  );
  const toolDockLabelControl = (
    <CanvasGlobalTagManager
      placement={toolbarPlacement}
      workspaceId={workspaceId}
      workspaceAssets={workspaceAssets}
      activeTagId={activeTagId}
      onActiveTagChange={setActiveTagId}
      focusedNodeIndex={tagFilter.focusedNodeIndex}
      matchedNodeCount={tagFilter.matchedNodeIds.length}
      onFocusPrevious={tagFilter.focusPrevious}
      onFocusNext={tagFilter.focusNext}
      onLocateNode={tagFilter.locateNode}
      onClearFilter={tagFilter.clearFilter}
      downloadEnabled={tagDownload.downloadEnabled}
      downloadingAll={tagDownload.downloadingAll}
      downloadingTagId={tagDownload.downloadingTagId}
      onDownloadAllTagged={tagDownload.downloadAllTagged}
      onDownloadTag={tagDownload.downloadTag}
    />
  );
  return {
    handleNodeTagRequest,
    handleNodeTagRemoveRequest,
    handleTagFilterKeyboardShortcut: tagFilter.handleKeyboardShortcut,
    handleQuickTagSelectionChange,
    quickTagPopover,
    resolveTagColors,
    tagRegistry,
    tagFilterActive: tagFilter.tagFilterActive,
    toolDockLabelControl,
  };
}
