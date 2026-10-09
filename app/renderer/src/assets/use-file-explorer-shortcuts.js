// use-file-explorer-shortcuts.js
import { dedupedToast, reactExports, useTranslation } from "../vendor.js";
import { activeToastIds } from "./post-check-conflicts.js";
import { refreshAssetIndex } from "./gateway-scope-provider.jsx";
import { useStableCallback } from "./use-cloud-review-nodes.js";
import { getFileName$1 } from "../canvas/uploading-assets.jsx";
import { OPERATIONS_UNDO_PATH } from "../generation/to-workspace-browser-url.js";

function dismissNewestDeleteUndoToast() {
  const id2 = activeToastIds.pop();
  if (id2 === void 0) return;
  dedupedToast.dismiss(id2);
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
    const targets =
      selectedPaths.size > 0
        ? [...selectedPaths]
        : primaryPath
          ? [primaryPath]
          : [];
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
    const paths =
      selectedPaths.size > 0
        ? [...selectedPaths]
        : primaryPath
          ? [primaryPath]
          : [];
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
      dedupedToast.error(
        `${t2("fileExplorer.undoFailed")}: ${res.status} ${res.statusText}`,
      );
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
