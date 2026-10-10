// use-node-rename.js
import { reactExports } from "../vendor.js";
import { useAssetMetadataApi } from "./agent-http-client.js";
import { useAssetMeta, useCanvasBridge } from "../media-editing/package.jsx";
import { useCanvasActions } from "../media-editing/use-canvas-actions.js";

export function useNodeRename(nodeId, isClone) {
  const { renameAsset: renameAsset2, forkAsset } = useCanvasBridge();
  const { promoteCloneToPrimary } = useCanvasActions();
  const assetMetadataStore = useAssetMetadataApi();
  const meta2 = useAssetMeta(nodeId);
  const needsFork = reactExports.useMemo(
    () => isClone === true && meta2?.type !== "text",
    [isClone, meta2?.type],
  );
  const handleRename = reactExports.useCallback(
    (newName) => {
      if (!meta2?.path) return;
      if (needsFork) {
        if (!forkAsset) return;
        forkAsset(meta2.path, newName)
          .then((forked) => {
            if (!forked) return;
            const state2 = assetMetadataStore.getState();
            const forkMeta = state2.get(forked.id);
            if (forkMeta) state2.set(nodeId, forkMeta);
            promoteCloneToPrimary(nodeId, {
              assetId: forked.id,
              name: forked.name,
              path: forked.path,
            });
          })
          .catch((err) => {
            console.error("[useNodeRename] forkAsset rejected:", err);
          });
        return;
      }
      if (!renameAsset2) return;
      renameAsset2(meta2.path, newName);
    },
    [
      renameAsset2,
      forkAsset,
      promoteCloneToPrimary,
      assetMetadataStore,
      meta2?.path,
      needsFork,
      nodeId,
    ],
  );
  const canRename = (needsFork ? !!forkAsset : !!renameAsset2) && !!meta2?.path;
  if (!canRename) return void 0;
  return handleRename;
}
