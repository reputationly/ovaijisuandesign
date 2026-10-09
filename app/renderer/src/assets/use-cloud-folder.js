// use-cloud-folder.js
import { reactExports } from "../vendor.js";
import {
  isCloudProjectMembershipError,
  listCloudFolderChildren,
} from "./list-all-cloud-folders.js";

export function useCloudFolder(projectId) {
  const [stack, setStack] = reactExports.useState([]);
  const [nodes, setNodes] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(false);
  const [hasLoaded, setHasLoaded] = reactExports.useState(false);
  const [error, setError] = reactExports.useState(void 0);
  const [membershipError, setMembershipError] = reactExports.useState(false);
  const [cursor, setCursor] = reactExports.useState("");
  const [hasMore, setHasMore] = reactExports.useState(false);
  const epochRef = reactExports.useRef(0);
  const refreshInFlightRef = reactExports.useRef(null);
  const refreshPendingRef = reactExports.useRef(false);
  const refreshScopeRef = reactExports.useRef("");
  const currentFolderId = stack.length === 0 ? "" : stack[stack.length - 1].id;
  const load2 = reactExports.useCallback(
    async (folderId, pageCursor, append2) => {
      if (!projectId) return;
      const epoch = ++epochRef.current;
      setLoading(true);
      if (!append2) {
        setError(void 0);
        setMembershipError(false);
      }
      try {
        const page = await listCloudFolderChildren(
          projectId,
          folderId,
          pageCursor || void 0,
        );
        if (epoch !== epochRef.current) return;
        setNodes((previous2) =>
          append2 ? [...previous2, ...page.nodes] : page.nodes,
        );
        setCursor(page.nextCursor);
        setHasMore(page.hasMore);
      } catch (err) {
        if (epoch !== epochRef.current) return;
        setError(err instanceof Error ? err.message : String(err));
        setMembershipError(isCloudProjectMembershipError(err));
        if (!append2) {
          setNodes([]);
          setHasMore(false);
        }
      } finally {
        if (epoch === epochRef.current) {
          if (!append2) setHasLoaded(true);
          setLoading(false);
        }
      }
    },
    [projectId],
  );
  reactExports.useEffect(() => {
    refreshScopeRef.current = `${projectId ?? ""}\0${currentFolderId}`;
    refreshPendingRef.current = false;
    refreshInFlightRef.current = null;
    setNodes([]);
    setCursor("");
    setHasMore(false);
    setHasLoaded(false);
    void load2(currentFolderId, "", false);
  }, [currentFolderId, load2, projectId]);
  const enterFolder = reactExports.useCallback((node2) => {
    if (node2.kind !== "folder") return;
    setStack((previous2) => [
      ...previous2,
      {
        id: node2.id,
        name: node2.name,
      },
    ]);
  }, []);
  const goToCrumb = reactExports.useCallback((index2) => {
    setStack((previous2) => (index2 < 0 ? [] : previous2.slice(0, index2 + 1)));
  }, []);
  const goToFolderPath = reactExports.useCallback((nextStack) => {
    setStack([...nextStack]);
  }, []);
  const refresh = reactExports.useCallback(() => {
    const scope = `${projectId ?? ""}\0${currentFolderId}`;
    if (refreshInFlightRef.current && refreshScopeRef.current === scope) {
      refreshPendingRef.current = true;
      return;
    }
    refreshScopeRef.current = scope;
    refreshPendingRef.current = false;
    const promise = (async () => {
      do {
        refreshPendingRef.current = false;
        await load2(currentFolderId, "", false);
      } while (refreshPendingRef.current && refreshScopeRef.current === scope);
    })();
    refreshInFlightRef.current = promise;
    void promise.finally(() => {
      if (refreshInFlightRef.current === promise)
        refreshInFlightRef.current = null;
    });
  }, [currentFolderId, load2, projectId]);
  const loadMore = reactExports.useCallback(() => {
    if (!hasMore || loading) return;
    void load2(currentFolderId, cursor, true);
  }, [cursor, currentFolderId, hasMore, load2, loading]);
  const folderSegments = reactExports.useMemo(
    () => stack.map((crumb) => crumb.name),
    [stack],
  );
  return {
    stack,
    nodes,
    loading,
    hasLoaded,
    error,
    membershipError,
    hasMore,
    currentFolderId,
    folderSegments,
    enterFolder,
    goToCrumb,
    goToFolderPath,
    refresh,
    loadMore,
  };
}
