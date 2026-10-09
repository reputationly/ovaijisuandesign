// use-file-explorer-import.js
import {
  useTranslation,
  reactExports,
  dedupedToast,
  API_PATHS,
  useStableCallback,
  findEntryByPath,
} from "../vendor.js";
import { getFileName$1 } from "../m10/delete-local-node-dialog.jsx";
import { RESOURCE_DRAG_MIME, buildResourceDragItem } from "../m01/myers-line-hunks.js";
import { findNextRowPath, joinFilePath } from "./use-asset-menu-shortcuts.js";
import { postCheckConflicts } from "./use-file-explorer-clipboard.jsx";
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
      const name2 = getFileName$1(absPath);
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
    (relativePath) => (rootPath ? joinFilePath(rootPath, relativePath) : relativePath),
    [rootPath],
  );
  const handleGridSelect = useStableCallback((relativePath, e2) => {
    const absPath = resolveAssetPath(relativePath);
    const visiblePaths = sortedFilteredAssets.map((a2) => resolveAssetPath(a2.path));
    updateSelection2(absPath, e2, visiblePaths);
  });
  const handleGridDoubleClick = useStableCallback((relativePath) => {
    const absPath = resolveAssetPath(relativePath);
    const name2 = getFileName$1(relativePath);
    onFileOpen?.(absPath, name2);
  });
  const handleGridDelete = useStableCallback((absolutePath) => {
    const entry = findEntryByPath(filteredTree, absolutePath) ?? {
      name: getFileName$1(absolutePath),
      path: absolutePath,
      isDirectory: false,
    };
    requestDeleteFromAnchor(entry);
  });
  const handleGridCopyPath = useStableCallback((absolutePath) => handleCopyPath(absolutePath));
  const handleGridCopyFile = useStableCallback((absolutePath) => handleCopyFile(absolutePath));
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
export function useFileExplorerImport({
  gatewayFetch: gatewayFetch2,
  platform: platform2,
  rootPath,
  conflictResolver,
  refresh,
  setSelectedPaths,
  setLastSelectedPath,
}) {
  const { t: t2 } = useTranslation();
  const [externalDragOver, setExternalDragOver] = reactExports.useState(false);
  const dragCounterRef = reactExports.useRef(0);
  const handleImportFilesFromMenu = useStableCallback(async () => {
    if (!rootPath) return;
    const showOpenDialog = platform2.fs.showOpenDialog;
    if (!showOpenDialog) {
      dedupedToast.error(t2("fileExplorer.platformNotSupported"));
      return;
    }
    let picked;
    try {
      picked = await showOpenDialog({
        title: t2("fileExplorer.importFilesDialogTitle"),
        multiple: true,
        directory: false,
      });
    } catch (err) {
      dedupedToast.error(
        t2("fileExplorer.importFailed") +
          (err instanceof Error && err.message ? `: ${err.message}` : ""),
      );
      return;
    }
    if (!picked || picked.length === 0) return;
    const probeItems = picked.map((p3) => ({
      name: getFileName$1(p3),
      sourcePath: p3,
      kind: "file",
    }));
    let conflicts;
    try {
      const probeJson = await postCheckConflicts(gatewayFetch2, {
        items: probeItems,
        targetDir: "",
      });
      conflicts = probeJson.conflicts.map((c3) => ({
        name: c3.name,
        sourcePath: c3.sourcePath,
        existingKind: c3.existingKind,
      }));
    } catch (err) {
      dedupedToast.error(
        t2("fileExplorer.importFailed") +
          (err instanceof Error && err.message ? `: ${err.message}` : ""),
      );
      return;
    }
    const skipSources = new Set();
    const overwriteTargets = [];
    if (conflicts.length > 0) {
      const result = await conflictResolver.resolve(conflicts);
      if (result.outcome === "dismissed") return;
      if (result.outcome === "preempted") {
        console.warn("[fileExplorer] conflict resolver preempted mid-import");
        return;
      }
      const { decisions } = result;
      conflicts.forEach((c3, i2) => {
        const decision = decisions[i2];
        if (!c3.sourcePath) return;
        if (decision === "skip") skipSources.add(c3.sourcePath);
        else if (decision === "overwrite") overwriteTargets.push(c3.name);
      });
    }
    const sourcesToImport = picked.filter((p3) => !skipSources.has(p3));
    if (sourcesToImport.length === 0) {
      return;
    }
    if (overwriteTargets.length > 0) {
      try {
        const deleteRes = await gatewayFetch2(API_PATHS.deleteFiles, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            paths: overwriteTargets,
          }),
        });
        if (!deleteRes.ok) {
          throw new Error(`delete failed: ${deleteRes.status} ${deleteRes.statusText}`);
        }
      } catch (err) {
        console.warn("[fileExplorer] overwrite delete failed", err);
        dedupedToast.warning(t2("fileExplorer.overwriteFailedRenamed"));
      }
    }
    try {
      const res = await gatewayFetch2(API_PATHS.importExternal, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paths: sourcesToImport,
        }),
      });
      if (!res.ok) {
        throw new Error(`Import failed: ${res.status} ${res.statusText}`);
      }
      let data2;
      try {
        data2 = await res.json();
      } catch (err) {
        throw new Error(
          `Import response is not JSON: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
      const newAbsPaths = (data2.imported ?? []).map((it2) => joinFilePath(rootPath, it2.path));
      if (data2.errors?.length) {
        console.warn("[fileExplorer] import partial failures:", data2.errors);
        dedupedToast.warning(
          t2("fileExplorer.importFailedCount", {
            count: data2.errors.length,
          }),
        );
      } else {
        dedupedToast.success(t2("fileExplorer.importComplete"));
      }
      await refresh();
      if (newAbsPaths.length > 0) {
        setSelectedPaths(new Set(newAbsPaths));
        setLastSelectedPath(newAbsPaths[newAbsPaths.length - 1]);
      }
    } catch (err) {
      dedupedToast.error(
        t2("fileExplorer.importFailed") +
          (err instanceof Error && err.message ? `: ${err.message}` : ""),
      );
    }
  });
  const isExternalFileDrag = reactExports.useCallback((e2) => {
    return (
      e2.dataTransfer.types.includes("Files") && !e2.dataTransfer.types.includes(RESOURCE_DRAG_MIME)
    );
  }, []);
  const handleExternalDragEnter = reactExports.useCallback(
    (e2) => {
      if (!isExternalFileDrag(e2)) return;
      e2.preventDefault();
      dragCounterRef.current += 1;
      if (dragCounterRef.current === 1) {
        setExternalDragOver(true);
      }
    },
    [isExternalFileDrag],
  );
  const handleExternalDragOver = reactExports.useCallback(
    (e2) => {
      if (!isExternalFileDrag(e2)) return;
      e2.preventDefault();
      e2.dataTransfer.dropEffect = "copy";
    },
    [isExternalFileDrag],
  );
  const handleExternalDragLeave = reactExports.useCallback(
    (e2) => {
      if (!isExternalFileDrag(e2)) return;
      dragCounterRef.current -= 1;
      if (dragCounterRef.current <= 0) {
        dragCounterRef.current = 0;
        setExternalDragOver(false);
      }
    },
    [isExternalFileDrag],
  );
  const handleExternalDrop = useStableCallback(async (e2) => {
    if (!isExternalFileDrag(e2)) return;
    e2.preventDefault();
    dragCounterRef.current = 0;
    setExternalDragOver(false);
    const files = Array.from(e2.dataTransfer.files);
    const paths = files.map((f2) => window.hilo?.webUtils?.getPathForFile(f2)).filter((p3) => !!p3);
    if (paths.length === 0) return;
    try {
      const res = await gatewayFetch2(API_PATHS.importExternal, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paths,
        }),
      });
      if (!res.ok) throw new Error(`Import failed: ${res.status}`);
      const data2 = await res.json();
      if (data2.errors?.length) {
        dedupedToast.error(
          t2("fileExplorer.importFailedCount", {
            count: data2.errors.length,
          }),
        );
      }
      await refresh();
    } catch (err) {
      dedupedToast.error(
        t2("fileExplorer.importFailed") +
          (err instanceof Error && err.message ? `: ${err.message}` : ""),
      );
    }
  });
  return {
    externalDragOver,
    handleImportFilesFromMenu,
    handleExternalDragEnter,
    handleExternalDragOver,
    handleExternalDragLeave,
    handleExternalDrop,
  };
}
export function useFileExplorerKeyboard({
  sectionRef,
  primaryPath,
  visiblePaths,
  viewMode,
  columnsPerRow,
  flatRows,
  getRowAnchor,
  dispatchShortcut,
  selectionAnchorRef,
  setSelectedPaths,
  setLastSelectedPath,
}) {
  const navStateRef = reactExports.useRef({
    primaryPath,
    visiblePaths,
    viewMode,
    columnsPerRow,
    flatRows,
    dispatchShortcut,
    getRowAnchor,
  });
  navStateRef.current = {
    primaryPath,
    visiblePaths,
    viewMode,
    columnsPerRow,
    flatRows,
    dispatchShortcut,
    getRowAnchor,
  };
  reactExports.useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const onKey = (event) => {
      const target = event.target;
      const state2 = navStateRef.current;
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        const isInputTarget =
          target instanceof HTMLInputElement ||
          target instanceof HTMLTextAreaElement ||
          (target instanceof HTMLElement && target.isContentEditable);
        if (isInputTarget) return;
        if (state2.visiblePaths.length === 0) return;
        const direction = event.key === "ArrowDown" ? "next" : "prev";
        const step = state2.viewMode === "grid" ? state2.columnsPerRow : 1;
        const nextPath = findNextRowPath(state2.primaryPath, state2.visiblePaths, direction, step);
        if (!nextPath) return;
        event.preventDefault();
        event.stopPropagation();
        if (event.shiftKey) {
          if (!selectionAnchorRef.current) {
            selectionAnchorRef.current = state2.primaryPath ?? nextPath;
          }
          const anchorPath = selectionAnchorRef.current;
          const anchorIdx = anchorPath ? state2.visiblePaths.indexOf(anchorPath) : -1;
          const nextIdx = state2.visiblePaths.indexOf(nextPath);
          if (anchorIdx >= 0 && nextIdx >= 0) {
            const [start2, end2] =
              anchorIdx < nextIdx ? [anchorIdx, nextIdx] : [nextIdx, anchorIdx];
            setSelectedPaths(new Set(state2.visiblePaths.slice(start2, end2 + 1)));
          } else {
            setSelectedPaths(new Set([nextPath]));
          }
          setLastSelectedPath(nextPath);
        } else {
          selectionAnchorRef.current = null;
          setSelectedPaths(new Set([nextPath]));
          setLastSelectedPath(nextPath);
        }
        const anchor = state2.getRowAnchor(nextPath);
        anchor?.scrollIntoView({
          block: "nearest",
          inline: "nearest",
        });
        return;
      }
      state2.dispatchShortcut(event);
    };
    section.addEventListener("keydown", onKey);
    return () => section.removeEventListener("keydown", onKey);
  }, []);
}
export function useFileExplorerMissingRecovery({
  mergeCandidate,
  removeMissing,
  manualLocate,
  platform: platform2,
  toRelativePath,
  assetMap,
}) {
  const { t: t2 } = useTranslation();
  const handleMergeCandidate = useStableCallback(async (asset) => {
    if (!asset.candidate) {
      dedupedToast.error(t2("missing.mergeFailed"));
      return;
    }
    try {
      await mergeCandidate({
        id: asset.id,
        candidateId: asset.candidate.asset_id,
      });
    } catch (err) {
      dedupedToast.error(
        t2("missing.mergeFailed") + (err instanceof Error && err.message ? `: ${err.message}` : ""),
      );
    }
  });
  const handleRemoveMissing = useStableCallback(async (asset) => {
    try {
      await removeMissing({
        id: asset.id,
      });
    } catch (err) {
      dedupedToast.error(
        t2("missing.removeFailed") +
          (err instanceof Error && err.message ? `: ${err.message}` : ""),
      );
    }
  });
  const handleLocateMissing = useStableCallback(async (asset) => {
    const showOpenDialog = platform2.fs.showOpenDialog;
    if (!showOpenDialog) {
      dedupedToast.error(t2("fileExplorer.platformNotSupported"));
      return;
    }
    let picked;
    try {
      picked = await showOpenDialog({
        title: t2("missing.locateDialogTitle", {
          name: asset.name ?? asset.path,
        }),
        multiple: false,
        directory: false,
      });
    } catch (err) {
      dedupedToast.error(
        t2("missing.locateFailed") +
          (err instanceof Error && err.message ? `: ${err.message}` : ""),
      );
      return;
    }
    if (!picked || picked.length === 0) return;
    const newPath = picked[0];
    try {
      await manualLocate({
        id: asset.id,
        newPath,
      });
    } catch (err) {
      dedupedToast.error(
        t2("missing.locateFailed") +
          (err instanceof Error && err.message ? `: ${err.message}` : ""),
      );
    }
  });
  const resolveEntryAsset = reactExports.useCallback(
    (entry) => {
      const rel = toRelativePath(entry.path);
      return assetMap.get(rel);
    },
    [assetMap, toRelativePath],
  );
  const handleTreeMergeCandidate = useStableCallback((entry) => {
    const asset = resolveEntryAsset(entry);
    if (!asset) {
      console.warn("[fileExplorer] missing assetMap entry for tree row", entry.path);
      return;
    }
    void handleMergeCandidate(asset);
  });
  const handleTreeRemoveMissing = useStableCallback((entry) => {
    const asset = resolveEntryAsset(entry);
    if (!asset) {
      console.warn("[fileExplorer] missing assetMap entry for tree row", entry.path);
      return;
    }
    void handleRemoveMissing(asset);
  });
  const handleTreeLocateMissing = useStableCallback((entry) => {
    const asset = resolveEntryAsset(entry);
    if (!asset) {
      console.warn("[fileExplorer] missing assetMap entry for tree row", entry.path);
      return;
    }
    void handleLocateMissing(asset);
  });
  return {
    handleMergeCandidate,
    handleRemoveMissing,
    handleLocateMissing,
    handleTreeMergeCandidate,
    handleTreeRemoveMissing,
    handleTreeLocateMissing,
  };
}
