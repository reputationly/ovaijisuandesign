// unwrap-mcp-json-record.js
import {
  categorizeToolAction,
  hasSuccessfulMediaOutput,
} from "../chat/has-structured-success-payload.js";
export const MEDIA_GEN_CATEGORIES = new Set([
  "imageGen",
  "videoGen",
  "videoEdit",
  "audioGen",
  "musicGen",
]);
function parseJsonRecordCandidate(text) {
  try {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      return void 0;
    return parsed;
  } catch {
    return void 0;
  }
}
export function parseJsonRecord(text) {
  if (!text) return void 0;
  const trimmed = text.trim();
  if (!trimmed) return void 0;
  const candidates = [trimmed];
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace > 0 && lastBrace > firstBrace) {
    candidates.push(trimmed.slice(firstBrace, lastBrace + 1));
  }
  for (const candidate of candidates) {
    const parsed = parseJsonRecordCandidate(candidate);
    if (parsed) return unwrapMcpJsonRecord(parsed);
  }
  return void 0;
}
function unwrapMcpJsonRecord(record) {
  const structured = record.structuredContent;
  if (
    structured &&
    typeof structured === "object" &&
    !Array.isArray(structured)
  ) {
    return structured;
  }
  const content = record.content;
  if (Array.isArray(content)) {
    for (const item of content) {
      if (!item || typeof item !== "object" || Array.isArray(item)) continue;
      const text = item.text;
      if (typeof text !== "string") continue;
      const parsed = parseJsonRecord(text);
      if (parsed) return parsed;
    }
  }
  return record;
}
export function timelineOperationTargetKey(operation) {
  if (operation.targetPlanId) return `plan:${operation.targetPlanId}`;
  if (operation.targetGroupId) return `group:${operation.targetGroupId}`;
  const firstNodeId = operation.targetNodeIds[0];
  return firstNodeId ? `node:${firstNodeId}` : void 0;
}
function isUnidentifiedInFlightMediaTool(message) {
  return (
    message.type === "tool" &&
    !message.partId &&
    !message.callID &&
    (message.toolStatus === "pending" || message.toolStatus === "running") &&
    MEDIA_GEN_CATEGORIES.has(categorizeToolAction(message.content))
  );
}
function isIdentifiedSuccessfulMediaTool(message) {
  return (
    message.type === "tool" &&
    Boolean(message.partId || message.callID) &&
    message.toolStatus === "ok" &&
    hasSuccessfulMediaOutput(message.toolResult) &&
    MEDIA_GEN_CATEGORIES.has(categorizeToolAction(message.content))
  );
}
function sortJsonValue(value) {
  if (Array.isArray(value)) return value.map(sortJsonValue);
  if (!value || typeof value !== "object") return value;
  const record = value;
  return Object.fromEntries(
    Object.keys(record)
      .sort()
      .map((key) => [key, sortJsonValue(record[key])]),
  );
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
function mediaReconciliationKey(message) {
  const argsIdentity = canonicalToolArgs(message.toolArgs);
  return argsIdentity
    ? JSON.stringify([message.content, argsIdentity])
    : void 0;
}
export function dropSupersededLegacyInFlightMediaMessages(items) {
  const pendingLegacyIndexes = new Map();
  const supersededIndexes = new Set();
  items.forEach((message, index) => {
    if (isUnidentifiedInFlightMediaTool(message)) {
      const legacyKey = mediaReconciliationKey(message);
      if (!legacyKey) return;
      const legacyIndexes = pendingLegacyIndexes.get(legacyKey) ?? [];
      legacyIndexes.push(index);
      pendingLegacyIndexes.set(legacyKey, legacyIndexes);
      return;
    }
    if (!isIdentifiedSuccessfulMediaTool(message)) return;
    const key = mediaReconciliationKey(message);
    if (!key) return;
    const indexes = pendingLegacyIndexes.get(key);
    const supersededIndex = indexes?.pop();
    if (supersededIndex !== void 0) supersededIndexes.add(supersededIndex);
  });
  return items.filter((_2, index) => !supersededIndexes.has(index));
}
function firstNonEmptyString(...values) {
  for (const value of values) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (trimmed.length > 0) return trimmed;
  }
  return void 0;
}
function extractRetryPrompt(toolArgs) {
  if (!toolArgs) return void 0;
  try {
    const parsed = JSON.parse(toolArgs);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      return void 0;
    const record = parsed;
    const direct = firstNonEmptyString(
      record.prompt,
      record.text,
      record.input,
      record.content,
    );
    if (direct) return direct;
    const vendorParams = record.vendor_params;
    if (
      vendorParams &&
      typeof vendorParams === "object" &&
      !Array.isArray(vendorParams)
    ) {
      const vendor = vendorParams;
      return firstNonEmptyString(
        vendor.prompt,
        vendor.text,
        vendor.input,
        vendor.content,
      );
    }
  } catch {}
  return void 0;
}
export function mediaRetryIdentityFromParts(category, toolName, toolArgs) {
  if (!MEDIA_GEN_CATEGORIES.has(category)) return void 0;
  const prompt = extractRetryPrompt(toolArgs);
  if (prompt) return `${category}:prompt:${prompt}`;
  if (toolArgs?.trim()) return `${category}:args:${toolArgs.trim()}`;
  return toolName ? `${category}:tool:${toolName}` : void 0;
}
export function workflowSourceFromId(workflowId) {
  if (workflowId.startsWith("template:")) return "template";
  if (workflowId.startsWith("user:")) return "user";
  return "unknown";
}
export function WorkspacePage() {
  return null;
}
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
