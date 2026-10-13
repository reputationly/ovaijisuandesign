// from-vendor.js
// 从打包文件里搬出的第一方语句。它们不引用仍留在那里的库代码。
import reactExports from "react";
import { max, min } from "@floating-ui/utils";

export const CanvasNodeType = {
  Image: "image",
  Video: "video",
  Audio: "audio",
  Text: "text",
  File: "file",
  Placeholder: "placeholder",
  Table: "table",
  Group: "group",
  Sticker: "sticker"
};

export const GROUP_LABEL_MAX_LENGTH = 40;

export const SIZE_STROKE_WIDTH_MAP = {
  12: 1.33,
  14: 1.33,
  16: 1.67,
  20: 2.33,
  24: 2.67,
  32: 3
};

export const getDefaultStrokeWidth = size => {
  const sizeNum = typeof size === "string" ? parseInt(size, 10) : size;
  if (SIZE_STROKE_WIDTH_MAP[sizeNum] !== void 0) {
    return SIZE_STROKE_WIDTH_MAP[sizeNum];
  }
  if (sizeNum <= 14) return 1.33;
  if (sizeNum <= 16) return 1.67;
  if (sizeNum <= 20) return 2.33;
  if (sizeNum <= 24) return 2.67;
  return 3;
};

export const HILO_APP_ID = "3001";

export const HILO_BIZ_ID = "0";

export const HILO_DEFAULT_VERSION_CODE = "0.1.0";

export const VERSION_CODE_SEMVER_CORE_PATTERN = /^v?(\d+\.\d+\.\d+)(?:[-+].*)?$/;

export function normalizeVersionCodeForCloud(version) {
  const trimmed = version.trim();
  const match = VERSION_CODE_SEMVER_CORE_PATTERN.exec(trimmed);
  return match?.[1] ?? trimmed;
}

export const ASSET_MODEL_USER_UPLOADED = "user_uploaded";

export const ASSET_MODEL_IMPORTED = "imported";

export function isUserProvidedAssetModel(model) {
  return model === ASSET_MODEL_USER_UPLOADED || model === ASSET_MODEL_IMPORTED;
}

export function regionToLocale(region) {
  return region === "overseas" ? "en" : "zh";
}

export const RUNTIME_CONFIG_KEY = "__HILO_CONFIG__";

export const DEFAULT_RUNTIME_CONFIG = {
  gatewayUrl: "http://localhost:8001",
  wsUrl: "ws://localhost:8001/ws",
  env: "development",
  channel: "dev",
  region: "domestic",
  appVersion: "0.0.0",
  domain: "https://hailuo-pre.xaminim.com",
  downloadSource: "default"
};

export function parseSemver(version) {
  const match = version.trim().replace(/^v/i, "").match(/^(\d+)\.(\d+)\.(\d+)(?:-([\w.]+))?(?:\+.*)?$/);
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] ?? null
  };
}

export function compareSemver(a, b) {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  if (!pa || !pb) return 0;
  if (pa.major !== pb.major) return pa.major - pb.major;
  if (pa.minor !== pb.minor) return pa.minor - pb.minor;
  return pa.patch - pb.patch;
}

export const CONNECTOR_TOKEN_SOURCE = String.raw`@connector:([a-zA-Z0-9_.-]{1,80})(?:\[([\p{Script=Han}a-zA-Z0-9_. -]{1,80})\])?(?=\s|$)`;

export const MEDIA_EXTENSIONS = {
  ".png": "image",
  ".jpg": "image",
  ".jpeg": "image",
  ".webp": "image",
  ".gif": "image",
  ".bmp": "image",
  ".svg": "image",
  ".heic": "image",
  ".heif": "image",
  ".avif": "image",
  ".mp4": "video",
  ".mov": "video",
  ".avi": "video",
  ".mkv": "video",
  ".webm": "video",
  ".mp3": "audio",
  ".wav": "audio",
  ".aac": "audio",
  ".flac": "audio",
  ".ogg": "audio",
  ".m4a": "audio",
  ".txt": "text",
  ".md": "text",
  ".json": "text",
  ".pdf": "file",
  ".docx": "file",
  ".csv": "file",
  ".xlsx": "file",
  ".pptx": "file",
  // Hub-internal table document — produced by the canvas table node and
  // attached via "add to chat". Treated as a generic file so the chat shows
  // a file-icon chip instead of trying to render the JSON as an image.
  ".htable": "file"
};

