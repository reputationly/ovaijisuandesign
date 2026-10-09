// ready-sub-video-card.jsx
import { jsxRuntimeExports, reactExports, CompositedSvg, useTranslation, Position, ChevronDown, dedupedToast, X$7, ExternalLink$2, BACKEND_VIBE_STORYBOARD, useAssetMetadataApi, useReactFlow, Download$2, useAssetMetadataStore, Handle, ChevronUp, CopyPlus, reactDomExports, classifyFileType } from "../vendor.js";
import { Dialog$1 } from "../canvas/canvas-surface-recovery-scheduler.jsx";
import { usePathFileVersion, appendCanvasFileVersion } from "../infra/create-html-iframe-pool-store.jsx";
import { useRegisterZoomCounter, useModelForAsset, FileTypeIcon } from "../infra/create-recently-added-store.jsx";
import { useVideoMutedStore, resolvePlaceholderCardSize } from "../infra/deep-freeze.js";
import { isGenerationRefundStatus, isGenerationErrorStatus } from "../canvas/group-nodes-in-canvas.js";
import { Trash2, useCanvasBridge, useCanvasIsMultiSelect, useCanvasIsBoxSelecting, useAssetMeta, MEDIA_NODE_RADIUS, useCanvasActions, formatTime$2, useMediaPlayback } from "./parse-item.jsx";
import { GENERATE_ERROR_CODE_CONCURRENCY_LIMIT } from "../generation/push-inline.js";
import { Ungroup } from "../canvas/relayout-group-children.js";
import { useSubImages, useMultiImageActions, buildImageNodeView, useMultiImageOverlayApi, useIsOverlayOpen } from "./use-multi-image-actions.js";
import {
  GeneratingMediaArea,
  ImagePlaceholderIcon,
  areNodePropsEqual,
  VideoPlaceholderIcon,
  AudioPlaceholderIcon,
  TextPlaceholderIcon,
  useCanvasNodeIsDragging,
  MoreVerticalIcon$1,
} from "../canvas/generating-media-area.jsx";
import {
  Tooltip$1,
  RefundHint,
  translateModelName,
  MediaErrorCard,
} from "../generation/create-tracker.jsx";
import {
  useSimulatedProgress,
  lightboxItemFromAssetMeta,
  lightboxItemsFromSlots,
  resolveLightboxIndexForSlot,
  submitAfterOptionalDraftFlush,
  readGenerationStartedAt,
  readGenerationSubmittedAt,
  readGenerationAttemptId,
  NodeToolbar,
  AudioLightbox$1,
  getDisplayLyrics,
} from "./use-lightbox-media-actions.jsx";
import {
  resolveImageGenerationEstimateSeconds,
  resolveVideoPlaybackUrl,
} from "../generation/text-models.js";
import { useCanvasSurfaceRecovery } from "./canvas-image.jsx";
import { resolveReferenceImages, resolveReferenceVideos } from "./base-backend.jsx";
import {
  NodeFrameStroke,
  GenerationWaitEstimate,
  Button$2,
  NodeShell,
  QueueGenerationControl,
  normalizeEstimatedWaitSeconds,
} from "../canvas/use-media-node-actions.jsx";
import {
  Select$2,
  SelectTrigger$1,
  SelectValue$1,
  SelectContent$1,
  SelectItem$1,
} from "../generation/calc-video-cost-breakdown.jsx";
import {
  getPopoverDraftMap,
  DEFAULT_ROW_HEIGHT,
  clampRowHeightPx,
  addColumn$1,
  newConditionId,
  ROW_HEIGHT_ORDER,
} from "../canvas/prune-persisted-node-data.js";
import { useUpstreamTextContent } from "../assets/use-assets-ref-validate.js";
import {
  usePopoverCloseWithDeselect,
  resolveReferenceAudios,
  resolveReferenceTexts,
  resolveEditableTextReferencePaths,
  popoverDraftHasUserEdits,
  resolveDraftReferencePaths,
} from "../generation/resolve-reference-texts.js";
import {
  buildThumbnailUrl,
  PauseIcon,
  PlayIcon,
  VolumeOffTablerIcon,
  VolumeOnTablerIcon,
  FullscreenIcon,
  buildVideoThumbnailUrl,
} from "./media-clip-panel-inner.jsx";
import { I2VPopover } from "./arrow-shape.js";
import { I2IPopover } from "../generation/param-duration-slider.jsx";
import { ImageLightbox$2, VideoLightbox } from "./image-lightbox.jsx";
import { isMiniMaxH3MaxModelValue } from "../generation/i2-v-popover-inner.jsx";
import { TxtPopover, AUDIO_FULL_BODY_POPOVER_GAP_OFFSET } from "./audio-action-surface.jsx";
import {
  DialogContent$1,
  DialogHeader$1,
  DialogTitle$1,
  DialogFooter$1,
} from "./thumb-chip.jsx";
import { Label$1, Input$1 } from "./use-plugin-host.jsx";
import { RESOURCE_DRAG_MIME } from "../text-editor/myers-line-hunks.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { ImageNodeInner } from "./image-node-inner.jsx";
import {
  CountBadge,
  ImageSlotBody,
  MultiImageOverlay,
  SUB_CARD_GAP,
  computeMultiImageGridPositions,
  useGenerationWaitEstimate,
} from "./ready-sub-image-card.jsx";
import { ROUND_DOTS_POPOVER_GAP_OFFSET, RoundDots } from "./relight-editor.jsx";
import { StoryboardGridPopover, useImageLightbox } from "./storyboard-grid-editor.jsx";
export const ImageNode = reactExports.memo(ImageNodeInner, areNodePropsEqual);
function buildPlaceholderImageNodeView(nodeId, data2, subImages, metaById, mainRound, nodeAssetId) {
  return buildImageNodeView(nodeId, data2, subImages, metaById, false, mainRound, nodeAssetId);
}
function resolvePlaceholderReferencePaths({
  incomingSourceIds,
  referenceImageIds,
  referenceVideoIds,
  referenceAudioIds,
  assetMetadataStore,
  getNodeById,
}) {
  return {
    imagePaths: resolveReferenceImages(
      incomingSourceIds,
      referenceImageIds,
      assetMetadataStore,
      getNodeById,
    ),
    videoPaths: resolveReferenceVideos(incomingSourceIds, referenceVideoIds, assetMetadataStore),
    audioPaths: resolveReferenceAudios(incomingSourceIds, referenceAudioIds, assetMetadataStore),
  };
}
export function shouldActivateVideoHover({
  canvasActive,
  elementStillHovered,
  interactionBlocked = false,
}) {
  return canvasActive && elementStillHovered && !interactionBlocked;
}
function shouldPreviewReadySubVideo({ hasUrl }) {
  return hasUrl;
}
function formatControlTime(seconds, roundUp = false) {
  if (!Number.isFinite(seconds) || seconds < 0) return "00:00";
  const total = roundUp ? Math.ceil(seconds) : Math.floor(seconds);
  const m3 = Math.floor(total / 60);
  const s2 = total % 60;
  return `${m3.toString().padStart(2, "0")}:${s2.toString().padStart(2, "0")}`;
}
function ProgressBarInner({ videoRef, isPlaying, tone = "dark", display = "inline" }) {
  const barRef = reactExports.useRef(null);
  const timeRef = reactExports.useRef(null);
  const durationRef = reactExports.useRef(null);
  const filledRef = reactExports.useRef(null);
  const thumbRef = reactExports.useRef(null);
  const rafRef = reactExports.useRef(0);
  const [isDragging, setIsDragging] = reactExports.useState(false);
  const syncDOM = reactExports.useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    const t2 = el.currentTime;
    const d2 = el.duration;
    const displayTime = el.ended ? d2 : t2;
    const pct = d2 > 0 && Number.isFinite(d2) ? (t2 / d2) * 100 : 0;
    if (timeRef.current) {
      timeRef.current.textContent =
        display === "time"
          ? `${formatControlTime(displayTime, el.ended)} / ${formatControlTime(d2, true)}`
          : formatTime$2(displayTime, el.ended);
    }
    if (durationRef.current) durationRef.current.textContent = formatTime$2(d2, true);
    if (filledRef.current) filledRef.current.style.width = `${pct}%`;
    if (thumbRef.current) thumbRef.current.style.left = `${pct}%`;
  }, [display, videoRef]);
  reactExports.useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    function tick() {
      syncDOM();
      rafRef.current = requestAnimationFrame(tick);
    }
    if (isPlaying && !isDragging) {
      rafRef.current = requestAnimationFrame(tick);
    } else {
      cancelAnimationFrame(rafRef.current);
      syncDOM();
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying, isDragging, syncDOM, videoRef]);
  reactExports.useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const events2 = ["loadedmetadata", "durationchange", "seeked", "ended", "emptied"];
    for (const event of events2) el.addEventListener(event, syncDOM);
    syncDOM();
    return () => {
      for (const event of events2) el.removeEventListener(event, syncDOM);
    };
  }, [videoRef, syncDOM]);
  const seekToPosition = reactExports.useCallback(
    (clientX) => {
      const el = videoRef.current;
      const bar = barRef.current;
      if (!el || !bar) return;
      const d2 = el.duration;
      if (!Number.isFinite(d2) || d2 <= 0) return;
      const rect = bar.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      el.currentTime = ratio * d2;
      syncDOM();
    },
    [videoRef, syncDOM],
  );
  const handleClick2 = reactExports.useCallback(
    (e2) => {
      e2.stopPropagation();
      seekToPosition(e2.clientX);
    },
    [seekToPosition],
  );
  const handleThumbDown = reactExports.useCallback(
    (e2) => {
      e2.stopPropagation();
      e2.preventDefault();
      setIsDragging(true);
      const onMove = (ev) => seekToPosition(ev.clientX);
      const onUp = () => {
        setIsDragging(false);
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [seekToPosition],
  );
  const isLight = tone === "light";
  const labelCls = isLight ? "text-foreground/65" : "text-[var(--canvas-video-control-label)]";
  const trackBg = isLight ? "rgba(0,0,0,0.18)" : "var(--canvas-video-control-track)";
  const fillBg = isLight ? "currentColor" : "var(--canvas-video-control-progress)";
  const thumbShadow = isLight
    ? "0 0 3px rgba(0,0,0,0.25)"
    : "0 0 3px var(--canvas-video-control-shadow)";
  if (display === "time") {
    return (
      // Text is owned by syncDOM. React children here would be detached by
      // textContent assignments and later metadata updates would be invisible.
      <span
        ref={timeRef}
        className={`min-w-0 shrink truncate select-none text-[12px] font-medium tabular-nums leading-none drop-shadow-[0_1px_3px_var(--canvas-video-control-shadow)] ${labelCls}`}
      />
    );
  }
  return (
    <>
      {display === "inline" && (
        <span
          ref={timeRef}
          className={`shrink-0 select-none text-[11px] tabular-nums ${labelCls}`}
        />
      )}
      <div
        ref={barRef}
        className={`group/progress relative cursor-pointer ${display === "bar" ? "pointer-events-auto w-full" : "flex-1"}`}
        style={{
          height: display === "bar" ? 12 : 16,
        }}
        onClick={handleClick2}
      >
        <div
          className="absolute top-1/2 left-0 right-0 -translate-y-1/2 rounded-full"
          style={{
            height: 3,
            background: trackBg,
          }}
        />
        <div
          ref={filledRef}
          className="absolute top-1/2 left-0 -translate-y-1/2 rounded-full"
          style={{
            height: 3,
            background: fillBg,
            transition: isPlaying && !isDragging ? "none" : "width 0.1s",
          }}
        />
        <div
          ref={thumbRef}
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full opacity-0 transition-opacity group-hover/progress:opacity-100"
          style={{
            width: 10,
            height: 10,
            background: fillBg,
            boxShadow: thumbShadow,
            opacity: isDragging ? 1 : void 0,
          }}
          onMouseDown={handleThumbDown}
        />
      </div>
      {display === "inline" && (
        <span
          ref={durationRef}
          className={`shrink-0 select-none text-[11px] tabular-nums ${labelCls}`}
        />
      )}
    </>
  );
}
export const ProgressBar = reactExports.memo(ProgressBarInner);
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
          <ProgressBar videoRef={videoRef} isPlaying={isPlaying} display="time" />
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
function recoverPlayingVideoSurface(video, shouldBePlaying) {
  if (!video || !shouldBePlaying) return false;
  try {
    void video.play().catch(() => void 0);
    return true;
  } catch {
    return false;
  }
}
const EXPANDED_FRAME_INSET = 8;
function computeExpandedFrameRect(positions, cardWidth, cardHeight) {
  let minX = 0;
  let minY = 0;
  let maxX = cardWidth;
  let maxY = cardHeight;
  for (const position2 of positions) {
    minX = Math.min(minX, position2.dx);
    minY = Math.min(minY, position2.dy);
    maxX = Math.max(maxX, position2.dx + cardWidth);
    maxY = Math.max(maxY, position2.dy + cardHeight);
  }
  return {
    left: minX - EXPANDED_FRAME_INSET,
    top: minY - EXPANDED_FRAME_INSET,
    width: maxX - minX + EXPANDED_FRAME_INSET * 2,
    height: maxY - minY + EXPANDED_FRAME_INSET * 2,
  };
}
export const VideoMultiOverlay = reactExports.memo(function VideoMultiOverlay2({
  view: view2,
  cardWidth,
  cardHeight,
  onSelectSlot,
  onDeleteSub,
  onSplitSub,
  onSubContextMenu,
  onDownloadSub,
  onOpenSlot,
  readonly,
  closing: closing2 = false,
}) {
  const {
    onCancelGenerationQueue,
    isCancelGenerationQueuePending,
    onRetryGeneration,
    isRetryGenerationPending,
  } = useCanvasBridge();
  const videoIds = view2.slots.map((slot) => slot.id);
  const videoStatuses = view2.slots.map((slot) => slot.status);
  const positions = computeMultiImageGridPositions(
    videoIds,
    view2.primaryIndex,
    cardWidth,
    cardHeight,
    SUB_CARD_GAP,
    videoStatuses,
  );
  if (positions.length === 0) return null;
  const frameRect = computeExpandedFrameRect(positions, cardWidth, cardHeight);
  return (
    <div
      data-action-ui-id="canvas.video-node.multi-video-overlay"
      data-state={closing2 ? "closing" : "open"}
      className="pointer-events-none absolute inset-0 z-50"
    >
      <div
        data-action-ui-id="canvas.video-node.multi-video-overlay-frame"
        className="canvas-media-expanded-frame pointer-events-none absolute z-0"
        style={frameRect}
      />
      {positions.map((position2) => {
        const slot = view2.slots[position2.originalIndex];
        if (!slot) return null;
        if (
          position2.status === "pending" ||
          position2.status === "generating" ||
          position2.status === "loading" ||
          position2.status === "queue_paused"
        ) {
          return (
            <LoadingSubVideoCard
              key={`loading:${position2.imageId}:${position2.status}`}
              slot={slot}
              position={position2}
              cardWidth={cardWidth}
              cardHeight={cardHeight}
              onCancelQueue={onCancelGenerationQueue}
              cancelling={isCancelGenerationQueuePending?.(slot.id) ?? false}
              onResumeQueue={onRetryGeneration}
              resuming={isRetryGenerationPending?.(slot.id) ?? false}
            />
          );
        }
        if (isGenerationErrorStatus(position2.status) || slot.error != null) {
          return (
            <ErrorSubVideoCard
              key={`error:${position2.originalIndex}:${position2.imageId}`}
              slot={slot}
              position={position2}
              cardWidth={cardWidth}
              cardHeight={cardHeight}
              onDeleteSub={onDeleteSub}
              readonly={readonly ?? false}
            />
          );
        }
        return (
          <ReadySubVideoCard
            key={`ready:${position2.imageId}`}
            slot={slot}
            position={position2}
            cardWidth={cardWidth}
            cardHeight={cardHeight}
            onSelectSlot={onSelectSlot}
            onDeleteSub={onDeleteSub}
            onSplitSub={onSplitSub}
            onSubContextMenu={onSubContextMenu}
            onDownloadSub={onDownloadSub}
            onOpenSlot={onOpenSlot}
            readonly={readonly}
          />
        );
      })}
    </div>
  );
});
function CardWrapper({
  cardWidth,
  cardHeight,
  position: position2,
  children: children2,
  onMouseEnter,
  onMouseLeave,
  onContextMenu,
  onDoubleClick,
}) {
  const animationDelayMs = Math.min(position2.originalIndex, 6) * 18;
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: mirrors the main video node's hover preview zone.
    <div
      data-action-ui-id="canvas.video-node.sub-video-card"
      className="canvas-media-expanded-card group pointer-events-auto absolute block"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onContextMenu={onContextMenu}
      onDoubleClick={onDoubleClick}
      style={{
        left: position2.dx,
        top: position2.dy,
        width: cardWidth,
        height: cardHeight,
        animationDelay: `${animationDelayMs}ms`,
      }}
    >
      {children2}
    </div>
  );
}
function ReadySubVideoCard({
  slot,
  position: position2,
  cardWidth,
  cardHeight,
  onSelectSlot,
  onDeleteSub,
  onSplitSub,
  onSubContextMenu,
  onDownloadSub,
  onOpenSlot,
  readonly,
}) {
  const frameRef = reactExports.useRef(null);
  useRegisterZoomCounter(frameRef);
  const { t: t2 } = useTranslation();
  const meta2 = useAssetMeta(slot.id);
  const fileVersion = usePathFileVersion(meta2?.path);
  const slotUrl =
    slot.url !== void 0 && fileVersion > 0
      ? appendCanvasFileVersion(slot.url, fileVersion)
      : slot.url;
  const selectLabel = t2("canvas.multiVideo.setAsPrimary", "设为主视频");
  const splitLabel = t2("canvas.multiImage.splitToNode", "独立展示");
  const previewLabel = t2("canvas.fullscreenPreview", "全屏预览");
  const [hovered, setHovered] = reactExports.useState(false);
  const [durationLabel, setDurationLabel] = reactExports.useState(void 0);
  const hoverTimerRef = reactExports.useRef(null);
  const stop = useMediaPlayback((s2) => s2.stop);
  const playerNodeId = `sub-video:${slot.id}`;
  const isPlaying = useMediaPlayback((s2) => s2.playingId === playerNodeId);
  const clearHoverTimer = reactExports.useCallback(() => {
    if (!hoverTimerRef.current) return;
    clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = null;
  }, []);
  const stopSubPlayback = reactExports.useCallback(() => {
    if (useMediaPlayback.getState().playingId === playerNodeId) stop();
  }, [playerNodeId, stop]);
  reactExports.useEffect(() => {
    const durationSec = meta2?.durationSec;
    setDurationLabel(
      durationSec != null && Number.isFinite(durationSec) && durationSec > 0
        ? formatTime$2(durationSec, true)
        : void 0,
    );
  }, [meta2?.durationSec]);
  const handleMouseEnter = reactExports.useCallback(() => {
    if (
      !shouldPreviewReadySubVideo({
        hasUrl: Boolean(slot.url),
      })
    ) {
      return;
    }
    clearHoverTimer();
    hoverTimerRef.current = setTimeout(() => {
      hoverTimerRef.current = null;
      setHovered(true);
    }, 150);
  }, [clearHoverTimer, readonly, slot.url]);
  const handleMouseLeave2 = reactExports.useCallback(() => {
    clearHoverTimer();
    setHovered(false);
    stopSubPlayback();
  }, [clearHoverTimer, stopSubPlayback]);
  reactExports.useEffect(
    () => () => {
      clearHoverTimer();
      stopSubPlayback();
    },
    [clearHoverTimer, stopSubPlayback],
  );
  reactExports.useEffect(() => {
    if (
      !shouldPreviewReadySubVideo({
        hasUrl: Boolean(slot.url),
      })
    ) {
      handleMouseLeave2();
    }
  }, [handleMouseLeave2, readonly, slot.url]);
  const handleCardClick = (e2) => {
    e2.stopPropagation();
    if (!slot.url) return;
    onOpenSlot(position2.originalIndex);
  };
  const handleSelectSlot = (e2) => {
    e2.stopPropagation();
    if (readonly || !slot.url) return;
    onSelectSlot(position2.originalIndex);
  };
  const handleContextMenu = (e2) => {
    e2.preventDefault();
    e2.stopPropagation();
    if (readonly) return;
    onSubContextMenu(position2.originalIndex, e2);
  };
  const handleDoubleClick2 = (e2) => {
    e2.preventDefault();
    e2.stopPropagation();
    if (!slot.url) return;
    onOpenSlot(position2.originalIndex);
  };
  const handleSplit = (e2) => {
    e2.stopPropagation();
    if (readonly || !slot.url) return;
    onSplitSub(position2.originalIndex);
  };
  const handleDelete2 = (e2) => {
    e2.stopPropagation();
    if (readonly || !slot.url) return;
    onDeleteSub(position2.originalIndex);
  };
  const handleDownload = (e2) => {
    e2.stopPropagation();
    if (!slot.url) return;
    onDownloadSub(position2.originalIndex);
  };
  const handleLoadedMetadata = reactExports.useCallback((e2) => {
    const durationSec = e2.currentTarget.duration;
    if (Number.isFinite(durationSec) && durationSec > 0) {
      setDurationLabel(formatTime$2(durationSec, true));
    }
  }, []);
  return (
    <CardWrapper
      cardWidth={cardWidth}
      cardHeight={cardHeight}
      position={position2}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave2}
      onContextMenu={handleContextMenu}
      onDoubleClick={handleDoubleClick2}
    >
      <button
        ref={frameRef}
        type="button"
        data-action-ui-id="canvas.video-node.sub-video-card.ready"
        onClick={handleCardClick}
        onContextMenu={handleContextMenu}
        onDoubleClick={handleDoubleClick2}
        aria-label={previewLabel}
        title={previewLabel}
        className="pointer-events-auto absolute inset-0 z-10 block cursor-zoom-in canvas-node-frame overflow-hidden border-0 p-px bg-[var(--canvas-node-bg)] transition-shadow hover:shadow-[var(--canvas-shadow-dropdown)] focus-visible:outline-none"
        style={{
          borderRadius: MEDIA_NODE_RADIUS,
        }}
      >
        <NodeFrameStroke />
        {slot.url ? (
          <video
            onLoadedMetadata={handleLoadedMetadata}
            src={resolveVideoPlaybackUrl(slotUrl)}
            preload="metadata"
            muted={true}
            playsInline={true}
            className="block h-full w-full object-cover"
            draggable={false}
          />
        ) : (
          <div
            className="h-full w-full animate-pulse bg-[color:var(--canvas-controls-bg)] opacity-60"
            data-action-ui-id="canvas.video-node.sub-video-card.ready.placeholder"
          />
        )}
      </button>
      {hovered && slot.url && (
        <div
          className="absolute inset-0 z-[15] overflow-hidden"
          style={{
            borderRadius: MEDIA_NODE_RADIUS,
          }}
        >
          <VideoPlayer
            src={resolveVideoPlaybackUrl(slotUrl)}
            nodeId={playerNodeId}
            width={cardWidth}
            height={cardHeight}
          />
        </div>
      )}
      {!readonly && slot.url && (
        <div
          data-action-ui-id="canvas.video-node.sub-video-card.action-badges"
          className="pointer-events-none absolute left-1 top-1 z-20 flex gap-1"
        >
          <button
            type="button"
            data-action-ui-id="canvas.video-node.sub-video-card.set-primary"
            onClick={handleSelectSlot}
            aria-label={selectLabel}
            title={selectLabel}
            className="pointer-events-auto inline-flex h-6 cursor-pointer items-center rounded-[8px] bg-[var(--canvas-media-control-bg)] px-2 text-[11px] font-medium text-[var(--canvas-media-control-fg)] transition-colors hover:bg-[var(--canvas-media-control-bg-hover)] active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
          >
            {selectLabel}
          </button>
          <button
            type="button"
            data-action-ui-id="canvas.video-node.sub-video-card.split"
            onClick={handleSplit}
            aria-label={splitLabel}
            title={splitLabel}
            className="pointer-events-auto inline-flex h-6 cursor-pointer items-center rounded-[8px] bg-[var(--canvas-media-control-bg)] px-2 text-[11px] font-medium text-[var(--canvas-media-control-fg)] transition-colors hover:bg-[var(--canvas-media-control-bg-hover)] active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
          >
            {splitLabel}
          </button>
        </div>
      )}
      {durationLabel && !isPlaying && (
        <div
          data-action-ui-id="canvas.video-node.sub-video-card.duration"
          className="pointer-events-none absolute bottom-1 left-1 z-20 inline-flex h-6 items-center rounded-[8px] bg-[var(--canvas-media-control-bg)] px-2.5 text-[12px] font-medium tabular-nums text-[var(--canvas-media-control-fg)]"
        >
          {durationLabel}
        </div>
      )}
      {!readonly && slot.url && (
        <DeleteButton
          onDelete={handleDelete2}
          label={t2("canvas.multiVideo.deleteVideo", "删除该视频")}
        />
      )}
      {slot.url && (
        <DownloadButton
          onDownload={handleDownload}
          label={t2("canvas.multiVideo.downloadVideo", "下载该视频")}
        />
      )}
    </CardWrapper>
  );
}
function DeleteButton({ onDelete, label }) {
  return (
    <button
      type="button"
      data-action-ui-id="canvas.video-node.sub-video-card.delete"
      onClick={onDelete}
      aria-label={label}
      title={label}
      className="pointer-events-auto absolute right-8 top-1 z-20 flex size-6 cursor-pointer items-center justify-center rounded-[8px] bg-[var(--canvas-media-control-bg)] text-[var(--canvas-media-control-fg)] opacity-100 transition-[background-color,color,transform] duration-150 ease-out hover:bg-destructive hover:text-destructive-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
    >
      <X$7 size={14} strokeWidth={1.5} aria-hidden={true} />
    </button>
  );
}
function DownloadButton({ onDownload, label }) {
  return (
    <button
      type="button"
      data-action-ui-id="canvas.video-node.sub-video-card.download"
      onClick={onDownload}
      aria-label={label}
      title={label}
      className="pointer-events-auto absolute right-1 top-1 z-20 flex size-6 cursor-pointer items-center justify-center rounded-[8px] bg-[var(--canvas-media-control-bg)] text-[var(--canvas-media-control-fg)] opacity-100 transition-[background-color,transform] duration-150 ease-out hover:bg-[var(--canvas-media-control-bg-hover)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
    >
      <Download$2 size={14} />
    </button>
  );
}
export function VideoSplitAllButton({ onSplitAll, disabled: disabled2 }) {
  const { t: t2 } = useTranslation();
  const label = t2("canvas.multiImage.splitAll", "全部独立");
  const handleClick2 = (e2) => {
    e2.stopPropagation();
    if (disabled2) return;
    onSplitAll();
  };
  if (disabled2) return null;
  return (
    <button
      type="button"
      data-action-ui-id="canvas.video-node.split-all"
      onClick={handleClick2}
      aria-label={label}
      title={label}
      className="pointer-events-auto flex h-6 items-center gap-1 rounded-[8px] bg-black/55 px-2 text-[11px] font-medium text-white transition-colors hover:bg-black/70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
    >
      <Ungroup size={12} />
      {label}
    </button>
  );
}
export function VideoSplitMainButton({ onSplitMain, disabled: disabled2 }) {
  const { t: t2 } = useTranslation();
  const label = t2("canvas.multiImage.splitMain", "独立展示");
  const handleClick2 = (e2) => {
    e2.stopPropagation();
    if (disabled2) return;
    onSplitMain();
  };
  if (disabled2) return null;
  return (
    <button
      type="button"
      data-action-ui-id="canvas.video-node.split-main"
      onClick={handleClick2}
      aria-label={label}
      title={label}
      className="pointer-events-auto flex h-6 items-center gap-1 rounded-[8px] bg-black/55 px-2 text-[11px] font-medium text-white transition-colors hover:bg-black/70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
    >
      <ExternalLink$2 size={12} />
      {label}
    </button>
  );
}
function LoadingSubVideoCard({
  slot,
  position: position2,
  cardWidth,
  cardHeight,
  onCancelQueue,
  cancelling,
  onResumeQueue,
  resuming,
}) {
  const frameRef = reactExports.useRef(null);
  useRegisterZoomCounter(frameRef);
  const { t: t2 } = useTranslation();
  const queued = slot.status === "pending";
  const paused = slot.status === "queue_paused";
  const progress = useSimulatedProgress(
    !queued && !paused,
    "video",
    slot.generationStartedAt,
    isMiniMaxH3MaxModelValue(slot.model) ? "h3-max-video" : void 0,
  );
  const label = queued
    ? t2("canvas.pending")
    : paused
      ? t2("canvas.queuePaused")
      : t2("canvas.multiVideo.slotLoading", "生成中…");
  const handleCancelQueue = reactExports.useCallback(() => {
    onCancelQueue?.(slot.id);
  }, [onCancelQueue, slot.id]);
  const handleResumeQueue = reactExports.useCallback(() => {
    if (!slot.retryPayload) return;
    onResumeQueue?.(slot.id, slot.retryPayload);
  }, [onResumeQueue, slot.id, slot.retryPayload]);
  return (
    <CardWrapper cardWidth={cardWidth} cardHeight={cardHeight} position={position2}>
      <div
        ref={frameRef}
        role="status"
        data-action-ui-id="canvas.video-node.sub-video-card.loading"
        aria-busy={paused ? void 0 : true}
        aria-label={label}
        title={label}
        className="pointer-events-auto absolute inset-0 z-10 canvas-node-frame overflow-hidden border-0 p-px bg-[var(--canvas-node-bg)]"
        style={{
          borderRadius: MEDIA_NODE_RADIUS,
        }}
        data-generating-sub=""
      >
        <NodeFrameStroke />
        <GeneratingMediaArea
          width="100%"
          height="100%"
          progress={queued || paused ? void 0 : progress}
          variant={queued || paused ? "queued" : "generating"}
          icon={<VideoPlaceholderIcon />}
          label={
            queued || paused ? (
              <QueueGenerationControl
                state={paused ? "paused" : "queued"}
                onCancel={queued && onCancelQueue ? handleCancelQueue : void 0}
                cancelling={cancelling}
                onResume={paused && onResumeQueue ? handleResumeQueue : void 0}
                resuming={resuming}
                canResume={!!slot.retryPayload}
                actionUiId="canvas.video-node.sub-video-card.queue"
              />
            ) : slot.estimatedRemainingWaitSeconds ? (
              <GenerationWaitEstimate
                seconds={slot.estimatedRemainingWaitSeconds}
                actionUiId="canvas.video-node.sub-video-card"
              />
            ) : (
              void 0
            )
          }
        />
      </div>
    </CardWrapper>
  );
}
function ErrorSubVideoCard({
  slot,
  position: position2,
  cardWidth,
  cardHeight,
  onDeleteSub,
  readonly,
}) {
  const { t: t2 } = useTranslation();
  const recoverable = slot.status === "recoverable_error";
  const uncertain = slot.status === "status_unknown";
  const title = recoverable
    ? t2("canvas.generationRecovery.title", "结果待恢复")
    : t2("canvas.multiVideo.slotFailed", "生成失败");
  const message2 = recoverable
    ? t2("canvas.generationRecovery.description", "原任务已保留，结果将在恢复后自动回填。")
    : uncertain
      ? t2("canvas.generationStatusUnknown.description", "生成请求未能完成，系统不会自动重试。")
      : (slot.error ?? t2("canvas.multiVideo.slotFailed", "生成失败"));
  const neutral = recoverable;
  const handleDelete2 = (event) => {
    event.stopPropagation();
    if (!readonly) onDeleteSub(position2.originalIndex);
  };
  return (
    <CardWrapper cardWidth={cardWidth} cardHeight={cardHeight} position={position2}>
      <div
        data-action-ui-id="canvas.video-node.sub-video-card.error"
        className={`pointer-events-auto absolute inset-0 z-10 flex flex-col items-center justify-center gap-1 overflow-hidden px-2 py-2 text-center text-xs ${neutral ? "border border-border bg-card text-foreground" : "border border-destructive/40 bg-destructive/10 text-destructive"}`}
        style={{
          borderRadius: MEDIA_NODE_RADIUS,
        }}
        title={message2}
        role={neutral ? "status" : "alert"}
      >
        <VideoPlaceholderIcon />
        <span className="font-medium">{title}</span>
        <span className="line-clamp-2 break-all text-muted-foreground">{message2}</span>
        {!recoverable &&
        !uncertain &&
        slot.refundDisplayOwner &&
        isGenerationRefundStatus(slot.refundStatus) ? (
          <div className="pointer-events-none absolute bottom-2 left-2 z-20">
            <RefundHint
              refundStatus={slot.refundStatus}
              refundedCredits={slot.refundedCredits}
              compact={true}
            />
          </div>
        ) : null}
      </div>
      {!readonly && !recoverable ? (
        <DeleteButton
          onDelete={handleDelete2}
          label={
            uncertain
              ? t2("canvas.removeLocalPlaceholder", "移除本地占位")
              : t2("canvas.multiVideo.deleteVideo", "删除该视频")
          }
        />
      ) : null}
    </CardWrapper>
  );
}
function PlaceholderNodeInner({ id: id2, data: data2, selected: selected2 }) {
  const frameRef = reactExports.useRef(null);
  useRegisterZoomCounter(frameRef);
  const { t: t2 } = useTranslation();
  const placeholderData = data2;
  const { prompt, model, status, errorMessage: errorMessage2, mediaType } = placeholderData;
  const nodePrompt =
    (typeof prompt === "string" && prompt.trim().length > 0
      ? prompt
      : typeof placeholderData.description === "string" &&
          placeholderData.description.trim().length > 0
        ? placeholderData.description
        : void 0) ??
    imageViewPrimaryPrompt(data2) ??
    void 0;
  const isError = isGenerationErrorStatus(status);
  const isRecoverableError = status === "recoverable_error";
  const isGenerationStatusUnknown = status === "status_unknown";
  const isQueued = status === "pending";
  const isQueuePaused = status === "queue_paused";
  const liveRemainingWaitSeconds = normalizeEstimatedWaitSeconds(
    placeholderData.estimatedRemainingWaitSeconds,
    placeholderData.estimatedRemainingWaitMinutes,
  );
  const reactFlow = useReactFlow();
  const { deleteElements } = reactFlow;
  const isMultiSelect = useCanvasIsMultiSelect();
  const isBoxSelecting = useCanvasIsBoxSelecting();
  const bridge = useCanvasBridge();
  const {
    savePopoverDraft,
    promoteSubImageToMain,
    flushPersist,
    getIncomingSourceIds,
    getNodeById,
    subscribeGraphChange,
  } = useCanvasActions();
  const overlayStore = useMultiImageOverlayApi();
  const isOverlayOpen = useIsOverlayOpen(id2);
  const [showI2IPopover, setShowI2IPopover] = reactExports.useState(false);
  const [showI2VPopover, setShowI2VPopover] = reactExports.useState(false);
  const [showT2APopover, setShowT2APopover] = reactExports.useState(false);
  const [showStoryboardGridPopover, setShowStoryboardGridPopover] = reactExports.useState(false);
  const [cancelGenerationPending, setCancelGenerationPending] = reactExports.useState(false);
  const subImages = useSubImages(id2);
  const assetMetadataStore = useAssetMetadataApi();
  const assetsMap = useAssetMetadataStore((s2) => s2.assets);
  const getRoundSnapshot = reactExports.useCallback(
    () => getNodeById(id2)?.round,
    [getNodeById, id2],
  );
  const mainRound = reactExports.useSyncExternalStore(
    subscribeGraphChange,
    getRoundSnapshot,
    getRoundSnapshot,
  );
  const getNodeAssetId = reactExports.useCallback(
    () => getNodeById(id2)?.assetId,
    [getNodeById, id2],
  );
  const nodeAssetId = reactExports.useSyncExternalStore(
    subscribeGraphChange,
    getNodeAssetId,
    getNodeAssetId,
  );
  const [referenceRevision, setReferenceRevision] = reactExports.useState(0);
  reactExports.useEffect(
    () => subscribeGraphChange(() => setReferenceRevision((revision) => revision + 1)),
    [subscribeGraphChange],
  );
  const incomingSourceIds = reactExports.useMemo(
    () => getIncomingSourceIds(id2),
    [getIncomingSourceIds, id2, referenceRevision],
  );
  const referenceTextPaths = reactExports.useMemo(
    () =>
      resolveReferenceTexts(
        incomingSourceIds,
        placeholderData.referenceTextIds,
        assetMetadataStore,
        getNodeById,
      ),
    [incomingSourceIds, placeholderData.referenceTextIds, assetMetadataStore, getNodeById],
  );
  const liveReferenceTextPaths = reactExports.useMemo(
    () => resolveReferenceTexts(incomingSourceIds, void 0, assetMetadataStore, getNodeById),
    [incomingSourceIds, assetMetadataStore, getNodeById],
  );
  const { upstreamTextContent, refreshUpstreamText } = useUpstreamTextContent();
  const imageView = reactExports.useMemo(
    () =>
      buildPlaceholderImageNodeView(
        id2,
        data2,
        subImages,
        (assetId) => assetsMap.get(assetId),
        mainRound,
        nodeAssetId,
      ),
    [id2, data2, subImages, assetsMap, mainRound, nodeAssetId],
  );
  const mediaLightboxItems = reactExports.useMemo(() => {
    if (mediaType !== "image" && mediaType !== "video") return [];
    return lightboxItemsFromSlots(mediaType, imageView.rounds.flat(), {
      getMetaById: (assetId) => assetsMap.get(assetId),
      nodes: subImages,
      primarySlotId: imageView.primary?.id,
    });
  }, [mediaType, imageView.rounds, imageView.primary?.id, assetsMap, subImages]);
  const mediaLightbox = useImageLightbox({
    items: mediaLightboxItems,
  });
  const displayPrompt = nodePrompt ?? imageView.primary?.prompt ?? "";
  const isStoryboardGeneration = placeholderData.backend === BACKEND_VIBE_STORYBOARD;
  const isGeneratingPopover =
    status === "pending" || status === "generating" || status === "loading";
  const placeholderModelId = toNonEmptyString(placeholderData.model_id);
  const providerTaskId = toNonEmptyString(placeholderData.providerTaskId);
  const placeholderModelInfo = useModelForAsset(
    typeof placeholderData.backend === "string" ? placeholderData.backend : void 0,
    placeholderModelId,
    mediaType,
  );
  const displayModel = placeholderModelInfo?.name ?? translateModelName(model ?? "", t2);
  const estimatedRemainingWaitSeconds = useGenerationWaitEstimate({
    active: !isError && !isQueuePaused && !isQueued,
    liveRemainingWaitSeconds,
    estimatedGenerationSeconds:
      mediaType === "image"
        ? resolveImageGenerationEstimateSeconds(
            typeof placeholderData.backend === "string" ? placeholderData.backend : void 0,
            placeholderModelId ?? toNonEmptyString(model),
          )
        : void 0,
    startedAt: readGenerationStartedAt(data2),
  });
  const handleDelete2 = reactExports.useCallback(
    (e2) => {
      e2.stopPropagation();
      deleteElements({
        nodes: [
          {
            id: id2,
          },
        ],
      });
    },
    [id2, deleteElements],
  );
  const handleReport = reactExports.useCallback(
    (e2) => {
      e2.stopPropagation();
      bridge.onReportNodeError?.({
        nodeId: id2,
        // PlaceholderNode is generation-agnostic; downstream node-type can
        // be inferred by the host from `model` / data shape if needed.
        nodeType: "placeholder",
        model,
        prompt: displayPrompt,
        errorMessage: errorMessage2,
        traceId: placeholderData.cloudTraceId,
      });
    },
    [bridge, id2, model, displayPrompt, errorMessage2, placeholderData.cloudTraceId],
  );
  const handleRetry = reactExports.useCallback(
    (e2) => {
      e2.stopPropagation();
      if (!placeholderData.retryPayload) return;
      bridge.onRetryGeneration?.(id2, placeholderData.retryPayload);
    },
    [bridge, id2, placeholderData.retryPayload],
  );
  const handleCancelGeneration = reactExports.useCallback(
    async (e2) => {
      e2.stopPropagation();
      if (!bridge.onCancelGeneration || cancelGenerationPending) return;
      setCancelGenerationPending(true);
      try {
        await bridge.onCancelGeneration(id2);
      } finally {
        setCancelGenerationPending(false);
      }
    },
    [bridge, cancelGenerationPending, id2],
  );
  const handleResumeQueue = reactExports.useCallback(() => {
    if (!placeholderData.retryPayload) return;
    bridge.onRetryGeneration?.(id2, placeholderData.retryPayload);
  }, [bridge, id2, placeholderData.retryPayload]);
  const handleCancelQueue = reactExports.useCallback(() => {
    bridge.onCancelGenerationQueue?.(id2);
  }, [bridge, id2]);
  const borderClass = "canvas-node-frame border-0 p-px";
  const showEdgeLight = status === "pending" || status === "generating" || status === "loading";
  const card = resolvePlaceholderCardSize(
    status,
    placeholderData.aspectRatio,
    mediaType,
    placeholderData.placeholderDisplaySize,
  );
  const cardWidth = card.width;
  const mediaAreaHeight = card.height;
  const activeRoundSlotCount = imageView.slots.length;
  const showImageChrome = mediaType === "image" && imageView.isMulti;
  const showVideoChrome = mediaType === "video" && imageView.isMulti;
  const showRoundSwitcher =
    (mediaType === "image" || mediaType === "video") && imageView.rounds.length > 1;
  const showImageOverlay = showImageChrome && isOverlayOpen && imageView.isMulti;
  const showVideoOverlay = showVideoChrome && isOverlayOpen && imageView.isMulti;
  const totalImageCount = activeRoundSlotCount;
  const countUnit =
    mediaType === "video"
      ? t2("canvas.multiVideo.countUnit", "段")
      : t2("canvas.multiImage.countUnit", "张");
  const noopImageAction = reactExports.useCallback(() => {}, []);
  const handleI2IClose = usePopoverCloseWithDeselect(id2, setShowI2IPopover);
  const handleI2VClose = usePopoverCloseWithDeselect(id2, setShowI2VPopover);
  const handleT2AClose = usePopoverCloseWithDeselect(id2, setShowT2APopover);
  const handleStoryboardGridClose = usePopoverCloseWithDeselect(id2, setShowStoryboardGridPopover);
  const {
    submitImg2Image,
    submitImg2Video,
    submitTxt2Audio,
    fetchImageModels,
    fetchVideoModels,
    fetchAudioModels,
    fetchTtsVoices,
    resolveFileUrl,
    getLastUsedModelParams,
  } = bridge;
  const lastUsedI2I = getLastUsedModelParams?.("i2i");
  const lastUsedI2V = getLastUsedModelParams?.("i2v");
  const lastUsedAudio = getLastUsedModelParams?.("t2a");
  const popoverDraftMap = getPopoverDraftMap(data2);
  const popoverDraft = popoverDraftMap?.i2i;
  const i2vDraft = popoverDraftMap?.i2v;
  const t2aDraft = popoverDraftMap?.t2a;
  const placeholderModelCandidates = reactExports.useMemo(
    () => [
      placeholderModelInfo?.id,
      placeholderModelInfo?.model_name,
      placeholderModelId,
      typeof model === "string" ? model : void 0,
    ],
    [placeholderModelInfo?.id, placeholderModelInfo?.model_name, placeholderModelId, model],
  );
  const i2iDraftHasUserEdits = popoverDraftHasUserEdits(popoverDraft, {
    prompt: displayPrompt,
    modelIds: placeholderModelCandidates,
    params: placeholderData.params ?? imageView.primary?.params,
  });
  const i2vDraftHasUserEdits = popoverDraftHasUserEdits(i2vDraft, {
    prompt: displayPrompt,
    modelIds: placeholderModelCandidates,
    params: placeholderData.params,
  });
  const i2iUserDraft = i2iDraftHasUserEdits ? popoverDraft : void 0;
  const i2vUserDraft = i2vDraftHasUserEdits ? i2vDraft : void 0;
  const i2iDraftPrompt =
    typeof i2iUserDraft?.prompt === "string" && i2iUserDraft.prompt.trim().length > 0
      ? i2iUserDraft.prompt
      : void 0;
  const i2iDraftPromptJson = i2iDraftPrompt ? i2iUserDraft?.promptJson : void 0;
  const i2vDraftPrompt =
    typeof i2vUserDraft?.prompt === "string" && i2vUserDraft.prompt.trim().length > 0
      ? i2vUserDraft.prompt
      : void 0;
  const i2vDraftPromptJson = i2vDraftPrompt ? i2vUserDraft?.promptJson : void 0;
  const t2aDraftPrompt =
    typeof t2aDraft?.prompt === "string" && t2aDraft.prompt.trim().length > 0
      ? t2aDraft.prompt
      : void 0;
  const defaultModelId = normalizePlaceholderDefaultModelId(
    i2iUserDraft?.modelId,
    placeholderModelInfo?.id,
    placeholderModelInfo?.model_name,
    placeholderModelId,
  );
  const defaultVideoModelId = normalizePlaceholderDefaultModelId(
    i2vUserDraft?.modelId,
    placeholderModelInfo?.id,
    placeholderModelInfo?.model_name,
    placeholderModelId,
  );
  const defaultAudioModelId = normalizePlaceholderDefaultModelId(
    t2aDraft?.modelId,
    placeholderModelInfo?.id,
    placeholderModelInfo?.model_name,
    placeholderModelId,
  );
  const defaultParams = i2iUserDraft?.params ?? placeholderData.params ?? imageView.primary?.params;
  const defaultVideoParams = i2vUserDraft?.params ?? placeholderData.params;
  const defaultAudioParams = t2aDraft?.params ?? placeholderData.params;
  const draftImagePaths = Array.isArray(i2iUserDraft?.imagePaths)
    ? i2iUserDraft.imagePaths.filter((path2) => typeof path2 === "string" && !!path2)
    : void 0;
  const draftVideoImagePaths = Array.isArray(i2vUserDraft?.imagePaths)
    ? i2vUserDraft.imagePaths.filter((path2) => typeof path2 === "string")
    : void 0;
  const draftVideoPaths = Array.isArray(i2vUserDraft?.videoPaths)
    ? i2vUserDraft.videoPaths.filter((path2) => typeof path2 === "string" && !!path2)
    : void 0;
  const draftAudioPaths = Array.isArray(i2vUserDraft?.audioPaths)
    ? i2vUserDraft.audioPaths.filter((path2) => typeof path2 === "string" && !!path2)
    : void 0;
  const t2aDraftAudioPaths = Array.isArray(t2aDraft?.audioPaths)
    ? t2aDraft.audioPaths.filter((path2) => typeof path2 === "string" && !!path2)
    : void 0;
  const draftI2ITextPaths = Array.isArray(i2iUserDraft?.textPaths)
    ? i2iUserDraft.textPaths.filter((path2) => typeof path2 === "string" && !!path2)
    : void 0;
  const draftI2VTextPaths = Array.isArray(i2vUserDraft?.textPaths)
    ? i2vUserDraft.textPaths.filter((path2) => typeof path2 === "string" && !!path2)
    : void 0;
  const draftT2ATextPaths = Array.isArray(t2aDraft?.textPaths)
    ? t2aDraft.textPaths.filter((path2) => typeof path2 === "string" && !!path2)
    : void 0;
  const referenceMediaPaths = reactExports.useMemo(
    () =>
      resolvePlaceholderReferencePaths({
        incomingSourceIds,
        referenceImageIds: placeholderData.referenceImageIds,
        referenceVideoIds: placeholderData.referenceVideoIds,
        referenceAudioIds: placeholderData.referenceAudioIds,
        assetMetadataStore,
        getNodeById,
      }),
    [
      incomingSourceIds,
      placeholderData.referenceImageIds,
      placeholderData.referenceVideoIds,
      placeholderData.referenceAudioIds,
      assetMetadataStore,
      getNodeById,
    ],
  );
  const referenceImagePaths = referenceMediaPaths.imagePaths;
  const defaultImagePaths = resolveDraftReferencePaths(referenceImagePaths, draftImagePaths);
  const defaultI2VImagePaths = resolveDraftReferencePaths(
    referenceImagePaths,
    draftVideoImagePaths,
  );
  const defaultI2VVideoPaths = resolveDraftReferencePaths(
    referenceMediaPaths.videoPaths,
    draftVideoPaths,
  );
  const defaultI2VAudioPaths = resolveDraftReferencePaths(
    referenceMediaPaths.audioPaths,
    draftAudioPaths,
  );
  const t2aReferenceAudioPaths = reactExports.useMemo(
    () =>
      resolvePlaceholderReferencePaths({
        incomingSourceIds,
        referenceAudioIds: placeholderData.referenceAudioIds,
        assetMetadataStore,
      }).audioPaths,
    [incomingSourceIds, placeholderData.referenceAudioIds, assetMetadataStore],
  );
  const defaultT2AAudioPaths = resolveDraftReferencePaths(
    t2aReferenceAudioPaths,
    t2aDraftAudioPaths,
  );
  const defaultI2ITextPaths = resolveEditableTextReferencePaths(
    referenceTextPaths,
    liveReferenceTextPaths,
    draftI2ITextPaths,
  );
  const defaultI2VTextPaths = resolveEditableTextReferencePaths(
    referenceTextPaths,
    liveReferenceTextPaths,
    draftI2VTextPaths,
  );
  const defaultT2ATextPaths = resolveEditableTextReferencePaths(
    referenceTextPaths,
    liveReferenceTextPaths,
    draftT2ATextPaths,
  );
  const selfAssetIds = reactExports.useMemo(() => {
    const ids2 = new Set();
    for (const slot of imageView.slots) {
      if (slot.status === "ready" && slot.id) ids2.add(slot.id);
    }
    ids2.add(id2);
    return ids2;
  }, [id2, imageView.slots]);
  const {
    handleSetPrimary,
    handleDeleteSub,
    handleSplitSub,
    handleSubContextMenu,
    handleDownloadSub,
  } = useMultiImageActions({
    id: id2,
    view: imageView,
    subImages,
    reactFlow,
    nodeWidth: cardWidth,
    nodeHeight: mediaAreaHeight,
  });
  const handleOpenPlaceholderSlot = reactExports.useCallback(
    (originalIndex) => {
      const targetSlot = imageView.slots[originalIndex];
      const targetIndex = resolveLightboxIndexForSlot(mediaLightboxItems, targetSlot, 0);
      mediaLightbox.openLightbox(targetIndex);
    },
    [imageView.slots, mediaLightboxItems, mediaLightbox.openLightbox],
  );
  const handleToggleOverlay = reactExports.useCallback(
    (e2) => {
      e2.stopPropagation();
      const { open, close: close2 } = overlayStore.getState();
      if (isOverlayOpen) close2(id2);
      else open(id2);
    },
    [overlayStore, isOverlayOpen, id2],
  );
  const handleSelectRound = reactExports.useCallback(
    (roundIdx) => {
      if (roundIdx === imageView.activeRoundIndex) return;
      const target = imageView.rounds[roundIdx]?.[0];
      if (!target) return;
      const subMatch = subImages.find((sub) => {
        const subAssetId = sub.assetId ?? sub.data?.assetId;
        return sub.id === target.id || subAssetId === target.id;
      });
      const targetNodeId = subMatch?.id ?? target.id;
      promoteSubImageToMain(targetNodeId);
    },
    [imageView.activeRoundIndex, imageView.rounds, subImages, promoteSubImageToMain],
  );
  const handleSelectVideoSlot = reactExports.useCallback(
    (originalIndex) => {
      if (originalIndex <= 0) return;
      if (!isError && imageView.hasLoading) return;
      const target = imageView.slots[originalIndex];
      if (!target || target.status !== "ready") return;
      const subMatch = subImages.find((sub) => {
        const subAssetId = sub.assetId ?? sub.data?.assetId;
        return sub.id === target.id || subAssetId === target.id;
      });
      const targetNodeId = subMatch?.id ?? target.id;
      promoteSubImageToMain(targetNodeId, {
        persistMode: "request",
      });
      overlayStore.getState().close(id2);
    },
    [
      isError,
      imageView.hasLoading,
      imageView.slots,
      subImages,
      promoteSubImageToMain,
      overlayStore,
      id2,
    ],
  );
  const handleBadgeClick = reactExports.useCallback(
    (e2) => {
      if (imageView.rounds.length > 1 && imageView.slots.length === 1) {
        e2.stopPropagation();
        const next2 = (imageView.activeRoundIndex + 1) % imageView.rounds.length;
        handleSelectRound(next2);
        return;
      }
      handleToggleOverlay(e2);
    },
    [
      imageView.rounds,
      imageView.slots.length,
      imageView.activeRoundIndex,
      handleSelectRound,
      handleToggleOverlay,
    ],
  );
  const handleI2ISubmit = reactExports.useCallback(
    (nextPrompt, modelId, params, imagePaths, replaceNodeId, count2, displayPrompt2, textPaths) => {
      const submit = () => {
        submitImg2Image?.(
          id2,
          nextPrompt,
          modelId,
          params,
          imagePaths,
          replaceNodeId,
          count2,
          displayPrompt2,
          void 0,
          void 0,
          textPaths,
        );
      };
      return submitAfterOptionalDraftFlush({
        shouldFlush: !!replaceNodeId,
        flushDraft: flushPersist,
        submit,
        onFlushError: () => dedupedToast.error(t2("canvas.promptDraftSaveFailed")),
      });
    },
    [id2, submitImg2Image, flushPersist, t2],
  );
  const handleI2VSubmit = reactExports.useCallback(
    (
      nextPrompt,
      modelId,
      params,
      imagePaths,
      videoPaths,
      audioPaths,
      replaceNodeId,
      displayPrompt2,
      count2,
      textPaths,
    ) => {
      const submit = () => {
        submitImg2Video?.(
          id2,
          nextPrompt,
          modelId,
          params,
          imagePaths,
          videoPaths,
          audioPaths,
          replaceNodeId,
          displayPrompt2,
          count2,
          void 0,
          void 0,
          textPaths,
        );
      };
      return submitAfterOptionalDraftFlush({
        shouldFlush: !!replaceNodeId,
        flushDraft: flushPersist,
        submit,
        onFlushError: () => dedupedToast.error(t2("canvas.promptDraftSaveFailed")),
      });
    },
    [id2, submitImg2Video, flushPersist, t2],
  );
  const handleT2ASubmit = reactExports.useCallback(
    (nextPrompt, modelId, params, replaceNodeId, imagePaths, audioPaths, textPaths) => {
      void (async () => {
        if (replaceNodeId) await flushPersist();
        submitTxt2Audio?.(
          id2,
          nextPrompt,
          modelId,
          params,
          replaceNodeId,
          void 0,
          void 0,
          imagePaths,
          audioPaths,
          textPaths,
        );
      })();
    },
    [id2, submitTxt2Audio, flushPersist],
  );
  reactExports.useEffect(() => {
    if (!selected2) return;
    if (isMultiSelect || isBoxSelecting) return;
    if ((mediaType === "image" || mediaType === "video") && isOverlayOpen) return;
    if (mediaType === "image") {
      if (isStoryboardGeneration) {
        if (showStoryboardGridPopover) return;
        setShowStoryboardGridPopover(true);
        return;
      }
      if (showI2IPopover) return;
      setShowI2IPopover(true);
      return;
    }
    if (mediaType === "video") {
      if (showI2VPopover) return;
      setShowI2VPopover(true);
      return;
    }
    if (mediaType === "audio") {
      if (showT2APopover) return;
      setShowT2APopover(true);
    }
  }, [
    selected2,
    isMultiSelect,
    isBoxSelecting,
    mediaType,
    isStoryboardGeneration,
    isOverlayOpen,
    showI2IPopover,
    showI2VPopover,
    showT2APopover,
    showStoryboardGridPopover,
  ]);
  reactExports.useEffect(() => {
    if (!selected2) return;
    if (mediaType !== "image" && mediaType !== "video" && mediaType !== "audio") return;
    refreshUpstreamText(incomingSourceIds);
  }, [selected2, mediaType, incomingSourceIds, refreshUpstreamText]);
  const fakeSlot = reactExports.useMemo(
    () => ({
      id: id2,
      status: "ready",
      error: errorMessage2 ?? null,
    }),
    [id2, errorMessage2],
  );
  const generatingIcon = reactExports.useMemo(() => {
    if (mediaType === "video") return <VideoPlaceholderIcon />;
    if (mediaType === "audio") return <AudioPlaceholderIcon />;
    if (mediaType === "text") return <TextPlaceholderIcon />;
    return <ImagePlaceholderIcon />;
  }, [mediaType]);
  const progressKind =
    mediaType === "video"
      ? "video"
      : mediaType === "audio"
        ? "audio"
        : mediaType === "text"
          ? "text"
          : "image";
  const isH3MaxVideo =
    mediaType === "video" &&
    [placeholderModelId, model].some((value) => isMiniMaxH3MaxModelValue(value));
  const generationProgressStartedAt =
    (isH3MaxVideo ? readGenerationSubmittedAt(data2) : void 0) ?? readGenerationStartedAt(data2);
  const generatingProgress = useSimulatedProgress(
    !isError && !isQueuePaused && !isQueued,
    progressKind,
    generationProgressStartedAt,
    isH3MaxVideo ? "h3-max-video" : void 0,
    readGenerationAttemptId(data2),
  );
  return (
    <NodeShell width={cardWidth} generating={showEdgeLight} className={isError ? "h-full" : void 0}>
      <div
        ref={frameRef}
        className={`relative overflow-hidden ${borderClass}${imageView.isMulti && !isOverlayOpen ? " canvas-media-stack" : ""}${isError ? " h-full" : ""}`}
        style={{
          width: cardWidth,
          borderRadius: MEDIA_NODE_RADIUS,
          outlineStyle: "none",
        }}
        data-node-selected={selected2 ? "true" : "false"}
      >
        <NodeFrameStroke />
        <Handle
          type="target"
          position={Position.Left}
          style={{
            opacity: 0,
            width: 0,
            height: 0,
            pointerEvents: "none",
          }}
        />
        <Handle
          type="source"
          position={Position.Right}
          style={{
            opacity: 0,
            width: 0,
            height: 0,
            pointerEvents: "none",
          }}
        />
        {isError ? (
          // Error state delegates to MediaErrorCard, but grouped placeholders
          // still expose the active-round count badge and the bottom round strip
          // so the user can inspect siblings or jump back to a successful round.
          <div className="relative h-full">
            <MediaErrorCard
              errorMessage={errorMessage2}
              displayModel={displayModel}
              onDelete={handleDelete2}
              onReport={bridge.onReportNodeError ? handleReport : void 0}
              reportStatus={bridge.getNodeErrorReportStatus?.(id2) ?? "idle"}
              variant={
                isRecoverableError
                  ? "recoverable"
                  : isGenerationStatusUnknown
                    ? "uncertain"
                    : placeholderData.errorReason === GENERATE_ERROR_CODE_CONCURRENCY_LIMIT
                      ? "concurrency_limit"
                      : "failed"
              }
              onCancel={
                isRecoverableError && bridge.onCancelGeneration ? handleCancelGeneration : void 0
              }
              cancelling={cancelGenerationPending}
              onRetry={
                placeholderData.errorReason === GENERATE_ERROR_CODE_CONCURRENCY_LIMIT &&
                placeholderData.retryPayload &&
                bridge.onRetryGeneration
                  ? handleRetry
                  : void 0
              }
              retrying={bridge.isRetryGenerationPending?.(id2) ?? false}
              refundStatus={placeholderData.refundStatus}
              refundedCredits={placeholderData.refundedCredits}
            />
            {(showImageChrome || showVideoChrome) && (
              <CountBadge
                count={totalImageCount}
                expanded={isOverlayOpen}
                unit={countUnit}
                onClick={handleBadgeClick}
              />
            )}
          </div>
        ) : (
          <div
            className="relative"
            style={{
              height: mediaAreaHeight,
              width: "100%",
            }}
          >
            <ImageSlotBody
              nodeId={id2}
              slot={fakeSlot}
              width={cardWidth}
              height={mediaAreaHeight}
              errorVariant="full"
              generatingProgress={isQueued || isQueuePaused ? void 0 : generatingProgress}
              generatingIcon={generatingIcon}
              generatingLabel={
                isQueued || isQueuePaused ? (
                  <QueueGenerationControl
                    state={isQueuePaused ? "paused" : "queued"}
                    onCancel={isQueued ? handleCancelQueue : void 0}
                    onResume={isQueuePaused ? handleResumeQueue : void 0}
                    cancelling={bridge.isCancelGenerationQueuePending?.(id2) ?? false}
                    resuming={bridge.isRetryGenerationPending?.(id2) ?? false}
                    canResume={!!placeholderData.retryPayload}
                    actionUiId="canvas.placeholder.queue"
                  />
                ) : estimatedRemainingWaitSeconds ? (
                  <GenerationWaitEstimate
                    seconds={estimatedRemainingWaitSeconds}
                    actionUiId="canvas.placeholder"
                  />
                ) : (
                  void 0
                )
              }
              overrideStatus={
                isError ? "error" : isQueued || isQueuePaused ? "pending" : "generating"
              }
              overrideError={errorMessage2 ?? null}
            />
            {(showImageChrome || showVideoChrome) && (
              <CountBadge
                count={totalImageCount}
                expanded={isOverlayOpen}
                unit={countUnit}
                onClick={handleBadgeClick}
              />
            )}
          </div>
        )}
      </div>
      {showRoundSwitcher && (
        <RoundDots
          count={imageView.rounds.length}
          activeIdx={imageView.activeRoundIndex}
          onSelect={handleSelectRound}
        />
      )}
      {showImageOverlay && (
        <MultiImageOverlay
          nodeId={id2}
          view={imageView}
          cardWidth={cardWidth}
          cardHeight={mediaAreaHeight}
          onSetPrimary={isError ? handleSetPrimary : noopImageAction}
          onDeleteSub={isError ? handleDeleteSub : noopImageAction}
          onSplitSub={isError ? handleSplitSub : noopImageAction}
          onSplitAll={noopImageAction}
          onSubContextMenu={handleSubContextMenu}
          onDownloadSub={handleDownloadSub}
          onOpenSlot={handleOpenPlaceholderSlot}
          readonly={!isError}
        />
      )}
      {showVideoOverlay && (
        <VideoMultiOverlay
          view={imageView}
          cardWidth={cardWidth}
          cardHeight={mediaAreaHeight}
          onSelectSlot={handleSelectVideoSlot}
          onDeleteSub={isError ? handleDeleteSub : noopImageAction}
          onSplitSub={isError ? handleSplitSub : noopImageAction}
          onSubContextMenu={handleSubContextMenu}
          onDownloadSub={handleDownloadSub}
          onOpenSlot={handleOpenPlaceholderSlot}
          readonly={!isError}
        />
      )}
      {mediaType === "image" && mediaLightbox.lightboxProps && (
        <ImageLightbox$2
          {...mediaLightbox.lightboxProps}
          alt={mediaLightbox.lightboxProps.items[mediaLightbox.lightboxProps.index]?.fileName ?? ""}
        />
      )}
      {mediaType === "video" && mediaLightbox.lightboxProps && (
        <VideoLightbox
          items={mediaLightbox.lightboxProps.items}
          initialIndex={mediaLightbox.lightboxProps.index}
          onClose={mediaLightbox.lightboxProps.onClose}
        />
      )}
      {mediaType === "image" &&
        !isStoryboardGeneration &&
        selected2 &&
        !isOverlayOpen &&
        showI2IPopover && (
          <I2IPopover
            onSubmit={handleI2ISubmit}
            onClose={handleI2IClose}
            listImageModels={fetchImageModels}
            defaultImagePaths={defaultImagePaths}
            defaultPrompt={i2iDraftPrompt ?? displayPrompt}
            defaultPromptJson={typeof i2iDraftPromptJson === "string" ? i2iDraftPromptJson : void 0}
            defaultModelId={defaultModelId}
            defaultParams={defaultParams}
            lastUsedModelId={lastUsedI2I?.modelId}
            lastUsedParams={lastUsedI2I?.params}
            resolveFileUrl={resolveFileUrl}
            selfAssetIds={selfAssetIds}
            nodeId={void 0}
            replaceNodeId={id2}
            isGenerating={isGeneratingPopover}
            onSaveDraft={(draft) => savePopoverDraft(id2, "i2i", draft)}
            currentImageCount={imageView.slots.length}
            hasLoadingSlots={isGeneratingPopover}
            defaultTextPaths={defaultI2ITextPaths}
            hasUpstreamText={!!upstreamTextContent}
            referenceTextContent={upstreamTextContent}
            popoverGapOffset={showRoundSwitcher ? ROUND_DOTS_POPOVER_GAP_OFFSET : 0}
          />
        )}
      {mediaType === "image" &&
        isStoryboardGeneration &&
        selected2 &&
        !isOverlayOpen &&
        showStoryboardGridPopover && (
          <StoryboardGridPopover
            onClose={handleStoryboardGridClose}
            replaceNodeId={id2}
            defaultPrompt={displayPrompt}
            defaultParams={placeholderData.params}
            defaultReferencePaths={defaultImagePaths}
            resolveFileUrl={resolveFileUrl}
            isGenerating={isGeneratingPopover}
          />
        )}
      {mediaType === "video" && selected2 && !isOverlayOpen && showI2VPopover && (
        <I2VPopover
          onSubmit={handleI2VSubmit}
          onClose={handleI2VClose}
          listVideoModels={fetchVideoModels}
          selfAssetIds={selfAssetIds}
          defaultImagePaths={defaultI2VImagePaths}
          defaultVideoPaths={defaultI2VVideoPaths}
          defaultAudioPaths={defaultI2VAudioPaths}
          defaultPrompt={i2vDraftPrompt ?? displayPrompt}
          defaultPromptJson={typeof i2vDraftPromptJson === "string" ? i2vDraftPromptJson : void 0}
          defaultModelId={defaultVideoModelId}
          defaultParams={defaultVideoParams}
          lastUsedModelId={lastUsedI2V?.modelId}
          lastUsedParams={lastUsedI2V?.params}
          resolveFileUrl={resolveFileUrl}
          nodeId={void 0}
          replaceNodeId={id2}
          showCountChip={true}
          isGenerating={isGeneratingPopover}
          onSaveDraft={(draft) => savePopoverDraft(id2, "i2v", draft)}
          defaultTextPaths={defaultI2VTextPaths}
          hasUpstreamText={!!upstreamTextContent}
          referenceTextContent={upstreamTextContent}
          providerTaskId={providerTaskId}
          suppressImageAspectRejectedToast={isError}
          popoverGapOffset={showRoundSwitcher ? ROUND_DOTS_POPOVER_GAP_OFFSET : 0}
        />
      )}
      {mediaType === "audio" && selected2 && showT2APopover && (
        <TxtPopover
          mode="audio"
          onSubmit={handleT2ASubmit}
          onClose={handleT2AClose}
          listModels={fetchAudioModels}
          fetchTtsVoices={fetchTtsVoices}
          defaultPrompt={t2aDraftPrompt ?? displayPrompt}
          defaultModelId={defaultAudioModelId}
          defaultParams={defaultAudioParams}
          lastUsedModelId={lastUsedAudio?.modelId}
          lastUsedParams={lastUsedAudio?.params}
          nodeId={void 0}
          replaceNodeId={id2}
          isGenerating={isGeneratingPopover}
          popoverGapOffset={AUDIO_FULL_BODY_POPOVER_GAP_OFFSET}
          onSaveDraft={(draft) => savePopoverDraft(id2, "t2a", draft)}
          resolveFileUrl={resolveFileUrl}
          defaultImagePaths={t2aDraft?.imagePaths}
          defaultAudioPaths={defaultT2AAudioPaths}
          defaultTextPaths={defaultT2ATextPaths}
          referenceTextContent={upstreamTextContent}
        />
      )}
    </NodeShell>
  );
}
function imageViewPrimaryPrompt(data2) {
  const d2 = data2;
  const prompt = d2?.prompt;
  if (typeof prompt === "string" && prompt.trim().length > 0) return prompt;
  const description = d2?.description;
  return typeof description === "string" && description.trim().length > 0 ? description : void 0;
}
function toNonEmptyString(value) {
  if (typeof value !== "string") return void 0;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : void 0;
}
function normalizePlaceholderDefaultModelId(
  draftModelId,
  registryModelId,
  registryModelName,
  persistedModelId,
) {
  const draft = toNonEmptyString(draftModelId);
  if (
    draft &&
    registryModelId &&
    (draft === registryModelId || draft === registryModelName || draft === persistedModelId)
  ) {
    return registryModelId;
  }
  return draft ?? registryModelId ?? persistedModelId;
}
export const PlaceholderNode = reactExports.memo(PlaceholderNodeInner, areNodePropsEqual);
const approvedStickerUrl = "" + new URL("../sticker-approved-Cvm_nH-W.png", import.meta.url).href;
const stampCursorUrl = "" + new URL("../sticker-cursor-bowD96zH.svg", import.meta.url).href;
const dotStickerUrl = "" + new URL("../sticker-dot-CxhF5shh.png", import.meta.url).href;
const heartStickerUrl =
  "data:image/png;base64,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";
