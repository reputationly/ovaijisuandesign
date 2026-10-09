// image-inplace-edit-toolbar-inner.jsx
import {
  BoxSelect,
  Check,
  ChevronDown,
  CompositedSvg,
  Hand,
  jsxRuntimeExports,
  NodeToolbar$1 as NodeToolbar,
  Pencil,
  Position,
  reactExports,
  Redo2,
  Slash,
  Tag$1 as Tag,
  Undo2,
  useStore$3 as useStore,
  useTranslation,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  Circle,
  Droplet,
  MousePointer2,
  Square,
  Trash2,
  Type,
} from "./package.jsx";
import {
  MOSAIC_BRUSH_SIZES,
  strengthPercentToPx,
  STROKE_WIDTHS,
} from "./use-editor-state.js";
import { CloseIcon, SendArrowIcon } from "../canvas/file-missing-icon.jsx";
const ArrowFilledIcon = reactExports.forwardRef(function ArrowFilledIcon2(
  { size: size2 = 16, ...rest },
  ref,
) {
  return (
    <CompositedSvg
      ref={ref}
      {...rest}
      width={size2}
      height={size2}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 19 L19 5 M19 5 L13 5 M19 5 L19 11"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </CompositedSvg>
  );
});
const MosaicIcon = reactExports.forwardRef(function MosaicIcon2(
  { size: size2 = 16, strokeWidth = 1.8, ...rest },
  ref,
) {
  return (
    <CompositedSvg
      ref={ref}
      {...rest}
      width={size2}
      height={size2}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="3"
        y="3"
        width="18"
        height="18"
        rx="4"
        stroke="currentColor"
        strokeWidth={strokeWidth}
      />
      <rect x="6.5" y="6.5" width="3" height="3" rx="0.6" fill="currentColor" />
      <rect
        x="14.5"
        y="6.5"
        width="3"
        height="3"
        rx="0.6"
        fill="currentColor"
      />
      <rect
        x="10.5"
        y="10.5"
        width="3"
        height="3"
        rx="0.6"
        fill="currentColor"
      />
      <rect
        x="6.5"
        y="14.5"
        width="3"
        height="3"
        rx="0.6"
        fill="currentColor"
      />
      <rect
        x="14.5"
        y="14.5"
        width="3"
        height="3"
        rx="0.6"
        fill="currentColor"
      />
    </CompositedSvg>
  );
});
const TOOLS = [
  {
    id: "select",
    i18nKey: "imageEdit.toolSelect",
    defaultLabel: "Select",
    Icon: MousePointer2,
  },
  {
    id: "rectangle",
    i18nKey: "imageEdit.toolRectangle",
    defaultLabel: "Rectangle",
    Icon: Square,
  },
  {
    id: "ellipse",
    i18nKey: "imageEdit.toolEllipse",
    defaultLabel: "Ellipse",
    Icon: Circle,
  },
  {
    id: "arrow",
    i18nKey: "imageEdit.toolArrow",
    defaultLabel: "Arrow",
    Icon: ArrowFilledIcon,
  },
  {
    id: "line",
    i18nKey: "imageEdit.toolLine",
    defaultLabel: "Line",
    Icon: Slash,
  },
  {
    id: "brush",
    i18nKey: "imageEdit.toolBrush",
    defaultLabel: "Brush",
    Icon: Pencil,
  },
  {
    id: "text",
    i18nKey: "imageEdit.toolText",
    defaultLabel: "Text",
    Icon: Type,
  },
  {
    id: "tag",
    i18nKey: "imageEdit.toolTag",
    defaultLabel: "Tag",
    Icon: Tag,
  },
  {
    id: "mosaic",
    i18nKey: "imageEdit.toolMosaic",
    defaultLabel: "Mosaic",
    Icon: MosaicIcon,
  },
];
const TOOL_ICON_SIZE = 16;
const ACTION_ICON_SIZE = 14;
const TOOLS_WITH_STYLE = new Set([
  "rectangle",
  "ellipse",
  "arrow",
  "line",
  "brush",
  "text",
  "tag",
  "mosaic",
]);
const COLORS = [
  "#FF3B30",
  "#FF9500",
  "#FFCC00",
  "#34C759",
  "#007AFF",
  "#AF52DE",
  "#1C1C1E",
  "#FFFFFF",
];
const FONT_SIZES = [12, 16, 24, 36, 48, 60, 72, 96];
function PlainTextIcon({ size: size2 = 16 }) {
  return (
    <CompositedSvg
      width={size2}
      height={size2}
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M3 3h10v2.2h-1.05v-1.1H8.7V12h1.2v1.1H6.1V12h1.2V4.1H4.05V5.2H3z" />
    </CompositedSvg>
  );
}
function FilledTextIcon({ size: size2 = 16 }) {
  return (
    <CompositedSvg
      width={size2}
      height={size2}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="1.5"
        y="1.5"
        width="13"
        height="13"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M4.5 4.6h7v1.6h-.85v-.7H8.65v5.5h.95v.9H6.4v-.9h.95v-5.5H5.35v.7H4.5z"
        fill="currentColor"
      />
    </CompositedSvg>
  );
}
function OutlinedTextIcon({ size: size2 = 16 }) {
  return (
    <CompositedSvg
      width={size2}
      height={size2}
      viewBox="2 2 12 12"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3 3h10v2.2h-1.05v-1.1H8.7V12h1.2v1.1H6.1V12h1.2V4.1H4.05V5.2H3z"
        stroke="currentColor"
        strokeWidth="0.7"
        strokeLinejoin="round"
      />
    </CompositedSvg>
  );
}
const TEXT_VARIANTS = [
  {
    id: "plain",
    i18nKey: "imageEdit.textVariantPlain",
    defaultLabel: "Plain text",
    Icon: PlainTextIcon,
  },
  {
    id: "filled",
    i18nKey: "imageEdit.textVariantFilled",
    defaultLabel: "Filled text",
    Icon: FilledTextIcon,
  },
  {
    id: "outlined",
    i18nKey: "imageEdit.textVariantOutlined",
    defaultLabel: "Outlined text",
    Icon: OutlinedTextIcon,
  },
];
const HEADER_FLOW_HEIGHT = 28;
const TOOLBAR_GAP = 16;
const zoomSelector = (s2) => s2.transform[2];
function ToolbarIconButton({
  title,
  active: active2 = false,
  disabled: disabled2 = false,
  onClick,
  children: children2,
  dataToolId,
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active2}
      disabled={disabled2}
      onClick={onClick}
      data-tool-id={dataToolId}
      data-content="icon"
      className="canvas-toolbar-action"
    >
      {children2}
    </button>
  );
}
function Divider() {
  return <div className="canvas-toolbar-separator" aria-hidden="true" />;
}
function isLightColor(hex2) {
  const c3 = hex2.replace("#", "");
  if (c3.length !== 6) return false;
  const r2 = Number.parseInt(c3.slice(0, 2), 16);
  const g2 = Number.parseInt(c3.slice(2, 4), 16);
  const b3 = Number.parseInt(c3.slice(4, 6), 16);
  return (r2 * 299 + g2 * 587 + b3 * 114) / 1e3 > 165;
}
export function ImageInplaceEditToolbarInner({
  visible,
  activeTool,
  activeColor,
  activeStrokeWidth,
  activeTextVariant,
  activeFontSize,
  activeMosaicMode,
  activeMosaicShape,
  activeMosaicBrushSize,
  activeMosaicStrength,
  canUndo,
  canRedo,
  hasShapes,
  saving,
  onSelectTool,
  onSelectColor,
  onSelectStrokeWidth,
  onSelectTextVariant,
  onSelectFontSize,
  onSelectMosaicMode,
  onSelectMosaicShape,
  onSelectMosaicBrushSize,
  onSelectMosaicStrength,
  onUndo,
  onRedo,
  onClear,
  onCancel,
  onSave,
}) {
  const { t: t2 } = useTranslation();
  const zoom2 = useStore(zoomSelector);
  const offset2 = HEADER_FLOW_HEIGHT * zoom2 + TOOLBAR_GAP;
  const showStylePopover = TOOLS_WITH_STYLE.has(activeTool);
  const isTextTool = activeTool === "text";
  const isTagTool = activeTool === "tag";
  const isMosaicTool = activeTool === "mosaic";
  const showVariant = isTextTool;
  const showFontSize = isTextTool || isTagTool;
  const showStrokeWidth = !isTextTool && !isTagTool && !isMosaicTool;
  const showColors = !isMosaicTool;
  const showMosaic = isMosaicTool;
  const [fontSizeOpen, setFontSizeOpen] = reactExports.useState(false);
  const fontSizeMenuRef = reactExports.useRef(null);
  const fontSizeBtnRef = reactExports.useRef(null);
  const [brushSizeOpen, setBrushSizeOpen] = reactExports.useState(false);
  const brushSizeMenuRef = reactExports.useRef(null);
  const brushSizeBtnRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    setFontSizeOpen(false);
    setBrushSizeOpen(false);
  }, [activeTool]);
  reactExports.useEffect(() => {
    if (!fontSizeOpen) return;
    const onDown = (e2) => {
      const t22 = e2.target;
      if (!t22) return;
      if (fontSizeMenuRef.current?.contains(t22)) return;
      if (fontSizeBtnRef.current?.contains(t22)) return;
      setFontSizeOpen(false);
    };
    const onKey = (e2) => {
      if (e2.key === "Escape") setFontSizeOpen(false);
    };
    window.addEventListener("mousedown", onDown, true);
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("mousedown", onDown, true);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [fontSizeOpen]);
  reactExports.useEffect(() => {
    if (!brushSizeOpen) return;
    const onDown = (e2) => {
      const t22 = e2.target;
      if (!t22) return;
      if (brushSizeMenuRef.current?.contains(t22)) return;
      if (brushSizeBtnRef.current?.contains(t22)) return;
      setBrushSizeOpen(false);
    };
    const onKey = (e2) => {
      if (e2.key === "Escape") setBrushSizeOpen(false);
    };
    window.addEventListener("mousedown", onDown, true);
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("mousedown", onDown, true);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [brushSizeOpen]);
  const wrapperRef = reactExports.useRef(null);
  const popoverRef = reactExports.useRef(null);
  const mainBarRef = reactExports.useRef(null);
  const [popoverLeft, setPopoverLeft] = reactExports.useState(null);
  reactExports.useLayoutEffect(() => {
    if (!visible || !showStylePopover) {
      setPopoverLeft(null);
      return;
    }
    const wrapper = wrapperRef.current;
    const popover = popoverRef.current;
    const bar = mainBarRef.current;
    if (!wrapper || !popover || !bar) return;
    const btn = bar.querySelector(`[data-tool-id="${activeTool}"]`);
    if (!btn) return;
    const wrapperRect = wrapper.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    const btnCenter = btnRect.left - wrapperRect.left + btnRect.width / 2;
    setPopoverLeft(btnCenter - popover.offsetWidth / 2);
  }, [
    activeTool,
    showStylePopover,
    visible,
    zoom2,
    activeFontSize,
    activeMosaicMode,
    activeMosaicShape,
  ]);
  return (
    <NodeToolbar
      isVisible={visible}
      position={Position.Top}
      offset={offset2}
      align="center"
    >
      <div
        ref={wrapperRef}
        className="relative inline-flex flex-col select-none animate-[toolbar-fade-in_0.15s_ease-out]"
        onPointerDown={(e2) => e2.stopPropagation()}
        onWheel={(e2) => e2.stopPropagation()}
        onContextMenu={(e2) => e2.stopPropagation()}
      >
        <div
          ref={mainBarRef}
          className="canvas-toolbar-surface"
          data-canvas-toolbar="true"
          data-density="compact"
        >
          <div className="flex items-center gap-0.5">
            {TOOLS.map((tool2) => {
              const active2 = activeTool === tool2.id;
              return (
                <ToolbarIconButton
                  key={tool2.id}
                  dataToolId={tool2.id}
                  title={t2(tool2.i18nKey, tool2.defaultLabel)}
                  active={active2}
                  onClick={() => onSelectTool(tool2.id)}
                >
                  <tool2.Icon size={TOOL_ICON_SIZE} strokeWidth={2} />
                </ToolbarIconButton>
              );
            })}
          </div>
          <Divider />
          <div className="flex items-center gap-0.5">
            <ToolbarIconButton
              title={t2("imageEdit.undo")}
              disabled={!canUndo}
              onClick={onUndo}
            >
              <Undo2 size={ACTION_ICON_SIZE} strokeWidth={2} />
            </ToolbarIconButton>
            <ToolbarIconButton
              title={t2("imageEdit.redo")}
              disabled={!canRedo}
              onClick={onRedo}
            >
              <Redo2 size={ACTION_ICON_SIZE} strokeWidth={2} />
            </ToolbarIconButton>
            <ToolbarIconButton
              title={t2("imageEdit.clear")}
              disabled={!hasShapes}
              onClick={onClear}
            >
              <Trash2 size={ACTION_ICON_SIZE} strokeWidth={2} />
            </ToolbarIconButton>
          </div>
          <Divider />
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="canvas-toolbar-action"
            aria-label={t2("common.cancel")}
            title={t2("common.cancel")}
          >
            <CloseIcon />
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="canvas-toolbar-action"
            aria-label={
              saving ? t2("imageEdit.saving") : t2("imageEdit.saveToCanvas")
            }
            title={
              saving ? t2("imageEdit.saving") : t2("imageEdit.saveToCanvas")
            }
            data-variant="primary"
          >
            <SendArrowIcon />
          </button>
        </div>
        {showStylePopover && (
          <div
            ref={popoverRef}
            className="canvas-toolbar-surface absolute bottom-full mb-2 animate-[toolbar-fade-in_0.15s_ease-out]"
            style={{
              left: popoverLeft ?? 0,
              visibility: popoverLeft === null ? "hidden" : "visible",
            }}
            data-canvas-toolbar="true"
            data-density="compact"
          >
            <div
              aria-hidden={true}
              className="absolute -bottom-[5px] left-1/2 h-2 w-2 [border-bottom-width:var(--canvas-toolbar-border-width)] [border-right-width:var(--canvas-toolbar-border-width)]"
              style={{
                transform: "translateX(-50%) rotate(45deg)",
                background: "var(--canvas-toolbar-bg)",
                borderColor: "var(--canvas-toolbar-border)",
              }}
            />
            {showVariant && (
              <>
                <div className="flex items-center gap-0.5">
                  {TEXT_VARIANTS.map((v2) => {
                    const active2 = activeTextVariant === v2.id;
                    return (
                      <ToolbarIconButton
                        key={v2.id}
                        title={t2(v2.i18nKey, v2.defaultLabel)}
                        active={active2}
                        onClick={() => onSelectTextVariant(v2.id)}
                      >
                        <v2.Icon size={16} />
                      </ToolbarIconButton>
                    );
                  })}
                </div>
                <Divider />
              </>
            )}
            {showFontSize && (
              /* 字号下拉 */ <div className="relative flex items-center">
                <button
                  ref={fontSizeBtnRef}
                  type="button"
                  title={t2("imageEdit.fontSize")}
                  aria-haspopup="listbox"
                  aria-expanded={fontSizeOpen}
                  onClick={() => setFontSizeOpen((v2) => !v2)}
                  className="canvas-toolbar-action"
                  data-active={fontSizeOpen || void 0}
                >
                  <span>{activeFontSize}pt</span>
                  <ChevronDown
                    size={12}
                    strokeWidth={2}
                    style={{
                      transform: fontSizeOpen ? "rotate(180deg)" : void 0,
                      transition: "transform 0.15s",
                    }}
                    data-toolbar-icon="disclosure"
                  />
                </button>
                {fontSizeOpen && (
                  <div
                    ref={fontSizeMenuRef}
                    role="listbox"
                    className="absolute left-0 bottom-full z-10 mb-2 flex min-w-[80px] flex-col canvas-toolbar-menu py-1 animate-[toolbar-fade-in_0.12s_ease-out]"
                    data-density="compact"
                  >
                    {FONT_SIZES.map((size2) => {
                      const active2 = activeFontSize === size2;
                      return (
                        <button
                          key={size2}
                          type="button"
                          role="option"
                          aria-selected={active2}
                          onClick={() => {
                            onSelectFontSize(size2);
                            setFontSizeOpen(false);
                          }}
                          className="canvas-toolbar-action"
                        >
                          <span>{size2}pt</span>
                          {active2 && (
                            <Check
                              size={12}
                              strokeWidth={3}
                              className="ml-2"
                              data-toolbar-icon="disclosure"
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            {showStrokeWidth && (
              /* Stroke width — dot size previews the stroke; the button owns selection. */ <div className="flex items-center gap-0.5">
                {STROKE_WIDTHS.map(({ value, dotPx }) => {
                  const active2 = activeStrokeWidth === value;
                  return (
                    <ToolbarIconButton
                      key={value}
                      title={`${t2("imageEdit.strokeWidth")} ${value}`}
                      onClick={() => onSelectStrokeWidth(value)}
                      active={active2}
                    >
                      <span
                        className="block rounded-full"
                        style={{
                          width: dotPx,
                          height: dotPx,
                          background: "var(--canvas-toolbar-fg)",
                        }}
                      />
                    </ToolbarIconButton>
                  );
                })}
              </div>
            )}
            {showMosaic && (
              <>
                <div className="flex items-center gap-0.5">
                  <ToolbarIconButton
                    title={t2("imageEdit.mosaicModeMosaic")}
                    active={activeMosaicMode === "mosaic"}
                    onClick={() => onSelectMosaicMode("mosaic")}
                  >
                    <MosaicIcon size={TOOL_ICON_SIZE} strokeWidth={1.75} />
                  </ToolbarIconButton>
                  <ToolbarIconButton
                    title={t2("imageEdit.mosaicModeBlur")}
                    active={activeMosaicMode === "blur"}
                    onClick={() => onSelectMosaicMode("blur")}
                  >
                    <Droplet size={TOOL_ICON_SIZE} strokeWidth={2} />
                  </ToolbarIconButton>
                </div>
                <Divider />
                <div className="flex items-center gap-0.5">
                  <ToolbarIconButton
                    title={t2("imageEdit.mosaicShapeBrush")}
                    active={activeMosaicShape === "brush"}
                    onClick={() => onSelectMosaicShape("brush")}
                  >
                    <Hand size={TOOL_ICON_SIZE} strokeWidth={2} />
                  </ToolbarIconButton>
                  <div className="relative flex items-center">
                    <button
                      ref={brushSizeBtnRef}
                      type="button"
                      title={t2("imageEdit.mosaicBrushSize")}
                      aria-haspopup="listbox"
                      aria-expanded={brushSizeOpen}
                      onClick={() => setBrushSizeOpen((v2) => !v2)}
                      className="canvas-toolbar-action canvas-toolbar-disclosure"
                      data-active={brushSizeOpen || void 0}
                    >
                      <ChevronDown
                        size={12}
                        strokeWidth={2}
                        style={{
                          transform: brushSizeOpen ? "rotate(180deg)" : void 0,
                          transition: "transform 0.15s",
                        }}
                        data-toolbar-icon="disclosure"
                      />
                    </button>
                    {brushSizeOpen && (
                      <div
                        ref={brushSizeMenuRef}
                        role="listbox"
                        aria-label={t2("imageEdit.mosaicBrushSize")}
                        className="absolute left-1/2 bottom-full z-10 mb-2 flex -translate-x-1/2 flex-col items-center gap-1 canvas-toolbar-menu p-2 animate-[toolbar-fade-in_0.12s_ease-out]"
                        data-density="compact"
                      >
                        {MOSAIC_BRUSH_SIZES.map(({ value, dotPx }) => {
                          const active2 = activeMosaicBrushSize === value;
                          return (
                            <button
                              key={value}
                              type="button"
                              role="option"
                              aria-selected={active2}
                              title={`${t2("imageEdit.mosaicBrushSize")} ${value}`}
                              aria-label={`${t2("imageEdit.mosaicBrushSize")} ${value}`}
                              data-content="icon"
                              onClick={() => {
                                onSelectMosaicBrushSize(value);
                                if (activeMosaicShape !== "brush") {
                                  onSelectMosaicShape("brush");
                                }
                                setBrushSizeOpen(false);
                              }}
                              className="canvas-toolbar-action"
                            >
                              <span
                                className="block rounded-full"
                                style={{
                                  width: dotPx,
                                  height: dotPx,
                                  background: "var(--canvas-toolbar-fg)",
                                }}
                              />
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <ToolbarIconButton
                    title={t2("imageEdit.mosaicShapeRect")}
                    active={activeMosaicShape === "rectangle"}
                    onClick={() => onSelectMosaicShape("rectangle")}
                  >
                    <BoxSelect size={TOOL_ICON_SIZE} strokeWidth={2} />
                  </ToolbarIconButton>
                </div>
                <Divider />
                <div className="flex h-7 items-center gap-2 pl-1 pr-2">
                  <span
                    className="whitespace-nowrap canvas-toolbar-label"
                    style={{
                      color: "var(--canvas-toolbar-fg)",
                    }}
                  >
                    {activeMosaicMode === "blur"
                      ? t2("imageEdit.mosaicStrengthBlur")
                      : t2("imageEdit.mosaicStrengthMosaic")}
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={activeMosaicStrength}
                    onChange={(e2) => {
                      const percent2 = Number(e2.currentTarget.value);
                      onSelectMosaicStrength(
                        percent2,
                        strengthPercentToPx(percent2, activeMosaicMode),
                      );
                    }}
                    aria-label={t2("imageEdit.mosaicStrength")}
                    className="image-edit-mosaic-slider h-1 w-[110px] cursor-pointer appearance-none rounded-full"
                    style={{
                      background: `linear-gradient(to right, var(--canvas-controls-primary, #007AFF) 0%, var(--canvas-controls-primary, #007AFF) ${activeMosaicStrength}%, rgba(0,0,0,0.15) ${activeMosaicStrength}%, rgba(0,0,0,0.15) 100%)`,
                    }}
                  />
                  <span
                    className="inline-block min-w-[34px] text-right canvas-toolbar-label tabular-nums"
                    style={{
                      color: "var(--canvas-toolbar-fg)",
                    }}
                  >
                    {activeMosaicStrength}%
                  </span>
                </div>
              </>
            )}
            {showColors && (
              <>
                <Divider />
                <div className="flex items-center gap-[6px]">
                  {COLORS.map((color2) => {
                    const active2 =
                      activeColor.toLowerCase() === color2.toLowerCase();
                    const checkColor = isLightColor(color2)
                      ? "#1C1C1E"
                      : "#FFFFFF";
                    return (
                      <button
                        key={color2}
                        type="button"
                        title={color2}
                        aria-label={color2}
                        aria-pressed={active2}
                        onClick={() => onSelectColor(color2)}
                        className="inline-flex size-5 items-center justify-center rounded-[4px] border border-black/10 transition-transform hover:scale-110"
                        style={{
                          backgroundColor: color2,
                        }}
                      >
                        {active2 && (
                          <Check
                            size={12}
                            strokeWidth={3}
                            style={{
                              color: checkColor,
                            }}
                            data-toolbar-icon="disclosure"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </NodeToolbar>
  );
}
