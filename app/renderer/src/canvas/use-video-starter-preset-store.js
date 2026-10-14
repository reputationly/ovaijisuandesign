// use-video-starter-preset-store.js
import { create } from "zustand";
export const useVideoStarterPresetStore = create((set, get) => ({
  tokens: {},
  refNodeIds: {},
  markApplied: (nodeId) =>
    set((state) => ({
      tokens: {
        ...state.tokens,
        [nodeId]: (state.tokens[nodeId] ?? 0) + 1,
      },
    })),
  rememberRefNodes: (nodeId, refNodeIds) =>
    set((state) => ({
      refNodeIds: {
        ...state.refNodeIds,
        [nodeId]: [...refNodeIds],
      },
    })),
  takeRefNodes: (nodeId) => {
    const previous = get().refNodeIds[nodeId] ?? [];
    if (previous.length > 0) {
      set((state) => {
        const next = {
          ...state.refNodeIds,
        };
        delete next[nodeId];
        return {
          refNodeIds: next,
        };
      });
    }
    return previous;
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
export function arePropsEqual(prev, next) {
  if (prev.nodes === next.nodes) return true;
  if (prev.nodes.length !== next.nodes.length) return false;
  for (let index = 0; index < prev.nodes.length; index++) {
    const previousNode = prev.nodes[index];
    const nextNode = next.nodes[index];
    if (previousNode.id !== nextNode.id || previousNode.type !== nextNode.type) return false;
  }
  return true;
}
export const DEFAULT_CANVAS_VIEWPORT_CONTROLS_PLACEMENT = "bottom-left";
export const VIEWPORT_CONTROLS_INSET = 8;
