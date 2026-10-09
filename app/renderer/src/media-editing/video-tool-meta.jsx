// video-tool-meta.jsx
import { reactExports, useTranslation } from "../vendor.js";
import { TextNodeInner } from "./text-node-inner.jsx";
import {
  AddToChatIcon,
  AddToClipNodeIcon,
  areNodePropsEqual,
  FullscreenIcon$1,
} from "../canvas/fullscreen-icon.jsx";
import { useEmitDerivedFromBlob } from "../canvas/use-start-crop-from-node.js";
import {
  calcToolCost,
  getModelBaseCost,
} from "../generation/resolution-tabs.jsx";
import { Stamp, useCanvasBridge } from "./package.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  AsrIcon,
  ClipIcon,
  ColorAdjustIcon,
  EraseSubtitleIcon,
  ExtractAudioIcon,
  ExtractFrameIcon,
  SuperResolutionIcon,
} from "../canvas/file-missing-icon.jsx";
import {
  DEFAULT_PINNED,
  DEFAULT_SHOW_LABELS,
  VIDEO_TOOLBAR_TOOLS,
} from "../canvas/use-video-starter-preset-store.js";
import { useVideoToolbarCustomizationStore } from "../canvas/read-persisted.js";
import { PromoteToAssetIcon } from "../canvas/generating-media-area.jsx";
import { CustomizeToolbarDialog$2 } from "./customize-toolbar-dialog.jsx";
import { useCanvasActions } from "./use-canvas-actions.js";

export const TextNode3 = reactExports.memo(TextNodeInner, areNodePropsEqual);

export function useVideoColorAdjust({
  id: id2,
  meta: meta2,
  nodeWidth,
  reactFlow,
  cropImage,
  lut,
}) {
  const [open, setOpen] = reactExports.useState(false);
  const emitDerived = useEmitDerivedFromBlob({
    id: id2,
    meta: meta2,
    nodeWidth,
    reactFlow,
    cropImage,
  });
  const openDialog = reactExports.useCallback(() => {
    if (!meta2?.url) return;
    setOpen(true);
  }, [meta2?.url]);
  const onConfirm = reactExports.useCallback(
    async (blob) => {
      await emitDerived(blob, {
        suffix: "color",
        ext: "mp4",
        baseFallback: "video",
      });
    },
    [emitDerived],
  );
  return {
    open,
    openDialog,
    dialogProps: {
      open,
      onOpenChange: setOpen,
      onConfirm,
      lut,
    },
  };
}

export const DEFAULT_ASR_LANGUAGE = "en";

const VIDEO_TOOLBAR_DEFAULT_PINNED = DEFAULT_PINNED;

const VIDEO_TOOLBAR_DEFAULT_SHOW_LABELS = DEFAULT_SHOW_LABELS;

export const VIDEO_TOOL_META = {
  "enhance-video": {
    id: "enhance-video",
    labelKey: "canvas.enhanceVideo.label",
    defaultLabel: "高清 & 补帧",
    icon: <SuperResolutionIcon />,
  },
  "hailuo03-super-resolution": {
    id: "hailuo03-super-resolution",
    labelKey: "canvas.hailuo03SuperResolution.label",
    defaultLabel: "H3 2K 超分",
    icon: <SuperResolutionIcon />,
  },
  clip: {
    id: "clip",
    labelKey: "canvas.clip",
    defaultLabel: "Clip",
    icon: <ClipIcon />,
  },
  watermark: {
    id: "watermark",
    labelKey: "canvas.watermark.label",
    defaultLabel: "Watermark",
    icon: <Stamp size={20} strokeWidth={1.5} aria-hidden="true" />,
  },
  "extract-frame": {
    id: "extract-frame",
    labelKey: "canvas.extractFrame",
    defaultLabel: "Extract frame",
    icon: <ExtractFrameIcon />,
  },
  "extract-audio": {
    id: "extract-audio",
    labelKey: "canvas.extractAudio",
    defaultLabel: "Extract Audio",
    icon: <ExtractAudioIcon />,
  },
  "erase-subtitle": {
    id: "erase-subtitle",
    labelKey: "canvas.eraseSubtitle.label",
    defaultLabel: "字幕消除",
    icon: <EraseSubtitleIcon />,
  },
  asr: {
    id: "asr",
    labelKey: "canvas.asr.label",
    defaultLabel: "字幕生成",
    icon: <AsrIcon />,
  },
  "color-adjust": {
    id: "color-adjust",
    labelKey: "canvas.colorAdjust",
    defaultLabel: "Color Adjust",
    icon: <ColorAdjustIcon />,
  },
};

