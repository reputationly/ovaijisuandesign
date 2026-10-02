/**
 * 首页「创作灵感」的**兜底配置** + legacy 素材路由（2026-10-02 起）。
 *
 * 主配置换成云端原文（quick_start_config v2：8 分区 165 条示例，无技能绑定，
 * 见 home-quick-start-cloud.ts / assets/home-showcase/quick-start-config-v2.json）；
 * 本文件的手写 4 场景配置只在云端原文文件缺失时兜底（正常情况下用不到）。
 * legacy 8 个素材文件 + 使用教程 PDF 的静态路由保留（渲染层缓存的旧配置还引用它们）。
 *
 * 来源：渲染层内置的兜底配置（3.0.21 的 `SCENE_CATEGORIES`、`DEFAULT_HOME_FEATURED_SKILLS`）。
 * 场景表（电商带货 / 影视 / 短剧 / 平面设计）里按默认顺序取 film、short-drama、ecommerce 三个场景，
 * id、标题、中英文提示词、附件、封面、排序、技能绑定都照抄；影视和短剧本来就共用同一组示例。
 * 素材是那份兜底配置指向的 8 个公开 CDN 文件，下载一次放在仓库的 assets/home-showcase/，
 * 文件名不改，由 gateway 的静态路由发出去（见 cloud-config.controller.ts）。
 *
 * 「平面设计」不在兜底配置的默认顺序（DEFAULT_SCENE_IDS）里，界面上看不到它，但场景表里有这一项：
 * 三条示例（图像重混 / 画风转换 / 九格漫画）也一并搬过来，挂在 film、short-drama、ecommerce 之后。
 * 参照的示例按场景 id 从渲染层自己的 i18n 取分区名（home.scene.graphic-design），本地配置给不出，
 * 也不影响渲染。
 *
 * 和参照原文完全一致，逐字照抄，包括每条示例的 skill 绑定和提示词开头的 `/技能名`。
 * 这 11 个技能在参照产品里走云端技能市场，本机也没有——这是手写兜底配置的已知代价
 * （点示例卡片会弹一次「安装 Skill 失败」）；换成云端原文配置（home-quick-start-cloud.ts）
 * 后没有技能绑定，这个问题在主路径上已不存在。
 */

import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** 示例素材的路由前缀（不带开头的 `/`，Nest 的路由写法）。 */
export const HOME_SHOWCASE_ASSET_ROUTE = "api/v1/home/showcase-assets";

/**
 * assets/home-showcase/ 下的文件，文件名就是兜底配置里的附件名。静态路由只认这张表，
 * 名字不在表里一律 404，不拿请求里的路径去拼文件系统路径。
 * 使用教程 PDF 没有示例引用，照样放着，文件名不改。
 */
export const HOME_SHOWCASE_ASSET_FILES = [
  "MiniMax Design使用教程.pdf",
  "产品界面图.png",
  "参考照片.png",
  "原始照片.png",
  "产品实拍图.png",
  "T恤产品图.png",
  "男主参考.png",
  "师姐参考.png",
] as const;

export type AssetName = (typeof HOME_SHOWCASE_ASSET_FILES)[number];

/**
 * 素材地址写成相对路径：gateway 端口每次启动都可能换，写死 host:port 的话渲染层缓存的上一份配置就失效了。
 * 渲染层按自己连的 gateway 地址补全（见 app/official-ui/patches.mjs 的 home-showcase.local-assets）。
 * 云端配置的图片 key（`<sha1 前 16 位>-<文件名>`）也从这里走，所以收 string 而不只是 legacy 的 8 个名字。
 */
export const homeShowcaseAssetUrl = (name: string) => `/${HOME_SHOWCASE_ASSET_ROUTE}/${encodeURIComponent(name)}`;

export type Text = { zh: string; en: string };
export interface Attachment {
  name: AssetName;
  type: "image";
  aliases: string[];
  url: string;
}
export interface PromptItem {
  id: string;
  title: Text;
  prompt: Text;
  description: Text;
  skill?: string;
  cover?: string;
  media?: "video";
  attachments: Attachment[];
}

