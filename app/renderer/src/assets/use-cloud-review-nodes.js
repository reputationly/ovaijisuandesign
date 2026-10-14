// use-cloud-review-nodes.js
import reactExports from "react";
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
  const data = await requestJson(
    `/api/v1/cloud-folder/review-nodes?${params}`,
  );
  return {
    nodes: mapNodes(data.nodes),
    nextCursor: typeof data.next_cursor === "string" ? data.next_cursor : "",
    hasMore: data.has_more === true,
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
        const all = [];
        let cursor = "";
        for (let page = 0; page < REVIEW_NODES_MAX_PAGES; page++) {
          const data = await listCloudReviewNodes(projectId, cursor || void 0);
          all.push(...data.nodes);
          if (!data.hasMore) break;
          cursor = data.nextCursor;
        }
        if (epoch === epochRef.current) setNodes(all);
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
    () => nodes.filter((node) => node.review === "reviewing").length,
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
    const ids = new Set();
    for (const item of transfers) {
      if (
        item.cloudProjectId === cloudProjectId &&
        item.kind === "download" &&
        item.nodeId &&
        (item.status === "pending" || item.status === "downloading")
      ) {
        ids.add(item.nodeId);
      }
    }
    return ids;
  }, [transfers, cloudProjectId]);
}
export function normalizeCloudParentId(parentId) {
  return parentId === "0" ? "" : parentId;
}
export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const unitIndex = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  return `${(bytes / 1024 ** unitIndex).toFixed(1)} ${units[unitIndex]}`;
}
export function isCloudFileDownloadEnabled(node, syncState) {
  return (
    node.kind === "file" &&
    node.review === "pass" &&
    Boolean(node.cdnUrl) &&
    syncState !== "downloading"
  );
}
export function resolveSyncState(node, syncMap, downloadingIds) {
  if (node.kind !== "file" || node.review !== "pass") return void 0;
  if (downloadingIds.has(node.id)) return "downloading";
  const snapshot = syncMap.get(node.id);
  if (snapshot === void 0) return "notDownloaded";
  return snapshot < node.updatedAt ? "stale" : "synced";
}
export function filterMoveOptions(options, movedFolderSegments) {
  if (!movedFolderSegments || movedFolderSegments.length === 0) return options;
  return options.filter((option) => {
    if (option.key === ROOT_KEY) return true;
    if (option.segments.length < movedFolderSegments.length) return true;
    return !movedFolderSegments.every(
      (segment, index) => option.segments[index] === segment,
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
export function useCloudMoveOptions(projectId, active) {
  const [options, setOptions] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(false);
  reactExports.useEffect(() => {
    if (!active || !projectId) return;
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
  }, [active, projectId]);
  return {
    options,
    loading,
  };
}
export function useStableCallback(callback) {
  const ref = reactExports.useRef(callback);
  reactExports.useInsertionEffect(() => {
    ref.current = callback;
  });
  return reactExports.useCallback((...args) => ref.current(...args), []);
}
