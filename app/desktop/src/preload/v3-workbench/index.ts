/**
 * v3 原生工作台在**自身视图**里的 preload（第 296 轮，整份镜像自参照 out/preload/v3-workbench.cjs）。
 *
 * 之前这里是错的：我把「父窗口侧的端口桥」放进了这个文件，
 * 而它真正的职责是**在 v3 视图里**接住 bootstrap 消息、建立 MessagePort、回握手。
 * 缺了它 → serveResourceFrame 永远等不到对端 → onReady 不触发 → phase 永远不是 ready
 * → host 的 layout 传 visible=false → 视图 0×0。
 *
 * 只依赖 electron 的 ipcRenderer，无其它 import。
 */
// @ts-nocheck —— 整份镜像的参照代码，保留原形态，不做类型改写
import { contextBridge as import_electron_contextBridge, ipcRenderer as import_electron_ipcRenderer } from "electron";
const import_electron = { ipcRenderer: import_electron_ipcRenderer, contextBridge: import_electron_contextBridge };

// ../packages/protocol/dist/backend-ids.js
var BACKEND_NANO_BANANA = "nano_banana";
var BACKEND_KLING = "kling";
var BACKEND_OPENAI = "openai";
var BACKEND_MIDJOURNEY = "midjourney";
var BACKEND_SEEDREAM = "seedream";
var BACKEND_VIBE_MULTI_SHOT = "vibe_multi_shot";
var BACKEND_VIBE_STORYBOARD = "vibe_storyboard";
var BACKEND_VIBE_RELIGHT = "vibe_relight";
var BACKEND_MINIMAX_V3 = "minimax_v3";
var BACKEND_VEO3 = "veo3";
var BACKEND_WAN_I2V = "wan_i2v";
var BACKEND_MINIMAX_TTS = "minimax_tts";
var BACKEND_SEEDAUDIO = "seedaudio";
var BACKEND_MINIMAX_MUSIC = "minimax_music";
var BACKEND_ELEVENLABS_MUSIC = "elevenlabs_music";
var BACKEND_SEEDANCE = "seedance";
var BACKEND_KLING_AVATAR = "kling_avatar";

// ../packages/protocol/dist/capabilities/request.js
var CapabilityInputError = class extends Error {
  name = "CapabilityInputError";
};
function reject(message) {
  throw new CapabilityInputError(message);
}
function wire(params) {
  return Object.fromEntries(Object.entries(params).filter(([, value]) => value !== void 0 && value !== null && value !== "").map(([key, value]) => [
    key,
    typeof value === "object" ? JSON.stringify(value) : String(value)
  ]));
}
var jsonList = (values) => values.length ? JSON.stringify(values) : void 0;
function intInRange(scope, key, value, min, max) {
  if (value === void 0)
    return;
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max || String(value).trim() === "")
    reject(`${scope} unsupported ${key}=${String(value)}. Supported values: ${min}..${max}.`);
}

// ../packages/protocol/dist/capabilities/models/vendor.js
var booleanParam = (description) => ({
  type: "boolean",
  ...description ? { description } : {}
});
var enumParam = (values, description) => ({
  type: "string",
  enum: values,
  ...description ? { description } : {}
});
var durationParam = (min, max) => ({
  type: "integer",
  minimum: min,
  maximum: max,
  description: `${min === max ? `Fixed at ${min} seconds.` : `Output duration in seconds, ${min}..${max}.`} A requested value is rounded up to whole seconds and capped at ${max}; below ${min} is rejected.${min === max ? "" : " Modes that inherit their length from a reference reject it."}`
});
var upperCased = (...values) => Object.fromEntries(values.map((value) => [value, value.toUpperCase()]));
var TRUE_FALSE = { true: "true", false: "false" };

// ../packages/protocol/dist/capabilities/models/vendors/shared.js
var IMAGE_ASPECT_RATIO = (values) => enumParam(values, "Output aspect ratio. Omit it to inherit the nearest supported ratio of the first image reference; required without image references (the default only presets UI forms). Pass it only for an explicit user, platform or project framing.");
var IMAGE_RESOLUTION = (values) => enumParam(values, "Output size tier. Omit it to use the default; a tier above the default increases cost and requires the user's requested tier or acceptance of a cost proposal.");
var VIDEO_ASPECT_RATIO = (values) => enumParam(values, "Output frame ratio.");
var VIDEO_RESOLUTION = (values) => enumParam(values, "Output size tier. Omit it to use the default; a tier above the default increases cost and requires the user's requested tier or acceptance of a cost proposal.");
var VIDEO_AUDIO = { ...booleanParam("Audio switch."), default: true };

// ../packages/protocol/dist/capabilities/models/vendors/banana.js
var banana = {
  vendor: "banana",
  modality: "image",
  backend: BACKEND_NANO_BANANA,
  knowledgeCard: "vendors/banana.md",
  models: {
    nano_banana_2_flash: {
      description: "Use only when explicitly requested by the user. For fast general-purpose exploration, subject consistency across edits and scenes, multi-reference composition, and pose or expression sets. Useful for real-world places and products; less suited to dense in-image text and precise local edits."
    },
    nano_banana_2: {
      description: "Use only when explicitly requested by the user. For higher-quality final images, subject consistency across edits and scenes, multi-reference composition, and pose or expression sets. Slower than Flash; less suited to dense in-image text and precise local edits."
    }
  },
  params: {
    aspect_ratio: IMAGE_ASPECT_RATIO([
      "1:1",
      "2:3",
      "3:2",
      "3:4",
      "4:3",
      "16:9",
      "9:16",
      "21:9",
      "4:5",
      "5:4"
    ]),
    resolution: { ...IMAGE_RESOLUTION(["1k", "2k", "4k"]), default: "2k" }
  },
  native: { resolution: { kind: "enum", values: upperCased("1k", "2k", "4k") } },
  prepare: ({ modelId, prompt, params, media: media2 }) => ({
    backend: BACKEND_NANO_BANANA,
    model_id: modelId,
    prompt,
    params: wire({ resolution: "2k", ...params, model_name: modelId }),
    image_paths: [...media2.image]
  })
};

// ../packages/protocol/dist/capabilities/models/vendors/elevenlabs.js
var MUSIC_MIN_SECONDS = 3;
var MUSIC_MAX_SECONDS = 600;
function musicLengthSeconds(value) {
  const match = /^(?:(\d+)s|(\d+)m|(\d{1,2}):(\d{1,2}))$/.exec(value.trim());
  if (!match)
    return void 0;
  const [, seconds, minutes, mm, ss] = match;
  if (seconds !== void 0)
    return Number(seconds);
  if (minutes !== void 0)
    return Number(minutes) * 60;
  return Number(ss) < 60 ? Number(mm) * 60 + Number(ss) : void 0;
}
var elevenlabsMusic = {
  vendor: "elevenlabs",
  modality: "audio.music",
  backend: BACKEND_ELEVENLABS_MUSIC,
  surfaces: ["agent", "canvas"],
  models: {
    "elevenlabs-music-v2": {
      pricing: "music_v2",
      description: "For instrumental background music from a style description, at a chosen length. Does not take vocals, lyrics or references."
    }
  },
  params: {
    mode: enumParam(["instrumental"], "Instrumental music only, without vocals."),
    length: {
      type: "string",
      pattern: "^(auto|[1-9]\\d*[sm]|\\d{1,2}:[0-5]?\\d)$",
      default: "auto",
      description: `Output length: auto (the model decides), Ns, Nm or m:ss; ${MUSIC_MIN_SECONDS}\u2013${MUSIC_MAX_SECONDS}s.`
    }
  },
  native: {
    mode: {
      kind: "enum",
      name: "is_instrumental",
      values: { instrumental: "instrumental" }
    },
    length: { kind: "enum", name: "music_length_ms" }
  },
  prepare: ({ modelId, prompt, params, references }) => {
    if (references.length)
      reject("Music generation does not accept references.");
    const length = typeof params.length === "string" ? params.length : "auto";
    const seconds = musicLengthSeconds(length);
    if (length !== "auto" && (seconds === void 0 || seconds < MUSIC_MIN_SECONDS))
      reject(`Music length must be at least ${MUSIC_MIN_SECONDS} seconds.`);
    if (seconds !== void 0 && seconds > MUSIC_MAX_SECONDS)
      reject(`Music length must be at most ${MUSIC_MAX_SECONDS} seconds.`);
    return {
      backend: BACKEND_ELEVENLABS_MUSIC,
      model_id: modelId,
      prompt,
      params: wire({
        music_length_ms: length,
        is_instrumental: "instrumental"
      })
    };
  }
};

// ../packages/protocol/dist/capabilities/models/vendors/gpt-image.js
var GPT_IMAGE_BASE_QUALITIES = ["low", "medium", "high"];
var GPT_IMAGE_EXTENDED_QUALITIES = ["low", "medium", "high", "xhigh", "max"];
var GPT_IMAGE_BASE_BACKGROUNDS = ["auto", "opaque"];
var GPT_IMAGE_EXTENDED_BACKGROUNDS = ["auto", "transparent", "opaque"];
var GPT_IMAGE_25_MODEL_IDS = /* @__PURE__ */ new Set([
  "gpt-image-2.5-flare",
  "gpt-image-2.5-sunburst"
]);
function qualitySchema(modelId) {
  const is25 = GPT_IMAGE_25_MODEL_IDS.has(modelId);
  return {
    ...enumParam(is25 ? GPT_IMAGE_EXTENDED_QUALITIES : GPT_IMAGE_BASE_QUALITIES, "Compute and cost tier, independent of output resolution. A tier above this model's default increases cost and requires the user's requested tier or acceptance of a cost proposal."),
    default: is25 ? "high" : "medium"
  };
}
function resolutionSchema(modelId) {
  return {
    ...IMAGE_RESOLUTION(["1k", "2k", "4k"]),
    default: GPT_IMAGE_25_MODEL_IDS.has(modelId) ? "2k" : "1k"
  };
}
var gptImage = {
  vendor: "gpt-image",
  modality: "image",
  backend: BACKEND_OPENAI,
  knowledgeCard: "vendors/gpt-image.md",
  // Sunburst is the default; the other variants require an explicit user choice.
  // Domestic registry ids are g-image-*, but their model_name is gpt-image-*,
  // so one set serves both regions.
  models: {
    "gpt-image-2.5-sunburst": {
      description: "Default image model unless the user explicitly requests another model. Strong in subject consistency across edits and scenes, in-image text and layout including dense CJK text, infographics and UI, style transfer, photoreal character anchors and multi-reference composition. Supports transparent backgrounds."
    },
    "gpt-image-2": {
      description: "Use only when explicitly requested by the user. Strong in photorealism, subject consistency across scenes, in-image text and layout, style transfer and multi-reference composition. Older variant without transparent backgrounds or the highest quality tiers.",
      params: {
        resolution: resolutionSchema("gpt-image-2"),
        quality: qualitySchema("gpt-image-2"),
        background: enumParam(GPT_IMAGE_BASE_BACKGROUNDS, "Both auto and opaque produce an opaque background. Transparent output requires a model with alpha-channel support.")
      }
    },
    "gpt-image-2.5-flare": {
      description: "Use only when explicitly requested by the user. Faster than gpt-image-2.5-sunburst, but slightly weaker on complex tasks, exacting image-quality requirements and fine-detail edits. Suited to everyday visuals and rapid iteration. Supports transparent backgrounds."
    }
  },
  params: {
    aspect_ratio: IMAGE_ASPECT_RATIO([
      "1:1",
      "16:9",
      "9:16",
      "3:4",
      "4:3",
      "3:2",
      "2:3",
      "5:4",
      "4:5",
      "21:9"
    ]),
    resolution: resolutionSchema("gpt-image-2.5-sunburst"),
    quality: qualitySchema("gpt-image-2.5-sunburst"),
    background: {
      ...enumParam(GPT_IMAGE_EXTENDED_BACKGROUNDS, "Background handling. transparent produces an alpha channel when the user requests transparent output; otherwise leave the default background."),
      default: "auto"
    }
  },
  prepare: ({ modelId, prompt, params, media: media2 }) => {
    const is25 = GPT_IMAGE_25_MODEL_IDS.has(modelId);
    const { background, ...rest } = params;
    return {
      backend: BACKEND_OPENAI,
      model_id: modelId,
      prompt,
      params: wire({
        ...rest,
        ...is25 || background !== "opaque" ? { background } : {},
        model_name: modelId,
        n: 1
      }),
      image_paths: [...media2.image]
    };
  }
};

