import { mkdirSync, mkdtempSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { loadMemoryContext, shouldIncludeUserMemory, userMemoryDir } from "./load-memory-context.js";

function memo(dir: string, file: string, fm: Record<string, string>, mtimeSec: number) {
  mkdirSync(dir, { recursive: true });
  const p = path.join(dir, file);
  writeFileSync(p, `---\n${Object.entries(fm).map(([k, v]) => `${k}: ${v}`).join("\n")}\n---\n正文`);
  utimesSync(p, mtimeSec, mtimeSec);
}

let root: string;
let userDir: string;
beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), "ov-mem-"));
  userDir = path.join(root, "user-mem");
  process.env.HUB_MEMORY_DIR = userDir;
});
afterEach(() => {
  delete process.env.HUB_MEMORY_DIR;
  delete process.env.HILO_LOAD_USER_MEMORY;
  delete process.env.HILO_DATA_DIR;
});

describe("记忆上下文", () => {
  it("没有记忆就不注入", async () => {
    expect(await loadMemoryContext({ projectRoot: root })).toEqual({ prompt: "", truncated: 0, totalEntries: 0 });
  });

  it("项目记忆在前、按修改时间倒序；同名的用户记忆被项目记忆覆盖；缺字段 / 类型不对 / 索引文件不列", async () => {
    const proj = path.join(root, ".hilo", "memory");
    memo(proj, "a.md", { name: "old-style", description: "旧的", type: "media-style" }, 100);
    memo(proj, "b.md", { name: "new-pin", description: '"主角"', type: "asset-pin" }, 200);
    memo(proj, "bad.md", { name: "x", type: "user" }, 300);
    memo(proj, "weird.md", { name: "y", description: "d", type: "note" }, 300);
    memo(proj, "MEMORY.md", { name: "index", description: "d", type: "user" }, 300);
    memo(userDir, "u.md", { name: "me", description: "独立游戏美术", type: "user" }, 50);
    memo(userDir, "dup.md", { name: "old-style", description: "用户版", type: "media-style" }, 400);

    const r = await loadMemoryContext({ projectRoot: root });
    expect(r.totalEntries).toBe(3);
    expect(r.prompt).toMatch(
      /^# Memory Context\n\n## Project memory \(current workspace\)\n- new-pin \[asset-pin\] — 主角\n- old-style \[media-style\] — 旧的\n\n## User memory \(cross-project\)\n- me \[user\] — 独立游戏美术\n\n## Memory usage rules\n/,
    );
    expect(r.prompt).not.toContain("用户版");
    expect(r.prompt).toContain("hub_memory({action:'read', name})");
    expect(r.prompt).toContain("model=<video model_id>");
    expect(r.prompt.endsWith("Refer to memory only when relevant; do not dump all entries.")).toBe(true);
  });

  it("超过字节预算的条目跳过并计数，末尾提示用 list 看全部", async () => {
    const proj = path.join(root, ".hilo", "memory");
    for (let i = 0; i < 5; i++) memo(proj, `m${i}.md`, { name: `m${i}`, description: "x".repeat(60), type: "project" }, 100 + i);
    const r = await loadMemoryContext({ projectRoot: root, budgetBytes: 200 });
    expect(r.truncated).toBeGreaterThan(0);
    expect(r.prompt).toContain(`[... ${r.truncated} more entries truncated, use hub_memory({action:'list'}) to see all]`);
  });

  it("工作区偏好优先于环境变量决定要不要带用户记忆", () => {
    expect(shouldIncludeUserMemory(root)).toBe(true);
    process.env.HILO_LOAD_USER_MEMORY = "0";
    expect(shouldIncludeUserMemory(root)).toBe(false);
    mkdirSync(path.join(root, ".hilo"), { recursive: true });
    writeFileSync(path.join(root, ".hilo", "storage.json"), JSON.stringify({ preferences: { loadUserMemory: true } }));
    expect(shouldIncludeUserMemory(root)).toBe(true);
  });

  it("用户记忆目录：HUB_MEMORY_DIR，其次数据根下的 memory", () => {
    expect(userMemoryDir()).toBe(userDir);
    delete process.env.HUB_MEMORY_DIR;
    process.env.HILO_DATA_DIR = "/data";
    expect(userMemoryDir()).toBe(path.join("/data", "memory"));
  });
});
