// create-canvas-resize-actions.js

export const CANVAS_BACKGROUND_PATTERNS = ["dots", "grid", "none"];

export function getCanvasViewportStorage() {
  if (typeof window === "undefined") return void 0;
  try {
    return window.localStorage;
  } catch {
    return void 0;
  }
}

export function collectAffectedStickerNodes(index2, directlyAffectedNodeIds) {
  if (
    index2.stickersByTargetId.size === 0 ||
    directlyAffectedNodeIds.length === 0
  )
    return [];
  const affectedIds = new Set(directlyAffectedNodeIds);
  const queue = [...affectedIds];
  for (let cursor = 0; cursor < queue.length; cursor++) {
    for (const childId of index2.childIdsByParentId.get(queue[cursor]) ?? []) {
      if (affectedIds.has(childId)) continue;
      affectedIds.add(childId);
      queue.push(childId);
    }
  }
  const result = [];
  const seenStickerIds = new Set();
  for (const targetId of affectedIds) {
    for (const sticker of index2.stickersByTargetId.get(targetId) ?? []) {
      if (seenStickerIds.has(sticker.id)) continue;
      seenStickerIds.add(sticker.id);
      result.push(sticker);
    }
  }
  return result;
}

export function createCanvasResizeActions(instance2) {
  const requestPersist = () =>
    instance2.eventBus.emit({
      type: "persist:request",
    });
  return {
    resizeNode: (nodeId, width, height) => {
      instance2.resizeNode(nodeId, {
        width,
        height,
      });
      requestPersist();
    },
    updateNodeDataAndResize: (nodeId, data2, width, height) => {
      instance2.updateNodeDataAndResize(nodeId, data2, {
        width,
        height,
      });
      requestPersist();
    },
    moveAndResizeNode: (nodeId, x2, y4, width, height, data2) => {
      instance2.moveAndResizeNode(
        nodeId,
        {
          x: x2,
          y: y4,
        },
        {
          width,
          height,
        },
        data2,
      );
      requestPersist();
    },
    moveAndResizeImageGroupMembers: (nodeId, x2, y4, width, height, data2) => {
      instance2.moveAndResizeImageGroupMembers(
        nodeId,
        {
          x: x2,
          y: y4,
        },
        {
          width,
          height,
        },
        data2,
      );
      requestPersist();
    },
  };
}
