// edge-interaction-layer.jsx
import { useTranslation, useReactFlow, reactExports, CanvasNodeType, useStoreApi, getInternalNodesBounds, EdgeLabelRenderer, Scissors } from "../vendor.js";
import { isEdgeVisible, setHoveredEdgeId, clearHoveredEdgeIdIfMatches } from "../m15/edges-canvas.jsx";
import { cropRectForAspectRatio$1 } from "../m03/base-backend.jsx";
import { DEFAULT_CROP, ASPECT_RATIOS, calcCropRect } from "../m03/calc-crop-rect.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  CLICK_DISTANCE_PX,
  CUT_BUTTON_HIDE_DELAY_MS,
  CUT_BUTTON_REVEAL_DELAY_MS,
  EDGE_HIT_RADIUS_PX,
  hitTestEdges,
  isEdgeOccludedAt,
} from "./node-alignment-guides.jsx";
const BTN_BG_IDLE = "var(--canvas-primary-btn-bg)";
const BTN_BG_HOVER = "var(--canvas-primary-btn-bg-hover)";
const BTN_ICON = "var(--canvas-primary-btn-icon)";
export function EdgeInteractionLayer({ active: active2 = true, onlySelectedNodes = false }) {
  const { t: t2 } = useTranslation();
  const storeApi = useStoreApi();
  const { deleteElements, screenToFlowPosition } = useReactFlow();
  const hoveredEdgeRef = reactExports.useRef(null);
  const cursorFlowRef = reactExports.useRef(null);
  const buttonWrapperRef = reactExports.useRef(null);
  const [buttonVisible, setButtonVisible] = reactExports.useState(false);
  const buttonVisibleRef = reactExports.useRef(false);
  buttonVisibleRef.current = buttonVisible;
  const revealTimerRef = reactExports.useRef(null);
  const hideTimerRef = reactExports.useRef(null);
  const applyButtonTransform = reactExports.useCallback(() => {
    const el = buttonWrapperRef.current;
    if (!el) return;
    const pos2 = cursorFlowRef.current;
    if (!pos2) return;
    const zoom22 = storeApi.getState().transform[2] || 1;
    const invZoom2 = 1 / zoom22;
    el.style.transform = `translate(-50%, -50%) translate(${pos2.x}px, ${pos2.y}px) scale(${invZoom2})`;
  }, [storeApi]);
  const scheduleReveal = reactExports.useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    if (buttonVisibleRef.current || revealTimerRef.current) return;
    revealTimerRef.current = setTimeout(() => {
      revealTimerRef.current = null;
      setButtonVisible(true);
    }, CUT_BUTTON_REVEAL_DELAY_MS);
  }, []);
  const scheduleHide = reactExports.useCallback(() => {
    if (revealTimerRef.current) {
      clearTimeout(revealTimerRef.current);
      revealTimerRef.current = null;
    }
    if (!buttonVisibleRef.current || hideTimerRef.current) return;
    hideTimerRef.current = setTimeout(() => {
      hideTimerRef.current = null;
      setButtonVisible(false);
    }, CUT_BUTTON_HIDE_DELAY_MS);
  }, []);
  reactExports.useEffect(() => {
    if (!active2) return;
    const flow2 = storeApi.getState().domNode;
    if (!flow2) return;
    let rafId2 = 0;
    let pending2 = null;
    let pointerDownAt = null;
    const hitAt = (clientX, clientY) => {
      let flowPt;
      try {
        flowPt = screenToFlowPosition({
          x: clientX,
          y: clientY,
        });
      } catch {
        return null;
      }
      cursorFlowRef.current = flowPt;
      const state2 = storeApi.getState();
      const zoom22 = state2.transform[2] || 1;
      const radius = EDGE_HIT_RADIUS_PX / zoom22;
      return hitTestEdges(
        {
          edges: state2.edges,
          nodeLookup: state2.nodeLookup,
          onlySelectedNodes,
        },
        flowPt.x,
        flowPt.y,
        radius,
      );
    };
    const isEdgeOccluded = (clientX, clientY) => {
      return isEdgeOccludedAt(document, clientX, clientY);
    };
    const isInsideSelectionBox = (flowX, flowY) => {
      const state2 = storeApi.getState();
      if (!state2.nodesSelectionActive) return false;
      const {
        x: x22,
        y: y22,
        width,
        height,
      } = getInternalNodesBounds(state2.nodeLookup, {
        filter: (node2) => !!node2.selected && !node2.hidden,
      });
      if (width <= 0 || height <= 0) return false;
      return flowX >= x22 && flowX <= x22 + width && flowY >= y22 && flowY <= y22 + height;
    };
    const runHitTest = () => {
      rafId2 = 0;
      const evt = pending2;
      pending2 = null;
      if (!evt) return;
      const boxSelecting = storeApi.getState().userSelectionActive;
      let geomHit = boxSelecting ? null : hitAt(evt.clientX, evt.clientY);
      if (geomHit) {
        const cursor = cursorFlowRef.current;
        if (cursor && isInsideSelectionBox(cursor.x, cursor.y)) geomHit = null;
      }
      const hitId = geomHit && !isEdgeOccluded(evt.clientX, evt.clientY) ? geomHit : null;
      const prev = hoveredEdgeRef.current;
      if (hitId !== prev) {
        hoveredEdgeRef.current = hitId;
        if (hitId) setHoveredEdgeId(hitId);
        else if (prev) clearHoveredEdgeIdIfMatches(prev);
      }
      if (hitId) {
        scheduleReveal();
        applyButtonTransform();
      } else {
        scheduleHide();
      }
    };
    const onPointerMove = (e2) => {
      pending2 = {
        clientX: e2.clientX,
        clientY: e2.clientY,
      };
      if (rafId2 !== 0) return;
      rafId2 = requestAnimationFrame(runHitTest);
    };
    const onPointerLeave = () => {
      pending2 = null;
      const prev = hoveredEdgeRef.current;
      if (prev) {
        hoveredEdgeRef.current = null;
        clearHoveredEdgeIdIfMatches(prev);
      }
      scheduleHide();
    };
    const onPointerDown2 = (e2) => {
      pointerDownAt = {
        x: e2.clientX,
        y: e2.clientY,
      };
    };
    const onClickCapture = (e2) => {
      const wrapper = buttonWrapperRef.current;
      if (wrapper && e2.target instanceof Node && wrapper.contains(e2.target)) {
        pointerDownAt = null;
        return;
      }
      const down = pointerDownAt;
      pointerDownAt = null;
      if (down) {
        const dx = e2.clientX - down.x;
        const dy = e2.clientY - down.y;
        if (dx * dx + dy * dy > CLICK_DISTANCE_PX * CLICK_DISTANCE_PX) return;
      }
      const hitId = hitAt(e2.clientX, e2.clientY);
      if (!hitId) return;
      const cursor = cursorFlowRef.current;
      if (cursor && isInsideSelectionBox(cursor.x, cursor.y)) return;
      if (isEdgeOccluded(e2.clientX, e2.clientY)) return;
      e2.stopPropagation();
      storeApi.getState().addSelectedEdges([hitId]);
    };
    flow2.addEventListener("pointermove", onPointerMove);
    flow2.addEventListener("pointerleave", onPointerLeave);
    flow2.addEventListener("pointerdown", onPointerDown2);
    flow2.addEventListener("click", onClickCapture, true);
    const unsubVisibility = storeApi.subscribe((state2) => {
      const id2 = hoveredEdgeRef.current;
      if (!id2) return;
      const edge = state2.edges.find((candidate) => candidate.id === id2);
      if (edge && isEdgeVisible(edge, state2.nodeLookup, onlySelectedNodes)) return;
      if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      revealTimerRef.current = null;
      hideTimerRef.current = null;
      hoveredEdgeRef.current = null;
      clearHoveredEdgeIdIfMatches(id2);
      setButtonVisible(false);
    });
    return () => {
      unsubVisibility();
      if (rafId2 !== 0) cancelAnimationFrame(rafId2);
      flow2.removeEventListener("pointermove", onPointerMove);
      flow2.removeEventListener("pointerleave", onPointerLeave);
      flow2.removeEventListener("pointerdown", onPointerDown2);
      flow2.removeEventListener("click", onClickCapture, true);
      if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      revealTimerRef.current = null;
      hideTimerRef.current = null;
      const prev = hoveredEdgeRef.current;
      if (prev) clearHoveredEdgeIdIfMatches(prev);
      hoveredEdgeRef.current = null;
      setButtonVisible(false);
    };
  }, [
    active2,
    onlySelectedNodes,
    storeApi,
    screenToFlowPosition,
    scheduleReveal,
    scheduleHide,
    applyButtonTransform,
  ]);
  reactExports.useEffect(() => {
    if (!active2 || !buttonVisible) return;
    applyButtonTransform();
    const unsub = storeApi.subscribe(applyButtonTransform);
    return unsub;
  }, [active2, buttonVisible, storeApi, applyButtonTransform]);
  const handleCut = reactExports.useCallback(
    (event) => {
      event.stopPropagation();
      const id2 = hoveredEdgeRef.current;
      if (!id2) return;
      deleteElements({
        edges: [
          {
            id: id2,
          },
        ],
      });
      setButtonVisible(false);
      hoveredEdgeRef.current = null;
      clearHoveredEdgeIdIfMatches(id2);
    },
    [deleteElements],
  );
  const onButtonAreaEnter = reactExports.useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);
  const onButtonAreaLeave = reactExports.useCallback(() => {
    scheduleHide();
  }, [scheduleHide]);
  if (!active2 || !buttonVisible) return null;
  const pos = cursorFlowRef.current;
  const zoom2 = storeApi.getState().transform[2] || 1;
  const invZoom = 1 / zoom2;
  const x2 = pos?.x ?? 0;
  const y4 = pos?.y ?? 0;
  return (
    <EdgeLabelRenderer>
      <div
        ref={buttonWrapperRef}
        className="nodrag nopan absolute"
        style={{
          transform: `translate(-50%, -50%) translate(${x2}px, ${y4}px) scale(${invZoom})`,
          pointerEvents: "all",
          zIndex: 1001,
          padding: 4,
        }}
        onMouseEnter={onButtonAreaEnter}
        onMouseLeave={onButtonAreaLeave}
      >
        <button
          type="button"
          onClick={handleCut}
          onMouseEnter={(e2) => {
            e2.currentTarget.style.background = BTN_BG_HOVER;
          }}
          onMouseLeave={(e2) => {
            e2.currentTarget.style.background = BTN_BG_IDLE;
          }}
          aria-label={t2("canvas.edge.cut", {
            defaultValue: "剪断连线",
          })}
          title={t2("canvas.edge.cut", {
            defaultValue: "剪断连线",
          })}
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition-all duration-200 animate-[toolbar-fade-in_0.12s_ease-out]"
          style={{
            background: BTN_BG_IDLE,
            color: BTN_ICON,
            boxShadow: "var(--canvas-shadow-dropdown)",
            border: "none",
          }}
        >
          <Scissors
            size={18}
            strokeWidth={2}
            style={{
              transform: "rotate(-45deg)",
            }}
          />
        </button>
      </div>
    </EdgeLabelRenderer>
  );
}
const RENDERABLE_CANVAS_NODE_TYPES = new Set([
  CanvasNodeType.Image,
  CanvasNodeType.Video,
  CanvasNodeType.Audio,
  CanvasNodeType.Text,
  CanvasNodeType.File,
  CanvasNodeType.Table,
]);
function hasRenderableCanvasContent(nodes) {
  return nodes.some(
    (node2) => node2.type !== void 0 && RENDERABLE_CANVAS_NODE_TYPES.has(node2.type),
  );
}
function notifyRenderableContentChange(state2, nextValue, callback) {
  if (state2.lastValue === nextValue) return false;
  state2.lastValue = nextValue;
  callback?.(nextValue);
  return true;
}
export function useRenderableContentChange(nodes, callback) {
  const callbackRef = reactExports.useRef(callback);
  const notificationStateRef = reactExports.useRef({});
  const hasRenderableContent = hasRenderableCanvasContent(nodes);
  reactExports.useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);
  reactExports.useEffect(() => {
    notifyRenderableContentChange(
      notificationStateRef.current,
      hasRenderableContent,
      callbackRef.current,
    );
  }, [hasRenderableContent]);
}
export function useImageCrop$1(containerWidth, containerHeight) {
  const [cropRect, setCropRect] = reactExports.useState(DEFAULT_CROP);
  const [aspectRatio, setAspectRatioState] = reactExports.useState("free");
  const [isDragging, setIsDragging] = reactExports.useState(false);
  const [activeHandle, setActiveHandle] = reactExports.useState(null);
  const dragRef = reactExports.useRef(null);
  const rafRef = reactExports.useRef(null);
  const latestRef = reactExports.useRef({
    containerWidth,
    containerHeight,
    aspectRatio,
  });
  latestRef.current = {
    containerWidth,
    containerHeight,
    aspectRatio,
  };
  const handleMove = reactExports.useCallback((e2) => {
    const drag2 = dragRef.current;
    if (!drag2) return;
    const { containerWidth: cw, containerHeight: ch, aspectRatio: ar } = latestRef.current;
    if (!cw || !ch) return;
    const deltaX = (e2.clientX - drag2.startX) / cw;
    const deltaY = (e2.clientY - drag2.startY) / ch;
    const numericRatio = ASPECT_RATIOS[ar];
    const next2 = calcCropRect({
      initialRect: drag2.initialRect,
      deltaX,
      deltaY,
      handle: drag2.handle,
      aspectRatio: numericRatio,
      containerWidth: cw,
      containerHeight: ch,
    });
    setCropRect(next2);
  }, []);
  reactExports.useEffect(() => {
    if (!isDragging) return;
    let pendingEvent = null;
    const onMove = (e2) => {
      if (e2.cancelable) e2.preventDefault();
      pendingEvent = e2;
      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null;
          if (pendingEvent) {
            handleMove(pendingEvent);
            pendingEvent = null;
          }
        });
      }
    };
    const onUp = () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (pendingEvent) {
        handleMove(pendingEvent);
        pendingEvent = null;
      }
      setIsDragging(false);
      setActiveHandle(null);
      dragRef.current = null;
    };
    window.addEventListener("pointermove", onMove, {
      passive: false,
    });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [isDragging, handleMove]);
  const handlePointerDown = reactExports.useCallback(
    (e2, handle2 = null) => {
      if (!e2.isPrimary) return;
      e2.stopPropagation();
      e2.preventDefault();
      dragRef.current = {
        startX: e2.clientX,
        startY: e2.clientY,
        initialRect: {
          ...cropRect,
        },
        handle: handle2,
      };
      setIsDragging(true);
      setActiveHandle(handle2);
    },
    [cropRect],
  );
  const setAspectRatio = reactExports.useCallback((preset2) => {
    setAspectRatioState(preset2);
    const ratio = ASPECT_RATIOS[preset2];
    const { containerWidth: cw, containerHeight: ch } = latestRef.current;
    setCropRect(cropRectForAspectRatio$1(ratio, cw, ch));
  }, []);
  const reset2 = reactExports.useCallback(() => {
    setAspectRatioState("free");
    setCropRect(DEFAULT_CROP);
  }, []);
  return {
    cropRect,
    aspectRatio,
    isDragging,
    activeHandle,
    handlePointerDown,
    setAspectRatio,
    setCropRect,
    reset: reset2,
  };
}
export const EDGE_HANDLE_THRESHOLD$1 = 80;
export const ASPECT_OPTIONS$1 = [
  {
    label: "free",
    value: "free",
  },
  {
    label: "1:1",
    value: "1:1",
  },
  {
    label: "4:3",
    value: "4:3",
  },
  {
    label: "3:4",
    value: "3:4",
  },
  {
    label: "16:9",
    value: "16:9",
  },
  {
    label: "9:16",
    value: "9:16",
  },
];
