// 其余还确认是应用自己的运行时常量，先从转发文件里拿出来。
import reactExports from "react";

export const ASSET_MODEL_USER_UPLOADED = "user_uploaded";
export const ASSET_MODEL_IMPORTED = "imported";
export function isUserProvidedAssetModel(model) {
  return model === ASSET_MODEL_USER_UPLOADED || model === ASSET_MODEL_IMPORTED;
}
export const BACKEND_VIBE_STORYBOARD = "vibe_storyboard";
export const GROUP_ID_HEADER = "x-group-id";
export const AssetMetadataStoreContext = reactExports.createContext(null);
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
export const DEFAULT_READ_TIMEOUT_MS = 3e4;
export const DEFAULT_GENERATE_TIMEOUT_MS = 18e6;
export const DEFAULT_GENERATE_VIDEO_TIMEOUT_MS = 183e5;
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
export let selectedRequestGroupId = null;
export function setSelectedRequestGroupId(groupId) {
  selectedRequestGroupId = groupId;
}
export function noop() {}
export function resolveEnabled(enabled, query) {
  return typeof enabled === "function" ? enabled(query) : enabled;
}
export const CurrentWorkspaceContext = reactExports.createContext("");
export function useCurrentWorkspace() {
  return reactExports.useContext(CurrentWorkspaceContext);
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
export function warnEnrollError(op, res) {
  if (res.enrollError) {
    console.warn(`[asset-mutator] ${op} succeeded on disk but enrollment failed:`, res.enrollError);
  }
}
export function tryParseJson$1(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return void 0;
  }
}
