// create-tracker.jsx
import { reactExports, CompositedSvg, TooltipRoot, TooltipTrigger$1, TooltipPortal, TooltipPositioner, TooltipPopup, useTranslation, CircleAlert, TriangleAlert, Loader2, X$7, Check, useReactFlow, useNodesData, classifyFileType } from "../vendor.js";
import { ModelRegistryStoreContext, looksLikeHtml, stripErrorHtml, TooltipProvider$1, useModelForAsset, FileTypeIcon } from "../infra/create-recently-added-store.jsx";
import { isGenerationRefundStatus } from "../canvas/group-nodes-in-canvas.js";
import { Trash2, useCanvasBridge, useCanvasActions, useGeneratingStateStore, ImageOffOutlineIcon } from "../media-editing/parse-item.jsx";
import { classifyRawErrorText, GENERATE_ERROR_CODE_CONCURRENCY_LIMIT } from "./push-inline.js";
import { cn$5 } from "../infra/use-browser-overlay-dialog-props.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { FeedbackIcon$1, RetryIcon$1 } from "../canvas/generating-media-area.jsx";
const PLACEHOLDER_MODEL_I18N_KEYS = {
  "Super Resolution": {
    key: "canvas.superResolution.label",
  },
  Erase: {
    key: "canvas.erase",
  },
  Redraw: {
    key: "canvas.redraw.label",
  },
  Outpaint: {
    key: "canvas.outpaint",
  },
  "Move Object": {
    key: "canvas.moveObject.label",
  },
  "Remove Background": {
    key: "canvas.removeBg.label",
  },
  "seedream-5-layer-decompose": {
    key: "canvas.layerDecompose.label",
    fallback: "Layer Decompose",
  },
  // MediaKit video actions — gateway services persist the raw cloud-side
  // model id (kebab-case) into placeholder.data.model. Map to the user-
  // facing UI label so the loading caption reads "高清 & 补帧" /
  // "字幕消除" instead of the raw model id. Constants tracked in
  // app/gateway/src/edit/{enhance-video,erase-subtitle}-mediakit.service.ts
  // and app/gateway/src/edit/{asr-mediakit,asr-whisper}.service.ts.
  "mediakit-enhance-video": {
    key: "canvas.enhanceVideo.label",
    fallback: "高清 & 补帧",
  },
  "mediakit-erase-subtitle": {
    key: "canvas.eraseSubtitle.label",
    fallback: "字幕消除",
  },
  "mediakit-asr": {
    key: "canvas.asr.label",
    fallback: "字幕生成",
  },
  "whisper-asr": {
    key: "canvas.asr.label",
    fallback: "字幕生成",
  },
};
export function translateModelName(model, t2) {
  if (!model) return model;
  const entry = PLACEHOLDER_MODEL_I18N_KEYS[model];
  if (!entry) return model;
  return t2(entry.key, {
    defaultValue: entry.fallback ?? model,
  });
}
export function ModelRegistryStoreProvider({ store, children: children2 }) {
  return reactExports.createElement(
    ModelRegistryStoreContext.Provider,
    {
      value: store,
    },
    children2,
  );
}
export function Tooltip$1({
  content: content2,
  children: children2,
  side = "top",
  sideOffset = 6,
  className,
  closeOnClick,
  open,
}) {
  const generatedId = reactExports.useId();
  const triggerId = children2.props.id ?? generatedId;
  if (!content2) return children2;
  return (
    <TooltipRoot
      open={open}
      triggerId={open === void 0 ? void 0 : triggerId}
      disableHoverablePopup={true}
    >
      <TooltipTrigger$1
        id={open === void 0 ? void 0 : triggerId}
        closeOnClick={closeOnClick}
        render={children2}
      />
      <TooltipPortal>
        <TooltipPositioner
          className="pointer-events-none z-[10020]"
          side={side}
          sideOffset={sideOffset}
        >
          <TooltipPopup
            role="tooltip"
            className={cn$5(
              "inline-flex w-fit max-w-xs items-center gap-1.5 rounded-sm bg-foreground text-background px-3 py-1.5 text-xs outline-none dp-motion-quick-zoom",
              className,
              "pointer-events-none select-none",
            )}
          >
            {content2}
          </TooltipPopup>
        </TooltipPositioner>
      </TooltipPortal>
    </TooltipRoot>
  );
}
export function TokenIcon$2({ size: size2 = 14 }) {
  return (
    <CompositedSvg
      width={size2}
      height={size2}
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M6.52105 2L7.25885 6.2093L4.80361 2.71115L2.71115 4.80361L6.2093 7.25885L2 6.52111V9.47895L6.2093 8.74115L2.71115 11.1964L4.80361 13.2889L7.25885 9.7907L6.52105 14H9.47889L8.74108 9.7907L11.1964 13.2889L13.2889 11.1964L9.7907 8.74115L14 9.47895V6.52111L9.7907 7.25885L13.2889 4.80361L11.1964 2.71115L8.74108 6.2093L9.47889 2H6.52105Z"
      />
    </CompositedSvg>
  );
}
export function CreditCostBadge({ cost, className, compact = false }) {
  if (cost == null) return null;
  return (
    <span
      data-slot="credit-cost-badge"
      className={`inline-flex items-center gap-1 whitespace-nowrap text-sm tracking-tight${compact ? " h-8 shrink-0 text-[13px] text-[var(--canvas-controls-text,#fff)]/70" : ""}${className ? ` ${className}` : ""}`}
    >
      <TokenIcon$2 />
      <span
        className={compact ? "pointer-events-none tabular-nums" : void 0}
        data-action-ui-id="image-edit.credit-cost"
      >
        {cost}
      </span>
    </span>
  );
}
function ErrorHtmlContent({ html: html2 }) {
  if (!html2) return null;
  if (!looksLikeHtml(html2)) {
    return <span>{html2}</span>;
  }
  return (
    <span
      dangerouslySetInnerHTML={{
        __html: html2,
      }}
      onClick={handleAnchorClick}
    />
  );
}
function handleAnchorClick(e2) {
  const target = e2.target;
  if (target?.tagName === "A") {
    e2.stopPropagation();
  }
}
const RAW_ERROR_CLASS_I18N$2 = {
  concurrency: "canvas.errors.concurrency",
  interrupted: "canvas.errors.interrupted",
  timeout: "canvas.errors.timeout",
  network: "canvas.errors.network",
  storage: "canvas.errors.storage",
  technical: "canvas.errors.technical",
};
const UNCERTAIN_REASON_I18N = {
  concurrency: "canvas.generationStatusUnknown.reason.concurrency",
  interrupted: "canvas.generationStatusUnknown.reason.interrupted",
  timeout: "canvas.generationStatusUnknown.reason.timeout",
  network: "canvas.generationStatusUnknown.reason.network",
  storage: "canvas.generationStatusUnknown.reason.storage",
  technical: "canvas.generationStatusUnknown.reason.technical",
};
const ERROR_ACTION_BUTTON_CLASS =
  "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-foreground/10 bg-foreground/[0.04] px-2.5 text-xs font-medium text-foreground/70 transition-colors hover:bg-foreground/[0.08] hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50";
