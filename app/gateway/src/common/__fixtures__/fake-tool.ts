import { chmodSync, writeFileSync } from "node:fs";
import path from "node:path";

/**
 * 造一个跨平台的假外部工具（给 yt-dlp 这类"我们 spawn 它"的依赖用）。
 *
 * 为什么不是 `#!/bin/sh` 脚本：Windows 上没有 sh，`spawn` 也起不了 shell 脚本 ——
 * 以前两组 e2e（网页媒体下载、v3 搜图）就是因为这个在 Windows 上整组被跳过，
 * 而"Windows 上怎么找到 yt-dlp、参数怎么传"正是最容易出问题的地方，等于零覆盖。
 *
 * 现在的做法：
 * - 真正的逻辑写成 **node 脚本**（`.mjs`），两边都能跑；
 * - POSIX 上再放一个可执行的 `name` 包装（`#!/bin/sh` + exec node）；
 * - Windows 上放 `name.cmd`（`@echo off` + 当前 node + `%*`）。
 *   `spawnTool` 会把 `.cmd` 交给 `cmd.exe /d /s /c`，这正是产品要走的路径。
 */
export function writeFakeTool(dir: string, name: string, script: string): string {
  const js = path.join(dir, `${name}.mjs`);
  writeFileSync(js, script);
  const node = process.execPath;
  if (process.platform !== "win32") {
    const shim = path.join(dir, name);
    writeFileSync(shim, `#!/bin/sh\nexec "${node}" "${js}" "$@"\n`);
    chmodSync(shim, 0o755);
    return shim;
  }
  const cmd = path.join(dir, `${name}.cmd`);
  // `%*` 原样展开参数；`spawnTool` 已经逐个加了引号，所以含空格的路径也安全。
  writeFileSync(cmd, `@echo off\r\n"${node}" "${js}" %*\r\n`);
  return cmd;
}
