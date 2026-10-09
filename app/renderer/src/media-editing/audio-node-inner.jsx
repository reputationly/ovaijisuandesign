// audio-node-inner.jsx
import {
  AUDIO_CARD_SIZE,
  isGenerationErrorStatus,
} from "../canvas/compute-group-bounds-from-children.js";
import {
  Download$2,
  isUserProvidedAssetModel,
  jsxRuntimeExports,
  PlaybackCircleToggleIcon,
  reactExports,
  useReactFlow,
  useTranslation,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { AudioActionSurface } from "./audio-action-surface.jsx";
import { useNodeRename } from "../infra/use-node-rename.js";
import { useNodeIsEmpty } from "../infra/create-recently-added-store.js";
import {
  formatTime$2,
  MEDIA_NODE_RADIUS,
  useAssetMeta,
  useCanvasBridge,
  useCanvasIsBoxSelecting,
  useCanvasIsMultiSelect,
  useGenerating,
  useGeneratingStateApi,
  useMediaPlayback,
} from "./package.jsx";
import {
  formatFileSize,
  getFileExtension,
  useCanvasActiveDeferred,
  useCanvasNodeIsDragging,
  useViewportStatus,
} from "../canvas/fullscreen-icon.jsx";
import {
  AudioPlaceholderIcon,
  GeneratingMediaArea,
  shouldRenderMediaActionSurface,
} from "../canvas/generating-media-area.jsx";
import { useMediaNodeActions } from "../canvas/use-media-node-actions.jsx";
import {
  NodeShell,
  PlaceholderUploadButton,
  QueueGenerationControl,
  useMediaFallbackRetry,
} from "../canvas/node-shell-inner.jsx";
import { useMediaFallbackSize } from "../canvas/reconcile-media-fallback-style.js";
import { NodeBody } from "../canvas/node-body-inner.jsx";
import {
  isMissingAssetNodeData,
  MEDIA_FALLBACK_NODE_SIZE,
  MediaUnpreviewableFallback,
  MissingAssetCard,
} from "../generation/missing-asset-card.jsx";
import { MediaGenerationErrorOverlay } from "../generation/media-generation-error-overlay.jsx";
import {
  isCloneData,
  readGenerationStartedAt,
  useSimulatedProgress,
  useWarnMissingAssetMeta,
} from "./use-warn-missing-asset-meta.jsx";
import { NodeHeader } from "../canvas/node-header-inner.jsx";
import { NodeHandles } from "../canvas/proximity-handle-inner.jsx";

function hashCode(str2) {
  let hash2 = 5381;
  for (let i2 = 0; i2 < str2.length; i2++) {
    hash2 = ((hash2 << 5) + hash2 + str2.charCodeAt(i2)) | 0;
  }
  return Math.abs(hash2);
}

function seededRandom$1(seed) {
  let s2 = seed;
  return () => {
    s2 = (s2 * 1103515245 + 12345) & 2147483647;
    return s2 / 2147483647;
  };
}

const WAVEFORM_HEIGHT$1 = 64;

const BAR_WIDTH = 3;

const BAR_GAP$3 = 2;

const BAR_RADIUS = BAR_WIDTH / 2;

const MAX_BAR_HEIGHT_RATIO = 40 / WAVEFORM_HEIGHT$1;

const MIN_BAR_HEIGHT_RATIO = BAR_WIDTH / WAVEFORM_HEIGHT$1;

const PLAYHEAD_HIT_WIDTH = 12;

function generateBarHeights(fileName, count2) {
  const rng = seededRandom$1(hashCode(fileName));
  const heights = [];
  for (let i2 = 0; i2 < count2; i2++) {
    heights.push(
      MIN_BAR_HEIGHT_RATIO +
        rng() * (MAX_BAR_HEIGHT_RATIO - MIN_BAR_HEIGHT_RATIO),
    );
  }
  return heights;
}

function roundedBarPath(x2, y4, width, height) {
  const radius = Math.min(BAR_RADIUS, width / 2, height / 2);
  const right = x2 + width;
  const bottom = y4 + height;
  return `M${x2 + radius},${y4}H${right - radius}Q${right},${y4} ${right},${y4 + radius}V${bottom - radius}Q${right},${bottom} ${right - radius},${bottom}H${x2 + radius}Q${x2},${bottom} ${x2},${bottom - radius}V${y4 + radius}Q${x2},${y4} ${x2 + radius},${y4}Z`;
}

function buildWaveformPath(barHeights, height) {
  return barHeights
    .map((ratio, index2) => {
      const barHeight = ratio * height;
      return roundedBarPath(
        index2 * (BAR_WIDTH + BAR_GAP$3),
        (height - barHeight) / 2,
        BAR_WIDTH,
        barHeight,
      );
    })
    .join("");
}

const AudioWaveformInner = reactExports.forwardRef(function AudioWaveformInner2(
  { fileName, progress, width, height, onClick },
  ref,
) {
  const { t: t2 } = useTranslation();
  const svgRef = reactExports.useRef(null);
  const isDraggingRef = reactExports.useRef(false);
  const barCount = Math.floor(width / (BAR_WIDTH + BAR_GAP$3));
  const barHeights = reactExports.useMemo(
    () => generateBarHeights(fileName, barCount),
    [fileName, barCount],
  );
  const waveformPath = reactExports.useMemo(
    () => buildWaveformPath(barHeights, height),
    [barHeights, height],
  );
  const clipId = `audio-waveform-${reactExports.useId().replace(/:/g, "")}`;
  const playheadX = progress * width;
  const playedClipRef = reactExports.useRef(null);
  const playheadLineRef = reactExports.useRef(null);
  const playheadHitRef = reactExports.useRef(null);
  reactExports.useImperativeHandle(
    ref,
    () => ({
      setPlayheadProgress(p3) {
        const clamped = p3 < 0 ? 0 : p3 > 1 ? 1 : p3;
        const px = clamped * width;
        const lineEl = playheadLineRef.current;
        if (lineEl) {
          lineEl.setAttribute("x", String(px - 1));
          lineEl.style.visibility =
            clamped > 0 && clamped < 1 ? "visible" : "hidden";
        }
        const hitEl = playheadHitRef.current;
        if (hitEl) {
          hitEl.setAttribute("x", String(px - PLAYHEAD_HIT_WIDTH / 2));
          hitEl.style.visibility = clamped > 0 ? "visible" : "hidden";
        }
        playedClipRef.current?.setAttribute("width", String(px));
      },
    }),
    [width],
  );
  const getProgressFromClientX = reactExports.useCallback((clientX) => {
    const svg2 = svgRef.current;
    if (!svg2) return 0;
    const rect = svg2.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }, []);
  const handleClick2 = reactExports.useCallback(
    (e2) => {
      if (!onClick || isDraggingRef.current) return;
      onClick(getProgressFromClientX(e2.clientX));
    },
    [onClick, getProgressFromClientX],
  );
  const handlePlayheadPointerDown = reactExports.useCallback(
    (e2) => {
      if (!onClick) return;
      e2.stopPropagation();
      e2.preventDefault();
      e2.currentTarget.setPointerCapture(e2.pointerId);
      isDraggingRef.current = true;
    },
    [onClick],
  );
  const handlePlayheadPointerMove = reactExports.useCallback(
    (e2) => {
      if (!isDraggingRef.current || !onClick) return;
      onClick(getProgressFromClientX(e2.clientX));
    },
    [onClick, getProgressFromClientX],
  );
  const handlePlayheadPointerUp = reactExports.useCallback(
    (e2) => {
      if (!isDraggingRef.current) return;
      e2.currentTarget.releasePointerCapture(e2.pointerId);
      isDraggingRef.current = false;
      if (onClick) {
        onClick(getProgressFromClientX(e2.clientX));
      }
    },
    [onClick, getProgressFromClientX],
  );
  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={t2("a11y.audioWaveform")}
      style={{
        display: "block",
        cursor: onClick ? "pointer" : "default",
      }}
      onClick={handleClick2}
      onKeyDown={(e2) => {
        if (e2.key === "Enter" || e2.key === " ") {
          handleClick2(e2);
        }
      }}
    >
      <title>{t2("a11y.audioWaveform")}</title>
      <defs>
        <clipPath id={clipId}>
          <rect
            ref={playedClipRef}
            x={0}
            y={0}
            width={playheadX}
            height={height}
          />
        </clipPath>
      </defs>
      <path d={waveformPath} fill="currentColor" fillOpacity={0.3} />
      <path d={waveformPath} fill="currentColor" clipPath={`url(#${clipId})`} />
      <rect
        ref={playheadLineRef}
        x={playheadX - 1}
        y={0}
        width={2}
        height={height}
        fill="var(--brand-accent, #6D6CFF)"
        style={{
          pointerEvents: "none",
          visibility: progress > 0 && progress < 1 ? "visible" : "hidden",
        }}
      />
      <rect
        ref={playheadHitRef}
        x={playheadX - PLAYHEAD_HIT_WIDTH / 2}
        y={0}
        width={PLAYHEAD_HIT_WIDTH}
        height={height}
        fill="transparent"
        style={{
          cursor: "ew-resize",
          visibility: progress > 0 ? "visible" : "hidden",
        }}
        onClick={(e2) => e2.stopPropagation()}
        onPointerDown={handlePlayheadPointerDown}
        onPointerMove={handlePlayheadPointerMove}
        onPointerUp={handlePlayheadPointerUp}
      />
    </svg>
  );
});

