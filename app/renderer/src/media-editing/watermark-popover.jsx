// watermark-popover.jsx
import { drawWatermark } from "./single-position.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { cn$5 } from "../infra/dialog-content.jsx";
import { ToolSlider } from "./tool-slider.jsx";
import {
  Select$2,
  SelectContent$1,
  SelectItem$1,
  SelectTrigger$1,
  SelectValue$1,
} from "../generation/select-content.jsx";
import {
  dedupedToast,
  jsxRuntimeExports,
  NodeToolbar$1,
  Position,
  reactExports,
  useNodeId,
  useStore$3,
  useTranslation,
  X$7,
} from "../vendor.js";
import { WATERMARK_PANEL_WIDTH } from "./storyboard-resize-max-edge.js";
import {
  useCanvasIsBoxSelecting,
  useCanvasIsDragging,
  useCanvasIsMultiSelect,
} from "./package.jsx";
import { NODE_POPOVER_SAFE_GAP } from "./use-warn-missing-asset-meta.jsx";
import { Button$2 } from "../canvas/node-shell-inner.jsx";

function loadImage$2(src) {
  return new Promise((resolve, reject) => {
    const image2 = new Image();
    image2.crossOrigin = "anonymous";
    image2.onload = () => resolve(image2);
    image2.onerror = reject;
    image2.src = src;
  });
}

async function renderWatermarkedBlob(src, settings) {
  const image2 = await loadImage$2(src);
  const canvas = document.createElement("canvas");
  canvas.width = image2.naturalWidth || image2.width;
  canvas.height = image2.naturalHeight || image2.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("watermark-utils: 2d context unavailable");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image2, 0, 0, canvas.width, canvas.height);
  drawWatermark(context, canvas.width, canvas.height, settings);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("watermark-utils: toBlob returned null"));
    }, "image/png");
  });
}

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

const FONT_SIZE_OPTIONS = [
  10, 12, 14, 16, 18, 20, 24, 32, 36, 48, 64, 72, 96, 120,
];

const POSITIONS = ["tl", "tc", "tr", "ml", "mc", "mr", "bl", "bc", "br"];

function ColorOpacityControl({
  color: color2,
  opacity,
  colorLabel,
  opacityLabel,
  onColorChange,
  onOpacityChange,
}) {
  const [hexDraft, setHexDraft] = reactExports.useState(
    color2.replace(/^#/, "").toUpperCase(),
  );
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
    : [...FONT_SIZE_OPTIONS, value].sort((a2, b3) => a2 - b3);
  const items = Object.fromEntries(
    options.map((size2) => [String(size2), `${size2}px`]),
  );
  return (
    <Select$2
      value={String(value)}
      items={items}
      onValueChange={(nextValue) => nextValue && onChange(Number(nextValue))}
    >
      <SelectTrigger$1
        aria-label={label}
        data-action-ui-id="canvas.watermark.size-select"
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
        {options.map((size2) => (
          <SelectItem$1 key={size2} value={String(size2)}>
            {size2}px
          </SelectItem$1>
        ))}
      </SelectContent$1>
    </Select$2>
  );
}

function ControlSection({
  label,
  className,
  headerAction,
  children: children2,
}) {
  return (
    <section className={cn$5("space-y-2.5", className)}>
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-hl_text_02 text-[13px] font-medium leading-5">
          {label}
        </h4>
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

function SegmentedControl({
  className,
  label,
  values: values3,
  value,
  format: format2,
  onChange,
}) {
  return (
    <div className={cn$5("flex items-center justify-between gap-3", className)}>
      {label && (
        <span className="text-hl_text_02 text-[13px] font-medium leading-5">
          {label}
        </span>
      )}
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
    scrollIdleTimerRef.current = setTimeout(
      () => setPanelScrolling(false),
      700,
    );
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
      dedupedToast.error(
        t2("canvas.watermark.saveError", "Failed to add watermark"),
      );
      setSaving(false);
    }
  }, [onClose, onConfirm, renderOutput, saving, settings, sourceUrl, t2]);
  const hidden = isDragging || isMultiSelect || isBoxSelecting;
  const availableHeight = window.innerHeight - VIEWPORT_MARGIN$1 * 2;
  const panelHeight = Math.max(
    PANEL_MIN_HEIGHT$1,
    Math.min(PANEL_MAX_HEIGHT, availableHeight),
  );
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
              onChange={(event) =>
                setSetting("text", event.currentTarget.value)
              }
              placeholder={t2(
                "canvas.watermark.placeholder",
                "Enter watermark text",
              )}
              rows={2}
              className="min-h-14 w-full resize-none rounded-lg border border-input bg-transparent px-2.5 py-2 text-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
              data-action-ui-id="canvas.watermark.text-input"
            />
          </ControlSection>
          <ControlSection label={t2("canvas.watermark.style", "Style")}>
            <Select$2
              value={settings.fontFamily}
              items={FONT_ITEMS}
              onValueChange={(value) =>
                value && setSetting("fontFamily", value)
              }
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
                onValueChange={(value) =>
                  value && setSetting("fontWeight", Number(value))
                }
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
                    <SelectItem$1
                      key={option2.value}
                      value={String(option2.value)}
                    >
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
                        settings.position === position2 &&
                          "bg-foreground text-background",
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
                value
                  ? t2("canvas.watermark.on", "On")
                  : t2("canvas.watermark.off", "Off")
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
          <Button$2
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={saving}
          >
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
