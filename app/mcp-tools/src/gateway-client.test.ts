import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";

import { runWithSession } from "./context.js";
import { GatewayClient, GatewayHttpError } from "./gateway-client.js";
import { startFakeGateway, type FakeGateway } from "./testing/fake-gateway.js";

let fg: FakeGateway;
let gw: GatewayClient;

beforeEach(async () => {
  fg = await startFakeGateway();
  gw = new GatewayClient(fg.url);
});
afterEach(() => fg.close());

const OkOrFail = z.union([
  z.object({ ok: z.literal(true), value: z.number() }),
  z.object({
    ok: z.literal(false),
    error: z.string(),
    error_code: z.string(),
    cloud_status: z.number().optional(),
    failure_presentation: z.string(),
  }),
]);
const OkOnly = z.object({ ok: z.literal(true), value: z.number() });

describe("GatewayClient headers", () => {
  it("sends only Content-Type outside a tool call", async () => {
    fg.on("GET", "/x", { json: {} });
    await gw.get("/x", 1000, z.object({}));
    const h = fg.requests[0]!.headers;
    expect(h["content-type"]).toBe("application/json");
    expect(h["x-session-id"]).toBeUndefined();
  });

  it("attaches session context headers", async () => {
    fg.on("POST", "/x", { json: { ok: true, value: 1 } });
    await runWithSession(
      { sessionId: "ses", toolUseId: "tu", chatTurnId: "a".repeat(32), groupId: "7", agentRunId: "run" },
      () => gw.post("/x", {}, 1000, OkOnly),
    );
    const h = fg.requests[0]!.headers;
    expect(h).toMatchObject({
      "x-session-id": "ses",
      "x-tool-use-id": "tu",
      "x-chat-turn-id": "a".repeat(32),
      "x-group-id": "7",
      "x-agent-run-id": "run",
    });
  });

  it("inherits agent run id from HILO_AGENT_RUN_ID", async () => {
    process.env.HILO_AGENT_RUN_ID = "env-run";
    try {
      fg.on("GET", "/x", { json: {} });
      await runWithSession({}, () => gw.get("/x", 1000, z.object({})));
      expect(fg.requests[0]!.headers["x-agent-run-id"]).toBe("env-run");
    } finally {
      delete process.env.HILO_AGENT_RUN_ID;
    }
  });
});

describe("GatewayClient.get", () => {
  it("non-2xx throws Gateway <status>: <body>", async () => {
    fg.on("GET", "/x", { status: 503, text: "down" });
    await expect(gw.get("/x", 1000, z.object({}))).rejects.toThrow("Gateway 503: down");
  });

  it("network error throws Gateway network error (GET …)", async () => {
    const dead = new GatewayClient("http://127.0.0.1:1");
    await expect(dead.get("/x", 1000, z.object({}))).rejects.toThrow(/^Gateway network error \(GET \/x\)/);
  });

  it("validates the response with the schema", async () => {
    fg.on("GET", "/x", { json: { wrong: true } });
    await expect(gw.get("/x", 1000, OkOnly)).rejects.toThrow();
  });
});