// ../packages/protocol/dist/capabilities/models/vendors/kling.js
function prepareKling(request) {
  const { modelId, prompt, media: media2 } = request;
  const scope = modelId;
  const { video_refer_type, keep_source_audio, audio, ...params } = request.params;
  const video = media2.video[0];
  const referType = video_refer_type ?? "base";
  if (video && referType === "base" && params.multi_shot === true)
    reject(`${scope} base video reference mode does not support multi_shot=true.`);
  return {
    backend: BACKEND_KLING,
    model_id: modelId,
    prompt,
    params: wire({
      ...params,
      model_name: modelId,
      ...video ? {
        video_list_json: [
          {
            local_path: video,
            refer_type: referType,
            // The list is one opaque JSON param, so it carries Kling's own
            // spelling instead of going through the top-level translation.
            ...keep_source_audio === void 0 ? {} : {
              keep_original_sound: KLING_NATIVE.keep_source_audio.values[String(keep_source_audio) === "true" ? "true" : "false"]
            }
          }
        ]
      } : { audio }
    }),
    image_paths: [...media2.image]
  };
}
var KLING_NATIVE = {
  audio: { kind: "boolean", name: "sound", values: { true: "on", false: "off" } },
  keep_source_audio: {
    kind: "boolean",
    name: "keep_original_sound",
    values: { true: "yes", false: "no" }
  },
  quality_tier: { kind: "enum", name: "mode", values: { std: "std", pro: "pro", max: "4k" } },
  multi_shot: { kind: "boolean", values: TRUE_FALSE }
};
var kling = {
  vendor: "kling",
  modality: "video",
  backend: BACKEND_KLING,
  knowledgeCard: "vendors/kling-omni.md",
  models: {
    "kling-v3-omni": {
      description: "Use only when explicitly requested by the user. For subject and product consistency, multi-reference guidance and multi-shot storytelling with native audio. Supports video editing; native audio generation is unavailable with a video reference. With a video reference, video_refer_type=base inherits the source duration; feature caps output at 10 seconds."
    }
  },
  referenceDescription: "Images guide the generated video as references. A source video can be edited using video_refer_type=base. When a video reference is present, at most four image references may accompany it. A reference video must be 3..10 seconds and at most 200MB.",
  params: {
    quality_tier: {
      ...enumParam(["std", "pro", "max"], "Output resolution: std=720p, pro=1080p (default), max=4K. A tier above the default increases cost and requires the user's requested tier or acceptance of a cost proposal."),
      default: "pro"
    },
    aspect_ratio: { ...VIDEO_ASPECT_RATIO(["16:9", "9:16", "1:1"]), default: "16:9" },
    audio: {
      ...VIDEO_AUDIO,
      description: "Native audio generation switch. Ignored when a video reference is supplied; keep_source_audio controls that source audio instead.",
      default: false
    },
    multi_shot: {
      ...booleanParam("Multi-shot switch. true is rejected with a video reference using video_refer_type=base."),
      default: false
    },
    video_refer_type: enumParam(["feature", "base"], "Video reference use: feature guides a new output; base edits the source and retains its length. Defaults to base when a video is supplied; ignored without one."),
    keep_source_audio: booleanParam("Whether to retain the reference video audio. Ignored without a video reference."),
    duration: {
      ...durationParam(3, 15),
      description: "Output duration in seconds, rounded up and capped at the model maximum; below the minimum is rejected. Defaults to 5. With video_refer_type=feature the output is capped at 10 seconds; base uses the source length and ignores duration.",
      default: 5
    }
  },
  native: KLING_NATIVE,
  prepare: prepareKling
};

// ../packages/protocol/dist/capabilities/models/vendors/kling-avatar.js
var klingAvatar = {
  vendor: "kling",
  modality: "video",
  backend: BACKEND_KLING_AVATAR,
  knowledgeCard: "vendors/kling-omni.md",
  models: {
    "kling-avatar": {
      description: "Use only when explicitly requested by the user. For audio-driven talking portraits and lip-synced delivery. Uses one portrait image and one audio track; output duration follows the audio."
    }
  },
  referenceDescription: "The image defines the portrait; the audio drives speech and determines output duration.",
  params: {
    quality_tier: {
      ...enumParam(["std", "pro"], "Output resolution: std=720p (default), pro=1080p. A tier above the default increases cost and requires the user's requested tier or acceptance of a cost proposal."),
      default: "std"
    }
  },
  native: KLING_NATIVE,
  prepare: ({ modelId, prompt, params, media: media2 }) => ({
    backend: BACKEND_KLING_AVATAR,
    model_id: modelId,
    prompt,
    params: wire({ ...params, type: "avatar", sound_file: media2.audio[0] }),
    image_paths: [...media2.image]
  })
};

// ../packages/protocol/dist/capabilities/models/vendors/midjourney.js
var integerText = (description, defaultValue) => ({
  type: ["number", "string"],
  description,
  default: defaultValue
});
var SCOPE = "image vendor=midjourney";
var RANGES = [
  { names: ["stylize"], label: "stylize", min: 0, max: 1e3 },
  { names: ["chaos", "c"], label: "chaos", min: 0, max: 100 },
  { names: ["weird", "w"], label: "weird", min: 0, max: 3e3 }
];
function promptFlag(prompt, names) {
  const match = prompt.match(new RegExp(`(?:^|\\s)--(?:${names.join("|")})(?=$|[=\\s])(?:[=\\s]+(\\S+))?`, "i"));
  return match ? { value: match[1] } : void 0;
}
function checkPromptFlags(prompt) {
  const ratio = promptFlag(prompt, ["ar"]);
  if (ratio && !/^\d+:\d+$/.test(ratio.value ?? ""))
    reject(`${SCOPE} prompt flag --ar ${ratio.value ?? ""} is malformed. Use W:H integers, e.g. --ar 16:9.`);
  for (const { names, label, min, max } of RANGES) {
    const flag = promptFlag(prompt, names);
    const n = Number(flag?.value);
    if (flag && (flag.value === void 0 || !Number.isInteger(n) || n < min || n > max))
      reject(`${SCOPE} prompt flag --${label} ${flag.value ?? ""} is invalid. Use an integer ${min}..${max}.`);
  }
}
var midjourney = {
  vendor: "midjourney",
  modality: "image",
  backend: BACKEND_MIDJOURNEY,
  knowledgeCard: "vendors/midjourney.md",
  models: {
    "midjourney-8.2": {
      pricing: "midjourney",
      description: "Use only when explicitly requested by the user. For decorative art direction, editorial mood, art prints, patterns, painterly illustration and moodboards. Best suited to concise English prompts; less suited to precise in-image text and strict subject consistency."
    }
  },
  params: {
    aspect_ratio: IMAGE_ASPECT_RATIO([
      "1:1",
      "16:9",
      "9:16",
      "3:4",
      "4:3",
      "3:2",
      "2:3",
      "5:4",
      "4:5",
      "21:9"
    ]),
    resolution: {
      ...IMAGE_RESOLUTION(["1k", "2k"]),
      description: "Output size tier. Defaults to 2k, which selects HD rendering.",
      default: "2k"
    },
    stylize: integerText("Stylization strength, integer 0-1000 (default 100). Higher is more artistic.", 100),
    chaos: integerText("Variety across outputs, integer 0-100 (default 0). Higher is more diverse.", 0),
    weird: integerText("Unconventional aesthetics, integer 0-3000 (default 0).", 0)
  },
  native: { resolution: { kind: "enum", name: "clarity" } },
  prepare: ({ modelId, prompt, params, media: media2 }) => {
    for (const { label, min, max } of RANGES)
      intInRange(SCOPE, label, params[label], min, max);
    checkPromptFlags(prompt);
    const { resolution: resolution2 } = params;
    return {
      backend: BACKEND_MIDJOURNEY,
      model_id: modelId,
      // HD is a prompt flag upstream; the clarity parameter alone does not select it.
      prompt: resolution2 === "2k" && !/(^|\s)--hd(\s|$)/i.test(prompt) ? `${prompt} --hd` : prompt,
      params: wire(params),
      image_paths: [...media2.image]
    };
  }
};

// ../packages/protocol/dist/capabilities/models/vendors/minimax.js
var FIXED_RATIOS = "16:9, 4:3, 1:1, 3:4, 9:16, 21:9";
function prepareMiniMax({ modelId, prompt, params, references, media: media2, mode }) {
  const scope = modelId;
  const standard = modelId === "MiniMax-H3";
  const frames = mode === "first-last-frame";
  const reference = mode === "reference";
  if (!standard && !prompt.trim())
    reject(`${scope} requires a non-empty prompt.`);
  const ratio = params.aspect_ratio ?? "adaptive";
  if (!frames && ratio === "adaptive" && !standard && !reference)
    reject(`${scope} mode=${mode} requires a fixed params.aspect_ratio. Pass one of: ${FIXED_RATIOS}.`);
  const { image, video, audio } = media2;
  if (standard && !prompt.trim() && !image.length && !video.length && !audio.length)
    reject(`${scope} requires a prompt or reference media.`);
  if (reference && !standard && !image.length && !video.length)
    reject(`${scope} mode=reference requires at least one reference image or video.`);
  return {
    backend: BACKEND_MINIMAX_V3,
    model_id: modelId,
    prompt,
    params: wire({
      ...params,
      aspect_ratio: frames ? "adaptive" : ratio,
      mode,
      ...reference ? {
        reference_images: jsonList(image),
        reference_videos: jsonList(video),
        reference_audios: jsonList(audio)
      } : {}
    }),
    // The Backend reads an empty opening frame as the empty path before the closing one.
    image_paths: frames ? [...references[0] === null ? [""] : [], ...image] : []
  };
}
var minimax = {
  vendor: "MiniMax",
  modality: "video",
  backend: BACKEND_MINIMAX_V3,
  knowledgeCard: "vendors/minimax.md",
  models: {
    "MiniMax-H3": {
      description: "Default video model unless the user explicitly requests another model; for short-drama creation, default to seedance2.5 instead. Strong in photoreal human faces and close-ups. Supports video editing and video continuation through reference inputs.",
      params: {
        mode: ["reference", "first-last-frame"],
        resolution: { ...VIDEO_RESOLUTION(["768p", "2k"]), default: "2k" },
        prompt_expansion_mode: null
      },
      // Upstream rejects any H3 request without text: "content 必须包含一个非空 text 项(prompt 必填)
      // (2013)", seen live for first-last-frame and for reference with one image
      // (traceId 6ac8a97f00000000a4b5f06fe56dce92). Prompt-only generation is reference mode.
      promptModes: { reference: "required", "first-last-frame": "required" },
      paramDerivations: [
        // Legacy popover: a frame request with a prompt but no frame is text-only generation.
        {
          phase: "submit",
          when: { mode: ["first-last-frame"], references: "none", prompt: "some" },
          set: { mode: { value: "reference" } }
        },
        // Text-only generation (reference without material) carries a fixed ratio upstream.
        {
          phase: "submit",
          when: {
            mode: ["reference"],
            references: "none",
            paramIn: { aspect_ratio: ["adaptive"] }
          },
          set: { aspect_ratio: { from: "firstOption", exclude: ["adaptive"] } }
        }
      ]
    },
    "MiniMax-H3-Max": {
      description: "Use only when explicitly requested by the user. For higher-tier MiniMax rendering. Supports video editing through reference inputs.",
      params: {
        mode: ["text-to-video", "first-last-frame", "reference"],
        resolution: { ...VIDEO_RESOLUTION(["480p", "768p"]), default: "768p" },
        audio: null,
        duration: { ...durationParam(5, 15), default: 5 }
      },
      // With audioNeedsVisual from the contract, at least one image or video.
      minReferencesInMode: { reference: 1 },
      paramDerivations: [
        {
          phase: "submit",
          when: { mode: ["first-last-frame"], references: "none", prompt: "some" },
          set: { mode: { value: "text-to-video" } }
        }
      ]
    },
    "MiniMax-H3-Max-Turbo": {
      description: "Use only when explicitly requested by the user. For fast MiniMax drafts using text or opening and closing frames. General reference input and video editing are not supported.",
      params: {
        mode: ["text-to-video", "first-last-frame"],
        resolution: { ...VIDEO_RESOLUTION(["480p", "768p"]), default: "768p" },
        audio: null,
        duration: { ...durationParam(5, 15), default: 5 }
      },
      paramDerivations: [
        {
          phase: "submit",
          when: { mode: ["first-last-frame"], references: "none", prompt: "some" },
          set: { mode: { value: "text-to-video" } }
        }
      ]
    }
  },
  requiredParams: ["mode"],
  paramValuesInMode: {
    "first-last-frame": { aspect_ratio: ["adaptive"] },
    "text-to-video": { aspect_ratio: FIXED_RATIOS.split(", ") }
  },
  lastFrameOnly: true,
  referenceDescription: "first-last-frame binds ordered images to the opening and optional closing frame, with no other media. For standard H3 continuation, pass one source video in reference mode and describe the subsequent action. In reference mode the H3 Max family needs an image or video; audio-only input is not supported.",
  params: {
    mode: enumParam(["reference", "first-last-frame", "text-to-video"], "Input handling: reference uses guidance media, including a source video for editing. Standard H3 also generates from a prompt alone or continues a source video in reference. first-last-frame binds input frames. The H3 Max family uses text-to-video for prompt-only generation."),
    resolution: {
      ...VIDEO_RESOLUTION(["480p", "768p", "2k"]),
      description: "Output size tier. MiniMax-H3 defaults to 2k; the H3 Max family defaults to 768p. A tier above the default increases cost and requires the user's requested tier or acceptance of a cost proposal."
    },
    aspect_ratio: {
      ...VIDEO_ASPECT_RATIO(["adaptive", "16:9", "4:3", "1:1", "3:4", "9:16", "21:9"]),
      description: "Output frame ratio. Defaults to adaptive: it follows the references, or 16:9 without them. first-last-frame uses the source frame; a fixed ratio is rejected. The H3 Max family requires a fixed ratio for text-to-video.",
      default: "adaptive"
    },
    audio: VIDEO_AUDIO,
    prompt_expansion_mode: {
      ...enumParam(["disabled", "balanced", "quality"], "Prompt expansion mode."),
      default: "disabled"
    },
    duration: {
      ...durationParam(4, 15),
      description: "Output duration in seconds, rounded up and capped at the model maximum; below the minimum is rejected. Defaults to 5.",
      default: 5
    }
  },
  native: {
    mode: { kind: "enum", name: "image_mode" },
    resolution: { kind: "enum", values: upperCased("480p", "768p", "2k") },
    audio: { kind: "boolean", name: "generate_audio", values: TRUE_FALSE }
  },
  prepare: prepareMiniMax
};

// ../packages/protocol/dist/capabilities/models/vendors/minimax-audio.js
var minimaxAudio = {
  vendor: "minimax-audio",
  modality: "audio.tts",
  backend: BACKEND_MINIMAX_V3,
  surfaces: ["agent", "canvas"],
  models: {
    "MiniMax-H3 Audio": {
      pricing: "MiniMax-H3-audio-continuation",
      description: "For continuing one source audio clip as the prompt describes, to a longer total length."
    }
  },
  referenceDescription: "Exactly one source audio to continue.",
  params: {
    duration: {
      ...durationParam(5, 20),
      description: "Total output length in seconds, 5..20, at least one second past the source audio."
    }
  },
  requiredParams: ["duration"],
  prepare: ({ modelId, prompt, params, media: media2 }) => {
    if (!prompt.trim())
      reject("Audio continuation needs a prompt describing how to continue.");
    return {
      backend: BACKEND_MINIMAX_V3,
      model_id: modelId,
      prompt,
      params: wire({ duration: params.duration }),
      audio_paths: [...media2.audio]
    };
  }
};