const DEFAULTS$1 = {
  pinned: VIDEO_TOOLBAR_DEFAULT_PINNED,
  showLabels: VIDEO_TOOLBAR_DEFAULT_SHOW_LABELS,
};

export function CustomizeToolbarDialog({
  open,
  onOpenChange,
  hasPromoteToAsset = true,
  onApply,
  onAbandon,
}) {
  const { t: t2 } = useTranslation();
  const store = useVideoToolbarCustomizationStore();
  const fixedRightChips = [];
  if (hasPromoteToAsset) {
    fixedRightChips.push({
      id: "promote-to-asset",
      icon: <PromoteToAssetIcon />,
      label: t2("canvas.promoteToAsset"),
      showLabel: true,
    });
  }
  fixedRightChips.push({
    id: "add-to-clip-node",
    icon: <AddToClipNodeIcon />,
    label: t2("canvas.addToClipNode", "添加到剪辑节点"),
    showLabel: false,
  });
  fixedRightChips.push({
    id: "add-to-chat",
    icon: <AddToChatIcon />,
    label: t2("canvas.addToChat"),
    showLabel: false,
  });
  fixedRightChips.push({
    id: "fullscreen",
    icon: <FullscreenIcon$1 />,
    label: t2("canvas.fullscreen"),
    showLabel: false,
  });
  return (
    <CustomizeToolbarDialog$2
      open={open}
      onOpenChange={onOpenChange}
      allToolIds={VIDEO_TOOLBAR_TOOLS}
      toolMeta={VIDEO_TOOL_META}
      store={store}
      defaults={DEFAULTS$1}
      fixedRightChips={fixedRightChips}
      onApply={onApply}
      onAbandon={onAbandon}
    />
  );
}

export const ENHANCE_VIDEO_RESOLUTIONS = ["720p", "1080p", "2k", "4k"];

export const ENHANCE_VIDEO_FPS_OPTIONS = [30, 60];

export const DEFAULT_ENHANCE_VIDEO_RESOLUTION = "1080p";

export function suggestNextResolution(currentHeight) {
  if (!currentHeight || currentHeight <= 0)
    return DEFAULT_ENHANCE_VIDEO_RESOLUTION;
  const tiers = [
    [720, "1080p"],
    [1080, "2k"],
    [1440, "4k"],
  ];
  for (const [threshold, next2] of tiers) {
    if (currentHeight <= threshold) return next2;
  }
  return "4k";
}

export function parseEnhanceResolution(value) {
  if (typeof value !== "string") return void 0;
  const normalized = value.toLowerCase();
  return ENHANCE_VIDEO_RESOLUTIONS.includes(normalized) ? normalized : void 0;
}

export function parseEnhanceFps(value) {
  const n2 = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n2)) return void 0;
  return ENHANCE_VIDEO_FPS_OPTIONS.includes(n2) ? n2 : void 0;
}

const HAILUO03_BACKEND = "minimax_v3";

const HAILUO03_GENERATED_768P = "768P";

const HAILUO03_MODEL_ID = "MiniMax-H3";

function modelField(value, key2) {
  return value && typeof value === "object" ? value[key2] : void 0;
}

function isHailuo03ModelValue(value) {
  return typeof value === "string" && value === HAILUO03_MODEL_ID;
}

function isGenerated768P(meta2) {
  return meta2.params?.resolution === HAILUO03_GENERATED_768P;
}

export function resolveHailuo03SuperResolutionDuration(meta2) {
  const duration = Number(meta2?.params?.duration);
  return Number.isFinite(duration) && duration > 0 ? duration : void 0;
}

