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
function resolveVideoEditRate(pricingConfig, tool2) {
  const pricing = VIDEO_TOOL_PRICING[tool2];
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
function useVideoEditRate(tool2) {
  const { pricingConfig } = useCanvasBridge();
  return reactExports.useMemo(
    () => resolveVideoEditRate(pricingConfig, tool2),
    [pricingConfig, tool2],
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
    const { t: t2 } = useTranslation();
    const pinned = useVideoToolbarCustomizationStore((s2) => s2.pinned);
    const showLabels = useVideoToolbarCustomizationStore((s2) => s2.showLabels);
    const enhanceVideoCost = useVideoEditCost("enhance-video");
    const hailuo03SuperResolutionCost = useVideoEditCost(
      "hailuo03-super-resolution",
      hailuo03SuperResolutionDurationSec,
    );
    const hailuo03SuperResolutionRate = useVideoEditRate(
      "hailuo03-super-resolution",
    );
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
            defaultValue:
              "超分至2K，不仅提升分辨率，还能增强画面质量与细节。{{rate}} 积分/秒",
            rate: hailuo03SuperResolutionRate,
          });
        }
        return void 0;
      }
      const contentById = new Map(
        contentToolbarItems.map((it2) => [it2.id, it2]),
      );
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
          dataActionUiId:
            id2 === "watermark" ? "canvas.video-node-watermark" : void 0,
          onClick: wiring.onClick
            ? wrap2(id2, wiring.onClick, "primary_bar")
            : void 0,
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
          onSelect: wiring.onClick
            ? wrap2(id2, wiring.onClick, "more_menu")
            : () => {},
        });
      }
      overflowDropdown.push({
        id: "customize-toolbar",
        label: t2("canvas.customizeToolbar.menu", "编辑工具栏"),
        icon: <CustomizeIcon />,
        onSelect: wrap2(
          "customize-toolbar",
          handleCustomizeToolbar,
          "more_menu",
        ),
        separator: true,
      });
      const moreItem = {
        id: "more",
        label: t2("common.more", "更多"),
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
        (it2) => it2.id === "promote-to-asset",
      );
      const addToChat = contentToolbarItems.find(
        (it2) => it2.id === "add-to-chat",
      );
      const fullscreen = contentToolbarItems.find(
        (it2) => it2.id === "fullscreen",
      );
      const fixedRight = [];
      if (promote) {
        fixedRight.push({
          ...promote,
          separator: true,
          onClick: promote.onClick
            ? (event) =>
                wrap2(
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
            ? (event) =>
                wrap2(
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
                wrap2(
                  "fullscreen",
                  () => fullscreen.onClick?.(event),
                  "primary_bar",
                )()
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
    return (
      <NodeToolbar items={items} visible={true} renderShell={renderShell} />
    );
  },
);
