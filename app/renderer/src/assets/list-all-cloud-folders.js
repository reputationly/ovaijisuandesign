// list-all-cloud-folders.js
import { CloudNodeType } from "../generation/normalize-skill-detail-metadata.js";
import { GatewayHttpError } from "../infra/gateway-http-error.jsx";
import { gatewayFetch } from "../infra/gateway-fetch.js";
import { CloudProjectRequestError } from "../workspace/asset-lineage-query-key.js";
var CloudNodeReviewStatus = ((CloudNodeReviewStatus2) => {
  CloudNodeReviewStatus2[
    (CloudNodeReviewStatus2["CLOUD_NODE_REVIEW_STATUS_UNSPECIFIED"] = 0)
  ] = "CLOUD_NODE_REVIEW_STATUS_UNSPECIFIED";
  CloudNodeReviewStatus2[
    (CloudNodeReviewStatus2["CLOUD_NODE_REVIEW_STATUS_REVIEWING"] = 100)
  ] = "CLOUD_NODE_REVIEW_STATUS_REVIEWING";
  CloudNodeReviewStatus2[
    (CloudNodeReviewStatus2["CLOUD_NODE_REVIEW_STATUS_PASS"] = 200)
  ] = "CLOUD_NODE_REVIEW_STATUS_PASS";
  CloudNodeReviewStatus2[
    (CloudNodeReviewStatus2["CLOUD_NODE_REVIEW_STATUS_BLOCK"] = 300)
  ] = "CLOUD_NODE_REVIEW_STATUS_BLOCK";
  CloudNodeReviewStatus2[(CloudNodeReviewStatus2["UNRECOGNIZED"] = -1)] =
    "UNRECOGNIZED";
  return CloudNodeReviewStatus2;
})(CloudNodeReviewStatus || {});
export const ROOT_KEY = "__root__";
export function isCloudProjectMembershipError(err) {
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
  if (value === CloudNodeReviewStatus.CLOUD_NODE_REVIEW_STATUS_BLOCK)
    return "block";
  if (value === CloudNodeReviewStatus.CLOUD_NODE_REVIEW_STATUS_REVIEWING)
    return "reviewing";
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
export function mapNodes(raw2) {
  if (!Array.isArray(raw2)) return [];
  return raw2
    .map((node2) => mapCloudNode(node2))
    .filter((node2) => node2 !== null);
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
export async function listCloudFolderChildren(
  projectId,
  nodeId,
  cursor,
  pageSize = 100,
) {
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
  await requestJson(
    `/api/v1/cloud-folder/nodes/${encodeURIComponent(nodeId)}/move`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        new_parent_id: newParentId,
      }),
    },
  );
}
export async function deleteCloudNode(nodeId) {
  await requestJson(
    `/api/v1/cloud-folder/nodes/${encodeURIComponent(nodeId)}`,
    {
      method: "DELETE",
    },
  );
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
      const page = await listCloudFolderChildren(
        projectId,
        current2.id,
        cursor || void 0,
      );
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
const IMAGE_EXT = new Set([
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
const VIDEO_EXT = new Set(["mp4", "mov", "webm", "mkv", "avi", "m4v"]);
const AUDIO_EXT = new Set(["mp3", "wav", "flac", "aac", "m4a", "ogg", "opus"]);
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
  if (IMAGE_EXT.has(ext)) return "image";
  if (VIDEO_EXT.has(ext)) return "video";
  if (AUDIO_EXT.has(ext)) return "audio";
  if (ARCHIVE_EXT.has(ext)) return "archive";
  if (CODE_EXT.has(ext)) return "code";
  if (DOC_EXT.has(ext)) return "document";
  return "other";
}
