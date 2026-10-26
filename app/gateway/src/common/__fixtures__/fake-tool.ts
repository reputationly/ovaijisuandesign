import { chmodSync, mkdirSync, writeFileSync } from "node:fs";
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
  // **放在 `node_modules/.bin/` 下**：这不是为了迁就测试，而是 `.cmd` 包装的真实形态 ——
  // npm 装出来的 CLI 就在这个位置，`%*` 会把参数再交给批处理解析一遍，所以调用方必须
  // **双重转义**元字符（cross-spawn 也是按这个路径规则决定要不要双重转义的）。
  // 放在随便一个目录里，`&`/`"` 这类参数会在批处理那一层被重新解释 —— 真实世界同理。
  const binDir = path.join(dir, "node_modules", ".bin");
  mkdirSync(binDir, { recursive: true });
  const cmd = path.join(binDir, `${name}.cmd`);
  writeFileSync(cmd, `@echo off\r\n"${node}" "${js}" %*\r\n`);
  return cmd;
}
