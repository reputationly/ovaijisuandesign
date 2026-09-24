import { describe, expect, it } from "vitest";

import {
  MusicEngine,
  defaultModels,
  parseMediaConfig,
  parseModels,
  platformBase,
  resolveMusicEngine,
} from "./config.js";
import { PlatformError } from "./error.js";

describe("config", () => {
  it("strips the trailing slash", () => {
    const p = { base_url: "https://maas.example.com/v1/", api_key: "", chat_model: "" };
    expect(platformBase(p)).toBe("https://maas.example.com/v1");
  });

  it("refuses to guess an unknown music engine", () => {
    const m = defaultModels();
    expect(resolveMusicEngine(m, "minimax-music3")).toEqual({ ok: true, value: MusicEngine.Music3 });
    expect(resolveMusicEngine(m, "ace-step")).toEqual({ ok: true, value: MusicEngine.AceStep });
    expect(resolveMusicEngine(m, "suno-v4").ok).toBe(false);
  });

  it("an explicit engine overrides the name guess", () => {
    const m = { ...defaultModels(), music_engine: MusicEngine.AceStep };
    expect(resolveMusicEngine(m, "minimax-music3")).toEqual({ ok: true, value: MusicEngine.AceStep });
  });

  it("the serde default matches the struct default", () => {
    // 两条路径给出不同默认值不会报错，只会让「没写这一段」和
    // 「写了但没写这个键」得到相反的行为。
    const fromSerde = parseModels(JSON.parse("{}"));
    expect(fromSerde.enhance_music_caption).toBe(defaultModels().enhance_music_caption);
    expect(fromSerde.enhance_music_caption).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// TS 移植新增：JSON 兼容性。老用户的 config.json 要原样读进来。
// ---------------------------------------------------------------------------

describe("config（TS 移植新增）", () => {
  it("读 Rust 网关写出的 config.json（MediaConfig 被 flatten 在顶层）", () => {
    const raw = {
      port: 8100,
      workspace: null,
      web_dir: null,
      upstream: null,
      prevent_sleep: false,
      platform: { base_url: "https://maas.ovaijisuan.com/v1", api_key: "sk-1", chat_model: "qwen" },
      models: {
        image: "qwen-image",
        image_edit: "qwen-image-edit",
        video: null,
        music: "minimax-music3",
        music_engine: "ace_step",
        enhance_music_caption: false,
        voice_map: { b: "https://x/b.wav", a: "/abs/a.wav" },
      },
    };
    const cfg = parseMediaConfig(raw);
    expect(cfg.platform.api_key).toBe("sk-1");
    expect(cfg.models.image_edit).toBe("qwen-image-edit");
    expect(cfg.models.video).toBeNull();
    expect(cfg.models.speech).toBeNull();
    expect(cfg.models.music_engine).toBe("ace_step");
    expect(cfg.models.enhance_music_caption).toBe(false);
    // BTreeMap：按键排序。
    expect(Object.keys(cfg.models.voice_map)).toEqual(["a", "b"]);
  });

  it("models 整段缺省时用默认值；platform 缺字段是配置错误", () => {
    const cfg = parseMediaConfig({ platform: { base_url: "u", api_key: "k", chat_model: "c" } });
    expect(cfg.models).toEqual(defaultModels());

    expect(() => parseMediaConfig({ platform: { base_url: "u", api_key: "k" } })).toThrow(PlatformError);
    expect(() => parseMediaConfig({})).toThrow(/platform/);
  });

  it("不认识的音乐引擎名拒绝读入", () => {
    expect(() => parseModels({ music_engine: "suno" })).toThrow(/music_engine/);
  });

  it("序列化回 JSON 时键名仍是蛇形，None 写成 null", () => {
    const json = JSON.parse(JSON.stringify(defaultModels())) as Record<string, unknown>;
    expect(Object.keys(json)).toEqual([
      "image",
      "image_edit",
      "video",
      "video_ref",
      "video_upscale",
      "image_upscale",
      "music",
      "music_edit",
      "speech",
      "music_engine",
      "enhance_music_caption",
      "voice_map",
    ]);
    expect(json.image).toBeNull();
  });
});