// ../packages/protocol/dist/capabilities/models/vendors/music.js
var officialMusic = {
  vendor: "official",
  modality: "audio.music",
  backend: BACKEND_MINIMAX_MUSIC,
  knowledgeCard: "vendors/official-music.md",
  models: {
    "music-3.0": {
      description: "For complete vocal songs, instrumental background music, jingles and scores. Supports user-provided lyrics; does not take reference audio."
    }
  },
  params: {
    mode: enumParam(["song", "instrumental"], "song = vocals/music; instrumental = instrumental BGM."),
    lyrics: {
      type: "string",
      description: "Lyrics for mode=song, with structure tags like [verse], [chorus], [bridge]. Write them or use user-provided lyrics, and confirm them with the user first; when omitted the prompt is sung as the lyrics."
    }
  },
  requiredParams: ["mode"],
  native: {
    mode: {
      kind: "enum",
      name: "is_instrumental",
      values: { song: "vocal", instrumental: "instrumental" }
    }
  },
  prepare: ({ modelId, prompt, params, references }) => {
    if (references.length)
      reject("Music generation does not accept references.");
    const lyrics = typeof params.lyrics === "string" ? params.lyrics : "";
    return {
      backend: BACKEND_MINIMAX_MUSIC,
      model_id: modelId,
      prompt,
      params: wire(params.mode === "song" ? { lyrics } : { is_instrumental: "instrumental" })
    };
  }
};

// ../packages/protocol/dist/capabilities/models/vendors/seedance.js
var DRAFT_RESOLUTIONS = ["480p", "720p"];
var ADAPTIVE = "adaptive";
function prepareSeedance({ modelId, prompt, params, media: media2, mode }) {
  const is25 = modelId === "seedance2.5";
  const { image, video, audio } = media2;
  const frames = mode === "first-last-frame";
  const edits = mode === "video-edit" || mode === "video-extend";
  const inherits = is25 && (edits || frames && image.length > 0);
  return {
    backend: BACKEND_SEEDANCE,
    model_id: modelId,
    prompt,
    params: wire({
      ...params,
      aspect_ratio: inherits ? ADAPTIVE : params.aspect_ratio,
      mode,
      model_name: modelId,
      omni_reference_task_type: is25 && mode === "reference" ? "reference" : void 0,
      ...frames ? {} : {
        reference_images: jsonList(image),
        reference_videos: jsonList(video),
        reference_audios: jsonList(audio)
      }
    }),
    image_paths: frames ? [...image] : []
  };
}
var seedance = {
  vendor: "seedance",
  modality: "video",
  backend: BACKEND_SEEDANCE,
  knowledgeCard: "vendors/seedance.md",
  videoTailTrim: true,
  models: {
    "seedance2.0": {
      description: "Use only when explicitly requested by the user. For multi-shot storytelling and multi-reference guidance with native audio. Supports video editing and video continuation through reference inputs.",
      params: { mode: ["reference", "first-last-frame"], output_format: null }
    },
    "seedance2.0-fast": {
      description: "Use only when explicitly requested by the user. For fast drafts of multi-shot storytelling and multi-reference guidance with native audio. Lower-resolution alternative to Seedance 2.0; supports video editing and video continuation through reference inputs.",
      params: {
        mode: ["reference", "first-last-frame"],
        resolution: DRAFT_RESOLUTIONS,
        output_format: null
      }
    },
    "seedance2.0-mini": {
      description: "Use only when explicitly requested by the user. For lightweight drafts of multi-shot storytelling and multi-reference guidance with native audio. Lower-resolution alternative to Seedance 2.0; supports video editing and video continuation through reference inputs.",
      params: {
        mode: ["reference", "first-last-frame"],
        resolution: DRAFT_RESOLUTIONS,
        output_format: null
      }
    },
    "seedance2.5": {
      description: "Default video model for short-drama creation unless the user explicitly requests another model. For other video tasks, use only when explicitly requested by the user. Supports longer clips and larger reference sets than Seedance 2.0, with native audio, video editing, video continuation and audio-only reference input. An edit inherits the source duration; for an extension, duration is the final output length.",
      params: {
        resolution: ["480p", "720p", "1080p"],
        duration: {
          ...durationParam(4, 30),
          description: "Output duration in seconds, rounded up and capped at the model maximum; below the minimum is rejected. Defaults to 5. An extension uses the final output length. video-edit inherits the input length and rejects this parameter.",
          default: 5
        }
      },
      paramsNotInMode: { "video-edit": ["duration"] }
    }
  },
  requiredParams: ["mode"],
  referenceDescription: "first-last-frame binds ordered images to the opening and optional closing frame, with no other media. Only seedance2.5 accepts audio-only reference input; audio references on the 2.0 variants require an image or video. video-edit and video-extend require video references; the first video is the continuation source for video-extend. For the 2.0 variants, reference videos total 2..15 seconds and reference audios total at most 15 seconds.",
  params: {
    mode: enumParam(["reference", "first-last-frame", "video-edit", "video-extend"], "Input handling: reference accepts guidance media or a prompt alone. On the 2.0 variants, reference with a source video edits or extends that video as the prompt describes; on seedance2.5, reference only uses videos as guidance and never edits a source video. first-last-frame binds opening and optional closing frames. When offered (seedance2.5 only), video-edit and video-extend edit or extend the first reference video; use them for any seedance2.5 edit or extension."),
    aspect_ratio: {
      ...VIDEO_ASPECT_RATIO([ADAPTIVE, "16:9", "4:3", "1:1", "3:4", "9:16", "21:9"]),
      description: "Output frame ratio. Defaults to adaptive: it follows the reference media, or the model picks one without any. Editing or extending a source video requires adaptive, as do seedance2.5 first-last-frame inputs with frame images; omit aspect_ratio for them. Pass a fixed ratio only to frame new footage explicitly.",
      default: ADAPTIVE
    },
    resolution: { ...VIDEO_RESOLUTION(["480p", "720p", "1080p", "4k"]), default: "720p" },
    audio: VIDEO_AUDIO,
    output_format: { ...enumParam(["mp4", "mov"], "Output container."), default: "mp4" },
    duration: { ...durationParam(4, 15), default: 5 }
  },
  native: {
    mode: { kind: "enum", name: "image_mode" },
    audio: { kind: "boolean", name: "generate_audio", values: TRUE_FALSE }
  },
  prepare: prepareSeedance
};

// ../packages/protocol/dist/capabilities/models/vendors/seedream.js
var seedream = {
  vendor: "seedream",
  modality: "image",
  backend: BACKEND_SEEDREAM,
  knowledgeCard: "vendors/seedream.md",
  models: {
    "doubao-seedream-5-0-pro-260628": {
      description: "Use only when explicitly requested by the user. Lower-priced, but less capable overall than the gpt-image and nano_banana families. Supports local edits, subject consistency across image series, anime/manhwa characters and sketch-to-render work. Supports 1k/2k output. Average photorealism; less suited to dense in-image text and imaginative or creative work.",
      params: { resolution: ["1k", "2k"] }
    }
  },
  params: {
    aspect_ratio: IMAGE_ASPECT_RATIO(["1:1", "4:3", "3:4", "16:9", "9:16", "3:2", "2:3", "21:9"]),
    resolution: { ...IMAGE_RESOLUTION(["1k", "2k"]), default: "2k" }
  },
  prepare: ({ modelId, prompt, params, media: media2 }) => ({
    backend: BACKEND_SEEDREAM,
    model_id: modelId,
    prompt,
    params: wire({ resolution: "2k", ...params, model_name: modelId }),
    image_paths: [...media2.image]
  })
};

// ../packages/protocol/dist/capabilities/models/vendors/speech.js
var SPEECH_PARAMS = {
  speed: {
    type: "number",
    minimum: 0.5,
    maximum: 2,
    description: "Speed multiplier per text. Range [0.5, 2]. Default 1.0.",
    default: 1
  },
  pitch: {
    type: "integer",
    minimum: -12,
    maximum: 12,
    description: "Pitch shift in semitones per text. Range [-12, 12]. Default 0."
  }
};
var LANGUAGE_BOOST = [
  "Chinese",
  "Chinese,Yue",
  "English",
  "Arabic",
  "Russian",
  "Spanish",
  "French",
  "Portuguese",
  "German",
  "Turkish",
  "Dutch",
  "Ukrainian",
  "Vietnamese",
  "Indonesian",
  "Japanese",
  "Italian",
  "Korean",
  "Thai",
  "Polish",
  "Romanian",
  "Greek",
  "Czech",
  "Finnish",
  "Hindi",
  "Bulgarian",
  "Danish",
  "Hebrew",
  "Malay",
  "Persian",
  "Slovak",
  "Swedish",
  "Croatian",
  "Filipino",
  "Hungarian",
  "Norwegian",
  "Slovenian",
  "Catalan",
  "Nynorsk",
  "Tamil",
  "Afrikaans",
  "auto"
];
var voiceModifyAxis = (description) => ({
  type: "integer",
  minimum: -100,
  maximum: 100,
  description
});
var isUncataloguedVoice = (id2) => id2 === "Friendly_Person" || id2.startsWith("hub_") || id2.startsWith("ttv");
function checkVoice(id2, voices) {
  if (!voices.length || isUncataloguedVoice(id2) || voices.some((v) => v.voice_id === id2))
    return;
  const needle = id2.toLowerCase();
  const suggestions = voices.filter((v) => v.voice_id.toLowerCase().includes(needle) || needle.includes(v.voice_id.toLowerCase())).slice(0, 5);
  reject(`voice_id "${id2}" not found in current voice catalog.${suggestions.length ? `
Did you mean: ${suggestions.map((v) => `${v.voice_id} (${v.name}, ${v.language})`).join(", ")}` : "\nSearch the voice catalog for available voices."}`);
}
function prepareOfficialSpeech({ modelId, prompt, params, references, voices }) {
  if (references.length)
    reject("Official speech uses a prepared voice, not media references");
  const { voice_id_source, ...rest } = params;
  if (voice_id_source !== "user")
    checkVoice(String(rest.voice_id), voices ?? []);
  return {
    backend: BACKEND_MINIMAX_TTS,
    model_id: modelId,
    prompt,
    params: wire({ ...rest, model_name: modelId })
  };
}
function prepareSeedAudio({ modelId, prompt, params, media: media2 }) {
  const { image, audio } = media2;
  return {
    backend: BACKEND_SEEDAUDIO,
    model_id: modelId,
    prompt,
    params: wire({ ...params, model_name: modelId }),
    ...audio.length ? { audio_paths: [...audio] } : {},
    ...image.length ? { image_paths: [...image] } : {}
  };
}
var officialSpeech = {
  vendor: "official",
  modality: "audio.tts",
  backend: BACKEND_MINIMAX_TTS,
  knowledgeCard: "vendors/moss.md",
  models: {
    "speech-2.8-hd": {
      description: "For speech that must use a preset catalog voice (voice_id), exact pronunciation overrides or voice effects, or when the user asks for this model. Not the default speech model."
    }
  },
  params: {
    ...SPEECH_PARAMS,
    voice_id: {
      type: "string",
      description: "Official voice ID for this narration. Defaults to the catalog default voice.",
      default: "Friendly_Person"
    },
    voice_id_source: {
      ...enumParam(["user", "catalog", "tool"], "Where voice_id comes from: user=exact ID supplied by the user (not checked against the catalog); catalog=voice_search result or the default voice; tool=voiceId of a voice_clone/voice_design output. Defaults to catalog."),
      default: "catalog"
    },
    vol: {
      type: "number",
      exclusiveMinimum: 0,
      maximum: 10,
      description: "Official speech volume per text. Range (0, 10]. Default 1.0."
    },
    emotion: enumParam(["happy", "sad", "angry", "fearful", "disgusted", "surprised", "calm", "fluent"], "Emotion for speech synthesis. Omit for default behavior."),
    language_boost: {
      type: "string",
      enum: LANGUAGE_BOOST,
      default: "auto",
      description: "Official speech only: language recognition enhancement. Use the exact language value for known monolingual text, `Chinese,Yue` for Cantonese, or `auto` (default) for automatic detection."
    },
    pronunciation_dict: {
      type: "object",
      properties: {
        tone: {
          type: "array",
          items: { type: "string" },
          description: 'Pronunciation overrides. Each entry: "<source>/<replacement>". Replacement can be (1) Mandarin pinyin with tone digits in parens, e.g. "\u5904\u7406/(chu3)(li3)"; (2) IPA in parens, e.g. "resume/(r\u026A\u02C8zju\u02D0m)"; (3) Cantonese pinyin with tone digits 1-6 in parens, e.g. "(sung3)"; (4) plain text replacement, e.g. "omg/oh my god". Multiple rules apply simultaneously.'
        }
      },
      required: ["tone"],
      description: "Pronunciation overrides (applied globally to every text in the batch)."
    },
    voice_modify: {
      type: "object",
      properties: {
        pitch: voiceModifyAxis("Pitch adjustment, range [-100, 100]. -100 = lowest, 100 = brightest."),
        intensity: voiceModifyAxis("Intensity adjustment, range [-100, 100]. -100 = most forceful, 100 = softest."),
        timbre: voiceModifyAxis("Timbre adjustment, range [-100, 100]. -100 = warmest, 100 = crispest."),
        sound_effects: enumParam(["spacious_echo", "auditorium_echo", "lofi_telephone", "robotic"], "One sound effect: spacious_echo (open echo) / auditorium_echo (PA system) / lofi_telephone (phone distortion) / robotic (electronic).")
      },
      description: "Official speech only: post-synthesis effect chain. Use sparingly for stylistic effects."
    }
  },
  prepare: prepareOfficialSpeech
};
var seedAudio = {
  vendor: "seedaudio",
  modality: "audio.tts",
  backend: BACKEND_SEEDAUDIO,
  knowledgeCard: "vendors/seedaudio.md",
  models: {
    "seed-audio-1.0": {
      description: "Default speech model for narration, voiceover, dialogue and character acting, with or without ambience and sound effects. The prompt describes the voice; optional audio or image references carry a voice identity. Does not use catalog voice_id."
    }
  },
  params: {
    ...SPEECH_PARAMS,
    pitch: { ...SPEECH_PARAMS.pitch, default: 0 },
    volume: {
      type: "number",
      minimum: 0.5,
      maximum: 2,
      description: "SeedAudio volume multiplier. Range [0.5, 2]. Default 1.0.",
      default: 1
    },
    sample_rate: {
      ...enumParam(["8000", "16000", "24000", "32000", "44100", "48000"], "SeedAudio only: output sample rate in Hz, default 24000."),
      default: "24000"
    },
    format: enumParam(["wav", "mp3", "pcm", "ogg_opus"], "SeedAudio only: output audio format, default wav.")
  },
  prepare: prepareSeedAudio
};

