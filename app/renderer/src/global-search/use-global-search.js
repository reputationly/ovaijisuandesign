// 全局搜索的数据 hook：关键字防抖、多来源结果合并与排序。
import { r as reactExports, ao as gatewayFetchFromBase } from "../main.jsx";
import { DEBOUNCE_MS } from "./constants.js";
import {
  buildCanvasThumbnailUrl,
  buildFileThumbnailUrl,
  buildLocalResults,
  readArrayField,
  readTime,
  sortResults,
  withScore,
} from "./result-builders.js";
export function useGlobalSearch(workspaces, options = {}) {
  const { currentWorkspaceId = null, recentWorkspaces = [], projects = [] } = options;
  const [results, setResults] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(false);
  const abortRef = reactExports.useRef(null);
  const timerRef = reactExports.useRef(null);
  const clear = reactExports.useCallback(() => {
    abortRef.current?.abort();
    if (timerRef.current) clearTimeout(timerRef.current);
    setResults([]);
    setLoading(false);
  }, []);
  const search = reactExports.useCallback(
    (query) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      const q = query.trim();
      if (!q) {
        clear();
        return;
      }
      const localResults = buildLocalResults(
        q,
        workspaces,
        recentWorkspaces,
        projects,
        currentWorkspaceId,
      );
      setResults(localResults);
      const searchableWorkspaces = workspaces.filter((workspace) => workspace.gatewayBinding);
      if (searchableWorkspaces.length === 0) {
        setLoading(false);
        return;
      }
      setLoading(true);
      timerRef.current = setTimeout(() => {
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        const fileSearches = searchableWorkspaces.map((workspace) =>
          gatewayFetchFromBase(
            workspace.gatewayUrl,
            `/api/files/mention-search?${new URLSearchParams({
              workspace: workspace.folderPath,
              q,
              limit: "20",
            })}`,
            {
              signal: controller.signal,
              workspaceBinding: workspace.gatewayBinding,
            },
          )
            .then((r) => r.json())
            .then((data) =>
              readArrayField(data, "items").map((item) =>
                withScore(
                  {
                    id: `file:${workspace.workspaceId}:${item.path}`,
                    category: "file",
                    workspaceId: workspace.workspaceId,
                    workspaceName: workspace.workspaceName,
                    workspacePath: workspace.folderPath,
                    title: item.name,
                    subtitle: item.path,
                    meta: workspace.workspaceName,
                    time: readTime(item),
                    thumbnailUrl: buildFileThumbnailUrl(workspace, item),
                    data: item,
                  },
                  72 + (workspace.workspaceId === currentWorkspaceId ? 24 : 0),
                ),
              ),
            )
            .catch(() => []),
        );
        const canvasSearches = searchableWorkspaces.map((workspace) =>
          gatewayFetchFromBase(
            workspace.gatewayUrl,
            `/api/canvas/search?${new URLSearchParams({
              query: q,
              limit: "20",
            })}`,
            {
              signal: controller.signal,
              workspaceBinding: workspace.gatewayBinding,
            },
          )
            .then((r) => r.json())
            .then((data) =>
              readArrayField(data, "matches").map((match) =>
                withScore(
                  {
                    id: `canvas:${workspace.workspaceId}:${match.id}`,
                    category: "canvas",
                    workspaceId: workspace.workspaceId,
                    workspaceName: workspace.workspaceName,
                    workspacePath: workspace.folderPath,
                    title: match.name ?? match.id,
                    subtitle: match.promptSnippet,
                    meta: workspace.workspaceName,
                    time: readTime(match),
                    thumbnailUrl: buildCanvasThumbnailUrl(workspace, match),
                    data: match,
                  },
                  66 + (workspace.workspaceId === currentWorkspaceId ? 24 : 0),
                ),
              ),
            )
            .catch(() => []),
        );
        Promise.all([...fileSearches, ...canvasSearches]).then((groups) => {
          if (controller.signal.aborted) return;
          setResults(sortResults([...localResults, ...groups.flat()]));
          setLoading(false);
        });
      }, DEBOUNCE_MS);
    },
    [workspaces, recentWorkspaces, projects, currentWorkspaceId, clear],
  );
  reactExports.useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);
  return {
    results,
    loading,
    search,
    clear,
  };
}
