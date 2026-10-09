// date-filter-popover.jsx
import { reactExports, useTranslation } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  FilterMenuContent,
  FilterMenuGroup,
  FilterMenuItem,
  FilterTrigger,
} from "./filter-trigger.jsx";
import { Popover } from "../assets/credit-query-keys.jsx";
import { Calendar } from "../team/calendar.jsx";

const DATE_PRESETS = [
  {
    value: "all",
    labelKey: "assetFilter.dateAll",
    fallback: "All time",
  },
  {
    value: "today",
    labelKey: "assetFilter.dateToday",
    fallback: "Today",
  },
  {
    value: "last7days",
    labelKey: "assetFilter.dateLast7Days",
    fallback: "Last 7 days",
  },
  {
    value: "last30days",
    labelKey: "assetFilter.dateLast30Days",
    fallback: "Last 30 days",
  },
  {
    value: "custom",
    labelKey: "assetFilter.dateCustom",
    fallback: "Custom",
  },
];

function toIsoDate(date2) {
  const y4 = date2.getFullYear();
  const m3 = String(date2.getMonth() + 1).padStart(2, "0");
  const d2 = String(date2.getDate()).padStart(2, "0");
  return `${y4}-${m3}-${d2}`;
}

function fromIsoDate(value) {
  if (!value) return void 0;
  const [y4, m3, d2] = value.split("-").map(Number);
  if (!y4 || !m3 || !d2) return void 0;
  return new Date(y4, m3 - 1, d2);
}

function formatMonthDay(iso) {
  const d2 = fromIsoDate(iso);
  if (!d2) return iso;
  const m3 = String(d2.getMonth() + 1).padStart(2, "0");
  const day = String(d2.getDate()).padStart(2, "0");
  return `${m3}-${day}`;
}

export function DateFilterPopover({
  dateFilter,
  sortOrder,
  onDateChange,
  onSortChange,
}) {
  const { t: t2 } = useTranslation();
  const [open, setOpen] = reactExports.useState(false);
  const active2 = reactExports.useMemo(() => {
    if (dateFilter.kind === "all") return false;
    if (dateFilter.kind === "custom") {
      return Boolean(dateFilter.from) || Boolean(dateFilter.to);
    }
    return true;
  }, [dateFilter]);
  const triggerLabel = reactExports.useMemo(() => {
    const base2 = t2("assetFilter.dateSection");
    if (dateFilter.kind === "all") return base2;
    if (dateFilter.kind === "custom") {
      const from2 = dateFilter.from ? formatMonthDay(dateFilter.from) : "";
      const to = dateFilter.to ? formatMonthDay(dateFilter.to) : "";
      if (!from2 && !to) return base2;
      return `${from2 || "..."} ~ ${to || "..."}`;
    }
    const preset2 = DATE_PRESETS.find((p3) => p3.value === dateFilter.kind);
    return preset2 ? t2(preset2.labelKey, preset2.fallback) : base2;
  }, [t2, dateFilter]);
  const handlePreset = reactExports.useCallback(
    (kind) => {
      if (kind === "custom") {
        if (dateFilter.kind === "custom") return;
        onDateChange({
          kind: "custom",
          from: "",
          to: "",
        });
        return;
      }
      onDateChange({
        kind,
      });
    },
    [dateFilter, onDateChange],
  );
  const customRange = reactExports.useMemo(() => {
    if (dateFilter.kind !== "custom") return void 0;
    const from2 = fromIsoDate(dateFilter.from);
    const to = fromIsoDate(dateFilter.to);
    if (!from2 && !to) return void 0;
    return {
      from: from2,
      to,
    };
  }, [dateFilter]);
  const handleCustomSelect = reactExports.useCallback(
    (range2) => {
      onDateChange({
        kind: "custom",
        from: range2?.from ? toIsoDate(range2.from) : "",
        to: range2?.to ? toIsoDate(range2.to) : "",
      });
    },
    [onDateChange],
  );
  const clearDateFilter = reactExports.useCallback(() => {
    onDateChange({
      kind: "all",
    });
    setOpen(false);
  }, [onDateChange]);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <FilterTrigger
        label={triggerLabel}
        active={active2}
        open={open}
        testId="asset-panel.date-filter-trigger"
        clearLabel={t2("assetFilter.reset")}
        onClear={active2 ? clearDateFilter : void 0}
      />
      <FilterMenuContent data-slot="date-filter-popover">
        <FilterMenuGroup>
          {["desc", "asc"].map((value) => {
            const isSelected = sortOrder === value;
            const label =
              value === "desc"
                ? t2("assetFilter.sortNewest")
                : t2("assetFilter.sortOldest");
            return (
              <FilterMenuItem
                key={value}
                selected={isSelected}
                onClick={() => onSortChange(value)}
                data-action-ui-id={`asset-panel.sort-${value}`}
              >
                {label}
              </FilterMenuItem>
            );
          })}
        </FilterMenuGroup>
        <FilterMenuGroup separated={true}>
          {DATE_PRESETS.map((preset2) => {
            const isSelected = dateFilter.kind === preset2.value;
            const label = t2(preset2.labelKey, preset2.fallback);
            return (
              <FilterMenuItem
                key={preset2.value}
                selected={isSelected}
                onClick={() => handlePreset(preset2.value)}
                data-action-ui-id={`asset-panel.date-filter-option-${preset2.value}`}
              >
                {label}
              </FilterMenuItem>
            );
          })}
        </FilterMenuGroup>
        {dateFilter.kind === "custom" && (
          <div
            data-slot="custom-date-range"
            className="overflow-hidden rounded-lg border border-border bg-background"
          >
            <Calendar
              mode="range"
              selected={customRange}
              onSelect={handleCustomSelect}
              numberOfMonths={1}
            />
          </div>
        )}
      </FilterMenuContent>
    </Popover>
  );
}
