// minimap-position-styles.js
import { VIEWPORT_CONTROLS_INSET } from "./use-video-starter-preset-store.js";

const VIEWPORT_CONTROLS_HEIGHT = 32;

const VIEWPORT_CONTROLS_OVERLAY_GAP = 8;

const MINIMAP_CONTROLS_OFFSET =
  VIEWPORT_CONTROLS_INSET +
  VIEWPORT_CONTROLS_HEIGHT +
  VIEWPORT_CONTROLS_OVERLAY_GAP;

const MINIMAP_SIZE = {
  width: 160,
  height: 130,
  margin: 0,
};

export const MINIMAP_POSITION_STYLES = {
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

export const VISIBLE_GRID_GAP = 20;

export const COLOR_FALLBACK = "rgba(0, 0, 0, 0.04)";
