// team-credit-history-section.jsx
import {
  DEFAULT_CREDIT_REMINDER_THRESHOLD,
  normalizeCreditReminderConfig,
} from "../generation/to-workspace-browser-url.js";
import { Info$1, reactExports, useStorage, useTranslation } from "../vendor.js";
import {
  useAuth,
  useOptionalTeamAccount,
} from "../assets/credit-query-keys.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { Skeleton } from "./use-wallet-query.jsx";
import {
  Icon,
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
} from "../vendor-inline/vscode-base/graph.jsx";
import { TooltipContent } from "../infra/dialog-content.jsx";

const LEGACY_PERSONAL_GROUP_ID = "default";

function creditReminderScopeKey(scope) {
  return `${scope.uid}:${scope.scopeType}:${scope.groupId}`;
}

function defaultCreditReminderConfig() {
  return {
    enabled: true,
    threshold: DEFAULT_CREDIT_REMINDER_THRESHOLD,
  };
}

function resolveCreditReminderScope(uid2, teamAccount) {
  if (!uid2) return null;
  if (teamAccount?.integrationEnabled) {
    const activeScope = teamAccount.activeScope;
    const viewKind = teamAccount.viewModel.kind;
    if (
      !activeScope ||
      (viewKind !== "ready_personal" && viewKind !== "ready_team")
    ) {
      return null;
    }
    return {
      // The persisted key must use the authenticated user's UID. TeamAccount's
      // identityKey is an internal session/identity handle and is not the
      // user-facing account identifier promised by the local-storage contract.
      uid: uid2,
      scopeType: viewKind === "ready_team" ? "team" : "personal",
      groupId: activeScope.groupId,
    };
  }
  return {
    uid: uid2,
    scopeType: "personal",
    groupId: LEGACY_PERSONAL_GROUP_ID,
  };
}

function assertValidConfig(config2) {
  const normalized = normalizeCreditReminderConfig(config2);
  if (
    normalized.enabled !== config2.enabled ||
    normalized.threshold !== config2.threshold
  ) {
    throw new Error("Invalid credit reminder configuration");
  }
  return normalized;
}

export function useCreditReminderConfig() {
  const { user } = useAuth();
  const teamAccount = useOptionalTeamAccount();
  const [configs, , setConfigsAsync, isHydrated] = useStorage(
    "global.creditReminderConfigs",
  );
  const scope = resolveCreditReminderScope(user?.userID, teamAccount);
  const scopeKey = scope ? creditReminderScopeKey(scope) : null;
  const config2 = reactExports.useMemo(() => {
    if (!scopeKey) return defaultCreditReminderConfig();
    return normalizeCreditReminderConfig(configs[scopeKey]);
  }, [configs, scopeKey]);
  const saveConfig = reactExports.useCallback(
    async (next2) => {
      if (!scopeKey) throw new Error("Credit reminder scope is unavailable");
      const normalized = assertValidConfig(next2);
      const persisted = await setConfigsAsync((current2) => ({
        ...current2,
        [scopeKey]: normalized,
      }));
      if (!persisted)
        throw new Error("Failed to persist credit reminder configuration");
    },
    [scopeKey, setConfigsAsync],
  );
  return {
    config: config2,
    scope,
    scopeKey,
    isReady: isHydrated && scopeKey !== null,
    saveConfig,
  };
}

const ANNUAL_CYCLE_TYPE = 3;

export function isAnnualMember(wallet) {
  return (
    wallet?.subscription_state_known === true &&
    wallet.cycle_type === ANNUAL_CYCLE_TYPE
  );
}

export function TeamCreditHistorySection({
  children: children2,
  showInfo = true,
  action,
}) {
  const { t: t2 } = useTranslation();
  return (
    <section className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <h3 className="font-heading text-sm font-medium text-foreground">
            {t2("team.credit.history", {
              defaultValue: "积分流水",
            })}
          </h3>
          {showInfo ? (
            <TooltipProvider delay={200}>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      type="button"
                      className="inline-flex size-4 items-center justify-center text-muted-foreground hover:text-foreground"
                      aria-label={t2("team.credit.historyHelp", {
                        defaultValue: "积分流水说明",
                      })}
                      data-action-ui-id="team.credit-history-info"
                    />
                  }
                >
                  <Icon icon={Info$1} size="sm" aria-hidden={true} />
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  className="!max-w-[26rem] leading-relaxed"
                >
                  {t2("team.credit.historyHelpContent", {
                    defaultValue:
                      "该积分流水仅展示该用户在该团队下使用过的积分明细，无法查看团队其他人的用量。",
                  })}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children2}
    </section>
  );
}

export function TeamCreditSummaryLoading() {
  const { t: t2 } = useTranslation();
  return (
    <div
      role="status"
      aria-busy="true"
      className="space-y-4"
      data-action-ui-id="team.credit-summary-loading"
    >
      <span className="sr-only">
        {t2("common.loading", {
          defaultValue: "加载中…",
        })}
      </span>
      <div className="space-y-2">
        <Skeleton className="h-3 w-24 rounded-sm" />
        <Skeleton className="h-7 w-32 rounded-sm" />
      </div>
      <div className="grid gap-3 border-y border-border py-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Skeleton className="h-3 w-20 rounded-sm" />
          <Skeleton className="h-3.5 w-48 max-w-full rounded-sm" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-24 rounded-sm" />
          <Skeleton className="h-3.5 w-28 rounded-sm" />
        </div>
      </div>
      <div className="flex items-start gap-2 rounded-md bg-muted/50 px-3 py-2">
        <Skeleton className="mt-0.5 size-4 shrink-0" />
        <div className="min-w-0 flex-1 space-y-2 py-0.5">
          <Skeleton className="h-2.5 w-full rounded-sm" />
          <Skeleton className="h-2.5 w-4/5 rounded-sm" />
        </div>
      </div>
    </div>
  );
}
