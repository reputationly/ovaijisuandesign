// model-chip.jsx
import {
  Bot,
  CompositedSvg,
  jsxRuntimeExports,
  Music,
  reactDomExports,
  reactExports,
  ScrollText,
  useTranslation,
  Video,
} from "../vendor.js";
import { CanvasReleaseRegionContext } from "../canvas/separator.jsx";
import {
  ClockIcon$1,
  formatResolutionRange,
  GeneralImageIcon,
  GptImageDomesticIcon,
  GptImageOverseasIcon,
  HailuoIcon,
  KlingIcon,
  MidjourneyIcon,
  MinimaxIcon,
  NanoBananaIcon,
  SeedreamIcon,
  SpeakerIcon,
  usePortalAnchorPlacement,
  VeoDomesticIcon,
  VeoOverseasIcon,
  WanIcon,
} from "./use-portal-anchor-placement.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { svgBase } from "./expand-arrow-icon.jsx";
import { ImageOutlineIcon, Mic } from "../media-editing/package.jsx";
import { Tooltip$1 } from "./missing-asset-card.jsx";
import {
  hasPromotionToastCopy,
  isPromotionActive,
} from "./param-label-fallbacks.js";

function useCanvasReleaseRegion() {
  return reactExports.useContext(CanvasReleaseRegionContext);
}

const GeminiOverseasIcon = VeoDomesticIcon;

