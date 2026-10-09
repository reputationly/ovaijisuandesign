// image-lightbox.jsx
import { DialogPopup, Minus, Plus, reactExports } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { CloseButton } from "./close-button.jsx";
const MIN_SCALE = 0.5;
const MAX_SCALE = 10;
const WHEEL_STEP = 2e-3;
const BUTTON_ZOOM_FACTOR = 1.3;
const DRAG_THRESHOLD = 3;
export function ImageLightbox({ src, alt, onClose }) {
  const [scale2, setScale] = reactExports.useState(1);
  const [translate2, setTranslate] = reactExports.useState({
    x: 0,
    y: 0,
  });
  const [transitioning, setTransitioning] = reactExports.useState(false);
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
  reactExports.useEffect(() => {
    if (!transitioning) return;
    const id2 = setTimeout(() => setTransitioning(false), 200);
    return () => clearTimeout(id2);
  }, [transitioning]);
  const handleWheel = reactExports.useCallback((event) => {
    event.stopPropagation();
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const cx2 = event.clientX - rect.left - rect.width / 2;
    const cy = event.clientY - rect.top - rect.height / 2;
    const prevScale = scaleRef.current;
    const delta = -event.deltaY * WHEEL_STEP;
    const nextScale = Math.min(
      MAX_SCALE,
      Math.max(MIN_SCALE, prevScale * (1 + delta)),
    );
    if (nextScale === prevScale) return;
    const ratio = 1 - nextScale / prevScale;
    const tx = translateRef.current.x + (cx2 - translateRef.current.x) * ratio;
    const ty = translateRef.current.y + (cy - translateRef.current.y) * ratio;
    setScale(nextScale);
    setTranslate({
      x: tx,
      y: ty,
    });
  }, []);
  const handleZoomIn = reactExports.useCallback((event) => {
    event.stopPropagation();
    setTransitioning(true);
    setScale((value) => Math.min(MAX_SCALE, value * BUTTON_ZOOM_FACTOR));
  }, []);
  const handleZoomOut = reactExports.useCallback((event) => {
    event.stopPropagation();
    setTransitioning(true);
    setScale((value) => {
      const next2 = Math.max(MIN_SCALE, value / BUTTON_ZOOM_FACTOR);
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
  const handleResetZoom = reactExports.useCallback((event) => {
    event.stopPropagation();
    setTransitioning(true);
    setScale(1);
    setTranslate({
      x: 0,
      y: 0,
    });
  }, []);
  const handlePointerDown = reactExports.useCallback((event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    draggingRef.current = true;
    didDragRef.current = false;
    dragStartRef.current = {
      x: event.clientX,
      y: event.clientY,
    };
    translateAtDragStart.current = {
      ...translateRef.current,
    };
    event.target.setPointerCapture(event.pointerId);
  }, []);
  const handlePointerMove = reactExports.useCallback((event) => {
    if (!draggingRef.current) return;
    const dx = event.clientX - dragStartRef.current.x;
    const dy = event.clientY - dragStartRef.current.y;
    if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
      didDragRef.current = true;
    }
    setTranslate({
      x: translateAtDragStart.current.x + dx,
      y: translateAtDragStart.current.y + dy,
    });
  }, []);
  const handlePointerUp = reactExports.useCallback((event) => {
    draggingRef.current = false;
    event.target.releasePointerCapture(event.pointerId);
  }, []);
  const handleDoubleClick2 = reactExports.useCallback((event) => {
    event.stopPropagation();
    setTransitioning(true);
    if (scaleRef.current === 1) {
      const img = imgRef.current;
      if (!img) return;
      setScale(img.naturalWidth / img.width);
    } else {
      setScale(1);
    }
    setTranslate({
      x: 0,
      y: 0,
    });
  }, []);
  const handleContainerClick = reactExports.useCallback((event) => {
    event.stopPropagation();
  }, []);
  const handleBackdropClick = reactExports.useCallback(
    (event) => {
      event.stopPropagation();
      if (event.target === event.currentTarget) onClose();
    },
    [onClose],
  );
  const cursor = draggingRef.current
    ? "grabbing"
    : scale2 > 1
      ? "grab"
      : "default";
  const scalePercent = `${Math.round(scale2 * 100)}%`;
  return (
    <DialogPopup
      aria-label={alt}
      data-action-ui-id="media-lightbox.image"
      className="no-drag fixed inset-0 z-10002 flex items-center justify-center overflow-hidden bg-black/85 p-16 outline-none backdrop-blur-sm"
      onClick={handleBackdropClick}
      onPointerDown={(event) => event.stopPropagation()}
      onPointerUp={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        event.stopPropagation();
      }}
    >
      <CloseButton onClose={onClose} />
      <div
        ref={containerRef}
        style={{
          cursor,
          pointerEvents: "auto",
        }}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={handleDoubleClick2}
        onClick={handleContainerClick}
      >
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          className="rounded-lg"
          style={{
            maxWidth: "80vw",
            maxHeight: "80vh",
            objectFit: "contain",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5)",
            transform: `translate(${translate2.x}px, ${translate2.y}px) scale(${scale2})`,
            transition: transitioning ? "transform 0.2s ease-out" : "none",
            userSelect: "none",
          }}
          draggable={false}
        />
      </div>
      <div
        data-action-ui-id="media-lightbox.zoom-controls"
        className="absolute bottom-8 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-lg bg-[color-mix(in_srgb,var(--media-overlay-foreground)_10%,transparent)] px-2 py-1.5 backdrop-blur-sm"
        style={{
          pointerEvents: "auto",
        }}
      >
        <button
          type="button"
          data-action-ui-id="media-lightbox.zoom-out"
          className="flex size-7 cursor-pointer items-center justify-center rounded-sm text-[color-mix(in_srgb,var(--media-overlay-foreground)_80%,transparent)] transition-colors hover:bg-[color-mix(in_srgb,var(--media-overlay-foreground)_10%,transparent)] hover:text-(--media-overlay-foreground) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={handleZoomOut}
        >
          <Minus size={16} strokeWidth={1.5} />
        </button>
        <button
          type="button"
          data-action-ui-id="media-lightbox.zoom-reset"
          className="min-w-12 cursor-pointer rounded-sm text-center text-xs tabular-nums text-[color-mix(in_srgb,var(--media-overlay-foreground)_70%,transparent)] hover:bg-[color-mix(in_srgb,var(--media-overlay-foreground)_10%,transparent)] hover:text-(--media-overlay-foreground) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={handleResetZoom}
        >
          {scalePercent}
        </button>
        <button
          type="button"
          data-action-ui-id="media-lightbox.zoom-in"
          className="flex size-7 cursor-pointer items-center justify-center rounded-sm text-[color-mix(in_srgb,var(--media-overlay-foreground)_80%,transparent)] transition-colors hover:bg-[color-mix(in_srgb,var(--media-overlay-foreground)_10%,transparent)] hover:text-(--media-overlay-foreground) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={handleZoomIn}
        >
          <Plus size={16} strokeWidth={1.5} />
        </button>
      </div>
    </DialogPopup>
  );
}
