import type { LoopGuardDecision } from '@hilo/protocol';
import { CallHistory, type CallHistoryOptions, type CallRecord } from './call-history.js';
import { type SessionAllowListOptions } from './session-allow-list.js';
/**
 * LoopGuard 触发后 plugin 抛出的错误。
 *
 * Plugin 在 `tool.execute.before` hook 里 throw 这个错误，由上游 opencode
 * 的 Effect.gen 链路 catch 后，把 message 作为 tool error 文本喂给 LLM。
 * LLM 看到的就是 message 里的多行自然语言。
 */
export declare class LoopGuardError extends Error {
    readonly code = "LOOP_GUARD_BLOCK";
    readonly tool: string;
    readonly sessionID: string;
    readonly hits: number;
    readonly window: number;
    constructor(message: string, details: {
        tool: string;
        sessionID: string;
        hits: number;
        window: number;
    });
}
export type { LoopGuardDecision };
export interface OnAskInput {
    sessionID: string;
    tool: string;
    fingerprint: string;
    hits: number;
    window: number;
    recent: CallRecord[];
}
/**
 * Ask the user / runtime to decide what to do when the guard trips.
 *
 * Implementations must return one of:
 *  - `'allow_once'`     — let this single call through (no historical mark)
 *  - `'allow_session'`  — the guard records (sessionID, fingerprint) in its
 *    bounded process-local allow list and will not ask again for the same
 *    fingerprint in later turns of this chat
 *  - `'reject'`         — throw `LoopGuardError`
 *
 * onAsk MUST NOT throw. Any error inside is the implementer's contract
 * to swallow and map to `'reject'` (fail-closed). The default in-process
 * onAsk (when caller provides none) is `() => 'reject'` — i.e. the same
 * hard-block behavior as the original implementation.
 */
export type OnAsk = (input: OnAskInput) => Promise<LoopGuardDecision>;
export interface LoopGuardOptions {
    /** 滑动窗口大小 */
    window?: number;
    /** 同 fingerprint 在窗口内出现 N 次触发 */
    threshold?: number;
    history?: CallHistoryOptions;
    allowList?: SessionAllowListOptions;
    /** Trip handler. Returns the user's decision. Defaults to `'reject'`. */
    onAsk?: OnAsk;
}
export interface LoopGuard {
    /**
     * Inspect a tool call. Returns nothing on allow paths
     * (caller proceeds to execute the tool). Throws `LoopGuardError` on reject.
     *
     * Async because `onAsk` may block on network I/O (gateway HTTP roundtrip).
     */
    check(input: {
        sessionID: string;
        tool: string;
        args: unknown;
    }): Promise<void>;
    record(input: {
        sessionID: string;
        tool: string;
        args: unknown;
    }): void;
    resetSession(sessionID: string): void;
    /** Compute the fingerprint without hitting history (used by callers that maintain their own allow list). */
    fingerprintOf(tool: string, args: unknown): string;
    /** Test-only. */
    _history: CallHistory;
    /** Test-only. */
    _allowedSessionCount(): number;
}
export declare function createLoopGuard(opts?: LoopGuardOptions): LoopGuard;
//# sourceMappingURL=index.d.ts.map