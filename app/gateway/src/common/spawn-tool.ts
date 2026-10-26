import { spawn } from "node:child_process";

/**
 * YTDLP_PATH 指到批处理包装（.cmd/.bat）时抛出——这种文件在 Windows 上无法安全启动。
 *
 * 为什么是硬错误而不是尽力跑：批处理自己会用 `%*` 把整串参数交给 cmd.exe 重新解析，
 * 参数转义（`^`、`%`、`"`、换行）没有任何写法能同时覆盖所有情况——Node 也因此在
 * CVE-2024-27980 之后干脆拒绝不经 shell 直接起 .bat/.cmd（BatBadBut）。
 * 这些参数来自网页 URL 和 agent 生成的查询词，属于外部输入，宁可拒绝也不能漏。
 */
export class BatchLaunchUnsupportedError extends Error {
  readonly executable: string;
  constructor(executable: string) {
    super(`Windows 上不支持以批处理（.cmd/.bat）启动外部工具，请把 YTDLP_PATH 指向 yt-dlp.exe（收到：${executable}）`);
    this.name = "BatchLaunchUnsupportedError";
    this.executable = executable;
  }
}

const BATCH_RE = /\.(cmd|bat)$/i;

/**
 * 启动一个外部工具（yt-dlp 之类）。所有平台都直接 `spawn`、不经 shell：
 * shell 转义踩过两条坑——`%` 不能改 `%%`（cmd 命令行上不还原）、`"` 不能用 `\"`（cmd 不认，
 * `a" & calc & "` 会变成真命令）；不经 shell 就没有这些规则。
 * Windows 上批处理（.cmd/.bat）走不到这条安全路径，直接拒绝。
 */
export function spawnTool(
  executable: string,
  args: string[],
  options: { cwd?: string } = {},
): ChildProcessByStdio {
  if (process.platform === "win32" && BATCH_RE.test(executable)) {
    throw new BatchLaunchUnsupportedError(executable);
  }
  return spawn(executable, args, { stdio: "pipe", ...(options.cwd ? { cwd: options.cwd } : {}) });
}

/** 三个流都是 pipe 的形态（调用方直接挂 `stdout.on`，不用再判空）。 */
type ChildProcessByStdio = ReturnType<typeof spawn> & {
  stdout: NonNullable<ReturnType<typeof spawn>["stdout"]>;
  stderr: NonNullable<ReturnType<typeof spawn>["stderr"]>;
};