export function inferMediaKind(mime, ext) {
  if (mime?.startsWith("image/")) return "image";
  if (mime?.startsWith("video/")) return "video";
  if (mime?.startsWith("audio/")) return "audio";
  if (mime === "text/markdown" || mime === "text/plain") return "text";
  if (mime === "application/pdf" || mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || mime === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" || mime === "application/vnd.openxmlformats-officedocument.presentationml.presentation" || mime === "text/csv") return "file";
  if (!ext) return "file";
  const key = (ext.startsWith(".") ? ext : `.${ext}`).toLowerCase();
  return MEDIA_EXTENSIONS[key] ?? "file";
}

export const LIBTV_CONNECTOR = {
  id: "libtv",
  url: "https://mcp.liblib.tv/mcp"
};

export const MEDIA_LINEAGE_REQUEST_HEADER = "x-request-id";

export const MEDIA_LINEAGE_MAX_HASH_BYTES = 8 * 1024 * 1024;

export const MEDIA_LINEAGE_HEADER_BYTES = 32;

export const MEDIA_LINEAGE_MAX_REFERENCES = 32;

export const MEDIA_LINEAGE_MAX_TEXT = 192;

export function mediaLineageToken(value) {
  return typeof value === "string" && /^[\w.:-]{1,128}$/.test(value) ? value : void 0;
}

export function mediaLineagePath(value) {
  if (typeof value !== "string" || !value) return void 0;
  const input = value.trim();
  if (/^data:/i.test(input)) return "<inline>";
  if (/^(?:https?:|blob:|\/\/)/i.test(input)) return "<remote>";
  if (/^asset:/i.test(input)) return "<asset-reference>";
  if (/^[a-z][a-z\d+.-]*:/i.test(input) && !/^[a-z]:[/\\]/i.test(input)) {
    return "<external-reference>";
  }
  const clean = input.split(/[?#]/, 1)[0].replaceAll("\\", "/");
  const segments = clean.split("/");
  const relative = clean.startsWith("/") || /^[a-z]:\//i.test(clean) || segments.includes("..") ? `<external>/${segments.at(-1) ?? ""}` : clean;
  return relative.replace(/[\u0000-\u001f\u007f]/g, "_").slice(0, MEDIA_LINEAGE_MAX_TEXT);
}

export function mediaLineageFilename(value) {
  const safe = mediaLineagePath(value);
  return safe?.split("/").at(-1);
}

export function mediaLineageFormat(bytes) {
  const prefix = (...signature) => signature.every((value, index) => bytes[index] === value);
  const ascii = (offset, value) => [...value].every((char, index) => bytes[offset + index] === char.charCodeAt(0));
  if (prefix(137, 80, 78, 71, 13, 10, 26, 10)) return "png";
  if (prefix(255, 216, 255)) return "jpeg";
  if (ascii(0, "GIF87a") || ascii(0, "GIF89a")) return "gif";
  if (ascii(0, "RIFF") && ascii(8, "WEBP")) return "webp";
  if (ascii(0, "BM")) return "bmp";
  if (prefix(73, 73, 42, 0) || prefix(77, 77, 0, 42)) return "tiff";
  if (ascii(4, "ftyp")) {
    if (["heic", "heix", "hevc", "hevx", "mif1", "msf1"].some(brand => ascii(8, brand))) return "heif";
    if (ascii(8, "avif") || ascii(8, "avis")) return "avif";
  }
  return "unknown";
}

export function finite$1(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : void 0;
}

export function mediaLineageFields(record) {
  const fields = {
    schema: 1,
    stage: mediaLineageToken(record.stage) ?? "unknown"
  };
  for (const key of ["requestId", "generationAttemptId", "nodeId", "sourceNodeId", "assetId", "source", "backend", "modelId", "errorKind", "errorCode", "decoderReason"]) {
    const value = mediaLineageToken(record[key]);
    if (value) fields[key] = value;
  }
  for (const key of ["referenceIndex", "referenceCount", "omittedCount", "durationMs"]) {
    const value = finite$1(record[key]);
    if (value !== void 0) fields[key] = value;
  }
  const filename = mediaLineageFilename(record.filename);
  const relativePath = mediaLineagePath(record.path);
  if (filename) fields.filename = filename;
  if (relativePath) fields.path = relativePath;
  if (record.declaredMime && /^[\w.+-]+\/[\w.+-]{1,80}$/.test(record.declaredMime)) fields.declaredMime = record.declaredMime;
  if (typeof record.bytesMatch === "boolean") fields.bytesMatch = record.bytesMatch;
  for (const phase of ["input", "stored", "output"]) {
    const fingerprint = record[phase];
    if (!fingerprint) continue;
    fields[`${phase}HashStatus`] = ["full", "size-limit", "busy", "unavailable", "changed"].includes(fingerprint.hashStatus) ? fingerprint.hashStatus : "unavailable";
    const size = finite$1(fingerprint.sizeBytes);
    if (size !== void 0) fields[`${phase}SizeBytes`] = size;
    const format = mediaLineageToken(fingerprint.detectedFormat);
    if (format) fields[`${phase}Format`] = format;
    if (/^[a-f\d]{64}$/i.test(fingerprint.sha256 ?? "") && fingerprint.hashStatus === "full") fields[`${phase}Sha256`] = fingerprint.sha256;
  }
  return fields;
}

export function mediaLineageError(error) {
  try {
    const record = typeof error === "object" && error !== null ? error : void 0;
    const message = error instanceof Error ? error.message : "";
    const decoderReason = /premature end of data segment/i.test(message) ? "jpeg-premature-end" : /VipsJpeg:|jpegload/i.test(message) ? "jpeg-decode" : /pngload|vipspng/i.test(message) ? "png-decode" : /webpload/i.test(message) ? "webp-decode" : void 0;
    return {
      errorKind: error instanceof Error ? mediaLineageToken(error.name) : typeof error,
      errorCode: record ? mediaLineageToken(Reflect.get(record, "code")) : void 0,
      decoderReason
    };
  } catch {
    return {
      errorKind: "unknown"
    };
  }
}

export function isMediaLineageImage(filename, mime) {
  return /^image\//i.test(mime ?? "") || /\.(?:png|jpe?g|webp|gif|bmp|tiff?|heic|heif|avif)$/i.test(filename);
}

export const HILO_WORKSPACE_IDENTITY_HEADER = "x-hilo-workspace";

export const HILO_WORKSPACE_IDENTITY_QUERY = "hilo_workspace";

export const HILO_WORKSPACE_INSTANCE_HEADER = "x-hilo-workspace-instance";

export const HILO_WORKSPACE_INSTANCE_QUERY = "hilo_workspace_instance";

export const HILO_WORKSPACE_GENERATION_HEADER = "x-hilo-workspace-generation";

export const HILO_WORKSPACE_GENERATION_QUERY = "hilo_workspace_generation";

export const HILO_CANVAS_WRITER_REVISION_HEADER = "x-hilo-canvas-writer-revision";

export const WORKSPACE_IDENTITY_MISMATCH_CODE = "WORKSPACE_IDENTITY_MISMATCH";

export const WORKSPACE_IDENTITY_REQUIRED_CODE = "WORKSPACE_IDENTITY_REQUIRED";

export function workspaceGatewayIdentityHeaders(binding) {
  return {
    [HILO_WORKSPACE_IDENTITY_HEADER]: binding.claim,
    [HILO_WORKSPACE_INSTANCE_HEADER]: binding.instanceId,
    [HILO_WORKSPACE_GENERATION_HEADER]: String(binding.generation)
  };
}

export function isWorkspaceIdentityErrorCode(value) {
  return value === WORKSPACE_IDENTITY_MISMATCH_CODE || value === WORKSPACE_IDENTITY_REQUIRED_CODE;
}

export function encodePath(filePath) {
  return filePath.split("/").map(encodeURIComponent).join("/");
}

export const DEFAULT_VIDEO_PLAYBACK_MAX_HEIGHT = 1080;

export const VIDEO_PLAYBACK_IDENTITY_QUERY_KEYS = [HILO_WORKSPACE_IDENTITY_QUERY, HILO_WORKSPACE_INSTANCE_QUERY, HILO_WORKSPACE_GENERATION_QUERY];

export function videoPlaybackPath(source, maxHeight = DEFAULT_VIDEO_PLAYBACK_MAX_HEIGHT) {
  const params = new URLSearchParams({
    source,
    maxHeight: String(maxHeight)
  });
  try {
    const parsedSource = new URL(source, "http://hilo.local");
    for (const key of VIDEO_PLAYBACK_IDENTITY_QUERY_KEYS) {
      const value = parsedSource.searchParams.get(key);
      if (value) params.set(key, value);
    }
  } catch {}
  return `/api/asset/video-playback?${params.toString()}`;
}

export const HILO_HUB_BIZ_LINE = 4;

export const API_PATHS = {
  // Workspace
  workspace: "/api/workspace",
  // ComfyUI workflow catalogue and commands.
  comfyUiWorkflows: "/api/comfyui/workflows",
  comfyUiFeaturedWorkflows: locale => `/api/comfyui/featured-workflows?locale=${locale}`,
  comfyUiAgentWorkflows: "/api/comfyui/workflows?agent_only=true",
  comfyUiWorkflowImport: "/api/comfyui/workflows/import",
  comfyUiWorkflowDraftParameters: "/api/comfyui/workflows/draft-parameters",
  comfyUiWorkflowPreflight: "/api/comfyui/workflows/preflight",
  comfyUiInputImport: "/api/comfyui/inputs/import",
  comfyUiWorkflowInstall: workflowId => `/api/comfyui/workflows/${encodeURIComponent(workflowId)}/install`,
  comfyUiWorkflow: (workflowId, includeGraph = false) => `/api/comfyui/workflows/${encodeURIComponent(workflowId)}${includeGraph ? "?include_graph=true" : ""}`,
  comfyUiNodeWorkflow: (sourceNodeId, includeGraph = false) => `/api/comfyui/node-workflows/${encodeURIComponent(sourceNodeId)}${includeGraph ? "?include_graph=true" : ""}`,
  comfyUiWorkflowDelete: workflowId => `/api/comfyui/workflows/${encodeURIComponent(workflowId)}`,
  comfyUiWorkflowClearDeletedBindings: workflowId => `/api/comfyui/workflows/${encodeURIComponent(workflowId)}/clear-deleted-bindings`,
  comfyUiWorkflowDependencies: workflowId => `/api/comfyui/workflows/${encodeURIComponent(workflowId)}/dependencies`,
  comfyUiWorkflowOpen: workflowId => `/api/comfyui/workflows/${encodeURIComponent(workflowId)}/open`,
  comfyUiWorkflowRun: workflowId => `/api/comfyui/workflows/${encodeURIComponent(workflowId)}/run`,
  comfyUiWorkflowExecutable: workflowId => `/api/comfyui/workflows/${encodeURIComponent(workflowId)}/executable`,
  comfyUiWorkflowMetadata: workflowId => `/api/comfyui/workflows/${encodeURIComponent(workflowId)}/metadata`,
  comfyUiWorkflowAgentAccess: workflowId => `/api/comfyui/workflows/${encodeURIComponent(workflowId)}/agent-access`,
  comfyUiRuns: "/api/comfyui/runs",
  // Internal immutable request/billing Group recovery for MCP billable exits.
  internalRequestGroup: runtimeSessionId => `/api/internal/sessions/${encodeURIComponent(runtimeSessionId)}/request-group`,
  internalRequestGroupDiagnostic: "/api/internal/sessions/request-group-diagnostic",
  /** Gateway-level billing scope fallback when plugin context is absent. */
  internalBillingCurrentScope: "/api/internal/sessions/billing-current-scope",
  // Files
  files: "/api/files",
  deleteFiles: "/api/files/delete",
  mkdir: "/api/files/mkdir",
  rename: "/api/files/rename",
  forkRename: "/api/files/fork-rename",
  move: "/api/files/move",
  copy: "/api/files/copy",
  duplicateFiles: "/api/files/duplicate",
  writeContent: "/api/files/content",
  createTextAsset: "/api/files/text-asset",
  readContent: path => `/api/files/content?path=${encodeURIComponent(path)}`,
  filesUploadCdn: "/api/files/upload-cdn",
  upload: "/api/upload",
  uploadCommit: "/api/upload/commit",
  uploadCommitAbort: "/api/upload/commit/abort",
  uploadCommitFinalize: "/api/upload/commit/finalize",
  uploadStagingDelete: "/api/upload/staging/delete",
  importExternal: "/api/files/import-external",
  /**
   * Anchor project-asset files (项目资产 "添加到 agent") into the
   * watcher-ignored `.hilo/project-assets/` directory and return their
   * workspace-relative paths without enrolling them in the vault.
   * Body: { items: Array<{ path, assetId?, projectFolderName? }> } —
   * legacy { paths: string[] } still accepted (no ledger identity).
   * Response: { ok: true, anchored: Array<{ path, filename }>, errors?: [...] }
   */
  anchorProjectAsset: "/api/files/anchor-project-asset",
  /**
   * Write-side propagation for project-asset mutations (Electron main →
   * this workspace's gateway). Re-links anchors after content replacement
   * (new inode) and unlinks them after deletion, driven by the
   * `project_asset_anchors` ledger in the workspace vault sqlite.
   * Body: ProjectAssetPropagateRequest; response: ProjectAssetPropagateResult.
   */
  projectAssetPropagate: "/api/files/project-asset-propagate",
  /**
   * Pure-stat probe used by the asset-panel right-click menu's
   * "Import" / "Paste" / "New Folder" entries to surface a conflict-resolution
   * modal before kicking off the actual mkdir / import.
   * Body: { items: Array<{ name, sourcePath?, kind? }>, targetDir? }
   * Response: { ok: true, conflicts: Array<{ name, sourcePath?, existingKind }> }
   */
  checkConflicts: "/api/files/check-conflicts",
  /**
   * Recursive directory listing for the open workspace. Returns every
   * directory (including empty ones), workspace-relative POSIX paths.
   * Used by the asset panel tree to surface empty folders that the
   * file-only vault can't enumerate. WS push: `dirs_changed`.
   * Response: { ok: true, dirs: string[] }
   */
  listDirs: "/api/files/dirs",
  trackFile: "/api/files/track",
  thumbnail: path => `/api/thumbnail/${encodePath(path)}`,
  serveFile: path => `/files/${encodePath(path)}`,
  adoptFiles: "/api/files/adopt",
  serveFileById: id => `/files/id/${encodeURIComponent(id)}`,
  scanMedia: (dir, limit = 3) => `/api/files/scan-media?dir=${encodeURIComponent(dir)}&limit=${limit}`,
  workspaceSummary: dir => `/api/files/workspace-summary?dir=${encodeURIComponent(dir)}`,
  serveLocal: absolutePath => `/api/local-file?path=${encodeURIComponent(absolutePath)}`,
  filesMentionSearch: "/api/files/mention-search",
  projectAssetMentionSearch: "/api/files/project-asset-mention-search",
  // Text document versions (named snapshots of a text asset).
  // Content never round-trips through the renderer on save: the body only
  // carries { assetId, title, note } and the gateway snapshots off disk.
  textVersions: "/api/files/versions",
  textVersionsList: assetId => `/api/files/versions?assetId=${encodeURIComponent(assetId)}`,
  textVersion: id => `/api/files/versions/${encodeURIComponent(id)}`,
  textVersionContent: (id, offset = 0, limit) => {
    const query = new URLSearchParams({
      offset: String(offset)
    });
    if (limit !== void 0) query.set("limit", String(limit));
    return `/api/files/versions/${encodeURIComponent(id)}/content?${query.toString()}`;
  },
  /**
   * Diff between two snapshots of one document. `to` may be omitted to diff
   * a version against the CURRENT on-disk content (the editor's default
   * "what changed since this version" view). Server-side only: neither side
   * of a multi-MB document is ever shipped to the renderer.
   */
  textVersionDiff: params => {
    const query = new URLSearchParams({
      from: params.from
    });
    if (params.to) query.set("to", params.to);
    if (params.offset !== void 0) query.set("offset", String(params.offset));
    if (params.limit !== void 0) query.set("limit", String(params.limit));
    return `/api/files/versions/diff?${query.toString()}`;
  },
  textVersionRestore: id => `/api/files/versions/${encodeURIComponent(id)}/restore`,
  textVersionMaterialize: id => `/api/files/versions/${encodeURIComponent(id)}/materialize`,
  textVersionSummarize: "/api/files/versions/summarize",
  // Media preview
  heicPreview: "/api/media/heic-preview",
  webMedia: "/api/web-media/yt-dlp",
  // Built-in workspace browser automation (proxied to the Electron main
  // process via the MainBridgeServer loopback bridge).
  browserAutomation: "/api/browser/automation",
  // Assets
  assets: folder => `/api/assets/${encodeURIComponent(folder)}`,
  allAssets: "/api/assets",
  /**
   * `GET /api/assets` opting into the raw `metadata` blob.
   *
   * Only for callers that read un-projected keys (today: mcp-tools reading
   * `read_media_cache`). Everything else must use `allAssets` -- the blob
   * duplicates every flat field and is unbounded in size.
   */
  allAssetsWithMetadata: "/api/assets?include=metadata",
  assetChanges: "/api/assets/changes",
  // W4-T1: missing-asset reconciliation actions (ADR-004 Phase 4)
  mergeMissingCandidate: id => `/api/assets/${encodeURIComponent(id)}/merge-candidate`,
  removeMissing: id => `/api/assets/${encodeURIComponent(id)}/remove-missing`,
  locateMissing: id => `/api/assets/${encodeURIComponent(id)}/locate`,
  // Canvas asset tags (PRD: canvas 内标签体系)
  assetTags: id => `/api/assets/${encodeURIComponent(id)}/tags`,
  assetTagsBatch: "/api/assets/tags/batch",
  assetTagMutationsBatch: "/api/assets/tags/mutations/batch",
  tagRegistry: "/api/canvas/tag-registry",
  canvasTags: "/api/canvas/tags",
  canvasTag: id => `/api/canvas/tags/${encodeURIComponent(id)}`,
  canvasTagImpact: id => `/api/canvas/tags/${encodeURIComponent(id)}/impact`,
  canvasTagOrder: "/api/canvas/tags/order",
  // Dependencies (ADR-005 Layer 3 / W5-T1)
  // Lineage queries follow role='source' edges only; inputs returns
  // every role for the immediate fan-in (style / mask / pose / ...).
  dependenciesUpstream: assetId => `/api/dependencies/${encodeURIComponent(assetId)}/upstream`,
  dependenciesDownstream: assetId => `/api/dependencies/${encodeURIComponent(assetId)}/downstream`,
  dependenciesInputs: assetId => `/api/dependencies/${encodeURIComponent(assetId)}/inputs`,
  addDependency: "/api/dependencies",
  deleteDependency: id => `/api/dependencies/${id}`,
  // Asset hover-card preview (text excerpt + read-only metadata enrichment)
  assetTextPreview: (path, chars = 200) => `/api/asset/text-preview?path=${encodeURIComponent(path)}&chars=${chars}`,
  documentRead: (path, offset = 1, limit = 2e3, imagePage) => `/api/internal/document/read?path=${encodeURIComponent(path)}&offset=${offset}&limit=${limit}${imagePage === void 0 ? "" : `&image_page=${imagePage}`}`,
  assetMetadata: id => `/api/asset/${encodeURIComponent(id)}/metadata`,
  /**
   * Hover-only height-capped MP4 stream. Compatible H.264 MP4 sources pass
   * through; other containers/codecs are remuxed or transcoded for Chromium.
   */
  assetVideoStream: (path, maxHeight = 480) => `/api/asset/video-stream?path=${encodeURIComponent(path)}&maxHeight=${maxHeight}`,
  /** Browser-compatible H.264/AAC MP4 for canvas playback. */
  assetVideoPlayback: videoPlaybackPath,
  // Pre-computed audio peaks (issue #5 follow-up §2): wavesurfer.js skips
  // its own decode when peaks + duration are supplied via constructor opts.
  // Buckets are clamped server-side to [50, 4096]; default 200 matches the
  // typical hover-card waveform width (~400 px @ 2-bar minimum).
  assetPeaks: (path, buckets = 200) => `/api/asset/peaks?path=${encodeURIComponent(path)}&buckets=${buckets}`,
  // Asset Center
  assetCenterWorkspaceRefs: workspace => `/api/asset-center/workspace-refs?workspace=${encodeURIComponent(workspace)}`,
  assetCenterAttachmentBlob: (attachmentId, width) => {
    const base = `/api/asset-center/attachments/${encodeURIComponent(attachmentId)}/blob`;
    return width === void 0 ? base : `${base}?w=${width}`;
  },
  assetCenterAttachmentPlayback: (attachmentId, maxHeight = 1080) => `/api/asset-center/attachments/${encodeURIComponent(attachmentId)}/playback?maxHeight=${maxHeight}`,
  assetCenterBlobPreview: (blobPath, width = 512) => `/api/asset-center/blobs/preview?${new URLSearchParams({
    blobPath,
    w: String(width)
  }).toString()}`,
  assetCenterBlobPlayback: (blobPath, maxHeight = 1080) => `/api/asset-center/blobs/playback?${new URLSearchParams({
    blobPath,
    maxHeight: String(maxHeight)
  }).toString()}`,
  // Canvas
  canvas: "/api/canvas",
  canvasRecovery: "/api/canvas/recovery-result",
  canvasSearch: "/api/canvas/search",
  addCanvasNode: "/api/canvas/add-node",
  canvasMediaNode: "/api/canvas/media-node",
  // Generation
  models: "/api/models",
  modelsConfig: "/api/v1/models/config",
  imageModels: "/api/models/image",
  videoModels: "/api/models/video",
  speechModels: "/api/models/speech",
  musicModels: "/api/models/music",
  agentModels: "/api/runtime/models",
  openCodeConfig: "/api/v1/config",
  speechVoices: "/api/speech/voices",
  speechVoiceDesign: "/api/speech/voice_design",
  generateImage: "/api/generate/image",
  generateVideo: "/api/generate/video",
  generateSpeech: "/api/generate/speech",
  generateMusic: "/api/generate/music",
  generateText: "/api/generate/text",
  generationCancel: "/api/generation/cancel",
  generationQueueSummary: "/api/generation-queue/summary",
  generationQueueCancel: "/api/generation-queue/cancel",
  canvasGenerationReconcile: "/api/canvas/generation/reconcile",
  generateImageSubmit: "/api/generate/image/submit",
  generateVideoSubmit: "/api/generate/video/submit",
  generateSpeechSubmit: "/api/generate/speech/submit",
  generateMusicSubmit: "/api/generate/music/submit",
  generateTaskQueryPattern: "/api/generate/tasks/:task_id/query",
  generateTaskQuery: taskId => `/api/generate/tasks/${encodeURIComponent(taskId)}/query`,
  // Editing
  concatenateVideos: "/api/edit/concatenate-videos",
  embedAudio: "/api/edit/embed-audio",
  extractAudio: "/api/edit/extract-audio",
  voiceIsolation: "/api/speech/voice_isolation",
  lipSync: "/api/edit/lip-sync",
  asr: "/api/edit/asr",
  analyzeMedia: "/api/edit/analyze-media",
  superResolution: "/api/edit/super-resolution",
  eraseBanana: "/api/edit/erase-banana",
  redrawBanana: "/api/edit/redraw-banana",
  outpaintBanana: "/api/edit/outpaint-banana",
  moveObjectBanana: "/api/edit/move-object-banana",
  removeBackground: "/api/edit/remove-background",
  layerDecompose: "/api/edit/layer-decompose",
  enhanceImageMediaKit: "/api/edit/enhance-image",
  enhanceVideoMediaKit: "/api/edit/enhance-video-mediakit",
  hailuo03VideoSuperResolution: "/api/edit/hailuo03-video-super-resolution",
  eraseSubtitleMediaKit: "/api/edit/erase-subtitle-mediakit",
  asrMediaKit: "/api/edit/asr-mediakit",
  asrWhisper: "/api/edit/asr-whisper",
  // Skills
  skills: "/api/skills",
  runtimeSkills: "/api/skills/runtime",
  marketSkills: "/api/skills/market",
  marketSearch: "/api/skills/market/search",
  marketInstall: "/api/skills/market/install",
  marketUninstall: "/api/skills/market/uninstall",
  skillImport: "/api/skills/import",
  skillSubmissionStage: "/api/skills/submission/stage",
  skillSubmissionSave: "/api/skills/submission/save",
  skillSubmissionCoverUpload: "/api/skills/creator-plan/cover-upload",
  skillSubmissionAssetUpload: "/api/skills/creator-plan/asset-upload",
  skillSubmissionAssetPresign: "/api/skills/creator-plan/asset-presign",
  skillSubmissionSubmit: "/api/skills/creator-plan/submit",
  skillSubmissionList: "/api/skills/creator-plan/submissions",
  skillSubmissionOffline: "/api/skills/creator-plan/offline",
  marketWhitelist: "/api/skills/market/whitelist",
  marketSyncStatus: "/api/skills/market/sync-status",
  marketCheckOperator: "/api/skills/market/check-operator",
  marketOperations: "/api/skills/market/operation",
  marketDeleteOperation: skillName => `/api/skills/market/operation/${encodeURIComponent(skillName)}`,
  marketBatchSaveOperations: "/api/skills/market/operations/batch",
  marketOperatorSubmissions: "/api/skills/market/operator/submissions",
  marketOperatorPublished: "/api/skills/market/operator/published",
  marketOperatorSubmission: submissionId => `/api/skills/market/operator/submissions/${encodeURIComponent(submissionId)}`,
  marketOperatorSubmissionPackage: submissionId => `/api/skills/market/operator/submissions/${encodeURIComponent(submissionId)}/package`,
  marketOperatorSubmissionPackageUpload: submissionId => `/api/skills/market/operator/submissions/${encodeURIComponent(submissionId)}/package-upload`,
  marketOperatorBatchApprove: "/api/skills/market/operator/submissions/batch-approve",
  marketOperatorPublish: "/api/skills/market/operator/publish",
  marketOperatorCategories: "/api/skills/market/categories",
  marketTrending: "/api/skills/market/trending",
  skillFiles: skillName => `/api/skills/${encodeURIComponent(skillName)}/files`,
  skillFileContent: (skillName, filePath) => `/api/skills/${encodeURIComponent(skillName)}/file-content?path=${encodeURIComponent(filePath)}`,
  skillUserTrash: "/api/skills/user/trash",
  skillFork: "/api/skills/fork",
  // Plugin management (local plugin listing, not cloud market)
  plugins: "/api/plugins",
  // Feedback
  feedback: "/api/feedback",
  feedbackUploadAttachment: "/api/feedback/upload-attachment",
  feedbackDetail: ticketId => `/api/feedback/${encodeURIComponent(ticketId)}`,
  // Export
  exportSession: id => `/api/sessions/${id}/export`,
  customMcpApply: "/api/connectors/mcp",
  customMcpAuthorize: "/api/connectors/mcp/authorize",
  customMcpAuthenticate: "/api/connectors/mcp/authenticate",
  projectArchiveActivityBegin: "/api/projects/archive/activity/begin",
  projectArchiveActivityHeartbeat: "/api/projects/archive/activity/heartbeat",
  projectArchiveActivityEnd: "/api/projects/archive/activity/end",
  // Billing
  billingPricing: "/api/v1/billing/pricing",
  billingPromotion: "/api/v1/billing/promotion",
  /** Atomic cloud-side price calculation; reminder policy stays local. */
  creditCalculateCost: "/api/v1/credit/calculate-cost",
  /** Atomic authoritative balance query for the authenticated billing scope. */
  creditBalance: "/api/v1/credit/balance",
  /** Existing wallet envelope used by the balance/insufficient-credit UI. */
  creditWallet: "/api/v1/credit/wallet",
  hailuo03VideoTrialStatus: "/api/v1/promotions/hailuo03-video-trial/status",
  hailuo03VideoTrialClaim: "/api/v1/promotions/hailuo03-video-trial/claim",
  // Home
  hubClientConfig: "/api/v1/hub/client_config",
  /** Cloud-side OAuth code→token exchange for confidential connector providers. */
  connectorOAuthExchange: "/api/v1/connector/oauth/exchange",
  apolloConfig: key => `/api/v1/apollo/config?key=${encodeURIComponent(key)}`,
  /** Legacy path retained for old Desktop releases. */
  homeQuickStartConfig: "/api/v1/home/quick_start_config",
  /** Current Desktop explicitly selects the isolated Apollo v2 key. */
  homeQuickStartConfigV2: "/api/v1/home/quick_start_config?config_version=2",
  // Group 间 MediaCredit 转移（Owner only）。operator_uid 由云网关从登录态解析；
  // 客户端严格发送后端契约的三字段请求；幂等由云端负责。
  creditTransfer: "/api/v1/credit/transfer",
  // Account deletion（账户注销）。
  accountProfile: "/api/v1/account/profile",
  accountHailuoWeb: "/api/v1/account/hailuo-web",
  accountHailuoCancelCheck: "/api/v1/account/cancel/hailuo-check",
  accountHubCancelCheck: "/api/v1/account/cancel/check",
  accountCancelSendCode: "/api/v1/account/cancel/send-code",
  accountDelete: "/api/v1/account/cancel",
  // Team edition (Renderer-safe business data only).
  // Canonical active-context and operation coordination routes are deliberately
  // absent: they are Main-process implementation details and must never become
  // a second Renderer source of truth.
  teamContract: "/api/v1/team/contract",
  teamCapabilities: "/api/v1/team/capabilities",
  groupList: `/backend/group/list?biz_line=${HILO_HUB_BIZ_LINE}`,
  groupCreate: "/backend/group/create",
  /** QueryGroupMembers：按 scope 查成员（InGroup 当前团队全量 / Owned·Manageable 聚合去重候选，无分页）。 */
  groupMembersQuery: "/backend/group/members/query",
  /** BatchAddGroupMembers：按 UID 批量入团（单次上限 100，逐用户结果）。 */
  groupMembersBatchAdd: "/backend/group/members/batch_add",
  teamInvitations: "/api/v1/team/invitations",
  teamInvitation: invitationId => `/api/v1/team/invitations/${encodeURIComponent(invitationId)}`,
  teamDetail: groupId => `/api/v1/team/groups/${encodeURIComponent(groupId)}`,
  teamRename: groupId => `/api/v1/team/groups/${encodeURIComponent(groupId)}`,
  teamDelete: groupId => `/api/v1/team/groups/${encodeURIComponent(groupId)}`,
  teamMembers: groupId => `/api/v1/team/groups/${encodeURIComponent(groupId)}/members`,
  teamInviteMembers: groupId => `/api/v1/team/groups/${encodeURIComponent(groupId)}/members/invite`,
  teamRemoveMember: (groupId, userId) => `/api/v1/team/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(userId)}`,
  teamChangeMemberRole: (groupId, userId) => `/api/v1/team/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(userId)}/role`,
  teamLeave: groupId => `/api/v1/team/groups/${encodeURIComponent(groupId)}/leave`,
  teamTransferOwner: groupId => `/api/v1/team/groups/${encodeURIComponent(groupId)}/transfer-owner`,
  teamInviteLinks: groupId => `/api/v1/team/groups/${encodeURIComponent(groupId)}/invite-links`,
  teamInviteLinkInfo: (token, region) => {
    const params = new URLSearchParams({
      token
    });
    if (region) params.set("region", region);
    return `/api/v1/team/invite-links/info?${params.toString()}`;
  },
  teamInviteLinkAccept: "/api/v1/team/invite-links/accept",
  teamInviteLinkDecline: "/api/v1/team/invite-links/decline",
  teamInvitationAccept: "/api/v1/team/invitations/accept",
  teamQuota: groupId => `/api/v1/team/groups/${encodeURIComponent(groupId)}/quota`,
  teamMemberQuotas: groupId => `/api/v1/team/groups/${encodeURIComponent(groupId)}/member-quotas`,
  /** 云网关 member/details 代理：全量成员 + Quota 使用 + 历史累计消耗（不分页）。 */
  teamMemberDetails: groupId => `/api/v1/team/groups/${encodeURIComponent(groupId)}/member-details`,
  teamCreditSummary: groupId => `/api/v1/team/groups/${encodeURIComponent(groupId)}/credit-summary`,
  teamTransactions: groupId => `/api/v1/team/groups/${encodeURIComponent(groupId)}/transactions`,
  teamSelfTransactions: groupId => `/api/v1/team/groups/${encodeURIComponent(groupId)}/self/transactions`,
  teamMemberTransactions: (groupId, memberId) => `/api/v1/team/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(memberId)}/transactions`,
  teamTransfers: groupId => `/api/v1/team/groups/${encodeURIComponent(groupId)}/transfers`,
  teamCheckoutSessions: groupId => `/api/v1/team/groups/${encodeURIComponent(groupId)}/checkout-sessions`,
  // WebSocket
  wsChat: "/ws"
};

export const BACKEND_VIBE_STORYBOARD = "vibe_storyboard";

export const GENERATE_ERROR_CODE_IMAGE_ASPECT_RATIO_CONFLICT = "image_aspect_ratio_conflict";

export const GROUP_ID_HEADER = "x-group-id";

export const PERF_LOG_FLUSH = "hilo:log:flush";

export const PERF_CANVAS_PERSIST_HTTP_ROUNDTRIP = "hilo:canvas:persist-http-roundtrip";

export const measurePerfCounters = /* @__PURE__ */new Map();

export function measurePerf(metricName, start, detail, options = {}) {
  const samplingRate = options.samplingRate;
  if (samplingRate !== void 0 && samplingRate > 1) {
    const current = (measurePerfCounters.get(metricName) ?? 0) + 1;
    measurePerfCounters.set(metricName, current);
    if (current % samplingRate !== 0) return;
  }
  const measuredDetail = mergePerfMetadata(detail, options.metadata);
  try {
    if (measuredDetail === void 0) {
      performance.measure(metricName, {
        start
      });
    } else {
      performance.measure(metricName, {
        start,
        detail: measuredDetail
      });
    }
  } catch {} finally {
    try {
      performance.clearMeasures(metricName);
    } catch {}
  }
}

export function mergePerfMetadata(detail, metadata) {
  if (!metadata) return detail;
  const enriched = {};
  if (metadata.workspaceId !== void 0) enriched.workspaceId = metadata.workspaceId;
  if (metadata.sessionId !== void 0) enriched.sessionId = metadata.sessionId;
  if (metadata.sessionCount !== void 0) enriched.sessionCount = metadata.sessionCount;
  if (detail === void 0) {
    return enriched;
  }
  if (detail === null || typeof detail !== "object" || Array.isArray(detail)) {
    return {
      detail,
      ...enriched
    };
  }
  const merged = detail;
  return {
    ...merged,
    ...enriched
  };
}

export const clamp$c = (val, min = 0, max = 1) => Math.min(Math.max(val, min), max);

export const AUTO_PAN_DISTANCE = 40;

export const maskAutoPanSides = ([xMovement, yMovement], suppressed) => [suppressed.left && xMovement > 0 || suppressed.right && xMovement < 0 ? 0 : xMovement, suppressed.top && yMovement > 0 || suppressed.bottom && yMovement < 0 ? 0 : yMovement];

export function hasDraggedAncestor(node, draggedIds, nodeLookup) {
  let parentId = node.parentId;
  while (parentId) {
    if (draggedIds.has(parentId)) return true;
    parentId = nodeLookup.get(parentId)?.parentId;
  }
  return false;
}

export function getDragSnapReferenceBounds(nodeLookup, dragItems) {
  const draggedIds = new Set(dragItems.keys());
  const references = [];
  for (const [id, node] of nodeLookup) {
    const width = node.measured.width;
    const height = node.measured.height;
    if (draggedIds.has(id) || hasDraggedAncestor(node, draggedIds, nodeLookup) || node.hidden || !width || !height) {
      continue;
    }
    references.push({
      id,
      x: node.internals.positionAbsolute.x,
      y: node.internals.positionAbsolute.y,
      width,
      height,
      parentId: node.parentId,
      type: node.type,
      data: node.data
    });
  }
  return references;
}

export function getDragSnapAffectedIds(nodeLookup, dragItems) {
  const dragRootIds = new Set(dragItems.keys());
  const affectedIds = [];
  for (const [id, node] of nodeLookup) {
    if (dragRootIds.has(id) || hasDraggedAncestor(node, dragRootIds, nodeLookup)) {
      affectedIds.push(id);
    }
  }
  return affectedIds;
}

export function getDragBounds(previews) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const preview of previews) {
    minX = Math.min(minX, preview.positionAbsolute.x);
    minY = Math.min(minY, preview.positionAbsolute.y);
    maxX = Math.max(maxX, preview.positionAbsolute.x + preview.width);
    maxY = Math.max(maxY, preview.positionAbsolute.y + preview.height);
  }
  return {
    x: minX,
    y: minY,
    width: Math.max(0, maxX - minX),
    height: Math.max(0, maxY - minY)
  };
}

export function interpolateNumber(start, end) {
  return start = +start, end = +end, function (progress) {
    return start * (1 - progress) + end * progress;
  };
}

export const AUTO_PAN_ARM_SLACK = 10;

export function getNodesSelectionActiveOnPointerUp(selectionInProgress, selectedNodeCount) {
  return selectionInProgress ? selectedNodeCount >= 2 : void 0;
}

export const edgeZones = (x, y, bounds) => ({
  left: x < AUTO_PAN_DISTANCE,
  right: x > bounds.width - AUTO_PAN_DISTANCE,
  top: y < AUTO_PAN_DISTANCE,
  bottom: y > bounds.height - AUTO_PAN_DISTANCE
});

export const DEFAULT_LARGE_MOVE_FACTOR = 4;

export function getKeyboardMoveFactor({
  shiftKey,
  snapToGrid,
  snapGridShiftMultiplier
}) {
  if (!shiftKey) return 1;
  return snapToGrid ? snapGridShiftMultiplier : DEFAULT_LARGE_MOVE_FACTOR;
}

export const OVERSCAN_PX = 300;

export const RECOMPUTE_DELTA_PX = OVERSCAN_PX / 2;

export function cascadeAbsolutePosition(parentId, dx, dy, nodeLookup, parentLookup) {
  const stack = [parentId];
  while (stack.length > 0) {
    const currentId = stack.pop();
    const children = parentLookup.get(currentId);
    if (!children || children.size === 0) continue;
    for (const childId of children.keys()) {
      const childNode = nodeLookup.get(childId);
      if (!childNode) continue;
      const prev = childNode.internals.positionAbsolute;
      childNode.internals.positionAbsolute = {
        x: prev.x + dx,
        y: prev.y + dy
      };
      stack.push(childId);
    }
  }
}

export const AssetMetadataStoreContext = reactExports.createContext(null);

export function clamp$b(start, value, end) {
  return max(start, min(value, end));
}

export const AUTO_DEDUPE_ID_PREFIX = "hilo-toast-dedupe";

export function isPlainToastContent(value) {
  return typeof value === "string" || typeof value === "number";
}

export function hashToastFingerprint(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function withAutomaticDedupeId(kind, message, data) {
  if (data?.id !== void 0 || data?.action !== void 0 || data?.cancel !== void 0 || data?.onDismiss !== void 0 || data?.onAutoClose !== void 0 || !isPlainToastContent(message) || data?.description !== void 0 && !isPlainToastContent(data.description)) {
    return data;
  }
  const fingerprint = JSON.stringify([kind, String(message), data?.description === void 0 ? "" : String(data.description), data?.toasterId ?? ""]);
  return {
    ...data,
    id: `${AUTO_DEDUPE_ID_PREFIX}-${hashToastFingerprint(fingerprint)}`
  };
}

export const PROMPT_FONT_SIZE_MIN = 8;

export const PROMPT_FONT_SIZE_MAX = 36;

export const PROMPT_FONT_SIZE_DEFAULT = 15;

export const STORAGE_KEY$a = "hilo:canvas:prompt-font-size";

export function normalizePromptFontSize(value) {
  if (!Number.isFinite(value)) return PROMPT_FONT_SIZE_DEFAULT;
  return Math.min(PROMPT_FONT_SIZE_MAX, Math.max(PROMPT_FONT_SIZE_MIN, Math.round(value)));
}

export function readPersistedPromptFontSize() {
  if (typeof window === "undefined") return PROMPT_FONT_SIZE_DEFAULT;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY$a);
    if (raw === null || raw.trim() === "") return PROMPT_FONT_SIZE_DEFAULT;
    return normalizePromptFontSize(Number(raw));
  } catch {
    return PROMPT_FONT_SIZE_DEFAULT;
  }
}

