// read-persisted.js
import {
  DEFAULT_PINNED,
  DEFAULT_SHOW_LABELS,
  VIDEO_TOOLBAR_TOOLS,
} from "./use-video-starter-preset-store.js";
import { create } from "zustand";
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
    (id) => id !== "hailuo03-super-resolution" && id !== "enhance-video",
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
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw)
      return {
        pinned: DEFAULT_PINNED,
        showLabels: DEFAULT_SHOW_LABELS,
      };
    const parsed = JSON.parse(raw);
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
        (id, index) => id === PRE_WATERMARK_DEFAULT_PINNED[index],
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
function persist(state) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}
export const useVideoToolbarCustomizationStore = create((set) => ({
  ...readPersisted(),
  setCustomization(next) {
    const pinned = next.pinned.filter(isVideoToolbarToolId);
    const state = {
      pinned,
      showLabels: !!next.showLabels,
    };
    set(state);
    persist(state);
  },
  resetToDefaults() {
    const state = {
      pinned: [...DEFAULT_PINNED],
      showLabels: DEFAULT_SHOW_LABELS,
    };
    set(state);
    persist(state);
  },
}));
