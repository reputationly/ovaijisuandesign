import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { runWithSession } from "./context.js";
import { GatewayClient } from "./gateway-client.js";
import { runAsync, type RunAsyncOptions } from "./run-async.js";
import { startFakeGateway, type FakeGateway } from "./testing/fake-gateway.js";

// 间隔压到毫秒级：只验证状态机，不验证真实退避时长
const fast: RunAsyncOptions = { pollBaseMs: 2, pollCapMs: 5, sleep: () => new Promise((r) => setTimeout(r, 1)) };

let fg: FakeGateway;
let gw: GatewayClient;

beforeEach(async () => {
  fg = await startFakeGateway();
  gw = new GatewayClient(fg.url);
});
afterEach(() => fg.close());

const legacy = <T>(fn: () => Promise<T>) => runWithSession({ groupScope: "legacy" }, fn);

function submitOk(taskId = "t1", extra: Record<string, unknown> = {}) {
  fg.on("POST", "/api/generate/image/submit", {
    json: { ok: true, task_id: taskId, status: "processing", media_type: "image", ...extra },
  });
}

describe("runAsync", () => {
  it("submits, polls through processing, returns the success result", async () => {
    submitOk();
    let polls = 0;
    fg.on("GET", "/api/generate/tasks/t1/query", () => {
      polls += 1;
      return polls < 3
        ? { json: { ok: true, task_id: "t1", status: "processing" } }
        : { json: { ok: true, task_id: "t1", status: "succeeded", result: { ok: true, path: "/w/a.png", node_id: "n1" } } };
    });
    const r = await legacy(() => runAsync(gw, "image", { prompt: "cat" }, fast));
    expect(r).toEqual({ ok: true, path: "/w/a.png", node_id: "n1" });
    expect(polls).toBe(3);
    const submit = fg.requests.find((q) => q.path === "/api/generate/image/submit");
    expect(submit?.body).toEqual({ prompt: "cat" });
  });

  it("falls back to asset.path when result is not a valid success", async () => {
    submitOk();
    fg.on("GET", "/api/generate/tasks/t1/query", {
      json: { ok: true, task_id: "t1", status: "succeeded", result: { weird: 1 }, asset: { path: "/w/b.png" } },
    });
    const r = await legacy(() => runAsync(gw, "image", {}, fast));
    expect(r).toEqual({ ok: true, path: "/w/b.png" });
  });

  it("success without a usable result or asset path is recoverable", async () => {
    submitOk();
    fg.on("GET", "/api/generate/tasks/t1/query", { json: { ok: true, task_id: "t1", status: "succeeded", result: { weird: 1 } } });
    const r = await legacy(() => runAsync(gw, "image", {}, fast));
    expect(r).toMatchObject({ ok: false, error_code: "unknown", failure_presentation: "recoverable", recovery_handle: "t1" });
    expect(r.ok ? "" : r.error).toMatch(/^gateway reported success but returned no usable asset path: /);
  });

  it("submit 4xx carries status, gateway error and code", async () => {
    fg.on("POST", "/api/generate/image/submit", { status: 400, json: { ok: false, error: "bad prompt", error_code: "invalid_request" } });
    const r = await legacy(() => runAsync(gw, "image", {}, fast));
    expect(r).toMatchObject({ ok: false, error: "submit 400: bad prompt [invalid_request]", error_code: "client_error", failure_presentation: "terminal" });
  });

  it("unreachable gateway on submit is a status_unknown network error", async () => {
    const dead = new GatewayClient("http://127.0.0.1:1");
    const r = await legacy(() => runAsync(dead, "image", {}, fast));
    expect(r).toMatchObject({ ok: false, error_code: "network_error", failure_presentation: "status_unknown" });
    expect(r.ok ? "" : r.error).toMatch(/^Gateway network error: /);
  });

  it("terminal cloud failure maps to backend_error / terminal", async () => {
    submitOk();
    fg.on("GET", "/api/generate/tasks/t1/query", {
      json: {
        ok: false,
        task_id: "t1",
        status: "failed",
        cloud_terminal: true,
        error: "moderation",
        error_code: "content_policy_violation",
        user_message: "blocked",
        refund_status: "refunded",
        refunded_credits: 3,
      },
    });
    const r = await legacy(() => runAsync(gw, "image", {}, fast));
    expect(r).toMatchObject({
      ok: false,
      error: "moderation [content_policy_violation]",
      error_code: "backend_error",
      user_message: "blocked",
      failure_presentation: "terminal",
      refund_status: "refunded",
      refunded_credits: 3,
    });
  });

  it("billing failure keeps its error code", async () => {
    submitOk();
    fg.on("GET", "/api/generate/tasks/t1/query", {
      json: { ok: false, task_id: "t1", status: "failed", cloud_terminal: true, error: "no money", error_code: "billing_insufficient_balance" },
    });
    const r = await legacy(() => runAsync(gw, "image", {}, fast));
    expect(r).toMatchObject({ error_code: "billing_insufficient_balance", failure_presentation: "terminal" });
  });

  it("5xx / 429 during polling are retried, not surfaced", async () => {
    submitOk();
    const seq = [503, 429, 408, 200];
    let i = 0;
    fg.on("GET", "/api/generate/tasks/t1/query", () => {
      const status = seq[i++] ?? 200;
      return status === 200
        ? { json: { ok: true, task_id: "t1", status: "succeeded", result: { ok: true, path: "/w/c.png" } } }
        : { status, json: { message: "busy" } };
    });
    const r = await legacy(() => runAsync(gw, "image", {}, fast));
    expect(r).toEqual({ ok: true, path: "/w/c.png" });
    expect(i).toBe(4);
  });

  it("follows a task_id replacement while processing", async () => {
    submitOk("old");
    fg.on("GET", "/api/generate/tasks/old/query", { json: { ok: true, task_id: "new", status: "processing" } });
    fg.on("GET", "/api/generate/tasks/new/query", {
      json: { ok: true, task_id: "new", status: "succeeded", result: { ok: true, path: "/w/d.png" } },
    });
    const r = await legacy(() => runAsync(gw, "image", {}, fast));
    expect(r).toEqual({ ok: true, path: "/w/d.png" });
    const polled = fg.requests.filter((q) => q.path.endsWith("/query")).map((q) => q.path);
    expect(polled).toEqual(["/api/generate/tasks/old/query", "/api/generate/tasks/new/query"]);
  });

  it("overall timeout returns recoverable with recovery_handle", async () => {
    submitOk("slow");
    fg.on("GET", "/api/generate/tasks/slow/query", { json: { ok: true, task_id: "slow", status: "processing" } });
    const r = await legacy(() => runAsync(gw, "image", {}, { ...fast, overallTimeoutMs: 40 }));
    expect(r).toMatchObject({
      ok: false,
      error: "async poll exceeded 40ms",
      error_code: "timeout",
      failure_presentation: "recoverable",
      recovery_handle: "slow",
    });
  });

  it("query 404 is status_unknown, other 4xx recoverable", async () => {
    submitOk();
    fg.on("GET", "/api/generate/tasks/t1/query", { status: 404, text: "gone" });
    const r = await legacy(() => runAsync(gw, "image", {}, fast));
    expect(r).toMatchObject({ error_code: "client_error", failure_presentation: "status_unknown", recovery_handle: "t1" });
  });

  it("submit 4xx is terminal client_error; 5xx is status_unknown backend_error", async () => {
    fg.on("POST", "/api/generate/image/submit", { status: 400, json: { ok: false, error: "bad prompt", user_message: "fix it" } });
    const a = await legacy(() => runAsync(gw, "image", {}, fast));
    expect(a).toMatchObject({ error: "submit 400: bad prompt", error_code: "client_error", failure_presentation: "terminal", user_message: "fix it" });

    fg.on("POST", "/api/generate/image/submit", { status: 502, text: "upstream" });
    const b = await legacy(() => runAsync(gw, "image", {}, fast));
    expect(b).toMatchObject({ error: "submit 502: upstream", error_code: "backend_error", failure_presentation: "status_unknown" });
  });

  it("submit billing failure is terminal billing_insufficient_balance with billing metadata", async () => {
    fg.on("POST", "/api/generate/image/submit", {
      status: 402,
      json: { ok: false, error: "quota", cloud_error_type: "insufficient_quota", billing: { shortfall_credits: 5 } },
    });
    const r = await legacy(() => runAsync(gw, "image", {}, fast));
    expect(r).toMatchObject({ error_code: "billing_insufficient_balance", failure_presentation: "terminal", billing: { shortfall_credits: 5 } });
  });

  it("drops an invalid cloud_status_polling policy instead of failing the submit", async () => {
    submitOk("t1", { cloud_status_polling: { fixedIntervalMs: 5, fixedWindowMs: 1 } });
    fg.on("GET", "/api/generate/tasks/t1/query", {
      json: { ok: true, task_id: "t1", status: "succeeded", result: { ok: true, path: "/w/e.png" } },
    });
    const r = await legacy(() => runAsync(gw, "image", {}, fast));
    expect(r).toEqual({ ok: true, path: "/w/e.png" });
  });

  it("uses the fixed interval inside the cloud polling window", async () => {
    submitOk("t1", { cloud_status_polling: { fixedIntervalMs: 2000, fixedWindowMs: 60000 } });
    let polls = 0;
    fg.on("GET", "/api/generate/tasks/t1/query", () => {
      polls += 1;
      return polls < 3
        ? { json: { ok: true, task_id: "t1", status: "processing" } }
        : { json: { ok: true, task_id: "t1", status: "succeeded", result: { ok: true, path: "/w/f.png" } } };
    });
    const delays: number[] = [];
    const r = await legacy(() =>
      runAsync(gw, "image", {}, { sleep: async (ms) => void delays.push(ms), random: () => 0.9 }),
    );
    expect(r).toMatchObject({ ok: true });
    // 窗口期内不抖动、不退避
    expect(delays).toEqual([2000, 2000, 2000]);
  });

  it("backoff grows ×1.6 with jitter and caps", async () => {
    submitOk();
    let polls = 0;
    fg.on("GET", "/api/generate/tasks/t1/query", () => {
      polls += 1;
      return polls < 8
        ? { json: { ok: true, task_id: "t1", status: "processing" } }
        : { json: { ok: true, task_id: "t1", status: "succeeded", result: { ok: true, path: "/w/g.png" } } };
    });
    const delays: number[] = [];
    await legacy(() => runAsync(gw, "image", {}, { sleep: async (ms) => void delays.push(ms), random: () => 0.5 }));
    // random()=0.5 → 抖动为 0
    expect(delays.slice(0, 4).map(Math.round)).toEqual([1000, 1600, 2560, 4096]);
    expect(Math.max(...delays)).toBeLessThanOrEqual(15000);
  });

  it("recovers legacy billing scope from the gateway when the plugin gave none", async () => {
    fg.on("GET", "/api/internal/sessions/billing-current-scope", { json: { mode: "legacy", group_id: null, source: "no_selection" } });
    fg.on("POST", "/api/internal/sessions/request-group-diagnostic", { json: { ok: true } });
    submitOk();
    fg.on("GET", "/api/generate/tasks/t1/query", {
      json: { ok: true, task_id: "t1", status: "succeeded", result: { ok: true, path: "/w/h.png" } },
    });
    const r = await runWithSession({}, () => runAsync(gw, "image", {}, fast));
    expect(r).toMatchObject({ ok: true });
  });

  it("uses the per-session request-group and sends the recovered group id header", async () => {
    fg.on("GET", "/api/internal/sessions/s1/request-group", { json: { mode: "canonical", group_id: "42", source: "turn" } });
    fg.on("POST", "/api/internal/sessions/request-group-diagnostic", { json: { ok: true } });
    submitOk();
    fg.on("GET", "/api/generate/tasks/t1/query", {
      json: { ok: true, task_id: "t1", status: "succeeded", result: { ok: true, path: "/w/i.png" } },
    });
    await runWithSession({ sessionId: "s1" }, () => runAsync(gw, "image", {}, fast));
    const submit = fg.requests.find((q) => q.path === "/api/generate/image/submit");
    expect(submit?.headers["x-group-id"]).toBe("42");
    expect(submit?.headers["x-session-id"]).toBe("s1");
  });

  it("refuses to submit when the billing scope cannot be resolved", async () => {
    fg.on("GET", "/api/internal/sessions/billing-current-scope", { status: 500, text: "down" });
    await expect(runWithSession({}, () => runAsync(gw, "image", {}, fast))).rejects.toThrow(
      "REQUEST_GROUP_UNAVAILABLE: refusing to submit image generation without a request/billing Group (scope=absent). Retry the request; if it persists, the local gateway could not resolve the current turn Group.",
    );
    expect(fg.requests.some((q) => q.path.endsWith("/submit"))).toBe(false);
  });
});
