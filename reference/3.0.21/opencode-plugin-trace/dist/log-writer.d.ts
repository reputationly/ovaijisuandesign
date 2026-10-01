export interface LogWriterOpts {
    logDir: string;
    fileNamePrefix: string;
}
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
export declare class LogWriter {
    private readonly opts;
    constructor(opts: LogWriterOpts);
    write(entry: Record<string, unknown>): void;
}
//# sourceMappingURL=log-writer.d.ts.map