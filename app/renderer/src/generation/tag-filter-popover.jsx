// tag-filter-popover.jsx
import { reactExports, useTranslation } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { FilterMenuItem, FilterTrigger } from "./filter-trigger.jsx";
import { Popover } from "../assets/credit-query-keys.jsx";
import { PopoverContent } from "../team/hailuo-credit-row.jsx";
import {
  isCanvasColorTag,
  isCanvasKeywordTag,
  PRESET_COLOR_NAME_KEYS,
} from "../infra/parse-connector-selection.js";
import { getCanvasTagPresentationColor } from "../assets/inline-input.jsx";
import { useTagRegistry } from "../canvas/conflict-resolution-dialog.jsx";

export function TagFilterPopover({ tagFilters, onChange }) {
  const { t: t2 } = useTranslation();
  const registry2 = useTagRegistry();
  const [open, setOpen] = reactExports.useState(false);
  const active2 = tagFilters.length > 0;
  const displayName2 = reactExports.useCallback(
    (id2, custom, legacyNameKey) => {
      if (custom && custom.length > 0) return custom;
      return t2(legacyNameKey ?? PRESET_COLOR_NAME_KEYS[id2] ?? "") || id2;
    },
    [t2],
  );
  const triggerLabel = reactExports.useMemo(() => {
    const base2 = t2("assetFilter.tagSection");
    return active2 ? `${base2} · ${tagFilters.length}` : base2;
  }, [t2, active2, tagFilters.length]);
  const toggle = reactExports.useCallback(
    (id2) => {
      const set2 = new Set(tagFilters);
      if (set2.has(id2)) set2.delete(id2);
      else set2.add(id2);
      onChange(Array.from(set2));
    },
    [tagFilters, onChange],
  );
  const clear = reactExports.useCallback(() => {
    onChange([]);
    setOpen(false);
  }, [onChange]);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <FilterTrigger
        label={triggerLabel}
        active={active2}
        open={open}
        testId="asset-panel.tag-filter-trigger"
        clearLabel={t2("assetFilter.reset")}
        onClear={active2 ? clear : void 0}
      />
      <PopoverContent
        align="start"
        className="w-auto min-w-36 gap-0.5 p-1.5"
        data-slot="tag-filter-popover"
      >
        {[
          {
            key: "color",
            label: t2("canvasTags.colorLabels"),
            tags: registry2.tags.filter(isCanvasColorTag),
          },
          {
            key: "keyword",
            label: t2("canvasTags.keywords"),
            tags: registry2.tags.filter(isCanvasKeywordTag),
          },
        ].map((group) =>
          group.tags.length > 0 ? (
            <div key={group.key} className="not-first:mt-1">
              <div className="px-2 py-1 text-[11px] font-medium text-muted-foreground">
                {group.label}
              </div>
              {group.tags.map((tag) => {
                const checked = tagFilters.includes(tag.id);
                const label = displayName2(tag.id, tag.name, tag.legacyNameKey);
                return (
                  <FilterMenuItem
                    key={tag.id}
                    selected={checked}
                    onClick={() => toggle(tag.id)}
                    className="gap-2.5"
                    data-action-ui-id={`asset-panel.tag-filter-option-${tag.id}`}
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      {isCanvasColorTag(tag) ? (
                        <span
                          className="size-2.5 shrink-0 rounded-full"
                          style={{
                            backgroundColor: getCanvasTagPresentationColor(
                              tag.color,
                            ),
                          }}
                          aria-hidden={true}
                        />
                      ) : (
                        <span
                          data-canvas-keyword-mark=""
                          className="size-2.5 shrink-0 rounded-full border border-muted-foreground"
                          aria-hidden={true}
                        />
                      )}
                      <span className="min-w-0 truncate text-left">
                        {label}
                      </span>
                    </span>
                  </FilterMenuItem>
                );
              })}
            </div>
          ) : null,
        )}
      </PopoverContent>
    </Popover>
  );
}
