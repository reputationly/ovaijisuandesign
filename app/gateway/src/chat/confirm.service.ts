import { randomUUID } from "node:crypto";

import { Injectable } from "@nestjs/common";

import { GatewayEventBus } from "../common/gateway-event-bus.js";

export type AgentMode = "auto" | "plan" | "ask";

interface Pending<T> {
  resolve: (v: T) => void;
  timer: NodeJS.Timeout;
  sessionId: string;
}

export type ToolConfirmDecision =
  | { decision: "confirm"; modified_args?: Record<string, unknown> }
  | { decision: "reject"; reject_reason: "user_rejected" | "confirmation_expired" | "confirmation_unavailable" };

export type LoopGuardDecision = "allow_once" | "allow_session" | "reject";

/**
 * 需要用户拍板的两类询问：工具执行前确认（只在"询问"模式下弹）、防打转触发时问
 * 要不要继续。插件 / MCP 发 HTTP 过来挂起等待，界面经 `/ws` 收到询问、回复后放行。
 *
 * 超时一律按拒绝处理：没人回答的确认不能当成同意 —— 那样"询问"模式就形同虚设。
 */
@Injectable()
export class ConfirmService {
  private readonly modes = new Map<string, AgentMode>();
  private readonly toolAsks = new Map<string, Pending<ToolConfirmDecision>>();
  private readonly loopAsks = new Map<string, Pending<LoopGuardDecision>>();
  private readonly settled = new Map<string, LoopGuardDecision>();
  private readonly sessionAllow = new Map<string, Set<string>>();

  constructor(private readonly bus: GatewayEventBus) {}

  setMode(runtimeSessionId: string, mode: AgentMode): void {
    this.modes.set(runtimeSessionId, mode);
  }

  modeOf(runtimeSessionId: string): AgentMode {
    return this.modes.get(runtimeSessionId) ?? "auto";
  }

  askTool(runtimeSessionId: string, uiSessionId: string, tool: string, args: unknown, timeoutMs = 300_000): Promise<ToolConfirmDecision> {
    if (this.modeOf(runtimeSessionId) !== "ask") return Promise.resolve({ decision: "confirm" });
    const id = randomUUID();
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.toolAsks.delete(id);
        this.bus.emit("chat", { type: "tool_confirm_expired", id, session_id: uiSessionId });
        resolve({ decision: "reject", reject_reason: "confirmation_expired" });
      }, timeoutMs);
      this.toolAsks.set(id, { resolve, timer, sessionId: uiSessionId });
      this.bus.emit("chat", { type: "tool_confirm_ask", id, session_id: uiSessionId, tool, args });
    });
  }

  replyTool(id: string, decision: "confirm" | "reject", modifiedArgs?: Record<string, unknown>): boolean {
    const p = this.toolAsks.get(id);
    if (!p) return false;
    clearTimeout(p.timer);
    this.toolAsks.delete(id);
    p.resolve(decision === "confirm" ? { decision: "confirm", ...(modifiedArgs ? { modified_args: modifiedArgs } : {}) } : { decision: "reject", reject_reason: "user_rejected" });
    return true;
  }

  askLoopGuard(
    runtimeSessionId: string,
    uiSessionId: string,
    ask: { tool: string; fingerprint: string; request_id: string; hits?: number; window?: number },
    timeoutMs = 30_000,
  ): Promise<LoopGuardDecision> {
    if (this.sessionAllow.get(runtimeSessionId)?.has(ask.fingerprint)) return Promise.resolve("allow_once");
    return new Promise((resolve) => {
      const done = (d: LoopGuardDecision) => {
        this.settled.set(ask.request_id, d);
        if (d === "allow_session") {
          const s = this.sessionAllow.get(runtimeSessionId) ?? new Set<string>();
          s.add(ask.fingerprint);
          this.sessionAllow.set(runtimeSessionId, s);
        }
        resolve(d);
      };
      const timer = setTimeout(() => {
        this.loopAsks.delete(ask.request_id);
        done("reject");
      }, timeoutMs);
      this.loopAsks.set(ask.request_id, { resolve: done, timer, sessionId: uiSessionId });
      this.bus.emit("chat", { type: "loop_guard_ask", id: ask.request_id, session_id: uiSessionId, ...ask });
    });
  }

  replyLoopGuard(id: string, decision: LoopGuardDecision): boolean {
    const p = this.loopAsks.get(id);
    if (!p) return false;
    clearTimeout(p.timer);
    this.loopAsks.delete(id);
    p.resolve(decision);
    return true;
  }

  settlement(requestId: string): { status: "settled"; decision: LoopGuardDecision } | { status: "pending" } {
    const d = this.settled.get(requestId);
    return d ? { status: "settled", decision: d } : { status: "pending" };
  }
}
