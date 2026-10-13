// use-chat-cancel.js
import { reactExports } from "../vendor.js";
import { recordAction } from "../infra/gateway-http-error.jsx";
import { nextMessageId } from "./create-history-sub-agent-message.js";

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
    const sessionId = sessionStore.getState().focusedSessionId;
    if (!sessionId) return;
    const previousBusy = previousBusyBySessionRef.current.get(sessionId);
    if (busy && previousBusy === false) {
      cancelInFlightSessionIdsRef.current.delete(sessionId);
    }
    previousBusyBySessionRef.current.set(sessionId, busy);
  }, [busy, cancelInFlightSessionIdsRef, sessionStore]);
  const performCancel = reactExports.useCallback(
    (source) => {
      const sessionId = sessionStore.getState().focusedSessionId;
      if (!sessionId) return;
      if (!busy && pendingReasons.length === 0) return;
      if (cancelInFlightSessionIdsRef.current.has(sessionId)) return;
      cancelInFlightSessionIdsRef.current.add(sessionId);
      recordAction("chat:cancel", {
        source,
        sessionId,
        busy,
        pendingReasons: pendingReasons.map((pendingReason) => `${pendingReason.kind}:${pendingReason.id}`),
      });
      const sent = send2({
        type: "cancel",
        session_id: sessionId,
        source,
        reason: busy ? "agent_running" : "pending_reasons",
      });
      if (!sent) {
        cancelInFlightSessionIdsRef.current.delete(sessionId);
        return;
      }
      clearMessageDeliveryTimersForSession(sessionId);
      sessionStore.finalizePendingTasks(sessionId);
      sessionStore.resolvePendingToolConfirms(sessionId);
      sessionStore.updateMessages(
        sessionId,
        (prev) =>
          prev.map((message) =>
            (message.type === "question" ||
              message.type === "interact" ||
              message.type === "confirm") &&
            !message.resolved
              ? {
                  ...message,
                  resolved: true,
                }
              : message,
          ),
        {
          affectsUserAttention: true,
        },
      );
      controller.markSessionCancelled(sessionId);
      if (busy || pendingReasons.length > 0) {
        sessionStore.pushMessage(
          {
            id: nextMessageId(),
            role: "agent",
            type: "cancelled",
            content: "",
          },
          sessionId,
        );
      }
      sessionStore.setBusy(false, sessionId);
      sessionStore.setPendingReasons([], sessionId);
      controller.resetSession(sessionId);
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
