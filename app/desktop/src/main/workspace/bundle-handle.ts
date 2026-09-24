/**
 * 一个工作区的一套进程：workspace gateway + opencode，外加一个状态机。
 *
 *   creating → gateway-starting → gateway-ready → opencode-starting → bound
 *   任意 → failed；stopping → stopped；failed → stopped
 *
 * 先占端口拿到地址，gateway 和 opencode 就可以**并行**起：opencode 的插件和 MCP
 * server 只需要知道地址，不需要 gateway 已经健康。两边都好了之后把 opencode 地址
 * 推给 gateway；opencode 崩溃重启后端口会变，所以每次回到 ready 都再推一次。
 *
 * opencode 起不来时不判整套失败：画布、资产、生成都不依赖 agent，只是聊天不可用，
 * 原因放在 `readiness.chat` / `error` 里给界面显示。gateway 起不来才是 failed。
 */
import type { EventEmitter } from "node:events";

import { Emitter, type Event } from "../ipc/events.js";
import type { BundleState, BundleStatus, GatewayBinding } from "../ipc/types.js";
import type { Endpoint, LaunchSpec, Status as OpencodeStatus } from "../opencode/runtime.js";
import { identityEnv, identityHeaders, mintIdentity } from "./identity.js";
import { type ActivitySnapshot, canTransitionBundle, type WorkspaceRuntime } from "./lifecycle.js";

/** gateway 进程控制（GatewayManager 满足）。 */
export interface GatewayProcess extends EventEmitter {
  allocatePort(): Promise<string>;
  start(): Promise<{ url: string }>;
  stop(): Promise<void>;
  stopSync(): void;
  readonly running: { url: string } | undefined;
}

/** opencode 进程控制（OpenCodeRuntime 满足）。 */
export interface OpencodeProcess extends EventEmitter {
  start(spec: LaunchSpec): Promise<Endpoint>;
  stop(): Promise<void>;
  stopSync(): void;
  fail(reason: string): void;
  readonly endpoint: Endpoint | undefined;
  readonly status: OpencodeStatus;
}

export interface BundleHandleDeps {
  /** 建 gateway 进程控制；env 里带着工作区身份。 */
  createGateway(folderPath: string, env: Record<string, string>): GatewayProcess;
  createOpencode(): OpencodeProcess;
  /** 备好 opencode 的启动参数（同步 profile、生成配置）。 */
  prepareOpencode(folderPath: string, gatewayUrl: string): LaunchSpec;
  /**
   * opencode 启动闸门。所有工作区共用一个 opencode 数据库，全新数据库上两个进程同时
   * 启动会同时跑建表迁移，后起的那个直接崩溃；所以启动（到健康为止）排队进行。
   */
  opencodeStartGate?: <T>(fn: () => Promise<T>) => Promise<T>;
  log?: (line: string) => void;
}

/** 串行闸门：前一个结束（无论成败）后一个才开始。 */
export function createSerialGate(): <T>(fn: () => Promise<T>) => Promise<T> {
  let tail: Promise<unknown> = Promise.resolve();
  return <T>(fn: () => Promise<T>) => {
    const next = tail.then(fn, fn);
    tail = next.catch(() => undefined);
    return next;
  };
}

const PROBE_TIMEOUT_MS = 3000;

export class BundleHandle implements WorkspaceRuntime {
  private current: BundleStatus;
  private readonly changed = new Emitter<BundleStatus>();
  readonly onStatusChange: Event<BundleStatus> = this.changed.event;
  /** 频道上只挂这个，渲染层碰不到生命周期方法。 */
  readonly view: { getStatus(): BundleStatus; onStatusChange: Event<BundleStatus> };

  private readonly gateway: GatewayProcess;
  private readonly opencode: OpencodeProcess;
  private readonly identity: { claim: string; instanceId: string; generation: number };
  private startPromise?: Promise<BundleStatus>;
  private disposePromise?: Promise<void>;
  private disposed = false;
  private readonly log: (line: string) => void;

  constructor(
    readonly workspaceId: string,
    readonly folderPath: string,
    generation: number,
    private readonly deps: BundleHandleDeps,
  ) {
    this.log = deps.log ?? ((l) => console.log(l));
    this.current = { workspaceId, folderPath, state: "creating", revision: 0 };
    this.identity = mintIdentity(folderPath, generation);
    this.gateway = deps.createGateway(folderPath, identityEnv(this.identity));
    this.opencode = deps.createOpencode();
    this.view = { getStatus: () => this.status(), onStatusChange: this.onStatusChange };

    this.gateway.on("failed", (reason: string) => {
      if (this.disposed) return;
      this.transition("failed", { error: `gateway 反复退出：${reason}` });
      void this.stopProcesses();
    });
    this.opencode.on("status", (s: OpencodeStatus) => this.onOpencodeStatus(s));
  }

  status(): BundleStatus {
    return { ...this.current };
  }

  binding(): GatewayBinding | undefined {
    const url = this.current.gatewayUrl;
    if (!url || this.current.state === "failed" || this.current.state === "stopped") return undefined;
    return { baseUrl: url, claim: this.identity.claim, instanceId: this.identity.instanceId, generation: this.identity.generation };
  }

  private transition(state: BundleState, patch: Partial<BundleStatus> = {}): boolean {
    if (!canTransitionBundle(this.current.state, state)) return false;
    this.current = { ...this.current, ...patch, state, revision: this.current.revision + 1 };
    this.changed.fire(this.status());
    return true;
  }

