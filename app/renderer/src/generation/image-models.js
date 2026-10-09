// image-models.js
import { BACKEND_MIDJOURNEY } from "./normalize-skill-detail-metadata.js";

const BACKEND_NANO_BANANA = "nano_banana";

const BACKEND_OPENAI = "openai";

const BACKEND_SEEDREAM = "seedream";

const ASPECT_RATIOS_FULL = [
  "auto",
  "1:1",
  "16:9",
  "9:16",
  "3:4",
  "4:3",
  "3:2",
  "2:3",
  "5:4",
  "4:5",
  "21:9",
];

const IMAGE_GENERATION_ESTIMATE_SECONDS = 180;

function gptImage25Params() {
  return {
    resolution: {
      type: "select",
      label: "分辨率",
      options: ["1k", "2k", "4k"],
      default: "1k",
    },
    aspect_ratio: {
      type: "select",
      label: "比例",
      options: [
        "1:1",
        "16:9",
        "9:16",
        "3:4",
        "4:3",
        "3:2",
        "2:3",
        "5:4",
        "4:5",
        "21:9",
        "2:1",
        "1:2",
        "3:1",
        "1:3",
      ],
      default: "1:1",
    },
    quality: {
      type: "select",
      label: "画质",
      options: ["low", "medium", "high", "xhigh", "max"],
      default: "medium",
    },
    // background 只在 2.5 暴露：云网关 normalizeOpenAIBackground 会把其他 GPT Image
    // 模型上的 transparent / opaque 归一化回 auto。transparent 时由云网关自行补
    // output_format=png，前端不需要（也不应该）声明这个参数。
    background: {
      type: "select",
      label: "背景",
      options: ["auto", "transparent", "opaque"],
      default: "auto",
    },
  };
}