export function persistPromptFontSize(fontSize) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY$a, String(fontSize));
  } catch {}
}

export const stateAttributesMapping$a = {
  value: () => null
};

export function clamp$a(val, min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER) {
  return Math.max(min, Math.min(val, max));
}

export const FRAME_HEADER_SIZE$1 = 4;

export var Bitstream2 = class _Bitstream {
  constructor(bytes) {
    this.bytes = bytes;
    this.pos = 0;
  }
  seekToByte(byteOffset) {
    this.pos = 8 * byteOffset;
  }
  readBit() {
    const byteIndex = Math.floor(this.pos / 8);
    const byte = this.bytes[byteIndex] ?? 0;
    const bitIndex = 7 - (this.pos & 7);
    const bit = (byte & 1 << bitIndex) >> bitIndex;
    this.pos++;
    return bit;
  }
  readBits(bitCount) {
    if (bitCount === 1) {
      return this.readBit();
    }
    let result = 0;
    for (let i = 0; i < bitCount; i++) {
      result <<= 1;
      result |= this.readBit();
    }
    return result;
  }
  writeBits(bitCount, value) {
    const end = this.pos + bitCount;
    for (let i = this.pos; i < end; i++) {
      const byteIndex = Math.floor(i / 8);
      let byte = this.bytes[byteIndex];
      const bitIndex = 7 - (i & 7);
      byte &= ~(1 << bitIndex);
      byte |= (value & 1 << end - i - 1) >> end - i - 1 << bitIndex;
      this.bytes[byteIndex] = byte;
    }
    this.pos = end;
  }
  readAlignedByte() {
    if (this.pos % 8 !== 0) {
      throw new Error("Bitstream is not byte-aligned.");
    }
    const byteIndex = this.pos / 8;
    const byte = this.bytes[byteIndex] ?? 0;
    this.pos += 8;
    return byte;
  }
  skipBits(bitCount) {
    this.pos += bitCount;
  }
  getBitsLeft() {
    return this.bytes.length * 8 - this.pos;
  }
  clone() {
    const clone = new _Bitstream(this.bytes);
    clone.pos = this.pos;
    return clone;
  }
};

