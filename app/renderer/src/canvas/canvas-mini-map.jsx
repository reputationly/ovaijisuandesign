// canvas-mini-map.jsx
import {
  CanvasNodeType,
  flowPointToMiniMap,
  MIN_SELECTED_NODE_SIZE,
  NODE_HIT_SLOP,
  nodeToMiniMapRect,
  reactExports,
  SELECTED_GLOW_BLUR,
  shallow,
} from "../vendor.js";
import { getBoundsOfRects, getNodeDimensions, nodeHasDimensions, XYMinimap } from "../vendor-fork/xyflow/system/index.js";
import { Panel, useStore, useStoreApi } from "../vendor-fork/xyflow/react/index.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { useRecentlyAddedApi } from "../infra/create-recently-added-store.js";
import { useGeneratingStateApi } from "../media-editing/package.jsx";
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
  const offset = offsetScale * viewScale;
  const viewBox = {
    x: boundingRect.x - (viewWidth - boundingRect.width) / 2 - offset,
    y: boundingRect.y - (viewHeight - boundingRect.height) / 2 - offset,
    width: viewWidth + offset * 2,
    height: viewHeight + offset * 2,
  };
  const scale = Math.min(
    safeElementWidth / viewBox.width,
    safeElementHeight / viewBox.height,
  );
  return {
    viewBox,
    viewBB,
    scale,
    offsetX: (safeElementWidth - viewBox.width * scale) / 2,
    offsetY: (safeElementHeight - viewBox.height * scale) / 2,
  };
}
function isCanvasMiniMapStaticLayoutEqual(previous, next) {
  return (
    previous?.viewBox.x === next.viewBox.x &&
    previous.viewBox.y === next.viewBox.y &&
    previous.viewBox.width === next.viewBox.width &&
    previous.viewBox.height === next.viewBox.height &&
    previous.scale === next.scale &&
    previous.offsetX === next.offsetX &&
    previous.offsetY === next.offsetY
  );
}
function miniMapPointToFlow(point, layout) {
  return {
    x: layout.viewBox.x + (point.x - layout.offsetX) / layout.scale,
    y: layout.viewBox.y + (point.y - layout.offsetY) / layout.scale,
  };
}
function parseMiniMapGenerationSequence(...timestamps) {
  for (const timestamp of timestamps) {
    if (typeof timestamp !== "string" || timestamp.length === 0) continue;
    const parsed = Date.parse(timestamp);
    if (Number.isFinite(parsed)) return parsed;
  }
  return void 0;
}
function selectLatestGeneration(candidates) {
  let latest;
  for (const candidate of candidates) {
    if (!latest || candidate.sequence > latest.sequence) latest = candidate;
  }
  return latest?.value;
}
const RIPPLE_DURATION_MS = 2e3;
const RIPPLE_REPEAT_COUNT = 3;
const RIPPLE_DELAYS_MS = [0, 670, 1330];
const RIPPLE_START_RADIUS = 3;
const RIPPLE_END_RADIUS = 20;
function getMiniMapRippleFrames(elapsedMs, continuous) {
  const frames = [];
  let animating = false;
  for (const delayMs of RIPPLE_DELAYS_MS) {
    const localElapsed = elapsedMs - delayMs;
    if (localElapsed < 0) {
      animating = true;
      continue;
    }
    if (!continuous && localElapsed >= RIPPLE_DURATION_MS * RIPPLE_REPEAT_COUNT)
      continue;
    animating = true;
    const progress = (localElapsed % RIPPLE_DURATION_MS) / RIPPLE_DURATION_MS;
    frames.push({
      radius:
        RIPPLE_START_RADIUS +
        (RIPPLE_END_RADIUS - RIPPLE_START_RADIUS) * progress,
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
    const touch = touchEvent.touches[0] ?? touchEvent.changedTouches[0];
    return touch
      ? {
          x: touch.clientX,
          y: touch.clientY,
        }
      : null;
  }
  const mouseEvent = source;
  return {
    x: mouseEvent.clientX,
    y: mouseEvent.clientY,
  };
}
function resolveCssColor(element, color) {
  const computedStyle = getComputedStyle(element);
  let resolved = color;
  for (let depth = 0; depth < 8 && resolved.includes("var("); depth += 1) {
    const next = resolved.replace(
      /var\((--[^),\s]+)(?:,[^)]+)?\)/g,
      (_match, token) => {
        return computedStyle.getPropertyValue(token).trim() || "transparent";
      },
    );
    if (next === resolved) break;
    resolved = next;
  }
  return resolved;
}
function roundedRect(context, x, y, width, height, radius) {
  const safeRadius = Math.max(0, Math.min(radius, width / 2, height / 2));
  context.beginPath();
  context.roundRect(x, y, width, height, safeRadius);
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
  position,
  style,
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
  const interactionState = useStore(
    (state) => ({
      panZoom: state.panZoom,
      translateExtent: state.translateExtent,
      flowWidth: state.width,
      flowHeight: state.height,
      ariaLabel: state.ariaLabelConfig["minimap.ariaLabel"],
    }),
    shallow,
  );
  const requestFrame = reactExports.useCallback(() => {
    if (frameRef.current !== null) return;
    frameRef.current = requestAnimationFrame((timestamp) =>
      renderFrameRef.current(timestamp),
    );
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
  const rebuildScene = (timestamp) => {
    const canvas = canvasRef.current;
    const panel = panelRef.current;
    if (!canvas || !panel) return null;
    const elementWidth =
      canvas.clientWidth || Number(style.width) || DEFAULT_WIDTH;
    const elementHeight =
      canvas.clientHeight || Number(style.height) || DEFAULT_HEIGHT;
    if (elementWidth <= 0 || elementHeight <= 0) return null;
    const pixelRatio = window.devicePixelRatio || 1;
    const previousScene = sceneRef.current;
    const state = storeApi.getState();
    const viewBB = {
      x: -state.transform[0] / state.transform[2],
      y: -state.transform[1] / state.transform[2],
      width: state.width / state.transform[2],
      height: state.height / state.transform[2],
    };
    let graph = graphRef.current;
    if (graphDirtyRef.current || !graph) {
      const nodes = [];
      let bounds;
      let hasDraggingNodes = false;
      for (const node of state.nodes) {
        const internalNode = state.nodeLookup.get(node.id);
        if (!internalNode || node.hidden || !nodeHasDimensions(node))
          continue;
        const dimensions = getNodeDimensions(node);
        const position = internalNode.internals.positionAbsolute;
        hasDraggingNodes ||= internalNode.dragging === true;
        const rect = {
          x: position.x,
          y: position.y,
          width: dimensions.width,
          height: dimensions.height,
        };
        bounds = bounds ? getBoundsOfRects(bounds, rect) : rect;
        const data = node.data;
        nodes.push({
          id: node.id,
          ...rect,
          selected: node.selected === true,
          placeholderGenerating:
            node.type === CanvasNodeType.Placeholder &&
            (data.status === "pending" ||
              data.status === "generating" ||
              data.status === "loading"),
          generationStartedAt: data.generationStartedAt,
          createdAt: data.createdAt,
        });
      }
      graph = {
        nodes,
        bounds: bounds ?? viewBB,
        byId: new Map(nodes.map((node) => [node.id, node])),
        placeholderGeneratingIds: nodes
          .filter((node) => node.placeholderGenerating)
          .map((node) => node.id),
        selectedIds: nodes
          .filter((node) => node.selected)
          .map((node) => node.id),
        hasDraggingNodes,
      };
      graphRef.current = graph;
    }
    const boundingRect =
      graph.nodes.length > 0 ? getBoundsOfRects(graph.bounds, viewBB) : viewBB;
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
    const nodeFill =
      computedStyle.getPropertyValue("--muted-foreground").trim() || "#737373";
    const markerColor =
      computedStyle.getPropertyValue("--canvas-recent-marker").trim() ||
      "#6D6CFF";
    const selectedColor =
      computedStyle.getPropertyValue("--canvas-minimap-selected").trim() ||
      "#6D6CFF";
    const selectedGlow =
      computedStyle.getPropertyValue("--canvas-minimap-selected-glow").trim() ||
      "#6D6CFFA6";
    const selectedRects = [];
    for (const nodeId of graph.selectedIds) {
      const node = graph.byId.get(nodeId);
      if (node)
        selectedRects.push(
          nodeToMiniMapRect(node, layout, MIN_SELECTED_NODE_SIZE),
        );
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
      const base = prepareLayer(
        baseLayer,
        elementWidth,
        elementHeight,
        pixelRatio,
      );
      if (!base) return null;
      baseLayer = base.canvas;
      base.context.save();
      base.context.globalAlpha = 0.5;
      base.context.fillStyle = nodeFill;
      for (const node of graph.nodes) {
        const topLeft = flowPointToMiniMap(
          {
            x: node.x,
            y: node.y,
          },
          layout,
        );
        roundedRect(
          base.context,
          topLeft.x,
          topLeft.y,
          node.width * layout.scale,
          node.height * layout.scale,
          5 * layout.scale,
        );
        base.context.fill();
      }
      base.context.restore();
    }
    if (!baseLayer) return null;
    const mask = prepareLayer(
      previousScene?.maskLayer,
      elementWidth,
      elementHeight,
      pixelRatio,
    );
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
      const node = graph.byId.get(nodeId);
      if (!node) continue;
      recentMarkers.push({
        key: `${node.id}:recent`,
        continuous: false,
        center: flowPointToMiniMap(
          {
            x: node.x + node.width / 2,
            y: node.y + node.height / 2,
          },
          layout,
        ),
      });
    }
    for (const nodeId of continuousIds) {
      const node = graph.byId.get(nodeId);
      if (!node) continue;
      const generating = generatingByNode.get(nodeId);
      const marker = {
        key: `${node.id}:generating`,
        continuous: true,
        center: flowPointToMiniMap(
          {
            x: node.x + node.width / 2,
            y: node.y + node.height / 2,
          },
          layout,
        ),
      };
      activeGenerationIds.add(node.id);
      let rank = parseMiniMapGenerationSequence(
        node.generationStartedAt,
        generating?.generationStartedAt,
        node.createdAt,
      );
      if (rank === void 0) {
        rank = generationSequenceRef.current.get(node.id);
        if (rank === void 0) {
          nextGenerationSequenceRef.current = Math.max(
            nextGenerationSequenceRef.current + 1,
            Date.now(),
          );
          rank = nextGenerationSequenceRef.current;
        }
      }
      generationSequenceRef.current.set(node.id, rank);
      generatingMarkers.push({
        value: marker,
        sequence: rank,
      });
    }
    for (const nodeId of generationSequenceRef.current.keys()) {
      if (!activeGenerationIds.has(nodeId))
        generationSequenceRef.current.delete(nodeId);
    }
    const latestGeneratingMarker = selectLatestGeneration(generatingMarkers);
    const markers = latestGeneratingMarker
      ? [...recentMarkers, latestGeneratingMarker]
      : recentMarkers;
    const activeOriginKeys = new Set(markers.map((marker) => marker.key));
    for (const marker of markers) {
      if (!animationOriginsRef.current.has(marker.key)) {
        animationOriginsRef.current.set(marker.key, timestamp);
      }
    }
    for (const key of animationOriginsRef.current.keys()) {
      if (!activeOriginKeys.has(key)) animationOriginsRef.current.delete(key);
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
    const foreground =
      computedStyle.getPropertyValue("--foreground").trim() || "#000000";
    mask.context.fillStyle = `color-mix(in srgb, ${foreground} 8%, transparent)`;
    mask.context.beginPath();
    mask.context.rect(0, 0, elementWidth, elementHeight);
    mask.context.rect(
      viewportTopLeft.x,
      viewportTopLeft.y,
      viewportWidth,
      viewportHeight,
    );
    mask.context.fill("evenodd");
    const viewportAreaRatio =
      layout.viewBox.width > 0 && layout.viewBox.height > 0
        ? Math.min(
            1,
            Math.max(
              0,
              (viewBB.width * viewBB.height) /
                (layout.viewBox.width * layout.viewBox.height),
            ),
          )
        : 1;
    const resolvedViewportColor = viewportColor(viewportAreaRatio);
    const indicator = indicatorRef.current;
    const indicatorWidth = Math.max(
      viewBB.width,
      MIN_VIEWPORT_INDICATOR_SIZE * viewScale,
    );
    const indicatorHeight = Math.max(
      viewBB.height,
      MIN_VIEWPORT_INDICATOR_SIZE * viewScale,
    );
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
        computedStyle
          .getPropertyValue("--canvas-minimap-viewport-accent")
          .trim() || markerColor,
    };
    const nextIndicatorTarget = resolvedViewportColor === void 0 ? 0 : 1;
    if (indicator.targetOpacity !== nextIndicatorTarget) {
      indicator.fromOpacity = indicator.opacity;
      indicator.targetOpacity = nextIndicatorTarget;
      indicator.startedAt = timestamp;
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
  renderFrameRef.current = (timestamp) => {
    frameRef.current = null;
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (sceneDirtyRef.current || !sceneRef.current) {
      const rebuiltScene = rebuildScene(timestamp);
      if (rebuiltScene) {
        sceneRef.current = rebuiltScene;
        sceneDirtyRef.current = false;
        graphDirtyRef.current = false;
        baseDirtyRef.current = false;
      }
    }
    const scene = sceneRef.current;
    if (!scene) return;
    const bitmapWidth = Math.max(
      1,
      Math.round(scene.elementWidth * scene.pixelRatio),
    );
    const bitmapHeight = Math.max(
      1,
      Math.round(scene.elementHeight * scene.pixelRatio),
    );
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
      const origin = animationOriginsRef.current.get(marker.key) ?? timestamp;
      const ripple = reducedMotionRef.current
        ? {
            frames: [],
            animating: false,
          }
        : getMiniMapRippleFrames(timestamp - origin, marker.continuous);
      needsAnimationFrame ||= ripple.animating;
      context.save();
      context.fillStyle = scene.markerColor;
      context.beginPath();
      context.arc(marker.center.x, marker.center.y, 3, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = scene.markerColor;
      context.lineWidth = 1.75;
      for (const frame of ripple.frames) {
        context.globalAlpha = frame.opacity;
        context.beginPath();
        context.arc(
          marker.center.x,
          marker.center.y,
          frame.radius,
          0,
          Math.PI * 2,
        );
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
      const rect = nodeToMiniMapRect(
        hoveredNode,
        scene.layout,
        MIN_SELECTED_NODE_SIZE,
      );
      context.save();
      context.globalAlpha = 0.45;
      context.fillStyle = scene.selectedColor;
      roundedRect(context, rect.x, rect.y, rect.width, rect.height, 2);
      context.fill();
      context.restore();
    }
    const indicator = indicatorRef.current;
    if (
      !reducedMotionRef.current &&
      indicator.opacity !== indicator.targetOpacity
    ) {
      const progress = Math.min(
        1,
        (timestamp - indicator.startedAt) / VIEWPORT_INDICATOR_TRANSITION_MS,
      );
      indicator.opacity =
        indicator.fromOpacity +
        (indicator.targetOpacity - indicator.fromOpacity) * progress;
      needsAnimationFrame ||= progress < 1;
    }
    if (indicator.geometry && indicator.opacity > 0) {
      context.save();
      context.globalAlpha = indicator.opacity;
      context.fillStyle = indicator.geometry.fill;
      context.strokeStyle = indicator.geometry.stroke;
      context.lineWidth =
        VIEWPORT_INDICATOR_DISPERSED_STROKE_WIDTH +
        (VIEWPORT_INDICATOR_STROKE_WIDTH -
          VIEWPORT_INDICATOR_DISPERSED_STROKE_WIDTH) *
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
    const unsubscribeCanvas = storeApi.subscribe((state, previousState) => {
      const viewportChanged =
        state.transform[0] !== previousState.transform[0] ||
        state.transform[1] !== previousState.transform[1] ||
        state.transform[2] !== previousState.transform[2] ||
        state.width !== previousState.width ||
        state.height !== previousState.height;
      const graphReferencesChanged =
        state.nodes !== previousState.nodes ||
        state.nodeLookup !== previousState.nodeLookup;
      if (
        viewportChanged &&
        !graphReferencesChanged &&
        !graphRef.current?.hasDraggingNodes
      ) {
        invalidateScene();
      } else {
        invalidateGraph();
      }
    });
    const unsubscribeRecent = recentlyAddedStore.subscribe(invalidateScene);
    const unsubscribeGenerating =
      generatingStateStore.subscribe(invalidateScene);
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
  }, [
    interactionState.flowHeight,
    interactionState.flowWidth,
    interactionState.translateExtent,
  ]);
  const hitTestNode = reactExports.useCallback((clientX, clientY) => {
    const canvas = canvasRef.current;
    const scene = sceneRef.current;
    const graph = graphRef.current;
    if (!canvas || !scene || !graph) return null;
    const bounds = canvas.getBoundingClientRect();
    const mapX = clientX - bounds.left;
    const mapY = clientY - bounds.top;
    let hitId = null;
    let hitArea = Number.POSITIVE_INFINITY;
    for (const node of graph.nodes) {
      const rect = nodeToMiniMapRect(
        node,
        scene.layout,
        MIN_SELECTED_NODE_SIZE,
      );
      if (
        mapX < rect.x - NODE_HIT_SLOP ||
        mapX > rect.x + rect.width + NODE_HIT_SLOP ||
        mapY < rect.y - NODE_HIT_SLOP ||
        mapY > rect.y + rect.height + NODE_HIT_SLOP
      ) {
        continue;
      }
      const area = rect.width * rect.height;
      if (area < hitArea) {
        hitArea = area;
        hitId = node.id;
      }
    }
    return hitId;
  }, []);
  const setHoveredNode = reactExports.useCallback(
    (nodeId) => {
      if (hoveredNodeIdRef.current === nodeId) return;
      hoveredNodeIdRef.current = nodeId;
      if (canvasRef.current)
        canvasRef.current.style.cursor = nodeId ? "pointer" : "";
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
  const handlePointerLeave = reactExports.useCallback(
    () => setHoveredNode(null),
    [setHoveredNode],
  );
  const handleClick = reactExports.useCallback(
    (event) => {
      const canvas = canvasRef.current;
      const scene = sceneRef.current;
      if (!canvas || !scene) return;
      if (onNodeSelect) {
        const nodeId = hitTestNode(event.clientX, event.clientY);
        if (nodeId) {
          onNodeSelect(
            nodeId,
            event.shiftKey || event.metaKey || event.ctrlKey,
          );
          return;
        }
      }
      const rect = canvas.getBoundingClientRect();
      const position = miniMapPointToFlow(
        {
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        },
        scene.layout,
      );
      const viewBB = scene.layout.viewBB;
      if (
        position.x >= viewBB.x &&
        position.x <= viewBB.x + viewBB.width &&
        position.y >= viewBB.y &&
        position.y <= viewBB.y + viewBB.height
      ) {
        return;
      }
      onClick(event, position);
    },
    [hitTestNode, onClick, onNodeSelect],
  );
  return (
    <Panel
      ref={panelRef}
      position={position}
      style={style}
      className="react-flow__minimap react-flow__minimap-canvas-panel"
      data-testid="rf__minimap"
    >
      <canvas
        ref={canvasRef}
        className="react-flow__minimap-canvas"
        role="img"
        aria-label={interactionState.ariaLabel ?? "Mini map"}
        onClick={handleClick}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      />
    </Panel>
  );
}
