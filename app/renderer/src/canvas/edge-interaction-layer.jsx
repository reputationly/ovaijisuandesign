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
import {
  EdgeLabelRenderer,
  getInternalNodesBounds,
  reactExports,
  Scissors,
  useReactFlow,
  useStoreApi,
  useTranslation,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";

const BEZIER_HIT_SAMPLES = 16;

function cubicAt(t2, p0, p1, p22, p3) {
  const mt2 = 1 - t2;
  return (
    mt2 * mt2 * mt2 * p0 +
    3 * mt2 * mt2 * t2 * p1 +
    3 * mt2 * t2 * t2 * p22 +
    t2 * t2 * t2 * p3
  );
}

function distSqPointToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    const ex2 = px - ax;
    const ey2 = py - ay;
    return ex2 * ex2 + ey2 * ey2;
  }
  let t2 = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t2 = t2 < 0 ? 0 : t2 > 1 ? 1 : t2;
  const cx2 = ax + t2 * dx;
  const cy = ay + t2 * dy;
  const ex = px - cx2;
  const ey = py - cy;
  return ex * ex + ey * ey;
}

function distSqPointToBezier(px, py, cp2, steps) {
  let prevX = cp2.sx;
  let prevY = cp2.sy;
  let minSq = Number.POSITIVE_INFINITY;
  for (let i2 = 1; i2 <= steps; i2++) {
    const t2 = i2 / steps;
    const x2 = cubicAt(t2, cp2.sx, cp2.cp1x, cp2.cp2x, cp2.tx);
    const y4 = cubicAt(t2, cp2.sy, cp2.cp1y, cp2.cp2y, cp2.ty);
    const dSq = distSqPointToSegment(px, py, prevX, prevY, x2, y4);
    if (dSq < minSq) minSq = dSq;
    prevX = x2;
    prevY = y4;
  }
  return minSq;
}

function hitTestEdges(
  state2,
  flowX,
  flowY,
  radius,
  steps = BEZIER_HIT_SAMPLES,
) {
  let best = null;
  let bestSq = radius * radius;
  for (const edge of state2.edges) {
    if (
      !isEdgeVisible(edge, state2.nodeLookup, state2.onlySelectedNodes ?? false)
    )
      continue;
    const srcEntry = state2.nodeLookup.get(edge.source);
    const src = readNodeBox(srcEntry);
    const tgt = readNodeBox(state2.nodeLookup.get(edge.target));
    if (!src || !tgt) continue;
    const side = sourceHandleSide(srcEntry, src, tgt);
    const cp2 = controlPointsFor(pointsForSide(src, tgt, side), side);
    const minX = Math.min(cp2.sx, cp2.cp1x, cp2.cp2x, cp2.tx) - radius;
    const maxX = Math.max(cp2.sx, cp2.cp1x, cp2.cp2x, cp2.tx) + radius;
    const minY = Math.min(cp2.sy, cp2.cp1y, cp2.cp2y, cp2.ty) - radius;
    const maxY = Math.max(cp2.sy, cp2.cp1y, cp2.cp2y, cp2.ty) + radius;
    if (flowX < minX || flowX > maxX || flowY < minY || flowY > maxY) continue;
    const distSq = distSqPointToBezier(flowX, flowY, cp2, steps);
    if (distSq <= bestSq) {
      bestSq = distSq;
      best = edge.id;
    }
  }
  return best;
}

const EDGE_OCCLUDING_SELECTORS = [
  '[data-action-ui-id="canvas.node-handle-plus"]',
  ".react-flow__node",
  ".react-flow__node-toolbar",
];

const EDGE_OCCLUDING_SELECTOR = EDGE_OCCLUDING_SELECTORS.join(",");

function isEdgeOccludingElement(element2) {
  return element2?.closest(EDGE_OCCLUDING_SELECTOR) != null;
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
  active: active2 = true,
  onlySelectedNodes = false,
}) {
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
      return (
        flowX >= x22 &&
        flowX <= x22 + width &&
        flowY >= y22 &&
        flowY <= y22 + height
      );
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
      if (edge && isEdgeVisible(edge, state2.nodeLookup, onlySelectedNodes))
        return;
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
