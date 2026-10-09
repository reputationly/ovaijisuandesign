// image-node-toolbar-section.jsx
import { useTranslation, reactExports, Position, useNodeId, reactDomExports, useStore$3, NodeToolbar$1 } from "../vendor.js";
import { useCanvasIsMultiSelect, useCanvasIsBoxSelecting, RotateIcon, useCanvasIsDragging } from "./parse-item.jsx";
import { useImageToolbarCustomizationStore, LEGACY_IMAGE_TOOLBAR_TOOLS, IMAGE_TOOLBAR_TOOLS, MultiImageOverlayStoreContext } from "./use-multi-image-actions.js";
import {
  AddToChatIcon,
  FullscreenIcon$1,
  CloseIcon$1,
  SendArrowIcon,
  SplitGridIcon,
  AnnotationIcon,
  MoreVerticalIcon$1,
  PromoteToAssetIcon,
} from "../canvas/generating-media-area.jsx";
import { NodeToolbar, NODE_POPOVER_SAFE_GAP } from "./use-lightbox-media-actions.jsx";
import { Button$2 } from "../canvas/use-media-node-actions.jsx";
import { CreditCostBadge } from "../generation/create-tracker.jsx";
import { usePortalAnchorPlacement } from "../generation/model-chip.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { useImageEditCost } from "./calc-crop-rect.jsx";
import { CustomizeToolbarDialog$2 } from "./color-adjust-dialog.jsx";
import {
  CustomizeIcon$1,
  IMAGE_TOOLBAR_DEFAULT_PINNED,
  IMAGE_TOOLBAR_DEFAULT_SHOW_LABELS,
  IMAGE_TOOLBAR_NEW_FEATURE_STORAGE_KEY,
  IMAGE_TOOL_META,
  ImageSplitMenuItems,
  PinnedSplitGridToolbarItem,
  classifyToolInteraction,
  isImageToolbarNewFeatureId,
  readSeenImageToolbarFeatures,
} from "./image-tool-meta.jsx";
export const ImageNodeToolbarSection = reactExports.memo(function ImageNodeToolbarSectionImpl({
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
  const { t: t2 } = useTranslation();
  const removeBgCost = useImageEditCost("remove-bg");
  const storedPinned = useImageToolbarCustomizationStore((s2) => s2.pinned);
  const pinned = reactExports.useMemo(
    () =>
      storedPinned.filter(
        (toolId) =>
          toolId !== "image-inplace-edit" &&
          (toolId !== "storyboard-grid" || !!handleStoryboardGrid),
      ),
    [storedPinned, handleStoryboardGrid],
  );
  const showLabels = useImageToolbarCustomizationStore((s2) => s2.showLabels);
  const layoutVersion = useImageToolbarCustomizationStore((s2) => s2.layoutVersion);
  const [seenNewFeatures, setSeenNewFeatures] = reactExports.useState(readSeenImageToolbarFeatures);
  const markNewFeatureSeen = reactExports.useCallback((id2) => {
    setSeenNewFeatures((current2) => {
      if (current2.has(id2)) return current2;
      const next2 = new Set(current2);
      next2.add(id2);
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
              label: t2("canvas.splitGrid.label", "Split Grid"),
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
    const pinnedItems = pinned.map((id2) => {
      const meta2 = IMAGE_TOOL_META[id2];
      return {
        id: id2,
        label: t2(meta2.labelKey, meta2.defaultLabel),
        icon: meta2.icon,
        forceLabel: id2 === "panorama-reference" ? true : showLabels,
        disabled:
          (meta2.requiresDimensions && !hasDimensions) ||
          (id2 === "panorama-reference" && !handlePanoramaReference) ||
          (id2 === "watermark" && !handleWatermark),
        dataActionUiId: meta2.dataActionUiId,
        onClick: wrap2(id2, handlers2[id2], "primary_bar"),
        trailing: trailingFor(meta2),
        showNewFeatureDot: isImageToolbarNewFeatureId(id2) && !seenNewFeatures.has(id2),
      };
    });
    const availableTools = layoutVersion === 1 ? LEGACY_IMAGE_TOOLBAR_TOOLS : IMAGE_TOOLBAR_TOOLS;
    const overflowToolIds = availableTools.filter(
      (id2) =>
        id2 !== "image-inplace-edit" &&
        (id2 !== "storyboard-grid" || !!handleStoryboardGrid) &&
        !pinned.includes(id2),
    );
    const overflowDropdown = overflowToolIds.map((id2) => {
      const meta2 = IMAGE_TOOL_META[id2];
      return {
        id: id2,
        label: t2(meta2.labelKey, meta2.defaultLabel),
        icon: id2 === "rotate" ? <RotateIcon size={16} /> : meta2.icon,
        disabled:
          (meta2.requiresDimensions && !hasDimensions) ||
          (id2 === "panorama-reference" && !handlePanoramaReference) ||
          (id2 === "watermark" && !handleWatermark),
        trailing: trailingFor(meta2),
        onSelect: wrap2(id2, handlers2[id2], "more_menu"),
        showNewFeatureDot: isImageToolbarNewFeatureId(id2) && !seenNewFeatures.has(id2),
      };
    });
    if (handleSplitEnter && !pinSplitGrid) {
      overflowDropdown.push({
        id: "split-grid",
        label: t2("canvas.splitGrid.label", "宫格切分"),
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
      label: t2("canvas.customizeToolbar.menu", "编辑工具栏"),
      icon: <CustomizeIcon$1 />,
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
              label: t2("canvas.promoteToAsset"),
              icon: <PromoteToAssetIcon />,
              forceLabel: true,
              separator: true,
              dataActionUiId: "canvas.node-promote-to-asset",
              onClick: (e2) => {
                if (onToolClick) {
                  try {
                    onToolClick({
                      action: "promote-to-asset",
                      interaction: "opens_dialog",
                      source: "primary_bar",
                    });
                  } catch {}
                }
                handlePromoteToAsset(e2);
              },
            },
          ]
        : []),
      {
        id: "image-inplace-edit",
        label: t2(IMAGE_TOOL_META["image-inplace-edit"].labelKey, "Edit Image"),
        icon: <AnnotationIcon size={20} />,
        separator: !handlePromoteToAsset,
        onClick: wrap2("image-inplace-edit", handleImageEdit, "primary_bar"),
      },
      {
        id: "add-to-chat",
        label: t2("canvas.addToChat"),
        icon: <AddToChatIcon />,
        separator: false,
        onClick: wrap2("add-to-chat", handleAddToChat, "primary_bar"),
      },
      {
        id: "fullscreen",
        label: t2("canvas.fullscreen"),
        icon: <FullscreenIcon$1 />,
        onClick: wrap2("fullscreen", handleFullscreen, "primary_bar"),
      },
    ];
  }, [
    t2,
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
});
const TOOL_META = IMAGE_TOOL_META;
const DEFAULTS$2 = {
  pinned: IMAGE_TOOLBAR_DEFAULT_PINNED,
  showLabels: IMAGE_TOOLBAR_DEFAULT_SHOW_LABELS,
};
export function CustomizeToolbarDialog$1({ open, onOpenChange }) {
  const { t: t2 } = useTranslation();
  const store = useImageToolbarCustomizationStore();
  const allToolIds = store.layoutVersion === 1 ? LEGACY_IMAGE_TOOLBAR_TOOLS : IMAGE_TOOLBAR_TOOLS;
  const fixedRightChips = [
    {
      id: "promote-to-asset",
      icon: <PromoteToAssetIcon />,
      label: t2("canvas.promoteToAsset"),
      showLabel: true,
    },
    {
      id: "image-inplace-edit",
      icon: <AnnotationIcon size={20} />,
      label: t2("canvas.imageEdit.label", "Edit Image"),
      showLabel: false,
    },
    {
      id: "add-to-chat",
      icon: <AddToChatIcon />,
      label: t2("canvas.addToChat"),
      showLabel: false,
    },
    {
      id: "fullscreen",
      icon: <FullscreenIcon$1 />,
      label: t2("canvas.fullscreen"),
      showLabel: false,
    },
  ];
  return (
    <CustomizeToolbarDialog$2
      open={open}
      onOpenChange={onOpenChange}
      allToolIds={allToolIds}
      toolMeta={TOOL_META}
      store={store}
      defaults={DEFAULTS$2}
      fixedRightChips={fixedRightChips}
    />
  );
}
const OUTPUT_EDGE_MAX = 10240;
const ENHANCE_IMAGE_RESOLUTIONS = ["1k", "2k", "4k", "8k"];
const RESOLUTION_LONG_EDGE = {
  "1k": 1024,
  "2k": 2048,
  "4k": 3840,
  "8k": 7680,
};
const RESOLUTION_LABELS$1 = {
  "1k": "1K",
  "2k": "2K",
  "4k": "4K",
  "8k": "8K",
};
function formatEnhanceImageResolution(value) {
  return RESOLUTION_LABELS$1[value];
}
const DEFAULT_ENHANCE_IMAGE_RESOLUTION = "2k";
function longEdge(width, height) {
  if (!width || !height || width <= 0 || height <= 0) return void 0;
  return Math.max(width, height);
}
function isEnhanceImageResolutionBelowSource(option2, width, height) {
  const long = longEdge(width, height);
  if (long === void 0) return false;
  return RESOLUTION_LONG_EDGE[option2] <= long;
}
function computeEnhanceImageTarget(option2, width, height) {
  if (!width || !height || width <= 0 || height <= 0) return void 0;
  const long = Math.max(width, height);
  const targetLong = Math.min(RESOLUTION_LONG_EDGE[option2], OUTPUT_EDGE_MAX);
  const scale2 = targetLong / long;
  const targetWidth = Math.min(Math.round(width * scale2), OUTPUT_EDGE_MAX);
  const targetHeight = Math.min(Math.round(height * scale2), OUTPUT_EDGE_MAX);
  return {
    targetWidth,
    targetHeight,
  };
}
function suggestEnhanceImageResolution(width, height) {
  const long = longEdge(width, height);
  if (long === void 0) return DEFAULT_ENHANCE_IMAGE_RESOLUTION;
  for (const option2 of ENHANCE_IMAGE_RESOLUTIONS) {
    if (RESOLUTION_LONG_EDGE[option2] > long) return option2;
  }
  return "8k";
}
export const EnhanceImagePopover = reactExports.memo(function EnhanceImagePopover2({
  onSubmit,
  onClose,
  width,
  height,
  creditCost,
}) {
  const { t: t2 } = useTranslation();
  const [resolution, setResolution] = reactExports.useState(() =>
    width && height
      ? suggestEnhanceImageResolution(width, height)
      : DEFAULT_ENHANCE_IMAGE_RESOLUTION,
  );
  const onCloseRef = reactExports.useRef(onClose);
  onCloseRef.current = onClose;
  const nodeId = useNodeId();
  const selectedSelector = reactExports.useCallback(
    (s2) => (nodeId ? !!s2.nodeLookup.get(nodeId)?.selected : true),
    [nodeId],
  );
  const selected2 = useStore$3(selectedSelector);
  const isDragging = useCanvasIsDragging();
  const isMultiSelect = useCanvasIsMultiSelect();
  const isBoxSelecting = useCanvasIsBoxSelecting();
  reactExports.useEffect(() => {
    if (!selected2) onCloseRef.current();
  }, [selected2]);
  const hidden = isDragging || isMultiSelect || isBoxSelecting;
  const isBelowSource = isEnhanceImageResolutionBelowSource(resolution, width, height);
  const handleSubmit = reactExports.useCallback(() => {
    if (isBelowSource) return;
    const target = computeEnhanceImageTarget(resolution, width, height);
    onSubmit({
      resolution,
      targetWidth: target?.targetWidth,
      targetHeight: target?.targetHeight,
    });
  }, [isBelowSource, resolution, width, height, onSubmit]);
  return (
    <NodeToolbar$1
      isVisible={true}
      position={Position.Bottom}
      offset={NODE_POPOVER_SAFE_GAP}
      align="center"
    >
      <div
        className="flex w-64 flex-col gap-3 rounded-lg border bg-[var(--canvas-controls-bg)] p-3 shadow-[var(--canvas-shadow-dropdown)] animate-[i2v-popover-in_0.15s_ease-out]"
        style={{
          display: hidden ? "none" : void 0,
        }}
        onPointerDown={(e2) => e2.stopPropagation()}
      >
        <div className="font-heading text-[13px] font-medium text-[var(--canvas-controls-text)]">
          {t2("canvas.enhanceImage.title", "高清增强")}
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] text-[var(--canvas-controls-text-muted)]">
            {t2("canvas.enhanceImage.resolutionLabel", "分辨率")}
          </span>
          <ResolutionToggle
            value={resolution}
            width={width}
            height={height}
            onChange={setResolution}
          />
        </div>
        <div className="flex w-full items-center justify-between pt-3">
          <button
            type="button"
            onClick={onClose}
            data-action-ui-id="canvas.enhance-image.cancel"
            className="flex size-8 items-center justify-center rounded-md text-[var(--canvas-controls-text)] transition-colors duration-150 hover:bg-[var(--canvas-controls-hover)]"
            aria-label={t2("canvas.enhanceImage.cancel", "取消")}
            title={t2("canvas.enhanceImage.cancel", "取消")}
          >
            <CloseIcon$1 />
          </button>
          <div className="flex items-center gap-1.5">
            <CreditCostBadge cost={creditCost} compact={true} />
            <Button$2
              variant="default"
              size="icon"
              disabled={isBelowSource}
              onClick={handleSubmit}
              data-action-ui-id="canvas.enhance-image.submit"
              aria-label={t2("canvas.enhanceImage.submit", "生成")}
              title={
                isBelowSource
                  ? t2("canvas.enhanceImage.belowSource", "目标分辨率不高于原图")
                  : void 0
              }
            >
              <SendArrowIcon />
            </Button$2>
          </div>
        </div>
      </div>
    </NodeToolbar$1>
  );
});
function ResolutionToggle({ value, width, height, onChange }) {
  const { t: t2 } = useTranslation();
  return (
    <div
      className="flex h-8 items-center gap-0.5 rounded-md p-0.5"
      style={{
        background: "var(--canvas-controls-active, #ffffff14)",
      }}
    >
      {ENHANCE_IMAGE_RESOLUTIONS.map((option2) => {
        const active2 = option2 === value;
        const disabled2 = isEnhanceImageResolutionBelowSource(option2, width, height);
        return (
          <button
            key={option2}
            type="button"
            disabled={disabled2}
            onClick={() => {
              if (disabled2) return;
              if (option2 !== value) onChange(option2);
            }}
            data-action-ui-id={`canvas.enhance-image.resolution-${option2}`}
            title={
              disabled2 ? t2("canvas.enhanceImage.belowSource", "目标分辨率不高于原图") : void 0
            }
            className="flex-1 h-7 rounded-md px-2.5 text-[13px] font-medium transition-colors"
            style={{
              background: active2 ? "var(--canvas-primary-btn-bg, #ffffff)" : "transparent",
              color: active2
                ? "var(--canvas-primary-btn-icon, #000)"
                : "var(--canvas-controls-text, #fff)",
              cursor: disabled2 ? "not-allowed" : "pointer",
              opacity: disabled2 ? 0.5 : 1,
            }}
          >
            {formatEnhanceImageResolution(option2)}
          </button>
        );
      })}
    </div>
  );
}
export function MultiImageOverlayStoreProvider({ store, children: children2 }) {
  return reactExports.createElement(
    MultiImageOverlayStoreContext.Provider,
    {
      value: store,
    },
    children2,
  );
}
const COUNT_POPUP_WIDTH = 120;
export function CountChip({
  value,
  maxCount,
  options: explicitOptions,
  minCount = 1,
  onChange,
  disabled: disabled2,
}) {
  const { t: t2 } = useTranslation();
  const [open, setOpen] = reactExports.useState(false);
  const anchorRef = reactExports.useRef(null);
  const popupRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (!open) return;
    const handleMouseDown2 = (e2) => {
      const t22 = e2.target;
      if (!t22) return;
      if (popupRef.current?.contains(t22)) return;
      if (anchorRef.current?.contains(t22)) return;
      setOpen(false);
    };
    const handleKeyDown2 = (e2) => {
      if (e2.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleMouseDown2, true);
    document.addEventListener("keydown", handleKeyDown2);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown2, true);
      document.removeEventListener("keydown", handleKeyDown2);
    };
  }, [open]);
  const placement = usePortalAnchorPlacement(anchorRef, {
    open,
    minHeight: 80,
    maxHeight: 200,
    align: "center",
    panelWidth: COUNT_POPUP_WIDTH,
  });
  const options = reactExports.useMemo(() => {
    const next2 = [];
    if (explicitOptions) {
      for (const option2 of explicitOptions) {
        if (option2 >= minCount && option2 <= maxCount && !next2.includes(option2)) {
          next2.push(option2);
        }
      }
      return next2;
    }
    for (let i2 = minCount; i2 <= maxCount; i2++) next2.push(i2);
    return next2;
  }, [explicitOptions, maxCount, minCount]);
  reactExports.useEffect(() => {
    const fallback = options.at(-1);
    if (fallback !== void 0 && !options.includes(value)) onChange(fallback);
  }, [value, options, onChange]);
  return (
    <div className="relative">
      <button
        ref={anchorRef}
        type="button"
        data-action-ui-id="canvas.image-node.count-chip"
        onClick={(e2) => {
          e2.stopPropagation();
          setOpen((v2) => !v2);
        }}
        disabled={disabled2 || options.length <= 1}
        className="h-8 min-w-10 px-2 text-[13px] font-normal tracking-[-0.52px] leading-[20px] opacity-70 text-foreground hover:enabled:opacity-100 disabled:cursor-default disabled:opacity-40 flex items-center justify-center gap-1 canvas-prompt-control"
        title={t2("canvas.imageNode.generateVariations", {
          count: value,
          defaultValue: `Generate ${value} variation${value > 1 ? "s" : ""}`,
        })}
      >
        <span aria-hidden="true">×</span>
        <span>{value}</span>
      </button>
      {open &&
        options.length > 1 &&
        placement &&
        reactDomExports.createPortal(
          <div
            ref={popupRef}
            data-side={placement.side}
            className="canvas-portal-popover-in nowheel fixed z-[10001] flex flex-col rounded-[16px] border shadow-lg p-1"
            style={{
              background: "var(--canvas-controls-bg)",
              borderColor: "var(--canvas-controls-border)",
              left: placement.left,
              top: placement.top,
              bottom: placement.bottom,
              maxHeight: placement.maxHeight,
              width: COUNT_POPUP_WIDTH,
            }}
            onClick={(e2) => e2.stopPropagation()}
            onKeyDown={(e2) => e2.stopPropagation()}
            role="listbox"
            tabIndex={-1}
          >
            <div className="px-2 pt-1.5 pb-1 text-center text-xs font-normal text-muted-foreground">
              {t2("canvas.imageNode.generationCount", {
                defaultValue: "Generation Count",
              })}
            </div>
            {options.map((opt) => {
              const active2 = opt === value;
              return (
                <button
                  key={opt}
                  type="button"
                  data-action-ui-id={`canvas.image-node.count-chip.option-${opt}`}
                  onClick={(e2) => {
                    e2.stopPropagation();
                    onChange(opt);
                    setOpen(false);
                  }}
                  role="option"
                  aria-selected={active2}
                  className={`h-7 px-2 text-center text-sm rounded-sm transition-colors duration-150 ${active2 ? "bg-[var(--canvas-param-selected-bg)] text-foreground" : "text-foreground hover:bg-[var(--canvas-controls-hover)]"}`}
                >
                  {"× "}
                  {opt}
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </div>
  );
}
