// use-session-list-retry.js
import { useTranslation, reactExports, dedupedToast } from "../vendor.js";
import { recordAction } from "../infra/agent-ws-client.jsx";
import { chatLog } from "../vendor-inline/vscode-base/graph.jsx";
import { ErrorCodes } from "../generation/push-inline.js";
import { getElectronPlatform } from "../infra/track-events.js";
import { resolveActiveModelId } from "../generation/use-resizable-width.js";
import { useActiveCustomModel } from "../team/delete-account-confirm-dialog.jsx";
import { nextMessageId } from "./reduce-server-message.js";
import { DRAFT_NEW_TAB } from "../workspace/use-workspace-canvas-persistence.jsx";
export function isSessionCachePolicyEnabled(storageKey2) {
  try {
    return localStorage.getItem(storageKey2) === "1";
  } catch {
    return false;
  }
}
export function restoreRejectedAttachments(attachments) {
  return attachments.map(
    ({ commitOperationId: _operation, commitSourcePath: _source, ...attachment }) => attachment,
  );
}
const MESSAGE_DELIVERY_ERROR_MAX_LENGTH = 200;
const DEFAULT_RUNTIME_WATCHDOG_WINDOW_MS = 300 * 6e4;
export const TECHNICAL_MESSAGE_DELIVERY_ERROR_PATTERN =
  /(?:AbortError|TimeoutError|TypeError|FetchError|AI_APICallError|OpenCode responded|fetch failed|operation was aborted|was there a typo in the url or port|unable to connect\. is the computer able to access the url|ECONNRESET|ECONNREFUSED|ENOTFOUND|ETIMEDOUT|UND_ERR|Cannot read properties|Cannot destructure|database or disk is full|\bat\s+\S+\()/i;
export const MESSAGE_DELIVERY_TIMEOUT_MS = 5e3;
export const MESSAGE_RUNTIME_PROGRESS_TIMEOUT_MS = DEFAULT_RUNTIME_WATCHDOG_WINDOW_MS;
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
export function recordMessageDeliveryFailureBreadcrumb(sessionId, clientMessageId, stage, error) {
  Promise.resolve(
    window.hilo?.diagnostics?.addBreadcrumb?.("network", "message-delivery: failed", {
      session_id: sessionId,
      client_message_id: clientMessageId,
      stage,
      error: sanitizeMessageDeliveryError(error),
    }),
  ).catch(() => {});
}
export function recordMessageDeliveryTimeoutBreadcrumb(sessionId, clientMessageId, stage) {
  Promise.resolve(
    window.hilo?.diagnostics?.addBreadcrumb?.("network", "message-delivery: timeout", {
      session_id: sessionId,
      client_message_id: clientMessageId,
      stage,
    }),
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
  return "session_id" in msg && typeof msg.session_id === "string" ? msg.session_id : null;
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
export function clearBridgeTimeoutPresentation(sessionStore, state2, restoreBusy) {
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
export function recordMessageDeliveryTimeoutRecovered(state2, recoveredBy, gatewayTimestamp) {
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
  const isPendingCreateResponse = requestId !== void 0 && pendingCreate?.requestId === requestId;
  const pendingForkDraft = requestId ? refs.forkDrafts.current.get(requestId) : void 0;
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
const SESSION_LIST_RETRY_AFTER_FALLBACK_MS = 1e3;
const SESSION_LIST_RETRY_MAX_DELAY_MS = 3e4;
const SESSION_LIST_STALL_LOG_THRESHOLD = 5;
function computeSessionListRetryDelayMs(streak, baseDelayMs) {
  const base2 = Math.max(
    baseDelayMs || SESSION_LIST_RETRY_AFTER_FALLBACK_MS,
    SESSION_LIST_RETRY_AFTER_FALLBACK_MS,
  );
  return Math.min(base2 * 2 ** Math.max(0, streak - 1), SESSION_LIST_RETRY_MAX_DELAY_MS);
}
export function useSessionListRetry({
  connected,
  connectedRef,
  requestSessionList,
  setSessionsLoading,
  workspaceKey,
}) {
  const timerRef = reactExports.useRef(null);
  const streakRef = reactExports.useRef(0);
  const stallLoggedRef = reactExports.useRef(false);
  const snapshotReadyRef = reactExports.useRef(false);
  const stalledRef = reactExports.useRef(false);
  const [revision, setRevision] = reactExports.useState(0);
  const [status, setStatus] = reactExports.useState(null);
  const workspaceRef = reactExports.useRef(workspaceKey);
  workspaceRef.current = workspaceKey;
  const requestSessionListRef = reactExports.useRef(requestSessionList);
  requestSessionListRef.current = requestSessionList;
  const clearSessionListRetryTimer = reactExports.useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);
  reactExports.useEffect(() => clearSessionListRetryTimer, [clearSessionListRetryTimer]);
  reactExports.useEffect(() => {
    snapshotReadyRef.current = false;
    stalledRef.current = false;
    streakRef.current = 0;
    stallLoggedRef.current = false;
    setStatus(null);
    setSessionsLoading(true);
  }, [setSessionsLoading, workspaceKey]);
  reactExports.useEffect(() => {
    if (connected) setSessionsLoading(!snapshotReadyRef.current && !stalledRef.current);
  }, [connected, setSessionsLoading]);
  const requestWithLoadingPolicy = reactExports.useCallback(
    (reason) => {
      if (!snapshotReadyRef.current && !stalledRef.current) setSessionsLoading(true);
      requestSessionListRef.current(reason);
    },
    [setSessionsLoading],
  );
  const scheduleSessionListRetry = reactExports.useCallback(
    (delayMs) => {
      clearSessionListRetryTimer();
      timerRef.current = setTimeout(
        () => {
          timerRef.current = null;
          if (!connectedRef.current) return;
          requestWithLoadingPolicy("initial");
        },
        Math.max(delayMs, SESSION_LIST_RETRY_AFTER_FALLBACK_MS),
      );
    },
    [clearSessionListRetryTimer, connectedRef, requestWithLoadingPolicy],
  );
  const handleSessionListUnavailable = reactExports.useCallback(
    (reason, retryAfterMs) => {
      const streak = streakRef.current + 1;
      streakRef.current = streak;
      const nextRetryInMs = computeSessionListRetryDelayMs(streak, retryAfterMs);
      stalledRef.current = streak >= SESSION_LIST_STALL_LOG_THRESHOLD;
      setSessionsLoading(!snapshotReadyRef.current && !stalledRef.current);
      setStatus({
        reason,
        consecutiveFailures: streak,
        nextRetryInMs,
        stalled: streak >= SESSION_LIST_STALL_LOG_THRESHOLD,
      });
      if (streak >= SESSION_LIST_STALL_LOG_THRESHOLD && !stallLoggedRef.current) {
        stallLoggedRef.current = true;
        chatLog.warn("session list unavailable; runtime is not answering project requests", {
          workspace: workspaceRef.current,
          reason,
          consecutiveFailures: streak,
          nextRetryInMs,
        });
      }
      scheduleSessionListRetry(nextRetryInMs);
      return {
        reason,
        consecutiveFailures: streak,
        nextRetryInMs,
        stalled: streak >= SESSION_LIST_STALL_LOG_THRESHOLD,
      };
    },
    [scheduleSessionListRetry, setSessionsLoading],
  );
  const handleSessionListRecovered = reactExports.useCallback(() => {
    clearSessionListRetryTimer();
    snapshotReadyRef.current = true;
    stalledRef.current = false;
    setSessionsLoading(false);
    setRevision((value) => value + 1);
    if (stallLoggedRef.current) {
      chatLog.info("session list recovered after runtime stall", {
        workspace: workspaceRef.current,
        consecutiveFailures: streakRef.current,
      });
    }
    streakRef.current = 0;
    stallLoggedRef.current = false;
    setStatus(null);
  }, [clearSessionListRetryTimer, setSessionsLoading]);
  const retryNow = reactExports.useCallback(() => {
    clearSessionListRetryTimer();
    if (!connectedRef.current) return;
    requestWithLoadingPolicy("initial");
  }, [clearSessionListRetryTimer, connectedRef, requestWithLoadingPolicy]);
  return {
    revision,
    status,
    requestSessionList: requestWithLoadingPolicy,
    clearSessionListRetryTimer,
    scheduleSessionListRetry,
    handleSessionListUnavailable,
    handleSessionListRecovered,
    retryNow,
  };
}
export const TEXT_AGENT_INTRO_MESSAGE_ID_PREFIX = "text-agent-intro:";
export function nodeEditSessionName(kind, t2, agentName) {
  if (kind === "plugin") {
    return agentName?.trim() || t2("chat.pluginEditAgent.sessionName", "Editor Agent");
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
const STORAGE_KEY$3 = "workspaceTextEditSessions";
const LOCAL_CACHE_KEY$1 = `hilo:storage:global.${STORAGE_KEY$3}`;
const CROSS_CONTEXT_WRITE_LOCK = "hilo:workspace-text-edit-sessions";
let bindingWriteQueue = Promise.resolve();
function isRecord$7(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function normalizeEntry(value) {
  if (!isRecord$7(value)) return null;
  const uiSessionId =
    typeof value.uiSessionId === "string" && value.uiSessionId.length > 0
      ? value.uiSessionId
      : void 0;
  const runtimeSessionId =
    typeof value.runtimeSessionId === "string" && value.runtimeSessionId.length > 0
      ? value.runtimeSessionId
      : void 0;
  if (!uiSessionId && !runtimeSessionId) return null;
  const updatedAt =
    typeof value.updatedAt === "number" && Number.isFinite(value.updatedAt) ? value.updatedAt : 0;
  return {
    uiSessionId,
    runtimeSessionId,
    updatedAt,
  };
}
function sameTextEditSessionEntry(a2, b3) {
  if (a2.runtimeSessionId && b3.runtimeSessionId)
    return a2.runtimeSessionId === b3.runtimeSessionId;
  if (a2.uiSessionId && b3.uiSessionId && a2.uiSessionId === b3.uiSessionId) return true;
  if (a2.uiSessionId && b3.runtimeSessionId && a2.uiSessionId === b3.runtimeSessionId) return true;
  if (a2.runtimeSessionId && b3.uiSessionId && a2.runtimeSessionId === b3.uiSessionId) return true;
  return false;
}
function mergeEntry(a2, b3) {
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
function normalizeEntryList(values3) {
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
  if (!isRecord$7(value)) return null;
  const active2 = normalizeEntry(value);
  const rawSessions = Array.isArray(value.sessions) ? value.sessions : [];
  const sessions = normalizeEntryList(active2 ? [...rawSessions, active2] : rawSessions);
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
  const sessions = normalizeEntryList([entry, ...listTextEditSessionEntries(binding)]);
  const active2 = options?.active === false ? normalizeEntry(binding) : entry;
  const merged = active2
    ? (sessions.find((candidate) => sameTextEditSessionEntry(candidate, active2)) ?? active2)
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
  if (!isRecord$7(value)) return {};
  const bindings = {};
  for (const [nodeId, rawBinding] of Object.entries(value)) {
    if (!nodeId) continue;
    const binding = normalizeBinding(rawBinding);
    if (binding) bindings[nodeId] = binding;
  }
  return bindings;
}
function normalizeTextEditSessionRecord(value) {
  if (!isRecord$7(value)) return {};
  const record2 = {};
  for (const [workspaceKey, rawBindings] of Object.entries(value)) {
    if (!workspaceKey) continue;
    const bindings = normalizeWorkspaceBindings(rawBindings);
    if (Object.keys(bindings).length > 0) record2[workspaceKey] = bindings;
  }
  return record2;
}
function readLocalCache$1() {
  if (typeof localStorage === "undefined") return {};
  try {
    return normalizeTextEditSessionRecord(
      JSON.parse(localStorage.getItem(LOCAL_CACHE_KEY$1) ?? "{}"),
    );
  } catch {
    return {};
  }
}
function writeLocalCache$1(record2) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(LOCAL_CACHE_KEY$1, JSON.stringify(record2));
  } catch {}
}
function getPlatformStorage$1() {
  try {
    return getElectronPlatform()?.storage;
  } catch {
    return void 0;
  }
}
export function cachedTextEditSessionBindings(workspaceKey) {
  if (!workspaceKey) return {};
  return readLocalCache$1()[workspaceKey] ?? {};
}
export function mergeTextEditSessionBindings(persisted, inMemory) {
  const merged = {};
  for (const nodeId of new Set([...Object.keys(persisted), ...Object.keys(inMemory)])) {
    const saved = persisted[nodeId];
    const current2 = inMemory[nodeId];
    if (!saved) {
      if (current2) merged[nodeId] = current2;
      continue;
    }
    if (!current2) {
      merged[nodeId] = saved;
      continue;
    }
    const newer = current2.updatedAt >= saved.updatedAt ? current2 : saved;
    const older = newer === current2 ? saved : current2;
    const sessions = normalizeEntryList([
      ...listTextEditSessionEntries(newer),
      ...listTextEditSessionEntries(older),
    ]);
    merged[nodeId] = {
      ...older,
      ...newer,
      updatedAt: newer.updatedAt,
      ...(sessions.length > 0
        ? {
            sessions,
          }
        : {}),
    };
  }
  return merged;
}
export function collectTextEditSessionIds(bindings) {
  const ids2 = new Set();
  for (const binding of Object.values(bindings)) {
    for (const id2 of collectBindingSessionIds(binding)) ids2.add(id2);
  }
  return ids2;
}
export function collectBindingSessionIds(binding) {
  const ids2 = new Set();
  if (!binding) return ids2;
  if (binding.uiSessionId) ids2.add(binding.uiSessionId);
  if (binding.runtimeSessionId) ids2.add(binding.runtimeSessionId);
  for (const entry of listTextEditSessionEntries(binding)) {
    if (entry.uiSessionId) ids2.add(entry.uiSessionId);
    if (entry.runtimeSessionId) ids2.add(entry.runtimeSessionId);
  }
  return ids2;
}
export function resolveTextEditSessionId(binding, state2) {
  if (!binding) return null;
  const candidates2 = [binding.runtimeSessionId, binding.uiSessionId].filter((value) =>
    Boolean(value),
  );
  for (const candidate of candidates2) {
    if (state2.sessions.has(candidate)) return candidate;
  }
  for (const [sessionId, session] of state2.sessions) {
    if (session.runtimeSessionId && candidates2.includes(session.runtimeSessionId))
      return sessionId;
  }
  return null;
}
async function withCrossContextStorageLock(task) {
  if (typeof navigator !== "undefined" && navigator.locks) {
    let taskStarted = false;
    try {
      return await navigator.locks.request(CROSS_CONTEXT_WRITE_LOCK, async () => {
        taskStarted = true;
        return task();
      });
    } catch (error) {
      if (taskStarted) throw error;
    }
  }
  return task();
}
export class TextEditSessionBindingPersister {
  async load(workspaceKey) {
    if (!workspaceKey) return {};
    await bindingWriteQueue.catch(() => void 0);
    return withCrossContextStorageLock(async () => {
      const storage = getPlatformStorage$1();
      if (storage) {
        try {
          const record2 = normalizeTextEditSessionRecord(await storage.globalGet(STORAGE_KEY$3));
          writeLocalCache$1(record2);
          return record2[workspaceKey] ?? {};
        } catch {}
      }
      return cachedTextEditSessionBindings(workspaceKey);
    });
  }
  /**
   * Serialized read-modify-write against the authoritative record. The mutator
   * runs inside the cross-context lock and sees the freshest snapshot, so a
   * sibling window's concurrent write can never be clobbered. Returning null
   * deletes the node's record entirely.
   */
  mutate(workspaceKey, nodeId, mutator) {
    if (!workspaceKey || !nodeId) return Promise.resolve();
    bindingWriteQueue = bindingWriteQueue
      .catch(() => {})
      .then(() =>
        withCrossContextStorageLock(async () => {
          const storage = getPlatformStorage$1();
          let record2 = readLocalCache$1();
          if (storage) {
            try {
              record2 = normalizeTextEditSessionRecord(await storage.globalGet(STORAGE_KEY$3));
            } catch {}
          }
          const nextBinding = mutator(record2[workspaceKey]?.[nodeId]);
          const workspaceBindings = {
            ...(record2[workspaceKey] ?? {}),
          };
          if (nextBinding) workspaceBindings[nodeId] = nextBinding;
          else delete workspaceBindings[nodeId];
          const next2 = {
            ...record2,
            [workspaceKey]: workspaceBindings,
          };
          writeLocalCache$1(next2);
          if (storage) await storage.globalSet(STORAGE_KEY$3, next2);
        }),
      );
    return bindingWriteQueue;
  }
  upsert(workspaceKey, nodeId, patch2) {
    if (!workspaceKey || !nodeId || (!patch2.uiSessionId && !patch2.runtimeSessionId)) {
      return Promise.resolve();
    }
    return this.mutate(workspaceKey, nodeId, (current2) => {
      const entry = {
        ...(patch2.uiSessionId
          ? {
              uiSessionId: patch2.uiSessionId,
            }
          : {}),
        ...(patch2.runtimeSessionId
          ? {
              runtimeSessionId: patch2.runtimeSessionId,
            }
          : {}),
        updatedAt: patch2.updatedAt ?? Date.now(),
      };
      const mergeable =
        current2 !== void 0 &&
        (sameTextEditSessionEntry(current2, entry) ||
          (Boolean(entry.runtimeSessionId) &&
            !current2.runtimeSessionId &&
            (!entry.uiSessionId || entry.uiSessionId === current2.uiSessionId)) ||
          (Boolean(entry.uiSessionId) &&
            !current2.uiSessionId &&
            (!entry.runtimeSessionId || entry.runtimeSessionId === current2.runtimeSessionId)));
      const activeEntry = mergeable && current2 ? mergeEntry(current2, entry) : entry;
      return upsertTextEditSessionEntry(current2, activeEntry, {
        active: patch2.active !== false,
      });
    });
  }
  /** Keep the node's history but stop resuming its last conversation. */
  clearActive(workspaceKey, nodeId) {
    return this.mutate(workspaceKey, nodeId, (current2) =>
      current2 ? clearActiveTextEditSession(current2, Date.now()) : null,
    );
  }
  /** The canvas text node is gone — drop its whole private history. */
  remove(workspaceKey, nodeId) {
    return this.mutate(workspaceKey, nodeId, () => null);
  }
}
export function useAgentModeAwareSend(sendRaw, agentMode = "auto") {
  const agentModeRef = reactExports.useRef(agentMode);
  agentModeRef.current = agentMode;
  return reactExports.useCallback(
    (message2) => {
      if (message2.type === "create_session" || message2.type === "switch_session") {
        return sendRaw({
          ...message2,
          mode: message2.mode ?? agentModeRef.current,
        });
      }
      return sendRaw(message2);
    },
    [sendRaw],
  );
}
export function useChatCancel({
  busy,
  pendingReasons,
  sessionStore,
  controller,
  cancelInFlightSessionIdsRef,
  send: send2,
  clearMessageDeliveryTimersForSession,
}) {
  const previousBusyBySessionRef = reactExports.useRef(new Map());
  reactExports.useEffect(() => {
    const sid = sessionStore.getState().focusedSessionId;
    if (!sid) return;
    const previousBusy = previousBusyBySessionRef.current.get(sid);
    if (busy && previousBusy === false) {
      cancelInFlightSessionIdsRef.current.delete(sid);
    }
    previousBusyBySessionRef.current.set(sid, busy);
  }, [busy, cancelInFlightSessionIdsRef, sessionStore]);
  const performCancel = reactExports.useCallback(
    (source) => {
      const sid = sessionStore.getState().focusedSessionId;
      if (!sid) return;
      if (!busy && pendingReasons.length === 0) return;
      if (cancelInFlightSessionIdsRef.current.has(sid)) return;
      cancelInFlightSessionIdsRef.current.add(sid);
      recordAction("chat:cancel", {
        source,
        sessionId: sid,
        busy,
        pendingReasons: pendingReasons.map((r2) => `${r2.kind}:${r2.id}`),
      });
      const sent = send2({
        type: "cancel",
        session_id: sid,
        source,
        reason: busy ? "agent_running" : "pending_reasons",
      });
      if (!sent) {
        cancelInFlightSessionIdsRef.current.delete(sid);
        return;
      }
      clearMessageDeliveryTimersForSession(sid);
      sessionStore.finalizePendingTasks(sid);
      sessionStore.resolvePendingToolConfirms(sid);
      sessionStore.updateMessages(
        sid,
        (prev) =>
          prev.map((m3) =>
            (m3.type === "question" || m3.type === "interact" || m3.type === "confirm") &&
            !m3.resolved
              ? {
                  ...m3,
                  resolved: true,
                }
              : m3,
          ),
        {
          affectsUserAttention: true,
        },
      );
      controller.markSessionCancelled(sid);
      if (busy || pendingReasons.length > 0) {
        sessionStore.pushMessage(
          {
            id: nextMessageId(),
            role: "agent",
            type: "cancelled",
            content: "",
          },
          sid,
        );
      }
      sessionStore.setBusy(false, sid);
      sessionStore.setPendingReasons([], sid);
      controller.resetSession(sid);
    },
    [
      busy,
      cancelInFlightSessionIdsRef,
      clearMessageDeliveryTimersForSession,
      pendingReasons,
      sessionStore,
      send2,
      controller,
    ],
  );
  const handleCancel = reactExports.useCallback(() => {
    performCancel("message_stop_button");
  }, [performCancel]);
  return {
    performCancel,
    handleCancel,
  };
}
export function useModelDefaults({
  defaultModelId,
  defaultSelectedMediaModels,
  onRememberDefaults,
}) {
  const { t: t2 } = useTranslation();
  const pendingRef = reactExports.useRef(null);
  const persistedRef = reactExports.useRef({});
  persistedRef.current = {
    modelId: defaultModelId,
    media: defaultSelectedMediaModels,
  };
  const [, setRevision] = reactExports.useState(0);
  const getDefaults2 = reactExports.useCallback(
    () => pendingRef.current ?? persistedRef.current,
    [],
  );
  const rememberDefaults = reactExports.useCallback(
    async (selection2) => {
      const request = {
        ...getDefaults2(),
        ...selection2,
      };
      pendingRef.current = request;
      setRevision((revision) => revision + 1);
      if (!onRememberDefaults) return;
      let saved = false;
      try {
        saved = await onRememberDefaults(selection2);
      } catch {
      } finally {
        if (pendingRef.current === request) {
          pendingRef.current = null;
          setRevision((revision) => revision + 1);
        }
        if (!saved) dedupedToast.error(t2("chat.mediaModels.defaultSaveFailed"));
      }
    },
    [getDefaults2, onRememberDefaults, t2],
  );
  const getDefaultModelId = reactExports.useCallback(() => getDefaults2().modelId, [getDefaults2]);
  const getDefaultSelectedMediaModels = reactExports.useCallback(
    () => getDefaults2().media,
    [getDefaults2],
  );
  return {
    defaultModelId: getDefaults2().modelId,
    defaultSelectedMediaModels: getDefaults2().media,
    rememberDefaults,
    getDefaultModelId,
    getDefaultSelectedMediaModels,
  };
}
export function useChatModelSelection({
  sessionStore,
  send: send2,
  initialModelId,
  initialSelectedMediaModels,
  defaultModelId,
  defaultSelectedMediaModels,
  modelDefaultsHydrated,
  onRememberDefaults,
  pendingCreatePayloadRef,
}) {
  const {
    defaultModelId: effectiveDefaultModelId,
    defaultSelectedMediaModels: effectiveDefaultSelectedMediaModels,
    rememberDefaults,
    getDefaultModelId,
    getDefaultSelectedMediaModels,
  } = useModelDefaults({
    defaultModelId,
    defaultSelectedMediaModels,
    onRememberDefaults,
  });
  const activeCustomModel = useActiveCustomModel();
  const editedRef = reactExports.useRef({
    model: false,
    media: false,
  });
  const [selectedModelId, setSelectedModelId] = reactExports.useState(() => {
    const focused = sessionStore.getFocusedSession();
    return initialModelId ?? (focused ? (focused.modelId ?? null) : (defaultModelId ?? null));
  });
  const selectedModelIdRef = reactExports.useRef(selectedModelId);
  const effectiveSelectedModelId = resolveActiveModelId(selectedModelId, activeCustomModel.data);
  selectedModelIdRef.current = effectiveSelectedModelId;
  const [selectedMediaModels, setSelectedMediaModels] = reactExports.useState(() => {
    const focused = sessionStore.getFocusedSession();
    return (
      initialSelectedMediaModels ??
      (focused ? focused.selectedMediaModels : defaultSelectedMediaModels)
    );
  });
  const selectedMediaModelsRef = reactExports.useRef(selectedMediaModels);
  selectedMediaModelsRef.current = selectedMediaModels;
  const syncSelectedModelId = reactExports.useCallback((modelId) => {
    selectedModelIdRef.current = modelId;
    setSelectedModelId(modelId);
  }, []);
  const syncSelectedMediaModels = reactExports.useCallback((models) => {
    selectedMediaModelsRef.current = models;
    setSelectedMediaModels(models);
  }, []);
  const getSelectedModelId = reactExports.useCallback(
    () => resolveActiveModelId(selectedModelIdRef.current, activeCustomModel.data),
    [activeCustomModel.data],
  );
  const getSelectedMediaModels = reactExports.useCallback(() => selectedMediaModelsRef.current, []);
  const handleModelChange = reactExports.useCallback(
    (modelId) => {
      editedRef.current.model = true;
      syncSelectedModelId(modelId);
      const sid = sessionStore.getState().focusedSessionId;
      if (sid) {
        sessionStore.updateModelId(sid, modelId);
        send2({
          type: "update_model",
          model_id: modelId,
          session_id: sid,
        });
      }
    },
    [send2, sessionStore, syncSelectedModelId],
  );
  const handleSelectedMediaModelsChange = reactExports.useCallback(
    (next2) => {
      editedRef.current.media = true;
      syncSelectedMediaModels(next2);
      const sid = sessionStore.getState().focusedSessionId;
      if (sid) {
        sessionStore.setSelectedMediaModels(sid, next2);
        send2({
          type: "update_selected_media_models",
          session_id: sid,
          selected_media_models: next2,
        });
      }
    },
    [send2, sessionStore, syncSelectedMediaModels],
  );
  const handleModelSelectionChange = reactExports.useCallback(
    (selection2, rememberForNewChats = false) => {
      if (selection2.media !== void 0) handleSelectedMediaModelsChange(selection2.media);
      if (selection2.modelId !== void 0) handleModelChange(selection2.modelId);
      if (rememberForNewChats) void rememberDefaults(selection2);
    },
    [handleModelChange, handleSelectedMediaModelsChange, rememberDefaults],
  );
  reactExports.useEffect(() => {
    if (initialSelectedMediaModels === void 0) return;
    syncSelectedMediaModels(initialSelectedMediaModels);
  }, [initialSelectedMediaModels, syncSelectedMediaModels]);
  reactExports.useEffect(() => {
    if (!modelDefaultsHydrated) return;
    if (sessionStore.getState().focusedSessionId || pendingCreatePayloadRef.current) return;
    if (!initialModelId && !editedRef.current.model) {
      syncSelectedModelId(effectiveDefaultModelId ?? null);
    }
    if (initialSelectedMediaModels === void 0 && !editedRef.current.media) {
      syncSelectedMediaModels(effectiveDefaultSelectedMediaModels);
    }
  }, [
    effectiveDefaultModelId,
    effectiveDefaultSelectedMediaModels,
    initialModelId,
    initialSelectedMediaModels,
    modelDefaultsHydrated,
    pendingCreatePayloadRef,
    sessionStore,
    syncSelectedMediaModels,
    syncSelectedModelId,
  ]);
  const resetForNewChat = reactExports.useCallback(
    (preserveSelectedMediaModels) => {
      const nextMediaModels = preserveSelectedMediaModels
        ? selectedMediaModelsRef.current
        : getDefaultSelectedMediaModels();
      syncSelectedMediaModels(nextMediaModels);
      if (preserveSelectedMediaModels) return;
      editedRef.current = {
        model: false,
        media: false,
      };
      syncSelectedModelId(getDefaultModelId() ?? null);
    },
    [
      getDefaultModelId,
      getDefaultSelectedMediaModels,
      syncSelectedMediaModels,
      syncSelectedModelId,
    ],
  );
  return {
    getSelectedMediaModels,
    getSelectedModelId,
    handleModelChange,
    handleModelSelectionChange,
    handleSelectedMediaModelsChange,
    resetForNewChat,
    selectedMediaModels,
    selectedModelId: effectiveSelectedModelId,
    syncSelectedMediaModels,
    syncSelectedModelId,
  };
}
