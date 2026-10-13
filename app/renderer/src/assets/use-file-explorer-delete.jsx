// use-file-explorer-delete.jsx
import { reactExports, useTranslation } from "../vendor.js";
import { dedupedToast } from "../infra/agent-http-client.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { Button } from "../infra/dialog-content.jsx";
import {
  DELETE_UNDO_TTL_MS,
  OPERATIONS_UNDO_PATH,
} from "../generation/to-workspace-browser-url.js";
import { activeToastIds } from "./post-check-conflicts.js";
import { refreshAssetIndex } from "./gateway-scope-provider.jsx";
import { useStableCallback } from "./use-cloud-review-nodes.js";
function DeleteUndoToast({
  toastId,
  count: count2,
  gatewayFetch: gatewayFetch2,
  onUndoSuccess,
  t: translate,
}) {
  const [remaining, setRemaining] = reactExports.useState(
    Math.ceil(DELETE_UNDO_TTL_MS / 1e3),
  );
  const [busy, setBusy] = reactExports.useState(false);
  reactExports.useEffect(() => {
    const tick = setInterval(() => {
      setRemaining((remainingSeconds) => (remainingSeconds > 0 ? remainingSeconds - 1 : 0));
    }, 1e3);
    return () => clearInterval(tick);
  }, []);
  const handleUndoClick = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await gatewayFetch2(OPERATIONS_UNDO_PATH, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const body2 = await res.json().catch(() => null);
      if (res.ok && body2?.ok) {
        onUndoSuccess?.();
        dedupedToast.dismiss(toastId);
        return;
      }
      if (body2?.errorType === "partial") {
        onUndoSuccess?.();
        dedupedToast.dismiss(toastId);
        return;
      }
      if (body2?.errorType === "expired") {
        dedupedToast.dismiss(toastId);
        return;
      }
      dedupedToast.error(translate("fileExplorer.undoFailed"));
      dedupedToast.dismiss(toastId);
    } catch (err) {
      dedupedToast.error(
        err instanceof Error && err.message
          ? `${translate("fileExplorer.undoFailed")}: ${err.message}`
          : translate("fileExplorer.undoFailed"),
      );
      dedupedToast.dismiss(toastId);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="elevated-surface-border flex items-center gap-3 rounded-lg px-3 py-2 bg-popover text-popover-foreground text-xs">
      <span>
        {translate("fileExplorer.deleteUndoToast", {
          count: count2,
        })}
      </span>
      <span className="text-muted-foreground">·</span>
      <Button
        variant="ghost"
        size="xs"
        onClick={handleUndoClick}
        disabled={busy}
        className="h-6 rounded-sm px-2"
      >
        {translate("fileExplorer.deleteUndoToastUndo")}
        {" ("}
        {remaining})
      </Button>
    </div>
  );
}
function removeFromActiveToasts(toastId) {
  const idx = activeToastIds.indexOf(toastId);
  if (idx !== -1) activeToastIds.splice(idx, 1);
}
function showDeleteUndoToast(opts) {
  const toastId = dedupedToast.custom(
    (id22) => (
      <DeleteUndoToast
        toastId={id22}
        count={opts.count}
        gatewayFetch={opts.gatewayFetch}
        onUndoSuccess={opts.onUndoSuccess}
        t={opts.t}
      />
    ),
    {
      duration: DELETE_UNDO_TTL_MS,
      // Track toast lifecycle so dismissNewestDeleteUndoToast() stays
      // in sync without needing to listen for click / duration events.
      // Plain sonner doesn't expose an unmount hook for custom toasts,
      // so onDismiss + onAutoClose cover the two paths sonner uses to
      // retire a toast.
      onDismiss: (toast) => removeFromActiveToasts(toast.id),
      onAutoClose: (toast) => removeFromActiveToasts(toast.id),
    },
  );
  activeToastIds.push(toastId);
  return toastId;
}
export function useFileExplorerDelete({
  remove: remove2,
  toRelativePath,
  invalidateDirs,
  lastSelectedPath,
  setLastSelectedPath,
  selectionAnchorRef,
  selectedPaths,
  setSelectedPaths,
  gatewayFetch: gatewayFetch2,
  queryClient: queryClient2,
  gatewayScopeKey,
}) {
  const { t: translate } = useTranslation();
  const [deletingEntries, setDeletingEntries] = reactExports.useState([]);
  const requestDelete = useStableCallback((entries2) => {
    if (entries2.length === 0) return;
    const seen2 = new Set();
    const unique2 = [];
    for (const entry of entries2) {
      if (seen2.has(entry.path)) continue;
      seen2.add(entry.path);
      unique2.push(entry);
    }
    setDeletingEntries(unique2);
  });
  const cancelDelete = useStableCallback(() => {
    setDeletingEntries([]);
  });
  const handleDeleteConfirm = useStableCallback(async () => {
    if (deletingEntries.length === 0) return;
    const entries2 = deletingEntries;
    const deletedPaths = entries2.map((entry) => entry.path);
    const fileCount = entries2.filter((entry) => !entry.isDirectory).length;
    const hasDirectory = entries2.some((entry) => entry.isDirectory);
    try {
      const relativePaths = deletedPaths.map(toRelativePath);
      await remove2({
        paths: relativePaths,
      });
      if (!hasDirectory && fileCount > 0 && gatewayFetch2) {
        showDeleteUndoToast({
          count: fileCount,
          gatewayFetch: gatewayFetch2,
          onUndoSuccess:
            queryClient2 && gatewayScopeKey
              ? () => {
                  void refreshAssetIndex({
                    qc: queryClient2,
                    gatewayScopeKey,
                  });
                }
              : void 0,
          t: translate,
        });
      }
      if (lastSelectedPath && deletedPaths.includes(lastSelectedPath)) {
        setLastSelectedPath(null);
        selectionAnchorRef.current = null;
      }
      const stillSelected = new Set();
      let anyRemoved = false;
      for (const selectedPath of selectedPaths) {
        if (deletedPaths.includes(selectedPath)) {
          anyRemoved = true;
          continue;
        }
        stillSelected.add(selectedPath);
      }
      if (anyRemoved) setSelectedPaths(stillSelected);
      if (hasDirectory) {
        invalidateDirs();
      }
    } catch (err) {
      dedupedToast.error(
        translate("fileExplorer.deleteFailed") +
          (err instanceof Error && err.message ? `: ${err.message}` : ""),
      );
    }
    setDeletingEntries([]);
  });
  return {
    deletingEntries,
    requestDelete,
    cancelDelete,
    handleDeleteConfirm,
  };
}
