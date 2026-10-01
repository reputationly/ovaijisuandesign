/**
 * Browser prerequisite: the model must load the `control-in-app-browser`
 * Skill before a session's first `hub_browser` action, so page control always
 * runs under the Skill's routing, authentication-takeover, confirmation, and
 * read-back rules instead of improvised page interaction.
 *
 * The receipt is recorded in `tool.execute.after` — a load that failed or
 * returned nothing must not open the gate, because the Skill body only
 * reaches the model when the call actually returns it.
 *
 * A typed error keeps the block distinguishable from a genuine browser
 * failure for the model, the desktop timeline, and tests.
 *
 * The Skill is distributed through the skill market (silent-install
 * whitelist), not bundled with the app, so there is an install window —
 * first launch, offline, or a failed whitelist refresh. The gate only
 * enforces the prerequisite when the Skill is actually discoverable on
 * disk; otherwise `hub_browser` must not be dead-blocked behind a Skill
 * the model cannot load.
 */
export declare const CONTROL_IN_APP_BROWSER_SKILL = "control-in-app-browser";
export declare class BrowserSkillRequiredError extends Error {
    readonly code = "BROWSER_SKILL_REQUIRED";
    readonly skill = "control-in-app-browser";
    constructor();
}
/** True when a completed `skill` call actually delivered the Browser Skill body. */
export declare function isBrowserSkillLoadResult(args: unknown, resultText: unknown): boolean;
/**
 * True when the Browser Skill exists in any runtime skill directory
 * (user / market-installed / EXTRA_SKILLS_DIRS — same SSOT the OpenCode
 * config uses for discovery). A miss re-probes on every gated call so a
 * silent install landing mid-session opens the gate without a restart.
 *
 * `dirs` is injectable for tests; production callers use the SSOT default.
 */
export declare function isBrowserSkillInstalled(dirs?: string[]): boolean;
/** Test-only: clear the sticky install probe between cases. */
export declare function resetBrowserSkillInstallProbeForTest(): void;
//# sourceMappingURL=browser-skill-gate.d.ts.map