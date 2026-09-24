/**
 * 多工作区宿主（`hilo` 频道）。
 *
 * 管三类标签：
 * - live：进程在跑（含正在起）；
 * - cold：只有标签没有进程（刚恢复、被挂起、或启动失败留下的壳）；
 * - failed：启动失败的那套进程先留着，状态频道还在，渲染层能看到失败原因并重试。
 *
 * 预算：同时在跑的工作区最多 `maxOpenWorkspaces` 个。要开新的时，先按"转到后台的
 * 时间"从早到晚挑空闲的后台工作区挂起腾位置；一个都挂不了就返回 `limit_reached`。
 * 后台闲置超过 `idleSuspendMs` 的也会被定时挂起。挂起 = 停进程、留冷标签，激活时重开。
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";

import { Emitter, type Event, type IDisposable } from "../ipc/events.js";
import type {
  BundleStatus,
  WorkspaceCloseOptions,
  WorkspaceCloseResult,
  WorkspaceCreateRequest,
  WorkspaceEntry,
  WorkspaceLifecycleState,
  WorkspaceOpenResult,
  WorkspacePersistenceReport,
  WorkspaceRuntimeInfo,
  WorkspaceStageResult,
} from "../ipc/types.js";
import { generateProjectDirName } from "../project/naming.js";
import { isForeignAppPath } from "../roots.js";
import { workspaceWsUrl } from "./identity.js";
import { bundleToLifecycle, canTransitionLifecycle, type RuntimeFactory, type WorkspaceRuntime } from "./lifecycle.js";

export const DEFAULT_MAX_OPEN_WORKSPACES = 5;
export const DEFAULT_IDLE_SUSPEND_MS = 10 * 60_000;
export const DEFAULT_SWEEP_INTERVAL_MS = 60_000;
const MAX_FAILED_KEPT = 10;

export interface HiloAppConfig {
  createRuntime: RuntimeFactory;
  /** 把服务挂到总线上的一个频道，返回注销句柄。 */
  registerChannel(name: string, service: object): IDisposable;
  projectsRoot(): string;
  home: string;
  maxOpenWorkspaces?: number;
  idleSuspendMs?: number;
  sweepIntervalMs?: number;
  /** false 时不为腾位置而挂起别的工作区。 */
  autoSuspend?: boolean;
  /** 开了一个工作区（更新最近列表）。 */
  onWorkspaceOpened?(folderPath: string): void;
  /** 标签集合变了（持久化给下次启动恢复）。 */
  onOpenWorkspacesChanged?(paths: string[]): void;
  /** 关掉了一个工作区（清掉它的恢复计数）。 */
  onWorkspaceClosed?(folderPath: string): void;
  applyCreatePreferences?(dir: string, loadUserMemory: unknown): void;
  showHome?(): void;
  /** 旧式包装方法遇到阻断结果时的提示（系统通知）。 */
  notify?(result: WorkspaceOpenResult): void;
  toggleSkill?(name: string, enabled: boolean): Promise<unknown>;
  retryAppGateway?(): Promise<void>;
  log?(line: string): void;
  now?(): number;
}

interface RuntimeEntry {
  key: string;
  folderPath: string;
  runtime: WorkspaceRuntime;
  channels: IDisposable[];
  statusSub?: IDisposable;
}

type OpenOptions = { loadUserMemory?: unknown; fromRetry?: boolean };

function projectNameOf(folderPath: string): string {
  return path.basename(folderPath) || "Project";
}

function sanitizeSource(source: unknown): string {
  return typeof source === "string" ? source.replace(/[^a-zA-Z0-9:_-]/g, "").slice(0, 64) : "";
}

