// video-node-toolbar-section.jsx
import { reactExports, useTranslation } from "../vendor.js";
import { useVideoToolbarCustomizationStore, VIDEO_TOOLBAR_TOOLS } from "../m15/handle-position-style.jsx";
import { Settings2 } from "../m15/parse-item.jsx";
import { AddToClipNodeIcon, MoreVerticalIcon$1 } from "../m01/generating-media-area.jsx";
import { NodeToolbar } from "../m01/use-lightbox-media-actions.jsx";
import { CreditCostBadge } from "../m01/create-tracker.jsx";
import { MediaClipPanel } from "../m02/media-clip-panel-inner.jsx";
import { classifyToolInteraction } from "../m03/image-tool-meta.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { VIDEO_TOOL_META, useVideoEditCost, useVideoEditRate } from "./text-node-inner.jsx";
function FramePreview({ engine, state: state2, loading, previewSize }) {
  const previewCanvasRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas || !state2.previewFrame) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { width, height } = state2.previewFrame;
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    } else {
      ctx.clearRect(0, 0, width, height);
    }
    ctx.drawImage(state2.previewFrame, 0, 0);
  }, [state2.previewFrame]);
  reactExports.useEffect(() => {
    if (!engine) return;
    const previewCanvas = previewCanvasRef.current;
    if (!previewCanvas) return;
    const ctx = previewCanvas.getContext("2d");
    if (!ctx) return;
    engine.onPreviewFrameDirect = (source, width, height) => {
      if (previewCanvas.width !== width || previewCanvas.height !== height) {
        previewCanvas.width = width;
        previewCanvas.height = height;
      } else {
        ctx.clearRect(0, 0, width, height);
      }
      ctx.drawImage(source, 0, 0, width, height);
    };
    return () => {
      engine.onPreviewFrameDirect = null;
    };
  }, [engine]);
  const maxPreviewWidth = 768;
  const maxPreviewHeight = 432;
  let displayW = maxPreviewWidth;
  let displayH = maxPreviewHeight;
  if (previewSize.w > 0 && previewSize.h > 0) {
    const ar = previewSize.w / previewSize.h;
    if (ar >= maxPreviewWidth / maxPreviewHeight) {
      displayW = maxPreviewWidth;
      displayH = Math.round(maxPreviewWidth / ar);
    } else {
      displayH = maxPreviewHeight;
      displayW = Math.round(maxPreviewHeight * ar);
    }
  }
  return (
    <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-[var(--canvas-controls-bg)] px-4 py-4">
      <canvas
        ref={previewCanvasRef}
        className="h-full w-full"
        style={{
          maxWidth: displayW,
          maxHeight: displayH,
          objectFit: "contain",
          borderRadius: 6,
        }}
      />
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="size-8 animate-spin rounded-full border-2 border-muted-foreground/20 border-t-muted-foreground" />
        </div>
      )}
    </div>
  );
}
async function extractFrameAtPlayhead(engine, videoName) {
  const { currentTime } = engine.getState();
  const bitmap = await engine.getPreviewFrame(currentTime);
  if (!bitmap) return null;
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(bitmap, 0, 0);
  const blob = await new Promise((resolve) => {
    canvas.toBlob((b3) => resolve(b3), "image/png");
  });
  if (!blob) return null;
  const baseName = videoName.replace(/\.[^.]+$/, "");
  const uuid = crypto.randomUUID().slice(0, 4);
  const filename = `${baseName}-frame-${uuid}.png`;
  return {
    blob,
    filename,
  };
}
function VideoFramePanelInner({ videoUrl, videoName, onClose, onExport }) {
  const [previewSize, setPreviewSize] = reactExports.useState({
    w: 640,
    h: 360,
  });
  const handleMediaLoaded = reactExports.useCallback((engine) => {
    const clips = engine.getClips();
    if (clips.length > 0 && clips[0].width > 0 && clips[0].height > 0) {
      setPreviewSize({
        w: clips[0].width,
        h: clips[0].height,
      });
    }
  }, []);
  const renderPreview2 = reactExports.useCallback(
    (ctx) => <FramePreview {...ctx} previewSize={previewSize} />,
    [previewSize],
  );
  return (
    <MediaClipPanel
      mediaUrl={videoUrl}
      mediaName={videoName}
      defaultMime="video/mp4"
      onClose={onClose}
      onExport={onExport}
      renderPreview={renderPreview2}
      onMediaLoaded={handleMediaLoaded}
      getExtFromMime={() => "png"}
      titleKey="canvas.extractFrame"
      exportLabelKey="canvas.extractFrame"
      cropEnabled={false}
      produceExport={extractFrameAtPlayhead}
    />
  );
}
export const VideoFramePanel = reactExports.memo(VideoFramePanelInner);
function CustomizeIcon() {
  return <Settings2 size={20} strokeWidth={1.5} aria-hidden="true" />;
}
export const VideoNodeToolbarSection = reactExports.memo(function VideoNodeToolbarSectionImpl({
  hasVideo,
  enhanceDisabled,
  onEnhance,
  hailuo03SuperResolutionVisible,
  hailuo03SuperResolutionDisabled,
  hailuo03SuperResolutionDurationSec,
  onHailuo03SuperResolution,
  eraseSubtitleDisabled,
  onEraseSubtitle,
  asrDisabled,
  onAsr,
  contentToolbarItems,
  onWatermark,
  onAddToClipNode,
  handleCustomizeToolbar,
  renderShell,
  onToolClick,
}) {
  const { t: t2 } = useTranslation();
  const pinned = useVideoToolbarCustomizationStore((s2) => s2.pinned);
  const showLabels = useVideoToolbarCustomizationStore((s2) => s2.showLabels);
  const enhanceVideoCost = useVideoEditCost("enhance-video");
  const hailuo03SuperResolutionCost = useVideoEditCost(
    "hailuo03-super-resolution",
    hailuo03SuperResolutionDurationSec,
  );
  const hailuo03SuperResolutionRate = useVideoEditRate("hailuo03-super-resolution");
  const items = reactExports.useMemo(() => {
    const wrap2 = (action, original, source) => {
      if (!onToolClick) return original;
      return () => {
        try {
          onToolClick({
            action,
            interaction: classifyToolInteraction(action),
            source,
          });
        } catch {}
        original();
      };
    };
    function trailingFor(id2) {
      if (id2 === "enhance-video") {
        return <CreditCostBadge cost={enhanceVideoCost} />;
      }
      if (id2 === "hailuo03-super-resolution") {
        return <CreditCostBadge cost={hailuo03SuperResolutionCost} />;
      }
      return void 0;
    }
    function tooltipLabelFor(id2) {
      if (id2 === "enhance-video") {
        return t2("canvas.enhanceVideo.tooltip", "通用视频提升清晰度和帧率");
      }
      if (id2 === "hailuo03-super-resolution") {
        if (hailuo03SuperResolutionRate === void 0) {
          return t2(
            "canvas.hailuo03SuperResolution.tooltipEligibility",
            "超分至2K，不仅提升分辨率，还能增强画面质量与细节。",
          );
        }
        return t2("canvas.hailuo03SuperResolution.tooltip", {
          defaultValue: "超分至2K，不仅提升分辨率，还能增强画面质量与细节。{{rate}} 积分/秒",
          rate: hailuo03SuperResolutionRate,
        });
      }
      return void 0;
    }
    const contentById = new Map(contentToolbarItems.map((it2) => [it2.id, it2]));
    const resolve = (id2) => {
      switch (id2) {
        case "enhance-video":
          return {
            onClick: onEnhance,
            disabled: !hasVideo || enhanceDisabled,
          };
        case "hailuo03-super-resolution":
          if (!hailuo03SuperResolutionVisible) return null;
          return {
            onClick: onHailuo03SuperResolution,
            disabled: !hasVideo || hailuo03SuperResolutionDisabled,
          };
        case "erase-subtitle":
          return {
            onClick: onEraseSubtitle,
            disabled: !hasVideo || eraseSubtitleDisabled,
          };
        case "asr":
          return {
            onClick: onAsr,
            disabled: !hasVideo || asrDisabled,
          };
        case "watermark":
          return onWatermark
            ? {
                onClick: onWatermark,
                disabled: !hasVideo,
              }
            : null;
        case "clip": {
          const c3 = contentById.get("clip");
          if (!c3?.onClick) return null;
          return {
            onClick: () => c3.onClick?.({}),
            disabled: c3.disabled,
          };
        }
        case "extract-frame": {
          const c3 = contentById.get("extract-frame");
          if (!c3?.onClick) return null;
          return {
            onClick: () => c3.onClick?.({}),
            disabled: c3.disabled,
          };
        }
        case "color-adjust": {
          const c3 = contentById.get("color-adjust");
          if (!c3?.onClick) return null;
          return {
            onClick: () => c3.onClick?.({}),
            disabled: c3.disabled,
          };
        }
        case "extract-audio": {
          const c3 = contentById.get("extract-audio");
          if (!c3?.onClick) return null;
          return {
            onClick: () => c3.onClick?.({}),
            disabled: c3.disabled,
          };
        }
      }
    };
    const pinnedItems = [];
    for (const id2 of pinned) {
      const wiring = resolve(id2);
      if (!wiring) continue;
      const meta2 = VIDEO_TOOL_META[id2];
      pinnedItems.push({
        id: id2,
        label: t2(meta2.labelKey, meta2.defaultLabel),
        tooltipLabel: tooltipLabelFor(id2),
        icon: meta2.icon,
        forceLabel: showLabels,
        disabled: wiring.disabled,
        dataActionUiId: id2 === "watermark" ? "canvas.video-node-watermark" : void 0,
        onClick: wiring.onClick ? wrap2(id2, wiring.onClick, "primary_bar") : void 0,
        trailing: trailingFor(id2),
      });
    }
    const overflowDropdown = [];
    for (const id2 of VIDEO_TOOLBAR_TOOLS) {
      if (pinned.includes(id2)) continue;
      const wiring = resolve(id2);
      if (!wiring) continue;
      const meta2 = VIDEO_TOOL_META[id2];
      overflowDropdown.push({
        id: id2,
        label: t2(meta2.labelKey, meta2.defaultLabel),
        tooltipLabel: tooltipLabelFor(id2),
        icon: meta2.icon,
        disabled: wiring.disabled,
        trailing: trailingFor(id2),
        onSelect: wiring.onClick ? wrap2(id2, wiring.onClick, "more_menu") : () => {},
      });
    }
    overflowDropdown.push({
      id: "customize-toolbar",
      label: t2("canvas.customizeToolbar.menu", "编辑工具栏"),
      icon: <CustomizeIcon />,
      onSelect: wrap2("customize-toolbar", handleCustomizeToolbar, "more_menu"),
      separator: true,
    });
    const moreItem = {
      id: "more",
      label: t2("common.more", "更多"),
      icon: <MoreVerticalIcon$1 size={16} />,
      hideDropdownArrow: true,
      dropdownItems: overflowDropdown,
      onDropdownOpen: onToolClick
        ? () =>
            onToolClick({
              action: "more",
              interaction: "opens_panel",
              source: "primary_bar",
            })
        : void 0,
    };
    const promote = contentToolbarItems.find((it2) => it2.id === "promote-to-asset");
    const addToChat = contentToolbarItems.find((it2) => it2.id === "add-to-chat");
    const fullscreen = contentToolbarItems.find((it2) => it2.id === "fullscreen");
    const fixedRight = [];
    if (promote) {
      fixedRight.push({
        ...promote,
        separator: true,
        onClick: promote.onClick
          ? (event) => wrap2("promote-to-asset", () => promote.onClick?.(event), "primary_bar")()
          : void 0,
      });
    }
    if (onAddToClipNode) {
      fixedRight.push({
        id: "add-to-clip-node",
        label: t2("canvas.addToClipNode", "添加到剪辑节点"),
        icon: <AddToClipNodeIcon />,
        separator: !promote,
        dataActionUiId: "canvas.node-add-to-clip-node",
        onClick: wrap2("add-to-clip-node", onAddToClipNode, "primary_bar"),
      });
    }
    if (addToChat) {
      fixedRight.push({
        ...addToChat,
        // The first utility action anchors the divider.
        separator: !promote && !onAddToClipNode,
        onClick: addToChat.onClick
          ? (event) => wrap2("add-to-chat", () => addToChat.onClick?.(event), "primary_bar")()
          : void 0,
      });
    }
    if (fullscreen) {
      fixedRight.push({
        ...fullscreen,
        onClick: fullscreen.onClick
          ? (event) => wrap2("fullscreen", () => fullscreen.onClick?.(event), "primary_bar")()
          : void 0,
      });
    }
    return [...pinnedItems, moreItem, ...fixedRight];
  }, [
    t2,
    hasVideo,
    enhanceDisabled,
    onEnhance,
    hailuo03SuperResolutionVisible,
    hailuo03SuperResolutionDisabled,
    onHailuo03SuperResolution,
    eraseSubtitleDisabled,
    onEraseSubtitle,
    asrDisabled,
    onAsr,
    contentToolbarItems,
    onWatermark,
    onAddToClipNode,
    handleCustomizeToolbar,
    pinned,
    showLabels,
    enhanceVideoCost,
    hailuo03SuperResolutionCost,
    hailuo03SuperResolutionRate,
    onToolClick,
  ]);
  return <NodeToolbar items={items} visible={true} renderShell={renderShell} />;
});
const DEFAULT_EMPTY_VIDEO_MODEL_ID = "MiniMax-H3";
export function resolveVideoPopoverModelInitialization(sources) {
  const contextualModelId =
    sources.draftModelId ??
    sources.assetModelId ??
    sources.assetMetadataModelId ??
    sources.assetParamsModelName ??
    sources.generatingModelId ??
    sources.upstreamModelId;
  return {
    defaultModelId:
      contextualModelId ??
      (sources.isUserEmpty && !sources.lastUsedModelId ? DEFAULT_EMPTY_VIDEO_MODEL_ID : void 0),
  };
}
function nonEmptyString$1(value) {
  return typeof value === "string" && value.trim().length > 0 ? value : void 0;
}
export function resolveVideoPopoverProviderTaskId(metadata, nodeData) {
  return (
    nonEmptyString$1(metadata?.providerTaskId) ??
    nonEmptyString$1(nodeData && typeof nodeData === "object" ? nodeData.providerTaskId : void 0)
  );
}
export const PORTAL_POPOVER_Z = 9998;
export const PORTAL_TOOLBAR_Z = 9999;
export const TOOLBAR_HEIGHT = 40;
export const TOOLBAR_GAP = 6;
export const VIEWPORT_MARGIN = 8;
export const I2V_POPOVER_WIDTH = 580;
export const I2V_POPOVER_HEIGHT_COMPACT = 254;
export const I2V_POPOVER_HEIGHT_EXPANDED = 500;
export const ENHANCE_POPOVER_WIDTH = 256;
export const ENHANCE_POPOVER_HEIGHT = 240;