function ClaudeIcon(props) {
  return (
    // biome-ignore lint/a11y/noSvgWithoutTitle: decorative brand glyph
    <svg {...svgBase(props)}>
      <path
        d="M7.67601 9.84131C7.70166 9.8532 7.71225 9.85595 7.72484 9.8833C7.81903 10.0883 7.87187 14.4312 7.76097 14.7661C7.67227 15.0337 7.42901 15.2116 7.18773 15.3325C7.08823 15.2721 7.04266 15.2328 6.95433 15.1577C6.84396 15.0288 6.71658 14.8741 6.66332 14.7114C6.53316 14.3136 7.2997 10.97 7.45433 10.4243C7.51235 10.2197 7.57805 10.0304 7.67601 9.84131ZM8.5559 10.0679C8.91684 10.1937 11.266 12.8849 11.4475 13.3003C11.5423 13.5179 11.4349 13.826 11.3547 14.0356C11.3052 14.1053 11.2545 14.1553 11.1662 14.1714C10.9579 14.2092 10.7134 14.1233 10.5432 14.0063C10.1384 13.7281 8.83705 11.0284 8.60668 10.4458C8.55571 10.3168 8.52048 10.1904 8.49437 10.0542C8.51551 10.0567 8.53569 10.0608 8.5559 10.0679ZM7.04125 9.94189C7.0376 10.0455 6.48203 10.8582 6.38988 10.9946C6.02904 11.526 5.66161 12.053 5.28832 12.5757C5.07256 12.879 4.85963 13.1868 4.62426 13.4751C4.46492 13.6702 4.22059 13.8088 3.96898 13.7114C3.83904 13.493 3.85326 13.257 4.00902 13.0513C4.27125 12.7291 4.56184 12.3993 4.85277 12.1021C5.54442 11.3955 6.24687 10.5256 7.01781 9.91357L7.04125 9.94189ZM10.3323 10.7788C10.5935 10.8374 11.6742 11.6876 11.8967 11.9272C12.0272 12.0679 12.1508 12.1814 12.1487 12.3843C12.1382 12.3843 12.1041 12.3824 12.094 12.3833C11.7549 12.4137 10.3329 10.9607 10.3323 10.7788ZM9.30199 9.39307C9.88649 9.33603 14.6255 10.8486 15.4172 11.1675C15.6724 11.2706 15.7793 11.6985 15.8635 11.9595L15.6555 12.0933C15.4939 12.1716 15.1419 12.3382 14.9836 12.3013C14.6074 12.2124 13.9546 11.8611 13.6213 11.7144C12.9096 11.401 9.5941 9.79525 9.30199 9.39307ZM6.82738 9.2417L6.85082 9.27686C6.72461 9.78243 4.11447 10.8983 3.54222 11.0894C3.34757 11.1543 3.15958 11.1624 2.96019 11.1187C2.44715 10.8711 2.76334 10.4455 3.13207 10.2905C3.8842 9.97437 4.70447 9.7525 5.48558 9.51807C5.84022 9.41164 6.3052 9.28248 6.67113 9.24072C6.74068 9.23174 6.75598 9.22922 6.82738 9.2417ZM14.0412 7.46924C14.3611 7.49879 14.5591 7.66559 14.7112 7.93213C14.6272 8.16963 14.4378 8.46556 14.1672 8.50928C13.6835 8.58746 13.1721 8.61662 12.6819 8.65283C11.7059 8.72496 10.7123 8.8577 9.73461 8.87744C9.59269 8.88237 9.17348 8.91132 9.07152 8.82471L9.07347 8.78174C9.46652 8.30934 13.2765 7.55711 14.0412 7.46924ZM0.562732 7.92627C0.846557 7.90241 2.12295 8.03742 2.48168 8.0708L4.54418 8.27002C5.02045 8.31713 5.61636 8.36655 6.07933 8.46631C5.85314 8.51577 5.58682 8.53369 5.3557 8.54053C4.47131 8.60246 3.48819 8.58533 2.59496 8.6333C2.23378 8.63227 1.96354 8.66101 1.59105 8.65381C1.29597 8.64811 0.0377439 8.84368 0.14281 8.26318C0.169738 8.11466 0.423198 7.98742 0.562732 7.92627ZM12.1086 1.87744C12.3319 1.8472 12.6107 1.86394 12.6926 2.10986C12.8935 2.71319 12.6328 3.057 12.3137 3.49756C11.1556 5.0965 9.91839 6.62222 8.68968 8.16357C8.56512 8.31592 8.46917 8.41555 8.32933 8.55518C8.33508 8.24842 8.394 7.98891 8.49242 7.6958C9.11589 5.84046 10.3011 4.23236 11.4036 2.63818C11.6045 2.3476 11.7875 2.04238 12.1086 1.87744ZM2.28343 4.79639C2.60453 4.78348 3.32714 5.33694 3.62816 5.54248C4.35224 6.03716 5.06684 6.54684 5.77074 7.06982C6.18066 7.37199 7.15611 8.06174 7.48851 8.39893C7.27062 8.3574 7.08803 8.29582 6.87914 8.22314C6.65382 8.13839 6.4298 8.05028 6.20726 7.9585C5.18814 7.53316 4.17483 7.09325 3.1682 6.63916C2.82548 6.48461 2.24162 6.24618 1.94359 6.03369C1.77969 5.91642 1.57635 5.38058 1.48949 5.17334C1.69667 4.98375 2.0082 4.8466 2.28343 4.79639ZM4.69457 0.375488C4.94564 0.441406 5.29946 0.549556 5.40453 0.805176C5.54082 1.13679 5.65831 1.47579 5.78051 1.81299L6.4348 3.62744L7.17797 5.75635C7.26594 6.01289 7.7068 7.19067 7.58812 7.37061C7.50155 7.37167 7.5033 7.35591 7.41625 7.30908C7.10556 7.08662 6.69043 6.61195 6.50609 6.27686C5.74554 4.89383 5.20353 3.39028 4.62523 1.92529C4.36412 1.26379 4.15389 0.993956 4.69457 0.375488ZM12.6096 5.78857C12.7168 5.78684 12.7705 5.79132 12.843 5.87354C12.9262 6.24571 11.173 7.1012 10.843 7.2417L10.6047 7.32178C10.9719 6.91388 12.1192 5.99057 12.6096 5.78857ZM8.89672 1.18994C9.32661 1.15858 9.48715 1.61009 9.37816 1.97803C9.00846 3.22624 8.67846 4.49075 8.28636 5.73193C8.22925 5.89497 8.15827 6.06005 8.09203 6.22021C8.02074 5.73114 8.36462 1.96751 8.52953 1.52588C8.59254 1.35718 8.74041 1.26229 8.89672 1.18994ZM13.7698 4.9458C14.3098 4.96895 14.0624 5.49481 13.6301 5.63721C13.5059 5.63838 13.4007 5.61421 13.3303 5.50537C13.2593 5.23513 13.5558 5.0359 13.7698 4.9458Z"
        fill="currentColor"
      />
    </svg>
  );
}

