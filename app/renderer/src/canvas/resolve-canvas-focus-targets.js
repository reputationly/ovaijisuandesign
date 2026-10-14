// resolve-canvas-focus-targets.js
import { getCanvasTaskSnapshot } from "./get-canvas-task-snapshot.js";
import { CanvasNodeType } from "./canvas-geometry.js";
import reactExports from "react";

function buildStickerFollowIndex(nodes) {
  const nodeById = new Map();
  const childIdsByParentId = new Map();
  const stickersByTargetId = new Map();
  for (const node of nodes) {
    nodeById.set(node.id, node);
    if (node.parentId) {
      const children = childIdsByParentId.get(node.parentId);
      if (children) children.push(node.id);
      else childIdsByParentId.set(node.parentId, [node.id]);
    }
    if (node.type !== CanvasNodeType.Sticker) continue;
    const targetId = node.data?.targetId;
    if (typeof targetId !== "string" || targetId.length === 0) continue;
    const stickers = stickersByTargetId.get(targetId);
    if (stickers) stickers.push(node);
    else stickersByTargetId.set(targetId, [node]);
  }
  return {
    nodeById,
    childIdsByParentId,
    stickersByTargetId,
  };
}

export function useStickerFollowIndex(instance) {
  const indexRef = reactExports.useRef(null);
  if (!indexRef.current)
    indexRef.current = buildStickerFollowIndex(instance.getGraph().nodes);
  reactExports.useEffect(() => {
    const rebuild = (graph = instance.getGraph()) => {
      indexRef.current = buildStickerFollowIndex(graph.nodes);
    };
    rebuild();
    return instance.onGraphChange(rebuild);
  }, [instance]);
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

export function historyBlockedMessage(translate, direction, reason) {
  if (reason === "task_retained") {
    return direction === "undo"
      ? translate(
          "canvas.history.undoBlockedByRetainedTask",
          "该内容的生成任务已保留，暂无法撤销。请先处理卡片上的恢复提示",
        )
      : translate(
          "canvas.history.redoBlockedByRetainedTask",
          "该内容的生成任务已保留，暂无法重做。请先处理卡片上的恢复提示",
        );
  }
  return direction === "undo"
    ? translate(
        "canvas.history.undoBlockedByGeneration",
        "生成中无法撤销，请等待生成完成后再试",
      )
    : translate(
        "canvas.history.redoBlockedByGeneration",
        "生成中无法重做，请等待生成完成后再试",
      );
}

export function deleteBlockedMessage(translate, reason) {
  if (reason === "task_retained") {
    return translate(
      "canvas.deleteBlockedByRetainedTask",
      "该内容的生成任务已保留，暂无法删除。请先处理卡片上的恢复提示",
    );
  }
  if (reason === "confirmation-stale") {
    return translate(
      "canvas.persistence.highBlastDeleteStale",
      "画布内容已发生变化，本次删除已取消，请重新操作",
    );
  }
  if (reason === "confirmation-unavailable") {
    return translate(
      "canvas.persistence.highBlastDeleteUnavailable",
      "暂时无法确认本次大量删除，画布内容未被修改，请稍后重试",
    );
  }
  return translate(
    "canvas.deleteBlockedByGeneration",
    "生成中的元素无法删除，请等待生成完成后再试",
  );
}

export function createCanvasFocusScheduler({
  isMeasured,
  fit,
  schedule = setTimeout,
  cancel = clearTimeout,
  retryInterval = 50,
  maxMeasurementRetries = 10,
}) {
  let requestToken = 0;
  let pending;
  const clearPending = () => {
    if (pending !== void 0) cancel(pending);
    pending = void 0;
  };
  const cancelRequest = () => {
    requestToken += 1;
    clearPending();
  };
  return {
    request(request) {
      requestToken += 1;
      const token = requestToken;
      clearPending();
      const runWhenMeasured = (retriesRemaining) => {
        if (token !== requestToken) return;
        if (!isMeasured(request.nodeIds)) {
          if (retriesRemaining <= 0) return;
          pending = schedule(
            () => runWhenMeasured(retriesRemaining - 1),
            retryInterval,
          );
          return;
        }
        pending = void 0;
        fit(request);
      };
      pending = schedule(
        () => runWhenMeasured(maxMeasurementRetries),
        request.delay,
      );
    },
    cancel: cancelRequest,
    dispose: cancelRequest,
  };
}

export function applyCanvasFocusSelection(selection, nodeIds, shouldSelect) {
  if (!shouldSelect) return;
  if (nodeIds.length === 1) selection.select(nodeIds[0]);
  else selection.set(nodeIds);
}

function collectAncestorGroupIds(nodeById, requestedNodeIds) {
  const ancestorGroups = (id) => {
    const groups = [];
    let current = nodeById.get(id);
    const visited = new Set();
    while (current && !visited.has(current.id)) {
      visited.add(current.id);
      if (current.type === "group") groups.unshift(current.id);
      current = current.parentId ? nodeById.get(current.parentId) : void 0;
    }
    return groups;
  };
  return [...new Set(requestedNodeIds.flatMap((id) => ancestorGroups(id)))];
}

function resolveCanvasAncestorGroupIds(nodes, requestedNodeIds) {
  return collectAncestorGroupIds(
    new Map(nodes.map((node) => [node.id, node])),
    requestedNodeIds,
  );
}

function expandCanvasAncestorGroups(target, requestedNodeIds) {
  const groupIds = resolveCanvasAncestorGroupIds(
    target.getGraph().nodes,
    requestedNodeIds,
  );
  for (const groupId of groupIds) target.setGroupCollapsed(groupId, false);
  return groupIds.length > 0;
}

function resolveCanvasFocusTargets(nodes, requestedNodeIds, preferParentGroup) {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const requested = requestedNodeIds.filter((id) => nodeById.has(id));
  if (!preferParentGroup || requested.length === 0)
    return {
      nodeIds: requested,
    };
  const groupIdsToExpand = collectAncestorGroupIds(nodeById, requested);
  const explicitGroups = requested.filter(
    (id) => nodeById.get(id)?.type === "group",
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
  const parents = requested.map((id) => nodeById.get(id)?.parentId);
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

function getGeneratingTaskSnapshot(nodeId, info) {
  const prompt = info.prompt.trim();
  const model = info.model.trim();
  return {
    id: nodeId,
    label: prompt || model || "Canvas generation",
    detail: model || void 0,
    status: info.error ? "error" : (info.phase ?? "generating"),
    ...(model
      ? {
          model,
        }
      : {}),
    ...(info.modelId
      ? {
          modelId: info.modelId,
        }
      : {}),
    ...(info.backend
      ? {
          backend: info.backend,
        }
      : {}),
    ...(info.cloudTaskId
      ? {
          cloudTaskId: info.cloudTaskId,
        }
      : {}),
  };
}

export function getCanvasTaskSnapshots(nodes, generatingByNode = new Map()) {
  const tasks = [];
  const nodeIds = new Set();
  const taskIds = new Set();
  for (const node of nodes) {
    nodeIds.add(node.id);
    const task = getCanvasTaskSnapshot(node);
    if (task) {
      tasks.push(task);
      taskIds.add(task.id);
    }
  }
  for (const [nodeId, info] of generatingByNode) {
    if (!nodeIds.has(nodeId) || taskIds.has(nodeId)) continue;
    tasks.push(getGeneratingTaskSnapshot(nodeId, info));
  }
  return tasks;
}

const DEFAULT_CANVAS_TOAST_SCOPE = "default";

export function getCanvasToastId(event, workspaceId) {
  const scope = workspaceId?.trim() || DEFAULT_CANVAS_TOAST_SCOPE;
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

export function createCanvasViewportStorageKey(workspaceId, mode) {
  if (!workspaceId) return void 0;
  return `${CANVAS_VIEWPORT_STORAGE_PREFIX}:${encodeURIComponent(workspaceId)}:${encodeURIComponent(mode)}`;
}
