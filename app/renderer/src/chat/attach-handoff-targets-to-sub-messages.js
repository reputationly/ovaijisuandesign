// attach-handoff-targets-to-sub-messages.js
import { actionTrailLog } from "../vendor-inline/vscode-base/graph.jsx";

let active = null;

export function setActiveChatSnapshot(snapshot) {
  active = snapshot;
}

export function clearActiveChatSnapshot(controller) {
  if (active?.controller === controller) {
    active = null;
  }
}

export function getActiveChatSnapshot() {
  return active;
}

export function recordError(message, data) {
  actionTrailLog.error(message, data);
}

export function subMessageSemanticKey(message) {
  return JSON.stringify({
    type: message.type,
    content: message.content,
    args: message.args,
    toolStatus: message.toolStatus,
    url: message.url,
    agent: message.agent,
    resolved: message.resolved,
    subMessages: message.subMessages?.map(subMessageSemanticKey),
  });
}

const isRecord$d = (value) => !!value && typeof value === "object" && !Array.isArray(value);

export function extractTaskDisplayPrompt(input) {
  let parsed = input;
  if (typeof input === "string") {
    try {
      parsed = JSON.parse(input);
    } catch {
      return void 0;
    }
  }
  if (!isRecord$d(parsed)) return void 0;
  for (const key of ["prompt", "description"]) {
    const value = parsed[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return void 0;
}

export function extractChildSessionId(part) {
  const sessionId = part.state.metadata?.sessionId;
  return typeof sessionId === "string" ? sessionId : void 0;
}

export function logChat(message, level = "info") {
  try {
    const logger = globalThis.hilo?.logger;
    const logMethod =
      level === "error"
        ? logger?.error
        : level === "warn"
          ? logger?.warn
          : logger?.info;
    logMethod?.(message, "chat");
  } catch {}
}

export function logRuntimeBinding(message, level = "info") {
  logChat(`[runtime-bind] ${message}`, level);
}

function diagnosticToken(value) {
  if (value === void 0 || value === "") return "none";
  return encodeURIComponent(String(value));
}

export function logPartUpdated(phase, sessionId, fields) {
  const details = fields
    .map(([key, value]) => `${key}=${diagnosticToken(value)}`)
    .join(" ");
  logChat(
    `[part_updated] phase=${phase} sid=${diagnosticToken(sessionId)} ${details}`,
  );
}

export function logPartUpdatedReceived(sessionId, part, runtimeId) {
  const fields = [
    ["part", part.id],
    ["partSession", part.sessionID],
    ["message", part.messageID],
    ["type", part.type],
  ];
  if (part.type === "tool") {
    fields.push(["tool", part.tool], ["status", part.state.status]);
    if (part.tool === "task")
      fields.push(["child", extractChildSessionId(part)]);
  }
  fields.push(
    ["runtime", runtimeId],
    ["binding", runtimeId ? "bound" : "unbound"],
  );
  logPartUpdated("received", sessionId, fields);
}

export function attachHandoffTargetsToSubMessages(messages, targets) {
  if (targets.length === 0) return [...messages];
  return messages.map((message) => {
    if (message.type === "tool" && message.callID) {
      const matches = targets.filter(
        (target) => target.tool_use_id === message.callID,
      );
      if (matches.length > 0) {
        return {
          ...message,
          interruption: "canvas_continuation",
          generationHandoffTargets: matches,
        };
      }
    }
    return message.subMessages
      ? {
          ...message,
          subMessages: attachHandoffTargetsToSubMessages(
            message.subMessages,
            targets,
          ),
        }
      : message;
  });
}
