// edges-canvas.jsx
import {
  controlPointsFor,
  hoveredId,
  isEdgeVisible,
  pointsForSide,
  readNodeBox,
  sourceHandleSide,
  subscribers,
} from "./control-points-for.js";
import {
  jsxRuntimeExports,
  reactExports,
  useNodesInitialized,
  useStoreApi,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";

function tracePath(target, p3, side = "right") {
  const cp2 = controlPointsFor(p3, side);
  target.moveTo(cp2.sx, cp2.sy);
  target.bezierCurveTo(cp2.cp1x, cp2.cp1y, cp2.cp2x, cp2.cp2y, cp2.tx, cp2.ty);
}

function subscribe$2(cb) {
  subscribers.add(cb);
  return () => {
    subscribers.delete(cb);
  };
}

function getSnapshot$1() {
  return hoveredId;
}

function useHoveredEdgeId() {
  return reactExports.useSyncExternalStore(
    subscribe$2,
    getSnapshot$1,
    getSnapshot$1,
  );
}

const EDGE_FLOW_PULSE_LENGTH_PX = 36;

const EDGE_FLOW_GAP_LENGTH_PX = 120;

const EDGE_FLOW_SPEED_PX_PER_SECOND = 104;

const EDGE_FLOW_SEGMENT_COUNT = 6;

const EDGE_FLOW_TAIL_WIDTH = 1.2;

const EDGE_FLOW_HEAD_WIDTH = 2.6;

const EDGE_FLOW_HALO_EXTRA_WIDTH = 1.15;

const EDGE_FLOW_MIN_ZOOM = 0.01;

const EDGE_FLOW_TAIL_OPACITY = 0.46;

const EDGE_FLOW_HEAD_OPACITY = 0.96;

const EDGE_FLOW_BREATH_MIN = 0.9;

const EDGE_FLOW_BREATH_RANGE = 0.1;

const EDGE_FLOW_BREATH_PERIOD_MS = 1600;

function safeZoom(zoom2) {
  return Number.isFinite(zoom2) && zoom2 > 0
    ? Math.max(zoom2, EDGE_FLOW_MIN_ZOOM)
    : 1;
}

function getEdgeFlowFrame(timestampMs, zoom2) {
  const resolvedZoom = safeZoom(zoom2);
  const patternLengthPx = EDGE_FLOW_PULSE_LENGTH_PX + EDGE_FLOW_GAP_LENGTH_PX;
  const segmentLengthPx = EDGE_FLOW_PULSE_LENGTH_PX / EDGE_FLOW_SEGMENT_COUNT;
  const elapsedMs2 = Number.isFinite(timestampMs)
    ? Math.max(0, timestampMs)
    : 0;
  const distancePx =
    ((elapsedMs2 / 1e3) * EDGE_FLOW_SPEED_PX_PER_SECOND) % patternLengthPx;
  const breathPhase =
    (elapsedMs2 % EDGE_FLOW_BREATH_PERIOD_MS) / EDGE_FLOW_BREATH_PERIOD_MS;
  const breath =
    EDGE_FLOW_BREATH_MIN +
    ((Math.sin(breathPhase * Math.PI * 2 - Math.PI / 2) + 1) / 2) *
      EDGE_FLOW_BREATH_RANGE;
  return {
    segments: Array.from(
      {
        length: EDGE_FLOW_SEGMENT_COUNT,
      },
      (_2, index2) => {
        const progress = index2 / (EDGE_FLOW_SEGMENT_COUNT - 1);
        const taperedProgress = progress ** 1.35;
        const coreWidth =
          EDGE_FLOW_TAIL_WIDTH +
          (EDGE_FLOW_HEAD_WIDTH - EDGE_FLOW_TAIL_WIDTH) * taperedProgress;
        const opacity =
          (EDGE_FLOW_TAIL_OPACITY +
            (EDGE_FLOW_HEAD_OPACITY - EDGE_FLOW_TAIL_OPACITY) *
              taperedProgress) *
          breath;
        return {
          dashPattern: [
            segmentLengthPx / resolvedZoom,
            (patternLengthPx - segmentLengthPx) / resolvedZoom,
          ],
          dashOffset: -(distancePx + index2 * segmentLengthPx) / resolvedZoom,
          haloWidth: coreWidth + EDGE_FLOW_HALO_EXTRA_WIDTH,
          coreWidth,
          opacity,
        };
      },
    ),
  };
}

function resolveColors(host) {
  const styles = getComputedStyle(host);
  const selectedColor =
    styles.getPropertyValue("--canvas-edge-selected").trim() || "#2563eb";
  const flowColor =
    styles.getPropertyValue("--canvas-edge-flow").trim() || selectedColor;
  return {
    defaultColor: styles.getPropertyValue("--canvas-edge").trim() || "#9ca3af",
    hoverColor:
      styles.getPropertyValue("--canvas-edge-hover").trim() || "#6b7280",
    selectedColor,
    flowColor,
    flowGlowColor:
      styles.getPropertyValue("--canvas-edge-flow-glow").trim() || flowColor,
  };
}

export function EdgesCanvas({
  active: active2 = true,
  onlySelectedNodes = false,
}) {
  const storeApi = useStoreApi();
  const hoveredId2 = useHoveredEdgeId();
  const canvasRef = reactExports.useRef(null);
  const flowCanvasRef = reactExports.useRef(null);
  const nodesInitialized = useNodesInitialized();
  const initLatchRef = reactExports.useRef(false);
  if (nodesInitialized) initLatchRef.current = true;
  const hoveredIdRef = reactExports.useRef(null);
  hoveredIdRef.current = hoveredId2;
  const scheduleRef = reactExports.useRef(null);
  const flowScheduleRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (!active2) {
      scheduleRef.current = null;
      const canvas2 = canvasRef.current;
      const ctx = canvas2?.getContext("2d");
      if (canvas2 && ctx) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas2.width, canvas2.height);
      }
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const flow2 = canvas.closest(".react-flow");
    if (!flow2) return;
    let rafId2 = 0;
    let cancelled = false;
    let lastWidth = 0;
    let lastHeight = 0;
    let lastDpr = 0;
    const paint = () => {
      rafId2 = 0;
      if (cancelled) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const rect = flow2.getBoundingClientRect();
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      const cssW = Math.max(1, Math.round(rect.width));
      const cssH = Math.max(1, Math.round(rect.height));
      if (cssW !== lastWidth || cssH !== lastHeight || dpr !== lastDpr) {
        canvas.width = cssW * dpr;
        canvas.height = cssH * dpr;
        canvas.style.width = `${cssW}px`;
        canvas.style.height = `${cssH}px`;
        lastWidth = cssW;
        lastHeight = cssH;
        lastDpr = dpr;
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (!initLatchRef.current) return;
      const state2 = storeApi.getState();
      const [tx, ty, zoom2] = state2.transform;
      if (!zoom2 || zoom2 <= 0) return;
      const colors = resolveColors(flow2);
      const hovered = hoveredIdRef.current;
      ctx.setTransform(dpr * zoom2, 0, 0, dpr * zoom2, dpr * tx, dpr * ty);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      const defaultPath = new Path2D();
      const hoveredPath = new Path2D();
      const selectedPath = new Path2D();
      let hasDefault = false;
      let hasHovered = false;
      let hasSelected = false;
      for (const edge of state2.edges) {
        if (!isEdgeVisible(edge, state2.nodeLookup, onlySelectedNodes))
          continue;
        const srcEntry = state2.nodeLookup.get(edge.source);
        const src = readNodeBox(srcEntry);
        const tgt = readNodeBox(state2.nodeLookup.get(edge.target));
        if (!src || !tgt) continue;
        const side = sourceHandleSide(srcEntry, src, tgt);
        const points = pointsForSide(src, tgt, side);
        const isSelected = edge.selected === true;
        const isHovered = !isSelected && edge.id === hovered;
        const target = isSelected
          ? selectedPath
          : isHovered
            ? hoveredPath
            : defaultPath;
        tracePath(target, points, side);
        if (isSelected) hasSelected = true;
        else if (isHovered) hasHovered = true;
        else hasDefault = true;
      }
      if (hasDefault) {
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = colors.defaultColor;
        ctx.stroke(defaultPath);
        ctx.globalAlpha = 1;
      }
      if (hasHovered) {
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = colors.hoverColor;
        ctx.stroke(hoveredPath);
      }
      if (hasSelected) {
        ctx.lineWidth = 2;
        ctx.strokeStyle = colors.selectedColor;
        ctx.stroke(selectedPath);
      }
    };
    const schedule2 = () => {
      if (rafId2 !== 0) return;
      rafId2 = requestAnimationFrame(paint);
    };
    scheduleRef.current = schedule2;
    schedule2();
    const unsubStore = storeApi.subscribe(schedule2);
    const resizeObserver = new ResizeObserver(schedule2);
    resizeObserver.observe(flow2);
    const onWindowResize = () => schedule2();
    window.addEventListener("resize", onWindowResize);
    const themeObserver = new MutationObserver(schedule2);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style"],
    });
    return () => {
      cancelled = true;
      if (rafId2 !== 0) cancelAnimationFrame(rafId2);
      unsubStore();
      resizeObserver.disconnect();
      themeObserver.disconnect();
      window.removeEventListener("resize", onWindowResize);
      scheduleRef.current = null;
    };
  }, [active2, onlySelectedNodes, storeApi]);
  reactExports.useEffect(() => {
    if (!active2) {
      flowScheduleRef.current = null;
      const canvas2 = flowCanvasRef.current;
      const ctx = canvas2?.getContext("2d");
      if (canvas2 && ctx) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas2.width, canvas2.height);
      }
      return;
    }
    const canvas = flowCanvasRef.current;
    if (!canvas) return;
    const flow2 = canvas.closest(".react-flow");
    if (!flow2) return;
    const reducedMotionQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    const FLOW_FRAME_MIN_INTERVAL_MS = 15;
    let windowFocused = document.hasFocus();
    let lastFramePaintMs = 0;
    let rafId2 = 0;
    let cancelled = false;
    let needsResize = true;
    let needsPalette = true;
    let cssWidth = 1;
    let cssHeight = 1;
    let dpr = Math.max(1, window.devicePixelRatio || 1);
    let colors = resolveColors(flow2);
    const syncCanvasSize = () => {
      const rect = flow2.getBoundingClientRect();
      cssWidth = Math.max(1, Math.round(rect.width));
      cssHeight = Math.max(1, Math.round(rect.height));
      dpr = Math.max(1, window.devicePixelRatio || 1);
      const backingWidth = cssWidth * dpr;
      const backingHeight = cssHeight * dpr;
      if (canvas.width !== backingWidth || canvas.height !== backingHeight) {
        canvas.width = backingWidth;
        canvas.height = backingHeight;
        canvas.style.width = `${cssWidth}px`;
        canvas.style.height = `${cssHeight}px`;
      }
      needsResize = false;
    };
    const paint = (timestampMs) => {
      rafId2 = 0;
      if (cancelled) return;
      if (timestampMs - lastFramePaintMs < FLOW_FRAME_MIN_INTERVAL_MS) {
        rafId2 = requestAnimationFrame(paint);
        return;
      }
      lastFramePaintMs = timestampMs;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      if (needsResize) syncCanvasSize();
      if (needsPalette) {
        colors = resolveColors(flow2);
        needsPalette = false;
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (!initLatchRef.current) return;
      const state2 = storeApi.getState();
      const [tx, ty, zoom2] = state2.transform;
      if (!zoom2 || zoom2 <= 0) return;
      const selectedPath = new Path2D();
      let hasSelected = false;
      for (const edge of state2.edges) {
        if (
          edge.selected !== true ||
          !isEdgeVisible(edge, state2.nodeLookup, onlySelectedNodes)
        )
          continue;
        const srcEntry = state2.nodeLookup.get(edge.source);
        const src = readNodeBox(srcEntry);
        const tgt = readNodeBox(state2.nodeLookup.get(edge.target));
        if (!src || !tgt) continue;
        const side = sourceHandleSide(srcEntry, src, tgt);
        tracePath(selectedPath, pointsForSide(src, tgt, side), side);
        hasSelected = true;
      }
      if (!hasSelected) return;
      ctx.setTransform(dpr * zoom2, 0, 0, dpr * zoom2, dpr * tx, dpr * ty);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      if (reducedMotionQuery.matches) {
        ctx.setLineDash([]);
        ctx.globalAlpha = 0.42;
        ctx.lineWidth = 2 / zoom2;
        ctx.strokeStyle = colors.flowColor;
        ctx.stroke(selectedPath);
        ctx.globalAlpha = 1;
        return;
      }
      const frame2 = getEdgeFlowFrame(timestampMs, zoom2);
      ctx.strokeStyle = colors.flowGlowColor;
      for (const segment of frame2.segments) {
        ctx.setLineDash(segment.dashPattern);
        ctx.lineDashOffset = segment.dashOffset;
        ctx.globalAlpha = segment.opacity;
        ctx.lineWidth = segment.haloWidth;
        ctx.stroke(selectedPath);
      }
      ctx.strokeStyle = colors.flowColor;
      for (const segment of frame2.segments) {
        ctx.setLineDash(segment.dashPattern);
        ctx.lineDashOffset = segment.dashOffset;
        ctx.globalAlpha = segment.opacity;
        ctx.lineWidth = segment.coreWidth;
        ctx.stroke(selectedPath);
      }
      ctx.globalAlpha = 1;
      if (!document.hidden && windowFocused)
        rafId2 = requestAnimationFrame(paint);
    };
    const schedule2 = () => {
      if (rafId2 !== 0 || document.hidden) return;
      rafId2 = requestAnimationFrame(paint);
    };
    flowScheduleRef.current = schedule2;
    const handleResize = () => {
      needsResize = true;
      schedule2();
    };
    const handleThemeChange = () => {
      needsPalette = true;
      schedule2();
    };
    const handleVisibilityChange = () => {
      if (!document.hidden) schedule2();
    };
    const handleWindowBlur = () => {
      windowFocused = false;
    };
    const handleWindowFocus = () => {
      windowFocused = true;
      schedule2();
    };
    const unsubStore = storeApi.subscribe(schedule2);
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(flow2);
    window.addEventListener("resize", handleResize);
    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    reducedMotionQuery.addEventListener("change", schedule2);
    const themeObserver = new MutationObserver(handleThemeChange);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style"],
    });
    schedule2();
    return () => {
      cancelled = true;
      if (rafId2 !== 0) cancelAnimationFrame(rafId2);
      unsubStore();
      resizeObserver.disconnect();
      themeObserver.disconnect();
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      reducedMotionQuery.removeEventListener("change", schedule2);
      flowScheduleRef.current = null;
    };
  }, [active2, onlySelectedNodes, storeApi]);
  reactExports.useEffect(() => {
    if (!active2) return;
    scheduleRef.current?.();
  }, [active2, hoveredId2]);
  reactExports.useEffect(() => {
    if (!active2) return;
    if (nodesInitialized) {
      scheduleRef.current?.();
      flowScheduleRef.current?.();
    }
  }, [active2, nodesInitialized]);
  return active2 ? (
    <>
      <canvas
        ref={canvasRef}
        className="hilo-edges-canvas"
        aria-hidden={true}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      <canvas
        ref={flowCanvasRef}
        className="hilo-edges-flow-canvas"
        aria-hidden={true}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
    </>
  ) : null;
}
