// canvas-crop-overlay.jsx
import { jsxRuntimeExports, useTranslation, reactExports, useStore$3 } from "../vendor.js";
import { useCanvasBridge } from "./parse-item.jsx";
import { useCropViewportZoom, useCropState } from "../canvas/use-file-bytes.js";
import { selectionToNormalizedBBox, useImageErase, useImageMaskPainter } from "./use-image-mask-painter.js";
import { useEraseState } from "./use-multi-image-actions.js";
import { cropImageToBlob$1 } from "./base-backend.jsx";
import {
  CloseIcon$1,
  DropdownArrowIcon,
  SendArrowIcon,
  UndoIcon$1,
  RedoIcon$1,
} from "../canvas/generating-media-area.jsx";
import { CreditCostBadge } from "../generation/create-tracker.jsx";
import { useImageEditCost } from "./calc-crop-rect.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  ASPECT_OPTIONS$1,
  EDGE_HANDLE_THRESHOLD$1,
  useImageCrop$1,
} from "../canvas/edge-interaction-layer.jsx";
export const CanvasCropOverlay = reactExports.memo(function CanvasCropOverlay2() {
  const { meta: meta2, cancelCrop, croppingNodeId } = useCropState();
  const { onNodeAction } = useCanvasBridge();
  const { t: t2 } = useTranslation();
  const enterTimeRef = reactExports.useRef(Date.now());
  const appliedRef = reactExports.useRef(false);
  useCropViewportZoom(meta2);
  const transform2 = useStore$3((s2) => s2.transform);
  const [vpX, vpY, vpZoom] = transform2;
  const [confirming, setConfirming] = reactExports.useState(false);
  const [showAspectMenu, setShowAspectMenu] = reactExports.useState(false);
  const panelPos = reactExports.useMemo(() => {
    if (!meta2) return null;
    return {
      x: meta2.nodeFlowX * vpZoom + vpX,
      y: meta2.nodeFlowY * vpZoom + vpY,
      w: meta2.nodeWidth * vpZoom,
      h: meta2.nodeHeight * vpZoom,
    };
  }, [meta2, vpX, vpY, vpZoom]);
  const panelW = panelPos?.w ?? 0;
  const panelH = panelPos?.h ?? 0;
  const { cropRect, aspectRatio, isDragging, handlePointerDown, setAspectRatio } = useImageCrop$1(
    panelW,
    panelH,
  );
  reactExports.useEffect(() => {
    if (!showAspectMenu) return;
    const close2 = () => setShowAspectMenu(false);
    document.addEventListener("pointerdown", close2);
    return () => document.removeEventListener("pointerdown", close2);
  }, [showAspectMenu]);
  const trackedCancelCrop = reactExports.useCallback(() => {
    if (onNodeAction && croppingNodeId && !appliedRef.current) {
      try {
        onNodeAction({
          nodeId: croppingNodeId,
          nodeType: "image",
          action: "crop",
          phase: "abandon",
          interaction: "opens_mode",
          durationMs: Date.now() - enterTimeRef.current,
          hadProgress:
            aspectRatio !== "free" ||
            cropRect.x !== 0 ||
            cropRect.y !== 0 ||
            cropRect.width !== 1 ||
            cropRect.height !== 1,
        });
      } catch {}
    }
    cancelCrop();
  }, [onNodeAction, croppingNodeId, aspectRatio, cropRect, cancelCrop]);
  reactExports.useEffect(() => {
    const handleKey = (e2) => {
      if (e2.key === "Escape") {
        e2.stopPropagation();
        trackedCancelCrop();
      }
    };
    document.addEventListener("keydown", handleKey, true);
    return () => document.removeEventListener("keydown", handleKey, true);
  }, [trackedCancelCrop]);
  const handleConfirm = reactExports.useCallback(async () => {
    if (confirming || !meta2) return;
    setConfirming(true);
    appliedRef.current = true;
    if (onNodeAction && croppingNodeId) {
      try {
        onNodeAction({
          nodeId: croppingNodeId,
          nodeType: "image",
          action: "crop",
          phase: "apply",
          interaction: "opens_mode",
          durationMs: Date.now() - enterTimeRef.current,
          toolSpecific: {
            crop_ratio: aspectRatio,
            crop_rect: cropRect,
          },
        });
      } catch {}
    }
    try {
      const blob = await cropImageToBlob$1(
        meta2.src,
        cropRect,
        meta2.originalWidth,
        meta2.originalHeight,
      );
      await meta2.onConfirm(blob);
      cancelCrop();
    } catch {
      setConfirming(false);
    }
  }, [confirming, meta2, cropRect, cancelCrop, onNodeAction, croppingNodeId, aspectRatio]);
  const backdropPointerDown = reactExports.useRef(false);
  if (!meta2 || !panelPos) return null;
  const px = {
    x: cropRect.x * panelPos.w,
    y: cropRect.y * panelPos.h,
    w: cropRect.width * panelPos.w,
    h: cropRect.height * panelPos.h,
  };
  return (
    <div className="absolute inset-0 z-50 pointer-events-none animate-[crop-panel-in_0.2s_ease-out]">
      <div
        className="absolute inset-0 pointer-events-auto"
        onPointerDown={(e2) => {
          backdropPointerDown.current = e2.target === e2.currentTarget;
        }}
        onClick={(e2) => {
          if (e2.target === e2.currentTarget && backdropPointerDown.current) trackedCancelCrop();
          backdropPointerDown.current = false;
        }}
      />
      <div
        className="absolute flex flex-col items-center pointer-events-auto"
        style={{
          transform: `translate3d(${panelPos.x}px, ${panelPos.y}px, 0)`,
          width: panelPos.w,
          height: panelPos.h,
          top: 0,
          left: 0,
          willChange: "transform",
        }}
      >
        <div
          className="relative w-full h-full overflow-hidden select-none touch-none"
          style={{
            width: panelPos.w,
            height: panelPos.h,
          }}
        >
          <img
            src={meta2.src}
            alt=""
            className="pointer-events-none absolute left-0 top-0 h-full w-full object-fill"
            style={{
              filter: "brightness(0.5)",
            }}
            draggable={false}
          />
          <div
            className="absolute"
            style={{
              left: px.x,
              top: px.y,
              width: px.w,
              height: px.h,
              boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.5)",
            }}
          >
            <div className="absolute inset-0 overflow-hidden">
              <img
                src={meta2.src}
                alt=""
                className="absolute max-w-none"
                style={{
                  width: panelPos.w,
                  height: panelPos.h,
                  left: -px.x,
                  top: -px.y,
                }}
                draggable={false}
              />
            </div>
            <div className="pointer-events-none absolute inset-0 border border-white/50" />
            <div
              className="pointer-events-none absolute inset-0 transition-opacity duration-200"
              style={{
                opacity: isDragging ? 1 : 0,
              }}
            >
              <div className="absolute left-0 right-0 top-1/3 h-px bg-white/30" />
              <div className="absolute left-0 right-0 top-2/3 h-px bg-white/30" />
              <div className="absolute bottom-0 left-1/3 top-0 w-px bg-white/30" />
              <div className="absolute bottom-0 left-2/3 top-0 w-px bg-white/30" />
            </div>
            <CornerHandle$1 position="tl" onPointerDown={handlePointerDown} />
            <CornerHandle$1 position="tr" onPointerDown={handlePointerDown} />
            <CornerHandle$1 position="bl" onPointerDown={handlePointerDown} />
            <CornerHandle$1 position="br" onPointerDown={handlePointerDown} />
            {px.w > EDGE_HANDLE_THRESHOLD$1 && (
              <>
                <EdgeHandle$1 position="t" onPointerDown={handlePointerDown} />
                <EdgeHandle$1 position="b" onPointerDown={handlePointerDown} />
              </>
            )}
            {px.h > EDGE_HANDLE_THRESHOLD$1 && (
              <>
                <EdgeHandle$1 position="l" onPointerDown={handlePointerDown} />
                <EdgeHandle$1 position="r" onPointerDown={handlePointerDown} />
              </>
            )}
            <div
              className="absolute inset-0 cursor-move"
              onPointerDown={(e2) => handlePointerDown(e2, null)}
            />
          </div>
        </div>
        <div className="absolute left-1/2 top-full z-50 mt-4 w-max -translate-x-1/2">
          <div className="canvas-toolbar-surface" data-canvas-toolbar="true" data-density="compact">
            <ToolbarButton$1 onClick={trackedCancelCrop} title={t2("common.close")}>
              <CloseIcon$1 />
            </ToolbarButton$1>
            <Divider$2 />
            <div className="relative">
              <ToolbarButton$1
                onClick={(e2) => {
                  e2.stopPropagation();
                  setShowAspectMenu((v2) => !v2);
                }}
                title={t2("canvas.aspectRatio")}
              >
                <span className="canvas-toolbar-label whitespace-nowrap">
                  {aspectRatio === "free" ? t2("canvas.freeAspect") : aspectRatio}
                </span>
                <DropdownArrowIcon />
              </ToolbarButton$1>
              {showAspectMenu && (
                <div
                  className="canvas-toolbar-menu absolute bottom-full left-1/2 mb-2 -translate-x-1/2 p-1"
                  onPointerDown={(e2) => e2.stopPropagation()}
                >
                  {ASPECT_OPTIONS$1.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className="canvas-toolbar-menu-item flex w-full items-center px-3 py-2 whitespace-nowrap"
                      onClick={() => {
                        setAspectRatio(opt.value);
                        setShowAspectMenu(false);
                      }}
                      data-active={aspectRatio === opt.value || void 0}
                    >
                      {opt.value === "free" ? t2("canvas.freeAspect") : opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Divider$2 />
            <button
              type="button"
              disabled={confirming}
              onClick={handleConfirm}
              className="canvas-toolbar-action"
              aria-label={confirming ? t2("canvas.cropping") : t2("common.confirm")}
              title={confirming ? t2("canvas.cropping") : t2("common.confirm")}
              data-variant="primary"
            >
              <SendArrowIcon />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});
function ToolbarButton$1({ children: children2, onClick, title }) {
  return (
    <button type="button" title={title} onClick={onClick} className="canvas-toolbar-action">
      {children2}
    </button>
  );
}
function Divider$2() {
  return <div className="canvas-toolbar-separator" aria-hidden="true" />;
}
const CORNER_CLASSES$1 = {
  tl: "absolute -left-[2px] -top-[2px] h-6 w-6 cursor-nw-resize z-10",
  tr: "absolute -right-[2px] -top-[2px] h-6 w-6 cursor-ne-resize z-10",
  bl: "absolute -bottom-[2px] -left-[2px] h-6 w-6 cursor-sw-resize z-10",
  br: "absolute -bottom-[2px] -right-[2px] h-6 w-6 cursor-se-resize z-10",
};
const CORNER_LINES$1 = {
  tl: [
    "absolute left-0 top-0 h-[3px] w-full bg-white",
    "absolute left-0 top-0 h-full w-[3px] bg-white",
  ],
  tr: [
    "absolute right-0 top-0 h-[3px] w-full bg-white",
    "absolute right-0 top-0 h-full w-[3px] bg-white",
  ],
  bl: [
    "absolute bottom-0 left-0 h-[3px] w-full bg-white",
    "absolute bottom-0 left-0 h-full w-[3px] bg-white",
  ],
  br: [
    "absolute bottom-0 right-0 h-[3px] w-full bg-white",
    "absolute bottom-0 right-0 h-full w-[3px] bg-white",
  ],
};
function CornerHandle$1({ position: position2, onPointerDown: onPointerDown2 }) {
  const [lineA, lineB] = CORNER_LINES$1[position2];
  return (
    <div
      className={CORNER_CLASSES$1[position2]}
      onPointerDown={(e2) => onPointerDown2(e2, position2)}
    >
      <div className={lineA} />
      <div className={lineB} />
    </div>
  );
}
const EDGE_CLASSES$1 = {
  t: "absolute -top-[2px] left-6 right-6 h-[12px] -mt-[5px] cursor-n-resize z-10 flex items-center justify-center",
  b: "absolute -bottom-[2px] left-6 right-6 h-[12px] -mb-[5px] cursor-s-resize z-10 flex items-center justify-center",
  l: "absolute -left-[2px] top-6 bottom-6 w-[12px] -ml-[5px] cursor-w-resize z-10 flex items-center justify-center",
  r: "absolute -right-[2px] top-6 bottom-6 w-[12px] -mr-[5px] cursor-e-resize z-10 flex items-center justify-center",
};
const EDGE_BAR_CLASSES$1 = {
  t: "h-[3px] w-8 rounded-full bg-white",
  b: "h-[3px] w-8 rounded-full bg-white",
  l: "h-8 w-[3px] rounded-full bg-white",
  r: "h-8 w-[3px] rounded-full bg-white",
};
function EdgeHandle$1({ position: position2, onPointerDown: onPointerDown2 }) {
  return (
    <div
      className={EDGE_CLASSES$1[position2]}
      onPointerDown={(e2) => onPointerDown2(e2, position2)}
    >
      <div className={EDGE_BAR_CLASSES$1[position2]} />
    </div>
  );
}
function selectionsToNormalizedBBoxes(rects) {
  return rects
    .map(selectionToNormalizedBBox)
    .filter((bbox) => bbox.x1 < bbox.x2 && bbox.y1 < bbox.y2);
}
const DEFAULT_OPTIONS = ["1K", "2K", "4K"];
export const BananaResolutionPicker = reactExports.memo(function BananaResolutionPicker2({
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
              background: active2 ? "var(--canvas-controls-active, #ffffff26)" : "transparent",
              color: active2
                ? "var(--canvas-controls-text, #fff)"
                : "var(--canvas-controls-text-muted, #ffffff8c)",
              cursor: disabled2 ? "not-allowed" : "pointer",
            }}
            onMouseEnter={(e2) => {
              if (active2 || disabled2) return;
              e2.currentTarget.style.background = "var(--canvas-controls-active, #ffffff14)";
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
});
const ERASE_RESOLUTIONS = ["1K", "2K"];
const ERASE_REF_COUNT = 1;
const CanvasEraseBottomBar = reactExports.memo(function CanvasEraseBottomBar2({
  onCancel,
  onConfirm,
  confirming,
  canConfirm,
  resolution,
  onResolutionChange,
}) {
  const { t: t2 } = useTranslation();
  const creditCost = useImageEditCost("erase", resolution, void 0, ERASE_REF_COUNT);
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: stops propagation so bar events don't reach the canvas pan/zoom handlers
    <div
      className="flex h-10 items-center gap-2 rounded-lg border p-1"
      style={{
        background: "var(--canvas-controls-bg, #262626)",
        borderColor: "var(--canvas-controls-border, #363636)",
        boxShadow: "var(--canvas-shadow-dropdown)",
      }}
      onPointerDown={(e2) => e2.stopPropagation()}
      onWheel={(e2) => e2.stopPropagation()}
      onContextMenu={(e2) => e2.stopPropagation()}
    >
      <div className="flex items-center gap-16">
        <button
          type="button"
          onClick={onCancel}
          className="flex size-8 items-center justify-center rounded-md transition-colors duration-150"
          aria-label={t2("common.cancel")}
          title={t2("common.cancel")}
          style={{
            color: "var(--canvas-controls-text, #fff)",
            background: "transparent",
            opacity: 0.7,
          }}
          onMouseEnter={(e2) => {
            e2.currentTarget.style.opacity = "1";
          }}
          onMouseLeave={(e2) => {
            e2.currentTarget.style.opacity = "0.7";
          }}
        >
          <CloseIcon$1 />
        </button>
        <BananaResolutionPicker
          value={resolution}
          onChange={onResolutionChange}
          disabled={confirming}
          options={ERASE_RESOLUTIONS}
        />
      </div>
      <div className="flex items-center gap-2">
        {!confirming && <CreditCostBadge cost={creditCost} compact={true} />}
        <button
          type="button"
          disabled={!canConfirm || confirming}
          onClick={onConfirm}
          className="inline-flex size-8 items-center justify-center rounded-md transition-colors duration-150 disabled:opacity-50"
          aria-label={confirming ? t2("canvas.erasing") : t2("canvas.eraseApply")}
          title={confirming ? t2("canvas.erasing") : t2("canvas.eraseApply")}
          style={{
            background: "var(--canvas-primary-btn-bg, #000000d9)",
            color: "var(--canvas-primary-btn-icon, #fff)",
          }}
          onMouseEnter={(e2) => {
            if (confirming || !canConfirm) return;
            e2.currentTarget.style.opacity = "0.9";
          }}
          onMouseLeave={(e2) => {
            e2.currentTarget.style.opacity = "1";
          }}
        >
          <SendArrowIcon />
        </button>
      </div>
    </div>
  );
});
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
      <IconButton$2 disabled={false} onClick={onClose} title={t2("canvas.close")}>
        <CloseIcon$1 />
      </IconButton$2>
      <Divider$1 />
      <IconButton$2 disabled={!hasStrokes} onClick={onUndo} title={t2("canvas.eraseUndo")}>
        <UndoIcon$1 />
      </IconButton$2>
      <IconButton$2 disabled={!canRedo} onClick={onRedo} title={t2("canvas.eraseRedo")}>
        <RedoIcon$1 />
      </IconButton$2>
    </div>
  );
});
function IconButton$2({ disabled: disabled2, onClick, title, children: children2 }) {
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
const BAR_GAP$2 = 16;
const BAR_HEIGHT$1 = 40;
const BAR_MIN_WIDTH = 360;
export const CanvasEraseOverlay = reactExports.memo(function CanvasEraseOverlay2() {
  const { meta: meta2, cancelErase, erasingNodeId } = useEraseState();
  const { onNodeAction } = useCanvasBridge();
  const enterTimeRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (erasingNodeId) {
      enterTimeRef.current = Date.now();
    } else {
      enterTimeRef.current = null;
    }
  }, [erasingNodeId]);
  useCropViewportZoom(meta2);
  const transform2 = useStore$3((s2) => s2.transform);
  const [vpX, vpY, vpZoom] = transform2;
  const [confirming, setConfirming] = reactExports.useState(false);
  const [resolution, setResolution] = reactExports.useState("2K");
  const eraseApi = useImageErase();
  const {
    selections,
    brushSize,
    setBrushSize,
    tool: tool2,
    setTool,
    undoStroke,
    redoStroke,
    hasStrokes,
    canRedo,
  } = eraseApi;
  const imagePos = reactExports.useMemo(() => {
    if (!meta2) return null;
    return {
      x: meta2.nodeFlowX * vpZoom + vpX,
      y: meta2.nodeFlowY * vpZoom + vpY,
      w: meta2.nodeWidth * vpZoom,
      h: meta2.nodeHeight * vpZoom,
    };
  }, [meta2, vpX, vpY, vpZoom]);
  const trackedCancelErase = reactExports.useCallback(() => {
    if (onNodeAction && erasingNodeId && !confirming) {
      const durationMs = enterTimeRef.current ? Date.now() - enterTimeRef.current : void 0;
      try {
        onNodeAction({
          nodeId: erasingNodeId,
          nodeType: "image",
          action: "erase",
          phase: "abandon",
          interaction: "opens_mode",
          durationMs,
          hadProgress: selections.length > 0,
        });
      } catch {}
    }
    cancelErase();
  }, [onNodeAction, erasingNodeId, confirming, selections.length, cancelErase]);
  const {
    paintRectRef,
    maskCanvasRef,
    paintRectHandlers,
    backdropHandlers,
    cursorStyle,
    maskOverlayOpacity,
  } = useImageMaskPainter({
    meta: meta2,
    imagePos,
    onCancel: trackedCancelErase,
    toolApi: eraseApi,
  });
  const handleConfirm = reactExports.useCallback(() => {
    if (confirming || !meta2 || selections.length === 0) return;
    const bboxes = selectionsToNormalizedBBoxes(selections);
    if (bboxes.length === 0) {
      trackedCancelErase();
      return;
    }
    setConfirming(true);
    if (onNodeAction && erasingNodeId) {
      const durationMs = enterTimeRef.current ? Date.now() - enterTimeRef.current : void 0;
      try {
        onNodeAction({
          nodeId: erasingNodeId,
          nodeType: "image",
          action: "erase",
          phase: "apply",
          interaction: "opens_mode",
          durationMs,
          toolSpecific: {
            resolution,
            regionCount: bboxes.length,
          },
        });
      } catch {}
    }
    const { onConfirm, originalWidth, originalHeight } = meta2;
    void onConfirm({
      bboxes,
      aspectRatio:
        originalWidth > 0 && originalHeight > 0 ? originalWidth / originalHeight : void 0,
      resolution,
    }).catch(() => {});
    cancelErase();
  }, [
    confirming,
    meta2,
    selections,
    resolution,
    cancelErase,
    trackedCancelErase,
    onNodeAction,
    erasingNodeId,
  ]);
  if (!meta2 || !imagePos) return null;
  const barContainerWidth = Math.max(imagePos.w, BAR_MIN_WIDTH);
  const barContainerLeft = imagePos.x + (imagePos.w - barContainerWidth) / 2;
  return (
    <div className="absolute inset-0 z-50 pointer-events-none animate-[crop-panel-in_0.2s_ease-out]">
      <div className="absolute inset-0 pointer-events-auto" {...backdropHandlers} />
      <div
        ref={paintRectRef}
        className="absolute pointer-events-auto select-none touch-none"
        style={{
          transform: `translate3d(${imagePos.x}px, ${imagePos.y}px, 0)`,
          width: imagePos.w,
          height: imagePos.h,
          top: 0,
          left: 0,
          willChange: "transform",
          ...cursorStyle,
        }}
        {...paintRectHandlers}
      >
        <canvas
          ref={maskCanvasRef}
          className="pointer-events-none absolute left-0 top-0"
          style={{
            opacity: maskOverlayOpacity,
          }}
        />
      </div>
      <div
        className="absolute pointer-events-auto flex justify-center"
        style={{
          transform: `translate3d(${barContainerLeft}px, ${imagePos.y - BAR_HEIGHT$1 - BAR_GAP$2}px, 0)`,
          width: barContainerWidth,
          height: BAR_HEIGHT$1,
          top: 0,
          left: 0,
          willChange: "transform",
        }}
      >
        <CanvasEraseTopBar
          tool={tool2}
          onToolChange={setTool}
          brushSize={brushSize}
          onBrushSizeChange={setBrushSize}
          hasStrokes={hasStrokes}
          canRedo={canRedo}
          onUndo={undoStroke}
          onRedo={redoStroke}
          onClose={trackedCancelErase}
        />
      </div>
      <div
        className="absolute pointer-events-auto flex justify-center"
        style={{
          transform: `translate3d(${barContainerLeft}px, ${imagePos.y + imagePos.h + BAR_GAP$2}px, 0)`,
          width: barContainerWidth,
          height: BAR_HEIGHT$1,
          top: 0,
          left: 0,
          willChange: "transform",
        }}
      >
        <CanvasEraseBottomBar
          onCancel={trackedCancelErase}
          onConfirm={handleConfirm}
          confirming={confirming}
          canConfirm={hasStrokes}
          resolution={resolution}
          onResolutionChange={setResolution}
        />
      </div>
    </div>
  );
});
