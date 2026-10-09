// use-file-explorer-grid-delegates.js
import { dedupedToast, reactExports, useTranslation } from "../vendor.js";
import { findEntryByPath } from "../workspace/set-home-widget-dev-preview-mode.js";
import { useStableCallback } from "./use-cloud-review-nodes.js";
import { getFileName } from "../canvas/uploading-assets.jsx";
import { buildResourceDragItem } from "../text-editor/build-asr-gateway-request.js";
import { joinFilePath } from "./use-file-explorer-canvas-integration.js";
export function useFileExplorerDrag({
  selectedPaths,
  toRelativePath,
  treeRef,
  assetMap,
  move,
  invalidateDirs,
}) {
  const { t: t2 } = useTranslation();
  const buildDragPayload = useStableCallback((anchorAbsPath) => {
    const pathsToDrag = selectedPaths.has(anchorAbsPath)
      ? Array.from(selectedPaths)
      : [anchorAbsPath];
    const items = pathsToDrag.map((absPath) => {
      const relPath = toRelativePath(absPath);
      const name2 = getFileName(absPath);
      const treeEntry = findEntryByPath(treeRef.current, absPath);
      const isDir = treeEntry?.isDirectory ?? false;
      const asset = assetMap.get(relPath);
      return buildResourceDragItem(absPath, relPath, name2, isDir, asset?.id);
    });
    return JSON.stringify(items);
  });
  const handleMove = useStableCallback(async (sourcePaths, targetDir) => {
    if (sourcePaths.length === 0) return;
    try {
      const relativeSources = sourcePaths.map((p3) => toRelativePath(p3));
      const relativeTarget = toRelativePath(targetDir);
      await move({
        paths: relativeSources,
        target: relativeTarget,
      });
      invalidateDirs();
    } catch (err) {
      dedupedToast.error(
        t2("fileExplorer.moveFailed") +
          (err instanceof Error && err.message ? `: ${err.message}` : ""),
      );
    }
  });
  return {
    buildDragPayload,
    handleMove,
  };
}
export function useFileExplorerGridDelegates({
  rootPath,
  sortedFilteredAssets,
  filteredTree,
  updateSelection: updateSelection2,
  onFileOpen,
  requestDeleteFromAnchor,
  handleCopyPath,
  handleCopyFile,
  handleShowInFolder,
}) {
  const resolveAssetPath = reactExports.useCallback(
    (relativePath) =>
      rootPath ? joinFilePath(rootPath, relativePath) : relativePath,
    [rootPath],
  );
  const handleGridSelect = useStableCallback((relativePath, e2) => {
    const absPath = resolveAssetPath(relativePath);
    const visiblePaths = sortedFilteredAssets.map((a2) =>
      resolveAssetPath(a2.path),
    );
    updateSelection2(absPath, e2, visiblePaths);
  });
  const handleGridDoubleClick = useStableCallback((relativePath) => {
    const absPath = resolveAssetPath(relativePath);
    const name2 = getFileName(relativePath);
    onFileOpen?.(absPath, name2);
  });
  const handleGridDelete = useStableCallback((absolutePath) => {
    const entry = findEntryByPath(filteredTree, absolutePath) ?? {
      name: getFileName(absolutePath),
      path: absolutePath,
      isDirectory: false,
    };
    requestDeleteFromAnchor(entry);
  });
  const handleGridCopyPath = useStableCallback((absolutePath) =>
    handleCopyPath(absolutePath),
  );
  const handleGridCopyFile = useStableCallback((absolutePath) =>
    handleCopyFile(absolutePath),
  );
  const handleGridShowInFolder = useStableCallback((absolutePath) =>
    handleShowInFolder(absolutePath),
  );
  return {
    resolveAssetPath,
    handleGridSelect,
    handleGridDoubleClick,
    handleGridDelete,
    handleGridCopyPath,
    handleGridCopyFile,
    handleGridShowInFolder,
  };
}