describe("GatewayClient.post failure shape", () => {
  it("4xx → terminal, message user_message > message > error, code code > error_code", async () => {
    fg.on("POST", "/x", { status: 400, json: { user_message: "nice msg", message: "raw", error: "e", code: "bad_input", error_code: "ignored" } });
    const r = await gw.post("/x", {}, 1000, OkOrFail);
    expect(r).toEqual({ ok: false, error: "nice msg", error_code: "bad_input", cloud_status: 400, failure_presentation: "terminal" });
  });

  it("5xx and 408 → status_unknown, fallback code gateway_http_<status>", async () => {
    fg.on("POST", "/x", { status: 500, json: { message: ["a", "b"] } });
    expect(await gw.post("/x", {}, 1000, OkOrFail)).toEqual({
      ok: false,
      error: "a; b",
      error_code: "gateway_http_500",
      cloud_status: 500,
      failure_presentation: "status_unknown",
    });
    fg.on("POST", "/x", { status: 408, text: "slow" });
    expect(await gw.post("/x", {}, 1000, OkOrFail)).toMatchObject({ error: "slow", failure_presentation: "status_unknown" });
  });

  it("error_code is used when code is absent", async () => {
    fg.on("POST", "/x", { status: 409, json: { error: "conflict!", error_code: "revision_conflict" } });
    expect(await gw.post("/x", {}, 1000, OkOrFail)).toMatchObject({ error: "conflict!", error_code: "revision_conflict" });
  });

  it("throws GatewayHttpError when the schema does not accept the failure", async () => {
    fg.on("POST", "/x", { status: 404, json: { message: "no route" } });
    const err = await gw.post("/x", {}, 1000, OkOnly).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(GatewayHttpError);
    expect(err).toMatchObject({ status: 404, code: "gateway_http_404", message: "no route" });
  });

  it("network error → network_error / status_unknown", async () => {
    const dead = new GatewayClient("http://127.0.0.1:1");
    const r = await dead.post("/x", {}, 1000, OkOrFail);
    expect(r).toMatchObject({ ok: false, error_code: "network_error", failure_presentation: "status_unknown" });
    expect((r as { error: string }).error).toMatch(/^Gateway network error: /);
  });

  it("timeout → timeout / status_unknown", async () => {
    fg.on("POST", "/x", { delayMs: 300, json: { ok: true, value: 1 } });
    const r = await gw.post("/x", {}, 50, OkOrFail);
    expect(r).toMatchObject({ ok: false, error_code: "timeout", failure_presentation: "status_unknown" });
  });

  it("success passes the parsed body through", async () => {
    fg.on("POST", "/x", { json: { ok: true, value: 3 } });
    expect(await gw.post("/x", { a: 1 }, 1000, OkOrFail)).toEqual({ ok: true, value: 3 });
    expect(fg.requests[0]!.body).toEqual({ a: 1 });
  });
});

describe("fire-and-forget + health", () => {
  it("notifyPlanChanged adds runtime_session_id and swallows failures", async () => {
    fg.on("POST", "/api/plan/notify-changed", { status: 500, text: "x" });
    await runWithSession({ sessionId: "s9" }, () => gw.notifyPlanChanged({ plan_id: "p" }));
    expect(fg.requests[0]!.body).toEqual({ plan_id: "p", runtime_session_id: "s9" });
    await new GatewayClient("http://127.0.0.1:1").notifyPlanChanged({});
  });

  it("notifyManualMemoryWrite skips without a session", async () => {
    await gw.notifyManualMemoryWrite(undefined);
    expect(fg.requests).toHaveLength(0);
    fg.on("POST", "/api/feedback-extractor/notify-manual-write", { json: { ok: true } });
    await gw.notifyManualMemoryWrite("s1");
    expect(fg.requests[0]!.body).toEqual({ sessionId: "s1" });
  });

  it("healthCheck retries then succeeds", async () => {
    let n = 0;
    fg.on("GET", "/api/health/live", () => (++n < 3 ? { status: 503, text: "no" } : { json: { status: "ok" } }));
    await gw.healthCheck({ delayMs: 1 });
    expect(n).toBe(3);
  });

  it("healthCheck gives up after the attempt budget", async () => {
    fg.on("GET", "/api/health/live", { status: 503, text: "no" });
    await expect(gw.healthCheck({ attempts: 2, delayMs: 1 })).rejects.toThrow(/after 2 attempts/);
  });

  it("selected-models lookup fails open to null", async () => {
    fg.on("GET", "/api/internal/sessions/s1/selected-models", { status: 500, text: "x" });
    expect(await gw.getSelectedMediaModels("s1")).toBeNull();
    fg.on("GET", "/api/internal/sessions/s1/selected-models", { json: { selected: { image: ["a"] } } });
    expect(await gw.getSelectedMediaModels("s1")).toEqual({ image: ["a"] });
  });
});
