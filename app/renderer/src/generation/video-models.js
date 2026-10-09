// video-models.js
import {
  BACKEND_KLING_AVATAR,
  BACKEND_MINIMAX_V3,
  MINIMAX_H3_TEXT_ONLY_DEFAULT_RATIO,
} from "./normalize-skill-detail-metadata.js";

const BACKEND_KLING = "kling";

const BACKEND_VEO3 = "veo3";

const BACKEND_WAN_I2V = "wan_i2v";

const BACKEND_SEEDANCE = "seedance";

const HAILUO03_VIDEO_MODEL = {
  id: "MiniMax-H3",
  name: "MiniMax H3",
  seriesId: "MiniMax",
  backend: BACKEND_MINIMAX_V3,
  model_name: "MiniMax-H3",
  pricingId: "MiniMax-H3",
  max_refs: 9,
  max_video_refs: 3,
  max_audio_refs: 3,
  max_video_audio_refs: 3,
  supportsLastFrameOnly: true,
  promptMaxLength: 7e3,
  inputMediaLimits: {
    imageMinWidth: 256,
    imageMinHeight: 256,
    imageMaxWidth: 5760,
    imageMaxHeight: 5760,
    imageMinAspectRatio: 2 / 5,
    imageMaxAspectRatio: 5 / 2,
  },
  params: {
    image_mode: {
      type: "select",
      label: "生成方式",
      options: ["reference", "first-last-frame", "video-extension"],
      default: "reference",
    },
    duration: {
      type: "select",
      label: "时长",
      options: [
        "4",
        "5",
        "6",
        "7",
        "8",
        "9",
        "10",
        "11",
        "12",
        "13",
        "14",
        "15",
      ],
      default: "5",
    },
    aspect_ratio: {
      type: "select",
      label: "宽高比",
      options: [
        "adaptive",
        MINIMAX_H3_TEXT_ONLY_DEFAULT_RATIO,
        "4:3",
        "1:1",
        "3:4",
        "9:16",
        "21:9",
      ],
      default: "adaptive",
    },
    resolution: {
      type: "select",
      label: "分辨率",
      options: ["768P", "2K"],
      default: "2K",
    },
    generate_audio: {
      type: "select",
      label: "有声视频",
      options: ["true", "false"],
      default: "true",
    },
  },
  // 首尾帧模式上游只支持自适应比例（其余比例上游会忽略 / 报错）；视频续写
  // 仍走 768P 专用链路。popover 侧直接隐藏对应模式不支持的选项。
  paramConstraints: [
    {
      if: {
        param: "image_mode",
        eq: "first-last-frame",
      },
      disable: {
        param: "aspect_ratio",
        options: ["16:9", "4:3", "1:1", "3:4", "9:16", "21:9"],
      },
    },
    {
      if: {
        param: "image_mode",
        eq: "video-extension",
      },
      disable: {
        param: "resolution",
        options: ["2K"],
      },
    },
  ],
  videoExtension: {
    inputMinDurationSec: 2,
    inputMaxDurationSec: 15,
    outputMinDurationSec: 5,
    outputMaxDurationSec: 20,
  },
};

const MINIMAX_H3_MAX_VIDEO_MODEL = {
  id: "MiniMax-H3-Max",
  name: "MiniMax H3 Max",
  seriesId: "MiniMax",
  backend: BACKEND_MINIMAX_V3,
  model_name: "MiniMax-H3-Max",
  pricingId: "MiniMax-H3-Max",
  max_refs: 9,
  max_video_refs: 3,
  max_audio_refs: 3,
  max_video_audio_refs: 3,
  promptRequired: true,
  supportsLastFrameOnly: false,
  hiddenParamsByImageMode: {
    "first-last-frame": ["aspect_ratio"],
  },
  referenceMediaLimits: {
    video: {
      minDurationSec: 2,
      maxDurationSec: 15,
      totalMaxDurationSec: 15,
    },
    audio: {
      minDurationSec: 2,
      maxDurationSec: 15,
      totalMaxDurationSec: 15,
      allowStandalone: false,
    },
  },
  params: {
    image_mode: {
      type: "select",
      label: "canvas.params.imageMode",
      options: ["reference", "first-last-frame", "text-to-video"],
      default: "reference",
    },
    aspect_ratio: {
      type: "select",
      label: "canvas.params.ratio",
      options: ["adaptive", "16:9", "4:3", "1:1", "3:4", "9:16", "21:9"],
      default: "adaptive",
    },
    resolution: {
      type: "select",
      label: "canvas.params.resolution",
      options: ["768P", "480P"],
      default: "768P",
    },
    duration: {
      type: "select",
      label: "canvas.params.duration",
      options: ["5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15"],
      default: "5",
    },
    prompt_expansion_mode: {
      type: "select",
      label: "canvas.params.promptExpansion",
      options: ["disabled", "balanced", "quality"],
      default: "balanced",
    },
  },
  // 上游只在比例能从参考素材推导时接受 adaptive（i2va / r2va）；纯文本生成
  // （t2va）必须给固定比例。首尾帧比例整体隐藏，见 hiddenParamsByImageMode。
  paramConstraints: [
    {
      if: {
        param: "image_mode",
        eq: "text-to-video",
      },
      disable: {
        param: "aspect_ratio",
        options: ["adaptive"],
      },
    },
  ],
};

