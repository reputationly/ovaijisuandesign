// read-persisted.js
import {
  DEFAULT_PINNED,
  DEFAULT_SHOW_LABELS,
  IMAGE_TOOLBAR_TOOLS,
  LEGACY_IMAGE_TOOLBAR_TOOLS,
} from "./use-start-cloud-edit-from-node.js";
import { create$2 as create } from "../vendor.js";
const STORAGE_KEY = "hilo:canvas:image-toolbar:customization";
const PRE_RELIGHT_WORKFLOW_DEFAULT_PINNED = [
  "crop",
  "super-resolution",
  "redraw",
  "watermark",
  "multi-angle",
  "storyboard-grid",
  "panorama-reference",
];
const PRE_WATERMARK_DEFAULT_PINNED = [
  "crop",
  "super-resolution",
  "redraw",
  "multi-angle",
  "storyboard-grid",
  "panorama-reference",
];
const PRE_PANORAMA_DEFAULT_PINNED = [
  "crop",
  "super-resolution",
  "redraw",
  "multi-angle",
  "storyboard-grid",
];
const MAIN_PRE_PANORAMA_DEFAULT_PINNED = [
  "crop",
  "super-resolution",
  "redraw",
  "multi-angle",
];
const MAIN_PANORAMA_DEFAULT_PINNED = [
  ...MAIN_PRE_PANORAMA_DEFAULT_PINNED,
  "panorama-reference",
];
const LATEST_LAYOUT_VERSION = 2;
const LEGACY_LAYOUT_VERSION = 1;
function isImageToolbarToolId(v2) {
  return (
    LEGACY_IMAGE_TOOLBAR_TOOLS.includes(v2) || IMAGE_TOOLBAR_TOOLS.includes(v2)
  );
}
function readPersisted() {
  if (typeof window === "undefined") {
    return {
      pinned: DEFAULT_PINNED,
      showLabels: DEFAULT_SHOW_LABELS,
      layoutVersion: LATEST_LAYOUT_VERSION,
    };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        pinned: DEFAULT_PINNED,
        showLabels: DEFAULT_SHOW_LABELS,
        layoutVersion: LATEST_LAYOUT_VERSION,
      };
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return {
        pinned: DEFAULT_PINNED,
        showLabels: DEFAULT_SHOW_LABELS,
        layoutVersion: LATEST_LAYOUT_VERSION,
      };
    }
    const p3 = parsed;
    const parsedPinned = Array.isArray(p3.pinned)
      ? p3.pinned.filter(isImageToolbarToolId)
      : DEFAULT_PINNED;
    const isKnownPreviousFactoryLayout =
      p3.layoutVersion === LATEST_LAYOUT_VERSION &&
      [
        PRE_RELIGHT_WORKFLOW_DEFAULT_PINNED,
        PRE_WATERMARK_DEFAULT_PINNED,
        PRE_PANORAMA_DEFAULT_PINNED,
        MAIN_PRE_PANORAMA_DEFAULT_PINNED,
        MAIN_PANORAMA_DEFAULT_PINNED,
      ].some(
        (factoryPinned) =>
          parsedPinned.length === factoryPinned.length &&
          parsedPinned.every((id2, index) => id2 === factoryPinned[index]),
      );
    const pinned = isKnownPreviousFactoryLayout ? DEFAULT_PINNED : parsedPinned;
    const showLabels =
      typeof p3.showLabels === "boolean" ? p3.showLabels : DEFAULT_SHOW_LABELS;
    const layoutVersion =
      p3.layoutVersion === LATEST_LAYOUT_VERSION
        ? LATEST_LAYOUT_VERSION
        : LEGACY_LAYOUT_VERSION;
    return {
      pinned,
      showLabels,
      layoutVersion,
    };
  } catch {
    return {
      pinned: DEFAULT_PINNED,
      showLabels: DEFAULT_SHOW_LABELS,
      layoutVersion: LATEST_LAYOUT_VERSION,
    };
  }
}
function persist(state) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}
export const useImageToolbarCustomizationStore = create((set) => ({
  ...readPersisted(),
  setCustomization(next) {
    const pinned = next.pinned.filter(isImageToolbarToolId);
    const isDefault =
      pinned.length === DEFAULT_PINNED.length &&
      pinned.every((id2, index) => id2 === DEFAULT_PINNED[index]) &&
      !!next.showLabels === DEFAULT_SHOW_LABELS;
    const state = {
      pinned,
      showLabels: !!next.showLabels,
      layoutVersion: isDefault
        ? LATEST_LAYOUT_VERSION
        : useImageToolbarCustomizationStore.getState().layoutVersion,
    };
    set(state);
    persist(state);
  },
  resetToDefaults() {
    const state = {
      pinned: [...DEFAULT_PINNED],
      showLabels: DEFAULT_SHOW_LABELS,
      layoutVersion: LATEST_LAYOUT_VERSION,
    };
    set(state);
    persist(state);
  },
}));
