// push-inline.js
import { compareSemver } from "../vendor.js";
import {
  BLOCK_PREFIX_RE,
  FENCE_RE,
  TABLE_DELIM_RE,
  findStrippableDelimiters,
  pushChar,
} from "../canvas/relayout-group-children.js";
function pushInline(b3, line, lineStart, from2, strippable) {
  const strip = strippable ?? findStrippableDelimiters(line);
  let i2 = from2;
  while (i2 < line.length) {
    const ch = line[i2];
    const next2 = line[i2 + 1];
    if ((ch === "*" || ch === "_" || ch === "~" || ch === "`") && strip[i2]) {
      i2 += 1;
      continue;
    }
    if (ch === "!" && next2 === "[") {
      const close2 = findBracketClose(line, i2 + 1);
      if (close2 >= 0) {
        const paren = matchParen(line, close2 + 1);
        if (paren >= 0) {
          pushChar(b3, " ", lineStart + i2, true);
          i2 = paren + 1;
          continue;
        }
      }
    }
    if (ch === "[") {
      const close2 = findBracketClose(line, i2);
      if (close2 >= 0) {
        const paren = matchParen(line, close2 + 1);
        if (paren >= 0) {
          pushInline(b3, line.slice(0, close2), lineStart, i2 + 1, strip);
          i2 = paren + 1;
          continue;
        }
      }
    }
    if (ch === "<") {
      const m3 = /^<br\s*\/?>/i.exec(line.slice(i2));
      if (m3) {
        pushChar(b3, " ", lineStart + i2, true);
        i2 += m3[0].length;
        continue;
      }
    }
    if (ch === "|") {
      pushChar(b3, " ", lineStart + i2, true);
      i2 += 1;
      continue;
    }
    if (ch === "\\" && next2 && "\\`*_{}[]()#+-.!|~>".includes(next2)) {
      pushChar(b3, next2, lineStart + i2 + 1, false);
      i2 += 2;
      continue;
    }
    pushChar(b3, ch === "	" ? " " : ch, lineStart + i2, ch === "	");
    i2 += 1;
  }
}
function findBracketClose(line, open) {
  let depth2 = 0;
  for (let i2 = open; i2 < line.length; i2++) {
    if (line[i2] === "[") depth2 += 1;
    else if (line[i2] === "]") {
      depth2 -= 1;
      if (depth2 === 0) return i2;
    }
  }
  return -1;
}
function matchParen(line, at2) {
  if (line[at2] !== "(") return -1;
  let depth2 = 0;
  for (let i2 = at2; i2 < line.length; i2++) {
    if (line[i2] === "(") depth2 += 1;
    else if (line[i2] === ")") {
      depth2 -= 1;
      if (depth2 === 0) return i2;
    }
  }
  return -1;
}
export function buildMarkdownNormalizeMap(raw2) {
  const b3 = {
    normalized: [],
    normToRaw: [],
    synthetic: [],
  };
  const lines = raw2.split("\n");
  let inFence = false;
  let offset2 = 0;
  for (let li2 = 0; li2 < lines.length; li2++) {
    const line = lines[li2];
    const lineStart = offset2;
    offset2 += line.length + 1;
    if (FENCE_RE.test(line)) {
      inFence = !inFence;
      pushChar(b3, " ", lineStart, true);
      continue;
    }
    if (inFence) {
      for (let i2 = 0; i2 < line.length; i2++) pushChar(b3, line[i2], lineStart + i2, false);
      pushChar(b3, " ", lineStart + line.length, true);
      continue;
    }
    if (line.includes("|") && line.includes("-") && TABLE_DELIM_RE.test(line)) {
      pushChar(b3, " ", lineStart, true);
      continue;
    }
    if (/^\s*(?:[-*_]\s*){3,}$/.test(line) && line.trim().length >= 3) {
      pushChar(b3, " ", lineStart, true);
      continue;
    }
    const prefix = BLOCK_PREFIX_RE.exec(line);
    const contentFrom = prefix ? prefix[0].length : 0;
    pushInline(b3, line, lineStart, contentFrom);
    pushChar(b3, " ", lineStart + line.length, true);
  }
  while (
    b3.normalized.length > 0 &&
    b3.normalized[b3.normalized.length - 1] === " " &&
    b3.synthetic[b3.synthetic.length - 1]
  ) {
    b3.normalized.pop();
    b3.normToRaw.pop();
    b3.synthetic.pop();
  }
  return {
    normalized: b3.normalized.join(""),
    normToRaw: b3.normToRaw,
    synthetic: b3.synthetic,
  };
}
export function collapseRenderedText(text2) {
  return text2.replace(/\s+/g, " ");
}
const INLINE_MARK_CHARS = new Set(["*", "~", "`"]);
export function stripInlineMarkChars(text2) {
  let out = "";
  for (const ch of text2) {
    if (!INLINE_MARK_CHARS.has(ch)) out += ch;
  }
  return out;
}
export function stripInlineMarkCharsWithMap(text2) {
  const chars2 = [];
  const map3 = [];
  for (let i2 = 0; i2 < text2.length; i2++) {
    const ch = text2[i2];
    if (INLINE_MARK_CHARS.has(ch)) continue;
    chars2.push(ch);
    map3.push(i2);
  }
  return {
    stripped: chars2.join(""),
    map: map3,
  };
}
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
export function classifyRawErrorText(raw2) {
  const text2 = (raw2 ?? "").trim();
  if (!text2) return null;
  if (MODEL_CONCURRENCY_PATTERN.test(text2)) return "concurrency";
  if (AGENT_DIRECTIVE_OR_API_STATUS_PATTERN.test(text2)) return "technical";
  if (TIMEOUT_PATTERN.test(text2)) return "timeout";
  if (INTERRUPTED_PATTERN.test(text2)) return "interrupted";
  if (NETWORK_PATTERN.test(text2)) return "network";
  if (STORAGE_PATTERN.test(text2)) return "storage";
  if (TECHNICAL_NOISE_PATTERN.test(text2)) return "technical";
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
export var PopupType = ((PopupType2) => {
  PopupType2[(PopupType2["POPUP_TYPE_NONE"] = 0)] = "POPUP_TYPE_NONE";
  PopupType2[(PopupType2["POPUP_TYPE_GENERAL"] = 1)] = "POPUP_TYPE_GENERAL";
  PopupType2[(PopupType2["POPUP_TYPE_MIGRATION"] = 2)] = "POPUP_TYPE_MIGRATION";
  PopupType2[(PopupType2["POPUP_TYPE_FEATURE"] = 3)] = "POPUP_TYPE_FEATURE";
  PopupType2[(PopupType2["UNRECOGNIZED"] = -1)] = "UNRECOGNIZED";
  return PopupType2;
})(PopupType || {});
export var MemberRole = ((MemberRole2) => {
  MemberRole2[(MemberRole2["MEMBER_ROLE_UNSPECIFIED"] = 0)] = "MEMBER_ROLE_UNSPECIFIED";
  MemberRole2[(MemberRole2["MEMBER_ROLE_CREATOR"] = 1)] = "MEMBER_ROLE_CREATOR";
  MemberRole2[(MemberRole2["MEMBER_ROLE_MEMBER"] = 2)] = "MEMBER_ROLE_MEMBER";
  MemberRole2[(MemberRole2["UNRECOGNIZED"] = -1)] = "UNRECOGNIZED";
  return MemberRole2;
})(MemberRole || {});
export var CloudNodeType = ((CloudNodeType2) => {
  CloudNodeType2[(CloudNodeType2["CLOUD_NODE_TYPE_UNSPECIFIED"] = 0)] =
    "CLOUD_NODE_TYPE_UNSPECIFIED";
  CloudNodeType2[(CloudNodeType2["CLOUD_NODE_TYPE_FOLDER"] = 1)] = "CLOUD_NODE_TYPE_FOLDER";
  CloudNodeType2[(CloudNodeType2["CLOUD_NODE_TYPE_FILE"] = 2)] = "CLOUD_NODE_TYPE_FILE";
  CloudNodeType2[(CloudNodeType2["UNRECOGNIZED"] = -1)] = "UNRECOGNIZED";
  return CloudNodeType2;
})(CloudNodeType || {});
export var CloudNodeReviewStatus = ((CloudNodeReviewStatus2) => {
  CloudNodeReviewStatus2[(CloudNodeReviewStatus2["CLOUD_NODE_REVIEW_STATUS_UNSPECIFIED"] = 0)] =
    "CLOUD_NODE_REVIEW_STATUS_UNSPECIFIED";
  CloudNodeReviewStatus2[(CloudNodeReviewStatus2["CLOUD_NODE_REVIEW_STATUS_REVIEWING"] = 100)] =
    "CLOUD_NODE_REVIEW_STATUS_REVIEWING";
  CloudNodeReviewStatus2[(CloudNodeReviewStatus2["CLOUD_NODE_REVIEW_STATUS_PASS"] = 200)] =
    "CLOUD_NODE_REVIEW_STATUS_PASS";
  CloudNodeReviewStatus2[(CloudNodeReviewStatus2["CLOUD_NODE_REVIEW_STATUS_BLOCK"] = 300)] =
    "CLOUD_NODE_REVIEW_STATUS_BLOCK";
  CloudNodeReviewStatus2[(CloudNodeReviewStatus2["UNRECOGNIZED"] = -1)] = "UNRECOGNIZED";
  return CloudNodeReviewStatus2;
})(CloudNodeReviewStatus || {});
export const GENERATE_ERROR_CODE_PRE_SUBMIT_SHUTDOWN = "pre_submit_shutdown";
export function pickLocalized(field, lang, empty2 = "") {
  if (!field) return empty2;
  if (Object.hasOwn(field, lang)) return field[lang];
  if (Object.hasOwn(field, "en-US")) return field["en-US"];
  if (Object.hasOwn(field, "zh-CN")) return field["zh-CN"];
  for (const k2 of Object.keys(field)) {
    return field[k2];
  }
  return empty2;
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
function mapStoryboardPricing(raw2) {
  if (!raw2 || typeof raw2 !== "object" || Array.isArray(raw2)) return void 0;
  const creditCost = raw2.creditCost;
  return typeof creditCost === "number" && Number.isFinite(creditCost) && creditCost >= 0
    ? {
        creditCost,
      }
    : void 0;
}
function mapH3ContextIrPricing(raw2) {
  if (!raw2 || typeof raw2 !== "object" || Array.isArray(raw2)) return void 0;
  const value = raw2;
  const input = value.input_credit_per_million_tokens;
  const output = value.output_credit_per_million_tokens;
  if (
    typeof input !== "number" ||
    !Number.isFinite(input) ||
    input < 0 ||
    typeof output !== "number" ||
    !Number.isFinite(output) ||
    output < 0
  ) {
    return void 0;
  }
  return {
    inputCreditPerMillionTokens: input,
    outputCreditPerMillionTokens: output,
  };
}
export const WORKSPACE_IDENTITY_WS_CLOSE_CODE = 1008;
const BACKEND_NANO_BANANA = "nano_banana";
const BACKEND_KLING = "kling";
const BACKEND_OPENAI = "openai";
export const BACKEND_MIDJOURNEY = "midjourney";
const BACKEND_SEEDREAM = "seedream";
export const BACKEND_MINIMAX_V3 = "minimax_v3";
const BACKEND_VEO3 = "veo3";
const BACKEND_WAN_I2V = "wan_i2v";
export const BACKEND_MINIMAX_TTS = "minimax_tts";
export const BACKEND_SEEDAUDIO = "seedaudio";
export const BACKEND_MINIMAX_MUSIC = "minimax_music";
export const BACKEND_MINIMAX_MUSIC_COVER = "minimax_music_cover";
export const BACKEND_ELEVENLABS_MUSIC = "elevenlabs_music";
const BACKEND_SEEDANCE = "seedance";
export const BACKEND_KLING_AVATAR = "kling_avatar";
export const HOME_QUICK_START_CONFIG_MAX_BYTES = 1e6;
export const GENERATE_ERROR_CODE_SHUTDOWN = "shutdown";
export const GENERATE_ERROR_CODE_CONCURRENCY_LIMIT = "concurrency_limit";
export const GENERATE_ERROR_CODE_NETWORK_CONNECT_TIMEOUT = "network_connect_timeout";
export const GENERATE_ERROR_CODE_CONTENT_POLICY_VIOLATION = "content_policy_violation";
export const GENERATE_ERROR_CODE_NETWORK_ERROR = "network_error";
export const GENERATE_ERROR_CODE_STORAGE_FULL = "storage_full";
export const GENERATE_ERROR_CODE_BILLING_INSUFFICIENT_BALANCE = "billing_insufficient_balance";
export const GENERATE_ERROR_CODE_QUEUE_PAUSED$3 = "queue_paused";
const NON_FAILURE_ERROR_TOKENS = new Set(["success", "succeeded", "ok", "none", "null", "0"]);
function isInformativeFailureMessage(message2) {
  return !NON_FAILURE_ERROR_TOKENS.has(message2.trim().toLowerCase());
}
export function pickUserMessage(resp, fallback) {
  if (resp.user_message) return resp.user_message;
  if (resp.error && isInformativeFailureMessage(resp.error)) return resp.error;
  return fallback;
}
export function mapPricingResponse(raw2) {
  const ttsRaw = raw2.tts;
  const musicRaw = raw2.music;
  return {
    enabled: raw2.enabled,
    video: raw2.video ?? [],
    image: raw2.image ?? [],
    tts: ttsRaw
      ? {
          hdCreditPerChar: ttsRaw.hd_credit_per_char ?? 1,
          turboCreditPerChar: ttsRaw.turbo_credit_per_char ?? 0.6,
          hdModels: ttsRaw.hd_models ?? [],
          turboModels: ttsRaw.turbo_models ?? [],
        }
      : void 0,
    music: musicRaw
      ? {
          oncePrice: musicRaw.once_price ?? 0,
          elevenLabsMusicV1PerMinute: musicRaw["11labs_music_v1_per_minute"] ?? 0,
          elevenLabsMusicV2PerMinute: musicRaw["11labs_music_v2_per_minute"] ?? 0,
        }
      : void 0,
    text: raw2.text ?? void 0,
    tool: raw2.tool ?? [],
    h3ContextIr: mapH3ContextIrPricing(raw2.h3_context_ir),
    storyboard: mapStoryboardPricing(raw2.storyboard),
    promotionEndUnix: typeof raw2.promotionEndUnix === "number" ? raw2.promotionEndUnix : void 0,
    sessionStatsSinceMs:
      typeof raw2.session_stats_since_ms === "number" ? raw2.session_stats_since_ms : void 0,
  };
}
const ASPECT_RATIOS_FULL = [
  "auto",
  "1:1",
  "16:9",
  "9:16",
  "3:4",
  "4:3",
  "3:2",
  "2:3",
  "5:4",
  "4:5",
  "21:9",
];
const IMAGE_GENERATION_ESTIMATE_SECONDS = 180;
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
export function normalizeLegacyModelId(id2) {
  if (!id2) return id2;
  return LEGACY_MODEL_ID_MAP[id2] ?? id2;
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
let cachedModelPricingNameMaps = null;
const PRICING_TO_PUBLIC_MODEL_EXCLUSIONS = new Set(["MiniMax-H3"]);
function buildModelPricingNameMaps() {
  const publicToPricing = new Map();
  const pricingToPublic = new Map();
  const add2 = (entry) => {
    const pricingModel = (entry.pricingId ?? entry.model_name ?? entry.id).trim();
    if (!pricingModel) return;
    for (const rawPublicModel of [entry.id, entry.model_name, entry.publicToken, pricingModel]) {
      const publicModel = rawPublicModel?.trim();
      if (!publicModel) continue;
      publicToPricing.set(publicModel, pricingModel);
    }
    const preferredPublicModel = (entry.model_name ?? entry.publicToken ?? entry.id).trim();
    if (
      preferredPublicModel &&
      !PRICING_TO_PUBLIC_MODEL_EXCLUSIONS.has(pricingModel) &&
      !pricingToPublic.has(pricingModel)
    ) {
      pricingToPublic.set(pricingModel, preferredPublicModel);
    }
  };
  for (const entry of [...IMAGE_MODELS, ...VIDEO_MODELS, ...AUDIO_MODELS]) {
    add2(entry);
  }
  for (const alias of LEGACY_HAILUO_MODEL_ALIASES) {
    for (const publicModel of [...alias.publicModels, alias.pricingModel]) {
      publicToPricing.set(publicModel, alias.pricingModel);
    }
    if (
      !PRICING_TO_PUBLIC_MODEL_EXCLUSIONS.has(alias.pricingModel) &&
      !pricingToPublic.has(alias.pricingModel)
    ) {
      pricingToPublic.set(alias.pricingModel, alias.preferredPublicModel);
    }
  }
  return {
    publicToPricing,
    pricingToPublic,
  };
}
function getModelPricingNameMaps() {
  cachedModelPricingNameMaps ??= buildModelPricingNameMaps();
  return cachedModelPricingNameMaps;
}
export function resolveModelPricingName(model) {
  const normalized = model.trim();
  if (!normalized) return normalized;
  return getModelPricingNameMaps().publicToPricing.get(normalized) ?? normalized;
}
function gptImage25Params() {
  return {
    resolution: {
      type: "select",
      label: "分辨率",
      options: ["1k", "2k", "4k"],
      default: "1k",
    },
    aspect_ratio: {
      type: "select",
      label: "比例",
      options: [
        "1:1",
        "16:9",
        "9:16",
        "3:4",
        "4:3",
        "3:2",
        "2:3",
        "5:4",
        "4:5",
        "21:9",
        "2:1",
        "1:2",
        "3:1",
        "1:3",
      ],
      default: "1:1",
    },
    quality: {
      type: "select",
      label: "画质",
      options: ["low", "medium", "high", "xhigh", "max"],
      default: "medium",
    },
    // background 只在 2.5 暴露：云网关 normalizeOpenAIBackground 会把其他 GPT Image
    // 模型上的 transparent / opaque 归一化回 auto。transparent 时由云网关自行补
    // output_format=png，前端不需要（也不应该）声明这个参数。
    background: {
      type: "select",
      label: "背景",
      options: ["auto", "transparent", "opaque"],
      default: "auto",
    },
  };
}
export const IMAGE_MODELS = [
  // NanoBanana series — domestic registration (General Image branding)
  {
    id: "banana-2",
    name: "General Image 2",
    seriesId: "banana",
    publicToken: "banana_2",
    region: "domestic",
    backend: BACKEND_NANO_BANANA,
    model_name: "nano_banana_2_flash",
    //backend model name
    estimatedGenerationSeconds: IMAGE_GENERATION_ESTIMATE_SECONDS,
    max_refs: 10,
    params: {
      image_mode: {
        type: "select",
        label: "生成方式",
        options: ["reference"],
        default: "reference",
      },
      aspect_ratio: {
        type: "select",
        label: "比例",
        options: ASPECT_RATIOS_FULL,
        default: "auto",
      },
      resolution: {
        type: "select",
        label: "分辨率",
        options: ["auto", "1K", "2K", "4K"],
        default: "auto",
      },
    },
  },
  {
    id: "banana-pro",
    name: "General Image Pro",
    seriesId: "banana",
    publicToken: "banana_pro",
    region: "domestic",
    backend: BACKEND_NANO_BANANA,
    model_name: "nano_banana_2",
    estimatedGenerationSeconds: IMAGE_GENERATION_ESTIMATE_SECONDS,
    max_refs: 10,
    params: {
      image_mode: {
        type: "select",
        label: "生成方式",
        options: ["reference"],
        default: "reference",
      },
      aspect_ratio: {
        type: "select",
        label: "比例",
        options: ASPECT_RATIOS_FULL,
        default: "auto",
      },
      resolution: {
        type: "select",
        label: "分辨率",
        options: ["auto", "1K", "2K", "4K"],
        default: "auto",
      },
    },
  },
  // NanoBanana series — overseas registration (NanoBanana branding)
  {
    id: "nano_banana_2_flash",
    name: "NanoBanana 2",
    seriesId: "nano-banana",
    region: "overseas",
    backend: BACKEND_NANO_BANANA,
    model_name: "nano_banana_2_flash",
    estimatedGenerationSeconds: IMAGE_GENERATION_ESTIMATE_SECONDS,
    max_refs: 10,
    params: {
      aspect_ratio: {
        type: "select",
        label: "比例",
        options: ASPECT_RATIOS_FULL,
        default: "auto",
      },
      resolution: {
        type: "select",
        label: "分辨率",
        options: ["auto", "1K", "2K", "4K"],
        default: "auto",
      },
    },
  },
  {
    id: "nano_banana_2",
    name: "NanoBanana Pro",
    seriesId: "nano-banana",
    region: "overseas",
    backend: BACKEND_NANO_BANANA,
    model_name: "nano_banana_2",
    estimatedGenerationSeconds: IMAGE_GENERATION_ESTIMATE_SECONDS,
    max_refs: 10,
    params: {
      aspect_ratio: {
        type: "select",
        label: "比例",
        options: ASPECT_RATIOS_FULL,
        default: "auto",
      },
      resolution: {
        type: "select",
        label: "分辨率",
        options: ["auto", "1K", "2K", "4K"],
        default: "auto",
      },
    },
  },
  // Seedream
  // max_refs 严格对齐官方文档上限 ≤10（4.5/4.0 多图融合），早期 registry
  // 写 14 会被上游静默截断或返回 4xx；详见画布模型参数对接 Diff 报告 §2.2
  // (2026-06-07)。如需放宽请先与上游确认。
  {
    id: "doubao-seedream-5-0-pro-260628",
    name: "Seedream 5.0 Pro",
    seriesId: "seedream",
    backend: BACKEND_SEEDREAM,
    model_name: "doubao-seedream-5-0-pro-260628",
    estimatedGenerationSeconds: IMAGE_GENERATION_ESTIMATE_SECONDS,
    max_refs: 10,
    params: {
      aspect_ratio: {
        type: "select",
        label: "比例",
        options: ASPECT_RATIOS_FULL,
        default: "auto",
      },
      // Seedream 5.0 Pro \u4E0A\u6E38\u5206\u8FA8\u7387\u6863\u4F4D\uFF1A1K / 2K\uFF08\u65E0 auto / \u65E0 3K / \u65E0 4K\uFF09\u3002
      // Default to 2K, matching the upstream default.
      resolution: {
        type: "select",
        label: "分辨率",
        options: ["1K", "2K"],
        default: "2K",
      },
    },
  },
  {
    id: "doubao-seedream-4-5-251128",
    name: "Seedream 4.5",
    seriesId: "seedream",
    backend: BACKEND_SEEDREAM,
    model_name: "doubao-seedream-4-5-251128",
    estimatedGenerationSeconds: IMAGE_GENERATION_ESTIMATE_SECONDS,
    max_refs: 10,
    params: {
      aspect_ratio: {
        type: "select",
        label: "比例",
        options: ASPECT_RATIOS_FULL,
        default: "auto",
      },
      // Seedream 4.5 \u4E0A\u6E38\u5206\u8FA8\u7387\u6863\u4F4D\uFF1A2K / 4K\uFF08\u65E0 auto / \u65E0 1K / \u65E0 3K\uFF09\u3002
      // Default to 2K, matching the upstream default.
      resolution: {
        type: "select",
        label: "分辨率",
        options: ["2K", "4K"],
        default: "2K",
      },
    },
  },
  // Midjourney 8.2 is the only generation entry; billing retains the series key.
  {
    id: "midjourney-8.2",
    name: "Midjourney 8.2",
    seriesId: "midjourney",
    backend: BACKEND_MIDJOURNEY,
    pricingId: "midjourney",
    estimatedGenerationSeconds: IMAGE_GENERATION_ESTIMATE_SECONDS,
    max_refs: 4,
    params: {
      aspect_ratio: {
        type: "select",
        label: "比例",
        options: ASPECT_RATIOS_FULL,
        default: "1:1",
      },
      clarity: {
        type: "select",
        label: "清晰度",
        options: ["1k", "2k"],
        default: "1k",
      },
      stylize: {
        type: "slider",
        label: "风格化",
        min: 0,
        max: 1e3,
        step: 1,
        default: "100",
        marks: ["0", "100", "250", "500", "750", "1000"],
      },
      chaos: {
        type: "slider",
        label: "多样化",
        min: 0,
        max: 100,
        step: 1,
        default: "0",
        marks: ["0", "10", "30", "50", "75", "100"],
      },
      weird: {
        type: "slider",
        label: "怪异化",
        min: 0,
        max: 3e3,
        step: 1,
        default: "0",
        marks: ["0", "250", "500", "1000", "2000", "3000"],
      },
    },
  },
  // GPT Image 2 — 双区域命名分离（与 all-in-one / nano_banana 同模式）
  // Domestic: g-image-2 / "Design Image 2" —— 去 OpenAI 品牌
  // Overseas: gpt-image-2 / "GPT Image 2" —— 沿用 OpenAI 品牌
  //
  // GPT Image 2 双区域共用一套 params 形态：
  //   - aspect_ratio: 在 21:9 之后追加 2:1 / 1:2 / 3:1 / 1:3 四个极端横纵比，
  //     横纵成对排布，保持原有横纵交替的视觉模式。
  //   - quality: low / medium / high 三档，default=medium。gateway 与云网关
  //     已透传并按 quality 分档计费。
  {
    id: "g-image-2",
    name: "Design Image 2",
    seriesId: "g-image-2",
    selectionAliases: ["gpt-image"],
    region: "domestic",
    backend: BACKEND_OPENAI,
    model_name: "gpt-image-2",
    estimatedGenerationSeconds: IMAGE_GENERATION_ESTIMATE_SECONDS,
    max_refs: 16,
    params: {
      resolution: {
        type: "select",
        label: "分辨率",
        options: ["1k", "2k", "4k"],
        default: "1k",
      },
      aspect_ratio: {
        type: "select",
        label: "比例",
        options: [
          "1:1",
          "16:9",
          "9:16",
          "3:4",
          "4:3",
          "3:2",
          "2:3",
          "5:4",
          "4:5",
          "21:9",
          "2:1",
          "1:2",
          "3:1",
          "1:3",
        ],
        default: "1:1",
      },
      quality: {
        type: "select",
        label: "画质",
        options: ["low", "medium", "high"],
        default: "medium",
      },
    },
  },
  {
    id: "gpt-image-2",
    name: "GPT Image 2",
    seriesId: "openai-image",
    region: "overseas",
    backend: BACKEND_OPENAI,
    model_name: "gpt-image-2",
    estimatedGenerationSeconds: IMAGE_GENERATION_ESTIMATE_SECONDS,
    max_refs: 16,
    params: {
      resolution: {
        type: "select",
        label: "分辨率",
        options: ["1k", "2k", "4k"],
        default: "1k",
      },
      aspect_ratio: {
        type: "select",
        label: "比例",
        options: [
          "1:1",
          "16:9",
          "9:16",
          "3:4",
          "4:3",
          "3:2",
          "2:3",
          "5:4",
          "4:5",
          "21:9",
          "2:1",
          "1:2",
          "3:1",
          "1:3",
        ],
        default: "1:1",
      },
      quality: {
        type: "select",
        label: "画质",
        options: ["low", "medium", "high"],
        default: "medium",
      },
    },
  },
  // GPT Image 2.5 — Flare（快速）/ Sunburst（精细）两个变体 × 双区域命名分离，
  // 与 GPT Image 2 同模式。max_refs 与链路与 GPT Image 2 一致；参数只多出 quality 的
  // xhigh / max 两档与独有的 background（见 gptImage25Params）。
  //
  // Domestic: g-image-2.5-*   / "Design Image 2.5 Flare|Sunburst" —— 去 OpenAI 品牌
  // Overseas: gpt-image-2.5-* / "GPT Image 2.5 Flare|Sunburst"    —— 沿用 OpenAI 品牌
  //
  // 两区只差一个品牌前缀，变体后缀保持一致。
  //
  // 两区共用同一个上游 model_name，而云网关计费按 model_name 匹配（非注册表 id），
  // 所以 Apollo media_billing_config / op_models 每个变体只需配一份。
  ...[
    {
      variant: "flare",
      label: "Flare",
    },
    {
      variant: "sunburst",
      label: "Sunburst",
    },
  ].flatMap(({ variant, label }) => [
    {
      id: `g-image-2.5-${variant}`,
      name: `Design Image 2.5 ${label}`,
      seriesId: "g-image-2.5",
      region: "domestic",
      backend: BACKEND_OPENAI,
      model_name: `gpt-image-2.5-${variant}`,
      estimatedGenerationSeconds: IMAGE_GENERATION_ESTIMATE_SECONDS,
      max_refs: 16,
      params: gptImage25Params(),
    },
    {
      id: `gpt-image-2.5-${variant}`,
      name: `GPT Image 2.5 ${label}`,
      seriesId: "openai-image",
      region: "overseas",
      backend: BACKEND_OPENAI,
      model_name: `gpt-image-2.5-${variant}`,
      estimatedGenerationSeconds: IMAGE_GENERATION_ESTIMATE_SECONDS,
      max_refs: 16,
      params: gptImage25Params(),
    },
  ]),
];
export const MINIMAX_H3_TEXT_ONLY_DEFAULT_RATIO = "16:9";
const HAILUO03_VIDEO_MODEL = {
  id: "MiniMax-H3",
  name: "MiniMax H3",
  seriesId: "MiniMax",
  backend: BACKEND_MINIMAX_V3,
  model_name: "MiniMax-H3",
  pricingId: "MiniMax-H3",
  max_refs: 9,
  max_video_refs: 3,
  max_audio_refs: 3,
  max_video_audio_refs: 3,
  supportsLastFrameOnly: true,
  promptMaxLength: 7e3,
  inputMediaLimits: {
    imageMinWidth: 256,
    imageMinHeight: 256,
    imageMaxWidth: 5760,
    imageMaxHeight: 5760,
    imageMinAspectRatio: 2 / 5,
    imageMaxAspectRatio: 5 / 2,
  },
  params: {
    image_mode: {
      type: "select",
      label: "生成方式",
      options: ["reference", "first-last-frame", "video-extension"],
      default: "reference",
    },
    duration: {
      type: "select",
      label: "时长",
      options: ["4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15"],
      default: "5",
    },
    aspect_ratio: {
      type: "select",
      label: "宽高比",
      options: [
        "adaptive",
        MINIMAX_H3_TEXT_ONLY_DEFAULT_RATIO,
        "4:3",
        "1:1",
        "3:4",
        "9:16",
        "21:9",
      ],
      default: "adaptive",
    },
    resolution: {
      type: "select",
      label: "分辨率",
      options: ["768P", "2K"],
      default: "2K",
    },
    generate_audio: {
      type: "select",
      label: "有声视频",
      options: ["true", "false"],
      default: "true",
    },
  },
  // 首尾帧模式上游只支持自适应比例（其余比例上游会忽略 / 报错）；视频续写
  // 仍走 768P 专用链路。popover 侧直接隐藏对应模式不支持的选项。
  paramConstraints: [
    {
      if: {
        param: "image_mode",
        eq: "first-last-frame",
      },
      disable: {
        param: "aspect_ratio",
        options: ["16:9", "4:3", "1:1", "3:4", "9:16", "21:9"],
      },
    },
    {
      if: {
        param: "image_mode",
        eq: "video-extension",
      },
      disable: {
        param: "resolution",
        options: ["2K"],
      },
    },
  ],
  videoExtension: {
    inputMinDurationSec: 2,
    inputMaxDurationSec: 15,
    outputMinDurationSec: 5,
    outputMaxDurationSec: 20,
  },
};
const MINIMAX_H3_MAX_VIDEO_MODEL = {
  id: "MiniMax-H3-Max",
  name: "MiniMax H3 Max",
  seriesId: "MiniMax",
  backend: BACKEND_MINIMAX_V3,
  model_name: "MiniMax-H3-Max",
  pricingId: "MiniMax-H3-Max",
  max_refs: 9,
  max_video_refs: 3,
  max_audio_refs: 3,
  max_video_audio_refs: 3,
  promptRequired: true,
  supportsLastFrameOnly: false,
  hiddenParamsByImageMode: {
    "first-last-frame": ["aspect_ratio"],
  },
  referenceMediaLimits: {
    video: {
      minDurationSec: 2,
      maxDurationSec: 15,
      totalMaxDurationSec: 15,
    },
    audio: {
      minDurationSec: 2,
      maxDurationSec: 15,
      totalMaxDurationSec: 15,
      allowStandalone: false,
    },
  },
  params: {
    image_mode: {
      type: "select",
      label: "canvas.params.imageMode",
      options: ["reference", "first-last-frame", "text-to-video"],
      default: "reference",
    },
    aspect_ratio: {
      type: "select",
      label: "canvas.params.ratio",
      options: ["adaptive", "16:9", "4:3", "1:1", "3:4", "9:16", "21:9"],
      default: "adaptive",
    },
    resolution: {
      type: "select",
      label: "canvas.params.resolution",
      options: ["768P", "480P"],
      default: "768P",
    },
    duration: {
      type: "select",
      label: "canvas.params.duration",
      options: ["5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15"],
      default: "5",
    },
    prompt_expansion_mode: {
      type: "select",
      label: "canvas.params.promptExpansion",
      options: ["disabled", "balanced", "quality"],
      default: "balanced",
    },
  },
  // 上游只在比例能从参考素材推导时接受 adaptive（i2va / r2va）；纯文本生成
  // （t2va）必须给固定比例。首尾帧比例整体隐藏，见 hiddenParamsByImageMode。
  paramConstraints: [
    {
      if: {
        param: "image_mode",
        eq: "text-to-video",
      },
      disable: {
        param: "aspect_ratio",
        options: ["adaptive"],
      },
    },
  ],
};
const MINIMAX_H3_MAX_TURBO_VIDEO_MODEL = {
  ...MINIMAX_H3_MAX_VIDEO_MODEL,
  id: "MiniMax-H3-Max-Turbo",
  name: "MiniMax H3 Max Turbo",
  model_name: "MiniMax-H3-Max-Turbo",
  pricingId: "MiniMax-H3-Max-Turbo",
  max_refs: 2,
  max_video_refs: void 0,
  max_audio_refs: void 0,
  max_video_audio_refs: void 0,
  referenceMediaLimits: void 0,
  params: {
    ...MINIMAX_H3_MAX_VIDEO_MODEL.params,
    image_mode: {
      ...MINIMAX_H3_MAX_VIDEO_MODEL.params.image_mode,
      options: ["first-last-frame", "text-to-video"],
      default: "text-to-video",
    },
    aspect_ratio: {
      ...MINIMAX_H3_MAX_VIDEO_MODEL.params.aspect_ratio,
      options: ["21:9", "16:9", "4:3", "1:1", "3:4", "9:16"],
      default: "16:9",
    },
  },
};
const WAN3_MAX_REFERENCE_IMAGES = 10;
const WAN3_MAX_REFERENCE_VIDEOS = 5;
const WAN3_MAX_REFERENCE_AUDIOS = 5;
const WAN3_PROMPT_MAX_LENGTH = 2e4;
const WAN3_REFERENCE_MEDIA_LIMITS = {
  video: {
    minDurationSec: 1,
    maxDurationSec: 15,
    totalMaxDurationSec: 15,
    combinedWithOutputMaxDurationSec: 30,
  },
  audio: {
    minDurationSec: 1,
    maxDurationSec: 15,
    totalMaxDurationSec: 15,
    allowStandalone: true,
  },
};
const WAN3_DURATION_OPTIONS = Array.from(
  {
    length: 29,
  },
  (_2, index2) => String(index2 + 2),
);
function wan3Params() {
  return {
    // 只暴露全能参考与首尾帧两种。视频编辑 / 视频延长 不单独开模式：
    // 在 reference 下放参考视频 + prompt 里写编辑或延长意图，上游自行识别，
    // 能力并没有少。文件参考（file）也归在 reference 里。
    image_mode: {
      type: "select",
      label: "生成方式",
      options: ["reference", "first-last-frame"],
      default: "reference",
    },
    duration: {
      type: "select",
      label: "时长",
      options: WAN3_DURATION_OPTIONS,
      default: "5",
    },
    aspect_ratio: {
      type: "select",
      label: "宽高比",
      options: ["adaptive", "16:9", "4:3", "1:1", "3:4", "9:16"],
      default: "adaptive",
    },
    resolution: {
      type: "select",
      label: "分辨率",
      options: ["480P", "720P", "1080P"],
      default: "1080P",
    },
    generate_audio: {
      type: "select",
      label: "有声视频",
      options: ["true", "false"],
      default: "true",
    },
  };
}
export const VIDEO_MODELS = [
  HAILUO03_VIDEO_MODEL,
  MINIMAX_H3_MAX_VIDEO_MODEL,
  MINIMAX_H3_MAX_TURBO_VIDEO_MODEL,
  // Seedance series
  {
    id: "seedance2.0",
    name: "Seedance 2.0",
    seriesId: "seedance",
    backend: BACKEND_SEEDANCE,
    model_name: "seedance2.0",
    max_refs: 9,
    max_video_refs: 3,
    max_audio_refs: 3,
    promptRequired: true,
    params: {
      image_mode: {
        type: "select",
        label: "生成方式",
        options: ["reference", "first-last-frame"],
        default: "reference",
      },
      duration: {
        type: "select",
        label: "时长",
        options: ["4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15"],
        default: "5",
      },
      aspect_ratio: {
        type: "select",
        label: "宽高比",
        options: ["adaptive", "16:9", "4:3", "1:1", "3:4", "9:16", "21:9"],
        default: "adaptive",
      },
      resolution: {
        type: "select",
        label: "分辨率",
        options: ["480p", "720p", "1080p", "4k"],
        default: "720p",
      },
      generate_audio: {
        type: "select",
        label: "有声视频",
        options: ["true", "false"],
        default: "true",
      },
    },
  },
  {
    id: "seedance2.0-fast",
    name: "Seedance 2.0 Fast",
    seriesId: "seedance",
    backend: BACKEND_SEEDANCE,
    model_name: "seedance2.0-fast",
    max_refs: 9,
    max_video_refs: 3,
    max_audio_refs: 3,
    promptRequired: true,
    params: {
      image_mode: {
        type: "select",
        label: "生成方式",
        options: ["reference", "first-last-frame"],
        default: "reference",
      },
      duration: {
        type: "select",
        label: "时长",
        options: ["4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15"],
        default: "5",
      },
      aspect_ratio: {
        type: "select",
        label: "宽高比",
        options: ["adaptive", "16:9", "4:3", "1:1", "3:4", "9:16", "21:9"],
        default: "adaptive",
      },
      resolution: {
        type: "select",
        label: "分辨率",
        options: ["480p", "720p"],
        default: "720p",
      },
      generate_audio: {
        type: "select",
        label: "有声视频",
        options: ["true", "false"],
        default: "true",
      },
    },
  },
  {
    id: "seedance2.0-mini",
    name: "Seedance 2.0 Mini",
    seriesId: "seedance",
    backend: BACKEND_SEEDANCE,
    model_name: "seedance2.0-mini",
    max_refs: 9,
    max_video_refs: 3,
    max_audio_refs: 3,
    promptRequired: true,
    params: {
      image_mode: {
        type: "select",
        label: "生成方式",
        options: ["reference", "first-last-frame"],
        default: "reference",
      },
      duration: {
        type: "select",
        label: "时长",
        options: ["4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15"],
        default: "5",
      },
      aspect_ratio: {
        type: "select",
        label: "宽高比",
        options: ["adaptive", "16:9", "4:3", "1:1", "3:4", "9:16", "21:9"],
        default: "adaptive",
      },
      resolution: {
        type: "select",
        label: "分辨率",
        options: ["480p", "720p"],
        default: "720p",
      },
      generate_audio: {
        type: "select",
        label: "有声视频",
        options: ["true", "false"],
        default: "true",
      },
    },
  },
  {
    id: "seedance2.5",
    name: "Seedance 2.5",
    seriesId: "seedance",
    backend: BACKEND_SEEDANCE,
    model_name: "seedance2.5",
    max_refs: 30,
    max_video_refs: 10,
    max_audio_refs: 10,
    promptRequired: true,
    referenceMediaLimits: {
      video: {
        minDurationSec: 2,
        maxDurationSec: 30,
        totalMaxDurationSec: 30,
      },
      audio: {
        minDurationSec: 2,
        maxDurationSec: 30,
        totalMaxDurationSec: 30,
        allowStandalone: true,
      },
    },
    params: {
      image_mode: {
        type: "select",
        label: "生成方式",
        options: ["reference", "first-last-frame", "video-edit", "video-extend"],
        default: "reference",
      },
      duration: {
        type: "select",
        label: "时长",
        options: Array.from(
          {
            length: 27,
          },
          (_2, index2) => String(index2 + 4),
        ),
        default: "5",
      },
      aspect_ratio: {
        type: "select",
        label: "宽高比",
        options: ["adaptive", "16:9", "4:3", "1:1", "3:4", "9:16", "21:9"],
        default: "adaptive",
      },
      resolution: {
        type: "select",
        label: "分辨率",
        options: ["480p", "720p", "1080p"],
        default: "720p",
      },
      output_format: {
        type: "select",
        label: "输出格式",
        options: ["mp4", "mov"],
        default: "mp4",
      },
      generate_audio: {
        type: "select",
        label: "有声视频",
        options: ["true", "false"],
        default: "true",
      },
    },
  },
  // Kling 3.0 Omni video (multi-shot + image/video references).
  {
    id: "kling-v3-omni-video",
    name: "Kling 3.0 Omni",
    seriesId: "kling",
    backend: BACKEND_KLING,
    model_name: "kling-v3-omni",
    pricingId: "kling-v3-omni",
    max_refs: 7,
    max_video_refs: 1,
    promptMaxLength: 2500,
    params: {
      mode: {
        type: "select",
        label: "清晰度",
        options: ["std", "pro", "4k"],
        default: "pro",
      },
      aspect_ratio: {
        type: "select",
        label: "比例",
        options: ["16:9", "9:16", "1:1"],
        default: "16:9",
      },
      duration: {
        type: "select",
        label: "时长(秒)",
        options: ["3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15"],
        default: "5",
      },
      sound: {
        type: "select",
        label: "声音",
        options: ["on", "off"],
        default: "off",
      },
    },
  },
  {
    id: "kling-avatar",
    name: "Kling Avatar",
    seriesId: "kling",
    backend: BACKEND_KLING_AVATAR,
    model_name: "kling-avatar",
    pricingId: "kling-avatar",
    max_refs: 1,
    referenceImageRequired: true,
    max_audio_refs: 1,
    params: {
      image_mode: {
        type: "select",
        label: "生成方式",
        options: ["reference"],
        default: "reference",
      },
      mode: {
        type: "select",
        label: "清晰度",
        options: ["std", "pro"],
        default: "std",
      },
      type: {
        type: "select",
        label: "类型",
        options: ["avatar"],
        default: "avatar",
      },
    },
  },
  // Wan 2.6 已下线：Apollo 不再下发这一行，且 wan_i2v backend 现在路由到 Wan 3.0，
  // 真去生成会被云网关的 wan3 型号白名单拒掉。条目本身不能删 —— 历史用 2.6
  // 生成的资产还要靠它查显示名（见 ModelInfo.hideInModelPicker 的说明），
  // 所以只把它从选择面里藏起来。
  {
    id: "wan2.6-i2v",
    name: "Wan 2.6",
    seriesId: "wan",
    backend: BACKEND_WAN_I2V,
    model_name: "wan2.6-i2v",
    hideInModelPicker: true,
    max_refs: 1,
    referenceImageRequired: true,
    max_audio_refs: 1,
    promptMaxLength: 1500,
    params: {
      duration: {
        type: "select",
        label: "时长",
        options: ["5", "10", "15"],
        default: "5",
      },
      resolution: {
        type: "select",
        label: "分辨率",
        options: ["720P", "1080P"],
        default: "1080P",
      },
      shot_type: {
        type: "select",
        label: "镜头类型",
        options: ["single", "multi"],
        default: "single",
      },
    },
  },
  // Wan 3.0 — All-in-One 全能参考视频。文生 / 首帧(+尾帧) / 参考生 / 视频编辑 /
  // 视频延长共用同一上游入口，由素材组合决定模式。image_mode 只暴露 reference 与
  // first-last-frame 两档：编辑和延长靠 reference + 参考视频 + prompt 意图达成，
  // 不需要单独的模式档。
  // backend 复用 wan_i2v（见 backend-ids.ts 的说明）：新增 backend id 会让存量
  // 客户端整份 catalog 解析失败。本地 gateway 按 model_id 选实现。
  // 上游强互斥：首尾帧素材与参考素材（图 / 视频 / 音频 / 文件）不能混用，
  // 云网关 ValidateWan3Input 会在提交期拦掉非法组合。
  {
    id: "wan3.0-video",
    name: "Wan 3.0",
    seriesId: "wan",
    backend: BACKEND_WAN_I2V,
    model_name: "wan3.0-video",
    max_refs: WAN3_MAX_REFERENCE_IMAGES,
    max_video_refs: WAN3_MAX_REFERENCE_VIDEOS,
    max_audio_refs: WAN3_MAX_REFERENCE_AUDIOS,
    promptMaxLength: WAN3_PROMPT_MAX_LENGTH,
    referenceMediaLimits: WAN3_REFERENCE_MEDIA_LIMITS,
    params: wan3Params(),
  },
  {
    id: "wan3.0-video-prime",
    name: "Wan 3.0 Prime",
    seriesId: "wan",
    backend: BACKEND_WAN_I2V,
    model_name: "wan3.0-video-prime",
    max_refs: WAN3_MAX_REFERENCE_IMAGES,
    max_video_refs: WAN3_MAX_REFERENCE_VIDEOS,
    max_audio_refs: WAN3_MAX_REFERENCE_AUDIOS,
    promptMaxLength: WAN3_PROMPT_MAX_LENGTH,
    referenceMediaLimits: WAN3_REFERENCE_MEDIA_LIMITS,
    params: wan3Params(),
  },
  // Veo3.1 Fast — domestic registration (Beta branding)
  {
    id: "beta-3-1-fast",
    name: "Beta Fast",
    seriesId: "beta",
    publicToken: "beta_fast",
    region: "domestic",
    backend: BACKEND_VEO3,
    model_name: "veo-3.1-fast-generate-001",
    max_refs: 1,
    promptRequired: true,
    params: {
      image_mode: {
        type: "select",
        label: "生成方式",
        options: ["first-last-frame"],
        default: "first-last-frame",
      },
      duration: {
        type: "select",
        label: "时长",
        options: ["8"],
        default: "8",
      },
      aspect_ratio: {
        type: "select",
        label: "比例",
        options: ["16:9", "9:16"],
        default: "16:9",
      },
      resolution: {
        type: "select",
        label: "分辨率",
        options: ["720p", "1080p"],
        default: "720p",
      },
    },
  },
  // Veo3.1 — domestic registration (Beta branding)
  {
    id: "beta-3-1",
    name: "Beta Pro",
    seriesId: "beta",
    publicToken: "beta_pro",
    region: "domestic",
    backend: BACKEND_VEO3,
    model_name: "veo-3.1-generate-001",
    max_refs: 1,
    promptRequired: true,
    params: {
      image_mode: {
        type: "select",
        label: "生成方式",
        options: ["first-last-frame"],
        default: "first-last-frame",
      },
      duration: {
        type: "select",
        label: "时长",
        options: ["8"],
        default: "8",
      },
      aspect_ratio: {
        type: "select",
        label: "比例",
        options: ["16:9", "9:16"],
        default: "16:9",
      },
      resolution: {
        type: "select",
        label: "分辨率",
        options: ["720p", "1080p"],
        default: "720p",
      },
    },
  },
  // Veo3.1 Fast — overseas registration (Veo3.1 branding)
  {
    id: "veo-3.1-fast-generate-001",
    name: "Veo3.1 Fast",
    seriesId: "veo3",
    region: "overseas",
    backend: BACKEND_VEO3,
    model_name: "veo-3.1-fast-generate-001",
    max_refs: 1,
    promptRequired: true,
    params: {
      duration: {
        type: "select",
        label: "时长",
        options: ["8"],
        default: "8",
      },
      aspect_ratio: {
        type: "select",
        label: "比例",
        options: ["16:9", "9:16"],
        default: "16:9",
      },
      resolution: {
        type: "select",
        label: "分辨率",
        options: ["720p", "1080p"],
        default: "720p",
      },
    },
  },
  // Veo3.1 — overseas registration (Veo3.1 branding)
  {
    id: "veo-3.1-generate-001",
    name: "Veo3.1",
    seriesId: "veo3",
    region: "overseas",
    backend: BACKEND_VEO3,
    model_name: "veo-3.1-generate-001",
    max_refs: 1,
    promptRequired: true,
    params: {
      duration: {
        type: "select",
        label: "时长",
        options: ["8"],
        default: "8",
      },
      aspect_ratio: {
        type: "select",
        label: "比例",
        options: ["16:9", "9:16"],
        default: "16:9",
      },
      resolution: {
        type: "select",
        label: "分辨率",
        options: ["720p", "1080p"],
        default: "720p",
      },
    },
  },
];
const TTS_VOICE_OPTIONS = [
  "Friendly_Person",
  "Calm_Woman",
  "Energetic_Male",
  "Professional_Female",
  "Deep_Male",
  "Young_Female",
];
const TTS_SPEED_PRESETS = ["0.5", "0.75", "1", "1.25", "1.5", "1.75", "2"];
const TTS_SPEED_SLIDER = {
  type: "slider",
  label: "语速",
  min: 0.5,
  max: 2,
  step: 0.25,
  marks: TTS_SPEED_PRESETS,
  default: "1",
};
const TTS_EMOTIONS_BASIC = [
  "calm",
  "happy",
  "sad",
  "angry",
  "fearful",
  "disgusted",
  "surprised",
  "fluent",
];
const TTS_EMOTION_FIELD = {
  type: "select",
  label: "情绪",
  options: TTS_EMOTIONS_BASIC,
  default: "",
  optional: true,
};
const SEEDAUDIO_SPEED_SLIDER = {
  type: "slider",
  label: "语速",
  min: 0.5,
  max: 2,
  step: 0.1,
  marks: ["0.5", "1", "1.5", "2"],
  default: "1",
};
const SEEDAUDIO_VOLUME_SLIDER = {
  type: "slider",
  label: "音量",
  min: 0.5,
  max: 2,
  step: 0.1,
  marks: ["0.5", "1", "1.5", "2"],
  default: "1",
};
const SEEDAUDIO_PITCH_SLIDER = {
  type: "slider",
  label: "音调",
  min: -12,
  max: 12,
  step: 1,
  marks: ["-12", "0", "12"],
  default: "0",
};
const SEEDAUDIO_SAMPLE_RATE_FIELD = {
  type: "select",
  label: "采样率",
  options: ["8000", "16000", "24000", "32000", "44100", "48000"],
  default: "24000",
};
export const AUDIO_MODELS = [
  // MiniMax H3 reference-audio continuation.
  {
    id: "MiniMax-H3 Audio",
    name: "MiniMax H3 Audio",
    seriesId: "MiniMax",
    backend: BACKEND_MINIMAX_V3,
    model_name: "MiniMax-H3 Audio",
    pricingId: "MiniMax-H3-audio-continuation",
    max_refs: 0,
    max_audio_refs: 1,
    promptLabel: "text",
    params: {
      duration: {
        type: "select",
        label: "时长",
        options: [
          "5",
          "6",
          "7",
          "8",
          "9",
          "10",
          "11",
          "12",
          "13",
          "14",
          "15",
          "16",
          "17",
          "18",
          "19",
          "20",
        ],
        default: "5",
      },
    },
    audioExtension: {
      inputMinDurationSec: 1,
      inputMaxDurationSec: 20,
      outputMinDurationSec: 5,
      outputMaxDurationSec: 20,
    },
  },
  // speech-2.8 系列：当前唯一支持的版本，最高保真度
  {
    id: "speech-2.8-hd",
    name: "Speech-2.8-HD",
    seriesId: "official-speech",
    backend: BACKEND_MINIMAX_TTS,
    max_refs: 0,
    promptLabel: "text",
    promptMaxLength: 1e4,
    params: {
      voice_id: {
        type: "select",
        label: "音色",
        options: TTS_VOICE_OPTIONS,
        default: "Friendly_Person",
      },
      speed: TTS_SPEED_SLIDER,
      emotion: TTS_EMOTION_FIELD,
    },
  },
  // SeedAudio 1.0（字节 openspeech seed-audio）
  // - 参考文件：音频 ≤3（wav/mp3/pcm/ogg_opus，≤30s/≤10MB），或图片 1 张
  //   （jpeg/png/webp，≤10MB）；音频与图片不可同时 ref（popover 侧互斥）。
  // - @音频N 逻辑保持：由用户自己在 text 里写引用，前端/网关不自动注入。
  // - Speed / Volume UI 显示 0.5-2 倍，网关侧映射 (x-1)*100 后透传上游
  //   speech_rate / loudness_rate；Pitch / SampleRate 与上游直接对齐。
  {
    id: "seed-audio-1.0",
    name: "Seed Audio 1.0",
    seriesId: "seedaudio",
    backend: BACKEND_SEEDAUDIO,
    model_name: "seed-audio-1.0",
    max_refs: 1,
    // 参考图最多 1 张
    max_audio_refs: 3,
    // 参考音频最多 3 条
    promptLabel: "text",
    promptMaxLength: 3e3,
    params: {
      speed: SEEDAUDIO_SPEED_SLIDER,
      volume: SEEDAUDIO_VOLUME_SLIDER,
      pitch: SEEDAUDIO_PITCH_SLIDER,
      sample_rate: SEEDAUDIO_SAMPLE_RATE_FIELD,
    },
  },
  // MiniMax Music
  // Proto carries `model` + `is_instrumental`; local gateway forwards both and
  // Go provider reads them. is_instrumental=true skips lyrics and generates a
  // vocal-free track.
  {
    id: "music-3.0",
    name: "Music-3.0",
    seriesId: "official-music",
    backend: BACKEND_MINIMAX_MUSIC,
    model_name: "music-3.0",
    max_refs: 0,
    promptMaxLength: 2e3,
    params: {
      is_instrumental: {
        type: "select",
        label: "canvas.params.musicMode",
        options: ["vocal", "instrumental"],
        default: "vocal",
      },
      lyrics: {
        type: "textarea",
        label: "歌词",
        placeholder: "输入歌词,不填则使用上方描述作为歌词",
        default: "",
      },
    },
  },
  // ElevenLabs Music v2 — prompt-only song generation.
  {
    id: "elevenlabs-music-v2",
    name: "ElevenLabs Music v2",
    seriesId: "elevenlabs-music",
    backend: BACKEND_ELEVENLABS_MUSIC,
    model_name: "music_v2",
    max_refs: 0,
    promptLabel: "musicStyle",
    promptMaxLength: 2e3,
    params: {
      music_length_ms: {
        type: "select",
        label: "canvas.params.duration",
        options: ["auto", "30s", "1m", "2m", "4m", "6m", "custom"],
        default: "auto",
      },
      is_instrumental: {
        type: "select",
        label: "canvas.params.musicMode",
        options: ["auto", "instrumental"],
        default: "auto",
      },
    },
  },
];
export const HILO_SOURCE_HEADER = "x-hilo-source";
export const PROJECT_NAME_MAX_CHARS = 50;
export function truncateProjectName(name2, maxChars = PROJECT_NAME_MAX_CHARS) {
  const trimmed = name2?.trim() ?? "";
  if (!trimmed) return "";
  const chars2 = [...trimmed];
  return chars2.length > maxChars ? chars2.slice(0, maxChars).join("").trim() : trimmed;
}
export function normalizeSkillContentLocale(value) {
  return typeof value === "string" && value.toLowerCase().startsWith("en") ? "en-US" : "zh-CN";
}
export function selectSkillStructuredInfo(info2, preferredLocale) {
  const preferred = normalizeSkillContentLocale(preferredLocale);
  const locale = info2?.[preferred]
    ? preferred
    : info2?.["zh-CN"]
      ? "zh-CN"
      : info2?.["en-US"]
        ? "en-US"
        : preferred;
  return {
    locale,
    info: info2?.[locale] ?? {
      summary: "",
      best_for: [],
      how_to_use: "",
      outputs: "",
    },
  };
}
const SKILL_GUIDE_PROMPT_DEFAULTS = {
  zh: "为我解释一下这个技能的最佳使用方式。",
  en: "Show me the best way to use this skill with a few examples.",
};
const SKILL_NAME_RE = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/;
export function isValidSkillName$1(name2) {
  return SKILL_NAME_RE.test(name2);
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
function normalizeToolsByAgent(raw2) {
  if (!raw2 || typeof raw2 !== "object" || Array.isArray(raw2)) return void 0;
  const out = {};
  for (const [agentName, value] of Object.entries(raw2)) {
    if (!Array.isArray(value)) continue;
    const tools = value.filter((v2) => typeof v2 === "string" && v2.length > 0);
    if (tools.length > 0) out[agentName] = tools;
  }
  return Object.keys(out).length > 0 ? out : void 0;
}
function toStringArray(v2) {
  if (Array.isArray(v2)) return v2.filter((x2) => typeof x2 === "string" && x2 !== "");
  if (typeof v2 === "string" && v2) return [v2];
  return [];
}
function firstString$1(v2) {
  if (Array.isArray(v2)) {
    const first2 = v2.find((x2) => typeof x2 === "string" && x2 !== "");
    return first2 ?? "";
  }
  if (typeof v2 === "string") return v2;
  return "";
}
function reconcileTag(tagRaw, completeRaw) {
  const complete = toStringArray(completeRaw);
  const single = firstString$1(tagRaw) || complete[0] || "";
  if (complete.length > 0) {
    return {
      single,
      list: complete,
    };
  }
  const list2 = toStringArray(tagRaw);
  return {
    single,
    list: list2,
  };
}
function mapCloudSkillToMarketSkillInfo(raw2) {
  const en2 = reconcileTag(
    raw2.tagEn ?? raw2.tag_en ?? raw2["tag-en"],
    raw2.completeTagsEn ?? raw2.complete_tags_en ?? raw2["complete-tags-en"],
  );
  const cn2 = reconcileTag(
    raw2.tagCn ?? raw2.tag_cn ?? raw2["tag-cn"],
    raw2.completeTagsCn ?? raw2.complete_tags_cn ?? raw2["complete-tags-cn"],
  );
  return {
    ...normalizeSkillDetailMetadata(raw2),
    name: raw2.name || "",
    version: raw2.version || "",
    hash: raw2.hash || "",
    summary: raw2.summary || raw2.summary_en || "",
    summaryZh: raw2.summaryZh || raw2.summary_zh || raw2.summary_cn || "",
    description: raw2.description || "",
    tags: raw2.tags || [],
    tagsCn: raw2.tagsCn || raw2.tags_cn || raw2["tags-cn"] || [],
    creator: raw2.creator || "",
    triggerWords: raw2.triggerWords || raw2.trigger_words || [],
    guidePrompt: raw2.guidePrompt || raw2.guide_prompt || SKILL_GUIDE_PROMPT_DEFAULTS.zh,
    guidePromptEn: raw2.guidePromptEn || raw2.guide_prompt_en || SKILL_GUIDE_PROMPT_DEFAULTS.en,
    displayNameZh: raw2.displayNameZh || raw2.display_name_zh || "",
    tagEn: en2.single,
    tagCn: cn2.single,
    completeTagsEn: en2.list,
    completeTagsCn: cn2.list,
    categoryCodes: toStringArray(raw2.categoryCodes ?? raw2.category_codes),
    descEn: raw2.descEn || raw2.desc_en || raw2["desc-en"] || "",
    descCn: raw2.descCn || raw2.desc_cn || raw2["desc-cn"] || "",
    tools: raw2.tools || [],
    toolsByAgent: normalizeToolsByAgent(
      raw2.toolsByAgent ?? raw2.tools_by_agent ?? raw2["tools-by-agent"],
    ),
    skillType: raw2.skillType || raw2.skill_type || void 0,
    badges: Array.isArray(raw2.badges)
      ? raw2.badges
      : typeof raw2.badges === "string"
        ? JSON.parse(raw2.badges)
        : void 0,
    sortWeight:
      raw2.sortWeight != null
        ? Number(raw2.sortWeight)
        : raw2.sort_weight != null
          ? Number(raw2.sort_weight)
          : void 0,
    downloads: raw2.downloads != null ? Number(raw2.downloads) : void 0,
    coverUrl: raw2.coverUrl || raw2.cover_url || raw2.cover || void 0,
    authorEn: raw2.authorEn || raw2.author_en || raw2["author-en"] || void 0,
    authorCn: raw2.authorCn || raw2.author_cn || raw2["author-cn"] || void 0,
    source: raw2.source || void 0,
  };
}
const SKILL_MEDIA_HOSTS = new Set(["cdn.hailuoai.com", "cdn.hailuoai.video"]);
const SKILL_SUBMISSION_MEDIA_HOST =
  /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]\.oss-[a-z0-9-]+\.aliyuncs\.com$/;
const SKILL_SUBMISSION_SHOWCASE_PATH =
  /^\/creator-plan\/[1-9]\d*\/[A-Za-z0-9._-]+\/showcase-\d+\.(mp4|webm|mov)$/;
export function isSkillShowcaseUrl(value) {
  if (typeof value !== "string") return false;
  try {
    const url2 = new URL(value);
    if (url2.protocol !== "https:" || url2.username || url2.password || url2.port) return false;
    return (
      (SKILL_MEDIA_HOSTS.has(url2.hostname) &&
        /\.(mp4|webm|mov|gif|png|jpe?g|webp|jfif)$/i.test(url2.pathname)) ||
      (SKILL_SUBMISSION_MEDIA_HOST.test(url2.hostname) &&
        !url2.hostname.includes("-internal.") &&
        SKILL_SUBMISSION_SHOWCASE_PATH.test(decodeURIComponent(url2.pathname)))
    );
  } catch {
    return false;
  }
}
export function normalizePublicSkillShowcaseUrl(value) {
  if (!isSkillShowcaseUrl(value)) return void 0;
  const url2 = new URL(value);
  if (!/\.(mp4|webm|mov)$/i.test(url2.pathname)) return void 0;
  if (SKILL_SUBMISSION_MEDIA_HOST.test(url2.hostname)) {
    url2.pathname = decodeURIComponent(url2.pathname);
  }
  url2.search = "";
  url2.hash = "";
  return url2.href;
}
function skillMetadataRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : void 0;
}
export function normalizeSkillDetailMetadata(raw2) {
  const result = {};
  if (Array.isArray(raw2.showcase)) {
    const media = [...new Set(raw2.showcase.filter(isSkillShowcaseUrl))];
    result.showcase = media;
  } else {
    const media = [raw2.showcase, raw2.showcaseUrl, raw2.showcase_url].find(isSkillShowcaseUrl);
    if (media) result.showcase = [media];
  }
  const localized = skillMetadataRecord(
    raw2.structuredInfo ?? raw2.structured_info ?? raw2["structured-info"],
  );
  const legacyBest = raw2.bestFor ?? raw2.best_for ?? raw2["best-for"];
  const legacyHow = raw2.howToUse ?? raw2.how_to_use ?? raw2["how-to-use"];
  const hasLegacyDetails = [
    "bestFor",
    "best_for",
    "best-for",
    "howToUse",
    "how_to_use",
    "how-to-use",
    "outputs",
  ].some((key2) => Object.hasOwn(raw2, key2));
  const legacyLocale = normalizeSkillContentLocale(
    raw2.contentLocale ?? raw2.content_locale ?? raw2["content-locale"],
  );
  const info2 = {};
  for (const locale of ["zh-CN", "en-US"]) {
    const legacySummary = (
      locale === "zh-CN"
        ? [raw2.summaryZh, raw2.summary_zh, raw2.summary_cn, raw2["summary-cn"], raw2.summary]
        : [raw2.summary, raw2.summary_en, raw2["summary-en"]]
    ).find((value) => typeof value === "string" && value.trim());
    const entry =
      skillMetadataRecord(localized?.[locale]) ??
      (!localized && hasLegacyDetails && locale === legacyLocale
        ? {
            summary: legacySummary,
            best_for: legacyBest,
            how_to_use: legacyHow,
            outputs: raw2.outputs,
          }
        : void 0);
    if (!entry) continue;
    const summary = typeof entry.summary === "string" ? entry.summary.trim() : "";
    const how = entry.how_to_use ?? entry["how-to-use"];
    const best = entry.best_for ?? entry["best-for"];
    info2[locale] = {
      summary,
      best_for: Array.isArray(best)
        ? best.filter((v2) => typeof v2 === "string" && !!v2.trim()).map((v2) => v2.trim())
        : [],
      how_to_use: typeof how === "string" ? how.trim() : "",
      outputs: typeof entry.outputs === "string" ? entry.outputs.trim() : "",
    };
  }
  if (localized || Object.keys(info2).length) result.structuredInfo = info2;
  return result;
}
export function mapCloudSkillDetail(raw2) {
  const record2 = skillMetadataRecord(raw2);
  if (!record2) throw new Error("Invalid skill detail response");
  const skill = skillMetadataRecord(record2.skill);
  return {
    skill: skill && typeof skill.name === "string" ? mapCloudSkillToMarketSkillInfo(skill) : void 0,
    canSubmitToCommunity:
      (record2.canSubmitToCommunity ?? record2.can_submit_to_community) === true,
  };
}
export const UPDATE_DISMISS_REMINDER_MS = 2 * 60 * 60 * 1e3;
export function resolveNotification(input) {
  const { state: state2, userTriggered } = input;
  const dismissed = input.dismissed ?? state2.dismissed;
  const currentTime = input.now ?? Date.now();
  const dismissedAt = state2.dismissedAt ?? 0;
  const dismissExpired =
    dismissed && dismissedAt > 0 && currentTime - dismissedAt > UPDATE_DISMISS_REMINDER_MS;
  if (state2.forced)
    return {
      type: "forced-modal",
    };
  if (state2.startupOwnershipUnverified && !state2.targetVersion && !userTriggered) {
    return {
      type: "silent",
    };
  }
  if (state2.manualOnly && state2.phase === "error") {
    return dismissed
      ? {
          type: "sidebar-only",
        }
      : {
          type: "banner",
        };
  }
  if (state2.phase === "idle" || state2.phase === "checking")
    return {
      type: "silent",
    };
  if (state2.phase === "downloaded") {
    if (dismissExpired)
      return {
        type: "banner",
      };
    return dismissed
      ? {
          type: "sidebar-only",
        }
      : {
          type: "banner",
        };
  }
  if (state2.phase === "downloading") {
    return dismissed
      ? {
          type: "sidebar-only",
        }
      : {
          type: "banner",
        };
  }
  if (state2.phase === "available") {
    if (dismissExpired)
      return {
        type: "banner",
      };
    if (dismissed)
      return {
        type: "sidebar-only",
      };
    return {
      type: "banner",
    };
  }
  if (state2.phase === "error") {
    if (state2.targetVersion && compareSemver(state2.targetVersion, state2.currentVersion) > 0) {
      return dismissed
        ? {
            type: "sidebar-only",
          }
        : {
            type: "banner",
          };
    }
    return userTriggered
      ? {
          type: "banner",
        }
      : {
          type: "sidebar-only",
        };
  }
  return {
    type: "silent",
  };
}
