// 音乐描述增强。
//
// 调用方给的通常是一句话（「中文说唱，85 BPM，男声」），而 `minimax-music3`
// 是**照结构化 caption 训练的** —— 它的 README 原文：
//
// > For precise control, we recommend using a Structured Caption with three
// > sections: Global Metadata / Vocal Details / Arrangement.
// > This representation allows the model to follow not only a global style,
// > but also the musical development of the song over time.
//
// 直接把那一句话发过去**不会报错**，模型会自己脑补编曲 —— 出来的东西
// "是那个流派"但没有段落发展，听感平。所以这里先用 LLM 展开成三段式。
//
// ## 为什么用英文
//
// 顺带省预算：英文 4.77 字符/token，中文只有 1.48。三段式本身要 250-450 词，
// 这个差别不小。

import { complete, stripFences } from "./chat.js";
import type { Client } from "./client.js";
import type { MediaConfig } from "./config.js";
import { PlatformError } from "./error.js";
import { lines } from "./text.js";

/**
 * 比歌词长，因为要写 250-450 词。
 *
 * @internal
 */
export const TIMEOUT_MS = 120_000;

/**
 * 推理模型的思考过程和正文共用这个预算，留足余量。
 *
 * @internal
 */
export const MAX_TOKENS = 6000;

/** @internal */
export const TEMPERATURE = 0.7;

/**
 * 三段式契约。
 *
 * 没有照搬那一千个模板：它们是给能读本地文件的 agent 做渐进检索用的，
 * 而这里只有一次无状态的 LLM 调用。把契约本身写清楚已经能拿到大部分收益。
 *
 * @internal
 */
export const SYSTEM_PROMPT = `You rewrite a brief music request into a MiniMax Music 3 Structured Caption.

Return exactly these three headings, in this order, with no other text:

Global Metadata
Basic Attributes: bpm, key and scale when justified, and the genre / subgenre.
Global Emotional Progression: how the feeling moves from open to close.
Application Scenarios & Imagery: where this music would be heard.
Sonics & Production Profile: soundstage, frequency balance, dynamics.

Vocal Details
Vocal Gender & Timbre. Vocal Style. Harmony/Backing Vocals. Vocal FX.
For instrumental pieces, say so and name the instrument carrying the melody.

Arrangement
Instrument Lifecycle Description (Primary/Secondary Layering).
Groove & Foundation Progression.
Embellishments, Textures & Spatial FX.
Describe the song section by section: what enters, exits, changes or intensifies.

Rules:
- Write in English. About 250-450 words total.
- Preserve every explicit constraint from the request: tempo, vocal gender,
  instrumentation, mood, language of the singing, and any exclusion.
- Never contradict an explicit instrumental request by adding vocals.
- Do not invent an exact BPM or key when the request does not justify one.
- Do not output a song title, a reasoning trace, or any lyric line.
- Do not reference real artists, bands or existing songs.`;

/** 把一句话描述展开成三段式 caption。 */
export async function enhanceMusicCaption(
  client: Client,
  cfg: MediaConfig,
  brief: string,
  lyrics: string,
  instrumental: boolean,
): Promise<string> {
  const user = buildUserMessage(brief, lyrics, instrumental);
  const text = await complete(client, cfg, SYSTEM_PROMPT, user, TEMPERATURE, MAX_TOKENS, TIMEOUT_MS);
  const caption = stripFences(text);
  if (caption === "") {
    throw PlatformError.protocol("LLM 未返回 caption");
  }
  return caption;
}

/**
 * 组给 LLM 的用户消息。
 *
 * **只给段落标记，不给歌词正文**：正文对编曲没有帮助，却会诱导模型把词抄进
 * caption —— 那既占掉预算，又让同一段词在两个字段里出现两次。
 *
 * @internal
 */
export function buildUserMessage(brief: string, lyrics: string, instrumental: boolean): string {
  if (instrumental) {
    // 必须显式说出来。调用方那边"纯 BGM"是一个独立字段，风格描述里往往
    // 一个字都没提 —— 不说的话上面那条 "Never contradict an explicit
    // instrumental request" 就是空话，模型会自作主张加人声，而且不报错。
    return (
      `Music request: ${brief}\n` +
      "This piece is INSTRUMENTAL: no vocals at all. " +
      "Name the instrument that carries the melodic lead."
    );
  }
  if (lyrics.trim() === "") {
    return `Music request: ${brief}`;
  }
  const sections = lines(lyrics)
    .map((l) => l.trim())
    .filter((l) => l.startsWith("[") && l.endsWith("]"));
  return (
    `Music request: ${brief}\n` +
    `The lyrics use these sections in order: ${sections.length === 0 ? "(unmarked)" : sections.join(" ")}\n` +
    "Build the arrangement timeline around them."
  );
}
