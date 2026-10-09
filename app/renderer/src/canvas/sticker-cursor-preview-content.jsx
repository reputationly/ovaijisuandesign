// sticker-cursor-preview-content.jsx
import { reactExports, CanvasNodeType, ViewportPortal } from "../vendor.js";
import { CANVAS_STAMP_CURSOR_URL } from "../media-editing/ready-sub-video-card.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { buildStickerFollowIndex } from "./canvas-shell-inner.jsx";
export function useStickerFollowIndex(instance2) {
  const indexRef = reactExports.useRef(null);
  if (!indexRef.current) indexRef.current = buildStickerFollowIndex(instance2.getGraph().nodes);
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
export function resolveStickerPointerPlacement(clientPosition, screenToFlowPosition) {
  const pointerPosition = screenToFlowPosition(clientPosition, {
    snapToGrid: false,
  });
  return {
    x: pointerPosition.x - STICKER_POINTER_ANCHOR.x,
    y: pointerPosition.y - STICKER_POINTER_ANCHOR.y,
  };
}
const PRESS_FEEDBACK_MS = 240;
export function StickerCursorPreview({ active: active2, asset, emoji: emoji2, resolvePlacement }) {
  return (
    <ViewportPortal>
      <StickerCursorPreviewContent
        active={active2}
        asset={asset}
        emoji={emoji2}
        resolvePlacement={resolvePlacement}
      />
    </ViewportPortal>
  );
}
function StickerCursorPreviewContent({ active: active2, asset, emoji: emoji2, resolvePlacement }) {
  const previewRef = reactExports.useRef(null);
  const pressTimerRef = reactExports.useRef(null);
  const [pressed, setPressed] = reactExports.useState(false);
  reactExports.useEffect(() => {
    const preview = previewRef.current;
    if (!preview) return;
    if (!active2) {
      preview.style.display = "none";
      setPressed(false);
      return;
    }
    const setVisiblePosition = (event) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        preview.style.display = "none";
        return;
      }
      if (target.closest('[data-canvas-chrome="true"]')) {
        preview.style.display = "none";
        return;
      }
      const canvas = target.closest('[data-hilo-canvas-root="true"] .react-flow');
      if (!canvas) {
        preview.style.display = "none";
        return;
      }
      const bounds = canvas.getBoundingClientRect();
      if (
        event.clientX < bounds.left ||
        event.clientX > bounds.right ||
        event.clientY < bounds.top ||
        event.clientY > bounds.bottom
      ) {
        preview.style.display = "none";
        return;
      }
      const position2 = resolvePlacement({
        x: event.clientX,
        y: event.clientY,
      });
      preview.style.display = "block";
      preview.style.transform = `translate3d(${position2.x}px, ${position2.y}px, 0)`;
    };
    const handlePointerDown = (event) => {
      if (event.button !== 0) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest('[data-canvas-chrome="true"]')) return;
      if (!target.closest('[data-hilo-canvas-root="true"] .react-flow')) return;
      setPressed(true);
      if (pressTimerRef.current) window.clearTimeout(pressTimerRef.current);
      pressTimerRef.current = window.setTimeout(() => {
        pressTimerRef.current = null;
        setPressed(false);
      }, PRESS_FEEDBACK_MS);
    };
    document.addEventListener("pointermove", setVisiblePosition, true);
    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => {
      document.removeEventListener("pointermove", setVisiblePosition, true);
      document.removeEventListener("pointerdown", handlePointerDown, true);
      if (pressTimerRef.current) window.clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
      setPressed(false);
    };
  }, [active2, resolvePlacement]);
  return (
    <div
      ref={previewRef}
      className="pointer-events-none absolute left-0 top-0 z-[2000] hidden will-change-transform"
      style={{
        width: STICKER_NODE_SIZE.width,
        height: STICKER_NODE_SIZE.height,
      }}
      aria-hidden="true"
    >
      <span className={`sticker-cursor-preview-art ${pressed ? "is-pressed" : ""}`}>
        {asset ? (
          <img src={asset.src} alt="" draggable={false} className="sticker-cursor-preview-image" />
        ) : (
          <span className="sticker-cursor-preview-emoji">{emoji2}</span>
        )}
        <img
          src={CANVAS_STAMP_CURSOR_URL}
          alt=""
          draggable={false}
          className="sticker-cursor-preview-stamp"
        />
      </span>
    </div>
  );
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
    ? t2("canvas.history.undoBlockedByGeneration", "生成中无法撤销，请等待生成完成后再试")
    : t2("canvas.history.redoBlockedByGeneration", "生成中无法重做，请等待生成完成后再试");
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
  return t2("canvas.deleteBlockedByGeneration", "生成中的元素无法删除，请等待生成完成后再试");
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
          pending2 = schedule2(() => runWhenMeasured(retriesRemaining - 1), retryInterval);
          return;
        }
        pending2 = void 0;
        fit(request);
      };
      pending2 = schedule2(() => runWhenMeasured(maxMeasurementRetries), request.delay);
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
  const groupIds = resolveCanvasAncestorGroupIds(target.getGraph().nodes, requestedNodeIds);
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
  const explicitGroups = requested.filter((id2) => nodeById.get(id2)?.type === "group");
  if (explicitGroups.length === requested.length && explicitGroups.length === 1) {
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
function isMonitorableNodeType(type2) {
  return (
    type2 === CanvasNodeType.Placeholder ||
    type2 === CanvasNodeType.Image ||
    type2 === CanvasNodeType.Video ||
    type2 === CanvasNodeType.Audio
  );
}
function mediaTypeForNode(type2) {
  switch (type2) {
    case CanvasNodeType.Image:
      return "image";
    case CanvasNodeType.Video:
      return "video";
    case CanvasNodeType.Audio:
      return "audio";
    default:
      return void 0;
  }
}
function getComfyUiTaskSnapshot(node2) {
  if (node2.type !== CanvasNodeType.File || !node2.data || typeof node2.data !== "object")
    return null;
  const data2 = node2.data;
  if (data2.pluginId !== "comfyui") return null;
  const runningCount =
    typeof data2.comfyuiRunSummary?.runningCount === "number"
      ? Math.max(0, data2.comfyuiRunSummary.runningCount)
      : 0;
  const queuedCount =
    typeof data2.comfyuiRunSummary?.queuedCount === "number"
      ? Math.max(0, data2.comfyuiRunSummary.queuedCount)
      : 0;
  if (runningCount + queuedCount === 0) return null;
  const workflowName =
    typeof data2.currentWorkflowName === "string" ? data2.currentWorkflowName.trim() : "";
  return {
    id: node2.id,
    label: workflowName || "ComfyUI workflow",
    detail: `${runningCount} running · ${queuedCount} queued`,
    status: "running",
  };
}
export function getCanvasTaskSnapshot(node2) {
  const comfyUiTask = getComfyUiTaskSnapshot(node2);
  if (comfyUiTask) return comfyUiTask;
  if (!isMonitorableNodeType(node2.type)) return null;
  const data2 = node2.data;
  if (
    data2?.status !== "pending" &&
    data2?.status !== "generating" &&
    data2?.status !== "loading"
  ) {
    return null;
  }
  const status = data2.status;
  const prompt = typeof data2.prompt === "string" ? data2.prompt.trim() : "";
  const model = typeof data2.model === "string" ? data2.model.trim() : "";
  const mediaType =
    typeof data2.mediaType === "string" ? data2.mediaType : mediaTypeForNode(node2.type);
  return {
    id: node2.id,
    label: prompt || model || "Canvas generation",
    detail: model || void 0,
    status,
    ...(mediaType
      ? {
          mediaType,
        }
      : {}),
    ...(model
      ? {
          model,
        }
      : {}),
    ...(typeof data2.model_id === "string"
      ? {
          modelId: data2.model_id,
        }
      : {}),
    ...(typeof data2.backend === "string"
      ? {
          backend: data2.backend,
        }
      : {}),
    ...(typeof data2.cloudTaskId === "string"
      ? {
          cloudTaskId: data2.cloudTaskId,
        }
      : {}),
    ...(typeof data2.providerTaskId === "string"
      ? {
          providerTaskId: data2.providerTaskId,
        }
      : {}),
  };
}
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
const CANVAS_VIEWPORT_STORAGE_VERSION = 1;
function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}
function parseCanvasViewportSnapshot(serialized) {
  let value;
  try {
    value = JSON.parse(serialized);
  } catch {
    return void 0;
  }
  if (typeof value !== "object" || value === null) return void 0;
  const candidate = value;
  if (
    candidate.version !== CANVAS_VIEWPORT_STORAGE_VERSION ||
    !isFiniteNumber(candidate.centerX) ||
    !isFiniteNumber(candidate.centerY) ||
    !isFiniteNumber(candidate.zoom) ||
    candidate.zoom <= 0
  ) {
    return void 0;
  }
  return {
    version: CANVAS_VIEWPORT_STORAGE_VERSION,
    centerX: candidate.centerX,
    centerY: candidate.centerY,
    zoom: candidate.zoom,
  };
}
function hasValidViewportSize({ width, height }) {
  return Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0;
}
export function createCanvasViewportStorageKey(workspaceId2, mode2) {
  if (!workspaceId2) return void 0;
  return `${CANVAS_VIEWPORT_STORAGE_PREFIX}:${encodeURIComponent(workspaceId2)}:${encodeURIComponent(mode2)}`;
}
export function serializeCanvasViewport(viewport, size2) {
  if (
    !hasValidViewportSize(size2) ||
    !isFiniteNumber(viewport.x) ||
    !isFiniteNumber(viewport.y) ||
    !isFiniteNumber(viewport.zoom) ||
    viewport.zoom <= 0
  ) {
    return void 0;
  }
  const centerX = (size2.width / 2 - viewport.x) / viewport.zoom;
  const centerY = (size2.height / 2 - viewport.y) / viewport.zoom;
  if (!Number.isFinite(centerX) || !Number.isFinite(centerY)) return void 0;
  const snapshot2 = {
    version: CANVAS_VIEWPORT_STORAGE_VERSION,
    centerX,
    centerY,
    zoom: viewport.zoom,
  };
  return JSON.stringify(snapshot2);
}
export function resolveStoredCanvasViewport(serialized, { width, height, minZoom, maxZoom }) {
  if (
    !serialized ||
    !hasValidViewportSize({
      width,
      height,
    }) ||
    !Number.isFinite(minZoom) ||
    !Number.isFinite(maxZoom) ||
    minZoom <= 0 ||
    maxZoom < minZoom
  ) {
    return void 0;
  }
  const snapshot2 = parseCanvasViewportSnapshot(serialized);
  if (!snapshot2) return void 0;
  const zoom2 = Math.min(maxZoom, Math.max(minZoom, snapshot2.zoom));
  const x2 = width / 2 - snapshot2.centerX * zoom2;
  const y4 = height / 2 - snapshot2.centerY * zoom2;
  if (!Number.isFinite(x2) || !Number.isFinite(y4)) return void 0;
  return {
    x: x2,
    y: y4,
    zoom: zoom2,
  };
}
