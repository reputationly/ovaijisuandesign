// 插件市场的数据 hook：分页、筛选、搜索。
import { reactExports, API_PATHS } from "../../vendor.js";
import { gatewayFetch } from "../../infra/gateway-fetch.js";
import { pluginEvents } from "../../canvas/resolve-workspace-failure-diagnosis.js";
import { trackPluginInstall, trackPluginInstallFailed, trackPluginUninstall, trackPluginUninstallFailed } from "../../assets/use-plugin-editor-output-selection.js";
const DEFAULT_PAGE_SIZE = 20;
const SKILL_TYPE = "plugin";
export function usePluginMarket(entrySource) {
  const [plugins, setPlugins] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(false);
  const [error, setError] = reactExports.useState(null);
  const [hasMore, setHasMore] = reactExports.useState(false);
  const [installingSet, setInstallingSet] = reactExports.useState(new Set());
  const [uninstallingSet, setUninstallingSet] = reactExports.useState(new Set());
  const pageRef = reactExports.useRef(1);
  const queryRef = reactExports.useRef("");
  const fetchingRef = reactExports.useRef(false);
  const pluginsRef = reactExports.useRef([]);
  reactExports.useEffect(() => {
    pluginsRef.current = plugins;
  }, [plugins]);
  const fetchPage = reactExports.useCallback(async (query, page, reset) => {
    if (!reset && fetchingRef.current) return;
    fetchingRef.current = true;
    if (reset) setError(null);
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(DEFAULT_PAGE_SIZE),
        skill_type: SKILL_TYPE,
      });
      let path;
      if (query) {
        params.set("query", query);
        path = `${API_PATHS.marketSearch}?${params}`;
      } else {
        path = `${API_PATHS.marketSkills}?${params}`;
      }
      const res = await gatewayFetch(path);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw = await res.json();
      const newPlugins = raw.plugins ?? [];
      pageRef.current = page;
      queryRef.current = query;
      setPlugins((prev) => {
        const next = reset ? newPlugins : [...prev, ...newPlugins];
        setHasMore(next.length < raw.total);
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      fetchingRef.current = false;
      setLoading(false);
    }
  }, []);
  const fetchList = reactExports.useCallback(async () => {
    queryRef.current = "";
    await fetchPage("", 1, true);
  }, [fetchPage]);
  const search = reactExports.useCallback(
    async (query) => {
      await fetchPage(query, 1, true);
    },
    [fetchPage],
  );
  const loadMore = reactExports.useCallback(async () => {
    if (!hasMore) return;
    const nextPage = pageRef.current + 1;
    await fetchPage(queryRef.current, nextPage, false);
  }, [hasMore, fetchPage]);
  const install = reactExports.useCallback(
    async (id, trigger = "market_card") => {
      setInstallingSet((prev) => new Set(prev).add(id));
      const startedAt = Date.now();
      const target = pluginsRef.current.find((p) => p.id === id);
      const trackBase = {
        plugin_id: id,
        plugin_version: target?.version ?? "unknown",
        plugin_source: "market",
        surface: trigger === "market_detail" ? "plugin_market_detail" : "plugin_market_list",
        entry_source: entrySource,
      };
      const isUpdate = target?.installed === true;
      const previousVersion = isUpdate ? target?.installedVersion : void 0;
      try {
        const res = await gatewayFetch(API_PATHS.marketInstall, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: id,
            skillType: SKILL_TYPE,
          }),
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || "Install failed");
        setPlugins((prev) =>
          prev.map((p) =>
            p.id === id
              ? {
                  ...p,
                  installed: true,
                  installedVersion: p.version,
                }
              : p,
          ),
        );
        trackPluginInstall({
          ...trackBase,
          trigger,
          is_update: isUpdate,
          ...(previousVersion
            ? {
                previous_version: previousVersion,
              }
            : {}),
          duration_ms: Date.now() - startedAt,
        });
        pluginEvents.firePluginsChanged(id, "installed");
        return true;
      } catch (err) {
        trackPluginInstallFailed(
          {
            ...trackBase,
            trigger,
            is_update: isUpdate,
            ...(previousVersion
              ? {
                  previous_version: previousVersion,
                }
              : {}),
            duration_ms: Date.now() - startedAt,
          },
          err,
        );
        return false;
      } finally {
        setInstallingSet((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [entrySource],
  );
  const uninstall = reactExports.useCallback(
    async (id, trigger = "market_card") => {
      setUninstallingSet((prev) => new Set(prev).add(id));
      const startedAt = Date.now();
      const target = pluginsRef.current.find((p) => p.id === id);
      const trackBase = {
        plugin_id: id,
        plugin_version: target?.version ?? "unknown",
        plugin_source: "market",
        surface: trigger === "market_detail" ? "plugin_market_detail" : "plugin_market_list",
        entry_source: entrySource,
      };
      try {
        const res = await gatewayFetch(API_PATHS.marketUninstall, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: id,
            skillType: SKILL_TYPE,
          }),
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || "Uninstall failed");
        setPlugins((prev) =>
          prev.map((p) =>
            p.id === id
              ? {
                  ...p,
                  installed: false,
                }
              : p,
          ),
        );
        trackPluginUninstall({
          ...trackBase,
          trigger,
          duration_ms: Date.now() - startedAt,
        });
        pluginEvents.firePluginsChanged(id, "uninstalled");
        return true;
      } catch (err) {
        trackPluginUninstallFailed(
          {
            ...trackBase,
            trigger,
            duration_ms: Date.now() - startedAt,
          },
          err,
        );
        return false;
      } finally {
        setUninstallingSet((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [entrySource],
  );
  return {
    plugins,
    loading,
    error,
    hasMore,
    fetchList,
    search,
    loadMore,
    install,
    uninstall,
    installingSet,
    uninstallingSet,
  };
}
