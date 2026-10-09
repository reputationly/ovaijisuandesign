// account-switcher-view.jsx
import { jsxRuntimeExports, useTranslation, reactExports, dedupedToast, ChevronRight$1, Loader2, UserRound, TriangleAlert, ChevronLeft, Plus, deriveTeamCreditDisplay, ArrowLeftRight } from "../vendor.js";
import { useTeamAccount, useIsScrolling } from "../assets/apply-asset-change.jsx";
import { Tooltip, TooltipTrigger, Icon, TooltipProvider } from "../vendor-inline/vscode-base/graph.jsx";
import { Users, Clock3 } from "../media-editing/parse-item.jsx";
import {
  Button$1,
  TooltipContent,
  cn$2,
} from "../infra/use-browser-overlay-dialog-props.jsx";
import { RetryIcon, isRecoverableTeamAccountStatus } from "../workspace/browser-inspiration-urls.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  AccountSwitcherRowSurface,
  Spinner,
  useTeamContextsQuery,
  useTeamCreditSummaryQuery,
  useUserTeamCapabilitiesQuery,
} from "./use-team-transactions-feed-query.jsx";
function deriveAccountPresentation(account, personalAccountLabel) {
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
export function TeamPanelStale({ onRetry, isFetching = false, title, description }) {
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
          <Icon icon={Loader2} size="sm" aria-hidden={true} className="animate-spin" />
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
      <Button$1
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
      </Button$1>
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
const USER_STOPPABLE_REASONS = ["ACTIVE_RUN"];
export function hasUserStoppableReason(reasons) {
  return reasons.some((reason) => USER_STOPPABLE_REASONS.includes(reason));
}
export function TeamTransitionFeedback({ attempt }) {
  const { t: t2 } = useTranslation();
  if (!attempt) return null;
  const message2 =
    attempt.kind === "busy"
      ? t2("team.reason.switch_busy", {
          defaultValue: "The request and billing Group cannot be switched yet. Try again shortly.",
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
  const statusIcon2 = isRejected ? TriangleAlert : isRecovering ? RetryIcon : Clock3;
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
              <Button$1
                type="button"
                variant={variant}
                size={size2}
                className={cn$2(
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
    return compareTimestampDescending(left.lastActiveAtMs, right.lastActiveAtMs);
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
  const contextsStale = Boolean(query.data && (query.isRefetchError || query.isError));
  const openRecoveryAttemptedRef = reactExports.useRef(false);
  reactExports.useEffect(() => {
    if (openRecoveryAttemptedRef.current) return;
    if (!isRecoverableTeamAccountStatus(snapshot2?.status ?? "signed_out")) return;
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
      className={embedded ? "min-w-0" : "flex min-h-0 flex-1 flex-col overflow-hidden"}
      data-action-ui-id="team.account-switcher"
    >
      {!embedded ? (
        <div className="flex h-10 shrink-0 items-center gap-1 border-b border-border px-2">
          {onBack ? (
            <Button$1
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
            </Button$1>
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
          <div role="status" aria-busy="true" className="flex h-24 items-center justify-center">
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
            <Button$1
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
            </Button$1>
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
                    result.error instanceof Error ? result.error.message : "refresh_failed";
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
          const presentation = deriveAccountPresentation(item, personalAccountLabel);
          return (
            <div key={item.groupId}>
              {showSectionHeadings && showHeading ? (
                <p className="px-2 pt-2 pb-1 text-caption-11 font-normal text-foreground/30">
                  {t2(`team.switcher.section.${section}`, {
                    defaultValue:
                      section === "personal" ? "Personal" : section === "teams" ? "团队" : "已解散",
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
                dataTeamRole={item.role ? TEAM_ROLE_DATA_ATTRIBUTE[item.role] : void 0}
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
            icon={<Icon icon={Plus} size="md" className="shrink-0" aria-hidden={true} />}
          />
        ) : (
          <Button$1
            type="button"
            variant="ghost"
            className="h-auto min-h-9 w-full min-w-0 justify-start whitespace-normal rounded-sm px-3 py-2 text-left !text-body-14 font-normal leading-relaxed text-foreground/70 hover:bg-foreground/[0.03] hover:text-foreground"
            onClick={() => {
              onCreate?.();
              openCreate();
            }}
            data-action-ui-id="team.account-create"
          >
            <Icon icon={Plus} size="md" className="shrink-0" aria-hidden={true} />
            <span className="min-w-0 break-words">{createLabel}</span>
          </Button$1>
        )}
      </div>
    </div>
  );
}
export function deriveMemberCreditDisplay(display) {
  const { teamRemaining: _teamRemaining, ...memberDisplay } = display;
  return memberDisplay;
}
export function formatCreditAmount(value) {
  if (!/^-?(0|[1-9]\d*)$/.test(value)) return "—";
  return BigInt(value).toLocaleString();
}
const CONSUMER_LABEL_SEPARATOR = " · ";
export function formatConsumerLabel(userName, memberUid) {
  const name2 = (userName ?? "").trim();
  const uid2 = (memberUid ?? "").trim();
  if (name2 && uid2) return `${name2}${CONSUMER_LABEL_SEPARATOR}${uid2}`;
  return name2 || uid2 || null;
}
export function formatSignedCreditAmount(value) {
  const formatted = formatCreditAmount(value);
  if (formatted === "—") return formatted;
  return BigInt(value) > 0n ? `+${formatted}` : formatted;
}
export function TeamAccountSummary({
  compact = false,
  onOpenSwitcher,
  onOpenCredits,
  onOpenSubscription,
  switcherExpanded = false,
}) {
  const { t: t2 } = useTranslation();
  const {
    integrationEnabled,
    snapshot: snapshot2,
    activeScope,
    accountDataVisible,
    billingAvailable,
    openCredits,
  } = useTeamAccount();
  const identityKey = snapshot2?.identityKey ?? null;
  const accountSwitcherAvailable = identityKey !== null;
  const contexts = useTeamContextsQuery(identityKey, identityKey !== null);
  const isTeam = snapshot2?.status === "ready" && snapshot2.activeContext.accountType === "TEAM";
  const isPersonal =
    snapshot2?.status === "ready" && snapshot2.activeContext.accountType === "PERSONAL";
  const activeItem = contexts.data?.items.find((item) => item.groupId === activeScope?.groupId);
  const activeRoleTrusted = Boolean(
    activeItem &&
    activeItem.groupId === activeScope?.groupId &&
    !contexts.isPending &&
    !contexts.isFetching &&
    !contexts.isError &&
    !contexts.isRefetchError,
  );
  const activeDisplayRole =
    activeItem?.accountType === "TEAM" && activeItem.role ? activeItem.role : null;
  const teamBalanceVisible =
    activeRoleTrusted && (activeItem?.role === "OWNER" || activeItem?.role === "ADMIN");
  const memberSelfOnly = isTeam && !teamBalanceVisible;
  const summary = useTeamCreditSummaryQuery(
    isTeam ? activeScope : null,
    integrationEnabled && accountDataVisible && billingAvailable,
  );
  const creditDisplay =
    summary.data && summary.data.groupId === activeScope?.groupId
      ? deriveTeamCreditDisplay(summary.data)
      : null;
  const memberCreditDisplay = creditDisplay ? deriveMemberCreditDisplay(creditDisplay) : null;
  const accountIcon = isTeam ? Users : UserRound;
  const personalLabel = t2("team.account.personal", {
    defaultValue: "个人账号",
  });
  const switchTeamLabel = t2("team.switcher.tooltip", {
    defaultValue: "切换团队",
  });
  const selectedGroupPending =
    !snapshot2 || snapshot2.status === "syncing" || snapshot2.status === "ready";
  const accountPresentation = activeItem
    ? deriveAccountPresentation(activeItem, personalLabel)
    : null;
  const accountTitle =
    accountPresentation?.displayName ??
    (isPersonal
      ? personalLabel
      : accountDataVisible
        ? t2("team.account.unknown", {
            defaultValue: "账号",
          })
        : selectedGroupPending
          ? t2("team.account.syncing", {
              defaultValue: "正在同步 Group…",
            })
          : t2("team.account.unavailable", {
              defaultValue: "Group 暂不可用",
            }));
  const accountMeta =
    accountPresentation?.showsTeamMetadata && activeDisplayRole
      ? t2(`team.role.${activeDisplayRole.toLowerCase()}`, {
          defaultValue: activeDisplayRole,
        })
      : null;
  const showTeamMetadataSlot = accountPresentation?.showsTeamMetadata ?? isTeam;
  const roleDisplayState = isTeam
    ? activeDisplayRole
      ? activeRoleTrusted
        ? "trusted"
        : "cached"
      : "pending"
    : void 0;
  const creditPresentation = (() => {
    if (memberSelfOnly) {
      if (!memberCreditDisplay) return null;
      const value2 =
        memberCreditDisplay.availableAmount === null
          ? "—"
          : formatCreditAmount(memberCreditDisplay.availableAmount);
      return {
        mode:
          memberCreditDisplay.status === "READY"
            ? memberCreditDisplay.mode
            : memberCreditDisplay.status,
        status: memberCreditDisplay.status,
        label: t2("team.credit.available", {
          defaultValue: "可用额度",
        }),
        value: value2,
        ariaLabel:
          memberCreditDisplay.status !== "READY"
            ? t2("team.credit.sidebarAriaAvailableUnavailable", {
                defaultValue: "可用额度暂不可用",
              })
            : memberCreditDisplay.mode === "LIMITED"
              ? t2("team.credit.sidebarAriaMemberLimited", {
                  defaultValue: "可用额度 {{available}}，取我的剩余额度和团队剩余积分中较小的值",
                  available: value2,
                })
              : t2("team.credit.sidebarAriaMemberUnlimited", {
                  defaultValue: "可用额度 {{available}}，未设置个人限额，以团队剩余积分为准",
                  available: value2,
                }),
      };
    }
    if (!creditDisplay) return null;
    const value =
      creditDisplay.availableAmount === null
        ? "—"
        : formatCreditAmount(creditDisplay.availableAmount);
    return {
      mode: creditDisplay.status === "READY" ? creditDisplay.mode : creditDisplay.status,
      status: creditDisplay.status,
      label: t2("team.credit.available", {
        defaultValue: "可用额度",
      }),
      value,
      ariaLabel:
        creditDisplay.status !== "READY"
          ? t2("team.credit.sidebarAriaAvailableUnavailable", {
              defaultValue: "可用额度暂不可用",
            })
          : creditDisplay.mode === "UNLIMITED"
            ? t2("team.credit.sidebarAriaMemberUnlimited", {
                defaultValue: "可用额度 {{available}}，未设置个人限额，以团队剩余积分为准",
                available: value,
              })
            : t2("team.credit.sidebarAriaMemberLimited", {
                defaultValue: "可用额度 {{available}}，取我的剩余额度和团队剩余积分中较小的值",
                available: value,
              }),
    };
  })();
  if (!integrationEnabled) return null;
  if (compact) {
    return (
      <Button$1
        type="button"
        variant="ghost"
        size="icon"
        className="size-8 rounded-md text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground"
        onClick={onOpenSwitcher}
        disabled={!accountSwitcherAvailable}
        aria-label={t2("team.switcher.title", {
          defaultValue: "切换请求与计费 Group",
        })}
        data-action-ui-id="team.account-summary-compact"
      >
        <Icon
          icon={accountIcon}
          size="md"
          className="text-foreground opacity-50"
          aria-hidden={true}
        />
      </Button$1>
    );
  }
  return (
    <div className="flex flex-col gap-0.5" data-action-ui-id="team.account-summary-content">
      <Button$1
        type="button"
        variant="ghost"
        className="h-10 w-full items-center justify-start gap-2 rounded-sm px-2 text-left text-foreground/70 hover:bg-foreground/[0.04] hover:text-foreground"
        onClick={onOpenSwitcher}
        disabled={!accountSwitcherAvailable}
        aria-expanded={switcherExpanded}
        aria-label={t2("team.switcher.menuLabel", {
          defaultValue: "切换账号",
        })}
        data-action-ui-id="team.account-summary-current"
        data-account-type={isTeam ? "team" : isPersonal ? "personal" : "unknown"}
        data-group-id={isTeam ? activeScope?.groupId : void 0}
        data-team-role={
          activeRoleTrusted && activeItem?.role ? activeItem.role.toLowerCase() : void 0
        }
      >
        <Icon
          icon={accountIcon}
          size="md"
          className="shrink-0 text-foreground opacity-50"
          aria-hidden={true}
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium text-body-12 text-foreground">
            {accountTitle}
          </span>
          {showTeamMetadataSlot ? (
            <span
              className="block min-h-4 truncate text-caption-11 font-normal text-muted-foreground"
              data-action-ui-id="team.account-summary-role-slot"
              data-team-role-state={roleDisplayState}
              aria-hidden={accountMeta ? void 0 : true}
            >
              {accountMeta ?? " "}
            </span>
          ) : null}
        </span>
        <TooltipProvider delay={200}>
          <Tooltip>
            <TooltipTrigger render={<span className="inline-flex shrink-0" />}>
              <Icon
                icon={ArrowLeftRight}
                size="sm"
                className="text-muted-foreground"
                aria-hidden={true}
              />
            </TooltipTrigger>
            <TooltipContent side="right">{switchTeamLabel}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </Button$1>
      {isTeam && billingAvailable && creditPresentation ? (
        <Button$1
          type="button"
          variant="ghost"
          className="mt-0.5 h-9 w-full items-center justify-start gap-1 rounded-sm px-2 text-foreground/70 hover:bg-foreground/[0.03] hover:text-foreground"
          onClick={() => {
            onOpenCredits?.();
            openCredits();
          }}
          data-action-ui-id="team.account-summary-credits"
          data-team-credit-mode={creditPresentation.mode}
          data-team-credit-status={creditPresentation.status}
          data-credit-visibility={memberSelfOnly ? "member-self-only" : "manager-self"}
          aria-label={creditPresentation.ariaLabel}
        >
          <span
            className="min-w-0 flex-1 truncate text-left font-normal text-body-13 text-muted-foreground"
            data-action-ui-id="team.account-summary-available"
          >
            {creditPresentation.label}
          </span>
          <span className="max-w-28 shrink-0 truncate font-medium tabular-nums text-body-12 text-foreground">
            {creditPresentation.value}
          </span>
          <Icon
            icon={ChevronRight$1}
            size="sm"
            className="shrink-0 text-muted-foreground"
            aria-hidden={true}
          />
        </Button$1>
      ) : null}
      {isTeam &&
      accountDataVisible &&
      billingAvailable &&
      activeRoleTrusted &&
      activeItem?.accountType === "TEAM" &&
      activeItem.lifecycle === "ACTIVE" &&
      activeItem.role === "OWNER" &&
      onOpenSubscription ? (
        <Button$1
          type="button"
          variant="ghost"
          className="h-9 w-full items-center justify-start gap-1 rounded-sm px-2 text-foreground/70 hover:bg-foreground/[0.03] hover:text-foreground"
          onClick={onOpenSubscription}
          data-action-ui-id="team.account-summary-subscription"
        >
          <span className="min-w-0 flex-1 truncate text-left font-normal text-body-13 text-muted-foreground">
            {t2("team.account.purchase", {
              defaultValue: "购买",
            })}
          </span>
          <Icon
            icon={ChevronRight$1}
            size="sm"
            className="shrink-0 text-muted-foreground"
            aria-hidden={true}
          />
        </Button$1>
      ) : null}
    </div>
  );
}
