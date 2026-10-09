// ready-sub-image-card.jsx
import {
  jsxRuntimeExports,
  reactExports,
  CompositedSvg,
  useTranslation,
  useStore$3,
  NodeToolbar$1,
  Position,
  useNodeId,
  useCanvasIsDragging,
  useCanvasIsMultiSelect,
  useCanvasIsBoxSelecting,
  X$7,
  CircleAlert$2,
  isGenerationRefundStatus,
  useAssetMeta,
  usePathFileVersion,
  appendCanvasFileVersion,
  isGenerationErrorStatus,
  useRegisterZoomCounter,
  MEDIA_NODE_RADIUS,
  Ungroup,
  ExternalLink$2,
} from "../vendor.js";
import { GeneratingMediaArea, ImagePlaceholderIcon } from "../m01/generating-media-area.jsx";
import { RefundHint, MediaGenerationErrorOverlay } from "../m01/create-tracker.jsx";
import {
  NODE_POPOVER_SAFE_GAP,
  parseGenerationStartedAt,
  useSimulatedProgress,
} from "../m01/use-lightbox-media-actions.jsx";
import { resolveImageGenerationEstimateSeconds } from "../m01/text-models.js";
import { CanvasImage } from "../m02/canvas-image.jsx";
import { resolveGifAnimationSrc, MediaDownloadButton } from "../m03/base-backend.jsx";
import { cn$5 } from "../asset-center/shared/use-browser-overlay-dialog-props.jsx";
import { NodeFrameStroke, GenerationWaitEstimate } from "../m01/use-media-node-actions.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { MultiAngleEditor } from "./multi-angle-editor.jsx";
const MULTI_ANGLE_POPOVER_WIDTH = 658;
const MULTI_ANGLE_POPOVER_MAX_HEIGHT = 490;
const MULTI_ANGLE_POPOVER_MIN_HEIGHT = 360;
const MULTI_ANGLE_POPOVER_VIEWPORT_MARGIN = 16;
export function MultiAnglePopover({ onClose, imageUrl, imagePath }) {
  const { t: t2 } = useTranslation();
  const nodeId = useNodeId() ?? "";
  const onCloseRef = reactExports.useRef(onClose);
  onCloseRef.current = onClose;
  const selectedSelector = reactExports.useCallback(
    (state2) => (nodeId ? !!state2.nodeLookup.get(nodeId)?.selected : true),
    [nodeId],
  );
  const selected2 = useStore$3(selectedSelector);
  const sourceScreenBottom = useStore$3((state2) => {
    const sourceNode = nodeId ? state2.nodeLookup.get(nodeId) : void 0;
    const sourcePosition = sourceNode?.internals.positionAbsolute;
    const sourceHeight = sourceNode?.measured.height ?? sourceNode?.height ?? 0;
    if (!sourcePosition) return 0;
    const [, viewportY, zoom2] = state2.transform;
    return viewportY + (sourcePosition.y + sourceHeight) * zoom2;
  });
  const isDragging = useCanvasIsDragging();
  const isMultiSelect = useCanvasIsMultiSelect();
  const isBoxSelecting = useCanvasIsBoxSelecting();
  reactExports.useEffect(() => {
    if (!selected2) onCloseRef.current();
  }, [selected2]);
  const hidden = isDragging || isMultiSelect || isBoxSelecting;
  const availableHeight =
    window.innerHeight -
    sourceScreenBottom -
    NODE_POPOVER_SAFE_GAP -
    MULTI_ANGLE_POPOVER_VIEWPORT_MARGIN;
  const popoverHeight = Math.max(
    MULTI_ANGLE_POPOVER_MIN_HEIGHT,
    Math.min(MULTI_ANGLE_POPOVER_MAX_HEIGHT, availableHeight),
  );
  return (
    <NodeToolbar$1
      isVisible={true}
      position={Position.Bottom}
      offset={NODE_POPOVER_SAFE_GAP}
      align="center"
      style={{
        zIndex: 1100,
      }}
    >
      <div
        className="relative flex max-w-[calc(100vw-4rem)] flex-col overflow-hidden rounded-lg bg-background shadow-[var(--canvas-shadow-dropdown)] animate-[i2v-popover-in_0.15s_ease-out]"
        style={{
          width: MULTI_ANGLE_POPOVER_WIDTH,
          height: popoverHeight,
          display: hidden ? "none" : void 0,
        }}
        data-action-ui-id="canvas.multi-angle.popover"
        onPointerDown={(event) => event.stopPropagation()}
        onDoubleClick={(event) => event.stopPropagation()}
        onContextMenu={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 flex size-8 items-center justify-center rounded-md text-[var(--canvas-controls-text-muted)] transition-colors duration-150 hover:bg-[var(--canvas-controls-hover)] hover:text-[var(--canvas-controls-text)]"
          aria-label={t2("common.close", "Close")}
          data-action-ui-id="canvas.multi-angle.close"
        >
          <X$7 size={20} strokeWidth={1.5} aria-hidden="true" />
        </button>
        <MultiAngleEditor
          nodeId={nodeId}
          imageUrl={imageUrl}
          imagePath={imagePath}
          onClose={onClose}
        />
      </div>
    </NodeToolbar$1>
  );
}
function MultiImageCountIcon() {
  return (
    <CompositedSvg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M4.66666 1.33333H11.3333"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3.33334 4H12.6667"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12.6667 6.66667H3.33333C2.59695 6.66667 2 7.26362 2 8V13.3333C2 14.0697 2.59695 14.6667 3.33333 14.6667H12.6667C13.403 14.6667 14 14.0697 14 13.3333V8C14 7.26362 13.403 6.66667 12.6667 6.66667Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </CompositedSvg>
  );
}
export function CountBadge({ count: count2, expanded = false, onClick, unit = "" }) {
  const { t: t2 } = useTranslation();
  if (count2 <= 1) return null;
  const label = count2 > 9 ? "9+" : String(count2);
  const displayLabel = `${label}${unit}`;
  const collapseLabel = t2("canvas.multiMedia.collapseView", "收起视图");
  const expandLabel = t2("canvas.multiMedia.expandView", {
    count: displayLabel,
  });
  const visibleLabel = expanded && onClick ? collapseLabel : displayLabel;
  if (onClick) {
    return (
      <button
        type="button"
        data-action-ui-id="canvas.image-node.count-badge"
        data-state={expanded ? "expanded" : "collapsed"}
        onClick={onClick}
        aria-label={expanded ? collapseLabel : expandLabel}
        aria-expanded={expanded}
        className="pointer-events-auto absolute left-1 top-1 z-20 inline-flex h-6 min-w-[42px] cursor-pointer items-center justify-center gap-1 rounded-[8px] border-0 bg-black/55 px-2 text-[11px] font-medium text-white transition-colors hover:bg-black/70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
      >
        {!expanded && <MultiImageCountIcon />}
        <span>{visibleLabel}</span>
      </button>
    );
  }
  return (
    // The visible "5" / "9+" already conveys the count. A redundant
    // aria-label would just have the screen reader read it twice (and biome
    // rejects aria-label on a div without an interactive role anyway).
    <div
      data-action-ui-id="canvas.image-node.count-badge"
      className="pointer-events-none absolute left-1 top-1 z-20 inline-flex h-6 min-w-[42px] items-center justify-center gap-1 rounded-[8px] bg-black/55 px-2 text-[11px] font-medium text-white"
    >
      <MultiImageCountIcon />
      <span>{displayLabel}</span>
    </div>
  );
}
const WAIT_ESTIMATE_UPDATE_INTERVAL_MS = 5e3;
const MIN_DISPLAY_SECONDS = 60;
function normalizeSeconds(value) {
  return value != null && Number.isFinite(value) && value > 0
    ? Math.max(1, Math.ceil(value))
    : void 0;
}
function calculateStaticRemainingWaitSeconds(estimatedGenerationSeconds, startedAt, nowMs) {
  if (
    estimatedGenerationSeconds == null ||
    !Number.isFinite(estimatedGenerationSeconds) ||
    estimatedGenerationSeconds <= 0
  ) {
    return void 0;
  }
  const originMs = parseGenerationStartedAt(startedAt);
  if (originMs == null) return void 0;
  const elapsedSeconds = Math.max(0, nowMs - originMs) / 1e3;
  const remainingSeconds = Math.max(
    MIN_DISPLAY_SECONDS,
    estimatedGenerationSeconds - elapsedSeconds,
  );
  return Math.ceil(remainingSeconds);
}
export function useGenerationWaitEstimate({
  active: active2,
  liveRemainingWaitSeconds,
  estimatedGenerationSeconds,
  startedAt,
}) {
  const [, setRevision] = reactExports.useState(0);
  const liveSeconds = normalizeSeconds(liveRemainingWaitSeconds);
  const hasStaticEstimate =
    estimatedGenerationSeconds != null &&
    Number.isFinite(estimatedGenerationSeconds) &&
    estimatedGenerationSeconds > 0 &&
    parseGenerationStartedAt(startedAt) != null;
  reactExports.useEffect(() => {
    if (!active2 || liveSeconds != null || !hasStaticEstimate) return;
    const intervalId = window.setInterval(
      () => setRevision((revision) => revision + 1),
      WAIT_ESTIMATE_UPDATE_INTERVAL_MS,
    );
    return () => window.clearInterval(intervalId);
  }, [active2, liveSeconds, hasStaticEstimate]);
  if (!active2) return void 0;
  return (
    liveSeconds ??
    calculateStaticRemainingWaitSeconds(estimatedGenerationSeconds, startedAt, Date.now())
  );
}
const PRIMARY_ROW = 2;
const PRIMARY_COL = 0;
const MULTI_IMAGE_SUB_CARD_GAP = 8;
const MULTI_IMAGE_FRAME_INSET = 8;
export function computeMultiImageRenderBounds(cardWidth, cardHeight) {
  return {
    top: (cardHeight + MULTI_IMAGE_SUB_CARD_GAP) * PRIMARY_ROW + MULTI_IMAGE_FRAME_INSET,
    right: (cardWidth + MULTI_IMAGE_SUB_CARD_GAP) * 2 + MULTI_IMAGE_FRAME_INSET,
    bottom: MULTI_IMAGE_FRAME_INSET,
    left: MULTI_IMAGE_FRAME_INSET,
  };
}
const FILL_ORDER = [
  [2, 1],
  // sub #1 — directly RIGHT of primary (N=2)
  [1, 0],
  // sub #2 — directly ABOVE primary (N=3)
  [1, 1],
  // sub #3 — diagonal upper-right, closes the L (N=4)
  [2, 2],
  // sub #4 — further RIGHT, extends bottom row (N=5)
  [1, 2],
  // sub #5 — upper-right extension (N=6)
  [0, 2],
  // sub #6 — further ABOVE, extends right column (N=7)
  [0, 1],
  // sub #7 — top row middle (N=8)
  [0, 0],
  // sub #8 — top-left corner (N=9)
];
export function computeMultiImageGridPositions(
  imageIds,
  primaryIndex,
  cardWidth,
  cardHeight,
  gap,
  statuses,
) {
  if (imageIds.length <= 1) return [];
  const subs = [];
  for (let i2 = 0; i2 < imageIds.length; i2++) {
    if (i2 === primaryIndex) continue;
    const id2 = imageIds[i2];
    if (typeof id2 !== "string" || !id2) continue;
    const status = statuses?.[i2] ?? "ready";
    subs.push({
      id: id2,
      originalIndex: i2,
      status,
    });
  }
  const max2 = Math.min(subs.length, FILL_ORDER.length);
  const stepX = cardWidth + gap;
  const stepY = cardHeight + gap;
  const out = [];
  for (let i2 = 0; i2 < max2; i2++) {
    const slot = FILL_ORDER[i2];
    if (!slot) continue;
    const [row, col] = slot;
    const sub = subs[i2];
    if (!sub) continue;
    out.push({
      imageId: sub.id,
      status: sub.status,
      originalIndex: sub.originalIndex,
      dx: (col - PRIMARY_COL) * stepX,
      dy: (row - PRIMARY_ROW) * stepY,
    });
  }
  return out;
}
function ImageSlotErrorTile({
  message: message2,
  recoverable = false,
  uncertain = false,
  refundStatus,
  refundedCredits,
}) {
  const { t: t2 } = useTranslation();
  const neutralDescription = recoverable
    ? t2("canvas.generationRecovery.description", "原任务已保留，结果将在恢复后自动回填。")
    : uncertain
      ? t2("canvas.generationStatusUnknown.description", "生成请求未能完成，系统不会自动重试。")
      : void 0;
  const text2 =
    neutralDescription ?? message2 ?? t2("canvas.multiImage.slotErrorGeneric", "生成失败");
  const tooltip = text2;
  return (
    <div
      role="alert"
      data-action-ui-id="canvas.image-node.slot-body.error.compact"
      aria-label={text2}
      title={tooltip}
      className={`pointer-events-auto absolute inset-0 z-10 flex flex-col items-center justify-center gap-1 overflow-hidden px-2 py-2 ${recoverable ? "border border-border bg-card" : "border border-destructive/40 bg-destructive/10"}`}
    >
      <CircleAlert$2
        size={18}
        className={recoverable ? "shrink-0 text-muted-foreground" : "shrink-0 text-destructive"}
        aria-hidden="true"
      />
      <span
        className={
          recoverable
            ? "text-[10px] font-medium text-foreground"
            : "text-[10px] font-medium text-destructive"
        }
      >
        {recoverable
          ? t2("canvas.generationRecovery.title", "结果待恢复")
          : t2("canvas.generationFailed", "生成失败")}
      </span>
      <span className="line-clamp-2 w-full min-w-0 break-all text-center text-[9px] leading-tight text-muted-foreground">
        {text2}
      </span>
      {!recoverable && !uncertain && isGenerationRefundStatus(refundStatus) ? (
        <div className="pointer-events-none absolute bottom-2 left-2 z-20">
          <RefundHint
            refundStatus={refundStatus}
            refundedCredits={refundedCredits}
            compact={true}
          />
        </div>
      ) : null}
    </div>
  );
}
export const ImageSlotBody = reactExports.memo(function ImageSlotBody2({
  nodeId,
  slot,
  width,
  height,
  aspectFit = false,
  errorVariant = "full",
  generatingProgress,
  generatingIcon,
  generatingLabel,
  onImageDecodeError,
  overrideStatus,
  overrideError,
}) {
  const status = overrideStatus ?? slot.status;
  const slotPath = useAssetMeta(slot.id)?.path;
  const fileVersion = usePathFileVersion(slotPath);
  const src =
    slot.url !== void 0 && fileVersion > 0
      ? appendCanvasFileVersion(slot.url, fileVersion)
      : slot.url;
  if (
    status === "pending" ||
    status === "generating" ||
    status === "loading" ||
    status === "queue_paused"
  ) {
    const queued = status === "pending" || status === "queue_paused";
    return (
      <GeneratingMediaArea
        width="100%"
        height="100%"
        progress={queued ? void 0 : generatingProgress}
        variant={queued ? "queued" : "generating"}
        icon={generatingIcon}
        label={generatingLabel}
      />
    );
  }
  if (status === "error" || status === "recoverable_error" || status === "status_unknown") {
    const message2 = overrideError ?? slot.error ?? null;
    if (errorVariant === "compact") {
      return (
        <ImageSlotErrorTile
          message={message2}
          recoverable={status === "recoverable_error"}
          uncertain={status === "status_unknown"}
          refundStatus={slot.refundDisplayOwner ? slot.refundStatus : void 0}
          refundedCredits={slot.refundDisplayOwner ? slot.refundedCredits : void 0}
        />
      );
    }
    return (
      <MediaGenerationErrorOverlay
        nodeId={nodeId}
        nodeType="image"
        message={message2 ?? ""}
        recoverable={status === "recoverable_error"}
        uncertain={status === "status_unknown"}
      />
    );
  }
  if (!slot.url) {
    return (
      <div
        className="w-full h-full bg-[color:var(--canvas-controls-bg)] animate-pulse opacity-60"
        data-action-ui-id="canvas.image-node.slot-body.ready.placeholder"
        data-pending-meta={slot.pendingMeta ? "true" : "false"}
      />
    );
  }
  if (aspectFit) {
    const inner = computeContainSize(slot.width, slot.height, width, height);
    return (
      <div className="flex h-full w-full items-center justify-center">
        <CanvasImage
          src={src}
          animationSrc={resolveGifAnimationSrc(src, slotPath, slot.name)}
          nodeId={nodeId}
          width={inner.width}
          height={inner.height}
          alt={slot.name}
          onError={onImageDecodeError}
        />
      </div>
    );
  }
  return (
    <CanvasImage
      src={src}
      animationSrc={resolveGifAnimationSrc(src, slotPath, slot.name)}
      nodeId={nodeId}
      width={width}
      height={height}
      alt={slot.name}
      onError={onImageDecodeError}
    />
  );
});
function computeContainSize(imgW, imgH, boxW, boxH) {
  if (!imgW || !imgH || imgW <= 0 || imgH <= 0) {
    return {
      width: boxW,
      height: boxH,
    };
  }
  const imgAspect = imgW / imgH;
  const boxAspect = boxW / boxH;
  if (imgAspect > boxAspect) {
    return {
      width: boxW,
      height: Math.max(1, Math.round(boxW / imgAspect)),
    };
  }
  return {
    width: Math.max(1, Math.round(boxH * imgAspect)),
    height: boxH,
  };
}
export const SUB_CARD_GAP = MULTI_IMAGE_SUB_CARD_GAP;
function computeExpandedFrameRect$1(positions, cardWidth, cardHeight) {
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
    left: minX - MULTI_IMAGE_FRAME_INSET,
    top: minY - MULTI_IMAGE_FRAME_INSET,
    width: maxX - minX + MULTI_IMAGE_FRAME_INSET * 2,
    height: maxY - minY + MULTI_IMAGE_FRAME_INSET * 2,
  };
}
export const MultiImageOverlay = reactExports.memo(function MultiImageOverlay2({
  nodeId,
  view: view2,
  cardWidth,
  cardHeight,
  onSetPrimary,
  onDeleteSub,
  onSplitSub,
  onSubContextMenu,
  onDownloadSub,
  onOpenSlot,
  readonly,
  closing: closing2 = false,
}) {
  const imageIds = view2.slots.map((s2) => s2.id);
  const imageStatuses = view2.slots.map((s2) => s2.status);
  const positions = computeMultiImageGridPositions(
    imageIds,
    view2.primaryIndex,
    cardWidth,
    cardHeight,
    SUB_CARD_GAP,
    imageStatuses,
  );
  if (positions.length === 0) return null;
  const frameRect = computeExpandedFrameRect$1(positions, cardWidth, cardHeight);
  return (
    <div
      data-action-ui-id="canvas.image-node.multi-image-overlay"
      data-state={closing2 ? "closing" : "open"}
      className="pointer-events-none absolute inset-0 z-50"
    >
      <div
        data-action-ui-id="canvas.image-node.multi-image-overlay-frame"
        className="canvas-media-expanded-frame pointer-events-none absolute z-0"
        style={frameRect}
      />
      {positions.map((pos) => {
        const slot = view2.slots[pos.originalIndex];
        if (!slot) return null;
        if (pos.status === "pending" || pos.status === "generating" || pos.status === "loading") {
          return (
            <LoadingSubImageCard
              key={`loading:${pos.imageId}:${pos.status}`}
              nodeId={nodeId}
              slot={slot}
              position={pos}
              cardWidth={cardWidth}
              cardHeight={cardHeight}
            />
          );
        }
        if (isGenerationErrorStatus(pos.status) || (slot.error !== null && slot.error !== void 0)) {
          return (
            <ErrorSubImageCard
              key={`error:${pos.originalIndex}:${pos.imageId}`}
              nodeId={nodeId}
              slot={slot}
              position={pos}
              cardWidth={cardWidth}
              cardHeight={cardHeight}
              onDeleteSub={onDeleteSub}
              readonly={readonly}
            />
          );
        }
        const key2 = `ready:${pos.imageId}`;
        return (
          <ReadySubImageCard
            key={key2}
            nodeId={nodeId}
            slot={slot}
            position={pos}
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
function CardWrapper$1({ cardWidth, cardHeight, position: position2, children: children2 }) {
  const animationDelayMs = Math.min(position2.originalIndex, 6) * 18;
  return (
    <div
      data-action-ui-id="canvas.image-node.sub-image-card"
      className="canvas-media-expanded-card group pointer-events-none absolute block"
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
function DeleteButton$1({ onDelete, label, className }) {
  return (
    <button
      type="button"
      data-action-ui-id="canvas.image-node.sub-image-card.delete"
      onClick={onDelete}
      aria-label={label}
      title={label}
      className={cn$5(
        "pointer-events-auto absolute right-1 top-1 z-20 flex size-6 cursor-pointer items-center justify-center rounded-[8px] bg-[var(--canvas-media-control-bg)] text-[var(--canvas-media-control-fg)] transition-[background-color,color,transform] duration-150 ease-out hover:bg-destructive hover:text-destructive-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50",
        className,
      )}
    >
      <X$7 size={14} strokeWidth={1.5} aria-hidden={true} />
    </button>
  );
}
function DownloadButton$1({ onDownload, label }) {
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
  position: position2,
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
  const { t: t2 } = useTranslation();
  const handleCardClick = (e2) => {
    e2.stopPropagation();
    if (!slot.url) return;
    onOpenSlot(position2.originalIndex);
  };
  const handleSetPrimary = (e2) => {
    e2.stopPropagation();
    if (readonly) return;
    onSetPrimary(position2.originalIndex);
  };
  const handleDoubleClick2 = (e2) => {
    e2.preventDefault();
    e2.stopPropagation();
    if (!slot.url) return;
    onOpenSlot(position2.originalIndex);
  };
  const handleDelete2 = (e2) => {
    e2.stopPropagation();
    if (readonly) return;
    onDeleteSub(position2.originalIndex);
  };
  const handleSplit = (e2) => {
    e2.stopPropagation();
    if (readonly) return;
    onSplitSub(position2.originalIndex);
  };
  const handleDownload = (e2) => {
    e2.stopPropagation();
    onDownloadSub(position2.originalIndex);
  };
  const handleContextMenu = (e2) => {
    e2.preventDefault();
    e2.stopPropagation();
    if (readonly) return;
    onSubContextMenu(position2.originalIndex, e2);
  };
  const promoteLabel = t2("canvas.multiImage.setAsPrimary", "设为主图");
  const splitLabel = t2("canvas.multiImage.splitToNode", "独立展示");
  const previewLabel = t2("canvas.fullscreenPreview", "全屏预览");
  return (
    <CardWrapper$1 cardWidth={cardWidth} cardHeight={cardHeight} position={position2}>
      <button
        ref={frameRef}
        type="button"
        onClick={handleCardClick}
        onDoubleClick={handleDoubleClick2}
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
        <DeleteButton$1
          onDelete={handleDelete2}
          label={
            slot.status === "status_unknown"
              ? t2("canvas.removeLocalPlaceholder", "移除本地占位")
              : t2("canvas.multiImage.deleteImage", "删除该图")
          }
          className="right-8"
        />
      )}
      {slot.url && (
        <DownloadButton$1
          onDownload={handleDownload}
          label={t2("canvas.multiImage.downloadImage", "下载该图")}
        />
      )}
    </CardWrapper$1>
  );
}
function LoadingSubImageCard({ nodeId, slot, position: position2, cardWidth, cardHeight }) {
  const frameRef = reactExports.useRef(null);
  useRegisterZoomCounter(frameRef);
  const { t: t2 } = useTranslation();
  const queued = slot.status === "pending";
  const label = queued ? t2("canvas.pending") : t2("canvas.multiImage.slotLoading", "生成中…");
  const estimatedRemainingWaitSeconds = useGenerationWaitEstimate({
    active: !queued,
    liveRemainingWaitSeconds: slot.estimatedRemainingWaitSeconds,
    estimatedGenerationSeconds: resolveImageGenerationEstimateSeconds(
      slot.backend,
      slot.modelId ?? slot.model,
    ),
    startedAt: slot.generationStartedAt,
  });
  const subProgress = useSimulatedProgress(!queued, "image", slot.generationStartedAt);
  return (
    <CardWrapper$1 cardWidth={cardWidth} cardHeight={cardHeight} position={position2}>
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
    </CardWrapper$1>
  );
}
function ErrorSubImageCard({
  nodeId,
  slot,
  position: position2,
  cardWidth,
  cardHeight,
  onDeleteSub,
  readonly,
}) {
  const { t: t2 } = useTranslation();
  const handleDelete2 = (e2) => {
    e2.stopPropagation();
    if (readonly) return;
    onDeleteSub(position2.originalIndex);
  };
  return (
    <CardWrapper$1 cardWidth={cardWidth} cardHeight={cardHeight} position={position2}>
      <ImageSlotBody
        nodeId={nodeId}
        slot={slot}
        width={cardWidth}
        height={cardHeight}
        aspectFit={true}
        errorVariant="compact"
      />
      {!readonly && slot.status !== "recoverable_error" && (
        <DeleteButton$1
          onDelete={handleDelete2}
          label={
            slot.status === "status_unknown"
              ? t2("canvas.removeLocalPlaceholder", "移除本地占位")
              : t2("canvas.multiImage.deleteImage", "删除该图")
          }
        />
      )}
    </CardWrapper$1>
  );
}
function SplitAllButton({ onSplitAll, disabled: disabled2 }) {
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
      data-action-ui-id="canvas.image-node.split-all"
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
function SplitMainButton({ onSplitMain, disabled: disabled2 }) {
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
      data-action-ui-id="canvas.image-node.split-main"
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
export const MultiImageChrome = reactExports.memo(function MultiImageChrome2({
  view: view2,
  showOverlay,
  hasLifecyclePrimary,
  isEmpty: isEmpty2,
  imgError,
  imageEditing,
  rotateEditing,
  onToggleOverlay,
  onSplitAll,
  onSplitMain,
}) {
  const { t: t2 } = useTranslation();
  const countUnit = t2("canvas.multiImage.countUnit", "张");
  const collapseLabel = t2("canvas.multiMedia.collapseView", "收起视图");
  const showMultiChrome = view2.isMulti && !imageEditing && !rotateEditing;
  const showSplitAll =
    view2.isMulti &&
    !hasLifecyclePrimary &&
    !isEmpty2 &&
    !imgError &&
    !imageEditing &&
    !rotateEditing &&
    view2.slots.some((s2, i2) => i2 !== view2.primaryIndex && s2.status === "ready");
  const showSplitMain =
    view2.rounds.length > 1 &&
    !hasLifecyclePrimary &&
    !isEmpty2 &&
    !imgError &&
    !imageEditing &&
    !rotateEditing;
  const showCollapsedSplitRow = !showOverlay && (showSplitAll || showSplitMain);
  const showCollapsedActionRow = !showOverlay && (showMultiChrome || showCollapsedSplitRow);
  return (
    <>
      {showMultiChrome && showOverlay ? (
        <div
          data-action-ui-id="canvas.image-node.expanded-actions"
          className="pointer-events-none absolute left-1 top-1 z-20 flex items-center gap-1"
        >
          <button
            type="button"
            data-action-ui-id="canvas.image-node.collapse-view"
            onClick={onToggleOverlay}
            aria-label={collapseLabel}
            aria-expanded={showOverlay}
            className="pointer-events-auto inline-flex h-6 cursor-pointer items-center rounded-[8px] border-0 bg-black/55 px-2 text-[11px] font-medium text-white transition-colors hover:bg-black/70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
          >
            {collapseLabel}
          </button>
          {showSplitAll && <SplitAllButton onSplitAll={onSplitAll} disabled={false} />}
          {showSplitMain && <SplitMainButton onSplitMain={onSplitMain} disabled={false} />}
        </div>
      ) : null}
      {showCollapsedActionRow && (
        <div
          data-action-ui-id="canvas.image-node.primary-actions"
          className="canvas-media-primary-actions pointer-events-none absolute left-1 top-1 z-20 flex items-center gap-1"
        >
          {showMultiChrome && (
            <CountBadge
              count={view2.slots.length}
              expanded={showOverlay}
              unit={countUnit}
              onClick={onToggleOverlay}
            />
          )}
          {showCollapsedSplitRow && (
            <div
              data-action-ui-id="canvas.image-node.split-actions"
              className="pointer-events-none flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100"
            >
              {showSplitAll && <SplitAllButton onSplitAll={onSplitAll} disabled={false} />}
              {showSplitMain && <SplitMainButton onSplitMain={onSplitMain} disabled={false} />}
            </div>
          )}
        </div>
      )}
    </>
  );
});
export const presets = [
  {
    id: "26",
    title: "沙丘救赎",
    category: "portrait",
    thumbUrl:
      "https://cdn.hailuoai.video/moss/prod/2026-03-13-18/tool/1773397248746119935-Dune_Oasis.png?x-oss-process=image/resize,w_240/format,webp",
    videoUrl:
      "https://cdn.hailuoai.video/moss/prod/2026-03-13-18/tool/1773397245847883419-Dune_Oasis.mp4",
    rawPrompt:
      '[{"id":"setting","data":"{\\"background\\":\\"default\\",\\"effect\\":\\"Dune Oasis\\"}","files":[]},{"id":"light1","data":"{\\"lightType\\":\\"spotlight\\",\\"kelvin\\":\\"1800K\\",\\"lightness\\":\\"7.3\\",\\"azimuth\\":\\"-135°\\",\\"elevation\\":\\"45°\\"}","files":[]}]',
    parsed: [
      {
        id: "setting",
        data: '{"background":"default","effect":"Dune Oasis"}',
        files: [],
      },
      {
        id: "light1",
        data: '{"lightType":"spotlight","kelvin":"1800K","lightness":"7.3","azimuth":"-135°","elevation":"45°"}',
        files: [],
      },
    ],
  },
  {
    id: "27",
    title: "王家卫迷幻",
    category: "portrait",
    thumbUrl:
      "https://cdn.hailuoai.video/moss/prod/2026-03-13-18/tool/1773397373418296942-Wong_Kar-wai.png?x-oss-process=image/resize,w_240/format,webp",
    videoUrl:
      "https://cdn.hailuoai.video/moss/prod/2026-03-13-18/tool/1773397369406881449-Wong_Kar-wai.mp4",
    rawPrompt:
      '[{"id":"setting","data":"{\\"background\\":\\"default\\",\\"effect\\":\\"Wong Kar-wai\\"}","files":[]},{"id":"light1","data":"{\\"lightType\\":\\"directionalLight\\",\\"color\\":\\"#52BDFF\\",\\"lightness\\":\\"5.0\\",\\"azimuth\\":\\"90°\\",\\"elevation\\":\\"0°\\"}","files":[]}]',
    parsed: [
      {
        id: "setting",
        data: '{"background":"default","effect":"Wong Kar-wai"}',
        files: [],
      },
      {
        id: "light1",
        data: '{"lightType":"directionalLight","color":"#52BDFF","lightness":"5.0","azimuth":"90°","elevation":"0°"}',
        files: [],
      },
    ],
  },
  {
    id: "28",
    title: "银翼杀手",
    category: "portrait",
    thumbUrl:
      "https://cdn.hailuoai.video/moss/prod/2026-03-14-16/tool/1773475268214292833-Blade_Runner.png?x-oss-process=image/resize,w_240/format,webp",
    videoUrl:
      "https://cdn.hailuoai.video/moss/prod/2026-03-14-16/tool/1773475261936312856-Blade_Runner.mp4",
    rawPrompt:
      '[{"id":"setting","data":"{\\"background\\":\\"default\\",\\"effect\\":\\"Blade Runner\\"}","files":[]},{"id":"light1","data":"{\\"lightType\\":\\"spotlight\\",\\"color\\":\\"#FF00EE\\",\\"lightness\\":\\"7.0\\",\\"azimuth\\":\\"-55°\\",\\"elevation\\":\\"-10°\\"}","files":[]},{"id":"light2","data":"{\\"lightType\\":\\"spotlight\\",\\"color\\":\\"#1A33FF\\",\\"lightness\\":\\"7.0\\",\\"azimuth\\":\\"55°\\",\\"elevation\\":\\"-10°\\"}","files":[]}]',
    parsed: [
      {
        id: "setting",
        data: '{"background":"default","effect":"Blade Runner"}',
        files: [],
      },
      {
        id: "light1",
        data: '{"lightType":"spotlight","color":"#FF00EE","lightness":"7.0","azimuth":"-55°","elevation":"-10°"}',
        files: [],
      },
      {
        id: "light2",
        data: '{"lightType":"spotlight","color":"#1A33FF","lightness":"7.0","azimuth":"55°","elevation":"-10°"}',
        files: [],
      },
    ],
  },
  {
    id: "29",
    title: "老钱庄园",
    category: "portrait",
    thumbUrl:
      "https://cdn.hailuoai.video/moss/prod/2026-03-13-18/tool/1773397334743027789-Succession_Pro.png?x-oss-process=image/resize,w_240/format,webp",
    videoUrl:
      "https://cdn.hailuoai.video/moss/prod/2026-03-13-18/tool/1773397330081877635-Succession_Pro.mp4",
    rawPrompt:
      '[{"id":"setting","data":"{\\"background\\":\\"default\\",\\"effect\\":\\"Succession\\"}","files":[]},{"id":"light1","data":"{\\"lightType\\":\\"directionalLight\\",\\"kelvin\\":\\"3200K\\",\\"lightness\\":\\"4.7\\",\\"azimuth\\":\\"45°\\",\\"elevation\\":\\"45°\\"}","files":[]}]',
    parsed: [
      {
        id: "setting",
        data: '{"background":"default","effect":"Succession"}',
        files: [],
      },
      {
        id: "light1",
        data: '{"lightType":"directionalLight","kelvin":"3200K","lightness":"4.7","azimuth":"45°","elevation":"45°"}',
        files: [],
      },
    ],
  },
  {
    id: "30",
    title: "布达佩斯童话",
    category: "portrait",
    thumbUrl:
      "https://cdn.hailuoai.video/moss/prod/2026-03-13-18/tool/1773397364753288195-Wes_Pink.png?x-oss-process=image/resize,w_240/format,webp",
    videoUrl:
      "https://cdn.hailuoai.video/moss/prod/2026-03-13-18/tool/1773397361732567108-Wes_Pink.mp4",
    rawPrompt:
      '[{"id":"setting","data":"{\\"background\\":\\"default\\",\\"effect\\":\\"Wes Pink\\"}","files":[]},{"id":"light1","data":"{\\"lightType\\":\\"rectAreaLight\\",\\"kelvin\\":\\"3000K\\",\\"lightness\\":\\"4.3\\",\\"azimuth\\":\\"0°\\",\\"elevation\\":\\"0°\\"}","files":[]}]',
    parsed: [
      {
        id: "setting",
        data: '{"background":"default","effect":"Wes Pink"}',
        files: [],
      },
      {
        id: "light1",
        data: '{"lightType":"rectAreaLight","kelvin":"3000K","lightness":"4.3","azimuth":"0°","elevation":"0°"}',
        files: [],
      },
    ],
  },
  {
    id: "31",
    title: "迷失东京",
    category: "portrait",
    thumbUrl:
      "https://cdn.hailuoai.video/moss/prod/2026-03-13-18/tool/1773397273300600737-Lost_in_Tokyo.png?x-oss-process=image/resize,w_240/format,webp",
    videoUrl:
      "https://cdn.hailuoai.video/moss/prod/2026-03-13-18/tool/1773397269256326716-Lost_in_Tokyo.mp4",
    rawPrompt:
      '[{"id":"setting","data":"{\\"background\\":\\"default\\",\\"effect\\":\\"Lost in Translation\\"}","files":[]},{"id":"light1","data":"{\\"lightType\\":\\"directionalLight\\",\\"kelvin\\":\\"8500K\\",\\"lightness\\":\\"4.0\\",\\"azimuth\\":\\"90°\\",\\"elevation\\":\\"15°\\"}","files":[]}]',
    parsed: [
      {
        id: "setting",
        data: '{"background":"default","effect":"Lost in Translation"}',
        files: [],
      },
      {
        id: "light1",
        data: '{"lightType":"directionalLight","kelvin":"8500K","lightness":"4.0","azimuth":"90°","elevation":"15°"}',
        files: [],
      },
    ],
  },
  {
    id: "32",
    title: "怪奇物语",
    category: "portrait",
    thumbUrl:
      "https://cdn.hailuoai.video/moss/prod/2026-03-13-18/tool/1773397325663283967-Stranger_Glow.png?x-oss-process=image/resize,w_240/format,webp",
    videoUrl:
      "https://cdn.hailuoai.video/moss/prod/2026-03-13-18/tool/1773397321587514353-Stranger_Glow.mp4",
    rawPrompt:
      '[{"id":"setting","data":"{\\"background\\":\\"default\\",\\"effect\\":\\"Stranger Things\\"}","files":[]},{"id":"light1","data":"{\\"lightType\\":\\"directionalLight\\",\\"color\\":\\"#8c0000\\",\\"lightness\\":\\"7.0\\",\\"azimuth\\":\\"90°\\",\\"elevation\\":\\"0°\\"}","files":[]},{"id":"light2","data":"{\\"lightType\\":\\"spotlight\\",\\"color\\":\\"#0084FF\\",\\"lightness\\":\\"7.0\\",\\"azimuth\\":\\"-125°\\",\\"elevation\\":\\"50°\\"}","files":[]}]',
    parsed: [
      {
        id: "setting",
        data: '{"background":"default","effect":"Stranger Things"}',
        files: [],
      },
      {
        id: "light1",
        data: '{"lightType":"directionalLight","color":"#8c0000","lightness":"7.0","azimuth":"90°","elevation":"0°"}',
        files: [],
      },
      {
        id: "light2",
        data: '{"lightType":"spotlight","color":"#0084FF","lightness":"7.0","azimuth":"-125°","elevation":"50°"}',
        files: [],
      },
    ],
  },
  {
    id: "33",
    title: "日落大道",
    category: "portrait",
    thumbUrl:
      "https://cdn.hailuoai.video/moss/prod/2026-03-13-18/tool/1773397343361515897-Sunset_Blvd.png?x-oss-process=image/resize,w_240/format,webp",
    videoUrl:
      "https://cdn.hailuoai.video/moss/prod/2026-03-13-18/tool/1773397339125592972-Sunset_Blvd.mp4",
    rawPrompt:
      '[{"id":"setting","data":"{\\"background\\":\\"default\\",\\"effect\\":\\"Sunset Boulevard\\"}","files":[]},{"id":"light1","data":"{\\"lightType\\":\\"spotlight\\",\\"kelvin\\":\\"2200K\\",\\"lightness\\":\\"6.0\\",\\"azimuth\\":\\"180°\\",\\"elevation\\":\\"10°\\"}","files":[]}]',
    parsed: [
      {
        id: "setting",
        data: '{"background":"default","effect":"Sunset Boulevard"}',
        files: [],
      },
      {
        id: "light1",
        data: '{"lightType":"spotlight","kelvin":"2200K","lightness":"6.0","azimuth":"180°","elevation":"10°"}',
        files: [],
      },
    ],
  },
  {
    id: "34",
    title: "教父暗影",
    category: "portrait",
    thumbUrl:
      "https://cdn.hailuoai.video/moss/prod/2026-03-13-18/tool/1773397254709947498-Godfather_Noir.png?x-oss-process=image/resize,w_240/format,webp",
    videoUrl:
      "https://cdn.hailuoai.video/moss/prod/2026-03-13-18/tool/1773397251781985378-Godfather_Noir.mp4",
    rawPrompt:
      '[{"id":"setting","data":"{\\"background\\":\\"default\\",\\"effect\\":\\"Godfather\\"}","files":[]},{"id":"light1","data":"{\\"lightType\\":\\"rectAreaLight\\",\\"kelvin\\":\\"3200K\\",\\"lightness\\":\\"8.0\\",\\"azimuth\\":\\"0°\\",\\"elevation\\":\\"90°\\"}","files":[]}]',
    parsed: [
      {
        id: "setting",
        data: '{"background":"default","effect":"Godfather"}',
        files: [],
      },
      {
        id: "light1",
        data: '{"lightType":"rectAreaLight","kelvin":"3200K","lightness":"8.0","azimuth":"0°","elevation":"90°"}',
        files: [],
      },
    ],
  },
  {
    id: "35",
    title: "奥本海默灰",
    category: "portrait",
    thumbUrl:
      "https://cdn.hailuoai.video/moss/prod/2026-03-13-18/tool/1773397291517266540-Oppie_Gradient.png?x-oss-process=image/resize,w_240/format,webp",
    videoUrl:
      "https://cdn.hailuoai.video/moss/prod/2026-03-13-18/tool/1773397288527887951-Oppie_Gradient.mp4",
    rawPrompt:
      '[{"id":"setting","data":"{\\"background\\":\\"default\\",\\"effect\\":\\"Oppie Monochrom\\"}","files":[]},{"id":"light1","data":"{\\"lightType\\":\\"rectAreaLight\\",\\"kelvin\\":\\"5000K\\",\\"lightness\\":\\"5.8\\",\\"azimuth\\":\\"90°\\",\\"elevation\\":\\"45°\\"}","files":[]}]',
    parsed: [
      {
        id: "setting",
        data: '{"background":"default","effect":"Oppie Monochrom"}',
        files: [],
      },
      {
        id: "light1",
        data: '{"lightType":"rectAreaLight","kelvin":"5000K","lightness":"5.8","azimuth":"90°","elevation":"45°"}',
        files: [],
      },
    ],
  },
  {
    id: "36",
    title: "流体反光",
    category: "product",
    thumbUrl:
      "https://cdn.hailuoai.video/moss/prod/2026-03-19-17/tool/1773911687493231661-Liquid_Gold-1773828722881.png?x-oss-process=image/resize,w_240/format,webp",
    videoUrl:
      "https://cdn.hailuoai.video/moss/prod/2026-03-19-17/tool/1773911692112069740-Liquid_Gold.mp4",
    rawPrompt:
      '[{"id":"setting","data":"{\\"background\\":\\"default\\",\\"effect\\":\\"Liquid Gold\\"}","files":[]},{"id":"light1","data":"{\\"lightType\\":\\"spotlight\\",\\"kelvin\\":\\"2000K\\",\\"lightness\\":\\"7.0\\",\\"azimuth\\":\\"180°\\",\\"elevation\\":\\"0°\\"}","files":[]}]',
    parsed: [
      {
        id: "setting",
        data: '{"background":"default","effect":"Liquid Gold"}',
        files: [],
      },
      {
        id: "light1",
        data: '{"lightType":"spotlight","kelvin":"2000K","lightness":"7.0","azimuth":"180°","elevation":"0°"}',
        files: [],
      },
    ],
  },
  {
    id: "37",
    title: "锐利金属",
    category: "product",
    thumbUrl:
      "https://cdn.hailuoai.video/moss/prod/2026-03-19-17/tool/1773911694672529139-Metallic_Sharp-1773828899696.png?x-oss-process=image/resize,w_240/format,webp",
    videoUrl:
      "https://cdn.hailuoai.video/moss/prod/2026-03-19-17/tool/1773911698462025720-Metallic_Sharp.mp4",
    rawPrompt:
      '[{"id":"setting","data":"{\\"background\\":\\"default\\",\\"effect\\":\\"Metallic Sharp\\"}","files":[]},{"id":"light1","data":"{\\"lightType\\":\\"spotlight\\",\\"kelvin\\":\\"10000K\\",\\"lightness\\":\\"7.7\\",\\"azimuth\\":\\"180°\\",\\"elevation\\":\\"0°\\"}","files":[]}]',
    parsed: [
      {
        id: "setting",
        data: '{"background":"default","effect":"Metallic Sharp"}',
        files: [],
      },
      {
        id: "light1",
        data: '{"lightType":"spotlight","kelvin":"10000K","lightness":"7.7","azimuth":"180°","elevation":"0°"}',
        files: [],
      },
    ],
  },
  {
    id: "38",
    title: "丝绒柔光",
    category: "product",
    thumbUrl:
      "https://cdn.hailuoai.video/moss/prod/2026-03-19-17/tool/1773911725351108426-Velvet_Skin-1773828715220.png?x-oss-process=image/resize,w_240/format,webp",
    videoUrl:
      "https://cdn.hailuoai.video/moss/prod/2026-03-19-17/tool/1773911728085357615-Velvet_Skin.mp4",
    rawPrompt:
      '[{"id":"setting","data":"{\\"background\\":\\"default\\",\\"effect\\":\\"Velvet Skin\\"}","files":[]},{"id":"light1","data":"{\\"lightType\\":\\"rectAreaLight\\",\\"kelvin\\":\\"4500K\\",\\"lightness\\":\\"5.0\\",\\"azimuth\\":\\"45°\\",\\"elevation\\":\\"45°\\"}","files":[]}]',
    parsed: [
      {
        id: "setting",
        data: '{"background":"default","effect":"Velvet Skin"}',
        files: [],
      },
      {
        id: "light1",
        data: '{"lightType":"rectAreaLight","kelvin":"4500K","lightness":"5.0","azimuth":"45°","elevation":"45°"}',
        files: [],
      },
    ],
  },
  {
    id: "39",
    title: "轮廓圣光",
    category: "product",
    thumbUrl:
      "https://cdn.hailuoai.video/moss/prod/2026-03-19-17/tool/1773911713132700382-Rim_Light_Halo-1773828712040.png?x-oss-process=image/resize,w_240/format,webp",
    videoUrl:
      "https://cdn.hailuoai.video/moss/prod/2026-03-19-17/tool/1773911716163414223-Rim_Light_Halo.mp4",
    rawPrompt:
      '[{"id":"setting","data":"{\\"background\\":\\"default\\",\\"effect\\":\\"Rim Light Halo\\"}","files":[]},{"id":"light1","data":"{\\"lightType\\":\\"spotlight\\",\\"kelvin\\":\\"4500K\\",\\"lightness\\":\\"8.0\\",\\"azimuth\\":\\"180°\\",\\"elevation\\":\\"30°\\"}","files":[]}]',
    parsed: [
      {
        id: "setting",
        data: '{"background":"default","effect":"Rim Light Halo"}',
        files: [],
      },
      {
        id: "light1",
        data: '{"lightType":"spotlight","kelvin":"4500K","lightness":"8.0","azimuth":"180°","elevation":"30°"}',
        files: [],
      },
    ],
  },
  {
    id: "40",
    title: "纹理质感",
    category: "product",
    thumbUrl:
      "https://cdn.hailuoai.video/moss/prod/2026-03-19-17/tool/1773911681490950719-Dramatized_Texture-1773828708549.png?x-oss-process=image/resize,w_240/format,webp",
    videoUrl:
      "https://cdn.hailuoai.video/moss/prod/2026-03-19-17/tool/1773911684775459735-Dramatized_Texture.mp4",
    rawPrompt:
      '[{"id":"setting","data":"{\\"background\\":\\"default\\",\\"effect\\":\\"Dramatized Texture\\"}","files":[]},{"id":"light1","data":"{\\"lightType\\":\\"spotlight\\",\\"kelvin\\":\\"5000K\\",\\"lightness\\":\\"6.7\\",\\"azimuth\\":\\"90°\\",\\"elevation\\":\\"0°\\"}","files":[]}]',
    parsed: [
      {
        id: "setting",
        data: '{"background":"default","effect":"Dramatized Texture"}',
        files: [],
      },
      {
        id: "light1",
        data: '{"lightType":"spotlight","kelvin":"5000K","lightness":"6.7","azimuth":"90°","elevation":"0°"}',
        files: [],
      },
    ],
  },
  {
    id: "41",
    title: "商业蝴蝶光",
    category: "product",
    thumbUrl:
      "https://cdn.hailuoai.video/moss/prod/2026-03-19-17/tool/1773911667566290313-Butterfly_Product-1773828698848.png?x-oss-process=image/resize,w_240/format,webp",
    videoUrl:
      "https://cdn.hailuoai.video/moss/prod/2026-03-19-17/tool/1773911672888056072-Butterfly_Product.mp4",
    rawPrompt:
      '[{"id":"setting","data":"{\\"background\\":\\"default\\",\\"effect\\":\\"Butterfly Product\\"}","files":[]},{"id":"light1","data":"{\\"lightType\\":\\"rectAreaLight\\",\\"kelvin\\":\\"5500K\\",\\"lightness\\":\\"5.7\\",\\"azimuth\\":\\"0°\\",\\"elevation\\":\\"58°\\"}","files":[]}]',
    parsed: [
      {
        id: "setting",
        data: '{"background":"default","effect":"Butterfly Product"}',
        files: [],
      },
      {
        id: "light1",
        data: '{"lightType":"rectAreaLight","kelvin":"5500K","lightness":"5.7","azimuth":"0°","elevation":"58°"}',
        files: [],
      },
    ],
  },
  {
    id: "42",
    title: "产品聚光",
    category: "product",
    thumbUrl:
      "https://cdn.hailuoai.video/moss/prod/2026-03-19-17/tool/1773911707411946788-Product_Spotlight-1773828695679.png?x-oss-process=image/resize,w_240/format,webp",
    videoUrl:
      "https://cdn.hailuoai.video/moss/prod/2026-03-19-17/tool/1773911710554866795-Product_Spotlight.mp4",
    rawPrompt:
      '[{"id":"setting","data":"{\\"background\\":\\"default\\",\\"effect\\":\\"Product Spotlight\\"}","files":[]},{"id":"light1","data":"{\\"lightType\\":\\"spotlight\\",\\"kelvin\\":\\"5600K\\",\\"lightness\\":\\"7.3\\",\\"azimuth\\":\\"45°\\",\\"elevation\\":\\"90°\\"}","files":[]}]',
    parsed: [
      {
        id: "setting",
        data: '{"background":"default","effect":"Product Spotlight"}',
        files: [],
      },
      {
        id: "light1",
        data: '{"lightType":"spotlight","kelvin":"5600K","lightness":"7.3","azimuth":"45°","elevation":"90°"}',
        files: [],
      },
    ],
  },
  {
    id: "43",
    title: "香槟金高光",
    category: "product",
    thumbUrl:
      "https://cdn.hailuoai.video/moss/prod/2026-03-19-17/tool/1773911675791926813-Champagne_Glow-1773828693909.png?x-oss-process=image/resize,w_240/format,webp",
    videoUrl:
      "https://cdn.hailuoai.video/moss/prod/2026-03-19-17/tool/1773911679078490595-Champagne_Glow.mp4",
    rawPrompt:
      '[{"id":"setting","data":"{\\"background\\":\\"default\\",\\"effect\\":\\"Champagne Glow\\"}","files":[]},{"id":"light1","data":"{\\"lightType\\":\\"rectAreaLight\\",\\"kelvin\\":\\"3000K\\",\\"lightness\\":\\"6.0\\",\\"azimuth\\":\\"135°\\",\\"elevation\\":\\"45°\\"}","files":[]}]',
    parsed: [
      {
        id: "setting",
        data: '{"background":"default","effect":"Champagne Glow"}',
        files: [],
      },
      {
        id: "light1",
        data: '{"lightType":"rectAreaLight","kelvin":"3000K","lightness":"6.0","azimuth":"135°","elevation":"45°"}',
        files: [],
      },
    ],
  },
  {
    id: "44",
    title: "对称棚光",
    category: "product",
    thumbUrl:
      "https://cdn.hailuoai.video/moss/prod/2026-03-19-17/tool/1773911718630293683-Symmetry_Studio-1773828691256.png?x-oss-process=image/resize,w_240/format,webp",
    videoUrl:
      "https://cdn.hailuoai.video/moss/prod/2026-03-19-17/tool/1773911722908821191-Symmetry_Studio.mp4",
    rawPrompt:
      '[{"id":"setting","data":"{\\"background\\":\\"default\\",\\"effect\\":\\"Symmetry Studio\\"}","files":[]},{"id":"light1","data":"{\\"lightType\\":\\"spotlight\\",\\"kelvin\\":\\"5600K\\",\\"lightness\\":\\"5.7\\",\\"azimuth\\":\\"90°\\",\\"elevation\\":\\"0°\\"}","files":[]},{"id":"light2","data":"{\\"lightType\\":\\"spotlight\\",\\"kelvin\\":\\"5600K\\",\\"lightness\\":\\"5.7\\",\\"azimuth\\":\\"-90°\\",\\"elevation\\":\\"0°\\"}","files":[]}]',
    parsed: [
      {
        id: "setting",
        data: '{"background":"default","effect":"Symmetry Studio"}',
        files: [],
      },
      {
        id: "light1",
        data: '{"lightType":"spotlight","kelvin":"5600K","lightness":"5.7","azimuth":"90°","elevation":"0°"}',
        files: [],
      },
      {
        id: "light2",
        data: '{"lightType":"spotlight","kelvin":"5600K","lightness":"5.7","azimuth":"-90°","elevation":"0°"}',
        files: [],
      },
    ],
  },
  {
    id: "45",
    title: "光学焦散",
    category: "product",
    thumbUrl:
      "https://cdn.hailuoai.video/moss/prod/2026-03-19-17/tool/1773911701566370153-Optical_Caustics-1773828685794.png?x-oss-process=image/resize,w_240/format,webp",
    videoUrl:
      "https://cdn.hailuoai.video/moss/prod/2026-03-19-17/tool/1773911704822326404-Optical_Caustics.mp4",
    rawPrompt:
      '[{"id":"setting","data":"{\\"background\\":\\"default\\",\\"effect\\":\\"Optical Caustics\\"}","files":[]},{"id":"light1","data":"{\\"lightType\\":\\"rectAreaLight\\",\\"kelvin\\":\\"7500K\\",\\"lightness\\":\\"6.3\\",\\"azimuth\\":\\"120°\\",\\"elevation\\":\\"45°\\"}","files":[]}]',
    parsed: [
      {
        id: "setting",
        data: '{"background":"default","effect":"Optical Caustics"}',
        files: [],
      },
      {
        id: "light1",
        data: '{"lightType":"rectAreaLight","kelvin":"7500K","lightness":"6.3","azimuth":"120°","elevation":"45°"}',
        files: [],
      },
    ],
  },
];
