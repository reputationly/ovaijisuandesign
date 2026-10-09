// reference-thumbnail-overlay.jsx
import {
  AtSign,
  PlaybackPlayIcon$1 as PlaybackPlayIcon,
  useTranslation,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { ImageLightbox } from "./image-lightbox.jsx";
import { VideoLightbox } from "./video-lightbox.jsx";
export function ReferenceMediaLightbox({ item, onClose }) {
  if (item?.kind === "image") {
    return (
      <ImageLightbox
        items={[item]}
        index={0}
        onIndexChange={() => {}}
        alt={item.fileName ?? ""}
        onClose={onClose}
      />
    );
  }
  if (item?.kind === "video")
    return <VideoLightbox item={item} onClose={onClose} />;
  return null;
}
export function ReferenceThumbnailOverlay({
  visible,
  disabled: disabled2,
  onReference,
}) {
  const { t: t2 } = useTranslation();
  return (
    <div
      data-testid="reference-thumbnail-overlay"
      className={`pointer-events-none absolute inset-x-0 bottom-0 z-[2] h-1/3 bg-gradient-to-t from-[var(--canvas-reference-thumbnail-gradient)] to-transparent transition-opacity duration-150 motion-reduce:transition-none ${visible ? "opacity-100" : "opacity-0"}`}
    >
      <button
        type="button"
        aria-label={t2("canvas.reference.addReference")}
        data-action-ui-id="popover.attachment-reference"
        disabled={disabled2}
        tabIndex={visible ? 0 : -1}
        className={`absolute bottom-0.5 right-0.5 flex size-4 items-center justify-center text-[var(--canvas-media-control-fg)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground ${visible ? "pointer-events-auto cursor-pointer" : "pointer-events-none"}`}
        onMouseDown={(event) => event.preventDefault()}
        onClick={(event) => {
          event.stopPropagation();
          onReference();
        }}
      >
        <AtSign
          size={14}
          strokeWidth={1.6}
          style={{
            filter: "drop-shadow(var(--canvas-media-icon-shadow))",
          }}
        />
      </button>
    </div>
  );
}
export function ReferenceThumbnailVideoInfo({ visible, durationLabel }) {
  return (
    <span
      data-testid="reference-thumbnail-video-info"
      aria-hidden={!visible}
      className={`pointer-events-none absolute bottom-0.5 left-0.5 flex items-center gap-0.5 rounded-[3px] bg-[var(--canvas-media-control-bg)] px-0.5 py-0.5 text-[8px] leading-none tabular-nums text-[var(--canvas-media-control-fg)] transition-opacity duration-150 motion-reduce:transition-none ${visible ? "opacity-100" : "opacity-0"}`}
    >
      <PlaybackPlayIcon size={8} strokeWidth={1.5} fill="currentColor" />
      {durationLabel}
    </span>
  );
}