export function isHailuo03SuperResolutionEligible(meta2, modelInfo) {
  if (
    !meta2?.path ||
    !meta2.providerTaskId ||
    meta2.backend !== HAILUO03_BACKEND
  )
    return false;
  if (!isGenerated768P(meta2)) return false;
  return [
    meta2.model_id,
    meta2.model,
    meta2.params?.model_name,
    modelField(modelInfo, "id"),
    modelField(modelInfo, "model_name"),
    modelField(modelInfo, "pricingId"),
    modelField(modelInfo, "name"),
  ].some(isHailuo03ModelValue);
}

export const VIDEO_TOOL_PRICING = {
  "enhance-video": {
    kind: "video",
    modelId: "mediakit-enhance-video",
  },
  "hailuo03-super-resolution": {
    kind: "tool",
    modelId: "h3_video_super_resolution",
    resolution: "2K",
  },
};

function resolveVideoEditCost(pricingConfig, tool2, sourceDurationSec) {
  const pricing = VIDEO_TOOL_PRICING[tool2];
  if (!pricing) return void 0;
  if (pricing.kind === "tool") {
    if (!pricing.resolution) return void 0;
    return calcToolCost(
      pricingConfig,
      pricing.modelId,
      pricing.resolution,
      sourceDurationSec,
    );
  }
  return getModelBaseCost(pricingConfig, pricing.modelId);
}

export function useVideoEditCost(tool2, sourceDurationSec) {
  const { pricingConfig } = useCanvasBridge();
  return reactExports.useMemo(
    () => resolveVideoEditCost(pricingConfig, tool2, sourceDurationSec),
    [pricingConfig, sourceDurationSec, tool2],
  );
}

function resolveAsrSourcePath(submitAsr, meta2) {
  if (!submitAsr) return null;
  const path2 = meta2?.path;
  if (!path2) return null;
  return path2;
}

export function useAsrSubmit({ id: id2, meta: meta2, submitAsr }) {
  const { focusNextDerivedFrom } = useCanvasActions();
  const submit = reactExports.useCallback(
    (params) => {
      const sourcePath = resolveAsrSourcePath(submitAsr, meta2);
      if (!sourcePath || !submitAsr) return;
      focusNextDerivedFrom(id2);
      void submitAsr(id2, sourcePath, params.language);
    },
    [id2, meta2, submitAsr, focusNextDerivedFrom],
  );
  return {
    submit,
  };
}

function resolveEnhanceVideoSourcePath(submitEnhanceVideo, meta2) {
  if (!submitEnhanceVideo) return null;
  const path2 = meta2?.path;
  if (!path2) return null;
  return path2;
}

export function useEnhanceVideoSubmit({
  id: id2,
  meta: meta2,
  submitEnhanceVideo,
}) {
  const submit = reactExports.useCallback(
    (params) => {
      const sourcePath = resolveEnhanceVideoSourcePath(
        submitEnhanceVideo,
        meta2,
      );
      if (!sourcePath || !submitEnhanceVideo) return;
      void submitEnhanceVideo(id2, sourcePath, params);
    },
    [id2, meta2, submitEnhanceVideo],
  );
  return {
    submit,
  };
}

function resolveEraseSubtitleSourcePath(submitEraseSubtitle, meta2) {
  if (!submitEraseSubtitle) return null;
  const path2 = meta2?.path;
  if (!path2) return null;
  return path2;
}

export function useEraseSubtitleSubmit({
  id: id2,
  meta: meta2,
  submitEraseSubtitle,
}) {
  const { focusNextDerivedFrom } = useCanvasActions();
  const submit = reactExports.useCallback(
    (params) => {
      const sourcePath = resolveEraseSubtitleSourcePath(
        submitEraseSubtitle,
        meta2,
      );
      if (!sourcePath || !submitEraseSubtitle) return;
      focusNextDerivedFrom(id2);
      void submitEraseSubtitle(id2, sourcePath, {
        mode: params.mode,
        regions: params.regions,
      });
    },
    [id2, meta2, submitEraseSubtitle, focusNextDerivedFrom],
  );
  return {
    submit,
  };
}
