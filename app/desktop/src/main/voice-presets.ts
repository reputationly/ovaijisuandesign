import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

import type { ResourceRoots } from "./opencode/index.js";

export interface VoicePreset {
  id: string;
  file: string;
  label: string;
  language?: string;
  gender?: string;
}

/** 自带音色在哪：发布包 `resources/voice-presets`，开发时仓库的 `assets/voice-presets`。 */
export function locateBundledVoicePresets(roots: ResourceRoots): string | undefined {
  return [
    roots.resources && path.join(roots.resources, "voice-presets"),
    roots.repoRoot && path.join(roots.repoRoot, "assets/voice-presets"),
  ].find((dir): dir is string => !!dir && existsSync(dir) && statSync(dir).isDirectory());
}

export function readPresetManifest(dir: string): VoicePreset[] {
  try {
    const raw = JSON.parse(readFileSync(path.join(dir, "presets.json"), "utf8")) as { voices?: VoicePreset[] };
    return (raw.voices ?? []).filter((v) => typeof v?.id === "string" && typeof v?.file === "string");
  } catch {
    return [];
  }
}

/**
 * 把随包的预置音色铺到 `<hub>/voice-presets/`，并登记进 `config.json` 的 `models.voice_map`。
 *
 * 为什么必须登记进 voice_map：平台上**没有任何模型吃预设音色名**（报错原文「音色是一段
 * 参考音频而非预设名」），`synthesizeSpeech` 也只在 `voice_map` 里查参考音频。所以"预置音色"
 * 只能是随包带的样本文件 + 一条映射。不这么做，用户拿到的 voice_search 永远是空的，
 * 助手只能回一句"去设置里配音色"，而设置里根本没有可配的地方。
 *
 * 只**补缺**、不改用户已有映射：用户自己克隆/改过的音色优先。
 */
export function seedVoicePresets(
  src: string,
  destDir: string,
  configPath: string,
): { copied: number; registered: string[]; speechModelSet?: string } {
  mkdirSync(destDir, { recursive: true });
  let copied = 0;
  for (const name of readdirSync(src)) {
    const from = path.join(src, name);
    const to = path.join(destDir, name);
    if (name.startsWith(".") || !statSync(from).isFile()) continue;
    // 样本只在缺失时拷：用户替换过同名文件就尊重用户的。
    if (existsSync(to)) continue;
    copyFileSync(from, to);
    copied += 1;
  }

  const presets = readPresetManifest(destDir);
  if (presets.length === 0) return { copied, registered: [] };

  let config: Record<string, unknown> = {};
  if (existsSync(configPath)) {
    try {
      config = JSON.parse(readFileSync(configPath, "utf8")) as Record<string, unknown>;
    } catch {
      // 配置坏了不该让应用起不来：这条只是"顺手登记音色"，失败就跳过。
      return { copied, registered: [] };
    }
  }
  const models = (config.models && typeof config.models === "object" ? config.models : {}) as Record<string, unknown>;
  const voiceMap = (models.voice_map && typeof models.voice_map === "object" ? models.voice_map : {}) as Record<string, unknown>;

  const registered: string[] = [];
  for (const preset of presets) {
    const file = path.join(destDir, preset.file);
    if (!existsSync(file)) continue;
    if (typeof voiceMap[preset.id] === "string") continue;
    voiceMap[preset.id] = file;
    registered.push(preset.id);
  }
  // 语音模型没配时补一个（目录里的语音能力就这一个）；配了就不动。
  let speechModelSet: string | undefined;
  if (!models.speech) {
    models.speech = "indextts-2.5";
    speechModelSet = "indextts-2.5";
  }
  models.voice_map = voiceMap;
  config.models = models;
  if (registered.length > 0 || speechModelSet) {
    writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
  }
  return { copied, registered, speechModelSet };
}
