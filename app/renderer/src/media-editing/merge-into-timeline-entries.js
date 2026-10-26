// merge-into-timeline-entries.js
import {
  dropSupersededLegacyInFlightMediaMessages,
  MEDIA_GEN_CATEGORIES,
  mediaRetryIdentityFromParts,
  timelineOperationTargetKey,
} from "./unwrap-mcp-json-record.js";
import {
  categorizeToolAction,
  getToolLabelId,
  hasSuccessfulMediaOutput,
  isToolRecoveredInterrupted,
} from "../chat/has-structured-success-payload.js";
import { designToolPresentation, hasDesignToolProblem } from "../chat/design-tool-state.js";
import { hasMediaAnalysisFailure } from "../chat/media-tool-result.js";
import { aggregateTimelineRuns } from "./aggregate-timeline-runs.js";
function mergeAdjacentThinkingEntries(entries) {
  const merged = [];
  for (const entry of entries) {
    const previous = merged[merged.length - 1];
    if (entry.type !== "thinking" || previous?.type !== "thinking") {
      merged.push(entry);
      continue;
    }
    const thinkingBlocks = [
      previous.thinkingContent,
      entry.thinkingContent,
    ].filter((content) => !!content);
    merged[merged.length - 1] = {
      ...previous,
      thinkingContent:
        thinkingBlocks.length > 0
          ? thinkingBlocks.join("\n\n")
          : previous.thinkingContent,
    };
  }
  return merged;
}
function normalizeTimelineOperationEntries(entries) {
  const displayNames = new Map();
  for (const entry of entries) {
    for (const operation of entry.aggregatedTimelineOperations ?? []) {
      const key = timelineOperationTargetKey(operation);
      if (key && operation.displayNameKnown && operation.inputSummary) {
        displayNames.set(key, operation.inputSummary);
      }
    }
  }
  const seenTargets = new Set();
  const normalized = [...entries];
  for (let entryIndex = normalized.length - 1; entryIndex >= 0; entryIndex--) {
    const entry = normalized[entryIndex];
    const operations = entry.aggregatedTimelineOperations;
    if (!operations) continue;
    const kept = [];
    for (
      let operationIndex = operations.length - 1;
      operationIndex >= 0;
      operationIndex--
    ) {
      const operation = operations[operationIndex];
      const key = timelineOperationTargetKey(operation);
      if (key && seenTargets.has(key)) continue;
      if (key) seenTargets.add(key);
      const knownName = key ? displayNames.get(key) : void 0;
      kept.unshift(
        knownName && !operation.displayNameKnown
          ? {
              ...operation,
              inputSummary: knownName,
              displayNameKnown: true,
            }
          : operation,
      );
    }
    normalized[entryIndex] = {
      ...entry,
      aggregatedTimelineOperations: kept,
    };
  }
  return normalized.filter(
    (entry) =>
      entry.category !== "canvas" ||
      !!entry.pendingConfirm ||
      !!entry.rejectedConfirm ||
      !!entry.aggregatedCount ||
      !!entry.aggregatedTimelineOperations?.length,
  );
}
function isCoveredMediaFailure(entry) {
  return (
    entry.type === "tool" &&
    MEDIA_GEN_CATEGORIES.has(entry.category) &&
    entry.toolStatus === "error" &&
    !entry.rejectedConfirm &&
    !isToolRecoveredInterrupted(entry.toolResult) &&
    !hasSuccessfulMediaOutput(entry.toolResult)
  );
}
function hasLaterSuccessfulMediaRetryEntry(entries, index) {
  const current = entries[index];
  if (!current || current.type !== "tool") return false;
  const identity = mediaRetryIdentityFromParts(
    current.category,
    current.toolName,
    current.toolArgs,
  );
  if (!identity) return false;
  for (let i = index + 1; i < entries.length; i++) {
    const next = entries[i];
    if (next.type !== "tool") continue;
    if (!hasSuccessfulMediaOutput(next.toolResult)) continue;
    if (
      mediaRetryIdentityFromParts(
        next.category,
        next.toolName,
        next.toolArgs,
      ) === identity
    ) {
      return true;
    }
  }
  return false;
}
function dropCoveredMediaFailureEntries(entries) {
  return entries.filter((entry, index) => {
    if (!isCoveredMediaFailure(entry)) return true;
    return !hasLaterSuccessfulMediaRetryEntry(entries, index);
  });
}
export function mergeIntoTimelineEntries(items, options = {}) {
  const { raw = false, legacyMediaReconciliationApplied = false } =
    options;
  const entries = [];
  const visibleItems =
    raw || legacyMediaReconciliationApplied
      ? items
      : dropSupersededLegacyInFlightMediaMessages(items);
  for (const message of visibleItems) {
    if (message.type === "thinking") {
      entries.push({
        id: message.id,
        type: "thinking",
        category: "thinking",
        label: "",
        thinkingContent: message.content,
      });
      continue;
    }
    if (message.type === "tool") {
      const toolMsg = message;
      const toolName = toolMsg.content;
      // 4.0.4：这两个判断都要带上整条消息 —— `designToolPresentation` 要看 toolArgs/output
      // 才能判断"这条工具该不该出现"，只看名字会漏掉 skill 加载与 design 工具的特殊呈现。
      if (!raw && getToolLabelId(toolName, toolMsg) === "silent") continue;
      const category = categorizeToolAction(toolName, toolMsg.toolArgs);
      entries.push({
        id: message.id,
        type: "tool",
        category,
        label: toolName,
        toolName,
        // 4.0.4 两个字段都写：卡片读 `callID`（参照的写法），别处读 `toolCallId`。
        // 我们原来只写了 `toolCallId`，卡片读 `entry.callID` 永远 undefined ——
        // `useDesignTask` 的 enabled 要求 `taskId || callID`，于是查询根本没打开。
        callID: toolMsg.callID,
        toolCallId: toolMsg.callID,
        toolStatus:
          designToolPresentation(toolName, toolMsg) && hasDesignToolProblem(toolMsg)
            ? "error"
            : category === "analyseMedia" &&
                toolMsg.toolStatus === "ok" &&
                hasMediaAnalysisFailure(toolMsg.toolResult)
              ? "error"
              : toolMsg.toolStatus,
        toolArgs: toolMsg.toolArgs,
        toolResult: toolMsg.toolResult,
        interruption: toolMsg.interruption,
        generationHandoffTargets: toolMsg.generationHandoffTargets,
        comfyUiProgress: toolMsg.comfyUiProgress,
      });
      continue;
    }
    if (
      message.type === "tool_confirm_ask" &&
      (!message.resolved || message.toolConfirmDecision === "reject")
    ) {
      const confirmationRequest = message;
      const matchingEntry = [...entries]
        .reverse()
        .find(
          (entry) =>
            entry.type === "tool" &&
            (!confirmationRequest.toolConfirmData?.tool ||
              entry.toolName === confirmationRequest.toolConfirmData.tool),
        );
      if (matchingEntry) {
        if (!confirmationRequest.resolved) matchingEntry.pendingConfirm = confirmationRequest;
        else if (confirmationRequest.toolConfirmDecision === "reject")
          matchingEntry.rejectedConfirm = confirmationRequest;
      }
    }
  }
  if (raw) return entries;
  return mergeAdjacentThinkingEntries(
    normalizeTimelineOperationEntries(
      aggregateTimelineRuns(dropCoveredMediaFailureEntries(entries)),
    ),
  );
}
