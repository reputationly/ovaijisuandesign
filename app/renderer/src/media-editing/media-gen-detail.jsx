// ==== 逐文件收敛 ====
import { media, reason } from "../canvas-v3/canvas-v3-model.js";
// media-gen-detail.jsx
import { API_PATHS } from "../infra/workspace-gateway.js";
import { GENERATE_ERROR_CODE_IMAGE_ASPECT_RATIO_CONFLICT } from "../infra/generation-errors.js";
import { useCurrentWorkspace } from "../infra/shared-runtime.js";
import reactExports from "react";
import { useTranslation } from "react-i18next";
import { Check, ChevronLeft, ChevronRight$1 as ChevronRight, CircleAlert, Copy, Crosshair } from "./lucide-icon-wraps.js";
import {
  Icon,
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
} from "../vendor-inline/vscode-base/graph.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { TooltipContent } from "../infra/dialog-content.jsx";
import { useResolveMediaUrl } from "../workspace/tool-label-definitions.js";
import { Clock, useAssetMeta, useGenerating } from "./package.jsx";
import { workspaceEvents } from "../workspace/topbar-state-context.jsx";
import {
  AudioPlaceholderIcon,
  GeneratingMediaArea,
  TextPlaceholderIcon,
  VideoPlaceholderIcon,
} from "../canvas/generating-media-area.jsx";
import { ImagePlaceholderIcon } from "../canvas/file-missing-icon.jsx";
import { ArtifactAssetCard } from "../generation/artifact-asset-card.jsx";
import { GENERATE_ERROR_CODE_BILLING_INSUFFICIENT_BALANCE } from "../generation/normalize-skill-detail-metadata.js";
import { INSUFFICIENT_BALANCE_TEXT_PATTERN } from "../generation/to-workspace-browser-url.js";
import {
  artifactAssetTypeFromPath,
  GENERATION_ERROR_CODE_I18N,
  generationFailurePresentation,
  hasSuccessfulMediaOutput,
  isToolRecoveredInterrupted,
  resolveMediaTaskCategory,
  resolveToolInterruption,
} from "../chat/has-structured-success-payload.js";
import { stripErrorHtml } from "../infra/create-recently-added-store.js";
import { Popover } from "../assets/credit-query-keys.jsx";
import { PopoverTrigger } from "../assets/gateway-scope-provider.jsx";
import { PopoverContent } from "../team/hailuo-credit-row.jsx";
import {
  redactForCurrentRegion,
  resolveModelNameForCurrentRegion,
} from "../generation/replace-configured-model-names-for-current-region.js";
import { ExpandableText } from "../text-editor/expandable-text.jsx";
import {
  formatArgs,
  isHiddenVideoGenerationMode,
  registryMediaTypeForCategory,
} from "../chat/use-tool-confirm-settlement.js";
import {
  CATEGORY_ICON,
  normalizeStructuredToolResult,
  resolveToolConfirmRejectReason,
  sanitizeDisplayText,
  toolConfirmRejectLabel,
} from "./turn-artifact-strip.jsx";
import { useMentionModels } from "../generation/use-mention-models.jsx";
import { SkillIcon } from "../workspace/use-prompt-icon.jsx";
const VIDEO_MODE_I18N_KEYS = new Map([
  ["first-last-frame", "chat.videoMode.firstLastFrame"],
  ["multimodal", "chat.videoMode.omniReference"],
  ["omni", "chat.videoMode.omniReference"],
  ["video-edit", "chat.videoMode.videoEdit"],
  ["video-extend", "chat.videoMode.videoExtend"],
  ["avatar", "chat.videoMode.avatar"],
]);
function resolveVideoModeValueDisplay(value, translate) {
  const i18nKey = VIDEO_MODE_I18N_KEYS.get(value);
  if (!i18nKey) return value;
  return translate(i18nKey, {
    defaultValue: value,
  });
}
const CREDITS_INSUFFICIENT_TEXT_PATTERN =
  /credits?\s+(?:are|is|were)\s+insufficient/i;
