// handle-session-created-response.js
import { DRAFT_NEW_TAB } from "../workspace/resolve-retry-message-payload.jsx";
import { recordAction } from "../infra/gateway-http-error.jsx";
import { dedupedToast } from "../infra/agent-http-client.js";
import { ErrorCodes } from "../generation/normalize-skill-detail-metadata.js";
export function isSessionCachePolicyEnabled(storageKey) {
  try {
    return localStorage.getItem(storageKey) === "1";
  } catch {
    return false;
  }
}
export function restoreRejectedAttachments(attachments) {
  return attachments.map(
    ({
      commitOperationId: _operation,
      commitSourcePath: _source,
      ...attachment
    }) => attachment,
  );
}
const MESSAGE_DELIVERY_ERROR_MAX_LENGTH = 200;
const DEFAULT_RUNTIME_WATCHDOG_WINDOW_MS = 300 * 6e4;
export const TECHNICAL_MESSAGE_DELIVERY_ERROR_PATTERN =
  /(?:AbortError|TimeoutError|TypeError|FetchError|AI_APICallError|OpenCode responded|fetch failed|operation was aborted|was there a typo in the url or port|unable to connect\. is the computer able to access the url|ECONNRESET|ECONNREFUSED|ENOTFOUND|ETIMEDOUT|UND_ERR|Cannot read properties|Cannot destructure|database or disk is full|\bat\s+\S+\()/i;
export const MESSAGE_DELIVERY_TIMEOUT_MS = 5e3;
export const MESSAGE_RUNTIME_PROGRESS_TIMEOUT_MS =
  DEFAULT_RUNTIME_WATCHDOG_WINDOW_MS;
export const ACTIVE_MESSAGE_DELIVERY_STATUSES = new Set([
  "sent",
  "received",
  "accepted",
  "started",
]);
export function isMessagePreflight(state) {
  return state?.status === "sent" && state.phase !== void 0;
}
const MESSAGE_DELIVERY_RUNTIME_PROGRESS_TYPES = new Set([
  "part_updated",
  "part_delta",
  "text_chunk",
  "thinking",
  "text_end",
  "image",
  "video",
  "audio",
  "status",
  "tool_call",
  "tool_result",
  "confirm_request",
  "interact_request",
  "task_notification",
  "done",
  "error",
  "session_idle",
  "session_error",
]);
const MESSAGE_DELIVERY_RUNTIME_TERMINAL_TYPES = new Set([
  "done",
  "error",
  "session_idle",
  "session_error",
]);
export function messageDeliveryErrorMessageId(clientMessageId) {
  return `message-delivery-error-${clientMessageId}`;
}
export function messageDeliveryTimeoutToastId(clientMessageId) {
  return `message-delivery-timeout-${clientMessageId}`;
}
export function isBridgeDeliveryTimeout(state) {
  return state?.status === "timeout" && state.stage === "bridge_error";
}
export function sanitizeMessageDeliveryError(error) {
  return error
    .replace(/\/Users\/[^/\s]+\/[^\s]*/g, "<local-path>")
    .replace(/[A-Za-z]:\\[^\s]*/g, "<local-path>")
    .slice(0, MESSAGE_DELIVERY_ERROR_MAX_LENGTH);
}
export function recordMessageDeliveryFailureBreadcrumb(
  sessionId,
  clientMessageId,
  stage,
  error,
) {
  Promise.resolve(
    window.hilo?.diagnostics?.addBreadcrumb?.(
      "network",
      "message-delivery: failed",
      {
        session_id: sessionId,
        client_message_id: clientMessageId,
        stage,
        error: sanitizeMessageDeliveryError(error),
      },
    ),
  ).catch(() => {});
}
export function recordMessageDeliveryTimeoutBreadcrumb(
  sessionId,
  clientMessageId,
  stage,
) {
  Promise.resolve(
    window.hilo?.diagnostics?.addBreadcrumb?.(
      "network",
      "message-delivery: timeout",
      {
        session_id: sessionId,
        client_message_id: clientMessageId,
        stage,
      },
    ),
  ).catch(() => {});
}
export function errorCodeForMessageDeliveryStage(stage) {
  switch (stage) {
    case "gateway_validation":
      return ErrorCodes.GATEWAY_BAD_REQUEST;
    case "runtime_timeout":
      return ErrorCodes.NETWORK_TIMEOUT;
    case "bridge_error":
      return ErrorCodes.RUNTIME_STREAM_ERROR;
    case "runtime_send":
      return ErrorCodes.RUNTIME_CONNECTION_LOST;
  }
}
export function messageDeliveryRuntimeProgressSessionId(message) {
  if (!MESSAGE_DELIVERY_RUNTIME_PROGRESS_TYPES.has(message.type)) return null;
  return "session_id" in message && typeof message.session_id === "string"
    ? message.session_id
    : null;
}
export function rootRuntimeTerminalSessionId(message) {
  if (!MESSAGE_DELIVERY_RUNTIME_TERMINAL_TYPES.has(message.type)) return null;
  if (!("session_id" in message) || typeof message.session_id !== "string") return null;
  if (message.type === "session_idle" && message.childSessionId) {
    return null;
  }
  return message.session_id;
}
export function isRuntimeBusyProgress(message) {
  return (
    MESSAGE_DELIVERY_RUNTIME_PROGRESS_TYPES.has(message.type) &&
    !MESSAGE_DELIVERY_RUNTIME_TERMINAL_TYPES.has(message.type)
  );
}
export function clearBridgeTimeoutPresentation(
  sessionStore,
  state,
  restoreBusy,
) {
  if (!isBridgeDeliveryTimeout(state)) return false;
  sessionStore.removeMessageById(
    state.sessionId,
    messageDeliveryErrorMessageId(state.clientMessageId),
  );
  dedupedToast.dismiss(messageDeliveryTimeoutToastId(state.clientMessageId));
  if (restoreBusy && state.delivery === "normal") {
    sessionStore.setBusy(true, state.sessionId);
  }
  return true;
}
export function recordMessageDeliveryTimeoutRecovered(
  state,
  recoveredBy,
  gatewayTimestamp,
) {
  const rendererReceivedAt = Date.now();
  recordAction("chat:message-timeout-recovered", {
    sessionId: state.sessionId,
    clientMessageId: state.clientMessageId,
    recoveredBy,
    timeoutAt: state.updatedAt,
    rendererReceivedAt,
    recoveryDelayMs: rendererReceivedAt - state.updatedAt,
    ...(gatewayTimestamp == null
      ? {}
      : {
          gatewayTimestamp,
          gatewayAfterTimeoutMs: gatewayTimestamp - state.updatedAt,
          rendererAfterGatewayMs: rendererReceivedAt - gatewayTimestamp,
        }),
  });
}
export function settleCreatedComposerDraft(message, payload, drafts, editor) {
  if (payload.preserveComposer) {
    drafts.setNow(message.session_id, payload.draft);
    if (editor.active) {
      editor.input.current = payload.draft.text;
      editor.editorDoc.current = payload.draft.editorDoc;
      editor.attachments.current = payload.draft.attachments;
      editor.setInput(payload.draft.text);
      editor.setPendingEditorDoc(payload.draft.editorDoc ?? null);
      editor.setPendingAttachments(payload.draft.attachments);
    }
    return;
  }
  drafts.clear(DRAFT_NEW_TAB);
  if (editor.active) {
    editor.input.current = "";
    editor.editorDoc.current = void 0;
    editor.attachments.current = [];
    editor.setInput("");
    editor.setPendingEditorDoc(null);
    editor.setPendingAttachments(null);
    editor.setPendingComposerReset((value) => value + 1);
  }
}
export function handleSessionCreatedResponse({
  message,
  refs,
  draftController,
  dispatchUserMessage,
  handleActivated,
  handleActivatedForkDraft,
  handleCreateDispatched,
  handleCreateDispatchFailed,
}) {
  const activated = message.activated !== false;
  const requestId = message.request_id;
  const pendingCreate = refs.createPayload.current;
  const isPendingCreateResponse =
    requestId !== void 0 && pendingCreate?.requestId === requestId;
  const pendingForkDraft = requestId
    ? refs.forkDrafts.current.get(requestId)
    : void 0;
  if (activated) handleActivated(message);
  if (pendingForkDraft !== void 0 && requestId) {
    const forkDraft = message.fork_draft ?? pendingForkDraft;
    if (activated) {
      handleActivatedForkDraft(forkDraft);
    } else {
      draftController.setNow(message.session_id, {
        text: forkDraft,
        attachments: [],
      });
    }
    refs.forkDrafts.current.delete(requestId);
  } else if (pendingCreate && isPendingCreateResponse) {
    const dispatched = dispatchUserMessage(
      pendingCreate.text,
      pendingCreate.attachments ?? void 0,
      pendingCreate.canvasNodeAttachments ?? void 0,
      pendingCreate.entityRefs ?? void 0,
      pendingCreate.pluginNodeAttachments ?? void 0,
      message.session_id,
      pendingCreate.clientMessageId,
      pendingCreate.documentEditRequest ?? void 0,
      pendingCreate.textEditContext ?? void 0,
      pendingCreate.pluginEditContext ?? void 0,
      pendingCreate.languageDetectionText ?? void 0,
      pendingCreate.attachmentRefs ?? void 0,
      pendingCreate.browserContext,
    );
    if (dispatched) {
      refs.createPayload.current = null;
      handleCreateDispatched(message, pendingCreate);
    } else {
      handleCreateDispatchFailed(message, pendingCreate);
    }
  }
}
export const TEXT_AGENT_INTRO_MESSAGE_ID_PREFIX = "text-agent-intro:";
export function nodeEditSessionName(kind, translate, agentName) {
  if (kind === "plugin") {
    return (
      agentName?.trim() ||
      translate("chat.pluginEditAgent.sessionName", "Editor Agent")
    );
  }
  return translate("chat.textEditAgent.sessionName", "Text Assistant");
}
function addTextAgentIntro(messages, sessionId, content) {
  if (messages.length > 0) return messages;
  return [
    {
      id: `${TEXT_AGENT_INTRO_MESSAGE_ID_PREFIX}${sessionId}`,
      role: "agent",
      type: "text",
      content,
    },
  ];
}
export function createTextAgentIntroEnsurer(sessionStore, kindRef, translate) {
  return (sessionId) => {
    if (kindRef.current !== "text") return;
    const intro = translate(
      "chat.textEditAgent.intro",
      "Hi, I’m your Text Assistant. I’m here to help you shape this draft. Tell me how you want the whole piece changed, or select a passage and add an annotation for a focused edit.\n\nI can help you:\n- Rewrite a scene to improve pacing, conflict, or dialogue\n- Rework a piece of copy to sharpen its message and selling points\n- Polish, expand, shorten, or reorganize content\n- Translate text and keep its tone and style consistent\n- Refine selected passages one annotation at a time\n\nA quick tip:\n- **For a focused edit**, select the text and state clearly in the annotation what you want changed, such as “add suspense,” “make the tone more restrained,” or “shorten to 100 words”\n- **For a full-document edit**, leave everything unselected and tell me the overall goal, such as “make it more conversational” or “use a professional brand voice throughout”",
    );
    sessionStore.updateMessages(sessionId, (previous) =>
      addTextAgentIntro(previous, sessionId, intro),
    );
  };
}
export const STORAGE_KEY = "workspaceTextEditSessions";
export const LOCAL_CACHE_KEY = `hilo:storage:global.${STORAGE_KEY}`;
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function normalizeEntry(value) {
  if (!isRecord(value)) return null;
  const uiSessionId =
    typeof value.uiSessionId === "string" && value.uiSessionId.length > 0
      ? value.uiSessionId
      : void 0;
  const runtimeSessionId =
    typeof value.runtimeSessionId === "string" &&
    value.runtimeSessionId.length > 0
      ? value.runtimeSessionId
      : void 0;
  if (!uiSessionId && !runtimeSessionId) return null;
  const updatedAt =
    typeof value.updatedAt === "number" && Number.isFinite(value.updatedAt)
      ? value.updatedAt
      : 0;
  return {
    uiSessionId,
    runtimeSessionId,
    updatedAt,
  };
}
export function sameTextEditSessionEntry(leftEntry, rightEntry) {
  if (leftEntry.runtimeSessionId && rightEntry.runtimeSessionId)
    return leftEntry.runtimeSessionId === rightEntry.runtimeSessionId;
  if (leftEntry.uiSessionId && rightEntry.uiSessionId && leftEntry.uiSessionId === rightEntry.uiSessionId)
    return true;
  if (
    leftEntry.uiSessionId &&
    rightEntry.runtimeSessionId &&
    leftEntry.uiSessionId === rightEntry.runtimeSessionId
  )
    return true;
  if (
    leftEntry.runtimeSessionId &&
    rightEntry.uiSessionId &&
    leftEntry.runtimeSessionId === rightEntry.uiSessionId
  )
    return true;
  return false;
}
export function mergeEntry(existingEntry, incomingEntry) {
  const newer = existingEntry.updatedAt >= incomingEntry.updatedAt ? existingEntry : incomingEntry;
  const older = newer === existingEntry ? incomingEntry : existingEntry;
  return {
    ...(older.uiSessionId
      ? {
          uiSessionId: older.uiSessionId,
        }
      : {}),
    ...(older.runtimeSessionId
      ? {
          runtimeSessionId: older.runtimeSessionId,
        }
      : {}),
    ...(newer.uiSessionId
      ? {
          uiSessionId: newer.uiSessionId,
        }
      : {}),
    ...(newer.runtimeSessionId
      ? {
          runtimeSessionId: newer.runtimeSessionId,
        }
      : {}),
    updatedAt: Math.max(older.updatedAt, newer.updatedAt),
  };
}
export function normalizeEntryList(values) {
  const entries = [];
  for (const value of values) {
    const entry = normalizeEntry(value);
    if (!entry) continue;
    const existingIndex = entries.findIndex((candidate) =>
      sameTextEditSessionEntry(candidate, entry),
    );
    if (existingIndex === -1) entries.push(entry);
    else entries[existingIndex] = mergeEntry(entries[existingIndex], entry);
  }
  return entries.sort((leftEntry, rightEntry) => rightEntry.updatedAt - leftEntry.updatedAt);
}
function normalizeBinding(value) {
  if (!isRecord(value)) return null;
  const active = normalizeEntry(value);
  const rawSessions = Array.isArray(value.sessions) ? value.sessions : [];
  const sessions = normalizeEntryList(
    active ? [...rawSessions, active] : rawSessions,
  );
  if (!active && sessions.length === 0) return null;
  const updatedAt = active?.updatedAt ?? sessions[0]?.updatedAt ?? 0;
  return {
    ...(active?.uiSessionId
      ? {
          uiSessionId: active.uiSessionId,
        }
      : {}),
    ...(active?.runtimeSessionId
      ? {
          runtimeSessionId: active.runtimeSessionId,
        }
      : {}),
    updatedAt,
    sessions,
  };
}
export function listTextEditSessionEntries(binding) {
  if (!binding) return [];
  const active = normalizeEntry(binding);
  return normalizeEntryList(
    active ? [...(binding.sessions ?? []), active] : (binding.sessions ?? []),
  );
}
export function upsertTextEditSessionEntry(binding, entry, options) {
  const sessions = normalizeEntryList([
    entry,
    ...listTextEditSessionEntries(binding),
  ]);
  const active = options?.active === false ? normalizeEntry(binding) : entry;
  const merged = active
    ? (sessions.find((candidate) =>
        sameTextEditSessionEntry(candidate, active),
      ) ?? active)
    : null;
  return {
    ...(merged?.uiSessionId
      ? {
          uiSessionId: merged.uiSessionId,
        }
      : {}),
    ...(merged?.runtimeSessionId
      ? {
          runtimeSessionId: merged.runtimeSessionId,
        }
      : {}),
    updatedAt: entry.updatedAt,
    sessions,
  };
}
export function clearActiveTextEditSession(binding, updatedAt) {
  return {
    updatedAt,
    sessions: [...listTextEditSessionEntries(binding)],
  };
}
function normalizeWorkspaceBindings(value) {
  if (!isRecord(value)) return {};
  const bindings = {};
  for (const [nodeId, rawBinding] of Object.entries(value)) {
    if (!nodeId) continue;
    const binding = normalizeBinding(rawBinding);
    if (binding) bindings[nodeId] = binding;
  }
  return bindings;
}
export function normalizeTextEditSessionRecord(value) {
  if (!isRecord(value)) return {};
  const record = {};
  for (const [workspaceKey, rawBindings] of Object.entries(value)) {
    if (!workspaceKey) continue;
    const bindings = normalizeWorkspaceBindings(rawBindings);
    if (Object.keys(bindings).length > 0) record[workspaceKey] = bindings;
  }
  return record;
}
