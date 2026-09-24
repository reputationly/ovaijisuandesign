import { z } from "zod";

import { errorMessage, type GatewayClient } from "../gateway-client.js";

/**
 * 预置音色目录：`GET /api/speech/voices?page_size=1000`，进程内缓存 1 小时。
 * 空列表不入缓存 —— gateway 刚起来时可能还没拉到目录，下次再查。
 */

export const VoiceInfoSchema = z.object({
  voice_id: z.string(),
  name: z.string().catch(""),
  description: z.string().catch(""),
  language: z.string().catch(""),
  gender: z.string().catch(""),
  age: z.string().catch(""),
  accent: z.string().catch(""),
  sample_audio: z.string().catch(""),
});
export type VoiceInfo = z.infer<typeof VoiceInfoSchema>;

export const VOICE_CACHE_TTL_MS = 60 * 60_000;
let cached: VoiceInfo[] = [];
let cachedAt = 0;

export function resetVoiceCache(): void {
  cached = [];
  cachedAt = 0;
}

/** 查询失败按空目录处理：音色校验放行、目录搜索回单项失败，不让整个调用抛错。 */
export async function fetchVoicesWithCache(gw: GatewayClient): Promise<VoiceInfo[]> {
  if (cached.length > 0 && Date.now() - cachedAt < VOICE_CACHE_TTL_MS) return cached;
  try {
    const voices = await gw.get("/api/speech/voices?page_size=1000", 10_000, z.array(VoiceInfoSchema));
    if (voices.length > 0) {
      cached = voices;
      cachedAt = Date.now();
    }
  } catch (err) {
    process.stderr.write(`[hilo-tools] voice list fetch failed: ${errorMessage(err)}\n`);
  }
  return cached;
}

// 目录里的 language / gender 是按发布区域的文案给的：国内是中文名，海外是英文名
export const DOMESTIC_LANGUAGES = [
  "中文",
  "英语",
  "葡萄牙语",
  "日语",
  "韩语",
  "法语",
  "德语",
  "西班牙语",
  "意大利语",
  "俄语",
  "阿拉伯语",
  "印尼语",
  "荷兰语",
  "泰语",
  "越南语",
  "印地语",
  "波兰语",
  "罗马尼亚语",
  "捷克语",
  "芬兰语",
  "马来语",
  "土耳其语",
  "乌克兰语",
  "保加利亚语",
  "丹麦语",
  "希伯来语",
  "波斯语",
  "斯洛伐克语",
  "瑞典语",
  "克罗地亚语",
  "菲律宾语",
  "匈牙利语",
  "挪威语",
  "斯洛文尼亚语",
  "加泰罗尼亚语",
  "希腊语",
  "泰米尔",
  "阿非利卡语",
  "尼诺斯克",
] as const;

export const OVERSEAS_LANGUAGES = [
  "Chinese",
  "English",
  "Portuguese",
  "Japanese",
  "Korean",
  "French",
  "German",
  "Spanish",
  "Italian",
  "Russian",
  "Arabic",
  "Indonesian",
  "Dutch",
  "Thai",
  "Vietnamese",
  "Hindi",
  "Polish",
  "Romanian",
  "Czech",
  "Finnish",
  "Malay",
  "Turkish",
  "Ukrainian",
  "Bulgarian",
  "Danish",
  "Hebrew",
  "Persian",
  "Slovak",
  "Swedish",
  "Croatian",
  "Filipino",
  "Hungarian",
  "Norwegian",
  "Slovenian",
  "Catalan",
  "Greek",
  "Tamil",
  "Afrikaans",
  "Nynorsk",
] as const;

export const DOMESTIC_GENDERS = ["女", "男"] as const;
export const OVERSEAS_GENDERS = ["Female", "Male"] as const;

/** 目录语言可能带后缀（如 “英语（美式）”），按前缀匹配。 */
export function filterByLanguage(voices: VoiceInfo[], language: string): VoiceInfo[] {
  const prefix = language.toLowerCase();
  const out: VoiceInfo[] = [];
  for (const voice of voices) {
    if (voice.language.toLowerCase().startsWith(prefix)) out.push(voice);
  }
  return out;
}

export function matchesGender(voiceGender: string, query: string): boolean {
  const g = voiceGender.toLowerCase();
  const q = query.toLowerCase();
  return g === q || g.startsWith(q) || q.startsWith(g);
}

/** agent 常写 “english” / “female”，大小写不敏感地映射回枚举值再校验。 */
export function caseInsensitiveEnumLookup(values: readonly string[], val: unknown): unknown {
  if (typeof val !== "string") return val;
  const lower = val.toLowerCase();
  return values.find((e) => e.toLowerCase() === lower) ?? val;
}

export function publicVoice(v: VoiceInfo): VoiceInfo {
  return {
    voice_id: v.voice_id,
    name: v.name,
    language: v.language,
    gender: v.gender,
    age: v.age,
    accent: v.accent,
    description: v.description,
    sample_audio: v.sample_audio,
  };
}

/**
 * 校验 agent 给的 voice_id 在目录里。默认音色、克隆 / 设计产出的 id（`hub_` / `ttv` 开头）
 * 不在目录里，直接放行。目录为空（拉不到）时也放行。
 */
export async function voiceIdValidationError(gw: GatewayClient, voiceIds: string[]): Promise<string | null> {
  const voices = await fetchVoicesWithCache(gw);
  if (voices.length === 0) return null;
  for (const vid of new Set(voiceIds)) {
    if (vid === "Friendly_Person" || vid.startsWith("hub_") || vid.startsWith("ttv")) continue;
    if (voices.some((v) => v.voice_id === vid)) continue;
    const needle = vid.toLowerCase();
    const suggestions = voices
      .filter((v) => v.voice_id.toLowerCase().includes(needle) || needle.includes(v.voice_id.toLowerCase()))
      .slice(0, 5);
    const hint =
      suggestions.length > 0
        ? `\nClosest catalog matches: ${suggestions.map((v) => `${v.voice_id} (${v.name}, ${v.language})`).join(", ")}`
        : "\nUse hub_voice_prepare (action=search_catalog) to look up valid voices.";
    return `Error: the voice catalog has no voice_id "${vid}".${hint}`;
  }
  return null;
}
