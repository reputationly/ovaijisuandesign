// to-workspace-browser-url.js
import {
  DEFAULT_VIDEO_PLAYBACK_MAX_HEIGHT,
  HILO_WORKSPACE_GENERATION_QUERY,
  HILO_WORKSPACE_IDENTITY_QUERY,
  HILO_WORKSPACE_INSTANCE_QUERY,
  LIBTV_CONNECTOR,
  PERF_CANVAS_PERSIST_HTTP_ROUNDTRIP,
  PERF_LOG_FLUSH,
  videoPlaybackPath,
} from "../vendor.js";
import {
  normalizeLegacyModelId,
  registrySelectionRowIds,
} from "./normalize-skill-detail-metadata.js";
import { IMAGE_MODELS } from "./image-models.js";
const ENHANCE_IMAGE_INPUT_SHORT_MIN = 256;
const ENHANCE_IMAGE_INPUT_LONG_MAX = 2048;
const ENHANCE_IMAGE_INPUT_LONG_HARD_MAX = 3072;
const ENHANCE_IMAGE_INPUT_MAX_ASPECT =
  ENHANCE_IMAGE_INPUT_LONG_MAX / ENHANCE_IMAGE_INPUT_SHORT_MIN;
function longEdge(width, height) {
  if (!width || !height || width <= 0 || height <= 0) return void 0;
  return Math.max(width, height);
}
function shortEdge(width, height) {
  if (!width || !height || width <= 0 || height <= 0) return void 0;
  return Math.min(width, height);
}
function computeEnhanceImageInputPrep(width, height) {
  const long = longEdge(width, height);
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
  WalletSource2[(WalletSource2["WALLET_SOURCE_HILO"] = 0)] =
    "WALLET_SOURCE_HILO";
  WalletSource2[(WalletSource2["WALLET_SOURCE_OP"] = 1)] = "WALLET_SOURCE_OP";
  WalletSource2[(WalletSource2["UNRECOGNIZED"] = -1)] = "UNRECOGNIZED";
  return WalletSource2;
})(WalletSource || {});
export var CreditType = ((CreditType2) => {
  CreditType2[(CreditType2["CREDIT_TYPE_TOP_UP"] = 0)] = "CREDIT_TYPE_TOP_UP";
  CreditType2[(CreditType2["CREDIT_TYPE_MEMBERSHIP"] = 1)] =
    "CREDIT_TYPE_MEMBERSHIP";
  CreditType2[(CreditType2["CREDIT_TYPE_BONUS"] = 2)] = "CREDIT_TYPE_BONUS";
  CreditType2[(CreditType2["CREDIT_TYPE_DEFAULT"] = 3)] = "CREDIT_TYPE_DEFAULT";
  CreditType2[(CreditType2["CREDIT_TYPE_CREATOR"] = 4)] = "CREDIT_TYPE_CREATOR";
  CreditType2[(CreditType2["CREDIT_TYPE_ACTIVITY"] = 5)] =
    "CREDIT_TYPE_ACTIVITY";
  CreditType2[(CreditType2["CREDIT_TYPE_LOGIN"] = 6)] = "CREDIT_TYPE_LOGIN";
  CreditType2[(CreditType2["CREDIT_TYPE_TRANSFER"] = 7)] =
    "CREDIT_TYPE_TRANSFER";
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
const WORKSPACE_IDENTITY_HEX_PATTERN = /^[a-f0-9]{64}$/;
const WORKSPACE_INSTANCE_ID_PATTERN =
  /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const WORKSPACE_IDENTITY_HOST_SUFFIX = ".hilo.localhost";
const WORKSPACE_IDENTITY_HOST_TOKEN_LENGTH = 50;
const BROWSER_LOOPBACK_HOSTS = new Set([
  "127.0.0.1",
  "localhost",
  "[::1]",
  "::1",
]);
export const CANVAS_DESTRUCTIVE_SAVE_REJECTED_CODE =
  "CANVAS_DESTRUCTIVE_SAVE_REJECTED";
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
  if (
    generation !== void 0 &&
    (!Number.isSafeInteger(generation) || generation < 1)
  ) {
    return void 0;
  }
  const generationToken = generation === void 0 ? "" : `-g${generation}`;
  return `wi-${normalized.replaceAll("-", "")}${generationToken}${WORKSPACE_IDENTITY_HOST_SUFFIX}`;
}
export function toWorkspaceBrowserUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    const hostname = parsed.hostname.toLowerCase();
    const workspaceClaim = parsed.searchParams.get(
      HILO_WORKSPACE_IDENTITY_QUERY,
    );
    const workspaceInstanceId = parsed.searchParams.get(
      HILO_WORKSPACE_INSTANCE_QUERY,
    );
    const rawWorkspaceGeneration = parsed.searchParams.get(
      HILO_WORKSPACE_GENERATION_QUERY,
    );
    const workspaceGeneration =
      rawWorkspaceGeneration === null ? void 0 : Number(rawWorkspaceGeneration);
    if (!BROWSER_LOOPBACK_HOSTS.has(hostname) || !workspaceClaim) return rawUrl;
    if (
      rawWorkspaceGeneration !== null &&
      (!Number.isSafeInteger(workspaceGeneration) ||
        (workspaceGeneration ?? 0) < 1)
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
export function resolveVideoPlaybackUrl(
  sourceUrl,
  maxHeight = DEFAULT_VIDEO_PLAYBACK_MAX_HEIGHT,
) {
  try {
    const isAbsolute = /^[a-z][a-z\d+.-]*:/i.test(sourceUrl);
    const parsed = new URL(sourceUrl, "http://hilo.local");
    if (!parsed.pathname.startsWith("/files/")) return sourceUrl;
    if (
      isAbsolute &&
      (parsed.protocol !== "http:" ||
        !LOCAL_GATEWAY_HOSTNAMES.has(parsed.hostname.toLowerCase()))
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
export const FILE_ADOPTION_IDEMPOTENCY_HEADER = "idempotency-key";
export const UPLOAD_COMMIT_SAFE_PUBLISH_UNSUPPORTED =
  "UPLOAD_COMMIT_SAFE_PUBLISH_UNSUPPORTED";
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
  const enabled =
    typeof candidate.enabled === "boolean" ? candidate.enabled : true;
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
export function resolveImageGenerationEstimateSeconds(backend, modelIdRaw) {
  if (!backend || !modelIdRaw) return void 0;
  const modelId = normalizeLegacyModelId(modelIdRaw);
  return IMAGE_MODELS.find(
    (model) =>
      model.backend === backend &&
      (registrySelectionRowIds(model).includes(modelId) ||
        model.pricingId === modelId),
  )?.estimatedGenerationSeconds;
}
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
[
  ...OPENCODE_RUNTIME_SWITCHES.map(({ key: key2 }) => key2),
  OPENCODE_RUNTIME_HOME_ENV,
];
export const DELETE_UNDO_TTL_MS = 1e4;
export const OPERATIONS_UNDO_PATH = "/api/operations/undo";
export const PERF_PATCH_DELTA = "hilo:chat:patch-delta";
export const PERF_REDERIVE = "hilo:chat:rederive";
export const PERF_DERIVE_MESSAGES = "hilo:chat:derive-messages";
export const PERF_STORE_NOTIFY = "hilo:chat:store-notify";
export const PERF_CHAT_FIRST_PROGRESS = "hilo:chat:first-progress";
export const PERF_ASSET_PICKER_OPEN_FIRST_PAINT =
  "hilo:asset-picker:open-first-paint";
export const PERF_ASSET_PICKER_OPEN_INTERACTIVE =
  "hilo:asset-picker:open-interactive";
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
