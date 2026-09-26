// 外部模型名 → 我们平台上的模型。
//
// ## 为什么要有这一层
//
// 工具的**入参保持外部那套原样不动**（`vendor` / `model_id` / `model_name`），
// agent 照着现成的提示词调过来就能用；真正发请求时才把它换成我们平台上配的
// 那个模型。
//
// 好处是两边的接口面不分叉：上游工具定义变了，重跑 `scripts/extract-mcp-tools.py`，
// 差异一眼能看出来；而我们换后端模型只动 `config.json`，不碰工具定义。
//
// 不做这一层的话有两种坏法，都不报错：
//
// - **不声明 `model_id`**：MCP 对多余的参数是静默丢弃，agent 以为自己指定了
//   `nano-banana`，实际上一直在用默认模型。
// - **直接透传**：我们平台上没有 `nano-banana` 这个名字，请求会被上游拒掉，
//   而错误信息是"模型不存在"，看不出是名字没映射。
//
// ## 映射不上怎么办
//
// **退回该模态的默认模型，并在结果里如实说明**。硬失败对 agent 没有帮助 ——
// 它手里的提示词是通用的，不可能知道这台机器上配了什么；而静默换掉又会让人以为
// 用的是它要的那个。折中是"照做 + 告诉你换了"。

import type { Models } from "./config.js";
import { asciiLower, eqIgnoreAsciiCase } from "./text.js";

/** 一次路由的结果。 */
export interface Routed {
  /** 实际要发给平台的模型名。 */
  model: string;
  /** 调用方原本要的那个（外部名）。没指定就是 `null`。 */
  requested: string | null;
  /** 是否发生了替换。**要回给调用方** —— 见模块注释。 */
  substituted: boolean;
}

function exact(model: string): Routed {
  return { model, requested: null, substituted: false };
}

/**
 * 模态。决定映射不上时退回哪个默认模型。
 *
 * 取值和 `params.forModality` 收的模态字符串是同一套，界面、参数表、路由
 * 三处说的是一种语言。
 */
export const Modality = {
  Image: "image",
  ImageEdit: "image_edit",
  Video: "video",
  VideoRef: "video_ref",
  Music: "music",
  /** 翻唱 / 重绘。**和 `Music` 是两个 checkpoint**，见 {@link defaultFor}。 */
  MusicEdit: "music_edit",
  Speech: "speech",
} as const;
export type Modality = (typeof Modality)[keyof typeof Modality];

/**
 * {@link modalityOf} 的公开版本。
 *
 * 设置页要按模态给模型分组。**分类只有这一份** —— 界面上按一套规则分组、
 * 请求时按另一套路由的话，用户会在"图片"下拉里选到一个实际走视频端点的
 * 模型，而这种不一致只有生成失败时才看得见。
 */
export function modalityOfPublic(name: string): Modality | null {
  return modalityOf(name);
}

const OUR_IMAGE_MODELS = new Set(["z-image", "id4", "kr2", "hunyuan-image-3", "sensenova-u1.5"]);

/**
 * 外部模型名 → 模态。
 *
 * **只认名字，不认 vendor**：同一个 vendor 下有多个模态（`seedream` 既出图
 * 也做图层分解），而模型名本身是唯一的。
 *
 * 名字取自工具定义里出现过的那些，见 `docs/mcp-tools.md` 旁边的提取脚本。
 * 认不出来的一律走默认 —— 外部随时会冒出新模型名，认不出不该变成一次失败。
 *
 * @internal
 */
export function modalityOf(name: string): Modality | null {
  const n = asciiLower(name).replaceAll("_", "-");
  // 顺序有讲究：先判更具体的后缀，否则 `qwen-image-edit` 会被 `qwen-image`
  // 那条先命中，于是所有图生图请求都走成了文生图。
  if (n.includes("edit") || n.includes("layer-decompose")) {
    return Modality.ImageEdit;
  }
  if (
    n.startsWith("nano-banana") ||
    n.startsWith("gpt-image") ||
    n.startsWith("seedream") ||
    n.startsWith("qwen-image") ||
    n.startsWith("sd-") ||
    n === "sdbl" ||
    n.startsWith("flux") ||
    n.startsWith("midjourney") ||
    n.startsWith("jimeng") ||
    // 我们平台上的出图模型。名字里没有 image / t2i 之类的线索，
    // **只能列出来** —— 认不出的话 `route()` 会把它们悄悄换成默认那个，
    // 用户点名要 z-image 却拿到 qwen-image 出的图。
    OUR_IMAGE_MODELS.has(n)
  ) {
    return Modality.Image;
  }
  // 和 image-edit 那条一个道理：`music-cover` 里含 `music`，
  // 顺序写反的话翻唱会静默走成文生音乐 —— 出来一首和原曲**完全无关**
  // 的歌，有声音、不报错。
  // `ace-step` 是我们平台上吃 cover / repaint 的那个 checkpoint，
  // 名字里没有任何线索，只能点名。
  if (n.includes("cover") || n.includes("repaint") || n === "ace-step") {
    return Modality.MusicEdit;
  }
  if (n.includes("music")) {
    return Modality.Music;
  }
  if (n.startsWith("speech") || n.startsWith("t2a") || n.startsWith("abab") || n.includes("tts")) {
    return Modality.Speech;
  }
  if (n.includes("ref2v") || n.includes("reference")) {
    return Modality.VideoRef;
  }
  if (
    n.startsWith("minimax-h3") ||
    n.startsWith("minimax-hailuo") ||
    n.startsWith("hailuo") ||
    n.startsWith("kling") ||
    n.startsWith("seedance") ||
    n.includes("video")
  ) {
    return Modality.Video;
  }
  // 视频修复/超分。`swiftvr` / `seedvr2` 名字里只有 "vr",
  // 上面那串一个都命中不了。
  if (n.endsWith("vr") || n.endsWith("vr2")) {
    return Modality.Video;
  }
  return null;
}

