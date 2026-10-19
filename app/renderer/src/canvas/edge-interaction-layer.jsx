// edge-interaction-layer.jsx
import {
  clearHoveredEdgeIdIfMatches,
  controlPointsFor,
  isEdgeVisible,
  pointsForSide,
  readNodeBox,
  setHoveredEdgeId,
  sourceHandleSide,
} from "./control-points-for.js";
import reactExports from "react";
import { useTranslation } from "react-i18next";
import { Scissors } from "../media-editing/lucide-icon-wraps.js";
import { EdgeLabelRenderer, useReactFlow, useStoreApi } from "../vendor-fork/xyflow/react/index.js";
import { getInternalNodesBounds } from "../vendor-fork/xyflow/system/index.js";
import { __jsx } from "../shared/jsx-runtime.js";

import { isReadOnlyDerivedEdge } from "./is-read-only-derived-edge.jsx";
const BEZIER_HIT_SAMPLES = 16;

function cubicAt(progress, startValue, firstControlValue, secondControlValue, endValue) {
  const mt = 1 - progress;
  return (
    mt * mt * mt * startValue +
    3 * mt * mt * progress * firstControlValue +
    3 * mt * progress * progress * secondControlValue +
    progress * progress * progress * endValue
  );
}

function distSqPointToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    const ex = px - ax;
    const ey = py - ay;
    return ex * ex + ey * ey;
  }
  let segmentRatio = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  segmentRatio = segmentRatio < 0 ? 0 : segmentRatio > 1 ? 1 : segmentRatio;
  const cx = ax + segmentRatio * dx;
  const cy = ay + segmentRatio * dy;
  const ex = px - cx;
  const ey = py - cy;
  return ex * ex + ey * ey;
}

function distSqPointToBezier(px, py, cp, steps) {
  let prevX = cp.sx;
  let prevY = cp.sy;
  let minSq = Number.POSITIVE_INFINITY;
  for (let index = 1; index <= steps; index++) {
    const progress = index / steps;
    const sampleX = cubicAt(progress, cp.sx, cp.cp1x, cp.cp2x, cp.tx);
    const sampleY = cubicAt(progress, cp.sy, cp.cp1y, cp.cp2y, cp.ty);
    const distanceSquared = distSqPointToSegment(px, py, prevX, prevY, sampleX, sampleY);
    if (distanceSquared < minSq) minSq = distanceSquared;
    prevX = sampleX;
    prevY = sampleY;
  }
  return minSq;
}

function hitTestEdges(state, flowX, flowY, radius, steps = BEZIER_HIT_SAMPLES) {
  let best = null;
  let bestSq = radius * radius;
  for (const edge of state.edges) {
    if (isReadOnlyDerivedEdge(edge)) continue;
    if (!isEdgeVisible(edge, state.nodeLookup, state.onlySelectedNodes ?? false)) continue;
    const srcEntry = state.nodeLookup.get(edge.source);
    const src = readNodeBox(srcEntry);
    const tgt = readNodeBox(state.nodeLookup.get(edge.target));
    if (!src || !tgt) continue;
    const side = sourceHandleSide(srcEntry, src, tgt);
    const cp = controlPointsFor(pointsForSide(src, tgt, side), side);
    const minX = Math.min(cp.sx, cp.cp1x, cp.cp2x, cp.tx) - radius;
    const maxX = Math.max(cp.sx, cp.cp1x, cp.cp2x, cp.tx) + radius;
    const minY = Math.min(cp.sy, cp.cp1y, cp.cp2y, cp.ty) - radius;
    const maxY = Math.max(cp.sy, cp.cp1y, cp.cp2y, cp.ty) + radius;
    if (flowX < minX || flowX > maxX || flowY < minY || flowY > maxY) continue;
    const distSq = distSqPointToBezier(flowX, flowY, cp, steps);
    if (distSq <= bestSq) {
      bestSq = distSq;
      best = edge.id;
    }
  }
  return best;
}

