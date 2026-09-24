/**
 * 「添加节点」菜单的内容。
 *
 * 官方在两处用同一份：画布上双击 / 底部 `+`（`canvas.addNode` = 「添加节点」），
 * 以及从节点的 ⊕ 拉出连线松手时（这时还会带上源节点，建出来的节点直接连上）。
 *
 * 文案逐字取自官方 i18n：
 *
 * ```
 * canvas.text  = 文本   canvas.textDesc  = 剧本、广告词、品牌文案
 * canvas.image = 图片   canvas.imageDesc = 海报、分镜、角色设计
 * canvas.video = 视频   canvas.videoDesc = 创意广告、动画、电影
 * canvas.audio = 音频   canvas.audioDesc = 音效、配音、音乐
 * ```
 *
 * 官方还有「3D 导演台」「视频剪辑」「ComfyUI 工作流」三条，**我们不放** ——
 * 那三个各是一整块子系统，给个菜单项只会让用户点进去发现什么都没有。
 */

/** 画布上的节点类型。和 `canvas.json` 里的 `type` 对齐。 */
export type NodeKind = "text" | "image" | "video" | "audio" | "table" | "group"

export interface AddNodeItem {
  kind: Exclude<NodeKind, "table" | "group">
  label: string
  desc: string
}

export const ADD_NODE_ITEMS: AddNodeItem[] = [
  { kind: "text", label: "文本", desc: "剧本、广告词、品牌文案" },
  { kind: "image", label: "图片", desc: "海报、分镜、角色设计" },
  { kind: "video", label: "视频", desc: "创意广告、动画、电影" },
  { kind: "audio", label: "音频", desc: "音效、配音、音乐" },
]

/**
 * 从某个类型的节点拉线出来，能建出哪些类型。逐字照官方的
 * `ALLOWED_TARGET_TYPES`：
 *
 * ```js
 * [Text]:  [Text, Audio, Video, Image]
 * [Table]: []
 * [Image]: [Image, Video, Text]
 * [Video]: [Video, Text]
 * [Audio]: [Text, Video, Audio]
 * ```
 *
 * **这张表就是"参数能不能传下去"。** 比如视频不能生图（`Video` 里没有
 * `Image`）—— 列出来的话用户会连一条线，然后拿到一张和上游毫无关系的图，
 * 而且不报错。
 *
 * 表里没有的类型（分组等）一律不给菜单：分组是容器，本身没有素材。
 */
const ALLOWED_TARGET_TYPES: Record<string, AddNodeItem["kind"][]> = {
  text: ["text", "audio", "video", "image"],
  table: [],
  image: ["image", "video", "text"],
  video: ["video", "text"],
  audio: ["text", "video", "audio"],
}

/**
 * 给定源节点类型，菜单该显示哪几条。
 *
 * `source` 为空表示不是从节点拉出来的（双击画布、点底部 `+`）——
 * 这时四条全给。
 */
export function addNodeItemsFor(source?: NodeKind | string): AddNodeItem[] {
  if (!source) return ADD_NODE_ITEMS
  const allowed = ALLOWED_TARGET_TYPES[source]
  // 认不出的类型**给空**，不是给全部。官方随时会加新节点类型，而"允许连到
  // 一个我们不理解的东西上"比"暂时连不了"糟得多。
  if (!allowed) return []
  return ADD_NODE_ITEMS.filter((i) => allowed.includes(i.kind))
}

/**
 * 点了某一类之后预填进输入框的引导语。
 *
 * 我们的输入框是把提示词交给 agent，**模态由模型自己从话里判断** ——
 * 不像官方那样由菜单直接建一个指定类型的节点。所以四条菜单要真有区别，
 * 得让这句话把模态说清楚。
 *
 * 不这么做的话，四条点下去做的是同一件事：一个假的四选一。
 *
 * 结尾留一个空格，光标接着往下打就是内容。
 */
export const ADD_NODE_LEAD_IN: Record<AddNodeItem["kind"], string> = {
  text: "写一段文字：",
  image: "生成一张图片：",
  video: "生成一段视频：",
  audio: "生成一段音频：",
}