  start(): Promise<BundleStatus> {
    this.startPromise ??= this.begin();
    return this.startPromise;
  }

  private async begin(): Promise<BundleStatus> {
    this.transition("gateway-starting");
    let url: string;
    try {
      url = await this.gateway.allocatePort();
    } catch (err) {
      this.transition("failed", { error: `分配端口失败：${errorText(err)}` });
      return this.status();
    }
    if (this.disposed) return this.status();
    this.transition("gateway-starting", { gatewayUrl: url });
    // 其余步骤在后台推进，调用方拿到地址即可返回
    queueMicrotask(() => void this.drive(url));
    return this.status();
  }

  private async drive(url: string): Promise<void> {
    const gatewayUp = this.gateway.start();
    const opencodeUp = this.launchOpencode(url);
    try {
      await gatewayUp;
    } catch (err) {
      if (this.disposed) return;
      this.transition("failed", { error: `gateway 没有启动：${errorText(err)}` });
      await this.stopProcesses();
      return;
    }
    if (this.disposed) return;
    this.transition("gateway-ready");
    this.transition("opencode-starting", { readiness: { chat: "starting" } });
    const ep = await opencodeUp;
    if (this.disposed || this.current.state !== "opencode-starting") return;
    if (ep) {
      await this.pushOpencodeUrl(ep);
      this.transition("bound", { openCodeUrl: ep.url, readiness: { chat: "ready" }, error: undefined });
    } else {
      const reason = this.opencode.status.state === "failed" ? this.opencode.status.reason : "opencode 没有启动";
      this.transition("bound", { readiness: { chat: "failed" }, error: reason });
    }
  }

  private async launchOpencode(url: string): Promise<Endpoint | undefined> {
    try {
      const gate = this.deps.opencodeStartGate ?? (<T>(fn: () => Promise<T>) => fn());
      return await gate(async () => {
        if (this.disposed) return undefined;
        const spec = this.deps.prepareOpencode(this.folderPath, url);
        return this.opencode.start(spec);
      });
    } catch (err) {
      this.log(`opencode 没有启动（${this.folderPath}）：${errorText(err)}`);
      if (this.opencode.status.state !== "failed") this.opencode.fail(errorText(err));
      return undefined;
    }
  }

  private onOpencodeStatus(s: OpencodeStatus): void {
    if (this.disposed || this.current.state !== "bound") return;
    if (s.state === "ready") {
      const ep = this.opencode.endpoint;
      if (ep) void this.pushOpencodeUrl(ep);
      this.transition("bound", { openCodeUrl: s.url, readiness: { chat: "ready" }, error: undefined });
    } else if (s.state === "failed") {
      this.transition("bound", { readiness: { chat: "failed" }, error: s.reason });
    }
  }

  private async pushOpencodeUrl(ep: Endpoint): Promise<void> {
    const url = this.gateway.running?.url ?? this.current.gatewayUrl;
    if (!url) return;
    try {
      const r = await fetch(`${url}/api/runtime/opencode-url`, {
        method: "POST",
        headers: { "content-type": "application/json", ...identityHeaders(this.binding()) },
        body: JSON.stringify({ url: ep.url, username: ep.username, password: ep.password }),
        signal: AbortSignal.timeout(5000),
      });
      if (!r.ok) this.log(`推送 opencode 地址失败：${r.status}`);
    } catch (err) {
      this.log(`推送 opencode 地址失败：${errorText(err)}`);
    }
  }

  async probeActivity(drain = false): Promise<ActivitySnapshot | undefined> {
    const url = this.gateway.running?.url;
    if (!url || this.disposed) return undefined;
    try {
      const r = await fetch(`${url}/api/health/activity${drain ? "?drain=1" : ""}`, {
        headers: identityHeaders(this.binding()),
        signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
      });
      if (!r.ok) return undefined;
      return (await r.json()) as ActivitySnapshot;
    } catch {
      return undefined;
    }
  }

  async releaseSuspendLease(): Promise<void> {
    const url = this.gateway.running?.url;
    if (!url) return;
    try {
      await fetch(`${url}/api/health/suspend-lease`, {
        method: "DELETE",
        headers: identityHeaders(this.binding()),
        signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
      });
    } catch {
      // gateway 已经没了，租约也就没了
    }
  }

  async restartOpencode(): Promise<void> {
    const url = this.current.gatewayUrl;
    if (!url || this.disposed || this.current.state !== "bound") return;
    const ep = await this.launchOpencode(url);
    if (ep) await this.pushOpencodeUrl(ep);
  }

  private async stopProcesses(): Promise<void> {
    // 先停 opencode：反过来的话它的插件会对着一个已经没了的 gateway 报一串错
    await this.opencode.stop().catch(() => undefined);
    await this.gateway.stop().catch(() => undefined);
  }

  dispose(): Promise<void> {
    this.disposePromise ??= (async () => {
      this.disposed = true;
      this.transition("stopping");
      await this.stopProcesses();
      this.transition("stopped");
      this.changed.dispose();
    })();
    return this.disposePromise;
  }

  disposeSync(): void {
    this.disposed = true;
    this.opencode.stopSync();
    this.gateway.stopSync();
  }
}

function errorText(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