// ../packages/protocol/dist/capabilities/models/vendors/veo.js
var veo = {
  vendor: "veo3",
  modality: "video",
  backend: BACKEND_VEO3,
  knowledgeCard: "vendors/veo.md",
  models: {
    "veo-3.1-fast-generate-001": {
      description: "Use only when explicitly requested by the user. For cinematic, photoreal single shots. Faster Veo variant for iteration; supports opening and closing frames. Less suited to multi-shot storytelling; general reference input is not supported."
    },
    "veo-3.1-generate-001": {
      description: "Use only when explicitly requested by the user. For cinematic, photoreal single shots. Higher-quality Veo variant for final hero shots; supports opening and closing frames. Less suited to multi-shot storytelling; general reference input is not supported."
    }
  },
  referenceOverrides: { min: 0, max: 2, kinds: { image: 2 } },
  referenceDescription: "Without images, generates from the prompt alone. The first image anchors the opening frame and an optional second image anchors the closing frame; they are not general style references.",
  params: {
    aspect_ratio: { ...VIDEO_ASPECT_RATIO(["9:16", "16:9"]), default: "16:9" },
    resolution: { ...VIDEO_RESOLUTION(["720p", "1080p"]), default: "720p" },
    duration: { ...durationParam(8, 8), default: 8 }
  },
  prepare: ({ modelId, prompt, params, media: media2 }) => ({
    backend: BACKEND_VEO3,
    model_id: modelId,
    prompt,
    params: wire({ ...params, model_name: modelId }),
    // Every veo mode is text or frames: the frames are the whole image input.
    image_paths: [...media2.image]
  })
};

// ../packages/protocol/dist/capabilities/models/vendors/wan.js
var WAN3_RESOLUTIONS = ["480p", "720p", "1080p"];
var WAN3_ASPECT_RATIOS = ["adaptive", "16:9", "4:3", "1:1", "3:4", "9:16"];
var WAN3_MIN_DURATION = 2;
var WAN3_MAX_DURATION = 30;
var WAN3_SEED_MAX = 2147483647;
function prepareWan({ modelId, prompt, params, media: media2, mode }) {
  const scope = modelId;
  const { image, video, audio } = media2;
  const hasSource = params.file_url !== void 0;
  if (mode === "first-last-frame" && hasSource)
    reject(`${scope} cannot combine keyframe references with params.file_url. Wan 3.0 rejects that combination upstream. Keep the keyframes and drop params.file_url, or drop the keyframes and use mode=reference.`);
  if (!prompt.trim() && !image.length && !video.length && !audio.length && !hasSource)
    reject(`${scope} needs a prompt or at least one media input.`);
  intInRange(scope, "seed", params.seed, -1, WAN3_SEED_MAX);
  return {
    backend: BACKEND_WAN_I2V,
    model_id: modelId,
    prompt,
    params: wire({
      ...params,
      mode,
      reference_videos: jsonList(video),
      reference_audios: jsonList(audio)
    }),
    // Keyframes, or the reference images: upstream reads image_paths by mode.
    image_paths: [...image]
  };
}
var wan = {
  vendor: "wan",
  modality: "video",
  // Wan 3.0 reuses the `wan_i2v` backend id: shipped clients hard-fail their
  // whole catalog on an unknown backend, so model_id alone decides the surface.
  backend: BACKEND_WAN_I2V,
  knowledgeCard: "vendors/wan.md",
  models: {
    "wan3.0-video": {
      description: "Use only when explicitly requested by the user. For Chinese cultural scenes and realistic physical motion with multi-reference guidance. Supports video editing and video continuation through reference inputs; better suited to reference-guided work than prompt-only generation."
    },
    "wan3.0-video-prime": {
      description: "Use only when explicitly requested by the user. For fast drafts of Chinese cultural scenes and realistic physical motion with multi-reference guidance. Supports video editing and video continuation through reference inputs; same controls as Wan 3.0."
    }
  },
  requiredParams: ["mode"],
  // Wan bills every second, so the output length is the Agent's decision;
  // with a source clip a default would also silently cut it.
  agentParams: ["duration"],
  referenceDescription: "Frame modes accept only an opening image and optional closing image in that order; they cannot be combined with other reference media or file_url. A closing frame needs an opening frame.",
  params: {
    mode: enumParam(["reference", "first-last-frame"], "Input handling: reference accepts a prompt alone, media references or file_url; first-last-frame binds opening and optional closing frames. Video editing and extension use reference with a source video and the requested prompt intent."),
    resolution: { ...VIDEO_RESOLUTION(WAN3_RESOLUTIONS), default: "720p" },
    aspect_ratio: {
      ...VIDEO_ASPECT_RATIO(WAN3_ASPECT_RATIOS),
      description: "Output frame ratio. Defaults to adaptive. Use adaptive when continuing a source video; a fixed ratio is rejected upstream for continuation. Other reference-based generation may specify a fixed ratio.",
      default: "adaptive"
    },
    audio: VIDEO_AUDIO,
    prompt_extend: {
      ...booleanParam("Upstream prompt rewriting. Default true; set false to send the prompt verbatim."),
      default: true
    },
    watermark: { ...booleanParam("Watermark switch. Default false."), default: false },
    seed: {
      anyOf: [{ type: "integer" }, { type: "string" }],
      description: `Random seed: -1 for random, otherwise 0..${WAN3_SEED_MAX}.`
    },
    file_url: {
      type: "string",
      description: "Source document as a public URL or local path. Use mode=reference; first-last-frame does not accept it."
    },
    duration: {
      ...durationParam(WAN3_MIN_DURATION, WAN3_MAX_DURATION),
      description: "Intended output duration in seconds, billed per second; always pass it. Rounded up and capped at the model maximum; below the minimum is rejected. With a video reference pass the source length to preserve the clip or a longer length to extend it; reference videos plus the output total at most 30 seconds. Output is 30fps.",
      default: 5
    }
  },
  native: {
    mode: { kind: "enum", name: "image_mode" },
    resolution: { kind: "enum", values: upperCased(...WAN3_RESOLUTIONS) },
    audio: { kind: "boolean", name: "generate_audio", values: TRUE_FALSE },
    prompt_extend: { kind: "boolean", values: TRUE_FALSE },
    watermark: { kind: "boolean", values: TRUE_FALSE }
  },
  prepare: prepareWan
};

// ../packages/protocol/dist/capabilities/models/vendors/index.js
var IMAGE_VENDORS = {
  "gpt-image": gptImage,
  banana,
  seedream,
  midjourney
};
var VIDEO_VENDORS = {
  MiniMax: minimax,
  veo3: veo,
  seedance,
  kling,
  wan
};
var SPEECH_VENDORS = [
  seedAudio,
  officialSpeech,
  minimaxAudio
];
var MUSIC_VENDORS = [officialMusic, elevenlabsMusic];
var VENDORS_BY_MODALITY = {
  image: Object.values(IMAGE_VENDORS),
  video: [...Object.values(VIDEO_VENDORS), klingAvatar],
  "audio.tts": SPEECH_VENDORS,
  "audio.music": MUSIC_VENDORS
};
var VENDORS = Object.values(VENDORS_BY_MODALITY).flat();

// ../packages/protocol/dist/model-input-contract-schema.js
var numericFields = [
  "min_count",
  "max_count",
  "min_duration_ms",
  "max_duration_ms",
  "total_max_duration_ms",
  "input_output_max_duration_ms",
  "max_bytes",
  "min_width",
  "min_height",
  "max_width",
  "max_height",
  "min_aspect_ratio",
  "max_aspect_ratio",
  "min_fps",
  "max_fps",
  "output_min_extra_ms"
];
var ruleKeys = /* @__PURE__ */ new Set([
  "kind",
  "support",
  "extensions",
  "allow_standalone",
  ...numericFields
]);

// ../packages/protocol/dist/project-v3/resource.js
var ProjectResourceKind;
(function(ProjectResourceKind2) {
  ProjectResourceKind2[ProjectResourceKind2["TEXT_DOCUMENT"] = 1] = "TEXT_DOCUMENT";
  ProjectResourceKind2[ProjectResourceKind2["IMAGE"] = 2] = "IMAGE";
  ProjectResourceKind2[ProjectResourceKind2["VIDEO"] = 3] = "VIDEO";
  ProjectResourceKind2[ProjectResourceKind2["AUDIO"] = 4] = "AUDIO";
  ProjectResourceKind2[ProjectResourceKind2["FILE"] = 5] = "FILE";
})(ProjectResourceKind || (ProjectResourceKind = {}));
var ProjectResourceLifecycle;
(function(ProjectResourceLifecycle2) {
  ProjectResourceLifecycle2["ACTIVE"] = "active";
  ProjectResourceLifecycle2["MISSING"] = "missing";
  ProjectResourceLifecycle2["DELETED"] = "deleted";
})(ProjectResourceLifecycle || (ProjectResourceLifecycle = {}));
var ProjectResourceSource;
(function(ProjectResourceSource2) {
  ProjectResourceSource2["IMPORT"] = "import";
  ProjectResourceSource2["GENERATE"] = "generate";
  ProjectResourceSource2["COPY"] = "copy";
})(ProjectResourceSource || (ProjectResourceSource = {}));
var ProjectResourceVersionStatus;
(function(ProjectResourceVersionStatus2) {
  ProjectResourceVersionStatus2["READY"] = "ready";
  ProjectResourceVersionStatus2["DELETED"] = "deleted";
})(ProjectResourceVersionStatus || (ProjectResourceVersionStatus = {}));
var ProjectResourceReadErrorCode;
(function(ProjectResourceReadErrorCode2) {
  ProjectResourceReadErrorCode2["RESOURCE_NOT_FOUND"] = "PROJECT_RESOURCE_NOT_FOUND";
  ProjectResourceReadErrorCode2["VERSION_NOT_FOUND"] = "PROJECT_VERSION_NOT_FOUND";
  ProjectResourceReadErrorCode2["VERSION_RESOURCE_MISMATCH"] = "PROJECT_VERSION_RESOURCE_MISMATCH";
  ProjectResourceReadErrorCode2["CURRENT_VERSION_UNAVAILABLE"] = "PROJECT_CURRENT_VERSION_UNAVAILABLE";
})(ProjectResourceReadErrorCode || (ProjectResourceReadErrorCode = {}));

// ../packages/protocol/dist/project-v3/generation.js
var PROJECT_GENERATION_OPERATIONS = [
  "generate_image",
  "generate_video",
  "generate_speech",
  "generate_music"
];
var PROJECT_GENERATION_MAX_COUNT = 9;

// ../packages/protocol/dist/capabilities/tools/fixed.js
function fixed(provider, compile = () => ({})) {
  return {
    mode: "task",
    route: "fixed",
    ...provider,
    prepare: (request) => {
      const out = compile(request);
      return {
        backend: provider.backend,
        model_id: provider.model,
        prompt: out.prompt ?? request.prompt,
        params: wire({ ...out.params, model_name: provider.model }),
        image_paths: [...out.image_paths ?? request.media.image],
        video_paths: [...request.media.video],
        ...request.media.audio.length ? { audio_paths: [...request.media.audio] } : {}
      };
    }
  };
}
var objectParams = (properties, required) => ({
  type: "object",
  properties,
  ...required?.length ? { required } : {}
});

