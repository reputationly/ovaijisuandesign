// use-session-stall.js
import { reactExports } from "../vendor.js";
import { recordAction } from "../infra/gateway-http-error.jsx";
import { TRACK_EVENTS } from "../infra/track-events.js";
import { trackEvent } from "../infra/sanitize-track-props.js";

function stallDurationBucket(ms) {
  if (ms === void 0 || !Number.isFinite(ms) || ms < 0) return "unknown";
  const minutes = ms / 6e4;
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
  const removeEntry = reactExports.useCallback((sid) => {
    setStalledSessions((prev) => {
      if (!(sid in prev)) return prev;
      const next2 = {
        ...prev,
      };
      delete next2[sid];
      return next2;
    });
  }, []);
  const handleSessionStalledMessage = reactExports.useCallback(
    (msg) => {
      const sid = msg.session_id;
      if (msg.stalled) {
        setStalledSessions((prev) => ({
          ...prev,
          [sid]: {
            silentMs: msg.silent_ms,
            elapsedMs: msg.elapsed_ms,
            watchdog: msg.watchdog,
          },
        }));
      } else {
        removeEntry(sid);
      }
      recordAction("chat:session-stalled", {
        sessionId: sid,
        stalled: msg.stalled,
        silentMs: msg.silent_ms,
        elapsedMs: msg.elapsed_ms,
        watchdog: msg.watchdog,
      });
      trackEvent(TRACK_EVENTS.CHAT_SESSION_STALLED, {
        session_id: sid,
        stalled: msg.stalled,
        watchdog: msg.watchdog ?? "unknown",
        silent_ms_bucket: stallDurationBucket(msg.silent_ms),
        elapsed_ms_bucket: stallDurationBucket(msg.elapsed_ms),
      });
    },
    [removeEntry],
  );
  const recordStallAction = reactExports.useCallback(
    (sid, action) => {
      const info2 = stalledSessions[sid];
      trackEvent(TRACK_EVENTS.CHAT_SESSION_STALL_ACTION, {
        session_id: sid,
        action,
        watchdog: info2?.watchdog ?? "unknown",
        silent_ms_bucket: stallDurationBucket(info2?.silentMs),
        elapsed_ms_bucket: stallDurationBucket(info2?.elapsedMs),
      });
    },
    [stalledSessions],
  );
  const dismissStalledForSession = reactExports.useCallback(
    (sid) => {
      recordAction("chat:session-stalled-dismissed", {
        sessionId: sid,
      });
      recordStallAction(sid, "keep_waiting");
      removeEntry(sid);
    },
    [recordStallAction, removeEntry],
  );
  const pruneStalledSessions = reactExports.useCallback((liveSessions) => {
    setStalledSessions((prev) => {
      let next2 = null;
      for (const sid of Object.keys(prev)) {
        if (liveSessions.has(sid)) continue;
        next2 ??= {
          ...prev,
        };
        delete next2[sid];
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
