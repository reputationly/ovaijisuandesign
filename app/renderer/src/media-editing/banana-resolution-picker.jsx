// banana-resolution-picker.jsx
import { __jsx } from "../shared/jsx-runtime.js";
import { reactExports, useTranslation } from "../vendor.js";
import { CloseIcon, RedoIcon, UndoIcon } from "../canvas/file-missing-icon.jsx";
import { selectionToNormalizedBBox } from "./selection-to-normalized-b-box.js";
export function selectionsToNormalizedBBoxes(rects) {
  return rects
    .map(selectionToNormalizedBBox)
    .filter((bbox) => bbox.x1 < bbox.x2 && bbox.y1 < bbox.y2);
}
const DEFAULT_OPTIONS = ["1K", "2K", "4K"];
export const BananaResolutionPicker = reactExports.memo(
  function BananaResolutionPicker({
    value,
    onChange,
    disabled,
    options = DEFAULT_OPTIONS,
  }) {
    const handleSelect = reactExports.useCallback(
      (option) => {
        if (disabled) return;
        if (option === value) return;
        onChange(option);
      },
      [disabled, onChange, value],
    );
    return (
      <div
        className="flex h-7 items-center gap-0.5 rounded-md p-0.5"
        style={{
          opacity: disabled ? 0.5 : 1,
        }}
        onPointerDown={(pointerEvent) => pointerEvent.stopPropagation()}
      >
        {options.map((option) => {
          const active = option === value;
          return (
            <button
              key={option}
              type="button"
              disabled={disabled}
              onClick={() => handleSelect(option)}
              className="h-6 rounded-md px-2.5 text-[13px] transition-colors duration-150"
              style={{
                background: active
                  ? "var(--canvas-controls-active, #ffffff26)"
                  : "transparent",
                color: active
                  ? "var(--canvas-controls-text, #fff)"
                  : "var(--canvas-controls-text-muted, #ffffff8c)",
                cursor: disabled ? "not-allowed" : "pointer",
              }}
              onMouseEnter={(mouseEnterEvent) => {
                if (active || disabled) return;
                mouseEnterEvent.currentTarget.style.background =
                  "var(--canvas-controls-active, #ffffff14)";
              }}
              onMouseLeave={(mouseLeaveEvent) => {
                if (active || disabled) return;
                mouseLeaveEvent.currentTarget.style.background = "transparent";
              }}
            >
              {option}
            </button>
          );
        })}
      </div>
    );
  },
);
function IconButton({
  disabled,
  onClick,
  title,
  children,
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={title}
      aria-label={title}
      className="canvas-toolbar-action"
    >
      {children}
    </button>
  );
}
function Divider() {
  return <div className="canvas-toolbar-separator" aria-hidden="true" />;
}
export const CanvasEraseTopBar = reactExports.memo(function CanvasEraseTopBar({
  tool: _tool,
  onToolChange: _onToolChange,
  brushSize: _brushSize,
  onBrushSizeChange: _onBrushSizeChange,
  hasStrokes,
  canRedo,
  onUndo,
  onRedo,
  onClose,
}) {
  const { t } = useTranslation();
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: stops propagation so toolbar events don't reach the canvas pan/zoom handlers
    <div
      className="canvas-toolbar-surface"
      onPointerDown={(pointerEvent) => pointerEvent.stopPropagation()}
      onWheel={(wheelEvent) => wheelEvent.stopPropagation()}
      onContextMenu={(contextMenuEvent) => contextMenuEvent.stopPropagation()}
      data-canvas-toolbar="true"
      data-density="compact"
    >
      <IconButton disabled={false} onClick={onClose} title={t("canvas.close")}>
        <CloseIcon />
      </IconButton>
      <Divider />
      <IconButton
        disabled={!hasStrokes}
        onClick={onUndo}
        title={t("canvas.eraseUndo")}
      >
        <UndoIcon />
      </IconButton>
      <IconButton
        disabled={!canRedo}
        onClick={onRedo}
        title={t("canvas.eraseRedo")}
      >
        <RedoIcon />
      </IconButton>
    </div>
  );
});
export const BAR_GAP = 16;
export const BAR_HEIGHT = 40;
export const BAR_MIN_WIDTH = 360;
