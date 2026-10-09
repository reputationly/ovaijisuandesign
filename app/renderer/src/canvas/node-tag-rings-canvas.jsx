// node-tag-rings-canvas.jsx
import {
  CanvasNodeType,
  reactExports,
  create$2,
  useStoreApi,
  useNodesInitialized,
  useConnection,
  ReactFlowProvider,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { CanvasReleaseRegionProvider } from "./canvas-surface-recovery-scheduler.jsx";
import {
  HtmlFullscreenStoreProvider,
  createHtmlFullscreenStore,
  useOptionalHtmlFullscreenApi,
} from "../infra/create-html-iframe-pool-store.jsx";
import {
  CanvasTagColorsProvider,
  CanvasTagFilterActiveProvider,
  EMPTY_TAG_COLOR_RESOLVER,
  NodeTagColorStoreProvider,
  createNodeTagColorStore,
  getNodeTagRingWidth,
  resolveNodeTagRingColor,
  useCanvasTagFilterActive,
  useNodeTagColorApi,
} from "../infra/create-recently-added-store.jsx";
import { readNodeBox } from "./edges-canvas.jsx";
import { NODE_SIZE_MAX, resolveNodeFootprint } from "./group-nodes-in-canvas.js";
import { MEDIA_NODE_RADIUS } from "../media-editing/parse-item.jsx";
import { useCropState } from "./use-file-bytes.js";
import {
  useEraseState,
  useMoveObjectState,
  useOutpaintState,
  useRedrawState,
} from "../media-editing/use-multi-image-actions.js";
export function insertCanvasRedrawRegion(editor, attrs) {
  if (editor.isDestroyed) return;
  const content2 = {
    type: "canvasRedrawRegion",
    attrs,
  };
  if (!editor.isFocused) editor.commands.focus("end");
  editor.commands.insertContent(content2);
}
const REDRAW_HIGHLIGHT_RGB = {
  r: 168,
  g: 255,
  b: 112,
};
const REDRAW_HIGHLIGHT_ALPHA = 128;
export const REDRAW_HIGHLIGHT_CSS_COLOR = `rgb(${REDRAW_HIGHLIGHT_RGB.r}, ${REDRAW_HIGHLIGHT_RGB.g}, ${REDRAW_HIGHLIGHT_RGB.b})`;
export const REDRAW_HIGHLIGHT_UI_OPACITY = REDRAW_HIGHLIGHT_ALPHA / 255;
export const BAR_GAP = 16;
export const TOP_BAR_HEIGHT = 40;
export const TOP_BAR_MIN_WIDTH = 360;
export const BOTTOM_BAR_MIN_WIDTH = 480;
export const BOTTOM_BAR_MAX_WIDTH = 720;
export function useActiveMode() {
  const { croppingNodeId } = useCropState();
  const { outpaintingNodeId, cancelOutpaint } = useOutpaintState();
  const { erasingNodeId } = useEraseState();
  const { redrawingNodeId } = useRedrawState();
  const { movingObjectNodeId, cancelMoveObject } = useMoveObjectState();
  const isCropping = croppingNodeId !== null;
  const isOutpainting = outpaintingNodeId !== null;
  const isErasing = erasingNodeId !== null;
  const isRedrawing = redrawingNodeId !== null;
  const isMovingObject = movingObjectNodeId !== null;
  const hasViewportLock = isCropping || isErasing || isRedrawing || isMovingObject;
  const hasNodeLock = hasViewportLock || isOutpainting;
  const blocksConnection = isOutpainting || isErasing || isRedrawing || isMovingObject;
  const isAnyActive = isCropping || isOutpainting || isErasing || isRedrawing || isMovingObject;
  const cancelDismissibleMode = reactExports.useCallback(() => {
    if (isOutpainting) cancelOutpaint();
    if (isMovingObject) cancelMoveObject();
  }, [isOutpainting, cancelOutpaint, isMovingObject, cancelMoveObject]);
  return {
    isCropping,
    isOutpainting,
    isErasing,
    isRedrawing,
    isMovingObject,
    isAnyActive,
    hasViewportLock,
    hasNodeLock,
    blocksConnection,
    cancelDismissibleMode,
  };
}
const HEADER_HIDE_ZOOM_THRESHOLD = 0.15;
export const NODE_HEADERS_HIDDEN_CLASS = "canvas-node-headers-hidden";
export function isNodeHeaderHidden(zoom2) {
  return zoom2 < HEADER_HIDE_ZOOM_THRESHOLD;
}
function shouldRenderNodeTagRings(filterActive) {
  return filterActive;
}
function getNodeTagRingGlowBlur(devicePixelRatio) {
  return 6 * Math.max(1, devicePixelRatio || 1);
}
export function NodeTagRingsCanvas({ active: active2 = true }) {
  const storeApi = useStoreApi();
  const tagColorStore = useNodeTagColorApi();
  const tagFilterActive = useCanvasTagFilterActive();
  const canvasRef = reactExports.useRef(null);
  const nodesInitialized = useNodesInitialized();
  const initLatchRef = reactExports.useRef(false);
  if (nodesInitialized) initLatchRef.current = true;
  const scheduleRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (!active2) {
      scheduleRef.current = null;
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
      if (!shouldRenderNodeTagRings(tagFilterActive)) return;
      const tagColorState = tagColorStore.getState();
      const tagged = tagColorState.colors;
      if (tagged.size === 0) return;
      const state2 = storeApi.getState();
      const [tx, ty, zoom2] = state2.transform;
      if (!zoom2 || zoom2 <= 0) return;
      const ringWidth = getNodeTagRingWidth(zoom2);
      const halfRing = ringWidth / 2;
      const ringRadius = MEDIA_NODE_RADIUS + halfRing;
      const themeStyles = getComputedStyle(flow2);
      const batches = new Map();
      for (const [nodeId, color2] of tagged) {
        if (!tagColorState.activeNodeIds.has(nodeId)) continue;
        const entry = state2.nodeLookup.get(nodeId);
        if (!entry) continue;
        const box2 = readNodeBox(entry);
        if (!box2) continue;
        const ringColor = resolveNodeTagRingColor(color2, (token2) =>
          themeStyles.getPropertyValue(token2),
        );
        let batch2 = batches.get(ringColor);
        if (!batch2) {
          batch2 = {
            color: ringColor,
            path: new Path2D(),
          };
          batches.set(ringColor, batch2);
        }
        batch2.path.roundRect(
          box2.x - halfRing,
          box2.y - halfRing,
          box2.width + ringWidth,
          box2.height + ringWidth,
          ringRadius,
        );
      }
      if (batches.size === 0) return;
      ctx.setTransform(dpr * zoom2, 0, 0, dpr * zoom2, dpr * tx, dpr * ty);
      ctx.lineWidth = ringWidth;
      for (const batch2 of batches.values()) {
        ctx.save();
        ctx.globalAlpha = 0.38;
        ctx.shadowColor = batch2.color;
        ctx.shadowBlur = getNodeTagRingGlowBlur(dpr);
        ctx.strokeStyle = batch2.color;
        ctx.stroke(batch2.path);
        ctx.restore();
        ctx.strokeStyle = batch2.color;
        ctx.stroke(batch2.path);
      }
    };
    const schedule2 = () => {
      if (rafId2 !== 0) return;
      rafId2 = requestAnimationFrame(paint);
    };
    scheduleRef.current = schedule2;
    schedule2();
    const unsubStore = storeApi.subscribe(schedule2);
    const unsubTagColors = tagColorStore.subscribe(schedule2);
    const resizeObserver = new ResizeObserver(schedule2);
    resizeObserver.observe(flow2);
    const themeObserver = new MutationObserver(schedule2);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style", "data-theme"],
    });
    const onWindowResize = () => schedule2();
    window.addEventListener("resize", onWindowResize);
    return () => {
      cancelled = true;
      if (rafId2 !== 0) cancelAnimationFrame(rafId2);
      unsubStore();
      unsubTagColors();
      resizeObserver.disconnect();
      themeObserver.disconnect();
      window.removeEventListener("resize", onWindowResize);
      scheduleRef.current = null;
    };
  }, [active2, storeApi, tagColorStore, tagFilterActive]);
  reactExports.useEffect(() => {
    if (!active2 || !nodesInitialized) return;
    scheduleRef.current?.();
  }, [active2, nodesInitialized]);
  return active2 ? (
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
export function readCanvasPreference(key2, allowed, fallback) {
  try {
    const value = localStorage.getItem(key2);
    return value && allowed.includes(value) ? value : fallback;
  } catch {
    return fallback;
  }
}
export function writeCanvasPreference(key2, value) {
  try {
    localStorage.setItem(key2, value);
  } catch {}
}
const ALIGNMENT_SNAP_STORAGE_KEY = "hilo:canvas:alignment-snap";
export const useAlignmentSnapPreferenceStore = create$2((set2, get3) => ({
  enabled: readCanvasPreference(ALIGNMENT_SNAP_STORAGE_KEY, ["0", "1"], "1") === "1",
  setEnabled: (enabled) => {
    if (get3().enabled === enabled) return;
    set2({
      enabled,
    });
    writeCanvasPreference(ALIGNMENT_SNAP_STORAGE_KEY, enabled ? "1" : "0");
  },
  toggle: () => get3().setEnabled(!get3().enabled),
}));
export const defaultCanvasStyle = {
  cursor: "var(--canvas-cursor-default)",
};
export const grabCanvasStyle = {
  cursor: "grab",
};
export const PAN_ON_DRAG = [1, 2];
export const PAN_ON_DRAG_WITH_LEFT = [0, 1, 2];
export const DELETE_KEY_CODE = ["Backspace", "Delete"];
export const EMPTY_DELETE_KEY_CODE = [];
export const PAN_OFF_DEBOUNCE_MS = 200;
export const ZOOM_COMMIT_DEBOUNCE_MS = 220;
export function ConnectingDisabledMarker({ edges }) {
  const fromNodeId = useConnection((c3) => c3.fromNode?.id ?? null);
  const disabledTargets = reactExports.useMemo(() => {
    if (!fromNodeId) return null;
    const set2 = new Set();
    for (const edge of edges) {
      if (edge.source === fromNodeId) set2.add(edge.target);
    }
    return set2;
  }, [fromNodeId, edges]);
  reactExports.useEffect(() => {
    if (!disabledTargets || disabledTargets.size === 0) return;
    const cleanups = [];
    for (const id2 of disabledTargets) {
      const el = document.querySelector(`.react-flow__node[data-id="${CSS.escape(id2)}"]`);
      if (!el) continue;
      el.classList.add("node-conn-disabled");
      cleanups.push(() => el.classList.remove("node-conn-disabled"));
    }
    return () => {
      for (const fn2 of cleanups) fn2();
    };
  }, [disabledTargets]);
  return null;
}
export const DEFAULT_NODE_SIZE = {
  width: NODE_SIZE_MAX,
  height: NODE_SIZE_MAX,
};
const ORIGIN = {
  x: 0,
  y: 0,
};
export function getNodePosition(node2, mode2) {
  const slot = node2.positions?.[mode2];
  if (slot) return slot;
  return ORIGIN;
}
export function setNodePosition(node2, mode2, pos) {
  if (!node2.positions) node2.positions = {};
  node2.positions[mode2] = {
    x: pos.x,
    y: pos.y,
  };
}
export function getNodeSize(node2, mode2) {
  if (node2.type === CanvasNodeType.Group) {
    return node2.sizes?.[mode2] ?? node2.size;
  }
  return node2.size;
}
export function sizeOf(node2, mode2) {
  return resolveNodeFootprint(node2, mode2, DEFAULT_NODE_SIZE);
}
export function computeCentroid(nodes, mode2) {
  if (nodes.length === 0)
    return {
      x: 0,
      y: 0,
    };
  let sumX = 0;
  let sumY = 0;
  for (const n2 of nodes) {
    const pos = getNodePosition(n2, mode2);
    sumX += pos.x;
    sumY += pos.y;
  }
  return {
    x: sumX / nodes.length,
    y: sumY / nodes.length,
  };
}
export function createEmptyGraph() {
  return {
    nodes: [],
    edges: [],
    viewport: {
      x: 0,
      y: 0,
      zoom: 1,
    },
  };
}
export function CanvasViewProviders({
  region = "overseas",
  tagColorResolver,
  tagFilterActive = false,
  children: children2,
}) {
  const [tagColorStore] = reactExports.useState(createNodeTagColorStore);
  const parentHtmlFullscreenStore = useOptionalHtmlFullscreenApi();
  const [ownHtmlFullscreenStore] = reactExports.useState(createHtmlFullscreenStore);
  const htmlFullscreenStore = parentHtmlFullscreenStore ?? ownHtmlFullscreenStore;
  return (
    <CanvasReleaseRegionProvider value={region}>
      <CanvasTagFilterActiveProvider value={tagFilterActive}>
        <CanvasTagColorsProvider value={tagColorResolver ?? EMPTY_TAG_COLOR_RESOLVER}>
          <NodeTagColorStoreProvider store={tagColorStore}>
            <HtmlFullscreenStoreProvider store={htmlFullscreenStore}>
              <ReactFlowProvider>{children2}</ReactFlowProvider>
            </HtmlFullscreenStoreProvider>
          </NodeTagColorStoreProvider>
        </CanvasTagColorsProvider>
      </CanvasTagFilterActiveProvider>
    </CanvasReleaseRegionProvider>
  );
}
export const CANVAS_COMMAND_IDS = {
  addNode: "canvas.add-node",
  assets: "canvas.assets",
  select: "canvas.select",
  handTool: "canvas.hand-tool",
  comments: "canvas.comments",
  sticker: "canvas.sticker",
  shortcuts: "canvas.shortcuts",
  help: "canvas.help",
  minimap: "canvas.minimap",
  background: "canvas.background",
  content: "canvas.content",
  zoomOut: "canvas.zoom-out",
  zoomIn: "canvas.zoom-in",
  fitView: "canvas.fit-view",
  focusSelection: "canvas.focus-selection",
};
export const COMMAND_DEFINITIONS = [
  {
    id: CANVAS_COMMAND_IDS.addNode,
    labelKey: "canvas.toolbar.addNode",
    shortcut: "N",
    ariaKeyshortcuts: "N",
  },
  {
    id: CANVAS_COMMAND_IDS.assets,
    labelKey: "canvas.toolbar.assets",
    shortcut: "Shift+I",
    ariaKeyshortcuts: "Shift+I",
  },
  {
    id: CANVAS_COMMAND_IDS.select,
    labelKey: "canvas.toolbar.move",
    shortcut: "V",
    ariaKeyshortcuts: "V",
  },
  {
    id: CANVAS_COMMAND_IDS.handTool,
    labelKey: "canvas.toolbar.handTool",
    shortcut: "H",
    ariaKeyshortcuts: "H",
  },
  {
    id: CANVAS_COMMAND_IDS.comments,
    labelKey: "canvas.toolbar.comments",
  },
  {
    id: CANVAS_COMMAND_IDS.sticker,
    labelKey: "canvas.toolbar.sticker",
    shortcut: "S",
    ariaKeyshortcuts: "S",
  },
  {
    id: CANVAS_COMMAND_IDS.shortcuts,
    labelKey: "canvas.toolbar.shortcuts",
    shortcut: "?",
    ariaKeyshortcuts: "Shift+/",
  },
  {
    id: CANVAS_COMMAND_IDS.help,
    labelKey: "canvas.toolbar.help",
    shortcut: "F1",
    ariaKeyshortcuts: "F1",
  },
  {
    id: CANVAS_COMMAND_IDS.minimap,
    labelKey: "canvas.minimap",
    shortcut: "M",
    ariaKeyshortcuts: "M",
  },
  {
    id: CANVAS_COMMAND_IDS.background,
    labelKey: "canvas.toolbar.background",
  },
  {
    id: CANVAS_COMMAND_IDS.content,
    labelKey: "canvas.toolbar.content",
  },
  {
    id: CANVAS_COMMAND_IDS.zoomOut,
    labelKey: "canvas.zoomOut",
  },
  {
    id: CANVAS_COMMAND_IDS.zoomIn,
    labelKey: "canvas.zoomIn",
  },
  {
    id: CANVAS_COMMAND_IDS.fitView,
    labelKey: "canvas.fitToView",
  },
  {
    id: CANVAS_COMMAND_IDS.focusSelection,
    labelKey: "canvas.focusSelection",
    shortcut: "Shift+2",
    ariaKeyshortcuts: "Shift+2",
  },
];
