// text-preview.jsx
import { DialogPopup, Loader2, Music2, reactExports } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { FileText, Paperclip } from "../media-editing/package.jsx";
import { CloseButton } from "./close-button.jsx";
import { ImageLightbox } from "./image-lightbox.jsx";
import { DialogPortal } from "../infra/gateway-http-error.jsx";
import { useNativeViewOcclusion } from "../canvas/separator.jsx";
import { useFullscreenContainerEl } from "../infra/use-plugin-metadata-store.js";
import { Dialog } from "../infra/dialog-content.jsx";
function getWindowBridge() {
  const platform2 = window.__HILO_PLATFORM__;
  return platform2?.window;
}
function useHideWindowButtons() {
  reactExports.useEffect(() => {
    const bridge = getWindowBridge();
    bridge?.setWindowButtonVisibility?.(false);
    return () => {
      bridge?.setWindowButtonVisibility?.(true);
    };
  }, []);
}
function AudioPreview({ src, alt }) {
  return (
    <div className="flex w-[min(30rem,80vw)] flex-col items-center gap-4 rounded-lg border border-[color-mix(in_srgb,var(--media-overlay-foreground)_12%,transparent)] bg-[color-mix(in_srgb,var(--media-overlay-foreground)_8%,transparent)] p-6 shadow-2xl backdrop-blur-sm">
      <Music2
        className="size-10 text-[color-mix(in_srgb,var(--media-overlay-foreground)_70%,transparent)]"
        strokeWidth={1.5}
      />
      <span className="max-w-full truncate text-sm text-[color-mix(in_srgb,var(--media-overlay-foreground)_80%,transparent)]">
        {alt}
      </span>
      <audio
        src={src}
        controls={true}
        autoPlay={true}
        className="w-full"
        aria-label={alt}
      />
    </div>
  );
}
function TextPreview({ src, alt }) {
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
        <AudioPreview src={src} alt={alt} />
      ) : kind === "text" ? (
        <TextPreview src={src} alt={alt} />
      ) : (
        <FilePreview alt={alt} />
      )}
    </DialogPopup>
  );
}
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
          <ImageLightbox src={src} alt={alt} onClose={onClose} />
        ) : (
          <NonImageLightbox kind={kind} src={src} alt={alt} onClose={onClose} />
        )}
      </DialogPortal>
    </Dialog>
  );
});
