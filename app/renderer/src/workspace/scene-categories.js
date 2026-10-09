// scene-categories.js
import { getRuntimeConfig, Film, Palette } from "../vendor.js";
import { ShoppingBag } from "../media-editing/parse-item.jsx";
import { compareSemverStrict } from "../canvas/relayout-group-children.js";
import {
  ecommerceArtwork,
  filmArtwork,
  normalizeHomeQuickStartAssetUrl,
  shortDramaArtwork,
} from "../generation/use-mention-models.jsx";
const SCENE_ASSET_URLS_DOMESTIC = {
  "MiniMax Design使用教程.pdf":
    "https://cdn.hailuoai.com/hailuo-video-web/public_assets/33729d9b-0704-402e-83b9-6a521fe3316d.pdf",
  "产品界面图.png":
    "https://cdn.hailuoai.com/hailuo-video-web/public_assets/f2e8bbb8-4dbb-45c7-aa2b-a978c621ced3.png",
  "参考照片.png":
    "https://cdn.hailuoai.com/hailuo-video-web/public_assets/b49e6d3b-ed55-4199-8ecd-e4862bb40fca.png",
  "原始照片.png":
    "https://cdn.hailuoai.com/hailuo-video-web/public_assets/e6c3ae72-649f-463e-a429-1f752586cb9c.png",
  "产品实拍图.png":
    "https://cdn.hailuoai.com/hailuo-video-web/public_assets/c849df70-e9cd-4330-9cbf-3f98dc33cd86.png",
  "T恤产品图.png":
    "https://cdn.hailuoai.com/hailuo-video-web/public_assets/39d423bc-6a6d-4eac-94b4-47ca3471f46e.png",
  "男主参考.png":
    "https://cdn.hailuoai.com/hailuo-video-web/public_assets/8075b771-b487-490c-a11c-424b8ff1c4f9.png",
  "师姐参考.png":
    "https://cdn.hailuoai.com/hailuo-video-web/public_assets/77b61069-dd6e-4996-a744-3a7521cac94f.png",
};
const SCENE_ASSET_URLS_OVERSEAS = {
  "MiniMax Design使用教程.pdf":
    "https://cdn.hailuoai.video/open-hailuo-video-web/public_assets/a0735759-2713-41ab-9452-5b8caf9b6181.pdf",
  "产品界面图.png":
    "https://cdn.hailuoai.video/open-hailuo-video-web/public_assets/0f8e3586-e29e-4850-94a4-f53e58e31e43.png",
  "参考照片.png":
    "https://cdn.hailuoai.video/open-hailuo-video-web/public_assets/824d52bc-56df-4c7d-bcb4-3a013e760cfb.png",
  "原始照片.png":
    "https://cdn.hailuoai.video/open-hailuo-video-web/public_assets/e44b3c53-9f07-404e-aaf3-0052c82cb828.png",
  "产品实拍图.png":
    "https://cdn.hailuoai.video/open-hailuo-video-web/public_assets/7d85b8b7-e235-4ad5-aea3-8e0a53d24ec8.png",
  "T恤产品图.png":
    "https://cdn.hailuoai.video/open-hailuo-video-web/public_assets/657ba708-e584-465b-85b6-36d7c35b0ac8.png",
  "男主参考.png":
    "https://cdn.hailuoai.video/open-hailuo-video-web/public_assets/be2fa0cc-ea7a-472a-abce-10adf6638710.png",
  "师姐参考.png":
    "https://cdn.hailuoai.video/open-hailuo-video-web/public_assets/aed35ca0-2075-4037-9129-e56ba0dd611f.png",
};
function urlFor(name2) {
  let region = "domestic";
  try {
    region = getRuntimeConfig().region;
  } catch {}
  const overseasUrl = SCENE_ASSET_URLS_OVERSEAS[name2];
  const domesticUrl = SCENE_ASSET_URLS_DOMESTIC[name2];
  const picked = region === "overseas" ? overseasUrl || domesticUrl : domesticUrl;
  return picked && picked.length > 0 ? picked : void 0;
}
const SHORT_DRAMA_QUERIES = [
  {
    id: "character-storyboard",
    label: "多宫格分镜",
    labelEn: "Storyboard",
    queryCn:
      "/character-scene-storyboard 生成一张完整的角色分镜设定图。图1是男主 [男主参考.png]，图2是师姐 [师姐参考.png]。场景：雪夜竹林，师姐被一群黑衣人围攻倒地，男主踏雪赶到，一剑斩下首领。风格：水墨古风加金粉效果。16:9 横版。",
    queryEn:
      "/character-scene-storyboard Generate a full character storyboard composition for the following scene. Image 1 is the male lead [male lead.png], Image 2 is the senior sister [senior sister.png]. Scene: a snowy night in a bamboo forest — the senior sister has been cornered and knocked down by a group of men in black, the male lead arrives through the snow and cuts down their leader in one strike. Style: ink-wash ancient Chinese aesthetic with gold dust effects. 16:9 landscape.",
    skill: "character-scene-storyboard",
    attachments: [
      {
        name: "男主参考.png",
        displayNames: ["male lead.png"],
        type: "image",
        assetUrl: urlFor("男主参考.png"),
      },
      {
        name: "师姐参考.png",
        displayNames: ["senior sister.png"],
        type: "image",
        assetUrl: urlFor("师姐参考.png"),
      },
    ],
  },
  {
    id: "episode-script",
    label: "一键出剧本",
    labelEn: "Episode Script",
    queryCn: '一句话告诉你我的核心爆点("总裁失忆后爱上前妻")，直接帮我写一段示例剧本',
    queryEn: `Here's my core hook in one sentence ("CEO loses memory, falls for ex-wife again"), write me a sample episode script directly`,
    coverUrl: urlFor("参考照片.png"),
    attachments: [],
  },
  {
    id: "character-cards",
    label: "角色生成",
    labelEn: "Character Cards",
    queryCn:
      "/short-drama 根据以下人设描述，生成女主苏晚的角色视觉卡：古装造型 3 套 + 现代职场造型 2 套，保持脸型、五官和神态高度一致，适配竖屏短剧拍摄参考。",
    queryEn:
      "/short-drama Based on the character profile below, generate visual reference cards for female lead Su Wan: 3 period-drama looks + 2 modern office outfits. Keep facial features and expressions consistent across all versions.",
    skill: "short-drama",
    coverUrl: urlFor("师姐参考.png"),
    attachments: [],
  },
];
export const SCENE_CATEGORIES = [
  {
    id: "ecommerce",
    name: "电商带货",
    nameEn: "E-commerce",
    icon: ShoppingBag,
    queries: [
      {
        id: "product-listing",
        label: "多平台配图",
        labelEn: "Product Listing",
        queryCn:
          "我有一款新上的米白色真丝吊带连衣裙 [产品实拍图.png]。帮我出6张适配小红书的图片。调性走 Editorial Premium：杂志大片感、低饱和奶油色、北窗自然光、模特冷感优雅。组图构成：1 张 hero 全身 + 3 张不同角度的模特半身/细节 + 1 张面料微距 + 1 张单品平铺。整组要用同一个模特、同一个光感、同一天的色调。",
        queryEn:
          "I just launched a cream-white silk slip dress [product photo.png]. Generate 6 white-background images optimized for Amazon. Shot breakdown: 1 hero full-body + 3 model half-body / detail shots from different angles + 1 fabric close-up + 1 flat lay. Keep the same model & lighting.",
        skill: "ecommerce-image",
        attachments: [
          {
            name: "产品实拍图.png",
            displayNames: ["product photo.png"],
            type: "image",
            assetUrl: urlFor("产品实拍图.png"),
          },
        ],
      },
      {
        id: "batch-recolor",
        label: "批量换色",
        labelEn: "Batch Recolor",
        queryCn:
          "我有一款[女装基础款圆领纯棉短袖 T 恤]的产品实拍图。请帮我做一组完整的 SKU 色卡。5 个 SKU 色版(请严格按 hex 出色,不要偏色): [米白 #F5F0E6], [燕麦驼 #C9B796], [雾霾蓝 #8FA5B8], [焦糖棕 #A0673E], [经典黑 #1A1A1A]。",
        queryEn:
          "I have a product photo of a [women's basic crew-neck pure cotton short-sleeve T-shirt]. Generate a complete SKU color swatch set. 5 color variants strictly match the hex codes, no color drift: [Off-White #F5F0E6], [Oat Camel #C9B796], [Haze Blue #8FA5B8], [Caramel Brown #A0673E], [Classic Black #1A1A1A].",
        attachments: [
          {
            name: "T恤产品图.png",
            // Match both the Chinese description and the English equivalent so
            // either locale's bracket marker resolves to this attachment chip.
            displayNames: [
              "女装基础款圆领纯棉短袖 T 恤",
              "women's basic crew-neck pure cotton short-sleeve T-shirt",
            ],
            type: "image",
            assetUrl: urlFor("T恤产品图.png"),
          },
        ],
      },
      {
        id: "promo-video",
        label: "产品动画",
        labelEn: "Promo Video",
        queryCn:
          "帮我做一支电动自行车的 KOC 种草视频，对标北美，30 秒左右，9:16 竖屏。人群是城市通勤上班族，主打告别挤地铁",
        queryEn:
          "Help me make a KOC-style promo video for an e-bike, benchmarked to North America, around 30s, 9:16 vertical. Target audience: urban commuters, key message: ditch the crowded subway.",
        skill: "promo-video",
        coverUrl: urlFor("产品界面图.png"),
        mediaType: "video",
        attachments: [],
      },
    ],
  },
  {
    id: "film",
    name: "影视",
    nameEn: "Film",
    icon: Film,
    queries: SHORT_DRAMA_QUERIES,
  },
  {
    id: "short-drama",
    name: "短剧",
    nameEn: "Short Drama",
    icon: Film,
    queries: SHORT_DRAMA_QUERIES,
  },
  {
    id: "graphic-design",
    name: "平面设计",
    nameEn: "Graphic Design",
    icon: Palette,
    queries: [
      {
        id: "image-remix",
        label: "图像重混",
        labelEn: "Image Remix",
        queryCn: "/image-remix 把这张照片改成 [参考照片.png] 里克莱因蓝极简的画风，内容换成柴犬。",
        queryEn:
          "/image-remix Restyle this photo with the Klein-blue minimalist vibe of [reference.png], change the subject to a Shiba Inu.",
        skill: "image-remix",
        attachments: [
          {
            name: "参考照片.png",
            displayNames: ["reference.png"],
            type: "image",
            assetUrl: urlFor("参考照片.png"),
          },
        ],
      },
      {
        id: "anime-style",
        label: "画风转换",
        labelEn: "Anime Style",
        queryCn: "/anime-style-forge 把 [原始照片.png] 转成吉卜力风格，保留人物特征和背景氛围。",
        queryEn:
          "/anime-style-forge Turn [original.png] into Ghibli style, keep the character features and background mood.",
        skill: "anime-style-forge",
        attachments: [
          {
            name: "原始照片.png",
            displayNames: ["original.png"],
            type: "image",
            assetUrl: urlFor("原始照片.png"),
          },
        ],
      },
      {
        id: "nine-panel-comic",
        label: "九格漫画",
        labelEn: "9-Panel Comic",
        queryCn:
          '/n-storyboard 用 3×3 九格漫画讲"小猫咪的早晨"：睁眼 → 大伸懒腰 → 跳下床 → 蹲在空食碗前 → 用爪子拨碗 → 抬头发现没人来 → 跳上厨房柜台 → 推倒一个杯子 → 回头无辜看镜头',
        queryEn: `/n-storyboard Tell "a kitten's morning" as a 3×3 nine-panel comic: open eyes → big stretch → jump off the bed → sit by empty food bowl → paw at the bowl → look up, nobody's coming → leap onto kitchen counter → push a cup off the edge → glance back, all innocent.`,
        skill: "n-storyboard",
        coverUrl: urlFor("参考照片.png"),
        attachments: [],
      },
    ],
  },
];
export const HOME_QUICK_START_SCHEMA_VERSION = 2;
export const HOME_QUICK_START_MAX_SECTIONS = 16;
export const HOME_QUICK_START_MAX_ITEMS_PER_SECTION = 64;
export const HOME_QUICK_START_MAX_OUTPUTS_PER_QUERY = 8;
export const HOME_QUICK_START_MAX_TOTAL_QUERIES = 256;
const HOME_QUICK_START_MAX_SHOWCASE_TABS = HOME_QUICK_START_MAX_SECTIONS + 2;
export const PROMPT_ICON_MAP = {
  film: Film,
  palette: Palette,
  "shopping-bag": ShoppingBag,
};
export const DEFAULT_SCENE_ARTWORKS = {
  ecommerce: ecommerceArtwork,
  film: filmArtwork,
  "short-drama": shortDramaArtwork,
};
export const DEFAULT_SCENE_IDS = ["film", "short-drama", "ecommerce"];
export const DEFAULT_HOME_FEATURED_SKILLS = [
  {
    name: "short-drama-series-writer",
    prompt:
      "帮我做一个短剧，主题【总裁夫人不好当】。严格按照skill的流程执行，每个步骤主动询问用户，卡片弹窗形式询问，不需遗漏步骤，不需擅自发挥",
    promptEn:
      'Help me create a short drama titled "Being the CEO’s Wife Is Hard". Follow the skill workflow exactly, ask before every step with question cards, and do not skip or improvise steps.',
    tag: "短剧",
    tagEn: "Short Drama",
  },
  {
    name: "chinese-style-short-drama-generator",
    prompt:
      "帮我做一部国风短剧，主题是【重生后我成为宗门第一剑修】。严格按照skill的流程执行，每个步骤主动询问用户，卡片弹窗形式询问，不需遗漏步骤，不需擅自发挥",
    promptEn:
      'Help me create a Chinese-style short drama titled "Reborn as the Sect’s Greatest Sword Cultivator". Follow the skill workflow exactly, ask before every step with question cards, and do not skip or improvise steps.',
    tag: "短剧",
    tagEn: "Short Drama",
  },
  {
    name: "story-to-video-generator",
    prompt:
      "帮我把一个故事灵感变成完整视频，主题是【驯服巨兽的少年】。严格按照skill的流程执行，每个步骤主动询问用户，卡片弹窗形式询问，不需遗漏步骤，不需擅自发挥",
    promptEn:
      'Turn a story idea titled "The Boy Who Tamed a Giant Beast" into a complete video. Follow the skill workflow exactly, ask before every step with question cards, and do not skip or improvise steps.',
    tag: "影视",
    tagEn: "Film & TV",
  },
  {
    name: "mg-voiceover-animation-generator",
    prompt:
      "帮我制作一支 MG 动画，主题是【黑洞到底是什么？】。严格按照skill的流程执行，每个步骤主动询问用户，卡片弹窗形式询问，不需遗漏步骤，不需擅自发挥",
    promptEn:
      'Create an MG animation titled "What Exactly Is a Black Hole?". Follow the skill workflow exactly, ask before every step with question cards, and do not skip or improvise steps.',
    tag: "创作者",
    tagEn: "Creator",
  },
];
export function isRecord$5(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
export function nonEmptyString(value) {
  if (typeof value !== "string") return void 0;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : void 0;
}
const CONFIG_IDENTIFIER_PATTERN = /^[a-z0-9][a-z0-9._-]{0,127}$/;
export function configIdentifier(value) {
  const text2 = nonEmptyString(value);
  return text2 && CONFIG_IDENTIFIER_PATTERN.test(text2) ? text2 : void 0;
}
function stringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, HOME_QUICK_START_MAX_ITEMS_PER_SECTION).flatMap((item) => {
    const parsed = nonEmptyString(item);
    return parsed ? [parsed] : [];
  });
}
export function parseLocalizedText(value) {
  if (typeof value === "string") {
    const text2 = nonEmptyString(value);
    return text2
      ? {
          zh: text2,
          en: text2,
        }
      : null;
  }
  if (!isRecord$5(value)) return null;
  const zh2 = nonEmptyString(value.zh);
  const en2 = nonEmptyString(value.en);
  if (!zh2 && !en2) return null;
  return {
    zh: zh2 ?? en2 ?? "",
    en: en2 ?? zh2 ?? "",
  };
}
export function parseOptionalLocalizedText(value) {
  return parseLocalizedText(value) ?? void 0;
}
export function uniqueBy(items, getKey) {
  const seen2 = new Set();
  return items.filter((item) => {
    const key2 = getKey(item);
    if (!key2 || seen2.has(key2)) return false;
    seen2.add(key2);
    return true;
  });
}
function runtimeRegion() {
  try {
    return getRuntimeConfig().region;
  } catch {
    return "domestic";
  }
}
export function meetsMinClientVersion(value) {
  if (value === void 0) return true;
  const minClientVersion = nonEmptyString(value);
  if (!minClientVersion) return false;
  try {
    const clientVersion = nonEmptyString(getRuntimeConfig().appVersion);
    if (!clientVersion) return false;
    const comparison = compareSemverStrict(clientVersion, minClientVersion);
    return comparison !== null && comparison >= 0;
  } catch {
    return false;
  }
}
export function normalizeConfiguredAssetUrl(value) {
  if (!isRecord$5(value)) return normalizeHomeQuickStartAssetUrl(value);
  const domesticUrl = normalizeHomeQuickStartAssetUrl(value.domestic);
  if (runtimeRegion() === "domestic") return domesticUrl;
  return normalizeHomeQuickStartAssetUrl(value.overseas) ?? domesticUrl;
}
export function parseAgentModelId(value) {
  const modelId = nonEmptyString(isRecord$5(value) ? value[runtimeRegion()] : value);
  if (!modelId || /[\s\p{Cc}]/u.test(modelId)) return void 0;
  const slash2 = modelId.indexOf("/");
  return slash2 > 0 && slash2 < modelId.length - 1 ? modelId : void 0;
}
export function parseSelectedMediaModels(value) {
  if (!isRecord$5(value)) return void 0;
  const image2 = stringArray(value.image);
  const video = stringArray(value.video);
  const audio = stringArray(value.audio);
  if (image2.length === 0 && video.length === 0 && audio.length === 0) return void 0;
  return {
    ...(image2.length > 0
      ? {
          image: image2,
        }
      : {}),
    ...(video.length > 0
      ? {
          video,
        }
      : {}),
    ...(audio.length > 0
      ? {
          audio,
        }
      : {}),
  };
}
const SHOWCASE_ORIENTATIONS = new Set(["landscape", "portrait"]);
const SHOWCASE_BADGE_LABELS = new Set(["NEW", "HOT"]);
function parseShowcaseOrientation(value) {
  return typeof value === "string" && SHOWCASE_ORIENTATIONS.has(value) ? value : "landscape";
}
function parseShowcaseTabBadge(value) {
  if (!isRecord$5(value)) return void 0;
  const label = parseLocalizedText(value);
  if (!label) return void 0;
  const normalizedLabel = label.zh.toUpperCase();
  const normalizedLabelEn = label.en.toUpperCase();
  if (
    !SHOWCASE_BADGE_LABELS.has(normalizedLabel) ||
    !SHOWCASE_BADGE_LABELS.has(normalizedLabelEn)
  ) {
    return void 0;
  }
  return {
    label: normalizedLabel,
    labelEn: normalizedLabelEn,
  };
}
export function parseShowcaseConfig(value) {
  if (!isRecord$5(value)) return void 0;
  const defaultTabId = configIdentifier(value.default_tab_id);
  const parsedTabs = [];
  if (Array.isArray(value.tabs)) {
    for (const tab2 of value.tabs.slice(0, HOME_QUICK_START_MAX_SHOWCASE_TABS)) {
      if (!isRecord$5(tab2)) continue;
      const id2 = configIdentifier(tab2.id);
      if (!id2) continue;
      const title = parseOptionalLocalizedText(tab2.title);
      const badge = parseShowcaseTabBadge(tab2.badge);
      parsedTabs.push({
        id: id2,
        ...(title
          ? {
              label: title.zh,
              labelEn: title.en,
            }
          : {}),
        videoOrientation: parseShowcaseOrientation(tab2.video_orientation),
        ...(badge
          ? {
              badge,
            }
          : {}),
      });
    }
  } else if (isRecord$5(value.tabs)) {
    for (const [id2, tab2] of Object.entries(value.tabs).slice(
      0,
      HOME_QUICK_START_MAX_SHOWCASE_TABS,
    )) {
      const normalizedId = configIdentifier(id2);
      if (!normalizedId || !isRecord$5(tab2)) continue;
      const title = parseOptionalLocalizedText(tab2.title);
      const badge = parseShowcaseTabBadge(tab2.badge);
      parsedTabs.push({
        id: normalizedId,
        ...(title
          ? {
              label: title.zh,
              labelEn: title.en,
            }
          : {}),
        videoOrientation: parseShowcaseOrientation(tab2.video_orientation),
        ...(badge
          ? {
              badge,
            }
          : {}),
      });
    }
  }
  return {
    ...(defaultTabId
      ? {
          defaultTabId,
        }
      : {}),
    tabs: Object.fromEntries(parsedTabs.map((tab2) => [tab2.id, tab2])),
  };
}
const ATTACHMENT_TYPES = new Set(["image", "video", "audio", "pdf", "folder", "file"]);
export function parseAttachment(value) {
  if (!isRecord$5(value)) return void 0;
  const name2 = nonEmptyString(value.name);
  const type2 = nonEmptyString(value.type);
  if (!name2 || !type2 || !ATTACHMENT_TYPES.has(type2)) return void 0;
  const aliases = [...new Set(stringArray(value.aliases))].filter((alias) => alias !== name2);
  const assetUrl = normalizeConfiguredAssetUrl(value.url);
  return {
    name: name2,
    type: type2,
    ...(aliases.length > 0
      ? {
          displayNames: aliases,
        }
      : {}),
    ...(assetUrl
      ? {
          assetUrl,
        }
      : {}),
  };
}
export const MEDIA_TYPES = new Set(["image", "video", "audio", "document"]);
export function parsePromptOutput(value) {
  if (!isRecord$5(value)) return void 0;
  const id2 = configIdentifier(value.id);
  const title = parseLocalizedText(value.title);
  if (!id2 || !title) return void 0;
  const mediaType = nonEmptyString(value.media);
  const description =
    parseOptionalLocalizedText(value.description) ?? parseOptionalLocalizedText(value.subtitle);
  const attribution =
    parseOptionalLocalizedText(value.attribution) ?? parseOptionalLocalizedText(value.author);
  return {
    id: id2,
    videoId: configIdentifier(value.video_id),
    title: title.zh,
    titleEn: title.en,
    ...(description
      ? {
          description: description.zh,
          descriptionEn: description.en,
        }
      : {}),
    coverUrl: normalizeConfiguredAssetUrl(value.cover),
    videoUrl: normalizeConfiguredAssetUrl(value.video),
    mediaType: mediaType && MEDIA_TYPES.has(mediaType) ? mediaType : void 0,
    ...(attribution
      ? {
          attribution: attribution.zh,
          attributionEn: attribution.en,
        }
      : {}),
    ...(typeof value.use_prompt === "boolean"
      ? {
          usePrompt: value.use_prompt,
        }
      : {}),
    featured: value.featured === true,
  };
}
