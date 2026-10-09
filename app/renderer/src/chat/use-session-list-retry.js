// use-session-list-retry.js
import { reactExports } from "../vendor.js";
import { chatLog } from "../vendor-inline/vscode-base/graph.jsx";

const SESSION_LIST_RETRY_AFTER_FALLBACK_MS = 1e3;

const SESSION_LIST_RETRY_MAX_DELAY_MS = 3e4;

const SESSION_LIST_STALL_LOG_THRESHOLD = 5;

function computeSessionListRetryDelayMs(streak, baseDelayMs) {
  const base2 = Math.max(
    baseDelayMs || SESSION_LIST_RETRY_AFTER_FALLBACK_MS,
    SESSION_LIST_RETRY_AFTER_FALLBACK_MS,
  );
  return Math.min(
    base2 * 2 ** Math.max(0, streak - 1),
    SESSION_LIST_RETRY_MAX_DELAY_MS,
  );
}

export function useSessionListRetry({
  connected,
  connectedRef,
  requestSessionList,
  setSessionsLoading,
  workspaceKey,
}) {
  const timerRef = reactExports.useRef(null);
  const streakRef = reactExports.useRef(0);
  const stallLoggedRef = reactExports.useRef(false);
  const snapshotReadyRef = reactExports.useRef(false);
  const stalledRef = reactExports.useRef(false);
  const [revision, setRevision] = reactExports.useState(0);
  const [status, setStatus] = reactExports.useState(null);
  const workspaceRef = reactExports.useRef(workspaceKey);
  workspaceRef.current = workspaceKey;
  const requestSessionListRef = reactExports.useRef(requestSessionList);
  requestSessionListRef.current = requestSessionList;
  const clearSessionListRetryTimer = reactExports.useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);
  reactExports.useEffect(
    () => clearSessionListRetryTimer,
    [clearSessionListRetryTimer],
  );
  reactExports.useEffect(() => {
    snapshotReadyRef.current = false;
    stalledRef.current = false;
    streakRef.current = 0;
    stallLoggedRef.current = false;
    setStatus(null);
    setSessionsLoading(true);
  }, [setSessionsLoading, workspaceKey]);
  reactExports.useEffect(() => {
    if (connected)
      setSessionsLoading(!snapshotReadyRef.current && !stalledRef.current);
  }, [connected, setSessionsLoading]);
  const requestWithLoadingPolicy = reactExports.useCallback(
    (reason) => {
      if (!snapshotReadyRef.current && !stalledRef.current)
        setSessionsLoading(true);
      requestSessionListRef.current(reason);
    },
    [setSessionsLoading],
  );
  const scheduleSessionListRetry = reactExports.useCallback(
    (delayMs) => {
      clearSessionListRetryTimer();
      timerRef.current = setTimeout(
        () => {
          timerRef.current = null;
          if (!connectedRef.current) return;
          requestWithLoadingPolicy("initial");
        },
        Math.max(delayMs, SESSION_LIST_RETRY_AFTER_FALLBACK_MS),
      );
    },
    [clearSessionListRetryTimer, connectedRef, requestWithLoadingPolicy],
  );
  const handleSessionListUnavailable = reactExports.useCallback(
    (reason, retryAfterMs) => {
      const streak = streakRef.current + 1;
      streakRef.current = streak;
      const nextRetryInMs = computeSessionListRetryDelayMs(
        streak,
        retryAfterMs,
      );
      stalledRef.current = streak >= SESSION_LIST_STALL_LOG_THRESHOLD;
      setSessionsLoading(!snapshotReadyRef.current && !stalledRef.current);
      setStatus({
        reason,
        consecutiveFailures: streak,
        nextRetryInMs,
        stalled: streak >= SESSION_LIST_STALL_LOG_THRESHOLD,
      });
      if (
        streak >= SESSION_LIST_STALL_LOG_THRESHOLD &&
        !stallLoggedRef.current
      ) {
        stallLoggedRef.current = true;
        chatLog.warn(
          "session list unavailable; runtime is not answering project requests",
          {
            workspace: workspaceRef.current,
            reason,
            consecutiveFailures: streak,
            nextRetryInMs,
          },
        );
      }
      scheduleSessionListRetry(nextRetryInMs);
      return {
        reason,
        consecutiveFailures: streak,
        nextRetryInMs,
        stalled: streak >= SESSION_LIST_STALL_LOG_THRESHOLD,
      };
    },
    [scheduleSessionListRetry, setSessionsLoading],
  );
  const handleSessionListRecovered = reactExports.useCallback(() => {
    clearSessionListRetryTimer();
    snapshotReadyRef.current = true;
    stalledRef.current = false;
    setSessionsLoading(false);
    setRevision((value) => value + 1);
    if (stallLoggedRef.current) {
      chatLog.info("session list recovered after runtime stall", {
        workspace: workspaceRef.current,
        consecutiveFailures: streakRef.current,
      });
    }
    streakRef.current = 0;
    stallLoggedRef.current = false;
    setStatus(null);
  }, [clearSessionListRetryTimer, setSessionsLoading]);
  const retryNow = reactExports.useCallback(() => {
    clearSessionListRetryTimer();
    if (!connectedRef.current) return;
    requestWithLoadingPolicy("initial");
  }, [clearSessionListRetryTimer, connectedRef, requestWithLoadingPolicy]);
  return {
    revision,
    status,
    requestSessionList: requestWithLoadingPolicy,
    clearSessionListRetryTimer,
    scheduleSessionListRetry,
    handleSessionListUnavailable,
    handleSessionListRecovered,
    retryNow,
  };
}
