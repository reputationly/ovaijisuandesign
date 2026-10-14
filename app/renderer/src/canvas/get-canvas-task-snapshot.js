// get-canvas-task-snapshot.js
import { CanvasNodeType } from "./canvas-geometry.js";

function isMonitorableNodeType(type) {
  return (
    type === CanvasNodeType.Placeholder ||
    type === CanvasNodeType.Image ||
    type === CanvasNodeType.Video ||
    type === CanvasNodeType.Audio
  );
}

function mediaTypeForNode(type) {
  switch (type) {
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

function getComfyUiTaskSnapshot(node) {
  if (
    node.type !== CanvasNodeType.File ||
    !node.data ||
    typeof node.data !== "object"
  )
    return null;
  const data = node.data;
  if (data.pluginId !== "comfyui") return null;
  const runningCount =
    typeof data.comfyuiRunSummary?.runningCount === "number"
      ? Math.max(0, data.comfyuiRunSummary.runningCount)
      : 0;
  const queuedCount =
    typeof data.comfyuiRunSummary?.queuedCount === "number"
      ? Math.max(0, data.comfyuiRunSummary.queuedCount)
      : 0;
  if (runningCount + queuedCount === 0) return null;
  const workflowName =
    typeof data.currentWorkflowName === "string"
      ? data.currentWorkflowName.trim()
      : "";
  return {
    id: node.id,
    label: workflowName || "ComfyUI workflow",
    detail: `${runningCount} running · ${queuedCount} queued`,
    status: "running",
  };
}

export function getCanvasTaskSnapshot(node) {
  const comfyUiTask = getComfyUiTaskSnapshot(node);
  if (comfyUiTask) return comfyUiTask;
  if (!isMonitorableNodeType(node.type)) return null;
  const data = node.data;
  if (
    data?.status !== "pending" &&
    data?.status !== "generating" &&
    data?.status !== "loading"
  ) {
    return null;
  }
  const status = data.status;
  const prompt = typeof data.prompt === "string" ? data.prompt.trim() : "";
  const model = typeof data.model === "string" ? data.model.trim() : "";
  const mediaType =
    typeof data.mediaType === "string"
      ? data.mediaType
      : mediaTypeForNode(node.type);
  return {
    id: node.id,
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
    ...(typeof data.model_id === "string"
      ? {
          modelId: data.model_id,
        }
      : {}),
    ...(typeof data.backend === "string"
      ? {
          backend: data.backend,
        }
      : {}),
    ...(typeof data.cloudTaskId === "string"
      ? {
          cloudTaskId: data.cloudTaskId,
        }
      : {}),
    ...(typeof data.providerTaskId === "string"
      ? {
          providerTaskId: data.providerTaskId,
        }
      : {}),
  };
}