export const NOT_DIRTY = 0,
  CHILD_DIRTY = 1,
  CONTENT_DIRTY = 2,
  NODE_DIRTY = 3;

export const none$3 = [],
  noSpec = {};

export const own$a = {}.hasOwnProperty;

export function normalizeTableCellAlign(value) {
  if (value === "left" || value === "right" || value === "center") return value;
  return null;
}

export function parseAlign(element) {
  const styleAlign = (element.style.textAlign || "").trim().toLowerCase();
  const attrAlign = (element.getAttribute("align") || "").trim().toLowerCase();
  return normalizeTableCellAlign(styleAlign || attrAlign);
}

export function normalizeTableCellAlignFromAttributes(attributes) {
  return normalizeTableCellAlign(attributes === null || attributes === void 0 ? void 0 : attributes.align);
}

export function createAlignAttribute() {
  return {
    default: null,
    parseHTML: element => parseAlign(element),
    renderHTML: attributes => {
      if (!attributes.align) return {};
      return {
        style: `text-align: ${attributes.align}`
      };
    }
  };
}

export function parseColgroupWidth(element) {
  var _table$querySelectorA;
  const row = element.parentElement;
  const table = element.closest("table");
  if (!row || !table) return null;
  const cellIndex = Array.from(row.children).indexOf(element);
  const width = (_table$querySelectorA = table.querySelectorAll("colgroup > col")[cellIndex]) === null || _table$querySelectorA === void 0 ? void 0 : _table$querySelectorA.getAttribute("width");
  return width ? [parseInt(width, 10)] : null;
}

export function parseColwidth(element) {
  const colwidth = element.getAttribute("colwidth");
  if (colwidth) return colwidth.split(",").map(width => parseInt(width, 10));
  return parseColgroupWidth(element);
}

export const COLLAPSIBLE_WHITESPACE = /[ \t\r\n\f]+/g;

export function isEmptyCellElement(element) {
  var _element$textContent;
  if (element.children.length > 0) return false;
  return ((_element$textContent = element.textContent) !== null && _element$textContent !== void 0 ? _element$textContent : "").replace(COLLAPSIBLE_WHITESPACE, "") === "";
}

export function fillEmptyCellContent(cellType) {
  const filled = cellType.createAndFill();
  if (!filled) throw new Error(`[tiptap error]: "${cellType.name}" has no default content to backfill.`);
  return filled.content;
}

export function getColStyleDeclaration(minWidth, width) {
  if (width) return ["width", `${Math.max(width, minWidth)}px`];
  return ["min-width", `${minWidth}px`];
}

