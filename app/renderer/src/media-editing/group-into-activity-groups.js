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

function isStandaloneMessage(message) {
  if (message.type === "text") return true;
  if (message.type === "sub_agent") return true;
  if (message.type === "image" || message.type === "video" || message.type === "audio")
    return true;
  if (message.type === "error") return true;
  if (message.type === "cancelled") return true;
  if (message.type === "withdrawn") return true;
  if (message.type === "question") return true;
  if (message.type === "loop_guard_ask") return true;
  if (message.type === "file_added") return true;
  if (message.type === "tool_confirm_ask") return true;
  if (message.type === "interact") return true;
  if (message.type === "credit_threshold") return true;
  if (message.type === "compaction_status") return true;
  if (message.type === "tool") {
    const toolName = message.content;
    if (STANDALONE_TOOL_NAMES.has(toolName)) return true;
    if (toolName === "todowrite") return true;
  }
  return false;
}

function hasLaterSuccessfulMediaRetryMessage(items, index) {
  const current = items[index];
  if (!current || current.type !== "tool") return false;
  const currentTool = current;
  const identity = mediaRetryIdentityFromParts(
    categorizeToolAction(currentTool.content),
    currentTool.content,
    currentTool.toolArgs,
  );
  if (!identity) return false;
  for (let candidateIndex = index + 1; candidateIndex < items.length; candidateIndex++) {
    const next = items[candidateIndex];
    if (next.type !== "tool") continue;
    const nextTool = next;
    if (!hasSuccessfulMediaOutput(nextTool.toolResult)) continue;
    if (
      mediaRetryIdentityFromParts(
        categorizeToolAction(nextTool.content),
        nextTool.content,
        nextTool.toolArgs,
      ) === identity
    ) {
      return true;
    }
  }
  return false;
}

function aggregateStatus(items) {
  let hasRunning = false;
  let hasPending = false;
  for (let toolMessageIndex = 0; toolMessageIndex < items.length; toolMessageIndex++) {
    const message = items[toolMessageIndex];
    if (message.type !== "tool") continue;
    const toolMsg = message;
    const status = toolMsg.toolStatus ?? "pending";
    if (
      status === "error" &&
      !isGenerationFailureNonTerminal(toolMsg.toolResult) &&
      !isToolRecoveredInterrupted(toolMsg.toolResult) &&
      !resolveToolInterruption(toolMsg.toolResult, toolMsg.interruption) &&
      !hasSuccessfulMediaOutput(toolMsg.toolResult) &&
      !hasLaterSuccessfulMediaRetryMessage(items, toolMessageIndex)
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

export function groupIntoActivityGroups(messages, raw = false) {
  const result = [];
  let buffer = [];
  const flush = () => {
    if (buffer.length === 0) return;
    const visibleBuffer = raw
      ? buffer
      : dropSupersededLegacyInFlightMediaMessages(buffer);
    const aggregatedStatus = aggregateStatus(visibleBuffer);
    if (
      aggregatedStatus === "ok" &&
      mergeIntoTimelineEntries(visibleBuffer, {
        raw,
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
  for (const message of messages) {
    if (
      message.type === "tool_confirm_ask" &&
      (!message.resolved || message.toolConfirmDecision === "reject")
    ) {
      if (buffer.some((item) => item.type === "tool")) {
        buffer.push(message);
      } else {
        flush();
        result.push({
          kind: "standalone",
          msg: message,
        });
      }
      continue;
    }
    if (isStandaloneMessage(message)) {
      flush();
      result.push({
        kind: "standalone",
        msg: message,
      });
    } else {
      buffer.push(message);
    }
  }
  flush();
  return result;
}