const EDGE_OCCLUDING_SELECTORS = [
  '[data-action-ui-id="canvas.node-handle-plus"]',
  // Subject add tiles live in a viewport portal above edges, outside node DOM.
  '[data-action-ui-id="canvas.subject-add-layer"]',
  ".react-flow__node",
  ".react-flow__node-toolbar",
];

const EDGE_OCCLUDING_SELECTOR = EDGE_OCCLUDING_SELECTORS.join(",");

function isEdgeOccludingElement(element) {
  if (element && element.closest("[data-canvas-edge-backdrop]") === element) return false;
  return element?.closest(EDGE_OCCLUDING_SELECTOR) != null;
}

function isEdgeOccludedAt(source, clientX, clientY) {
  return isEdgeOccludingElement(source.elementFromPoint(clientX, clientY));
}

const CUT_BUTTON_REVEAL_DELAY_MS = 1e3;

const CUT_BUTTON_HIDE_DELAY_MS = 150;

const EDGE_HIT_RADIUS_PX = 18;

const CLICK_DISTANCE_PX = 3;

const BTN_BG_IDLE = "var(--canvas-primary-btn-bg)";

const BTN_BG_HOVER = "var(--canvas-primary-btn-bg-hover)";

const BTN_ICON = "var(--canvas-primary-btn-icon)";

