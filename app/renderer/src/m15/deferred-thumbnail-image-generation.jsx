// deferred-thumbnail-image-generation.jsx
import { reactExports, API_PATHS, workspaceLog, usePlatform, useStorage } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { gatewayFetch, gatewayUrl, withUrlSearchParams } from "./agent-ws-client.jsx";
import { getNextPreviewTabIdAfterHide } from "./create-visible-preview-tabs-store.js";
import { truncateProjectName } from "./push-inline.js";
import {
  recordRecentWorkspaceOpened,
  retainCompleteWorkspaceCatalog,
} from "./record-recent-workspace-opened.jsx";
import { detectFileType } from "./relayout-group-children.js";
import { THUMBNAIL_LOAD_TIMEOUT_MS, ThumbnailLoadScheduler } from "./thumbnail-load-scheduler.jsx";
import { folderNameFromPath, useGatewayUrl } from "./use-resizable-width.js";
import {
  buildWorkspaceProjectIndex,
  normalizeProjectEntries,
  projectWorkspaceKey,
} from "./workspace-events.js";
const thumbnailLoadScheduler = new ThumbnailLoadScheduler(4);
const STABLE_INTERSECTION_DELAY_MS = 150;
const THUMBNAIL_ROOT_MARGIN = "200px 0px";
export function DeferredThumbnailImage(props) {
  return <DeferredThumbnailImageGeneration key={props.src ?? "empty"} {...props} />;
}
function DeferredThumbnailImageGeneration({
  src,
  alt,
  onLoad,
  onFailure,
  priority = "normal",
  maxRetries = 0,
  retryDelayMs = 2e3,
  ...props
}) {
  const imageRef = reactExports.useRef(null);
  const releaseRef = reactExports.useRef(null);
  const timeoutRef = reactExports.useRef(null);
  const retryTimerRef = reactExports.useRef(null);
  const onFailureRef = reactExports.useRef(onFailure);
  onFailureRef.current = onFailure;
  const [activeSrc, setActiveSrc] = reactExports.useState();
  const [loaded, setLoaded] = reactExports.useState(false);
  const [retryCount, setRetryCount] = reactExports.useState(0);
  const failOrRetry = reactExports.useCallback(() => {
    imageRef.current?.removeAttribute("src");
    setActiveSrc(void 0);
    if (retryCount < maxRetries) {
      if (retryTimerRef.current !== null) window.clearTimeout(retryTimerRef.current);
      retryTimerRef.current = window.setTimeout(() => {
        retryTimerRef.current = null;
        setRetryCount((count2) => count2 + 1);
      }, retryDelayMs);
      return;
    }
    onFailureRef.current?.();
  }, [maxRetries, retryCount, retryDelayMs]);
  const releaseSlot = reactExports.useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    releaseRef.current?.();
    releaseRef.current = null;
  }, []);
  reactExports.useEffect(() => {
    if (!src) return;
    let observer2 = null;
    let visibilityTimer = null;
    let cancelScheduled = null;
    let loadStarted = false;
    const clearPending = () => {
      if (visibilityTimer !== null) {
        window.clearTimeout(visibilityTimer);
        visibilityTimer = null;
      }
      if (!loadStarted) {
        cancelScheduled?.();
        cancelScheduled = null;
      }
    };
    const scheduleLoad = () => {
      if (loadStarted || cancelScheduled) return;
      cancelScheduled = thumbnailLoadScheduler.schedule((release) => {
        loadStarted = true;
        releaseRef.current = release;
        setActiveSrc(src);
        timeoutRef.current = window.setTimeout(() => {
          releaseSlot();
          failOrRetry();
        }, THUMBNAIL_LOAD_TIMEOUT_MS);
        observer2?.disconnect();
      }, priority);
    };
    const element2 = imageRef.current;
    if (element2 && typeof IntersectionObserver !== "undefined") {
      observer2 = new IntersectionObserver(
        (entries2) => {
          const isIntersecting = entries2.some((entry) => entry.isIntersecting);
          if (!isIntersecting) {
            clearPending();
            return;
          }
          if (visibilityTimer !== null || loadStarted || cancelScheduled) return;
          visibilityTimer = window.setTimeout(() => {
            visibilityTimer = null;
            scheduleLoad();
          }, STABLE_INTERSECTION_DELAY_MS);
        },
        {
          rootMargin: THUMBNAIL_ROOT_MARGIN,
        },
      );
      observer2.observe(element2);
    } else {
      scheduleLoad();
    }
    return () => {
      observer2?.disconnect();
      clearPending();
      cancelScheduled?.();
      releaseSlot();
    };
  }, [failOrRetry, priority, releaseSlot, src]);
  reactExports.useEffect(
    () => () => {
      if (retryTimerRef.current !== null) window.clearTimeout(retryTimerRef.current);
    },
    [],
  );
  const handleLoad = reactExports.useCallback(
    (event) => {
      setLoaded(true);
      releaseSlot();
      onLoad?.(event);
    },
    [onLoad, releaseSlot],
  );
  const handleError = reactExports.useCallback(() => {
    releaseSlot();
    failOrRetry();
  }, [failOrRetry, releaseSlot]);
  return (
    <img
      {...props}
      ref={imageRef}
      src={activeSrc}
      alt={alt}
      style={{
        ...props.style,
        opacity: loaded ? props.style?.opacity : 0,
      }}
      loading="lazy"
      decoding="async"
      fetchPriority="low"
      onLoad={handleLoad}
      onError={handleError}
    />
  );
}
export const GATEWAY_READINESS_FALLBACK_MS = 3e3;
const THUMBNAIL_WIDTH_BUCKETS = [64, 128, 256, 512, 1024, 2048];
const MAX_THUMBNAIL_DPR = 2;
const MAX_THUMBNAIL_WIDTH = 2048;
export function resolveMediaUrl(relativeUrl) {
  if (!relativeUrl) return void 0;
  if (/^https?:\/\//.test(relativeUrl)) return relativeUrl;
  return gatewayUrl(relativeUrl);
}
export function useResolveMediaUrl() {
  const scopedGatewayUrl = useGatewayUrl();
  return reactExports.useCallback(
    (relativeUrl) => {
      if (!relativeUrl) return void 0;
      if (/^https?:\/\//.test(relativeUrl)) return relativeUrl;
      return scopedGatewayUrl(relativeUrl);
    },
    [scopedGatewayUrl],
  );
}
function thumbnailWidth(displayWidth) {
  const deviceDpr = typeof window !== "undefined" ? window.devicePixelRatio : 1;
  const dpr = Math.min(
    typeof deviceDpr === "number" && Number.isFinite(deviceDpr) && deviceDpr > 0 ? deviceDpr : 1,
    MAX_THUMBNAIL_DPR,
  );
  const physicalWidth2 = Math.max(1, Math.ceil(displayWidth * dpr));
  return THUMBNAIL_WIDTH_BUCKETS.find((bucket) => physicalWidth2 <= bucket) ?? MAX_THUMBNAIL_WIDTH;
}
export function withThumbnail(url2, displayWidth, options) {
  return withThumbnailWidth(url2, thumbnailWidth(displayWidth), options);
}
export function withThumbnailWidth(url2, pixelWidth, options) {
  if (!url2) return url2;
  return withUrlSearchParams(url2, {
    w: pixelWidth,
    thumbnail_format: options?.format,
    thumbnail_fallback: options?.fallback,
  });
}
export async function fetchWorkspaceThumbnails(workspacePath) {
  let data2;
  try {
    const res = await gatewayFetch(API_PATHS.scanMedia(workspacePath));
    if (!res.ok) return [];
    data2 = await res.json();
  } catch {
    return [];
  }
  return data2.files
    .map((f2) => {
      const mediaType = detectFileType(f2.name);
      if (!isThumbnailMediaType(mediaType)) return null;
      const src = withThumbnailWidth(gatewayUrl(API_PATHS.serveLocal(f2.absolutePath)), 480);
      return src
        ? {
            src,
            name: f2.name,
            mediaType,
          }
        : null;
    })
    .filter((t2) => t2 !== null);
}
function isThumbnailMediaType(type2) {
  return type2 === "image" || type2 === "video" || type2 === "audio";
}
export const WORKSPACE_THUMBNAILS_QUERY_ROOT = ["workspace-thumbnails"];
export function workspaceThumbnailsQueryKey(workspacePath) {
  return [...WORKSPACE_THUMBNAILS_QUERY_ROOT, workspacePath];
}
export const WORKSPACE_THUMBNAILS_STALE_TIME = 5 * 60 * 1e3;
export const UNGROUPED_RECENT_GROUP_KEY = "__ungrouped__";
export function groupRecentWorkspacesByProject(inventory, projects, caseInsensitive) {
  const safeProjects = normalizeProjectEntries(projects);
  const index2 = buildWorkspaceProjectIndex(safeProjects, caseInsensitive);
  const byProjectId = new Map();
  const ungrouped = [];
  for (const item of inventory) {
    const key2 = projectWorkspaceKey(item.workspace.path, caseInsensitive);
    const recentKey = item.recentPath
      ? projectWorkspaceKey(item.recentPath, caseInsensitive)
      : void 0;
    const project2 = index2.get(key2) ?? (recentKey ? index2.get(recentKey) : void 0);
    if (!project2) {
      ungrouped.push(item);
      continue;
    }
    const bucket = byProjectId.get(project2.id);
    if (bucket) bucket.push(item);
    else byProjectId.set(project2.id, [item]);
  }
  const groups = safeProjects.map((project2) => ({
    key: project2.id,
    project: project2,
    items: byProjectId.get(project2.id) ?? [],
  }));
  if (ungrouped.length > 0) {
    groups.push({
      key: UNGROUPED_RECENT_GROUP_KEY,
      items: ungrouped,
    });
  }
  return groups;
}
export function selectProjectWorkspaces(inventory, project2, caseInsensitive) {
  const safeProject = normalizeProjectEntries(project2 ? [project2] : [])[0];
  if (!safeProject) return [];
  const ownedPathByKey = new Map(
    safeProject.workspacePaths.map((path2) => [projectWorkspaceKey(path2, caseInsensitive), path2]),
  );
  if (ownedPathByKey.size === 0) return [];
  const coveredKeys = new Set();
  const matched = inventory.filter((item) => {
    const keys2 = [projectWorkspaceKey(item.workspace.path, caseInsensitive)];
    if (item.recentPath) keys2.push(projectWorkspaceKey(item.recentPath, caseInsensitive));
    const hits = keys2.filter((key2) => ownedPathByKey.has(key2));
    if (hits.length === 0) return false;
    for (const key2 of hits) coveredKeys.add(key2);
    return true;
  });
  const synthesized = [];
  for (const [key2, path2] of ownedPathByKey) {
    if (coveredKeys.has(key2)) continue;
    synthesized.push({
      workspace: {
        path: path2,
        openedAt: 0,
      },
    });
  }
  return [...matched, ...synthesized];
}
function getNextWorkspaceIdAfterClose(entries2, closingWorkspaceId) {
  return getNextPreviewTabIdAfterHide(
    entries2.map((entry) => entry.workspaceId),
    closingWorkspaceId,
  );
}
export function performWorkspacePreviewHide(
  entries2,
  workspaceId2,
  currentWorkspaceId,
  activeTaskCount,
  source,
  effects,
) {
  const nextWorkspaceId = getNextWorkspaceIdAfterClose(entries2, workspaceId2);
  const wasActive = workspaceId2 === currentWorkspaceId;
  effects.record({
    workspaceId: workspaceId2,
    source,
    wasActive,
    activeTaskCount,
    ...(nextWorkspaceId
      ? {
          nextWorkspaceId,
        }
      : {}),
  });
  effects.hidePreview(workspaceId2);
  if (wasActive) {
    if (nextWorkspaceId) {
      effects.activateWorkspace(nextWorkspaceId);
    } else {
      effects.activateHome();
    }
  }
  effects.requestRuntimeClose(workspaceId2, source);
}
function performWorkspacePreviewsBatchHide(
  workspaceId2,
  currentWorkspaceId,
  hiddenWorkspaceIds,
  source,
  effects,
) {
  if (hiddenWorkspaceIds.length === 0) return;
  const currentWasHidden = Boolean(
    currentWorkspaceId && hiddenWorkspaceIds.includes(currentWorkspaceId),
  );
  effects.hidePreviews(hiddenWorkspaceIds);
  effects.record({
    source,
    keptWorkspaceId: workspaceId2,
    hiddenWorkspaceIds,
  });
  if (currentWasHidden) effects.activateWorkspace(workspaceId2);
  for (const hiddenWorkspaceId of hiddenWorkspaceIds) {
    effects.requestRuntimeClose(hiddenWorkspaceId, source);
  }
}
export function performOtherWorkspacePreviewsHide(
  entries2,
  workspaceId2,
  currentWorkspaceId,
  effects,
) {
  if (!entries2.some((entry) => entry.workspaceId === workspaceId2)) return;
  performWorkspacePreviewsBatchHide(
    workspaceId2,
    currentWorkspaceId,
    entries2
      .filter((entry) => entry.workspaceId !== workspaceId2)
      .map((entry) => entry.workspaceId),
    "topbar-context-close-others",
    effects,
  );
}
export function performWorkspacePreviewsToRightHide(
  entries2,
  workspaceId2,
  currentWorkspaceId,
  effects,
) {
  const index2 = entries2.findIndex((entry) => entry.workspaceId === workspaceId2);
  if (index2 === -1) return;
  performWorkspacePreviewsBatchHide(
    workspaceId2,
    currentWorkspaceId,
    entries2.slice(index2 + 1).map((entry) => entry.workspaceId),
    "topbar-context-close-right",
    effects,
  );
}
export async function activateWorkspaceIfAvailable(hiloApp2, workspaceId2, navigateToWorkspaceId) {
  const runtime = await hiloApp2.activateWorkspace(workspaceId2);
  if (!runtime) return;
  await navigateToWorkspaceId(runtime.workspaceId);
}
export function shouldActivateWorkspaceThroughRoute(entries2, workspaceId2) {
  const entry = entries2.find((candidate) => candidate.workspaceId === workspaceId2);
  return Boolean(entry && !entry.gatewayUrl);
}
export const OPEN_NEW_WORKSPACE_DIALOG_EVENT = "hilo:open-new-workspace-dialog";
export const NewWorkspaceDialogContext = reactExports.createContext(null);
export function useIsKnownWorkspacePath() {
  const platform2 = usePlatform();
  return reactExports.useCallback(
    async (folderPath) => {
      try {
        const persisted = await platform2.storage
          ?.globalGet("recentWorkspaces")
          .catch(() => void 0);
        if (!Array.isArray(persisted)) return false;
        return persisted.some((w3) => w3?.path === folderPath);
      } catch {
        return false;
      }
    },
    [platform2.storage],
  );
}
export function applyWorkspaceDisplayNameRename(
  workspaces,
  workspacePath,
  newName,
  openedAt = Date.now(),
) {
  const folderName = folderNameFromPath(workspacePath);
  const trimmed = truncateProjectName(newName);
  const displayName2 = !trimmed || trimmed === folderName ? void 0 : trimmed;
  let matched = false;
  const renamed = workspaces.map((workspace) => {
    if (workspace.path !== workspacePath) return workspace;
    matched = true;
    if (displayName2)
      return {
        ...workspace,
        displayName: displayName2,
      };
    const { displayName: _displayName, ...rest } = workspace;
    return rest;
  });
  if (matched) return renamed;
  const inserted = recordRecentWorkspaceOpened(workspaces, workspacePath, openedAt).map(
    (workspace) =>
      workspace.path === workspacePath && displayName2
        ? {
            ...workspace,
            displayName: displayName2,
          }
        : workspace,
  );
  return retainCompleteWorkspaceCatalog(inserted);
}
export function usePersistPickedWorkspaceName() {
  const [, , setRecentWorkspacesAsync] = useStorage("global.recentWorkspaces");
  const platform2 = usePlatform();
  return reactExports.useCallback(
    async (folderPath, name2) => {
      try {
        const persisted = await platform2.storage
          ?.globalGet("recentWorkspaces")
          .catch(() => void 0);
        if (Array.isArray(persisted) && hasCustomDisplayName(persisted, folderPath)) {
          workspaceLog.info("new-project: skip-display-name-known-workspace");
          return;
        }
        if (Array.isArray(persisted)) {
          await setRecentWorkspacesAsync(
            applyWorkspaceDisplayNameRename(persisted, folderPath, name2),
          );
        } else {
          await setRecentWorkspacesAsync((prev) =>
            applyWorkspaceDisplayNameRename(prev, folderPath, name2),
          );
        }
      } catch (error) {
        workspaceLog.warn("new-project: persist-display-name-failed", {
          error,
        });
      }
    },
    [platform2.storage, setRecentWorkspacesAsync],
  );
}
function hasCustomDisplayName(workspaces, folderPath) {
  const entry = workspaces.find((w3) => w3.path === folderPath);
  return Boolean(entry?.displayName?.trim());
}
export function mapSkillSource(raw2) {
  return raw2 === "user" ? "local" : "market";
}
export function classifySkillError(err) {
  let type2 = "unknown";
  let message2 = "unknown error";
  if (err instanceof Error) {
    message2 = err.message || err.name;
    const m3 = message2.toLowerCase();
    if (m3.includes("http")) type2 = "network";
    else if (m3.includes("timeout")) type2 = "timeout";
    else if (m3.includes("auth") || m3.includes("401") || m3.includes("403")) type2 = "auth";
    else if (m3.includes("permission")) type2 = "permission";
    else type2 = "business";
  } else if (typeof err === "string") {
    message2 = err;
    type2 = "business";
  }
  return {
    error_type: type2,
    error_message: message2,
  };
}
export function detectSkillImportFileExt(filename) {
  const dot2 = filename.lastIndexOf(".");
  if (dot2 < 0) return "other";
  const ext = filename.slice(dot2 + 1).toLowerCase();
  if (ext === "zip") return "zip";
  if (ext === "md") return "md";
  return "other";
}
export const TOAST_ID$1 = "low-memory-warning";
export const HOME_WIDGET_KINDS = ["update", "survey"];
export const DEFAULT_HOME_WIDGET_CONFIG = {
  enabled: true,
  survey: null,
};
export const DEFAULT_UPDATE_WIDGET_CONFIG = {
  imageUrl: null,
};
export const TOOL_LABEL_DEFINITIONS$1 = {
  mediaGen: {
    i18nKey: "chat.toolLabel.mediaGen",
  },
  askUser: {
    i18nKey: "chat.toolLabel.askUser",
  },
  canvasOp: {
    i18nKey: "chat.toolLabel.canvasOp",
  },
  planOp: {
    i18nKey: "chat.toolLabel.planOp",
  },
  spawnSubtask: {
    i18nKey: "chat.toolLabel.spawnSubtask",
  },
  skillOp: {
    i18nKey: "chat.toolLabel.skillOp",
  },
  searchInfo: {
    i18nKey: "chat.toolLabel.searchInfo",
  },
  fileOp: {
    i18nKey: "chat.toolLabel.fileOp",
  },
  contentProcess: {
    i18nKey: "chat.toolLabel.contentProcess",
  },
  connectorOp: {
    i18nKey: "chat.toolLabel.connectorOp",
  },
  transient: {
    i18nKey: "chat.toolLabel.transient",
  },
  silent: {
    i18nKey: "",
  },
};
