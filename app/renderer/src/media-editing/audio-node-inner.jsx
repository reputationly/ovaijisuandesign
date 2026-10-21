// audio-node-inner.jsx
import {
  AUDIO_CARD_SIZE,
  isGenerationErrorStatus,
} from "../canvas/compute-group-bounds-from-children.js";
import { isUserProvidedAssetModel } from "../infra/shared-runtime.js";
import jsxRuntimeExports from "react/jsx-runtime";
import reactExports from "react";
import { useTranslation } from "react-i18next";
import { Download$2 as Download } from "./custom-icons.js";
import { PlaybackCircleToggleIcon } from "./playback-icons.js";
import { useReactFlow } from "../vendor-fork/xyflow/react/index.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { AudioActionSurface } from "./audio-action-surface.jsx";
import { useNodeRename } from "../infra/use-node-rename.js";
import { useNodeIsEmpty } from "../infra/create-recently-added-store.js";
import {
  formatTime,
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
function hashCode(inputText) {
  let hash = 5381;
  for (let characterIndex = 0; characterIndex < inputText.length; characterIndex++) {
    hash = ((hash << 5) + hash + inputText.charCodeAt(characterIndex)) | 0;
  }
  return Math.abs(hash);
}
function seededRandom(seed) {
  let randomState = seed;
  return () => {
    randomState = (randomState * 1103515245 + 12345) & 2147483647;
    return randomState / 2147483647;
  };
}
const WAVEFORM_HEIGHT = 48;
const BAR_WIDTH = 3;
const BAR_GAP = 2;
const BAR_RADIUS = BAR_WIDTH / 2;
const MAX_BAR_HEIGHT_RATIO = 40 / WAVEFORM_HEIGHT;
const MIN_BAR_HEIGHT_RATIO = BAR_WIDTH / WAVEFORM_HEIGHT;
const PLAYHEAD_HIT_WIDTH = 12;
function generateBarHeights(fileName, count) {
  const randomValueGenerator = seededRandom(hashCode(fileName));
  const heights = [];
  for (let barIndex = 0; barIndex < count; barIndex++) {
    heights.push(
      MIN_BAR_HEIGHT_RATIO +
        randomValueGenerator() * (MAX_BAR_HEIGHT_RATIO - MIN_BAR_HEIGHT_RATIO),
    );
  }
  return heights;
}
function roundedBarPath(x, y, width, height) {
  const radius = Math.min(BAR_RADIUS, width / 2, height / 2);
  const right = x + width;
  const bottom = y + height;
  return `M${x + radius},${y}H${right - radius}Q${right},${y} ${right},${y + radius}V${bottom - radius}Q${right},${bottom} ${right - radius},${bottom}H${x + radius}Q${x},${bottom} ${x},${bottom - radius}V${y + radius}Q${x},${y} ${x + radius},${y}Z`;
}
function buildWaveformPath(barHeights, height) {
  return barHeights
    .map((ratio, index) => {
      const barHeight = ratio * height;
      return roundedBarPath(
        index * (BAR_WIDTH + BAR_GAP),
        (height - barHeight) / 2,
        BAR_WIDTH,
        barHeight,
      );
    })
    .join("");
}
const AudioWaveformInner = reactExports.forwardRef(function AudioWaveformInner22(
  { fileName, progress, width, height, onClick },
  ref,
) {
  const { t } = useTranslation();
  const svgRef = reactExports.useRef(null);
  const isDraggingRef = reactExports.useRef(false);
  const currentProgress = reactExports.useRef(progress);
  const barCount = Math.floor(width / (BAR_WIDTH + BAR_GAP));
  const barHeights = reactExports.useMemo(() => generateBarHeights(fileName, barCount), [fileName, barCount]);
  const waveformPath = reactExports.useMemo(() => buildWaveformPath(barHeights, height), [barHeights, height]);
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
        currentProgress.current = clamped;
        const px = clamped * width;
        const lineEl = playheadLineRef.current;
        if (lineEl) {
          lineEl.setAttribute("x", String(px - 1));
          lineEl.style.visibility = clamped > 0 && clamped < 1 ? "visible" : "hidden";
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
    const svg = svgRef.current;
    if (!svg) return 0;
    const rect = svg.getBoundingClientRect();
    if (rect.width <= 0) return 0;
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }, []);
  const handleClick = reactExports.useCallback(
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
      data-waveform-kind="decorative"
      tabIndex={onClick ? 0 : void 0}
      aria-label={t("a11y.audioWaveform")}
      style={{
        display: "block",
        cursor: onClick ? "pointer" : "default",
      }}
      onClick={handleClick}
      onKeyDown={(e2) => {
        if (!onClick || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(e2.key)) return;
        e2.preventDefault();
        e2.stopPropagation();
        const next =
          e2.key === "Home"
            ? 0
            : e2.key === "End"
              ? 1
              : currentProgress.current + (e2.key === "ArrowRight" ? 0.05 : -0.05);
        onClick(Math.max(0, Math.min(1, next)));
      }}
    >
      <title>{t("a11y.audioWaveform")}</title>
      <defs>
        <clipPath id={clipId}>
          <rect ref={playedClipRef} x={0} y={0} width={playheadX} height={height} />
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
        fill="var(--brand-accent)"
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
        onPointerCancel={() => {
          isDraggingRef.current = false;
        }}
        onLostPointerCapture={() => {
          isDraggingRef.current = false;
        }}
      />
    </svg>
  );
});
const AudioWaveform = reactExports.memo(AudioWaveformInner, (prev, next) => {
  return (
    prev.fileName === next.fileName &&
    prev.progress === next.progress &&
    prev.width === next.width &&
    prev.height === next.height &&
    prev.onClick === next.onClick
  );
});
function resolveCanvasAudioSource({
  resourceActive,
  url,
  viewportStatus,
  isPlaying = false,
}) {
  if (!resourceActive) return void 0;
  if (viewportStatus === "far" && !isPlaying) return void 0;
  return url;
}
const WAVEFORM_H_PADDING = 16;
const WAVEFORM_CONTAINER_HEIGHT = 64;
const WAVEFORM_WIDTH = 318;
export function AudioNodeInner({ id: nodeId, data, selected }) {
  const { t } = useTranslation();
  const generatingStateStore = useGeneratingStateApi();
  const meta = useAssetMeta(nodeId);
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
  const isDragging = useCanvasNodeIsDragging(nodeId);
  const isBoxSelecting = useCanvasIsBoxSelecting();
  const onRename = useNodeRename(nodeId, isCloneData(data));
  const hasEmptyId = useNodeIsEmpty(nodeId);
  const isUserEmpty = hasEmptyId && !meta;
  const isVoiceDesign =
    meta?.model_id === "voice-design" || meta?.source_tool === "design_voice";
  const isVoiceClone =
    meta?.model_id === "voice-clone" || meta?.source_tool === "voice_clone";
  const liveGenerating = useGenerating(nodeId);
  const persistedGenerating = reactExports.useMemo(() => {
    const persisted = data;
    if (persisted?.status !== "pending" && persisted?.status !== "generating")
      return void 0;
    const prompt = typeof persisted.prompt === "string" ? persisted.prompt : "";
    const model =
      typeof persisted.model === "string"
        ? persisted.model
        : typeof persisted.model_id === "string"
          ? persisted.model_id
          : t("canvas.audio");
    return {
      prompt,
      model,
      phase: persisted.status,
      prevUrl: meta?.url,
      generationStartedAt: readGenerationStartedAt(persisted),
    };
  }, [data, meta?.url, t]);
  const persistedErrorMessage =
    isGenerationErrorStatus(data.status) &&
    typeof data.errorMessage === "string"
      ? data.errorMessage
      : void 0;
  const persistedErrorReason =
    isGenerationErrorStatus(data.status) &&
    typeof data.errorReason === "string"
      ? data.errorReason
      : void 0;
  const persistedQueuePaused = data.status === "queue_paused";
  const persistedRetryPayload =
    (isGenerationErrorStatus(data.status) || persistedQueuePaused) &&
    data.retryPayload &&
    typeof data.retryPayload === "object"
      ? data.retryPayload
      : void 0;
  reactExports.useEffect(() => {
    if (persistedErrorMessage !== void 0 || persistedQueuePaused) {
      generatingStateStore.getState().clear(nodeId);
    }
  }, [persistedErrorMessage, persistedQueuePaused, nodeId, generatingStateStore]);
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
    onRetryGeneration?.(nodeId, persistedRetryPayload);
  }, [nodeId, onRetryGeneration, persistedRetryPayload]);
  const handleCancelQueue = reactExports.useCallback(() => {
    onCancelGenerationQueue?.(nodeId);
  }, [nodeId, onCancelGenerationQueue]);
  const generatingProgress = useSimulatedProgress(
    isGenerating && !isQueued,
    "audio",
    // Durable node.data wins over the in-memory store: it is the only source
    // that survives workspace close / app restart.
    persistedGenerating?.generationStartedAt ?? generating?.generationStartedAt,
  );
  const reactFlow = useReactFlow();
  reactExports.useEffect(() => {
    if (isGenerating && meta?.url && meta.url !== generating?.prevUrl) {
      generatingStateStore.getState().clear(nodeId);
    }
  }, [
    isGenerating,
    meta?.url,
    generating?.prevUrl,
    nodeId,
    generatingStateStore,
  ]);
  const generationErrorMessage = isGenerating
    ? generating?.error
    : persistedErrorMessage;
  const isErrorGenerating = !!generationErrorMessage;
  const generationErrorStatus = generationErrorMessage
    ? isGenerating
      ? (generating?.errorStatus ?? "error")
      : isGenerationErrorStatus(data.status)
        ? data.status
        : "error"
    : void 0;
  const lastSyncActionRef = reactExports.useRef("none");
  reactExports.useEffect(() => {
    const prev = lastSyncActionRef.current;
    if (isErrorGenerating) {
      if (prev !== "error") {
        reactFlow.setNodes((nodes) =>
          nodes.map((node) => {
            if (node.id !== nodeId) return node;
            const { width: _width, height: _height, ...rest } = node;
            return rest;
          }),
        );
        lastSyncActionRef.current = "error";
      }
      return;
    }
    if (prev !== "none") {
      reactFlow.setNodes((nodes) =>
        nodes.map((node) => {
          if (node.id !== nodeId) return node;
          const { width: _width, height: _height, ...rest } = node;
          return rest;
        }),
      );
      lastSyncActionRef.current = "none";
    }
  }, [isErrorGenerating, nodeId, reactFlow]);
  const mediaActions = useMediaNodeActions({
    nodeId,
    toolbarActive:
      !!selected && !isMultiSelect && !isDragging && !isBoxSelecting,
    meta,
    fallbackPath:
      typeof data.path === "string" ? data.path || void 0 : void 0,
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
    (!!meta?.model &&
      !isUserProvidedAssetModel(meta.model) &&
      meta.model !== "voice-isolation");
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
  const isPlaying = useMediaPlayback((playbackState) => playbackState.playingId === nodeId);
  const play = useMediaPlayback((playbackState) => playbackState.play);
  const stop = useMediaPlayback((playbackState) => playbackState.stop);
  const viewportStatus = useViewportStatus(
    nodeId,
    AUDIO_CARD_SIZE.width,
    AUDIO_CARD_SIZE.height,
  );
  const resourceActive = useCanvasActiveDeferred();
  const audioSource = resolveCanvasAudioSource({
    resourceActive,
    url: meta?.url,
    viewportStatus,
    isPlaying,
  });
  reactExports.useEffect(() => {
    resetAudioRetry();
  }, [meta?.url, resetAudioRetry]);
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
      const currentTime = audio.currentTime;
      const audioDuration = audio.duration;
      progressRef.current = audioDuration > 0 ? currentTime / audioDuration : 0;
      if (playedRef.current) {
        playedRef.current.textContent = formatTime(currentTime);
      }
      if (durationRef.current) {
        durationRef.current.textContent = formatTime(audioDuration, true);
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
      playedRef.current.textContent = formatTime(0);
    }
    if (durationRef.current) {
      durationRef.current.textContent = formatTime(duration, true);
    }
  }, [stop, duration]);
  const handleTogglePlay = reactExports.useCallback(
    (clickEvent) => {
      clickEvent.stopPropagation();
      if (!meta?.url) return;
      if (isPlaying) {
        stop();
      } else {
        play(nodeId);
      }
    },
    [isPlaying, nodeId, play, stop, meta?.url],
  );
  const handleDownload = reactExports.useCallback(
    (clickEvent) => {
      clickEvent.stopPropagation();
      if (!onSaveAs || !meta?.path) return;
      onSaveAs(meta.path, meta.name);
    },
    [onSaveAs, meta?.path, meta?.name],
  );
  const handleSeek = reactExports.useCallback(
    (progress) => {
      const audio = audioRef.current;
      if (!audio || !duration) return;
      audio.currentTime = progress * duration;
      progressRef.current = progress;
      waveformRef.current?.setPlayheadProgress(progress);
      if (playedRef.current) {
        playedRef.current.textContent = formatTime(audio.currentTime);
      }
      if (durationRef.current) {
        durationRef.current.textContent = formatTime(duration, true);
      }
    },
    [duration],
  );
  useWarnMissingAssetMeta({
    nodeId,
    nodeType: "audio",
    data,
    meta,
    isUserEmpty,
  });
  const isEmpty = isUserEmpty || !meta?.url;
  useMediaFallbackSize(
    nodeId,
    audioError &&
      !isEmpty &&
      !isErrorGenerating &&
      !isGenerating &&
      !persistedQueuePaused &&
      !isMissingAssetNodeData(data),
  );
  if (isMissingAssetNodeData(data)) {
    return (
      <MissingAssetCard
        nodeId={nodeId}
        name={typeof data?.name === "string" ? data.name : void 0}
      />
    );
  }
  if (!meta && !isUserEmpty) return null;
  const shellWidth = audioError
    ? MEDIA_FALLBACK_NODE_SIZE.width
    : AUDIO_CARD_SIZE.width;
  const bodyHeight = audioError
    ? MEDIA_FALLBACK_NODE_SIZE.height
    : AUDIO_CARD_SIZE.height;
  const useBodyPanelChrome =
    isEmpty && !isErrorGenerating && !isGenerating && !persistedQueuePaused;
  return (
    <NodeShell
      id={nodeId}
      tagIds={meta?.tagIds}
      width={shellWidth}
      dataActionUiId="canvas.audio-node"
      dataState={
        isErrorGenerating
          ? "error"
          : isUserEmpty
            ? "empty"
            : isGenerating
              ? "generating"
              : meta?.url
                ? "generated"
                : "empty"
      }
      onDoubleClick={canOpenPopover ? void 0 : openLightbox}
      generating={isGenerating}
    >
      <NodeHeader
        nodeType="audio"
        tagIds={meta?.tagIds}
        name={
          isVoiceDesign
            ? meta?.voiceId
              ? `${t("canvas.voiceDesign.nodeName", "音色设计")} · ${meta.voiceId}`
              : t("canvas.voiceDesign.nodeName", "音色设计")
            : isVoiceClone
              ? meta?.voiceId
                ? `${t("canvas.voiceClone.nodeName", "音色克隆")} · ${meta.voiceId}`
                : t("canvas.voiceClone.nodeName", "音色克隆")
              : meta?.name || t("canvas.audio")
        }
        selected={selected}
        maxWidth={shellWidth}
        onRename={isVoiceDesign || isVoiceClone ? void 0 : onRename}
      />
      <NodeBody
        width={shellWidth}
        tagIds={meta?.tagIds}
        height={
          isErrorGenerating ||
          isGenerating ||
          persistedQueuePaused ||
          useBodyPanelChrome
            ? bodyHeight
            : void 0
        }
        selected={selected}
        borderRadius={MEDIA_NODE_RADIUS}
        variant={useBodyPanelChrome ? "panel" : "media"}
      >
        {generationErrorMessage ? (
          <MediaGenerationErrorOverlay
            nodeId={nodeId}
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
                resuming={isRetryGenerationPending?.(nodeId) ?? false}
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
                  cancelling={isCancelGenerationQueuePending?.(nodeId) ?? false}
                  actionUiId="canvas.audio-node.queue"
                />
              ) : (
                void 0
              )
            }
          />
        ) : isEmpty ? (
          <PlaceholderUploadButton
            icon={<AudioPlaceholderIcon />}
            label={t("canvas.uploadAudio")}
            onUpload={(anchor) => onPlaceholderUpload?.(nodeId, "audio", anchor)}
          />
        ) : audioError ? (
          <MediaUnpreviewableFallback
            displayName={meta?.name ?? t("canvas.audio")}
            extension={getFileExtension(meta?.name)}
            sizeLabel={formatFileSize(meta?.fileSize)}
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
                  fileName={meta?.name ?? ""}
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
                    {formatTime(0)}
                  </span>
                  <span
                    style={{
                      color: "var(--fg-muted, #525252)",
                    }}
                  >
                    {" / "}
                    <span ref={durationRef}>{formatTime(duration, true)}</span>
                  </span>
                </span>
                <button
                  type="button"
                  onClick={handleTogglePlay}
                  aria-label={
                    isPlaying ? t("canvas.pause") : t("canvas.play")
                  }
                  // 第 333 轮（验收）：v3 画布已经包住这个内层组件（同级还有 canvas.audio-node.download），
                  // 只有播放按钮还留着 v2 的 id。祖先链实测：
                  // canvas-node-frame > canvas.audio-node > react-flow__node > canvas.pane
                  data-action-ui-id="canvas.audio-node.toggle-play"
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
                {onSaveAs && meta?.path ? (
                  <button
                    type="button"
                    onClick={handleDownload}
                    data-action-ui-id="canvas.audio-node.download"
                    aria-label={t("canvas.downloadAudio", "Download audio")}
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
                    <Download size={14} />
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
        selected: !!selected,
        showLightbox: mediaActions.showLightbox,
        showClipPanel: mediaActions.showClipPanel,
      }) && (
        <AudioActionSurface
          nodeId={nodeId}
          meta={meta}
          data={data}
          selected={!!selected}
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
      <NodeHandles nodeId={nodeId} selected={!!selected} />
    </NodeShell>
  );
}
