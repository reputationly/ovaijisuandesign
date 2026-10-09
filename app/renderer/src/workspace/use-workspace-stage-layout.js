// use-workspace-stage-layout.js
import { reactExports, useStorage } from "../vendor.js";
import { useCanvasSidebarController } from "./use-canvas-sidebar-controller.js";
function oppositeWorkspacePaneOrder(order2) {
  return order2 === "chat-canvas" ? "canvas-chat" : "chat-canvas";
}
function queueWorkspacePaneOrderSet(paneOrder) {
  return {
    kind: "set",
    paneOrder,
  };
}
function resolveWorkspacePaneOrderIntent(hydratedOrder, pending2) {
  if (!pending2) return hydratedOrder;
  return pending2.kind === "set"
    ? pending2.paneOrder
    : oppositeWorkspacePaneOrder(hydratedOrder);
}
const DEFAULT_WORKSPACE_PANE_ORDER = "canvas-chat";
const DEFAULT_WORKSPACE_CHAT_RATIO = 0.3;
const DEFAULT_WORKSPACE_STAGE_STATE = {
  paneOrder: DEFAULT_WORKSPACE_PANE_ORDER,
  canvasVisibility: "open",
  filesMode: "closed",
};
function isRecord(value) {
  return typeof value === "object" && value !== null;
}
function isPaneOrder(value) {
  return value === "chat-canvas" || value === "canvas-chat";
}
function isCanvasVisibility(value) {
  return value === "closed" || value === "open";
}
function isWorkspaceMode(value) {
  return value === "chatOnly" || value === "split" || value === "canvasOnly";
}
function isFilesMode(value) {
  return value === "closed" || value === "peek" || value === "docked";
}
function isAutoReveal(value) {
  return value === "eligible" || value === "consumed" || value === "suppressed";
}
function normalizeWorkspaceStageState(input) {
  const candidate = isRecord(input) ? input : {};
  const paneOrder = isPaneOrder(candidate.paneOrder)
    ? candidate.paneOrder
    : DEFAULT_WORKSPACE_STAGE_STATE.paneOrder;
  const legacyCanvasVisibility = isCanvasVisibility(candidate.canvasVisibility)
    ? candidate.canvasVisibility
    : DEFAULT_WORKSPACE_STAGE_STATE.canvasVisibility;
  const workspaceMode = isWorkspaceMode(candidate.workspaceMode)
    ? candidate.workspaceMode
    : legacyCanvasVisibility === "open"
      ? "split"
      : "chatOnly";
  const canvasVisibility = workspaceMode === "chatOnly" ? "closed" : "open";
  let filesMode = isFilesMode(candidate.filesMode)
    ? candidate.filesMode
    : DEFAULT_WORKSPACE_STAGE_STATE.filesMode;
  let autoReveal = isAutoReveal(candidate.autoReveal)
    ? candidate.autoReveal
    : "eligible";
  if (canvasVisibility === "closed") {
    filesMode = "closed";
  } else if (autoReveal === "eligible") {
    autoReveal = "consumed";
  }
  return {
    paneOrder,
    workspaceMode,
    canvasVisibility,
    filesMode,
    autoReveal,
  };
}
function createWorkspaceStageState(input = {}) {
  return normalizeWorkspaceStageState(input);
}
function consumeAutoReveal(autoReveal) {
  return autoReveal === "eligible" ? "consumed" : autoReveal;
}
function statesEqual(left, right) {
  return (
    left.paneOrder === right.paneOrder &&
    left.workspaceMode === right.workspaceMode &&
    left.canvasVisibility === right.canvasVisibility &&
    left.filesMode === right.filesMode &&
    left.autoReveal === right.autoReveal
  );
}
function transition(state2, patch2) {
  const next2 = normalizeWorkspaceStageState({
    ...state2,
    ...patch2,
  });
  return statesEqual(state2, next2) ? state2 : next2;
}
function workspaceStageReducer(state2, action) {
  switch (action.type) {
    case "state/restore": {
      const restored = createWorkspaceStageState(action.state);
      return statesEqual(state2, restored) ? state2 : restored;
    }
    case "pane-order/set":
      return transition(state2, {
        paneOrder: action.paneOrder,
      });
    case "pane-order/swap":
      return transition(state2, {
        paneOrder:
          state2.paneOrder === "chat-canvas" ? "canvas-chat" : "chat-canvas",
      });
    case "canvas/open":
      return transition(state2, {
        workspaceMode:
          state2.workspaceMode === "chatOnly" ? "split" : state2.workspaceMode,
        autoReveal: consumeAutoReveal(state2.autoReveal),
      });
    case "canvas/auto-reveal":
      if (state2.autoReveal !== "eligible") return state2;
      return transition(state2, {
        workspaceMode:
          state2.workspaceMode === "chatOnly" ? "split" : state2.workspaceMode,
        autoReveal: "consumed",
      });
    case "canvas/close":
      return transition(state2, {
        workspaceMode: "chatOnly",
        filesMode: "closed",
        autoReveal: "suppressed",
      });
    case "chat/open":
      return transition(state2, {
        workspaceMode:
          state2.workspaceMode === "canvasOnly"
            ? "split"
            : state2.workspaceMode,
      });
    case "chat/close":
      return transition(state2, {
        // Closing Chat is only meaningful when Canvas exists. From the
        // Chat-first state this atomically reveals Canvas, so the Stage never
        // enters an empty `none` mode even through a programmatic action.
        workspaceMode: "canvasOnly",
        autoReveal: consumeAutoReveal(state2.autoReveal),
      });
    case "files/open":
      return transition(state2, {
        workspaceMode:
          state2.workspaceMode === "chatOnly" ? "split" : state2.workspaceMode,
        filesMode: action.mode ?? "peek",
        autoReveal: consumeAutoReveal(state2.autoReveal),
      });
    case "files/close":
      return transition(state2, {
        filesMode: "closed",
      });
    case "files/toggle-peek":
      if (state2.filesMode !== "closed") {
        return transition(state2, {
          filesMode: "closed",
        });
      }
      return transition(state2, {
        workspaceMode:
          state2.workspaceMode === "chatOnly" ? "split" : state2.workspaceMode,
        filesMode: "peek",
        autoReveal: consumeAutoReveal(state2.autoReveal),
      });
    case "files/dock":
      return transition(state2, {
        workspaceMode:
          state2.workspaceMode === "chatOnly" ? "split" : state2.workspaceMode,
        filesMode: "docked",
        autoReveal: consumeAutoReveal(state2.autoReveal),
      });
    case "files/undock":
      if (state2.filesMode !== "docked") return state2;
      return transition(state2, {
        filesMode: "peek",
      });
    case "auto-reveal/suppress":
      return transition(state2, {
        autoReveal: "suppressed",
      });
    case "auto-reveal/reset":
      return transition(state2, {
        autoReveal: "eligible",
      });
  }
}
function rebaseWorkspaceStageActions(state2, actions) {
  return actions.reduce(workspaceStageReducer, state2);
}
function normalizeWorkspaceChatRatio(value) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(0.72, Math.max(0, value))
    : DEFAULT_WORKSPACE_CHAT_RATIO;
}
function normalizeWorkspacePaneOrder(value) {
  return value === "chat-canvas" || value === "canvas-chat"
    ? value
    : DEFAULT_WORKSPACE_PANE_ORDER;
}
export function useWorkspaceStageLayout(workspaceId2, isActive2) {
  const [layoutConfig, setLayoutConfig, setLayoutConfigAsync, layoutHydrated] =
    useStorage("global.config");
  const persistedStageState =
    layoutConfig.workspaceStageLayouts?.[workspaceId2];
  const paneOrder = normalizeWorkspacePaneOrder(
    layoutConfig.workspacePaneOrder,
  );
  const [stageState, dispatchStage] = reactExports.useReducer(
    workspaceStageReducer,
    {
      ...persistedStageState,
      paneOrder,
    },
    createWorkspaceStageState,
  );
  const stageRevisionRef = reactExports.useRef(0);
  const stageScheduledRevisionRef = reactExports.useRef(0);
  const stageRetryCountRef = reactExports.useRef(0);
  const stageRetryTimerRef = reactExports.useRef(void 0);
  const [stagePersistenceRetry, setStagePersistenceRetry] =
    reactExports.useState(0);
  const [stageLayoutReady, setStageLayoutReady] = reactExports.useState(false);
  const stageLayoutReadyRef = reactExports.useRef(false);
  const pendingStageActionsRef = reactExports.useRef([]);
  const effectiveStageState = reactExports.useMemo(() => {
    const visibleState = stageLayoutReady
      ? stageState
      : createWorkspaceStageState({
          ...persistedStageState,
          paneOrder,
        });
    return visibleState.paneOrder === paneOrder
      ? visibleState
      : {
          ...visibleState,
          paneOrder,
        };
  }, [paneOrder, persistedStageState, stageLayoutReady, stageState]);
  const [chatRatio, setChatRatio] = reactExports.useState(() =>
    normalizeWorkspaceChatRatio(layoutConfig.workspaceChatRatio),
  );
  const chatRatioRef = reactExports.useRef(chatRatio);
  chatRatioRef.current = chatRatio;
  const chatRatioRevisionRef = reactExports.useRef(0);
  const chatRatioScheduledRevisionRef = reactExports.useRef(0);
  const chatRatioRetryCountRef = reactExports.useRef(0);
  const chatRatioRetryTimerRef = reactExports.useRef(void 0);
  const [chatRatioPersistenceRetry, setChatRatioPersistenceRetry] =
    reactExports.useState(0);
  const persistenceMountedRef = reactExports.useRef(true);
  reactExports.useEffect(() => {
    persistenceMountedRef.current = true;
    return () => {
      persistenceMountedRef.current = false;
      if (stageRetryTimerRef.current !== void 0) {
        window.clearTimeout(stageRetryTimerRef.current);
      }
      if (chatRatioRetryTimerRef.current !== void 0) {
        window.clearTimeout(chatRatioRetryTimerRef.current);
      }
    };
  }, []);
  const markStageIntent = reactExports.useCallback(() => {
    stageRevisionRef.current += 1;
    stageRetryCountRef.current = 0;
    if (stageRetryTimerRef.current !== void 0) {
      window.clearTimeout(stageRetryTimerRef.current);
      stageRetryTimerRef.current = void 0;
    }
  }, []);
  reactExports.useEffect(() => {
    if (!layoutHydrated) {
      stageLayoutReadyRef.current = false;
      setStageLayoutReady(false);
      return;
    }
    if (stageLayoutReadyRef.current && stageRevisionRef.current !== 0) return;
    const restoredState = createWorkspaceStageState({
      ...persistedStageState,
      paneOrder,
    });
    const pendingActions = stageLayoutReadyRef.current
      ? []
      : pendingStageActionsRef.current;
    pendingStageActionsRef.current = [];
    const nextState = rebaseWorkspaceStageActions(
      restoredState,
      pendingActions,
    );
    dispatchStage({
      type: "state/restore",
      state: nextState,
    });
    stageLayoutReadyRef.current = true;
    setStageLayoutReady(true);
    if (pendingActions.length > 0) {
      markStageIntent();
    }
  }, [layoutHydrated, markStageIntent, paneOrder, persistedStageState]);
  reactExports.useEffect(() => {
    if (!layoutHydrated || chatRatioRevisionRef.current !== 0) return;
    const next2 = normalizeWorkspaceChatRatio(layoutConfig.workspaceChatRatio);
    chatRatioRef.current = next2;
    setChatRatio((previous2) => (previous2 === next2 ? previous2 : next2));
  }, [layoutConfig.workspaceChatRatio, layoutHydrated]);
  const dispatchStageWithIntent = reactExports.useCallback(
    (action) => {
      if (!layoutHydrated || !stageLayoutReadyRef.current) {
        pendingStageActionsRef.current.push(action);
        return;
      }
      markStageIntent();
      dispatchStage(action);
    },
    [layoutHydrated, markStageIntent],
  );
  const [browserOpen, setBrowserOpen] = reactExports.useState(false);
  const canvasPaneRef = reactExports.useRef(null);
  const handleCanvasPaneChange = reactExports.useCallback((pane) => {
    canvasPaneRef.current = pane;
  }, []);
  const getCanvasPane = reactExports.useCallback(
    () => canvasPaneRef.current,
    [],
  );
  const handleEnsureCanvasVisible = reactExports.useCallback(() => {
    setBrowserOpen(false);
    dispatchStageWithIntent({
      type: "canvas/open",
    });
  }, [dispatchStageWithIntent]);
  const pendingPaneOrderIntentRef = reactExports.useRef(null);
  const applyHydratedPaneOrderIntent = reactExports.useCallback(
    (intent) => {
      setLayoutConfig((previous2) => {
        const currentOrder = normalizeWorkspacePaneOrder(
          previous2.workspacePaneOrder,
        );
        const nextOrder = resolveWorkspacePaneOrderIntent(currentOrder, intent);
        return currentOrder === nextOrder
          ? previous2
          : {
              ...previous2,
              workspacePaneOrder: nextOrder,
            };
      });
    },
    [setLayoutConfig],
  );
  const handlePaneOrderChange = reactExports.useCallback(
    (targetOrder) => {
      const intent = queueWorkspacePaneOrderSet(targetOrder);
      if (!layoutHydrated) {
        pendingPaneOrderIntentRef.current = intent;
        return;
      }
      applyHydratedPaneOrderIntent(intent);
    },
    [applyHydratedPaneOrderIntent, layoutHydrated],
  );
  reactExports.useEffect(() => {
    const pendingIntent = pendingPaneOrderIntentRef.current;
    if (!layoutHydrated || !pendingIntent) return;
    pendingPaneOrderIntentRef.current = null;
    applyHydratedPaneOrderIntent(pendingIntent);
  }, [applyHydratedPaneOrderIntent, layoutHydrated]);
  reactExports.useEffect(() => {
    const revision = stageRevisionRef.current;
    if (
      !stageLayoutReady ||
      revision === 0 ||
      revision <= stageScheduledRevisionRef.current
    ) {
      return;
    }
    stageScheduledRevisionRef.current = revision;
    const persistedFilesMode =
      stageState.filesMode === "docked" ? "docked" : "closed";
    const snapshot2 = {
      workspaceMode: stageState.workspaceMode,
      // Keep the legacy projection so an older renderer still opens the same
      // Canvas after reading a snapshot written by this version.
      canvasVisibility: stageState.canvasVisibility,
      filesMode: persistedFilesMode,
      autoReveal: stageState.autoReveal,
    };
    void setLayoutConfigAsync((previous2) => {
      const current2 = previous2.workspaceStageLayouts?.[workspaceId2];
      if (
        current2?.workspaceMode === snapshot2.workspaceMode &&
        current2?.canvasVisibility === snapshot2.canvasVisibility &&
        current2?.filesMode === snapshot2.filesMode &&
        current2?.autoReveal === snapshot2.autoReveal
      ) {
        return previous2;
      }
      return {
        ...previous2,
        workspaceStageLayouts: {
          ...previous2.workspaceStageLayouts,
          [workspaceId2]: snapshot2,
        },
      };
    }).then((persisted) => {
      if (!persistenceMountedRef.current) return;
      if (stageRevisionRef.current !== revision) return;
      if (persisted) {
        stageRevisionRef.current = 0;
        stageScheduledRevisionRef.current = 0;
        stageRetryCountRef.current = 0;
        return;
      }
      if (stageRetryCountRef.current >= 1) return;
      stageRetryCountRef.current += 1;
      stageScheduledRevisionRef.current = revision - 1;
      stageRetryTimerRef.current = window.setTimeout(() => {
        stageRetryTimerRef.current = void 0;
        setStagePersistenceRetry((value) => value + 1);
      }, 500);
    });
  }, [
    setLayoutConfigAsync,
    stageLayoutReady,
    stagePersistenceRetry,
    stageState,
    workspaceId2,
  ]);
  reactExports.useEffect(() => {
    const revision = chatRatioRevisionRef.current;
    if (
      !layoutHydrated ||
      revision === 0 ||
      revision <= chatRatioScheduledRevisionRef.current
    ) {
      return;
    }
    const timeout2 = window.setTimeout(() => {
      chatRatioScheduledRevisionRef.current = revision;
      void setLayoutConfigAsync((previous2) =>
        previous2.workspaceChatRatio === chatRatio
          ? previous2
          : {
              ...previous2,
              workspaceChatRatio: chatRatio,
            },
      ).then((persisted) => {
        if (!persistenceMountedRef.current) return;
        if (chatRatioRevisionRef.current !== revision) return;
        if (persisted) {
          chatRatioRevisionRef.current = 0;
          chatRatioScheduledRevisionRef.current = 0;
          chatRatioRetryCountRef.current = 0;
          return;
        }
        if (chatRatioRetryCountRef.current >= 1) return;
        chatRatioRetryCountRef.current += 1;
        chatRatioScheduledRevisionRef.current = revision - 1;
        chatRatioRetryTimerRef.current = window.setTimeout(() => {
          chatRatioRetryTimerRef.current = void 0;
          setChatRatioPersistenceRetry((value) => value + 1);
        }, 500);
      });
    }, 250);
    return () => window.clearTimeout(timeout2);
  }, [
    chatRatio,
    chatRatioPersistenceRetry,
    layoutHydrated,
    setLayoutConfigAsync,
  ]);
  const handleChatRatioChange = reactExports.useCallback((nextRatio) => {
    const normalized = normalizeWorkspaceChatRatio(nextRatio);
    if (Math.abs(chatRatioRef.current - normalized) < 5e-4) return;
    chatRatioRef.current = normalized;
    chatRatioRevisionRef.current += 1;
    chatRatioRetryCountRef.current = 0;
    if (chatRatioRetryTimerRef.current !== void 0) {
      window.clearTimeout(chatRatioRetryTimerRef.current);
      chatRatioRetryTimerRef.current = void 0;
    }
    setChatRatio(normalized);
  }, []);
  const handleAssetPanelExpandedChange = reactExports.useCallback(
    (expanded) => {
      dispatchStageWithIntent(
        expanded
          ? {
              type: "files/open",
              mode: "docked",
            }
          : {
              type: "files/close",
            },
      );
    },
    [dispatchStageWithIntent],
  );
  const assetPanel = useCanvasSidebarController({
    isActive: isActive2,
    expanded: effectiveStageState.filesMode !== "closed",
    onExpandedChange: handleAssetPanelExpandedChange,
    resizeFrom: "left",
  });
  return {
    browserOpen,
    setBrowserOpen,
    assetPanel,
    stageState: effectiveStageState,
    dispatchStage: dispatchStageWithIntent,
    handlePaneOrderChange,
    chatRatio,
    handleChatRatioChange,
    handleCanvasPaneChange,
    getCanvasPane,
    handleEnsureCanvasVisible,
    stageLayoutReady,
  };
}
