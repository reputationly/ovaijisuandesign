// node-alignment-guides.jsx
import { useTranslation, reactExports, CanvasNodeType, useAssetMetadataStore, Panel } from "../vendor.js";
import { isEdgeVisible, readNodeBox, sourceHandleSide, controlPointsFor, pointsForSide } from "../m15/edges-canvas.jsx";
import { AUDIO_CARD_SIZE, TEXT_CARD_DEFAULT_SIZE, FILE_CARD_DEFAULT_SIZE, TABLE_CARD_DEFAULT_SIZE } from "../m15/group-nodes-in-canvas.js";
import { arePropsEqual$2, VIEWPORT_CONTROLS_INSET } from "../m15/handle-position-style.jsx";
import { parseNodeId } from "../m15/resolve-derived-collision.js";
import { TextNode3 } from "../m05/text-node-inner.jsx";
import { CHAT_ARTIFACT_UI_ID } from "../m01/text-models.js";
import { AudioNode } from "../m02/canvas-image.jsx";
import { areNodePropsEqual } from "../m01/generating-media-area.jsx";
import { VIDEO_CARD_MAX_WIDTH, IMAGE_CARD_MAX_WIDTH } from "../m01/prune-persisted-node-data.js";
import { ImageNode, PlaceholderNode, StickerNode } from "../m04/ready-sub-video-card.jsx";
import { FileNode } from "../m03/pdf-viewer.jsx";
import { TableNode } from "../m04/table-node-inner.jsx";
import { GroupNode } from "../m03/calc-crop-rect.jsx";
import { DerivationEdge } from "../m01/table-document-to-llm-content.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { VideoNodeInner } from "./video-action-surface.jsx";
const VideoNode = reactExports.memo(VideoNodeInner, areNodePropsEqual);
const sharedPorts = [
  {
    id: "input",
    type: "input",
    maxConnections: -1,
  },
  {
    id: "output",
    type: "output",
    maxConnections: -1,
  },
];
const imageNodeDef = {
  type: CanvasNodeType.Image,
  label: "Image",
  defaultSize: {
    width: IMAGE_CARD_MAX_WIDTH,
    height: IMAGE_CARD_MAX_WIDTH,
  },
  ports: sharedPorts,
};
const videoNodeDef = {
  type: CanvasNodeType.Video,
  label: "Video",
  defaultSize: {
    width: VIDEO_CARD_MAX_WIDTH,
    height: VIDEO_CARD_MAX_WIDTH,
  },
  ports: sharedPorts,
};
const audioNodeDef = {
  type: CanvasNodeType.Audio,
  label: "Audio",
  defaultSize: AUDIO_CARD_SIZE,
  ports: sharedPorts,
};
const textNodeDef = {
  type: CanvasNodeType.Text,
  label: "Text",
  defaultSize: TEXT_CARD_DEFAULT_SIZE,
  ports: sharedPorts,
};
const fileNodeDef = {
  type: CanvasNodeType.File,
  label: "File",
  defaultSize: FILE_CARD_DEFAULT_SIZE,
  ports: sharedPorts,
};
const placeholderDef = {
  type: CanvasNodeType.Placeholder,
  label: "Generating",
  defaultSize: {
    width: 160,
    height: 156,
  },
  ports: sharedPorts,
};
const tableNodeDef = {
  type: CanvasNodeType.Table,
  label: "Table",
  defaultSize: TABLE_CARD_DEFAULT_SIZE,
  ports: sharedPorts,
};
const groupNodeDef = {
  type: CanvasNodeType.Group,
  label: "Group",
  defaultSize: {
    width: 400,
    height: 300,
  },
  // No ports — group nodes don't participate in derivation edges.
  ports: [],
};
const stickerNodeDef = {
  type: CanvasNodeType.Sticker,
  label: "Sticker",
  defaultSize: {
    width: 56,
    height: 56,
  },
  ports: [],
};
export const hiloMediaPlugin = {
  id: "hilo-media",
  name: "Hilo Media Nodes",
  version: "1.0.0",
  nodeTypes: [
    {
      definition: imageNodeDef,
      component: ImageNode,
    },
    {
      definition: videoNodeDef,
      component: VideoNode,
    },
    {
      definition: audioNodeDef,
      component: AudioNode,
    },
    {
      definition: textNodeDef,
      component: TextNode3,
    },
    {
      definition: fileNodeDef,
      component: FileNode,
    },
    {
      definition: placeholderDef,
      component: PlaceholderNode,
    },
    {
      definition: tableNodeDef,
      component: TableNode,
    },
    {
      definition: groupNodeDef,
      component: GroupNode,
    },
    {
      definition: stickerNodeDef,
      component: StickerNode,
    },
  ],
  edgeTypes: [
    {
      type: "derivation",
      component: DerivationEdge,
    },
  ],
  contextMenuItems: [
    {
      id: "add-to-chat",
      label: "canvas.addToChat",
      icon: "message-square-plus",
      execute: () => {},
    },
    {
      id: "delete-selected",
      label: "common.delete",
      icon: "trash-2",
      execute: () => {},
    },
  ],
};
export const CANVAS_PRIMARY_TONES = ["default", "warm-gray", "cool-gray"];
export const CANVAS_MORE_TONES = ["paper", "sage", "mist-blue", "lavender", "blush", "sand"];
export const CANVAS_TONES = [...CANVAS_PRIMARY_TONES, ...CANVAS_MORE_TONES];
const CANVAS_TONE_BACKGROUNDS = {
  default: "var(--canvas-bg)",
  "warm-gray": "var(--canvas-bg-warm)",
  "cool-gray": "var(--canvas-bg-cool)",
  paper: "var(--canvas-bg-paper)",
  sage: "var(--canvas-bg-sage)",
  "mist-blue": "var(--canvas-bg-mist-blue)",
  lavender: "var(--canvas-bg-lavender)",
  blush: "var(--canvas-bg-blush)",
  sand: "var(--canvas-bg-sand)",
};
export function getCanvasToneBackground(tone) {
  return CANVAS_TONE_BACKGROUNDS[tone];
}
const NODE_TYPE_TO_ARTIFACT = {
  [CanvasNodeType.Image]: "image",
  [CanvasNodeType.Video]: "video",
  [CanvasNodeType.Audio]: "audio",
};
const HIDDEN_STYLE = {
  position: "absolute",
  width: 0,
  height: 0,
  overflow: "hidden",
  pointerEvents: "none",
};
function CanvasE2EMarkersInner({ nodes }) {
  const assets = useAssetMetadataStore((s2) => s2.assets);
  const mediaNodes = nodes.filter((n2) => n2.type !== void 0 && n2.type in NODE_TYPE_TO_ARTIFACT);
  if (mediaNodes.length === 0) return null;
  return (
    <div data-canvas-e2e-markers="" style={HIDDEN_STYLE} aria-hidden="true">
      {mediaNodes.map((n2) => {
        const { assetId } = parseNodeId(n2.id);
        const meta2 = assets.get(assetId);
        if (!meta2?.url) return null;
        const artifactType = NODE_TYPE_TO_ARTIFACT[n2.type];
        return (
          <span
            key={n2.id}
            data-action-ui-id={CHAT_ARTIFACT_UI_ID[artifactType]}
            data-artifact-type={artifactType}
            data-artifact-path={meta2.url}
          />
        );
      })}
    </div>
  );
}
export const CanvasE2EMarkers = reactExports.memo(CanvasE2EMarkersInner, arePropsEqual$2);
export const CANVAS_TOOL_DOCK_BOTTOM_PX = 12;
export const CANVAS_TOOL_DOCK_HEIGHT_PX = 44;
export const CANVAS_TOOL_DOCK_CONTROL_SIZE_PX = 36;
export const CANVAS_TOOL_DOCK_ICON_SIZE_PX = 18;
const CANVAS_TOOL_DOCK_CLEARANCE_PX = 24;
export const CANVAS_TOOL_DOCK_SAFE_BOTTOM_PX =
  CANVAS_TOOL_DOCK_BOTTOM_PX + CANVAS_TOOL_DOCK_HEIGHT_PX + CANVAS_TOOL_DOCK_CLEARANCE_PX;
