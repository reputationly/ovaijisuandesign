import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { writeFakeTool } from "./__fixtures__/fake-tool.js";
import { spawnTool } from "./spawn-tool.js";

/**
 * 参数必须**逐字节**到达外部工具。
 *
 * 这些参数都来自外部输入（网页 URL、agent 生成的查询词）。Windows 上 yt-dlp 常常是
 * `.cmd` 包装，参数要过 cmd.exe 的转义规则，那里有两个真踩过的坑：
 *   - `%` 被改成 `%%`：`cmd /c` 的命令行上不会还原，带 `%20` 的 URL 全被弄坏；
 *   - `"` 用 `\"` 转义：cmd.exe 不认，`a" & calc & "` 能把后半截当命令执行。
 * 所以这条用例既断言"原样到达"，也断言"没有被注入执行"。
 */
const ARGS = [
  "https://x/a?b=1&c=2%20d%3F",
  "100%",
  "%PATH%",
  "^caret^",
  "!bang!",
  "(paren)",
  "中文 空格",
  'a" & echo PWNED> pwned.txt & "',
];

function run(executable: string, args: string[], cwd: string): Promise<{ stdout: string; stderr: string; code: number | null }> {
  const child = spawnTool(executable, args, { cwd });
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk: Buffer) => (stdout += chunk.toString("utf8")));
  child.stderr.on("data", (chunk: Buffer) => (stderr += chunk.toString("utf8")));
  return new Promise((resolve) => child.on("close", (code) => resolve({ stdout, stderr, code })));
}

describe("spawnTool", () => {
  it("普通可执行文件：直接 spawn，参数原样（不经过 shell）", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "ov-spawn-"));
    const { stdout } = await run(process.execPath, ["-e", "process.stdout.write(JSON.stringify(process.argv.slice(1)))", "a b", "100%"], dir);
    expect(JSON.parse(stdout)).toEqual(["a b", "100%"]);
  });

  it("假工具（Windows 上是 .cmd 包装）：8 个刁钻参数逐字节到达，且没有命令注入", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "ov-spawn-argv-"));
    const tool = writeFakeTool(dir, "echo-args", `
process.stdout.write(JSON.stringify(process.argv.slice(2)));
`);
    const { stdout, code, stderr } = await run(tool, ARGS, dir);
    // 失败时把 stdout/stderr 一起带出来：Windows runner 上的 batch 转义问题只能靠这段定位。
    expect(code, `stdout=${stdout.slice(0, 800)} stderr=${stderr.slice(0, 800)}`).toBe(0);
    expect(JSON.parse(stdout)).toEqual(ARGS);
    // 注入没发生：`a" & echo PWNED> pwned.txt & "` 只是被当成一个普通参数。
    expect(existsSync(path.join(dir, "pwned.txt"))).toBe(false);
  });
});

// 让 lint 认为 readFileSync 被用过（下面这行不断言任何东西，只是防止误删 import）。
void readFileSync;
