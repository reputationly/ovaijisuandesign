// create-history-sub-agent-message.js
import { findLastIndex } from "../infra/find-last-index.js";

function isRecord$c(value) {
  return !!value && typeof value === "object";
}

export function optionalStringField(value, key) {
  if (!isRecord$c(value)) return void 0;
  const field = value[key];
  return typeof field === "string" && field.length > 0 ? field : void 0;
}

export function serverToolName(value) {
  return (
    optionalStringField(value, "tool") ?? optionalStringField(value, "name")
  );
}

export function serverCallID(value) {
  return optionalStringField(value, "callID");
}

function normalizeToolStatus(status) {
  return status === "pending" ||
    status === "running" ||
    status === "ok" ||
    status === "error"
    ? status
    : void 0;
}

const ERROR_RESULT_PATTERN =
  /(?:\b\w+Error:|\bError:|\bException:|\bfailed\b|\bfailure\b|\brejected\b|\bdenied\b|\bblocked\b|\btimeout\b|timed out|quota|violat|unauthori[sz]ed|forbidden|not available|\baborted?\b|\bcancell?ed\b)/i;

const ERROR_PREFIX_PATTERN = /^\s*\w*(?:Error|Exception)\s*:/i;

const MAX_KEYWORD_SCAN_LENGTH = 200;

function looksLikeFailureText(text) {
  if (ERROR_PREFIX_PATTERN.test(text)) return true;
  return (
    text.length <= MAX_KEYWORD_SCAN_LENGTH && ERROR_RESULT_PATTERN.test(text)
  );
}

function isFailureResultContent(content) {
  const trimmed = content.trim();
  if (!trimmed) return false;
  try {
    const parsed = JSON.parse(trimmed);
    if (!isRecord$c(parsed))
      return typeof parsed === "string" && looksLikeFailureText(parsed);
    if (
      parsed.is_error === true ||
      parsed.ok === false ||
      parsed.success === false
    )
      return true;
    return ["error", "message", "reason", "detail"].some((key) => {
      const value = parsed[key];
      return typeof value === "string" && ERROR_RESULT_PATTERN.test(value);
    });
  } catch {
    return looksLikeFailureText(trimmed);
  }
}

export function inferToolResultStatus(content, explicitStatus) {
  const status = normalizeToolStatus(explicitStatus);
  if (status) return status;
  return isFailureResultContent(content) ? "error" : "ok";
}

export function toolNameFromSubContent(content) {
  if (!content) return void 0;
  const colonIdx = content.indexOf(": ");
  return colonIdx > 0 ? content.slice(0, colonIdx) : content;
}

let _counter = 0;

export function nextMessageId() {
  return `msg-${++_counter}-${Date.now()}`;
}

export function createStreamingBuffers() {
  return {
    text: {},
    thinking: {},
    pendingSubAgents: new Map(),
    pendingSubAgentLegacy: new Map(),
    absorbing: new Map(),
  };
}

export function mapToolStatus(status) {
  if (!status || status === "completed") return "ok";
  if (status === "error") return "error";
  if (status === "running") return "running";
  return "pending";
}

export function subAgentHistoryPartId(taskPartId) {
  return taskPartId ? `${taskPartId}__sub_agent` : void 0;
}

export function findHistorySubAgentIndex(result, lookup) {
  const partId = subAgentHistoryPartId(lookup.taskPartId);
  const matchesResolvedState = (message) =>
    !lookup.unresolvedOnly || !message.resolved;
  if (partId) {
    return findLastIndex(
      result,
      (message) =>
        message.type === "sub_agent" &&
        message.partId === partId &&
        matchesResolvedState(message),
    );
  }
  if (lookup.childSessionId) {
    return findLastIndex(
      result,
      (message) =>
        message.type === "sub_agent" &&
        message.childSessionId === lookup.childSessionId &&
        matchesResolvedState(message),
    );
  }
  if (lookup.matchAnyAgent) {
    return findLastIndex(
      result,
      (message) => message.type === "sub_agent" && matchesResolvedState(message),
    );
  }
  return findLastIndex(
    result,
    (message) =>
      message.type === "sub_agent" &&
      message.agent === lookup.agent &&
      matchesResolvedState(message),
  );
}

export function createHistorySubAgentMessage(
  agent,
  childSessionId,
  taskPartId,
  resolved,
  task,
) {
  const partId = subAgentHistoryPartId(taskPartId);
  return {
    id: nextMessageId(),
    role: "agent",
    type: "sub_agent",
    content: "",
    agent,
    ...(childSessionId
      ? {
          childSessionId,
        }
      : {}),
    ...(partId
      ? {
          partId,
        }
      : {}),
    subMessages: [],
    collapsed: true,
    resolved,
    ...(task
      ? {
          task,
        }
      : {}),
  };
}
