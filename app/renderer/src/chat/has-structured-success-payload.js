// has-structured-success-payload.js
import { configuredLabelIds } from "../settings/request-prompt-prefill.jsx";
import { getBuiltInToolLabelId } from "../media-editing/tool-name-to-label-id.js";
import {
  GENERATE_ERROR_CODE_IMAGE_ASPECT_RATIO_CONFLICT,
  getFileActivityKind,
} from "../vendor.js";
import { TOOL_ABORTED_BY_USER_TEXT } from "../canvas/diagnostic-history-tools.js";
import {
  ErrorCodes,
  GENERATE_ERROR_CODE_BILLING_INSUFFICIENT_BALANCE,
  GENERATE_ERROR_CODE_CONCURRENCY_LIMIT,
  GENERATE_ERROR_CODE_CONTENT_POLICY_VIOLATION,
  GENERATE_ERROR_CODE_NETWORK_CONNECT_TIMEOUT,
  GENERATE_ERROR_CODE_NETWORK_ERROR,
  GENERATE_ERROR_CODE_SHUTDOWN,
} from "../generation/normalize-skill-detail-metadata.js";
const GENERATE_ERROR_CODE_PRE_SUBMIT_SHUTDOWN = "pre_submit_shutdown";
const GENERATE_ERROR_CODE_STORAGE_FULL = "storage_full";
const GENERATE_ERROR_CODE_QUEUE_PAUSED = "queue_paused";
function getConfiguredToolLabelId(toolName2) {
  return configuredLabelIds.find(({ patterns }) =>
    patterns.some((pattern) => pattern.test(toolName2)),
  )?.label;
}
export function getToolLabelId(toolName2) {
  if (!toolName2) return "silent";
  const builtIn = getBuiltInToolLabelId(toolName2);
  if (builtIn) return builtIn;
  return getConfiguredToolLabelId(toolName2) ?? "silent";
}
export function resolveMediaTaskCategory(tool2) {
  if (
    tool2 === "hub_generate_image" ||
    tool2 === "hub_image_remove_background" ||
    tool2 === "hub_image_enhance" ||
    tool2 === "hub_image_layer_decompose"
  ) {
    return "imageGen";
  }
  if (tool2 === "hub_generate_video") {
    return "videoGen";
  }
  if (tool2 === "hub_merge_videos" || tool2 === "hub_batch_lip_sync") {
    return "videoEdit";
  }
  if (
    tool2 === "hub_generate_audio_music" ||
    tool2 === "hub_music_cover" ||
    tool2 === "hub_lyrics_generation"
  ) {
    return "musicGen";
  }
  if (tool2 === "hub_generate_audio_speech" || tool2 === "hub_voice_prepare") {
    return "audioGen";
  }
  return "other";
}
function stripDisplayOnlyToolResultNotes(text2) {
  return text2
    .split(/\r?\n/)
    .filter((line) => !/^\s*\[User Override\]/i.test(line))
    .filter((line) => !/^\s*User manually modified:/i.test(line))
    .join("\n")
    .trim();
}
function hasStructuredSuccessPayload(candidate) {
  try {
    const parsed = JSON.parse(candidate);
    if (Array.isArray(parsed)) return parsed.length > 0;
    if (!parsed || typeof parsed !== "object") return false;
    const record2 = parsed;
    if (record2.ok === true || record2.success === true) return true;
    if (typeof record2.succeeded === "number" && record2.succeeded > 0)
      return true;
    if (typeof record2.path === "string" && record2.path.length > 0)
      return true;
    if (
      Array.isArray(record2.paths) &&
      record2.paths.some((p3) => typeof p3 === "string")
    ) {
      return true;
    }
    if (Array.isArray(record2.results)) {
      return record2.results.some((item) => {
        if (!item || typeof item !== "object") return false;
        const result = item;
        if (result.ok === true) return true;
        if (typeof result.path === "string" && result.path.length > 0)
          return true;
        return (
          Array.isArray(result.paths) &&
          result.paths.some((p3) => typeof p3 === "string")
        );
      });
    }
    return (
      typeof record2.lyrics === "string" ||
      typeof record2.voice_id === "string" ||
      typeof record2.cover_feature_id === "string"
    );
  } catch {
    return false;
  }
}
export function normalizeJsonToolResult(text2) {
  const trimmed = text2.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return trimmed;
  const colonIndex = trimmed.indexOf(":");
  const embeddedStart = trimmed.search(/[[{]/);
  if (embeddedStart >= 0) {
    const embedded = trimmed.slice(embeddedStart).trim();
    if (hasStructuredSuccessPayload(embedded)) return embedded;
  }
  if (colonIndex < 0) return trimmed;
  const suffix = trimmed.slice(colonIndex + 1).trim();
  if (suffix.startsWith("{") || suffix.startsWith("[")) return suffix;
  return trimmed;
}
export function extractMediaCount(toolResult) {
  if (!toolResult) return 0;
  const displayResult = normalizeJsonToolResult(
    stripDisplayOnlyToolResultNotes(toolResult),
  );
  if (!displayResult) return 0;
  try {
    const parsed = JSON.parse(displayResult);
    if (typeof parsed?.succeeded === "number") return parsed.succeeded;
    if (Array.isArray(parsed?.results) && parsed.results.length > 0) {
      const okCount = parsed.results.filter((r2) => r2.ok === true).length;
      if (okCount > 0) return okCount;
      return parsed.results.filter((r2) => r2.paths != null).length;
    }
    if (Array.isArray(parsed?.paths) && parsed.paths.length > 0) {
      return parsed.paths.filter(
        (p3) => typeof p3 === "string" && !p3.startsWith("["),
      ).length;
    }
    if (typeof parsed?.path === "string" && parsed.path.length > 0) return 1;
    if (typeof parsed?.lyrics === "string" && parsed.lyrics.trim().length > 0)
      return 1;
    if (
      typeof parsed?.voice_id === "string" &&
      parsed.voice_id.trim().length > 0
    )
      return 1;
    if (
      typeof parsed?.cover_feature_id === "string" &&
      parsed.cover_feature_id.trim().length > 0
    )
      return 1;
  } catch {}
  return 0;
}
export function hasSuccessfulMediaOutput(toolResult) {
  return extractMediaCount(toolResult) > 0;
}
const GENERATION_FAILURE_PRESENTATIONS = new Set([
  "terminal",
  "recoverable",
  "status_unknown",
  "cancelled",
]);
function asGenerationFailurePresentation(value) {
  return typeof value === "string" &&
    GENERATION_FAILURE_PRESENTATIONS.has(value)
    ? value
    : void 0;
}
export function generationFailurePresentation(toolResult) {
  if (!toolResult) return void 0;
  const displayResult = normalizeJsonToolResult(
    stripDisplayOnlyToolResultNotes(toolResult),
  );
  if (!displayResult) return void 0;
  try {
    const parsed = JSON.parse(displayResult);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      return void 0;
    const record2 = parsed;
    const direct = asGenerationFailurePresentation(
      record2.failure_presentation,
    );
    if (direct) return direct;
    if (!Array.isArray(record2.results)) return void 0;
    const failures = record2.results.filter(
      (item) =>
        !!item &&
        typeof item === "object" &&
        !Array.isArray(item) &&
        item.ok === false,
    );
    if (failures.length === 0) return void 0;
    const presentations = failures
      .map((item) => asGenerationFailurePresentation(item.failure_presentation))
      .filter((item) => !!item);
    if (presentations.includes("recoverable")) return "recoverable";
    if (presentations.includes("status_unknown")) return "status_unknown";
    if (presentations.length === failures.length) {
      return presentations.every((item) => item === "cancelled")
        ? "cancelled"
        : "terminal";
    }
  } catch {}
  return void 0;
}
export function isGenerationFailureNonTerminal(toolResult) {
  const presentation = generationFailurePresentation(toolResult);
  return presentation === "recoverable";
}
export function isToolCancelInterrupted(toolResult) {
  return !!toolResult && toolResult.includes("interrupted before completion");
}
export function isToolRecoveredInterrupted(toolResult) {
  if (!toolResult || !isToolCancelInterrupted(toolResult)) return false;
  return /\brecovered\b/i.test(toolResult);
}
export function resolveToolInterruption(toolResult, interruption) {
  if (interruption) return interruption;
  return toolResult?.includes(TOOL_ABORTED_BY_USER_TEXT) ? "aborted" : void 0;
}
export const GENERATION_ERROR_CODE_I18N = {
  [GENERATE_ERROR_CODE_BILLING_INSUFFICIENT_BALANCE]:
    "chat.billingInsufficient.title",
  [GENERATE_ERROR_CODE_CONCURRENCY_LIMIT]: "canvas.errors.concurrency",
  [GENERATE_ERROR_CODE_IMAGE_ASPECT_RATIO_CONFLICT]:
    "chat.errors.aspectRatioConflict",
  [GENERATE_ERROR_CODE_NETWORK_CONNECT_TIMEOUT]: "chat.errors.networkTimeout",
  [GENERATE_ERROR_CODE_CONTENT_POLICY_VIOLATION]: "chat.errors.contentBlocked",
  timeout: "canvas.errors.timeout",
  unavailable: "chat.generationFailure.serviceUnavailable",
  [GENERATE_ERROR_CODE_SHUTDOWN]: "chat.generationFailure.serviceShuttingDown",
  [GENERATE_ERROR_CODE_PRE_SUBMIT_SHUTDOWN]:
    "chat.generationFailure.requestNotSubmitted",
  [GENERATE_ERROR_CODE_NETWORK_ERROR]: "chat.errors.networkUnavailable",
  [GENERATE_ERROR_CODE_STORAGE_FULL]: "chat.errors.storageFull",
  [GENERATE_ERROR_CODE_QUEUE_PAUSED]: "chat.generationFailure.queuePaused",
  [ErrorCodes.WORKSPACE_CONCURRENCY_LIMIT_REACHED.toLowerCase()]:
    "chat.errors.workspaceConcurrencyLimit",
};
export const GENERATION_FAILURE_ERROR_CODES = Object.freeze(
  Object.keys(GENERATION_ERROR_CODE_I18N),
);
export function artifactAssetTypeFromPath(path2, fallback = "file") {
  const clean = path2.split(/[?#]/)[0] ?? path2;
  if (/\.(png|jpe?g|gif|webp|bmp|svg|ico|tiff?)$/i.test(clean)) return "image";
  if (/\.(mp4|mov|webm|avi|mkv|m4v)$/i.test(clean)) return "video";
  if (/\.(mp3|wav|m4a|aac|ogg|flac|aiff?)$/i.test(clean)) return "audio";
  if (/\.[^/.?#]+$/.test(clean)) return "file";
  return fallback;
}
const IMAGE_EXT = /\.(png|jpe?g|gif|webp|bmp|svg|ico|tiff?)$/i;
const VIDEO_EXT = /\.(mp4|mov|webm|avi|mkv|m4v)$/i;
const AUDIO_EXT = /\.(mp3|wav|m4a|aac|ogg|flac|aiff?)$/i;
const TEXT_EXT = /\.(md|markdown|json|ya?ml|toml|txt|log|csv|tsv)$/i;
export function inferFileKind(nameOrPath) {
  if (IMAGE_EXT.test(nameOrPath)) return "image";
  if (VIDEO_EXT.test(nameOrPath)) return "video";
  if (AUDIO_EXT.test(nameOrPath)) return "audio";
  if (TEXT_EXT.test(nameOrPath)) return "text";
  return "file";
}
export const KNOWLEDGE_PATH_RE =
  /[/\\]\.(?:opencode-v2|config-v2)[/\\]((?:knowledge|contracts|workflows)[/\\].+)/;
const LABEL_TO_CATEGORY = {
  fileOp: "read",
  searchInfo: "search",
  connectorOp: "connector",
  canvasOp: "canvas",
  planOp: "plan",
  mediaGen: "imageGen",
  // placeholder — refined by resolveMediaTaskCategory below
  contentProcess: "process",
  browser: "other",
  askUser: "other",
  spawnSubtask: "other",
  skillOp: "skillOp",
  transient: "other",
  silent: "other",
};
function refineCategory(toolName2, base2) {
  if (base2 === "imageGen") {
    const media = resolveMediaTaskCategory(toolName2);
    return media === "other" ? "other" : media;
  }
  if (base2 !== "read") return base2;
  if (toolName2 === "bash") return "execute";
  return getFileActivityKind(toolName2) ?? "read";
}
export function categorizeToolAction(toolName2) {
  const labelId = getToolLabelId(toolName2);
  return refineCategory(toolName2, LABEL_TO_CATEGORY[labelId]);
}