export class HiloApp {
  private readonly live = new Map<string, RuntimeEntry>();
  private readonly failed = new Map<string, RuntimeEntry>();
  private readonly cold = new Map<string, { folderPath: string }>();
  private order: string[] = [];
  private readonly lifecycle = new Map<string, WorkspaceLifecycleState>();
  private readonly backgroundSince = new Map<string, number>();
  private readonly opening = new Map<string, Promise<WorkspaceOpenResult>>();
  private readonly closing = new Map<string, Promise<void>>();
  private readonly retrying = new Set<string>();
  private readonly retryCounts = new Map<string, number>();
  private readonly generations = new Map<string, number>();
  private readonly persistence = new Map<string, { instanceId: string; state: WorkspacePersistenceReport["state"] }>();
  private readonly focusedSessions = new Map<string, string | null>();
  private rendererDiagnostics: Record<string, unknown> = {};
  private activeKey: string | undefined;
  private admitted = 0;
  private admission: Promise<unknown> = Promise.resolve();
  private epoch = 0;
  private shuttingDown = false;
  private sweepTimer?: ReturnType<typeof setInterval>;
  private closeAllInFlight?: Promise<{ closed: boolean; reason?: string }>;
  private skillQueue: Promise<unknown> = Promise.resolve();

  private readonly entriesChanged = new Emitter<WorkspaceEntry[]>();
  /** 类字段：总线按可枚举属性找事件。 */
  readonly onWorkspaceEntriesChanged: Event<WorkspaceEntry[]> = this.entriesChanged.event;

  constructor(private readonly config: HiloAppConfig) {}

  // -------------------------------------------------------------------------
  // 基础

  private get maxOpen(): number {
    return this.config.maxOpenWorkspaces ?? DEFAULT_MAX_OPEN_WORKSPACES;
  }

  private now(): number {
    return this.config.now?.() ?? Date.now();
  }

  private log(line: string): void {
    this.config.log?.(`[hilo-app] ${line}`);
  }

  private keyOf(folderPath: string): string {
    if (typeof folderPath !== "string" || !folderPath.trim()) throw new Error("folderPath must be a non-empty string");
    return path.resolve(folderPath);
  }

  private setLifecycle(key: string, next: WorkspaceLifecycleState): void {
    const prev = this.lifecycle.get(key) ?? "cold";
    if (!canTransitionLifecycle(prev, next)) this.log(`生命周期跳变 ${prev} → ${next}（${key}）`);
    this.lifecycle.set(key, next);
    if (next === "background") {
      if (!this.backgroundSince.has(key)) this.backgroundSince.set(key, this.now());
    } else {
      this.backgroundSince.delete(key);
    }
  }

  private ensureOrder(key: string): void {
    if (!this.order.includes(key)) this.order.push(key);
  }

  private known(key: string): boolean {
    return this.live.has(key) || this.cold.has(key) || this.failed.has(key) || this.opening.has(key);
  }

  private emitEntriesChanged(): void {
    const entries = this.listWorkspaceEntries();
    this.entriesChanged.fire(entries);
    try {
      this.config.onOpenWorkspacesChanged?.(entries.map((e) => e.folderPath));
    } catch (err) {
      this.log(`保存标签失败：${String(err)}`);
    }
  }

  private toRuntimeInfo(entry: RuntimeEntry): WorkspaceRuntimeInfo | undefined {
    const binding = entry.runtime.binding();
    if (!binding) return undefined;
    return {
      workspaceId: entry.key,
      projectName: projectNameOf(entry.folderPath),
      folderPath: entry.folderPath,
      gatewayUrl: binding.baseUrl,
      workspaceClaim: binding.claim,
      gatewayBinding: binding,
      wsUrl: workspaceWsUrl(binding),
    };
  }

  private cancelled(folderPath: string): WorkspaceOpenResult {
    return { kind: "cancelled", folderPath };
  }

  // -------------------------------------------------------------------------
  // 打开 / 新建 / 暂存

  getDefaultProjectDir(seed?: string): string {
    return generateProjectDirName(seed, this.config.projectsRoot());
  }

  async createWorkspaceWithResult(input?: string | WorkspaceCreateRequest): Promise<WorkspaceOpenResult> {
    const req: WorkspaceCreateRequest = typeof input === "string" ? { name: input } : (input ?? {});
    const dir = req.folderPath ? req.folderPath : this.getDefaultProjectDir(req.name);
    return this.open(dir, { loadUserMemory: req.loadUserMemory });
  }

