// classify-upload-error.js
import { API_PATHS } from "../infra/workspace-gateway.js";
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

export async function createHeicPreviewObjectUrl(filename, data) {
  if (!isHeicFilename(filename)) return null;
  try {
    const path = `${API_PATHS.heicPreview}?filename=${encodeURIComponent(filename)}`;
    const response = await gatewayFetch(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
      },
      body: data,
      timeoutMs: 2e4,
    });
    return URL.createObjectURL(await response.blob());
  } catch {
    return null;
  }
}

export async function createHeicPreviewObjectUrlFromUrl(
  filename,
  url,
  fetcher = (target) => fetch(target),
) {
  if (!isHeicFilename(filename)) return null;
  try {
    const response = await fetcher(url);
    if (!response.ok) return null;
    return createHeicPreviewObjectUrl(filename, await response.arrayBuffer());
  } catch {
    return null;
  }
}

export const MESSAGE_INPUT_POPOVER_Z_INDEX = 51;

export function isFileAttachment(attachment) {
  return (attachment.kind ?? "file") === "file";
}

export class UploadCommitUnsupportedFilesystemError extends Error {
  code = UPLOAD_COMMIT_SAFE_PUBLISH_UNSUPPORTED;
  constructor() {
    super("workspace filesystem does not support safe attachment publishing");
    this.name = "UploadCommitUnsupportedFilesystemError";
  }
}

function kindFromErrorCode(code) {
  switch (code) {
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

export function classifyUploadError(rawMessage, status, code) {
  const codeKind = kindFromErrorCode(code);
  if (codeKind) return codeKind;
  if (status === 413) return "fileTooLarge";
  if (status && status >= 500) return "serverUnavailable";
  const message = rawMessage.toLowerCase();
  if (
    message.includes("payload too large") ||
    message.includes("file too large") ||
    message.includes("too large") ||
    message.includes("request entity too large") ||
    message.includes("413")
  ) {
    return "fileTooLarge";
  }
  if (
    message.includes("failed to fetch") ||
    message.includes("network") ||
    message.includes("load failed") ||
    message.includes("fetch failed")
  ) {
    return "network";
  }
  if (
    message.includes("unsupported") ||
    message.includes("invalid file type") ||
    message.includes("not supported")
  ) {
    return "unsupportedType";
  }
  if (
    message.includes("timeout") ||
    message.includes("timed out") ||
    message.includes("aborted")
  ) {
    return "timeout";
  }
  if (message.includes("no file") || message.includes("missing file")) {
    return "empty";
  }
  if (message.includes("internal server error") || message.includes("500")) {
    return "serverUnavailable";
  }
  return "generic";
}

export function uploadErrorMessage(translate, kind) {
  switch (kind) {
    case "fileTooLarge":
      return translate("chat.uploadError.fileTooLarge");
    case "network":
      return translate("chat.uploadError.network");
    case "unsupportedType":
      return translate("chat.uploadError.unsupportedType");
    case "timeout":
      return translate("chat.uploadError.timeout");
    case "empty":
      return translate("chat.uploadError.empty");
    case "serverUnavailable":
      return translate("chat.uploadError.serverUnavailable");
    case "generic":
      return translate("chat.uploadError.generic");
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
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean)
    .some((token) => {
      if (token === "*/*") return true;
      if (token.startsWith(".")) return filename.endsWith(token);
      if (token.endsWith("/*")) {
        if (mimeType) return mimeType.startsWith(token.slice(0, -1));
        const kind = detectFileType(file.name);
        return (
          ["image", "video", "audio"].includes(kind) && token === `${kind}/*`
        );
      }
      return mimeType === token;
    });
}

const UPLOAD_COMMIT_MIN_TIMEOUT_MS = 3e4;

const UPLOAD_COMMIT_MAX_TIMEOUT_MS = 60 * 6e4;

const UPLOAD_COMMIT_WORST_CASE_BYTE_PASSES = 3;

const UPLOAD_COMMIT_MIN_THROUGHPUT_BYTES_PER_SECOND = 6 * 1024 * 1024;

export const UPLOAD_FINALIZE_OUTBOX_KEY =
  "hilo:upload-commit-finalize-outbox:v1";

const UPLOAD_FINALIZE_OUTBOX_TTL_MS = 7 * 24 * 60 * 60 * 1e3;

export function compactUploadFinalizeOutbox(records, now) {
  const minimumQueuedAt = now - UPLOAD_FINALIZE_OUTBOX_TTL_MS;
  const byOperation = new Map();
  for (const record of records) {
    if (record.queuedAt < minimumQueuedAt || record.queuedAt > now + 6e4)
      continue;
    const key = `${record.scopeKey}\0${record.operationId}`;
    const previous = byOperation.get(key);
    if (!previous || record.queuedAt > previous.queuedAt)
      byOperation.set(key, record);
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
    (sum, attachment) => sum + (attachment.fileSize ?? 0),
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
