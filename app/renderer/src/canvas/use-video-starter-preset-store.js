// use-video-starter-preset-store.js
import { create$2 as create } from "../vendor.js";
export const useVideoStarterPresetStore = create((set2, get3) => ({
  tokens: {},
  refNodeIds: {},
  markApplied: (nodeId) =>
    set2((state2) => ({
      tokens: {
        ...state2.tokens,
        [nodeId]: (state2.tokens[nodeId] ?? 0) + 1,
      },
    })),
  rememberRefNodes: (nodeId, refNodeIds) =>
    set2((state2) => ({
      refNodeIds: {
        ...state2.refNodeIds,
        [nodeId]: [...refNodeIds],
      },
    })),
  takeRefNodes: (nodeId) => {
    const previous2 = get3().refNodeIds[nodeId] ?? [];
    if (previous2.length > 0) {
      set2((state2) => {
        const next2 = {
          ...state2.refNodeIds,
        };
        delete next2[nodeId];
        return {
          refNodeIds: next2,
        };
      });
    }
    return previous2;
  },
}));
export const VIDEO_TOOLBAR_TOOLS = [
  "hailuo03-super-resolution",
  "enhance-video",
  "clip",
  "watermark",
  "extract-frame",
  "extract-audio",
  "erase-subtitle",
  "asr",
  "color-adjust",
];
export const DEFAULT_PINNED = [
  "hailuo03-super-resolution",
  "clip",
  "watermark",
  "extract-audio",
];
export const DEFAULT_SHOW_LABELS = true;
export function arePropsEqual(prev, next2) {
  if (prev.nodes === next2.nodes) return true;
  if (prev.nodes.length !== next2.nodes.length) return false;
  for (let i2 = 0; i2 < prev.nodes.length; i2++) {
    const a2 = prev.nodes[i2];
    const b3 = next2.nodes[i2];
    if (a2.id !== b3.id || a2.type !== b3.type) return false;
  }
  return true;
}
export const DEFAULT_CANVAS_VIEWPORT_CONTROLS_PLACEMENT = "bottom-left";
export const VIEWPORT_CONTROLS_INSET = 8;
