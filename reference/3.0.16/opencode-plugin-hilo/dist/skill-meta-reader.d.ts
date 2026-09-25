/**
 * Read SKILL.md frontmatter for a given skill name. Used by the
 * conversation-triggered skill-tool injection model — when the LLM
 * invokes OpenCode's built-in `skill` tool, we look up the skill's
 * declared `allowed-tools` / `allowed-tools-<agent>` and grant them
 * to the matching agents in the current session tree.
 *
 * Cache strategy: SKILL.md content is process-lifetime stable (the
 * user can edit a file at runtime, but skills must be reloaded /
 * OpenCode restarted for changes to apply anyway). First lookup walks
 * the SSOT skill directories (`@hilo/protocol/skill-paths`); positive
 * AND negative results are cached forever to keep the per-skill-call
 * hot-path zero-IO.
 */
export interface SkillToolMeta {
    /** Tools declared via legacy `allowed-tools` / `tools` field — go to media-agent. */
    tools?: string[];
    /** Tools declared via `allowed-tools-<agent>` — keyed by target agent name. */
    toolsByAgent?: Record<string, string[]>;
}
/**
 * Resolve a skill name to its declared tool grants.
 *
 * Returns `null` when:
 *   - The skill directory cannot be located in any registered SSOT path
 *   - SKILL.md is missing or unreadable
 *   - SKILL.md frontmatter has neither `allowed-tools` / `tools` nor
 *     `allowed-tools-<agent>` fields (skill exists but contributes
 *     no tool grants)
 *
 * Returns a populated `SkillToolMeta` when at least one of the two
 * fields is present.
 *
 * Defensive against partially-valid SKILL.md: any read or parse error
 * is swallowed, the skill is cached as null, and the next lookup is a
 * Map hit.
 */
export declare function readSkillMeta(skillName: string): SkillToolMeta | null;
/** Test helper — wipes the in-memory cache. Production never calls this. */
export declare function _resetSkillMetaCacheForTests(): void;
//# sourceMappingURL=skill-meta-reader.d.ts.map