const AudioWaveform = reactExports.memo(AudioWaveformInner, (prev, next2) => {
  return (
    prev.fileName === next2.fileName &&
    prev.progress === next2.progress &&
    prev.width === next2.width &&
    prev.height === next2.height &&
    prev.onClick === next2.onClick
  );
});

function resolveCanvasAudioSource({
  resourceActive,
  url: url2,
  viewportStatus,
  isPlaying = false,
}) {
  if (!resourceActive) return void 0;
  if (viewportStatus === "far" && !isPlaying) return void 0;
  return url2;
}

const WAVEFORM_H_PADDING = 16;

const WAVEFORM_CONTAINER_HEIGHT = 64;

const WAVEFORM_WIDTH = AUDIO_CARD_SIZE.width - WAVEFORM_H_PADDING * 2;

export function AudioNodeInner({ id: id2, data: data2, selected: selected2 }) {
  const { t: t2 } = useTranslation();
  const generatingStateStore = useGeneratingStateApi();
  const meta2 = useAssetMeta(id2);
  const {
    onAddToChat,
    cropImage,
    onPlaceholderUpload,
    onPromoteToAsset,
    onSaveAs,
    onRetryGeneration,
    isRetryGenerationPending,
    onCancelGenerationQueue,
    isCancelGenerationQueuePending,
  } = useCanvasBridge();
  const isMultiSelect = useCanvasIsMultiSelect();
  const isDragging = useCanvasNodeIsDragging(id2);
  const isBoxSelecting = useCanvasIsBoxSelecting();
  const onRename = useNodeRename(id2, isCloneData(data2));
  const hasEmptyId = useNodeIsEmpty(id2);
  const isUserEmpty = hasEmptyId && !meta2;
  const isVoiceDesign =
    meta2?.model_id === "voice-design" || meta2?.source_tool === "design_voice";
  const isVoiceClone =
    meta2?.model_id === "voice-clone" || meta2?.source_tool === "voice_clone";
  const liveGenerating = useGenerating(id2);
  const persistedGenerating = reactExports.useMemo(() => {
    const persisted = data2;
    if (persisted?.status !== "pending" && persisted?.status !== "generating")
      return void 0;
    const prompt = typeof persisted.prompt === "string" ? persisted.prompt : "";
    const model =
      typeof persisted.model === "string"
        ? persisted.model
        : typeof persisted.model_id === "string"
          ? persisted.model_id
          : t2("canvas.audio");
    return {
      prompt,
      model,
      phase: persisted.status,
      prevUrl: meta2?.url,
      generationStartedAt: readGenerationStartedAt(persisted),
    };
  }, [data2, meta2?.url, t2]);
  const persistedErrorMessage =
    isGenerationErrorStatus(data2.status) &&
    typeof data2.errorMessage === "string"
      ? data2.errorMessage
      : void 0;
  const persistedErrorReason =
    isGenerationErrorStatus(data2.status) &&
    typeof data2.errorReason === "string"
      ? data2.errorReason
      : void 0;
  const persistedQueuePaused = data2.status === "queue_paused";
  const persistedRetryPayload =
    (isGenerationErrorStatus(data2.status) || persistedQueuePaused) &&
    data2.retryPayload &&
    typeof data2.retryPayload === "object"
      ? data2.retryPayload
      : void 0;
  reactExports.useEffect(() => {
    if (persistedErrorMessage !== void 0 || persistedQueuePaused) {
      generatingStateStore.getState().clear(id2);
    }
  }, [persistedErrorMessage, persistedQueuePaused, id2, generatingStateStore]);
  const generating =
    persistedErrorMessage !== void 0 || persistedQueuePaused
      ? void 0
      : persistedGenerating?.phase === "pending"
        ? persistedGenerating
        : (liveGenerating ?? persistedGenerating);
  const isGenerating = generating !== void 0;
  const isQueued = generating?.phase === "pending";
  const handleResumeQueue = reactExports.useCallback(() => {
    if (!persistedRetryPayload) return;
    onRetryGeneration?.(id2, persistedRetryPayload);
  }, [id2, onRetryGeneration, persistedRetryPayload]);
  const handleCancelQueue = reactExports.useCallback(() => {
    onCancelGenerationQueue?.(id2);
  }, [id2, onCancelGenerationQueue]);
  const generatingProgress = useSimulatedProgress(
    isGenerating && !isQueued,
    "audio",
    // Durable node.data wins over the in-memory store: it is the only source
    // that survives workspace close / app restart.
    persistedGenerating?.generationStartedAt ?? generating?.generationStartedAt,
  );
  const reactFlow = useReactFlow();
  reactExports.useEffect(() => {
    if (isGenerating && meta2?.url && meta2.url !== generating?.prevUrl) {
      generatingStateStore.getState().clear(id2);
    }
  }, [
    isGenerating,
    meta2?.url,
    generating?.prevUrl,
    id2,
    generatingStateStore,
  ]);
  const generationErrorMessage = isGenerating
    ? generating?.error
    : persistedErrorMessage;
  const isErrorGenerating = !!generationErrorMessage;
  const generationErrorStatus = generationErrorMessage
    ? isGenerating
      ? (generating?.errorStatus ?? "error")
      : isGenerationErrorStatus(data2.status)
        ? data2.status
        : "error"
    : void 0;
  const lastSyncActionRef = reactExports.useRef("none");
  reactExports.useEffect(() => {
    const prev = lastSyncActionRef.current;
    if (isErrorGenerating) {
      if (prev !== "error") {
        reactFlow.setNodes((nodes) =>
          nodes.map((n2) => {
            if (n2.id !== id2) return n2;
            const { width: _w, height: _h, ...rest } = n2;
            return rest;
          }),
        );
        lastSyncActionRef.current = "error";
      }
      return;
    }
    if (prev !== "none") {
      reactFlow.setNodes((nodes) =>
        nodes.map((n2) => {
          if (n2.id !== id2) return n2;
          const { width: _w, height: _h, ...rest } = n2;
          return rest;
        }),
      );
      lastSyncActionRef.current = "none";
    }
  }, [isErrorGenerating, id2, reactFlow]);
  const mediaActions = useMediaNodeActions({
    nodeId: id2,
    toolbarActive:
      !!selected2 && !isMultiSelect && !isDragging && !isBoxSelecting,
    meta: meta2,
    fallbackPath:
      typeof data2.path === "string" ? data2.path || void 0 : void 0,
    fallbackWidth: AUDIO_CARD_SIZE.width,
    onAddToChat,
    cropImage,
    onPromoteToAsset,
  });
  const openLightbox = mediaActions.openLightbox;
  const showClipPanel = mediaActions.showClipPanel;
  const showLightbox = mediaActions.showLightbox;
  const canOpenPopover =
    isUserEmpty ||
    (!!meta2?.model &&
      !isUserProvidedAssetModel(meta2.model) &&
      meta2.model !== "voice-isolation");
  const isInteractiveSelect = !isMultiSelect && !isDragging && !isBoxSelecting;
  const audioRef = reactExports.useRef(null);
  const rafRef = reactExports.useRef(0);
  const playedRef = reactExports.useRef(null);
  const durationRef = reactExports.useRef(null);
  const [duration, setDuration] = reactExports.useState(0);
  const progressRef = reactExports.useRef(0);
  const waveformRef = reactExports.useRef(null);
  const audioRetry = useMediaFallbackRetry();
  const audioError = audioRetry.failed;
  const resetAudioRetry = audioRetry.reset;
  const isPlaying = useMediaPlayback((s2) => s2.playingId === id2);
  const play = useMediaPlayback((s2) => s2.play);
  const stop = useMediaPlayback((s2) => s2.stop);
  const viewportStatus = useViewportStatus(
    id2,
    AUDIO_CARD_SIZE.width,
    AUDIO_CARD_SIZE.height,
  );
  const resourceActive = useCanvasActiveDeferred();
  const audioSource = resolveCanvasAudioSource({
    resourceActive,
    url: meta2?.url,
    viewportStatus,
    isPlaying,
  });
  reactExports.useEffect(() => {
    resetAudioRetry();
  }, [meta2?.url, resetAudioRetry]);
  reactExports.useEffect(() => {
    if ((showClipPanel || showLightbox) && isPlaying) stop();
  }, [showClipPanel, showLightbox, isPlaying, stop]);
  reactExports.useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.play().catch(() => {
        stop();
      });
    } else {
      audio.pause();
    }
  }, [isPlaying, stop]);
  reactExports.useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !isPlaying) return;
    const tick = () => {
      const t22 = audio.currentTime;
      const d2 = audio.duration;
      progressRef.current = d2 > 0 ? t22 / d2 : 0;
      if (playedRef.current) {
        playedRef.current.textContent = formatTime$2(t22);
      }
      if (durationRef.current) {
        durationRef.current.textContent = formatTime$2(d2, true);
      }
      waveformRef.current?.setPlayheadProgress(progressRef.current);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying]);
  const handleLoadedMetadata = reactExports.useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      setDuration(audio.duration);
    }
  }, []);
  const handleEnded = reactExports.useCallback(() => {
    stop();
    progressRef.current = 0;
    waveformRef.current?.setPlayheadProgress(0);
    if (playedRef.current) {
      playedRef.current.textContent = formatTime$2(0);
    }
    if (durationRef.current) {
      durationRef.current.textContent = formatTime$2(duration, true);
    }
  }, [stop, duration]);
  const handleTogglePlay = reactExports.useCallback(
    (e2) => {
      e2.stopPropagation();
      if (!meta2?.url) return;
      if (isPlaying) {
        stop();
      } else {
        play(id2);
      }
    },
    [isPlaying, id2, play, stop, meta2?.url],
  );
  const handleDownload = reactExports.useCallback(
    (e2) => {
      e2.stopPropagation();
      if (!onSaveAs || !meta2?.path) return;
      onSaveAs(meta2.path, meta2.name);
    },
    [onSaveAs, meta2?.path, meta2?.name],
  );
  const handleSeek = reactExports.useCallback(
    (p3) => {
      const audio = audioRef.current;
      if (!audio || !duration) return;
      audio.currentTime = p3 * duration;
      progressRef.current = p3;
      waveformRef.current?.setPlayheadProgress(p3);
      if (playedRef.current) {
        playedRef.current.textContent = formatTime$2(audio.currentTime);
      }
      if (durationRef.current) {
        durationRef.current.textContent = formatTime$2(duration, true);
      }
    },
    [duration],
  );
  useWarnMissingAssetMeta({
    nodeId: id2,
    nodeType: "audio",
    data: data2,
    meta: meta2,
    isUserEmpty,
  });
  const isEmpty2 = isUserEmpty || !meta2?.url;
  useMediaFallbackSize(
    id2,
    audioError &&
      !isEmpty2 &&
      !isErrorGenerating &&
      !isGenerating &&
      !persistedQueuePaused &&
      !isMissingAssetNodeData(data2),
  );
  if (isMissingAssetNodeData(data2)) {
    return (
      <MissingAssetCard
        nodeId={id2}
        name={typeof data2?.name === "string" ? data2.name : void 0}
      />
    );
  }
  if (!meta2 && !isUserEmpty) return null;
  const shellWidth = audioError
    ? MEDIA_FALLBACK_NODE_SIZE.width
    : AUDIO_CARD_SIZE.width;
  const bodyHeight = audioError
    ? MEDIA_FALLBACK_NODE_SIZE.height
    : AUDIO_CARD_SIZE.height;
  const useBodyPanelChrome =
    isEmpty2 && !isErrorGenerating && !isGenerating && !persistedQueuePaused;
  return (
    <NodeShell
      id={id2}
      tagIds={meta2?.tagIds}
      width={shellWidth}
      dataActionUiId="canvas.audio-node"
      dataState={
        isErrorGenerating
          ? "error"
          : isUserEmpty
            ? "empty"
            : isGenerating
              ? "generating"
              : meta2?.url
                ? "generated"
                : "empty"
      }
      onDoubleClick={canOpenPopover ? void 0 : openLightbox}
      generating={isGenerating}
    >
      <NodeHeader
        nodeType="audio"
        tagIds={meta2?.tagIds}
        name={
          isVoiceDesign
            ? meta2?.voiceId
              ? `${t2("canvas.voiceDesign.nodeName", "音色设计")} · ${meta2.voiceId}`
              : t2("canvas.voiceDesign.nodeName", "音色设计")
            : isVoiceClone
              ? meta2?.voiceId
                ? `${t2("canvas.voiceClone.nodeName", "音色克隆")} · ${meta2.voiceId}`
                : t2("canvas.voiceClone.nodeName", "音色克隆")
              : meta2?.name || t2("canvas.audio")
        }
        selected={selected2}
        maxWidth={shellWidth}
        onRename={isVoiceDesign || isVoiceClone ? void 0 : onRename}
      />
      <NodeBody
        width={shellWidth}
        tagIds={meta2?.tagIds}
        height={
          isErrorGenerating ||
          isGenerating ||
          persistedQueuePaused ||
          useBodyPanelChrome
            ? bodyHeight
            : void 0
        }
        selected={selected2}
        borderRadius={MEDIA_NODE_RADIUS}
        variant={useBodyPanelChrome ? "panel" : "media"}
      >
        {generationErrorMessage ? (
          <MediaGenerationErrorOverlay
            nodeId={id2}
            nodeType="audio"
            message={generationErrorMessage}
            errorReason={
              isGenerating ? generating?.errorReason : persistedErrorReason
            }
            retryPayload={
              isGenerating ? generating?.retryPayload : persistedRetryPayload
            }
            recoverable={generationErrorStatus === "recoverable_error"}
            uncertain={generationErrorStatus === "status_unknown"}
          />
        ) : persistedQueuePaused ? (
          <GeneratingMediaArea
            width="100%"
            height="100%"
            icon={<AudioPlaceholderIcon />}
            variant="queued"
            label={
              <QueueGenerationControl
                state="paused"
                onResume={handleResumeQueue}
                resuming={isRetryGenerationPending?.(id2) ?? false}
                canResume={!!persistedRetryPayload}
                actionUiId="canvas.audio-node.queue"
              />
            }
          />
        ) : isGenerating ? (
          <GeneratingMediaArea
            width="100%"
            height="100%"
            icon={<AudioPlaceholderIcon />}
            progress={isQueued ? void 0 : generatingProgress}
            variant={isQueued ? "queued" : "generating"}
            label={
              isQueued ? (
                <QueueGenerationControl
                  state="queued"
                  onCancel={handleCancelQueue}
                  cancelling={isCancelGenerationQueuePending?.(id2) ?? false}
                  actionUiId="canvas.audio-node.queue"
                />
              ) : (
                void 0
              )
            }
          />
        ) : isEmpty2 ? (
          <PlaceholderUploadButton
            icon={<AudioPlaceholderIcon />}
            label={t2("canvas.uploadAudio")}
            onUpload={(anchor) => onPlaceholderUpload?.(id2, "audio", anchor)}
          />
        ) : audioError ? (
          <MediaUnpreviewableFallback
            displayName={meta2?.name ?? t2("canvas.audio")}
            extension={getFileExtension(meta2?.name)}
            sizeLabel={formatFileSize(meta2?.fileSize)}
          />
        ) : (
          <>
            {audioSource && (
              <>
                <audio
                  key={audioRetry.attempt}
                  ref={audioRef}
                  src={audioSource}
                  preload="metadata"
                  loop={true}
                  onLoadedMetadata={handleLoadedMetadata}
                  onEnded={handleEnded}
                  onError={audioRetry.onError}
                />
              </>
            )}
            <div
              style={{
                width: "100%",
                height: "100%",
                // Tighter chrome: 6px top/left/right (was 12px) for a more
                // compact frame around the waveform. Bottom kept at 12px
                // so the play button + time strip don't crowd the card
                // edge — design called out "底部太紧 / 上部太空" so we
                // narrow the top/sides and keep the bottom.
                padding: "6px 6px 12px 6px",
                background: "var(--canvas-node-bg, #fff)",
                border: "1px solid transparent",
                borderRadius: MEDIA_NODE_RADIUS,
                boxSizing: "border-box",
              }}
            >
              <div
                className="flex items-center justify-center bg-foreground/[0.04] py-2"
                style={{
                  borderRadius: 10,
                }}
              >
                <AudioWaveform
                  ref={waveformRef}
                  fileName={meta2?.name ?? ""}
                  progress={progressRef.current}
                  width={WAVEFORM_WIDTH}
                  height={WAVEFORM_CONTAINER_HEIGHT}
                  onClick={handleSeek}
                />
              </div>
              <div
                className="nodrag"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginTop: 8,
                  height: 20,
                  position: "relative",
                }}
              >
                <span
                  className="tabular-nums"
                  style={{
                    fontSize: 12,
                    whiteSpace: "nowrap",
                  }}
                >
                  <span
                    ref={playedRef}
                    style={{
                      color: "var(--fg-default, #141414)",
                    }}
                  >
                    {formatTime$2(0)}
                  </span>
                  <span
                    style={{
                      color: "var(--fg-muted, #525252)",
                    }}
                  >
                    {" / "}
                    <span ref={durationRef}>
                      {formatTime$2(duration, true)}
                    </span>
                  </span>
                </span>
                <button
                  type="button"
                  onClick={handleTogglePlay}
                  aria-label={
                    isPlaying ? t2("canvas.pause") : t2("canvas.play")
                  }
                  data-action-ui-id="canvas.audio.toggle-play"
                  style={{
                    position: "absolute",
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    border: "none",
                    background: "var(--primary)",
                    color: "var(--canvas-node-bg, #fff)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    padding: 0,
                    flexShrink: 0,
                  }}
                >
                  <PlaybackCircleToggleIcon playing={isPlaying} size={24} />
                </button>
                {onSaveAs && meta2?.path ? (
                  <button
                    type="button"
                    onClick={handleDownload}
                    data-action-ui-id="canvas.audio-node.download"
                    aria-label={t2("canvas.downloadAudio", "Download audio")}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 20,
                      height: 20,
                      padding: 0,
                      background: "transparent",
                      border: "none",
                      color: "var(--fg-muted, #525252)",
                      cursor: "pointer",
                      flexShrink: 0,
                    }}
                  >
                    <Download$2 size={14} />
                  </button>
                ) : (
                  <div
                    style={{
                      width: 20,
                    }}
                  />
                )}
              </div>
            </div>
          </>
        )}
      </NodeBody>
      {shouldRenderMediaActionSurface({
        selected: !!selected2,
        showLightbox: mediaActions.showLightbox,
        showClipPanel: mediaActions.showClipPanel,
      }) && (
        <AudioActionSurface
          nodeId={id2}
          meta={meta2}
          data={data2}
          selected={!!selected2}
          generating={generating}
          isGenerating={isGenerating}
          isUserEmpty={isUserEmpty}
          isInteractiveSelect={isInteractiveSelect}
          anchor={{
            kind: "node",
          }}
          mediaActions={mediaActions}
        />
      )}
      <NodeHandles nodeId={id2} selected={!!selected2} />
    </NodeShell>
  );
}
