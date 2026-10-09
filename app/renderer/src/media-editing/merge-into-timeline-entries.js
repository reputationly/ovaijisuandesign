// merge-into-timeline-entries.js
import {
  dropSupersededLegacyInFlightMediaMessages,
  MEDIA_GEN_CATEGORIES$2,
  mediaRetryIdentityFromParts,
  timelineOperationTargetKey,
} from "./unwrap-mcp-json-record.js";
import {
  categorizeToolAction,
  getToolLabelId,
  hasSuccessfulMediaOutput,
  isToolRecoveredInterrupted,
} from "../chat/has-structured-success-payload.js";
import { hasMediaAnalysisFailure } from "../vendor.js";
import { aggregateTimelineRuns } from "./aggregate-timeline-runs.js";

function mergeAdjacentThinkingEntries(entries2) {
  const merged = [];
  for (const entry of entries2) {
    const previous2 = merged[merged.length - 1];
    if (entry.type !== "thinking" || previous2?.type !== "thinking") {
      merged.push(entry);
      continue;
    }
    const thinkingBlocks = [
      previous2.thinkingContent,
      entry.thinkingContent,
    ].filter((content2) => !!content2);
    merged[merged.length - 1] = {
      ...previous2,
      thinkingContent:
        thinkingBlocks.length > 0
          ? thinkingBlocks.join("\n\n")
          : previous2.thinkingContent,
    };
  }
  return merged;
}

function normalizeTimelineOperationEntries(entries2) {
  const displayNames = new Map();
  for (const entry of entries2) {
    for (const operation of entry.aggregatedTimelineOperations ?? []) {
      const key2 = timelineOperationTargetKey(operation);
      if (key2 && operation.displayNameKnown && operation.inputSummary) {
        displayNames.set(key2, operation.inputSummary);
      }
    }
  }
  const seenTargets = new Set();
  const normalized = [...entries2];
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
      const key2 = timelineOperationTargetKey(operation);
      if (key2 && seenTargets.has(key2)) continue;
      if (key2) seenTargets.add(key2);
      const knownName = key2 ? displayNames.get(key2) : void 0;
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
    MEDIA_GEN_CATEGORIES$2.has(entry.category) &&
    entry.toolStatus === "error" &&
    !entry.rejectedConfirm &&
    !isToolRecoveredInterrupted(entry.toolResult) &&
    !hasSuccessfulMediaOutput(entry.toolResult)
  );
}

function hasLaterSuccessfulMediaRetryEntry(entries2, index2) {
  const current2 = entries2[index2];
  if (!current2 || current2.type !== "tool") return false;
  const identity2 = mediaRetryIdentityFromParts(
    current2.category,
    current2.toolName,
    current2.toolArgs,
  );
  if (!identity2) return false;
  for (let i2 = index2 + 1; i2 < entries2.length; i2++) {
    const next2 = entries2[i2];
    if (next2.type !== "tool") continue;
    if (!hasSuccessfulMediaOutput(next2.toolResult)) continue;
    if (
      mediaRetryIdentityFromParts(
        next2.category,
        next2.toolName,
        next2.toolArgs,
      ) === identity2
    ) {
      return true;
    }
  }
  return false;
}

function dropCoveredMediaFailureEntries(entries2) {
  return entries2.filter((entry, index2) => {
    if (!isCoveredMediaFailure(entry)) return true;
    return !hasLaterSuccessfulMediaRetryEntry(entries2, index2);
  });
}

export function mergeIntoTimelineEntries(items, options = {}) {
  const { raw: raw2 = false, legacyMediaReconciliationApplied = false } =
    options;
  const entries2 = [];
  const visibleItems =
    raw2 || legacyMediaReconciliationApplied
      ? items
      : dropSupersededLegacyInFlightMediaMessages(items);
  for (const msg of visibleItems) {
    if (msg.type === "thinking") {
      entries2.push({
        id: msg.id,
        type: "thinking",
        category: "thinking",
        label: "",
        thinkingContent: msg.content,
      });
      continue;
    }
    if (msg.type === "tool") {
      const toolMsg = msg;
      const toolName2 = toolMsg.content;
      if (!raw2 && getToolLabelId(toolName2) === "silent") continue;
      const cat = categorizeToolAction(toolName2);
      entries2.push({
        id: msg.id,
        type: "tool",
        category: cat,
        label: toolName2,
        toolName: toolName2,
        toolCallId: toolMsg.callID,
        toolStatus:
          cat === "analyseMedia" &&
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
      msg.type === "tool_confirm_ask" &&
      (!msg.resolved || msg.toolConfirmDecision === "reject")
    ) {
      const ask = msg;
      const matchingEntry = [...entries2]
        .reverse()
        .find(
          (entry) =>
            entry.type === "tool" &&
            (!ask.toolConfirmData?.tool ||
              entry.toolName === ask.toolConfirmData.tool),
        );
      if (matchingEntry) {
        if (!ask.resolved) matchingEntry.pendingConfirm = ask;
        else if (ask.toolConfirmDecision === "reject")
          matchingEntry.rejectedConfirm = ask;
      }
    }
  }
  if (raw2) return entries2;
  return mergeAdjacentThinkingEntries(
    normalizeTimelineOperationEntries(
      aggregateTimelineRuns(dropCoveredMediaFailureEntries(entries2)),
    ),
  );
}