const MINIMAX_H3_MAX_TURBO_VIDEO_MODEL = {
  ...MINIMAX_H3_MAX_VIDEO_MODEL,
  id: "MiniMax-H3-Max-Turbo",
  name: "MiniMax H3 Max Turbo",
  model_name: "MiniMax-H3-Max-Turbo",
  pricingId: "MiniMax-H3-Max-Turbo",
  max_refs: 2,
  max_video_refs: void 0,
  max_audio_refs: void 0,
  max_video_audio_refs: void 0,
  referenceMediaLimits: void 0,
  params: {
    ...MINIMAX_H3_MAX_VIDEO_MODEL.params,
    image_mode: {
      ...MINIMAX_H3_MAX_VIDEO_MODEL.params.image_mode,
      options: ["first-last-frame", "text-to-video"],
      default: "text-to-video",
    },
    aspect_ratio: {
      ...MINIMAX_H3_MAX_VIDEO_MODEL.params.aspect_ratio,
      options: ["21:9", "16:9", "4:3", "1:1", "3:4", "9:16"],
      default: "16:9",
    },
  },
};

const WAN3_MAX_REFERENCE_IMAGES = 10;

const WAN3_MAX_REFERENCE_VIDEOS = 5;

const WAN3_MAX_REFERENCE_AUDIOS = 5;

const WAN3_PROMPT_MAX_LENGTH = 2e4;

const WAN3_REFERENCE_MEDIA_LIMITS = {
  video: {
    minDurationSec: 1,
    maxDurationSec: 15,
    totalMaxDurationSec: 15,
    combinedWithOutputMaxDurationSec: 30,
  },
  audio: {
    minDurationSec: 1,
    maxDurationSec: 15,
    totalMaxDurationSec: 15,
    allowStandalone: true,
  },
};

const WAN3_DURATION_OPTIONS = Array.from(
  {
    length: 29,
  },
  (_2, index2) => String(index2 + 2),
);

function wan3Params() {
  return {
    // 只暴露全能参考与首尾帧两种。视频编辑 / 视频延长 不单独开模式：
    // 在 reference 下放参考视频 + prompt 里写编辑或延长意图，上游自行识别，
    // 能力并没有少。文件参考（file）也归在 reference 里。
    image_mode: {
      type: "select",
      label: "生成方式",
      options: ["reference", "first-last-frame"],
      default: "reference",
    },
    duration: {
      type: "select",
      label: "时长",
      options: WAN3_DURATION_OPTIONS,
      default: "5",
    },
    aspect_ratio: {
      type: "select",
      label: "宽高比",
      options: ["adaptive", "16:9", "4:3", "1:1", "3:4", "9:16"],
      default: "adaptive",
    },
    resolution: {
      type: "select",
      label: "分辨率",
      options: ["480P", "720P", "1080P"],
      default: "1080P",
    },
    generate_audio: {
      type: "select",
      label: "有声视频",
      options: ["true", "false"],
      default: "true",
    },
  };
}

