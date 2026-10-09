// use-start-crop-from-node.js
import { createCanvasOverlayStore } from "./create-canvas-overlay-store.js";
import { reactExports, useStore$2 } from "../vendor.js";
import { getDerivedNodePosition } from "../infra/create-recently-added-store.js";

export const GROUP_DERIVED_CHILD_COUNT_KEY = "__derivedChildCount";

export const GROUP_DERIVED_COLLAPSED_KEY = "__derivedCollapsed";

export function clamp$6(v2, min2, max2) {
  return Math.min(Math.max(v2, min2), max2);
}

const defaultCanvasOverlayStore = createCanvasOverlayStore();

export const CanvasOverlayStoreContext = reactExports.createContext(null);

export function useCanvasOverlayApi() {
  return (
    reactExports.useContext(CanvasOverlayStoreContext) ??
    defaultCanvasOverlayStore
  );
}

export const useCanvasOverlayStore = (selector2) =>
  useStore$2(useCanvasOverlayApi(), selector2);

useCanvasOverlayStore.getState = defaultCanvasOverlayStore.getState;

useCanvasOverlayStore.setState = defaultCanvasOverlayStore.setState;

useCanvasOverlayStore.subscribe = defaultCanvasOverlayStore.subscribe;

export function useCropState() {
  const croppingNodeId = useCanvasOverlayStore((s2) =>
    s2.active?.kind === "crop" ? s2.active.nodeId : null,
  );
  const meta2 = useCanvasOverlayStore((s2) =>
    s2.active?.kind === "crop" ? s2.active.meta : null,
  );
  const startCrop = useCanvasOverlayStore((s2) => s2.startCrop);
  const cancelCrop = useCanvasOverlayStore((s2) => s2.cancelCrop);
  return {
    croppingNodeId,
    meta: meta2,
    startCrop,
    cancelCrop,
  };
}

export function useEmitDerivedFromBlob({
  id: id2,
  meta: meta2,
  nodeWidth,
  reactFlow,
  cropImage,
}) {
  return reactExports.useCallback(
    async (blob, { suffix, ext, baseFallback = "image" }) => {
      if (!cropImage) return;
      const baseName = meta2?.name?.replace(/\.[^.]+$/, "") ?? baseFallback;
      const position2 = getDerivedNodePosition(
        reactFlow,
        id2,
        reactFlow.getEdges(),
        nodeWidth,
      );
      const uuid = crypto.randomUUID().slice(0, 4);
      const tail = suffix ? `${suffix}-${uuid}` : uuid;
      return cropImage(id2, blob, `${baseName}-${tail}.${ext}`, position2);
    },
    [id2, meta2?.name, cropImage, reactFlow, nodeWidth],
  );
}

export function getNodeFlowRect(reactFlow, id2, fallbackWidth, fallbackHeight) {
  const node2 = reactFlow.getInternalNode(id2);
  if (!node2) return null;
  const width = node2.measured?.width ?? fallbackWidth;
  const height = node2.measured?.height ?? fallbackHeight ?? fallbackWidth;
  return {
    x: node2.internals.positionAbsolute.x,
    y: node2.internals.positionAbsolute.y,
    width,
    height,
  };
}

function derivePanelDimensions(rect, meta2) {
  if (meta2.width > 0 && meta2.height > 0 && rect.width > 0) {
    return {
      width: rect.width,
      height: rect.width * (meta2.height / meta2.width),
    };
  }
  return {
    width: rect.width,
    height: rect.height,
  };
}

export function useStartCropFromNode({
  id: id2,
  meta: meta2,
  nodeWidth,
  nodeHeight,
  reactFlow,
  cropImage,
}) {
  const { startCrop } = useCropState();
  const emitDerived = useEmitDerivedFromBlob({
    id: id2,
    meta: meta2,
    nodeWidth,
    reactFlow,
    cropImage,
  });
  const handleCropConfirm = reactExports.useCallback(
    async (blob) => {
      const ext = meta2?.name?.split(".").pop() ?? "png";
      await emitDerived(blob, {
        suffix: "",
        ext,
        baseFallback: "cropped",
      });
    },
    [meta2?.name, emitDerived],
  );
  const handleCrop = reactExports.useCallback(() => {
    if (!meta2?.url) return;
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
    const panel = derivePanelDimensions(rect, {
      width: meta2.width ?? 0,
      height: meta2.height ?? 0,
    });
    startCrop(id2, {
      src: meta2.url,
      originalWidth: meta2.width || 0,
      originalHeight: meta2.height || 0,
      nodeFlowX: rect.x,
      nodeFlowY: rect.y,
      nodeWidth: panel.width,
      nodeHeight: panel.height,
      onConfirm: handleCropConfirm,
    });
  }, [
    id2,
    meta2,
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
