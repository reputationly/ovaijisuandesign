import { CLOUD_GATEWAY_URL_PREFIXES } from '@hilo/protocol';
import { createTracedFetch } from './fetch-tracer.js';
import { LogWriter } from './log-writer.js';
import { matchesPrefixes } from './url-filter.js';
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
const plugin = async () => {
    const enabled = process.env.LOG_OPENCODE_TRACE === '1' || process.env.LOG_OPENCODE_TRACE === 'true';
    if (!enabled) {
        return {};
    }
    const logDir = `${process.cwd()}/logs`;
    const writer = new LogWriter({ logDir, fileNamePrefix: 'opencode-trace' });
    const originalFetch = globalThis.fetch;
    globalThis.fetch = createTracedFetch({
        originalFetch,
        writer,
        shouldTrace: (url) => matchesPrefixes(url, CLOUD_GATEWAY_URL_PREFIXES),
    });
    console.log(`[opencode-plugin-trace] enabled, writing to ${logDir}/opencode-trace-*.jsonl`);
    return {};
};
export default plugin;
//# sourceMappingURL=index.js.map