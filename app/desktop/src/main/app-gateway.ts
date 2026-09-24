/**
 * 应用级 gateway：不绑工作区，首页的技能、模型配置、安全检查、跨工作区的卡片摘要
 * 都打到它。窗口不等它 —— 先占端口把地址交给窗口，进程在后台起，就绪与否经
 * `gateway-readiness` 频道告诉渲染层。
 */
import { Emitter, type Event } from "./ipc/events.js";
import type { GatewayReadinessSnapshot } from "./ipc/types.js";

export class GatewayReadinessService {
  private snapshot: GatewayReadinessSnapshot = { state: "allocated", url: "" };
  private readonly changed = new Emitter<GatewayReadinessSnapshot>();
  /** 类字段：总线按可枚举属性找事件。 */
  readonly onDidChange: Event<GatewayReadinessSnapshot> = this.changed.event;

  getSnapshot(): GatewayReadinessSnapshot {
    return { ...this.snapshot };
  }

  private set(next: GatewayReadinessSnapshot): void {
    this.snapshot = next;
    this.changed.fire({ ...next });
  }

  markAllocated(url: string): void {
    this.set({ state: "allocated", url });
  }

  markStarting(): void {
    this.set({ state: "starting", url: this.snapshot.url, startedAt: Date.now() });
  }

  markReady(url?: string): void {
    this.set({ state: "ready", url: url ?? this.snapshot.url, startedAt: this.snapshot.startedAt, readyAt: Date.now() });
  }

  markFailed(errorKind: string, message: string): void {
    this.set({ state: "failed", url: this.snapshot.url, startedAt: this.snapshot.startedAt, errorKind, message });
  }
}

/** 渲染层只能读，不能改状态：频道上挂这个视图而不是服务本身。 */
export function readinessView(svc: GatewayReadinessService): { getSnapshot(): GatewayReadinessSnapshot; onDidChange: Event<GatewayReadinessSnapshot> } {
  return { getSnapshot: () => svc.getSnapshot(), onDidChange: svc.onDidChange };
}

/** 进程控制的最小形状，便于测试替换。 */
export interface AppGatewayProcess {
  allocatePort(): Promise<string>;
  start(): Promise<{ url: string }>;
  stop(): Promise<void>;
  stopSync(): void;
  on(event: "failed", listener: (reason: string) => void): unknown;
}

export const APP_GATEWAY_BACKOFF_MS = [0, 1500, 4000];

export class AppGateway {
  private running?: Promise<void>;
  private stopped = false;

  constructor(
    private readonly proc: AppGatewayProcess,
    readonly readiness: GatewayReadinessService,
    private readonly log: (line: string) => void = (l) => console.log(l),
    private readonly backoff: number[] = APP_GATEWAY_BACKOFF_MS,
  ) {
    proc.on("failed", (reason) => {
      if (!this.stopped) readiness.markFailed("crashed", reason);
    });
  }

  /** 占端口并登记地址。窗口创建前调。 */
  async allocate(): Promise<string> {
    const url = await this.proc.allocatePort();
    this.readiness.markAllocated(url);
    return url;
  }

  /** 后台启动，按退避重试；不抛。重复调用复用进行中的那次。 */
  startInBackground(): Promise<void> {
    if (!this.running) {
      this.running = this.runWithBackoff().finally(() => {
        this.running = undefined;
      });
    }
    return this.running;
  }

  /** 失败后手动重试（渲染层的"重试"按钮）。 */
  async retry(): Promise<void> {
    if (this.readiness.getSnapshot().state === "ready") return;
    await this.startInBackground();
  }

  private async runWithBackoff(): Promise<void> {
    this.readiness.markStarting();
    let last = "";
    for (const delay of this.backoff) {
      if (this.stopped) return;
      if (delay > 0) await new Promise((r) => setTimeout(r, delay));
      if (this.stopped) return;
      try {
        const gw = await this.proc.start();
        this.readiness.markReady(gw.url);
        this.log(`应用级 gateway 就绪 ${gw.url}`);
        return;
      } catch (err) {
        last = err instanceof Error ? err.message : String(err);
        this.log(`应用级 gateway 启动失败：${last}`);
      }
    }
    this.readiness.markFailed("start_failed", last);
  }

  async stop(): Promise<void> {
    this.stopped = true;
    await this.proc.stop();
  }

  stopSync(): void {
    this.stopped = true;
    this.proc.stopSync();
  }
}