const ERROR_ACTION_ICON_CLASS = "size-3.5 shrink-0";
export function RefundHint({ refundStatus, refundedCredits, compact = false }) {
  const { t: t2 } = useTranslation();
  if (!isGenerationRefundStatus(refundStatus)) return null;
  return (
    <span
      className={
        compact
          ? "inline-flex max-w-full items-center gap-1 rounded-md bg-foreground/[0.06] px-2 py-1 text-[9px] font-medium text-foreground/80"
          : "inline-flex items-center gap-1.5 rounded-md bg-foreground/[0.06] px-3 py-1.5 text-xs font-medium text-foreground/80"
      }
      data-action-ui-id="canvas.media-error.refund-hint"
    >
      <TokenIcon$2 size={compact ? 11 : 13} />
      <span className="truncate">
        {refundStatus === "refunded"
          ? refundedCredits && refundedCredits > 0
            ? t2("canvas.refundHint.refundedWithAmount", {
                count: refundedCredits,
                defaultValue: "已退还 {{count}} 积分",
              })
            : t2("canvas.refundHint.refundedNoAmount", {
                defaultValue: "积分已退还",
              })
          : refundStatus === "pending"
            ? t2("canvas.refundHint.pending", {
                defaultValue: "积分退还处理中",
              })
            : t2("canvas.refundHint.notCharged", {
                defaultValue: "未扣款",
              })}
      </span>
    </span>
  );
}
export function MediaErrorCard({
  errorMessage: errorMessage2,
  displayModel,
  onDelete,
  onReport,
  reportStatus = "idle",
  variant = "failed",
  onRetry,
  retrying = false,
  onCancel,
  cancelling = false,
  onDismissUnknown,
  dismissing = false,
  uncertainDescription,
  refundStatus,
  refundedCredits,
}) {
  const { t: t2 } = useTranslation();
  const plainError = stripErrorHtml(errorMessage2);
  const rawClass = classifyRawErrorText(plainError);
  const isConcurrencyLimit = variant === "concurrency_limit" || rawClass === "concurrency";
  const isRecoverable = variant === "recoverable";
  const isUncertain = variant === "uncertain";
  const title = isRecoverable
    ? t2("canvas.generationRecovery.title")
    : isConcurrencyLimit
      ? t2("canvas.concurrencyLimit.title")
      : t2("canvas.generationFailed");
  const iconLabel = isRecoverable
    ? title
    : isConcurrencyLimit
      ? t2("canvas.concurrencyLimit.title")
      : t2("common.error");
  const stateDescription = isRecoverable
    ? t2("canvas.generationRecovery.description")
    : isUncertain
      ? (uncertainDescription ?? t2("canvas.generationStatusUnknown.description"))
      : void 0;
  const displayError =
    stateDescription ?? (rawClass ? t2(RAW_ERROR_CLASS_I18N$2[rawClass]) : errorMessage2);
  const plainDisplayError = stripErrorHtml(displayError);
  const uncertainReason = isUncertain && rawClass ? t2(UNCERTAIN_REASON_I18N[rawClass]) : void 0;
  const tooltipText = uncertainReason
    ? `${plainDisplayError}
${uncertainReason}`
    : plainDisplayError;
  const showRefundHint =
    !isConcurrencyLimit && !isRecoverable && !isUncertain && isGenerationRefundStatus(refundStatus);
  return (
    <div className="relative w-full h-full min-h-[216px] flex flex-col overflow-hidden rounded-lg bg-[var(--canvas-node-bg)]">
      <div className="w-full flex-1 min-h-0 flex flex-col items-center justify-center gap-3 px-6 py-6 text-center">
        {isRecoverable ? (
          <RetryIcon$1
            size={32}
            className="text-muted-foreground"
            role="img"
            aria-label={iconLabel}
          />
        ) : isConcurrencyLimit ? (
          <CircleAlert
            size={32}
            strokeWidth={1.75}
            className="text-muted-foreground"
            role="img"
            aria-label={iconLabel}
          />
        ) : (
          <TriangleAlert
            size={32}
            strokeWidth={1.75}
            className="text-destructive"
            role="img"
            aria-label={iconLabel}
          />
        )}
        <div className="flex max-w-full flex-col items-center gap-1.5">
          <span
            className={`text-[18px] leading-6 font-medium ${isConcurrencyLimit || isRecoverable ? "text-foreground" : "text-destructive"}`}
          >
            {title}
          </span>
          {plainDisplayError ? (
            <TooltipProvider$1 delay={300} closeDelay={0}>
              <Tooltip$1
                content={tooltipText}
                className="max-w-[360px] whitespace-pre-wrap break-words leading-[1.5]"
              >
                <span className="max-w-full cursor-default line-clamp-2 whitespace-pre-wrap break-words text-center text-xs leading-5 text-muted-foreground">
                  <ErrorHtmlContent html={displayError} />
                </span>
              </Tooltip$1>
            </TooltipProvider$1>
          ) : null}
          {uncertainReason ? (
            <span className="max-w-full whitespace-pre-wrap break-words text-center text-xs leading-5 text-muted-foreground/70">
              {uncertainReason}
            </span>
          ) : null}
        </div>
        <div className="mt-0.5 flex items-center gap-2">
          {isUncertain ? (
            <button
              type="button"
              className={ERROR_ACTION_BUTTON_CLASS}
              onClick={onDismissUnknown ?? onDelete}
              disabled={dismissing}
              aria-busy={dismissing}
              data-action-ui-id="canvas.media-error.dismiss-unknown"
            >
              {dismissing ? (
                <Loader2
                  size={14}
                  strokeWidth={1.5}
                  className={`${ERROR_ACTION_ICON_CLASS} animate-spin`}
                />
              ) : onDismissUnknown ? (
                <X$7 size={14} strokeWidth={1.5} className={ERROR_ACTION_ICON_CLASS} />
              ) : (
                <Trash2 size={14} strokeWidth={1.5} className={ERROR_ACTION_ICON_CLASS} />
              )}
              {onDismissUnknown
                ? t2("canvas.dismissGenerationStatus")
                : t2("canvas.removeLocalPlaceholder")}
            </button>
          ) : !isRecoverable ? (
            <button
              type="button"
              className={ERROR_ACTION_BUTTON_CLASS}
              onClick={onDelete}
              data-action-ui-id="canvas.media-error.delete"
            >
              <Trash2 size={14} strokeWidth={1.5} className={ERROR_ACTION_ICON_CLASS} />
              {t2("common.delete")}
            </button>
          ) : onCancel ? (
            <button
              type="button"
              className={ERROR_ACTION_BUTTON_CLASS}
              onClick={onCancel}
              disabled={cancelling}
              aria-busy={cancelling}
              data-action-ui-id="canvas.media-error.cancel"
            >
              {cancelling ? (
                <Loader2
                  size={14}
                  strokeWidth={1.5}
                  className={`${ERROR_ACTION_ICON_CLASS} animate-spin`}
                />
              ) : (
                <CircleAlert size={14} strokeWidth={1.5} className={ERROR_ACTION_ICON_CLASS} />
              )}
              {t2("canvas.cancelGeneration")}
            </button>
          ) : null}
          {isConcurrencyLimit && onRetry ? (
            <button
              type="button"
              className={ERROR_ACTION_BUTTON_CLASS}
              onClick={onRetry}
              disabled={retrying}
              aria-busy={retrying}
              data-action-ui-id="canvas.media-error.retry"
            >
              <RetryIcon$1
                size={14}
                className={`${ERROR_ACTION_ICON_CLASS}${retrying ? " animate-spin" : ""}`}
              />
              {retrying ? t2("canvas.retryGeneration.retrying") : t2("common.retry")}
            </button>
          ) : onReport ? (
            <button
              type="button"
              className={ERROR_ACTION_BUTTON_CLASS}
              onClick={onReport}
              disabled={reportStatus !== "idle"}
              aria-busy={reportStatus === "submitting"}
              title={
                isRecoverable
                  ? t2("canvas.reportGenerationRecoveryTooltip")
                  : t2("canvas.reportGenerationFailureTooltip")
              }
              data-action-ui-id="canvas.media-error.report"
            >
              {reportStatus === "submitted" ? (
                <Check size={14} strokeWidth={1.5} className={ERROR_ACTION_ICON_CLASS} />
              ) : reportStatus === "submitting" ? (
                <Loader2
                  size={14}
                  strokeWidth={1.5}
                  className={`${ERROR_ACTION_ICON_CLASS} animate-spin`}
                />
              ) : (
                <FeedbackIcon$1 size={14} className={ERROR_ACTION_ICON_CLASS} />
              )}
              {reportStatus === "submitted"
                ? t2("feedback.reported")
                : t2("canvas.mediaError.report")}
            </button>
          ) : null}
        </div>
      </div>
      {showRefundHint ? (
        <div className="pointer-events-none absolute bottom-3 left-3 z-10">
          <RefundHint refundStatus={refundStatus} refundedCredits={refundedCredits} />
        </div>
      ) : null}
      {displayModel ? (
        <div className="flex shrink-0 items-center justify-end px-3 pb-2">
          <span
            className="max-w-[55%] shrink-0 truncate text-left text-[10px] text-muted-foreground"
            title={displayModel}
          >
            {displayModel}
          </span>
        </div>
      ) : null}
    </div>
  );
}
export function MediaGenerationErrorOverlay({
  nodeId,
  message: message2,
  nodeType,
  errorReason,
  retryPayload: persistedRetryPayload,
  recoverable = false,
  uncertain = false,
  errorSource = "in-place",
}) {
  const { t: t2 } = useTranslation();
  const bridge = useCanvasBridge();
  const { mergeNodeData } = useCanvasActions();
  const { deleteElements } = useReactFlow();
  const nodeRefund = useNodesData(nodeId)?.data;
  const [cancelGenerationPending, setCancelGenerationPending] = reactExports.useState(false);
  const generating = useGeneratingStateStore((s2) => s2.byNode.get(nodeId));
  const registryModel = useModelForAsset(generating?.backend, generating?.modelId, nodeType);
  const displayModel =
    registryModel?.name ?? (generating?.model ? translateModelName(generating.model, t2) : void 0);
  const handleDelete2 = (e2) => {
    e2.stopPropagation();
    useGeneratingStateStore.getState().clear(nodeId);
    deleteElements({
      nodes: [
        {
          id: nodeId,
        },
      ],
    });
  };
  const handleDismissUnknown = reactExports.useCallback(
    async (e2) => {
      e2.stopPropagation();
      if (cancelGenerationPending) return;
      if (bridge.onDismissUnknownGeneration) {
        setCancelGenerationPending(true);
        try {
          const dismissed = await bridge.onDismissUnknownGeneration(nodeId);
          if (!dismissed) return;
        } finally {
          setCancelGenerationPending(false);
        }
      }
      useGeneratingStateStore.getState().clear(nodeId);
      mergeNodeData(nodeId, {
        status: void 0,
        errorMessage: void 0,
        errorReason: void 0,
        retryPayload: void 0,
        cloudTraceId: void 0,
        cloudTaskId: void 0,
        providerTaskId: void 0,
        generationAttemptId: void 0,
        generationStartedAt: void 0,
        estimatedRemainingWaitSeconds: void 0,
        estimatedRemainingWaitMinutes: void 0,
      });
    },
    [bridge, cancelGenerationPending, mergeNodeData, nodeId],
  );
  const handleReport = bridge.onReportNodeError
    ? (e2) => {
        e2.stopPropagation();
        bridge.onReportNodeError?.({
          nodeId,
          nodeType: nodeType ?? "media",
          model: generating?.model,
          prompt: generating?.prompt,
          errorMessage: message2,
          traceId: generating?.traceId,
        });
        useGeneratingStateStore.getState().clear(nodeId);
      }
    : void 0;
  const resolvedErrorReason = generating?.errorReason ?? errorReason;
  const retryPayload =
    resolvedErrorReason === GENERATE_ERROR_CODE_CONCURRENCY_LIMIT
      ? (generating?.retryPayload ?? persistedRetryPayload)
      : void 0;
  const handleRetry =
    retryPayload && bridge.onRetryGeneration
      ? (e2) => {
          e2.stopPropagation();
          bridge.onRetryGeneration?.(nodeId, retryPayload);
        }
      : void 0;
  const handleCancel = reactExports.useCallback(
    async (e2) => {
      e2.stopPropagation();
      if (!bridge.onCancelGeneration || cancelGenerationPending) return;
      setCancelGenerationPending(true);
      try {
        await bridge.onCancelGeneration(nodeId);
      } finally {
        setCancelGenerationPending(false);
      }
    },
    [bridge, cancelGenerationPending, nodeId],
  );
  return (
    <MediaErrorCard
      errorMessage={message2}
      displayModel={displayModel}
      onDelete={handleDelete2}
      onReport={handleReport}
      reportStatus={bridge.getNodeErrorReportStatus?.(nodeId) ?? "idle"}
      variant={
        recoverable
          ? "recoverable"
          : uncertain
            ? "uncertain"
            : resolvedErrorReason === GENERATE_ERROR_CODE_CONCURRENCY_LIMIT
              ? "concurrency_limit"
              : "failed"
      }
      onCancel={recoverable && bridge.onCancelGeneration ? handleCancel : void 0}
      cancelling={cancelGenerationPending}
      onDismissUnknown={uncertain && errorSource === "in-place" ? handleDismissUnknown : void 0}
      dismissing={uncertain && cancelGenerationPending}
      uncertainDescription={
        uncertain && errorSource === "in-place"
          ? t2("canvas.generationStatusUnknown.inPlaceDescription")
          : void 0
      }
      onRetry={handleRetry}
      retrying={bridge.isRetryGenerationPending?.(nodeId) ?? false}
      refundStatus={nodeRefund?.refundStatus}
      refundedCredits={nodeRefund?.refundedCredits}
    />
  );
}
export const MEDIA_FALLBACK_NODE_SIZE = {
  width: 350,
  height: 250,
};
export function MediaUnpreviewableFallback({
  extension: extension2,
  displayName: displayName2,
  sizeLabel,
  reason = "unsupported",
}) {
  const { t: t2 } = useTranslation();
  const extLabel = extension2 ?? t2("canvas.file.unknownExt", "该");
  const headline =
    reason === "tooLarge"
      ? t2("canvas.file.unpreviewableTooLarge", "文件过大，暂不支持预览")
      : reason === "resourceLimit"
        ? t2("canvas.file.unpreviewableResourceLimit", "预览数量过多，已暂停内嵌预览")
        : reason === "missing"
          ? t2("canvas.file.missing", "文件不存在或已被移动")
          : t2("canvas.file.unpreviewable", "{{ext}} 文件类型无法预览", {
              ext: extLabel,
            });
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[var(--canvas-node-bg)] px-6 text-center">
      <FileTypeIcon
        {...classifyFileType({
          filename: extension2
            ? `file${extension2.startsWith(".") ? "" : "."}${extension2}`
            : displayName2,
        })}
        size={48}
        decorative={true}
      />
      <div className="text-sm font-medium text-foreground">{headline}</div>
      <div className="max-w-full truncate text-[13px] text-[var(--canvas-controls-text-muted)]">
        {displayName2}
        {sizeLabel ? ` · ${sizeLabel}` : ""}
      </div>
    </div>
  );
}
const ACTION_BUTTON_CLASS =
  "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-foreground/10 bg-foreground/[0.04] px-2.5 text-xs font-medium text-foreground/70 transition-colors hover:bg-foreground/[0.08] hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50";
