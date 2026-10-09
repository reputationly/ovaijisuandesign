// group-into-activity-groups.js
import {
  dropSupersededLegacyInFlightMediaMessages,
  mediaRetryIdentityFromParts,
} from "./unwrap-mcp-json-record.js";
import {
  categorizeToolAction,
  hasSuccessfulMediaOutput,
  isGenerationFailureNonTerminal,
  isToolRecoveredInterrupted,
  resolveToolInterruption,
} from "../chat/has-structured-success-payload.js";
import { mergeIntoTimelineEntries } from "./merge-into-timeline-entries.js";

const STANDALONE_TOOL_NAMES = new Set(["question"]);

function isStandaloneMessage(msg) {
  if (msg.type === "text") return true;
  if (msg.type === "sub_agent") return true;
  if (msg.type === "image" || msg.type === "video" || msg.type === "audio")
    return true;
  if (msg.type === "error") return true;
  if (msg.type === "cancelled") return true;
  if (msg.type === "withdrawn") return true;
  if (msg.type === "question") return true;
  if (msg.type === "loop_guard_ask") return true;
  if (msg.type === "file_added") return true;
  if (msg.type === "tool_confirm_ask") return true;
  if (msg.type === "interact") return true;
  if (msg.type === "credit_threshold") return true;
  if (msg.type === "compaction_status") return true;
  if (msg.type === "tool") {
    const toolName2 = msg.content;
    if (STANDALONE_TOOL_NAMES.has(toolName2)) return true;
    if (toolName2 === "todowrite") return true;
  }
  return false;
}

function hasLaterSuccessfulMediaRetryMessage(items, index2) {
  const current2 = items[index2];
  if (!current2 || current2.type !== "tool") return false;
  const currentTool = current2;
  const identity2 = mediaRetryIdentityFromParts(
    categorizeToolAction(currentTool.content),
    currentTool.content,
    currentTool.toolArgs,
  );
  if (!identity2) return false;
  for (let i2 = index2 + 1; i2 < items.length; i2++) {
    const next2 = items[i2];
    if (next2.type !== "tool") continue;
    const nextTool = next2;
    if (!hasSuccessfulMediaOutput(nextTool.toolResult)) continue;
    if (
      mediaRetryIdentityFromParts(
        categorizeToolAction(nextTool.content),
        nextTool.content,
        nextTool.toolArgs,
      ) === identity2
    ) {
      return true;
    }
  }
  return false;
}

function aggregateStatus(items) {
  let hasRunning = false;
  let hasPending = false;
  for (let i2 = 0; i2 < items.length; i2++) {
    const msg = items[i2];
    if (msg.type !== "tool") continue;
    const toolMsg = msg;
    const status = toolMsg.toolStatus ?? "pending";
    if (
      status === "error" &&
      !isGenerationFailureNonTerminal(toolMsg.toolResult) &&
      !isToolRecoveredInterrupted(toolMsg.toolResult) &&
      !resolveToolInterruption(toolMsg.toolResult, toolMsg.interruption) &&
      !hasSuccessfulMediaOutput(toolMsg.toolResult) &&
      !hasLaterSuccessfulMediaRetryMessage(items, i2)
    ) {
      return "error";
    }
    if (status === "running") hasRunning = true;
    else if (status === "pending") hasPending = true;
  }
  if (hasRunning) return "running";
  if (hasPending) return "pending";
  return "ok";
}

export function groupIntoActivityGroups(messages2, raw2 = false) {
  const result = [];
  let buffer = [];
  const flush2 = () => {
    if (buffer.length === 0) return;
    const visibleBuffer = raw2
      ? buffer
      : dropSupersededLegacyInFlightMediaMessages(buffer);
    const aggregatedStatus = aggregateStatus(visibleBuffer);
    if (
      aggregatedStatus === "ok" &&
      mergeIntoTimelineEntries(visibleBuffer, {
        raw: raw2,
        legacyMediaReconciliationApplied: true,
      }).length === 0
    ) {
      buffer = [];
      return;
    }
    result.push({
      kind: "activity-group",
      items: visibleBuffer,
      aggregatedStatus,
      legacyMediaReconciliationApplied: true,
    });
    buffer = [];
  };
  for (const msg of messages2) {
    if (
      msg.type === "tool_confirm_ask" &&
      (!msg.resolved || msg.toolConfirmDecision === "reject")
    ) {
      if (buffer.some((item) => item.type === "tool")) {
        buffer.push(msg);
      } else {
        flush2();
        result.push({
          kind: "standalone",
          msg,
        });
      }
      continue;
    }
    if (isStandaloneMessage(msg)) {
      flush2();
      result.push({
        kind: "standalone",
        msg,
      });
    } else {
      buffer.push(msg);
    }
  }
  flush2();
  return result;
}
