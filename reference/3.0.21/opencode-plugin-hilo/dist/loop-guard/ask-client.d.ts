import { type LoopGuardDecision } from '@hilo/protocol';
/**
 * Default plugin-side timeout when waiting for the user to reply to a
 * LoopGuard ask. Can be overridden via `LOOP_GUARD_ASK_TIMEOUT_MS`
 * environment variable. The gateway has its own hard cap (60s); when both
 * are set, the gateway owns the user-decision deadline. The HTTP transport
 * keeps a short grace period so the gateway's terminal response can arrive.
 */
export interface AskInput {
    /** OpenCode runtime sessionID — gateway resolves to uiSessionId */
    sessionID: string;
    tool: string;
    hits: number;
    window: number;
    recentTools: readonly string[];
    fingerprint: string;
}
/**
 * Block until the user picks a decision in the desktop modal, or the
 * timeout fires. **Never throws** — every failure mode collapses to
 * `'reject'` so the caller can deterministically map back to the
 * `LoopGuardError` throw path. Callers do NOT need their own try/catch.
 *
 * Failure modes that map to 'reject':
 *  - HTTP timeout (`AbortSignal.timeout`)
 *  - Non-2xx HTTP response
 *  - Network error / connection reset (gateway down)
 *  - Malformed response body
 *  - Unknown decision string
 */
export declare function askUserViaGateway(gatewayUrl: string, input: AskInput, timeoutMs?: number): Promise<LoopGuardDecision>;
//# sourceMappingURL=ask-client.d.ts.map