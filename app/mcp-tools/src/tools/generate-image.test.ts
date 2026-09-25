import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createHarness, gatewayFor, resultJson, resultText, type Harness } from "../testing/harness.js";
import { startFakeGateway, type FakeGateway } from "../testing/fake-gateway.js";
import { registerGenerateImage } from "./generate-image.js";

// 轮询间隔压到毫秒级，测试不必真等 1s
vi.mock("../run-async.js", async (importOriginal) => {
  const mod = await importOriginal<typeof import("../run-async.js")>();
  return { ...mod, runAsync: (gw: never, kind: never, body: never) => mod.runAsync(gw, kind, body, { pollBaseMs: 5, pollCapMs: 10 }) };
});

let gw: FakeGateway;
let h: Harness;
let taskSeq = 0;
/** 按 task_id 决定查询结果。 */
let queryFor: (taskId: string) => { status?: number; json: unknown };

const SID = "ses_test";

beforeEach(async () => {
  gw = await startFakeGateway();
  taskSeq = 0;
  gw.on("GET", "/api/internal/sessions/billing-current-scope", { json: { mode: "legacy", group_id: null, source: "no_selection" } });
  gw.on("GET", `/api/internal/sessions/${SID}/request-group`, { json: { mode: "legacy", group_id: null, source: "no_selection" } });
  gw.on("POST", "/api/internal/sessions/request-group-diagnostic", { json: { ok: true } });
  gw.on("POST", "/api/generate/image/submit", () => ({
    json: { ok: true, task_id: `t${++taskSeq}`, status: "processing", media_type: "image" },
  }));
  queryFor = (id) => ({ json: { ok: true, task_id: id, status: "succeeded", result: { ok: true, path: `out/${id}.png`, width: 1024, height: 1024, node_id: `n-${id}` } } });
  for (let i = 1; i <= 20; i++) gw.on("GET", `/api/generate/tasks/t${i}/query`, () => queryFor(`t${i}`));
  h = createHarness();
  registerGenerateImage(h.registrar, gatewayFor(gw.url), "domestic");
});

afterEach(async () => {
  await gw.close();
});

const base = { vendor: "gpt-image", vendor_params: { aspect_ratio: "16:9" } };
const submits = () => gw.requests.filter((r) => r.path === "/api/generate/image/submit");

