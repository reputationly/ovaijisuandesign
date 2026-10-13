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

function toIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fromIsoDate(value) {
  if (!value) return void 0;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return void 0;
  return new Date(year, month - 1, day);
}

function formatMonthDay(iso) {
  const date = fromIsoDate(iso);
  if (!date) return iso;
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${month}-${day}`;
}

export function DateFilterPopover({
  dateFilter,
  sortOrder,
  onDateChange,
  onSortChange,
}) {
  const { t: translate } = useTranslation();
  const [open, setOpen] = reactExports.useState(false);
  const active = reactExports.useMemo(() => {
    if (dateFilter.kind === "all") return false;
    if (dateFilter.kind === "custom") {
      return Boolean(dateFilter.from) || Boolean(dateFilter.to);
    }
    return true;
  }, [dateFilter]);
  const triggerLabel = reactExports.useMemo(() => {
    const base = translate("assetFilter.dateSection");
    if (dateFilter.kind === "all") return base;
    if (dateFilter.kind === "custom") {
      const from = dateFilter.from ? formatMonthDay(dateFilter.from) : "";
      const to = dateFilter.to ? formatMonthDay(dateFilter.to) : "";
      if (!from && !to) return base;
      return `${from || "..."} ~ ${to || "..."}`;
    }
    const matchingPreset = DATE_PRESETS.find((preset) => preset.value === dateFilter.kind);
    return matchingPreset ? translate(matchingPreset.labelKey, matchingPreset.fallback) : base;
  }, [translate, dateFilter]);
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
    const from = fromIsoDate(dateFilter.from);
    const to = fromIsoDate(dateFilter.to);
    if (!from && !to) return void 0;
    return {
      from,
      to,
    };
  }, [dateFilter]);
  const handleCustomSelect = reactExports.useCallback(
    (range) => {
      onDateChange({
        kind: "custom",
        from: range?.from ? toIsoDate(range.from) : "",
        to: range?.to ? toIsoDate(range.to) : "",
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
        active={active}
        open={open}
        testId="asset-panel.date-filter-trigger"
        clearLabel={translate("assetFilter.reset")}
        onClear={active ? clearDateFilter : void 0}
      />
      <FilterMenuContent data-slot="date-filter-popover">
        <FilterMenuGroup>
          {["desc", "asc"].map((value) => {
            const isSelected = sortOrder === value;
            const label =
              value === "desc"
                ? translate("assetFilter.sortNewest")
                : translate("assetFilter.sortOldest");
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
          {DATE_PRESETS.map((preset) => {
            const isSelected = dateFilter.kind === preset.value;
            const label = translate(preset.labelKey, preset.fallback);
            return (
              <FilterMenuItem
                key={preset.value}
                selected={isSelected}
                onClick={() => handlePreset(preset.value)}
                data-action-ui-id={`asset-panel.date-filter-option-${preset.value}`}
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
