import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";

import type { INestApplication } from "@nestjs/common";
import sharp from "sharp";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createApp } from "../bootstrap.js";
import { AssetsService } from "../common/assets.service.js";
import { MediaConfigService } from "../generate/media-config.service.js";
import { enhanceSize, PROMPT_MOVE_OBJECT, PROMPT_OUTPAINT, snapAspectRatio, stripBBoxTokens } from "./image-edit.service.js";

const HAS_FFMPEG = spawnSync(process.env.FFMPEG_PATH || "ffmpeg", ["-version"]).status === 0;

/** 假平台：/images/edits 回一张 256×160 的图并记下请求；视频超分任务直接完成。`failNext` 让下一次出图失败。 */
function fakePlatform() {
  const edits: any[] = [];
  const videoJobs: any[] = [];
  let fail = false;
  let videoBytes: Buffer = Buffer.alloc(0);
  const server = createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", async () => {
      res.setHeader("content-type", "application/json");
      if (req.url === "/v1/images/edits" && req.method === "POST") {
        edits.push(JSON.parse(raw));
        if (fail) {
          fail = false;
          res.statusCode = 400;
          return res.end(JSON.stringify({ error: { code: "bad_image", message: "图片内容不合规" } }));
        }
        return res.end(JSON.stringify({ data: [{ url: `http://${req.headers.host}/files/out.png` }] }));
      }
      if (req.url === "/files/out.png") {
        res.setHeader("content-type", "image/png");
        return res.end(await sharp({ create: { width: 256, height: 160, channels: 3, background: "#6a9" } }).png().toBuffer());
      }
      if (req.url === "/v1/videos" && req.method === "POST") {
        videoJobs.push(JSON.parse(raw));
        return res.end(JSON.stringify({ task_id: "vsr-1" }));
      }
      if (req.url === "/v1/videos/vsr-1") return res.end(JSON.stringify({ status: "completed", metadata: { url: `http://${req.headers.host}/files/v.mp4` } }));
      if (req.url === "/files/v.mp4") {
        res.setHeader("content-type", "video/mp4");
        return res.end(videoBytes);
      }
      res.statusCode = 404;
      res.end();
    });
  });
  return { server, edits, videoJobs, failNext: () => (fail = true), setVideo: (b: Buffer) => (videoBytes = b) };
}

