// normalize-skill-detail-metadata.js

const INTERRUPTED_PATTERN =
  /(?:AbortError|operation was aborted|\babort(?:ed)?\b|\binterrupted\b|\bcancell?ed\b|用户中断|用户取消)/i;
const TIMEOUT_PATTERN =
  /(?:TimeoutError|\btimeout\b|timed out|ETIMEDOUT|UND_ERR_(?:CONNECT|HEADERS|BODY)_TIMEOUT)/i;
const NETWORK_PATTERN =
  /(?:fetch failed|network error|was there a typo in the url or port|unable to connect\. is the computer able to access the url|socket hang up|ECONNRESET|ECONNREFUSED|EHOSTUNREACH|ENETUNREACH|ENOTFOUND|EAI_AGAIN|EPIPE|UND_ERR)/i;
const STORAGE_PATTERN = /(?:database or disk is full|ENOSPC)/i;
const MODEL_CONCURRENCY_PATTERN =
  /(?:model[_ -]?rate[_ -]?limit|concurrency[_ -]?limit|超出该模型并发限制|模型并发|并发上限)/i;
const AGENT_DIRECTIVE_OR_API_STATUS_PATTERN =
  /(?:Do NOT use|Stop and ask the user|API error \d{3}|API \d{3}\b|\bHTTP \d{3}\b|Http Exception|\bstatus=\d{3}\b|\binvalid request\b)/i;
