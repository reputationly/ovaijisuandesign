// task-result-authored-stage-id.js
import {
  parseJsonObject,
  toolName,
} from "../text-editor/skill-reload-dock.jsx";

function containsExactId(serialized, id2) {
  return serialized.includes(id2);
}

function recordStageId(value) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return void 0;
  const record2 = value;
  const id2 = record2.stage_id ?? record2.id;
  return typeof id2 === "string" ? id2 : void 0;
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
    const record2 = operation;
    if (record2.type !== "revise_stage" && record2.type !== "insert_stage")
      return false;
    return (
      recordStageId(record2.stage) === stageId || record2.stage_id === stageId
    );
  });
}

function normalizedWriterToolName(message2) {
  const raw2 = toolName(message2).split(":", 1)[0]?.trim() ?? "";
  return raw2.startsWith("hub_") ? raw2.slice(4) : raw2;
}

function taskResultContainsAuthoredStage(message2, stageId) {
  return [
    "toolResult" in message2 ? message2.toolResult : void 0,
    message2.content,
  ].some((value) => {
    if (!value) return false;
    return taskResultAuthoredStageId(value) === stageId;
  });
}

function messageContainsStageContractWrite(message2, stageId) {
  if (message2.type === "sub_agent") {
    return Boolean(
      message2.subMessages?.some((nested) =>
        messageContainsStageContractWrite(nested, stageId),
      ),
    );
  }
  if (message2.type !== "tool") return false;
  const name2 = normalizedWriterToolName(message2);
  if (name2 === "task")
    return taskResultContainsAuthoredStage(message2, stageId);
  if (
    name2 !== "plan_write" &&
    name2 !== "plan_patch_stage" &&
    name2 !== "plan_replan"
  ) {
    return false;
  }
  for (const value of [
    "toolArgs" in message2 ? message2.toolArgs : void 0,
    "args" in message2 ? message2.args : void 0,
    "url" in message2 ? message2.url : void 0,
    message2.content,
  ]) {
    const args = parseJsonObject(value);
    if (args && writerArgsContainStage(name2, args, stageId)) return true;
  }
  return false;
}

export function findStageReviewAnchorMessageId(messages2, planId, stageId) {
  for (let index2 = messages2.length - 1; index2 >= 0; index2 -= 1) {
    const message2 = messages2[index2];
    if (!message2) continue;
    if (message2.role === "user") continue;
    const serialized = JSON.stringify(message2);
    if (
      containsExactId(serialized, planId) &&
      messageContainsStageContractWrite(message2, stageId)
    ) {
      return message2.id;
    }
  }
  return void 0;
}
