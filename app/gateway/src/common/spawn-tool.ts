import { spawn, type ChildProcess } from "node:child_process";

/**
 * 启动一个外部工具（yt-dlp 之类），并且**在 Windows 上也能跑 `.cmd` / `.bat` 包装**。
 *
 * 为什么需要这层：`spawn(file, args)` 在 Windows 上只能直接起 PE 可执行文件。
 * 用户用 pip / 包管理器装出来的 `yt-dlp` 经常是一个 `.cmd` 包装（真实可执行文件在别处），
 * 这时 `spawn` 会以 `ENOENT` 失败——表现成「网页媒体下载在 mac 上好好的，Windows 上
 * 一律不可用」。这类包装必须经 `cmd.exe /d /s /c` 启动。
 *
 * 转义规则（只对 `.cmd`/`.bat` 这条路径）：
 * - 每个参数整体加双引号，参数里的 `"` 变成 `""`；
 * - `%` 在 cmd 里即使加了引号也会展开，所以换成 `%%`。
 *   不加这一条，带 `%20` 之类的 URL 会被 `cmd` 吃掉。
 *
 * 直接用 `shell: true` 不行：那样所有参数都会过一遍 shell，注入面更大，而且引号规则
 * 更难控制。这里只把"包装文件"这一种情况交给 `cmd.exe`。
 */
export function spawnTool(executable: string, args: string[]): ChildProcessByStdio {
  if (process.platform !== "win32" || !/\.(cmd|bat)$/i.test(executable)) {
    return spawn(executable, args, { stdio: "pipe" });
  }
  const comspec = process.env.ComSpec?.trim() || "cmd.exe";
  const quoted = args.map((arg) => `"${arg.replace(/"/g, '""').replace(/%/g, "%%")}"`);
  return spawn(comspec, ["/d", "/s", "/c", `"${executable}" ${quoted.join(" ")}`], {
    stdio: "pipe",
    windowsVerbatimArguments: true,
  });
}

/** 三个流都是 pipe 的形态（调用方直接挂 `stdout.on`，不用再判空）。 */
type ChildProcessByStdio = ChildProcess & {
  stdout: NonNullable<ChildProcess["stdout"]>;
  stderr: NonNullable<ChildProcess["stderr"]>;
};