export function updateColumns(node, colgroup, table, cellMinWidth, overrideCol, overrideValue) {
  let totalWidth = 0;
  let fixedWidth = true;
  let nextDOM = colgroup.firstChild;
  const row = node.firstChild;
  if (row !== null) for (let i = 0, col = 0; i < row.childCount; i += 1) {
    const {
      colspan,
      colwidth
    } = row.child(i).attrs;
    for (let j = 0; j < colspan; j += 1, col += 1) {
      const hasWidth = overrideCol === col ? overrideValue : colwidth && colwidth[j];
      const cssWidth = hasWidth ? `${hasWidth}px` : "";
      totalWidth += hasWidth || cellMinWidth;
      if (!hasWidth) fixedWidth = false;
      if (!nextDOM) {
        const colElement = document.createElement("col");
        const [propertyKey, propertyValue] = getColStyleDeclaration(cellMinWidth, hasWidth);
        colElement.style.setProperty(propertyKey, propertyValue);
        colgroup.appendChild(colElement);
      } else {
        if (nextDOM.style.width !== cssWidth) {
          const [propertyKey, propertyValue] = getColStyleDeclaration(cellMinWidth, hasWidth);
          nextDOM.style.setProperty(propertyKey, propertyValue);
        }
        nextDOM = nextDOM.nextSibling;
      }
    }
  }
  while (nextDOM) {
    var _nextDOM$parentNode;
    const after = nextDOM.nextSibling;
    (_nextDOM$parentNode = nextDOM.parentNode) === null || _nextDOM$parentNode === void 0 || _nextDOM$parentNode.removeChild(nextDOM);
    nextDOM = after;
  }
  const hasUserWidth = node.attrs.style && typeof node.attrs.style === "string" && /\bwidth\s*:/i.test(node.attrs.style);
  if (fixedWidth && !hasUserWidth) {
    table.style.width = `${totalWidth}px`;
    table.style.minWidth = "";
  } else {
    table.style.width = "";
    table.style.minWidth = `${totalWidth}px`;
  }
}

export var TableView2 = class {
  constructor(node, cellMinWidth, _view, HTMLAttributes = {}) {
    this.node = node;
    this.cellMinWidth = cellMinWidth;
    this.dom = document.createElement("div");
    this.dom.className = "tableWrapper";
    this.table = this.dom.appendChild(document.createElement("table"));
    for (const [key, value] of Object.entries(HTMLAttributes)) if (value !== void 0 && value !== null) {
      if (key === "style") this.table.style.cssText = String(value);else this.table.setAttribute(key, String(value));
    }
    if (node.attrs.style) this.table.style.cssText = node.attrs.style;
    this.colgroup = this.table.appendChild(document.createElement("colgroup"));
    updateColumns(node, this.colgroup, this.table, cellMinWidth);
    this.contentDOM = this.table.appendChild(document.createElement("tbody"));
  }
  update(node) {
    if (node.type !== this.node.type) return false;
    this.node = node;
    updateColumns(node, this.colgroup, this.table, this.cellMinWidth);
    return true;
  }
  ignoreMutation(mutation) {
    const target = mutation.target;
    const isInsideWrapper = this.dom.contains(target);
    const isInsideContent = this.contentDOM.contains(target);
    if (isInsideWrapper && !isInsideContent) {
      if (mutation.type === "attributes" || mutation.type === "childList" || mutation.type === "characterData") return true;
    }
    return false;
  }
};

export function createColGroup(node, cellMinWidth, overrideCol, overrideValue) {
  let totalWidth = 0;
  let fixedWidth = true;
  const cols = [];
  const row = node.firstChild;
  if (!row) return {};
  for (let i = 0, col = 0; i < row.childCount; i += 1) {
    const {
      colspan,
      colwidth
    } = row.child(i).attrs;
    for (let j = 0; j < colspan; j += 1, col += 1) {
      const hasWidth = overrideCol === col ? overrideValue : colwidth && colwidth[j];
      totalWidth += hasWidth || cellMinWidth;
      if (!hasWidth) fixedWidth = false;
      const [property, value] = getColStyleDeclaration(cellMinWidth, hasWidth);
      cols.push(["col", {
        style: `${property}: ${value}`
      }]);
    }
  }
  const tableWidth = fixedWidth ? `${totalWidth}px` : "";
  const tableMinWidth = fixedWidth ? "" : `${totalWidth}px`;
  return {
    colgroup: ["colgroup", {}, ...cols],
    tableWidth,
    tableMinWidth
  };
}

export function getTableNodeTypes(schema) {
  if (schema.cached.tableNodeTypes) return schema.cached.tableNodeTypes;
  const roles = {};
  Object.keys(schema.nodes).forEach(type => {
    const nodeType = schema.nodes[type];
    if (nodeType.spec.tableRole) roles[nodeType.spec.tableRole] = nodeType;
  });
  schema.cached.tableNodeTypes = roles;
  return roles;
}

export function escapeTableCellPipes(line) {
  let result = "";
  let i = 0;
  while (i < line.length) {
    if (line[i] === "\\" && i + 1 < line.length) {
      result += line[i] + line[i + 1];
      i += 2;
      continue;
    }
    if (line[i] !== "`") {
      result += line[i++];
      continue;
    }
    let runLen = 0;
    while (i + runLen < line.length && line[i + runLen] === "`") runLen += 1;
    let j = i + runLen;
    let found = false;
    while (j < line.length) {
      if (line[j] !== "`") {
        j += 1;
        continue;
      }
      let closeLen = 0;
      while (j + closeLen < line.length && line[j + closeLen] === "`") closeLen += 1;
      if (closeLen === runLen) {
        const spanContent = line.slice(i + runLen, j);
        result += line.slice(i, i + runLen) + spanContent.replace(/\\\||\|/g, match => match === "|" ? "\\|" : match) + line.slice(j, j + runLen);
        i = j + runLen;
        found = true;
        break;
      }
      j += closeLen;
    }
    if (!found) {
      result += line.slice(i, i + runLen);
      i += runLen;
    }
  }
  return result;
}

export function preprocessTablePipes(src) {
  return src.split("\n").map(line => {
    if (!line.includes("|") || !line.includes("`")) return line;
    return escapeTableCellPipes(line);
  }).join("\n");
}

export function collapseWhitespace(text) {
  return (text || "").replace(/\s+/g, " ").trim();
}

export function renderTableToMarkdown(node, helpers, options = {}) {
  var _options$cellLineSepa;
  const cellSep = (_options$cellLineSepa = options.cellLineSeparator) !== null && _options$cellLineSepa !== void 0 ? _options$cellLineSepa : "";
  if (!node || !node.content || node.content.length === 0) return "";
  const rows = [];
  node.content.forEach(rowNode => {
    const cells = [];
    if (rowNode.content) rowNode.content.forEach(cellNode => {
      let raw = "";
      if (cellNode.content && Array.isArray(cellNode.content) && cellNode.content.length > 1) raw = cellNode.content.map(child => helpers.renderChildren(child)).join(cellSep);else raw = cellNode.content ? helpers.renderChildren(cellNode.content) : "";
      const text = collapseWhitespace(raw.split(cellSep).join("\n").replace(/[ \t]*\r?\n[ \t]*/g, "<br>"));
      const isHeader = cellNode.type === "tableHeader";
      const align = normalizeTableCellAlignFromAttributes(cellNode.attrs);
      cells.push({
        text,
        isHeader,
        align
      });
    });
    rows.push(cells);
  });
  const columnCount = rows.reduce((max, row) => Math.max(max, row.length), 0);
  if (columnCount === 0) return "";
  const colWidths = Array.from({
    length: columnCount
  }).fill(0);
  rows.forEach(row => {
    for (let i = 0; i < columnCount; i += 1) {
      var _r$i;
      const len = (((_r$i = row[i]) === null || _r$i === void 0 ? void 0 : _r$i.text) || "").length;
      if (len > colWidths[i]) colWidths[i] = len;
      if (colWidths[i] < 3) colWidths[i] = 3;
    }
  });
  const pad = (text, width) => text + " ".repeat(Math.max(0, width - text.length));
  const headerRow = rows[0];
  const hasHeader = headerRow.some(cell => cell.isHeader);
  const colAlignments = Array.from({
    length: columnCount
  }).fill(null);
  rows.forEach(row => {
    for (let i = 0; i < columnCount; i += 1) {
      var _r$i2;
      if (!colAlignments[i] && ((_r$i2 = row[i]) === null || _r$i2 === void 0 ? void 0 : _r$i2.align)) colAlignments[i] = row[i].align;
    }
  });
  let out = "\n";
  const headerTexts = Array.from({
    length: columnCount
  }).map((_, i) => hasHeader ? headerRow[i] && headerRow[i].text || "" : "");
  out += `| ${headerTexts.map((headerText, i) => pad(headerText, colWidths[i])).join(" | ")} |
`;
  out += `| ${colWidths.map((colWidth, index) => {
    const dashCount = Math.max(3, colWidth);
    const alignment = colAlignments[index];
    if (alignment === "left") return `:${"-".repeat(dashCount)}`;
    if (alignment === "right") return `${"-".repeat(dashCount)}:`;
    if (alignment === "center") return `:${"-".repeat(dashCount)}:`;
    return "-".repeat(dashCount);
  }).join(" | ")} |
`;
  (hasHeader ? rows.slice(1) : rows).forEach(row => {
    out += `| ${Array.from({
      length: columnCount
    }).fill(0).map((_, i) => pad(row[i] && row[i].text || "", colWidths[i])).join(" | ")} |
`;
  });
  return out;
}

export let rangeFrom = [],
  rangeTo = [];

export class WidgetType2 {
  /**
  Compare this instance to another instance of the same type.
  (TypeScript can't express this, but only instances of the same
  specific class will be passed to this method.) This is used to
  avoid redrawing widgets when they are replaced by a new
  decoration of the same type. The default implementation just
  returns `false`, which will cause new instances of the widget to
  always be redrawn.
  */
  eq(widget) {
    return false;
  }
  /**
  Update a DOM element created by a widget of the same type (but
  different, non-`eq` content) to reflect this widget. May return
  true to indicate that it could update, false to indicate it
  couldn't (in which case the widget will be redrawn). The default
  implementation just returns false.
  */
  updateDOM(dom, view, from) {
    return false;
  }
  /**
  @internal
  */
  compare(other) {
    return this == other || this.constructor == other.constructor && this.eq(other);
  }
  /**
  The estimated height this widget will have, to be used when
  estimating the height of content that hasn't been drawn. May
  return -1 to indicate you don't know. The default implementation
  returns -1.
  */
  get estimatedHeight() {
    return -1;
  }
  /**
  For inline widgets that are displayed inline (as opposed to
  `inline-block`) and introduce line breaks (through `<br>` tags
  or textual newlines), this must indicate the amount of line
  breaks they introduce. Defaults to 0.
  */
  get lineBreaks() {
    return 0;
  }
  /**
  Can be used to configure which kinds of events inside the widget
  should be ignored by the editor. The default is to ignore all
  events.
  */
  ignoreEvent(event) {
    return true;
  }
  /**
  Override the way screen coordinates for positions at/in the
  widget are found. `pos` will be the offset into the widget, and
  `side` the side of the position that is being queried—less than
  zero for before, greater than zero for after, and zero for
  directly at that position.
  */
  coordsAt(dom, pos, side) {
    return null;
  }
  /**
  @internal
  */
  get isHidden() {
    return false;
  }
  /**
  @internal
  */
  get editable() {
    return false;
  }
  /**
  This is called when the an instance of the widget is removed
  from the editor view.
  */
  destroy(dom) {}
}

export const EmptyLine = /^[ \t]*$/,
  CommentEnd = /-->/,
  ProcessingEnd = /\?>/;

export var define_process_env_default$1 = {};

export const lessThan = 60,
  greaterThan = 62,
  slash$1 = 47,
  question$1 = 63,
  bang = 33,
  dash$1 = 45;

export const descendantOp = 145,
  Unit = 1,
  identifier$2 = 146,
  callee = 147,
  VariableName = 2,
  queryIdentifier = 148,
  queryVariableName = 3,
  QueryCallee = 4;

export function flowPointToMiniMap(point, layout) {
  return {
    x: layout.offsetX + (point.x - layout.viewBox.x) * layout.scale,
    y: layout.offsetY + (point.y - layout.viewBox.y) * layout.scale
  };
}

export function findHitTarget(nodeLookup, dropFlow, sourceId, excludedTargets) {
  let bestId = null;
  let bestZ = Number.NEGATIVE_INFINITY;
  for (const [id, node] of nodeLookup) {
    if (id === sourceId) continue;
    if (node.type === CanvasNodeType.Group) continue;
    if (excludedTargets?.has(id)) continue;
    if (node.hidden) continue;
    const width = node.measured?.width ?? node.width ?? 0;
    const height = node.measured?.height ?? node.height ?? 0;
    if (width <= 0 || height <= 0) continue;
    const {
      x,
      y
    } = node.internals.positionAbsolute;
    if (dropFlow.x < x || dropFlow.x > x + width) continue;
    if (dropFlow.y < y || dropFlow.y > y + height) continue;
    const zIndex = node.internals.z ?? 0;
    if (zIndex >= bestZ) {
      bestZ = zIndex;
      bestId = id;
    }
  }
  return bestId;
}

export const IMAGE_EDIT_TOOLS = ["redraw", "outpaint", "erase", "super-resolution", "remove-bg", "move-object"];

