// video-node-toolbar-section.jsx
import {
  useVideoEditCost,
  VIDEO_TOOL_META,
  VIDEO_TOOL_PRICING,
} from "./video-tool-meta.jsx";
import { reactExports, useTranslation } from "../vendor.js";
import { Settings2, useCanvasBridge } from "./package.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { useVideoToolbarCustomizationStore } from "../canvas/read-persisted.js";
import { VIDEO_TOOLBAR_TOOLS } from "../canvas/use-video-starter-preset-store.js";
import {
  AddToClipNodeIcon,
  MoreVerticalIcon,
} from "../canvas/fullscreen-icon.jsx";
import { NodeToolbar } from "./toolbar-item.jsx";
import { CreditCostBadge } from "../generation/missing-asset-card.jsx";
import { classifyToolInteraction } from "./node-tool-interaction.js";
function resolveVideoEditRate(pricingConfig, tool) {
  const pricing = VIDEO_TOOL_PRICING[tool];
  if (!pricingConfig?.tool || pricing?.kind !== "tool" || !pricing.resolution)
    return void 0;
  const resolution = pricing.resolution;
  const model = pricingConfig.tool.find(
    (entry) => entry.modelID === pricing.modelId,
  );
  const cost = model?.costs?.find((entry) =>
    entry.resolutions?.includes(resolution),
  );
  return cost?.costPerSecond && cost.costPerSecond > 0
    ? cost.costPerSecond
    : void 0;
}
function useVideoEditRate(tool) {
  const { pricingConfig } = useCanvasBridge();
  return reactExports.useMemo(
    () => resolveVideoEditRate(pricingConfig, tool),
    [pricingConfig, tool],
  );
}
function CustomizeIcon() {
  return <Settings2 size={20} strokeWidth={1.5} aria-hidden="true" />;
}
export const VideoNodeToolbarSection = reactExports.memo(
  function VideoNodeToolbarSectionImpl({
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
    const { t } = useTranslation();
    const pinned = useVideoToolbarCustomizationStore((toolbarState) => toolbarState.pinned);
    const showLabels = useVideoToolbarCustomizationStore((toolbarState) => toolbarState.showLabels);
    const enhanceVideoCost = useVideoEditCost("enhance-video");
    const hailuo03SuperResolutionCost = useVideoEditCost(
      "hailuo03-super-resolution",
      hailuo03SuperResolutionDurationSec,
    );
    const hailuo03SuperResolutionRate = useVideoEditRate(
      "hailuo03-super-resolution",
    );
    const items = reactExports.useMemo(() => {
      const wrap = (action, original, source) => {
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
      function trailingFor(toolId) {
        if (toolId === "enhance-video") {
          return <CreditCostBadge cost={enhanceVideoCost} />;
        }
        if (toolId === "hailuo03-super-resolution") {
          return <CreditCostBadge cost={hailuo03SuperResolutionCost} />;
        }
        return void 0;
      }
      function tooltipLabelFor(toolId) {
        if (toolId === "enhance-video") {
          return t("canvas.enhanceVideo.tooltip", "通用视频提升清晰度和帧率");
        }
        if (toolId === "hailuo03-super-resolution") {
          if (hailuo03SuperResolutionRate === void 0) {
            return t(
              "canvas.hailuo03SuperResolution.tooltipEligibility",
              "超分至2K，不仅提升分辨率，还能增强画面质量与细节。",
            );
          }
          return t("canvas.hailuo03SuperResolution.tooltip", {
            defaultValue:
              "超分至2K，不仅提升分辨率，还能增强画面质量与细节。{{rate}} 积分/秒",
            rate: hailuo03SuperResolutionRate,
          });
        }
        return void 0;
      }
      const contentById = new Map(
        contentToolbarItems.map((toolbarItem) => [toolbarItem.id, toolbarItem]),
      );
      const resolve = (toolId) => {
        switch (toolId) {
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
            const clipTool = contentById.get("clip");
            if (!clipTool?.onClick) return null;
            return {
              onClick: () => clipTool.onClick?.({}),
              disabled: clipTool.disabled,
            };
          }
          case "extract-frame": {
            const frameExtractionTool = contentById.get("extract-frame");
            if (!frameExtractionTool?.onClick) return null;
            return {
              onClick: () => frameExtractionTool.onClick?.({}),
              disabled: frameExtractionTool.disabled,
            };
          }
          case "color-adjust": {
            const colorAdjustmentTool = contentById.get("color-adjust");
            if (!colorAdjustmentTool?.onClick) return null;
            return {
              onClick: () => colorAdjustmentTool.onClick?.({}),
              disabled: colorAdjustmentTool.disabled,
            };
          }
          case "extract-audio": {
            const audioExtractionTool = contentById.get("extract-audio");
            if (!audioExtractionTool?.onClick) return null;
            return {
              onClick: () => audioExtractionTool.onClick?.({}),
              disabled: audioExtractionTool.disabled,
            };
          }
        }
      };
      const pinnedItems = [];
      for (const toolId of pinned) {
        const wiring = resolve(toolId);
        if (!wiring) continue;
        const meta = VIDEO_TOOL_META[toolId];
        pinnedItems.push({
          id: toolId,
          label: t(meta.labelKey, meta.defaultLabel),
          tooltipLabel: tooltipLabelFor(toolId),
          icon: meta.icon,
          forceLabel: showLabels,
          disabled: wiring.disabled,
          dataActionUiId:
            toolId === "watermark" ? "canvas.video-node-watermark" : void 0,
          onClick: wiring.onClick
            ? wrap(toolId, wiring.onClick, "primary_bar")
            : void 0,
          trailing: trailingFor(toolId),
        });
      }
      const overflowDropdown = [];
      for (const toolId of VIDEO_TOOLBAR_TOOLS) {
        if (pinned.includes(toolId)) continue;
        const wiring = resolve(toolId);
        if (!wiring) continue;
        const meta = VIDEO_TOOL_META[toolId];
        overflowDropdown.push({
          id: toolId,
          label: t(meta.labelKey, meta.defaultLabel),
          tooltipLabel: tooltipLabelFor(toolId),
          icon: meta.icon,
          disabled: wiring.disabled,
          trailing: trailingFor(toolId),
          onSelect: wiring.onClick
            ? wrap(toolId, wiring.onClick, "more_menu")
            : () => {},
        });
      }
      overflowDropdown.push({
        id: "customize-toolbar",
        label: t("canvas.customizeToolbar.menu", "编辑工具栏"),
        icon: <CustomizeIcon />,
        onSelect: wrap(
          "customize-toolbar",
          handleCustomizeToolbar,
          "more_menu",
        ),
        separator: true,
      });
      const moreItem = {
        id: "more",
        label: t("common.more", "更多"),
        icon: <MoreVerticalIcon size={16} />,
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
      const promote = contentToolbarItems.find(
        (toolbarItem) => toolbarItem.id === "promote-to-asset",
      );
      const addToChat = contentToolbarItems.find(
        (toolbarItem) => toolbarItem.id === "add-to-chat",
      );
      const fullscreen = contentToolbarItems.find(
        (toolbarItem) => toolbarItem.id === "fullscreen",
      );
      const fixedRight = [];
      if (promote) {
        fixedRight.push({
          ...promote,
          separator: true,
          onClick: promote.onClick
            ? (event) =>
                wrap(
                  "promote-to-asset",
                  () => promote.onClick?.(event),
                  "primary_bar",
                )()
            : void 0,
        });
      }
      if (onAddToClipNode) {
        fixedRight.push({
          id: "add-to-clip-node",
          label: t("canvas.addToClipNode", "添加到剪辑节点"),
          icon: <AddToClipNodeIcon />,
          separator: !promote,
          dataActionUiId: "canvas.node-add-to-clip-node",
          onClick: wrap("add-to-clip-node", onAddToClipNode, "primary_bar"),
        });
      }
      if (addToChat) {
        fixedRight.push({
          ...addToChat,
          // The first utility action anchors the divider.
          separator: !promote && !onAddToClipNode,
          onClick: addToChat.onClick
            ? (event) =>
                wrap(
                  "add-to-chat",
                  () => addToChat.onClick?.(event),
                  "primary_bar",
                )()
            : void 0,
        });
      }
      if (fullscreen) {
        fixedRight.push({
          ...fullscreen,
          onClick: fullscreen.onClick
            ? (event) =>
                wrap(
                  "fullscreen",
                  () => fullscreen.onClick?.(event),
                  "primary_bar",
                )()
            : void 0,
        });
      }
      return [...pinnedItems, moreItem, ...fixedRight];
    }, [
      t,
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
    return (
      <NodeToolbar items={items} visible={true} renderShell={renderShell} />
    );
  },
);
