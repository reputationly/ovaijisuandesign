import { type SelectedMediaModels } from '@hilo/protocol';
import type { ModelInfo } from '@hilo/protocol/proto';
export interface DenyRule {
    permission: string;
    action: 'deny';
    pattern: string;
}
/**
 * Compute deny rules so the agent's effective tool surface matches the UI's
 * model picker.
 *
 * Scope: this plugin's only job is "narrow the agent's media-generation
 * surface based on the user's picker selection". Tools that aren't in the
 * picker (= not in any `mediaModels[i].tool_names`) are out of scope and
 * never get a deny pushed — they're whatever the agent's `agent.tools` map
 * says they are (helpers / utility tools / skill-injected tools / ...).
 *
 * Two sets are at play:
 *
 *   B = tools served by the unified cloud model catalog
 *   selected[category] = ids the user picked in that category
 *
 * Algorithm:
 *
 *   For each `hub_*` allow entry on agent.permission:
 *     - in B for some category C:
 *         · category C selected → allowed = tools of selected models in C
 *         · category C is Auto  → allowed = full B[C]
 *         · tool not in allowed → deny
 *     - not in B → leave alone (out of scope)
 *
 * Why no "deny unknown" safety net any more (history):
 *
 *   Earlier versions also had a `helpers` (H) set computed from base.json
 *   and an `A \ (B ∪ H) → ALWAYS deny` branch, intended to catch
 *   base.json-side allow leaks (e.g. an openai tool somehow allowed but
 *   never listed by the catalog) and cloud-side tool retirements (the catalog drops
 *   an entry → deny it immediately). That branch was always wrong for
 *   anything non-generation: helpers, ffmpeg, and especially skill-injected
 *   tools (`allowed-tools-<agent>`) all trip it because they're in the
 *   agent's permission list but not in the catalog. The skill
 *   injection mechanism made that bug systematic.
 *
 *   The safety net is gone because:
 *     (1) base.json is hand-curated and reviewed via MR; openai-style
 *         leaks are caught at code review, not at runtime.
 *     (2) cloud-side tool retirements still produce HTTP errors when the
 *         agent calls them — the agent sees the failure and falls back.
 *         No silent success.
 *     (3) Future tool sources (skill-injected, user-MCP, ...) keep
 *         working without any plugin-side coordination.
 *
 * Fail-open: when `mediaModels` is empty (cloud unreachable / not yet
 * loaded), return `[]`. Locking the agent out is worse than leaving the
 * full B surface exposed for one prompt while the next fetch retries.
 */
export declare function computeDenyRules(selected: SelectedMediaModels | null | undefined, mediaModels: readonly ModelInfo[], agentPermission: ReadonlyArray<{
    permission: string;
    action: string;
    pattern: string;
}>): DenyRule[];
/**
 * Apply deny rules to an agent permission array, **replacing** any deny
 * entries this plugin previously added for the same agent.
 *
 * OpenCode's `input.agent` in the chat.params hook is shared across all
 * sessions that talk to the same agent (e.g. every session calling the
 * "image" subagent gets the same `agent.permission` array reference). If we
 * just appended deny rules every chat.params, they'd accumulate forever and
 * a previous session's selection would silently restrict the next session.
 *
 * Caller (index.ts) keeps a `Map<agentName, DenyRule[]>` of "what we last
 * pushed for this agent" and passes that as `previousRules`. We:
 *
 *   1. Remove every previousRules entry from the permission array (precise
 *      identity match by permission name + action). Independent of
 *      `mediaModels`, so it works even when the registry is stale or
 *      unavailable.
 *   2. Push newRules to the **END** of the array. OpenCode evaluates
 *      permission with **last-match-wins** semantics — verified from the
 *      runtime log: a plugin `deny banana` at index 8 lost to
 *      base.domestic.json's `allow banana` at index 19, evaluate
 *      hit the allow. To make plugin deny actually take effect, it must
 *      sit AFTER every base.json / region allow entry.
 *
 *   We deliberately DO NOT remove pre-existing `allow` rules. Those are
 *   owned by base.json / base.{region}.json — deleting them permanently
 *   destroys the user's ability to ever use that tool again, even when
 *   they later switch to a session that selects it.
 *
 * Returns the count of newly inserted rules (for logging).
 */
export declare function applyDenyRules(permission: Array<{
    permission: string;
    action: string;
    pattern: string;
}>, newRules: DenyRule[], previousRules: readonly DenyRule[]): number;
//# sourceMappingURL=permission-mutator.d.ts.map