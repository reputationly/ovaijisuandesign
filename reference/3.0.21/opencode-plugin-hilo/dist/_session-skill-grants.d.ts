export interface AgentLikeForGrant {
    name?: string;
    permission?: Array<{
        permission: string;
        action: string;
        pattern: string;
    }>;
}
export declare function rememberAgentRef(sessionId: string, agent: AgentLikeForGrant): void;
export declare function getAgentRef(sessionId: string): AgentLikeForGrant | undefined;
/**
 * Record that `tools` are now allowed on `agentName` for any session
 * sharing the given root. Idempotent / additive — re-recording the
 * same tool is a no-op. Tools are filtered to the `hub_*` namespace
 * silently because non-hub tools live outside this plugin's deny
 * surface anyway.
 */
export declare function recordGrant(rootSessionId: string, agentName: string, tools: string[]): void;
export declare function recordSkillLoaded(rootSessionId: string, skillName: string): void;
export declare function hasSkillLoaded(rootSessionId: string, skillName: string): boolean;
/** Returns the per-agent grant map for a root session, or undefined when nothing has been granted yet. */
export declare function getGrants(rootSessionId: string): Map<string, Set<string>> | undefined;
/** Test helper — wipes all in-memory state. Production never calls this. */
export declare function _resetGrantsForTests(): void;
/**
 * Resolve `sessionId` to its root session id by querying gateway's
 * `/api/internal/sessions/:id/root` endpoint. The gateway walks the
 * `parentID` chain of the OpenCode session tree (max 10 hops) and
 * returns the topmost id.
 *
 * Cached forever in-process — OpenCode session IDs never get
 * re-parented, so once we've resolved one, the answer is stable for
 * the rest of the OpenCode process lifetime.
 *
 * Fail-open: if the endpoint is unreachable or returns an error,
 * return `sessionId` itself. The grant lookup then falls back to a
 * direct match — wrong for sub-agents, but better than denying
 * everything during a transient outage.
 */
export declare function resolveRootSession(sessionId: string, gatewayUrl: string): Promise<string>;
//# sourceMappingURL=_session-skill-grants.d.ts.map