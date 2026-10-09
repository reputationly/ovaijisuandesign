// text-models.js
import {
  LIBTV_CONNECTOR,
  HILO_WORKSPACE_IDENTITY_QUERY,
  HILO_WORKSPACE_INSTANCE_QUERY,
  HILO_WORKSPACE_GENERATION_QUERY,
  DEFAULT_VIDEO_PLAYBACK_MAX_HEIGHT,
  videoPlaybackPath,
  LEGACY_HAILUO_MODEL_ALIASES,
  normalizeLegacyModelId,
  IMAGE_MODELS,
  registrySelectionRowIds,
  VIDEO_MODELS,
  AUDIO_MODELS,
  BACKEND_MINIMAX_TTS,
  BACKEND_SEEDAUDIO,
  BACKEND_MINIMAX_V3,
  BACKEND_MINIMAX_MUSIC,
  BACKEND_ELEVENLABS_MUSIC,
  PERF_LOG_FLUSH,
  PERF_CANVAS_PERSIST_HTTP_ROUNDTRIP,
} from "../vendor.js";
import {
  ENHANCE_IMAGE_INPUT_LONG_HARD_MAX,
  ENHANCE_IMAGE_INPUT_LONG_MAX,
  ENHANCE_IMAGE_INPUT_MAX_ASPECT,
  ENHANCE_IMAGE_INPUT_SHORT_MIN,
  longEdge$1,
} from "./myers-line-hunks.js";
function shortEdge(width, height) {
  if (!width || !height || width <= 0 || height <= 0) return void 0;
  return Math.min(width, height);
}
function computeEnhanceImageInputPrep(width, height) {
  const long = longEdge$1(width, height);
  const short = shortEdge(width, height);
  if (long === void 0 || short === void 0) return null;
  const w3 = width;
  const h2 = height;
  if (long / short > ENHANCE_IMAGE_INPUT_MAX_ASPECT) return null;
  if (long > ENHANCE_IMAGE_INPUT_LONG_HARD_MAX) return null;
  let scale2 = 1;
  if (short < ENHANCE_IMAGE_INPUT_SHORT_MIN) {
    scale2 = ENHANCE_IMAGE_INPUT_SHORT_MIN / short;
  } else if (long > ENHANCE_IMAGE_INPUT_LONG_MAX) {
    scale2 = ENHANCE_IMAGE_INPUT_LONG_MAX / long;
  }
  return {
    prepWidth: Math.max(1, Math.round(w3 * scale2)),
    prepHeight: Math.max(1, Math.round(h2 * scale2)),
    scale: scale2,
  };
}
export function isEnhanceImageInputEligible(width, height) {
  return computeEnhanceImageInputPrep(width, height) !== null;
}
export var WalletSource = ((WalletSource2) => {
  WalletSource2[(WalletSource2["WALLET_SOURCE_HILO"] = 0)] = "WALLET_SOURCE_HILO";
  WalletSource2[(WalletSource2["WALLET_SOURCE_OP"] = 1)] = "WALLET_SOURCE_OP";
  WalletSource2[(WalletSource2["UNRECOGNIZED"] = -1)] = "UNRECOGNIZED";
  return WalletSource2;
})(WalletSource || {});
export var CreditType = ((CreditType2) => {
  CreditType2[(CreditType2["CREDIT_TYPE_TOP_UP"] = 0)] = "CREDIT_TYPE_TOP_UP";
  CreditType2[(CreditType2["CREDIT_TYPE_MEMBERSHIP"] = 1)] = "CREDIT_TYPE_MEMBERSHIP";
  CreditType2[(CreditType2["CREDIT_TYPE_BONUS"] = 2)] = "CREDIT_TYPE_BONUS";
  CreditType2[(CreditType2["CREDIT_TYPE_DEFAULT"] = 3)] = "CREDIT_TYPE_DEFAULT";
  CreditType2[(CreditType2["CREDIT_TYPE_CREATOR"] = 4)] = "CREDIT_TYPE_CREATOR";
  CreditType2[(CreditType2["CREDIT_TYPE_ACTIVITY"] = 5)] = "CREDIT_TYPE_ACTIVITY";
  CreditType2[(CreditType2["CREDIT_TYPE_LOGIN"] = 6)] = "CREDIT_TYPE_LOGIN";
  CreditType2[(CreditType2["CREDIT_TYPE_TRANSFER"] = 7)] = "CREDIT_TYPE_TRANSFER";
  CreditType2[(CreditType2["UNRECOGNIZED"] = -1)] = "UNRECOGNIZED";
  return CreditType2;
})(CreditType || {});
new URL(LIBTV_CONNECTOR.url).origin;
export const INSUFFICIENT_BALANCE_TEXT_PATTERN =
  /余额不足|贝壳不足|积分不足|请充值|充值后|未支付.{0,20}费用|insufficient (balance|credit|credits)|not enough (balance|credit|credits)|out of credits/i;
