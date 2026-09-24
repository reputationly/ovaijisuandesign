// 歌词生成。
//
// 平台侧没有专门的歌词端点，所以这里**用对话模型自己写** ——
// 走的就是 `Platform.chat_model`，不引入第二处要维护的配置。
//
// ## 为什么要连歌名和风格标签一起回
//
// `lyrics_generation` 这个工具回的是 `song_title` + `style_tags` + `lyrics`
// 三样，agent 的工作流是「起草 → 原样念给用户确认 → 再去生成」。少回两样
// 的话，agent 只能自己编一个歌名 —— 而它编的和歌词里唱的经常对不上。
//
// `style_tags` 更实际：它直接喂给 `generate_audio_music` 的 `prompt`。
// 让写词的那次顺手把风格定下来，比让 agent 事后从歌词反推准得多。

import { complete, stripFences } from "./chat.js";
import type { Client } from "./client.js";
import type { MediaConfig } from "./config.js";
import { PlatformError } from "./error.js";
import { asciiLower, lines } from "./text.js";

/**
 * 写一段歌词是短输出，不需要给到出图那种量级。
 *
 * @internal
 */
export const TIMEOUT_MS = 90_000;

/**
 * 一段歌词本身只要几百 token，留出的都是给推理过程的余量。
 *
 * 给 800 时实测 qwen3.8-27b 会把额度全花在 reasoning 上，`content` 直接回
 * null 而 `finish_reason` 是 `length`。
 *
 * @internal
 */
export const MAX_TOKENS = 4000;

/**
 * 温度：歌词要有变化，但不能飘到听不懂。
 *
 * @internal
 */
export const TEMPERATURE = 0.8;

/*
 * 三段输出的分隔标记。
 *
 * **不用 JSON。** 歌词是多行的，里面还常有引号和方括号 —— 让模型把它塞进
 * 一个 JSON 字符串，转义错一个字整份就解不出来，而那时候歌词已经写好了、
 * 只是取不出来。行首标记做不到这种全损失败：最坏情况是标记没出现，
 * 那就把整段当歌词，见 `parse`。
 */
const LYRICS_MARK = "LYRICS:";
const TITLE_MARK = "TITLE:";
const STYLE_MARK = "STYLE:";

/**
 * 段落标记用方括号 + 首字母大写。
 *
 * 取自 MiniMax-Music3 README 列出的那一组 —— 模型是照这组写法训练的。
 * 小写实测也能出曲，但没有依据说它等价，不赌模型的宽容度。
 *
 * 真正会出事的是写成 `Verse 1:` 那种散文标题：**不报错**，只是让编曲拿不到
 * 结构信息，安静地退化成一段平铺的曲子。
 *
 * @internal
 */
export const SYSTEM_PROMPT = `你是歌词作者。按用户的要求产出一首歌的歌名、风格标签和完整歌词。

输出格式（严格照这三行开头，不要 Markdown、不要代码块、不要任何解释）：
TITLE: 歌名
STYLE: 逗号分隔的英文风格标签，如 Pop, Dance, Upbeat, Female Vocals
LYRICS:
（从下一行开始是歌词正文）

歌词要求：
1. 用方括号段落标记，首字母大写，只能用这几个：[Intro] [Verse] [Pre-Chorus] [Chorus] [Post-Chorus] [Bridge] [Instrumental] [Solo] [Outro]。
2. 至少包含两段 [Verse] 和两次 [Chorus]，副歌重复时词句保持一致。
3. 歌词语言跟随用户描述的语言；描述是中文就写中文，是英文就写英文。
4. 每行不超过 20 个字，适合演唱；不要写成散文。
5. 不要使用真实歌手、乐队或已有歌曲的名字与歌词。`;

/**
 * 这次是从头写还是改现成的。
 *
 * 工具的 `mode` 入参就这两个值（`write_full_song` / `edit`）。分开是因为两者的输入完全
 * 不同：从头写只有主题，改现成的必须**保住用户原来的意思** —— 当成从头写
 * 的话模型会重写一首，用户的原稿悄悄没了。
 */
export type Mode = "write_full_song" | "edit";

