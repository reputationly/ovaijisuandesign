// tool-label-definitions.js
import {
  API_PATHS,
  reactExports,
  usePlatform,
  useStorage,
  workspaceLog,
} from "../vendor.js";
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
function withUrlSearchParams(url2, params) {
  const hashIndex = url2.indexOf("#");
  const hash2 = hashIndex >= 0 ? url2.slice(hashIndex) : "";
  const urlWithoutHash = hashIndex >= 0 ? url2.slice(0, hashIndex) : url2;
  const queryIndex = urlWithoutHash.indexOf("?");
  const path2 =
    queryIndex >= 0 ? urlWithoutHash.slice(0, queryIndex) : urlWithoutHash;
  const searchParams = new URLSearchParams(
    queryIndex >= 0 ? urlWithoutHash.slice(queryIndex + 1) : "",
  );
  for (const [key2, value] of Object.entries(params)) {
    if (value !== void 0) {
      searchParams.set(key2, String(value));
    }
  }
  const query = searchParams.toString();
  return `${path2}${query ? `?${query}` : ""}${hash2}`;
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
  const physicalWidth2 = Math.max(1, Math.ceil(displayWidth * dpr));
  return (
    THUMBNAIL_WIDTH_BUCKETS.find((bucket) => physicalWidth2 <= bucket) ??
    MAX_THUMBNAIL_WIDTH
  );
}
export function withThumbnailWidth(url2, pixelWidth, options) {
  if (!url2) return url2;
  return withUrlSearchParams(url2, {
    w: pixelWidth,
    thumbnail_format: options?.format,
    thumbnail_fallback: options?.fallback,
  });
}
export function withThumbnail(url2, displayWidth, options) {
  return withThumbnailWidth(url2, thumbnailWidth(displayWidth), options);
}
function isThumbnailMediaType(type2) {
  return type2 === "image" || type2 === "video" || type2 === "audio";
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
      const src = withThumbnailWidth(
        gatewayUrl(API_PATHS.serveLocal(f2.absolutePath)),
        480,
      );
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
  const index2 = buildWorkspaceProjectIndex(safeProjects, caseInsensitive);
  const byProjectId = new Map();
  const ungrouped = [];
  for (const item of inventory) {
    const key2 = projectWorkspaceKey(item.workspace.path, caseInsensitive);
    const recentKey = item.recentPath
      ? projectWorkspaceKey(item.recentPath, caseInsensitive)
      : void 0;
    const project2 =
      index2.get(key2) ?? (recentKey ? index2.get(recentKey) : void 0);
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
    safeProject.workspacePaths.map((path2) => [
      projectWorkspaceKey(path2, caseInsensitive),
      path2,
    ]),
  );
  if (ownedPathByKey.size === 0) return [];
  const coveredKeys = new Set();
  const matched = inventory.filter((item) => {
    const keys2 = [projectWorkspaceKey(item.workspace.path, caseInsensitive)];
    if (item.recentPath)
      keys2.push(projectWorkspaceKey(item.recentPath, caseInsensitive));
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
function hasCustomDisplayName(workspaces, folderPath) {
  const entry = workspaces.find((w3) => w3.path === folderPath);
  return Boolean(entry?.displayName?.trim());
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
        if (
          Array.isArray(persisted) &&
          hasCustomDisplayName(persisted, folderPath)
        ) {
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
    else if (m3.includes("auth") || m3.includes("401") || m3.includes("403"))
      type2 = "auth";
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
