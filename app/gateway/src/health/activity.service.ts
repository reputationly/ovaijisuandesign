import { readFile } from "node:fs/promises";
import path from "node:path";

import { Injectable } from "@nestjs/common";

/**
 * 这个 gateway 手上还有没有活，给主进程判断能不能挂起 / 关掉它。
 *
 * 信号两路：
 * - 正在处理的写请求（POST/PUT/PATCH/DELETE，健康检查除外）；生成类单独计数；
 * - 账上还没落地的生成（`.hilo/active-generations.json`）——提交后到结果下载完之间
 *   都在账上，这时候杀进程，平台上已经扣费的任务就接不回来了。
 *
 * 挂起租约：主进程带 `?drain=1` 探测时先竖起闸门，再算快照；闸门竖着时新的写请求
 * 一律 503，保证"探测说空闲"之后不会再有新活开始。快照不空闲就当场放下闸门。
 */
@Injectable()
export class ActivityService {
  private inFlight = 0;
  private inFlightGenerate = 0;
  private leases = 0;
  private lastActivityAt: number | null = null;

  get draining(): boolean {
    return this.leases > 0;
  }

  /** 请求开始时调，返回结束时要调的函数。 */
  begin(kind: "generate" | "other"): () => void {
    this.inFlight++;
    if (kind === "generate") this.inFlightGenerate++;
    this.lastActivityAt = Date.now();
    let done = false;
    return () => {
      if (done) return;
      done = true;
      this.inFlight--;
      if (kind === "generate") this.inFlightGenerate--;
      this.lastActivityAt = Date.now();
    };
  }

  acquireLease(): void {
    this.leases++;
  }

  releaseLease(): void {
    this.leases = Math.max(0, this.leases - 1);
  }

  private async durableGenerations(): Promise<{ count: number; unknown: boolean }> {
    const dir = process.env.WORKSPACE_DIR;
    if (!dir || process.env.HILO_GATEWAY_ROLE === "app-level") return { count: 0, unknown: false };
    try {
      const raw = JSON.parse(await readFile(path.join(dir, ".hilo", "active-generations.json"), "utf8")) as { records?: unknown };
      return { count: Array.isArray(raw.records) ? raw.records.length : 0, unknown: false };
    } catch (err) {
      // 没有账本 = 没有进行中的生成；读坏了就不敢说空闲
      return { count: 0, unknown: (err as NodeJS.ErrnoException).code !== "ENOENT" };
    }
  }

  async snapshot() {
    const durable = await this.durableGenerations();
    const userOps = this.inFlight - this.inFlightGenerate;
    const reasons = [
      ...(this.inFlightGenerate > 0 ? [`active_generate_requests:${this.inFlightGenerate}`] : []),
      ...(userOps > 0 ? [`active_user_operations:${userOps}`] : []),
      ...(durable.count > 0 ? [`active_generation_records:${durable.count}`] : []),
      ...(durable.unknown ? ["background_activity_unknown"] : []),
    ];
    const pending = this.inFlight + durable.count;
    const safe = reasons.length === 0;
    return {
      idle: pending === 0,
      agent_running: false,
      pending_tasks: pending,
      active_cloud_tasks: 0,
      active_generate_requests: this.inFlightGenerate,
      active_benchmark_runs: 0,
      active_user_operations: userOps,
      active_edit_requests: 0,
      active_ffmpeg_jobs: 0,
      active_uploads: 0,
      active_durable_generations: durable.count,
      ...(durable.unknown ? { background_activity_unknown: true } : {}),
      session_pending_reasons: 0,
      pending_user_interactions: 0,
      queued_user_inputs: 0,
      active_file_writes: 0,
      active_session_bridges: 0,
      safe_to_suspend: safe,
      safe_to_restart: safe,
      safe_to_close: safe,
      blocking_reasons: reasons,
      last_activity_at: this.lastActivityAt,
    };
  }
}
