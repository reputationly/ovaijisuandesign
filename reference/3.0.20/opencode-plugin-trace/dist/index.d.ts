import type { Plugin } from '@opencode-ai/plugin';
/**
 * @hilo/opencode-plugin-trace
 *
 * When `LOG_OPENCODE_TRACE=1` (or `true`), monkey-patch globalThis.fetch in
 * the OpenCode (Bun) process to record every request that targets a hilo
 * cloud-gateway URL. Off by default; zero overhead when disabled.
 *
 * Logs are JSON-line, written to `${cwd}/logs/opencode-trace-YYYY-MM-DD.log`.
 * cwd corresponds to the active Hub Project root (see opencode-manager.ts).
 *
 * WARNING: traced log entries contain raw request/response bodies including
 * `Authorization` and `x-api-key` headers. Never share enabled trace logs.
 */
declare const plugin: Plugin;
export default plugin;
//# sourceMappingURL=index.d.ts.map