const TECHNICAL_NOISE_PATTERN =
  /(?:TypeError|FetchError|AI_APICallError|OpenCode responded|Cannot read properties|Cannot destructure|stack trace|\bat\s+\S+\(|InvalidParameter)/i;
export function classifyRawErrorText(raw) {
  const text = (raw ?? "").trim();
  if (!text) return null;
  if (MODEL_CONCURRENCY_PATTERN.test(text)) return "concurrency";
  if (AGENT_DIRECTIVE_OR_API_STATUS_PATTERN.test(text)) return "technical";
  if (TIMEOUT_PATTERN.test(text)) return "timeout";
  if (INTERRUPTED_PATTERN.test(text)) return "interrupted";
  if (NETWORK_PATTERN.test(text)) return "network";
  if (STORAGE_PATTERN.test(text)) return "storage";
  if (TECHNICAL_NOISE_PATTERN.test(text)) return "technical";
  return null;
}
export const FEEDBACK_CONSTRAINTS = {
  DESCRIPTION_MIN_LENGTH: 1,
  DESCRIPTION_MAX_LENGTH: 500,
  /** Max number of user-attached files per submission. */
  ATTACHMENT_MAX_COUNT: 5,
  /** Max size per attached file (5 MB). */
  ATTACHMENT_MAX_BYTES: 5 * 1024 * 1024,
};
export var PopupType = ((PopupType) => {
  PopupType[(PopupType["POPUP_TYPE_NONE"] = 0)] = "POPUP_TYPE_NONE";
  PopupType[(PopupType["POPUP_TYPE_GENERAL"] = 1)] = "POPUP_TYPE_GENERAL";
  PopupType[(PopupType["POPUP_TYPE_MIGRATION"] = 2)] = "POPUP_TYPE_MIGRATION";
  PopupType[(PopupType["POPUP_TYPE_FEATURE"] = 3)] = "POPUP_TYPE_FEATURE";
  PopupType[(PopupType["UNRECOGNIZED"] = -1)] = "UNRECOGNIZED";
  return PopupType;
})(PopupType || {});
export var MemberRole = ((MemberRole) => {
  MemberRole[(MemberRole["MEMBER_ROLE_UNSPECIFIED"] = 0)] =
    "MEMBER_ROLE_UNSPECIFIED";
  MemberRole[(MemberRole["MEMBER_ROLE_CREATOR"] = 1)] = "MEMBER_ROLE_CREATOR";
  MemberRole[(MemberRole["MEMBER_ROLE_MEMBER"] = 2)] = "MEMBER_ROLE_MEMBER";
  MemberRole[(MemberRole["UNRECOGNIZED"] = -1)] = "UNRECOGNIZED";
  return MemberRole;
})(MemberRole || {});
export var CloudNodeType = ((CloudNodeType) => {
  CloudNodeType[(CloudNodeType["CLOUD_NODE_TYPE_UNSPECIFIED"] = 0)] =
    "CLOUD_NODE_TYPE_UNSPECIFIED";
  CloudNodeType[(CloudNodeType["CLOUD_NODE_TYPE_FOLDER"] = 1)] =
    "CLOUD_NODE_TYPE_FOLDER";
  CloudNodeType[(CloudNodeType["CLOUD_NODE_TYPE_FILE"] = 2)] =
    "CLOUD_NODE_TYPE_FILE";
  CloudNodeType[(CloudNodeType["UNRECOGNIZED"] = -1)] = "UNRECOGNIZED";
  return CloudNodeType;
})(CloudNodeType || {});
export function pickLocalized(field, lang, empty = "") {
  if (!field) return empty;
  if (Object.hasOwn(field, lang)) return field[lang];
  if (Object.hasOwn(field, "en-US")) return field["en-US"];
  if (Object.hasOwn(field, "zh-CN")) return field["zh-CN"];
  for (const fieldKey of Object.keys(field)) {
    return field[fieldKey];
  }
  return empty;
}
export const ErrorCodes = {
  // Network
  NETWORK_TIMEOUT: "NETWORK_TIMEOUT",
  NETWORK_UNREACHABLE: "NETWORK_UNREACHABLE",
  NETWORK_DNS_FAILED: "NETWORK_DNS_FAILED",
  // OpenCode Runtime
  RUNTIME_SESSION_ERROR: "RUNTIME_SESSION_ERROR",
  RUNTIME_CONNECTION_LOST: "RUNTIME_CONNECTION_LOST",
  RUNTIME_STREAM_ERROR: "RUNTIME_STREAM_ERROR",
  RUNTIME_NOT_READY: "RUNTIME_NOT_READY",
  RUNTIME_TOOLS_UNAVAILABLE: "RUNTIME_TOOLS_UNAVAILABLE",
  RUNTIME_CANCELLED: "RUNTIME_CANCELLED",
  // The desktop may keep any number of cold/recent workspace previews, but
  // only a bounded number of distinct workspaces may execute user work at the
  // same time. Emitted before a turn/generation is accepted when that shared
  // cross-gateway budget is full.
  WORKSPACE_CONCURRENCY_LIMIT_REACHED: "WORKSPACE_CONCURRENCY_LIMIT_REACHED",
  // Zero/missing LLM providers while the user token is still valid
  // (remote provider config fetch failed at boot — NOT an auth expiry).
  // 02-provider-readiness-lkg §4.2: must not drive the re-login flow.
  PROVIDERS_UNAVAILABLE: "PROVIDERS_UNAVAILABLE",
  // Gateway
  GATEWAY_INTERNAL: "GATEWAY_INTERNAL",
  GATEWAY_BAD_REQUEST: "GATEWAY_BAD_REQUEST",
  GATEWAY_UPSTREAM_ERROR: "GATEWAY_UPSTREAM_ERROR",
  // Upstream v1/responses stream truncated before any output (HTTP 200 then
  // bare TCP EOF). services/gateway signals this via an error event whose
  // message === "upstream_truncated"; app/gateway auto-retries with a fallback
  // model. Retryable.
  GATEWAY_UPSTREAM_TRUNCATED: "GATEWAY_UPSTREAM_TRUNCATED",
  CONTENT_BLOCKED: "CONTENT_BLOCKED",
  INPUT_MEDIA_REVIEW_FAILED: "INPUT_MEDIA_REVIEW_FAILED",
  /** Streaming assistant output was rejected by the cloud content policy. */
  CONTENT_POLICY_VIOLATION: "content_policy_violation",
  // Auth
  AUTH_EXPIRED: "AUTH_EXPIRED",
  // Custom model credentials failed; never invalidate the Hub account session.
  MODEL_PROVIDER_AUTH_FAILED: "MODEL_PROVIDER_AUTH_FAILED",
  // A user-configured model rejected a request; user_message contains its sanitized error.
  MODEL_PROVIDER_ERROR: "MODEL_PROVIDER_ERROR",
  // Storage
  // Local disk is full — gateway/OpenCode could not write generated artifacts,
  // asset records, or the conversation database. User-actionable: free up space.
  STORAGE_FULL: "STORAGE_FULL",
  // Billing
  BILLING_INSUFFICIENT_BALANCE: "BILLING_INSUFFICIENT_BALANCE",
  // Client
  CLIENT_WS_ERROR: "CLIENT_WS_ERROR",
  CLIENT_WS_RECONNECT_FAILED: "CLIENT_WS_RECONNECT_FAILED",
  CLIENT_UPLOAD_FAILED: "CLIENT_UPLOAD_FAILED",
};
export const BACKEND_MIDJOURNEY = "midjourney";
export const BACKEND_MINIMAX_V3 = "minimax_v3";
export const BACKEND_MINIMAX_TTS = "minimax_tts";
export const BACKEND_SEEDAUDIO = "seedaudio";
export const BACKEND_MINIMAX_MUSIC = "minimax_music";
export const BACKEND_ELEVENLABS_MUSIC = "elevenlabs_music";
export const BACKEND_KLING_AVATAR = "kling_avatar";
export const GENERATE_ERROR_CODE_SHUTDOWN = "shutdown";
export const GENERATE_ERROR_CODE_CONCURRENCY_LIMIT = "concurrency_limit";
export const GENERATE_ERROR_CODE_NETWORK_CONNECT_TIMEOUT =
  "network_connect_timeout";
export const GENERATE_ERROR_CODE_CONTENT_POLICY_VIOLATION =
  "content_policy_violation";
export const GENERATE_ERROR_CODE_NETWORK_ERROR = "network_error";
export const GENERATE_ERROR_CODE_BILLING_INSUFFICIENT_BALANCE =
  "billing_insufficient_balance";
const NON_FAILURE_ERROR_TOKENS = new Set([
  "success",
  "succeeded",
  "ok",
  "none",
  "null",
  "0",
]);
function isInformativeFailureMessage(message) {
  return !NON_FAILURE_ERROR_TOKENS.has(message.trim().toLowerCase());
}
export function pickUserMessage(resp, fallback) {
  if (resp.user_message) return resp.user_message;
  if (resp.error && isInformativeFailureMessage(resp.error)) return resp.error;
  return fallback;
}
export function registrySelectionRowIds(entry) {
  return Array.from(
    new Set(
      [
        entry.id,
        entry.model_name,
        entry.publicToken,
        entry.seriesId ?? entry.id,
        ...(entry.selectionAliases ?? []),
      ].filter((value) => Boolean(value)),
    ),
  );
}
const LEGACY_MODEL_ID_MAP = {
  midjourney: "midjourney-8.2",
};
export function normalizeLegacyModelId(id) {
  if (!id) return id;
  return LEGACY_MODEL_ID_MAP[id] ?? id;
}
export const LEGACY_HAILUO_MODEL_ALIASES = [
  {
    publicModels: ["MiniMax-Hailuo-2.3-Fast", "Hailuo 2.3 Fast"],
    pricingModel: "MiniMax-Hailuo-2.3-Fast",
    preferredPublicModel: "MiniMax-Hailuo-2.3-Fast",
    displayName: "Hailuo 2.3 Fast",
  },
  {
    publicModels: ["MiniMax-Hailuo-2.3", "Hailuo 2.3"],
    pricingModel: "MiniMax-Hailuo-2.3",
    preferredPublicModel: "MiniMax-Hailuo-2.3",
    displayName: "Hailuo 2.3",
  },
  {
    publicModels: ["MiniMax-Hailuo-02", "Hailuo 2.0"],
    pricingModel: "MiniMax-Hailuo-02",
    preferredPublicModel: "MiniMax-Hailuo-02",
    displayName: "Hailuo 2.0",
  },
];
export const MINIMAX_H3_TEXT_ONLY_DEFAULT_RATIO = "16:9";
export const HILO_SOURCE_HEADER = "x-hilo-source";
export const PROJECT_NAME_MAX_CHARS = 50;
export function truncateProjectName(skillName, maxChars = PROJECT_NAME_MAX_CHARS) {
  const trimmed = skillName?.trim() ?? "";
  if (!trimmed) return "";
  const chars = [...trimmed];
  return chars.length > maxChars
    ? chars.slice(0, maxChars).join("").trim()
    : trimmed;
}
export function normalizeSkillContentLocale(value) {
  return typeof value === "string" && value.toLowerCase().startsWith("en")
    ? "en-US"
    : "zh-CN";
}
export function selectSkillStructuredInfo(info, preferredLocale) {
  const preferred = normalizeSkillContentLocale(preferredLocale);
  const locale = info?.[preferred]
    ? preferred
    : info?.["zh-CN"]
      ? "zh-CN"
      : info?.["en-US"]
        ? "en-US"
        : preferred;
  return {
    locale,
    info: info?.[locale] ?? {
      summary: "",
      best_for: [],
      how_to_use: "",
      outputs: "",
    },
  };
}
const SKILL_NAME_RE = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/;
export function isValidSkillName(skillName) {
  return SKILL_NAME_RE.test(skillName);
}
export function skillVerticals(skill) {
  if (skill.completeTagsEn?.length)
    return skill.completeTagsEn.map((tag) => tag.split(" / ")[0].trim());
  if (skill.tagEn) return [skill.tagEn.split(" / ")[0].trim()];
  if (skill.tags?.length) return skill.tags;
  return [];
}
export function skillCategoryCodes(skill) {
  return skill.categoryCodes ?? [];
}
const SKILL_MEDIA_HOSTS = new Set(["cdn.hailuoai.com", "cdn.hailuoai.video"]);
const SKILL_SUBMISSION_MEDIA_HOST =
  /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]\.oss-[a-z0-9-]+\.aliyuncs\.com$/;