const image = (name: AssetName, aliases: string[]): Attachment => ({ name, type: "image", aliases, url: homeShowcaseAssetUrl(name) });

/** 提示词同时当卡片描述用。 */
const item = (it: Omit<PromptItem, "description">): PromptItem => ({ ...it, description: it.prompt });

/** 影视、短剧共用的一组示例。 */
const SHORT_DRAMA_ITEMS: PromptItem[] = [
  item({
    id: "character-storyboard",
    title: { zh: "多宫格分镜", en: "Storyboard" },
    prompt: {
      zh: "/character-scene-storyboard 生成一张完整的角色分镜设定图。图1是男主 [男主参考.png]，图2是师姐 [师姐参考.png]。场景：雪夜竹林，师姐被一群黑衣人围攻倒地，男主踏雪赶到，一剑斩下首领。风格：水墨古风加金粉效果。16:9 横版。",
      en: "/character-scene-storyboard Generate a full character storyboard composition for the following scene. Image 1 is the male lead [male lead.png], Image 2 is the senior sister [senior sister.png]. Scene: a snowy night in a bamboo forest — the senior sister has been cornered and knocked down by a group of men in black, the male lead arrives through the snow and cuts down their leader in one strike. Style: ink-wash ancient Chinese aesthetic with gold dust effects. 16:9 landscape.",
    },
    skill: "character-scene-storyboard",
    attachments: [image("男主参考.png", ["male lead.png"]), image("师姐参考.png", ["senior sister.png"])],
  }),
  item({
    id: "episode-script",
    title: { zh: "一键出剧本", en: "Episode Script" },
    prompt: {
      zh: '一句话告诉你我的核心爆点("总裁失忆后爱上前妻")，直接帮我写一段示例剧本',
      en: `Here's my core hook in one sentence ("CEO loses memory, falls for ex-wife again"), write me a sample episode script directly`,
    },
    cover: homeShowcaseAssetUrl("参考照片.png"),
    attachments: [],
  }),
  item({
    id: "character-cards",
    title: { zh: "角色生成", en: "Character Cards" },
    prompt: {
      zh: "/short-drama 根据以下人设描述，生成女主苏晚的角色视觉卡：古装造型 3 套 + 现代职场造型 2 套，保持脸型、五官和神态高度一致，适配竖屏短剧拍摄参考。",
      en: "/short-drama Based on the character profile below, generate visual reference cards for female lead Su Wan: 3 period-drama looks + 2 modern office outfits. Keep facial features and expressions consistent across all versions.",
    },
    skill: "short-drama",
    cover: homeShowcaseAssetUrl("师姐参考.png"),
    attachments: [],
  }),
];

