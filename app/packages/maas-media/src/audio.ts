// 语音与音乐。
//
// 和视频、超分同构 —— 都挂在 `POST /v1/videos` 下，靠 `metadata.task_type`
// 区分（`tts` / `t2m` / `cover` / `repaint`），所以复用
// `video.submitAndPoll`。
//
// **这个模块里几乎每个键位错误都是不报错的。** 三个音频键彼此不通用、
// 两个音乐引擎的映射正好相反、纯器乐和"有词但没给词"在上游是同一个现象。
// 每处都记了实测依据，改之前先去平台复测。

import { enhanceMusicCaption } from "./caption.js";
import type { Client } from "./client.js";
import { type MediaConfig, MusicEngine, resolveMusicEngine } from "./config.js";
import { PlatformError } from "./error.js";
import { Modality, route } from "./route.js";
import { charCount } from "./text.js";
import { submitAndPoll } from "./video.js";

// ---------------------------------------------------------------------------
// 语音
// ---------------------------------------------------------------------------

/**
 * 语音合成，返回音频的公网 URL。
 *
 * `voiceId` 必须能在 `models.voice_map` 里找到对应的参考音频 ——
 * 平台上**没有任何模型吃预设音色名**（报错原文：「音色是一段参考音频而非
 * 预设名」），只能靠零样本克隆逼近。
 *
 * 映射不到就报错，**不挑一个顶上**：用户会听到一个完全陌生的声音而没有
 * 任何提示，语音是最容易"听出来不对但说不清哪里不对"的模态。
 */
export async function synthesizeSpeech(
  client: Client,
  cfg: MediaConfig,
  text: string,
  voiceId: string,
  modelId?: string | null,
): Promise<string> {
  const model = route(cfg.models, modelId, Modality.Speech)?.model;
  if (model === undefined) {
    throw PlatformError.config("models.speech 未配置，这个能力不可用");
  }

  // `Object.hasOwn` 而不是 `voice_map[voiceId]`：后者对 `"constructor"`、
  // `"toString"` 这种音色名会从原型链上摸出一个函数来，当成参考音频发出去。
  if (!Object.hasOwn(cfg.models.voice_map, voiceId)) {
    throw PlatformError.config(
      `音色 ${voiceId} 没有配置映射：在 voice_map 里为它指定一段参考音频`,
    );
  }
  const reference = cfg.models.voice_map[voiceId];

  const metadata: Record<string, unknown> = {};
  metadata.task_type = "tts";
  // 参考音色走 metadata.voice —— 实测报错原文：「任务类型 tts 需要参考音色:
  // 请在 metadata.voice 提供音频 URL 或 base64」。
  //
  // 不是 metadata.audio（那是被驱动的素材，如口型同步的音轨），
  // 也不是 reference_audios（那是 r2va 的参考音色，另一条链路）。
  // 三个键语义各不相同，用错了平台会说"缺参考音色"而不是静默出错。
  metadata.voice = reference;

  const body = {
    model,
    prompt: text,
    metadata,
  };
  return submitAndPoll(client, cfg, body);
}

// ---------------------------------------------------------------------------
// 音乐
// ---------------------------------------------------------------------------

/**
 * 一次音乐请求要的是什么。
 *
 * 单独一个枚举而不是 `boolean`，是为了留住第三种情况：
 *
 * | 调用方声明 | 歌词 | 语义 |
 * |---|---|---|
 * | 明确要器乐 | — | `Instrumental` |
 * | 明确要有词 | 空 | `LyricsMissing` —— 矛盾请求，报错 |
 * | 明确要有词 | 有 | `Vocal` |
 * | 没声明 | 空 | `Instrumental`（按空歌词推断） |
 *
 * 中间那行是关键：合成一个 bool（`flag || lyrics === ""`）会把
 * "我要有词"翻成反面，产出一首没人声的曲子，用户听到才发现。
 */
export type MusicIntent = "vocal" | "instrumental" | "lyrics_missing";

export const MusicIntent = {
  Vocal: "vocal",
  Instrumental: "instrumental",
  LyricsMissing: "lyrics_missing",

  /**
   * 从「是否声明了器乐」和「有没有歌词」推断。
   *
   * `isInstrumental` 可空而不是 `boolean`：要区分「没给这个字段」
   * 和「明确给了 false」。
   */
  infer(isInstrumental: boolean | null | undefined, lyrics: string): MusicIntent {
    const empty = lyrics.trim() === "";
    if (isInstrumental === true) return "instrumental";
    if (isInstrumental === false) return empty ? "lyrics_missing" : "vocal";
    return empty ? "instrumental" : "vocal";
  },
} as const;

