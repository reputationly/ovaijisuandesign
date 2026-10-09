// media-gen-detail.jsx
import {
  API_PATHS,
  Check,
  ChevronLeft,
  ChevronRight$1,
  CircleAlert,
  Copy,
  Crosshair,
  GENERATE_ERROR_CODE_IMAGE_ASPECT_RATIO_CONFLICT,
  reactExports,
  useCurrentWorkspace,
  useTranslation,
} from "../vendor.js";
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

function resolveVideoModeValueDisplay(value, t2) {
  const i18nKey = VIDEO_MODE_I18N_KEYS.get(value);
  if (!i18nKey) return value;
  return t2(i18nKey, {
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
  (code2) => [
    code2,
    new RegExp(
      `(?:\\[\\s*${escapeRegExp(code2)}\\s*\\]|["']?error_code["']?\\s*[:=]\\s*["']?${escapeRegExp(code2)}(?![a-z0-9_]))`,
      "i",
    ),
  ],
);

function hasMappedErrorCode(code2) {
  return Object.hasOwn(GENERATION_ERROR_CODE_I18N, code2);
}

function mappedErrorCode({ errorCode, rawError }) {
  const normalizedCode = errorCode?.trim().toLowerCase();
  if (normalizedCode && hasMappedErrorCode(normalizedCode))
    return normalizedCode;
  const raw2 = rawError?.trim();
  if (!raw2) return void 0;
  if (IMAGE_ASPECT_RATIO_CONFLICT_TEXT_PATTERN.test(raw2)) {
    return GENERATE_ERROR_CODE_IMAGE_ASPECT_RATIO_CONFLICT;
  }
  return LEGACY_ERROR_CODE_MATCHERS.find(([, pattern]) =>
    pattern.test(raw2),
  )?.[0];
}

function isBillingInsufficientFailure({ errorCode, rawError }) {
  const normalizedCode = errorCode?.trim().toLowerCase();
  if (normalizedCode === GENERATE_ERROR_CODE_BILLING_INSUFFICIENT_BALANCE)
    return true;
  const raw2 = rawError?.trim();
  if (!raw2) return false;
  return (
    raw2
      .toLowerCase()
      .includes(GENERATE_ERROR_CODE_BILLING_INSUFFICIENT_BALANCE) ||
    INSUFFICIENT_BALANCE_TEXT_PATTERN.test(raw2) ||
    CREDITS_INSUFFICIENT_TEXT_PATTERN.test(raw2)
  );
}

function generationFailureDisplayText(input, t2) {
  const userMessage = stripErrorHtml(input.userMessage).trim();
  if (userMessage) return userMessage;
  const errorCode = mappedErrorCode(input);
  if (errorCode)
    return stripErrorHtml(t2(GENERATION_ERROR_CODE_I18N[errorCode])).trim();
  if (isBillingInsufficientFailure(input)) {
    return stripErrorHtml(t2("chat.billingInsufficient.title")).trim();
  }
  return (
    stripErrorHtml(input.rawError).trim() ||
    stripErrorHtml(t2("chat.activity.mediaGenFailed")).trim()
  );
}

function MediaGenCardLayout({
  prompt,
  tags: tags2,
  media,
  footer: footer2,
  header,
  className,
}) {
  return (
    <div className={`w-full min-w-0 flex flex-col gap-2 ${className ?? ""}`}>
      {header}
      {prompt}
      {tags2}
      {media}
      {footer2}
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

function TagsRow({ tags: tags2, tagIcons, categoryIcon }) {
  const { t: t2 } = useTranslation();
  if (tags2.length === 0) return null;
  return (
    <TooltipProvider delay={0}>
      <div className="flex items-center gap-1 h-7 text-body-12 text-foreground/70 overflow-x-auto scrollbar-none">
        {tags2.map((tag, i2) => {
          const TagIcon = MODEL_TAG_KEYS.has(tag.key)
            ? categoryIcon
            : tagIcons?.[tag.key];
          const i18nKey = TAG_I18N_KEYS[tag.key];
          const tooltip = i18nKey ? t2(i18nKey) : tag.key;
          const isLast = i2 === tags2.length - 1;
          return (
            <span
              key={tag.key}
              className="inline-flex items-center gap-1 shrink-0"
            >
              <Tooltip>
                <TooltipTrigger
                  className="inline-flex items-center gap-0.5 shrink-0 px-2 rounded-sm"
                  style={{
                    cursor: "pointer",
                  }}
                >
                  {TagIcon && (
                    <TagIcon size={16} strokeWidth={1} className="shrink-0" />
                  )}
                  <span className="whitespace-nowrap">{tag.value}</span>
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

function tagDisplayValue(key2, value, t2, preferType, modelDisplayMap) {
  if (MODEL_TAG_FIELDS.has(key2)) {
    const modelName = String(value);
    return (
      modelDisplayMap?.get(modelName) ??
      resolveModelNameForCurrentRegion(modelName, preferType)
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

function vendorParamsHasMode(args) {
  const vp = args.vendor_params;
  return (
    vp != null && typeof vp === "object" && !Array.isArray(vp) && "mode" in vp
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
      } else if (
        !prompt &&
        BATCH_PROMPT_FIELDS.has(key2) &&
        Array.isArray(value)
      ) {
        const first2 = value.find(
          (v2) => typeof v2 === "string" && v2.length > 0,
        );
        if (first2) prompt = first2;
      } else if (
        DISPLAY_TAG_FIELDS.has(key2) &&
        value != null &&
        value !== ""
      ) {
        const display = tagDisplayValue(
          key2,
          value,
          t2,
          preferType,
          modelDisplayMap,
        );
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
        const display = tagDisplayValue(
          vk,
          vv,
          t2,
          preferType,
          modelDisplayMap,
        );
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

function parseBatchItems(
  toolArgs,
  toolResult,
  t2,
  preferType,
  modelDisplayMap,
) {
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
          } else if (
            DISPLAY_TAG_FIELDS.has(singular) &&
            itemValue != null &&
            itemValue !== ""
          ) {
            const display = tagDisplayValue(
              singular,
              itemValue,
              t2,
              preferType,
              modelDisplayMap,
            );
            if (display !== null)
              tags2.push({
                key: singular,
                value: display,
              });
          }
        } else if (!BATCH_ARRAY_FIELDS.has(key2)) {
          if (!prompt && PROMPT_FIELDS.has(key2) && typeof value === "string") {
            prompt = value;
          } else if (
            DISPLAY_TAG_FIELDS.has(key2) &&
            value != null &&
            value !== ""
          ) {
            if (!tags2.some((tag) => tag.key === key2)) {
              const display = tagDisplayValue(
                key2,
                value,
                t2,
                preferType,
                modelDisplayMap,
              );
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
          const display = tagDisplayValue(
            vk,
            vv,
            t2,
            preferType,
            modelDisplayMap,
          );
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
          for (const p3 of r2.paths)
            if (typeof p3 === "string") outputPaths.push(p3);
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
      if (typeof value === "string" && value.trim())
        return sanitizeDisplayText(value);
    }
    if (
      record2.is_error === true ||
      record2.ok === false ||
      record2.success === false
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
    const record2 = parsed;
    for (const key2 of ["error_code", "code"]) {
      const value = record2[key2];
      if (typeof value === "string" && value.trim())
        return sanitizeDisplayText(value);
    }
    const nestedError = record2.error;
    if (
      !nestedError ||
      typeof nestedError !== "object" ||
      Array.isArray(nestedError)
    ) {
      return void 0;
    }
    for (const key2 of ["error_code", "code"]) {
      const value = nestedError[key2];
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
    const record2 = parsed;
    const userMessage = record2.user_message;
    if (typeof userMessage === "string" && userMessage.trim()) {
      return sanitizeDisplayText(userMessage);
    }
    const nestedError = record2.error;
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
  const entries2 = Object.entries(value).filter(
    (entry) => typeof entry[1] === "string",
  );
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
        if (typeof p3 === "string" && p3.length > 0 && !p3.startsWith("["))
          paths.push(p3);
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
      typeof parsed?.song_title === "string" &&
      parsed.song_title.trim().length > 0
        ? parsed.song_title
        : void 0;
    const styleTags2 =
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

function applyEffectiveParamTags(
  input,
  effectiveParams,
  t2,
  preferType,
  modelDisplayMap,
) {
  if (!input || !effectiveParams) return input;
  const effectiveTags = [];
  for (const [key2, value] of Object.entries(effectiveParams)) {
    if (!DISPLAY_TAG_FIELDS.has(key2) || value === "") continue;
    const display = tagDisplayValue(
      key2,
      value,
      t2,
      preferType,
      modelDisplayMap,
    );
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

function FailureBlock({
  label: labelOverride,
  reason,
  pending: pending2 = false,
}) {
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
                  <div className="text-muted-foreground mb-0.5 font-medium">
                    #{f2.index + 1}
                  </div>
                  <pre className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-foreground font-sans leading-relaxed">
                    {redactForCurrentRegion(
                      generationFailureDisplayText(f2, (key2) => t2(key2)),
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

export function MediaGenDetail({ entry }) {
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
    const models =
      mentionModels?.filter(
        (model) => !preferType || model.type === preferType,
      ) ?? [];
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
    () =>
      parseBatchItems(
        entry.toolArgs,
        entry.toolResult,
        t2,
        preferType,
        modelDisplayMap,
      ),
    [entry.toolArgs, entry.toolResult, modelDisplayMap, preferType, t2],
  );
  const rawInput = reactExports.useMemo(
    () =>
      parseGenInput(
        entry.toolArgs,
        t2,
        preferType,
        entry.toolName,
        modelDisplayMap,
      ),
    [entry.toolArgs, entry.toolName, modelDisplayMap, preferType, t2],
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
        t2,
        preferType,
        modelDisplayMap,
      ),
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
              <RefPreviews
                paths={current2.input.refPaths}
                resolveFilePath={resolveFilePath}
              />
              {pager}
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-1.5 min-w-0">
          <RefPreviews
            paths={current2.input.refPaths}
            resolveFilePath={resolveFilePath}
          />
          {pager}
        </div>
      );
    const allOutputPaths = batchItems.flatMap((item) => item.outputPaths);
    const currentOutputPaths = current2.outputPaths;
    const succeeded = batchItems.filter(
      (item) => item.outputPaths.length > 0,
    ).length;
    const failures = batchItems
      .map((item, index2) => ({
        item,
        index: index2,
      }))
      .filter(
        ({ item }) => !!(item.userMessage || item.error || item.errorCode),
      )
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
      (entry.toolStatus === "error" ||
        !!rawBatchFailure ||
        !!rawBatchUserMessage);
    const footerNode2 = isHandedOffToCanvas ? (
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
              <div className="text-body-12 text-muted-foreground mb-0.5">
                {t2("chat.input")}
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
                {t2("chat.output")}
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
          {t2("chat.activity.voiceClone.id")}
        </span>
        <code className="text-foreground font-mono text-caption-10 truncate">
          {output.voiceId}
        </code>
      </div>
    ) : output?.voiceCount ? (
      <div className="text-muted-foreground">
        {t2("chat.activity.voicePrepare.catalog", {
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
  const rejectLabel = rejectReason
    ? toolConfirmRejectLabel(rejectReason, t2)
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
          ? t2("chat.activity.toolRejected")
          : rawFailureReason &&
              (entry.toolStatus === "error" ||
                unparsedFailure ||
                looksLikeFailureReason(rawFailureReason))
            ? rawFailureReason
            : void 0) ||
        ((entry.toolStatus === "error" && !hasSuccessfulOutput) ||
        hasMissingOutput
          ? t2("chat.activity.mediaGenFailed")
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
