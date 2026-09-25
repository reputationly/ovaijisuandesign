import type { SelectedMediaModels } from '@hilo/protocol';
/**
 * Fetch the user's media model whitelist for an OpenCode runtime session.
 *
 * No client-side cache by design: the gateway is on localhost (TCP or unix
 * socket), RTT is sub-millisecond, and a stale value would mean the user
 * changes their selection but the next prompt still uses the old one. The
 * gateway is the single source of truth — fetch every time.
 *
 * Sub-agent ancestry walking lives on the gateway side
 * (see `internal-session.controller.ts`), so this function is a single
 * round-trip with no recursion.
 *
 * Returns `null` for: Auto sessions, unknown sessions, fetch failures, or
 * non-2xx responses. The plugin treats `null` as "no filtering" — fail-open
 * by design so a transient gateway hiccup never wedges the agent.
 *
 * When the gateway responds with HTTP 200 but `selected: null` (session
 * not yet resolved), we retry up to {@link RETRY_COUNT} times with
 * {@link RETRY_DELAY_MS} ms between attempts. This handles the race
 * condition where `chat.params` fires for a sub-agent before the gateway
 * has registered the child→parent session mapping.
 *
 * HTTP errors and network failures are NOT retried — they indicate a real
 * problem, not a race condition.
 *
 * 2 s timeout per attempt so a wedged gateway can't stall a chat turn.
 */
export declare function fetchSelectedModels(opencodeSessionId: string, gatewayUrl: string): Promise<SelectedMediaModels | null>;
//# sourceMappingURL=session-fetch.d.ts.map