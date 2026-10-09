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
            (m3.type === "question" ||
              m3.type === "interact" ||
              m3.type === "confirm") &&
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
