// 插件市场标签页内容。
import { useTranslation, reactExports, jsxRuntimeExports, Loader2 } from "../../vendor.js";
import { PageStateBoundary } from "../../assets/page-state-boundary.jsx";
import { __jsx } from "../../shared/jsx-runtime.js";
import { PluginMarketCard } from "./plugin-market-card.jsx";
import { PluginMarketListItem } from "./plugin-market-detail.jsx";
export function PluginMarketTabContent({
  pluginMarket,
  searchQuery,
  installedSkills,
  entrySource,
  onInstall,
  onUninstall,
  onDetail,
  onDetailList,
  viewMode,
}) {
  const { t } = useTranslation();
  const filteredPlugins = pluginMarket.plugins;
  const installedById = reactExports.useMemo(() => {
    const map = new Map();
    for (const s of installedSkills) {
      if (s.skillType === "plugin") {
        map.set(s.name, s);
      }
    }
    return map;
  }, [installedSkills]);
  return (
    <div className="flex flex-1 flex-col gap-12">
      {pluginMarket.loading && pluginMarket.plugins.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-muted-foreground">{t("skills.market.loading")}</p>
        </div>
      )}
      {pluginMarket.error && (
        <PageStateBoundary
          error={true}
          errorOptions={{
            title: t("skills.market.error"),
            description: pluginMarket.error,
            retry: pluginMarket.fetchList,
          }}
        />
      )}
      {!pluginMarket.loading && !pluginMarket.error && filteredPlugins.length === 0 && (
        <PageStateBoundary
          empty={true}
          emptyOptions={{
            title: searchQuery ? t("skills.market.noMatch") : t("skills.market.empty"),
          }}
        />
      )}
      {filteredPlugins.length > 0 && (
        <>
          {viewMode === "grid" ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredPlugins.map((plugin, position) => {
                const installedSkill = installedById.get(plugin.id);
                return (
                  <PluginMarketCard
                    key={plugin.id}
                    plugin={plugin}
                    installedSkill={installedSkill}
                    entrySource={entrySource}
                    position={position}
                    installing={pluginMarket.installingSet.has(plugin.id)}
                    onInstall={onInstall}
                    onUninstall={onUninstall}
                    onDetail={onDetail}
                  />
                );
              })}
            </div>
          ) : (
            <div className="border border-border rounded-lg bg-card divide-y divide-border">
              {filteredPlugins.map((plugin) => {
                const installedSkill = installedById.get(plugin.id);
                return (
                  <PluginMarketListItem
                    key={plugin.id}
                    plugin={plugin}
                    installedSkill={installedSkill}
                    installing={pluginMarket.installingSet.has(plugin.id)}
                    onInstall={onInstall}
                    onDetail={onDetailList}
                    onUninstall={onUninstall}
                  />
                );
              })}
            </div>
          )}
          {pluginMarket.hasMore && (
            <div className="flex justify-center pt-4">
              <button
                type="button"
                data-action-ui-id="plugin-market-load-more"
                disabled={pluginMarket.loading}
                className="inline-flex items-center gap-2 px-6 py-2 text-sm font-medium text-foreground/70 border border-border rounded-lg hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={pluginMarket.loadMore}
              >
                {pluginMarket.loading ? (
                  <>
                    <Loader2 size={14} strokeWidth={1.5} className="animate-spin" />
                    {t("common.loading")}
                  </>
                ) : (
                  t("skills.market.loadMore")
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
