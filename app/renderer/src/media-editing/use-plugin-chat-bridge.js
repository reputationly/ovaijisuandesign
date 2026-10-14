// use-plugin-chat-bridge.js
import { API_PATHS } from "../infra/workspace-gateway.js";
import reactExports from "react";
import { guardAccountSubmission } from "../infra/agent-http-client.js";
import { recordAction } from "../infra/gateway-http-error.jsx";
import { detectFileType } from "../canvas/diagnostic-history-tools.js";
import { TRACK_EVENTS } from "../infra/track-events.js";
import { trackEvent } from "../infra/sanitize-track-props.js";
import { nextMessageId } from "../chat/create-history-sub-agent-message.js";
import {
  getPluginAgentEditorState,
  getPluginAgentEditSession,
} from "./input.jsx";
import { accountScopedMessage } from "../assets/preview-media.jsx";
const SESSION_CREATE_TIMEOUT_MS = 1e4;
const MAX_PENDING_SESSION_CREATE_REQUESTS = 5;
const MESSAGE_DELIVERY_TIMEOUT_MS = 1e4;
const TIMED_OUT_PLUGIN_DELIVERY_LIMIT = 50;
const DEFAULT_RUNTIME_WATCHDOG_WINDOW_MS = 300 * 6e4;
const MESSAGE_RUNTIME_PROGRESS_TIMEOUT_MS = DEFAULT_RUNTIME_WATCHDOG_WINDOW_MS;
const MESSAGE_DELIVERY_TIMEOUT_ERROR = "Message delivery timed out.";
const SKILL_CACHE_TTL_MS = 3e4;
const FORWARDED_MESSAGE_TYPES = new Set([
  "text_chunk",
  "thinking",
  "text_end",
  "image",
  "video",
  "audio",
  "status",
  "task_notification",
  "interact_request",
  "confirm_request",
]);
function mapSkillBrief(skill) {
  return {
    name: skill.name,
    displayNameZh: skill.displayNameZh,
    summary: skill.summary,
    summaryZh: skill.summaryZh,
    description: skill.description,
    tags: skill.tags ?? [],
    tagsCn: skill.tagsCn ?? [],
    triggerWords: skill.triggerWords ?? [],
    enabled: skill.enabled,
    version: skill.version,
    source: skill.source,
  };
}
function extractText(messageFrame) {
  switch (messageFrame.type) {
    case "text_chunk":
    case "thinking":
    case "status":
    case "task_notification":
      return messageFrame.content;
    default:
      return void 0;
  }
}
function extractMedia(messageFrame) {
  if (messageFrame.type === "image" || messageFrame.type === "video" || messageFrame.type === "audio") {
    const mediaMessage = messageFrame;
    return {
      mediaUrl: mediaMessage.url,
      mediaPath: mediaMessage.path,
    };
  }
  return {};
}
function frameSessionId(messageFrame) {
  return "session_id" in messageFrame && typeof messageFrame.session_id === "string"
    ? messageFrame.session_id
    : "";
}
function withCode(err, code) {
  err.code = code;
  return err;
}
function assertPluginChatSubmissionAllowed() {
  const decision = guardAccountSubmission("chat");
  if (decision.allowed) return;
  throw withCode(
    new Error(`hub.chat: account submission blocked (${decision.reasonCode})`),
    "not_available",
  );
}
function recordPluginMessageDeliveryTimeoutBreadcrumb(
  sessionId,
  clientMessageId,
  stage,
) {
  Promise.resolve(
    window.hilo?.diagnostics?.addBreadcrumb?.(
      "network",
      "plugin-message-delivery: timeout",
      {
        session_id: sessionId,
        client_message_id: clientMessageId,
        stage,
      },
    ),
  ).catch(() => {});
}
function recordLatePluginFrameAfterTimeout(
  delivery,
  frameType,
  gatewayTimestamp,
) {
  if (delivery.observedFrameTypes.has(frameType)) return;
  delivery.observedFrameTypes.add(frameType);
  const rendererReceivedAt = Date.now();
  Promise.resolve(
    window.hilo?.diagnostics?.addBreadcrumb?.(
      "network",
      "plugin-message-delivery: late-frame-after-timeout",
      {
        session_id: delivery.sessionId,
        client_message_id: delivery.clientMessageId,
        frame_type: frameType,
        timeout_at: delivery.timedOutAt,
        renderer_received_at: rendererReceivedAt,
        recovery_delay_ms: rendererReceivedAt - delivery.timedOutAt,
        ...(gatewayTimestamp == null
          ? {}
          : {
              gateway_timestamp: gatewayTimestamp,
              gateway_after_timeout_ms: gatewayTimestamp - delivery.timedOutAt,
              renderer_after_gateway_ms: rendererReceivedAt - gatewayTimestamp,
            }),
      },
    ),
  ).catch(() => {});
}
export function usePluginChatBridge(gatewayFetch, webSocket, sessionStore) {
  const wsRef = reactExports.useRef(webSocket);
  wsRef.current = webSocket;
  const sessionStoreRef = reactExports.useRef(sessionStore);
  sessionStoreRef.current = sessionStore;
  const gatewayFetchRef = reactExports.useRef(gatewayFetch);
  gatewayFetchRef.current = gatewayFetch;
  const messageSubscribersRef = reactExports.useRef(new Set());
  const doneSubscribersRef = reactExports.useRef(new Set());
  const pendingSessionCreatesRef = reactExports.useRef(new Map());
  const pluginOwnedSessionsRef = reactExports.useRef(new Set());
  const pendingPluginMessageDeliveriesRef = reactExports.useRef(new Map());
  const timedOutPluginMessageDeliveriesRef = reactExports.useRef(new Map());
  const emitChatDone = reactExports.useCallback((payload, logContext) => {
    for (const subscriberCallback of doneSubscribersRef.current) {
      try {
        subscriberCallback(payload);
      } catch (err) {
        console.error(
          `[plugin-chat] done(${logContext}) subscriber threw`,
          err,
        );
      }
    }
  }, []);
  const hasPendingPluginDeliveryForSession = reactExports.useCallback(
    (sessionId) => {
      for (const pending of pendingPluginMessageDeliveriesRef.current.values()) {
        if (pending.sessionId === sessionId) return true;
      }
      return false;
    },
    [],
  );
  const clearPluginDelivery = reactExports.useCallback((clientMessageId) => {
    const pending =
      pendingPluginMessageDeliveriesRef.current.get(clientMessageId);
    if (!pending) return false;
    clearTimeout(pending.timer);
    pendingPluginMessageDeliveriesRef.current.delete(clientMessageId);
    return true;
  }, []);
  const clearPluginDeliveriesForSession = reactExports.useCallback(
    (sessionId) => {
      for (const pending of pendingPluginMessageDeliveriesRef.current.values()) {
        if (pending.sessionId !== sessionId) continue;
        clearTimeout(pending.timer);
        pendingPluginMessageDeliveriesRef.current.delete(
          pending.clientMessageId,
        );
      }
    },
    [],
  );
  const clearTimedOutPluginDeliveriesForSession = reactExports.useCallback(
    (sessionId) => {
      for (const delivery of timedOutPluginMessageDeliveriesRef.current.values()) {
        if (delivery.sessionId === sessionId) {
          timedOutPluginMessageDeliveriesRef.current.delete(
            delivery.clientMessageId,
          );
        }
      }
    },
    [],
  );
  const rememberTimedOutPluginDelivery = reactExports.useCallback(
    (sessionId, clientMessageId) => {
      const deliveries = timedOutPluginMessageDeliveriesRef.current;
      if (
        !deliveries.has(clientMessageId) &&
        deliveries.size >= TIMED_OUT_PLUGIN_DELIVERY_LIMIT
      ) {
        const oldestClientMessageId = deliveries.keys().next().value;
        if (typeof oldestClientMessageId === "string") {
          deliveries.delete(oldestClientMessageId);
        }
      }
      deliveries.set(clientMessageId, {
        sessionId,
        clientMessageId,
        timedOutAt: Date.now(),
        observedFrameTypes: new Set(),
      });
    },
    [],
  );
  const timedOutPluginDeliveryForSession = reactExports.useCallback(
    (sessionId) => {
      for (const delivery of timedOutPluginMessageDeliveriesRef.current.values()) {
        if (delivery.sessionId === sessionId) return delivery;
      }
      return void 0;
    },
    [],
  );
  const clearPendingSessionRequests = reactExports.useCallback((message) => {
    const pending = [...pendingSessionCreatesRef.current.values()];
    pendingSessionCreatesRef.current.clear();
    for (const request of pending) {
      clearTimeout(request.timer);
      request.reject(withCode(new Error(message), "not_available"));
    }
  }, []);
  const schedulePluginMessageDeliveryTimeout = reactExports.useCallback(
    (sessionId, clientMessageId, expectedStatus, timeoutMs) => {
      clearPluginDelivery(clientMessageId);
      const timer = setTimeout(() => {
        const pending =
          pendingPluginMessageDeliveriesRef.current.get(clientMessageId);
        if (!pending || pending.status !== expectedStatus) return;
        pendingPluginMessageDeliveriesRef.current.delete(clientMessageId);
        const timeoutStage =
          expectedStatus === "sent" ? "bridge_error" : "runtime_timeout";
        if (timeoutStage === "bridge_error") {
          rememberTimedOutPluginDelivery(sessionId, clientMessageId);
        }
        if (!hasPendingPluginDeliveryForSession(sessionId)) {
          pluginOwnedSessionsRef.current.delete(sessionId);
        }
        sessionStoreRef.current.setBusy(false, sessionId);
        recordPluginMessageDeliveryTimeoutBreadcrumb(
          sessionId,
          clientMessageId,
          timeoutStage,
        );
        trackEvent(TRACK_EVENTS.CHAT_MESSAGE_FAILED, {
          session_id: sessionId,
          error_type: "delivery",
          error_code: timeoutStage,
        });
        emitChatDone(
          {
            sessionId,
            taskId: null,
            status: "failed",
            errorMessage: MESSAGE_DELIVERY_TIMEOUT_ERROR,
          },
          "timeout",
        );
      }, timeoutMs);
      pendingPluginMessageDeliveriesRef.current.set(clientMessageId, {
        sessionId,
        clientMessageId,
        status: expectedStatus,
        timer,
      });
    },
    [
      clearPluginDelivery,
      emitChatDone,
      hasPendingPluginDeliveryForSession,
      rememberTimedOutPluginDelivery,
    ],
  );
  const markPluginMessageDeliverySent = reactExports.useCallback(
    (sessionId, clientMessageId) => {
      schedulePluginMessageDeliveryTimeout(
        sessionId,
        clientMessageId,
        "sent",
        MESSAGE_DELIVERY_TIMEOUT_MS,
      );
    },
    [schedulePluginMessageDeliveryTimeout],
  );
  const markPluginMessageDeliveryReceived = reactExports.useCallback(
    (sessionId, clientMessageId) => {
      schedulePluginMessageDeliveryTimeout(
        sessionId,
        clientMessageId,
        "received",
        MESSAGE_RUNTIME_PROGRESS_TIMEOUT_MS,
      );
    },
    [schedulePluginMessageDeliveryTimeout],
  );
  const markPluginMessageDeliveryAccepted = reactExports.useCallback(
    (sessionId, clientMessageId) => {
      schedulePluginMessageDeliveryTimeout(
        sessionId,
        clientMessageId,
        "accepted",
        MESSAGE_RUNTIME_PROGRESS_TIMEOUT_MS,
      );
    },
    [schedulePluginMessageDeliveryTimeout],
  );
  const markPluginMessageDeliveryStarted = reactExports.useCallback(
    (clientMessageId) => {
      clearPluginDelivery(clientMessageId);
    },
    [clearPluginDelivery],
  );
  const clearReceivedPluginDeliveriesForSession = reactExports.useCallback(
    (sessionId) => {
      for (const pending of pendingPluginMessageDeliveriesRef.current.values()) {
        if (
          pending.sessionId === sessionId &&
          (pending.status === "received" || pending.status === "accepted")
        ) {
          clearPluginDelivery(pending.clientMessageId);
        }
      }
    },
    [clearPluginDelivery],
  );
  const skillCacheRef = reactExports.useRef(null);
  const skillsInFlightRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    const unsub = webSocket.subscribe((messageFrame) => {
      const sessionId = frameSessionId(messageFrame);
      if (messageFrame.type === "session_created") {
        if (!messageFrame.request_id) return;
        const pending = pendingSessionCreatesRef.current.get(messageFrame.request_id);
        if (!pending) return;
        pendingSessionCreatesRef.current.delete(messageFrame.request_id);
        clearTimeout(pending.timer);
        pending.resolve(messageFrame.session_id);
        return;
      }
      if (!sessionId) return;
      if (messageFrame.type === "message_received") {
        const pending = pendingPluginMessageDeliveriesRef.current.get(
          messageFrame.client_message_id,
        );
        if (
          !pending ||
          pending.sessionId !== messageFrame.session_id ||
          pending.status !== "sent"
        ) {
          const timedOut = timedOutPluginMessageDeliveriesRef.current.get(
            messageFrame.client_message_id,
          );
          if (timedOut?.sessionId === messageFrame.session_id) {
            recordLatePluginFrameAfterTimeout(
              timedOut,
              messageFrame.type,
              messageFrame.timestamp,
            );
          }
          return;
        }
        markPluginMessageDeliveryReceived(
          messageFrame.session_id,
          messageFrame.client_message_id,
        );
        return;
      }
      if (messageFrame.type === "message_accepted") {
        const pending = pendingPluginMessageDeliveriesRef.current.get(
          messageFrame.client_message_id,
        );
        if (!pending || pending.sessionId !== sessionId) {
          const timedOut = timedOutPluginMessageDeliveriesRef.current.get(
            messageFrame.client_message_id,
          );
          if (timedOut?.sessionId === sessionId) {
            recordLatePluginFrameAfterTimeout(timedOut, messageFrame.type);
          }
          return;
        }
        markPluginMessageDeliveryAccepted(sessionId, messageFrame.client_message_id);
        return;
      }
      if (messageFrame.type === "message_started") {
        const pending = pendingPluginMessageDeliveriesRef.current.get(
          messageFrame.client_message_id,
        );
        if (!pending || pending.sessionId !== sessionId) {
          const timedOut = timedOutPluginMessageDeliveriesRef.current.get(
            messageFrame.client_message_id,
          );
          if (timedOut?.sessionId === sessionId) {
            recordLatePluginFrameAfterTimeout(timedOut, messageFrame.type);
          }
          return;
        }
        markPluginMessageDeliveryStarted(messageFrame.client_message_id);
        return;
      }
      if (FORWARDED_MESSAGE_TYPES.has(messageFrame.type)) {
        const timedOut = timedOutPluginDeliveryForSession(sessionId);
        if (timedOut) {
          recordLatePluginFrameAfterTimeout(timedOut, messageFrame.type);
        }
        clearReceivedPluginDeliveriesForSession(sessionId);
        const env = {
          sessionId,
          kind: messageFrame.type,
          text: extractText(messageFrame),
          ...extractMedia(messageFrame),
          raw: messageFrame,
        };
        for (const subscriberCallback of messageSubscribersRef.current) {
          try {
            subscriberCallback(env);
          } catch (err) {
            console.error("[plugin-chat] message subscriber threw", err);
          }
        }
        return;
      }
      if (messageFrame.type === "message_failed") {
        const pending = pendingPluginMessageDeliveriesRef.current.get(
          messageFrame.client_message_id,
        );
        if (!pending || pending.sessionId !== sessionId) {
          const timedOut = timedOutPluginMessageDeliveriesRef.current.get(
            messageFrame.client_message_id,
          );
          if (timedOut?.sessionId === sessionId) {
            recordLatePluginFrameAfterTimeout(timedOut, messageFrame.type);
            timedOutPluginMessageDeliveriesRef.current.delete(
              messageFrame.client_message_id,
            );
          }
          return;
        }
        clearPluginDelivery(messageFrame.client_message_id);
        sessionStoreRef.current.setBusy(false, sessionId);
        pluginOwnedSessionsRef.current.delete(sessionId);
        clearPluginDeliveriesForSession(sessionId);
        emitChatDone(
          {
            sessionId,
            taskId: null,
            status: "failed",
            errorMessage: messageFrame.error,
          },
          "message_failed",
        );
        return;
      }
      if (messageFrame.type === "done" || messageFrame.type === "error") {
        const timedOut = timedOutPluginDeliveryForSession(sessionId);
        if (timedOut) {
          recordLatePluginFrameAfterTimeout(timedOut, messageFrame.type);
          clearTimedOutPluginDeliveriesForSession(sessionId);
        }
        if (!pluginOwnedSessionsRef.current.has(sessionId)) return;
        clearPluginDeliveriesForSession(sessionId);
        emitChatDone(
          {
            sessionId,
            taskId: null,
            status: messageFrame.type === "done" ? "success" : "failed",
            errorMessage:
              messageFrame.type === "error" ? (messageFrame.content ?? void 0) : void 0,
          },
          messageFrame.type,
        );
      }
    });
    return unsub;
  }, [
    clearPluginDeliveriesForSession,
    clearPluginDelivery,
    clearReceivedPluginDeliveriesForSession,
    clearTimedOutPluginDeliveriesForSession,
    emitChatDone,
    markPluginMessageDeliveryAccepted,
    markPluginMessageDeliveryReceived,
    markPluginMessageDeliveryStarted,
    timedOutPluginDeliveryForSession,
    webSocket,
  ]);
  reactExports.useEffect(() => {
    const initial = sessionStore.getState().sessions;
    for (const sessionId of pluginOwnedSessionsRef.current) {
      if (!initial.has(sessionId)) {
        pluginOwnedSessionsRef.current.delete(sessionId);
        clearPluginDeliveriesForSession(sessionId);
      }
    }
    for (const delivery of timedOutPluginMessageDeliveriesRef.current.values()) {
      if (!initial.has(delivery.sessionId)) {
        timedOutPluginMessageDeliveriesRef.current.delete(
          delivery.clientMessageId,
        );
      }
    }
    return sessionStore.subscribe((state) => {
      const live = state.sessions;
      for (const sessionId of pluginOwnedSessionsRef.current) {
        if (!live.has(sessionId)) {
          pluginOwnedSessionsRef.current.delete(sessionId);
          clearPluginDeliveriesForSession(sessionId);
        }
      }
      for (const delivery of timedOutPluginMessageDeliveriesRef.current.values()) {
        if (!live.has(delivery.sessionId)) {
          timedOutPluginMessageDeliveriesRef.current.delete(
            delivery.clientMessageId,
          );
        }
      }
    });
  }, [clearPluginDeliveriesForSession, sessionStore]);
  reactExports.useEffect(() => {
    return () => {
      clearPendingSessionRequests(
        "hub.chat: bridge unmounted before create_session completed",
      );
      for (const pending of pendingPluginMessageDeliveriesRef.current.values()) {
        clearTimeout(pending.timer);
      }
      pendingPluginMessageDeliveriesRef.current.clear();
      timedOutPluginMessageDeliveriesRef.current.clear();
    };
  }, [clearPendingSessionRequests]);
  const requestNewSession = reactExports.useCallback((sessionName) => {
    if (
      pendingSessionCreatesRef.current.size >=
      MAX_PENDING_SESSION_CREATE_REQUESTS
    ) {
      return Promise.reject(
        withCode(
          new Error(
            `hub.chat: too many pending create_session requests (${MAX_PENDING_SESSION_CREATE_REQUESTS})`,
          ),
          "not_available",
        ),
      );
    }
    const requestId = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pendingSessionCreatesRef.current.delete(requestId);
        reject(
          withCode(
            new Error("hub.chat: create_session timed out"),
            "not_available",
          ),
        );
      }, SESSION_CREATE_TIMEOUT_MS);
      pendingSessionCreatesRef.current.set(requestId, {
        resolve,
        reject,
        timer,
      });
      const isCreateRequestSent = wsRef.current.send({
        type: "create_session",
        request_id: requestId,
        activate: false,
        ...(sessionName
          ? {
              name: sessionName,
            }
          : {}),
      });
      if (!isCreateRequestSent) {
        clearTimeout(timer);
        pendingSessionCreatesRef.current.delete(requestId);
        reject(
          withCode(new Error("hub.chat: WS not connected"), "not_available"),
        );
      }
    });
  }, []);
  const sendChatMessage = reactExports.useCallback(
    async (args, callContext) => {
      const content = typeof args.content === "string" ? args.content : "";
      const attachments = args.attachments ?? [];
      const canvasNodeAttachments = args.canvasNodeAttachments ?? [];
      if (!content.trim() && attachments.length === 0) {
        throw withCode(
          new Error("hub.chat: content or attachments required"),
          "invalid_args",
        );
      }
      assertPluginChatSubmissionAllowed();
      let sessionId = args.sessionId;
      let createdSession = false;
      if (!sessionId && args.useCurrentSession) {
        const focused = sessionStoreRef.current.getState().focusedSessionId;
        if (focused) sessionId = focused;
      }
      if (!sessionId) {
        sessionId = await requestNewSession(args.sessionName);
        createdSession = true;
      }
      assertPluginChatSubmissionAllowed();
      const sourceNodeId =
        typeof args.sourceNodeId === "string"
          ? args.sourceNodeId
          : callContext.callerNodeId;
      const finalCanvasNodeAttachments = sourceNodeId
        ? canvasNodeAttachments
        : canvasNodeAttachments.filter((canvasNodeAttachment) => canvasNodeAttachment.nodeId !== "");
      const messageId = nextMessageId();
      const chatAttachments =
        attachments.length > 0
          ? attachments.map((attachmentPath) => ({
              path: attachmentPath,
              url: API_PATHS.serveFile(attachmentPath),
              type: detectFileType(attachmentPath) ?? "file",
            }))
          : void 0;
      sessionStoreRef.current.pushMessage(
        {
          id: messageId,
          role: "user",
          type: "text",
          content,
          attachments: chatAttachments,
        },
        sessionId,
      );
      const editSessionId = callContext.callerNodeId
        ? getPluginAgentEditSession(callContext.callerNodeId)
        : null;
      const editorStateSnapshot = editSessionId
        ? getPluginAgentEditorState(callContext.callerNodeId)
        : null;
      const pluginEditContext = editSessionId
        ? {
            editSessionId,
            node: {
              nodeId: callContext.callerNodeId,
            },
            ...(editorStateSnapshot
              ? {
                  editorState: editorStateSnapshot,
                }
              : {}),
          }
        : void 0;
      const clientMessageId = crypto.randomUUID();
      const sender = (message) => wsRef.current.send(message);
      const isChatMessageSent = accountScopedMessage.send("chat", sender, {
        type: "message",
        content,
        agent_type: args.agentType ?? "general",
        attachments: attachments.length > 0 ? attachments : void 0,
        canvas_node_attachments:
          finalCanvasNodeAttachments.length > 0
            ? finalCanvasNodeAttachments
            : void 0,
        plugin_edit_context: pluginEditContext,
        async: args.async ?? true,
        client_message_id: clientMessageId,
        session_id: sessionId,
      });
      if (!isChatMessageSent) {
        sessionStoreRef.current.removeMessageById(sessionId, messageId);
        throw withCode(
          new Error("hub.chat: submission blocked or WS not connected"),
          "not_available",
        );
      }
      sessionStoreRef.current.setBusy(true, sessionId);
      pluginOwnedSessionsRef.current.add(sessionId);
      markPluginMessageDeliverySent(sessionId, clientMessageId);
      trackEvent(TRACK_EVENTS.CHAT_MESSAGE_SEND, {
        session_id: sessionId,
        text_length: content.length,
        attachment_count: attachments.length,
      });
      return {
        sessionId,
        taskId: null,
        createdSession,
      };
    },
    [markPluginMessageDeliverySent, requestNewSession],
  );
  const cancelChat = reactExports.useCallback(
    async (sessionId) => {
      if (!sessionId) return;
      recordAction("chat:cancel", {
        source: "plugin_chat_cancel",
        sessionId,
      });
      const sent = wsRef.current.send({
        type: "cancel",
        session_id: sessionId,
        source: "plugin_chat_cancel",
        reason: "hub.chat.cancel",
      });
      sessionStoreRef.current.finalizePendingTasks(sessionId);
      sessionStoreRef.current.setBusy(false, sessionId);
      pluginOwnedSessionsRef.current.delete(sessionId);
      clearPluginDeliveriesForSession(sessionId);
      if (!sent) return;
      emitChatDone(
        {
          sessionId,
          taskId: null,
          status: "cancelled",
        },
        "cancelled",
      );
    },
    [clearPluginDeliveriesForSession, emitChatDone],
  );
  const subscribeChatMessages = reactExports.useCallback((messageCallback) => {
    messageSubscribersRef.current.add(messageCallback);
    return () => {
      messageSubscribersRef.current.delete(messageCallback);
    };
  }, []);
  const subscribeChatDone = reactExports.useCallback((doneCallback) => {
    doneSubscribersRef.current.add(doneCallback);
    return () => {
      doneSubscribersRef.current.delete(doneCallback);
    };
  }, []);
  const fetchSkills = reactExports.useCallback(async () => {
    if (skillsInFlightRef.current) return skillsInFlightRef.current;
    const skillsFetchPromise = (async () => {
      try {
        const resp = await gatewayFetchRef.current("/api/skills");
        if (!resp.ok) {
          throw withCode(
            new Error(`hub.skill.list: gateway returned ${resp.status}`),
            "not_available",
          );
        }
        const data = await resp.json();
        const list = Array.isArray(data) ? data.map(mapSkillBrief) : [];
        skillCacheRef.current = {
          at: Date.now(),
          list,
        };
        return list;
      } finally {
        skillsInFlightRef.current = null;
      }
    })();
    skillsInFlightRef.current = skillsFetchPromise;
    return skillsFetchPromise;
  }, []);
  const listSkills = reactExports.useCallback(async () => {
    const cached = skillCacheRef.current;
    if (cached && Date.now() - cached.at < SKILL_CACHE_TTL_MS) {
      return cached.list;
    }
    return fetchSkills();
  }, [fetchSkills]);
  const getSkill = reactExports.useCallback(
    async (skillName) => {
      const list = await listSkills();
      return list.find((skill) => skill.name === skillName) ?? null;
    },
    [listSkills],
  );
  const invalidateSkillCache = reactExports.useCallback(() => {
    skillCacheRef.current = null;
  }, []);
  return {
    sendChatMessage,
    cancelChat,
    subscribeChatMessages,
    subscribeChatDone,
    listSkills,
    getSkill,
    invalidateSkillCache,
  };
}