function GeminiIcon(props) {
  return (
    // biome-ignore lint/a11y/noSvgWithoutTitle: decorative brand glyph
    <svg {...svgBase(props)}>
      <path
        d="M7.99323 0C8.00647 0.020706 8.22577 1.51991 8.26119 1.71591C8.50018 3.03788 9.09122 5.26033 10.2103 6.04392C11.5534 6.98448 14.4919 6.5495 16 6.25166C15.7747 6.35475 15.5509 6.46147 15.3289 6.5718C14.056 7.20711 11.8278 8.53067 11.3405 9.96334C10.7947 11.568 12.21 14.5478 12.8941 15.9879C12.7443 15.8108 12.5906 15.6373 12.4332 15.4675C11.4036 14.3667 9.5393 12.5687 7.98695 12.5404C6.35823 12.5519 4.11138 14.8031 3.10049 16C3.185 15.8277 3.26772 15.6544 3.34861 15.4802C3.96052 14.1498 5.18971 11.3837 4.6592 9.95728C4.02672 8.25675 1.48503 6.96926 0 6.24422C0.301627 6.31336 0.606092 6.36841 0.912506 6.40926C2.29251 6.60541 4.76349 6.90277 5.8926 5.96886C7.3168 4.79087 7.76725 1.74919 7.99323 0Z"
        fill="currentColor"
      />
    </svg>
  );
}

function ClaudeOverseasIcon(props) {
  return (
    // biome-ignore lint/a11y/noSvgWithoutTitle: decorative brand glyph
    <svg {...svgBase(props)}>
      <path
        d="M3.13915 10.6368L6.28631 8.872L6.33915 8.7184L6.28631 8.6336H6.1326L5.6058 8.6016L3.80766 8.5528L2.24809 8.4872L0.737353 8.4072L0.356267 8.3256L0 7.856L0.036027 7.6216L0.356267 7.4072L0.814211 7.4472L1.82697 7.516L3.34571 7.6216L4.44734 7.6856L6.07976 7.856H6.33915L6.37518 7.7512L6.28712 7.6864L6.21746 7.6216L4.64588 6.5576L2.94461 5.432L2.05354 4.784L1.57158 4.456L1.3282 4.1488L1.22332 3.4768L1.66045 2.9952L2.24809 3.0352L2.3978 3.076L2.99345 3.5336L4.2648 4.5176L5.92604 5.7392L6.16863 5.9416L6.2663 5.8728L6.27831 5.8248L6.16863 5.6424L5.26555 4.0104L4.30163 2.3512L3.8725 1.6632L3.75882 1.2504C3.71583 1.09201 3.69271 0.928891 3.68997 0.7648L4.18794 0.0888L4.46335 0L5.12785 0.0888L5.40806 0.332L5.82036 1.2752L6.48887 2.76L7.52564 4.78L7.82987 5.3792L7.99159 5.9336L8.05244 6.104H8.15732V6.0064L8.24298 4.8688L8.4007 3.4728L8.55442 1.6752L8.60725 1.1696L8.85864 0.5624L9.35662 0.2344L9.74571 0.4208L10.0659 0.8784L10.0211 1.1744L9.83057 2.408L9.45829 4.3432L9.21491 5.6384H9.35662L9.51914 5.476L10.1756 4.6064L11.2765 3.2304L11.7632 2.6832L12.33 2.08L12.6943 1.7928H13.3828L13.8896 2.5456L13.6622 3.3232L12.9537 4.2216L12.3661 4.9824L11.5238 6.116L10.997 7.0224L11.0451 7.0952L11.1716 7.0832L13.0754 6.6784L14.1042 6.492L15.3315 6.2816L15.8863 6.5408L15.9472 6.804L15.7286 7.3424L14.4156 7.6664L12.8769 7.9736L10.5839 8.516L10.5559 8.536L10.5879 8.576L11.6207 8.6736L12.0626 8.6976H13.1435L15.157 8.848L15.6838 9.196L16 9.6208L15.9472 9.9448L15.137 10.3576L14.0433 10.0984L11.491 9.4912L10.6168 9.2728H10.4951V9.3456L11.2236 10.0576L12.5606 11.264L14.2339 12.8184L14.3187 13.2024L14.1042 13.5064L13.8768 13.4744L12.4069 12.3696L11.8401 11.8712L10.5559 10.7912H10.4703V10.904L10.7665 11.3368L12.33 13.6848L12.4109 14.4048L12.2972 14.64L11.8921 14.7816L11.447 14.7008L10.5311 13.4176L9.58719 11.9728L8.82662 10.6768L8.73295 10.7296L8.28301 15.5672L8.07245 15.8136L7.58649 16L7.18139 15.692L6.96682 15.1944L7.18139 14.2104L7.44078 12.928L7.65134 11.908L7.84188 10.6408L7.95557 10.22L7.94756 10.192L7.85389 10.204L6.89797 11.5152L5.44408 13.4784L4.29362 14.7088L4.01821 14.8184L3.54026 14.5704L3.58429 14.1304L3.85169 13.7376L5.44408 11.7136L6.404 10.4584L7.02367 9.7344L7.01966 9.6288H6.98284L2.75407 12.3728L2.0015 12.4704L1.67646 12.1664L1.71729 11.6688L1.871 11.5072L3.14316 10.6328L3.13915 10.6368Z"
        fill="currentColor"
      />
    </svg>
  );
}

