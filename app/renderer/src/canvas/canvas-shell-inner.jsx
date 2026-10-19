// canvas-shell-inner.jsx
import { CanvasNodeType } from "./canvas-geometry.js";
import jsxRuntimeExports from "react/jsx-runtime";
import reactExports from "react";
import { useTranslation } from "react-i18next";
import { ConnectionTargetMarker } from "./connection-target.js";
import {
  Panel,
  ReactFlow,
  useConnection,
  useNodesInitialized,
  useReactFlow,
  useStore,
  useStoreApi,
} from "../vendor-fork/xyflow/react/index.js";
import { SelectionMode } from "../vendor-fork/xyflow/system/index.js";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  CanvasE2EMarkersInner,
  createGuideSlot,
  CursorIcon,
  INITIAL_GUIDE_SLOTS,
  MouseIcon,
  setAttribute,
} from "./cursor-icon.jsx";
import {
  arePropsEqual,
  DEFAULT_CANVAS_VIEWPORT_CONTROLS_PLACEMENT,
} from "./use-video-starter-preset-store.js";
import {
  applyEdgeCullingVisibility,
  computeHiddenEdgeIds,
  createAlignmentGuidesStore,
  DEFAULT_BUFFER_RATIO,
  EMPTY_GUIDES,
  getAlignmentReferenceIds,
  intersectsViewport,
  MIDDLE_DRAG_CLASS,
  MIN_EDGES_TO_CULL,
  sameMembership,
  STYLE_ELEMENT_ID,
} from "./get-alignment-reference-ids.js";
import { resolveNodeAlignmentSnap } from "./resolve-node-alignment-snap.js";
import {
  isEditableTarget,
  selectionToNormalizedBBox,
} from "../media-editing/selection-to-normalized-b-box.js";
import {
  CanvasActiveContext,
  CanvasActiveDeferredContext,
  INACTIVE_NODE_UNMOUNT_GRACE_MS,
  IsBoxSelectingContext,
  isBoxSelectingSelector,
  IsDraggingContext,
  isDraggingSelector,
  IsMultiSelectContext,
  isMultiSelectSelector,
  MEDIA_NODE_RADIUS,
  useCanvasBridge,
  useDelayedFalse,
} from "../media-editing/package.jsx";
import {
  BAR_GAP,
  BOTTOM_BAR_MAX_WIDTH,
  BOTTOM_BAR_MIN_WIDTH,
  getNodeTagRingGlowBlur,
  insertCanvasRedrawRegion,
  REDRAW_HIGHLIGHT_CSS_COLOR,
  REDRAW_HIGHLIGHT_UI_OPACITY,
  shouldRenderNodeTagRings,
  TOP_BAR_HEIGHT,
  TOP_BAR_MIN_WIDTH,
  useActiveMode,
  useAlignmentSnapPreferenceStore,
} from "./use-active-mode.js";
import {
  broadcastZoom,
  getNodeTagRingWidth,
  resolveNodeTagRingColor,
  useCanvasTagFilterActive,
  useIsCanvasModalOpen,
  useNodeTagColorApi,
} from "../infra/create-recently-added-store.js";
import {
  isMinimapViewportIndicatorVisible,
  readNodeBox,
} from "./control-points-for.js";
import {
  COLOR_FALLBACK,
  MINIMAP_POSITION_STYLES,
  VISIBLE_GRID_GAP,
} from "./minimap-position-styles.js";
import { CanvasRedrawBottomBar } from "./canvas-redraw-bottom-bar.jsx";
import { useCropViewportZoom } from "./use-crop-viewport-zoom.js";
import { useImageErase } from "../media-editing/use-image-erase.js";
import { useImageMaskPainter } from "../media-editing/use-image-mask-painter.js";
import {
  useEraseState,
  useMultiImageOverlayApi,
  useRedrawState,
} from "../media-editing/use-start-cloud-edit-from-node.js";
import {
  BAR_GAP as ERASE_BAR_GAP,
  BAR_HEIGHT,
  BAR_MIN_WIDTH,
  CanvasEraseTopBar,
  selectionsToNormalizedBBoxes,
} from "../media-editing/banana-resolution-picker.jsx";
import { CanvasEraseBottomBar } from "../media-editing/canvas-erase-bottom-bar.jsx";
import { CanvasCropOverlay } from "../media-editing/canvas-crop-overlay.jsx";
import { CanvasMoveObjectOverlay } from "./canvas-move-object-overlay.jsx";
import { CanvasOutpaintOverlay } from "./canvas-outpaint-overlay.jsx";
import { CanvasMiniMap } from "./canvas-mini-map.jsx";
import {
  commitStableZoomBucket,
  commitStableZoomTier,
  seedStableZoomBucket,
  seedStableZoomTier,
} from "./separator.jsx";
import {
  CANVAS_MAX_ZOOM,
  CANVAS_MIN_ZOOM,
} from "../infra/use-plugin-metadata-store.js";
import { EdgesCanvas } from "./edges-canvas.jsx";
import { EdgeInteractionLayer } from "./edge-interaction-layer.jsx";
function CanvasActiveProvider({ active, children }) {
  const deferredActive = useDelayedFalse(
    active,
    INACTIVE_NODE_UNMOUNT_GRACE_MS,
  );
  return (
    <CanvasActiveContext.Provider value={active}>
      <CanvasActiveDeferredContext.Provider value={deferredActive}>
        {children}
      </CanvasActiveDeferredContext.Provider>
    </CanvasActiveContext.Provider>
  );
}
function CanvasInteractionProvider({ children }) {
  const isDragging = useStore(isDraggingSelector);
  const isMultiSelect = useStore(isMultiSelectSelector);
  const isBoxSelecting = useStore(isBoxSelectingSelector);
  return (
    <IsDraggingContext.Provider value={isDragging}>
      <IsMultiSelectContext.Provider value={isMultiSelect}>
        <IsBoxSelectingContext.Provider value={isBoxSelecting}>
          {children}
        </IsBoxSelectingContext.Provider>
      </IsMultiSelectContext.Provider>
    </IsDraggingContext.Provider>
  );
}
function computeClickPanViewport(flowPoint, canvasSize, currentZoom) {
  return {
    x: canvasSize.width / 2 - flowPoint.x * currentZoom,
    y: canvasSize.height / 2 - flowPoint.y * currentZoom,
    zoom: currentZoom,
  };
}
export function getMinimapViewportColor(viewportAreaRatio) {
  return isMinimapViewportIndicatorVisible(viewportAreaRatio)
    ? "var(--canvas-minimap-viewport-fill)"
    : void 0;
}
const HEADER_HIDE_ZOOM_THRESHOLD = 0.15;
const NODE_HEADERS_HIDDEN_CLASS = "canvas-node-headers-hidden";
function isNodeHeaderHidden(zoom) {
  return zoom < HEADER_HIDE_ZOOM_THRESHOLD;
}
function NodeTagRingsCanvas({ active = true }) {
  const storeApi = useStoreApi();
  const tagColorStore = useNodeTagColorApi();
  const tagFilterActive = useCanvasTagFilterActive();
  const canvasRef = reactExports.useRef(null);
  const nodesInitialized = useNodesInitialized();
  const initLatchRef = reactExports.useRef(false);
  if (nodesInitialized) initLatchRef.current = true;
  const scheduleRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (!active) {
      scheduleRef.current = null;
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const flow = canvas.closest(".react-flow");
    if (!flow) return;
    let rafId = 0;
    let cancelled = false;
    let lastWidth = 0;
    let lastHeight = 0;
    let lastDpr = 0;
    const paint = () => {
      rafId = 0;
      if (cancelled) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const rect = flow.getBoundingClientRect();
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
      if (!shouldRenderNodeTagRings(tagFilterActive)) return;
      const tagColorState = tagColorStore.getState();
      const tagged = tagColorState.colors;
      if (tagged.size === 0) return;
      const state = storeApi.getState();
      const [tx, ty, zoom] = state.transform;
      if (!zoom || zoom <= 0) return;
      const ringWidth = getNodeTagRingWidth(zoom);
      const halfRing = ringWidth / 2;
      const ringRadius = MEDIA_NODE_RADIUS + halfRing;
      const themeStyles = getComputedStyle(flow);
      const batches = new Map();
      for (const [nodeId, color] of tagged) {
        if (!tagColorState.activeNodeIds.has(nodeId)) continue;
        const entry = state.nodeLookup.get(nodeId);
        if (!entry) continue;
        const box = readNodeBox(entry);
        if (!box) continue;
        const ringColor = resolveNodeTagRingColor(color, (token) =>
          themeStyles.getPropertyValue(token),
        );
        let batch = batches.get(ringColor);
        if (!batch) {
          batch = {
            color: ringColor,
            path: new Path2D(),
          };
          batches.set(ringColor, batch);
        }
        batch.path.roundRect(
          box.x - halfRing,
          box.y - halfRing,
          box.width + ringWidth,
          box.height + ringWidth,
          ringRadius,
        );
      }
      if (batches.size === 0) return;
      ctx.setTransform(dpr * zoom, 0, 0, dpr * zoom, dpr * tx, dpr * ty);
      ctx.lineWidth = ringWidth;
      for (const batch of batches.values()) {
        ctx.save();
        ctx.globalAlpha = 0.38;
        ctx.shadowColor = batch.color;
        ctx.shadowBlur = getNodeTagRingGlowBlur(dpr);
        ctx.strokeStyle = batch.color;
        ctx.stroke(batch.path);
        ctx.restore();
        ctx.strokeStyle = batch.color;
        ctx.stroke(batch.path);
      }
    };
    const schedule = () => {
      if (rafId !== 0) return;
      rafId = requestAnimationFrame(paint);
    };
    scheduleRef.current = schedule;
    schedule();
    const unsubStore = storeApi.subscribe(schedule);
    const unsubTagColors = tagColorStore.subscribe(schedule);
    const resizeObserver = new ResizeObserver(schedule);
    resizeObserver.observe(flow);
    const themeObserver = new MutationObserver(schedule);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style", "data-theme"],
    });
    const onWindowResize = () => schedule();
    window.addEventListener("resize", onWindowResize);
    return () => {
      cancelled = true;
      if (rafId !== 0) cancelAnimationFrame(rafId);
      unsubStore();
      unsubTagColors();
      resizeObserver.disconnect();
      themeObserver.disconnect();
      window.removeEventListener("resize", onWindowResize);
      scheduleRef.current = null;
    };
  }, [active, storeApi, tagColorStore, tagFilterActive]);
  reactExports.useEffect(() => {
    if (!active || !nodesInitialized) return;
    scheduleRef.current?.();
  }, [active, nodesInitialized]);
  return active ? (
    <canvas
      ref={canvasRef}
      className="hilo-node-tag-rings-canvas"
      aria-hidden={true}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        pointerEvents: "none",
        zIndex: 0,
      }}
    />
  ) : null;
}
const defaultCanvasStyle = {
  cursor: "var(--canvas-cursor-default)",
};
const grabCanvasStyle = {
  cursor: "grab",
};
const PAN_ON_DRAG = [1, 2];
const PAN_ON_DRAG_WITH_LEFT = [0, 1, 2];
const DELETE_KEY_CODE = ["Backspace", "Delete"];
const EMPTY_DELETE_KEY_CODE = [];
const PAN_OFF_DEBOUNCE_MS = 200;
const ZOOM_COMMIT_DEBOUNCE_MS = 220;
function ConnectingDisabledMarker({ edges }) {
  const fromNodeId = useConnection((connection) => connection.fromNode?.id ?? null);
  const disabledTargets = reactExports.useMemo(() => {
    if (!fromNodeId) return null;
    const set = new Set();
    for (const edge of edges) {
      if (edge.source === fromNodeId) set.add(edge.target);
    }
    return set;
  }, [fromNodeId, edges]);
  reactExports.useEffect(() => {
    if (!disabledTargets || disabledTargets.size === 0) return;
    const cleanups = [];
    for (const id of disabledTargets) {
      const el = document.querySelector(
        `.react-flow__node[data-id="${CSS.escape(id)}"]`,
      );
      if (!el) continue;
      el.classList.add("node-conn-disabled");
      cleanups.push(() => el.classList.remove("node-conn-disabled"));
    }
    return () => {
      for (const fn of cleanups) fn();
    };
  }, [disabledTargets]);
  return null;
}
function useSpacePan(active = true) {
  const [isSpacePressed, setIsSpacePressed] = reactExports.useState(false);
  reactExports.useEffect(() => {
    if (!active) return;
    const onKeyDown = (keyboardEvent) => {
      if (keyboardEvent.code !== "Space" || keyboardEvent.repeat) return;
      if (isEditableTarget(keyboardEvent.target)) return;
      keyboardEvent.preventDefault();
      setIsSpacePressed(true);
    };
    const onKeyUp = (keyboardEvent) => {
      if (keyboardEvent.code !== "Space") return;
      setIsSpacePressed(false);
    };
    const onBlur = () => setIsSpacePressed(false);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      setIsSpacePressed(false);
    };
  }, [active]);
  return isSpacePressed;
}
function useStableViewportOnContainerShift(
  containerRef,
  active = true,
  layoutRelocationKey,
) {
  const reactFlow = useReactFlow();
  reactExports.useLayoutEffect(() => {
    if (!active) return;
    const el = containerRef.current;
    if (!el) return;
    if (typeof ResizeObserver === "undefined") return;
    let lastLeft = el.getBoundingClientRect().left;
    const ro = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect();
      const dx = rect.left - lastLeft;
      if (dx === 0) return;
      lastLeft = rect.left;
      const viewportState = reactFlow.getViewport();
      reactFlow.setViewport({
        ...viewportState,
        x: viewportState.x - dx,
      });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [active, containerRef, layoutRelocationKey, reactFlow]);
}
const CanvasE2EMarkers = reactExports.memo(
  CanvasE2EMarkersInner,
  arePropsEqual,
);
function EmptyCanvasHint() {
  const { t: translate } = useTranslation();
  return (
    <Panel
      position="top-center"
      className="canvas-onboarding-panel pointer-events-none select-none"
    >
      <section
        aria-label={translate("canvas.emptyHint.ariaLabel", {
          defaultValue: "Canvas onboarding",
        })}
        className="canvas-onboarding-ui-layer"
      >
        <div className="canvas-onboarding-primary-anchor">
          <div className="canvas-onboarding-primary-line">
            <CursorIcon />
            <span className="canvas-onboarding-primary-action">
              {translate("canvas.emptyHint.primaryAction", {
                defaultValue: "Double-click canvas",
              })}
            </span>
            <span className="canvas-onboarding-primary-result">
              {translate("canvas.emptyHint.primaryResult", {
                defaultValue: "to freely create nodes",
              })}
            </span>
          </div>
          <div className="canvas-onboarding-secondary-line">
            <span className="canvas-onboarding-secondary-group">
              <span>
                {translate("canvas.emptyHint.spacePrefix", {
                  defaultValue: "Hold",
                })}
              </span>
              <span className="canvas-onboarding-space-key">
                [
                {translate("canvas.emptyHint.kbd.space", {
                  defaultValue: "Space",
                })}
                ]
              </span>
              <span>
                {translate("canvas.emptyHint.spaceSuffix", {
                  defaultValue: "to move the canvas",
                })}
              </span>
            </span>
            <span className="canvas-onboarding-secondary-group">
              <span>
                {translate("canvas.emptyHint.scrollPrefix", {
                  defaultValue: "Scroll",
                })}
              </span>
              <MouseIcon />
              <span>
                {translate("canvas.emptyHint.zoomSuffix", {
                  defaultValue: "to zoom the canvas",
                })}
              </span>
            </span>
          </div>
        </div>
      </section>
    </Panel>
  );
}
const NodeAlignmentGuides = reactExports.memo(function NodeAlignmentGuides({
  store,
}) {
  const svgRef = reactExports.useRef(null);
  reactExports.useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const slots = Array.from(
      {
        length: INITIAL_GUIDE_SLOTS,
      },
      () => createGuideSlot(svg),
    );
    const render = ({ guides, transform: [tx, ty, zoom] }) => {
      const display = guides.length > 0 ? "" : "none";
      if (svg.style.display !== display) svg.style.display = display;
      while (slots.length < guides.length) slots.push(createGuideSlot(svg));
      for (let index = 0; index < slots.length; index++) {
        const slot = slots[index];
        const guide = guides[index];
        if (!guide) {
          if (slot.group.style.display !== "none") {
            slot.group.style.display = "none";
            slot.group.removeAttribute("data-guide-kind");
          }
          continue;
        }
        if (slot.group.style.display === "none") slot.group.style.display = "";
        setAttribute(slot.group, "data-guide-kind", guide.kind);
        const x1 = guide.x1 * zoom + tx;
        const y1 = guide.y1 * zoom + ty;
        const x2 = guide.x2 * zoom + tx;
        const endY = guide.y2 * zoom + ty;
        const horizontal = y1 === endY;
        const cap = 3;
        const alignment = guide.kind === "alignment";
        setAttribute(
          slot.line,
          "x1",
          alignment && horizontal ? "0%" : String(x1),
        );
        setAttribute(
          slot.line,
          "y1",
          alignment && !horizontal ? "0%" : String(y1),
        );
        setAttribute(
          slot.line,
          "x2",
          alignment && horizontal ? "100%" : String(x2),
        );
        setAttribute(
          slot.line,
          "y2",
          alignment && !horizontal ? "100%" : String(endY),
        );
        setAttribute(
          slot.caps,
          "d",
          alignment
            ? ""
            : horizontal
              ? `M${x1},${y1 - cap}v${cap * 2}M${x2},${endY - cap}v${cap * 2}`
              : `M${x1 - cap},${y1}h${cap * 2}M${x2 - cap},${endY}h${cap * 2}`,
        );
        setAttribute(
          slot.label,
          "x",
          String((x1 + x2) / 2 + (horizontal ? 0 : 8)),
        );
        setAttribute(
          slot.label,
          "y",
          String((y1 + endY) / 2 - (horizontal ? 7 : 0)),
        );
        const text =
          guide.distance === void 0
            ? ""
            : String(Math.round(guide.distance * 100) / 100);
        if (slot.text.data !== text) slot.text.data = text;
      }
    };
    const unsubscribe = store.subscribe(render);
    render(store.getState());
    return () => {
      unsubscribe();
      svg.replaceChildren();
      svg.style.display = "none";
    };
  }, [store]);
  return (
    <svg
      ref={svgRef}
      className="canvas-alignment-guides"
      data-action-ui-id="canvas.alignment-guides"
      aria-hidden="true"
      style={{
        display: "none",
      }}
    />
  );
});
const CanvasEraseOverlay = reactExports.memo(function CanvasEraseOverlay() {
  const { meta, cancelErase, erasingNodeId } = useEraseState();
  const { onNodeAction } = useCanvasBridge();
  const enterTimeRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (erasingNodeId) {
      enterTimeRef.current = Date.now();
    } else {
      enterTimeRef.current = null;
    }
  }, [erasingNodeId]);
  useCropViewportZoom(meta);
  const transform = useStore((state) => state.transform);
  const [vpX, vpY, vpZoom] = transform;
  const [confirming, setConfirming] = reactExports.useState(false);
  const [resolution, setResolution] = reactExports.useState("2K");
  const eraseApi = useImageErase();
  const {
    selections,
    brushSize,
    setBrushSize,
    tool,
    setTool,
    undoStroke,
    redoStroke,
    hasStrokes,
    canRedo,
  } = eraseApi;
  const imagePos = reactExports.useMemo(() => {
    if (!meta) return null;
    return {
      x: meta.nodeFlowX * vpZoom + vpX,
      y: meta.nodeFlowY * vpZoom + vpY,
      w: meta.nodeWidth * vpZoom,
      h: meta.nodeHeight * vpZoom,
    };
  }, [meta, vpX, vpY, vpZoom]);
  const trackedCancelErase = reactExports.useCallback(() => {
    if (onNodeAction && erasingNodeId && !confirming) {
      const durationMs = enterTimeRef.current
        ? Date.now() - enterTimeRef.current
        : void 0;
      try {
        onNodeAction({
          nodeId: erasingNodeId,
          nodeType: "image",
          action: "erase",
          phase: "abandon",
          interaction: "opens_mode",
          durationMs,
          hadProgress: selections.length > 0,
        });
      } catch {}
    }
    cancelErase();
  }, [onNodeAction, erasingNodeId, confirming, selections.length, cancelErase]);
  const {
    paintRectRef,
    maskCanvasRef,
    paintRectHandlers,
    backdropHandlers,
    cursorStyle,
    maskOverlayOpacity,
  } = useImageMaskPainter({
    meta,
    imagePos,
    onCancel: trackedCancelErase,
    toolApi: eraseApi,
  });
  const handleConfirm = reactExports.useCallback(() => {
    if (confirming || !meta || selections.length === 0) return;
    const bboxes = selectionsToNormalizedBBoxes(selections);
    if (bboxes.length === 0) {
      trackedCancelErase();
      return;
    }
    setConfirming(true);
    if (onNodeAction && erasingNodeId) {
      const durationMs = enterTimeRef.current
        ? Date.now() - enterTimeRef.current
        : void 0;
      try {
        onNodeAction({
          nodeId: erasingNodeId,
          nodeType: "image",
          action: "erase",
          phase: "apply",
          interaction: "opens_mode",
          durationMs,
          toolSpecific: {
            resolution,
            regionCount: bboxes.length,
          },
        });
      } catch {}
    }
    const { onConfirm, originalWidth, originalHeight } = meta;
    void onConfirm({
      bboxes,
      aspectRatio:
        originalWidth > 0 && originalHeight > 0
          ? originalWidth / originalHeight
          : void 0,
      resolution,
    }).catch(() => {});
    cancelErase();
  }, [
    confirming,
    meta,
    selections,
    resolution,
    cancelErase,
    trackedCancelErase,
    onNodeAction,
    erasingNodeId,
  ]);
  if (!meta || !imagePos) return null;
  const barContainerWidth = Math.max(imagePos.w, BAR_MIN_WIDTH);
  const barContainerLeft = imagePos.x + (imagePos.w - barContainerWidth) / 2;
  return (
    <div className="absolute inset-0 z-50 pointer-events-none animate-[crop-panel-in_0.2s_ease-out]">
      <div
        className="absolute inset-0 pointer-events-auto"
        {...backdropHandlers}
      />
      <div
        ref={paintRectRef}
        className="absolute pointer-events-auto select-none touch-none"
        style={{
          transform: `translate3d(${imagePos.x}px, ${imagePos.y}px, 0)`,
          width: imagePos.w,
          height: imagePos.h,
          top: 0,
          left: 0,
          willChange: "transform",
          ...cursorStyle,
        }}
        {...paintRectHandlers}
      >
        <canvas
          ref={maskCanvasRef}
          className="pointer-events-none absolute left-0 top-0"
          style={{
            opacity: maskOverlayOpacity,
          }}
        />
      </div>
      <div
        className="absolute pointer-events-auto flex justify-center"
        style={{
          transform: `translate3d(${barContainerLeft}px, ${imagePos.y - BAR_HEIGHT - ERASE_BAR_GAP}px, 0)`,
          width: barContainerWidth,
          height: BAR_HEIGHT,
          top: 0,
          left: 0,
          willChange: "transform",
        }}
      >
        <CanvasEraseTopBar
          tool={tool}
          onToolChange={setTool}
          brushSize={brushSize}
          onBrushSizeChange={setBrushSize}
          hasStrokes={hasStrokes}
          canRedo={canRedo}
          onUndo={undoStroke}
          onRedo={redoStroke}
          onClose={trackedCancelErase}
        />
      </div>
      <div
        className="absolute pointer-events-auto flex justify-center"
        style={{
          transform: `translate3d(${barContainerLeft}px, ${imagePos.y + imagePos.h + ERASE_BAR_GAP}px, 0)`,
          width: barContainerWidth,
          height: BAR_HEIGHT,
          top: 0,
          left: 0,
          willChange: "transform",
        }}
      >
        <CanvasEraseBottomBar
          onCancel={trackedCancelErase}
          onConfirm={handleConfirm}
          confirming={confirming}
          canConfirm={hasStrokes}
          resolution={resolution}
          onResolutionChange={setResolution}
        />
      </div>
    </div>
  );
});
const CanvasRedrawOverlay = reactExports.memo(function CanvasRedrawOverlay() {
  const { meta, cancelRedraw, redrawingNodeId } = useRedrawState();
  const { onNodeAction } = useCanvasBridge();
  const enterTimeRef = reactExports.useRef(Date.now());
  const bottomBarRef = reactExports.useRef(null);
  const [bottomBarHeight, setBottomBarHeight] = reactExports.useState(0);
  reactExports.useEffect(() => {
    const node = bottomBarRef.current;
    if (!node) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const height = entry.contentRect.height;
        setBottomBarHeight((prev) => (Math.abs(prev - height) > 0.5 ? height : prev));
      }
    });
    ro.observe(node);
    return () => ro.disconnect();
  }, []);
  const composerMeasured = bottomBarHeight > 0;
  useCropViewportZoom(
    composerMeasured ? meta : null,
    composerMeasured ? bottomBarHeight + BAR_GAP : 0,
  );
  const transform = useStore((state) => state.transform);
  const [vpX, vpY, vpZoom] = transform;
  const [resolution, setResolution] = reactExports.useState("2K");
  const sentRef = reactExports.useRef(false);
  const eraseApi = useImageErase();
  const {
    selections,
    brushSize,
    setBrushSize,
    tool,
    setTool,
    undoStroke,
    redoStroke,
    canRedo,
  } = eraseApi;
  const editorRef = reactExports.useRef(null);
  const trackedCancelRedraw = reactExports.useCallback(() => {
    if (onNodeAction && redrawingNodeId && !sentRef.current) {
      try {
        onNodeAction({
          nodeId: redrawingNodeId,
          nodeType: "image",
          action: "redraw",
          phase: "abandon",
          interaction: "opens_mode",
          durationMs: Date.now() - enterTimeRef.current,
          hadProgress: selections.length > 0,
        });
      } catch {}
    }
    cancelRedraw();
  }, [onNodeAction, redrawingNodeId, selections.length, cancelRedraw]);
  const imagePos = reactExports.useMemo(() => {
    if (!meta) return null;
    return {
      x: meta.nodeFlowX * vpZoom + vpX,
      y: meta.nodeFlowY * vpZoom + vpY,
      w: meta.nodeWidth * vpZoom,
      h: meta.nodeHeight * vpZoom,
    };
  }, [meta, vpX, vpY, vpZoom]);
  const {
    paintRectRef,
    maskCanvasRef,
    paintRectHandlers,
    backdropHandlers,
    cursorStyle,
    maskOverlayOpacity,
  } = useImageMaskPainter({
    meta,
    imagePos,
    onCancel: trackedCancelRedraw,
    toolApi: eraseApi,
    onSelectionComplete: (rect) => {
      const editor = editorRef.current;
      if (editor && !editor.isDestroyed) {
        insertCanvasRedrawRegion(editor, selectionToNormalizedBBox(rect));
      }
    },
    // Paint with the exact burn-in highlight (color + alpha) so what the user
    // sees on canvas IS the marked image submitted to the model.
    brushColor: REDRAW_HIGHLIGHT_CSS_COLOR,
    overlayOpacity: REDRAW_HIGHLIGHT_UI_OPACITY,
  });
  const handleSend = reactExports.useCallback(
    (prompt, attachments) => {
      if (sentRef.current || !meta || selections.length === 0) return;
      sentRef.current = true;
      if (onNodeAction && redrawingNodeId) {
        try {
          onNodeAction({
            nodeId: redrawingNodeId,
            nodeType: "image",
            action: "redraw",
            phase: "apply",
            interaction: "opens_mode",
            durationMs: Date.now() - enterTimeRef.current,
            toolSpecific: {
              resolution,
              prompt_length: prompt.length,
              attachment_count: attachments.length,
            },
          });
        } catch {}
      }
      const { onConfirm, originalWidth, originalHeight } = meta;
      const aspectRatio =
        originalWidth > 0 && originalHeight > 0
          ? originalWidth / originalHeight
          : void 0;
      cancelRedraw();
      void onConfirm({
        prompt,
        attachments,
        bbox: selectionToNormalizedBBox(selections[0]),
        resolution,
        aspectRatio,
      }).catch(() => {});
    },
    [
      meta,
      selections,
      resolution,
      cancelRedraw,
      onNodeAction,
      redrawingNodeId,
    ],
  );
  if (!meta || !imagePos) return null;
  const topBarWidth = Math.max(imagePos.w, TOP_BAR_MIN_WIDTH);
  const topBarLeft = imagePos.x + (imagePos.w - topBarWidth) / 2;
  const bottomBarWidth = Math.max(
    BOTTOM_BAR_MIN_WIDTH,
    Math.min(BOTTOM_BAR_MAX_WIDTH, imagePos.w),
  );
  const bottomBarLeft = imagePos.x + (imagePos.w - bottomBarWidth) / 2;
  return (
    <div className="absolute inset-0 z-50 pointer-events-none animate-[crop-panel-in_0.2s_ease-out]">
      <div
        className="absolute inset-0 pointer-events-auto"
        {...backdropHandlers}
      />
      <div
        ref={paintRectRef}
        className="absolute pointer-events-auto select-none touch-none"
        style={{
          transform: `translate3d(${imagePos.x}px, ${imagePos.y}px, 0)`,
          width: imagePos.w,
          height: imagePos.h,
          top: 0,
          left: 0,
          willChange: "transform",
          ...cursorStyle,
        }}
        {...paintRectHandlers}
      >
        <canvas
          ref={maskCanvasRef}
          className="pointer-events-none absolute left-0 top-0"
          style={{
            opacity: maskOverlayOpacity,
          }}
        />
      </div>
      <div
        className="absolute pointer-events-auto flex justify-center"
        style={{
          transform: `translate3d(${topBarLeft}px, ${imagePos.y - TOP_BAR_HEIGHT - BAR_GAP}px, 0)`,
          width: topBarWidth,
          height: TOP_BAR_HEIGHT,
          top: 0,
          left: 0,
          willChange: "transform",
        }}
      >
        <CanvasEraseTopBar
          tool={tool}
          onToolChange={setTool}
          brushSize={brushSize}
          onBrushSizeChange={setBrushSize}
          hasStrokes={selections.length > 0}
          canRedo={canRedo}
          onUndo={undoStroke}
          onRedo={redoStroke}
          onClose={trackedCancelRedraw}
        />
      </div>
      <div
        ref={bottomBarRef}
        className="absolute pointer-events-auto"
        style={{
          left: bottomBarLeft,
          top: imagePos.y + imagePos.h + BAR_GAP,
          width: bottomBarWidth,
        }}
      >
        <CanvasRedrawBottomBar
          hasRegions={selections.length > 0}
          onEditorReady={(editor) => {
            editorRef.current = editor;
          }}
          submitting={false}
          onSend={handleSend}
          resolution={resolution}
          onResolutionChange={setResolution}
        />
      </div>
    </div>
  );
});
function getCanvasMinimapPositionStyle(placement) {
  return MINIMAP_POSITION_STYLES[placement];
}
export const DOT_RADIUS = 1;
export const MIN_VISIBLE_GRID_ZOOM = 0.5;
export function getVisibleGridStart(visibleMin) {
  return Math.floor(visibleMin / VISIBLE_GRID_GAP) * VISIBLE_GRID_GAP;
}
function readDotColor(host) {
  const raw = getComputedStyle(host)
    .getPropertyValue("--canvas-bg-dot")
    .trim();
  return raw || COLOR_FALLBACK;
}
function BackgroundCanvas({ active = true, variant = "dots" }) {
  const storeApi = useStoreApi();
  const canvasRef = reactExports.useRef(null);
  const variantRef = reactExports.useRef(variant);
  const scheduleRef = reactExports.useRef(null);
  variantRef.current = variant;
  reactExports.useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const flow = canvas.closest(".react-flow");
    if (!flow) return;
    let rafId = 0;
    let lastWidth = 0;
    let lastHeight = 0;
    let lastDpr = 0;
    let color = readDotColor(flow);
    const paint = () => {
      rafId = 0;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const rect = flow.getBoundingClientRect();
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
      const state = storeApi.getState();
      const [tx, ty, zoom] = state.transform;
      if (zoom <= MIN_VISIBLE_GRID_ZOOM) return;
      ctx.setTransform(dpr * zoom, 0, 0, dpr * zoom, dpr * tx, dpr * ty);
      ctx.fillStyle = color;
      const visMinX = -tx / zoom;
      const visMinY = -ty / zoom;
      const visMaxX = (cssW - tx) / zoom;
      const visMaxY = (cssH - ty) / zoom;
      const startX = getVisibleGridStart(visMinX);
      const startY = getVisibleGridStart(visMinY);
      if (variantRef.current === "grid") {
        const lineWidth = 0.5 / zoom;
        for (let gridX = startX; gridX <= visMaxX; gridX += VISIBLE_GRID_GAP) {
          ctx.fillRect(gridX, visMinY, lineWidth, visMaxY - visMinY);
        }
        for (let gridY = startY; gridY <= visMaxY; gridY += VISIBLE_GRID_GAP) {
          ctx.fillRect(visMinX, gridY, visMaxX - visMinX, lineWidth);
        }
        return;
      }
      ctx.beginPath();
      for (let gridX = startX; gridX <= visMaxX; gridX += VISIBLE_GRID_GAP) {
        for (let gridY = startY; gridY <= visMaxY; gridY += VISIBLE_GRID_GAP) {
          ctx.moveTo(gridX + DOT_RADIUS, gridY);
          ctx.arc(gridX, gridY, DOT_RADIUS, 0, Math.PI * 2);
        }
      }
      ctx.fill();
    };
    const schedule = () => {
      if (rafId !== 0) return;
      rafId = requestAnimationFrame(paint);
    };
    scheduleRef.current = schedule;
    const themeObserver = new MutationObserver(() => {
      color = readDotColor(flow);
      schedule();
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style", "data-theme"],
    });
    schedule();
    let prevTransform = storeApi.getState().transform;
    const unsubStore = storeApi.subscribe(() => {
      const next = storeApi.getState().transform;
      if (next === prevTransform) return;
      prevTransform = next;
      schedule();
    });
    const resizeObserver = new ResizeObserver(schedule);
    resizeObserver.observe(flow);
    const dprMql = window.matchMedia(
      `(resolution: ${window.devicePixelRatio}dppx)`,
    );
    const onDprChange = () => schedule();
    dprMql.addEventListener("change", onDprChange);
    return () => {
      if (rafId !== 0) cancelAnimationFrame(rafId);
      scheduleRef.current = null;
      themeObserver.disconnect();
      unsubStore();
      resizeObserver.disconnect();
      dprMql.removeEventListener("change", onDprChange);
    };
  }, [active, storeApi]);
  reactExports.useEffect(() => {
    scheduleRef.current?.();
  }, [active, variant]);
  return active ? (
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
function useEdgeCulling(edges, options) {
  const bufferRatio = options?.bufferRatio ?? DEFAULT_BUFFER_RATIO;
  const minEdges = options?.minEdges ?? MIN_EDGES_TO_CULL;
  const disabled = options?.disabled ?? false;
  const active = options?.active ?? true;
  const storeApi = useStoreApi();
  const emptyHiddenRef = reactExports.useRef(new Set());
  const [hiddenIds, setHiddenIds] = reactExports.useState(
    emptyHiddenRef.current,
  );
  const edgesRef = reactExports.useRef(edges);
  edgesRef.current = edges;
  const optsRef = reactExports.useRef({
    bufferRatio,
    minEdges,
    disabled,
  });
  optsRef.current = {
    bufferRatio,
    minEdges,
    disabled,
  };
  reactExports.useEffect(() => {
    if (!active) {
      setHiddenIds(emptyHiddenRef.current);
      return;
    }
    let rafId = 0;
    let cancelled = false;
    const recompute = () => {
      rafId = 0;
      if (cancelled) return;
      const opts = optsRef.current;
      const list = edgesRef.current;
      let next;
      if (opts.disabled || list.length < opts.minEdges) {
        next = emptyHiddenRef.current;
      } else {
        const state = storeApi.getState();
        next = computeHiddenEdgeIds(state, list, opts.bufferRatio);
      }
      setHiddenIds((prev) => (sameMembership(prev, next) ? prev : next));
    };
    recompute();
    const unsubscribe = storeApi.subscribe(() => {
      if (rafId !== 0) return;
      rafId = requestAnimationFrame(recompute);
    });
    return () => {
      cancelled = true;
      if (rafId !== 0) cancelAnimationFrame(rafId);
      unsubscribe();
    };
  }, [active, storeApi]);
  reactExports.useEffect(() => {
    if (!active) {
      setHiddenIds(emptyHiddenRef.current);
      return;
    }
    const opts = optsRef.current;
    let next;
    if (opts.disabled || edges.length < opts.minEdges) {
      next = emptyHiddenRef.current;
    } else {
      const state = storeApi.getState();
      next = computeHiddenEdgeIds(state, edges, opts.bufferRatio);
    }
    setHiddenIds((prev) => (sameMembership(prev, next) ? prev : next));
  }, [active, edges, storeApi]);
  return reactExports.useMemo(
    () => applyEdgeCullingVisibility(edges, hiddenIds),
    [edges, hiddenIds],
  );
}
function useMiddleButtonPanCursor(active = true) {
  reactExports.useEffect(() => {
    if (!active) return;
    let isDragging = false;
    const ensureStyle = () => {
      if (document.getElementById(STYLE_ELEMENT_ID)) return;
      const style = document.createElement("style");
      style.id = STYLE_ELEMENT_ID;
      style.textContent = `body.${MIDDLE_DRAG_CLASS}, body.${MIDDLE_DRAG_CLASS} .react-flow__pane { cursor: grabbing !important; }`;
      document.head.appendChild(style);
    };
    const handleDown = (event) => {
      if (event.button !== 1) return;
      const target = event.target;
      if (!target?.closest(".react-flow__pane")) return;
      event.preventDefault();
      isDragging = true;
      ensureStyle();
      document.body.classList.add(MIDDLE_DRAG_CLASS);
    };
    const stop = () => {
      if (!isDragging) return;
      isDragging = false;
      document.body.classList.remove(MIDDLE_DRAG_CLASS);
    };
    window.addEventListener("mousedown", handleDown);
    window.addEventListener("mouseup", stop);
    window.addEventListener("blur", stop);
    return () => {
      window.removeEventListener("mousedown", handleDown);
      window.removeEventListener("mouseup", stop);
      window.removeEventListener("blur", stop);
      document.body.classList.remove(MIDDLE_DRAG_CLASS);
      document.getElementById(STYLE_ELEMENT_ID)?.remove();
    };
  }, [active]);
}
function useNodeAlignmentSnap(enabled) {
  const flowStore = useStoreApi();
  const guidesStore = reactExports.useMemo(createAlignmentGuidesStore, []);
  const session = reactExports.useRef(null);
  const clear = reactExports.useCallback(() => {
    session.current = null;
    if (guidesStore.getState().guides.length > 0) {
      guidesStore.setState({
        guides: EMPTY_GUIDES,
      });
    }
  }, [guidesStore]);
  const resolve = reactExports.useCallback(
    (input) => {
      if (!enabled) {
        clear();
        return void 0;
      }
      const state = flowStore.getState();
      if (session.current?.source !== input.referenceBounds) {
        session.current = {
          source: input.referenceBounds,
          referenceIds: getAlignmentReferenceIds(
            Array.from(state.nodeLookup.values(), (node) => ({
              id: node.id,
              parentId: node.parentId,
              type: node.type,
              data: node.data,
              hidden: node.hidden,
              collapsed: node.className?.includes("canvas-group-collapsed"),
              ...node.internals.positionAbsolute,
              width: node.measured.width ?? 0,
              height: node.measured.height ?? 0,
            })),
            input.draggedIds,
          ),
          locks: {},
        };
      }
      const [translateX, translateY, zoom] = state.transform;
      const viewport = {
        x: -translateX / zoom,
        y: -translateY / zoom,
        width: state.width / zoom,
        height: state.height / zoom,
      };
      const references = [];
      const bounds = {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
      };
      for (const id of session.current.referenceIds) {
        const node = state.nodeLookup.get(id);
        if (
          !node ||
          node.hidden ||
          node.className?.includes("canvas-group-collapsed")
        )
          continue;
        bounds.x = node.internals.positionAbsolute.x;
        bounds.y = node.internals.positionAbsolute.y;
        bounds.width = node.measured.width ?? 0;
        bounds.height = node.measured.height ?? 0;
        if (intersectsViewport(bounds, viewport))
          references.push({
            id,
            ...bounds,
          });
      }
      const result = resolveNodeAlignmentSnap(
        {
          movingBounds: input.movingBounds,
          references,
          viewport,
          zoom,
          bypass: input.bypass,
        },
        session.current.locks,
      );
      session.current.locks = result.locks;
      if (
        result.guides.length > 0 ||
        guidesStore.getState().guides.length > 0
      ) {
        guidesStore.setState({
          guides: result.guides,
          transform: state.transform,
        });
      }
      return {
        delta: result.delta,
      };
    },
    [clear, enabled, flowStore, guidesStore],
  );
  reactExports.useEffect(() => {
    if (!enabled) clear();
    window.addEventListener("blur", clear);
    const unsubscribe = flowStore.subscribe((state, previous) => {
      if (
        state.transform !== previous.transform &&
        guidesStore.getState().guides.length > 0
      ) {
        guidesStore.setState({
          guides: EMPTY_GUIDES,
        });
      }
    });
    return () => {
      window.removeEventListener("blur", clear);
      unsubscribe();
      clear();
    };
  }, [clear, enabled, flowStore, guidesStore]);
  return {
    resolve,
    clear,
    guidesStore,
  };
}
function CanvasModeLayers() {
  const mode = useActiveMode();
  return (
    <>
      {mode.isCropping && <CanvasCropOverlay />}
      {mode.isOutpainting && <CanvasOutpaintOverlay />}
      {mode.isErasing && <CanvasEraseOverlay />}
      {mode.isRedrawing && <CanvasRedrawOverlay />}
      {mode.isMovingObject && <CanvasMoveObjectOverlay />}
    </>
  );
}
export function CanvasShellInner({
  nodes,
  edges,
  registry,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onConnectEnd,
  onNodeDrag,
  onNodeDragStop,
  onSelectionChange,
  onPaneClick,
  onNodeClick,
  onMinimapNodeSelect,
  onNodeContextMenu,
  onSelectionContextMenu,
  minimap = true,
  edgesVisible = true,
  background = "dots",
  toolbarPlacement = DEFAULT_CANVAS_VIEWPORT_CONTROLS_PLACEMENT,
  stickerMode = false,
  handTool = false,
  children,
  active = true,
  layoutRelocationKey,
  onViewportChangeEnd,
}) {
  const registryVersion = registry.getVersion();
  const [selectedCount, setSelectedCount] = reactExports.useState(0);
  const storeApi = useStoreApi();
  const activeMode = useActiveMode();
  const isModalOpen = useIsCanvasModalOpen();
  const showBackgroundGrid = useStore((state) => state.transform[2] > 0.5);
  const culledEdges = useEdgeCulling(edges, {
    active,
  });
  const interactionsSuspended = activeMode.hasViewportLock || isModalOpen;
  const nodeInteractionsSuspended =
    interactionsSuspended || activeMode.isOutpainting;
  const isSpacePanning = useSpacePan(active);
  const isHandPanning = handTool || isSpacePanning;
  const alignmentSnapEnabled = useAlignmentSnapPreferenceStore(
    (state) => state.enabled,
  );
  const alignmentSnap = useNodeAlignmentSnap(
    alignmentSnapEnabled &&
      active &&
      !nodeInteractionsSuspended &&
      !isHandPanning &&
      !stickerMode,
  );
  useMiddleButtonPanCursor(active);
  const isAnyOverlayActive = activeMode.isAnyActive;
  const isConnecting = useConnection((connection) => connection.inProgress);
  const reactFlow = useReactFlow();
  const handleMinimapClick = reactExports.useCallback(
    (_event, position) => {
      const { zoom } = reactFlow.getViewport();
      const { width, height } = storeApi.getState();
      const target = computeClickPanViewport(
        position,
        {
          width,
          height,
        },
        zoom,
      );
      void reactFlow.setViewport(target, {
        duration: 250,
        interpolate: "linear",
      });
    },
    [reactFlow, storeApi],
  );
  const existingEdgeKeys = reactExports.useMemo(() => {
    const set = new Set();
    for (const edge of edges) set.add(`${edge.source}->${edge.target}`);
    return set;
  }, [edges]);
  const isValidConnection = reactExports.useCallback(
    (conn) => {
      if (!conn.target || conn.source === conn.target) return false;
      if (existingEdgeKeys.has(`${conn.source}->${conn.target}`)) return false;
      const lookup = storeApi.getState().nodeLookup;
      if (lookup.get(conn.source)?.type === CanvasNodeType.Group) return false;
      if (lookup.get(conn.target)?.type === CanvasNodeType.Group) return false;
      return true;
    },
    [existingEdgeKeys, storeApi],
  );
  const nodeTypes = reactExports.useMemo(
    () => registry.getNodeComponentMap(),
    [registry, registryVersion],
  );
  const edgeTypes = reactExports.useMemo(
    () => registry.getEdgeComponentMap(),
    [registry, registryVersion],
  );
  const handleNodeDragStop = reactExports.useCallback(
    (_event, _node, draggedNodes) => {
      onNodeDragStop?.(
        draggedNodes.map((node) => ({
          id: node.id,
          position: node.position,
        })),
      );
    },
    [onNodeDragStop],
  );
  const handleSelectionChange = reactExports.useCallback(
    ({ nodes: selectedNodes }) => {
      setSelectedCount(selectedNodes.length);
      onSelectionChange?.(selectedNodes.map((node) => node.id));
    },
    [onSelectionChange],
  );
  const multiImageOverlayStore = useMultiImageOverlayApi();
  const handlePaneClick = reactExports.useCallback(
    (event) => {
      activeMode.cancelDismissibleMode();
      multiImageOverlayStore.getState().closeAll();
      onPaneClick?.(event);
    },
    [activeMode, multiImageOverlayStore, onPaneClick],
  );
  const containerRef = reactExports.useRef(null);
  const syncNodeHeaderVisibility = reactExports.useCallback((zoom) => {
    const container = containerRef.current;
    if (!container) return;
    const hidden = isNodeHeaderHidden(zoom);
    if (container.classList.contains(NODE_HEADERS_HIDDEN_CLASS) === hidden)
      return;
    container.classList.toggle(NODE_HEADERS_HIDDEN_CLASS, hidden);
  }, []);
  const panningOffTimerRef = reactExports.useRef(null);
  const setPanning = reactExports.useCallback((active) => {
    const el = containerRef.current;
    if (!el) return;
    if (active) {
      if (panningOffTimerRef.current !== null) {
        clearTimeout(panningOffTimerRef.current);
        panningOffTimerRef.current = null;
      }
      el.classList.add("canvas-panning");
      return;
    }
    if (panningOffTimerRef.current !== null)
      clearTimeout(panningOffTimerRef.current);
    panningOffTimerRef.current = setTimeout(() => {
      containerRef.current?.classList.remove("canvas-panning");
      panningOffTimerRef.current = null;
    }, PAN_OFF_DEBOUNCE_MS);
  }, []);
  const clearPanningNow = reactExports.useCallback(() => {
    if (panningOffTimerRef.current !== null) {
      clearTimeout(panningOffTimerRef.current);
      panningOffTimerRef.current = null;
    }
    containerRef.current?.classList.remove("canvas-panning");
  }, []);
  const gestureRef = reactExports.useRef({
    kind: "idle",
    startZoom: null,
  });
  const zoomCommitTimerRef = reactExports.useRef(null);
  const commitZoomDebounced = reactExports.useCallback((zoom) => {
    if (zoomCommitTimerRef.current !== null)
      clearTimeout(zoomCommitTimerRef.current);
    zoomCommitTimerRef.current = setTimeout(() => {
      zoomCommitTimerRef.current = null;
      commitStableZoomTier(zoom);
      commitStableZoomBucket(zoom);
    }, ZOOM_COMMIT_DEBOUNCE_MS);
  }, []);
  const handleMoveStart = reactExports.useCallback(
    (_event, viewport) => {
      gestureRef.current = {
        kind: "pan",
        startZoom: viewport.zoom,
      };
      setPanning(true);
    },
    [setPanning],
  );
  const handleMove = reactExports.useCallback(
    (_event, viewport) => {
      syncNodeHeaderVisibility(viewport.zoom);
      const gesture = gestureRef.current;
      if (gesture.kind !== "pan") return;
      if (gesture.startZoom !== null && viewport.zoom !== gesture.startZoom) {
        gestureRef.current = {
          kind: "zoom",
          startZoom: gesture.startZoom,
        };
        clearPanningNow();
      }
    },
    [clearPanningNow, syncNodeHeaderVisibility],
  );
  const handleMoveEnd = reactExports.useCallback(
    (_event, viewport) => {
      commitZoomDebounced(viewport.zoom);
      onViewportChangeEnd?.(viewport);
      const wasZoom = gestureRef.current.kind === "zoom";
      gestureRef.current = {
        kind: "idle",
        startZoom: null,
      };
      if (wasZoom) return;
      setPanning(false);
    },
    [setPanning, commitZoomDebounced, onViewportChangeEnd],
  );
  const handleInit = reactExports.useCallback(
    (instance) => {
      const zoom = instance.getViewport().zoom;
      syncNodeHeaderVisibility(zoom);
      seedStableZoomTier(zoom);
      seedStableZoomBucket(zoom);
    },
    [syncNodeHeaderVisibility],
  );
  reactExports.useEffect(
    () => () => {
      clearPanningNow();
      if (zoomCommitTimerRef.current !== null) {
        clearTimeout(zoomCommitTimerRef.current);
        zoomCommitTimerRef.current = null;
      }
    },
    [clearPanningNow],
  );
  useStableViewportOnContainerShift(containerRef, active, layoutRelocationKey);
  reactExports.useEffect(() => {
    if (!active) return;
    let prevZoom = storeApi.getState().transform[2];
    broadcastZoom(prevZoom);
    return storeApi.subscribe(() => {
      const next = storeApi.getState().transform[2];
      if (next === prevZoom) return;
      prevZoom = next;
      broadcastZoom(next);
    });
  }, [active, storeApi]);
  return (
    <CanvasActiveProvider active={active}>
      <CanvasInteractionProvider>
        <div
          ref={containerRef}
          data-selection-count={selectedCount}
          className={
            [
              isNodeHeaderHidden(storeApi.getState().transform[2])
                ? NODE_HEADERS_HIDDEN_CLASS
                : null,
              isHandPanning ? "canvas-space-pan" : null,
              isConnecting ? "is-connecting" : null,
            ]
              .filter(Boolean)
              .join(" ") || void 0
          }
          style={{
            width: "100%",
            height: "100%",
          }}
        >
          <ReactFlow
            nodes={nodes}
            edges={culledEdges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onConnectEnd={onConnectEnd}
            onNodeDrag={onNodeDrag}
            onNodeDragStop={handleNodeDragStop}
            nodeDragSnapResolver={alignmentSnap.resolve}
            onNodeDragSnapEnd={alignmentSnap.clear}
            onSelectionChange={handleSelectionChange}
            onNodeClick={onNodeClick}
            onNodeContextMenu={onNodeContextMenu}
            onSelectionContextMenu={onSelectionContextMenu}
            onPaneClick={handlePaneClick}
            onMoveStart={handleMoveStart}
            onMove={handleMove}
            onMoveEnd={handleMoveEnd}
            onInit={handleInit}
            onlyRenderVisibleElements={true}
            minZoom={CANVAS_MIN_ZOOM}
            maxZoom={CANVAS_MAX_ZOOM}
            isValidConnection={isValidConnection}
            selectionOnDrag={
              !nodeInteractionsSuspended && !isHandPanning && !stickerMode
            }
            selectionMode={SelectionMode.Partial}
            panOnDrag={
              interactionsSuspended
                ? false
                : isHandPanning
                  ? PAN_ON_DRAG_WITH_LEFT
                  : PAN_ON_DRAG
            }
            panOnScroll={!interactionsSuspended}
            zoomOnScroll={!interactionsSuspended}
            zoomOnPinch={!interactionsSuspended}
            nodesDraggable={
              !nodeInteractionsSuspended && !isHandPanning && !stickerMode
            }
            nodesConnectable={!activeMode.blocksConnection}
            disableKeyboardA11y={!active || nodeInteractionsSuspended}
            zoomOnDoubleClick={false}
            deleteKeyCode={
              // ReactFlow's delete handler listens on `document`, so every
              // mounted canvas (inactive workspaces are kept mounted via
              // `display:none`, not unmounted) would otherwise receive the
              // same Backspace/Delete keypress and each delete its own
              // selection — wiping nodes across workspaces. Hand inactive
              // canvases an empty key code so only the active one listens.
              !active || nodeInteractionsSuspended
                ? EMPTY_DELETE_KEY_CODE
                : DELETE_KEY_CODE
            }
            multiSelectionKeyCode="Shift"
            paneClickDistance={4}
            proOptions={{
              hideAttribution: true,
            }}
            style={isHandPanning ? grabCanvasStyle : defaultCanvasStyle}
          >
            {(background === "dots" || background === "grid") &&
              showBackgroundGrid && (
                <BackgroundCanvas active={active} variant={background} />
              )}
            {nodes.length === 0 && !isAnyOverlayActive && <EmptyCanvasHint />}
            {edges.length > 0 ? (
              <EdgesCanvas active={active} onlySelectedNodes={!edgesVisible} />
            ) : null}
            <EdgeInteractionLayer
              active={active}
              onlySelectedNodes={!edgesVisible}
            />
            <NodeTagRingsCanvas active={active} />
            <NodeAlignmentGuides store={alignmentSnap.guidesStore} />
            {active && minimap && !isAnyOverlayActive && (
              <CanvasMiniMap
                viewportColor={getMinimapViewportColor}
                position={toolbarPlacement}
                style={getCanvasMinimapPositionStyle(toolbarPlacement)}
                onClick={handleMinimapClick}
                onNodeSelect={onMinimapNodeSelect}
              />
            )}
            {active ? <ConnectingDisabledMarker edges={edges} /> : null}
            {active ? <ConnectionTargetMarker edges={edges} /> : null}
            {children}
          </ReactFlow>
        </div>
      </CanvasInteractionProvider>
      {active ? <CanvasModeLayers /> : null}
      {active ? <CanvasE2EMarkers nodes={nodes} /> : null}
    </CanvasActiveProvider>
  );
}
