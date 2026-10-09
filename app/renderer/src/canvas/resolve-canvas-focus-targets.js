// resolve-canvas-focus-targets.js
import { getCanvasTaskSnapshot } from "./get-canvas-task-snapshot.js";
import { CanvasNodeType, reactExports } from "../vendor.js";

function buildStickerFollowIndex(nodes) {
  const nodeById = new Map();
  const childIdsByParentId = new Map();
  const stickersByTargetId = new Map();
  for (const node2 of nodes) {
    nodeById.set(node2.id, node2);
    if (node2.parentId) {
      const children2 = childIdsByParentId.get(node2.parentId);
      if (children2) children2.push(node2.id);
      else childIdsByParentId.set(node2.parentId, [node2.id]);
    }
    if (node2.type !== CanvasNodeType.Sticker) continue;
    const targetId = node2.data?.targetId;
    if (typeof targetId !== "string" || targetId.length === 0) continue;
    const stickers = stickersByTargetId.get(targetId);
    if (stickers) stickers.push(node2);
    else stickersByTargetId.set(targetId, [node2]);
  }
  return {
    nodeById,
    childIdsByParentId,
    stickersByTargetId,
  };
}

export function useStickerFollowIndex(instance2) {
  const indexRef = reactExports.useRef(null);
  if (!indexRef.current)
    indexRef.current = buildStickerFollowIndex(instance2.getGraph().nodes);
  reactExports.useEffect(() => {
    const rebuild = (graph = instance2.getGraph()) => {
      indexRef.current = buildStickerFollowIndex(graph.nodes);
    };
    rebuild();
    return instance2.onGraphChange(rebuild);
  }, [instance2]);
  return reactExports.useCallback(() => indexRef.current, []);
}

export const STICKER_NODE_SIZE = {
  width: 56,
  height: 56,
};

const STICKER_POINTER_ANCHOR = {
  x: 0,
  y: 0,
};

export function resolveStickerPointerPlacement(
  clientPosition,
  screenToFlowPosition,
) {
  const pointerPosition = screenToFlowPosition(clientPosition, {
    snapToGrid: false,
  });
  return {
    x: pointerPosition.x - STICKER_POINTER_ANCHOR.x,
    y: pointerPosition.y - STICKER_POINTER_ANCHOR.y,
  };
}

export function historyBlockedMessage(t2, direction, reason) {
  if (reason === "task_retained") {
    return direction === "undo"
      ? t2(
          "canvas.history.undoBlockedByRetainedTask",
          "该内容的生成任务已保留，暂无法撤销。请先处理卡片上的恢复提示",
        )
      : t2(
          "canvas.history.redoBlockedByRetainedTask",
          "该内容的生成任务已保留，暂无法重做。请先处理卡片上的恢复提示",
        );
  }
  return direction === "undo"
    ? t2(
        "canvas.history.undoBlockedByGeneration",
        "生成中无法撤销，请等待生成完成后再试",
      )
    : t2(
        "canvas.history.redoBlockedByGeneration",
        "生成中无法重做，请等待生成完成后再试",
      );
}

export function deleteBlockedMessage(t2, reason) {
  if (reason === "task_retained") {
    return t2(
      "canvas.deleteBlockedByRetainedTask",
      "该内容的生成任务已保留，暂无法删除。请先处理卡片上的恢复提示",
    );
  }
  if (reason === "confirmation-stale") {
    return t2(
      "canvas.persistence.highBlastDeleteStale",
      "画布内容已发生变化，本次删除已取消，请重新操作",
    );
  }
  if (reason === "confirmation-unavailable") {
    return t2(
      "canvas.persistence.highBlastDeleteUnavailable",
      "暂时无法确认本次大量删除，画布内容未被修改，请稍后重试",
    );
  }
  return t2(
    "canvas.deleteBlockedByGeneration",
    "生成中的元素无法删除，请等待生成完成后再试",
  );
}

export function createCanvasFocusScheduler({
  isMeasured,
  fit,
  schedule: schedule2 = setTimeout,
  cancel = clearTimeout,
  retryInterval = 50,
  maxMeasurementRetries = 10,
}) {
  let requestToken = 0;
  let pending2;
  const clearPending = () => {
    if (pending2 !== void 0) cancel(pending2);
    pending2 = void 0;
  };
  const cancelRequest = () => {
    requestToken += 1;
    clearPending();
  };
  return {
    request(request) {
      requestToken += 1;
      const token2 = requestToken;
      clearPending();
      const runWhenMeasured = (retriesRemaining) => {
        if (token2 !== requestToken) return;
        if (!isMeasured(request.nodeIds)) {
          if (retriesRemaining <= 0) return;
          pending2 = schedule2(
            () => runWhenMeasured(retriesRemaining - 1),
            retryInterval,
          );
          return;
        }
        pending2 = void 0;
        fit(request);
      };
      pending2 = schedule2(
        () => runWhenMeasured(maxMeasurementRetries),
        request.delay,
      );
    },
    cancel: cancelRequest,
    dispose: cancelRequest,
  };
}

