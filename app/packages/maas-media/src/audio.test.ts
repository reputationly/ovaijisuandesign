import { describe, expect, it } from "vitest";

import {
  MUSIC3_INSTRUMENTAL_INPUT,
  MusicEdit,
  MusicIntent,
  editMusic,
  generateMusic,
  musicBody,
  shouldEnhance,
  synthesizeSpeech,
} from "./audio.js";
import { type Client, createClient } from "./client.js";
import { type MediaConfig, MusicEngine, defaultModels } from "./config.js";
import { PlatformError } from "./error.js";

const CAPTION = "acoustic folk, 76 bpm";
const LYRICS = "[Verse]\n夏天的风";

function cfg(): MediaConfig {
  return {
    platform: { base_url: "https://maas.example.com/v1", api_key: "k", chat_model: "chat" },
    models: { ...defaultModels(), speech: "indextts-2.5", music: "minimax-music3" },
  };
}

function offline(): Client {
  return createClient({
    fetch: () => {
      throw new Error("这个用例不该发出任何网络请求");
    },
  });
}

async function failure(p: Promise<unknown>): Promise<PlatformError> {
  const e = await p.then(
    () => {
      throw new Error("本该失败");
    },
    (e: unknown) => e,
  );
  expect(e).toBeInstanceOf(PlatformError);
  return e as PlatformError;
}

describe("audio", () => {
  // -- intent --------------------------------------------------------------

  it("explicit vocal with no lyrics is a contradiction not instrumental", () => {
    // 合成一个 bool 会把"我要有词"翻成反面，而且不报错。
    expect(MusicIntent.infer(false, "")).toBe(MusicIntent.LyricsMissing);
  });

  it("an omitted flag still infers instrumental from empty lyrics", () => {
    expect(MusicIntent.infer(null, "  ")).toBe(MusicIntent.Instrumental);
  });

  it("an explicit instrumental flag wins over present lyrics", () => {
    expect(MusicIntent.infer(true, LYRICS)).toBe(MusicIntent.Instrumental);
  });

  it("lyrics present means vocal", () => {
    expect(MusicIntent.infer(false, LYRICS)).toBe(MusicIntent.Vocal);
    expect(MusicIntent.infer(null, LYRICS)).toBe(MusicIntent.Vocal);
  });

  // -- 键位 ----------------------------------------------------------------

  it("music3 puts lyrics in prompt and caption in metadata", () => {
    // 两个键颠倒了不会报错：模型会一遍遍唱那句风格描述，出曲成功、
    // 时长正常、文件正常，只有听了才知道错了。
    const b = musicBody(MusicEngine.Music3, "minimax-music3", CAPTION, LYRICS, false);
    expect(b.prompt, "Music3 的顶层 prompt 必须是歌词").toBe(LYRICS);
    expect(b.metadata.instructions).toBe(CAPTION);
    // metadata.lyrics 会被透传但引擎不认，发了只会让人误以为歌词生效了。
    expect("lyrics" in b.metadata).toBe(false);
  });

  it("ace step is the exact mirror of music3", () => {
    const b = musicBody(MusicEngine.AceStep, "ace-step", CAPTION, LYRICS, false);
    expect(b.prompt, "ACE-Step 的顶层 prompt 是描述").toBe(CAPTION);
    expect(b.metadata.lyrics).toBe(LYRICS);
    expect("instructions" in b.metadata).toBe(false);
  });

  it("music3 instrumental never sends an empty prompt", () => {
    // 平台对 tts 有硬校验「需要合成文本」，空 prompt 直接 400 ——
    // 而且失败发生在调用方已经拿到 task_id 之后。
    const b = musicBody(MusicEngine.Music3, "minimax-music3", CAPTION, "", true);
    expect(b.prompt).toBe(MUSIC3_INSTRUMENTAL_INPUT);
  });

  it("ace step instrumental omits the lyrics key", () => {
    // 空歌词和「没有歌词」在引擎侧不等价，所以是不发这个键。
    const b = musicBody(MusicEngine.AceStep, "ace-step", CAPTION, "", true);
    expect(b.prompt).toBe(CAPTION);
    expect("lyrics" in b.metadata).toBe(false);
  });

  it("each edit task reads its own audio key", () => {
    // 传错了平台报的是「缺少音频」，不是「键不认识」—— 症状指向缺参数，
    // 根因是键名错。这四行是实测报错原文里点名的键。
    expect(MusicEdit.taskType(MusicEdit.Cover)).toBe("cover");
    expect(MusicEdit.audioKey(MusicEdit.Cover)).toBe("reference_audio");
    expect(MusicEdit.taskType(MusicEdit.Repaint)).toBe("repaint");
    expect(MusicEdit.audioKey(MusicEdit.Repaint)).toBe("src_audio");
  });

  // -- caption 增强的门控 ---------------------------------------------------

  it("ace step never gets the music3 structured caption", () => {
    // 三段式实测 3400+ 字，落在 ACE-Step 的顶层 prompt 上会撞平台的
    // 逐字段字数闸（现网 600）直接 400。Music3 不受影响是因为它走的是
    // 另一条联合闸。
    const c = cfg();
    expect(shouldEnhance(c, MusicEngine.Music3)).toBe(true);
    expect(
      shouldEnhance(c, MusicEngine.AceStep),
      "三段式是 Music3 的契约，套到 ACE-Step 上会被按字数拒掉",
    ).toBe(false);
  });

  it("the switch still turns music3 off", () => {
    const c = cfg();
    c.models.enhance_music_caption = false;
    expect(shouldEnhance(c, MusicEngine.Music3)).toBe(false);
  });

  // -- 配置缺失在联网前就报 --------------------------------------------------

  it("an unmapped voice fails loudly instead of substituting one", async () => {
    const err = await failure(synthesizeSpeech(offline(), cfg(), "你好", "female-tianmei", null));
    expect(err.message).toContain("voice_map");
    expect(err.message).toContain("female-tianmei");
  });

  it("a missing speech model is reported before any network call", async () => {
    const c = cfg();
    c.models.speech = null;
    const err = await failure(synthesizeSpeech(offline(), c, "hi", "v", null));
    expect(err.message).toContain("models.speech");
  });

  it("a contradictory request fails instead of going instrumental", async () => {
    const err = await failure(generateMusic(offline(), cfg(), CAPTION, "", MusicIntent.LyricsMissing, null));
    expect(err.message).toContain("歌词");
  });

  it("music edit does not fall back to text to music", async () => {
    // 拿文生音乐顶上会返回一段和原曲无关的音乐 —— 有声音、不报错，
    // 但完全不是用户要的，是最难发现的一类失败。
    const err = await failure(
      editMusic(offline(), cfg(), MusicEdit.Cover, "jazz", "https://example.com/a.mp3", "", null),
    );
    expect(err.message).toContain("models.music_edit");
  });

  it("an unresolvable music engine fails before generating", async () => {
    // 猜错引擎不报错，只会产出完全不对的音乐 —— 所以宁可拒绝。
    const c = cfg();
    c.models.music = "suno-v4";
    const err = await failure(generateMusic(offline(), c, CAPTION, LYRICS, MusicIntent.Vocal, null));
    expect(err.message).toContain("music_engine");
  });
});