const questionStickerUrl =
  "data:image/png;base64,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";
const rejectedStickerUrl = "" + new URL("../sticker-rejected-Z3JcNklb.png", import.meta.url).href;
const starStickerUrl =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHgAAAB4CAYAAAA5ZDbSAAAACXBIWXMAABYlAAAWJQFJUiTwAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAOdEVYdFNvZnR3YXJlAEZpZ21hnrGWYwAADUdJREFUeAHtnXtMVFcex38O4/CUt4iKYH1FsSKKpo0ma0OsbZNN2LXuw2QNVDe7m5WgtpL1D7fq/mWWTWwNySYYLd1N1i0ado2PtYllaVoCZLOoVdCEIBaxjjiMiAwvYWbPb+7cLVJn7u/OvefOvdPzSU4YmHOHO/d7fr/zO28AgUAgEAgEkSAGvj/YQPq+jsBrXyBFNTMguoljKb6pqak4KyurYNasWTl2uz15YmJi8OnTp73379+/efHixbaqqqqHLN8QCCyDrbKycnFPT88xJuYTr9frC5UGBgY+ZYXgbXZdEghMjwPFGhsbu6ck7PTkcrnOnD59eg1ILlxgQhwdHR371Ao7NWHBqK6ufgWEyKbDrlXcqSLX1tYWgcA8oNVR6ltqYkFYM/vYFBCYgtRw6lyl1NnZeQSkZpUggthRCL3FxYQeoaKiYikIIkddXV0hD+uVk9PpPAlSe1oQAezY1iULNu72eR+e8nkHGlSJLKw4cmSQrXeozef9T6rP2wxSuruHLDAWIrCoFVu5L9re3t7+mzlz5mxTzDl2F6BjA8DEwLd/G2oF8LLfU95UvDwpKSmf9XZ90tra6gaLYeW+aLTeazNnzsxRzHnnHYBHH7/4vRUNAMmvgRK9vb0f5ObmVrKXE2AhrGrB6qz3zs7g749/DTC7FJRAK7bZbH9rbGwcAAth1e64lCVLluwl5bx/JPT7g41SIVCAiZtcygCLPTMrCmzv6ur6Bck1o3CDnytmA9fHQGHevHm/ZD9mgYWwosBJOTk5+0k5idYJDz58PgALAhYq1t+N/t4yz81qAqP1lpKsF7n/B1I2mGTiPvyQlHXBggU/BQtZsdUETiBb76NamvXKEK04MTHxVRZobQGLPDtLCcys9x3drVdGhRUXFRW9CxaxYisJnJSVlfVzUk611isThVZsGYGbmprewAdLyqzWemXQiokRdcCKTT+HyyoCJxUUFOgbOQfDSXPTWNhYoXsdTI4lBK6url7J3Xpl/G3nRlLWlStX/gpMPghhBYHjtm/fTrdeojghIRaS5OTkLWwocQGYGCsInMj6gWnWS6w/FVFRUPbv3/9bMLEVm3mwAQtfMhuLfT8tLW2LYm6lQQW1qBiECAwljrJfJ8Fky2HMMFxoB2lim/3gwYMZGzduXDR//vzc+Pj4hdnZ2VvIdW+oIcFwIQ4ler3ewaGhoZZHjx61uN3ua2fPnv2qqqqqn701DtLwIiYvRACjBEYR0SJlIdPWr1/PBoSWFGRkZOTHxcXlMEHzyZ0Y00HrvbYIdAfFRZHDAEUfGRnp8Hg8HfI6qImJCdfmzZtvgCS4IeLrKbAsoD/V1tbmrV27tiAmJiYdF30lJCT4F35pEjIYPKxX5uU2FgUUgp6MjY114AI4Wfy+vr6vWGFwB8Qfh+fF14QeAiewSHL+7t27f8iscQMT81XdBQwFL+uVyd4DkHcMjALFZ6l3cHCw4969e1+yKquR/dnD0iiEgRaBE1hD/y3sgCDXkzzoPaI8qK+FmFSAwjusYkmFSPDs2bNeZuUtFy5cOFpWVnYdVFp1OALbWB2aV15efpD1DesYtoYBWu+tYm09VxRyDgHMPwSRJjAv7DB7+YR6jVqBbTU1NUWlpaX1hrrhYPC2XpkIW/FU1IqsqqPDVOKi1bo4BVbTwUGIbwwoSATYePhe1jdwGIidK2osOJXVBf+KaH0rg0N63ax2cP8TDAWDrcxSU1hyc3PzNhaA/QMUmlhUgXGa6p4VK1b8CYwCLRSFHL7GXn8tJXyN1sS7zlUioVASOWE1QOxC1ijMk37q3JwKBUbbrMm5ARRcNVVg+iRzNaBQnoBow9efF5Ew8G5K/MIzoR0Lmeh53xYCDuLfvn373fz8fBzfDGrFdiDAmkOvaRJXFhL7dz3XJRHH71pXxFDgdwo2UDHd8vGn/LcwCEwAxNWPg8HyUCzY4XQ6/0xuEsnjqWiRwwExo1FIPUGxZcFnbQJI/xH50r179y47fvx4Z7D3KQInsODqM1JwZVSzJdpBsZfWk9x6wE0H7WqjNJMcOBigmAsnuglx9QG9YOdWkudjw5W5EKKqpQhsYwMGygK7/gICHUGRCa0FHMQJ9T5JYKCATQWBvkySYxeb6jemMDE5OdmrmIsw+0GgAqyHCZMNhoeHUZugzSSSwKOjo8oC483g0JpAO9hsIk40cLlcNyHECBNF4NHHjx+3AAXsyiOUOkEIZHHRgglcvXr1eqj3SRbc39/fCFSWsfA+jd6OE0xBFjeB1uvl8Xhadu3adTtUHlIAtWbNms/wwyh5/UNrKLKok9Xz0imyuMiDBw/+DgozPajDhUMNDQ3vgxoWfSREVgM+LxU9WG63++yyZcuwmzLkDA/yeHBJSckXfX19p0ANWCerKJHfW1QaA07jqa+v/yMQdqlXO6ND/ZgwtuU6iqU+acF3CWM60M2bN3cWFBT8FQjzs9SubGAtptHPi4uLt7LerWTSFbY4Nkj+M4CBT1nRc4JgCmGIi1N2mGv+AKSptYqoXrrS0tIykJub+8WqVaveEiJrAN2yyn6DwHwsLBEe6jXhrE3ynT9/3ilE1kAYAeiUyXaDaq4Ld/GZEDlctIlLni4ro2V1oRBZLQaLi2hdPipEpoJNxjm/VnWJVnERPdYHC5GVwGh53u9UXRIQ9/fs5VPQgF4LwIXIwQizKRQQV/Nxe3qu8BciTyfC4iJ6b+EgRJYxgbgIjz06tInc/4maqSrmxCTiIrw2YfGLnJ2d3VRYWPimKpHTSgAen7OuyCYSF+G5y47v0qVLD5nIX6oSGQe9Y1Ikka3Iin+ryj6lKaQpWg4G732yJsrLy/974sSJbTjERb4K1yhZFRWrOHD4VWs7VwkjNkLzi3z58uWduPMM6Yrh62BZiCsfcXUg8264oSk3cRGjdrqbKCkpaXK5XGdJuSO9PFQLxMLZ2tp6GDiLixi6lWF8fDxthaKVJwcQ7z09Pd2QrYiNFNjBUBbYY/GZH0TvM2PGjHQwACMFnhkbG5uvmGvcwgEWQnTRKSkpWNhJ67O1YJjAV65ceZmUMRosmBBJBxaNcX/+hgnMSixtOzorR9AyBDedmJiI3oz76eKGCZyamppLymjlCFqGUEjxqDyIIhftwA1JSTmjYXot4TvgnicHDhzgHmgZJbCN1ESyev0rQ6xmNm3a9BJwxiiB7QGXFBqrR9AyxIKal5dXAJwxTGDcJ1oxV7RYMHGfL9bZgS0LrvWwIQJXVlZmkCw4GiJomafKx9oGqi2ukbQhAm/dunU1KWM0RNAyhO8SFxeHXs36FpyZmUkTOJoWqHmUvVFg90DLWzCtiWRU/WvUTrEjtO9TU1PDNZI2ROBAr01oeEfQKCxOpVl9R9rcO5Pz4vTRu6Rs69at4xpJGyJwRCPoqcLifCn8HTc4WfyRJDSvTWP82x4rF1rm3ULuVKcV7gKzQYbVEYugcTMYPBZHFnY6KDRuerLoFHlXG1WMdStmycrKwsX03Oph7gLPnTt3LSmjnhG0fKAVbgZDEW52mWTNegtNsGDekTRvgePwZDNSTj0iaNkiiUfSfQcUelWbfiesEPukWT/BbOAEb4FpAZbW+hfdL67e06NOxW2g0KXrEYgRvdKOHTt+AJzgLTCti1JLBI3bIGAApfc2ilMDsXB3CiLGFXgQJ3DSgqvAzPWkkQKscCw4s0x6+Gi5PNu2KDS67XDqZ+Ic6UA/gfUEXr58eRopo5oASw6gFnOKfIMhB2K5x+j/lzjogId2AqdAywongEvIwoYbQOnF3D3SPVCrhAj3r3MVuLOz003KGMoi5PMLdBIW99xUtYwm2D3JQZ1SIEawdjxqFjidIcxV4KNHj7pIm4mjVUx/EHIPFHZUqNjDMRgoLJ4Wxuq7N2JjY1ffunVrvy5Cy4HYi4Qmxgd4hjDocFZwJIjr7+8/4/V6fYrpmdvnfXjK5+0s83m/Oebzjrt9pOsUEnt4zY2NjT9h9zI92MM6L7O9vf29sbGxe3r8L+/IHXb/pdJ3GGggX9fa2vpjsCr4cHV5eCoTitbW1raL3QKaUChPZa+rqyvs6ek5Fqn7ZPdAC0ZNSiqrY54Y9cDwf6FYoCzsdOwnT55cR/Y4OqXAvXKfPssTW3d39yGjhN23b98S0PbAkqqrq19B1877ntF66+vraZMhTE4qzwfmcrnOoPUB8UxdIsldXV17dKufX5Bu3LjxHljcev9PbW1tkd4PCwtNU1PT2+zjE4AP/kAMPYPe1YzT6cTd2mnbWlgEO7o+PUTGh93N3D6or2fDvveampr1etXP+DnsM1MgCvE/qHBFluvZioqKpRAZ15Z07ty510dGRtrDFZd1/uABj1Ep7lRSUSiq0CgsujQO9Wy4JGH9rCauwLxYOMAc928I/vYndjS86EGhqPh3dMUBizXjg0lCj4SF70VWjQUY3wvECQZN53wetYdy8ABdLYrnYBbqX0PscDi8bBD8LkjnEgwDp35aHcHvgIGeXf4O2A+PXbUgfYdREAgEAoFAIBAIBAKBQCAQCAQh+B+qSXOK//kRewAAAABJRU5ErkJggg==";
const thumbsDownStickerUrl = "" + new URL("../sticker-thumbs-down-CO0P0mLl.png", import.meta.url).href;
const thumbsUpStickerUrl = "" + new URL("../sticker-thumbs-up-DL9-hU6T.png", import.meta.url).href;
const CANVAS_STICKER_ASSETS = [
  {
    id: "sticker-star",
    labelKey: "canvas.sticker.asset.star",
    src: starStickerUrl,
  },
  {
    id: "sticker-heart",
    labelKey: "canvas.sticker.asset.heart",
    src: heartStickerUrl,
  },
  {
    id: "sticker-dot",
    labelKey: "canvas.sticker.asset.dot",
    src: dotStickerUrl,
  },
  {
    id: "sticker-question",
    labelKey: "canvas.sticker.asset.question",
    src: questionStickerUrl,
  },
  {
    id: "sticker-thumbs-up",
    labelKey: "canvas.sticker.asset.thumbsUp",
    src: thumbsUpStickerUrl,
  },
  {
    id: "sticker-thumbs-down",
    labelKey: "canvas.sticker.asset.thumbsDown",
    src: thumbsDownStickerUrl,
  },
  {
    id: "sticker-approved",
    labelKey: "canvas.sticker.asset.approved",
    src: approvedStickerUrl,
  },
  {
    id: "sticker-rejected",
    labelKey: "canvas.sticker.asset.rejected",
    src: rejectedStickerUrl,
  },
];
const CANVAS_STICKER_PICKER_ASSET_IDS = [
  "sticker-approved",
  "sticker-rejected",
  "sticker-thumbs-up",
  "sticker-thumbs-down",
  "sticker-question",
  "sticker-heart",
  "sticker-star",
];
const CANVAS_STICKER_ASSET_BY_ID = new Map(CANVAS_STICKER_ASSETS.map((asset) => [asset.id, asset]));
export const CANVAS_STICKER_PICKER_ASSETS = CANVAS_STICKER_PICKER_ASSET_IDS.flatMap((id2) => {
  const asset = CANVAS_STICKER_ASSET_BY_ID.get(id2);
  return asset ? [asset] : [];
});
export const CANVAS_DEFAULT_STICKER_ASSET_ID = CANVAS_STICKER_PICKER_ASSET_IDS[0];
export const CANVAS_EMOJI_STICKERS = ["✅", "💯", "🎉", "👏", "🔥", "💡", "👀", "🚀"];
export const CANVAS_STAMP_CURSOR_URL = stampCursorUrl;
export function getCanvasStickerAsset(id2) {
  return CANVAS_STICKER_ASSETS.find((asset) => asset.id === id2);
}
const CanvasToolModeContext = reactExports.createContext("select");
export function CanvasToolModeProvider({ value, children: children2 }) {
  return <CanvasToolModeContext.Provider value={value}>{children2}</CanvasToolModeContext.Provider>;
}
function useCanvasToolMode() {
  return reactExports.useContext(CanvasToolModeContext);
}
const COMPACT_STICKER_COUNT = 7;
const ALL_STICKER_CHOICES = [
  ...CANVAS_STICKER_PICKER_ASSETS.map((asset) => ({
    id: asset.id,
    kind: "asset",
    asset,
  })),
  ...CANVAS_EMOJI_STICKERS.map((emoji2, index2) => ({
    id: `emoji-${index2}`,
    kind: "emoji",
    emoji: emoji2,
    index: index2,
  })),
];
function choiceActionUiId(choice, expanded) {
  const prefix = expanded ? "canvas.sticker-selection-panel" : "canvas.sticker-selection";
  return choice.kind === "asset"
    ? `${prefix}-${choice.asset.id}`
    : `${prefix}-emoji-${choice.index}`;
}
function choiceLabel(choice, t2) {
  return choice.kind === "asset" ? t2(choice.asset.labelKey) : choice.emoji;
}
function StickerChoiceIcon({ choice }) {
  if (choice.kind === "asset") {
    return (
      <img src={choice.asset.src} alt="" draggable={false} className="size-6 object-contain" />
    );
  }
  return (
    <span className="text-xl leading-none text-[var(--canvas-controls-text)]" aria-hidden="true">
      {choice.emoji}
    </span>
  );
}
function StickerToolbarButton({
  label,
  icon,
  dataActionUiId,
  onClick,
  active: active2 = false,
  toggle = false,
  destructive = false,
}) {
  return (
    <Tooltip$1 content={label}>
      <button
        type="button"
        aria-label={label}
        aria-pressed={toggle ? active2 : void 0}
        className="canvas-toolbar-action"
        onClick={onClick}
        data-action-ui-id={dataActionUiId}
        data-variant={destructive ? "destructive" : void 0}
        data-active={active2 || void 0}
        data-content={toggle ? "sticker" : void 0}
      >
        {icon}
      </button>
    </Tooltip$1>
  );
}
function StickerPickerControl({
  choices,
  activeChoiceId,
  expanded,
  onExpandedChange,
  onSelect,
  getChoiceLabel,
  expandLabel,
  collapseLabel,
}) {
  const label = expanded ? collapseLabel : expandLabel;
  const handleToggle = (event) => {
    event.preventDefault();
    event.stopPropagation();
    onExpandedChange(!expanded);
  };
  return (
    <div className="relative flex items-center">
      <Tooltip$1 content={label}>
        <button
          type="button"
          aria-label={label}
          aria-expanded={expanded}
          className="canvas-toolbar-action canvas-toolbar-disclosure"
          onClick={handleToggle}
          data-action-ui-id="canvas.sticker-selection-expand"
          data-active={expanded || void 0}
        >
          {expanded ? (
            <ChevronUp className="size-4" strokeWidth={1.5} aria-hidden="true" />
          ) : (
            <ChevronDown className="size-4" strokeWidth={1.5} aria-hidden="true" />
          )}
        </button>
      </Tooltip$1>
      {expanded && (
        <div
          role="dialog"
          aria-label={expandLabel}
          className="absolute bottom-[calc(100%+8px)] left-1/2 z-50 w-max max-w-[calc(100vw-24px)] -translate-x-1/2 overflow-x-auto canvas-toolbar-menu p-3"
        >
          <div className="flex flex-nowrap gap-1">
            {choices.map((choice) => {
              const active2 = choice.id === activeChoiceId;
              return (
                <button
                  key={choice.id}
                  type="button"
                  aria-label={getChoiceLabel(choice)}
                  aria-pressed={active2}
                  title={getChoiceLabel(choice)}
                  className="canvas-toolbar-action"
                  onClick={(event) => onSelect(choice, event)}
                  data-action-ui-id={choiceActionUiId(choice, true)}
                  data-content="sticker"
                >
                  <StickerChoiceIcon choice={choice} />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
function StickerNodeToolbar({ id: id2, data: data2, selected: selected2 }) {
  const { t: t2 } = useTranslation();
  const toolMode = useCanvasToolMode();
  const isDragging = useCanvasNodeIsDragging(id2);
  const {
    mergeNodeData,
    setStickerSelectionAsset,
    setStickerSelectionEmoji,
    copyNode,
    removeNode,
  } = useCanvasActions();
  const [stickerPickerExpanded, setStickerPickerExpanded] = reactExports.useState(false);
  reactExports.useEffect(() => {
    if (!selected2 || toolMode === "hand") {
      setStickerPickerExpanded(false);
    }
  }, [selected2, toolMode]);
  const handleAssetChange = reactExports.useCallback(
    (assetId) => {
      mergeNodeData(id2, {
        brandId: assetId,
      });
      if (toolMode === "sticker") setStickerSelectionAsset?.(assetId);
    },
    [id2, mergeNodeData, setStickerSelectionAsset, toolMode],
  );
  const handleEmojiChange = reactExports.useCallback(
    (emoji2) => {
      mergeNodeData(id2, {
        brandId: void 0,
        emoji: emoji2,
      });
      if (toolMode === "sticker") setStickerSelectionEmoji?.(emoji2);
    },
    [id2, mergeNodeData, setStickerSelectionEmoji, toolMode],
  );
  const handleChoiceSelect = reactExports.useCallback(
    (choice, event) => {
      event.preventDefault();
      event.stopPropagation();
      if (choice.kind === "asset") handleAssetChange(choice.asset.id);
      else handleEmojiChange(choice.emoji);
    },
    [handleAssetChange, handleEmojiChange],
  );
  const handleCopy = reactExports.useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      copyNode(id2);
    },
    [copyNode, id2],
  );
  const handleDelete2 = reactExports.useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      removeNode(id2);
    },
    [id2, removeNode],
  );
  const getChoiceLabel = reactExports.useCallback(
    (choice) => choiceLabel(choice, (key2) => t2(key2)),
    [t2],
  );
  const activeChoiceId = reactExports.useMemo(
    () =>
      data2.brandId ??
      (data2.emoji ? `emoji-${CANVAS_EMOJI_STICKERS.indexOf(data2.emoji)}` : void 0),
    [data2.brandId, data2.emoji],
  );
  const compactChoices = reactExports.useMemo(
    () => ALL_STICKER_CHOICES.slice(0, COMPACT_STICKER_COUNT),
    [],
  );
  const expandedChoices = reactExports.useMemo(() => {
    const compactChoiceIds = new Set(compactChoices.map((choice) => choice.id));
    return ALL_STICKER_CHOICES.filter((choice) => !compactChoiceIds.has(choice.id));
  }, [compactChoices]);
  const toolbarItems = reactExports.useMemo(
    () => [
      ...compactChoices.map((choice) => ({
        id: `sticker-selection-${choice.id}`,
        label: getChoiceLabel(choice),
        render: () => (
          <StickerToolbarButton
            label={getChoiceLabel(choice)}
            icon={<StickerChoiceIcon choice={choice} />}
            active={choice.id === activeChoiceId}
            toggle={true}
            dataActionUiId={choiceActionUiId(choice, false)}
            onClick={(event) => handleChoiceSelect(choice, event)}
          />
        ),
      })),
      {
        id: "sticker-selection-expand",
        label: t2("canvas.sticker.expand", "展开更多贴纸"),
        render: () => (
          <StickerPickerControl
            choices={expandedChoices}
            activeChoiceId={activeChoiceId}
            expanded={stickerPickerExpanded}
            onExpandedChange={setStickerPickerExpanded}
            onSelect={handleChoiceSelect}
            getChoiceLabel={getChoiceLabel}
            expandLabel={t2("canvas.sticker.expand", "展开更多贴纸")}
            collapseLabel={t2("canvas.sticker.collapse", "收起贴纸")}
          />
        ),
      },
      {
        id: "sticker-copy-node",
        label: t2("canvas.copySticker", "Copy Sticker"),
        separator: true,
        render: () => (
          <StickerToolbarButton
            label={t2("canvas.copySticker", "Copy Sticker")}
            icon={<CopyPlus className="size-4" strokeWidth={1.5} aria-hidden="true" />}
            dataActionUiId="canvas.sticker-copy-node"
            onClick={handleCopy}
          />
        ),
      },
      {
        id: "sticker-delete-node",
        label: t2("common.delete"),
        render: () => (
          <StickerToolbarButton
            label={t2("common.delete")}
            icon={<Trash2 className="size-4" strokeWidth={1.5} aria-hidden="true" />}
            dataActionUiId="canvas.sticker-delete-node"
            onClick={handleDelete2}
            destructive={true}
          />
        ),
      },
    ],
    [
      activeChoiceId,
      compactChoices,
      expandedChoices,
      getChoiceLabel,
      handleChoiceSelect,
      handleCopy,
      handleDelete2,
      stickerPickerExpanded,
      t2,
    ],
  );
  const visible = selected2 && !isDragging && (toolMode === "select" || toolMode === "sticker");
  return <NodeToolbar items={toolbarItems} visible={visible} density="compact" />;
}
export const StickerNode = reactExports.memo(function StickerNode2({
  id: id2,
  data: data2,
  selected: selected2,
}) {
  const frameRef = reactExports.useRef(null);
  useRegisterZoomCounter(frameRef);
  const sticker = data2;
  const asset = getCanvasStickerAsset(sticker.brandId);
  const label = asset ? `Sticker ${asset.id}` : `Sticker ${sticker.emoji}`;
  const rotation = typeof sticker.rotation === "number" ? sticker.rotation : 0;
  return (
    <>
      <div
        className="relative flex size-full items-center justify-center"
        role="img"
        aria-label={label}
        data-action-ui-id="canvas.sticker-node"
        data-sticker-target-id={sticker.targetId}
        data-sticker-fresh={sticker.__fresh ? "" : void 0}
      >
        <span
          className="sticker-art size-full"
          style={{
            "--sticker-rotation": `${rotation}deg`,
          }}
        >
          {sticker.__fresh && (
            <span className="sticker-burst" aria-hidden="true">
              {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
                <span
                  key={angle}
                  className="sticker-spark"
                  style={{
                    "--sticker-spark-angle": `${angle}deg`,
                  }}
                />
              ))}
            </span>
          )}
          {asset ? (
            <img
              src={asset.src}
              alt=""
              draggable={false}
              className="relative size-full select-none object-contain"
            />
          ) : (
            <span
              className="relative flex size-full items-center justify-center text-[2.75rem] leading-none"
              style={{
                color: "var(--canvas-controls-text)",
                filter:
                  "drop-shadow(0 2px 2px color-mix(in srgb, var(--canvas-controls-text) 22%, transparent))",
                WebkitTextStroke: "4px var(--canvas-controls-bg)",
                paintOrder: "stroke fill",
              }}
            >
              {sticker.emoji}
            </span>
          )}
        </span>
        <span
          ref={frameRef}
          className="canvas-node-frame pointer-events-none absolute inset-0 rounded-[10px]"
          data-node-selected={selected2 ? "true" : "false"}
          style={{
            transform: `rotate(${rotation}deg)`,
          }}
          aria-hidden="true"
        >
          <NodeFrameStroke />
        </span>
      </div>
      <StickerNodeToolbar id={id2} data={sticker} selected={!!selected2} />
    </>
  );
});
const TYPE_OPTIONS$4 = [
  {
    value: "text",
    labelKey: "canvas.table.field.text",
    defaultLabel: "Text",
  },
  {
    value: "number",
    labelKey: "canvas.table.field.number",
    defaultLabel: "Number",
  },
  {
    value: "attachment",
    labelKey: "canvas.table.field.attachment",
    defaultLabel: "Attachment",
  },
];
function AddColumnDialogInner({ onCommit, onClose }) {
  const { t: t2 } = useTranslation();
  const [title, setTitle] = reactExports.useState("");
  const [type2, setType] = reactExports.useState("text");
  const inputRef = reactExports.useRef(null);
  const typeLabels = reactExports.useMemo(
    () =>
      Object.fromEntries(
        TYPE_OPTIONS$4.map((opt) => [opt.value, t2(opt.labelKey, opt.defaultLabel)]),
      ),
    [t2],
  );
  reactExports.useEffect(() => {
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);
  const handleSubmit = reactExports.useCallback(() => {
    const trimmed = title.trim() || t2("canvas.table.untitledColumn", "Untitled");
    onCommit({
      title: trimmed,
      type: type2,
    });
  }, [title, type2, onCommit, t2]);
  const handleOpenChange = reactExports.useCallback(
    (open) => {
      if (!open) onClose();
    },
    [onClose],
  );
  return (
    <Dialog$1 open={true} onOpenChange={handleOpenChange}>
      <DialogContent$1 className="gap-4 sm:max-w-[360px]" onKeyDown={(e2) => e2.stopPropagation()}>
        <DialogHeader$1>
          <DialogTitle$1>{t2("canvas.table.addColumn", "Add column")}</DialogTitle$1>
        </DialogHeader$1>
        <div className="flex flex-col gap-1.5">
          <Label$1 htmlFor="add-col-title" className="text-muted-foreground">
            {t2("canvas.table.fieldName", "Title")}
          </Label$1>
          <Input$1
            id="add-col-title"
            ref={inputRef}
            type="text"
            value={title}
            onChange={(e2) => setTitle(e2.target.value)}
            onKeyDown={(e2) => {
              if (e2.key === "Enter") {
                e2.preventDefault();
                handleSubmit();
              }
            }}
            placeholder={t2("canvas.table.fieldNamePlaceholder", "Enter field title")}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label$1 className="text-muted-foreground">
            {t2("canvas.table.fieldType", "Type")}
          </Label$1>
          <Select$2
            value={type2}
            items={typeLabels}
            onValueChange={(value) => {
              if (value != null) setType(value);
            }}
          >
            <SelectTrigger$1>
              <SelectValue$1 />
            </SelectTrigger$1>
            <SelectContent$1>
              {TYPE_OPTIONS$4.map((opt) => (
                <SelectItem$1 key={opt.value} value={opt.value}>
                  {t2(opt.labelKey, opt.defaultLabel)}
                </SelectItem$1>
              ))}
            </SelectContent$1>
          </Select$2>
        </div>
        <DialogFooter$1>
          <Button$2 variant="ghost" onClick={onClose}>
            {t2("common.cancel", "Cancel")}
          </Button$2>
          <Button$2 onClick={handleSubmit}>{t2("common.confirm", "Add")}</Button$2>
        </DialogFooter$1>
      </DialogContent$1>
    </Dialog$1>
  );
}
export const AddColumnDialog = reactExports.memo(AddColumnDialogInner);
export function attachmentThumbnailUrl(attachment, meta2, displayWidth) {
  if (!meta2) return void 0;
  if (attachment.kind === "text") return void 0;
  if (attachment.kind === "audio") return void 0;
  if (attachment.kind === "file") return void 0;
  if (attachment.kind === "image") {
    return buildThumbnailUrl(meta2.url, displayWidth);
  }
  if (!meta2.path) return void 0;
  return buildVideoThumbnailUrl(meta2.url, meta2.path, displayWidth);
}
const VERTICAL_PADDING = 6;
const HORIZONTAL_PADDING = 4;
const MIN_CHIP_SIZE = 22;
const PREVIEW_THUMB_WIDTH = 280;
function TableCellAttachmentInner({
  attachments,
  rowHeightPx,
  columnWidthPx,
  onAdd: onAdd2,
  onRemove: onRemove2,
}) {
  const { t: t2 } = useTranslation();
  const { pickAsset } = useCanvasBridge();
  const chipSize = Math.max(
    MIN_CHIP_SIZE,
    Math.min(rowHeightPx - VERTICAL_PADDING * 2, columnWidthPx - HORIZONTAL_PADDING * 2),
  );
  async function handleOpenPicker() {
    if (!pickAsset) {
      return;
    }
    try {
      const picks = await pickAsset({
        multiple: true,
        existingAssetIds: attachments.map((a2) => a2.assetId),
        uploadMode: "attach",
        // Table cells have no caller-on-canvas linkage; drop the upstream
        // tab to keep the dialog focused on workspace + upload.
        tabs: ["canvas", "upload"],
      });
      if (!picks || picks.length === 0) return;
      const next2 = picks
        .filter(
          (r2) =>
            r2.type === "image" || r2.type === "video" || r2.type === "audio" || r2.type === "text",
        )
        .map((r2) => ({
          assetId: r2.assetId,
          name: r2.name,
          kind: r2.type,
        }));
      if (next2.length > 0) onAdd2(next2);
    } catch (err) {
      if (err?.code === "picker_busy") return;
      console.warn("[cell-attachment] pickAsset rejected", err);
    }
  }
  return (
    <div
      className="flex h-full items-center gap-1 overflow-x-auto overflow-y-hidden px-1"
      style={{
        paddingTop: VERTICAL_PADDING,
        paddingBottom: VERTICAL_PADDING,
      }}
      onWheel={(e2) => e2.stopPropagation()}
    >
      {attachments.map((att) => (
        <AttachmentChip$1
          key={att.assetId}
          attachment={att}
          size={chipSize}
          onRemove={() => onRemove2(att.assetId)}
        />
      ))}
      <button
        type="button"
        onClick={() => {
          void handleOpenPicker();
        }}
        title={t2("canvas.table.attachment.add", "Add attachment")}
        className="flex shrink-0 items-center justify-center bg-[var(--bg-subtle,#f5f5f5)] transition-colors hover:bg-[var(--bg-subtle-hover,#eee)]"
        style={{
          width: chipSize,
          height: chipSize,
          color: "var(--fg-muted,#666)",
        }}
      >
        +
      </button>
    </div>
  );
}
export const TableCellAttachment = reactExports.memo(TableCellAttachmentInner);
function AttachmentChip$1({ attachment, size: size2, onRemove: onRemove2 }) {
  const { t: t2 } = useTranslation();
  const meta2 = useAssetMetadataStore((s2) => s2.assets.get(attachment.assetId));
  const thumbnail = attachmentThumbnailUrl(attachment, meta2, size2);
  const [failedThumbnail, setFailedThumbnail] = reactExports.useState(null);
  const thumb = thumbnail === failedThumbnail ? void 0 : thumbnail;
  const previewThumb = attachmentThumbnailUrl(attachment, meta2, PREVIEW_THUMB_WIDTH) ?? thumb;
  const missing = !meta2;
  const previewable = !missing && !!thumb;
  const canPreviewFullscreen =
    !missing &&
    !!meta2 &&
    (attachment.kind === "image" || attachment.kind === "video" || attachment.kind === "audio");
  const chipRef = reactExports.useRef(null);
  const [hoverPos, setHoverPos] = reactExports.useState(null);
  const [lightboxOpen, setLightboxOpen] = reactExports.useState(false);
  const removeBtnSize = Math.max(10, Math.min(12, Math.round(size2 * 0.28)));
  const removeIconSize = Math.max(6, Math.round(removeBtnSize * 0.55));
  const removeBtnOverhang = -Math.round(removeBtnSize / 2) + Math.round(removeBtnSize / 4);
  const showHover = () => {
    const el = chipRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setHoverPos({
      x: rect.left + rect.width / 2,
      bottom: rect.bottom,
      top: rect.top,
    });
  };
  const hideHover = () => setHoverPos(null);
  const hideHoverSync = () => reactDomExports.flushSync(hideHover);
  const canDrag = !missing;
  const handlePointerDown = () => {
    if (!canDrag) return;
    hideHoverSync();
  };
  const handleDragStart = (event) => {
    if (!meta2) {
      event.preventDefault();
      return;
    }
    hideHoverSync();
    const item = {
      path: meta2.path,
      absolutePath: meta2.path,
      name: attachment.name,
      type: attachment.kind,
      assetId: attachment.assetId,
      isDirectory: false,
    };
    event.dataTransfer.setData(RESOURCE_DRAG_MIME, JSON.stringify([item]));
    event.dataTransfer.effectAllowed = "copy";
    const el = chipRef.current;
    if (el) {
      event.dataTransfer.setDragImage(el, el.offsetWidth / 2, el.offsetHeight / 2);
    }
  };
  const handleDoubleClick2 = (event) => {
    if (!canPreviewFullscreen) return;
    event.stopPropagation();
    event.preventDefault();
    hideHoverSync();
    setLightboxOpen(true);
  };
  const closeLightbox = () => setLightboxOpen(false);
  const lightboxItem =
    meta2 &&
    (attachment.kind === "image" || attachment.kind === "video" || attachment.kind === "audio")
      ? lightboxItemFromAssetMeta(attachment.kind, meta2)
      : void 0;
  return (
    <>
      <span
        ref={chipRef}
        className={`group/chip relative inline-flex shrink-0 items-center justify-center ${canDrag ? "cursor-grab active:cursor-grabbing" : ""}`}
        style={{
          width: size2,
          height: size2,
        }}
        draggable={canDrag}
        onPointerDown={handlePointerDown}
        onDragStart={handleDragStart}
        onDragEnd={hideHover}
        onDoubleClick={handleDoubleClick2}
        onMouseEnter={showHover}
        onMouseLeave={hideHover}
      >
        <span
          className="flex h-full w-full items-center justify-center overflow-hidden"
          style={{
            background: thumb || !missing ? "var(--bg-subtle,#fafafa)" : "transparent",
            border: missing
              ? "1px dashed var(--canvas-node-border,#c0c0c0)"
              : thumb
                ? "1px solid var(--canvas-node-border,#e0e0e0)"
                : "none",
          }}
        >
          {thumb ? (
            <img
              src={thumb}
              onError={() => setFailedThumbnail(thumb)}
              alt={attachment.name}
              className="h-full w-full object-contain"
              loading="lazy"
            />
          ) : (
            <FileTypeIcon
              {...classifyFileType({
                filename: attachment.name,
              })}
              size={size2 >= 30 ? 24 : 14}
              accessibleLabel={
                attachment.name.trim() ? attachment.name : t2("canvas.file.untitled", "Untitled")
              }
            />
          )}
        </span>
        <button
          type="button"
          onClick={(e2) => {
            e2.stopPropagation();
            hideHover();
            onRemove2();
          }}
          aria-label={t2("a11y.removeAttachment", "Remove attachment")}
          className="absolute z-10 hidden cursor-pointer items-center justify-center rounded-full bg-black/60 text-white shadow-sm transition-colors group-hover/chip:flex hover:bg-black/80"
          style={{
            width: removeBtnSize,
            height: removeBtnSize,
            top: removeBtnOverhang,
            right: removeBtnOverhang,
          }}
        >
          <CompositedSvg
            width={removeIconSize}
            height={removeIconSize}
            viewBox="0 0 8 8"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M1.5 1.5L6.5 6.5M6.5 1.5L1.5 6.5" />
          </CompositedSvg>
        </button>
      </span>
      {hoverPos &&
        !lightboxOpen &&
        (previewable && previewThumb ? (
          <ChipPreviewCard
            x={hoverPos.x}
            anchorTop={hoverPos.top}
            anchorBottom={hoverPos.bottom}
            name={attachment.name}
            thumbUrl={previewThumb}
          />
        ) : (
          <ChipTooltip x={hoverPos.x} anchorTop={hoverPos.top} anchorBottom={hoverPos.bottom}>
            {missing ? `${attachment.name} (missing)` : attachment.name}
          </ChipTooltip>
        ))}
      {lightboxOpen && lightboxItem && attachment.kind === "image" && (
        <ImageLightbox$2
          items={[lightboxItem]}
          index={0}
          onIndexChange={() => {}}
          alt={attachment.name}
          onClose={closeLightbox}
        />
      )}
      {lightboxOpen && lightboxItem && attachment.kind === "video" && (
        <VideoLightbox item={lightboxItem} onClose={closeLightbox} />
      )}
      {lightboxOpen && lightboxItem && attachment.kind === "audio" && (
        <AudioLightbox$1
          item={lightboxItem}
          name={attachment.name}
          lyrics={getDisplayLyrics(meta2)}
          onClose={closeLightbox}
        />
      )}
    </>
  );
}
function ChipPreviewCard({ x: x2, anchorTop, anchorBottom, name: name2, thumbUrl }) {
  const ref = reactExports.useRef(null);
  const [adjusted, setAdjusted] = reactExports.useState(null);
  reactExports.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const margin = 8;
    let left = x2 - rect.width / 2;
    if (left < margin) left = margin;
    if (left + rect.width > window.innerWidth - margin) {
      left = window.innerWidth - rect.width - margin;
    }
    let top2 = anchorBottom + 6;
    if (top2 + rect.height > window.innerHeight - margin) {
      const above = anchorTop - rect.height - 6;
      top2 = above >= margin ? above : Math.max(margin, window.innerHeight - rect.height - margin);
    }
    setAdjusted({
      left,
      top: top2,
    });
  }, [x2, anchorTop, anchorBottom]);
  const [host] = reactExports.useState(() =>
    typeof document !== "undefined" ? document.body : null,
  );
  if (!host) return null;
  return reactDomExports.createPortal(
    <div
      ref={ref}
      role="tooltip"
      className="pointer-events-none fixed z-[10002] flex flex-col gap-2 p-3"
      style={{
        left: adjusted?.left ?? -9999,
        top: adjusted?.top ?? -9999,
        width: PREVIEW_THUMB_WIDTH + 24,
        // thumb width + horizontal padding
        background: "var(--canvas-controls-bg, #ffffff)",
        color: "var(--canvas-controls-text, #262626)",
        border: "0.5px solid var(--canvas-controls-border, rgba(0,0,0,0.06))",
        boxShadow: "var(--canvas-shadow-dropdown)",
      }}
    >
      <div className="truncate text-[13px] font-medium leading-tight">{name2}</div>
      <div
        className="flex w-full items-center justify-center overflow-hidden"
        style={{
          background: "var(--bg-subtle,#fafafa)",
        }}
      >
        <img
          src={thumbUrl}
          alt={name2}
          loading="lazy"
          className="block max-h-[200px] w-full object-contain"
        />
      </div>
    </div>,
    host,
  );
}
function ChipTooltip({ x: x2, anchorTop, anchorBottom, children: children2 }) {
  const ref = reactExports.useRef(null);
  const [adjusted, setAdjusted] = reactExports.useState(null);
  reactExports.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const margin = 4;
    let left = x2 - rect.width / 2;
    if (left < margin) left = margin;
    if (left + rect.width > window.innerWidth - margin) {
      left = window.innerWidth - rect.width - margin;
    }
    let top2 = anchorTop - rect.height - 6;
    if (top2 < margin) top2 = anchorBottom + 6;
    setAdjusted({
      left,
      top: top2,
    });
  }, [x2, anchorTop, anchorBottom]);
  const [host] = reactExports.useState(() =>
    typeof document !== "undefined" ? document.body : null,
  );
  if (!host) return null;
  return reactDomExports.createPortal(
    <div
      ref={ref}
      role="tooltip"
      className="pointer-events-none fixed z-[10002] max-w-[260px] truncate px-2 py-1 text-[11px] shadow-md"
      style={{
        left: adjusted?.left ?? -9999,
        top: adjusted?.top ?? -9999,
        background: "var(--canvas-tooltip-bg, rgba(20,20,20,0.92))",
        color: "var(--canvas-tooltip-fg, #fff)",
      }}
    >
      {children2}
    </div>,
    host,
  );
}
function TableCellNumberInner({ value, onChange }) {
  const [editing, setEditing] = reactExports.useState(false);
  const [draft, setDraft] = reactExports.useState(value == null ? "" : String(value));
  const textareaRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (!editing) setDraft(value == null ? "" : String(value));
  }, [value, editing]);
  reactExports.useEffect(() => {
    if (editing) {
      requestAnimationFrame(() => {
        textareaRef.current?.focus();
        textareaRef.current?.select();
      });
    }
  }, [editing]);
  const commit = reactExports.useCallback(() => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed === "") {
      if (value !== null) onChange(null);
      return;
    }
    const n2 = Number(trimmed);
    if (Number.isNaN(n2)) {
      setDraft(value == null ? "" : String(value));
      return;
    }
    if (n2 !== value) onChange(n2);
  }, [draft, value, onChange]);
  const cancel = reactExports.useCallback(() => {
    setDraft(value == null ? "" : String(value));
    setEditing(false);
  }, [value]);
  if (editing) {
    return (
      <textarea
        ref={textareaRef}
        rows={1}
        inputMode="decimal"
        value={draft}
        onChange={(e2) => setDraft(e2.target.value)}
        onBlur={commit}
        onKeyDown={(e2) => {
          if (e2.key === "Enter") {
            if (!e2.nativeEvent.isComposing) {
              e2.preventDefault();
              commit();
            }
          } else if (e2.key === "Escape") {
            e2.preventDefault();
            cancel();
          }
          e2.stopPropagation();
        }}
        className="absolute left-0 top-0 z-20 block w-full resize-none overflow-hidden px-2 py-1.5 text-left text-[13px] leading-snug tabular-nums shadow-lg outline-none"
        style={{
          color: "var(--fg-default, #141414)",
          boxSizing: "border-box",
          background: "var(--canvas-node-bg, #ffffff)",
          border: "none",
          outline: "1px solid var(--canvas-node-border-selected, #3370ff)",
          height: "100%",
          fontFamily: "inherit",
        }}
      />
    );
  }
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: editing toggles via parent table; keyboard nav is handled at the row level
    // biome-ignore lint/a11y/useKeyWithClickEvents: cell enters edit mode via its own onClick; keyboard nav is handled at the row level
    <div
      className="h-full w-full cursor-text truncate px-2 py-1.5 text-left text-[13px] leading-snug tabular-nums"
      style={{
        color: "var(--fg-default, #141414)",
      }}
      onClick={() => setEditing(true)}
    >
      {value == null ? <span className="opacity-30">—</span> : String(value)}
    </div>
  );
}
export const TableCellNumber = reactExports.memo(TableCellNumberInner);
const MAX_EDIT_HEIGHT = 150;
function TableCellTextInner({ value, onChange, rowHeightPx, maxLines }) {
  const [editing, setEditing] = reactExports.useState(false);
  const [draft, setDraft] = reactExports.useState(value);
  const textareaRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);
  reactExports.useEffect(() => {
    if (editing) {
      requestAnimationFrame(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.focus();
        const end2 = el.value.length;
        el.setSelectionRange(end2, end2);
      });
    }
  }, [editing]);
  reactExports.useLayoutEffect(() => {
    if (!editing) return;
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const next2 = Math.max(rowHeightPx, Math.min(el.scrollHeight, MAX_EDIT_HEIGHT));
    el.style.height = `${next2}px`;
  }, [draft, editing, rowHeightPx]);
  const commit = reactExports.useCallback(() => {
    setEditing(false);
    if (draft !== value) onChange(draft);
  }, [draft, value, onChange]);
  const cancel = reactExports.useCallback(() => {
    setDraft(value);
    setEditing(false);
  }, [value]);
  if (editing) {
    return (
      <textarea
        ref={textareaRef}
        value={draft}
        onChange={(e2) => setDraft(e2.target.value)}
        onBlur={commit}
        onKeyDown={(e2) => {
          if (e2.key === "Enter") {
            if (!e2.shiftKey && !e2.nativeEvent.isComposing) {
              e2.preventDefault();
              commit();
            }
          } else if (e2.key === "Escape") {
            e2.preventDefault();
            cancel();
          }
          e2.stopPropagation();
        }}
        className="absolute left-0 top-0 z-20 block w-full resize-none overflow-y-auto px-2 py-1.5 text-[13px] leading-snug shadow-lg outline-none"
        style={{
          color: "var(--fg-default, #141414)",
          fontFamily: "inherit",
          boxSizing: "border-box",
          background: "var(--canvas-node-bg, #ffffff)",
          border: "none",
          outline: "1px solid var(--canvas-node-border-selected, #3370ff)",
          minHeight: rowHeightPx,
          maxHeight: MAX_EDIT_HEIGHT,
        }}
      />
    );
  }
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: editing toggles via parent table; keyboard nav is handled at the row level
    // biome-ignore lint/a11y/useKeyWithClickEvents: cell enters edit mode via its own onClick; keyboard nav is handled at the row level
    <div
      className="flex h-full w-full cursor-text items-start px-2 py-1.5 text-[13px] leading-snug"
      style={{
        color: "var(--fg-default, #141414)",
      }}
      onClick={() => setEditing(true)}
      title={value}
    >
      <span
        className="block w-full overflow-hidden break-words"
        style={{
          display: "-webkit-box",
          WebkitBoxOrient: "vertical",
          WebkitLineClamp: maxLines,
          whiteSpace: maxLines === 1 ? "normal" : "pre-wrap",
        }}
      >
        {value || <span className="opacity-30">—</span>}
      </span>
    </div>
  );
}
export const TableCellText = reactExports.memo(TableCellTextInner);
export function PlusIcon$1({ size: size2 = 12 } = {}) {
  return (
    <CompositedSvg
      width={size2}
      height={size2}
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path d="M6 1.5V10.5M1.5 6H10.5" strokeLinecap="round" />
    </CompositedSvg>
  );
}
export function DragHandleIcon() {
  return (
    <CompositedSvg width="6" height="12" viewBox="0 0 6 12" fill="currentColor" aria-hidden="true">
      <circle cx="1.5" cy="2" r="1" />
      <circle cx="4.5" cy="2" r="1" />
      <circle cx="1.5" cy="6" r="1" />
      <circle cx="4.5" cy="6" r="1" />
      <circle cx="1.5" cy="10" r="1" />
      <circle cx="4.5" cy="10" r="1" />
    </CompositedSvg>
  );
}
export function PaperclipIcon({ size: size2 = 12 } = {}) {
  return (
    <CompositedSvg
      className="shrink-0"
      width={size2}
      height={size2}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="M12.304 7.315a1 1 0 0 1 1.414 1.414L8.13 14.317a1.485 1.485 0 0 0 0 2.1l.01.011a1.5 1.5 0 0 0 2.117-.005l7.43-7.43a3.5 3.5 0 0 0 0-4.95l-.036-.037a3.5 3.5 0 0 0-4.95 0l-7.778 7.777a5.521 5.521 0 0 0 7.808 7.809l7.07-7.07a1 1 0 0 1 1.415 1.414l-7.07 7.07A7.521 7.521 0 0 1 3.509 10.37l7.778-7.778a5.5 5.5 0 0 1 7.778 0l.037.037a5.5 5.5 0 0 1 0 7.778l-7.43 7.43a3.5 3.5 0 0 1-4.939.012l-.006-.006-.012-.012a3.485 3.485 0 0 1 0-4.928l5.589-5.588Z"
      />
    </CompositedSvg>
  );
}
export function TrashIcon({ size: size2 = 12 } = {}) {
  return (
    <CompositedSvg
      width={size2}
      height={size2}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path d="M2.5 4h11" strokeLinecap="round" />
      <path d="M6 4V2.5h4V4" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M3.5 4l.7 9a1 1 0 001 .9h5.6a1 1 0 001-.9l.7-9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </CompositedSvg>
  );
}
const OPS_REQUIRING_VALUE = new Set([
  "equals",
  "notEquals",
  "contains",
  "notContains",
  "gt",
  "gte",
  "lt",
  "lte",
]);
const ROW_HEIGHT_LINES = {
  low: 1,
  medium: 2,
  tall: 4,
  extraTall: 6,
};
const ROW_HEIGHT_PRESETS = {
  low: 32,
  medium: 50,
  tall: 86,
  extraTall: 122,
};
function operatorsForFieldType(type2) {
  if (type2 === "text")
    return ["equals", "notEquals", "contains", "notContains", "empty", "notEmpty"];
  if (type2 === "number")
    return ["equals", "notEquals", "gt", "gte", "lt", "lte", "empty", "notEmpty"];
  return ["empty", "notEmpty"];
}
function defaultOpForFieldType(type2) {
  if (type2 === "attachment") return "empty";
  return "equals";
}
function removeColumn$1(doc2, columnId) {
  const columns = doc2.columns.filter((c3) => c3.id !== columnId);
  const rows = doc2.rows.map((r2) => {
    if (!(columnId in r2.cells)) return r2;
    const { [columnId]: _omit, ...rest } = r2.cells;
    return {
      ...r2,
      cells: rest,
    };
  });
  const filter2 = pruneFilterColumn(doc2.filter, columnId);
  return {
    ...doc2,
    columns,
    rows,
    filter: filter2,
  };
}
export function renameColumn(doc2, columnId, title) {
  const trimmed = title.trim() || "Untitled";
  return {
    ...doc2,
    columns: doc2.columns.map((c3) =>
      c3.id === columnId
        ? {
            ...c3,
            title: trimmed,
          }
        : c3,
    ),
  };
}
function toggleColumnVisibility(doc2, columnId, visible) {
  return {
    ...doc2,
    columns: doc2.columns.map((c3) =>
      c3.id === columnId
        ? {
            ...c3,
            visible: !(c3.visible ?? true),
          }
        : c3,
    ),
  };
}
export function resizeColumn(doc2, columnId, width) {
  const clamped = Math.max(100, Math.round(width));
  return {
    ...doc2,
    columns: doc2.columns.map((c3) =>
      c3.id === columnId
        ? {
            ...c3,
            width: clamped,
          }
        : c3,
    ),
  };
}
function moveItem(list2, fromId, toId, position2) {
  if (fromId === toId) return list2;
  const fromIdx = list2.findIndex((c3) => c3.id === fromId);
  const toIdx = list2.findIndex((c3) => c3.id === toId);
  if (fromIdx < 0 || toIdx < 0) return list2;
  const next2 = list2.slice();
  const [moved] = next2.splice(fromIdx, 1);
  if (!moved) return list2;
  const baseIdx = next2.findIndex((c3) => c3.id === toId);
  if (baseIdx < 0) return list2;
  const insertAt = position2 === "after" ? baseIdx + 1 : baseIdx;
  if (insertAt === fromIdx) return list2;
  next2.splice(insertAt, 0, moved);
  return next2;
}
function moveColumn(doc2, fromId, toId, position2 = "before") {
  const columns = moveItem(doc2.columns, fromId, toId, position2);
  if (columns === doc2.columns) return doc2;
  return {
    ...doc2,
    columns,
  };
}
export function removeRow$1(doc2, rowId) {
  return {
    ...doc2,
    rows: doc2.rows.filter((r2) => r2.id !== rowId),
  };
}
export function moveRow(doc2, fromId, toId, position2 = "before") {
  const rows = moveItem(doc2.rows, fromId, toId, position2);
  if (rows === doc2.rows) return doc2;
  return {
    ...doc2,
    rows,
  };
}
export function appendAttachments(doc2, rowId, columnId, add2) {
  if (add2.length === 0) return doc2;
  return {
    ...doc2,
    rows: doc2.rows.map((r2) => {
      if (r2.id !== rowId) return r2;
      const existing = r2.cells[columnId];
      const list2 = Array.isArray(existing) ? existing : [];
      const seen2 = new Set(list2.map((a2) => a2.assetId));
      const merged = [...list2, ...add2.filter((a2) => !seen2.has(a2.assetId))];
      return {
        ...r2,
        cells: {
          ...r2.cells,
          [columnId]: merged,
        },
      };
    }),
  };
}
export function removeAttachment(doc2, rowId, columnId, assetId) {
  return {
    ...doc2,
    rows: doc2.rows.map((r2) => {
      if (r2.id !== rowId) return r2;
      const cell = r2.cells[columnId];
      if (!Array.isArray(cell)) return r2;
      const filtered = cell.filter((a2) => a2.assetId !== assetId);
      return {
        ...r2,
        cells: {
          ...r2.cells,
          [columnId]: filtered,
        },
      };
    }),
  };
}
function setFilterMatch(doc2, match2) {
  if (!doc2.filter) return doc2;
  if (doc2.filter.match === match2) return doc2;
  return {
    ...doc2,
    filter: {
      ...doc2.filter,
      match: match2,
    },
  };
}
function addFilterCondition(doc2, condition) {
  const existing = doc2.filter?.conditions ?? [];
  return {
    ...doc2,
    filter: {
      match: doc2.filter?.match ?? "any",
      conditions: [...existing, condition],
    },
  };
}
function updateFilterCondition(doc2, conditionId, patch2) {
  if (!doc2.filter) return doc2;
  const conditions = doc2.filter.conditions.map((c3) =>
    c3.id === conditionId
      ? {
          ...c3,
          ...patch2,
        }
      : c3,
  );
  return {
    ...doc2,
    filter: {
      ...doc2.filter,
      conditions,
    },
  };
}
function removeFilterCondition(doc2, conditionId) {
  if (!doc2.filter) return doc2;
  const conditions = doc2.filter.conditions.filter((c3) => c3.id !== conditionId);
  if (conditions.length === 0)
    return {
      ...doc2,
      filter: void 0,
    };
  return {
    ...doc2,
    filter: {
      ...doc2.filter,
      conditions,
    },
  };
}
function pruneFilterColumn(filter2, columnId) {
  if (!filter2) return void 0;
  const conditions = filter2.conditions.filter((c3) => c3.columnId !== columnId);
  if (conditions.length === 0) return void 0;
  if (conditions.length === filter2.conditions.length) return filter2;
  return {
    ...filter2,
    conditions,
  };
}
function setRowHeight(doc2, rowHeight) {
  if (getRowHeight(doc2) === rowHeight) return doc2;
  return {
    ...doc2,
    rowHeight,
  };
}
function getRowHeight(doc2) {
  return doc2.rowHeight ?? DEFAULT_ROW_HEIGHT;
}
export function getRowHeightPx(doc2) {
  return ROW_HEIGHT_PRESETS[getRowHeight(doc2)];
}
export function getRowHeightLines(doc2) {
  return ROW_HEIGHT_LINES[getRowHeight(doc2)];
}
const ROW_HEIGHT_VERTICAL_PADDING = 12;
const ROW_HEIGHT_LINE_PX = 18;
export function getRowEffectiveHeightPx(doc2, row) {
  if (row.height !== void 0) return row.height;
  return getRowHeightPx(doc2);
}
export function linesForHeightPx(heightPx) {
  const usable = Math.max(0, heightPx - ROW_HEIGHT_VERTICAL_PADDING);
  return Math.max(1, Math.floor(usable / ROW_HEIGHT_LINE_PX));
}
export function setRowHeightOverride(doc2, rowId, heightPx) {
  let mutated = false;
  const rows = doc2.rows.map((r2) => {
    if (r2.id !== rowId) return r2;
    if (heightPx === null) {
      if (r2.height === void 0) return r2;
      mutated = true;
      const { height: _drop, ...rest } = r2;
      return rest;
    }
    const next2 = clampRowHeightPx(heightPx);
    if (r2.height === next2) return r2;
    mutated = true;
    return {
      ...r2,
      height: next2,
    };
  });
  if (!mutated) return doc2;
  return {
    ...doc2,
    rows,
  };
}
export function applyFilter(doc2) {
  const f2 = doc2.filter;
  if (!f2 || f2.conditions.length === 0) return doc2.rows;
  const predicates = f2.conditions.map((cond) => {
    const column = doc2.columns.find((c3) => c3.id === cond.columnId);
    if (!column) return () => true;
    if (isConditionInactive(cond)) return () => true;
    return (row) => matchesCondition(row.cells[cond.columnId], column.type, cond.op, cond.value);
  });
  if (f2.match === "all") {
    return doc2.rows.filter((row) => predicates.every((p3) => p3(row)));
  }
  return doc2.rows.filter((row) => predicates.some((p3) => p3(row)));
}
function isConditionInactive(cond) {
  if (cond.op === "empty" || cond.op === "notEmpty") return false;
  if (cond.value === void 0) return true;
  if (typeof cond.value === "string" && cond.value.length === 0) return true;
  return false;
}
function matchesCondition(cell, fieldType, op, value) {
  if (op === "empty") return isEmptyCell(cell);
  if (op === "notEmpty") return !isEmptyCell(cell);
  if (fieldType === "text") {
    if (typeof cell !== "string") return false;
    const target = String(value ?? "");
    switch (op) {
      case "contains":
        return cell.toLowerCase().includes(target.toLowerCase());
      case "notContains":
        return !cell.toLowerCase().includes(target.toLowerCase());
      case "equals":
        return cell === target;
      case "notEquals":
        return cell !== target;
      default:
        return false;
    }
  }
  if (fieldType === "number") {
    const n2 = typeof cell === "number" ? cell : Number.NaN;
    if (Number.isNaN(n2)) return false;
    const t2 = typeof value === "number" ? value : Number(value);
    if (Number.isNaN(t2)) return false;
    switch (op) {
      case "equals":
        return n2 === t2;
      case "notEquals":
        return n2 !== t2;
      case "gt":
        return n2 > t2;
      case "lt":
        return n2 < t2;
      case "gte":
        return n2 >= t2;
      case "lte":
        return n2 <= t2;
      default:
        return false;
    }
  }
  return false;
}
function isEmptyCell(cell) {
  if (cell == null) return true;
  if (typeof cell === "string") return cell.length === 0;
  if (Array.isArray(cell)) return cell.length === 0;
  return false;
}
export function visibleColumns(doc2) {
  return doc2.columns.filter((c3) => c3.visible !== false);
}
function FieldConfigPanelInner({ history: history2, onClose, align = "right" }) {
  const { t: t2 } = useTranslation();
  const { doc: doc2, apply: apply2 } = history2;
  const panelRef = reactExports.useRef(null);
  const [showAddColumn, setShowAddColumn] = reactExports.useState(false);
  reactExports.useEffect(() => {
    if (showAddColumn) return;
    const handler = (e2) => {
      const target = e2.target;
      if (!target) return;
      if (panelRef.current?.contains(target)) return;
      if (target.closest("[data-field-row-menu]")) return;
      onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose, showAddColumn]);
  const handleToggleVisibility = (columnId) => {
    apply2((prev) => toggleColumnVisibility(prev, columnId));
  };
  const handleRename = (columnId, title) => {
    apply2((prev) => renameColumn(prev, columnId, title));
  };
  const handleDelete2 = (columnId) => {
    apply2((prev) => removeColumn$1(prev, columnId));
  };
  const handleMoveColumn = reactExports.useCallback(
    (fromId, toId, position2) => {
      apply2((prev) => moveColumn(prev, fromId, toId, position2));
    },
    [apply2],
  );
  const handleCommitColumn = reactExports.useCallback(
    ({ title, type: type2 }) => {
      apply2((prev) =>
        addColumn$1(prev, {
          title,
          type: type2,
        }),
      );
      setShowAddColumn(false);
    },
    [apply2],
  );
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: popover container; keyboard handled by inner controls
    <div
      ref={panelRef}
      className={`absolute ${align === "left" ? "left-0" : "right-0"} top-full mt-1 z-20 flex w-[320px] flex-col rounded-lg overflow-hidden shadow-xl`}
      style={{
        background: "var(--canvas-node-bg, #fff)",
        border: "1px solid var(--canvas-node-border, #e0e0e0)",
        animation: "context-menu-in 0.12s ease-out",
      }}
      onKeyDown={(e2) => e2.stopPropagation()}
    >
      <div
        className="flex shrink-0 items-center justify-between px-3 py-2.5"
        style={{
          borderBottom: "1px solid var(--canvas-node-border, #e0e0e0)",
        }}
      >
        <span
          className="text-[12px] font-medium"
          style={{
            color: "var(--fg-default,#141414)",
          }}
        >
          {t2("canvas.table.fieldConfig", "Field configuration")}
        </span>
      </div>
      <div className="flex max-h-[360px] flex-col gap-0.5 overflow-y-auto p-1">
        {doc2.columns.length === 0 ? (
          <div
            className="px-3 py-4 text-center text-[12px]"
            style={{
              color: "var(--fg-muted,#999)",
            }}
          >
            {t2("canvas.table.noColumns", "No columns")}
          </div>
        ) : (
          doc2.columns.map((column) => (
            <FieldRow
              key={column.id}
              column={column}
              onToggle={() => handleToggleVisibility(column.id)}
              onRename={(title) => handleRename(column.id, title)}
              onDelete={() => handleDelete2(column.id)}
              onMove={handleMoveColumn}
            />
          ))
        )}
      </div>
      <button
        type="button"
        onClick={() => setShowAddColumn(true)}
        className="flex shrink-0 items-center gap-2 px-3 py-2.5 text-left text-[12px] transition-colors hover:bg-[var(--canvas-controls-hover,#0000000d)]"
        style={{
          borderTop: "1px solid var(--canvas-node-border, #e0e0e0)",
          color: "var(--fg-muted,#525252)",
        }}
      >
        <PlusIcon$1 />
        <span>{t2("canvas.table.addField", "Add field")}</span>
      </button>
      {showAddColumn && (
        <AddColumnDialog onCommit={handleCommitColumn} onClose={() => setShowAddColumn(false)} />
      )}
    </div>
  );
}
export const FieldConfigPanel = reactExports.memo(FieldConfigPanelInner);
const COLUMN_DRAG_MIME = "application/x-table-column-id";
function FieldRow({ column, onToggle, onRename, onDelete, onMove }) {
  const { t: t2 } = useTranslation();
  const visible = column.visible !== false;
  const [editing, setEditing] = reactExports.useState(false);
  const [menuOpen, setMenuOpen] = reactExports.useState(false);
  const [dropEdge, setDropEdge] = reactExports.useState(null);
  const inputRef = reactExports.useRef(null);
  const moreButtonRef = reactExports.useRef(null);
  const rowRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (editing) {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [editing]);
  const commitEdit = () => {
    const next2 = inputRef.current?.value ?? column.title;
    if (next2.trim() !== column.title) onRename(next2);
    setEditing(false);
  };
  const handleDragStart = (e2) => {
    e2.dataTransfer.setData(COLUMN_DRAG_MIME, column.id);
    e2.dataTransfer.effectAllowed = "move";
    if (rowRef.current) {
      e2.dataTransfer.setDragImage(rowRef.current, 12, rowRef.current.offsetHeight / 2);
    }
  };
  const handleDragOver = (e2) => {
    if (!e2.dataTransfer.types.includes(COLUMN_DRAG_MIME)) return;
    e2.preventDefault();
    e2.dataTransfer.dropEffect = "move";
    const rect = e2.currentTarget.getBoundingClientRect();
    const isAfter2 = e2.clientY > rect.top + rect.height / 2;
    setDropEdge(isAfter2 ? "after" : "before");
  };
  const handleDragLeave = (e2) => {
    if (!e2.currentTarget.contains(e2.relatedTarget)) {
      setDropEdge(null);
    }
  };
  const handleDrop2 = (e2) => {
    const fromId = e2.dataTransfer.getData(COLUMN_DRAG_MIME);
    const edge = dropEdge;
    setDropEdge(null);
    if (!fromId || fromId === column.id || !edge) return;
    e2.preventDefault();
    onMove(fromId, column.id, edge);
  };
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: native drag-over/drop target for HTML5 drag-and-drop; row click stays on the inner content.
    <div
      ref={rowRef}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop2}
      className="group relative flex items-center gap-1.5 rounded-md px-1 py-1.5 transition-colors hover:bg-[var(--canvas-controls-hover,#0000000d)]"
    >
      {dropEdge === "before" && (
        <span
          aria-hidden={true}
          className="pointer-events-none absolute left-1 right-1 top-0 h-[2px] rounded-full"
          style={{
            background: "var(--canvas-accent, #3b82f6)",
          }}
        />
      )}
      {dropEdge === "after" && (
        <span
          aria-hidden={true}
          className="pointer-events-none absolute bottom-0 left-1 right-1 h-[2px] rounded-full"
          style={{
            background: "var(--canvas-accent, #3b82f6)",
          }}
        />
      )}
      <span
        draggable={true}
        onDragStart={handleDragStart}
        onDragEnd={() => setDropEdge(null)}
        className="flex h-5 w-3 shrink-0 cursor-grab items-center justify-center opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
        style={{
          color: "var(--fg-muted,#999)",
        }}
        title={t2("canvas.table.dragField", "Drag to reorder")}
      >
        <DragHandleIcon />
      </span>
      <span
        className="flex h-5 w-5 shrink-0 items-center justify-center"
        style={{
          color: "var(--fg-muted,#525252)",
        }}
      >
        <FieldTypeIcon$1 type={column.type} />
      </span>
      {editing ? (
        <input
          ref={inputRef}
          type="text"
          defaultValue={column.title}
          onBlur={commitEdit}
          onKeyDown={(e2) => {
            e2.stopPropagation();
            if (e2.key === "Enter") {
              e2.preventDefault();
              commitEdit();
            } else if (e2.key === "Escape") {
              e2.preventDefault();
              setEditing(false);
            }
          }}
          className="flex-1 min-w-0 bg-[var(--bg-subtle,#fafafa)] px-1 text-[12px] outline-none"
          style={{
            color: "var(--fg-default,#141414)",
          }}
        />
      ) : (
        // biome-ignore lint/a11y/noStaticElementInteractions: row-level edit shortcut, primary action via menu
        <span
          onDoubleClick={() => setEditing(true)}
          className="flex-1 min-w-0 truncate text-[12px]"
          style={{
            color: "var(--fg-default,#141414)",
          }}
          title={column.title}
        >
          {column.title}
        </span>
      )}
      <button
        type="button"
        onClick={onToggle}
        title={
          visible ? t2("canvas.table.hideField", "Hide") : t2("canvas.table.showField", "Show")
        }
        className="flex h-6 w-6 shrink-0 items-center justify-center transition-colors hover:bg-[var(--canvas-controls-hover,#0000000d)]"
        style={{
          color: "var(--fg-muted,#666)",
        }}
      >
        {visible ? <EyeIcon /> : <EyeOffIcon />}
      </button>
      <div className="shrink-0">
        <button
          ref={moreButtonRef}
          type="button"
          onClick={() => setMenuOpen((v2) => !v2)}
          title={t2("canvas.table.fieldMore", "More")}
          className="flex h-6 w-6 items-center justify-center transition-colors hover:bg-[var(--canvas-controls-hover,#0000000d)]"
          style={{
            color: "var(--fg-muted,#666)",
            background: menuOpen ? "var(--bg-subtle,#eee)" : void 0,
          }}
        >
          <MoreVerticalIcon$1 size={14} />
        </button>
        {menuOpen && (
          <FieldRowMenu
            anchorRef={moreButtonRef}
            onClose={() => setMenuOpen(false)}
            onEdit={() => {
              setMenuOpen(false);
              setEditing(true);
            }}
            onDelete={() => {
              setMenuOpen(false);
              onDelete();
            }}
          />
        )}
      </div>
    </div>
  );
}
const MENU_WIDTH = 140;
const MENU_GAP = 4;
function FieldRowMenu({ anchorRef, onClose, onEdit, onDelete }) {
  const { t: t2 } = useTranslation();
  const menuRef = reactExports.useRef(null);
  const [pos, setPos] = reactExports.useState(null);
  reactExports.useLayoutEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    let left = rect.right + MENU_GAP;
    if (left + MENU_WIDTH > window.innerWidth - 8) {
      left = rect.left - MENU_WIDTH - MENU_GAP;
    }
    if (left < 8) left = 8;
    setPos({
      top: rect.top,
      left,
    });
  }, [anchorRef]);
  reactExports.useEffect(() => {
    const handler = (e2) => {
      const target = e2.target;
      if (menuRef.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return;
      onClose();
    };
    const id2 = window.setTimeout(() => {
      document.addEventListener("mousedown", handler);
    }, 0);
    return () => {
      window.clearTimeout(id2);
      document.removeEventListener("mousedown", handler);
    };
  }, [onClose, anchorRef.current?.contains]);
  if (!pos) return null;
  return reactDomExports.createPortal(
    <div
      ref={menuRef}
      data-field-row-menu="true"
      className="flex w-[140px] flex-col gap-0.5 rounded-lg p-1 shadow-xl overflow-hidden"
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        width: MENU_WIDTH,
        // Above the fullscreen modal (z-[9999] in table-fullscreen.tsx).
        zIndex: 1e4,
        background: "var(--canvas-node-bg, #fff)",
        border: "1px solid var(--canvas-node-border, #e0e0e0)",
        animation: "context-menu-in 0.12s ease-out",
      }}
    >
      <MenuItem$2
        icon={<EditIcon />}
        label={t2("canvas.table.field.edit", "Edit")}
        onClick={onEdit}
      />
      <MenuItem$2
        icon={<TrashIcon />}
        label={t2("canvas.table.field.delete", "Delete")}
        onClick={onDelete}
      />
    </div>,
    document.body,
  );
}
function MenuItem$2({ icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-8 items-center gap-2 rounded-md px-3 text-left text-[12px] transition-colors hover:bg-[var(--canvas-controls-hover,#0000000d)]"
      style={{
        color: "var(--fg-default,#141414)",
      }}
    >
      <span
        className="flex h-4 w-4 shrink-0 items-center justify-center"
        style={{
          color: "var(--fg-muted,#525252)",
        }}
      >
        {icon}
      </span>
      <span className="truncate">{label}</span>
    </button>
  );
}
function FieldTypeIcon$1({ type: type2 }) {
  if (type2 === "number") {
    return (
      <CompositedSvg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          fill="currentColor"
          d="M8.774 2.14a1 1 0 0 1 .85 1.129L9.242 6h6.98l.423-3.01a1 1 0 1 1 1.98.279L18.242 6H22a1 1 0 1 1 0 2h-4.04l-.984 7H20a1 1 0 1 1 0 2h-3.305l-.575 4.093a1 1 0 1 1-1.98-.278L14.674 17h-6.98l-.575 4.093a1 1 0 1 1-1.98-.278L5.674 17H2a1 1 0 1 1 0-2h3.956l.984-7H4a1 1 0 1 1 0-2h3.221l.423-3.01a1 1 0 0 1 1.13-.85ZM14.956 15l.984-7H8.96l-.984 7h6.98Z"
        />
      </CompositedSvg>
    );
  }
  if (type2 === "attachment") {
    return (
      <CompositedSvg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          fill="currentColor"
          d="M12.304 7.315a1 1 0 0 1 1.414 1.414L8.13 14.317a1.485 1.485 0 0 0 0 2.1l.01.011a1.5 1.5 0 0 0 2.117-.005l7.43-7.43a3.5 3.5 0 0 0 0-4.95l-.036-.037a3.5 3.5 0 0 0-4.95 0l-7.778 7.777a5.521 5.521 0 0 0 7.808 7.809l7.07-7.07a1 1 0 0 1 1.415 1.414l-7.07 7.07A7.521 7.521 0 0 1 3.509 10.37l7.778-7.778a5.5 5.5 0 0 1 7.778 0l.037.037a5.5 5.5 0 0 1 0 7.778l-7.43 7.43a3.5 3.5 0 0 1-4.939.012l-.006-.006-.012-.012a3.485 3.485 0 0 1 0-4.928l5.589-5.588Z"
        />
      </CompositedSvg>
    );
  }
  return (
    <CompositedSvg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        fill="currentColor"
        d="M8.437 4.898 5.447 13h6.063L8.437 4.898Zm6.025 15.881L12.269 15h-7.56l-2.131 5.78a1 1 0 1 1-1.873-.703L7.02 2.982c.491-1.31 2.344-1.31 2.835 0l6.48 17.095a1 1 0 1 1-1.872.702ZM15.056 5a1 1 0 1 0 0 2H23a1 1 0 1 0 0-2h-7.944Zm1.055 7a1 1 0 0 1 1-1H23a1 1 0 1 1 0 2h-5.89a1 1 0 0 1-1-1Zm3.056 5a1 1 0 1 0 0 2H23a1 1 0 1 0 0-2h-3.833Z"
      />
    </CompositedSvg>
  );
}
function EditIcon() {
  return (
    <CompositedSvg
      width="12"
      height="12"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path
        d="M11 2.5l2.5 2.5L5 13.5H2.5V11L11 2.5z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </CompositedSvg>
  );
}
function EyeIcon() {
  return (
    <CompositedSvg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M11.985 18.5c3.238 0 6.236-2.06 9.015-6.513C18.292 7.55 15.3 5.5 11.985 5.5 8.67 5.5 5.689 7.549 3 11.987c2.76 4.454 5.748 6.513 8.985 6.513ZM1.502 12.89a1.782 1.782 0 0 1 .023-1.838C4.428 6.017 7.915 3.5 11.984 3.5c4.086 0 7.594 2.538 10.523 7.614l.028.048c.296.519.294 1.16-.01 1.675-3.006 5.108-6.52 7.663-10.541 7.663-4.007 0-7.501-2.537-10.482-7.61ZM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm0-2a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"
        fill="currentColor"
      />
    </CompositedSvg>
  );
}
function EyeOffIcon() {
  return (
    <CompositedSvg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M2.032 8.172a1 1 0 0 1 1.388.267C5.263 11.159 8.637 13 12 13c3.364 0 6.737-1.841 8.58-4.561a1 1 0 0 1 1.656 1.122 11.928 11.928 0 0 1-2.002 2.259l2.009 2.008a1 1 0 1 1-1.415 1.415l-2.12-2.122a1.003 1.003 0 0 1-.085-.096c-.745.472-1.54.87-2.368 1.181l.712 2.658a1 1 0 1 1-1.932.517l-.702-2.62A11.64 11.64 0 0 1 12 15c-.71 0-1.42-.068-2.118-.197l-.691 2.578a1 1 0 1 1-1.932-.517l.692-2.582a13.01 13.01 0 0 1-2.607-1.278c-.03.04-.064.08-.101.117L3.12 15.243a1 1 0 1 1-1.414-1.415l2.032-2.032a11.919 11.919 0 0 1-1.974-2.235 1 1 0 0 1 .267-1.389Z"
        fill="currentColor"
      />
    </CompositedSvg>
  );
}
const OP_LABELS = {
  equals: {
    key: "canvas.table.filter.equals",
    defaultLabel: "equals",
  },
  notEquals: {
    key: "canvas.table.filter.notEquals",
    defaultLabel: "not equals",
  },
  contains: {
    key: "canvas.table.filter.contains",
    defaultLabel: "contains",
  },
  notContains: {
    key: "canvas.table.filter.notContains",
    defaultLabel: "not contains",
  },
  gt: {
    key: "canvas.table.filter.gt",
    defaultLabel: "greater than",
  },
  gte: {
    key: "canvas.table.filter.gte",
    defaultLabel: "greater or equal",
  },
  lt: {
    key: "canvas.table.filter.lt",
    defaultLabel: "less than",
  },
  lte: {
    key: "canvas.table.filter.lte",
    defaultLabel: "less or equal",
  },
  empty: {
    key: "canvas.table.filter.empty",
    defaultLabel: "is empty",
  },
  notEmpty: {
    key: "canvas.table.filter.notEmpty",
    defaultLabel: "not empty",
  },
};
const MATCH_LABELS = {
  all: {
    key: "canvas.table.filter.match.all",
    defaultLabel: "all",
  },
  any: {
    key: "canvas.table.filter.match.any",
    defaultLabel: "any",
  },
};
function FilterPanelInner({ history: history2, onClose, align = "right" }) {
  const { t: t2 } = useTranslation();
  const { doc: doc2, apply: apply2 } = history2;
  const panelRef = reactExports.useRef(null);
  const conditions = doc2.filter?.conditions ?? [];
  const match2 = doc2.filter?.match ?? "any";
  const hasColumns = doc2.columns.length > 0;
  reactExports.useEffect(() => {
    const handler = (e2) => {
      const target = e2.target;
      if (!target) return;
      if (panelRef.current?.contains(target)) return;
      const el = target instanceof Element ? target : (target.parentElement ?? null);
      if (el?.closest('[data-slot="select-content"], [data-slot="select-item"]')) return;
      onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);
  const handleColumnChange = (conditionId, columnId) => {
    const column = doc2.columns.find((c3) => c3.id === columnId);
    if (!column) return;
    const ops = operatorsForFieldType(column.type);
    apply2((prev) => {
      const current2 = prev.filter?.conditions.find((c3) => c3.id === conditionId);
      const keepOp =
        current2 && ops.includes(current2.op) ? current2.op : defaultOpForFieldType(column.type);
      const needsValue = OPS_REQUIRING_VALUE.has(keepOp);
      return updateFilterCondition(prev, conditionId, {
        columnId,
        op: keepOp,
        value: needsValue ? current2?.value : void 0,
      });
    });
  };
  const handleOpChange = (conditionId, op) => {
    apply2((prev) => {
      const current2 = prev.filter?.conditions.find((c3) => c3.id === conditionId);
      const needsValue = OPS_REQUIRING_VALUE.has(op);
      return updateFilterCondition(prev, conditionId, {
        op,
        value: needsValue ? current2?.value : void 0,
      });
    });
  };
  const handleValueChange = (conditionId, raw2, columnType) => {
    const value = raw2 === "" ? void 0 : columnType === "number" ? Number(raw2) : raw2;
    apply2((prev) =>
      updateFilterCondition(prev, conditionId, {
        value,
      }),
    );
  };
  const handleRemoveCondition = (conditionId) => {
    apply2((prev) => removeFilterCondition(prev, conditionId));
  };
  const handleAddCondition = () => {
    const firstColumn = doc2.columns[0];
    if (!firstColumn) return;
    apply2((prev) => addFilterCondition(prev, createCondition(firstColumn)));
  };
  const handleMatchChange = (next2) => {
    apply2((prev) => setFilterMatch(prev, next2));
  };
  const showMatchSelector = conditions.length >= 2;
  const matchLabels = reactExports.useMemo(
    () => ({
      all: t2(MATCH_LABELS.all.key, MATCH_LABELS.all.defaultLabel),
      any: t2(MATCH_LABELS.any.key, MATCH_LABELS.any.defaultLabel),
    }),
    [t2],
  );
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: popover container; keyboard handled by inner controls
    <div
      ref={panelRef}
      className={`absolute ${align === "left" ? "left-0" : "right-0"} top-full z-20 mt-1 flex w-[480px] flex-col gap-3 rounded-lg border border-border p-4 text-popover-foreground shadow-md`}
      style={{
        animation: "context-menu-in 0.12s ease-out",
        background: "var(--canvas-controls-bg)",
      }}
      onKeyDown={(e2) => e2.stopPropagation()}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12px] font-medium text-foreground">
          {t2("canvas.table.filter.title", "Set filter conditions")}
        </span>
        {showMatchSelector ? (
          <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <span>{t2("canvas.table.filter.match.prefix", "Match")}</span>
            <Select$2
              value={match2}
              items={matchLabels}
              onValueChange={(v2) => {
                if (v2 != null) handleMatchChange(v2);
              }}
            >
              <SelectTrigger$1 className="h-7 w-[80px] px-2 text-[12px]">
                <SelectValue$1 />
              </SelectTrigger$1>
              <SelectContent$1>
                {["all", "any"].map((m3) => (
                  <SelectItem$1 key={m3} value={m3}>
                    {t2(MATCH_LABELS[m3].key, MATCH_LABELS[m3].defaultLabel)}
                  </SelectItem$1>
                ))}
              </SelectContent$1>
            </Select$2>
            <span>{t2("canvas.table.filter.match.suffix", "condition(s)")}</span>
          </div>
        ) : null}
      </div>
      {conditions.length === 0 ? (
        !hasColumns ? (
          <div className="text-[12px] text-muted-foreground">
            {t2("canvas.table.filter.noColumns", "Add a column first to start filtering.")}
          </div>
        ) : null
      ) : (
        <div className="flex flex-col gap-2">
          {conditions.map((cond) => (
            <ConditionRow
              key={cond.id}
              condition={cond}
              columns={doc2.columns}
              onColumnChange={(columnId) => handleColumnChange(cond.id, columnId)}
              onOpChange={(op) => handleOpChange(cond.id, op)}
              onValueChange={(raw2, columnType) => handleValueChange(cond.id, raw2, columnType)}
              onRemove={() => handleRemoveCondition(cond.id)}
            />
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={handleAddCondition}
        disabled={!hasColumns}
        className="flex h-7 w-fit items-center gap-1 rounded-md text-[12px] text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:text-muted-foreground"
      >
        <PlusIcon$1 />
        <span>{t2("canvas.table.filter.addCondition", "Add condition")}</span>
      </button>
    </div>
  );
}
export const FilterPanel = reactExports.memo(FilterPanelInner);
function ConditionRow({
  condition,
  columns,
  onColumnChange,
  onOpChange,
  onValueChange,
  onRemove: onRemove2,
}) {
  const { t: t2 } = useTranslation();
  const column = columns.find((c3) => c3.id === condition.columnId);
  const availableOps = column ? operatorsForFieldType(column.type) : [];
  const needsValue = OPS_REQUIRING_VALUE.has(condition.op);
  const columnLabels = reactExports.useMemo(() => {
    const map3 = {};
    for (const c3 of columns) map3[c3.id] = c3.title;
    return map3;
  }, [columns]);
  const opLabels = reactExports.useMemo(
    () =>
      Object.fromEntries(
        availableOps.map((op) => [op, t2(OP_LABELS[op].key, OP_LABELS[op].defaultLabel)]),
      ),
    [availableOps, t2],
  );
  return (
    <div className="flex items-center gap-2">
      <Select$2
        value={condition.columnId}
        items={columnLabels}
        onValueChange={(v2) => {
          if (v2 != null) onColumnChange(v2);
        }}
      >
        <SelectTrigger$1 className="h-8 w-[110px] text-[12px]">
          <SelectValue$1 placeholder={t2("canvas.table.filter.field", "Field")} />
        </SelectTrigger$1>
        <SelectContent$1>
          {columns.map((c3) => (
            <SelectItem$1 key={c3.id} value={c3.id}>
              {c3.title}
            </SelectItem$1>
          ))}
        </SelectContent$1>
      </Select$2>
      <Select$2
        value={condition.op}
        items={opLabels}
        onValueChange={(v2) => {
          if (v2 != null) onOpChange(v2);
        }}
      >
        <SelectTrigger$1 className="h-8 w-[120px] text-[12px]">
          <SelectValue$1 />
        </SelectTrigger$1>
        <SelectContent$1>
          {availableOps.map((op) => (
            <SelectItem$1 key={op} value={op}>
              {t2(OP_LABELS[op].key, OP_LABELS[op].defaultLabel)}
            </SelectItem$1>
          ))}
        </SelectContent$1>
      </Select$2>
      {needsValue ? (
        <input
          type={column?.type === "number" ? "number" : "text"}
          value={condition.value === void 0 ? "" : String(condition.value)}
          onChange={(e2) => onValueChange(e2.target.value, column?.type ?? "text")}
          placeholder={t2("canvas.table.filter.valuePlaceholder", "Enter value")}
          className="h-8 flex-1 rounded-md border border-input bg-transparent px-2.5 text-[12px] outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 placeholder:text-muted-foreground"
        />
      ) : (
        <div className="flex-1" />
      )}
      <button
        type="button"
        onClick={onRemove2}
        title={t2("canvas.table.filter.removeCondition", "Remove condition")}
        aria-label={t2("canvas.table.filter.removeCondition", "Remove condition")}
        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-[var(--canvas-controls-hover,#0000000d)] hover:text-foreground"
      >
        <CloseSmallIcon />
      </button>
    </div>
  );
}
function createCondition(column) {
  return {
    id: newConditionId(),
    columnId: column.id,
    op: defaultOpForFieldType(column.type),
    value: void 0,
  };
}
function CloseSmallIcon() {
  return (
    <CompositedSvg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path d="M2.5 2.5L9.5 9.5M9.5 2.5L2.5 9.5" strokeLinecap="round" />
    </CompositedSvg>
  );
}
const ROW_HEIGHT_LABELS = {
  low: {
    key: "canvas.table.rowHeight.low",
    defaultLabel: "Low",
  },
  medium: {
    key: "canvas.table.rowHeight.medium",
    defaultLabel: "Medium",
  },
  tall: {
    key: "canvas.table.rowHeight.tall",
    defaultLabel: "Tall",
  },
  extraTall: {
    key: "canvas.table.rowHeight.extraTall",
    defaultLabel: "Extra tall",
  },
};
function RowHeightPanelInner({ history: history2, onClose, align = "right" }) {
  const { t: t2 } = useTranslation();
  const { doc: doc2, apply: apply2 } = history2;
  const panelRef = reactExports.useRef(null);
  const current2 = getRowHeight(doc2);
  reactExports.useEffect(() => {
    const handler = (e2) => {
      if (panelRef.current && !panelRef.current.contains(e2.target)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);
  const handlePick = (next2) => {
    if (next2 !== current2) apply2((prev) => setRowHeight(prev, next2));
    onClose();
  };
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: popover container; keyboard handled by inner controls
    <div
      ref={panelRef}
      className={`absolute ${align === "left" ? "left-0" : "right-0"} top-full mt-1 z-20 flex w-[180px] flex-col rounded-lg overflow-hidden shadow-xl`}
      style={{
        background: "var(--canvas-node-bg, #fff)",
        border: "1px solid var(--canvas-node-border, #e0e0e0)",
        animation: "context-menu-in 0.12s ease-out",
      }}
      onKeyDown={(e2) => e2.stopPropagation()}
    >
      <div
        className="flex shrink-0 items-center px-3 py-2.5"
        style={{
          borderBottom: "1px solid var(--canvas-node-border, #e0e0e0)",
        }}
      >
        <span
          className="text-[12px] font-medium"
          style={{
            color: "var(--fg-default,#141414)",
          }}
        >
          {t2("canvas.table.rowHeight", "Row height")}
        </span>
      </div>
      <div className="flex flex-col gap-0.5 p-1">
        {ROW_HEIGHT_ORDER.map((opt) => {
          const active2 = opt === current2;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => handlePick(opt)}
              className="flex h-8 items-center justify-between rounded-md px-3 text-[12px] transition-colors hover:bg-[var(--canvas-controls-hover,#0000000d)]"
              style={{
                color: "var(--fg-default,#141414)",
              }}
            >
              <span>{t2(ROW_HEIGHT_LABELS[opt].key, ROW_HEIGHT_LABELS[opt].defaultLabel)}</span>
              {active2 && <CheckIcon$1 />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
export const RowHeightPanel = reactExports.memo(RowHeightPanelInner);
function CheckIcon$1() {
  return (
    <CompositedSvg
      width="12"
      height="12"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M3 8.5L6.5 12L13 4" strokeLinecap="round" strokeLinejoin="round" />
    </CompositedSvg>
  );
}
export function functionalUpdate$2(updater, input) {
  return typeof updater === "function" ? updater(input) : updater;
}
export function makeStateUpdater(key2, instance2) {
  return (updater) => {
    instance2.setState((old) => {
      return {
        ...old,
        [key2]: functionalUpdate$2(updater, old[key2]),
      };
    });
  };
}
export function isFunction$1(d2) {
  return d2 instanceof Function;
}
export function isNumberArray(d2) {
  return Array.isArray(d2) && d2.every((val) => typeof val === "number");
}
export function flattenBy(arr, getChildren2) {
  const flat = [];
  const recurse = (subArr) => {
    subArr.forEach((item) => {
      flat.push(item);
      const children2 = getChildren2(item);
      if (children2 != null && children2.length) {
        recurse(children2);
      }
    });
  };
  recurse(arr);
  return flat;
}
export function memo$1(getDeps, fn2, opts) {
  let deps = [];
  let result;
  return (depArgs) => {
    let depTime;
    if (opts.key && opts.debug) depTime = Date.now();
    const newDeps = getDeps(depArgs);
    const depsChanged =
      newDeps.length !== deps.length || newDeps.some((dep, index2) => deps[index2] !== dep);
    if (!depsChanged) {
      return result;
    }
    deps = newDeps;
    let resultTime;
    if (opts.key && opts.debug) resultTime = Date.now();
    result = fn2(...newDeps);
    opts == null || opts.onChange == null || opts.onChange(result);
    if (opts.key && opts.debug) {
      if (opts != null && opts.debug()) {
        const depEndTime = Math.round((Date.now() - depTime) * 100) / 100;
        const resultEndTime = Math.round((Date.now() - resultTime) * 100) / 100;
        const resultFpsPercentage = resultEndTime / 16;
        const pad = (str2, num) => {
          str2 = String(str2);
          while (str2.length < num) {
            str2 = " " + str2;
          }
          return str2;
        };
        console.info(
          `%c⏱ ${pad(resultEndTime, 5)} /${pad(depEndTime, 5)} ms`,
          `
            font-size: .6rem;
            font-weight: bold;
            color: hsl(${Math.max(0, Math.min(120 - 120 * resultFpsPercentage, 120))}deg 100% 31%);`,
          opts == null ? void 0 : opts.key,
        );
      }
    }
    return result;
  };
}
export function getMemoOptions(tableOptions, debugLevel, key2, onChange) {
  return {
    debug: () => {
      var _tableOptions$debugAl;
      return (_tableOptions$debugAl = tableOptions == null ? void 0 : tableOptions.debugAll) != null
        ? _tableOptions$debugAl
        : tableOptions[debugLevel];
    },
    key: false,
    onChange,
  };
}
export function createCell$1(table2, row, column, columnId) {
  const getRenderValue = () => {
    var _cell$getValue;
    return (_cell$getValue = cell.getValue()) != null
      ? _cell$getValue
      : table2.options.renderFallbackValue;
  };
  const cell = {
    id: `${row.id}_${column.id}`,
    row,
    column,
    getValue: () => row.getValue(columnId),
    renderValue: getRenderValue,
    getContext: memo$1(
      () => [table2, column, row, cell],
      (table22, column2, row2, cell2) => ({
        table: table22,
        column: column2,
        row: row2,
        cell: cell2,
        getValue: cell2.getValue,
        renderValue: cell2.renderValue,
      }),
      getMemoOptions(table2.options, "debugCells"),
    ),
  };
  table2._features.forEach((feature) => {
    feature.createCell == null || feature.createCell(cell, column, row, table2);
  }, {});
  return cell;
}
export function createColumn(table2, columnDef, depth2, parent) {
  var _ref, _resolvedColumnDef$id;
  const defaultColumn = table2._getDefaultColumnDef();
  const resolvedColumnDef = {
    ...defaultColumn,
    ...columnDef,
  };
  const accessorKey = resolvedColumnDef.accessorKey;
  let id2 =
    (_ref =
      (_resolvedColumnDef$id = resolvedColumnDef.id) != null
        ? _resolvedColumnDef$id
        : accessorKey
          ? typeof String.prototype.replaceAll === "function"
            ? accessorKey.replaceAll(".", "_")
            : accessorKey.replace(/\./g, "_")
          : void 0) != null
      ? _ref
      : typeof resolvedColumnDef.header === "string"
        ? resolvedColumnDef.header
        : void 0;
  let accessorFn;
  if (resolvedColumnDef.accessorFn) {
    accessorFn = resolvedColumnDef.accessorFn;
  } else if (accessorKey) {
    if (accessorKey.includes(".")) {
      accessorFn = (originalRow) => {
        let result = originalRow;
        for (const key2 of accessorKey.split(".")) {
          var _result;
          result = (_result = result) == null ? void 0 : _result[key2];
        }
        return result;
      };
    } else {
      accessorFn = (originalRow) => originalRow[resolvedColumnDef.accessorKey];
    }
  }
  if (!id2) {
    throw new Error();
  }
  let column = {
    id: `${String(id2)}`,
    accessorFn,
    parent,
    depth: depth2,
    columnDef: resolvedColumnDef,
    columns: [],
    getFlatColumns: memo$1(
      () => [true],
      () => {
        var _column$columns;
        return [
          column,
          ...((_column$columns = column.columns) == null
            ? void 0
            : _column$columns.flatMap((d2) => d2.getFlatColumns())),
        ];
      },
      getMemoOptions(table2.options, "debugColumns"),
    ),
    getLeafColumns: memo$1(
      () => [table2._getOrderColumnsFn()],
      (orderColumns2) => {
        var _column$columns2;
        if ((_column$columns2 = column.columns) != null && _column$columns2.length) {
          let leafColumns = column.columns.flatMap((column2) => column2.getLeafColumns());
          return orderColumns2(leafColumns);
        }
        return [column];
      },
      getMemoOptions(table2.options, "debugColumns"),
    ),
  };
  for (const feature of table2._features) {
    feature.createColumn == null || feature.createColumn(column, table2);
  }
  return column;
}
