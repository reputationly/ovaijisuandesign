// ready-sub-video-card.jsx
import { Download$2, reactExports, useTranslation } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { VideoPlayer } from "./video-player-inner.jsx";
import { CardWrapper, DeleteButton } from "./canvas-sticker-assets.jsx";
import {
  appendCanvasFileVersion,
  usePathFileVersion,
} from "../infra/use-plugin-metadata-store.js";
import { useRegisterZoomCounter } from "../infra/create-recently-added-store.js";
import {
  formatTime$2,
  MEDIA_NODE_RADIUS,
  useAssetMeta,
  useMediaPlayback,
} from "./package.jsx";
import { resolveVideoPlaybackUrl } from "../generation/to-workspace-browser-url.js";
import { NodeFrameStroke } from "../canvas/node-shell-inner.jsx";

function shouldPreviewReadySubVideo({ hasUrl }) {
  return hasUrl;
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

export function ReadySubVideoCard({
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
