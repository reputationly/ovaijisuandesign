// workspace-canvas-focus-coordinator.js
import { reactExports } from "../vendor.js";
import { workspaceEvents } from "./topbar-state-context.jsx";

const CANVAS_NAVIGATION_TIMEOUT_MS = 4e3;

function hasPositiveBounds(element2) {
  if (!element2) return false;
  const bounds = element2.getBoundingClientRect();
  return bounds.width > 0 && bounds.height > 0;
}

export function WorkspaceCanvasFocusCoordinator({
  workspaceId: workspaceId2,
  isActive: isActive2,
  canvasVisible: canvasExpanded,
  browserOpen = false,
  onEnsureCanvasVisible,
  getCanvasPane,
}) {
  const canvasVisible = canvasExpanded && !browserOpen;
  const isActiveRef = reactExports.useRef(isActive2);
  const canvasVisibleRef = reactExports.useRef(canvasVisible);
  const onEnsureCanvasVisibleRef = reactExports.useRef(onEnsureCanvasVisible);
  const getCanvasPaneRef = reactExports.useRef(getCanvasPane);
  const pendingRef = reactExports.useRef(null);
  const latestTokenRef = reactExports.useRef(0);
  const runningTokenRef = reactExports.useRef(null);
  const probeFrameRef = reactExports.useRef(null);
  const settleFrameRef = reactExports.useRef(null);
  const timeoutRef = reactExports.useRef(null);
  const resizeObserverRef = reactExports.useRef(null);
  const observedPaneRef = reactExports.useRef(null);
  const recheckBoundsRef = reactExports.useRef(null);
  isActiveRef.current = isActive2;
  canvasVisibleRef.current = canvasVisible;
  onEnsureCanvasVisibleRef.current = onEnsureCanvasVisible;
  getCanvasPaneRef.current = getCanvasPane;
  const cancelWait = reactExports.useCallback(() => {
    if (probeFrameRef.current !== null) {
      cancelAnimationFrame(probeFrameRef.current);
      probeFrameRef.current = null;
    }
    if (settleFrameRef.current !== null) {
      cancelAnimationFrame(settleFrameRef.current);
      settleFrameRef.current = null;
    }
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    resizeObserverRef.current?.disconnect();
    resizeObserverRef.current = null;
    observedPaneRef.current = null;
    recheckBoundsRef.current = null;
    runningTokenRef.current = null;
  }, []);
  const beginPending = reactExports.useCallback(() => {
    const pending2 = pendingRef.current;
    if (!pending2 || !isActiveRef.current) return;
    if (!canvasVisibleRef.current && !pending2.ensureRequested) {
      pending2.ensureRequested = true;
      onEnsureCanvasVisibleRef.current();
    }
    if (runningTokenRef.current === pending2.token) {
      recheckBoundsRef.current?.();
      return;
    }
    cancelWait();
    runningTokenRef.current = pending2.token;
    const isCurrent = () => {
      const current2 = pendingRef.current;
      return Boolean(
        current2 &&
        current2.token === pending2.token &&
        latestTokenRef.current === pending2.token &&
        isActiveRef.current,
      );
    };
    const cancelThisWait = () => {
      if (runningTokenRef.current === pending2.token) cancelWait();
    };
    const deliver = () => {
      const current2 = pendingRef.current;
      if (!current2 || current2.token !== pending2.token || !isCurrent())
        return;
      pendingRef.current = null;
      cancelWait();
      if (current2.kind === "focus") {
        workspaceEvents.deliverCanvasFocus(
          current2.event.workspaceId,
          current2.event.nodeIds,
          {
            ...(current2.event.select !== void 0
              ? {
                  select: current2.event.select,
                }
              : {}),
            ...(current2.event.preferParentGroup !== void 0
              ? {
                  preferParentGroup: current2.event.preferParentGroup,
                }
              : {}),
          },
        );
      } else {
        workspaceEvents.deliverLocateCanvasFile(
          current2.event.workspaceId,
          current2.event.path ?? "",
          {
            ...(current2.event.nodeIds
              ? {
                  nodeIds: current2.event.nodeIds,
                }
              : {}),
            ...(current2.event.paths
              ? {
                  paths: current2.event.paths,
                }
              : {}),
            ...(current2.event.preferParentGroup
              ? {
                  preferParentGroup: true,
                }
              : {}),
          },
        );
      }
    };
    let settling = false;
    let stableFrames = 0;
    const cancelSettle = () => {
      if (settleFrameRef.current !== null) {
        cancelAnimationFrame(settleFrameRef.current);
        settleFrameRef.current = null;
      }
      settling = false;
      stableFrames = 0;
    };
    let checkBounds;
    const scheduleProbe = () => {
      if (probeFrameRef.current !== null) return;
      probeFrameRef.current = requestAnimationFrame(() => {
        probeFrameRef.current = null;
        checkBounds();
      });
    };
    const settle2 = () => {
      settleFrameRef.current = null;
      if (!isCurrent()) {
        cancelThisWait();
        return;
      }
      if (
        !canvasVisibleRef.current ||
        !hasPositiveBounds(getCanvasPaneRef.current())
      ) {
        cancelSettle();
        checkBounds();
        return;
      }
      stableFrames += 1;
      if (stableFrames >= 2) {
        deliver();
        return;
      }
      settleFrameRef.current = requestAnimationFrame(settle2);
    };
    checkBounds = () => {
      if (!isCurrent()) {
        cancelThisWait();
        return;
      }
      const pane = getCanvasPaneRef.current();
      if (pane !== observedPaneRef.current) {
        resizeObserverRef.current?.disconnect();
        observedPaneRef.current = pane;
        if (pane && resizeObserverRef.current)
          resizeObserverRef.current.observe(pane);
      }
      const boundsReady =
        canvasVisibleRef.current &&
        hasPositiveBounds(getCanvasPaneRef.current());
      if (!boundsReady) {
        cancelSettle();
        if (!resizeObserverRef.current || !pane) scheduleProbe();
        return;
      }
      if (probeFrameRef.current !== null) {
        cancelAnimationFrame(probeFrameRef.current);
        probeFrameRef.current = null;
      }
      if (settling) return;
      settling = true;
      stableFrames = 0;
      settleFrameRef.current = requestAnimationFrame(settle2);
    };
    if (typeof ResizeObserver !== "undefined") {
      resizeObserverRef.current = new ResizeObserver(checkBounds);
    }
    recheckBoundsRef.current = checkBounds;
    timeoutRef.current = window.setTimeout(() => {
      const current2 = pendingRef.current;
      if (current2?.token === pending2.token) pendingRef.current = null;
      cancelThisWait();
    }, CANVAS_NAVIGATION_TIMEOUT_MS);
    checkBounds();
  }, [cancelWait]);
  reactExports.useEffect(() => {
    if (!isActive2) {
      const pending22 = pendingRef.current;
      if (pending22 && !pending22.hasObservedVisibleCanvas)
        pending22.ensureRequested = false;
      cancelWait();
      return;
    }
    const pending2 = pendingRef.current;
    if (pending2) {
      if (canvasVisible) {
        pending2.hasObservedVisibleCanvas = true;
      } else if (pending2.hasObservedVisibleCanvas) {
        pendingRef.current = null;
        cancelWait();
        return;
      }
    }
    beginPending();
  }, [beginPending, cancelWait, canvasVisible, isActive2]);
  reactExports.useEffect(() => {
    const queueRequest = (request) => {
      cancelWait();
      const token2 = latestTokenRef.current + 1;
      latestTokenRef.current = token2;
      pendingRef.current =
        request.event.workspaceId === workspaceId2
          ? {
              ...request,
              token: token2,
              ensureRequested: false,
              hasObservedVisibleCanvas: canvasVisibleRef.current,
            }
          : null;
      beginPending();
    };
    const focusSubscription = workspaceEvents.onCanvasFocusRequest((event) => {
      queueRequest({
        kind: "focus",
        event,
      });
    });
    const locateSubscription = workspaceEvents.onLocateCanvasFileRequest(
      (event) => {
        queueRequest({
          kind: "locate",
          event,
        });
      },
    );
    return () => {
      focusSubscription.dispose();
      locateSubscription.dispose();
      latestTokenRef.current += 1;
      pendingRef.current = null;
      cancelWait();
    };
  }, [beginPending, cancelWait, workspaceId2]);
  return null;
}
