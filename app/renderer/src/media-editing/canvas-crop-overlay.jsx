// canvas-crop-overlay.jsx
import {
  jsxRuntimeExports,
  reactExports,
  useStore$3 as useStore,
  useTranslation,
} from "../vendor.js";
import { cropImageToBlob, cropRectForAspectRatio } from "./base-backend.jsx";
import { ASPECT_RATIOS, DEFAULT_CROP } from "./image-edit-pricing.js";
import { calcCropRect } from "./calc-crop-rect.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { useCanvasBridge } from "./package.jsx";
import { useCropViewportZoom } from "../canvas/use-crop-viewport-zoom.js";
import { useCropState } from "../canvas/use-start-crop-from-node.js";
import { CloseIcon, SendArrowIcon } from "../canvas/file-missing-icon.jsx";
import { DropdownArrowIcon } from "../canvas/generating-media-area.jsx";
function useImageCrop(containerWidth, containerHeight) {
  const [cropRect, setCropRect] = reactExports.useState(DEFAULT_CROP);
  const [aspectRatio, setAspectRatioState] = reactExports.useState("free");
  const [isDragging, setIsDragging] = reactExports.useState(false);
  const [activeHandle, setActiveHandle] = reactExports.useState(null);
  const dragRef = reactExports.useRef(null);
  const rafRef = reactExports.useRef(null);
  const latestRef = reactExports.useRef({
    containerWidth,
    containerHeight,
    aspectRatio,
  });
  latestRef.current = {
    containerWidth,
    containerHeight,
    aspectRatio,
  };
  const handleMove = reactExports.useCallback((pointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const {
      containerWidth: viewportWidth,
      containerHeight: viewportHeight,
      aspectRatio: selectedAspectRatio,
    } = latestRef.current;
    if (!viewportWidth || !viewportHeight) return;
    const deltaX = (pointerEvent.clientX - drag.startX) / viewportWidth;
    const deltaY = (pointerEvent.clientY - drag.startY) / viewportHeight;
    const numericRatio = ASPECT_RATIOS[selectedAspectRatio];
    const next = calcCropRect({
      initialRect: drag.initialRect,
      deltaX,
      deltaY,
      handle: drag.handle,
      aspectRatio: numericRatio,
      containerWidth: viewportWidth,
      containerHeight: viewportHeight,
    });
    setCropRect(next);
  }, []);
  reactExports.useEffect(() => {
    if (!isDragging) return;
    let pendingEvent = null;
    const onMove = (pointerEvent) => {
      if (pointerEvent.cancelable) pointerEvent.preventDefault();
      pendingEvent = pointerEvent;
      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null;
          if (pendingEvent) {
            handleMove(pendingEvent);
            pendingEvent = null;
          }
        });
      }
    };
    const onUp = () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (pendingEvent) {
        handleMove(pendingEvent);
        pendingEvent = null;
      }
      setIsDragging(false);
      setActiveHandle(null);
      dragRef.current = null;
    };
    window.addEventListener("pointermove", onMove, {
      passive: false,
    });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [isDragging, handleMove]);
  const handlePointerDown = reactExports.useCallback(
    (pointerEvent, handle = null) => {
      if (!pointerEvent.isPrimary) return;
      pointerEvent.stopPropagation();
      pointerEvent.preventDefault();
      dragRef.current = {
        startX: pointerEvent.clientX,
        startY: pointerEvent.clientY,
        initialRect: {
          ...cropRect,
        },
        handle,
      };
      setIsDragging(true);
      setActiveHandle(handle);
    },
    [cropRect],
  );
  const setAspectRatio = reactExports.useCallback((preset) => {
    setAspectRatioState(preset);
    const ratio = ASPECT_RATIOS[preset];
    const { containerWidth: viewportWidth, containerHeight: viewportHeight } = latestRef.current;
    setCropRect(cropRectForAspectRatio(ratio, viewportWidth, viewportHeight));
  }, []);
  const reset = reactExports.useCallback(() => {
    setAspectRatioState("free");
    setCropRect(DEFAULT_CROP);
  }, []);
  return {
    cropRect,
    aspectRatio,
    isDragging,
    activeHandle,
    handlePointerDown,
    setAspectRatio,
    setCropRect,
    reset,
  };
}
const EDGE_HANDLE_THRESHOLD = 80;
const ASPECT_OPTIONS = [
  {
    label: "free",
    value: "free",
  },
  {
    label: "1:1",
    value: "1:1",
  },
  {
    label: "4:3",
    value: "4:3",
  },
  {
    label: "3:4",
    value: "3:4",
  },
  {
    label: "16:9",
    value: "16:9",
  },
  {
    label: "9:16",
    value: "9:16",
  },
];
function ToolbarButton({ children, onClick, title }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="canvas-toolbar-action"
    >
      {children}
    </button>
  );
}
function Divider() {
  return <div className="canvas-toolbar-separator" aria-hidden="true" />;
}
const CORNER_CLASSES = {
  tl: "absolute -left-[2px] -top-[2px] h-6 w-6 cursor-nw-resize z-10",
  tr: "absolute -right-[2px] -top-[2px] h-6 w-6 cursor-ne-resize z-10",
  bl: "absolute -bottom-[2px] -left-[2px] h-6 w-6 cursor-sw-resize z-10",
  br: "absolute -bottom-[2px] -right-[2px] h-6 w-6 cursor-se-resize z-10",
};
const CORNER_LINES = {
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
function CornerHandle({ position, onPointerDown }) {
  const [lineA, lineB] = CORNER_LINES[position];
  return (
    <div
      className={CORNER_CLASSES[position]}
      onPointerDown={(pointerEvent) => onPointerDown(pointerEvent, position)}
    >
      <div className={lineA} />
      <div className={lineB} />
    </div>
  );
}
const EDGE_CLASSES = {
  t: "absolute -top-[2px] left-6 right-6 h-[12px] -mt-[5px] cursor-n-resize z-10 flex items-center justify-center",
  b: "absolute -bottom-[2px] left-6 right-6 h-[12px] -mb-[5px] cursor-s-resize z-10 flex items-center justify-center",
  l: "absolute -left-[2px] top-6 bottom-6 w-[12px] -ml-[5px] cursor-w-resize z-10 flex items-center justify-center",
  r: "absolute -right-[2px] top-6 bottom-6 w-[12px] -mr-[5px] cursor-e-resize z-10 flex items-center justify-center",
};
const EDGE_BAR_CLASSES = {
  t: "h-[3px] w-8 rounded-full bg-white",
  b: "h-[3px] w-8 rounded-full bg-white",
  l: "h-8 w-[3px] rounded-full bg-white",
  r: "h-8 w-[3px] rounded-full bg-white",
};
function EdgeHandle({ position, onPointerDown }) {
  return (
    <div
      className={EDGE_CLASSES[position]}
      onPointerDown={(pointerEvent) => onPointerDown(pointerEvent, position)}
    >
      <div className={EDGE_BAR_CLASSES[position]} />
    </div>
  );
}
export const CanvasCropOverlay = reactExports.memo(
  function CanvasCropOverlayView() {
    const { meta, cancelCrop, croppingNodeId } = useCropState();
    const { onNodeAction } = useCanvasBridge();
    const { t } = useTranslation();
    const enterTimeRef = reactExports.useRef(Date.now());
    const appliedRef = reactExports.useRef(false);
    useCropViewportZoom(meta);
    const transform = useStore((state) => state.transform);
    const [viewportOffsetX, viewportOffsetY, vpZoom] = transform;
    const [confirming, setConfirming] = reactExports.useState(false);
    const [showAspectMenu, setShowAspectMenu] = reactExports.useState(false);
    const panelPos = reactExports.useMemo(() => {
      if (!meta) return null;
      return {
        x: meta.nodeFlowX * vpZoom + viewportOffsetX,
        y: meta.nodeFlowY * vpZoom + viewportOffsetY,
        w: meta.nodeWidth * vpZoom,
        h: meta.nodeHeight * vpZoom,
      };
    }, [meta, viewportOffsetX, viewportOffsetY, vpZoom]);
    const panelW = panelPos?.w ?? 0;
    const panelH = panelPos?.h ?? 0;
    const {
      cropRect,
      aspectRatio,
      isDragging,
      handlePointerDown,
      setAspectRatio,
    } = useImageCrop(panelW, panelH);
    reactExports.useEffect(() => {
      if (!showAspectMenu) return;
      const closeAspectMenu = () => setShowAspectMenu(false);
      document.addEventListener("pointerdown", closeAspectMenu);
      return () => document.removeEventListener("pointerdown", closeAspectMenu);
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
      const handleKey = (keyboardEvent) => {
        if (keyboardEvent.key === "Escape") {
          keyboardEvent.stopPropagation();
          trackedCancelCrop();
        }
      };
      document.addEventListener("keydown", handleKey, true);
      return () => document.removeEventListener("keydown", handleKey, true);
    }, [trackedCancelCrop]);
    const handleConfirm = reactExports.useCallback(async () => {
      if (confirming || !meta) return;
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
        const blob = await cropImageToBlob(
          meta.src,
          cropRect,
          meta.originalWidth,
          meta.originalHeight,
        );
        await meta.onConfirm(blob);
        cancelCrop();
      } catch {
        setConfirming(false);
      }
    }, [
      confirming,
      meta,
      cropRect,
      cancelCrop,
      onNodeAction,
      croppingNodeId,
      aspectRatio,
    ]);
    const backdropPointerDown = reactExports.useRef(false);
    if (!meta || !panelPos) return null;
    const cropPixelRect = {
      x: cropRect.x * panelPos.w,
      y: cropRect.y * panelPos.h,
      w: cropRect.width * panelPos.w,
      h: cropRect.height * panelPos.h,
    };
    return (
      <div className="absolute inset-0 z-50 pointer-events-none animate-[crop-panel-in_0.2s_ease-out]">
        <div
          className="absolute inset-0 pointer-events-auto"
          onPointerDown={(pointerEvent) => {
            backdropPointerDown.current = pointerEvent.target === pointerEvent.currentTarget;
          }}
          onClick={(clickEvent) => {
            if (clickEvent.target === clickEvent.currentTarget && backdropPointerDown.current)
              trackedCancelCrop();
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
              src={meta.src}
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
                left: cropPixelRect.x,
                top: cropPixelRect.y,
                width: cropPixelRect.w,
                height: cropPixelRect.h,
                boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.5)",
              }}
            >
              <div className="absolute inset-0 overflow-hidden">
                <img
                  src={meta.src}
                  alt=""
                  className="absolute max-w-none"
                  style={{
                    width: panelPos.w,
                    height: panelPos.h,
                    left: -cropPixelRect.x,
                    top: -cropPixelRect.y,
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
              <CornerHandle position="tl" onPointerDown={handlePointerDown} />
              <CornerHandle position="tr" onPointerDown={handlePointerDown} />
              <CornerHandle position="bl" onPointerDown={handlePointerDown} />
              <CornerHandle position="br" onPointerDown={handlePointerDown} />
              {cropPixelRect.w > EDGE_HANDLE_THRESHOLD && (
                <>
                  <EdgeHandle position="t" onPointerDown={handlePointerDown} />
                  <EdgeHandle position="b" onPointerDown={handlePointerDown} />
                </>
              )}
              {cropPixelRect.h > EDGE_HANDLE_THRESHOLD && (
                <>
                  <EdgeHandle position="l" onPointerDown={handlePointerDown} />
                  <EdgeHandle position="r" onPointerDown={handlePointerDown} />
                </>
              )}
              <div
                className="absolute inset-0 cursor-move"
                onPointerDown={(pointerEvent) => handlePointerDown(pointerEvent, null)}
              />
            </div>
          </div>
          <div className="absolute left-1/2 top-full z-50 mt-4 w-max -translate-x-1/2">
            <div
              className="canvas-toolbar-surface"
              data-canvas-toolbar="true"
              data-density="compact"
            >
              <ToolbarButton
                onClick={trackedCancelCrop}
                title={t("common.close")}
              >
                <CloseIcon />
              </ToolbarButton>
              <Divider />
              <div className="relative">
                <ToolbarButton
                  onClick={(clickEvent) => {
                    clickEvent.stopPropagation();
                    setShowAspectMenu((isOpen) => !isOpen);
                  }}
                  title={t("canvas.aspectRatio")}
                >
                  <span className="canvas-toolbar-label whitespace-nowrap">
                    {aspectRatio === "free"
                      ? t("canvas.freeAspect")
                      : aspectRatio}
                  </span>
                  <DropdownArrowIcon />
                </ToolbarButton>
                {showAspectMenu && (
                  <div
                    className="canvas-toolbar-menu absolute bottom-full left-1/2 mb-2 -translate-x-1/2 p-1"
                    onPointerDown={(pointerEvent) => pointerEvent.stopPropagation()}
                  >
                    {ASPECT_OPTIONS.map((aspectOption) => (
                      <button
                        key={aspectOption.value}
                        type="button"
                        className="canvas-toolbar-menu-item flex w-full items-center px-3 py-2 whitespace-nowrap"
                        onClick={() => {
                          setAspectRatio(aspectOption.value);
                          setShowAspectMenu(false);
                        }}
                        data-active={aspectRatio === aspectOption.value || void 0}
                      >
                        {aspectOption.value === "free"
                          ? t("canvas.freeAspect")
                          : aspectOption.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Divider />
              <button
                type="button"
                disabled={confirming}
                onClick={handleConfirm}
                className="canvas-toolbar-action"
                aria-label={
                  confirming ? t("canvas.cropping") : t("common.confirm")
                }
                title={
                  confirming ? t("canvas.cropping") : t("common.confirm")
                }
                data-variant="primary"
              >
                <SendArrowIcon />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  },
);
