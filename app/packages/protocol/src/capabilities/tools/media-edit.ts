/** 由 v3 preload 产物还原：../packages/protocol/dist/capabilities/tools/media-edit.js */
import { PROJECT_SUBTITLE_FORMATS, PROJECT_SUBTITLE_STYLE_PRESETS } from "../../project-v3/task-api.js";
import { id, operation, text } from "../../project-v3/task-mappers.js";

const mediaEdit = {
  operation: "edit_media",
  prompt: { use: "none" },
  surfaces: ["agent"],
  execution: { mode: "sync" }
};
const ffmpeg = {
  ...mediaEdit,
  id: "edit_media:ffmpeg",
  displayName: "FFmpeg",
  description: "Transform Resource media with one output-producing ffmpeg command: trim, crop, scale, overlay, replace or mix audio, extract frames or audio, burn subtitles, and transcode. Produces one image, audio or video Resource version. Probe-only commands are outside this capability. To produce a concatenated video, use edit_media:merge_videos; never concatenate video with this capability. OUTPUT: a derivative of the same work (burned subtitles, watermark, background music or audio mux, color grade, trim, resize, format conversion) is output.resources[primary] mode=new_version of the first reference's Resource, baseVersionId its current version, disposition=adopted: the canvas node switches to the new version and the previous one stays recoverable. A different work (extracted audio, a grabbed frame, split clips, a first-time compose of several sources) or an output whose media kind differs from the source is mode=create with a placement that gives a role, so it appears as a new canvas node. Use disposition=candidate only when the user asks to keep the current version unchanged; a candidate is not shown on canvas.",
  references: { min: 1, max: 100 },
  paramSchema: {
    type: "object",
    properties: {
      args: {
        type: "array",
        items: { type: "string" },
        minItems: 1,
        description: 'ffmpeg CLI arguments; the Gateway appends the output path. Option names and values are separate array entries. Every -i value is one "@reference[N]" placeholder, where N indexes the resolved reference list. Placeholders can also appear inside filter expressions; the Gateway substitutes frozen Resource version paths. Write a subtitle filter placeholder bare (for example "subtitles=@reference[1]"), never quoted; the Gateway escapes the path. Timed or multi-line subtitles use a subtitle filter; drawtext represents one static caption. Subtitle filters receive bundled CJK fonts when available. Chinese/Japanese/Korean or pure English drawtext without font or fontfile uses bundled Noto Sans CJK SC or an installed CJK font; if CJK text has neither, rendering is rejected with a font setup error. QUALITY: when a video filter forces re-encoding and args carry no rate control, the Gateway adds -c:v libx264 -crf 18 to preserve source quality; pass -crf / -b:v only when the user asks to compress.'
      },
      outputType: {
        type: "string",
        enum: ["video", "audio", "image"],
        default: "video",
        description: "Media category of the output. Sets the default container (.mp4 / .mp3 / .png). For audio, the container is auto-derived from the `-c:a` encoder in args when present (aac/alac -> .m4a, pcm_* -> .wav, flac -> .flac, opus -> .opus, vorbis -> .ogg, mp3 -> .mp3) -- pass the encoder you want and the extension follows."
      }
    },
    required: ["args"]
  }
};
const mergeVideos = {
  ...mediaEdit,
  id: "edit_media:merge_videos",
  displayName: "Merge videos",
  description: "Join 2-100 video segments end to end in the reference order, scaling them to one resolution. The only way to produce a concatenated video; clip audio is preserved. Produces one video Resource version.",
  references: {
    min: 1,
    max: 100,
    description: "References must resolve to 2-100 video segments. Composition member references expand in their stored Resource order."
  },
  paramSchema: {
    type: "object",
    properties: {
      scaleMode: {
        type: "string",
        enum: ["first", "max", "min", "custom"],
        default: "first",
        description: "first=match the first listed video, max=largest width and height per axis, min=smallest per axis, custom=targetWidth+targetHeight. The API default is first; when source resolutions differ this choice must come from the user or an explicit orchestration instruction, never a silent guess."
      },
      targetWidth: {
        type: "integer",
        exclusiveMinimum: 0,
        description: 'Target width in pixels. Required when scaleMode is "custom".'
      },
      targetHeight: {
        type: "integer",
        exclusiveMinimum: 0,
        description: 'Target height in pixels. Required when scaleMode is "custom".'
      }
    },
    // Every merge knob has a default, so an unqualified merge needs no params.
    default: {}
  }
};
const transcribe = {
  ...mediaEdit,
  // The canvas transcribes a video's subtitles in place.
  surfaces: ["agent", "canvas"],
  id: "edit_media:transcribe",
  displayName: "Transcribe",
  description: "Recognize spoken or sung content and its timing from one audio or video Resource through billable cloud ASR. Returns a plain SRT subtitle or timed lyric text Resource synchronously without a project Task, visual styling, or changes to the source media.",
  references: { min: 1, max: 1, kinds: { audio: 1, video: 1 } },
  paramSchema: {
    type: "object",
    properties: {
      mode: {
        type: "string",
        enum: ["lyrics", "subtitle"],
        description: "subtitle delivers a plain SRT text Resource; lyrics delivers a timed lyric text Resource."
      },
      language: {
        type: "string",
        enum: ["auto", "zh", "en", "other"],
        default: "auto",
        description: "ASR routing: auto/zh/en use MediaKit (auto lets MediaKit detect the language); other uses Whisper."
      }
    },
    required: ["mode"]
  }
};
const positiveInteger = (description: string) => ({ type: "integer", exclusiveMinimum: 0, description });
const margin = (description: string) => ({ type: "integer", minimum: 0, description });
const subtitleFormat = {
  ...mediaEdit,
  id: "edit_media:subtitle_format",
  displayName: "Format subtitles",
  description: "Format one SRT text Resource as styled ASS/SRT/VTT sized for a target video, with line breaks, margins and font size. Produces a text Resource without changing the video.",
  references: { min: 1, max: 1, kinds: { text: 1 } },
  paramSchema: {
    type: "object",
    properties: {
      outputSize: {
        type: "string",
        pattern: "^\\d{2,5}x\\d{2,5}$",
        description: 'Final target video dimensions as "WxH". Required for aspect classification, safe-area margins, and line budgets.'
      },
      format: {
        type: "string",
        enum: PROJECT_SUBTITLE_FORMATS,
        default: "ass",
        description: "Output subtitle format. ASS carries visual styling and is recommended for burn-in; SRT and VTT carry timed text. styleResolved and warnings report the effective layout."
      },
      stylePreset: {
        type: "string",
        enum: PROJECT_SUBTITLE_STYLE_PRESETS,
        default: "social_safe",
        description: "Default preset is social_safe. Use custom only when the user gives explicit style instructions."
      },
      position: {
        type: "string",
        enum: ["bottom", "top", "middle"],
        default: "bottom",
        description: "Subtitle placement. User-explicit top overrides preset placement."
      },
      fontName: {
        type: "string",
        description: "Optional ASS font family. Leave unset to auto-pick a CJK-capable font."
      },
      fontSize: positiveInteger('Explicit ASS font size in pixels. Prefer fontScale for relative user requests like "bigger".'),
      fontScale: {
        type: "number",
        exclusiveMinimum: 0,
        description: 'Relative font size multiplier, e.g. 1.2 for "larger".'
      },
      marginV: margin("Explicit vertical margin in pixels. Clamped by safeArea unless unsafeOverride=true."),
      marginL: margin("Explicit left margin in pixels. Clamped to the 7% safe area unless unsafeOverride=true."),
      marginR: margin("Explicit right margin in pixels. Clamped to the 7% safe area unless unsafeOverride=true."),
      cjkCharsPerLine: positiveInteger("Override CJK chars per line. Default comes from the aspect bucket."),
      englishWordsPerLine: positiveInteger("Override English words per line. Default comes from the aspect bucket."),
      maxLines: {
        type: "number",
        enum: [1, 2],
        default: 2,
        description: "Maximum rendered lines per cue before splitting into the next cue. Default 2 preserves source timing better; set 1 only when the user explicitly wants single-line cues."
      },
      safeArea: {
        type: "string",
        enum: ["auto", "social", "none"],
        default: "social",
        description: "Keep auto/social unless the user explicitly asks to ignore safe areas."
      },
      unsafeOverride: {
        type: "boolean",
        default: false,
        description: "Allow unsafe margins/placement only when the user explicitly asks for it."
      }
    },
    required: ["outputSize"]
  }
};
export const MEDIA_EDITS = [ffmpeg, mergeVideos, transcribe, subtitleFormat];

