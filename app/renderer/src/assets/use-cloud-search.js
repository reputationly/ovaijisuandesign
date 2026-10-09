// use-cloud-search.js
import {
  isCloudProjectMembershipError,
  listAllCloudFolders,
  mapNodes,
  requestJson,
} from "./list-all-cloud-folders.js";
import { reactExports } from "../vendor.js";
import { cloudErrorDisplayMessage } from "../workspace/asset-lineage-query-key.js";

async function searchCloudNodes(projectId, keyword2, cursor, pageSize = 50) {
  const params = new URLSearchParams({
    project_id: projectId,
    keyword: keyword2,
    page_size: String(pageSize),
  });
  if (cursor) params.set("cursor", cursor);
  const data2 = await requestJson(`/api/v1/cloud-folder/search?${params}`);
  return {
    nodes: mapNodes(data2.nodes),
    nextCursor: typeof data2.next_cursor === "string" ? data2.next_cursor : "",
    hasMore: data2.has_more === true,
    degraded: data2.degraded === true,
  };
}

const CLOUD_SEARCH_DEBOUNCE_MS = 250;

export function useCloudSearch(projectId, query) {
  const keyword2 = query.trim();
  const [nodes, setNodes] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(false);
  const [error, setError] = reactExports.useState();
  const [userMessage, setUserMessage] = reactExports.useState();
  const [membershipError, setMembershipError] = reactExports.useState(false);
  const [cursor, setCursor] = reactExports.useState("");
  const [hasMore, setHasMore] = reactExports.useState(false);
  const [degraded, setDegraded] = reactExports.useState(false);
  const [refreshVersion, setRefreshVersion] = reactExports.useState(0);
  const [folderPathsById, setFolderPathsById] = reactExports.useState(
    new Map(),
  );
  const epochRef = reactExports.useRef(0);
  const load2 = reactExports.useCallback(
    async (pageCursor, append2) => {
      if (!projectId || !keyword2) return;
      const epoch = ++epochRef.current;
      setLoading(true);
      if (!append2) {
        setError(void 0);
        setUserMessage(void 0);
        setMembershipError(false);
      }
      try {
        const page = await searchCloudNodes(
          projectId,
          keyword2,
          pageCursor || void 0,
        );
        if (epoch !== epochRef.current) return;
        setNodes((previous2) =>
          append2 ? [...previous2, ...page.nodes] : page.nodes,
        );
        setCursor(page.nextCursor);
        setHasMore(page.hasMore);
        setDegraded(page.degraded);
      } catch (err) {
        if (epoch !== epochRef.current) return;
        setError(err instanceof Error ? err.message : String(err));
        setUserMessage(cloudErrorDisplayMessage(err));
        setMembershipError(isCloudProjectMembershipError(err));
        if (!append2) {
          setNodes([]);
          setCursor("");
          setHasMore(false);
        }
      } finally {
        if (epoch === epochRef.current) setLoading(false);
      }
    },
    [keyword2, projectId],
  );
  reactExports.useEffect(() => {
    const epoch = ++epochRef.current;
    setNodes([]);
    setCursor("");
    setHasMore(false);
    setDegraded(false);
    setError(void 0);
    setUserMessage(void 0);
    setMembershipError(false);
    setFolderPathsById(new Map());
    if (!projectId || !keyword2) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const timer2 = window.setTimeout(() => {
      void Promise.all([
        searchCloudNodes(projectId, keyword2),
        listAllCloudFolders(projectId),
      ])
        .then(([page, folders]) => {
          if (epoch !== epochRef.current) return;
          setNodes(page.nodes);
          setCursor(page.nextCursor);
          setHasMore(page.hasMore);
          setDegraded(page.degraded);
          const foldersById = new Map(
            folders.map((folder) => [folder.id, folder]),
          );
          const paths = new Map([
            ["", []],
            ["0", []],
          ]);
          const resolvePath2 = (folderId) => {
            const cached = paths.get(folderId);
            if (cached) return cached;
            const folder = foldersById.get(folderId);
            if (!folder) return [];
            const parent = resolvePath2(folder.parentId);
            const path2 = [
              ...parent,
              {
                id: folder.id,
                name: folder.name,
              },
            ];
            paths.set(folderId, path2);
            return path2;
          };
          for (const folder of folders) resolvePath2(folder.id);
          setFolderPathsById(paths);
        })
        .catch((err) => {
          if (epoch !== epochRef.current) return;
          setError(err instanceof Error ? err.message : String(err));
          setUserMessage(cloudErrorDisplayMessage(err));
          setMembershipError(isCloudProjectMembershipError(err));
        })
        .finally(() => {
          if (epoch === epochRef.current) setLoading(false);
        });
    }, CLOUD_SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer2);
  }, [keyword2, projectId, refreshVersion]);
  const loadMore = reactExports.useCallback(() => {
    if (!hasMore || loading) return;
    void load2(cursor, true);
  }, [cursor, hasMore, load2, loading]);
  const refresh = reactExports.useCallback(
    () => setRefreshVersion((version2) => version2 + 1),
    [],
  );
  return {
    nodes,
    loading,
    error,
    userMessage,
    membershipError,
    hasMore,
    degraded,
    folderPathsById,
    loadMore,
    refresh,
  };
}
