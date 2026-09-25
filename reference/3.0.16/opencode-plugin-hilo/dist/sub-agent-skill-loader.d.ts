/**
 * Sub-agent skill discovery, self-contained inside this plugin.
 *
 * Why inlined: the plugin is loaded by the OpenCode binary from
 * `<resources>/opencode-plugin-hilo/dist/hilo.js`, with NO sibling
 * `node_modules/`. Importing `@hilo/protocol` at runtime made the entire
 * plugin module fail with `MODULE_NOT_FOUND`, so `chat.params` never
 * registered and per-session media-tool deny rules stopped applying — the
 * model the user picked in the UI was overridden by Claude's free choice.
 *
 * Only the minimal slice actually used here is duplicated:
 *   - `parseSubAgentFrontmatter`: extracts `name` and `agents` from a
 *      SKILL.md frontmatter block. Mirrors the matching subset of
 *      `parseFrontmatter` / `parseListField` in `@hilo/protocol/skill-utils`.
 *   - `getSubAgentSkillDirs`: mirrors `allSubAgentSkillsDirs()` in
 *      `@hilo/protocol/skill-paths` (user dir first, then market-installed).
 *
 * Common-skill scanning was removed (see comment near the deleted block
 * below). Knowledge content now lives at `.opencode/knowledge/` and is
 * read on-demand by the main orchestrator.
 *
 * If you find yourself adding more frontmatter fields here, prefer bundling
 * the plugin (esbuild) over expanding this duplication.
 */
export interface SubAgentSkill {
    name: string;
    agents: string[];
    content: string;
}
export declare function loadSubAgentSkills(): SubAgentSkill[];
export declare function getSubAgentSkillsForAgent(agentName: string): SubAgentSkill[];
export declare function clearSubAgentSkillCache(): void;
//# sourceMappingURL=sub-agent-skill-loader.d.ts.map