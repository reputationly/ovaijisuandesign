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

export function collectAffectedStickerNodes(index, directlyAffectedNodeIds) {
  if (
    index.stickersByTargetId.size === 0 ||
    directlyAffectedNodeIds.length === 0
  )
    return [];
  const affectedIds = new Set(directlyAffectedNodeIds);
  const queue = [...affectedIds];
  for (let cursor = 0; cursor < queue.length; cursor++) {
    for (const childId of index.childIdsByParentId.get(queue[cursor]) ?? []) {
      if (affectedIds.has(childId)) continue;
      affectedIds.add(childId);
      queue.push(childId);
    }
  }
  const result = [];
  const seenStickerIds = new Set();
  for (const targetId of affectedIds) {
    for (const sticker of index.stickersByTargetId.get(targetId) ?? []) {
      if (seenStickerIds.has(sticker.id)) continue;
      seenStickerIds.add(sticker.id);
      result.push(sticker);
    }
  }
  return result;
}

export function createCanvasResizeActions(instance) {
  const requestPersist = () =>
    instance.eventBus.emit({
      type: "persist:request",
    });
  return {
    resizeNode: (nodeId, width, height) => {
      instance.resizeNode(nodeId, {
        width,
        height,
      });
      requestPersist();
    },
    updateNodeDataAndResize: (nodeId, data, width, height) => {
      instance.updateNodeDataAndResize(nodeId, data, {
        width,
        height,
      });
      requestPersist();
    },
    moveAndResizeNode: (nodeId, x, y, width, height, data) => {
      instance.moveAndResizeNode(
        nodeId,
        {
          x,
          y,
        },
        {
          width,
          height,
        },
        data,
      );
      requestPersist();
    },
    moveAndResizeImageGroupMembers: (nodeId, x, y, width, height, data) => {
      instance.moveAndResizeImageGroupMembers(
        nodeId,
        {
          x,
          y,
        },
        {
          width,
          height,
        },
        data,
      );
      requestPersist();
    },
  };
}