// ../packages/protocol/dist/capabilities/tools/audio.js
var VOICE_CLONE_MODEL = "voice-clone";
var VOICE_DESIGN_MODEL = "voice-design";
var VOICE_PREVIEW_MODEL = "speech-2.8-hd";
function voiceClip(reference, role, fits, window2) {
  if (!reference)
    return;
  if (!/\.(mp3|m4a|wav)$/i.test(reference.path))
    reject(`${role} must be an mp3, m4a or wav file`);
  const seconds = reference.media.durationSeconds;
  if (seconds === void 0 || !fits(seconds))
    reject(`${role} needs a measured duration ${window2}`);
}
var AUDIO_TOOLS = [
  {
    id: "generate_speech:voice_isolation",
    operation: "generate_speech",
    displayName: "Voice Isolator",
    description: "Keep only the voice of one audio recording of at most 300 seconds, removing background noise and music; the speech itself is unchanged.",
    prompt: { use: "none" },
    references: { min: 1, max: 1, kinds: { audio: 1 } },
    surfaces: ["agent", "canvas"],
    paramSchema: objectParams({}),
    execution: fixed({
      backend: "minimax_tts",
      model: "voice-isolation",
      pricing: "voice-isolation"
    })
  },
  {
    id: "generate_speech:voice_clone",
    operation: "generate_speech",
    displayName: "Voice Clone",
    description: `Create a reusable voice from a recording of the target speaker. prompt is the preview text the new voice speaks. Delivers that preview as audio; the output's voiceId is the new voice_id for speech generation (voice_id_source="tool"). Every call creates and charges a new voice, so reuse a returned voiceId.`,
    prompt: { use: "required", maxLength: 1e3 },
    references: {
      min: 1,
      max: 2,
      kinds: { audio: 2 },
      description: "First: the speaker sample, mp3/m4a/wav, 10s to 5min, at most 20MB. Optional second: a clip under 8s whose exact transcript is params.promptText, to improve similarity."
    },
    surfaces: ["agent"],
    paramSchema: objectParams({
      promptText: {
        type: "string",
        pattern: "\\S",
        description: "Exact transcript of the second reference; required with it."
      },
      noiseReduction: { type: "boolean", description: "Reduce noise in the sample." },
      volumeNormalization: { type: "boolean", description: "Normalize the sample volume." }
    }),
    execution: fixed({ backend: "minimax_tts", model: VOICE_CLONE_MODEL, pricing: VOICE_CLONE_MODEL }, ({ params, references }) => {
      const [sample, prompt] = references;
      voiceClip(sample, "The speaker sample", (s) => s >= 10 && s <= 300, "from 10s to 5min");
      voiceClip(prompt, "The prompt clip", (s) => s > 0 && s < 8, "under 8s");
      if (Boolean(prompt) !== (params.promptText !== void 0))
        reject("A prompt clip and promptText are given together");
      return {
        params: {
          demo_model: VOICE_PREVIEW_MODEL,
          prompt_text: params.promptText,
          need_noise_reduction: params.noiseReduction || void 0,
          need_volume_normalization: params.volumeNormalization || void 0
        }
      };
    })
  },
  {
    id: "generate_speech:voice_design",
    operation: "generate_speech",
    displayName: "Voice Design",
    description: `Create a new reusable voice from a text description, only when the user asks for a custom voice. prompt is the preview text the new voice speaks. Delivers that preview as audio; the output's voiceId is the new voice_id for speech generation (voice_id_source="tool"). Every call creates and charges a new voice, so reuse a returned voiceId.`,
    prompt: { use: "required", maxLength: 500 },
    references: { min: 0, max: 0 },
    surfaces: ["agent"],
    paramSchema: objectParams({
      voiceDescription: {
        type: "string",
        pattern: "\\S",
        description: "The voice to create: timbre, age, gender, accent and speaking style."
      }
    }, ["voiceDescription"]),
    execution: fixed({ backend: "minimax_tts", model: VOICE_DESIGN_MODEL, pricing: VOICE_DESIGN_MODEL }, ({ params }) => ({ params: { voice_prompt: params.voiceDescription } }))
  }
];

// ../packages/protocol/dist/capabilities/tools/image.js
var EDIT_ASPECT_RATIOS = [
  { label: "1:1", value: 1 },
  { label: "16:9", value: 16 / 9 },
  { label: "9:16", value: 9 / 16 },
  { label: "4:3", value: 4 / 3 },
  { label: "3:4", value: 3 / 4 },
  { label: "3:2", value: 3 / 2 },
  { label: "2:3", value: 2 / 3 },
  { label: "5:4", value: 5 / 4 },
  { label: "4:5", value: 4 / 5 },
  { label: "21:9", value: 21 / 9 }
];
function snapAspectRatio(ratio) {
  if (!ratio || ratio <= 0 || !Number.isFinite(ratio))
    return void 0;
  const distance = (value) => Math.abs(Math.log(value / ratio));
  return EDIT_ASPECT_RATIOS.reduce((best, candidate) => distance(candidate.value) < distance(best.value) ? candidate : best).label;
}
function compileSeedreamErasePrompt(boxes) {
  const serialized = boxes.map((b) => `<bbox>${b.x1} ${b.y1} ${b.x2} ${b.y2}</bbox>`).join("\u3001");
  return boxes.length === 1 ? `\u8BF7\u7F16\u8F91\u56FE1\uFF0C\u4EC5\u64E6\u9664 ${serialized} \u533A\u57DF\uFF0C\u5E76\u7528\u5468\u56F4\u73AF\u5883\u81EA\u7136\u8865\u5168\u3002\u533A\u57DF\u5916\u5185\u5BB9\u4FDD\u6301\u4E0D\u53D8\u3002` : `\u8BF7\u7F16\u8F91\u56FE1\uFF0C\u4EC5\u64E6\u9664\u4EE5\u4E0B ${boxes.length} \u4E2A\u533A\u57DF\uFF1A${serialized}\uFF0C\u5E76\u7528\u5468\u56F4\u73AF\u5883\u81EA\u7136\u8865\u5168\u3002\u8FD9\u4E9B\u533A\u57DF\u5916\u7684\u5185\u5BB9\u5168\u90E8\u4FDD\u6301\u4E0D\u53D8\uFF0C\u5305\u62EC\u533A\u57DF\u4E4B\u95F4\u7684\u90E8\u5206\u3002`;
}
var SEEDREAM_5 = {
  backend: "seedream",
  model: "doubao-seedream-5-0-pro-260628",
  pricing: "doubao-seedream-5-0-pro-260628",
  quote: (params) => ({ resolution: params.size === "1K" ? "1K" : "2K" })
};
var resolution = {
  type: "string",
  enum: ["1k", "2k", "4k"],
  description: "Output size tier."
};
var aspectRatio = {
  type: "number",
  exclusiveMinimum: 0,
  maximum: 100,
  description: "Width / height of the output canvas."
};
var coordinate = { type: "integer", minimum: 0, maximum: 1e3 };
var targetSide = { type: "integer", minimum: 1, maximum: 8192 };
var oneImage = { min: 1, max: 1, kinds: { image: 1 } };
var noPrompt = { use: "none" };
var canvasTool = {
  operation: "generate_image",
  surfaces: ["canvas"]
};
var sharedTool = {
  operation: "generate_image",
  surfaces: ["agent", "canvas"]
};
function seedreamEdit({ params }, prompt) {
  return {
    ...prompt === void 0 ? {} : { prompt },
    params: {
      size: params.resolution === "1k" ? "1K" : "2K",
      aspect_ratio: snapAspectRatio(params.aspectRatio) ?? "1:1"
    }
  };
}
var BBOX = /<bbox>\s*\d+\s+\d+\s+\d+\s+\d+\s*<\/bbox>/;
var redraw = {
  ...canvasTool,
  id: "generate_image:redraw",
  displayName: "Redraw",
  description: "Canvas inpainting: repaint the <bbox> region marked in the prompt of one image and keep the rest (Seedream 5.0 Pro); an optional second image guides the new content.",
  paramSchema: objectParams({ resolution, aspectRatio }),
  prompt: { use: "required" },
  references: { min: 1, max: 2, kinds: { image: 2 } },
  execution: fixed(SEEDREAM_5, (request) => {
    if (!BBOX.test(request.prompt))
      reject("Redraw requires the original bbox prompt");
    return seedreamEdit(request);
  })
};
var erase = {
  ...canvasTool,
  id: "generate_image:erase",
  displayName: "Erase",
  description: "Canvas erase: remove the content inside one or more boxes of one image and fill it from the surroundings (Seedream 5.0 Pro); no prompt.",
  paramSchema: objectParams({
    resolution,
    aspectRatio,
    bboxes: {
      type: "array",
      minItems: 1,
      maxItems: 100,
      items: {
        type: "object",
        properties: { x1: coordinate, y1: coordinate, x2: coordinate, y2: coordinate },
        required: ["x1", "y1", "x2", "y2"]
      },
      description: "Normalized 0..1000 boxes, x1 < x2 and y1 < y2."
    }
  }, ["bboxes"]),
  prompt: noPrompt,
  references: oneImage,
  execution: fixed(SEEDREAM_5, (request) => {
    const boxes = request.params.bboxes;
    if (boxes.some((box) => box.x1 >= box.x2 || box.y1 >= box.y2))
      reject("Invalid normalized bbox (0\u20131000)");
    return seedreamEdit(request, compileSeedreamErasePrompt(boxes));
  })
};
var outpaint = {
  ...canvasTool,
  id: "generate_image:outpaint",
  displayName: "Outpaint",
  description: "Canvas outpaint: fill the empty margin of an image the canvas already expanded to aspectRatio (Nano Banana 2); an optional second image is the untouched source, kept as lineage only.",
  paramSchema: objectParams({ resolution, aspectRatio }, ["aspectRatio"]),
  prompt: noPrompt,
  references: { min: 1, max: 2, kinds: { image: 2 } },
  execution: fixed({
    backend: "nano_banana",
    model: "nano_banana_2",
    pricing: "nano_banana_2"
  }, ({ params, media: media2 }) => ({
    params: {
      resolution: String(params.resolution ?? "2k").toUpperCase(),
      aspect_ratio: params.aspectRatio
    },
    // The source image is lineage only; the provider fills the composite.
    image_paths: media2.image.slice(0, 1)
  }))
};
var superResolution = {
  ...sharedTool,
  id: "generate_image:super_resolution",
  displayName: "Super resolution",
  description: "Upscale one image without repainting its content (MediaKit enhance), optionally to explicit target dimensions given together. Use it when only resolution or clarity should improve; a generation model would redraw the content.",
  paramSchema: objectParams({ targetWidth: targetSide, targetHeight: targetSide }),
  prompt: noPrompt,
  references: oneImage,
  execution: fixed({
    backend: "mediakit_enhance",
    model: "mediakit_enhance",
    pricing: "mediakit_enhance",
    // calculate-cost takes the base model plus this tier, not a composite ledger key.
    quote: () => ({ resolution: "professional" })
  }, ({ params }) => {
    if (params.targetWidth === void 0 !== (params.targetHeight === void 0))
      reject("Both target dimensions are required");
    return {
      params: params.targetWidth === void 0 ? {} : { target_width: params.targetWidth, target_height: params.targetHeight }
    };
  })
};
var removeBackground = {
  ...sharedTool,
  id: "generate_image:remove_background",
  displayName: "Remove background",
  description: "Cut out the salient subject of one image into a transparent-background PNG (Jimeng saliency segmentation): clean edges on hair and translucency, never repaints. Use it for stickers, logos, products and subject cutouts.",
  prompt: noPrompt,
  references: oneImage,
  paramSchema: objectParams({}),
  execution: fixed({
    backend: "jimeng_remove_bg",
    model: "jimeng_remove_background",
    pricing: "jimeng_remove_background"
  })
};
var layerDecompose = {
  ...sharedTool,
  id: "generate_image:layer_decompose",
  displayName: "Layer decompose",
  description: "Split one image into separate editable layers (Seedream layer decompose); an optional prompt steers the split. Every layer is a new Resource: the first under output key primary, the others under primary_2, primary_3, ... in the order returned, their count known only after the run. Declare primary with mode=create and a placement with a role; that placement also places every other layer with the same role. Billed per actual layer.",
  paramSchema: objectParams({}),
  prompt: { use: "optional" },
  references: oneImage,
  execution: fixed({
    backend: "seedream",
    model: "seedream-5-layer-decompose",
    pricing: "seedream-layer-decompose-small",
    variableOutputBilling: true,
    // The layer count is unknown until it runs: precheck six small images, as the cloud does.
    quote: () => ({ quantity: 6 })
  })
};
var IMAGE_TOOLS = [
  redraw,
  erase,
  outpaint,
  superResolution,
  removeBackground,
  layerDecompose
];
var dagParam = {};
var dag = (name, model, backend, displayName, description, keys, references, options = {}) => ({
  id: `generate_image:${name}`,
  operation: "generate_image",
  displayName,
  description,
  paramSchema: objectParams(Object.fromEntries(keys.map((key) => [key, dagParam]))),
  prompt: options.prompt ?? { use: "optional" },
  references: { ...references, kinds: { image: references.max } },
  // Canvas migrates the legacy template tools; Agent exposure is unchanged.
  surfaces: ["agent", "canvas"],
  execution: fixed({ backend, model, pricing: model }, ({ params, media: media2 }) => ({
    params,
    ...options.image_paths ? { image_paths: options.image_paths(media2.image) } : {}
  }))
});
var IMAGE_DAGS = [
  dag("multi_shot", "multi-shot", BACKEND_VIBE_MULTI_SHOT, "Multi-shot", "Re-render one image from a new camera angle (horizontal_angle, vertical_angle, zoom) while keeping the subject and scene.", ["horizontal_angle", "vertical_angle", "zoom"], { min: 1, max: 1 }),
  dag("storyboard", "n-storyboard", BACKEND_VIBE_STORYBOARD, "Storyboard", "Lay out a storyboard grid of shots (grid_setting, cell_ratio) from the prompt and up to four reference images.", ["grid_setting", "cell_ratio"], { min: 1, max: 4 }, { prompt: { use: "required" } }),
  dag(
    "relight",
    "relight_image_v4",
    BACKEND_VIBE_RELIGHT,
    "Relight",
    "Relight one image to match a lighting reference image (second reference), with light, background and effect settings.",
    ["light1", "light2", "light3", "background", "effect", "user_intent"],
    { min: 2, max: 2 },
    // The second image is a lighting control image, not a source image.
    { image_paths: (images) => images.slice(0, 1) }
  )
];

// ../packages/protocol/dist/project-v3/task-api.js
var PROJECT_TASK_OPERATIONS = [...PROJECT_GENERATION_OPERATIONS];
var PROJECT_SUBTITLE_FORMATS = ["ass", "srt", "vtt"];
var PROJECT_SUBTITLE_STYLE_PRESETS = [
  "social_safe",
  "minimal",
  "large",
  "top_caption",
  "custom"
];
var TERMINAL_TASK_STATUSES = ["completed", "failed", "cancelled"];
var TASK_VIEW_STATUSES = [
  "accepted",
  "running",
  "waiting_user",
  "unknown",
  ...TERMINAL_TASK_STATUSES
];
var TASK_PROGRESS_PHASES = [
  "pending",
  "queued",
  "active",
  "paused",
  "retrying",
  "stopped",
  "done"
];

