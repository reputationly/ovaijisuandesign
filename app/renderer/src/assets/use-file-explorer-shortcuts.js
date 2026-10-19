// use-file-explorer-shortcuts.js
import { __jsx } from "../shared/jsx-runtime.js";
import reactExports from "react";
import { useTranslation } from "react-i18next";
import { dedupedToast } from "../infra/agent-http-client.js";
import { activeToastIds } from "./post-check-conflicts.js";
import { refreshAssetIndex } from "./gateway-scope-provider.jsx";
import { useStableCallback } from "./use-cloud-review-nodes.js";
import { getFileName } from "../canvas/uploading-assets.jsx";
import { OPERATIONS_UNDO_PATH } from "../generation/to-workspace-browser-url.js";
function dismissNewestDeleteUndoToast() {
  const toastId = activeToastIds.pop();
  if (toastId === void 0) return;
  dedupedToast.dismiss(toastId);
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
  gatewayFetch,
  queryClient,
  gatewayScopeKey,
}) {
  const { t: translate } = useTranslation();
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
    const first = targets[0];
    if (targets.length > 1) {
      dedupedToast.info(
        translate("fileExplorer.copyMultiSelectFirst", {
          name: getFileName(first),
        }),
      );
    }
    try {
      await handleCopyFile(first);
    } catch (err) {
      dedupedToast.error(
        translate("fileExplorer.copyFailed") +
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
        translate("fileExplorer.duplicateFailed") +
          (err instanceof Error && err.message ? `: ${err.message}` : ""),
      );
    }
  });
  const handleUndoShortcut = useStableCallback(async () => {
    let res;
    try {
      res = await gatewayFetch(OPERATIONS_UNDO_PATH, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
    } catch (err) {
      dedupedToast.error(
        err instanceof Error && err.message
          ? `${translate("fileExplorer.undoFailed")}: ${err.message}`
          : translate("fileExplorer.undoFailed"),
      );
      return;
    }
    if (!res.ok) {
      dedupedToast.error(
        `${translate("fileExplorer.undoFailed")}: ${res.status} ${res.statusText}`,
      );
      return;
    }
    const body = await res.json().catch(() => null);
    if (!body) {
      dedupedToast.error(translate("fileExplorer.undoFailed"));
      return;
    }
    if (body.ok) {
      dismissNewestDeleteUndoToast();
      await refreshAssetIndex({
        qc: queryClient,
        gatewayScopeKey,
      });
      return;
    }
    switch (body.errorType) {
      case "empty-stack":
        return;
      case "expired":
        return;
      case "path-conflict":
        dismissNewestDeleteUndoToast();
        dedupedToast.error(
          body.errorMessage
            ? `${translate("fileExplorer.undoPathConflict")}: ${body.errorMessage}`
            : translate("fileExplorer.undoPathConflict"),
        );
        return;
      case "partial": {
        dismissNewestDeleteUndoToast();
        await refreshAssetIndex({
          qc: queryClient,
          gatewayScopeKey,
        });
        return;
      }
      default:
        dismissNewestDeleteUndoToast();
        dedupedToast.error(
          body.errorMessage
            ? `${translate("fileExplorer.undoFailed")}: ${body.errorMessage}`
            : translate("fileExplorer.undoFailed"),
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
