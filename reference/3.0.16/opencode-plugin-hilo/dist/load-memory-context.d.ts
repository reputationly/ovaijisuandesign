/**
 * Inject Hub agent memory index into the OpenCode session system prompt.
 *
 * Reads two scopes:
 *   - user    : `<hubRoot>/memory/`             (cross-project, env-isolated)
 *   - project : `<projectRoot>/.hilo/memory/`   (current workspace only)
 *
 * Each scope's directory is scanned for `*.md` files (excluding the
 * `MEMORY.md` index itself). For every file we parse the YAML frontmatter
 * and emit one bullet line `<name> [<type>] — <description>`, using the
 * **frontmatter `name`** (not the filename stem) so it round-trips back into
 * the `hub_memory` MCP tool without surprise. Project
 * entries shadow same-named user entries (matches `resolvedMemoryScopes()`
 * priority).
 *
 * Output is bounded by `budgetBytes` (default 4KB ≈ 50 entries plus the
 * multimodal-creator usage rules block, which alone is ~2KB). When the
 * budget is exhausted we stop appending bullet lines and add a single
 * truncation marker so the agent can fall back to `hub_memory({action:'list'})`.
 *
 * Returns an empty `prompt` (string) when no entries were found in either
 * scope; the caller should skip pushing to `output.system` in that case.
 *
 * Both directories are optional — missing dirs are silently skipped.
 * Files with missing / invalid frontmatter (name / description / type) are
 * skipped with a `console.warn` and never crash the loader.
 */
export interface LoadMemoryOptions {
    /** Current OpenCode workspace cwd. When omitted only user scope is read. */
    projectRoot?: string;
    /** Hard ceiling on the assembled prompt body in UTF-8 bytes. Default 4096. */
    budgetBytes?: number;
    /**
     * Whether to include cross-project user memory in the preloaded prompt
     * context. Project memory is always included when projectRoot is provided.
     * Defaults to true to preserve existing behaviour.
     */
    includeUserMemory?: boolean;
}
export interface LoadedMemoryContext {
    /**
     * Assembled system-prompt segment (header + per-scope sections + usage rules).
     * Empty string when both scopes have no usable entries — caller should skip injection.
     */
    prompt: string;
    /** Number of entries dropped because they would have exceeded budgetBytes. */
    truncated: number;
    /** Total entries discovered across both scopes (before budget truncation). */
    totalEntries: number;
}
/**
 * Mirrors `hubRoot()` in `@hilo/protocol/skill-paths`.
 * Resolution precedence:
 *   1. `HILO_RELEASE_REGION` / `HILO_RELEASE_CHANNEL` (gateway-injected in
 *      packaged builds — region prefix `global-` for overseas, channel
 *      suffix `-staging|-test|-dev` for non-prod).
 *   2. `NODE_ENV` fallback for standalone/test contexts (`-dev` when unset
 *      or `development`, empty when `production`).
 */
declare function hubRoot(): string;
/**
 * `<hubRoot>/memory/` — honours `HUB_MEMORY_DIR` override (mirrors the
 * SSOT in `@hilo/protocol/memory-paths.ts`).
 */
declare function userMemoryDir(): string;
declare function projectMemoryDir(projectRoot: string): string;
/**
 * Test-only re-exports of the inline-copied path resolvers above. Production
 * code MUST keep using the file-local `hubRoot()` / `userMemoryDir()` /
 * `projectMemoryDir()` to preserve the "no `@hilo/protocol` runtime import"
 * invariant. The drift test in
 * `app/packages/opencode-plugin-hilo/__tests__/memory-paths-drift.test.ts`
 * imports these and asserts they agree with `@hilo/protocol/memory-paths`
 * across every documented env permutation.
 */
export declare const __forTest_pathResolvers: {
    hubRoot: typeof hubRoot;
    userMemoryDir: typeof userMemoryDir;
    projectMemoryDir: typeof projectMemoryDir;
};
export declare function shouldIncludeUserMemory(projectRoot?: string): boolean;
export declare function loadMemoryContext(opts?: LoadMemoryOptions): Promise<LoadedMemoryContext>;
export {};
//# sourceMappingURL=load-memory-context.d.ts.map