// ../packages/protocol/dist/capabilities/tools/media-edit.js
var mediaEdit = {
  operation: "edit_media",
  prompt: { use: "none" },
  surfaces: ["agent"],
  execution: { mode: "sync" }
};
var ffmpeg = {
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
var mergeVideos = {
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
var transcribe = {
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
var positiveInteger = (description) => ({ type: "integer", exclusiveMinimum: 0, description });
var margin = (description) => ({ type: "integer", minimum: 0, description });
var subtitleFormat = {
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
var MEDIA_EDITS = [ffmpeg, mergeVideos, transcribe, subtitleFormat];

// ../packages/protocol/dist/project-v3/video-tools.js
var PROJECT_VIDEO_ENHANCE_RESOLUTIONS = ["720p", "1080p", "2k", "4k"];
var PROJECT_VIDEO_ENHANCE_FPS = [30, 60];
var PROJECT_VIDEO_ERASE_SUBTITLE_MODES = ["Subtitle", "Text"];
function normalizeVideoEraseSubtitleParams(value) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Erase subtitle params must be an object");
  const params = value;
  const mode = params.mode === void 0 ? "Subtitle" : params.mode;
  if (mode !== "Subtitle" && mode !== "Text")
    throw new Error("Erase subtitle mode must be Subtitle or Text");
  const regions = params.regions === void 0 ? [] : params.regions;
  if (!Array.isArray(regions))
    throw new Error("Erase subtitle regions must be an array");
  if (mode === "Subtitle" && regions.length)
    throw new Error("Subtitle mode must not carry regions");
  if (mode === "Text" && !regions.length)
    throw new Error("Text mode requires at least one region");
  const fields = ["top_left_x", "top_left_y", "bottom_right_x", "bottom_right_y"];
  const normalized = Array.from(regions, (region, index) => {
    const invalid2 = () => new Error(`regions[${index}] must contain four finite numbers satisfying 0 <= tl < br <= 1`);
    if (!region || typeof region !== "object" || Array.isArray(region))
      throw invalid2();
    const box = region;
    if (fields.some((key) => typeof box[key] !== "number" || !Number.isFinite(box[key])))
      throw invalid2();
    const { top_left_x, top_left_y, bottom_right_x, bottom_right_y } = box;
    if (!(0 <= top_left_x && top_left_x < bottom_right_x && bottom_right_x <= 1 && 0 <= top_left_y && top_left_y < bottom_right_y && bottom_right_y <= 1))
      throw invalid2();
    return { top_left_x, top_left_y, bottom_right_x, bottom_right_y };
  });
  return { mode, regions: normalized };
}

// ../packages/protocol/dist/capabilities/tools/video.js
var unit = { type: "number", minimum: 0, maximum: 1 };
var videoTool = {
  operation: "generate_video",
  prompt: { use: "none" },
  references: { min: 1, max: 1, kinds: { video: 1 } },
  surfaces: ["agent", "canvas"]
};
var enhance = {
  ...videoTool,
  id: "generate_video:enhance",
  displayName: "Enhance",
  description: "Upscale one video to a target resolution and interpolate it to a target frame rate (MediaKit); content is unchanged. Use it when only resolution or smoothness should improve; a generation model would re-create the content.",
  paramSchema: {
    type: "object",
    properties: {
      resolution: { type: "string", enum: PROJECT_VIDEO_ENHANCE_RESOLUTIONS },
      fps: { type: "number", enum: PROJECT_VIDEO_ENHANCE_FPS }
    },
    required: ["resolution", "fps"]
  },
  execution: fixed({
    backend: "mediakit_enhance_video",
    model: "mediakit-enhance-video",
    pricing: "mediakit-enhance-video",
    quote: (params) => ({ resolution: params.resolution, fps: Number(params.fps) })
  }, ({ params }) => ({
    params: {
      tool_version: "standard",
      scene: "common",
      resolution: params.resolution,
      fps: params.fps
    }
  }))
};
var h3SuperResolution = {
  ...videoTool,
  id: "generate_video:h3_super_resolution",
  displayName: "H3 Super Resolution",
  description: "Upscale one MiniMax-H3 768P generated video to native 2K using its original provider task. MiniMax-H3 generates 2K by default, so this serves its 768P results such as video-extension. Imported videos and other models are not supported.",
  paramSchema: { type: "object", properties: {} },
  execution: fixed({
    backend: "minimax_v3",
    model: "h3_video_super_resolution",
    pricing: "h3_video_super_resolution",
    quote: () => ({ resolution: "2K" })
  }, () => ({ params: { resolution: "2K" } }))
};
var eraseSubtitle = {
  ...videoTool,
  id: "generate_video:erase_subtitle",
  displayName: "Erase subtitles",
  description: "Remove burned-in subtitles from one video automatically (mode Subtitle), or any text inside given regions (mode Text).",
  paramSchema: {
    type: "object",
    properties: {
      mode: {
        type: "string",
        enum: PROJECT_VIDEO_ERASE_SUBTITLE_MODES,
        default: "Subtitle",
        description: "Subtitle erases automatically and takes no regions; Text needs regions."
      },
      regions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            top_left_x: unit,
            top_left_y: unit,
            bottom_right_x: unit,
            bottom_right_y: unit
          },
          required: ["top_left_x", "top_left_y", "bottom_right_x", "bottom_right_y"]
        },
        description: "Normalized boxes, 0 <= top_left < bottom_right <= 1."
      }
    }
  },
  execution: fixed({
    backend: "mediakit_erase_subtitle",
    model: "mediakit-erase-subtitle",
    pricing: "mediakit-erase-subtitle"
  }, ({ params }) => {
    try {
      const { mode, regions } = normalizeVideoEraseSubtitleParams(params);
      return { params: { mode, regions } };
    } catch (error) {
      reject(error.message);
    }
  })
};
var VIDEO_TOOLS = [enhance, h3SuperResolution, eraseSubtitle];

// ../packages/protocol/dist/capabilities/types.js
var CAPABILITY_OPERATIONS = [...PROJECT_GENERATION_OPERATIONS, "edit_media"];

// ../packages/protocol/dist/capabilities/registry.js
var TOOL_CAPABILITIES = [
  ...IMAGE_TOOLS,
  ...VIDEO_TOOLS,
  ...AUDIO_TOOLS,
  ...IMAGE_DAGS,
  ...MEDIA_EDITS
];

// ../packages/protocol/dist/asset-role.js
var AssetRole;
(function(AssetRole2) {
  AssetRole2["Source"] = "source";
  AssetRole2["InitImage"] = "init_image";
  AssetRole2["Style"] = "style";
  AssetRole2["Subject"] = "subject";
  AssetRole2["Mask"] = "mask";
  AssetRole2["Pose"] = "pose";
  AssetRole2["Depth"] = "depth";
  AssetRole2["AudioTrack"] = "audio_track";
  AssetRole2["Subtitle"] = "subtitle";
  AssetRole2["Frame"] = "frame";
  AssetRole2["Reference"] = "reference";
})(AssetRole || (AssetRole = {}));
var ROLE_DISPLAY_NAMES = {
  [AssetRole.Source]: "Source",
  [AssetRole.InitImage]: "Init Image",
  [AssetRole.Style]: "Style",
  [AssetRole.Subject]: "Subject",
  [AssetRole.Mask]: "Mask",
  [AssetRole.Pose]: "Pose",
  [AssetRole.Depth]: "Depth",
  [AssetRole.AudioTrack]: "Audio Track",
  [AssetRole.Subtitle]: "Subtitle",
  [AssetRole.Frame]: "Frame",
  [AssetRole.Reference]: "Reference"
};
var ROLE_DESCRIPTIONS = {
  [AssetRole.Source]: "Primary derivation input (e.g. the original image in img2img / upscale / remix).",
  [AssetRole.InitImage]: "Starting image for Stable Diffusion img2img pipelines.",
  [AssetRole.Style]: "Style reference for IP-Adapter, style transfer, or LoRA-style guidance.",
  [AssetRole.Subject]: "Subject identity reference for character / face consistency.",
  [AssetRole.Mask]: "Region mask used by inpainting / outpainting / segmentation backends.",
  [AssetRole.Pose]: "Pose reference (e.g. OpenPose ControlNet keypoints).",
  [AssetRole.Depth]: "Depth-map reference (e.g. Depth ControlNet, MiDaS output).",
  [AssetRole.AudioTrack]: "Audio track input for lip-sync, video soundtrack, or audio analysis.",
  [AssetRole.Subtitle]: "Subtitle / caption track referenced by the generated asset.",
  [AssetRole.Frame]: "Specific video frame referenced as input.",
  [AssetRole.Reference]: "Generic / catch-all reference used when a more specific role is unknown (also the role assigned by the legacy reference_images backfill migration)."
};

// ../packages/protocol/dist/canvas-tags.js
var CANVAS_TAG_COLOR_PALETTE = [
  "#0A84FF",
  "#BF5AF2",
  "#FF9F0A",
  "#5E3DF5",
  "#FF5F57",
  "#30D158",
  "#FFD60A"
];
var PRESET_COLOR_TAG_IDS = {
  red: "color:red",
  orange: "color:orange",
  yellow: "color:yellow",
  green: "color:green",
  blue: "color:blue",
  purple: "color:purple",
  deepPurple: "color:deep-purple"
};
var PRESET_COLOR_NAME_KEYS = {
  [PRESET_COLOR_TAG_IDS.red]: "canvasTags.preset.red",
  [PRESET_COLOR_TAG_IDS.orange]: "canvasTags.preset.orange",
  [PRESET_COLOR_TAG_IDS.yellow]: "canvasTags.preset.yellow",
  [PRESET_COLOR_TAG_IDS.green]: "canvasTags.preset.green",
  [PRESET_COLOR_TAG_IDS.blue]: "canvasTags.preset.blue",
  [PRESET_COLOR_TAG_IDS.purple]: "canvasTags.preset.purple",
  [PRESET_COLOR_TAG_IDS.deepPurple]: "canvasTags.preset.deepPurple"
};
var PRESET_COLOR_FALLBACK_NAMES = {
  [PRESET_COLOR_TAG_IDS.red]: ["\u4EBA\u7269", "Character"],
  [PRESET_COLOR_TAG_IDS.orange]: ["\u573A\u666F", "Scene"],
  [PRESET_COLOR_TAG_IDS.yellow]: ["\u5F85\u5B9A\u7248", "Draft"],
  [PRESET_COLOR_TAG_IDS.green]: ["\u6700\u7EC8\u7248", "Final"],
  [PRESET_COLOR_TAG_IDS.blue]: ["\u9053\u5177", "Prop"],
  [PRESET_COLOR_TAG_IDS.purple]: ["\u97F3\u8272", "Voice"],
  [PRESET_COLOR_TAG_IDS.deepPurple]: ["\u670D\u88C5", "Costume"]
};
var PRESET_COLOR_TAG_ID_BY_COLOR = {
  "#FF5F57": PRESET_COLOR_TAG_IDS.red,
  "#FF9F0A": PRESET_COLOR_TAG_IDS.orange,
  "#FFD60A": PRESET_COLOR_TAG_IDS.yellow,
  "#30D158": PRESET_COLOR_TAG_IDS.green,
  "#0A84FF": PRESET_COLOR_TAG_IDS.blue,
  "#BF5AF2": PRESET_COLOR_TAG_IDS.purple,
  "#5E3DF5": PRESET_COLOR_TAG_IDS.deepPurple
};
var PRESET_COLOR_TAGS = CANVAS_TAG_COLOR_PALETTE.map((color) => {
  const id2 = PRESET_COLOR_TAG_ID_BY_COLOR[color];
  return {
    id: id2,
    kind: "color",
    color,
    legacyNameKey: PRESET_COLOR_NAME_KEYS[id2]
  };
});
var PRESET_COLOR_TAG_ID_SET = new Set(Object.values(PRESET_COLOR_TAG_IDS));

// ../packages/protocol/dist/project-v3/clip-document.js
var CLIP_DOCUMENT_MAX_BYTES = 4 * 1024 * 1024;

// ../packages/protocol/dist/project-v3/code-project.js
var CODE_PUBLISH_MAX_FILE_BYTES = 500 * 1024 * 1024;

// ../packages/protocol/dist/project-v3/site-preview.js
var SITE_PREVIEW_CSP = [
  "default-src 'self' data: blob:",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:",
  "style-src 'self' 'unsafe-inline' data: blob:",
  "img-src 'self' data: blob:",
  "media-src 'self' data: blob:",
  "font-src 'self' data: blob:",
  "connect-src 'self' data: blob:",
  "worker-src 'self' blob:",
  "frame-src 'self' blob: data:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self' app: http://localhost:*"
].join("; ");

// ../packages/protocol/dist/project-v3/command.js
var ProjectActor;
(function(ProjectActor2) {
  ProjectActor2["HUMAN"] = "human";
  ProjectActor2["AGENT"] = "agent";
})(ProjectActor || (ProjectActor = {}));
var ProjectResourceCommandType;
(function(ProjectResourceCommandType2) {
  ProjectResourceCommandType2["CREATE"] = "resource.create";
  ProjectResourceCommandType2["UPDATE"] = "resource.update";
  ProjectResourceCommandType2["DELETE"] = "resource.delete";
  ProjectResourceCommandType2["COPY"] = "resource.copy";
})(ProjectResourceCommandType || (ProjectResourceCommandType = {}));
var ProjectResourceDeleteTarget;
(function(ProjectResourceDeleteTarget2) {
  ProjectResourceDeleteTarget2["RESOURCE"] = "resource";
  ProjectResourceDeleteTarget2["VERSION"] = "version";
})(ProjectResourceDeleteTarget || (ProjectResourceDeleteTarget = {}));
var ProjectResourceUpdateKind;
(function(ProjectResourceUpdateKind2) {
  ProjectResourceUpdateKind2["METADATA"] = "metadata";
  ProjectResourceUpdateKind2["LIFECYCLE"] = "lifecycle";
  ProjectResourceUpdateKind2["NEW_VERSION"] = "new_version";
  ProjectResourceUpdateKind2["CURRENT_VERSION"] = "current_version";
})(ProjectResourceUpdateKind || (ProjectResourceUpdateKind = {}));
var ProjectVersionDisposition;
(function(ProjectVersionDisposition2) {
  ProjectVersionDisposition2["ADOPTED"] = "adopted";
  ProjectVersionDisposition2["CANDIDATE"] = "candidate";
})(ProjectVersionDisposition || (ProjectVersionDisposition = {}));
var ProjectResourceConflictKind;
(function(ProjectResourceConflictKind2) {
  ProjectResourceConflictKind2["VERSION"] = "resource_version";
  ProjectResourceConflictKind2["METADATA_REVISION"] = "resource_metadata_revision";
})(ProjectResourceConflictKind || (ProjectResourceConflictKind = {}));

