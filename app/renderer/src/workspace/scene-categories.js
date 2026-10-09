// scene-categories.js
import { ecommerceArtwork } from "../generation/use-mention-models.jsx";
import {
  filmArtwork,
  shortDramaArtwork,
} from "../generation/use-skill-categories.js";
import { Film, getRuntimeConfig, Palette } from "../vendor.js";
import { ShoppingBag } from "../media-editing/package.jsx";
import { SkillIcon } from "./use-prompt-icon.jsx";
import { HOME_QUICK_START_SCHEMA_VERSION } from "./parse-localized-text.js";

const featuredSkillArtwork =
  "" + new URL("../featured-skill-C1bqOHc_.png", import.meta.url).href;

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
  const picked =
    region === "overseas" ? overseasUrl || domesticUrl : domesticUrl;
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
    queryCn:
      '一句话告诉你我的核心爆点("总裁失忆后爱上前妻")，直接帮我写一段示例剧本',
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

const SCENE_CATEGORIES = [
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
        queryCn:
          "/image-remix 把这张照片改成 [参考照片.png] 里克莱因蓝极简的画风，内容换成柴犬。",
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
        queryCn:
          "/anime-style-forge 把 [原始照片.png] 转成吉卜力风格，保留人物特征和背景氛围。",
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

const DEFAULT_SCENE_ARTWORKS = {
  ecommerce: ecommerceArtwork,
  film: filmArtwork,
  "short-drama": shortDramaArtwork,
};

const DEFAULT_SCENE_IDS = ["film", "short-drama", "ecommerce"];

const DEFAULT_HOME_FEATURED_SKILLS = [
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

function buildDefaultCategories() {
  const scenes = DEFAULT_SCENE_IDS.flatMap((id2) => {
    const scene = SCENE_CATEGORIES.find((candidate) => candidate.id === id2);
    if (!scene) return [];
    return [
      {
        kind: "scene",
        id: scene.id,
        name: scene.name,
        nameEn: scene.nameEn,
        icon: scene.icon,
        artworkUrl: DEFAULT_SCENE_ARTWORKS[scene.id],
        scene,
      },
    ];
  });
  return [
    ...scenes,
    {
      kind: "featured-skills",
      id: "official-featured",
      name: "Skill",
      nameEn: "Skills",
      icon: SkillIcon,
      artworkUrl: featuredSkillArtwork,
      marketSource: "official-featured",
      skills: DEFAULT_HOME_FEATURED_SKILLS,
    },
  ];
}

export const DEFAULT_HOME_QUICK_START_CONFIG = {
  schemaVersion: HOME_QUICK_START_SCHEMA_VERSION,
  categories: buildDefaultCategories(),
};
