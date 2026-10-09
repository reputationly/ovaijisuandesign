// use-queued-user-message-cancellation.js
import { reactExports } from "../vendor.js";

const QUEUED_USER_MESSAGE_CANCEL_TIMEOUT_MS = 5e3;

export function useQueuedUserMessageCancellation({
  sessionStore,
  send: send2,
}) {
  const pendingRef = reactExports.useRef(new Map());
  const settleMatching = reactExports.useCallback(
    (sessionId, ids2, cancelled) => {
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
    },
    [],
  );
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
            clientMessageIds: message2.messages.map(
              (item) => item.client_message_id,
            ),
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
