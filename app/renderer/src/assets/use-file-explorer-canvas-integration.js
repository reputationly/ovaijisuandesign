// use-file-explorer-canvas-integration.js
import {
  buildResourceDragItem,
  parseResourceDrag,
} from "../text-editor/build-asr-gateway-request.js";
import { useTranslation, WORKSPACE_STORAGE_DEFAULTS } from "../vendor.js";
import { dedupedToast } from "../infra/agent-http-client.js";
import { findEntryByPath } from "../workspace/set-home-widget-dev-preview-mode.js";
import { useStableCallback } from "./use-cloud-review-nodes.js";
import { workspaceEvents } from "../workspace/topbar-state-context.jsx";
import { getFileName } from "../canvas/uploading-assets.jsx";
export function compareByTimeOrName(timeA, timeB, keyA, keyB, sortOrder) {
  const ta2 = timeA ?? "";
  const tb = timeB ?? "";
  if (ta2 === "" && tb === "") return keyA.localeCompare(keyB);
  if (ta2 === "") return 1;
  if (tb === "") return -1;
  const cmp2 = ta2 < tb ? -1 : ta2 > tb ? 1 : 0;
  if (cmp2 !== 0) return sortOrder === "desc" ? -cmp2 : cmp2;
  return keyA.localeCompare(keyB);
}
export function matchesTagFilter(tagIds, tagFilters) {
  if (!tagFilters || tagFilters.length === 0) return true;
  if (!tagIds || tagIds.length === 0) return false;
  return tagFilters.some((id2) => tagIds.includes(id2));
}
export const DEFAULTS = WORKSPACE_STORAGE_DEFAULTS.assetPanel;
const VALID_CATEGORIES = ["image", "video", "audio", "text", "other"];
const VALID_DATE_KINDS = ["all", "today", "last7days", "last30days", "custom"];
const VALID_SORT = ["desc", "asc"];
export function normalizeAssetPanelPreferences(raw2) {
  if (!raw2 || typeof raw2 !== "object") return DEFAULTS;
  const r2 = raw2;
  let typeFilters = [...DEFAULTS.typeFilters];
  if (Array.isArray(r2.typeFilters)) {
    typeFilters = r2.typeFilters.filter(
      (x2) => typeof x2 === "string" && VALID_CATEGORIES.includes(x2),
    );
    if (typeFilters.length !== r2.typeFilters.length) {
      const dropped = r2.typeFilters.filter(
        (x2) => !(typeof x2 === "string" && VALID_CATEGORIES.includes(x2)),
      );
      console.warn(
        "[assetPanelPreferences] dropped invalid typeFilters entries:",
        {
          raw: r2.typeFilters,
          kept: typeFilters,
          dropped,
        },
      );
    }
  } else if (r2.typeFilters !== void 0) {
    console.warn(
      "[assetPanelPreferences] typeFilters is not an array, fallback to default:",
      r2.typeFilters,
    );
  }
  let dateFilter = DEFAULTS.dateFilter;
  if (r2.dateFilter && typeof r2.dateFilter === "object") {
    const df = r2.dateFilter;
    const kind = df.kind;
    if (typeof kind === "string" && VALID_DATE_KINDS.includes(kind)) {
      if (kind === "custom") {
        const from2 = typeof df.from === "string" ? df.from : "";
        const to = typeof df.to === "string" ? df.to : "";
        dateFilter = {
          kind: "custom",
          from: from2,
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
  if (typeof r2.sortOrder === "string" && VALID_SORT.includes(r2.sortOrder)) {
    sortOrder = r2.sortOrder;
  } else if (r2.sortOrder !== void 0) {
    console.warn(
      "[assetPanelPreferences] invalid sortOrder, fallback to default:",
      r2.sortOrder,
    );
  }
  return {
    typeFilters,
    dateFilter,
    sortOrder,
  };
}
function preferredSeparator(path2) {
  return path2.includes("\\") && !path2.includes("/") ? "\\" : "/";
}
export function joinFilePath(parent, child) {
  if (!parent) return child;
  const sep = preferredSeparator(parent);
  const normalizedChild = sep === "\\" ? child.replace(/\//g, "\\") : child;
  if (parent.endsWith("/") || parent.endsWith("\\"))
    return `${parent}${normalizedChild}`;
  return `${parent}${sep}${normalizedChild}`;
}
export function getParentDir(path2) {
  const slash2 = path2.lastIndexOf("/");
  const backslash2 = path2.lastIndexOf("\\");
  const idx = Math.max(slash2, backslash2);
  return idx >= 0 ? path2.slice(0, idx) : "";
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
export function generateCopyName(name2, isDirectory) {
  if (isDirectory) {
    const match22 = name2.match(/^(.+)\((\d+)\)$/);
    if (match22) {
      const base2 = match22[1];
      const num = Number(match22[2]) + 1;
      return `${base2}(${num})`;
    }
    return `${name2}(1)`;
  }
  const dotIndex = name2.lastIndexOf(".");
  const hasExt = dotIndex > 0;
  const baseName = hasExt ? name2.slice(0, dotIndex) : name2;
  const ext = hasExt ? name2.slice(dotIndex) : "";
  const match2 = baseName.match(/^(.+)\((\d+)\)$/);
  if (match2) {
    const base2 = match2[1];
    const num = Number(match2[2]) + 1;
    return `${base2}(${num})${ext}`;
  }
  return `${baseName}(1)${ext}`;
}
const LEGACY_DRAG_MIME = "application/x-file-explorer-path";
export function extractDropSourcePaths(dataTransfer) {
  const parsed = parseResourceDrag({
    dataTransfer,
  });
  if (parsed && parsed.length > 0) {
    return parsed.map((item) => item.absolutePath).filter((p3) => Boolean(p3));
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
  const { t: t2 } = useTranslation();
  const handleAddToCanvas = useStableCallback((target) => {
    const anchorAbsPath = target.path;
    const pathsToAdd = selectedPaths.has(anchorAbsPath)
      ? Array.from(selectedPaths)
      : [anchorAbsPath];
    const items = pathsToAdd.map((absPath) => {
      const relPath = toRelativePath(absPath);
      const name2 = getFileName(absPath);
      const treeEntry = findEntryByPath(filteredTree, absPath);
      const isDir = treeEntry?.isDirectory ?? false;
      const asset = assetMap.get(relPath);
      return buildResourceDragItem(absPath, relPath, name2, isDir, asset?.id);
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
        t2("fileExplorer.duplicateFailed") +
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
        t2("fileExplorer.duplicateFailed") +
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
