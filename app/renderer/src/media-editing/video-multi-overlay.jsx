// video-multi-overlay.jsx
import { reactExports, useTranslation } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { CardWrapper, DeleteButton } from "./canvas-sticker-assets.jsx";
import {
  isGenerationErrorStatus,
  isGenerationRefundStatus,
} from "../canvas/compute-group-bounds-from-children.js";
import { MEDIA_NODE_RADIUS, useCanvasBridge } from "./package.jsx";
import {
  GeneratingMediaArea,
  VideoPlaceholderIcon,
} from "../canvas/generating-media-area.jsx";
import { RefundHint } from "../generation/missing-asset-card.jsx";
import { useRegisterZoomCounter } from "../infra/create-recently-added-store.js";
import { useSimulatedProgress } from "./use-warn-missing-asset-meta.jsx";
import {
  GenerationWaitEstimate,
  NodeFrameStroke,
  QueueGenerationControl,
} from "../canvas/node-shell-inner.jsx";
import { isMiniMaxH3MaxModelValue } from "../generation/i2-v-aspect-ratio-field.jsx";
import { ReadySubVideoCard } from "./ready-sub-video-card.jsx";
import {
  computeMultiImageGridPositions,
  SUB_CARD_GAP,
} from "./compute-multi-image-grid-positions.jsx";

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
    <CardWrapper
      cardWidth={cardWidth}
      cardHeight={cardHeight}
      position={position2}
    >
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
    ? t2(
        "canvas.generationRecovery.description",
        "原任务已保留，结果将在恢复后自动回填。",
      )
    : uncertain
      ? t2(
          "canvas.generationStatusUnknown.description",
          "生成请求未能完成，系统不会自动重试。",
        )
      : (slot.error ?? t2("canvas.multiVideo.slotFailed", "生成失败"));
  const neutral = recoverable;
  const handleDelete2 = (event) => {
    event.stopPropagation();
    if (!readonly) onDeleteSub(position2.originalIndex);
  };
  return (
    <CardWrapper
      cardWidth={cardWidth}
      cardHeight={cardHeight}
      position={position2}
    >
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
        <span className="line-clamp-2 break-all text-muted-foreground">
          {message2}
        </span>
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
