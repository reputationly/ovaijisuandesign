// team-credit-summary-surface.jsx
import { Info$1 as Info, useTranslation } from "../vendor.js";
import {
  Icon,
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
} from "../vendor-inline/vscode-base/graph.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { TooltipContent } from "../infra/dialog-content.jsx";
import { formatCreditAmount } from "./team-panel-stale.jsx";
export function TeamCreditSummarySurface(props) {
  const { t } = useTranslation();
  if (props.visibility === "team") {
    const {
      status: summaryStatus,
      mode,
      teamRemaining,
      memberUsed,
      memberLimit,
      actionUiId,
    } = props;
    return (
      <section
        className="space-y-4"
        data-action-ui-id={actionUiId}
        data-credit-mode={summaryStatus === "READY" ? mode : summaryStatus}
        data-credit-status={summaryStatus}
        data-credit-visibility="team"
      >
        <div>
          <p
            className="break-words text-xs text-muted-foreground"
            data-action-ui-id="team.credit-team-remaining"
          >
            {t("team.credit.teamRemaining", {
              defaultValue: "团队剩余积分",
            })}
          </p>
          <p className="mt-1 max-w-full break-all font-heading text-2xl font-medium text-foreground tabular-nums">
            {teamRemaining === null ? "—" : formatCreditAmount(teamRemaining)}
          </p>
        </div>
        {summaryStatus === "READY" ? (
          <dl className="grid gap-3 border-y border-border py-3 text-xs">
            <div>
              <dt className="break-words text-muted-foreground">
                {mode === "UNLIMITED"
                  ? t("team.credit.quotaMode", {
                      defaultValue: "个人额度",
                    })
                  : t("team.credit.quotaUsage", {
                      defaultValue: "额度使用",
                    })}
              </dt>
              <dd className="mt-1 break-words font-medium text-foreground tabular-nums">
                {mode === "UNLIMITED"
                  ? t("team.credit.unlimited", {
                      defaultValue: "无限额",
                    })
                  : t("team.credit.quotaUsageValue", {
                      defaultValue: "已用 {{used}} / 个人限额 {{limit}}",
                      used: formatCreditAmount(memberUsed ?? ""),
                      limit: formatCreditAmount(memberLimit ?? ""),
                    })}
              </dd>
            </div>
          </dl>
        ) : null}
      </section>
    );
  }
  const {
    status,
    mode,
    availableAmount,
    memberRemaining,
    memberUsed,
    memberLimit,
    showUsageDetails = true,
    actionUiId,
  } = props;
  const isManager = props.visibility === "manager-self";
  const usageAvailable =
    status === "READY" && mode === "LIMITED" && showUsageDetails;
  const unavailableHelp = t("team.credit.availableUnavailableHelp", {
    defaultValue: "额度数据暂不可用，请稍后重试。",
  });
  const helpContent = (() => {
    if (status !== "READY") return <p>{unavailableHelp}</p>;
    if (!isManager) {
      return (
        <p>
          {mode === "LIMITED"
            ? t("team.credit.memberLimitedAvailableRule", {
                defaultValue:
                  "可用额度取我的剩余额度和团队剩余积分中较小的值。",
              })
            : t("team.credit.memberUnlimitedAvailableRule", {
                defaultValue: "未设置个人限额，可用额度以团队剩余积分为准。",
              })}
        </p>
      );
    }
    if (mode === "LIMITED") {
      return (
        <div className="space-y-1">
          <p>
            {t("team.credit.managerMemberRemaining", {
              defaultValue: "我的剩余额度：{{remaining}}",
              remaining: formatCreditAmount(memberRemaining ?? ""),
            })}
          </p>
          <p>
            {t("team.credit.managerTeamRemaining", {
              defaultValue: "团队剩余积分：{{team}}",
              team:
                props.teamRemaining === null
                  ? "—"
                  : formatCreditAmount(props.teamRemaining),
            })}
          </p>
          <p>
            {t("team.credit.managerLimitedAvailableRule", {
              defaultValue: "可用额度取我的剩余额度和团队剩余积分中较小的值。",
            })}
          </p>
        </div>
      );
    }
    return (
      <div className="space-y-1">
        <p>
          {t("team.credit.managerUnlimitedMember", {
            defaultValue: "我的积分额度：无限额",
          })}
        </p>
        <p>
          {t("team.credit.managerTeamRemaining", {
            defaultValue: "团队剩余积分：{{team}}",
            team:
              props.teamRemaining === null
                ? "—"
                : formatCreditAmount(props.teamRemaining),
          })}
        </p>
        <p>
          {t("team.credit.managerUnlimitedAvailableRule", {
            defaultValue: "未设置个人限额时，可用额度以团队剩余积分为准。",
          })}
        </p>
      </div>
    );
  })();
  return (
    <section
      className="space-y-4"
      data-action-ui-id={actionUiId}
      data-credit-mode={status === "READY" ? mode : status}
      data-credit-status={status}
      data-credit-visibility={props.visibility}
    >
      <div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <span>
            {t("team.credit.available", {
              defaultValue: "可用额度",
            })}
          </span>
          <TooltipProvider delay={200}>
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    className="inline-flex size-4 items-center justify-center text-muted-foreground hover:text-foreground"
                    aria-label={t("team.credit.availableHelp", {
                      defaultValue: "可用额度说明",
                    })}
                    data-action-ui-id="team.credit-available-info"
                  />
                }
              >
                <Icon icon={Info} size="sm" aria-hidden={true} />
              </TooltipTrigger>
              <TooltipContent
                side="top"
                className="!max-w-[26rem] leading-relaxed"
              >
                {helpContent}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <p className="mt-1 max-w-full break-all font-heading text-2xl font-medium text-foreground tabular-nums">
          {availableAmount === null ? "—" : formatCreditAmount(availableAmount)}
        </p>
      </div>
      {usageAvailable ? (
        <dl className="grid gap-3 border-y border-border py-3 text-xs">
          <div>
            <dt className="break-words text-muted-foreground">
              {t("team.credit.quotaUsage", {
                defaultValue: "额度使用",
              })}
            </dt>
            <dd className="mt-1 break-words font-medium text-foreground tabular-nums">
              {t("team.credit.quotaUsageValue", {
                defaultValue: "已用 {{used}} / 个人限额 {{limit}}",
                used: formatCreditAmount(memberUsed ?? ""),
                limit: formatCreditAmount(memberLimit ?? ""),
              })}
            </dd>
          </div>
        </dl>
      ) : null}
    </section>
  );
}
