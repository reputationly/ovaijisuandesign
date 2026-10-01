/**
 * Internal LRU cache + MCP tool name constant used by the plugin's
 * `chat.params` and `tool.execute.before` hooks.
 *
 * Lives in a separate file from `index.ts` because OpenCode's plugin
 * loader enumerates EVERY named export of the plugin module and
 * attempts to call each one as `Plugin = (input) => Promise<Hooks>`
 * (see node_modules/.pnpm/@opencode-ai+plugin@<version>/dist/example.js for
 * the canonical shape). Plain-object exports trip the loader with
 * `<varname> is not a function. (...) is an instance of Object`,
 * silently aborting the entire plugin even though the default export
 * is fine. The previous `export const __test__ = { ... }` shape on
 * `index.ts` triggered exactly this; moving these symbols into a
 * private module keeps the plugin entry surface to `export default
 * plugin` only.
 *
 * Vitest imports the named exports directly from this file. Production
 * code (the plugin hooks themselves) imports from here too -- there is
 * no longer a `__test__` peephole.
 */
/**
 * sessionID → agent.name cache populated in `chat.params`, consumed
 * for two distinct purposes (both internal to the plugin):
 *
 *   1. In-turn skill permission grants — when a tool grants additional
 *      permissions for the current sub-agent (e.g. skill activation),
 *      the cache lets us identify whose `agentRef.permission` array to
 *      push to so the very next tool_use in the same LLM turn sees the
 *      grants. The `tool.execute.before` hook doesn't carry the agent
 *      name in its input, hence the lookup.
 *
 *   2. Future cross-call attribution for benchmark / observability —
 *      `tool.execute.before` injects `_session_id` into every MCP tool
 *      call (so the gateway can route the call to the right runtime
 *      session). The cache lets us extend that injection with the
 *      caller agent if future MCP tools need it; today only `_session_id`
 *      is auto-injected.
 *
 * Note: pre-Phase-8 versions of this cache also drove
 * `report_resource_judgment` MCP arg injection (deleted alongside the
 * agent self-report path in Phase 8).
 *
 * Eviction: bounded LRU via Map insertion-order (max ~1024 entries).
 * Sessions are never explicitly evicted by the plugin because we have no
 * teardown signal — relying on natural turnover keeps memory flat
 * without coupling to OpenCode internals.
 */
export declare const SESSION_AGENT_CACHE_MAX = 1024;
export declare const sessionAgentCache: Map<string, string>;
export declare function rememberSessionAgent(sessionID: string, agentName: string): void;
//# sourceMappingURL=_session-agent-cache.d.ts.map