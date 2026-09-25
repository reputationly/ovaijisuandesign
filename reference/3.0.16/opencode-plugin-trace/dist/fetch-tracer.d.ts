export interface TraceWriter {
    write(entry: Record<string, unknown>): void;
}
export interface CreateTracedFetchOpts {
    originalFetch: typeof fetch;
    writer: TraceWriter;
    shouldTrace: (url: string) => boolean;
}
/**
 * Build a fetch wrapper that records req/resp for URLs matching `shouldTrace`.
 *
 * Pass-through path is kept minimal so non-target hosts incur only one prefix
 * check. For target hosts we clone the response so the caller still receives a
 * fully consumable body stream.
 *
 * Body is parsed by content-type so the log file stays readable with `jq`:
 *   - application/json → expanded as inline object
 *   - text/event-stream → expanded as `[{event, data}, ...]` (data parsed if JSON)
 *   - everything else → raw string
 */
export declare function createTracedFetch(opts: CreateTracedFetchOpts): typeof fetch;
//# sourceMappingURL=fetch-tracer.d.ts.map