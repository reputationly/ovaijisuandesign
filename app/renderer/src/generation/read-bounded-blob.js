// read-bounded-blob.js
import { normalizeHomeQuickStartAssetUrl } from "./use-skill-categories.js";

const SCENE_ATTACHMENT_DOWNLOAD_TIMEOUT_MS = 3e4;

const MAX_SCENE_ATTACHMENT_FILE_BYTES = 50 * 1024 * 1024;

const MAX_SCENE_ATTACHMENTS_TOTAL_BYTES = 100 * 1024 * 1024;

function mimeFromName(name2) {
  const extension2 = name2.toLowerCase().split(".").pop() ?? "";
  switch (extension2) {
    case "pdf":
      return "application/pdf";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    case "mp4":
    case "m4v":
      return "video/mp4";
    case "mov":
      return "video/quicktime";
    case "webm":
      return "video/webm";
    case "mp3":
      return "audio/mpeg";
    case "wav":
      return "audio/wav";
    case "m4a":
      return "audio/mp4";
    case "aac":
      return "audio/aac";
    case "flac":
      return "audio/flac";
    case "ogg":
      return "audio/ogg";
    default:
      return "application/octet-stream";
  }
}

function responseMime(response, name2) {
  const contentType = response.headers
    .get("content-type")
    ?.split(";", 1)[0]
    ?.trim();
  return contentType && contentType !== "application/octet-stream"
    ? contentType
    : mimeFromName(name2);
}

function contentLength(response) {
  const raw2 = response.headers.get("content-length");
  if (!raw2) return void 0;
  const parsed = Number(raw2);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : void 0;
}

function createDownloadBudget(maxTotalBytes) {
  let reservedBytes = 0;
  const ensureCapacity = (bytes2) => {
    if (bytes2 > maxTotalBytes - reservedBytes) {
      throw new Error(
        `scene attachments exceed total limit of ${maxTotalBytes} bytes`,
      );
    }
  };
  return {
    ensureCapacity,
    reserve: (bytes2) => {
      ensureCapacity(bytes2);
      reservedBytes += bytes2;
    },
  };
}

async function readBoundedBlob(response, name2, budget, maxFileBytes) {
  const declaredBytes = contentLength(response);
  if (declaredBytes !== void 0) {
    if (declaredBytes > maxFileBytes) {
      throw new Error(
        `scene attachment exceeds file limit of ${maxFileBytes} bytes`,
      );
    }
    budget.ensureCapacity(declaredBytes);
  }
  if (!response.body) {
    throw new Error("scene attachment response has no body");
  }
  const reader = response.body.getReader();
  const chunks = [];
  let receivedBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value || value.byteLength === 0) continue;
      if (receivedBytes + value.byteLength > maxFileBytes) {
        throw new Error(
          `scene attachment exceeds file limit of ${maxFileBytes} bytes`,
        );
      }
      budget.reserve(value.byteLength);
      receivedBytes += value.byteLength;
      const chunk2 = new Uint8Array(value.byteLength);
      chunk2.set(value);
      chunks.push(chunk2.buffer);
    }
  } catch (error) {
    await reader.cancel().catch(() => void 0);
    throw error;
  } finally {
    reader.releaseLock();
  }
  return new Blob(chunks, {
    type: responseMime(response, name2),
  });
}

const MIME_FILE_EXTENSIONS = {
  "application/pdf": ".pdf",
  "audio/aac": ".aac",
  "audio/flac": ".flac",
  "audio/mp4": ".m4a",
  "audio/mpeg": ".mp3",
  "audio/ogg": ".ogg",
  "audio/wav": ".wav",
  "audio/x-wav": ".wav",
  "image/gif": ".gif",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "video/mp4": ".mp4",
  "video/quicktime": ".mov",
  "video/webm": ".webm",
};

function normalizeFilenameForMime(name2, mime) {
  const extension2 = MIME_FILE_EXTENSIONS[mime.toLowerCase()];
  if (!extension2) return name2;
  const dotIndex = name2.lastIndexOf(".");
  if (dotIndex <= 0) return `${name2}${extension2}`;
  if (name2.slice(dotIndex).toLowerCase() === extension2) return name2;
  return `${name2.slice(0, dotIndex)}${extension2}`;
}

async function downloadSceneAttachment(
  attachment,
  budget,
  {
    fetcher = fetch,
    timeoutMs = SCENE_ATTACHMENT_DOWNLOAD_TIMEOUT_MS,
    maxFileBytes = MAX_SCENE_ATTACHMENT_FILE_BYTES,
    signal,
  },
) {
  const url2 = normalizeHomeQuickStartAssetUrl(attachment.assetUrl);
  if (!url2)
    throw new Error("scene attachment URL is not on the trusted CDN allowlist");
  const response = await fetcher(url2, {
    credentials: "omit",
    redirect: "follow",
    referrerPolicy: "no-referrer",
    signal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)])
      : AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) throw new Error(`scene attachment HTTP ${response.status}`);
  if (response.url && !normalizeHomeQuickStartAssetUrl(response.url)) {
    throw new Error(
      "scene attachment redirected outside the trusted CDN allowlist",
    );
  }
  const blob = await readBoundedBlob(
    response,
    attachment.name,
    budget,
    maxFileBytes,
  );
  return new File(
    [blob],
    normalizeFilenameForMime(attachment.name, blob.type),
    {
      type: blob.type,
    },
  );
}

export async function fetchSceneAttachments(attachments, options = {}) {
  const withUrl = attachments.filter(
    (attachment) =>
      typeof attachment.assetUrl === "string" && attachment.assetUrl.length > 0,
  );
  if (withUrl.length === 0)
    return {
      files: [],
      failed: [],
    };
  const budget = createDownloadBudget(
    options.maxTotalBytes ?? MAX_SCENE_ATTACHMENTS_TOTAL_BYTES,
  );
  const results = await Promise.allSettled(
    withUrl.map((attachment) =>
      downloadSceneAttachment(attachment, budget, options),
    ),
  );
  const files = [];
  const failed = [];
  results.forEach((result, index2) => {
    if (result.status === "fulfilled") files.push(result.value);
    else failed.push(withUrl[index2]);
  });
  return {
    files,
    failed,
  };
}
