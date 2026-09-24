/**
 * 拉起并看护一个 gateway 子进程。
 *
 * - 用 `process.execPath` + `ELECTRON_RUN_AS_NODE=1` 跑 `gateway/dist/main.js`：
 *   Electron 自带 Node，不需要再打包一个。
 * - 健康检查比对 `X-Gateway-Nonce`：端口上可能残留着上一次的 gateway，只看 200
 *   会把旧进程当成新的，而旧进程的工作区、opencode 地址全是错的。
 * - stdio 带 ipc 通道，留给关停前的收尾通知。
 */
import { type ChildProcess, spawn, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { EventEmitter } from "node:events";
import { existsSync } from "node:fs";
import { createServer } from "node:net";
import path from "node:path";
import { createInterface } from "node:readline";

export type GatewayRole = "workspace" | "app-level";

export interface GatewaySpec {
  entry: string;
  role: GatewayRole;
  /** workspace 角色必须有。 */
  workspaceDir?: string;
  /** 额外环境变量（OPENCODE_*、FFMPEG_PATH、OV_CONFIG_PATH、HILO_MAIN_BRIDGE_* …）。 */
  env?: Record<string, string>;
  /** 跑 gateway 的可执行文件，默认 process.execPath。 */
  exec?: string;
  /** 固定端口；不给就找一个空闲的。 */
  port?: number;
}

export interface RunningGateway {
  url: string;
  port: number;
  nonce: string;
  pid: number;
}

export type Logger = (line: string) => void;

const HEALTH_TIMEOUT_MS = 15_000;
const HEALTH_INTERVAL_MS = 300;
const MAX_RESTARTS = 3;

export class GatewayManager extends EventEmitter {
  private child?: ChildProcess;
  private current?: RunningGateway;
  private stopping = false;

  constructor(
    private readonly spec: GatewaySpec,
    private readonly log: Logger = (l) => console.log(l),
  ) {
    super();
    if (spec.role === "workspace" && !spec.workspaceDir) throw new Error("workspace gateway 需要 workspaceDir");
  }

  get running(): RunningGateway | undefined {
    return this.current;
  }

  async start(): Promise<RunningGateway> {
    this.stopping = false;
    const gw = await this.spawnOnce();
    this.supervise();
    return gw;
  }

  private async spawnOnce(): Promise<RunningGateway> {
    if (!existsSync(this.spec.entry)) throw new Error(`找不到 gateway 入口: ${this.spec.entry}`);
    const port = this.spec.port ?? (await freePort());
    const nonce = randomUUID();
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      ...this.spec.env,
      ELECTRON_RUN_AS_NODE: "1",
      NODE_ENV: "production",
      PORT: String(port),
      HILO_GATEWAY_HOST: "127.0.0.1",
      HILO_GATEWAY_ROLE: this.spec.role,
      GATEWAY_NONCE: nonce,
      ...(this.spec.workspaceDir ? { WORKSPACE_DIR: this.spec.workspaceDir, OUTPUT_DIR: this.spec.workspaceDir } : {}),
    };
    const child = spawn(this.spec.exec ?? process.execPath, [this.spec.entry], {
      cwd: path.dirname(this.spec.entry),
      env,
      stdio: ["ignore", "pipe", "pipe", "ipc"],
      detached: process.platform !== "win32",
      windowsHide: true,
    });
    this.child = child;
    for (const [stream, which] of [
      [child.stdout, "stdout"],
      [child.stderr, "stderr"],
    ] as const) {
      if (stream) createInterface({ input: stream }).on("line", (l) => this.log(`[gateway ${this.spec.role} ${which}] ${l}`));
    }
    const url = `http://127.0.0.1:${port}`;
    await this.waitHealthy(url, nonce, child);
    this.current = { url, port, nonce, pid: child.pid! };
    this.emit("ready", this.current);
    return this.current;
  }

  private async waitHealthy(url: string, nonce: string, child: ChildProcess): Promise<void> {
    const deadline = Date.now() + HEALTH_TIMEOUT_MS;
    let last = "还没有响应";
    while (Date.now() < deadline) {
      if (child.exitCode !== null || child.signalCode !== null) {
        throw new Error(`gateway 启动过程中退出了（${child.exitCode ?? child.signalCode}）`);
      }
      try {
        const r = await fetch(`${url}/api/health/live`, { signal: AbortSignal.timeout(2000) });
        const got = r.headers.get("x-gateway-nonce");
        if (r.ok && got === nonce) return;
        last = r.ok ? `nonce 不符（${got ?? "无"}）：端口上是别的 gateway` : `health 回 ${r.status}`;
      } catch (err) {
        last = err instanceof Error ? err.message : String(err);
      }
      await new Promise((r) => setTimeout(r, HEALTH_INTERVAL_MS));
    }
    killTree(child.pid, true);
    throw new Error(`gateway ${HEALTH_TIMEOUT_MS / 1000}s 内没有就绪：${last}`);
  }

  private supervise() {
    let attempts = 0;
    const watch = (child: ChildProcess) => {
      child.once("exit", async (code, signal) => {
        if (this.stopping || child !== this.child) return;
        this.current = undefined;
        this.emit("down", { code, signal });
        if (++attempts > MAX_RESTARTS) {
          this.emit("failed", `gateway 反复退出（最后一次 ${code ?? signal}）`);
          return;
        }
        this.log(`gateway 意外退出（${code ?? signal}），第 ${attempts} 次重启`);
        await new Promise((r) => setTimeout(r, Math.min(1000 * 2 ** (attempts - 1), 10_000)));
        if (this.stopping) return;
        try {
          await this.spawnOnce();
          watch(this.child!);
        } catch (err) {
          this.emit("failed", String(err));
        }
      });
    };
    if (this.child) watch(this.child);
  }

  async stop(): Promise<void> {
    this.stopping = true;
    const child = this.child;
    this.child = undefined;
    this.current = undefined;
    if (!child?.pid || child.exitCode !== null) return;
    const exited = new Promise<void>((r) => child.once("exit", () => r()));
    killTree(child.pid, false);
    const timedOut = await Promise.race([exited.then(() => false), new Promise<boolean>((r) => setTimeout(() => r(true), 5000))]);
    if (timedOut) killTree(child.pid, true);
  }

  stopSync(): void {
    this.stopping = true;
    killTree(this.child?.pid, true);
    this.child = undefined;
  }
}

function killTree(pid: number | undefined, force: boolean) {
  if (!pid) return;
  try {
    if (process.platform === "win32") spawnSync("taskkill", ["/T", ...(force ? ["/F"] : []), "/PID", String(pid)], { windowsHide: true });
    else process.kill(-pid, force ? "SIGKILL" : "SIGTERM");
  } catch {
    // 已经没了
  }
}

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.once("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const a = srv.address();
      const port = typeof a === "object" && a ? a.port : 0;
      srv.close(() => resolve(port));
    });
  });
}
