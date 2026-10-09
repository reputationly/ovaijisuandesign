// staged-row.jsx
import {
  API_PATHS,
  classifyFileType,
  Loader2,
  reactExports,
  Scan,
  useTranslation,
  Video,
  X$7 as X,
} from "../vendor.js";
import { Icon } from "../vendor-inline/vscode-base/graph.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { AudioPlayButton, FileNameLabel } from "./audio-play-button.jsx";
import { gatewayUrl } from "../infra/gateway-http-error.jsx";
import { FileTypeIcon } from "../infra/file-type-icon.jsx";
import { MediaLightbox } from "./text-preview.jsx";
import { Button, cn$2 as cn } from "../infra/dialog-content.jsx";
function useFilePreviewUrl(file) {
  const [preview, setPreview] = reactExports.useState(null);
  reactExports.useEffect(() => {
    const media = file.type.startsWith("image/")
      ? "image"
      : file.type.startsWith("video/")
        ? "video"
        : file.type.startsWith("audio/")
          ? "audio"
          : null;
    if (!media) {
      setPreview(null);
      return;
    }
    const next2 = URL.createObjectURL(file);
    setPreview({
      url: next2,
      media,
    });
    return () => URL.revokeObjectURL(next2);
  }, [file]);
  return preview;
}
export function StagedRow({
  entry,
  onRemove: onRemove2,
  onCaptionChange,
  onSetCover,
  isCover,
  coverPreviewSrc,
}) {
  const { t: t2 } = useTranslation();
  const isBusy = entry.status === "uploading";
  const preview = useFilePreviewUrl(entry.file);
  const [lightboxOpen, setLightboxOpen] = reactExports.useState(false);
  const [failedPreview, setFailedPreview] = reactExports.useState(null);
  const uploadedMedia =
    entry.status === "uploaded" &&
    (entry.uploaded.kind === "image" ||
      entry.uploaded.kind === "video" ||
      entry.uploaded.kind === "audio")
      ? entry.uploaded.kind
      : void 0;
  const effectiveMedia = uploadedMedia ?? preview?.media;
  const isImage2 = effectiveMedia === "image";
  const isVideo = effectiveMedia === "video";
  const isAudio = effectiveMedia === "audio";
  const uploadedVideo =
    entry.status === "uploaded" && entry.uploaded.kind === "video";
  const uploadedVideoPosterSrc = uploadedVideo
    ? gatewayUrl(API_PATHS.assetCenterBlobPreview(entry.uploaded.blobPath, 512))
    : void 0;
  const uploadedVideoPlaybackSrc = uploadedVideo
    ? gatewayUrl(API_PATHS.assetCenterBlobPlayback(entry.uploaded.blobPath))
    : void 0;
  const imageSrc = coverPreviewSrc ?? preview?.url;
  const lightboxSrc =
    effectiveMedia === "image"
      ? imageSrc
      : (uploadedVideoPlaybackSrc ?? preview?.url);
  return (
    <li
      className="group/audio flex flex-col border border-border rounded-lg bg-card text-xs overflow-hidden"
      data-action-ui-id="asset-center-add-entity-staged-row"
      data-status={entry.status}
    >
      <div className="relative aspect-[4/3] bg-muted overflow-hidden flex items-center justify-center">
        {isImage2 && imageSrc ? (
          <button
            type="button"
            className="absolute inset-0 cursor-zoom-in focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-default"
            onClick={() => setLightboxOpen(true)}
            disabled={isBusy}
            data-action-ui-id="asset-center-staged-attachment-image"
            aria-label={t2("assetCenter.detail.viewLarge")}
          >
            {failedPreview === imageSrc ? (
              <FileTypeIcon
                {...classifyFileType({
                  filename: entry.file.name,
                })}
                size={48}
                decorative={true}
              />
            ) : (
              <img
                src={imageSrc}
                alt=""
                className="w-full h-full object-cover"
                onError={() => setFailedPreview(imageSrc ?? null)}
              />
            )}
          </button>
        ) : isVideo && (uploadedVideoPosterSrc || preview) ? (
          <button
            type="button"
            className="absolute inset-0 cursor-zoom-in focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-default"
            onClick={() => setLightboxOpen(true)}
            disabled={isBusy}
            data-action-ui-id="asset-center-staged-attachment-video"
            aria-label={t2("assetCenter.detail.viewLarge")}
          >
            {uploadedVideoPosterSrc ? (
              failedPreview === uploadedVideoPosterSrc ? (
                <FileTypeIcon
                  {...classifyFileType({
                    filename: entry.file.name,
                  })}
                  size={48}
                  decorative={true}
                />
              ) : (
                <img
                  src={uploadedVideoPosterSrc}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={() =>
                    setFailedPreview(uploadedVideoPosterSrc ?? null)
                  }
                />
              )
            ) : preview && failedPreview !== preview.url ? (
              <video
                src={preview.url}
                onError={() => setFailedPreview(preview.url)}
                className="w-full h-full object-cover bg-black"
                preload="metadata"
              >
                <track kind="captions" />
              </video>
            ) : (
              <FileTypeIcon
                {...classifyFileType({
                  filename: entry.file.name,
                })}
                size={48}
                decorative={true}
              />
            )}
            <span className="absolute inset-0 flex items-center justify-center">
              <Video size={20} className="text-background drop-shadow" />
            </span>
          </button>
        ) : isAudio && preview ? (
          <AudioPlayButton src={preview.url} filename={entry.file.name} />
        ) : (
          <FileTypeIcon
            {...classifyFileType({
              filename: entry.file.name,
            })}
            size={48}
            decorative={true}
          />
        )}
        {isBusy && (
          <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
            <Loader2 size={16} className="animate-spin text-foreground" />
          </div>
        )}
        {entry.status === "uploaded" && isImage2 && imageSrc && onSetCover ? (
          <Button
            variant="secondary"
            size="xs"
            className={cn(
              "absolute bottom-1 left-1 gap-0.5 pl-1 pr-1.5 transition-opacity",
              !isCover &&
                "opacity-0 group-hover/audio:opacity-100 focus-visible:opacity-100",
            )}
            onClick={() => onSetCover(imageSrc, entry.file.name)}
            data-action-ui-id="asset-center-attachment-set-cover"
          >
            <Icon icon={Scan} size="xs" strokeWidth={2} />
            {t2(isCover ? "assetCenter.cover.edit" : "assetCenter.cover.set")}
          </Button>
        ) : null}
        <Button
          variant="ghost"
          size="icon-xs"
          className="absolute top-1 right-1 h-5 w-5 bg-background/60 text-muted-foreground hover:text-destructive hover:bg-background/80"
          onClick={onRemove2}
          disabled={isBusy}
          data-action-ui-id="asset-center-add-entity-staged-remove"
          aria-label={t2("common.remove")}
        >
          <X size={10} />
        </Button>
      </div>
      <div className="flex flex-col gap-1 p-2">
        <div className="flex items-center gap-1">
          <FileNameLabel name={entry.file.name} className="flex-1 text-xs" />
          <span
            className={cn(
              "text-[10px] uppercase tracking-wide shrink-0",
              entry.status === "uploaded" && "text-foreground",
              entry.status === "staged" && "text-foreground",
              entry.status === "error" && "text-destructive",
              entry.status === "uploading" && "text-muted-foreground",
              entry.status === "pending" && "text-muted-foreground/60",
            )}
          >
            {t2(`assetCenter.create.uploadStatus.${entry.status}`)}
          </span>
        </div>
        {(entry.status === "uploaded" || entry.status === "staged") && (
          <div className="flex items-start">
            <div className="w-0.5 h-3 shrink-0 bg-muted-foreground/20 mr-2 mt-0.5" />
            <textarea
              value={entry.caption ?? ""}
              onChange={(e2) => onCaptionChange?.(e2.target.value)}
              placeholder={t2(
                "assetCenter.create.attachmentCaptionPlaceholder",
              )}
              rows={1}
              className="flex-1 min-w-0 bg-transparent text-xs text-muted-foreground outline-none placeholder:text-muted-foreground/40 resize-none field-sizing-content break-words"
              data-action-ui-id="asset-center-add-entity-staged-caption"
            />
          </div>
        )}
        {entry.status === "error" && (
          <span className="text-[10px] text-destructive">
            {entry.errorMessage}
          </span>
        )}
      </div>
      {lightboxOpen &&
      lightboxSrc &&
      (effectiveMedia === "image" || effectiveMedia === "video") ? (
        <MediaLightbox
          kind={effectiveMedia}
          src={lightboxSrc}
          alt={entry.file.name}
          onClose={() => setLightboxOpen(false)}
        />
      ) : null}
    </li>
  );
}
