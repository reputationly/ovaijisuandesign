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
  fireSkillsChanged(name2, kind) {
    this._onSkillsChanged.fire({
      name: name2,
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
    async (query, page, reset2) => {
      if (!reset2 && fetchingRef.current) return;
      fetchingRef.current = true;
      const seq2 = ++requestSeqRef.current;
      const isStale2 = () => seq2 !== requestSeqRef.current;
      if (reset2) {
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
        let path2;
        if (query) {
          params.set("query", query);
          path2 = `${API_PATHS.marketSearch}?${params}`;
        } else {
          path2 = `${API_PATHS.marketSkills}?${params}`;
        }
        const res = await gatewayFetch(path2);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const raw2 = await res.json();
        if (isStale2()) return;
        let newSkills;
        if (skillType === "plugin");
        else {
          const skillResp = raw2;
          newSkills = skillResp.skills || [];
        }
        pageRef.current = page;
        queryRef.current = query;
        setSkills((prev) => {
          const next2 = reset2 ? newSkills : [...prev, ...newSkills];
          setHasMore(next2.length < raw2.total);
          return next2;
        });
      } catch (err) {
        if (isStale2()) return;
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!isStale2()) {
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
  const search2 = reactExports.useCallback(
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
    async (name2, via) => {
      setInstallingSet((prev) => new Set(prev).add(name2));
      const startedAt = Date.now();
      const targetSkill = skillsRef.current.find((s2) => s2.name === name2);
      const isUpdate = targetSkill?.installed === true;
      const previousVersion = isUpdate ? targetSkill?.installedVersion : void 0;
      try {
        const res = await gatewayFetch(API_PATHS.marketInstall, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            skillType
              ? {
                  name: name2,
                  skillType,
                }
              : {
                  name: name2,
                },
          ),
        });
        const data2 = await res.json();
        if (!data2.ok) throw new Error(data2.error || "Install failed");
        trackSkillInstallEvent({
          name: name2,
          source: "market",
          version: targetSkill?.version,
          isUpdate,
          previousVersion,
          via,
        });
        skillEvents.fireSkillsChanged(name2, "installed");
        return true;
      } catch (err) {
        trackSkillInstallFailed({
          name: name2,
          source: "market",
          version: targetSkill?.version,
          isUpdate,
          error: err,
          durationMs: Date.now() - startedAt,
          via,
        });
        setInstallingSet((prev) => {
          const next2 = new Set(prev);
          next2.delete(name2);
          return next2;
        });
        return false;
      }
    },
    [skillType],
  );
  const uninstall = reactExports.useCallback(
    async (name2) => {
      setUninstallingSet((prev) => new Set(prev).add(name2));
      try {
        const res = await gatewayFetch(API_PATHS.marketUninstall, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            skillType
              ? {
                  name: name2,
                  skillType,
                }
              : {
                  name: name2,
                },
          ),
        });
        const data2 = await res.json();
        if (!data2.ok) throw new Error(data2.error || "Uninstall failed");
        setSkills((prev) =>
          prev.map((s2) =>
            s2.name === name2
              ? {
                  ...s2,
                  installed: false,
                }
              : s2,
          ),
        );
        trackSkillUninstall(name2, "market");
        skillEvents.fireSkillsChanged(name2, "uninstalled");
        return true;
      } catch (err) {
        trackSkillUninstallFailed({
          name: name2,
          source: "market",
          error: err,
        });
        return false;
      } finally {
        setUninstallingSet((prev) => {
          const next2 = new Set(prev);
          next2.delete(name2);
          return next2;
        });
      }
    },
    [skillType],
  );
  const markInstalled = reactExports.useCallback((name2) => {
    setSkills((prev) =>
      prev.map((s2) =>
        s2.name === name2
          ? {
              ...s2,
              installed: true,
              updateAvailable: false,
              installedVersion: s2.version,
            }
          : s2,
      ),
    );
    setInstallingSet((prev) => {
      if (!prev.has(name2)) return prev;
      const next2 = new Set(prev);
      next2.delete(name2);
      return next2;
    });
  }, []);
  const clearInstalling = reactExports.useCallback((name2) => {
    setInstallingSet((prev) => {
      if (!prev.has(name2)) return prev;
      const next2 = new Set(prev);
      next2.delete(name2);
      return next2;
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
    search: search2,
    loadMore,
    install,
    markInstalled,
    clearInstalling,
    uninstall,
    installingSet,
    uninstallingSet,
  };
}
