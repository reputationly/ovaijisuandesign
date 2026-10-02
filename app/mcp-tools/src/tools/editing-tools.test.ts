import { fileURLToPath } from "node:url";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { startFakeGateway, type FakeGateway } from "../testing/fake-gateway.js";
import { createHarness, gatewayFor, resultJson, resultText } from "../testing/harness.js";
import { registerEditingTools } from "./editing-tools.js";
import {
  checkFfmpegAudioPreserve,
  checkFfmpegCommand,
  checkFfmpegDrawtext,
  escapeFfmpegFilterValue,
  injectBundledCjkFont,
  isPureAudioReplacementMux,
} from "./ffmpeg-guards.js";

const exists = (set: string[]) => (p: string) => set.includes(p);

describe("drawtext font handling", () => {
  it("injects the bundled font into CJK drawtext without a font", () => {
    const r = injectBundledCjkFont(
      ["-i", "/a.mp4", "-vf", "drawtext=text='你好':x=10,drawtext=text='hi':x=20"],
      "/fonts/Noto:CJK.otf",
      exists(["/fonts/Noto:CJK.otf"]),
    );
    expect(r).toEqual({
      ok: true,
      args: ["-i", "/a.mp4", "-vf", "drawtext=fontfile='/fonts/Noto\\:CJK.otf':text='你好':x=10,drawtext=text='hi':x=20"],
    });
  });

  it("leaves drawtext with an explicit font alone, and skips when no bundled font is configured", () => {
    const withFont = ["-vf", "drawtext=font='Heiti':text='你好'"];
    expect(injectBundledCjkFont(withFont, "/f.otf", () => true)).toEqual({ ok: true, args: withFont });
    const noEnv = ["-vf", "drawtext=text='你好'"];
    expect(injectBundledCjkFont(noEnv, undefined, () => true)).toEqual({ ok: true, args: noEnv });
  });

  it("fails when the configured bundled font is missing", () => {
    const r = injectBundledCjkFont(["-vf", "drawtext=text='你好'"], "/gone.otf", () => false);
    expect(r.ok).toBe(false);
  });

  it("rejects literal \\n in drawtext text and missing fontfiles", () => {
    expect(checkFfmpegDrawtext(["-vf", "drawtext=text='a\\nb'"]).ok).toBe(false);
    const missing = checkFfmpegDrawtext(["-vf", "drawtext=fontfile=/nope.ttf:text=x"], () => false);
    expect(missing.ok).toBe(false);
    expect(checkFfmpegDrawtext(["-vf", "drawtext=fontfile=/ok.ttf:text=x"], exists(["/ok.ttf"])).ok).toBe(true);
  });
});

describe("command and audio guards", () => {
  it("rejects video concat filters and concat inputs, allows audio-only concat and dry-runs", () => {
    expect(checkFfmpegCommand(["-i", "a", "-i", "b", "-filter_complex", "[0:v][1:v]concat=n=2:v=1:a=0[v]"]).ok).toBe(false);
    expect(checkFfmpegCommand(["-f", "concat", "-i", "list.txt"]).ok).toBe(false);
    expect(checkFfmpegCommand(["-i", "concat:a.ts|b.ts"]).ok).toBe(false);
    expect(checkFfmpegCommand(["-i", "a", "-i", "b", "-filter_complex", "[0:a][1:a]concat=n=2:v=0:a=1[a]"]).ok).toBe(true);
    expect(checkFfmpegCommand(["-i", "a", "-filter_complex", "concat=n=2", "-f", "null"]).ok).toBe(true);
    expect(checkFfmpegCommand(["-filter_complex=scale=1:1"]).ok).toBe(false);
    expect(checkFfmpegCommand(["-filter_complex_script", "f.txt"]).ok).toBe(false);
  });

  it("blocks resampling audio concat when metadata promises preserved clip audio", () => {
    const args = [
      "-i", "a.mp4", "-i", "b.mp4",
      "-filter_complex", "[0:a]aresample=48000[a0];[1:a]aresample=48000[a1];[a0][a1]concat=n=2:v=0:a=1[aout]",
      "-map", "[aout]",
    ];
    expect(checkFfmpegAudioPreserve(args, { description: "preserve clip audio" }).ok).toBe(false);
    expect(checkFfmpegAudioPreserve(args, { description: "保留片段原始音频" }).ok).toBe(false);
    expect(checkFfmpegAudioPreserve(args, { description: "new mix" }).ok).toBe(true);
    const intentional = args.map((a) => a.replace("[aout]", "[pre];[pre]loudnorm[aout]"));
    intentional[intentional.length - 1] = "[aout]";
    expect(checkFfmpegAudioPreserve(intentional, { description: "preserve clip audio" }).ok).toBe(true);
  });

  it("detects a pure audio-replacement mux", () => {
    expect(isPureAudioReplacementMux(["-i", "v.mp4", "-i", "s.mp3", "-c:v", "copy"], "video")).toBe(true);
    expect(isPureAudioReplacementMux(["-i", "v.mp4", "-i", "x.mp4", "-map", "0:v", "-map", "1:a", "-c:v", "copy"], "video")).toBe(true);
    expect(isPureAudioReplacementMux(["-i", "v.mp4", "-i", "s.mp3", "-vf", "scale=1:1"], "video")).toBe(false);
    expect(isPureAudioReplacementMux(["-i", "v.mp4", "-i", "s.mp3", "-c:v", "copy"], "audio")).toBe(false);
  });
});

