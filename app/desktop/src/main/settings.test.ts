import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { PLATFORM_PRESET } from "@ov/protocol";
import { describe, expect, it } from "vitest";

import { maskKey, mergeSettings, readSettings, writeSettings } from "./settings.js";

describe("设置读写", () => {
  it("API Key 只回掩码", () => {
    expect(maskKey("")).toBe("");
    expect(maskKey("abcd")).toBe("••••");
    expect(maskKey("sk-1234567890")).toBe("sk-1••••7890");
  });

  it("空 apiKey 不覆盖已保存的", () => {
    const next = mergeSettings({ platform: { api_key: "old", base_url: "a" } }, { apiKey: "", baseUrl: "b" });
    expect(next.platform).toEqual({ api_key: "old", base_url: "b" });
  });

  it("界面不能改模型：模型字段被忽略，配置里原有的模型和未知字段原样保留", () => {
    const next = mergeSettings(
      { models: { voice_map: { a: "x" }, image: "keep-me" }, extra: 1 },
      { imageEdit: "qwen-edit", music: "", chatModel: "other", image: "hacked" },
    );
    expect(next.models).toEqual({ voice_map: { a: "x" }, image: "keep-me" });
    expect(next.platform).toEqual({});
    expect(next.extra).toBe(1);
  });

  it("地址和令牌照常写入（地址去首尾空白）", () => {
    const next = mergeSettings({}, { baseUrl: " https://x/v1 ", apiKey: " sk-new " });
    expect(next.platform).toEqual({ base_url: "https://x/v1", api_key: "sk-new" });
  });

  it("写盘后能读回；读出来的是生效的值（地址、对话模型、各模态模型缺了用预设）", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "ov-settings-"));
    const file = path.join(dir, "config.json");
    writeFileSync(file, JSON.stringify({ platform: { api_key: "sk-abcdefgh1234" } }));
    writeSettings(file, { baseUrl: " https://x/v1 " });
    const info = readSettings(file, "/ws", 1);
    expect(info.platform).toEqual({
      baseUrl: "https://x/v1",
      apiKeyMasked: "sk-a••••1234",
      hasApiKey: true,
      chatModel: PLATFORM_PRESET.chat_model,
    });
    expect(info.models).toEqual({ ...PLATFORM_PRESET.models });
    expect(JSON.parse(readFileSync(file, "utf8")).platform.api_key).toBe("sk-abcdefgh1234");
  });

  it("还没有配置文件时：没有令牌，地址和模型是预设的", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "ov-settings-"));
    const info = readSettings(path.join(dir, "missing.json"), "/ws", 1);
    expect(info.platform).toEqual({
      baseUrl: PLATFORM_PRESET.base_url,
      apiKeyMasked: "",
      hasApiKey: false,
      chatModel: PLATFORM_PRESET.chat_model,
    });
  });
});