  async createWorkspace(input?: string | WorkspaceCreateRequest): Promise<string | undefined> {
    const r = await this.createWorkspaceWithResult(input);
    return this.unwrap(r)?.workspaceId;
  }

  openWorkspaceWithResult(folderPath: string): Promise<WorkspaceOpenResult> {
    return this.open(folderPath, {});
  }

  async openWorkspace(folderPath: string): Promise<WorkspaceRuntimeInfo | undefined> {
    return this.unwrap(await this.openWorkspaceWithResult(folderPath));
  }

  private unwrap(r: WorkspaceOpenResult | undefined): WorkspaceRuntimeInfo | undefined {
    if (!r) return undefined;
    if (r.kind === "opened" || r.kind === "reused") return r.runtime;
    this.config.notify?.(r);
    return undefined;
  }

  private async open(folderPath: string, opts: OpenOptions): Promise<WorkspaceOpenResult> {
    const key = this.keyOf(folderPath);
    if (this.shuttingDown) return this.cancelled(key);
    if (isForeignAppPath(key, this.config.home)) {
      this.log(`拒绝打开另一个应用的目录：${key}`);
      return this.cancelled(key);
    }
    if (this.closeAllInFlight) await this.closeAllInFlight.catch(() => undefined);
    await this.closing.get(key)?.catch(() => undefined);

    const live = this.live.get(key);
    if (live) {
      const runtime = this.toRuntimeInfo(live);
      if (runtime) return { kind: "reused", runtime };
    }
    const inflight = this.opening.get(key);
    if (inflight) return inflight;
    if (this.retrying.has(key) && !opts.fromRetry) return { kind: "retry_in_flight", folderPath: key, workspaceId: key };

    const epoch = this.epoch;
    const pending = this.spawn(key, opts, epoch).finally(() => {
      if (this.opening.get(key) === pending) this.opening.delete(key);
    });
    this.opening.set(key, pending);
    return pending;
  }

  private async spawn(key: string, opts: OpenOptions, epoch: number): Promise<WorkspaceOpenResult> {
    await mkdir(key, { recursive: true });
    this.config.applyCreatePreferences?.(key, opts.loadUserMemory);

    const blocked = await this.admit(key);
    if (blocked) return blocked;
    // 名额在进入 live 之前由 admitted 占着，进入 live 后立即归还，免得重复计数
    let holding = true;
    const release = () => {
      if (holding) this.admitted--;
      holding = false;
    };
    try {
      if (epoch !== this.epoch || this.shuttingDown) return this.cancelled(key);
      await this.discardFailed(key);
      const hadTab = this.cold.has(key);
      const wasSuspended = this.lifecycle.get(key) === "suspended";
      if (wasSuspended) this.setLifecycle(key, "resuming");
      this.setLifecycle(key, "starting");
      this.ensureOrder(key);
      if (!hadTab) this.cold.set(key, { folderPath: key });
      this.config.onWorkspaceOpened?.(key);

      const generation = (this.generations.get(key) ?? 0) + 1;
      this.generations.set(key, generation);
      const runtime = this.config.createRuntime(key, key, { generation, retryCount: this.retryCounts.get(key) ?? 0 });
      const current: RuntimeEntry = { key, folderPath: key, runtime, channels: [] };
      // 状态频道在 start 之前挂上：渲染层要能看到启动全过程，包括失败
      current.channels.push(this.config.registerChannel(`workspace-bundle-${key}`, runtime.view));
      current.statusSub = runtime.onStatusChange((s) => this.onBundleStatus(current, s));
      this.live.set(key, current);
      release();

      let status: BundleStatus;
      try {
        status = await runtime.start();
      } catch (err) {
        this.moveToFailed(current);
        this.emitEntriesChanged();
        throw err;
      }
      if (epoch !== this.epoch || this.shuttingDown) {
        await this.disposeEntry(current);
        if (this.live.get(key) === current) this.live.delete(key);
        return this.cancelled(key);
      }
      const info = this.toRuntimeInfo(current);
      if (status.state === "failed" || !info) {
        this.moveToFailed(current);
        this.emitEntriesChanged();
        throw new Error(status.error ?? "workspace runtime failed to start");
      }
      current.channels.push(this.config.registerChannel(`workspace-${key}`, { workspaceId: key, folderPath: key }));
      this.cold.delete(key);
      this.syncLifecycleFromStatus(current, status);
      this.emitEntriesChanged();
      this.log(`工作区已启动 ${key} → ${info.gatewayUrl}`);
      return { kind: hadTab ? "reused" : "opened", runtime: info };
    } finally {
      release();
    }
  }

