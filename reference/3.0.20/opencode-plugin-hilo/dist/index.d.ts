/**
 * OpenCode plugin entry. The OpenCode plugin loader (Bun runtime)
 * enumerates EVERY named export of this module and tries to call each
 * one as `Plugin = (input) => Promise<Hooks>`. Plain-object exports
 * (e.g. test-only state buckets, configuration constants, cached
 * lookup tables) trip the loader with
 * `<varname> is not a function. (...) is an instance of Object`,
 * silently aborting the entire plugin -- including the default export.
 *
 * Therefore: this file may have at most ONE export, `export default
 * plugin`. Internal symbols that need to be reused by other modules
 * (vitest, future submodules, future helper functions) MUST live in
 * sibling files like `_session-agent-cache.ts` and be imported here.
 *
 * Adding a `export const ...` to this file will silently break
 * sessionID-first routing, deny-rule enforcement, and every other
 * plugin hook -- production users will see none of those features
 * but no error message will surface to the desktop UI. This is a
 * P3-class regression (commit ac17bdea6).
 */
import type { Plugin } from '@opencode-ai/plugin';
/**
 * Why every miss carries a distinct reason: the old implementation folded
 * timeout / 404 / 500 / malformed body / genuine legacy session into a bare
 * `null`, and both consumers then silently shipped an unscoped request. When a
 * cloud trace showed an empty `X-Group-Id` there was no way to tell WHICH
 * branch produced it, so a real Group-loss incident could not be localised
 * (audited 2026-07-28). Keeping the reason is the precondition for both
 * diagnosis and a future fail-closed switch: only `legacy_null` may be treated
 * as "this session legitimately has no Group".
 */
export type RequestGroupMissReason = 'no_session'
/** Gateway vouched: this turn has no canonical scope. Spending allowed. */
 | 'legacy_null'
/**
 * Gateway could not vouch for the turn (registry miss / OpenCode parent walk
 * failed). Distinct from `legacy_null` on purpose: this is the state that used
 * to be silently charged to the default Personal Group.
 */
 | 'turn_unknown' | 'http_error' | 'timeout' | 'network_error' | 'malformed';
export type RequestGroupResolution = {
    ok: true;
    groupId: string;
    elapsedMs: number;
    chatTurnId?: string;
} | {
    ok: false;
    groupId: null;
    reason: RequestGroupMissReason;
    elapsedMs: number;
    status?: number;
    detail?: string;
    chatTurnId?: string;
};
/**
 * @hilo/opencode-plugin-hilo
 *
 * Per-session media model filter for the MiniMax Hub desktop app.
 *
 * On every prompt, fetch the session's selection from the gateway and push
 * deny rules onto `input.agent.permission` so OpenCode's tools[] construction
 * excludes unselected media tools — Claude API never sees them.
 *
 * Sub-agent ancestry walking is owned by the gateway
 * (`internal-session.controller.ts`), so this plugin is stateless from the
 * session perspective and does a single round-trip per chat.params.
 *
 * Media model registry is fetched from gateway and cached for 24h
 * (see media-models-cache.ts).
 */
declare const plugin: Plugin;
export default plugin;
//# sourceMappingURL=index.d.ts.map