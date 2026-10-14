// use-file-explorer-canvas-integration.js
import {
  buildResourceDragItem,
  parseResourceDrag,
} from "../text-editor/build-asr-gateway-request.js";
import { useTranslation } from "react-i18next";
import { WORKSPACE_STORAGE_DEFAULTS } from "../infra/storage-cache.js";
import { dedupedToast } from "../infra/agent-http-client.js";
import { findEntryByPath } from "../workspace/set-home-widget-dev-preview-mode.js";
import { useStableCallback } from "./use-cloud-review-nodes.js";
import { workspaceEvents } from "../workspace/topbar-state-context.jsx";
import { getFileName } from "../canvas/uploading-assets.jsx";
export function compareByTimeOrName(timeA, timeB, keyA, keyB, sortOrder) {
  const normalizedTimeA = timeA ?? "";
  const normalizedTimeB = timeB ?? "";
  if (normalizedTimeA === "" && normalizedTimeB === "") return keyA.localeCompare(keyB);
  if (normalizedTimeA === "") return 1;
  if (normalizedTimeB === "") return -1;
  const cmp = normalizedTimeA < normalizedTimeB ? -1 : normalizedTimeA > normalizedTimeB ? 1 : 0;
  if (cmp !== 0) return sortOrder === "desc" ? -cmp : cmp;
  return keyA.localeCompare(keyB);
}
export function matchesTagFilter(tagIds, tagFilters) {
  if (!tagFilters || tagFilters.length === 0) return true;
  if (!tagIds || tagIds.length === 0) return false;
  return tagFilters.some((tagId) => tagIds.includes(tagId));
}
export const DEFAULTS = WORKSPACE_STORAGE_DEFAULTS.assetPanel;
const VALID_CATEGORIES = ["image", "video", "audio", "text", "other"];
const VALID_DATE_KINDS = ["all", "today", "last7days", "last30days", "custom"];
const VALID_SORT = ["desc", "asc"];
export function normalizeAssetPanelPreferences(raw) {
  if (!raw || typeof raw !== "object") return DEFAULTS;
  const rawPreferences = raw;
  let typeFilters = [...DEFAULTS.typeFilters];
  if (Array.isArray(rawPreferences.typeFilters)) {
    typeFilters = rawPreferences.typeFilters.filter(
      (category) => typeof category === "string" && VALID_CATEGORIES.includes(category),
    );
    if (typeFilters.length !== rawPreferences.typeFilters.length) {
      const dropped = rawPreferences.typeFilters.filter(
        (category) => !(typeof category === "string" && VALID_CATEGORIES.includes(category)),
      );
      console.warn(
        "[assetPanelPreferences] dropped invalid typeFilters entries:",
        {
          raw: rawPreferences.typeFilters,
          kept: typeFilters,
          dropped,
        },
      );
    }
  } else if (rawPreferences.typeFilters !== void 0) {
    console.warn(
      "[assetPanelPreferences] typeFilters is not an array, fallback to default:",
      rawPreferences.typeFilters,
    );
  }
  let dateFilter = DEFAULTS.dateFilter;
  if (rawPreferences.dateFilter && typeof rawPreferences.dateFilter === "object") {
    const rawDateFilter = rawPreferences.dateFilter;
    const kind = rawDateFilter.kind;
    if (typeof kind === "string" && VALID_DATE_KINDS.includes(kind)) {
      if (kind === "custom") {
        const from = typeof rawDateFilter.from === "string" ? rawDateFilter.from : "";
        const to = typeof rawDateFilter.to === "string" ? rawDateFilter.to : "";
        dateFilter = {
          kind: "custom",
          from,
          to,
        };
      } else {
        dateFilter = {
          kind,
        };
      }
    } else {
      console.warn(
        '[assetPanelPreferences] unknown dateFilter.kind, fallback to "all":',
        kind,
      );
    }
  }
  let sortOrder = DEFAULTS.sortOrder;
  if (typeof rawPreferences.sortOrder === "string" && VALID_SORT.includes(rawPreferences.sortOrder)) {
    sortOrder = rawPreferences.sortOrder;
  } else if (rawPreferences.sortOrder !== void 0) {
    console.warn(
      "[assetPanelPreferences] invalid sortOrder, fallback to default:",
      rawPreferences.sortOrder,
    );
  }
  return {
    typeFilters,
    dateFilter,
    sortOrder,
  };
}
function preferredSeparator(path) {
  return path.includes("\\") && !path.includes("/") ? "\\" : "/";
}
export function joinFilePath(parent, child) {
  if (!parent) return child;
  const sep = preferredSeparator(parent);
  const normalizedChild = sep === "\\" ? child.replace(/\//g, "\\") : child;
  if (parent.endsWith("/") || parent.endsWith("\\"))
    return `${parent}${normalizedChild}`;
  return `${parent}${sep}${normalizedChild}`;
}
export function getParentDir(path) {
  const slash = path.lastIndexOf("/");
  const backslash = path.lastIndexOf("\\");
  const idx = Math.max(slash, backslash);
  return idx >= 0 ? path.slice(0, idx) : "";
}
export function toRelativeFromRoot(rootPath, absPath) {
  if (!rootPath) return absPath;
  const sep = preferredSeparator(rootPath);
  const prefix =
    rootPath.endsWith("/") || rootPath.endsWith("\\")
      ? rootPath
      : `${rootPath}${sep}`;
  if (!absPath.startsWith(prefix)) return absPath;
  return absPath.slice(prefix.length).replace(/\\/g, "/");
}
export function generateCopyName(fileName, isDirectory) {
  if (isDirectory) {
    const match = fileName.match(/^(.+)\((\d+)\)$/);
    if (match) {
      const base = match[1];
      const num = Number(match[2]) + 1;
      return `${base}(${num})`;
    }
    return `${fileName}(1)`;
  }
  const dotIndex = fileName.lastIndexOf(".");
  const hasExt = dotIndex > 0;
  const baseName = hasExt ? fileName.slice(0, dotIndex) : fileName;
  const ext = hasExt ? fileName.slice(dotIndex) : "";
  const match = baseName.match(/^(.+)\((\d+)\)$/);
  if (match) {
    const base = match[1];
    const num = Number(match[2]) + 1;
    return `${base}(${num})${ext}`;
  }
  return `${baseName}(1)${ext}`;
}
const LEGACY_DRAG_MIME = "application/x-file-explorer-path";
export function extractDropSourcePaths(dataTransfer) {
  const parsed = parseResourceDrag({
    dataTransfer,
  });
  if (parsed && parsed.length > 0) {
    return parsed.map((item) => item.absolutePath).filter((absolutePath) => Boolean(absolutePath));
  }
  const legacySingle = dataTransfer.getData(LEGACY_DRAG_MIME);
  return legacySingle ? [legacySingle] : [];
}
export function isInvalidDropTarget(sourcePaths, targetPath) {
  for (const src of sourcePaths) {
    if (src === targetPath || targetPath.startsWith(`${src}/`)) return true;
  }
  return false;
}
export function useFileExplorerCanvasIntegration({
  selectedPaths,
  toRelativePath,
  filteredTree,
  assetMap,
  duplicate,
}) {
  const { t: translate } = useTranslation();
  const handleAddToCanvas = useStableCallback((target) => {
    const anchorAbsPath = target.path;
    const pathsToAdd = selectedPaths.has(anchorAbsPath)
      ? Array.from(selectedPaths)
      : [anchorAbsPath];
    const items = pathsToAdd.map((absPath) => {
      const relPath = toRelativePath(absPath);
      const fileName = getFileName(absPath);
      const treeEntry = findEntryByPath(filteredTree, absPath);
      const isDir = treeEntry?.isDirectory ?? false;
      const asset = assetMap.get(relPath);
      return buildResourceDragItem(absPath, relPath, fileName, isDir, asset?.id);
    });
    workspaceEvents.fireAddToCanvas(items);
  });
  const handleAddToChat = useStableCallback((target) => {
    const relativePath = toRelativePath(target.path);
    workspaceEvents.fireAddToChat(relativePath, target.name);
  });
  const handleDuplicateForGrid = useStableCallback(async (relativePath) => {
    try {
      await duplicate({
        paths: [relativePath],
      });
    } catch (err) {
      dedupedToast.error(
        translate("fileExplorer.duplicateFailed") +
          (err instanceof Error && err.message ? `: ${err.message}` : ""),
      );
    }
  });
  const handleDuplicateForTree = useStableCallback(async (entry) => {
    try {
      const relPath = toRelativePath(entry.path);
      await duplicate({
        paths: [relPath],
      });
    } catch (err) {
      dedupedToast.error(
        translate("fileExplorer.duplicateFailed") +
          (err instanceof Error && err.message ? `: ${err.message}` : ""),
      );
    }
  });
  return {
    handleAddToCanvas,
    handleAddToChat,
    handleDuplicateForGrid,
    handleDuplicateForTree,
  };
}
