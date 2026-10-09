// team-credit-page.jsx
import { jsxRuntimeExports, useTranslation, reactExports, dedupedToast, usePlatform, deriveTeamCreditDisplay, useQueryClient, ChevronDown, formatDate, AlertCircle, LockKeyhole } from "../vendor.js";
import { teamQueryKeys, creditQueryKeys, useTeamAccount, useIsScrolling, Popover, PopoverTrigger } from "../m15/apply-asset-change.jsx";
import { Icon } from "../m15/graph.jsx";
import { CalendarDays, Download } from "../m15/parse-item.jsx";
import { useMediaModels } from "../m15/use-resizable-width.js";
import { Button$1, cn$2 } from "../asset-center/shared/use-browser-overlay-dialog-props.jsx";
import { Tabs, TabsList, TabsTrigger } from "../m08/shortcut-categories.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  TeamPanelStale,
  deriveMemberCreditDisplay,
  formatConsumerLabel,
  formatCreditAmount,
  formatSignedCreditAmount,
  getTeamReasonText,
} from "./account-switcher-view.jsx";
import {
  CreditLedgerTable,
  getBillingModelDisplayName,
  getPackageCreditCategoryLabel,
} from "./billing-model-display-labels.jsx";
import { InfiniteScrollContainer } from "./infinite-scroll-container.jsx";
import { TeamApiError } from "./map-hub-group-list-response.js";
import { teamApi } from "./team-api.js";
import {
  Calendar,
  TeamCreditBreakdownRow,
  TeamCreditHistorySection,
  TeamCreditSummaryLoading,
  TeamCreditSummarySurface,
  TeamMemberCombobox,
} from "./team-credit-summary-surface.jsx";
import { PopoverContent, useTeamWalletCreditSummary } from "./use-credit-details.jsx";
import {
  useInGroupMembersQuery,
  useTeamCreditSummaryQuery,
  useTeamDetailQuery,
  useTeamTransactionsFeedQuery,
  useTeamTransfersFeedQuery,
} from "./use-team-transactions-feed-query.jsx";
const DATE_PRESETS$1 = [
  {
    value: "today",
    days: 1,
  },
  {
    value: "last3Days",
    days: 3,
  },
  {
    value: "last7Days",
    days: 7,
  },
  {
    value: "last30Days",
    days: 30,
  },
];
function startOfLocalDay(value) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}
function presetRange(days) {
  const today = startOfLocalDay(new Date());
  const from2 = new Date(today);
  from2.setDate(today.getDate() - (days - 1));
  return {
    from: from2,
    to: today,
  };
}
function toStartOfDayMs(date2) {
  return new Date(date2.getFullYear(), date2.getMonth(), date2.getDate()).getTime();
}
function toEndOfDayMs(date2) {
  return new Date(
    date2.getFullYear(),
    date2.getMonth(),
    date2.getDate(),
    23,
    59,
    59,
    999,
  ).getTime();
}
function ledgerFilterRange(range2) {
  return {
    startTime: range2.from ? toStartOfDayMs(range2.from) : null,
    endTime: range2.to ? toEndOfDayMs(range2.to) : range2.from ? toEndOfDayMs(range2.from) : null,
  };
}
function TeamLedgerFilters({
  members,
  memberSearchQuery,
  onMemberSearchChange,
  membersLoading = false,
  membersError = false,
  onRetryMembers,
  hasMoreMembers = false,
  loadingMoreMembers = false,
  onLoadMoreMembers,
  onFilterChange,
  trailing,
}) {
  const { t: t2 } = useTranslation();
  const [memberId, setMemberId] = reactExports.useState(null);
  const [datePreset, setDatePreset] = reactExports.useState("last7Days");
  const [dateRange, setDateRange] = reactExports.useState(() => presetRange(7));
  const [dateOpen, setDateOpen] = reactExports.useState(false);
  function emitFilter(mid, range2) {
    if (!onFilterChange) return;
    onFilterChange({
      memberId: mid,
      ...ledgerFilterRange(range2),
    });
  }
  const emittedInitialFilter = reactExports.useRef(false);
  reactExports.useEffect(() => {
    if (emittedInitialFilter.current) return;
    emittedInitialFilter.current = true;
    emitFilter(memberId, dateRange);
  });
  const selectedMember = members.find((member) => member.userId === memberId) ?? null;
  const memberOptions = reactExports.useMemo(
    () =>
      members.map((member) => ({
        userId: member.userId,
        displayName: member.userName,
        description: `UID ${member.userId}`,
      })),
    [members],
  );
  const presetLabel = t2(`team.credit.ledgerFilter.${datePreset}`, {
    defaultValue:
      datePreset === "today"
        ? "今天"
        : datePreset === "last3Days"
          ? "近3天"
          : datePreset === "last7Days"
            ? "近7天"
            : datePreset === "last30Days"
              ? "近30天"
              : "自定义日期",
  });
  const dateLabel =
    datePreset === "custom" && dateRange.from
      ? dateRange.to
        ? `${formatDate(dateRange.from)} - ${formatDate(dateRange.to)}`
        : formatDate(dateRange.from)
      : presetLabel;
  const handlePresetSelect = (preset2, days) => {
    const newRange = presetRange(days);
    setDatePreset(preset2);
    setDateRange(newRange);
    setDateOpen(false);
    emitFilter(memberId, newRange);
  };
  const handleCustomRangeSelect = (range2) => {
    const newRange = range2 ?? {
      from: void 0,
    };
    setDatePreset("custom");
    setDateRange(newRange);
  };
  const handleDateOpenChange = (nextOpen) => {
    setDateOpen(nextOpen);
    if (!nextOpen && datePreset === "custom") {
      emitFilter(memberId, dateRange);
    }
  };
  const handleMemberChange = (id2) => {
    setMemberId(id2);
    emitFilter(id2, dateRange);
  };
  return (
    <div
      className="flex flex-wrap gap-2"
      data-action-ui-id="team.credit-ledger-filters"
      data-selected-member-id={memberId ?? void 0}
      data-date-start={dateRange.from?.toISOString()}
      data-date-end={dateRange.to?.toISOString()}
    >
      <div className="min-w-56 flex-1">
        <TeamMemberCombobox
          value={memberId}
          onValueChange={handleMemberChange}
          options={memberOptions}
          searchQuery={memberSearchQuery}
          onSearchChange={onMemberSearchChange}
          loading={membersLoading}
          error={membersError}
          onRetry={onRetryMembers}
          hasMore={hasMoreMembers}
          loadingMore={loadingMoreMembers}
          onLoadMore={onLoadMoreMembers}
          placeholder={t2("team.credit.ledgerFilter.allMembers", {
            defaultValue: "全部成员",
          })}
          searchPlaceholder={t2("team.credit.ledgerFilter.searchMember", {
            defaultValue: "搜索名称或 UID",
          })}
          emptyText={t2("team.credit.ledgerFilter.memberEmpty", {
            defaultValue: "没有匹配的成员",
          })}
          data-action-ui-id="team.credit-ledger-member-filter"
        />
      </div>
      {selectedMember ? (
        <button
          type="button"
          className="rounded-lg border border-input px-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          onClick={() => handleMemberChange(null)}
          aria-label={t2("team.credit.ledgerFilter.clearMember", {
            defaultValue: "清除成员筛选",
          })}
          data-action-ui-id="team.credit-ledger-member-clear"
        >
          {t2("common.clear", {
            defaultValue: "清除",
          })}
        </button>
      ) : null}
      <Popover open={dateOpen} onOpenChange={handleDateOpenChange}>
        <PopoverTrigger
          type="button"
          className="flex h-9 min-w-44 items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-2.5 text-left text-xs transition-colors hover:bg-muted/60 focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
          data-action-ui-id="team.credit-ledger-date-filter"
        >
          <span className="flex min-w-0 items-center gap-2 truncate">
            <CalendarDays className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
            <span className="truncate">{dateLabel}</span>
          </span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="flex w-auto flex-row gap-0 p-0"
          sideOffset={4}
          positionerClassName="z-[70]"
        >
          <div className="flex w-28 shrink-0 flex-col gap-1 border-r border-border p-1.5">
            {DATE_PRESETS$1.map(({ value, days }) => (
              <button
                key={value}
                type="button"
                className={cn$2(
                  "list-row-hit-area [--list-row-gap:4px] first:before:top-0 last:before:bottom-0 rounded-md px-2.5 py-2 text-left text-xs text-foreground/70 transition-colors hover:bg-popup-item-hover hover:text-foreground",
                  datePreset === value && "bg-muted text-foreground",
                )}
                onClick={() => handlePresetSelect(value, days)}
                data-action-ui-id={`team.credit-ledger-date-${value}`}
              >
                {t2(`team.credit.ledgerFilter.${value}`, {
                  defaultValue:
                    value === "today"
                      ? "今天"
                      : value === "last3Days"
                        ? "近3天"
                        : value === "last7Days"
                          ? "近7天"
                          : "近30天",
                })}
              </button>
            ))}
            <button
              type="button"
              className={cn$2(
                "list-row-hit-area [--list-row-gap:4px] first:before:top-0 last:before:bottom-0 rounded-md px-2.5 py-2 text-left text-xs text-foreground/70 transition-colors hover:bg-popup-item-hover hover:text-foreground",
                datePreset === "custom" && "bg-muted text-foreground",
              )}
              onClick={() => setDatePreset("custom")}
              data-action-ui-id="team.credit-ledger-date-custom"
            >
              {t2("team.credit.ledgerFilter.custom", {
                defaultValue: "自定义日期",
              })}
            </button>
          </div>
          <div className="p-2">
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={handleCustomRangeSelect}
              numberOfMonths={2}
              max={365}
              showOutsideDays={false}
              defaultMonth={dateRange.from}
            />
          </div>
        </PopoverContent>
      </Popover>
      {trailing ? <div className="flex shrink-0 items-center">{trailing}</div> : null}
    </div>
  );
}
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
  const titleKey = TITLE_KEY_BY_REASON[reasonCode] ?? "team.common.temporarilyUnavailable";
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
        <Icon icon={LockKeyhole} size="lg" className="opacity-60" aria-hidden={true} />
      </span>
      <p className="break-words font-heading text-sm font-medium text-foreground">{title}</p>
      {reason !== title ? (
        <p className="mt-1 max-w-sm break-words text-xs/relaxed text-muted-foreground">{reason}</p>
      ) : null}
    </div>
  );
}
const UTF8_BOM = "\uFEFF";
const FORMULA_TRIGGERS = ["=", "+", "-", "@", "	", "\r"];
const PLAIN_NUMBER_RE = /^-?\d+(?:\.\d+)?$/;
function isPlainNumber(value) {
  return PLAIN_NUMBER_RE.test(value);
}
const LEDGER_DIRECTIONS = new Set(["consume", "refund", "grant", "expired"]);
function parseTransactionId(transactionId) {
  const separator = transactionId.lastIndexOf(":");
  if (separator < 0)
    return {
      recordId: transactionId,
      direction: "unknown",
    };
  const recordId = transactionId.slice(0, separator);
  const suffix = transactionId.slice(separator + 1);
  const direction = LEDGER_DIRECTIONS.has(suffix) ? suffix : "unknown";
  return {
    recordId,
    direction,
  };
}
function formatCsvTime(ms) {
  const date2 = new Date(ms);
  const pad = (value) => String(value).padStart(2, "0");
  return `${date2.getFullYear()}-${pad(date2.getMonth() + 1)}-${pad(date2.getDate())} ${pad(date2.getHours())}:${pad(date2.getMinutes())}:${pad(date2.getSeconds())}`;
}
function escapeCsvCell(value) {
  const neutralized =
    !isPlainNumber(value) && FORMULA_TRIGGERS.some((trigger) => value.startsWith(trigger))
      ? `'${value}`
      : value;
  return quoteCsvCell(neutralized);
}
function quoteCsvCell(value) {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}
function escapeCsvIdentifier(value) {
  return /^\d+$/.test(value) ? quoteCsvCell(`="${value}"`) : escapeCsvCell(value);
}
function toRow(cells2) {
  return cells2
    .map((cell) =>
      typeof cell === "string" ? escapeCsvCell(cell) : escapeCsvIdentifier(cell.identifier),
    )
    .join(",");
}
function buildCreditLedgerCsv(transactions, options) {
  const { labels, formatDescription, formatModel, formatDirection } = options;
  const lines = [
    toRow([
      labels.time,
      labels.operator,
      labels.memberUid,
      labels.description,
      labels.model,
      labels.amount,
      labels.direction,
      labels.transactionId,
    ]),
    ...transactions.map((transaction) => {
      const { recordId, direction } = parseTransactionId(transaction.transactionId);
      return toRow([
        formatCsvTime(transaction.createdAtMs),
        transaction.userName.trim(),
        {
          identifier: transaction.memberUid.trim(),
        },
        formatDescription(transaction),
        formatModel(transaction),
        // mapper 已校验为带符号的十进制积分；显示用的千分位会让负数被当成公式钝化。
        transaction.amount,
        formatDirection(direction),
        {
          identifier: recordId,
        },
      ]);
    }),
  ];
  return `${UTF8_BOM}${lines.join("\r\n")}\r
`;
}
function formatFileDate(ms) {
  const date2 = new Date(ms);
  const pad = (value) => String(value).padStart(2, "0");
  return `${date2.getFullYear()}${pad(date2.getMonth() + 1)}${pad(date2.getDate())}`;
}
function buildTeamUsageFileName(options) {
  const now2 = options.now ?? new Date();
  const teamName = options.teamName.replace(/[\\/:*?"<>|]/g, "").trim() || "team";
  const start2 = formatFileDate(options.startTimeMs ?? now2.getTime());
  const end2 = formatFileDate(options.endTimeMs ?? now2.getTime());
  const memberPart = options.memberId ? `-${options.memberId}` : "";
  return `${teamName}${memberPart}-usage-${start2}-${end2}.csv`;
}
const EXPORT_PAGE_SIZE = 100;
const MAX_PAGES = 200;
async function fetchAllTransactions(request, signal, onProgress) {
  const all2 = [];
  let cursor = null;
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const result = await teamApi.listTransactions(
      {
        ...request,
        cursor,
        pageSize: EXPORT_PAGE_SIZE,
      },
      {
        signal,
      },
    );
    all2.push(...result.items);
    onProgress(all2.length);
    if (!result.hasMore || !result.nextCursor) return all2;
    if (result.nextCursor === cursor) {
      throw new Error("ledger cursor did not advance");
    }
    cursor = result.nextCursor;
  }
  throw new Error(`ledger export exceeded ${MAX_PAGES} pages`);
}
function useTeamLedgerExport() {
  const platform2 = usePlatform();
  const [state2, setState] = reactExports.useState({
    exporting: false,
    loadedCount: 0,
  });
  const abortRef = reactExports.useRef(null);
  const exportCsv = reactExports.useCallback(
    async (request, toCsv, fileName) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setState({
        exporting: true,
        loadedCount: 0,
      });
      try {
        const transactions = await fetchAllTransactions(request, controller.signal, (count2) => {
          setState({
            exporting: true,
            loadedCount: count2,
          });
        });
        if (transactions.length === 0) return "empty";
        const targetPath = await platform2.fs.showSaveDialog?.({
          defaultPath: fileName,
          filters: [
            {
              name: "CSV",
              extensions: ["csv"],
            },
          ],
        });
        if (!targetPath) return "canceled";
        await platform2.fs.writeTextFile(targetPath, toCsv(transactions));
        return "ok";
      } catch (error) {
        if (controller.signal.aborted) return "canceled";
        throw error;
      } finally {
        setState({
          exporting: false,
          loadedCount: 0,
        });
        if (abortRef.current === controller) abortRef.current = null;
      }
    },
    [platform2],
  );
  const cancel = reactExports.useCallback(() => {
    abortRef.current?.abort();
  }, []);
  reactExports.useEffect(() => cancel, [cancel]);
  return {
    ...state2,
    exportCsv,
    cancel,
  };
}
const LEDGER_TAB = {
  INTERNAL: "INTERNAL",
  TRANSFER: "TRANSFER",
};
function formatTransferCounterparty(transfer) {
  const name2 = transfer.counterpartyGroupName;
  const id2 = transfer.counterpartyGroupId;
  if (!name2 && !id2) return "—";
  return (
    <span className="flex min-w-0 flex-wrap items-baseline gap-x-1">
      {name2 ? <span className="min-w-0 break-words">{name2}</span> : null}
      {name2 && id2 ? <span className="shrink-0 text-muted-foreground">/</span> : null}
      {id2 ? (
        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{id2}</span>
      ) : null}
    </span>
  );
}
function amountTone$1(amount) {
  const value = BigInt(amount);
  if (value > 0n) return "credit";
  if (value < 0n) return "debit";
  return "neutral";
}
export function TeamCreditPage({ open, scope, ledgerScope = "SELF" }) {
  const { t: t2 } = useTranslation();
  const { data: mediaModels } = useMediaModels();
  const queryClient2 = useQueryClient();
  const { accountDataVisible, contract } = useTeamAccount();
  const [ledgerFilter, setLedgerFilter] = reactExports.useState({
    memberId: null,
    startTime: null,
    endTime: null,
  });
  const [memberSearchQuery, setMemberSearchQuery] = reactExports.useState("");
  const [ledgerTab, setLedgerTab] = reactExports.useState(LEDGER_TAB.INTERNAL);
  const transferTabVisible = ledgerScope === "GROUP";
  const transferTabActive = transferTabVisible && ledgerTab === LEDGER_TAB.TRANSFER;
  const gateOpen = Boolean(
    accountDataVisible &&
    contract?.compatibility === "SUPPORTED" &&
    contract.gates.teamRead &&
    contract.gates.teamBilling &&
    scope.membershipRevision,
  );
  const detailQuery = useTeamDetailQuery(scope, open && gateOpen);
  const summaryQuery = useTeamCreditSummaryQuery(scope, open && gateOpen);
  const walletBreakdown = useTeamWalletCreditSummary(
    scope,
    open && gateOpen && ledgerScope === "GROUP",
  );
  const detailDataMatchesScope = Boolean(
    detailQuery.isSuccess &&
    !detailQuery.isError &&
    !detailQuery.isRefetchError &&
    detailQuery.data?.groupId === scope.groupId &&
    detailQuery.data.permissions.groupId === scope.groupId &&
    detailQuery.data.permissions.membershipRevision === detailQuery.data.membershipRevision,
  );
  const detailRoleTrusted = detailDataMatchesScope && !detailQuery.isFetching;
  const cachedTransactionsPermission = detailDataMatchesScope
    ? detailQuery.data?.permissions.viewTransactions
    : void 0;
  const transactionsPermission = detailRoleTrusted
    ? detailQuery.data?.permissions.viewTransactions
    : void 0;
  const transactionsAllowed = Boolean(transactionsPermission?.allowed);
  const transactionsPermissionPending = Boolean(
    gateOpen && !detailDataMatchesScope && (detailQuery.isPending || detailQuery.isFetching),
  );
  const transactionsDisplayAllowed = Boolean(
    transactionsAllowed ||
    (detailQuery.isFetching && detailDataMatchesScope && cachedTransactionsPermission?.allowed),
  );
  const transactionsUpstreamUnavailable =
    !transactionsAllowed &&
    (transactionsPermission?.reasonCode === "upstream_transactions_unavailable" ||
      transactionsPermission?.reasonCode === "feature_disabled" ||
      transactionsPermission?.reasonCode === "upstream_contract_not_ready");
  const transactionsQuery = useTeamTransactionsFeedQuery({
    scope,
    selfOnly: ledgerScope === "SELF",
    memberId: ledgerFilter.memberId ?? void 0,
    startTime: ledgerFilter.startTime,
    endTime: ledgerFilter.endTime,
    enabled: open && gateOpen && transactionsDisplayAllowed,
  });
  const transfersQuery = useTeamTransfersFeedQuery({
    scope,
    enabled: open && gateOpen && transactionsAllowed && transferTabActive,
  });
  const transfers = transfersQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const membersQuery = useInGroupMembersQuery({
    scope,
    enabled: open && gateOpen && transactionsAllowed && ledgerScope === "GROUP",
  });
  const memberDetails = membersQuery.data ?? [];
  const normalizedMemberSearch = memberSearchQuery.trim().toLocaleLowerCase();
  const memberRows = normalizedMemberSearch
    ? memberDetails.filter(
        (member) =>
          member.userName.toLocaleLowerCase().includes(normalizedMemberSearch) ||
          member.userId.includes(normalizedMemberSearch),
      )
    : memberDetails;
  const scrollRef = reactExports.useRef(null);
  const isScrolling = useIsScrolling({
    scrollRef,
  });
  const teamDisplay =
    summaryQuery.data?.groupId === scope.groupId
      ? deriveTeamCreditDisplay(summaryQuery.data)
      : null;
  const memberDisplay = teamDisplay ? deriveMemberCreditDisplay(teamDisplay) : null;
  const isManager =
    detailRoleTrusted &&
    (detailQuery.data?.currentRole === "OWNER" || detailQuery.data?.currentRole === "ADMIN");
  const cachedIsManager =
    detailDataMatchesScope &&
    (detailQuery.data?.currentRole === "OWNER" || detailQuery.data?.currentRole === "ADMIN");
  const exportPermissionRefreshing = detailQuery.isFetching && detailDataMatchesScope;
  const cachedCreditVisibility =
    ledgerScope === "GROUP"
      ? cachedIsManager
        ? "team"
        : null
      : cachedIsManager
        ? "manager-self"
        : "member-self-only";
  const creditVisibility =
    ledgerScope === "GROUP" && detailQuery.isFetching && detailDataMatchesScope
      ? cachedCreditVisibility
      : detailRoleTrusted
        ? cachedCreditVisibility
        : ledgerScope === "SELF" && !isManager
          ? "member-self-only"
          : null;
  const detailStale = Boolean(
    detailQuery.data && (detailQuery.isRefetchError || detailQuery.isError),
  );
  const summaryStale = Boolean(
    summaryQuery.data && (summaryQuery.isRefetchError || summaryQuery.isError),
  );
  const transactionsStale = Boolean(
    transactionsQuery.data && (transactionsQuery.isRefetchError || transactionsQuery.isError),
  );
  const creditDataStale = detailStale || summaryStale;
  const transactions = transactionsQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const ledgerTotalUsed =
    transactionsQuery.data?.pages.reduce(
      (latest2, page) => page.groupUsed ?? page.totalAmount ?? latest2,
      null,
    ) ?? null;
  const refreshOnOpenRef = reactExports.useRef(false);
  const formatDescription = (transaction) =>
    t2(`team.transaction.${transaction.category}`, {
      defaultValue: transaction.category,
      ...transaction.localizationParams,
    });
  const formatModel = (transaction) =>
    transaction.category === "GRANT" || transaction.category === "EXPIRED"
      ? (getPackageCreditCategoryLabel(transaction.creditCategory, t2) ?? "")
      : getBillingModelDisplayName(
          {
            billingType: transaction.billingType,
            modelKey: transaction.modelKey,
            modelDisplayName: transaction.modelDisplayName,
            mediaType: transaction.mediaType,
          },
          t2,
          mediaModels,
        );
  const formatAmount = (transaction) => formatCreditAmount(transaction.amount);
  const formatOperator = (transaction) =>
    formatConsumerLabel(transaction.userName, transaction.memberUid) ?? void 0;
  const formatTransferDirection = (direction) =>
    direction === "IN"
      ? t2("team.credit.transferIn", {
          defaultValue: "转入",
        })
      : direction === "OUT"
        ? t2("team.credit.transferOut", {
            defaultValue: "转出",
          })
        : "—";
  const formatDirection = (direction) => {
    switch (direction) {
      case "consume":
        return t2("team.credit.directionConsume", {
          defaultValue: "扣费",
        });
      case "refund":
        return t2("team.credit.directionRefund", {
          defaultValue: "退费",
        });
      case "grant":
        return t2("team.credit.directionGrant", {
          defaultValue: "发放",
        });
      case "expired":
        return t2("team.credit.directionExpired", {
          defaultValue: "过期",
        });
      default:
        return "";
    }
  };
  const ledgerExport = useTeamLedgerExport();
  const exportAllowed =
    ledgerScope === "GROUP" && (isManager || (exportPermissionRefreshing && cachedIsManager));
  const handleExportCsv = async () => {
    if (!exportAllowed) return;
    const request = {
      scope,
      ...(ledgerFilter.memberId
        ? {
            memberId: ledgerFilter.memberId,
          }
        : {}),
      startTime: ledgerFilter.startTime,
      endTime: ledgerFilter.endTime,
    };
    const fileName = buildTeamUsageFileName({
      teamName: detailQuery.data?.teamName ?? "team",
      memberId: ledgerFilter.memberId,
      startTimeMs: ledgerFilter.startTime,
      endTimeMs: ledgerFilter.endTime,
    });
    const result = await ledgerExport
      .exportCsv(
        request,
        (rows) =>
          buildCreditLedgerCsv(rows, {
            labels: {
              time: t2("team.credit.time", {
                defaultValue: "时间",
              }),
              operator: t2("team.credit.operator", {
                defaultValue: "消耗人",
              }),
              memberUid: t2("team.credit.memberUid", {
                defaultValue: "UID",
              }),
              description: t2("team.credit.transaction", {
                defaultValue: "类型",
              }),
              model: t2("team.credit.model", {
                defaultValue: "模型",
              }),
              amount: t2("team.credit.amount", {
                defaultValue: "积分",
              }),
              direction: t2("team.credit.direction", {
                defaultValue: "方向",
              }),
              transactionId: t2("team.credit.transactionId", {
                defaultValue: "交易 ID",
              }),
            },
            formatDescription,
            formatModel,
            formatDirection,
          }),
        fileName,
      )
      .catch((error) => {
        const code2 =
          error instanceof TeamApiError
            ? error.payload.code
            : error instanceof Error
              ? error.message
              : "export_failed";
        dedupedToast.error(
          t2("team.credit.exportFailed", {
            defaultValue: "导出失败：{{code}}",
            code: code2,
          }),
        );
        return "failed";
      });
    if (result === "ok") {
      dedupedToast.success(
        t2("team.credit.exportOk", {
          defaultValue: "已导出 CSV",
        }),
      );
    } else if (result === "empty") {
      dedupedToast.info(
        t2("team.credit.empty", {
          defaultValue: "暂无积分流水",
        }),
      );
    }
  };
  reactExports.useEffect(() => {
    if (!open) {
      refreshOnOpenRef.current = false;
      return;
    }
    if (refreshOnOpenRef.current) return;
    refreshOnOpenRef.current = true;
    const transactionFeedKey =
      ledgerScope === "SELF"
        ? creditQueryKeys.selfTransactionFeed(scope, "ALL")
        : creditQueryKeys.transactionFeed(scope, "ALL");
    void Promise.all([
      queryClient2.invalidateQueries({
        queryKey: teamQueryKeys.detail(scope),
        exact: true,
      }),
      queryClient2.invalidateQueries({
        queryKey: creditQueryKeys.summary(scope),
        exact: true,
      }),
      queryClient2.invalidateQueries({
        queryKey: transactionFeedKey,
        exact: true,
      }),
    ]);
  }, [ledgerScope, open, queryClient2, scope]);
  const exportButton = exportAllowed ? (
    <Button$1
      variant="outline"
      size="sm"
      disabled={ledgerExport.exporting || exportPermissionRefreshing}
      onClick={() => void handleExportCsv()}
      data-action-ui-id="team.credit-export-csv"
    >
      <Download className="size-4" />
      {ledgerExport.exporting
        ? t2("team.credit.exporting", {
            defaultValue: "导出中…{{loaded}}",
            loaded: ledgerExport.loadedCount,
          })
        : t2("team.credit.exportCsv", {
            defaultValue: "导出 CSV",
          })}
    </Button$1>
  ) : (
    void 0
  );
  if (!open) return null;
  return (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
      data-action-ui-id="team.credit-dialog"
    >
      <div
        ref={scrollRef}
        data-scrolling={isScrolling || void 0}
        className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden px-4 py-4 sm:px-6 sm:py-5"
      >
        {!gateOpen ? <TeamPanelGated reasonCode="team_billing_disabled" /> : null}
        {gateOpen && detailQuery.isPending && !summaryQuery.isPending && !summaryQuery.data ? (
          <div data-action-ui-id="team.credit-detail-loading">
            <TeamCreditSummaryLoading />
          </div>
        ) : null}
        {gateOpen && detailQuery.isError && !detailQuery.data ? (
          <div data-action-ui-id="team.credit-detail-error">
            <TeamPanelError onRetry={() => void detailQuery.refetch()} />
          </div>
        ) : null}
        {gateOpen && summaryQuery.isPending ? <TeamCreditSummaryLoading /> : null}
        {gateOpen && summaryQuery.isError && !summaryQuery.data ? (
          <TeamPanelError onRetry={() => void summaryQuery.refetch()} />
        ) : null}
        {gateOpen && creditDataStale ? (
          <TeamPanelStale
            isFetching={detailQuery.isFetching || summaryQuery.isFetching}
            onRetry={async () => {
              const results = await Promise.all([detailQuery.refetch(), summaryQuery.refetch()]);
              const failed = results.filter((result) => result.isError);
              if (failed.length === 0) {
                dedupedToast.success(
                  t2("team.common.refreshOk", {
                    defaultValue: "数据已刷新",
                  }),
                );
                return;
              }
              const firstError = failed[0]?.error;
              const code2 =
                firstError instanceof TeamApiError
                  ? firstError.payload.code
                  : firstError instanceof Error
                    ? firstError.message
                    : "refresh_failed";
              dedupedToast.error(
                t2("team.common.refreshFailedToast", {
                  defaultValue: "刷新失败：{{code}}",
                  code: code2,
                }),
              );
            }}
          />
        ) : null}
        {creditVisibility === "member-self-only" && memberDisplay ? (
          <TeamCreditSummarySurface
            visibility="member-self-only"
            status={memberDisplay.status}
            mode={memberDisplay.mode}
            availableAmount={memberDisplay.availableAmount}
            memberRemaining={memberDisplay.memberRemaining}
            memberUsed={memberDisplay.memberUsed}
            memberLimit={memberDisplay.memberLimit}
            showUsageDetails={false}
            actionUiId="team.credit-summary"
          />
        ) : null}
        {creditVisibility === "manager-self" && teamDisplay ? (
          <TeamCreditSummarySurface
            visibility="manager-self"
            status={teamDisplay.status}
            mode={teamDisplay.mode}
            availableAmount={teamDisplay.availableAmount}
            memberRemaining={teamDisplay.memberRemaining}
            memberUsed={teamDisplay.memberUsed}
            memberLimit={teamDisplay.memberLimit}
            teamRemaining={teamDisplay.teamRemaining}
            showUsageDetails={false}
            actionUiId="team.credit-summary"
          />
        ) : null}
        {creditVisibility === "team" && teamDisplay ? (
          <section
            data-action-ui-id="team.credit-summary"
            data-credit-visibility="team"
            data-credit-mode={
              teamDisplay.status === "READY" ? teamDisplay.mode : teamDisplay.status
            }
            data-credit-status={teamDisplay.status}
          >
            <div className="min-w-0">
              {walletBreakdown.trusted ? (
                <TeamCreditBreakdownRow
                  teamRemaining={teamDisplay.teamRemaining}
                  summary={walletBreakdown.summary}
                />
              ) : (
                <div>
                  <div
                    className="flex items-center gap-1 text-xs text-muted-foreground"
                    data-action-ui-id="team.credit-team-remaining"
                  >
                    <span>
                      {t2("team.credit.teamRemaining", {
                        defaultValue: "团队剩余积分",
                      })}
                    </span>
                  </div>
                  <p className="mt-1 max-w-full break-all font-heading text-2xl font-medium text-foreground tabular-nums">
                    {teamDisplay.teamRemaining === null
                      ? "—"
                      : formatCreditAmount(teamDisplay.teamRemaining)}
                  </p>
                </div>
              )}
            </div>
          </section>
        ) : null}
        {transactionsPermissionPending && !cachedTransactionsPermission?.allowed ? (
          <TeamCreditHistorySection showInfo={ledgerScope !== "GROUP"}>
            <div data-action-ui-id="team.credit-permission-loading">
              <CreditLedgerTable
                rows={[]}
                loading={true}
                error={false}
                scrollable={false}
                descriptionLabel={
                  ledgerScope === "GROUP"
                    ? void 0
                    : t2("team.credit.transaction", {
                        defaultValue: "类型",
                      })
                }
                modelLabel={t2("team.credit.model", {
                  defaultValue: "模型",
                })}
                operatorLabel={
                  ledgerScope === "GROUP"
                    ? t2("team.credit.operator", {
                        defaultValue: "消耗人",
                      })
                    : void 0
                }
                timeLabel={t2("team.credit.time", {
                  defaultValue: "时间",
                })}
                amountLabel={t2("team.credit.amount", {
                  defaultValue: "积分",
                })}
                emptyLabel={t2("team.credit.empty", {
                  defaultValue: "暂无积分流水",
                })}
                errorLabel={t2("team.common.loadFailed", {
                  defaultValue: "加载失败",
                })}
                retryLabel={t2("common.retry", {
                  defaultValue: "重试",
                })}
                onRetry={() => void detailQuery.refetch()}
              />
            </div>
          </TeamCreditHistorySection>
        ) : null}
        {gateOpen &&
        !transactionsPermissionPending &&
        !transactionsDisplayAllowed &&
        !transactionsUpstreamUnavailable &&
        detailQuery.isSuccess ? (
          <TeamCreditHistorySection showInfo={ledgerScope !== "GROUP"}>
            <TeamPanelGated
              reasonCode={transactionsPermission?.reasonCode ?? "permission_denied"}
            />
          </TeamCreditHistorySection>
        ) : null}
        {gateOpen &&
        !transactionsPermissionPending &&
        !transactionsDisplayAllowed &&
        transactionsUpstreamUnavailable &&
        detailQuery.isSuccess ? (
          <TeamCreditHistorySection showInfo={ledgerScope !== "GROUP"}>
            <TeamPanelGated
              reasonCode={transactionsPermission?.reasonCode ?? "upstream_transactions_unavailable"}
            />
          </TeamCreditHistorySection>
        ) : null}
        {transactionsDisplayAllowed ? (
          <TeamCreditHistorySection showInfo={ledgerScope !== "GROUP"}>
            {transferTabVisible ? (
              <Tabs value={ledgerTab} onValueChange={(value) => setLedgerTab(value)}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger
                    value={LEDGER_TAB.INTERNAL}
                    data-action-ui-id="team.credit-tab-internal"
                  >
                    {t2("team.credit.tabInternal", {
                      defaultValue: "内部明细",
                    })}
                  </TabsTrigger>
                  <TabsTrigger
                    value={LEDGER_TAB.TRANSFER}
                    data-action-ui-id="team.credit-tab-transfer"
                  >
                    {t2("team.credit.tabTransfer", {
                      defaultValue: "积分转移",
                    })}
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            ) : null}
            {ledgerScope === "GROUP" && !transferTabActive ? (
              <TeamLedgerFilters
                members={memberRows}
                memberSearchQuery={memberSearchQuery}
                onMemberSearchChange={setMemberSearchQuery}
                membersLoading={membersQuery.isPending && !membersQuery.data}
                membersError={membersQuery.isError && !membersQuery.data}
                onRetryMembers={() => void membersQuery.refetch()}
                onFilterChange={setLedgerFilter}
                trailing={exportButton}
              />
            ) : null}
            {!transactionsPermissionPending ? (
              <>
                {transferTabActive ? (
                  <InfiniteScrollContainer
                    className="min-h-0 flex-1"
                    loadedBatchCount={transfersQuery.data?.pages.length ?? 0}
                    hasMore={Boolean(transfersQuery.hasNextPage)}
                    isLoadingMore={transfersQuery.isFetchingNextPage}
                    loadMoreError={transfersQuery.isFetchNextPageError}
                    onLoadMore={() => transfersQuery.fetchNextPage()}
                    actionUiId="team.credit-transfers-scroll"
                  >
                    <CreditLedgerTable
                      rows={transfers.map((transfer) => ({
                        id: transfer.transferId,
                        description: formatTransferDirection(transfer.direction),
                        model: formatTransferCounterparty(transfer),
                        createdAtMs: transfer.createdAtMs,
                        amount: formatSignedCreditAmount(transfer.amount),
                        tone: amountTone$1(transfer.amount),
                      }))}
                      loading={transfersQuery.isPending && !transfersQuery.data}
                      error={transfersQuery.isError && !transfersQuery.data}
                      scrollable={false}
                      descriptionLabel={t2("team.credit.transferType", {
                        defaultValue: "类型",
                      })}
                      modelLabel={t2("team.credit.transferCounterparty", {
                        defaultValue: "团队 / 账号",
                      })}
                      timeLabel={t2("team.credit.time", {
                        defaultValue: "时间",
                      })}
                      amountLabel={t2("team.credit.amount", {
                        defaultValue: "积分",
                      })}
                      emptyLabel={t2("team.credit.transferEmpty", {
                        defaultValue: "暂无积分转移",
                      })}
                      errorLabel={t2("team.common.loadFailed", {
                        defaultValue: "加载失败",
                      })}
                      retryLabel={t2("common.retry", {
                        defaultValue: "重试",
                      })}
                      onRetry={() => void transfersQuery.refetch()}
                    />
                  </InfiniteScrollContainer>
                ) : null}
                {!transferTabActive && transactionsStale ? (
                  <TeamPanelStale
                    isFetching={transactionsQuery.isFetching}
                    onRetry={async () => {
                      const result = await transactionsQuery.refetch();
                      if (result.isError) {
                        const code2 =
                          result.error instanceof TeamApiError
                            ? result.error.payload.code
                            : result.error instanceof Error
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
                ) : null}
                {transferTabActive ? null : (
                  <InfiniteScrollContainer
                    className="min-h-0 flex-1"
                    loadedBatchCount={transactionsQuery.data?.pages.length ?? 0}
                    hasMore={Boolean(transactionsQuery.hasNextPage)}
                    isLoadingMore={transactionsQuery.isFetchingNextPage}
                    loadMoreError={transactionsQuery.isFetchNextPageError}
                    onLoadMore={() => transactionsQuery.fetchNextPage()}
                    actionUiId="team.credit-transactions-scroll"
                  >
                    <CreditLedgerTable
                      rows={transactions.map((transaction) => ({
                        id: transaction.transactionId,
                        description: formatDescription(transaction),
                        model: formatModel(transaction) || void 0,
                        operator: formatOperator(transaction),
                        createdAtMs: transaction.createdAtMs,
                        amount: formatAmount(transaction),
                        tone: amountTone$1(transaction.amount),
                      }))}
                      loading={transactionsQuery.isPending && !transactionsQuery.data}
                      error={transactionsQuery.isError && !transactionsQuery.data}
                      scrollable={false}
                      descriptionLabel={
                        ledgerScope === "GROUP"
                          ? void 0
                          : t2("team.credit.transaction", {
                              defaultValue: "类型",
                            })
                      }
                      modelLabel={t2("team.credit.model", {
                        defaultValue: "模型",
                      })}
                      operatorLabel={
                        ledgerScope === "GROUP"
                          ? t2("team.credit.operator", {
                              defaultValue: "消耗人",
                            })
                          : void 0
                      }
                      timeLabel={t2("team.credit.time", {
                        defaultValue: "时间",
                      })}
                      amountLabel={t2("team.credit.amount", {
                        defaultValue: "积分",
                      })}
                      emptyLabel={t2("team.credit.empty", {
                        defaultValue: "暂无积分流水",
                      })}
                      errorLabel={t2("team.common.loadFailed", {
                        defaultValue: "加载失败",
                      })}
                      retryLabel={t2("common.retry", {
                        defaultValue: "重试",
                      })}
                      onRetry={() => void transactionsQuery.refetch()}
                    />
                  </InfiniteScrollContainer>
                )}
                {!transferTabActive && ledgerTotalUsed !== null ? (
                  <div
                    className="flex shrink-0 items-center gap-2 text-xs"
                    data-action-ui-id="team.credit-total-used"
                  >
                    <span className="text-muted-foreground">
                      {t2("team.credit.totalUsed", {
                        defaultValue: "消耗总计",
                      })}
                    </span>
                    <span className="font-medium tabular-nums text-foreground">
                      {formatCreditAmount(ledgerTotalUsed)}
                    </span>
                  </div>
                ) : null}
              </>
            ) : (
              <div data-action-ui-id="team.credit-permission-loading">
                <CreditLedgerTable
                  rows={[]}
                  loading={true}
                  error={false}
                  scrollable={false}
                  descriptionLabel={
                    ledgerScope === "GROUP"
                      ? void 0
                      : t2("team.credit.transaction", {
                          defaultValue: "类型",
                        })
                  }
                  modelLabel={t2("team.credit.model", {
                    defaultValue: "模型",
                  })}
                  operatorLabel={
                    ledgerScope === "GROUP"
                      ? t2("team.credit.operator", {
                          defaultValue: "消耗人",
                        })
                      : void 0
                  }
                  timeLabel={t2("team.credit.time", {
                    defaultValue: "时间",
                  })}
                  amountLabel={t2("team.credit.amount", {
                    defaultValue: "积分",
                  })}
                  emptyLabel={t2("team.credit.empty", {
                    defaultValue: "暂无积分流水",
                  })}
                  errorLabel={t2("team.common.loadFailed", {
                    defaultValue: "加载失败",
                  })}
                  retryLabel={t2("common.retry", {
                    defaultValue: "重试",
                  })}
                  onRetry={() => void detailQuery.refetch()}
                />
              </div>
            )}
          </TeamCreditHistorySection>
        ) : null}
      </div>
    </div>
  );
}
