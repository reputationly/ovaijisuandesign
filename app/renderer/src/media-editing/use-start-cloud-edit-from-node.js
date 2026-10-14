// use-start-cloud-edit-from-node.js
import {
  getNodeFlowRect,
  useCanvasOverlayStore,
} from "../canvas/use-start-crop-from-node.js";
import reactExports from "react";
import { createStore } from "zustand/vanilla";
import { useStore } from "zustand";
import { useAssetMetadataStore } from "../infra/agent-http-client.js";
import { useCanvasActions } from "./use-canvas-actions.js";
import { buildImageNodeView } from "../canvas/build-slot-from-node.js";
import { useNodeIsEmpty } from "../infra/create-recently-added-store.js";
export function useEraseState() {
  const erasingNodeId = useCanvasOverlayStore((overlayState) =>
    overlayState.active?.kind === "erase" ? overlayState.active.nodeId : null,
  );
  const meta = useCanvasOverlayStore((overlayState) =>
    overlayState.active?.kind === "erase" ? overlayState.active.meta : null,
  );
  const startErase = useCanvasOverlayStore((overlayState) => overlayState.startErase);
  const cancelErase = useCanvasOverlayStore((overlayState) => overlayState.cancelErase);
  return {
    erasingNodeId,
    meta,
    startErase,
    cancelErase,
  };
}
function useStartCloudEditFromNode({
  id: nodeId,
  meta,
  nodeWidth,
  nodeHeight,
  reactFlow,
  startMode,
  submit,
}) {
  const handleConfirm = reactExports.useCallback(
    async (params) => {
      if (!submit || !meta?.path) return;
      await submit(nodeId, meta.path, params);
    },
    [nodeId, meta?.path, submit],
  );
  const handleStart = reactExports.useCallback(() => {
    if (!meta?.url || !meta.width || !meta.height) return;
    const rect = getNodeFlowRect(reactFlow, nodeId, nodeWidth, nodeHeight);
    if (!rect) return;
    reactFlow.setNodes((nodes) =>
      nodes.map((node) =>
        node.selected
          ? {
              ...node,
              selected: false,
            }
          : node,
      ),
    );
    startMode(nodeId, {
      src: meta.url,
      name: meta.name,
      originalWidth: meta.width,
      originalHeight: meta.height,
      nodeFlowX: rect.x,
      nodeFlowY: rect.y,
      nodeWidth: rect.width,
      nodeHeight: rect.height,
      onConfirm: handleConfirm,
    });
  }, [nodeId, meta, reactFlow, nodeWidth, nodeHeight, startMode, handleConfirm]);
  return {
    handleStart,
  };
}
export function useStartEraseFromNode({ submitErase, ...rest }) {
  const { startErase } = useEraseState();
  const { handleStart } = useStartCloudEditFromNode({
    ...rest,
    startMode: startErase,
    submit: submitErase,
  });
  return {
    handleErase: handleStart,
  };
}
export function useMoveObjectState() {
  const movingObjectNodeId = useCanvasOverlayStore((overlayState) =>
    overlayState.active?.kind === "move-object" ? overlayState.active.nodeId : null,
  );
  const meta = useCanvasOverlayStore((overlayState) =>
    overlayState.active?.kind === "move-object" ? overlayState.active.meta : null,
  );
  const startMoveObject = useCanvasOverlayStore((overlayState) => overlayState.startMoveObject);
  const cancelMoveObject = useCanvasOverlayStore((overlayState) => overlayState.cancelMoveObject);
  return {
    movingObjectNodeId,
    meta,
    startMoveObject,
    cancelMoveObject,
  };
}
export function useOutpaintState() {
  const outpaintingNodeId = useCanvasOverlayStore((overlayState) =>
    overlayState.active?.kind === "outpaint" ? overlayState.active.nodeId : null,
  );
  const meta = useCanvasOverlayStore((overlayState) =>
    overlayState.active?.kind === "outpaint" ? overlayState.active.meta : null,
  );
  const startOutpaint = useCanvasOverlayStore((overlayState) => overlayState.startOutpaint);
  const cancelOutpaint = useCanvasOverlayStore((overlayState) => overlayState.cancelOutpaint);
  return {
    outpaintingNodeId,
    meta,
    startOutpaint,
    cancelOutpaint,
  };
}
export function useStartOutpaintFromNode({ submitOutpaint, ...rest }) {
  const { startOutpaint } = useOutpaintState();
  const { handleStart } = useStartCloudEditFromNode({
    ...rest,
    startMode: startOutpaint,
    submit: submitOutpaint,
  });
  return {
    handleOutpaint: handleStart,
  };
}
export function useRedrawState() {
  const redrawingNodeId = useCanvasOverlayStore((overlayState) =>
    overlayState.active?.kind === "redraw" ? overlayState.active.nodeId : null,
  );
  const meta = useCanvasOverlayStore((overlayState) =>
    overlayState.active?.kind === "redraw" ? overlayState.active.meta : null,
  );
  const startRedraw = useCanvasOverlayStore((overlayState) => overlayState.startRedraw);
  const cancelRedraw = useCanvasOverlayStore((overlayState) => overlayState.cancelRedraw);
  return {
    redrawingNodeId,
    meta,
    startRedraw,
    cancelRedraw,
  };
}
export function useStartRedrawFromNode({ submitRedraw, ...rest }) {
  const { startRedraw } = useRedrawState();
  const { handleStart } = useStartCloudEditFromNode({
    ...rest,
    startMode: startRedraw,
    submit: submitRedraw,
  });
  return {
    handleRedraw: handleStart,
  };
}
export const LEGACY_IMAGE_TOOLBAR_TOOLS = [
  "erase",
  "redraw",
  "crop",
  "outpaint",
  "super-resolution",
  "remove-bg",
  "color-adjust",
  "rotate",
  "multi-angle",
  "storyboard-grid",
  "panorama-reference",
  "watermark",
  "relight",
  "layer-decompose",
];
export const IMAGE_TOOLBAR_TOOLS = [
  "crop",
  "super-resolution",
  "redraw",
  "panorama-reference",
  "multi-angle",
  "relight",
  "storyboard-grid",
  "watermark",
  "erase",
  "outpaint",
  "remove-bg",
  "color-adjust",
  "rotate",
  "layer-decompose",
];
export const DEFAULT_PINNED = [
  "crop",
  "super-resolution",
  "redraw",
  "panorama-reference",
  "multi-angle",
  "relight",
  "storyboard-grid",
];
export const DEFAULT_SHOW_LABELS = true;
export function useSubImages(mainId) {
  const { getSubImages, subscribeGraphChange } = useCanvasActions();
  const getSnapshot = reactExports.useCallback(
    () => getSubImages(mainId),
    [getSubImages, mainId],
  );
  return reactExports.useSyncExternalStore(
    subscribeGraphChange,
    getSnapshot,
    getSnapshot,
  );
}
export function useImageNodeView(nodeId, data) {
  const assetsMap = useAssetMetadataStore((assetMetadataState) => assetMetadataState.assets);
  const subImages = useSubImages(nodeId);
  const isUserEmpty = useNodeIsEmpty(nodeId);
  const { getNodeById, subscribeGraphChange } = useCanvasActions();
  const getRoundSnapshot = reactExports.useCallback(
    () => getNodeById(nodeId)?.round,
    [getNodeById, nodeId],
  );
  const mainRound = reactExports.useSyncExternalStore(
    subscribeGraphChange,
    getRoundSnapshot,
    getRoundSnapshot,
  );
  const getNodeAssetId = reactExports.useCallback(
    () => getNodeById(nodeId)?.assetId,
    [getNodeById, nodeId],
  );
  const nodeAssetId = reactExports.useSyncExternalStore(
    subscribeGraphChange,
    getNodeAssetId,
    getNodeAssetId,
  );
  return reactExports.useMemo(
    () =>
      buildImageNodeView(
        nodeId,
        data,
        subImages,
        (assetId) => assetsMap.get(assetId),
        isUserEmpty,
        mainRound,
        nodeAssetId,
      ),
    [nodeId, data, subImages, assetsMap, isUserEmpty, mainRound, nodeAssetId],
  );
}
export function createMultiImageOverlayStore() {
  return createStore((set) => ({
    openNodeId: null,
    open: (nodeId) =>
      set((state) => {
        if (state.openNodeId === nodeId) return state;
        return {
          openNodeId: nodeId,
        };
      }),
    close: (nodeId) =>
      set((state) => {
        if (state.openNodeId !== nodeId) return state;
        return {
          openNodeId: null,
        };
      }),
    closeAll: () =>
      set((state) => {
        if (state.openNodeId === null) return state;
        return {
          openNodeId: null,
        };
      }),
  }));
}
const defaultMultiImageOverlayStore = createMultiImageOverlayStore();
export const MultiImageOverlayStoreContext = reactExports.createContext(null);
export function useMultiImageOverlayApi() {
  return (
    reactExports.useContext(MultiImageOverlayStoreContext) ??
    defaultMultiImageOverlayStore
  );
}
export const useMultiImageOverlayStore = (selector) =>
  useStore(useMultiImageOverlayApi(), selector);
useMultiImageOverlayStore.getState = defaultMultiImageOverlayStore.getState;
useMultiImageOverlayStore.setState = defaultMultiImageOverlayStore.setState;
useMultiImageOverlayStore.subscribe = defaultMultiImageOverlayStore.subscribe;
export function useIsOverlayOpen(nodeId) {
  return useMultiImageOverlayStore((multiImageOverlayState) => multiImageOverlayState.openNodeId === nodeId);
}
