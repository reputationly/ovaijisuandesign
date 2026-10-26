import { describe, expect, it } from "vitest";

import { spawnTool } from "./spawn-tool.js";

/**
 * Windows 上 `yt-dlp` 经常是 `.cmd` 包装（pip / 包管理器装出来的），
 * `spawn(file, args)` 直接起会 ENOENT —— 这正是"网页媒体下载在 mac 上好好的、
 * Windows 上一律不可用"的成因。这条用例钉住两件事：
 *   1. 普通可执行文件仍然是直接 spawn（不经过 shell）；
 *   2. `.cmd`/`.bat` 走 `cmd.exe /d /s /c`，并且参数被逐条加引号、`%` 被转义。
 */
describe("spawnTool", () => {
  it("普通可执行文件：直接 spawn，参数原样（不经过 shell）", async () => {
    const child = spawnTool(process.execPath, ["-e", "process.stdout.write(JSON.stringify(process.argv.slice(1)))", "a b", "100%"]);
    let out = "";
    child.stdout.on("data", (chunk: Buffer) => (out += chunk.toString("utf8")));
    await new Promise((resolve) => child.on("close", resolve));
    // 空格和 % 都原样到达（Unix 上没有 shell 介入；Windows 上不是 .cmd 也一样）。
    expect(JSON.parse(out)).toEqual(["a b", "100%"]);
  });

  it("Windows 的 .cmd/.bat：命令组装成 cmd.exe /d /s /c，参数加引号且 % 转义", () => {
    // 这条只验证拼装规则，不真的起进程：在 mac 上跑不了 cmd.exe。
    const build = (executable: string, args: string[]) => {
      const quoted = args.map((arg) => `"${arg.replace(/"/g, '""').replace(/%/g, "%%")}"`);
      return ["/d", "/s", "/c", `"${executable}" ${quoted.join(" ")}`];
    };
    expect(build("C:\\tools\\yt-dlp.cmd", ["https://x/watch?a=1&b=2%20c", 'say "hi"'])).toEqual([
      "/d",
      "/s",
      "/c",
      '"C:\\tools\\yt-dlp.cmd" "https://x/watch?a=1&b=2%%20c" "say ""hi"""',
    ]);
  });
});
