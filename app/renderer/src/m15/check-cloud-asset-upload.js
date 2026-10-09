// check-cloud-asset-upload.js
import { reactExports, useQuery, useStorage, QueryClient } from "../vendor.js";
import { useAuth } from "./apply-asset-change.jsx";
import { assetCenterLog } from "./graph.jsx";
import { useGatewayFetch, useGatewayReady$1, useGatewayUrl } from "./use-resizable-width.js";
export function V1LaunchNoticeSilentMigration() {
  const { isLoggedIn, isLoading: authLoading, clearLocalAuth } = useAuth();
  const [pending2, setPending, , isHydrated] = useStorage("global.v1LaunchNoticePending");
  const consumedRef = reactExports.useRef(false);
  reactExports.useEffect(() => {
    if (!isHydrated || pending2 !== true || authLoading || consumedRef.current) return;
    consumedRef.current = true;
    void setPending(false);
    if (isLoggedIn) clearLocalAuth();
  }, [isHydrated, pending2, authLoading, isLoggedIn, clearLocalAuth, setPending]);
  return null;
}
export const CANVAS_SURFACE_RECOVERY_MEASURE = "hilo:canvas:surface-recovery";
export const FALLBACK_LOG_SERVICE = {
  info: (message2) => console.info(message2),
  warn: (message2) => console.warn(message2),
};
export function safeInfo(logService2, message2) {
  try {
    logService2.info(message2);
  } catch {
    FALLBACK_LOG_SERVICE.info(message2);
  }
}
export function safeWarn(logService2, message2) {
  try {
    logService2.warn(message2);
  } catch {
    FALLBACK_LOG_SERVICE.warn(message2);
  }
}
export function safeTrack(services2, eventName, properties2) {
  try {
    services2.trackEvent(eventName, properties2);
  } catch (error) {
    safeWarn(
      services2.logService,
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
export function isGlobalStorageSchema(data2) {
  if (data2 == null || typeof data2 !== "object") return false;
  const obj = data2;
  return typeof obj._version === "number" && obj.config != null && typeof obj.config === "object";
}
export const TEAM_ACCOUNT_BOOTSTRAP_ENABLED = true;
export const DEFAULT_OPEN_DELAY_MS = 400;
export function stepRevision(step) {
  return step.revision ?? 1;
}
export function resolveSeenRevision(dismissed, markId) {
  if (!Array.isArray(dismissed)) return 0;
  const prefix = `${markId}@`;
  let seen2 = 0;
  for (const entry of dismissed) {
    if (typeof entry !== "string") continue;
    if (entry === markId) {
      seen2 = Math.max(seen2, 1);
    } else if (entry.startsWith(prefix)) {
      const rev = Number(entry.slice(prefix.length));
      if (Number.isInteger(rev)) seen2 = Math.max(seen2, rev);
    }
  }
  return seen2;
}
export function appendSeenEntries(prev, markId, maxRevision) {
  const arr = Array.isArray(prev) ? prev : [];
  const additions = [markId, ...(maxRevision > 1 ? [`${markId}@${maxRevision}`] : [])].filter(
    (id2) => !arr.includes(id2),
  );
  return additions.length ? [...arr, ...additions] : arr;
}
export const HOME_INPUT_COACH_MARK_ID = "home-input-intro";
export const HOME_INPUT_TOUR_REVISION = 3;
export const ASSET_CENTER_RELOCATION_REVISION = HOME_INPUT_TOUR_REVISION;
export const BASE = "/api/asset-center";
export function isRecord$9(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
export async function readObject(res, label) {
  const value = await res.json();
  if (!isRecord$9(value)) {
    throw new Error(`Invalid asset-center response shape: ${label}`);
  }
  return value;
}
export async function readEnvelope$1(res, key2, label, expected = "object") {
  const data2 = await readObject(res, label);
  const value = data2[key2];
  if (
    value === void 0 ||
    (expected === "array" && !Array.isArray(value)) ||
    (expected === "object" && !isRecord$9(value))
  ) {
    throw new Error(`Invalid asset-center response shape: ${label}.${key2}`);
  }
  return value;
}
export class AssetCenterApiError extends Error {
  code;
  httpStatus;
  constructor(message2, opts) {
    super(message2);
    this.name = "AssetCenterApiError";
    this.code = opts.code;
    this.httpStatus = opts.httpStatus;
  }
}
function parseAssetCenterErrorBody(body2) {
  if (!isRecord$9(body2)) return null;
  const code2 = body2.code;
  const message2 = body2.message;
  const httpStatus = body2.httpStatus;
  if (typeof code2 !== "string" || typeof message2 !== "string" || typeof httpStatus !== "number") {
    return null;
  }
  return body2;
}
export async function wrapAsAssetCenterError(res) {
  const httpStatus = res.status;
  let code2;
  let message2;
  try {
    const body2 = await res.clone().json();
    const parsed = parseAssetCenterErrorBody(body2);
    if (parsed) {
      code2 = parsed.code;
      message2 = parsed.message;
    } else {
      const data2 = body2;
      if (isRecord$9(data2)) {
        if (typeof data2.message === "string") message2 = data2.message;
        else if (Array.isArray(data2.message)) message2 = data2.message.join("; ");
        else if (typeof data2.error === "string") message2 = data2.error;
        else message2 = `${httpStatus} ${res.statusText}`;
      } else {
        message2 = `${httpStatus} ${res.statusText}`;
      }
    }
  } catch {
    message2 = `${httpStatus} ${res.statusText}`;
  }
  return new AssetCenterApiError(message2, {
    code: code2,
    httpStatus,
  });
}
function wrapFetcherForAssetCenterErrors(fetcher, buildUrl) {
  return async (path2, options) => {
    try {
      return await fetcher(path2, options);
    } catch (err) {
      if (!(err instanceof Error) || !path2.startsWith(BASE)) {
        throw err;
      }
      const method = (options?.method ?? "GET").toUpperCase();
      if (method !== "GET" && method !== "HEAD") {
        throw err;
      }
      const wrapped = await reissueAsAssetCenterError(path2, options, buildUrl);
      throw wrapped ?? err;
    }
  };
}
async function reissueAsAssetCenterError(path2, options, buildUrl) {
  const url2 = buildUrl(path2);
  if (!url2) return null;
  const { timeoutMs: _timeoutMs, ...init2 } = options ?? {};
  let res;
  try {
    res = await fetch(url2, init2);
  } catch {
    return null;
  }
  if (res.ok) return null;
  return wrapAsAssetCenterError(res);
}
async function listEntities(fetcher, opts = {}) {
  const params = new URLSearchParams();
  if (opts.type) params.set("type", opts.type);
  if (opts.q) params.set("q", opts.q);
  if (opts.limit !== void 0) params.set("limit", String(opts.limit));
  if (opts.sort) params.set("sort", opts.sort);
  const qs = params.toString();
  const res = await fetcher(`${BASE}/entities${qs ? `?${qs}` : ""}`);
  return readEnvelope$1(res, "entities", "entities", "array");
}
async function getAssetCenterLibraryStatus(fetcher) {
  const res = await fetcher(`${BASE}/library-status`);
  const data2 = await readObject(res, "library-status");
  if (typeof data2.initialized !== "boolean") {
    throw new Error("Invalid asset-center response shape: library-status.initialized");
  }
  return {
    initialized: data2.initialized,
  };
}
const emptyDarkUrl = "" + new URL("../empty-dark-BE6TzTYo.svg", import.meta.url).href;
const emptyLightUrl = "" + new URL("../empty-light-BIA_9y_3.svg", import.meta.url).href;
const emptyProjectDarkUrl = "" + new URL("../empty-project-dark-DfthmI8z.svg", import.meta.url).href;
const emptyProjectLightUrl = "" + new URL("../empty-project-light-VIJs1g6w.svg", import.meta.url).href;
const errorDarkUrl = "" + new URL("../error-dark-DDp36kGq.svg", import.meta.url).href;
const errorLightUrl = "" + new URL("../error-light-WSZvGPdq.svg", import.meta.url).href;
const networkErrorDarkUrl = "" + new URL("../network-error-dark-DyHxJMnZ.svg", import.meta.url).href;
const networkErrorLightUrl = "" + new URL("../network-error-light-brwv6dty.svg", import.meta.url).href;
export const ILLUSTRATION_URLS = {
  empty: {
    light: emptyLightUrl,
    dark: emptyDarkUrl,
  },
  empty_project_icon: {
    light: emptyProjectLightUrl,
    dark: emptyProjectDarkUrl,
  },
  error: {
    light: errorLightUrl,
    dark: errorDarkUrl,
  },
  network: {
    light: networkErrorLightUrl,
    dark: networkErrorDarkUrl,
  },
};
export const ROOT_KEY$1 = ["asset-center"];
export function useAssetCenterFetcher() {
  const fetcher = useGatewayFetch();
  const buildUrl = useGatewayUrl();
  return reactExports.useMemo(
    () => wrapFetcherForAssetCenterErrors(fetcher, buildUrl),
    [fetcher, buildUrl],
  );
}
export const assetCenterKeys = {
  entities: (opts) => [...ROOT_KEY$1, "entities", opts ?? {}],
  libraryStatus: () => [...ROOT_KEY$1, "library-status"],
  entity: (entityId) => [...ROOT_KEY$1, "entity", entityId],
  entityCanvas: (entityId) => [...ROOT_KEY$1, "entity", entityId, "canvas"],
  attachment: (attachmentId) => [...ROOT_KEY$1, "attachment", attachmentId],
  search: (q2, opts) => [...ROOT_KEY$1, "search", q2, opts ?? {}],
  autoInjected: () => [...ROOT_KEY$1, "auto-injected"],
  suggestions: (limit) => [...ROOT_KEY$1, "suggestions", limit ?? null],
};
export function useEntities(opts = {}) {
  const fetcher = useAssetCenterFetcher();
  const gatewayReady = useGatewayReady$1();
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
  const gatewayReady = useGatewayReady$1();
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
      resolveSeenRevision(dismissedCoachMarks, HOME_INPUT_COACH_MARK_ID) <
        ASSET_CENTER_RELOCATION_REVISION,
  };
}
export function useAssetCenterRelocation() {
  const [dismissedCoachMarks, , , dismissedHydrated] = useStorage("global.dismissedCoachMarks");
  const [globalConfig, , , configHydrated] = useStorage("global.config");
  const entitiesQuery = useEntities();
  const libraryStatusQuery = useAssetCenterLibraryStatus();
  const gatewayReady = useGatewayReady$1();
  const entitiesReady = gatewayReady && entitiesQuery.isSuccess && !entitiesQuery.isFetching;
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
const CLOUD_ASSET_MAX_FILE_BYTES = 300 * 1024 * 1024;
export const PROJECT_ASSET_MAX_VISIBLE_FOLDER_LEVELS = 4;
const PROJECT_ASSET_MAX_FOLDER_DEPTH = PROJECT_ASSET_MAX_VISIBLE_FOLDER_LEVELS - 1;
const PROJECT_ASSET_MAX_FILE_DEPTH = PROJECT_ASSET_MAX_FOLDER_DEPTH + 1;
export function getProjectAssetWritePolicy(currentFolderDepth) {
  return {
    canCreateFolder: currentFolderDepth < PROJECT_ASSET_MAX_FOLDER_DEPTH,
    canCreateFile: currentFolderDepth < PROJECT_ASSET_MAX_FILE_DEPTH,
  };
}
const CLOUD_ASSET_VIDEO_MAX_DURATION_SECONDS = 5 * 60;
const CLOUD_ASSET_AUDIO_MAX_DURATION_SECONDS = 20 * 60;
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
export function cloudAssetMimeType(fileName) {
  return CLOUD_ASSET_MIME_TYPES[cloudAssetExtension(fileName)];
}
const EXTENSION_TO_CATEGORY = new Map(
  Object.entries(CLOUD_ASSET_EXTENSIONS).flatMap(([category, exts]) =>
    exts.map((ext) => [ext, category]),
  ),
);
export const CLOUD_ASSET_ACCEPT = [...EXTENSION_TO_CATEGORY.keys()]
  .map((ext) => `.${ext}`)
  .join(",");
export function cloudAssetExtension(fileName) {
  const base2 = fileName.slice(Math.max(fileName.lastIndexOf("/"), fileName.lastIndexOf("\\")) + 1);
  const idx = base2.lastIndexOf(".");
  if (idx <= 0 || idx === base2.length - 1) return "";
  return base2.slice(idx + 1).toLowerCase();
}
function classifyCloudAsset(fileName) {
  return EXTENSION_TO_CATEGORY.get(cloudAssetExtension(fileName)) ?? null;
}
function durationCapFor(category) {
  if (category === "video") return CLOUD_ASSET_VIDEO_MAX_DURATION_SECONDS;
  if (category === "audio") return CLOUD_ASSET_AUDIO_MAX_DURATION_SECONDS;
  return void 0;
}
export function checkCloudAssetUpload(candidate) {
  const category = classifyCloudAsset(candidate.fileName);
  if (!category)
    return {
      ok: false,
      rejection: "unsupported-type",
    };
  if (candidate.sizeBytes > CLOUD_ASSET_MAX_FILE_BYTES) {
    return {
      ok: false,
      rejection: "file-too-large",
      category,
    };
  }
  const maxDurationSeconds = durationCapFor(category);
  if (
    maxDurationSeconds !== void 0 &&
    candidate.durationSeconds !== void 0 &&
    candidate.durationSeconds > maxDurationSeconds
  ) {
    return {
      ok: false,
      rejection: "duration-exceeded",
      category,
    };
  }
  return maxDurationSeconds !== void 0
    ? {
        ok: true,
        category,
        maxDurationSeconds,
      }
    : {
        ok: true,
        category,
      };
}
