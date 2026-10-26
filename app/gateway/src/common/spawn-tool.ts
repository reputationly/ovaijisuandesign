import { spawn } from "node:child_process";

import crossSpawn from "cross-spawn";

/**
 * 启动一个外部工具（yt-dlp 之类），并且**在 Windows 上也能跑 `.cmd` / `.bat` 包装**。
 *
 * 为什么需要这层：`spawn(file, args)` 在 Windows 上只能直接起 PE 可执行文件。
 * 用户用 pip / 包管理器装出来的 `yt-dlp` 经常是一个 `.cmd` 包装（真实可执行文件在别处），
 * 这时 `spawn` 会以 `ENOENT` 失败——表现成「网页媒体下载在 mac 上好好的，Windows 上
 * 一律不可用」。
 *
 * **Windows 上交给 cross-spawn，不要自己拼命令行。** 手工拼踩过两条坑：
 *   1. `%` 不能改成 `%%` —— 那只在 .bat 文件内部还原；在 `cmd /c` 的命令行上会原样留下，
 *      于是 URL 里的 `%20`、`%3F` 全被弄坏（带百分号编码的 URL 极其常见）。
 *   2. `"` 不能用 `\"` 转义 —— cmd.exe 不认这种转义，参数里的一个 `"` 就能提前关掉
 *      引号区间，后面的 `&`、`|` 变成真正的命令分隔符（`a" & calc & "` 会执行 calc）。
 *      这些参数来自网页 URL 和 agent 生成的查询词，属于外部输入。
 * cross-spawn 自己做 `.cmd`/`.bat`/`PATHEXT` 识别与元字符转义（`^`），这条路是验证过的。
 *
 * 非 Windows 平台保持直接 `spawn`：没有 cmd.exe，也就没有这些转义规则。
 */
export function spawnTool(
  executable: string,
  args: string[],
  options: { cwd?: string } = {},
): ChildProcessByStdio {
  const stdio = { stdio: "pipe" as const, ...(options.cwd ? { cwd: options.cwd } : {}) };
  if (process.platform !== "win32") return spawn(executable, args, stdio);
  return crossSpawn(executable, args, stdio) as unknown as ChildProcessByStdio;
}

/** 三个流都是 pipe 的形态（调用方直接挂 `stdout.on`，不用再判空）。 */
type ChildProcessByStdio = ReturnType<typeof spawn> & {
  stdout: NonNullable<ReturnType<typeof spawn>["stdout"]>;
  stderr: NonNullable<ReturnType<typeof spawn>["stderr"]>;
};