// ../packages/protocol/dist/project-v3/composition.js
var CompositionLifecycle;
(function(CompositionLifecycle2) {
  CompositionLifecycle2["ACTIVE"] = "active";
  CompositionLifecycle2["DELETED"] = "deleted";
})(CompositionLifecycle || (CompositionLifecycle = {}));
var COMPOSITION_POSITION_MAX = 1e9;
var CompositionCommandType;
(function(CompositionCommandType2) {
  CompositionCommandType2["CREATE"] = "composition.create";
  CompositionCommandType2["APPLY"] = "composition.apply";
  CompositionCommandType2["RENAME"] = "composition.rename";
  CompositionCommandType2["SET_TYPE"] = "composition.set_type";
  CompositionCommandType2["SET_ATTRIBUTES"] = "composition.set_attributes";
  CompositionCommandType2["SET_LIFECYCLE"] = "composition.set_lifecycle";
  CompositionCommandType2["RESTORE"] = "composition.restore";
  CompositionCommandType2["TYPE_REGISTER"] = "composition_type.register";
  CompositionCommandType2["TYPE_RENAME"] = "composition_type.rename";
  CompositionCommandType2["MOVE"] = "composition.move";
  CompositionCommandType2["DUPLICATE"] = "composition.duplicate";
})(CompositionCommandType || (CompositionCommandType = {}));
var CompositionOperationType;
(function(CompositionOperationType2) {
  CompositionOperationType2["MEMBER_ADD"] = "member.add";
  CompositionOperationType2["MEMBER_REMOVE"] = "member.remove";
  CompositionOperationType2["MEMBER_UPDATE"] = "member.update";
  CompositionOperationType2["MEMBER_MOVE"] = "member.move";
})(CompositionOperationType || (CompositionOperationType = {}));
var CompositionConflictKind;
(function(CompositionConflictKind2) {
  CompositionConflictKind2["REVISION"] = "composition_revision";
})(CompositionConflictKind || (CompositionConflictKind = {}));
var CompositionConflictResolution;
(function(CompositionConflictResolution2) {
  CompositionConflictResolution2["RETRY"] = "retry";
  CompositionConflictResolution2["USER_DECISION"] = "user_decision";
})(CompositionConflictResolution || (CompositionConflictResolution = {}));
var CompositionOrderField;
(function(CompositionOrderField2) {
  CompositionOrderField2["CREATED_AT"] = "createdAt";
  CompositionOrderField2["UPDATED_AT"] = "updatedAt";
  CompositionOrderField2["POSITION"] = "position";
})(CompositionOrderField || (CompositionOrderField = {}));
var CompositionOrderDirection;
(function(CompositionOrderDirection2) {
  CompositionOrderDirection2["ASC"] = "asc";
  CompositionOrderDirection2["DESC"] = "desc";
})(CompositionOrderDirection || (CompositionOrderDirection = {}));

// ../packages/protocol/dist/project-v3/http-error.js
var PROJECT_HTTP_SHARED_ERROR_MESSAGES = {
  /** Malformed transport envelope rejected before the domain saw it. */
  PROJECT_INVALID_REQUEST: "Invalid request",
  /** Unmapped or unexpected failure; details stay in the gateway log. */
  PROJECT_INTERNAL_ERROR: "Internal error"
};

// ../packages/protocol/dist/project-v3/composition-http.js
var PROJECT_COMPOSITION_HTTP_ERROR_MESSAGES = {
  PROJECT_V3_DISABLED: "Project V3 is not enabled for this workspace",
  PROJECT_ARCHITECTURE_UNSUPPORTED: "Workspace project architecture does not support composition operations",
  PROJECT_WORKSPACE_SCOPE_MISMATCH: "Request does not belong to the bound workspace",
  PROJECT_COMMAND_ID_REUSED: "Command ID was already used with a different request",
  PROJECT_INVALID_COMMAND: "Command payload is invalid",
  PROJECT_INVALID_QUERY: "Query parameters are invalid",
  PROJECT_INVALID_PATH: "File path is malformed or outside the workspace",
  PROJECT_INVALID_LIFECYCLE: "Composition lifecycle does not allow this operation",
  PROJECT_COMPOSITION_NOT_FOUND: "Composition not found",
  PROJECT_COMPOSITION_ALREADY_EXISTS: "Composition ID already exists",
  PROJECT_COMPOSITION_TYPE_NOT_FOUND: "Composition type is not registered",
  PROJECT_COMPOSITION_TYPE_ALREADY_EXISTS: "Composition type already exists",
  PROJECT_COMPOSITION_MEMBER_NOT_FOUND: "Composition member not found",
  PROJECT_COMPOSITION_MEMBER_ALREADY_EXISTS: "Composition member already exists",
  COMPOSITION_NAME_CONFLICT: "An active Composition already has this type and name",
  COMPOSITION_POSITION_CONFLICT: "Position is already used by another Composition of this type",
  COMPOSITION_PLACEMENT_INVALID: "Placement anchor is not another active Composition of the same type",
  COMPOSITION_POSITION_EXHAUSTED: "No positions left in this type",
  PROJECT_STORE_CLOSED: "Project store is closed; retry once the workspace is ready",
  PROJECT_STORE_SCHEMA_UNSUPPORTED: "Project store schema is unsupported by this build",
  ...PROJECT_HTTP_SHARED_ERROR_MESSAGES
};

// ../packages/protocol/dist/document-edit.js
var DOCUMENT_EDIT_TASK_TAG = "document_edit_task";
var DOCUMENT_EDIT_TASK_RE = new RegExp(`^<${DOCUMENT_EDIT_TASK_TAG}>\\n\\n([\\s\\S]*?)\\n\\n</${DOCUMENT_EDIT_TASK_TAG}>(?:\\n\\n([\\s\\S]*))?$`);
var PLUGIN_EDITING_CONTEXT_TAG = "plugin_editing_context";
var EDITING_CONTEXT_WRAPPER_RES = [PLUGIN_EDITING_CONTEXT_TAG].map(
  // Non-greedy body: the closing tag appears exactly once (the gateway emits
  // it before the user content), so the FIRST match is the real boundary even
  // if the user text happens to contain the literal.
  (tag) => new RegExp(`^<${tag}>\\n\\n[\\s\\S]*?\\n\\n</${tag}>(?:\\n\\n([\\s\\S]*))?$`)
);

// ../packages/protocol/dist/project-v3/document.js
var PROJECT_DOCUMENT_MAX_BYTES = 2 * 1024 * 1024;
var PROJECT_DOCUMENT_READ_MAX_LINE_CHARS = 2e3;
var PROJECT_DOCUMENT_READ_LINE_SUFFIX = `... (line truncated to ${PROJECT_DOCUMENT_READ_MAX_LINE_CHARS} chars)`;

// ../packages/protocol/dist/project-v3/editor-animation.js
var DIRECTOR_MOTION_PRESET_IDS = [
  "idle",
  "walk",
  "run",
  "jump",
  "talk",
  "wave",
  "bow",
  "cheer",
  "dance",
  "sit_talk",
  "punch",
  "death"
];
var presets = new Set(DIRECTOR_MOTION_PRESET_IDS);

// ../packages/protocol/dist/project-v3/resource-http.js
var PROJECT_RESOURCE_HTTP_ERROR_MESSAGES = {
  PROJECT_V3_DISABLED: "Project V3 is not enabled for this workspace",
  PROJECT_ARCHITECTURE_UNSUPPORTED: "Workspace project architecture does not support resource operations",
  PROJECT_WORKSPACE_SCOPE_MISMATCH: "Request does not belong to the bound workspace",
  PROJECT_COMMAND_ID_REUSED: "Command ID was already used with a different request",
  PROJECT_INVALID_COMMAND: "Command payload is invalid",
  PROJECT_INVALID_QUERY: "Query parameters are invalid",
  PROJECT_RESOURCE_ALREADY_EXISTS: "Resource ID already exists",
  PROJECT_VERSION_ALREADY_EXISTS: "Version ID already exists",
  PROJECT_VERSION_RESOURCE_MISMATCH: "Version does not belong to this resource",
  PROJECT_INVALID_VERSION: "Version payload is invalid",
  PROJECT_CURRENT_VERSION_DELETE_FORBIDDEN: "Current version cannot be deleted while it is in use",
  PROJECT_INVALID_DEPENDENCY: "Version dependencies are invalid",
  PROJECT_INVALID_PATH: "File path is malformed or outside the workspace",
  PROJECT_CONTENT_UNAVAILABLE: "Resource content is not available in the workspace",
  PROJECT_INVALID_LIFECYCLE: "Resource lifecycle does not allow this operation",
  PROJECT_RESOURCE_NOT_FOUND: "Resource not found",
  PROJECT_VERSION_NOT_FOUND: "Version not found",
  PROJECT_CURRENT_VERSION_UNAVAILABLE: "Resource has no readable current version",
  PROJECT_STORE_CLOSED: "Project store is closed; retry once the workspace is ready",
  PROJECT_COPY_ACTIVITY_UNAVAILABLE: "Copy cannot start while the workspace is busy; retry later",
  PROJECT_STORE_SCHEMA_UNSUPPORTED: "Project store schema is unsupported by this build",
  ...PROJECT_HTTP_SHARED_ERROR_MESSAGES
};

// ../packages/protocol/dist/project-v3/task-problem.js
var TASK_PROBLEM_CODES = {
  INVALID_ARGUMENT: {
    source: "input",
    recovery: "none",
    message: "Generation input was rejected before model submission; check the model parameters and reference media"
  },
  UNSUPPORTED_OPERATION: {
    source: "input",
    recovery: "none",
    message: "Model does not expose asynchronous generation for this media type"
  },
  CLIENT_UPGRADE_REQUIRED: {
    source: "input",
    recovery: "decision",
    message: "Upgrade the client before creating a new task; no subtask was submitted"
  },
  PROVIDER_REJECTED: {
    source: "provider",
    recovery: "none",
    message: "The provider rejected generation; the task is not running"
  },
  PROVIDER_UNAUTHORIZED: {
    source: "provider",
    recovery: "decision",
    message: "The provider rejected generation authorization; sign in or check model access"
  },
  PROVIDER_FAILED: {
    source: "provider",
    recovery: "retry",
    message: "Provider generation failed"
  },
  PROVIDER_CANCELLED: {
    source: "provider",
    recovery: "retry",
    message: "Provider subtask was cancelled externally"
  },
  PROVIDER_RESULT_INVALID: {
    source: "provider",
    recovery: "none",
    message: "Provider returned an unusable result; change the request and generate again"
  },
  PROVIDER_CONCURRENCY: {
    source: "provider",
    recovery: "auto",
    message: "Model concurrency exceeded before subtask creation"
  },
  PROVIDER_UNAVAILABLE: {
    source: "provider",
    recovery: "auto",
    message: "The provider did not confirm the submission; whether the generation ran is unconfirmed. It is resent with the same submission ID, so it is never charged twice"
  },
  PROVIDER_OUTCOME_UNKNOWN: {
    source: "provider",
    recovery: "retry",
    message: "The provider did not answer an operation that cannot be resent safely; whether it ran and was charged is unconfirmed. A retry runs it again and is billed again"
  },
  PROVIDER_REPAIR_UNAVAILABLE: {
    source: "provider",
    recovery: "none",
    message: "Recorded provider repair is unavailable"
  },
  PROVIDER_REPAIR_FAILED: {
    source: "provider",
    recovery: "retry",
    message: "Provider repair failed"
  },
  BILLING_CONFIRMATION_REQUIRED: {
    source: "billing",
    recovery: "decision",
    message: "Confirm the estimated cost before generation"
  },
  BILLING_INSUFFICIENT: {
    source: "billing",
    recovery: "retry",
    message: "Balance is insufficient; top up, then retry"
  },
  BILLING_UNAVAILABLE: {
    source: "billing",
    recovery: "retry",
    message: "Billing could not be checked after its automatic retries; no new subtask was submitted. Retry resumes the task in place."
  },
  BILLING_REJECTED: {
    source: "billing",
    recovery: "none",
    message: "Pricing rejected the model parameters; no new subtask will be submitted. Already-submitted subtasks are being settled."
  },
  BILLING_WAIT_EXPIRED: {
    source: "billing",
    recovery: "none",
    message: "The cost was not confirmed in time; unsubmitted subtasks were stopped"
  },
  QUOTE_EXPIRED: {
    source: "billing",
    recovery: "decision",
    message: "The cost quote expired; review the refreshed quote"
  },
  RESOURCE_VERSION_CONFLICT: {
    source: "delivery",
    recovery: "decision",
    message: "Resource delivery requires a decision"
  },
  RESOURCE_TARGET_UNAVAILABLE: {
    source: "delivery",
    recovery: "none",
    message: "The target Resource is unavailable; its outputs were not saved"
  },
  COMPOSITION_REVISION_CONFLICT: {
    source: "delivery",
    recovery: "decision",
    message: "The Composition keeps changing; choose a placement"
  },
  COMPOSITION_TARGET_UNAVAILABLE: {
    source: "delivery",
    recovery: "decision",
    message: "The Composition or member is unavailable"
  },
  DELIVERY_STEP_LIMIT: {
    source: "delivery",
    recovery: "retry",
    message: "Delivery did not settle within its step budget"
  },
  PAUSED: {
    source: "system",
    recovery: "decision",
    message: "Unsubmitted compute tasks are paused"
  },
  LOCAL_INTERRUPTED: {
    source: "system",
    recovery: "auto",
    message: "Local process ended before completion"
  },
  PROVIDER_OUTPUT_UNAVAILABLE: {
    source: "system",
    recovery: "auto",
    message: "Generation has finished, but retrieving its output failed; it is retrieved again without generating again."
  },
  MATERIALIZATION_OUTCOME_UNKNOWN: {
    source: "system",
    recovery: "auto",
    message: "Saving the outputs did not complete; it is retried without generating again"
  },
  COMPOSITION_OUTCOME_UNKNOWN: {
    source: "system",
    recovery: "auto",
    message: "Saving the outputs did not complete; it is retried without generating again"
  },
  COMMIT_OUTCOME_UNKNOWN: {
    source: "system",
    recovery: "auto",
    message: "Saving the outputs did not complete; it is retried without generating again"
  },
  /** Any kernel code the table does not declare collapses to this on the wire. */
  INTERNAL_ERROR: {
    source: "system",
    recovery: "retry",
    message: "Task could not proceed; inspect its state before retrying"
  }
};
function isTaskProblemCode(code) {
  return Object.hasOwn(TASK_PROBLEM_CODES, code);
}
function taskProblemSource(code) {
  return TASK_PROBLEM_CODES[code].source;
}

