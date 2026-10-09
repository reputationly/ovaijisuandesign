// domestic-param-labels.jsx
import {
  jsxRuntimeExports,
  reactExports,
  useTranslation,
  useCurrentWorkspace,
  useMentionModels,
  dedupedToast,
  Tooltip,
  TooltipTrigger,
  CompositedSvg,
  Check,
  ChevronRight$1,
  ChevronDown,
  API_PATHS,
  getRuntimeConfig,
  useResolveMediaUrl,
  withThumbnail,
  FileTypeIcon,
  classifyFileType,
  ImageOutlineIcon,
  Video,
  DeferredThumbnailImage,
  workspaceEvents,
  getNodeIdsForAsset,
  PopoverRoot,
  PopoverPortal,
  PopoverPositioner,
  PopoverPopup,
  ContextMenu,
  Copy,
  PlaybackPlayIcon$1,
  Icon,
  Popover,
  PopoverTrigger,
  useGatewayFetch,
  Clapperboard,
  Scissors,
  Loader2,
  TooltipProvider,
  useMediaModels,
  Music,
  GENERATION_ERROR_CODE_I18N,
  GENERATE_ERROR_CODE_IMAGE_ASPECT_RATIO_CONFLICT,
  GENERATE_ERROR_CODE_BILLING_INSUFFICIENT_BALANCE,
  stripErrorHtml,
  SliderRoot,
  SliderControl$1,
  SliderTrack,
  SliderIndicator,
  SliderThumb,
  AudioLines,
  Clock,
  resolveMediaTaskCategory,
  ChevronLeft,
  Info$1,
  useComfyUiDownloadProgress,
  isComfyUiModelUnavailable,
  AlertTriangle,
  artifactAssetTypeFromPath,
  PlatformFileManagerLabel,
} from "../vendor.js";
import {
  TooltipContent,
  cn$2,
  Button$1,
  Textarea,
} from "../asset-center/shared/use-browser-overlay-dialog-props.jsx";
import { homeService, LocalFolderIcon } from "../m08/browser-inspiration-urls.jsx";
import { PopoverContent } from "../m09/use-credit-details.jsx";
import { INSUFFICIENT_BALANCE_TEXT_PATTERN, CHAT_ARTIFACT_UI_ID } from "../m01/text-models.js";
import { buildResourceDragItem } from "../m01/myers-line-hunks.js";
import { useAssets, useMediaActions } from "../m10/use-media-actions.jsx";
import {
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
} from "../m10/new-workspace-dialog.jsx";
import { canWriteResourceDragData, writeResourceDragData } from "../m12/file-chip.jsx";
import { joinFilePath } from "../m11/use-asset-menu-shortcuts.js";
import { MediaLightbox } from "../asset-center/shared/image-lightbox.jsx";
import { Switch } from "../m01/calc-video-cost-breakdown.jsx";
import { Input3 } from "../asset-center/shared/select-content.jsx";
import { splitFilename } from "../m10/delete-local-node-dialog.jsx";
import { buildVideoThumbnailUrl } from "../m02/media-clip-panel-inner.jsx";
import { inferArtifactMime } from "../m10/topbar-provider.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { findAssetForPath, toWorkspaceRelativePath$1 } from "./markdown-audio.jsx";
import {
  redactForCurrentRegion,
  resolveModelNameForCurrentRegion,
} from "./resolve-chat-file-reference.js";
import {
  IMAGE_DISPATCHER_TOOL,
  VIDEO_DISPATCHER_TOOL,
  VIDEO_QUALITY_VALUE_DISPLAY_MAP,
  isHiddenVideoGenerationMode,
  registryMediaTypeForCategory,
  resolveDispatcherSeriesLabel,
} from "./use-chat-rating.js";
function nextProductionPlanExpanded(expanded, event) {
  if (event === "plan-discovered") return expanded ?? true;
  if (event === "message-sent" || event === "manually-collapsed") return false;
  if (event === "timeline-opened" || event === "manually-expanded") return true;
  return expanded ?? false;
}
export function updateProductionPlanDisclosureState(current2, conversationKey, event) {
  const expanded = current2.get(conversationKey);
  const nextExpanded = nextProductionPlanExpanded(expanded, event);
  if (expanded === nextExpanded) return current2;
  const next2 = new Map(current2);
  next2.set(conversationKey, nextExpanded);
  return next2;
}
export function canOpenProductionPlan(activePlanId, requestedPlanId) {
  return Boolean(activePlanId && requestedPlanId === activePlanId);
}
export function productionPlanDisclosureKey(sessionId) {
  return sessionId ? `session:${sessionId}` : void 0;
}
const CREDITS_INSUFFICIENT_TEXT_PATTERN = /credits?\s+(?:are|is|were)\s+insufficient/i;
const IMAGE_ASPECT_RATIO_CONFLICT_TEXT_PATTERN =
  /vendor_params\.aspect_ratio=\S+\s+conflicts with (?:source_ref|canvas_source) dimensions \d+x\d+;\s*nearest supported ratio for \S+ is \S+/i;
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
const LEGACY_ERROR_CODE_MATCHERS = Object.keys(GENERATION_ERROR_CODE_I18N).map((code2) => [
  code2,
  new RegExp(
    `(?:\\[\\s*${escapeRegExp(code2)}\\s*\\]|["']?error_code["']?\\s*[:=]\\s*["']?${escapeRegExp(code2)}(?![a-z0-9_]))`,
    "i",
  ),
]);
function hasMappedErrorCode(code2) {
  return Object.hasOwn(GENERATION_ERROR_CODE_I18N, code2);
}
function mappedErrorCode({ errorCode, rawError }) {
  const normalizedCode = errorCode?.trim().toLowerCase();
  if (normalizedCode && hasMappedErrorCode(normalizedCode)) return normalizedCode;
  const raw2 = rawError?.trim();
  if (!raw2) return void 0;
  if (IMAGE_ASPECT_RATIO_CONFLICT_TEXT_PATTERN.test(raw2)) {
    return GENERATE_ERROR_CODE_IMAGE_ASPECT_RATIO_CONFLICT;
  }
  return LEGACY_ERROR_CODE_MATCHERS.find(([, pattern]) => pattern.test(raw2))?.[0];
}
function isBillingInsufficientFailure({ errorCode, rawError }) {
  const normalizedCode = errorCode?.trim().toLowerCase();
  if (normalizedCode === GENERATE_ERROR_CODE_BILLING_INSUFFICIENT_BALANCE) return true;
  const raw2 = rawError?.trim();
  if (!raw2) return false;
  return (
    raw2.toLowerCase().includes(GENERATE_ERROR_CODE_BILLING_INSUFFICIENT_BALANCE) ||
    INSUFFICIENT_BALANCE_TEXT_PATTERN.test(raw2) ||
    CREDITS_INSUFFICIENT_TEXT_PATTERN.test(raw2)
  );
}
export function generationFailureDisplayText(input, t2) {
  const userMessage = stripErrorHtml(input.userMessage).trim();
  if (userMessage) return userMessage;
  const errorCode = mappedErrorCode(input);
  if (errorCode) return stripErrorHtml(t2(GENERATION_ERROR_CODE_I18N[errorCode])).trim();
  if (isBillingInsufficientFailure(input)) {
    return stripErrorHtml(t2("chat.billingInsufficient.title")).trim();
  }
  return (
    stripErrorHtml(input.rawError).trim() ||
    stripErrorHtml(t2("chat.activity.mediaGenFailed")).trim()
  );
}
export function MediaGenCardLayout({
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
export function TagsRow({ tags: tags2, tagIcons, categoryIcon }) {
  const { t: t2 } = useTranslation();
  if (tags2.length === 0) return null;
  return (
    <TooltipProvider delay={0}>
      <div className="flex items-center gap-1 h-7 text-body-12 text-foreground/70 overflow-x-auto scrollbar-none">
        {tags2.map((tag, i2) => {
          const TagIcon = MODEL_TAG_KEYS.has(tag.key) ? categoryIcon : tagIcons?.[tag.key];
          const i18nKey = TAG_I18N_KEYS[tag.key];
          const tooltip = i18nKey ? t2(i18nKey) : tag.key;
          const isLast = i2 === tags2.length - 1;
          return (
            <span key={tag.key} className="inline-flex items-center gap-1 shrink-0">
              <Tooltip>
                <TooltipTrigger
                  className="inline-flex items-center gap-0.5 shrink-0 px-2 rounded-sm"
                  style={{
                    cursor: "pointer",
                  }}
                >
                  {TagIcon && <TagIcon size={16} strokeWidth={1} className="shrink-0" />}
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
function Slider({
  className,
  defaultValue: defaultValue2,
  value,
  min: min2 = 0,
  max: max2 = 100,
  ...props
}) {
  const _values = reactExports.useMemo(
    () =>
      Array.isArray(value) ? value : Array.isArray(defaultValue2) ? defaultValue2 : [min2, max2],
    [value, defaultValue2, min2, max2],
  );
  return (
    <SliderRoot
      className={cn$2("data-horizontal:w-full data-vertical:h-full", className)}
      data-slot="slider"
      defaultValue={defaultValue2}
      value={value}
      min={min2}
      max={max2}
      thumbAlignment="edge"
      {...props}
    >
      <SliderControl$1 className="relative flex w-full touch-none items-center select-none data-disabled:opacity-50 data-vertical:h-full data-vertical:min-h-40 data-vertical:w-auto data-vertical:flex-col">
        <SliderTrack
          data-slot="slider-track"
          className="relative grow overflow-hidden rounded-full bg-muted select-none data-horizontal:h-1 data-horizontal:w-full data-vertical:h-full data-vertical:w-1"
        >
          <SliderIndicator
            data-slot="slider-range"
            className="bg-primary select-none data-horizontal:h-full data-vertical:w-full"
          />
        </SliderTrack>
        {Array.from(
          {
            length: _values.length,
          },
          (_2, index2) => (
            <SliderThumb
              key={index2}
              data-slot="slider-thumb"
              className="relative block size-3 shrink-0 rounded-full border border-ring bg-white ring-ring/50 transition-[color,box-shadow] select-none after:absolute after:-inset-2 hover:ring-1 focus-visible:ring-1 focus-visible:outline-hidden active:ring-1 disabled:pointer-events-none disabled:opacity-50"
            />
          ),
        )}
      </SliderControl$1>
    </SliderRoot>
  );
}
function ParamEnumPopover({
  paramKey,
  paramLabel,
  description,
  values: values3,
  value,
  disabled: disabled2,
  displayMap,
  onChange,
}) {
  const [open, setOpen] = reactExports.useState(false);
  const { t: t2 } = useTranslation();
  const displayValue = (raw2) => {
    const optionLabel = t2(`canvas.param.option.${raw2}`, {
      defaultValue: raw2,
    });
    return optionLabel !== raw2 ? optionLabel : (displayMap?.get(raw2) ?? raw2);
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled2}
        data-action-ui-id={`tool-confirm-param-${paramKey}`}
        className={cn$2(
          "inline-flex min-w-[7rem] max-w-[16rem] items-center justify-between gap-1 px-2 py-1 rounded-sm",
          "text-body-12 border border-border bg-background hover:bg-muted transition-colors cursor-pointer",
          "disabled:opacity-50 disabled:cursor-default",
        )}
      >
        <span className="truncate text-foreground">{displayValue(value) || "—"}</span>
        <ChevronDown size={14} strokeWidth={1.5} className="shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={4} className="w-64 p-0 gap-0 rounded-sm">
        <div className="border-b border-border px-3 py-2">
          <div className="text-body-12 font-medium text-muted-foreground">
            {paramLabel ?? paramKey}
          </div>
          {description && paramKey !== "model" && paramKey !== "model_name" && (
            <div className="text-caption-11 text-muted-foreground line-clamp-2 mt-0.5">
              {description}
            </div>
          )}
        </div>
        <ul className="max-h-64 overflow-y-auto py-1">
          {values3.map((opt) => {
            const active2 = value === opt;
            return (
              <li key={opt}>
                <button
                  type="button"
                  data-action-ui-id={`tool-confirm-param-${paramKey}-option-${opt}`}
                  className={cn$2(
                    "flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-body-12 cursor-pointer transition-colors",
                    active2 ? "bg-foreground text-background" : "text-foreground hover:bg-muted",
                  )}
                  onClick={() => {
                    onChange(opt);
                    setOpen(false);
                  }}
                >
                  <span className="truncate">{displayValue(opt)}</span>
                  {active2 && <Check size={14} strokeWidth={1.5} className="shrink-0" />}
                </button>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
function ToolConfirmBranchIcon() {
  return (
    <CompositedSvg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="text-current"
    >
      <path d="M10 0V10C10 11.1046 10.8954 12 12 12H22" stroke="currentColor" />
    </CompositedSvg>
  );
}
export const ToolConfirmEditsContext = reactExports.createContext(null);
function useToolConfirmEdits() {
  return reactExports.useContext(ToolConfirmEditsContext);
}
const INTERNAL_KEYS = new Set([
  // system-injected / opaque
  "filename",
  "filenames",
  "source_node_id",
  "source_node_ids",
  "cover_feature_id",
  "source_tool",
  "backend",
  "workflow_id",
  "repair_operations",
  "input_bindings",
  "input_values",
  // Capability dispatcher routing / evidence (LLM-only contract).
  "vendor",
  "aspect_ratio_source",
  "aspect_ratio_evidence",
  // TTS micro-adjustments
  "vol",
  "vols",
  "pitch",
  "pitches",
  "pronunciation_dict",
  "voice_modify",
  "voice_modifies",
  // Image diffusion knobs
  "guidance_scale",
  "seed",
  // Video implementation switches
  "shot_type",
  "sequential_frames",
  "should_lip_sync",
  // Kling multi-shot / reference-mode
  "image_types",
  "video_refer_type",
  "keep_original_sound",
  "multi_shot",
  "multi_prompt",
  "character_orientation",
  // Voice clone augmentation
  "need_noise_reduction",
  "need_volume_normalization",
  "demo_text",
  "demo_model",
  "prompt_audio_path",
  "prompt_text",
  // Voice isolation
  "language",
  // merge_videos custom-size knobs (relevant only when scale_mode='custom')
  "target_width",
  "target_height",
]);
function isInternalKey(key2) {
  return key2.startsWith("_") || INTERNAL_KEYS.has(key2);
}
const HIDE_DESC_KEYS = new Set(["model_name", "model_id"]);
const MODEL_NAME_KEYS = new Set(["model", "model_name", "model_id"]);
const MINIMAX_H3_MODEL_ID = "MiniMax-H3";
const MINIMAX_H3_RESOLUTIONS = ["768P", "2K"];
const PROMPT_KEYS = new Set([
  "prompt",
  "prompts",
  "text",
  "texts",
  "lyrics",
  "positive_prompt",
  "negative_prompt",
]);
const BATCH_PROMPT_KEYS = new Set(["prompts", "texts"]);
const TIMELINE_VISIBLE_TAG_KEYS = new Set([
  "model_name",
  "model",
  "model_id",
  "aspect_ratio",
  "aspect_ratios",
  "duration",
  "durations",
  "resolution",
  // Capability dispatcher knobs (live under vendor_params; flattened
  // onto top-level visibleKeys below). Only the few that are useful
  // user-facing signals are surfaced — audio toggles (sound /
  // generate_audio / sound) and multi-shot kling
  // controls intentionally stay in the PM-advanced bucket.
  "mode",
  // TTS signal fields for hub_generate_audio_speech.
  // voice_id / voice_ids intentionally NOT here yet — follow-up MR will
  // wire dynamic enum hints (ParamEnumPopover). speed / emotion and their
  // batch forms are simple scalars, surfaced as chips for parity with
  // the timeline media card.
  "speed",
  "speeds",
  "emotion",
  "emotions",
  // Editing signal fields for hub_merge_videos.
  // PM-decided "advanced" knobs that only matter in edge cases
  // (target_width / target_height when scale_mode === 'custom') stay in
  // INTERNAL_KEYS. scale_mode is the user-meaningful choice the timeline
  // already shows, so the inline confirm card surfaces it too.
  "scale_mode",
  // ComfyUI one-run overrides.
  "seed",
  "steps",
  "cfg",
  "sampler_name",
  "scheduler",
  "denoise",
]);
const COMFYUI_RUN_TOOL = "hub_run_comfyui_workflow";
const COMFYUI_DRAFT_EDIT_TOOL = "hub_edit_comfyui_workflow";
const LOCKED_COMFYUI_DRAFT_VALUE = "minimax h3";
function comfyUiReviewMode(value) {
  return value === "detailed" ? "detailed" : "summary";
}
function comfyUiInputValueKey(entry) {
  return `${entry.node_id}:${entry.parameter}`;
}
function isLockedComfyUiDraftParameter(entry) {
  return (
    typeof entry.value === "string" &&
    entry.value.trim().toLowerCase() === LOCKED_COMFYUI_DRAFT_VALUE
  );
}
const COMFYUI_OVERRIDE_KEYS = new Set([
  "positive_prompt",
  "negative_prompt",
  "seed",
  "steps",
  "cfg",
  "sampler_name",
  "scheduler",
  "denoise",
]);
function asComfyUiPreflightResponse(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Invalid ComfyUI preflight response");
  }
  const response = value;
  if (
    typeof response.ready !== "boolean" ||
    typeof response.workflow_id !== "string" ||
    typeof response.workflow_title !== "string" ||
    typeof response.source_sha256 !== "string" ||
    !/^[a-f0-9]{64}$/.test(response.source_sha256) ||
    !Array.isArray(response.issues) ||
    !Array.isArray(response.model_dependencies) ||
    !Array.isArray(response.input_values)
  ) {
    throw new Error("Invalid ComfyUI preflight response");
  }
  return response;
}
function comfyUiDraftParameters(value) {
  if (!Array.isArray(value)) return [];
  const controls = new Set(["text", "textarea", "number", "enum", "boolean", "media"]);
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const entry = item;
    if (
      typeof entry.node_id !== "string" ||
      typeof entry.parameter !== "string" ||
      typeof entry.label !== "string" ||
      !entry.control ||
      !controls.has(entry.control) ||
      (entry.value !== null &&
        typeof entry.value !== "string" &&
        typeof entry.value !== "number" &&
        typeof entry.value !== "boolean")
    ) {
      return [];
    }
    return [entry];
  });
}
function asComfyUiDraftParametersResponse(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Invalid ComfyUI Draft parameter response");
  }
  const response = value;
  if (
    typeof response.workflow_id !== "string" ||
    typeof response.workflow_title !== "string" ||
    typeof response.source_sha256 !== "string" ||
    !/^[a-f0-9]{64}$/.test(response.source_sha256) ||
    !Array.isArray(response.draft_parameters)
  ) {
    throw new Error("Invalid ComfyUI Draft parameter response");
  }
  return {
    ...response,
    draft_parameters: comfyUiDraftParameters(response.draft_parameters),
  };
}
function comfyUiRepairOperations(value) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const operation = item;
    return operation.type === "set_node_parameter" &&
      typeof operation.node_id === "string" &&
      typeof operation.parameter === "string"
      ? [operation]
      : [];
  });
}
function comfyUiStructuralEditOperations(value) {
  if (!Array.isArray(value)) return [];
  const structuralTypes = new Set(["add_node", "remove_node", "connect", "disconnect"]);
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const operation = item;
    return typeof operation.type === "string" && structuralTypes.has(operation.type)
      ? [operation]
      : [];
  });
}
function comfyUiRunInputValues(value) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const entry = item;
    return typeof entry.node_id === "string" &&
      typeof entry.parameter === "string" &&
      !isProtectedComfyUiModelParameter(entry.parameter)
      ? [
          {
            node_id: entry.node_id,
            parameter: entry.parameter,
            value: entry.value,
          },
        ]
      : [];
  });
}
function sanitizeComfyUiRunArgs(args) {
  if (!Array.isArray(args.input_values)) return args;
  return {
    ...args,
    input_values: comfyUiRunInputValues(args.input_values),
  };
}
function comfyUiInputBindings(value) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const binding = item;
    return typeof binding.node_id === "string" &&
      typeof binding.parameter === "string" &&
      typeof binding.workspace_path === "string"
      ? [binding]
      : [];
  });
}
function comfyUiInputMediaKind(entry) {
  if (entry.media_kind) return entry.media_kind;
  const parameter = entry.parameter.toLowerCase();
  if (/^image(?:_\d+)?$/.test(parameter)) return "image";
  if (/^audio(?:_\d+)?$/.test(parameter)) return "audio";
  if (/^video(?:_\d+)?$/.test(parameter)) return "video";
  return void 0;
}
function isProtectedComfyUiModelParameter(parameter) {
  return /^(?:model(?:_name|_id)?|ckpt(?:_name)?|checkpoint(?:_name)?|vae(?:_name)?|unet(?:_name)?|clip(?:_name)?|lora(?:_name)?|diffusion_model(?:_name)?)$/i.test(
    parameter,
  );
}
function isComfyUiPromptParameter(parameter) {
  return /(?:^|[._])(?:positive_prompt|negative_prompt|prompt)$/i.test(parameter);
}
function getComfyUiInputLabel(parameter) {
  return isComfyUiPromptParameter(parameter) ? getParamLabel("text") : getParamLabel(parameter);
}
function mergeComfyUiInputValues(preflightValues, explicitValues) {
  const values3 = new Map();
  for (const entry of preflightValues) {
    values3.set(`${entry.node_id}:${entry.parameter}`, entry);
  }
  for (const entry of explicitValues) {
    const key2 = `${entry.node_id}:${entry.parameter}`;
    values3.set(key2, {
      ...values3.get(key2),
      ...entry,
    });
  }
  return [...values3.values()];
}
const VENDOR_PARAM_KEYS = new Set([
  // image dispatcher
  "aspect_ratio",
  "resolution",
  // video dispatcher
  "mode",
  "sound",
  "generate_audio",
  // The remaining vendor_params fields (multi_shot / shot_type /
  // image_types_json / multi_prompt_json /
  // video_list_json / video_refer_type / keep_original_sound /
  // character_orientation) are intentionally NOT promoted here — they
  // sit in the PM-decided "advanced" bucket (INTERNAL_KEYS) and never
  // render in the inline card.
]);
function isVendorParamsObject(v2) {
  return v2 != null && typeof v2 === "object" && !Array.isArray(v2);
}
function isMiniMaxH3ModelValue(value) {
  return typeof value === "string" && value.trim() === MINIMAX_H3_MODEL_ID;
}
function isMiniMaxH3ConfirmArgs(args) {
  for (const key2 of MODEL_NAME_KEYS) {
    if (isMiniMaxH3ModelValue(args[key2])) return true;
  }
  const vendorParams = args.vendor_params;
  if (isVendorParamsObject(vendorParams)) {
    for (const key2 of MODEL_NAME_KEYS) {
      if (isMiniMaxH3ModelValue(vendorParams[key2])) return true;
    }
  }
  return false;
}
function withMiniMaxH3ParamHints(args, hints) {
  if (!isMiniMaxH3ConfirmArgs(args)) return hints;
  const resolutionHint = {
    type: "enum",
    values: MINIMAX_H3_RESOLUTIONS,
  };
  if (hints?.resolution?.description) {
    resolutionHint.description = hints.resolution.description;
  }
  return {
    ...hints,
    resolution: resolutionHint,
  };
}
const DOMESTIC_PARAM_LABELS = {
  // content
  prompt: "提示词",
  prompts: "提示词",
  text: "文本",
  texts: "文本",
  lyrics: "歌词",
  positive_prompt: "正向提示词",
  negative_prompt: "负向提示词",
  // model / style
  model: "模型",
  model_name: "模型",
  // Capability dispatcher's canonical model selector
  // (IMAGE_MODEL_ID_ENUM / VIDEO_MODEL_ID_ENUM).
  model_id: "模型",
  style: "风格",
  quality: "质量",
  mode: "模式",
  // geometry / size
  aspect_ratio: "画面比例",
  aspect_ratios: "画面比例",
  resolution: "清晰度",
  // batch / duration
  count: "数量",
  n: "数量",
  seed: "随机种子",
  steps: "采样步数",
  cfg: "提示词引导强度",
  sampler_name: "采样器",
  scheduler: "调度器",
  denoise: "降噪强度",
  duration: "时长",
  durations: "时长",
  // audio toggle
  generate_audio: "带音频",
  sound: "带音频",
  // TTS
  voice_id: "音色",
  voice_ids: "音色",
  speed: "语速",
  speeds: "语速",
  emotion: "情绪",
  emotions: "情绪",
  // media inputs (primary / ref / first-last frame)
  image_path: "图片",
  image_paths: "图片",
  first_frame_image: "首帧图片",
  first_frame_images: "首帧图片",
  first_frame_image_path: "首帧图片",
  last_frame_image: "尾帧图片",
  last_frame_images: "尾帧图片",
  last_frame_image_path: "尾帧图片",
  audio_path: "音频",
  audio_paths: "音频",
  video_path: "视频",
  video_paths: "视频",
  reference_image_paths: "参考图片",
  reference_images: "参考图片",
  reference_video_url: "参考视频",
  reference_video_urls: "参考视频",
  video_url: "驱动视频",
  reference_audio_urls: "参考音频",
  audio: "参考音频",
  // music cover oneshot
  // editing
  scale_mode: "缩放模式",
  // image generation
  background: "背景",
  // DAG
  inputs: "参数",
};
function getParamLabel(key2) {
  if (getRuntimeConfig().region === "domestic") {
    return DOMESTIC_PARAM_LABELS[key2] ?? key2;
  }
  return key2;
}
const CATEGORY_ICON$1 = {
  imageGen: ImageOutlineIcon,
  videoGen: Video,
  videoEdit: Scissors,
  audioGen: AudioLines,
  musicGen: Music,
  other: Clapperboard,
};
const TAG_ICON$1 = {
  duration: Clock,
  durations: Clock,
};
const resolveTaskCategory = resolveMediaTaskCategory;
function mediaKindForKey(key2) {
  if (
    key2 === "image_path" ||
    key2 === "image_paths" ||
    key2 === "first_frame_image" ||
    key2 === "first_frame_images" ||
    key2 === "first_frame_image_path" ||
    key2 === "last_frame_image" ||
    key2 === "last_frame_images" ||
    key2 === "last_frame_image_path" ||
    key2 === "reference_image_paths" ||
    key2 === "reference_images"
  ) {
    return "image";
  }
  if (
    key2 === "video_path" ||
    key2 === "video_paths" ||
    key2 === "reference_video_url" ||
    key2 === "reference_video_urls" ||
    key2 === "video_url"
  ) {
    return "video";
  }
  if (
    key2 === "audio_path" ||
    key2 === "audio_paths" ||
    key2 === "reference_audio_urls" ||
    key2 === "audio"
  ) {
    return "audio";
  }
  return void 0;
}
function acceptForMediaKind(kind) {
  if (kind === "image") return "image/*";
  if (kind === "video") return "video/*";
  if (kind === "audio") return "audio/*";
  return void 0;
}
function mediaValues(value) {
  if (typeof value === "string" && value.length > 0) {
    if (value.startsWith("[")) {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          return parsed.filter((item) => typeof item === "string" && item.length > 0);
        }
      } catch {}
    }
    return [value];
  }
  if (Array.isArray(value)) {
    return value.filter((item) => typeof item === "string" && item.length > 0);
  }
  return [];
}
function stringifyParamValue(value) {
  if (typeof value === "object" && value !== null) return JSON.stringify(value);
  return String(value ?? "");
}
function isModelParamKey(paramKey) {
  const baseKey = paramKey.split("[")[0] ?? paramKey;
  return MODEL_NAME_KEYS.has(baseKey);
}
function filterModeHiddenValues(paramKey, values3) {
  if (paramKey !== "mode") return values3;
  return values3.filter((value) => !isHiddenVideoGenerationMode(value));
}
function isInheritedSeedance25Param(tool2, args, paramKey) {
  if (
    tool2 !== VIDEO_DISPATCHER_TOOL ||
    args.vendor !== "seedance" ||
    args.model_id !== "seedance2.5"
  ) {
    return false;
  }
  const mode2 = args.mode;
  if (paramKey === "aspect_ratio") {
    return (
      mode2 === "i2v" ||
      mode2 === "first-last-frame" ||
      mode2 === "video-edit" ||
      mode2 === "video-extend"
    );
  }
  return paramKey === "duration" && mode2 === "video-edit";
}
function displayEnumValue(paramKey, value, t2, displayMap) {
  const optionLabel = t2(`canvas.param.option.${value}`, {
    defaultValue: value,
  });
  if (optionLabel !== value) return optionLabel;
  return (
    displayMap?.get(value) ??
    (isModelParamKey(paramKey) ? resolveModelNameForCurrentRegion(value) : value)
  );
}
function displayParamValue(value, t2, displayMap, formatBoolean) {
  if (Array.isArray(value)) {
    const values3 = value
      .map((item) => displayParamValue(item, t2, displayMap, formatBoolean))
      .filter(Boolean);
    if (values3.length === 0) return "—";
    if (values3.length <= 2) return values3.join(", ");
    return `${values3[0]} +${values3.length - 1}`;
  }
  if (typeof value === "boolean")
    return formatBoolean ? formatBoolean(value) : value ? "ON" : "OFF";
  const raw2 = stringifyParamValue(value);
  const optionLabel = t2(`canvas.param.option.${raw2}`, {
    defaultValue: raw2,
  });
  return (optionLabel !== raw2 ? optionLabel : (displayMap?.get(raw2) ?? raw2)) || "—";
}
function batchPageCountForArgs(args, keys2) {
  let count2 = 1;
  for (const key2 of keys2) {
    const value = args[key2];
    if (BATCH_PROMPT_KEYS.has(key2) && Array.isArray(value) && value.length > count2) {
      count2 = value.length;
    }
  }
  return count2;
}
function valueAtBatchPage(value, pageIndex, pageCount) {
  if (pageCount > 1 && Array.isArray(value) && value.length === pageCount) {
    return value[pageIndex];
  }
  return value;
}
function resolveMediaPath(path2, resolveUrl) {
  if (/^(https?:|blob:|data:)/.test(path2)) return path2;
  if (path2.startsWith("asset://")) return void 0;
  return resolveUrl(API_PATHS.serveFile(path2));
}
function mediaItemId(paramKey, index2) {
  return `${paramKey}:${index2}`;
}
function uploadedRelativePath(body2) {
  if (!body2 || typeof body2 !== "object") return void 0;
  const record2 = body2;
  if (typeof record2.relative === "string" && record2.relative.length > 0) return record2.relative;
  if (typeof record2.path === "string" && record2.path.length > 0) return record2.path;
  return void 0;
}
function updateIndexedMediaValue(current2, index2, nextPath) {
  if (!Array.isArray(current2)) return nextPath;
  return current2.map((item, i2) => (i2 === index2 ? nextPath : item));
}
function parseParamValueLikeOriginal(originalValue, value) {
  if (typeof originalValue === "number") {
    const n2 = Number(value);
    return Number.isFinite(n2) ? n2 : originalValue;
  }
  if (typeof originalValue === "boolean") return value === "true";
  if (Array.isArray(originalValue)) {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}
function BatchPager({ pageIndex, pageCount, onChange }) {
  const { t: t2 } = useTranslation();
  if (pageCount <= 1) return null;
  return (
    <div className="ml-auto flex shrink-0 items-center gap-1 text-caption-10 text-muted-foreground">
      <button
        type="button"
        data-action-ui-id="tool-confirm-batch-prev"
        aria-label={t2("chat.toolConfirm.batch.previous", "Previous batch item")}
        disabled={pageIndex === 0}
        className="rounded-sm p-0.5 transition-colors hover:bg-muted disabled:opacity-30"
        style={{
          cursor: pageIndex === 0 ? "not-allowed" : "pointer",
        }}
        onClick={() => onChange(Math.max(0, pageIndex - 1))}
      >
        <Icon icon={ChevronLeft} size="xs" strokeWidth={1.5} />
      </button>
      <span className="tabular-nums">
        {pageIndex + 1}/{pageCount}
      </span>
      <button
        type="button"
        data-action-ui-id="tool-confirm-batch-next"
        aria-label={t2("chat.toolConfirm.batch.next", "Next batch item")}
        disabled={pageIndex === pageCount - 1}
        className="rounded-sm p-0.5 transition-colors hover:bg-muted disabled:opacity-30"
        style={{
          cursor: pageIndex === pageCount - 1 ? "not-allowed" : "pointer",
        }}
        onClick={() => onChange(Math.min(pageCount - 1, pageIndex + 1))}
      >
        <Icon icon={ChevronRight$1} size="xs" strokeWidth={1.5} />
      </button>
    </div>
  );
}
function EditablePromptBlock({ paramKey, value, pageIndex, onChange }) {
  const items = Array.isArray(value)
    ? value.map((item) => String(item ?? ""))
    : [String(value ?? "")];
  const visibleItems =
    Array.isArray(value) && pageIndex !== void 0
      ? [
          {
            item: items[pageIndex] ?? "",
            absoluteIndex: pageIndex,
          },
        ]
      : items.map((item, absoluteIndex) => ({
          item,
          absoluteIndex,
        }));
  const updateItem = (index2, next2) => {
    if (Array.isArray(value)) {
      onChange(JSON.stringify(items.map((item, i2) => (i2 === index2 ? next2 : item))));
      return;
    }
    onChange(next2);
  };
  return (
    <div data-action-ui-id={`tool-confirm-param-${paramKey}`} className="flex flex-col gap-2">
      {visibleItems.map(({ item, absoluteIndex }) => (
        <Textarea
          key={`${paramKey}-${absoluteIndex}`}
          value={item}
          rows={3}
          onChange={(e2) => updateItem(absoluteIndex, e2.target.value)}
          className="resize-none !rounded-sm border-border bg-transparent px-3 py-2 !text-body-14 text-muted-foreground shadow-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 dark:bg-transparent placeholder:text-tertiary"
          style={{
            fieldSizing: "content",
          }}
        />
      ))}
    </div>
  );
}
function InlineEnumOptions({
  paramKey,
  values: values3,
  value,
  disabled: disabled2 = false,
  displayMap,
  onChange,
  onSelect,
}) {
  const { t: t2 } = useTranslation();
  return (
    <div
      className="flex max-h-56 flex-wrap gap-1 overflow-y-auto"
      data-action-ui-id={`tool-confirm-param-${paramKey}`}
    >
      {values3.map((option2) => {
        const active2 = option2 === value;
        return (
          <button
            key={option2}
            type="button"
            disabled={disabled2}
            data-action-ui-id={`tool-confirm-param-${paramKey}-option-${option2}`}
            className={cn$2(
              "inline-flex min-w-0 max-w-full items-center gap-1 rounded-sm border px-2.5 py-1 text-left text-body-12 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50",
              active2
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-background text-foreground hover:bg-muted",
            )}
            onClick={() => {
              onChange(option2);
              onSelect?.();
            }}
          >
            <span className="truncate">{displayEnumValue(paramKey, option2, t2, displayMap)}</span>
            {active2 && <Icon icon={Check} size="sm" className="shrink-0" />}
          </button>
        );
      })}
    </div>
  );
}
function EditableParamChip({
  paramKey,
  value,
  displayValue,
  originalValue,
  hint,
  displayMap,
  categoryIcon,
  batchPageIndex,
  batchPageCount,
  onChange,
}) {
  const { t: t2 } = useTranslation();
  const label = getParamLabel(paramKey);
  const ParamIcon = MODEL_NAME_KEYS.has(paramKey) ? categoryIcon : TAG_ICON$1[paramKey];
  const pagedArray =
    batchPageIndex !== void 0 &&
    batchPageCount > 1 &&
    Array.isArray(value) &&
    Array.isArray(originalValue) &&
    value.length === batchPageCount;
  const fieldValue = pagedArray ? value[batchPageIndex] : value;
  const fieldOriginalValue = pagedArray ? originalValue[batchPageIndex] : originalValue;
  const stringValue2 = stringifyParamValue(fieldValue);
  const handleChange = reactExports.useCallback(
    (nextValue) => {
      if (!pagedArray || batchPageIndex === void 0 || !Array.isArray(value)) {
        onChange(nextValue);
        return;
      }
      const next2 = [...value];
      next2[batchPageIndex] = parseParamValueLikeOriginal(fieldOriginalValue, nextValue);
      onChange(JSON.stringify(next2));
    },
    [batchPageIndex, fieldOriginalValue, onChange, pagedArray, value],
  );
  const [open, setOpen] = reactExports.useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        data-action-ui-id={`tool-confirm-param-${paramKey}`}
        title={label}
        className="inline-flex min-w-0 max-w-full shrink-0 items-center gap-0.5 px-2 py-0 rounded-sm text-body-12 text-foreground/70 hover:text-foreground transition-colors cursor-pointer"
      >
        {ParamIcon && <ParamIcon size={16} strokeWidth={1.5} className="shrink-0" />}
        <span className="whitespace-nowrap">
          {displayParamValue(displayValue ?? value, t2, displayMap, (v2) =>
            t2(v2 ? "chat.toolConfirm.booleanOn" : "chat.toolConfirm.booleanOff"),
          )}
        </span>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 rounded-sm">
        <div className="flex items-center gap-1 text-body-12 font-medium text-muted-foreground">
          {label}
          {hint?.description && !HIDE_DESC_KEYS.has(paramKey) && (
            <TooltipProvider delay={0}>
              <Tooltip>
                <TooltipTrigger className="cursor-pointer">
                  <Icon icon={Info$1} size="xs" className="shrink-0 text-brand-accent" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-60 text-body-12">
                  {hint.description}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <ParamField
          paramKey={paramKey}
          value={stringValue2}
          originalValue={fieldOriginalValue}
          hint={hint}
          displayMap={displayMap}
          onChange={handleChange}
          onEnumSelect={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
  );
}
function ReferenceMediaStrip({ paramKey, value, uploadingId, onPick, resolveUrl }) {
  const kind = mediaKindForKey(paramKey);
  const values3 = mediaValues(value);
  if (!kind || values3.length === 0) return null;
  return (
    <div
      data-action-ui-id={`tool-confirm-param-${paramKey}`}
      className="flex flex-col gap-1.5 min-w-0"
    >
      <div className="text-caption-10 font-medium text-muted-foreground">
        {getParamLabel(paramKey)}
      </div>
      <div className="flex items-center gap-1.5 overflow-x-auto min-w-0">
        {values3.map((path2, index2) => {
          const src = resolveMediaPath(path2, resolveUrl);
          const id2 = mediaItemId(paramKey, index2);
          const uploading = uploadingId === id2;
          const name2 = path2.split("/").pop() ?? path2;
          return (
            <button
              key={`${paramKey}-${path2}`}
              type="button"
              data-action-ui-id={`tool-confirm-media-${paramKey}-${index2}`}
              title={getParamLabel(paramKey)}
              disabled={uploading}
              className="group/media relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-sm border border-border/40 bg-card text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground disabled:opacity-60 disabled:cursor-wait"
              onClick={() => onPick(paramKey, index2, kind)}
            >
              {kind === "image" && src ? (
                <img
                  src={src}
                  alt={name2}
                  className="h-full w-full object-contain"
                  loading="lazy"
                  onError={(e2) => {
                    e2.currentTarget.style.display = "none";
                  }}
                />
              ) : kind === "video" && src ? (
                <video
                  src={src}
                  muted={true}
                  playsInline={true}
                  preload="metadata"
                  className="h-full w-full object-contain"
                >
                  <track kind="captions" />
                </video>
              ) : (
                <div className="flex max-w-full flex-col items-center gap-0.5 px-1">
                  <Icon icon={AudioLines} size="md" className="shrink-0" />
                  <span className="max-w-full truncate text-caption-10">{name2}</span>
                </div>
              )}
              <span className="absolute inset-x-0 bottom-0 hidden bg-black/65 px-1 py-0.5 text-caption-10 leading-none text-white group-hover/media:block">
                {name2}
              </span>
              {uploading && (
                <span className="absolute inset-0 flex items-center justify-center bg-background/70">
                  <Icon icon={Loader2} size="sm" className="animate-spin text-foreground" />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
export function ToolConfirmCard({ message: message2, onSend, embedded = false }) {
  const { t: t2 } = useTranslation();
  const gatewayFetch2 = useGatewayFetch();
  const resolveUrl = useResolveMediaUrl();
  const data2 = message2.toolConfirmData;
  const requestId = message2.requestId;
  const originalArgs = reactExports.useMemo(() => data2?.args ?? {}, [data2]);
  const unionParamHints = data2?.paramHints;
  const vendorParamHints = data2?.vendorParamHints;
  const liftedEdits = useToolConfirmEdits();
  const submitting = Boolean(requestId && liftedEdits?.submittingIds?.has(requestId));
  const [localArgs, setLocalArgs] = reactExports.useState(originalArgs);
  const editedArgs =
    liftedEdits && requestId
      ? (liftedEdits.edits[requestId] ?? originalArgs)
      : (localArgs ?? originalArgs);
  const editedArgsRef = reactExports.useRef(editedArgs);
  editedArgsRef.current = editedArgs;
  const paramHints = reactExports.useMemo(() => {
    const vendor = typeof editedArgs.vendor === "string" ? editedArgs.vendor : void 0;
    const perVendor = vendor ? vendorParamHints?.[vendor] : void 0;
    const hints = perVendor
      ? {
          ...unionParamHints,
          ...perVendor,
        }
      : unionParamHints;
    return withMiniMaxH3ParamHints(editedArgs, hints);
  }, [unionParamHints, vendorParamHints, editedArgs]);
  const [batchPageIndex, setBatchPageIndex] = reactExports.useState(0);
  const [uploadingMediaId, setUploadingMediaId] = reactExports.useState(null);
  const [mediaInputAccept, setMediaInputAccept] = reactExports.useState(void 0);
  const mediaFileInputRef = reactExports.useRef(null);
  const pendingMediaPickRef = reactExports.useRef(null);
  const [comfyPreflight, setComfyPreflight] = reactExports.useState(null);
  const [comfyPreflightLoading, setComfyPreflightLoading] = reactExports.useState(false);
  const [comfyPreflightError, setComfyPreflightError] = reactExports.useState(null);
  const [comfyPreflightRevision, setComfyPreflightRevision] = reactExports.useState(0);
  const [comfyDraftMetadata, setComfyDraftMetadata] = reactExports.useState(null);
  const [comfyDraftLoading, setComfyDraftLoading] = reactExports.useState(false);
  const [comfyDraftError, setComfyDraftError] = reactExports.useState(null);
  const [comfyDraftRevision, setComfyDraftRevision] = reactExports.useState(0);
  const [comfyInputUploading, setComfyInputUploading] = reactExports.useState(null);
  const [comfyDownloadTaskIds, setComfyDownloadTaskIds] = reactExports.useState({});
  const [comfyDraftEdits, setComfyDraftEdits] = reactExports.useState({});
  const [comfyDraftInputBindings, setComfyDraftInputBindings] = reactExports.useState([]);
  const comfyInputRef = reactExports.useRef(null);
  const pendingComfyInputRef = reactExports.useRef(null);
  const taskCategory = reactExports.useMemo(() => resolveTaskCategory(data2?.tool ?? ""), [data2]);
  const isComfyUiRun = data2?.tool === COMFYUI_RUN_TOOL;
  const isComfyUiDraftEdit = data2?.tool === COMFYUI_DRAFT_EDIT_TOOL;
  const reviewMode = comfyUiReviewMode(editedArgs.review_mode);
  const { tasks: comfyDownloadTasks } = useComfyUiDownloadProgress();
  const repairOperations = reactExports.useMemo(
    () => comfyUiRepairOperations(editedArgs.repair_operations),
    [editedArgs.repair_operations],
  );
  const explicitComfyInputValues = reactExports.useMemo(
    () => comfyUiRunInputValues(editedArgs.input_values),
    [editedArgs.input_values],
  );
  const hasComfyUiInputBindings = reactExports.useMemo(
    () => comfyUiInputBindings(editedArgs.input_bindings).length > 0,
    [editedArgs.input_bindings],
  );
  const missingComfyInputKeys = reactExports.useMemo(
    () =>
      new Set(
        (comfyPreflight?.issues ?? [])
          .filter((issue) => issue.type === "missing_input")
          .map((issue) => `${issue.node_id}:${issue.parameter}`),
      ),
    [comfyPreflight?.issues],
  );
  const comfyInputValues = reactExports.useMemo(
    () =>
      mergeComfyUiInputValues(comfyPreflight?.input_values ?? [], explicitComfyInputValues)
        .filter(
          (entry) =>
            !isProtectedComfyUiModelParameter(entry.parameter) &&
            !missingComfyInputKeys.has(`${entry.node_id}:${entry.parameter}`),
        )
        .sort(
          (left, right) =>
            Number(isComfyUiPromptParameter(right.parameter)) -
            Number(isComfyUiPromptParameter(left.parameter)),
        ),
    [comfyPreflight?.input_values, explicitComfyInputValues, missingComfyInputKeys],
  );
  const displayedComfyInputValues = reactExports.useMemo(() => {
    if (reviewMode === "detailed") return comfyInputValues;
    const explicitKeys = new Set(explicitComfyInputValues.map(comfyUiInputValueKey));
    return comfyInputValues.filter((entry) => explicitKeys.has(comfyUiInputValueKey(entry)));
  }, [comfyInputValues, explicitComfyInputValues, reviewMode]);
  const shouldConfirmComfyUiPrompt =
    hasComfyUiInputBindings &&
    comfyInputValues.some((entry) => isComfyUiPromptParameter(entry.parameter));
  const comfyDraftParameters = comfyDraftMetadata?.draft_parameters ?? [];
  const comfyDraftStructuralOperations = reactExports.useMemo(
    () => comfyUiStructuralEditOperations(editedArgs.operations),
    [editedArgs.operations],
  );
  const comfyDraftOperations = reactExports.useMemo(
    () => [
      ...comfyDraftStructuralOperations,
      ...comfyDraftParameters.flatMap((entry) => {
        if (isLockedComfyUiDraftParameter(entry)) return [];
        const key2 = comfyUiInputValueKey(entry);
        if (!(key2 in comfyDraftEdits)) return [];
        return [
          {
            type: "set_node_parameter",
            node_id: entry.node_id,
            parameter: entry.parameter,
            value: comfyDraftEdits[key2],
          },
        ];
      }),
    ],
    [comfyDraftEdits, comfyDraftParameters, comfyDraftStructuralOperations],
  );
  const comfyDraftModifiedArgs = reactExports.useMemo(() => {
    if (!comfyDraftMetadata?.source_sha256) return void 0;
    return {
      ...Object.fromEntries(
        Object.entries(editedArgs).filter(
          ([key2]) => key2 !== "operations" && key2 !== "expected_source_sha256",
        ),
      ),
      expected_source_sha256: comfyDraftMetadata.source_sha256,
      operations: comfyDraftOperations,
      ...(comfyDraftInputBindings.length
        ? {
            input_bindings: comfyDraftInputBindings,
          }
        : {}),
    };
  }, [
    comfyDraftInputBindings,
    comfyDraftMetadata?.source_sha256,
    comfyDraftOperations,
    editedArgs,
  ]);
  reactExports.useEffect(() => {
    if (!isComfyUiRun || !requestId || message2.expired) {
      setComfyPreflight(null);
      setComfyPreflightError(null);
      return;
    }
    const controller = new AbortController();
    setComfyPreflightLoading(true);
    setComfyPreflightError(null);
    const workflowId = typeof editedArgs.workflow_id === "string" ? editedArgs.workflow_id : "";
    const sourceNodeId =
      typeof editedArgs.source_node_id === "string" ? editedArgs.source_node_id : "";
    void gatewayFetch2(API_PATHS.comfyUiWorkflowPreflight, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...(workflowId
          ? {
              workflow_id: workflowId,
            }
          : {}),
        ...(sourceNodeId
          ? {
              source_node_id: sourceNodeId,
            }
          : {}),
        ...(isComfyUiRun && repairOperations.length
          ? {
              repair_operations: repairOperations,
            }
          : {}),
        ...(isComfyUiRun && explicitComfyInputValues.length
          ? {
              input_values: explicitComfyInputValues,
            }
          : {}),
      }),
      signal: controller.signal,
    })
      .then(async (response) => {
        const value = await response.json().catch(() => void 0);
        if (!response.ok) {
          const reason =
            value && typeof value === "object" && typeof value.message === "string"
              ? value.message
              : `HTTP ${response.status}`;
          throw new Error(reason);
        }
        setComfyPreflight(asComfyUiPreflightResponse(value));
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setComfyPreflight(null);
        setComfyPreflightError(error instanceof Error ? error.message : String(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setComfyPreflightLoading(false);
      });
    return () => controller.abort();
  }, [
    editedArgs.source_node_id,
    editedArgs.workflow_id,
    gatewayFetch2,
    isComfyUiRun,
    message2.expired,
    requestId,
    comfyPreflightRevision,
    explicitComfyInputValues,
    repairOperations,
  ]);
  reactExports.useEffect(() => {
    if (!isComfyUiDraftEdit || !requestId || message2.expired) {
      setComfyDraftMetadata(null);
      setComfyDraftError(null);
      return;
    }
    const controller = new AbortController();
    setComfyDraftLoading(true);
    setComfyDraftError(null);
    const workflowId = typeof editedArgs.workflow_id === "string" ? editedArgs.workflow_id : "";
    const sourceNodeId =
      typeof editedArgs.source_node_id === "string" ? editedArgs.source_node_id : "";
    void gatewayFetch2(API_PATHS.comfyUiWorkflowDraftParameters, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...(workflowId
          ? {
              workflow_id: workflowId,
            }
          : {}),
        ...(sourceNodeId
          ? {
              source_node_id: sourceNodeId,
            }
          : {}),
      }),
      signal: controller.signal,
    })
      .then(async (response) => {
        const value = await response.json().catch(() => void 0);
        if (!response.ok) {
          const reason =
            value && typeof value === "object" && typeof value.message === "string"
              ? value.message
              : `HTTP ${response.status}`;
          throw new Error(reason);
        }
        setComfyDraftMetadata(asComfyUiDraftParametersResponse(value));
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setComfyDraftMetadata(null);
        setComfyDraftError(error instanceof Error ? error.message : String(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setComfyDraftLoading(false);
      });
    return () => controller.abort();
  }, [
    comfyDraftRevision,
    editedArgs.source_node_id,
    editedArgs.workflow_id,
    gatewayFetch2,
    isComfyUiDraftEdit,
    message2.expired,
    requestId,
  ]);
  reactExports.useEffect(() => {
    if (!liftedEdits || !requestId) return;
    const nextArgs = isComfyUiDraftEdit
      ? comfyDraftOperations.length > 0
        ? comfyDraftModifiedArgs
        : void 0
      : isComfyUiRun && comfyPreflight?.source_sha256
        ? {
            ...sanitizeComfyUiRunArgs(editedArgs),
            expected_source_sha256: comfyPreflight.source_sha256,
          }
        : void 0;
    if (!nextArgs) return;
    if (JSON.stringify(liftedEdits.edits[requestId]) === JSON.stringify(nextArgs)) return;
    liftedEdits.setEdit(requestId, nextArgs);
  }, [
    comfyDraftModifiedArgs,
    comfyDraftOperations.length,
    comfyPreflight?.source_sha256,
    editedArgs,
    isComfyUiDraftEdit,
    isComfyUiRun,
    liftedEdits,
    requestId,
  ]);
  const CategoryIcon = CATEGORY_ICON$1[taskCategory];
  const modelPreferType = reactExports.useMemo(
    () => registryMediaTypeForCategory(taskCategory),
    [taskCategory],
  );
  const { data: mentionModels } = useMentionModels();
  const modelDisplayMap = reactExports.useMemo(() => {
    const map3 = new Map();
    if (!mentionModels) return map3;
    for (const m3 of mentionModels) {
      if (!m3.display_name) continue;
      const displayName2 = redactForCurrentRegion(
        m3.display_name || resolveModelNameForCurrentRegion(m3.model_name, modelPreferType),
      );
      const publicToken = m3.mention_name ?? m3.model_name;
      map3.set(publicToken, displayName2);
      map3.set(m3.model_name, displayName2);
      map3.set(m3.id, displayName2);
    }
    return map3;
  }, [mentionModels, modelPreferType]);
  for (const key2 of MODEL_NAME_KEYS) {
    const value = editedArgs[key2];
    if (typeof value === "string" && value) {
      modelDisplayMap.set(
        value,
        modelDisplayMap.get(value) ?? resolveModelNameForCurrentRegion(value, modelPreferType),
      );
    } else if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === "string" && item) {
          modelDisplayMap.set(
            item,
            modelDisplayMap.get(item) ?? resolveModelNameForCurrentRegion(item, modelPreferType),
          );
        }
      }
    }
  }
  const { data: mediaModels } = useMediaModels();
  reactExports.useMemo(() => {
    const tool2 = data2?.tool;
    if (!tool2 || !mediaModels) return void 0;
    if (tool2 === IMAGE_DISPATCHER_TOOL || tool2 === VIDEO_DISPATCHER_TOOL) {
      const vendor = typeof originalArgs.vendor === "string" ? originalArgs.vendor : void 0;
      return resolveDispatcherSeriesLabel(tool2, vendor, mediaModels);
    }
    const match2 = mediaModels.find((m3) => m3.tool_names.includes(tool2));
    return match2?.display_name ? redactForCurrentRegion(match2.display_name) : void 0;
  }, [data2?.tool, originalArgs.vendor, mediaModels]);
  const visibleKeys = reactExports.useMemo(() => {
    const vp = editedArgs.vendor_params;
    const hasVp = isVendorParamsObject(vp);
    const overrides2 = editedArgs.overrides;
    const hasOverrides = isComfyUiRun && isVendorParamsObject(overrides2);
    const isVisible = (key2) =>
      !(isComfyUiRun && key2 === "review_mode") &&
      !isInheritedSeedance25Param(data2?.tool, editedArgs, key2) &&
      (!isInternalKey(key2) || (isComfyUiRun && COMFYUI_OVERRIDE_KEYS.has(key2)));
    const top2 = Object.keys(editedArgs).filter(
      (k2) =>
        isVisible(k2) &&
        k2 !== "vendor_params" &&
        k2 !== "overrides" &&
        // A vendor knob that ALSO lives in vendor_params is rendered from the
        // nested copy (readArg reads vendor_params first). Drop the top-level
        // duplicate so it doesn't render twice — and so the dispatcher's
        // top-level `mode` (generation TYPE t2v/i2v) doesn't shadow
        // vendor_params.mode (kling quality std/pro/4k → resolution).
        !(hasVp && VENDOR_PARAM_KEYS.has(k2) && k2 in vp),
    );
    const nestedOverrides = hasOverrides
      ? Object.keys(overrides2).filter((key2) => COMFYUI_OVERRIDE_KEYS.has(key2) && isVisible(key2))
      : [];
    if (!hasVp) return [...top2, ...nestedOverrides];
    const nested = Object.keys(vp).filter(
      (k2) =>
        VENDOR_PARAM_KEYS.has(k2) &&
        !isInternalKey(k2) &&
        !isInheritedSeedance25Param(data2?.tool, editedArgs, k2),
    );
    return [...top2, ...nested, ...nestedOverrides];
  }, [data2?.tool, editedArgs, isComfyUiRun]);
  const readArg = reactExports.useCallback(
    (source, key2) => {
      if (isComfyUiRun && COMFYUI_OVERRIDE_KEYS.has(key2)) {
        const overrides2 = source.overrides;
        if (isVendorParamsObject(overrides2) && key2 in overrides2) return overrides2[key2];
      }
      if (VENDOR_PARAM_KEYS.has(key2)) {
        const vp = source.vendor_params;
        if (isVendorParamsObject(vp) && key2 in vp) return vp[key2];
      }
      return source[key2];
    },
    [isComfyUiRun],
  );
  const batchPageCount = reactExports.useMemo(
    () => batchPageCountForArgs(editedArgs, visibleKeys),
    [editedArgs, visibleKeys],
  );
  reactExports.useEffect(() => {
    setBatchPageIndex((index2) => Math.min(index2, Math.max(0, batchPageCount - 1)));
  }, [batchPageCount]);
  const promptKeys = reactExports.useMemo(
    () => visibleKeys.filter((key2) => PROMPT_KEYS.has(key2)),
    [visibleKeys],
  );
  const mediaKeys = reactExports.useMemo(
    () =>
      visibleKeys.filter(
        (key2) => !!mediaKindForKey(key2) && mediaValues(readArg(editedArgs, key2)).length > 0,
      ),
    [visibleKeys, editedArgs, readArg],
  );
  const chipKeys = reactExports.useMemo(
    () =>
      visibleKeys.filter(
        (key2) =>
          !PROMPT_KEYS.has(key2) &&
          !mediaKindForKey(key2) &&
          TIMELINE_VISIBLE_TAG_KEYS.has(key2) &&
          // Skip the `mode` chip when the value is a hidden capability
          // generation type (t2v / i2v). The agent picks these based on
          // trigger context, not user-meaningful choices — the chip would
          // otherwise display the raw English value and clutter the card.
          // The dropdown options for `mode` are also filtered (see
          // ParamField) so users can't pick the hidden values either.
          !(
            key2 === "mode" && isHiddenVideoGenerationMode(String(readArg(editedArgs, key2) ?? ""))
          ),
      ),
    [visibleKeys, editedArgs, readArg],
  );
  const modeDisplayMap = reactExports.useMemo(() => {
    const map3 = new Map(VIDEO_QUALITY_VALUE_DISPLAY_MAP);
    map3.set("first-last-frame", t2("chat.videoMode.firstLastFrame", "首尾帧"));
    map3.set("multimodal", t2("chat.videoMode.omniReference", "全能参考"));
    map3.set("omni", t2("chat.videoMode.omniReference", "全能参考"));
    map3.set("video-edit", t2("chat.videoMode.videoEdit", "视频编辑"));
    map3.set("video-extend", t2("chat.videoMode.videoExtend", "视频续写"));
    map3.set("avatar", t2("chat.videoMode.avatar", "数字人"));
    return map3;
  }, [t2]);
  const setArgValue = reactExports.useCallback(
    (key2, value) => {
      const current2 = editedArgsRef.current;
      let next2;
      if (
        isComfyUiRun &&
        COMFYUI_OVERRIDE_KEYS.has(key2) &&
        isVendorParamsObject(current2.overrides)
      ) {
        next2 = {
          ...current2,
          overrides: {
            ...current2.overrides,
            [key2]: value,
          },
        };
      } else if (
        VENDOR_PARAM_KEYS.has(key2) &&
        isVendorParamsObject(current2.vendor_params) &&
        (key2 !== "mode" || Object.hasOwn(current2.vendor_params, key2))
      ) {
        next2 = {
          ...current2,
          vendor_params: {
            ...current2.vendor_params,
            [key2]: value,
          },
        };
      } else {
        next2 = {
          ...current2,
          [key2]: value,
        };
      }
      if (liftedEdits && requestId) {
        liftedEdits.setEdit(requestId, next2);
      } else {
        setLocalArgs(next2);
      }
    },
    [isComfyUiRun, liftedEdits, requestId],
  );
  const updateArg = reactExports.useCallback(
    (key2, value) => {
      const original = readArg(originalArgs, key2);
      let parsed = value;
      if (typeof original === "number") {
        const n2 = Number(value);
        if (Number.isFinite(n2)) parsed = n2;
      } else if (typeof original === "boolean") {
        parsed = value === "true";
      } else if (Array.isArray(original)) {
        try {
          parsed = JSON.parse(value);
        } catch {
          parsed = value;
        }
      }
      setArgValue(key2, parsed);
    },
    [originalArgs, setArgValue, readArg],
  );
  const setComfyDraftParameterValue = reactExports.useCallback((entry, value) => {
    if (isLockedComfyUiDraftParameter(entry)) return;
    const nextValue = parseParamValueLikeOriginal(entry.value, value);
    const key2 = comfyUiInputValueKey(entry);
    setComfyDraftEdits((current2) => {
      if (Object.is(nextValue, entry.value)) {
        if (!(key2 in current2)) return current2;
        const next2 = {
          ...current2,
        };
        delete next2[key2];
        return next2;
      }
      return {
        ...current2,
        [key2]: nextValue,
      };
    });
  }, []);
  const setComfyImportedInput = reactExports.useCallback(
    (issue, filename, workspacePath) => {
      if (isComfyUiDraftEdit) {
        const parameter = comfyDraftParameters.find(
          (entry) => entry.node_id === issue.node_id && entry.parameter === issue.parameter,
        );
        if (parameter) {
          setComfyDraftParameterValue(parameter, filename);
          setComfyDraftInputBindings((current2) => [
            ...current2.filter(
              (binding) =>
                binding.node_id !== issue.node_id || binding.parameter !== issue.parameter,
            ),
            {
              node_id: issue.node_id,
              parameter: issue.parameter,
              workspace_path: workspacePath,
            },
          ]);
        }
        return;
      }
      const currentArgs = editedArgsRef.current;
      const operations = comfyUiRepairOperations(currentArgs.repair_operations).filter(
        (operation) =>
          operation.node_id !== issue.node_id || operation.parameter !== issue.parameter,
      );
      operations.push({
        type: "set_node_parameter",
        node_id: issue.node_id,
        parameter: issue.parameter,
        value: filename,
      });
      const bindings = comfyUiInputBindings(currentArgs.input_bindings).filter(
        (binding) => binding.node_id !== issue.node_id || binding.parameter !== issue.parameter,
      );
      bindings.push({
        node_id: issue.node_id,
        parameter: issue.parameter,
        workspace_path: workspacePath,
      });
      const nextArgs = {
        ...currentArgs,
        repair_operations: operations,
        input_bindings: bindings,
      };
      if (liftedEdits && requestId) {
        liftedEdits.setEdit(requestId, nextArgs);
      } else {
        setLocalArgs(nextArgs);
      }
    },
    [comfyDraftParameters, isComfyUiDraftEdit, liftedEdits, requestId, setComfyDraftParameterValue],
  );
  const setComfyInputValue = reactExports.useCallback(
    (entry, value) => {
      const current2 = structuredClone(explicitComfyInputValues);
      const key2 = comfyUiInputValueKey(entry);
      const index2 = current2.findIndex((candidate) => comfyUiInputValueKey(candidate) === key2);
      const next2 = {
        node_id: entry.node_id,
        parameter: entry.parameter,
        value: parseParamValueLikeOriginal(entry.value, value),
      };
      if (index2 >= 0) current2[index2] = next2;
      else current2.push(next2);
      setArgValue("input_values", comfyUiRunInputValues(current2));
    },
    [explicitComfyInputValues, setArgValue],
  );
  const handleComfyInputPick = reactExports.useCallback((issue) => {
    if (issue.type !== "missing_input") return;
    pendingComfyInputRef.current = issue;
    if (comfyInputRef.current) {
      comfyInputRef.current.accept = acceptForMediaKind(issue.media_kind) ?? "";
      comfyInputRef.current.click();
    }
  }, []);
  const handleComfyExistingInputPick = reactExports.useCallback((entry) => {
    const mediaKind2 = comfyUiInputMediaKind(entry);
    if (!mediaKind2) return;
    pendingComfyInputRef.current = {
      type: "missing_input",
      node_id: entry.node_id,
      node_type: "",
      parameter: entry.parameter,
      media_kind: mediaKind2,
      ...(typeof entry.value === "string" && entry.value
        ? {
            current_value: entry.value,
          }
        : {}),
    };
    if (comfyInputRef.current) {
      comfyInputRef.current.accept = acceptForMediaKind(mediaKind2) ?? "";
      comfyInputRef.current.click();
    }
  }, []);
  const handleComfyInputChange = reactExports.useCallback(
    async (event) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      const issue = pendingComfyInputRef.current;
      pendingComfyInputRef.current = null;
      if (!file || issue?.type !== "missing_input") return;
      const issueKey = `${issue.node_id}:${issue.parameter}`;
      setComfyInputUploading(issueKey);
      try {
        const form = new FormData();
        form.append("file", file, file.name);
        form.append("media_kind", issue.media_kind);
        const response = await gatewayFetch2(API_PATHS.comfyUiInputImport, {
          method: "POST",
          body: form,
        });
        const value = await response.json().catch(() => void 0);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const imported = value;
        if (
          typeof imported.filename !== "string" ||
          imported.media_kind !== issue.media_kind ||
          typeof imported.workspace_path !== "string"
        ) {
          throw new Error("Invalid ComfyUI input import response");
        }
        setComfyImportedInput(issue, imported.filename, imported.workspace_path);
      } catch (error) {
        dedupedToast.error(
          t2("chat.toolConfirm.comfyInputImportFailed", "导入 ComfyUI 输入失败：{{reason}}", {
            reason: error instanceof Error ? error.message : String(error),
          }),
        );
      } finally {
        setComfyInputUploading(null);
      }
    },
    [gatewayFetch2, setComfyImportedInput, t2],
  );
  const handleComfyModelDownload = reactExports.useCallback(
    async (issue) => {
      if (issue.type !== "missing_model" || !issue.dependency?.url || !comfyPreflight) return;
      const issueKey = `${issue.node_id}:${issue.parameter}`;
      try {
        const task = await homeService.comfyUiModelDownload.prepareWorkflow({
          workflowId: comfyPreflight.workflow_id,
          workflowTitle: comfyPreflight.workflow_title,
          models: [issue.dependency],
        });
        setComfyDownloadTaskIds((current2) => ({
          ...current2,
          [issueKey]: task.id,
        }));
      } catch (error) {
        dedupedToast.error(
          t2("chat.toolConfirm.comfyModelDownloadFailed", "模型下载失败：{{reason}}", {
            reason: error instanceof Error ? error.message : String(error),
          }),
        );
      }
    },
    [comfyPreflight, t2],
  );
  const handleMediaPick = reactExports.useCallback((paramKey, index2, kind) => {
    pendingMediaPickRef.current = {
      paramKey,
      index: index2,
      kind,
    };
    setMediaInputAccept(acceptForMediaKind(kind));
    window.setTimeout(() => mediaFileInputRef.current?.click(), 0);
  }, []);
  const handleMediaFileChange = reactExports.useCallback(
    async (event) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      const pending2 = pendingMediaPickRef.current;
      pendingMediaPickRef.current = null;
      if (!file || !pending2) return;
      const id2 = mediaItemId(pending2.paramKey, pending2.index);
      setUploadingMediaId(id2);
      try {
        const form = new FormData();
        form.append("file", file, file.name);
        const response = await gatewayFetch2(API_PATHS.upload, {
          method: "POST",
          body: form,
        });
        const nextPath = uploadedRelativePath(await response.json());
        if (!nextPath) throw new Error(t2("chat.uploadError.missingPath"));
        const current2 = editedArgsRef.current[pending2.paramKey];
        setArgValue(pending2.paramKey, updateIndexedMediaValue(current2, pending2.index, nextPath));
      } catch (err) {
        const reason =
          err instanceof Error ? err.message : t2("chat.uploadError.generic", "Upload failed");
        dedupedToast.error(
          t2("chat.uploadFailed", "Failed to upload {{name}}: {{reason}}", {
            name: file.name,
            reason,
          }),
        );
      } finally {
        setUploadingMediaId(null);
      }
    },
    [gatewayFetch2, setArgValue, t2],
  );
  const hasChanges = reactExports.useMemo(() => {
    if (isComfyUiDraftEdit && Object.keys(comfyDraftEdits).length > 0) return true;
    for (const key2 of visibleKeys) {
      if (JSON.stringify(readArg(editedArgs, key2)) !== JSON.stringify(readArg(originalArgs, key2)))
        return true;
    }
    if (
      isComfyUiRun &&
      JSON.stringify(editedArgs.repair_operations) !==
        JSON.stringify(originalArgs.repair_operations)
    ) {
      return true;
    }
    if (
      isComfyUiRun &&
      JSON.stringify(editedArgs.input_values) !== JSON.stringify(originalArgs.input_values)
    ) {
      return true;
    }
    if (
      isComfyUiRun &&
      JSON.stringify(editedArgs.input_bindings) !== JSON.stringify(originalArgs.input_bindings)
    ) {
      return true;
    }
    return false;
  }, [
    comfyDraftEdits,
    editedArgs,
    isComfyUiDraftEdit,
    isComfyUiRun,
    originalArgs,
    visibleKeys,
    readArg,
  ]);
  const dispatch2 = reactExports.useCallback(
    (decision) => {
      if (!requestId || submitting) return;
      const sanitizedArgs = isComfyUiRun
        ? sanitizeComfyUiRunArgs(editedArgs)
        : isComfyUiDraftEdit
          ? Object.fromEntries(
              Object.entries(editedArgs).filter(
                ([key2]) => key2 !== "operations" && key2 !== "expected_source_sha256",
              ),
            )
          : editedArgs;
      const modifiedArgs =
        isComfyUiDraftEdit && comfyDraftModifiedArgs
          ? comfyDraftModifiedArgs
          : isComfyUiRun && comfyPreflight?.source_sha256
            ? {
                ...sanitizedArgs,
                expected_source_sha256: comfyPreflight.source_sha256,
              }
            : sanitizedArgs;
      const shouldSendModifiedArgs =
        isComfyUiDraftEdit ||
        hasChanges ||
        (isComfyUiRun && Boolean(comfyPreflight?.source_sha256));
      const msg = {
        type: "tool_confirm_reply",
        id: requestId,
        decision,
        ...(decision === "confirm" && shouldSendModifiedArgs
          ? {
              modified_args: modifiedArgs,
            }
          : {}),
      };
      onSend(msg);
    },
    [
      requestId,
      onSend,
      hasChanges,
      editedArgs,
      isComfyUiRun,
      isComfyUiDraftEdit,
      comfyPreflight?.source_sha256,
      comfyDraftModifiedArgs,
      submitting,
    ],
  );
  const handleConfirm = reactExports.useCallback(() => dispatch2("confirm"), [dispatch2]);
  const handleReject = reactExports.useCallback(() => dispatch2("reject"), [dispatch2]);
  const isExpired = message2.expired === true;
  const unresolvedComfyIssues = reactExports.useMemo(() => {
    if (!comfyPreflight) return [];
    return comfyPreflight.issues.filter((issue) => {
      const repair = repairOperations.find(
        (operation) =>
          operation.node_id === issue.node_id && operation.parameter === issue.parameter,
      );
      if (repair && typeof repair.value === "string" && repair.value) return false;
      if (issue.type !== "missing_model") return true;
      const taskId = comfyDownloadTaskIds[`${issue.node_id}:${issue.parameter}`];
      const task = comfyDownloadTasks.find((candidate) => candidate.id === taskId);
      return !(
        task?.status === "completed" && !isComfyUiModelUnavailable(task, issue.current_value)
      );
    });
  }, [comfyDownloadTaskIds, comfyDownloadTasks, comfyPreflight, repairOperations]);
  const comfyConfirmBlocked =
    (isComfyUiRun &&
      (!comfyPreflight ||
        comfyPreflightLoading ||
        Boolean(comfyPreflightError) ||
        unresolvedComfyIssues.length > 0)) ||
    (isComfyUiDraftEdit &&
      (!comfyDraftMetadata ||
        comfyDraftLoading ||
        Boolean(comfyDraftError) ||
        comfyDraftOperations.length === 0));
  reactExports.useEffect(() => {
    if (!liftedEdits || !requestId || (!isComfyUiRun && !isComfyUiDraftEdit)) return;
    const isChecking = isComfyUiRun
      ? comfyPreflightLoading || !comfyPreflight
      : comfyDraftLoading || !comfyDraftMetadata;
    const state2 = isChecking ? "checking" : comfyConfirmBlocked ? "blocked" : "ready";
    liftedEdits.setApprovalState(requestId, state2);
  }, [
    comfyConfirmBlocked,
    comfyDraftLoading,
    comfyDraftMetadata,
    comfyPreflight,
    comfyPreflightLoading,
    isComfyUiDraftEdit,
    isComfyUiRun,
    liftedEdits,
    requestId,
  ]);
  if (!requestId || !data2) return null;
  const content2 = (
    <>
      {isExpired ? (
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Icon icon={Clock} size="xs" className="shrink-0" />
            {t2("chat.toolConfirm.expired", "Request timed out")}
          </span>
          <button
            type="button"
            data-action-ui-id="chat-tool-confirm-close"
            className="cursor-pointer rounded-md border border-border px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={handleReject}
          >
            {t2("chat.toolConfirm.close", "Close")}
          </button>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            {isComfyUiRun && (
              <div className="rounded-sm border border-border bg-muted/30 p-2.5">
                <div className="mb-2 flex items-center justify-between gap-3 border-b border-border pb-2">
                  <span className="min-w-0 truncate text-body-12 font-medium text-foreground">
                    {comfyPreflight?.workflow_title ??
                      t2("chat.toolConfirm.comfyWorkflowFallback", "ComfyUI 工作流")}
                  </span>
                  <span className="shrink-0 text-caption-11 text-muted-foreground">
                    {typeof editedArgs.count === "number" ? editedArgs.count : 1}{" "}
                    {t2("chat.toolConfirm.comfyRunCountUnit", "次")}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-body-12 font-medium text-foreground">
                  {comfyPreflightLoading ? (
                    <Loader2 size={14} className="animate-spin text-muted-foreground" />
                  ) : (
                    <AlertTriangle size={14} className="text-muted-foreground" />
                  )}
                  <span>
                    {comfyPreflightLoading
                      ? t2("chat.toolConfirm.comfyPreflightChecking", "正在检查工作流输入和模型")
                      : comfyPreflight?.ready
                        ? t2("chat.toolConfirm.comfyPreflightReady", "工作流已通过执行检查")
                        : t2(
                            "chat.toolConfirm.comfyPreflightNeedsRepair",
                            "执行前需要处理以下问题",
                          )}
                  </span>
                </div>
                {comfyPreflightError && (
                  <div className="mt-2 flex items-center justify-between gap-2 text-caption-11 text-muted-foreground">
                    <span className="min-w-0 break-words">{comfyPreflightError}</span>
                    <button
                      type="button"
                      data-action-ui-id="chat-tool-confirm-comfy-preflight-retry"
                      className="shrink-0 rounded-sm border border-border px-2 py-1 text-body-12 text-foreground hover:bg-muted"
                      onClick={() => setComfyPreflightRevision((value) => value + 1)}
                    >
                      {t2("chat.toolConfirm.retry", "重试")}
                    </button>
                  </div>
                )}
                {!comfyPreflightLoading &&
                  comfyPreflight?.issues.map((issue) => {
                    const issueKey = `${issue.node_id}:${issue.parameter}`;
                    const repair = repairOperations.find(
                      (operation) =>
                        operation.node_id === issue.node_id &&
                        operation.parameter === issue.parameter,
                    );
                    const taskId = comfyDownloadTaskIds[issueKey];
                    const downloadTask = comfyDownloadTasks.find((task) => task.id === taskId);
                    return (
                      <div
                        key={`${issue.type}:${issueKey}`}
                        className="mt-2 flex items-start justify-between gap-3 border-t border-border pt-2"
                      >
                        <div className="min-w-0">
                          <div className="text-body-12 text-foreground">
                            {issue.type === "missing_input"
                              ? t2("chat.toolConfirm.comfyMissingInput", "缺少{{kind}}输入", {
                                  kind:
                                    issue.media_kind === "image"
                                      ? t2("common.image", "图片")
                                      : issue.media_kind === "audio"
                                        ? t2("common.audio", "音频")
                                        : t2("common.video", "视频"),
                                })
                              : t2("chat.toolConfirm.comfyMissingModel", "模型不可用")}
                          </div>
                          <div className="mt-0.5 break-all text-caption-11 text-muted-foreground">
                            {issue.node_type}
                            {" · "}
                            {issue.parameter}
                            {issue.current_value ? ` · ${issue.current_value}` : ""}
                          </div>
                          {downloadTask && (
                            <div className="mt-1 text-caption-11 text-muted-foreground">
                              {downloadTask.status === "completed"
                                ? t2("chat.toolConfirm.comfyDownloadCompleted", "模型已准备完成")
                                : downloadTask.status === "failed"
                                  ? downloadTask.error
                                  : t2("chat.toolConfirm.comfyDownloading", "正在准备模型")}
                            </div>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          {issue.type === "missing_input" ? (
                            <button
                              type="button"
                              data-action-ui-id={`chat-tool-confirm-comfy-input-${issueKey}`}
                              disabled={comfyInputUploading === issueKey}
                              className="inline-flex items-center gap-1 rounded-sm border border-border px-2 py-1 text-body-12 text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                              onClick={() => handleComfyInputPick(issue)}
                            >
                              {comfyInputUploading === issueKey && (
                                <Loader2 size={13} className="animate-spin" />
                              )}
                              {repair
                                ? t2("chat.toolConfirm.comfyReplaceInput", "重新选择")
                                : t2("chat.toolConfirm.comfySelectInput", "选择文件")}
                            </button>
                          ) : (
                            issue.dependency?.url &&
                            downloadTask?.status !== "completed" && (
                              <button
                                type="button"
                                data-action-ui-id={`chat-tool-confirm-comfy-download-${issueKey}`}
                                disabled={
                                  downloadTask?.status === "queued" ||
                                  downloadTask?.status === "verifying" ||
                                  downloadTask?.status === "downloading"
                                }
                                className="rounded-sm border border-border px-2 py-1 text-body-12 text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                                onClick={() => void handleComfyModelDownload(issue)}
                              >
                                {t2("chat.toolConfirm.comfyDownloadModel", "下载缺失模型")}
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    );
                  })}
                {!comfyPreflightLoading && shouldConfirmComfyUiPrompt && (
                  <div className="mt-2 border-t border-border pt-2 text-caption-11 text-muted-foreground">
                    {t2(
                      "chat.toolConfirm.comfyReferencePromptWarning",
                      "已更换参考素材，请确认提示词仍与新素材一致",
                    )}
                  </div>
                )}
              </div>
            )}
            {isComfyUiDraftEdit && (
              <div className="rounded-sm border border-border bg-muted/30 p-2.5">
                <div className="mb-2 flex items-center justify-between gap-3 border-b border-border pb-2">
                  <span className="min-w-0 truncate text-body-12 font-medium text-foreground">
                    {comfyDraftMetadata?.workflow_title ??
                      t2("chat.toolConfirm.comfyWorkflowFallback", "ComfyUI 工作流")}
                  </span>
                  <span className="shrink-0 text-caption-11 text-muted-foreground">
                    {t2("chat.toolConfirm.comfyDraftBadge", "Workflow Draft")}
                  </span>
                </div>
                {comfyDraftLoading && (
                  <div className="flex items-center gap-1.5 text-body-12 text-muted-foreground">
                    <Loader2 size={14} className="animate-spin" />
                    {t2("chat.toolConfirm.comfyDraftLoading", "正在读取工作流参数")}
                  </div>
                )}
                {comfyDraftError && (
                  <div className="flex items-center justify-between gap-2 text-caption-11 text-muted-foreground">
                    <span className="min-w-0 break-words">{comfyDraftError}</span>
                    <button
                      type="button"
                      data-action-ui-id="chat-tool-confirm-comfy-draft-retry"
                      className="shrink-0 rounded-sm border border-border px-2 py-1 text-body-12 text-foreground hover:bg-muted"
                      onClick={() => setComfyDraftRevision((value) => value + 1)}
                    >
                      {t2("chat.toolConfirm.retry", "重试")}
                    </button>
                  </div>
                )}
                {!comfyDraftLoading && !comfyDraftError && comfyDraftParameters.length === 0 && (
                  <div className="text-body-12 text-muted-foreground">
                    {t2("chat.toolConfirm.comfyDraftNoParameters", "没有可编辑的工作流参数")}
                  </div>
                )}
                {!comfyDraftLoading && comfyDraftParameters.length > 0 && (
                  <div
                    data-action-ui-id="chat-tool-confirm-comfy-draft-parameter-list"
                    className="divide-y divide-border rounded-sm border border-border bg-background"
                  >
                    {comfyDraftParameters.map((entry) => {
                      const key2 = comfyUiInputValueKey(entry);
                      const parameterLocked = isLockedComfyUiDraftParameter(entry);
                      const currentValue =
                        key2 in comfyDraftEdits ? comfyDraftEdits[key2] : entry.value;
                      const label =
                        entry.label === entry.parameter
                          ? getComfyUiInputLabel(entry.parameter)
                          : entry.label;
                      return (
                        <div
                          key={key2}
                          className="grid gap-1 px-2.5 py-2 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] sm:items-center sm:gap-3"
                        >
                          <div className="min-w-0">
                            <div className="truncate text-body-12 font-medium text-foreground">
                              {label}
                            </div>
                            <div
                              title={`${entry.node_id}.${entry.parameter}`}
                              className="truncate text-caption-11 text-muted-foreground"
                            >
                              {entry.node_id}.{entry.parameter}
                            </div>
                          </div>
                          {entry.control === "media" && entry.media_kind ? (
                            <div className="flex items-center justify-between gap-2">
                              <span className="min-w-0 truncate text-body-12 text-muted-foreground">
                                {typeof currentValue === "string" && currentValue
                                  ? currentValue
                                  : t2("chat.toolConfirm.comfyInputNotSelected", "未选择文件")}
                              </span>
                              <button
                                type="button"
                                data-action-ui-id={`chat-tool-confirm-comfy-draft-media-${key2}`}
                                disabled={parameterLocked || comfyInputUploading === key2}
                                className="inline-flex shrink-0 items-center gap-1 rounded-sm border border-border px-2 py-1 text-body-12 text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                                onClick={() =>
                                  handleComfyExistingInputPick({
                                    ...entry,
                                    value: currentValue,
                                  })
                                }
                              >
                                {comfyInputUploading === key2 && (
                                  <Loader2 size={13} className="animate-spin" />
                                )}
                                {t2("chat.toolConfirm.comfyReplaceExistingInput", "重新选择")}
                              </button>
                            </div>
                          ) : (
                            <ParamField
                              paramKey={entry.parameter}
                              value={stringifyParamValue(currentValue)}
                              originalValue={entry.value}
                              hint={
                                entry.control === "enum" && entry.values
                                  ? {
                                      type: "enum",
                                      values: entry.values,
                                    }
                                  : void 0
                              }
                              multiline={entry.control === "textarea"}
                              disabled={parameterLocked}
                              onChange={(value) => setComfyDraftParameterValue(entry, value)}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            {promptKeys.map((key2) => (
              <EditablePromptBlock
                key={key2}
                paramKey={key2}
                value={readArg(editedArgs, key2)}
                pageIndex={batchPageCount > 1 ? batchPageIndex : void 0}
                onChange={(v2) => updateArg(key2, v2)}
              />
            ))}
            {isComfyUiRun && displayedComfyInputValues.length > 0 && (
              <div
                data-action-ui-id="chat-tool-confirm-comfy-parameter-list"
                className="divide-y divide-border rounded-sm border border-border bg-muted/30"
              >
                {displayedComfyInputValues.map((entry) => (
                  <div
                    key={`${entry.node_id}:${entry.parameter}`}
                    className="grid gap-1 px-2.5 py-2 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] sm:items-center sm:gap-3"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-body-12 font-medium text-foreground">
                        {getComfyUiInputLabel(entry.parameter)}
                      </div>
                      <div
                        title={`${entry.node_id}.${entry.parameter}`}
                        className="truncate text-caption-11 text-muted-foreground"
                      >
                        {entry.node_id}.{entry.parameter}
                      </div>
                    </div>
                    {comfyUiInputMediaKind(entry) ? (
                      <div className="flex items-center justify-between gap-2">
                        <span className="min-w-0 truncate text-body-12 text-muted-foreground">
                          {typeof entry.value === "string" && entry.value
                            ? entry.value
                            : t2("chat.toolConfirm.comfyInputNotSelected", "未选择文件")}
                        </span>
                        <button
                          type="button"
                          data-action-ui-id={`chat-tool-confirm-comfy-existing-input-${entry.node_id}:${entry.parameter}`}
                          disabled={comfyInputUploading === `${entry.node_id}:${entry.parameter}`}
                          className="inline-flex shrink-0 items-center gap-1 rounded-sm border border-border px-2 py-1 text-body-12 text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                          onClick={() => handleComfyExistingInputPick(entry)}
                        >
                          {comfyInputUploading === `${entry.node_id}:${entry.parameter}` && (
                            <Loader2 size={13} className="animate-spin" />
                          )}
                          {t2("chat.toolConfirm.comfyReplaceExistingInput", "重新选择")}
                          {comfyUiInputMediaKind(entry) === "image"
                            ? t2("common.image", "图片")
                            : comfyUiInputMediaKind(entry) === "audio"
                              ? t2("common.audio", "音频")
                              : t2("common.video", "视频")}
                        </button>
                      </div>
                    ) : (
                      <ParamField
                        paramKey={entry.parameter}
                        value={stringifyParamValue(entry.value)}
                        originalValue={entry.value}
                        hint={paramHints?.[entry.parameter]}
                        onChange={(value) => setComfyInputValue(entry, value)}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
            {(chipKeys.length > 0 || batchPageCount > 1) && (
              <div className="flex min-w-0 items-center">
                {chipKeys.length > 0 && (
                  <div className="flex min-w-0 items-center gap-1 h-7 text-body-12 text-foreground/70 overflow-x-auto scrollbar-none">
                    {chipKeys.map((key2, index2) => {
                      const isLast = index2 === chipKeys.length - 1;
                      return (
                        <span key={key2} className="inline-flex items-center gap-1 shrink-0">
                          <EditableParamChip
                            paramKey={key2}
                            value={readArg(editedArgs, key2)}
                            displayValue={valueAtBatchPage(
                              readArg(editedArgs, key2),
                              batchPageIndex,
                              batchPageCount,
                            )}
                            originalValue={readArg(originalArgs, key2)}
                            hint={paramHints?.[key2]}
                            displayMap={
                              MODEL_NAME_KEYS.has(key2)
                                ? modelDisplayMap
                                : key2 === "mode"
                                  ? modeDisplayMap
                                  : void 0
                            }
                            categoryIcon={CategoryIcon}
                            batchPageIndex={batchPageCount > 1 ? batchPageIndex : void 0}
                            batchPageCount={batchPageCount}
                            onChange={(v2) => updateArg(key2, v2)}
                          />
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
                )}
                <BatchPager
                  pageIndex={batchPageIndex}
                  pageCount={batchPageCount}
                  onChange={setBatchPageIndex}
                />
              </div>
            )}
            {mediaKeys.length > 0 && (
              <div className="flex flex-col">
                {mediaKeys.map((key2) => (
                  <ReferenceMediaStrip
                    key={key2}
                    paramKey={key2}
                    value={readArg(editedArgs, key2)}
                    uploadingId={uploadingMediaId}
                    onPick={handleMediaPick}
                    resolveUrl={resolveUrl}
                  />
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              data-action-ui-id="chat-tool-confirm-reject"
              disabled={submitting}
              className="inline-flex items-center justify-center px-2.5 py-1.5 rounded-md bg-foreground/5 text-body-12 font-medium text-foreground transition-colors hover:bg-foreground/10 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
              onClick={handleReject}
            >
              {t2("chat.toolConfirm.cancel", "Cancel")}
            </button>
            <button
              type="button"
              data-action-ui-id="chat-tool-confirm-confirm"
              disabled={comfyConfirmBlocked || submitting}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-foreground text-body-12 font-medium text-background transition-colors hover:bg-foreground/90 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
              onClick={handleConfirm}
            >
              <span>{t2("chat.toolConfirm.confirm", "Confirm")}</span>
              {hasChanges && (
                <span className="text-caption-10 opacity-70">
                  {t2("chat.toolConfirm.paramEdited", "(edited)")}
                </span>
              )}
            </button>
          </div>
          <input
            ref={mediaFileInputRef}
            type="file"
            accept={mediaInputAccept}
            className="hidden"
            onChange={handleMediaFileChange}
          />
          <input
            ref={comfyInputRef}
            type="file"
            className="hidden"
            onChange={handleComfyInputChange}
          />
        </>
      )}
    </>
  );
  if (embedded) {
    return (
      <div
        data-action-ui-id="chat-tool-confirm-card"
        data-tool-confirm-request-id={requestId}
        className={cn$2("min-w-0 flex flex-col gap-2", isExpired && "opacity-70")}
      >
        {content2}
      </div>
    );
  }
  return (
    <div
      data-action-ui-id="chat-tool-confirm-card"
      data-tool-confirm-request-id={requestId}
      className={cn$2("flex items-start gap-1 w-full min-w-0", isExpired && "opacity-70")}
    >
      <span className="shrink-0 size-6 flex items-center justify-center text-tertiary">
        <ToolConfirmBranchIcon />
      </span>
      <div className="flex-1 min-w-0 flex flex-col gap-2">{content2}</div>
    </div>
  );
}
function ParamField({
  paramKey,
  value,
  originalValue,
  hint,
  multiline = false,
  disabled: disabled2 = false,
  displayMap,
  onChange,
  onEnumSelect,
}) {
  const { t: t2 } = useTranslation();
  if (Array.isArray(originalValue)) {
    const items = (() => {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed.map(String) : [value];
      } catch {
        return [value];
      }
    })();
    const updateItem = (index2, v2) => {
      const next2 = items.map((item, i2) => (i2 === index2 ? v2 : item));
      onChange(JSON.stringify(next2));
    };
    const itemRows = items.map((item, index2) => ({
      item,
      index: index2,
      key: `${paramKey}:${String(originalValue[index2] ?? item)}:${index2}`,
    }));
    if (hint?.type === "enum") {
      return (
        <div className="flex flex-col gap-1" data-action-ui-id={`tool-confirm-param-${paramKey}`}>
          {itemRows.map(({ item, index: index2, key: key2 }) => (
            <ParamEnumPopover
              key={key2}
              paramKey={`${paramKey}[${index2}]`}
              paramLabel={getParamLabel(paramKey)}
              description={hint.description}
              values={filterModeHiddenValues(paramKey, hint.values)}
              value={item}
              disabled={disabled2}
              displayMap={displayMap}
              onChange={(v2) => updateItem(index2, v2)}
            />
          ))}
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-1" data-action-ui-id={`tool-confirm-param-${paramKey}`}>
        {itemRows.map(({ item, index: index2, key: key2 }) => {
          const isLongItem = paramKey === "prompts" || paramKey === "prompt" || item.length >= 40;
          return isLongItem ? (
            <Textarea
              key={key2}
              rows={3}
              value={item}
              disabled={disabled2}
              onChange={(e2) => updateItem(index2, e2.target.value)}
              className="text-xs bg-background dark:bg-background resize-y overflow-y-auto min-h-0 focus-visible:border-brand-accent focus-visible:ring-brand-accent/30"
              style={{
                fieldSizing: "fixed",
              }}
            />
          ) : (
            <Input3
              key={key2}
              value={item}
              disabled={disabled2}
              onChange={(e2) => updateItem(index2, e2.target.value)}
              className="text-xs h-7 bg-background dark:bg-background focus-visible:border-brand-accent focus-visible:ring-brand-accent/30"
            />
          );
        })}
      </div>
    );
  }
  if (hint?.type === "enum") {
    return (
      <InlineEnumOptions
        paramKey={paramKey}
        values={filterModeHiddenValues(paramKey, hint.values)}
        value={value}
        disabled={disabled2}
        displayMap={displayMap}
        onChange={onChange}
        onSelect={onEnumSelect}
      />
    );
  }
  if (hint?.type === "range") {
    const numValue = Number(value) || 0;
    const step = Number.isInteger(hint.min) && Number.isInteger(hint.max) ? 1 : 0.1;
    return (
      <div className="flex items-center gap-2" data-action-ui-id={`tool-confirm-param-${paramKey}`}>
        <Slider
          min={hint.min}
          max={hint.max}
          step={step}
          value={[numValue]}
          disabled={disabled2}
          onValueChange={(v2) => {
            const arr = Array.isArray(v2) ? v2 : [v2];
            onChange(String(arr[0]));
          }}
          className="flex-1"
        />
        <span className="shrink-0 w-8 text-right text-xs tabular-nums text-foreground">
          {numValue}
        </span>
      </div>
    );
  }
  if (typeof originalValue === "boolean") {
    return (
      <div className="flex items-center gap-2" data-action-ui-id={`tool-confirm-param-${paramKey}`}>
        <Switch
          checked={value === "true"}
          disabled={disabled2}
          onCheckedChange={(v2) => onChange(String(v2))}
        />
        <span className="text-xs text-muted-foreground">
          {value === "true" ? t2("chat.toolConfirm.booleanOn") : t2("chat.toolConfirm.booleanOff")}
        </span>
      </div>
    );
  }
  if (typeof originalValue === "number") {
    return (
      <Input3
        type="number"
        value={value}
        disabled={disabled2}
        onChange={(e2) => onChange(e2.target.value)}
        className="text-xs h-7 bg-background dark:bg-background focus-visible:border-brand-accent focus-visible:ring-brand-accent/30"
        data-action-ui-id={`tool-confirm-param-${paramKey}`}
      />
    );
  }
  const isLong =
    multiline ||
    isComfyUiPromptParameter(paramKey) ||
    String(value).length >= 40 ||
    String(originalValue ?? "").length >= 40;
  if (isLong) {
    return (
      <Textarea
        rows={3}
        value={value}
        disabled={disabled2}
        onChange={(e2) => onChange(e2.target.value)}
        className="text-xs bg-background dark:bg-background resize-y overflow-y-auto min-h-0 focus-visible:border-brand-accent focus-visible:ring-brand-accent/30"
        style={{
          fieldSizing: "fixed",
        }}
        data-action-ui-id={`tool-confirm-param-${paramKey}`}
      />
    );
  }
  return (
    <Input3
      value={value}
      disabled={disabled2}
      onChange={(e2) => onChange(e2.target.value)}
      className="text-xs h-7 bg-background dark:bg-background focus-visible:border-brand-accent focus-visible:ring-brand-accent/30"
      data-action-ui-id={`tool-confirm-param-${paramKey}`}
    />
  );
}
function AudioBarsIcon({ className }) {
  return <AudioLines aria-hidden="true" className={cn$2("size-4", className)} strokeWidth={2} />;
}
function displayName(src, label, assetName) {
  if (assetName) return assetName;
  const clean = src.split(/[?#]/)[0] ?? src;
  return clean.split(/[\\/]/).filter(Boolean).pop() || label || "audio";
}
export function AudioArtifactChip({
  src,
  originalSrc,
  label,
  dataSlot = "audio-artifact-chip",
  className,
}) {
  const workspaceId2 = useCurrentWorkspace();
  const relativePath = reactExports.useMemo(
    () => toWorkspaceRelativePath$1(originalSrc, src),
    [originalSrc, src],
  );
  const { assets } = useAssets({
    enabled: Boolean(relativePath),
  });
  const asset = reactExports.useMemo(
    () => findAssetForPath(assets, relativePath),
    [assets, relativePath],
  );
  const fileName = displayName(originalSrc ?? src, label, asset?.name);
  const { head: stem, tail: ext } = splitFilename(fileName);
  const dragSource = reactExports.useMemo(
    () => ({
      relativePath,
      workspacePath: workspaceId2,
      name: fileName,
      assetId: asset?.id,
    }),
    [asset?.id, fileName, relativePath, workspaceId2],
  );
  const canDrag = canWriteResourceDragData(dragSource);
  const handleLocate = reactExports.useCallback(() => {
    if (!asset?.id || !workspaceId2) return;
    const nodeIds = getNodeIdsForAsset(asset.id, workspaceId2);
    if (nodeIds.length === 0) return;
    workspaceEvents.fireCanvasFocus(workspaceId2, nodeIds);
  }, [asset?.id, workspaceId2]);
  const handleDragStart = reactExports.useCallback(
    (event) => {
      if (!writeResourceDragData(event, dragSource)) event.preventDefault();
    },
    [dragSource],
  );
  return (
    <button
      type="button"
      data-action-ui-id="chat-artifact-audio"
      data-slot={dataSlot}
      data-artifact-type="audio"
      data-artifact-path={src}
      className={cn$2(
        "my-2 flex h-8 w-full items-center gap-1.5 rounded-md bg-foreground/[0.05] pr-2 pl-0.5 text-left transition-colors hover:bg-foreground/[0.08] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        canDrag && "cursor-grab active:cursor-grabbing",
        className,
      )}
      draggable={canDrag}
      onClick={handleLocate}
      onDragStart={handleDragStart}
      title={fileName}
    >
      <span className="relative flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-[var(--chat-audio-artifact-icon-bg)] text-[var(--chat-audio-artifact-icon-fg)]">
        <AudioBarsIcon />
      </span>
      <span className="flex min-w-0 flex-1 items-baseline text-[14px] font-normal leading-none text-foreground/80">
        <span className="min-w-0 truncate">{stem}</span>
        {ext && <span className="shrink-0">{ext}</span>}
      </span>
    </button>
  );
}
export function resolveArtifactUrl(raw2, resolve) {
  if (/^https?:\/\//i.test(raw2)) return resolve(raw2);
  if (raw2.startsWith("/")) return resolve(raw2);
  return resolve(API_PATHS.serveFile(raw2));
}
function artifactDisplayName(path2, url2) {
  const raw2 = path2 || url2;
  const clean = raw2.split("?")[0]?.split("#")[0] ?? raw2;
  return clean.split("/").filter(Boolean).pop() ?? clean;
}
function artifactRelativePath(artifact) {
  const fromUrl = toWorkspaceRelativePath(artifact.url);
  if (fromUrl) return fromUrl;
  if (/^https?:\/\//i.test(artifact.url)) return void 0;
  return toWorkspaceRelativePath(artifact.path);
}
function artifactVideoThumbnailUrl(artifact, resolvedSrc, displayWidth) {
  if (artifact.type !== "video") return void 0;
  const relativePath = artifactRelativePath(artifact);
  return relativePath ? buildVideoThumbnailUrl(resolvedSrc, relativePath, displayWidth) : void 0;
}
function toWorkspaceRelativePath(raw2) {
  if (!raw2) return void 0;
  const clean = cleanPath(raw2).replace(/\\/g, "/");
  const filesIdx = clean.indexOf("/files/");
  if (filesIdx >= 0) return stripLeadingSlash(clean.slice(filesIdx + "/files/".length));
  const outputIdx = clean.indexOf("output_files/");
  if (outputIdx >= 0) return stripLeadingSlash(clean.slice(outputIdx + "output_files/".length));
  if (/^https?:\/\//i.test(raw2)) return void 0;
  if (clean.startsWith("/")) return void 0;
  return stripLeadingSlash(clean.replace(/^\.\//, "")) || void 0;
}
function cleanPath(raw2) {
  try {
    const url2 = new URL(raw2);
    return safeDecodeURIComponent(url2.pathname);
  } catch {
    return safeDecodeURIComponent(raw2.split(/[?#]/)[0] ?? raw2);
  }
}
function safeDecodeURIComponent(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
function stripLeadingSlash(path2) {
  return path2.replace(/^\/+/, "");
}
function normalizePath(path2) {
  return stripLeadingSlash(path2.replace(/\\/g, "/"));
}
function findAssetForRelativePath(assets, relativePath) {
  if (!relativePath) return void 0;
  const target = normalizePath(relativePath);
  return assets.find((asset) => normalizePath(asset.path) === target);
}
function artifactDragSource({ relativePath, workspacePath, filename, assetId }) {
  return {
    relativePath,
    workspacePath,
    name: filename,
    assetId,
  };
}
function artifactCanvasItem({ relativePath, absolutePath, filename, assetId }) {
  if (!relativePath || !absolutePath || !filename) return void 0;
  return buildResourceDragItem(absolutePath, relativePath, filename, false, assetId);
}
function ArtifactIcon({ filename, compact = false }) {
  const type2 = artifactAssetTypeFromPath(filename);
  const className = compact ? "size-3.5" : "size-4";
  if (type2 === "image") return <ImageOutlineIcon className={className} strokeWidth={1.5} />;
  if (type2 === "video") return <Video className={className} strokeWidth={1.5} />;
  if (type2 === "audio") return <AudioBarsIcon className={className} />;
  return (
    <FileTypeIcon
      {...classifyFileType({
        filename,
      })}
      size={compact ? 14 : 24}
      decorative={true}
    />
  );
}
function ArtifactPreviewFailed({ type: type2, filename, compact }) {
  const { t: t2 } = useTranslation();
  const label = previewUnavailableLabel(type2, t2);
  return (
    <div
      className={cn$2(
        "flex h-full w-full flex-col items-center justify-center gap-1 bg-muted text-muted-foreground",
        compact ? "p-0" : "p-2",
      )}
    >
      <FileTypeIcon
        {...classifyFileType({
          filename,
        })}
        size={compact ? 14 : 24}
        decorative={true}
      />
      {!compact && (
        <span className="max-w-full truncate text-caption-10 leading-none">{label}</span>
      )}
    </div>
  );
}
function previewUnavailableLabel(type2, t2) {
  if (type2 === "image") return t2("assetPreview.imageUnavailable", "Preview unavailable");
  if (type2 === "video") return t2("assetPreview.videoUnavailable", "Preview unavailable");
  if (type2 === "audio") return t2("assetPreview.audioUnavailable", "Preview unavailable");
  return t2("assetPreview.unsupportedText", "Preview not supported");
}
function ArtifactThumbnail({ type: type2, src, filename, onFailure }) {
  const [loaded, setLoaded] = reactExports.useState(false);
  return (
    <span className="relative flex h-full w-full items-center justify-center bg-muted/40">
      {!loaded && (
        <span
          data-action-ui-id="chat-turn-artifact-thumbnail-placeholder"
          className="text-muted-foreground"
        >
          <ArtifactIcon filename={filename} compact={true} />
        </span>
      )}
      <DeferredThumbnailImage
        src={src}
        alt={filename}
        className={cn$2(
          "absolute inset-0 h-full w-full object-cover",
          loaded ? "opacity-100" : "opacity-0",
        )}
        onLoad={() => setLoaded(true)}
        onFailure={onFailure}
      />
      {type2 === "video" && loaded && (
        <span className="absolute inset-0 flex items-center justify-center bg-black/30 text-white pointer-events-none">
          <PlaybackPlayIcon$1 size={12} strokeWidth={2} fill="currentColor" />
        </span>
      )}
    </span>
  );
}
function ArtifactChipBody({ artifact, filename, previewSrc, previewFailed, onPreviewError }) {
  const { head: stem, tail: ext } = splitFilename(filename);
  const showThumbnail =
    (artifact.type === "image" || artifact.type === "video") &&
    Boolean(previewSrc) &&
    !previewFailed;
  return (
    <>
      <span
        className={cn$2(
          "shrink-0 relative h-7 w-7 overflow-hidden rounded-sm flex items-center justify-center",
          artifact.type === "audio" ? "bg-[var(--chat-audio-artifact-icon-bg)]" : "bg-muted/40",
        )}
      >
        {showThumbnail &&
          previewSrc &&
          (artifact.type === "image" || artifact.type === "video") && (
            <ArtifactThumbnail
              key={previewSrc}
              type={artifact.type}
              src={previewSrc}
              filename={filename}
              onFailure={onPreviewError}
            />
          )}
        {!showThumbnail && (
          <span
            className={
              artifact.type === "audio"
                ? "text-[var(--chat-audio-artifact-icon-fg)]"
                : "text-muted-foreground"
            }
          >
            <ArtifactIcon filename={filename} compact={true} />
          </span>
        )}
      </span>
      <span className="min-w-0 flex-1 flex items-baseline text-[14px] leading-none font-normal text-foreground/80">
        <span className="min-w-0 truncate">{stem}</span>
        {ext && <span className="shrink-0">{ext}</span>}
      </span>
    </>
  );
}
export function ArtifactAssetCard({
  artifact,
  assetId,
  src,
  size: size2 = "lg",
  showLabel = true,
}) {
  const { t: t2 } = useTranslation();
  const [lightboxOpen, setLightboxOpen] = reactExports.useState(false);
  const [insertPromptOpen, setInsertPromptOpen] = reactExports.useState(false);
  const [failedPreviewKey, setFailedPreviewKey] = reactExports.useState(null);
  const cardRef = reactExports.useRef(null);
  const locateTimerRef = reactExports.useRef(null);
  const postInsertFocusTimerRef = reactExports.useRef(null);
  const workspacePath = useCurrentWorkspace();
  const relativePath = reactExports.useMemo(() => artifactRelativePath(artifact), [artifact]);
  const { assets } = useAssets({
    enabled: Boolean(relativePath),
  });
  const asset = reactExports.useMemo(
    () => findAssetForRelativePath(assets, relativePath),
    [assets, relativePath],
  );
  const resolvedAssetId = assetId ?? artifact.assetId ?? asset?.id;
  const absolutePath =
    relativePath && workspacePath ? joinFilePath(workspacePath, relativePath) : void 0;
  const { copyFile, copyImage, copyPath, showInFolder, openWithDefault } = useMediaActions();
  const filename = artifactDisplayName(artifact.path, artifact.url);
  const canOpenLightbox = artifact.type === "image" || artifact.type === "video";
  const previewDisplayWidth = size2 === "lg" ? 144 : size2 === "md" ? 64 : size2 === "sm" ? 32 : 28;
  const previewSrc =
    artifact.type === "image"
      ? withThumbnail(src, size2 === "sm" ? 64 : 240)
      : artifactVideoThumbnailUrl(artifact, src, previewDisplayWidth);
  const previewKey = `${artifact.type}:${src}`;
  const previewFailed = failedPreviewKey === previewKey;
  const previewUnavailable = previewFailed || (artifact.type === "video" && previewSrc === void 0);
  const label = `${filename}`;
  const dragSource = reactExports.useMemo(
    () =>
      artifactDragSource({
        relativePath,
        workspacePath,
        filename,
        assetId: resolvedAssetId,
      }),
    [filename, relativePath, resolvedAssetId, workspacePath],
  );
  const canDrag = canWriteResourceDragData(dragSource);
  const canvasItem = reactExports.useMemo(
    () =>
      artifactCanvasItem({
        relativePath,
        absolutePath,
        filename,
        assetId: resolvedAssetId,
      }),
    [absolutePath, filename, relativePath, resolvedAssetId],
  );
  reactExports.useEffect(() => {
    return () => {
      if (locateTimerRef.current != null) window.clearTimeout(locateTimerRef.current);
      if (postInsertFocusTimerRef.current != null) {
        window.clearTimeout(postInsertFocusTimerRef.current);
      }
    };
  }, []);
  const locateOnCanvas = reactExports.useCallback(() => {
    if (!workspacePath) return;
    if (artifact.nodeIds?.length) {
      setInsertPromptOpen(false);
      workspaceEvents.fireCanvasFocus(workspacePath, [...artifact.nodeIds], {
        select: true,
      });
      return;
    }
    if (!resolvedAssetId) {
      if (canvasItem) setInsertPromptOpen(true);
      return;
    }
    const nodeIds = getNodeIdsForAsset(resolvedAssetId, workspacePath);
    if (nodeIds.length === 0) {
      if (canvasItem) setInsertPromptOpen(true);
      return;
    }
    setInsertPromptOpen(false);
    workspaceEvents.fireCanvasFocus(workspacePath, nodeIds, {
      select: true,
    });
  }, [artifact.nodeIds, canvasItem, resolvedAssetId, workspacePath]);
  const handleClick2 = reactExports.useCallback(() => {
    if (locateTimerRef.current != null) window.clearTimeout(locateTimerRef.current);
    locateTimerRef.current = window.setTimeout(() => {
      locateTimerRef.current = null;
      locateOnCanvas();
    }, 180);
  }, [locateOnCanvas]);
  const handleDoubleClick2 = reactExports.useCallback(() => {
    if (locateTimerRef.current != null) {
      window.clearTimeout(locateTimerRef.current);
      locateTimerRef.current = null;
    }
    if (canOpenLightbox) {
      setLightboxOpen(true);
      return;
    }
    if (absolutePath) openWithDefault(absolutePath);
  }, [absolutePath, canOpenLightbox, openWithDefault]);
  const handleCopy = reactExports.useCallback(() => {
    if (artifact.type === "image") {
      copyImage(absolutePath ?? src);
      return;
    }
    if (absolutePath) {
      copyFile(absolutePath);
      return;
    }
    copyPath(src);
  }, [absolutePath, artifact.type, copyFile, copyImage, copyPath, src]);
  const handleDragStart = reactExports.useCallback(
    (event) => {
      if (locateTimerRef.current != null) {
        window.clearTimeout(locateTimerRef.current);
        locateTimerRef.current = null;
      }
      if (!writeResourceDragData(event, dragSource)) event.preventDefault();
    },
    [dragSource],
  );
  const focusAssetAfterInsert = reactExports.useCallback(
    (attempt = 0) => {
      if (!workspacePath) return;
      const nodeIds = artifact.nodeIds?.length
        ? [...artifact.nodeIds]
        : resolvedAssetId
          ? getNodeIdsForAsset(resolvedAssetId, workspacePath)
          : [];
      if (nodeIds.length > 0) {
        workspaceEvents.fireCanvasFocus(workspacePath, nodeIds, {
          select: true,
        });
        return;
      }
      if (attempt >= 12) return;
      postInsertFocusTimerRef.current = window.setTimeout(
        () => focusAssetAfterInsert(attempt + 1),
        120,
      );
    },
    [artifact.nodeIds, resolvedAssetId, workspacePath],
  );
  const handleInsertToCanvas = reactExports.useCallback(() => {
    if (!canvasItem) return;
    workspaceEvents.fireAddToCanvas([canvasItem]);
    setInsertPromptOpen(false);
    if (postInsertFocusTimerRef.current != null) {
      window.clearTimeout(postInsertFocusTimerRef.current);
    }
    focusAssetAfterInsert();
  }, [canvasItem, focusAssetAfterInsert]);
  const isSmall = size2 === "sm";
  const isChip = size2 === "chip";
  const isCompactFailure = previewUnavailable && size2 !== "lg";
  const cardClassName =
    size2 === "lg"
      ? "h-20 w-36 rounded-sm"
      : size2 === "md"
        ? cn$2("h-16 rounded-sm", isCompactFailure ? "w-16" : "min-w-16")
        : size2 === "chip"
          ? "flex h-8 w-full items-center gap-1.5 rounded-md bg-foreground/[0.05] pr-2 pl-0.5 hover:bg-foreground/[0.08]"
          : "h-8 w-8 rounded-sm";
  const actionUiId = artifact.type === "file" ? void 0 : CHAT_ARTIFACT_UI_ID[artifact.type];
  const title = previewUnavailable
    ? `${filename} · ${previewUnavailableLabel(artifact.type, t2)}`
    : filename;
  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger render={<div className="shrink-0" />}>
          <button
            ref={cardRef}
            type="button"
            data-action-ui-id={actionUiId}
            data-artifact-type={artifact.type}
            data-artifact-path={src}
            data-artifact-mime={
              artifact.type === "file" ? void 0 : inferArtifactMime(src, artifact.type)
            }
            aria-label={filename}
            className={cn$2(
              "group relative text-left transition-opacity cursor-pointer",
              isChip ? "overflow-hidden" : "shrink-0 overflow-hidden bg-muted/60 hover:opacity-80",
              cardClassName,
            )}
            draggable={canDrag}
            onClick={handleClick2}
            onDoubleClick={handleDoubleClick2}
            onDragStart={handleDragStart}
            title={title}
          >
            {isChip ? (
              <ArtifactChipBody
                artifact={artifact}
                filename={filename}
                previewSrc={previewSrc}
                previewFailed={previewFailed}
                onPreviewError={() => setFailedPreviewKey(previewKey)}
              />
            ) : (
              <>
                {artifact.type === "image" && previewSrc && !previewFailed && (
                  <ArtifactThumbnail
                    key={previewSrc}
                    type="image"
                    src={previewSrc}
                    filename={filename}
                    onFailure={() => setFailedPreviewKey(previewKey)}
                  />
                )}
                {artifact.type === "video" && previewSrc && !previewFailed && (
                  <ArtifactThumbnail
                    key={previewSrc}
                    type="video"
                    src={previewSrc}
                    filename={filename}
                    onFailure={() => setFailedPreviewKey(previewKey)}
                  />
                )}
                {previewUnavailable && (
                  <ArtifactPreviewFailed
                    type={artifact.type}
                    filename={filename}
                    compact={isSmall || size2 === "md"}
                  />
                )}
                {!previewFailed && (artifact.type === "audio" || artifact.type === "file") && (
                  <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
                    <ArtifactIcon filename={filename} />
                  </div>
                )}
                {showLabel && !isSmall && (
                  <div
                    className={cn$2(
                      "absolute inset-x-0 bottom-0 flex items-center bg-gradient-to-t from-background/95 via-background/70 to-background/0 font-medium text-foreground",
                      size2 === "lg"
                        ? "gap-1.5 px-2 pb-1 pt-2 text-caption-11"
                        : "gap-1 px-1.5 pb-1 pt-2 text-caption-10",
                    )}
                  >
                    <span className="shrink-0 text-muted-foreground">
                      <ArtifactIcon filename={filename} compact={true} />
                    </span>
                    <span className="min-w-0 flex-1 truncate">{label}</span>
                  </div>
                )}
              </>
            )}
          </button>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem
            onClick={handleCopy}
            className="cursor-pointer"
            data-action-ui-id="chat-turn-artifact-copy"
          >
            <Copy />
            {t2("common.copy")}
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => {
              if (absolutePath) showInFolder(absolutePath);
            }}
            disabled={!absolutePath}
            className="cursor-pointer disabled:cursor-default"
            data-action-ui-id="chat-turn-artifact-show-in-folder"
          >
            <LocalFolderIcon />
            <PlatformFileManagerLabel />
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      <PopoverRoot open={insertPromptOpen} onOpenChange={setInsertPromptOpen}>
        {insertPromptOpen && cardRef.current && (
          <PopoverPortal>
            <PopoverPositioner
              anchor={cardRef.current}
              align="center"
              side="right"
              sideOffset={8}
              className="isolate z-50"
            >
              <PopoverPopup
                data-slot="chat-turn-artifact-locate-missing-popover"
                className={cn$2(
                  "elevated-surface-border z-50 flex w-64 origin-(--transform-origin) flex-col gap-2.5 rounded-lg bg-popover p-2.5 text-xs text-popover-foreground shadow-lg outline-hidden",
                  "dp-motion-quick-zoom",
                )}
              >
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-sm text-foreground">
                    {t2("fileExplorer.locateMissing.title")}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {t2("fileExplorer.locateMissing.description")}
                  </span>
                </div>
                <div className="flex justify-end gap-1">
                  <Button$1
                    size="sm"
                    variant="ghost"
                    onClick={() => setInsertPromptOpen(false)}
                    data-action-ui-id="chat-turn-artifact-locate-missing-cancel"
                  >
                    {t2("common.cancel")}
                  </Button$1>
                  <Button$1
                    size="sm"
                    onClick={handleInsertToCanvas}
                    data-action-ui-id="chat-turn-artifact-locate-missing-confirm"
                  >
                    {t2("fileExplorer.locateMissing.confirm")}
                  </Button$1>
                </div>
              </PopoverPopup>
            </PopoverPositioner>
          </PopoverPortal>
        )}
      </PopoverRoot>
      {lightboxOpen && (artifact.type === "image" || artifact.type === "video") && (
        <MediaLightbox
          kind={artifact.type}
          src={src}
          alt={filename}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </>
  );
}
