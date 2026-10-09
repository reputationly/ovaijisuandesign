// file-chip.jsx
import {
  classifyFileType,
  CompositedSvg,
  Crosshair,
  reactDomExports,
  reactExports,
  useTranslation,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { useHoverPreview } from "../media-editing/use-hover-preview.js";
import { MediaHoverPreview } from "../media-editing/media-hover-preview.jsx";
import { TextHoverPreview } from "../media-editing/text-hover-preview.jsx";
import { formatTime } from "../media-editing/package.jsx";
import { Icon } from "../vendor-inline/vscode-base/graph.jsx";
import {
  canWriteResourceDragData,
  writeResourceDragData,
} from "./use-astra-send-gate.js";
import { FileTypeIcon } from "../infra/file-type-icon.jsx";
import { DeferredThumbnailImage } from "../workspace/deferred-thumbnail-image-generation.jsx";
import { formatFileSizeCompact } from "../workspace/set-home-widget-dev-preview-mode.js";
import { cn$2 as cn } from "../infra/dialog-content.jsx";
import { TextReadDialog } from "../media-editing/use-preview-text.jsx";
import { buildVideoThumbnailUrl } from "../media-editing/build-video-thumb-base.jsx";
import { MediaLightbox } from "../assets/text-preview.jsx";
import { VideoPlayIndicator } from "./attachment-bar.jsx";
import { FileNameLabel } from "../assets/audio-play-button.jsx";
const VIDEO_GRADIENT_ID = "file-chip-video-gradient";
const PREVIEW_W = 320;
const INTERACTIVE_PREVIEW_CLOSE_DELAY_MS = 120;
const mediaDurationCache = new Map();
const mediaDimensionsCache = new Map();
function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "";
  return formatTime(seconds, true);
}
function VideoIcon({ size: size2 = 17 }) {
  const { t: t2 } = useTranslation();
  const height = Math.round((size2 * 19) / 17);
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size2}
      height={height}
      viewBox="0 0 17 19"
      fill="none"
      aria-label={t2("canvas.video")}
      role="img"
    >
      <path
        d="M9.22557e-08 2.10062C-0.000109418 1.73112 0.0972776 1.36813 0.282328 1.0483C0.467378 0.728476 0.73354 0.463137 1.05394 0.279078C1.37434 0.0950197 1.73763 -0.00124224 2.10713 1.21035e-05C2.47663 0.00126645 2.83926 0.0999929 3.1584 0.286223L15.7552 7.63412C16.0732 7.81859 16.3371 8.08326 16.5206 8.40168C16.7042 8.7201 16.801 9.08112 16.8013 9.44867C16.8016 9.81621 16.7055 10.1774 16.5225 10.4961C16.3394 10.8149 16.076 11.08 15.7584 11.265L3.1584 18.615C2.83926 18.8013 2.47663 18.9 2.10713 18.9012C1.73763 18.9025 1.37434 18.8062 1.05394 18.6222C0.73354 18.4381 0.467378 18.1728 0.282328 17.8529C0.0972776 17.5331 -0.000109418 17.1701 9.22557e-08 16.8006V2.10062Z"
        fill={`url(#${VIDEO_GRADIENT_ID})`}
      />
      <defs>
        <linearGradient
          id={VIDEO_GRADIENT_ID}
          x1="8.55164"
          y1="1.67145"
          x2="8.55164"
          y2="19.1058"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="white" stopOpacity="0.4" />
          <stop offset="1" stopColor="#F5F7FF" />
        </linearGradient>
      </defs>
    </svg>
  );
}
function AudioWaveIcon({ size: size2 = 16 }) {
  const { t: t2 } = useTranslation();
  return (
    <CompositedSvg
      width={size2}
      height={size2}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-label={t2("canvas.audio")}
      role="img"
    >
      <path d="M8 2v12" />
      <path d="M4 5v6" />
      <path d="M12 5v6" />
      <path d="M2 7v2" />
      <path d="M6 4v8" />
      <path d="M10 4v8" />
      <path d="M14 7v2" />
    </CompositedSvg>
  );
}
const MEDIA_GRADIENTS = [
  "linear-gradient(135deg, #F5A06A 0%, #D4845C 45%, #A07DB8 100%)",
  "linear-gradient(180deg, #1A2744 0%, #2E4A6A 50%, #A08B6B 100%)",
  "linear-gradient(150deg, #2B3A5E 0%, #4A687A 50%, #C09870 100%)",
  "linear-gradient(135deg, #8B7EB0 0%, #88A0D4 50%, #E8B8C8 100%)",
  "linear-gradient(160deg, #2D4A3E 0%, #4A7A6A 50%, #B0C4A8 100%)",
  "linear-gradient(145deg, #E87461 0%, #F09078 50%, #F5C4A0 100%)",
  "linear-gradient(170deg, #0D1B3E 0%, #1E3A6E 50%, #4A7AB8 100%)",
  "linear-gradient(130deg, #F5B8A0 0%, #E89088 50%, #D06898 100%)",
  "linear-gradient(155deg, #3A4A5E 0%, #5A7A8E 50%, #8AACBE 100%)",
  "linear-gradient(140deg, #D4604A 0%, #E89044 40%, #F5C84A 100%)",
  "linear-gradient(165deg, #4A5B7A 0%, #7A9AB8 50%, #B8D4E8 100%)",
  "linear-gradient(150deg, #6A8A7A 0%, #8AAA98 50%, #B8D0C0 100%)",
  "linear-gradient(135deg, #6A4A3A 0%, #9A7A5A 50%, #C8AA80 100%)",
  "linear-gradient(145deg, #0A2A2E 0%, #1A5A4A 45%, #3ABA8A 100%)",
  "linear-gradient(160deg, #8A5A5E 0%, #C08A80 50%, #E8C0A8 100%)",
  "linear-gradient(140deg, #2A1A4E 0%, #5A3A8E 50%, #8A6ABE 100%)",
  "linear-gradient(150deg, #5A5050 0%, #8A7A70 50%, #BAA898 100%)",
  "linear-gradient(170deg, #1A3A5A 0%, #3A8AAA 45%, #7AD4E8 100%)",
  "linear-gradient(135deg, #5A1A1A 0%, #A03A2A 50%, #D87040 100%)",
  "linear-gradient(145deg, #7A6BB0 0%, #B888C8 45%, #E8ABD0 100%)",
];
function getGradientIndex(filename) {
  let hash2 = 0;
  for (let i2 = 0; i2 < filename.length; i2++) {
    hash2 = (hash2 * 31 + filename.charCodeAt(i2)) | 0;
  }
  return Math.abs(hash2) % MEDIA_GRADIENTS.length;
}
function FileMetadataHoverPreview({
  filename,
  anchorElement,
  anchorRect,
  action,
  onPreviewMouseEnter,
  onPreviewMouseLeave,
}) {
  const [previewHeight, setPreviewHeight] = reactExports.useState(
    action ? 88 : 48,
  );
  const contentRef = reactExports.useRef(null);
  reactExports.useLayoutEffect(() => {
    const content2 = contentRef.current;
    if (!content2) return;
    const measure = () =>
      setPreviewHeight(Math.ceil(content2.getBoundingClientRect().height) + 2);
    measure();
    const observer2 =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(measure);
    observer2?.observe(content2);
    return () => observer2?.disconnect();
  }, []);
  const { layout, previewRef, handlePreviewMouseLeave } = useHoverPreview({
    anchorElement,
    anchorRect,
    size: {
      width: PREVIEW_W,
      height: previewHeight,
    },
    fit: "independent",
    interactive: true,
    onPreviewMouseEnter,
    onPreviewMouseLeave,
  });
  return reactDomExports.createPortal(
    // biome-ignore lint/a11y/useSemanticElements: portal groups a file preview and its action.
    <div
      role="group"
      className="fixed z-[10002] box-border overflow-y-auto rounded-xl border border-[var(--canvas-controls-border)] bg-[var(--canvas-controls-bg)] text-[var(--canvas-controls-text)] shadow-md"
      ref={previewRef}
      style={{
        top: layout.top,
        left: layout.left,
        width: layout.width,
        maxHeight: layout.height,
      }}
      data-testid="file-chip-hover-preview"
      onMouseEnter={onPreviewMouseEnter}
      onMouseLeave={handlePreviewMouseLeave}
    >
      <div ref={contentRef}>
        <div className="px-3 py-3 text-xs">
          <section
            aria-label={filename}
            tabIndex={0}
            className="max-h-40 overflow-y-auto whitespace-pre-wrap [overflow-wrap:anywhere]"
            data-file-name-full={true}
          >
            {filename}
          </section>
        </div>
        {action && (
          <button
            type="button"
            className="mx-3 mb-3 rounded-md bg-muted px-3 py-1 text-xs hover:bg-accent"
            data-action-ui-id={action.actionUiId}
            onClick={(event) => {
              event.stopPropagation();
              action.onClick();
            }}
          >
            {action.label}
          </button>
        )}
      </div>
    </div>,
    document.body,
  );
}
function FileHoverPreview({
  filename,
  textPath,
  loadTextContent,
  onReadFull,
  kind,
  url: url2,
  posterUrl,
  anchorElement,
  anchorRect,
  durationSec,
  width,
  height,
  onDurationChange,
  onDimensionsChange,
  showMediaHoverFileName,
  action,
  previewAction,
  locateAction,
  onPreviewMouseEnter,
  onPreviewMouseLeave,
}) {
  if (kind !== "file") {
    return (
      <MediaHoverPreview
        kind={kind}
        showFileName={showMediaHoverFileName}
        url={url2 ?? ""}
        name={filename}
        durationSec={durationSec}
        posterUrl={posterUrl}
        width={width}
        height={height}
        anchorElement={anchorElement}
        anchorRect={anchorRect}
        testId="file-chip-hover-preview"
        onDurationChange={onDurationChange}
        onDimensionsChange={onDimensionsChange}
        action={action}
        previewAction={previewAction}
        locateAction={locateAction}
        onPreviewMouseEnter={onPreviewMouseEnter}
        onPreviewMouseLeave={onPreviewMouseLeave}
      />
    );
  }
  if (textPath && loadTextContent && /\.(txt|md|markdown)$/i.test(filename)) {
    return (
      <TextHoverPreview
        path={textPath}
        name={filename}
        loadTextContent={loadTextContent}
        onReadFull={onReadFull}
        anchorElement={anchorElement}
        anchorRect={anchorRect}
        action={action}
        onPreviewMouseEnter={onPreviewMouseEnter}
        onPreviewMouseLeave={onPreviewMouseLeave}
      />
    );
  }
  return (
    <FileMetadataHoverPreview
      filename={filename}
      anchorElement={anchorElement}
      anchorRect={anchorRect}
      action={action}
      onPreviewMouseEnter={onPreviewMouseEnter}
      onPreviewMouseLeave={onPreviewMouseLeave}
    />
  );
}
function fileTypeLabel(filename) {
  const dot2 = filename.lastIndexOf(".");
  if (dot2 < 0 || dot2 === filename.length - 1) return "FILE";
  return filename.slice(dot2 + 1).toUpperCase();
}
export function FileChip({
  filename,
  textPath,
  loadTextContent,
  active: active2 = true,
  imageUrl,
  mediaUrl,
  fileSize,
  fileType,
  videoThumbnailPath,
  dragSource,
  previewOnClick = false,
  previewFromHover = false,
  showMediaHoverFileName = true,
  previewFocused = false,
  onHoverLocate,
  suppressHoverPreview = false,
  onAnchorClick,
  hoverAction,
  layout = "auto",
  className,
}) {
  const { t: t2 } = useTranslation();
  const [durationSec, setDurationSec] = reactExports.useState(() =>
    mediaUrl ? mediaDurationCache.get(mediaUrl) : void 0,
  );
  const initialPreviewUrl = imageUrl ?? mediaUrl;
  const [loadedMediaDimensions, setLoadedMediaDimensions] =
    reactExports.useState(() => {
      if (!initialPreviewUrl) return null;
      const cached = mediaDimensionsCache.get(initialPreviewUrl);
      return cached
        ? {
            url: initialPreviewUrl,
            ...cached,
          }
        : null;
    });
  const [hoverPreviewOpen, setHoverPreviewOpen] = reactExports.useState(false);
  const [textReaderOpen, setTextReaderOpen] = reactExports.useState(false);
  reactExports.useEffect(() => {
    setHoverPreviewOpen(false);
    setTextReaderOpen(false);
  }, [active2, textPath, mediaUrl]);
  const handleReadFull = () => {
    setHoverPreviewOpen(false);
    setTextReaderOpen(true);
  };
  const textReader =
    textPath && loadTextContent && /\.(txt|md|markdown)$/i.test(filename) ? (
      <TextReadDialog
        open={textReaderOpen}
        onOpenChange={setTextReaderOpen}
        path={textPath}
        name={filename}
        loadTextContent={loadTextContent}
        active={active2}
      />
    ) : null;
  const previewCloseTimerRef = reactExports.useRef(null);
  const [chipEl, setChipEl] = reactExports.useState(null);
  const [failedImageUrl, setFailedImageUrl] = reactExports.useState(null);
  const [lightboxOpen, setLightboxOpen] = reactExports.useState(false);
  const gradient = MEDIA_GRADIENTS[getGradientIndex(filename)];
  const previewUrl = imageUrl ?? mediaUrl;
  const resolvedDragSource = reactExports.useMemo(
    () =>
      dragSource
        ? {
            ...dragSource,
            name: dragSource.name ?? filename,
          }
        : void 0,
    [dragSource, filename],
  );
  const videoPosterPath =
    videoThumbnailPath ?? resolvedDragSource?.relativePath;
  const videoPosterUrl =
    fileType === "video" && mediaUrl && videoPosterPath
      ? buildVideoThumbnailUrl(mediaUrl, videoPosterPath, 64)
      : void 0;
  const videoPosterFailed = videoPosterUrl === failedImageUrl;
  const showVideoPoster = Boolean(videoPosterUrl && !videoPosterFailed);
  const showLocalVideoFrame =
    fileType === "video" && Boolean(mediaUrl) && !showVideoPoster;
  const mediaDimensions =
    loadedMediaDimensions?.url === previewUrl
      ? loadedMediaDimensions
      : previewUrl
        ? mediaDimensionsCache.get(previewUrl)
        : void 0;
  const rememberMediaDimensions = reactExports.useCallback(
    (url2, width, height) => {
      if (
        !url2 ||
        !Number.isFinite(width) ||
        !Number.isFinite(height) ||
        width <= 0 ||
        height <= 0
      ) {
        return;
      }
      const dimensions2 = {
        width,
        height,
      };
      mediaDimensionsCache.set(url2, dimensions2);
      setLoadedMediaDimensions({
        url: url2,
        ...dimensions2,
      });
    },
    [],
  );
  const rememberDuration = reactExports.useCallback(
    (seconds) => {
      if (!Number.isFinite(seconds) || seconds <= 0) return;
      if (mediaUrl) mediaDurationCache.set(mediaUrl, seconds);
      setDurationSec(seconds);
    },
    [mediaUrl],
  );
  const handleInlineVideoLoadedMetadata = reactExports.useCallback(
    (event) => {
      const video = event.currentTarget;
      rememberDuration(video.duration);
      rememberMediaDimensions(mediaUrl, video.videoWidth, video.videoHeight);
      try {
        video.currentTime = 1e-3;
      } catch {}
    },
    [mediaUrl, rememberDuration, rememberMediaDimensions],
  );
  const canDrag = resolvedDragSource
    ? canWriteResourceDragData(resolvedDragSource)
    : false;
  const clearPreviewCloseTimer = reactExports.useCallback(() => {
    if (previewCloseTimerRef.current === null) return;
    clearTimeout(previewCloseTimerRef.current);
    previewCloseTimerRef.current = null;
  }, []);
  const openHoverPreview = reactExports.useCallback(() => {
    clearPreviewCloseTimer();
    setHoverPreviewOpen(true);
  }, [clearPreviewCloseTimer]);
  const closeHoverPreview = reactExports.useCallback(() => {
    clearPreviewCloseTimer();
    setHoverPreviewOpen(false);
  }, [clearPreviewCloseTimer]);
  const scheduleHoverPreviewClose = reactExports.useCallback(() => {
    clearPreviewCloseTimer();
    previewCloseTimerRef.current = setTimeout(() => {
      setHoverPreviewOpen(false);
      previewCloseTimerRef.current = null;
    }, INTERACTIVE_PREVIEW_CLOSE_DELAY_MS);
  }, [clearPreviewCloseTimer]);
  reactExports.useEffect(() => {
    if (previewFocused) openHoverPreview();
    else scheduleHoverPreviewClose();
  }, [previewFocused, openHoverPreview, scheduleHoverPreviewClose]);
  const interactiveHoverAction = reactExports.useMemo(
    () =>
      hoverAction
        ? {
            ...hoverAction,
            onClick: () => {
              closeHoverPreview();
              hoverAction.onClick();
            },
          }
        : void 0,
    [closeHoverPreview, hoverAction],
  );
  reactExports.useEffect(
    () => clearPreviewCloseTimer,
    [clearPreviewCloseTimer],
  );
  const handleDragStart = reactExports.useCallback(
    (event) => {
      if (
        !resolvedDragSource ||
        !writeResourceDragData(event, resolvedDragSource)
      ) {
        event.preventDefault();
        return;
      }
      setHoverPreviewOpen(false);
    },
    [resolvedDragSource],
  );
  const previewKind = imageUrl
    ? "image"
    : fileType === "video" && mediaUrl
      ? "video"
      : fileType === "audio"
        ? "audio"
        : "file";
  const showHoverPreview =
    active2 &&
    hoverPreviewOpen &&
    chipEl &&
    !lightboxOpen &&
    !textReaderOpen &&
    !suppressHoverPreview;
  reactExports.useEffect(() => {
    if (!hoverPreviewOpen || !chipEl) return;
    const close2 = (event) => {
      if (
        event?.target instanceof Element &&
        event.target.closest(
          '[data-testid="file-chip-hover-preview"], [data-testid="text-hover-preview"]',
        )
      )
        return;
      setHoverPreviewOpen(false);
    };
    document.addEventListener("scroll", close2, {
      capture: true,
      passive: true,
    });
    const handleEscape = (event) => {
      if (event.key === "Escape") close2();
    };
    document.addEventListener("keydown", handleEscape);
    window.addEventListener("blur", close2);
    return () => {
      document.removeEventListener("scroll", close2, {
        capture: true,
      });
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("blur", close2);
    };
  }, [hoverPreviewOpen, chipEl]);
  const imageLoadFailed = imageUrl === failedImageUrl;
  const duration = durationSec ? formatDuration(durationSec) : "";
  const badge = duration ? (
    <span
      data-slot-duration="true"
      className={cn(
        "absolute bottom-[2px] right-[2px] rounded-[4px] px-1 text-[10px] leading-normal bg-black/65 text-white tabular-nums pointer-events-none transition-[visibility] duration-0 delay-150",
        onAnchorClick &&
          "group-hover/file-chip:invisible group-hover/file-chip:delay-0 group-focus-within/file-chip:invisible group-focus-within/file-chip:delay-0",
      )}
    >
      {duration}
    </span>
  ) : null;
  const tileClass = cn(
    "group/file-chip relative flex items-center justify-center w-16 h-16 shrink-0 overflow-hidden rounded-md border border-border bg-muted/40 text-muted-foreground transition-colors duration-150",
    canDrag && "cursor-grab active:cursor-grabbing",
    className,
  );
  const canOpenLightbox =
    (previewOnClick || previewFromHover) &&
    !!previewUrl &&
    (previewKind === "image" || previewKind === "video");
  const openLightbox = reactExports.useCallback(() => {
    if (!canOpenLightbox) return;
    setHoverPreviewOpen(false);
    setLightboxOpen(true);
  }, [canOpenLightbox]);
  const handleKeyDown2 = reactExports.useCallback(
    (event) => {
      if (!canOpenLightbox) return;
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openLightbox();
      }
    },
    [canOpenLightbox, openLightbox],
  );
  const lightbox =
    lightboxOpen &&
    canOpenLightbox &&
    previewUrl &&
    (previewKind === "image" || previewKind === "video") ? (
      <MediaLightbox
        kind={previewKind}
        src={previewUrl}
        alt={filename}
        onClose={() => setLightboxOpen(false)}
      />
    ) : null;
  const renderAnchorButton = (buttonClassName) =>
    onAnchorClick ? (
      <button
        type="button"
        aria-label={t2("chat.fileChip.locateOnCanvas", "在画布上定位")}
        title={t2("chat.fileChip.locateOnCanvas", "在画布上定位")}
        data-action-ui-id="chat.fileChip.locateOnCanvas"
        onClick={(e2) => {
          e2.stopPropagation();
          onAnchorClick();
        }}
        className={cn(
          "size-6 inline-flex items-center justify-center rounded text-tertiary opacity-0 group-hover/file-chip:opacity-100 focus-visible:opacity-100 hover:text-foreground transition-opacity focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          buttonClassName,
        )}
      >
        <Icon icon={Crosshair} size="sm" />
      </button>
    ) : null;
  const mediaAnchorButton = renderAnchorButton(
    "absolute right-1 top-1 z-10 bg-background/80 hover:bg-muted/90 backdrop-blur-sm",
  );
  const tileProps = {
    ref: setChipEl,
    "data-testid": "file-chip",
    "data-file-chip-layout": "tile",
    draggable: canDrag,
    role: previewOnClick && canOpenLightbox ? "button" : void 0,
    tabIndex: previewOnClick && canOpenLightbox ? 0 : void 0,
    onClick: previewOnClick && canOpenLightbox ? openLightbox : void 0,
    onKeyDown: previewOnClick && canOpenLightbox ? handleKeyDown2 : void 0,
    onDragStart: handleDragStart,
    onMouseEnter: openHoverPreview,
    onFocus: openHoverPreview,
    onBlur: scheduleHoverPreviewClose,
    onMouseLeave: scheduleHoverPreviewClose,
  };
  if (imageUrl) {
    return (
      <div className={tileClass} {...tileProps}>
        {mediaAnchorButton}
        {imageLoadFailed ? (
          <div className="flex min-w-0 flex-col items-center justify-center gap-1 px-1 text-muted-foreground">
            <FileTypeIcon
              {...classifyFileType({
                filename,
                mediaKind: "image",
              })}
              size={24}
              decorative={true}
            />
            <span className="max-w-full truncate text-[10px] leading-none">
              {filename}
            </span>
          </div>
        ) : (
          <DeferredThumbnailImage
            src={imageUrl}
            alt={filename}
            onLoad={(event) =>
              rememberMediaDimensions(
                imageUrl,
                event.currentTarget.naturalWidth,
                event.currentTarget.naturalHeight,
              )
            }
            className="w-full h-full object-cover pointer-events-none transition-transform duration-150 group-hover/file-chip:scale-[1.03] motion-reduce:transform-none"
            onFailure={() => setFailedImageUrl(imageUrl)}
          />
        )}
        {showHoverPreview && (
          <FileHoverPreview
            filename={filename}
            kind="image"
            url={previewUrl}
            durationSec={durationSec}
            width={mediaDimensions?.width}
            height={mediaDimensions?.height}
            anchorElement={chipEl}
            anchorRect={chipEl.getBoundingClientRect()}
            onDimensionsChange={({ width, height }) =>
              rememberMediaDimensions(imageUrl, width, height)
            }
            showMediaHoverFileName={showMediaHoverFileName}
            action={interactiveHoverAction}
            previewAction={
              previewFromHover && canOpenLightbox
                ? {
                    label: t2("canvas.fullscreenPreview"),
                    onClick: openLightbox,
                  }
                : void 0
            }
            locateAction={
              onHoverLocate
                ? {
                    label: t2("chat.fileChip.locateOnCanvas"),
                    onClick: () => {
                      closeHoverPreview();
                      onHoverLocate();
                    },
                  }
                : void 0
            }
            onPreviewMouseEnter={openHoverPreview}
            onPreviewMouseLeave={scheduleHoverPreviewClose}
          />
        )}
        {lightbox}
      </div>
    );
  }
  if (fileType === "video") {
    return (
      <div
        className={tileClass}
        style={
          !videoPosterUrl
            ? {
                background: gradient,
              }
            : void 0
        }
        {...tileProps}
      >
        {mediaAnchorButton}
        {showVideoPoster ? (
          <DeferredThumbnailImage
            src={videoPosterUrl}
            alt={filename}
            onLoad={(event) =>
              rememberMediaDimensions(
                mediaUrl,
                event.currentTarget.naturalWidth,
                event.currentTarget.naturalHeight,
              )
            }
            onFailure={() => {
              if (videoPosterUrl) setFailedImageUrl(videoPosterUrl);
            }}
            className="w-full h-full object-cover pointer-events-none transition-transform duration-150 group-hover/file-chip:scale-[1.03] motion-reduce:transform-none"
          />
        ) : showLocalVideoFrame && mediaUrl ? (
          // If the server poster is unavailable, let Chromium paint the
          // decoded first frame instead of showing the generic fallback.
          <video
            src={mediaUrl}
            muted={true}
            playsInline={true}
            preload="metadata"
            onLoadedMetadata={handleInlineVideoLoadedMetadata}
            onLoadedData={(event) => {
              const video = event.currentTarget;
              if (video.currentTime > 0) return;
              try {
                video.currentTime = 1e-3;
              } catch {}
            }}
            aria-label={filename}
            className="h-full w-full appearance-none border-0 object-cover outline-none ring-0 shadow-none pointer-events-none transition-transform duration-150 group-hover/file-chip:scale-[1.03] motion-reduce:transform-none"
          >
            <track kind="captions" />
          </video>
        ) : (
          <VideoIcon size={17} />
        )}
        {showVideoPoster || showLocalVideoFrame ? (
          <VideoPlayIndicator size={18} />
        ) : null}
        {showVideoPoster &&
        mediaUrl &&
        (durationSec === void 0 || mediaDimensions === void 0) ? (
          // Keep duration independent from hover. The visible poster remains
          // an image, while this metadata-only probe avoids decoding another
          // video frame until the user opens the hover preview. The probe is
          // one-shot: once duration and dimensions are known (and cached per
          // URL) it unmounts instead of holding an extra media element per chip.
          <video
            src={mediaUrl}
            muted={true}
            playsInline={true}
            preload="metadata"
            onLoadedMetadata={handleInlineVideoLoadedMetadata}
            aria-hidden="true"
            tabIndex={-1}
            className="pointer-events-none absolute size-px opacity-0"
          >
            <track kind="captions" />
          </video>
        ) : null}
        {badge}
        {showHoverPreview && (
          <FileHoverPreview
            filename={filename}
            kind={previewKind}
            url={previewUrl}
            posterUrl={videoPosterUrl}
            durationSec={durationSec}
            width={mediaDimensions?.width}
            height={mediaDimensions?.height}
            anchorElement={chipEl}
            anchorRect={chipEl.getBoundingClientRect()}
            onDurationChange={rememberDuration}
            onDimensionsChange={({ width, height }) =>
              rememberMediaDimensions(mediaUrl, width, height)
            }
            showMediaHoverFileName={showMediaHoverFileName}
            action={interactiveHoverAction}
            previewAction={
              previewFromHover && canOpenLightbox
                ? {
                    label: t2("canvas.fullscreenPreview"),
                    onClick: openLightbox,
                  }
                : void 0
            }
            locateAction={
              onHoverLocate
                ? {
                    label: t2("chat.fileChip.locateOnCanvas"),
                    onClick: () => {
                      closeHoverPreview();
                      onHoverLocate();
                    },
                  }
                : void 0
            }
            onPreviewMouseEnter={openHoverPreview}
            onPreviewMouseLeave={scheduleHoverPreviewClose}
          />
        )}
        {lightbox}
      </div>
    );
  }
  if (fileType === "audio") {
    return (
      <div className={tileClass} {...tileProps}>
        {mediaAnchorButton}
        {mediaUrl && durationSec === void 0 && (
          // biome-ignore lint/a11y/useMediaCaption: hidden metadata probe, not a playback control
          <audio
            src={mediaUrl}
            preload="metadata"
            onLoadedMetadata={(e2) =>
              rememberDuration(e2.currentTarget.duration)
            }
          />
        )}
        <div className="flex min-w-0 flex-col items-center justify-center gap-1 px-1 text-muted-foreground">
          <AudioWaveIcon size={18} />
          <span className="max-w-full truncate text-[10px] leading-none">
            {filename}
          </span>
        </div>
        {badge}
        {showHoverPreview && (
          <FileHoverPreview
            filename={filename}
            kind="audio"
            url={previewUrl}
            durationSec={durationSec}
            anchorElement={chipEl}
            anchorRect={chipEl.getBoundingClientRect()}
            action={interactiveHoverAction}
            showMediaHoverFileName={showMediaHoverFileName}
            previewAction={
              previewFromHover && canOpenLightbox
                ? {
                    label: t2("canvas.fullscreenPreview"),
                    onClick: openLightbox,
                  }
                : void 0
            }
            locateAction={
              onHoverLocate
                ? {
                    label: t2("chat.fileChip.locateOnCanvas"),
                    onClick: () => {
                      closeHoverPreview();
                      onHoverLocate();
                    },
                  }
                : void 0
            }
            onPreviewMouseEnter={openHoverPreview}
            onPreviewMouseLeave={scheduleHoverPreviewClose}
          />
        )}
      </div>
    );
  }
  if (layout === "tile") {
    return (
      <div className={tileClass} {...tileProps}>
        {textReader}
        {mediaAnchorButton}
        <div className="flex min-w-0 flex-col items-center justify-center gap-1 px-1 text-muted-foreground">
          <FileTypeIcon
            {...classifyFileType({
              filename,
            })}
            size={24}
            decorative={true}
          />
          <span className="max-w-full truncate text-[10px] leading-none">
            {filename}
          </span>
        </div>
        {showHoverPreview && (
          <FileHoverPreview
            filename={filename}
            kind="file"
            textPath={textPath}
            loadTextContent={loadTextContent}
            onReadFull={handleReadFull}
            action={interactiveHoverAction}
            showMediaHoverFileName={showMediaHoverFileName}
            onPreviewMouseEnter={openHoverPreview}
            onPreviewMouseLeave={scheduleHoverPreviewClose}
            url={previewUrl}
            anchorElement={chipEl}
            anchorRect={chipEl.getBoundingClientRect()}
          />
        )}
      </div>
    );
  }
  const sizeLabel = formatFileSizeCompact(fileSize);
  const meta2 = sizeLabel
    ? `${fileTypeLabel(filename)} · ${sizeLabel}`
    : fileTypeLabel(filename);
  return (
    // biome-ignore lint/a11y/useSemanticElements: groups file metadata and actions, not form fields.
    <div
      ref={setChipEl}
      data-testid="file-chip"
      data-file-chip-layout="card"
      role="group"
      aria-label={filename}
      tabIndex={chipEl?.closest("button") ? void 0 : 0}
      onMouseEnter={openHoverPreview}
      onMouseLeave={scheduleHoverPreviewClose}
      onFocus={openHoverPreview}
      onBlur={scheduleHoverPreviewClose}
      draggable={canDrag}
      onDragStart={handleDragStart}
      className={cn(
        "group/file-chip relative flex items-center gap-1.5 p-1.5 rounded-md border border-border w-full min-w-0",
        canDrag && "cursor-grab active:cursor-grabbing",
        className,
      )}
    >
      <div className="shrink-0 flex items-center justify-center size-8 rounded bg-muted">
        <FileTypeIcon
          {...classifyFileType({
            filename,
          })}
          size={24}
          decorative={true}
        />
      </div>
      <div className="min-w-0 flex-1 flex flex-col gap-1">
        <FileNameLabel
          name={filename}
          tooltip={false}
          className="text-xs text-foreground/70"
        />
        <span className="truncate text-[11px] text-foreground/30">{meta2}</span>
      </div>
      {textReader}
      {renderAnchorButton("shrink-0 mr-1 hover:bg-muted/60")}
      {showHoverPreview && (
        <FileHoverPreview
          filename={filename}
          kind="file"
          textPath={textPath}
          loadTextContent={loadTextContent}
          onReadFull={handleReadFull}
          anchorElement={chipEl}
          anchorRect={chipEl.getBoundingClientRect()}
          action={interactiveHoverAction}
          showMediaHoverFileName={showMediaHoverFileName}
          onPreviewMouseEnter={openHoverPreview}
          onPreviewMouseLeave={scheduleHoverPreviewClose}
        />
      )}
    </div>
  );
}