  stageWorkspaceTab(folderPath: string): WorkspaceStageResult {
    const key = this.keyOf(folderPath);
    if (this.shuttingDown || isForeignAppPath(key, this.config.home)) return { kind: "cancelled", folderPath: key };
    if (this.retrying.has(key)) return { kind: "retry_in_flight", folderPath: key, workspaceId: key };
    if (!this.known(key)) {
      this.cold.set(key, { folderPath: key });
      this.lifecycle.set(key, "cold");
      this.ensureOrder(key);
      this.emitEntriesChanged();
    }
    const entry = this.entryFor(key);
    return entry ? { kind: "staged", entry } : { kind: "cancelled", folderPath: key };
  }

  /** 启动恢复：所有路径都成冷标签，只起 prewarm 那一个。 */
  restoreWorkspaceTabs(folderPaths: string[], prewarmId?: string): Promise<WorkspaceOpenResult | undefined> {
    let changed = false;
    for (const p of folderPaths) {
      if (typeof p !== "string" || !p) continue;
      const key = path.resolve(p);
      if (this.known(key) || isForeignAppPath(key, this.config.home)) continue;
      this.cold.set(key, { folderPath: key });
      this.lifecycle.set(key, "cold");
      this.ensureOrder(key);
      changed = true;
    }
    if (changed) this.emitEntriesChanged();
    if (!prewarmId) return Promise.resolve(undefined);
    return this.activateWorkspaceWithResult(prewarmId).catch((err) => {
      this.log(`恢复时启动 ${prewarmId} 失败：${String(err)}`);
      return undefined;
    });
  }

  // -------------------------------------------------------------------------
  // 预算与挂起

  /** 串行地为一次打开申请名额；拿到返回 undefined，拿不到返回 limit_reached。 */
  private admit(key: string): Promise<WorkspaceOpenResult | undefined> {
    const run = async (): Promise<WorkspaceOpenResult | undefined> => {
      while (this.live.size + this.admitted >= this.maxOpen) {
        const freed = this.config.autoSuspend === false ? false : await this.suspendOneForBudget(key);
        if (!freed) return this.limitReached(key);
      }
      this.admitted++;
      return undefined;
    };
    const next = this.admission.then(run, run);
    this.admission = next.catch(() => undefined);
    return next;
  }

  private limitReached(key: string): WorkspaceOpenResult {
    return {
      kind: "limit_reached",
      folderPath: key,
      limitScope: "live-runtime-budget",
      reason: "no-safe-suspend-candidate",
      maxOpenWorkspaces: this.maxOpen,
      openWorkspaceCount: this.live.size + this.admitted,
      busyProjectNames: [...this.live.values()].map((e) => projectNameOf(e.folderPath)),
    };
  }

  /** 后台工作区按转到后台的先后排队，最早的先试。 */
  private suspendCandidates(except?: string): string[] {
    return [...this.live.keys()]
      .filter((k) => k !== except && k !== this.activeKey && this.lifecycle.get(k) === "background")
      .sort((a, b) => (this.backgroundSince.get(a) ?? 0) - (this.backgroundSince.get(b) ?? 0));
  }

  private async suspendOneForBudget(except: string): Promise<boolean> {
    for (const k of this.suspendCandidates(except)) {
      if (await this.trySuspend(k)) return true;
    }
    return false;
  }

  private isDirty(key: string): boolean {
    const p = this.persistence.get(key);
    return !!p && p.state !== "clean";
  }

