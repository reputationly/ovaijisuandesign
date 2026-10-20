/**
 * 任务协议解析（第 204 轮，整块还原）。
 *
 * 参考：index-BBp4hclA.js 300690 / 320882 / 321728
 * 三个解析器本身 63 行，但依赖 canvas-v3-model.js 里已成套的
 * shape / oneOf / array / invalid$2 / task / conflict 等 schema 家族
 * ——那批在树里已经有了，所以这个模块只放三个解析器本体。
 */

import { PROJECT_TASK_OPERATIONS, TASK_VIEW_STATUSES, TERMINAL_TASK_STATUSES, action, array, billing, bool, conflict, coverage, disposition, id$1, integer, invalid$2, json, kind, media$1, nullable, oneOf, operation, optional, output, parseTaskProblem, parseTaskRequestError, parseTaskView, phase, placement, progress, reason, record$4, revision$1, shape, task, taskProblem, taskProblemSource, text$7 } from "./../canvas-v3/canvas-v3-model.js";
import { MAX_IDENTITIES, isIdentity$1, readIds } from "./../canvas-v3/frame-services.js";

function mapProjectTaskSnapshot(value) {
  if (!value || typeof value !== "object") return;
  const task2 = value;
  if (!isIdentity$1(task2.id) || !Number.isSafeInteger(task2.revision) || Number(task2.revision) < 0)
    return;
  const resources = readIds(task2.outputs, "resourceId");
  const compositions = readIds(task2.placements, "compositionId");
  if (!resources || !compositions) return;
  return {
    id: task2.id,
    revision: Number(task2.revision),
    outputs: resources.map((resourceId2) => ({ resourceId: resourceId2 })),
    placements: compositions.map((compositionId) => ({ compositionId }))
  };
}

function parseEditorServerMessage(raw2) {
  if (!raw2 || typeof raw2 !== "object") throw new Error("INVALID_EDITOR_EVENT");
  const value = raw2;
  if (![
    "editor_subscription_ready",
    "editor_invalidated",
    "editor_subscription_closed",
    "editor_subscription_error"
  ].includes(String(value.type)) || typeof value.subscriptionId !== "string" || !value.subscriptionId || value.subscriptionId.length > 128 || typeof value.serverEpoch !== "string" || !value.serverEpoch || value.serverEpoch.length > 128 || value.capabilityId !== void 0 && !["plugin:director-stage", "plugin:clip-studio"].includes(String(value.capabilityId)) || value.code !== void 0 && (typeof value.code !== "string" || value.code.length > 128))
    throw new Error("INVALID_EDITOR_EVENT");
  return {
    type: value.type,
    subscriptionId: value.subscriptionId,
    serverEpoch: value.serverEpoch,
    ...typeof value.capabilityId === "string" ? { capabilityId: value.capabilityId } : {},
    ...typeof value.code === "string" ? { code: value.code } : {}
  };
}

function parseTaskServerMessage(value) {
  const data2 = record$4(value);
  const subscriptionId = id$1(data2.subscriptionId);
  switch (data2.type) {
    case "project_changed": {
      if (!Array.isArray(data2.domains) || data2.domains.length < 1 || data2.domains.length > 2)
        return invalid$2();
      const domains = array(oneOf(["resources", "compositions"]))(data2.domains);
      return { type: data2.type, subscriptionId, domains: [...new Set(domains)] };
    }
    case "task_subscription_ready":
      if (data2.capabilities !== void 0 && (!Array.isArray(data2.capabilities) || data2.capabilities.length > 32 || data2.capabilities.some((capability) => typeof capability !== "string")))
        return invalid$2();
      return {
        type: data2.type,
        subscriptionId,
        ...data2.capabilities === void 0 ? {} : {
          capabilities: data2.capabilities.includes("project_changes") ? ["project_changes"] : []
        }
      };
    case "task_subscription_closed":
      return { type: data2.type, subscriptionId };
    case "task_changed":
      return { type: data2.type, subscriptionId, id: id$1(data2.id), task: parseTaskView(data2.task) };
    case "task_subscription_error":
      return { type: data2.type, subscriptionId, error: parseTaskRequestError(data2.error) };
    default:
      return invalid$2();
  }
}

export { mapProjectTaskSnapshot, parseEditorServerMessage, parseTaskServerMessage };