const IMAGE_ASPECT_RATIO_CONFLICT_TEXT_PATTERN =
  /vendor_params\.aspect_ratio=\S+\s+conflicts with (?:source_ref|canvas_source) dimensions \d+x\d+;\s*nearest supported ratio for \S+ is \S+/i;
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
const LEGACY_ERROR_CODE_MATCHERS = Object.keys(GENERATION_ERROR_CODE_I18N).map(
  (code) => [
    code,
    new RegExp(
      `(?:\\[\\s*${escapeRegExp(code)}\\s*\\]|["']?error_code["']?\\s*[:=]\\s*["']?${escapeRegExp(code)}(?![a-z0-9_]))`,
      "i",
    ),
  ],
);
function hasMappedErrorCode(code) {
  return Object.hasOwn(GENERATION_ERROR_CODE_I18N, code);
}
function mappedErrorCode({ errorCode, rawError }) {
  const normalizedCode = errorCode?.trim().toLowerCase();
  if (normalizedCode && hasMappedErrorCode(normalizedCode))
    return normalizedCode;
  const raw = rawError?.trim();
  if (!raw) return void 0;
  if (IMAGE_ASPECT_RATIO_CONFLICT_TEXT_PATTERN.test(raw)) {
    return GENERATE_ERROR_CODE_IMAGE_ASPECT_RATIO_CONFLICT;
  }
  return LEGACY_ERROR_CODE_MATCHERS.find(([, pattern]) =>
    pattern.test(raw),
  )?.[0];
}
function isBillingInsufficientFailure({ errorCode, rawError }) {
  const normalizedCode = errorCode?.trim().toLowerCase();
  if (normalizedCode === "billing_insufficient_balance") return true;
  const raw = rawError?.trim();
  if (!raw) return false;
  return (
    raw.toLowerCase().includes("billing_insufficient_balance") ||
    INSUFFICIENT_BALANCE_TEXT_PATTERN.test(raw) ||
    CREDITS_INSUFFICIENT_TEXT_PATTERN.test(raw)
  );
}
function generationFailureDisplayText(input, translate) {
  const userMessage = stripErrorHtml(input.userMessage).trim();
  if (userMessage) return userMessage;
  const errorCode = mappedErrorCode(input);
  if (errorCode)
    return stripErrorHtml(translate(GENERATION_ERROR_CODE_I18N.errorCode)).trim();
  if (isBillingInsufficientFailure(input)) {
    return stripErrorHtml(translate("chat.billingInsufficient.title")).trim();
  }
  return (
    stripErrorHtml(input.rawError).trim() ||
    stripErrorHtml(translate("chat.activity.mediaGenFailed")).trim()
  );
}
function MediaGenCardLayout({
  prompt,
  tags,
  media: media2,
  footer,
  header:header,
  className,
}) {
  return (
    <div className={`w-full min-w-0 flex flex-col gap-2 ${className ?? ""}`}>
      {header}
      {prompt}
      {tags}
      {media}
      {footer}
    </div>
  );
}
const MODEL_TAG_KEYS = new Set(["model_name", "model", "model_id", "series"]);
const TAG_I18N_KEYS = {
  model_name: "canvas.model",
  model: "canvas.model",
  model_id: "canvas.model",
  series: "canvas.model",
  aspect_ratio: "canvas.params.aspectRatio",
  duration: "canvas.params.duration",
  resolution: "canvas.params.resolution",
  version: "canvas.params.version",
  style: "canvas.params.style",
  quality: "canvas.params.quality",
  size: "canvas.params.resolution",
  voice_id: "canvas.params.voiceId",
  emotion: "canvas.params.emotion",
  speed: "canvas.params.speed",
};
function TagsRow({ tags, tagIcons, categoryIcon , flushStart = false}) {
  const { t } = useTranslation();
  if (tags.length === 0) return null;
  return (
    <TooltipProvider delay={0}>
      <div className="flex items-center gap-1 h-7 text-body-12 text-foreground/70 overflow-x-auto scrollbar-none">
        {tags.map((displayTag, tagIndex) => {
          const TagIcon = MODEL_TAG_KEYS.has(displayTag.key)
            ? categoryIcon
            : tagIcons?.[displayTag.key];
          const i18nKey = TAG_I18N_KEYS[displayTag.key];
          const tooltip = i18nKey ? t(i18nKey) : displayTag.key;
          const isLast = tagIndex === tags.length - 1;
          return (
            <span
              key={displayTag.key}
              className="inline-flex items-center gap-1 shrink-0"
            >
              <Tooltip>
                <TooltipTrigger
                  className={`inline-flex items-center gap-0.5 shrink-0 rounded-sm ${flushStart && i2 === 0 ? "pl-0 pr-2" : "px-2"}`}
                  style={{
                    cursor: "pointer",
                  }}
                >
                  {TagIcon && (
                    <TagIcon size={16} strokeWidth={1} className="shrink-0" />
                  )}
                  <span className="whitespace-nowrap">{displayTag.value}</span>
                </TooltipTrigger>
                <TooltipContent>{tooltip}</TooltipContent>
              </Tooltip>
              {!isLast && (
                <span
                  aria-hidden="true"
                  className="block h-[10px] w-px shrink-0 bg-foreground/15"
                />
              )}
            </span>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
const INTERNAL_FIELDS = new Set([
  "_session_id",
  "_tool_use_id",
  "_user_override_note",
  "filename",
]);
const PROMPT_FIELDS = new Set(["prompt", "text", "description", "lyrics"]);
const MODEL_TAG_FIELDS = new Set(["model_name", "model", "model_id"]);
const CAPABILITY_VIDEO_TOOL_NAMES = new Set([
  "hub_generate_video",
  "generate_video",
]);
const MISPLACED_CAPABILITY_VIDEO_TAG_FIELDS = new Set([
  "aspect_ratio",
  "ratio",
  "resolution",
]);
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
function formatVersionTag(value) {
  const niji = value.match(/^niji\s*(\d+)$/i);
  if (niji) return `Niji ${niji[1]}`;
  return /^\d/.test(value) ? `v${value}` : value;
}
function tagDisplayValue(key, value, translate, preferType, modelDisplayMap) {
  if (MODEL_TAG_FIELDS.has(key)) {
    const modelName = String(value);
    return (
      modelDisplayMap?.get(modelName) ??
      resolveModelNameForCurrentRegion(modelName, preferType)
    );
  }
  if (key === "mode") {
    const modeValue = String(value);
    if (isHiddenVideoGenerationMode(modeValue)) return null;
    return resolveVideoModeValueDisplay(modeValue, translate);
  }
  if (key === "version") return formatVersionTag(String(value));
  const raw = String(value);
  return translate(`canvas.param.option.${raw}`, {
    defaultValue: raw,
  });
}
function vendorParamsHasMode(args) {
  const vendorParameters = args.vendor_params;
  return (
    vendorParameters != null && typeof vendorParameters === "object" && !Array.isArray(vendorParameters) && "mode" in vendorParameters
  );
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
  for (const [key, value] of Object.entries(parsed)) {
    if (!REF_MEDIA_FIELDS.has(key)) continue;
    if (typeof value === "string" && value.length > 0) {
      if (value.startsWith("[")) {
        try {
          const parsedPaths = JSON.parse(value);
          if (Array.isArray(parsedPaths)) {
            for (const path of parsedPaths) {
              if (typeof path === "string" && path.length > 0) paths.push(path);
            }
            continue;
          }
        } catch {}
      }
      paths.push(value);
    } else if (Array.isArray(value)) {
      for (const path of value) {
        if (typeof path === "string" && path.length > 0) paths.push(path);
      }
    }
  }
  return paths;
}
function parseGenInput(toolArgs, translate, preferType, toolName, modelDisplayMap) {
  if (!toolArgs) return void 0;
  try {
    const parsed = JSON.parse(toolArgs);
    if (!parsed || typeof parsed !== "object") return void 0;
    let prompt;
    const tags = [];
    const tagKeys = new Set();
    const pushTag = (key, value) => {
      if (tagKeys.has(key)) return;
      tags.push({
        key,
        value,
      });
      tagKeys.add(key);
    };
    for (const [key, value] of Object.entries(parsed)) {
      if (INTERNAL_FIELDS.has(key)) continue;
      if (
        toolName &&
        CAPABILITY_VIDEO_TOOL_NAMES.has(toolName) &&
        MISPLACED_CAPABILITY_VIDEO_TAG_FIELDS.has(key)
      ) {
        continue;
      }
      if (key === "mode" && vendorParamsHasMode(parsed)) continue;
      if (!prompt && PROMPT_FIELDS.has(key) && typeof value === "string") {
        prompt = value;
      } else if (
        !prompt &&
        BATCH_PROMPT_FIELDS.has(key) &&
        Array.isArray(value)
      ) {
        const first = value.find(
          (candidateValue) => typeof candidateValue === "string" && candidateValue.length > 0,
        );
        if (first) prompt = first;
      } else if (
        DISPLAY_TAG_FIELDS.has(key) &&
        value != null &&
        value !== ""
      ) {
        const display = tagDisplayValue(
          key,
          value,
          translate,
          preferType,
          modelDisplayMap,
        );
        if (display !== null) pushTag(key, display);
      }
    }
    if (
      parsed.vendor_params != null &&
      typeof parsed.vendor_params === "object" &&
      !Array.isArray(parsed.vendor_params)
    ) {
      for (const [vendorKey, vendorValue] of Object.entries(parsed.vendor_params)) {
        if (!VENDOR_PARAM_TAG_KEYS.has(vendorKey)) continue;
        if (vendorValue == null || vendorValue === "") continue;
        const display = tagDisplayValue(
          vendorKey,
          vendorValue,
          translate,
          preferType,
          modelDisplayMap,
        );
        if (display !== null) pushTag(vendorKey, display);
      }
    }
    const refPaths = collectRefPaths(parsed);
    return {
      prompt,
      tags,
      refPaths,
    };
  } catch {
    return void 0;
  }
}
function parseBatchItems(
  toolArgs,
  toolResult,
  translate,
  preferType,
  modelDisplayMap,
) {
  if (!toolArgs) return void 0;
  try {
    const args = JSON.parse(toolArgs);
    if (!args || typeof args !== "object") return void 0;
    let batchCount = 0;
    for (const key of BATCH_PROMPT_FIELDS) {
      if (Array.isArray(args[key]) && args[key].length > 1) {
        batchCount = args[key].length;
        break;
      }
    }
    if (batchCount === 0) return void 0;
    const results = [];
    const sanitizedToolResult = normalizeStructuredToolResult(toolResult);
    if (sanitizedToolResult) {
      try {
        const parsedResult = JSON.parse(sanitizedToolResult);
        if (Array.isArray(parsedResult?.results)) {
          for (const resultEntry of parsedResult.results) results.push(resultEntry ?? {});
        } else if (Array.isArray(parsedResult?.paths)) {
          for (const outputPath of parsedResult.paths)
            results.push({
              paths: [outputPath],
            });
        }
      } catch {}
    }
    const items = [];
    for (let batchIndex = 0; batchIndex < batchCount; batchIndex++) {
      let prompt;
      const tags = [];
      for (const [key, value] of Object.entries(args)) {
        if (INTERNAL_FIELDS.has(key) || key === "count") continue;
        if (key === "mode" && vendorParamsHasMode(args)) continue;
        if (BATCH_ARRAY_FIELDS.has(key) && Array.isArray(value)) {
          const itemValue = value[batchIndex];
          if (itemValue == null || itemValue === "") continue;
          const singular = key.replace(/s$/, "").replace(/ies$/, "y");
          if (BATCH_PROMPT_FIELDS.has(key) && typeof itemValue === "string") {
            prompt = itemValue;
          } else if (
            DISPLAY_TAG_FIELDS.has(singular) &&
            itemValue != null &&
            itemValue !== ""
          ) {
            const display = tagDisplayValue(
              singular,
              itemValue,
              translate,
              preferType,
              modelDisplayMap,
            );
            if (display !== null)
              tags.push({
                key: singular,
                value: display,
              });
          }
        } else if (!BATCH_ARRAY_FIELDS.has(key)) {
          if (!prompt && PROMPT_FIELDS.has(key) && typeof value === "string") {
            prompt = value;
          } else if (
            DISPLAY_TAG_FIELDS.has(key) &&
            value != null &&
            value !== ""
          ) {
            if (!tags.some((existingTag) => existingTag.key === key)) {
              const display = tagDisplayValue(
                key,
                value,
                translate,
                preferType,
                modelDisplayMap,
              );
              if (display !== null)
                tags.push({
                  key,
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
        for (const [vendorKey, vendorValue] of Object.entries(args.vendor_params)) {
          if (!VENDOR_PARAM_TAG_KEYS.has(vendorKey)) continue;
          if (vendorValue == null || vendorValue === "") continue;
          if (tags.some((existingTag) => existingTag.key === vendorKey)) continue;
          const display = tagDisplayValue(
            vendorKey,
            vendorValue,
            translate,
            preferType,
            modelDisplayMap,
          );
          if (display !== null)
            tags.push({
              key: vendorKey,
              value: display,
            });
        }
      }
      const resultEntry = results[batchIndex];
      const outputPaths = [];
      if (resultEntry) {
        if (Array.isArray(resultEntry.paths)) {
          for (const outputPath of resultEntry.paths)
            if (typeof outputPath === "string") outputPaths.push(outputPath);
        } else if (typeof resultEntry.path === "string") {
          outputPaths.push(resultEntry.path);
        }
      }
      const refPaths = collectRefPaths(args);
      items.push({
        input: {
          prompt,
          tags,
          refPaths,
        },
        outputPaths,
        error: sanitizeDisplayText(resultEntry?.error),
        errorCode: sanitizeDisplayText(resultEntry?.error_code),
        userMessage: sanitizeDisplayText(resultEntry?.user_message),
      });
    }
    return items;
  } catch {
    return void 0;
  }
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
    const record = parsed;
    for (const key of ["error", "message", "reason", "detail", "content"]) {
      const value = record[key];
      if (typeof value === "string" && value.trim())
        return sanitizeDisplayText(value);
    }
    if (
      record.is_error === true ||
      record.ok === false ||
      record.success === false
    ) {
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
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      return void 0;
    const record = parsed;
    for (const key of ["error_code", "code"]) {
      const value = record[key];
      if (typeof value === "string" && value.trim())
        return sanitizeDisplayText(value);
    }
    const nestedError = record.error;
    if (
      !nestedError ||
      typeof nestedError !== "object" ||
      Array.isArray(nestedError)
    ) {
      return void 0;
    }
    for (const key of ["error_code", "code"]) {
      const value = nestedError[key];
      if (typeof value === "string" && value.trim())
        return sanitizeDisplayText(value);
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
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      return void 0;
    const record = parsed;
    const userMessage = record.user_message;
    if (typeof userMessage === "string" && userMessage.trim()) {
      return sanitizeDisplayText(userMessage);
    }
    const nestedError = record.error;
    if (
      !nestedError ||
      typeof nestedError !== "object" ||
      Array.isArray(nestedError)
    ) {
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
function parseEffectiveParams(value) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return void 0;
  const entries = Object.entries(value).filter(
    (entry) => typeof entry[1] === "string",
  );
  return entries.length > 0 ? Object.fromEntries(entries) : void 0;
}
function parseGenOutput(toolResult, toolName) {
  if (!toolResult) return void 0;
  try {
    const sanitizedToolResult = normalizeStructuredToolResult(toolResult);
    if (!sanitizedToolResult) return void 0;
    const parsed = JSON.parse(sanitizedToolResult);
    const paths = [];
    if (Array.isArray(parsed?.paths)) {
      for (const outputPath of parsed.paths) {
        if (typeof outputPath === "string" && outputPath.length > 0 && !outputPath.startsWith("["))
          paths.push(outputPath);
      }
    } else if (Array.isArray(parsed?.results)) {
      for (const resultEntry of parsed.results) {
        if (Array.isArray(resultEntry?.paths)) {
          for (const outputPath of resultEntry.paths) {
            if (typeof outputPath === "string") paths.push(outputPath);
          }
        } else if (typeof resultEntry?.path === "string") {
          paths.push(resultEntry.path);
        }
      }
    } else if (typeof parsed?.path === "string" && parsed.path.length > 0) {
      paths.push(parsed.path);
    }
    const category = resolveMediaTaskCategory(toolName ?? "");
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
      typeof parsed?.song_title === "string" &&
      parsed.song_title.trim().length > 0
        ? parsed.song_title
        : void 0;
    const styleTags =
      typeof parsed?.style_tags === "string" &&
      parsed.style_tags.trim().length > 0
        ? parsed.style_tags
        : void 0;
    const readVoiceId = (candidate) => {
      const value = candidate?.voice_id;
      return typeof value === "string" && value.trim().length > 0
        ? value
        : void 0;
    };
    const resultItems = Array.isArray(parsed?.results) ? parsed.results : [];
    const voiceId =
      readVoiceId(parsed) ?? resultItems.map(readVoiceId).find(Boolean);
    const voiceCount = resultItems.reduce((total, item) => {
      const voices = item?.voices;
      return total + (Array.isArray(voices) ? voices.length : 0);
    }, 0);
    const formattedLyrics =
      typeof parsed?.formatted_lyrics === "string" &&
      parsed.formatted_lyrics.trim().length > 0
        ? parsed.formatted_lyrics
        : void 0;
    const structureResult =
      typeof parsed?.structure_result === "string" &&
      parsed.structure_result.trim().length > 0
        ? parsed.structure_result
        : void 0;
    const audioDuration =
      typeof parsed?.audio_duration === "number"
        ? parsed.audio_duration
        : void 0;
    return {
      paths,
      mediaType,
      error: parsedError,
      errorCode: extractFailureCode(toolResult),
      userMessage: extractUserMessage(toolResult),
      effectiveParams,
      lyrics,
      songTitle,
      styleTags,
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
function tagSemanticKey(key) {
  if (MODEL_TAG_FIELDS.has(key)) return "model";
  if (key === "ratio" || key === "aspect_ratio") return "aspect_ratio";
  return key;
}
const GENERATION_TAG_ORDER = {
  model: 0,
  aspect_ratio: 1,
  resolution: 2,
};
function sortGenerationTags(tags) {
  return [...tags].sort(
    (firstTag, secondTag) =>
      (GENERATION_TAG_ORDER[tagSemanticKey(firstTag.key)] ?? 3) -
      (GENERATION_TAG_ORDER[tagSemanticKey(secondTag.key)] ?? 3),
  );
}
function applyEffectiveParamTags(
  input,
  effectiveParams,
  translate,
  preferType,
  modelDisplayMap,
) {
  if (!input || !effectiveParams) return input;
  const effectiveTags = [];
  for (const [key, value] of Object.entries(effectiveParams)) {
    if (!DISPLAY_TAG_FIELDS.has(key) || value === "") continue;
    const display = tagDisplayValue(
      key,
      value,
      translate,
      preferType,
      modelDisplayMap,
    );
    if (display !== null)
      effectiveTags.push({
        key,
        value: display,
      });
  }
  if (effectiveTags.length === 0) return input;
  const effectiveBySemanticKey = new Map(
    effectiveTags.map((effectiveTag) => [tagSemanticKey(effectiveTag.key), effectiveTag]),
  );
  const consumedSemanticKeys = new Set();
  const tags = [];
  for (const inputTag of input.tags) {
    const semanticKey = tagSemanticKey(inputTag.key);
    const effectiveTag = effectiveBySemanticKey.get(semanticKey);
    if (!effectiveTag) {
      tags.push(inputTag);
      continue;
    }
    if (!consumedSemanticKeys.has(semanticKey)) {
      tags.push(effectiveTag);
      consumedSemanticKeys.add(semanticKey);
    }
  }
  for (const effectiveTag of effectiveTags) {
    const semanticKey = tagSemanticKey(effectiveTag.key);
    if (consumedSemanticKeys.has(semanticKey)) continue;
    tags.push(effectiveTag);
    consumedSemanticKeys.add(semanticKey);
  }
  return {
    ...input,
    tags,
  };
}
function PromptBlock({ text, lineClamp }) {
  const [copied, setCopied] = reactExports.useState(false);
  const handleCopy = reactExports.useCallback(
    (clickEvent) => {
      clickEvent.stopPropagation();
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    },
    [text],
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
          {text}
        </ExpandableText>
      ) : (
        <p className="text-body-14 text-muted-foreground whitespace-pre-wrap break-words [overflow-wrap:anywhere] pr-6">
          {text}
        </p>
      )}
    </div>
  );
}
function RefPreviews({ paths, resolveFilePath }) {
  if (paths.length === 0) return null;
  return (
    <div className="flex items-center gap-1 overflow-x-auto min-w-0">
      {paths.map((path) => {
        const src = resolveFilePath(path);
        if (!src) return null;
        return (
          <ArtifactAssetCard
            key={path}
            artifact={{
              type: artifactAssetTypeFromPath(path),
              path,
              url: path,
            }}
            src={src}
            size="sm"
          />
        );
      })}
    </div>
  );
}
function FailureBlock({
  label: labelOverride,
  reason: reason2,
  pending = false,
}) {
  const { t } = useTranslation();
  const label = labelOverride ?? t("chat.activity.mediaGenFailed");
  const trimmedReason = redactForCurrentRegion(reason).trim();
  const showReason = trimmedReason.length > 0 && trimmedReason !== label;
  return (
    <div className="flex gap-1.5 items-start text-body-14 text-foreground min-w-0">
      <Icon
        icon={pending ? Clock : CircleAlert}
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
  const { t } = useTranslation();
  const reason = generationFailureDisplayText(
    {
      rawError,
      errorCode,
      userMessage,
    },
    (key) => t(key),
  );
  return <FailureBlock label={label} reason={reason} />;
}
function BatchSummaryFooter({ succeeded, total, failures }) {
  const { t } = useTranslation();
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
        {t("chat.activity.batchSummary", {
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
            {t("chat.activity.failureView", {
              count: failures.length,
            })}
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-2">
            <div className="text-muted-foreground mb-1.5 px-1.5 font-medium text-caption-10">
              {t("chat.activity.failureReasons")}
            </div>
            <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
              {failures.map((failure) => (
                <div
                  key={failure.index}
                  className="rounded-sm bg-muted/60 border border-border/30 p-1.5"
                >
                  <div className="text-muted-foreground mb-0.5 font-medium">
                    #{failure.index + 1}
                  </div>
                  <pre className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-foreground font-sans leading-relaxed">
                    {redactForCurrentRegion(
                      generationFailureDisplayText(failure, (key) => t(key)),
                    )}
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
function GenerationHandoffTargetCard({ target }) {
  const { t } = useTranslation();
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
      aria-label={t("chat.activity.mediaGenHandoffOpenCanvas")}
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
        {t(
          generating
            ? "chat.activity.mediaGenHandoffGenerating"
            : "chat.activity.mediaGenHandoffViewOnCanvas",
        )}
      </span>
      <Icon
        icon={Crosshair}
        size="sm"
        strokeWidth={1.5}
        className="text-muted-foreground"
      />
    </button>
  );
}
function GenerationHandoffNotice({ targets }) {
  const { t } = useTranslation();
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
          {t("chat.activity.mediaGenInterruptedDescription")}
        </span>
      )}
    </div>
  );
}
export function MediaGenDetail({ entry }) {
  const { t } = useTranslation();
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
      ? t("chat.activity.mediaGenRecoverable")
      : failurePresentation === "cancelled"
        ? t("chat.activity.mediaGenCancelled")
        : t("chat.activity.mediaGenUnknown");
  const managedFailureReason =
    failurePresentation === "recoverable"
      ? t("chat.activity.mediaGenRecoverableDescription")
      : failurePresentation === "cancelled"
        ? t("chat.activity.mediaGenCancelledDescription")
        : t("chat.activity.mediaGenUnknownDescription");
  const category = resolveMediaTaskCategory(entry.toolName ?? "");
  const preferType = registryMediaTypeForCategory(category);
  const mediaType = preferType ?? "audio";
  const { data: mentionModels } = useMentionModels();
  const modelDisplayMap = reactExports.useMemo(() => {
    const map = new Map();
    const models =
      mentionModels?.filter(
        (model) => !preferType || model.type === preferType,
      ) ?? [];
    const addModelKey = (key, displayName) => {
      if (key && !map.has(key)) map.set(key, displayName);
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
    return map;
  }, [mentionModels, preferType]);
  const batchItems = reactExports.useMemo(
    () =>
      parseBatchItems(
        entry.toolArgs,
        entry.toolResult,
        t,
        preferType,
        modelDisplayMap,
      ),
    [entry.toolArgs, entry.toolResult, modelDisplayMap, preferType, t],
  );
  const rawInput = reactExports.useMemo(
    () =>
      parseGenInput(
        entry.toolArgs,
        t,
        preferType,
        entry.toolName,
        modelDisplayMap,
      ),
    [entry.toolArgs, entry.toolName, modelDisplayMap, preferType, t],
  );
  const output = reactExports.useMemo(
    () => parseGenOutput(entry.toolResult, entry.toolName),
    [entry.toolResult, entry.toolName],
  );
  const input = reactExports.useMemo(
    () =>
      applyEffectiveParamTags(
        rawInput,
        output?.effectiveParams,
        t,
        preferType,
        modelDisplayMap,
      ),
    [modelDisplayMap, output?.effectiveParams, preferType, rawInput, t],
  );
  const displayToolResult = sanitizeDisplayText(entry.toolResult);
  const resolveFilePath = (path) => {
    if (path.startsWith("asset://")) return void 0;
    const resolved = resolveUrl(API_PATHS.serveFile(path));
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
    const current = batchItems[pageIndex];
    if (!current) return null;
    const currentTags = sortGenerationTags(current.input.tags);
    const batchPromptNode = current.input.prompt ? (
      <PromptBlock text={current.input.prompt} lineClamp={promptLineClamp} />
    ) : (
      void 0
    );
    const pager = (
      <div className="ml-auto flex shrink-0 items-center gap-1 text-caption-10 text-muted-foreground">
        <button
          type="button"
          disabled={pageIndex === 0}
          onClick={(clickEvent) => {
            clickEvent.stopPropagation();
            setPageIndex((previousPageIndex) => previousPageIndex - 1);
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
          onClick={(clickEvent) => {
            clickEvent.stopPropagation();
            setPageIndex((previousPageIndex) => previousPageIndex + 1);
          }}
          className="p-0.5 rounded-sm hover:bg-muted disabled:opacity-30 transition-colors"
          style={{
            cursor: pageIndex === total - 1 ? "not-allowed" : "pointer",
          }}
        >
          <Icon icon={ChevronRight} size="xs" strokeWidth={1.5} />
        </button>
      </div>
    );
    const hasReferencePreviews = current.input.refPaths.length > 0;
    const batchTagsNode =
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
              <RefPreviews
                paths={current.input.refPaths}
                resolveFilePath={resolveFilePath}
              />
              {pager}
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-1.5 min-w-0">
          <RefPreviews
            paths={current.input.refPaths}
            resolveFilePath={resolveFilePath}
          />
          {pager}
        </div>
      );
    const allOutputPaths = batchItems.flatMap((item) => item.outputPaths);
    const currentOutputPaths = current.outputPaths;
    const succeeded = batchItems.filter(
      (item) => item.outputPaths.length > 0,
    ).length;
    const failures = batchItems
      .map((item, index) => ({
        item,
        index,
      }))
      .filter(
        ({ item }) => !!(item.userMessage || item.error || item.errorCode),
      )
      .map(({ item, index }) => ({
        index,
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
      (entry.toolStatus === "error" ||
        !!rawBatchFailure ||
        !!rawBatchUserMessage);
    const batchFooterNode = isHandedOffToCanvas ? (
      <GenerationHandoffNotice targets={entry.generationHandoffTargets ?? []} />
    ) : hasManagedFailurePresentation ? (
      <FailureBlock
        label={managedFailureLabel}
        reason={managedFailureReason}
        pending={failurePresentation === "recoverable"}
      />
    ) : failures.length > 0 ? (
      <BatchSummaryFooter
        succeeded={succeeded}
        total={total}
        failures={failures}
      />
    ) : batchFailed ? (
      <GenerationFailureBlock
        rawError={rawBatchFailure}
        errorCode={rawBatchFailureCode}
        userMessage={rawBatchUserMessage}
      />
    ) : (
      void 0
    );
    const batchMediaNode =
      currentOutputPaths.length > 0 ? (
        <div className="flex gap-1.5 overflow-x-auto">
          {currentOutputPaths.map((path) => {
            const src = resolveFilePath(path);
            return src ? (
              <ArtifactAssetCard
                key={path}
                artifact={{
                  type: artifactAssetTypeFromPath(path, mediaType),
                  path,
                  url: path,
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
        prompt={batchPromptNode}
        tags={batchTagsNode}
        media={batchMediaNode}
        footer={batchFooterNode}
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
              <div className="text-body-12 text-muted-foreground mb-0.5">
                {t("chat.input")}
              </div>
              <pre className="whitespace-pre-wrap break-words text-body-14 font-sans text-muted-foreground">
                {formatArgs(entry.toolArgs)}
              </pre>
            </div>
          )
        }
        media={
          displayToolResult && (
            <div>
              <div className="text-body-12 text-muted-foreground mb-0.5">
                {t("chat.output")}
              </div>
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
  const inputTags = input ? sortGenerationTags(input.tags) : [];
  const tagsNode =
    input && (inputTags.length > 0 || input.refPaths.length > 0) ? (
      <div className="flex flex-col gap-1.5 min-w-0">
        {inputTags.length > 0 && (
          <TagsRow
            tags={inputTags}
            tagIcons={TAG_ICON}
            categoryIcon={CATEGORY_ICON[entry.category] ?? SkillIcon}
          />
        )}
        {input.refPaths.length > 0 && (
          <RefPreviews
            paths={input.refPaths}
            resolveFilePath={resolveFilePath}
          />
        )}
      </div>
    ) : (
      void 0
    );
  const mediaNode =
    output && output.paths.length > 0 ? (
      <div className="flex gap-1.5 overflow-x-auto">
        {output.paths.map((path) => {
          const src = resolveFilePath(path);
          return src ? (
            <ArtifactAssetCard
              key={path}
              artifact={{
                type: artifactAssetTypeFromPath(path, output.mediaType),
                path,
                url: path,
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
        {output.songTitle && (
          <div className="text-foreground font-medium">{output.songTitle}</div>
        )}
        {output.styleTags && (
          <div className="text-muted-foreground text-caption-10">
            {output.styleTags}
          </div>
        )}
        <PromptBlock text={output.lyrics} />
      </div>
    ) : output?.voiceId ? (
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="text-muted-foreground shrink-0">
          {t("chat.activity.voiceClone.id")}
        </span>
        <code className="text-foreground font-mono text-caption-10 truncate">
          {output.voiceId}
        </code>
      </div>
    ) : output?.voiceCount ? (
      <div className="text-muted-foreground">
        {t("chat.activity.voicePrepare.catalog", {
          count: output.voiceCount,
        })}
      </div>
    ) : output?.formattedLyrics ? (
      <div className="flex flex-col gap-1">
        {(output.structureResult ||
          typeof output.audioDuration === "number") && (
          <div className="text-muted-foreground text-caption-10">
            {[
              output.structureResult,
              typeof output.audioDuration === "number"
                ? t("chat.activity.coverPreprocess.duration", {
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
  const rejectLabel = rejectReason
    ? toolConfirmRejectLabel(rejectReason, t)
    : void 0;
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
          ? t("chat.activity.toolRejected")
          : rawFailureReason &&
              (entry.toolStatus === "error" ||
                unparsedFailure ||
                looksLikeFailureReason(rawFailureReason))
            ? rawFailureReason
            : void 0) ||
        ((entry.toolStatus === "error" && !hasSuccessfulOutput) ||
        hasMissingOutput
          ? t("chat.activity.mediaGenFailed")
          : void 0);
  const failureErrorCode =
    output?.errorCode ?? extractFailureCode(entry.toolResult);
  const failureUserMessage =
    output?.userMessage ?? extractUserMessage(entry.toolResult);
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
