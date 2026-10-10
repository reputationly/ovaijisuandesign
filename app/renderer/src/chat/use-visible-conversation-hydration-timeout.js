// use-visible-conversation-hydration-timeout.js
import { reactExports } from "../vendor.js";
import { dedupedToast } from "../infra/agent-http-client.js";
import { DRAFT_NEW_TAB } from "../workspace/resolve-retry-message-payload.jsx";

export function useSessionSwitchTimeout(switching, onTimeout, timeoutMs = 1e4) {
  const onTimeoutRef = reactExports.useRef(onTimeout);
  onTimeoutRef.current = onTimeout;
  reactExports.useEffect(() => {
    if (!switching) return;
    const timer2 = setTimeout(() => onTimeoutRef.current(), timeoutMs);
    return () => clearTimeout(timer2);
  }, [switching, timeoutMs]);
}

export function useSessionSwitchErrorFeedback(switchError, setSwitchError) {
  reactExports.useEffect(() => {
    if (!switchError) return;
    const timer2 = setTimeout(() => setSwitchError(null), 5e3);
    return () => clearTimeout(timer2);
  }, [switchError, setSwitchError]);
  reactExports.useEffect(() => {
    if (!switchError) return;
    dedupedToast.error(switchError);
  }, [switchError]);
}

export function sessionSwitchTimeoutMessage(t2) {
  return t2(
    "chat.sessionSwitch.timeout",
    "Session switch timed out. Please try again.",
  );
}

const INITIAL_PAYLOAD_STALLED_TOAST_ID =
  "chat:initial-payload-hydration-stalled";

export function useInitialPayloadHydrationStalledFeedback(
  stalled,
  t2,
  onRetry,
) {
  const onRetryRef = reactExports.useRef(onRetry);
  onRetryRef.current = onRetry;
  reactExports.useEffect(() => {
    if (!stalled) {
      dedupedToast.dismiss(INITIAL_PAYLOAD_STALLED_TOAST_ID);
      return;
    }
    dedupedToast.error(
      t2(
        "chat.initialPayload.hydrationStalled",
        "Could not confirm the target conversation, so the first message was not sent. Retry to send it.",
      ),
      {
        id: INITIAL_PAYLOAD_STALLED_TOAST_ID,
        duration: Number.POSITIVE_INFINITY,
        action: {
          label: t2("common.retry", "Retry"),
          onClick: () => onRetryRef.current(),
        },
      },
    );
    return () => {
      dedupedToast.dismiss(INITIAL_PAYLOAD_STALLED_TOAST_ID);
    };
  }, [stalled, t2]);
}

export function sessionSwitchNotConnectedMessage(t2) {
  return t2(
    "chat.sessionSwitch.notConnected",
    "Not connected to the local runtime yet. Reconnecting — please try again shortly.",
  );
}

export function useVisibleConversationHydrationRequest(
  pendingRequestsRef,
  retainVisibleTranscriptUntilHydrationRef,
  prepareSessionSwitch,
  send2,
  setConversationLoading,
) {
  return reactExports.useCallback(
    (sessionId, options) => {
      const request = prepareSessionSwitch(sessionId, options);
      if (request.activate) {
        retainVisibleTranscriptUntilHydrationRef.current = false;
        pendingRequestsRef.current.set(request.request_id, sessionId);
        setConversationLoading(true);
      }
      if (send2(request)) return true;
      if (request.activate) {
        pendingRequestsRef.current.delete(request.request_id);
        setConversationLoading(false);
      }
      return false;
    },
    [
      pendingRequestsRef,
      prepareSessionSwitch,
      retainVisibleTranscriptUntilHydrationRef,
      send2,
      setConversationLoading,
    ],
  );
}

export function useVisibleConversationHydrationTimeout({
  active: active2,
  pendingRequestsRef,
  sessionStore,
  rejectSessionFocusIntent,
  setConversationLoading,
  setHistoryLoadFailed,
  setSwitchError,
  timeoutMessage,
}) {
  const failHydration = reactExports.useCallback(
    (requestId, errorMessage2 = timeoutMessage) => {
      const pendingRequests = [...pendingRequestsRef.current];
      if (pendingRequests.length === 0) return false;
      const latestRequestId = pendingRequests.at(-1)?.[0];
      if (requestId && requestId !== latestRequestId) {
        pendingRequestsRef.current.delete(requestId);
        return false;
      }
      const currentFocusedId = sessionStore.getState().focusedSessionId;
      const targetSessionId = pendingRequests.at(-1)?.[1] ?? currentFocusedId;
      const fallbackSessionId =
        currentFocusedId ?? targetSessionId ?? DRAFT_NEW_TAB;
      for (const [pendingRequestId] of pendingRequests) {
        rejectSessionFocusIntent(pendingRequestId, fallbackSessionId);
      }
      pendingRequestsRef.current.clear();
      setConversationLoading(false);
      if (targetSessionId) {
        sessionStore.focusSession(targetSessionId);
        sessionStore.setHistoryLoadFailed(targetSessionId, true);
        setHistoryLoadFailed(true);
      }
      setSwitchError(errorMessage2);
      return true;
    },
    [
      pendingRequestsRef,
      rejectSessionFocusIntent,
      sessionStore,
      setConversationLoading,
      setHistoryLoadFailed,
      setSwitchError,
      timeoutMessage,
    ],
  );
  useSessionSwitchTimeout(active2, failHydration);
  return failHydration;
}
