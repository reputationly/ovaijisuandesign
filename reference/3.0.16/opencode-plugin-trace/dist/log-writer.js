import { appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
/**
 * JSON-line file writer with daily rotation.
 *
 * Plugin runs inside OpenCode (Bun) and cannot depend on NestJS logger.
 * Sync `appendFileSync` is intentional: simple, ordered, no stream lifecycle
 * to manage. LLM call frequency is low enough (~seconds per call) that the
 * sync overhead is irrelevant.
 *
 * All errors are swallowed — trace must never break the main fetch flow.
 */
export class LogWriter {
    opts;
    constructor(opts) {
        this.opts = opts;
    }
    write(entry) {
        try {
            if (!existsSync(this.opts.logDir)) {
                mkdirSync(this.opts.logDir, { recursive: true });
            }
            const dateStr = formatDate(new Date());
            // Use `.jsonl` (JSON Lines standard). IDEs / formatters don't auto-format
            // `.jsonl`, so the file stays as one JSON object per line — which is what
            // jq, grep, awk, and tail need. `.json` would get pretty-printed in
            // place by VS Code's default JSON formatter and break parsing.
            const file = join(this.opts.logDir, `${this.opts.fileNamePrefix}-${dateStr}.jsonl`);
            appendFileSync(file, `${JSON.stringify(entry)}\n`, 'utf8');
        }
        catch {
            // swallow
        }
    }
}
function formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}
//# sourceMappingURL=log-writer.js.map