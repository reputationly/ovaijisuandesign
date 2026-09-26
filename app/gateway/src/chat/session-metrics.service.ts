import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";

import { GatewayEventBus } from "../common/gateway-event-bus.js";

const MAX_SESSIONS = 500;
/** 每个会话记住多少个已计数的 part：同一个 part 会被更新很多次，只在第一次进入某状态时计数。 */
const MAX_SEEN_PARTS = 2000;
const TRIP_WARN_THRESHOLD = 5;

type SettlementCause = "reply" | "timeout" | "session_cancelled" | "runtime_restarted" | "session_deleted" | "transport_closed" | "unavailable";
type LoopGuardDecision = "allow_once" | "allow_session" | "reject";

export interface SessionMetrics {
  uiSessionId: string;
  startedAt: number;
  lastEventAt: number;
  stepCount: number;
  toolCalls: Record<string, { count: number; errorCount: number; lastTs: number }>;
  loopGuardTrips: number;
  loopGuardSettlements: {
    byCause: Record<SettlementCause, number>;
    byDecision: Record<LoopGuardDecision, number>;
    replyReplays: number;
    lateReplies: number;
    latencyMs: { count: number; total: number; max: number; buckets: { lt_1s: number; "1s_to_10s": number; "10s_to_30s": number; gte_30s: number } };
  };
  subAgentDispatches: Record<string, number>;
  errorEvents: number;
}

/**
 * 每个会话的运行统计（步数、各工具调用次数和失败数、LoopGuard 触发、子 agent 派发、错误数），给诊断面板看。
 *
 * 数据来自发给界面的聊天帧（总线上的 `chat` 事件），不另开旁路：界面看到什么，这里就数什么。
 * 最多记 500 个会话，按最近活跃淘汰；只在内存里，重启清零。
 */
@Injectable()
export class SessionMetricsService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger("SessionMetrics");
  private readonly metrics = new Map<string, SessionMetrics>();
  private readonly seen = new Map<string, Set<string>>();
  private off?: () => void;

  constructor(private readonly bus: GatewayEventBus) {}

  onModuleInit(): void {
    this.off = this.bus.subscribe((m) => {
      if (m.event === "chat") this.ingest(m.payload as Record<string, any>);
    });
  }

  onModuleDestroy(): void {
    this.off?.();
  }

  /** 按 opencode 的 part 生命周期计数：文本 part 结束算一步，工具 part 第一次出现算一次调用，进入 error 算一次失败。 */
  ingest(frame: Record<string, any>): void {
    const uiSessionId = typeof frame?.session_id === "string" ? frame.session_id : "";
    if (!uiSessionId) return;
    if (frame.type === "session_error") {
      const m = this.getOrCreate(uiSessionId);
      m.errorEvents += 1;
      return;
    }
    if (frame.type !== "part_updated") return;
    const part = frame.part as Record<string, any> | undefined;
    if (!part || typeof part.id !== "string") return;
    if (part.type === "text" && part.time?.end) {
      if (!this.firstTime(uiSessionId, `text:${part.id}`)) return;
      this.getOrCreate(uiSessionId).stepCount += 1;
      return;
    }
    if (part.type !== "tool") return;
    const name = typeof part.tool === "string" && part.tool ? part.tool : "unknown";
    const status = part.state?.status;
    if (this.firstTime(uiSessionId, `tool:${part.id}`)) {
      const m = this.getOrCreate(uiSessionId);
      const stat = this.toolStat(m, name);
      stat.count += 1;
      stat.lastTs = m.lastEventAt;
      if (name === "task") {
        const sub = part.state?.input?.subagent_type;
        if (typeof sub === "string" && sub) m.subAgentDispatches[sub] = (m.subAgentDispatches[sub] ?? 0) + 1;
      }
    }
    if (status === "error" && this.firstTime(uiSessionId, `error:${part.id}`)) {
      const m = this.getOrCreate(uiSessionId);
      this.toolStat(m, name).errorCount += 1;
      m.errorEvents += 1;
    }
  }

  recordLoopGuardTrip(uiSessionId: string, tool: string): void {
    if (!uiSessionId) return;
    const m = this.getOrCreate(uiSessionId);
    m.loopGuardTrips += 1;
    if (m.loopGuardTrips >= TRIP_WARN_THRESHOLD) this.log.warn(`session ${uiSessionId} has tripped LoopGuard ${m.loopGuardTrips} times (latest tool=${tool})`);
    else this.log.log(`session ${uiSessionId} LoopGuard trip #${m.loopGuardTrips} tool=${tool}`);
  }

  get(uiSessionId: string): SessionMetrics | undefined {
    return this.metrics.get(uiSessionId);
  }

  list(): SessionMetrics[] {
    return [...this.metrics.values()];
  }

  private firstTime(uiSessionId: string, key: string): boolean {
    let set = this.seen.get(uiSessionId);
    if (!set) this.seen.set(uiSessionId, (set = new Set()));
    if (set.has(key)) return false;
    set.add(key);
    if (set.size > MAX_SEEN_PARTS) set.delete(set.values().next().value!);
    return true;
  }

  private toolStat(m: SessionMetrics, name: string) {
    return (m.toolCalls[name] ??= { count: 0, errorCount: 0, lastTs: 0 });
  }

  /** 取出并挪到 Map 末尾（最近活跃），满了就淘汰最久没动的。 */
  private getOrCreate(uiSessionId: string): SessionMetrics {
    const now = Date.now();
    let m = this.metrics.get(uiSessionId);
    if (m) this.metrics.delete(uiSessionId);
    else {
      while (this.metrics.size >= MAX_SESSIONS) {
        const oldest = this.metrics.keys().next().value;
        if (oldest === undefined) break;
        this.metrics.delete(oldest);
        this.seen.delete(oldest);
      }
      m = {
        uiSessionId,
        startedAt: now,
        lastEventAt: now,
        stepCount: 0,
        toolCalls: {},
        loopGuardTrips: 0,
        loopGuardSettlements: {
          byCause: { reply: 0, timeout: 0, session_cancelled: 0, runtime_restarted: 0, session_deleted: 0, transport_closed: 0, unavailable: 0 },
          byDecision: { allow_once: 0, allow_session: 0, reject: 0 },
          replyReplays: 0,
          lateReplies: 0,
          latencyMs: { count: 0, total: 0, max: 0, buckets: { lt_1s: 0, "1s_to_10s": 0, "10s_to_30s": 0, gte_30s: 0 } },
        },
        subAgentDispatches: {},
        errorEvents: 0,
      };
    }
    m.lastEventAt = now;
    this.metrics.set(uiSessionId, m);
    return m;
  }
}
