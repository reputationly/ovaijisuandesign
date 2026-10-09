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
  const { t: t2 } = useTranslation();
  if (props.visibility === "team") {
    const {
      status: status2,
      mode: mode22,
      teamRemaining,
      memberUsed: memberUsed2,
      memberLimit: memberLimit2,
      actionUiId: actionUiId2,
    } = props;
    return (
      <section
        className="space-y-4"
        data-action-ui-id={actionUiId2}
        data-credit-mode={status2 === "READY" ? mode22 : status2}
        data-credit-status={status2}
        data-credit-visibility="team"
      >
        <div>
          <p
            className="break-words text-xs text-muted-foreground"
            data-action-ui-id="team.credit-team-remaining"
          >
            {t2("team.credit.teamRemaining", {
              defaultValue: "团队剩余积分",
            })}
          </p>
          <p className="mt-1 max-w-full break-all font-heading text-2xl font-medium text-foreground tabular-nums">
            {teamRemaining === null ? "—" : formatCreditAmount(teamRemaining)}
          </p>
        </div>
        {status2 === "READY" ? (
          <dl className="grid gap-3 border-y border-border py-3 text-xs">
            <div>
              <dt className="break-words text-muted-foreground">
                {mode22 === "UNLIMITED"
                  ? t2("team.credit.quotaMode", {
                      defaultValue: "个人额度",
                    })
                  : t2("team.credit.quotaUsage", {
                      defaultValue: "额度使用",
                    })}
              </dt>
              <dd className="mt-1 break-words font-medium text-foreground tabular-nums">
                {mode22 === "UNLIMITED"
                  ? t2("team.credit.unlimited", {
                      defaultValue: "无限额",
                    })
                  : t2("team.credit.quotaUsageValue", {
                      defaultValue: "已用 {{used}} / 个人限额 {{limit}}",
                      used: formatCreditAmount(memberUsed2 ?? ""),
                      limit: formatCreditAmount(memberLimit2 ?? ""),
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
    mode: mode2,
    availableAmount,
    memberRemaining,
    memberUsed,
    memberLimit,
    showUsageDetails = true,
    actionUiId,
  } = props;
  const isManager = props.visibility === "manager-self";
  const usageAvailable =
    status === "READY" && mode2 === "LIMITED" && showUsageDetails;
  const unavailableHelp = t2("team.credit.availableUnavailableHelp", {
    defaultValue: "额度数据暂不可用，请稍后重试。",
  });
  const helpContent = (() => {
    if (status !== "READY") return <p>{unavailableHelp}</p>;
    if (!isManager) {
      return (
        <p>
          {mode2 === "LIMITED"
            ? t2("team.credit.memberLimitedAvailableRule", {
                defaultValue:
                  "可用额度取我的剩余额度和团队剩余积分中较小的值。",
              })
            : t2("team.credit.memberUnlimitedAvailableRule", {
                defaultValue: "未设置个人限额，可用额度以团队剩余积分为准。",
              })}
        </p>
      );
    }
    if (mode2 === "LIMITED") {
      return (
        <div className="space-y-1">
          <p>
            {t2("team.credit.managerMemberRemaining", {
              defaultValue: "我的剩余额度：{{remaining}}",
              remaining: formatCreditAmount(memberRemaining ?? ""),
            })}
          </p>
          <p>
            {t2("team.credit.managerTeamRemaining", {
              defaultValue: "团队剩余积分：{{team}}",
              team:
                props.teamRemaining === null
                  ? "—"
                  : formatCreditAmount(props.teamRemaining),
            })}
          </p>
          <p>
            {t2("team.credit.managerLimitedAvailableRule", {
              defaultValue: "可用额度取我的剩余额度和团队剩余积分中较小的值。",
            })}
          </p>
        </div>
      );
    }
    return (
      <div className="space-y-1">
        <p>
          {t2("team.credit.managerUnlimitedMember", {
            defaultValue: "我的积分额度：无限额",
          })}
        </p>
        <p>
          {t2("team.credit.managerTeamRemaining", {
            defaultValue: "团队剩余积分：{{team}}",
            team:
              props.teamRemaining === null
                ? "—"
                : formatCreditAmount(props.teamRemaining),
          })}
        </p>
        <p>
          {t2("team.credit.managerUnlimitedAvailableRule", {
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
      data-credit-mode={status === "READY" ? mode2 : status}
      data-credit-status={status}
      data-credit-visibility={props.visibility}
    >
      <div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <span>
            {t2("team.credit.available", {
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
                    aria-label={t2("team.credit.availableHelp", {
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
              {t2("team.credit.quotaUsage", {
                defaultValue: "额度使用",
              })}
            </dt>
            <dd className="mt-1 break-words font-medium text-foreground tabular-nums">
              {t2("team.credit.quotaUsageValue", {
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
