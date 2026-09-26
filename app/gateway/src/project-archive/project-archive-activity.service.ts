import path from "node:path";

import { Injectable, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";

import { WorkspacePathService } from "../common/workspace-path.service.js";
import { ActivityService } from "../health/activity.service.js";

/** 主进程导出期间每 10 秒续一次租约。 */
export const HEARTBEAT_INTERVAL_MS = 10_000;
/** 超过这么久没续约才可能回收。 */
export const STALE_AFTER_MS = 45_000;

export class ActivityWorkspaceMismatchError extends Error {
  constructor(
    readonly requested: string,
    readonly bound: string,
  ) {
    super(`Project export workspace mismatch: requested ${requested}, gateway bound to ${bound}`);
    this.name = "ActivityWorkspaceMismatchError";
  }
}

interface Lease {
  release: () => void;
  ownerPid: number;
  lastHeartbeatAt: number;
}

/**
 * 导出期间的"有活"租约。导出由主进程打包，gateway 这边只是被读；不挂一个租约的话，
 * 空闲回收会在打包到一半时把 gateway 挂起，后面的会话导出请求就落空了。
 */
@Injectable()
export class ProjectArchiveActivityService implements OnModuleInit, OnModuleDestroy {
  private readonly leases = new Map<string, Lease>();
  private sweepTimer?: NodeJS.Timeout;

  constructor(
    private readonly activity: ActivityService,
    private readonly paths: WorkspacePathService,
  ) {}

  onModuleInit(): void {
    this.sweepTimer = setInterval(() => this.sweepStaleLeases(), HEARTBEAT_INTERVAL_MS);
    this.sweepTimer.unref?.();
  }

  onModuleDestroy(): void {
    if (this.sweepTimer) clearInterval(this.sweepTimer);
    this.sweepTimer = undefined;
    for (const lease of this.leases.values()) lease.release();
    this.leases.clear();
  }

  /** 同一个租约重复 begin 只算续约，返回 false。 */
  begin(workspaceDir: string, leaseId: string, ownerPid: number): boolean {
    const bound = path.resolve(this.paths.root);
    const requested = path.resolve(workspaceDir);
    if (path.relative(bound, requested) !== "") throw new ActivityWorkspaceMismatchError(requested, bound);
    const existing = this.leases.get(leaseId);
    if (existing) {
      if (existing.ownerPid === ownerPid) existing.lastHeartbeatAt = Date.now();
      return false;
    }
    this.leases.set(leaseId, { release: this.activity.begin("other"), ownerPid, lastHeartbeatAt: Date.now() });
    return true;
  }

  heartbeat(leaseId: string): boolean {
    const lease = this.leases.get(leaseId);
    if (!lease) return false;
    lease.lastHeartbeatAt = Date.now();
    return true;
  }

  end(leaseId: string): boolean {
    const lease = this.leases.get(leaseId);
    if (!lease) return false;
    this.leases.delete(leaseId);
    lease.release();
    return true;
  }

  /**
   * 回收孤儿租约要两个条件都成立：心跳过期**并且**持有它的主进程已经不在了。
   * 只看超时不行 —— 系统睡眠时两边一起停，醒来那一刻活着的导出看起来也是过期的。
   */
  sweepStaleLeases(now = Date.now()): number {
    let released = 0;
    for (const [id, lease] of this.leases) {
      if (now - lease.lastHeartbeatAt < STALE_AFTER_MS) continue;
      if (isProcessAlive(lease.ownerPid)) continue;
      this.leases.delete(id);
      lease.release();
      released++;
    }
    return released;
  }
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return (err as NodeJS.ErrnoException).code === "EPERM";
  }
}
