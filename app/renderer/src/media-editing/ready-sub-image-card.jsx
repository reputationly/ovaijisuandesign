// ready-sub-image-card.jsx
import { reactExports, useTranslation, X$7 as X } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { cn } from "../infra/dialog-content.jsx";
import { ImageSlotBody } from "./image-slot-body.jsx";
import {
  computeMultiImageGridPositions,
  MULTI_IMAGE_FRAME_INSET,
  SUB_CARD_GAP,
  useGenerationWaitEstimate,
} from "./compute-multi-image-grid-positions.jsx";
import { useRegisterZoomCounter } from "../infra/create-recently-added-store.js";
import { MEDIA_NODE_RADIUS } from "./package.jsx";
import { ImagePlaceholderIcon } from "../canvas/file-missing-icon.jsx";
import { useSimulatedProgress } from "./use-warn-missing-asset-meta.jsx";
import { resolveImageGenerationEstimateSeconds } from "../generation/to-workspace-browser-url.js";
import {
  GenerationWaitEstimate,
  NodeFrameStroke,
} from "../canvas/node-shell-inner.jsx";
import { MediaDownloadButton } from "./base-backend.jsx";
import { isGenerationErrorStatus } from "../canvas/compute-group-bounds-from-children.js";
function computeExpandedFrameRect(positions, cardWidth, cardHeight) {
  let minX = 0;
  let minY = 0;
  let maxX = cardWidth;
  let maxY = cardHeight;
  for (const position of positions) {
    minX = Math.min(minX, position.dx);
    minY = Math.min(minY, position.dy);
    maxX = Math.max(maxX, position.dx + cardWidth);
    maxY = Math.max(maxY, position.dy + cardHeight);
  }
  return {
    left: minX - MULTI_IMAGE_FRAME_INSET,
    top: minY - MULTI_IMAGE_FRAME_INSET,
    width: maxX - minX + MULTI_IMAGE_FRAME_INSET * 2,
    height: maxY - minY + MULTI_IMAGE_FRAME_INSET * 2,
  };
}
function CardWrapper({
  cardWidth,
  cardHeight,
  position,
  children,
}) {
  const animationDelayMs = Math.min(position.originalIndex, 6) * 18;
  return (
    <div
      data-action-ui-id="canvas.image-node.sub-image-card"
      className="canvas-media-expanded-card group pointer-events-none absolute block"
      style={{
        left: position.dx,
        top: position.dy,
        width: cardWidth,
        height: cardHeight,
        animationDelay: `${animationDelayMs}ms`,
      }}
    >
      {children}
    </div>
  );
}
function DeleteButton({ onDelete, label, className }) {
  return (
    <button
      type="button"
      data-action-ui-id="canvas.image-node.sub-image-card.delete"
      onClick={onDelete}
      aria-label={label}
      title={label}
      className={cn(
        "pointer-events-auto absolute right-1 top-1 z-20 flex size-6 cursor-pointer items-center justify-center rounded-[8px] bg-[var(--canvas-media-control-bg)] text-[var(--canvas-media-control-fg)] transition-[background-color,color,transform] duration-150 ease-out hover:bg-destructive hover:text-destructive-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50",
        className,
      )}
    >
      <X size={14} strokeWidth={1.5} aria-hidden={true} />
    </button>
  );
}
function DownloadButton({ onDownload, label }) {
  return (
    <MediaDownloadButton
      onClick={onDownload}
      dataActionUiId="canvas.image-node.sub-image-card.download"
      label={label}
      title={label}
      className="right-1 top-1 translate-y-0 opacity-100"
    />
  );
}
function ReadySubImageCard({
  nodeId,
  slot,
  position,
  cardWidth,
  cardHeight,
  onSetPrimary,
  onDeleteSub,
  onSplitSub,
  onSubContextMenu,
  onDownloadSub,
  onOpenSlot,
  readonly,
}) {
  const frameRef = reactExports.useRef(null);
  useRegisterZoomCounter(frameRef);
  const { t } = useTranslation();
  const handleCardClick = (clickEvent) => {
    clickEvent.stopPropagation();
    if (!slot.url) return;
    onOpenSlot(position.originalIndex);
  };
  const handleSetPrimary = (clickEvent) => {
    clickEvent.stopPropagation();
    if (readonly) return;
    onSetPrimary(position.originalIndex);
  };
  const handleDoubleClick = (doubleClickEvent) => {
    doubleClickEvent.preventDefault();
    doubleClickEvent.stopPropagation();
    if (!slot.url) return;
    onOpenSlot(position.originalIndex);
  };
  const handleDelete = (clickEvent) => {
    clickEvent.stopPropagation();
    if (readonly) return;
    onDeleteSub(position.originalIndex);
  };
  const handleSplit = (clickEvent) => {
    clickEvent.stopPropagation();
    if (readonly) return;
    onSplitSub(position.originalIndex);
  };
  const handleDownload = (clickEvent) => {
    clickEvent.stopPropagation();
    onDownloadSub(position.originalIndex);
  };
  const handleContextMenu = (contextMenuEvent) => {
    contextMenuEvent.preventDefault();
    contextMenuEvent.stopPropagation();
    if (readonly) return;
    onSubContextMenu(position.originalIndex, contextMenuEvent);
  };
  const promoteLabel = t("canvas.multiImage.setAsPrimary", "设为主图");
  const splitLabel = t("canvas.multiImage.splitToNode", "独立展示");
  const previewLabel = t("canvas.fullscreenPreview", "全屏预览");
  return (
    <CardWrapper
      cardWidth={cardWidth}
      cardHeight={cardHeight}
      position={position}
    >
      <button
        ref={frameRef}
        type="button"
        onClick={handleCardClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        aria-label={previewLabel}
        title={previewLabel}
        className="pointer-events-auto absolute inset-0 z-10 block cursor-zoom-in canvas-node-frame overflow-hidden border-0 p-px bg-[var(--canvas-node-bg)] transition-shadow hover:shadow-[var(--canvas-shadow-dropdown)] focus-visible:outline-none"
        style={{
          borderRadius: MEDIA_NODE_RADIUS,
        }}
      >
        <NodeFrameStroke />
        <ImageSlotBody
          nodeId={nodeId}
          slot={slot}
          width={cardWidth}
          height={cardHeight}
          aspectFit={true}
        />
      </button>
      {!readonly && (
        <div
          data-action-ui-id="canvas.image-node.sub-image-card.action-badges"
          className="pointer-events-none absolute left-1 top-1 z-20 flex gap-1"
        >
          <button
            type="button"
            data-action-ui-id="canvas.image-node.sub-image-card.set-primary"
            onClick={handleSetPrimary}
            aria-label={promoteLabel}
            title={promoteLabel}
            className="pointer-events-auto inline-flex h-6 cursor-pointer items-center rounded-[8px] bg-[var(--canvas-media-control-bg)] px-2 text-[11px] font-medium text-[var(--canvas-media-control-fg)] transition-colors hover:bg-[var(--canvas-media-control-bg-hover)] active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
          >
            {promoteLabel}
          </button>
          <button
            type="button"
            data-action-ui-id="canvas.image-node.sub-image-card.split"
            onClick={handleSplit}
            aria-label={splitLabel}
            title={splitLabel}
            className="pointer-events-auto inline-flex h-6 cursor-pointer items-center rounded-[8px] bg-[var(--canvas-media-control-bg)] px-2 text-[11px] font-medium text-[var(--canvas-media-control-fg)] transition-colors hover:bg-[var(--canvas-media-control-bg-hover)] active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
          >
            {splitLabel}
          </button>
        </div>
      )}
      {!readonly && (
        <DeleteButton
          onDelete={handleDelete}
          label={
            slot.status === "status_unknown"
              ? t("canvas.removeLocalPlaceholder", "移除本地占位")
              : t("canvas.multiImage.deleteImage", "删除该图")
          }
          className="right-8"
        />
      )}
      {slot.url && (
        <DownloadButton
          onDownload={handleDownload}
          label={t("canvas.multiImage.downloadImage", "下载该图")}
        />
      )}
    </CardWrapper>
  );
}
function LoadingSubImageCard({
  nodeId,
  slot,
  position,
  cardWidth,
  cardHeight,
}) {
  const frameRef = reactExports.useRef(null);
  useRegisterZoomCounter(frameRef);
  const { t } = useTranslation();
  const queued = slot.status === "pending";
  const label = queued
    ? t("canvas.pending")
    : t("canvas.multiImage.slotLoading", "生成中…");
  const estimatedRemainingWaitSeconds = useGenerationWaitEstimate({
    active: !queued,
    liveRemainingWaitSeconds: slot.estimatedRemainingWaitSeconds,
    estimatedGenerationSeconds: resolveImageGenerationEstimateSeconds(
      slot.backend,
      slot.modelId ?? slot.model,
    ),
    startedAt: slot.generationStartedAt,
  });
  const subProgress = useSimulatedProgress(
    !queued,
    "image",
    slot.generationStartedAt,
  );
  return (
    <CardWrapper
      cardWidth={cardWidth}
      cardHeight={cardHeight}
      position={position}
    >
      <div
        ref={frameRef}
        role="status"
        data-action-ui-id="canvas.image-node.sub-image-card.loading"
        aria-busy="true"
        aria-label={label}
        title={label}
        className="pointer-events-auto absolute inset-0 z-10 canvas-node-frame overflow-hidden border-0 p-px bg-[var(--canvas-node-bg)]"
        style={{
          borderRadius: MEDIA_NODE_RADIUS,
        }}
        data-generating-sub=""
      >
        <NodeFrameStroke />
        <ImageSlotBody
          nodeId={nodeId}
          slot={slot}
          width={cardWidth}
          height={cardHeight}
          aspectFit={true}
          generatingProgress={queued ? void 0 : subProgress}
          generatingIcon={<ImagePlaceholderIcon />}
          generatingLabel={
            queued ? (
              <div
                className="rounded-full bg-[var(--canvas-controls-bg)] px-3 py-1 text-xs font-medium text-[var(--canvas-controls-text)] shadow-sm"
                role="status"
                aria-live="polite"
                data-action-ui-id="canvas.image-node.sub-image-card.queued-status"
              >
                {label}
              </div>
            ) : estimatedRemainingWaitSeconds ? (
              <GenerationWaitEstimate
                seconds={estimatedRemainingWaitSeconds}
                actionUiId="canvas.image-node.sub-image-card"
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
function ErrorSubImageCard({
  nodeId,
  slot,
  position,
  cardWidth,
  cardHeight,
  onDeleteSub,
  readonly,
}) {
  const { t } = useTranslation();
  const handleDelete = (clickEvent) => {
    clickEvent.stopPropagation();
    if (readonly) return;
    onDeleteSub(position.originalIndex);
  };
  return (
    <CardWrapper
      cardWidth={cardWidth}
      cardHeight={cardHeight}
      position={position}
    >
      <ImageSlotBody
        nodeId={nodeId}
        slot={slot}
        width={cardWidth}
        height={cardHeight}
        aspectFit={true}
        errorVariant="compact"
      />
      {!readonly && slot.status !== "recoverable_error" && (
        <DeleteButton
          onDelete={handleDelete}
          label={
            slot.status === "status_unknown"
              ? t("canvas.removeLocalPlaceholder", "移除本地占位")
              : t("canvas.multiImage.deleteImage", "删除该图")
          }
        />
      )}
    </CardWrapper>
  );
}
export const MultiImageOverlay = reactExports.memo(function MultiImageOverlayView({
  nodeId,
  view,
  cardWidth,
  cardHeight,
  onSetPrimary,
  onDeleteSub,
  onSplitSub,
  onSubContextMenu,
  onDownloadSub,
  onOpenSlot,
  readonly,
  closing = false,
}) {
  const imageIds = view.slots.map((slot) => slot.id);
  const imageStatuses = view.slots.map((slot) => slot.status);
  const positions = computeMultiImageGridPositions(
    imageIds,
    view.primaryIndex,
    cardWidth,
    cardHeight,
    SUB_CARD_GAP,
    imageStatuses,
  );
  if (positions.length === 0) return null;
  const frameRect = computeExpandedFrameRect(positions, cardWidth, cardHeight);
  return (
    <div
      data-action-ui-id="canvas.image-node.multi-image-overlay"
      data-state={closing ? "closing" : "open"}
      className="pointer-events-none absolute inset-0 z-50"
    >
      <div
        data-action-ui-id="canvas.image-node.multi-image-overlay-frame"
        className="canvas-media-expanded-frame pointer-events-none absolute z-0"
        style={frameRect}
      />
      {positions.map((position) => {
        const slot = view.slots[position.originalIndex];
        if (!slot) return null;
        if (
          position.status === "pending" ||
          position.status === "generating" ||
          position.status === "loading"
        ) {
          return (
            <LoadingSubImageCard
              key={`loading:${position.imageId}:${position.status}`}
              nodeId={nodeId}
              slot={slot}
              position={position}
              cardWidth={cardWidth}
              cardHeight={cardHeight}
            />
          );
        }
        if (
          isGenerationErrorStatus(position.status) ||
          (slot.error !== null && slot.error !== void 0)
        ) {
          return (
            <ErrorSubImageCard
              key={`error:${position.originalIndex}:${position.imageId}`}
              nodeId={nodeId}
              slot={slot}
              position={position}
              cardWidth={cardWidth}
              cardHeight={cardHeight}
              onDeleteSub={onDeleteSub}
              readonly={readonly}
            />
          );
        }
        const key = `ready:${position.imageId}`;
        return (
          <ReadySubImageCard
            key={key}
            nodeId={nodeId}
            slot={slot}
            position={position}
            cardWidth={cardWidth}
            cardHeight={cardHeight}
            onSetPrimary={onSetPrimary}
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
