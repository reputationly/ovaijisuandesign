// image-inplace-edit-toolbar-inner.jsx
import jsxRuntimeExports from "react/jsx-runtime";
import reactExports from "react";
import { useTranslation } from "react-i18next";
import { BoxSelect, Check, ChevronDown, Hand, Pencil, Redo2, Slash, Tag$1 as Tag, Undo2 } from "./lucide-icon-wraps.js";
import { CompositedSvg } from "./icon-compositing.js";
import { NodeToolbar, useStore } from "../vendor-fork/xyflow/react/index.js";
import { Position } from "../vendor-fork/xyflow/system/index.js";
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
const ArrowFilledIcon = reactExports.forwardRef(function ArrowFilledIconSvg(
  { size = 16, ...rest },
  ref,
) {
  return (
    <CompositedSvg
      ref={ref}
      {...rest}
      width={size}
      height={size}
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
const MosaicIcon = reactExports.forwardRef(function MosaicIconSvg(
  { size = 16, strokeWidth = 1.8, ...rest },
  ref,
) {
  return (
    <CompositedSvg
      ref={ref}
      {...rest}
      width={size}
      height={size}
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
function PlainTextIcon({ size = 16 }) {
  return (
    <CompositedSvg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M3 3h10v2.2h-1.05v-1.1H8.7V12h1.2v1.1H6.1V12h1.2V4.1H4.05V5.2H3z" />
    </CompositedSvg>
  );
}
function FilledTextIcon({ size = 16 }) {
  return (
    <CompositedSvg
      width={size}
      height={size}
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
function OutlinedTextIcon({ size = 16 }) {
  return (
    <CompositedSvg
      width={size}
      height={size}
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
const zoomSelector = (state) => state.transform[2];
function ToolbarIconButton({
  title,
  active = false,
  disabled = false,
  onClick,
  children,
  dataToolId,
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      data-tool-id={dataToolId}
      data-content="icon"
      className="canvas-toolbar-action"
    >
      {children}
    </button>
  );
}
function Divider() {
  return <div className="canvas-toolbar-separator" aria-hidden="true" />;
}
function isLightColor(hex) {
  const colorHex = hex.replace("#", "");
  if (colorHex.length !== 6) return false;
  const redChannel = Number.parseInt(colorHex.slice(0, 2), 16);
  const greenChannel = Number.parseInt(colorHex.slice(2, 4), 16);
  const blueChannel = Number.parseInt(colorHex.slice(4, 6), 16);
  return (redChannel * 299 + greenChannel * 587 + blueChannel * 114) / 1e3 > 165;
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
  const { t } = useTranslation();
  const zoom = useStore(zoomSelector);
  const offset = HEADER_FLOW_HEIGHT * zoom + TOOLBAR_GAP;
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
    const onDown = (mouseEvent) => {
      const eventTarget = mouseEvent.target;
      if (!eventTarget) return;
      if (fontSizeMenuRef.current?.contains(eventTarget)) return;
      if (fontSizeBtnRef.current?.contains(eventTarget)) return;
      setFontSizeOpen(false);
    };
    const onKey = (keyboardEvent) => {
      if (keyboardEvent.key === "Escape") setFontSizeOpen(false);
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
    const onDown = (mouseEvent) => {
      const eventTarget = mouseEvent.target;
      if (!eventTarget) return;
      if (brushSizeMenuRef.current?.contains(eventTarget)) return;
      if (brushSizeBtnRef.current?.contains(eventTarget)) return;
      setBrushSizeOpen(false);
    };
    const onKey = (keyboardEvent) => {
      if (keyboardEvent.key === "Escape") setBrushSizeOpen(false);
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
    const toolbarElement = mainBarRef.current;
    if (!wrapper || !popover || !toolbarElement) return;
    const toolButton = toolbarElement.querySelector(`[data-tool-id="${activeTool}"]`);
    if (!toolButton) return;
    const wrapperRect = wrapper.getBoundingClientRect();
    const btnRect = toolButton.getBoundingClientRect();
    const btnCenter = btnRect.left - wrapperRect.left + btnRect.width / 2;
    setPopoverLeft(btnCenter - popover.offsetWidth / 2);
  }, [
    activeTool,
    showStylePopover,
    visible,
    zoom,
    activeFontSize,
    activeMosaicMode,
    activeMosaicShape,
  ]);
  return (
    <NodeToolbar
      isVisible={visible}
      position={Position.Top}
      offset={offset}
      align="center"
    >
      <div
        ref={wrapperRef}
        className="relative inline-flex flex-col select-none animate-[toolbar-fade-in_0.15s_ease-out]"
        onPointerDown={(pointerEvent) => pointerEvent.stopPropagation()}
        onWheel={(wheelEvent) => wheelEvent.stopPropagation()}
        onContextMenu={(contextMenuEvent) => contextMenuEvent.stopPropagation()}
      >
        <div
          ref={mainBarRef}
          className="canvas-toolbar-surface"
          data-canvas-toolbar="true"
          data-density="compact"
        >
          <div className="flex items-center gap-0.5">
            {TOOLS.map((tool) => {
              const active = activeTool === tool.id;
              return (
                <ToolbarIconButton
                  key={tool.id}
                  dataToolId={tool.id}
                  title={t(tool.i18nKey, tool.defaultLabel)}
                  active={active}
                  onClick={() => onSelectTool(tool.id)}
                >
                  <tool.Icon size={TOOL_ICON_SIZE} strokeWidth={2} />
                </ToolbarIconButton>
              );
            })}
          </div>
          <Divider />
          <div className="flex items-center gap-0.5">
            <ToolbarIconButton
              title={t("imageEdit.undo")}
              disabled={!canUndo}
              onClick={onUndo}
            >
              <Undo2 size={ACTION_ICON_SIZE} strokeWidth={2} />
            </ToolbarIconButton>
            <ToolbarIconButton
              title={t("imageEdit.redo")}
              disabled={!canRedo}
              onClick={onRedo}
            >
              <Redo2 size={ACTION_ICON_SIZE} strokeWidth={2} />
            </ToolbarIconButton>
            <ToolbarIconButton
              title={t("imageEdit.clear")}
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
            aria-label={t("common.cancel")}
            title={t("common.cancel")}
          >
            <CloseIcon />
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="canvas-toolbar-action"
            aria-label={
              saving ? t("imageEdit.saving") : t("imageEdit.saveToCanvas")
            }
            title={
              saving ? t("imageEdit.saving") : t("imageEdit.saveToCanvas")
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
                  {TEXT_VARIANTS.map((textVariant) => {
                    const active = activeTextVariant === textVariant.id;
                    return (
                      <ToolbarIconButton
                        key={textVariant.id}
                        title={t(textVariant.i18nKey, textVariant.defaultLabel)}
                        active={active}
                        onClick={() => onSelectTextVariant(textVariant.id)}
                      >
                        <textVariant.Icon size={16} />
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
                  title={t("imageEdit.fontSize")}
                  aria-haspopup="listbox"
                  aria-expanded={fontSizeOpen}
                  onClick={() => setFontSizeOpen((isOpen) => !isOpen)}
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
                    {FONT_SIZES.map((size) => {
                      const active = activeFontSize === size;
                      return (
                        <button
                          key={size}
                          type="button"
                          role="option"
                          aria-selected={active}
                          onClick={() => {
                            onSelectFontSize(size);
                            setFontSizeOpen(false);
                          }}
                          className="canvas-toolbar-action"
                        >
                          <span>{size}pt</span>
                          {active && (
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
                  const active = activeStrokeWidth === value;
                  return (
                    <ToolbarIconButton
                      key={value}
                      title={`${t("imageEdit.strokeWidth")} ${value}`}
                      onClick={() => onSelectStrokeWidth(value)}
                      active={active}
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
                    title={t("imageEdit.mosaicModeMosaic")}
                    active={activeMosaicMode === "mosaic"}
                    onClick={() => onSelectMosaicMode("mosaic")}
                  >
                    <MosaicIcon size={TOOL_ICON_SIZE} strokeWidth={1.75} />
                  </ToolbarIconButton>
                  <ToolbarIconButton
                    title={t("imageEdit.mosaicModeBlur")}
                    active={activeMosaicMode === "blur"}
                    onClick={() => onSelectMosaicMode("blur")}
                  >
                    <Droplet size={TOOL_ICON_SIZE} strokeWidth={2} />
                  </ToolbarIconButton>
                </div>
                <Divider />
                <div className="flex items-center gap-0.5">
                  <ToolbarIconButton
                    title={t("imageEdit.mosaicShapeBrush")}
                    active={activeMosaicShape === "brush"}
                    onClick={() => onSelectMosaicShape("brush")}
                  >
                    <Hand size={TOOL_ICON_SIZE} strokeWidth={2} />
                  </ToolbarIconButton>
                  <div className="relative flex items-center">
                    <button
                      ref={brushSizeBtnRef}
                      type="button"
                      title={t("imageEdit.mosaicBrushSize")}
                      aria-haspopup="listbox"
                      aria-expanded={brushSizeOpen}
                      onClick={() => setBrushSizeOpen((isOpen) => !isOpen)}
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
                        aria-label={t("imageEdit.mosaicBrushSize")}
                        className="absolute left-1/2 bottom-full z-10 mb-2 flex -translate-x-1/2 flex-col items-center gap-1 canvas-toolbar-menu p-2 animate-[toolbar-fade-in_0.12s_ease-out]"
                        data-density="compact"
                      >
                        {MOSAIC_BRUSH_SIZES.map(({ value, dotPx }) => {
                          const active = activeMosaicBrushSize === value;
                          return (
                            <button
                              key={value}
                              type="button"
                              role="option"
                              aria-selected={active}
                              title={`${t("imageEdit.mosaicBrushSize")} ${value}`}
                              aria-label={`${t("imageEdit.mosaicBrushSize")} ${value}`}
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
                    title={t("imageEdit.mosaicShapeRect")}
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
                      ? t("imageEdit.mosaicStrengthBlur")
                      : t("imageEdit.mosaicStrengthMosaic")}
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={activeMosaicStrength}
                    onChange={(changeEvent) => {
                      const percent = Number(changeEvent.currentTarget.value);
                      onSelectMosaicStrength(
                        percent,
                        strengthPercentToPx(percent, activeMosaicMode),
                      );
                    }}
                    aria-label={t("imageEdit.mosaicStrength")}
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
                  {COLORS.map((color) => {
                    const active =
                      activeColor.toLowerCase() === color.toLowerCase();
                    const checkColor = isLightColor(color)
                      ? "#1C1C1E"
                      : "#FFFFFF";
                    return (
                      <button
                        key={color}
                        type="button"
                        title={color}
                        aria-label={color}
                        aria-pressed={active}
                        onClick={() => onSelectColor(color)}
                        className="inline-flex size-5 items-center justify-center rounded-[4px] border border-black/10 transition-transform hover:scale-110"
                        style={{
                          backgroundColor: color,
                        }}
                      >
                        {active && (
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