export const VIDEO_MODELS = [
  HAILUO03_VIDEO_MODEL,
  MINIMAX_H3_MAX_VIDEO_MODEL,
  MINIMAX_H3_MAX_TURBO_VIDEO_MODEL,
  // Seedance series
  {
    id: "seedance2.0",
    name: "Seedance 2.0",
    seriesId: "seedance",
    backend: BACKEND_SEEDANCE,
    model_name: "seedance2.0",
    max_refs: 9,
    max_video_refs: 3,
    max_audio_refs: 3,
    promptRequired: true,
    params: {
      image_mode: {
        type: "select",
        label: "生成方式",
        options: ["reference", "first-last-frame"],
        default: "reference",
      },
      duration: {
        type: "select",
        label: "时长",
        options: [
          "4",
          "5",
          "6",
          "7",
          "8",
          "9",
          "10",
          "11",
          "12",
          "13",
          "14",
          "15",
        ],
        default: "5",
      },
      aspect_ratio: {
        type: "select",
        label: "宽高比",
        options: ["adaptive", "16:9", "4:3", "1:1", "3:4", "9:16", "21:9"],
        default: "adaptive",
      },
      resolution: {
        type: "select",
        label: "分辨率",
        options: ["480p", "720p", "1080p", "4k"],
        default: "720p",
      },
      generate_audio: {
        type: "select",
        label: "有声视频",
        options: ["true", "false"],
        default: "true",
      },
    },
  },
  {
    id: "seedance2.0-fast",
    name: "Seedance 2.0 Fast",
    seriesId: "seedance",
    backend: BACKEND_SEEDANCE,
    model_name: "seedance2.0-fast",
    max_refs: 9,
    max_video_refs: 3,
    max_audio_refs: 3,
    promptRequired: true,
    params: {
      image_mode: {
        type: "select",
        label: "生成方式",
        options: ["reference", "first-last-frame"],
        default: "reference",
      },
      duration: {
        type: "select",
        label: "时长",
        options: [
          "4",
          "5",
          "6",
          "7",
          "8",
          "9",
          "10",
          "11",
          "12",
          "13",
          "14",
          "15",
        ],
        default: "5",
      },
      aspect_ratio: {
        type: "select",
        label: "宽高比",
        options: ["adaptive", "16:9", "4:3", "1:1", "3:4", "9:16", "21:9"],
        default: "adaptive",
      },
      resolution: {
        type: "select",
        label: "分辨率",
        options: ["480p", "720p"],
        default: "720p",
      },
      generate_audio: {
        type: "select",
        label: "有声视频",
        options: ["true", "false"],
        default: "true",
      },
    },
  },
  {
    id: "seedance2.0-mini",
    name: "Seedance 2.0 Mini",
    seriesId: "seedance",
    backend: BACKEND_SEEDANCE,
    model_name: "seedance2.0-mini",
    max_refs: 9,
    max_video_refs: 3,
    max_audio_refs: 3,
    promptRequired: true,
    params: {
      image_mode: {
        type: "select",
        label: "生成方式",
        options: ["reference", "first-last-frame"],
        default: "reference",
      },
      duration: {
        type: "select",
        label: "时长",
        options: [
          "4",
          "5",
          "6",
          "7",
          "8",
          "9",
          "10",
          "11",
          "12",
          "13",
          "14",
          "15",
        ],
        default: "5",
      },
      aspect_ratio: {
        type: "select",
        label: "宽高比",
        options: ["adaptive", "16:9", "4:3", "1:1", "3:4", "9:16", "21:9"],
        default: "adaptive",
      },
      resolution: {
        type: "select",
        label: "分辨率",
        options: ["480p", "720p"],
        default: "720p",
      },
      generate_audio: {
        type: "select",
        label: "有声视频",
        options: ["true", "false"],
        default: "true",
      },
    },
  },
  {
    id: "seedance2.5",
    name: "Seedance 2.5",
    seriesId: "seedance",
    backend: BACKEND_SEEDANCE,
    model_name: "seedance2.5",
    max_refs: 30,
    max_video_refs: 10,
    max_audio_refs: 10,
    promptRequired: true,
    referenceMediaLimits: {
      video: {
        minDurationSec: 2,
        maxDurationSec: 30,
        totalMaxDurationSec: 30,
      },
      audio: {
        minDurationSec: 2,
        maxDurationSec: 30,
        totalMaxDurationSec: 30,
        allowStandalone: true,
      },
    },
    params: {
      image_mode: {
        type: "select",
        label: "生成方式",
        options: [
          "reference",
          "first-last-frame",
          "video-edit",
          "video-extend",
        ],
        default: "reference",
      },
      duration: {
        type: "select",
        label: "时长",
        options: Array.from(
          {
            length: 27,
          },
          (_2, index2) => String(index2 + 4),
        ),
        default: "5",
      },
      aspect_ratio: {
        type: "select",
        label: "宽高比",
        options: ["adaptive", "16:9", "4:3", "1:1", "3:4", "9:16", "21:9"],
        default: "adaptive",
      },
      resolution: {
        type: "select",
        label: "分辨率",
        options: ["480p", "720p", "1080p"],
        default: "720p",
      },
      output_format: {
        type: "select",
        label: "输出格式",
        options: ["mp4", "mov"],
        default: "mp4",
      },
      generate_audio: {
        type: "select",
        label: "有声视频",
        options: ["true", "false"],
        default: "true",
      },
    },
  },
  // Kling 3.0 Omni video (multi-shot + image/video references).
  {
    id: "kling-v3-omni-video",
    name: "Kling 3.0 Omni",
    seriesId: "kling",
    backend: BACKEND_KLING,
    model_name: "kling-v3-omni",
    pricingId: "kling-v3-omni",
    max_refs: 7,
    max_video_refs: 1,
    promptMaxLength: 2500,
    params: {
      mode: {
        type: "select",
        label: "清晰度",
        options: ["std", "pro", "4k"],
        default: "pro",
      },
      aspect_ratio: {
        type: "select",
        label: "比例",
        options: ["16:9", "9:16", "1:1"],
        default: "16:9",
      },
      duration: {
        type: "select",
        label: "时长(秒)",
        options: [
          "3",
          "4",
          "5",
          "6",
          "7",
          "8",
          "9",
          "10",
          "11",
          "12",
          "13",
          "14",
          "15",
        ],
        default: "5",
      },
      sound: {
        type: "select",
        label: "声音",
        options: ["on", "off"],
        default: "off",
      },
    },
  },
  {
    id: "kling-avatar",
    name: "Kling Avatar",
    seriesId: "kling",
    backend: BACKEND_KLING_AVATAR,
    model_name: "kling-avatar",
    pricingId: "kling-avatar",
    max_refs: 1,
    referenceImageRequired: true,
    max_audio_refs: 1,
    params: {
      image_mode: {
        type: "select",
        label: "生成方式",
        options: ["reference"],
        default: "reference",
      },
      mode: {
        type: "select",
        label: "清晰度",
        options: ["std", "pro"],
        default: "std",
      },
      type: {
        type: "select",
        label: "类型",
        options: ["avatar"],
        default: "avatar",
      },
    },
  },
  // Wan 2.6 已下线：Apollo 不再下发这一行，且 wan_i2v backend 现在路由到 Wan 3.0，
  // 真去生成会被云网关的 wan3 型号白名单拒掉。条目本身不能删 —— 历史用 2.6
  // 生成的资产还要靠它查显示名（见 ModelInfo.hideInModelPicker 的说明），
  // 所以只把它从选择面里藏起来。
  {
    id: "wan2.6-i2v",
    name: "Wan 2.6",
    seriesId: "wan",
    backend: BACKEND_WAN_I2V,
    model_name: "wan2.6-i2v",
    hideInModelPicker: true,
    max_refs: 1,
    referenceImageRequired: true,
    max_audio_refs: 1,
    promptMaxLength: 1500,
    params: {
      duration: {
        type: "select",
        label: "时长",
        options: ["5", "10", "15"],
        default: "5",
      },
      resolution: {
        type: "select",
        label: "分辨率",
        options: ["720P", "1080P"],
        default: "1080P",
      },
      shot_type: {
        type: "select",
        label: "镜头类型",
        options: ["single", "multi"],
        default: "single",
      },
    },
  },
  // Wan 3.0 — All-in-One 全能参考视频。文生 / 首帧(+尾帧) / 参考生 / 视频编辑 /
  // 视频延长共用同一上游入口，由素材组合决定模式。image_mode 只暴露 reference 与
  // first-last-frame 两档：编辑和延长靠 reference + 参考视频 + prompt 意图达成，
  // 不需要单独的模式档。
  // backend 复用 wan_i2v（见 backend-ids.ts 的说明）：新增 backend id 会让存量
  // 客户端整份 catalog 解析失败。本地 gateway 按 model_id 选实现。
  // 上游强互斥：首尾帧素材与参考素材（图 / 视频 / 音频 / 文件）不能混用，
  // 云网关 ValidateWan3Input 会在提交期拦掉非法组合。
  {
    id: "wan3.0-video",
    name: "Wan 3.0",
    seriesId: "wan",
    backend: BACKEND_WAN_I2V,
    model_name: "wan3.0-video",
    max_refs: WAN3_MAX_REFERENCE_IMAGES,
    max_video_refs: WAN3_MAX_REFERENCE_VIDEOS,
    max_audio_refs: WAN3_MAX_REFERENCE_AUDIOS,
    promptMaxLength: WAN3_PROMPT_MAX_LENGTH,
    referenceMediaLimits: WAN3_REFERENCE_MEDIA_LIMITS,
    params: wan3Params(),
  },
  {
    id: "wan3.0-video-prime",
    name: "Wan 3.0 Prime",
    seriesId: "wan",
    backend: BACKEND_WAN_I2V,
    model_name: "wan3.0-video-prime",
    max_refs: WAN3_MAX_REFERENCE_IMAGES,
    max_video_refs: WAN3_MAX_REFERENCE_VIDEOS,
    max_audio_refs: WAN3_MAX_REFERENCE_AUDIOS,
    promptMaxLength: WAN3_PROMPT_MAX_LENGTH,
    referenceMediaLimits: WAN3_REFERENCE_MEDIA_LIMITS,
    params: wan3Params(),
  },
  // Veo3.1 Fast — domestic registration (Beta branding)
  {
    id: "beta-3-1-fast",
    name: "Beta Fast",
    seriesId: "beta",
    publicToken: "beta_fast",
    region: "domestic",
    backend: BACKEND_VEO3,
    model_name: "veo-3.1-fast-generate-001",
    max_refs: 1,
    promptRequired: true,
    params: {
      image_mode: {
        type: "select",
        label: "生成方式",
        options: ["first-last-frame"],
        default: "first-last-frame",
      },
      duration: {
        type: "select",
        label: "时长",
        options: ["8"],
        default: "8",
      },
      aspect_ratio: {
        type: "select",
        label: "比例",
        options: ["16:9", "9:16"],
        default: "16:9",
      },
      resolution: {
        type: "select",
        label: "分辨率",
        options: ["720p", "1080p"],
        default: "720p",
      },
    },
  },
  // Veo3.1 — domestic registration (Beta branding)
  {
    id: "beta-3-1",
    name: "Beta Pro",
    seriesId: "beta",
    publicToken: "beta_pro",
    region: "domestic",
    backend: BACKEND_VEO3,
    model_name: "veo-3.1-generate-001",
    max_refs: 1,
    promptRequired: true,
    params: {
      image_mode: {
        type: "select",
        label: "生成方式",
        options: ["first-last-frame"],
        default: "first-last-frame",
      },
      duration: {
        type: "select",
        label: "时长",
        options: ["8"],
        default: "8",
      },
      aspect_ratio: {
        type: "select",
        label: "比例",
        options: ["16:9", "9:16"],
        default: "16:9",
      },
      resolution: {
        type: "select",
        label: "分辨率",
        options: ["720p", "1080p"],
        default: "720p",
      },
    },
  },
  // Veo3.1 Fast — overseas registration (Veo3.1 branding)
  {
    id: "veo-3.1-fast-generate-001",
    name: "Veo3.1 Fast",
    seriesId: "veo3",
    region: "overseas",
    backend: BACKEND_VEO3,
    model_name: "veo-3.1-fast-generate-001",
    max_refs: 1,
    promptRequired: true,
    params: {
      duration: {
        type: "select",
        label: "时长",
        options: ["8"],
        default: "8",
      },
      aspect_ratio: {
        type: "select",
        label: "比例",
        options: ["16:9", "9:16"],
        default: "16:9",
      },
      resolution: {
        type: "select",
        label: "分辨率",
        options: ["720p", "1080p"],
        default: "720p",
      },
    },
  },
  // Veo3.1 — overseas registration (Veo3.1 branding)
  {
    id: "veo-3.1-generate-001",
    name: "Veo3.1",
    seriesId: "veo3",
    region: "overseas",
    backend: BACKEND_VEO3,
    model_name: "veo-3.1-generate-001",
    max_refs: 1,
    promptRequired: true,
    params: {
      duration: {
        type: "select",
        label: "时长",
        options: ["8"],
        default: "8",
      },
      aspect_ratio: {
        type: "select",
        label: "比例",
        options: ["16:9", "9:16"],
        default: "16:9",
      },
      resolution: {
        type: "select",
        label: "分辨率",
        options: ["720p", "1080p"],
        default: "720p",
      },
    },
  },
];
