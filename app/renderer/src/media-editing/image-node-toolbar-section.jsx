// image-node-toolbar-section.jsx
import {
  ActionListItem,
  ActionListPanel,
  ActionListSeparator,
  CompositedSvg,
  jsxRuntimeExports,
  reactExports,
  useTranslation,
} from "../vendor.js";
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
    (_unusedValue, index) => index + 1,
  );
  const colsIdx = Array.from(
    {
      length: SPLIT_MAX,
    },
    (_unusedValue, index) => index + 1,
  );
  return (
    <div className="select-none">
      <div className="mb-2 flex items-center justify-between gap-6">
        <span className="canvas-toolbar-label text-[var(--canvas-toolbar-muted-fg)]">
          {t("canvas.splitGrid.customTitle", "自定义宫格")}
        </span>
        <span className="canvas-toolbar-label tabular-nums text-[var(--canvas-toolbar-muted-fg)]">
          {hover.cols > 0
            ? `${hover.cols} × ${hover.rows}`
            : `${SPLIT_MAX} × ${SPLIT_MAX}`}
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
        {rowsIdx.map((rowCount) => (
          <div key={rowCount} className="flex gap-1">
            {colsIdx.map((columnCount) => {
              const selected2 = rowCount <= hover.rows && columnCount <= hover.cols;
              return (
                <button
                  key={columnCount}
                  type="button"
                  aria-label={`${columnCount} × ${rowCount}`}
                  onMouseEnter={() =>
                    setHover({
                      rows: rowCount,
                      cols: columnCount,
                    })
                  }
                  onClick={() => onPick(rowCount, columnCount)}
                  className={`h-8 w-8 rounded-md border transition-colors ${selected2 ? "border-brand-accent/80 bg-brand-accent/80 hover:bg-brand-accent/90 dark:hover:bg-brand-accent/90" : "border-[var(--canvas-controls-border)] bg-[var(--canvas-controls-hover)]"}`}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
function ChevronRight() {
  return (
    <CompositedSvg
      width="8"
      height="10"
      viewBox="0 0 8 10"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M2 1L6 5L2 9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </CompositedSvg>
  );
}
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
  disabled: disabled2,
  onPick,
  sourceGrid,
}) {
  const { t } = useTranslation();
  const [open, setOpen] = reactExports.useState(false);
  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger
          disabled={disabled2}
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
export const ImageNodeToolbarSection = reactExports.memo(
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
      setSeenNewFeatures((current2) => {
        if (current2.has(featureId)) return current2;
        const next2 = new Set(current2);
        next2.add(featureId);
        try {
          window.localStorage.setItem(
            IMAGE_TOOLBAR_NEW_FEATURE_STORAGE_KEY,
            JSON.stringify([...next2]),
          );
        } catch {}
        return next2;
      });
    }, []);
    const toolbarItems = reactExports.useMemo(() => {
      const wrap2 = (action, orig, source) => {
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
      const handlers2 = {
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
      function trailingFor(meta2) {
        if (meta2.costToolId === "remove-bg") {
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
        pinSplitGrid && handleSplitEnter
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
        const meta2 = IMAGE_TOOL_META[toolId];
        return {
          id: toolId,
          label: t(meta2.labelKey, meta2.defaultLabel),
          icon: meta2.icon,
          forceLabel: toolId === "panorama-reference" ? true : showLabels,
          disabled:
            (meta2.requiresDimensions && !hasDimensions) ||
            (toolId === "panorama-reference" && !handlePanoramaReference) ||
            (toolId === "watermark" && !handleWatermark),
          dataActionUiId: meta2.dataActionUiId,
          onClick: wrap2(toolId, handlers2[toolId], "primary_bar"),
          trailing: trailingFor(meta2),
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
        const meta2 = IMAGE_TOOL_META[toolId];
        return {
          id: toolId,
          label: t(meta2.labelKey, meta2.defaultLabel),
          icon: toolId === "rotate" ? <RotateIcon size={16} /> : meta2.icon,
          disabled:
            (meta2.requiresDimensions && !hasDimensions) ||
            (toolId === "panorama-reference" && !handlePanoramaReference) ||
            (toolId === "watermark" && !handleWatermark),
          trailing: trailingFor(meta2),
          onSelect: wrap2(toolId, handlers2[toolId], "more_menu"),
          showNewFeatureDot:
            isImageToolbarNewFeatureId(toolId) && !seenNewFeatures.has(toolId),
        };
      });
      if (handleSplitEnter && !pinSplitGrid) {
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
        onSelect: wrap2(
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
        ...(handlePromoteToAsset
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
          separator: !handlePromoteToAsset,
          onClick: wrap2("image-inplace-edit", handleImageEdit, "primary_bar"),
        },
        {
          id: "add-to-chat",
          label: t("canvas.addToChat"),
          icon: <AddToChatIcon />,
          separator: false,
          onClick: wrap2("add-to-chat", handleAddToChat, "primary_bar"),
        },
        {
          id: "fullscreen",
          label: t("canvas.fullscreen"),
          icon: <FullscreenIcon />,
          onClick: wrap2("fullscreen", handleFullscreen, "primary_bar"),
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
