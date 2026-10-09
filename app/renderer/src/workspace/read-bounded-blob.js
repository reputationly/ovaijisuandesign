// read-bounded-blob.js

const TRUSTED_STARTER_ASSET_HOSTS = new Set([
  "cdn.hailuoai.com",
  "cdn.hailuoai.video",
]);

const STARTER_REF_DOWNLOAD_TIMEOUT_MS = 3e4;

const MAX_STARTER_REF_FILE_BYTES = 100 * 1024 * 1024;

const MAX_STARTER_REFS_TOTAL_BYTES = 200 * 1024 * 1024;

function trustedStarterAssetUrl(value) {
  try {
    const url2 = new URL(value);
    if (
      url2.protocol !== "https:" ||
      !TRUSTED_STARTER_ASSET_HOSTS.has(url2.hostname.toLowerCase()) ||
      url2.port !== "" ||
      url2.username !== "" ||
      url2.password !== ""
    ) {
      return void 0;
    }
    return url2.toString();
  } catch {
    return void 0;
  }
}

function mimeFromName$1(name2) {
  const extension2 = name2.toLowerCase().split(".").pop() ?? "";
  switch (extension2) {
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
    default:
      return "application/octet-stream";
  }
}

function responseMime$1(response, name2) {
  const contentType = response.headers
    .get("content-type")
    ?.split(";", 1)[0]
    ?.trim();
  return contentType && contentType !== "application/octet-stream"
    ? contentType
    : mimeFromName$1(name2);
}

function createDownloadBudget$1(maxTotalBytes) {
  let reservedBytes = 0;
  const ensureCapacity = (bytes2) => {
    if (bytes2 > maxTotalBytes - reservedBytes) {
      throw new Error(
        `starter refs exceed total limit of ${maxTotalBytes} bytes`,
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

async function readBoundedBlob$1(response, name2, budget, maxFileBytes) {
  const rawLength = response.headers.get("content-length");
  const declaredBytes = rawLength ? Number(rawLength) : void 0;
  if (
    declaredBytes !== void 0 &&
    Number.isSafeInteger(declaredBytes) &&
    declaredBytes >= 0
  ) {
    if (declaredBytes > maxFileBytes) {
      throw new Error(
        `starter ref exceeds file limit of ${maxFileBytes} bytes`,
      );
    }
    budget.ensureCapacity(declaredBytes);
  }
  if (!response.body) {
    throw new Error("starter ref response has no body");
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
          `starter ref exceeds file limit of ${maxFileBytes} bytes`,
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
    type: responseMime$1(response, name2),
  });
}

async function downloadStarterRef(
  ref,
  budget,
  {
    fetcher = fetch,
    timeoutMs = STARTER_REF_DOWNLOAD_TIMEOUT_MS,
    maxFileBytes = MAX_STARTER_REF_FILE_BYTES,
    signal,
  },
) {
  const url2 = trustedStarterAssetUrl(ref.url);
  if (!url2)
    throw new Error("starter ref URL is not on the trusted CDN allowlist");
  const response = await fetcher(url2, {
    credentials: "omit",
    redirect: "follow",
    referrerPolicy: "no-referrer",
    signal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)])
      : AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) throw new Error(`starter ref HTTP ${response.status}`);
  if (response.url && !trustedStarterAssetUrl(response.url)) {
    throw new Error("starter ref redirected outside the trusted CDN allowlist");
  }
  const blob = await readBoundedBlob$1(
    response,
    ref.name,
    budget,
    maxFileBytes,
  );
  return new File([blob], ref.name, {
    type: blob.type,
  });
}

export async function fetchVideoStarterRefs(refs, options = {}) {
  if (refs.length === 0)
    return {
      files: [],
      failed: [],
    };
  const budget = createDownloadBudget$1(
    options.maxTotalBytes ?? MAX_STARTER_REFS_TOTAL_BYTES,
  );
  const results = await Promise.allSettled(
    refs.map((ref) => downloadStarterRef(ref, budget, options)),
  );
  const files = [];
  const failed = [];
  results.forEach((result, index2) => {
    if (result.status === "fulfilled") {
      files.push({
        ref: refs[index2],
        file: result.value,
      });
    } else {
      failed.push(refs[index2]);
    }
  });
  return {
    files,
    failed,
  };
}
