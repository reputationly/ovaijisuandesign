// use-multi-image-actions.js
import { reactExports, useAssetMetadataApi } from "../vendor.js";
import {
  useIsOverlayOpen,
  useMultiImageOverlayApi,
} from "./use-start-cloud-edit-from-node.js";
import { useCanvasActions } from "./use-canvas-actions.js";
import { useCanvasBridge } from "./package.jsx";
import { DEFAULT_PLACEMENT_GAP } from "../canvas/ungroup-in-canvas.js";
import { findFreePositionFromAnchor } from "../canvas/find-free-position-from-anchor.js";

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
    [
      view2.slots,
      findSubNodeBySlotIndex,
      onSaveAs,
      onSaveUrlAs,
      assetMetadataStore,
    ],
  );
  const handleSetPrimarySlot = reactExports.useCallback(
    (slot) => {
      if (slot.id === view2.primary?.id) return;
      const sub = findSubNodeBySlot(slot);
      if (!sub) return;
      promoteSubImageToMain(sub.id);
      overlayStore.getState().close(id2);
    },
    [
      view2.primary?.id,
      findSubNodeBySlot,
      promoteSubImageToMain,
      id2,
      overlayStore,
    ],
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
      const targetNodeId =
        slot.id === view2.primary?.id ? id2 : findSubNodeBySlot(slot)?.id;
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
