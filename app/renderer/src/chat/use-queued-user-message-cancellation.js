// use-queued-user-message-cancellation.js
import reactExports from "react";

const QUEUED_USER_MESSAGE_CANCEL_TIMEOUT_MS = 5e3;

export function useQueuedUserMessageCancellation({
  sessionStore,
  send,
}) {
  const pendingRef = reactExports.useRef(new Map());
  const settleMatching = reactExports.useCallback(
    (sessionId, ids, cancelled) => {
      const queueIds = new Set(ids.queueIds ?? []);
      const clientMessageIds = new Set(ids.clientMessageIds ?? []);
      for (const [key, pending] of pendingRef.current) {
        if (pending.sessionId !== sessionId) continue;
        if (!clientMessageIds.has(pending.clientMessageId)) continue;
        if (pending.queueId && !queueIds.has(pending.queueId)) continue;
        pendingRef.current.delete(key);
        clearTimeout(pending.timeout);
        pending.resolve(cancelled);
      }
    },
    [],
  );
  const settleQueuedUserMessageCancellation = reactExports.useCallback(
    (message) => {
      if (message.type === "queued_user_message") {
        settleMatching(
          message.session_id,
          {
            queueIds: [message.queue_id],
            clientMessageIds: [message.client_message_id],
          },
          false,
        );
      } else if (message.type === "queued_user_messages_delivered") {
        settleMatching(
          message.session_id,
          {
            queueIds: message.queue_ids,
            clientMessageIds: message.client_message_ids,
          },
          false,
        );
      } else if (message.type === "queued_user_messages_started") {
        settleMatching(
          message.session_id,
          {
            queueIds: message.messages.map((item) => item.queue_id),
            clientMessageIds: message.messages.map(
              (item) => item.client_message_id,
            ),
          },
          false,
        );
      } else if (message.type === "queued_user_messages_cancelled") {
        settleMatching(
          message.session_id,
          {
            queueIds: message.queue_ids,
            clientMessageIds: message.client_message_ids,
          },
          true,
        );
      }
    },
    [settleMatching],
  );
  const rejectQueuedUserMessageCancellations = reactExports.useCallback(() => {
    for (const pending of pendingRef.current.values()) {
      clearTimeout(pending.timeout);
      pending.resolve(false);
    }
    pendingRef.current.clear();
  }, []);
  const cancelQueuedUserMessage = reactExports.useCallback(
    (message) => {
      const sessionId = sessionStore.getState().focusedSessionId;
      if (!sessionId) return Promise.resolve(false);
      const pendingKey = `${sessionId}\0${message.clientMessageId}`;
      if (pendingRef.current.has(pendingKey)) return Promise.resolve(false);
      let resolveCancellation;
      const cancellation = new Promise((resolve) => {
        resolveCancellation = resolve;
      });
      const timeout = setTimeout(() => {
        const pending = pendingRef.current.get(pendingKey);
        if (!pending) return;
        pendingRef.current.delete(pendingKey);
        pending.resolve(false);
      }, QUEUED_USER_MESSAGE_CANCEL_TIMEOUT_MS);
      pendingRef.current.set(pendingKey, {
        sessionId,
        clientMessageId: message.clientMessageId,
        queueId: message.queueId,
        resolve: resolveCancellation,
        timeout,
      });
      if (
        !send({
          type: "cancel_queued_user_message",
          session_id: sessionId,
          queue_id: message.queueId,
          client_message_id: message.clientMessageId,
        })
      ) {
        const pending = pendingRef.current.get(pendingKey);
        if (pending) {
          pendingRef.current.delete(pendingKey);
          clearTimeout(pending.timeout);
          pending.resolve(false);
        }
      }
      return cancellation;
    },
    [send, sessionStore],
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
