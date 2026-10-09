// use-asset-menu-shortcuts.js
import { useTranslation, reactExports, dedupedToast, useStorage, WORKSPACE_STORAGE_DEFAULTS } from "../vendor.js";
import { findEntryByPath } from "../m15/global-sidebar-provider.jsx";
import { useStableCallback } from "../m15/use-entity-hover-preview.js";
import { workspaceEvents } from "../m15/use-hub-logo-hover-animation.jsx";
import { getFileName$1 } from "../m10/delete-local-node-dialog.jsx";
import { buildResourceDragItem, parseResourceDrag } from "../m01/myers-line-hunks.js";
import {
  categorizeByExtension,
  computeDateBounds,
  matchesDateFilter,
} from "./save-to-project-assets-dialog.jsx";
function matchesTypeFilters(fileName, types2) {
  if (types2.length === 0) return true;
  return types2.includes(categorizeByExtension(fileName));
}
export function retainKnownTagFilters(tagFilters, knownTagIds) {
  const known = new Set(knownTagIds);
  const retained = tagFilters.filter((id2) => known.has(id2));
  return retained.length === tagFilters.length ? tagFilters : retained;
}
function compareByTimeOrName(timeA, timeB, keyA, keyB, sortOrder) {
  const ta2 = timeA ?? "";
  const tb = timeB ?? "";
  if (ta2 === "" && tb === "") return keyA.localeCompare(keyB);
  if (ta2 === "") return 1;
  if (tb === "") return -1;
  const cmp2 = ta2 < tb ? -1 : ta2 > tb ? 1 : 0;
  if (cmp2 !== 0) return sortOrder === "desc" ? -cmp2 : cmp2;
  return keyA.localeCompare(keyB);
}
export function buildTreeFileComparator(sortOrder, getAsset2) {
  return (a2, b3) =>
    compareByTimeOrName(
      getAsset2(a2.path)?.time,
      getAsset2(b3.path)?.time,
      a2.name,
      b3.name,
      sortOrder,
    );
}
function matchesTagFilter(tagIds, tagFilters) {
  if (!tagFilters || tagFilters.length === 0) return true;
  if (!tagIds || tagIds.length === 0) return false;
  return tagFilters.some((id2) => tagIds.includes(id2));
}
export function filterAndSortAssets(assets, options) {
  const q2 = options.query.trim().toLowerCase();
  const dateBounds = computeDateBounds(options.dateFilter);
  const filtered = assets.filter((a2) => {
    const fileName = a2.path.split("/").pop() ?? "";
    const nameMatch = q2 ? fileName.toLowerCase().includes(q2) : true;
    const tagNameMatch =
      q2 && options.tagSearchIds
        ? (a2.tagIds ?? []).some((id2) => options.tagSearchIds?.has(id2))
        : false;
    if (!nameMatch && !tagNameMatch) return false;
    if (!matchesTypeFilters(fileName, options.typeFilters)) return false;
    if (!matchesTagFilter(a2.tagIds, options.tagFilters)) return false;
    return matchesDateFilter(a2.time, dateBounds);
  });
  return [...filtered].sort((a2, b3) =>
    compareByTimeOrName(a2.time, b3.time, a2.path, b3.path, options.sortOrder),
  );
}
export function filterTreeByPredicate(tree, options) {
  const q2 = options.query.trim().toLowerCase();
  const dateBounds = computeDateBounds(options.dateFilter);
  const noActiveFilter =
    q2 === "" &&
    options.typeFilters.length === 0 &&
    dateBounds === null &&
    (options.tagFilters?.length ?? 0) === 0;
  function matchesFile(entry) {
    const asset = options.getAsset(entry.path);
    const nameMatch = q2 ? entry.name.toLowerCase().includes(q2) : true;
    const tagNameMatch =
      q2 && options.tagSearchIds
        ? (asset?.tagIds ?? []).some((id2) => options.tagSearchIds?.has(id2))
        : false;
    if (!nameMatch && !tagNameMatch) return false;
    if (!matchesTypeFilters(entry.name, options.typeFilters)) return false;
    if (!matchesTagFilter(asset?.tagIds, options.tagFilters)) return false;
    return matchesDateFilter(asset?.time, dateBounds);
  }
  function walk(entries2) {
    const result = [];
    for (const entry of entries2) {
      if (entry.isDirectory) {
        const dirNameMatch = q2 ? entry.name.toLowerCase().includes(q2) : false;
        const wasOriginallyEmpty = !entry.children || entry.children.length === 0;
        const filteredChildren = entry.children ? walk(entry.children) : [];
        if (dirNameMatch || filteredChildren.length > 0 || (wasOriginallyEmpty && noActiveFilter)) {
          result.push({
            ...entry,
            children: filteredChildren,
          });
        }
      } else if (matchesFile(entry)) {
        result.push(entry);
      }
    }
    return result;
  }
  return walk(tree);
}
export function findNextRowPath(currentPath, visiblePaths, direction, step = 1) {
  if (visiblePaths.length === 0) return null;
  const last2 = visiblePaths.length - 1;
  if (!currentPath) {
    return direction === "next" ? visiblePaths[0] : visiblePaths[last2];
  }
  const idx = visiblePaths.indexOf(currentPath);
  if (idx < 0) {
    return direction === "next" ? visiblePaths[0] : visiblePaths[last2];
  }
  if (direction === "next") {
    if (idx === last2) return null;
    return visiblePaths[Math.min(idx + step, last2)];
  }
  if (idx === 0) return null;
  return visiblePaths[Math.max(idx - step, 0)];
}
export function useAssetMenuShortcuts(handlers2) {
  return reactExports.useCallback(
    (event) => {
      const cmdOrCtrl = event.metaKey || event.ctrlKey;
      const isInputTarget =
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        (event.target instanceof HTMLElement && event.target.isContentEditable);
      if (isInputTarget) return;
      const hasSelection2 = (window.getSelection?.()?.toString().length ?? 0) > 0;
      if (event.key === "Escape") {
        if (!handlers2.onClearSelection) return;
        event.preventDefault();
        event.stopPropagation();
        handlers2.onClearSelection();
        return;
      }
      if (cmdOrCtrl && !event.shiftKey && (event.key === "a" || event.key === "A")) {
        if (hasSelection2) return;
        if (!handlers2.onSelectAll) return;
        event.preventDefault();
        event.stopPropagation();
        handlers2.onSelectAll();
        return;
      }
      if (cmdOrCtrl && !event.shiftKey && event.key === "1") {
        if (!handlers2.onSwitchToTreeView) return;
        event.preventDefault();
        event.stopPropagation();
        handlers2.onSwitchToTreeView();
        return;
      }
      if (cmdOrCtrl && !event.shiftKey && event.key === "2") {
        if (!handlers2.onSwitchToGridView) return;
        event.preventDefault();
        event.stopPropagation();
        handlers2.onSwitchToGridView();
        return;
      }
      if (cmdOrCtrl && !event.shiftKey && (event.key === "f" || event.key === "F")) {
        if (!handlers2.onFocusSearch) return;
        event.preventDefault();
        event.stopPropagation();
        handlers2.onFocusSearch();
        return;
      }
      if (cmdOrCtrl && !event.shiftKey && (event.key === "c" || event.key === "C")) {
        if (hasSelection2) return;
        if (!handlers2.onCopy) return;
        event.preventDefault();
        event.stopPropagation();
        handlers2.onCopy();
        return;
      }
      if (cmdOrCtrl && !event.shiftKey && (event.key === "d" || event.key === "D")) {
        if (!handlers2.onDuplicate) return;
        event.preventDefault();
        event.stopPropagation();
        handlers2.onDuplicate();
        return;
      }
      if (cmdOrCtrl && !event.shiftKey && (event.key === "z" || event.key === "Z")) {
        if (!handlers2.onUndo) return;
        event.preventDefault();
        event.stopPropagation();
        handlers2.onUndo();
        return;
      }
      if (cmdOrCtrl && event.shiftKey && (event.key === "a" || event.key === "A")) {
        if (!handlers2.onAddToCanvas) return;
        event.preventDefault();
        event.stopPropagation();
        handlers2.onAddToCanvas();
        return;
      }
      if (cmdOrCtrl && event.shiftKey && (event.key === "r" || event.key === "R")) {
        if (!handlers2.onShowInFolder) return;
        event.preventDefault();
        event.stopPropagation();
        handlers2.onShowInFolder();
        return;
      }
      if (cmdOrCtrl && !event.shiftKey && (event.key === "o" || event.key === "O")) {
        if (!handlers2.onOpenDefault) return;
        event.preventDefault();
        event.stopPropagation();
        handlers2.onOpenDefault();
        return;
      }
      if (!cmdOrCtrl && !event.shiftKey && event.key === "Enter") {
        if (!handlers2.onRename) return;
        event.preventDefault();
        event.stopPropagation();
        handlers2.onRename();
        return;
      }
      if (!cmdOrCtrl && (event.key === "Backspace" || event.key === "Delete")) {
        if (!handlers2.onDelete) return;
        event.preventDefault();
        event.stopPropagation();
        handlers2.onDelete();
        return;
      }
    },
    [handlers2],
  );
}
const DEFAULTS = WORKSPACE_STORAGE_DEFAULTS.assetPanel;
const VALID_CATEGORIES = ["image", "video", "audio", "text", "other"];
const VALID_DATE_KINDS = ["all", "today", "last7days", "last30days", "custom"];
const VALID_SORT = ["desc", "asc"];
function normalizeAssetPanelPreferences(raw2) {
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
      console.warn("[assetPanelPreferences] dropped invalid typeFilters entries:", {
        raw: r2.typeFilters,
        kept: typeFilters,
        dropped,
      });
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
      console.warn('[assetPanelPreferences] unknown dateFilter.kind, fallback to "all":', kind);
    }
  }
  let sortOrder = DEFAULTS.sortOrder;
  if (typeof r2.sortOrder === "string" && VALID_SORT.includes(r2.sortOrder)) {
    sortOrder = r2.sortOrder;
  } else if (r2.sortOrder !== void 0) {
    console.warn("[assetPanelPreferences] invalid sortOrder, fallback to default:", r2.sortOrder);
  }
  return {
    typeFilters,
    dateFilter,
    sortOrder,
  };
}
export function useAssetPanelPreferences() {
  const [stored, setAssetPanel] = useStorage("workspace.assetPanel");
  const value = reactExports.useMemo(() => normalizeAssetPanelPreferences(stored), [stored]);
  const { typeFilters, dateFilter, sortOrder } = value;
  const setTypeFilters = reactExports.useCallback(
    (next2) => {
      setAssetPanel({
        typeFilters: next2,
      });
    },
    [setAssetPanel],
  );
  const setDateFilter = reactExports.useCallback(
    (next2) => {
      setAssetPanel({
        dateFilter: next2,
      });
    },
    [setAssetPanel],
  );
  const setSortOrder = reactExports.useCallback(
    (next2) => {
      setAssetPanel({
        sortOrder: next2,
      });
    },
    [setAssetPanel],
  );
  const resetAll = reactExports.useCallback(() => {
    setAssetPanel(DEFAULTS);
  }, [setAssetPanel]);
  const isAnyActive = reactExports.useMemo(() => {
    if (typeFilters.length > 0) return true;
    if (sortOrder !== "desc") return true;
    if (dateFilter.kind === "custom") {
      return Boolean(dateFilter.from) || Boolean(dateFilter.to);
    }
    return dateFilter.kind !== "all";
  }, [typeFilters, dateFilter, sortOrder]);
  return {
    typeFilters,
    dateFilter,
    sortOrder,
    setTypeFilters,
    setDateFilter,
    setSortOrder,
    resetAll,
    isAnyActive,
  };
}
export function sortEntries(entries2, fileComparator) {
  return [...entries2].sort((a2, b3) => {
    if (a2.isDirectory !== b3.isDirectory) return a2.isDirectory ? -1 : 1;
    if (a2.isDirectory) return a2.name.localeCompare(b3.name);
    if (fileComparator) return fileComparator(a2, b3);
    return a2.name.localeCompare(b3.name);
  });
}
function preferredSeparator(path2) {
  return path2.includes("\\") && !path2.includes("/") ? "\\" : "/";
}
export function joinFilePath(parent, child) {
  if (!parent) return child;
  const sep = preferredSeparator(parent);
  const normalizedChild = sep === "\\" ? child.replace(/\//g, "\\") : child;
  if (parent.endsWith("/") || parent.endsWith("\\")) return `${parent}${normalizedChild}`;
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
  const prefix = rootPath.endsWith("/") || rootPath.endsWith("\\") ? rootPath : `${rootPath}${sep}`;
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
export function expandSelectionForDelete(anchor, selectedPaths, filteredTree) {
  if (selectedPaths.size > 1 && selectedPaths.has(anchor.path)) {
    const entries2 = [];
    for (const selectedPath of selectedPaths) {
      const entry = findEntryByPath(filteredTree, selectedPath);
      if (entry) entries2.push(entry);
    }
    return entries2.length > 0 ? entries2 : [anchor];
  }
  return [anchor];
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
export function filterSourcesNeedingMove(sourcePaths, targetDir) {
  return sourcePaths.filter((src) => getParentDir(src) !== targetDir);
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
      const name2 = getFileName$1(absPath);
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
