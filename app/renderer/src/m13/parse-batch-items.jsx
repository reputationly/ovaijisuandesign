// parse-batch-items.jsx
import {
  jsxRuntimeExports,
  reactExports,
  useTranslation,
  useCurrentWorkspace,
  useMentionModels,
  Check,
  ChevronRight$1,
  ChevronDown,
  API_PATHS,
  useResolveMediaUrl,
  ImageOutlineIcon,
  Video,
  workspaceEvents,
  Copy,
  Crosshair,
  useAssetMeta,
  Icon,
  Popover,
  PopoverTrigger,
  CircleAlert,
  normalizeJsonToolResult,
  resolveToolInterruption,
  AudioLines,
  Clock,
  resolveMediaTaskCategory,
  ChevronLeft,
  artifactAssetTypeFromPath,
  KNOWLEDGE_PATH_RE,
  Brain,
  FileText,
  Search,
  Zap,
  SquareMousePointer,
  ClipboardList,
  Cog,
  Plug,
  isToolRecoveredInterrupted,
  hasSuccessfulMediaOutput,
  generationFailurePresentation,
  useGenerating,
  extractMediaCount,
  inferFileKind,
  useDebugFlag,
  DEBUG_FLAGS,
  isGenerationFailureNonTerminal,
  Wrench,
} from "../vendor.js";
import { cn$2, Button$1 } from "../asset-center/shared/use-browser-overlay-dialog-props.jsx";
import { SkillIcon } from "../m08/browser-inspiration-urls.jsx";
import { PopoverContent } from "../m09/use-credit-details.jsx";
import { FileChip } from "../m12/file-chip.jsx";
import { Spinner } from "../m09/use-team-transactions-feed-query.jsx";
import {
  parseToolConfirmRejectReason,
  VideoPlaceholderIcon,
  AudioPlaceholderIcon,
  TextPlaceholderIcon,
  ImagePlaceholderIcon,
  GeneratingMediaArea,
} from "../m01/generating-media-area.jsx";
import { Progress } from "../m09/batch-remove-members-dialog.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  ArtifactAssetCard,
  MediaGenCardLayout,
  TagsRow,
  ToolConfirmCard,
  generationFailureDisplayText,
  resolveArtifactUrl,
} from "./domestic-param-labels.jsx";
import {
  CapabilitySearchCard,
  ExpandableText,
  parseCapabilitySearchCardResult,
  summarizeTimelineEntries,
  useProductionPlanDisclosure,
} from "./expandable-text.jsx";
import { getToolDisplayLabel, isTransientTool } from "./media-model-selector.jsx";
import {
  redactForCurrentRegion,
  resolveModelNameForCurrentRegion,
} from "./resolve-chat-file-reference.js";
import { dispatchCanvasLocate } from "./use-chat-file-reference-action.jsx";
import {
  formatArgs,
  getToolStatusLabel,
  isHiddenVideoGenerationMode,
  parseToolResult,
  registryMediaTypeForCategory,
  resolveVideoModeValueDisplay,
} from "./use-chat-rating.js";
export function TurnArtifactStrip({ artifacts }) {
  const resolveUrl = useResolveMediaUrl();
  const { t: t2 } = useTranslation();
  const [expanded, setExpanded] = reactExports.useState(false);
  if (artifacts.length === 0) return null;
  return (
    <div
      data-action-ui-id="chat-turn-artifacts"
      className="@container/turn-artifacts flex min-w-0 flex-col gap-1.5"
    >
      <button
        type="button"
        data-action-ui-id="chat-turn-artifacts-toggle"
        className="flex w-full items-center gap-1.5 text-left text-body-13 text-muted-foreground transition-colors hover:text-foreground"
        aria-expanded={expanded}
        onClick={() => setExpanded((value) => !value)}
      >
        <ChevronDown
          className={cn$2("size-3.5 transition-transform", expanded ? "rotate-0" : "-rotate-90")}
          strokeWidth={1.5}
          aria-hidden="true"
        />
        <span>
          {t2("chat.turnArtifacts", {
            count: artifacts.length,
          })}
        </span>
      </button>
      {expanded && (
        <div
          data-action-ui-id="chat-turn-artifact-list"
          className="grid grid-cols-1 gap-1.5 @min-[350px]/turn-artifacts:grid-cols-2"
        >
          {artifacts.map((a2) => {
            const src = resolveArtifactUrl(a2.url, resolveUrl);
            if (!src) return null;
            return <ArtifactAssetCard key={a2.path} artifact={a2} src={src} size="chip" />;
          })}
        </div>
      )}
    </div>
  );
}
function matchKnowledgePath(path2) {
  if (!path2) return void 0;
  const match2 = path2.match(KNOWLEDGE_PATH_RE);
  if (!match2) return void 0;
  return {
    short: match2[1].replace(/\\/g, "/"),
    full: path2.replace(/\\/g, "/"),
  };
}
const HTTP_URL_RE$1 = /^https?:\/\//i;
const WINDOWS_ABSOLUTE_PATH_RE$1 = /^[a-zA-Z]:[\\/]/;
const WINDOWS_UNC_PATH_RE$1 = /^\\\\/;
function isWindowsPath(path2) {
  return WINDOWS_ABSOLUTE_PATH_RE$1.test(path2) || WINDOWS_UNC_PATH_RE$1.test(path2);
}
function isAbsoluteLocalPath$1(path2) {
  return path2.startsWith("/") || isWindowsPath(path2);
}
function stripQueryAndHash(path2) {
  return path2.split(/[?#]/, 1)[0] ?? path2;
}
function decodeRoutePath(path2) {
  try {
    return decodeURIComponent(path2);
  } catch {
    return void 0;
  }
}
function normalizeRelativePath(path2) {
  const segments = path2
    .replace(/\\/g, "/")
    .split("/")
    .filter((segment) => segment && segment !== ".");
  if (segments.length === 0 || segments.some((segment) => segment === "..")) return void 0;
  return segments.join("/");
}
function toWorkspaceFileRelativePath(path2, workspacePath) {
  const source = path2.trim();
  if (!source || HTTP_URL_RE$1.test(source)) return void 0;
  if (source.startsWith("/files/")) {
    const routePath = stripQueryAndHash(source).slice("/files/".length);
    const decodedPath = decodeRoutePath(routePath);
    return decodedPath ? normalizeRelativePath(decodedPath) : void 0;
  }
  if (source.startsWith("/api/")) return void 0;
  if (!isAbsoluteLocalPath$1(source)) {
    return normalizeRelativePath(stripQueryAndHash(source));
  }
  const workspace = workspacePath.trim();
  if (!workspace) return void 0;
  const normalizedPath = stripQueryAndHash(source).replace(/\\/g, "/");
  const normalizedWorkspace = workspace.replace(/\\/g, "/").replace(/\/+$/, "");
  const caseInsensitive = isWindowsPath(source) || isWindowsPath(workspace);
  const comparablePath = caseInsensitive ? normalizedPath.toLowerCase() : normalizedPath;
  const comparableWorkspace = caseInsensitive
    ? normalizedWorkspace.toLowerCase()
    : normalizedWorkspace;
  const workspacePrefix = `${comparableWorkspace}/`;
  if (!comparableWorkspace || !comparablePath.startsWith(workspacePrefix)) return void 0;
  return normalizeRelativePath(normalizedPath.slice(normalizedWorkspace.length + 1));
}
const CATEGORY_I18N = {
  thinking: "chat.activity.thinking",
  read: "chat.activity.read",
  analyseMedia: "chat.activity.analyseMedia",
  search: "chat.activity.search",
  execute: "chat.activity.execute",
  imageGen: "chat.activity.imageGen",
  videoGen: "chat.activity.videoGen",
  videoEdit: "chat.activity.videoEdit",
  audioGen: "chat.activity.audioGen",
  musicGen: "chat.activity.musicGen",
  mediaGenFailed: "chat.activity.mediaGenFailed",
  mediaGenPending: "chat.activity.mediaGenPending",
  mediaGenAborted: "chat.activity.mediaGenAborted",
  mediaGenCancelled: "chat.activity.mediaGenCancelled",
  mediaGenInterrupted: "chat.activity.mediaGenInterrupted",
  canvas: "chat.activity.canvas",
  plan: "chat.activity.plan",
  skillOp: "chat.activity.skillLoadedFallback",
  process: "chat.activity.process",
  connector: "chat.activity.connector",
  other: "chat.activity.other",
};
const CATEGORY_RUNNING_I18N = {
  analyseMedia: "chat.activity.analyseMedia.running",
  imageGen: "chat.activity.imageGen.running",
  videoGen: "chat.activity.videoGen.running",
  videoEdit: "chat.activity.videoEdit.running",
  audioGen: "chat.activity.audioGen.running",
  musicGen: "chat.activity.musicGen.running",
};
export function getStreamingAction(items) {
  const msg = items[items.length - 1];
  if (msg?.type !== "tool") return void 0;
  const status = msg.toolStatus;
  if (status === "running" || status === "pending") return msg;
  return void 0;
}
export function subMessageToChatMessage(sub) {
  const maybeConfirm = sub;
  if (maybeConfirm.type === "tool_confirm_ask") {
    return maybeConfirm;
  }
  if (sub.type === "thinking") {
    return {
      id: sub.id,
      type: "thinking",
      content: sub.content,
      role: "agent",
    };
  }
  if (sub.type === "tool") {
    const { name: name2, result } = parseToolResult(sub.content);
    const trimmedResult = result?.replace(/^:\s*/, "");
    return {
      id: sub.id,
      type: "tool",
      content: name2,
      toolStatus: sub.toolStatus,
      toolArgs: sub.args,
      toolResult: trimmedResult || void 0,
      interruption: sub.interruption,
      generationHandoffTargets: sub.generationHandoffTargets,
      callID: sub.callID,
      comfyUiProgress: sub.comfyUiProgress,
      role: "agent",
    };
  }
  if (sub.type === "question") {
    return {
      id: sub.id,
      type: "question",
      content: sub.content,
      role: "agent",
      requestId: sub.requestId,
      resolved: sub.resolved,
      questionData: sub.questionData,
      questionAnswers: sub.questionAnswers,
    };
  }
  return {
    id: sub.id,
    type: sub.type,
    content: sub.content,
    role: "agent",
  };
}
const MEDIA_GEN_CATEGORIES$1 = new Set([
  "imageGen",
  "videoGen",
  "videoEdit",
  "audioGen",
  "musicGen",
]);
const FILE_ACTIVITY_FAILED_I18N = {
  analyseMedia: "chat.activity.analyseMedia.failed",
};
function formatElapsedMilliseconds(milliseconds) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1e3));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}
const CATEGORY_ICON = {
  thinking: Brain,
  read: FileText,
  analyseMedia: FileText,
  search: Search,
  execute: Zap,
  imageGen: ImageOutlineIcon,
  videoGen: Video,
  videoEdit: Video,
  audioGen: AudioLines,
  musicGen: AudioLines,
  mediaGenFailed: CircleAlert,
  mediaGenPending: Clock,
  mediaGenAborted: Clock,
  mediaGenCancelled: CircleAlert,
  mediaGenInterrupted: Clock,
  canvas: SquareMousePointer,
  plan: ClipboardList,
  skillOp: SkillIcon,
  process: Cog,
  connector: Plug,
  other: Cog,
};
const TIMELINE_ICON_SIZE = 16;
function thinkingSummary(content2) {
  return content2
    .replace(/[*_`#>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
const TIMELINE_TOOL_ICON_SIZE = 18;
const TIMELINE_ICON_STROKE_WIDTH = 1.24;
function getTimelineIconSize(entry) {
  return entry.type === "tool" && entry.category === "execute"
    ? TIMELINE_TOOL_ICON_SIZE
    : TIMELINE_ICON_SIZE;
}
const INTERNAL_FIELDS = new Set(["_session_id", "_tool_use_id", "_user_override_note", "filename"]);
const PROMPT_FIELDS = new Set(["prompt", "text", "description", "lyrics"]);
const MODEL_TAG_FIELDS = new Set(["model_name", "model", "model_id"]);
const CAPABILITY_VIDEO_TOOL_NAMES = new Set(["hub_generate_video", "generate_video"]);
const MISPLACED_CAPABILITY_VIDEO_TAG_FIELDS = new Set(["aspect_ratio", "ratio", "resolution"]);
const DISPLAY_TAG_FIELDS = new Set([
  "model_name",
  "model",
  "model_id",
  "aspect_ratio",
  "duration",
  "resolution",
  // Midjourney model version (8.1 / 7 / niji7). Lives under vendor_params;
  // flattened below alongside aspect_ratio.
  "version",
  // Capability dispatcher knobs (live under vendor_params; flattened below).
  // `ratio` is Seedance's spelling for aspect_ratio. `mode` is dual-purpose:
  // at the TOP level it's the generation TYPE (t2v / i2v / first-last-frame /
  // ...), while under `vendor_params` it's the kling quality knob (std / pro /
  // 4k → 720P / 1080P / 4K). parseGenInput skips the top-level generation-type
  // `mode` whenever vendor_params carries the quality `mode`, so the single
  // `mode` tag always surfaces the resolution rather than "t2v".
  "ratio",
  "mode",
  // TTS signal fields for hub_generate_audio_speech.
  // voice_id / voice_ids are batch-only — the singular form lives on the
  // product-level model selector, not here. speed / emotion are simple
  // scalars, surfaced as tags for parity with the inline confirm card.
  "speed",
  "emotion",
  // Editing signal fields for hub_merge_videos.
  "scale_mode",
]);
const TAG_ICON = {
  duration: Clock,
};
const VENDOR_PARAM_TAG_KEYS = new Set([
  // image dispatcher
  "aspect_ratio",
  "resolution",
  // image dispatcher — Midjourney model version
  "version",
  // video dispatcher
  "ratio",
  "mode",
]);
function tagDisplayValue(key2, value, t2, preferType, modelDisplayMap) {
  if (MODEL_TAG_FIELDS.has(key2)) {
    const modelName = String(value);
    return (
      modelDisplayMap?.get(modelName) ?? resolveModelNameForCurrentRegion(modelName, preferType)
    );
  }
  if (key2 === "mode") {
    const str2 = String(value);
    if (isHiddenVideoGenerationMode(str2)) return null;
    return resolveVideoModeValueDisplay(str2, t2);
  }
  if (key2 === "version") return formatVersionTag(String(value));
  const raw2 = String(value);
  return t2(`canvas.param.option.${raw2}`, {
    defaultValue: raw2,
  });
}
function formatVersionTag(value) {
  const niji = value.match(/^niji\s*(\d+)$/i);
  if (niji) return `Niji ${niji[1]}`;
  return /^\d/.test(value) ? `v${value}` : value;
}
function vendorParamsHasMode(args) {
  const vp = args.vendor_params;
  return vp != null && typeof vp === "object" && !Array.isArray(vp) && "mode" in vp;
}
const BATCH_PROMPT_FIELDS = new Set(["prompts", "texts"]);
const BATCH_ARRAY_FIELDS = new Set([
  "prompts",
  "texts",
  "aspect_ratios",
  "voice_ids",
  "filenames",
  "emotions",
  "speeds",
  "first_frame_images",
  "duration",
]);
const REF_MEDIA_FIELDS = new Set([
  "image_path",
  "image_paths",
  "first_frame_image",
  "first_frame_images",
  "first_frame_image_path",
  "last_frame_image",
  "last_frame_images",
  "reference_image_paths",
  "reference_images",
  "video_path",
  "video_paths",
  "reference_video_url",
  "reference_video_urls",
  "video_url",
  "audio_path",
  "audio_paths",
  "reference_audio_urls",
  "audio",
  "file_path",
  "file_paths",
  "reference_file",
  "reference_files",
  "reference_file_path",
  "reference_file_paths",
  "attachment",
  "attachments",
]);
function collectRefPaths(parsed) {
  const paths = [];
  for (const [key2, value] of Object.entries(parsed)) {
    if (!REF_MEDIA_FIELDS.has(key2)) continue;
    if (typeof value === "string" && value.length > 0) {
      if (value.startsWith("[")) {
        try {
          const arr = JSON.parse(value);
          if (Array.isArray(arr)) {
            for (const v2 of arr) {
              if (typeof v2 === "string" && v2.length > 0) paths.push(v2);
            }
            continue;
          }
        } catch {}
      }
      paths.push(value);
    } else if (Array.isArray(value)) {
      for (const v2 of value) {
        if (typeof v2 === "string" && v2.length > 0) paths.push(v2);
      }
    }
  }
  return paths;
}
function parseGenInput(toolArgs, t2, preferType, toolName2, modelDisplayMap) {
  if (!toolArgs) return void 0;
  try {
    const parsed = JSON.parse(toolArgs);
    if (!parsed || typeof parsed !== "object") return void 0;
    let prompt;
    const tags2 = [];
    const tagKeys = new Set();
    const pushTag = (key2, value) => {
      if (tagKeys.has(key2)) return;
      tags2.push({
        key: key2,
        value,
      });
      tagKeys.add(key2);
    };
    for (const [key2, value] of Object.entries(parsed)) {
      if (INTERNAL_FIELDS.has(key2)) continue;
      if (
        toolName2 &&
        CAPABILITY_VIDEO_TOOL_NAMES.has(toolName2) &&
        MISPLACED_CAPABILITY_VIDEO_TAG_FIELDS.has(key2)
      ) {
        continue;
      }
      if (key2 === "mode" && vendorParamsHasMode(parsed)) continue;
      if (!prompt && PROMPT_FIELDS.has(key2) && typeof value === "string") {
        prompt = value;
      } else if (!prompt && BATCH_PROMPT_FIELDS.has(key2) && Array.isArray(value)) {
        const first2 = value.find((v2) => typeof v2 === "string" && v2.length > 0);
        if (first2) prompt = first2;
      } else if (DISPLAY_TAG_FIELDS.has(key2) && value != null && value !== "") {
        const display = tagDisplayValue(key2, value, t2, preferType, modelDisplayMap);
        if (display !== null) pushTag(key2, display);
      }
    }
    if (
      parsed.vendor_params != null &&
      typeof parsed.vendor_params === "object" &&
      !Array.isArray(parsed.vendor_params)
    ) {
      for (const [vk, vv] of Object.entries(parsed.vendor_params)) {
        if (!VENDOR_PARAM_TAG_KEYS.has(vk)) continue;
        if (vv == null || vv === "") continue;
        const display = tagDisplayValue(vk, vv, t2, preferType, modelDisplayMap);
        if (display !== null) pushTag(vk, display);
      }
    }
    const refPaths = collectRefPaths(parsed);
    return {
      prompt,
      tags: tags2,
      refPaths,
    };
  } catch {
    return void 0;
  }
}
function parseBatchItems(toolArgs, toolResult, t2, preferType, modelDisplayMap) {
  if (!toolArgs) return void 0;
  try {
    const args = JSON.parse(toolArgs);
    if (!args || typeof args !== "object") return void 0;
    let batchCount = 0;
    for (const key2 of BATCH_PROMPT_FIELDS) {
      if (Array.isArray(args[key2]) && args[key2].length > 1) {
        batchCount = args[key2].length;
        break;
      }
    }
    if (batchCount === 0) return void 0;
    const results = [];
    const sanitizedToolResult = normalizeStructuredToolResult(toolResult);
    if (sanitizedToolResult) {
      try {
        const out = JSON.parse(sanitizedToolResult);
        if (Array.isArray(out?.results)) {
          for (const r2 of out.results) results.push(r2 ?? {});
        } else if (Array.isArray(out?.paths)) {
          for (const p3 of out.paths)
            results.push({
              paths: [p3],
            });
        }
      } catch {}
    }
    const items = [];
    for (let i2 = 0; i2 < batchCount; i2++) {
      let prompt;
      const tags2 = [];
      for (const [key2, value] of Object.entries(args)) {
        if (INTERNAL_FIELDS.has(key2) || key2 === "count") continue;
        if (key2 === "mode" && vendorParamsHasMode(args)) continue;
        if (BATCH_ARRAY_FIELDS.has(key2) && Array.isArray(value)) {
          const itemValue = value[i2];
          if (itemValue == null || itemValue === "") continue;
          const singular = key2.replace(/s$/, "").replace(/ies$/, "y");
          if (BATCH_PROMPT_FIELDS.has(key2) && typeof itemValue === "string") {
            prompt = itemValue;
          } else if (DISPLAY_TAG_FIELDS.has(singular) && itemValue != null && itemValue !== "") {
            const display = tagDisplayValue(singular, itemValue, t2, preferType, modelDisplayMap);
            if (display !== null)
              tags2.push({
                key: singular,
                value: display,
              });
          }
        } else if (!BATCH_ARRAY_FIELDS.has(key2)) {
          if (!prompt && PROMPT_FIELDS.has(key2) && typeof value === "string") {
            prompt = value;
          } else if (DISPLAY_TAG_FIELDS.has(key2) && value != null && value !== "") {
            if (!tags2.some((tag) => tag.key === key2)) {
              const display = tagDisplayValue(key2, value, t2, preferType, modelDisplayMap);
              if (display !== null)
                tags2.push({
                  key: key2,
                  value: display,
                });
            }
          }
        }
      }
      if (
        args.vendor_params != null &&
        typeof args.vendor_params === "object" &&
        !Array.isArray(args.vendor_params)
      ) {
        for (const [vk, vv] of Object.entries(args.vendor_params)) {
          if (!VENDOR_PARAM_TAG_KEYS.has(vk)) continue;
          if (vv == null || vv === "") continue;
          if (tags2.some((tag) => tag.key === vk)) continue;
          const display = tagDisplayValue(vk, vv, t2, preferType, modelDisplayMap);
          if (display !== null)
            tags2.push({
              key: vk,
              value: display,
            });
        }
      }
      const r2 = results[i2];
      const outputPaths = [];
      if (r2) {
        if (Array.isArray(r2.paths)) {
          for (const p3 of r2.paths) if (typeof p3 === "string") outputPaths.push(p3);
        } else if (typeof r2.path === "string") {
          outputPaths.push(r2.path);
        }
      }
      const refPaths = collectRefPaths(args);
      items.push({
        input: {
          prompt,
          tags: tags2,
          refPaths,
        },
        outputPaths,
        error: sanitizeDisplayText(r2?.error),
        errorCode: sanitizeDisplayText(r2?.error_code),
        userMessage: sanitizeDisplayText(r2?.user_message),
      });
    }
    return items;
  } catch {
    return void 0;
  }
}
function stripUserOverrideNotice(text2) {
  return text2
    .split(/\r?\n/)
    .filter((line) => !/^\s*\[User Override\]/i.test(line))
    .filter((line) => !/^\s*User manually modified:/i.test(line))
    .join("\n")
    .trim();
}
function sanitizeDisplayText(text2) {
  if (!text2) return void 0;
  const sanitized = stripUserOverrideNotice(text2);
  return sanitized.length > 0 ? sanitized : void 0;
}
function normalizeStructuredToolResult(text2) {
  const sanitized = sanitizeDisplayText(text2);
  if (!sanitized) return void 0;
  return normalizeJsonToolResult(sanitized);
}
function extractFailureReason(toolResult) {
  const sanitizedToolResult = normalizeStructuredToolResult(toolResult);
  if (!sanitizedToolResult) return void 0;
  const trimmed = sanitizedToolResult.trim();
  if (!trimmed) return void 0;
  try {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed === "string") return sanitizeDisplayText(parsed);
    if (!parsed || typeof parsed !== "object") return void 0;
    const record2 = parsed;
    for (const key2 of ["error", "message", "reason", "detail", "content"]) {
      const value = record2[key2];
      if (typeof value === "string" && value.trim()) return sanitizeDisplayText(value);
    }
    if (record2.is_error === true || record2.ok === false || record2.success === false) {
      return void 0;
    }
  } catch {
    return sanitizeDisplayText(trimmed);
  }
  return void 0;
}
function extractFailureCode(toolResult) {
  const sanitizedToolResult = normalizeStructuredToolResult(toolResult);
  if (!sanitizedToolResult) return void 0;
  const trimmed = sanitizedToolResult.trim();
  if (!trimmed) return void 0;
  try {
    const parsed = JSON.parse(trimmed);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return void 0;
    const record2 = parsed;
    for (const key2 of ["error_code", "code"]) {
      const value = record2[key2];
      if (typeof value === "string" && value.trim()) return sanitizeDisplayText(value);
    }
    const nestedError = record2.error;
    if (!nestedError || typeof nestedError !== "object" || Array.isArray(nestedError)) {
      return void 0;
    }
    for (const key2 of ["error_code", "code"]) {
      const value = nestedError[key2];
      if (typeof value === "string" && value.trim()) return sanitizeDisplayText(value);
    }
  } catch {
    return void 0;
  }
  return void 0;
}
function extractUserMessage(toolResult) {
  const sanitizedToolResult = normalizeStructuredToolResult(toolResult);
  if (!sanitizedToolResult) return void 0;
  const trimmed = sanitizedToolResult.trim();
  if (!trimmed) return void 0;
  try {
    const parsed = JSON.parse(trimmed);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return void 0;
    const record2 = parsed;
    const userMessage = record2.user_message;
    if (typeof userMessage === "string" && userMessage.trim()) {
      return sanitizeDisplayText(userMessage);
    }
    const nestedError = record2.error;
    if (!nestedError || typeof nestedError !== "object" || Array.isArray(nestedError)) {
      return void 0;
    }
    const nestedUserMessage = nestedError.user_message;
    if (typeof nestedUserMessage === "string" && nestedUserMessage.trim()) {
      return sanitizeDisplayText(nestedUserMessage);
    }
  } catch {
    return void 0;
  }
  return void 0;
}
const FAILURE_REASON_PATTERN =
  /(?:\b\w+Error:|\bError:|\bException:|\bfailed\b|\bfailure\b|\brejected\b|\bdenied\b|\bblocked\b|\btimeout\b|timed out|quota|violat|unauthori[sz]ed|forbidden|not available|\baborted?\b|\bcancell?ed\b)/i;
function looksLikeFailureReason(reason) {
  if (!reason) return false;
  return FAILURE_REASON_PATTERN.test(reason);
}
function resolveToolConfirmRejectReason(entry) {
  const settlementReason = toolConfirmSettlementRejectReason(
    entry.rejectedConfirm?.toolConfirmSettlementCause,
  );
  return (
    settlementReason ??
    parseToolConfirmRejectReason(entry.toolResult) ??
    (entry.rejectedConfirm ? "user_rejected" : void 0)
  );
}
function toolConfirmSettlementRejectReason(cause) {
  switch (cause) {
    case void 0:
      return void 0;
    case "timeout":
      return "confirmation_expired";
    case "reply":
    case "session_cancelled":
      return "user_rejected";
    case "mode_changed":
    case "runtime_restarted":
    case "session_deleted":
    case "unavailable":
      return "confirmation_unavailable";
  }
}
function toolConfirmRejectLabel(reason, t2) {
  switch (reason) {
    case "user_rejected":
      return t2("chat.activity.generationCancelled");
    case "confirmation_expired":
      return t2("chat.activity.confirmationExpired");
    case "confirmation_unavailable":
      return t2("chat.activity.confirmationUnavailable");
  }
}
function parseEffectiveParams(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return void 0;
  const entries2 = Object.entries(value).filter((entry) => typeof entry[1] === "string");
  return entries2.length > 0 ? Object.fromEntries(entries2) : void 0;
}
function parseGenOutput(toolResult, toolName2) {
  if (!toolResult) return void 0;
  try {
    const sanitizedToolResult = normalizeStructuredToolResult(toolResult);
    if (!sanitizedToolResult) return void 0;
    const parsed = JSON.parse(sanitizedToolResult);
    const paths = [];
    if (Array.isArray(parsed?.paths)) {
      for (const p3 of parsed.paths) {
        if (typeof p3 === "string" && p3.length > 0 && !p3.startsWith("[")) paths.push(p3);
      }
    } else if (Array.isArray(parsed?.results)) {
      for (const r2 of parsed.results) {
        if (Array.isArray(r2?.paths)) {
          for (const p3 of r2.paths) {
            if (typeof p3 === "string") paths.push(p3);
          }
        } else if (typeof r2?.path === "string") {
          paths.push(r2.path);
        }
      }
    } else if (typeof parsed?.path === "string" && parsed.path.length > 0) {
      paths.push(parsed.path);
    }
    const category = resolveMediaTaskCategory(toolName2 ?? "");
    const mediaType =
      category === "imageGen"
        ? "image"
        : category === "videoGen" || category === "videoEdit"
          ? "video"
          : "audio";
    const parsedError = extractFailureReason(toolResult);
    const effectiveParams = parseEffectiveParams(parsed?.effective_params);
    const lyrics =
      typeof parsed?.lyrics === "string" && parsed.lyrics.trim().length > 0
        ? parsed.lyrics
        : void 0;
    const songTitle =
      typeof parsed?.song_title === "string" && parsed.song_title.trim().length > 0
        ? parsed.song_title
        : void 0;
    const styleTags2 =
      typeof parsed?.style_tags === "string" && parsed.style_tags.trim().length > 0
        ? parsed.style_tags
        : void 0;
    const readVoiceId = (candidate) => {
      const value = candidate?.voice_id;
      return typeof value === "string" && value.trim().length > 0 ? value : void 0;
    };
    const resultItems = Array.isArray(parsed?.results) ? parsed.results : [];
    const voiceId = readVoiceId(parsed) ?? resultItems.map(readVoiceId).find(Boolean);
    const voiceCount = resultItems.reduce((total, item) => {
      const voices = item?.voices;
      return total + (Array.isArray(voices) ? voices.length : 0);
    }, 0);
    const formattedLyrics =
      typeof parsed?.formatted_lyrics === "string" && parsed.formatted_lyrics.trim().length > 0
        ? parsed.formatted_lyrics
        : void 0;
    const structureResult =
      typeof parsed?.structure_result === "string" && parsed.structure_result.trim().length > 0
        ? parsed.structure_result
        : void 0;
    const audioDuration =
      typeof parsed?.audio_duration === "number" ? parsed.audio_duration : void 0;
    return {
      paths,
      mediaType,
      error: parsedError,
      errorCode: extractFailureCode(toolResult),
      userMessage: extractUserMessage(toolResult),
      effectiveParams,
      lyrics,
      songTitle,
      styleTags: styleTags2,
      voiceId,
      voiceCount: voiceCount > 0 ? voiceCount : void 0,
      formattedLyrics,
      structureResult,
      audioDuration,
    };
  } catch {
    return void 0;
  }
}
function tagSemanticKey(key2) {
  if (MODEL_TAG_FIELDS.has(key2)) return "model";
  if (key2 === "ratio" || key2 === "aspect_ratio") return "aspect_ratio";
  return key2;
}
const GENERATION_TAG_ORDER = {
  model: 0,
  aspect_ratio: 1,
  resolution: 2,
};
function sortGenerationTags(tags2) {
  return [...tags2].sort(
    (a2, b3) =>
      (GENERATION_TAG_ORDER[tagSemanticKey(a2.key)] ?? 3) -
      (GENERATION_TAG_ORDER[tagSemanticKey(b3.key)] ?? 3),
  );
}
function applyEffectiveParamTags(input, effectiveParams, t2, preferType, modelDisplayMap) {
  if (!input || !effectiveParams) return input;
  const effectiveTags = [];
  for (const [key2, value] of Object.entries(effectiveParams)) {
    if (!DISPLAY_TAG_FIELDS.has(key2) || value === "") continue;
    const display = tagDisplayValue(key2, value, t2, preferType, modelDisplayMap);
    if (display !== null)
      effectiveTags.push({
        key: key2,
        value: display,
      });
  }
  if (effectiveTags.length === 0) return input;
  const effectiveBySemanticKey = new Map(
    effectiveTags.map((tag) => [tagSemanticKey(tag.key), tag]),
  );
  const consumedSemanticKeys = new Set();
  const tags2 = [];
  for (const tag of input.tags) {
    const semanticKey = tagSemanticKey(tag.key);
    const effectiveTag = effectiveBySemanticKey.get(semanticKey);
    if (!effectiveTag) {
      tags2.push(tag);
      continue;
    }
    if (!consumedSemanticKeys.has(semanticKey)) {
      tags2.push(effectiveTag);
      consumedSemanticKeys.add(semanticKey);
    }
  }
  for (const tag of effectiveTags) {
    const semanticKey = tagSemanticKey(tag.key);
    if (consumedSemanticKeys.has(semanticKey)) continue;
    tags2.push(tag);
    consumedSemanticKeys.add(semanticKey);
  }
  return {
    ...input,
    tags: tags2,
  };
}
function PromptBlock({ text: text2, lineClamp }) {
  const [copied, setCopied] = reactExports.useState(false);
  const handleCopy = reactExports.useCallback(
    (e2) => {
      e2.stopPropagation();
      navigator.clipboard.writeText(text2);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    },
    [text2],
  );
  return (
    <div className="relative group/prompt">
      <button
        type="button"
        onClick={handleCopy}
        className="absolute top-0 right-0 p-0.5 rounded-sm opacity-0 group-hover/prompt:opacity-100 hover:bg-muted transition-opacity"
        style={{
          cursor: "pointer",
        }}
      >
        {copied ? (
          <Icon icon={Check} size="sm" className="text-muted-foreground" />
        ) : (
          <Icon icon={Copy} size="sm" className="text-foreground opacity-50" />
        )}
      </button>
      {lineClamp ? (
        <ExpandableText
          lineClamp={lineClamp}
          ellipsis={true}
          className="text-body-14 text-muted-foreground pr-6"
        >
          {text2}
        </ExpandableText>
      ) : (
        <p className="text-body-14 text-muted-foreground whitespace-pre-wrap break-words [overflow-wrap:anywhere] pr-6">
          {text2}
        </p>
      )}
    </div>
  );
}
function RefPreviews({ paths, resolveFilePath }) {
  if (paths.length === 0) return null;
  return (
    <div className="flex items-center gap-1 overflow-x-auto min-w-0">
      {paths.map((path2) => {
        const src = resolveFilePath(path2);
        if (!src) return null;
        return (
          <ArtifactAssetCard
            key={path2}
            artifact={{
              type: artifactAssetTypeFromPath(path2),
              path: path2,
              url: path2,
            }}
            src={src}
            size="sm"
          />
        );
      })}
    </div>
  );
}
function FailureBlock({ label: labelOverride, reason, pending: pending2 = false }) {
  const { t: t2 } = useTranslation();
  const label = labelOverride ?? t2("chat.activity.mediaGenFailed");
  const trimmedReason = redactForCurrentRegion(reason).trim();
  const showReason = trimmedReason.length > 0 && trimmedReason !== label;
  return (
    <div className="flex gap-1.5 items-start text-body-14 text-foreground min-w-0">
      <Icon
        icon={pending2 ? Clock : CircleAlert}
        size="sm"
        strokeWidth={1.5}
        className="shrink-0 mt-1 text-muted-foreground"
      />
      <div className="flex-1 min-w-0 max-h-32 overflow-y-auto">
        <span className="font-medium">
          {label}
          {showReason ? ": " : ""}
        </span>
        {showReason && (
          <span className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
            {trimmedReason}
          </span>
        )}
      </div>
    </div>
  );
}
function GenerationFailureBlock({ label, rawError, errorCode, userMessage }) {
  const { t: t2 } = useTranslation();
  const reason = generationFailureDisplayText(
    {
      rawError,
      errorCode,
      userMessage,
    },
    (key2) => t2(key2),
  );
  return <FailureBlock label={label} reason={reason} />;
}
function BatchSummaryFooter({ succeeded, total, failures }) {
  const { t: t2 } = useTranslation();
  const hasFailures = failures.length > 0;
  return (
    <div className="flex items-center gap-1.5 text-body-14 text-foreground">
      <Icon
        icon={CircleAlert}
        size="sm"
        strokeWidth={1.5}
        className="text-muted-foreground shrink-0"
      />
      <span>
        {t2("chat.activity.batchSummary", {
          success: succeeded,
          failed: total - succeeded,
        })}
      </span>
      {hasFailures && (
        <Popover>
          <PopoverTrigger
            className="ml-auto text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
            style={{
              cursor: "pointer",
            }}
          >
            {t2("chat.activity.failureView", {
              count: failures.length,
            })}
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-2">
            <div className="text-muted-foreground mb-1.5 px-1.5 font-medium text-caption-10">
              {t2("chat.activity.failureReasons")}
            </div>
            <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
              {failures.map((f2) => (
                <div
                  key={f2.index}
                  className="rounded-sm bg-muted/60 border border-border/30 p-1.5"
                >
                  <div className="text-muted-foreground mb-0.5 font-medium">#{f2.index + 1}</div>
                  <pre className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-foreground font-sans leading-relaxed">
                    {redactForCurrentRegion(generationFailureDisplayText(f2, (key2) => t2(key2)))}
                  </pre>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
function MediaGenDetail({ entry }) {
  const { t: t2 } = useTranslation();
  const promptLineClamp =
    entry.category === "imageGen" || entry.category === "videoGen" ? 2 : void 0;
  const resolveUrl = useResolveMediaUrl();
  const [pageIndex, setPageIndex] = reactExports.useState(0);
  const isRecoveredInterrupted = isToolRecoveredInterrupted(entry.toolResult);
  const interruption =
    entry.toolStatus === "error"
      ? resolveToolInterruption(entry.toolResult, entry.interruption)
      : void 0;
  const isAbortedByUser = interruption === "aborted";
  const isHandedOffToCanvas = interruption === "canvas_continuation";
  const hasSuccessfulOutput = hasSuccessfulMediaOutput(entry.toolResult);
  const failurePresentation = generationFailurePresentation(entry.toolResult);
  const hasManagedFailurePresentation =
    failurePresentation === "recoverable" ||
    failurePresentation === "status_unknown" ||
    failurePresentation === "cancelled";
  const managedFailureLabel =
    failurePresentation === "recoverable"
      ? t2("chat.activity.mediaGenRecoverable")
      : failurePresentation === "cancelled"
        ? t2("chat.activity.mediaGenCancelled")
        : t2("chat.activity.mediaGenUnknown");
  const managedFailureReason =
    failurePresentation === "recoverable"
      ? t2("chat.activity.mediaGenRecoverableDescription")
      : failurePresentation === "cancelled"
        ? t2("chat.activity.mediaGenCancelledDescription")
        : t2("chat.activity.mediaGenUnknownDescription");
  const category = resolveMediaTaskCategory(entry.toolName ?? "");
  const preferType = registryMediaTypeForCategory(category);
  const mediaType = preferType ?? "audio";
  const { data: mentionModels } = useMentionModels();
  const modelDisplayMap = reactExports.useMemo(() => {
    const map3 = new Map();
    const models = mentionModels?.filter((model) => !preferType || model.type === preferType) ?? [];
    const addModelKey = (key2, displayName2) => {
      if (key2 && !map3.has(key2)) map3.set(key2, displayName2);
    };
    for (const keyOf of [
      (model) => model.id,
      (model) => model.model_name,
      (model) => model.mention_name,
    ]) {
      for (const model of models) {
        addModelKey(keyOf(model), redactForCurrentRegion(model.display_name));
      }
    }
    return map3;
  }, [mentionModels, preferType]);
  const batchItems = reactExports.useMemo(
    () => parseBatchItems(entry.toolArgs, entry.toolResult, t2, preferType, modelDisplayMap),
    [entry.toolArgs, entry.toolResult, modelDisplayMap, preferType, t2],
  );
  const rawInput = reactExports.useMemo(
    () => parseGenInput(entry.toolArgs, t2, preferType, entry.toolName, modelDisplayMap),
    [entry.toolArgs, entry.toolName, modelDisplayMap, preferType, t2],
  );
  const output = reactExports.useMemo(
    () => parseGenOutput(entry.toolResult, entry.toolName),
    [entry.toolResult, entry.toolName],
  );
  const input = reactExports.useMemo(
    () =>
      applyEffectiveParamTags(rawInput, output?.effectiveParams, t2, preferType, modelDisplayMap),
    [modelDisplayMap, output?.effectiveParams, preferType, rawInput, t2],
  );
  const displayToolResult = sanitizeDisplayText(entry.toolResult);
  const resolveFilePath = (path2) => {
    if (path2.startsWith("asset://")) return void 0;
    const resolved = resolveUrl(API_PATHS.serveFile(path2));
    if (!resolved) return void 0;
    if (/^https?:\/\//i.test(resolved)) return resolved;
    try {
      return new URL(resolved, window.location.origin).toString();
    } catch {
      return resolved;
    }
  };
  if (batchItems && batchItems.length > 1) {
    const total = batchItems.length;
    const current2 = batchItems[pageIndex];
    if (!current2) return null;
    const currentTags = sortGenerationTags(current2.input.tags);
    const promptNode2 = current2.input.prompt ? (
      <PromptBlock text={current2.input.prompt} lineClamp={promptLineClamp} />
    ) : (
      void 0
    );
    const pager = (
      <div className="ml-auto flex shrink-0 items-center gap-1 text-caption-10 text-muted-foreground">
        <button
          type="button"
          disabled={pageIndex === 0}
          onClick={(e2) => {
            e2.stopPropagation();
            setPageIndex((i2) => i2 - 1);
          }}
          className="p-0.5 rounded-sm hover:bg-muted disabled:opacity-30 transition-colors"
          style={{
            cursor: pageIndex === 0 ? "not-allowed" : "pointer",
          }}
        >
          <Icon icon={ChevronLeft} size="xs" strokeWidth={1.5} />
        </button>
        <span className="tabular-nums">
          {pageIndex + 1}/{total}
        </span>
        <button
          type="button"
          disabled={pageIndex === total - 1}
          onClick={(e2) => {
            e2.stopPropagation();
            setPageIndex((i2) => i2 + 1);
          }}
          className="p-0.5 rounded-sm hover:bg-muted disabled:opacity-30 transition-colors"
          style={{
            cursor: pageIndex === total - 1 ? "not-allowed" : "pointer",
          }}
        >
          <Icon icon={ChevronRight$1} size="xs" strokeWidth={1.5} />
        </button>
      </div>
    );
    const hasReferencePreviews = current2.input.refPaths.length > 0;
    const tagsNode2 =
      currentTags.length > 0 || hasReferencePreviews ? (
        <div className="flex flex-col gap-1.5 min-w-0">
          {currentTags.length > 0 && (
            <div className="flex min-w-0 items-center gap-1.5">
              <div className="min-w-0 flex-1">
                <TagsRow
                  tags={currentTags}
                  tagIcons={TAG_ICON}
                  categoryIcon={CATEGORY_ICON[entry.category] ?? SkillIcon}
                />
              </div>
              {!hasReferencePreviews && pager}
            </div>
          )}
          {hasReferencePreviews && (
            <div className="flex items-center gap-1.5 min-w-0">
              <RefPreviews paths={current2.input.refPaths} resolveFilePath={resolveFilePath} />
              {pager}
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-1.5 min-w-0">
          <RefPreviews paths={current2.input.refPaths} resolveFilePath={resolveFilePath} />
          {pager}
        </div>
      );
    const allOutputPaths = batchItems.flatMap((item) => item.outputPaths);
    const currentOutputPaths = current2.outputPaths;
    const succeeded = batchItems.filter((item) => item.outputPaths.length > 0).length;
    const failures = batchItems
      .map((item, index2) => ({
        item,
        index: index2,
      }))
      .filter(({ item }) => !!(item.userMessage || item.error || item.errorCode))
      .map(({ item, index: index2 }) => ({
        index: index2,
        rawError: item.error,
        errorCode: item.errorCode,
        userMessage: item.userMessage,
      }));
    const rawBatchFailure = extractFailureReason(entry.toolResult);
    const rawBatchFailureCode = extractFailureCode(entry.toolResult);
    const rawBatchUserMessage = extractUserMessage(entry.toolResult);
    const batchFailed =
      !isHandedOffToCanvas &&
      !isRecoveredInterrupted &&
      !hasSuccessfulOutput &&
      failures.length === 0 &&
      allOutputPaths.length === 0 &&
      (entry.toolStatus === "error" || !!rawBatchFailure || !!rawBatchUserMessage);
    const footerNode2 = isHandedOffToCanvas ? (
      <GenerationHandoffNotice targets={entry.generationHandoffTargets ?? []} />
    ) : hasManagedFailurePresentation ? (
      <FailureBlock
        label={managedFailureLabel}
        reason={managedFailureReason}
        pending={failurePresentation === "recoverable"}
      />
    ) : failures.length > 0 ? (
      <BatchSummaryFooter succeeded={succeeded} total={total} failures={failures} />
    ) : batchFailed ? (
      <GenerationFailureBlock
        rawError={rawBatchFailure}
        errorCode={rawBatchFailureCode}
        userMessage={rawBatchUserMessage}
      />
    ) : (
      void 0
    );
    const mediaNode2 =
      currentOutputPaths.length > 0 ? (
        <div className="flex gap-1.5 overflow-x-auto">
          {currentOutputPaths.map((path2) => {
            const src = resolveFilePath(path2);
            return src ? (
              <ArtifactAssetCard
                key={path2}
                artifact={{
                  type: artifactAssetTypeFromPath(path2, mediaType),
                  path: path2,
                  url: path2,
                }}
                src={src}
                size="md"
                showLabel={false}
              />
            ) : null;
          })}
        </div>
      ) : (
        void 0
      );
    return (
      <MediaGenCardLayout
        className=""
        prompt={promptNode2}
        tags={tagsNode2}
        media={mediaNode2}
        footer={footerNode2}
      />
    );
  }
  if (!input && !output) {
    return (
      <MediaGenCardLayout
        className=""
        prompt={
          entry.toolArgs && (
            <div>
              <div className="text-body-12 text-muted-foreground mb-0.5">{t2("chat.input")}</div>
              <pre className="whitespace-pre-wrap break-words text-body-14 font-sans text-muted-foreground">
                {formatArgs(entry.toolArgs)}
              </pre>
            </div>
          )
        }
        media={
          displayToolResult && (
            <div>
              <div className="text-body-12 text-muted-foreground mb-0.5">{t2("chat.output")}</div>
              <pre className="whitespace-pre-wrap break-words text-body-14 font-sans text-muted-foreground">
                {displayToolResult.length > 500
                  ? `${displayToolResult.slice(0, 500)}...`
                  : displayToolResult}
              </pre>
            </div>
          )
        }
      />
    );
  }
  const promptNode = input?.prompt ? (
    <PromptBlock text={input.prompt} lineClamp={promptLineClamp} />
  ) : (
    void 0
  );
  const inputTags2 = input ? sortGenerationTags(input.tags) : [];
  const tagsNode =
    input && (inputTags2.length > 0 || input.refPaths.length > 0) ? (
      <div className="flex flex-col gap-1.5 min-w-0">
        {inputTags2.length > 0 && (
          <TagsRow
            tags={inputTags2}
            tagIcons={TAG_ICON}
            categoryIcon={CATEGORY_ICON[entry.category] ?? SkillIcon}
          />
        )}
        {input.refPaths.length > 0 && (
          <RefPreviews paths={input.refPaths} resolveFilePath={resolveFilePath} />
        )}
      </div>
    ) : (
      void 0
    );
  const mediaNode =
    output && output.paths.length > 0 ? (
      <div className="flex gap-1.5 overflow-x-auto">
        {output.paths.map((path2) => {
          const src = resolveFilePath(path2);
          return src ? (
            <ArtifactAssetCard
              key={path2}
              artifact={{
                type: artifactAssetTypeFromPath(path2, output.mediaType),
                path: path2,
                url: path2,
              }}
              src={src}
              size="md"
              showLabel={false}
            />
          ) : null;
        })}
      </div>
    ) : output?.lyrics ? (
      <div className="flex flex-col gap-1">
        {output.songTitle && <div className="text-foreground font-medium">{output.songTitle}</div>}
        {output.styleTags && (
          <div className="text-muted-foreground text-caption-10">{output.styleTags}</div>
        )}
        <PromptBlock text={output.lyrics} />
      </div>
    ) : output?.voiceId ? (
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="text-muted-foreground shrink-0">{t2("chat.activity.voiceClone.id")}</span>
        <code className="text-foreground font-mono text-caption-10 truncate">{output.voiceId}</code>
      </div>
    ) : output?.voiceCount ? (
      <div className="text-muted-foreground">
        {t2("chat.activity.voicePrepare.catalog", {
          count: output.voiceCount,
        })}
      </div>
    ) : output?.formattedLyrics ? (
      <div className="flex flex-col gap-1">
        {(output.structureResult || typeof output.audioDuration === "number") && (
          <div className="text-muted-foreground text-caption-10">
            {[
              output.structureResult,
              typeof output.audioDuration === "number"
                ? t2("chat.activity.coverPreprocess.duration", {
                    duration: Math.round(output.audioDuration),
                  })
                : void 0,
            ]
              .filter(Boolean)
              .join(" · ")}
          </div>
        )}
        <PromptBlock text={output.formattedLyrics} />
      </div>
    ) : (
      void 0
    );
  const rawFailureReason = extractFailureReason(entry.toolResult);
  const rejectReason = resolveToolConfirmRejectReason(entry);
  const rejectLabel = rejectReason ? toolConfirmRejectLabel(rejectReason, t2) : void 0;
  const hasMissingOutput =
    !!output &&
    output.paths.length === 0 &&
    !output.lyrics &&
    !output.voiceId &&
    !output.voiceCount &&
    !output.formattedLyrics;
  const unparsedFailure = !output && !!rawFailureReason;
  const failureReason =
    isRecoveredInterrupted || isAbortedByUser || isHandedOffToCanvas
      ? void 0
      : rejectLabel ||
        output?.error ||
        (entry.rejectedConfirm
          ? t2("chat.activity.toolRejected")
          : rawFailureReason &&
              (entry.toolStatus === "error" ||
                unparsedFailure ||
                looksLikeFailureReason(rawFailureReason))
            ? rawFailureReason
            : void 0) ||
        ((entry.toolStatus === "error" && !hasSuccessfulOutput) || hasMissingOutput
          ? t2("chat.activity.mediaGenFailed")
          : void 0);
  const failureErrorCode = output?.errorCode ?? extractFailureCode(entry.toolResult);
  const failureUserMessage = output?.userMessage ?? extractUserMessage(entry.toolResult);
  const footerNode = hasManagedFailurePresentation ? (
    <FailureBlock
      label={managedFailureLabel}
      reason={managedFailureReason}
      pending={failurePresentation === "recoverable"}
    />
  ) : isHandedOffToCanvas ? (
    <GenerationHandoffNotice targets={entry.generationHandoffTargets ?? []} />
  ) : failureReason ? (
    <GenerationFailureBlock
      label={rejectLabel}
      rawError={failureReason}
      errorCode={failureErrorCode}
      userMessage={failureUserMessage}
    />
  ) : (
    void 0
  );
  return (
    <MediaGenCardLayout
      className=""
      prompt={promptNode}
      tags={tagsNode}
      media={mediaNode}
      footer={footerNode}
    />
  );
}
function GenerationHandoffNotice({ targets }) {
  const { t: t2 } = useTranslation();
  return (
    <div
      className="flex min-w-0 flex-col gap-2"
      data-action-ui-id="chat-generation-handoff-targets"
    >
      {targets.length > 0 ? (
        <div className="flex min-w-0 flex-wrap gap-2">
          {targets.map((target) => (
            <GenerationHandoffTargetCard
              key={`${target.node_id}:${target.generation_attempt_id ?? ""}`}
              target={target}
            />
          ))}
        </div>
      ) : (
        // Legacy pure-text markers / target-less acks carry no node identity;
        // keep a textual hint instead of rendering nothing.
        <span className="text-body-12 text-muted-foreground">
          {t2("chat.activity.mediaGenInterruptedDescription")}
        </span>
      )}
    </div>
  );
}
function GenerationHandoffTargetCard({ target }) {
  const { t: t2 } = useTranslation();
  const workspacePath = useCurrentWorkspace();
  const resolveUrl = useResolveMediaUrl();
  const asset = useAssetMeta(target.node_id);
  const generating = useGenerating(target.node_id);
  const resolvedUrl = asset?.url ? resolveUrl(asset.url) : void 0;
  const handleLocate = reactExports.useCallback(() => {
    if (!workspacePath) return;
    workspaceEvents.fireCanvasFocus(workspacePath, [target.node_id], {
      select: true,
    });
  }, [target.node_id, workspacePath]);
  const placeholderIcon =
    target.media_type === "video" ? (
      <VideoPlaceholderIcon size={16} />
    ) : target.media_type === "audio" ? (
      <AudioPlaceholderIcon size={16} />
    ) : target.media_type === "text" ? (
      <TextPlaceholderIcon size={16} />
    ) : (
      <ImagePlaceholderIcon size={16} />
    );
  if (!generating && asset && resolvedUrl) {
    return (
      <ArtifactAssetCard
        artifact={{
          type: target.media_type === "text" ? "file" : target.media_type,
          path: asset.path || asset.name,
          url: asset.url,
          nodeIds: [target.node_id],
        }}
        src={resolvedUrl}
        size="chip"
      />
    );
  }
  return (
    <button
      type="button"
      data-action-ui-id="chat-generation-handoff-target"
      onClick={handleLocate}
      className="inline-flex h-10 min-w-32 items-center gap-2 rounded-md border border-border bg-card p-0.5 pr-2 text-left text-body-12 text-foreground transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
      aria-label={t2("chat.activity.mediaGenHandoffOpenCanvas")}
    >
      {generating ? (
        <GeneratingMediaArea
          width={36}
          height={36}
          radius={6}
          className="shrink-0"
          icon={placeholderIcon}
        />
      ) : (
        // Ended without a chat-visible asset (failed / node deleted / stores
        // not hydrated yet) — stay neutral instead of claiming "generating".
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          {placeholderIcon}
        </span>
      )}
      <span className="min-w-0 flex-1">
        {t2(
          generating
            ? "chat.activity.mediaGenHandoffGenerating"
            : "chat.activity.mediaGenHandoffViewOnCanvas",
        )}
      </span>
      <Icon icon={Crosshair} size="sm" strokeWidth={1.5} className="text-muted-foreground" />
    </button>
  );
}
function extractKnowledgePaths(toolName2, toolArgs) {
  if (toolName2 !== "hub_read" || !toolArgs) return void 0;
  try {
    const parsed = JSON.parse(toolArgs);
    const filePath = parsed.file_path ?? parsed.filePath ?? "";
    return matchKnowledgePath(filePath);
  } catch {}
  return void 0;
}
function extractSkillName(toolArgs) {
  if (!toolArgs) return void 0;
  try {
    const parsed = JSON.parse(toolArgs);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return void 0;
    const record2 = parsed;
    const name2 = record2.name ?? record2.skill ?? record2.skill_name;
    return typeof name2 === "string" && name2.trim().length > 0 ? name2.trim() : void 0;
  } catch {}
  return void 0;
}
function parseComfyUiRunDisplayResult(toolResult) {
  const normalized = normalizeStructuredToolResult(toolResult);
  if (!normalized) return void 0;
  try {
    const parsed = JSON.parse(normalized);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return void 0;
    const record2 = parsed;
    const paths = Array.isArray(record2.output_paths)
      ? record2.output_paths.filter((path2) => typeof path2 === "string" && path2.trim().length > 0)
      : [];
    const uniquePaths = [...new Set(paths)];
    const succeededCount =
      typeof record2.succeeded_count === "number" ? record2.succeeded_count : uniquePaths.length;
    return {
      terminal: record2.terminal === true,
      status: typeof record2.status === "string" ? record2.status : void 0,
      succeededCount,
      outputFiles: uniquePaths.map((path2) => ({
        name: path2.split(/[\\/]/).pop() ?? path2,
        path: path2,
      })),
    };
  } catch {
    return void 0;
  }
}
function renderToolLabel(entry, t2) {
  if (entry.type === "tool" && entry.toolName === "hub_run_comfyui_workflow") {
    const result = parseComfyUiRunDisplayResult(entry.toolResult);
    if (entry.toolStatus === "running" || entry.toolStatus === "pending") {
      return t2("chat.toolLabel.runComfyUiWorkflow.running");
    }
    if (entry.toolStatus === "ok" && result?.terminal) {
      if (result.status === "failed" && result.succeededCount === 0) {
        return t2("chat.toolLabel.runComfyUiWorkflow.failed");
      }
      return t2("chat.toolLabel.runComfyUiWorkflow.completed", {
        count: result.succeededCount,
      });
    }
  }
  if (entry.type === "tool" && isTransientTool(entry.toolName)) {
    return getToolDisplayLabel(entry.toolName, t2);
  }
  if (entry.type === "tool" && entry.category === "connector") {
    return getToolDisplayLabel(entry.toolName, t2);
  }
  if (
    (entry.category === "canvas" || entry.category === "plan") &&
    (entry.toolStatus === "running" || entry.toolStatus === "pending")
  ) {
    return getToolDisplayLabel(entry.toolName, t2);
  }
  if (entry.aggregatedFiles) {
    if (entry.toolStatus === "running" || entry.toolStatus === "pending") {
      const runningKey = CATEGORY_RUNNING_I18N[entry.category];
      if (runningKey) return t2(runningKey);
    }
    if (entry.toolStatus === "error") {
      const failedKey = FILE_ACTIVITY_FAILED_I18N[entry.category];
      if (failedKey) return t2(failedKey);
    }
    return t2(CATEGORY_I18N[entry.category], {
      count: entry.aggregatedFiles.length,
    });
  }
  if (entry.aggregatedSearchChips) {
    return t2("chat.activity.search", {
      count: entry.aggregatedSearchChips.length,
    });
  }
  if (
    entry.aggregatedCount &&
    (entry.category === "execute" ||
      entry.category === "process" ||
      entry.category === "canvas" ||
      entry.category === "plan")
  ) {
    return t2(CATEGORY_I18N[entry.category], {
      count: entry.aggregatedCount,
    });
  }
  if (entry.aggregatedTimelineOperations) {
    const count2 =
      entry.aggregatedTimelineOperations.reduce((sum2, operation) => sum2 + operation.count, 0) +
      (entry.aggregatedTimelineFallbackCount ?? 0);
    return t2(CATEGORY_I18N[entry.category], {
      count: count2,
    });
  }
  if (entry.category === "skillOp") {
    const name2 = extractSkillName(entry.toolArgs);
    if (!name2) return t2("chat.activity.skillLoadedFallback");
    return (
      <>
        {t2("chat.activity.skillLoadedPrefix", {
          defaultValue: "加载Skill",
        })}
        <span className="ml-1.5 inline-flex items-center rounded-sm bg-foreground/5 px-1.5 py-0.5 text-foreground/80 font-mono text-[12px]">
          {name2}
        </span>
      </>
    );
  }
  const isLyrics = entry.type === "tool" && !!entry.toolName?.includes("lyrics_");
  if (MEDIA_GEN_CATEGORIES$1.has(entry.category)) {
    if (entry.toolStatus === "running" || entry.toolStatus === "pending") {
      if (isLyrics)
        return t2("chat.activity.lyricsGen.running", {
          defaultValue: "歌词生成",
        });
      const runningKey = CATEGORY_RUNNING_I18N[entry.category];
      if (runningKey) return t2(runningKey);
      return t2(CATEGORY_I18N[entry.category], {
        count: 1,
      });
    }
    if (
      entry.toolStatus === "error" &&
      (isToolRecoveredInterrupted(entry.toolResult) || hasSuccessfulMediaOutput(entry.toolResult))
    ) {
      return t2(CATEGORY_I18N[entry.category], {
        count: 1,
      });
    }
    const failurePresentation = generationFailurePresentation(entry.toolResult);
    if (failurePresentation === "recoverable") {
      return t2("chat.activity.mediaGenRecoverable");
    }
    if (failurePresentation === "status_unknown") {
      return t2("chat.activity.mediaGenUnknown");
    }
    if (failurePresentation === "cancelled") {
      return t2("chat.activity.mediaGenCancelled");
    }
    const interruption =
      entry.toolStatus === "error"
        ? resolveToolInterruption(entry.toolResult, entry.interruption)
        : void 0;
    if (interruption === "canvas_continuation") {
      return t2("chat.activity.mediaGenInterrupted");
    }
    if (interruption === "aborted") {
      return t2("chat.activity.mediaGenAborted");
    }
    const rejectReason = resolveToolConfirmRejectReason(entry);
    if (rejectReason) return toolConfirmRejectLabel(rejectReason, t2);
    const count2 = extractMediaCount(sanitizeDisplayText(entry.toolResult));
    if (count2 === 0) return t2("chat.activity.mediaGenFailed");
    if (isLyrics)
      return t2("chat.activity.lyricsGen", {
        defaultValue: "生成了歌词",
      });
    return t2(CATEGORY_I18N[entry.category], {
      count: count2,
    });
  }
  return t2(CATEGORY_I18N[entry.category], {
    count: 1,
  });
}
function TimelineOperationRows({ operations, isActive: isActive2 }) {
  return (
    <div className="flex min-w-0 flex-col gap-2" data-timeline-operation-rows={true}>
      {operations.map((operation) => {
        const operationKey = timelineOperationKey(operation);
        return (
          <TimelineOperationRow key={operationKey} operation={operation} isActive={isActive2} />
        );
      })}
    </div>
  );
}
function TimelineOperationRow({ operation, isActive: isActive2 }) {
  const { t: t2 } = useTranslation();
  const labelKey = isActive2
    ? (operation.activeLabelKey ?? operation.labelKey)
    : operation.labelKey;
  const OperationIcon = operation.kind === "production-plan" ? ClipboardList : SquareMousePointer;
  return (
    <div className="flex min-w-0 items-center gap-1.5 text-body-14">
      <span className="flex size-4 shrink-0 items-center justify-center text-foreground">
        {isActive2 ? (
          <Spinner className="size-4 text-tertiary" />
        ) : (
          <Icon
            icon={OperationIcon}
            size="md"
            strokeWidth={TIMELINE_ICON_STROKE_WIDTH}
            className="opacity-50"
          />
        )}
      </span>
      <div className="flex min-w-0 items-center gap-1">
        <span className="shrink-0 font-normal text-muted-foreground">{t2(labelKey)}</span>
        <TimelineOperationTargetChip operation={operation} />
      </div>
    </div>
  );
}
function TimelineOperationTargetChip({ operation }) {
  const currentWorkspace = useCurrentWorkspace();
  const { activePlanId, openPlan } = useProductionPlanDisclosure();
  const canOpenPlan =
    operation.kind === "production-plan" &&
    Boolean(activePlanId && operation.targetPlanId === activePlanId);
  const handleOpenTarget = reactExports.useCallback(() => {
    if (canOpenPlan) {
      openPlan(operation.targetPlanId);
      return;
    }
    if (!currentWorkspace || operation.targetNodeIds.length === 0) return;
    workspaceEvents.fireCanvasFocus(currentWorkspace, operation.targetNodeIds, {
      select: true,
    });
  }, [canOpenPlan, currentWorkspace, openPlan, operation]);
  if (!operation.inputSummary) return null;
  if (canOpenPlan || operation.targetNodeIds.length > 0) {
    return (
      <Button$1
        type="button"
        variant="ghost"
        size="xs"
        data-action-ui-id={
          operation.kind === "production-plan"
            ? "chat-production-plan-operation-open"
            : "chat-canvas-operation-locate"
        }
        className="h-auto min-w-0 max-w-[200px] rounded-sm bg-foreground/[0.06] px-1.5 py-0.5 font-normal text-caption-11 text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
        onClick={handleOpenTarget}
      >
        <span className="min-w-0 truncate">{operation.inputSummary}</span>
      </Button$1>
    );
  }
  return (
    <span className="inline-flex max-w-[160px] items-center px-1.5 py-0.5 rounded-sm bg-foreground/[0.06] text-caption-11 text-muted-foreground">
      <span className="min-w-0 truncate">{operation.inputSummary}</span>
    </span>
  );
}
function timelineOperationKey(operation) {
  return [
    operation.kind,
    operation.targetPlanId ?? operation.targetGroupId ?? operation.targetNodeIds.join(","),
    operation.labelKey,
    operation.inputSummary,
  ].join("|");
}
const HTTP_URL_RE = /^https?:\/\//i;
const WINDOWS_ABSOLUTE_PATH_RE = /^[a-zA-Z]:[\\/]/;
const WINDOWS_UNC_PATH_RE = /^\\\\/;
function isGatewayRoute(path2) {
  return path2.startsWith("/files/") || path2.startsWith("/api/");
}
function isAbsoluteLocalPath(path2) {
  return (
    (!isGatewayRoute(path2) && path2.startsWith("/")) ||
    WINDOWS_ABSOLUTE_PATH_RE.test(path2) ||
    WINDOWS_UNC_PATH_RE.test(path2)
  );
}
function resolveFileChipMediaUrl(item, resolveUrl) {
  const source = item.url?.trim() || item.path;
  if (!source) return void 0;
  if (HTTP_URL_RE.test(source)) return source;
  if (isGatewayRoute(source)) return resolveUrl(source);
  if (isAbsoluteLocalPath(source)) return resolveUrl(API_PATHS.serveLocal(source));
  return resolveUrl(API_PATHS.serveFile(source));
}
function FileOpChipsRow({ items }) {
  const resolveUrl = useResolveMediaUrl();
  const currentWorkspace = useCurrentWorkspace();
  return (
    <div data-fileop-chips={true}>
      <div className="flex min-w-0 flex-wrap items-start gap-1">
        {items.map((item) => {
          const kind = item.kind ?? inferFileKind(item.path);
          const src = resolveFileChipMediaUrl(item, resolveUrl);
          const isImage2 = kind === "image";
          const isVideo = kind === "video";
          const isAudio = kind === "audio";
          const previewable = src && (isImage2 || isVideo || isAudio);
          const mediaProps =
            src && isImage2
              ? {
                  imageUrl: src,
                  mediaUrl: src,
                }
              : src && (isVideo || isAudio)
                ? {
                    mediaUrl: src,
                  }
                : {};
          const videoThumbnailPath =
            kind === "video" ? toWorkspaceFileRelativePath(item.path, currentWorkspace) : void 0;
          return (
            <FileChip
              key={item.path}
              filename={item.name}
              fileType={kind}
              {...mediaProps}
              videoThumbnailPath={videoThumbnailPath}
              previewOnClick={!!previewable}
              onAnchorClick={() => dispatchCanvasLocate(item.path, currentWorkspace)}
            />
          );
        })}
      </div>
    </div>
  );
}
function ProcessStepsDetail({ steps, t: t2 }) {
  return (
    <div className="flex min-w-0 flex-col gap-2" data-process-steps={true}>
      {steps.map((step, index2) => {
        const displayResult = sanitizeDisplayText(step.toolResult);
        return (
          <div
            key={step.id}
            className="min-w-0 rounded-md border border-border bg-foreground/[0.02] px-2.5 py-2"
          >
            <div className="text-body-12 font-medium text-foreground">
              {index2 + 1}
              {". "}
              {getToolDisplayLabel(step.toolName, t2)}
            </div>
            {step.toolArgs && (
              <div className="mt-1.5">
                <div className="mb-0.5 text-body-12 text-muted-foreground">{t2("chat.input")}</div>
                <ExpandableText asPre={true} lineClamp={6} className="text-body-12 font-sans">
                  {formatArgs(step.toolArgs)}
                </ExpandableText>
              </div>
            )}
            {displayResult && (
              <div className="mt-1.5">
                <div className="mb-0.5 text-body-12 text-muted-foreground">{t2("chat.output")}</div>
                <ExpandableText asPre={true} lineClamp={6} className="text-body-12 font-sans">
                  {displayResult}
                </ExpandableText>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
export function TimelineItem({
  entry,
  isActive: isActive2,
  onSend,
  showDetailRail = true,
  showThinkingSummary = true,
  defaultDetailExpanded = false,
}) {
  const { t: t2 } = useTranslation();
  const isComfyUiRun = entry.type === "tool" && entry.toolName === "hub_run_comfyui_workflow";
  const comfyUiRunResult = isComfyUiRun ? parseComfyUiRunDisplayResult(entry.toolResult) : void 0;
  const isComfyUiRunning =
    isComfyUiRun && (entry.toolStatus === "running" || entry.toolStatus === "pending");
  const [detailExpanded, setDetailExpanded] = reactExports.useState(
    () =>
      defaultDetailExpanded ||
      !!entry.pendingConfirm ||
      isComfyUiRunning ||
      entry.interruption === "canvas_continuation" ||
      Boolean(comfyUiRunResult?.outputFiles.length),
  );
  reactExports.useEffect(() => {
    if (entry.pendingConfirm) setDetailExpanded(true);
  }, [entry.pendingConfirm]);
  reactExports.useEffect(() => {
    if (comfyUiRunResult?.terminal && comfyUiRunResult.outputFiles.length > 0) {
      setDetailExpanded(true);
    }
  }, [comfyUiRunResult?.terminal, comfyUiRunResult?.outputFiles.length]);
  reactExports.useEffect(() => {
    if (isComfyUiRunning) setDetailExpanded(true);
  }, [isComfyUiRunning]);
  reactExports.useEffect(() => {
    if (entry.interruption === "canvas_continuation") setDetailExpanded(true);
  }, [entry.interruption]);
  const rawToolView = useDebugFlag(DEBUG_FLAGS.rawToolView);
  const isMediaGen = MEDIA_GEN_CATEGORIES$1.has(entry.category);
  const isConnector = entry.type === "tool" && entry.category === "connector";
  const detailEligible = isMediaGen || isConnector || rawToolView;
  const knowledgePaths =
    entry.type === "tool" ? extractKnowledgePaths(entry.toolName, entry.toolArgs) : void 0;
  const displayToolResult = entry.type === "tool" ? sanitizeDisplayText(entry.toolResult) : void 0;
  const showToolResult =
    entry.type === "tool" && detailEligible && displayToolResult && entry.toolName !== "hub_read";
  const aggregatedFileItems = entry.aggregatedFiles ?? comfyUiRunResult?.outputFiles;
  const aggregatedProcessSteps = entry.aggregatedProcessSteps;
  const aggregatedCommands = entry.aggregatedCommands;
  const isAggregated = entry.type === "tool" && Boolean(aggregatedFileItems?.length);
  const hasDetail =
    isComfyUiRunning ||
    isAggregated ||
    Boolean(aggregatedProcessSteps?.length) ||
    Boolean(aggregatedCommands?.length) ||
    !!entry.pendingConfirm ||
    (entry.type === "tool" &&
      detailEligible &&
      (knowledgePaths || entry.toolArgs || showToolResult)) ||
    (entry.type === "thinking" && entry.thinkingContent);
  const Icon2 = CATEGORY_ICON[entry.category];
  const isFailed =
    entry.type === "tool" &&
    entry.toolStatus === "error" &&
    !isGenerationFailureNonTerminal(entry.toolResult) &&
    !isToolRecoveredInterrupted(entry.toolResult) &&
    !resolveToolInterruption(entry.toolResult, entry.interruption) &&
    !hasSuccessfulMediaOutput(entry.toolResult);
  const DisplayIcon = isFailed ? CATEGORY_ICON.mediaGenFailed : Icon2;
  const timelineIconSize = getTimelineIconSize(entry);
  const timelineOperations =
    entry.type === "tool" && (entry.category === "canvas" || entry.category === "plan")
      ? entry.aggregatedTimelineOperations
      : void 0;
  const isTimelineOperationInFlight =
    entry.type === "tool" &&
    (entry.category === "canvas" || entry.category === "plan") &&
    (entry.toolStatus === "running" || entry.toolStatus === "pending");
  const isGeneratingMedia =
    isMediaGen &&
    entry.type === "tool" &&
    (entry.toolStatus === "running" || entry.toolStatus === "pending");
  reactExports.useEffect(() => {
    if (isGeneratingMedia) setDetailExpanded(true);
  }, [isGeneratingMedia]);
  if (
    (entry.category === "canvas" || entry.category === "plan") &&
    !timelineOperations?.length &&
    !isTimelineOperationInFlight &&
    !entry.pendingConfirm &&
    !entry.rejectedConfirm &&
    !rawToolView
  ) {
    return null;
  }
  if (
    timelineOperations?.length &&
    !entry.pendingConfirm &&
    !entry.rejectedConfirm &&
    !rawToolView
  ) {
    return <TimelineOperationRows operations={timelineOperations} isActive={isActive2} />;
  }
  const toggleDetail = () => setDetailExpanded((v2) => !v2);
  const handleDetailKeyDown = (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    toggleDetail();
  };
  const detailInteractionProps = hasDetail
    ? {
        role: "button",
        tabIndex: 0,
        "aria-expanded": detailExpanded,
        onClick: toggleDetail,
        onKeyDown: handleDetailKeyDown,
      }
    : {};
  const capabilityResult =
    entry.toolStatus === "ok"
      ? parseCapabilitySearchCardResult(entry.toolName, entry.toolResult)
      : null;
  if (capabilityResult)
    return (
      <CapabilitySearchCard result={capabilityResult} searchCallId={entry.toolCallId ?? entry.id} />
    );
  return (
    <div
      className={`relative ${isActive2 || (isMediaGen && detailExpanded) ? "" : "hover:opacity-90"} transition-opacity`}
      data-action-ui-id={isConnector ? "chat-connector-tool" : void 0}
      data-tool-name={isConnector ? entry.toolName : void 0}
      data-tool-status={isConnector ? entry.toolStatus : void 0}
    >
      <div
        className={`flex w-full items-center gap-1.5 py-0 text-left ${hasDetail ? "cursor-pointer" : "cursor-default"}`}
        {...detailInteractionProps}
        data-action-ui-id={isConnector && hasDetail ? "chat-connector-tool-details" : void 0}
      >
        <span className="shrink-0 size-4 flex items-center justify-center text-foreground">
          {isActive2 ? (
            <Spinner className="size-4 text-tertiary" />
          ) : (
            <DisplayIcon
              size={timelineIconSize}
              strokeWidth={TIMELINE_ICON_STROKE_WIDTH}
              className="opacity-50"
            />
          )}
        </span>
        <div className="min-w-0 flex-1 text-body-14 flex items-center gap-1">
          <span
            className="text-muted-foreground font-normal truncate"
            title={isConnector ? entry.toolName : void 0}
          >
            {entry.type === "thinking" ? t2("chat.activity.thought") : renderToolLabel(entry, t2)}
          </span>
          {entry.type === "thinking" && showThinkingSummary && entry.thinkingContent && (
            <span className="min-w-0 max-w-[240px] truncate text-muted-foreground">
              {"· "}
              {thinkingSummary(entry.thinkingContent)}
            </span>
          )}
          {(rawToolView ||
            (isConnector && getToolDisplayLabel(entry.toolName, t2) !== entry.toolName)) &&
            entry.type === "tool" &&
            entry.toolName && (
              <span
                className="min-w-0 truncate font-mono text-caption-10 text-muted-foreground"
                title={entry.toolName}
              >
                {entry.toolName}
              </span>
            )}
          {isConnector && entry.toolStatus !== "running" && (
            <span className="shrink-0 text-body-12 text-muted-foreground">
              {getToolStatusLabel(entry.toolStatus, t2, entry.toolResult, entry.interruption)}
            </span>
          )}
          {hasDetail && (
            <ChevronDown
              size={TIMELINE_ICON_SIZE}
              strokeWidth={TIMELINE_ICON_STROKE_WIDTH}
              className={`shrink-0 text-muted-foreground transition-transform ${detailExpanded ? "" : "-rotate-90"}`}
            />
          )}
        </div>
      </div>
      <div
        className={`grid transition-[grid-template-rows] duration-200 ease-out ${detailExpanded && hasDetail ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="overflow-hidden min-h-0">
          <div className="relative pt-2">
            {detailExpanded && hasDetail && showDetailRail && (
              <span
                aria-hidden="true"
                data-action-ui-id="chat-timeline-detail-rail"
                className="absolute left-[7px] top-2 bottom-0 w-[var(--brutalist-border-width)] bg-tertiary/25 pointer-events-none"
              />
            )}
            {hasDetail &&
              (entry.pendingConfirm && onSend ? (
                <DetailCornerWrap dataMessageId={entry.pendingConfirm.id}>
                  <ToolConfirmCard message={entry.pendingConfirm} onSend={onSend} embedded={true} />
                </DetailCornerWrap>
              ) : isComfyUiRunning ? (
                <DetailCornerWrap>
                  <div
                    data-action-ui-id="chat-comfyui-progress"
                    className="flex min-w-0 flex-col gap-2 rounded-md border border-border bg-foreground/[0.02] px-3 py-2.5"
                  >
                    {entry.comfyUiProgress ? (
                      <>
                        <div className="flex min-w-0 items-center justify-between gap-3 text-body-12">
                          <span className="min-w-0 truncate text-foreground">
                            {entry.comfyUiProgress.workflow_title ||
                              entry.comfyUiProgress.workflow_id}
                          </span>
                          <span className="shrink-0 text-muted-foreground">
                            {t2("chat.toolLabel.runComfyUiWorkflow.progressCompleted", {
                              completed:
                                entry.comfyUiProgress.completed_count ??
                                entry.comfyUiProgress.succeeded_count +
                                  entry.comfyUiProgress.failed_count,
                              total: entry.comfyUiProgress.requested_count,
                            })}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-caption-10 text-muted-foreground">
                          <span>
                            {t2("chat.toolLabel.runComfyUiWorkflow.progressQueued", {
                              count: entry.comfyUiProgress.queued_count,
                            })}
                          </span>
                          <span>
                            {t2("chat.toolLabel.runComfyUiWorkflow.progressRunning", {
                              count: entry.comfyUiProgress.running_count,
                            })}
                          </span>
                          <span>
                            {t2("chat.toolLabel.runComfyUiWorkflow.progressMaterializing", {
                              count: entry.comfyUiProgress.materializing_count ?? 0,
                            })}
                          </span>
                          <span>
                            {t2("chat.toolLabel.runComfyUiWorkflow.progressElapsed", {
                              elapsed: formatElapsedMilliseconds(
                                entry.comfyUiProgress.elapsed_ms ?? 0,
                              ),
                            })}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="text-body-12 text-muted-foreground">
                        {t2("chat.toolLabel.runComfyUiWorkflow.progressDescription")}
                      </div>
                    )}
                    <Progress
                      value={
                        entry.comfyUiProgress
                          ? Math.round(
                              ((entry.comfyUiProgress.completed_count ??
                                entry.comfyUiProgress.succeeded_count +
                                  entry.comfyUiProgress.failed_count) /
                                Math.max(1, entry.comfyUiProgress.requested_count)) *
                                100,
                            )
                          : null
                      }
                      aria-label={t2("chat.toolLabel.runComfyUiWorkflow.running")}
                    />
                  </div>
                </DetailCornerWrap>
              ) : aggregatedFileItems ? (
                <DetailCornerWrap>
                  <FileOpChipsRow items={aggregatedFileItems} />
                </DetailCornerWrap>
              ) : aggregatedCommands?.length ? (
                <DetailCornerWrap>
                  <div className="flex min-w-0 flex-col gap-2" data-command-details={true}>
                    {aggregatedCommands.map(({ id: id2, command: command2 }) => (
                      <div
                        key={id2}
                        className="min-w-0 rounded-md border border-border bg-foreground/[0.02] px-2.5 py-2"
                      >
                        <ExpandableText asPre={true} lineClamp={6} className="text-body-12">
                          {command2}
                        </ExpandableText>
                      </div>
                    ))}
                  </div>
                </DetailCornerWrap>
              ) : aggregatedProcessSteps?.length ? (
                <DetailCornerWrap>
                  <ProcessStepsDetail steps={aggregatedProcessSteps} t={t2} />
                </DetailCornerWrap>
              ) : isMediaGen && entry.type === "tool" ? (
                <DetailCornerWrap>
                  <MediaGenDetail entry={entry} />
                </DetailCornerWrap>
              ) : (
                <DetailCornerWrap>
                  <div className="flex flex-col gap-2 text-body-14 text-muted-foreground">
                    {entry.type === "thinking" && entry.thinkingContent && (
                      <ExpandableText lineClamp={8}>{entry.thinkingContent}</ExpandableText>
                    )}
                    {entry.type === "tool" && entry.toolArgs && !knowledgePaths && (
                      <div>
                        <div className="text-muted-foreground mb-0.5">{t2("chat.input")}</div>
                        <ExpandableText
                          asPre={true}
                          lineClamp={6}
                          className="text-body-14 font-sans"
                        >
                          {formatArgs(entry.toolArgs)}
                        </ExpandableText>
                      </div>
                    )}
                    {knowledgePaths && (
                      <ExpandableText asPre={true} lineClamp={6} className="text-body-14 font-sans">
                        {knowledgePaths.short}
                      </ExpandableText>
                    )}
                    {showToolResult && !knowledgePaths && (
                      <div>
                        <div className="text-muted-foreground mb-0.5">{t2("chat.output")}</div>
                        <ExpandableText
                          asPre={true}
                          lineClamp={6}
                          className="text-body-14 font-sans"
                        >
                          {displayToolResult}
                        </ExpandableText>
                      </div>
                    )}
                  </div>
                </DetailCornerWrap>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
function DetailCornerWrap({ children: children2, dataMessageId }) {
  return (
    <div className="ml-[9px] pl-3 min-w-0" data-message-id={dataMessageId}>
      {children2}
    </div>
  );
}
export function ToolActivityDisclosure({
  entries: entries2,
  isActive: isActive2,
  keepExpanded,
  children: children2,
}) {
  const { t: t2 } = useTranslation();
  const contentId = reactExports.useId();
  const [userExpanded, setUserExpanded] = reactExports.useState(null);
  const expanded = userExpanded ?? (keepExpanded || isActive2);
  const summary = summarizeTimelineEntries(entries2)
    .map(({ category, count: count2 }) => {
      const inFlight = entries2.some(
        (entry) =>
          entry.category === category &&
          (entry.toolStatus === "running" || entry.toolStatus === "pending"),
      );
      const key2 = (inFlight && CATEGORY_RUNNING_I18N[category]) || CATEGORY_I18N[category];
      return t2(key2, {
        count: count2,
      });
    })
    .join(" · ");
  const handleToggle = () => setUserExpanded(!expanded);
  return (
    <div className="flex min-w-0 flex-col gap-2" data-action-ui-id="chat-tool-activity-group">
      <Button$1
        variant="ghost"
        size="sm"
        className="h-auto w-fit max-w-full justify-start gap-1.5 px-0 py-0 font-normal text-muted-foreground hover:bg-transparent aria-expanded:bg-transparent aria-expanded:text-muted-foreground"
        data-action-ui-id="chat-tool-activity-toggle"
        aria-expanded={expanded}
        aria-controls={contentId}
        aria-label={summary}
        aria-busy={isActive2}
        onClick={handleToggle}
        title={summary}
      >
        {isActive2 ? (
          <Spinner className="size-4 text-tertiary" />
        ) : (
          <Wrench className="size-4" strokeWidth={1.5} />
        )}
        <span className="min-w-0 truncate text-body-14">{summary}</span>
        <ChevronRight$1
          className={`size-3.5 transition-transform ${expanded ? "rotate-90" : ""}`}
          strokeWidth={1.5}
        />
      </Button$1>
      <div id={contentId} hidden={!expanded}>
        <div className="flex min-w-0 flex-col gap-2 pl-5">{children2}</div>
      </div>
    </div>
  );
}
