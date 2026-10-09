// use-start-cloud-edit-from-node.js
import {
  getNodeFlowRect,
  useCanvasOverlayStore,
} from "../canvas/use-start-crop-from-node.js";
import {
  createStore$1 as createStore,
  reactExports,
  useAssetMetadataStore,
  useStore$2 as useStore,
} from "../vendor.js";
import { useCanvasActions } from "./use-canvas-actions.js";
import { buildImageNodeView } from "../canvas/build-slot-from-node.js";
import { useNodeIsEmpty } from "../infra/create-recently-added-store.js";
export function useEraseState() {
  const erasingNodeId = useCanvasOverlayStore((s2) =>
    s2.active?.kind === "erase" ? s2.active.nodeId : null,
  );
  const meta2 = useCanvasOverlayStore((s2) =>
    s2.active?.kind === "erase" ? s2.active.meta : null,
  );
  const startErase = useCanvasOverlayStore((s2) => s2.startErase);
  const cancelErase = useCanvasOverlayStore((s2) => s2.cancelErase);
  return {
    erasingNodeId,
    meta: meta2,
    startErase,
    cancelErase,
  };
}
function useStartCloudEditFromNode({
  id: id2,
  meta: meta2,
  nodeWidth,
  nodeHeight,
  reactFlow,
  startMode,
  submit,
}) {
  const handleConfirm = reactExports.useCallback(
    async (params) => {
      if (!submit || !meta2?.path) return;
      await submit(id2, meta2.path, params);
    },
    [id2, meta2?.path, submit],
  );
  const handleStart = reactExports.useCallback(() => {
    if (!meta2?.url || !meta2.width || !meta2.height) return;
    const rect = getNodeFlowRect(reactFlow, id2, nodeWidth, nodeHeight);
    if (!rect) return;
    reactFlow.setNodes((nodes) =>
      nodes.map((n2) =>
        n2.selected
          ? {
              ...n2,
              selected: false,
            }
          : n2,
      ),
    );
    startMode(id2, {
      src: meta2.url,
      name: meta2.name,
      originalWidth: meta2.width,
      originalHeight: meta2.height,
      nodeFlowX: rect.x,
      nodeFlowY: rect.y,
      nodeWidth: rect.width,
      nodeHeight: rect.height,
      onConfirm: handleConfirm,
    });
  }, [id2, meta2, reactFlow, nodeWidth, nodeHeight, startMode, handleConfirm]);
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
  const movingObjectNodeId = useCanvasOverlayStore((s2) =>
    s2.active?.kind === "move-object" ? s2.active.nodeId : null,
  );
  const meta2 = useCanvasOverlayStore((s2) =>
    s2.active?.kind === "move-object" ? s2.active.meta : null,
  );
  const startMoveObject = useCanvasOverlayStore((s2) => s2.startMoveObject);
  const cancelMoveObject = useCanvasOverlayStore((s2) => s2.cancelMoveObject);
  return {
    movingObjectNodeId,
    meta: meta2,
    startMoveObject,
    cancelMoveObject,
  };
}
export function useOutpaintState() {
  const outpaintingNodeId = useCanvasOverlayStore((s2) =>
    s2.active?.kind === "outpaint" ? s2.active.nodeId : null,
  );
  const meta2 = useCanvasOverlayStore((s2) =>
    s2.active?.kind === "outpaint" ? s2.active.meta : null,
  );
  const startOutpaint = useCanvasOverlayStore((s2) => s2.startOutpaint);
  const cancelOutpaint = useCanvasOverlayStore((s2) => s2.cancelOutpaint);
  return {
    outpaintingNodeId,
    meta: meta2,
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
  const redrawingNodeId = useCanvasOverlayStore((s2) =>
    s2.active?.kind === "redraw" ? s2.active.nodeId : null,
  );
  const meta2 = useCanvasOverlayStore((s2) =>
    s2.active?.kind === "redraw" ? s2.active.meta : null,
  );
  const startRedraw = useCanvasOverlayStore((s2) => s2.startRedraw);
  const cancelRedraw = useCanvasOverlayStore((s2) => s2.cancelRedraw);
  return {
    redrawingNodeId,
    meta: meta2,
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
  const getSnapshot2 = reactExports.useCallback(
    () => getSubImages(mainId),
    [getSubImages, mainId],
  );
  return reactExports.useSyncExternalStore(
    subscribeGraphChange,
    getSnapshot2,
    getSnapshot2,
  );
}
export function useImageNodeView(nodeId, data2) {
  const assetsMap = useAssetMetadataStore((s2) => s2.assets);
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
        data2,
        subImages,
        (id2) => assetsMap.get(id2),
        isUserEmpty,
        mainRound,
        nodeAssetId,
      ),
    [nodeId, data2, subImages, assetsMap, isUserEmpty, mainRound, nodeAssetId],
  );
}
export function createMultiImageOverlayStore() {
  return createStore((set2) => ({
    openNodeId: null,
    open: (nodeId) =>
      set2((state2) => {
        if (state2.openNodeId === nodeId) return state2;
        return {
          openNodeId: nodeId,
        };
      }),
    close: (nodeId) =>
      set2((state2) => {
        if (state2.openNodeId !== nodeId) return state2;
        return {
          openNodeId: null,
        };
      }),
    closeAll: () =>
      set2((state2) => {
        if (state2.openNodeId === null) return state2;
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
export const useMultiImageOverlayStore = (selector2) =>
  useStore(useMultiImageOverlayApi(), selector2);
useMultiImageOverlayStore.getState = defaultMultiImageOverlayStore.getState;
useMultiImageOverlayStore.setState = defaultMultiImageOverlayStore.setState;
useMultiImageOverlayStore.subscribe = defaultMultiImageOverlayStore.subscribe;
export function useIsOverlayOpen(nodeId) {
  return useMultiImageOverlayStore((s2) => s2.openNodeId === nodeId);
}
