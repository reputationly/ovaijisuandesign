// audio-preview-player.jsx
import { Volume2, Maximize, useTranslation, reactExports, reactDomExports, Loader2, PlaybackCircleToggleIcon, CompositedSvg, Crosshair } from "../vendor.js";
import { VolumeX, useMediaPlayback, formatTime$2, useCanvasBridge } from "./parse-item.jsx";
import { Button$2 } from "../canvas/use-media-node-actions.jsx";
import { Tooltip$1 } from "../generation/create-tracker.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
export function appendWidth(url2, width) {
  return `${url2}${url2.includes("?") ? "&" : "?"}w=${width}`;
}
export function canAnnotateCanvasImage(kind, name2, url2) {
  return kind === "image" && !!url2 && !/\.gif(?:$|[?#])/i.test(name2);
}
function AudioPreviewPlayer({
  url: url2,
  fileName: _fileName = url2,
  active: active2 = true,
  durationSec,
  onDurationChange,
  onTimeChange,
}) {
  const { t: t2 } = useTranslation();
  const id2 = `attachment-audio-${reactExports.useId()}`;
  const audioRef = reactExports.useRef(null);
  const requestRef = reactExports.useRef(0);
  const [playing, setPlaying] = reactExports.useState(false);
  const [pending2, setPending] = reactExports.useState(false);
  const [error, setError] = reactExports.useState(false);
  const [muted, setMuted] = reactExports.useState(false);
  const [time, setTime] = reactExports.useState(0);
  const [duration, setDuration] = reactExports.useState(durationSec ?? 0);
  const validDuration = Number.isFinite(duration) && duration > 0 ? duration : 0;
  reactExports.useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const stop = () => {
      requestRef.current += 1;
      audio.pause();
      setPlaying(false);
      setPending(false);
      if (useMediaPlayback.getState().playingId === id2) useMediaPlayback.getState().stop();
    };
    const unsubscribe = useMediaPlayback.subscribe((state2) => {
      if (state2.playingId !== id2) {
        requestRef.current += 1;
        audio.pause();
        setPlaying(false);
        setPending(false);
      }
    });
    const handleVisibility = () => {
      if (document.hidden) stop();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    setTime(0);
    setError(false);
    setDuration(durationSec ?? 0);
    if (active2 && url2) audio.src = url2;
    else stop();
    return () => {
      unsubscribe();
      document.removeEventListener("visibilitychange", handleVisibility);
      stop();
      audio.removeAttribute("src");
      audio.load();
    };
  }, [active2, durationSec, id2, url2]);
  const handleToggle = async () => {
    const audio = audioRef.current;
    if (!audio || !active2) return;
    if (playing || pending2) {
      requestRef.current += 1;
      audio.pause();
      setPlaying(false);
      setPending(false);
      if (useMediaPlayback.getState().playingId === id2) useMediaPlayback.getState().stop();
      return;
    }
    if (error) audio.load();
    setError(false);
    setPending(true);
    const request = ++requestRef.current;
    useMediaPlayback.getState().play(id2);
    try {
      await audio.play();
      if (request !== requestRef.current || useMediaPlayback.getState().playingId !== id2) {
        audio.pause();
        return;
      }
      setPlaying(true);
      setPending(false);
    } catch {
      if (request !== requestRef.current) return;
      setError(true);
      setPending(false);
      if (useMediaPlayback.getState().playingId === id2) useMediaPlayback.getState().stop();
    }
  };
  const handleMetadata = () => {
    const next2 = audioRef.current?.duration;
    if (next2 && Number.isFinite(next2)) {
      setDuration(next2);
      onDurationChange?.(next2);
    }
  };
  const handleSeek = (event) => {
    const nextProgress = Number(event.currentTarget.value);
    const nextTime = nextProgress * validDuration;
    if (audioRef.current && validDuration > 0) audioRef.current.currentTime = nextTime;
    setTime(nextTime);
    onTimeChange?.(nextTime);
  };
  return (
    <div className="w-full min-w-0" data-testid="audio-preview-player">
      <audio
        ref={audioRef}
        preload="metadata"
        muted={muted}
        onLoadedMetadata={handleMetadata}
        onDurationChange={handleMetadata}
        onTimeUpdate={() => {
          const next2 = audioRef.current?.currentTime ?? 0;
          setTime(next2);
          onTimeChange?.(next2);
        }}
        onPlaying={() => {
          if (!active2 || useMediaPlayback.getState().playingId !== id2) {
            audioRef.current?.pause();
            return;
          }
          setPlaying(true);
          setPending(false);
        }}
        onPause={() => setPlaying(false)}
        onWaiting={() => {
          if (useMediaPlayback.getState().playingId === id2) setPending(true);
        }}
        onEnded={() => {
          setPlaying(false);
          setPending(false);
          if (useMediaPlayback.getState().playingId === id2) useMediaPlayback.getState().stop();
        }}
        onError={() => {
          if (!active2) return;
          setError(true);
          setPlaying(false);
          setPending(false);
          if (useMediaPlayback.getState().playingId === id2) useMediaPlayback.getState().stop();
        }}
      />
      <div className="audio-preview-controls" data-testid="audio-preview-controls">
        <div className="flex h-7 items-center gap-2">
          <Button$2
            variant="ghost"
            size="icon"
            disabled={!active2 || !url2}
            aria-label={playing || pending2 ? t2("canvas.pause") : t2("canvas.play")}
            data-action-ui-id="attachment-audio.toggle"
            className="size-6 shrink-0 rounded-full p-0 text-[var(--fg-default)] bg-transparent hover:bg-transparent hover:opacity-90"
            onClick={(event) => {
              event.stopPropagation();
              void handleToggle();
            }}
          >
            {pending2 ? (
              <Loader2 size={15} strokeWidth={1.5} className="animate-spin" />
            ) : (
              <PlaybackCircleToggleIcon playing={playing} size={24} className="size-full" />
            )}
          </Button$2>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={validDuration ? time / validDuration : 0}
            disabled={!active2 || !validDuration}
            aria-label={t2("attachment.audio.seek", "Playback position")}
            data-action-ui-id="attachment-audio.seek"
            className="audio-preview-seek min-w-0 flex-1"
            onChange={handleSeek}
            onClick={(event) => event.stopPropagation()}
          />
          <Button$2
            variant="ghost"
            size="icon"
            aria-label={muted ? t2("assetPreview.unmute") : t2("assetPreview.mute")}
            aria-pressed={muted}
            data-action-ui-id="attachment-audio.mute"
            className="size-6 shrink-0 rounded-full p-0 text-[var(--fg-muted)] hover:bg-[var(--canvas-controls-hover)] hover:text-[var(--fg-default)]"
            onClick={(event) => {
              event.stopPropagation();
              setMuted((value) => !value);
            }}
          >
            {muted ? (
              <VolumeX size={16} strokeWidth={1.5} />
            ) : (
              <Volume2 size={16} strokeWidth={1.5} />
            )}
          </Button$2>
        </div>
        <div className="flex items-center justify-between text-[11px] leading-4 tabular-nums text-[var(--canvas-controls-text-muted)]">
          <span>{formatTime$2(time, true)}</span>
          <span>{formatTime$2(validDuration, true)}</span>
        </div>
      </div>
      {pending2 && (
        <p role="status" className="mt-1 text-[11px] text-[var(--canvas-controls-text-muted)]">
          {t2("common.loading", "Loading...")}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-1 text-[11px] text-destructive">
          {t2("attachment.audio.loadFailed", "Audio could not be played. Try again.")}
        </p>
      )}
    </div>
  );
}
const PREVIEW_MAX_W = 180;
const PREVIEW_MAX_H$1 = 240;
const PREVIEW_FALLBACK_W = 180;
const PREVIEW_FALLBACK_H = 135;
const ANCHOR_GAP$3 = 8;
const VIEWPORT_PADDING = 8;
function isPointInPreviewBridge(x2, y4, anchor, preview) {
  const contains2 = (rect) =>
    x2 >= rect.left && x2 <= rect.left + rect.width && y4 >= rect.top && y4 <= rect.bottom;
  if (contains2(anchor) || contains2(preview)) return true;
  const above = preview.bottom <= anchor.top;
  const below = anchor.bottom <= preview.top;
  if (!above && !below) return false;
  const start2 = above
    ? {
        y: preview.bottom,
        left: preview.left,
        right: preview.left + preview.width,
      }
    : {
        y: anchor.top,
        left: anchor.left,
        right: anchor.left + anchor.width,
      };
  const end2 = above
    ? {
        y: anchor.bottom,
        left: anchor.left,
        right: anchor.left + anchor.width,
      }
    : {
        y: preview.top,
        left: preview.left,
        right: preview.left + preview.width,
      };
  if (y4 < start2.y || y4 > end2.y || end2.y === start2.y) return false;
  const progress = (y4 - start2.y) / (end2.y - start2.y);
  return (
    x2 >= start2.left + (end2.left - start2.left) * progress &&
    x2 <= start2.right + (end2.right - start2.right) * progress
  );
}
function clamp$8(value, min2, max2) {
  return Math.min(Math.max(value, min2), max2);
}
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
function getMediaPreviewLayout(anchorRect, previewSize, viewport, boundary, fit = "contain") {
  boundary ??= {
    left: 0,
    top: 0,
    right: viewport.width,
    bottom: viewport.height,
  };
  const left = Math.max(0, boundary.left);
  const top2 = Math.max(0, boundary.top);
  const width = Math.max(0, Math.min(viewport.width, boundary.right) - left);
  const height = Math.max(0, Math.min(viewport.height, boundary.bottom) - top2);
  const scale2 = Math.min(
    1,
    Math.max(1, width - VIEWPORT_PADDING * 2) / previewSize.width,
    Math.max(1, height - VIEWPORT_PADDING * 2) / previewSize.height,
  );
  const size2 =
    fit === "contain"
      ? {
          width: previewSize.width * scale2,
          height: previewSize.height * scale2,
        }
      : {
          width: Math.min(previewSize.width, Math.max(1, width - VIEWPORT_PADDING * 2)),
          height: Math.min(previewSize.height, Math.max(1, height - VIEWPORT_PADDING * 2)),
        };
  const position2 = getMediaPreviewPosition(
    {
      width: anchorRect.width,
      height: anchorRect.height,
      left: anchorRect.left - left,
      top: anchorRect.top - top2,
      bottom: anchorRect.bottom - top2,
    },
    size2,
    {
      width,
      height,
    },
  );
  return {
    ...size2,
    left: position2.left + left,
    top: position2.top + top2,
  };
}
function getMediaPreviewPosition(anchorRect, previewSize, viewport) {
  const preferredTop = anchorRect.top - previewSize.height - ANCHOR_GAP$3;
  const fallbackTop = anchorRect.bottom + ANCHOR_GAP$3;
  const fitsAbove = preferredTop >= VIEWPORT_PADDING;
  const fitsBelow = fallbackTop + previewSize.height <= viewport.height - VIEWPORT_PADDING;
  const moreSpaceAbove = anchorRect.top > viewport.height - anchorRect.bottom;
  const top2 = clamp$8(
    fitsAbove || (!fitsBelow && moreSpaceAbove) ? preferredTop : fallbackTop,
    VIEWPORT_PADDING,
    Math.max(VIEWPORT_PADDING, viewport.height - previewSize.height - VIEWPORT_PADDING),
  );
  const left = clamp$8(
    anchorRect.left + anchorRect.width / 2 - previewSize.width / 2,
    VIEWPORT_PADDING,
    Math.max(VIEWPORT_PADDING, viewport.width - previewSize.width - VIEWPORT_PADDING),
  );
  return {
    top: top2,
    left,
  };
}
function getBoundary(anchor) {
  return (
    anchor?.closest("[data-media-preview-boundary]") ??
    anchor?.closest("[data-workspace-pane]") ??
    null
  );
}
export function useHoverPreview({
  anchorElement,
  anchorRect,
  size: size2,
  fit = "contain",
  interactive = false,
  onPreviewMouseEnter,
  onPreviewMouseLeave,
}) {
  const previewRef = reactExports.useRef(null);
  const callbacks = reactExports.useRef({
    onPreviewMouseEnter,
    onPreviewMouseLeave,
  });
  callbacks.current = {
    onPreviewMouseEnter,
    onPreviewMouseLeave,
  };
  const { top: top2, bottom, left, width, height } = anchorRect;
  const measure = reactExports.useCallback(() => {
    const boundary = getBoundary(anchorElement);
    const boundaryRect =
      boundary?.dataset.mediaPreviewBoundary !== "false"
        ? boundary?.getBoundingClientRect()
        : void 0;
    return getMediaPreviewLayout(
      anchorElement?.getBoundingClientRect() ?? {
        top: top2,
        bottom,
        left,
        width,
        height,
      },
      {
        width: size2.width,
        height: size2.height,
      },
      {
        width: document.documentElement.clientWidth || window.innerWidth,
        height: document.documentElement.clientHeight || window.innerHeight,
      },
      boundaryRect && boundaryRect.width > 0 && boundaryRect.height > 0 ? boundaryRect : null,
      fit,
    );
  }, [anchorElement, top2, bottom, left, width, height, size2.width, size2.height, fit]);
  const [layout, setLayout] = reactExports.useState(measure);
  reactExports.useLayoutEffect(() => {
    const update2 = () => {
      const next2 = measure();
      setLayout((previous2) =>
        previous2.left === next2.left &&
        previous2.top === next2.top &&
        previous2.width === next2.width &&
        previous2.height === next2.height
          ? previous2
          : next2,
      );
    };
    update2();
    const boundary = getBoundary(anchorElement);
    const resizeObserver =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update2);
    if (anchorElement) resizeObserver?.observe(anchorElement);
    if (boundary) resizeObserver?.observe(boundary);
    const mutationObserver = new MutationObserver(update2);
    if (boundary) {
      mutationObserver.observe(boundary, {
        attributes: true,
        attributeFilter: ["data-media-preview-boundary"],
      });
    }
    let frame2;
    const follow = () => {
      update2();
      frame2 = requestAnimationFrame(follow);
    };
    if (anchorElement && typeof requestAnimationFrame !== "undefined") {
      frame2 = requestAnimationFrame(follow);
    }
    window.addEventListener("resize", update2);
    document.addEventListener("scroll", update2, true);
    return () => {
      if (frame2 !== void 0) cancelAnimationFrame(frame2);
      resizeObserver?.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener("resize", update2);
      document.removeEventListener("scroll", update2, true);
    };
  }, [anchorElement, measure]);
  reactExports.useEffect(() => {
    if (!interactive) return;
    let inside = true;
    let pointerInside = Boolean(
      anchorElement?.matches(":hover") || previewRef.current?.matches(":hover"),
    );
    const focusAnchor = anchorElement?.closest("[data-attachment-id]") ?? anchorElement;
    const containsFocus = () =>
      previewRef.current?.contains(document.activeElement) ||
      focusAnchor?.contains(document.activeElement);
    const handleMove = (event) => {
      const preview = previewRef.current;
      if (!preview) return;
      const anchor = anchorElement?.getBoundingClientRect() ?? anchorRect;
      pointerInside = isPointInPreviewBridge(
        event.clientX,
        event.clientY,
        anchor,
        preview.getBoundingClientRect(),
      );
      const staysOpen = containsFocus() || pointerInside;
      if (staysOpen) callbacks.current.onPreviewMouseEnter?.();
      else if (inside) callbacks.current.onPreviewMouseLeave?.();
      inside = Boolean(staysOpen);
    };
    const handleFocus = () => {
      if (containsFocus() || pointerInside) callbacks.current.onPreviewMouseEnter?.();
      else callbacks.current.onPreviewMouseLeave?.();
    };
    document.addEventListener("mousemove", handleMove);
    document.addEventListener("focusin", handleFocus);
    return () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("focusin", handleFocus);
    };
  }, [anchorElement, anchorRect, interactive]);
  const handlePreviewMouseLeave = reactExports.useCallback(
    (event) => {
      event.stopPropagation();
      const focusAnchor = anchorElement?.closest("[data-attachment-id]") ?? anchorElement;
      if (
        previewRef.current?.contains(document.activeElement) ||
        focusAnchor?.contains(document.activeElement)
      ) {
        callbacks.current.onPreviewMouseEnter?.();
      } else {
        callbacks.current.onPreviewMouseLeave?.();
      }
    },
    [anchorElement],
  );
  return {
    layout,
    previewRef,
    handlePreviewMouseLeave,
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
  const [audioDuration, setAudioDuration] = reactExports.useState(durationSec ?? 0);
  const [loadedMedia, setLoadedMedia] = reactExports.useState(null);
  const loadedMediaForCurrentUrl = loadedMedia?.url === url2 ? loadedMedia : null;
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
        height: AUDIO_PREVIEW_H_FALLBACK + (action ? AUDIO_PREVIEW_ACTION_H : 0),
      }
    : !isAudio && (action || locateAction || previewAction)
      ? getInteractiveMediaPreviewSize(mediaSize)
      : mediaSize;
  const interactive = Boolean(
    isAudio || showFileName || action || locateAction || previewAction || onPreviewMouseEnter,
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
            <p className="mt-1 truncate text-[var(--canvas-controls-text-muted)]">{description}</p>
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
          {durationLabel && <span className="shrink-0 tabular-nums">{durationLabel}</span>}
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