/**
 * Music3 纯器乐时放进 `prompt` 的占位。
 *
 * 不能发空串：平台对 `tts`（Music3 的 t2m 会被改写成它）有硬校验
 * 「需要合成文本(prompt)」，空的直接 400 —— 而这个失败发生在**调用方已经
 * 拿到 task_id 之后**，界面上是一个转半天再红掉的节点。
 *
 * `[Instrumental]` 是 Music3 README 列出的合法段落标记之一，既满足非空，
 * 又正好表达"这段没有唱词"。
 *
 * @internal
 */
export const MUSIC3_INSTRUMENTAL_INPUT = "[Instrumental]";

/**
 * 文生音乐，返回音频的公网 URL。
 *
 * `instructions` 是风格描述，`lyrics` 是歌词。**两者必须分开传** ——
 * 揉在一起会丢掉其中一路，而且不报错。
 */
export async function generateMusic(
  client: Client,
  cfg: MediaConfig,
  instructions: string,
  lyrics: string,
  intent: MusicIntent,
  modelId?: string | null,
): Promise<string> {
  const model = route(cfg.models, modelId, Modality.Music)?.model;
  if (model === undefined) {
    throw PlatformError.config("models.music 未配置，这个能力不可用");
  }

  if (instructions.trim() === "") {
    // Music3 强制要求它存在（报错原文：「it is what decides the
    // arrangement」）；ACE-Step 不强制，所以这个缺口只测 ace-step 时看不出来。
    throw PlatformError.config("音乐生成缺少风格描述：需要给出流派 / 配器 / 速度 / 情绪");
  }

  if (intent === MusicIntent.LyricsMissing) {
    throw PlatformError.config(
      "音乐请求声明了要有唱词却没有提供歌词：请给出歌词，或明确改成纯器乐",
    );
  }
  const instrumental = intent === MusicIntent.Instrumental;

  const resolved = resolveMusicEngine(cfg.models, model);
  if (!resolved.ok) {
    throw PlatformError.config(resolved.error);
  }
  const engine = resolved.value;

  // 把一句话展开成三段式 caption。Music3 是照结构化 caption 训练的，
  // 喂一句话它只能自己脑补编曲 —— 出来"是那个流派"但没有段落发展。
  //
  // 增强失败时退回原描述而不是让整次生成失败：那样至少还有歌听。
  // 但一定要 WARN —— 这类降级不出声的话，下次问「为什么不好听」查不到原因。
  let caption: string;
  if (shouldEnhance(cfg, engine)) {
    try {
      caption = await enhanceMusicCaption(client, cfg, instructions, lyrics, instrumental);
    } catch (err) {
      // 只有平台错误（Rust 里的 `Err(PlatformError)`）才降级；别的异常是
      // 我们自己的 bug，Rust 那边对应的是 panic，不该被这里吞掉。
      if (!(err instanceof PlatformError)) throw err;
      client.logger.warn(`caption 增强失败，退回原描述: ${err.message}`, { code: err.code });
      caption = instructions;
    }
  } else {
    caption = instructions;
  }

  // 记下真正发出去的 caption。排查音质时缺了这条就只能看到"开始生成"，
  // 不知道模型收到的是什么。
  client.logger.info(`音乐 caption: ${caption}`, {
    model,
    engine,
    instrumental,
    caption_chars: charCount(caption),
    lyrics_chars: charCount(lyrics),
  });

  return submitAndPoll(client, cfg, musicBody(engine, model, caption, lyrics, instrumental));
}

/**
 * 这次要不要做 caption 增强。
 *
 * 抽成函数是为了能直接断言这个决策 —— 内联的话，增强失败会 WARN 后回退、
 * 不中断流程，于是"走没走增强"在返回值上看不出来，测试只能假通过。
 *
 * @internal
 */
export function shouldEnhance(cfg: MediaConfig, engine: MusicEngine): boolean {
  return cfg.models.enhance_music_caption && engine === MusicEngine.Music3;
}