export function applyCanvasFocusSelection(selection2, nodeIds, shouldSelect) {
  if (!shouldSelect) return;
  if (nodeIds.length === 1) selection2.select(nodeIds[0]);
  else selection2.set(nodeIds);
}

function collectAncestorGroupIds(nodeById, requestedNodeIds) {
  const ancestorGroups = (id2) => {
    const groups = [];
    let current2 = nodeById.get(id2);
    const visited = new Set();
    while (current2 && !visited.has(current2.id)) {
      visited.add(current2.id);
      if (current2.type === "group") groups.unshift(current2.id);
      current2 = current2.parentId ? nodeById.get(current2.parentId) : void 0;
    }
    return groups;
  };
  return [...new Set(requestedNodeIds.flatMap((id2) => ancestorGroups(id2)))];
}

function resolveCanvasAncestorGroupIds(nodes, requestedNodeIds) {
  return collectAncestorGroupIds(
    new Map(nodes.map((node2) => [node2.id, node2])),
    requestedNodeIds,
  );
}

function expandCanvasAncestorGroups(target, requestedNodeIds) {
  const groupIds = resolveCanvasAncestorGroupIds(
    target.getGraph().nodes,
    requestedNodeIds,
  );
  for (const groupId2 of groupIds) target.setGroupCollapsed(groupId2, false);
  return groupIds.length > 0;
}

function resolveCanvasFocusTargets(nodes, requestedNodeIds, preferParentGroup) {
  const nodeById = new Map(nodes.map((node2) => [node2.id, node2]));
  const requested = requestedNodeIds.filter((id2) => nodeById.has(id2));
  if (!preferParentGroup || requested.length === 0)
    return {
      nodeIds: requested,
    };
  const groupIdsToExpand = collectAncestorGroupIds(nodeById, requested);
  const explicitGroups = requested.filter(
    (id2) => nodeById.get(id2)?.type === "group",
  );
  if (
    explicitGroups.length === requested.length &&
    explicitGroups.length === 1
  ) {
    return {
      nodeIds: explicitGroups,
      groupId: explicitGroups[0],
      groupIdsToExpand,
    };
  }
  if (explicitGroups.length > 0)
    return {
      nodeIds: requested,
      groupIdsToExpand,
    };
  const parents = requested.map((id2) => nodeById.get(id2)?.parentId);
  const sharedParentId = parents[0];
  if (
    !sharedParentId ||
    parents.some((parentId) => parentId !== sharedParentId) ||
    nodeById.get(sharedParentId)?.type !== "group"
  ) {
    return {
      nodeIds: requested,
      groupIdsToExpand,
    };
  }
  const sharedGroupIds = collectAncestorGroupIds(nodeById, [sharedParentId]);
  return {
    nodeIds: [sharedParentId],
    groupId: sharedParentId,
    groupIdsToExpand: sharedGroupIds,
  };
}

export const canvasFocus = {
  expand: expandCanvasAncestorGroups,
  resolve: resolveCanvasFocusTargets,
};

function getGeneratingTaskSnapshot(nodeId, info2) {
  const prompt = info2.prompt.trim();
  const model = info2.model.trim();
  return {
    id: nodeId,
    label: prompt || model || "Canvas generation",
    detail: model || void 0,
    status: info2.error ? "error" : (info2.phase ?? "generating"),
    ...(model
      ? {
          model,
        }
      : {}),
    ...(info2.modelId
      ? {
          modelId: info2.modelId,
        }
      : {}),
    ...(info2.backend
      ? {
          backend: info2.backend,
        }
      : {}),
    ...(info2.cloudTaskId
      ? {
          cloudTaskId: info2.cloudTaskId,
        }
      : {}),
  };
}

export function getCanvasTaskSnapshots(nodes, generatingByNode = new Map()) {
  const tasks = [];
  const nodeIds = new Set();
  const taskIds = new Set();
  for (const node2 of nodes) {
    nodeIds.add(node2.id);
    const task = getCanvasTaskSnapshot(node2);
    if (task) {
      tasks.push(task);
      taskIds.add(task.id);
    }
  }
  for (const [nodeId, info2] of generatingByNode) {
    if (!nodeIds.has(nodeId) || taskIds.has(nodeId)) continue;
    tasks.push(getGeneratingTaskSnapshot(nodeId, info2));
  }
  return tasks;
}

const DEFAULT_CANVAS_TOAST_SCOPE = "default";

export function getCanvasToastId(event, workspaceId2) {
  const scope = workspaceId2?.trim() || DEFAULT_CANVAS_TOAST_SCOPE;
  return `canvas-${event}:${encodeURIComponent(scope)}`;
}

const CANVAS_VIEWPORT_STORAGE_PREFIX = "hilo:canvas:viewport:v1";

export const CANVAS_VIEWPORT_STORAGE_VERSION = 1;

export function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

export function hasValidViewportSize({ width, height }) {
  return (
    Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0
  );
}

export function createCanvasViewportStorageKey(workspaceId2, mode2) {
  if (!workspaceId2) return void 0;
  return `${CANVAS_VIEWPORT_STORAGE_PREFIX}:${encodeURIComponent(workspaceId2)}:${encodeURIComponent(mode2)}`;
}
