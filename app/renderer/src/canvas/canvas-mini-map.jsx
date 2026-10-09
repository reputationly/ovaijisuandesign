// canvas-mini-map.jsx
import {
  CanvasNodeType,
  reactExports,
  useStore$3,
  useStoreApi,
  shallow,
  nodeHasDimensions,
  getNodeDimensions,
  getBoundsOfRects,
  nodeToMiniMapRect,
  MIN_SELECTED_NODE_SIZE,
  flowPointToMiniMap,
  SELECTED_GLOW_BLUR,
  XYMinimap,
  NODE_HIT_SLOP,
  Panel,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { useRecentlyAddedApi } from "../infra/create-recently-added-store.jsx";
import {
  MINIMAP_CONTROLS_OFFSET,
  MINIMAP_SIZE,
  VIEWPORT_CONTROLS_INSET,
} from "./handle-position-style.jsx";
import { useGeneratingStateApi } from "../media-editing/parse-item.jsx";
const MINIMAP_POSITION_STYLES = {
  "bottom-left": {
    ...MINIMAP_SIZE,
    left: `calc(var(--canvas-left-overlay-inset, 0px) + ${VIEWPORT_CONTROLS_INSET}px)`,
    bottom: MINIMAP_CONTROLS_OFFSET,
    transition: "left 200ms cubic-bezier(0.16, 1, 0.3, 1)",
  },
  "top-left": {
    ...MINIMAP_SIZE,
    top: MINIMAP_CONTROLS_OFFSET,
    left: `calc(var(--canvas-top-left-overlay-inset, 0px) + ${VIEWPORT_CONTROLS_INSET}px)`,
    transition: "left 200ms cubic-bezier(0.16, 1, 0.3, 1)",
  },
  "top-right": {
    ...MINIMAP_SIZE,
    top: MINIMAP_CONTROLS_OFFSET,
    right: `calc(var(--canvas-top-right-overlay-inset, 0px) + var(--canvas-minimap-top-right-panel-inset, var(--canvas-top-right-panel-inset, 0px)) + ${VIEWPORT_CONTROLS_INSET}px)`,
    transition: "right 200ms cubic-bezier(0.16, 1, 0.3, 1)",
  },
};
export function getCanvasMinimapPositionStyle(placement) {
  return MINIMAP_POSITION_STYLES[placement];
}
const VISIBLE_GRID_GAP = 20;
const DOT_RADIUS = 1;
const MIN_VISIBLE_GRID_ZOOM = 0.5;
const COLOR_FALLBACK = "rgba(0, 0, 0, 0.04)";
function getVisibleGridStart(visibleMin) {
  return Math.floor(visibleMin / VISIBLE_GRID_GAP) * VISIBLE_GRID_GAP;
}
export function BackgroundCanvas({ active: active2 = true, variant = "dots" }) {
  const storeApi = useStoreApi();
  const canvasRef = reactExports.useRef(null);
  const variantRef = reactExports.useRef(variant);
  const scheduleRef = reactExports.useRef(null);
  variantRef.current = variant;
  reactExports.useEffect(() => {
    if (!active2) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const flow2 = canvas.closest(".react-flow");
    if (!flow2) return;
    let rafId2 = 0;
    let lastWidth = 0;
    let lastHeight = 0;
    let lastDpr = 0;
    let color2 = readDotColor(flow2);
    const paint = () => {
      rafId2 = 0;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const rect = flow2.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const cssW = Math.round(rect.width);
      const cssH = Math.round(rect.height);
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
      const state2 = storeApi.getState();
      const [tx, ty, zoom2] = state2.transform;
      if (zoom2 <= MIN_VISIBLE_GRID_ZOOM) return;
      ctx.setTransform(dpr * zoom2, 0, 0, dpr * zoom2, dpr * tx, dpr * ty);
      ctx.fillStyle = color2;
      const visMinX = -tx / zoom2;
      const visMinY = -ty / zoom2;
      const visMaxX = (cssW - tx) / zoom2;
      const visMaxY = (cssH - ty) / zoom2;
      const startX = getVisibleGridStart(visMinX);
      const startY = getVisibleGridStart(visMinY);
      if (variantRef.current === "grid") {
        const lineWidth = 0.5 / zoom2;
        for (let x2 = startX; x2 <= visMaxX; x2 += VISIBLE_GRID_GAP) {
          ctx.fillRect(x2, visMinY, lineWidth, visMaxY - visMinY);
        }
        for (let y4 = startY; y4 <= visMaxY; y4 += VISIBLE_GRID_GAP) {
          ctx.fillRect(visMinX, y4, visMaxX - visMinX, lineWidth);
        }
        return;
      }
      ctx.beginPath();
      for (let x2 = startX; x2 <= visMaxX; x2 += VISIBLE_GRID_GAP) {
        for (let y4 = startY; y4 <= visMaxY; y4 += VISIBLE_GRID_GAP) {
          ctx.moveTo(x2 + DOT_RADIUS, y4);
          ctx.arc(x2, y4, DOT_RADIUS, 0, Math.PI * 2);
        }
      }
      ctx.fill();
    };
    const schedule2 = () => {
      if (rafId2 !== 0) return;
      rafId2 = requestAnimationFrame(paint);
    };
    scheduleRef.current = schedule2;
    const themeObserver = new MutationObserver(() => {
      color2 = readDotColor(flow2);
      schedule2();
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style", "data-theme"],
    });
    schedule2();
    let prevTransform = storeApi.getState().transform;
    const unsubStore = storeApi.subscribe(() => {
      const next2 = storeApi.getState().transform;
      if (next2 === prevTransform) return;
      prevTransform = next2;
      schedule2();
    });
    const resizeObserver = new ResizeObserver(schedule2);
    resizeObserver.observe(flow2);
    const dprMql = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    const onDprChange = () => schedule2();
    dprMql.addEventListener("change", onDprChange);
    return () => {
      if (rafId2 !== 0) cancelAnimationFrame(rafId2);
      scheduleRef.current = null;
      themeObserver.disconnect();
      unsubStore();
      resizeObserver.disconnect();
      dprMql.removeEventListener("change", onDprChange);
    };
  }, [active2, storeApi]);
  reactExports.useEffect(() => {
    scheduleRef.current?.();
  }, [active2, variant]);
  return active2 ? (
    <canvas
      ref={canvasRef}
      aria-hidden={true}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        pointerEvents: "none",
        zIndex: -1,
      }}
    />
  ) : null;
}
function readDotColor(host) {
  const raw2 = getComputedStyle(host).getPropertyValue("--canvas-bg-dot").trim();
  return raw2 || COLOR_FALLBACK;
}
function computeCanvasMiniMapLayout({
  elementWidth,
  elementHeight,
  boundingRect,
  viewBB,
  offsetScale = 5,
}) {
  const safeElementWidth = Math.max(1, elementWidth);
  const safeElementHeight = Math.max(1, elementHeight);
  const scaledWidth = boundingRect.width / safeElementWidth;
  const scaledHeight = boundingRect.height / safeElementHeight;
  const viewScale = Math.max(scaledWidth, scaledHeight, Number.EPSILON);
  const viewWidth = viewScale * safeElementWidth;
  const viewHeight = viewScale * safeElementHeight;
  const offset2 = offsetScale * viewScale;
  const viewBox = {
    x: boundingRect.x - (viewWidth - boundingRect.width) / 2 - offset2,
    y: boundingRect.y - (viewHeight - boundingRect.height) / 2 - offset2,
    width: viewWidth + offset2 * 2,
    height: viewHeight + offset2 * 2,
  };
  const scale2 = Math.min(safeElementWidth / viewBox.width, safeElementHeight / viewBox.height);
  return {
    viewBox,
    viewBB,
    scale: scale2,
    offsetX: (safeElementWidth - viewBox.width * scale2) / 2,
    offsetY: (safeElementHeight - viewBox.height * scale2) / 2,
  };
}
function isCanvasMiniMapStaticLayoutEqual(previous2, next2) {
  return (
    previous2?.viewBox.x === next2.viewBox.x &&
    previous2.viewBox.y === next2.viewBox.y &&
    previous2.viewBox.width === next2.viewBox.width &&
    previous2.viewBox.height === next2.viewBox.height &&
    previous2.scale === next2.scale &&
    previous2.offsetX === next2.offsetX &&
    previous2.offsetY === next2.offsetY
  );
}
function miniMapPointToFlow(point2, layout) {
  return {
    x: layout.viewBox.x + (point2.x - layout.offsetX) / layout.scale,
    y: layout.viewBox.y + (point2.y - layout.offsetY) / layout.scale,
  };
}
function parseMiniMapGenerationSequence(...timestamps) {
  for (const timestamp2 of timestamps) {
    if (typeof timestamp2 !== "string" || timestamp2.length === 0) continue;
    const parsed = Date.parse(timestamp2);
    if (Number.isFinite(parsed)) return parsed;
  }
  return void 0;
}
function selectLatestGeneration(candidates2) {
  let latest2;
  for (const candidate of candidates2) {
    if (!latest2 || candidate.sequence > latest2.sequence) latest2 = candidate;
  }
  return latest2?.value;
}
const RIPPLE_DURATION_MS = 2e3;
const RIPPLE_REPEAT_COUNT = 3;
const RIPPLE_DELAYS_MS = [0, 670, 1330];
const RIPPLE_START_RADIUS = 3;
const RIPPLE_END_RADIUS = 20;
function getMiniMapRippleFrames(elapsedMs2, continuous) {
  const frames = [];
  let animating = false;
  for (const delayMs of RIPPLE_DELAYS_MS) {
    const localElapsed = elapsedMs2 - delayMs;
    if (localElapsed < 0) {
      animating = true;
      continue;
    }
    if (!continuous && localElapsed >= RIPPLE_DURATION_MS * RIPPLE_REPEAT_COUNT) continue;
    animating = true;
    const progress = (localElapsed % RIPPLE_DURATION_MS) / RIPPLE_DURATION_MS;
    frames.push({
      radius: RIPPLE_START_RADIUS + (RIPPLE_END_RADIUS - RIPPLE_START_RADIUS) * progress,
      opacity: 1 - progress,
    });
  }
  return {
    frames,
    animating,
  };
}
const MIN_VIEWPORT_INDICATOR_SIZE = 12;
const VIEWPORT_INDICATOR_STROKE_WIDTH = 1.5;
const VIEWPORT_INDICATOR_DISPERSED_STROKE_WIDTH = 2.75;
const VIEWPORT_INDICATOR_TRANSITION_MS = 280;
const DEFAULT_WIDTH = 200;
const DEFAULT_HEIGHT = 150;
function getClientPoint(event) {
  const source = "nativeEvent" in event ? event.nativeEvent : event;
  if ("touches" in source) {
    const touchEvent = source;
    const touch2 = touchEvent.touches[0] ?? touchEvent.changedTouches[0];
    return touch2
      ? {
          x: touch2.clientX,
          y: touch2.clientY,
        }
      : null;
  }
  const mouseEvent = source;
  return {
    x: mouseEvent.clientX,
    y: mouseEvent.clientY,
  };
}
function resolveCssColor(element2, color2) {
  const computedStyle = getComputedStyle(element2);
  let resolved = color2;
  for (let depth2 = 0; depth2 < 8 && resolved.includes("var("); depth2 += 1) {
    const next2 = resolved.replace(/var\((--[^),\s]+)(?:,[^)]+)?\)/g, (_match, token2) => {
      return computedStyle.getPropertyValue(token2).trim() || "transparent";
    });
    if (next2 === resolved) break;
    resolved = next2;
  }
  return resolved;
}
function roundedRect(context, x2, y4, width, height, radius) {
  const safeRadius = Math.max(0, Math.min(radius, width / 2, height / 2));
  context.beginPath();
  context.roundRect(x2, y4, width, height, safeRadius);
}
function prepareLayer(existing, elementWidth, elementHeight, pixelRatio) {
  const canvas = existing ?? document.createElement("canvas");
  const bitmapWidth = Math.max(1, Math.round(elementWidth * pixelRatio));
  const bitmapHeight = Math.max(1, Math.round(elementHeight * pixelRatio));
  if (canvas.width !== bitmapWidth || canvas.height !== bitmapHeight) {
    canvas.width = bitmapWidth;
    canvas.height = bitmapHeight;
  }
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  context.clearRect(0, 0, elementWidth, elementHeight);
  return {
    canvas,
    context,
  };
}
export function CanvasMiniMap({
  position: position2,
  style: style2,
  viewportColor,
  onClick,
  onNodeSelect,
}) {
  const panelRef = reactExports.useRef(null);
  const canvasRef = reactExports.useRef(null);
  const sceneRef = reactExports.useRef(null);
  const graphRef = reactExports.useRef(null);
  const sceneDirtyRef = reactExports.useRef(true);
  const graphDirtyRef = reactExports.useRef(true);
  const baseDirtyRef = reactExports.useRef(true);
  const animationOriginsRef = reactExports.useRef(new Map());
  const generationSequenceRef = reactExports.useRef(new Map());
  const nextGenerationSequenceRef = reactExports.useRef(Date.now());
  const indicatorRef = reactExports.useRef({
    geometry: null,
    fromOpacity: 0,
    opacity: 0,
    targetOpacity: 0,
    startedAt: 0,
  });
  const reducedMotionRef = reactExports.useRef(false);
  const frameRef = reactExports.useRef(null);
  const renderFrameRef = reactExports.useRef(() => void 0);
  const minimapInstanceRef = reactExports.useRef(null);
  const hoveredNodeIdRef = reactExports.useRef(null);
  const storeApi = useStoreApi();
  const recentlyAddedStore = useRecentlyAddedApi();
  const generatingStateStore = useGeneratingStateApi();
  const interactionState = useStore$3(
    (state2) => ({
      panZoom: state2.panZoom,
      translateExtent: state2.translateExtent,
      flowWidth: state2.width,
      flowHeight: state2.height,
      ariaLabel: state2.ariaLabelConfig["minimap.ariaLabel"],
    }),
    shallow,
  );
  const requestFrame = reactExports.useCallback(() => {
    if (frameRef.current !== null) return;
    frameRef.current = requestAnimationFrame((timestamp2) => renderFrameRef.current(timestamp2));
  }, []);
  const invalidateScene = reactExports.useCallback(() => {
    sceneDirtyRef.current = true;
    requestFrame();
  }, [requestFrame]);
  const invalidateGraph = reactExports.useCallback(() => {
    graphDirtyRef.current = true;
    baseDirtyRef.current = true;
    invalidateScene();
  }, [invalidateScene]);
  const invalidateBase = reactExports.useCallback(() => {
    baseDirtyRef.current = true;
    invalidateScene();
  }, [invalidateScene]);
  const rebuildScene = (timestamp2) => {
    const canvas = canvasRef.current;
    const panel = panelRef.current;
    if (!canvas || !panel) return null;
    const elementWidth = canvas.clientWidth || Number(style2.width) || DEFAULT_WIDTH;
    const elementHeight = canvas.clientHeight || Number(style2.height) || DEFAULT_HEIGHT;
    if (elementWidth <= 0 || elementHeight <= 0) return null;
    const pixelRatio = window.devicePixelRatio || 1;
    const previousScene = sceneRef.current;
    const state2 = storeApi.getState();
    const viewBB = {
      x: -state2.transform[0] / state2.transform[2],
      y: -state2.transform[1] / state2.transform[2],
      width: state2.width / state2.transform[2],
      height: state2.height / state2.transform[2],
    };
    let graph = graphRef.current;
    if (graphDirtyRef.current || !graph) {
      const nodes = [];
      let bounds;
      let hasDraggingNodes = false;
      for (const node2 of state2.nodes) {
        const internalNode = state2.nodeLookup.get(node2.id);
        if (!internalNode || node2.hidden || !nodeHasDimensions(node2)) continue;
        const dimensions2 = getNodeDimensions(node2);
        const position22 = internalNode.internals.positionAbsolute;
        hasDraggingNodes ||= internalNode.dragging === true;
        const rect = {
          x: position22.x,
          y: position22.y,
          width: dimensions2.width,
          height: dimensions2.height,
        };
        bounds = bounds ? getBoundsOfRects(bounds, rect) : rect;
        const data2 = node2.data;
        nodes.push({
          id: node2.id,
          ...rect,
          selected: node2.selected === true,
          placeholderGenerating:
            node2.type === CanvasNodeType.Placeholder &&
            (data2.status === "pending" ||
              data2.status === "generating" ||
              data2.status === "loading"),
          generationStartedAt: data2.generationStartedAt,
          createdAt: data2.createdAt,
        });
      }
      graph = {
        nodes,
        bounds: bounds ?? viewBB,
        byId: new Map(nodes.map((node2) => [node2.id, node2])),
        placeholderGeneratingIds: nodes
          .filter((node2) => node2.placeholderGenerating)
          .map((node2) => node2.id),
        selectedIds: nodes.filter((node2) => node2.selected).map((node2) => node2.id),
        hasDraggingNodes,
      };
      graphRef.current = graph;
    }
    const boundingRect = graph.nodes.length > 0 ? getBoundsOfRects(graph.bounds, viewBB) : viewBB;
    const scaledWidth = boundingRect.width / elementWidth;
    const scaledHeight = boundingRect.height / elementHeight;
    const viewScale = Math.max(scaledWidth, scaledHeight, Number.EPSILON);
    const layout = computeCanvasMiniMapLayout({
      elementWidth,
      elementHeight,
      boundingRect,
      viewBB,
    });
    const computedStyle = getComputedStyle(panel);
    const nodeFill = computedStyle.getPropertyValue("--muted-foreground").trim() || "#737373";
    const markerColor =
      computedStyle.getPropertyValue("--canvas-recent-marker").trim() || "#6D6CFF";
    const selectedColor =
      computedStyle.getPropertyValue("--canvas-minimap-selected").trim() || "#6D6CFF";
    const selectedGlow =
      computedStyle.getPropertyValue("--canvas-minimap-selected-glow").trim() || "#6D6CFFA6";
    const selectedRects = [];
    for (const nodeId of graph.selectedIds) {
      const node2 = graph.byId.get(nodeId);
      if (node2) selectedRects.push(nodeToMiniMapRect(node2, layout, MIN_SELECTED_NODE_SIZE));
    }
    const redrawBase =
      baseDirtyRef.current ||
      !previousScene ||
      previousScene.elementWidth !== elementWidth ||
      previousScene.elementHeight !== elementHeight ||
      previousScene.pixelRatio !== pixelRatio ||
      !isCanvasMiniMapStaticLayoutEqual(previousScene.layout, layout);
    let baseLayer = previousScene?.baseLayer;
    if (redrawBase) {
      const base2 = prepareLayer(baseLayer, elementWidth, elementHeight, pixelRatio);
      if (!base2) return null;
      baseLayer = base2.canvas;
      base2.context.save();
      base2.context.globalAlpha = 0.5;
      base2.context.fillStyle = nodeFill;
      for (const node2 of graph.nodes) {
        const topLeft = flowPointToMiniMap(
          {
            x: node2.x,
            y: node2.y,
          },
          layout,
        );
        roundedRect(
          base2.context,
          topLeft.x,
          topLeft.y,
          node2.width * layout.scale,
          node2.height * layout.scale,
          5 * layout.scale,
        );
        base2.context.fill();
      }
      base2.context.restore();
    }
    if (!baseLayer) return null;
    const mask = prepareLayer(previousScene?.maskLayer, elementWidth, elementHeight, pixelRatio);
    if (!mask) return null;
    const recentIds = recentlyAddedStore.getState().ids;
    const generatingByNode = generatingStateStore.getState().byNode;
    const recentMarkers = [];
    const generatingMarkers = [];
    const activeGenerationIds = new Set();
    const continuousIds = new Set(graph.placeholderGeneratingIds);
    for (const [nodeId, generating] of generatingByNode) {
      if (!generating.error) continuousIds.add(nodeId);
    }
    for (const nodeId of recentIds) {
      if (continuousIds.has(nodeId)) continue;
      const node2 = graph.byId.get(nodeId);
      if (!node2) continue;
      recentMarkers.push({
        key: `${node2.id}:recent`,
        continuous: false,
        center: flowPointToMiniMap(
          {
            x: node2.x + node2.width / 2,
            y: node2.y + node2.height / 2,
          },
          layout,
        ),
      });
    }
    for (const nodeId of continuousIds) {
      const node2 = graph.byId.get(nodeId);
      if (!node2) continue;
      const generating = generatingByNode.get(nodeId);
      const marker = {
        key: `${node2.id}:generating`,
        continuous: true,
        center: flowPointToMiniMap(
          {
            x: node2.x + node2.width / 2,
            y: node2.y + node2.height / 2,
          },
          layout,
        ),
      };
      activeGenerationIds.add(node2.id);
      let rank = parseMiniMapGenerationSequence(
        node2.generationStartedAt,
        generating?.generationStartedAt,
        node2.createdAt,
      );
      if (rank === void 0) {
        rank = generationSequenceRef.current.get(node2.id);
        if (rank === void 0) {
          nextGenerationSequenceRef.current = Math.max(
            nextGenerationSequenceRef.current + 1,
            Date.now(),
          );
          rank = nextGenerationSequenceRef.current;
        }
      }
      generationSequenceRef.current.set(node2.id, rank);
      generatingMarkers.push({
        value: marker,
        sequence: rank,
      });
    }
    for (const nodeId of generationSequenceRef.current.keys()) {
      if (!activeGenerationIds.has(nodeId)) generationSequenceRef.current.delete(nodeId);
    }
    const latestGeneratingMarker = selectLatestGeneration(generatingMarkers);
    const markers = latestGeneratingMarker
      ? [...recentMarkers, latestGeneratingMarker]
      : recentMarkers;
    const activeOriginKeys = new Set(markers.map((marker) => marker.key));
    for (const marker of markers) {
      if (!animationOriginsRef.current.has(marker.key)) {
        animationOriginsRef.current.set(marker.key, timestamp2);
      }
    }
    for (const key2 of animationOriginsRef.current.keys()) {
      if (!activeOriginKeys.has(key2)) animationOriginsRef.current.delete(key2);
    }
    const viewportTopLeft = flowPointToMiniMap(
      {
        x: viewBB.x,
        y: viewBB.y,
      },
      layout,
    );
    const viewportBottomRight = flowPointToMiniMap(
      {
        x: viewBB.x + viewBB.width,
        y: viewBB.y + viewBB.height,
      },
      layout,
    );
    const viewportWidth = viewportBottomRight.x - viewportTopLeft.x;
    const viewportHeight = viewportBottomRight.y - viewportTopLeft.y;
    const foreground = computedStyle.getPropertyValue("--foreground").trim() || "#000000";
    mask.context.fillStyle = `color-mix(in srgb, ${foreground} 8%, transparent)`;
    mask.context.beginPath();
    mask.context.rect(0, 0, elementWidth, elementHeight);
    mask.context.rect(viewportTopLeft.x, viewportTopLeft.y, viewportWidth, viewportHeight);
    mask.context.fill("evenodd");
    const viewportAreaRatio =
      layout.viewBox.width > 0 && layout.viewBox.height > 0
        ? Math.min(
            1,
            Math.max(
              0,
              (viewBB.width * viewBB.height) / (layout.viewBox.width * layout.viewBox.height),
            ),
          )
        : 1;
    const resolvedViewportColor = viewportColor(viewportAreaRatio);
    const indicator = indicatorRef.current;
    const indicatorWidth = Math.max(viewBB.width, MIN_VIEWPORT_INDICATOR_SIZE * viewScale);
    const indicatorHeight = Math.max(viewBB.height, MIN_VIEWPORT_INDICATOR_SIZE * viewScale);
    const indicatorTopLeft = flowPointToMiniMap(
      {
        x: viewBB.x - (indicatorWidth - viewBB.width) / 2,
        y: viewBB.y - (indicatorHeight - viewBB.height) / 2,
      },
      layout,
    );
    indicator.geometry = {
      x: indicatorTopLeft.x,
      y: indicatorTopLeft.y,
      width: indicatorWidth * layout.scale,
      height: indicatorHeight * layout.scale,
      fill:
        resolvedViewportColor !== void 0
          ? resolveCssColor(panel, resolvedViewportColor)
          : (indicator.geometry?.fill ?? "transparent"),
      stroke:
        computedStyle.getPropertyValue("--canvas-minimap-viewport-accent").trim() || markerColor,
    };
    const nextIndicatorTarget = resolvedViewportColor === void 0 ? 0 : 1;
    if (indicator.targetOpacity !== nextIndicatorTarget) {
      indicator.fromOpacity = indicator.opacity;
      indicator.targetOpacity = nextIndicatorTarget;
      indicator.startedAt = timestamp2;
    }
    if (reducedMotionRef.current) indicator.opacity = indicator.targetOpacity;
    return {
      layout,
      elementWidth,
      elementHeight,
      pixelRatio,
      viewScale,
      baseLayer,
      maskLayer: mask.canvas,
      markers,
      markerColor,
      selectedRects,
      selectedColor,
      selectedGlow,
    };
  };
  renderFrameRef.current = (timestamp2) => {
    frameRef.current = null;
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (sceneDirtyRef.current || !sceneRef.current) {
      const rebuiltScene = rebuildScene(timestamp2);
      if (rebuiltScene) {
        sceneRef.current = rebuiltScene;
        sceneDirtyRef.current = false;
        graphDirtyRef.current = false;
        baseDirtyRef.current = false;
      }
    }
    const scene = sceneRef.current;
    if (!scene) return;
    const bitmapWidth = Math.max(1, Math.round(scene.elementWidth * scene.pixelRatio));
    const bitmapHeight = Math.max(1, Math.round(scene.elementHeight * scene.pixelRatio));
    if (canvas.width !== bitmapWidth || canvas.height !== bitmapHeight) {
      canvas.width = bitmapWidth;
      canvas.height = bitmapHeight;
    }
    const context = canvas.getContext("2d");
    if (!context) return;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, bitmapWidth, bitmapHeight);
    context.drawImage(scene.baseLayer, 0, 0);
    context.setTransform(scene.pixelRatio, 0, 0, scene.pixelRatio, 0, 0);
    let needsAnimationFrame = false;
    for (const marker of scene.markers) {
      const origin = animationOriginsRef.current.get(marker.key) ?? timestamp2;
      const ripple = reducedMotionRef.current
        ? {
            frames: [],
            animating: false,
          }
        : getMiniMapRippleFrames(timestamp2 - origin, marker.continuous);
      needsAnimationFrame ||= ripple.animating;
      context.save();
      context.fillStyle = scene.markerColor;
      context.beginPath();
      context.arc(marker.center.x, marker.center.y, 3, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = scene.markerColor;
      context.lineWidth = 1.75;
      for (const frame2 of ripple.frames) {
        context.globalAlpha = frame2.opacity;
        context.beginPath();
        context.arc(marker.center.x, marker.center.y, frame2.radius, 0, Math.PI * 2);
        context.stroke();
      }
      context.restore();
    }
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.drawImage(scene.maskLayer, 0, 0);
    context.setTransform(scene.pixelRatio, 0, 0, scene.pixelRatio, 0, 0);
    if (scene.selectedRects.length > 0) {
      context.save();
      context.fillStyle = scene.selectedColor;
      context.shadowColor = scene.selectedGlow;
      context.shadowBlur = SELECTED_GLOW_BLUR;
      for (const rect of scene.selectedRects) {
        roundedRect(context, rect.x, rect.y, rect.width, rect.height, 2);
        context.fill();
      }
      context.restore();
    }
    const hoveredNode = hoveredNodeIdRef.current
      ? graphRef.current?.byId.get(hoveredNodeIdRef.current)
      : void 0;
    if (hoveredNode && !hoveredNode.selected) {
      const rect = nodeToMiniMapRect(hoveredNode, scene.layout, MIN_SELECTED_NODE_SIZE);
      context.save();
      context.globalAlpha = 0.45;
      context.fillStyle = scene.selectedColor;
      roundedRect(context, rect.x, rect.y, rect.width, rect.height, 2);
      context.fill();
      context.restore();
    }
    const indicator = indicatorRef.current;
    if (!reducedMotionRef.current && indicator.opacity !== indicator.targetOpacity) {
      const progress = Math.min(
        1,
        (timestamp2 - indicator.startedAt) / VIEWPORT_INDICATOR_TRANSITION_MS,
      );
      indicator.opacity =
        indicator.fromOpacity + (indicator.targetOpacity - indicator.fromOpacity) * progress;
      needsAnimationFrame ||= progress < 1;
    }
    if (indicator.geometry && indicator.opacity > 0) {
      context.save();
      context.globalAlpha = indicator.opacity;
      context.fillStyle = indicator.geometry.fill;
      context.strokeStyle = indicator.geometry.stroke;
      context.lineWidth =
        VIEWPORT_INDICATOR_DISPERSED_STROKE_WIDTH +
        (VIEWPORT_INDICATOR_STROKE_WIDTH - VIEWPORT_INDICATOR_DISPERSED_STROKE_WIDTH) *
          indicator.opacity;
      roundedRect(
        context,
        indicator.geometry.x,
        indicator.geometry.y,
        indicator.geometry.width,
        indicator.geometry.height,
        2,
      );
      context.fill();
      context.stroke();
      context.restore();
    }
    if (needsAnimationFrame) requestFrame();
  };
  reactExports.useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleMotionChange = () => {
      reducedMotionRef.current = motionQuery.matches;
      invalidateScene();
    };
    handleMotionChange();
    motionQuery.addEventListener("change", handleMotionChange);
    const unsubscribeCanvas = storeApi.subscribe((state2, previousState) => {
      const viewportChanged =
        state2.transform[0] !== previousState.transform[0] ||
        state2.transform[1] !== previousState.transform[1] ||
        state2.transform[2] !== previousState.transform[2] ||
        state2.width !== previousState.width ||
        state2.height !== previousState.height;
      const graphReferencesChanged =
        state2.nodes !== previousState.nodes || state2.nodeLookup !== previousState.nodeLookup;
      if (viewportChanged && !graphReferencesChanged && !graphRef.current?.hasDraggingNodes) {
        invalidateScene();
      } else {
        invalidateGraph();
      }
    });
    const unsubscribeRecent = recentlyAddedStore.subscribe(invalidateScene);
    const unsubscribeGenerating = generatingStateStore.subscribe(invalidateScene);
    const resizeObserver = new ResizeObserver(invalidateBase);
    if (panelRef.current) resizeObserver.observe(panelRef.current);
    const themeObserver = new MutationObserver(invalidateBase);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style"],
    });
    window.addEventListener("resize", invalidateBase);
    invalidateGraph();
    return () => {
      unsubscribeCanvas();
      unsubscribeRecent();
      unsubscribeGenerating();
      resizeObserver.disconnect();
      themeObserver.disconnect();
      motionQuery.removeEventListener("change", handleMotionChange);
      window.removeEventListener("resize", invalidateBase);
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
      sceneRef.current = null;
      graphRef.current = null;
      sceneDirtyRef.current = true;
      graphDirtyRef.current = true;
      baseDirtyRef.current = true;
      animationOriginsRef.current.clear();
      generationSequenceRef.current.clear();
      nextGenerationSequenceRef.current = Date.now();
    };
  }, [
    generatingStateStore,
    invalidateBase,
    invalidateGraph,
    invalidateScene,
    recentlyAddedStore,
    storeApi,
  ]);
  reactExports.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !interactionState.panZoom) return;
    const minimap = XYMinimap({
      domNode: canvas,
      panZoom: interactionState.panZoom,
      getTransform: () => storeApi.getState().transform,
      getViewScale: () => sceneRef.current?.viewScale ?? 1,
      getViewBB: () => sceneRef.current?.layout.viewBB ?? null,
      getPointerPosition: (event) => {
        const clientPoint = getClientPoint(event);
        const scene = sceneRef.current;
        if (!clientPoint || !scene || !canvasRef.current) return [0, 0];
        const rect = canvasRef.current.getBoundingClientRect();
        const flowPoint = miniMapPointToFlow(
          {
            x: clientPoint.x - rect.left,
            y: clientPoint.y - rect.top,
          },
          scene.layout,
        );
        return [flowPoint.x, flowPoint.y];
      },
    });
    minimapInstanceRef.current = minimap;
    return () => {
      minimap.destroy();
      minimapInstanceRef.current = null;
    };
  }, [interactionState.panZoom, storeApi]);
  reactExports.useEffect(() => {
    minimapInstanceRef.current?.update({
      translateExtent: interactionState.translateExtent,
      width: interactionState.flowWidth,
      height: interactionState.flowHeight,
      pannable: true,
      zoomable: true,
    });
  }, [interactionState.flowHeight, interactionState.flowWidth, interactionState.translateExtent]);
  const hitTestNode = reactExports.useCallback((clientX, clientY) => {
    const canvas = canvasRef.current;
    const scene = sceneRef.current;
    const graph = graphRef.current;
    if (!canvas || !scene || !graph) return null;
    const bounds = canvas.getBoundingClientRect();
    const x2 = clientX - bounds.left;
    const y4 = clientY - bounds.top;
    let hitId = null;
    let hitArea = Number.POSITIVE_INFINITY;
    for (const node2 of graph.nodes) {
      const rect = nodeToMiniMapRect(node2, scene.layout, MIN_SELECTED_NODE_SIZE);
      if (
        x2 < rect.x - NODE_HIT_SLOP ||
        x2 > rect.x + rect.width + NODE_HIT_SLOP ||
        y4 < rect.y - NODE_HIT_SLOP ||
        y4 > rect.y + rect.height + NODE_HIT_SLOP
      ) {
        continue;
      }
      const area = rect.width * rect.height;
      if (area < hitArea) {
        hitArea = area;
        hitId = node2.id;
      }
    }
    return hitId;
  }, []);
  const setHoveredNode = reactExports.useCallback(
    (nodeId) => {
      if (hoveredNodeIdRef.current === nodeId) return;
      hoveredNodeIdRef.current = nodeId;
      if (canvasRef.current) canvasRef.current.style.cursor = nodeId ? "pointer" : "";
      requestFrame();
    },
    [requestFrame],
  );
  const handlePointerMove = reactExports.useCallback(
    (event) => {
      if (!onNodeSelect || event.buttons !== 0) {
        setHoveredNode(null);
        return;
      }
      setHoveredNode(hitTestNode(event.clientX, event.clientY));
    },
    [hitTestNode, onNodeSelect, setHoveredNode],
  );
  const handlePointerLeave = reactExports.useCallback(() => setHoveredNode(null), [setHoveredNode]);
  const handleClick2 = reactExports.useCallback(
    (event) => {
      const canvas = canvasRef.current;
      const scene = sceneRef.current;
      if (!canvas || !scene) return;
      if (onNodeSelect) {
        const nodeId = hitTestNode(event.clientX, event.clientY);
        if (nodeId) {
          onNodeSelect(nodeId, event.shiftKey || event.metaKey || event.ctrlKey);
          return;
        }
      }
      const rect = canvas.getBoundingClientRect();
      const position22 = miniMapPointToFlow(
        {
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        },
        scene.layout,
      );
      const viewBB = scene.layout.viewBB;
      if (
        position22.x >= viewBB.x &&
        position22.x <= viewBB.x + viewBB.width &&
        position22.y >= viewBB.y &&
        position22.y <= viewBB.y + viewBB.height
      ) {
        return;
      }
      onClick(event, position22);
    },
    [hitTestNode, onClick, onNodeSelect],
  );
  return (
    <Panel
      ref={panelRef}
      position={position2}
      style={style2}
      className="react-flow__minimap react-flow__minimap-canvas-panel"
      data-testid="rf__minimap"
    >
      <canvas
        ref={canvasRef}
        className="react-flow__minimap-canvas"
        role="img"
        aria-label={interactionState.ariaLabel ?? "Mini map"}
        onClick={handleClick2}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      />
    </Panel>
  );
}
