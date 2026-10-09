// media-clip-panel-inner.jsx
import { jsxRuntimeExports, PlaybackPlayIcon$1, PlaybackPauseIcon$1, Volume2, Maximize, useTranslation, reactExports, reactDomExports, Undo2, HILO_WORKSPACE_IDENTITY_QUERY, HILO_WORKSPACE_INSTANCE_QUERY, HILO_WORKSPACE_GENERATION_QUERY } from "../vendor.js";
import { getExtFromMime } from "../canvas/canvas-surface-recovery-scheduler.jsx";
import { VolumeX, useCanvasActive } from "./parse-item.jsx";
import { TIMELINE_CONFIG, LIGHT_THEME_COLORS, DARK_THEME_COLORS } from "../generation/params-popup.jsx";
import { calcInitialScale } from "./timeline-event-handler.js";
import { CloseIcon$1 } from "../canvas/generating-media-area.jsx";
import { Button$2 } from "../canvas/use-media-node-actions.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { appendWidth } from "./audio-preview-player.jsx";
import { MediaClipEngine } from "./media-clip-engine.js";
import { formatTime$1 } from "./timeline-renderer.js";
const VIDEO_AUX_ICON_SIZE = 20;
const VIDEO_AUX_ICON_STROKE_WIDTH = 1.25;
export function PlayIcon({ size: size2 = 14 }) {
  return <PlaybackPlayIcon$1 size={size2} />;
}
export function PauseIcon({ size: size2 = 14 }) {
  return <PlaybackPauseIcon$1 size={size2} />;
}
export function VolumeIcon() {
  return (
    <Volume2
      size={VIDEO_AUX_ICON_SIZE}
      strokeWidth={VIDEO_AUX_ICON_STROKE_WIDTH}
      aria-hidden={true}
    />
  );
}
export function VolumeMuteIcon() {
  return (
    <VolumeX
      size={VIDEO_AUX_ICON_SIZE}
      strokeWidth={VIDEO_AUX_ICON_STROKE_WIDTH}
      aria-hidden={true}
    />
  );
}
export function VolumeOnTablerIcon() {
  return (
    <Volume2
      size={VIDEO_AUX_ICON_SIZE}
      strokeWidth={VIDEO_AUX_ICON_STROKE_WIDTH}
      aria-hidden={true}
    />
  );
}
export function VolumeOffTablerIcon() {
  return (
    <VolumeX
      size={VIDEO_AUX_ICON_SIZE}
      strokeWidth={VIDEO_AUX_ICON_STROKE_WIDTH}
      aria-hidden={true}
    />
  );
}
export function FullscreenIcon() {
  return (
    <Maximize
      size={VIDEO_AUX_ICON_SIZE}
      strokeWidth={VIDEO_AUX_ICON_STROKE_WIDTH}
      aria-hidden={true}
    />
  );
}
const MIN_MEDIA_CLIP_DURATION = 0.1;
function splitMediaClipRange(range2, playhead, minDuration = MIN_MEDIA_CLIP_DURATION) {
  if (
    !Number.isFinite(range2.start) ||
    !Number.isFinite(range2.end) ||
    !Number.isFinite(playhead) ||
    !Number.isFinite(minDuration) ||
    minDuration <= 0 ||
    range2.end - range2.start < minDuration * 2 ||
    playhead - range2.start < minDuration ||
    range2.end - playhead < minDuration
  ) {
    return null;
  }
  return [
    {
      start: range2.start,
      end: playhead,
    },
    {
      start: playhead,
      end: range2.end,
    },
  ];
}
function splitMediaClipSegments(ranges, playhead, minDuration = MIN_MEDIA_CLIP_DURATION) {
  const targetIndex = ranges.findIndex(
    (range2) => playhead > range2.start && playhead < range2.end,
  );
  if (targetIndex < 0) return null;
  const splitRanges = splitMediaClipRange(ranges[targetIndex], playhead, minDuration);
  if (!splitRanges) return null;
  return [...ranges.slice(0, targetIndex), ...splitRanges, ...ranges.slice(targetIndex + 1)];
}
function undoMediaClipSegmentSplit(ranges, splitPoint) {
  const rightSegmentIndex = ranges.findIndex(
    (range2, index2) =>
      index2 > 0 && ranges[index2 - 1].end === splitPoint && range2.start === splitPoint,
  );
  if (rightSegmentIndex < 0) return null;
  const leftSegment = ranges[rightSegmentIndex - 1];
  const rightSegment = ranges[rightSegmentIndex];
  return [
    ...ranges.slice(0, rightSegmentIndex - 1),
    {
      start: leftSegment.start,
      end: rightSegment.end,
    },
    ...ranges.slice(rightSegmentIndex + 1),
  ];
}
const EMPTY_STATE$1 = {
  clips: [],
  totalDuration: 0,
  currentTime: 0,
  isPlaying: false,
  scale: 100,
  scrollX: 0,
  selectedClipIds: new Set(),
  hoverClipId: null,
  cropRange: null,
  segmentRanges: [],
  previewFrame: null,
};
const TIMELINE_CANVAS_HEIGHT =
  TIMELINE_CONFIG.RULER_HEIGHT +
  TIMELINE_CONFIG.VIDEO_TRACK_HEIGHT +
  TIMELINE_CONFIG.CLIP_PADDING * 2;
