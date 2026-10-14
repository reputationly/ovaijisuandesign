// skill-filter-bar.jsx
import { mergeTailwindClasses as cn } from "../infra/dialog-content.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  FEATURED_TAG,
  StableTabLabel,
} from "../generation/use-mention-models.jsx";
import { ChevronDown, reactExports, useTranslation } from "../vendor.js";
import {
  FilterMenu,
  FilterMenuTrigger,
} from "./set-home-widget-dev-preview-mode.js";
import {
  FilterMenuContent,
  FilterMenuGroup,
  FilterMenuItem,
} from "../generation/filter-trigger.jsx";
import { Switch } from "../generation/select-content.jsx";
const SKILL_SECONDARY_TAB_CLASS_NAME =
  "skills-category-secondary-tab inline-flex h-8 shrink-0 cursor-pointer items-center whitespace-nowrap rounded-md border px-2.5 py-0 text-[15px] font-normal leading-5 tracking-[0.02em] shadow-none transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50";
function skillSecondaryTabClassName(active) {
  return cn(
    SKILL_SECONDARY_TAB_CLASS_NAME,
    active
      ? "border-transparent bg-[var(--secondary-tab-active-bg)] font-medium text-foreground"
      : "border-transparent bg-transparent text-foreground/50 hover:text-foreground",
  );
}
function SkillSecondaryTab({ actionId, active, label, onClick }) {
  return (
    <button
      type="button"
      data-action-ui-id={actionId}
      data-active={active ? "true" : void 0}
      aria-pressed={active}
      className={skillSecondaryTabClassName(active)}
      onClick={onClick}
    >
      <span className="text-[15px] leading-5">
        <StableTabLabel label={label} />
      </span>
    </button>
  );
}
function SkillFilterDropdown({
  label,
  value,
  valueLabel,
  options,
  actionId,
  onValueChange,
}) {
  const [open, setOpen] = reactExports.useState(false);
  return (
    <FilterMenu open={open} onOpenChange={setOpen}>
      <FilterMenuTrigger
        render={
          <button
            type="button"
            className="inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-border bg-transparent px-3 text-xs text-foreground transition-colors hover:border-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
            data-action-ui-id={actionId}
          />
        }
      >
        <span className="text-muted-foreground">{label}</span>
        <span>{valueLabel}</span>
        <ChevronDown
          aria-hidden="true"
          size={14}
          strokeWidth={1.5}
          className="shrink-0"
        />
      </FilterMenuTrigger>
      <FilterMenuContent
        alignOffset={0}
        sideOffset={4}
        className="min-w-40 gap-0 p-1"
        data-action-ui-id={`${actionId}-menu`}
      >
        <FilterMenuGroup className="gap-0 [--filter-menu-row-gap:0px]">
          {options.map((option) => (
            <FilterMenuItem
              key={option.value}
              className="h-auto min-h-7 rounded-sm py-1.5 text-[11px] font-medium hover:bg-popup-item-hover focus-visible:bg-popup-item-hover"
              selected={option.value === value}
              onClick={() => {
                onValueChange?.(option.value);
                setOpen(false);
              }}
              data-action-ui-id={`${actionId}-option-${option.value}`}
            >
              {option.label}
            </FilterMenuItem>
          ))}
        </FilterMenuGroup>
      </FilterMenuContent>
    </FilterMenu>
  );
}
export function SkillFilterBar({
  categories,
  activeTab,
  activeTag,
  onTagChange,
  viewMode: _viewMode,
  onViewModeChange: _onViewModeChange,
  sortBy: _sortBy,
  onSortChange: _onSortChange,
  autoUpdate,
  onAutoUpdateChange,
  mineCategoryFilter,
  onMineCategoryFilterChange,
  mineSourceFilter = "all",
  onMineSourceFilterChange,
}) {
  const { t: translate, i18n } = useTranslation();
  const isZh = i18n.language.startsWith("zh");
  return (
    <div
      className="flex h-14 shrink-0 items-center gap-3 px-8 py-3 md:px-12"
      data-layout-slot="skills-secondary-filter-bar"
    >
      <div className="flex min-w-0 flex-1 flex-nowrap items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {activeTab === "community" && (
          <div className="flex min-w-max items-center gap-1">
            <SkillSecondaryTab
              actionId="skills-filter-tag-all"
              active={!activeTag}
              label={translate("skills.tag.all", "All")}
              onClick={() => onTagChange(null)}
            />
            <SkillSecondaryTab
              actionId="skills-filter-tag-featured"
              active={activeTag === FEATURED_TAG}
              label={translate("skills.tag.featured", "精选")}
              onClick={() => onTagChange(FEATURED_TAG)}
            />
            {categories.map((category) => (
              <SkillSecondaryTab
                key={category.category}
                actionId={`skills-filter-tag-${category.category}`}
                active={activeTag === category.category}
                label={isZh ? category.cn_name : category.en_name}
                onClick={() => onTagChange(category.category)}
              />
            ))}
          </div>
        )}
        {activeTab === "mine" && (
          <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <SkillFilterDropdown
                value={mineCategoryFilter ?? "__all__"}
                label={translate("skills.mine.filterCategoryLabel", "分类")}
                valueLabel={
                  mineCategoryFilter
                    ? (() => {
                        const match = categories.find(
                          (category) =>
                            category.category === mineCategoryFilter,
                        );
                        return match
                          ? isZh
                            ? match.cn_name
                            : match.en_name
                          : mineCategoryFilter;
                      })()
                    : translate("skills.mine.filterCategoryAll", "全部")
                }
                options={[
                  {
                    value: "__all__",
                    label: translate("skills.mine.filterCategoryAll", "全部"),
                  },
                  ...categories.map((category) => ({
                    value: category.category,
                    label: isZh ? category.cn_name : category.en_name,
                  })),
                ]}
                actionId="skills-mine-category-dropdown"
                onValueChange={(value) =>
                  onMineCategoryFilterChange?.(
                    value === "__all__" ? null : value,
                  )
                }
              />
              <SkillFilterDropdown
                value={mineSourceFilter}
                label={translate("skills.mine.filterSourceLabel", "来源")}
                valueLabel={
                  mineSourceFilter === "community"
                    ? translate("skills.mine.filterSourceCommunity", "来自社区")
                    : mineSourceFilter === "local"
                      ? translate("skills.mine.filterSourceLocal", "本地创建")
                      : translate("skills.mine.filterSourceAll", "全部")
                }
                options={[
                  {
                    value: "all",
                    label: translate("skills.mine.filterSourceAll", "全部"),
                  },
                  {
                    value: "community",
                    label: translate("skills.mine.filterSourceCommunity", "来自社区"),
                  },
                  {
                    value: "local",
                    label: translate("skills.mine.filterSourceLocal", "本地创建"),
                  },
                ]}
                actionId="skills-mine-source-dropdown"
                onValueChange={(value) => onMineSourceFilterChange?.(value)}
              />
            </div>
            {onAutoUpdateChange && (
              <label
                htmlFor="skill-auto-update-filter"
                className="inline-flex shrink-0 cursor-pointer select-none items-center gap-2 text-xs text-muted-foreground"
              >
                {translate("skills.mine.autoUpdateInstalled", "自动更新已安装 Skill")}
                <Switch
                  id="skill-auto-update-filter"
                  data-action-ui-id="skills.auto-update-toggle"
                  checked={autoUpdate}
                  onCheckedChange={onAutoUpdateChange}
                />
              </label>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