export const IMAGE_MODELS = [
  // NanoBanana series — domestic registration (General Image branding)
  {
    id: "banana-2",
    name: "General Image 2",
    seriesId: "banana",
    publicToken: "banana_2",
    region: "domestic",
    backend: BACKEND_NANO_BANANA,
    model_name: "nano_banana_2_flash",
    //backend model name
    estimatedGenerationSeconds: IMAGE_GENERATION_ESTIMATE_SECONDS,
    max_refs: 10,
    params: {
      image_mode: {
        type: "select",
        label: "生成方式",
        options: ["reference"],
        default: "reference",
      },
      aspect_ratio: {
        type: "select",
        label: "比例",
        options: ASPECT_RATIOS_FULL,
        default: "auto",
      },
      resolution: {
        type: "select",
        label: "分辨率",
        options: ["auto", "1K", "2K", "4K"],
        default: "auto",
      },
    },
  },
  {
    id: "banana-pro",
    name: "General Image Pro",
    seriesId: "banana",
    publicToken: "banana_pro",
    region: "domestic",
    backend: BACKEND_NANO_BANANA,
    model_name: "nano_banana_2",
    estimatedGenerationSeconds: IMAGE_GENERATION_ESTIMATE_SECONDS,
    max_refs: 10,
    params: {
      image_mode: {
        type: "select",
        label: "生成方式",
        options: ["reference"],
        default: "reference",
      },
      aspect_ratio: {
        type: "select",
        label: "比例",
        options: ASPECT_RATIOS_FULL,
        default: "auto",
      },
      resolution: {
        type: "select",
        label: "分辨率",
        options: ["auto", "1K", "2K", "4K"],
        default: "auto",
      },
    },
  },
  // NanoBanana series — overseas registration (NanoBanana branding)
  {
    id: "nano_banana_2_flash",
    name: "NanoBanana 2",
    seriesId: "nano-banana",
    region: "overseas",
    backend: BACKEND_NANO_BANANA,
    model_name: "nano_banana_2_flash",
    estimatedGenerationSeconds: IMAGE_GENERATION_ESTIMATE_SECONDS,
    max_refs: 10,
    params: {
      aspect_ratio: {
        type: "select",
        label: "比例",
        options: ASPECT_RATIOS_FULL,
        default: "auto",
      },
      resolution: {
        type: "select",
        label: "分辨率",
        options: ["auto", "1K", "2K", "4K"],
        default: "auto",
      },
    },
  },
  {
    id: "nano_banana_2",
    name: "NanoBanana Pro",
    seriesId: "nano-banana",
    region: "overseas",
    backend: BACKEND_NANO_BANANA,
    model_name: "nano_banana_2",
    estimatedGenerationSeconds: IMAGE_GENERATION_ESTIMATE_SECONDS,
    max_refs: 10,
    params: {
      aspect_ratio: {
        type: "select",
        label: "比例",
        options: ASPECT_RATIOS_FULL,
        default: "auto",
      },
      resolution: {
        type: "select",
        label: "分辨率",
        options: ["auto", "1K", "2K", "4K"],
        default: "auto",
      },
    },
  },
  // Seedream
  // max_refs 严格对齐官方文档上限 ≤10（4.5/4.0 多图融合），早期 registry
  // 写 14 会被上游静默截断或返回 4xx；详见画布模型参数对接 Diff 报告 §2.2
  // (2026-06-07)。如需放宽请先与上游确认。
  {
    id: "doubao-seedream-5-0-pro-260628",
    name: "Seedream 5.0 Pro",
    seriesId: "seedream",
    backend: BACKEND_SEEDREAM,
    model_name: "doubao-seedream-5-0-pro-260628",
    estimatedGenerationSeconds: IMAGE_GENERATION_ESTIMATE_SECONDS,
    max_refs: 10,
    params: {
      aspect_ratio: {
        type: "select",
        label: "比例",
        options: ASPECT_RATIOS_FULL,
        default: "auto",
      },
      // Seedream 5.0 Pro \u4E0A\u6E38\u5206\u8FA8\u7387\u6863\u4F4D\uFF1A1K / 2K\uFF08\u65E0 auto / \u65E0 3K / \u65E0 4K\uFF09\u3002
      // Default to 2K, matching the upstream default.
      resolution: {
        type: "select",
        label: "分辨率",
        options: ["1K", "2K"],
        default: "2K",
      },
    },
  },
  {
    id: "doubao-seedream-4-5-251128",
    name: "Seedream 4.5",
    seriesId: "seedream",
    backend: BACKEND_SEEDREAM,
    model_name: "doubao-seedream-4-5-251128",
    estimatedGenerationSeconds: IMAGE_GENERATION_ESTIMATE_SECONDS,
    max_refs: 10,
    params: {
      aspect_ratio: {
        type: "select",
        label: "比例",
        options: ASPECT_RATIOS_FULL,
        default: "auto",
      },
      // Seedream 4.5 \u4E0A\u6E38\u5206\u8FA8\u7387\u6863\u4F4D\uFF1A2K / 4K\uFF08\u65E0 auto / \u65E0 1K / \u65E0 3K\uFF09\u3002
      // Default to 2K, matching the upstream default.
      resolution: {
        type: "select",
        label: "分辨率",
        options: ["2K", "4K"],
        default: "2K",
      },
    },
  },
  // Midjourney 8.2 is the only generation entry; billing retains the series key.
  {
    id: "midjourney-8.2",
    name: "Midjourney 8.2",
    seriesId: "midjourney",
    backend: BACKEND_MIDJOURNEY,
    pricingId: "midjourney",
    estimatedGenerationSeconds: IMAGE_GENERATION_ESTIMATE_SECONDS,
    max_refs: 4,
    params: {
      aspect_ratio: {
        type: "select",
        label: "比例",
        options: ASPECT_RATIOS_FULL,
        default: "1:1",
      },
      clarity: {
        type: "select",
        label: "清晰度",
        options: ["1k", "2k"],
        default: "1k",
      },
      stylize: {
        type: "slider",
        label: "风格化",
        min: 0,
        max: 1e3,
        step: 1,
        default: "100",
        marks: ["0", "100", "250", "500", "750", "1000"],
      },
      chaos: {
        type: "slider",
        label: "多样化",
        min: 0,
        max: 100,
        step: 1,
        default: "0",
        marks: ["0", "10", "30", "50", "75", "100"],
      },
      weird: {
        type: "slider",
        label: "怪异化",
        min: 0,
        max: 3e3,
        step: 1,
        default: "0",
        marks: ["0", "250", "500", "1000", "2000", "3000"],
      },
    },
  },
  // GPT Image 2 — 双区域命名分离（与 all-in-one / nano_banana 同模式）
  // Domestic: g-image-2 / "Design Image 2" —— 去 OpenAI 品牌
  // Overseas: gpt-image-2 / "GPT Image 2" —— 沿用 OpenAI 品牌
  //
  // GPT Image 2 双区域共用一套 params 形态：
  //   - aspect_ratio: 在 21:9 之后追加 2:1 / 1:2 / 3:1 / 1:3 四个极端横纵比，
  //     横纵成对排布，保持原有横纵交替的视觉模式。
  //   - quality: low / medium / high 三档，default=medium。gateway 与云网关
  //     已透传并按 quality 分档计费。
  {
    id: "g-image-2",
    name: "Design Image 2",
    seriesId: "g-image-2",
    selectionAliases: ["gpt-image"],
    region: "domestic",
    backend: BACKEND_OPENAI,
    model_name: "gpt-image-2",
    estimatedGenerationSeconds: IMAGE_GENERATION_ESTIMATE_SECONDS,
    max_refs: 16,
    params: {
      resolution: {
        type: "select",
        label: "分辨率",
        options: ["1k", "2k", "4k"],
        default: "1k",
      },
      aspect_ratio: {
        type: "select",
        label: "比例",
        options: [
          "1:1",
          "16:9",
          "9:16",
          "3:4",
          "4:3",
          "3:2",
          "2:3",
          "5:4",
          "4:5",
          "21:9",
          "2:1",
          "1:2",
          "3:1",
          "1:3",
        ],
        default: "1:1",
      },
      quality: {
        type: "select",
        label: "画质",
        options: ["low", "medium", "high"],
        default: "medium",
      },
    },
  },
  {
    id: "gpt-image-2",
    name: "GPT Image 2",
    seriesId: "openai-image",
    region: "overseas",
    backend: BACKEND_OPENAI,
    model_name: "gpt-image-2",
    estimatedGenerationSeconds: IMAGE_GENERATION_ESTIMATE_SECONDS,
    max_refs: 16,
    params: {
      resolution: {
        type: "select",
        label: "分辨率",
        options: ["1k", "2k", "4k"],
        default: "1k",
      },
      aspect_ratio: {
        type: "select",
        label: "比例",
        options: [
          "1:1",
          "16:9",
          "9:16",
          "3:4",
          "4:3",
          "3:2",
          "2:3",
          "5:4",
          "4:5",
          "21:9",
          "2:1",
          "1:2",
          "3:1",
          "1:3",
        ],
        default: "1:1",
      },
      quality: {
        type: "select",
        label: "画质",
        options: ["low", "medium", "high"],
        default: "medium",
      },
    },
  },
  // GPT Image 2.5 — Flare（快速）/ Sunburst（精细）两个变体 × 双区域命名分离，
  // 与 GPT Image 2 同模式。max_refs 与链路与 GPT Image 2 一致；参数只多出 quality 的
  // xhigh / max 两档与独有的 background（见 gptImage25Params）。
  //
  // Domestic: g-image-2.5-*   / "Design Image 2.5 Flare|Sunburst" —— 去 OpenAI 品牌
  // Overseas: gpt-image-2.5-* / "GPT Image 2.5 Flare|Sunburst"    —— 沿用 OpenAI 品牌
  //
  // 两区只差一个品牌前缀，变体后缀保持一致。
  //
  // 两区共用同一个上游 model_name，而云网关计费按 model_name 匹配（非注册表 id），
  // 所以 Apollo media_billing_config / op_models 每个变体只需配一份。
  ...[
    {
      variant: "flare",
      label: "Flare",
    },
    {
      variant: "sunburst",
      label: "Sunburst",
    },
  ].flatMap(({ variant, label }) => [
    {
      id: `g-image-2.5-${variant}`,
      name: `Design Image 2.5 ${label}`,
      seriesId: "g-image-2.5",
      region: "domestic",
      backend: BACKEND_OPENAI,
      model_name: `gpt-image-2.5-${variant}`,
      estimatedGenerationSeconds: IMAGE_GENERATION_ESTIMATE_SECONDS,
      max_refs: 16,
      params: gptImage25Params(),
    },
    {
      id: `gpt-image-2.5-${variant}`,
      name: `GPT Image 2.5 ${label}`,
      seriesId: "openai-image",
      region: "overseas",
      backend: BACKEND_OPENAI,
      model_name: `gpt-image-2.5-${variant}`,
      estimatedGenerationSeconds: IMAGE_GENERATION_ESTIMATE_SECONDS,
      max_refs: 16,
      params: gptImage25Params(),
    },
  ]),
];
