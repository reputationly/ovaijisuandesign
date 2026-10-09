import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { PLATFORM_PRESET } from "@ov/protocol";
import { describe, expect, it } from "vitest";

import { hasPlatformToken, readPlatform } from "./platform-config.js";

function cfgFile(content?: string): string {
  const dir = mkdtempSync(path.join(tmpdir(), "ov-platform-"));
  const file = path.join(dir, "config.json");
  if (content !== undefined) writeFileSync(file, content);
  return file;
}

describe("读平台配置（主进程，给 opencode 用）", () => {
  it("没有配置文件：地址和对话模型用预设，令牌为空", () => {
    const p = readPlatform(cfgFile());
    expect(p.base_url).toBe(PLATFORM_PRESET.base_url);
    expect(p.chat_model).toBe(PLATFORM_PRESET.chat_model);
    expect(p.api_key).toBe("");
  });

  it("只有令牌的配置：其余用预设补齐", () => {
    const p = readPlatform(cfgFile(JSON.stringify({ platform: { api_key: "sk-abc" } })));
    expect(p.api_key).toBe("sk-abc");
    expect(p.base_url).toBe(PLATFORM_PRESET.base_url);
    expect(p.chat_model).toBe(PLATFORM_PRESET.chat_model);
  });

  it("可选的上下文窗口字段照旧读出来", () => {
    const p = readPlatform(cfgFile(JSON.stringify({ platform: { api_key: "k", chat_context_limit: 1000000, chat_output_limit: "32000" } })));
    expect(p.chat_context_limit).toBe(1000000);
    expect(p.chat_output_limit).toBe(32000);
  });
});

describe("是否已有令牌（决定要不要拦住启动）", () => {
  it("没有配置文件 → 没有令牌", () => {
    expect(hasPlatformToken(cfgFile())).toBe(false);
  });

  it("令牌是空串或只有空白 → 没有令牌", () => {
    expect(hasPlatformToken(cfgFile(JSON.stringify({ platform: { api_key: "" } })))).toBe(false);
    expect(hasPlatformToken(cfgFile(JSON.stringify({ platform: { api_key: "   " } })))).toBe(false);
  });

  it("有令牌 → 有（之后启动不再拦）", () => {
    expect(hasPlatformToken(cfgFile(JSON.stringify({ platform: { api_key: "sk-abc" } })))).toBe(true);
  });

  it("配置文件坏了（读不出 JSON）→ 当没有，让人重新填；不抛错", () => {
    expect(hasPlatformToken(cfgFile("{ not json"))).toBe(false);
  });
});
