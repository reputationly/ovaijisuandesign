// image-node-inner.jsx
import { jsxRuntimeExports, reactExports, useTranslation, useStore$3, NodeToolbar$1, Position, dedupedToast, useNodeId, X$7, BACKEND_VIBE_STORYBOARD, useAssetMetadataApi, useReactFlow, useUpdateNodeInternals } from "../vendor.js";
import { useStableZoomTier } from "../canvas/canvas-surface-recovery-scheduler.jsx";
import { usePathFileVersion, appendCanvasFileVersion, NodeResizeFrame } from "../infra/create-html-iframe-pool-store.jsx";
import { useNodeRename, useModelForAsset } from "../infra/create-recently-added-store.jsx";
import { computeNodeSize } from "../canvas/group-nodes-in-canvas.js";
import { useCanvasBridge, useCanvasIsDragging, useCanvasIsMultiSelect, useCanvasIsBoxSelecting, useAssetMeta, MEDIA_NODE_RADIUS, useCanvasActions } from "./parse-item.jsx";
import { useEmitDerivedFromBlob, useCropViewportZoom, getNodeFlowRect, useCropState, useStartCropFromNode } from "../canvas/use-file-bytes.js";
import { useImageNodeView, useSubImages, useOutpaintState, useEraseState, useRedrawState, useMoveObjectState, useStartOutpaintFromNode, useStartEraseFromNode, useStartRedrawFromNode, useMultiImageActions } from "./use-multi-image-actions.js";
import {
  ImagePlaceholderIcon,
  getFileExtension,
  formatFileSize,
} from "../canvas/generating-media-area.jsx";
import { NodeHeader, NodeHandles } from "../canvas/use-inline-rename.jsx";
import {
  isMissingAssetNodeData,
  MissingAssetCard,
  MEDIA_FALLBACK_NODE_SIZE,
  MediaUnpreviewableFallback,
} from "../generation/create-tracker.jsx";
import {
  NODE_POPOVER_SAFE_GAP,
  isCloneData,
  lightboxItemFromAssetMeta,
  lightboxItemsFromSlots,
  resolveLightboxIndexForSlot,
  getLightboxSlotKey,
  submitAfterOptionalDraftFlush,
  useWarnMissingAssetMeta,
} from "./use-lightbox-media-actions.jsx";
import { isEnhanceImageInputEligible } from "../generation/text-models.js";
import {
  CanvasImage,
  PANORAMA_VIEWER_PLUGIN_ID,
  PANORAMA_EMPTY_NODE_SIZE,
} from "./canvas-image.jsx";
import {
  resolveGifAnimationSrc,
  MediaDownloadButton,
  mergeReferenceImageIds,
  useEmptyAspectRatio,
  emptySizeFromRatio,
  useLutBundle,
  canOpenAssetGenerationPopover,
  resolveReferenceImages,
  resolveReferenceVideos,
} from "./base-backend.jsx";
import { cn$5 } from "../infra/use-browser-overlay-dialog-props.jsx";
import {
  Button$2,
  useAddToChat,
  useMediaFallbackSize,
  NodeShell,
  NodeBody,
  PlaceholderUploadButton,
} from "../canvas/use-media-node-actions.jsx";
import {
  Select$2,
  SelectTrigger$1,
  SelectValue$1,
  SelectContent$1,
  SelectItem$1,
} from "../generation/calc-video-cost-breakdown.jsx";
import { IMAGE_CARD_MAX_WIDTH, reconcileNodeSize } from "../canvas/prune-persisted-node-data.js";
import { useReferenceNavigationSnapshot } from "./decode-worker-pool.jsx";
import { useUpstreamTextContent, useUpstreamSameTypeMeta } from "../assets/use-assets-ref-validate.js";
import {
  resolveActivePopoverDraft,
  buildOriginalGenerationDraft,
  draftOverridesOriginalGeneration,
  usePopoverCloseWithDeselect,
  resolveReferenceAudios,
  resolveReferenceTexts,
  resolveEditableTextReferencePaths,
  resolveDefaultReferencePaths,
} from "../generation/resolve-reference-texts.js";
import { useImageEditCost } from "./calc-crop-rect.jsx";
import { buildThumbnailUrl, buildThumbnailSrcSet } from "./media-clip-panel-inner.jsx";
import { shouldShowImageBottomPopover, I2VPopover } from "./arrow-shape.js";
import {
  ImageNodeToolbarSection,
  CustomizeToolbarDialog$1,
  EnhanceImagePopover,
} from "./image-node-toolbar-section.jsx";
import { I2IPopover } from "../generation/param-duration-slider.jsx";
import { ImageLightbox$2 } from "./image-lightbox.jsx";
import { ColorAdjustDialog } from "./color-adjust-dialog.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  DEFAULT_WATERMARK_SETTINGS,
  ImageSplitOverlay,
  ImageWatermarkPreview,
  LayerDecomposePrompt,
  renderWatermarkedBlob,
} from "./create-box-faces.jsx";
import { ImageInplaceEditor, ImageRotateEditToolbar } from "./editor2.jsx";
import { ToolSlider } from "./multi-angle-editor.jsx";
import { MultiAnglePopover, MultiImageChrome, MultiImageOverlay } from "./ready-sub-image-card.jsx";
import {
  ROUND_DOTS_POPOVER_GAP_OFFSET,
  RelightPopover,
  RoundDots,
  resolveImageNodeDisplayName,
  resolveStoryboardGridSelection,
} from "./relight-editor.jsx";
import {
  StoryboardGridPopover,
  useDirectImageActions,
  useImageColorAdjust,
  useImageInplaceEdit,
  useImageLightbox,
  useImageRotateEdit,
} from "./storyboard-grid-editor.jsx";
import {
  ImageRotatePreview,
  ImageSplitEditToolbar,
  useImageSplitMode,
} from "./use-image-split-mode.jsx";
export const WATERMARK_PANEL_WIDTH = 340;
const PANEL_MAX_HEIGHT = 480;
const PANEL_MIN_HEIGHT$1 = 360;
const VIEWPORT_MARGIN$1 = 16;
const FONT_OPTIONS = [
  {
    value: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    label: "Inter",
  },
  {
    value: "'Helvetica Neue', Helvetica, Arial, sans-serif",
    label: "Helvetica",
  },
  {
    value: "'Times New Roman', serif",
    label: "Times New Roman",
  },
  {
    value: "Georgia, serif",
    label: "Georgia",
  },
  {
    value: "'Courier New', monospace",
    label: "Courier New",
  },
  {
    value: "'PingFang SC', 'Microsoft YaHei', sans-serif",
    label: "PingFang / YaHei",
  },
  {
    value: "'STSong', 'SimSun', serif",
    label: "Song",
  },
  {
    value: "'STKaiti', 'KaiTi', serif",
    label: "Kai",
  },
];
const FONT_ITEMS = Object.fromEntries(
  FONT_OPTIONS.map((option2) => [option2.value, option2.label]),
);
const WEIGHT_OPTIONS = [
  {
    value: 300,
    label: "Light",
  },
  {
    value: 400,
    label: "Regular",
  },
  {
    value: 600,
    label: "Semibold",
  },
  {
    value: 800,
    label: "Extrabold",
  },
];
const WEIGHT_ITEMS = Object.fromEntries(
  WEIGHT_OPTIONS.map((option2) => [String(option2.value), option2.label]),
);
const FONT_SIZE_OPTIONS = [10, 12, 14, 16, 18, 20, 24, 32, 36, 48, 64, 72, 96, 120];
const POSITIONS = ["tl", "tc", "tr", "ml", "mc", "mr", "bl", "bc", "br"];
export function WatermarkPopover({
  sourceUrl,
  settings,
  renderOutput = renderWatermarkedBlob,
  onSettingsChange,
  onClose,
  onConfirm,
}) {
  const { t: t2 } = useTranslation();
  const nodeId = useNodeId() ?? "";
  const [saving, setSaving] = reactExports.useState(false);
  const [panelScrolling, setPanelScrolling] = reactExports.useState(false);
  const scrollAreaRef = reactExports.useRef(null);
  const shadowWasEnabledRef = reactExports.useRef(settings.shadow);
  const scrollIdleTimerRef = reactExports.useRef(null);
  const selectedSelector = reactExports.useCallback(
    (state2) => (nodeId ? !!state2.nodeLookup.get(nodeId)?.selected : true),
    [nodeId],
  );
  const selected2 = useStore$3(selectedSelector);
  const isDragging = useCanvasIsDragging();
  const isMultiSelect = useCanvasIsMultiSelect();
  const isBoxSelecting = useCanvasIsBoxSelecting();
  reactExports.useEffect(() => {
    if (!selected2) onClose();
  }, [onClose, selected2]);
  reactExports.useEffect(
    () => () => {
      if (scrollIdleTimerRef.current) clearTimeout(scrollIdleTimerRef.current);
    },
    [],
  );
  reactExports.useEffect(() => {
    const wasEnabled = shadowWasEnabledRef.current;
    shadowWasEnabledRef.current = settings.shadow;
    if (!settings.shadow || wasEnabled) return;
    const frame2 = requestAnimationFrame(() => {
      const scrollArea = scrollAreaRef.current;
      scrollArea?.scrollTo({
        top: scrollArea.scrollHeight,
        behavior: "smooth",
      });
    });
    return () => cancelAnimationFrame(frame2);
  }, [settings.shadow]);
  const handlePanelScroll = reactExports.useCallback(() => {
    setPanelScrolling(true);
    if (scrollIdleTimerRef.current) clearTimeout(scrollIdleTimerRef.current);
    scrollIdleTimerRef.current = setTimeout(() => setPanelScrolling(false), 700);
  }, []);
  const setSetting = reactExports.useCallback(
    (key2, value) => {
      onSettingsChange({
        ...settings,
        [key2]: value,
      });
    },
    [onSettingsChange, settings],
  );
  const handleSave = reactExports.useCallback(async () => {
    if (saving || !settings.text.trim()) return;
    setSaving(true);
    try {
      const blob = await renderOutput(sourceUrl, settings);
      await onConfirm(blob);
      onClose();
    } catch {
      dedupedToast.error(t2("canvas.watermark.saveError", "Failed to add watermark"));
      setSaving(false);
    }
  }, [onClose, onConfirm, renderOutput, saving, settings, sourceUrl, t2]);
  const hidden = isDragging || isMultiSelect || isBoxSelecting;
  const availableHeight = window.innerHeight - VIEWPORT_MARGIN$1 * 2;
  const panelHeight = Math.max(PANEL_MIN_HEIGHT$1, Math.min(PANEL_MAX_HEIGHT, availableHeight));
  return (
    <NodeToolbar$1
      isVisible={true}
      position={Position.Right}
      offset={NODE_POPOVER_SAFE_GAP}
      align="center"
      style={{
        zIndex: 1100,
      }}
    >
      <div
        className="flex max-w-[calc(100vw-4rem)] flex-col overflow-hidden rounded-lg border border-[var(--canvas-controls-border)] bg-[var(--canvas-controls-bg)] text-[var(--canvas-controls-text)] shadow-[var(--canvas-shadow-dropdown)] animate-[i2v-popover-in_0.15s_ease-out]"
        style={{
          width: WATERMARK_PANEL_WIDTH,
          height: panelHeight,
          display: hidden ? "none" : void 0,
        }}
        data-action-ui-id="canvas.watermark.popover"
        onPointerDown={(event) => event.stopPropagation()}
        onDoubleClick={(event) => event.stopPropagation()}
        onContextMenu={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
      >
        <header className="flex h-11 shrink-0 items-center gap-2 border-b border-[var(--canvas-controls-border)] px-3">
          <h3 className="text-hl_text_00 text-sm font-semibold leading-5">
            {t2("canvas.watermark.title", "Watermark")}
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="ml-auto flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-[var(--canvas-controls-hover)] hover:text-[var(--canvas-controls-text)] disabled:opacity-50"
            aria-label={t2("common.close", "Close")}
            data-action-ui-id="canvas.watermark.close"
          >
            <X$7 size={18} strokeWidth={1.5} aria-hidden="true" />
          </button>
        </header>
        <div
          ref={scrollAreaRef}
          className="nowheel scrollbar-fade min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-3"
          data-action-ui-id="canvas.watermark.scroll-area"
          data-scrolling={panelScrolling ? "true" : void 0}
          onScroll={handlePanelScroll}
          onWheel={(event) => event.stopPropagation()}
        >
          <ControlSection label={t2("canvas.watermark.text", "Watermark text")}>
            <textarea
              value={settings.text}
              onChange={(event) => setSetting("text", event.currentTarget.value)}
              placeholder={t2("canvas.watermark.placeholder", "Enter watermark text")}
              rows={2}
              className="min-h-14 w-full resize-none rounded-lg border border-input bg-transparent px-2.5 py-2 text-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
              data-action-ui-id="canvas.watermark.text-input"
            />
          </ControlSection>
          <ControlSection label={t2("canvas.watermark.style", "Style")}>
            <Select$2
              value={settings.fontFamily}
              items={FONT_ITEMS}
              onValueChange={(value) => value && setSetting("fontFamily", value)}
            >
              <SelectTrigger$1 data-action-ui-id="canvas.watermark.font-select">
                <SelectValue$1 />
              </SelectTrigger$1>
              <SelectContent$1
                className="border border-[var(--canvas-controls-border)] shadow-[var(--canvas-shadow-dropdown)]"
                style={{
                  background:
                    "color-mix(in srgb, var(--canvas-controls-bg) 97%, var(--canvas-controls-text) 3%)",
                }}
              >
                {FONT_OPTIONS.map((option2) => (
                  <SelectItem$1 key={option2.value} value={option2.value}>
                    {option2.label}
                  </SelectItem$1>
                ))}
              </SelectContent$1>
            </Select$2>
            <div className="grid grid-cols-2 gap-2">
              <Select$2
                value={String(settings.fontWeight)}
                items={WEIGHT_ITEMS}
                onValueChange={(value) => value && setSetting("fontWeight", Number(value))}
              >
                <SelectTrigger$1
                  aria-label={t2("canvas.watermark.weight", "Weight")}
                  data-action-ui-id="canvas.watermark.weight-select"
                >
                  <SelectValue$1 />
                </SelectTrigger$1>
                <SelectContent$1
                  className="border border-[var(--canvas-controls-border)] shadow-[var(--canvas-shadow-dropdown)]"
                  style={{
                    background:
                      "color-mix(in srgb, var(--canvas-controls-bg) 97%, var(--canvas-controls-text) 3%)",
                  }}
                >
                  {WEIGHT_OPTIONS.map((option2) => (
                    <SelectItem$1 key={option2.value} value={String(option2.value)}>
                      {option2.label}
                    </SelectItem$1>
                  ))}
                </SelectContent$1>
              </Select$2>
              <FontSizeSelect
                value={settings.fontSize}
                label={t2("canvas.watermark.size", "Size")}
                onChange={(value) => setSetting("fontSize", value)}
              />
            </div>
            <ColorOpacityControl
              color={settings.color}
              opacity={settings.opacity}
              colorLabel={t2("canvas.watermark.color", "Color")}
              opacityLabel={t2("canvas.watermark.opacity", "Opacity")}
              onColorChange={(value) => setSetting("color", value)}
              onOpacityChange={(value) => setSetting("opacity", value)}
            />
            <SliderControl
              label={t2("canvas.watermark.rotation", "Rotation")}
              value={settings.rotation}
              min={-180}
              max={180}
              suffix="°"
              onChange={(value) => setSetting("rotation", value)}
            />
          </ControlSection>
          <ControlSection
            label={t2("canvas.watermark.layout", "Layout")}
            className="pt-2"
            headerAction={
              <SegmentedControl
                values={["single", "tile"]}
                value={settings.mode}
                format={(value) =>
                  value === "single"
                    ? t2("canvas.watermark.single", "Single")
                    : t2("canvas.watermark.tile", "Tile")
                }
                onChange={(value) => setSetting("mode", value)}
              />
            }
          >
            {settings.mode === "single" ? (
              <>
                <fieldset
                  className="grid grid-cols-3 gap-1"
                  aria-label={t2("canvas.watermark.position", "Position")}
                >
                  {POSITIONS.map((position2) => (
                    <button
                      key={position2}
                      type="button"
                      onClick={() => setSetting("position", position2)}
                      aria-label={`${t2("canvas.watermark.position", "Position")} ${position2}`}
                      aria-pressed={settings.position === position2}
                      className={cn$5(
                        "flex h-7 items-center justify-center rounded-md border border-input transition-colors hover:bg-[var(--canvas-controls-hover)]",
                        settings.position === position2 && "bg-foreground text-background",
                      )}
                    >
                      <span className="size-1.5 rounded-full bg-current" />
                    </button>
                  ))}
                </fieldset>
                <SliderControl
                  label={t2("canvas.watermark.padding", "Padding")}
                  value={settings.padding}
                  min={0}
                  max={200}
                  suffix="px"
                  onChange={(value) => setSetting("padding", value)}
                />
              </>
            ) : (
              <SliderControl
                label={t2("canvas.watermark.spacing", "Spacing")}
                value={settings.spacing}
                min={40}
                max={400}
                suffix="px"
                showValue={false}
                onChange={(value) => setSetting("spacing", value)}
              />
            )}
            <SegmentedControl
              className="pt-2"
              label={t2("canvas.watermark.shadow", "Shadow")}
              values={[false, true]}
              value={settings.shadow}
              format={(value) =>
                value ? t2("canvas.watermark.on", "On") : t2("canvas.watermark.off", "Off")
              }
              onChange={(value) => setSetting("shadow", value)}
            />
            {settings.shadow && (
              <div className="animate-in fade-in-0 slide-in-from-top-1 duration-200">
                <SliderControl
                  label={t2("canvas.watermark.shadowBlur", "Shadow blur")}
                  value={settings.shadowBlur}
                  min={0}
                  max={20}
                  showValue={false}
                  onChange={(value) => setSetting("shadowBlur", value)}
                />
              </div>
            )}
          </ControlSection>
        </div>
        <footer className="flex shrink-0 justify-end gap-2 border-t border-[var(--canvas-controls-border)] p-3">
          <Button$2 variant="outline" size="sm" onClick={onClose} disabled={saving}>
            {t2("common.cancel", "Cancel")}
          </Button$2>
          <Button$2
            size="sm"
            onClick={() => void handleSave()}
            loading={saving}
            disabled={!settings.text.trim()}
            data-action-ui-id="canvas.watermark.apply"
          >
            {saving
              ? t2("canvas.watermark.processing", "Processing…")
              : t2("canvas.watermark.apply", "Apply")}
          </Button$2>
        </footer>
      </div>
    </NodeToolbar$1>
  );
}
function ColorOpacityControl({
  color: color2,
  opacity,
  colorLabel,
  opacityLabel,
  onColorChange,
  onOpacityChange,
}) {
  const [hexDraft, setHexDraft] = reactExports.useState(color2.replace(/^#/, "").toUpperCase());
  reactExports.useEffect(() => {
    setHexDraft(color2.replace(/^#/, "").toUpperCase());
  }, [color2]);
  const commitHex = reactExports.useCallback(() => {
    const compact = hexDraft.trim().replace(/^#/, "");
    const expanded =
      compact.length === 3
        ? compact
            .split("")
            .map((character) => character.repeat(2))
            .join("")
        : compact;
    if (/^[0-9a-f]{6}$/i.test(expanded)) {
      onColorChange(`#${expanded.toLowerCase()}`);
      setHexDraft(expanded.toUpperCase());
      return;
    }
    setHexDraft(color2.replace(/^#/, "").toUpperCase());
  }, [color2, hexDraft, onColorChange]);
  return (
    <div className="flex h-8 overflow-hidden rounded-md border border-input bg-transparent transition-colors focus-within:border-ring focus-within:ring-1 focus-within:ring-ring/50">
      <label className="relative my-auto ml-2 size-5 shrink-0 overflow-hidden rounded border border-input">
        <span className="sr-only">{colorLabel}</span>
        <span
          className="absolute inset-0"
          style={{
            backgroundColor: color2,
          }}
        />
        <input
          type="color"
          value={color2}
          onChange={(event) => onColorChange(event.currentTarget.value)}
          className="absolute -inset-2 size-10 cursor-pointer opacity-0"
          data-action-ui-id="canvas.watermark.color"
        />
      </label>
      <input
        type="text"
        value={hexDraft}
        maxLength={7}
        spellCheck={false}
        aria-label={colorLabel}
        onChange={(event) => {
          const nextValue = event.currentTarget.value.toUpperCase();
          setHexDraft(nextValue);
          const compact = nextValue.replace(/^#/, "");
          if (/^[0-9A-F]{6}$/.test(compact)) onColorChange(`#${compact.toLowerCase()}`);
        }}
        onBlur={commitHex}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
        }}
        className="min-w-0 flex-1 bg-transparent px-2 text-xs font-medium uppercase tabular-nums outline-none"
        data-action-ui-id="canvas.watermark.color-hex"
      />
      <div className="flex w-[72px] shrink-0 items-center border-l border-input px-2">
        <input
          type="number"
          min={0}
          max={100}
          value={opacity}
          aria-label={opacityLabel}
          onFocus={(event) => event.currentTarget.select()}
          onChange={(event) => {
            if (event.currentTarget.value === "") return;
            onOpacityChange(Math.min(100, Math.max(0, Number(event.currentTarget.value))));
          }}
          className="min-w-0 flex-1 bg-transparent text-right text-xs font-medium tabular-nums outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          data-action-ui-id="canvas.watermark.opacity-input"
        />
        <span className="ml-1 text-xs text-muted-foreground">%</span>
      </div>
    </div>
  );
}
function FontSizeSelect({ value, label, onChange }) {
  const options = FONT_SIZE_OPTIONS.includes(value)
    ? FONT_SIZE_OPTIONS
    : [...FONT_SIZE_OPTIONS, value].sort((a2, b3) => a2 - b3);
  const items = Object.fromEntries(options.map((size2) => [String(size2), `${size2}px`]));
  return (
    <Select$2
      value={String(value)}
      items={items}
      onValueChange={(nextValue) => nextValue && onChange(Number(nextValue))}
    >
      <SelectTrigger$1 aria-label={label} data-action-ui-id="canvas.watermark.size-select">
        <SelectValue$1 />
      </SelectTrigger$1>
      <SelectContent$1
        className="border border-[var(--canvas-controls-border)] shadow-[var(--canvas-shadow-dropdown)]"
        style={{
          background:
            "color-mix(in srgb, var(--canvas-controls-bg) 97%, var(--canvas-controls-text) 3%)",
        }}
      >
        {options.map((size2) => (
          <SelectItem$1 key={size2} value={String(size2)}>
            {size2}px
          </SelectItem$1>
        ))}
      </SelectContent$1>
    </Select$2>
  );
}
function ControlSection({ label, className, headerAction, children: children2 }) {
  return (
    <section className={cn$5("space-y-2.5", className)}>
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-hl_text_02 text-[13px] font-medium leading-5">{label}</h4>
        {headerAction}
      </div>
      <div className="space-y-2.5">{children2}</div>
    </section>
  );
}
function SliderControl({
  label,
  value,
  min: min2,
  max: max2,
  suffix = "",
  showValue = true,
  onChange,
}) {
  return (
    <ToolSlider
      label={label}
      value={value}
      min={min2}
      max={max2}
      step={1}
      formatValue={(nextValue) => `${nextValue}${suffix}`}
      showValue={showValue}
      labelClassName="text-[12px] font-medium text-muted-foreground"
      valueClassName="text-hl_text_01 text-[12px] font-medium"
      trackStyle={{
        background:
          "color-mix(in srgb, var(--canvas-controls-bg) 96%, var(--canvas-controls-text) 4%)",
      }}
      thumbStyle={{
        background: "#fff",
        borderColor:
          "color-mix(in srgb, var(--canvas-controls-border) 70%, var(--canvas-controls-text) 30%)",
      }}
      onChange={onChange}
    />
  );
}
function SegmentedControl({ className, label, values: values3, value, format: format2, onChange }) {
  return (
    <div className={cn$5("flex items-center justify-between gap-3", className)}>
      {label && <span className="text-hl_text_02 text-[13px] font-medium leading-5">{label}</span>}
      <div className="flex w-[148px] shrink-0 rounded-full bg-foreground/[0.06] p-0.5">
        {values3.map((item) => {
          const active2 = item === value;
          return (
            <button
              key={String(item)}
              type="button"
              onClick={() => onChange(item)}
              aria-pressed={active2}
              className={cn$5(
                "relative flex h-7 flex-1 items-center justify-center rounded-full px-2 text-[11px] text-muted-foreground transition-colors hover:text-[var(--canvas-controls-text)]",
                active2 && "bg-background text-foreground shadow-sm",
              )}
            >
              {format2(item)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
const MEDIA_OVERLAY_EXIT_ANIMATION_MS$1 = 160;
const SEEDREAM_LAYER_DECOMPOSE_SMALL_PRICING_MODEL = "seedream-layer-decompose-small";
const STORYBOARD_RESIZE_MIN_EDGE = 100;
const STORYBOARD_RESIZE_MAX_EDGE = 1200;
export function ImageNodeInner({ id: id2, data: data2, selected: selected2, width, height }) {
  const trackedActionStartRef = reactExports.useRef(new Map());
  const { t: t2 } = useTranslation();
  const assetMetadataStore = useAssetMetadataApi();
  const nodeData = data2;
  const view2 = useImageNodeView(id2, data2);
  const subImages = useSubImages(id2);
  const meta2 = useAssetMeta(view2.primary?.id ?? (view2.isUserEmpty ? "" : id2));
  const isStoryboardProduct =
    nodeData.backend === BACKEND_VIBE_STORYBOARD || meta2?.backend === BACKEND_VIBE_STORYBOARD;
  const storyboardSplitGrid = reactExports.useMemo(() => {
    if (!isStoryboardProduct) return void 0;
    const { rows, cols } = resolveStoryboardGridSelection(meta2?.params);
    return {
      rows,
      cols,
    };
  }, [isStoryboardProduct, meta2?.params]);
  const persistedReferenceImageIds = reactExports.useMemo(
    () => mergeReferenceImageIds(nodeData.referenceImageIds, meta2?.referenceImageIds),
    [nodeData.referenceImageIds, meta2?.referenceImageIds],
  );
  const primaryPrompt = view2.primary?.prompt ?? meta2?.prompt;
  const {
    onAddToChat,
    submitImg2Video,
    fetchVideoModels,
    submitImg2Image,
    fetchImageModels,
    cropImage,
    batchCropAndUpscale,
    cropSplit,
    submitOutpaint,
    submitErase,
    submitRedraw,
    submitSuperResolution,
    submitRemoveBg,
    submitLayerDecompose,
    resolveFileUrl,
    onPlaceholderUpload,
    listLuts,
    importLut,
    loadLutContent,
    deleteLut,
    onLutImport,
    onPromoteToAsset,
    getLastUsedModelParams,
    onSaveAs,
    onNodeAction,
    pricingConfig,
    onInstantiatePlugin,
  } = useCanvasBridge();
  const reactFlow = useReactFlow();
  const isMultiSelect = useCanvasIsMultiSelect();
  const isBoxSelecting = useCanvasIsBoxSelecting();
  const onRename = useNodeRename(id2, isCloneData(data2));
  const { croppingNodeId } = useCropState();
  const { outpaintingNodeId } = useOutpaintState();
  const { erasingNodeId } = useEraseState();
  const { redrawingNodeId } = useRedrawState();
  const { movingObjectNodeId } = useMoveObjectState();
  const nodeWidth = width || IMAGE_CARD_MAX_WIDTH;
  const nodeHeight = height;
  const imageData = data2;
  const displaySize =
    imageData?.displaySize && imageData.displaySize.width > 0 && imageData.displaySize.height > 0
      ? imageData.displaySize
      : void 0;
  const displayImageOnly = imageData?.displayImageOnly === true;
  const { snapshot: referenceReturnI2V } = useReferenceNavigationSnapshot(id2, "i2v");
  const { snapshot: referenceReturnI2I } = useReferenceNavigationSnapshot(id2, "i2i");
  const [showI2VPopover, setShowI2VPopover] = reactExports.useState(!!referenceReturnI2V);
  const [showI2IPopover, setShowI2IPopover] = reactExports.useState(!!referenceReturnI2I);
  const [showEnhancePopover, setShowEnhancePopover] = reactExports.useState(false);
  const [showMultiAnglePopover, setShowMultiAnglePopover] = reactExports.useState(false);
  const [showStoryboardGridPopover, setShowStoryboardGridPopover] = reactExports.useState(false);
  const [showRelightPopover, setShowRelightPopover] = reactExports.useState(false);
  const [showWatermarkPopover, setShowWatermarkPopover] = reactExports.useState(false);
  const [watermarkSettings, setWatermarkSettings] = reactExports.useState(() => ({
    ...DEFAULT_WATERMARK_SETTINGS,
    text: t2("canvas.watermark.defaultText", "@ 水印文案"),
  }));
  const [watermarkFocusTarget, setWatermarkFocusTarget] = reactExports.useState(null);
  useCropViewportZoom(
    watermarkFocusTarget,
    0,
    WATERMARK_PANEL_WIDTH + NODE_POPOVER_SAFE_GAP,
    0,
    1.25,
  );
  const [showCustomizeToolbar, setShowCustomizeToolbar] = reactExports.useState(false);
  const [showLayerDecomposePrompt, setShowLayerDecomposePrompt] = reactExports.useState(false);
  const [layerDecomposePrompt, setLayerDecomposePrompt] = reactExports.useState("");
  const [layerDecomposeSubmitting, setLayerDecomposeSubmitting] = reactExports.useState(false);
  const layerDecomposeCost = reactExports.useMemo(
    () =>
      pricingConfig?.image.find(
        (pricing) => pricing.modelID === SEEDREAM_LAYER_DECOMPOSE_SMALL_PRICING_MODEL,
      )?.defaultCost,
    [pricingConfig],
  );
  const handleCustomizeToolbar = reactExports.useCallback(() => {
    setShowCustomizeToolbar(true);
  }, []);
  const handleMultiAngle = reactExports.useCallback(() => {
    setShowI2IPopover(false);
    setShowI2VPopover(false);
    setShowEnhancePopover(false);
    setShowRelightPopover(false);
    setShowStoryboardGridPopover(false);
    setShowWatermarkPopover(false);
    setShowMultiAnglePopover(true);
  }, []);
  const handleWatermark = reactExports.useCallback(() => {
    if (!cropImage || (!view2.primary?.url && !meta2?.url)) return;
    setShowI2IPopover(false);
    setShowI2VPopover(false);
    setShowEnhancePopover(false);
    setShowMultiAnglePopover(false);
    setShowStoryboardGridPopover(false);
    setShowRelightPopover(false);
    const rect = getNodeFlowRect(reactFlow, id2, nodeWidth, nodeHeight);
    if (!rect) return;
    setWatermarkSettings({
      ...DEFAULT_WATERMARK_SETTINGS,
      text: t2("canvas.watermark.defaultText", "@ 水印文案"),
    });
    setWatermarkFocusTarget({
      nodeFlowX: rect.x,
      nodeFlowY: rect.y,
      nodeWidth: rect.width,
      nodeHeight: rect.height,
    });
    setShowWatermarkPopover(true);
  }, [cropImage, id2, meta2?.url, nodeHeight, nodeWidth, reactFlow, t2, view2.primary?.url]);
  const handleStoryboardGrid = reactExports.useCallback(() => {
    setShowI2IPopover(false);
    setShowI2VPopover(false);
    setShowEnhancePopover(false);
    setShowMultiAnglePopover(false);
    setShowRelightPopover(false);
    setShowWatermarkPopover(false);
    setShowStoryboardGridPopover(true);
  }, []);
  const handleRelight = reactExports.useCallback(() => {
    setShowI2IPopover(false);
    setShowI2VPopover(false);
    setShowEnhancePopover(false);
    setShowMultiAnglePopover(false);
    setShowStoryboardGridPopover(false);
    setShowWatermarkPopover(false);
    setShowRelightPopover(true);
  }, []);
  const [imgErrorReason, setImgErrorReason] = reactExports.useState(null);
  const imgError = imgErrorReason !== null;
  const [naturalSize, setNaturalSize] = reactExports.useState(null);
  const handleNaturalSize = reactExports.useCallback((w3, h2) => {
    setNaturalSize((prev) =>
      prev && prev.width === w3 && prev.height === h2
        ? prev
        : {
            width: w3,
            height: h2,
          },
    );
  }, []);
  const [referenceImagePaths, setReferenceImagePaths] = reactExports.useState([]);
  const [referenceVideoPaths, setReferenceVideoPaths] = reactExports.useState([]);
  const [referenceAudioPaths, setReferenceAudioPaths] = reactExports.useState([]);
  const [referenceTextPaths, setReferenceTextPaths] = reactExports.useState([]);
  const { upstreamTextContent, refreshUpstreamText } = useUpstreamTextContent();
  const modelInfo = useModelForAsset(meta2?.backend, meta2?.model_id, "image");
  const {
    mergeNodeDataSilent,
    savePopoverDraft,
    getIncomingSourceIds,
    subscribeGraphChange,
    getNodeById,
    focusDerivedNode,
    resizeNode,
    moveAndResizeNode,
    moveAndResizeImageGroupMembers,
    flushPersist,
  } = useCanvasActions();
  const handlePanoramaReference = reactExports.useCallback(async () => {
    if (!onInstantiatePlugin || !view2.primary?.url) return;
    const panoramaNodeId = await onInstantiatePlugin({
      pluginId: PANORAMA_VIEWER_PLUGIN_ID,
      sourceNodeIds: [id2],
      initialData: {
        panoramaGenerationPending: true,
      },
    });
    if (!panoramaNodeId) return;
    let finished = false;
    let unsubscribe = () => {};
    let timeout2 = 0;
    const openGeneratorWhenReady = () => {
      if (
        finished ||
        !getNodeById(panoramaNodeId) ||
        !getIncomingSourceIds(panoramaNodeId).includes(id2)
      )
        return false;
      finished = true;
      unsubscribe();
      window.clearTimeout(timeout2);
      resizeNode(panoramaNodeId, PANORAMA_EMPTY_NODE_SIZE.width, PANORAMA_EMPTY_NODE_SIZE.height);
      focusDerivedNode(panoramaNodeId);
      return true;
    };
    unsubscribe = subscribeGraphChange(openGeneratorWhenReady);
    if (!openGeneratorWhenReady()) {
      timeout2 = window.setTimeout(() => {
        finished = true;
        unsubscribe();
      }, 5e3);
    }
  }, [
    focusDerivedNode,
    getNodeById,
    getIncomingSourceIds,
    id2,
    onInstantiatePlugin,
    resizeNode,
    subscribeGraphChange,
    view2.primary?.url,
  ]);
  const handleImageResizeCommit = reactExports.useCallback(
    (nodeId, x2, y4, nextWidth, nextHeight) => {
      const persistedNode = getNodeById(nodeId);
      const nextData = {
        ...(persistedNode?.data ?? {}),
        displaySize: {
          width: nextWidth,
          height: nextHeight,
        },
      };
      if (isStoryboardProduct && persistedNode?.groupId) {
        moveAndResizeImageGroupMembers(nodeId, x2, y4, nextWidth, nextHeight, nextData);
        return;
      }
      moveAndResizeNode(nodeId, x2, y4, nextWidth, nextHeight, {
        ...nextData,
      });
    },
    [getNodeById, isStoryboardProduct, moveAndResizeImageGroupMembers, moveAndResizeNode],
  );
  const i2iDraft = resolveActivePopoverDraft(data2, "i2i");
  const i2vDraft = resolveActivePopoverDraft(data2, "i2v");
  const i2iDraftPrompt =
    typeof i2iDraft?.prompt === "string" && i2iDraft.prompt.trim().length > 0
      ? i2iDraft.prompt
      : void 0;
  const i2iDraftPromptJson = i2iDraftPrompt ? i2iDraft?.promptJson : void 0;
  const i2vDraftPrompt =
    typeof i2vDraft?.prompt === "string" && i2vDraft.prompt.trim().length > 0
      ? i2vDraft.prompt
      : void 0;
  const i2vDraftPromptJson = i2vDraftPrompt ? i2vDraft?.promptJson : void 0;
  const upstreamImageMeta = useUpstreamSameTypeMeta(id2, "image");
  const lastUsedI2I = getLastUsedModelParams?.("i2i");
  const lastUsedI2V = getLastUsedModelParams?.("i2v");
  const zoomTier = useStableZoomTier();
  const isOutpaintingThis = outpaintingNodeId === id2;
  const fileVersion = usePathFileVersion(meta2?.path);
  const primaryUrl = view2.primary?.url ?? meta2?.url;
  const decodeSrc =
    primaryUrl !== void 0 && fileVersion > 0
      ? appendCanvasFileVersion(primaryUrl, fileVersion)
      : primaryUrl;
  reactExports.useEffect(() => {
    setImgErrorReason(null);
    setNaturalSize(null);
  }, [decodeSrc]);
  const isUnfilled = view2.isUserEmpty && view2.status === "empty" && view2.slots.length === 0;
  const isUserEmpty = isUnfilled;
  const i2iDefaultModelId = isUserEmpty
    ? (i2iDraft?.modelId ?? upstreamImageMeta?.modelId)
    : (i2iDraft?.modelId ?? modelInfo?.id ?? meta2?.model_id ?? meta2?.model);
  const i2iDefaultParams = isUserEmpty
    ? (i2iDraft?.params ?? upstreamImageMeta?.params)
    : (i2iDraft?.params ?? meta2?.params);
  const i2vDefaultModelId = isUserEmpty ? i2vDraft?.modelId : (i2vDraft?.modelId ?? modelInfo?.id);
  const i2vDefaultParams = isUserEmpty ? i2vDraft?.params : (i2vDraft?.params ?? meta2?.params);
  const i2iLastUsedModelId = isUserEmpty ? lastUsedI2I?.modelId : void 0;
  const i2iLastUsedParams = isUserEmpty ? lastUsedI2I?.params : void 0;
  const i2vLastUsedModelId = isUserEmpty ? lastUsedI2V?.modelId : void 0;
  const i2vLastUsedParams = isUserEmpty ? lastUsedI2V?.params : void 0;
  const i2iOriginalGenerationDraft = reactExports.useMemo(
    () =>
      buildOriginalGenerationDraft(
        primaryPrompt,
        modelInfo?.id ?? meta2?.model_id ?? meta2?.model,
        meta2?.params,
        referenceImagePaths,
      ),
    [
      primaryPrompt,
      modelInfo?.id,
      meta2?.model_id,
      meta2?.model,
      meta2?.params,
      referenceImagePaths,
    ],
  );
  const i2iRestoreOriginalDraft =
    !isUserEmpty && draftOverridesOriginalGeneration(i2iDraft, i2iOriginalGenerationDraft)
      ? i2iOriginalGenerationDraft
      : void 0;
  const { emptyAspectRatio, setEmptyAspectRatio } = useEmptyAspectRatio({
    id: id2,
    data: data2,
    isEmptyForWrite: isUnfilled || !meta2,
    draftKeys: ["i2i", "i2v"],
  });
  const isEmptyForSync = (isUnfilled || !meta2) && !view2.primary;
  const targetEmptySize =
    isEmptyForSync && emptyAspectRatio ? emptySizeFromRatio(emptyAspectRatio) : void 0;
  const targetEmptyWidth = targetEmptySize?.width;
  const targetEmptyHeight = targetEmptySize?.height;
  const lastSyncActionRef = reactExports.useRef("none");
  reactExports.useEffect(() => {
    const prev = lastSyncActionRef.current;
    if (isEmptyForSync) {
      if (targetEmptyWidth != null && targetEmptyHeight != null) {
        reactFlow.setNodes((nodes) =>
          nodes.map((n2) =>
            n2.id === id2
              ? {
                  ...n2,
                  width: targetEmptyWidth,
                  height: targetEmptyHeight,
                }
              : n2,
          ),
        );
        lastSyncActionRef.current = "empty";
      }
      return;
    }
    if (prev !== "none") {
      reactFlow.setNodes((nodes) =>
        nodes.map((n2) => {
          if (n2.id !== id2) return n2;
          const { width: _w, height: _h, ...rest } = n2;
          return rest;
        }),
      );
      lastSyncActionRef.current = "none";
    }
  }, [isEmptyForSync, targetEmptyWidth, targetEmptyHeight, id2, reactFlow]);
  const persistedPathValue = data2.path;
  const persistedPath =
    typeof persistedPathValue === "string" && persistedPathValue.trim()
      ? persistedPathValue
      : void 0;
  const handleAddToChat = useAddToChat(id2, meta2, onAddToChat, persistedPath);
  const handlePromoteToAsset = reactExports.useMemo(() => {
    if (!onPromoteToAsset) return void 0;
    return (e2) => {
      onPromoteToAsset([id2], {
        x: e2.clientX,
        y: e2.clientY,
      });
    };
  }, [id2, onPromoteToAsset]);
  const { handleCrop } = useStartCropFromNode({
    id: id2,
    meta: meta2,
    nodeWidth,
    nodeHeight,
    reactFlow,
    cropImage,
  });
  const { handleOutpaint } = useStartOutpaintFromNode({
    id: id2,
    meta: meta2,
    nodeWidth,
    nodeHeight,
    reactFlow,
    submitOutpaint,
  });
  const { handleErase } = useStartEraseFromNode({
    id: id2,
    meta: meta2,
    nodeWidth,
    nodeHeight,
    reactFlow,
    submitErase,
  });
  const { handleRedraw } = useStartRedrawFromNode({
    id: id2,
    meta: meta2,
    nodeWidth,
    nodeHeight,
    reactFlow,
    submitRedraw,
  });
  const { handleRemoveBg } = useDirectImageActions({
    id: id2,
    meta: meta2,
    submitSuperResolution,
    submitRemoveBg,
  });
  const handleLayerDecompose = reactExports.useCallback(() => {
    if (!submitLayerDecompose || !meta2?.path || layerDecomposeSubmitting) return;
    setLayerDecomposePrompt("");
    setShowLayerDecomposePrompt(true);
  }, [layerDecomposeSubmitting, meta2?.path, submitLayerDecompose]);
  const dismissLayerDecomposePrompt = usePopoverCloseWithDeselect(id2, setShowLayerDecomposePrompt);
  const closeLayerDecomposePrompt = reactExports.useCallback(() => {
    if (layerDecomposeSubmitting) return;
    const enteredAt = trackedActionStartRef.current.get("layer-decompose");
    trackedActionStartRef.current.delete("layer-decompose");
    if (enteredAt != null) {
      onNodeAction?.({
        nodeId: id2,
        nodeType: "image",
        action: "layer-decompose",
        phase: "abandon",
        interaction: "opens_dialog",
        durationMs: Date.now() - enteredAt,
      });
    }
    dismissLayerDecomposePrompt();
    setLayerDecomposePrompt("");
  }, [dismissLayerDecomposePrompt, id2, layerDecomposeSubmitting, onNodeAction]);
  const submitLayerDecomposePrompt = reactExports.useCallback(async () => {
    if (!submitLayerDecompose || !meta2?.path || layerDecomposeSubmitting) return;
    const enteredAt = trackedActionStartRef.current.get("layer-decompose");
    trackedActionStartRef.current.delete("layer-decompose");
    onNodeAction?.({
      nodeId: id2,
      nodeType: "image",
      action: "layer-decompose",
      phase: "apply",
      interaction: "opens_dialog",
      durationMs: enteredAt == null ? void 0 : Date.now() - enteredAt,
    });
    setLayerDecomposeSubmitting(true);
    dismissLayerDecomposePrompt();
    setLayerDecomposePrompt("");
    try {
      await submitLayerDecompose(id2, meta2.path, layerDecomposePrompt);
    } finally {
      setLayerDecomposeSubmitting(false);
    }
  }, [
    id2,
    dismissLayerDecomposePrompt,
    layerDecomposePrompt,
    layerDecomposeSubmitting,
    meta2?.path,
    onNodeAction,
    submitLayerDecompose,
  ]);
  reactExports.useEffect(() => {
    if (!selected2 && showLayerDecomposePrompt) {
      closeLayerDecomposePrompt();
    }
  }, [closeLayerDecomposePrompt, selected2, showLayerDecomposePrompt]);
  const handleSuperResolution = reactExports.useCallback(() => {
    if (!submitSuperResolution || !meta2?.path) return;
    const w3 = view2.primary?.width ?? meta2?.width ?? naturalSize?.width;
    const h2 = view2.primary?.height ?? meta2?.height ?? naturalSize?.height;
    if (!isEnhanceImageInputEligible(w3, h2)) {
      dedupedToast.error(
        t2(
          "canvas.enhanceImage.inputOutOfRange",
          "图片尺寸超出可处理范围（长边需 ≤ 3072px 且长短边比例 ≤ 8）",
        ),
        {
          id: "canvas-enhance-image-input",
        },
      );
      return;
    }
    setShowEnhancePopover(true);
  }, [
    submitSuperResolution,
    meta2?.path,
    meta2?.width,
    meta2?.height,
    view2.primary,
    naturalSize,
    t2,
  ]);
  const allImageSlots = reactExports.useMemo(() => view2.rounds.flat(), [view2.rounds]);
  const lightboxItems = reactExports.useMemo(() => {
    if (allImageSlots.length === 0) {
      const item = lightboxItemFromAssetMeta("image", meta2);
      return item ? [item] : [];
    }
    const metadata = assetMetadataStore.getState();
    return lightboxItemsFromSlots("image", allImageSlots, {
      getMetaById: (assetId) => metadata.get(assetId),
      nodes: subImages,
      primarySlotId: view2.primary?.id,
      primaryMeta: meta2,
    });
  }, [allImageSlots, view2.primary?.id, meta2, assetMetadataStore, subImages]);
  const lightboxInitialIndex = reactExports.useMemo(() => {
    if (lightboxItems.length === 0) return 0;
    return resolveLightboxIndexForSlot(lightboxItems, view2.primary, 0);
  }, [lightboxItems, view2.primary]);
  const lightbox = useImageLightbox({
    items: lightboxItems,
    initialIndex: lightboxInitialIndex,
  });
  const currentLightboxItem = lightbox.lightboxProps?.items[lightbox.lightboxProps.index];
  const currentLightboxSlot = reactExports.useMemo(
    () =>
      currentLightboxItem?.slotKey
        ? allImageSlots.find((slot) => getLightboxSlotKey(slot) === currentLightboxItem.slotKey)
        : void 0,
    [allImageSlots, currentLightboxItem?.slotKey],
  );
  const handleOpenSubLightbox = reactExports.useCallback(
    (originalIndex) => {
      const targetSlot = view2.slots[originalIndex];
      const targetIndex = resolveLightboxIndexForSlot(
        lightboxItems,
        targetSlot,
        lightboxInitialIndex,
      );
      lightbox.openLightbox(targetIndex);
    },
    [view2.slots, lightboxItems, lightboxInitialIndex, lightbox.openLightbox],
  );
  const colorAdjustLutBundle = useLutBundle(
    listLuts,
    importLut,
    loadLutContent,
    deleteLut,
    "image",
    onLutImport,
  );
  const colorAdjust = useImageColorAdjust({
    id: id2,
    meta: meta2,
    nodeWidth,
    reactFlow,
    cropImage,
    lut: colorAdjustLutBundle,
  });
  const emitWatermarkedImage = useEmitDerivedFromBlob({
    id: id2,
    meta: meta2,
    nodeWidth,
    reactFlow,
    cropImage,
  });
  const inplaceEdit = useImageInplaceEdit({
    id: id2,
    meta: meta2,
    selected: selected2,
    nodeWidth,
    nodeHeight,
    reactFlow,
    cropImage,
    onApply: (blob) => {
      const enteredAt = trackedActionStartRef.current.get("image-inplace-edit");
      trackedActionStartRef.current.delete("image-inplace-edit");
      onNodeAction?.({
        nodeId: id2,
        nodeType: "image",
        action: "image-inplace-edit",
        phase: "apply",
        interaction: "opens_mode",
        durationMs: enteredAt == null ? void 0 : Date.now() - enteredAt,
        toolSpecific: {
          output_bytes: blob.size,
        },
      });
    },
    onAbandon: (hadProgress) => {
      const enteredAt = trackedActionStartRef.current.get("image-inplace-edit");
      if (enteredAt == null) return;
      trackedActionStartRef.current.delete("image-inplace-edit");
      onNodeAction?.({
        nodeId: id2,
        nodeType: "image",
        action: "image-inplace-edit",
        phase: "abandon",
        interaction: "opens_mode",
        durationMs: Date.now() - enteredAt,
        hadProgress,
      });
    },
  });
  const imageEditing = inplaceEdit.editing;
  const primaryWidth = view2.primary?.width ?? meta2?.width ?? naturalSize?.width;
  const primaryHeight = view2.primary?.height ?? meta2?.height ?? naturalSize?.height;
  const bodyHeight = reactExports.useMemo(() => {
    if ((displayImageOnly || isStoryboardProduct) && nodeHeight) return nodeHeight;
    if (displaySize) return Math.round(displaySize.height);
    const w3 = primaryWidth;
    const h2 = primaryHeight;
    if (w3 && h2) return Math.round(nodeWidth * (h2 / w3));
    return nodeHeight;
  }, [
    primaryWidth,
    primaryHeight,
    nodeWidth,
    nodeHeight,
    displaySize,
    displayImageOnly,
    isStoryboardProduct,
  ]);
  const sourceBodyHeight = bodyHeight ?? nodeWidth;
  const lastMetaSyncRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (isEmptyForSync) return;
    const dataDisplaySize = displaySize
      ? {
          width: Math.round(displaySize.width),
          height: Math.round(displaySize.height),
        }
      : void 0;
    if (!dataDisplaySize && (!primaryWidth || !primaryHeight)) return;
    const synced = dataDisplaySize ?? computeNodeSize(primaryWidth, primaryHeight);
    if (!synced) return;
    const targetW = synced.width;
    const targetH = synced.height;
    const prev = lastMetaSyncRef.current;
    if (prev && prev.w === targetW && prev.h === targetH) return;
    reactFlow.setNodes((nodes) =>
      nodes.map((n2) => {
        if (n2.id !== id2) return n2;
        if (n2.width === targetW && n2.height === targetH) return n2;
        return {
          ...n2,
          width: targetW,
          height: targetH,
        };
      }),
    );
    lastMetaSyncRef.current = {
      w: targetW,
      h: targetH,
    };
    const fromNaturalOnly =
      !dataDisplaySize &&
      !view2.primary?.width &&
      !view2.primary?.height &&
      !meta2?.width &&
      !meta2?.height;
    if (fromNaturalOnly) {
      const target = reconcileNodeSize(
        "image",
        getNodeById(id2)?.size,
        primaryWidth,
        primaryHeight,
      );
      if (target) resizeNode(id2, target.width, target.height);
    }
  }, [
    isEmptyForSync,
    primaryWidth,
    primaryHeight,
    id2,
    reactFlow,
    view2.primary?.width,
    view2.primary?.height,
    meta2?.width,
    meta2?.height,
    displaySize,
    getNodeById,
    resizeNode,
  ]);
  const rotate2 = useImageRotateEdit({
    nodeId: id2,
    selected: !!selected2,
    meta: meta2,
    nodeWidth,
    sourceBodyHeight,
    cropImage,
    reactFlow,
    onSaved: () => {
      const enteredAt = trackedActionStartRef.current.get("rotate");
      trackedActionStartRef.current.delete("rotate");
      onNodeAction?.({
        nodeId: id2,
        nodeType: "image",
        action: "rotate",
        phase: "apply",
        interaction: "opens_mode",
        durationMs: enteredAt == null ? void 0 : Date.now() - enteredAt,
        toolSpecific: {
          rotation_angle: rotate2.state.angle,
          flip_horizontal: rotate2.state.flipH,
          flip_vertical: rotate2.state.flipV,
        },
      });
    },
    onAbandon: (hadProgress) => {
      const enteredAt = trackedActionStartRef.current.get("rotate");
      if (enteredAt == null) return;
      trackedActionStartRef.current.delete("rotate");
      onNodeAction?.({
        nodeId: id2,
        nodeType: "image",
        action: "rotate",
        phase: "abandon",
        interaction: "opens_mode",
        durationMs: Date.now() - enteredAt,
        hadProgress,
      });
    },
  });
  const splitMode = useImageSplitMode({
    id: id2,
    selected: !!selected2,
    meta: meta2,
    batchCropAndUpscale,
    cropSplit,
    url: view2.primary?.url,
    onApply: (detail) => {
      const enteredAt = trackedActionStartRef.current.get("split-grid");
      trackedActionStartRef.current.delete("split-grid");
      onNodeAction?.({
        nodeId: id2,
        nodeType: "image",
        action: "split-grid",
        phase: "apply",
        interaction: "opens_mode",
        durationMs: enteredAt == null ? void 0 : Date.now() - enteredAt,
        toolSpecific: detail,
      });
    },
  });
  const splitPerCellCost = useImageEditCost("super-resolution");
  const updateNodeInternals2 = useUpdateNodeInternals();
  const lastRotateAabbRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    const key2 = `${rotate2.displayWidth}x${rotate2.displayHeight}`;
    if (lastRotateAabbRef.current === key2) return;
    const isMount = lastRotateAabbRef.current === null;
    lastRotateAabbRef.current = key2;
    if (isMount) return;
    updateNodeInternals2(id2);
  }, [id2, updateNodeInternals2, rotate2.displayWidth, rotate2.displayHeight]);
  const handleI2VClose = usePopoverCloseWithDeselect(id2, setShowI2VPopover);
  const handleI2IClose = usePopoverCloseWithDeselect(id2, setShowI2IPopover);
  const closeEnhancePopover = usePopoverCloseWithDeselect(id2, setShowEnhancePopover);
  const closeMultiAnglePopover = usePopoverCloseWithDeselect(id2, setShowMultiAnglePopover);
  const closeStoryboardGridPopover = usePopoverCloseWithDeselect(id2, setShowStoryboardGridPopover);
  const closeRelightPopover = usePopoverCloseWithDeselect(id2, setShowRelightPopover);
  const closeWatermarkPopover = reactExports.useCallback(() => {
    const enteredAt = trackedActionStartRef.current.get("watermark");
    trackedActionStartRef.current.delete("watermark");
    if (enteredAt != null) {
      onNodeAction?.({
        nodeId: id2,
        nodeType: "image",
        action: "watermark",
        phase: "abandon",
        interaction: "opens_panel",
        durationMs: Date.now() - enteredAt,
      });
    }
    setShowWatermarkPopover(false);
    setWatermarkFocusTarget(null);
  }, [id2, onNodeAction]);
  const handleEnhanceClose = reactExports.useCallback(() => {
    const enteredAt = trackedActionStartRef.current.get("super-resolution");
    trackedActionStartRef.current.delete("super-resolution");
    if (enteredAt != null) {
      onNodeAction?.({
        nodeId: id2,
        nodeType: "image",
        action: "super-resolution",
        phase: "abandon",
        interaction: "opens_dialog",
        durationMs: Date.now() - enteredAt,
      });
    }
    closeEnhancePopover();
  }, [closeEnhancePopover, id2, onNodeAction]);
  const handleEnhanceSubmit = reactExports.useCallback(
    (params) => {
      const enteredAt = trackedActionStartRef.current.get("super-resolution");
      trackedActionStartRef.current.delete("super-resolution");
      if (enteredAt != null) {
        onNodeAction?.({
          nodeId: id2,
          nodeType: "image",
          action: "super-resolution",
          phase: "apply",
          interaction: "opens_dialog",
          durationMs: Date.now() - enteredAt,
          toolSpecific: {
            resolution: params.resolution,
          },
        });
      }
      if (submitSuperResolution && meta2?.path) {
        void submitSuperResolution(id2, meta2.path, {
          resolution: params.resolution,
          targetWidth: params.targetWidth,
          targetHeight: params.targetHeight,
        });
      }
      closeEnhancePopover();
    },
    [submitSuperResolution, meta2?.path, id2, closeEnhancePopover, onNodeAction],
  );
  const handleI2VSubmit = reactExports.useCallback(
    (
      prompt,
      modelId,
      params,
      imagePaths,
      videoPaths,
      audioPaths,
      replaceNodeId,
      displayPrompt,
      count2,
      textPaths,
    ) => {
      const ratio = params.aspect_ratio ?? params.ratio;
      if (ratio && !replaceNodeId && view2.status === "empty") {
        mergeNodeDataSilent(id2, {
          aspectRatio: ratio,
        });
      }
      const submit = () => {
        submitImg2Video?.(
          id2,
          prompt,
          modelId,
          params,
          imagePaths,
          videoPaths,
          audioPaths,
          replaceNodeId,
          displayPrompt,
          count2,
          void 0,
          void 0,
          textPaths,
        );
      };
      return submitAfterOptionalDraftFlush({
        shouldFlush: !!replaceNodeId,
        flushDraft: flushPersist,
        submit,
        onFlushError: () => {
          dedupedToast.error(t2("canvas.promptDraftSaveFailed"));
        },
      });
    },
    [id2, submitImg2Video, view2.status, mergeNodeDataSilent, flushPersist, t2],
  );
  const handleI2ISubmit = reactExports.useCallback(
    (prompt, modelId, params, imagePaths, replaceNodeId, count2, displayPrompt, textPaths) => {
      const ratio = params.aspect_ratio ?? params.ratio;
      if (ratio && view2.status === "empty") {
        mergeNodeDataSilent(id2, {
          aspectRatio: ratio,
        });
      }
      const submit = () => {
        submitImg2Image?.(
          id2,
          prompt,
          modelId,
          params,
          imagePaths,
          replaceNodeId,
          count2,
          displayPrompt,
          void 0,
          void 0,
          textPaths,
        );
      };
      return submitAfterOptionalDraftFlush({
        shouldFlush: !!replaceNodeId,
        flushDraft: flushPersist,
        submit,
        onFlushError: () => dedupedToast.error(t2("canvas.promptDraftSaveFailed")),
      });
    },
    [id2, submitImg2Image, view2.status, mergeNodeDataSilent, flushPersist, t2],
  );
  const {
    isOverlayOpen,
    handleToggleOverlay,
    handleSetPrimary,
    handleSetPrimarySlot,
    handleSelectRound: selectRound,
    handleDeleteSub,
    handleSplitSub,
    handleSplitSlot,
    handleSplitAll,
    handleSplitMain,
    handleSubContextMenu,
    handleDownloadSub,
  } = useMultiImageActions({
    id: id2,
    view: view2,
    subImages,
    reactFlow,
    nodeWidth,
    nodeHeight,
  });
  const handleSelectRound = reactExports.useCallback(
    (roundIdx) => {
      if (roundIdx === view2.activeRoundIndex) return;
      setShowI2VPopover(false);
      setShowI2IPopover(false);
      setShowEnhancePopover(false);
      setShowMultiAnglePopover(false);
      setShowStoryboardGridPopover(false);
      setShowRelightPopover(false);
      setShowWatermarkPopover(false);
      selectRound(roundIdx);
    },
    [selectRound, view2.activeRoundIndex],
  );
  const canSetLightboxPrimary =
    allImageSlots.length > 1 &&
    !!currentLightboxSlot &&
    currentLightboxSlot.id !== view2.primary?.id;
  const canSplitLightboxImage = allImageSlots.length > 1 && !!currentLightboxSlot;
  const handleSetLightboxPrimary = reactExports.useCallback(() => {
    if (!currentLightboxSlot) return;
    handleSetPrimarySlot(currentLightboxSlot);
  }, [currentLightboxSlot, handleSetPrimarySlot]);
  const handleSplitLightboxImage = reactExports.useCallback(() => {
    if (!currentLightboxSlot) return;
    handleSplitSlot(currentLightboxSlot);
  }, [currentLightboxSlot, handleSplitSlot]);
  const canOpenPopover =
    nodeData.forceShowPromptPopover === true ||
    canOpenAssetGenerationPopover({
      isUserEmpty,
      model: meta2?.model ?? nodeData.model,
      modelId: meta2?.model_id ?? nodeData.model_id,
      backend: meta2?.backend ?? nodeData.backend,
      sourceTool: meta2?.source_tool ?? nodeData.source_tool,
    });
  const handleDownloadMain = reactExports.useCallback(
    (e2) => {
      e2.stopPropagation();
      if (!onSaveAs || !meta2?.path) return;
      onSaveAs(meta2.path, meta2.name);
    },
    [onSaveAs, meta2?.path, meta2?.name],
  );
  const selfAssetIds = reactExports.useMemo(() => {
    const ids2 = new Set();
    for (const slot of view2.slots) {
      if (slot.status === "ready" && slot.id) ids2.add(slot.id);
    }
    if (meta2 && id2) ids2.add(id2);
    return ids2;
  }, [view2.slots, meta2, id2]);
  const showOverlay = isOverlayOpen;
  const expandedMediaOverlay =
    view2.isMulti && showOverlay && !imageEditing && !rotate2.editing && !splitMode.editing;
  const [keepExpandedMediaOverlayMounted, setKeepExpandedMediaOverlayMounted] =
    reactExports.useState(false);
  reactExports.useEffect(() => {
    if (expandedMediaOverlay) {
      setKeepExpandedMediaOverlayMounted(true);
      return;
    }
    if (!keepExpandedMediaOverlayMounted) return;
    const timeoutId = setTimeout(() => {
      setKeepExpandedMediaOverlayMounted(false);
    }, MEDIA_OVERLAY_EXIT_ANIMATION_MS$1);
    return () => clearTimeout(timeoutId);
  }, [expandedMediaOverlay, keepExpandedMediaOverlayMounted]);
  const isExpandedMediaOverlayVisible = expandedMediaOverlay || keepExpandedMediaOverlayMounted;
  const isExpandedMediaOverlayClosing = keepExpandedMediaOverlayMounted && !expandedMediaOverlay;
  reactExports.useEffect(() => {
    if (!selected2) return;
    if (!canOpenPopover) return;
    if (isMultiSelect || isBoxSelecting) return;
    if (isExpandedMediaOverlayVisible) return;
    if (
      showI2IPopover ||
      showI2VPopover ||
      showEnhancePopover ||
      showMultiAnglePopover ||
      showStoryboardGridPopover ||
      showRelightPopover
    )
      return;
    const sources = getIncomingSourceIds(id2);
    setReferenceImagePaths(
      resolveReferenceImages(sources, persistedReferenceImageIds, assetMetadataStore, getNodeById),
    );
    setReferenceVideoPaths(
      resolveReferenceVideos(sources, meta2?.referenceVideoIds, assetMetadataStore),
    );
    setReferenceAudioPaths(
      resolveReferenceAudios(sources, meta2?.referenceAudioIds, assetMetadataStore),
    );
    setReferenceTextPaths(
      resolveReferenceTexts(
        sources,
        Array.isArray(data2.referenceTextIds) ? data2.referenceTextIds : meta2?.referenceTextIds,
        assetMetadataStore,
        getNodeById,
      ),
    );
    refreshUpstreamText(sources);
    if (isStoryboardProduct) {
      setShowStoryboardGridPopover(true);
    } else {
      setShowI2IPopover(true);
    }
  }, [
    selected2,
    canOpenPopover,
    isMultiSelect,
    isBoxSelecting,
    showI2IPopover,
    showI2VPopover,
    showEnhancePopover,
    showMultiAnglePopover,
    showStoryboardGridPopover,
    showRelightPopover,
    isExpandedMediaOverlayVisible,
    id2,
    assetMetadataStore,
    getIncomingSourceIds,
    getNodeById,
    isStoryboardProduct,
    persistedReferenceImageIds,
  ]);
  const buildIncomingReferenceKey = reactExports.useCallback(() => {
    const sources = [...getIncomingSourceIds(id2)].sort();
    const imagePaths = resolveReferenceImages(
      sources,
      persistedReferenceImageIds,
      assetMetadataStore,
      getNodeById,
    );
    return JSON.stringify({
      sources,
      imagePaths,
    });
  }, [id2, persistedReferenceImageIds, assetMetadataStore, getIncomingSourceIds, getNodeById]);
  const [incomingSourceKey, setIncomingSourceKey] =
    reactExports.useState(buildIncomingReferenceKey);
  reactExports.useEffect(() => {
    const currentKey = buildIncomingReferenceKey();
    setIncomingSourceKey((previousKey) => (previousKey === currentKey ? previousKey : currentKey));
    const unsubscribe = subscribeGraphChange(() => {
      const key2 = buildIncomingReferenceKey();
      setIncomingSourceKey((prev) => (prev === key2 ? prev : key2));
    });
    return unsubscribe;
  }, [buildIncomingReferenceKey, subscribeGraphChange]);
  const storyboardReferencePaths = reactExports.useMemo(() => {
    if (!isStoryboardProduct) return void 0;
    return resolveReferenceImages(
      getIncomingSourceIds(id2),
      persistedReferenceImageIds,
      assetMetadataStore,
      getNodeById,
    );
  }, [
    incomingSourceKey,
    isStoryboardProduct,
    id2,
    persistedReferenceImageIds,
    assetMetadataStore,
    getIncomingSourceIds,
    getNodeById,
  ]);
  reactExports.useEffect(() => {
    if (!showI2IPopover && !showI2VPopover) return;
    const sources = getIncomingSourceIds(id2);
    setReferenceImagePaths(
      resolveReferenceImages(
        sources,
        isStoryboardProduct ? persistedReferenceImageIds : void 0,
        assetMetadataStore,
        getNodeById,
      ),
    );
    setReferenceVideoPaths(resolveReferenceVideos(sources, void 0, assetMetadataStore));
    setReferenceAudioPaths(resolveReferenceAudios(sources, void 0, assetMetadataStore));
    setReferenceTextPaths(resolveReferenceTexts(sources, void 0, assetMetadataStore, getNodeById));
    refreshUpstreamText(sources);
  }, [
    incomingSourceKey,
    showI2IPopover,
    showI2VPopover,
    id2,
    assetMetadataStore,
    getIncomingSourceIds,
    getNodeById,
    isStoryboardProduct,
    persistedReferenceImageIds,
  ]);
  const liveReferenceTextPaths = reactExports.useMemo(() => {
    return resolveReferenceTexts(
      getIncomingSourceIds(id2),
      void 0,
      assetMetadataStore,
      getNodeById,
    );
  }, [incomingSourceKey, id2, assetMetadataStore, getIncomingSourceIds, getNodeById]);
  const defaultI2ITextPaths = resolveEditableTextReferencePaths(
    referenceTextPaths,
    liveReferenceTextPaths,
    i2iDraft?.textPaths,
  );
  const defaultI2VTextPaths = resolveEditableTextReferencePaths(
    referenceTextPaths,
    liveReferenceTextPaths,
    i2vDraft?.textPaths,
  );
  const dimensions2 = reactExports.useMemo(() => {
    const w3 = meta2?.width;
    const h2 = meta2?.height;
    if (w3 && h2) return `${w3} x ${h2}`;
    return void 0;
  }, [meta2?.width, meta2?.height]);
  const hasDimensions = !!(meta2?.width && meta2?.height);
  const thumbnailUrl = reactExports.useMemo(
    () => (meta2?.url ? buildThumbnailUrl(meta2.url, nodeWidth) : void 0),
    [meta2?.url, nodeWidth],
  );
  const thumbnailSrcSet = reactExports.useMemo(
    () => (meta2?.url ? buildThumbnailSrcSet(meta2.url, nodeWidth) : void 0),
    [meta2?.url, nodeWidth],
  );
  const thumbnailSizes = `${Math.round(nodeWidth * zoomTier)}px`;
  const deferredSelected = reactExports.useDeferredValue(selected2);
  useWarnMissingAssetMeta({
    nodeId: id2,
    nodeType: "image",
    data: data2,
    meta: meta2,
    isUserEmpty,
  });
  const isEmpty2 = view2.status === "empty" && !view2.primary;
  useMediaFallbackSize(
    id2,
    imgError && !isEmpty2 && !!(meta2 || view2.primary) && !isMissingAssetNodeData(data2),
  );
  if (isMissingAssetNodeData(data2)) {
    return (
      <MissingAssetCard nodeId={id2} name={typeof data2?.name === "string" ? data2.name : void 0} />
    );
  }
  if (!meta2 && !isUserEmpty && !view2.primary) return null;
  const isCropping = croppingNodeId !== null;
  const isOutpainting = outpaintingNodeId !== null;
  const isErasing = erasingNodeId !== null;
  const isRedrawing = redrawingNodeId !== null;
  const isMovingObject = movingObjectNodeId !== null;
  const isModalActive = isCropping || isOutpainting || isErasing || isRedrawing || isMovingObject;
  const isInteractiveSelect = !isMultiSelect && !isBoxSelecting;
  const showStandardToolbar =
    !displayImageOnly &&
    !isEmpty2 &&
    !!selected2 &&
    !!deferredSelected &&
    isInteractiveSelect &&
    !isExpandedMediaOverlayVisible &&
    !isModalActive &&
    !rotate2.editing &&
    !splitMode.editing &&
    !imageEditing &&
    !showEnhancePopover &&
    !showMultiAnglePopover &&
    (!showStoryboardGridPopover || isStoryboardProduct) &&
    !showRelightPopover &&
    !showWatermarkPopover;
  const showPopover = shouldShowImageBottomPopover({
    selected: !!selected2,
    deferredSelected: !!deferredSelected,
    isInteractiveSelect,
    isExpandedMediaOverlayVisible,
    isModalActive,
    rotateEditing: rotate2.editing,
    splitEditing: splitMode.editing,
    imageEditing,
    colorAdjustOpen: colorAdjust.open,
    showEnhancePopover,
    showMultiAnglePopover,
    showStoryboardGridPopover,
    showRelightPopover,
    showWatermarkPopover,
    showLayerDecomposePrompt,
  });
  const shellWidth = imgError ? MEDIA_FALLBACK_NODE_SIZE.width : rotate2.displayWidth;
  return (
    <NodeShell
      id={id2}
      tagIds={meta2?.tagIds}
      width={shellWidth}
      dataActionUiId="canvas.image-node"
      dataState={
        view2.isUserEmpty && view2.status === "empty"
          ? "empty"
          : view2.status === "ready" && view2.primary?.url
            ? "generated"
            : "empty"
      }
      dataAspectRatio={emptyAspectRatio}
      generating={false}
    >
      {!displayImageOnly && !isOutpaintingThis && !isExpandedMediaOverlayVisible && (
        <NodeHeader
          nodeType="image"
          tagIds={meta2?.tagIds}
          name={resolveImageNodeDisplayName(
            {
              dataName: data2?.name,
              primaryName: view2.primary?.name,
              metaName: meta2?.name,
            },
            t2("canvas.image"),
          )}
          selected={selected2}
          dimensions={dimensions2}
          maxWidth={shellWidth}
          onRename={onRename}
        />
      )}
      {showStandardToolbar && (
        <ImageNodeToolbarSection
          hasDimensions={hasDimensions}
          handleRedraw={handleRedraw}
          handleOutpaint={handleOutpaint}
          handleErase={handleErase}
          handleSuperResolution={handleSuperResolution}
          handleRemoveBg={handleRemoveBg}
          handleLayerDecompose={handleLayerDecompose}
          handleAddToChat={handleAddToChat}
          handleCrop={handleCrop}
          handleColorAdjust={colorAdjust.openDialog}
          handleImageEdit={inplaceEdit.enter}
          handleMultiAngle={handleMultiAngle}
          handlePanoramaReference={
            onInstantiatePlugin && view2.primary?.url ? handlePanoramaReference : void 0
          }
          handleWatermark={primaryUrl && cropImage ? handleWatermark : void 0}
          handleStoryboardGrid={isStoryboardProduct ? void 0 : handleStoryboardGrid}
          handleRelight={handleRelight}
          handleRotate={rotate2.enter}
          handleSplitEnter={splitMode.enter}
          pinSplitGrid={isStoryboardProduct}
          splitGrid={storyboardSplitGrid}
          handleFullscreen={lightbox.openLightbox}
          handlePromoteToAsset={handlePromoteToAsset}
          handleCustomizeToolbar={handleCustomizeToolbar}
          onToolClick={
            onNodeAction
              ? (info2) => {
                  if (
                    info2.interaction === "opens_mode" ||
                    info2.interaction === "opens_dialog" ||
                    info2.action === "watermark"
                  ) {
                    trackedActionStartRef.current.set(info2.action, Date.now());
                  }
                  onNodeAction({
                    nodeId: id2,
                    nodeType: "image",
                    action: info2.action,
                    phase: "click",
                    interaction: info2.interaction,
                    source: info2.source,
                  });
                }
              : void 0
          }
        />
      )}
      {showCustomizeToolbar && (
        <CustomizeToolbarDialog$1
          open={showCustomizeToolbar}
          onOpenChange={setShowCustomizeToolbar}
        />
      )}
      {rotate2.editing && (
        <ImageRotateEditToolbar
          visible={!!selected2}
          angle={rotate2.state.angle}
          onAngleChange={rotate2.setAngle}
          onRotate90={rotate2.step90}
          flipH={rotate2.state.flipH}
          flipV={rotate2.state.flipV}
          onFlipHorizontal={rotate2.toggleFlipH}
          onFlipVertical={rotate2.toggleFlipV}
          onCancel={rotate2.cancel}
          onSave={rotate2.save}
          saving={rotate2.saving}
          canSave={rotate2.hasChanges}
        />
      )}
      {splitMode.editing && splitMode.grid && (
        <ImageSplitEditToolbar
          visible={!!selected2}
          selectedCount={splitMode.selectedCells.size}
          magnification={splitMode.magnification}
          onSetMagnification={splitMode.setMagnification}
          onGenerate={splitMode.generateHighRes}
          onSplitLocal={splitMode.splitLocal}
          onExit={splitMode.exit}
          processing={splitMode.processing}
          perCellCost={splitPerCellCost}
        />
      )}
      <NodeBody
        width={shellWidth}
        tagIds={meta2?.tagIds}
        borderRadius={MEDIA_NODE_RADIUS}
        height={
          imgError
            ? MEDIA_FALLBACK_NODE_SIZE.height
            : isEmpty2 || isUserEmpty
              ? emptyAspectRatio
                ? emptySizeFromRatio(emptyAspectRatio).height
                : (nodeHeight ?? IMAGE_CARD_MAX_WIDTH)
              : rotate2.displayHeight
        }
        selected={selected2}
        variant={isEmpty2 ? "panel" : "media"}
        className={
          view2.isMulti && !isExpandedMediaOverlayVisible && !imageEditing && !rotate2.editing
            ? "canvas-media-stack"
            : void 0
        }
        onDoubleClick={
          isEmpty2 ||
          imageEditing ||
          showWatermarkPopover ||
          imgError ||
          isExpandedMediaOverlayVisible
            ? void 0
            : () => lightbox.openLightbox()
        }
        dataActionUiId="canvas.image-node-body"
      >
        {isEmpty2 ? (
          <PlaceholderUploadButton
            icon={<ImagePlaceholderIcon />}
            label={t2("canvas.uploadImage")}
            onUpload={(anchor) => onPlaceholderUpload?.(id2, "image", anchor)}
          />
        ) : imgErrorReason ? (
          <MediaUnpreviewableFallback
            displayName={meta2?.name ?? t2("canvas.image")}
            extension={getFileExtension(meta2?.name)}
            sizeLabel={formatFileSize(meta2?.fileSize)}
            reason={imgErrorReason}
          />
        ) : imageEditing && meta2?.url ? (
          <ImageInplaceEditor
            src={meta2.url}
            srcSet={thumbnailSrcSet}
            sizes={thumbnailSizes}
            width={nodeWidth}
            height={sourceBodyHeight}
            visible={!!selected2}
            onCancel={inplaceEdit.cancel}
            onConfirm={inplaceEdit.confirm}
            onProgressChange={inplaceEdit.setHadProgress}
          />
        ) : rotate2.editing && meta2?.url ? (
          <ImageRotatePreview
            src={thumbnailUrl ?? meta2.url}
            srcSet={thumbnailSrcSet}
            sizes={thumbnailSizes}
            alt={meta2.name}
            width={nodeWidth}
            height={sourceBodyHeight}
            transform={rotate2.imageTransform}
          />
        ) : view2.primary?.url || meta2?.url ? (
          // Single-image ready render. Loading / error primaries never reach
          // ImageNode (they stay `type=placeholder` → PlaceholderNode; the
          // early `return null` above guards the invariant), and a single
          // image's url/meta land in the same `applyIncremental` batch as the
          // node flip (no multi-image parallel-fill race), so there's no
          // URL-race window to shimmer over here. NodeBody already supplies
          // the overflow-hidden / relative / sized shell + double-click →
          // lightbox, and CanvasImage owns its own decode placeholder, so we
          // render the bitmap directly without the ImageSlotBody/Card wrappers.
          <CanvasImage
            src={decodeSrc}
            animationSrc={resolveGifAnimationSrc(
              decodeSrc,
              meta2?.path,
              view2.primary?.name ?? meta2?.name,
            )}
            nodeId={id2}
            width={rotate2.displayWidth}
            height={rotate2.displayHeight}
            alt={view2.primary?.name ?? meta2?.name}
            onError={setImgErrorReason}
            onNaturalSize={handleNaturalSize}
          />
        ) : null}
        {showWatermarkPopover && !isEmpty2 && !imgError && (
          <ImageWatermarkPreview
            displayWidth={rotate2.displayWidth}
            displayHeight={rotate2.displayHeight}
            sourceWidth={primaryWidth ?? rotate2.displayWidth}
            settings={watermarkSettings}
          />
        )}
        {splitMode.editing && splitMode.grid && !isEmpty2 && !imgError && (
          <ImageSplitOverlay
            rows={splitMode.grid.rows}
            cols={splitMode.grid.cols}
            selected={splitMode.selectedCells}
            onToggle={splitMode.toggleCell}
            onSelectCells={splitMode.selectCells}
          />
        )}
        {!isEmpty2 &&
          !imgError &&
          !imageEditing &&
          !rotate2.editing &&
          !splitMode.editing &&
          !showWatermarkPopover &&
          !!onSaveAs &&
          !!meta2?.path &&
          (view2.primary?.url || meta2?.url) && (
            <MediaDownloadButton
              dataActionUiId="canvas.image-node.download"
              onClick={handleDownloadMain}
              label={t2("canvas.downloadImage", "下载图片")}
              title={t2("canvas.downloadImage", "下载图片")}
              className={
                isExpandedMediaOverlayVisible
                  ? "top-1 right-1 translate-y-0 opacity-100"
                  : "top-1 right-1 opacity-0 -translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 focus-visible:opacity-100 focus-visible:translate-y-0"
              }
            />
          )}
        {!isExpandedMediaOverlayClosing && !showWatermarkPopover && (
          <MultiImageChrome
            view={view2}
            showOverlay={showOverlay}
            hasLifecyclePrimary={false}
            isEmpty={isEmpty2}
            imgError={imgError}
            imageEditing={imageEditing}
            rotateEditing={rotate2.editing}
            onToggleOverlay={handleToggleOverlay}
            onSplitAll={handleSplitAll}
            onSplitMain={handleSplitMain}
          />
        )}
      </NodeBody>
      {showLayerDecomposePrompt && selected2 && (
        <LayerDecomposePrompt
          prompt={layerDecomposePrompt}
          submitting={layerDecomposeSubmitting}
          creditCost={layerDecomposeCost}
          onPromptChange={setLayerDecomposePrompt}
          onSubmit={() => void submitLayerDecomposePrompt()}
          onClose={closeLayerDecomposePrompt}
        />
      )}
      {view2.rounds.length > 1 && !imageEditing && !rotate2.editing && !showWatermarkPopover && (
        <RoundDots
          count={view2.rounds.length}
          activeIdx={view2.activeRoundIndex}
          onSelect={handleSelectRound}
        />
      )}
      {isExpandedMediaOverlayVisible && (
        <MultiImageOverlay
          nodeId={id2}
          view={view2}
          cardWidth={rotate2.displayWidth}
          cardHeight={rotate2.displayHeight}
          closing={isExpandedMediaOverlayClosing}
          onSetPrimary={handleSetPrimary}
          onDeleteSub={handleDeleteSub}
          onSplitSub={handleSplitSub}
          onSplitAll={handleSplitAll}
          onSubContextMenu={handleSubContextMenu}
          onDownloadSub={handleDownloadSub}
          onOpenSlot={handleOpenSubLightbox}
        />
      )}
      {showPopover && showI2VPopover && (
        <I2VPopover
          onSubmit={handleI2VSubmit}
          onClose={handleI2VClose}
          listVideoModels={fetchVideoModels}
          defaultImagePath={typeof meta2?.path === "string" ? meta2.path : void 0}
          selfAssetIds={selfAssetIds}
          defaultImagePaths={referenceImagePaths}
          defaultImageDraftPaths={i2vDraft?.imagePaths}
          defaultVideoPaths={resolveDefaultReferencePaths(
            referenceVideoPaths,
            i2vDraft?.videoPaths,
          )}
          defaultAudioPaths={resolveDefaultReferencePaths(
            referenceAudioPaths,
            i2vDraft?.audioPaths,
          )}
          defaultPrompt={i2vDraftPrompt ?? primaryPrompt}
          defaultPromptJson={i2vDraftPromptJson}
          defaultModelId={i2vDefaultModelId}
          defaultParams={i2vDefaultParams}
          lastUsedModelId={i2vLastUsedModelId}
          lastUsedParams={i2vLastUsedParams}
          resolveFileUrl={resolveFileUrl}
          nodeId={void 0}
          replaceNodeId={id2}
          showCountChip={true}
          isGenerating={false}
          onAspectRatioChange={setEmptyAspectRatio}
          onSaveDraft={(draft) => savePopoverDraft(id2, "i2v", draft)}
          defaultTextPaths={defaultI2VTextPaths}
          hasUpstreamText={!!upstreamTextContent}
          referenceTextContent={upstreamTextContent}
          popoverGapOffset={view2.rounds.length > 1 ? ROUND_DOTS_POPOVER_GAP_OFFSET : 0}
        />
      )}
      {showPopover && showI2IPopover && (
        <I2IPopover
          onSubmit={handleI2ISubmit}
          onClose={handleI2IClose}
          listImageModels={fetchImageModels}
          defaultImagePaths={resolveDefaultReferencePaths(
            referenceImagePaths,
            i2iDraft?.imagePaths,
          )}
          defaultPrompt={i2iDraftPrompt ?? primaryPrompt}
          selfAssetIds={selfAssetIds}
          defaultPromptJson={i2iDraftPromptJson}
          defaultModelId={i2iDefaultModelId}
          defaultParams={i2iDefaultParams}
          lastUsedModelId={i2iLastUsedModelId}
          lastUsedParams={i2iLastUsedParams}
          resolveFileUrl={resolveFileUrl}
          nodeId={void 0}
          replaceNodeId={id2}
          isGenerating={false}
          onAspectRatioChange={setEmptyAspectRatio}
          onSaveDraft={(draft) => savePopoverDraft(id2, "i2i", draft)}
          originalGenerationDraft={i2iRestoreOriginalDraft}
          currentImageCount={view2.slots.length}
          hasLoadingSlots={false}
          defaultTextPaths={defaultI2ITextPaths}
          hasUpstreamText={!!upstreamTextContent}
          referenceTextContent={upstreamTextContent}
          popoverGapOffset={view2.rounds.length > 1 ? ROUND_DOTS_POPOVER_GAP_OFFSET : 0}
        />
      )}
      {showEnhancePopover && (
        <EnhanceImagePopover
          onSubmit={handleEnhanceSubmit}
          onClose={handleEnhanceClose}
          width={primaryWidth}
          height={primaryHeight}
          creditCost={splitPerCellCost}
        />
      )}
      {showMultiAnglePopover && (
        <MultiAnglePopover
          onClose={closeMultiAnglePopover}
          imageUrl={primaryUrl}
          imagePath={meta2?.path}
        />
      )}
      {showStoryboardGridPopover && (
        <StoryboardGridPopover
          onClose={closeStoryboardGridPopover}
          replaceNodeId={isStoryboardProduct ? id2 : void 0}
          imageUrl={primaryUrl}
          imagePath={meta2?.path}
          defaultPrompt={isStoryboardProduct ? primaryPrompt : void 0}
          defaultParams={isStoryboardProduct ? meta2?.params : void 0}
          defaultReferencePaths={storyboardReferencePaths}
          resolveFileUrl={resolveFileUrl}
        />
      )}
      {showRelightPopover && (
        <RelightPopover
          onClose={closeRelightPopover}
          imageUrl={primaryUrl}
          imagePath={meta2?.path}
          imageWidth={primaryWidth}
          imageHeight={primaryHeight}
        />
      )}
      {showWatermarkPopover && primaryUrl && (
        <WatermarkPopover
          sourceUrl={primaryUrl}
          settings={watermarkSettings}
          onSettingsChange={setWatermarkSettings}
          onClose={closeWatermarkPopover}
          onConfirm={async (blob) => {
            const outputNodeId = await emitWatermarkedImage(blob, {
              suffix: "watermark",
              ext: "png",
            });
            focusDerivedNode(outputNodeId);
            const enteredAt = trackedActionStartRef.current.get("watermark");
            trackedActionStartRef.current.delete("watermark");
            onNodeAction?.({
              nodeId: id2,
              nodeType: "image",
              action: "watermark",
              phase: "apply",
              interaction: "opens_panel",
              durationMs: enteredAt == null ? void 0 : Date.now() - enteredAt,
              toolSpecific: {
                output_bytes: blob.size,
              },
            });
          }}
        />
      )}
      {selected2 &&
        (displayImageOnly || isStoryboardProduct) &&
        isInteractiveSelect &&
        !isExpandedMediaOverlayVisible &&
        !isModalActive &&
        !rotate2.editing &&
        !splitMode.editing &&
        !imageEditing &&
        !showWatermarkPopover && (
          <NodeResizeFrame
            nodeId={id2}
            minWidth={isStoryboardProduct ? STORYBOARD_RESIZE_MIN_EDGE : void 0}
            minHeight={isStoryboardProduct ? STORYBOARD_RESIZE_MIN_EDGE : void 0}
            maxWidth={isStoryboardProduct ? STORYBOARD_RESIZE_MAX_EDGE : void 0}
            maxHeight={isStoryboardProduct ? STORYBOARD_RESIZE_MAX_EDGE : void 0}
            keepAspectRatio={isStoryboardProduct}
            onCommit={handleImageResizeCommit}
          />
        )}
      <NodeHandles nodeId={id2} selected={!!selected2} />
      {lightbox.lightboxProps && (
        <ImageLightbox$2
          {...lightbox.lightboxProps}
          alt={meta2?.name ?? ""}
          onSetAsPrimary={canSetLightboxPrimary ? handleSetLightboxPrimary : void 0}
          onSplitToNode={canSplitLightboxImage ? handleSplitLightboxImage : void 0}
        />
      )}
      {colorAdjust.open && meta2?.url && (
        <ColorAdjustDialog
          {...colorAdjust.dialogProps}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) {
              const enteredAt = trackedActionStartRef.current.get("color-adjust");
              trackedActionStartRef.current.delete("color-adjust");
              if (enteredAt != null) {
                onNodeAction?.({
                  nodeId: id2,
                  nodeType: "image",
                  action: "color-adjust",
                  phase: "abandon",
                  interaction: "opens_dialog",
                  durationMs: Date.now() - enteredAt,
                });
              }
            }
            colorAdjust.dialogProps.onOpenChange(nextOpen);
          }}
          onConfirm={async (blob) => {
            const enteredAt = trackedActionStartRef.current.get("color-adjust");
            trackedActionStartRef.current.delete("color-adjust");
            if (enteredAt != null) {
              onNodeAction?.({
                nodeId: id2,
                nodeType: "image",
                action: "color-adjust",
                phase: "apply",
                interaction: "opens_dialog",
                durationMs: Date.now() - enteredAt,
                toolSpecific: {
                  output_bytes: blob.size,
                },
              });
            }
            await colorAdjust.dialogProps.onConfirm(blob);
          }}
          imageSrc={meta2.url}
          fileName={meta2.name}
        />
      )}
    </NodeShell>
  );
}
