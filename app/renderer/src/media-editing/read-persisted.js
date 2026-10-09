// read-persisted.js
import {
  DEFAULT_PINNED$1,
  DEFAULT_SHOW_LABELS$1,
  IMAGE_TOOLBAR_TOOLS,
  LEGACY_IMAGE_TOOLBAR_TOOLS,
} from "./use-start-cloud-edit-from-node.js";
import { create$2 } from "../vendor.js";

const STORAGE_KEY$9 = "hilo:canvas:image-toolbar:customization";

const PRE_RELIGHT_WORKFLOW_DEFAULT_PINNED = [
  "crop",
  "super-resolution",
  "redraw",
  "watermark",
  "multi-angle",
  "storyboard-grid",
  "panorama-reference",
];

const PRE_WATERMARK_DEFAULT_PINNED$1 = [
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

function readPersisted$3() {
  if (typeof window === "undefined") {
    return {
      pinned: DEFAULT_PINNED$1,
      showLabels: DEFAULT_SHOW_LABELS$1,
      layoutVersion: LATEST_LAYOUT_VERSION,
    };
  }
  try {
    const raw2 = window.localStorage.getItem(STORAGE_KEY$9);
    if (!raw2) {
      return {
        pinned: DEFAULT_PINNED$1,
        showLabels: DEFAULT_SHOW_LABELS$1,
        layoutVersion: LATEST_LAYOUT_VERSION,
      };
    }
    const parsed = JSON.parse(raw2);
    if (!parsed || typeof parsed !== "object") {
      return {
        pinned: DEFAULT_PINNED$1,
        showLabels: DEFAULT_SHOW_LABELS$1,
        layoutVersion: LATEST_LAYOUT_VERSION,
      };
    }
    const p3 = parsed;
    const parsedPinned = Array.isArray(p3.pinned)
      ? p3.pinned.filter(isImageToolbarToolId)
      : DEFAULT_PINNED$1;
    const isKnownPreviousFactoryLayout =
      p3.layoutVersion === LATEST_LAYOUT_VERSION &&
      [
        PRE_RELIGHT_WORKFLOW_DEFAULT_PINNED,
        PRE_WATERMARK_DEFAULT_PINNED$1,
        PRE_PANORAMA_DEFAULT_PINNED,
        MAIN_PRE_PANORAMA_DEFAULT_PINNED,
        MAIN_PANORAMA_DEFAULT_PINNED,
      ].some(
        (factoryPinned) =>
          parsedPinned.length === factoryPinned.length &&
          parsedPinned.every((id2, index2) => id2 === factoryPinned[index2]),
      );
    const pinned = isKnownPreviousFactoryLayout
      ? DEFAULT_PINNED$1
      : parsedPinned;
    const showLabels =
      typeof p3.showLabels === "boolean"
        ? p3.showLabels
        : DEFAULT_SHOW_LABELS$1;
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
      pinned: DEFAULT_PINNED$1,
      showLabels: DEFAULT_SHOW_LABELS$1,
      layoutVersion: LATEST_LAYOUT_VERSION,
    };
  }
}

function persist$1(state2) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY$9, JSON.stringify(state2));
  } catch {}
}

export const useImageToolbarCustomizationStore = create$2((set2) => ({
  ...readPersisted$3(),
  setCustomization(next2) {
    const pinned = next2.pinned.filter(isImageToolbarToolId);
    const isDefault =
      pinned.length === DEFAULT_PINNED$1.length &&
      pinned.every((id2, index2) => id2 === DEFAULT_PINNED$1[index2]) &&
      !!next2.showLabels === DEFAULT_SHOW_LABELS$1;
    const state2 = {
      pinned,
      showLabels: !!next2.showLabels,
      layoutVersion: isDefault
        ? LATEST_LAYOUT_VERSION
        : useImageToolbarCustomizationStore.getState().layoutVersion,
    };
    set2(state2);
    persist$1(state2);
  },
  resetToDefaults() {
    const state2 = {
      pinned: [...DEFAULT_PINNED$1],
      showLabels: DEFAULT_SHOW_LABELS$1,
      layoutVersion: LATEST_LAYOUT_VERSION,
    };
    set2(state2);
    persist$1(state2);
  },
}));
