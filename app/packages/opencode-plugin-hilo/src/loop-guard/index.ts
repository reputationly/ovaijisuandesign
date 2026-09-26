import type { LoopGuardDecision } from "./ask-client.js";
import { CallHistory, type CallHistoryOptions, type CallRecord } from "./call-history.js";
import { fingerprint } from "./fingerprint.js";
import { SessionAllowList, type SessionAllowListOptions } from "./session-allow-list.js";

/**
 * 防打转：同一个工具、语义相同的参数，在最近 5 次调用里已经出现 2 次，第 3 次就问用户
 * （或按策略直接拦）。
 *
 * - 记录放在 tool.execute.after：被拦下的调用不进历史，否则模型换了模型想脱困也会被一直拦。
 * - 同一个会话同一个指纹并发触发时只问一次；"允许一次"只归第一个等待者，其余的照拦。
 * - 同一个会话的多次询问排队，免得同时弹出几个窗口。
 */
export class LoopGuardError extends Error {
  readonly code = "LOOP_GUARD_BLOCK";
  readonly tool: string;
  readonly sessionID: string;
  readonly hits: number;
  readonly window: number;

  constructor(message: string, details: { tool: string; sessionID: string; hits: number; window: number }) {
    super(message);
    this.name = "LoopGuardError";
    this.tool = details.tool;
    this.sessionID = details.sessionID;
    this.hits = details.hits;
    this.window = details.window;
  }
}

export interface AskContext {
  sessionID: string;
  tool: string;
  fingerprint: string;
  hits: number;
  window: number;
  recent: CallRecord[];
}

export interface LoopGuardOptions {
  window?: number;
  threshold?: number;
  history?: CallHistoryOptions;
  allowList?: SessionAllowListOptions;
  onAsk?: (input: AskContext) => Promise<LoopGuardDecision>;
}

export interface CallInput {
  sessionID: string;
  tool: string;
  args: unknown;
}

export interface LoopGuard {
  fingerprintOf(tool: string, args: unknown): string;
  check(input: CallInput): Promise<void>;
  record(input: CallInput): void;
  resetSession(sessionID: string): void;
  _history: CallHistory;
  _allowedSessionCount(): number;
}

const defaultOnAsk = async (): Promise<LoopGuardDecision> => "reject";

export function createLoopGuard(opts: LoopGuardOptions = {}): LoopGuard {
  const window = opts.window ?? 5;
  const threshold = opts.threshold ?? 3;
  const history = new CallHistory(opts.history);
  const allowed = new SessionAllowList(opts.allowList);
  const onAsk = opts.onAsk ?? defaultOnAsk;
  const inFlightAsks = new Map<string, Promise<LoopGuardDecision>>();
  const sessionAskTails = new Map<string, Promise<void>>();

  const enqueueSessionAsk = (input: AskContext): Promise<LoopGuardDecision> => {
    const previous = sessionAskTails.get(input.sessionID);
    const decisionPromise = previous ? previous.then(() => askForDecision(onAsk, input)) : askForDecision(onAsk, input);
    const tail = decisionPromise.then(() => undefined);
    sessionAskTails.set(input.sessionID, tail);
    void tail.then(() => {
      if (sessionAskTails.get(input.sessionID) === tail) sessionAskTails.delete(input.sessionID);
    });
    return decisionPromise;
  };

  return {
    fingerprintOf(tool, args) {
      return fingerprint(tool, args);
    },

    async check({ sessionID, tool, args }) {
      const fp = fingerprint(tool, args);
      if (allowed.has(sessionID, fp)) return;
      const recent = history.recent(sessionID, window);
      let hits = 0;
      for (const r of recent) if (r.fp === fp) hits++;
      if (hits + 1 < threshold) return;

      const askKey = JSON.stringify([sessionID, fp]);
      let decisionPromise = inFlightAsks.get(askKey);
      const ownsAllowOnce = decisionPromise === undefined;
      if (!decisionPromise) {
        decisionPromise = enqueueSessionAsk({ sessionID, tool, fingerprint: fp, hits: hits + 1, window, recent });
        inFlightAsks.set(askKey, decisionPromise);
      }
      let decision: LoopGuardDecision;
      try {
        decision = await decisionPromise;
      } finally {
        if (inFlightAsks.get(askKey) === decisionPromise) inFlightAsks.delete(askKey);
      }
      if (decision === "allow_session") allowed.add(sessionID, fp);
      if (decision === "reject" || (decision === "allow_once" && !ownsAllowOnce)) {
        const message =
          decision === "allow_once"
            ? buildConcurrentDuplicateBlockMessage({ tool, recent })
            : buildBlockMessage({ tool, hits: hits + 1, window, recent });
        throw new LoopGuardError(message, { tool, sessionID, hits: hits + 1, window });
      }
    },

    record({ sessionID, tool, args }) {
      history.push(sessionID, { fp: fingerprint(tool, args), tool, ts: Date.now() });
    },

    resetSession(sessionID) {
      history.drop(sessionID);
    },

    _history: history,
    _allowedSessionCount: () => allowed.size(),
  };
}

/** 问的过程抛错一律按拒绝：宁可多拦一次，也不让打转继续花钱。 */
async function askForDecision(onAsk: (input: AskContext) => Promise<LoopGuardDecision>, input: AskContext): Promise<LoopGuardDecision> {
  try {
    return await onAsk(input);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[loop-guard] onAsk threw (${msg}); defaulting to reject`);
    return "reject";
  }
}

function distinctTools(recent: CallRecord[]): string {
  return [...new Set(recent.map((r) => r.tool))].join(", ");
}

export function buildConcurrentDuplicateBlockMessage(ctx: { tool: string; recent: CallRecord[] }): string {
  return [
    `LoopGuard blocked a concurrent duplicate of tool "${ctx.tool}" after the user allowed one matching call.`,
    "",
    "The one-time allowance has already been assigned to the first waiting call. This duplicate was not authorized.",
    "",
    `Recent tools in window: ${distinctTools(ctx.recent) || "(none)"}.`,
    "",
    "Do not retry the same call. Wait for the allowed call to finish, use a different approach, or ask the user before continuing.",
  ].join("\n");
}

/** 拦下时回给模型的话：给出三条具体出路，否则它只会再微调一个参数重试。 */
export function buildBlockMessage(ctx: { tool: string; hits: number; window: number; recent: CallRecord[] }): string {
  return [
    `LoopGuard blocked: tool "${ctx.tool}" was called with semantically-identical arguments ${ctx.hits} times within the last ${ctx.window} tool calls.`,
    "",
    "The user (or default policy) chose to abort. Repeating this call will produce the same outcome.",
    "",
    `Recent tools in window: ${distinctTools(ctx.recent) || "(none)"}.`,
    "",
    "Choose ONE of:",
    "  1. Different tool / different model (e.g. seedance → kling, or t2v → multimodal).",
    "  2. Substantially different prompt (not a one-word tweak — change subject, action, or scene).",
    '  3. Stop and ask the user via the "question" tool — explain what you tried and what failed.',
    "",
    "Do NOT retry with another small parameter tweak; LoopGuard fingerprints ignore minor changes (±2s duration, prompt rewording, read offset).",
  ].join("\n");
}
