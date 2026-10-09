// 工作流卡片用的推导函数：卡片元信息、下载任务状态判断。
import { kT as countUnavailableComfyUiModels } from "../main.jsx";
import { isInstalledFeaturedWorkflow } from "./workflow-mapping.js";
function formatFileSize$1(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
export function workflowCardMetadata(workflow, labels, locale) {
  const items = [];
  if (workflow.nodeCount !== void 0) {
    items.push({
      key: "nodes",
      text: `${workflow.nodeCount} ${labels.nodes}`,
    });
  }
  if (workflow.linkCount !== void 0) {
    items.push({
      key: "links",
      text: `${workflow.linkCount} ${labels.links}`,
    });
  }
  if (workflow.nodeTypes?.length) {
    items.push({
      key: "node-types",
      text: `${workflow.nodeTypes.length} ${labels.nodeTypes}`,
      title: workflow.nodeTypes.join(", "),
    });
  }
  if (workflow.groups?.length) {
    items.push({
      key: "groups",
      text: `${workflow.groups.length} ${labels.groups}`,
      title: workflow.groups.join(", "),
    });
  }
  if (workflow.models?.length) {
    items.push({
      key: "models",
      text: `${workflow.models.length} ${labels.models}`,
      title: workflow.models.join(", "),
    });
  }
  if (workflow.fileSize !== void 0) {
    items.push({
      key: "size",
      text: `${labels.size} ${formatFileSize$1(workflow.fileSize)}`,
    });
  }
  if (workflow.updatedAt !== void 0) {
    items.push({
      key: "updated",
      text: `${labels.updated} ${new Intl.DateTimeFormat(locale, {
        dateStyle: "medium",
      }).format(workflow.updatedAt)}`,
    });
  }
  return items;
}
export function findLatestVisibleWorkflowDownloadTask(tasks, workflowId) {
  return [...tasks]
    .reverse()
    .find(
      (task) =>
        task.workflowId === workflowId && task.status !== "cancelled" && task.status !== "failed",
    );
}
export function isWorkflowModelPreparationComplete(task) {
  return task.status === "completed" && countUnavailableComfyUiModels(task) === 0;
}
export function isWorkflowPendingModelPreparation(workflow, tasks) {
  if (!isInstalledFeaturedWorkflow(workflow)) return false;
  const task = [...tasks]
    .reverse()
    .find(
      (candidate) =>
        !candidate.hidden &&
        (candidate.workflowId === workflow.id ||
          candidate.workflowId === workflow.featuredWorkflow.id),
    );
  return task !== void 0 && !isWorkflowModelPreparationComplete(task);
}
export function isActiveWorkflowDownloadTask(task) {
  return task.status === "queued" || task.status === "verifying" || task.status === "downloading";
}
export function comfyUiLicenseKey(license) {
  return JSON.stringify([license.id, license.revision, license.url]);
}
