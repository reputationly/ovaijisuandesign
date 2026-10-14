// markdown-audio.jsx
import jsxRuntimeExports from "react/jsx-runtime";
import reactExports from "react";
import { useCurrentWorkspace } from "../infra/shared-runtime.js";
import { useTranslation } from "react-i18next";
import { Crosshair } from "./lucide-icon-wraps.js";
import { PlaybackPauseIcon$1 as PlaybackPauseIcon, PlaybackPlayIcon$1 as PlaybackPlayIcon } from "./playback-icons.js";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  findAssetForPath,
  toWorkspaceRelativePath,
} from "./parse-workspace-path.js";
import {
  getNodeIdsForAsset,
  useHasAssetOnCanvas,
} from "../infra/use-canvas-node-assets-store.js";
import { workspaceEvents } from "../workspace/topbar-state-context.jsx";
import { mergeTailwindClasses as mergeClassNames } from "../infra/dialog-content.jsx";
import { useAssets } from "../settings/use-assets.js";
import {
  canWriteResourceDragData,
  writeResourceDragData,
} from "../generation/use-astra-send-gate.js";
const WAVEFORM_BAR_WIDTH = 3;
const WAVEFORM_BAR_GAP = 2;
const WAVEFORM_BAR_RADIUS = 1.5;
const WAVEFORM_HEIGHT = 48;
const WAVEFORM_H_PAD = 16;
const WAVEFORM_SVG_WIDTH = 320 - WAVEFORM_H_PAD * 2;
const BAR_COUNT = Math.floor(
  WAVEFORM_SVG_WIDTH / (WAVEFORM_BAR_WIDTH + WAVEFORM_BAR_GAP),
);
const PLAYHEAD_COLOR = "var(--destructive)";
let activeMarkdownAudio = null;
function startExclusiveMarkdownAudio(next) {
  if (activeMarkdownAudio && activeMarkdownAudio !== next) {
    activeMarkdownAudio.pause();
  }
  activeMarkdownAudio = next;
}
function clearExclusiveMarkdownAudio(current) {
  if (activeMarkdownAudio === current) {
    activeMarkdownAudio = null;
  }
}
function waveformHash(audioIdentity) {
  let hashValue = 5381;
  for (let index = 0; index < audioIdentity.length; index++) {
    hashValue = ((hashValue << 5) + hashValue + audioIdentity.charCodeAt(index)) | 0;
  }
  return Math.abs(hashValue);
}
function seededRandom(seed) {
  let randomState = seed;
  return () => {
    randomState = (randomState * 1103515245 + 12345) & 2147483647;
    return randomState / 2147483647;
  };
}
function generateBars(audioIdentity, count) {
  const randomGenerator = seededRandom(waveformHash(audioIdentity));
  const bars = [];
  for (let index = 0; index < count; index++) {
    bars.push(0.15 + randomGenerator() * 0.8);
  }
  return bars;
}
function formatAudioTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const minutes = Math.floor(total / 60);
  const remainderSeconds = total % 60;
  return `${minutes}:${remainderSeconds.toString().padStart(2, "0")}`;
}
const WaveformBars = reactExports.memo(function WaveformBarsComponent({
  bars,
  playedIndex,
}) {
  return (
    <>
      {bars.map((ratio, index) => {
        const barH = ratio * WAVEFORM_HEIGHT;
        const barX = index * (WAVEFORM_BAR_WIDTH + WAVEFORM_BAR_GAP);
        const barY = (WAVEFORM_HEIGHT - barH) / 2;
        return (
          <rect
            key={index}
            x={barX}
            y={barY}
            width={WAVEFORM_BAR_WIDTH}
            height={barH}
            rx={WAVEFORM_BAR_RADIUS}
            ry={WAVEFORM_BAR_RADIUS}
            fill={
              index <= playedIndex
                ? "var(--foreground)"
                : "var(--muted-foreground)"
            }
          />
        );
      })}
    </>
  );
});
export function MarkdownAudio({
  src,
  originalSrc,
  alt,
  dataSlot = "markdown-audio-chip",
}) {
  const { t } = useTranslation();
  const workspaceId = useCurrentWorkspace();
  const audioRef = reactExports.useRef(null);
  const timeRef = reactExports.useRef(null);
  const playheadRef = reactExports.useRef(null);
  const rafRef = reactExports.useRef(0);
  const [error, setError] = reactExports.useState(false);
  const [playing, setPlaying] = reactExports.useState(false);
  const [duration, setDuration] = reactExports.useState(0);
  const [playedIndex, setPlayedIndex] = reactExports.useState(-1);
  const bars = reactExports.useMemo(
    () => generateBars(alt || src, BAR_COUNT),
    [alt, src],
  );
  const relativePath = reactExports.useMemo(
    () => toWorkspaceRelativePath(originalSrc, src),
    [originalSrc, src],
  );
  const { assets } = useAssets({
    enabled: Boolean(relativePath),
  });
  const asset = reactExports.useMemo(
    () => findAssetForPath(assets, relativePath),
    [assets, relativePath],
  );
  const fileName =
    asset?.name ?? relativePath?.split("/").pop() ?? alt ?? "audio";
  const dragSource = reactExports.useMemo(
    () => ({
      relativePath,
      workspacePath: workspaceId,
      name: fileName,
      assetId: asset?.id,
    }),
    [asset?.id, fileName, relativePath, workspaceId],
  );
  const canDrag = canWriteResourceDragData(dragSource);
  const hasCanvasNode = useHasAssetOnCanvas(asset?.id, workspaceId);
  const handleError = reactExports.useCallback(() => setError(true), []);
  const handleLoadedMetadata = reactExports.useCallback(() => {
    const audioElement = audioRef.current;
    if (audioElement) setDuration(audioElement.duration);
  }, []);
  const updateTimeDisplay = reactExports.useCallback((current, total) => {
    if (timeRef.current) {
      timeRef.current.textContent = `${formatAudioTime(current)} / ${formatAudioTime(total)}`;
    }
  }, []);
  reactExports.useEffect(() => {
    const audioElement = audioRef.current;
    if (!audioElement || !playing) return;
    let prevIndex = -1;
    const tick = () => {
      const currentTime = audioElement.currentTime;
      const duration = audioElement.duration;
      updateTimeDisplay(currentTime, duration);
      const progress = duration > 0 ? currentTime / duration : 0;
      if (playheadRef.current) {
        const playheadX = progress * WAVEFORM_SVG_WIDTH - 1;
        playheadRef.current.setAttribute("x", String(playheadX));
        playheadRef.current.setAttribute(
          "visibility",
          progress > 0 ? "visible" : "hidden",
        );
      }
      const playedBarIndex = Math.floor(progress * BAR_COUNT);
      if (playedBarIndex !== prevIndex) {
        prevIndex = playedBarIndex;
        setPlayedIndex(playedBarIndex);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, updateTimeDisplay]);
  reactExports.useEffect(
    () => () => {
      clearExclusiveMarkdownAudio(audioRef.current);
      cancelAnimationFrame(rafRef.current);
    },
    [],
  );
  const handleEnded = reactExports.useCallback(() => {
    clearExclusiveMarkdownAudio(audioRef.current ?? void 0);
    setPlaying(false);
    setPlayedIndex(-1);
    updateTimeDisplay(0, audioRef.current?.duration ?? 0);
    if (playheadRef.current) {
      playheadRef.current.setAttribute("visibility", "hidden");
    }
  }, [updateTimeDisplay]);
  const handlePause = reactExports.useCallback(() => {
    clearExclusiveMarkdownAudio(audioRef.current ?? void 0);
    setPlaying(false);
  }, []);
  const handlePlay = reactExports.useCallback(() => {
    const audioElement = audioRef.current;
    if (audioElement) startExclusiveMarkdownAudio(audioElement);
    setPlaying(true);
  }, []);
  const togglePlay = reactExports.useCallback(() => {
    const audioElement = audioRef.current;
    if (!audioElement) return;
    if (playing) {
      audioElement.pause();
      setPlaying(false);
      return;
    }
    if (audioElement) {
      startExclusiveMarkdownAudio(audioElement);
      audioElement.play().catch(() => {
        setError(true);
        clearExclusiveMarkdownAudio(audioElement);
        setPlaying(false);
      });
      setPlaying(true);
    }
  }, [playing]);
  const handleSeek = reactExports.useCallback(
    (clickEvent) => {
      const audioElement = audioRef.current;
      if (!audioElement || !duration) return;
      const rect = clickEvent.currentTarget.getBoundingClientRect();
      const progressRatio = Math.max(
        0,
        Math.min(1, (clickEvent.clientX - rect.left) / rect.width),
      );
      audioElement.currentTime = progressRatio * duration;
      setPlayedIndex(Math.floor(progressRatio * BAR_COUNT));
      updateTimeDisplay(audioElement.currentTime, duration);
      if (playheadRef.current) {
        playheadRef.current.setAttribute(
          "x",
          String(progressRatio * WAVEFORM_SVG_WIDTH - 1),
        );
        playheadRef.current.setAttribute(
          "visibility",
          progressRatio > 0 ? "visible" : "hidden",
        );
      }
    },
    [duration, updateTimeDisplay],
  );
  const handleLocate = reactExports.useCallback(() => {
    if (!asset?.id || !workspaceId) return;
    const nodeIds = getNodeIdsForAsset(asset.id, workspaceId);
    if (nodeIds.length === 0) return;
    workspaceEvents.fireCanvasFocus(workspaceId, nodeIds);
  }, [asset?.id, workspaceId]);
  const handleDragStart = reactExports.useCallback(
    (event) => {
      if (!writeResourceDragData(event, dragSource)) event.preventDefault();
    },
    [dragSource],
  );
  const playTitle = playing
    ? t("chat.pauseAudio", {
        defaultValue: "Pause audio",
      })
    : t("chat.playAudio", {
        defaultValue: "Play audio",
      });
  const locateTitle = t("assetPreview.locateOnCanvas", {
    defaultValue: "Locate on canvas",
  });
  if (error) {
    return (
      <span className="block rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground">
        {t("chat.failedToLoadAudio")}
        {alt ? `: ${alt}` : ""}
      </span>
    );
  }
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: native drag source keeps existing preview controls intact
    <span
      data-slot={dataSlot}
      data-artifact-type="audio"
      className={mergeClassNames(
        "group/markdown-media relative my-2 block rounded-lg border border-border bg-card p-2.5",
        canDrag && "cursor-grab active:cursor-grabbing",
      )}
      style={{
        width: "min(100%, clamp(360px, 72%, 420px))",
        outline: "none",
      }}
      draggable={canDrag}
      onDragStart={handleDragStart}
    >
      {hasCanvasNode && (
        <button
          type="button"
          className="pointer-events-auto absolute right-2 top-2 z-10 inline-flex size-7 cursor-pointer items-center justify-center rounded-sm border border-border bg-background/90 text-muted-foreground opacity-0 shadow-sm transition-opacity hover:text-foreground group-hover/markdown-media:opacity-100 group-focus-within/markdown-media:opacity-100"
          title={locateTitle}
          aria-label={locateTitle}
          onClick={handleLocate}
        >
          <Crosshair size={14} strokeWidth={1.5} />
        </button>
      )}
      {alt && (
        <span
          className="mb-1.5 block truncate text-xs text-muted-foreground"
          title={alt}
        >
          {alt}
        </span>
      )}
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onPlay={handlePlay}
        onPause={handlePause}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onError={handleError}
      />
      <span
        className="flex items-center justify-center rounded-md py-2"
        style={{
          backgroundColor: "var(--muted)",
          border: "1px solid var(--border)",
          padding: `8px ${WAVEFORM_H_PAD}px`,
        }}
      >
        <svg
          width={WAVEFORM_SVG_WIDTH}
          height={WAVEFORM_HEIGHT}
          viewBox={`0 0 ${WAVEFORM_SVG_WIDTH} ${WAVEFORM_HEIGHT}`}
          role="img"
          aria-label={alt || t("a11y.audioWaveform")}
          style={{
            display: "block",
            cursor: "pointer",
          }}
          onClick={handleSeek}
        >
          <WaveformBars bars={bars} playedIndex={playedIndex} />
          <rect
            ref={playheadRef}
            x={0}
            y={0}
            width={2}
            height={WAVEFORM_HEIGHT}
            fill={PLAYHEAD_COLOR}
            visibility="hidden"
          />
        </svg>
      </span>
      <span className="relative mt-1.5 flex h-6 items-center">
        <span
          ref={timeRef}
          className="text-muted-foreground tabular-nums"
          style={{
            fontSize: 11,
          }}
        >
          {formatAudioTime(0)}
          {" / "}
          {formatAudioTime(duration)}
        </span>
        <button
          type="button"
          onClick={togglePlay}
          className="absolute left-1/2 flex h-6 w-6 -translate-x-1/2 items-center justify-center rounded-full border-0 bg-transparent p-0 text-foreground hover:opacity-90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          aria-label={playTitle}
          title={playTitle}
        >
          {playing ? (
            <PlaybackPauseIcon size={12} />
          ) : (
            <PlaybackPlayIcon size={12} />
          )}
        </button>
        <span className="ml-auto w-10" />
      </span>
    </span>
  );
}