function MediaClipPanelInner({
  mediaUrl,
  mediaName,
  defaultMime,
  onClose,
  onExport,
  renderPreview: renderPreview2,
  exportOptions,
  onMediaLoaded,
  getExtFromMime: getExtFromMime2,
  titleKey = "canvas.clip",
  exportLabelKey = "canvas.export",
  cropEnabled = true,
  splitEnabled = false,
  produceExport,
}) {
  const { t: t2 } = useTranslation();
  const active2 = useCanvasActive();
  const [engine, setEngine] = reactExports.useState(null);
  const timelineCanvasRef = reactExports.useRef(null);
  const containerRef = reactExports.useRef(null);
  const timeDisplayRef = reactExports.useRef(null);
  const splitHistoryRef = reactExports.useRef([]);
  const selectedSegmentIndexRef = reactExports.useRef(null);
  const [loading, setLoading] = reactExports.useState(true);
  const [exporting, setExporting] = reactExports.useState(false);
  const [exportProgress, setExportProgress] = reactExports.useState(0);
  const [containerWidth, setContainerWidth] = reactExports.useState(0);
  reactExports.useEffect(() => {
    const isDark =
      typeof document !== "undefined" && document.documentElement.classList.contains("dark");
    const baseColors = isDark ? DARK_THEME_COLORS : LIGHT_THEME_COLORS;
    const controlsBg =
      typeof window !== "undefined"
        ? getComputedStyle(document.documentElement)
            .getPropertyValue("--canvas-controls-bg")
            .trim() || baseColors.BACKGROUND
        : baseColors.BACKGROUND;
    const eng = new MediaClipEngine({
      colors: {
        ...baseColors,
        BACKGROUND: controlsBg,
        // playhead 头部做成空心：填充色 = 面板背景，只剩 stroke 描边。
        // stroke 跟竖线同色（light 深 / dark 浅），描边在背景上始终可见。
        PLAYHEAD_FILL: controlsBg,
        PLAYHEAD_STROKE: baseColors.PLAYHEAD,
      },
      cropConfig: {
        minDuration: 0.1,
        maxDuration: 7200,
      },
      // 抽帧场景禁用拖拽滚动：单帧操作时缩略图区点击直接 seek，不进入 grab 抓手态。
      disableScrollDrag: !cropEnabled,
    });
    setEngine(eng);
    return () => eng.destroy();
  }, []);
  const subscribe2 = reactExports.useCallback(
    (cb) => engine?.subscribe(cb) ?? (() => {}),
    [engine],
  );
  const getSnapshot2 = reactExports.useCallback(
    () => engine?.getState() ?? EMPTY_STATE$1,
    [engine],
  );
  const state2 = reactExports.useSyncExternalStore(subscribe2, getSnapshot2);
  reactExports.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries2) => {
      const entry = entries2[0];
      if (entry) setContainerWidth(entry.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  reactExports.useEffect(() => {
    if (!engine) return;
    const abortController = new AbortController();
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const response = await fetch(mediaUrl, {
          signal: abortController.signal,
        });
        const blob = await response.blob();
        if (cancelled) return;
        const file = new File([blob], mediaName, {
          type: blob.type || defaultMime,
        });
        await engine.addMedia(file);
        if (cancelled) return;
        if (!cropEnabled) engine.setCropRange(null);
        onMediaLoaded?.(engine);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        console.warn("Failed to load media for clipping:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      abortController.abort();
    };
  }, [engine, mediaUrl, mediaName, defaultMime, onMediaLoaded, cropEnabled]);
  reactExports.useEffect(() => {
    if (!engine || containerWidth <= 0) return;
    const { totalDuration } = engine.getState();
    if (totalDuration <= 0) return;
    const scale2 = calcInitialScale(totalDuration, containerWidth);
    engine.setScale(scale2);
  }, [engine, containerWidth, loading]);
  reactExports.useEffect(() => {
    if (!engine) return;
    const canvas = timelineCanvasRef.current;
    if (!canvas || containerWidth <= 0) return;
    engine.attachCanvas(canvas, containerWidth);
    return () => engine.detachCanvas();
  }, [engine, containerWidth]);
  reactExports.useEffect(() => {
    if (!engine || !state2.isPlaying) return;
    let rafId2;
    const tick = () => {
      const s2 = engine.getState();
      if (timeDisplayRef.current) {
        timeDisplayRef.current.textContent = `${formatTime$1(s2.currentTime)} / ${formatTime$1(s2.totalDuration, true)}`;
      }
      rafId2 = requestAnimationFrame(tick);
    };
    rafId2 = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId2);
  }, [engine, state2.isPlaying]);
  const handleTogglePlay = reactExports.useCallback(() => {
    engine?.togglePlay();
  }, [engine]);
  const handleZoomIn = reactExports.useCallback(() => {
    engine?.zoomIn();
  }, [engine]);
  const handleZoomOut = reactExports.useCallback(() => {
    engine?.zoomOut();
  }, [engine]);
  const segmentRanges = state2.segmentRanges;
  const matchingSegmentIndex = state2.cropRange
    ? segmentRanges.findIndex(
        (range2) =>
          range2.start === state2.cropRange?.start && range2.end === state2.cropRange?.end,
      )
    : -1;
  const splitSourceRanges =
    segmentRanges.length > 0 ? segmentRanges : state2.cropRange ? [state2.cropRange] : [];
  const splitRanges =
    cropEnabled && splitEnabled
      ? splitMediaClipSegments(splitSourceRanges, state2.currentTime)
      : null;
  reactExports.useEffect(() => {
    const activeCropRange = state2.cropRange;
    if (!engine || exporting || segmentRanges.length === 0 || !activeCropRange) return;
    if (matchingSegmentIndex >= 0) {
      selectedSegmentIndexRef.current = matchingSegmentIndex;
      return;
    }
    const selectedIndex = selectedSegmentIndexRef.current;
    if (selectedIndex === null || !segmentRanges[selectedIndex]) return;
    splitHistoryRef.current = [];
    const nextRanges = segmentRanges.map((range2, index2) =>
      index2 === selectedIndex ? activeCropRange : range2,
    );
    engine.setSegmentRanges(nextRanges, activeCropRange);
  }, [engine, exporting, matchingSegmentIndex, segmentRanges, state2.cropRange]);
  const handleExport = reactExports.useCallback(async () => {
    if (!engine || exporting) return;
    setExporting(true);
    setExportProgress(0);
    try {
      if (produceExport) {
        const result = await produceExport(engine, mediaName, (p3) => setExportProgress(p3));
        if (!result) return;
        await onExport(result.blob, result.filename);
        onClose();
        return;
      }
      const blob = await engine.exportCrop({
        onProgress: (p3) => setExportProgress(p3),
        ...exportOptions,
      });
      if (!blob) return;
      const ext = getExtFromMime2(blob.type);
      const baseName = mediaName.replace(/\.[^.]+$/, "");
      const uuid = crypto.randomUUID().slice(0, 4);
      const filename = `${baseName}-clip-${uuid}.${ext}`;
      await onExport(blob, filename);
      onClose();
    } catch (err) {
      console.warn("Media clip export failed:", err);
    } finally {
      setExporting(false);
      setExportProgress(0);
    }
  }, [
    engine,
    exporting,
    mediaName,
    onExport,
    onClose,
    getExtFromMime2,
    exportOptions,
    produceExport,
  ]);
  const handleSplit = reactExports.useCallback(() => {
    if (!engine || exporting || !splitRanges) return;
    const splitIndex = splitSourceRanges.findIndex(
      (range2) => state2.currentTime > range2.start && state2.currentTime < range2.end,
    );
    const activeRange = splitRanges[splitIndex + 1];
    if (!activeRange) return;
    engine.pause();
    splitHistoryRef.current.push(state2.currentTime);
    selectedSegmentIndexRef.current = splitIndex + 1;
    engine.setSegmentRanges(splitRanges, activeRange);
  }, [engine, exporting, splitRanges, splitSourceRanges, state2.currentTime]);
  const handleUndoSplit = reactExports.useCallback(() => {
    if (!engine || exporting || segmentRanges.length < 2) return;
    const splitPoint = splitHistoryRef.current.at(-1);
    if (splitPoint === void 0) return;
    const restoredRanges = undoMediaClipSegmentSplit(segmentRanges, splitPoint);
    if (!restoredRanges) return;
    engine.pause();
    splitHistoryRef.current.pop();
    const activeRange = restoredRanges.find(
      (range2) => range2.start <= splitPoint && range2.end >= splitPoint,
    );
    selectedSegmentIndexRef.current = activeRange ? restoredRanges.indexOf(activeRange) : null;
    engine.setSegmentRanges(restoredRanges.length > 1 ? restoredRanges : [], activeRange);
  }, [engine, exporting, segmentRanges]);
  const canUndoSplit = !exporting && segmentRanges.length > 1 && splitHistoryRef.current.length > 0;
  reactExports.useEffect(() => {
    if (!active2) return;
    const handleKeyDown2 = (e2) => {
      if (e2.key === "Escape") {
        e2.stopPropagation();
        onClose();
      } else if (e2.key === " ") {
        e2.preventDefault();
        e2.stopPropagation();
        engine?.togglePlay();
      }
    };
    document.addEventListener("keydown", handleKeyDown2);
    return () => document.removeEventListener("keydown", handleKeyDown2);
  }, [active2, engine, onClose]);
  const backdropMouseDownTarget = reactExports.useRef(null);
  const handleBackdropMouseDown = reactExports.useCallback((e2) => {
    backdropMouseDownTarget.current = e2.target;
  }, []);
  const handleBackdropClick = reactExports.useCallback(
    (e2) => {
      if (e2.target === e2.currentTarget && backdropMouseDownTarget.current === e2.currentTarget) {
        onClose();
      }
    },
    [onClose],
  );
  const cropDuration = state2.cropRange
    ? (state2.cropRange.end - state2.cropRange.start).toFixed(1)
    : "0.0";
  return reactDomExports.createPortal(
    // biome-ignore lint/a11y/useKeyWithClickEvents: Escape key handled via document listener
    <div
      role="dialog"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-foreground/50 p-4 backdrop-blur-[8px] animate-[lightbox-fade-in_0.15s_ease-out]"
      onMouseDown={handleBackdropMouseDown}
      onClick={handleBackdropClick}
    >
      <div
        className="flex h-[min(760px,calc(100dvh-2rem))] w-[calc(100vw-2rem)] max-w-[900px] flex-col overflow-hidden rounded-xl border border-[var(--canvas-controls-border)] bg-[var(--canvas-controls-bg)] text-foreground shadow-[var(--canvas-shadow-dropdown)]"
        onClick={(e2) => e2.stopPropagation()}
        onDoubleClick={(e2) => e2.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--canvas-controls-border)] px-4 py-3">
          <span className="font-heading text-sm font-medium text-[var(--canvas-controls-text)]">
            {t2(titleKey)}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-md text-[var(--canvas-controls-text-muted)] transition-colors duration-150 hover:bg-[var(--canvas-controls-hover)] hover:text-[var(--canvas-controls-text)] focus-visible:ring-1 focus-visible:ring-[var(--canvas-controls-text)]"
          >
            <CloseIcon$1 />
          </button>
        </div>
        {renderPreview2({
          loading,
          engine,
          state: state2,
        })}
        <div className="flex shrink-0 items-center gap-3 border-t border-[var(--canvas-controls-border)] px-4 py-2">
          <button
            type="button"
            onClick={handleTogglePlay}
            disabled={loading}
            className="flex size-8 items-center justify-center rounded-full text-[var(--canvas-controls-text)] transition-colors duration-150 hover:bg-[var(--canvas-controls-hover)] disabled:opacity-30 focus-visible:ring-1 focus-visible:ring-[var(--canvas-controls-text)]"
          >
            {state2.isPlaying ? <PauseIcon /> : <PlayIcon />}
          </button>
          <span
            ref={timeDisplayRef}
            className="min-w-[70px] font-mono text-xs tabular-nums text-[var(--canvas-controls-text-muted)]"
          >
            {formatTime$1(state2.currentTime)}
            {" / "}
            {formatTime$1(state2.totalDuration, true)}
          </span>
          {cropEnabled && state2.cropRange && (
            <span className="font-mono text-xs tabular-nums text-[var(--canvas-controls-text-muted)]">
              [{formatTime$1(state2.cropRange.start)}
              {" - "}
              {formatTime$1(state2.cropRange.end)}] ({cropDuration}s)
            </span>
          )}
          <div className="flex-1" />
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={loading}
            className="flex size-7 items-center justify-center rounded-md text-sm text-[var(--canvas-controls-text-muted)] transition-colors duration-150 hover:bg-[var(--canvas-controls-hover)] hover:text-[var(--canvas-controls-text)] disabled:opacity-30 focus-visible:ring-1 focus-visible:ring-[var(--canvas-controls-text)]"
          >
            -
          </button>
          <button
            type="button"
            onClick={handleZoomIn}
            disabled={loading}
            className="flex size-7 items-center justify-center rounded-md text-sm text-[var(--canvas-controls-text-muted)] transition-colors duration-150 hover:bg-[var(--canvas-controls-hover)] hover:text-[var(--canvas-controls-text)] disabled:opacity-30 focus-visible:ring-1 focus-visible:ring-[var(--canvas-controls-text)]"
          >
            +
          </button>
        </div>
        <div ref={containerRef} className="shrink-0 px-4 pb-4">
          <canvas
            ref={timelineCanvasRef}
            style={{
              width: "100%",
              height: TIMELINE_CANVAS_HEIGHT,
              cursor: loading ? "default" : "pointer",
            }}
          />
        </div>
        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-[var(--canvas-controls-border)] px-5 py-3">
          {splitEnabled && (
            <>
              <button
                type="button"
                aria-label={t2("canvas.undo", "Undo")}
                data-action-ui-id="canvas.media-clip.undo-split"
                onClick={handleUndoSplit}
                disabled={!canUndoSplit}
                className="flex size-7 items-center justify-center text-muted-foreground transition-colors hover:text-foreground disabled:text-foreground/30"
              >
                <Undo2 size={14} strokeWidth={1.5} />
              </button>
              <Button$2
                variant="outline"
                size="sm"
                data-action-ui-id="canvas.media-clip.split"
                onClick={handleSplit}
                disabled={loading || exporting || !splitRanges}
                className="border-[var(--canvas-controls-border)] bg-transparent text-[var(--canvas-controls-text)] hover:bg-[var(--canvas-controls-hover)] hover:text-[var(--canvas-controls-text)]"
              >
                {t2("canvas.split", "切分")}
              </Button$2>
            </>
          )}
          <Button$2
            size="sm"
            onClick={handleExport}
            disabled={loading || exporting || (cropEnabled && !state2.cropRange)}
            loading={exporting}
            className="border-transparent bg-[var(--canvas-primary-btn-bg)] text-[var(--canvas-primary-btn-icon)] hover:bg-[var(--canvas-primary-btn-bg-hover)]"
          >
            {exporting ? `${Math.round(exportProgress * 100)}%` : t2(exportLabelKey)}
          </Button$2>
        </div>
      </div>
    </div>,
    document.body,
  );
}
export const MediaClipPanel = reactExports.memo(MediaClipPanelInner);
const getAudioExt = (mime) => getExtFromMime(mime, "mp3");
function AudioPreview$2({ loading, state: state2 }) {
  return (
    <div className="flex items-center justify-center h-[400px]">
      {loading ? (
        <div className="size-8 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
      ) : (
        <div className="flex items-center justify-center px-4 pt-3 pb-1">
          <div
            className="relative flex items-center justify-center rounded-xl overflow-hidden"
            style={{
              width: 200,
              height: 200,
              background: "linear-gradient(160deg, #8fb8a8 0%, #6a9b8a 40%, #5a8a7a 100%)",
            }}
          >
            {state2.isPlaying ? (
              <div
                className="flex items-end gap-[3px]"
                style={{
                  height: 40,
                }}
              >
                {[
                  {
                    anim: "eq-bar-1",
                    dur: "1.1s",
                  },
                  {
                    anim: "eq-bar-3",
                    dur: "0.9s",
                  },
                  {
                    anim: "eq-bar-5",
                    dur: "1.3s",
                  },
                  {
                    anim: "eq-bar-2",
                    dur: "1.0s",
                  },
                  {
                    anim: "eq-bar-4",
                    dur: "1.2s",
                  },
                  {
                    anim: "eq-bar-1",
                    dur: "0.8s",
                  },
                  {
                    anim: "eq-bar-3",
                    dur: "1.1s",
                  },
                ].map((cfg) => (
                  <div
                    key={`${cfg.anim}-${cfg.dur}`}
                    className="w-[4px] rounded-full"
                    style={{
                      background: "rgba(255,255,255,0.8)",
                      height: "40%",
                      animation: `${cfg.anim} ${cfg.dur} ease-in-out infinite`,
                    }}
                  />
                ))}
              </div>
            ) : (
              // biome-ignore lint/a11y/noSvgWithoutTitle: decorative icon
              <svg
                className="h-[56px] w-[48px]"
                viewBox="0 0 68 79"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M62.0257 0.0119325C64.3823 -0.162813 66.4369 1.60226 66.6169 3.95864L67.1484 10.9355C67.3281 13.2872 65.5734 15.3436 63.2227 15.5351L38.856 17.5189L39.8605 58.8066L39.8354 58.7815C39.6803 69.651 30.8283 78.4146 19.9219 78.4146C8.91911 78.4144 0.000544489 69.4953 0 58.4927C0 47.4895 8.91877 38.5668 19.9219 38.5666C23.3436 38.5666 26.5632 39.4327 29.3764 40.9522L28.5519 6.58699C28.4969 4.30478 30.239 2.37941 32.5153 2.2092L62.0257 0.0119325Z"
                  fill="url(#paint0_linear_audio_clip_icon)"
                />
                <defs>
                  <linearGradient
                    id="paint0_linear_audio_clip_icon"
                    x1="34.1841"
                    y1="6.93425"
                    x2="34.1841"
                    y2="79.2633"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop stopColor="white" stopOpacity="0.4" />
                    <stop offset="1" stopColor="#F5F7FF" />
                  </linearGradient>
                </defs>
              </svg>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
function AudioClipPanelInner({ audioUrl, audioName, onClose, onExport }) {
  const renderPreview2 = reactExports.useCallback((ctx) => <AudioPreview$2 {...ctx} />, []);
  return (
    <MediaClipPanel
      mediaUrl={audioUrl}
      mediaName={audioName}
      defaultMime="audio/mpeg"
      onClose={onClose}
      onExport={onExport}
      renderPreview={renderPreview2}
      getExtFromMime={getAudioExt}
    />
  );
}
export const AudioClipPanel = reactExports.memo(AudioClipPanelInner);
const MAX_SERVER_WIDTH = 2048;
function physicalWidth(displayWidth) {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  return Math.round(displayWidth * dpr);
}
export function buildThumbnailUrl(url2, displayWidth) {
  return appendWidth(url2, physicalWidth(displayWidth));
}
function buildSrcSet(baseUrl, displayWidth) {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const candidates2 = [
    Math.max(Math.min(Math.round(displayWidth * dpr * 0.5), MAX_SERVER_WIDTH), 16),
    Math.max(Math.min(Math.round(displayWidth * dpr), MAX_SERVER_WIDTH), 16),
    Math.max(Math.min(Math.round(displayWidth * dpr * 2), MAX_SERVER_WIDTH), 16),
  ];
  const unique2 = [...new Set(candidates2)];
  return unique2.map((width) => `${appendWidth(baseUrl, width)} ${width}w`).join(", ");
}
export function buildThumbnailSrcSet(url2, displayWidth) {
  return buildSrcSet(url2, displayWidth);
}
export function buildVideoThumbBase(baseUrl, filePath) {
  try {
    const sourceUrl = new URL(baseUrl);
    if (sourceUrl.protocol !== "http:" && sourceUrl.protocol !== "https:") {
      return void 0;
    }
    const encodedPath = filePath.split("/").map(encodeURIComponent).join("/");
    const thumbnailUrl = new URL(`/api/thumbnail/${encodedPath}`, sourceUrl.origin);
    for (const identityParam of [
      HILO_WORKSPACE_IDENTITY_QUERY,
      HILO_WORKSPACE_INSTANCE_QUERY,
      HILO_WORKSPACE_GENERATION_QUERY,
    ]) {
      const value = sourceUrl.searchParams.get(identityParam);
      if (value) thumbnailUrl.searchParams.set(identityParam, value);
    }
    return thumbnailUrl.toString();
  } catch {
    return void 0;
  }
}
export function buildVideoThumbnailUrl(baseUrl, filePath, displayWidth) {
  const base2 = buildVideoThumbBase(baseUrl, filePath);
  return base2 ? appendWidth(base2, physicalWidth(displayWidth)) : void 0;
}
