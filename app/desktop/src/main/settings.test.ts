import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

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

  it("驼峰字段写成蛇形，清空的模型写 null，未知字段保留", () => {
    const next = mergeSettings({ models: { voice_map: { a: "x" } }, extra: 1 }, { imageEdit: "qwen-edit", music: "" });
    expect(next.models).toEqual({ voice_map: { a: "x" }, image_edit: "qwen-edit", music: null });
    expect(next.extra).toBe(1);
  });

  it("写盘后能读回", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "ov-settings-"));
    const file = path.join(dir, "config.json");
    writeFileSync(file, JSON.stringify({ platform: { api_key: "sk-abcdefgh1234" } }));
    writeSettings(file, { baseUrl: " https://x/v1 ", chatModel: "m" });
    const info = readSettings(file, "/ws", 1);
    expect(info.platform).toEqual({ baseUrl: "https://x/v1", apiKeyMasked: "sk-a••••1234", hasApiKey: true, chatModel: "m" });
    expect(JSON.parse(readFileSync(file, "utf8")).platform.api_key).toBe("sk-abcdefgh1234");
  });
});