/** @internal */
export function defaultFor(models: Models, m: Modality): string | null {
  switch (m) {
    case Modality.Image:
      return models.image;
    // 图生图没单独配时退回文生图那个 —— 有些平台是同一个 checkpoint。
    case Modality.ImageEdit:
      return models.image_edit ?? models.image;
    case Modality.Video:
      return models.video;
    case Modality.VideoRef:
      return models.video_ref ?? models.video;
    case Modality.Music:
      return models.music;
    // **不退回 `music`。** 只有 ACE-Step 吃 cover / repaint 这两个
    // task_type；拿文生音乐顶上会返回一段和原曲完全无关的音乐 ——
    // 有声音、不报错，但不是用户要的东西。
    case Modality.MusicEdit:
      return models.music_edit;
    case Modality.Speech:
      return models.speech;
  }
}

/**
 * 把调用方给的模型名路由到我们平台上的模型。
 *
 * - 没给名字 → 直接用该模态的默认模型
 * - 给的名字**就是我们配的那个** → 原样用（允许直接指定我们自己的模型）
 * - 给的是外部名 → 换成我们的，并标记 `substituted`
 *
 * 该模态什么都没配时返回 `null`。
 */
export function route(
  models: Models,
  want: string | null | undefined,
  modality: Modality,
): Routed | null {
  const fallback = defaultFor(models, modality) ?? null;
  if (fallback === null) return null;
  const w = want?.trim() ?? "";
  if (w === "") {
    return exact(fallback);
  }

  // 调用方直接点名了我们配着的模型 —— 不要动它。
  // **`music_edit` 必须在这里面。** 漏掉它的话，调用方点名我们自己配的
  // 翻唱模型（ace-step）会走到下面的"认不出 → 退回本次模态的默认",
  // 也就是被换成文生音乐那个 —— 正是 `defaultFor` 里警告的那种失败：
  // 出来一段和原曲完全无关的音乐，有声音、不报错。
  const configured = [
    models.image,
    models.image_edit,
    models.video,
    models.video_ref,
    models.music,
    models.music_edit,
    models.speech,
  ];
  if (configured.some((m) => m !== null && m !== undefined && eqIgnoreAsciiCase(m, w))) {
    return exact(w);
  }

  // 外部名 → 按它的模态找我们的默认。认不出模态时也退回本次调用的模态，
  // 而不是失败：外部随时会冒出新模型名。
  // 名字只认得出"是视频"，分不出帧族还是参考族（`MiniMax-H3` 两族共用一个外部名）。这时以本次调用的
  // 模态为准：调用方是按玩法定的模态，参考生视频发去帧族模型会被平台拒（"r2va 需要参考图"）。
  // 出图 / 改图、音乐 / 翻唱同理。
  const named = modalityOf(w);
  const target = named !== null && sameFamily(named, modality) ? modality : (named ?? modality);
  const model = defaultFor(models, target) ?? fallback;
  return {
    substituted: !eqIgnoreAsciiCase(model, w),
    model,
    requested: w,
  };
}

/** 基础模态 → 它的特化槽位（帧族 → 参考族，出图 → 改图，音乐 → 翻唱）。 */
const SPECIALIZED: Partial<Record<Modality, Modality>> = {
  [Modality.Video]: Modality.VideoRef,
  [Modality.Image]: Modality.ImageEdit,
  [Modality.Music]: Modality.MusicEdit,
};

/**
 * 名字只认得出基础模态、而本次调用要的是它的特化槽位 —— 名字本身分不出来，以调用为准。
 * 反过来（名字明确是改图 / 参考 / 翻唱模型）照名字走：调用方点名了专门的模型。
 */
function sameFamily(named: Modality, requested: Modality): boolean {
  return named === requested || SPECIALIZED[named] === requested;
}
