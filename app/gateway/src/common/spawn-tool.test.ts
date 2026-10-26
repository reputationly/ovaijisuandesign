import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { BatchLaunchUnsupportedError, spawnTool } from "./spawn-tool.js";

/**
 * 参数必须**逐字节**到达外部工具，且不能成为命令注入的跳板。
 *
 * 这些参数都来自外部输入（网页 URL、agent 生成的查询词）。以前走 shell/cmd 转义时
 * 踩过两条坑（`%` 不能 `%%`、`"` 不能 `\"`）；现在统一不经 shell 直接 spawn——
 * 参数永远只是 argv 里的一个元素，没有解析层可以破坏它。
 * Windows 上的 `.cmd`/`.bat` 没有这条安全路径（批处理 `%*` 会重新解析），产品直接拒绝。
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
  'C:\\Program Files\\x "y"\\z',
];

function run(executable: string, args: string[], cwd: string): Promise<{ stdout: string; stderr: string; code: number | null }> {
  const child = spawnTool(executable, args, { cwd });
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk: Buffer) => (stdout += chunk.toString("utf8")));
  child.stderr.on("data", (chunk: Buffer) => (stderr += chunk.toString("utf8")));
  return new Promise((resolve) => child.on("close", (code) => resolve({ stdout, stderr, code })));
}

function writeEchoScript(dir: string): string {
  const script = path.join(dir, "echo-args.mjs");
  writeFileSync(script, "process.stdout.write(JSON.stringify(process.argv.slice(2)));\n");
  return script;
}

describe("spawnTool", () => {
  it("9 个刁钻参数逐字节到达（不经 shell），且没有命令注入", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "ov-spawn-argv-"));
    const script = writeEchoScript(dir);
    const { stdout, code, stderr } = await run(process.execPath, [script, ...ARGS], dir);
    expect(code, `stdout=${stdout.slice(0, 800)} stderr=${stderr.slice(0, 800)}`).toBe(0);
    expect(JSON.parse(stdout)).toEqual(ARGS);
    // 注入没发生：`a" & echo PWNED> pwned.txt & "` 只是被当成一个普通参数。
    expect(existsSync(path.join(dir, "pwned.txt"))).toBe(false);
  });

  it.runIf(process.platform === "win32")("Windows：.cmd 批处理直接被拒（普通目录，不借 node_modules/.bin）", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "ov-spawn-batch-"));
    const marker = path.join(dir, "marker.txt");
    const cmd = path.join(dir, "yt-dlp.cmd");
    writeFileSync(cmd, `@echo off\r\necho ran> "${marker}"\r\n`);
    expect(() => spawnTool(cmd, ["a"])).toThrow(BatchLaunchUnsupportedError);
    expect(existsSync(marker)).toBe(false);
  });

  it.runIf(process.platform === "win32")("Windows：大写 .BAT 同样被拒", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "ov-spawn-bat-"));
    const marker = path.join(dir, "marker.txt");
    const bat = path.join(dir, "yt-dlp.BAT");
    writeFileSync(bat, `@echo off\r\necho ran> "${marker}"\r\n`);
    expect(() => spawnTool(bat, ["a"])).toThrow(BatchLaunchUnsupportedError);
    expect(existsSync(marker)).toBe(false);
  });

  it.skipIf(process.platform === "win32")("POSIX：.cmd 后缀的文件名只是普通文件（平台无关行为）", async () => {
    // 非 Windows 没有批处理语义，后缀不构成威胁——可执行位才是门槛。
    const dir = mkdtempSync(path.join(tmpdir(), "ov-spawn-shim-"));
    const script = path.join(dir, "shim.cmd");
    writeFileSync(script, `#!/bin/sh\nexec "${process.execPath}" "${writeEchoScript(dir)}" "$@"\n`);
    const { chmodSync } = await import("node:fs");
    chmodSync(script, 0o755);
    const { stdout, code } = await run(script, ["hello"], dir);
    expect(code).toBe(0);
    expect(JSON.parse(stdout)).toEqual(["hello"]);
  });
});
