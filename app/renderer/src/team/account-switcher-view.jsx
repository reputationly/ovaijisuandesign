// account-switcher-view.jsx
import { ChevronLeft, Plus, reactExports, useQuery, useTranslation } from "../vendor.js";
import { dedupedToast } from "../infra/agent-http-client.js";
import {
  IDENTITY_GC_MS,
  IDENTITY_STALE_MS,
  Spinner,
  TEAM_INFO_REFRESH_MS,
  useTeamContextsQuery,
} from "./use-team-transactions-feed-query.jsx";
import { teamQueryKeys } from "../assets/gateway-scope-provider.jsx";
import { teamApi } from "./team-api.js";
import { Icon } from "../vendor-inline/vscode-base/graph.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  deriveAccountPresentation,
  getTeamReasonText,
  TeamPanelStale,
  TeamTransitionFeedback,
  TeamUnavailableAction,
} from "./team-panel-stale.jsx";
import {
  useIsScrolling,
  useTeamAccount,
} from "../assets/credit-query-keys.jsx";
import { Button } from "../infra/dialog-content.jsx";
import { isRecoverableTeamAccountStatus } from "../workspace/home-service.jsx";
import { AccountSwitcherRowSurface } from "./account-switcher-row-surface.jsx";
function useUserTeamCapabilitiesQuery(identityKey, enabled = true) {
  return useQuery({
    queryKey: teamQueryKeys.userCapabilities(identityKey ?? "NO_IDENTITY"),
    queryFn: ({ signal }) => {
      if (!identityKey)
        throw new Error("Team capabilities queried without an identity");
      return teamApi.getCapabilities(identityKey, {
        signal,
      });
    },
    enabled: enabled && identityKey !== null,
    retry: false,
    staleTime: IDENTITY_STALE_MS,
    gcTime: IDENTITY_GC_MS,
    refetchInterval: TEAM_INFO_REFRESH_MS,
    refetchOnWindowFocus: true,
  });
}
function contextSection(item) {
  if (item.accountType === "PERSONAL") return "personal";
  return item.lifecycle === "DISSOLVED" ? "dissolved" : "teams";
}
const CONTEXT_SECTION_ORDER = {
  personal: 0,
  teams: 1,
  dissolved: 2,
};
const TEAM_ROLE_DATA_ATTRIBUTE = {
  OWNER: "owner",
  ADMIN: "admin",
  MEMBER: "member",
};
function compareTimestampDescending(left, right) {
  const normalizedLeft = left ?? 0;
  const normalizedRight = right ?? 0;
  if (normalizedLeft === normalizedRight) return 0;
  return normalizedLeft > normalizedRight ? -1 : 1;
}
function compareContexts(left, right) {
  const leftSection = contextSection(left);
  const rightSection = contextSection(right);
  const sectionDifference =
    CONTEXT_SECTION_ORDER[leftSection] - CONTEXT_SECTION_ORDER[rightSection];
  if (sectionDifference !== 0) return sectionDifference;
  if (leftSection === "teams") {
    return compareTimestampDescending(
      left.lastActiveAtMs,
      right.lastActiveAtMs,
    );
  }
  if (leftSection === "dissolved") {
    return compareTimestampDescending(left.dissolvedAtMs, right.dissolvedAtMs);
  }
  return 0;
}
export function AccountSwitcherView({
  embedded = false,
  onBack,
  onCreate,
  onSwitchComplete,
  showSectionHeadings = !embedded,
}) {
  const { t: t2 } = useTranslation();
  const {
    integrationEnabled,
    snapshot: snapshot2,
    activeScope,
    accountDataVisible,
    lastTransitionAttempt,
    switchContext,
    recoverSelectedGroup,
    openCreate,
    openSwitchBlocked,
  } = useTeamAccount();
  const identityKey = snapshot2?.identityKey ?? null;
  const query = useTeamContextsQuery(identityKey, identityKey !== null);
  const capabilitiesQuery = useUserTeamCapabilitiesQuery(
    identityKey,
    integrationEnabled && identityKey !== null,
  );
  const contextsStale = Boolean(
    query.data && (query.isRefetchError || query.isError),
  );
  const openRecoveryAttemptedRef = reactExports.useRef(false);
  reactExports.useEffect(() => {
    if (openRecoveryAttemptedRef.current) return;
    if (!isRecoverableTeamAccountStatus(snapshot2?.status ?? "signed_out"))
      return;
    openRecoveryAttemptedRef.current = true;
    void recoverSelectedGroup("switcher_open");
  }, [snapshot2?.status, recoverSelectedGroup]);
  const [switchingGroupId, setSwitchingGroupId] = reactExports.useState(null);
  const scrollRef = reactExports.useRef(null);
  const isScrolling = useIsScrolling({
    scrollRef,
  });
  const rows = reactExports.useMemo(() => {
    const items = [...(query.data?.items ?? [])].sort(compareContexts);
    const seen2 = new Set();
    return items.map((item) => {
      const section = contextSection(item);
      const showHeading = !seen2.has(section);
      seen2.add(section);
      return {
        item,
        section,
        showHeading,
      };
    });
  }, [query.data]);
  reactExports.useEffect(() => {
    if (switchingGroupId === null) return;
    if (accountDataVisible && activeScope?.groupId === switchingGroupId) {
      setSwitchingGroupId(null);
    }
  }, [accountDataVisible, activeScope?.groupId, switchingGroupId]);
  const handleSwitch = async (item) => {
    if (
      switchingGroupId ||
      contextsStale ||
      item.lifecycle !== "ACTIVE" ||
      !item.switchDecision.allowed ||
      item.groupId === activeScope?.groupId
    ) {
      return;
    }
    setSwitchingGroupId(item.groupId);
    try {
      const result = await switchContext(item.groupId);
      if (result.status !== "completed") {
        if (result.status === "busy") openSwitchBlocked(result.blockingReasons);
        setSwitchingGroupId(null);
        return;
      }
      onSwitchComplete?.();
    } catch {
      setSwitchingGroupId(null);
    }
  };
  const getSwitchDisabledReason = (item) => {
    if (switchingGroupId !== null) return void 0;
    if (contextsStale) {
      return t2("team.common.refreshFailedDescription", {
        defaultValue: "暂时无法获取最新数据，请重试以确认当前状态。",
      });
    }
    if (item.lifecycle === "DISSOLVED") {
      return t2("team.reason.resource_closed", {
        defaultValue: "该团队已解散。",
      });
    }
    if (!item.switchDecision.allowed) {
      return getTeamReasonText(t2, item.switchDecision.reasonCode);
    }
    return void 0;
  };
  const createLabel = t2("team.create.title", {
    defaultValue: "创建团队",
  });
  const personalAccountLabel = t2("team.account.personal", {
    defaultValue: "个人账号",
  });
  const createUnavailableReason = capabilitiesQuery.isError
    ? getTeamReasonText(t2, "user_capability_unavailable")
    : capabilitiesQuery.isPending && !capabilitiesQuery.data
      ? t2("team.gated.permissionsSyncing", {
          defaultValue: "正在确认团队权限",
        })
      : capabilitiesQuery.data && !capabilitiesQuery.data.createTeam.allowed
        ? getTeamReasonText(t2, capabilitiesQuery.data.createTeam.reasonCode)
        : null;
  if (!integrationEnabled) return null;
  return (
    <div
      className={
        embedded ? "min-w-0" : "flex min-h-0 flex-1 flex-col overflow-hidden"
      }
      data-action-ui-id="team.account-switcher"
    >
      {!embedded ? (
        <div className="flex h-10 shrink-0 items-center gap-1 border-b border-border px-2">
          {onBack ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="shrink-0"
              onClick={onBack}
              aria-label={t2("common.back", {
                defaultValue: "返回",
              })}
              data-action-ui-id="team.account-switcher-back"
            >
              <Icon icon={ChevronLeft} size="sm" aria-hidden={true} />
            </Button>
          ) : null}
          <p className="min-w-0 flex-1 truncate whitespace-nowrap font-medium text-body-14 text-foreground">
            {t2("team.switcher.title", {
              defaultValue: "切换请求与计费 Group",
            })}
          </p>
        </div>
      ) : null}
      {lastTransitionAttempt && lastTransitionAttempt.kind !== "busy" ? (
        <div className="shrink-0 px-2 pt-2">
          <TeamTransitionFeedback attempt={lastTransitionAttempt} />
        </div>
      ) : null}
      <div
        ref={scrollRef}
        data-scrolling={isScrolling || void 0}
        className={
          embedded
            ? showSectionHeadings
              ? "scrollbar-fade max-h-[176px] overflow-y-auto p-1"
              : "scrollbar-fade max-h-[120px] overflow-y-auto p-1"
            : "scrollbar-fade min-h-0 flex-1 overflow-y-auto p-1"
        }
      >
        {query.isPending ? (
          <div
            role="status"
            aria-busy="true"
            className="flex h-24 items-center justify-center"
          >
            <Spinner />
            <span className="sr-only">
              {t2("common.loading", {
                defaultValue: "加载中…",
              })}
            </span>
          </div>
        ) : null}
        {query.isError && !query.data ? (
          <div role="alert" className="space-y-2 px-3 py-4 text-center">
            <p className="text-xs text-muted-foreground">
              {t2("team.switcher.loadFailed", {
                defaultValue: "账号列表加载失败",
              })}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                void (async () => {
                  if (snapshot2 && snapshot2.status !== "ready") {
                    await recoverSelectedGroup("user_retry");
                  }
                  await query.refetch();
                })();
              }}
              data-action-ui-id="team.account-switcher-retry"
            >
              {t2("common.retry", {
                defaultValue: "重试",
              })}
            </Button>
          </div>
        ) : null}
        {contextsStale ? (
          <div className="p-2">
            <TeamPanelStale
              isFetching={query.isFetching}
              onRetry={async () => {
                const result = await query.refetch();
                if (result.isError) {
                  const code2 =
                    result.error instanceof Error
                      ? result.error.message
                      : "refresh_failed";
                  dedupedToast.error(
                    t2("team.common.refreshFailedToast", {
                      defaultValue: "刷新失败：{{code}}",
                      code: code2,
                    }),
                  );
                  return;
                }
                dedupedToast.success(
                  t2("team.common.refreshOk", {
                    defaultValue: "数据已刷新",
                  }),
                );
              }}
            />
          </div>
        ) : null}
        {rows.map(({ item, section, showHeading }) => {
          const presentation = deriveAccountPresentation(
            item,
            personalAccountLabel,
          );
          return (
            <div key={item.groupId}>
              {showSectionHeadings && showHeading ? (
                <p className="px-2 pt-2 pb-1 text-caption-11 font-normal text-foreground/30">
                  {t2(`team.switcher.section.${section}`, {
                    defaultValue:
                      section === "personal"
                        ? "Personal"
                        : section === "teams"
                          ? "团队"
                          : "已解散",
                  })}
                </p>
              ) : null}
              <AccountSwitcherRowSurface
                accountType={item.accountType}
                active={activeScope?.groupId === item.groupId}
                disabled={
                  switchingGroupId !== null ||
                  contextsStale ||
                  item.lifecycle === "DISSOLVED" ||
                  !item.switchDecision.allowed
                }
                disabledReason={getSwitchDisabledReason(item)}
                displayName={presentation.displayName}
                groupId={presentation.visibleGroupId}
                loading={switchingGroupId === item.groupId}
                meta={
                  presentation.showsTeamMetadata && item.role
                    ? t2(`team.role.${item.role.toLowerCase()}`, {
                        defaultValue: item.role,
                      })
                    : void 0
                }
                onClick={() => void handleSwitch(item)}
                dataActionUiId="team.account-switcher-item"
                dataGroupId={item.groupId}
                dataTeamRole={
                  item.role ? TEAM_ROLE_DATA_ATTRIBUTE[item.role] : void 0
                }
              />
            </div>
          );
        })}
      </div>
      <div className="shrink-0 border-t border-border p-1">
        {createUnavailableReason ? (
          <TeamUnavailableAction
            label={createLabel}
            reason={createUnavailableReason}
            dataActionUiId="team.account-create"
            variant="ghost"
            className="w-full justify-start rounded-sm px-3 py-2 text-left !text-body-14 font-normal text-foreground/70"
            icon={
              <Icon
                icon={Plus}
                size="md"
                className="shrink-0"
                aria-hidden={true}
              />
            }
          />
        ) : (
          <Button
            type="button"
            variant="ghost"
            className="h-auto min-h-9 w-full min-w-0 justify-start whitespace-normal rounded-sm px-3 py-2 text-left !text-body-14 font-normal leading-relaxed text-foreground/70 hover:bg-foreground/[0.03] hover:text-foreground"
            onClick={() => {
              onCreate?.();
              openCreate();
            }}
            data-action-ui-id="team.account-create"
          >
            <Icon
              icon={Plus}
              size="md"
              className="shrink-0"
              aria-hidden={true}
            />
            <span className="min-w-0 break-words">{createLabel}</span>
          </Button>
        )}
      </div>
    </div>
  );
}
