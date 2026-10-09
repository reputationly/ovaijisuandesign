// banana-resolution-picker.jsx
import { __jsx } from "../shared/jsx-runtime.js";
import { reactExports, useTranslation } from "../vendor.js";
import {
  CloseIcon$1,
  RedoIcon$1,
  UndoIcon$1,
} from "../canvas/file-missing-icon.jsx";
import { selectionToNormalizedBBox } from "./selection-to-normalized-b-box.js";

export function selectionsToNormalizedBBoxes(rects) {
  return rects
    .map(selectionToNormalizedBBox)
    .filter((bbox) => bbox.x1 < bbox.x2 && bbox.y1 < bbox.y2);
}

const DEFAULT_OPTIONS = ["1K", "2K", "4K"];

export const BananaResolutionPicker = reactExports.memo(
  function BananaResolutionPicker2({
    value,
    onChange,
    disabled: disabled2,
    options = DEFAULT_OPTIONS,
  }) {
    const handleSelect = reactExports.useCallback(
      (option2) => {
        if (disabled2) return;
        if (option2 === value) return;
        onChange(option2);
      },
      [disabled2, onChange, value],
    );
    return (
      <div
        className="flex h-7 items-center gap-0.5 rounded-md p-0.5"
        style={{
          opacity: disabled2 ? 0.5 : 1,
        }}
        onPointerDown={(e2) => e2.stopPropagation()}
      >
        {options.map((option2) => {
          const active2 = option2 === value;
          return (
            <button
              key={option2}
              type="button"
              disabled={disabled2}
              onClick={() => handleSelect(option2)}
              className="h-6 rounded-md px-2.5 text-[13px] transition-colors duration-150"
              style={{
                background: active2
                  ? "var(--canvas-controls-active, #ffffff26)"
                  : "transparent",
                color: active2
                  ? "var(--canvas-controls-text, #fff)"
                  : "var(--canvas-controls-text-muted, #ffffff8c)",
                cursor: disabled2 ? "not-allowed" : "pointer",
              }}
              onMouseEnter={(e2) => {
                if (active2 || disabled2) return;
                e2.currentTarget.style.background =
                  "var(--canvas-controls-active, #ffffff14)";
              }}
              onMouseLeave={(e2) => {
                if (active2 || disabled2) return;
                e2.currentTarget.style.background = "transparent";
              }}
            >
              {option2}
            </button>
          );
        })}
      </div>
    );
  },
);

function IconButton$2({
  disabled: disabled2,
  onClick,
  title,
  children: children2,
}) {
  return (
    <button
      type="button"
      disabled={disabled2}
      onClick={onClick}
      title={title}
      aria-label={title}
      className="canvas-toolbar-action"
    >
      {children2}
    </button>
  );
}

function Divider$1() {
  return <div className="canvas-toolbar-separator" aria-hidden="true" />;
}

export const CanvasEraseTopBar = reactExports.memo(function CanvasEraseTopBar2({
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
  const { t: t2 } = useTranslation();
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: stops propagation so toolbar events don't reach the canvas pan/zoom handlers
    <div
      className="canvas-toolbar-surface"
      onPointerDown={(e2) => e2.stopPropagation()}
      onWheel={(e2) => e2.stopPropagation()}
      onContextMenu={(e2) => e2.stopPropagation()}
      data-canvas-toolbar="true"
      data-density="compact"
    >
      <IconButton$2
        disabled={false}
        onClick={onClose}
        title={t2("canvas.close")}
      >
        <CloseIcon$1 />
      </IconButton$2>
      <Divider$1 />
      <IconButton$2
        disabled={!hasStrokes}
        onClick={onUndo}
        title={t2("canvas.eraseUndo")}
      >
        <UndoIcon$1 />
      </IconButton$2>
      <IconButton$2
        disabled={!canRedo}
        onClick={onRedo}
        title={t2("canvas.eraseRedo")}
      >
        <RedoIcon$1 />
      </IconButton$2>
    </div>
  );
});

export const BAR_GAP$2 = 16;

export const BAR_HEIGHT$1 = 40;

export const BAR_MIN_WIDTH = 360;
