/**
 * 测试用的假工作区进程。不起任何子进程，状态由测试手动推进。
 */
import { Emitter, type IDisposable } from "../ipc/events.js";
import type { BundleState, BundleStatus, GatewayBinding } from "../ipc/types.js";
import type { ActivitySnapshot, RuntimeCreateOptions, WorkspaceRuntime } from "./lifecycle.js";

let portSeq = 40000;

export class FakeRuntime implements WorkspaceRuntime {
  private current: BundleStatus;
  private readonly changed = new Emitter<BundleStatus>();
  readonly onStatusChange = this.changed.event;
  readonly view: WorkspaceRuntime["view"];
  idle = true;
  disposed = false;
  leasesTaken = 0;
  leasesReleased = 0;
  /** start() 时直接走到 bound。 */
  autoBind = true;
  failOnStart: string | undefined;
  readonly url = `http://127.0.0.1:${portSeq++}`;

  constructor(
    readonly workspaceId: string,
    readonly folderPath: string,
    readonly opts: RuntimeCreateOptions,
  ) {
    this.current = { workspaceId, folderPath, state: "creating", revision: 0 };
    this.view = { getStatus: () => this.status(), onStatusChange: this.onStatusChange };
  }

  status(): BundleStatus {
    return { ...this.current };
  }

  set(state: BundleState, patch: Partial<BundleStatus> = {}): void {
    this.current = { ...this.current, ...patch, state, revision: this.current.revision + 1 };
    this.changed.fire(this.status());
  }

  binding(): GatewayBinding | undefined {
    if (!this.current.gatewayUrl || this.current.state === "failed" || this.disposed) return undefined;
    return { baseUrl: this.current.gatewayUrl, claim: "c", instanceId: `${this.workspaceId}#${this.opts.generation}`, generation: this.opts.generation };
  }

  async start(): Promise<BundleStatus> {
    if (this.failOnStart) {
      this.set("failed", { error: this.failOnStart });
      return this.status();
    }
    this.set("gateway-starting", { gatewayUrl: this.url });
    if (this.autoBind) {
      this.set("gateway-ready");
      this.set("opencode-starting");
      this.set("bound");
    }
    return this.status();
  }

  async probeActivity(drain = false): Promise<ActivitySnapshot | undefined> {
    if (this.disposed) return undefined;
    const safe = this.idle;
    if (drain && safe) this.leasesTaken++;
    return { idle: safe, safe_to_suspend: safe, safe_to_close: safe, blocking_reasons: safe ? [] : ["agent_running"] };
  }

  async releaseSuspendLease(): Promise<void> {
    this.leasesReleased++;
  }

  async restartOpencode(): Promise<void> {}

  async dispose(): Promise<void> {
    if (this.disposed) return;
    this.disposed = true;
    this.set("stopping");
    this.set("stopped");
  }

  disposeSync(): void {
    this.disposed = true;
  }
}

export class FakeFactory {
  readonly created: FakeRuntime[] = [];
  readonly channels = new Map<string, object>();
  /** 下一次创建时对新实例的调整。 */
  tweak?: (r: FakeRuntime) => void;

  create = (id: string, folder: string, opts: RuntimeCreateOptions): FakeRuntime => {
    const r = new FakeRuntime(id, folder, opts);
    this.tweak?.(r);
    this.created.push(r);
    return r;
  };

  register = (name: string, svc: object): IDisposable => {
    this.channels.set(name, svc);
    return { dispose: () => this.channels.delete(name) };
  };

  latest(folder: string): FakeRuntime | undefined {
    return [...this.created].reverse().find((r) => r.folderPath === folder);
  }

  liveCount(): number {
    return this.created.filter((r) => !r.disposed).length;
  }
}