describe("ffmpeg / merge_videos tools", () => {
  let gw: FakeGateway;
  const savedFont = process.env.HILO_BUNDLED_CJK_FONT_PATH;
  beforeEach(async () => {
    gw = await startFakeGateway();
    delete process.env.HILO_BUNDLED_CJK_FONT_PATH;
  });
  afterEach(async () => {
    await gw.close();
    if (savedFont === undefined) delete process.env.HILO_BUNDLED_CJK_FONT_PATH;
    else process.env.HILO_BUNDLED_CJK_FONT_PATH = savedFont;
  });

  function tools() {
    const h = createHarness();
    registerEditingTools(h.registrar, gatewayFor(gw.url), "domestic");
    return h;
  }

  it("posts rewritten args, input paths and metadata; returns the output path", async () => {
    process.env.HILO_BUNDLED_CJK_FONT_PATH = fileURLToPath(import.meta.url); // 任意存在的文件
    gw.on("POST", "/api/edit/ffmpeg", { json: { ok: true, path: "/ws/out/title.mp4" } });
    const r = await tools().call("ffmpeg", {
      args: ["-i", "/abs/in.mp4", "-vf", "drawtext=text='标题'"],
      filename: "title-card",
      metadata: { prompt: "p" },
      _session_id: "s1",
      _tool_use_id: "t1",
    });
    expect(r.isError).toBeFalsy();
    expect(resultJson(r)).toEqual({ path: "/ws/out/title.mp4" });
    const req = gw.requests.find((x) => x.path === "/api/edit/ffmpeg")!;
    const font = escapeFfmpegFilterValue(fileURLToPath(import.meta.url));
    expect(req.body).toEqual({
      args: ["-i", "/abs/in.mp4", "-vf", `drawtext=fontfile='${font}':text='标题'`],
      output_type: "video",
      canvas_target: "new_round",
      target_node_id: undefined,
      input_paths: ["/abs/in.mp4"],
      metadata: { prompt: "p" },
      filename: "title-card",
    });
    expect(req.headers["x-session-id"]).toBe("s1");
    expect(req.headers["x-tool-use-id"]).toBe("t1");
  });

  it("returns probe text for dry-runs", async () => {
    gw.on("POST", "/api/edit/ffmpeg", { json: { ok: true, path: "", _probe: { stdout: "", stderr: "Stream #0:0 Video" } } });
    const r = await tools().call("ffmpeg", { args: ["-i", "/abs/in.mp4", "-f", "null"], filename: "x" });
    expect(resultText(r)).toBe("Stream #0:0 Video");
    expect(r.structuredContent).toEqual({ probe: "Stream #0:0 Video" });
  });

  it("defaults to new_round and forwards target_node_id / input_node_ids", async () => {
    gw.on("POST", "/api/edit/ffmpeg", { json: { ok: true, path: "/o.mp4", node_id: "n9" } });
    const ok = await tools().call("ffmpeg", {
      args: ["-i", "/v.mp4", "-i", "/s.mp3", "-c:v", "copy"],
      filename: "x",
      input_node_ids: ["nv", ""],
      target_node_id: "n1",
    });
    expect(ok.isError).toBeFalsy();
    expect(resultJson(ok)).toEqual({ path: "/o.mp4", node_id: "n9" });
    expect(gw.requests[0]!.body).toMatchObject({
      canvas_target: "new_round",
      target_node_id: "n1",
      input_node_ids: ["nv", ""],
    });
  });

  it("omits input_node_ids when not supplied, and honours new_node", async () => {
    gw.on("POST", "/api/edit/ffmpeg", { json: { ok: true, path: "/o.mp4" } });
    await tools().call("ffmpeg", { args: ["-i", "/v.mp4"], filename: "x", canvas_target: "new_node" });
    const body = gw.requests[0]!.body as Record<string, unknown>;
    expect(body.canvas_target).toBe("new_node");
    expect(body).not.toHaveProperty("input_node_ids");
  });

  it("surfaces gateway failures as Error text", async () => {
    gw.on("POST", "/api/edit/ffmpeg", { status: 400, json: { message: "bad encoder" } });
    const r = await tools().call("ffmpeg", { args: ["-i", "/a.mp4"], filename: "x" });
    expect(r.isError).toBe(true);
    expect(resultText(r)).toBe("Error: bad encoder");
  });

  it("merge_videos posts the ordered paths and scale settings", async () => {
    gw.on("POST", "/api/edit/concatenate-videos", { json: { ok: true, path: "/ws/merged.mp4" } });
    const r = await tools().call("merge_videos", {
      video_paths: ["/a.mp4", "/b.mp4"],
      filename: "full-cut",
      scale_mode: "custom",
      target_width: 1280,
      target_height: 720,
      source_node_id: "n9",
    });
    expect(resultJson(r)).toEqual({ path: "/ws/merged.mp4" });
    expect(gw.requests[0]!.body).toEqual({
      video_paths: ["/a.mp4", "/b.mp4"],
      filename: "full-cut",
      source_node_id: "n9",
      scale_mode: "custom",
      target_width: 1280,
      target_height: 720,
    });
  });

  it("merge_videos requires at least two clips and defaults scale_mode to first", async () => {
    await expect(tools().call("merge_videos", { video_paths: ["/a.mp4"], filename: "x" })).rejects.toThrow();
    gw.on("POST", "/api/edit/concatenate-videos", { json: { ok: true, path: "/m.mp4" } });
    await tools().call("merge_videos", { video_paths: ["/a.mp4", "/b.mp4"], filename: "x" });
    expect((gw.requests[0]!.body as Record<string, unknown>).scale_mode).toBe("first");
  });
});
