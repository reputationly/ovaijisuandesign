import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import { Inject, Injectable, NotFoundException } from "@nestjs/common";

import { WorkspacePathService } from "../common/workspace-path.service.js";
import { GatewayConfig } from "../config/gateway-config.js";
import { PluginFilesService } from "./plugins.service.js";

const DEFAULT_TIMEOUT_MS = 60_000;
const MAX_TIMEOUT_MS = 600_000;

/**
 * 插件脚本只在自己的目录里跑，解释器来自数据根下的虚拟环境。
 * 没有本机 Python 时直接说明缺运行时，不假装环境已经就绪。
 */
@Injectable()
export class PluginPythonService {
  constructor(
    @Inject(GatewayConfig) private readonly cfg: GatewayConfig,
    @Inject(WorkspacePathService) private readonly paths: WorkspacePathService,
    @Inject(PluginFilesService) private readonly plugins: PluginFilesService,
  ) {}

  async ensureEnv(pluginId: string) {
    const root = await this.plugins.packageRoot(pluginId);
    if (!root) throw new NotFoundException(`Plugin "${pluginId}" not found`);
    const python = process.env.HUB_PYTHON?.trim() || "python3";
    const venvDir = path.join(this.cfg.hubDir, "runtimes", "plugin-venvs", pluginId);
    const requirements = path.join(root, "requirements.txt");
    let requirementsHash = "none";
    try {
      requirementsHash = createHash("sha256").update(await readFile(requirements)).digest("hex");
    } catch {
      requirementsHash = "none";
    }
    const marker = path.join(venvDir, ".ready");
    const bin = venvPython(venvDir);
    try {
      if ((await readFile(marker, "utf8")) === requirementsHash && (await stat(bin)).isFile()) return { ok: true, ready: true };
    } catch {
      // 需要重建
    }
    const created = await run(python, ["-m", "venv", venvDir], { timeoutMs: 120_000 });
    if (!created.ok) return { ok: false, ready: false, error: `embedded Python runtime not found at ${python}. In dev, ensure the runtime is downloaded or set HUB_PYTHON to a system python3. ${created.stderr}`.trim() };
    if (requirementsHash !== "none") {
      const installed = await run(bin, ["-m", "pip", "install", "-r", requirements], { timeoutMs: MAX_TIMEOUT_MS });
      if (!installed.ok) return { ok: false, ready: false, error: installed.stderr || "requirements install failed" };
    }
    await mkdir(venvDir, { recursive: true });
    await writeFile(marker, requirementsHash, "utf8");
    return { ok: true, ready: true };
  }

  async run(pluginId: string, body: { script: string; args?: string[]; inputPaths?: string[]; stdin?: string; timeoutMs?: number }) {
    const root = await this.plugins.packageRoot(pluginId);
    if (!root) throw new NotFoundException(`Plugin "${pluginId}" not found`);
    const script = resolveInside(root, body.script);
    let scriptFile = false;
    if (script) {
      try {
        scriptFile = (await stat(script)).isFile();
      } catch {
        scriptFile = false;
      }
    }
    if (!script || !scriptFile) return { ok: false, stdout: "", stderr: `script not found or outside plugin directory: ${body.script}`, exitCode: -1 };
    const inputs: string[] = [];
    for (const relative of body.inputPaths ?? []) {
      const absolute = this.paths.resolve(relative);
      if (!absolute) return { ok: false, stdout: "", stderr: `input path rejected or missing: ${relative}`, exitCode: -1 };
      try {
        await stat(absolute);
      } catch (error) {
        return { ok: false, stdout: "", stderr: `input path rejected or missing: ${relative} (${error instanceof Error ? error.message : String(error)})`, exitCode: -1 };
      }
      inputs.push(absolute);
    }
    const venvDir = path.join(this.cfg.hubDir, "runtimes", "plugin-venvs", pluginId);
    const bin = venvPython(venvDir);
    try {
      if (!(await stat(bin)).isFile()) return { ok: false, stdout: "", stderr: "venv not ready — call ensureEnv first", exitCode: -1 };
    } catch {
      return { ok: false, stdout: "", stderr: "venv not ready — call ensureEnv first", exitCode: -1 };
    }
    const timeoutMs = Math.min(typeof body.timeoutMs === "number" && body.timeoutMs > 0 ? body.timeoutMs : DEFAULT_TIMEOUT_MS, MAX_TIMEOUT_MS);
    return run(bin, [script, ...(body.args ?? []), ...inputs], {
      cwd: root,
      stdin: body.stdin,
      timeoutMs,
      env: {
        ...process.env,
        VIRTUAL_ENV: venvDir,
        PATH: `${path.dirname(bin)}${path.delimiter}${process.env.PATH ?? ""}`,
        PYTHONNOUSERSITE: "1",
        PYTHONUTF8: "1",
        PYTHONDONTWRITEBYTECODE: "1",
        HUB_WORKSPACE_DIR: this.paths.root,
        HUB_PLUGIN_DATA_DIR: path.join(this.cfg.hubDir, "plugin-data", pluginId),
      },
    });
  }
}

function venvPython(venvDir: string): string {
  return process.platform === "win32" ? path.join(venvDir, "Scripts", "python.exe") : path.join(venvDir, "bin", "python");
}

function resolveInside(root: string, relativePath: string): string | null {
  if (!relativePath || relativePath.includes("\0")) return null;
  const target = path.resolve(root, relativePath);
  const relative = path.relative(root, target);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) return null;
  return target;
}

function run(executable: string, args: string[], options: { cwd?: string; stdin?: string; timeoutMs: number; env?: NodeJS.ProcessEnv }): Promise<{ ok: boolean; stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    let child;
    try {
      child = spawn(executable, args, { cwd: options.cwd, env: options.env, stdio: ["pipe", "pipe", "pipe"] });
    } catch (error) {
      resolve({ ok: false, stdout: "", stderr: error instanceof Error ? error.message : String(error), exitCode: -1 });
      return;
    }
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => {
      stdout = (stdout + chunk.toString("utf8")).slice(0, 1_000_000);
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr = (stderr + chunk.toString("utf8")).slice(0, 1_000_000);
    });
    const timer = setTimeout(() => {
      child.kill();
      stderr = `${stderr}\nplugin script timed out`.trim();
    }, options.timeoutMs);
    child.on("error", (error) => {
      clearTimeout(timer);
      resolve({ ok: false, stdout, stderr: error.message, exitCode: -1 });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      const exitCode = code ?? -1;
      resolve({ ok: exitCode === 0, stdout, stderr, exitCode });
    });
    if (options.stdin !== undefined) child.stdin.end(options.stdin);
    else child.stdin.end();
  });
}