export const STORAGE_KEY$6 = "hilo:canvas:image-edit:last-used";

export const DEFAULT_TOOL = "redraw";

export function isMergedImageEditTool(tool) {
  return IMAGE_EDIT_TOOLS.includes(tool);
}

export function readPersisted() {
  if (typeof window === "undefined") return DEFAULT_TOOL;
  try {
    const storedTool = window.localStorage.getItem(STORAGE_KEY$6);
    if (isMergedImageEditTool(storedTool)) return storedTool;
  } catch {}
  return DEFAULT_TOOL;
}

export async function probeMediaDurationSec(file) {
  const kind = mediaKindFromFile(file);
  if (!kind) return 0;
  return new Promise(resolve => {
    const url = URL.createObjectURL(file);
    const el = kind === "video" ? document.createElement("video") : document.createElement("audio");
    el.preload = "metadata";
    let settled = false;
    const cleanup = value => {
      if (settled) return;
      settled = true;
      el.removeEventListener("loadedmetadata", onLoaded);
      el.removeEventListener("error", onError);
      URL.revokeObjectURL(url);
      resolve(value);
    };
    const onLoaded = () => {
      const duration = el.duration;
      cleanup(Number.isFinite(duration) && duration > 0 ? duration : 0);
    };
    const onError = () => cleanup(0);
    el.addEventListener("loadedmetadata", onLoaded);
    el.addEventListener("error", onError);
    el.src = url;
    setTimeout(() => cleanup(0), 5e3);
  });
}

export const VIDEO_EXTENSIONS$1 = /* @__PURE__ */new Set(["mp4", "mov", "webm", "m4v", "avi", "mkv"]);

export const AUDIO_EXTENSIONS$1 = /* @__PURE__ */new Set(["mp3", "wav", "m4a", "aac", "ogg", "flac"]);

export function mediaKindFromFile(file) {
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (!ext) return void 0;
  if (VIDEO_EXTENSIONS$1.has(ext)) return "video";
  if (AUDIO_EXTENSIONS$1.has(ext)) return "audio";
  return void 0;
}

export let _cachedConfig = null;

export function getRuntimeConfig() {
  if (_cachedConfig) return _cachedConfig;
  let raw = null;
  if (typeof window !== "undefined" && RUNTIME_CONFIG_KEY in window) {
    raw = window[RUNTIME_CONFIG_KEY];
  }
  if (!raw && typeof document !== "undefined") {
    const meta = document.querySelector('meta[name="hilo-config"]');
    if (meta) {
      try {
        raw = JSON.parse(meta.getAttribute("content") ?? "{}");
      } catch {}
    }
  }
  if (raw) {
    const cleaned = Object.fromEntries(Object.entries(raw).filter(([, value]) => value != null));
    _cachedConfig = {
      ...DEFAULT_RUNTIME_CONFIG,
      ...cleaned
    };
  } else {
    _cachedConfig = DEFAULT_RUNTIME_CONFIG;
  }
  return _cachedConfig;
}

export function getCssSelector(el) {
  const path = [];
  let parent;
  while (parent = el.parentNode) {
    path.push(`${el.tagName}:nth-child(${Array.prototype.indexOf.call(parent.children, el) + 1})`);
    el = parent;
  }
  return `${path.reverse().join(" > ")}`.toLowerCase();
}

export var CatchBoundaryImpl = class extends reactExports.Component {
  constructor(..._args) {
    super(..._args);
    this.state = {
      error: null
    };
  }
  static getDerivedStateFromProps(props) {
    return {
      resetKey: props.getResetKey()
    };
  }
  static getDerivedStateFromError(error) {
    return {
      error
    };
  }
  reset() {
    this.setState({
      error: null
    });
  }
  componentDidUpdate(prevProps, prevState) {
    if (prevState.error && prevState.resetKey !== this.state.resetKey) this.reset();
  }
  componentDidCatch(error, errorInfo) {
    if (this.props.onCatch) this.props.onCatch(error, errorInfo);
  }
  render() {
    return this.props.children({
      error: this.state.resetKey !== this.props.getResetKey() ? null : this.state.error,
      reset: () => {
        this.reset();
      }
    });
  }
};

export var dummyStore = {
  state: void 0,
  get: () => void 0,
  subscribe: () => () => {}
};

export var STATIC_TRANSITIONING_PROPS = {
  "data-transitioning": "transitioning"
};

export var intersectionObserverOptions = {
  rootMargin: "100px"
};

export function isCtrlEvent(uiEvent) {
  return !!(uiEvent.metaKey || uiEvent.altKey || uiEvent.ctrlKey || uiEvent.shiftKey);
}

export var define_process_env_default = {};

export class EventEmitter3 {
  constructor() {
    this.observers = {};
  }
  on(events, listener) {
    events.split(" ").forEach(event => {
      if (!this.observers[event]) this.observers[event] = /* @__PURE__ */new Map();
      const numListeners = this.observers[event].get(listener) || 0;
      this.observers[event].set(listener, numListeners + 1);
    });
    return this;
  }
  off(event, listener) {
    if (!this.observers[event]) return;
    if (!listener) {
      delete this.observers[event];
      return;
    }
    this.observers[event].delete(listener);
  }
  emit(event, ...args) {
    if (this.observers[event]) {
      const cloned = Array.from(this.observers[event].entries());
      cloned.forEach(([observer, numTimesAdded]) => {
        for (let i = 0; i < numTimesAdded; i++) {
          observer(...args);
        }
      });
    }
    if (this.observers["*"]) {
      const cloned = Array.from(this.observers["*"].entries());
      cloned.forEach(([observer, numTimesAdded]) => {
        for (let i = 0; i < numTimesAdded; i++) {
          observer.apply(observer, [event, ...args]);
        }
      });
    }
  }
}

export function customMcpNameIdentity(mcpName) {
  return mcpName.trim().replace(/[^a-zA-Z0-9_-]/gu, "_").toLowerCase();
}

export const PlatformContext = reactExports.createContext(null);

export function usePlatform() {
  const ctx = reactExports.useContext(PlatformContext);
  if (!ctx) throw new Error("usePlatform must be used within AppProviders");
  return ctx;
}

export const MAX_VALUE_LEN = 256;

export function fmtValue(value) {
  if (value === null || value === void 0) return String(value);
  if (typeof value === "string") {
    return value.length > MAX_VALUE_LEN ? `${value.slice(0, MAX_VALUE_LEN)}…` : value;
  }
  if (value instanceof Error) {
    return value.message.length > MAX_VALUE_LEN ? `${value.message.slice(0, MAX_VALUE_LEN)}…` : value.message;
  }
  try {
    const json = JSON.stringify(value);
    return json.length > MAX_VALUE_LEN ? `${json.slice(0, MAX_VALUE_LEN)}…` : json;
  } catch {
    return String(value);
  }
}

export function workspaceGatewayUrl(binding, path) {
  const baseUrl = binding.baseUrl.replace(/\/$/, "");
  const requested = new URL(path, `${baseUrl}/`);
  const parsed = new URL(`${requested.pathname}${requested.search}${requested.hash}`, `${baseUrl}/`);
  parsed.searchParams.set(HILO_WORKSPACE_IDENTITY_QUERY, binding.claim);
  parsed.searchParams.set(HILO_WORKSPACE_INSTANCE_QUERY, binding.instanceId);
  parsed.searchParams.set(HILO_WORKSPACE_GENERATION_QUERY, String(binding.generation));
  return parsed.toString();
}

export function withWorkspaceGatewayHeaders(binding, headers) {
  const result = new Headers(headers);
  for (const [key, value] of Object.entries(workspaceGatewayIdentityHeaders(binding))) {
    result.set(key, value);
  }
  return result;
}

export class WorkspaceGatewayClient {
  bindingValue;
  fetchImpl;
  recoverWorkspace;
  recoveryInFlight;
  constructor(options) {
    this.bindingValue = options.binding;
    this.fetchImpl = options.fetch ?? globalThis.fetch.bind(globalThis);
    this.recoverWorkspace = options.recoverWorkspace;
  }
  get binding() {
    return this.bindingValue;
  }
  url(path) {
    return workspaceGatewayUrl(this.bindingValue, path);
  }
  async request(path, init) {
    return this.performRequest(path, init, true);
  }
  async performRequest(path, init, allowRecovery) {
    const response = await this.fetchImpl(this.url(path), {
      ...init,
      headers: withWorkspaceGatewayHeaders(this.bindingValue, init?.headers)
    });
    if (!allowRecovery || !this.recoverWorkspace || !(await isIdentityError(response))) {
      return response;
    }
    const previousBinding = this.bindingValue;
    const recovered = await this.recoverBinding();
    if (!recovered) return response;
    if (!canReplayAfterRecovery(init, previousBinding, recovered)) {
      return response;
    }
    this.bindingValue = recovered;
    return this.performRequest(path, init, false);
  }
  async recoverBinding() {
    if (!this.recoverWorkspace) return void 0;
    if (this.recoveryInFlight) return this.recoveryInFlight;
    const recovery = this.recoverWorkspace();
    this.recoveryInFlight = recovery;
    try {
      return await recovery;
    } finally {
      if (this.recoveryInFlight === recovery) {
        this.recoveryInFlight = void 0;
      }
    }
  }
}

export function canReplayAfterRecovery(init, previous, recovered) {
  const method = (init?.method ?? "GET").toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return true;
  return previous.claim === recovered.claim && previous.instanceId === recovered.instanceId;
}

export async function isIdentityError(response) {
  if (response.status !== 409 && response.status !== 428) return false;
  try {
    const body = await response.clone().json();
    return isWorkspaceIdentityErrorCode(body.code);
  } catch {
    return false;
  }
}

export const GENERATE_ERROR_CODES = /* @__PURE__ */new Set(["client_error", "backend_error", "billing_insufficient_balance", "concurrency_limit", GENERATE_ERROR_CODE_IMAGE_ASPECT_RATIO_CONFLICT, "network_connect_timeout", "content_policy_violation", "timeout", "unavailable", "shutdown", "network_error", "storage_full", "queue_paused", "WORKSPACE_CONCURRENCY_LIMIT_REACHED", "unknown"]);

export function normalizeGenerationFailurePresentation(value) {
  return value === "terminal" || value === "recoverable" || value === "status_unknown" ? value : void 0;
}

export function normalizeGenerateErrorCode(value, fallback) {
  return typeof value === "string" && GENERATE_ERROR_CODES.has(value) ? value : fallback;
}

export const LOG_TAG = "[AgentHttp]";

export const defaultLogger = {
  warn: msg => console.warn(msg),
  error: msg => console.error(msg)
};

export const DEFAULT_READ_TIMEOUT_MS = 3e4;

export const DEFAULT_GENERATE_TIMEOUT_MS = 18e6;

export const DEFAULT_GENERATE_VIDEO_TIMEOUT_MS = 183e5;

export const MAX_CANVAS_WRITER_WORKSPACES = 100;

export const CANVAS_WRITER_REVISIONS_PER_MS = 1e3;

export const canvasWriterRevisions = /* @__PURE__ */new Map();

export function nextCanvasWriterRevision(binding) {
  const key = binding.claim;
  const timeFloor = Date.now() * CANVAS_WRITER_REVISIONS_PER_MS;
  const next = Math.max((canvasWriterRevisions.get(key) ?? 0) + 1, timeFloor);
  canvasWriterRevisions.set(key, next);
  if (canvasWriterRevisions.size > MAX_CANVAS_WRITER_WORKSPACES) {
    const oldest = canvasWriterRevisions.keys().next().value;
    if (oldest !== void 0 && oldest !== key) canvasWriterRevisions.delete(oldest);
  }
  return next;
}

export function advanceCanvasWriterRevision(binding, observedRevision) {
  if (!Number.isSafeInteger(observedRevision) || (observedRevision ?? 0) < 1) return;
  const current = canvasWriterRevisions.get(binding.claim) ?? 0;
  if (observedRevision > current) {
    canvasWriterRevisions.set(binding.claim, observedRevision);
  }
}

export function normalizeRecoveredBinding(recovered) {
  if ("claim" in recovered) {
    return {
      baseUrl: recovered.baseUrl,
      claim: recovered.claim,
      binding: recovered
    };
  }
  return {
    baseUrl: recovered.baseUrl,
    claim: recovered.workspaceClaim
  };
}

