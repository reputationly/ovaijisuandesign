import { randomUUID } from 'node:crypto';
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
export function createTracedFetch(opts) {
    const { originalFetch, writer, shouldTrace } = opts;
    return async function tracedFetch(input, init) {
        const url = normalizeUrl(input);
        if (!shouldTrace(url)) {
            return originalFetch(input, init);
        }
        const requestId = randomUUID();
        const startTs = Date.now();
        const reqHeaders = serializeHeaders(init?.headers);
        writer.write({
            kind: 'http_req',
            requestId,
            ts: new Date().toISOString(),
            method: init?.method ?? methodFromInput(input) ?? 'GET',
            url,
            headers: reqHeaders,
            body: parseBody(serializeBody(init?.body), reqHeaders['content-type']),
        });
        let resp;
        try {
            resp = await originalFetch(input, init);
        }
        catch (err) {
            writer.write({
                kind: 'http_error',
                requestId,
                ts: new Date().toISOString(),
                duration_ms: Date.now() - startTs,
                error: err instanceof Error ? err.message : String(err),
            });
            throw err;
        }
        const cloned = resp.clone();
        const respHeaders = Object.fromEntries(resp.headers.entries());
        // CRITICAL: do NOT await cloned.text() — that would buffer the entire
        // response body before returning resp to the caller, which for SSE
        // (text/event-stream) means OpenCode receives the whole stream at once
        // and dispatches every chunk in a single tick. Symptom: chat appears
        // to "land all at once" after the model finishes instead of streaming
        // token-by-token.
        //
        // Instead, kick off a background read on the cloned stream. Web
        // ReadableStream.tee() (which clone() uses under the hood) feeds both
        // readers in parallel, so this doesn't block the caller's stream
        // — chunks flow to OpenCode at network speed while we accumulate
        // them in the background for the log.
        cloned
            .text()
            .then((bodyText) => {
            writer.write({
                kind: 'http_resp',
                requestId,
                ts: new Date().toISOString(),
                status: resp.status,
                duration_ms: Date.now() - startTs,
                headers: respHeaders,
                body: parseBody(bodyText, respHeaders['content-type']),
            });
        })
            .catch((err) => {
            writer.write({
                kind: 'http_resp',
                requestId,
                ts: new Date().toISOString(),
                status: resp.status,
                duration_ms: Date.now() - startTs,
                headers: respHeaders,
                body: `<failed to read body: ${err instanceof Error ? err.message : String(err)}>`,
            });
        });
        return resp;
    };
}
function normalizeUrl(input) {
    if (typeof input === 'string')
        return input;
    if (input instanceof URL)
        return input.href;
    return input.url;
}
function methodFromInput(input) {
    if (typeof input === 'string' || input instanceof URL)
        return undefined;
    return input.method;
}
function serializeHeaders(headers) {
    if (!headers)
        return {};
    if (headers instanceof Headers)
        return Object.fromEntries(headers.entries());
    if (Array.isArray(headers))
        return Object.fromEntries(headers);
    // Normalize keys to lowercase so callers can look up by canonical name.
    return Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
}
function serializeBody(body) {
    if (body == null)
        return null;
    if (typeof body === 'string')
        return body;
    return `<non-string body: ${body.constructor?.name ?? typeof body}>`;
}
/**
 * Parse a body string into a richer shape based on content-type so the JSON-line
 * log file is readable with `jq` without manual unescaping.
 *
 * Returns the original string when content-type is unknown / parsing fails;
 * never throws (trace must not break the main fetch flow).
 */
function parseBody(text, contentType) {
    if (text == null)
        return null;
    if (text.startsWith('<non-string body'))
        return text;
    if (text === '<failed to read body>')
        return text;
    if (!contentType)
        return text;
    const ct = contentType.toLowerCase();
    if (ct.includes('application/json')) {
        try {
            return JSON.parse(text);
        }
        catch {
            return text;
        }
    }
    if (ct.includes('text/event-stream')) {
        return parseSseEvents(text);
    }
    return text;
}
/**
 * Parse SSE wire format into a structured event list.
 *
 * SSE spec: events are separated by a blank line; each event is one or more
 * `field: value` lines. `data:` may repeat (joined with `\n`). Comments
 * (lines starting with `:`) and empty trailing lines are ignored.
 *
 * We additionally JSON-parse the joined `data` payload when it looks like
 * JSON, since the LLM-streaming use-case always emits JSON deltas.
 */
function parseSseEvents(text) {
    const events = [];
    for (const block of text.split(/\r?\n\r?\n/)) {
        const trimmed = block.replace(/^\s+|\s+$/g, '');
        if (!trimmed)
            continue;
        const ev = {};
        const dataLines = [];
        for (const line of trimmed.split(/\r?\n/)) {
            if (!line || line.startsWith(':'))
                continue;
            const idx = line.indexOf(':');
            const field = idx === -1 ? line : line.slice(0, idx);
            // Per spec: optional space after colon is stripped.
            let value = idx === -1 ? '' : line.slice(idx + 1);
            if (value.startsWith(' '))
                value = value.slice(1);
            switch (field) {
                case 'event':
                    ev.event = value;
                    break;
                case 'data':
                    dataLines.push(value);
                    break;
                case 'id':
                    ev.id = value;
                    break;
                case 'retry': {
                    const n = Number(value);
                    if (Number.isFinite(n))
                        ev.retry = n;
                    break;
                }
                // unknown field — ignore per spec
            }
        }
        if (dataLines.length > 0) {
            const joined = dataLines.join('\n');
            try {
                ev.data = JSON.parse(joined);
            }
            catch {
                ev.data = joined;
            }
        }
        events.push(ev);
    }
    return events;
}
//# sourceMappingURL=fetch-tracer.js.map