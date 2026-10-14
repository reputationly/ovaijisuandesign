// 媒体血缘和扩展名判断是应用自己的请求约定。


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
