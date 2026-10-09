// image-slot-body.jsx
import { CircleAlert$2, reactExports, useTranslation } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { isGenerationRefundStatus } from "../canvas/compute-group-bounds-from-children.js";
import { RefundHint } from "../generation/missing-asset-card.jsx";
import {
  appendCanvasFileVersion,
  usePathFileVersion,
} from "../infra/use-plugin-metadata-store.js";
import { useAssetMeta } from "./package.jsx";
import { GeneratingMediaArea } from "../canvas/generating-media-area.jsx";
import { MediaGenerationErrorOverlay } from "../generation/media-generation-error-overlay.jsx";
import { CanvasImage } from "./canvas-image.jsx";
import { resolveGifAnimationSrc } from "./base-backend.jsx";

function ImageSlotErrorTile({
  message: message2,
  recoverable = false,
  uncertain = false,
  refundStatus,
  refundedCredits,
}) {
  const { t: t2 } = useTranslation();
  const neutralDescription = recoverable
    ? t2(
        "canvas.generationRecovery.description",
        "原任务已保留，结果将在恢复后自动回填。",
      )
    : uncertain
      ? t2(
          "canvas.generationStatusUnknown.description",
          "生成请求未能完成，系统不会自动重试。",
        )
      : void 0;
  const text2 =
    neutralDescription ??
    message2 ??
    t2("canvas.multiImage.slotErrorGeneric", "生成失败");
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
        className={
          recoverable
            ? "shrink-0 text-muted-foreground"
            : "shrink-0 text-destructive"
        }
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
  if (
    status === "error" ||
    status === "recoverable_error" ||
    status === "status_unknown"
  ) {
    const message2 = overrideError ?? slot.error ?? null;
    if (errorVariant === "compact") {
      return (
        <ImageSlotErrorTile
          message={message2}
          recoverable={status === "recoverable_error"}
          uncertain={status === "status_unknown"}
          refundStatus={slot.refundDisplayOwner ? slot.refundStatus : void 0}
          refundedCredits={
            slot.refundDisplayOwner ? slot.refundedCredits : void 0
          }
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
