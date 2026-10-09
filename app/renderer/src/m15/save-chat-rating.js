// save-chat-rating.js
import {
  GENERATE_ERROR_CODE_IMAGE_ASPECT_RATIO_CONFLICT,
  tryParseJson$1,
  isRecord$2,
  collectMediaResultRecords,
  getFileActivityKind,
} from "../vendor.js";
import { submitFeedback } from "./agent-ws-client.jsx";
import { getConfiguredToolLabelId } from "./interest-selection-provider.jsx";
import {
  ErrorCodes,
  GENERATE_ERROR_CODE_BILLING_INSUFFICIENT_BALANCE,
  GENERATE_ERROR_CODE_CONCURRENCY_LIMIT,
  GENERATE_ERROR_CODE_CONTENT_POLICY_VIOLATION,
  GENERATE_ERROR_CODE_NETWORK_CONNECT_TIMEOUT,
  GENERATE_ERROR_CODE_NETWORK_ERROR,
  GENERATE_ERROR_CODE_PRE_SUBMIT_SHUTDOWN,
  GENERATE_ERROR_CODE_QUEUE_PAUSED$3,
  GENERATE_ERROR_CODE_SHUTDOWN,
  GENERATE_ERROR_CODE_STORAGE_FULL,
} from "./push-inline.js";
import { TOOL_NAME_TO_LABEL_ID } from "./qo.jsx";
import {
  CHAT_MODEL_TRACES_PATH,
  TOOL_ABORTED_BY_USER_TEXT,
  mapChatModelTraceLookup,
} from "./relayout-group-children.js";
const PREFIX_RULES = [
  [/^apify_/iu, "connectorOp"],
  [/^fastmoss(?:-mcp)?_/iu, "connectorOp"],
  [/^shopify(?:-mcp)?_/iu, "connectorOp"],
  [/^hub_plugin_agent_/, "canvasOp"],
  [/^hub_skill_/, "skillOp"],
  [/^hub_asset_center_/, "searchInfo"],
  [/^hub_preview_/, "askUser"],
];
export function getToolLabelId(toolName2) {
  if (!toolName2) return "silent";
  const builtIn = getBuiltInToolLabelId(toolName2);
  if (builtIn) return builtIn;
  return getConfiguredToolLabelId(toolName2) ?? "silent";
}
export function getBuiltInToolLabelId(toolName2) {
  const exact = Object.hasOwn(TOOL_NAME_TO_LABEL_ID, toolName2)
    ? TOOL_NAME_TO_LABEL_ID[toolName2]
    : void 0;
  if (exact) return exact;
  for (const [pattern, labelId] of PREFIX_RULES) {
    if (pattern.test(toolName2)) return labelId;
  }
  return void 0;
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
function hasStructuredSuccessPayload(candidate) {
  try {
    const parsed = JSON.parse(candidate);
    if (Array.isArray(parsed)) return parsed.length > 0;
    if (!parsed || typeof parsed !== "object") return false;
    const record2 = parsed;
    if (record2.ok === true || record2.success === true) return true;
    if (typeof record2.succeeded === "number" && record2.succeeded > 0) return true;
    if (typeof record2.path === "string" && record2.path.length > 0) return true;
    if (Array.isArray(record2.paths) && record2.paths.some((p3) => typeof p3 === "string")) {
      return true;
    }
    if (Array.isArray(record2.results)) {
      return record2.results.some((item) => {
        if (!item || typeof item !== "object") return false;
        const result = item;
        if (result.ok === true) return true;
        if (typeof result.path === "string" && result.path.length > 0) return true;
        return Array.isArray(result.paths) && result.paths.some((p3) => typeof p3 === "string");
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
export function extractMediaCount(toolResult) {
  if (!toolResult) return 0;
  const displayResult = normalizeJsonToolResult(stripDisplayOnlyToolResultNotes(toolResult));
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
      return parsed.paths.filter((p3) => typeof p3 === "string" && !p3.startsWith("[")).length;
    }
    if (typeof parsed?.path === "string" && parsed.path.length > 0) return 1;
    if (typeof parsed?.lyrics === "string" && parsed.lyrics.trim().length > 0) return 1;
    if (typeof parsed?.voice_id === "string" && parsed.voice_id.trim().length > 0) return 1;
    if (typeof parsed?.cover_feature_id === "string" && parsed.cover_feature_id.trim().length > 0)
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
  return typeof value === "string" && GENERATION_FAILURE_PRESENTATIONS.has(value) ? value : void 0;
}
export function generationFailurePresentation(toolResult) {
  if (!toolResult) return void 0;
  const displayResult = normalizeJsonToolResult(stripDisplayOnlyToolResultNotes(toolResult));
  if (!displayResult) return void 0;
  try {
    const parsed = JSON.parse(displayResult);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return void 0;
    const record2 = parsed;
    const direct = asGenerationFailurePresentation(record2.failure_presentation);
    if (direct) return direct;
    if (!Array.isArray(record2.results)) return void 0;
    const failures = record2.results.filter(
      (item) => !!item && typeof item === "object" && !Array.isArray(item) && item.ok === false,
    );
    if (failures.length === 0) return void 0;
    const presentations = failures
      .map((item) => asGenerationFailurePresentation(item.failure_presentation))
      .filter((item) => !!item);
    if (presentations.includes("recoverable")) return "recoverable";
    if (presentations.includes("status_unknown")) return "status_unknown";
    if (presentations.length === failures.length) {
      return presentations.every((item) => item === "cancelled") ? "cancelled" : "terminal";
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
export async function saveChatRating(fetchFeedback, target, request, isCurrentIdentity) {
  const capturedTarget = {
    ...target,
  };
  if (
    request.event.session_id !== capturedTarget.sessionId ||
    request.event.request_id !== capturedTarget.requestId
  ) {
    throw new Error("Feedback turn identity mismatch");
  }
  if (!(await isCurrentIdentity())) throw new Error("Feedback account changed");
  const modelTraces = await tryFetchModelTraces(fetchFeedback, capturedTarget);
  const saved = await submitFeedback(
    {
      source: "chat_message",
      contextType: "chat_feedback",
      description: JSON.stringify(request.event),
      context: {
        ...request.context,
        ...(modelTraces?.traces.length
          ? {
              model_traces: modelTraces.traces,
            }
          : {}),
      },
      traceId: modelTraces?.trace_id ?? void 0,
      idempotencyKey: request.event.event_id,
      locale: request.locale,
      workspaceId: capturedTarget.workspaceId,
      workspaceDir: capturedTarget.workspaceDir,
      runtimeSessionId: request.event.rating === "none" ? void 0 : capturedTarget.sessionId,
    },
    // The snapshot needs the workspace; logs run in main and the final save
    // uses the app gateway, so closing that workspace cannot abort the rating.
    {
      exportFetch: fetchFeedback,
      isCurrentIdentity,
    },
  );
  return saved.ticket_id;
}
async function tryFetchModelTraces(fetchFeedback, target) {
  try {
    const query = new URLSearchParams({
      session_id: target.sessionId,
      request_id: target.requestId,
    });
    const response = await fetchFeedback(`${CHAT_MODEL_TRACES_PATH}?${query}`, {
      method: "GET",
      timeoutMs: 3e3,
    });
    if (!response.ok) return void 0;
    const lookup = mapChatModelTraceLookup(await response.json());
    if (
      !lookup ||
      lookup.traces.some(
        (trace) => trace.session_id !== target.sessionId || trace.request_id !== target.requestId,
      )
    ) {
      return void 0;
    }
    return lookup;
  } catch {
    return void 0;
  }
}
export const GENERATION_ERROR_CODE_I18N = {
  [GENERATE_ERROR_CODE_BILLING_INSUFFICIENT_BALANCE]: "chat.billingInsufficient.title",
  [GENERATE_ERROR_CODE_CONCURRENCY_LIMIT]: "canvas.errors.concurrency",
  [GENERATE_ERROR_CODE_IMAGE_ASPECT_RATIO_CONFLICT]: "chat.errors.aspectRatioConflict",
  [GENERATE_ERROR_CODE_NETWORK_CONNECT_TIMEOUT]: "chat.errors.networkTimeout",
  [GENERATE_ERROR_CODE_CONTENT_POLICY_VIOLATION]: "chat.errors.contentBlocked",
  timeout: "canvas.errors.timeout",
  unavailable: "chat.generationFailure.serviceUnavailable",
  [GENERATE_ERROR_CODE_SHUTDOWN]: "chat.generationFailure.serviceShuttingDown",
  [GENERATE_ERROR_CODE_PRE_SUBMIT_SHUTDOWN]: "chat.generationFailure.requestNotSubmitted",
  [GENERATE_ERROR_CODE_NETWORK_ERROR]: "chat.errors.networkUnavailable",
  [GENERATE_ERROR_CODE_STORAGE_FULL]: "chat.errors.storageFull",
  [GENERATE_ERROR_CODE_QUEUE_PAUSED$3]: "chat.generationFailure.queuePaused",
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
export function isKnowledgePath(path2) {
  if (!path2) return false;
  return KNOWLEDGE_PATH_RE.test(path2);
}
function basename$2(path2) {
  if (!path2) return path2;
  const normalized = path2.replace(/\\/g, "/");
  const parts = normalized.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? normalized;
}
function extractPathFromArgs(toolArgs) {
  if (!toolArgs) return void 0;
  const parsed = tryParseJson$1(toolArgs);
  if (!isRecord$2(parsed)) return void 0;
  const obj = parsed;
  const candidate = obj.path ?? obj.file_path ?? obj.filePath;
  return typeof candidate === "string" && candidate.length > 0 ? candidate : void 0;
}
function collectStrings(value) {
  if (typeof value === "string") return value.trim() ? [value.trim()] : [];
  if (!Array.isArray(value)) return [];
  return value.filter((item) => typeof item === "string" && item.trim().length > 0);
}
function extractMediaPathsFromArgs(toolArgs) {
  if (!toolArgs) return [];
  const parsed = tryParseJson$1(toolArgs);
  if (!isRecord$2(parsed)) return [];
  return dedupePaths([
    ...collectStrings(parsed.file_paths),
    ...collectStrings(parsed.filePaths),
    ...collectStrings(parsed.paths),
    ...collectStrings(parsed.file_path),
    ...collectStrings(parsed.filePath),
    ...collectStrings(parsed.path),
  ]);
}
function toItem(path2, kind) {
  return {
    name: basename$2(path2),
    path: path2,
    kind: kind ?? inferFileKind(path2),
  };
}
function mediaTypeToKind(value) {
  if (value === "image" || value === "video" || value === "audio") return value;
  return void 0;
}
function extractMediaKindFromRecord(record2) {
  const metadata = isRecord$2(record2.metadata) ? record2.metadata : void 0;
  return mediaTypeToKind(
    record2.media_type ?? record2.type ?? metadata?.media_type ?? metadata?.type,
  );
}
function extractMediaPathFromRecord(record2) {
  const metadata = isRecord$2(record2.metadata) ? record2.metadata : void 0;
  const semantic = isRecord$2(record2.semantic) ? record2.semantic : void 0;
  const candidate =
    record2.file_path ??
    record2.filePath ??
    record2.file ??
    record2.path ??
    metadata?.file_path ??
    metadata?.filePath ??
    metadata?.file ??
    metadata?.path ??
    semantic?.file_path ??
    semantic?.filePath ??
    semantic?.file ??
    semantic?.path;
  return typeof candidate === "string" && candidate.trim().length > 0 ? candidate.trim() : void 0;
}
function extractMediaItemsFromResult(toolResult) {
  if (!toolResult) return [];
  const parsed = tryParseJson$1(toolResult.trim());
  const records = collectMediaResultRecords(parsed);
  if (records.length === 0) return [];
  return dedupe$1(
    records
      .map((record2) => {
        const path2 = extractMediaPathFromRecord(record2);
        return path2 ? toItem(path2, extractMediaKindFromRecord(record2)) : void 0;
      })
      .filter((item) => !!item),
  );
}
function extractMediaAnalysisItems(toolArgs, toolResult) {
  const resultItems = extractMediaItemsFromResult(toolResult);
  const resultItemByPath = new Map(resultItems.map((item) => [item.path, item]));
  const pathsFromArgs = extractMediaPathsFromArgs(toolArgs);
  const orderedItems = pathsFromArgs.map((path2) => resultItemByPath.get(path2) ?? toItem(path2));
  return dedupe$1([...orderedItems, ...resultItems]);
}
export function extractFileChipItems(toolName2, toolArgs, toolResult) {
  if (!toolName2) return [];
  const activityKind = getFileActivityKind(toolName2);
  if (activityKind === "read") {
    const path2 = extractPathFromArgs(toolArgs);
    return path2 ? [toItem(path2)] : [];
  }
  if (activityKind === "analyseMedia") {
    return extractMediaAnalysisItems(toolArgs, toolResult);
  }
  return [];
}
function dedupePaths(paths) {
  const seen2 = new Set();
  const result = [];
  for (const path2 of paths) {
    if (seen2.has(path2)) continue;
    seen2.add(path2);
    result.push(path2);
  }
  return result;
}
function dedupe$1(items) {
  const seen2 = new Set();
  const result = [];
  for (const item of items) {
    if (seen2.has(item.path)) continue;
    seen2.add(item.path);
    result.push(item);
  }
  return result;
}
function tryParseJson(raw2) {
  try {
    return JSON.parse(raw2);
  } catch {
    return void 0;
  }
}
const SINGLE_TERM_FIELDS = ["pattern", "query", "keyword", "q"];
export function extractSearchChips(toolName2, toolArgs, _toolResult) {
  if (!toolName2 || !toolArgs) return [];
  const parsed = tryParseJson(toolArgs);
  if (!parsed || typeof parsed !== "object") return [];
  const obj = parsed;
  const chips = [];
  if (Array.isArray(obj.queries)) {
    for (const entry of obj.queries) {
      if (typeof entry === "string") {
        const trimmed = entry.trim();
        if (trimmed) chips.push(trimmed);
      } else if (entry && typeof entry === "object") {
        const q2 = entry.query;
        if (typeof q2 === "string" && q2.trim()) chips.push(q2.trim());
      }
    }
  }
  for (const field of SINGLE_TERM_FIELDS) {
    const value = obj[field];
    if (typeof value === "string" && value.trim()) chips.push(value.trim());
  }
  return dedupe(chips);
}
function dedupe(values3) {
  const seen2 = new Set();
  const result = [];
  for (const value of values3) {
    if (seen2.has(value)) continue;
    seen2.add(value);
    result.push(value);
  }
  return result;
}
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
