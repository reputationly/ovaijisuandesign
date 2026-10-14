// tool-label-definitions.js
import { API_PATHS } from "../infra/workspace-gateway.js";
import { usePlatform } from "../infra/platform-context.js";
import reactExports from "react";
import { useStorage } from "../infra/use-storage.js";
import { workspaceLog } from "../infra/logger.js";
import { useGatewayUrl } from "../generation/use-model-catalog-scope-key.js";
import { applyWorkspaceDisplayNameRename } from "./record-recent-workspace-opened.js";
import { gatewayFetch } from "../infra/gateway-fetch.js";
import { gatewayUrl } from "../infra/gateway-http-error.jsx";
import { detectFileType } from "../canvas/diagnostic-history-tools.js";
import {
  buildWorkspaceProjectIndex,
  normalizeProjectEntries,
  projectWorkspaceKey,
} from "./normalize-project-entries.js";
function withUrlSearchParams(url, params) {
  const hashIndex = url.indexOf("#");
  const hash = hashIndex >= 0 ? url.slice(hashIndex) : "";
  const urlWithoutHash = hashIndex >= 0 ? url.slice(0, hashIndex) : url;
  const queryIndex = urlWithoutHash.indexOf("?");
  const path =
    queryIndex >= 0 ? urlWithoutHash.slice(0, queryIndex) : urlWithoutHash;
  const searchParams = new URLSearchParams(
    queryIndex >= 0 ? urlWithoutHash.slice(queryIndex + 1) : "",
  );
  for (const [key, value] of Object.entries(params)) {
    if (value !== void 0) {
      searchParams.set(key, String(value));
    }
  }
  const query = searchParams.toString();
  return `${path}${query ? `?${query}` : ""}${hash}`;
}
const THUMBNAIL_WIDTH_BUCKETS = [64, 128, 256, 512, 1024, 2048];
const MAX_THUMBNAIL_DPR = 2;
const MAX_THUMBNAIL_WIDTH = 2048;
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
    typeof deviceDpr === "number" && Number.isFinite(deviceDpr) && deviceDpr > 0
      ? deviceDpr
      : 1,
    MAX_THUMBNAIL_DPR,
  );
  const physicalWidth = Math.max(1, Math.ceil(displayWidth * dpr));
  return (
    THUMBNAIL_WIDTH_BUCKETS.find((bucket) => physicalWidth <= bucket) ??
    MAX_THUMBNAIL_WIDTH
  );
}
export function withThumbnailWidth(url, pixelWidth, options) {
  if (!url) return url;
  return withUrlSearchParams(url, {
    w: pixelWidth,
    thumbnail_format: options?.format,
    thumbnail_fallback: options?.fallback,
  });
}
export function withThumbnail(url, displayWidth, options) {
  return withThumbnailWidth(url, thumbnailWidth(displayWidth), options);
}
function isThumbnailMediaType(type) {
  return type === "image" || type === "video" || type === "audio";
}
export async function fetchWorkspaceThumbnails(workspacePath) {
  let data;
  try {
    const response = await gatewayFetch(API_PATHS.scanMedia(workspacePath));
    if (!response.ok) return [];
    data = await response.json();
  } catch {
    return [];
  }
  return data.files
    .map((file) => {
      const mediaType = detectFileType(file.name);
      if (!isThumbnailMediaType(mediaType)) return null;
      const src = withThumbnailWidth(
        gatewayUrl(API_PATHS.serveLocal(file.absolutePath)),
        480,
      );
      return src
        ? {
            src,
            name: file.name,
            mediaType,
          }
        : null;
    })
    .filter((thumbnail) => thumbnail !== null);
}
export const WORKSPACE_THUMBNAILS_QUERY_ROOT = ["workspace-thumbnails"];
export function workspaceThumbnailsQueryKey(workspacePath) {
  return [...WORKSPACE_THUMBNAILS_QUERY_ROOT, workspacePath];
}
export const WORKSPACE_THUMBNAILS_STALE_TIME = 5 * 60 * 1e3;
export const UNGROUPED_RECENT_GROUP_KEY = "__ungrouped__";
export function groupRecentWorkspacesByProject(
  inventory,
  projects,
  caseInsensitive,
) {
  const safeProjects = normalizeProjectEntries(projects);
  const index = buildWorkspaceProjectIndex(safeProjects, caseInsensitive);
  const byProjectId = new Map();
  const ungrouped = [];
  for (const item of inventory) {
    const key = projectWorkspaceKey(item.workspace.path, caseInsensitive);
    const recentKey = item.recentPath
      ? projectWorkspaceKey(item.recentPath, caseInsensitive)
      : void 0;
    const project =
      index.get(key) ?? (recentKey ? index.get(recentKey) : void 0);
    if (!project) {
      ungrouped.push(item);
      continue;
    }
    const bucket = byProjectId.get(project.id);
    if (bucket) bucket.push(item);
    else byProjectId.set(project.id, [item]);
  }
  const groups = safeProjects.map((project) => ({
    key: project.id,
    project,
    items: byProjectId.get(project.id) ?? [],
  }));
  if (ungrouped.length > 0) {
    groups.push({
      key: UNGROUPED_RECENT_GROUP_KEY,
      items: ungrouped,
    });
  }
  return groups;
}
export function selectProjectWorkspaces(inventory, project, caseInsensitive) {
  const safeProject = normalizeProjectEntries(project ? [project] : [])[0];
  if (!safeProject) return [];
  const ownedPathByKey = new Map(
    safeProject.workspacePaths.map((path) => [
      projectWorkspaceKey(path, caseInsensitive),
      path,
    ]),
  );
  if (ownedPathByKey.size === 0) return [];
  const coveredKeys = new Set();
  const matched = inventory.filter((item) => {
    const keys = [projectWorkspaceKey(item.workspace.path, caseInsensitive)];
    if (item.recentPath)
      keys.push(projectWorkspaceKey(item.recentPath, caseInsensitive));
    const hits = keys.filter((key) => ownedPathByKey.has(key));
    if (hits.length === 0) return false;
    for (const key of hits) coveredKeys.add(key);
    return true;
  });
  const synthesized = [];
  for (const [key, path] of ownedPathByKey) {
    if (coveredKeys.has(key)) continue;
    synthesized.push({
      workspace: {
        path,
        openedAt: 0,
      },
    });
  }
  return [...matched, ...synthesized];
}
export const OPEN_NEW_WORKSPACE_DIALOG_EVENT = "hilo:open-new-workspace-dialog";
export const NewWorkspaceDialogContext = reactExports.createContext(null);
export function useIsKnownWorkspacePath() {
  const platform = usePlatform();
  return reactExports.useCallback(
    async (folderPath) => {
      try {
        const persisted = await platform.storage
          ?.globalGet("recentWorkspaces")
          .catch(() => void 0);
        if (!Array.isArray(persisted)) return false;
        return persisted.some((workspace) => workspace?.path === folderPath);
      } catch {
        return false;
      }
    },
    [platform.storage],
  );
}
function hasCustomDisplayName(workspaces, folderPath) {
  const entry = workspaces.find((workspace) => workspace.path === folderPath);
  return Boolean(entry?.displayName?.trim());
}
export function usePersistPickedWorkspaceName() {
  const [, , setRecentWorkspacesAsync] = useStorage("global.recentWorkspaces");
  const platform = usePlatform();
  return reactExports.useCallback(
    async (folderPath, workspaceName) => {
      try {
        const persisted = await platform.storage
          ?.globalGet("recentWorkspaces")
          .catch(() => void 0);
        if (
          Array.isArray(persisted) &&
          hasCustomDisplayName(persisted, folderPath)
        ) {
          workspaceLog.info("new-project: skip-display-name-known-workspace");
          return;
        }
        if (Array.isArray(persisted)) {
          await setRecentWorkspacesAsync(
            applyWorkspaceDisplayNameRename(persisted, folderPath, workspaceName),
          );
        } else {
          await setRecentWorkspacesAsync((prev) =>
            applyWorkspaceDisplayNameRename(prev, folderPath, workspaceName),
          );
        }
      } catch (error) {
        workspaceLog.warn("new-project: persist-display-name-failed", {
          error,
        });
      }
    },
    [platform.storage, setRecentWorkspacesAsync],
  );
}
export function mapSkillSource(raw) {
  return raw === "user" ? "local" : "market";
}
export function classifySkillError(err) {
  let type = "unknown";
  let message = "unknown error";
  if (err instanceof Error) {
    message = err.message || err.name;
    const messageText = message.toLowerCase();
    if (messageText.includes("http")) type = "network";
    else if (messageText.includes("timeout")) type = "timeout";
    else if (messageText.includes("auth") || messageText.includes("401") || messageText.includes("403"))
      type = "auth";
    else if (messageText.includes("permission")) type = "permission";
    else type = "business";
  } else if (typeof err === "string") {
    message = err;
    type = "business";
  }
  return {
    error_type: type,
    error_message: message,
  };
}
export function detectSkillImportFileExt(filename) {
  const dot = filename.lastIndexOf(".");
  if (dot < 0) return "other";
  const ext = filename.slice(dot + 1).toLowerCase();
  if (ext === "zip") return "zip";
  if (ext === "md") return "md";
  return "other";
}
export const DEFAULT_HOME_WIDGET_CONFIG = {
  enabled: true,
  survey: null,
};
export const TOOL_LABEL_DEFINITIONS = {
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
