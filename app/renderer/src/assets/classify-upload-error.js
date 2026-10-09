// classify-upload-error.js
import { API_PATHS } from "../vendor.js";
import { gatewayFetch } from "../infra/gateway-fetch.js";
import { UPLOAD_COMMIT_SAFE_PUBLISH_UNSUPPORTED } from "../generation/to-workspace-browser-url.js";
import { cloudAssetMimeType } from "./wrap-as-asset-center-error.js";
import { detectFileType } from "../canvas/diagnostic-history-tools.js";

const HEIC_EXTENSIONS = new Set(["heic", "heif"]);

function extensionFromFilename(filename) {
  const clean = filename.split("?")[0]?.split("#")[0] ?? filename;
  return clean.split(".").pop()?.toLowerCase() ?? "";
}

export function isHeicFilename(filename) {
  return HEIC_EXTENSIONS.has(extensionFromFilename(filename));
}

export async function createHeicPreviewObjectUrl(filename, data2) {
  if (!isHeicFilename(filename)) return null;
  try {
    const path2 = `${API_PATHS.heicPreview}?filename=${encodeURIComponent(filename)}`;
    const response = await gatewayFetch(path2, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
      },
      body: data2,
      timeoutMs: 2e4,
    });
    return URL.createObjectURL(await response.blob());
  } catch {
    return null;
  }
}

export async function createHeicPreviewObjectUrlFromUrl(
  filename,
  url2,
  fetcher = (target) => fetch(target),
) {
  if (!isHeicFilename(filename)) return null;
  try {
    const response = await fetcher(url2);
    if (!response.ok) return null;
    return createHeicPreviewObjectUrl(filename, await response.arrayBuffer());
  } catch {
    return null;
  }
}

export const MESSAGE_INPUT_POPOVER_Z_INDEX = 40;

export function isFileAttachment(a2) {
  return (a2.kind ?? "file") === "file";
}

export class UploadCommitUnsupportedFilesystemError extends Error {
  code = UPLOAD_COMMIT_SAFE_PUBLISH_UNSUPPORTED;
  constructor() {
    super("workspace filesystem does not support safe attachment publishing");
    this.name = "UploadCommitUnsupportedFilesystemError";
  }
}

function kindFromErrorCode(code2) {
  switch (code2) {
    case "FILE_TOO_LARGE":
    case "PAYLOAD_TOO_LARGE":
      return "fileTooLarge";
    case "UNSUPPORTED_FILE_TYPE":
      return "unsupportedType";
    case "UPLOAD_TIMEOUT":
      return "timeout";
    case "EMPTY_FILE":
    case "MISSING_FILE":
      return "empty";
    case "NETWORK_ERROR":
      return "network";
    case "UPLOAD_SERVICE_UNAVAILABLE":
      return "serverUnavailable";
    default:
      return null;
  }
}

export function classifyUploadError(rawMessage, status, code2) {
  const codeKind = kindFromErrorCode(code2);
  if (codeKind) return codeKind;
  if (status === 413) return "fileTooLarge";
  if (status && status >= 500) return "serverUnavailable";
  const message2 = rawMessage.toLowerCase();
  if (
    message2.includes("payload too large") ||
    message2.includes("file too large") ||
    message2.includes("too large") ||
    message2.includes("request entity too large") ||
    message2.includes("413")
  ) {
    return "fileTooLarge";
  }
  if (
    message2.includes("failed to fetch") ||
    message2.includes("network") ||
    message2.includes("load failed") ||
    message2.includes("fetch failed")
  ) {
    return "network";
  }
  if (
    message2.includes("unsupported") ||
    message2.includes("invalid file type") ||
    message2.includes("not supported")
  ) {
    return "unsupportedType";
  }
  if (
    message2.includes("timeout") ||
    message2.includes("timed out") ||
    message2.includes("aborted")
  ) {
    return "timeout";
  }
  if (message2.includes("no file") || message2.includes("missing file")) {
    return "empty";
  }
  if (message2.includes("internal server error") || message2.includes("500")) {
    return "serverUnavailable";
  }
  return "generic";
}

