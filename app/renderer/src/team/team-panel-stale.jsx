// team-panel-stale.jsx
import {
  jsxRuntimeExports,
  Loader2,
  reactExports,
  TriangleAlert,
  useTranslation,
} from "../vendor.js";
import {
  Icon,
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
} from "../vendor-inline/vscode-base/graph.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  Button,
  cn$2 as cn,
  TooltipContent,
} from "../infra/dialog-content.jsx";
import { RetryIcon } from "../workspace/use-prompt-icon.jsx";
import { Clock3 } from "../media-editing/package.jsx";
export function deriveAccountPresentation(account, personalAccountLabel) {
  if (account.accountType === "PERSONAL") {
    return {
      displayName: personalAccountLabel,
      showsTeamMetadata: false,
    };
  }
  return {
    displayName: account.displayName,
    visibleGroupId: account.groupId,
    showsTeamMetadata: true,
  };
}
export function TeamPanelStale({
  onRetry,
  isFetching = false,
  title,
  description,
}) {
  const { t: t2 } = useTranslation();
  const [pending2, setPending] = reactExports.useState(false);
  const busy = isFetching || pending2;
  const handleRetry = () => {
    if (busy) return;
    const result = onRetry();
    if (result && typeof result.then === "function") {
      setPending(true);
      void Promise.resolve(result).finally(() => setPending(false));
    }
  };
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col gap-3 rounded-lg border border-border bg-muted/40 px-3 py-3 sm:flex-row sm:items-center"
      data-action-ui-id="team.panel-stale"
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-foreground/[0.04] text-muted-foreground">
        {busy ? (
          <Icon
            icon={Loader2}
            size="sm"
            aria-hidden={true}
            className="animate-spin"
          />
        ) : (
          <RetryIcon size={14} />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="break-words text-xs font-medium text-foreground">
          {title ??
            t2("team.common.refreshFailedTitle", {
              defaultValue: "数据可能不是最新",
            })}
        </p>
        <p className="mt-0.5 break-words text-xs/relaxed text-muted-foreground">
          {description ??
            t2("team.common.refreshFailedDescription", {
              defaultValue: "暂时无法获取最新数据，请重试以确认当前状态。",
            })}
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={busy}
        className="h-auto min-h-7 max-w-full shrink-0 whitespace-normal text-center leading-relaxed"
        onClick={handleRetry}
        data-action-ui-id="team.panel-stale-retry"
      >
        {busy
          ? t2("common.refreshing", {
              defaultValue: "刷新中…",
            })
          : t2("common.retry", {
              defaultValue: "重试",
            })}
      </Button>
    </div>
  );
}
export const BLOCKING_REASON_KEYS = {
  ACTIVE_RUN: "team.blockingReason.ACTIVE_RUN",
  QUEUED_OR_FLUSHING_INPUT: "team.blockingReason.QUEUED_OR_FLUSHING_INPUT",
  COMPLETION_OUTBOX: "team.blockingReason.COMPLETION_OUTBOX",
  ASSET_OR_UPLOAD_OPERATION: "team.blockingReason.ASSET_OR_UPLOAD_OPERATION",
  GATEWAY_SYNC: "team.blockingReason.GATEWAY_SYNC",
};
export const BLOCKING_REASON_FALLBACKS = {
  ACTIVE_RUN: "A generation task is running. Stop it to switch Group.",
  QUEUED_OR_FLUSHING_INPUT: "A queued message is still being sent.",
  COMPLETION_OUTBOX: "A completed task is still syncing.",
  ASSET_OR_UPLOAD_OPERATION: "An asset or upload operation is still running.",
  GATEWAY_SYNC: "Account information is still syncing. Please wait.",
};
export function TeamTransitionFeedback({ attempt }) {
  const { t: t2 } = useTranslation();
  if (!attempt) return null;
  const message2 =
    attempt.kind === "busy"
      ? t2("team.reason.switch_busy", {
          defaultValue:
            "The request and billing Group cannot be switched yet. Try again shortly.",
        })
      : attempt.kind === "rejected"
        ? t2(`team.reason.${attempt.code}`, {
            defaultValue: t2("team.reason.rejected", {
              defaultValue: "The request was rejected. Refresh and try again.",
            }),
          })
        : t2(`team.reason.${attempt.reasonCode}`, {
            defaultValue: t2("team.reason.recovering", {
              defaultValue: "Restoring account information. Please wait.",
            }),
          });
  const isRejected = attempt.kind === "rejected";
  const isRecovering = attempt.kind === "recovering";
  const statusIcon2 = isRejected
    ? TriangleAlert
    : isRecovering
      ? RetryIcon
      : Clock3;
  return (
    <div
      role={isRejected ? "alert" : "status"}
      aria-live={isRejected ? "assertive" : "polite"}
      className={
        isRejected
          ? "flex items-start gap-2.5 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2.5 text-xs text-destructive"
          : "flex items-start gap-2.5 rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground"
      }
      data-action-ui-id="team.transition-feedback"
    >
      <Icon
        icon={statusIcon2}
        size="sm"
        className={
          isRejected
            ? "mt-0.5 shrink-0 text-destructive"
            : "mt-0.5 shrink-0 text-foreground opacity-30"
        }
        aria-hidden={true}
      />
      <div className="min-w-0">
        <p className="break-words leading-relaxed">{message2}</p>
        {attempt.kind === "busy" && attempt.blockingReasons.length > 0 ? (
          <ul className="mt-1 list-disc space-y-0.5 break-words pl-4 text-muted-foreground">
            {attempt.blockingReasons.map((reason) => (
              <li key={reason}>
                {t2(BLOCKING_REASON_KEYS[reason], {
                  defaultValue: BLOCKING_REASON_FALLBACKS[reason],
                })}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
export function TeamUnavailableAction({
  label,
  reason,
  dataActionUiId,
  icon,
  children: children2,
  variant = "outline",
  size: size2 = "default",
  className,
}) {
  const reasonId = reactExports.useId();
  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant={variant}
                size={size2}
                className={cn(
                  "h-auto min-h-8 max-w-full min-w-0 shrink cursor-not-allowed whitespace-normal text-center leading-relaxed opacity-50",
                  className,
                )}
                aria-disabled="true"
                aria-label={label}
                aria-describedby={reasonId}
                data-action-ui-id={dataActionUiId}
              />
            }
          >
            {children2 ?? (
              <>
                {icon}
                <span className="min-w-0 break-words">{label}</span>
              </>
            )}
          </TooltipTrigger>
          <TooltipContent>{reason}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <span id={reasonId} className="sr-only">
        {reason}
      </span>
    </>
  );
}
export function getTeamReasonText(t2, reasonCode, fallback) {
  const defaultValue2 = t2("team.reason.default", {
    defaultValue: "请稍后重试或升级客户端。",
  });
  if (!reasonCode) return defaultValue2;
  return t2(`team.reason.${reasonCode}`, {
    defaultValue: defaultValue2,
  });
}
export function deriveMemberCreditDisplay(display) {
  const { teamRemaining: _teamRemaining, ...memberDisplay } = display;
  return memberDisplay;
}
export function formatCreditAmount(value) {
  if (!/^-?(0|[1-9]\d*)$/.test(value)) return "—";
  return BigInt(value).toLocaleString();
}
export function formatSignedCreditAmount(value) {
  const formatted = formatCreditAmount(value);
  if (formatted === "—") return formatted;
  return BigInt(value) > 0n ? `+${formatted}` : formatted;
}
