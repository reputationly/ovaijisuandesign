// shared/image-lightbox.jsx
import {
  useTranslation,
  reactExports,
  Loader2,
  X$7,
  Plus,
  DialogPopup,
  DialogPortal,
  useNativeViewOcclusion,
  useHideWindowButtons,
  useFullscreenContainerEl,
  Minus,
  Music2,
  FileText,
  Paperclip,
} from "../../vendor.js";
import { __jsx } from "../../shared/jsx-runtime.js";
import { Dialog } from "./use-browser-overlay-dialog-props.jsx";
const MIN_SCALE = 0.5;
const MAX_SCALE = 10;
const WHEEL_STEP = 2e-3;
const BUTTON_ZOOM_FACTOR = 1.3;
const DRAG_THRESHOLD = 3;
export const MediaLightbox = reactExports.memo(function MediaLightbox22({
  kind,
  src,
  alt,
  onClose,
}) {
  useNativeViewOcclusion();
  useHideWindowButtons();
  const fullscreenContainerEl = useFullscreenContainerEl();
  return (
    <Dialog
      open={true}
      browserPreviewManaged={true}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogPortal container={fullscreenContainerEl ?? void 0}>
        {kind === "image" ? (
          <ImageLightbox$1 src={src} alt={alt} onClose={onClose} />
        ) : (
          <NonImageLightbox kind={kind} src={src} alt={alt} onClose={onClose} />
        )}
      </DialogPortal>
    </Dialog>
  );
});
const CloseButton = reactExports.memo(function CloseButton2({ onClose }) {
  const handleClick2 = reactExports.useCallback(
    (event) => {
      event.stopPropagation();
      onClose();
    },
    [onClose],
  );
  const { t: t2 } = useTranslation();
  return (
    <button
      type="button"
      aria-label={t2("common.close")}
      data-action-ui-id="media-lightbox.close"
      className="absolute right-8 top-8 z-10 flex size-9 cursor-pointer items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--media-overlay-foreground)_10%,transparent)] text-[color-mix(in_srgb,var(--media-overlay-foreground)_80%,transparent)] transition-colors hover:bg-[color-mix(in_srgb,var(--media-overlay-foreground)_20%,transparent)] hover:text-(--media-overlay-foreground) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={handleClick2}
    >
      <X$7 size={16} strokeWidth={1.5} />
    </button>
  );
});
function NonImageLightbox({ kind, src, alt, onClose }) {
  return (
    <DialogPopup
      aria-label={alt}
      data-action-ui-id={`media-lightbox.${kind}`}
      className="no-drag fixed inset-0 z-10002 flex flex-col items-center justify-center gap-4 overflow-hidden bg-black/85 p-10 outline-none backdrop-blur-sm"
      onClick={(event) => {
        event.stopPropagation();
        if (event.target === event.currentTarget) onClose();
      }}
      onPointerDown={(event) => event.stopPropagation()}
      onPointerUp={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <CloseButton onClose={onClose} />
      {kind === "video" ? (
        /* biome-ignore lint/a11y/useMediaCaption: generated or user-attached video preview */ <video
          src={src}
          controls={true}
          autoPlay={true}
          playsInline={true}
          className="max-h-[82vh] max-w-[86vw] rounded-lg bg-black shadow-2xl"
          aria-label={alt}
        />
      ) : kind === "audio" ? (
        <AudioPreview$1 src={src} alt={alt} />
      ) : kind === "text" ? (
        <TextPreview$1 src={src} alt={alt} />
      ) : (
        <FilePreview alt={alt} />
      )}
    </DialogPopup>
  );
}
function AudioPreview$1({ src, alt }) {
  return (
    <div className="flex w-[min(30rem,80vw)] flex-col items-center gap-4 rounded-lg border border-[color-mix(in_srgb,var(--media-overlay-foreground)_12%,transparent)] bg-[color-mix(in_srgb,var(--media-overlay-foreground)_8%,transparent)] p-6 shadow-2xl backdrop-blur-sm">
      <Music2
        className="size-10 text-[color-mix(in_srgb,var(--media-overlay-foreground)_70%,transparent)]"
        strokeWidth={1.5}
      />
      <span className="max-w-full truncate text-sm text-[color-mix(in_srgb,var(--media-overlay-foreground)_80%,transparent)]">
        {alt}
      </span>
      <audio src={src} controls={true} autoPlay={true} className="w-full" aria-label={alt} />
    </div>
  );
}
function TextPreview$1({ src, alt }) {
  const [content2, setContent2] = reactExports.useState(null);
  const [error, setError] = reactExports.useState(null);
  reactExports.useEffect(() => {
    const controller = new AbortController();
    setContent2(null);
    setError(null);
    fetch(src, {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error(`${response.status}`);
        return response.text();
      })
      .then(setContent2)
      .catch((reason) => {
        if (controller.signal.aborted) return;
        setError(reason instanceof Error ? reason.message : String(reason));
      });
    return () => controller.abort();
  }, [src]);
  return (
    <div className="flex max-h-[76vh] w-[min(48rem,86vw)] flex-col overflow-hidden rounded-lg border border-[color-mix(in_srgb,var(--media-overlay-foreground)_12%,transparent)] bg-[color-mix(in_srgb,var(--media-overlay-foreground)_8%,transparent)] shadow-2xl backdrop-blur-sm">
      <div className="flex shrink-0 items-center gap-2 border-b border-[color-mix(in_srgb,var(--media-overlay-foreground)_12%,transparent)] px-4 py-3">
        <FileText
          className="size-4 shrink-0 text-[color-mix(in_srgb,var(--media-overlay-foreground)_70%,transparent)]"
          strokeWidth={1.5}
        />
        <span className="truncate text-sm text-[color-mix(in_srgb,var(--media-overlay-foreground)_80%,transparent)]">
          {alt}
        </span>
      </div>
      <div className="min-h-32 overflow-auto p-4">
        {content2 === null && !error ? (
          <div className="flex min-h-24 items-center justify-center">
            <Loader2
              className="size-4 animate-spin text-[color-mix(in_srgb,var(--media-overlay-foreground)_50%,transparent)]"
              strokeWidth={1.5}
            />
          </div>
        ) : null}
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
        {content2 !== null ? (
          <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-[color-mix(in_srgb,var(--media-overlay-foreground)_80%,transparent)]">
            {content2}
          </pre>
        ) : null}
      </div>
    </div>
  );
}
function FilePreview({ alt }) {
  return (
    <div className="flex max-w-[70vw] flex-col items-center gap-3 rounded-lg border border-[color-mix(in_srgb,var(--media-overlay-foreground)_12%,transparent)] bg-[color-mix(in_srgb,var(--media-overlay-foreground)_8%,transparent)] px-10 py-8 shadow-2xl backdrop-blur-sm">
      <Paperclip
        className="size-10 text-[color-mix(in_srgb,var(--media-overlay-foreground)_70%,transparent)]"
        strokeWidth={1.5}
      />
      <span className="max-w-full truncate text-sm text-[color-mix(in_srgb,var(--media-overlay-foreground)_80%,transparent)]">
        {alt}
      </span>
    </div>
  );
}
function ImageLightbox$1({ src, alt, onClose }) {
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
    const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prevScale * (1 + delta)));
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
  const cursor = draggingRef.current ? "grabbing" : scale2 > 1 ? "grab" : "default";
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