const SKILL_SUBMISSION_SHOWCASE_PATH =
  /^\/creator-plan\/[1-9]\d*\/[A-Za-z0-9._-]+\/showcase-\d+\.(mp4|webm|mov)$/;
export function isSkillShowcaseUrl(value) {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port
    )
      return false;
    return (
      (SKILL_MEDIA_HOSTS.has(url.hostname) &&
        /\.(mp4|webm|mov|gif|png|jpe?g|webp|jfif)$/i.test(url.pathname)) ||
      (SKILL_SUBMISSION_MEDIA_HOST.test(url.hostname) &&
        !url.hostname.includes("-internal.") &&
        SKILL_SUBMISSION_SHOWCASE_PATH.test(decodeURIComponent(url.pathname)))
    );
  } catch {
    return false;
  }
}
export function normalizePublicSkillShowcaseUrl(value) {
  if (!isSkillShowcaseUrl(value)) return void 0;
  const url = new URL(value);
  if (!/\.(mp4|webm|mov)$/i.test(url.pathname)) return void 0;
  if (SKILL_SUBMISSION_MEDIA_HOST.test(url.hostname)) {
    url.pathname = decodeURIComponent(url.pathname);
  }
  url.search = "";
  url.hash = "";
  return url.href;
}
export function skillMetadataRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : void 0;
}
export function normalizeSkillDetailMetadata(raw) {
  const result = {};
  if (Array.isArray(raw.showcase)) {
    const media = [...new Set(raw.showcase.filter(isSkillShowcaseUrl))];
    result.showcase = media;
  } else {
    const media = [raw.showcase, raw.showcaseUrl, raw.showcase_url].find(
      isSkillShowcaseUrl,
    );
    if (media) result.showcase = [media];
  }
  const localized = skillMetadataRecord(
    raw.structuredInfo ?? raw.structured_info ?? raw["structured-info"],
  );
  const legacyBest = raw.bestFor ?? raw.best_for ?? raw["best-for"];
  const legacyHow = raw.howToUse ?? raw.how_to_use ?? raw["how-to-use"];
  const hasLegacyDetails = [
    "bestFor",
    "best_for",
    "best-for",
    "howToUse",
    "how_to_use",
    "how-to-use",
    "outputs",
  ].some((key) => Object.hasOwn(raw, key));
  const legacyLocale = normalizeSkillContentLocale(
    raw.contentLocale ?? raw.content_locale ?? raw["content-locale"],
  );
  const info = {};
  for (const locale of ["zh-CN", "en-US"]) {
    const legacySummary = (
      locale === "zh-CN"
        ? [
            raw.summaryZh,
            raw.summary_zh,
            raw.summary_cn,
            raw["summary-cn"],
            raw.summary,
          ]
        : [raw.summary, raw.summary_en, raw["summary-en"]]
    ).find((value) => typeof value === "string" && value.trim());
    const entry =
      skillMetadataRecord(localized?.[locale]) ??
      (!localized && hasLegacyDetails && locale === legacyLocale
        ? {
            summary: legacySummary,
            best_for: legacyBest,
            how_to_use: legacyHow,
            outputs: raw.outputs,
          }
        : void 0);
    if (!entry) continue;
    const summary =
      typeof entry.summary === "string" ? entry.summary.trim() : "";
    const how = entry.how_to_use ?? entry["how-to-use"];
    const best = entry.best_for ?? entry["best-for"];
    info[locale] = {
      summary,
      best_for: Array.isArray(best)
        ? best
            .filter((value) => typeof value === "string" && !!value.trim())
            .map((value) => value.trim())
        : [],
      how_to_use: typeof how === "string" ? how.trim() : "",
      outputs: typeof entry.outputs === "string" ? entry.outputs.trim() : "",
    };
  }
  if (localized || Object.keys(info).length) result.structuredInfo = info;
  return result;
}
