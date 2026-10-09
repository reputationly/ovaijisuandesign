// chat-diagnostic-error.js
import {
  chatDiagnosticHash,
  chatToolIdentity,
  diagnosticHistoryTools,
  normalizeToolStatus$1,
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
  const code2 = value.code ?? cause.code;
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
    typeof code2 === "string" && codes.includes(code2) ? code2 : void 0;
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

function describe(tool2) {
  const status = normalizeToolStatus$1(tool2.status);
  return {
    identity: chatToolIdentity(tool2),
    part: tool2.partId ? chatDiagnosticHash(`part:${tool2.partId}`) : void 0,
    call: tool2.callID ? chatDiagnosticHash(`call:${tool2.callID}`) : void 0,
    tool: safeToken(tool2.tool),
    status,
    scope: tool2.scope ?? "root",
    reason: tool2.reason ? safeToken(tool2.reason) : void 0,
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
    const root2 = tools
      .filter((tool2) => tool2.scope !== "child")
      .map(chatToolIdentity)
      .sort();
    const child = tools
      .filter((tool2) => tool2.scope === "child")
      .map(chatToolIdentity)
      .sort();
    const safeContext = Object.fromEntries(
      Object.entries(context).map(([key2, value]) => [
        key2,
        typeof value === "string" ? safeToken(value) : value,
      ]),
    );
    write(
      `[chat-diag] ${JSON.stringify({
        version: 1,
        stage,
        ...safeContext,
        count: tools.length,
        rootCount: root2.length,
        rootFingerprint: chatDiagnosticHash(root2.join(",")),
        childCount: child.length,
        childFingerprint: chatDiagnosticHash(child.join(",")),
        stateFingerprint: chatDiagnosticHash(
          tools
            .map(
              (tool2) =>
                `${chatToolIdentity(tool2)}:${normalizeToolStatus$1(tool2.status)}`,
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

function traceChatServerMessage(write, stage, message2, context = {}) {
  if (
    ![
      "session_switched",
      "session_cancelled",
      "question_request",
      "question_resolved",
    ].includes(message2.type)
  )
    return;
  const base2 = {
    ...context,
    sessionId: "session_id" in message2 ? message2.session_id : void 0,
  };
  if (message2.type === "session_switched") {
    traceChatTools(
      write,
      stage,
      {
        ...base2,
        historySyncId: message2.history_sync_id,
        runtimeSessionId: message2.runtime_session_id,
        requestId: message2.request_id,
        trigger: message2.type,
        outcome:
          context.outcome ??
          (message2.history_load_failed ? "history-load-failed" : "received"),
      },
      diagnosticHistoryTools(message2.messages ?? []),
    );
  } else if (
    message2.type === "session_cancelled" ||
    message2.type === "question_resolved" ||
    message2.type === "question_request"
  ) {
    traceChatTools(
      write,
      stage,
      {
        ...base2,
        trigger: message2.type,
        requestId:
          message2.type === "question_resolved"
            ? message2.request_id
            : message2.type === "question_request"
              ? message2.id
              : void 0,
      },
      message2.type === "question_request"
        ? [
            {
              tool: "question",
              callID: message2.tool?.callID,
              status: "running",
            },
          ]
        : [],
    );
  }
}

function traceChatClientOperation(write, stage, message2, outcome) {
  if (
    ![
      "cancel",
      "send_queued_user_message_now",
      "switch_session",
      "restore_session",
      "question_reply",
      "question_reject",
    ].includes(message2.type)
  )
    return;
  traceChatTools(write, stage, {
    sessionId: "session_id" in message2 ? message2.session_id : void 0,
    trigger: message2.type,
    outcome,
    requestId:
      "request_id" in message2 && typeof message2.request_id === "string"
        ? message2.request_id
        : "id" in message2 && typeof message2.id === "string"
          ? message2.id
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
  operation(message2, direction, outcome = "received") {
    traceChatClientOperation(
      this.write,
      direction === "sent" ? "operation-ws-send" : "operation",
      message2,
      outcome,
    );
  }
  received(message2) {
    traceChatServerMessage(this.write, "renderer-ws-received", message2);
  }
  sent(message2, outcome, connectionId) {
    traceChatServerMessage(
      this.write,
      message2.type === "session_switched"
        ? "history-ws-send"
        : "control-ws-send",
      message2,
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
