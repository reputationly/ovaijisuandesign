// team-credit-summary-surface.jsx
import { useTranslation, reactExports, Check, Info$1, useStorage, UI, DayFlag, Animation, ChevronLeftIcon, ChevronRightIcon, ChevronDownIcon$1, ChevronDown, Search } from "../vendor.js";
import { useAuth, useOptionalTeamAccount, Popover, PopoverTrigger } from "../m15/apply-asset-change.jsx";
import { Tooltip, TooltipTrigger, Icon, TooltipProvider } from "../m15/graph.jsx";
import {
  DEFAULT_CREDIT_REMINDER_THRESHOLD,
  normalizeCreditReminderConfig,
} from "../m01/text-models.js";
import {
  Button$1,
  TooltipContent,
  cn$2,
  buttonVariants,
} from "../asset-center/shared/use-browser-overlay-dialog-props.jsx";
import { Input3 } from "../asset-center/shared/select-content.jsx";
import { DayPicker } from "react-day-picker";
import { __jsx } from "../shared/jsx-runtime.js";
import { formatCreditAmount } from "./account-switcher-view.jsx";
import { LEGACY_PERSONAL_GROUP_ID } from "./billing-model-display-labels.jsx";
import { Skeleton } from "./infinite-scroll-container.jsx";
import { PopoverContent } from "./use-credit-details.jsx";
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
    if (!activeScope || (viewKind !== "ready_personal" && viewKind !== "ready_team")) {
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
  if (normalized.enabled !== config2.enabled || normalized.threshold !== config2.threshold) {
    throw new Error("Invalid credit reminder configuration");
  }
  return normalized;
}
export function useCreditReminderConfig() {
  const { user } = useAuth();
  const teamAccount = useOptionalTeamAccount();
  const [configs, , setConfigsAsync, isHydrated] = useStorage("global.creditReminderConfigs");
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
      if (!persisted) throw new Error("Failed to persist credit reminder configuration");
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
  return wallet?.subscription_state_known === true && wallet.cycle_type === ANNUAL_CYCLE_TYPE;
}
export function TeamCreditBreakdownRow({ teamRemaining, summary }) {
  const { t: t2 } = useTranslation();
  const parts = [
    {
      key: "membership",
      label: t2("credits.membership", {
        defaultValue: "订阅",
      }),
      value: summary.membership,
    },
    {
      key: "topUp",
      label: t2("credits.topUp", {
        defaultValue: "充值",
      }),
      value: summary.topUp,
    },
    {
      key: "transfer",
      label: t2("credits.transfer", {
        defaultValue: "转移",
      }),
      value: summary.transfer,
    },
  ];
  return (
    <div
      className="grid grid-cols-2 items-end gap-3 overflow-hidden rounded-lg border border-border bg-muted/40 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)]"
      data-action-ui-id="team.credit-breakdown"
    >
      <div className="min-w-0" data-action-ui-id="team.credit-team-remaining">
        <div className="mb-1.5 truncate text-xs text-muted-foreground">
          {t2("credits.remaining", {
            defaultValue: "剩余",
          })}
        </div>
        <div className="truncate text-xl font-medium tabular-nums text-foreground">
          {teamRemaining === null ? "—" : formatCreditAmount(teamRemaining)}
        </div>
      </div>
      {parts.map((part, index2) => (
        <span key={part.key} className="contents">
          <BreakdownOperator symbol={index2 === 0 ? "=" : "+"} />
          <div className="min-w-0">
            <div className="mb-1.5 truncate text-xs text-muted-foreground">{part.label}</div>
            <div
              className="truncate text-xl font-medium tabular-nums text-foreground"
              data-action-ui-id={`team.credit-breakdown-${part.key}`}
            >
              {formatCreditAmount(String(part.value))}
            </div>
          </div>
        </span>
      ))}
    </div>
  );
}
function BreakdownOperator({ symbol }) {
  return (
    <span className="hidden pb-1 text-xl text-muted-foreground/60 select-none sm:block">
      {symbol}
    </span>
  );
}
export function TeamCreditHistorySection({ children: children2, showInfo = true, action }) {
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
                <TooltipContent side="top" className="!max-w-[26rem] leading-relaxed">
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
  const usageAvailable = status === "READY" && mode2 === "LIMITED" && showUsageDetails;
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
                defaultValue: "可用额度取我的剩余额度和团队剩余积分中较小的值。",
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
              team: props.teamRemaining === null ? "—" : formatCreditAmount(props.teamRemaining),
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
            team: props.teamRemaining === null ? "—" : formatCreditAmount(props.teamRemaining),
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
                <Icon icon={Info$1} size="sm" aria-hidden={true} />
              </TooltipTrigger>
              <TooltipContent side="top" className="!max-w-[26rem] leading-relaxed">
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
var SelectionState2;
(function (SelectionState3) {
  SelectionState3["range_end"] = "range_end";
  SelectionState3["range_middle"] = "range_middle";
  SelectionState3["range_start"] = "range_start";
  SelectionState3["selected"] = "selected";
})(SelectionState2 || (SelectionState2 = {}));
function getDefaultClassNames() {
  const classNames = {};
  for (const key2 in UI) {
    classNames[UI[key2]] = `rdp-${UI[key2]}`;
  }
  for (const key2 in DayFlag) {
    classNames[DayFlag[key2]] = `rdp-${DayFlag[key2]}`;
  }
  for (const key2 in SelectionState2) {
    classNames[SelectionState2[key2]] = `rdp-${SelectionState2[key2]}`;
  }
  for (const key2 in Animation) {
    classNames[Animation[key2]] = `rdp-${Animation[key2]}`;
  }
  return classNames;
}
export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  buttonVariant = "ghost",
  locale,
  formatters: formatters2,
  components: components2,
  ...props
}) {
  const defaultClassNames = getDefaultClassNames();
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn$2(
        "group/calendar bg-background p-2 [--cell-size:--spacing(7)] in-data-[slot=card-content]:bg-transparent in-data-[slot=popover-content]:bg-transparent",
        String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
        String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
        className,
      )}
      captionLayout={captionLayout}
      locale={locale}
      formatters={{
        formatMonthDropdown: (date2) =>
          date2.toLocaleString(locale?.code, {
            month: "short",
          }),
        ...formatters2,
      }}
      classNames={{
        root: cn$2("w-fit", defaultClassNames.root),
        months: cn$2("relative flex flex-col gap-4 md:flex-row", defaultClassNames.months),
        month: cn$2("flex w-full flex-col gap-4", defaultClassNames.month),
        nav: cn$2(
          "absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1",
          defaultClassNames.nav,
        ),
        button_previous: cn$2(
          buttonVariants({
            variant: buttonVariant,
          }),
          "size-(--cell-size) p-0 select-none aria-disabled:opacity-50",
          defaultClassNames.button_previous,
        ),
        button_next: cn$2(
          buttonVariants({
            variant: buttonVariant,
          }),
          "size-(--cell-size) p-0 select-none aria-disabled:opacity-50",
          defaultClassNames.button_next,
        ),
        month_caption: cn$2(
          "flex h-(--cell-size) w-full items-center justify-center px-(--cell-size)",
          defaultClassNames.month_caption,
        ),
        dropdowns: cn$2(
          "flex h-(--cell-size) w-full items-center justify-center gap-1.5 text-sm font-medium",
          defaultClassNames.dropdowns,
        ),
        dropdown_root: cn$2("relative rounded-lg", defaultClassNames.dropdown_root),
        dropdown: cn$2("absolute inset-0 bg-popover opacity-0", defaultClassNames.dropdown),
        caption_label: cn$2(
          "font-medium select-none",
          captionLayout === "label"
            ? "text-sm"
            : "flex items-center gap-1 rounded-lg text-sm [&>svg]:size-3.5 [&>svg]:text-muted-foreground",
          defaultClassNames.caption_label,
        ),
        table: "w-full border-collapse",
        weekdays: cn$2("flex", defaultClassNames.weekdays),
        weekday: cn$2(
          "flex-1 rounded-lg text-[0.8rem] font-normal text-muted-foreground select-none",
          defaultClassNames.weekday,
        ),
        week: cn$2("mt-2 flex w-full", defaultClassNames.week),
        week_number_header: cn$2(
          "w-(--cell-size) select-none",
          defaultClassNames.week_number_header,
        ),
        week_number: cn$2(
          "text-[0.8rem] text-muted-foreground select-none",
          defaultClassNames.week_number,
        ),
        day: cn$2(
          "group/day relative aspect-square h-full w-full rounded-lg p-0 text-center select-none",
          defaultClassNames.day,
        ),
        range_start: cn$2(
          "relative isolate z-0 rounded-lg bg-primary/10 after:absolute after:inset-y-0 after:right-0 after:w-4 after:bg-primary/10",
          defaultClassNames.range_start,
        ),
        range_middle: cn$2("rounded-lg", defaultClassNames.range_middle),
        range_end: cn$2(
          "relative isolate z-0 rounded-lg bg-primary/10 after:absolute after:inset-y-0 after:left-0 after:w-4 after:bg-primary/10",
          defaultClassNames.range_end,
        ),
        today: cn$2(
          "rounded-lg bg-muted text-foreground data-[selected=true]:rounded-lg",
          defaultClassNames.today,
        ),
        outside: cn$2(
          "text-muted-foreground aria-selected:text-muted-foreground",
          defaultClassNames.outside,
        ),
        disabled: cn$2("text-muted-foreground opacity-50", defaultClassNames.disabled),
        hidden: cn$2("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className: className2, rootRef, ...props2 }) => {
          return (
            <div data-slot="calendar" ref={rootRef} className={cn$2(className2)} {...props2} />
          );
        },
        Chevron: ({ className: className2, orientation, ...props2 }) => {
          if (orientation === "left") {
            return <ChevronLeftIcon className={cn$2("size-4", className2)} {...props2} />;
          }
          if (orientation === "right") {
            return <ChevronRightIcon className={cn$2("size-4", className2)} {...props2} />;
          }
          return <ChevronDownIcon$1 className={cn$2("size-4", className2)} {...props2} />;
        },
        DayButton: ({ ...props2 }) => <CalendarDayButton locale={locale} {...props2} />,
        WeekNumber: ({ children: children2, ...props2 }) => {
          return (
            <td {...props2}>
              <div className="flex size-(--cell-size) items-center justify-center text-center">
                {children2}
              </div>
            </td>
          );
        },
        ...components2,
      }}
      {...props}
    />
  );
}
function CalendarDayButton({ className, day, modifiers: modifiers2, locale, ...props }) {
  const defaultClassNames = getDefaultClassNames();
  const ref = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (modifiers2.focused) ref.current?.focus();
  }, [modifiers2.focused]);
  return (
    <Button$1
      ref={ref}
      variant="ghost"
      size="icon"
      data-day={day.date.toLocaleDateString(locale?.code)}
      data-selected-single={
        modifiers2.selected &&
        !modifiers2.range_start &&
        !modifiers2.range_end &&
        !modifiers2.range_middle
      }
      data-range-start={modifiers2.range_start}
      data-range-end={modifiers2.range_end}
      data-range-middle={modifiers2.range_middle}
      className={cn$2(
        "relative isolate z-10 flex aspect-square size-auto w-full min-w-(--cell-size) flex-col gap-1 rounded-lg border-0 leading-none font-normal group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:border-ring group-data-[focused=true]/day:ring-[3px] group-data-[focused=true]/day:ring-ring/50 data-[range-end=true]:bg-primary data-[range-end=true]:text-primary-foreground data-[range-middle=true]:bg-primary/10 data-[range-middle=true]:text-foreground data-[range-start=true]:bg-primary data-[range-start=true]:text-primary-foreground data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground [&>span]:text-xs [&>span]:opacity-70",
        defaultClassNames.day,
        className,
      )}
      {...props}
    />
  );
}
export function TeamMemberCombobox({
  id: id2,
  value,
  onValueChange,
  options,
  searchQuery,
  onSearchChange,
  disabled: disabled2 = false,
  loading = false,
  error = false,
  onRetry,
  hasMore = false,
  loadingMore = false,
  onLoadMore,
  placeholder,
  searchPlaceholder,
  emptyText,
  selectedLabelMode = "full",
  popupZClassName = "z-[70]",
  "data-action-ui-id": dataActionUiId = "team.member-combobox",
}) {
  const { t: t2 } = useTranslation();
  const [open, setOpen] = reactExports.useState(false);
  const listboxId = reactExports.useId();
  const selected2 = options.find((option2) => option2.userId === value) ?? null;
  const searchActionUiId =
    dataActionUiId === "team.management-leave-successor"
      ? "team.management-leave-successor-search"
      : `${dataActionUiId}-search`;
  const optionActionUiId =
    dataActionUiId === "team.management-leave-successor"
      ? "team.management-leave-successor-option"
      : `${dataActionUiId}-option`;
  const selectedDescription = selected2
    ? (selected2.description ??
      (selected2.role
        ? `UID ${selected2.userId} · ${t2(`team.role.${selected2.role.toLowerCase()}`, {
            defaultValue: selected2.role,
          })}`
        : null))
    : null;
  const triggerLabel = selected2
    ? selectedLabelMode === "name" || !selectedDescription
      ? selected2.displayName
      : `${selected2.displayName} · ${selectedDescription}`
    : (placeholder ??
      t2("team.management.successorPlaceholder", {
        defaultValue: "搜索并选择继任 Owner",
      }));
  return (
    <Popover
      open={open}
      onOpenChange={(next2) => {
        if (disabled2) return;
        setOpen(next2);
        if (!next2) onSearchChange("");
      }}
    >
      <PopoverTrigger
        id={id2}
        type="button"
        disabled={disabled2}
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        data-action-ui-id={dataActionUiId}
        data-successor-user-id={value ?? void 0}
        data-selected={value ? "true" : "false"}
        className={cn$2(
          "flex h-auto min-h-9 w-full items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-2.5 py-2 text-left text-xs outline-none transition-colors",
          "hover:bg-muted/60 focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50",
          "disabled:cursor-not-allowed disabled:opacity-50",
          !selected2 && "text-muted-foreground",
        )}
      >
        <span className="line-clamp-2 min-w-0 flex-1">{triggerLabel}</span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden={true} />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={4}
        positionerClassName={popupZClassName}
        className={cn$2("w-(--anchor-width) min-w-64 gap-0 p-0", popupZClassName)}
      >
        <div className="border-b border-border p-1.5">
          <Input3
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            startIcon={<Icon icon={Search} size="sm" aria-hidden={true} />}
            placeholder={
              searchPlaceholder ??
              t2("team.management.searchPlaceholder", {
                defaultValue: "搜索姓名或 UID",
              })
            }
            aria-label={
              searchPlaceholder ??
              t2("team.management.searchPlaceholder", {
                defaultValue: "搜索姓名或 UID",
              })
            }
            autoComplete="off"
            data-action-ui-id={searchActionUiId}
          />
        </div>
        <div
          id={listboxId}
          role="listbox"
          className="max-h-52 overflow-y-auto p-1"
          data-action-ui-id={`${dataActionUiId}-list`}
        >
          {loading ? (
            <div className="px-2 py-3 text-xs text-muted-foreground">
              {t2("common.loading", {
                defaultValue: "加载中…",
              })}
            </div>
          ) : null}
          {error ? (
            <div className="flex flex-col gap-2 px-2 py-3">
              <p className="text-xs text-muted-foreground">
                {t2("team.management.membersLoadFailed", {
                  defaultValue: "成员列表加载失败",
                })}
              </p>
              {onRetry ? (
                <Button$1 type="button" size="sm" variant="outline" onClick={() => onRetry()}>
                  {t2("common.retry", {
                    defaultValue: "重试",
                  })}
                </Button$1>
              ) : null}
            </div>
          ) : null}
          {!loading && !error && options.length === 0 ? (
            <div
              className="px-2 py-3 text-xs text-muted-foreground"
              data-action-ui-id={`${dataActionUiId}-empty`}
            >
              {emptyText ??
                t2("team.management.successorSearchEmpty", {
                  defaultValue: "没有匹配的成员，请调整筛选。",
                })}
            </div>
          ) : null}
          {options.map((option2) => {
            const isSelected = option2.userId === value;
            const description =
              option2.description ??
              (option2.role
                ? `UID ${option2.userId} · ${t2(`team.role.${option2.role.toLowerCase()}`, {
                    defaultValue: option2.role,
                  })}`
                : null);
            return (
              <button
                key={option2.userId}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={cn$2(
                  "flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left text-xs transition-colors",
                  "hover:bg-muted focus-visible:bg-muted focus-visible:outline-none",
                  isSelected && "bg-muted",
                )}
                onMouseDown={(event) => {
                  event.preventDefault();
                  onValueChange(option2.userId);
                  setOpen(false);
                  onSearchChange("");
                }}
                data-action-ui-id={optionActionUiId}
                data-successor-user-id={option2.userId}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-foreground">
                    {option2.displayName}
                  </span>
                  {description ? (
                    <span className="block truncate text-muted-foreground">{description}</span>
                  ) : null}
                </span>
                {isSelected ? (
                  <Check className="mt-0.5 size-4 shrink-0 text-foreground" aria-hidden={true} />
                ) : null}
              </button>
            );
          })}
          {hasMore ? (
            <div className="border-t border-border p-1">
              <Button$1
                type="button"
                size="sm"
                variant="ghost"
                className="w-full"
                disabled={loadingMore}
                onClick={() => onLoadMore?.()}
                data-action-ui-id={`${dataActionUiId}-more`}
              >
                {loadingMore
                  ? t2("common.loading", {
                      defaultValue: "加载中…",
                    })
                  : t2("team.management.loadMoreMembers", {
                      defaultValue: "加载更多成员",
                    })}
              </Button$1>
            </div>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}
