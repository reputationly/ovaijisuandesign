// 技能页「社区」标签页内容。
import {
  h as useTranslation,
  r as reactExports,
  j as jsxRuntimeExports,
  U as PageStateBoundary,
  iY as Select,
  iZ as SelectTrigger,
  i_ as SelectValue,
  i$ as SelectContent,
  j0 as SelectItem,
  dl as Loader2,
  hC as Checkbox,
  nJ as skillCategoryCodes,
  n$ as FEATURED_TAG,
} from "../main.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { CreatorPlanInviteCard } from "./creator-plan/invite-card.jsx";
import { FeaturedSkillSection, OtherSkillItem } from "./my-skills/skill-cards.jsx";
import { CreatorPlanHoverPopover } from "./page-parts.jsx";
export function CommunityTabContent({
  searchMarket,
  marketOfficialFeatured,
  marketCommunity,
  marketOther,
  searchQuery,
  // tabName / onDetailList / onExport / onShare / onUninstall / onUpdate /
  // updatingSet / skillUpdates / viewMode are accepted to keep the prop
  // surface stable for callers; the 3-rail layout doesn't surface them yet
  // but detail dialog / future per-section overrides depend on them.
  tabName: _tabName = "community",
  onInstall,
  onDetail,
  onDetailList: _onDetailList,
  installedSkills,
  onToggle,
  onTryItOut,
  onExport: _onExport,
  onShare: _onShare,
  onUninstall: _onUninstall,
  skillUpdates: _skillUpdates,
  onUpdate: _onUpdate,
  updatingSet: _updatingSet,
  viewMode: _viewMode,
  activeTag,
  hideInstalled,
  onHideInstalledChange,
  sortBy,
  onSortChange,
  onRetry,
  onOpenCreatorPlan,
}) {
  const { t } = useTranslation();
  const applyFilters = reactExports.useCallback(
    (skills) => {
      if (!activeTag || activeTag === FEATURED_TAG) return skills;
      return skills.filter((skill) => skillCategoryCodes(skill).includes(activeTag));
    },
    [activeTag],
  );
  const isSearching = searchQuery.trim().length > 0;
  const officialFeatured = reactExports.useMemo(
    () => applyFilters(marketOfficialFeatured.skills),
    [marketOfficialFeatured.skills, applyFilters],
  );
  const community = reactExports.useMemo(
    () => applyFilters(marketCommunity.skills),
    [marketCommunity.skills, applyFilters],
  );
  const other = reactExports.useMemo(() => {
    let list = applyFilters(marketOther.skills);
    if (hideInstalled) list = list.filter((s) => !s.installed);
    if (sortBy === "hot") {
      list = [...list].sort((a, b) => (b.downloads ?? 0) - (a.downloads ?? 0));
    }
    return list;
  }, [marketOther.skills, applyFilters, hideInstalled, sortBy]);
  const searchResults = reactExports.useMemo(
    () => applyFilters(searchMarket.skills),
    [searchMarket.skills, applyFilters],
  );
  const aggregateLoading = isSearching
    ? searchMarket.loading && searchMarket.skills.length === 0
    : (marketOfficialFeatured.loading && marketOfficialFeatured.skills.length === 0) ||
      (marketCommunity.loading && marketCommunity.skills.length === 0) ||
      (marketOther.loading && marketOther.skills.length === 0);
  const aggregateError = isSearching
    ? searchMarket.error
    : (marketOfficialFeatured.error ?? marketCommunity.error ?? marketOther.error ?? null);
  const isAllEmpty = isSearching && searchResults.length === 0;
  return (
    <div className="flex flex-1 flex-col gap-12">
      {aggregateLoading && (
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-muted-foreground">{t("skills.market.loading")}</p>
        </div>
      )}
      {aggregateError && (
        <PageStateBoundary
          error={true}
          errorOptions={{
            title: t("skills.market.error"),
            description: aggregateError,
            retry: onRetry,
          }}
        />
      )}
      {!aggregateLoading && !aggregateError && isAllEmpty && (
        <PageStateBoundary
          empty={true}
          emptyOptions={{
            title: t("skills.market.noMatch"),
          }}
        />
      )}
      {isSearching && !aggregateLoading && !aggregateError && searchResults.length > 0 && (
        <section className="space-y-3">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {searchResults.map((marketSkill) => {
              const installedSkill = marketSkill.installed
                ? installedSkills.find((s) => s.name === marketSkill.name)
                : void 0;
              const skill = installedSkill
                ? // Carry MarketSkillInfo.installed=true forward — SkillInfo
                  // alone has no `installed` field, so the spread would drop
                  // the marker and downstream cards mis-render as "uninstalled".
                  {
                    ...installedSkill,
                    downloads: marketSkill.downloads,
                    installed: true,
                  }
                : marketSkill;
              return (
                <OtherSkillItem
                  key={skill.name}
                  skill={skill}
                  installing={searchMarket.installingSet.has(marketSkill.name)}
                  onInstall={onInstall}
                  onToggle={onToggle}
                  onDetail={onDetail}
                  onTryItOut={onTryItOut}
                />
              );
            })}
          </div>
          {searchMarket.hasMore && (
            <div className="flex justify-center pt-4">
              <button
                type="button"
                data-action-ui-id="market-skill-load-more"
                disabled={searchMarket.loading}
                className="inline-flex items-center gap-2 h-8 rounded-md px-4 text-xs font-medium text-foreground border border-foreground/15 bg-transparent hover:bg-muted hover:border-foreground/25 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                onClick={searchMarket.loadMore}
              >
                {searchMarket.loading ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    {t("common.loading")}
                  </>
                ) : (
                  t("skills.market.loadMore")
                )}
              </button>
            </div>
          )}
        </section>
      )}
      {!isSearching && !aggregateLoading && !aggregateError && (
        <>
          <div className="pt-4" data-layout-slot="skills-official-featured-offset">
            <FeaturedSkillSection
              dataActionUiId="market-official-featured"
              title={t("skills.market.officialFeatured", "官方精选")}
              emptyText={t("skills.market.officialFeaturedEmpty", "暂无此类型的 Skill")}
              skills={officialFeatured}
              installingSet={marketOfficialFeatured.installingSet}
              onToggle={onToggle}
              onInstall={onInstall}
              onTryItOut={onTryItOut}
              onDetail={onDetail}
            />
          </div>
          <FeaturedSkillSection
            dataActionUiId="market-community-featured"
            title={t("skills.market.communityFeatured", "用户精选")}
            emptyText={t("skills.market.communityFeaturedEmpty", "暂无此类型的 Skill")}
            skills={community}
            installingSet={marketCommunity.installingSet}
            onToggle={onToggle}
            onInstall={onInstall}
            onTryItOut={onTryItOut}
            onDetail={onDetail}
            footerCard={
              activeTag ? void 0 : <CreatorPlanInviteCard onOpen={() => onOpenCreatorPlan?.()} />
            }
            titleAccessory={
              // ⓘ next to the title is the single entry into the creator-plan
              // popover (which itself contains the "Request to Review" CTA).
              // No separate top-right button — design mock keeps the rail
              // header lean. Hover-triggered popover lives in its own small
              // component (CreatorPlanHoverPopover) so we get controlled
              // open/close + grace period without polluting CommunityTabContent.
              <CreatorPlanHoverPopover onOpenCreatorPlan={onOpenCreatorPlan} />
            }
          />
        </>
      )}
      {!isSearching && activeTag !== FEATURED_TAG && !aggregateLoading && !aggregateError && (
        <section className="space-y-3">
          <header className="flex items-center justify-between gap-3">
            <div className="flex items-baseline gap-2 text-base font-heading font-medium text-foreground">
              {t("skills.market.otherSkills", "其他 Skill")}
              <span className="text-xs font-normal text-muted-foreground">
                {"· "}
                {other.length}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <label
                data-action-ui-id="market-other-hide-installed"
                className="hilo-checkbox-label inline-flex cursor-pointer select-none items-center text-xs text-muted-foreground"
              >
                <Checkbox
                  checked={hideInstalled}
                  onCheckedChange={(checked) => onHideInstalledChange?.(!!checked)}
                  size="sm"
                />
                {t("skills.filter.hideInstalled", "仅显示未安装")}
              </label>
              <Select value={sortBy ?? "recent"} onValueChange={(v) => onSortChange?.(v)}>
                <SelectTrigger
                  size="sm"
                  className="h-8 min-w-24 border-border bg-transparent text-xs"
                  data-action-ui-id="market-other-sort"
                >
                  <SelectValue>
                    {() => (
                      <span className="text-muted-foreground">
                        {t("skills.sort.label", "排序")}:{" "}
                        <span className="text-foreground">
                          {sortBy === "hot"
                            ? t("skills.sort.hot", "热门")
                            : t("skills.sort.recent", "最近")}
                        </span>
                      </span>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hot">{t("skills.sort.hot", "热门")}</SelectItem>
                  <SelectItem value="recent">{t("skills.sort.recent", "最近")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </header>
          {other.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {other.map((marketSkill) => {
                const installedSkill = marketSkill.installed
                  ? installedSkills.find((s) => s.name === marketSkill.name)
                  : void 0;
                const skill = installedSkill
                  ? // Carry MarketSkillInfo.installed=true forward — SkillInfo
                    // alone has no `installed` field, so the spread would drop
                    // the marker and downstream cards mis-render as "uninstalled".
                    {
                      ...installedSkill,
                      downloads: marketSkill.downloads,
                      installed: true,
                    }
                  : marketSkill;
                return (
                  <OtherSkillItem
                    key={skill.name}
                    skill={skill}
                    installing={marketOther.installingSet.has(marketSkill.name)}
                    onInstall={onInstall}
                    onToggle={onToggle}
                    onDetail={onDetail}
                    onTryItOut={onTryItOut}
                  />
                );
              })}
            </div>
          ) : (
            <PageStateBoundary
              empty={true}
              density="panel"
              className="min-h-40"
              emptyOptions={{
                text: t("skills.market.otherEmpty", "暂无符合筛选条件的 Skill"),
              }}
            />
          )}
          {marketOther.hasMore && (
            <div className="flex justify-center pt-4">
              <button
                type="button"
                data-action-ui-id="market-skill-load-more"
                disabled={marketOther.loading}
                className="inline-flex items-center gap-2 h-8 rounded-md px-4 text-xs font-medium text-foreground border border-foreground/15 bg-transparent hover:bg-muted hover:border-foreground/25 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                onClick={marketOther.loadMore}
              >
                {marketOther.loading ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    {t("common.loading")}
                  </>
                ) : (
                  t("skills.market.loadMore")
                )}
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
