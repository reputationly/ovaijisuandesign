// workspace-stage.jsx
import reactDomExports from "react-dom";
import reactExports from "react";
import { useTranslation } from "react-i18next";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  mergeTailwindClasses as cn,
  useBrowserHoverPreview,
} from "../infra/dialog-content.jsx";
import { WorkspacePaneReorderProvider } from "../chat/use-browser-chat-media.jsx";
import { ResizeColHandle } from "../assets/resize-col-handle.jsx";
const MIN_CHAT_RATIO = 0;
const MAX_CHAT_RATIO = 0.72;
const TARGET_MIN_CHAT_WIDTH = 220;
const TARGET_MIN_CANVAS_WIDTH = 320;
const PANE_REORDER_ACTIVATION_DISTANCE = 8;
const PANE_REORDER_MIN_SWAP_DISTANCE = 96;
const PANE_REORDER_MAX_SWAP_DISTANCE = 128;
const PANE_REORDER_SWAP_DISTANCE_RATIO = 0.1;
const PANE_REORDER_TARGET_DWELL_MS = 100;
const PANE_REORDER_HYSTERESIS = 28;
const PANE_REORDER_MAX_FOLLOW_DISTANCE = 16;
const PANE_REORDER_TRANSITION_MS = 320;
const PANE_REORDER_LIFT_TRANSITION_MS = 140;
const PANE_REORDER_DOCK_TRANSITION_MS = 140;
const PANE_REORDER_COMMIT_TIMEOUT_MS = 1e3;
const DIVIDER_LAYOUT_WIDTH = 0;
const PANE_REORDER_VISUAL_GAP = 8;
const PANE_REORDER_EASING = "cubic-bezier(0.2, 0.9, 0.25, 1.02)";
function clampChatRatio(value) {
  return Math.min(MAX_CHAT_RATIO, Math.max(MIN_CHAT_RATIO, value));
}
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
function resolvePaneReorderSwapDistance(stageWidth) {
  return clamp(
    stageWidth * PANE_REORDER_SWAP_DISTANCE_RATIO,
    PANE_REORDER_MIN_SWAP_DISTANCE,
    PANE_REORDER_MAX_SWAP_DISTANCE,
  );
}
function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] =
    reactExports.useState(false);
  reactExports.useEffect(() => {
    const mediaQuery = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mediaQuery) return;
    const syncPreference = () => setPrefersReducedMotion(mediaQuery.matches);
    syncPreference();
    mediaQuery.addEventListener?.("change", syncPreference);
    return () => mediaQuery.removeEventListener?.("change", syncPreference);
  }, []);
  return prefersReducedMotion;
}
function resolveWorkspaceStagePixelBudget(stageWidth, chatRatio) {
  const availablePaneWidth = Math.max(0, stageWidth - DIVIDER_LAYOUT_WIDTH);
  const ratioMax = stageWidth * MAX_CHAT_RATIO;
  const minChatWidth = Math.min(TARGET_MIN_CHAT_WIDTH, availablePaneWidth);
  const desiredMaxChatWidth = Math.min(
    ratioMax,
    Math.max(0, availablePaneWidth - TARGET_MIN_CANVAS_WIDTH),
  );
  const maxChatWidth = Math.max(minChatWidth, desiredMaxChatWidth);
  const preferredChatWidth = Math.round(stageWidth * clampChatRatio(chatRatio));
  return {
    chatWidth: Math.min(
      maxChatWidth,
      Math.max(minChatWidth, preferredChatWidth),
    ),
    minChatWidth,
    maxChatWidth,
  };
}
const IDLE_PANE_REORDER_STATE = {
  phase: "idle",
  targetOrder: null,
  dragOffsetX: 0,
};
function oppositePaneOrder(paneOrder) {
  return paneOrder === "chat-canvas" ? "canvas-chat" : "chat-canvas";
}
function dismissWorkspaceFloatingPanels() {
  document.dispatchEvent(
    new globalThis.KeyboardEvent("keydown", {
      key: "Escape",
      code: "Escape",
      bubbles: true,
      cancelable: true,
    }),
  );
}
export function WorkspaceStage({
  isActive = true,
  paneOrder,
  chatVisible,
  canvasVisible,
  chatRatio,
  onChatRatioChange,
  onPaneOrderChange,
  onCanvasPaneChange,
  textEditMode = false,
  controls,
  controlsRightInset = 8,
  overlay,
  overlayOpen = false,
  chat,
  canvas,
}) {
  const { t: translate } = useTranslation();
  const rootRef = reactExports.useRef(null);
  const canvasPaneRef = reactExports.useRef(null);
  const activePaneReorderRef = reactExports.useRef(null);
  const pendingPaneOrderRef = reactExports.useRef(null);
  const activeResizeRef = reactExports.useRef(null);
  const interactionOwnerRef = reactExports.useRef("none");
  const settleTimerRef = reactExports.useRef(null);
  const [stageWidth, setStageWidth] = reactExports.useState(0);
  const [resizeActive, setResizeActive] = reactExports.useState(false);
  const [paneMotionInterrupted, setPaneMotionInterrupted] =
    reactExports.useState(false);
  const [paneReorderState, setPaneReorderState] = reactExports.useState(
    IDLE_PANE_REORDER_STATE,
  );
  const paneReorderStateRef = reactExports.useRef(IDLE_PANE_REORDER_STATE);
  const prefersReducedMotion = usePrefersReducedMotion();
  const normalizedChatRatio = clampChatRatio(chatRatio);
  const splitVisible = chatVisible && canvasVisible;
  const paneReorderEnabled =
    isActive && splitVisible && Boolean(onPaneOrderChange);
  const browserPreviewReady = useBrowserHoverPreview(
    paneReorderEnabled && paneReorderState.phase !== "idle",
  );
  const { chatWidth, minChatWidth, maxChatWidth } =
    resolveWorkspaceStagePixelBudget(stageWidth, normalizedChatRatio);
  const commitPaneReorderState = reactExports.useCallback((nextState) => {
    paneReorderStateRef.current = nextState;
    setPaneReorderState(nextState);
  }, []);
  const isActiveRef = reactExports.useRef(isActive);
  isActiveRef.current = isActive;
  const syncStageWidth = reactExports.useCallback(() => {
    const root = rootRef.current;
    if (!root || !isActiveRef.current) return;
    const nextWidth = root.getBoundingClientRect().width || root.clientWidth;
    if (!Number.isFinite(nextWidth) || nextWidth <= 0) return;
    setStageWidth((previous) =>
      previous === nextWidth ? previous : nextWidth,
    );
  }, []);
  reactExports.useLayoutEffect(() => {
    if (isActive) syncStageWidth();
  }, [isActive, syncStageWidth]);
  reactExports.useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    syncStageWidth();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", syncStageWidth);
      return () => window.removeEventListener("resize", syncStageWidth);
    }
    const observer = new ResizeObserver(syncStageWidth);
    observer.observe(root);
    return () => observer.disconnect();
  }, [syncStageWidth]);
  const setCanvasPaneRef = reactExports.useCallback(
    (pane) => {
      canvasPaneRef.current = pane;
      onCanvasPaneChange?.(pane);
    },
    [onCanvasPaneChange],
  );
  const clearSettleTimer = reactExports.useCallback(() => {
    if (settleTimerRef.current === null) return;
    window.clearTimeout(settleTimerRef.current);
    settleTimerRef.current = null;
  }, []);
  const dockPaneSurfaces = reactExports.useCallback(() => {
    clearSettleTimer();
    if (prefersReducedMotion) {
      commitPaneReorderState(IDLE_PANE_REORDER_STATE);
      return;
    }
    commitPaneReorderState({
      phase: "docking",
      targetOrder: null,
      dragOffsetX: 0,
    });
    settleTimerRef.current = window.setTimeout(() => {
      settleTimerRef.current = null;
      commitPaneReorderState(IDLE_PANE_REORDER_STATE);
    }, PANE_REORDER_DOCK_TRANSITION_MS);
  }, [clearSettleTimer, commitPaneReorderState, prefersReducedMotion]);
  const releaseActivePaneReorder = reactExports.useCallback(() => {
    const active = activePaneReorderRef.current;
    if (!active) return null;
    activePaneReorderRef.current = null;
    if (active.targetDwellTimer !== null) {
      window.clearTimeout(active.targetDwellTimer);
      active.targetDwellTimer = null;
    }
    if (interactionOwnerRef.current === "reorder")
      interactionOwnerRef.current = "none";
    document.body.style.cursor = active.previousCursor;
    document.body.style.userSelect = active.previousUserSelect;
    try {
      if (
        typeof active.handle.hasPointerCapture !== "function" ||
        active.handle.hasPointerCapture(active.pointerId)
      ) {
        active.handle.releasePointerCapture?.(active.pointerId);
      }
    } catch {}
    return active;
  }, []);
  const cancelPaneReorder = reactExports.useCallback(() => {
    const previous = paneReorderStateRef.current;
    pendingPaneOrderRef.current = null;
    releaseActivePaneReorder();
    clearSettleTimer();
    if (
      prefersReducedMotion ||
      previous.phase === "idle" ||
      previous.phase === "armed"
    ) {
      commitPaneReorderState(IDLE_PANE_REORDER_STATE);
      return;
    }
    commitPaneReorderState({
      phase: "settling",
      targetOrder: null,
      dragOffsetX: 0,
    });
    settleTimerRef.current = window.setTimeout(() => {
      settleTimerRef.current = null;
      dockPaneSurfaces();
    }, PANE_REORDER_TRANSITION_MS);
  }, [
    clearSettleTimer,
    commitPaneReorderState,
    dockPaneSurfaces,
    prefersReducedMotion,
    releaseActivePaneReorder,
  ]);
  const settlePaneReorder = reactExports.useCallback(
    (targetOrder) => {
      clearSettleTimer();
      commitPaneReorderState({
        phase: "settling",
        targetOrder,
        dragOffsetX: 0,
      });
      onPaneOrderChange?.(targetOrder);
      settleTimerRef.current = window.setTimeout(() => {
        settleTimerRef.current = null;
        dockPaneSurfaces();
      }, PANE_REORDER_COMMIT_TIMEOUT_MS);
    },
    [
      clearSettleTimer,
      commitPaneReorderState,
      dockPaneSurfaces,
      onPaneOrderChange,
    ],
  );
  const requestPaneOrderChange = reactExports.useCallback(
    (targetOrder) => {
      if (
        !paneReorderEnabled ||
        targetOrder === paneOrder ||
        interactionOwnerRef.current !== "none" ||
        paneReorderStateRef.current.phase !== "idle"
      ) {
        return;
      }
      dismissWorkspaceFloatingPanels();
      clearSettleTimer();
      setPaneMotionInterrupted(false);
      pendingPaneOrderRef.current = targetOrder;
      commitPaneReorderState({
        phase: "armed",
        targetOrder: null,
        dragOffsetX: 0,
      });
    },
    [clearSettleTimer, commitPaneReorderState, paneOrder, paneReorderEnabled],
  );
  reactExports.useEffect(() => {
    const targetOrder = pendingPaneOrderRef.current;
    if (
      !browserPreviewReady ||
      !paneReorderEnabled ||
      !targetOrder ||
      paneReorderState.phase !== "armed"
    )
      return;
    pendingPaneOrderRef.current = null;
    if (prefersReducedMotion) {
      settlePaneReorder(targetOrder);
      return;
    }
    commitPaneReorderState({
      phase: "targeted",
      targetOrder,
      dragOffsetX: 0,
    });
    settleTimerRef.current = window.setTimeout(() => {
      settleTimerRef.current = null;
      settlePaneReorder(targetOrder);
    }, PANE_REORDER_TRANSITION_MS);
  }, [
    browserPreviewReady,
    paneReorderEnabled,
    paneReorderState.phase,
    prefersReducedMotion,
    commitPaneReorderState,
    settlePaneReorder,
  ]);
  const handlePaneReorderPointerDown = reactExports.useCallback(
    (event) => {
      if (
        !paneReorderEnabled ||
        event.button !== 0 ||
        event.isPrimary === false ||
        interactionOwnerRef.current !== "none" ||
        paneReorderStateRef.current.phase !== "idle"
      ) {
        return;
      }
      dismissWorkspaceFloatingPanels();
      event.preventDefault();
      event.stopPropagation();
      setPaneMotionInterrupted(false);
      clearSettleTimer();
      releaseActivePaneReorder();
      interactionOwnerRef.current = "reorder";
      const handle = event.currentTarget;
      try {
        handle.setPointerCapture?.(event.pointerId);
      } catch {}
      activePaneReorderRef.current = {
        pointerId: event.pointerId,
        handle,
        startX: event.clientX,
        startY: event.clientY,
        latestPointer: null,
        direction: paneOrder === "chat-canvas" ? 1 : -1,
        swapDistance: resolvePaneReorderSwapDistance(stageWidth),
        targetOrder: oppositePaneOrder(paneOrder),
        activated: false,
        targetedAt: null,
        targetDwellTimer: null,
        latestDirectionalDistance: 0,
        latestDragOffsetX: 0,
        previousCursor: document.body.style.cursor,
        previousUserSelect: document.body.style.userSelect,
      };
      commitPaneReorderState({
        phase: "armed",
        targetOrder: null,
        dragOffsetX: 0,
      });
    },
    [
      clearSettleTimer,
      commitPaneReorderState,
      paneOrder,
      paneReorderEnabled,
      releaseActivePaneReorder,
      stageWidth,
    ],
  );
  const updatePaneReorderPointer = reactExports.useCallback(
    (clientX, clientY) => {
      const active = activePaneReorderRef.current;
      if (!active) return;
      active.latestPointer = {
        clientX,
        clientY,
      };
      if (!browserPreviewReady) return;
      const deltaX = clientX - active.startX;
      const deltaY = clientY - active.startY;
      if (!active.activated) {
        if (Math.abs(deltaX) < PANE_REORDER_ACTIVATION_DISTANCE) return;
        if (Math.abs(deltaY) > Math.abs(deltaX)) {
          cancelPaneReorder();
          return;
        }
        active.activated = true;
        document.body.style.cursor = "grabbing";
        document.body.style.userSelect = "none";
      }
      const previous = paneReorderStateRef.current;
      const directionalDistance = deltaX * active.direction;
      const releaseDistance = active.swapDistance - PANE_REORDER_HYSTERESIS;
      const alreadyTargeted = previous.targetOrder === active.targetOrder;
      const dragOffsetX = prefersReducedMotion
        ? 0
        : Math.round(
            clamp(
              deltaX * 0.12,
              -PANE_REORDER_MAX_FOLLOW_DISTANCE,
              PANE_REORDER_MAX_FOLLOW_DISTANCE,
            ),
          );
      active.latestDirectionalDistance = directionalDistance;
      active.latestDragOffsetX = dragOffsetX;
      let targetOrder = null;
      if (alreadyTargeted && directionalDistance >= releaseDistance) {
        targetOrder = active.targetOrder;
      } else if (directionalDistance >= active.swapDistance) {
        if (active.targetDwellTimer === null) {
          active.targetDwellTimer = window.setTimeout(() => {
            const latest = activePaneReorderRef.current;
            active.targetDwellTimer = null;
            if (
              latest !== active ||
              latest.latestDirectionalDistance < latest.swapDistance ||
              paneReorderStateRef.current.targetOrder === latest.targetOrder
            ) {
              return;
            }
            latest.targetedAt = Date.now();
            commitPaneReorderState({
              phase: "targeted",
              targetOrder: latest.targetOrder,
              dragOffsetX: latest.latestDragOffsetX,
            });
          }, PANE_REORDER_TARGET_DWELL_MS);
        }
      } else if (active.targetDwellTimer !== null) {
        window.clearTimeout(active.targetDwellTimer);
        active.targetDwellTimer = null;
      }
      if (
        alreadyTargeted &&
        targetOrder === null &&
        active.targetDwellTimer !== null
      ) {
        window.clearTimeout(active.targetDwellTimer);
        active.targetDwellTimer = null;
      }
      if (alreadyTargeted && targetOrder === null) active.targetedAt = null;
      const phase = targetOrder ? "targeted" : "dragging";
      if (
        previous.phase !== phase ||
        previous.targetOrder !== targetOrder ||
        previous.dragOffsetX !== dragOffsetX
      ) {
        commitPaneReorderState({
          phase,
          targetOrder,
          dragOffsetX,
        });
      }
    },
    [
      browserPreviewReady,
      cancelPaneReorder,
      commitPaneReorderState,
      prefersReducedMotion,
    ],
  );
  const handlePaneReorderPointerMove = reactExports.useCallback(
    (event) => {
      if (activePaneReorderRef.current?.pointerId !== event.pointerId) return;
      event.preventDefault();
      updatePaneReorderPointer(event.clientX, event.clientY);
    },
    [updatePaneReorderPointer],
  );
  reactExports.useEffect(() => {
    const pointer = activePaneReorderRef.current?.latestPointer;
    if (browserPreviewReady && pointer)
      updatePaneReorderPointer(pointer.clientX, pointer.clientY);
  }, [browserPreviewReady, updatePaneReorderPointer]);
  const handlePaneReorderPointerUp = reactExports.useCallback(
    (event) => {
      const active = activePaneReorderRef.current;
      if (!active || active.pointerId !== event.pointerId) return;
      event.preventDefault();
      const targetOrder = paneReorderStateRef.current.targetOrder;
      const targetedAt = active.targetedAt;
      releaseActivePaneReorder();
      if (targetOrder && targetOrder !== paneOrder) {
        const elapsedPreviewMs =
          targetedAt === null
            ? PANE_REORDER_TRANSITION_MS
            : Date.now() - targetedAt;
        const remainingPreviewMs = Math.max(
          0,
          PANE_REORDER_TRANSITION_MS - elapsedPreviewMs,
        );
        if (prefersReducedMotion || remainingPreviewMs === 0) {
          settlePaneReorder(targetOrder);
        } else {
          clearSettleTimer();
          settleTimerRef.current = window.setTimeout(() => {
            settleTimerRef.current = null;
            settlePaneReorder(targetOrder);
          }, remainingPreviewMs);
        }
      } else {
        cancelPaneReorder();
      }
    },
    [
      cancelPaneReorder,
      clearSettleTimer,
      paneOrder,
      prefersReducedMotion,
      releaseActivePaneReorder,
      settlePaneReorder,
    ],
  );
  const handlePaneReorderPointerCancel = reactExports.useCallback(
    (event) => {
      const active = activePaneReorderRef.current;
      if (!active || active.pointerId !== event.pointerId) return;
      cancelPaneReorder();
    },
    [cancelPaneReorder],
  );
  const handlePaneReorderLostPointerCapture = reactExports.useCallback(
    (event) => {
      const active = activePaneReorderRef.current;
      if (!active || active.pointerId !== event.pointerId) return;
      cancelPaneReorder();
    },
    [cancelPaneReorder],
  );
  const handlePaneReorderKeyDown = reactExports.useCallback(
    (event) => {
      if (
        !paneReorderEnabled ||
        interactionOwnerRef.current !== "none" ||
        (event.key !== "Enter" && event.key !== " ")
      ) {
        return;
      }
      event.preventDefault();
      requestPaneOrderChange(oppositePaneOrder(paneOrder));
    },
    [paneOrder, paneReorderEnabled, requestPaneOrderChange],
  );
  reactExports.useEffect(() => {
    if (
      paneReorderState.phase !== "armed" &&
      paneReorderState.phase !== "dragging" &&
      paneReorderState.phase !== "targeted"
    ) {
      return;
    }
    const handleKeyDown = (event) => {
      if (event.key === "Escape") cancelPaneReorder();
    };
    const handleWindowBlur = () => cancelPaneReorder();
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("blur", handleWindowBlur);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, [cancelPaneReorder, paneReorderState.phase]);
  reactExports.useEffect(() => {
    if (
      paneReorderState.phase !== "settling" ||
      paneReorderState.targetOrder === null ||
      paneReorderState.targetOrder !== paneOrder
    ) {
      return;
    }
    clearSettleTimer();
    if (prefersReducedMotion) {
      commitPaneReorderState(IDLE_PANE_REORDER_STATE);
      return;
    }
    commitPaneReorderState({
      phase: "docking",
      targetOrder: null,
      dragOffsetX: 0,
    });
    settleTimerRef.current = window.setTimeout(() => {
      settleTimerRef.current = null;
      commitPaneReorderState(IDLE_PANE_REORDER_STATE);
    }, PANE_REORDER_DOCK_TRANSITION_MS);
  }, [
    clearSettleTimer,
    commitPaneReorderState,
    paneOrder,
    paneReorderState,
    prefersReducedMotion,
  ]);
  reactExports.useLayoutEffect(() => {
    const browserInterrupted =
      !browserPreviewReady && paneReorderState.phase !== "armed";
    if (
      (paneReorderEnabled && !browserInterrupted) ||
      paneReorderState.phase === "idle"
    )
      return;
    setPaneMotionInterrupted(true);
    pendingPaneOrderRef.current = null;
    releaseActivePaneReorder();
    clearSettleTimer();
    commitPaneReorderState(IDLE_PANE_REORDER_STATE);
  }, [
    clearSettleTimer,
    commitPaneReorderState,
    paneReorderEnabled,
    browserPreviewReady,
    paneReorderState.phase,
    releaseActivePaneReorder,
  ]);
  reactExports.useEffect(
    () => () => {
      clearSettleTimer();
      const active = releaseActivePaneReorder();
      if (active) {
        document.body.style.cursor = active.previousCursor;
        document.body.style.userSelect = active.previousUserSelect;
      }
    },
    [clearSettleTimer, releaseActivePaneReorder],
  );
  const paneReorderContext = reactExports.useMemo(
    () => ({
      enabled: paneReorderEnabled,
      paneOrder,
      phase: paneReorderState.phase,
      requestPaneOrderChange,
      onHandleKeyDown: handlePaneReorderKeyDown,
      onHandlePointerCancel: handlePaneReorderPointerCancel,
      onHandlePointerDown: handlePaneReorderPointerDown,
      onHandlePointerMove: handlePaneReorderPointerMove,
      onHandlePointerUp: handlePaneReorderPointerUp,
      onHandleLostPointerCapture: handlePaneReorderLostPointerCapture,
    }),
    [
      handlePaneReorderKeyDown,
      handlePaneReorderLostPointerCapture,
      handlePaneReorderPointerCancel,
      handlePaneReorderPointerDown,
      handlePaneReorderPointerMove,
      handlePaneReorderPointerUp,
      paneOrder,
      paneReorderEnabled,
      paneReorderState.phase,
      requestPaneOrderChange,
    ],
  );
  const updateRatioFromClientX = reactExports.useCallback(
    (clientX) => {
      const rect = rootRef.current?.getBoundingClientRect();
      if (!rect || rect.width <= 0) return;
      const pointerChatWidth =
        (paneOrder === "chat-canvas"
          ? clientX - rect.left
          : rect.right - clientX) -
        DIVIDER_LAYOUT_WIDTH / 2;
      const budget = resolveWorkspaceStagePixelBudget(
        rect.width,
        normalizedChatRatio,
      );
      const nextChatWidth = Math.min(
        budget.maxChatWidth,
        Math.max(budget.minChatWidth, pointerChatWidth),
      );
      const nextRatio = clampChatRatio(nextChatWidth / rect.width);
      reactDomExports.flushSync(() => onChatRatioChange(nextRatio));
    },
    [normalizedChatRatio, onChatRatioChange, paneOrder],
  );
  const releaseActiveResize = reactExports.useCallback(() => {
    const active = activeResizeRef.current;
    if (!active) return;
    activeResizeRef.current = null;
    document.removeEventListener("mousemove", active.handleMouseMove);
    document.removeEventListener("mouseup", active.handleMouseUp);
    window.removeEventListener("blur", active.handleWindowBlur);
    if (interactionOwnerRef.current === "resize")
      interactionOwnerRef.current = "none";
    setResizeActive(false);
    document.body.classList.remove("workspace-stage-resizing");
    document.body.style.cursor = active.previousCursor;
    document.body.style.userSelect = active.previousUserSelect;
  }, []);
  reactExports.useEffect(
    () => () => releaseActiveResize(),
    [releaseActiveResize],
  );
  const handleResizeMouseDown = reactExports.useCallback(
    (event) => {
      if (
        interactionOwnerRef.current !== "none" ||
        paneReorderStateRef.current.phase !== "idle"
      ) {
        return;
      }
      if (!textEditMode) dismissWorkspaceFloatingPanels();
      event.preventDefault();
      interactionOwnerRef.current = "resize";
      setResizeActive(true);
      const previousCursor = document.body.style.cursor;
      const previousUserSelect = document.body.style.userSelect;
      updateRatioFromClientX(event.clientX);
      const handleMouseMove = (moveEvent) => {
        updateRatioFromClientX(moveEvent.clientX);
      };
      const handleMouseUp = () => releaseActiveResize();
      const handleWindowBlur = () => releaseActiveResize();
      activeResizeRef.current = {
        handleMouseMove,
        handleMouseUp,
        handleWindowBlur,
        previousCursor,
        previousUserSelect,
      };
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("blur", handleWindowBlur);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      document.body.classList.add("workspace-stage-resizing");
    },
    [releaseActiveResize, textEditMode, updateRatioFromClientX],
  );
  const roundedChatWidth = Math.round(chatWidth);
  const roundedMinChatWidth = Math.round(minChatWidth);
  const roundedMaxChatWidth = Math.round(maxChatWidth);
  const canvasWidth = Math.max(
    0,
    stageWidth - DIVIDER_LAYOUT_WIDTH - chatWidth,
  );
  const paneReorderPointerActive =
    paneReorderState.phase === "armed" ||
    paneReorderState.phase === "dragging" ||
    paneReorderState.phase === "targeted";
  const paneReorderAnimating =
    paneReorderState.phase === "dragging" ||
    paneReorderState.phase === "targeted" ||
    paneReorderState.phase === "settling" ||
    paneReorderState.phase === "docking";
  const paneSurfacesSeparated =
    !prefersReducedMotion &&
    (paneReorderState.phase === "dragging" ||
      paneReorderState.phase === "targeted" ||
      paneReorderState.phase === "settling");
  const paneSwapPreviewed =
    splitVisible &&
    paneReorderState.targetOrder !== null &&
    paneReorderState.targetOrder !== paneOrder;
  const physicalPaneOrder = paneSwapPreviewed
    ? oppositePaneOrder(paneOrder)
    : paneOrder;
  const paneSwapDirection = paneOrder === "chat-canvas" ? 1 : -1;
  const chatSwapOffset = paneSwapPreviewed
    ? Math.round(paneSwapDirection * (canvasWidth + DIVIDER_LAYOUT_WIDTH))
    : 0;
  const canvasSwapOffset = paneSwapPreviewed
    ? Math.round(-paneSwapDirection * (chatWidth + DIVIDER_LAYOUT_WIDTH))
    : 0;
  const dividerSwapOffset = paneSwapPreviewed
    ? Math.round(paneSwapDirection * (canvasWidth - chatWidth))
    : 0;
  const committedLayoutSettling =
    paneReorderState.phase === "settling" &&
    paneReorderState.targetOrder === paneOrder;
  const paneMotionBlocked = !browserPreviewReady || paneMotionInterrupted;
  const paneMotionDuration =
    resizeActive || paneMotionBlocked
      ? 0
      : prefersReducedMotion
        ? 0
        : paneReorderState.phase === "docking"
          ? PANE_REORDER_DOCK_TRANSITION_MS
          : committedLayoutSettling
            ? 0
            : PANE_REORDER_TRANSITION_MS;
  const paneMotionStyle = {
    transitionDuration: `${paneMotionDuration}ms`,
    transitionProperty: "transform",
    transitionTimingFunction: PANE_REORDER_EASING,
    willChange: paneReorderAnimating ? "transform" : void 0,
  };
  const chatLifted = paneSurfacesSeparated;
  const physicalChatSide =
    physicalPaneOrder === "chat-canvas" ? "left" : "right";
  const surfaceGapOffset = paneSurfacesSeparated
    ? PANE_REORDER_VISUAL_GAP / 2
    : 0;
  const chatSurfaceOffset =
    physicalChatSide === "left" ? -surfaceGapOffset : surfaceGapOffset;
  const canvasSurfaceOffset = -chatSurfaceOffset;
  const separatedSurfaceShadow = paneSurfacesSeparated
    ? "0 12px 30px rgb(0 0 0 / 0.14), 0 2px 8px rgb(0 0 0 / 0.08)"
    : "none";
  const surfaceMotionDuration =
    resizeActive || prefersReducedMotion || paneMotionBlocked
      ? 0
      : PANE_REORDER_LIFT_TRANSITION_MS;
  const chatLiftStyle = {
    borderRadius: paneSurfacesSeparated ? "0.75rem" : "0px",
    boxShadow: separatedSurfaceShadow,
    transform: paneSurfacesSeparated
      ? `translate3d(${chatSurfaceOffset + paneReorderState.dragOffsetX}px, -2px, 0)`
      : "translate3d(0, 0, 0)",
    transitionDuration: `${surfaceMotionDuration}ms`,
    transitionProperty: "transform, box-shadow, border-radius",
    transitionTimingFunction: PANE_REORDER_EASING,
    willChange: paneReorderAnimating ? "transform" : void 0,
  };
  const canvasLiftStyle = {
    borderRadius: paneSurfacesSeparated ? "0.75rem" : "0px",
    boxShadow: separatedSurfaceShadow,
    transform: paneSurfacesSeparated
      ? `translate3d(${canvasSurfaceOffset}px, -1px, 0)`
      : "translate3d(0, 0, 0)",
    transitionDuration: `${surfaceMotionDuration}ms`,
    transitionProperty: "transform, box-shadow, border-radius",
    transitionTimingFunction: PANE_REORDER_EASING,
    willChange: paneReorderAnimating ? "transform" : void 0,
  };
  const chatPaneFlexStyle = splitVisible
    ? stageWidth > 0
      ? {
          flex: `0 0 ${chatWidth}px`,
        }
      : {
          flex: `0 0 ${normalizedChatRatio * 100}%`,
        }
    : chatVisible
      ? {
          flex: "1 1 100%",
        }
      : {
          flex: "0 0 0px",
          visibility: "hidden",
        };
  const canvasPaneFlexStyle = splitVisible
    ? {
        flex: "1 1 0%",
      }
    : canvasVisible
      ? {
          flex: "1 1 100%",
        }
      : {
          flex: "0 0 0px",
          visibility: "hidden",
        };
  const chatPane = (
    <section
      key={"chat"}
      data-workspace-pane="chat"
      data-pane-visible={chatVisible ? "true" : "false"}
      aria-hidden={!chatVisible || overlayOpen}
      inert={!chatVisible || overlayOpen}
      className={cn(
        "relative min-h-0 min-w-0",
        chatLifted && "z-30",
        resizeActive && "pointer-events-none",
      )}
      style={{
        ...chatPaneFlexStyle,
        ...paneMotionStyle,
        order: paneOrder === "chat-canvas" ? 0 : 2,
        transform: `translate3d(${chatSwapOffset}px, 0, 0)`,
      }}
    >
      <div
        className={cn(
          "h-full min-h-0 min-w-0 overflow-hidden bg-card",
          paneSurfacesSeparated && "elevated-surface-border",
        )}
        data-workspace-pane-surface="chat"
        data-pane-lifted={chatLifted ? "true" : "false"}
        style={chatLiftStyle}
      >
        {chat}
      </div>
    </section>
  );
  const canvasPane = (
    <section
      key={"canvas"}
      ref={setCanvasPaneRef}
      data-workspace-pane="canvas"
      data-pane-visible={canvasVisible ? "true" : "false"}
      aria-hidden={!canvasVisible || overlayOpen}
      inert={!canvasVisible || overlayOpen}
      className={cn(
        "relative min-h-0 min-w-0",
        (paneReorderPointerActive || resizeActive) && "pointer-events-none",
      )}
      style={{
        ...canvasPaneFlexStyle,
        ...paneMotionStyle,
        order: paneOrder === "chat-canvas" ? 2 : 0,
        transform: `translate3d(${canvasSwapOffset}px, 0, 0)`,
      }}
    >
      <div
        className={cn(
          "h-full min-h-0 min-w-0 overflow-hidden bg-background",
          paneSurfacesSeparated && "elevated-surface-border",
        )}
        data-workspace-pane-surface="canvas"
        data-pane-lifted={paneSurfacesSeparated ? "true" : "false"}
        style={canvasLiftStyle}
      >
        {canvas}
      </div>
    </section>
  );
  const divider = splitVisible ? (
    <div
      key={"chat-canvas-divider"}
      className={cn(
        "relative z-30 h-full w-0 shrink-0",
        paneReorderPointerActive && "pointer-events-none",
      )}
      data-workspace-divider-seam="chat-canvas"
      data-resize-active={resizeActive ? "true" : "false"}
      data-text-edit-mode={textEditMode ? "true" : "false"}
      data-text-edit-canvas-side={
        textEditMode ? (physicalChatSide === "left" ? "right" : "left") : void 0
      }
      aria-hidden={overlayOpen}
      inert={overlayOpen}
      style={{
        ...paneMotionStyle,
        order: 1,
        transform: `translate3d(${dividerSwapOffset}px, 0, 0)`,
      }}
    >
      <span
        className="pointer-events-none absolute left-1/2 top-0 h-full -translate-x-1/2 bg-border"
        data-workspace-divider-line="chat-canvas"
        style={{
          opacity: paneSurfacesSeparated ? 0 : 1,
          transition: `opacity ${prefersReducedMotion ? 0 : PANE_REORDER_DOCK_TRANSITION_MS}ms ease`,
          width: "0.5px",
        }}
        aria-hidden="true"
      />
      <ResizeColHandle
        tabIndex={0}
        aria-label={translate("a11y.resizeChatCanvas", "Resize Chat and Canvas")}
        aria-orientation="vertical"
        aria-valuemin={roundedMinChatWidth}
        aria-valuemax={roundedMaxChatWidth}
        aria-valuenow={roundedChatWidth}
        data-action-ui-id="workspace-stage.resize-handle"
        data-workspace-divider="chat-canvas"
        baseClassName="absolute left-1/2 top-0 z-30 h-full w-[9px] -translate-x-1/2 cursor-col-resize overflow-visible border-0 bg-transparent p-0"
        indicatorVariant="grip"
        onMouseDown={handleResizeMouseDown}
        onValueChange={(nextWidth) => {
          if (stageWidth <= 0 || paneReorderStateRef.current.phase !== "idle")
            return;
          if (!textEditMode) dismissWorkspaceFloatingPanels();
          const dynamicallyClampedWidth = Math.min(
            maxChatWidth,
            Math.max(minChatWidth, nextWidth),
          );
          onChatRatioChange(
            clampChatRatio(dynamicallyClampedWidth / stageWidth),
          );
        }}
        invertKeyboardDirection={paneOrder === "canvas-chat"}
      />
    </div>
  ) : null;
  return (
    <WorkspacePaneReorderProvider value={paneReorderContext}>
      <div
        ref={rootRef}
        className={cn(
          "relative flex min-h-0 min-w-0 flex-1 rounded-xl bg-background elevated-surface-border",
          paneSurfacesSeparated ? "overflow-visible" : "overflow-hidden",
        )}
        style={{
          borderColor: paneSurfacesSeparated ? "transparent" : void 0,
        }}
        data-action-ui-id="workspace-stage"
        data-workspace-stage-frame="shared"
        data-pane-separation={paneSurfacesSeparated ? "detached" : "joined"}
        data-pane-order={paneOrder}
        data-physical-pane-order={physicalPaneOrder}
        data-layout-mode={splitVisible ? "split" : "focus"}
        data-pane-reorder-state={paneReorderState.phase}
        data-pane-reorder-preview={paneSwapPreviewed ? "swapped" : "origin"}
        data-pane-reorder-motion={prefersReducedMotion ? "reduced" : "full"}
        data-pane-reorder-threshold={Math.round(
          resolvePaneReorderSwapDistance(stageWidth),
        )}
        data-pane-reorder-dwell={PANE_REORDER_TARGET_DWELL_MS}
        data-workspace-overlay-open={overlayOpen ? "true" : "false"}
      >
        {chatPane}
        {divider}
        {canvasPane}
        {controls ? (
          <div
            aria-hidden={overlayOpen}
            inert={overlayOpen}
            className="no-drag absolute top-2 z-40 flex h-8 items-center justify-center"
            data-action-ui-id="workspace-stage.controls"
            data-workspace-stage-controls="top-right"
            data-workspace-stage-controls-right-inset={controlsRightInset}
            style={{
              right: controlsRightInset,
            }}
          >
            {controls}
          </div>
        ) : null}
        {overlay}
        {canvasVisible && !chatVisible ? (
          <div
            aria-hidden="true"
            className="mac-window-drag-handle mac-window-drag-region absolute top-1.5 left-1/2 z-40 h-3 w-16 -translate-x-1/2"
            data-action-ui-id="workspace-stage.window-drag-handle"
          >
            <span className="pointer-events-none absolute top-1/2 left-1/2 h-0.5 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground/20" />
          </div>
        ) : null}
      </div>
    </WorkspacePaneReorderProvider>
  );
}