const ECOMMERCE_ITEMS: PromptItem[] = [
  item({
    id: "product-listing",
    title: { zh: "多平台配图", en: "Product Listing" },
    prompt: {
      zh: "我有一款新上的米白色真丝吊带连衣裙 [产品实拍图.png]。帮我出6张适配小红书的图片。调性走 Editorial Premium：杂志大片感、低饱和奶油色、北窗自然光、模特冷感优雅。组图构成：1 张 hero 全身 + 3 张不同角度的模特半身/细节 + 1 张面料微距 + 1 张单品平铺。整组要用同一个模特、同一个光感、同一天的色调。",
      en: "I just launched a cream-white silk slip dress [product photo.png]. Generate 6 white-background images optimized for Amazon. Shot breakdown: 1 hero full-body + 3 model half-body / detail shots from different angles + 1 fabric close-up + 1 flat lay. Keep the same model & lighting.",
    },
    skill: "ecommerce-image",
    attachments: [image("产品实拍图.png", ["product photo.png"])],
  }),
  item({
    id: "batch-recolor",
    title: { zh: "批量换色", en: "Batch Recolor" },
    prompt: {
      zh: "我有一款[女装基础款圆领纯棉短袖 T 恤]的产品实拍图。请帮我做一组完整的 SKU 色卡。5 个 SKU 色版(请严格按 hex 出色,不要偏色): [米白 #F5F0E6], [燕麦驼 #C9B796], [雾霾蓝 #8FA5B8], [焦糖棕 #A0673E], [经典黑 #1A1A1A]。",
      en: "I have a product photo of a [women's basic crew-neck pure cotton short-sleeve T-shirt]. Generate a complete SKU color swatch set. 5 color variants strictly match the hex codes, no color drift: [Off-White #F5F0E6], [Oat Camel #C9B796], [Haze Blue #8FA5B8], [Caramel Brown #A0673E], [Classic Black #1A1A1A].",
    },
    // 中英文提示词里的方括号描述都能对上这张图。
    attachments: [image("T恤产品图.png", ["女装基础款圆领纯棉短袖 T 恤", "women's basic crew-neck pure cotton short-sleeve T-shirt"])],
  }),
  item({
    id: "promo-video",
    title: { zh: "产品动画", en: "Promo Video" },
    prompt: {
      zh: "帮我做一支电动自行车的 KOC 种草视频，对标北美，30 秒左右，9:16 竖屏。人群是城市通勤上班族，主打告别挤地铁",
      en: "Help me make a KOC-style promo video for an e-bike, benchmarked to North America, around 30s, 9:16 vertical. Target audience: urban commuters, key message: ditch the crowded subway.",
    },
    skill: "promo-video",
    cover: homeShowcaseAssetUrl("产品界面图.png"),
    media: "video",
    attachments: [],
  }),
];

/** 平面设计：兜底配置里这三条同样带技能绑定和 `/技能名`，照抄。 */
const GRAPHIC_DESIGN_ITEMS: PromptItem[] = [
  item({
    id: "image-remix",
    title: { zh: "图像重混", en: "Image Remix" },
    prompt: {
      zh: "/image-remix 把这张照片改成 [参考照片.png] 里克莱因蓝极简的画风，内容换成柴犬。",
      en: "/image-remix Restyle this photo with the Klein-blue minimalist vibe of [reference.png], change the subject to a Shiba Inu.",
    },
    skill: "image-remix",
    attachments: [image("参考照片.png", ["reference.png"])],
  }),
  item({
    id: "anime-style",
    title: { zh: "画风转换", en: "Anime Style" },
    prompt: {
      zh: "/anime-style-forge 把 [原始照片.png] 转成吉卜力风格，保留人物特征和背景氛围。",
      en: "/anime-style-forge Turn [original.png] into Ghibli style, keep the character features and background mood.",
    },
    skill: "anime-style-forge",
    attachments: [image("原始照片.png", ["original.png"])],
  }),
  item({
    id: "nine-panel-comic",
    title: { zh: "九格漫画", en: "9-Panel Comic" },
    prompt: {
      zh: '/n-storyboard 用 3×3 九格漫画讲"小猫咪的早晨"：睁眼 → 大伸懒腰 → 跳下床 → 蹲在空食碗前 → 用爪子拨碗 → 抬头发现没人来 → 跳上厨房柜台 → 推倒一个杯子 → 回头无辜看镜头',
      en: `/n-storyboard Tell "a kitten's morning" as a 3×3 nine-panel comic: open eyes → big stretch → jump off the bed → sit by empty food bowl → paw at the bowl → look up, nobody's coming → leap onto kitchen counter → push a cup off the edge → glance back, all innocent.`,
    },
    skill: "n-storyboard",
    cover: homeShowcaseAssetUrl("参考照片.png"),
    attachments: [],
  }),
];

