import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { PLATFORM_PRESET } from "@ov/protocol";
import { describe, expect, it } from "vitest";

import { hasPlatformToken } from "../platform-config.js";
import { saveToken, usedModelRows, validateToken } from "./token-core.js";

function tmpConfig(): string {
  return path.join(mkdtempSync(path.join(tmpdir(), "ov-token-")), "config.json");
}

describe("令牌校验", () => {
  it("非字符串、空白、中间有空格或换行都拒绝", () => {
    expect(validateToken(undefined).ok).toBe(false);
    expect(validateToken(123).ok).toBe(false);
    expect(validateToken("").ok).toBe(false);
    expect(validateToken("   ").ok).toBe(false);
    expect(validateToken("sk-abc def").ok).toBe(false);
    expect(validateToken("sk-abc\nxyz").ok).toBe(false);
  });

  it("首尾空白去掉后接受", () => {
    expect(validateToken("  sk-abcdef123456  ")).toEqual({ ok: true, token: "sk-abcdef123456" });
  });

  it("过长的拒绝（多半是粘贴错了）", () => {
    expect(validateToken("x".repeat(513)).ok).toBe(false);
    expect(validateToken("x".repeat(512)).ok).toBe(true);
  });
});

describe("保存令牌", () => {
  it("校验不过就不写文件", () => {
    const file = tmpConfig();
    const r = saveToken(file, "   ");
    expect(r.ok).toBe(false);
    expect(() => readFileSync(file)).toThrow();
  });

  it("保存后写进配置，并且读得回来（hasPlatformToken 为真）", () => {
    const file = tmpConfig();
    expect(hasPlatformToken(file)).toBe(false);
    expect(saveToken(file, " sk-first-token ")).toEqual({ ok: true });
    expect(hasPlatformToken(file)).toBe(true);
    expect(JSON.parse(readFileSync(file, "utf8")).platform.api_key).toBe("sk-first-token");
  });

  it("再次保存会覆盖旧令牌（设置里改令牌走的也是这条）", () => {
    const file = tmpConfig();
    saveToken(file, "sk-old-token");
    saveToken(file, "sk-new-token");
    expect(JSON.parse(readFileSync(file, "utf8")).platform.api_key).toBe("sk-new-token");
  });

  it("写不进去时返回失败、回调里能拿到原因，界面只看到通用文案", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "ov-token-"));
    // 父路径是个文件，mkdir 必然失败
    const blocker = path.join(dir, "blocker");
    writeFileSync(blocker, "x");
    const errors: unknown[] = [];
    const r = saveToken(path.join(blocker, "config.json"), "sk-abc", (err) => errors.push(err));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).not.toContain(dir);
    expect(errors.length).toBe(1);
  });
});

describe("正在使用的模型", () => {
  it("没有配置文件：列出产品预设的模型", () => {
    const rows = usedModelRows(path.join(tmpConfig(), "missing.json"));
    const byLabel = Object.fromEntries(rows.map((r) => [r.label, r.model]));
    expect(byLabel["对话"]).toBe(PLATFORM_PRESET.chat_model);
    expect(byLabel["文生图"]).toBe(PLATFORM_PRESET.models.image);
    expect(byLabel["视频"]).toBe(PLATFORM_PRESET.models.video);
    expect(byLabel["语音合成"]).toBeNull();
  });

  it("老配置里留下的空模型（null）不会让能力消失，仍显示预设；预设为空的（语音）显示未启用", () => {
    const file = tmpConfig();
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, JSON.stringify({ platform: { api_key: "k" }, models: { video_upscale: null, speech: null } }));
    const rows = usedModelRows(file);
    expect(rows.find((r) => r.label === "视频超分")?.model).toBe(PLATFORM_PRESET.models.video_upscale);
    expect(rows.find((r) => r.label === "语音合成")?.model).toBeNull();
  });
});
