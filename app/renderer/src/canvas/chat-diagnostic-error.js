// chat-diagnostic-error.js
import {
  chatDiagnosticHash,
  chatToolIdentity,
  diagnosticHistoryTools,
  normalizeToolStatus,
} from "./diagnostic-history-tools.js";
const MAX_ANOMALY_DETAILS = 8;
function safeToken(value) {
  return /^[\w.:/-]{1,128}$/.test(value)
    ? value
    : `hash:${chatDiagnosticHash(value)}`;
}
function chatDiagnosticError(error) {
  const value = error && typeof error === "object" ? error : {};
  const cause =
    value.cause && typeof value.cause === "object" ? value.cause : {};
  const code = value.code ?? cause.code;
  const codes = [
    "SQLITE_BUSY",
    "SQLITE_LOCKED",
    "SQLITE_CANTOPEN",
    "SQLITE_NOTADB",
    "SQLITE_CORRUPT",
    "SQLITE_IOERR",
    "SQLITE_SCHEMA",
    "SQLITE_ERROR",
    "ECONNREFUSED",
    "ECONNRESET",
    "ETIMEDOUT",
    "ENOTFOUND",
    "EACCES",
    "ENOENT",
    "EPIPE",
    "ABORT_ERR",
    "UND_ERR_CONNECT_TIMEOUT",
    "UND_ERR_HEADERS_TIMEOUT",
    "UND_ERR_BODY_TIMEOUT",
  ];
  const errorCode =
    typeof code === "string" && codes.includes(code) ? code : void 0;
  const names = [
    "Error",
    "TypeError",
    "SyntaxError",
    "TimeoutError",
    "AbortError",
    "SqliteError",
    "HistoryHttpError",
  ];
  const errorType =
    typeof value.name === "string" && names.includes(value.name)
      ? value.name
      : "UnknownError";
  const httpStatus =
    typeof value.status === "number" &&
    value.status >= 100 &&
    value.status <= 599
      ? value.status
      : void 0;
  const errorKind = httpStatus
    ? "http"
    : errorType === "TimeoutError" ||
        errorCode?.includes("TIMEOUT") ||
        errorCode === "ETIMEDOUT"
      ? "timeout"
      : errorType === "AbortError"
        ? "aborted"
        : errorType === "SyntaxError"
          ? "invalid-json"
          : errorCode?.startsWith("SQLITE_")
            ? "sqlite"
            : errorCode
              ? "transport-or-filesystem"
              : "unknown";
  return {
    errorKind,
    errorType,
    errorCode,
    httpStatus,
  };
}
function describe(tool) {
  const status = normalizeToolStatus(tool.status);
  return {
    identity: chatToolIdentity(tool),
    part: tool.partId ? chatDiagnosticHash(`part:${tool.partId}`) : void 0,
    call: tool.callID ? chatDiagnosticHash(`call:${tool.callID}`) : void 0,
    tool: safeToken(tool.tool),
    status,
    scope: tool.scope ?? "root",
    reason: tool.reason ? safeToken(tool.reason) : void 0,
  };
}
function traceChatTools(
  write,
  stage,
  context,
  tools = [],
  includeDetails = false,
) {
  try {
    const root = tools
      .filter((tool) => tool.scope !== "child")
      .map(chatToolIdentity)
      .sort();
    const child = tools
      .filter((tool) => tool.scope === "child")
      .map(chatToolIdentity)
      .sort();
    const safeContext = Object.fromEntries(
      Object.entries(context).map(([key, value]) => [
        key,
        typeof value === "string" ? safeToken(value) : value,
      ]),
    );
    write(
      `[chat-diag] ${JSON.stringify({
        version: 1,
        stage,
        ...safeContext,
        count: tools.length,
        rootCount: root.length,
        rootFingerprint: chatDiagnosticHash(root.join(",")),
        childCount: child.length,
        childFingerprint: chatDiagnosticHash(child.join(",")),
        stateFingerprint: chatDiagnosticHash(
          tools
            .map(
              (tool) =>
                `${chatToolIdentity(tool)}:${normalizeToolStatus(tool.status)}`,
            )
            .sort()
            .join(","),
        ),
        ...(includeDetails
          ? {
              tools: tools.slice(0, MAX_ANOMALY_DETAILS).map(describe),
              omittedCount: Math.max(0, tools.length - MAX_ANOMALY_DETAILS),
            }
          : {}),
      })}`,
    );
  } catch {}
}
function traceChatServerMessage(write, stage, message, context = {}) {
  if (
    ![
      "session_switched",
      "session_cancelled",
      "question_request",
      "question_resolved",
    ].includes(message.type)
  )
    return;
  const base = {
    ...context,
    sessionId: "session_id" in message ? message.session_id : void 0,
  };
  if (message.type === "session_switched") {
    traceChatTools(
      write,
      stage,
      {
        ...base,
        historySyncId: message.history_sync_id,
        runtimeSessionId: message.runtime_session_id,
        requestId: message.request_id,
        trigger: message.type,
        outcome:
          context.outcome ??
          (message.history_load_failed ? "history-load-failed" : "received"),
      },
      diagnosticHistoryTools(message.messages ?? []),
    );
  } else if (
    message.type === "session_cancelled" ||
    message.type === "question_resolved" ||
    message.type === "question_request"
  ) {
    traceChatTools(
      write,
      stage,
      {
        ...base,
        trigger: message.type,
        requestId:
          message.type === "question_resolved"
            ? message.request_id
            : message.type === "question_request"
              ? message.id
              : void 0,
      },
      message.type === "question_request"
        ? [
            {
              tool: "question",
              callID: message.tool?.callID,
              status: "running",
            },
          ]
        : [],
    );
  }
}
function traceChatClientOperation(write, stage, message, outcome) {
  if (
    ![
      "cancel",
      "send_queued_user_message_now",
      "switch_session",
      "restore_session",
      "question_reply",
      "question_reject",
    ].includes(message.type)
  )
    return;
  traceChatTools(write, stage, {
    sessionId: "session_id" in message ? message.session_id : void 0,
    trigger: message.type,
    outcome,
    requestId:
      "request_id" in message && typeof message.request_id === "string"
        ? message.request_id
        : "id" in message && typeof message.id === "string"
          ? message.id
          : void 0,
  });
}
export class ChatDiagnostics {
  constructor(write) {
    this.write = write;
  }
  record(stage, context, tools = [], details = false) {
    traceChatTools(this.write, stage, context, tools, details);
  }
  operation(message, direction, outcome = "received") {
    traceChatClientOperation(
      this.write,
      direction === "sent" ? "operation-ws-send" : "operation",
      message,
      outcome,
    );
  }
  received(message) {
    traceChatServerMessage(this.write, "renderer-ws-received", message);
  }
  sent(message, outcome, connectionId) {
    traceChatServerMessage(
      this.write,
      message.type === "session_switched"
        ? "history-ws-send"
        : "control-ws-send",
      message,
      {
        outcome,
        connectionId,
      },
    );
  }
  historyFailure(context, error) {
    this.record("history-load-failed", {
      ...context,
      outcome: "previous-history-retained",
      ...chatDiagnosticError(error),
    });
  }
  historyRetry(context, repairedParts) {
    this.record("history-retry", {
      ...context,
      repairedParts,
      outcome: "retry-after-repair",
    });
  }
}
