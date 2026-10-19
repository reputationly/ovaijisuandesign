// video-player-inner.jsx
import reactExports from "react";
import { useTranslation } from "react-i18next";
import { create } from "zustand";
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
import { useMediaElementPlayback } from "./use-media-element-playback.jsx";
const STORAGE_KEY = "hilo:canvas:video-muted";
const DEFAULT_MUTED = true;
function readPersisted() {
  if (typeof window === "undefined") return DEFAULT_MUTED;
  try {
    const storedMutedSetting = window.localStorage.getItem(STORAGE_KEY);
    if (storedMutedSetting === "0") return false;
    if (storedMutedSetting === "1") return true;
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
export function recoverPlayingVideoSurface(video, shouldBePlaying) {
  if (!video || !shouldBePlaying) return false;
  try {
    void video.play().catch(() => void 0);
    return true;
  } catch {
    return false;
  }
}
function VideoPlayerInner({
  src,
  poster,
  width,
  height,
  onFullscreen,
  isPlaying,
  active: active2 = true,
  muted,
  onToggleMuted,
  onTogglePlay,
  onStop,
  videoRef: externalRef,
  onError,
  onLoadedData,
  volume = 1,
  onVolumeChange,
  showControls = true,
  compact: compact2 = false,

  // 产物里有两个几乎逐字相同的播放器：一个给资源预览用（`resource-preview.video.*`），
  // 一个给画布节点用（`canvas.video-player.*`），**只差 id 前缀**。
  // 还原时只留下了前者，于是画布视频节点的控件 id 全错、走查里等不到。
  actionPrefix = "resource-preview.video",}) {
  const { t } = useTranslation();
  const internalRef = reactExports.useRef(null);
  const videoRef = externalRef ?? internalRef;
  useMediaElementPlayback(videoRef, isPlaying, active2, src, onStop);
  reactExports.useEffect(() => {
    if (src && videoRef.current) videoRef.current.volume = Math.max(0, Math.min(1, volume));
  }, [volume, src, videoRef]);
  const handleTogglePlay = reactExports.useCallback(
    (e2) => {
      e2.stopPropagation();
      onTogglePlay();
    },
    [onTogglePlay],
  );
  const handleToggleMute = reactExports.useCallback(
    (e2) => {
      e2.stopPropagation();
      onToggleMuted();
    },
    [onToggleMuted],
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
        poster={poster}
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
        loop={true}
        onError={onError}
        onLoadedData={onLoadedData}
        onLoadedMetadata={onLoadedData}
      />
      {showControls && (
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
              data-action-ui-id={`${actionPrefix}.toggle-play`}
              aria-label={
                isPlaying
                  ? t("common.pause", {
                      defaultValue: "Pause",
                    })
                  : t("common.play", {
                      defaultValue: "Play",
                    })
              }
              className="pointer-events-auto flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-[8px] border-0 bg-transparent text-[var(--canvas-video-control-fg)] transition-colors hover:bg-[var(--canvas-video-control-hover)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
            >
              {isPlaying ? <PauseIcon size={18} /> : <PlayIcon size={18} />}
            </button>
            {!compact2 && <ProgressBar videoRef={videoRef} isPlaying={isPlaying} display="time" />}
            <div className="ml-auto flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={handleToggleMute}
                onDoubleClick={(e2) => e2.stopPropagation()}
                data-action-ui-id={`${actionPrefix}.toggle-mute`}
                aria-label={
                  muted
                    ? t("assetPreview.unmute", {
                        defaultValue: "Unmute",
                      })
                    : t("assetPreview.mute", {
                        defaultValue: "Mute",
                      })
                }
                className="pointer-events-auto flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-[8px] border-0 bg-transparent text-[var(--canvas-video-control-fg)] transition-colors hover:bg-[var(--canvas-video-control-hover)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
              >
                {muted ? <VolumeOffTablerIcon /> : <VolumeOnTablerIcon />}
              </button>
              {onVolumeChange && (
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  aria-label={t("canvas.params.volume")}
                  className="pointer-events-auto w-12 accent-current"
                  onClick={(event) => event.stopPropagation()}
                  onChange={(event) => onVolumeChange(Number(event.target.value))}
                />
              )}
              {onFullscreen && (
                <button
                  type="button"
                  onClick={handleFullscreen}
                  onDoubleClick={(e2) => e2.stopPropagation()}
                  data-action-ui-id={`${actionPrefix}.fullscreen`}
                  aria-label={t("canvas.fullscreen", {
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
      )}
    </div>
  );
}
export const VideoPlayer = reactExports.memo(VideoPlayerInner);

function useMediaElementPlayback$1(ref, playing, active2, src, stop) {
  const wantsPlayback = reactExports.useRef(false);
  reactExports.useEffect(() => {
    const media2 = ref.current;
    if (!media2) return;
    let cancelled = false;
    wantsPlayback.current = playing && active2 && !!src;
    const hide2 = () => {
      if (document.visibilityState !== "hidden") return;
      media2.pause();
      if (playing) stop();
    };
    if (playing && active2 && src && document.visibilityState !== "hidden") {
      try {
        void media2
          .play()
          .then(() => {
            if (cancelled && !wantsPlayback.current) media2.pause();
          })
          .catch(() => {
            if (!cancelled) stop();
          });
      } catch {
        stop();
      }
    } else {
      media2.pause();
      if (playing) stop();
    }
    document.addEventListener("visibilitychange", hide2);
    return () => {
      cancelled = true;
      wantsPlayback.current = false;
      document.removeEventListener("visibilitychange", hide2);
      media2.pause();
    };
  }, [ref, playing, active2, src, stop]);
}

/**
 * 画布节点用的播放器。
 *
 * 产物里它是单独一个组件（`VideoPlayer$1`）：按 `nodeId` 从播放状态里取 `isPlaying`，
 * 并从静音 store 取 `muted`（**默认 true**，否则自动播放会被浏览器挡掉）。
 * 还原时这个包装层整块缺失，画布视频因此既没有正确 id、也永远播不起来。
 *
 * 放在本文件里而不是新建模块：这里已经引了 `useMediaPlayback` / `useCanvasSurfaceRecovery` /
 * `create`，不新增任何模块边，避免上次那种「一接线就整页崩」的耦合问题。
 */
export const CanvasVideoPlayer = reactExports.memo(function CanvasVideoPlayer({ nodeId, ...props }) {
  const videoRef = reactExports.useRef(null);
  const isPlaying = useMediaPlayback((state) => state.playingId === nodeId);
  const play = useMediaPlayback((state) => state.play);
  const stop = useMediaPlayback((state) => state.stop);
  const muted = useVideoMutedStore((state) => state.muted);
  const toggleMuted = useVideoMutedStore((state) => state.toggleMuted);
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
  return (
    <VideoPlayer
      {...props}
      actionPrefix="canvas.video-player"
      videoRef={videoRef}
      isPlaying={isPlaying}
      muted={muted}
      onToggleMuted={toggleMuted}
      onStop={stop}
      onTogglePlay={() => (isPlaying ? stop() : play(nodeId))}
    />
  );
});
