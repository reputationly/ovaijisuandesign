// use-cloud-review-nodes.js
import { reactExports } from "../vendor.js";
import {
  listAllCloudFolders,
  mapNodes,
  requestJson,
  ROOT_KEY,
} from "./list-all-cloud-folders.js";
import { listProjectMembers } from "../workspace/asset-lineage-query-key.js";
async function listCloudReviewNodes(projectId, cursor) {
  const params = new URLSearchParams({
    project_id: projectId,
    page_size: "100",
  });
  if (cursor) params.set("cursor", cursor);
  const data2 = await requestJson(
    `/api/v1/cloud-folder/review-nodes?${params}`,
  );
  return {
    nodes: mapNodes(data2.nodes),
    nextCursor: typeof data2.next_cursor === "string" ? data2.next_cursor : "",
    hasMore: data2.has_more === true,
  };
}
const REVIEW_NODES_MAX_PAGES = 10;
export function useCloudReviewNodes(projectId) {
  const [nodes, setNodes] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(false);
  const epochRef = reactExports.useRef(0);
  const refresh = reactExports.useCallback(() => {
    const epoch = ++epochRef.current;
    if (!projectId) {
      setNodes([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    void (async () => {
      try {
        const all2 = [];
        let cursor = "";
        for (let page = 0; page < REVIEW_NODES_MAX_PAGES; page++) {
          const data2 = await listCloudReviewNodes(projectId, cursor || void 0);
          all2.push(...data2.nodes);
          if (!data2.hasMore) break;
          cursor = data2.nextCursor;
        }
        if (epoch === epochRef.current) setNodes(all2);
      } catch {
      } finally {
        if (epoch === epochRef.current) setLoading(false);
      }
    })();
  }, [projectId]);
  reactExports.useEffect(() => {
    refresh();
  }, [refresh]);
  const activeCount = reactExports.useMemo(
    () => nodes.filter((node2) => node2.review === "reviewing").length,
    [nodes],
  );
  return {
    nodes,
    loading,
    activeCount,
    refresh,
  };
}
export function useProjectMemberNames(projectId) {
  const [names, setNames] = reactExports.useState(new Map());
  reactExports.useEffect(() => {
    if (!projectId) {
      setNames(new Map());
      return;
    }
    let disposed = false;
    void listProjectMembers(projectId)
      .then((members) => {
        if (disposed) return;
        setNames(
          new Map(members.map((member) => [member.userId, member.nickname])),
        );
      })
      .catch(() => {});
    return () => {
      disposed = true;
    };
  }, [projectId]);
  return names;
}
export function useDownloadingNodeIds(transfers, cloudProjectId) {
  return reactExports.useMemo(() => {
    const ids2 = new Set();
    for (const item of transfers) {
      if (
        item.cloudProjectId === cloudProjectId &&
        item.kind === "download" &&
        item.nodeId &&
        (item.status === "pending" || item.status === "downloading")
      ) {
        ids2.add(item.nodeId);
      }
    }
    return ids2;
  }, [transfers, cloudProjectId]);
}
export function normalizeCloudParentId(parentId) {
  return parentId === "0" ? "" : parentId;
}
export function formatBytes(bytes2) {
  if (!Number.isFinite(bytes2) || bytes2 <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i2 = Math.min(
    Math.floor(Math.log(bytes2) / Math.log(1024)),
    units.length - 1,
  );
  return `${(bytes2 / 1024 ** i2).toFixed(1)} ${units[i2]}`;
}
export function isCloudFileDownloadEnabled(node2, syncState) {
  return (
    node2.kind === "file" &&
    node2.review === "pass" &&
    Boolean(node2.cdnUrl) &&
    syncState !== "downloading"
  );
}
export function resolveSyncState(node2, syncMap, downloadingIds) {
  if (node2.kind !== "file" || node2.review !== "pass") return void 0;
  if (downloadingIds.has(node2.id)) return "downloading";
  const snapshot2 = syncMap.get(node2.id);
  if (snapshot2 === void 0) return "notDownloaded";
  return snapshot2 < node2.updatedAt ? "stale" : "synced";
}
export function filterMoveOptions(options, movedFolderSegments) {
  if (!movedFolderSegments || movedFolderSegments.length === 0) return options;
  return options.filter((option2) => {
    if (option2.key === ROOT_KEY) return true;
    if (option2.segments.length < movedFolderSegments.length) return true;
    return !movedFolderSegments.every(
      (segment, index2) => option2.segments[index2] === segment,
    );
  });
}
export function localFolderOptions(relPaths) {
  return [
    {
      key: ROOT_KEY,
      segments: [],
    },
    ...relPaths.map((rel) => ({
      key: rel,
      segments: rel.split("/"),
    })),
  ];
}
export function useCloudMoveOptions(projectId, active2) {
  const [options, setOptions] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(false);
  reactExports.useEffect(() => {
    if (!active2 || !projectId) return;
    let disposed = false;
    setLoading(true);
    void listAllCloudFolders(projectId)
      .then((cloud) => {
        if (disposed) return;
        setOptions([
          {
            key: ROOT_KEY,
            segments: [],
          },
          ...cloud.map((folder) => ({
            key: folder.id,
            segments: folder.segments,
          })),
        ]);
      })
      .catch(() => {
        if (!disposed)
          setOptions([
            {
              key: ROOT_KEY,
              segments: [],
            },
          ]);
      })
      .finally(() => {
        if (!disposed) setLoading(false);
      });
    return () => {
      disposed = true;
    };
  }, [active2, projectId]);
  return {
    options,
    loading,
  };
}
export function useStableCallback(fn2) {
  const ref = reactExports.useRef(fn2);
  reactExports.useInsertionEffect(() => {
    ref.current = fn2;
  });
  return reactExports.useCallback((...args) => ref.current(...args), []);
}
