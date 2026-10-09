// video-lightbox.jsx
import {
  Archive,
  ChevronLeft,
  ChevronRight$1,
  jsxRuntimeExports,
  reactExports,
  useTranslation,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { Download, FolderOpen, useCanvasActive } from "./package.jsx";
import {
  getCanvasFileManagerLabelKey,
  LightboxActionButton,
  normalizeLegacyLightboxItems,
} from "./use-warn-missing-asset-meta.jsx";
import { useLightboxMediaActions } from "./use-lightbox-media-actions.jsx";
import { MediaLightbox$1 } from "./media-lightbox.jsx";
import { resolveVideoPlaybackUrl } from "../generation/to-workspace-browser-url.js";
import { cn$5 } from "../infra/dialog-content.jsx";

const VIDEO_LIGHTBOX_MAX_WIDTH_RATIO = 0.8;

const VIDEO_LIGHTBOX_MAX_HEIGHT_RATIO = 0.8;

const VIDEO_LIGHTBOX_VERTICAL_RESERVED_PX = 176;

const VIDEO_LIGHTBOX_MIN_HEIGHT_PX = 240;

const DEFAULT_VIDEO_ASPECT_RATIO = 16 / 9;

function clampIndex$1(value, length2) {
  if (length2 <= 0) return 0;
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(Math.floor(value), 0), length2 - 1);
}

function getViewportSize() {
  if (typeof window === "undefined") {
    return {
      width: 1280,
      height: 720,
    };
  }
  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
}

function getVideoDisplaySize(viewport, naturalSize) {
  const naturalAspect =
    naturalSize && naturalSize.width > 0 && naturalSize.height > 0
      ? naturalSize.width / naturalSize.height
      : DEFAULT_VIDEO_ASPECT_RATIO;
  const maxWidth = viewport.width * VIDEO_LIGHTBOX_MAX_WIDTH_RATIO;
  const maxHeight = Math.max(
    VIDEO_LIGHTBOX_MIN_HEIGHT_PX,
    Math.min(
      viewport.height * VIDEO_LIGHTBOX_MAX_HEIGHT_RATIO,
      viewport.height - VIDEO_LIGHTBOX_VERTICAL_RESERVED_PX,
    ),
  );
  const width = Math.min(maxWidth, maxHeight * naturalAspect);
  return {
    width,
    height: width / naturalAspect,
  };
}

function normalizePlaybackTime(currentTime, duration) {
  if (
    currentTime === void 0 ||
    !Number.isFinite(currentTime) ||
    currentTime < 0
  )
    return 0;
  if (duration !== void 0 && Number.isFinite(duration) && duration > 0) {
    return Math.min(currentTime, duration);
  }
  return currentTime;
}

