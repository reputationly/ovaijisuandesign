// wrap-as-asset-center-error.js
import { QueryClient } from "@tanstack/query-core";
import reactExports from "react";
import { useQuery } from "@tanstack/react-query";
import { useStorage } from "../infra/use-storage.js";
import {
  useGatewayFetch,
  useGatewayReady,
  useGatewayUrl,
} from "../generation/use-model-catalog-scope-key.js";
import { assetCenterLog } from "../vendor-inline/vscode-base/graph.jsx";
export const CANVAS_SURFACE_RECOVERY_MEASURE = "hilo:canvas:surface-recovery";
export const FALLBACK_LOG_SERVICE = {
  info: (message) => console.info(message),
  warn: (message) => console.warn(message),
};
export function safeInfo(logService, message) {
  try {
    logService.info(message);
  } catch {
    FALLBACK_LOG_SERVICE.info(message);
  }
}
export function safeWarn(logService, message) {
  try {
    logService.warn(message);
  } catch {
    FALLBACK_LOG_SERVICE.warn(message);
  }
}
export function safeTrack(services, eventName, properties) {
  try {
    services.trackEvent(eventName, properties);
  } catch (error) {
    safeWarn(
      services.logService,
      `[canvas-render] telemetry_failed ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
export const ImBridgeDialogCtx = reactExports.createContext(null);
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Number.POSITIVE_INFINITY,
      gcTime: Number.POSITIVE_INFINITY,
      retry: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      networkMode: "always",
    },
    mutations: {
      networkMode: "always",
    },
  },
});
export function resolveSeenRevision(dismissed, markId) {
  if (!Array.isArray(dismissed)) return 0;
  const prefix = `${markId}@`;
  let seen = 0;
  for (const entry of dismissed) {
    if (typeof entry !== "string") continue;
    if (entry === markId) {
      seen = Math.max(seen, 1);
    } else if (entry.startsWith(prefix)) {
      const rev = Number(entry.slice(prefix.length));
      if (Number.isInteger(rev)) seen = Math.max(seen, rev);
    }
  }
  return seen;
}
export const HOME_INPUT_COACH_MARK_ID = "home-input-intro";
export const HOME_INPUT_TOUR_REVISION = 3;
export const ASSET_CENTER_RELOCATION_REVISION = HOME_INPUT_TOUR_REVISION;
export const BASE = "/api/asset-center";
export function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
export async function readObject(res, label) {
  const value = await res.json();
  if (!isRecord(value)) {
    throw new Error(`Invalid asset-center response shape: ${label}`);
  }
  return value;
}
export async function readEnvelope(res, key, label, expected = "object") {
  const data = await readObject(res, label);
  const value = data[key];
  if (
    value === void 0 ||
    (expected === "array" && !Array.isArray(value)) ||
    (expected === "object" && !isRecord(value))
  ) {
    throw new Error(`Invalid asset-center response shape: ${label}.${key}`);
  }
  return value;
}
export class AssetCenterApiError extends Error {
  code;
  httpStatus;
  constructor(message, opts) {
    super(message);
    this.name = "AssetCenterApiError";
    this.code = opts.code;
    this.httpStatus = opts.httpStatus;
  }
}
function parseAssetCenterErrorBody(body) {
  if (!isRecord(body)) return null;
  const code = body.code;
  const message = body.message;
  const httpStatus = body.httpStatus;
  if (
    typeof code !== "string" ||
    typeof message !== "string" ||
    typeof httpStatus !== "number"
  ) {
    return null;
  }
  return body;
}
export async function wrapAsAssetCenterError(res) {
  const httpStatus = res.status;
  let code;
  let message;
  try {
    const body = await res.clone().json();
    const parsed = parseAssetCenterErrorBody(body);
    if (parsed) {
      code = parsed.code;
      message = parsed.message;
    } else {
      const data = body;
      if (isRecord(data)) {
        if (typeof data.message === "string") message = data.message;
        else if (Array.isArray(data.message))
          message = data.message.join("; ");
        else if (typeof data.error === "string") message = data.error;
        else message = `${httpStatus} ${res.statusText}`;
      } else {
        message = `${httpStatus} ${res.statusText}`;
      }
    }
  } catch {
    message = `${httpStatus} ${res.statusText}`;
  }
  return new AssetCenterApiError(message, {
    code,
    httpStatus,
  });
}
async function reissueAsAssetCenterError(path, options, buildUrl) {
  const url = buildUrl(path);
  if (!url) return null;
  const { timeoutMs: _timeoutMs, ...init } = options ?? {};
  let res;
  try {
    res = await fetch(url, init);
  } catch {
    return null;
  }
  if (res.ok) return null;
  return wrapAsAssetCenterError(res);
}
function wrapFetcherForAssetCenterErrors(fetcher, buildUrl) {
  return async (path, options) => {
    try {
      return await fetcher(path, options);
    } catch (err) {
      if (!(err instanceof Error) || !path.startsWith(BASE)) {
        throw err;
      }
      const method = (options?.method ?? "GET").toUpperCase();
      if (method !== "GET" && method !== "HEAD") {
        throw err;
      }
      const wrapped = await reissueAsAssetCenterError(path, options, buildUrl);
      throw wrapped ?? err;
    }
  };
}
async function listEntities(fetcher, opts = {}) {
  const params = new URLSearchParams();
  if (opts.type) params.set("type", opts.type);
  if (opts.q) params.set("q", opts.q);
  if (opts.limit !== void 0) params.set("limit", String(opts.limit));
  if (opts.sort) params.set("sort", opts.sort);
  const queryString = params.toString();
  const res = await fetcher(`${BASE}/entities${queryString ? `?${queryString}` : ""}`);
  return readEnvelope(res, "entities", "entities", "array");
}
async function getAssetCenterLibraryStatus(fetcher) {
  const res = await fetcher(`${BASE}/library-status`);
  const data = await readObject(res, "library-status");
  if (typeof data.initialized !== "boolean") {
    throw new Error(
      "Invalid asset-center response shape: library-status.initialized",
    );
  }
  return {
    initialized: data.initialized,
  };
}
export const ROOT_KEY = ["asset-center"];
export function useAssetCenterFetcher() {
  const fetcher = useGatewayFetch();
  const buildUrl = useGatewayUrl();
  return reactExports.useMemo(
    () => wrapFetcherForAssetCenterErrors(fetcher, buildUrl),
    [fetcher, buildUrl],
  );
}
export const assetCenterKeys = {
  entities: (opts) => [...ROOT_KEY, "entities", opts ?? {}],
  libraryStatus: () => [...ROOT_KEY, "library-status"],
  entity: (entityId) => [...ROOT_KEY, "entity", entityId],
  entityCanvas: (entityId) => [...ROOT_KEY, "entity", entityId, "canvas"],
  attachment: (attachmentId) => [...ROOT_KEY, "attachment", attachmentId],
  search: (searchQuery, opts) => [...ROOT_KEY, "search", searchQuery, opts ?? {}],
  autoInjected: () => [...ROOT_KEY, "auto-injected"],
  suggestions: (limit) => [...ROOT_KEY, "suggestions", limit ?? null],
};
export function useEntities(opts = {}) {
  const fetcher = useAssetCenterFetcher();
  const gatewayReady = useGatewayReady();
  return useQuery({
    queryKey: assetCenterKeys.entities(opts),
    queryFn: async () => {
      const entities = await listEntities(fetcher, opts);
      const coverEntities = entities.filter((entity) => entity.coverUrl);
      assetCenterLog.info("entities.list_result", {
        opts,
        count: entities.length,
        coverCount: coverEntities.length,
        coverEntityIds: coverEntities.slice(0, 12).map((entity) => entity.id),
        fallbackOnlyIds: entities
          .filter((entity) => !entity.coverUrl && entity.thumbnailUrl)
          .slice(0, 12)
          .map((entity) => entity.id),
      });
      return entities;
    },
    enabled: gatewayReady,
    // The entity library changes only on explicit mutation (create / edit /
    // materialize, all of which invalidate ROOT_KEY). Without a staleTime the
    // default (0) refetches on every window-focus + remount, re-rendering the
    // whole sidebar list each time. 30s matches useMaterializedEntities and
    // keeps the list stable during normal browsing / hover interactions.
    staleTime: 3e4,
  });
}
function useAssetCenterLibraryStatus() {
  const fetcher = useAssetCenterFetcher();
  const gatewayReady = useGatewayReady();
  return useQuery({
    queryKey: assetCenterKeys.libraryStatus(),
    queryFn: () => getAssetCenterLibraryStatus(fetcher),
    enabled: gatewayReady,
    staleTime: 3e4,
  });
}
function resolveAssetCenterRelocationState({
  dismissedCoachMarks,
  dismissedHydrated,
  configHydrated,
  entities,
  entitiesReady,
  assetCenterHidden,
  libraryInitialized = false,
}) {
  const ready = dismissedHydrated && configHydrated && entitiesReady;
  const hasAssetData = Array.isArray(entities) && entities.length > 0;
  const hidden = assetCenterHidden === true;
  return {
    ready,
    hasAssetData,
    assetCenterHidden: hidden,
    libraryInitialized,
    relocationPending:
      ready &&
      !hidden &&
      libraryInitialized &&
      hasAssetData &&
      resolveSeenRevision(dismissedCoachMarks, HOME_INPUT_COACH_MARK_ID) < ASSET_CENTER_RELOCATION_REVISION,
  };
}
export function useAssetCenterRelocation() {
  const [dismissedCoachMarks, , , dismissedHydrated] = useStorage(
    "global.dismissedCoachMarks",
  );
  const [globalConfig, , , configHydrated] = useStorage("global.config");
  const entitiesQuery = useEntities();
  const libraryStatusQuery = useAssetCenterLibraryStatus();
  const gatewayReady = useGatewayReady();
  const entitiesReady =
    gatewayReady && entitiesQuery.isSuccess && !entitiesQuery.isFetching;
  const libraryInitialized =
    gatewayReady &&
    libraryStatusQuery.isSuccess &&
    !libraryStatusQuery.isFetching &&
    libraryStatusQuery.data?.initialized === true;
  return resolveAssetCenterRelocationState({
    dismissedCoachMarks,
    dismissedHydrated,
    configHydrated,
    assetCenterHidden: globalConfig.assetCenterHidden === true,
    entities: entitiesQuery.data,
    entitiesReady,
    libraryInitialized,
  });
}
export const PROJECT_ASSET_MAX_VISIBLE_FOLDER_LEVELS = 4;
const PROJECT_ASSET_MAX_FOLDER_DEPTH = PROJECT_ASSET_MAX_VISIBLE_FOLDER_LEVELS - 1;
const PROJECT_ASSET_MAX_FILE_DEPTH = PROJECT_ASSET_MAX_FOLDER_DEPTH + 1;
export function getProjectAssetWritePolicy(currentFolderDepth) {
  return {
    canCreateFolder: currentFolderDepth < PROJECT_ASSET_MAX_FOLDER_DEPTH,
    canCreateFile: currentFolderDepth < PROJECT_ASSET_MAX_FILE_DEPTH,
  };
}
const CLOUD_ASSET_EXTENSIONS = {
  text: ["txt", "md", "json", "yaml", "csv", "pdf", "doc", "docx"],
  image: ["png", "jpg", "jpeg", "webp", "gif"],
  video: ["mp4", "webm"],
  audio: ["mp3", "wav", "m4a", "ogg"],
  archive: [],
  table: ["htable"],
};
const CLOUD_ASSET_MIME_TYPES = {
  // text
  txt: "text/plain",
  md: "text/markdown",
  json: "application/json",
  yaml: "application/yaml",
  csv: "text/csv",
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  // image
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  // video
  mp4: "video/mp4",
  webm: "video/webm",
  // audio
  mp3: "audio/mpeg",
  wav: "audio/wav",
  m4a: "audio/mp4",
  ogg: "audio/ogg",
  // table — canvas table document (JSON payload); reviewed as text_file via
  // the cloud's extension table, so a text MIME keeps it off the image/audio
  // sync-review path.
  htable: "text/plain",
};
export const EXTENSION_TO_CATEGORY = new Map(
  Object.entries(CLOUD_ASSET_EXTENSIONS).flatMap(([category, exts]) =>
    exts.map((ext) => [ext, category]),
  ),
);
export const CLOUD_ASSET_ACCEPT = [...EXTENSION_TO_CATEGORY.keys()]
  .map((ext) => `.${ext}`)
  .join(",");
export function cloudAssetExtension(fileName) {
  const base = fileName.slice(
    Math.max(fileName.lastIndexOf("/"), fileName.lastIndexOf("\\")) + 1,
  );
  const idx = base.lastIndexOf(".");
  if (idx <= 0 || idx === base.length - 1) return "";
  return base.slice(idx + 1).toLowerCase();
}
export function cloudAssetMimeType(fileName) {
  return CLOUD_ASSET_MIME_TYPES[cloudAssetExtension(fileName)];
}