const MIDJOURNEY_RESOLUTION_FALLBACK = {
  "midjourney-8.2": "2K",
};

function lastNonAutoOption(options) {
  const explicit = options.filter(
    (option2) => option2.toLowerCase() !== "auto",
  );
  return explicit.at(-1) ?? options.at(-1);
}

function clarityModeToResolution(mode2) {
  switch (mode2) {
    case "4k":
      return "4K";
    case "pro":
      return "1080P";
    case "std":
      return "720P";
    default:
      return void 0;
  }
}

function resolveCanvasImageResolution(modelId, resolutionOptions) {
  return (
    formatResolutionRange(resolutionOptions) ??
    MIDJOURNEY_RESOLUTION_FALLBACK[modelId]
  );
}

function resolveCanvasVideoResolution(resolutionOptions, modeOptions) {
  return (
    formatResolutionRange(resolutionOptions) ??
    clarityModeToResolution(lastNonAutoOption(modeOptions))
  );
}

const PANEL_MIN_HEIGHT$2 = 120;

const PANEL_MAX_HEIGHT$2 = 320;

const PANEL_MIN_WIDTH = 280;

const PANEL_MAX_WIDTH = 360;

const TEXT_MODEL_ICONS = {
  minimax: {
    domestic: MinimaxIcon,
  },
  alpha: {
    domestic: ClaudeIcon,
    overseas: ClaudeOverseasIcon,
  },
  gamma: {
    domestic: GptImageDomesticIcon,
    overseas: GptImageOverseasIcon,
  },
  omega: {
    domestic: GeminiIcon,
    overseas: GeminiOverseasIcon,
  },
};

function pickTextModelIcon(model) {
  const id2 = (model.id ?? "").toLowerCase();
  for (const [token2, icons] of Object.entries(TEXT_MODEL_ICONS)) {
    if (!id2.includes(token2)) continue;
    return model.region === "overseas" && icons.overseas
      ? icons.overseas
      : icons.domestic;
  }
  return void 0;
}

function isMiniMaxH3Model$1(model) {
  const values3 = [model.id, model.name, model.model_name, model.backend].map(
    (value) => (typeof value === "string" ? value.toLowerCase() : ""),
  );
  return values3.some(
    (value) =>
      value.includes("minimax-h3") ||
      value.includes("minimax h3") ||
      value.includes("hailuo03") ||
      value === "minimax_v3",
  );
}

