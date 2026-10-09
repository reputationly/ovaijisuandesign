// use-session-focus-coordinator.js
import { reactExports } from "../vendor.js";

function fenceSessionActivation(message2, latestIntent) {
  if (
    message2.type !== "session_created" &&
    message2.type !== "session_switched"
  )
    return message2;
  if (message2.activated === false || !latestIntent) return message2;
  const matchesLatest = message2.request_id
    ? message2.request_id === latestIntent.requestId
    : message2.session_id === latestIntent.sessionId;
  return matchesLatest
    ? message2
    : {
        ...message2,
        activated: false,
      };
}

export function useSessionFocusCoordinator(send2) {
  const latestIntentRef = reactExports.useRef(null);
  const beginIntent = reactExports.useCallback((kind, sessionId) => {
    const requestId = crypto.randomUUID();
    latestIntentRef.current = {
      requestId,
      sessionId,
      kind,
    };
    return requestId;
  }, []);
  const supersede = reactExports.useCallback(
    (sessionId) => {
      beginIntent("empty", sessionId);
    },
    [beginIntent],
  );
  const reject = reactExports.useCallback(
    (requestId, fallbackSessionId) => {
      if (latestIntentRef.current?.requestId !== requestId) return;
      beginIntent("empty", fallbackSessionId);
    },
    [beginIntent],
  );
  const beginCreate = reactExports.useCallback(
    (sessionId) => beginIntent("create", sessionId),
    [beginIntent],
  );
  const beginFork = reactExports.useCallback(
    (sessionId) => beginIntent("fork", sessionId),
    [beginIntent],
  );
  const prepareSessionSwitch = reactExports.useCallback(
    (sessionId, options) => {
      const activate = options?.activate !== false;
      const requestId = activate
        ? beginIntent("session", sessionId)
        : crypto.randomUUID();
      return {
        type: "switch_session",
        session_id: sessionId,
        request_id: requestId,
        activate,
        ...(options?.origin
          ? {
              origin: options.origin,
            }
          : {}),
      };
    },
    [beginIntent],
  );
  const requestSessionSwitch = reactExports.useCallback(
    (sessionId, options) => {
      return send2(prepareSessionSwitch(sessionId, options));
    },
    [prepareSessionSwitch, send2],
  );
  const requestSessionFocus = reactExports.useCallback(
    (sessionId) => {
      const requestId = beginIntent("session", sessionId);
      return send2({
        type: "focus_session",
        session_id: sessionId,
        request_id: requestId,
      });
    },
    [beginIntent, send2],
  );
  const fence = reactExports.useCallback(
    (message2) => fenceSessionActivation(message2, latestIntentRef.current),
    [],
  );
  return {
    beginCreate,
    beginFork,
    fence,
    prepareSessionSwitch,
    requestSessionFocus,
    requestSessionSwitch,
    reject,
    supersede,
  };
}
