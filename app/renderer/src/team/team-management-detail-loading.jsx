// team-management-detail-loading.jsx
import {
  Inbox,
  Info$1 as Info,
  jsxRuntimeExports,
  ProgressRoot,
  progressStateAttributesMapping,
  reactExports,
  useRenderElement,
  useTranslation,
  valueToPercent,
} from "../vendor.js";
import { useProgressRootContext } from "../generation/use-model-catalog-scope-key.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { cn$2 as cn, TooltipContent } from "../infra/dialog-content.jsx";
import { TeamApiError } from "./map-team-credit-summary.js";
import {
  Icon,
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
} from "../vendor-inline/vscode-base/graph.jsx";
import { Skeleton } from "./use-wallet-query.jsx";
const ProgressTrack$1 = reactExports.forwardRef(
  function ProgressTrack2(componentProps, forwardedRef) {
    const { render: render2, className, ...elementProps } = componentProps;
    const { state: state2 } = useProgressRootContext();
    const element2 = useRenderElement("div", componentProps, {
      state: state2,
      ref: forwardedRef,
      props: elementProps,
      stateAttributesMapping: progressStateAttributesMapping,
    });
    return element2;
  },
);
const ProgressIndicator$1 = reactExports.forwardRef(
  function ProgressIndicator2(componentProps, forwardedRef) {
    const { render: render2, className, ...elementProps } = componentProps;
    const {
      max: max2,
      min: min2,
      value,
      state: state2,
    } = useProgressRootContext();
    const percentageValue =
      Number.isFinite(value) && value !== null
        ? valueToPercent(value, min2, max2)
        : null;
    const getStyles2 = reactExports.useCallback(() => {
      if (percentageValue == null) {
        return {};
      }
      return {
        insetInlineStart: 0,
        height: "inherit",
        width: `${percentageValue}%`,
      };
    }, [percentageValue]);
    const element2 = useRenderElement("div", componentProps, {
      state: state2,
      ref: forwardedRef,
      props: [
        {
          style: getStyles2(),
        },
        elementProps,
      ],
      stateAttributesMapping: progressStateAttributesMapping,
    });
    return element2;
  },
);
export function TeamHelpTip({
  content: content2,
  label,
  side = "top",
  className,
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              className={
                className ??
                "inline-flex size-5 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
              }
              aria-label={label}
            />
          }
        >
          <Info size={12} strokeWidth={1.5} aria-hidden={true} />
        </TooltipTrigger>
        <TooltipContent side={side} className="max-w-xs leading-relaxed">
          {content2}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
const DETAIL_MEMBER_ROW_IDS = ["first", "second", "third"];
const DETAIL_QUOTA_CELL_IDS = ["default", "remaining", "members"];
export function TeamManagementDetailLoading() {
  const { t: t2 } = useTranslation();
  return (
    <div
      role="status"
      aria-busy="true"
      className="space-y-6"
      data-action-ui-id="team.management-detail-loading"
    >
      <span className="sr-only">
        {t2("common.loading", {
          defaultValue: "加载中…",
        })}
      </span>
      <section className="rounded-lg bg-muted/40 px-4 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-2.5 w-16 rounded-sm" />
            <Skeleton className="h-3.5 w-36 rounded-sm" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-20 rounded-sm" />
            <Skeleton className="h-5 w-14 rounded-lg" />
          </div>
        </div>
      </section>
      <section className="space-y-3">
        <div className="space-y-2">
          <Skeleton className="h-3.5 w-28 rounded-sm" />
          <Skeleton className="h-2.5 w-56 max-w-full rounded-sm" />
        </div>
        <div className="grid overflow-hidden rounded-lg border border-border sm:grid-cols-3 sm:divide-x sm:divide-border">
          {DETAIL_QUOTA_CELL_IDS.map((cellId, index2) => (
            <div
              key={cellId}
              className="space-y-2 border-b border-border p-3 last:border-b-0 sm:border-b-0"
            >
              <Skeleton className="h-2.5 w-20 rounded-sm" />
              <Skeleton
                className={
                  index2 === 1 ? "h-3 w-24 rounded-sm" : "h-3 w-14 rounded-sm"
                }
              />
            </div>
          ))}
        </div>
      </section>
      <section className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <Skeleton className="h-3.5 w-28 rounded-sm" />
          <Skeleton className="h-8 w-full rounded-lg sm:w-64" />
        </div>
        <div className="overflow-x-auto rounded-lg border border-border">
          <div className="min-w-[32rem]">
            <div className="grid grid-cols-[minmax(10rem,1.5fr)_minmax(6rem,0.8fr)_minmax(9rem,1fr)] gap-3 border-b border-border bg-muted/50 px-3 py-2">
              <Skeleton className="h-2.5 w-16 rounded-sm" />
              <Skeleton className="h-2.5 w-12 rounded-sm" />
              <Skeleton className="h-2.5 w-20 rounded-sm" />
            </div>
            {DETAIL_MEMBER_ROW_IDS.map((rowId) => (
              <div
                key={rowId}
                className="grid min-h-14 grid-cols-[minmax(10rem,1.5fr)_minmax(6rem,0.8fr)_minmax(9rem,1fr)] items-center gap-3 border-b border-border/70 px-3 py-3 last:border-b-0"
              >
                <div className="space-y-2">
                  <Skeleton className="h-3 w-28 rounded-sm" />
                  <Skeleton className="h-2.5 w-20 rounded-sm" />
                </div>
                <Skeleton className="h-5 w-14 rounded-lg" />
                <Skeleton className="h-3 w-24 rounded-sm" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
const MEMBER_ROW_IDS = ["first", "second", "third", "fourth"];
export function TeamManagementMemberLoading() {
  const { t: t2 } = useTranslation();
  return (
    <div
      role="status"
      aria-busy="true"
      className="overflow-x-auto rounded-lg border border-border"
      data-action-ui-id="team.management-members-loading"
    >
      <span className="sr-only">
        {t2("common.loading", {
          defaultValue: "加载中…",
        })}
      </span>
      <div className="min-w-[32rem]">
        <div className="grid grid-cols-[minmax(10rem,1.5fr)_minmax(6rem,0.8fr)_minmax(9rem,1fr)] gap-3 border-b border-border bg-muted/50 px-3 py-2">
          <Skeleton className="h-2.5 w-16 rounded-sm" />
          <Skeleton className="h-2.5 w-12 rounded-sm" />
          <Skeleton className="h-2.5 w-20 rounded-sm" />
        </div>
        {MEMBER_ROW_IDS.map((rowId) => (
          <div
            key={rowId}
            className="grid min-h-14 grid-cols-[minmax(10rem,1.5fr)_minmax(6rem,0.8fr)_minmax(9rem,1fr)] items-center gap-3 border-b border-border/70 px-3 py-3 last:border-b-0"
          >
            <div className="space-y-2">
              <Skeleton className="h-3 w-28 rounded-sm" />
              <Skeleton className="h-2.5 w-20 rounded-sm" />
            </div>
            <Skeleton className="h-5 w-14 rounded-lg" />
            <Skeleton className="h-3 w-24 rounded-sm" />
          </div>
        ))}
      </div>
    </div>
  );
}
export function TeamManagementQuotaMetrics({ metrics }) {
  return (
    <div className="grid overflow-hidden rounded-lg border border-border text-xs sm:grid-flow-col sm:auto-cols-fr sm:divide-x sm:divide-border">
      {metrics.map((metric) => {
        const interactive = typeof metric.onActivate === "function";
        const body2 = (
          <>
            <div className="flex items-center gap-1.5">
              <p className="break-words text-muted-foreground">
                {metric.label}
              </p>
              {metric.actionPlacement === "label" && metric.action ? (
                <div className="shrink-0">{metric.action}</div>
              ) : null}
            </div>
            <p
              className={cn(
                "mt-2 min-w-0 break-words font-heading text-xl font-semibold text-foreground",
                metric.tabular && "break-all tabular-nums",
              )}
            >
              {metric.value}
            </p>
          </>
        );
        const cell =
          metric.action && metric.actionPlacement !== "label" ? (
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">{body2}</div>
              <div className="shrink-0">{metric.action}</div>
            </div>
          ) : (
            body2
          );
        if (interactive) {
          return (
            <button
              key={metric.id}
              type="button"
              className="min-w-0 border-b border-border p-4 text-left transition-colors last:border-b-0 hover:bg-foreground/[0.03] focus-visible:bg-foreground/[0.03] focus-visible:outline-none sm:border-b-0"
              onClick={metric.onActivate}
              data-action-ui-id={metric.actionUiId}
              aria-label={metric.activateLabel ?? metric.label}
            >
              {cell}
            </button>
          );
        }
        return (
          <div
            key={metric.id}
            className="min-w-0 border-b border-border p-4 last:border-b-0 sm:border-b-0"
          >
            {cell}
          </div>
        );
      })}
    </div>
  );
}
export function ProgressTrack({ className, ...props }) {
  return (
    <ProgressTrack$1
      className={cn(
        "relative flex h-1 w-full items-center overflow-x-hidden rounded-full bg-muted",
        className,
      )}
      data-slot="progress-track"
      {...props}
    />
  );
}
export function ProgressIndicator({ className, ...props }) {
  return (
    <ProgressIndicator$1
      data-slot="progress-indicator"
      className={cn("h-full bg-primary transition-all", className)}
      {...props}
    />
  );
}
export function Progress({ className, children: children2, value, ...props }) {
  return (
    <ProgressRoot
      value={value}
      data-slot="progress"
      className={cn("flex flex-wrap gap-3", className)}
      {...props}
    >
      {children2}
      <ProgressTrack>
        <ProgressIndicator />
      </ProgressTrack>
    </ProgressRoot>
  );
}
export function TeamPanelEmpty({ title, description }) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center px-6 py-8 text-center">
      <span className="mb-3 flex size-10 items-center justify-center rounded-lg bg-foreground/[0.04] text-foreground">
        <Icon
          icon={Inbox}
          size="lg"
          className="opacity-60"
          aria-hidden={true}
        />
      </span>
      <p className="break-words font-heading text-sm font-medium text-foreground">
        {title}
      </p>
      {description ? (
        <p className="mt-1 max-w-sm break-words text-xs/relaxed text-muted-foreground">
          {description}
        </p>
      ) : null}
    </div>
  );
}
function firstString(details, keys2) {
  if (!details) return void 0;
  for (const key2 of keys2) {
    const value = details[key2];
    if (typeof value === "string" && value.trim().length > 0)
      return value.trim();
  }
  return void 0;
}
export function describeTeamMutationError(error) {
  if (error instanceof TeamApiError) {
    const details = error.payload.details;
    const reason = firstString(details, ["reason", "reason_code"]);
    const upstreamStatusCode = firstString(details, [
      "upstream_status_code",
      "status_code",
    ]);
    const upstreamStatusMessage = firstString(details, [
      "upstream_status_message",
      "status_msg",
      "message",
    ]);
    return {
      code: error.payload.code,
      ...(reason
        ? {
            reason,
          }
        : {}),
      ...(upstreamStatusCode
        ? {
            upstreamStatusCode,
          }
        : {}),
      ...(upstreamStatusMessage
        ? {
            upstreamStatusMessage: upstreamStatusMessage.slice(0, 200),
          }
        : {}),
    };
  }
  if (error instanceof Error && error.message.trim().length > 0) {
    return {
      code: "temporarily_unavailable",
      upstreamStatusMessage: error.message.slice(0, 200),
    };
  }
  return {
    code: "temporarily_unavailable",
  };
}
export function formatTeamMutationErrorSuffix(detail) {
  const parts = [];
  if (detail.reason) parts.push(detail.reason);
  if (detail.upstreamStatusCode) parts.push(`sc=${detail.upstreamStatusCode}`);
  if (
    detail.upstreamStatusMessage &&
    detail.upstreamStatusMessage !== "unknown error" &&
    !detail.upstreamStatusMessage.includes("MySQL") &&
    !/Error\s+\d+/.test(detail.upstreamStatusMessage)
  ) {
    parts.push(detail.upstreamStatusMessage.slice(0, 80));
  } else if (
    detail.upstreamStatusMessage &&
    (detail.upstreamStatusMessage.includes("MySQL") ||
      /Error\s+\d+/.test(detail.upstreamStatusMessage))
  ) {
    parts.push("upstream_sql_error");
  } else if (detail.upstreamStatusMessage === "unknown error") {
    parts.push("unknown error");
  }
  return parts.join(" · ");
}
export function isUpstreamContractFailure(detail) {
  return (
    detail.reason === "upstream_params_error" ||
    detail.reason === "upstream_contract_not_ready" ||
    detail.reason === "upstream_business_error" ||
    detail.reason === "upstream_capability_unavailable" ||
    detail.code === "temporarily_unavailable" ||
    detail.code === "feature_disabled" ||
    detail.upstreamStatusCode === "1000"
  );
}
export function teamMutationReasonCode(detail) {
  return detail.reason || detail.code || "temporarily_unavailable";
}