  /**
   * 空闲才挂：先看活动状态，再带 drain 探一次拿租约（拿到后 gateway 不再接新活）。
   * 中途任何变化（被激活、被关、换了一套进程）都放弃并归还租约。
   */
  private async trySuspend(key: string): Promise<boolean> {
    const entry = this.live.get(key);
    if (!entry || entry.runtime.status().state !== "bound") return false;
    const stillSame = () => this.live.get(key) === entry && this.activeKey !== key && !this.isDirty(key);
    if (!stillSame()) return false;
    const first = await entry.runtime.probeActivity(false);
    if (!first?.safe_to_suspend || !stillSame()) return false;
    const drained = await entry.runtime.probeActivity(true);
    if (!drained?.safe_to_suspend || !stillSame()) {
      if (drained?.safe_to_suspend) await entry.runtime.releaseSuspendLease();
      return false;
    }
    this.setLifecycle(key, "suspending");
    this.live.delete(key);
    this.cold.set(key, { folderPath: entry.folderPath });
    await this.disposeEntry(entry);
    this.setLifecycle(key, "suspended");
    this.emitEntriesChanged();
    this.log(`已挂起 ${key}`);
    return true;
  }

  /** 定时清理：后台闲置够久、没有未保存改动的挂起。返回挂起的个数。 */
  async suspendIdleWorkspaceRuntimes(now = this.now()): Promise<number> {
    const idleMs = this.config.idleSuspendMs ?? DEFAULT_IDLE_SUSPEND_MS;
    let n = 0;
    for (const k of this.suspendCandidates()) {
      const since = this.backgroundSince.get(k);
      if (since === undefined || now - since < idleMs) continue;
      if (await this.trySuspend(k)) n++;
    }
    return n;
  }

  startIdleSweep(): void {
    if (this.sweepTimer) return;
    const every = this.config.sweepIntervalMs ?? DEFAULT_SWEEP_INTERVAL_MS;
    this.sweepTimer = setInterval(() => void this.suspendIdleWorkspaceRuntimes().catch(() => undefined), every);
    this.sweepTimer.unref?.();
  }

  // -------------------------------------------------------------------------
  // 状态同步

  private onBundleStatus(entry: RuntimeEntry, status: BundleStatus): void {
    if (this.live.get(entry.key) !== entry) return;
    if (status.state === "failed") {
      this.moveToFailed(entry);
      this.emitEntriesChanged();
      return;
    }
    this.syncLifecycleFromStatus(entry, status);
  }

  private syncLifecycleFromStatus(entry: RuntimeEntry, status: BundleStatus): void {
    const mapped = bundleToLifecycle(status.state);
    if (mapped === "stopping" || mapped === "stopped") return;
    if (mapped === "bound") {
      const current = this.lifecycle.get(entry.key);
      if (current !== "bound" && current !== "background") this.setLifecycle(entry.key, "bound");
      // 不是当前标签的，起好就算后台（开始计闲置时间）
      if (this.activeKey !== entry.key && this.lifecycle.get(entry.key) !== "background") this.setLifecycle(entry.key, "background");
      if (this.activeKey === entry.key && this.lifecycle.get(entry.key) !== "bound") this.setLifecycle(entry.key, "bound");
      return;
    }
    this.setLifecycle(entry.key, mapped);
  }

  /** 启动失败：进程那套留在 failed 里（状态频道还在），标签留成冷壳。 */
  private moveToFailed(entry: RuntimeEntry): void {
    if (this.live.get(entry.key) === entry) this.live.delete(entry.key);
    this.cold.set(entry.key, { folderPath: entry.folderPath });
    this.ensureOrder(entry.key);
    this.setLifecycle(entry.key, "failed");
    const old = this.failed.get(entry.key);
    if (old && old !== entry) void this.disposeEntry(old);
    this.failed.set(entry.key, entry);
    while (this.failed.size > MAX_FAILED_KEPT) {
      const oldest = this.failed.keys().next().value;
      if (oldest === undefined) break;
      const e = this.failed.get(oldest);
      this.failed.delete(oldest);
      if (e) void this.disposeEntry(e);
    }
  }

