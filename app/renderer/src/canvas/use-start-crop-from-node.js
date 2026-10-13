// use-start-crop-from-node.js
import { createCanvasOverlayStore } from "./create-canvas-overlay-store.js";
import { reactExports, useStore$2 as useStore } from "../vendor.js";
import { getDerivedNodePosition } from "../infra/create-recently-added-store.js";
export const GROUP_DERIVED_CHILD_COUNT_KEY = "__derivedChildCount";
export const GROUP_DERIVED_COLLAPSED_KEY = "__derivedCollapsed";
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
const defaultCanvasOverlayStore = createCanvasOverlayStore();
export const CanvasOverlayStoreContext = reactExports.createContext(null);
export function useCanvasOverlayApi() {
  return (
    reactExports.useContext(CanvasOverlayStoreContext) ??
    defaultCanvasOverlayStore
  );
}
export const useCanvasOverlayStore = (selector) =>
  useStore(useCanvasOverlayApi(), selector);
useCanvasOverlayStore.getState = defaultCanvasOverlayStore.getState;
useCanvasOverlayStore.setState = defaultCanvasOverlayStore.setState;
useCanvasOverlayStore.subscribe = defaultCanvasOverlayStore.subscribe;
export function useCropState() {
  const croppingNodeId = useCanvasOverlayStore((state) =>
    state.active?.kind === "crop" ? state.active.nodeId : null,
  );
  const meta = useCanvasOverlayStore((state) =>
    state.active?.kind === "crop" ? state.active.meta : null,
  );
  const startCrop = useCanvasOverlayStore((state) => state.startCrop);
  const cancelCrop = useCanvasOverlayStore((state) => state.cancelCrop);
  return {
    croppingNodeId,
    meta,
    startCrop,
    cancelCrop,
  };
}
export function useEmitDerivedFromBlob({
  id,
  meta,
  nodeWidth,
  reactFlow,
  cropImage,
}) {
  return reactExports.useCallback(
    async (blob, { suffix, ext, baseFallback = "image" }) => {
      if (!cropImage) return;
      const baseName = meta?.name?.replace(/\.[^.]+$/, "") ?? baseFallback;
      const position = getDerivedNodePosition(
        reactFlow,
        id,
        reactFlow.getEdges(),
        nodeWidth,
      );
      const uuid = crypto.randomUUID().slice(0, 4);
      const tail = suffix ? `${suffix}-${uuid}` : uuid;
      return cropImage(id, blob, `${baseName}-${tail}.${ext}`, position);
    },
    [id, meta?.name, cropImage, reactFlow, nodeWidth],
  );
}
export function getNodeFlowRect(reactFlow, id, fallbackWidth, fallbackHeight) {
  const node = reactFlow.getInternalNode(id);
  if (!node) return null;
  const width = node.measured?.width ?? fallbackWidth;
  const height = node.measured?.height ?? fallbackHeight ?? fallbackWidth;
  return {
    x: node.internals.positionAbsolute.x,
    y: node.internals.positionAbsolute.y,
    width,
    height,
  };
}
function derivePanelDimensions(rect, meta) {
  if (meta.width > 0 && meta.height > 0 && rect.width > 0) {
    return {
      width: rect.width,
      height: rect.width * (meta.height / meta.width),
    };
  }
  return {
    width: rect.width,
    height: rect.height,
  };
}
export function useStartCropFromNode({
  id,
  meta,
  nodeWidth,
  nodeHeight,
  reactFlow,
  cropImage,
}) {
  const { startCrop } = useCropState();
  const emitDerived = useEmitDerivedFromBlob({
    id,
    meta,
    nodeWidth,
    reactFlow,
    cropImage,
  });
  const handleCropConfirm = reactExports.useCallback(
    async (blob) => {
      const ext = meta?.name?.split(".").pop() ?? "png";
      await emitDerived(blob, {
        suffix: "",
        ext,
        baseFallback: "cropped",
      });
    },
    [meta?.name, emitDerived],
  );
  const handleCrop = reactExports.useCallback(() => {
    if (!meta?.url) return;
    const rect = getNodeFlowRect(reactFlow, id, nodeWidth, nodeHeight);
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
    const panel = derivePanelDimensions(rect, {
      width: meta.width ?? 0,
      height: meta.height ?? 0,
    });
    startCrop(id, {
      src: meta.url,
      originalWidth: meta.width || 0,
      originalHeight: meta.height || 0,
      nodeFlowX: rect.x,
      nodeFlowY: rect.y,
      nodeWidth: panel.width,
      nodeHeight: panel.height,
      onConfirm: handleCropConfirm,
    });
  }, [
    id,
    meta,
    reactFlow,
    nodeWidth,
    nodeHeight,
    startCrop,
    handleCropConfirm,
  ]);
  return {
    handleCrop,
  };
}
