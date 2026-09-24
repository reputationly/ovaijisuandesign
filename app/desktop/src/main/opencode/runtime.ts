/**
 * 拉起、看护、关掉 `opencode serve`。一个工作区一个实例。
 *
 * 连接信息（地址 + basic auth）只在主进程和 gateway 之间流动，不给渲染层。
 */
import { type ChildProcess, spawn, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { EventEmitter } from "node:events";
import { rmSync, statSync } from "node:fs";
import { createServer } from "node:net";
import { createInterface } from "node:readline";

export interface Endpoint {
  url: string;
  username: string;
  password: string;
}

export function basicAuth(ep: Endpoint): string {
  return "Basic " + Buffer.from(`${ep.username}:${ep.password}`).toString("base64");
}

export type Status =
  | { state: "stopped" }
  | { state: "starting" }
  | { state: "ready"; url: string; version: string }
  /** 起不来 / 崩溃次数用完。reason 原样给用户看。 */
  | { state: "failed"; reason: string };

export interface LaunchSpec {
  binary: string;
  cwd: string;
  /** 追加 / 覆盖到继承环境上的变量。 */
  env: Record<string, string>;
  /** 配置临时文件，stop 时删。 */
  configFile: string;
}

/** 继承环境时要去掉的：这些由我们显式给，继承下来的旧值会顶掉或混进去。 */
export const SCRUBBED_ENV = [
  "OPENCODE_CONFIG",
  "OPENCODE_CONFIG_DIR",
  "OPENCODE_CONFIG_CONTENT",
  "HILO_WORKFLOWS_DIR",
  "HILO_KNOWLEDGE_DIR",
  "HILO_CONTRACTS_DIR",
  "HILO_AGENT_RUN_ID",
];

const MAX_RESTARTS = 3;
const STABLE_RESET_MS = 5 * 60_000;

export type Logger = (line: string) => void;

export class OpenCodeRuntime extends EventEmitter {
  private spec?: LaunchSpec;
  private child?: ChildProcess;
  private _status: Status = { state: "stopped" };
  private _endpoint?: Endpoint;
  private stopping = false;

  constructor(private readonly log: Logger = (l) => console.log(l)) {
    super();
  }

  get status(): Status {
    return this._status;
  }

  /** 在跑时给出连接信息。 */
  get endpoint(): Endpoint | undefined {
    return this._endpoint;
  }

  private setStatus(s: Status) {
    this._status = s;
    this.emit("status", s);
  }

  /** 还没走到 spawn 就失败了（配置缺失之类）。记下原因给界面看。 */
  fail(reason: string) {
    this.setStatus({ state: "failed", reason });
  }

  /** 起一个新实例（已有的先停）。返回时已通过健康检查。 */
  async start(spec: LaunchSpec): Promise<Endpoint> {
    await this.stop();
    this.spec = spec;
    this.stopping = false;
    const ep = await this.spawnOnce();
    this.supervise();
    return ep;
  }

  private async spawnOnce(): Promise<Endpoint> {
    const spec = this.spec!;
    this.setStatus({ state: "starting" });
    try {
      return await this.spawnInner(spec);
    } catch (err) {
      this.setStatus({ state: "failed", reason: err instanceof Error ? err.message : String(err) });
      throw err;
    }
  }

  private async spawnInner(spec: LaunchSpec): Promise<Endpoint> {
    checkBinary(spec.binary);
    const port = await freePort();
    // 每个实例一对随机凭据。opencode 只靠这个保护 —— 本机别的进程能扫到端口。
    const username = randomUUID();
    const password = randomUUID();
    const env: NodeJS.ProcessEnv = { ...process.env };
    for (const k of SCRUBBED_ENV) delete env[k];
    Object.assign(env, spec.env, { OPENCODE_SERVER_USERNAME: username, OPENCODE_SERVER_PASSWORD: password });

    const child = spawn(spec.binary, ["serve", "--hostname", "127.0.0.1", "--port", String(port)], {
      cwd: spec.cwd,
      env,
      stdio: ["ignore", "pipe", "pipe"],
      // 独立进程组：停的时候连 MCP server 等子进程一起杀。代价是它**不会**跟着
      // 我们退出 —— 退出路径上必须显式 stop()。
      detached: process.platform !== "win32",
      windowsHide: true,
    });
    this.child = child;
    let listening = false;
    for (const [stream, which] of [
      [child.stdout, "stdout"],
      [child.stderr, "stderr"],
    ] as const) {
      if (!stream) continue;
      createInterface({ input: stream }).on("line", (line) => {
        if (line.includes("listening on")) listening = true;
        this.log(`[opencode ${which}] ${line}`);
      });
    }

    const ep: Endpoint = { url: `http://127.0.0.1:${port}`, username, password };
    const version = await this.waitHealthy(ep, () => listening, child);
    this.log(`opencode ${version} 就绪 ${ep.url}`);
    this._endpoint = ep;
    this.setStatus({ state: "ready", url: ep.url, version });
    return ep;
  }

  /**
   * 轮询 `/global/health`，要 `{healthy: true, version}`。超时分两级：软超时之后，
   * 如果输出里已经出现过 `listening on`（进程确实起来了，只是慢 —— 首次启动要
   * 迁移 DB），继续等到硬超时。
   */
  private async waitHealthy(ep: Endpoint, listening: () => boolean, child: ChildProcess): Promise<string> {
    const soft = process.platform === "darwin" ? 90_000 : process.platform === "win32" ? 120_000 : 30_000;
    const hard = Math.min(soft * 2, 240_000);
    const start = Date.now();
    let lastErr = "还没有响应";
    for (;;) {
      if (child.exitCode !== null || child.signalCode !== null) {
        throw new Error(`opencode 启动过程中退出了（${child.exitCode ?? child.signalCode}）。详情见日志里的 [opencode] 行`);
      }
      try {
        const r = await fetch(`${ep.url}/global/health`, {
          headers: { authorization: basicAuth(ep) },
          signal: AbortSignal.timeout(2000),
        });
        if (r.ok) {
          const v = (await r.json().catch(() => ({}))) as { healthy?: boolean; version?: string };
          if (v.healthy === true) return v.version ?? "?";
          lastErr = `health 回的不是 healthy: ${JSON.stringify(v)}`;
        } else {
          lastErr = `health 回 ${r.status}`;
        }
      } catch (err) {
        lastErr = err instanceof Error ? err.message : String(err);
      }
      const limit = listening() ? hard : soft;
      if (Date.now() - start > limit) {
        await this.kill();
        throw new Error(`opencode ${Math.round(limit / 1000)}s 内没有就绪：${lastErr}`);
      }
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  /** 看护：进程意外退出时按退避重启（1s·2^(n-1)，上限 10s，再错开 750ms）。 */
  private supervise() {
    let attempts = 0;
    let upSince = Date.now();
    const watch = (child: ChildProcess) => {
      child.once("exit", async (code, signal) => {
        if (this.stopping || child !== this.child) return;
        this._endpoint = undefined;
        if (Date.now() - upSince > STABLE_RESET_MS) attempts = 0;
        attempts++;
        const what = code ?? signal;
        if (attempts > MAX_RESTARTS) {
          this.setStatus({ state: "failed", reason: `opencode 反复退出（最后一次 ${what}），已停止自动重启` });
          return;
        }
        const backoff = Math.min(1000 * 2 ** (attempts - 1), 10_000) + 750;
        this.log(`opencode 意外退出（${what}），${backoff}ms 后第 ${attempts} 次重启`);
        await new Promise((r) => setTimeout(r, backoff));
        if (this.stopping) return;
        try {
          await this.spawnOnce();
          upSince = Date.now();
          watch(this.child!);
        } catch (err) {
          this.log(`opencode 重启失败: ${String(err)}`);
        }
      });
    };
    if (this.child) watch(this.child);
  }

  /** 停掉：先 TERM 整个进程组，等 5s（Windows 1s）还在就 KILL。 */
  async stop(): Promise<void> {
    this.stopping = true;
    await this.kill();
    this._endpoint = undefined;
    if (this.spec) rmSync(this.spec.configFile, { force: true });
    this.setStatus({ state: "stopped" });
  }

  /** 同步版，给进程退出钩子用（那里不能 await）。 */
  stopSync(): void {
    this.stopping = true;
    const pid = this.child?.pid;
    if (pid) killTree(pid, true);
    this.child = undefined;
    if (this.spec) rmSync(this.spec.configFile, { force: true });
  }

  private async kill(): Promise<void> {
    const child = this.child;
    this.child = undefined;
    if (!child?.pid || child.exitCode !== null) return;
    const exited = new Promise<void>((r) => child.once("exit", () => r()));
    killTree(child.pid, false);
    const grace = process.platform === "win32" ? 1000 : 5000;
    const timedOut = await Promise.race([exited.then(() => false), new Promise<boolean>((r) => setTimeout(() => r(true), grace))]);
    if (timedOut) killTree(child.pid, true);
  }
}

function killTree(pid: number, force: boolean) {
  try {
    if (process.platform === "win32") {
      spawnSync("taskkill", ["/T", ...(force ? ["/F"] : []), "/PID", String(pid)], { windowsHide: true });
    } else {
      // 进程组 id 就是 pid（spawn 时 detached）。负号表示整个组。
      process.kill(-pid, force ? "SIGKILL" : "SIGTERM");
    }
  } catch {
    // 已经没了
  }
}

/** 不是 opencode 的东西（下载坏了、被截断）会在 spawn 时报一个看不出原因的错。 */
function checkBinary(p: string) {
  let size: number;
  try {
    size = statSync(p).size;
  } catch {
    throw new Error(`找不到 opencode: ${p}`);
  }
  if (size < 1_000_000) throw new Error(`${p} 只有 ${size} 字节，不像是 opencode（下载不完整？）`);
}

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.once("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const addr = srv.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      srv.close(() => resolve(port));
    });
  });
}
