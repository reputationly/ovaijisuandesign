/**
 * 首页「创作灵感」页签的数据：快速开始配置（v2）+ 示例用到的素材文件。
 *
 * 来源：渲染层内置的兜底配置——场景表（电商带货 / 影视 / 短剧 / 平面设计）里按默认顺序取
 * film、short-drama、ecommerce 三个场景，id、标题、中英文提示词、附件、封面、排序都照抄；
 * 影视和短剧本来就共用同一组示例。素材是那份兜底配置指向的 8 个公开 CDN 文件，下载一次放在
 * 仓库的 assets/home-showcase/，文件名不改，由 gateway 的静态路由发出去（见 cloud-config.controller.ts）。
 *
 * 和兜底配置不一样的地方：
 * - 技能绑定：原来绑的是云端市场的技能（character-scene-storyboard、short-drama、ecommerce-image、
 *   promo-video），我们没有。渲染层点示例时会先确保技能可用，本地没有就去市场装，装不上就弹「安装失败」、
 *   整个示例填不进输入框。所以只有「产品动画」换成了自带的同类技能 koc-video（北美通勤电单车的 KOC 种草视频，
 *   正是它的用途），其余去掉绑定，提示词开头的 `/技能名` 也一并去掉，免得 agent 把它当成找不到的命令。
 * - 「角色生成」原文是「根据以下人设描述，……」，后面的人设靠技能补，去掉技能后改成直接描述要做的事。
 * - 「产品动画」不要封面：原来那张是参照产品界面的截图（带着别家品牌），卡片改用渲染层自带的电商场景配图。
 * - 每条示例补了一句描述（就是提示词本身）：卡片底下那行描述缺省时会显示视频展示用的通用文案，和示例对不上。
 * - 精选技能分区：原来的 4 个预置提示词都指向云端技能，换成两个自带的同类技能（故事成片 → 3D 动画短片，
 *   MG 科普动画 → 线条图解科普），提示词里的主题照抄；两个短剧技能没有对应的，去掉。
 *   这里的技能是用户在 Skill 页签点卡片时才用的，技能本身会被选中，所以「严格按照技能流程执行」的要求保留。
 */

/** 示例素材的路由前缀（不带开头的 `/`，Nest 的路由写法）。 */
export const HOME_SHOWCASE_ASSET_ROUTE = "api/v1/home/showcase-assets";

/**
 * assets/home-showcase/ 下的文件，文件名就是兜底配置里的附件名。静态路由只认这张表，
 * 名字不在表里一律 404，不拿请求里的路径去拼文件系统路径。
 * 使用教程 PDF 和「原始照片」（平面设计场景用的）、「产品界面图」（见下面「产品动画」）没有示例引用，照样放着，文件名不改。
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
 */
export const homeShowcaseAssetUrl = (name: AssetName) => `/${HOME_SHOWCASE_ASSET_ROUTE}/${encodeURIComponent(name)}`;

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
      zh: "生成一张完整的角色分镜设定图。图1是男主 [男主参考.png]，图2是师姐 [师姐参考.png]。场景：雪夜竹林，师姐被一群黑衣人围攻倒地，男主踏雪赶到，一剑斩下首领。风格：水墨古风加金粉效果。16:9 横版。",
      en: "Generate a full character storyboard composition for the following scene. Image 1 is the male lead [male lead.png], Image 2 is the senior sister [senior sister.png]. Scene: a snowy night in a bamboo forest — the senior sister has been cornered and knocked down by a group of men in black, the male lead arrives through the snow and cuts down their leader in one strike. Style: ink-wash ancient Chinese aesthetic with gold dust effects. 16:9 landscape.",
    },
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
      zh: "为竖屏短剧的女主苏晚生成角色视觉卡：古装造型 3 套 + 现代职场造型 2 套，保持脸型、五官和神态高度一致，适配竖屏短剧拍摄参考。",
      en: "Generate visual reference cards for Su Wan, the female lead of a vertical short drama: 3 period-drama looks + 2 modern office outfits. Keep facial features and expressions consistent across all versions.",
    },
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
    skill: "koc-video",
    // 原来的封面「产品界面图」是参照产品首页的截图，品牌名就印在图上，去掉；卡片退回渲染层自带的电商场景配图。
    media: "video",
    attachments: [],
  }),
];

/** 精选技能分区里的预置提示词：用户在 Skill 页签点这些技能时，输入框里填的就是这一句。 */
const FEATURED_SKILL_PRESETS = [
  {
    skill: "3d-animation-short-generator",
    prompt: {
      zh: "帮我把一个故事灵感变成完整视频，主题是【驯服巨兽的少年】。严格按照skill的流程执行，每个步骤主动询问用户，卡片弹窗形式询问，不需遗漏步骤，不需擅自发挥",
      en: 'Turn a story idea titled "The Boy Who Tamed a Giant Beast" into a complete video. Follow the skill workflow exactly, ask before every step with question cards, and do not skip or improvise steps.',
    },
    tag: { zh: "影视", en: "Film & TV" },
  },
  {
    skill: "line-doodle-explainer-generator",
    prompt: {
      zh: "帮我制作一支科普动画，主题是【黑洞到底是什么？】。严格按照skill的流程执行，每个步骤主动询问用户，卡片弹窗形式询问，不需遗漏步骤，不需擅自发挥",
      en: 'Create an explainer animation titled "What Exactly Is a Black Hole?". Follow the skill workflow exactly, ask before every step with question cards, and do not skip or improvise steps.',
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
    {
      type: "skill",
      id: "official-featured",
      title: { zh: "Skill", en: "Skills" },
      source: "official-featured",
      items: FEATURED_SKILL_PRESETS,
    },
  ],
};
