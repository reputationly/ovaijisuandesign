// parse-timeline-operations.js
import { hasMediaAnalysisFailure, X$7 } from "../vendor.js";
import {
  categorizeToolAction,
  extractFileChipItems,
  extractSearchChips,
  getToolLabelId,
  hasSuccessfulMediaOutput,
  isGenerationFailureNonTerminal,
  isKnowledgePath,
  isToolRecoveredInterrupted,
  resolveToolInterruption,
} from "../chat/save-chat-rating.js";
const MEDIA_GEN_CATEGORIES$2 = new Set([
  "imageGen",
  "videoGen",
  "videoEdit",
  "audioGen",
  "musicGen",
]);
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
const STANDALONE_TOOL_NAMES = new Set(["question"]);
function isStandaloneMessage(msg) {
  if (msg.type === "text") return true;
  if (msg.type === "sub_agent") return true;
  if (msg.type === "image" || msg.type === "video" || msg.type === "audio") return true;
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
export function groupIntoActivityGroups(messages2, raw2 = false) {
  const result = [];
  let buffer = [];
  const flush2 = () => {
    if (buffer.length === 0) return;
    const visibleBuffer = raw2 ? buffer : dropSupersededLegacyInFlightMediaMessages(buffer);
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
const TIMELINE_OPERATION_TOOL_ALIASES = {
  hub_canvas_apply_text_edits: "canvas_apply_text_edits",
  hub_canvas_group_nodes: "canvas_group_nodes",
  hub_canvas_group_recent_outputs: "canvas_group_recent_outputs",
  hub_canvas_write_node: "canvas_write_node",
  hub_plan_write: "plan_write",
  hub_plan_replan: "plan_replan",
};
function normaliseTimelineOperationToolName(toolName2) {
  if (!toolName2) return void 0;
  return TIMELINE_OPERATION_TOOL_ALIASES[toolName2] ?? toolName2;
}
export function parseJsonRecord(text2) {
  if (!text2) return void 0;
  const trimmed = text2.trim();
  if (!trimmed) return void 0;
  const candidates2 = [trimmed];
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace > 0 && lastBrace > firstBrace) {
    candidates2.push(trimmed.slice(firstBrace, lastBrace + 1));
  }
  for (const candidate of candidates2) {
    const parsed = parseJsonRecordCandidate(candidate);
    if (parsed) return unwrapMcpJsonRecord(parsed);
  }
  return void 0;
}
function parseJsonRecordCandidate(text2) {
  try {
    const parsed = JSON.parse(text2);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return void 0;
    return parsed;
  } catch {
    return void 0;
  }
}
function unwrapMcpJsonRecord(record2) {
  const structured = record2.structuredContent;
  if (structured && typeof structured === "object" && !Array.isArray(structured)) {
    return structured;
  }
  const content2 = record2.content;
  if (Array.isArray(content2)) {
    for (const item of content2) {
      if (!item || typeof item !== "object" || Array.isArray(item)) continue;
      const text2 = item.text;
      if (typeof text2 !== "string") continue;
      const parsed = parseJsonRecord(text2);
      if (parsed) return parsed;
    }
  }
  return record2;
}
function stringField(record2, keys2) {
  if (!record2) return void 0;
  for (const key2 of keys2) {
    const value = record2[key2];
    if (typeof value === "string" && value.trim().length > 0) return value.trim();
  }
  return void 0;
}
function recordField(record2, keys2) {
  if (!record2) return void 0;
  for (const key2 of keys2) {
    const value = record2[key2];
    if (value && typeof value === "object" && !Array.isArray(value)) return value;
  }
  return void 0;
}
function booleanField(record2, keys2) {
  if (!record2) return void 0;
  for (const key2 of keys2) {
    const value = record2[key2];
    if (typeof value === "boolean") return value;
  }
  return void 0;
}
function recordArrayField(record2, keys2) {
  if (!record2) return [];
  for (const key2 of keys2) {
    const value = record2[key2];
    if (!Array.isArray(value)) continue;
    return value.filter((item) => !!item && typeof item === "object" && !Array.isArray(item));
  }
  return [];
}
function basename$1(path2) {
  const trimmed = path2.trim();
  const withoutSlash = trimmed.replace(/[\\/]+$/, "");
  const parts = withoutSlash.split(/[\\/]/);
  return parts[parts.length - 1] || trimmed;
}
function firstDefined(...values3) {
  return values3.find((value) => value && value.trim().length > 0);
}
function nodeIdFrom(args, result) {
  return firstDefined(
    stringField(result, ["nodeId", "node_id"]),
    stringField(args, ["nodeId", "node_id"]),
  );
}
function groupIdFrom(result) {
  return firstDefined(
    stringField(result, ["groupId", "group_id", "addedGroupId", "added_group_id"]),
    stringField(result, ["nodeId", "node_id"]),
  );
}
function assetIdFrom(args, result) {
  return firstDefined(
    stringField(result, ["assetId", "asset_id"]),
    stringField(args, ["assetId", "asset_id"]),
  );
}
function assetPathFrom(args, result) {
  return firstDefined(
    stringField(result, ["assetPath", "asset_path"]),
    stringField(args, ["assetPath", "asset_path"]),
  );
}
function timelineOperationTargetKey(operation) {
  if (operation.targetPlanId) return `plan:${operation.targetPlanId}`;
  if (operation.targetGroupId) return `group:${operation.targetGroupId}`;
  const firstNodeId = operation.targetNodeIds[0];
  return firstNodeId ? `node:${firstNodeId}` : void 0;
}
function mergeTimelineOperations(operations) {
  const merged = [];
  for (const operation of operations) {
    const key2 = timelineOperationTargetKey(operation);
    const previous2 = merged[merged.length - 1];
    if (key2 && previous2 && timelineOperationTargetKey(previous2) === key2) {
      merged[merged.length - 1] = {
        ...operation,
        inputSummary:
          operation.displayNameKnown || !previous2.displayNameKnown
            ? operation.inputSummary
            : previous2.inputSummary,
        displayNameKnown: operation.displayNameKnown || previous2.displayNameKnown,
        count: previous2.count + operation.count,
      };
      continue;
    }
    merged.push(operation);
  }
  return merged;
}
function canvasMediaLabelKey(assetType) {
  switch (assetType) {
    case "image":
      return "chat.canvasOperation.addImage";
    case "video":
      return "chat.canvasOperation.addVideo";
    case "audio":
      return "chat.canvasOperation.addAudio";
    default:
      return "chat.canvasOperation.addMedia";
  }
}
function parseUnifiedCanvasWrite(args, result) {
  if (booleanField(result, ["ok"]) === false) return void 0;
  const kind = firstDefined(stringField(result, ["kind"]), stringField(args, ["kind"]));
  const nodeId = nodeIdFrom(args, result);
  const targetNodeIds = nodeId ? [nodeId] : [];
  switch (kind) {
    case "text": {
      const created = booleanField(result, ["created"]) ?? !stringField(args, ["nodeId"]);
      if (!created) return void 0;
      const path2 = stringField(result, ["path"]);
      const name2 = firstDefined(stringField(args, ["name"]), path2 ? basename$1(path2) : void 0);
      return {
        kind: "text-create",
        labelKey: "chat.canvasOperation.addText",
        activeLabelKey: "chat.canvasOperation.addText.running",
        inputSummary: name2 ?? nodeId ?? "",
        displayNameKnown: !!name2,
        outputSummary: "chat.canvasOperation.status.created",
        targetNodeIds,
        count: 1,
      };
    }
    case "table": {
      const created = booleanField(result, ["created"]) ?? !stringField(args, ["nodeId"]);
      const tablePath = stringField(result, ["tablePath", "table_path"]);
      const name2 = firstDefined(
        stringField(args, ["title", "name"]),
        tablePath ? basename$1(tablePath) : void 0,
      );
      return {
        kind: "table-node",
        labelKey: created ? "chat.canvasOperation.addTable" : "chat.canvasOperation.updateTable",
        inputSummary: name2 ?? nodeId ?? "",
        displayNameKnown: !!name2,
        outputSummary: created
          ? "chat.canvasOperation.status.created"
          : "chat.canvasOperation.status.updated",
        targetNodeIds,
        count: 1,
      };
    }
    case "media": {
      const assetPath = assetPathFrom(args, result);
      const assetType = stringField(result, ["assetType", "asset_type"]);
      const reused = booleanField(result, ["reused"]);
      if (reused) return void 0;
      const name2 = assetPath ? basename$1(assetPath) : void 0;
      return {
        kind: "media-node",
        labelKey: canvasMediaLabelKey(assetType),
        inputSummary: name2 ?? assetType ?? nodeId ?? "",
        displayNameKnown: !!name2,
        outputSummary: "chat.canvasOperation.status.created",
        targetNodeIds,
        targetAssetId: assetIdFrom(args, result),
        targetAssetPath: assetPath,
        count: 1,
      };
    }
    default:
      return void 0;
  }
}
export function parseTimelineOperations(toolName2, toolArgs, toolResult, toolStatus) {
  const normalizedToolName = normaliseTimelineOperationToolName(toolName2);
  if (!normalizedToolName) return [];
  if (
    toolStatus === "error" &&
    (normalizedToolName === "plan_write" || normalizedToolName === "plan_replan")
  ) {
    return [];
  }
  const args = parseJsonRecord(toolArgs);
  const result = parseJsonRecord(toolResult);
  switch (normalizedToolName) {
    case "canvas_write_node": {
      const items = recordArrayField(args, ["items"]);
      if (items.length === 0) {
        const operation = parseUnifiedCanvasWrite(args, result);
        return operation ? [operation] : [];
      }
      const results = recordArrayField(result, ["results"]);
      const resultsByIndex = new Map();
      results.forEach((item, index2) => {
        const explicitIndex = item.index;
        resultsByIndex.set(typeof explicitIndex === "number" ? explicitIndex : index2, item);
      });
      return items.flatMap((item, index2) => {
        const operation = parseUnifiedCanvasWrite(item, resultsByIndex.get(index2));
        return operation ? [operation] : [];
      });
    }
    case "canvas_group_nodes": {
      const label = stringField(args, ["label"]);
      const groupId2 = groupIdFrom(result);
      if (!groupId2) return [];
      return [
        {
          kind: "group-nodes",
          labelKey: "chat.canvasOperation.organizeCanvas",
          inputSummary: label ?? groupId2 ?? "",
          displayNameKnown: !!label,
          outputSummary: "chat.canvasOperation.status.grouped",
          targetNodeIds: [groupId2],
          targetGroupId: groupId2,
          count: 1,
        },
      ];
    }
    case "canvas_group_recent_outputs": {
      const groupId2 = groupIdFrom(result);
      if (!groupId2) return [];
      const label = stringField(args, ["label"]);
      return [
        {
          kind: "group-nodes",
          labelKey: "chat.canvasOperation.organizeCanvas",
          inputSummary: label ?? groupId2 ?? "",
          displayNameKnown: !!label,
          outputSummary: "chat.canvasOperation.status.grouped",
          targetNodeIds: [groupId2],
          targetGroupId: groupId2,
          count: 1,
        },
      ];
    }
    case "plan_write": {
      if (booleanField(result, ["ok"]) === false) return [];
      const planId = firstDefined(stringField(result, ["plan_id"]), stringField(args, ["plan_id"]));
      const plan = recordField(args, ["plan"]);
      const name2 = firstDefined(stringField(plan, ["title"]), stringField(args, ["name"]));
      const created = !stringField(args, ["plan_id"]);
      return [
        {
          kind: "production-plan",
          labelKey: created
            ? "chat.productionPlanOperation.create"
            : "chat.productionPlanOperation.update",
          activeLabelKey: created
            ? "chat.productionPlanOperation.create.running"
            : "chat.productionPlanOperation.update.running",
          inputSummary: name2 ?? "",
          displayNameKnown: !!name2,
          outputSummary: created
            ? "chat.canvasOperation.status.created"
            : "chat.canvasOperation.status.updated",
          targetNodeIds: [],
          targetPlanId: planId,
          count: 1,
        },
      ];
    }
    case "plan_replan": {
      if (booleanField(result, ["ok"]) === false) return [];
      const planId = firstDefined(stringField(result, ["plan_id"]), stringField(args, ["plan_id"]));
      const reason = stringField(args, ["reason"]);
      return [
        {
          kind: "production-plan",
          labelKey: "chat.productionPlanOperation.update",
          activeLabelKey: "chat.productionPlanOperation.update.running",
          inputSummary: reason ?? "",
          displayNameKnown: !!reason,
          outputSummary: "chat.canvasOperation.status.updated",
          targetNodeIds: [],
          targetPlanId: planId,
          count: 1,
        },
      ];
    }
    default:
      return [];
  }
}
export function mergeIntoTimelineEntries(items, options = {}) {
  const { raw: raw2 = false, legacyMediaReconciliationApplied = false } = options;
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
            (!ask.toolConfirmData?.tool || entry.toolName === ask.toolConfirmData.tool),
        );
      if (matchingEntry) {
        if (!ask.resolved) matchingEntry.pendingConfirm = ask;
        else if (ask.toolConfirmDecision === "reject") matchingEntry.rejectedConfirm = ask;
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
function dropSupersededLegacyInFlightMediaMessages(items) {
  const pendingLegacyIndexes = new Map();
  const supersededIndexes = new Set();
  items.forEach((message2, index2) => {
    if (isUnidentifiedInFlightMediaTool(message2)) {
      const key22 = mediaReconciliationKey(message2);
      if (!key22) return;
      const indexes2 = pendingLegacyIndexes.get(key22) ?? [];
      indexes2.push(index2);
      pendingLegacyIndexes.set(key22, indexes2);
      return;
    }
    if (!isIdentifiedSuccessfulMediaTool(message2)) return;
    const key2 = mediaReconciliationKey(message2);
    if (!key2) return;
    const indexes = pendingLegacyIndexes.get(key2);
    const supersededIndex = indexes?.pop();
    if (supersededIndex !== void 0) supersededIndexes.add(supersededIndex);
  });
  return items.filter((_2, index2) => !supersededIndexes.has(index2));
}
function isUnidentifiedInFlightMediaTool(message2) {
  return (
    message2.type === "tool" &&
    !message2.partId &&
    !message2.callID &&
    (message2.toolStatus === "pending" || message2.toolStatus === "running") &&
    MEDIA_GEN_CATEGORIES$2.has(categorizeToolAction(message2.content))
  );
}
function isIdentifiedSuccessfulMediaTool(message2) {
  return (
    message2.type === "tool" &&
    Boolean(message2.partId || message2.callID) &&
    message2.toolStatus === "ok" &&
    hasSuccessfulMediaOutput(message2.toolResult) &&
    MEDIA_GEN_CATEGORIES$2.has(categorizeToolAction(message2.content))
  );
}
function mediaReconciliationKey(message2) {
  const argsIdentity = canonicalToolArgs(message2.toolArgs);
  return argsIdentity ? JSON.stringify([message2.content, argsIdentity]) : void 0;
}
function canonicalToolArgs(toolArgs) {
  const trimmed = toolArgs?.trim();
  if (!trimmed) return void 0;
  try {
    return JSON.stringify(sortJsonValue(JSON.parse(trimmed)));
  } catch {
    return trimmed;
  }
}
function sortJsonValue(value) {
  if (Array.isArray(value)) return value.map(sortJsonValue);
  if (!value || typeof value !== "object") return value;
  const record2 = value;
  return Object.fromEntries(
    Object.keys(record2)
      .sort()
      .map((key2) => [key2, sortJsonValue(record2[key2])]),
  );
}
function mergeAdjacentThinkingEntries(entries2) {
  const merged = [];
  for (const entry of entries2) {
    const previous2 = merged[merged.length - 1];
    if (entry.type !== "thinking" || previous2?.type !== "thinking") {
      merged.push(entry);
      continue;
    }
    const thinkingBlocks = [previous2.thinkingContent, entry.thinkingContent].filter(
      (content2) => !!content2,
    );
    merged[merged.length - 1] = {
      ...previous2,
      thinkingContent:
        thinkingBlocks.length > 0 ? thinkingBlocks.join("\n\n") : previous2.thinkingContent,
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
    for (let operationIndex = operations.length - 1; operationIndex >= 0; operationIndex--) {
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
function dropCoveredMediaFailureEntries(entries2) {
  return entries2.filter((entry, index2) => {
    if (!isCoveredMediaFailure(entry)) return true;
    return !hasLaterSuccessfulMediaRetryEntry(entries2, index2);
  });
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
    if (mediaRetryIdentityFromParts(next2.category, next2.toolName, next2.toolArgs) === identity2) {
      return true;
    }
  }
  return false;
}
function mediaRetryIdentityFromParts(category, toolName2, toolArgs) {
  if (!MEDIA_GEN_CATEGORIES$2.has(category)) return void 0;
  const prompt = extractRetryPrompt(toolArgs);
  if (prompt) return `${category}:prompt:${prompt}`;
  if (toolArgs?.trim()) return `${category}:args:${toolArgs.trim()}`;
  return toolName2 ? `${category}:tool:${toolName2}` : void 0;
}
function extractRetryPrompt(toolArgs) {
  if (!toolArgs) return void 0;
  try {
    const parsed = JSON.parse(toolArgs);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return void 0;
    const record2 = parsed;
    const direct = firstNonEmptyString(
      record2.prompt,
      record2.text,
      record2.input,
      record2.content,
    );
    if (direct) return direct;
    const vendorParams = record2.vendor_params;
    if (vendorParams && typeof vendorParams === "object" && !Array.isArray(vendorParams)) {
      const vendor = vendorParams;
      return firstNonEmptyString(vendor.prompt, vendor.text, vendor.input, vendor.content);
    }
  } catch {}
  return void 0;
}
function firstNonEmptyString(...values3) {
  for (const value of values3) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (trimmed.length > 0) return trimmed;
  }
  return void 0;
}
function aggregateTimelineRuns(entries2) {
  const result = [];
  let i2 = 0;
  const hasConfirm = (entry) => !!entry.pendingConfirm || !!entry.rejectedConfirm;
  const toCountOnlyEntry = (entry, members) => ({
    ...entry,
    toolArgs: void 0,
    toolResult: void 0,
    aggregatedCount: members.length,
    ...(entry.category === "execute"
      ? {
          aggregatedCommands: members.flatMap(({ id: id2, toolArgs }) => {
            const command2 = parseJsonRecord(toolArgs)?.command;
            return typeof command2 === "string" && command2.trim()
              ? [
                  {
                    id: id2,
                    command: command2,
                  },
                ]
              : [];
          }),
        }
      : {}),
    ...(entry.category === "process"
      ? {
          aggregatedProcessSteps: members.map(
            ({ id: id2, toolName: toolName2, toolStatus, toolArgs, toolResult }) => ({
              id: id2,
              toolName: toolName2,
              toolStatus,
              toolArgs,
              toolResult,
            }),
          ),
        }
      : {}),
  });
  const toTimelineOperationEntry = (entry, members) => {
    const operations = [];
    let fallbackCount = 0;
    for (const member of members) {
      const parsed = parseTimelineOperations(
        member.toolName,
        member.toolArgs,
        member.toolResult,
        member.toolStatus,
      );
      if (parsed.length > 0) {
        operations.push(...parsed);
      } else {
        fallbackCount++;
      }
    }
    if (operations.length === 0) {
      const isInFlight = members.some(
        (member) => member.toolStatus === "running" || member.toolStatus === "pending",
      );
      const hasFailure = members.some((member) => member.toolStatus === "error");
      return hasConfirm(entry) || isInFlight || hasFailure
        ? toCountOnlyEntry(entry, members)
        : void 0;
    }
    return {
      ...entry,
      toolArgs: void 0,
      toolResult: void 0,
      aggregatedTimelineOperations: mergeTimelineOperations(operations),
      aggregatedTimelineFallbackCount: fallbackCount > 0 ? fallbackCount : void 0,
    };
  };
  while (i2 < entries2.length) {
    const entry = entries2[i2];
    if (entry.type === "thinking") {
      const thinkingBlocks = [];
      let j2 = i2;
      while (j2 < entries2.length && entries2[j2].type === "thinking") {
        const content2 = entries2[j2].thinkingContent;
        if (content2) thinkingBlocks.push(content2);
        j2++;
      }
      result.push({
        ...entry,
        thinkingContent:
          thinkingBlocks.length > 0 ? thinkingBlocks.join("\n\n") : entry.thinkingContent,
      });
      i2 = j2;
      continue;
    }
    if (entry.type === "tool" && (entry.category === "read" || entry.category === "analyseMedia")) {
      const files = [];
      const seen2 = new Set();
      const preservesLifecycle = entry.category === "analyseMedia";
      const status = preservesLifecycle ? (entry.toolStatus ?? "pending") : "ok";
      let j2 = i2;
      while (
        j2 < entries2.length &&
        entries2[j2].type === "tool" &&
        entries2[j2].category === entry.category &&
        (!preservesLifecycle || (entries2[j2].toolStatus ?? "pending") === status)
      ) {
        const member = entries2[j2];
        for (const item of extractFileChipItems(
          member.toolName ?? "",
          member.toolArgs,
          member.toolResult,
        )) {
          if (isKnowledgePath(item.path)) continue;
          if (seen2.has(item.path)) continue;
          seen2.add(item.path);
          files.push(item);
        }
        j2++;
      }
      if (files.length > 0) {
        result.push({
          ...entry,
          toolStatus: status,
          aggregatedFiles: files,
        });
      }
      i2 = j2;
      continue;
    }
    if (entry.type === "tool" && entry.toolName === "hub_capability_search") {
      result.push(entry);
      i2++;
      continue;
    }
    if (entry.type === "tool" && entry.category === "search") {
      if (entry.toolStatus === "error") {
        result.push(entry);
        i2++;
        continue;
      }
      const chips = [];
      const seen2 = new Set();
      let j2 = i2;
      while (
        j2 < entries2.length &&
        entries2[j2].type === "tool" &&
        entries2[j2].category === "search" &&
        entries2[j2].toolName !== "hub_capability_search" &&
        entries2[j2].toolStatus !== "error"
      ) {
        const member = entries2[j2];
        for (const term of extractSearchChips(
          member.toolName ?? "",
          member.toolArgs,
          member.toolResult,
        )) {
          if (seen2.has(term)) continue;
          seen2.add(term);
          chips.push(term);
        }
        j2++;
      }
      if (chips.length > 0) {
        result.push({
          ...entry,
          toolStatus: "ok",
          aggregatedSearchChips: chips,
        });
      }
      i2 = j2;
      continue;
    }
    if (entry.type === "tool" && (entry.category === "canvas" || entry.category === "plan")) {
      if (hasConfirm(entry)) {
        const operationEntry2 = toTimelineOperationEntry(entry, [entry]);
        if (operationEntry2) result.push(operationEntry2);
        i2++;
        continue;
      }
      const status = entry.toolStatus ?? "pending";
      const members = [entry];
      let j2 = i2 + 1;
      while (
        j2 < entries2.length &&
        entries2[j2].type === "tool" &&
        entries2[j2].category === entry.category &&
        (entries2[j2].toolStatus ?? "pending") === status &&
        !hasConfirm(entries2[j2])
      ) {
        members.push(entries2[j2]);
        j2++;
      }
      const operationEntry = toTimelineOperationEntry(entry, members);
      if (operationEntry) result.push(operationEntry);
      i2 = j2;
      continue;
    }
    if (entry.type === "tool" && (entry.category === "execute" || entry.category === "process")) {
      if (hasConfirm(entry)) {
        result.push(toCountOnlyEntry(entry, [entry]));
        i2++;
        continue;
      }
      const status = entry.toolStatus ?? "pending";
      const members = [entry];
      let j2 = i2 + 1;
      while (
        j2 < entries2.length &&
        entries2[j2].type === "tool" &&
        entries2[j2].category === entry.category &&
        (entries2[j2].toolStatus ?? "pending") === status &&
        !hasConfirm(entries2[j2])
      ) {
        members.push(entries2[j2]);
        j2++;
      }
      result.push(toCountOnlyEntry(entry, members));
      i2 = j2;
      continue;
    }
    result.push(entry);
    i2++;
  }
  return result;
}
export function messageListPropsEqual(prev, next2) {
  if (
    prev.busy !== next2.busy ||
    prev.busyLabel !== next2.busyLabel ||
    prev.focusMessageId !== next2.focusMessageId ||
    prev.isPresented !== next2.isPresented ||
    prev.recovering !== next2.recovering ||
    prev.focusedSessionId !== next2.focusedSessionId ||
    prev.feedbackSessionId !== next2.feedbackSessionId ||
    prev.feedbackWorkspaceDir !== next2.feedbackWorkspaceDir ||
    prev.feedbackWorkspaceId !== next2.feedbackWorkspaceId ||
    prev.onSend !== next2.onSend ||
    prev.onRetry !== next2.onRetry ||
    prev.onFork !== next2.onFork ||
    prev.conversationTail !== next2.conversationTail ||
    prev.turnTails !== next2.turnTails ||
    prev.showTurnArtifacts !== next2.showTurnArtifacts
  ) {
    return false;
  }
  if (prev.messages.length !== next2.messages.length) return false;
  if (prev.messages === next2.messages) return true;
  for (let i2 = prev.messages.length - 1; i2 >= 0; i2--) {
    if (prev.messages[i2] !== next2.messages[i2]) return false;
  }
  return true;
}
export function workflowSourceFromId(workflowId) {
  if (workflowId.startsWith("template:")) return "template";
  if (workflowId.startsWith("user:")) return "user";
  return "unknown";
}
export function WorkspacePage() {
  return null;
}
export const ACTION_VARIANTS = ["default", "outline", "secondary", "ghost", "destructive", "link"];
export const ACTION_PLACEMENTS = ["inline", "separate"];
export const ACTION_ICONS = {
  x: X$7,
};
export const ACTION_ICON_KEYS = ["feedback", "message-square-text", "refresh-cw", "x"];
export const DEFAULT_PAGE_STATE_PREVIEW_SCHEMA = JSON.stringify(
  {
    type: "error",
    reason: "network",
    title: "Unable to load projects",
    description: "Check the layout with several actions.",
    actions: [
      {
        key: "retry",
        icon: "refresh-cw",
        label: "Retry",
        variant: "default",
      },
      {
        key: "feedback",
        icon: "feedback",
        label: "Feedback",
        variant: "outline",
      },
      {
        key: "dismiss",
        label: "Dismiss",
        variant: "link",
        placement: "separate",
      },
    ],
  },
  null,
  2,
);
export function isRecord(value) {
  return typeof value === "object" && value != null && !Array.isArray(value);
}
export function isActionVariant(value) {
  return ACTION_VARIANTS.some((variant) => variant === value);
}
