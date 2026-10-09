// cursor-icon.jsx
import { __jsx } from "../shared/jsx-runtime.js";
import { CanvasNodeType, useAssetMetadataStore } from "../vendor.js";
import { parseNodeId } from "./find-free-position-from-anchor.js";
import { CHAT_ARTIFACT_UI_ID } from "../generation/to-workspace-browser-url.js";

export const CANVAS_PRIMARY_TONES = ["default", "warm-gray", "cool-gray"];

export const CANVAS_MORE_TONES = [
  "paper",
  "sage",
  "mist-blue",
  "lavender",
  "blush",
  "sand",
];

export const CANVAS_TONES = [...CANVAS_PRIMARY_TONES, ...CANVAS_MORE_TONES];

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

export function CanvasE2EMarkersInner({ nodes }) {
  const assets = useAssetMetadataStore((s2) => s2.assets);
  const mediaNodes = nodes.filter(
    (n2) => n2.type !== void 0 && n2.type in NODE_TYPE_TO_ARTIFACT,
  );
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

export const CANVAS_TOOL_DOCK_BOTTOM_PX = 12;

export const CANVAS_TOOL_DOCK_HEIGHT_PX = 44;

export const CANVAS_TOOL_DOCK_CONTROL_SIZE_PX = 36;

const CANVAS_TOOL_DOCK_CLEARANCE_PX = 24;

export const CANVAS_TOOL_DOCK_SAFE_BOTTOM_PX =
  CANVAS_TOOL_DOCK_BOTTOM_PX +
  CANVAS_TOOL_DOCK_HEIGHT_PX +
  CANVAS_TOOL_DOCK_CLEARANCE_PX;

export function CursorIcon() {
  return (
    <svg
      aria-hidden="true"
      className="canvas-onboarding-cursor-icon"
      fill="none"
      viewBox="0 0 24 24"
    >
      <g className="canvas-onboarding-cursor-rays">
        <path
          d="M2.25 8.40918L5.11776 9.17759"
          stroke="currentColor"
          strokeLinecap="round"
        />
        <path
          d="M3.46802 15.3083L5.56737 13.209"
          stroke="currentColor"
          strokeLinecap="round"
        />
        <path
          d="M7.2832 3.375L8.05162 6.24276"
          stroke="currentColor"
          strokeLinecap="round"
        />
        <path
          d="M14.1832 4.59375L12.0839 6.6931"
          stroke="currentColor"
          strokeLinecap="round"
        />
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

export function MouseIcon() {
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

const SVG_NS = "http://www.w3.org/2000/svg";

export const INITIAL_GUIDE_SLOTS = 10;

export function createGuideSlot(svg2) {
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

export function setAttribute(element2, name2, value) {
  if (element2.getAttribute(name2) !== value)
    element2.setAttribute(name2, value);
}
