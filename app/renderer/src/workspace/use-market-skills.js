// use-market-skills.js
import { Emitter } from "../vendor-inline/vscode-base/vs-buffer.js";
import { API_PATHS, reactExports } from "../vendor.js";
import { gatewayFetch } from "../infra/gateway-fetch.js";
import {
  trackSkillInstallEvent,
  trackSkillInstallFailed,
  trackSkillLoadMore,
  trackSkillUninstall,
  trackSkillUninstallFailed,
} from "./use-new-workspace-dialog.jsx";

class SkillEvents {
  _onSkillsChanged = new Emitter();
  onSkillsChanged = this._onSkillsChanged.event;
  fireSkillsChanged(skillName, kind) {
    this._onSkillsChanged.fire({
      name: skillName,
      kind,
    });
  }
}

const skillEvents = new SkillEvents();

const DEFAULT_PAGE_SIZE = 20;

export function useMarketSkills(
  skillType,
  source,
  pageSize = DEFAULT_PAGE_SIZE,
  tag,
) {
  const requestScope = `${""}\0${source ?? ""}\0${pageSize}\0${tag ?? ""}`;
  const [skills, setSkills] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(false);
  const [error, setError] = reactExports.useState(null);
  const [hasMore, setHasMore] = reactExports.useState(false);
  const [installingSet, setInstallingSet] = reactExports.useState(new Set());
  const [uninstallingSet, setUninstallingSet] = reactExports.useState(
    new Set(),
  );
  const pageRef = reactExports.useRef(1);
  const queryRef = reactExports.useRef("");
  const fetchingRef = reactExports.useRef(false);
  const requestSeqRef = reactExports.useRef(0);
  const requestScopeRef = reactExports.useRef(requestScope);
  const [resultScope, setResultScope] = reactExports.useState(requestScope);
  const skillsRef = reactExports.useRef([]);
  reactExports.useEffect(() => {
    skillsRef.current = skills;
  }, [skills]);
  reactExports.useEffect(() => {
    if (requestScopeRef.current === requestScope) return;
    requestScopeRef.current = requestScope;
    requestSeqRef.current += 1;
    fetchingRef.current = false;
    pageRef.current = 1;
    queryRef.current = "";
    skillsRef.current = [];
    setSkills([]);
    setLoading(false);
    setError(null);
    setHasMore(false);
    setResultScope(requestScope);
  }, [requestScope]);
  const fetchPage = reactExports.useCallback(
    async (query, page, reset) => {
      if (!reset && fetchingRef.current) return;
      fetchingRef.current = true;
      const seq = ++requestSeqRef.current;
      const isStale = () => seq !== requestSeqRef.current;
      if (reset) {
        setError(null);
      }
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          page_size: String(pageSize),
        });
        if (skillType);
        if (source && !query) {
          params.set("source", source);
        }
        if (tag && !query) {
          params.set("tag", tag);
        }
        let path;
        if (query) {
          params.set("query", query);
          path = `${API_PATHS.marketSearch}?${params}`;
        } else {
          path = `${API_PATHS.marketSkills}?${params}`;
        }
        const response = await gatewayFetch(path);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const raw = await response.json();
        if (isStale()) return;
        let newSkills;
        if (skillType === "plugin");
        else {
          const skillResp = raw;
          newSkills = skillResp.skills || [];
        }
        pageRef.current = page;
        queryRef.current = query;
        setSkills((prev) => {
          const next = reset ? newSkills : [...prev, ...newSkills];
          setHasMore(next.length < raw.total);
          return next;
        });
      } catch (err) {
        if (isStale()) return;
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!isStale()) {
          fetchingRef.current = false;
          setLoading(false);
        }
      }
    },
    [skillType, source, pageSize, tag],
  );
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
    trackSkillLoadMore({
      page: nextPage,
      query_length: queryRef.current.length,
    });
    await fetchPage(queryRef.current, nextPage, false);
  }, [hasMore, fetchPage]);
  const install = reactExports.useCallback(
    async (skillName, via) => {
      setInstallingSet((prev) => new Set(prev).add(skillName));
      const startedAt = Date.now();
      const targetSkill = skillsRef.current.find((skill) => skill.name === skillName);
      const isUpdate = targetSkill?.installed === true;
      const previousVersion = isUpdate ? targetSkill?.installedVersion : void 0;
      try {
        const response = await gatewayFetch(API_PATHS.marketInstall, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            skillType
              ? {
                  name: skillName,
                  skillType,
                }
              : {
                  name: skillName,
                },
          ),
        });
        const data = await response.json();
        if (!data.ok) throw new Error(data.error || "Install failed");
        trackSkillInstallEvent({
          name: skillName,
          source: "market",
          version: targetSkill?.version,
          isUpdate,
          previousVersion,
          via,
        });
        skillEvents.fireSkillsChanged(skillName, "installed");
        return true;
      } catch (err) {
        trackSkillInstallFailed({
          name: skillName,
          source: "market",
          version: targetSkill?.version,
          isUpdate,
          error: err,
          durationMs: Date.now() - startedAt,
          via,
        });
        setInstallingSet((prev) => {
          const next = new Set(prev);
          next.delete(skillName);
          return next;
        });
        return false;
      }
    },
    [skillType],
  );
  const uninstall = reactExports.useCallback(
    async (skillName) => {
      setUninstallingSet((prev) => new Set(prev).add(skillName));
      try {
        const response = await gatewayFetch(API_PATHS.marketUninstall, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            skillType
              ? {
                  name: skillName,
                  skillType,
                }
              : {
                  name: skillName,
                },
          ),
        });
        const data = await response.json();
        if (!data.ok) throw new Error(data.error || "Uninstall failed");
        setSkills((prev) =>
          prev.map((skill) =>
            skill.name === skillName
              ? {
                  ...skill,
                  installed: false,
                }
              : skill,
          ),
        );
        trackSkillUninstall(skillName, "market");
        skillEvents.fireSkillsChanged(skillName, "uninstalled");
        return true;
      } catch (err) {
        trackSkillUninstallFailed({
          name: skillName,
          source: "market",
          error: err,
        });
        return false;
      } finally {
        setUninstallingSet((prev) => {
          const next = new Set(prev);
          next.delete(skillName);
          return next;
        });
      }
    },
    [skillType],
  );
  const markInstalled = reactExports.useCallback((skillName) => {
    setSkills((prev) =>
      prev.map((skill) =>
        skill.name === skillName
          ? {
              ...skill,
              installed: true,
              updateAvailable: false,
              installedVersion: skill.version,
            }
          : skill,
      ),
    );
    setInstallingSet((prev) => {
      if (!prev.has(skillName)) return prev;
      const next = new Set(prev);
      next.delete(skillName);
      return next;
    });
  }, []);
  const clearInstalling = reactExports.useCallback((skillName) => {
    setInstallingSet((prev) => {
      if (!prev.has(skillName)) return prev;
      const next = new Set(prev);
      next.delete(skillName);
      return next;
    });
  }, []);
  const ownsCurrentScope = resultScope === requestScope;
  return {
    // Effects clear the internal state after a scope change. The synchronous
    // guard also hides the previous domain during the render before that
    // effect runs, so stale cards never remain interactive for one frame.
    skills: ownsCurrentScope ? skills : [],
    loading: ownsCurrentScope ? loading : true,
    error: ownsCurrentScope ? error : null,
    hasMore: ownsCurrentScope ? hasMore : false,
    fetchList,
    search,
    loadMore,
    install,
    markInstalled,
    clearInstalling,
    uninstall,
    installingSet,
    uninstallingSet,
  };
}
