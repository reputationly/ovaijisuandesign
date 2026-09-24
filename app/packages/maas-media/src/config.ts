// 这个包需要知道的全部配置。
//
// 刻意做得比调用方的配置窄：这里只有「平台在哪、用哪些模型」，
// 不掺任何关于「谁在调用、为什么调用」的东西。
//
// **键名保持蛇形**（`base_url` / `image_edit` / `voice_map` …）：这些类型就是
// Rust 时期 `config.json` 的形状（serde 派生），老用户的配置文件要原样读进来。
// `None` 在 JSON 里是 `null`，这里同样用 `null`。

import { PlatformError } from "./error.js";
import { asciiLower, isObject } from "./text.js";

/**
 * 平台的接入信息。
 *
 * 一个 OpenAI 兼容端点就够了 —— 图片、视频、语音、音乐、对话全在它下面。
 */
export interface Platform {
  /** 形如 `https://maas.example.com/v1`，尾部斜杠可有可无。 */
  base_url: string;
  api_key: string;
  /**
   * 写 caption / 歌词用的对话模型。
   *
   * 和媒体模型分开一个字段而不是复用某个媒体模型：这两处调的是
   * `/chat/completions`，跟出图出曲不是一类能力。
   */
  chat_model: string;
}

/** 去掉尾斜杠的 base，拼路径时用。 */
export function platformBase(p: Platform): string {
  return p.base_url.replace(/\/+$/, "");
}

/**
 * 音乐引擎族。决定 caption 和歌词各自落在哪个键上。
 *
 * **两个引擎的映射正好相反**：
 *
 * | | caption | 歌词 |
 * |---|---|---|
 * | `MusicEngine.Music3` | `metadata.instructions` | 顶层 `prompt` |
 * | `MusicEngine.AceStep` | 顶层 `prompt` | `metadata.lyrics` |
 *
 * 发反了**不会报错** —— 引擎会把歌词当风格描述、或者把风格描述一遍遍唱
 * 出来。出曲成功、时长正常、文件正常，只有听了才知道。所以推断不出来时
 * 宁可拒绝启动。
 *
 * 取值是 serde `rename_all = "snake_case"` 的结果，配置文件里就写这两个。
 */
export const MusicEngine = {
  Music3: "music3",
  AceStep: "ace_step",
} as const;
export type MusicEngine = (typeof MusicEngine)[keyof typeof MusicEngine];

/**
 * 各模态用哪个模型。
 *
 * 全是可空：没配的能力就是不可用，调用时报一个说得清的错，
 * 而不是拿别的模型顶上 —— 顶上去往往能成功返回一个完全不对的结果。
 */
export interface Models {
  /** 文生图，例如 `qwen-image`。 */
  image: string | null;
  /** 图生图，例如 `qwen-image-edit`。重绘 / 擦除都走这个。 */
  image_edit: string | null;
  /**
   * 首尾帧族，例如 `minimax-h3-fl2va`。
   *
   * 平台上这**一个 checkpoint 同时吃 t2v / i2v / l2va / flf2v** 四种玩法，
   * 靠 `metadata.task_type` 区分，所以不需要按玩法各配一个。
   */
  video: string | null;
  /** 参考生视频，例如 `minimax-h3-ref2va`。参考图 / 参考视频走这个。 */
  video_ref: string | null;
  /** 视频超分，例如 `swiftvr` / `seedvr2`。 */
  video_upscale: string | null;
  /**
   * 图片超分，例如 `swiftvr`。
   *
   * **和 `video_upscale` 分开配，哪怕填的是同一个 checkpoint** ——
   * 两条路走的接口根本不是一回事：视频超分走异步任务
   * （`metadata.task_type = "sr"` + `metadata.resolution` 档位词），
   * 图片超分走同步的 `/images/edits`（顶层 `image` + 精确 `size`）。
   * 合成一个键的话，换了视频超分的模型会静默改掉图片超分的行为。
   */
  image_upscale: string | null;
  /** 文生音乐，例如 `minimax-music3` / `ace-step`。 */
  music: string | null;
  /**
   * 音乐编辑，例如 `ace-step`。
   *
   * 和 `music` 分开配：只有 ACE-Step 支持 `cover`（覆盖生成）和
   * `repaint`（音乐重绘），`minimax-music3` 只能文生音乐。没配就报错，
   * 不拿文生音乐顶上 —— 那会返回一段和原曲无关的音乐，而用户要的是
   * 「这首歌换个唱法」。
   */
  music_edit: string | null;
  /** 语音合成，例如 `indextts-2.5`。 */
  speech: string | null;
  /**
   * 音乐引擎族。留空则按 `music` 的名字推断，
   * 推断不出来**报错而不是挑一个**，理由见 {@link MusicEngine}。
   */
  music_engine: MusicEngine | null;
  /**
   * 是否把一句话描述展开成 Music3 的三段式 caption。默认开。
   *
   * 不展开不会报错，只是编曲平淡 —— 属于安静的质量损失。
   * 代价是每次生成多一次 LLM 调用（十几到几十秒）。
   */
  enhance_music_caption: boolean;
  /**
   * `voice_id` → 参考音频（http URL / data URI / 本地绝对路径）。
   *
   * **平台上没有任何模型吃预设音色名**：`indextts-2.5` 的音色是一段参考
   * 音频，所以调用方给的音色标识必须能在这里换成音频。
   *
   * **映射不到就明确报错**，既不挑一个顶上（用户会听到一个完全陌生的
   * 声音而没有任何提示），也不静默跳过。
   */
  voice_map: Record<string, string>;
}

