// use-active-mode.js
import { NODE_SIZE_MAX } from "./compute-group-bounds-from-children.js";
import { resolveNodeFootprint } from "./placeholder-node-size.js";
import { CanvasNodeType, create$2, reactExports } from "../vendor.js";
import { useCropState } from "./use-start-crop-from-node.js";
import {
  useEraseState,
  useMoveObjectState,
  useOutpaintState,
  useRedrawState,
} from "../media-editing/use-start-cloud-edit-from-node.js";

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
  const hasViewportLock =
    isCropping || isErasing || isRedrawing || isMovingObject;
  const hasNodeLock = hasViewportLock || isOutpainting;
  const blocksConnection =
    isOutpainting || isErasing || isRedrawing || isMovingObject;
  const isAnyActive =
    isCropping || isOutpainting || isErasing || isRedrawing || isMovingObject;
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

export function shouldRenderNodeTagRings(filterActive) {
  return filterActive;
}

export function getNodeTagRingGlowBlur(devicePixelRatio) {
  return 6 * Math.max(1, devicePixelRatio || 1);
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
  enabled:
    readCanvasPreference(ALIGNMENT_SNAP_STORAGE_KEY, ["0", "1"], "1") === "1",
  setEnabled: (enabled) => {
    if (get3().enabled === enabled) return;
    set2({
      enabled,
    });
    writeCanvasPreference(ALIGNMENT_SNAP_STORAGE_KEY, enabled ? "1" : "0");
  },
  toggle: () => get3().setEnabled(!get3().enabled),
}));

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