// ../packages/protocol/dist/project-v3/task-mappers.js
function invalid() {
  throw new Error("Invalid Task response");
}
function record(value) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return invalid();
  return value;
}
function shape(fields) {
  return (value) => {
    const source = record(value);
    const result = {};
    for (const key of Object.keys(fields)) {
      const parsed = fields[key](source[key]);
      if (parsed !== void 0)
        result[key] = parsed;
    }
    return result;
  };
}
var text = (v) => typeof v === "string" ? v : invalid();
var id = (v) => typeof v === "string" && v.trim() && !v.includes("\0") ? v : invalid();
var bool = (v) => typeof v === "boolean" ? v : invalid();
var number = (v) => typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : invalid();
var integer = (v) => Number.isSafeInteger(number(v)) ? v : invalid();
var revision = (v) => integer(v) >= 1 ? v : invalid();
var optional = (parse) => (v) => v === void 0 ? void 0 : parse(v);
var nullable = (parse) => (v) => v === null ? null : parse(v);
var array = (parse) => (v) => Array.isArray(v) ? v.map(parse) : invalid();
var oneOf = (values) => (v) => typeof v === "string" && values.includes(v) ? v : invalid();
var dictionary = (parse) => (v) => Object.fromEntries(Object.entries(record(v)).map(([k, item]) => [k, parse(item)]));
var json = (v) => {
  if (v === null || typeof v === "string" || typeof v === "boolean")
    return v;
  if (typeof v === "number" && Number.isFinite(v))
    return v;
  if (Array.isArray(v))
    return v.map(json);
  return dictionary(json)(v);
};
var kind = oneOf(["text", "image", "video", "audio", "file"]);
var operation = oneOf(PROJECT_TASK_OPERATIONS);
var phase = oneOf(TASK_PROGRESS_PHASES);
var reason = nullable(oneOf([
  "scheduler",
  "model_capacity",
  "local_capacity",
  "provider_concurrency",
  "provider_queued",
  "provider_submitted",
  "submitting",
  "provider_running",
  "local_processing",
  "billing",
  "identity",
  "dependency_unavailable",
  "provider_unavailable",
  "user_paused",
  "restart_paused",
  "user_stopped",
  "confirmation_expired",
  "delivery",
  "user_action",
  "dependency"
]));
var action = oneOf([
  "pause",
  "resume",
  "stop",
  "confirm_cost",
  "adopt_version",
  "finish_as_candidate",
  "update_placement",
  "finish_without_placement",
  "retry"
]);
var disposition = oneOf(["adopted", "candidate"]);
var media = shape({
  mimeType: text,
  sizeBytes: integer,
  width: optional(number),
  height: optional(number),
  durationSeconds: optional(number),
  fps: optional(number)
});
var coverage = shape({
  status: oneOf(["complete", "partial"]),
  reasons: array(oneOf(["indexing", "source_missing", "retention", "dependency_unavailable"])),
  coveredThroughMessageId: optional(nullable(id))
});
var output = shape({
  key: id,
  ordinal: optional(revision),
  name: text,
  kind,
  resourceId: id,
  versionId: id,
  disposition,
  availability: oneOf(["available", "missing", "unavailable"]),
  media: optional(media),
  voiceId: optional(id),
  // Gateway session-freshness bookkeeping; clients never act on it.
  committedState: () => void 0
});
var placement = shape({
  key: id,
  compositionId: id,
  memberId: id,
  resourceId: id,
  status: oneOf(["pending", "applied", "conflict", "skipped"]),
  appliedRevision: optional(integer)
});
var conflict = (v) => {
  switch (record(v).type) {
    case "task_revision":
      return shape({
        type: oneOf(["task_revision"]),
        taskId: id,
        expectedRevision: revision,
        actualRevision: revision
      })(v);
    case "resource_version":
      return shape({
        type: oneOf(["resource_version"]),
        resourceId: id,
        expectedVersionId: nullable(id),
        actualVersionId: nullable(id)
      })(v);
    case "composition_revision":
      return shape({
        type: oneOf(["composition_revision"]),
        compositionId: id,
        expectedRevision: integer,
        actualRevision: integer
      })(v);
    default:
      return invalid();
  }
};
var taskProblem = shape({
  key: optional(id),
  source: oneOf(["input", "provider", "billing", "delivery", "system"]),
  code: (v) => typeof v === "string" && isTaskProblemCode(v) ? v : invalid(),
  message: text,
  upstream: optional(shape({ code: id, userMessage: optional(text) })),
  conflict: optional(conflict)
});
function parseTaskProblem(value) {
  const result = taskProblem(value);
  if (result.source !== taskProblemSource(result.code))
    invalid();
  return result;
}
var parseTaskRequestError = shape({
  code: id,
  message: text,
  retryable: bool,
  conflict: optional(conflict)
});
var progress = shape({
  phase,
  reason,
  since: integer,
  queuedAt: nullable(integer),
  submittedAt: nullable(integer),
  startedAt: nullable(integer),
  percent: nullable((v) => number(v) <= 100 ? number(v) : invalid()),
  position: nullable(integer),
  etaSeconds: nullable(number),
  nextRetryAt: nullable(integer),
  retryCount: optional(integer),
  subtasks: array(shape({
    key: id,
    resource: oneOf(["model", "local"]),
    modelId: nullable(id),
    phase,
    reason,
    since: integer,
    nextRetryAt: nullable(integer),
    retryCount: optional(integer)
  }))
});
var billing = shape({
  estimatedCredits: nullable(number),
  refund: shape({
    status: oneOf(["none", "pending", "refunded", "unknown"]),
    credits: nullable(number)
  }),
  confirmation: nullable(shape({
    id,
    kind: oneOf(["threshold", "insufficient"]),
    estimatedCredits: number,
    expiresAt: integer,
    thresholdCredits: nullable(number),
    currentCredits: nullable(number),
    shortfallCredits: nullable(number),
    batch: nullable(shape({ credits: number, taskIds: array(id) }))
  }))
});
var origin = shape({
  source: oneOf(["frontend", "agent"]),
  sessionId: optional(id),
  userMessageId: optional(id),
  chatTurnId: optional(id),
  toolUseId: optional(id),
  callIndex: optional(integer)
});
var task = shape({
  id,
  capabilityId: id,
  compositionId: optional(id),
  prompt: optional(text),
  aspectRatio: optional(text),
  artifacts: optional(array(shape({ key: id, id, kind }))),
  operation,
  status: oneOf(TASK_VIEW_STATUSES),
  terminal: bool,
  stage: oneOf(["compute", "materialize", "resource", "composition"]),
  revision,
  createdAt: integer,
  updatedAt: integer,
  origin,
  outputs: array(output),
  placements: array(placement),
  data: json,
  problem: nullable(parseTaskProblem),
  actions: array(action),
  handoff: nullable(shape({ target: oneOf(["canvas"]), at: integer, chatTurnId: optional(id) })),
  progress,
  billing: nullable(billing)
});
function parseTaskView(value) {
  const result = task(value);
  if (result.terminal !== TERMINAL_TASK_STATUSES.includes(result.status))
    invalid();
  if (result.terminal && result.actions.some((item) => item !== "retry"))
    invalid();
  return result;
}
var resourceTarget = (v) => record(v).mode === "create" ? shape({
  key: id,
  mode: oneOf(["create"]),
  name: text,
  description: optional(text),
  resourceId: optional(id)
})(v) : shape({
  key: id,
  mode: oneOf(["new_version"]),
  resourceId: id,
  baseVersionId: optional(id),
  disposition: optional(disposition)
})(v);
var placementTarget = (v) => record(v).memberId === void 0 ? shape({ key: id, role: text })(v) : shape({ key: id, memberId: id })(v); // 4.0.3: 去掉 replaceResourceId
var compositionPlacement = (v) => {
  const value = record(v);
  const keys = Object.keys(value);
  if (keys.length !== 1)
    return invalid();
  if (keys[0] === "after")
    return { after: id(value.after) };
  if (keys[0] === "before")
    return { before: id(value.before) };
  return invalid();
};
var compositionPosition = (v) => integer(v) <= COMPOSITION_POSITION_MAX ? v : invalid();
var composition = (v) => {
  const value = record(v);
  if (value.compositionId !== void 0)
    return shape({ compositionId: id, placements: array(placementTarget) })(v);
  if (value.position !== void 0 && value.placement !== void 0)
    return invalid();
  return shape({
    type: (v2) => {
      const type = record(v2);
      return type.id === void 0 ? shape({ label: id, description: optional(text) })(v2) : shape({ id, label: optional(text), description: optional(text) })(v2);
    },
    name: text,
    attributes: optional(dictionary(text)),
    position: optional(compositionPosition),
    placement: optional(compositionPlacement),
    placements: array(placementTarget)
  })(v);
};
var parseTaskRead = shape({
  task: parseTaskView,
  serverTaskIds: optional(array(id)),
  // The decoder already narrows references to the recorded form: admission
  // resolved every selector before the Task was written. `null` is a slot the
  // request left open on purpose (a video given only its last frame).
  input: shape({
    prompt: optional(text),
    params: optional(dictionary(json)),
    references: optional(array(nullable(shape({ versionId: id, resourceId: optional(id) })))),
    // The range belongs to the field, not to whoever happens to read it.
    count: optional((v) => integer(v) >= 1 && integer(v) <= PROJECT_GENERATION_MAX_COUNT ? integer(v) : invalid())
  }),
  output: shape({
    nameSource: optional(oneOf(["provider"])),
    resources: array(resourceTarget),
    composition: optional(composition)
  })
});
var parseTaskSubmitResult = shape({ task: parseTaskView, reused: bool });
var parseTaskResolveResult = shape({ task: parseTaskView });
var parseTaskList = shape({
  items: array(parseTaskView),
  nextCursor: nullable(id),
  coverage
});
var counts = shape({
  pending: integer,
  queued: integer,
  active: integer,
  paused: integer,
  waitingUser: integer,
  reconciling: integer
});
var parseTaskQueue = shape({
  tasks: counts,
  subtasks: array(shape({ resource: oneOf(["model", "local"]), modelId: nullable(id), counts })),
  concurrency: array(shape({
    modelId: id,
    limit: nullable(integer),
    cloudUsed: nullable(integer),
    localHeld: nullable(integer),
    observedAt: nullable(integer)
  })),
  updatedAt: integer,
  coverage
});

// ../packages/host-contract/dist/resource-frame.js
var PROJECT_RESOURCE_FRAME_BOOTSTRAP = "hilo:project-resource:bootstrap";
var PROJECT_RESOURCE_FRAME_REQUEST_LIMIT = 1024 * 1024;
var PROJECT_RESOURCE_FRAME_RESPONSE_LIMIT = 30 * 1024 * 1024;

// src/preload/v3-workbench/index.ts
var CONNECT_TIMEOUT_MS = 1e4;
var delivered;
var pending;
var claimed = false;
var retired = false;
var closePort;
function bind() {
  if (!delivered || !pending || retired) return;
  const { bootstrap, port } = delivered;
  const waiting = pending;
  pending = void 0;
  clearTimeout(waiting.timer);
  let active = true;
  const receive = (event) => {
    if (active) waiting.onMessage(event.data);
  };
  const closed = () => {
    if (active) {
      waiting.onMessage({ type: "closed" });
      close();
    }
  };
  function close() {
    if (!active) return;
    active = false;
    port.removeEventListener("message", receive);
    port.removeEventListener("close", closed);
    port.close();
  }
  port.addEventListener("message", receive);
  port.addEventListener("close", closed);
  closePort = close;
  waiting.resolve({
    bootstrap,
    postMessage(message) {
      if (active && !retired) port.postMessage(message);
    },
    start() {
      if (active && !retired) port.start();
    },
    close
  });
}
var bridge = {
  version: 2,
  connect(onMessage) {
    if (claimed || retired || typeof onMessage !== "function")
      return Promise.reject(new Error("Native port unavailable"));
    claimed = true;
    return new Promise((resolve, reject2) => {
      const timer = setTimeout(() => {
        retired = true;
        pending = void 0;
        delivered?.port.close();
        reject2(new Error("Native host unavailable"));
      }, CONNECT_TIMEOUT_MS);
      pending = { onMessage, resolve, reject: reject2, timer };
      bind();
    });
  }
};
import_electron.contextBridge.exposeInMainWorld("__HILO_V3_PORT_HOST__", bridge);
var receivePort = (event, bootstrap) => {
  if (retired || delivered || event.ports.length !== 1) {
    for (const port of event.ports) port.close();
    return;
  }
  delivered = { bootstrap, port: event.ports[0] };
  bind();
};
import_electron.ipcRenderer.on(PROJECT_RESOURCE_FRAME_BOOTSTRAP, receivePort);
window.addEventListener(
  "pagehide",
  () => {
    retired = true;
    closePort?.();
    delivered?.port.close();
    if (pending) {
      clearTimeout(pending.timer);
      pending.reject(new Error("Native document retired"));
      pending = void 0;
    }
    import_electron.ipcRenderer.removeListener(PROJECT_RESOURCE_FRAME_BOOTSTRAP, receivePort);
  },
  { once: true }
);
