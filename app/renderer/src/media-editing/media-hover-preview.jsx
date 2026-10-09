// media-hover-preview.jsx
import {
  CompositedSvg,
  Crosshair,
  Maximize,
  reactDomExports,
  reactExports,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { AudioPreviewPlayer } from "./audio-preview-player.jsx";
import { useHoverPreview } from "./use-hover-preview.js";
import { formatTime$2, useCanvasBridge } from "./package.jsx";
import { Tooltip$1 } from "../generation/missing-asset-card.jsx";

const PREVIEW_MAX_W = 180;

const PREVIEW_MAX_H$1 = 240;

const PREVIEW_FALLBACK_W = 180;

const PREVIEW_FALLBACK_H = 135;

function hasValidMediaSize(size2) {
  return (
    typeof size2.width === "number" &&
    typeof size2.height === "number" &&
    Number.isFinite(size2.width) &&
    Number.isFinite(size2.height) &&
    size2.width > 0 &&
    size2.height > 0
  );
}

function getMediaPreviewSize(width, height) {
  const intrinsicSize = {
    width,
    height,
  };
  if (!hasValidMediaSize(intrinsicSize)) {
    return {
      width: PREVIEW_FALLBACK_W,
      height: PREVIEW_FALLBACK_H,
    };
  }
  const scale2 = Math.min(
    PREVIEW_MAX_W / intrinsicSize.width,
    PREVIEW_MAX_H$1 / intrinsicSize.height,
  );
  return {
    width: Math.max(1, Math.round(intrinsicSize.width * scale2)),
    height: Math.max(1, Math.round(intrinsicSize.height * scale2)),
  };
}

function getInteractiveMediaPreviewSize(size2) {
  return {
    width: Math.max(144, size2.width),
    height: Math.max(72, size2.height),
  };
}

const AUDIO_PREVIEW_W = 320;

const AUDIO_PREVIEW_H_FALLBACK = 108;

const AUDIO_PREVIEW_ACTION_H = 32;

function ReferenceAudioIcon$2() {
  return (
    <CompositedSvg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
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

export function MediaHoverPreview({
  kind,
  active: active2 = true,
  url: url2,
  name: name2,
  showFileName = false,
  description,
  durationSec,
  posterUrl,
  width: intrinsicWidth,
  height: intrinsicHeight,
  anchorRect,
  anchorElement,
  testId = "media-hover-preview",
  onDurationChange,
  onDimensionsChange,
  action,
  locateAction,
  previewAction,
  onPreviewMouseEnter,
  onPreviewMouseLeave,
}) {
  const bridge = useCanvasBridge();
  const effectiveActive = active2 && bridge.previewActive !== false;
  const isAudio = kind === "audio";
  const [audioDuration, setAudioDuration] = reactExports.useState(
    durationSec ?? 0,
  );
  const [loadedMedia, setLoadedMedia] = reactExports.useState(null);
  const loadedMediaForCurrentUrl =
    loadedMedia?.url === url2 ? loadedMedia : null;
  reactExports.useEffect(() => {
    setAudioDuration(durationSec ?? 0);
  }, [durationSec, url2]);
  const mediaSize = getMediaPreviewSize(
    loadedMediaForCurrentUrl?.width ?? intrinsicWidth,
    loadedMediaForCurrentUrl?.height ?? intrinsicHeight,
  );
  const previewSize = isAudio
    ? {
        width: AUDIO_PREVIEW_W,
        height:
          AUDIO_PREVIEW_H_FALLBACK + (action ? AUDIO_PREVIEW_ACTION_H : 0),
      }
    : !isAudio && (action || locateAction || previewAction)
      ? getInteractiveMediaPreviewSize(mediaSize)
      : mediaSize;
  const interactive = Boolean(
    isAudio ||
    showFileName ||
    action ||
    locateAction ||
    previewAction ||
    onPreviewMouseEnter,
  );
  const { layout, previewRef, handlePreviewMouseLeave } = useHoverPreview({
    anchorElement,
    anchorRect,
    size: previewSize,
    fit: isAudio ? "independent" : "contain",
    interactive,
    onPreviewMouseEnter,
    onPreviewMouseLeave,
  });
  const { top: top2, left, width, height } = layout;
  const paddedImage = width !== mediaSize.width || height !== mediaSize.height;
  const effectiveDuration = audioDuration || durationSec || 0;
  const durationLabel =
    Number.isFinite(effectiveDuration) && effectiveDuration > 0
      ? kind === "video"
        ? `${effectiveDuration.toFixed(2)}s`
        : formatTime$2(effectiveDuration, true)
      : void 0;
  const handleImageLoad = reactExports.useCallback(
    (e2) => {
      const image2 = e2.currentTarget;
      const loadedSize = {
        width: image2.naturalWidth,
        height: image2.naturalHeight,
      };
      if (hasValidMediaSize(loadedSize)) {
        setLoadedMedia({
          url: url2,
          ...loadedSize,
        });
        onDimensionsChange?.(loadedSize);
      }
    },
    [onDimensionsChange, url2],
  );
  const handleVideoLoadedMetadata = reactExports.useCallback(
    (e2) => {
      const video = e2.currentTarget;
      const loadedSize = {
        width: video.videoWidth,
        height: video.videoHeight,
      };
      if (hasValidMediaSize(loadedSize)) {
        setLoadedMedia({
          url: url2,
          ...loadedSize,
        });
        onDimensionsChange?.(loadedSize);
      }
      if (Number.isFinite(video.duration) && video.duration > 0) {
        onDurationChange?.(video.duration);
      }
      try {
        video.currentTime = 1e-3;
      } catch {}
    },
    [onDimensionsChange, onDurationChange, url2],
  );
  if (!effectiveActive) return null;
  return reactDomExports.createPortal(
    // biome-ignore lint/a11y/useSemanticElements: this portal groups media with an optional action; fieldset is not appropriate here.
    <div
      ref={previewRef}
      role="group"
      className={`fixed z-[10002] box-border ${isAudio ? "flex flex-col rounded-[16px] border border-[var(--canvas-node-border)]" : "rounded-lg border-0"} overflow-hidden ${isAudio ? "bg-[var(--canvas-node-bg)]" : "bg-[var(--canvas-controls-bg)]"} shadow-md ${interactive ? "pointer-events-auto" : "pointer-events-none"}`}
      style={{
        top: top2,
        left,
        width,
        height,
      }}
      data-testid={testId}
      data-canvas-chrome="true"
      onMouseEnter={onPreviewMouseEnter}
      onMouseLeave={handlePreviewMouseLeave}
      onWheel={(event) => event.stopPropagation()}
    >
      {kind === "image" && (
        <img
          src={url2}
          alt={name2}
          onLoad={handleImageLoad}
          className={`block w-full h-full ${paddedImage ? "object-contain" : "object-cover"}`}
        />
      )}
      {kind === "video" && (
        // muted + autoplay + loop:自动循环播放,无需用户交互;
        // playsInline 防止 iOS 全屏;preload="metadata" 让首帧尽快可见。
        <video
          src={url2}
          poster={posterUrl}
          muted={true}
          autoPlay={true}
          loop={true}
          playsInline={true}
          preload="metadata"
          onLoadedMetadata={handleVideoLoadedMetadata}
          className={`block h-full w-full appearance-none border-0 ${paddedImage ? "object-contain" : "object-cover"} outline-none ring-0 shadow-none`}
        >
          <track kind="captions" />
        </video>
      )}
      {kind === "video" && durationLabel && !showFileName && (
        <span className="pointer-events-none absolute top-2 left-2 rounded px-1 py-0.5 text-[10px] leading-none tabular-nums bg-[var(--canvas-media-control-bg)] text-[var(--canvas-media-control-fg)]">
          {durationLabel}
        </span>
      )}
      {isAudio && (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 pt-3 text-xs text-[var(--canvas-controls-text)]">
          <div className="flex w-full min-w-0 items-start gap-2">
            <span className="shrink-0 text-[var(--canvas-controls-text)]">
              <ReferenceAudioIcon$2 />
            </span>
            {showFileName && (
              <span
                data-testid="preview-file-name"
                className="min-w-0 flex-1 line-clamp-2 break-words text-[13px] leading-4 [overflow-wrap:anywhere]"
              >
                {name2}
              </span>
            )}
            <span className="shrink-0 tabular-nums text-[12px] text-[var(--canvas-controls-text-muted)]">
              {durationLabel ?? formatTime$2(0, true)}
            </span>
          </div>
          {description && (
            <p className="mt-1 truncate text-[var(--canvas-controls-text-muted)]">
              {description}
            </p>
          )}
          <AudioPreviewPlayer
            key={url2}
            url={url2}
            fileName={name2}
            active={effectiveActive}
            durationSec={durationSec}
            onDurationChange={(duration) => {
              setAudioDuration(duration);
              onDurationChange?.(duration);
            }}
          />
        </div>
      )}
      {!isAudio && showFileName && (
        <div className="absolute inset-x-0 top-0 z-10 flex items-start gap-2 bg-[var(--canvas-media-control-bg)] px-2 py-1.5 text-[11px] leading-4 text-[var(--canvas-media-control-fg)]">
          <span
            data-testid="preview-file-name"
            className="min-w-0 max-h-12 flex-1 overflow-y-auto overscroll-contain whitespace-normal break-words [overflow-wrap:anywhere]"
          >
            {name2}
          </span>
          {durationLabel && (
            <span className="shrink-0 tabular-nums">{durationLabel}</span>
          )}
        </div>
      )}
      {!isAudio && (action || locateAction || previewAction) && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[var(--canvas-reference-thumbnail-gradient)] to-transparent"
        />
      )}
      {previewAction && !isAudio && (
        <button
          type="button"
          aria-label={previewAction.label}
          data-action-ui-id="popover.attachment-preview"
          className="absolute inset-0 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-foreground"
          onMouseDown={(event) => event.preventDefault()}
          onClick={(event) => {
            event.stopPropagation();
            previewAction.onClick();
          }}
        />
      )}
      {action && !isAudio && (
        <button
          type="button"
          className="absolute bottom-1 left-1/2 z-10 flex h-6 max-w-[calc(100%-64px)] -translate-x-1/2 cursor-pointer items-center justify-center whitespace-nowrap rounded-full bg-black/40 px-3 text-[11.5px] text-white backdrop-blur-sm transition-colors hover:bg-black/55 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/80"
          aria-label={action.label}
          data-action-ui-id={action.actionUiId}
          onClick={(event) => {
            event.stopPropagation();
            action.onClick();
          }}
        >
          <span className="truncate">{action.label}</span>
        </button>
      )}
      {!isAudio && locateAction && (
        <div className="absolute bottom-1 left-1 z-10">
          <Tooltip$1 content={locateAction.label} side="top">
            <button
              type="button"
              aria-label={locateAction.label}
              data-action-ui-id="popover.attachment-locate"
              className="flex size-6 cursor-pointer items-center justify-center text-[var(--canvas-media-control-fg)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground"
              onMouseDown={(event) => event.preventDefault()}
              onClick={(event) => {
                event.stopPropagation();
                locateAction.onClick();
              }}
            >
              <Crosshair
                size={16}
                strokeWidth={1.6}
                style={{
                  filter: "drop-shadow(var(--canvas-media-icon-shadow))",
                }}
              />
            </button>
          </Tooltip$1>
        </div>
      )}
      {previewAction && !isAudio && (
        <div className="absolute bottom-1 right-1 z-10">
          <Tooltip$1 content={previewAction.label} side="top">
            <button
              type="button"
              aria-label={previewAction.label}
              data-action-ui-id="popover.attachment-fullscreen"
              className="flex size-6 cursor-pointer items-center justify-center text-[var(--canvas-media-control-fg)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground"
              onMouseDown={(event) => event.preventDefault()}
              onClick={(event) => {
                event.stopPropagation();
                previewAction.onClick();
              }}
            >
              <Maximize
                size={16}
                strokeWidth={1.6}
                style={{
                  filter: "drop-shadow(var(--canvas-media-icon-shadow))",
                }}
              />
            </button>
          </Tooltip$1>
        </div>
      )}
      {action && isAudio && (
        <button
          type="button"
          className="flex h-8 w-full shrink-0 cursor-pointer items-center justify-center border-t border-[var(--canvas-controls-border)] bg-[var(--canvas-controls-bg)] px-2 text-[12px] text-[var(--canvas-controls-text)] transition-colors hover:bg-[var(--canvas-controls-hover)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[var(--canvas-controls-text)]"
          aria-label={action.label}
          data-action-ui-id={action.actionUiId}
          onClick={(event) => {
            event.stopPropagation();
            action.onClick();
          }}
        >
          {action.label}
        </button>
      )}
    </div>,
    document.body,
  );
}