  private async discardFailed(key: string): Promise<void> {
    const f = this.failed.get(key);
    if (!f) return;
    this.failed.delete(key);
    await this.disposeEntry(f);
  }

  private async disposeEntry(entry: RuntimeEntry): Promise<void> {
    entry.statusSub?.dispose();
    try {
      await entry.runtime.dispose();
    } catch (err) {
      this.log(`停止 ${entry.key} 出错：${String(err)}`);
    }
    for (const c of entry.channels.splice(0)) c.dispose();
  }

  // -------------------------------------------------------------------------
  // 激活 / 回首页

  private setActive(key: string | undefined): void {
    this.activeKey = key;
    for (const [k, e] of this.live) {
      if (e.runtime.status().state !== "bound") continue;
      const next = k === key ? "bound" : "background";
      if (this.lifecycle.get(k) !== next) this.setLifecycle(k, next);
    }
  }

  async activateWorkspaceWithResult(workspaceId: string): Promise<WorkspaceOpenResult | undefined> {
    const key = this.keyOf(workspaceId);
    const live = this.live.get(key);
    if (live) {
      const runtime = this.toRuntimeInfo(live);
      if (!runtime) return undefined;
      this.setActive(key);
      return { kind: "reused", runtime };
    }
    const inflight = this.opening.get(key);
    if (inflight) {
      const r = await inflight;
      if (r.kind === "opened" || r.kind === "reused") this.setActive(key);
      return r;
    }
    if (this.lifecycle.get(key) === "failed") return undefined;
    const cold = this.cold.get(key);
    if (!cold) return undefined;
    // 先占住激活位：进程起到 bound 时就不会被当成后台；没开成再还回去
    const previous = this.activeKey;
    this.activeKey = key;
    let r: WorkspaceOpenResult;
    try {
      r = await this.open(cold.folderPath, {});
    } catch (err) {
      if (this.activeKey === key) this.activeKey = previous;
      throw err;
    }
    if (r.kind === "opened" || r.kind === "reused") this.setActive(key);
    else if (this.activeKey === key) this.activeKey = previous;
    return r;
  }

  async activateWorkspace(workspaceId: string): Promise<WorkspaceRuntimeInfo | undefined> {
    return this.unwrap(await this.activateWorkspaceWithResult(workspaceId));
  }

  activateHome(): void {
    this.setActive(undefined);
    this.config.showHome?.();
  }

  // -------------------------------------------------------------------------
  // 关闭 / 重试

  async closeWorkspace(workspaceId: string, options: WorkspaceCloseOptions = {}): Promise<WorkspaceCloseResult> {
    const key = this.keyOf(workspaceId);
    const source = sanitizeSource(options.source);
    if (!this.known(key)) return { closed: true, reason: "not-found" };
    if (this.isDirty(key) && !options.force && !options.discardUnsavedChanges) return { closed: false, reason: "unsaved" };
    const inflight = this.opening.get(key);
    if (inflight) await inflight.catch(() => undefined);

    const live = this.live.get(key);
    if (live && !options.force) {
      const act = await live.runtime.probeActivity(false);
      if (act && !act.safe_to_close) return { closed: false, reason: "active", blockingReasons: act.blocking_reasons ?? [] };
      if (this.live.get(key) !== live) return { closed: false, reason: "runtime-changed" };
    }
    const work = this.teardown(key).finally(() => {
      if (this.closing.get(key) === work) this.closing.delete(key);
    });
    this.closing.set(key, work);
    await work;
    this.config.onWorkspaceClosed?.(key);
    this.emitEntriesChanged();
    this.log(`已关闭 ${key}${source ? `（${source}）` : ""}`);
    return { closed: true };
  }

  private async teardown(key: string): Promise<void> {
    const live = this.live.get(key);
    const failed = this.failed.get(key);
    this.live.delete(key);
    this.failed.delete(key);
    this.cold.delete(key);
    this.order = this.order.filter((k) => k !== key);
    this.lifecycle.delete(key);
    this.backgroundSince.delete(key);
    this.persistence.delete(key);
    this.focusedSessions.delete(key);
    if (this.activeKey === key) this.activeKey = undefined;
    await Promise.all([live && this.disposeEntry(live), failed && this.disposeEntry(failed)]);
  }