// ---------------------------------------------------------------------------
// TS 移植新增：整条链路走一遍 fetch 桩，守住三个音频键和增强失败的降级。
// ---------------------------------------------------------------------------

function recorder(respond: (url: string, body: Record<string, unknown>) => Response) {
  const posts: { url: string; body: Record<string, unknown> }[] = [];
  const warns: string[] = [];
  const client = createClient({
    fetch: async (input, init) => {
      const url = String(input);
      const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {};
      if ((init?.method ?? "GET") === "POST") posts.push({ url, body });
      return respond(url, body);
    },
    sleep: async () => {},
    now: () => 0,
    logger: { info() {}, warn: (m) => warns.push(m) },
  });
  return { client, posts, warns };
}

const taskOk = (url: string) =>
  url.endsWith("/videos")
    ? Response.json({ task_id: "t" })
    : Response.json({ status: "completed", metadata: { url: "https://o/a.mp3" } });

describe("audio（TS 移植新增）", () => {
  it("tts 的参考音色走 metadata.voice", async () => {
    const c = cfg();
    c.models.voice_map = { v1: "https://x/ref.wav" };
    const r = recorder(taskOk);
    expect(await synthesizeSpeech(r.client, c, "你好", "v1")).toBe("https://o/a.mp3");
    expect(r.posts[0]!.body).toEqual({
      model: "indextts-2.5",
      prompt: "你好",
      metadata: { task_type: "tts", voice: "https://x/ref.wav" },
    });
  });

  it("原型链上的名字不算映射", async () => {
    const err = await failure(synthesizeSpeech(offline(), cfg(), "hi", "constructor"));
    expect(err.message).toContain("voice_map");
  });

  it("cover 读 reference_audio、repaint 读 src_audio，空歌词不发 lyrics", async () => {
    const c = cfg();
    c.models.music_edit = "ace-step";
    const r = recorder(taskOk);
    await editMusic(r.client, c, MusicEdit.Cover, "jazz", "https://x/a.mp3", "  ");
    await editMusic(r.client, c, MusicEdit.Repaint, "rock", "https://x/b.mp3", "[Verse]\n新词");
    expect(r.posts[0]!.body.metadata).toEqual({ task_type: "cover", reference_audio: "https://x/a.mp3" });
    expect(r.posts[1]!.body.metadata).toEqual({
      task_type: "repaint",
      src_audio: "https://x/b.mp3",
      lyrics: "[Verse]\n新词",
    });
  });

  it("caption 增强失败时 WARN 并退回原描述，生成照常进行", async () => {
    const r = recorder((url) =>
      url.endsWith("/chat/completions")
        ? Response.json({ error: { code: "model_not_found", message: "无可用渠道" } }, { status: 503 })
        : taskOk(url),
    );
    const url = await generateMusic(r.client, cfg(), CAPTION, LYRICS, MusicIntent.Vocal);
    expect(url).toBe("https://o/a.mp3");
    expect(r.warns.some((w) => w.includes("caption 增强失败"))).toBe(true);
    const submit = r.posts.find((p) => p.url.endsWith("/videos"))!;
    expect(submit.body).toEqual({
      model: "minimax-music3",
      prompt: LYRICS,
      metadata: { task_type: "t2m", instructions: CAPTION },
    });
  });

  it("增强成功时发出去的是展开后的 caption，温度 / 预算照 Rust", async () => {
    const r = recorder((url) =>
      url.endsWith("/chat/completions")
        ? Response.json({ choices: [{ message: { content: "Global Metadata\n..." } }] })
        : taskOk(url),
    );
    await generateMusic(r.client, cfg(), CAPTION, "", MusicIntent.Instrumental);
    const chat = r.posts.find((p) => p.url.endsWith("/chat/completions"))!;
    expect(chat.body.temperature).toBe(0.7);
    expect(chat.body.max_tokens).toBe(6000);
    const submit = r.posts.find((p) => p.url.endsWith("/videos"))!;
    expect(submit.body.prompt).toBe(MUSIC3_INSTRUMENTAL_INPUT);
    expect((submit.body.metadata as Record<string, unknown>).instructions).toBe("Global Metadata\n...");
  });
});
