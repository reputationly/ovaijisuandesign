// use-file-explorer-root-drop.js
import {
  extractDropSourcePaths,
  getParentDir,
  isInvalidDropTarget,
} from "./use-file-explorer-canvas-integration.js";
import { reactExports, useTranslation } from "../vendor.js";
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
  const updateSelection2 = useStableCallback((path2, selectionModifiers, visiblePaths) => {
    if (selectionModifiers.metaKey || selectionModifiers.ctrlKey) {
      setSelectedPaths((prev) => {
        const next2 = new Set(prev);
        if (next2.has(path2)) next2.delete(path2);
        else next2.add(path2);
        return next2;
      });
      setLastSelectedPath(path2);
      selectionAnchorRef.current = null;
    } else if (selectionModifiers.shiftKey && lastSelectedPath) {
      const lastIdx = visiblePaths.indexOf(lastSelectedPath);
      const currentIdx = visiblePaths.indexOf(path2);
      if (lastIdx >= 0 && currentIdx >= 0) {
        const [start2, end2] =
          lastIdx < currentIdx ? [lastIdx, currentIdx] : [currentIdx, lastIdx];
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
  const handleFileSelect = useStableCallback((path2, selectionModifiers) => {
    const visiblePaths = flatRows
      .filter((row) => !row.entry.path.endsWith("/__creating__"))
      .map((row) => row.entry.path);
    updateSelection2(path2, selectionModifiers, visiblePaths);
  });
  return {
    updateSelection: updateSelection2,
    handleFileSelect,
  };
}
