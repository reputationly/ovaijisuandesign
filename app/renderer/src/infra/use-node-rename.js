// use-node-rename.js
import reactExports from "react";
import { useAssetMetadataApi } from "./agent-http-client.js";
import { useAssetMeta, useCanvasBridge } from "../media-editing/package.jsx";
import { useCanvasActions } from "../media-editing/use-canvas-actions.js";

export function useNodeRename(nodeId, isClone) {
  const { renameAsset, forkAsset } = useCanvasBridge();
  const { promoteCloneToPrimary } = useCanvasActions();
  const assetMetadataStore = useAssetMetadataApi();
  const meta = useAssetMeta(nodeId);
  const needsFork = reactExports.useMemo(
    () => isClone === true && meta?.type !== "text",
    [isClone, meta?.type],
  );
  const handleRename = reactExports.useCallback(
    (newName) => {
      if (!meta?.path) return;
      if (needsFork) {
        if (!forkAsset) return;
        forkAsset(meta.path, newName)
          .then((forked) => {
            if (!forked) return;
            const state = assetMetadataStore.getState();
            const forkMeta = state.get(forked.id);
            if (forkMeta) state.set(nodeId, forkMeta);
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
      if (!renameAsset) return;
      renameAsset(meta.path, newName);
    },
    [
      renameAsset,
      forkAsset,
      promoteCloneToPrimary,
      assetMetadataStore,
      meta?.path,
      needsFork,
      nodeId,
    ],
  );
  const canRename = (needsFork ? !!forkAsset : !!renameAsset) && !!meta?.path;
  if (!canRename) return void 0;
  return handleRename;
}
