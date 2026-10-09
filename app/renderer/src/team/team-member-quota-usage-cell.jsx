// team-member-quota-usage-cell.jsx
import { CircleAlert, minCreditAmount, useTranslation } from "../vendor.js";
import {
  Tooltip,
  TooltipTrigger,
} from "../vendor-inline/vscode-base/graph.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { Progress } from "./team-management-detail-loading.jsx";
import { TooltipContent } from "../infra/dialog-content.jsx";
import { formatCreditAmount } from "./team-panel-stale.jsx";

const LOW_ALLOWANCE_THRESHOLD = 50n;

function usagePercent(used, limit) {
  const usedAmount = BigInt(used);
  const limitAmount = BigInt(limit);
  if (limitAmount === 0n) return usedAmount > 0n ? 100 : 0;
  const clampedUsed = usedAmount > limitAmount ? limitAmount : usedAmount;
  return Number((clampedUsed * 10000n) / limitAmount) / 100;
}

export function TeamMemberQuotaUsageCell({
  quota,
  presentation = "usage",
  teamRemaining = null,
}) {
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
            render={
              <span className="inline-flex cursor-help tabular-nums text-muted-foreground" />
            }
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
              render={
                <span className="inline-flex cursor-help text-destructive" />
              }
              aria-label={lowAllowanceWarning}
              data-action-ui-id="team.management-member-low-allowance-warning"
            >
              <CircleAlert
                aria-hidden={true}
                className="size-3.5"
                strokeWidth={1.5}
              />
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
          render={
            <span className="inline-flex cursor-help tabular-nums text-foreground" />
          }
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