  closeAllWorkspaces(options: { discardUnsavedChanges?: boolean } = {}): Promise<{ closed: boolean; reason?: string }> {
    if (this.closeAllInFlight) return this.closeAllInFlight;
    const dirty = [...this.persistence.keys()].some((k) => this.isDirty(k));
    if (dirty && !options.discardUnsavedChanges) return Promise.resolve({ closed: false, reason: "unsaved" });
    this.epoch++;
    const run = (async () => {
      await Promise.allSettled([...this.opening.values()]);
      const keys = new Set([...this.live.keys(), ...this.failed.keys(), ...this.cold.keys()]);
      await Promise.all([...keys].map((k) => this.teardown(k)));
      this.order = [];
      this.emitEntriesChanged();
      return { closed: true };
    })();
    this.closeAllInFlight = run.finally(() => {
      this.closeAllInFlight = undefined;
    });
    return this.closeAllInFlight;
  }

  async retryWorkspaceWithResult(workspaceId: string): Promise<WorkspaceOpenResult> {
    const key = this.keyOf(workspaceId);
    if (this.retrying.has(key)) return { kind: "retry_in_flight", folderPath: key, workspaceId: key };
    const folderPath = this.live.get(key)?.folderPath ?? this.failed.get(key)?.folderPath ?? this.cold.get(key)?.folderPath ?? key;
    if (this.live.has(key) && this.isDirty(key)) return this.cancelled(key);
    this.retrying.add(key);
    try {
      await this.opening.get(key)?.catch(() => undefined);
      const live = this.live.get(key);
      if (live) {
        this.live.delete(key);
        await this.disposeEntry(live);
      }
      await this.discardFailed(key);
      this.cold.set(key, { folderPath });
      this.ensureOrder(key);
      this.lifecycle.set(key, "stopped");
      this.retryCounts.set(key, (this.retryCounts.get(key) ?? 0) + 1);
      return await this.open(folderPath, { fromRetry: true });
    } finally {
      this.retrying.delete(key);
    }
  }

  async retryWorkspace(workspaceId: string): Promise<WorkspaceRuntimeInfo | undefined> {
    return this.unwrap(await this.retryWorkspaceWithResult(workspaceId));
  }

  // -------------------------------------------------------------------------
  // 查询

  private entryFor(key: string): WorkspaceEntry | undefined {
    const live = this.live.get(key);
    if (live) {
      const info = this.toRuntimeInfo(live);
      if (info) {
        return {
          workspaceId: key,
          projectName: info.projectName,
          folderPath: info.folderPath,
          gatewayUrl: info.gatewayUrl,
          workspaceClaim: info.workspaceClaim,
          gatewayBinding: info.gatewayBinding,
        };
      }
      return { workspaceId: key, projectName: projectNameOf(live.folderPath), folderPath: live.folderPath };
    }
    const cold = this.cold.get(key);
    if (cold) return { workspaceId: key, projectName: projectNameOf(cold.folderPath), folderPath: cold.folderPath };
    return undefined;
  }

  listWorkspaceEntries(): WorkspaceEntry[] {
    const keys = [...this.order];
    for (const k of [...this.live.keys(), ...this.cold.keys()]) if (!keys.includes(k)) keys.push(k);
    return keys.map((k) => this.entryFor(k)).filter((e): e is WorkspaceEntry => !!e);
  }

  listWorkspaceLifecycleStates(): Record<string, WorkspaceLifecycleState> {
    const out: Record<string, WorkspaceLifecycleState> = {};
    for (const e of this.listWorkspaceEntries()) out[e.workspaceId] = this.lifecycle.get(e.workspaceId) ?? "cold";
    return out;
  }

  getWorkspaceRuntime(workspaceId: string): WorkspaceRuntimeInfo | undefined {
    const live = this.live.get(this.keyOf(workspaceId));
    return live ? this.toRuntimeInfo(live) : undefined;
  }

