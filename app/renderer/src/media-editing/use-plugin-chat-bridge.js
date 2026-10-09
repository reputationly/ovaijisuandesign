// use-plugin-chat-bridge.js
import { reactExports, API_PATHS, guardAccountSubmission } from "../vendor.js";
import { recordAction } from "../infra/agent-ws-client.jsx";
import { detectFileType } from "../canvas/relayout-group-children.js";
import { TRACK_EVENTS } from "../infra/track-events.js";
import { trackEvent } from "../infra/init-track.js";
import { nextMessageId } from "../chat/reduce-server-message.js";
import { getPluginAgentEditSession, getPluginAgentEditorState } from "./use-plugin-host.jsx";
import {
  FORWARDED_MESSAGE_TYPES,
  MAX_PENDING_SESSION_CREATE_REQUESTS,
  MESSAGE_DELIVERY_TIMEOUT_ERROR,
  MESSAGE_DELIVERY_TIMEOUT_MS$1,
  MESSAGE_RUNTIME_PROGRESS_TIMEOUT_MS$1,
  SESSION_CREATE_TIMEOUT_MS$1,
  SKILL_CACHE_TTL_MS,
  TIMED_OUT_PLUGIN_DELIVERY_LIMIT,
  accountScopedMessage,
  extractMedia,
  extractText,
  mapSkillBrief,
} from "../assets/scrollable-asset-view.jsx";
function frameSessionId(msg) {
  return "session_id" in msg && typeof msg.session_id === "string" ? msg.session_id : "";
}
function withCode$1(err, code2) {
  err.code = code2;
  return err;
}
function assertPluginChatSubmissionAllowed() {
  const decision = guardAccountSubmission("chat");
  if (decision.allowed) return;
  throw withCode$1(
    new Error(`hub.chat: account submission blocked (${decision.reasonCode})`),
    "not_available",
  );
}
function recordPluginMessageDeliveryTimeoutBreadcrumb(sessionId, clientMessageId, stage) {
  Promise.resolve(
    window.hilo?.diagnostics?.addBreadcrumb?.("network", "plugin-message-delivery: timeout", {
      session_id: sessionId,
      client_message_id: clientMessageId,
      stage,
    }),
  ).catch(() => {});
}
function recordLatePluginFrameAfterTimeout(delivery, frameType, gatewayTimestamp) {
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
export function usePluginChatBridge(gatewayFetch2, ws2, sessionStore) {
  const wsRef = reactExports.useRef(ws2);
  wsRef.current = ws2;
  const sessionStoreRef = reactExports.useRef(sessionStore);
  sessionStoreRef.current = sessionStore;
  const gatewayFetchRef = reactExports.useRef(gatewayFetch2);
  gatewayFetchRef.current = gatewayFetch2;
  const messageSubscribersRef = reactExports.useRef(new Set());
  const doneSubscribersRef = reactExports.useRef(new Set());
  const pendingSessionCreatesRef = reactExports.useRef(new Map());
  const pluginOwnedSessionsRef = reactExports.useRef(new Set());
  const pendingPluginMessageDeliveriesRef = reactExports.useRef(new Map());
  const timedOutPluginMessageDeliveriesRef = reactExports.useRef(new Map());
  const emitChatDone = reactExports.useCallback((payload, logContext) => {
    for (const cb of doneSubscribersRef.current) {
      try {
        cb(payload);
      } catch (err) {
        console.error(`[plugin-chat] done(${logContext}) subscriber threw`, err);
      }
    }
  }, []);
  const hasPendingPluginDeliveryForSession = reactExports.useCallback((sessionId) => {
    for (const pending2 of pendingPluginMessageDeliveriesRef.current.values()) {
      if (pending2.sessionId === sessionId) return true;
    }
    return false;
  }, []);
  const clearPluginDelivery = reactExports.useCallback((clientMessageId) => {
    const pending2 = pendingPluginMessageDeliveriesRef.current.get(clientMessageId);
    if (!pending2) return false;
    clearTimeout(pending2.timer);
    pendingPluginMessageDeliveriesRef.current.delete(clientMessageId);
    return true;
  }, []);
  const clearPluginDeliveriesForSession = reactExports.useCallback((sessionId) => {
    for (const pending2 of pendingPluginMessageDeliveriesRef.current.values()) {
      if (pending2.sessionId !== sessionId) continue;
      clearTimeout(pending2.timer);
      pendingPluginMessageDeliveriesRef.current.delete(pending2.clientMessageId);
    }
  }, []);
  const clearTimedOutPluginDeliveriesForSession = reactExports.useCallback((sessionId) => {
    for (const delivery of timedOutPluginMessageDeliveriesRef.current.values()) {
      if (delivery.sessionId === sessionId) {
        timedOutPluginMessageDeliveriesRef.current.delete(delivery.clientMessageId);
      }
    }
  }, []);
  const rememberTimedOutPluginDelivery = reactExports.useCallback((sessionId, clientMessageId) => {
    const deliveries = timedOutPluginMessageDeliveriesRef.current;
    if (!deliveries.has(clientMessageId) && deliveries.size >= TIMED_OUT_PLUGIN_DELIVERY_LIMIT) {
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
  }, []);
  const timedOutPluginDeliveryForSession = reactExports.useCallback((sessionId) => {
    for (const delivery of timedOutPluginMessageDeliveriesRef.current.values()) {
      if (delivery.sessionId === sessionId) return delivery;
    }
    return void 0;
  }, []);
  const clearPendingSessionRequests = reactExports.useCallback((message2) => {
    const pending2 = [...pendingSessionCreatesRef.current.values()];
    pendingSessionCreatesRef.current.clear();
    for (const request of pending2) {
      clearTimeout(request.timer);
      request.reject(withCode$1(new Error(message2), "not_available"));
    }
  }, []);
  const schedulePluginMessageDeliveryTimeout = reactExports.useCallback(
    (sessionId, clientMessageId, expectedStatus, timeoutMs) => {
      clearPluginDelivery(clientMessageId);
      const timer2 = setTimeout(() => {
        const pending2 = pendingPluginMessageDeliveriesRef.current.get(clientMessageId);
        if (!pending2 || pending2.status !== expectedStatus) return;
        pendingPluginMessageDeliveriesRef.current.delete(clientMessageId);
        const timeoutStage = expectedStatus === "sent" ? "bridge_error" : "runtime_timeout";
        if (timeoutStage === "bridge_error") {
          rememberTimedOutPluginDelivery(sessionId, clientMessageId);
        }
        if (!hasPendingPluginDeliveryForSession(sessionId)) {
          pluginOwnedSessionsRef.current.delete(sessionId);
        }
        sessionStoreRef.current.setBusy(false, sessionId);
        recordPluginMessageDeliveryTimeoutBreadcrumb(sessionId, clientMessageId, timeoutStage);
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
        timer: timer2,
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
        MESSAGE_DELIVERY_TIMEOUT_MS$1,
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
        MESSAGE_RUNTIME_PROGRESS_TIMEOUT_MS$1,
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
        MESSAGE_RUNTIME_PROGRESS_TIMEOUT_MS$1,
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
      for (const pending2 of pendingPluginMessageDeliveriesRef.current.values()) {
        if (
          pending2.sessionId === sessionId &&
          (pending2.status === "received" || pending2.status === "accepted")
        ) {
          clearPluginDelivery(pending2.clientMessageId);
        }
      }
    },
    [clearPluginDelivery],
  );
  const skillCacheRef = reactExports.useRef(null);
  const skillsInFlightRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    const unsub = ws2.subscribe((msg) => {
      const sid = frameSessionId(msg);
      if (msg.type === "session_created") {
        if (!msg.request_id) return;
        const pending2 = pendingSessionCreatesRef.current.get(msg.request_id);
        if (!pending2) return;
        pendingSessionCreatesRef.current.delete(msg.request_id);
        clearTimeout(pending2.timer);
        pending2.resolve(msg.session_id);
        return;
      }
      if (!sid) return;
      if (msg.type === "message_received") {
        const pending2 = pendingPluginMessageDeliveriesRef.current.get(msg.client_message_id);
        if (!pending2 || pending2.sessionId !== msg.session_id || pending2.status !== "sent") {
          const timedOut = timedOutPluginMessageDeliveriesRef.current.get(msg.client_message_id);
          if (timedOut?.sessionId === msg.session_id) {
            recordLatePluginFrameAfterTimeout(timedOut, msg.type, msg.timestamp);
          }
          return;
        }
        markPluginMessageDeliveryReceived(msg.session_id, msg.client_message_id);
        return;
      }
      if (msg.type === "message_accepted") {
        const pending2 = pendingPluginMessageDeliveriesRef.current.get(msg.client_message_id);
        if (!pending2 || pending2.sessionId !== sid) {
          const timedOut = timedOutPluginMessageDeliveriesRef.current.get(msg.client_message_id);
          if (timedOut?.sessionId === sid) {
            recordLatePluginFrameAfterTimeout(timedOut, msg.type);
          }
          return;
        }
        markPluginMessageDeliveryAccepted(sid, msg.client_message_id);
        return;
      }
      if (msg.type === "message_started") {
        const pending2 = pendingPluginMessageDeliveriesRef.current.get(msg.client_message_id);
        if (!pending2 || pending2.sessionId !== sid) {
          const timedOut = timedOutPluginMessageDeliveriesRef.current.get(msg.client_message_id);
          if (timedOut?.sessionId === sid) {
            recordLatePluginFrameAfterTimeout(timedOut, msg.type);
          }
          return;
        }
        markPluginMessageDeliveryStarted(msg.client_message_id);
        return;
      }
      if (FORWARDED_MESSAGE_TYPES.has(msg.type)) {
        const timedOut = timedOutPluginDeliveryForSession(sid);
        if (timedOut) {
          recordLatePluginFrameAfterTimeout(timedOut, msg.type);
        }
        clearReceivedPluginDeliveriesForSession(sid);
        const env2 = {
          sessionId: sid,
          kind: msg.type,
          text: extractText(msg),
          ...extractMedia(msg),
          raw: msg,
        };
        for (const cb of messageSubscribersRef.current) {
          try {
            cb(env2);
          } catch (err) {
            console.error("[plugin-chat] message subscriber threw", err);
          }
        }
        return;
      }
      if (msg.type === "message_failed") {
        const pending2 = pendingPluginMessageDeliveriesRef.current.get(msg.client_message_id);
        if (!pending2 || pending2.sessionId !== sid) {
          const timedOut = timedOutPluginMessageDeliveriesRef.current.get(msg.client_message_id);
          if (timedOut?.sessionId === sid) {
            recordLatePluginFrameAfterTimeout(timedOut, msg.type);
            timedOutPluginMessageDeliveriesRef.current.delete(msg.client_message_id);
          }
          return;
        }
        clearPluginDelivery(msg.client_message_id);
        sessionStoreRef.current.setBusy(false, sid);
        pluginOwnedSessionsRef.current.delete(sid);
        clearPluginDeliveriesForSession(sid);
        emitChatDone(
          {
            sessionId: sid,
            taskId: null,
            status: "failed",
            errorMessage: msg.error,
          },
          "message_failed",
        );
        return;
      }
      if (msg.type === "done" || msg.type === "error") {
        const timedOut = timedOutPluginDeliveryForSession(sid);
        if (timedOut) {
          recordLatePluginFrameAfterTimeout(timedOut, msg.type);
          clearTimedOutPluginDeliveriesForSession(sid);
        }
        if (!pluginOwnedSessionsRef.current.has(sid)) return;
        clearPluginDeliveriesForSession(sid);
        emitChatDone(
          {
            sessionId: sid,
            taskId: null,
            status: msg.type === "done" ? "success" : "failed",
            errorMessage: msg.type === "error" ? (msg.content ?? void 0) : void 0,
          },
          msg.type,
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
    ws2,
  ]);
  reactExports.useEffect(() => {
    const initial = sessionStore.getState().sessions;
    for (const id2 of pluginOwnedSessionsRef.current) {
      if (!initial.has(id2)) {
        pluginOwnedSessionsRef.current.delete(id2);
        clearPluginDeliveriesForSession(id2);
      }
    }
    for (const delivery of timedOutPluginMessageDeliveriesRef.current.values()) {
      if (!initial.has(delivery.sessionId)) {
        timedOutPluginMessageDeliveriesRef.current.delete(delivery.clientMessageId);
      }
    }
    return sessionStore.subscribe((state2) => {
      const live = state2.sessions;
      for (const id2 of pluginOwnedSessionsRef.current) {
        if (!live.has(id2)) {
          pluginOwnedSessionsRef.current.delete(id2);
          clearPluginDeliveriesForSession(id2);
        }
      }
      for (const delivery of timedOutPluginMessageDeliveriesRef.current.values()) {
        if (!live.has(delivery.sessionId)) {
          timedOutPluginMessageDeliveriesRef.current.delete(delivery.clientMessageId);
        }
      }
    });
  }, [clearPluginDeliveriesForSession, sessionStore]);
  reactExports.useEffect(() => {
    return () => {
      clearPendingSessionRequests("hub.chat: bridge unmounted before create_session completed");
      for (const pending2 of pendingPluginMessageDeliveriesRef.current.values()) {
        clearTimeout(pending2.timer);
      }
      pendingPluginMessageDeliveriesRef.current.clear();
      timedOutPluginMessageDeliveriesRef.current.clear();
    };
  }, [clearPendingSessionRequests]);
  const requestNewSession = reactExports.useCallback((sessionName) => {
    if (pendingSessionCreatesRef.current.size >= MAX_PENDING_SESSION_CREATE_REQUESTS) {
      return Promise.reject(
        withCode$1(
          new Error(
            `hub.chat: too many pending create_session requests (${MAX_PENDING_SESSION_CREATE_REQUESTS})`,
          ),
          "not_available",
        ),
      );
    }
    const requestId = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      const timer2 = setTimeout(() => {
        pendingSessionCreatesRef.current.delete(requestId);
        reject(withCode$1(new Error("hub.chat: create_session timed out"), "not_available"));
      }, SESSION_CREATE_TIMEOUT_MS$1);
      pendingSessionCreatesRef.current.set(requestId, {
        resolve,
        reject,
        timer: timer2,
      });
      const ok2 = wsRef.current.send({
        type: "create_session",
        request_id: requestId,
        activate: false,
        ...(sessionName
          ? {
              name: sessionName,
            }
          : {}),
      });
      if (!ok2) {
        clearTimeout(timer2);
        pendingSessionCreatesRef.current.delete(requestId);
        reject(withCode$1(new Error("hub.chat: WS not connected"), "not_available"));
      }
    });
  }, []);
  const sendChatMessage = reactExports.useCallback(
    async (args, ctx) => {
      const content2 = typeof args.content === "string" ? args.content : "";
      const attachments = args.attachments ?? [];
      const canvasNodeAttachments = args.canvasNodeAttachments ?? [];
      if (!content2.trim() && attachments.length === 0) {
        throw withCode$1(new Error("hub.chat: content or attachments required"), "invalid_args");
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
        typeof args.sourceNodeId === "string" ? args.sourceNodeId : ctx.callerNodeId;
      const finalCanvasNodeAttachments = sourceNodeId
        ? canvasNodeAttachments
        : canvasNodeAttachments.filter((a2) => a2.nodeId !== "");
      const messageId = nextMessageId();
      const chatAttachments =
        attachments.length > 0
          ? attachments.map((p3) => ({
              path: p3,
              url: API_PATHS.serveFile(p3),
              type: detectFileType(p3) ?? "file",
            }))
          : void 0;
      sessionStoreRef.current.pushMessage(
        {
          id: messageId,
          role: "user",
          type: "text",
          content: content2,
          attachments: chatAttachments,
        },
        sessionId,
      );
      const editSessionId = ctx.callerNodeId ? getPluginAgentEditSession(ctx.callerNodeId) : null;
      const editorStateSnapshot = editSessionId
        ? getPluginAgentEditorState(ctx.callerNodeId)
        : null;
      const pluginEditContext = editSessionId
        ? {
            editSessionId,
            node: {
              nodeId: ctx.callerNodeId,
            },
            ...(editorStateSnapshot
              ? {
                  editorState: editorStateSnapshot,
                }
              : {}),
          }
        : void 0;
      const clientMessageId = crypto.randomUUID();
      const sender = (message2) => wsRef.current.send(message2);
      const ok2 = accountScopedMessage.send("chat", sender, {
        type: "message",
        content: content2,
        agent_type: args.agentType ?? "general",
        attachments: attachments.length > 0 ? attachments : void 0,
        canvas_node_attachments:
          finalCanvasNodeAttachments.length > 0 ? finalCanvasNodeAttachments : void 0,
        plugin_edit_context: pluginEditContext,
        async: args.async ?? true,
        client_message_id: clientMessageId,
        session_id: sessionId,
      });
      if (!ok2) {
        sessionStoreRef.current.removeMessageById(sessionId, messageId);
        throw withCode$1(
          new Error("hub.chat: submission blocked or WS not connected"),
          "not_available",
        );
      }
      sessionStoreRef.current.setBusy(true, sessionId);
      pluginOwnedSessionsRef.current.add(sessionId);
      markPluginMessageDeliverySent(sessionId, clientMessageId);
      trackEvent(TRACK_EVENTS.CHAT_MESSAGE_SEND, {
        session_id: sessionId,
        text_length: content2.length,
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
  const subscribeChatMessages = reactExports.useCallback((cb) => {
    messageSubscribersRef.current.add(cb);
    return () => {
      messageSubscribersRef.current.delete(cb);
    };
  }, []);
  const subscribeChatDone = reactExports.useCallback((cb) => {
    doneSubscribersRef.current.add(cb);
    return () => {
      doneSubscribersRef.current.delete(cb);
    };
  }, []);
  const fetchSkills2 = reactExports.useCallback(async () => {
    if (skillsInFlightRef.current) return skillsInFlightRef.current;
    const p3 = (async () => {
      try {
        const resp = await gatewayFetchRef.current("/api/skills");
        if (!resp.ok) {
          throw withCode$1(
            new Error(`hub.skill.list: gateway returned ${resp.status}`),
            "not_available",
          );
        }
        const data2 = await resp.json();
        const list2 = Array.isArray(data2) ? data2.map(mapSkillBrief) : [];
        skillCacheRef.current = {
          at: Date.now(),
          list: list2,
        };
        return list2;
      } finally {
        skillsInFlightRef.current = null;
      }
    })();
    skillsInFlightRef.current = p3;
    return p3;
  }, []);
  const listSkills = reactExports.useCallback(async () => {
    const cached = skillCacheRef.current;
    if (cached && Date.now() - cached.at < SKILL_CACHE_TTL_MS) {
      return cached.list;
    }
    return fetchSkills2();
  }, [fetchSkills2]);
  const getSkill = reactExports.useCallback(
    async (name2) => {
      const list2 = await listSkills();
      return list2.find((s2) => s2.name === name2) ?? null;
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
