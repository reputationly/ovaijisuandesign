import { describe, expect, it } from "vitest";

import { PLATFORM_PRESET, withPlatformPreset } from "./platform-preset.js";

describe("withPlatformPreset", () => {
  it("新装用户（配置文件里只有令牌）：地址、对话模型、各模态模型都用产品预设", () => {
    const cfg = withPlatformPreset({ platform: { api_key: "sk-test" } }) as {
      platform: Record<string, unknown>;
      models: Record<string, unknown>;
    };
    expect(cfg.platform).toEqual({
      base_url: PLATFORM_PRESET.base_url,
      api_key: "sk-test",
      chat_model: PLATFORM_PRESET.chat_model,
    });
    expect(cfg.models).toEqual({ ...PLATFORM_PRESET.models });
  });

  it("没有配置文件（读不到任何内容）也能补全，令牌是空串", () => {
    const cfg = withPlatformPreset(undefined) as { platform: Record<string, unknown> };
    expect(cfg.platform.api_key).toBe("");
    expect(cfg.platform.base_url).toBe(PLATFORM_PRESET.base_url);
  });

  it("写了非空值的字段照旧优先（老配置、运维手动改过的）", () => {
    const cfg = withPlatformPreset({
      platform: { base_url: "https://mine/v1", api_key: "k", chat_model: "my-chat" },
      models: { image: "my-image", video: "my-video" },
    }) as { platform: Record<string, unknown>; models: Record<string, unknown> };
    expect(cfg.platform.base_url).toBe("https://mine/v1");
    expect(cfg.platform.chat_model).toBe("my-chat");
    expect(cfg.models.image).toBe("my-image");
    expect(cfg.models.video).toBe("my-video");
    // 没写的键照旧走预设
    expect(cfg.models.music).toBe(PLATFORM_PRESET.models.music);
  });

  it("地址、对话模型写成空串 = 没写，用预设", () => {
    const cfg = withPlatformPreset({ platform: { base_url: "  ", chat_model: "", api_key: "k" } }) as {
      platform: Record<string, unknown>;
    };
    expect(cfg.platform.base_url).toBe(PLATFORM_PRESET.base_url);
    expect(cfg.platform.chat_model).toBe(PLATFORM_PRESET.chat_model);
  });

  it("模型键写成 null 或空串 = 没写，用预设（老版本设置页留下的空模型不会让能力变成未启用）", () => {
    const cfg = withPlatformPreset({
      platform: { api_key: "k" },
      models: { image_upscale: null, music_edit: "", video: "  " },
    }) as { models: Record<string, unknown> };
    expect(cfg.models.image_upscale).toBe(PLATFORM_PRESET.models.image_upscale);
    expect(cfg.models.music_edit).toBe(PLATFORM_PRESET.models.music_edit);
    expect(cfg.models.video).toBe(PLATFORM_PRESET.models.video);
  });

  it("预设本身就是空的能力（语音、图生图）仍然是未启用", () => {
    const cfg = withPlatformPreset({ platform: { api_key: "k" } }) as { models: Record<string, unknown> };
    expect(cfg.models.speech).toBeNull();
    expect(cfg.models.image_edit).toBeNull();
  });

  it("不认识的字段原样保留，不改入参", () => {
    const raw = { platform: { api_key: "k" }, models: { voice_map: { a: "x" }, enhance_music_caption: false }, extra: 1 };
    const snapshot = JSON.stringify(raw);
    const cfg = withPlatformPreset(raw) as Record<string, unknown> & { models: Record<string, unknown> };
    expect(cfg.extra).toBe(1);
    expect(cfg.models.voice_map).toEqual({ a: "x" });
    expect(cfg.models.enhance_music_caption).toBe(false);
    expect(JSON.stringify(raw)).toBe(snapshot);
  });
});
