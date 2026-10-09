// use-multi-image-actions.js
import {
  reactExports,
  useAssetMetadataStore,
  createStore$1,
  useStore$2,
  create$2,
  useAssetMetadataApi,
} from "../vendor.js";
import { useNodeIsEmpty } from "../infra/create-recently-added-store.jsx";
import { isGenerationErrorStatus } from "../canvas/group-nodes-in-canvas.js";
import { useCanvasActions, useCanvasBridge } from "./parse-item.jsx";
import {
  DEFAULT_PLACEMENT_GAP,
  EMPTY_IMAGE_NODE_VIEW,
  buildImageGroupView,
} from "../canvas/reconcile-group-geometry-for-mode.js";
import { findFreePositionFromAnchor, parseNodeId } from "../canvas/resolve-derived-collision.js";
import { getNodeFlowRect, useCanvasOverlayStore } from "../canvas/use-file-bytes.js";
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
const STORAGE_KEY$9 = "hilo:canvas:image-toolbar:customization";
export const DEFAULT_PINNED$1 = [
  "crop",
  "super-resolution",
  "redraw",
  "panorama-reference",
  "multi-angle",
  "relight",
  "storyboard-grid",
];
const PRE_RELIGHT_WORKFLOW_DEFAULT_PINNED = [
  "crop",
  "super-resolution",
  "redraw",
  "watermark",
  "multi-angle",
  "storyboard-grid",
  "panorama-reference",
];
const PRE_WATERMARK_DEFAULT_PINNED$1 = [
  "crop",
  "super-resolution",
  "redraw",
  "multi-angle",
  "storyboard-grid",
  "panorama-reference",
];
const PRE_PANORAMA_DEFAULT_PINNED = [
  "crop",
  "super-resolution",
  "redraw",
  "multi-angle",
  "storyboard-grid",
];
const MAIN_PRE_PANORAMA_DEFAULT_PINNED = ["crop", "super-resolution", "redraw", "multi-angle"];
const MAIN_PANORAMA_DEFAULT_PINNED = [...MAIN_PRE_PANORAMA_DEFAULT_PINNED, "panorama-reference"];
export const DEFAULT_SHOW_LABELS$1 = true;
const LATEST_LAYOUT_VERSION = 2;
const LEGACY_LAYOUT_VERSION = 1;
function isImageToolbarToolId(v2) {
  return LEGACY_IMAGE_TOOLBAR_TOOLS.includes(v2) || IMAGE_TOOLBAR_TOOLS.includes(v2);
}
function readPersisted$3() {
  if (typeof window === "undefined") {
    return {
      pinned: DEFAULT_PINNED$1,
      showLabels: DEFAULT_SHOW_LABELS$1,
      layoutVersion: LATEST_LAYOUT_VERSION,
    };
  }
  try {
    const raw2 = window.localStorage.getItem(STORAGE_KEY$9);
    if (!raw2) {
      return {
        pinned: DEFAULT_PINNED$1,
        showLabels: DEFAULT_SHOW_LABELS$1,
        layoutVersion: LATEST_LAYOUT_VERSION,
      };
    }
    const parsed = JSON.parse(raw2);
    if (!parsed || typeof parsed !== "object") {
      return {
        pinned: DEFAULT_PINNED$1,
        showLabels: DEFAULT_SHOW_LABELS$1,
        layoutVersion: LATEST_LAYOUT_VERSION,
      };
    }
    const p3 = parsed;
    const parsedPinned = Array.isArray(p3.pinned)
      ? p3.pinned.filter(isImageToolbarToolId)
      : DEFAULT_PINNED$1;
    const isKnownPreviousFactoryLayout =
      p3.layoutVersion === LATEST_LAYOUT_VERSION &&
      [
        PRE_RELIGHT_WORKFLOW_DEFAULT_PINNED,
        PRE_WATERMARK_DEFAULT_PINNED$1,
        PRE_PANORAMA_DEFAULT_PINNED,
        MAIN_PRE_PANORAMA_DEFAULT_PINNED,
        MAIN_PANORAMA_DEFAULT_PINNED,
      ].some(
        (factoryPinned) =>
          parsedPinned.length === factoryPinned.length &&
          parsedPinned.every((id2, index2) => id2 === factoryPinned[index2]),
      );
    const pinned = isKnownPreviousFactoryLayout ? DEFAULT_PINNED$1 : parsedPinned;
    const showLabels = typeof p3.showLabels === "boolean" ? p3.showLabels : DEFAULT_SHOW_LABELS$1;
    const layoutVersion =
      p3.layoutVersion === LATEST_LAYOUT_VERSION ? LATEST_LAYOUT_VERSION : LEGACY_LAYOUT_VERSION;
    return {
      pinned,
      showLabels,
      layoutVersion,
    };
  } catch {
    return {
      pinned: DEFAULT_PINNED$1,
      showLabels: DEFAULT_SHOW_LABELS$1,
      layoutVersion: LATEST_LAYOUT_VERSION,
    };
  }
}
function persist$1(state2) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY$9, JSON.stringify(state2));
  } catch {}
}
export const useImageToolbarCustomizationStore = create$2((set2) => ({
  ...readPersisted$3(),
  setCustomization(next2) {
    const pinned = next2.pinned.filter(isImageToolbarToolId);
    const isDefault =
      pinned.length === DEFAULT_PINNED$1.length &&
      pinned.every((id2, index2) => id2 === DEFAULT_PINNED$1[index2]) &&
      !!next2.showLabels === DEFAULT_SHOW_LABELS$1;
    const state2 = {
      pinned,
      showLabels: !!next2.showLabels,
      layoutVersion: isDefault
        ? LATEST_LAYOUT_VERSION
        : useImageToolbarCustomizationStore.getState().layoutVersion,
    };
    set2(state2);
    persist$1(state2);
  },
  resetToDefaults() {
    const state2 = {
      pinned: [...DEFAULT_PINNED$1],
      showLabels: DEFAULT_SHOW_LABELS$1,
      layoutVersion: LATEST_LAYOUT_VERSION,
    };
    set2(state2);
    persist$1(state2);
  },
}));
export function useSubImages(mainId) {
  const { getSubImages, subscribeGraphChange } = useCanvasActions();
  const getSnapshot2 = reactExports.useCallback(() => getSubImages(mainId), [getSubImages, mainId]);
  return reactExports.useSyncExternalStore(subscribeGraphChange, getSnapshot2, getSnapshot2);
}
function toSlotMeta(meta2) {
  if (!meta2) return void 0;
  return {
    url: meta2.url,
    name: meta2.name,
    width: meta2.width,
    height: meta2.height,
    fileSize: meta2.fileSize,
    prompt: meta2.prompt,
    model: meta2.model,
    modelId: meta2.model_id,
    backend: meta2.backend,
    params: meta2.params,
  };
}
export function buildImageNodeView(
  nodeId,
  data2,
  subImages,
  metaById,
  isUserEmpty,
  mainRound,
  nodeAssetId,
) {
  const resolve = typeof metaById === "function" ? metaById : (id2) => metaById.get(id2);
  const resolveSlotMeta = (assetId) => toSlotMeta(resolve(assetId));
  const d2 = data2 ?? {};
  const { assetId: parsedAssetId } = parseNodeId(nodeId);
  const explicitAssetId =
    typeof d2.assetId === "string" && d2.assetId.length > 0
      ? d2.assetId
      : typeof nodeAssetId === "string" && nodeAssetId.length > 0
        ? nodeAssetId
        : void 0;
  const mainAssetId = explicitAssetId ?? parsedAssetId;
  const mainMeta = resolve(mainAssetId);
  if (
    isUserEmpty &&
    (!explicitAssetId || !mainMeta?.url) &&
    subImages.length === 0 &&
    d2.status !== "loading" &&
    !isGenerationErrorStatus(d2.status)
  ) {
    return {
      ...EMPTY_IMAGE_NODE_VIEW,
      isUserEmpty: true,
    };
  }
  const fallbackRound =
    mainRound ??
    subImages.reduce((max2, sub) => {
      const r2 = sub.round;
      return typeof r2 === "number" && r2 > max2 ? r2 : max2;
    }, 0);
  const mainNode = {
    id: nodeId,
    type: "image",
    assetId: mainAssetId,
    data: d2,
    ...(fallbackRound > 0
      ? {
          round: fallbackRound,
        }
      : {}),
  };
  const subFileNodes = subImages;
  const view2 = buildImageGroupView(mainNode, subFileNodes, resolveSlotMeta, {
    isUserEmpty,
  });
  if (
    !view2.primary?.url &&
    !view2.primary?.pendingMeta &&
    view2.status === "ready" &&
    subImages.length === 0
  ) {
    const aliasMeta = resolve(nodeId);
    if (aliasMeta?.url) {
      const slot = {
        id: parsedAssetId,
        status: "ready",
        url: aliasMeta.url,
        name: aliasMeta.name,
        width: aliasMeta.width,
        height: aliasMeta.height,
        fileSize: aliasMeta.fileSize,
        prompt: aliasMeta.prompt,
        model: aliasMeta.model,
        backend: aliasMeta.backend,
        params: aliasMeta.params,
      };
      return {
        slots: [slot],
        primaryIndex: 0,
        primary: slot,
        isMulti: false,
        hasLoading: false,
        hasError: false,
        status: "ready",
        isUserEmpty: false,
        rounds: [[slot]],
        activeRoundIndex: 0,
      };
    }
  }
  return view2;
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
  return createStore$1((set2) => ({
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
  return reactExports.useContext(MultiImageOverlayStoreContext) ?? defaultMultiImageOverlayStore;
}
export const useMultiImageOverlayStore = (selector2) =>
  useStore$2(useMultiImageOverlayApi(), selector2);
useMultiImageOverlayStore.getState = defaultMultiImageOverlayStore.getState;
useMultiImageOverlayStore.setState = defaultMultiImageOverlayStore.setState;
useMultiImageOverlayStore.subscribe = defaultMultiImageOverlayStore.subscribe;
export function useIsOverlayOpen(nodeId) {
  return useMultiImageOverlayStore((s2) => s2.openNodeId === nodeId);
}
function executeSubMediaDownload(target, actions) {
  if (target.path && actions.onSaveAs) {
    actions.onSaveAs(target.path, target.fileName);
    return true;
  }
  if (target.url && actions.onSaveUrlAs) {
    actions.onSaveUrlAs(target.url, target.fileName);
    return true;
  }
  return false;
}
export function useMultiImageActions({
  id: id2,
  view: view2,
  subImages,
  reactFlow,
  nodeWidth,
  nodeHeight,
}) {
  const {
    promoteSubImageToMain,
    detachSubImage,
    detachSubImages,
    removeNode,
    clearSelection,
    openNodeContextMenu,
  } = useCanvasActions();
  const { onSaveAs, onSaveUrlAs } = useCanvasBridge();
  const assetMetadataStore = useAssetMetadataApi();
  const overlayStore = useMultiImageOverlayApi();
  const isOverlayOpen = useIsOverlayOpen(id2);
  const handleToggleOverlay = reactExports.useCallback(
    (e2) => {
      e2.stopPropagation();
      const { open, close: close2 } = overlayStore.getState();
      if (isOverlayOpen) close2(id2);
      else open(id2);
    },
    [overlayStore, isOverlayOpen, id2],
  );
  const findSubNodeBySlot = reactExports.useCallback(
    (slot) => {
      if (!slot) return void 0;
      return subImages.find((sub) => {
        const subData = sub.data ?? {};
        const topLevelAssetId = sub.assetId;
        const subAssetId =
          typeof subData.assetId === "string" && subData.assetId.length > 0
            ? subData.assetId
            : typeof topLevelAssetId === "string" && topLevelAssetId.length > 0
              ? topLevelAssetId
              : void 0;
        return sub.id === slot.id || subAssetId === slot.id;
      });
    },
    [subImages],
  );
  const findSubNodeBySlotIndex = reactExports.useCallback(
    (originalIndex) => {
      if (originalIndex < 0) return void 0;
      return findSubNodeBySlot(view2.slots[originalIndex]);
    },
    [findSubNodeBySlot, view2.slots],
  );
  const handleSubContextMenu = reactExports.useCallback(
    (originalIndex, e2) => {
      if (originalIndex <= 0) return;
      const sub = findSubNodeBySlotIndex(originalIndex);
      if (!sub) return;
      openNodeContextMenu(e2, sub.id);
    },
    [findSubNodeBySlotIndex, openNodeContextMenu],
  );
  const handleDownloadSub = reactExports.useCallback(
    (originalIndex) => {
      if (originalIndex <= 0) return;
      const slot = view2.slots[originalIndex];
      if (!slot) return;
      const sub = findSubNodeBySlotIndex(originalIndex);
      if (!sub) return;
      const subData = sub.data ?? {};
      const topLevelAssetId = sub.assetId;
      const assetId =
        typeof subData.assetId === "string" && subData.assetId.length > 0
          ? subData.assetId
          : typeof topLevelAssetId === "string" && topLevelAssetId.length > 0
            ? topLevelAssetId
            : void 0;
      const meta2 =
        (assetId ? assetMetadataStore.getState().get(assetId) : void 0) ??
        assetMetadataStore.getState().get(sub.id);
      executeSubMediaDownload(
        {
          path: meta2?.path,
          url: slot.url,
          fileName: meta2?.name ?? slot.name,
        },
        {
          onSaveAs,
          onSaveUrlAs,
        },
      );
    },
    [view2.slots, findSubNodeBySlotIndex, onSaveAs, onSaveUrlAs, assetMetadataStore],
  );
  const handleSetPrimarySlot = reactExports.useCallback(
    (slot) => {
      if (slot.id === view2.primary?.id) return;
      const sub = findSubNodeBySlot(slot);
      if (!sub) return;
      promoteSubImageToMain(sub.id);
      overlayStore.getState().close(id2);
    },
    [view2.primary?.id, findSubNodeBySlot, promoteSubImageToMain, id2, overlayStore],
  );
  const handleSetPrimary = reactExports.useCallback(
    (originalIndex) => {
      if (originalIndex <= 0) return;
      const slot = view2.slots[originalIndex];
      if (!slot) return;
      handleSetPrimarySlot(slot);
    },
    [view2.slots, handleSetPrimarySlot],
  );
  const handleSelectRound = reactExports.useCallback(
    (roundIdx) => {
      if (roundIdx === view2.activeRoundIndex) return;
      const targetSlot = view2.rounds[roundIdx]?.[0];
      if (!targetSlot) return;
      const targetSub = subImages.find((sub) => {
        const subAssetId = sub.assetId ?? sub.data?.assetId;
        return sub.id === targetSlot.id || subAssetId === targetSlot.id;
      });
      if (!targetSub) return;
      clearSelection();
      promoteSubImageToMain(targetSub.id);
      if ((view2.rounds[roundIdx]?.length ?? 0) > 1) {
        overlayStore.getState().open(targetSub.id);
      }
    },
    [
      view2.activeRoundIndex,
      view2.rounds,
      subImages,
      clearSelection,
      promoteSubImageToMain,
      overlayStore,
    ],
  );
  const handleDeleteSub = reactExports.useCallback(
    (originalIndex) => {
      if (originalIndex <= 0) return;
      const sub = findSubNodeBySlotIndex(originalIndex);
      if (!sub) return;
      removeNode(sub.id);
    },
    [findSubNodeBySlotIndex, removeNode],
  );
  const placeSub = reactExports.useCallback(
    (occupied) => {
      const mainInternal = reactFlow.getInternalNode(id2);
      const mainNode = mainInternal ?? reactFlow.getNode(id2);
      const anchorAbs = mainInternal?.internals.positionAbsolute ??
        mainNode?.position ?? {
          x: 0,
          y: 0,
        };
      const w3 = mainNode?.measured?.width ?? nodeWidth;
      const h2 = mainNode?.measured?.height ?? nodeHeight ?? w3;
      const anchor = {
        x: anchorAbs.x + w3 + DEFAULT_PLACEMENT_GAP,
        y: anchorAbs.y,
      };
      const { x: x2, y: y4 } = findFreePositionFromAnchor(
        anchor,
        {
          width: w3,
          height: h2,
        },
        occupied,
      );
      return {
        x: x2,
        y: y4,
        w: w3,
        h: h2,
      };
    },
    [reactFlow, id2, nodeWidth, nodeHeight],
  );
  const handleSplitSlot = reactExports.useCallback(
    (slot) => {
      const targetNodeId = slot.id === view2.primary?.id ? id2 : findSubNodeBySlot(slot)?.id;
      if (!targetNodeId) return;
      const { x: x2, y: y4 } = placeSub([]);
      detachSubImage(targetNodeId, {
        x: x2,
        y: y4,
      });
      clearSelection();
      overlayStore.getState().close(id2);
    },
    [
      view2.primary?.id,
      id2,
      findSubNodeBySlot,
      placeSub,
      detachSubImage,
      clearSelection,
      overlayStore,
    ],
  );
  const handleSplitSub = reactExports.useCallback(
    (originalIndex) => {
      if (originalIndex <= 0) return;
      const slot = view2.slots[originalIndex];
      if (!slot) return;
      handleSplitSlot(slot);
    },
    [view2.slots, handleSplitSlot],
  );
  const handleSplitAll = reactExports.useCallback(() => {
    const ids2 = [id2];
    for (let i2 = 1; i2 < view2.slots.length; i2 += 1) {
      const sub = findSubNodeBySlotIndex(i2);
      if (sub) ids2.push(sub.id);
    }
    const occupied = [];
    const entries2 = [];
    for (const nid of ids2) {
      const rect = placeSub(occupied);
      occupied.push(rect);
      entries2.push({
        subId: nid,
        position: {
          x: rect.x,
          y: rect.y,
        },
      });
    }
    detachSubImages(entries2);
    clearSelection();
    overlayStore.getState().close(id2);
  }, [
    id2,
    view2.slots,
    findSubNodeBySlotIndex,
    detachSubImages,
    placeSub,
    clearSelection,
    overlayStore,
  ]);
  const handleSplitMain = reactExports.useCallback(() => {
    const { x: x2, y: y4 } = placeSub([]);
    detachSubImage(id2, {
      x: x2,
      y: y4,
    });
    clearSelection();
    overlayStore.getState().close(id2);
  }, [detachSubImage, placeSub, clearSelection, overlayStore, id2]);
  return {
    isOverlayOpen,
    handleToggleOverlay,
    handleSetPrimary,
    handleSetPrimarySlot,
    handleSelectRound,
    handleDeleteSub,
    handleSplitSub,
    handleSplitSlot,
    handleSplitAll,
    handleSplitMain,
    handleSubContextMenu,
    handleDownloadSub,
  };
}
