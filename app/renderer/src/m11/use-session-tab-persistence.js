// use-session-tab-persistence.js
import {
  reactExports,
  dedupedToast,
  TRACK_EVENTS,
  recordAction,
  getElectronPlatform,
  SessionTabsPersister,
} from "../vendor.js";
import { trackEvent } from "../asset-center/shared/init-track.js";
import { DRAFT_NEW_TAB } from "./use-workspace-canvas-persistence.jsx";
function fenceSessionActivation(message2, latestIntent) {
  if (message2.type !== "session_created" && message2.type !== "session_switched") return message2;
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
      const requestId = activate ? beginIntent("session", sessionId) : crypto.randomUUID();
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
  return t2("chat.sessionSwitch.timeout", "Session switch timed out. Please try again.");
}
export function useInitialPayloadHydrationStalledFeedback(stalled, t2, onRetry) {
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
const INITIAL_PAYLOAD_STALLED_TOAST_ID = "chat:initial-payload-hydration-stalled";
export function sessionSwitchNotConnectedMessage(t2) {
  return t2(
    "chat.sessionSwitch.notConnected",
    "Not connected to the local runtime yet. Reconnecting — please try again shortly.",
  );
}
function createWorkspaceSessionTabsSnapshot(state2, excludedSessionIds = new Set()) {
  const openedTabIds = state2.openedTabOrder
    .filter((id2) => {
      const session = state2.sessions.get(id2);
      return (
        session !== void 0 &&
        !excludedSessionIds.has(id2) &&
        !(session.runtimeSessionId ? excludedSessionIds.has(session.runtimeSessionId) : false)
      );
    })
    .map((id2) => {
      const session = state2.sessions.get(id2);
      return session?.runtimeSessionId ?? id2;
    });
  const rawFocused = state2.focusedSessionId;
  const focusedSession = rawFocused ? state2.sessions.get(rawFocused) : void 0;
  const persistedFocusedId = focusedSession
    ? (focusedSession.runtimeSessionId ?? rawFocused)
    : null;
  const focusedSessionId =
    rawFocused &&
    !excludedSessionIds.has(rawFocused) &&
    !(focusedSession?.runtimeSessionId
      ? excludedSessionIds.has(focusedSession.runtimeSessionId)
      : false) &&
    persistedFocusedId &&
    openedTabIds.includes(persistedFocusedId)
      ? persistedFocusedId
      : null;
  return {
    openedTabIds,
    focusedSessionId,
  };
}
function workspaceSessionTabsSignature(snapshot2) {
  return JSON.stringify([snapshot2.focusedSessionId, snapshot2.openedTabIds]);
}
function resolveRestoreDecision(saved, sessions) {
  if (!saved)
    return {
      kind: "no-saved-state",
    };
  const availableIds = new Set(sessions.map((s2) => s2.id));
  const openedTabIds = saved.openedTabIds.filter((id2) => availableIds.has(id2));
  if (openedTabIds.length === 0) {
    return saved.openedTabIds.length > 0
      ? {
          kind: "all-stale",
        }
      : {
          kind: "empty-by-user",
        };
  }
  const focusedSessionId =
    saved.focusedSessionId && availableIds.has(saved.focusedSessionId)
      ? saved.focusedSessionId
      : (openedTabIds.at(-1) ?? null);
  return {
    kind: "restore",
    openedTabIds,
    focusedSessionId,
  };
}
function getPlatformStorage() {
  try {
    return getElectronPlatform()?.storage;
  } catch {
    return void 0;
  }
}
export function useSessionTabPersistence(
  sessionStore,
  requestSessionSwitch,
  currentWorkspace,
  connected,
  getExcludedSessionIds,
  getPreservedFocusedSessionId,
  onConfirmedEmptyConversation,
  onRestoreSettled,
) {
  const persister = reactExports.useMemo(() => new SessionTabsPersister(getPlatformStorage), []);
  const readyRef = reactExports.useRef(false);
  const lastSignatureRef = reactExports.useRef(null);
  const lastPresentableFocusedIdRef = reactExports.useRef(null);
  const workspaceRef = reactExports.useRef(currentWorkspace);
  reactExports.useEffect(() => {
    workspaceRef.current = currentWorkspace;
    readyRef.current = false;
    lastSignatureRef.current = null;
    lastPresentableFocusedIdRef.current = null;
  }, [currentWorkspace]);
  reactExports.useEffect(() => {
    if (!connected) {
      readyRef.current = false;
    }
  }, [connected]);
  const persistIfReady = reactExports.useCallback(() => {
    const workspaceKey = workspaceRef.current;
    if (!readyRef.current || !workspaceKey) return;
    const state2 = sessionStore.getState();
    const excludedSessionIds = getExcludedSessionIds?.() ?? new Set();
    let snapshot2 = createWorkspaceSessionTabsSnapshot(state2, excludedSessionIds);
    const rawFocusedId = state2.focusedSessionId;
    const focusedSession = rawFocusedId ? state2.sessions.get(rawFocusedId) : void 0;
    const focusedIsExcluded = Boolean(
      rawFocusedId &&
      (excludedSessionIds.has(rawFocusedId) ||
        (focusedSession?.runtimeSessionId
          ? excludedSessionIds.has(focusedSession.runtimeSessionId)
          : false)),
    );
    const preservedRawFocusedId = getPreservedFocusedSessionId?.();
    const scopedConversationActive = preservedRawFocusedId !== void 0;
    if (scopedConversationActive) {
      const preservedSession = preservedRawFocusedId
        ? state2.sessions.get(preservedRawFocusedId)
        : void 0;
      const preservedFocusedId = preservedRawFocusedId
        ? (preservedSession?.runtimeSessionId ?? preservedRawFocusedId)
        : null;
      snapshot2 = {
        ...snapshot2,
        focusedSessionId:
          preservedFocusedId && snapshot2.openedTabIds.includes(preservedFocusedId)
            ? preservedFocusedId
            : null,
      };
      lastPresentableFocusedIdRef.current = snapshot2.focusedSessionId;
    } else if (focusedIsExcluded) {
      const previousFocusedId = lastPresentableFocusedIdRef.current;
      if (previousFocusedId && snapshot2.openedTabIds.includes(previousFocusedId)) {
        snapshot2 = {
          ...snapshot2,
          focusedSessionId: previousFocusedId,
        };
      }
    } else {
      lastPresentableFocusedIdRef.current = snapshot2.focusedSessionId;
    }
    const signature = workspaceSessionTabsSignature(snapshot2);
    if (signature === lastSignatureRef.current) return;
    lastSignatureRef.current = signature;
    void persister.persist(workspaceKey, snapshot2);
  }, [getExcludedSessionIds, getPreservedFocusedSessionId, persister, sessionStore]);
  const enablePersistence = reactExports.useCallback(() => {
    readyRef.current = true;
    persistIfReady();
  }, [persistIfReady]);
  reactExports.useEffect(() => {
    return sessionStore.subscribe(() => {
      persistIfReady();
    });
  }, [sessionStore, persistIfReady]);
  const openDefaultSession = reactExports.useCallback(
    (sessions) => {
      const active2 = sessions.find((s2) => s2.active) ?? sessions[0];
      if (active2) {
        sessionStore.openTab(active2.id);
        requestSessionSwitch(active2.id);
      } else {
        onConfirmedEmptyConversation?.(workspaceRef.current);
      }
    },
    [onConfirmedEmptyConversation, requestSessionSwitch, sessionStore],
  );
  const restoreAndOpen = reactExports.useCallback(
    async (workspaceKey, sessions) => {
      const saved = await persister.load(workspaceKey);
      const decision = resolveRestoreDecision(saved, sessions);
      switch (decision.kind) {
        case "no-saved-state":
        case "all-stale":
          return false;
        // caller should fall back to default
        case "empty-by-user":
          onConfirmedEmptyConversation?.(workspaceKey);
          return true;
        // user chose zero tabs — respect it
        case "restore": {
          const { openedTabIds, focusedSessionId } = decision;
          lastPresentableFocusedIdRef.current = focusedSessionId ?? openedTabIds[0] ?? null;
          for (const sessionId of openedTabIds) {
            sessionStore.openTab(sessionId);
          }
          const targetId = focusedSessionId ?? openedTabIds[0];
          if (targetId) {
            requestSessionSwitch(targetId);
          }
          return true;
        }
      }
    },
    [onConfirmedEmptyConversation, persister, requestSessionSwitch, sessionStore],
  );
  const handleSessionList = reactExports.useCallback(
    (sessions, isReconnect) => {
      if (isReconnect) {
        enablePersistence();
        onRestoreSettled?.();
        return;
      }
      const workspaceKey = workspaceRef.current;
      void restoreAndOpen(workspaceKey, sessions)
        .then((restored) => {
          if (workspaceRef.current !== workspaceKey) return;
          if (!restored) openDefaultSession(sessions);
          enablePersistence();
          onRestoreSettled?.();
        })
        .catch(() => {
          if (workspaceRef.current !== workspaceKey) return;
          openDefaultSession(sessions);
          enablePersistence();
          onRestoreSettled?.();
        });
    },
    [enablePersistence, onRestoreSettled, openDefaultSession, restoreAndOpen],
  );
  const handleSessionListRef = reactExports.useRef(handleSessionList);
  handleSessionListRef.current = handleSessionList;
  return reactExports.useMemo(
    () => ({
      handleSessionList: (sessions, isReconnect) =>
        handleSessionListRef.current(sessions, isReconnect),
    }),
    [],
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
      const fallbackSessionId = currentFocusedId ?? targetSessionId ?? DRAFT_NEW_TAB;
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