export const VideoLightbox = reactExports.memo(function VideoLightbox2({
  src,
  sources,
  item,
  items,
  initialIndex = 0,
  ariaLabel,
  showShadow = true,
  initialPlaybackTime,
  onPlaybackTimeCommit,
  actions = [],
  onClose,
}) {
  const { t: t2 } = useTranslation();
  const active2 = useCanvasActive();
  const videoItems = reactExports.useMemo(
    () => normalizeLegacyLightboxItems("video", items, item, sources, src),
    [items, item, sources, src],
  );
  const [index2, setIndex] = reactExports.useState(() =>
    clampIndex$1(initialIndex, videoItems.length),
  );
  const [loadedVideoSize, setLoadedVideoSize] = reactExports.useState(null);
  const [viewport, setViewport] = reactExports.useState(getViewportSize);
  const total = videoItems.length;
  const isMulti = total > 1;
  const current2 = videoItems[index2] ?? videoItems[0];
  const activeSrc = current2?.url ? resolveVideoPlaybackUrl(current2.url) : "";
  const videoRef = reactExports.useRef(null);
  const initialPlaybackTargetRef = reactExports.useRef({
    src: activeSrc,
    currentTime: normalizePlaybackTime(initialPlaybackTime),
    applied: false,
  });
  const naturalSize =
    loadedVideoSize?.src === activeSrc ? loadedVideoSize : null;
  const displaySize = reactExports.useMemo(
    () => getVideoDisplaySize(viewport, naturalSize),
    [viewport, naturalSize],
  );
  const downloadLabel = t2("canvas.lightbox.downloadCurrent");
  const downloadAllLabel = t2("canvas.lightbox.downloadAll");
  const showInFolderLabel = t2(getCanvasFileManagerLabelKey());
  const {
    canSave,
    canSaveAll,
    canReveal,
    handleDownload,
    handleDownloadAll,
    handleShowInFolder,
    handleContextMenu,
    contextMenu,
  } = useLightboxMediaActions({
    item: current2,
    items: videoItems,
  });
  const goPrev = reactExports.useCallback(() => {
    if (total <= 1) return;
    setIndex((current22) => (current22 - 1 + total) % total);
  }, [total]);
  const goNext = reactExports.useCallback(() => {
    if (total <= 1) return;
    setIndex((current22) => (current22 + 1) % total);
  }, [total]);
  const handlePrevClick = reactExports.useCallback(
    (e2) => {
      e2.stopPropagation();
      goPrev();
    },
    [goPrev],
  );
  const handleNextClick = reactExports.useCallback(
    (e2) => {
      e2.stopPropagation();
      goNext();
    },
    [goNext],
  );
  const applyInitialPlaybackTime = reactExports.useCallback(
    (video) => {
      const target = initialPlaybackTargetRef.current;
      if (target.applied || target.src !== activeSrc) return;
      try {
        video.currentTime = normalizePlaybackTime(
          target.currentTime,
          video.duration,
        );
        target.applied = true;
      } catch {}
    },
    [activeSrc],
  );
  const handleClose = reactExports.useCallback(() => {
    const video = videoRef.current;
    const target = initialPlaybackTargetRef.current;
    if (target.src !== activeSrc) {
      onClose();
      return;
    }
    const currentTime = !target.applied
      ? target.currentTime
      : normalizePlaybackTime(video?.currentTime, video?.duration);
    try {
      onPlaybackTimeCommit?.(currentTime);
    } finally {
      onClose();
    }
  }, [activeSrc, onClose, onPlaybackTimeCommit]);
  reactExports.useEffect(() => {
    setIndex(clampIndex$1(initialIndex, videoItems.length));
  }, [initialIndex, videoItems.length]);
  reactExports.useEffect(() => {
    const handleResize = () => {
      setViewport(getViewportSize());
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  reactExports.useEffect(() => {
    if (!isMulti || !active2) return;
    const handler = (e2) => {
      if (e2.key === "ArrowLeft") {
        e2.preventDefault();
        goPrev();
      } else if (e2.key === "ArrowRight") {
        e2.preventDefault();
        goNext();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isMulti, active2, goPrev, goNext]);
  if (!activeSrc) return null;
  return (
    <MediaLightbox$1
      onClose={handleClose}
      onContextMenu={handleContextMenu}
      ariaLabel={ariaLabel}
    >
      <div className="pointer-events-none relative isolate flex max-h-[calc(100vh-8rem)] max-w-[calc(100vw-8rem)] flex-col items-center justify-center gap-3">
        <div
          className="pointer-events-auto relative z-0 flex cursor-default items-center justify-center"
          onClick={(event) => event.stopPropagation()}
          data-action-ui-id="canvas.video-lightbox.media-frame"
        >
          <video
            key={activeSrc}
            ref={videoRef}
            src={activeSrc}
            className={cn$5(
              "block rounded-lg bg-black",
              showShadow && "shadow-[0_8px_32px_rgba(0,0,0,0.5)]",
            )}
            style={{
              width: displaySize.width,
              height: displaySize.height,
            }}
            controls={true}
            autoPlay={true}
            playsInline={true}
            tabIndex={0}
            draggable={false}
            onLoadedMetadata={(event) => {
              const video = event.currentTarget;
              applyInitialPlaybackTime(video);
              if (video.videoWidth > 0 && video.videoHeight > 0) {
                setLoadedVideoSize({
                  src: activeSrc,
                  width: video.videoWidth,
                  height: video.videoHeight,
                });
              }
            }}
            onCanPlay={(event) => applyInitialPlaybackTime(event.currentTarget)}
          />
        </div>
        {(isMulti ||
          canSave ||
          canSaveAll ||
          canReveal ||
          actions.length > 0) && (
          <div
            className="pointer-events-none relative z-50 flex min-h-8 w-full max-w-[80vw] items-center justify-center"
            data-action-ui-id="canvas.video-lightbox.actions"
          >
            {isMulti && (
              <div
                className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 px-1 text-[11px] text-white/60 tabular-nums"
                data-action-ui-id="canvas.video-lightbox.counter"
              >
                {index2 + 1}
                {" / "}
                {total}
              </div>
            )}
            {(canSave || canSaveAll || canReveal || actions.length > 0) && (
              <div
                className="pointer-events-auto flex flex-wrap items-center justify-center gap-2"
                data-action-ui-id="canvas.video-lightbox.action-group"
              >
                {canSave && (
                  <LightboxActionButton
                    label={downloadLabel}
                    icon={Download}
                    dataActionUiId="canvas.video-lightbox.download"
                    onClick={handleDownload}
                  />
                )}
                {canSaveAll && (
                  <LightboxActionButton
                    label={downloadAllLabel}
                    icon={Archive}
                    dataActionUiId="canvas.video-lightbox.download-all"
                    onClick={handleDownloadAll}
                  />
                )}
                {canReveal && (
                  <LightboxActionButton
                    label={showInFolderLabel}
                    icon={FolderOpen}
                    dataActionUiId="canvas.video-lightbox.show-in-folder"
                    onClick={handleShowInFolder}
                  />
                )}
                {actions.map((action) => (
                  <LightboxActionButton
                    key={action.id}
                    label={action.label}
                    iconElement={action.icon}
                    dataActionUiId={action.id}
                    className={action.className}
                    disabled={action.disabled}
                    busy={action.busy}
                    onClick={(event) => {
                      action.onClick(event);
                      if (action.closeOnClick) handleClose();
                    }}
                  />
                ))}
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
            aria-label={t2(
              "canvas.videoLightbox.previousVideo",
              "Previous video",
            )}
            data-action-ui-id="canvas.video-lightbox.prev"
            className="absolute left-8 top-1/2 z-50 -translate-y-1/2 flex items-center justify-center w-10 h-10 rounded-full bg-black/55 hover:bg-black/70 text-white/80 hover:text-white transition-colors cursor-pointer pointer-events-auto"
            onClick={handlePrevClick}
          >
            <ChevronLeft size={18} strokeWidth={1.5} aria-hidden={true} />
          </button>
          <button
            type="button"
            aria-label={t2("canvas.videoLightbox.nextVideo", "Next video")}
            data-action-ui-id="canvas.video-lightbox.next"
            className="absolute right-8 top-1/2 z-50 -translate-y-1/2 flex items-center justify-center w-10 h-10 rounded-full bg-black/55 hover:bg-black/70 text-white/80 hover:text-white transition-colors cursor-pointer pointer-events-auto"
            onClick={handleNextClick}
          >
            <ChevronRight$1 size={18} strokeWidth={1.5} aria-hidden={true} />
          </button>
        </>
      )}
    </MediaLightbox$1>
  );
});
