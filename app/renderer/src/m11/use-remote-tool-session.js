// use-remote-tool-session.js
import { reactExports, remoteToolLog, guardAccountSubmission } from "../vendor.js";
const QUEUED_USER_MESSAGE_CANCEL_TIMEOUT_MS = 5e3;
export function useQueuedUserMessageCancellation({ sessionStore, send: send2 }) {
  const pendingRef = reactExports.useRef(new Map());
  const settleMatching = reactExports.useCallback((sessionId, ids2, cancelled) => {
    const queueIds = new Set(ids2.queueIds ?? []);
    const clientMessageIds = new Set(ids2.clientMessageIds ?? []);
    for (const [key2, pending2] of pendingRef.current) {
      if (pending2.sessionId !== sessionId) continue;
      if (!clientMessageIds.has(pending2.clientMessageId)) continue;
      if (pending2.queueId && !queueIds.has(pending2.queueId)) continue;
      pendingRef.current.delete(key2);
      clearTimeout(pending2.timeout);
      pending2.resolve(cancelled);
    }
  }, []);
  const settleQueuedUserMessageCancellation = reactExports.useCallback(
    (message2) => {
      if (message2.type === "queued_user_message") {
        settleMatching(
          message2.session_id,
          {
            queueIds: [message2.queue_id],
            clientMessageIds: [message2.client_message_id],
          },
          false,
        );
      } else if (message2.type === "queued_user_messages_delivered") {
        settleMatching(
          message2.session_id,
          {
            queueIds: message2.queue_ids,
            clientMessageIds: message2.client_message_ids,
          },
          false,
        );
      } else if (message2.type === "queued_user_messages_started") {
        settleMatching(
          message2.session_id,
          {
            queueIds: message2.messages.map((item) => item.queue_id),
            clientMessageIds: message2.messages.map((item) => item.client_message_id),
          },
          false,
        );
      } else if (message2.type === "queued_user_messages_cancelled") {
        settleMatching(
          message2.session_id,
          {
            queueIds: message2.queue_ids,
            clientMessageIds: message2.client_message_ids,
          },
          true,
        );
      }
    },
    [settleMatching],
  );
  const rejectQueuedUserMessageCancellations = reactExports.useCallback(() => {
    for (const pending2 of pendingRef.current.values()) {
      clearTimeout(pending2.timeout);
      pending2.resolve(false);
    }
    pendingRef.current.clear();
  }, []);
  const cancelQueuedUserMessage = reactExports.useCallback(
    (message2) => {
      const sessionId = sessionStore.getState().focusedSessionId;
      if (!sessionId) return Promise.resolve(false);
      const pendingKey = `${sessionId}\0${message2.clientMessageId}`;
      if (pendingRef.current.has(pendingKey)) return Promise.resolve(false);
      let resolveCancellation;
      const cancellation = new Promise((resolve) => {
        resolveCancellation = resolve;
      });
      const timeout2 = setTimeout(() => {
        const pending2 = pendingRef.current.get(pendingKey);
        if (!pending2) return;
        pendingRef.current.delete(pendingKey);
        pending2.resolve(false);
      }, QUEUED_USER_MESSAGE_CANCEL_TIMEOUT_MS);
      pendingRef.current.set(pendingKey, {
        sessionId,
        clientMessageId: message2.clientMessageId,
        queueId: message2.queueId,
        resolve: resolveCancellation,
        timeout: timeout2,
      });
      if (
        !send2({
          type: "cancel_queued_user_message",
          session_id: sessionId,
          queue_id: message2.queueId,
          client_message_id: message2.clientMessageId,
        })
      ) {
        const pending2 = pendingRef.current.get(pendingKey);
        if (pending2) {
          pendingRef.current.delete(pendingKey);
          clearTimeout(pending2.timeout);
          pending2.resolve(false);
        }
      }
      return cancellation;
    },
    [send2, sessionStore],
  );
  reactExports.useEffect(
    () => rejectQueuedUserMessageCancellations,
    [rejectQueuedUserMessageCancellations],
  );
  return {
    cancelQueuedUserMessage,
    settleQueuedUserMessageCancellation,
    rejectQueuedUserMessageCancellations,
  };
}
const DIALOG_MARKER_TTL_MS = 3e4;
export function useRemoteToolSession({ sessionStore, focusedSessionId, send: send2 }) {
  const [pendingRemoteToolBySession, setPendingRemoteToolBySession] = reactExports.useState(
    () => new Map(),
  );
  const [remoteToolRequestBySession, setRemoteToolRequestBySession] = reactExports.useState(
    () => new Map(),
  );
  const pendingRemoteToolBySessionRef = reactExports.useRef(pendingRemoteToolBySession);
  pendingRemoteToolBySessionRef.current = pendingRemoteToolBySession;
  const remoteToolRequestBySessionRef = reactExports.useRef(remoteToolRequestBySession);
  remoteToolRequestBySessionRef.current = remoteToolRequestBySession;
  const [lastSkillGuiEvent, setLastSkillGuiEvent] = reactExports.useState(null);
  const pendingDialogsByDialogIdRef = reactExports.useRef(new Map());
  const dialogIdTimersRef = reactExports.useRef(new Map());
  const pendingMarkersByDialogIdRef = reactExports.useRef(new Map());
  const markerTimersRef = reactExports.useRef(new Map());
  reactExports.useEffect(
    () => () => {
      for (const timer2 of dialogIdTimersRef.current.values()) clearTimeout(timer2);
      dialogIdTimersRef.current.clear();
      pendingDialogsByDialogIdRef.current.clear();
      for (const timer2 of markerTimersRef.current.values()) clearTimeout(timer2);
      markerTimersRef.current.clear();
      pendingMarkersByDialogIdRef.current.clear();
    },
    [],
  );
  const clearRemoteToolRequest = reactExports.useCallback(() => {
    const sid = sessionStore.getState().focusedSessionId;
    if (!sid) return;
    if (remoteToolRequestBySessionRef.current.has(sid)) {
      const next2 = new Map(remoteToolRequestBySessionRef.current);
      next2.delete(sid);
      remoteToolRequestBySessionRef.current = next2;
    }
    setRemoteToolRequestBySession((prev) => {
      if (!prev.has(sid)) return prev;
      const next2 = new Map(prev);
      next2.delete(sid);
      return next2;
    });
  }, [sessionStore]);
  const clearPendingRemoteToolRequest = reactExports.useCallback(() => {
    const sid = sessionStore.getState().focusedSessionId;
    if (!sid) return;
    if (pendingRemoteToolBySessionRef.current.has(sid)) {
      const next2 = new Map(pendingRemoteToolBySessionRef.current);
      next2.delete(sid);
      pendingRemoteToolBySessionRef.current = next2;
    }
    setPendingRemoteToolBySession((prev) => {
      if (!prev.has(sid)) return prev;
      const next2 = new Map(prev);
      next2.delete(sid);
      return next2;
    });
  }, [sessionStore]);
  const openPendingRemoteTool = reactExports.useCallback(() => {
    const sid = sessionStore.getState().focusedSessionId;
    if (!sid) {
      remoteToolLog.warn("open-pending no focused session");
      return;
    }
    const pending2 = pendingRemoteToolBySession.get(sid);
    if (pending2) {
      remoteToolRequestBySessionRef.current = new Map(remoteToolRequestBySessionRef.current).set(
        sid,
        pending2,
      );
      remoteToolLog.info("open-pending dialog", {
        ui_session_id: sid,
        tool_name: pending2.toolName,
        tool_url: pending2.toolUrl,
        has_initial_params: Boolean(pending2.initialParams),
      });
      setRemoteToolRequestBySession((prev) => {
        const next2 = new Map(prev);
        next2.set(sid, pending2);
        return next2;
      });
    } else {
      remoteToolLog.warn("open-pending miss", {
        ui_session_id: sid,
      });
    }
  }, [pendingRemoteToolBySession, sessionStore]);
  const sendSkillGuiEvent = reactExports.useCallback(
    (toolId, eventType, data2, sessionId) => {
      if (eventType === "generate:submit" && !guardAccountSubmission("remote_tool").allowed) {
        return false;
      }
      const fields = data2 ? Object.keys(data2) : [];
      remoteToolLog.info("gui-event send", {
        tool_id: toolId,
        event_type: eventType,
        session_id: sessionId ?? null,
        data_fields: fields,
        data_field_count: fields.length,
      });
      try {
        return send2({
          type: "skill_gui_event",
          tool_id: toolId,
          event_type: eventType,
          data: data2,
          session_id: sessionId,
        });
      } catch (err) {
        remoteToolLog.error("gui-event send failed", {
          tool_id: toolId,
          event_type: eventType,
          error: err instanceof Error ? err.message : String(err),
        });
        throw err;
      }
    },
    [send2],
  );
  const handleRemoteToolWsMessage = reactExports.useCallback(
    (msg) => {
      const convergeAndMount = (dialogId, targetSid, request) => {
        const dialogTimer = dialogIdTimersRef.current.get(dialogId);
        if (dialogTimer) {
          clearTimeout(dialogTimer);
          dialogIdTimersRef.current.delete(dialogId);
        }
        const markerTimer = markerTimersRef.current.get(dialogId);
        if (markerTimer) {
          clearTimeout(markerTimer);
          markerTimersRef.current.delete(dialogId);
        }
        pendingDialogsByDialogIdRef.current.delete(dialogId);
        pendingMarkersByDialogIdRef.current.delete(dialogId);
        remoteToolLog.info("hub_dialog_marker convergence", {
          tool_name: request.toolName,
          dialog_id: dialogId,
          session_id: targetSid,
        });
        pendingRemoteToolBySessionRef.current = new Map(pendingRemoteToolBySessionRef.current).set(
          targetSid,
          request,
        );
        setPendingRemoteToolBySession((prev) => {
          const next2 = new Map(prev);
          next2.set(targetSid, request);
          return next2;
        });
        const focusedSid = sessionStore.getState().focusedSessionId;
        if (targetSid === focusedSid && !request.restored) {
          remoteToolRequestBySessionRef.current = new Map(
            remoteToolRequestBySessionRef.current,
          ).set(targetSid, request);
          setRemoteToolRequestBySession((prev) => {
            if (prev.has(targetSid)) return prev;
            const next2 = new Map(prev);
            next2.set(targetSid, request);
            return next2;
          });
        }
      };
      if (msg.type === "open_remote_tool") {
        setLastSkillGuiEvent(null);
        const request = {
          toolName: msg.tool_name,
          toolUrl: msg.tool_url,
          manifestPath: msg.manifest_path,
          initialParams: msg.initial_params,
          restored: msg.restored,
        };
        const dialogId = msg.dialog_id;
        remoteToolLog.info("open_remote_tool received", {
          tool_name: msg.tool_name,
          dialog_id: dialogId,
          tool_url: msg.tool_url,
          has_initial_params: Boolean(msg.initial_params),
        });
        const earlyMarker = pendingMarkersByDialogIdRef.current.get(dialogId);
        if (earlyMarker) {
          convergeAndMount(dialogId, earlyMarker.sessionId, request);
          return true;
        }
        const existingTimer = dialogIdTimersRef.current.get(dialogId);
        if (existingTimer) clearTimeout(existingTimer);
        pendingDialogsByDialogIdRef.current.set(dialogId, request);
        const timer2 = setTimeout(() => {
          dialogIdTimersRef.current.delete(dialogId);
          pendingDialogsByDialogIdRef.current.delete(dialogId);
          remoteToolLog.warn("dialog marker timeout", {
            tool_name: msg.tool_name,
            dialog_id: dialogId,
          });
        }, DIALOG_MARKER_TTL_MS);
        dialogIdTimersRef.current.set(dialogId, timer2);
        return true;
      }
      if (msg.type === "task_notification" && msg.metadata?.hub_dialog_marker === true) {
        const dialogId = msg.metadata.dialog_id;
        const targetSid = msg.session_id;
        const toolName2 = msg.metadata.tool_name ?? "";
        if (!dialogId || !targetSid) {
          remoteToolLog.warn("hub_dialog_marker missing fields", {
            dialog_id: dialogId ?? null,
            session_id: targetSid ?? null,
          });
          return true;
        }
        const request = pendingDialogsByDialogIdRef.current.get(dialogId);
        if (request) {
          convergeAndMount(dialogId, targetSid, request);
          return true;
        }
        remoteToolLog.info("hub_dialog_marker arrived early, buffering", {
          dialog_id: dialogId,
          session_id: targetSid,
          tool_name: toolName2,
        });
        const existingTimer = markerTimersRef.current.get(dialogId);
        if (existingTimer) clearTimeout(existingTimer);
        pendingMarkersByDialogIdRef.current.set(dialogId, {
          sessionId: targetSid,
          toolName: toolName2,
        });
        const timer2 = setTimeout(() => {
          markerTimersRef.current.delete(dialogId);
          pendingMarkersByDialogIdRef.current.delete(dialogId);
          remoteToolLog.warn("marker dialog timeout", {
            dialog_id: dialogId,
            session_id: targetSid,
          });
        }, DIALOG_MARKER_TTL_MS);
        markerTimersRef.current.set(dialogId, timer2);
        return true;
      }
      if (msg.type === "close_remote_tool") {
        const targetSid = msg.session_id;
        const matchTool = msg.tool_name;
        remoteToolLog.info("close_remote_tool received", {
          target_session_id: targetSid,
          tool_name: matchTool ?? null,
        });
        const pendingExisting = pendingRemoteToolBySessionRef.current.get(targetSid);
        if (pendingExisting && (!matchTool || pendingExisting.toolName === matchTool)) {
          const next2 = new Map(pendingRemoteToolBySessionRef.current);
          next2.delete(targetSid);
          pendingRemoteToolBySessionRef.current = next2;
        }
        const activeExisting = remoteToolRequestBySessionRef.current.get(targetSid);
        if (activeExisting && (!matchTool || activeExisting.toolName === matchTool)) {
          const next2 = new Map(remoteToolRequestBySessionRef.current);
          next2.delete(targetSid);
          remoteToolRequestBySessionRef.current = next2;
        }
        setPendingRemoteToolBySession((prev) => {
          const existing = prev.get(targetSid);
          if (!existing) return prev;
          if (matchTool && existing.toolName !== matchTool) return prev;
          const next2 = new Map(prev);
          next2.delete(targetSid);
          return next2;
        });
        setRemoteToolRequestBySession((prev) => {
          const existing = prev.get(targetSid);
          if (!existing) return prev;
          if (matchTool && existing.toolName !== matchTool) return prev;
          const next2 = new Map(prev);
          next2.delete(targetSid);
          return next2;
        });
        return true;
      }
      if (msg.type === "skill_gui_event") {
        remoteToolLog.info("skill_gui_event received", {
          tool_id: msg.tool_id,
          event_type: msg.event_type,
          data_fields: msg.data ? Object.keys(msg.data) : [],
        });
        setLastSkillGuiEvent(msg);
        return true;
      }
      return false;
    },
    [sessionStore],
  );
  const pruneForLiveSessions = reactExports.useCallback((liveSessionIds) => {
    pruneSessionMap(setPendingRemoteToolBySession, liveSessionIds);
    pruneSessionMap(setRemoteToolRequestBySession, liveSessionIds);
  }, []);
  const hasPendingRemoteToolForSession = reactExports.useCallback(
    (sessionId) => {
      if (
        pendingRemoteToolBySessionRef.current.has(sessionId) ||
        remoteToolRequestBySessionRef.current.has(sessionId)
      ) {
        return true;
      }
      for (const marker of pendingMarkersByDialogIdRef.current.values()) {
        if (marker.sessionId === sessionId) return true;
      }
      return (
        sessionStore.getState().focusedSessionId === sessionId &&
        pendingDialogsByDialogIdRef.current.size > 0
      );
    },
    [sessionStore],
  );
  const pendingRemoteToolRequest = focusedSessionId
    ? (pendingRemoteToolBySession.get(focusedSessionId) ?? null)
    : null;
  const remoteToolRequest = focusedSessionId
    ? (remoteToolRequestBySession.get(focusedSessionId) ?? null)
    : null;
  const remoteToolDialogSessionId =
    focusedSessionId && remoteToolRequestBySession.has(focusedSessionId) ? focusedSessionId : null;
  return {
    pendingRemoteToolRequest,
    remoteToolRequest,
    remoteToolDialogSessionId,
    lastSkillGuiEvent,
    openPendingRemoteTool,
    clearPendingRemoteToolRequest,
    clearRemoteToolRequest,
    sendSkillGuiEvent,
    handleRemoteToolWsMessage,
    pruneForLiveSessions,
    hasPendingRemoteToolForSession,
  };
}
function pruneSessionMap(setter, liveSessionIds) {
  setter((prev) => {
    let next2 = null;
    for (const sid of prev.keys()) {
      if (liveSessionIds.has(sid)) continue;
      if (!next2) next2 = new Map(prev);
      next2.delete(sid);
    }
    return next2 ?? prev;
  });
}
