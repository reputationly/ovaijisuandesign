// use-file-explorer-root-drop.js
import {
  extractDropSourcePaths,
  getParentDir,
  isInvalidDropTarget,
} from "./use-file-explorer-canvas-integration.js";
import reactExports from "react";
import { useTranslation } from "react-i18next";
import { dedupedToast } from "../infra/agent-http-client.js";
import { useStableCallback } from "./use-cloud-review-nodes.js";
import { RESOURCE_DRAG_MIME } from "../text-editor/build-asr-gateway-request.js";

function filterSourcesNeedingMove(sourcePaths, targetDir) {
  return sourcePaths.filter((src) => getParentDir(src) !== targetDir);
}

function isEditableEscapeTarget(target) {
  if (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement
  )
    return true;
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return (
    target.closest('[contenteditable]:not([contenteditable="false"])') !== null
  );
}

export function shouldClosePanel(event) {
  return (
    event.key === "Escape" &&
    !event.defaultPrevented &&
    !isEditableEscapeTarget(event.target)
  );
}

export function useFileExplorerRename({
  rename,
  toRelativePath,
  invalidateDirs,
}) {
  const { t: translate } = useTranslation();
  const [renamingPath, setRenamingPath] = reactExports.useState(null);
  const startRename = useStableCallback((path) => {
    setRenamingPath(path);
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
        translate("fileExplorer.renameFailed") +
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
    (dragEvent) => dragEvent.dataTransfer.types.includes(RESOURCE_DRAG_MIME),
    [],
  );
  const handleInternalRootDragOver = reactExports.useCallback(
    (dragEvent) => {
      if (!isInternalDrag(dragEvent)) return;
      if (!rootPath) return;
      dragEvent.preventDefault();
      dragEvent.dataTransfer.dropEffect = "move";
    },
    [isInternalDrag, rootPath],
  );
  const handleInternalRootDrop = useStableCallback((dragEvent) => {
    if (!isInternalDrag(dragEvent)) return;
    if (!rootPath) return;
    dragEvent.preventDefault();
    const sourcePaths = extractDropSourcePaths(dragEvent.dataTransfer);
    if (sourcePaths.length === 0) return;
    if (isInvalidDropTarget(sourcePaths, rootPath)) return;
    const needsMove = filterSourcesNeedingMove(sourcePaths, rootPath);
    if (needsMove.length === 0) return;
    handleMove(needsMove, rootPath);
  });
  const handleRootDragEnter = reactExports.useCallback(
    (dragEvent) => {
      if (isInternalDrag(dragEvent)) {
        handleInternalRootDragOver(dragEvent);
        return;
      }
      handleExternalDragEnter(dragEvent);
    },
    [isInternalDrag, handleInternalRootDragOver, handleExternalDragEnter],
  );
  const handleRootDragOver = reactExports.useCallback(
    (dragEvent) => {
      if (isInternalDrag(dragEvent)) {
        handleInternalRootDragOver(dragEvent);
        return;
      }
      handleExternalDragOver(dragEvent);
    },
    [isInternalDrag, handleInternalRootDragOver, handleExternalDragOver],
  );
  const handleRootDragLeave = reactExports.useCallback(
    (dragEvent) => {
      if (isInternalDrag(dragEvent)) return;
      handleExternalDragLeave(dragEvent);
    },
    [isInternalDrag, handleExternalDragLeave],
  );
  const handleRootDrop = reactExports.useCallback(
    (dragEvent) => {
      if (isInternalDrag(dragEvent)) {
        handleInternalRootDrop(dragEvent);
        return;
      }
      handleExternalDrop(dragEvent);
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
  const scrollCallbackRef = reactExports.useCallback((node) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    setScrollEl(node);
    if (node) {
      setContainerWidth(node.getBoundingClientRect().width);
      const observer = new ResizeObserver(([entry]) => {
        setContainerWidth(entry.contentRect.width);
      });
      observer.observe(node);
      observerRef.current = observer;
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
  const updateSelection = useStableCallback((path, selectionModifiers, visiblePaths) => {
    if (selectionModifiers.metaKey || selectionModifiers.ctrlKey) {
      setSelectedPaths((prev) => {
        const next = new Set(prev);
        if (next.has(path)) next.delete(path);
        else next.add(path);
        return next;
      });
      setLastSelectedPath(path);
      selectionAnchorRef.current = null;
    } else if (selectionModifiers.shiftKey && lastSelectedPath) {
      const lastIdx = visiblePaths.indexOf(lastSelectedPath);
      const currentIdx = visiblePaths.indexOf(path);
      if (lastIdx >= 0 && currentIdx >= 0) {
        const [start, end] =
          lastIdx < currentIdx ? [lastIdx, currentIdx] : [currentIdx, lastIdx];
        setSelectedPaths(new Set(visiblePaths.slice(start, end + 1)));
      } else {
        setSelectedPaths(new Set([path]));
        setLastSelectedPath(path);
      }
      selectionAnchorRef.current = null;
    } else {
      setSelectedPaths(new Set([path]));
      setLastSelectedPath(path);
      selectionAnchorRef.current = null;
    }
  });
  const handleFileSelect = useStableCallback((path, selectionModifiers) => {
    const visiblePaths = flatRows
      .filter((row) => !row.entry.path.endsWith("/__creating__"))
      .map((row) => row.entry.path);
    updateSelection(path, selectionModifiers, visiblePaths);
  });
  return {
    updateSelection,
    handleFileSelect,
  };
}