function isMiniMaxH3MaxModel$1(model) {
  const values3 = [model.id, model.name, model.model_name].map((value) =>
    typeof value === "string" ? value.toLowerCase() : "",
  );
  return values3.some(
    (value) =>
      value.includes("minimax-h3-max") || value.includes("minimax h3 max"),
  );
}

function pickModelIcon(model, mediaType, region = "overseas") {
  const id2 = (model.id ?? "").toLowerCase();
  const backend = (model.backend ?? "").toLowerCase();
  if (id2.startsWith("g-image") || id2.startsWith("gpt-image")) {
    if (region === "domestic") return GeneralImageIcon;
    return id2.startsWith("g-image")
      ? GptImageDomesticIcon
      : GptImageOverseasIcon;
  }
  if (id2.startsWith("beta")) return VeoDomesticIcon;
  if (id2.startsWith("veo")) return VeoOverseasIcon;
  if (
    id2.startsWith("banana") ||
    id2.startsWith("nano_banana") ||
    backend === "nano_banana"
  )
    return region === "domestic" ? GeneralImageIcon : NanoBananaIcon;
  if (backend === "midjourney") return MidjourneyIcon;
  if (backend === "seedream" || id2.startsWith("doubao-seedream"))
    return SeedreamIcon;
  if (
    backend === "seedance" ||
    backend === "seedaudio" ||
    id2.includes("seedance")
  )
    return VeoDomesticIcon;
  if (
    backend === "kling" ||
    backend === "kling_avatar" ||
    id2.startsWith("kling")
  )
    return KlingIcon;
  if (
    backend === "minimax_v3" ||
    id2.startsWith("minimax-h3") ||
    id2.startsWith("minimax h3") ||
    id2.includes("hailuo03")
  )
    return MinimaxIcon;
  if (id2.startsWith("hilo") || id2.startsWith("hailuo")) return HailuoIcon;
  if (backend === "wan_i2v" || id2.startsWith("wan")) return WanIcon;
  if (
    backend === "minimax_tts" ||
    backend === "minimax_music" ||
    backend === "minimax_music_cover" ||
    id2.startsWith("speech") ||
    id2.startsWith("music")
  )
    return MinimaxIcon;
  if (mediaType === "text-llm") {
    const textIcon = pickTextModelIcon(model);
    if (textIcon) return textIcon;
  }
  if (backend === "openai") return Bot;
  if (mediaType === "image") return ImageOutlineIcon;
  if (mediaType === "video") return Video;
  if (mediaType === "audio-tts") return Mic;
  if (mediaType === "audio-music") return Music;
  if (mediaType === "text-llm") return ScrollText;
  return ImageOutlineIcon;
}

function inferMediaType(model) {
  if (!model) return "unknown";
  if (model.subtitle) return "text-llm";
  const params = model.params ?? {};
  if ("is_instrumental" in params || "lyrics" in params) return "audio-music";
  if (
    model.backend === "seedaudio" ||
    model.id.toLowerCase().includes("seed-audio")
  )
    return "audio-tts";
  if ("voice_id" in params || "emotion" in params) return "audio-tts";
  if (
    "duration" in params ||
    "generate_audio" in params ||
    (model.max_video_refs ?? 0) > 0
  )
    return "video";
  if ("aspect_ratio" in params || "resolution" in params) return "image";
  return "unknown";
}

function formatDurationRange$1(opts) {
  if (!opts || opts.length === 0) return void 0;
  if (opts.length === 1) return `${opts[0]}s`;
  const nums = opts
    .map((o2) => Number.parseFloat(o2))
    .filter((n2) => Number.isFinite(n2));
  if (nums.length === 0) return void 0;
  const min2 = Math.min(...nums);
  const max2 = Math.max(...nums);
  return min2 === max2 ? `${min2}s` : `${min2}-${max2}s`;
}

function CheckIcon$4({ size: size2 = 16, className }) {
  return (
    <CompositedSvg
      width={size2}
      height={size2}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="presentation"
      aria-hidden={true}
    >
      <path
        d="M13.3333 4L5.99996 11.3333L2.66663 8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </CompositedSvg>
  );
}