const VIEWPORT_CONTROLS_POSITION_STYLES = {
  "bottom-left": {
    left: `calc(var(--canvas-left-overlay-inset, 0px) + ${VIEWPORT_CONTROLS_INSET}px)`,
    bottom: VIEWPORT_CONTROLS_INSET,
    transition: "left 200ms cubic-bezier(0.16, 1, 0.3, 1)",
  },
  "top-left": {
    top: VIEWPORT_CONTROLS_INSET,
    left: `calc(var(--canvas-top-left-overlay-inset, 0px) + ${VIEWPORT_CONTROLS_INSET}px)`,
    transition: "left 200ms cubic-bezier(0.16, 1, 0.3, 1)",
  },
  "top-right": {
    top: VIEWPORT_CONTROLS_INSET,
    right: `calc(var(--canvas-top-right-overlay-inset, 0px) + var(--canvas-top-right-panel-inset, 0px) + ${VIEWPORT_CONTROLS_INSET}px)`,
    transition: "right 200ms cubic-bezier(0.16, 1, 0.3, 1)",
  },
};
const ZOOM_MENU_POSITION_CLASSES = {
  "bottom-left": "bottom-full left-0 mb-2",
  "top-left": "top-full left-0 mt-2",
  "top-right": "top-full right-0 mt-2",
};
const APPEARANCE_PANEL_POSITION_CLASSES = {
  "bottom-left": "bottom-full left-0 mb-2",
  "top-left": "top-full left-0 mt-2",
  "top-right": "top-full right-0 mt-2",
};
export function getCanvasViewportControlsPositionStyle(placement) {
  return VIEWPORT_CONTROLS_POSITION_STYLES[placement];
}
export function getCanvasZoomMenuPositionClass(placement) {
  return ZOOM_MENU_POSITION_CLASSES[placement];
}
export function getCanvasAppearancePanelPositionClass(placement) {
  return APPEARANCE_PANEL_POSITION_CLASSES[placement];
}
function CursorIcon() {
  return (
    <svg
      aria-hidden="true"
      className="canvas-onboarding-cursor-icon"
      fill="none"
      viewBox="0 0 24 24"
    >
      <g className="canvas-onboarding-cursor-rays">
        <path d="M2.25 8.40918L5.11776 9.17759" stroke="currentColor" strokeLinecap="round" />
        <path d="M3.46802 15.3083L5.56737 13.209" stroke="currentColor" strokeLinecap="round" />
        <path d="M7.2832 3.375L8.05162 6.24276" stroke="currentColor" strokeLinecap="round" />
        <path d="M14.1832 4.59375L12.0839 6.6931" stroke="currentColor" strokeLinecap="round" />
      </g>
      <path
        className="canvas-onboarding-cursor-shell"
        d="M8.49093 9.1871C8.0975 9.58053 7.97033 10.1676 8.1657 10.6886L12.0676 21.0935C12.2857 21.6751 12.8567 22.0472 13.4768 22.0119C14.0969 21.9766 14.6219 21.542 14.7726 20.9395L15.8667 16.5629L20.2433 15.4687C20.8459 15.3181 21.2804 14.793 21.3157 14.1729C21.3511 13.5528 20.9789 12.9818 20.3974 12.7637L9.99241 8.86186C9.47144 8.6665 8.88436 8.79367 8.49093 9.1871Z"
      />
      <path
        className="canvas-onboarding-cursor-accent"
        d="M9.05149 10.3558C8.98637 10.1822 9.02876 9.98648 9.1599 9.85534C9.29104 9.72419 9.48674 9.6818 9.66039 9.74692L20.0654 13.6488C20.2592 13.7215 20.3833 13.9118 20.3715 14.1185C20.3597 14.3252 20.2149 14.5002 20.014 14.5505L15.0868 15.7823L13.855 20.7094C13.8048 20.9103 13.6298 21.0551 13.4231 21.0669C13.2164 21.0787 13.026 20.9547 12.9534 20.7608L9.05149 10.3558Z"
      />
    </svg>
  );
}
function MouseIcon() {
  return (
    <svg
      aria-hidden="true"
      className="canvas-onboarding-mouse-icon"
      fill="none"
      viewBox="0 0 20 20"
    >
      <path
        d="M5 7.5C5 4.73858 7.23858 2.5 10 2.5C12.7614 2.5 15 4.73858 15 7.5V12.5C15 15.2614 12.7614 17.5 10 17.5C7.23858 17.5 5 15.2614 5 12.5V7.5Z"
        stroke="currentColor"
        strokeLinejoin="round"
      />
      <path
        className="canvas-onboarding-mouse-wheel"
        d="M10 5.83301L10 9.16634"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
export function EmptyCanvasHint() {
  const { t: t2 } = useTranslation();
  return (
    <Panel
      position="top-center"
      className="canvas-onboarding-panel pointer-events-none select-none"
    >
      <section
        aria-label={t2("canvas.emptyHint.ariaLabel", {
          defaultValue: "Canvas onboarding",
        })}
        className="canvas-onboarding-ui-layer"
      >
        <div className="canvas-onboarding-primary-anchor">
          <div className="canvas-onboarding-primary-line">
            <CursorIcon />
            <span className="canvas-onboarding-primary-action">
              {t2("canvas.emptyHint.primaryAction", {
                defaultValue: "Double-click canvas",
              })}
            </span>
            <span className="canvas-onboarding-primary-result">
              {t2("canvas.emptyHint.primaryResult", {
                defaultValue: "to freely create nodes",
              })}
            </span>
          </div>
          <div className="canvas-onboarding-secondary-line">
            <span className="canvas-onboarding-secondary-group">
              <span>
                {t2("canvas.emptyHint.spacePrefix", {
                  defaultValue: "Hold",
                })}
              </span>
              <span className="canvas-onboarding-space-key">
                [
                {t2("canvas.emptyHint.kbd.space", {
                  defaultValue: "Space",
                })}
                ]
              </span>
              <span>
                {t2("canvas.emptyHint.spaceSuffix", {
                  defaultValue: "to move the canvas",
                })}
              </span>
            </span>
            <span className="canvas-onboarding-secondary-group">
              <span>
                {t2("canvas.emptyHint.scrollPrefix", {
                  defaultValue: "Scroll",
                })}
              </span>
              <MouseIcon />
              <span>
                {t2("canvas.emptyHint.zoomSuffix", {
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
const SVG_NS = "http://www.w3.org/2000/svg";
const INITIAL_GUIDE_SLOTS = 10;
function createGuideSlot(svg2) {
  const doc2 = svg2.ownerDocument;
  const group = doc2.createElementNS(SVG_NS, "g");
  const line = doc2.createElementNS(SVG_NS, "line");
  const caps = doc2.createElementNS(SVG_NS, "path");
  const label = doc2.createElementNS(SVG_NS, "text");
  const text2 = doc2.createTextNode("");
  label.append(text2);
  group.append(line, caps, label);
  group.style.display = "none";
  svg2.append(group);
  return {
    group,
    line,
    caps,
    label,
    text: text2,
  };
}
function setAttribute(element2, name2, value) {
  if (element2.getAttribute(name2) !== value) element2.setAttribute(name2, value);
}
export const NodeAlignmentGuides = reactExports.memo(function NodeAlignmentGuides2({ store }) {
  const svgRef = reactExports.useRef(null);
  reactExports.useLayoutEffect(() => {
    const svg2 = svgRef.current;
    if (!svg2) return;
    const slots = Array.from(
      {
        length: INITIAL_GUIDE_SLOTS,
      },
      () => createGuideSlot(svg2),
    );
    const render2 = ({ guides, transform: [tx, ty, zoom2] }) => {
      const display = guides.length > 0 ? "" : "none";
      if (svg2.style.display !== display) svg2.style.display = display;
      while (slots.length < guides.length) slots.push(createGuideSlot(svg2));
      for (let i2 = 0; i2 < slots.length; i2++) {
        const slot = slots[i2];
        const guide = guides[i2];
        if (!guide) {
          if (slot.group.style.display !== "none") {
            slot.group.style.display = "none";
            slot.group.removeAttribute("data-guide-kind");
          }
          continue;
        }
        if (slot.group.style.display === "none") slot.group.style.display = "";
        setAttribute(slot.group, "data-guide-kind", guide.kind);
        const x1 = guide.x1 * zoom2 + tx;
        const y1 = guide.y1 * zoom2 + ty;
        const x2 = guide.x2 * zoom2 + tx;
        const y22 = guide.y2 * zoom2 + ty;
        const horizontal = y1 === y22;
        const cap2 = 3;
        const alignment = guide.kind === "alignment";
        setAttribute(slot.line, "x1", alignment && horizontal ? "0%" : String(x1));
        setAttribute(slot.line, "y1", alignment && !horizontal ? "0%" : String(y1));
        setAttribute(slot.line, "x2", alignment && horizontal ? "100%" : String(x2));
        setAttribute(slot.line, "y2", alignment && !horizontal ? "100%" : String(y22));
        setAttribute(
          slot.caps,
          "d",
          alignment
            ? ""
            : horizontal
              ? `M${x1},${y1 - cap2}v${cap2 * 2}M${x2},${y22 - cap2}v${cap2 * 2}`
              : `M${x1 - cap2},${y1}h${cap2 * 2}M${x2 - cap2},${y22}h${cap2 * 2}`,
        );
        setAttribute(slot.label, "x", String((x1 + x2) / 2 + (horizontal ? 0 : 8)));
        setAttribute(slot.label, "y", String((y1 + y22) / 2 - (horizontal ? 7 : 0)));
        const text2 =
          guide.distance === void 0 ? "" : String(Math.round(guide.distance * 100) / 100);
        if (slot.text.data !== text2) slot.text.data = text2;
      }
    };
    const unsubscribe = store.subscribe(render2);
    render2(store.getState());
    return () => {
      unsubscribe();
      svg2.replaceChildren();
      svg2.style.display = "none";
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
const BEZIER_HIT_SAMPLES = 16;
function cubicAt(t2, p0, p1, p22, p3) {
  const mt2 = 1 - t2;
  return (
    mt2 * mt2 * mt2 * p0 + 3 * mt2 * mt2 * t2 * p1 + 3 * mt2 * t2 * t2 * p22 + t2 * t2 * t2 * p3
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
export function hitTestEdges(state2, flowX, flowY, radius, steps = BEZIER_HIT_SAMPLES) {
  let best = null;
  let bestSq = radius * radius;
  for (const edge of state2.edges) {
    if (!isEdgeVisible(edge, state2.nodeLookup, state2.onlySelectedNodes ?? false)) continue;
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
export function isEdgeOccludedAt(source, clientX, clientY) {
  return isEdgeOccludingElement(source.elementFromPoint(clientX, clientY));
}
export const CUT_BUTTON_REVEAL_DELAY_MS = 1e3;
export const CUT_BUTTON_HIDE_DELAY_MS = 150;
export const EDGE_HIT_RADIUS_PX = 18;
export const CLICK_DISTANCE_PX = 3;
