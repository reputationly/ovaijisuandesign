// use-cloud-search.js
import { reactExports } from "../vendor.js";
import { GatewayHttpError, gatewayFetch } from "../infra/agent-ws-client.jsx";
import { CloudNodeReviewStatus, CloudNodeType } from "../generation/push-inline.js";
import {
  CloudProjectRequestError,
  cloudErrorDisplayMessage,
} from "../workspace/record-recent-workspace-opened.jsx";
export const ROOT_KEY = "__root__";
function isCloudProjectMembershipError(err) {
  return err instanceof CloudProjectRequestError && err.status === 403;
}
export const cloudAssetsChangedListeners = new Set();
export function onDidChangeCloudAssets(listener) {
  cloudAssetsChangedListeners.add(listener);
  return {
    dispose: () => cloudAssetsChangedListeners.delete(listener),
  };
}
function mapReview(raw2) {
  const value = Number(raw2 ?? 0);
  if (value === CloudNodeReviewStatus.CLOUD_NODE_REVIEW_STATUS_BLOCK) return "block";
  if (value === CloudNodeReviewStatus.CLOUD_NODE_REVIEW_STATUS_REVIEWING) return "reviewing";
  return "pass";
}
export function mapCloudNode(raw2) {
  if (!raw2 || typeof raw2.id !== "string" || !raw2.id) return null;
  const isFolder = Number(raw2.type) === CloudNodeType.CLOUD_NODE_TYPE_FOLDER;
  return {
    id: raw2.id,
    projectId: typeof raw2.project_id === "string" ? raw2.project_id : "",
    uploaderId: typeof raw2.uploader_id === "string" ? raw2.uploader_id : "",
    parentId: typeof raw2.parent_id === "string" ? raw2.parent_id : "",
    kind: isFolder ? "folder" : "file",
    name: typeof raw2.name === "string" ? raw2.name : "",
    mimeType: typeof raw2.mime_type === "string" ? raw2.mime_type : "",
    size: Number(raw2.size ?? 0),
    cdnUrl: typeof raw2.cdn_url === "string" ? raw2.cdn_url : "",
    totalFileCount: Number(raw2.total_file_count ?? 0),
    totalSize: Number(raw2.total_size ?? 0),
    review: isFolder ? "pass" : mapReview(raw2.review_status),
    createdAt: Number(raw2.created_at ?? 0),
    updatedAt: Number(raw2.updated_at ?? 0),
  };
}
function mapNodes(raw2) {
  if (!Array.isArray(raw2)) return [];
  return raw2.map((node2) => mapCloudNode(node2)).filter((node2) => node2 !== null);
}
export async function requestJson(path2, init2) {
  let resp;
  try {
    resp = await gatewayFetch(path2, init2);
  } catch (err) {
    if (err instanceof GatewayHttpError) {
      throw new CloudProjectRequestError(err.status, err.userMessage);
    }
    throw err;
  }
  return await resp.json().catch(() => ({}));
}
export async function listCloudFolderChildren(projectId, nodeId, cursor, pageSize = 100) {
  const params = new URLSearchParams({
    project_id: projectId,
    node_id: nodeId,
    page_size: String(pageSize),
  });
  if (cursor) params.set("cursor", cursor);
  const data2 = await requestJson(`/api/v1/cloud-folder/nodes?${params}`);
  return {
    nodes: mapNodes(data2.nodes),
    nextCursor: typeof data2.next_cursor === "string" ? data2.next_cursor : "",
    hasMore: data2.has_more === true,
  };
}
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
export async function getCloudStorageUsage(projectId) {
  const params = new URLSearchParams({
    project_id: projectId,
  });
  const data2 = await requestJson(`/api/v1/cloud-folder/storage?${params}`);
  return {
    totalBytes: Number(data2.total_bytes ?? 0),
    usedBytes: Number(data2.used_bytes ?? 0),
  };
}
export async function moveCloudNode(nodeId, newParentId) {
  await requestJson(`/api/v1/cloud-folder/nodes/${encodeURIComponent(nodeId)}/move`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      new_parent_id: newParentId,
    }),
  });
}
export async function deleteCloudNode(nodeId) {
  await requestJson(`/api/v1/cloud-folder/nodes/${encodeURIComponent(nodeId)}`, {
    method: "DELETE",
  });
}
export async function listAllCloudFolders(projectId) {
  const result = [];
  const queue = [
    {
      id: "",
      parentId: "",
      name: "",
      segments: [],
    },
  ];
  while (queue.length > 0) {
    const current2 = queue.shift();
    if (!current2) break;
    let cursor = "";
    do {
      const page = await listCloudFolderChildren(projectId, current2.id, cursor || void 0);
      for (const node2 of page.nodes) {
        if (node2.kind !== "folder") continue;
        const option2 = {
          id: node2.id,
          parentId: node2.parentId,
          name: node2.name,
          segments: [...current2.segments, node2.name],
        };
        result.push(option2);
        queue.push(option2);
      }
      cursor = page.hasMore ? page.nextCursor : "";
    } while (cursor);
  }
  return result;
}
export async function debugDumpCloudProjectAssets(projectId) {
  const calls = [];
  const errorText = (err) => ({
    error: err instanceof Error ? err.message : String(err),
  });
  const record2 = async (url2, context) => {
    const entry = {
      seq: calls.length + 1,
      method: "GET",
      url: url2,
      response: null,
    };
    if (context) entry.context = context;
    calls.push(entry);
    try {
      const data2 = await requestJson(url2);
      entry.response = data2;
      return data2;
    } catch (err) {
      entry.response = errorText(err);
      return void 0;
    }
  };
  const queue = [
    {
      id: "",
      path: "/",
    },
  ];
  while (queue.length > 0) {
    const current2 = queue.shift();
    if (!current2) break;
    let cursor = "";
    do {
      const params = new URLSearchParams({
        project_id: projectId,
        node_id: current2.id,
        page_size: "100",
      });
      if (cursor) params.set("cursor", cursor);
      const page = await record2(`/api/v1/cloud-folder/nodes?${params}`, current2.path);
      if (!page) break;
      for (const node2 of Array.isArray(page.nodes) ? page.nodes : []) {
        if (
          node2 &&
          typeof node2.id === "string" &&
          node2.id &&
          Number(node2.type) === CloudNodeType.CLOUD_NODE_TYPE_FOLDER
        ) {
          queue.push({
            id: node2.id,
            path: `${current2.path}${node2.name}/`,
          });
        }
      }
      cursor =
        page.has_more === true && typeof page.next_cursor === "string" ? page.next_cursor : "";
    } while (cursor);
  }
  await record2(
    `/api/v1/cloud-folder/storage?${new URLSearchParams({
      project_id: projectId,
    })}`,
  );
  let reviewCursor = "";
  do {
    const params = new URLSearchParams({
      project_id: projectId,
      page_size: "100",
    });
    if (reviewCursor) params.set("cursor", reviewCursor);
    const page = await record2(`/api/v1/cloud-folder/review-nodes?${params}`);
    if (!page) break;
    reviewCursor =
      page.has_more === true && typeof page.next_cursor === "string" ? page.next_cursor : "";
  } while (reviewCursor);
  return {
    project_id: projectId,
    fetched_at: new Date().toISOString(),
    calls,
  };
}
export async function listCloudReviewNodes(projectId, cursor) {
  const params = new URLSearchParams({
    project_id: projectId,
    page_size: "100",
  });
  if (cursor) params.set("cursor", cursor);
  const data2 = await requestJson(`/api/v1/cloud-folder/review-nodes?${params}`);
  return {
    nodes: mapNodes(data2.nodes),
    nextCursor: typeof data2.next_cursor === "string" ? data2.next_cursor : "",
    hasMore: data2.has_more === true,
  };
}
function getWindowBridge() {
  const platform2 = window.__HILO_PLATFORM__;
  return platform2?.window;
}
export function useHideWindowButtons() {
  reactExports.useEffect(() => {
    const bridge = getWindowBridge();
    bridge?.setWindowButtonVisibility?.(false);
    return () => {
      bridge?.setWindowButtonVisibility?.(true);
    };
  }, []);
}
const IMAGE_EXT$1 = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "bmp",
  "heic",
  "svg",
  "avif",
  "tiff",
]);
const VIDEO_EXT$1 = new Set(["mp4", "mov", "webm", "mkv", "avi", "m4v"]);
const AUDIO_EXT$1 = new Set(["mp3", "wav", "flac", "aac", "m4a", "ogg", "opus"]);
const ARCHIVE_EXT = new Set(["zip", "7z", "rar", "tar", "gz", "tgz", "bz2"]);
const DOC_EXT = new Set([
  "txt",
  "md",
  "json",
  "yaml",
  "yml",
  "csv",
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "htable",
  "rtf",
]);
const CODE_EXT = new Set([
  "ts",
  "tsx",
  "js",
  "jsx",
  "mjs",
  "cjs",
  "py",
  "go",
  "rs",
  "java",
  "kt",
  "swift",
  "c",
  "cc",
  "cpp",
  "h",
  "hpp",
  "sh",
  "bash",
  "zsh",
  "rb",
  "php",
  "lua",
  "html",
  "css",
  "scss",
  "sql",
]);
export function resolveTypeBucket(input) {
  if (input.kind === "folder") return "folder";
  const mime = input.mime ?? "";
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  const ext = input.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ext) return "other";
  if (IMAGE_EXT$1.has(ext)) return "image";
  if (VIDEO_EXT$1.has(ext)) return "video";
  if (AUDIO_EXT$1.has(ext)) return "audio";
  if (ARCHIVE_EXT.has(ext)) return "archive";
  if (CODE_EXT.has(ext)) return "code";
  if (DOC_EXT.has(ext)) return "document";
  return "other";
}
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
        const page = await listCloudFolderChildren(projectId, folderId, pageCursor || void 0);
        if (epoch !== epochRef.current) return;
        setNodes((previous2) => (append2 ? [...previous2, ...page.nodes] : page.nodes));
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
      if (refreshInFlightRef.current === promise) refreshInFlightRef.current = null;
    });
  }, [currentFolderId, load2, projectId]);
  const loadMore = reactExports.useCallback(() => {
    if (!hasMore || loading) return;
    void load2(currentFolderId, cursor, true);
  }, [cursor, currentFolderId, hasMore, load2, loading]);
  const folderSegments = reactExports.useMemo(() => stack.map((crumb) => crumb.name), [stack]);
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
  const [folderPathsById, setFolderPathsById] = reactExports.useState(new Map());
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
        const page = await searchCloudNodes(projectId, keyword2, pageCursor || void 0);
        if (epoch !== epochRef.current) return;
        setNodes((previous2) => (append2 ? [...previous2, ...page.nodes] : page.nodes));
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
      void Promise.all([searchCloudNodes(projectId, keyword2), listAllCloudFolders(projectId)])
        .then(([page, folders]) => {
          if (epoch !== epochRef.current) return;
          setNodes(page.nodes);
          setCursor(page.nextCursor);
          setHasMore(page.hasMore);
          setDegraded(page.degraded);
          const foldersById = new Map(folders.map((folder) => [folder.id, folder]));
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
  const refresh = reactExports.useCallback(() => setRefreshVersion((version2) => version2 + 1), []);
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