function resolveVideoModelAudioCapability(model) {
  const params = model.params ?? {};
  if (
    "generate_audio" in params ||
    "sound" in params ||
    isMiniMaxH3Model$1(model)
  ) {
    return "with-audio";
  }
  return (model.max_audio_refs ?? 0) > 0 ? "audio-driven" : void 0;
}

function buildSubtitleData(model, mediaType, t2) {
  const params = model.params ?? {};
  const out = {};
  if (mediaType === "image") {
    out.resolution = resolveCanvasImageResolution(
      model.id,
      params.resolution?.options ?? [],
    );
  } else if (mediaType === "video") {
    out.resolution = resolveCanvasVideoResolution(
      params.resolution?.options ?? [],
      params.mode?.options ?? [],
    );
    out.duration = formatDurationRange$1(params.duration?.options);
    out.audio = resolveVideoModelAudioCapability(model);
    if (model.audioExtension) {
      out.capability = t2("canvas.modelSubtitle.audioExtension", {
        defaultValue: "Audio Extension",
      });
    }
  } else if (mediaType === "audio-tts" || mediaType === "audio-music") {
    out.audio = "with-audio";
    if (
      mediaType === "audio-tts" &&
      model.id.toLowerCase().includes("speech-2.8")
    ) {
      out.capability = t2("canvas.modelSubtitle.textToSpeech", {
        defaultValue: "Text to Speech",
      });
    } else if (mediaType === "audio-tts" && model.backend === "seedaudio") {
      out.capability = t2("canvas.modelSubtitle.fullAudioScene", {
        defaultValue: "Full Audio Scene",
      });
    }
  } else if (mediaType === "text-llm" && model.subtitle) {
    out.capability = t2(`canvas.modelSubtitle.${model.subtitle.label}`, {
      defaultValue: model.subtitle.label,
    });
    out.latency = model.subtitle.latency;
  }
  return out;
}

function hasAnySubtitle(d2) {
  return Boolean(
    d2.resolution || d2.duration || d2.audio || d2.capability || d2.latency,
  );
}

