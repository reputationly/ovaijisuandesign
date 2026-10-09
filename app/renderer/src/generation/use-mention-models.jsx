// use-mention-models.jsx
import {
  API_PATHS,
  ApiError,
  getSkillCoverUrl,
  instance,
  jsxRuntimeExports,
  reactExports,
  useGatewayScope,
  useQuery,
  useStorage,
} from "../vendor.js";
import {
  classifyRawErrorText,
  GENERATE_ERROR_CODE_CONCURRENCY_LIMIT,
  GENERATE_ERROR_CODE_CONTENT_POLICY_VIOLATION,
  GENERATE_ERROR_CODE_NETWORK_CONNECT_TIMEOUT,
  GENERATE_ERROR_CODE_NETWORK_ERROR,
} from "./normalize-skill-detail-metadata.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { CDN_SKILL_SHOWCASE_FALLBACK } from "../workspace/topbar-state-context.jsx";
import {
  findOfficialConnectorByServerName,
  findOfficialConnectorForServer,
} from "../settings/request-prompt-prefill.jsx";
import {
  useGatewayFetch,
  useModelCatalogScopeKey,
} from "./use-model-catalog-scope-key.js";
const HAILUO03_VIDEO_CONTINUATION_SUB_TYPE = "hailuo03_video_continuation";
export function stringValue(value) {
  return typeof value === "string" ? value.trim() : "";
}
export function includesString(values3, value) {
  return Array.isArray(values3) && values3.includes(value);
}
function hasPath(paths) {
  return paths.some((path2) => path2.trim().length > 0);
}
export function imageModeSubType(imageMode) {
  return stringValue(imageMode) === "video-extension"
    ? HAILUO03_VIDEO_CONTINUATION_SUB_TYPE
    : "";
}
export function isHailuo03VideoTrialEligibleResolution(value, eligibility) {
  return includesString(eligibility?.resolutions, stringValue(value));
}
export function areHailuo03VideoTrialReferencesEligible({
  eligibility,
  imageMode,
  imagePaths,
  videoPaths,
  audioPaths,
}) {
  if (!eligibility) return false;
  if (!eligibility.allowReferenceImages && hasPath(imagePaths)) return false;
  if (!eligibility.allowReferenceAudios && hasPath(audioPaths)) return false;
  if (
    stringValue(imageMode) !== "video-extension" &&
    !eligibility.allowReferenceVideos &&
    hasPath(videoPaths)
  ) {
    return false;
  }
  return true;
}
export function visibleCanvasModels(models) {
  return models.filter((model) => model.visibility !== "hidden");
}
export function findCanvasModel(models, modelId) {
  return models.find(
    (model) =>
      model.id === modelId ||
      model.model_name === modelId ||
      model.name === modelId,
  );
}
const PERSISTED_GENERATE_ERROR_REASONS = new Set([
  GENERATE_ERROR_CODE_CONCURRENCY_LIMIT,
  GENERATE_ERROR_CODE_NETWORK_CONNECT_TIMEOUT,
  GENERATE_ERROR_CODE_NETWORK_ERROR,
  GENERATE_ERROR_CODE_CONTENT_POLICY_VIOLATION,
]);
export function persistedGenerateErrorReason(errorCode) {
  return PERSISTED_GENERATE_ERROR_REASONS.has(errorCode) ? errorCode : void 0;
}
const RAW_ERROR_CLASS_I18N = {
  concurrency: "canvas.errors.concurrency",
  interrupted: "canvas.errors.interrupted",
  timeout: "canvas.errors.timeout",
  network: "canvas.errors.network",
  storage: "canvas.errors.storage",
  technical: "canvas.errors.technical",
};
export function semanticGenerationErrorCopy(raw2) {
  const cls = classifyRawErrorText(raw2);
  return cls ? instance.t(RAW_ERROR_CLASS_I18N[cls]) : raw2;
}
const AMBIGUOUS_SUBMIT_HTTP_STATUSES = new Set([408, 500, 502, 503, 504]);
export function generationErrorStatusFromResponse(presentation) {
  if (presentation === "recoverable") return "recoverable_error";
  if (presentation === "status_unknown") return "status_unknown";
  return "error";
}
export function generationErrorStatusFromThrown(error) {
  if (!(error instanceof ApiError)) return "error";
  if (
    error.type === "network" ||
    error.type === "timeout" ||
    error.type === "parse"
  ) {
    return "status_unknown";
  }
  return error.type === "http" &&
    AMBIGUOUS_SUBMIT_HTTP_STATUSES.has(error.status)
    ? "status_unknown"
    : "error";
}
export function retainedGenerationBlocksResubmit(info2) {
  return (
    info2?.errorStatus === "recoverable_error" ||
    info2?.errorStatus === "status_unknown"
  );
}
export const RESUBMIT_BLOCKED_I18N = [
  "canvas.generationRecovery.resubmitBlocked",
  {
    defaultValue:
      "该内容的生成任务已保留，暂无法重新提交。请先处理卡片上的恢复提示",
  },
];
function scopeChangedError() {
  const error = new Error("Model catalog scope changed while loading");
  error.name = "AbortError";
  return error;
}
export class ScopedAsyncCache {
  state;
  setScope(scope) {
    if (this.state?.scope === scope) return;
    this.state = {
      scope,
      expiresAt: 0,
    };
  }
  peek(scope, now2 = Date.now()) {
    const state2 = this.state;
    if (state2?.scope !== scope || state2.expiresAt <= now2) return void 0;
    return state2.value;
  }
  load(scope, loader2, ttlMs = Number.POSITIVE_INFINITY) {
    this.setScope(scope);
    const state2 = this.state;
    const cached = this.peek(scope);
    if (cached !== void 0) return Promise.resolve(cached);
    if (state2.request) return state2.request;
    const request = loader2()
      .then((value) => {
        if (this.state !== state2) throw scopeChangedError();
        state2.value = value;
        state2.expiresAt = Date.now() + ttlMs;
        return value;
      })
      .finally(() => {
        if (state2.request === request) state2.request = void 0;
      });
    state2.request = request;
    return request;
  }
}
function resolveReleaseBadges(configs, dismissedCoachMarks) {
  const badges2 = {};
  const completableBadgeIds = {};
  for (const config2 of configs) {
    const { target } = config2;
    if (!("id" in config2)) {
      badges2[target] = config2.display;
      continue;
    }
    const { display } = config2;
    const isCompleted = dismissedCoachMarks?.includes(config2.id) ?? false;
    const appearance = isCompleted ? display.afterComplete : display.initial;
    if (appearance) badges2[target] = appearance;
    if (!isCompleted) completableBadgeIds[target] = config2.id;
  }
  return {
    badges: badges2,
    completableBadgeIds,
  };
}
export function useReleaseBadges(configs) {
  const [dismissedCoachMarks, setDismissedCoachMarks] = useStorage(
    "global.dismissedCoachMarks",
  );
  const resolved = reactExports.useMemo(
    () =>
      resolveReleaseBadges(
        configs,
        Array.isArray(dismissedCoachMarks) ? dismissedCoachMarks : void 0,
      ),
    [configs, dismissedCoachMarks],
  );
  const markReleaseBadgeComplete = reactExports.useCallback(
    (target) => {
      const badgeId = resolved.completableBadgeIds[target];
      if (!badgeId) return;
      setDismissedCoachMarks((previous2) => {
        const marks = Array.isArray(previous2) ? previous2 : [];
        return marks.includes(badgeId) ? marks : [...marks, badgeId];
      });
    },
    [resolved.completableBadgeIds, setDismissedCoachMarks],
  );
  return {
    badges: resolved.badges,
    markReleaseBadgeComplete,
  };
}
export function pluginTrackBase(plugin, surface, entrySource) {
  const source = "source" in plugin ? plugin.source : "market";
  return {
    plugin_id: plugin.id,
    plugin_version: plugin.version,
    plugin_source: source,
    surface,
    ...(entrySource
      ? {
          entry_source: entrySource,
        }
      : {}),
  };
}
export function pluginError(error) {
  const errorType = error instanceof TypeError ? "network" : "business";
  return {
    error_type: errorType,
    error_code: errorType,
  };
}
export const MAX_ATTACHMENTS = 14;
export function connectorReferenceFromServer(server) {
  const catalog = findOfficialConnectorForServer(server);
  return {
    connectorId: catalog?.id,
    serverName: server.runtimeName ?? server.name,
    displayName: catalog?.displayName ?? server.name,
    iconUrl: catalog?.iconUrl ?? null,
  };
}
export function connectorReferenceFromServerName(serverName) {
  const catalog = findOfficialConnectorByServerName(serverName);
  return {
    connectorId: catalog?.id,
    serverName,
    displayName: catalog?.displayName ?? serverName,
    iconUrl: catalog?.iconUrl ?? null,
  };
}
const STALE_24H = 24 * 60 * 60 * 1e3;
export function useMentionModels() {
  const gatewayFetch2 = useGatewayFetch();
  const catalogScopeKey = useModelCatalogScopeKey();
  const { baseUrl, gatewayBinding, scopeKey } = useGatewayScope();
  const runtimeKey = gatewayBinding
    ? `${gatewayBinding.instanceId}:${gatewayBinding.generation}`
    : (baseUrl ?? "pending");
  return useQuery({
    // Only a non-empty catalog is fresh for 24h. An empty result usually means
    // the gateway->cloud fetch failed or was degraded at query time; keeping it
    // fresh would pin an empty @-mention model list for the whole session
    // (the global QueryClient disables focus/reconnect refetches and the
    // MessageInput consumer never remounts).
    staleTime: (query) => ((query.state.data?.length ?? 0) > 0 ? STALE_24H : 0),
    queryKey: ["mention-models", catalogScopeKey, scopeKey, runtimeKey],
    queryFn: async ({ signal }) => {
      const resp = await gatewayFetch2(API_PATHS.modelsConfig, {
        signal,
      });
      if (!resp.ok)
        throw new Error(`model registry failed with HTTP ${resp.status}`);
      const payload = await resp.json();
      const models =
        payload && typeof payload === "object" && !Array.isArray(payload)
          ? ["imageModels", "videoModels", "audioModels"].flatMap((key2) => {
              const value = payload[key2];
              return Array.isArray(value) ? value : [];
            })
          : Array.isArray(payload)
            ? payload
            : void 0;
      if (!Array.isArray(models)) return [];
      return models.flatMap((raw2) => {
        if (!raw2 || typeof raw2 !== "object" || Array.isArray(raw2)) return [];
        const model = raw2;
        if (
          typeof model.id !== "string" ||
          typeof model.type !== "string" ||
          typeof model.display_name !== "string"
        ) {
          return [];
        }
        return [
          {
            id: model.id,
            type: model.type,
            display_name: model.display_name,
            model_name:
              typeof model.model_name === "string"
                ? model.model_name
                : model.id,
            mention_name:
              typeof model.mention_name === "string"
                ? model.mention_name
                : typeof model.model_name === "string"
                  ? model.model_name
                  : model.id,
            description:
              typeof model.description === "string" ? model.description : "",
            icon_url: typeof model.icon_url === "string" ? model.icon_url : "",
            visibility:
              typeof model.visibility === "string" ? model.visibility : "",
            series_id:
              typeof model.series_id === "string" ? model.series_id : model.id,
            hot: model.hot === true,
          },
        ];
      });
    },
    enabled: Boolean(baseUrl),
    retry: 1,
  });
}
function isHexColorValue(value) {
  return /^#(?:[\dA-Fa-f]{3}|[\dA-Fa-f]{4}|[\dA-Fa-f]{6}|[\dA-Fa-f]{8})$/.test(
    value,
  );
}
export function InlineColorValue({ value, children: children2, className }) {
  if (!isHexColorValue(value)) return <>{children2 ?? value}</>;
  const swatchStyle = {
    backgroundColor: value,
  };
  const hasAlpha = value.length === 5 || value.length === 9;
  return (
    <span
      className={`inline-color-value ${className ?? ""}`.trim()}
      data-inline-visual="color"
      data-color-value={value}
    >
      <span className="inline-color-value-label">{children2 ?? value}</span>
      <span
        className="inline-color-swatch"
        data-has-alpha={hasAlpha ? "true" : void 0}
        aria-hidden="true"
      >
        <span className="inline-color-swatch-fill" style={swatchStyle} />
      </span>
    </span>
  );
}
export function resolveSkillCoverUrl(skill) {
  return getSkillCoverUrl(skill) || CDN_SKILL_SHOWCASE_FALLBACK;
}
function isVideoCover(url2) {
  return /\.(?:mp4|webm|mov|m4v)(?:[?#]|$)/i.test(url2);
}
export function SkillCoverMedia({
  url: url2,
  alt = "",
  className = "absolute inset-0 h-full w-full object-cover",
  dataLoaded,
  onLoad,
  onError,
}) {
  if (!url2) return null;
  if (isVideoCover(url2)) {
    return (
      <video
        src={url2}
        autoPlay={true}
        muted={true}
        loop={true}
        playsInline={true}
        preload="metadata"
        draggable={false}
        className={className}
        data-home-query-media-loaded={dataLoaded ? "true" : "false"}
        onLoadedData={onLoad}
        onError={onError}
      >
        <track kind="captions" />
      </video>
    );
  }
  return (
    <img
      src={url2}
      alt={alt}
      loading="lazy"
      decoding="async"
      draggable={false}
      className={className}
      data-home-query-media-loaded={dataLoaded ? "true" : "false"}
      onLoad={onLoad}
      onError={onError}
    />
  );
}
export function StableTabLabel({ label }) {
  return (
    <span
      className="inline-grid min-w-0 after:invisible after:pointer-events-none after:col-start-1 after:row-start-1 after:font-medium after:tracking-[0.005em] after:select-none after:content-[attr(data-label)]"
      data-label={label}
      data-slot="stable-tab-label"
    >
      <span
        className="col-start-1 row-start-1 justify-self-center"
        data-slot="stable-tab-label-visible"
      >
        {label}
      </span>
    </span>
  );
}
export const FEATURED_TAG = "Featured";
export const UPDATE_INDICATOR_STYLES = {
  base: "border border-warning/[.45] bg-warning/[.14] text-warning-foreground",
  hover:
    "hover:border-warning/70 hover:bg-warning/[.22] hover:text-warning-foreground",
};
const UPPERCASE_WORDS = new Set(["mv", "ai", "api", "id", "3d"]);
export function toDisplayName(name2) {
  return name2
    .split("-")
    .map((w3) =>
      UPPERCASE_WORDS.has(w3)
        ? w3.toUpperCase()
        : w3.charAt(0).toUpperCase() + w3.slice(1),
    )
    .join(" ");
}
export function formatDownloads(n2) {
  if (n2 >= 1e6) return `${(n2 / 1e6).toFixed(1)}M`;
  if (n2 >= 1e3) return `${(n2 / 1e3).toFixed(1)}k`;
  return String(n2);
}
export const FEATURED_MARKET_PAGE_SIZE = 200;
export const OTHER_MARKET_PAGE_SIZE = 50;
export const RecoveringChildrenContext = reactExports.createContext(new Set());
export const RecoveringChildrenProvider = RecoveringChildrenContext.Provider;
export const PENDING_AUTO_UPDATE_KEY = "skills:pendingAutoUpdate";
export function writePendingAutoUpdate(update2) {
  try {
    sessionStorage.setItem(PENDING_AUTO_UPDATE_KEY, JSON.stringify(update2));
  } catch {}
}
export const ecommerceArtwork =
  "" + new URL("../ecommerce-B8DC3jB9.png", import.meta.url).href;
