// media-error-card.jsx
import {
  Check,
  CircleAlert,
  CompositedSvg,
  Loader2,
  reactExports,
  TriangleAlert,
  useTranslation,
  X$7,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  looksLikeHtml,
  stripErrorHtml,
  TooltipProvider$1,
} from "../infra/create-recently-added-store.js";
import { RefundHint, Tooltip$1 } from "./missing-asset-card.jsx";
import { isGenerationRefundStatus } from "../canvas/compute-group-bounds-from-children.js";
import { Trash2 } from "../media-editing/package.jsx";
import { classifyRawErrorText } from "./normalize-skill-detail-metadata.js";
import { RetryIcon$1 } from "../canvas/fullscreen-icon.jsx";

const FeedbackIcon$1 = reactExports.forwardRef(function FeedbackIcon2(
  { size: size2 = 24, ...props },
  ref,
) {
  const ariaHidden =
    props["aria-hidden"] ?? (props["aria-label"] ? void 0 : true);
  return (
    <CompositedSvg
      ref={ref}
      {...props}
      width={size2}
      height={size2}
      viewBox="0 0 1024 1024"
      fill="currentColor"
      aria-hidden={ariaHidden}
    >
      <title>{props["aria-label"] ?? "Feedback"}</title>
      <path d="M672 320H352c-17.6 0-32-14.4-32-32s14.4-32 32-32h320c17.6 0 32 14.4 32 32s-14.4 32-32 32ZM544 448H352c-17.6 0-32-14.4-32-32s14.4-32 32-32h192c17.6 0 32 14.4 32 32s-14.4 32-32 32Z" />
      <path d="M960 448v-3.2-3.2-1.6-1.6-3.2-1.6l-1.6-1.6v-1.6-1.6l-1.6-1.6-1.6-1.6-1.6-1.6-1.6-1.6h-1.6L832 352V160c0-52.8-43.2-96-96-96H288c-52.8 0-96 43.2-96 96v192l-112 68.8h-1.6l-1.6 1.6-1.6 1.6-1.6 1.6-1.6 1.6v3.2l-1.6 1.6v430.4c0 52.8 43.2 96 96 96h704c52.8 0 96-43.2 96-96L960 448Zm-92.8 0L832 468.8v-43.2l35.2 22.4ZM288 126.4h448c17.6 0 32 14.4 32 32v350.4l-256 156.8-256-156.8V158.4c0-17.6 14.4-32 32-32Zm-96 342.4L156.8 448l35.2-20.8v41.6ZM864 896H160c-17.6 0-32-14.4-32-32V505.6l368 225.6c1.6 1.6 3.2 1.6 4.8 1.6 1.6 0 1.6 0 3.2 1.6 3.2 0 4.8 1.6 8 1.6s4.8 0 8-1.6c1.6 0 1.6 0 3.2-1.6 1.6 0 3.2-1.6 4.8-1.6l368-225.6V864c0 17.6-14.4 32-32 32Z" />
    </CompositedSvg>
  );
});

function handleAnchorClick(e2) {
  const target = e2.target;
  if (target?.tagName === "A") {
    e2.stopPropagation();
  }
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
  const isConcurrencyLimit =
    variant === "concurrency_limit" || rawClass === "concurrency";
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
      ? (uncertainDescription ??
        t2("canvas.generationStatusUnknown.description"))
      : void 0;
  const displayError =
    stateDescription ??
    (rawClass ? t2(RAW_ERROR_CLASS_I18N$2[rawClass]) : errorMessage2);
  const plainDisplayError = stripErrorHtml(displayError);
  const uncertainReason =
    isUncertain && rawClass ? t2(UNCERTAIN_REASON_I18N[rawClass]) : void 0;
  const tooltipText = uncertainReason
    ? `${plainDisplayError}
${uncertainReason}`
    : plainDisplayError;
  const showRefundHint =
    !isConcurrencyLimit &&
    !isRecoverable &&
    !isUncertain &&
    isGenerationRefundStatus(refundStatus);
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
                <X$7
                  size={14}
                  strokeWidth={1.5}
                  className={ERROR_ACTION_ICON_CLASS}
                />
              ) : (
                <Trash2
                  size={14}
                  strokeWidth={1.5}
                  className={ERROR_ACTION_ICON_CLASS}
                />
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
              <Trash2
                size={14}
                strokeWidth={1.5}
                className={ERROR_ACTION_ICON_CLASS}
              />
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
                <CircleAlert
                  size={14}
                  strokeWidth={1.5}
                  className={ERROR_ACTION_ICON_CLASS}
                />
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
              {retrying
                ? t2("canvas.retryGeneration.retrying")
                : t2("common.retry")}
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
                <Check
                  size={14}
                  strokeWidth={1.5}
                  className={ERROR_ACTION_ICON_CLASS}
                />
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
          <RefundHint
            refundStatus={refundStatus}
            refundedCredits={refundedCredits}
          />
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
