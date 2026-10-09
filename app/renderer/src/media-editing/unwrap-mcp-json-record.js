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
function parseJsonRecordCandidate(text2) {
  try {
    const parsed = JSON.parse(text2);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      return void 0;
    return parsed;
  } catch {
    return void 0;
  }
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
function unwrapMcpJsonRecord(record2) {
  const structured = record2.structuredContent;
  if (
    structured &&
    typeof structured === "object" &&
    !Array.isArray(structured)
  ) {
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
export function timelineOperationTargetKey(operation) {
  if (operation.targetPlanId) return `plan:${operation.targetPlanId}`;
  if (operation.targetGroupId) return `group:${operation.targetGroupId}`;
  const firstNodeId = operation.targetNodeIds[0];
  return firstNodeId ? `node:${firstNodeId}` : void 0;
}
function isUnidentifiedInFlightMediaTool(message2) {
  return (
    message2.type === "tool" &&
    !message2.partId &&
    !message2.callID &&
    (message2.toolStatus === "pending" || message2.toolStatus === "running") &&
    MEDIA_GEN_CATEGORIES.has(categorizeToolAction(message2.content))
  );
}
function isIdentifiedSuccessfulMediaTool(message2) {
  return (
    message2.type === "tool" &&
    Boolean(message2.partId || message2.callID) &&
    message2.toolStatus === "ok" &&
    hasSuccessfulMediaOutput(message2.toolResult) &&
    MEDIA_GEN_CATEGORIES.has(categorizeToolAction(message2.content))
  );
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
function canonicalToolArgs(toolArgs) {
  const trimmed = toolArgs?.trim();
  if (!trimmed) return void 0;
  try {
    return JSON.stringify(sortJsonValue(JSON.parse(trimmed)));
  } catch {
    return trimmed;
  }
}
function mediaReconciliationKey(message2) {
  const argsIdentity = canonicalToolArgs(message2.toolArgs);
  return argsIdentity
    ? JSON.stringify([message2.content, argsIdentity])
    : void 0;
}
export function dropSupersededLegacyInFlightMediaMessages(items) {
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
function firstNonEmptyString(...values3) {
  for (const value of values3) {
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
    const record2 = parsed;
    const direct = firstNonEmptyString(
      record2.prompt,
      record2.text,
      record2.input,
      record2.content,
    );
    if (direct) return direct;
    const vendorParams = record2.vendor_params;
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
export function mediaRetryIdentityFromParts(category, toolName2, toolArgs) {
  if (!MEDIA_GEN_CATEGORIES.has(category)) return void 0;
  const prompt = extractRetryPrompt(toolArgs);
  if (prompt) return `${category}:prompt:${prompt}`;
  if (toolArgs?.trim()) return `${category}:args:${toolArgs.trim()}`;
  return toolName2 ? `${category}:tool:${toolName2}` : void 0;
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