describe("generate_image", () => {
  it("single image: submit body shape and success reply", async () => {
    const r = await h.call("generate_image", { ...base, prompt: "a cat", filename: "cat", order: 3 });
    expect(r.isError).toBeFalsy();
    expect(resultJson(r)).toEqual({ ok: true, path: "out/t1.png", paths: ["out/t1.png"], width: 1024, height: 1024, node_id: "n-t1" });
    const body = submits()[0]?.body as Record<string, unknown>;
    expect(body).toMatchObject({
      backend: "openai",
      model_id: "gpt-image-2.5-sunburst",
      prompt: "a cat",
      image_paths: [],
      filename: "cat",
      source_tool: "hub_generate_image:gpt-image",
      params: { aspect_ratio: "16:9", model_name: "gpt-image-2.5-sunburst", resolution: "1k", quality: "medium", n: "1", order: "3" },
    });
  });

  it("count>1 submits one task per prompt and aggregates results", async () => {
    const r = await h.call("generate_image", {
      ...base,
      count: 3,
      prompts: ["a", "b", "c"],
      filenames: ["fa", "fb", "fc"],
      orders: [1, 2, 3],
    });
    expect(submits()).toHaveLength(3);
    const bodies = submits().map((s) => s.body as { prompt: string; filename: string; params: { order: string } });
    expect(bodies.map((b) => b.prompt).sort()).toEqual(["a", "b", "c"]);
    expect(bodies.map((b) => `${b.filename}:${b.params.order}`).sort()).toEqual(["fa:1", "fb:2", "fc:3"]);
    const out = resultJson<{ ok: boolean; results: { ok: boolean; path: string }[] }>(r);
    expect(out.ok).toBe(true);
    expect(out.results.map((x) => x.path).sort()).toEqual(["out/t1.png", "out/t2.png", "out/t3.png"]);
  });

  it("batch requires aligned prompts/filenames", async () => {
    const r = await h.call("generate_image", { ...base, count: 2, prompt: "x", filename: "y" });
    expect(r.isError).toBe(true);
    expect(resultText(r)).toMatch(/Image batch contract violation: count=2 requires per-output prompts\[\]/);
    expect(submits()).toHaveLength(0);
  });

  it("terminal failure → isError true", async () => {
    queryFor = (id) => ({ json: { ok: false, task_id: id, status: "failed", cloud_terminal: true, error: "blocked", error_code: "content_policy_violation" } });
    const r = await h.call("generate_image", { ...base, prompt: "x", filename: "y" });
    expect(r.isError).toBe(true);
    const out = resultJson(r);
    expect(out).toMatchObject({ ok: false, error_code: "backend_error", failure_presentation: "terminal" });
    expect(out.do_not_resubmit).toBeUndefined();
  });

  it("recoverable failure → isError false + do_not_resubmit", async () => {
    queryFor = () => ({ status: 400, json: { message: "bad" } });
    const r = await h.call("generate_image", { ...base, prompt: "x", filename: "y" });
    expect(r.isError).toBe(false);
    expect(resultJson(r)).toMatchObject({ ok: false, failure_presentation: "recoverable", recovery_handle: "t1", do_not_resubmit: true });
  });

  it("aspect ratio is mandatory and cannot be auto", async () => {
    const r = await h.call("generate_image", { vendor: "banana", vendor_params: { aspect_ratio: "auto" }, prompt: "x", filename: "y" });
    expect(r.isError).toBe(true);
    expect(resultText(r)).toMatch(/concrete vendor_params.aspect_ratio; auto is not allowed/);
  });

  it("refs need aspect_ratio_source; conflicting evidence → image_aspect_ratio_conflict", async () => {
    const noSource = await h.call("generate_image", { ...base, prompt: "x", filename: "y", image_paths: ["https://x/a.png"] });
    expect(resultText(noSource)).toMatch(/aspect_ratio_source/);
    const conflict = await h.call("generate_image", {
      ...base,
      vendor_params: { aspect_ratio: "1:1" },
      prompt: "x",
      filename: "y",
      image_paths: ["https://x/a.png"],
      aspect_ratio_source: "canvas_source",
      aspect_ratio_evidence: { tool: "canvas_get_node", width: 1920, height: 1080 },
    });
    expect(conflict.isError).toBe(true);
    expect(resultJson(conflict)).toMatchObject({ error_code: "image_aspect_ratio_conflict" });
    expect(submits()).toHaveLength(0);
  });

  it("rejects video files in image_paths", async () => {
    const r = await h.call("generate_image", { ...base, prompt: "x", filename: "y", image_paths: ["clip.mp4"], aspect_ratio_source: "explicit_user" });
    expect(resultText(r)).toMatch(/which looks like a video file. generate_image only accepts images as references/);
  });

  it("model_id aliases resolve to canonical ids (banana_pro → nano_banana_2)", async () => {
    await h.call("generate_image", { vendor: "banana", model_id: "banana_pro", vendor_params: { aspect_ratio: "1:1" }, prompt: "x", filename: "y" });
    expect(submits()[0]?.body).toMatchObject({ backend: "nano_banana", model_id: "nano_banana_2", params: { model_name: "nano_banana_2", resolution: "1K" } });
  });

  describe("selected-models guard", () => {
    it("rejects a model the user did not select", async () => {
      gw.on("GET", `/api/internal/sessions/${SID}/selected-models`, { json: { selected: { image: ["g-image-2"] } } });
      const r = await h.call("generate_image", { ...base, model_id: "gpt-image-2.5-flare", prompt: "x", filename: "y", _session_id: SID });
      expect(r.isError).toBe(true);
      expect(resultText(r)).toMatch(/Selected image models do not include model_id=gpt-image-2.5-flare \(vendor=gpt-image\)/);
      expect(submits()).toHaveLength(0);
    });

    it("defaults to the selected model when model_id is omitted", async () => {
      gw.on("GET", `/api/internal/sessions/${SID}/selected-models`, { json: { selected: { image: ["g-image-2"] } } });
      const r = await h.call("generate_image", { ...base, prompt: "x", filename: "y", _session_id: SID });
      expect(r.isError).toBeFalsy();
      expect(submits()[0]?.body).toMatchObject({ model_id: "gpt-image-2" });
      expect(submits()[0]?.headers["x-session-id"]).toBe(SID);
    });

    it("fails open when the lookup errors", async () => {
      gw.on("GET", `/api/internal/sessions/${SID}/selected-models`, { status: 500, json: { message: "boom" } });
      const r = await h.call("generate_image", { ...base, model_id: "gpt-image-2.5-flare", prompt: "x", filename: "y", _session_id: SID });
      expect(r.isError).toBeFalsy();
      expect(submits()).toHaveLength(1);
    });
  });
});
