// markdown-audio.jsx
import {
  Crosshair,
  jsxRuntimeExports,
  PlaybackPauseIcon$1 as PlaybackPauseIcon,
  PlaybackPlayIcon$1 as PlaybackPlayIcon,
  reactExports,
  useCurrentWorkspace,
  useTranslation,
} from "../vendor.js";
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
import { cn$2 as cn } from "../infra/dialog-content.jsx";
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
function startExclusiveMarkdownAudio(next2) {
  if (activeMarkdownAudio && activeMarkdownAudio !== next2) {
    activeMarkdownAudio.pause();
  }
  activeMarkdownAudio = next2;
}
function clearExclusiveMarkdownAudio(current2) {
  if (activeMarkdownAudio === current2) {
    activeMarkdownAudio = null;
  }
}
function waveformHash(str2) {
  let h2 = 5381;
  for (let i2 = 0; i2 < str2.length; i2++) {
    h2 = ((h2 << 5) + h2 + str2.charCodeAt(i2)) | 0;
  }
  return Math.abs(h2);
}
function seededRandom(seed) {
  let s2 = seed;
  return () => {
    s2 = (s2 * 1103515245 + 12345) & 2147483647;
    return s2 / 2147483647;
  };
}
function generateBars(name2, count2) {
  const rng = seededRandom(waveformHash(name2));
  const bars2 = [];
  for (let i2 = 0; i2 < count2; i2++) {
    bars2.push(0.15 + rng() * 0.8);
  }
  return bars2;
}
function formatAudioTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const m3 = Math.floor(total / 60);
  const s2 = total % 60;
  return `${m3}:${s2.toString().padStart(2, "0")}`;
}
const WaveformBars = reactExports.memo(function WaveformBars2({
  bars: bars2,
  playedIndex,
}) {
  return (
    <>
      {bars2.map((ratio, i2) => {
        const barH = ratio * WAVEFORM_HEIGHT;
        const x2 = i2 * (WAVEFORM_BAR_WIDTH + WAVEFORM_BAR_GAP);
        const y4 = (WAVEFORM_HEIGHT - barH) / 2;
        return (
          <rect
            key={i2}
            x={x2}
            y={y4}
            width={WAVEFORM_BAR_WIDTH}
            height={barH}
            rx={WAVEFORM_BAR_RADIUS}
            ry={WAVEFORM_BAR_RADIUS}
            fill={
              i2 <= playedIndex
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
  const { t: t2 } = useTranslation();
  const workspaceId2 = useCurrentWorkspace();
  const audioRef = reactExports.useRef(null);
  const timeRef = reactExports.useRef(null);
  const playheadRef = reactExports.useRef(null);
  const rafRef = reactExports.useRef(0);
  const [error, setError] = reactExports.useState(false);
  const [playing, setPlaying] = reactExports.useState(false);
  const [duration, setDuration] = reactExports.useState(0);
  const [playedIndex, setPlayedIndex] = reactExports.useState(-1);
  const bars2 = reactExports.useMemo(
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
      workspacePath: workspaceId2,
      name: fileName,
      assetId: asset?.id,
    }),
    [asset?.id, fileName, relativePath, workspaceId2],
  );
  const canDrag = canWriteResourceDragData(dragSource);
  const hasCanvasNode = useHasAssetOnCanvas(asset?.id, workspaceId2);
  const handleError = reactExports.useCallback(() => setError(true), []);
  const handleLoadedMetadata = reactExports.useCallback(() => {
    const a2 = audioRef.current;
    if (a2) setDuration(a2.duration);
  }, []);
  const updateTimeDisplay = reactExports.useCallback((current2, total) => {
    if (timeRef.current) {
      timeRef.current.textContent = `${formatAudioTime(current2)} / ${formatAudioTime(total)}`;
    }
  }, []);
  reactExports.useEffect(() => {
    const a2 = audioRef.current;
    if (!a2 || !playing) return;
    let prevIndex = -1;
    const tick = () => {
      const ct3 = a2.currentTime;
      const d2 = a2.duration;
      updateTimeDisplay(ct3, d2);
      const progress = d2 > 0 ? ct3 / d2 : 0;
      if (playheadRef.current) {
        const x2 = progress * WAVEFORM_SVG_WIDTH - 1;
        playheadRef.current.setAttribute("x", String(x2));
        playheadRef.current.setAttribute(
          "visibility",
          progress > 0 ? "visible" : "hidden",
        );
      }
      const idx = Math.floor(progress * BAR_COUNT);
      if (idx !== prevIndex) {
        prevIndex = idx;
        setPlayedIndex(idx);
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
    const a2 = audioRef.current;
    if (a2) startExclusiveMarkdownAudio(a2);
    setPlaying(true);
  }, []);
  const togglePlay = reactExports.useCallback(() => {
    const a2 = audioRef.current;
    if (!a2) return;
    if (playing) {
      a2.pause();
      setPlaying(false);
      return;
    }
    if (a2) {
      startExclusiveMarkdownAudio(a2);
      a2.play().catch(() => {
        setError(true);
        clearExclusiveMarkdownAudio(a2);
        setPlaying(false);
      });
      setPlaying(true);
    }
  }, [playing]);
  const handleSeek = reactExports.useCallback(
    (e2) => {
      const a2 = audioRef.current;
      if (!a2 || !duration) return;
      const rect = e2.currentTarget.getBoundingClientRect();
      const p3 = Math.max(
        0,
        Math.min(1, (e2.clientX - rect.left) / rect.width),
      );
      a2.currentTime = p3 * duration;
      setPlayedIndex(Math.floor(p3 * BAR_COUNT));
      updateTimeDisplay(a2.currentTime, duration);
      if (playheadRef.current) {
        playheadRef.current.setAttribute(
          "x",
          String(p3 * WAVEFORM_SVG_WIDTH - 1),
        );
        playheadRef.current.setAttribute(
          "visibility",
          p3 > 0 ? "visible" : "hidden",
        );
      }
    },
    [duration, updateTimeDisplay],
  );
  const handleLocate = reactExports.useCallback(() => {
    if (!asset?.id || !workspaceId2) return;
    const nodeIds = getNodeIdsForAsset(asset.id, workspaceId2);
    if (nodeIds.length === 0) return;
    workspaceEvents.fireCanvasFocus(workspaceId2, nodeIds);
  }, [asset?.id, workspaceId2]);
  const handleDragStart = reactExports.useCallback(
    (event) => {
      if (!writeResourceDragData(event, dragSource)) event.preventDefault();
    },
    [dragSource],
  );
  const playTitle = playing
    ? t2("chat.pauseAudio", {
        defaultValue: "Pause audio",
      })
    : t2("chat.playAudio", {
        defaultValue: "Play audio",
      });
  const locateTitle = t2("assetPreview.locateOnCanvas", {
    defaultValue: "Locate on canvas",
  });
  if (error) {
    return (
      <span className="block rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground">
        {t2("chat.failedToLoadAudio")}
        {alt ? `: ${alt}` : ""}
      </span>
    );
  }
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: native drag source keeps existing preview controls intact
    <span
      data-slot={dataSlot}
      data-artifact-type="audio"
      className={cn(
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
          aria-label={alt || t2("a11y.audioWaveform")}
          style={{
            display: "block",
            cursor: "pointer",
          }}
          onClick={handleSeek}
        >
          <WaveformBars bars={bars2} playedIndex={playedIndex} />
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