export function headersToRecord(headers) {
  const result = {};
  headers.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

export function isSafeIdentityRecoveryMethod(method) {
  const normalized = (method ?? "GET").toUpperCase();
  return normalized === "GET" || normalized === "HEAD" || normalized === "OPTIONS";
}

export class ApiError extends Error {
  status;
  body;
  url;
  method;
  /** Error category for structured error handling */
  type;
  /**
   * ADR-009 AnthropicError shape parsed from body. `undefined` when body is
   * not AnthropicError-shaped (e.g. plain text 404, empty body, or vendor
   * non-AnthropicError). Fields are extracted from `error.{type, message,
   * user_message, code}`.
   */
  parsedError;
  constructor(status, body, url, method, type, preParsedError) {
    const errorType = type ?? "http";
    let computedParsed;
    if (preParsedError) {
      computedParsed = preParsedError;
    } else {
      try {
        const parsed = JSON.parse(body);
        if (parsed && typeof parsed === "object" && "error" in parsed) {
          const err = parsed.error;
          if (err && typeof err === "object") {
            const detail = err;
            computedParsed = {
              type: typeof detail.type === "string" ? detail.type : void 0,
              message: typeof detail.message === "string" ? detail.message : void 0,
              user_message: typeof detail.user_message === "string" ? detail.user_message : void 0,
              code: typeof detail.code === "string" ? detail.code : void 0
            };
          }
        }
      } catch {}
    }
    const displayText = computedParsed?.user_message ?? computedParsed?.message ?? body;
    super(`API ${errorType} error ${status}: ${displayText}`);
    this.status = status;
    this.body = body;
    this.url = url;
    this.method = method;
    this.name = "ApiError";
    this.type = errorType;
    this.parsedError = computedParsed;
  }
  /**
   * 给桌面端 / 画布 / UI 展示的最终消息文本。
   *
   *   if (err instanceof ApiError) {
   *     // 仅当 catch 块 **直接驱动 UI 展示** 时（如 canvas placeholder
   *     // error 文本）用这个。
   *   }
   *
   * fallback 优先级（受众拆分语义见 ADR-009「2026-06 修订」）：
   *   1. parsedError.user_message — i18n 翻译文案，可带 inline HTML <a>
   *   2. parsedError.message      — vendor raw（i18n mapper 未命中时给用户的最后兜底）
   *   3. body                     — parsedError 整个抽取失败时的最终兜底
   *
   * ⚠️ **不要**用 `displayMessage` 给 agent 链路 —— agent 链路应该用 `agentMessage`，
   * 否则 agent 会看到 user_message 里的文档链接（受众错位）。
   */
  get displayMessage() {
    if (this.parsedError?.user_message) return this.parsedError.user_message;
    if (this.parsedError?.message) return this.parsedError.message;
    return this.body;
  }
  /**
   * 给 agent / mcp-tools / 自动决策 用的 vendor-faithful 消息。
   *
   *   if (err instanceof ApiError) {
   *     // 走 MCP tool error、agent reasoning 时用这个，避免 user_message 里的
   *     // HTML 文档链接污染 agent context。
   *   }
   *
   * fallback 优先级：
   *   1. parsedError.message — vendor raw
   *   2. body                — 最终兜底
   *
   * **绝不**返回 `parsedError.user_message`。
   */
  get agentMessage() {
    if (this.parsedError?.message) return this.parsedError.message;
    return this.body;
  }
}

export let selectedRequestGroupId = null;

export function setSelectedRequestGroupId(groupId) {
  selectedRequestGroupId = groupId;
}

export function normalizeGatewayBaseUrl(gatewayUrl) {
  return gatewayUrl?.replace(/\/$/, "") || void 0;
}

export function toCloudLang(locale) {
  if (!locale) return "";
  return locale === "zh" ? "zh-Hans" : locale;
}

export function getOsName() {
  const platform = navigator.platform || "";
  const ua = navigator.userAgent || "";
  if (/mac/i.test(platform) || /Mac OS X/i.test(ua)) return "macOS";
  if (/win/i.test(platform) || /Windows/i.test(ua)) return "Windows";
  if (/linux/i.test(platform) || /Linux/i.test(ua)) return "Linux";
  return platform || "unknown";
}

export function getBrowserName() {
  const ua = navigator.userAgent || "";
  if (/Electron/i.test(ua)) return "Electron";
  if (/Chrome|Chromium/i.test(ua)) return "Chrome";
  if (/Safari/i.test(ua)) return "Safari";
  return "unknown";
}

export function getDeviceMemory(totalMemoryMb) {
  const navMemory = navigator.deviceMemory;
  if (typeof navMemory === "number" && navMemory > 0) return navMemory;
  if (typeof totalMemoryMb === "number" && totalMemoryMb > 0) {
    return Math.round(totalMemoryMb / 1024);
  }
  return void 0;
}

export const GLOBAL_STORAGE_VERSION = 31;

export const GLOBAL_STORAGE_DEFAULTS = {
  _version: GLOBAL_STORAGE_VERSION,
  tokens: {},
  user: {},
  config: {
    browserConnectorEnabled: true,
    menuBarVisible: true,
    windowCloseBehavior: "ask",
    networkProxyMode: "auto",
    agentModePreference: "auto",
    runOnStartup: false,
    recentProjectsSortMode: "manual",
    recentProjectsGroupMode: "project",
    pinnedWorkspacePaths: [],
    pinnedProjectIds: [],
    projectsSortMode: "updated",
    globalAccessShortcut: {},
    workingDirectory: "",
    language: "en",
    theme: "system",
    islandLayout: true,
    transparentWindowExperiment: false,
    dataDirectory: "",
    dataDirectoryCleanupPaths: [],
    dataDirectoryDeferredCleanupPaths: [],
    assetCenterRestartRequired: false,
    folderWhitelist: [],
    skillAutoUpdate: true,
    autoInstallOnQuit: false,
    localFileRevealAllowedDirs: [],
    autoFeedbackEnabled: false,
    watermarkEnabled: false,
    watermarkOnboardingShown: true,
    assetCenterHidden: false,
    attachmentFaceNoticeAccepted: false,
    creditTransferTermsAccepted: {},
    comfyUiLicenseAcceptances: {},
    compactionEnabled: true,
    customModels: void 0,
    devAuthBrowser: "default",
    newProjectPrefs: {
      loadUserMemory: false
    }
  },
  globalSidebarLayout: {},
  currentWorkspace: "",
  recentWorkspaces: [],
  projects: [],
  hiddenProjectIds: [],
  skillPermissions: {},
  customMcpVault: "",
  windowState: null,
  notificationPermissionRequested: false,
  dismissedMoveToApplications: false,
  dismissedLegacyMacAppCleanup: false,
  visiblePreviewTabs: {
    version: 1,
    initialized: false,
    tabs: []
  },
  workspaceSessionTabs: {},
  workspaceTextEditSessions: {},
  reportedIncidentTelemetryByUserID: {},
  hasSelectedInterests: false,
  selectedInterests: [],
  hasEverLoggedIn: false,
  selectedGroupIds: {},
  creditReminderConfigs: {},
  subscriptionRenewalSeen: {},
  teamCreditTransferIntents: {},
  teamExitProgress: {},
  teamExitTombstones: {},
  dismissedCoachMarks: [],
  sessionEvictionToastCount: 0
};

export const WORKSPACE_STORAGE_VERSION = 10;

export const WORKSPACE_STORAGE_DEFAULTS = {
  _version: WORKSPACE_STORAGE_VERSION,
  preferences: {
    loadUserMemory: true
  },
  recentFiles: [],
  assetPanel: {
    typeFilters: [],
    dateFilter: {
      kind: "all"
    },
    sortOrder: "desc"
  },
  lastUsedModelParams: {},
  pinnedSessionIds: [],
  hiddenSessionIds: [],
  capabilityCardSelections: {}
};

export function noop2() {}

export function resolveEnabled(enabled, query) {
  return typeof enabled === "function" ? enabled(query) : enabled;
}

export function parseCreditAmount(value) {
  if (/^-\d+$/.test(value)) {
    return {
      value: null,
      reasonCode: "negative_credit_contract_value"
    };
  }
  if (!/^(0|[1-9]\d*)$/.test(value)) {
    return {
      value: null,
      reasonCode: "invalid_credit_decimal"
    };
  }
  return {
    value: BigInt(value),
    reasonCode: null
  };
}

export function invalidDisplay(mode, teamRemaining, reasonCode) {
  return {
    status: "INVALID",
    mode,
    availableAmount: null,
    memberRemaining: null,
    memberUsed: null,
    memberLimit: null,
    teamRemaining,
    reasonCode
  };
}

export function unavailableDisplay({
  mode,
  memberLimit = null,
  teamRemaining,
  reasonCode
}) {
  return {
    status: "UNAVAILABLE",
    mode,
    availableAmount: null,
    memberRemaining: null,
    memberUsed: null,
    memberLimit,
    teamRemaining,
    reasonCode
  };
}

export function minCreditAmount(a, b) {
  const left = BigInt(a);
  const right = BigInt(b);
  return (left < right ? left : right).toString();
}

export function deriveTeamCreditDisplay(summary) {
  const sourceMode = summary.mode === "UNAVAILABLE" ? null : summary.mode;
  const parsedTeamRemaining = parseCreditAmount(summary.teamRemaining);
  if (parsedTeamRemaining.reasonCode) {
    return invalidDisplay(sourceMode, null, parsedTeamRemaining.reasonCode);
  }
  if (summary.mode === "UNAVAILABLE") {
    return unavailableDisplay({
      mode: null,
      teamRemaining: summary.teamRemaining,
      reasonCode: "upstream_quota_unavailable"
    });
  }
  if (summary.mode === "UNLIMITED") {
    if (summary.memberUsed !== null) {
      const parsedMemberUsed = parseCreditAmount(summary.memberUsed);
      if (parsedMemberUsed.reasonCode) {
        return invalidDisplay("UNLIMITED", summary.teamRemaining, parsedMemberUsed.reasonCode);
      }
    }
    return {
      status: "READY",
      mode: "UNLIMITED",
      availableAmount: summary.teamRemaining,
      memberRemaining: null,
      memberUsed: summary.memberUsed,
      memberLimit: null,
      teamRemaining: summary.teamRemaining,
      reasonCode: null
    };
  }
  if (summary.memberLimit === null) {
    return unavailableDisplay({
      mode: "LIMITED",
      teamRemaining: summary.teamRemaining,
      reasonCode: "member_limit_unavailable"
    });
  }
  const parsedMemberLimit = parseCreditAmount(summary.memberLimit);
  if (parsedMemberLimit.reasonCode) {
    return invalidDisplay("LIMITED", summary.teamRemaining, parsedMemberLimit.reasonCode);
  }
  if (summary.memberUsed === null || summary.memberRemaining === null) {
    return unavailableDisplay({
      mode: "LIMITED",
      memberLimit: summary.memberLimit,
      teamRemaining: summary.teamRemaining,
      reasonCode: "member_usage_unavailable"
    });
  }
  const parsedMemberUsed = parseCreditAmount(summary.memberUsed);
  if (parsedMemberUsed.reasonCode) {
    return invalidDisplay("LIMITED", summary.teamRemaining, parsedMemberUsed.reasonCode);
  }
  const parsedMemberRemaining = parseCreditAmount(summary.memberRemaining);
  if (parsedMemberRemaining.reasonCode) {
    return invalidDisplay("LIMITED", summary.teamRemaining, parsedMemberRemaining.reasonCode);
  }
  const memberLimit = parsedMemberLimit.value;
  const memberUsed = parsedMemberUsed.value;
  const memberRemaining = parsedMemberRemaining.value;
  if (memberLimit === null || memberUsed === null || memberRemaining === null) {
    return invalidDisplay("LIMITED", summary.teamRemaining, "invalid_credit_decimal");
  }
  const expectedRemaining = memberLimit > memberUsed ? memberLimit - memberUsed : 0n;
  if (memberRemaining !== expectedRemaining) {
    return invalidDisplay("LIMITED", summary.teamRemaining, "member_remaining_mismatch");
  }
  return {
    status: "READY",
    mode: "LIMITED",
    availableAmount: minCreditAmount(summary.memberRemaining, summary.teamRemaining),
    memberRemaining: summary.memberRemaining,
    memberUsed: summary.memberUsed,
    memberLimit: summary.memberLimit,
    teamRemaining: summary.teamRemaining,
    reasonCode: null
  };
}

export function deriveActiveScope(snapshot) {
  if (!snapshot?.identityKey || !snapshot.activeContext) return null;
  return {
    identityKey: snapshot.identityKey,
    groupId: snapshot.activeContext.groupId,
    epoch: snapshot.activeContext.epoch,
    membershipRevision: snapshot.activeContext.membershipRevision
  };
}

export function isBillableSubmission(kind) {
  return kind === "chat" || kind === "queue" || kind === "retry" || kind === "auto_send" || kind === "remote_tool" || kind === "canvas" || kind === "plugin_dag";
}

export const ACCOUNT_SUBMISSION_BLOCKED_EVENT = "team-account:submission-blocked";

export function dispatchAccountSubmissionBlocked(detail) {
  window.dispatchEvent(new CustomEvent(ACCOUNT_SUBMISSION_BLOCKED_EVENT, {
    detail
  }));
}

export const GatewayScopeContext = reactExports.createContext(null);

export function useGatewayScope() {
  const context = reactExports.useContext(GatewayScopeContext);
  if (context) return context;
  const baseUrl = normalizeGatewayBaseUrl(getRuntimeConfig().gatewayUrl);
  return {
    baseUrl,
    gatewayReady: baseUrl !== void 0,
    scopeKey: "app",
    workspaceClaim: void 0,
    gatewayBinding: void 0,
    workspaceClient: void 0,
    recoverWorkspace: void 0
  };
}

export function useGatewayBaseUrl() {
  return useGatewayScope().baseUrl;
}

export const CurrentWorkspaceContext = reactExports.createContext("");

export function useCurrentWorkspace() {
  return reactExports.useContext(CurrentWorkspaceContext);
}

export const storageKeys = {
  workspaceAll: dir => ["storage", "workspace", dir],
  workspace: (dir, field) => ["storage", "workspace", dir, field],
  globalAll: () => ["storage", "global"],
  global: field => ["storage", "global", field]
};

export const storageWriteQueues = /* @__PURE__ */new Map();

export function enqueueStorageWrite(key, task) {
  const previous = storageWriteQueues.get(key) ?? Promise.resolve();
  const run = previous.catch(() => void 0).then(task);
  const tail = run.then(() => void 0, () => void 0);
  storageWriteQueues.set(key, tail);
  void tail.then(() => {
    if (storageWriteQueues.get(key) === tail) storageWriteQueues.delete(key);
  });
  return run;
}

export const LS_PREFIX = "hilo:storage:";

export const UNDEFINED_STORAGE_VALUE = Symbol("hilo.storage.undefined");

export function isUndefinedStorageValue(value) {
  return value === UNDEFINED_STORAGE_VALUE;
}

export function toStorageQueryData(value, defaultValue) {
  if (value !== void 0) return value;
  return defaultValue === void 0 ? UNDEFINED_STORAGE_VALUE : defaultValue;
}

export function resolveStorageQueryData(value) {
  return isUndefinedStorageValue(value) ? void 0 : value;
}

export function localCacheKey(scope, field, workspaceDir) {
  return scope === "global" ? `global.${field}` : `workspace.${workspaceDir}.${field}`;
}

export function readLocalCache$2(key) {
  try {
    const raw = localStorage.getItem(`${LS_PREFIX}${key}`);
    return raw != null ? JSON.parse(raw) : void 0;
  } catch {
    return void 0;
  }
}

export function writeLocalCache$2(key, value) {
  try {
    localStorage.setItem(`${LS_PREFIX}${key}`, JSON.stringify(value));
  } catch (err) {
    console.warn(`[useStorage] Failed to write localStorage cache for "${key}":`, err);
  }
}

export function removeLocalCache(key) {
  try {
    localStorage.removeItem(`${LS_PREFIX}${key}`);
  } catch (err) {
    console.warn(`[useStorage] Failed to remove localStorage cache for "${key}":`, err);
  }
}

export let _rendererGlobalDefaults;

export function getRendererGlobalDefaults() {
  if (!_rendererGlobalDefaults) {
    const region = getRuntimeConfig().region;
    _rendererGlobalDefaults = {
      ...GLOBAL_STORAGE_DEFAULTS,
      config: {
        ...GLOBAL_STORAGE_DEFAULTS.config,
        language: regionToLocale(region)
      }
    };
  }
  return _rendererGlobalDefaults;
}

export const ACCOUNT_SENSITIVE_CANVAS_PATHS = /* @__PURE__ */new Set([API_PATHS.speechVoiceDesign, API_PATHS.generateImage, API_PATHS.generateVideo, API_PATHS.generateSpeech, API_PATHS.generateMusic, API_PATHS.generateText, API_PATHS.generateImageSubmit, API_PATHS.generateVideoSubmit, API_PATHS.generateSpeechSubmit, API_PATHS.generateMusicSubmit, API_PATHS.concatenateVideos, API_PATHS.embedAudio, API_PATHS.extractAudio, API_PATHS.voiceIsolation, API_PATHS.lipSync, API_PATHS.asr, API_PATHS.analyzeMedia, API_PATHS.superResolution, API_PATHS.eraseBanana, API_PATHS.redrawBanana, API_PATHS.outpaintBanana, API_PATHS.moveObjectBanana, API_PATHS.removeBackground, API_PATHS.layerDecompose, API_PATHS.enhanceImageMediaKit, API_PATHS.enhanceVideoMediaKit, API_PATHS.hailuo03VideoSuperResolution, API_PATHS.eraseSubtitleMediaKit, API_PATHS.asrMediaKit, API_PATHS.asrWhisper]);

export class AccountSubmissionBlockedError extends Error {
  constructor(reasonCode) {
    super(`Account submission blocked: ${reasonCode}`);
    this.reasonCode = reasonCode;
    this.name = "AccountSubmissionBlockedError";
  }
}

export function resolveNewProjectPreferences(config) {
  const rawPreferences = config.newProjectPrefs;
  if (!rawPreferences || typeof rawPreferences !== "object" || Array.isArray(rawPreferences)) {
    return {
      loadUserMemory: false
    };
  }
  const record = rawPreferences;
  return {
    loadUserMemory: record.loadUserMemory === true,
    ...(typeof record.folderPath === "string" && record.folderPath.trim() ? {
      folderPath: record.folderPath
    } : {})
  };
}

export function updateNewProjectPreferences(config, patch) {
  return {
    newProjectPrefs: {
      ...resolveNewProjectPreferences(config),
      ...patch
    }
  };
}

export const CDN_BASE_MAP = {
  domestic: "https://cdn.hailuoai.com/hailuo-video-web/public_assets",
  overseas: "https://cdn.hailuoai.video/open-hailuo-video-web/public_assets"
};

export const PUBLIC_ASSET_BASE_MAP = {
  domestic: "https://cdn.hailuoai.com/public_assets",
  overseas: "https://cdn.hailuoai.video/public_assets"
};

export function getCdnRegion() {
  try {
    const {
      region
    } = getRuntimeConfig();
    return region in CDN_BASE_MAP ? region : "domestic";
  } catch {
    return "domestic";
  }
}

export function cdnPublicAsset(files) {
  const region = getCdnRegion();
  return `${PUBLIC_ASSET_BASE_MAP[region]}/${files[region]}`;
}

export const CDN_TOUCHDESIGNER_COMPONENTS = cdnPublicAsset({
  domestic: "touchdesigner-mcp-components-2.0.0.zip",
  overseas: "touchdesigner-mcp-components-2.0.0.zip"
});

export function matchesLocalConnectorServer(server, connectorId) {
  return (server.transport === void 0 || server.transport === "stdio") && customMcpNameIdentity(server.name) === customMcpNameIdentity(connectorId);
}

export const libtvIconUrl = "data:image/svg+xml,%3c!--%20LibTV%20plugin%200.4.4%20artwork:%20https://github.com/liblib-ai/marketplace/blob/main/plugins/libtv/assets/libtv-icon.svg%20--%3e%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='64'%20height='64'%20viewBox='0%200%2048%2048'%20fill='none'%3e%3crect%20width='48'%20height='48'%20rx='10'%20fill='%23000'%20/%3e%3cg%20transform='translate(11.397%2015.692)'%20fill='%23fff'%3e%3cpath%20d='M16.5757%2016.616H0L0.832729%2012.1982H17.6504L16.5757%2016.616Z'%20/%3e%3cpath%20d='M0%2016.616L2.31411%204.34598H6.76176L4.4459%2016.616H0Z'%20/%3e%3cpath%20d='M8.26945%200H25.2063L24.3736%204.41609H7.54366L8.26945%200Z'%20/%3e%3cpath%20d='M25.2062%200L22.8921%2012.27L18.3796%2012.2718L20.7604%200H25.2062Z'%20/%3e%3c/g%3e%3c/svg%3e";

export function namesMatch(left, right) {
  return left.trim().toLocaleLowerCase() === right.toLocaleLowerCase();
}

export function originsMatch(left, right) {
  if (!left) return false;
  try {
    return new URL(left).origin === new URL(right).origin;
  } catch {
    return false;
  }
}

export const BROWSER_ASSET_SOURCE_METADATA_KEYS = {
  pageUrl: "source_page_url",
  pageTitle: "source_page_title",
  type: "source_type"
};

export function safeSourcePageUrl(value) {
  if (!value) return "";
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    url.username = "";
    url.password = "";
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return "";
  }
}

