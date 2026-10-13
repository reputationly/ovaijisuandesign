// read-persisted.js
import {
  DEFAULT_PINNED,
  DEFAULT_SHOW_LABELS,
  VIDEO_TOOLBAR_TOOLS,
} from "./use-video-starter-preset-store.js";
import { create$2 as create } from "../vendor.js";
const STORAGE_KEY = "hilo:canvas:video-toolbar:customization";
const TOOLBAR_ORDER_MIGRATION_KEY =
  "hilo:canvas:video-toolbar:h3-first-migrated-v2";
const PRE_WATERMARK_DEFAULT_PINNED = [
  "hailuo03-super-resolution",
  "clip",
  "extract-audio",
];
function isVideoToolbarToolId(toolId) {
  return VIDEO_TOOLBAR_TOOLS.includes(toolId);
}
function migrateToolbarOrder(pinned) {
  if (typeof window === "undefined") return pinned;
  try {
    if (window.localStorage.getItem(TOOLBAR_ORDER_MIGRATION_KEY)) return pinned;
    window.localStorage.setItem(TOOLBAR_ORDER_MIGRATION_KEY, "1");
  } catch {
    return pinned;
  }
  const rest = pinned.filter(
    (toolId) => toolId !== "hailuo03-super-resolution" && toolId !== "enhance-video",
  );
  return ["hailuo03-super-resolution", ...rest];
}
function readPersisted() {
  if (typeof window === "undefined") {
    return {
      pinned: DEFAULT_PINNED,
      showLabels: DEFAULT_SHOW_LABELS,
    };
  }
  try {
    const raw2 = window.localStorage.getItem(STORAGE_KEY);
    if (!raw2)
      return {
        pinned: DEFAULT_PINNED,
        showLabels: DEFAULT_SHOW_LABELS,
      };
    const parsed = JSON.parse(raw2);
    if (!parsed || typeof parsed !== "object") {
      return {
        pinned: DEFAULT_PINNED,
        showLabels: DEFAULT_SHOW_LABELS,
      };
    }
    const parsedState = parsed;
    const parsedPinned = Array.isArray(parsedState.pinned)
      ? parsedState.pinned.filter(isVideoToolbarToolId)
      : DEFAULT_PINNED;
    const migratedPinned = migrateToolbarOrder(parsedPinned);
    const pinned =
      migratedPinned.length === PRE_WATERMARK_DEFAULT_PINNED.length &&
      migratedPinned.every(
        (toolId, index2) => toolId === PRE_WATERMARK_DEFAULT_PINNED[index2],
      )
        ? DEFAULT_PINNED
        : migratedPinned;
    const showLabels =
      typeof parsedState.showLabels === "boolean" ? parsedState.showLabels : DEFAULT_SHOW_LABELS;
    return {
      pinned,
      showLabels,
    };
  } catch {
    return {
      pinned: DEFAULT_PINNED,
      showLabels: DEFAULT_SHOW_LABELS,
    };
  }
}
function persist(state2) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state2));
  } catch {}
}
export const useVideoToolbarCustomizationStore = create((set2) => ({
  ...readPersisted(),
  setCustomization(next2) {
    const pinned = next2.pinned.filter(isVideoToolbarToolId);
    const state2 = {
      pinned,
      showLabels: !!next2.showLabels,
    };
    set2(state2);
    persist(state2);
  },
  resetToDefaults() {
    const state2 = {
      pinned: [...DEFAULT_PINNED],
      showLabels: DEFAULT_SHOW_LABELS,
    };
    set2(state2);
    persist(state2);
  },
}));
