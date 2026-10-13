// use-session-stall.js
import { reactExports } from "../vendor.js";
import { recordAction } from "../infra/gateway-http-error.jsx";
import { TRACK_EVENTS } from "../infra/track-events.js";
import { trackEvent } from "../infra/sanitize-track-props.js";

function stallDurationBucket(durationMs) {
  if (durationMs === void 0 || !Number.isFinite(durationMs) || durationMs < 0) return "unknown";
  const minutes = durationMs / 6e4;
  if (minutes < 5) return "<5m";
  if (minutes < 15) return "5-15m";
  if (minutes < 30) return "15-30m";
  if (minutes < 60) return "30-60m";
  if (minutes < 120) return "1-2h";
  if (minutes < 300) return "2-5h";
  return ">=5h";
}

export function useSessionStall() {
  const [stalledSessions, setStalledSessions] = reactExports.useState({});
  const removeEntry = reactExports.useCallback((sessionId) => {
    setStalledSessions((prev) => {
      if (!(sessionId in prev)) return prev;
      const next2 = {
        ...prev,
      };
      delete next2[sessionId];
      return next2;
    });
  }, []);
  const handleSessionStalledMessage = reactExports.useCallback(
    (message) => {
      const sessionId = message.session_id;
      if (message.stalled) {
        setStalledSessions((prev) => ({
          ...prev,
          [sessionId]: {
            silentMs: message.silent_ms,
            elapsedMs: message.elapsed_ms,
            watchdog: message.watchdog,
          },
        }));
      } else {
        removeEntry(sessionId);
      }
      recordAction("chat:session-stalled", {
        sessionId,
        stalled: message.stalled,
        silentMs: message.silent_ms,
        elapsedMs: message.elapsed_ms,
        watchdog: message.watchdog,
      });
      trackEvent(TRACK_EVENTS.CHAT_SESSION_STALLED, {
        session_id: sessionId,
        stalled: message.stalled,
        watchdog: message.watchdog ?? "unknown",
        silent_ms_bucket: stallDurationBucket(message.silent_ms),
        elapsed_ms_bucket: stallDurationBucket(message.elapsed_ms),
      });
    },
    [removeEntry],
  );
  const recordStallAction = reactExports.useCallback(
    (sessionId, action) => {
      const info2 = stalledSessions[sessionId];
      trackEvent(TRACK_EVENTS.CHAT_SESSION_STALL_ACTION, {
        session_id: sessionId,
        action,
        watchdog: info2?.watchdog ?? "unknown",
        silent_ms_bucket: stallDurationBucket(info2?.silentMs),
        elapsed_ms_bucket: stallDurationBucket(info2?.elapsedMs),
      });
    },
    [stalledSessions],
  );
  const dismissStalledForSession = reactExports.useCallback(
    (sessionId) => {
      recordAction("chat:session-stalled-dismissed", {
        sessionId,
      });
      recordStallAction(sessionId, "keep_waiting");
      removeEntry(sessionId);
    },
    [recordStallAction, removeEntry],
  );
  const pruneStalledSessions = reactExports.useCallback((liveSessions) => {
    setStalledSessions((prev) => {
      let next2 = null;
      for (const sessionId of Object.keys(prev)) {
        if (liveSessions.has(sessionId)) continue;
        next2 ??= {
          ...prev,
        };
        delete next2[sessionId];
      }
      return next2 ?? prev;
    });
  }, []);
  return {
    stalledSessions,
    handleSessionStalledMessage,
    clearStalledForSession: removeEntry,
    dismissStalledForSession,
    recordStallAction,
    pruneStalledSessions,
  };
}