export function browserAssetSourceMetadata(source) {
  const pageUrl = safeSourcePageUrl(source.pageUrl);
  return {
    [BROWSER_ASSET_SOURCE_METADATA_KEYS.type]: "browser",
    ...(pageUrl ? {
      [BROWSER_ASSET_SOURCE_METADATA_KEYS.pageUrl]: pageUrl
    } : {}),
    ...(source.pageTitle ? {
      [BROWSER_ASSET_SOURCE_METADATA_KEYS.pageTitle]: source.pageTitle
    } : {})
  };
}

export const MAX_ACTIVE_FINGERPRINTS = 2;

export const FINGERPRINT_WAIT_MS = 1e3;

export const MAX_ACTIVE_HEADER_READS = MEDIA_LINEAGE_MAX_REFERENCES;

export let activeHeaderReads = 0;

export let activeFingerprints = 0;

export async function mediaFingerprintFile(file) {
  let observed = {
    sizeBytes: file.size
  };
  if (activeHeaderReads >= MAX_ACTIVE_HEADER_READS) return {
    ...observed,
    hashStatus: "busy"
  };
  activeHeaderReads += 1;
  let expired = false;
  const unavailable = () => ({
    ...observed,
    hashStatus: "unavailable"
  });
  const work = (async () => {
    try {
      let header;
      try {
        header = new Uint8Array(await file.slice(0, MEDIA_LINEAGE_HEADER_BYTES).arrayBuffer());
      } finally {
        activeHeaderReads -= 1;
      }
      observed = {
        ...observed,
        detectedFormat: mediaLineageFormat(header)
      };
      if (expired) return unavailable();
      if (file.size > MEDIA_LINEAGE_MAX_HASH_BYTES) return {
        ...observed,
        hashStatus: "size-limit"
      };
      if (activeFingerprints >= MAX_ACTIVE_FINGERPRINTS) return {
        ...observed,
        hashStatus: "busy"
      };
      activeFingerprints += 1;
      try {
        const bytes = file.size <= MEDIA_LINEAGE_HEADER_BYTES ? header : new Uint8Array(await file.slice(0, file.size).arrayBuffer());
        if (expired) return unavailable();
        observed = {
          sizeBytes: bytes.byteLength,
          detectedFormat: mediaLineageFormat(bytes)
        };
        if (bytes.byteLength !== file.size) return {
          ...observed,
          hashStatus: "changed"
        };
        const digest = await crypto.subtle.digest("SHA-256", bytes);
        return {
          ...observed,
          hashStatus: "full",
          sha256: Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("")
        };
      } finally {
        activeFingerprints -= 1;
      }
    } catch {
      return unavailable();
    }
  })();
  let timer;
  try {
    return await Promise.race([work, new Promise(resolve => {
      timer = setTimeout(() => {
        expired = true;
        resolve(unavailable());
      }, FINGERPRINT_WAIT_MS);
    })]);
  } finally {
    clearTimeout(timer);
  }
}

export function mediaLineageRequestId() {
  try {
    return crypto.randomUUID();
  } catch {
    return void 0;
  }
}

export function warnEnrollError(op, res) {
  if (res.enrollError) {
    console.warn(`[asset-mutator] ${op} succeeded on disk but enrollment failed:`, res.enrollError);
  }
}

export const Context2 = Object.freeze({
  DEFAULT: "DEFAULT",
  CHAR_CLASS: "CHAR_CLASS"
});

export var Target2 = /** @type {const} */
{
  auto: "auto",
  ES2025: "ES2025",
  ES2024: "ES2024",
  ES2018: "ES2018"
};

export var $2 = Object.getOwnPropertySymbols;

export function tryParseJson$1(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return void 0;
  }
}

export const BROWSER_IMAGE_EDIT_ACTIONS = ["remove-background", "upscale", "describe-prompt", "separate-layers"];

export function isBrowserImageEditAction(value) {
  return typeof value === "string" && BROWSER_IMAGE_EDIT_ACTIONS.includes(value);
}

export const BROWSER_IMAGE_EDIT_EVENT = "hilo:browser-image-edit";
