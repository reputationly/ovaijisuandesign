import { describe, expect, it } from "vitest";

import { MAX_TOKENS, SYSTEM_PROMPT, TEMPERATURE, TIMEOUT_MS, buildUserMessage } from "./caption.js";

describe("caption", () => {
  it("the contract names all three headings", () => {
    // 少一段模型就不写那一段，而少了 Arrangement 正是"听感平"的来源。
    for (const heading of ["Global Metadata", "Vocal Details", "Arrangement"]) {
      expect(SYSTEM_PROMPT.includes(heading), `缺少 ${heading}`).toBe(true);
    }
  });

  it("the contract forbids copying lyrics into the caption", () => {
    expect(SYSTEM_PROMPT).toContain("any lyric line");
  });

  it("instrumental is stated explicitly not left to inference", () => {
    const msg = buildUserMessage("lofi 书房背景乐", "", true);
    expect(msg, msg).toContain("INSTRUMENTAL");
    expect(msg, msg).toContain("no vocals");
  });

  it("passes only section markers not the lyric text", () => {
    const msg = buildUserMessage("中文说唱", "[Verse]\n夜里的风\n[Chorus]\n还要走多久", false);
    expect(msg, msg).toContain("[Verse] [Chorus]");
    expect(msg, msg).not.toContain("夜里的风");
    expect(msg, msg).toContain("中文说唱");
  });

  it("unmarked lyrics still produce a usable message", () => {
    const msg = buildUserMessage("folk", "just some lines\nwith no markers", false);
    expect(msg, msg).toContain("(unmarked)");
    expect(msg, msg).not.toContain("just some lines");
  });
});

describe("caption（TS 移植新增）", () => {
  it("超时 / 预算 / 温度和 Rust 一致", () => {
    expect([TIMEOUT_MS, MAX_TOKENS, TEMPERATURE]).toEqual([120_000, 6000, 0.7]);
  });
});