/**
 * 组文生音乐的请求体。
 *
 * 单独抽出来是为了能直接断言键的落位 —— **两个引擎的映射正好相反**，
 * 放错不报错，只能靠测试守住。
 *
 * @internal
 */
export function musicBody(
  engine: MusicEngine,
  model: string,
  caption: string,
  lyrics: string,
  instrumental: boolean,
): { model: string; prompt: string; metadata: Record<string, unknown> } {
  const metadata: Record<string, unknown> = {};
  metadata.task_type = "t2m";

  let prompt: string;
  switch (engine) {
    case MusicEngine.Music3:
      // caption 走 metadata，歌词走顶层 prompt。
      //
      // 依据：引擎是 `build_prompt(instructions, input)`，而网关把顶层
      // `prompt` 映射到 `input`；`metadata.lyrics` 虽然会被透传，
      // 但引擎 schema 里没有它，到了就丢。
      metadata.instructions = caption;
      prompt = instrumental || lyrics === "" ? MUSIC3_INSTRUMENTAL_INPUT : lyrics;
      break;
    case MusicEngine.AceStep:
      // 完全相反：caption 走顶层 prompt，歌词走 metadata.lyrics。
      //
      // 纯器乐**不发** lyrics 键，而不是发空串 —— 空歌词和"没有歌词"
      // 在引擎侧不等价。
      if (!instrumental && lyrics !== "") {
        metadata.lyrics = lyrics;
      }
      prompt = caption;
      break;
  }

  return {
    model,
    prompt,
    metadata,
  };
}

// ---------------------------------------------------------------------------
// 音乐编辑
// ---------------------------------------------------------------------------

/**
 * 音乐编辑的两种玩法。
 *
 * **各自读不同的 metadata 键**，而且传错了不会报「键不认识」，
 * 而是报「缺少音频」—— 症状指向缺参数，根因是键名错，很难对上。
 * 实测三个音频键彼此不通用：
 *
 * | task_type | 键 |
 * |---|---|
 * | `tts` | `metadata.voice` |
 * | `cover` | `metadata.reference_audio` |
 * | `repaint` | `metadata.src_audio` |
 */
export type MusicEdit =
  /** 覆盖生成：以参考音频的风格重新演绎。 */
  | "cover"
  /** 音乐重绘：在源音频基础上局部改写。 */
  | "repaint";

export const MusicEdit = {
  Cover: "cover",
  Repaint: "repaint",

  taskType(kind: MusicEdit): string {
    switch (kind) {
      case "cover":
        return "cover";
      case "repaint":
        return "repaint";
    }
  },

  audioKey(kind: MusicEdit): string {
    switch (kind) {
      case "cover":
        return "reference_audio";
      case "repaint":
        return "src_audio";
    }
  },
} as const;

/**
 * 拿一段已有音频，按提示词重新演绎或局部改写。
 *
 * 只有 ACE-Step 支持这两个 task_type，Music3 只能文生音乐。所以这里单独取
 * `models.music_edit`，没配就报错 —— 拿文生音乐顶上会返回一段和原曲**完全
 * 无关**的音乐：有声音、不报错，但不是用户要的东西。
 */
export async function editMusic(
  client: Client,
  cfg: MediaConfig,
  kind: MusicEdit,
  prompt: string,
  sourceAudio: string,
  lyrics: string,
  modelId?: string | null,
): Promise<string> {
  const model = route(cfg.models, modelId, Modality.MusicEdit)?.model;
  if (model === undefined) {
    throw PlatformError.config("models.music_edit 未配置，这个能力不可用");
  }

  const metadata: Record<string, unknown> = {};
  metadata.task_type = MusicEdit.taskType(kind);
  metadata[MusicEdit.audioKey(kind)] = sourceAudio;
  // 翻唱只有 ACE-Step 一条路，所以歌词固定走 `metadata.lyrics` ——
  // 和文生音乐里 ACE-Step 那一支同一个映射，见 {@link musicBody}。
  //
  // 空歌词**不发这个键**，而不是发空串：不发表示"照着参考音频里的词唱"，
  // 发空串是"没有词"，两者在引擎侧不等价，而且都不报错。
  if (lyrics.trim() !== "") {
    metadata.lyrics = lyrics;
  }

  const body = {
    model,
    prompt,
    metadata,
  };
  return submitAndPoll(client, cfg, body);
}
