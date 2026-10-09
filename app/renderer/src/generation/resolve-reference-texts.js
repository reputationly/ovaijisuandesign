// resolve-reference-texts.js
import { getAssetMetaByNodeIdFromStore } from "../canvas/fullscreen-icon.jsx";
import { CanvasNodeType, reactExports, useReactFlow } from "../vendor.js";

export function getDisabledOptions(paramKey, currentParams, constraints2) {
  const disabled2 = new Set();
  if (!constraints2) return disabled2;
  for (const c3 of constraints2) {
    if (
      c3.disable.param === paramKey &&
      currentParams[c3.if.param] === c3.if.eq
    ) {
      for (const v2 of c3.disable.options) disabled2.add(v2);
    }
  }
  return disabled2;
}

export function resolveReferenceTexts(
  incomingSourceIds,
  referenceTextIds,
  assetMetadataStore,
  getNodeById,
) {
  const paths = [];
  const seen2 = new Set();
  const store = assetMetadataStore.getState();
  for (const sourceId of incomingSourceIds) {
    const sourceMeta = getAssetMetaByNodeIdFromStore(
      assetMetadataStore,
      sourceId,
    );
    if (
      sourceMeta?.path &&
      sourceMeta.type === "text" &&
      !seen2.has(sourceMeta.path)
    ) {
      seen2.add(sourceMeta.path);
      paths.push(sourceMeta.path);
      continue;
    }
    if (getNodeById) {
      const node2 = getNodeById(sourceId);
      if (!node2 || node2.type !== CanvasNodeType.Text) continue;
      const nodePath = node2.data.path;
      if (nodePath && !seen2.has(nodePath)) {
        seen2.add(nodePath);
        paths.push(nodePath);
      }
    }
  }
  if (referenceTextIds) {
    for (const refId of referenceTextIds) {
      if (!refId) continue;
      const refMeta = store.assets.get(refId);
      if (
        refMeta?.path &&
        refMeta.type === "text" &&
        !seen2.has(refMeta.path)
      ) {
        seen2.add(refMeta.path);
        paths.push(refMeta.path);
      }
    }
  }
  return paths;
}

export function usePopoverCloseWithDeselect(nodeId, setOpen) {
  const reactFlow = useReactFlow();
  return reactExports.useCallback(() => {
    setOpen(false);
    reactFlow.updateNode(nodeId, {
      selected: false,
    });
  }, [nodeId, setOpen, reactFlow]);
}

export function resolveReferenceAudios(
  incomingSourceIds,
  referenceAudioIds,
  assetMetadataStore,
) {
  const paths = [];
  const seen2 = new Set();
  for (const sourceId of incomingSourceIds) {
    const sourceMeta = getAssetMetaByNodeIdFromStore(
      assetMetadataStore,
      sourceId,
    );
    if (
      sourceMeta?.path &&
      sourceMeta.type === "audio" &&
      !seen2.has(sourceMeta.path)
    ) {
      seen2.add(sourceMeta.path);
      paths.push(sourceMeta.path);
    }
  }
  if (referenceAudioIds) {
    const store = assetMetadataStore.getState();
    for (const refId of referenceAudioIds) {
      if (!refId) continue;
      const refMeta = store.assets.get(refId);
      if (refMeta?.path && !seen2.has(refMeta.path)) {
        seen2.add(refMeta.path);
        paths.push(refMeta.path);
      }
    }
  }
  return paths;
}