export function ModelChip({
  models,
  selectedModelId,
  onChange,
  loading,
  disabled: disabled2,
  showEmptyHint,
  disabledModelIds,
  disabledReason,
  onPromotionClick,
}) {
  const releaseRegion = useCanvasReleaseRegion();
  const { t: t2 } = useTranslation();
  const [open, setOpen] = reactExports.useState(false);
  const triggerRef = reactExports.useRef(null);
  const panelRef = reactExports.useRef(null);
  const selected2 = models.find((m3) => m3.id === selectedModelId);
  const triggerLabel = loading
    ? t2("canvas.loadingModels")
    : (selected2?.name ??
      (showEmptyHint ? t2("canvas.noModels") : t2("canvas.model")));
  const mediaType = reactExports.useMemo(
    () => inferMediaType(models[0]),
    [models],
  );
  const displayModels = reactExports.useMemo(() => {
    if (mediaType !== "video") return models;
    const h3Index = models.findIndex((model) => isMiniMaxH3Model$1(model));
    if (h3Index <= 0) return models;
    return [
      models[h3Index],
      ...models.slice(0, h3Index),
      ...models.slice(h3Index + 1),
    ];
  }, [models, mediaType]);
  const TriggerIcon = reactExports.useMemo(() => {
    if (loading) return null;
    if (selected2) return pickModelIcon(selected2, mediaType, releaseRegion);
    if (mediaType === "image") return ImageOutlineIcon;
    if (mediaType === "video") return Video;
    if (mediaType === "audio-tts") return Mic;
    if (mediaType === "audio-music") return Music;
    if (mediaType === "text-llm") return ScrollText;
    return null;
  }, [loading, selected2, mediaType, releaseRegion]);
  reactExports.useEffect(() => {
    if (!open) return;
    const handle2 = (e2) => {
      const target = e2.target;
      if (!target) return;
      if (triggerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handle2, true);
    return () => document.removeEventListener("mousedown", handle2, true);
  }, [open]);
  const placement = usePortalAnchorPlacement(triggerRef, {
    open,
    minHeight: PANEL_MIN_HEIGHT$2,
    maxHeight: PANEL_MAX_HEIGHT$2,
  });
  const handleSelect = reactExports.useCallback(
    (modelId) => {
      onChange(modelId);
      const picked = models.find((m3) => m3.id === modelId);
      if (
        picked &&
        isPromotionActive(picked.promotion) &&
        hasPromotionToastCopy(picked.promotion)
      ) {
        onPromotionClick?.(picked);
      }
      setOpen(false);
    },
    [onChange, models, onPromotionClick],
  );
  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={(e2) => {
          e2.stopPropagation();
          if (!disabled2) setOpen((v2) => !v2);
        }}
        disabled={disabled2}
        title={t2("canvas.model")}
        data-action-ui-id="popover.model-chip"
        className="h-8 px-2 text-[13px] font-normal tracking-[-0.52px] leading-[20px] opacity-70 text-foreground hover:enabled:opacity-100 disabled:cursor-default disabled:opacity-40 truncate min-w-0 max-w-[220px] flex items-center gap-1.5 canvas-prompt-control"
      >
        {TriggerIcon && (
          <TriggerIcon
            size={14}
            strokeWidth={1.5}
            className="shrink-0 opacity-80"
          />
        )}
        <span className="truncate">{triggerLabel}</span>
      </button>
      {open &&
        placement &&
        reactDomExports.createPortal(
          // biome-ignore lint/a11y/noStaticElementInteractions: panel only stops bubbling
          // biome-ignore lint/a11y/useKeyWithClickEvents: same reason
          <div
            ref={panelRef}
            data-side={placement.side}
            className="canvas-portal-popover-in nowheel fixed z-[10001] overflow-y-auto scrollbar-none rounded-[16px] border p-1 shadow-lg"
            style={{
              left: placement.left,
              top: placement.top,
              bottom: placement.bottom,
              minWidth: PANEL_MIN_WIDTH,
              maxWidth: PANEL_MAX_WIDTH,
              maxHeight: placement.maxHeight,
              background: "var(--canvas-controls-bg)",
              borderColor: "var(--canvas-controls-border)",
            }}
            onClick={(e2) => e2.stopPropagation()}
          >
            <div className="px-2 pt-1.5 pb-1 text-[11px] font-medium text-muted-foreground select-none">
              {t2("canvas.model")}
            </div>
            {loading && (
              <div className="px-2 py-1.5 text-sm text-muted-foreground select-none">
                {t2("canvas.loadingModels")}
              </div>
            )}
            {!loading && models.length === 0 && showEmptyHint && (
              <div className="px-2 py-1.5 text-sm text-muted-foreground text-center select-none">
                {t2("canvas.noModels")}
              </div>
            )}
            {!loading &&
              displayModels.map((m3) => {
                const active2 = m3.id === selectedModelId;
                const bareId = m3.id.includes("/")
                  ? m3.id.slice(m3.id.indexOf("/") + 1)
                  : m3.id;
                const isRowDisabled =
                  (disabledModelIds?.has(m3.id) ||
                    disabledModelIds?.has(bareId)) ??
                  false;
                const sub = buildSubtitleData(m3, inferMediaType(m3), t2);
                const hasSubtitle = hasAnySubtitle(sub);
                const RowIcon = pickModelIcon(m3, mediaType, releaseRegion);
                const isNewModel = m3.name === "MiniMax-H3 Audio";
                const promotionTagLabel = m3.promotion?.toastTitle?.trim();
                const modelHoverDescription = isMiniMaxH3MaxModel$1(m3)
                  ? m3.id.toLowerCase().includes("h3-max-turbo")
                    ? t2("canvas.minimaxH3MaxTurbo.hoverDescription", {
                        defaultValue:
                          "H3 Max Turbo supports text-to-video and image-to-video, but not omnireference.",
                      })
                    : t2("canvas.minimaxH3Max.hoverDescription", {
                        defaultValue:
                          "H3 Max is a video generation model post-trained by fal.ai on MiniMax H3 and optimized for high-speed generation. It supports omnireference, text-to-video, and image-to-video.",
                      })
                  : void 0;
                const row = (
                  <button
                    key={m3.id}
                    type="button"
                    onClick={(e2) => {
                      e2.stopPropagation();
                      if (!isRowDisabled) handleSelect(m3.id);
                    }}
                    data-action-ui-id="popover.model-option"
                    data-model-id={m3.id}
                    className={`mt-0.5 flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors duration-150 first:mt-0 ${isRowDisabled ? "opacity-40 cursor-not-allowed" : "text-foreground hover:bg-foreground/[0.04]"}`}
                  >
                    <span
                      data-model-icon-tile={true}
                      className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-[var(--canvas-model-selector-icon-border)] bg-transparent [border-width:var(--divider-width)]"
                    >
                      <span className="flex items-center justify-center text-[var(--canvas-controls-text-muted-solid)] opacity-[var(--canvas-controls-text-muted-opacity)]">
                        <RowIcon size={20} strokeWidth={1.5} />
                      </span>
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
                      <span className="flex items-center gap-1 min-w-0">
                        <span className="truncate text-[13px] font-normal leading-5">
                          {m3.name}
                        </span>
                        {isNewModel && (
                          <span
                            data-action-ui-id="popover.model-new-tag"
                            className="shrink-0 rounded-md bg-foreground px-1.5 py-0.5 text-[11px] font-medium leading-none text-background"
                          >
                            {t2("canvas.modelNew", {
                              defaultValue: "New",
                            })}
                          </span>
                        )}
                        {isPromotionActive(m3.promotion) &&
                          promotionTagLabel && (
                            <span
                              title={promotionTagLabel}
                              data-action-ui-id="popover.model-promotion-tag"
                              className="shrink-0 max-w-[140px] truncate rounded-md bg-brand-accent px-1.5 py-0.5 text-[11px] font-medium leading-none text-brand-accent-foreground"
                            >
                              {promotionTagLabel}
                            </span>
                          )}
                      </span>
                      {(isRowDisabled && disabledReason) || hasSubtitle ? (
                        <span className="flex items-center gap-1.5 truncate text-[12px] leading-4 text-foreground opacity-50">
                          {isRowDisabled && disabledReason ? (
                            <span>{disabledReason}</span>
                          ) : (
                            <>
                              {sub.resolution && <span>{sub.resolution}</span>}
                              {sub.resolution && sub.duration && (
                                <span
                                  aria-hidden={true}
                                  className="w-px h-2.5 bg-foreground/15"
                                />
                              )}
                              {sub.duration && (
                                <span className="flex items-center gap-0.5">
                                  <ClockIcon$1 />
                                  <span>{sub.duration}</span>
                                </span>
                              )}
                              {(sub.resolution || sub.duration) &&
                                sub.audio && (
                                  <span
                                    aria-hidden={true}
                                    className="w-px h-2.5 bg-foreground/15"
                                  />
                                )}
                              {sub.audio && (
                                <span className="flex items-center">
                                  <SpeakerIcon />
                                </span>
                              )}
                              {sub.capability && <span>{sub.capability}</span>}
                              {sub.capability && sub.latency && (
                                <span
                                  aria-hidden={true}
                                  className="w-px h-2.5 bg-foreground/15"
                                />
                              )}
                              {sub.latency && (
                                <span className="flex items-center gap-0.5">
                                  <ClockIcon$1 />
                                  <span>{sub.latency}</span>
                                </span>
                              )}
                            </>
                          )}
                        </span>
                      ) : null}
                    </span>
                    {active2 && (
                      <span className="shrink-0 ml-auto self-center size-4 flex items-center justify-center text-foreground">
                        <CheckIcon$4 size={16} />
                      </span>
                    )}
                  </button>
                );
                const hoverDescription =
                  isRowDisabled && disabledReason
                    ? disabledReason
                    : modelHoverDescription;
                if (hoverDescription) {
                  return (
                    <Tooltip$1
                      key={`tip-${m3.id}`}
                      content={hoverDescription}
                      side="right"
                      className="max-w-[320px] whitespace-normal leading-5"
                    >
                      {row}
                    </Tooltip$1>
                  );
                }
                return row;
              })}
          </div>,
          document.body,
        )}
    </div>
  );
}
