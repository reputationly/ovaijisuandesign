// attach-handoff-targets-to-sub-messages.js
import { actionTrailLog } from "../vendor-inline/vscode-base/graph.jsx";

let active = null;

export function setActiveChatSnapshot(snapshot2) {
  active = snapshot2;
}

export function clearActiveChatSnapshot(controller) {
  if (active?.controller === controller) {
    active = null;
  }
}

export function getActiveChatSnapshot() {
  return active;
}

export function recordError(message2, data2) {
  actionTrailLog.error(message2, data2);
}

export function subMessageSemanticKey(message2) {
  return JSON.stringify({
    type: message2.type,
    content: message2.content,
    args: message2.args,
    toolStatus: message2.toolStatus,
    url: message2.url,
    agent: message2.agent,
    resolved: message2.resolved,
    subMessages: message2.subMessages?.map(subMessageSemanticKey),
  });
}

function isRecord$d(value) {
  return !!value && typeof value === "object";
}

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
  for (const key2 of ["prompt", "description"]) {
    const value = parsed[key2];
    if (typeof value === "string" && value.trim()) return value;
  }
  return void 0;
}

export function extractChildSessionId(part) {
  const sessionId = part.state.metadata?.sessionId;
  return typeof sessionId === "string" ? sessionId : void 0;
}

export function logChat(message2, level = "info") {
  try {
    const logger = globalThis.hilo?.logger;
    const fn2 =
      level === "error"
        ? logger?.error
        : level === "warn"
          ? logger?.warn
          : logger?.info;
    fn2?.(message2, "chat");
  } catch {}
}

export function logRuntimeBinding(message2, level = "info") {
  logChat(`[runtime-bind] ${message2}`, level);
}

function diagnosticToken(value) {
  if (value === void 0 || value === "") return "none";
  return encodeURIComponent(String(value));
}

export function logPartUpdated(phase, sid, fields) {
  const details = fields
    .map(([key2, value]) => `${key2}=${diagnosticToken(value)}`)
    .join(" ");
  logChat(
    `[part_updated] phase=${phase} sid=${diagnosticToken(sid)} ${details}`,
  );
}

export function logPartUpdatedReceived(sid, part, runtimeId) {
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
  logPartUpdated("received", sid, fields);
}

export function attachHandoffTargetsToSubMessages(messages2, targets) {
  if (targets.length === 0) return [...messages2];
  return messages2.map((message2) => {
    if (message2.type === "tool" && message2.callID) {
      const matches2 = targets.filter(
        (target) => target.tool_use_id === message2.callID,
      );
      if (matches2.length > 0) {
        return {
          ...message2,
          interruption: "canvas_continuation",
          generationHandoffTargets: matches2,
        };
      }
    }
    return message2.subMessages
      ? {
          ...message2,
          subMessages: attachHandoffTargetsToSubMessages(
            message2.subMessages,
            targets,
          ),
        }
      : message2;
  });
}
