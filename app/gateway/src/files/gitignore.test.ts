import { describe, expect, it } from "vitest";

import { parseGitignore } from "./gitignore.js";
import { scoreMatch } from "./mention-search.service.js";

describe(".gitignore 规则", () => {
  const m = parseGitignore(["# 注释", "", "*.log", "/root-only.txt", "build/", "docs/**/draft.md", "!keep.log", "a?c.md", "[Tt]mp"].join("\n"));

  it("通配、取反", () => {
    expect(m.ignores("x.log")).toBe(true);
    expect(m.ignores("deep/x.log")).toBe(true);
    expect(m.ignores("keep.log")).toBe(false);
    expect(m.ignores("abc.md")).toBe(true);
    expect(m.ignores("abbc.md")).toBe(false);
    expect(m.ignores("Tmp")).toBe(true);
    expect(m.ignores("tmp/")).toBe(true);
  });

  it("带斜杠的按目录锚定", () => {
    expect(m.ignores("root-only.txt")).toBe(true);
    expect(m.ignores("sub/root-only.txt")).toBe(false);
    expect(m.ignores("docs/draft.md")).toBe(true);
    expect(m.ignores("docs/a/b/draft.md")).toBe(true);
    expect(m.ignores("other/docs/draft.md")).toBe(false);
  });

  it("结尾斜杠只配目录，目录里的东西也跟着忽略", () => {
    expect(m.ignores("build/")).toBe(true);
    expect(m.ignores("build")).toBe(false);
    expect(m.ignores("build/out.js")).toBe(true);
    expect(m.ignores("src/build/out.js")).toBe(true);
  });
});

describe("提及搜索打分", () => {
  it("子序列才算配上；文件名命中、词首命中分更高", () => {
    expect(scoreMatch("scripts/story.md", "xyz")).toBe(0);
    expect(scoreMatch("scripts/story.md", "sty")).toBeGreaterThan(0);
    expect(scoreMatch("story.md", "story")).toBeGreaterThan(scoreMatch("history/notes.md", "story"));
    expect(scoreMatch("a", "")).toBe(0);
  });
});
