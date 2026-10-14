// watermark-popover.jsx
import { drawWatermark } from "./single-position.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { cn as mergeClassNames } from "../infra/dialog-content.jsx";
import { ToolSlider } from "./tool-slider.jsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../generation/select-content.jsx";
import { jsxRuntimeExports, reactExports, useTranslation, X$7 as X } from "../vendor.js";
import { NodeToolbar, useNodeId, useStore } from "../vendor-fork/xyflow/react/index.js";
import { Position } from "../vendor-fork/xyflow/system/index.js";
import { dedupedToast } from "../infra/agent-http-client.js";
import { WATERMARK_PANEL_WIDTH } from "./storyboard-resize-max-edge.js";
import {
  useCanvasIsBoxSelecting,
  useCanvasIsDragging,
  useCanvasIsMultiSelect,
} from "./package.jsx";
import { NODE_POPOVER_SAFE_GAP } from "./use-warn-missing-asset-meta.jsx";
import { Button } from "../canvas/node-shell-inner.jsx";
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}
async function renderWatermarkedBlob(src, settings) {
  const image = await loadImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("watermark-utils: 2d context unavailable");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  drawWatermark(context, canvas.width, canvas.height, settings);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("watermark-utils: toBlob returned null"));
    }, "image/png");
  });
}
const PANEL_MAX_HEIGHT = 480;
const PANEL_MIN_HEIGHT = 360;
const VIEWPORT_MARGIN = 16;
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
  FONT_OPTIONS.map((option) => [option.value, option.label]),
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
  WEIGHT_OPTIONS.map((option) => [String(option.value), option.label]),
);
const FONT_SIZE_OPTIONS = [
  10, 12, 14, 16, 18, 20, 24, 32, 36, 48, 64, 72, 96, 120,
];
const POSITIONS = ["tl", "tc", "tr", "ml", "mc", "mr", "bl", "bc", "br"];
function ColorOpacityControl({
  color,
  opacity,
  colorLabel,
  opacityLabel,
  onColorChange,
  onOpacityChange,
}) {
  const [hexDraft, setHexDraft] = reactExports.useState(
    color.replace(/^#/, "").toUpperCase(),
  );
  reactExports.useEffect(() => {
    setHexDraft(color.replace(/^#/, "").toUpperCase());
  }, [color]);
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
    setHexDraft(color.replace(/^#/, "").toUpperCase());
  }, [color, hexDraft, onColorChange]);
  return (
    <div className="flex h-8 overflow-hidden rounded-md border border-input bg-transparent transition-colors focus-within:border-ring focus-within:ring-1 focus-within:ring-ring/50">
      <label className="relative my-auto ml-2 size-5 shrink-0 overflow-hidden rounded border border-input">
        <span className="sr-only">{colorLabel}</span>
        <span
          className="absolute inset-0"
          style={{
            backgroundColor: color,
          }}
        />
        <input
          type="color"
          value={color}
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
          if (/^[0-9A-F]{6}$/.test(compact))
            onColorChange(`#${compact.toLowerCase()}`);
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
            onOpacityChange(
              Math.min(100, Math.max(0, Number(event.currentTarget.value))),
            );
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
    : [...FONT_SIZE_OPTIONS, value].sort((fontSizeA, fontSizeB) => fontSizeA - fontSizeB);
  const items = Object.fromEntries(
    options.map((size) => [String(size), `${size}px`]),
  );
  return (
    <Select
      value={String(value)}
      items={items}
      onValueChange={(nextValue) => nextValue && onChange(Number(nextValue))}
    >
      <SelectTrigger
        aria-label={label}
        data-action-ui-id="canvas.watermark.size-select"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent
        className="border border-[var(--canvas-controls-border)] shadow-[var(--canvas-shadow-dropdown)]"
        style={{
          background:
            "color-mix(in srgb, var(--canvas-controls-bg) 97%, var(--canvas-controls-text) 3%)",
        }}
      >
        {options.map((size) => (
          <SelectItem key={size} value={String(size)}>
            {size}px
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
function ControlSection({
  label,
  className,
  headerAction,
  children,
}) {
  return (
    <section className={mergeClassNames("space-y-2.5", className)}>
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-hl_text_02 text-[13px] font-medium leading-5">
          {label}
        </h4>
        {headerAction}
      </div>
      <div className="space-y-2.5">{children}</div>
    </section>
  );
}
function SliderControl({
  label,
  value,
  min,
  max,
  suffix = "",
  showValue = true,
  onChange,
}) {
  return (
    <ToolSlider
      label={label}
      value={value}
      min={min}
      max={max}
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
function SegmentedControl({
  className,
  label,
  values,
  value,
  format,
  onChange,
}) {
  return (
    <div className={mergeClassNames("flex items-center justify-between gap-3", className)}>
      {label && (
        <span className="text-hl_text_02 text-[13px] font-medium leading-5">
          {label}
        </span>
      )}
      <div className="flex w-[148px] shrink-0 rounded-full bg-foreground/[0.06] p-0.5">
        {values.map((item) => {
          const active = item === value;
          return (
            <button
              key={String(item)}
              type="button"
              onClick={() => onChange(item)}
              aria-pressed={active}
              className={mergeClassNames(
                "relative flex h-7 flex-1 items-center justify-center rounded-full px-2 text-[11px] text-muted-foreground transition-colors hover:text-[var(--canvas-controls-text)]",
                active && "bg-background text-foreground shadow-sm",
              )}
            >
              {format(item)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
export function WatermarkPopover({
  sourceUrl,
  settings,
  renderOutput = renderWatermarkedBlob,
  onSettingsChange,
  onClose,
  onConfirm,
}) {
  const { t } = useTranslation();
  const nodeId = useNodeId() ?? "";
  const [saving, setSaving] = reactExports.useState(false);
  const [panelScrolling, setPanelScrolling] = reactExports.useState(false);
  const scrollAreaRef = reactExports.useRef(null);
  const shadowWasEnabledRef = reactExports.useRef(settings.shadow);
  const scrollIdleTimerRef = reactExports.useRef(null);
  const selectedSelector = reactExports.useCallback(
    (state) => (nodeId ? !!state.nodeLookup.get(nodeId)?.selected : true),
    [nodeId],
  );
  const selected = useStore(selectedSelector);
  const isDragging = useCanvasIsDragging();
  const isMultiSelect = useCanvasIsMultiSelect();
  const isBoxSelecting = useCanvasIsBoxSelecting();
  reactExports.useEffect(() => {
    if (!selected) onClose();
  }, [onClose, selected]);
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
    const frame = requestAnimationFrame(() => {
      const scrollArea = scrollAreaRef.current;
      scrollArea?.scrollTo({
        top: scrollArea.scrollHeight,
        behavior: "smooth",
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [settings.shadow]);
  const handlePanelScroll = reactExports.useCallback(() => {
    setPanelScrolling(true);
    if (scrollIdleTimerRef.current) clearTimeout(scrollIdleTimerRef.current);
    scrollIdleTimerRef.current = setTimeout(
      () => setPanelScrolling(false),
      700,
    );
  }, []);
  const setSetting = reactExports.useCallback(
    (key, value) => {
      onSettingsChange({
        ...settings,
        [key]: value,
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
      dedupedToast.error(
        t("canvas.watermark.saveError", "Failed to add watermark"),
      );
      setSaving(false);
    }
  }, [onClose, onConfirm, renderOutput, saving, settings, sourceUrl, t]);
  const hidden = isDragging || isMultiSelect || isBoxSelecting;
  const availableHeight = window.innerHeight - VIEWPORT_MARGIN * 2;
  const panelHeight = Math.max(
    PANEL_MIN_HEIGHT,
    Math.min(PANEL_MAX_HEIGHT, availableHeight),
  );
  return (
    <NodeToolbar
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
            {t("canvas.watermark.title", "Watermark")}
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="ml-auto flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-[var(--canvas-controls-hover)] hover:text-[var(--canvas-controls-text)] disabled:opacity-50"
            aria-label={t("common.close", "Close")}
            data-action-ui-id="canvas.watermark.close"
          >
            <X size={18} strokeWidth={1.5} aria-hidden="true" />
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
          <ControlSection label={t("canvas.watermark.text", "Watermark text")}>
            <textarea
              value={settings.text}
              onChange={(event) =>
                setSetting("text", event.currentTarget.value)
              }
              placeholder={t(
                "canvas.watermark.placeholder",
                "Enter watermark text",
              )}
              rows={2}
              className="min-h-14 w-full resize-none rounded-lg border border-input bg-transparent px-2.5 py-2 text-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
              data-action-ui-id="canvas.watermark.text-input"
            />
          </ControlSection>
          <ControlSection label={t("canvas.watermark.style", "Style")}>
            <Select
              value={settings.fontFamily}
              items={FONT_ITEMS}
              onValueChange={(value) =>
                value && setSetting("fontFamily", value)
              }
            >
              <SelectTrigger data-action-ui-id="canvas.watermark.font-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent
                className="border border-[var(--canvas-controls-border)] shadow-[var(--canvas-shadow-dropdown)]"
                style={{
                  background:
                    "color-mix(in srgb, var(--canvas-controls-bg) 97%, var(--canvas-controls-text) 3%)",
                }}
              >
                {FONT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-2">
              <Select
                value={String(settings.fontWeight)}
                items={WEIGHT_ITEMS}
                onValueChange={(value) =>
                  value && setSetting("fontWeight", Number(value))
                }
              >
                <SelectTrigger
                  aria-label={t("canvas.watermark.weight", "Weight")}
                  data-action-ui-id="canvas.watermark.weight-select"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent
                  className="border border-[var(--canvas-controls-border)] shadow-[var(--canvas-shadow-dropdown)]"
                  style={{
                    background:
                      "color-mix(in srgb, var(--canvas-controls-bg) 97%, var(--canvas-controls-text) 3%)",
                  }}
                >
                  {WEIGHT_OPTIONS.map((option) => (
                    <SelectItem
                      key={option.value}
                      value={String(option.value)}
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FontSizeSelect
                value={settings.fontSize}
                label={t("canvas.watermark.size", "Size")}
                onChange={(value) => setSetting("fontSize", value)}
              />
            </div>
            <ColorOpacityControl
              color={settings.color}
              opacity={settings.opacity}
              colorLabel={t("canvas.watermark.color", "Color")}
              opacityLabel={t("canvas.watermark.opacity", "Opacity")}
              onColorChange={(value) => setSetting("color", value)}
              onOpacityChange={(value) => setSetting("opacity", value)}
            />
            <SliderControl
              label={t("canvas.watermark.rotation", "Rotation")}
              value={settings.rotation}
              min={-180}
              max={180}
              suffix="°"
              onChange={(value) => setSetting("rotation", value)}
            />
          </ControlSection>
          <ControlSection
            label={t("canvas.watermark.layout", "Layout")}
            className="pt-2"
            headerAction={
              <SegmentedControl
                values={["single", "tile"]}
                value={settings.mode}
                format={(value) =>
                  value === "single"
                    ? t("canvas.watermark.single", "Single")
                    : t("canvas.watermark.tile", "Tile")
                }
                onChange={(value) => setSetting("mode", value)}
              />
            }
          >
            {settings.mode === "single" ? (
              <>
                <fieldset
                  className="grid grid-cols-3 gap-1"
                  aria-label={t("canvas.watermark.position", "Position")}
                >
                  {POSITIONS.map((position) => (
                    <button
                      key={position}
                      type="button"
                      onClick={() => setSetting("position", position)}
                      aria-label={`${t("canvas.watermark.position", "Position")} ${position}`}
                      aria-pressed={settings.position === position}
                      className={mergeClassNames(
                        "flex h-7 items-center justify-center rounded-md border border-input transition-colors hover:bg-[var(--canvas-controls-hover)]",
                        settings.position === position &&
                          "bg-foreground text-background",
                      )}
                    >
                      <span className="size-1.5 rounded-full bg-current" />
                    </button>
                  ))}
                </fieldset>
                <SliderControl
                  label={t("canvas.watermark.padding", "Padding")}
                  value={settings.padding}
                  min={0}
                  max={200}
                  suffix="px"
                  onChange={(value) => setSetting("padding", value)}
                />
              </>
            ) : (
              <SliderControl
                label={t("canvas.watermark.spacing", "Spacing")}
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
              label={t("canvas.watermark.shadow", "Shadow")}
              values={[false, true]}
              value={settings.shadow}
              format={(value) =>
                value
                  ? t("canvas.watermark.on", "On")
                  : t("canvas.watermark.off", "Off")
              }
              onChange={(value) => setSetting("shadow", value)}
            />
            {settings.shadow && (
              <div className="animate-in fade-in-0 slide-in-from-top-1 duration-200">
                <SliderControl
                  label={t("canvas.watermark.shadowBlur", "Shadow blur")}
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
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={saving}
          >
            {t("common.cancel", "Cancel")}
          </Button>
          <Button
            size="sm"
            onClick={() => void handleSave()}
            loading={saving}
            disabled={!settings.text.trim()}
            data-action-ui-id="canvas.watermark.apply"
          >
            {saving
              ? t("canvas.watermark.processing", "Processing…")
              : t("canvas.watermark.apply", "Apply")}
          </Button>
        </footer>
      </div>
    </NodeToolbar>
  );
}
