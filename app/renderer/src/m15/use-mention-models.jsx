// use-mention-models.jsx
import {
  jsxRuntimeExports,
  CanvasNodeType,
  reactExports,
  instance,
  API_PATHS,
  dedupedToast,
  useGatewayScope,
  useQuery,
  useStorage,
  ApiError,
  getSkillCoverUrl,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { gatewayFetch } from "./agent-ws-client.jsx";
import {
  findOfficialConnectorByServerName,
  findOfficialConnectorForServer,
} from "./interest-selection-provider.jsx";
import {
  GENERATE_ERROR_CODE_CONCURRENCY_LIMIT,
  GENERATE_ERROR_CODE_CONTENT_POLICY_VIOLATION,
  GENERATE_ERROR_CODE_NETWORK_CONNECT_TIMEOUT,
  GENERATE_ERROR_CODE_NETWORK_ERROR,
  classifyRawErrorText,
} from "./push-inline.js";
import { isEnoentErrorMessage } from "./track-events.js";
import { classifyVideoGenerationMode } from "./transitioner.jsx";
import { CDN_SKILL_SHOWCASE_FALLBACK } from "./use-hub-logo-hover-animation.jsx";
import { useGatewayFetch, useModelCatalogScopeKey } from "./use-resizable-width.js";
import { Emitter } from "./vs-buffer.js";
const HAILUO03_VIDEO_CONTINUATION_SUB_TYPE = "hailuo03_video_continuation";
function recordField$1(value) {
  return value && typeof value === "object" ? value : void 0;
}
function stringValue(value) {
  return typeof value === "string" ? value.trim() : "";
}
function includesString(values3, value) {
  return Array.isArray(values3) && values3.includes(value);
}
function hasPath(paths) {
  return paths.some((path2) => path2.trim().length > 0);
}
function modelValues(model, modelId) {
  return [modelId, model?.id, model?.model_name, model?.pricingId, model?.name].filter(
    (value) => typeof value === "string",
  );
}
function imageModeSubType(imageMode) {
  return stringValue(imageMode) === "video-extension" ? HAILUO03_VIDEO_CONTINUATION_SUB_TYPE : "";
}
function isHailuo03VideoTrialModel(model, modelId, eligibility) {
  if (!eligibility) return false;
  return modelValues(model, modelId).some((value) => includesString(eligibility.models, value));
}
function isHailuo03VideoTrialModelValue(value, eligibility) {
  const model = stringValue(value);
  return model !== "" && includesString(eligibility?.models, model);
}
function isHailuo03VideoTrialEligibleResolution(value, eligibility) {
  return includesString(eligibility?.resolutions, stringValue(value));
}
function areHailuo03VideoTrialReferencesEligible({
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
export function isHailuo03OrdinaryVideoTrialSubmit(
  model,
  modelId,
  params,
  eligibility,
  imagePaths = [],
  videoPaths = [],
  audioPaths = [],
) {
  const imageMode = params.image_mode;
  const subType = imageModeSubType(imageMode);
  return (
    isHailuo03VideoTrialModel(model, modelId, eligibility) &&
    includesString(eligibility?.subTypes, subType) &&
    isHailuo03VideoTrialEligibleResolution(params.resolution, eligibility) &&
    areHailuo03VideoTrialReferencesEligible({
      eligibility,
      imageMode,
      imagePaths,
      videoPaths,
      audioPaths,
    })
  );
}
export function isHailuo03OrdinaryVideoTrialGeneratingPlaceholder(node2, eligibility) {
  if (node2.type !== CanvasNodeType.Placeholder) return false;
  const data2 = recordField$1(node2.data);
  const params = recordField$1(data2?.params);
  const draft = recordField$1(recordField$1(data2?.popoverDraft)?.i2v);
  const imageMode = params?.image_mode;
  const subType = imageModeSubType(imageMode);
  const videoPaths = [
    data2?.video_paths,
    data2?.reference_videos,
    params?.video_paths,
    params?.reference_videos,
    draft?.videoPaths,
  ];
  const imagePaths = [
    data2?.image_paths,
    data2?.reference_images,
    params?.image_paths,
    draft?.imagePaths,
  ];
  const audioPaths = [
    data2?.audio_paths,
    data2?.reference_audios,
    params?.audio_paths,
    draft?.audioPaths,
  ];
  return (
    data2?.mediaType === "video" &&
    data2.status === "generating" &&
    [data2.model_id, data2.model].some((value) =>
      isHailuo03VideoTrialModelValue(value, eligibility),
    ) &&
    includesString(eligibility?.subTypes, subType) &&
    isHailuo03VideoTrialEligibleResolution(params?.resolution, eligibility) &&
    areHailuo03VideoTrialReferencesEligible({
      eligibility,
      imageMode,
      imagePaths: imagePaths.flatMap((value) =>
        Array.isArray(value) ? value.filter((item) => typeof item === "string") : [],
      ),
      videoPaths:
        stringValue(imageMode) === "video-extension"
          ? []
          : videoPaths.flatMap((value) =>
              Array.isArray(value) ? value.filter((item) => typeof item === "string") : [],
            ),
      audioPaths: audioPaths.flatMap((value) =>
        Array.isArray(value) ? value.filter((item) => typeof item === "string") : [],
      ),
    })
  );
}
export function visibleCanvasModels(models) {
  return models.filter((model) => model.visibility !== "hidden");
}
const CANVAS_VIDEO_MODEL_DISPLAY_ORDER = {
  "MiniMax-H3": 0,
  "MiniMax-H3-Max": 1,
  "MiniMax-H3-Max-Turbo": 2,
};
export function visibleCanvasVideoModels(models) {
  return visibleCanvasModels(models)
    .map((model, index2) => ({
      model,
      index: index2,
    }))
    .sort((left, right) => {
      const leftOrder = CANVAS_VIDEO_MODEL_DISPLAY_ORDER[left.model.id] ?? 100;
      const rightOrder = CANVAS_VIDEO_MODEL_DISPLAY_ORDER[right.model.id] ?? 100;
      return leftOrder - rightOrder || left.index - right.index;
    })
    .map(({ model }) => model);
}
export function findCanvasModel(models, modelId) {
  return models.find(
    (model) => model.id === modelId || model.model_name === modelId || model.name === modelId,
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
const RAW_ERROR_CLASS_I18N$1 = {
  concurrency: "canvas.errors.concurrency",
  interrupted: "canvas.errors.interrupted",
  timeout: "canvas.errors.timeout",
  network: "canvas.errors.network",
  storage: "canvas.errors.storage",
  technical: "canvas.errors.technical",
};
export function semanticGenerationErrorCopy(raw2) {
  const cls = classifyRawErrorText(raw2);
  return cls ? instance.t(RAW_ERROR_CLASS_I18N$1[cls]) : raw2;
}
const AMBIGUOUS_SUBMIT_HTTP_STATUSES = new Set([408, 500, 502, 503, 504]);
export function generationErrorStatusFromResponse(presentation) {
  if (presentation === "recoverable") return "recoverable_error";
  if (presentation === "status_unknown") return "status_unknown";
  return "error";
}
export function generationErrorStatusFromThrown(error) {
  if (!(error instanceof ApiError)) return "error";
  if (error.type === "network" || error.type === "timeout" || error.type === "parse") {
    return "status_unknown";
  }
  return error.type === "http" && AMBIGUOUS_SUBMIT_HTTP_STATUSES.has(error.status)
    ? "status_unknown"
    : "error";
}
export function retainedGenerationBlocksResubmit(info2) {
  return info2?.errorStatus === "recoverable_error" || info2?.errorStatus === "status_unknown";
}
export const RESUBMIT_BLOCKED_I18N = [
  "canvas.generationRecovery.resubmitBlocked",
  {
    defaultValue: "该内容的生成任务已保留，暂无法重新提交。请先处理卡片上的恢复提示",
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
export const GENERATE_ERROR_CODE_QUEUE_PAUSED$2 = "queue_paused";
const MINIMAX_H3_NORMALIZED_MODEL_ID = "minimax-h3";
const MINIMAX_H3_NORMALIZED_BACKEND_ID = "minimax-v3";
function normalizeModelValue(value) {
  return typeof value === "string"
    ? value
        .trim()
        .toLowerCase()
        .replace(/[\s_]+/g, "-")
    : "";
}
function isMiniMaxH3ModelValue$1(value) {
  return normalizeModelValue(value) === MINIMAX_H3_NORMALIZED_MODEL_ID;
}
function isMiniMaxH3VideoPromptRequired(args) {
  const { backend, modelId, model } = args;
  return (
    normalizeModelValue(backend) === MINIMAX_H3_NORMALIZED_BACKEND_ID ||
    [modelId, model?.id, model?.model_name, model?.pricingId, model?.name].some(
      isMiniMaxH3ModelValue$1,
    )
  );
}
export function isMiniMaxH3VideoPromptMissing(args) {
  const prompt = typeof args.prompt === "string" ? args.prompt : "";
  return isMiniMaxH3VideoPromptRequired(args) && prompt.trim().length === 0;
}
export function buildCanvasVideoSubmitTracking(input) {
  return {
    popover_type: "i2v",
    node_id: input.nodeId,
    submit_mode: input.submitMode,
    model_id: input.modelId,
    backend: input.backend,
    series_id: input.seriesId,
    generation_mode: classifyVideoGenerationMode({
      imageRefCount: input.imageRefCount,
      videoRefCount: input.videoRefCount,
      audioRefCount: input.audioRefCount,
    }),
    prompt_length: input.promptLength,
    ref_count: input.imageRefCount,
    image_ref_count: input.imageRefCount,
    video_ref_count: input.videoRefCount,
    audio_ref_count: input.audioRefCount,
    count: input.outputCount,
    output_count: input.outputCount,
    aspect_ratio: input.aspectRatio,
    resolution: input.resolution,
    duration: input.duration,
  };
}
export const GENERATE_ERROR_CODE_QUEUE_PAUSED$1 = "queue_paused";
export const MODEL_LIST_TIMEOUT_MS = 1e4;
export const MAX_VIDEOS_PER_SUBMIT = 9;
export function formatGenerateError(message2) {
  if (isEnoentErrorMessage(message2)) {
    return instance.t("canvas.generateRefFileMissing", {
      defaultValue: "参考素材文件不存在或路径已失效，请确认文件仍在工作区内",
    });
  }
  return message2;
}
export const GENERATE_ERROR_CODE_QUEUE_PAUSED = "queue_paused";
export const TEXT_MODEL_CACHE_TTL_MS = 6e4;
export function providerOf(modelId) {
  const idx = modelId.indexOf("/");
  return idx >= 0 ? modelId.slice(0, idx) : modelId;
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
  const [dismissedCoachMarks, setDismissedCoachMarks] = useStorage("global.dismissedCoachMarks");
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
export function toTrackedCanvasNodeType(nodeType) {
  switch (nodeType) {
    case "image":
    case "video":
    case "audio":
    case "text":
    case "table":
    case "file":
    case "group":
    case "comfyui":
      return nodeType;
    default:
      return "file";
  }
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
      if (!resp.ok) throw new Error(`model registry failed with HTTP ${resp.status}`);
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
            model_name: typeof model.model_name === "string" ? model.model_name : model.id,
            mention_name:
              typeof model.mention_name === "string"
                ? model.mention_name
                : typeof model.model_name === "string"
                  ? model.model_name
                  : model.id,
            description: typeof model.description === "string" ? model.description : "",
            icon_url: typeof model.icon_url === "string" ? model.icon_url : "",
            visibility: typeof model.visibility === "string" ? model.visibility : "",
            series_id: typeof model.series_id === "string" ? model.series_id : model.id,
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
  return /^#(?:[\dA-Fa-f]{3}|[\dA-Fa-f]{4}|[\dA-Fa-f]{6}|[\dA-Fa-f]{8})$/.test(value);
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
const SKILL_APPLYING_TOAST_ID = "skill-applying";
const OPERATION_TIMEOUT_MS = 6e4;
let pendingOperationCount = 0;
let successMessage;
let successRender;
let infoMessage;
let errorMessage;
const timeoutHandles = new Set();
function settleOperation(result, message2, render2) {
  pendingOperationCount -= 1;
  if (result === "error") {
    errorMessage ??= message2;
  } else if (result === "info") {
    infoMessage ??= message2;
  } else if (render2) {
    successRender = render2;
  } else {
    successMessage = message2;
  }
  if (pendingOperationCount > 0) return;
  const finalErrorMessage = errorMessage;
  const finalInfoMessage = infoMessage;
  const finalSuccessMessage = successMessage;
  const finalSuccessRender = successRender;
  pendingOperationCount = 0;
  successMessage = void 0;
  successRender = void 0;
  infoMessage = void 0;
  errorMessage = void 0;
  for (const handle2 of timeoutHandles) {
    clearTimeout(handle2);
  }
  timeoutHandles.clear();
  if (finalErrorMessage !== void 0) {
    dedupedToast.error(finalErrorMessage, {
      id: SKILL_APPLYING_TOAST_ID,
    });
    return;
  }
  if (finalInfoMessage !== void 0) {
    dedupedToast.info(finalInfoMessage, {
      id: SKILL_APPLYING_TOAST_ID,
    });
    return;
  }
  if (finalSuccessRender !== void 0) {
    finalSuccessRender(SKILL_APPLYING_TOAST_ID);
    return;
  }
  if (finalSuccessMessage !== void 0) {
    dedupedToast.success(finalSuccessMessage, {
      id: SKILL_APPLYING_TOAST_ID,
    });
  }
}
export function beginSkillApplyingToast(message2) {
  pendingOperationCount += 1;
  if (pendingOperationCount === 1) {
    dedupedToast.loading(message2, {
      id: SKILL_APPLYING_TOAST_ID,
    });
  }
  let settled = false;
  const settleOnce = (result, resultMessage, render2) => {
    if (settled) return;
    settled = true;
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
      timeoutHandles.delete(timeoutHandle);
    }
    settleOperation(result, resultMessage, render2);
  };
  const timeoutHandle = setTimeout(() => {
    timeoutHandles.delete(timeoutHandle);
    settleOnce("info", instance.t("skills.restartQueued"));
  }, OPERATION_TIMEOUT_MS);
  timeoutHandles.add(timeoutHandle);
  return {
    pending: (pendingMessage) => {
      if (settled) return;
      dedupedToast.loading(pendingMessage, {
        id: SKILL_APPLYING_TOAST_ID,
      });
    },
    success: (resultMessage) => settleOnce("success", resultMessage),
    successWith: (render2) => settleOnce("success", void 0, render2),
    info: (resultMessage) => settleOnce("info", resultMessage),
    error: (resultMessage) => settleOnce("error", resultMessage),
  };
}
export function resolveSkillCoverUrl(skill) {
  return getSkillCoverUrl(skill) || CDN_SKILL_SHOWCASE_FALLBACK;
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
function isVideoCover(url2) {
  return /\.(?:mp4|webm|mov|m4v)(?:[?#]|$)/i.test(url2);
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
class SkillEvents {
  _onSkillsChanged = new Emitter();
  onSkillsChanged = this._onSkillsChanged.event;
  fireSkillsChanged(name2, kind) {
    this._onSkillsChanged.fire({
      name: name2,
      kind,
    });
  }
}
export const skillEvents = new SkillEvents();
export const UPDATE_INDICATOR_STYLES = {
  base: "border border-warning/[.45] bg-warning/[.14] text-warning-foreground",
  hover: "hover:border-warning/70 hover:bg-warning/[.22] hover:text-warning-foreground",
};
const UPPERCASE_WORDS$1 = new Set(["mv", "ai", "api", "id", "3d"]);
export function toDisplayName$1(name2) {
  return name2
    .split("-")
    .map((w3) =>
      UPPERCASE_WORDS$1.has(w3) ? w3.toUpperCase() : w3.charAt(0).toUpperCase() + w3.slice(1),
    )
    .join(" ");
}
export function formatDownloads(n2) {
  if (n2 >= 1e6) return `${(n2 / 1e6).toFixed(1)}M`;
  if (n2 >= 1e3) return `${(n2 / 1e3).toFixed(1)}k`;
  return String(n2);
}
export const DEFAULT_PAGE_SIZE = 20;
export const FEATURED_MARKET_PAGE_SIZE = 200;
export const OTHER_MARKET_PAGE_SIZE = 50;
export function useSkillCategories(enabled = true) {
  const [taxonomy, setTaxonomy] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(enabled);
  const [error, setError] = reactExports.useState(null);
  const refresh = reactExports.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await gatewayFetch(`${API_PATHS.marketOperatorCategories}?tag_type=all`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data2 = normalizeSkillCategoriesResponse(await response.json());
      setTaxonomy(data2.filter((item) => item.enabled !== false));
    } catch (cause) {
      const nextError = cause instanceof Error ? cause : new Error(String(cause));
      setError(nextError);
      throw nextError;
    } finally {
      setLoading(false);
    }
  }, []);
  reactExports.useEffect(() => {
    if (!enabled) return;
    void refresh().catch(() => void 0);
  }, [enabled, refresh]);
  const categories = reactExports.useMemo(
    () => taxonomy.filter((item) => item.tag_type === "category"),
    [taxonomy],
  );
  const stages = reactExports.useMemo(
    () => taxonomy.filter((item) => item.tag_type === "stage"),
    [taxonomy],
  );
  return {
    categories,
    stages,
    taxonomy,
    loading,
    error,
    refresh,
  };
}
export function normalizeSkillCategoriesResponse(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const rawCategories = value.categories;
  if (!Array.isArray(rawCategories)) return [];
  return rawCategories.flatMap((value2) => {
    if (!value2 || typeof value2 !== "object" || Array.isArray(value2)) return [];
    const item = value2;
    const tagType = item.tag_type ?? "category";
    if (
      typeof item.category !== "string" ||
      typeof item.cn_name !== "string" ||
      typeof item.en_name !== "string" ||
      typeof item.sort_order !== "number" ||
      (tagType !== "category" && tagType !== "stage")
    ) {
      return [];
    }
    return [
      {
        category: item.category,
        cn_name: item.cn_name,
        en_name: item.en_name,
        sort_order: item.sort_order,
        enabled: item.enabled !== false,
        tag_type: tagType,
        cn_description: typeof item.cn_description === "string" ? item.cn_description : "",
        en_description: typeof item.en_description === "string" ? item.en_description : "",
        combine_stage: typeof item.combine_stage === "boolean" ? item.combine_stage : void 0,
      },
    ];
  });
}
export const RecoveringChildrenContext = reactExports.createContext(new Set());
export const RecoveringChildrenProvider = RecoveringChildrenContext.Provider;
export const PENDING_AUTO_UPDATE_KEY = "skills:pendingAutoUpdate";
export function readPendingAutoUpdate() {
  try {
    const raw2 = sessionStorage.getItem(PENDING_AUTO_UPDATE_KEY);
    if (!raw2) return null;
    return JSON.parse(raw2);
  } catch {
    return null;
  }
}
export function writePendingAutoUpdate(update2) {
  try {
    sessionStorage.setItem(PENDING_AUTO_UPDATE_KEY, JSON.stringify(update2));
  } catch {}
}
export function clearPendingAutoUpdate() {
  try {
    sessionStorage.removeItem(PENDING_AUTO_UPDATE_KEY);
  } catch {}
}
export const ecommerceArtwork = "" + new URL("../ecommerce-B8DC3jB9.png", import.meta.url).href;
export const featuredSkillArtwork =
  "" + new URL("../featured-skill-C1bqOHc_.png", import.meta.url).href;
export const filmArtwork = "" + new URL("../graphic-design-vBqZO3xO.png", import.meta.url).href;
export const shortDramaArtwork = "" + new URL("../short-drama-BlgbvS1F.png", import.meta.url).href;
const TRUSTED_HOME_ASSET_HOSTS = new Set(["cdn.hailuoai.com", "cdn.hailuoai.video"]);
const SCENE_ATTACHMENT_DOWNLOAD_TIMEOUT_MS = 3e4;
const MAX_SCENE_ATTACHMENT_FILE_BYTES = 50 * 1024 * 1024;
const MAX_SCENE_ATTACHMENTS_TOTAL_BYTES = 100 * 1024 * 1024;
export function normalizeHomeQuickStartAssetUrl(value) {
  if (typeof value !== "string") return void 0;
  const text2 = value.trim();
  if (!text2) return void 0;
  try {
    const url2 = new URL(text2);
    const trustedHost = TRUSTED_HOME_ASSET_HOSTS.has(url2.hostname.toLowerCase());
    if (
      url2.protocol !== "https:" ||
      !trustedHost ||
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
  const contentType = response.headers.get("content-type")?.split(";", 1)[0]?.trim();
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
      throw new Error(`scene attachments exceed total limit of ${maxTotalBytes} bytes`);
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
      throw new Error(`scene attachment exceeds file limit of ${maxFileBytes} bytes`);
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
        throw new Error(`scene attachment exceeds file limit of ${maxFileBytes} bytes`);
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
  if (!url2) throw new Error("scene attachment URL is not on the trusted CDN allowlist");
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
    throw new Error("scene attachment redirected outside the trusted CDN allowlist");
  }
  const blob = await readBoundedBlob(response, attachment.name, budget, maxFileBytes);
  return new File([blob], normalizeFilenameForMime(attachment.name, blob.type), {
    type: blob.type,
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
export async function fetchSceneAttachments(attachments, options = {}) {
  const withUrl = attachments.filter(
    (attachment) => typeof attachment.assetUrl === "string" && attachment.assetUrl.length > 0,
  );
  if (withUrl.length === 0)
    return {
      files: [],
      failed: [],
    };
  const budget = createDownloadBudget(options.maxTotalBytes ?? MAX_SCENE_ATTACHMENTS_TOTAL_BYTES);
  const results = await Promise.allSettled(
    withUrl.map((attachment) => downloadSceneAttachment(attachment, budget, options)),
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
