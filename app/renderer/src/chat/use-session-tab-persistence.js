// use-session-tab-persistence.js
import { getElectronPlatform } from "../infra/use-canvas-node-assets-store.js";
import { reactExports } from "../vendor.js";
import { SessionTabsPersister } from "../canvas/session-tabs-persister.js";

function createWorkspaceSessionTabsSnapshot(
  state2,
  excludedSessionIds = new Set(),
) {
  const openedTabIds = state2.openedTabOrder
    .filter((id2) => {
      const session = state2.sessions.get(id2);
      return (
        session !== void 0 &&
        !excludedSessionIds.has(id2) &&
        !(session.runtimeSessionId
          ? excludedSessionIds.has(session.runtimeSessionId)
          : false)
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
  const openedTabIds = saved.openedTabIds.filter((id2) =>
    availableIds.has(id2),
  );
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
  const persister = reactExports.useMemo(
    () => new SessionTabsPersister(getPlatformStorage),
    [],
  );
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
    let snapshot2 = createWorkspaceSessionTabsSnapshot(
      state2,
      excludedSessionIds,
    );
    const rawFocusedId = state2.focusedSessionId;
    const focusedSession = rawFocusedId
      ? state2.sessions.get(rawFocusedId)
      : void 0;
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
          preservedFocusedId &&
          snapshot2.openedTabIds.includes(preservedFocusedId)
            ? preservedFocusedId
            : null,
      };
      lastPresentableFocusedIdRef.current = snapshot2.focusedSessionId;
    } else if (focusedIsExcluded) {
      const previousFocusedId = lastPresentableFocusedIdRef.current;
      if (
        previousFocusedId &&
        snapshot2.openedTabIds.includes(previousFocusedId)
      ) {
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
  }, [
    getExcludedSessionIds,
    getPreservedFocusedSessionId,
    persister,
    sessionStore,
  ]);
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
          lastPresentableFocusedIdRef.current =
            focusedSessionId ?? openedTabIds[0] ?? null;
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
    [
      onConfirmedEmptyConversation,
      persister,
      requestSessionSwitch,
      sessionStore,
    ],
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
