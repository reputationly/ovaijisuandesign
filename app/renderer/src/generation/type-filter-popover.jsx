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
  const { t: translate } = useTranslation();
  const [open, setOpen] = reactExports.useState(false);
  const allSelected = typeFilters.length === 0;
  const isPartial = !allSelected;
  const active = isPartial;
  const triggerLabel = reactExports.useMemo(() => {
    const base = translate("assetFilter.typeSection");
    if (typeFilters.length === 0) return base;
    if (typeFilters.length === 1) {
      const selectedOption = TYPE_OPTIONS.find((option) => option.value === typeFilters[0]);
      return selectedOption ? translate(selectedOption.labelKey, selectedOption.fallback) : typeFilters[0];
    }
    return `${base} · ${typeFilters.length}`;
  }, [translate, typeFilters]);
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
      const set = new Set(typeFilters);
      if (set.has(value)) {
        if (set.size === 1) {
          onChange([]);
          return;
        }
        set.delete(value);
      } else {
        set.add(value);
      }
      const next = Array.from(set);
      if (next.length === TYPE_OPTIONS.length) onChange([]);
      else onChange(next);
    },
    [typeFilters, allSelected, onChange],
  );
  return (
    <FilterMenu open={open} onOpenChange={setOpen}>
      <FilterTrigger
        label={triggerLabel}
        active={active}
        open={open}
        testId="asset-panel.type-filter-trigger"
        clearLabel={translate("assetFilter.reset")}
        onClear={active ? clearTypeFilter : void 0}
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
          {translate("assetFilter.typeAll")}
        </FilterMenuItem>
        {TYPE_OPTIONS.map((option) => {
          const selected = !allSelected && typeFilters.includes(option.value);
          const label = translate(option.labelKey, option.fallback);
          return (
            <FilterMenuItem
              key={option.value}
              selected={selected}
              onClick={() => toggle(option.value)}
              data-action-ui-id={`asset-panel.type-filter-option-${option.value}`}
            >
              {label}
            </FilterMenuItem>
          );
        })}
      </PopoverContent>
    </FilterMenu>
  );
}
