// qr-card.jsx
import { LoaderCircle, useTranslation } from "../vendor.js";
import { Icon } from "../vendor-inline/vscode-base/graph.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { Button$1, cn$2 } from "../infra/dialog-content.jsx";
import { RetryIcon } from "../workspace/use-prompt-icon.jsx";

function qrStatusLabel(t2, platform2, status, errorReason) {
  const ns2 = `settings.imBridge.${platform2}.qr.status`;
  if (status === "pending_approval") {
    return t2(`${ns2}.pendingApproval`);
  }
  if (status === "error") {
    if (errorReason && errorReason !== "unknown") {
      const specific = t2(`${ns2}.error.${errorReason}`);
      if (specific && specific !== `${ns2}.error.${errorReason}`)
        return specific;
    }
    return t2(`${ns2}.error`);
  }
  return t2(`${ns2}.${status}`);
}

export function QrCard({
  platform: platform2,
  status,
  errorReason,
  canRetry,
  onRetry,
  readyHint,
  statusLabelOverride,
  children: children2,
}) {
  const { t: t2 } = useTranslation();
  const label =
    statusLabelOverride ??
    (status
      ? qrStatusLabel(t2, platform2, status, errorReason)
      : t2(`settings.imBridge.${platform2}.qr.status.loading`));
  const footerLabel = status === "ready" && readyHint ? readyHint : label;
  const hasQr = Boolean(children2);
  const isLoading = status === null || status === "loading";
  const isScanned = status === "scanned";
  const showMask =
    hasQr && (status === "error" || status === "expired" || isScanned);
  const showStatusBelowQr = hasQr && !showMask;
  return (
    <div className="mt-5 flex flex-col items-center">
      <div
        className="relative flex size-60 items-center justify-center overflow-hidden rounded-2xl bg-secondary/60 p-2"
        data-action-ui-id={`im-bridge.${platform2}.qrcode`}
      >
        {hasQr ? (
          <div className="flex size-full items-center justify-center rounded-lg bg-card p-2">
            {children2}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            {isLoading && (
              <Icon
                icon={LoaderCircle}
                size="md"
                strokeWidth={1.5}
                className="animate-spin text-muted-foreground"
              />
            )}
            <span
              className={cn$2(
                "text-center text-xs leading-relaxed",
                status === "error" && "text-destructive",
                status === "pending_approval" && "text-warning",
                status !== "error" &&
                  status !== "pending_approval" &&
                  "text-muted-foreground",
              )}
              data-action-ui-id={`im-bridge.${platform2}.qr.status`}
            >
              {label}
            </span>
            {canRetry && (
              <Button$1
                type="button"
                variant="outline"
                size="sm"
                onClick={onRetry}
                data-action-ui-id={`im-bridge.${platform2}.qr.retry`}
              >
                <RetryIcon size={14} />
                {t2(`settings.imBridge.${platform2}.qr.retry`)}
              </Button$1>
            )}
          </div>
        )}
        {showMask && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-foreground/70 px-6 text-center text-background backdrop-blur-[1px]">
            {isScanned && (
              <Icon
                icon={LoaderCircle}
                size="md"
                strokeWidth={1.5}
                className="animate-spin"
              />
            )}
            <span
              className="max-w-44 text-xs leading-relaxed"
              data-action-ui-id={`im-bridge.${platform2}.qr.mask-status`}
            >
              {label}
            </span>
            {canRetry && (
              <Button$1
                type="button"
                variant="outline"
                size="sm"
                className="bg-background"
                onClick={onRetry}
                data-action-ui-id={`im-bridge.${platform2}.qr.mask-retry`}
              >
                <RetryIcon size={14} />
                {t2(`settings.imBridge.${platform2}.qr.retry`)}
              </Button$1>
            )}
          </div>
        )}
      </div>
      {showStatusBelowQr && (
        <p
          className={cn$2(
            "mt-4 max-w-[480px] text-center text-xs leading-relaxed",
            status === "error" && "text-destructive",
            status === "pending_approval" && "text-warning",
            status !== "error" &&
              status !== "pending_approval" &&
              "text-muted-foreground",
          )}
          data-action-ui-id={`im-bridge.${platform2}.qr.status`}
        >
          {footerLabel}
        </p>
      )}
    </div>
  );
}