export const MEMORY_TYPES = [
  "user",
  "feedback",
  "project",
  "reference",
  "media-style",
  "asset-pin",
];
export const ASSET_MODALITIES = ["image", "video", "audio"];
export const MAX_MEMORY_BODY_BYTES = 30 * 1024;
export const MAX_MEMORY_DESCRIPTION_LENGTH = 200;
const DOMESTIC_MODEL_DISPLAY_ALIASES = [
  // Nano Banana 2 Flash → General Image 2（空格 / 下划线 / 中划线变体）
  ["nano_banana_2_flash", "General Image 2"],
  ["NanoBanana 2 Flash", "General Image 2"],
  ["NanoBanana_2_Flash", "General Image 2"],
  ["NanoBanana-2-Flash", "General Image 2"],
  ["Nano Banana 2 Flash", "General Image 2"],
  ["Nano-Banana-2-Flash", "General Image 2"],
  ["Banana 2 Flash", "General Image 2"],
  ["Banana_2_Flash", "General Image 2"],
  ["Banana-2-Flash", "General Image 2"],
  // Nano Banana Flash → General Image 2
  ["NanoBanana Flash", "General Image 2"],
  ["NanoBanana_Flash", "General Image 2"],
  ["NanoBanana-Flash", "General Image 2"],
  ["Nano Banana Flash", "General Image 2"],
  ["Nano_Banana_Flash", "General Image 2"],
  ["Nano-Banana-Flash", "General Image 2"],
  ["Banana Flash", "General Image 2"],
  ["Banana_Flash", "General Image 2"],
  ["Banana-Flash", "General Image 2"],
  // Nano Banana Pro → General Image Pro
  ["NanoBanana Pro", "General Image Pro"],
  ["NanoBanana_Pro", "General Image Pro"],
  ["NanoBanana-Pro", "General Image Pro"],
  ["Nano Banana Pro", "General Image Pro"],
  ["Nano_Banana_Pro", "General Image Pro"],
  ["Nano-Banana-Pro", "General Image Pro"],
  ["Banana Pro", "General Image Pro"],
  ["Banana_Pro", "General Image Pro"],
  ["Banana-Pro", "General Image Pro"],
  // 特例：nano_banana_2（下划线全名）→ General Image Pro。仅此一条，不派生
  // 空格/中划线变体，避免与下方 "Nano Banana 2 → General Image 2" 的下划线
  // 全名 Nano_Banana_2 冲突。
  ["nano_banana_2", "General Image Pro"],
  // Nano Banana 2 → General Image 2（不含下划线全名 Nano_Banana_2，留给上面的特例）
  ["NanoBanana 2", "General Image 2"],
  ["NanoBanana_2", "General Image 2"],
  ["NanoBanana-2", "General Image 2"],
  ["Nano Banana 2", "General Image 2"],
  ["Nano-Banana-2", "General Image 2"],
  ["Banana 2", "General Image 2"],
  ["Banana_2", "General Image 2"],
  ["Banana-2", "General Image 2"],
  // 旧国内展示名也统一收敛到新名称，覆盖历史消息与缓存数据。
  ["香蕉Pro", "General Image Pro"],
  ["香蕉2", "General Image 2"],
  // Banana 系列 → General Image 系列
  ["Banana 系列", "General Image 系列"],
  ["Banana系列", "General Image 系列"],
  ["Banana_系列", "General Image 系列"],
  ["Banana-系列", "General Image 系列"],
  ["香蕉系列", "General Image 系列"],
  // GPT Image 2.5 Flare / Sunburst → Design Image 2.5 Flare / Sunburst。
  // 两区只差品牌前缀，脱敏只把 GPT 换成 Design。
  // 这四个内部名都以 'gpt-image-2' / 'g-image-2' 为前缀子串，依靠
  // SORTED_DOMESTIC_MODEL_DISPLAY_ALIASES 的长度降序 + 单次 alternation
  // 保证长规则先命中，不会被下方的 'gpt-image-2' 截断成 "Design Image 2.5-flare"。
  ["gpt-image-2.5-sunburst", "Design Image 2.5 Sunburst"],
  ["GPT Image 2.5 Sunburst", "Design Image 2.5 Sunburst"],
  ["GPT_Image_2.5_Sunburst", "Design Image 2.5 Sunburst"],
  ["g-image-2.5-sunburst", "Design Image 2.5 Sunburst"],
  ["gpt-image-2.5-flare", "Design Image 2.5 Flare"],
  ["GPT Image 2.5 Flare", "Design Image 2.5 Flare"],
  ["GPT_Image_2.5_Flare", "Design Image 2.5 Flare"],
  ["g-image-2.5-flare", "Design Image 2.5 Flare"],
  // GPT Image 2 / 旧国内名 → Design Image 2。只改 2 这一版，其他版本继续沿用
  // 既有 GPT Image → G Image 的国内脱敏规则。
  ["gpt-image-2", "Design Image 2"],
  ["GPT Image 2", "Design Image 2"],
  ["GPT_Image_2", "Design Image 2"],
  ["g-image-2", "Design Image 2"],
  ["G Image 2", "Design Image 2"],
  ["G_Image_2", "Design Image 2"],
  // GPT Image → G Image（其他版本）
  ["GPT Image", "G Image"],
  ["GPT_Image", "G Image"],
  ["gpt-image", "g-image"],
  // Veo 3.1 → Beta（国内展示名）。统一海外命名后 agent 输出 veo-3.1-* / Veo3，
  // 国内渲染时 redact 回 beta。长度降序排序保证技术全名（最长）先匹配；裸 model_id
  // 形如 `veo-3.1-generate-001` 内部是 `veo-3`（带连字符），不含连续子串 `veo3`，
  // 因此短规则 `Veo3 → Beta` 不会误伤全名，双重安全。
  ["veo-3.1-fast-generate-001", "beta_fast"],
  ["veo-3.1-generate-001", "beta_pro"],
  ["Veo3.1 Fast", "Beta Fast"],
  ["Veo 3.1 Fast", "Beta Fast"],
  ["Veo3 Series", "Beta系列"],
  ["Veo3.1", "Beta Pro"],
  ["Veo 3.1", "Beta Pro"],
  ["Veo3", "Beta"],
  // seedream alias
  ["doubao-seedream-5-0-pro-260628", "Seedream 5.0 Pro"],
  ["doubao-seedream-4-5-251128", "Seedream 4.5"],
];
const SORTED_DOMESTIC_MODEL_DISPLAY_ALIASES = DOMESTIC_MODEL_DISPLAY_ALIASES.slice().sort(
  ([a2], [b3]) => b3.length - a2.length,
);
const DOMESTIC_MODEL_DISPLAY_ALIAS_BY_LOWERCASE = new Map(
  SORTED_DOMESTIC_MODEL_DISPLAY_ALIASES.map(([internal2, display]) => [
    internal2.toLowerCase(),
    display,
  ]),
);
const DOMESTIC_MODEL_DISPLAY_ALIAS_PATTERN = new RegExp(
  SORTED_DOMESTIC_MODEL_DISPLAY_ALIASES.map(([internal2]) => escapeRegExp$3(internal2)).join("|"),
  "gi",
);
const DOMESTIC_MODEL_CONTEXT_ALIAS_PATTERNS = [
  [/\bbanana(?=\s*(?:模型|model\b))/gi, "General Image"],
  [/(\b(?:(?:available|selected)_)?vendors?\s*=\s*(?:\[[^\]]*)?)\bbanana\b/gi, "$1General Image"],
];
function shouldRedactModelAliases(region) {
  return region === "domestic" || region === void 0 || region === null || region === "";
}
export function redactModelAliasesForDisplay(text2, region) {
  if (!text2 || !shouldRedactModelAliases(region)) return text2;
  let redacted = text2.replace(
    DOMESTIC_MODEL_DISPLAY_ALIAS_PATTERN,
    (matched) => DOMESTIC_MODEL_DISPLAY_ALIAS_BY_LOWERCASE.get(matched.toLowerCase()) ?? matched,
  );
  for (const [pattern, display] of DOMESTIC_MODEL_CONTEXT_ALIAS_PATTERNS) {
    redacted = redacted.replace(pattern, display);
  }
  return redacted;
}
function escapeRegExp$3(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
const WORKSPACE_IDENTITY_HEX_PATTERN = /^[a-f0-9]{64}$/;
const WORKSPACE_INSTANCE_ID_PATTERN =
  /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const WORKSPACE_IDENTITY_HOST_SUFFIX = ".hilo.localhost";
const WORKSPACE_IDENTITY_HOST_TOKEN_LENGTH = 50;
const BROWSER_LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]", "::1"]);
export const CANVAS_DESTRUCTIVE_SAVE_REJECTED_CODE = "CANVAS_DESTRUCTIVE_SAVE_REJECTED";
export const CANVAS_INVALID_SAVE_REJECTED_CODE = "CANVAS_INVALID_SAVE_REJECTED";
function workspaceIdentityHostname(workspaceClaim) {
  const claim = workspaceClaim.trim();
  if (!WORKSPACE_IDENTITY_HEX_PATTERN.test(claim)) return void 0;
  const token2 = BigInt(`0x${claim}`)
    .toString(36)
    .padStart(WORKSPACE_IDENTITY_HOST_TOKEN_LENGTH, "0");
  return `w-${token2}${WORKSPACE_IDENTITY_HOST_SUFFIX}`;
}
function workspaceInstanceHostname(instanceId, generation) {
  const normalized = instanceId.trim().toLowerCase();
  if (!WORKSPACE_INSTANCE_ID_PATTERN.test(normalized)) return void 0;
  if (generation !== void 0 && (!Number.isSafeInteger(generation) || generation < 1)) {
    return void 0;
  }
  const generationToken = generation === void 0 ? "" : `-g${generation}`;
  return `wi-${normalized.replaceAll("-", "")}${generationToken}${WORKSPACE_IDENTITY_HOST_SUFFIX}`;
}
export function toWorkspaceBrowserUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    const hostname = parsed.hostname.toLowerCase();
    const workspaceClaim = parsed.searchParams.get(HILO_WORKSPACE_IDENTITY_QUERY);
    const workspaceInstanceId = parsed.searchParams.get(HILO_WORKSPACE_INSTANCE_QUERY);
    const rawWorkspaceGeneration = parsed.searchParams.get(HILO_WORKSPACE_GENERATION_QUERY);
    const workspaceGeneration =
      rawWorkspaceGeneration === null ? void 0 : Number(rawWorkspaceGeneration);
    if (!BROWSER_LOOPBACK_HOSTS.has(hostname) || !workspaceClaim) return rawUrl;
    if (
      rawWorkspaceGeneration !== null &&
      (!Number.isSafeInteger(workspaceGeneration) || (workspaceGeneration ?? 0) < 1)
    ) {
      return rawUrl;
    }
    const identityHostname =
      (workspaceInstanceId &&
        workspaceInstanceHostname(workspaceInstanceId, workspaceGeneration)) ||
      workspaceIdentityHostname(workspaceClaim);
    if (!identityHostname) return rawUrl;
    parsed.hostname = identityHostname;
    parsed.searchParams.delete(HILO_WORKSPACE_IDENTITY_QUERY);
    parsed.searchParams.delete(HILO_WORKSPACE_INSTANCE_QUERY);
    parsed.searchParams.delete(HILO_WORKSPACE_GENERATION_QUERY);
    return parsed.toString();
  } catch {
    return rawUrl;
  }
}
const LOCAL_GATEWAY_HOSTNAMES = new Set(["127.0.0.1", "localhost", "[::1]"]);
export function resolveVideoPlaybackUrl(sourceUrl, maxHeight = DEFAULT_VIDEO_PLAYBACK_MAX_HEIGHT) {
  try {
    const isAbsolute = /^[a-z][a-z\d+.-]*:/i.test(sourceUrl);
    const parsed = new URL(sourceUrl, "http://hilo.local");
    if (!parsed.pathname.startsWith("/files/")) return sourceUrl;
    if (
      isAbsolute &&
      (parsed.protocol !== "http:" || !LOCAL_GATEWAY_HOSTNAMES.has(parsed.hostname.toLowerCase()))
    ) {
      return sourceUrl;
    }
    const playbackPath = videoPlaybackPath(sourceUrl, maxHeight);
    return isAbsolute ? `${parsed.origin}${playbackPath}` : playbackPath;
  } catch {
    return sourceUrl;
  }
}
const TEAM_GROUP_LOAD_REASONS = [
  /** Upstream certificate chain is not trusted — terminal, retrying cannot fix it. */
  "tls_trust" /** Hostname resolution failed — terminal (usually DNS/proxy configuration). */,
  "dns" /** Upstream refused the connection — retryable. */,
  "conn_refused" /** Connection was reset mid-flight — retryable. */,
  "conn_reset" /** TCP/TLS handshake timed out — retryable. */,
  "connect_timeout" /** Request exceeded the gateway's time budget — retryable. */,
  "timeout" /** Upstream answered 5xx — retryable. */,
  "upstream_5xx" /** Upstream rejected the request (4xx) — terminal. */,
  "upstream_4xx" /** Transport failed without a finer signature — retryable. */,
  "network" /** Local gateway configuration is incomplete (e.g. empty baseUrl) — terminal. */,
  "config_missing",
  "unknown",
];
new Set(TEAM_GROUP_LOAD_REASONS);
export const BACKEND_VIBE_MULTI_SHOT = "vibe_multi_shot";
export const BACKEND_VIBE_RELIGHT = "vibe_relight";
const BACKEND_TEXT_ANTHROPIC = "text_anthropic";
const BACKEND_TEXT_OPENAI = "text_openai";
const BACKEND_TEXT_GEMINI = "text_gemini";
export const FILE_ADOPTION_IDEMPOTENCY_HEADER = "idempotency-key";
export const UPLOAD_COMMIT_SAFE_PUBLISH_UNSUPPORTED = "UPLOAD_COMMIT_SAFE_PUBLISH_UNSUPPORTED";
export const DEFAULT_CREDIT_REMINDER_THRESHOLD = 2e3;
export const MIN_CREDIT_REMINDER_THRESHOLD = 100;
export const MAX_CREDIT_REMINDER_THRESHOLD = 1e6;
export function normalizeCreditReminderConfig(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      enabled: true,
      threshold: DEFAULT_CREDIT_REMINDER_THRESHOLD,
    };
  }
  const candidate = value;
  const enabled = typeof candidate.enabled === "boolean" ? candidate.enabled : true;
  const threshold = candidate.threshold;
  if (
    typeof threshold !== "number" ||
    !Number.isSafeInteger(threshold) ||
    threshold < MIN_CREDIT_REMINDER_THRESHOLD ||
    threshold > MAX_CREDIT_REMINDER_THRESHOLD
  ) {
    return {
      enabled,
      threshold: DEFAULT_CREDIT_REMINDER_THRESHOLD,
    };
  }
  return {
    enabled,
    threshold,
  };
}
export const SESSION_ID_HEADER = "x-session-id";
function toRegistryMediaType(type2) {
  switch (type2) {
    case "image":
    case "video":
    case "audio":
      return type2;
    case "music":
      return "audio";
    default:
      return null;
  }
}
const LEGACY_MODEL_DISPLAY_NAMES = new Map(
  LEGACY_HAILUO_MODEL_ALIASES.flatMap((alias) =>
    [...alias.publicModels, alias.pricingModel].map((model) => [model, alias.displayName]),
  ),
);
function isVisibleInRegion(entry, region) {
  return !entry.region || entry.region === region;
}
export function resolveModelDisplayName(backend, modelIdRaw, region, type2) {
  if (!modelIdRaw) return backend;
  const modelId = normalizeLegacyModelId(modelIdRaw);
  if (type2 === "text") return resolveTextModelDisplayName(backend, modelId, region) ?? modelId;
  const registryType = toRegistryMediaType(type2);
  if (!registryType) return modelId;
  const pool = modelPoolForType(registryType);
  const matchesId = (m3) =>
    m3.model_name === modelId ||
    m3.id === modelId ||
    m3.publicToken === modelId ||
    m3.pricingId === modelId;
  const regionalMatch =
    pool.find((m3) => isVisibleInRegion(m3, region) && m3.backend === backend && matchesId(m3)) ??
    pool.find((m3) => isVisibleInRegion(m3, region) && matchesId(m3));
  const crossRegionMatch = regionalMatch ? void 0 : pool.find(matchesId);
  const currentRegionCounterpart = crossRegionMatch
    ? pool.find(
        (m3) =>
          isVisibleInRegion(m3, region) &&
          m3.backend === crossRegionMatch.backend &&
          ((crossRegionMatch.model_name !== void 0 &&
            m3.model_name === crossRegionMatch.model_name) ||
            (crossRegionMatch.pricingId !== void 0 && m3.pricingId === crossRegionMatch.pricingId)),
      )
    : void 0;
  const match2 = regionalMatch ?? currentRegionCounterpart ?? crossRegionMatch;
  return match2?.name ?? LEGACY_MODEL_DISPLAY_NAMES.get(modelId) ?? modelId;
}
export function resolveImageGenerationEstimateSeconds(backend, modelIdRaw) {
  if (!backend || !modelIdRaw) return void 0;
  const modelId = normalizeLegacyModelId(modelIdRaw);
  return IMAGE_MODELS.find(
    (model) =>
      model.backend === backend &&
      (registrySelectionRowIds(model).includes(modelId) || model.pricingId === modelId),
  )?.estimatedGenerationSeconds;
}
const TEXT_MODELS = [
  // MiniMax M3 — 国内外同名
  {
    id: "minimaxHub/MiniMax-M3",
    name: "MiniMax M3",
    model_name: "MiniMax-M3",
    provider: "minimaxHub",
    backend: BACKEND_TEXT_ANTHROPIC,
    subtitle: {
      label: "lowCost",
      latency: "3-8s",
    },
  },
  // Alpha 系列区分国内外：国内不再提供 alpha；海外仅提供 alpha_high。
  {
    id: "alpha/alpha_high",
    name: "Claude Opus 4.6",
    model_name: "alpha_high",
    provider: "alpha",
    region: "overseas",
    backend: BACKEND_TEXT_ANTHROPIC,
    subtitle: {
      label: "polishedWriting",
      latency: "5-10s",
    },
  },
  // Domestic entries stay first so regionless fallbacks do not leak overseas names.
  // GPT 5.5 overseas / Gamma-5.5 domestic.
  {
    id: "gamma/gamma",
    name: "OAI 5.5",
    model_name: "gamma",
    provider: "gamma",
    region: "domestic",
    backend: BACKEND_TEXT_OPENAI,
    subtitle: {
      label: "accurate",
      latency: "8-15s",
    },
  },
  {
    id: "gamma/gamma",
    name: "GPT 5.5",
    model_name: "gamma",
    provider: "gamma",
    region: "overseas",
    backend: BACKEND_TEXT_OPENAI,
    subtitle: {
      label: "accurate",
      latency: "8-15s",
    },
  },
  // Gemini 3.1 Pro Preview overseas / Omega-3.1-pro domestic.
  {
    id: "omega/omega-3.1-pro",
    name: "Gemi 3.1 Pro",
    model_name: "omega-3.1-pro",
    provider: "omega",
    region: "domestic",
    backend: BACKEND_TEXT_GEMINI,
    subtitle: {
      label: "creative",
      latency: "5-10s",
    },
  },
  {
    id: "omega/omega-3.1-pro",
    name: "Gemini 3.1 Pro Preview",
    model_name: "omega-3.1-pro",
    provider: "omega",
    region: "overseas",
    backend: BACKEND_TEXT_GEMINI,
    subtitle: {
      label: "creative",
      latency: "5-10s",
    },
  },
];
function matchesTextModel(entry, modelName) {
  return entry.model_name === modelName || entry.id === modelName;
}
function resolveTextModelDisplayName(backend, modelName, region) {
  return (
    TEXT_MODELS.find(
      (m3) =>
        isVisibleInRegion(m3, region) && m3.backend === backend && matchesTextModel(m3, modelName),
    ) ??
    TEXT_MODELS.find((m3) => isVisibleInRegion(m3, region) && matchesTextModel(m3, modelName)) ??
    TEXT_MODELS.find((m3) => matchesTextModel(m3, modelName))
  )?.name;
}
function modelPoolForType(type2) {
  return (
    {
      image: IMAGE_MODELS,
      video: VIDEO_MODELS,
      audio: AUDIO_MODELS,
    }[type2] ?? []
  );
}
AUDIO_MODELS.filter(
  (m3) =>
    m3.backend === BACKEND_MINIMAX_TTS ||
    m3.backend === BACKEND_SEEDAUDIO ||
    (m3.backend === BACKEND_MINIMAX_V3 && !!m3.audioExtension),
);
AUDIO_MODELS.filter(
  (m3) => m3.backend === BACKEND_MINIMAX_MUSIC || m3.backend === BACKEND_ELEVENLABS_MUSIC,
);
const OPENCODE_RUNTIME_HOME_ENV = "OPENCODE_TEST_HOME";
const OPENCODE_RUNTIME_SWITCHES = [
  {
    key: "OPENCODE_DISABLE_PROJECT_CONFIG",
    value: "1",
    why: "Project trees are user content, not agent configuration. Without this, OpenCode walks up from the project dir collecting `.opencode` dirs and treats each as a config source (and an npm install target).",
  },
  {
    key: "OPENCODE_DISABLE_CLAUDE_CODE",
    value: "1",
    why: "Hub ships its own agent profile; Claude Code interop would inject a second, unversioned prompt surface.",
  },
  {
    key: "OPENCODE_DISABLE_EXTERNAL_SKILLS",
    value: "1",
    why: "Skills are resolved through Hub skill paths (`@hilo/protocol/skill-paths`), not through OpenCode discovery.",
  },
  {
    key: "OPENCODE_LOG_LEVEL",
    value: "INFO",
    why: "Without an explicit level OpenCode writes a ZERO-BYTE log file, so its own diagnostics — including `background dependency install failed`, which names the exact directory and cause — are discarded. That gap is why the four-hour freeze had to be root-caused by disassembling the binary instead of reading a log. Verbose debugging is unaffected: the `--log-level` CLI flag is applied by OpenCode after the env var and still wins.",
  },
];
[...OPENCODE_RUNTIME_SWITCHES.map(({ key: key2 }) => key2), OPENCODE_RUNTIME_HOME_ENV];
export const DELETE_UNDO_TTL_MS = 1e4;
export const OPERATIONS_UNDO_PATH = "/api/operations/undo";
export const PERF_PATCH_DELTA = "hilo:chat:patch-delta";
export const PERF_REDERIVE = "hilo:chat:rederive";
export const PERF_DERIVE_MESSAGES = "hilo:chat:derive-messages";
export const PERF_STORE_NOTIFY = "hilo:chat:store-notify";
export const PERF_CHAT_FIRST_PROGRESS = "hilo:chat:first-progress";
export const PERF_ASSET_PICKER_OPEN_FIRST_PAINT = "hilo:asset-picker:open-first-paint";
export const PERF_ASSET_PICKER_OPEN_INTERACTIVE = "hilo:asset-picker:open-interactive";
export const PERF_CANVAS_PERSIST_BUILD = "hilo:canvas:persist-build";
export const PERF_CANVAS_PERSIST_QUEUE = "hilo:canvas:persist-save-queue";
export const PERF_CANVAS_PERSIST_SAVE = "hilo:canvas:persist-save";
export const PERF_PATCH_DELTA_SAMPLE_RATE = 10;
export const PERF_PREFIX = "hilo:";
export const PERF_SLOW_THRESHOLDS = {
  [PERF_PATCH_DELTA]: 5,
  [PERF_REDERIVE]: 10,
  [PERF_DERIVE_MESSAGES]: 8,
  [PERF_STORE_NOTIFY]: 5,
  // Budget P95 (暂定) from performance-budget.md — entries above this are
  // over-budget occurrences, logged for visibility (no gate).
  [PERF_CHAT_FIRST_PROGRESS]: 1e4,
  [PERF_LOG_FLUSH]: 100,
  [PERF_ASSET_PICKER_OPEN_FIRST_PAINT]: 250,
  [PERF_ASSET_PICKER_OPEN_INTERACTIVE]: 500,
  [PERF_CANVAS_PERSIST_BUILD]: 50,
  [PERF_CANVAS_PERSIST_QUEUE]: 10,
  [PERF_CANVAS_PERSIST_HTTP_ROUNDTRIP]: 3e3,
  [PERF_CANVAS_PERSIST_SAVE]: 3e3,
};
export const PERF_SLOW_DEFAULT_MS = 16;
export const PROJECT_EXPORT_ACTIVITY_HEARTBEAT_INTERVAL_MS = 1e4;
export const CHAT_ARTIFACT_UI_ID = {
  image: "chat-generated-image",
  audio: "chat-artifact-audio",
  video: "chat-artifact-video",
  file: "chat-artifact-file",
};
export const TEXT_VERSION_TIER_S_MAX_BYTES = 1024 * 1024;
export const TEXT_VERSION_TITLE_MAX_CHARS = 120;
export const TEXT_VERSION_NOTE_MAX_CHARS = 2e3;
export function textVersionNumbers(versionsNewestFirst) {
  const total = versionsNewestFirst.length;
  const numbers = new Map();
  versionsNewestFirst.forEach((version2, index2) => {
    numbers.set(version2.id, total - index2);
  });
  return numbers;
}
