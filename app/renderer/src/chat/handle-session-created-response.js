// handle-session-created-response.js
import { DRAFT_NEW_TAB } from "../workspace/resolve-retry-message-payload.jsx";
import { recordAction } from "../infra/gateway-http-error.jsx";
import { dedupedToast } from "../infra/agent-http-client.js";
import { ErrorCodes } from "../generation/normalize-skill-detail-metadata.js";
export function isSessionCachePolicyEnabled(storageKey2) {
  try {
    return localStorage.getItem(storageKey2) === "1";
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
export function isMessagePreflight(state2) {
  return state2?.status === "sent" && state2.phase !== void 0;
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
export function isBridgeDeliveryTimeout(state2) {
  return state2?.status === "timeout" && state2.stage === "bridge_error";
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
export function messageDeliveryRuntimeProgressSessionId(msg) {
  if (!MESSAGE_DELIVERY_RUNTIME_PROGRESS_TYPES.has(msg.type)) return null;
  return "session_id" in msg && typeof msg.session_id === "string"
    ? msg.session_id
    : null;
}
export function rootRuntimeTerminalSessionId(msg) {
  if (!MESSAGE_DELIVERY_RUNTIME_TERMINAL_TYPES.has(msg.type)) return null;
  if (!("session_id" in msg) || typeof msg.session_id !== "string") return null;
  if (msg.type === "session_idle" && msg.childSessionId) {
    return null;
  }
  return msg.session_id;
}
export function isRuntimeBusyProgress(msg) {
  return (
    MESSAGE_DELIVERY_RUNTIME_PROGRESS_TYPES.has(msg.type) &&
    !MESSAGE_DELIVERY_RUNTIME_TERMINAL_TYPES.has(msg.type)
  );
}
export function clearBridgeTimeoutPresentation(
  sessionStore,
  state2,
  restoreBusy,
) {
  if (!isBridgeDeliveryTimeout(state2)) return false;
  sessionStore.removeMessageById(
    state2.sessionId,
    messageDeliveryErrorMessageId(state2.clientMessageId),
  );
  dedupedToast.dismiss(messageDeliveryTimeoutToastId(state2.clientMessageId));
  if (restoreBusy && state2.delivery === "normal") {
    sessionStore.setBusy(true, state2.sessionId);
  }
  return true;
}
export function recordMessageDeliveryTimeoutRecovered(
  state2,
  recoveredBy,
  gatewayTimestamp,
) {
  const rendererReceivedAt = Date.now();
  recordAction("chat:message-timeout-recovered", {
    sessionId: state2.sessionId,
    clientMessageId: state2.clientMessageId,
    recoveredBy,
    timeoutAt: state2.updatedAt,
    rendererReceivedAt,
    recoveryDelayMs: rendererReceivedAt - state2.updatedAt,
    ...(gatewayTimestamp == null
      ? {}
      : {
          gatewayTimestamp,
          gatewayAfterTimeoutMs: gatewayTimestamp - state2.updatedAt,
          rendererAfterGatewayMs: rendererReceivedAt - gatewayTimestamp,
        }),
  });
}
export function settleCreatedComposerDraft(message2, payload, drafts, editor) {
  if (payload.preserveComposer) {
    drafts.setNow(message2.session_id, payload.draft);
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
  message: message2,
  refs,
  draftController,
  dispatchUserMessage,
  handleActivated,
  handleActivatedForkDraft,
  handleCreateDispatched,
  handleCreateDispatchFailed,
}) {
  const activated = message2.activated !== false;
  const requestId = message2.request_id;
  const pendingCreate = refs.createPayload.current;
  const isPendingCreateResponse =
    requestId !== void 0 && pendingCreate?.requestId === requestId;
  const pendingForkDraft = requestId
    ? refs.forkDrafts.current.get(requestId)
    : void 0;
  if (activated) handleActivated(message2);
  if (pendingForkDraft !== void 0 && requestId) {
    const forkDraft = message2.fork_draft ?? pendingForkDraft;
    if (activated) {
      handleActivatedForkDraft(forkDraft);
    } else {
      draftController.setNow(message2.session_id, {
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
      message2.session_id,
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
      handleCreateDispatched(message2, pendingCreate);
    } else {
      handleCreateDispatchFailed(message2, pendingCreate);
    }
  }
}
export const TEXT_AGENT_INTRO_MESSAGE_ID_PREFIX = "text-agent-intro:";
export function nodeEditSessionName(kind, t2, agentName) {
  if (kind === "plugin") {
    return (
      agentName?.trim() ||
      t2("chat.pluginEditAgent.sessionName", "Editor Agent")
    );
  }
  return t2("chat.textEditAgent.sessionName", "Text Assistant");
}
function addTextAgentIntro(messages2, sessionId, content2) {
  if (messages2.length > 0) return messages2;
  return [
    {
      id: `${TEXT_AGENT_INTRO_MESSAGE_ID_PREFIX}${sessionId}`,
      role: "agent",
      type: "text",
      content: content2,
    },
  ];
}
export function createTextAgentIntroEnsurer(sessionStore, kindRef, t2) {
  return (sessionId) => {
    if (kindRef.current !== "text") return;
    const intro = t2(
      "chat.textEditAgent.intro",
      "Hi, I’m your Text Assistant. I’m here to help you shape this draft. Tell me how you want the whole piece changed, or select a passage and add an annotation for a focused edit.\n\nI can help you:\n- Rewrite a scene to improve pacing, conflict, or dialogue\n- Rework a piece of copy to sharpen its message and selling points\n- Polish, expand, shorten, or reorganize content\n- Translate text and keep its tone and style consistent\n- Refine selected passages one annotation at a time\n\nA quick tip:\n- **For a focused edit**, select the text and state clearly in the annotation what you want changed, such as “add suspense,” “make the tone more restrained,” or “shorten to 100 words”\n- **For a full-document edit**, leave everything unselected and tell me the overall goal, such as “make it more conversational” or “use a professional brand voice throughout”",
    );
    sessionStore.updateMessages(sessionId, (previous2) =>
      addTextAgentIntro(previous2, sessionId, intro),
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
export function sameTextEditSessionEntry(a2, b3) {
  if (a2.runtimeSessionId && b3.runtimeSessionId)
    return a2.runtimeSessionId === b3.runtimeSessionId;
  if (a2.uiSessionId && b3.uiSessionId && a2.uiSessionId === b3.uiSessionId)
    return true;
  if (
    a2.uiSessionId &&
    b3.runtimeSessionId &&
    a2.uiSessionId === b3.runtimeSessionId
  )
    return true;
  if (
    a2.runtimeSessionId &&
    b3.uiSessionId &&
    a2.runtimeSessionId === b3.uiSessionId
  )
    return true;
  return false;
}
export function mergeEntry(a2, b3) {
  const newer = a2.updatedAt >= b3.updatedAt ? a2 : b3;
  const older = newer === a2 ? b3 : a2;
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
export function normalizeEntryList(values3) {
  const entries2 = [];
  for (const value of values3) {
    const entry = normalizeEntry(value);
    if (!entry) continue;
    const existingIndex = entries2.findIndex((candidate) =>
      sameTextEditSessionEntry(candidate, entry),
    );
    if (existingIndex === -1) entries2.push(entry);
    else entries2[existingIndex] = mergeEntry(entries2[existingIndex], entry);
  }
  return entries2.sort((a2, b3) => b3.updatedAt - a2.updatedAt);
}
function normalizeBinding(value) {
  if (!isRecord(value)) return null;
  const active2 = normalizeEntry(value);
  const rawSessions = Array.isArray(value.sessions) ? value.sessions : [];
  const sessions = normalizeEntryList(
    active2 ? [...rawSessions, active2] : rawSessions,
  );
  if (!active2 && sessions.length === 0) return null;
  const updatedAt = active2?.updatedAt ?? sessions[0]?.updatedAt ?? 0;
  return {
    ...(active2?.uiSessionId
      ? {
          uiSessionId: active2.uiSessionId,
        }
      : {}),
    ...(active2?.runtimeSessionId
      ? {
          runtimeSessionId: active2.runtimeSessionId,
        }
      : {}),
    updatedAt,
    sessions,
  };
}
export function listTextEditSessionEntries(binding) {
  if (!binding) return [];
  const active2 = normalizeEntry(binding);
  return normalizeEntryList(
    active2 ? [...(binding.sessions ?? []), active2] : (binding.sessions ?? []),
  );
}
export function upsertTextEditSessionEntry(binding, entry, options) {
  const sessions = normalizeEntryList([
    entry,
    ...listTextEditSessionEntries(binding),
  ]);
  const active2 = options?.active === false ? normalizeEntry(binding) : entry;
  const merged = active2
    ? (sessions.find((candidate) =>
        sameTextEditSessionEntry(candidate, active2),
      ) ?? active2)
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
  const record2 = {};
  for (const [workspaceKey, rawBindings] of Object.entries(value)) {
    if (!workspaceKey) continue;
    const bindings = normalizeWorkspaceBindings(rawBindings);
    if (Object.keys(bindings).length > 0) record2[workspaceKey] = bindings;
  }
  return record2;
}
