// use-multi-image-actions.js
import { reactExports } from "../vendor.js";
import { useAssetMetadataApi } from "../infra/agent-http-client.js";
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
  id: nodeId,
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
  const isOverlayOpen = useIsOverlayOpen(nodeId);
  const handleToggleOverlay = reactExports.useCallback(
    (clickEvent) => {
      clickEvent.stopPropagation();
      const { open, close: close2 } = overlayStore.getState();
      if (isOverlayOpen) close2(nodeId);
      else open(nodeId);
    },
    [overlayStore, isOverlayOpen, nodeId],
  );
  const findSubNodeBySlot = reactExports.useCallback(
    (slot) => {
      if (!slot) return void 0;
      return subImages.find((subNode) => {
        const subData = subNode.data ?? {};
        const topLevelAssetId = subNode.assetId;
        const subAssetId =
          typeof subData.assetId === "string" && subData.assetId.length > 0
            ? subData.assetId
            : typeof topLevelAssetId === "string" && topLevelAssetId.length > 0
              ? topLevelAssetId
              : void 0;
        return subNode.id === slot.id || subAssetId === slot.id;
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
    (originalIndex, contextMenuEvent) => {
      if (originalIndex <= 0) return;
      const subNode = findSubNodeBySlotIndex(originalIndex);
      if (!subNode) return;
      openNodeContextMenu(contextMenuEvent, subNode.id);
    },
    [findSubNodeBySlotIndex, openNodeContextMenu],
  );
  const handleDownloadSub = reactExports.useCallback(
    (originalIndex) => {
      if (originalIndex <= 0) return;
      const slot = view2.slots[originalIndex];
      if (!slot) return;
      const subNode = findSubNodeBySlotIndex(originalIndex);
      if (!subNode) return;
      const subData = subNode.data ?? {};
      const topLevelAssetId = subNode.assetId;
      const assetId =
        typeof subData.assetId === "string" && subData.assetId.length > 0
          ? subData.assetId
          : typeof topLevelAssetId === "string" && topLevelAssetId.length > 0
            ? topLevelAssetId
            : void 0;
      const meta2 =
        (assetId ? assetMetadataStore.getState().get(assetId) : void 0) ??
        assetMetadataStore.getState().get(subNode.id);
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
      const subNode = findSubNodeBySlot(slot);
      if (!subNode) return;
      promoteSubImageToMain(subNode.id);
      overlayStore.getState().close(nodeId);
    },
    [
      view2.primary?.id,
      findSubNodeBySlot,
      promoteSubImageToMain,
      nodeId,
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
      const targetSub = subImages.find((subNode) => {
        const subAssetId = subNode.assetId ?? subNode.data?.assetId;
        return subNode.id === targetSlot.id || subAssetId === targetSlot.id;
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
      const subNode = findSubNodeBySlotIndex(originalIndex);
      if (!subNode) return;
      removeNode(subNode.id);
    },
    [findSubNodeBySlotIndex, removeNode],
  );
  const placeSub = reactExports.useCallback(
    (occupied) => {
      const mainInternal = reactFlow.getInternalNode(nodeId);
      const mainNode = mainInternal ?? reactFlow.getNode(nodeId);
      const anchorAbs = mainInternal?.internals.positionAbsolute ??
        mainNode?.position ?? {
          x: 0,
          y: 0,
        };
      const mainNodeWidth = mainNode?.measured?.width ?? nodeWidth;
      const mainNodeHeight = mainNode?.measured?.height ?? nodeHeight ?? mainNodeWidth;
      const anchor = {
        x: anchorAbs.x + mainNodeWidth + DEFAULT_PLACEMENT_GAP,
        y: anchorAbs.y,
      };
      const { x: positionX, y: positionY } = findFreePositionFromAnchor(
        anchor,
        {
          width: mainNodeWidth,
          height: mainNodeHeight,
        },
        occupied,
      );
      return {
        x: positionX,
        y: positionY,
        w: mainNodeWidth,
        h: mainNodeHeight,
      };
    },
    [reactFlow, nodeId, nodeWidth, nodeHeight],
  );
  const handleSplitSlot = reactExports.useCallback(
    (slot) => {
      const targetNodeId =
        slot.id === view2.primary?.id ? nodeId : findSubNodeBySlot(slot)?.id;
      if (!targetNodeId) return;
      const { x: positionX, y: positionY } = placeSub([]);
      detachSubImage(targetNodeId, {
        x: positionX,
        y: positionY,
      });
      clearSelection();
      overlayStore.getState().close(nodeId);
    },
    [
      view2.primary?.id,
      nodeId,
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
    const ids2 = [nodeId];
    for (let slotIndex = 1; slotIndex < view2.slots.length; slotIndex += 1) {
      const subNode = findSubNodeBySlotIndex(slotIndex);
      if (subNode) ids2.push(subNode.id);
    }
    const occupied = [];
    const entries2 = [];
    for (const detachedNodeId of ids2) {
      const rect = placeSub(occupied);
      occupied.push(rect);
      entries2.push({
        subId: detachedNodeId,
        position: {
          x: rect.x,
          y: rect.y,
        },
      });
    }
    detachSubImages(entries2);
    clearSelection();
    overlayStore.getState().close(nodeId);
  }, [
    nodeId,
    view2.slots,
    findSubNodeBySlotIndex,
    detachSubImages,
    placeSub,
    clearSelection,
    overlayStore,
  ]);
  const handleSplitMain = reactExports.useCallback(() => {
    const { x: positionX, y: positionY } = placeSub([]);
    detachSubImage(nodeId, {
      x: positionX,
      y: positionY,
    });
    clearSelection();
    overlayStore.getState().close(nodeId);
  }, [detachSubImage, placeSub, clearSelection, overlayStore, nodeId]);
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
