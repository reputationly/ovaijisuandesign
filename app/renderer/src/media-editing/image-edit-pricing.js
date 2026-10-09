// image-edit-pricing.js
import { calcImageCost } from "../generation/resolve-video-billing-tooltip.js";
import { useCanvasBridge } from "./package.jsx";
import { reactExports } from "../vendor.js";
import { CanvasOverlayStoreContext } from "../canvas/use-start-crop-from-node.js";

const NANO_BANANA_EDIT_PRICING_MODEL_ID = "nano_banana_2";

export const SEEDREAM_REDRAW_PRICING_MODEL_ID =
  "doubao-seedream-5-0-pro-260628";

const REMOVE_BG_PRICING_MODEL_ID = "jimeng_remove_background";

const ENHANCE_IMAGE_PRICING_MODEL_ID = "mediakit_enhance";

const IMAGE_EDIT_PRICING = {
  redraw: {
    modelId: NANO_BANANA_EDIT_PRICING_MODEL_ID,
    resolution: {
      kind: "dynamic",
    },
  },
  outpaint: {
    modelId: NANO_BANANA_EDIT_PRICING_MODEL_ID,
    resolution: {
      kind: "dynamic",
    },
  },
  erase: {
    modelId: SEEDREAM_REDRAW_PRICING_MODEL_ID,
    resolution: {
      kind: "dynamic",
    },
  },
  "move-object": {
    modelId: NANO_BANANA_EDIT_PRICING_MODEL_ID,
    resolution: {
      kind: "dynamic",
    },
  },
  "super-resolution": {
    modelId: ENHANCE_IMAGE_PRICING_MODEL_ID,
    resolution: {
      kind: "none",
    },
  },
  "remove-bg": {
    modelId: REMOVE_BG_PRICING_MODEL_ID,
    resolution: {
      kind: "none",
    },
  },
};

function resolveImageEditCost(
  pricing,
  tool2,
  selectedResolution,
  pricingModelIdOverride,
  refCount,
) {
  const spec = IMAGE_EDIT_PRICING[tool2];
  if (!spec) return void 0;
  const resolution =
    spec.resolution.kind === "dynamic"
      ? selectedResolution
      : spec.resolution.kind === "fixed"
        ? spec.resolution.resolution
        : void 0;
  return calcImageCost(
    pricing,
    pricingModelIdOverride ?? spec.modelId,
    resolution,
    void 0,
    refCount ?? 0,
  );
}

export function useImageEditCost(
  tool2,
  selectedResolution,
  pricingModelIdOverride,
  refCount,
) {
  const { pricingConfig } = useCanvasBridge();
  return resolveImageEditCost(
    pricingConfig,
    tool2,
    selectedResolution,
    pricingModelIdOverride,
    refCount,
  );
}

export function CanvasOverlayStoreProvider({ store, children: children2 }) {
  return reactExports.createElement(
    CanvasOverlayStoreContext.Provider,
    {
      value: store,
    },
    children2,
  );
}

export const ASPECT_RATIOS = {
  free: null,
  "1:1": 1,
  "4:3": 4 / 3,
  "3:4": 3 / 4,
  "16:9": 16 / 9,
  "9:16": 9 / 16,
};

export const DEFAULT_CROP = {
  x: 0.1,
  y: 0.1,
  width: 0.8,
  height: 0.8,
};
