// type-filter-popover.jsx
import { reactExports, useTranslation } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { FilterMenuItem, FilterTrigger } from "./filter-trigger.jsx";
import { FilterMenu } from "../workspace/set-home-widget-dev-preview-mode.js";
import { PopoverContent } from "../team/hailuo-credit-row.jsx";

const TYPE_OPTIONS = [
  {
    value: "image",
    labelKey: "assetFilter.typeImage",
    fallback: "Image",
  },
  {
    value: "video",
    labelKey: "assetFilter.typeVideo",
    fallback: "Video",
  },
  {
    value: "audio",
    labelKey: "assetFilter.typeAudio",
    fallback: "Audio",
  },
  {
    value: "text",
    labelKey: "assetFilter.typeText",
    fallback: "Text",
  },
  {
    value: "other",
    labelKey: "assetFilter.typeOther",
    fallback: "Other",
  },
];

export function TypeFilterPopover({ typeFilters, onChange }) {
  const { t: t2 } = useTranslation();
  const [open, setOpen] = reactExports.useState(false);
  const allSelected = typeFilters.length === 0;
  const isPartial = !allSelected;
  const active2 = isPartial;
  const triggerLabel = reactExports.useMemo(() => {
    const base2 = t2("assetFilter.typeSection");
    if (typeFilters.length === 0) return base2;
    if (typeFilters.length === 1) {
      const opt = TYPE_OPTIONS.find((o2) => o2.value === typeFilters[0]);
      return opt ? t2(opt.labelKey, opt.fallback) : typeFilters[0];
    }
    return `${base2} · ${typeFilters.length}`;
  }, [t2, typeFilters]);
  const clearTypeFilter = reactExports.useCallback(() => {
    onChange([]);
    setOpen(false);
  }, [onChange]);
  const toggleAll = reactExports.useCallback(() => {
    if (allSelected) return;
    onChange([]);
  }, [allSelected, onChange]);
  const toggle = reactExports.useCallback(
    (value) => {
      if (allSelected) {
        onChange([value]);
        return;
      }
      const set2 = new Set(typeFilters);
      if (set2.has(value)) {
        if (set2.size === 1) {
          onChange([]);
          return;
        }
        set2.delete(value);
      } else {
        set2.add(value);
      }
      const next2 = Array.from(set2);
      if (next2.length === TYPE_OPTIONS.length) onChange([]);
      else onChange(next2);
    },
    [typeFilters, allSelected, onChange],
  );
  return (
    <FilterMenu open={open} onOpenChange={setOpen}>
      <FilterTrigger
        label={triggerLabel}
        active={active2}
        open={open}
        testId="asset-panel.type-filter-trigger"
        clearLabel={t2("assetFilter.reset")}
        onClear={active2 ? clearTypeFilter : void 0}
      />
      <PopoverContent
        align="start"
        className="w-auto min-w-36 gap-0.5 p-1.5 overflow-hidden"
        data-slot="type-filter-popover"
      >
        <FilterMenuItem
          selected={allSelected}
          onClick={toggleAll}
          data-action-ui-id="asset-panel.type-filter-option-all"
        >
          {t2("assetFilter.typeAll")}
        </FilterMenuItem>
        {TYPE_OPTIONS.map((opt) => {
          const selected2 = !allSelected && typeFilters.includes(opt.value);
          const label = t2(opt.labelKey, opt.fallback);
          return (
            <FilterMenuItem
              key={opt.value}
              selected={selected2}
              onClick={() => toggle(opt.value)}
              data-action-ui-id={`asset-panel.type-filter-option-${opt.value}`}
            >
              {label}
            </FilterMenuItem>
          );
        })}
      </PopoverContent>
    </FilterMenu>
  );
}
