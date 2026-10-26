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
 *   现在产品**拒绝**批处理（spawn-tool.ts 直接抛错），这个包装只用于验证拒绝生效。
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
  // 普通目录下的 `.cmd`（不在 node_modules/.bin）：被 spawnTool 拒绝的那个形态。
  const cmd = path.join(dir, `${name}.cmd`);
  writeFileSync(cmd, `@echo off\r\n"${node}" "${js}" %*\r\n`);
  return cmd;
}