export function MissingAssetCard({ nodeId, name: name2 }) {
  const { t: t2 } = useTranslation();
  const { deleteElements } = useReactFlow();
  const handleDelete2 = reactExports.useCallback(
    (e2) => {
      e2.stopPropagation();
      void deleteElements({
        nodes: [
          {
            id: nodeId,
          },
        ],
      });
    },
    [deleteElements, nodeId],
  );
  return (
    <div
      className="w-full h-full min-h-[160px] flex flex-col overflow-hidden rounded-lg"
      style={{
        background: "var(--canvas-node-bg, #fff)",
      }}
    >
      <div className="w-full flex-1 min-h-0 flex flex-col items-center justify-center gap-3 px-6 py-6 text-center">
        <ImageOffOutlineIcon
          size={32}
          strokeWidth={1.75}
          className="text-muted-foreground"
          role="img"
          aria-label={t2("canvas.missingAsset.title")}
        />
        <div className="flex max-w-full flex-col items-center gap-1.5">
          <span className="text-[16px] leading-6 font-medium text-foreground">
            {t2("canvas.missingAsset.title")}
          </span>
          <span className="max-w-full line-clamp-2 whitespace-pre-wrap break-words text-center text-xs leading-5 text-muted-foreground">
            {t2("canvas.missingAsset.description")}
          </span>
          {name2 ? (
            <span
              className="max-w-full truncate text-[10px] leading-4 text-muted-foreground/70"
              title={name2}
            >
              {name2}
            </span>
          ) : null}
        </div>
        <div className="mt-0.5 flex items-center gap-2">
          <button
            type="button"
            className={ACTION_BUTTON_CLASS}
            onClick={handleDelete2}
            data-action-ui-id="canvas.missing-asset.delete"
          >
            <Trash2 size={14} strokeWidth={1.5} className="size-3.5 shrink-0" />
            {t2("common.delete")}
          </button>
        </div>
      </div>
    </div>
  );
}
export function isMissingAssetNodeData(data2) {
  return data2?.assetMissing === true;
}
const ENTER_RADIUS = 32;
const EXIT_RADIUS = 40;
const CENTER_OFFSET = 14;
const MENU_SELECTOR = '[data-action-ui-id="canvas.add-node-menu"]';
export const trackers$1 = new WeakMap();
export function createTracker(root2) {
  const doc2 = root2.ownerDocument;
  const view2 = doc2.defaultView;
  if (!view2) throw new Error("Handle proximity requires a document window");
  const win2 = view2;
  const entries2 = new Map();
  let active2 = null;
  let gesture = null;
  let spaceHeld = false;
  let menuObserver = null;
  let frame2 = 0;
  function activate(next2) {
    if (next2 === active2) return;
    active2?.element.removeAttribute("data-near");
    active2 = next2;
    active2?.element.setAttribute("data-near", "true");
  }
  function reset2() {
    win2.cancelAnimationFrame(frame2);
    frame2 = 0;
    menuObserver?.disconnect();
    menuObserver = null;
    gesture = null;
    activate(null);
  }
  function retainForMenu() {
    win2.cancelAnimationFrame(frame2);
    frame2 = win2.requestAnimationFrame(() => {
      frame2 = 0;
      const menu = doc2.querySelector(MENU_SELECTOR);
      if (!menu) {
        reset2();
        return;
      }
      menuObserver?.disconnect();
      menuObserver = new win2.MutationObserver(() => {
        if (!menu.isConnected) reset2();
      });
      menuObserver.observe(doc2.body, {
        childList: true,
        subtree: true,
      });
    });
  }
  function handleMove(event) {
    if (gesture) {
      if (
        Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) > gesture.dragThreshold
      ) {
        gesture.entry.dragged = true;
      }
      return;
    }
    if (menuObserver || frame2) return;
    const target = event.target;
    if (
      !(target instanceof win2.Element) ||
      !root2.contains(target) ||
      event.buttons ||
      spaceHeld
    ) {
      activate(null);
      return;
    }
    if (
      target.closest(
        '[role="menu"],button,input,textarea,[contenteditable="true"],.react-flow__resize-control',
      )
    ) {
      activate(null);
      return;
    }
    const nearby = new Set();
    const collect = (element2) => {
      const node2 = element2?.closest(".react-flow__node");
      if (node2 && root2.contains(node2)) nearby.add(node2);
    };
    collect(target);
    for (const dx of [-46, CENTER_OFFSET + ENTER_RADIUS]) {
      collect(doc2.elementFromPoint(event.clientX + dx, event.clientY));
    }
    if (active2) nearby.add(active2.node);
    let nearest = null;
    let distance2 = Number.POSITIVE_INFINITY;
    const pointerNode = target.closest(".node-handle-plus")
      ? null
      : target.closest(".react-flow__node");
    for (const node2 of nearby) {
      for (const entry of entries2.get(node2) ?? []) {
        if (pointerNode && pointerNode !== node2) continue;
        const rect = entry.element.getBoundingClientRect();
        if (!rect.width || !rect.height) continue;
        const x2 = rect.left + rect.width / 2;
        const y4 = rect.top + rect.height / 2;
        const d2 = Math.hypot(event.clientX - x2, event.clientY - y4);
        if (d2 > (entry === active2 ? EXIT_RADIUS : ENTER_RADIUS) || d2 >= distance2) continue;
        const visible = [
          [0, 0],
          [-9, -9],
          [9, -9],
          [-9, 9],
          [9, 9],
        ].every(([dx, dy]) => {
          const hit = doc2.elementFromPoint(x2 + dx, y4 + dy);
          if (!hit || !root2.contains(hit)) return false;
          if (hit.closest('[role="menu"],button,input,textarea,[contenteditable="true"]'))
            return false;
          const coveringNode = hit.closest(".node-handle-plus")
            ? null
            : hit.closest(".react-flow__node");
          return (
            !coveringNode ||
            coveringNode === node2 ||
            coveringNode.classList.contains("react-flow__node-group")
          );
        });
        if (visible) {
          nearest = entry;
          distance2 = d2;
        }
      }
    }
    activate(nearest);
  }
  function handleUp(event) {
    if (!gesture) return;
    if (Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) > gesture.dragThreshold) {
      gesture.entry.dragged = true;
    }
    gesture = null;
    retainForMenu();
  }
  function handleKey(event) {
    if (event.code === "Space") spaceHeld = event.type === "keydown";
    if (event.key === "Escape" || spaceHeld) reset2();
  }
  function handleBlur() {
    spaceHeld = false;
    reset2();
  }
  function handleLeave(event) {
    if (!event.relatedTarget && !gesture && !menuObserver) reset2();
  }
  doc2.addEventListener("pointermove", handleMove, {
    passive: true,
  });
  doc2.addEventListener("mouseup", handleUp);
  doc2.addEventListener("keydown", handleKey);
  doc2.addEventListener("keyup", handleKey);
  doc2.addEventListener("mouseout", handleLeave);
  root2.addEventListener("wheel", reset2, {
    passive: true,
  });
  win2.addEventListener("blur", handleBlur);
  doc2.addEventListener("pointercancel", reset2);
  const viewportObserver = new win2.MutationObserver(() => {
    if (!gesture && !menuObserver && !frame2) activate(null);
  });
  const viewport = root2.querySelector(".react-flow__viewport");
  if (viewport)
    viewportObserver.observe(viewport, {
      attributes: true,
      attributeFilter: ["style"],
    });
  return {
    register(element2, node2) {
      const entry = {
        element: element2,
        node: node2,
        dragged: false,
      };
      const siblings2 = entries2.get(node2) ?? new Set();
      siblings2.add(entry);
      entries2.set(node2, siblings2);
      return {
        beginGesture(event, dragThreshold = 5) {
          if (event.button !== 0) return;
          reset2();
          entry.dragged = false;
          gesture = {
            entry,
            x: event.clientX,
            y: event.clientY,
            dragThreshold,
          };
          activate(entry);
        },
        didDrag: () => entry.dragged,
        retainForMenu,
        dispose() {
          if (active2 === entry || gesture?.entry === entry) reset2();
          siblings2.delete(entry);
          if (!siblings2.size) entries2.delete(node2);
          if (entries2.size) return;
          reset2();
          doc2.removeEventListener("pointermove", handleMove);
          doc2.removeEventListener("mouseup", handleUp);
          doc2.removeEventListener("keydown", handleKey);
          doc2.removeEventListener("keyup", handleKey);
          doc2.removeEventListener("mouseout", handleLeave);
          root2.removeEventListener("wheel", reset2);
          win2.removeEventListener("blur", handleBlur);
          doc2.removeEventListener("pointercancel", reset2);
          viewportObserver.disconnect();
          trackers$1.delete(root2);
        },
      };
    },
  };
}
