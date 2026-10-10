// use-file-explorer-missing-recovery.js
import { reactExports, useTranslation } from "../vendor.js";
import { dedupedToast } from "../infra/agent-http-client.js";
import { useStableCallback } from "./use-cloud-review-nodes.js";

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
        t2("missing.mergeFailed") +
          (err instanceof Error && err.message ? `: ${err.message}` : ""),
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
      console.warn(
        "[fileExplorer] missing assetMap entry for tree row",
        entry.path,
      );
      return;
    }
    void handleMergeCandidate(asset);
  });
  const handleTreeRemoveMissing = useStableCallback((entry) => {
    const asset = resolveEntryAsset(entry);
    if (!asset) {
      console.warn(
        "[fileExplorer] missing assetMap entry for tree row",
        entry.path,
      );
      return;
    }
    void handleRemoveMissing(asset);
  });
  const handleTreeLocateMissing = useStableCallback((entry) => {
    const asset = resolveEntryAsset(entry);
    if (!asset) {
      console.warn(
        "[fileExplorer] missing assetMap entry for tree row",
        entry.path,
      );
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