export function uploadErrorMessage(t2, kind) {
  switch (kind) {
    case "fileTooLarge":
      return t2("chat.uploadError.fileTooLarge");
    case "network":
      return t2("chat.uploadError.network");
    case "unsupportedType":
      return t2("chat.uploadError.unsupportedType");
    case "timeout":
      return t2("chat.uploadError.timeout");
    case "empty":
      return t2("chat.uploadError.empty");
    case "serverUnavailable":
      return t2("chat.uploadError.serverUnavailable");
    case "generic":
      return t2("chat.uploadError.generic");
  }
}

export function fileMatchesAccept(file, accept) {
  if (!accept?.trim()) return true;
  const filename = file.name.toLowerCase();
  const mimeType = (
    file.type ||
    cloudAssetMimeType(file.name) ||
    ""
  ).toLowerCase();
  return accept
    .split(",")
    .map((token2) => token2.trim().toLowerCase())
    .filter(Boolean)
    .some((token2) => {
      if (token2 === "*/*") return true;
      if (token2.startsWith(".")) return filename.endsWith(token2);
      if (token2.endsWith("/*")) {
        if (mimeType) return mimeType.startsWith(token2.slice(0, -1));
        const kind = detectFileType(file.name);
        return (
          ["image", "video", "audio"].includes(kind) && token2 === `${kind}/*`
        );
      }
      return mimeType === token2;
    });
}

const UPLOAD_COMMIT_MIN_TIMEOUT_MS = 3e4;

const UPLOAD_COMMIT_MAX_TIMEOUT_MS = 60 * 6e4;

const UPLOAD_COMMIT_WORST_CASE_BYTE_PASSES = 3;

const UPLOAD_COMMIT_MIN_THROUGHPUT_BYTES_PER_SECOND = 6 * 1024 * 1024;

export const UPLOAD_FINALIZE_OUTBOX_KEY =
  "hilo:upload-commit-finalize-outbox:v1";

const UPLOAD_FINALIZE_OUTBOX_TTL_MS = 7 * 24 * 60 * 60 * 1e3;

export function compactUploadFinalizeOutbox(records, now2) {
  const minimumQueuedAt = now2 - UPLOAD_FINALIZE_OUTBOX_TTL_MS;
  const byOperation = new Map();
  for (const record2 of records) {
    if (record2.queuedAt < minimumQueuedAt || record2.queuedAt > now2 + 6e4)
      continue;
    const key2 = `${record2.scopeKey}\0${record2.operationId}`;
    const previous2 = byOperation.get(key2);
    if (!previous2 || record2.queuedAt > previous2.queuedAt)
      byOperation.set(key2, record2);
  }
  return [...byOperation.values()].sort(
    (left, right) => left.queuedAt - right.queuedAt,
  );
}

export function writeUploadFinalizeOutbox(records) {
  try {
    if (records.length === 0) {
      localStorage.removeItem(UPLOAD_FINALIZE_OUTBOX_KEY);
    } else {
      localStorage.setItem(UPLOAD_FINALIZE_OUTBOX_KEY, JSON.stringify(records));
    }
    return true;
  } catch {
    return false;
  }
}

export function uploadCommitTimeoutMs(attachments) {
  const staged = attachments.filter((attachment) => attachment.staged);
  if (staged.some((attachment) => attachment.fileSize === void 0)) {
    return UPLOAD_COMMIT_MAX_TIMEOUT_MS;
  }
  const totalBytes = staged.reduce(
    (sum2, attachment) => sum2 + (attachment.fileSize ?? 0),
    0,
  );
  const estimatedCommitMs = Math.ceil(
    ((totalBytes * UPLOAD_COMMIT_WORST_CASE_BYTE_PASSES) /
      UPLOAD_COMMIT_MIN_THROUGHPUT_BYTES_PER_SECOND) *
      1e3,
  );
  return Math.min(
    UPLOAD_COMMIT_MAX_TIMEOUT_MS,
    Math.max(
      UPLOAD_COMMIT_MIN_TIMEOUT_MS,
      UPLOAD_COMMIT_MIN_TIMEOUT_MS + estimatedCommitMs,
    ),
  );
}