  /** 等到 bound（或超时 / 失败）。 */
  async waitForWorkspaceBound(workspaceId: string, timeoutMs = 30_000): Promise<WorkspaceRuntimeInfo | undefined> {
    const key = this.keyOf(workspaceId);
    const deadline = this.now() + timeoutMs;
    for (;;) {
      const live = this.live.get(key);
      if (live?.runtime.status().state === "bound") return this.toRuntimeInfo(live);
      if (!live && !this.opening.has(key)) return undefined;
      if (this.now() > deadline) return undefined;
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  get liveCount(): number {
    return this.live.size;
  }

  // -------------------------------------------------------------------------
  // 渲染层上报

  updateFocusedSession(workspaceId: string, sessionId: string | null): void {
    this.focusedSessions.set(this.keyOf(workspaceId), typeof sessionId === "string" ? sessionId : null);
  }

  getFocusedSession(workspaceId: string): string | null {
    return this.focusedSessions.get(this.keyOf(workspaceId)) ?? null;
  }

  /**
   * 画布持久化状态，按进程实例区分：旧实例的迟到上报不影响新实例。
   * `clean` 只清掉"保存中"：保存途中又有新改动（dirty）时不能被一次迟到的 clean 抹掉。
   */
  reportWorkspacePersistence(report: WorkspacePersistenceReport): void {
    if (!report || typeof report.workspaceId !== "string") return;
    const key = this.keyOf(report.workspaceId);
    const instanceId = typeof report.instanceId === "string" ? report.instanceId : "legacy";
    const liveInstance = this.live.get(key)?.runtime.binding()?.instanceId;
    if (liveInstance && instanceId !== "legacy" && instanceId !== liveInstance) return;
    const prev = this.persistence.get(key);
    if (report.state === "clean") {
      if (!prev || prev.instanceId !== instanceId || prev.state === "saving" || prev.state === "clean") this.persistence.delete(key);
      return;
    }
    if (report.state === "dirty" || report.state === "saving" || report.state === "failed") {
      this.persistence.set(key, { instanceId, state: report.state });
    }
  }

  getUnsavedWorkspaceCount(): number {
    return [...this.persistence.keys()].filter((k) => this.isDirty(k)).length;
  }

  updateRendererDiagnosticsSnapshot(snapshot: Record<string, unknown>): void {
    if (snapshot && typeof snapshot === "object") this.rendererDiagnostics = { ...this.rendererDiagnostics, ...snapshot };
  }

  getRendererDiagnosticsSnapshot(): Record<string, unknown> {
    return { ...this.rendererDiagnostics };
  }

  /** 串行执行：两个开关同时点时，后一个基于前一个的结果广播。 */
  toggleSkill(name: string, enabled: boolean): Promise<unknown> {
    const run = async () => {
      if (!this.config.toggleSkill) throw new Error("skills are not available");
      return this.config.toggleSkill(name, enabled);
    };
    const next = this.skillQueue.then(run, run);
    this.skillQueue = next.catch(() => undefined);
    return next;
  }

  async retryAppGateway(): Promise<void> {
    await this.config.retryAppGateway?.();
  }

  /** 技能开关变了：所有在跑的 opencode 按新配置重启。 */
  async restartAllOpencode(): Promise<void> {
    await Promise.allSettled([...this.live.values()].map((e) => e.runtime.restartOpencode()));
  }

  // -------------------------------------------------------------------------
  // 退出

  async shutdown(): Promise<void> {
    this.shuttingDown = true;
    if (this.sweepTimer) clearInterval(this.sweepTimer);
    const all = [...this.live.values(), ...this.failed.values()];
    this.live.clear();
    this.failed.clear();
    await Promise.all(all.map((e) => this.disposeEntry(e)));
  }

  shutdownSync(): void {
    this.shuttingDown = true;
    if (this.sweepTimer) clearInterval(this.sweepTimer);
    for (const e of [...this.live.values(), ...this.failed.values()]) {
      try {
        e.runtime.disposeSync();
      } catch {
        // 退出路径上尽力而为
      }
    }
  }
}
