/**
 * `code_project_open` 返回给 agent 的运行环境探测。
 *
 * 参照不打包 node/python：它只探测系统 PATH；ffmpeg 先看 `FFMPEG_PATH`（桌面端把自带
 * ffmpeg 写进去），没有才退回 PATH。缺什么就如实报 `available: false`，不假装。
 */
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { isAbsolute } from "node:path";

const PROBE_TIMEOUT_MS = 5_000;
const CACHE_MS = 60_000;

export interface ToolProbe {
  available: boolean;
  version?: string;
}

export interface CodeEnvironment {
  platform: NodeJS.Platform;
  shell: "bash" | "powershell";
  node: ToolProbe & { npm: boolean };
  python: ToolProbe & { command?: string; pip: boolean };
  ffmpeg: ToolProbe & { bundled: boolean; path?: string; ffprobePath?: string };
  git: ToolProbe;
  packageManagers: string[];
}

type RunProbe = (command: string, args: string[]) => Promise<{ ok: boolean; output: string }>;

const runProbe: RunProbe = (command, args) =>
  new Promise((resolve) => {
    execFile(
      command,
      [...args],
      {
        timeout: PROBE_TIMEOUT_MS,
        windowsHide: true,
        // Windows 上 npm/pip 是 .cmd，需要 shell 才能解析；绝对路径的 ffmpeg 直接跑，路径里的空格才不会丢。
        shell: process.platform === "win32" && !isAbsolute(command),
        env: process.env,
      },
      (error, stdout, stderr) => {
        resolve({ ok: !error, output: `${stdout ?? ""}${stderr ?? ""}`.trim() });
      },
    );
  });

function firstLine(output: string): string | undefined {
  return output.split(/\r?\n/)[0]?.trim() || undefined;
}

async function tool(run: RunProbe, command: string, args: string[]): Promise<ToolProbe> {
  const result = await run(command, args);
  return result.ok ? { available: true, version: firstLine(result.output) } : { available: false };
}

const PACKAGE_MANAGERS: Partial<Record<NodeJS.Platform, string[]>> = {
  darwin: ["brew"],
  win32: ["winget", "scoop", "choco"],
  linux: ["apt-get", "dnf", "pacman"],
};

export async function probeCodeEnvironment(
  run: RunProbe = runProbe,
  platform: NodeJS.Platform = process.platform,
  env: NodeJS.ProcessEnv = process.env,
): Promise<CodeEnvironment> {
  const pythonCandidates = platform === "win32" ? ["python", "py"] : ["python3", "python"];
  const ffmpegPath = env.FFMPEG_PATH?.trim();
  const ffprobePath = env.FFPROBE_PATH?.trim();
  const bundled = !!ffmpegPath && existsSync(ffmpegPath);
  const [node, npm, git, ffmpeg, managers, python] = await Promise.all([
    tool(run, "node", ["--version"]),
    run("npm", ["--version"]),
    tool(run, "git", ["--version"]),
    tool(run, bundled ? ffmpegPath! : "ffmpeg", ["-version"]),
    Promise.all((PACKAGE_MANAGERS[platform] ?? []).map(async (name) => {
      const probe = await run(name, ["--version"]);
      return probe.ok ? name : "";
    })),
    (async () => {
      // Windows 的 py 启动器版本命令不同；两个候选都失败就报 unavailable。
      for (const command of pythonCandidates) {
        const found = await tool(run, command, ["--version"]);
        if (!found.available) continue;
        const pip = await run(command, ["-m", "pip", "--version"]);
        return { ...found, command, pip: pip.ok };
      }
      return { available: false, pip: false };
    })(),
  ]);
  return {
    platform,
    // OpenCode 用 bash；Windows 只有装了 Git for Windows 才有 bash，否则 PowerShell。
    shell: platform !== "win32" || git.available ? "bash" : "powershell",
    node: { ...node, npm: npm.ok },
    python,
    ffmpeg: {
      ...ffmpeg,
      bundled: bundled && ffmpeg.available,
      ...(bundled ? { path: ffmpegPath } : {}),
      ...(bundled && ffprobePath ? { ffprobePath } : {}),
    },
    git,
    packageManagers: managers.filter(Boolean),
  };
}

let cached: { at: number; value: CodeEnvironment } | undefined;

export async function currentCodeEnvironment(): Promise<CodeEnvironment> {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.value;
  const value = await probeCodeEnvironment();
  cached = { value, at: Date.now() };
  return value;
}
