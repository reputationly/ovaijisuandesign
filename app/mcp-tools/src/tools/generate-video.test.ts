import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createHarness, gatewayFor, resultJson, resultText, type Harness } from "../testing/harness.js";
import { startFakeGateway, type FakeGateway } from "../testing/fake-gateway.js";
import { registerGenerateVideo } from "./generate-video.js";
import { buildVideoBody, type VideoArgs } from "./video-body.js";

vi.mock("../run-async.js", async (importOriginal) => {
  const mod = await importOriginal<typeof import("../run-async.js")>();
  return { ...mod, runAsync: (gw: never, kind: never, body: never) => mod.runAsync(gw, kind, body, { pollBaseMs: 5, pollCapMs: 10 }) };
});

const v = (a: Partial<VideoArgs>): VideoArgs => ({ vendor: "seedance", mode: "t2v", prompt: "p", filename: "f", ...a }) as VideoArgs;

describe("video submit body", () => {
  it("seedance multimodal packs references as JSON array params", async () => {
    const b = await buildVideoBody(
      v({ mode: "multimodal", vendor_params: { aspect_ratio: "9:16" }, reference_image_paths: ["a.png"], reference_audio_urls: ["b.mp3"] }),
      "domestic",
    );
    expect(b.body).toEqual({
      backend: "seedance",
      model_id: "seedance2.0",
      prompt: "p",
      filename: "f",
      image_paths: [],
      params: {
        model_name: "seedance2.0",
        duration: "5",
        resolution: "720p",
        generate_audio: "true",
        aspect_ratio: "9:16",
        reference_images: JSON.stringify(["a.png"]),
        reference_audios: JSON.stringify(["b.mp3"]),
      },
      source_tool: "hub_generate_video:seedance:multimodal",
    });
  });

  it("seedance t2v requires a fixed aspect ratio", async () => {
    expect((await buildVideoBody(v({}), "domestic")).error).toMatch(/fixed vendor_params.aspect_ratio/);
  });

  it("H3 i2v forces adaptive and uses frame image_mode", async () => {
    const b = await buildVideoBody(v({ vendor: "MiniMax", mode: "i2v", first_frame_image: "f.png" }), "domestic");
    expect(b.body?.image_paths).toEqual(["f.png"]);
    expect(b.body?.params).toMatchObject({ aspect_ratio: "adaptive", image_mode: "first-last-frame", resolution: "768P" });
  });

  it("kling avatar routes to its own backend", async () => {
    const b = await buildVideoBody(v({ vendor: "kling", mode: "avatar", audio_path: "a.mp3", first_frame_image: "f.png" }), "domestic");
    expect(b.body).toMatchObject({ backend: "kling_avatar", model_id: "kling-avatar", params: { mode: "std", type: "avatar", sound_file: "a.mp3" } });
  });

  it("veo alias beta_fast resolves to the canonical model", async () => {
    const b = await buildVideoBody(v({ vendor: "veo3", model_id: "beta_fast" }), "domestic");
    expect(b.body).toMatchObject({ model_id: "veo-3.1-fast-generate-001", params: { duration: "8", aspect_ratio: "16:9" } });
  });

  it("wan requires explicit duration when a reference video is attached", async () => {
    const b = await buildVideoBody(v({ vendor: "wan", mode: "multimodal", reference_video_urls: ["c.mp4"] }), "domestic");
    expect(b.error).toMatch(/explicit duration/);
  });

  it("rejects unsupported modes", async () => {
    expect((await buildVideoBody(v({ vendor: "veo3", mode: "multimodal" }), "domestic")).error).toMatch(/has no mode=multimodal/);
  });
});

describe("generate_video tool", () => {
  let gw: FakeGateway;
  let h: Harness;
  beforeEach(async () => {
    gw = await startFakeGateway();
    gw.on("GET", "/api/internal/sessions/billing-current-scope", { json: { mode: "legacy", group_id: null, source: "no_selection" } });
    gw.on("POST", "/api/generate/video/submit", { json: { ok: true, task_id: "v1", status: "processing", media_type: "video" } });
    gw.on("GET", "/api/generate/tasks/v1/query", {
      json: { ok: true, task_id: "v1", status: "succeeded", result: { ok: true, path: "out/v.mp4", duration: 5, node_id: "n1" } },
    });
    h = createHarness();
    registerGenerateVideo(h.registrar, gatewayFor(gw.url), "domestic");
  });
  afterEach(async () => {
    await gw.close();
  });

  it("submits and returns path + effective params, with params.order", async () => {
    const r = await h.call("generate_video", { vendor: "seedance", mode: "t2v", prompt: "p", filename: "f", vendor_params: { aspect_ratio: "16:9" }, order: 2 });
    const out = resultJson<{ ok: boolean; path: string; effective_params: Record<string, string> }>(r);
    expect(out).toMatchObject({ ok: true, path: "out/v.mp4", duration: 5, node_id: "n1" });
    expect(out.effective_params.order).toBeUndefined();
    const submit = gw.requests.find((q) => q.path === "/api/generate/video/submit");
    expect((submit?.body as { params: Record<string, string> }).params.order).toBe("2");
  });

  it("rejects vendor knobs at the top level", async () => {
    const r = await h.call("generate_video", { vendor: "seedance", mode: "t2v", prompt: "p", filename: "f", aspect_ratio: "16:9" });
    expect(r.isError).toBe(true);
    expect(resultText(r)).toMatch(/are vendor settings/);
  });

  it("rejects keyframes combined with reference media", async () => {
    const r = await h.call("generate_video", {
      vendor: "seedance",
      mode: "i2v",
      prompt: "p",
      filename: "f",
      first_frame_image: "a.png",
      reference_image_paths: ["b.png"],
    });
    expect(resultText(r)).toMatch(/mutually exclusive/);
  });
});
