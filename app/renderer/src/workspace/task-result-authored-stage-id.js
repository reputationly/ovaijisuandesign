// task-result-authored-stage-id.js
import {
  parseJsonObject,
  toolName,
} from "../text-editor/skill-reload-dock.jsx";

function containsExactId(serialized, targetId) {
  return serialized.includes(targetId);
}

function recordStageId(value) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return void 0;
  const record = value;
  const stageId = record.stage_id ?? record.id;
  return typeof stageId === "string" ? stageId : void 0;
}

function taskResultAuthoredStageId(value) {
  const parsed = parseJsonObject(value);
  if (parsed) {
    if ("stage_change" in parsed || "stages" in parsed) {
      const stageChange = parsed.stage_change;
      if (
        stageChange &&
        typeof stageChange === "object" &&
        !Array.isArray(stageChange)
      ) {
        const authoredStageId = stageChange.authored_stage_id;
        if (typeof authoredStageId === "string" && authoredStageId.trim()) {
          return authoredStageId.trim();
        }
      }
      const stages = parsed.stages;
      if (!Array.isArray(stages) || stages.length !== 1) return void 0;
      return recordStageId(stages[0]);
    }
  }
  const normalized = value.replaceAll("\\n", "\n");
  const stageChangeBlock = normalized.match(
    /(?:^|\n)stage_change:\s*\n([\s\S]*?)(?=\n\S|$)/,
  )?.[1];
  if (stageChangeBlock) {
    const authoredMatch = stageChangeBlock.match(
      /(?:^|\n)\s*authored_stage_id:\s*["']?([^"'\\\n]+)["']?(?:\s|$)/,
    );
    const authoredStageId = authoredMatch?.[1]?.trim();
    if (authoredStageId) return authoredStageId;
  }
  const stagesBlock = normalized.match(
    /(?:^|\n)stages:\s*\n([\s\S]*?)(?=\n\S|$)/,
  )?.[1];
  if (!stagesBlock) return void 0;
  const stageEntries = stagesBlock.match(/(?:^|\n)\s*-\s+/g);
  if (!stageEntries || stageEntries.length !== 1) return void 0;
  const stageIdMatch = stagesBlock.match(
    /(?:^|\n)\s*-?\s*(?:stage_id|id):\s*["']?([^"'\\\n]+)["']?(?:\s|$)/,
  );
  return stageIdMatch?.[1]?.trim();
}

function writerArgsContainStage(toolNameValue, args, stageId) {
  if (toolNameValue === "plan_write") {
    const plan = args.plan;
    if (!plan || typeof plan !== "object" || Array.isArray(plan)) return false;
    const stages = plan.stages;
    return (
      Array.isArray(stages) &&
      stages.some((stage) => recordStageId(stage) === stageId)
    );
  }
  if (toolNameValue === "plan_patch_stage") {
    return recordStageId(args.stage) === stageId || args.stage_id === stageId;
  }
  if (toolNameValue !== "plan_replan") return false;
  const operations = args.operations;
  if (!Array.isArray(operations)) return false;
  return operations.some((operation) => {
    if (!operation || typeof operation !== "object" || Array.isArray(operation))
      return false;
    const record = operation;
    if (record.type !== "revise_stage" && record.type !== "insert_stage")
      return false;
    return (
      recordStageId(record.stage) === stageId || record.stage_id === stageId
    );
  });
}

function normalizedWriterToolName(message) {
  const raw = toolName(message).split(":", 1)[0]?.trim() ?? "";
  return raw.startsWith("hub_") ? raw.slice(4) : raw;
}

function taskResultContainsAuthoredStage(message, stageId) {
  return [
    "toolResult" in message ? message.toolResult : void 0,
    message.content,
  ].some((value) => {
    if (!value) return false;
    return taskResultAuthoredStageId(value) === stageId;
  });
}

function messageContainsStageContractWrite(message, stageId) {
  if (message.type === "sub_agent") {
    return Boolean(
      message.subMessages?.some((nested) =>
        messageContainsStageContractWrite(nested, stageId),
      ),
    );
  }
  if (message.type !== "tool") return false;
  const toolName = normalizedWriterToolName(message);
  if (toolName === "task")
    return taskResultContainsAuthoredStage(message, stageId);
  if (
    toolName !== "plan_write" &&
    toolName !== "plan_patch_stage" &&
    toolName !== "plan_replan"
  ) {
    return false;
  }
  for (const value of [
    "toolArgs" in message ? message.toolArgs : void 0,
    "args" in message ? message.args : void 0,
    "url" in message ? message.url : void 0,
    message.content,
  ]) {
    const args = parseJsonObject(value);
    if (args && writerArgsContainStage(toolName, args, stageId)) return true;
  }
  return false;
}

export function findStageReviewAnchorMessageId(messages, planId, stageId) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (!message) continue;
    if (message.role === "user") continue;
    const serialized = JSON.stringify(message);
    if (
      containsExactId(serialized, planId) &&
      messageContainsStageContractWrite(message, stageId)
    ) {
      return message.id;
    }
  }
  return void 0;
}
