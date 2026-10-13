// use-session-focus-coordinator.js
import { reactExports } from "../vendor.js";

function fenceSessionActivation(message, latestIntent) {
  if (
    message.type !== "session_created" &&
    message.type !== "session_switched"
  )
    return message;
  if (message.activated === false || !latestIntent) return message;
  const matchesLatest = message.request_id
    ? message.request_id === latestIntent.requestId
    : message.session_id === latestIntent.sessionId;
  return matchesLatest
    ? message
    : {
        ...message,
        activated: false,
      };
}

export function useSessionFocusCoordinator(send) {
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
      return send(prepareSessionSwitch(sessionId, options));
    },
    [prepareSessionSwitch, send],
  );
  const requestSessionFocus = reactExports.useCallback(
    (sessionId) => {
      const requestId = beginIntent("session", sessionId);
      return send({
        type: "focus_session",
        session_id: sessionId,
        request_id: requestId,
      });
    },
    [beginIntent, send],
  );
  const fence = reactExports.useCallback(
    (message) => fenceSessionActivation(message, latestIntentRef.current),
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
