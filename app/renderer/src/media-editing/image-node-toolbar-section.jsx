// image-node-toolbar-section.jsx
import jsxRuntimeExports from "react/jsx-runtime";
import reactExports from "react";
import { useTranslation } from "react-i18next";
import { ActionListItem, ActionListPanel, ActionListSeparator } from "./action-list.jsx";
import { CompositedSvg } from "./icon-compositing.js";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSubTrigger,
} from "./audio-lightbox.jsx";
import {
  DropdownMenu,
  DropdownMenuSub,
  DropdownMenuTrigger,
} from "./use-warn-missing-asset-meta.jsx";
import { SplitGridIcon } from "../canvas/file-missing-icon.jsx";
import { RotateIcon, Settings2 } from "./package.jsx";
import { useImageToolbarCustomizationStore } from "./read-persisted.js";
import {
  IMAGE_TOOLBAR_TOOLS,
  LEGACY_IMAGE_TOOLBAR_TOOLS,
} from "./use-start-cloud-edit-from-node.js";
import {
  AddToChatIcon,
  AnnotationIcon,
  FullscreenIcon,
  MoreVerticalIcon,
} from "../canvas/fullscreen-icon.jsx";
import { PromoteToAssetIcon } from "../canvas/generating-media-area.jsx";
import { NodeToolbar } from "./toolbar-item.jsx";
import { CreditCostBadge } from "../generation/missing-asset-card.jsx";
import { useImageEditCost } from "./image-edit-pricing.js";
import { IMAGE_TOOL_META } from "./image-tool-meta.jsx";
import { classifyToolInteraction } from "./node-tool-interaction.js";
import { createLucideIcon as createLucideIcon$1 } from "lucide-react";
const SPLIT_PRESETS = [
  {
    rows: 2,
    cols: 2,
  },
  {
    rows: 3,
    cols: 3,
  },
  {
    rows: 4,
    cols: 4,
  },
  {
    rows: 5,
    cols: 5,
  },
];
function resolveSplitGridMenuOptions(sourceGrid) {
  return sourceGrid ? [sourceGrid] : SPLIT_PRESETS;
}
const SPLIT_MAX = 5;
function CustomGridPicker({ onPick }) {
  const { t } = useTranslation();
  const [hover, setHover] = reactExports.useState({
    rows: 0,
    cols: 0,
  });
  const rowsIdx = Array.from(
    {
      length: SPLIT_MAX,
    },
    (_2, i2) => i2 + 1,
  );
  const colsIdx = Array.from(
    {
      length: SPLIT_MAX,
    },
    (_2, i2) => i2 + 1,
  );
  return (
    <div className="select-none">
      <div className="mb-2 flex items-center justify-between gap-6">
        <span className="canvas-toolbar-label text-[var(--canvas-toolbar-muted-fg)]">
          {t("canvas.splitGrid.customTitle", "自定义宫格")}
        </span>
        <span className="canvas-toolbar-label tabular-nums text-[var(--canvas-toolbar-muted-fg)]">
          {hover.cols > 0 ? `${hover.cols} × ${hover.rows}` : `${SPLIT_MAX} × ${SPLIT_MAX}`}
        </span>
      </div>
      <div
        className="flex flex-col gap-1"
        onMouseLeave={() =>
          setHover({
            rows: 0,
            cols: 0,
          })
        }
      >
        {rowsIdx.map((r2) => (
          <div key={r2} className="flex gap-1">
            {colsIdx.map((c3) => {
              const selected = r2 <= hover.rows && c3 <= hover.cols;
              return (
                <button
                  key={c3}
                  type="button"
                  aria-label={`${c3} × ${r2}`}
                  onMouseEnter={() =>
                    setHover({
                      rows: r2,
                      cols: c3,
                    })
                  }
                  onClick={() => onPick(r2, c3)}
                  className={`h-8 w-8 rounded-md border transition-colors ${selected ? "border-brand-accent/80 bg-brand-accent/80 hover:bg-brand-accent/90" : "border-[var(--canvas-controls-border)] bg-[var(--canvas-controls-hover)]"}`}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
// 图标数据原本写在这里（产物把它提到模块顶层的 `__iconNode$4` 复用，我们这份只用到一次，
// 所以写回内联形式，和 custom-icons.js 里其它图标一致）。
const ChevronRight = createLucideIcon$1("chevron-right", [["path", { d: "m9 18 6-6-6-6", key: "mthhwq" }]]);
function ImageSplitMenuItems({ onPick, sourceGrid }) {
  const { t } = useTranslation();
  const menuOptions = resolveSplitGridMenuOptions(sourceGrid);
  return (
    <>
      {menuOptions.map(({ rows, cols }) => (
        <ActionListItem
          key={`${rows}x${cols}`}
          render={<DropdownMenuItem />}
          onClick={() => onPick(rows, cols)}
          data-action-ui-id={`canvas.node-split-grid-${cols}x${rows}`}
        >
          <span className="whitespace-nowrap">
            {sourceGrid ? (
              `${cols}×${rows}`
            ) : (
              <>
                {t("canvas.splitGrid.preset", "{{n}}宫格", {
                  n: rows * cols,
                })}
                <span className="ml-1 text-[var(--canvas-toolbar-muted-fg)]">
                  ({cols}×{rows})
                </span>
              </>
            )}
          </span>
        </ActionListItem>
      ))}
      <ActionListSeparator />
      <DropdownMenuSub>
        <ActionListItem render={<DropdownMenuSubTrigger />}>
          <span className="whitespace-nowrap">
            {t("canvas.splitGrid.custom", "自定义")}
          </span>
          <span className="ml-auto pl-3 opacity-60">
            <ChevronRight />
          </span>
        </ActionListItem>
        <DropdownMenuContent
          side="right"
          align="start"
          sideOffset={8}
          className="p-3"
          variant="toolbar"
        >
          <CustomGridPicker onPick={onPick} />
        </DropdownMenuContent>
      </DropdownMenuSub>
    </>
  );
}
const IMAGE_TOOLBAR_NEW_FEATURE_STORAGE_KEY =
  "hilo:canvas:image-toolbar:seen-features:v1";
const IMAGE_TOOLBAR_NEW_FEATURE_IDS = [
  "relight",
  "storyboard-grid",
  "watermark",
  "layer-decompose",
];
const IMAGE_TOOLBAR_NEW_FEATURE_ID_SET = new Set(IMAGE_TOOLBAR_NEW_FEATURE_IDS);
function readSeenImageToolbarFeatures() {
  if (typeof window === "undefined") return new Set();
  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(IMAGE_TOOLBAR_NEW_FEATURE_STORAGE_KEY) ??
        "[]",
    );
    if (!Array.isArray(parsed)) return new Set();
    return new Set(
      parsed.filter(
        (value) =>
          typeof value === "string" &&
          IMAGE_TOOLBAR_NEW_FEATURE_ID_SET.has(value),
      ),
    );
  } catch {
    return new Set();
  }
}
function isImageToolbarNewFeatureId(value) {
  return IMAGE_TOOLBAR_NEW_FEATURE_ID_SET.has(value);
}
function CustomizeIcon() {
  return <Settings2 size={20} strokeWidth={1.5} aria-hidden="true" />;
}
function SplitGridDisclosureIcon({ open }) {
  return (
    <CompositedSvg
      width="8"
      height="5"
      viewBox="0 0 8 5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="ml-0.5 opacity-60"
      aria-hidden="true"
    >
      <path d={open ? "M1 4L4 1L7 4" : "M1 1L4 4L7 1"} />
    </CompositedSvg>
  );
}
function PinnedSplitGridToolbarItem({
  disabled,
  onPick,
  sourceGrid,
}) {
  const { t } = useTranslation();
  const [open, setOpen] = reactExports.useState(false);
  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger
          disabled={disabled}
          className="canvas-toolbar-action"
          data-action-ui-id="canvas.node-split-grid"
        >
          <SplitGridIcon />
          <span className="canvas-toolbar-label whitespace-nowrap">
            {t("canvas.splitGrid.label", "Split Grid")}
          </span>
          <SplitGridDisclosureIcon open={open} />
        </DropdownMenuTrigger>
        <ActionListPanel
          className="w-max"
          render={
            <DropdownMenuContent
              side="bottom"
              sideOffset={8}
              align="start"
              variant="toolbar"
              className="data-open:zoom-in-100 data-closed:zoom-out-100"
            />
          }
        >
          <ImageSplitMenuItems onPick={onPick} sourceGrid={sourceGrid} />
        </ActionListPanel>
      </DropdownMenu>
      <div
        aria-hidden="true"
        style={{
          width: 1,
          height: 24,
          background: "var(--canvas-controls-text)",
          opacity: 0.1,
          flexShrink: 0,
        }}
      />
    </>
  );
}
const ImageNodeToolbarSectionImpl = reactExports.memo(
  function ImageNodeToolbarSectionImpl({
    hasDimensions,
    handleRedraw,
    handleOutpaint,
    handleErase,
    handleSuperResolution,
    handleRemoveBg,
    handleLayerDecompose,
    handleAddToChat,
    handleCrop,
    handleColorAdjust,
    handleImageEdit,
    handleMultiAngle,
    handlePanoramaReference,
    handleWatermark,
    handleStoryboardGrid,
    handleRelight,
    handleRotate,
    handleSplitEnter,
    pinSplitGrid = false,
    // 产物里这个开关决定「未实现的能力」是否也占位显示。
    // 内层实现默认 true；对外导出的包装组件传 false（见文件末尾）。
    showUnavailableTools = true,
    splitGrid,
    handleFullscreen,
    handlePromoteToAsset,
    handleCustomizeToolbar,
    onToolClick,
  }) {
    const { t } = useTranslation();
    const removeBgCost = useImageEditCost("remove-bg");
    const storedPinned = useImageToolbarCustomizationStore((customizationState) => customizationState.pinned);
    const pinned = reactExports.useMemo(
      () =>
        storedPinned.filter(
          (toolId) =>
            toolId !== "image-inplace-edit" &&
            (toolId !== "storyboard-grid" || !!handleStoryboardGrid),
        ),
      [storedPinned, handleStoryboardGrid],
    );
    const showLabels = useImageToolbarCustomizationStore((customizationState) => customizationState.showLabels);
    const layoutVersion = useImageToolbarCustomizationStore(
      (customizationState) => customizationState.layoutVersion,
    );
    const [seenNewFeatures, setSeenNewFeatures] = reactExports.useState(
      readSeenImageToolbarFeatures,
    );
    const markNewFeatureSeen = reactExports.useCallback((featureId) => {
      setSeenNewFeatures((current) => {
        if (current.has(featureId)) return current;
        const next = new Set(current);
        next.add(featureId);
        try {
          window.localStorage.setItem(
            IMAGE_TOOLBAR_NEW_FEATURE_STORAGE_KEY,
            JSON.stringify([...next]),
          );
        } catch {}
        return next;
      });
    }, []);
    const toolbarItems = reactExports.useMemo(() => {
      const wrap = (action, orig, source) => {
        return () => {
          if (isImageToolbarNewFeatureId(action)) markNewFeatureSeen(action);
          if (onToolClick) {
            try {
              onToolClick({
                action,
                interaction: classifyToolInteraction(action),
                source,
              });
            } catch {}
          }
          orig();
        };
      };
      const handlers = {
        erase: handleErase,
        redraw: handleRedraw,
        crop: handleCrop,
        outpaint: handleOutpaint,
        "super-resolution": handleSuperResolution,
        "remove-bg": handleRemoveBg,
        "layer-decompose": handleLayerDecompose,
        "color-adjust": handleColorAdjust,
        "image-inplace-edit": handleImageEdit,
        rotate: handleRotate,
        "multi-angle": handleMultiAngle,
        "storyboard-grid": handleStoryboardGrid ?? (() => {}),
        "panorama-reference": handlePanoramaReference ?? (() => {}),
        watermark: handleWatermark ?? (() => {}),
        relight: handleRelight,
      };
      function trailingFor(meta) {
        if (meta.costToolId === "remove-bg") {
          return (
            <CreditCostBadge
              cost={removeBgCost}
              className="text-[13px] text-[var(--canvas-controls-text,#fff)]/70"
            />
          );
        }
        return void 0;
      }
      const handleSplitPick = (rows, cols) => {
        if (!handleSplitEnter) return;
        if (onToolClick) {
          try {
            onToolClick({
              action: "split-grid",
              interaction: "opens_mode",
              source: "primary_bar",
            });
          } catch {}
        }
        handleSplitEnter(rows, cols);
      };
      const pinnedSplitItems =
        pinSplitGrid && (handleSplitEnter || showUnavailableTools)
          ? [
              {
                id: "split-grid-pinned",
                label: t("canvas.splitGrid.label", "Split Grid"),
                render: () => (
                  <PinnedSplitGridToolbarItem
                    disabled={!hasDimensions}
                    onPick={handleSplitPick}
                    sourceGrid={splitGrid}
                  />
                ),
              },
            ]
          : [];
      const pinnedItems = pinned.map((toolId) => {
        const meta = IMAGE_TOOL_META[toolId];
        return {
          id: toolId,
          label: t(meta.labelKey, meta.defaultLabel),
          icon: meta.icon,
          forceLabel: toolId === "panorama-reference" ? true : showLabels,
          disabled:
            (meta.requiresDimensions && !hasDimensions) ||
            (toolId === "panorama-reference" && !handlePanoramaReference) ||
            (toolId === "watermark" && !handleWatermark),
          dataActionUiId: meta.dataActionUiId,
          onClick: wrap(toolId, handlers[toolId], "primary_bar"),
          trailing: trailingFor(meta),
          showNewFeatureDot:
            isImageToolbarNewFeatureId(toolId) && !seenNewFeatures.has(toolId),
        };
      });
      const availableTools =
        layoutVersion === 1 ? LEGACY_IMAGE_TOOLBAR_TOOLS : IMAGE_TOOLBAR_TOOLS;
      const overflowToolIds = availableTools.filter(
        (toolId) =>
          toolId !== "image-inplace-edit" &&
          (toolId !== "storyboard-grid" || !!handleStoryboardGrid) &&
          !pinned.includes(toolId),
      );
      const overflowDropdown = overflowToolIds.map((toolId) => {
        const meta = IMAGE_TOOL_META[toolId];
        return {
          id: toolId,
          label: t(meta.labelKey, meta.defaultLabel),
          icon: toolId === "rotate" ? <RotateIcon size={16} /> : meta.icon,
          disabled:
            (meta.requiresDimensions && !hasDimensions) ||
            (toolId === "panorama-reference" && !handlePanoramaReference) ||
            (toolId === "watermark" && !handleWatermark),
          trailing: trailingFor(meta),
          onSelect: wrap(toolId, handlers[toolId], "more_menu"),
          showNewFeatureDot:
            isImageToolbarNewFeatureId(toolId) && !seenNewFeatures.has(toolId),
        };
      });
      if ((handleSplitEnter || showUnavailableTools) && !pinSplitGrid) {
        overflowDropdown.push({
          id: "split-grid",
          label: t("canvas.splitGrid.label", "宫格切分"),
          icon: <SplitGridIcon />,
          disabled: !hasDimensions,
          onSelect: () => {},
          renderSubmenu: hasDimensions
            ? () => (
                <ImageSplitMenuItems
                  onPick={(rows, cols) => {
                    if (onToolClick) {
                      try {
                        onToolClick({
                          action: "split-grid",
                          interaction: "opens_mode",
                          source: "more_menu",
                        });
                      } catch {}
                    }
                    handleSplitEnter(rows, cols);
                  }}
                />
              )
            : void 0,
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
          ? () => {
              try {
                onToolClick({
                  action: "more",
                  interaction: "opens_panel",
                  source: "primary_bar",
                });
              } catch {}
            }
          : void 0,
      };
      return [
        ...pinnedSplitItems,
        ...pinnedItems,
        moreItem,
        // Right-side fixed utility region mirrored by the customization-dialog preview.
        ...(handlePromoteToAsset || showUnavailableTools
          ? [
              {
                id: "promote-to-asset",
                label: t("canvas.promoteToAsset"),
                icon: <PromoteToAssetIcon />,
                forceLabel: true,
                separator: true,
                dataActionUiId: "canvas.node-promote-to-asset",
                onClick: (clickEvent) => {
                  if (onToolClick) {
                    try {
                      onToolClick({
                        action: "promote-to-asset",
                        interaction: "opens_dialog",
                        source: "primary_bar",
                      });
                    } catch {}
                  }
                  handlePromoteToAsset(clickEvent);
                },
              },
            ]
          : []),
        {
          id: "image-inplace-edit",
          label: t(
            IMAGE_TOOL_META["image-inplace-edit"].labelKey,
            "Edit Image",
          ),
          icon: <AnnotationIcon size={20} />,
          separator: !handlePromoteToAsset && !showUnavailableTools,
          onClick: wrap("image-inplace-edit", handleImageEdit, "primary_bar"),
        },
        {
          id: "add-to-chat",
          label: t("canvas.addToChat"),
          icon: <AddToChatIcon />,
          separator: false,
          onClick: wrap("add-to-chat", handleAddToChat, "primary_bar"),
        },
        {
          id: "fullscreen",
          label: t("canvas.fullscreen"),
          icon: <FullscreenIcon />,
          onClick: wrap("fullscreen", handleFullscreen, "primary_bar"),
        },
      ];
    }, [
      t,
      hasDimensions,
      pinned,
      showLabels,
      layoutVersion,
      handleAddToChat,
      handleCrop,
      handleOutpaint,
      handleErase,
      handleRedraw,
      handleSuperResolution,
      handleRemoveBg,
      handleLayerDecompose,
      handleColorAdjust,
      handleImageEdit,
      handleMultiAngle,
      handlePanoramaReference,
      handleWatermark,
      handleStoryboardGrid,
      handleRelight,
      handleRotate,
      handleSplitEnter,
      pinSplitGrid,
      splitGrid,
      handleFullscreen,
      handlePromoteToAsset,
      handleCustomizeToolbar,
      removeBgCost,
      onToolClick,
      seenNewFeatures,
      markNewFeatureSeen,
    ]);
    return <NodeToolbar items={toolbarItems} visible={true} />;
  },
);

/**
 * 对外导出的工具栏。
 *
 * 产物里这里是**两层**：`ImageNodeToolbarSection$1`（实现，默认 `showUnavailableTools: true`）
 * 和一层很薄的包装，固定传 `false` —— 所以画布上只显示**真正可用的**工具，
 * 而不是把「未实现的能力」也占位画出来（视频/音频节点上多出的「剪辑」「音频分离」就是这么来的）。
 */
const ImageNodeToolbarSection = reactExports.memo(function ImageNodeToolbarSection(props) {
  return <ImageNodeToolbarSectionImpl {...props} showUnavailableTools={false} />;
});

export { ImageNodeToolbarSection, ImageNodeToolbarSectionImpl };
