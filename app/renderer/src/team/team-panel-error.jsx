// team-panel-error.jsx
import { AlertCircle, LockKeyhole, useTranslation } from "../vendor.js";
import { Icon } from "../vendor-inline/vscode-base/graph.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { getTeamReasonText } from "./team-panel-stale.jsx";
import { Button$1 } from "../infra/dialog-content.jsx";

export function TeamPanelError({ title, description, onRetry }) {
  const { t: t2 } = useTranslation();
  return (
    <div
      role="alert"
      className="flex min-h-40 flex-col items-center justify-center px-6 py-8 text-center"
    >
      <span className="mb-3 flex size-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
        <Icon icon={AlertCircle} size="lg" aria-hidden={true} />
      </span>
      <div>
        <p className="break-words font-heading text-sm font-medium text-foreground">
          {title ??
            t2("team.common.loadFailed", {
              defaultValue: "加载失败",
            })}
        </p>
        {description ? (
          <p className="mt-1 max-w-sm break-words text-xs/relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {onRetry ? (
        <Button$1
          type="button"
          variant="outline"
          size="sm"
          className="mt-3 h-auto min-h-7 max-w-full whitespace-normal text-center leading-relaxed"
          onClick={onRetry}
          data-action-ui-id="team.panel-retry"
        >
          {t2("common.retry", {
            defaultValue: "重试",
          })}
        </Button$1>
      ) : null}
    </div>
  );
}

const TITLE_KEY_BY_REASON = {
  permission_denied: "team.gated.permissionDenied",
  resource_closed: "team.gated.teamDissolved",
  team_billing_disabled: "team.credit.unavailable",
  team_create_disabled: "team.gated.createUnavailable",
  team_invitation_disabled: "team.gated.invitationUnavailable",
  team_limit_reached: "team.gated.teamLimitReached",
  team_management_disabled: "team.gated.managementUnavailable",
  team_read_disabled: "team.gated.informationUnavailable",
  upgrade_required: "team.gated.upgradeRequired",
  // Credit ledger is stubbed upstream — do not present as "whole team is broken"
  // or as an authoritative empty history ("暂无积分流水").
  upstream_transactions_unavailable: "team.credit.historyUnavailable",
  feature_disabled: "team.credit.historyUnavailable",
  upstream_contract_not_ready: "team.credit.historyUnavailable",
  user_capability_unavailable: "team.gated.permissionsSyncing",
};

export function TeamPanelGated({ reasonCode }) {
  const { t: t2 } = useTranslation();
  const titleKey =
    TITLE_KEY_BY_REASON[reasonCode] ?? "team.common.temporarilyUnavailable";
  const title = t2(titleKey, {
    defaultValue: "团队功能暂不可用",
  });
  const reason = getTeamReasonText(t2, reasonCode);
  return (
    <div
      className="flex min-h-40 flex-col items-center justify-center px-6 py-8 text-center"
      data-team-reason-code={reasonCode}
    >
      <span className="mb-3 flex size-10 items-center justify-center rounded-lg bg-foreground/[0.04] text-foreground">
        <Icon
          icon={LockKeyhole}
          size="lg"
          className="opacity-60"
          aria-hidden={true}
        />
      </span>
      <p className="break-words font-heading text-sm font-medium text-foreground">
        {title}
      </p>
      {reason !== title ? (
        <p className="mt-1 max-w-sm break-words text-xs/relaxed text-muted-foreground">
          {reason}
        </p>
      ) : null}
    </div>
  );
}
