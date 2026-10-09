// use-file-explorer-shortcuts.js
import {
  useTranslation,
  reactExports,
  dedupedToast,
  useStableCallback,
  refreshAssetIndex,
} from "../vendor.js";
import { getFileName$1 } from "../m10/delete-local-node-dialog.jsx";
import { RESOURCE_DRAG_MIME } from "../m01/myers-line-hunks.js";
import { OPERATIONS_UNDO_PATH } from "../m01/text-models.js";
import {
  extractDropSourcePaths,
  filterSourcesNeedingMove,
  isInvalidDropTarget,
} from "./use-asset-menu-shortcuts.js";
import { dismissNewestDeleteUndoToast } from "./use-file-explorer-clipboard.jsx";
function isEditableEscapeTarget(target) {
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return true;
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return target.closest('[contenteditable]:not([contenteditable="false"])') !== null;
}
function shouldClosePanel(event) {
  return event.key === "Escape" && !event.defaultPrevented && !isEditableEscapeTarget(event.target);
}
export function useFileExplorerPanelClose({ isActive: isActive2, onClose }) {
  const handlePanelKeyDownCapture = reactExports.useCallback(
    (event) => {
      if (!isActive2 || !shouldClosePanel(event.nativeEvent)) return;
      event.preventDefault();
      event.stopPropagation();
      onClose();
    },
    [isActive2, onClose],
  );
  reactExports.useEffect(() => {
    if (!isActive2) return;
    const handleWindowKeyDown = (event) => {
      if (!shouldClosePanel(event)) return;
      event.preventDefault();
      onClose();
    };
    window.addEventListener("keydown", handleWindowKeyDown);
    return () => window.removeEventListener("keydown", handleWindowKeyDown);
  }, [isActive2, onClose]);
  return {
    handlePanelKeyDownCapture,
  };
}
export function useFileExplorerRename({ rename, toRelativePath, invalidateDirs }) {
  const { t: t2 } = useTranslation();
  const [renamingPath, setRenamingPath] = reactExports.useState(null);
  const startRename = useStableCallback((path2) => {
    setRenamingPath(path2);
  });
  const handleRename = useStableCallback(async (oldPath, newName) => {
    try {
      const relativePath = toRelativePath(oldPath);
      await rename({
        path: relativePath,
        newName,
      });
      invalidateDirs();
    } catch (err) {
      dedupedToast.error(
        t2("fileExplorer.renameFailed") +
          (err instanceof Error && err.message ? `: ${err.message}` : ""),
      );
    }
    setRenamingPath(null);
  });
  const handleRenameCancel = useStableCallback(() => {
    setRenamingPath(null);
  });
  return {
    renamingPath,
    startRename,
    handleRename,
    handleRenameCancel,
  };
}
export function useFileExplorerRootDrop({
  rootPath,
  handleMove,
  handleExternalDragEnter,
  handleExternalDragOver,
  handleExternalDragLeave,
  handleExternalDrop,
}) {
  const isInternalDrag = reactExports.useCallback(
    (e2) => e2.dataTransfer.types.includes(RESOURCE_DRAG_MIME),
    [],
  );
  const handleInternalRootDragOver = reactExports.useCallback(
    (e2) => {
      if (!isInternalDrag(e2)) return;
      if (!rootPath) return;
      e2.preventDefault();
      e2.dataTransfer.dropEffect = "move";
    },
    [isInternalDrag, rootPath],
  );
  const handleInternalRootDrop = useStableCallback((e2) => {
    if (!isInternalDrag(e2)) return;
    if (!rootPath) return;
    e2.preventDefault();
    const sourcePaths = extractDropSourcePaths(e2.dataTransfer);
    if (sourcePaths.length === 0) return;
    if (isInvalidDropTarget(sourcePaths, rootPath)) return;
    const needsMove = filterSourcesNeedingMove(sourcePaths, rootPath);
    if (needsMove.length === 0) return;
    handleMove(needsMove, rootPath);
  });
  const handleRootDragEnter = reactExports.useCallback(
    (e2) => {
      if (isInternalDrag(e2)) {
        handleInternalRootDragOver(e2);
        return;
      }
      handleExternalDragEnter(e2);
    },
    [isInternalDrag, handleInternalRootDragOver, handleExternalDragEnter],
  );
  const handleRootDragOver = reactExports.useCallback(
    (e2) => {
      if (isInternalDrag(e2)) {
        handleInternalRootDragOver(e2);
        return;
      }
      handleExternalDragOver(e2);
    },
    [isInternalDrag, handleInternalRootDragOver, handleExternalDragOver],
  );
  const handleRootDragLeave = reactExports.useCallback(
    (e2) => {
      if (isInternalDrag(e2)) return;
      handleExternalDragLeave(e2);
    },
    [isInternalDrag, handleExternalDragLeave],
  );
  const handleRootDrop = reactExports.useCallback(
    (e2) => {
      if (isInternalDrag(e2)) {
        handleInternalRootDrop(e2);
        return;
      }
      handleExternalDrop(e2);
    },
    [isInternalDrag, handleInternalRootDrop, handleExternalDrop],
  );
  return {
    handleRootDragEnter,
    handleRootDragOver,
    handleRootDragLeave,
    handleRootDrop,
  };
}
export function useFileExplorerScrollContainer() {
  const [scrollEl, setScrollEl] = reactExports.useState(null);
  const [containerWidth, setContainerWidth] = reactExports.useState(0);
  const observerRef = reactExports.useRef(null);
  const scrollCallbackRef = reactExports.useCallback((node2) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    setScrollEl(node2);
    if (node2) {
      setContainerWidth(node2.getBoundingClientRect().width);
      const observer2 = new ResizeObserver(([entry]) => {
        setContainerWidth(entry.contentRect.width);
      });
      observer2.observe(node2);
      observerRef.current = observer2;
    } else {
      setContainerWidth(0);
    }
  }, []);
  return {
    scrollEl,
    scrollCallbackRef,
    containerWidth,
  };
}
export function useFileExplorerSelection({
  lastSelectedPath,
  flatRows,
  setSelectedPaths,
  setLastSelectedPath,
  selectionAnchorRef,
}) {
  const updateSelection2 = useStableCallback((path2, e2, visiblePaths) => {
    if (e2.metaKey || e2.ctrlKey) {
      setSelectedPaths((prev) => {
        const next2 = new Set(prev);
        if (next2.has(path2)) next2.delete(path2);
        else next2.add(path2);
        return next2;
      });
      setLastSelectedPath(path2);
      selectionAnchorRef.current = null;
    } else if (e2.shiftKey && lastSelectedPath) {
      const lastIdx = visiblePaths.indexOf(lastSelectedPath);
      const currentIdx = visiblePaths.indexOf(path2);
      if (lastIdx >= 0 && currentIdx >= 0) {
        const [start2, end2] = lastIdx < currentIdx ? [lastIdx, currentIdx] : [currentIdx, lastIdx];
        setSelectedPaths(new Set(visiblePaths.slice(start2, end2 + 1)));
      } else {
        setSelectedPaths(new Set([path2]));
        setLastSelectedPath(path2);
      }
      selectionAnchorRef.current = null;
    } else {
      setSelectedPaths(new Set([path2]));
      setLastSelectedPath(path2);
      selectionAnchorRef.current = null;
    }
  });
  const handleFileSelect = useStableCallback((path2, e2) => {
    const visiblePaths = flatRows
      .filter((r2) => !r2.entry.path.endsWith("/__creating__"))
      .map((r2) => r2.entry.path);
    updateSelection2(path2, e2, visiblePaths);
  });
  return {
    updateSelection: updateSelection2,
    handleFileSelect,
  };
}
export function useFileExplorerShortcuts({
  setSelectedPaths,
  setLastSelectedPath,
  setViewMode,
  selectionAnchorRef,
  searchInputRef,
  selectedPaths,
  visiblePaths,
  primaryPath,
  primaryRowHandlers,
  resetScrollToTop,
  toRelativePath,
  handleCopyFile,
  duplicate,
  gatewayFetch: gatewayFetch2,
  queryClient: queryClient2,
  gatewayScopeKey,
}) {
  const { t: t2 } = useTranslation();
  const handleSelectAll = useStableCallback(() => {
    setSelectedPaths(new Set(visiblePaths));
  });
  const handleClearSelection = useStableCallback(() => {
    setSelectedPaths(new Set());
    setLastSelectedPath(null);
    selectionAnchorRef.current = null;
  });
  const handleSwitchToTreeView = useStableCallback(() => {
    setViewMode("tree");
    resetScrollToTop("tree");
  });
  const handleSwitchToGridView = useStableCallback(() => {
    setViewMode("grid");
    resetScrollToTop("grid");
  });
  const handleFocusSearch = useStableCallback(() => {
    searchInputRef.current?.focus();
  });
  const handleCopyShortcut = useStableCallback(async () => {
    const targets = selectedPaths.size > 0 ? [...selectedPaths] : primaryPath ? [primaryPath] : [];
    if (targets.length === 0) return;
    const first2 = targets[0];
    if (targets.length > 1) {
      dedupedToast.info(
        t2("fileExplorer.copyMultiSelectFirst", {
          name: getFileName$1(first2),
        }),
      );
    }
    try {
      await handleCopyFile(first2);
    } catch (err) {
      dedupedToast.error(
        t2("fileExplorer.copyFailed") +
          (err instanceof Error && err.message ? `: ${err.message}` : ""),
      );
    }
  });
  const handleDuplicateShortcut = useStableCallback(async () => {
    const paths = selectedPaths.size > 0 ? [...selectedPaths] : primaryPath ? [primaryPath] : [];
    if (paths.length === 0) return;
    try {
      const relPaths = paths.map(toRelativePath);
      await duplicate({
        paths: relPaths,
      });
    } catch (err) {
      dedupedToast.error(
        t2("fileExplorer.duplicateFailed") +
          (err instanceof Error && err.message ? `: ${err.message}` : ""),
      );
    }
  });
  const handleUndoShortcut = useStableCallback(async () => {
    let res;
    try {
      res = await gatewayFetch2(OPERATIONS_UNDO_PATH, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
    } catch (err) {
      dedupedToast.error(
        err instanceof Error && err.message
          ? `${t2("fileExplorer.undoFailed")}: ${err.message}`
          : t2("fileExplorer.undoFailed"),
      );
      return;
    }
    if (!res.ok) {
      dedupedToast.error(`${t2("fileExplorer.undoFailed")}: ${res.status} ${res.statusText}`);
      return;
    }
    const body2 = await res.json().catch(() => null);
    if (!body2) {
      dedupedToast.error(t2("fileExplorer.undoFailed"));
      return;
    }
    if (body2.ok) {
      dismissNewestDeleteUndoToast();
      await refreshAssetIndex({
        qc: queryClient2,
        gatewayScopeKey,
      });
      return;
    }
    switch (body2.errorType) {
      case "empty-stack":
        return;
      case "expired":
        return;
      case "path-conflict":
        dismissNewestDeleteUndoToast();
        dedupedToast.error(
          body2.errorMessage
            ? `${t2("fileExplorer.undoPathConflict")}: ${body2.errorMessage}`
            : t2("fileExplorer.undoPathConflict"),
        );
        return;
      case "partial": {
        dismissNewestDeleteUndoToast();
        await refreshAssetIndex({
          qc: queryClient2,
          gatewayScopeKey,
        });
        return;
      }
      default:
        dismissNewestDeleteUndoToast();
        dedupedToast.error(
          body2.errorMessage
            ? `${t2("fileExplorer.undoFailed")}: ${body2.errorMessage}`
            : t2("fileExplorer.undoFailed"),
        );
    }
  });
  const panelLevelHandlers = reactExports.useMemo(() => {
    const panel = {
      onSelectAll: handleSelectAll,
      onClearSelection: handleClearSelection,
      onSwitchToTreeView: handleSwitchToTreeView,
      onSwitchToGridView: handleSwitchToGridView,
      onFocusSearch: handleFocusSearch,
      onCopy: handleCopyShortcut,
      onDuplicate: handleDuplicateShortcut,
      onUndo: handleUndoShortcut,
      // Cmd+V handled by <section onPaste>, not the keydown dispatcher.
    };
    return {
      ...primaryRowHandlers,
      ...panel,
    };
  }, [
    primaryRowHandlers,
    handleSelectAll,
    handleClearSelection,
    handleSwitchToTreeView,
    handleSwitchToGridView,
    handleFocusSearch,
    handleCopyShortcut,
    handleDuplicateShortcut,
    handleUndoShortcut,
  ]);
  return {
    panelLevelHandlers,
  };
}
export function useAssetTree(assets, dirs) {
  return reactExports.useMemo(() => buildAssetTree(assets, dirs), [assets, dirs]);
}
function buildAssetTree(assets, dirs) {
  const root2 = [];
  const dirMap = new Map();
  const seenPaths = new Set();
  if (dirs && dirs.length > 0) {
    const sortedDirs = [...dirs].sort((a2, b3) => a2.split("/").length - b3.split("/").length);
    for (const dirPath of sortedDirs) {
      if (!dirPath) continue;
      const segments = dirPath.split("/");
      let currentChildren = root2;
      let currentPath = "";
      for (const segment of segments) {
        if (!segment) continue;
        currentPath = currentPath ? `${currentPath}/${segment}` : segment;
        const node2 = ensureDirNode(currentPath, currentChildren, dirMap, segment);
        currentChildren = node2.children ?? [];
      }
    }
  }
  for (const asset of assets) {
    if (seenPaths.has(asset.path)) continue;
    seenPaths.add(asset.path);
    const segments = asset.path.split("/");
    let currentChildren = root2;
    let currentPath = "";
    for (let i2 = 0; i2 < segments.length - 1; i2++) {
      const segment = segments[i2];
      currentPath = currentPath ? `${currentPath}/${segment}` : segment;
      const node2 = ensureDirNode(currentPath, currentChildren, dirMap, segment);
      currentChildren = node2.children ?? [];
    }
    const fileName = asset.name || segments[segments.length - 1];
    currentChildren.push({
      name: fileName,
      path: asset.path,
      isDirectory: false,
      status: asset.status,
      assetId: asset.id,
      candidate: asset.candidate,
    });
  }
  sortTree(root2);
  return root2;
}
function ensureDirNode(currentPath, currentChildren, dirMap, segment) {
  const existing = dirMap.get(currentPath);
  if (existing) return existing;
  const dirEntry = {
    name: segment,
    path: currentPath,
    isDirectory: true,
    children: [],
    loaded: true,
  };
  dirMap.set(currentPath, dirEntry);
  currentChildren.push(dirEntry);
  return dirEntry;
}
function sortTree(entries2) {
  entries2.sort((a2, b3) => {
    if (a2.isDirectory !== b3.isDirectory) return a2.isDirectory ? -1 : 1;
    return a2.name.localeCompare(b3.name);
  });
  for (const entry of entries2) {
    if (entry.children) sortTree(entry.children);
  }
}