describe("画布图片编辑（假平台）", () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;
  let platform: ReturnType<typeof fakePlatform>;
  let server: Server;
  let ws: string;
  let cfgFile: string;
  let base: string;
  let srcNode = "";
  let dataUri = "";

  const writeConfig = (models: Record<string, unknown>) =>
    writeFileSync(cfgFile, JSON.stringify({ platform: { base_url: `${base}/v1`, api_key: "k", chat_model: "chat" }, models }));

  beforeAll(async () => {
    platform = fakePlatform();
    server = platform.server;
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    ws = mkdtempSync(path.join(tmpdir(), "ov-imgedit-"));
    cfgFile = path.join(mkdtempSync(path.join(tmpdir(), "ov-imgedit-cfg-")), "config.json");
    writeConfig({ image: "qwen-image-pro", image_upscale: "swiftvr", video_upscale: "swiftvr" });
    const src = await sharp({ create: { width: 200, height: 100, channels: 3, background: "#f00" } }).png().toBuffer();
    writeFileSync(path.join(ws, "src.png"), src);
    dataUri = `data:image/png;base64,${src.toString("base64")}`;
    process.env.WORKSPACE_DIR = ws;
    process.env.OV_CONFIG_PATH = cfgFile;
    app = await createApp();
    app.get(MediaConfigService).clientOverrides = { sleep: async () => undefined, logger: { info() {}, warn() {} } };
    await app.init();
    http = request(app.getHttpServer());
    await app.get(AssetsService).enroll("src.png");
    srcNode = (await http.post("/api/canvas/media-node").send({ assetPath: "src.png" })).body.nodeId;
  });
  afterAll(async () => {
    await app.close();
    await new Promise<void>((r) => server.close(() => r()));
    delete process.env.WORKSPACE_DIR;
    delete process.env.OV_CONFIG_PATH;
  });
  beforeEach(() => {
    platform.edits.length = 0;
    writeConfig({ image: "qwen-image-pro", image_upscale: "swiftvr", video_upscale: "swiftvr" });
  });

  const canvas = async () => (await http.get("/api/canvas")).body;

  it("扩图：合成好的画布原样发给图片编辑模型（image_edit 没配时用 image），提示词是扩图模板；结果换掉占位卡、连派生边", async () => {
    const r = await http.post("/api/edit/outpaint-banana").send({ image_data_uri: dataUri, resolution: "2K", aspect_ratio: 16 / 9, source_node_id: srcNode, filename: `outpaint-${srcNode}` });
    expect(r.status).toBe(201);
    expect(r.body).toEqual({ ok: true, path: `outpaint-${srcNode}.png`, width: 256, height: 160 });
    expect(platform.edits).toEqual([{ model: "qwen-image-pro", prompt: PROMPT_OUTPAINT, images: [dataUri] }]);
    const row = app.get(AssetsService).byPath(r.body.path)!;
    expect(JSON.parse(row.metadata!)).toMatchObject({ model: "Outpaint", source_tool: "outpaint", reference_images: [app.get(AssetsService).byPath("src.png")!.id] });
    const c = await canvas();
    const node = c.nodes.find((n: any) => n.assetId === row.id);
    expect(node).toMatchObject({ type: "image" });
    expect(c.nodes.some((n: any) => n.type === "placeholder")).toBe(false);
    expect(c.edges).toContainEqual(expect.objectContaining({ source: srcNode, target: node.id }));
  });

  it("重绘：框画成浅绿高亮再发，提示词里的 <bbox> 记号换成文字；带参考图时两张（参考在前）", async () => {
    const r = await http.post("/api/edit/redraw-banana").send({
      model: "seedream_5_pro",
      image_data_uri: dataUri,
      bbox: { x1: 0, y1: 0, x2: 499, y2: 999 },
      reference_image_data_uri: dataUri,
      resolution: "1K",
      prompt: "把 <bbox>0 0 499 999</bbox> 改成一只猫",
      source_node_id: srcNode,
      filename: "redraw-x",
    });
    expect(r.body).toMatchObject({ ok: true, path: "redraw-x.png" });
    const sent = platform.edits[0];
    expect(sent.images).toHaveLength(2);
    expect(sent.images[0]).toBe(dataUri);
    expect(sent.prompt).toContain("as: 把 the highlighted region 改成一只猫");
    expect(sent.prompt).toContain("Image 1 — REFERENCE");
    // 左半边被涂成了浅绿（红 + 半透明浅绿），右半边还是纯红
    const { data, info } = await sharp(Buffer.from(sent.images[1].split(",")[1], "base64")).raw().toBuffer({ resolveWithObject: true });
    const px = (x: number, y: number) => [...data.subarray((y * info.width + x) * info.channels, (y * info.width + x) * info.channels + 3)];
    expect(px(10, 50)[1]).toBeGreaterThan(100);
    expect(px(190, 50)).toEqual([255, 0, 0]);

    // 没有框也没有 <bbox> 记号：400，不调平台
    const bad = await http.post("/api/edit/redraw-banana").send({ image_data_uri: dataUri, resolution: "1K", prompt: "猫" });
    expect(bad.status).toBe(400);
    expect(bad.body).toMatchObject({ ok: false, user_message: expect.any(String) });
    expect(platform.edits).toHaveLength(1);
  });

  it("擦除：多个框都涂上高亮，按重绘模板要求补成干净背景；框全无效 400", async () => {
    const r = await http.post("/api/edit/erase-banana").send({ image_data_uri: dataUri, bboxes: [{ x1: 0, y1: 0, x2: 100, y2: 100 }, { x1: 800, y1: 800, x2: 999, y2: 999 }], resolution: "2K", filename: "erase-x" });
    expect(r.body).toMatchObject({ ok: true, path: "erase-x.png" });
    expect(platform.edits[0].prompt).toContain("Completely remove every object");
    expect(platform.edits[0].images).toHaveLength(1);
    expect((await http.post("/api/edit/erase-banana").send({ image_data_uri: dataUri, bboxes: [{ x1: 5, y1: 5, x2: 5, y2: 9 }], resolution: "2K" })).status).toBe(400);
    expect((await http.post("/api/edit/erase-banana").send({ image_data_uri: dataUri, bboxes: [{ x1: 0, y1: 0, x2: 1000, y2: 9 }], resolution: "2K" })).status).toBe(400);
  });

  it("搬移：[示意图 data URI, 工作区原图] 两张，原图读盘转码；只把原图记为参考", async () => {
    const r = await http.post("/api/edit/move-object-banana").send({ image_paths: [dataUri, "src.png"], resolution: "1K", filename: "move-x" });
    expect(r.body).toMatchObject({ ok: true, path: "move-x.png" });
    expect(platform.edits[0]).toMatchObject({ prompt: PROMPT_MOVE_OBJECT, images: [dataUri, expect.stringMatching(/^data:image\/png;base64,/)] });
    expect(JSON.parse(app.get(AssetsService).byPath("move-x.png")!.metadata!).reference_images).toEqual([app.get(AssetsService).byPath("src.png")!.id]);
    expect((await http.post("/api/edit/move-object-banana").send({ image_paths: [dataUri, "../x.png"], resolution: "1K" })).status).toBe(400);
    expect((await http.post("/api/edit/move-object-banana").send({ image_paths: [dataUri], resolution: "1K" })).status).toBe(400);
  });

  it("平台失败：占位卡标红、回 500 {ok:false, error, user_message}", async () => {
    platform.failNext();
    const r = await http.post("/api/edit/outpaint-banana").send({ image_data_uri: dataUri, resolution: "1K", aspect_ratio: 1, source_node_id: srcNode });
    expect(r.status).toBe(500);
    expect(r.body).toMatchObject({ ok: false, error: expect.stringMatching(/^Outpaint failed: .*图片内容不合规/), user_message: expect.stringContaining("图片内容不合规") });
    const ph = (await canvas()).nodes.find((n: any) => n.type === "placeholder");
    expect(ph.data).toMatchObject({ status: "error", errorMessage: expect.stringContaining("图片内容不合规") });
  });

  it("高清：走图片超分模型，按 target 尺寸发精确 size；skip_canvas_node 不上画布；没配超分模型回能力不可用", async () => {
    const r = await http.post("/api/edit/enhance-image").send({ image_path: "src.png", tool_version: "professional", target_width: 800, target_height: 400, filename: "sr-x", skip_canvas_node: true });
    expect(r.body).toMatchObject({ ok: true, path: "sr-x.png" });
    expect(platform.edits[0]).toMatchObject({ model: "swiftvr", prompt: "upscale", size: "800x400", image: expect.stringMatching(/^data:image\/png/) });
    expect(app.get(AssetsService).byPath("sr-x.png")).toBeUndefined();

    writeConfig({ image: "qwen-image-pro" });
    const off = await http.post("/api/edit/enhance-image").send({ image_path: "src.png", source_node_id: srcNode });
    expect(off.status).toBe(503);
    expect(off.body).toMatchObject({ ok: false, error_code: "CAPABILITY_UNAVAILABLE", user_message: expect.any(String) });
    expect((await canvas()).nodes.filter((n: any) => n.type === "placeholder" && n.data.status === "generating")).toHaveLength(0);
  });

  it.skipIf(!HAS_FFMPEG)("视频高清：走视频超分模型（task_type=sr, 2K）", async () => {
    const mp4 = path.join(ws, "clip.mp4");
    spawnSync(process.env.FFMPEG_PATH || "ffmpeg", ["-y", "-v", "error", "-f", "lavfi", "-i", "testsrc=size=160x120:rate=10:duration=1", "-pix_fmt", "yuv420p", mp4]);
    platform.setVideo(readFileSync(mp4));
    const r = await http.post("/api/edit/hailuo03-video-super-resolution").send({ video_path: "clip.mp4", provider_task_id: "t-1", resolution: "2K", filename: "vsr-x" });
    expect(r.body).toMatchObject({ ok: true, path: "vsr-x.mp4", width: 160, height: 120 });
    expect(platform.videoJobs.at(-1)).toMatchObject({ model: "swiftvr", metadata: { task_type: "sr", resolution: "2K" } });
    expect((await http.post("/api/edit/hailuo03-video-super-resolution").send({ video_path: "clip.mp4", filename: "x" })).status).toBe(400);
  });

  it("平台做不了的：入参照样校验，通过后 503 能力不可用，不建占位卡", async () => {
    const cases: [string, Record<string, unknown>][] = [
      ["asr", { audio_path: "a.mp3" }],
      ["asr-mediakit", { video_path: "a.mp4", filename: "x" }],
      ["asr-whisper", { audio_path: "a.mp3", filename: "x" }],
      ["audio-separate", { audio_path: "a.mp3", filename: "x" }],
      ["enhance-video-mediakit", { video_path: "a.mp4", filename: "x", fps: 60 }],
      ["erase-subtitle-mediakit", { video_path: "a.mp4", filename: "x" }],
      ["layer-decompose", { image_path: "src.png", source_node_id: srcNode }],
      ["lip-sync", { video_path: "a.mp4", audio_path: "a.mp3", filename: "x" }],
      ["remove-background", { image_path: "src.png", source_node_id: srcNode }],
    ];
    const before = (await canvas()).nodes.length;
    for (const [route, body] of cases) {
      const r = await http.post(`/api/edit/${route}`).send(body);
      expect(r.status, route).toBe(503);
      expect(r.body, route).toMatchObject({ ok: false, error: expect.stringContaining("is not available"), user_message: expect.any(String), error_code: "CAPABILITY_UNAVAILABLE" });
    }
    expect((await canvas()).nodes.length).toBe(before);
    expect((await http.post("/api/edit/asr-mediakit").send({ filename: "x" })).status).toBe(400);
    expect((await http.post("/api/edit/enhance-video-mediakit").send({ video_path: "a.mp4", filename: "x", fps: 24 })).status).toBe(400);
    expect((await http.post("/api/edit/lip-sync").send({ video_path: "a.mp4" })).status).toBe(400);
  });
});

describe("图片编辑的小工具", () => {
  it("snapAspectRatio 取最近的常用比例", () => {
    expect(snapAspectRatio(1.7)).toBe("16:9");
    expect(snapAspectRatio(0.8)).toBe("4:5");
    expect(snapAspectRatio(0)).toBeUndefined();
  });
  it("stripBBoxTokens 取出框并换成文字", () => {
    expect(stripBBoxTokens("把<bbox>1 2 3 4</bbox>换成猫")).toEqual({ text: "把the highlighted region换成猫", boxes: [{ x1: 1, y1: 2, x2: 3, y2: 4 }] });
  });
  it("enhanceSize：目标尺寸优先、倍数其次、默认 2 倍；超过 4K 像素等比收回", () => {
    expect(enhanceSize(100, 50, { target_width: 804, target_height: 400 })).toBe("800x400");
    expect(enhanceSize(100, 50, { multiple: 3 })).toBe("296x144");
    expect(enhanceSize(100, 50, {})).toBe("200x96");
    const [w, h] = enhanceSize(3000, 3000, {}).split("x").map(Number);
    expect(w! * h!).toBeLessThanOrEqual(3840 * 2160);
  });
});
