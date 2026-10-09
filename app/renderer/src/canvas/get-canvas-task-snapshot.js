// get-canvas-task-snapshot.js
import { CanvasNodeType } from "../vendor.js";

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
  if (
    node2.type !== CanvasNodeType.File ||
    !node2.data ||
    typeof node2.data !== "object"
  )
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
    typeof data2.currentWorkflowName === "string"
      ? data2.currentWorkflowName.trim()
      : "";
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
    typeof data2.mediaType === "string"
      ? data2.mediaType
      : mediaTypeForNode(node2.type);
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
