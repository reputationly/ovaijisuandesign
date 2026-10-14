// use-remote-tool-session.js
import reactExports from "react";
import { guardAccountSubmission } from "../infra/agent-http-client.js";
import { remoteToolLog } from "../vendor-inline/vscode-base/graph.jsx";

const DIALOG_MARKER_TTL_MS = 3e4;

function pruneSessionMap(setter, liveSessionIds) {
  setter((prev) => {
    let next = null;
    for (const sessionId of prev.keys()) {
      if (liveSessionIds.has(sessionId)) continue;
      if (!next) next = new Map(prev);
      next.delete(sessionId);
    }
    return next ?? prev;
  });
}

export function useRemoteToolSession({
  sessionStore,
  focusedSessionId,
  send,
}) {
  const [pendingRemoteToolBySession, setPendingRemoteToolBySession] =
    reactExports.useState(() => new Map());
  const [remoteToolRequestBySession, setRemoteToolRequestBySession] =
    reactExports.useState(() => new Map());
  const pendingRemoteToolBySessionRef = reactExports.useRef(
    pendingRemoteToolBySession,
  );
  pendingRemoteToolBySessionRef.current = pendingRemoteToolBySession;
  const remoteToolRequestBySessionRef = reactExports.useRef(
    remoteToolRequestBySession,
  );
  remoteToolRequestBySessionRef.current = remoteToolRequestBySession;
  const [lastSkillGuiEvent, setLastSkillGuiEvent] = reactExports.useState(null);
  const pendingDialogsByDialogIdRef = reactExports.useRef(new Map());
  const dialogIdTimersRef = reactExports.useRef(new Map());
  const pendingMarkersByDialogIdRef = reactExports.useRef(new Map());
  const markerTimersRef = reactExports.useRef(new Map());
  reactExports.useEffect(
    () => () => {
      for (const timer of dialogIdTimersRef.current.values())
        clearTimeout(timer);
      dialogIdTimersRef.current.clear();
      pendingDialogsByDialogIdRef.current.clear();
      for (const timer of markerTimersRef.current.values())
        clearTimeout(timer);
      markerTimersRef.current.clear();
      pendingMarkersByDialogIdRef.current.clear();
    },
    [],
  );
  const clearRemoteToolRequest = reactExports.useCallback(() => {
    const sessionId = sessionStore.getState().focusedSessionId;
    if (!sessionId) return;
    if (remoteToolRequestBySessionRef.current.has(sessionId)) {
      const next = new Map(remoteToolRequestBySessionRef.current);
      next.delete(sessionId);
      remoteToolRequestBySessionRef.current = next;
    }
    setRemoteToolRequestBySession((prev) => {
      if (!prev.has(sessionId)) return prev;
      const next = new Map(prev);
      next.delete(sessionId);
      return next;
    });
  }, [sessionStore]);
  const clearPendingRemoteToolRequest = reactExports.useCallback(() => {
    const sessionId = sessionStore.getState().focusedSessionId;
    if (!sessionId) return;
    if (pendingRemoteToolBySessionRef.current.has(sessionId)) {
      const next = new Map(pendingRemoteToolBySessionRef.current);
      next.delete(sessionId);
      pendingRemoteToolBySessionRef.current = next;
    }
    setPendingRemoteToolBySession((prev) => {
      if (!prev.has(sessionId)) return prev;
      const next = new Map(prev);
      next.delete(sessionId);
      return next;
    });
  }, [sessionStore]);
  const openPendingRemoteTool = reactExports.useCallback(() => {
    const sessionId = sessionStore.getState().focusedSessionId;
    if (!sessionId) {
      remoteToolLog.warn("open-pending no focused session");
      return;
    }
    const pending = pendingRemoteToolBySession.get(sessionId);
    if (pending) {
      remoteToolRequestBySessionRef.current = new Map(
        remoteToolRequestBySessionRef.current,
      ).set(sessionId, pending);
      remoteToolLog.info("open-pending dialog", {
        ui_session_id: sessionId,
        tool_name: pending.toolName,
        tool_url: pending.toolUrl,
        has_initial_params: Boolean(pending.initialParams),
      });
      setRemoteToolRequestBySession((prev) => {
        const next = new Map(prev);
        next.set(sessionId, pending);
        return next;
      });
    } else {
      remoteToolLog.warn("open-pending miss", {
        ui_session_id: sessionId,
      });
    }
  }, [pendingRemoteToolBySession, sessionStore]);
  const sendSkillGuiEvent = reactExports.useCallback(
    (toolId, eventType, data, sessionId) => {
      if (
        eventType === "generate:submit" &&
        !guardAccountSubmission("remote_tool").allowed
      ) {
        return false;
      }
      const fields = data ? Object.keys(data) : [];
      remoteToolLog.info("gui-event send", {
        tool_id: toolId,
        event_type: eventType,
        session_id: sessionId ?? null,
        data_fields: fields,
        data_field_count: fields.length,
      });
      try {
        return send({
          type: "skill_gui_event",
          tool_id: toolId,
          event_type: eventType,
          data,
          session_id: sessionId,
        });
      } catch (error) {
        remoteToolLog.error("gui-event send failed", {
          tool_id: toolId,
          event_type: eventType,
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    },
    [send],
  );
  const handleRemoteToolWsMessage = reactExports.useCallback(
    (message) => {
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
        pendingRemoteToolBySessionRef.current = new Map(
          pendingRemoteToolBySessionRef.current,
        ).set(targetSid, request);
        setPendingRemoteToolBySession((prev) => {
          const next = new Map(prev);
          next.set(targetSid, request);
          return next;
        });
        const focusedSid = sessionStore.getState().focusedSessionId;
        if (targetSid === focusedSid && !request.restored) {
          remoteToolRequestBySessionRef.current = new Map(
            remoteToolRequestBySessionRef.current,
          ).set(targetSid, request);
          setRemoteToolRequestBySession((prev) => {
            if (prev.has(targetSid)) return prev;
            const next = new Map(prev);
            next.set(targetSid, request);
            return next;
          });
        }
      };
      if (message.type === "open_remote_tool") {
        setLastSkillGuiEvent(null);
        const request = {
          toolName: message.tool_name,
          toolUrl: message.tool_url,
          manifestPath: message.manifest_path,
          initialParams: message.initial_params,
          restored: message.restored,
        };
        const dialogId = message.dialog_id;
        remoteToolLog.info("open_remote_tool received", {
          tool_name: message.tool_name,
          dialog_id: dialogId,
          tool_url: message.tool_url,
          has_initial_params: Boolean(message.initial_params),
        });
        const earlyMarker = pendingMarkersByDialogIdRef.current.get(dialogId);
        if (earlyMarker) {
          convergeAndMount(dialogId, earlyMarker.sessionId, request);
          return true;
        }
        const existingTimer = dialogIdTimersRef.current.get(dialogId);
        if (existingTimer) clearTimeout(existingTimer);
        pendingDialogsByDialogIdRef.current.set(dialogId, request);
        const timer = setTimeout(() => {
          dialogIdTimersRef.current.delete(dialogId);
          pendingDialogsByDialogIdRef.current.delete(dialogId);
          remoteToolLog.warn("dialog marker timeout", {
            tool_name: message.tool_name,
            dialog_id: dialogId,
          });
        }, DIALOG_MARKER_TTL_MS);
        dialogIdTimersRef.current.set(dialogId, timer);
        return true;
      }
      if (
        message.type === "task_notification" &&
        message.metadata?.hub_dialog_marker === true
      ) {
        const dialogId = message.metadata.dialog_id;
        const targetSid = message.session_id;
        const toolName = message.metadata.tool_name ?? "";
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
          tool_name: toolName,
        });
        const existingTimer = markerTimersRef.current.get(dialogId);
        if (existingTimer) clearTimeout(existingTimer);
        pendingMarkersByDialogIdRef.current.set(dialogId, {
          sessionId: targetSid,
          toolName,
        });
        const timer = setTimeout(() => {
          markerTimersRef.current.delete(dialogId);
          pendingMarkersByDialogIdRef.current.delete(dialogId);
          remoteToolLog.warn("marker dialog timeout", {
            dialog_id: dialogId,
            session_id: targetSid,
          });
        }, DIALOG_MARKER_TTL_MS);
        markerTimersRef.current.set(dialogId, timer);
        return true;
      }
      if (message.type === "close_remote_tool") {
        const targetSid = message.session_id;
        const matchTool = message.tool_name;
        remoteToolLog.info("close_remote_tool received", {
          target_session_id: targetSid,
          tool_name: matchTool ?? null,
        });
        const pendingExisting =
          pendingRemoteToolBySessionRef.current.get(targetSid);
        if (
          pendingExisting &&
          (!matchTool || pendingExisting.toolName === matchTool)
        ) {
          const next = new Map(pendingRemoteToolBySessionRef.current);
          next.delete(targetSid);
          pendingRemoteToolBySessionRef.current = next;
        }
        const activeExisting =
          remoteToolRequestBySessionRef.current.get(targetSid);
        if (
          activeExisting &&
          (!matchTool || activeExisting.toolName === matchTool)
        ) {
          const next = new Map(remoteToolRequestBySessionRef.current);
          next.delete(targetSid);
          remoteToolRequestBySessionRef.current = next;
        }
        setPendingRemoteToolBySession((prev) => {
          const existing = prev.get(targetSid);
          if (!existing) return prev;
          if (matchTool && existing.toolName !== matchTool) return prev;
          const next = new Map(prev);
          next.delete(targetSid);
          return next;
        });
        setRemoteToolRequestBySession((prev) => {
          const existing = prev.get(targetSid);
          if (!existing) return prev;
          if (matchTool && existing.toolName !== matchTool) return prev;
          const next = new Map(prev);
          next.delete(targetSid);
          return next;
        });
        return true;
      }
      if (message.type === "skill_gui_event") {
        remoteToolLog.info("skill_gui_event received", {
          tool_id: message.tool_id,
          event_type: message.event_type,
          data_fields: message.data ? Object.keys(message.data) : [],
        });
        setLastSkillGuiEvent(message);
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
    focusedSessionId && remoteToolRequestBySession.has(focusedSessionId)
      ? focusedSessionId
      : null;
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