export const Mode = {
  WriteFullSong: "write_full_song",
  Edit: "edit",

  /**
   * 认不出的一律按从头写。入参只定义了两个值，多出来的只可能是笔误，
   * 而"从头写"是两者里丢东西更少的那个（`edit` 走错会改一份不存在的稿）。
   */
  parse(s: string | null | undefined): Mode {
    switch (asciiLower(s?.trim() ?? "")) {
      case "edit":
      case "polish":
      case "edit_lyrics":
        return "edit";
      default:
        return "write_full_song";
    }
  },
} as const;

/**
 * 一次起草的结果。字段名**一个字母都不能改** —— agent 的提示词里写的就是
 * 这三个，改了它会去读一个不存在的字段，拿到空歌名 / 空歌词而不报错。
 */
export interface Draft {
  song_title: string;
  style_tags: string;
  lyrics: string;
}

/** 起草或润色一首歌的歌词。 */
export async function draft(
  client: Client,
  cfg: MediaConfig,
  mode: Mode,
  prompt: string,
  lyrics: string,
  title?: string | null,
): Promise<Draft> {
  const p = prompt.trim();
  const l = lyrics.trim();
  let user: string;
  if (mode === "edit") {
    if (l === "") {
      // 空稿走 edit 只可能是 agent 选错了模式。让它去用
      // write_full_song，而不是给它一首凭空编的歌 ——
      // 那首歌会被当成"润色后的用户原稿"念给用户听。
      throw PlatformError.config(
        "edit 模式要给出待润色的歌词（lyrics）；从头写请用 write_full_song",
      );
    }
    user = "把下面这份歌词扩展并润色成一首完整的歌，保持原有的意思和意象：\n\n";
    user += l;
    if (p !== "") {
      user += "\n\n风格要求：";
      user += p;
    }
  } else {
    if (p === "") {
      throw PlatformError.config("歌词生成缺少风格描述：需要说明这首歌要写什么");
    }
    user = p;
  }

  const t = title?.trim() ?? "";
  if (t !== "") {
    user += "\n\n歌名用：";
    user += t;
  }

  const text = await complete(client, cfg, SYSTEM_PROMPT, user, TEMPERATURE, MAX_TOKENS, TIMEOUT_MS);
  const out = parse(text);
  if (out.lyrics === "") {
    // 空歌词会让音乐请求带着空 lyrics 发出去，产出一段无人声的曲子 ——
    // 有声音、不报错，但用户要的是有词的歌。宁可在这里失败。
    throw PlatformError.protocol("LLM 未返回歌词内容");
  }
  // 调用方点了名的歌名压过模型自己起的那个。
  if (t !== "") {
    out.song_title = t;
  }
  return out;
}

/**
 * 拆三段输出。
 *
 * **`LYRICS:` 找不到时把整段当歌词。** 模型偶尔会忘掉格式直接开始写词，
 * 那种情况下丢掉整份输出、报一个"格式不对"，比交出一首没有歌名的歌
 * 差得多 —— 歌名可以让用户补，歌词重写要再花一次额度和一分半钟。
 *
 * @internal
 */
export function parse(text: string): Draft {
  const body = stripFences(text);
  const at = body.indexOf(LYRICS_MARK);
  if (at < 0) {
    return {
      song_title: "",
      style_tags: "",
      lyrics: sanitize(body),
    };
  }
  const head = body.slice(0, at);
  const rest = body.slice(at);
  const lyrics = sanitize(rest.slice(LYRICS_MARK.length));
  return {
    song_title: field(head, TITLE_MARK),
    style_tags: field(head, STYLE_MARK),
    lyrics,
  };
}

/** 取某个行首标记后面那一行。 */
function field(head: string, mark: string): string {
  for (const line of lines(head)) {
    const t = line.trim();
    if (t.startsWith(mark)) return t.slice(mark.length).trim();
  }
  return "";
}

/**
 * 把 LLM 的输出收拾成引擎能吃的歌词。
 *
 * @internal
 */
export function sanitize(text: string): string {
  const body = stripFences(text);
  // 丢掉第一个段落标记之前的所有内容 —— 那里只可能是模型的开场白，
  // 混进去会被当成歌词唱出来。
  //
  // 找不到标记就整段保留：可能是模型没加标记，那也比清空强。
  const found = body.indexOf("[");
  const start = found < 0 ? 0 : found;
  return body.slice(start).trim();
}
