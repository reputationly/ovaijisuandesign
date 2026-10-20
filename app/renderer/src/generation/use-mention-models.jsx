// use-mention-models.jsx
import instance from "i18next";
import { API_PATHS } from "../infra/workspace-gateway.js";
import { ApiError } from "../infra/generation-errors.js";
import { useGatewayScope } from "../infra/runtime-config.js";
import jsxRuntimeExports from "react/jsx-runtime";
import reactExports from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchCapabilityModelRows, useChatModelSource } from "./chat-model-source.js";
import { getSkillCoverUrl } from "../skills/skill-cover-url.js";
import { useStorage } from "../infra/use-storage.js";
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
export function includesString(values, value) {
  return Array.isArray(values) && values.includes(value);
}
function hasPath(paths) {
  return paths.some((path) => path.trim().length > 0);
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
export function semanticGenerationErrorCopy(raw) {
  const errorClass = classifyRawErrorText(raw);
  return errorClass ? instance.t(RAW_ERROR_CLASS_I18N[errorClass]) : raw;
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
export function retainedGenerationBlocksResubmit(info) {
  return (
    info?.errorStatus === "recoverable_error" ||
    info?.errorStatus === "status_unknown"
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
  peek(scope, now = Date.now()) {
    const state = this.state;
    if (state?.scope !== scope || state.expiresAt <= now) return void 0;
    return state.value;
  }
  load(scope, loader, ttlMs = Number.POSITIVE_INFINITY) {
    this.setScope(scope);
    const state = this.state;
    const cached = this.peek(scope);
    if (cached !== void 0) return Promise.resolve(cached);
    if (state.request) return state.request;
    const request = loader()
      .then((value) => {
        if (this.state !== state) throw scopeChangedError();
        state.value = value;
        state.expiresAt = Date.now() + ttlMs;
        return value;
      })
      .finally(() => {
        if (state.request === request) state.request = void 0;
      });
    state.request = request;
    return request;
  }
}
function resolveReleaseBadges(configs, dismissedCoachMarks) {
  const badges = {};
  const completableBadgeIds = {};
  for (const config of configs) {
    const { target } = config;
    if (!("id" in config)) {
      badges[target] = config.display;
      continue;
    }
    const { display } = config;
    const isCompleted = dismissedCoachMarks?.includes(config.id) ?? false;
    const appearance = isCompleted ? display.afterComplete : display.initial;
    if (appearance) badges[target] = appearance;
    if (!isCompleted) completableBadgeIds[target] = config.id;
  }
  return {
    badges,
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
      setDismissedCoachMarks((previous) => {
        const marks = Array.isArray(previous) ? previous : [];
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

/** 参照的 modelsConfigRows（bundle 第 436741 行） */
async function modelsConfigRows(gatewayFetch, signal) {
  const resp = await gatewayFetch(API_PATHS.modelsConfig, { signal });
  if (!resp.ok) throw new Error(`model registry failed with HTTP ${resp.status}`);
  const payload = await resp.json();
  return payload && typeof payload === "object" && !Array.isArray(payload)
    ? ["imageModels", "videoModels", "audioModels"].flatMap((key) => {
        const value = payload[key];
        return Array.isArray(value) ? value : [];
      })
    : Array.isArray(payload)
      ? payload
      : undefined;
}

const STALE_24H = 24 * 60 * 60 * 1e3;
export function useMentionModels() {
  const gatewayFetch = useGatewayFetch();
  const source = useChatModelSource();
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
    queryKey: ["mention-models", catalogScopeKey, scopeKey, runtimeKey, source],
    queryFn: async ({ signal }) => {
      // 参照写法：source === "capabilities" 走全量能力清单，否则走 models/config
      const models =
        source === "capabilities"
          ? await fetchCapabilityModelRows(gatewayFetch, signal)
          : await modelsConfigRows(gatewayFetch, signal);
      if (!Array.isArray(models)) return [];
      return models.flatMap((raw) => {
        if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
        const model = raw;
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
    enabled: Boolean(baseUrl) && source !== void 0,
    retry: 1,
  });
}
function isHexColorValue(value) {
  return /^#(?:[\dA-Fa-f]{3}|[\dA-Fa-f]{4}|[\dA-Fa-f]{6}|[\dA-Fa-f]{8})$/.test(
    value,
  );
}
export function InlineColorValue({ value, children, className }) {
  if (!isHexColorValue(value)) return <>{children ?? value}</>;
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
      <span className="inline-color-value-label">{children ?? value}</span>
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
function isVideoCover(url) {
  return /\.(?:mp4|webm|mov|m4v)(?:[?#]|$)/i.test(url);
}
export function SkillCoverMedia({
  url,
  alt = "",
  className = "absolute inset-0 h-full w-full object-cover",
  dataLoaded,
  onLoad,
  onError,
}) {
  if (!url) return null;
  if (isVideoCover(url)) {
    return (
      <video
        src={url}
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
      src={url}
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
export function toDisplayName(skillName) {
  return skillName
    .split("-")
    .map((word) =>
      UPPERCASE_WORDS.has(word)
        ? word.toUpperCase()
        : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(" ");
}
export function formatDownloads(downloadCount) {
  if (downloadCount >= 1e6) return `${(downloadCount / 1e6).toFixed(1)}M`;
  if (downloadCount >= 1e3) return `${(downloadCount / 1e3).toFixed(1)}k`;
  return String(downloadCount);
}
export const FEATURED_MARKET_PAGE_SIZE = 200;
export const OTHER_MARKET_PAGE_SIZE = 50;
export const RecoveringChildrenContext = reactExports.createContext(new Set());
export const RecoveringChildrenProvider = RecoveringChildrenContext.Provider;
export const PENDING_AUTO_UPDATE_KEY = "skills:pendingAutoUpdate";
export function writePendingAutoUpdate(update) {
  try {
    sessionStorage.setItem(PENDING_AUTO_UPDATE_KEY, JSON.stringify(update));
  } catch {}
}
export const ecommerceArtwork =
  "" + new URL("../ecommerce.png", import.meta.url).href;
