// 技能页的状态 hook：布局、筛选、更新检查、同步状态、试用技能。
import {
  h as useTranslation,
  r as reactExports,
  a3 as dedupedToast,
  x as useNavigateToWorkspace,
  H as homeService,
  K as workspaceRuntimeFromOpenResult,
  l9 as toastWorkspaceOpenResult,
  mw as workspaceEvents,
  l as gatewayFetch,
  m as API_PATHS,
  nE as trackSkillInstallFailed,
  nF as trackSkillInstallEvent,
  nG as showSkillInstallSuccessToast,
  nH as beginSkillApplyingToast,
  nI as trackSkillInvoke,
} from "../main.jsx";
const LAYOUT_STORAGE_KEY = "skills.layout";
const INITIAL_PER_TAB = {
  community: {
    activeTag: null,
    hideInstalled: false,
  },
  plugins: {
    activeTag: null,
    hideInstalled: false,
  },
};
export function useSkillFilters(tab = "community") {
  const [perTab, setPerTab] = reactExports.useState(INITIAL_PER_TAB);
  const [viewMode, setViewMode] = reactExports.useState(
    () => localStorage.getItem(LAYOUT_STORAGE_KEY) || "grid",
  );
  const [sortBy, setSortBy] = reactExports.useState("recent");
  const effectiveTab = tab === "mine" ? "community" : tab;
  const current = perTab[effectiveTab];
  const handleViewModeChange = reactExports.useCallback((mode) => {
    setViewMode(mode);
    localStorage.setItem(LAYOUT_STORAGE_KEY, mode);
  }, []);
  const handleTagChange = reactExports.useCallback(
    (next) => {
      setPerTab((prev) => {
        const cur = prev[effectiveTab];
        const value = cur.activeTag === next ? null : next;
        if (value === cur.activeTag) return prev;
        return {
          ...prev,
          [effectiveTab]: {
            ...cur,
            activeTag: value,
          },
        };
      });
    },
    [effectiveTab],
  );
  const forceSetActiveTag = reactExports.useCallback(
    (next) => {
      setPerTab((prev) => {
        const cur = prev[effectiveTab];
        if (cur.activeTag === next) return prev;
        return {
          ...prev,
          [effectiveTab]: {
            ...cur,
            activeTag: next,
          },
        };
      });
    },
    [effectiveTab],
  );
  const setHideInstalled = reactExports.useCallback(
    (next) => {
      setPerTab((prev) => {
        const cur = prev[effectiveTab];
        if (cur.hideInstalled === next) return prev;
        return {
          ...prev,
          [effectiveTab]: {
            ...cur,
            hideInstalled: next,
          },
        };
      });
    },
    [effectiveTab],
  );
  return reactExports.useMemo(
    () => ({
      activeTag: current.activeTag,
      setActiveTag: handleTagChange,
      forceSetActiveTag,
      viewMode,
      setViewMode: handleViewModeChange,
      sortBy,
      setSortBy,
      hideInstalled: current.hideInstalled,
      setHideInstalled,
    }),
    [
      current.activeTag,
      current.hideInstalled,
      handleTagChange,
      forceSetActiveTag,
      viewMode,
      handleViewModeChange,
      sortBy,
      setHideInstalled,
    ],
  );
}
export function useSkillUpdates(enabled) {
  const [updates, setUpdates] = reactExports.useState(new Map());
  const fetchSeqRef = reactExports.useRef(0);
  const refresh = reactExports.useCallback(() => {
    const seq = ++fetchSeqRef.current;
    gatewayFetch("/api/skills/market?page=1&page_size=999")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data || seq !== fetchSeqRef.current) return;
        const map = new Map();
        for (const skill of data.skills) {
          if (skill.installed && skill.updateAvailable) {
            map.set(skill.name, {
              latestVersion: skill.version,
              currentVersion: skill.installedVersion,
            });
          }
        }
        setUpdates(map);
      })
      .catch(() => {});
  }, []);
  reactExports.useEffect(() => {
    if (!enabled) return;
    refresh();
  }, [enabled, refresh]);
  const clearUpdate = reactExports.useCallback((name) => {
    setUpdates((prev) => {
      if (!prev.has(name)) return prev;
      const next = new Map(prev);
      next.delete(name);
      return next;
    });
  }, []);
  return {
    updates,
    refresh,
    clearUpdate,
  };
}
const POLL_INTERVAL = 1e4;
const COMPLETE_DISPLAY_MS = 5e3;
export function useSyncStatus(active) {
  const [status, setStatus] = reactExports.useState(null);
  const [showComplete, setShowComplete] = reactExports.useState(false);
  const prevSyncingRef = reactExports.useRef(false);
  const completeTimerRef = reactExports.useRef(void 0);
  const fetchStatus = reactExports.useCallback(async () => {
    try {
      const res = await gatewayFetch(API_PATHS.marketSyncStatus);
      if (!res.ok) {
        if (res.status === 404) return;
        return;
      }
      const data = await res.json();
      setStatus(data);
      if (prevSyncingRef.current && !data.syncing && data.lastSyncResult) {
        setShowComplete(true);
        clearTimeout(completeTimerRef.current);
        completeTimerRef.current = setTimeout(() => setShowComplete(false), COMPLETE_DISPLAY_MS);
      }
      prevSyncingRef.current = data.syncing;
    } catch {}
  }, []);
  reactExports.useEffect(() => {
    if (!active) return;
    fetchStatus();
    const interval = setInterval(fetchStatus, POLL_INTERVAL);
    return () => {
      clearInterval(interval);
      clearTimeout(completeTimerRef.current);
    };
  }, [active, fetchStatus]);
  return {
    status,
    showComplete,
  };
}
function toLaunchSkillInfo(skill) {
  if ("enabled" in skill) return skill;
  return {
    ...skill,
    enabled: true,
    // Market source is official/community, while the installed-skill contract
    // uses installed/user. Try flow has already installed/enabled it locally.
    source: "installed",
  };
}
export function useTrySkill() {
  const { t } = useTranslation();
  const navigateToWorkspace = useNavigateToWorkspace();
  const [trying, setTrying] = reactExports.useState(false);
  const trySkill = reactExports.useCallback(
    async (skill, opts) => {
      if (trying) return;
      setTrying(true);
      try {
        const isInstalled = "enabled" in skill || skill.installed === true;
        if (!isInstalled) {
          const toastId = dedupedToast.loading(t("skills.market.installing"));
          const startedAt = Date.now();
          try {
            const res = await gatewayFetch(API_PATHS.marketInstall, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(
                skill.skillType
                  ? {
                      name: skill.name,
                      skillType: skill.skillType,
                    }
                  : {
                      name: skill.name,
                    },
              ),
            });
            const data = await res.json();
            if (!data.ok) {
              trackSkillInstallFailed({
                name: skill.name,
                source: "market",
                via: "market_card",
                error: data.error || "install rejected",
                durationMs: Date.now() - startedAt,
              });
              dedupedToast.error(
                t("skills.market.installError", {
                  name: skill.name,
                }),
                {
                  id: toastId,
                },
              );
              return;
            }
            trackSkillInstallEvent({
              name: skill.name,
              source: "market",
              version: skill.version,
              via: "market_card",
            });
            await homeService.hiloApp.toggleSkill(skill.name, true);
            try {
              await window.hilo.opencode.restart();
            } catch {}
            showSkillInstallSuccessToast(skill.name, {
              id: toastId,
            });
          } catch (err) {
            trackSkillInstallFailed({
              name: skill.name,
              source: "market",
              via: "market_card",
              error: err,
              durationMs: Date.now() - startedAt,
            });
            dedupedToast.error(
              t("skills.market.installError", {
                name: skill.name,
              }),
              {
                id: toastId,
              },
            );
            return;
          }
        } else if (!skill.enabled) {
          const applyingToast = beginSkillApplyingToast(t("skills.applying"));
          try {
            await homeService.hiloApp.toggleSkill(skill.name, true);
            try {
              await window.hilo.opencode.restart();
            } catch {}
            applyingToast.success(t("skills.restartSuccess"));
          } catch {
            applyingToast.error(t("skills.toggleError"));
            return;
          }
        }
        const loadingToastId = dedupedToast.loading(
          t("skills.loadingToTask", "正在加载 Skill 至任务"),
        );
        const result = await homeService.hiloApp
          .createWorkspaceWithResult(skill.name)
          .catch(() => null);
        dedupedToast.dismiss(loadingToastId);
        if (!result) {
          dedupedToast.error(t("skills.tryItOutFailed"));
          return;
        }
        const runtime = workspaceRuntimeFromOpenResult(result);
        if (!runtime) {
          toastWorkspaceOpenResult(result, t);
          return;
        }
        if (skill.skillType === "plugin") {
          navigateToWorkspace(runtime, {
            pluginId: skill.name,
          });
        } else {
          workspaceEvents.queueAddSkillToChat(runtime.workspaceId, toLaunchSkillInfo(skill));
          navigateToWorkspace(runtime);
        }
        trackSkillInvoke({
          name: skill.name,
          source: opts?.invokeSource ?? "project_sidebar_post_install",
        });
      } finally {
        setTrying(false);
      }
    },
    [trying, t, navigateToWorkspace],
  );
  return {
    trySkill,
    trying,
  };
}