export function EdgeInteractionLayer({
  active = true,
  onlySelectedNodes = false,
}) {
  const { t: translate } = useTranslation();
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
    const pos = cursorFlowRef.current;
    if (!pos) return;
    const zoom = storeApi.getState().transform[2] || 1;
    const invZoom = 1 / zoom;
    el.style.transform = `translate(-50%, -50%) translate(${pos.x}px, ${pos.y}px) scale(${invZoom})`;
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
    if (!active) return;
    const flow = storeApi.getState().domNode;
    if (!flow) return;
    let rafId = 0;
    let pending = null;
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
      const state = storeApi.getState();
      const zoom = state.transform[2] || 1;
      const radius = EDGE_HIT_RADIUS_PX / zoom;
      return hitTestEdges(
        {
          edges: state.edges,
          nodeLookup: state.nodeLookup,
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
      const state = storeApi.getState();
      if (!state.nodesSelectionActive) return false;
      const {
        x: selectionLeft,
        y: selectionTop,
        width,
        height,
      } = getInternalNodesBounds(state.nodeLookup, {
        filter: (node) => !!node.selected && !node.hidden,
      });
      if (width <= 0 || height <= 0) return false;
      return (
        flowX >= selectionLeft &&
        flowX <= selectionLeft + width &&
        flowY >= selectionTop &&
        flowY <= selectionTop + height
      );
    };
    const runHitTest = () => {
      rafId = 0;
      const evt = pending;
      pending = null;
      if (!evt) return;
      const boxSelecting = storeApi.getState().userSelectionActive;
      let geomHit = boxSelecting ? null : hitAt(evt.clientX, evt.clientY);
      if (geomHit) {
        const cursor = cursorFlowRef.current;
        if (cursor && isInsideSelectionBox(cursor.x, cursor.y)) geomHit = null;
      }
      const hitId =
        geomHit && !isEdgeOccluded(evt.clientX, evt.clientY) ? geomHit : null;
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
    const onPointerMove = (pointerEvent) => {
      pending = {
        clientX: pointerEvent.clientX,
        clientY: pointerEvent.clientY,
      };
      if (rafId !== 0) return;
      rafId = requestAnimationFrame(runHitTest);
    };
    const onPointerLeave = () => {
      pending = null;
      const prev = hoveredEdgeRef.current;
      if (prev) {
        hoveredEdgeRef.current = null;
        clearHoveredEdgeIdIfMatches(prev);
      }
      scheduleHide();
    };
    const onPointerDown = (pointerEvent) => {
      pointerDownAt = {
        x: pointerEvent.clientX,
        y: pointerEvent.clientY,
      };
    };
    const onClickCapture = (clickEvent) => {
      const wrapper = buttonWrapperRef.current;
      if (wrapper && clickEvent.target instanceof Node && wrapper.contains(clickEvent.target)) {
        pointerDownAt = null;
        return;
      }
      const down = pointerDownAt;
      pointerDownAt = null;
      if (down) {
        const dx = clickEvent.clientX - down.x;
        const dy = clickEvent.clientY - down.y;
        if (dx * dx + dy * dy > CLICK_DISTANCE_PX * CLICK_DISTANCE_PX) return;
      }
      const hitId = hitAt(clickEvent.clientX, clickEvent.clientY);
      if (!hitId) return;
      const cursor = cursorFlowRef.current;
      if (cursor && isInsideSelectionBox(cursor.x, cursor.y)) return;
      if (isEdgeOccluded(clickEvent.clientX, clickEvent.clientY)) return;
      clickEvent.stopPropagation();
      storeApi.getState().addSelectedEdges([hitId]);
    };
    flow.addEventListener("pointermove", onPointerMove);
    flow.addEventListener("pointerleave", onPointerLeave);
    flow.addEventListener("pointerdown", onPointerDown);
    flow.addEventListener("click", onClickCapture, true);
    const unsubVisibility = storeApi.subscribe((state) => {
      const id = hoveredEdgeRef.current;
      if (!id) return;
      const edge = state.edges.find((candidate) => candidate.id === id);
      if (edge && isEdgeVisible(edge, state.nodeLookup, onlySelectedNodes))
        return;
      if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      revealTimerRef.current = null;
      hideTimerRef.current = null;
      hoveredEdgeRef.current = null;
      clearHoveredEdgeIdIfMatches(id);
      setButtonVisible(false);
    });
    return () => {
      unsubVisibility();
      if (rafId !== 0) cancelAnimationFrame(rafId);
      flow.removeEventListener("pointermove", onPointerMove);
      flow.removeEventListener("pointerleave", onPointerLeave);
      flow.removeEventListener("pointerdown", onPointerDown);
      flow.removeEventListener("click", onClickCapture, true);
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
    active,
    onlySelectedNodes,
    storeApi,
    screenToFlowPosition,
    scheduleReveal,
    scheduleHide,
    applyButtonTransform,
  ]);
  reactExports.useEffect(() => {
    if (!active || !buttonVisible) return;
    applyButtonTransform();
    const unsub = storeApi.subscribe(applyButtonTransform);
    return unsub;
  }, [active, buttonVisible, storeApi, applyButtonTransform]);
  const handleCut = reactExports.useCallback(
    (event) => {
      event.stopPropagation();
      const id = hoveredEdgeRef.current;
      if (!id) return;
      deleteElements({
        edges: [
          {
            id,
          },
        ],
      });
      setButtonVisible(false);
      hoveredEdgeRef.current = null;
      clearHoveredEdgeIdIfMatches(id);
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
  if (!active || !buttonVisible) return null;
  const pos = cursorFlowRef.current;
  const viewportZoom = storeApi.getState().transform[2] || 1;
  const invZoom = 1 / viewportZoom;
  const cursorFlowX = pos?.x ?? 0;
  const cursorFlowY = pos?.y ?? 0;
  return (
    <EdgeLabelRenderer>
      <div
        ref={buttonWrapperRef}
        className="nodrag nopan absolute"
        style={{
          transform: `translate(-50%, -50%) translate(${cursorFlowX}px, ${cursorFlowY}px) scale(${invZoom})`,
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
          onMouseEnter={(mouseEvent) => {
            mouseEvent.currentTarget.style.background = BTN_BG_HOVER;
          }}
          onMouseLeave={(mouseEvent) => {
            mouseEvent.currentTarget.style.background = BTN_BG_IDLE;
          }}
          aria-label={translate("canvas.edge.cut", {
            defaultValue: "剪断连线",
          })}
          title={translate("canvas.edge.cut", {
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
