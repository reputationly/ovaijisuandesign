// team-account-summary.jsx
import { deriveTeamCreditDisplay } from "./credit-display.js";
import { useTranslation } from "react-i18next";
import { ArrowLeftRight, ChevronRight$1 as ChevronRight, UserRound } from "../media-editing/lucide-icon-wraps.js";
import {
  Icon,
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
} from "../vendor-inline/vscode-base/graph.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  deriveAccountPresentation,
  deriveMemberCreditDisplay,
  formatCreditAmount,
} from "./team-panel-stale.jsx";
import { useTeamAccount } from "../assets/credit-query-keys.jsx";
import { Users } from "../media-editing/package.jsx";
import { Button, TooltipContent } from "../infra/dialog-content.jsx";
import {
  useTeamContextsQuery,
  useTeamCreditSummaryQuery,
} from "./use-team-transactions-feed-query.jsx";
export function TeamAccountSummary({
  compact = false,
  onOpenSwitcher,
  onOpenCredits,
  onOpenSubscription,
  switcherExpanded = false,
}) {
  const { t } = useTranslation();
  const {
    integrationEnabled,
    snapshot,
    activeScope,
    accountDataVisible,
    billingAvailable,
    openCredits,
  } = useTeamAccount();
  const identityKey = snapshot?.identityKey ?? null;
  const accountSwitcherAvailable = identityKey !== null;
  const contexts = useTeamContextsQuery(identityKey, identityKey !== null);
  const isTeam =
    snapshot?.status === "ready" &&
    snapshot.activeContext.accountType === "TEAM";
  const isPersonal =
    snapshot?.status === "ready" &&
    snapshot.activeContext.accountType === "PERSONAL";
  const activeItem = contexts.data?.items.find(
    (item) => item.groupId === activeScope?.groupId,
  );
  const activeRoleTrusted = Boolean(
    activeItem &&
    activeItem.groupId === activeScope?.groupId &&
    !contexts.isPending &&
    !contexts.isFetching &&
    !contexts.isError &&
    !contexts.isRefetchError,
  );
  const activeDisplayRole =
    activeItem?.accountType === "TEAM" && activeItem.role
      ? activeItem.role
      : null;
  const teamBalanceVisible =
    activeRoleTrusted &&
    (activeItem?.role === "OWNER" || activeItem?.role === "ADMIN");
  const memberSelfOnly = isTeam && !teamBalanceVisible;
  const summary = useTeamCreditSummaryQuery(
    isTeam ? activeScope : null,
    integrationEnabled && accountDataVisible && billingAvailable,
  );
  const creditDisplay =
    summary.data && summary.data.groupId === activeScope?.groupId
      ? deriveTeamCreditDisplay(summary.data)
      : null;
  const memberCreditDisplay = creditDisplay
    ? deriveMemberCreditDisplay(creditDisplay)
    : null;
  const accountIcon = isTeam ? Users : UserRound;
  const personalLabel = t("team.account.personal", {
    defaultValue: "个人账号",
  });
  const switchTeamLabel = t("team.switcher.tooltip", {
    defaultValue: "切换团队",
  });
  const selectedGroupPending =
    !snapshot ||
    snapshot.status === "syncing" ||
    snapshot.status === "ready";
  const accountPresentation = activeItem
    ? deriveAccountPresentation(activeItem, personalLabel)
    : null;
  const accountTitle =
    accountPresentation?.displayName ??
    (isPersonal
      ? personalLabel
      : accountDataVisible
        ? t("team.account.unknown", {
            defaultValue: "账号",
          })
        : selectedGroupPending
          ? t("team.account.syncing", {
              defaultValue: "正在同步 Group…",
            })
          : t("team.account.unavailable", {
              defaultValue: "Group 暂不可用",
            }));
  const accountMeta =
    accountPresentation?.showsTeamMetadata && activeDisplayRole
      ? t(`team.role.${activeDisplayRole.toLowerCase()}`, {
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
      const value =
        memberCreditDisplay.availableAmount === null
          ? "—"
          : formatCreditAmount(memberCreditDisplay.availableAmount);
      return {
        mode:
          memberCreditDisplay.status === "READY"
            ? memberCreditDisplay.mode
            : memberCreditDisplay.status,
        status: memberCreditDisplay.status,
        label: t("team.credit.available", {
          defaultValue: "可用额度",
        }),
        value,
        ariaLabel:
          memberCreditDisplay.status !== "READY"
            ? t("team.credit.sidebarAriaAvailableUnavailable", {
                defaultValue: "可用额度暂不可用",
              })
            : memberCreditDisplay.mode === "LIMITED"
              ? t("team.credit.sidebarAriaMemberLimited", {
                  defaultValue:
                    "可用额度 {{available}}，取我的剩余额度和团队剩余积分中较小的值",
                  available: value,
                })
              : t("team.credit.sidebarAriaMemberUnlimited", {
                  defaultValue:
                    "可用额度 {{available}}，未设置个人限额，以团队剩余积分为准",
                  available: value,
                }),
      };
    }
    if (!creditDisplay) return null;
    const value =
      creditDisplay.availableAmount === null
        ? "—"
        : formatCreditAmount(creditDisplay.availableAmount);
    return {
      mode:
        creditDisplay.status === "READY"
          ? creditDisplay.mode
          : creditDisplay.status,
      status: creditDisplay.status,
      label: t("team.credit.available", {
        defaultValue: "可用额度",
      }),
      value,
      ariaLabel:
        creditDisplay.status !== "READY"
          ? t("team.credit.sidebarAriaAvailableUnavailable", {
              defaultValue: "可用额度暂不可用",
            })
          : creditDisplay.mode === "UNLIMITED"
            ? t("team.credit.sidebarAriaMemberUnlimited", {
                defaultValue:
                  "可用额度 {{available}}，未设置个人限额，以团队剩余积分为准",
                available: value,
              })
            : t("team.credit.sidebarAriaMemberLimited", {
                defaultValue:
                  "可用额度 {{available}}，取我的剩余额度和团队剩余积分中较小的值",
                available: value,
              }),
    };
  })();
  if (!integrationEnabled) return null;
  if (compact) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-8 rounded-md text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground"
        onClick={onOpenSwitcher}
        disabled={!accountSwitcherAvailable}
        aria-label={t("team.switcher.title", {
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
      </Button>
    );
  }
  return (
    <div
      className="flex flex-col gap-0.5"
      data-action-ui-id="team.account-summary-content"
    >
      <Button
        type="button"
        variant="ghost"
        className="h-10 w-full items-center justify-start gap-2 rounded-sm px-2 text-left text-foreground/70 hover:bg-foreground/[0.04] hover:text-foreground"
        onClick={onOpenSwitcher}
        disabled={!accountSwitcherAvailable}
        aria-expanded={switcherExpanded}
        aria-label={t("team.switcher.menuLabel", {
          defaultValue: "切换账号",
        })}
        data-action-ui-id="team.account-summary-current"
        data-account-type={
          isTeam ? "team" : isPersonal ? "personal" : "unknown"
        }
        data-group-id={isTeam ? activeScope?.groupId : void 0}
        data-team-role={
          activeRoleTrusted && activeItem?.role
            ? activeItem.role.toLowerCase()
            : void 0
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
      </Button>
      {isTeam && billingAvailable && creditPresentation ? (
        <Button
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
          data-credit-visibility={
            memberSelfOnly ? "member-self-only" : "manager-self"
          }
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
            icon={ChevronRight}
            size="sm"
            className="shrink-0 text-muted-foreground"
            aria-hidden={true}
          />
        </Button>
      ) : null}
      {isTeam &&
      accountDataVisible &&
      billingAvailable &&
      activeRoleTrusted &&
      activeItem?.accountType === "TEAM" &&
      activeItem.lifecycle === "ACTIVE" &&
      activeItem.role === "OWNER" &&
      onOpenSubscription ? (
        <Button
          type="button"
          variant="ghost"
          className="h-9 w-full items-center justify-start gap-1 rounded-sm px-2 text-foreground/70 hover:bg-foreground/[0.03] hover:text-foreground"
          onClick={onOpenSubscription}
          data-action-ui-id="team.account-summary-subscription"
        >
          <span className="min-w-0 flex-1 truncate text-left font-normal text-body-13 text-muted-foreground">
            {t("team.account.purchase", {
              defaultValue: "购买",
            })}
          </span>
          <Icon
            icon={ChevronRight}
            size="sm"
            className="shrink-0 text-muted-foreground"
            aria-hidden={true}
          />
        </Button>
      ) : null}
    </div>
  );
}