/**
 * 默认的 `Models`。
 *
 * 和 {@link parseModels} 读 `{}` 的结果**必须一致**：Rust 那边专门手写了
 * `Default` 而不是 derive —— `enhance_music_caption` 的 serde 默认是 `true`，
 * derive 出来的 `Default` 会给 `false`，两条路径给出相反的默认值，
 * 而且不报错。这里两条路径共用同一个起点来守住它。
 */
export function defaultModels(): Models {
  return {
    image: null,
    image_edit: null,
    video: null,
    video_ref: null,
    video_upscale: null,
    image_upscale: null,
    music: null,
    music_edit: null,
    speech: null,
    music_engine: null,
    enhance_music_caption: true,
    voice_map: {},
  };
}

/** 成功或一段说明。对应 Rust 的 `Result<T, String>`。 */
export type Result<T, E = string> = { ok: true; value: T } | { ok: false; error: E };

/** 解析音乐引擎族。显式配置优先，其次按模型名推断。 */
export function resolveMusicEngine(models: Models, model: string): Result<MusicEngine> {
  if (models.music_engine !== null && models.music_engine !== undefined) {
    return { ok: true, value: models.music_engine };
  }
  const lower = asciiLower(model);
  if (lower.includes("music3") || lower.includes("music-3")) {
    return { ok: true, value: MusicEngine.Music3 };
  }
  if (lower.includes("ace-step") || lower.includes("acestep")) {
    return { ok: true, value: MusicEngine.AceStep };
  }
  return {
    ok: false,
    error:
      `无法从模型名 \`${model}\` 判断音乐引擎族：请显式指定 music_engine ` +
      "（music3 或 ace_step）。两个引擎的 caption/歌词键位正好相反，" +
      "猜错不会报错，只会产出完全不对的音乐",
  };
}

/** 这个包的全部配置。 */
export interface MediaConfig {
  platform: Platform;
  models: Models;
}

/** Rust `MediaConfig::default()`：平台信息全空，模型全没配。 */
export function defaultMediaConfig(): MediaConfig {
  return {
    platform: { base_url: "", api_key: "", chat_model: "" },
    models: defaultModels(),
  };
}

/**
 * 取某个模态的模型，没配就给一个说得清缺什么的错误。
 *
 * 收口在一处是为了让"没配"永远是同一句话 —— 这类错误最后会显示在
 * 用户界面上，而"某个能力不可用"和"生成失败"该长得不一样。
 *
 * @internal
 */
export function configModel(
  cfg: MediaConfig,
  pick: (m: Models) => string | null | undefined,
  field: string,
): string {
  const m = pick(cfg.models);
  if (m === null || m === undefined) {
    throw PlatformError.config(`${field} 未配置，这个能力不可用`);
  }
  return m;
}

