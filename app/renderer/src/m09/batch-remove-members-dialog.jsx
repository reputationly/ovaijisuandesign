// batch-remove-members-dialog.jsx
import {
  jsxRuntimeExports,
  useTranslation,
  reactExports,
  dedupedToast,
  Tooltip,
  TooltipTrigger,
  HILO_HUB_BIZ_LINE,
  teamQueryKeys,
  creditQueryKeys,
  Icon,
  TooltipProvider,
  useTeamAccount,
  useQueryClient,
  Info$1,
  useMutation,
  ProgressRoot,
  ProgressTrack$1,
  ProgressIndicator$1,
  minCreditAmount,
  CircleAlert,
  Inbox,
} from "../vendor.js";
import {
  TooltipContent,
  cn$2,
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "../asset-center/shared/use-browser-overlay-dialog-props.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { formatCreditAmount } from "./account-switcher-view.jsx";
import { Skeleton } from "./infinite-scroll-container.jsx";
import { TeamApiError } from "./map-hub-group-list-response.js";
import { teamApi } from "./team-api.js";
import { accountScopeEquals } from "./team-provider.jsx";
export function TeamHelpTip({ content: content2, label, side = "top", className }) {
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
          <Info$1 size={12} strokeWidth={1.5} aria-hidden={true} />
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
              <Skeleton className={index2 === 1 ? "h-3 w-24 rounded-sm" : "h-3 w-14 rounded-sm"} />
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
function Table({ className, ...props }) {
  return (
    <div data-slot="table-container" className="relative w-full overflow-x-auto">
      <table
        data-slot="table"
        className={cn$2("w-full caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  );
}
function TableHeader({ className, ...props }) {
  return (
    <thead
      data-slot="table-header"
      className={cn$2("[&_tr]:[border-bottom-width:var(--divider-width)]", className)}
      {...props}
    />
  );
}
function TableBody({ className, ...props }) {
  return (
    <tbody
      data-slot="table-body"
      className={cn$2("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  );
}
function TableRow({ className, ...props }) {
  return <tr data-slot="table-row" className={cn$2("border-b", className)} {...props} />;
}
function TableHead({ className, ...props }) {
  return (
    <th
      data-slot="table-head"
      className={cn$2("text-left align-middle font-medium", className)}
      {...props}
    />
  );
}
function TableCell({ className, ...props }) {
  return <td data-slot="table-cell" className={cn$2("align-middle", className)} {...props} />;
}
export function TeamManagementMemberTable({
  showCredits = true,
  headerSelection,
  memberLabel,
  roleLabel,
  quotaLabel,
  usageLabel,
  actionLabel,
  uidPrefix,
  rows,
}) {
  const showSelection = headerSelection !== void 0;
  const showUsage = showCredits && usageLabel !== void 0;
  const showAction = actionLabel !== void 0;
  return (
    <div className="overflow-clip rounded-lg border border-border [&_[data-slot=table-container]]:overflow-visible">
      <Table className="min-w-[36rem] table-fixed">
        <colgroup>
          {showSelection ? <col className="w-10" /> : null}
          <col />
          {showCredits ? <col className="w-28" /> : null}
          {showUsage ? <col className="w-28" /> : null}
          {showAction ? <col className="w-30" /> : null}
        </colgroup>
        <TableHeader className="sticky top-0 z-10 bg-muted">
          <TableRow>
            {showSelection ? (
              <TableHead className="px-3 py-1.5 text-[11px] text-muted-foreground">
                {headerSelection}
              </TableHead>
            ) : null}
            <TableHead className="min-w-0 break-words px-3 py-1.5 text-[11px] text-muted-foreground">
              {memberLabel}
            </TableHead>
            {showCredits ? (
              <TableHead className="min-w-0 break-words px-3 py-1.5 text-center text-[11px] text-muted-foreground">
                {quotaLabel}
              </TableHead>
            ) : null}
            {showUsage ? (
              <TableHead className="min-w-0 break-words px-3 py-1.5 text-center text-[11px] text-muted-foreground">
                {usageLabel}
              </TableHead>
            ) : null}
            {showAction ? (
              <TableHead className="px-3 py-1.5 text-right text-[11px] text-muted-foreground">
                <div className="ml-auto grid w-full grid-cols-2 gap-1">
                  <span className="col-start-2 text-center">{actionLabel}</span>
                </div>
              </TableHead>
            ) : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id} className="transition-colors hover:bg-foreground/[0.03]">
              {showSelection ? <TableCell className="px-3 py-2">{row.selection}</TableCell> : null}
              <TableCell className="px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-foreground">{row.name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    <span className="sr-only">
                      {roleLabel}
                      {": "}
                    </span>
                    {row.role}
                    {" · "}
                    {uidPrefix} {row.uid}
                  </p>
                </div>
              </TableCell>
              {showCredits ? (
                <TableCell className="min-w-0 break-words px-3 py-2 text-center text-xs text-muted-foreground">
                  {row.quota}
                </TableCell>
              ) : null}
              {showUsage ? (
                <TableCell className="min-w-0 break-words px-3 py-2 text-center text-xs text-muted-foreground">
                  {row.usage}
                </TableCell>
              ) : null}
              {showAction ? (
                <TableCell className="px-3 py-2 text-right">{row.action}</TableCell>
              ) : null}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
const QUOTA_CELL_IDS = ["used", "remaining"];
export function TeamManagementQuotaLoading() {
  const { t: t2 } = useTranslation();
  return (
    <div
      role="status"
      aria-busy="true"
      className="grid overflow-hidden rounded-lg border border-border sm:grid-cols-2 sm:divide-x sm:divide-border"
      data-action-ui-id="team.management-quota-loading"
    >
      <span className="sr-only">
        {t2("common.loading", {
          defaultValue: "加载中…",
        })}
      </span>
      {QUOTA_CELL_IDS.map((cellId, index2) => (
        <div
          key={cellId}
          className="space-y-2 border-b border-border p-3 last:border-b-0 sm:border-b-0"
        >
          <Skeleton className="h-2.5 w-20 rounded-sm" />
          <Skeleton className={index2 === 1 ? "h-3 w-24 rounded-sm" : "h-3 w-14 rounded-sm"} />
        </div>
      ))}
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
              <p className="break-words text-muted-foreground">{metric.label}</p>
              {metric.actionPlacement === "label" && metric.action ? (
                <div className="shrink-0">{metric.action}</div>
              ) : null}
            </div>
            <p
              className={cn$2(
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
export function Progress({ className, children: children2, value, ...props }) {
  return (
    <ProgressRoot
      value={value}
      data-slot="progress"
      className={cn$2("flex flex-wrap gap-3", className)}
      {...props}
    >
      {children2}
      <ProgressTrack>
        <ProgressIndicator />
      </ProgressTrack>
    </ProgressRoot>
  );
}
export function ProgressTrack({ className, ...props }) {
  return (
    <ProgressTrack$1
      className={cn$2(
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
      className={cn$2("h-full bg-primary transition-all", className)}
      {...props}
    />
  );
}
const LOW_ALLOWANCE_THRESHOLD = 50n;
function usagePercent(used, limit) {
  const usedAmount = BigInt(used);
  const limitAmount = BigInt(limit);
  if (limitAmount === 0n) return usedAmount > 0n ? 100 : 0;
  const clampedUsed = usedAmount > limitAmount ? limitAmount : usedAmount;
  return Number((clampedUsed * 10000n) / limitAmount) / 100;
}
export function TeamMemberQuotaUsageCell({ quota, presentation = "usage", teamRemaining = null }) {
  const { t: t2 } = useTranslation();
  if (presentation === "current") {
    const currentAmount =
      quota.mode === "LIMITED"
        ? quota.remaining !== null && teamRemaining !== null
          ? minCreditAmount(quota.remaining, teamRemaining)
          : null
        : quota.mode === "UNLIMITED"
          ? teamRemaining
          : null;
    const currentUnavailable = currentAmount === null;
    if (currentUnavailable) {
      return (
        <Tooltip>
          <TooltipTrigger
            render={<span className="inline-flex cursor-help tabular-nums text-muted-foreground" />}
            aria-label={t2("team.management.currentQuotaUnavailable", {
              defaultValue: "当前可用积分暂不可获取",
            })}
          >
            —
          </TooltipTrigger>
          <TooltipContent>
            {t2("team.management.currentQuotaUnavailable", {
              defaultValue: "当前可用积分暂不可获取",
            })}
          </TooltipContent>
        </Tooltip>
      );
    }
    const lowAllowance = BigInt(currentAmount) < LOW_ALLOWANCE_THRESHOLD;
    const lowAllowanceWarning = t2("team.management.lowAllowanceWarning", {
      defaultValue: "成员可使用额度过低，请增加成员额度上限或充值积分。",
    });
    return (
      <span className="inline-flex items-center gap-1 tabular-nums">
        <span className={lowAllowance ? "text-destructive" : "text-foreground"}>
          {formatCreditAmount(currentAmount)}
        </span>
        {lowAllowance ? (
          <Tooltip>
            <TooltipTrigger
              render={<span className="inline-flex cursor-help text-destructive" />}
              aria-label={lowAllowanceWarning}
              data-action-ui-id="team.management-member-low-allowance-warning"
            >
              <CircleAlert aria-hidden={true} className="size-3.5" strokeWidth={1.5} />
            </TooltipTrigger>
            <TooltipContent>{lowAllowanceWarning}</TooltipContent>
          </Tooltip>
        ) : null}
      </span>
    );
  }
  if (quota.mode === "UNAVAILABLE") {
    return (
      <Tooltip>
        <TooltipTrigger
          render={<span className="inline-flex cursor-help tabular-nums" />}
          aria-label={t2("team.credit.usageUnavailableTooltip", {
            defaultValue: "用量数据暂不可获取",
          })}
        >
          —
        </TooltipTrigger>
        <TooltipContent>
          {t2("team.credit.usageUnavailableTooltip", {
            defaultValue: "用量数据暂不可获取",
          })}
        </TooltipContent>
      </Tooltip>
    );
  }
  if (quota.mode === "UNLIMITED") {
    return (
      <span className="text-muted-foreground">
        {t2("team.credit.unlimited", {
          defaultValue: "无限额",
        })}
      </span>
    );
  }
  const limit = formatCreditAmount(quota.limit ?? "");
  if (quota.used === null) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={<span className="inline-flex cursor-help tabular-nums text-foreground" />}
          aria-label={t2("team.credit.usageUnavailableWithAllowance", {
            defaultValue: "{{allowance}}，用量数据暂不可获取",
            allowance: t2("team.credit.personalLimit", {
              defaultValue: "限额 {{limit}}",
              limit,
            }),
          })}
        >
          <span className="text-muted-foreground">—</span>
          <span className="text-muted-foreground">
            {" / "}
            {limit}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          {t2("team.credit.usageUnavailableTooltip", {
            defaultValue: "用量数据暂不可获取",
          })}
        </TooltipContent>
      </Tooltip>
    );
  }
  const used = formatCreditAmount(quota.used);
  return (
    <div className="flex w-full flex-col items-center gap-1.5">
      <div className="text-center tabular-nums text-foreground">
        <span>{used}</span>
        <span className="text-muted-foreground">
          {" / "}
          {limit}
        </span>
      </div>
      <Progress
        className="w-32 gap-0"
        value={usagePercent(quota.used, quota.limit ?? "0")}
        aria-label={t2("team.credit.quotaUsageValue", {
          defaultValue: "已用 {{used}} / 个人限额 {{limit}}",
          used,
          limit,
        })}
      />
    </div>
  );
}
export function TeamPanelEmpty({ title, description }) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center px-6 py-8 text-center">
      <span className="mb-3 flex size-10 items-center justify-center rounded-lg bg-foreground/[0.04] text-foreground">
        <Icon icon={Inbox} size="lg" className="opacity-60" aria-hidden={true} />
      </span>
      <p className="break-words font-heading text-sm font-medium text-foreground">{title}</p>
      {description ? (
        <p className="mt-1 max-w-sm break-words text-xs/relaxed text-muted-foreground">
          {description}
        </p>
      ) : null}
    </div>
  );
}
const ANONYMOUS_USER_KEY = "anonymous";
const PERSONAL_SCENARIO_KEY = "personal";
export function creditTransferTermsKey(params) {
  const userKey = params.userId?.trim() || ANONYMOUS_USER_KEY;
  const scenarioKey = params.groupId?.trim() || PERSONAL_SCENARIO_KEY;
  return `${userKey}:${HILO_HUB_BIZ_LINE}:${scenarioKey}`;
}
export function isCreditTransferTermsAccepted(accepted, key2) {
  if (accepted === void 0 || typeof accepted === "boolean") return false;
  return accepted[key2] !== void 0;
}
export function isBatchRemoveEligible(member) {
  return member.permissions.removeMember.allowed;
}
export function toggleMemberSelection(selected2, userId, nextSelected) {
  const copy2 = new Set(selected2);
  if (nextSelected) copy2.add(userId);
  else copy2.delete(userId);
  return copy2;
}
export function selectLoadedEligible(members, eligible) {
  return new Set(members.filter(eligible).map((member) => member.userId));
}
export function partitionSelection(members, selectedIds, eligible) {
  const selectedEligible = [];
  const selectedIneligible = [];
  for (const member of members) {
    if (!selectedIds.has(member.userId)) continue;
    if (eligible(member)) selectedEligible.push(member);
    else selectedIneligible.push(member);
  }
  return {
    selectedEligible,
    selectedIneligible,
  };
}
async function mapPoolSettled(items, concurrency, worker) {
  const limit = Math.max(1, Math.min(concurrency, items.length || 1));
  const results = new Array(items.length);
  let nextIndex = 0;
  async function runWorker() {
    while (nextIndex < items.length) {
      const index2 = nextIndex;
      nextIndex += 1;
      try {
        const value = await worker(items[index2]);
        results[index2] = {
          status: "fulfilled",
          value,
        };
      } catch (reason) {
        results[index2] = {
          status: "rejected",
          reason,
        };
      }
    }
  }
  await Promise.all(
    Array.from(
      {
        length: Math.min(limit, items.length),
      },
      () => runWorker(),
    ),
  );
  return results;
}
function summarizeBatch(results) {
  let successCount = 0;
  let failedCount = 0;
  let skippedCount = 0;
  for (const item of results) {
    if (item.status === "success") successCount += 1;
    else if (item.status === "failed") failedCount += 1;
    else skippedCount += 1;
  }
  return {
    successCount,
    failedCount,
    skippedCount,
  };
}
export function hasMemberGovernanceAction(actions) {
  return actions.changeRole || actions.changeQuota || actions.removeMember;
}
export function assignableRolesForTarget(targetRole, canChangeRole) {
  if (!canChangeRole) return [];
  if (targetRole === "OWNER") return [];
  return ["MEMBER", "ADMIN"];
}
function firstString(details, keys2) {
  if (!details) return void 0;
  for (const key2 of keys2) {
    const value = details[key2];
    if (typeof value === "string" && value.trim().length > 0) return value.trim();
  }
  return void 0;
}
export function describeTeamMutationError(error) {
  if (error instanceof TeamApiError) {
    const details = error.payload.details;
    const reason = firstString(details, ["reason", "reason_code"]);
    const upstreamStatusCode = firstString(details, ["upstream_status_code", "status_code"]);
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
let ScopeChangedError$2 = class ScopeChangedError extends Error {};
const REMOVE_CONCURRENCY = 3;
export function BatchRemoveMembersDialog({
  scope,
  members,
  protectedNote,
  teamName,
  onClose,
  onComplete,
}) {
  const { t: t2 } = useTranslation();
  const queryClient2 = useQueryClient();
  const { activeScope } = useTeamAccount();
  const [error, setError] = reactExports.useState(null);
  const mutation = useMutation({
    mutationFn: async () => {
      if (!activeScope || !accountScopeEquals(activeScope, scope)) {
        throw new ScopeChangedError$2();
      }
      const settled = await mapPoolSettled(members, REMOVE_CONCURRENCY, async (member) => {
        await teamApi.removeMember(scope, member.userId);
        return member;
      });
      return settled.map((result, index2) => {
        const member = members[index2];
        if (result.status === "fulfilled") {
          return {
            userId: member.userId,
            displayName: member.displayName,
            status: "success",
          };
        }
        const detail = describeTeamMutationError(result.reason);
        const suffix = formatTeamMutationErrorSuffix(detail);
        return {
          userId: member.userId,
          displayName: member.displayName,
          status: "failed",
          reason: suffix || detail.code || "failed",
        };
      });
    },
    retry: false,
    onSuccess: async (results) => {
      setError(null);
      await Promise.all([
        queryClient2.invalidateQueries({
          queryKey: teamQueryKeys.membership(scope),
        }),
        queryClient2.invalidateQueries({
          queryKey: creditQueryKeys.scope(scope),
        }),
      ]);
      const summary = summarizeBatch(results);
      const failedIds = results
        .filter((item) => item.status === "failed")
        .map((item) => item.userId);
      if (summary.failedCount === 0) {
        dedupedToast.success(
          t2("team.management.batchRemoveSucceeded", {
            defaultValue: "已移除 {{count}} 名成员。",
            count: summary.successCount,
          }),
        );
        onComplete([]);
        onClose();
        return;
      }
      const partial = t2("team.management.batchRemovePartial", {
        defaultValue: "成功 {{ok}}，失败 {{fail}}。失败成员保持选中可重试。",
        ok: summary.successCount,
        fail: summary.failedCount,
      });
      setError(partial);
      dedupedToast.error(partial);
      onComplete(failedIds);
    },
    onError: (err) => {
      if (err instanceof ScopeChangedError$2) {
        dedupedToast.error(
          t2("team.management.scopeChanged", {
            defaultValue: "当前请求与计费 Group 已变化，请重新打开团队管理。",
          }),
        );
        onClose();
        return;
      }
      setError(
        t2("team.management.batchRemoveFailed", {
          defaultValue: "批量移除失败，请稍后重试。",
        }),
      );
    },
  });
  return (
    <AlertDialog open={true} onOpenChange={(next2) => !next2 && !mutation.isPending && onClose()}>
      <AlertDialogContent layer="nested" data-action-ui-id="team.management-batch-remove-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t2("team.management.batchRemoveTitle", {
              defaultValue: "批量移除成员",
            })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t2("team.management.batchRemoveDescription", {
              defaultValue: "确认从“{{team}}”移除 {{count}} 名成员？此操作不可撤销。",
              team: teamName,
              count: members.length,
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {protectedNote ? <p className="text-xs text-muted-foreground">{protectedNote}</p> : null}
        {error ? (
          <p className="text-xs text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={mutation.isPending}
            data-action-ui-id="team.management-batch-remove-cancel"
            onClick={() => onClose()}
          >
            {t2("common.cancel", {
              defaultValue: "取消",
            })}
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            loading={mutation.isPending}
            disabled={members.length === 0 || mutation.isPending}
            onClick={(event) => {
              event.preventDefault();
              mutation.mutate();
            }}
            data-action-ui-id="team.management-batch-remove-confirm"
          >
            {t2("team.management.removeSelected", {
              defaultValue: "移除成员",
            })}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
