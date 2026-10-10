// 技能页路由入口：标签页切换、搜索与各视图的组装。
import { useTranslation, reactExports, jsxRuntimeExports, Plus, getRuntimeConfig, API_PATHS, usePlatform, useStorage, useSearch, Link2, TAB_CONTENT_ENTER_CLASS_NAME, Import, ExternalLink } from "../vendor.js";
import { dedupedToast } from "../infra/agent-http-client.js";
import { homeService } from "../workspace/home-service.jsx";
import { AlertDialog, Button, Dialog, DialogContent, TooltipContent } from "../infra/dialog-content.jsx";
import { AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction, Badge, DialogTitle, DialogDescription } from "../infra/badge-variants.jsx";
import { PageStateBoundary } from "../assets/page-state-boundary.jsx";
import { gatewayFetch } from "../infra/gateway-fetch.js";
import { useSkillCategories } from "../generation/use-skill-categories.js";
import { Upload, Settings2 } from "../media-editing/package.jsx";
import { Tabs, TabsList, TabsTrigger } from "../workspace/shortcut-hint.jsx";
import { pluginEvents } from "../canvas/resolve-workspace-failure-diagnosis.js";
import { pickLocalized } from "../generation/normalize-skill-detail-metadata.js";
import { Tooltip, TooltipTrigger, getSkillShareUrl } from "../vendor-inline/vscode-base/graph.jsx";
import { showSkillInstallSuccessToast, trackSkillMarketOpen, trackSkillDetailView, trackSkillFilter, trackSkillTabSwitch, trackSkillToggle, trackSkillSearch, trackSkillUninstall, trackSkillUninstallFailed, trackSkillExport, trackSkillCreatorInvoke, trackSkillTry } from "../workspace/use-new-workspace-dialog.jsx";
import { beginSkillApplyingToast } from "../generation/settle-operation.js";
import { useIsScrolling, useAuth } from "../assets/credit-query-keys.jsx";
import { useSidebarBadges } from "../infra/split-pinned-inventory.js";
import { useMarketSkills } from "../workspace/use-market-skills.js";
import { FEATURED_MARKET_PAGE_SIZE, OTHER_MARKET_PAGE_SIZE, FEATURED_TAG } from "../generation/use-mention-models.jsx";
import { mapSkillSource } from "../workspace/tool-label-definitions.js";
import { SkillIcon } from "../workspace/use-prompt-icon.jsx";
import { SkillFilterBar } from "../workspace/skill-filter-bar.jsx";
import { PageSearchInput } from "../shared/page-search-input.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { AutoUpdateBannerPresence, useAutoUpdateBanner } from "./auto-update-banner.jsx";
import { CommunityTabContent } from "./community-tab.jsx";
import { ConnectorHeaderContent, ConnectorsTab } from "./connectors/connectors-tab.jsx";
import { offlineCreatorPlanSubmission, useCreatorPlanSubmissions } from "./creator-plan/data.js";
import { CreatorPlanDialog } from "./creator-plan/dialog.jsx";
import { useSkillFilters, useSkillUpdates, useSyncStatus, useTrySkill } from "./hooks.js";
import { filterMySkills } from "./my-skills/helpers.js";
import { MySkillsView } from "./my-skills/my-skills-view.jsx";
import { OperationsView } from "./operations/operations-view.jsx";
import { useOperator } from "./operations/operator.js";
import { SyncBanner, TabInfoPopover } from "./page-parts.jsx";
import { PluginMarketDetailDialog } from "./plugins/plugin-market-detail.jsx";
import { PluginMarketTabContent } from "./plugins/plugin-market-tab.jsx";
import { usePluginMarket } from "./plugins/use-plugin-market.js";
import { SkillDetailDialog } from "./skill-detail/dialog.jsx";
import { SkillImportDialog } from "./skill-import-dialog.jsx";
const SEARCH_DEBOUNCE_MS = 300;
function SkillsPage() {
  const { t } = useTranslation();
  const {
    capability: requestedCapability,
    tab: initialTab,
    pluginId: initialPluginId,
    skillName: initialSkillName,
    connectorId: _initialConnectorId,
  } = useSearch({
    strict: false,
  });
  const scrollRef = reactExports.useRef(null);
  const isScrolling = useIsScrolling({
    scrollRef,
  });
  const [capabilityTab, setCapabilityTab] = reactExports.useState(
    requestedCapability === "connectors" ? "connectors" : "skills",
  );
  const { markSidebarBadgeVisited } = useSidebarBadges();
  const [connectorSearchQuery, setConnectorSearchQuery] = reactExports.useState("");
  const [connectorSortMode, setConnectorSortMode] = reactExports.useState("default");
  const [customConnectorOpen, setCustomConnectorOpen] = reactExports.useState(false);
  const translationRef = reactExports.useRef(t);
  reactExports.useEffect(() => {
    translationRef.current = t;
  }, [t]);
  const { shell } = usePlatform();
  const [config, setConfig] = useStorage("global.config");
  const skillAutoUpdate = config.skillAutoUpdate ?? true;
  reactExports.useEffect(() => {
    if (requestedCapability === "skills" || requestedCapability === "connectors") {
      setCapabilityTab(requestedCapability);
    }
  }, [requestedCapability]);
  reactExports.useEffect(() => {
    if (capabilityTab === "connectors") markSidebarBadgeVisited("connectors");
  }, [capabilityTab, markSidebarBadgeVisited]);
  const marketOpenReportedRef = reactExports.useRef(false);
  reactExports.useEffect(() => {
    if (marketOpenReportedRef.current) return;
    marketOpenReportedRef.current = true;
    trackSkillMarketOpen("global_sidebar");
  }, []);
  const [previewMode, setPreviewMode] = reactExports.useState(false);
  const deepLinkProcessedRef = reactExports.useRef(false);
  const openedPluginDeepLinksRef = reactExports.useRef(new Set());
  const requestedSkillDeepLinksRef = reactExports.useRef(new Set());
  const openedSkillDeepLinksRef = reactExports.useRef(new Set());
  const [marketUnlocked] = reactExports.useState(true);
  const [skills, setSkills] = reactExports.useState([]);
  const [installedSearchQuery, setInstalledSearchQuery] = reactExports.useState("");
  const [mineCategoryFilter, setMineCategoryFilter] = reactExports.useState(null);
  const [mineSourceFilter, setMineSourceFilter] = reactExports.useState("all");
  const { user } = useAuth();
  const [creatorPlanOpen, setCreatorPlanOpen] = reactExports.useState(false);
  const [creatorPlanDefaultSource, setCreatorPlanDefaultSource] = reactExports.useState("upload");
  const [creatorPlanMode, setCreatorPlanMode] = reactExports.useState("review");
  const {
    submissions: creatorPlanSubmissions,
    state: submissionState,
    refresh: fetchCreatorPlanSubmissions,
    refreshCovers,
  } = useCreatorPlanSubmissions(user?.userID);
  const [creatorPlanDefaultSkill, setCreatorPlanDefaultSkill] = reactExports.useState("");
  const openCreatorPlan = reactExports.useCallback((skillName, source, mode = "review") => {
    setCreatorPlanMode(mode);
    setCreatorPlanDefaultSkill(skillName ?? "");
    setCreatorPlanDefaultSource(source ?? (skillName ? "design" : "upload"));
    setCreatorPlanOpen(true);
  }, []);
  const localCreatedSkills = reactExports.useMemo(
    () => skills.filter((s) => s.source === "user"),
    [skills],
  );
  const [loading, setLoading] = reactExports.useState(true);
  const [error, setError] = reactExports.useState(null);
  const [importOpen, setImportOpen] = reactExports.useState(false);
  const [detailSkill, setDetailSkill] = reactExports.useState(null);
  const [activeTab, setActiveTab] = reactExports.useState(
    initialTab === "mine" ? "mine" : "community",
  );
  const [needsRefresh, setNeedsRefresh] = reactExports.useState(false);
  const [shareUrl, setShareUrl] = reactExports.useState(null);
  const {
    activeTag,
    setActiveTag,
    forceSetActiveTag,
    viewMode,
    setViewMode,
    sortBy,
    setSortBy,
    hideInstalled,
    setHideInstalled,
  } = useSkillFilters(activeTab);
  const skillsRef = reactExports.useRef([]);
  reactExports.useEffect(() => {
    skillsRef.current = skills;
  }, [skills]);
  const openDetail = reactExports.useCallback(
    (skill, trigger) => {
      const isInstalledLocally =
        "enabled" in skill || ("installed" in skill && skill.installed === true);
      trackSkillDetailView({
        skill_name: skill.name,
        tab: activeTab,
        is_installed: isInstalledLocally,
        trigger,
      });
      setDetailSkill(skill);
    },
    [activeTab],
  );
  const openDetailFromCard = reactExports.useCallback(
    (skill) => openDetail(skill, "card"),
    [openDetail],
  );
  const openDetailFromList = reactExports.useCallback(
    (skill) => openDetail(skill, "list"),
    [openDetail],
  );
  const handleAutoUpdateToggle = reactExports.useCallback(
    (checked) => {
      setConfig({
        skillAutoUpdate: checked,
      });
      gatewayFetch("/api/skills/market/preference", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          autoUpdate: checked,
        }),
      }).catch((err) => {
        console.error("[SkillsPage] Failed to push autoUpdate preference:", err);
      });
    },
    [setConfig],
  );
  const handleTagChange = reactExports.useCallback(
    (tag) => {
      const next = activeTag === tag ? null : tag;
      if (next !== activeTag) {
        trackSkillFilter({
          tab: activeTab,
          tag: next,
        });
      }
      setActiveTag(tag);
    },
    [activeTag, setActiveTag, activeTab],
  );
  const market = useMarketSkills();
  const marketCategoryTag = activeTag && activeTag !== FEATURED_TAG ? activeTag : void 0;
  const marketOfficialFeatured = useMarketSkills(
    void 0,
    "official-featured",
    FEATURED_MARKET_PAGE_SIZE,
    marketCategoryTag,
  );
  const marketCommunity = useMarketSkills(
    void 0,
    "community",
    FEATURED_MARKET_PAGE_SIZE,
    marketCategoryTag,
  );
  const marketOther = useMarketSkills(
    void 0,
    "official",
    OTHER_MARKET_PAGE_SIZE,
    marketCategoryTag,
  );
  const previousMarketCategoryTagRef = reactExports.useRef(marketCategoryTag);
  const pluginEntrySource = "nav_bar";
  const pluginMarket = usePluginMarket(pluginEntrySource);
  const [searchQuery, setSearchQuery] = reactExports.useState("");
  const debounceTimerRef = reactExports.useRef(void 0);
  const [uninstallTarget, setUninstallTarget] = reactExports.useState(null);
  reactExports.useEffect(() => {
    if (!initialSkillName || openedSkillDeepLinksRef.current.has(initialSkillName)) return;
    const target = market.skills.find((skill) => skill.name === initialSkillName);
    if (target) {
      openedSkillDeepLinksRef.current.add(initialSkillName);
      setActiveTab("community");
      openDetail(target);
      return;
    }
    if (requestedSkillDeepLinksRef.current.has(initialSkillName)) return;
    requestedSkillDeepLinksRef.current.add(initialSkillName);
    setActiveTab("community");
    void market.search(initialSkillName);
  }, [initialSkillName, market.search, market.skills, openDetail]);
  const communityInitRef = reactExports.useRef(false);
  const pluginsInitRef = reactExports.useRef(false);
  const {
    pending: autoUpdatePending,
    restarting: autoUpdateRestarting,
    restartNow,
    dismiss: dismissAutoUpdate,
  } = useAutoUpdateBanner();
  const visibleAutoUpdatePending =
    autoUpdatePending ??
    (autoUpdateRestarting
      ? {
          updatedCount: 0,
          updatedSkills: [],
          timestamp: 0,
        }
      : null);
  const { status: syncStatus, showComplete: showSyncComplete } = useSyncStatus(marketUnlocked);
  const { isOperator, role: operatorRole } = useOperator();
  const [operationsMode, setOperationsMode] = reactExports.useState(false);
  const {
    updates: skillUpdates,
    refresh: refreshUpdates,
    clearUpdate,
  } = useSkillUpdates(marketUnlocked);
  const [updatingSet, setUpdatingSet] = reactExports.useState(new Set());
  const fetchSeqRef = reactExports.useRef(0);
  const hasLoadedSkillsRef = reactExports.useRef(false);
  const fetchSkillsRef = reactExports.useRef(async () => null);
  const reportRefreshError = reactExports.useCallback((err) => {
    console.warn("[SkillsPage] Installed tools refresh failed:", err);
    dedupedToast.error(translationRef.current("skills.refreshError"), {
      action: {
        label: translationRef.current("common.retry"),
        onClick: () => {
          void fetchSkillsRef.current();
        },
      },
    });
  }, []);
  const fetchSkills = reactExports.useCallback(async () => {
    const seq = ++fetchSeqRef.current;
    if (!hasLoadedSkillsRef.current) setLoading(true);
    setError(null);
    try {
      let pluginsFetchFailed = false;
      let pluginsFetchError;
      const [skillsRes, pluginsRes] = await Promise.all([
        gatewayFetch("/api/skills"),
        gatewayFetch("/api/plugins").catch((err) => {
          pluginsFetchFailed = true;
          pluginsFetchError = err;
          return null;
        }),
      ]);
      const skillsData = await skillsRes.json();
      if (seq !== fetchSeqRef.current) return null;
      let merged = skillsData;
      let installedPluginsList = null;
      if (pluginsRes?.ok) {
        try {
          const pluginsData = await pluginsRes.json();
          installedPluginsList = pluginsData.plugins ?? [];
          const pluginSkills = installedPluginsList.map((p) => ({
            name: p.id,
            displayNameZh: pickLocalized(p.name, "zh-CN"),
            summary: pickLocalized(p.description, "en-US"),
            summaryZh: pickLocalized(p.description, "zh-CN"),
            description: pickLocalized(p.description, "en-US"),
            enabled: true,
            // SkillInfo has no 'bundled' tier — app-shipped plugins surface
            // as 'installed' here (they behave like pre-installed market
            // plugins on this management page).
            source: p.source === "user" ? "user" : "installed",
            tools: [],
            tags: pickLocalized(p.tags, "en-US", []),
            tagsCn: pickLocalized(p.tags, "zh-CN", []),
            creator: "",
            triggerWords: [],
            guidePrompt: "",
            guidePromptEn: "",
            skillType: "plugin",
            version: p.version,
          }));
          merged = [...skillsData, ...pluginSkills];
        } catch (err) {
          pluginsFetchFailed = true;
          pluginsFetchError = err;
        }
      } else if (pluginsRes) {
        pluginsFetchFailed = true;
        pluginsFetchError = new Error(`Plugins request failed with status ${pluginsRes.status}`);
      }
      if (pluginsFetchFailed) {
        const refreshedNames = new Set(skillsData.map((skill) => skill.name));
        const preservedPlugins = skillsRef.current.filter(
          (skill) => skill.skillType === "plugin" && !refreshedNames.has(skill.name),
        );
        merged = [...skillsData, ...preservedPlugins];
      }
      if (seq !== fetchSeqRef.current) return null;
      setSkills(merged);
      hasLoadedSkillsRef.current = true;
      if (pluginsFetchFailed) reportRefreshError(pluginsFetchError);
      return merged;
    } catch (err) {
      if (seq !== fetchSeqRef.current) return null;
      if (hasLoadedSkillsRef.current) {
        reportRefreshError(err);
      } else {
        setError(err instanceof Error ? err.message : String(err));
      }
      return null;
    } finally {
      if (seq === fetchSeqRef.current) setLoading(false);
    }
  }, [reportRefreshError]);
  reactExports.useEffect(() => {
    fetchSkillsRef.current = fetchSkills;
  }, [fetchSkills]);
  reactExports.useEffect(() => {
    fetchSkills();
  }, [fetchSkills]);
  reactExports.useEffect(() => {
    const d = pluginEvents.onPluginsChanged(() => {
      fetchSkills();
    });
    return () => d.dispose();
  }, [fetchSkills]);
  reactExports.useEffect(() => {
    if (!window.hilo?.skills) return;
    return window.hilo.skills.onPermissionsChanged(() => {
      fetchSkills();
    });
  }, [fetchSkills]);
  reactExports.useEffect(() => {
    if (loading || deepLinkProcessedRef.current) return;
    const deepLinkSkill = sessionStorage.getItem("deepLinkSkill");
    if (!deepLinkSkill) return;
    const target = skills.find((s) => s.name === deepLinkSkill);
    if (target) {
      deepLinkProcessedRef.current = true;
      sessionStorage.removeItem("deepLinkSkill");
      setDetailSkill(target);
      setPreviewMode(true);
    }
  }, [skills, loading]);
  const fetchCommunitySections = reactExports.useCallback(() => {
    marketOfficialFeatured.fetchList();
    marketCommunity.fetchList();
    marketOther.fetchList();
  }, [marketOfficialFeatured.fetchList, marketCommunity.fetchList, marketOther.fetchList]);
  const handleTabSwitch = reactExports.useCallback(
    (tab) => {
      if (tab !== activeTab) {
        trackSkillTabSwitch({
          from: activeTab,
          to: tab,
        });
      }
      setActiveTab(tab);
      if (tab === "mine" && needsRefresh) {
        setNeedsRefresh(false);
        fetchSkills();
      }
      if (tab === "mine") {
        void fetchCreatorPlanSubmissions();
      }
      if (tab === "community") {
        fetchCommunitySections();
      }
      if (tab === "plugins") {
        pluginMarket.fetchList();
      }
    },
    [
      activeTab,
      needsRefresh,
      fetchSkills,
      fetchCreatorPlanSubmissions,
      fetchCommunitySections,
      pluginMarket.fetchList,
    ],
  );
  reactExports.useEffect(() => {
    if (activeTab === "community" && !communityInitRef.current) {
      communityInitRef.current = true;
      fetchCommunitySections();
    }
    if (activeTab === "plugins" && !pluginsInitRef.current) {
      pluginsInitRef.current = true;
      if (initialPluginId) {
        pluginMarket.search(initialPluginId);
      } else {
        pluginMarket.fetchList();
      }
    }
  }, [
    activeTab,
    fetchCommunitySections,
    initialPluginId,
    pluginMarket.fetchList,
    pluginMarket.search,
  ]);
  reactExports.useEffect(() => {
    if (previousMarketCategoryTagRef.current === marketCategoryTag) return;
    previousMarketCategoryTagRef.current = marketCategoryTag;
    if (activeTab === "community") {
      fetchCommunitySections();
    }
  }, [activeTab, fetchCommunitySections, marketCategoryTag]);
  const { categories: skillCategories } = useSkillCategories(
    capabilityTab === "skills" && activeTab !== "plugins",
  );
  const creatorPlanSubmissionMap = reactExports.useMemo(
    () => new Map(creatorPlanSubmissions.map((submission) => [submission.skillName, submission])),
    [creatorPlanSubmissions],
  );
  const filteredMineSkills = reactExports.useMemo(
    // Match stable codes while keeping older installed package tags usable.
    () =>
      filterMySkills(
        skills,
        {
          query: installedSearchQuery,
          category: mineCategoryFilter,
          source: mineSourceFilter,
        },
        creatorPlanSubmissionMap,
        skillCategories,
      ),
    [
      skills,
      installedSearchQuery,
      mineCategoryFilter,
      mineSourceFilter,
      creatorPlanSubmissionMap,
      skillCategories,
    ],
  );
  const mySkillsCount = skills.filter(
    (skill) =>
      skill.skillType !== "plugin" && (skill.source === "user" || skill.source === "installed"),
  ).length;
  const handleToggle = reactExports.useCallback(
    async (name, enabled) => {
      const applyingToast = beginSkillApplyingToast(t("skills.applying"));
      try {
        await homeService.hiloApp.toggleSkill(name, enabled);
        try {
          await window.hilo.opencode.restart();
        } catch {}
        setSkills((prev) =>
          prev.map((s) =>
            s.name === name
              ? {
                  ...s,
                  enabled,
                }
              : s,
          ),
        );
        setDetailSkill((prev) =>
          prev && prev.name === name && "enabled" in prev
            ? {
                ...prev,
                enabled,
              }
            : prev,
        );
        trackSkillToggle(
          name,
          enabled,
          mapSkillSource(skillsRef.current.find((s) => s.name === name)?.source),
        );
        applyingToast.success(t("skills.restartSuccess"));
      } catch {
        applyingToast.error(t("skills.toggleError"));
      }
    },
    [t],
  );
  const handleOfflineCreatedSkill = reactExports.useCallback(
    async (name) => {
      try {
        await offlineCreatorPlanSubmission(name);
        const skill = skillsRef.current.find((item) => item.name === name);
        if (skill?.enabled) await handleToggle(name, false);
        await fetchCreatorPlanSubmissions({
          force: true,
        });
        dedupedToast.success(t("skills.mine.offlineSuccess", "Skill 已下线"));
      } catch (error2) {
        dedupedToast.error(
          `${t("skills.mine.offlineError", "下线失败")}: ${error2 instanceof Error ? error2.message : String(error2)}`,
        );
      }
    },
    [fetchCreatorPlanSubmissions, handleToggle, t],
  );
  const handleUpdate = reactExports.useCallback(
    async (name) => {
      setUpdatingSet((prev) => new Set(prev).add(name));
      const ok = await market.install(name, "market_card");
      setUpdatingSet((prev) => {
        const next = new Set(prev);
        next.delete(name);
        return next;
      });
      if (ok) {
        showSkillInstallSuccessToast(name, {
          isUpdate: true,
        });
        clearUpdate(name);
        fetchSkills();
        refreshUpdates();
        try {
          await window.hilo.opencode.restart();
        } catch {}
      } else {
        dedupedToast.error(
          t("skills.market.updateError", {
            name,
          }),
        );
      }
    },
    [market.install, t, fetchSkills, refreshUpdates, clearUpdate],
  );
  const handleSearchChange = reactExports.useCallback(
    (value) => {
      setSearchQuery(value);
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        const trimmed = value.trim();
        if (trimmed) {
          trackSkillSearch({
            tab: activeTab,
            query_length: trimmed.length,
          });
          if (activeTab === "plugins") {
            pluginMarket.search(trimmed);
          } else {
            market.search(trimmed);
          }
        } else if (activeTab === "plugins") {
          pluginMarket.fetchList();
        } else {
          fetchCommunitySections();
        }
      }, SEARCH_DEBOUNCE_MS);
    },
    [activeTab, market.search, pluginMarket.search, pluginMarket.fetchList, fetchCommunitySections],
  );
  reactExports.useEffect(() => {
    return () => clearTimeout(debounceTimerRef.current);
  }, []);
  const findCommunityHostHook = reactExports.useCallback(
    (name) => {
      for (const h of [market, marketOfficialFeatured, marketCommunity, marketOther]) {
        if (h.skills.some((s) => s.name === name)) return h;
      }
      return null;
    },
    [market, marketOfficialFeatured, marketCommunity, marketOther],
  );
  const handleInstall = reactExports.useCallback(
    async (name, via) => {
      let isUpdate;
      let ok;
      if (activeTab === "plugins") {
        isUpdate = pluginMarket.plugins.some((p) => p.id === name && p.installed);
        ok = await pluginMarket.install(name, via);
      } else {
        const host = findCommunityHostHook(name);
        if (host) {
          isUpdate = host.skills.some((s) => s.name === name && s.installed);
          ok = await host.install(name, via);
        } else {
          isUpdate = false;
          ok = await market.install(name, via);
        }
      }
      if (ok) {
        showSkillInstallSuccessToast(name, {
          isUpdate,
        });
        const latest = await fetchSkills();
        if (latest) {
          const fresh = latest.find((s) => s.name === name);
          if (fresh) {
            setDetailSkill((prev) => (prev && prev.name === name ? fresh : prev));
          }
        }
        try {
          await window.hilo.opencode.restart();
        } catch {}
        market.markInstalled(name);
        marketOfficialFeatured.markInstalled(name);
        marketCommunity.markInstalled(name);
        marketOther.markInstalled(name);
      } else {
        dedupedToast.error(
          t(isUpdate ? "skills.market.updateError" : "skills.market.installError", {
            name,
          }),
        );
      }
    },
    [
      activeTab,
      market.install,
      market.markInstalled,
      marketOfficialFeatured.markInstalled,
      marketCommunity.markInstalled,
      marketOther.markInstalled,
      pluginMarket.install,
      pluginMarket.plugins,
      findCommunityHostHook,
      t,
      fetchSkills,
    ],
  );
  const handleUninstallRequest = reactExports.useCallback(
    (name) => {
      const targetSkill = skills.find((s) => s.name === name);
      setUninstallTarget({
        name,
        source: targetSkill?.source ?? "installed",
        skillType: targetSkill?.skillType,
      });
    },
    [skills],
  );
  const handleUninstallConfirm = reactExports.useCallback(async () => {
    if (!uninstallTarget) return;
    const { name, source, skillType } = uninstallTarget;
    setUninstallTarget(null);
    const trackSource = mapSkillSource(source);
    let ok;
    if (source === "user") {
      try {
        const res = await gatewayFetch(API_PATHS.skillUserTrash, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name,
            skillType,
          }),
        });
        const data = await res.json();
        if (data.ok && data.path && shell.trashItem) {
          await shell.trashItem(data.path);
        }
        ok = data.ok;
        if (ok) {
          trackSkillUninstall(name, trackSource);
        } else {
          trackSkillUninstallFailed({
            name,
            source: trackSource,
            error: new Error(data.error || "Trash failed"),
          });
        }
      } catch (err) {
        ok = false;
        trackSkillUninstallFailed({
          name,
          source: trackSource,
          error: err,
        });
      }
    } else {
      const m = skillType === "plugin" ? pluginMarket : (findCommunityHostHook(name) ?? market);
      ok = await m.uninstall(name);
    }
    const isPlugin = skillType === "plugin";
    if (ok) {
      dedupedToast.success(
        t(isPlugin ? "skills.market.uninstallPluginSuccess" : "skills.market.uninstallSuccess", {
          name,
        }),
      );
      setDetailSkill(null);
      setPluginDetail(null);
      setSkills((prev) => prev.filter((s) => s.name !== name));
      setNeedsRefresh(true);
      fetchSkills();
      try {
        await window.hilo.opencode.restart();
      } catch {}
    } else {
      dedupedToast.error(
        t(isPlugin ? "skills.market.uninstallPluginError" : "skills.market.uninstallError", {
          name,
        }),
      );
    }
  }, [uninstallTarget, market, pluginMarket, findCommunityHostHook, t, fetchSkills, shell]);
  const handleExport = reactExports.useCallback(
    async (name) => {
      const toastId = dedupedToast.loading(t("skills.exporting"));
      try {
        const result = await homeService.skillExport.exportSkill(name);
        if (result.cancelled) {
          trackSkillExport({
            skill_name: name,
            result: "cancelled",
          });
          dedupedToast.dismiss(toastId);
          return;
        }
        trackSkillExport({
          skill_name: name,
          result: "success",
        });
        dedupedToast.success(
          t("skills.exportSuccess", {
            name,
          }),
          {
            id: toastId,
          },
        );
      } catch {
        trackSkillExport({
          skill_name: name,
          result: "failed",
        });
        dedupedToast.error(
          t("skills.exportFailed", {
            name,
          }),
          {
            id: toastId,
          },
        );
      }
    },
    [t],
  );
  const handleShare = reactExports.useCallback((name) => {
    const { region, channel } = getRuntimeConfig();
    setShareUrl(getSkillShareUrl(name, region, channel));
  }, []);
  const handleCopyShareUrl = reactExports.useCallback(() => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl).then(
      () => {
        dedupedToast.success(t("skills.share.copied"));
        setShareUrl(null);
      },
      () => {
        dedupedToast.error(t("skills.share.failed"));
      },
    );
  }, [shareUrl, t]);
  const { trySkill } = useTrySkill();
  const handleCreateSkillFromDialog = reactExports.useCallback(() => {
    trackSkillCreatorInvoke("creator_plan_empty");
    setCreatorPlanOpen(false);
    const installed = skillsRef.current.find((s) => s.name === "skill-creator");
    trySkill(
      installed ?? {
        name: "skill-creator",
      },
    );
  }, [trySkill]);
  const handleTryItOut = reactExports.useCallback(
    (skill) => {
      const installedSkill = skillsRef.current.find((item) => item.name === skill.name);
      const resolvedSkill = installedSkill ?? skill;
      const isInstalled = "enabled" in resolvedSkill;
      const needsInstall = !isInstalled;
      const needsEnable = isInstalled && !resolvedSkill.enabled;
      const trackSource = isInstalled ? mapSkillSource(resolvedSkill.source) : "market";
      trackSkillTry({
        skill_name: skill.name,
        source: trackSource,
        needs_install: needsInstall,
        needs_enable: needsEnable,
      });
      trySkill(resolvedSkill, {
        invokeSource: previewMode ? "share_link" : void 0,
      });
    },
    [trySkill, previewMode],
  );
  const [pluginDetail, setPluginDetail] = reactExports.useState(null);
  const openPluginDetail = reactExports.useCallback(
    (plugin, trigger) => {
      const installed = skills.find((s) => s.name === plugin.id && s.skillType === "plugin");
      trackSkillDetailView({
        skill_name: plugin.id,
        tab: activeTab,
        is_installed: !!installed,
        trigger,
      });
      setPluginDetail(plugin);
    },
    [skills, activeTab],
  );
  const openPluginDetailFromCard = reactExports.useCallback(
    (plugin) => openPluginDetail(plugin, "card"),
    [openPluginDetail],
  );
  const openPluginDetailFromList = reactExports.useCallback(
    (plugin) => openPluginDetail(plugin, "list"),
    [openPluginDetail],
  );
  reactExports.useEffect(() => {
    if (!initialPluginId || openedPluginDeepLinksRef.current.has(initialPluginId)) return;
    const target = pluginMarket.plugins.find((plugin) => plugin.id === initialPluginId);
    if (!target) return;
    openedPluginDeepLinksRef.current.add(initialPluginId);
    openPluginDetail(target);
    void pluginMarket.fetchList();
  }, [initialPluginId, pluginMarket.plugins, pluginMarket.fetchList, openPluginDetail]);
  const pluginDetailInstalledSkill = reactExports.useMemo(
    () =>
      pluginDetail
        ? skills.find((s) => s.name === pluginDetail.id && s.skillType === "plugin")
        : void 0,
    [pluginDetail, skills],
  );
  return (
    <div
      ref={scrollRef}
      data-scrolling={isScrolling ? "true" : void 0}
      data-action-ui-id="skills-scroll-container"
      className="scrollbar-fade relative z-2 flex h-full flex-1 flex-col overflow-y-auto bg-[var(--home-content-surface)]"
    >
      <div className="px-8 md:px-12" data-layout-slot="skills-top-banner-stack">
        {capabilityTab === "skills" && marketUnlocked && (
          <SyncBanner syncStatus={syncStatus} showComplete={showSyncComplete} />
        )}
      </div>
      <div className="sticky top-0 z-10 bg-[var(--home-content-surface)]">
        <header className="shrink-0 px-8 pb-4 pt-7 md:px-12">
          <div className="relative z-10 flex flex-wrap items-center gap-4">
            <Tabs
              value={capabilityTab}
              onValueChange={(value) => {
                if (value === "skills" || value === "connectors") setCapabilityTab(value);
              }}
            >
              <TabsList
                variant="track"
                aria-label={t("skills.capabilityTabsAria")}
                className="skills-capability-track h-[38px] rounded-xl p-[3px]"
                data-action-ui-id="skills-capability-tabs"
              >
                <TabsTrigger
                  value="skills"
                  className="h-8 min-w-32 gap-1.5 rounded-[9px] px-3 py-0 text-sm data-[active]:shadow-none"
                  data-action-ui-id="skills-capability-tab-skills"
                >
                  <SkillIcon size={16} strokeWidth={1.75} />
                  {t("skills.capabilityTab.skills")}
                </TabsTrigger>
                <TabsTrigger
                  value="connectors"
                  className="h-8 min-w-32 gap-1.5 rounded-[9px] px-3 py-0 text-sm data-[active]:shadow-none"
                  data-action-ui-id="skills-capability-tab-connectors"
                >
                  <Link2 size={18} strokeWidth={2} aria-hidden="true" />
                  {t("skills.capabilityTab.connectors")}
                  <Badge className="h-4 rounded-full bg-brand-accent px-1.5 py-0 text-[10px] leading-none text-brand-accent-foreground">
                    {t("skills.badge.new")}
                  </Badge>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </header>
        {capabilityTab === "skills" ? (
          <div className="px-8 md:px-12" data-layout-slot="skills-auto-update-notice">
            <AutoUpdateBannerPresence
              pending={visibleAutoUpdatePending}
              restarting={autoUpdateRestarting}
              onRestart={restartNow}
              onDismiss={dismissAutoUpdate}
            />
          </div>
        ) : null}
        <div
          key={`section-header-${capabilityTab}`}
          className={`flex min-w-0 flex-nowrap items-start gap-3 px-8 pt-4 ${TAB_CONTENT_ENTER_CLASS_NAME} md:px-12 ${capabilityTab === "skills" ? "min-h-16" : "mb-2 min-h-[68px]"}`}
          data-layout-slot={
            capabilityTab === "skills" ? "skills-section-header" : "connectors-section-header"
          }
          data-capability={capabilityTab}
        >
          {capabilityTab === "skills" ? (
            <>
              <div className="flex shrink-0 items-center gap-6">
                <Tabs value={activeTab} onValueChange={handleTabSwitch} className="min-w-0">
                  <TabsList
                    variant="underline"
                    aria-label={t("skills.primaryTabsAria")}
                    className="ml-0"
                    data-action-ui-id="skills-primary-tabs"
                  >
                    {["community", "mine"].map((tab) => {
                      const infoKey = tab === "community" ? "skills.tabs.communityInfo" : "";
                      return (
                        <div key={tab} className="relative flex items-center gap-0.5">
                          <TabsTrigger
                            value={tab}
                            variant="underline"
                            data-action-ui-id={`skills-tab-${tab}`}
                          >
                            {t(`skills.tabs.${tab}`)}
                          </TabsTrigger>
                          {tab === "mine" && (
                            <span
                              className="ml-2 shrink-0 whitespace-nowrap text-xs text-muted-foreground"
                              data-layout-slot="skills-mine-count"
                            >
                              {t("skills.mine.totalCount", {
                                count: mySkillsCount,
                              })}
                            </span>
                          )}
                          {infoKey && <TabInfoPopover bodyKey={infoKey} tabKey={tab} />}
                        </div>
                      );
                    })}
                  </TabsList>
                </Tabs>
                {activeTab === "community" && isOperator && (
                  <Tooltip>
                    <TooltipTrigger
                      data-action-ui-id="skills-operation-edit"
                      render={
                        <Button
                          variant={operationsMode ? "default" : "outline"}
                          className="h-9 gap-1.5 rounded-lg px-4 text-[13px] font-medium"
                        />
                      }
                      onClick={() => setOperationsMode(!operationsMode)}
                    >
                      <Settings2 size={16} strokeWidth={1.5} />
                      {t("skills.operation.editButton")}
                    </TooltipTrigger>
                    <TooltipContent>{t("skills.operation.editTooltip")}</TooltipContent>
                  </Tooltip>
                )}
              </div>
              <div
                className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-3"
                data-layout-slot="skills-toolbar-actions"
              >
                {!(activeTab === "community" && operationsMode) &&
                  (() => {
                    const isMine = activeTab === "mine";
                    const value = isMine ? installedSearchQuery : searchQuery;
                    const setValue = isMine ? setInstalledSearchQuery : handleSearchChange;
                    return (
                      <div
                        className="w-60 min-w-36 max-w-60 flex-1 shrink"
                        data-layout-slot="skills-search-slot"
                      >
                        <PageSearchInput
                          value={value}
                          onValueChange={setValue}
                          placeholder={t("skills.market.searchPlaceholder")}
                          clearLabel={t("common.clear")}
                          inputActionId="skills-header-search"
                        />
                      </div>
                    );
                  })()}
                <div
                  className="flex max-w-full flex-wrap items-center justify-end gap-3"
                  data-layout-slot="skills-toolbar-primary-actions"
                >
                  <Button
                    variant="outline"
                    size="default"
                    data-action-ui-id="skills-import-button"
                    className="h-9 shrink-0 gap-1.5 whitespace-nowrap rounded-lg px-4 text-[13px] font-medium"
                    onClick={() => setImportOpen(true)}
                  >
                    <Import size={16} strokeWidth={1.5} />
                    {t("skills.header.install", "Import Skill")}
                  </Button>
                  <Button
                    variant="outline"
                    size="default"
                    data-action-ui-id="skills-upload-skill"
                    className="h-9 shrink-0 gap-1.5 whitespace-nowrap rounded-lg px-4 text-[13px] font-medium"
                    onClick={() => openCreatorPlan(void 0, "upload")}
                  >
                    <Upload size={16} strokeWidth={1.5} />
                    {t("skills.header.submitSkill", "Submit Skill")}
                  </Button>
                  <Button
                    size="default"
                    data-action-ui-id="skills-create-via-hub"
                    className="h-9 shrink-0 gap-1.5 whitespace-nowrap rounded-lg px-4 text-[13px] font-medium"
                    onClick={() => {
                      trackSkillCreatorInvoke("market_button");
                      const installed = skills.find((s) => s.name === "skill-creator");
                      trySkill(
                        installed ?? {
                          name: "skill-creator",
                        },
                      );
                    }}
                  >
                    <Plus size={16} strokeWidth={1.5} />
                    {t("skills.header.createSkill", "Create Skill")}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <ConnectorHeaderContent
              query={connectorSearchQuery}
              onQueryChange={setConnectorSearchQuery}
              sortMode={connectorSortMode}
              onSortModeChange={setConnectorSortMode}
              onCustomConnector={() => setCustomConnectorOpen(true)}
            />
          )}
        </div>
        {capabilityTab === "skills" && !(activeTab === "community" && operationsMode) && (
          <div className={TAB_CONTENT_ENTER_CLASS_NAME}>
            <SkillFilterBar
              categories={skillCategories}
              activeTab={activeTab}
              activeTag={activeTag}
              onTagChange={handleTagChange}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              sortBy={sortBy}
              onSortChange={setSortBy}
              mineCategoryFilter={mineCategoryFilter}
              onMineCategoryFilterChange={setMineCategoryFilter}
              mineSourceFilter={mineSourceFilter}
              onMineSourceFilterChange={setMineSourceFilter}
              autoUpdate={skillAutoUpdate}
              onAutoUpdateChange={handleAutoUpdateToggle}
            />
          </div>
        )}
      </div>
      <div
        key={`capability-content-${capabilityTab}`}
        className={`flex flex-1 flex-col px-8 pb-12 ${TAB_CONTENT_ENTER_CLASS_NAME} md:px-12 ${capabilityTab === "connectors" ? "pt-4" : "pt-2"}`}
        data-layout-slot="skills-capability-content"
      >
        {capabilityTab === "skills" && activeTab === "community" && operationsMode && (
          <OperationsView role={operatorRole} onExit={() => setOperationsMode(false)} />
        )}
        {capabilityTab === "skills" && activeTab === "community" && !operationsMode && (
          <CommunityTabContent
            searchMarket={market}
            marketOfficialFeatured={marketOfficialFeatured}
            marketCommunity={marketCommunity}
            marketOther={marketOther}
            searchQuery={searchQuery}
            onInstall={handleInstall}
            onDetail={openDetailFromCard}
            onDetailList={openDetailFromList}
            installedSkills={skills}
            onToggle={handleToggle}
            onTryItOut={handleTryItOut}
            onExport={handleExport}
            onShare={handleShare}
            skillUpdates={skillUpdates}
            onUpdate={handleUpdate}
            updatingSet={updatingSet}
            viewMode={viewMode}
            activeTag={activeTag}
            hideInstalled={hideInstalled}
            onHideInstalledChange={setHideInstalled}
            sortBy={sortBy}
            onSortChange={setSortBy}
            onUninstall={handleUninstallRequest}
            onRetry={fetchCommunitySections}
            onOpenCreatorPlan={openCreatorPlan}
          />
        )}
        {capabilityTab === "skills" && activeTab === "plugins" && (
          <PluginMarketTabContent
            pluginMarket={pluginMarket}
            searchQuery={searchQuery}
            installedSkills={skills}
            entrySource={pluginEntrySource}
            onInstall={handleInstall}
            onUninstall={handleUninstallRequest}
            onDetail={openPluginDetailFromCard}
            onDetailList={openPluginDetailFromList}
            viewMode={viewMode}
          />
        )}
        {capabilityTab === "skills" && activeTab === "mine" && (
          <>
            {loading && (
              <div className="flex items-center justify-center py-12">
                <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
              </div>
            )}
            {error && (
              <PageStateBoundary
                error={true}
                errorOptions={{
                  title: t("skills.loadError"),
                  description: error,
                  retry: fetchSkills,
                }}
              />
            )}
            {!loading && !error && (
              <MySkillsView
                skills={[...filteredMineSkills].sort((a, b) => a.name.localeCompare(b.name))}
                totalCount={mySkillsCount}
                hasFilters={
                  !!installedSearchQuery.trim() ||
                  !!mineCategoryFilter ||
                  mineSourceFilter !== "all"
                }
                onClearFilters={() => {
                  setInstalledSearchQuery("");
                  setMineCategoryFilter(null);
                  setMineSourceFilter("all");
                }}
                submissionState={submissionState}
                onCoverError={refreshCovers}
                onCreate={handleCreateSkillFromDialog}
                submissions={creatorPlanSubmissionMap}
                onEdit={(name, mode) => openCreatorPlan(name, "design", mode)}
                onOffline={handleOfflineCreatedSkill}
                onToggle={handleToggle}
                onDetail={openDetailFromList}
                onExport={handleExport}
                onShare={handleShare}
                onTryItOut={handleTryItOut}
                onUninstall={handleUninstallRequest}
                skillUpdates={skillUpdates}
                onUpdate={handleUpdate}
                updatingSet={updatingSet}
                onGoToCommunity={() => {
                  handleTabSwitch("community");
                  forceSetActiveTag(null);
                }}
                onRefreshSubmissions={fetchCreatorPlanSubmissions}
              />
            )}
          </>
        )}
        {capabilityTab === "connectors" ? (
          <ConnectorsTab
            query={connectorSearchQuery}
            onQueryChange={setConnectorSearchQuery}
            sortMode={connectorSortMode}
            onSortModeChange={setConnectorSortMode}
            customConnectorOpen={customConnectorOpen}
            onCustomConnectorOpenChange={setCustomConnectorOpen}
            showHeader={false}
          />
        ) : null}
      </div>
      {detailSkill && (
        <SkillDetailDialog
          skill={detailSkill}
          installedSkill={skills.find((skill) => skill.name === detailSkill.name)}
          accountId={user?.userID ?? ""}
          activeTab={activeTab}
          onClose={() => {
            setDetailSkill(null);
            setPreviewMode(false);
          }}
          onToggle={handleToggle}
          onTryItOut={handleTryItOut}
          onInstall={handleInstall}
          installing={
            market.installingSet.has(detailSkill.name) ||
            marketOfficialFeatured.installingSet.has(detailSkill.name) ||
            marketCommunity.installingSet.has(detailSkill.name) ||
            marketOther.installingSet.has(detailSkill.name) ||
            pluginMarket.installingSet.has(detailSkill.name)
          }
          onShare={handleShare}
          onOpenCreatorPlan={openCreatorPlan}
          updateInfo={skillUpdates.get(detailSkill.name)}
          onUpdate={handleUpdate}
          updating={updatingSet.has(detailSkill.name)}
        />
      )}
      <PluginMarketDetailDialog
        plugin={pluginDetail}
        installedSkill={pluginDetailInstalledSkill}
        installing={pluginDetail ? pluginMarket.installingSet.has(pluginDetail.id) : false}
        onClose={() => setPluginDetail(null)}
        onInstall={handleInstall}
        onUninstall={handleUninstallRequest}
      />
      <AlertDialog
        open={!!uninstallTarget}
        onOpenChange={(open) => !open && setUninstallTarget(null)}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {uninstallTarget?.source === "user"
                ? t("skills.delete.userTitle")
                : uninstallTarget?.skillType === "plugin"
                  ? t("skills.delete.pluginTitle")
                  : t("skills.delete.installedTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {uninstallTarget?.source === "user"
                ? t("skills.delete.userDesc")
                : uninstallTarget?.skillType === "plugin"
                  ? t("skills.delete.pluginDesc")
                  : t("skills.delete.installedDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              data-action-ui-id="market-skill-uninstall-confirm"
              variant="destructive"
              onClick={handleUninstallConfirm}
            >
              {uninstallTarget?.source === "user"
                ? t("skills.delete.confirm")
                : uninstallTarget?.skillType === "plugin"
                  ? t("skills.plugin.uninstall")
                  : t("skills.market.uninstall")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <CreatorPlanDialog
        key={`${creatorPlanMode}:${creatorPlanDefaultSource}:${creatorPlanDefaultSkill || "new"}`}
        mode={creatorPlanMode}
        open={creatorPlanOpen}
        onOpenChange={setCreatorPlanOpen}
        mySkills={
          creatorPlanDefaultSkill
            ? skills.filter(
                (skill) => skill.source === "user" || skill.name === creatorPlanDefaultSkill,
              )
            : localCreatedSkills
        }
        defaultDisplayName={user?.username ?? ""}
        defaultSkillName={creatorPlanDefaultSkill}
        defaultSource={creatorPlanDefaultSource}
        existingSubmission={creatorPlanSubmissionMap.get(creatorPlanDefaultSkill)}
        onCreateSkill={handleCreateSkillFromDialog}
        onSaved={() => {
          void fetchSkills();
          void fetchCreatorPlanSubmissions({
            force: true,
          });
        }}
        onRefreshSubmissions={fetchCreatorPlanSubmissions}
      />
      <SkillImportDialog open={importOpen} onOpenChange={setImportOpen} onImported={fetchSkills} />
      <Dialog open={!!shareUrl} onOpenChange={(open) => !open && setShareUrl(null)}>
        <DialogContent className="sm:max-w-sm">
          <div className="flex min-w-0 flex-col items-center gap-4 pt-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-background">
              <ExternalLink size={24} strokeWidth={1.5} className="text-foreground" />
            </div>
            <div className="flex flex-col items-center gap-1 text-center">
              <DialogTitle className="text-base font-medium">
                {t("skills.share.dialogTitle", "分享链接已生成")}
              </DialogTitle>
              <DialogDescription>
                {t("skills.share.dialogDesc", "将此链接分享给他人即可安装该 Skill。")}
              </DialogDescription>
            </div>
            <div className="w-full rounded-lg bg-muted px-3 py-2.5">
              <p className="text-xs text-foreground truncate select-all">{shareUrl}</p>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {t("skills.share.validForever", "永久有效")}
            </p>
            <Button
              data-action-ui-id="skill-share-copy"
              className="w-full"
              onClick={handleCopyShareUrl}
            >
              {t("skills.share.copyLink", "复制链接")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
function validateSkillsSearch(search) {
  const out = {};
  const capability = search.capability;
  if (capability === "skills" || capability === "connectors") {
    out.capability = capability;
  }
  const tab = search.tab;
  if (tab === "community" || tab === "plugins" || tab === "mine") {
    out.tab = tab;
  }
  const subTab = search.subTab;
  if (subTab === "skills" || subTab === "plugins") {
    out.subTab = subTab;
  }
  const pluginId = typeof search.pluginId === "string" ? search.pluginId.trim() : "";
  if (pluginId) out.pluginId = pluginId;
  const skillName = typeof search.skillName === "string" ? search.skillName.trim() : "";
  if (skillName) out.skillName = skillName;
  const connectorId = typeof search.connectorId === "string" ? search.connectorId.trim() : "";
  if (connectorId) out.connectorId = connectorId;
  return out;
}
const SplitComponent = SkillsPage;
export { SplitComponent as component, validateSkillsSearch };