// ---------------------------------------------------------------------------
// 从 JSON 读
//
// 对应 serde 的 `Deserialize`。规则照搬 Rust 那边的属性：
//
// - `platform` 和它的三个字段**没有** `#[serde(default)]` —— 缺了就是错；
// - `models` 整段、以及它的每个字段都有默认值；
// - `Option` 字段接受 `null`；
// - 未知键忽略（serde 默认行为）。这一点很重要：网关的 `config.json` 是把
//   `MediaConfig` **flatten** 进去的，顶层还有 `port` / `workspace` 等键，
//   整份文件可以直接交给 `parseMediaConfig`。
// ---------------------------------------------------------------------------

function bad(path: string, want: string, got: unknown): PlatformError {
  const kind = got === null ? "null" : Array.isArray(got) ? "array" : typeof got;
  return PlatformError.config(`解析配置失败: ${path} 应当是${want}，实际是 ${kind}`);
}

function reqString(obj: Record<string, unknown>, key: string, path: string): string {
  if (!(key in obj)) throw PlatformError.config(`解析配置失败: 缺少字段 ${path}.${key}`);
  const v = obj[key];
  if (typeof v !== "string") throw bad(`${path}.${key}`, "字符串", v);
  return v;
}

function optString(obj: Record<string, unknown>, key: string, path: string): string | null {
  const v = obj[key];
  if (v === undefined || v === null) return null;
  if (typeof v !== "string") throw bad(`${path}.${key}`, "字符串或 null", v);
  return v;
}

/** 读 `platform` 段。三个字段都必须在。 */
export function parsePlatform(value: unknown): Platform {
  if (!isObject(value)) throw bad("platform", "对象", value);
  return {
    base_url: reqString(value, "base_url", "platform"),
    api_key: reqString(value, "api_key", "platform"),
    chat_model: reqString(value, "chat_model", "platform"),
  };
}

/** 读 `models` 段。每个字段都有默认值，`{}` 就是 {@link defaultModels}。 */
export function parseModels(value: unknown): Models {
  if (!isObject(value)) throw bad("models", "对象", value);
  const m = defaultModels();
  m.image = optString(value, "image", "models");
  m.image_edit = optString(value, "image_edit", "models");
  m.video = optString(value, "video", "models");
  m.video_ref = optString(value, "video_ref", "models");
  m.video_upscale = optString(value, "video_upscale", "models");
  m.image_upscale = optString(value, "image_upscale", "models");
  m.music = optString(value, "music", "models");
  m.music_edit = optString(value, "music_edit", "models");
  m.speech = optString(value, "speech", "models");

  const engine = value.music_engine;
  if (engine !== undefined && engine !== null) {
    if (engine !== MusicEngine.Music3 && engine !== MusicEngine.AceStep) {
      throw PlatformError.config(
        `解析配置失败: models.music_engine 只能是 music3 或 ace_step，实际是 ${JSON.stringify(engine)}`,
      );
    }
    m.music_engine = engine;
  }

  if ("enhance_music_caption" in value) {
    const v = value.enhance_music_caption;
    if (typeof v !== "boolean") throw bad("models.enhance_music_caption", "布尔值", v);
    m.enhance_music_caption = v;
  }

  if ("voice_map" in value) {
    const v = value.voice_map;
    if (!isObject(v)) throw bad("models.voice_map", "对象", v);
    // Rust 那边是 BTreeMap：按键排序。序列化回去时顺序一致，diff 才干净。
    const out: Record<string, string> = {};
    for (const k of Object.keys(v).sort()) {
      const ref = v[k];
      if (typeof ref !== "string") throw bad(`models.voice_map.${k}`, "字符串", ref);
      out[k] = ref;
    }
    m.voice_map = out;
  }
  return m;
}

/** 读整份配置。`platform` 必须在，`models` 可省。 */
export function parseMediaConfig(value: unknown): MediaConfig {
  if (!isObject(value)) throw bad("(根)", "对象", value);
  if (!("platform" in value)) throw PlatformError.config("解析配置失败: 缺少字段 platform");
  return {
    platform: parsePlatform(value.platform),
    models: "models" in value ? parseModels(value.models) : defaultModels(),
  };
}
