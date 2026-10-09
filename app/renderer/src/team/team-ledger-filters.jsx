// team-ledger-filters.jsx
import {
  ChevronDown,
  formatDate,
  reactExports,
  useTranslation,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { Popover } from "../assets/credit-query-keys.jsx";
import { PopoverTrigger } from "../assets/gateway-scope-provider.jsx";
import { CalendarDays } from "../media-editing/package.jsx";
import { cn$2 as cn } from "../infra/dialog-content.jsx";
import { Calendar } from "./calendar.jsx";
import { TeamMemberCombobox } from "./team-member-combobox.jsx";
import { PopoverContent } from "./hailuo-credit-row.jsx";
const DATE_PRESETS = [
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
  return new Date(
    date2.getFullYear(),
    date2.getMonth(),
    date2.getDate(),
  ).getTime();
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
    endTime: range2.to
      ? toEndOfDayMs(range2.to)
      : range2.from
        ? toEndOfDayMs(range2.from)
        : null,
  };
}
export function TeamLedgerFilters({
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
  const selectedMember =
    members.find((member) => member.userId === memberId) ?? null;
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
            <CalendarDays
              className="size-4 shrink-0 text-muted-foreground"
              strokeWidth={1.5}
            />
            <span className="truncate">{dateLabel}</span>
          </span>
          <ChevronDown
            className="size-4 shrink-0 text-muted-foreground"
            strokeWidth={1.5}
          />
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="flex w-auto flex-row gap-0 p-0"
          sideOffset={4}
          positionerClassName="z-[70]"
        >
          <div className="flex w-28 shrink-0 flex-col gap-1 border-r border-border p-1.5">
            {DATE_PRESETS.map(({ value, days }) => (
              <button
                key={value}
                type="button"
                className={cn(
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
              className={cn(
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
      {trailing ? (
        <div className="flex shrink-0 items-center">{trailing}</div>
      ) : null}
    </div>
  );
}
