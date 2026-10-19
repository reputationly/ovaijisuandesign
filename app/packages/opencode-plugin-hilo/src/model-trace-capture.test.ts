import { afterEach, describe, expect, it } from "vitest";

import { createModelTraceCapture } from "./model-trace-capture.js";

const original = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = original;
});

describe("模型调用记录", () => {
  it("剥掉上下文头，并在响应带回 trace id 后写回 gateway", async () => {
    const posted: unknown[] = [];
    globalThis.fetch = (async (input, init) => {
      const url = String(input instanceof Request ? input.url : input);
      if (url.endsWith("/api/chat/model-traces")) {
        posted.push(JSON.parse(String(init?.body)));
        const body = JSON.parse(String(init?.body)) as { call_id: string };
        return new Response(JSON.stringify({ call_id: body.call_id }), { status: 200 });
      }
      expect(new Headers(init?.headers).has("x-hilo-model-trace-context")).toBe(false);
      return new Response("ok", { status: 201, headers: { "Trace-Id": "trace-1" } });
    }) as typeof fetch;
    const capture = createModelTraceCapture("http://127.0.0.1:9");
    const headers: Record<string, string> = {};
    capture.attach({ session_id: "sess-1", request_id: "req-1", agent: "media", model_id: "qwen" }, headers);
    await globalThis.fetch("https://models.example/v1/responses", { method: "POST", headers, body: "{}" });
    await capture.dispose();
    expect(posted).toEqual([expect.objectContaining({ session_id: "sess-1", request_id: "req-1", agent: "media", model_id: "qwen", trace_id: "trace-1", status_code: 201 })]);
  });
});
