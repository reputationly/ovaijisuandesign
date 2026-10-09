// video-player-inner.jsx
import { create$2 as create, reactExports, useTranslation } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { ProgressBar } from "./progress-bar-inner.jsx";
import { useMediaPlayback } from "./package.jsx";
import { useCanvasSurfaceRecovery } from "./resolve-panorama-generation-presentation.js";
import {
  FullscreenIcon,
  PauseIcon,
  PlayIcon,
  VolumeOffTablerIcon,
  VolumeOnTablerIcon,
} from "./build-video-thumb-base.jsx";
const STORAGE_KEY = "hilo:canvas:video-muted";
const DEFAULT_MUTED = true;
function readPersisted() {
  if (typeof window === "undefined") return DEFAULT_MUTED;
  try {
    const v2 = window.localStorage.getItem(STORAGE_KEY);
    if (v2 === "0") return false;
    if (v2 === "1") return true;
  } catch {}
  return DEFAULT_MUTED;
}
const useVideoMutedStore = create((set2, get3) => ({
  muted: readPersisted(),
  setMuted: (muted) => {
    if (get3().muted === muted) return;
    set2({
      muted,
    });
    try {
      window.localStorage.setItem(STORAGE_KEY, muted ? "1" : "0");
    } catch {}
  },
  toggleMuted: () => get3().setMuted(!get3().muted),
}));
function recoverPlayingVideoSurface(video, shouldBePlaying) {
  if (!video || !shouldBePlaying) return false;
  try {
    void video.play().catch(() => void 0);
    return true;
  } catch {
    return false;
  }
}
function VideoPlayerInner({ src, nodeId, width, height, onFullscreen }) {
  const { t: t2 } = useTranslation();
  const videoRef = reactExports.useRef(null);
  const isPlaying = useMediaPlayback((s2) => s2.playingId === nodeId);
  const play = useMediaPlayback((s2) => s2.play);
  const stop = useMediaPlayback((s2) => s2.stop);
  const muted = useVideoMutedStore((s2) => s2.muted);
  const toggleMuted = useVideoMutedStore((s2) => s2.toggleMuted);
  useCanvasSurfaceRecovery(
    {
      surfaceType: "video",
      isEligible: () => videoRef.current !== null && isPlaying,
      recover: () => recoverPlayingVideoSurface(videoRef.current, isPlaying),
    },
    isPlaying,
  );
  reactExports.useEffect(() => {
    play(nodeId);
  }, [play, nodeId]);
  reactExports.useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (isPlaying) {
      el.play().catch(() => {});
    } else {
      el.pause();
    }
  }, [isPlaying]);
  reactExports.useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const handleEnded = () => {
      if (useMediaPlayback.getState().playingId !== nodeId) return;
      el.currentTime = 0;
      el.play().catch(() => {});
    };
    el.addEventListener("ended", handleEnded);
    return () => el.removeEventListener("ended", handleEnded);
  }, [nodeId]);
  const handleTogglePlay = reactExports.useCallback(
    (e2) => {
      e2.stopPropagation();
      if (isPlaying) stop();
      else play(nodeId);
    },
    [isPlaying, play, stop, nodeId],
  );
  const handleToggleMute = reactExports.useCallback(
    (e2) => {
      e2.stopPropagation();
      toggleMuted();
    },
    [toggleMuted],
  );
  const handleFullscreen = reactExports.useCallback(
    (e2) => {
      e2.stopPropagation();
      onFullscreen?.();
    },
    [onFullscreen],
  );
  return (
    <div
      className="relative"
      style={{
        width,
        height,
      }}
    >
      <video
        ref={videoRef}
        src={src}
        crossOrigin="anonymous"
        style={{
          width: "100%",
          height: "100%",
          display: "block",
          objectFit: "contain",
        }}
        playsInline={true}
        preload="metadata"
        muted={muted}
      />
      <div
        className="canvas-video-player-controls nodrag nopan nowheel pointer-events-none absolute inset-x-0 bottom-0 flex h-[clamp(58px,32%,92px)] flex-col justify-end gap-1.5 px-2 pb-2 pt-3"
        style={{
          zIndex: 2,
          animation: "media-overlay-bottom-enter 150ms ease-out",
        }}
      >
        <div className="flex min-w-0 items-center gap-2 text-[var(--canvas-video-control-fg)]">
          <button
            type="button"
            onClick={handleTogglePlay}
            onDoubleClick={(e2) => e2.stopPropagation()}
            data-action-ui-id="canvas.video-player.toggle-play"
            aria-label={
              isPlaying
                ? t2("common.pause", {
                    defaultValue: "Pause",
                  })
                : t2("common.play", {
                    defaultValue: "Play",
                  })
            }
            className="pointer-events-auto flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-[var(--canvas-video-control-fg)] transition-colors hover:bg-[var(--canvas-video-control-hover)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
          >
            {isPlaying ? <PauseIcon size={18} /> : <PlayIcon size={18} />}
          </button>
          <ProgressBar
            videoRef={videoRef}
            isPlaying={isPlaying}
            display="time"
          />
          <div className="ml-auto flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={handleToggleMute}
              onDoubleClick={(e2) => e2.stopPropagation()}
              data-action-ui-id="canvas.video-player.toggle-mute"
              aria-label={
                muted
                  ? t2("assetPreview.unmute", {
                      defaultValue: "Unmute",
                    })
                  : t2("assetPreview.mute", {
                      defaultValue: "Mute",
                    })
              }
              className="pointer-events-auto flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-[8px] border-0 bg-transparent text-[var(--canvas-video-control-fg)] transition-colors hover:bg-[var(--canvas-video-control-hover)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
            >
              {muted ? <VolumeOffTablerIcon /> : <VolumeOnTablerIcon />}
            </button>
            {onFullscreen && (
              <button
                type="button"
                onClick={handleFullscreen}
                onDoubleClick={(e2) => e2.stopPropagation()}
                data-action-ui-id="canvas.video-player.fullscreen"
                aria-label={t2("canvas.fullscreen", {
                  defaultValue: "Fullscreen",
                })}
                className="pointer-events-auto flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-[8px] border-0 bg-transparent text-[var(--canvas-video-control-fg)] transition-colors hover:bg-[var(--canvas-video-control-hover)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
              >
                <FullscreenIcon />
              </button>
            )}
          </div>
        </div>
        <ProgressBar videoRef={videoRef} isPlaying={isPlaying} display="bar" />
      </div>
    </div>
  );
}
export const VideoPlayer = reactExports.memo(VideoPlayerInner);
