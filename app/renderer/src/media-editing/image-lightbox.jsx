// image-lightbox.jsx
import {
  Archive,
  ChevronLeft,
  ChevronRight$1 as ChevronRight,
  Crown,
  ExternalLink,
  jsxRuntimeExports,
  Minus,
  Plus,
  reactExports,
  useTranslation,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { Download, FolderOpen, useCanvasActive } from "./package.jsx";
import {
  getCanvasFileManagerLabelKey,
  LightboxActionButton,
} from "./use-warn-missing-asset-meta.jsx";
import { useLightboxMediaActions } from "./use-lightbox-media-actions.jsx";
import { MediaLightbox } from "./media-lightbox.jsx";
const MIN_SCALE = 0.5;
const MAX_SCALE = 10;
const LINE_HEIGHT_PX = 16;
const PAGE_HEIGHT_PX = 800;
const MAX_WHEEL_DELTA_PX = 120;
const WHEEL_ZOOM_SENSITIVITY = 18e-4;
const BUTTON_ZOOM_FACTOR = 1.3;
const COMPACT_HEADER_MAX_WIDTH_PX = 224;
function normalizeWheelDeltaY(event) {
  if (event.deltaMode === 1) return event.deltaY * LINE_HEIGHT_PX;
  if (event.deltaMode === 2) return event.deltaY * PAGE_HEIGHT_PX;
  return event.deltaY;
}
function clampWheelDeltaY(deltaY) {
  return Math.max(-MAX_WHEEL_DELTA_PX, Math.min(MAX_WHEEL_DELTA_PX, deltaY));
}
function isLightboxCopyShortcut(event) {
  return (
    (event.metaKey || event.ctrlKey) && !event.altKey && event.code === "KeyC"
  );
}
function clampScale(scale2) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale2));
}
function getWheelZoomScale(currentScale, event) {
  if (!Number.isFinite(currentScale) || currentScale <= 0) return 1;
  const normalizedDelta = normalizeWheelDeltaY(event);
  const clampedDelta = clampWheelDeltaY(normalizedDelta);
  return clampScale(
    currentScale * Math.exp(-clampedDelta * WHEEL_ZOOM_SENSITIVITY),
  );
}
export const ImageLightbox = reactExports.memo(function ImageLightbox2({
  items,
  index: index2,
  onIndexChange,
  alt,
  onClose,
  onSetAsPrimary,
  onSplitToNode,
}) {
  const { t } = useTranslation();
  const active2 = useCanvasActive();
  const [scale2, setScale] = reactExports.useState(1);
  const [translate2, setTranslate] = reactExports.useState({
    x: 0,
    y: 0,
  });
  const [transitioning, setTransitioning] = reactExports.useState(false);
  const [isCompactHeader, setIsCompactHeader] = reactExports.useState(false);
  const containerRef = reactExports.useRef(null);
  const imgRef = reactExports.useRef(null);
  const draggingRef = reactExports.useRef(false);
  const dragStartRef = reactExports.useRef({
    x: 0,
    y: 0,
  });
  const translateAtDragStart = reactExports.useRef({
    x: 0,
    y: 0,
  });
  const didDragRef = reactExports.useRef(false);
  const scaleRef = reactExports.useRef(scale2);
  const translateRef = reactExports.useRef(translate2);
  scaleRef.current = scale2;
  translateRef.current = translate2;
  const total = items.length;
  const isMulti = total > 1;
  const current2 = items[index2];
  const src = current2?.url ?? "";
  const downloadLabel = t("canvas.lightbox.downloadCurrent");
  const downloadAllLabel = t("canvas.lightbox.downloadAll");
  const showInFolderLabel = t(getCanvasFileManagerLabelKey());
  const setAsPrimaryLabel = t("canvas.multiImage.setAsPrimary", "设为主图");
  const splitToNodeLabel = t("canvas.multiImage.splitToNode", "独立展示");
  const {
    canCopy,
    canSave,
    canSaveAll,
    canReveal,
    handleCopyImage,
    handleDownload,
    handleDownloadAll,
    handleShowInFolder,
    handleContextMenu,
    contextMenu,
  } = useLightboxMediaActions({
    item: current2,
    items,
  });
  const hasActionButtons =
    !!onSetAsPrimary || !!onSplitToNode || canSave || canSaveAll || canReveal;
  const handleSetAsPrimaryClick = reactExports.useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      onSetAsPrimary?.();
    },
    [onSetAsPrimary],
  );
  const handleSplitToNodeClick = reactExports.useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      onSplitToNode?.();
    },
    [onSplitToNode],
  );
  const goPrev = reactExports.useCallback(() => {
    if (total <= 1) return;
    onIndexChange((index2 - 1 + total) % total);
  }, [index2, total, onIndexChange]);
  const goNext = reactExports.useCallback(() => {
    if (total <= 1) return;
    onIndexChange((index2 + 1) % total);
  }, [index2, total, onIndexChange]);
  const handlePrevClick = reactExports.useCallback(
    (clickEvent) => {
      clickEvent.stopPropagation();
      goPrev();
    },
    [goPrev],
  );
  const handleNextClick = reactExports.useCallback(
    (clickEvent) => {
      clickEvent.stopPropagation();
      goNext();
    },
    [goNext],
  );
  reactExports.useEffect(() => {
    if (!isMulti || !active2) return;
    const handler = (keyboardEvent) => {
      if (keyboardEvent.key === "ArrowLeft") {
        keyboardEvent.preventDefault();
        keyboardEvent.stopPropagation();
        goPrev();
      } else if (keyboardEvent.key === "ArrowRight") {
        keyboardEvent.preventDefault();
        keyboardEvent.stopPropagation();
        goNext();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isMulti, active2, goPrev, goNext]);
  reactExports.useEffect(() => {
    if (!active2 || !canCopy) return;
    const handler = (keyboardEvent) => {
      if (!isLightboxCopyShortcut(keyboardEvent)) return;
      keyboardEvent.preventDefault();
      keyboardEvent.stopPropagation();
      handleCopyImage();
    };
    document.addEventListener("keydown", handler, true);
    return () => document.removeEventListener("keydown", handler, true);
  }, [active2, canCopy, handleCopyImage]);
  reactExports.useEffect(() => {
    if (!active2 || !canCopy) return;
    const handler = (copyEvent) => {
      copyEvent.preventDefault();
      copyEvent.stopPropagation();
      handleCopyImage();
    };
    document.addEventListener("copy", handler, true);
    return () => document.removeEventListener("copy", handler, true);
  }, [active2, canCopy, handleCopyImage]);
  reactExports.useEffect(() => {
    setScale(1);
    setTranslate({
      x: 0,
      y: 0,
    });
    setTransitioning(false);
  }, [index2, src]);
  const handleWheel = reactExports.useCallback((wheelEvent) => {
    wheelEvent.preventDefault();
    wheelEvent.stopPropagation();
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const pointerOffsetX = wheelEvent.clientX - rect.left - rect.width / 2;
    const pointerOffsetY = wheelEvent.clientY - rect.top - rect.height / 2;
    const prevScale = scaleRef.current;
    const nextScale = getWheelZoomScale(prevScale, wheelEvent);
    if (nextScale === prevScale) return;
    const ratio = 1 - nextScale / prevScale;
    const translationX = translateRef.current.x + (pointerOffsetX - translateRef.current.x) * ratio;
    const translationY = translateRef.current.y + (pointerOffsetY - translateRef.current.y) * ratio;
    setScale(nextScale);
    setTranslate(
      nextScale <= 1
        ? {
            x: 0,
            y: 0,
          }
        : {
            x: translationX,
            y: translationY,
          },
    );
  }, []);
  const handleZoomIn = reactExports.useCallback((clickEvent) => {
    clickEvent.stopPropagation();
    setTransitioning(true);
    setScale((currentScale) => Math.min(MAX_SCALE, currentScale * BUTTON_ZOOM_FACTOR));
  }, []);
  const handleZoomOut = reactExports.useCallback((clickEvent) => {
    clickEvent.stopPropagation();
    setTransitioning(true);
    setScale((currentScale) => {
      const next2 = Math.max(MIN_SCALE, currentScale / BUTTON_ZOOM_FACTOR);
      if (next2 <= 1) {
        setTranslate({
          x: 0,
          y: 0,
        });
        return 1;
      }
      return next2;
    });
  }, []);
  const handleResetZoom = reactExports.useCallback((clickEvent) => {
    clickEvent.stopPropagation();
    setTransitioning(true);
    setScale(1);
    setTranslate({
      x: 0,
      y: 0,
    });
  }, []);
  const handlePointerDown = reactExports.useCallback((pointerEvent) => {
    if (pointerEvent.button !== 0) return;
    pointerEvent.preventDefault();
    pointerEvent.stopPropagation();
    draggingRef.current = true;
    didDragRef.current = false;
    dragStartRef.current = {
      x: pointerEvent.clientX,
      y: pointerEvent.clientY,
    };
    translateAtDragStart.current = {
      ...translateRef.current,
    };
    pointerEvent.target.setPointerCapture(pointerEvent.pointerId);
  }, []);
  const handlePointerMove = reactExports.useCallback((pointerEvent) => {
    if (!draggingRef.current) return;
    const dragDeltaX = pointerEvent.clientX - dragStartRef.current.x;
    const dragDeltaY = pointerEvent.clientY - dragStartRef.current.y;
    if (Math.abs(dragDeltaX) > 3 || Math.abs(dragDeltaY) > 3) {
      didDragRef.current = true;
    }
    setTranslate({
      x: translateAtDragStart.current.x + dragDeltaX,
      y: translateAtDragStart.current.y + dragDeltaY,
    });
  }, []);
  const handlePointerUp = reactExports.useCallback((pointerEvent) => {
    draggingRef.current = false;
    pointerEvent.target.releasePointerCapture(pointerEvent.pointerId);
  }, []);
  const handleDoubleClick2 = reactExports.useCallback(
    (doubleClickEvent) => {
      doubleClickEvent.stopPropagation();
      setTransitioning(true);
      if (scale2 === 1) {
        const imageElement = imgRef.current;
        if (!imageElement) return;
        setScale(imageElement.naturalWidth / imageElement.width);
      } else {
        setScale(1);
      }
      setTranslate({
        x: 0,
        y: 0,
      });
    },
    [scale2],
  );
  reactExports.useEffect(() => {
    if (!transitioning) return;
    const transitionTimeoutId = setTimeout(() => setTransitioning(false), 200);
    return () => clearTimeout(transitionTimeoutId);
  }, [transitioning]);
  reactExports.useEffect(() => {
    const image2 = imgRef.current;
    if (!image2 || typeof ResizeObserver === "undefined") return;
    const updateHeaderLayout = (width) => {
      setIsCompactHeader(width < COMPACT_HEADER_MAX_WIDTH_PX);
    };
    if (image2.clientWidth > 0) updateHeaderLayout(image2.clientWidth);
    const resizeObserver = new ResizeObserver(([entry]) => {
      updateHeaderLayout(entry?.contentRect.width ?? image2.clientWidth);
    });
    resizeObserver.observe(image2);
    return () => resizeObserver.disconnect();
  }, []);
  const handleContainerClick = reactExports.useCallback((clickEvent) => {
    if (didDragRef.current) {
      clickEvent.stopPropagation();
    }
  }, []);
  const cursor = draggingRef.current
    ? "grabbing"
    : scale2 > 1
      ? "grab"
      : "default";
  const scalePercent = `${Math.round(scale2 * 100)}%`;
  return (
    <MediaLightbox
      onClose={onClose}
      onContextMenu={handleContextMenu}
      allowHorizontalArrowKeys={isMulti}
    >
      <div className="pointer-events-none relative isolate flex max-h-[calc(100vh-8rem)] max-w-[calc(100vw-8rem)] flex-col items-center justify-center gap-3">
        <div
          className="pointer-events-none relative z-50 flex w-full items-center justify-center"
          data-action-ui-id="canvas.image-lightbox.header"
        >
          <div
            className="pointer-events-auto flex items-center gap-1 rounded-full bg-black/55 px-2 py-1.5 backdrop-blur-sm"
            data-action-ui-id="canvas.image-lightbox.zoom-controls"
          >
            <button
              type="button"
              data-action-ui-id="canvas.image-lightbox.zoom-out"
              className="flex items-center justify-center w-7 h-7 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              onClick={handleZoomOut}
            >
              <Minus size={16} strokeWidth={1.5} aria-hidden={true} />
            </button>
            <button
              type="button"
              data-action-ui-id="canvas.image-lightbox.zoom-reset"
              className="min-w-[3rem] text-center text-xs text-white/70 hover:text-white tabular-nums cursor-pointer"
              onClick={handleResetZoom}
            >
              {scalePercent}
            </button>
            <button
              type="button"
              data-action-ui-id="canvas.image-lightbox.zoom-in"
              className="flex items-center justify-center w-7 h-7 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              onClick={handleZoomIn}
            >
              <Plus size={16} strokeWidth={1.5} aria-hidden={true} />
            </button>
          </div>
        </div>
        <div
          ref={containerRef}
          className="pointer-events-auto relative z-0"
          data-action-ui-id="canvas.image-lightbox.media-frame"
          style={{
            cursor,
          }}
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onDoubleClick={handleDoubleClick2}
          onClick={handleContainerClick}
        >
          {isMulti && (
            <div
              className={`pointer-events-none absolute right-0 bottom-full z-50 whitespace-nowrap px-1 text-[11px] text-white/60 tabular-nums ${isCompactHeader ? "mb-14" : "mb-3"}`}
              data-action-ui-id="canvas.image-lightbox.counter"
            >
              {index2 + 1}
              {" / "}
              {total}
            </div>
          )}
          <img
            ref={imgRef}
            src={src}
            alt={alt}
            className="relative z-0 max-w-[80vw] max-h-[calc(80vh-5.5rem)] object-contain rounded-lg shadow-[0_8px_32px_rgba(0,0,0,0.5)] select-none"
            style={{
              transform: `translate(${translate2.x}px, ${translate2.y}px) scale(${scale2})`,
              transition: transitioning ? "transform 0.2s ease-out" : "none",
            }}
            draggable={false}
          />
        </div>
        {hasActionButtons && (
          <div
            className="pointer-events-none relative z-50 flex min-h-8 w-full max-w-[80vw] items-center justify-center"
            data-action-ui-id="canvas.image-lightbox.actions"
          >
            {hasActionButtons && (
              <div
                className="pointer-events-auto flex flex-wrap items-center justify-center gap-2"
                data-action-ui-id="canvas.image-lightbox.action-group"
              >
                {onSetAsPrimary && (
                  <LightboxActionButton
                    label={setAsPrimaryLabel}
                    icon={Crown}
                    dataActionUiId="canvas.image-lightbox.set-primary"
                    onClick={handleSetAsPrimaryClick}
                  />
                )}
                {onSplitToNode && (
                  <LightboxActionButton
                    label={splitToNodeLabel}
                    icon={ExternalLink}
                    dataActionUiId="canvas.image-lightbox.split-to-node"
                    onClick={handleSplitToNodeClick}
                  />
                )}
                {canSave && (
                  <LightboxActionButton
                    label={downloadLabel}
                    icon={Download}
                    dataActionUiId="canvas.image-lightbox.download"
                    onClick={handleDownload}
                  />
                )}
                {canSaveAll && (
                  <LightboxActionButton
                    label={downloadAllLabel}
                    icon={Archive}
                    dataActionUiId="canvas.image-lightbox.download-all"
                    onClick={handleDownloadAll}
                  />
                )}
                {canReveal && (
                  <LightboxActionButton
                    label={showInFolderLabel}
                    icon={FolderOpen}
                    dataActionUiId="canvas.image-lightbox.show-in-folder"
                    onClick={handleShowInFolder}
                  />
                )}
              </div>
            )}
          </div>
        )}
      </div>
      {contextMenu}
      {isMulti && (
        <>
          <button
            type="button"
            aria-label={t(
              "canvas.imageLightbox.previousImage",
              "Previous image",
            )}
            data-action-ui-id="canvas.image-lightbox.prev"
            className="absolute left-8 top-1/2 z-50 -translate-y-1/2 flex items-center justify-center w-10 h-10 rounded-full bg-black/55 hover:bg-black/70 text-white/80 hover:text-white transition-colors cursor-pointer pointer-events-auto"
            onClick={handlePrevClick}
          >
            <ChevronLeft size={18} strokeWidth={1.5} aria-hidden={true} />
          </button>
          <button
            type="button"
            aria-label={t("canvas.imageLightbox.nextImage", "Next image")}
            data-action-ui-id="canvas.image-lightbox.next"
            className="absolute right-8 top-1/2 z-50 -translate-y-1/2 flex items-center justify-center w-10 h-10 rounded-full bg-black/55 hover:bg-black/70 text-white/80 hover:text-white transition-colors cursor-pointer pointer-events-auto"
            onClick={handleNextClick}
          >
            <ChevronRight size={18} strokeWidth={1.5} aria-hidden={true} />
          </button>
        </>
      )}
    </MediaLightbox>
  );
});