/** 精选技能分区里的预置提示词：用户在 Skill 页签点这些技能时，输入框里填的就是这一句。 */
const FEATURED_SKILL_PRESETS = [
  {
    skill: "short-drama-series-writer",
    prompt: {
      zh: "帮我做一个短剧，主题【总裁夫人不好当】。严格按照skill的流程执行，每个步骤主动询问用户，卡片弹窗形式询问，不需遗漏步骤，不需擅自发挥",
      en: 'Help me create a short drama titled "Being the CEO’s Wife Is Hard". Follow the skill workflow exactly, ask before every step with question cards, and do not skip or improvise steps.',
    },
    tag: { zh: "短剧", en: "Short Drama" },
  },
  {
    skill: "chinese-style-short-drama-generator",
    prompt: {
      zh: "帮我做一部国风短剧，主题是【重生后我成为宗门第一剑修】。严格按照skill的流程执行，每个步骤主动询问用户，卡片弹窗形式询问，不需遗漏步骤，不需擅自发挥",
      en: 'Help me create a Chinese-style short drama titled "Reborn as the Sect’s Greatest Sword Cultivator". Follow the skill workflow exactly, ask before every step with question cards, and do not skip or improvise steps.',
    },
    tag: { zh: "短剧", en: "Short Drama" },
  },
  {
    skill: "story-to-video-generator",
    prompt: {
      zh: "帮我把一个故事灵感变成完整视频，主题是【驯服巨兽的少年】。严格按照skill的流程执行，每个步骤主动询问用户，卡片弹窗形式询问，不需遗漏步骤，不需擅自发挥",
      en: 'Turn a story idea titled "The Boy Who Tamed a Giant Beast" into a complete video. Follow the skill workflow exactly, ask before every step with question cards, and do not skip or improvise steps.',
    },
    tag: { zh: "影视", en: "Film & TV" },
  },
  {
    skill: "mg-voiceover-animation-generator",
    prompt: {
      zh: "帮我制作一支 MG 动画，主题是【黑洞到底是什么？】。严格按照skill的流程执行，每个步骤主动询问用户，卡片弹窗形式询问，不需遗漏步骤，不需擅自发挥",
      en: 'Create an MG animation titled "What Exactly Is a Black Hole?". Follow the skill workflow exactly, ask before every step with question cards, and do not skip or improvise steps.',
    },
    tag: { zh: "创作者", en: "Creator" },
  },
];

/**
 * 首页快速开始配置（v2，渲染层 parseHomeQuickStartConfig 的输入格式）。
 *
 * 场景分区不带 showcase：带了会多出一个「精选」集合（前 9 条重复一遍），对话空状态的推荐也会拿它们当视频推荐。
 */
export const HOME_QUICK_START_CONFIG = {
  schema_version: 2,
  enabled: true,
  sections: [
    { type: "prompt", id: "film", title: { zh: "影视", en: "Film" }, icon: "film", items: SHORT_DRAMA_ITEMS },
    { type: "prompt", id: "short-drama", title: { zh: "短剧", en: "Short Drama" }, icon: "film", items: SHORT_DRAMA_ITEMS },
    { type: "prompt", id: "ecommerce", title: { zh: "电商带货", en: "E-commerce" }, icon: "shopping-bag", items: ECOMMERCE_ITEMS },
    { type: "prompt", id: "graphic-design", title: { zh: "平面设计", en: "Graphic Design" }, icon: "palette", items: GRAPHIC_DESIGN_ITEMS },
    {
      type: "skill",
      id: "official-featured",
      title: { zh: "Skill", en: "Skills" },
      source: "official-featured",
      items: FEATURED_SKILL_PRESETS,
    },
  ],
};

/**
 * home-showcase 资源目录：发布包里是 resources/home-showcase，开发时是仓库的 assets/home-showcase
 * （和自带技能 resources/skills ↔ assets/skills 同一个约定）。开发时从本文件往上找，src/ 和 dist/ 下跑都认得。
 * 云端原文 quick-start-config-v2.json 和 media/ 也在这个目录下（见 home-quick-start-cloud.ts）。
 */
export function homeShowcaseDir(): string | undefined {
  const resources = (process as { resourcesPath?: string }).resourcesPath;
  const candidates = resources ? [path.join(resources, "home-showcase")] : [];
  for (let dir = path.dirname(fileURLToPath(import.meta.url)); ; dir = path.dirname(dir)) {
    candidates.push(path.join(dir, "assets", "home-showcase"));
    if (path.dirname(dir) === dir) break;
  }
  return candidates.find((c) => existsSync(c));
}
