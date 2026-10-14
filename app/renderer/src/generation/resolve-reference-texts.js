// resolve-reference-texts.js
import { getAssetMetaByNodeIdFromStore } from "../canvas/fullscreen-icon.jsx";
import { CanvasNodeType } from "../canvas/canvas-geometry.js";
import reactExports from "react";
import { useReactFlow } from "../vendor-fork/xyflow/react/index.js";

export function getDisabledOptions(paramKey, currentParams, constraints) {
  const disabled = new Set();
  if (!constraints) return disabled;
  for (const constraint of constraints) {
    if (
      constraint.disable.param === paramKey &&
      currentParams[constraint.if.param] === constraint.if.eq
    ) {
      for (const value of constraint.disable.options) disabled.add(value);
    }
  }
  return disabled;
}

export function resolveReferenceTexts(
  incomingSourceIds,
  referenceTextIds,
  assetMetadataStore,
  getNodeById,
) {
  const paths = [];
  const seen = new Set();
  const store = assetMetadataStore.getState();
  for (const sourceId of incomingSourceIds) {
    const sourceMeta = getAssetMetaByNodeIdFromStore(
      assetMetadataStore,
      sourceId,
    );
    if (
      sourceMeta?.path &&
      sourceMeta.type === "text" &&
      !seen.has(sourceMeta.path)
    ) {
      seen.add(sourceMeta.path);
      paths.push(sourceMeta.path);
      continue;
    }
    if (getNodeById) {
      const node = getNodeById(sourceId);
      if (!node || node.type !== CanvasNodeType.Text) continue;
      const nodePath = node.data.path;
      if (nodePath && !seen.has(nodePath)) {
        seen.add(nodePath);
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
        !seen.has(refMeta.path)
      ) {
        seen.add(refMeta.path);
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
  const seen = new Set();
  for (const sourceId of incomingSourceIds) {
    const sourceMeta = getAssetMetaByNodeIdFromStore(
      assetMetadataStore,
      sourceId,
    );
    if (
      sourceMeta?.path &&
      sourceMeta.type === "audio" &&
      !seen.has(sourceMeta.path)
    ) {
      seen.add(sourceMeta.path);
      paths.push(sourceMeta.path);
    }
  }
  if (referenceAudioIds) {
    const store = assetMetadataStore.getState();
    for (const refId of referenceAudioIds) {
      if (!refId) continue;
      const refMeta = store.assets.get(refId);
      if (refMeta?.path && !seen.has(refMeta.path)) {
        seen.add(refMeta.path);
        paths.push(refMeta.path);
      }
    }
  }
  return paths;
}
