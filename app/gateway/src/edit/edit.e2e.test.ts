import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";

import type { INestApplication } from "@nestjs/common";
import sharp from "sharp";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../bootstrap.js";
import { AssetsService } from "../common/assets.service.js";
import { GatewayEventBus } from "../common/gateway-event-bus.js";
import { MediaConfigService } from "../generate/media-config.service.js";

const FFMPEG = process.env.FFMPEG_PATH || "ffmpeg";
const FFPROBE = process.env.FFPROBE_PATH || "ffprobe";
const HAS_FFMPEG = spawnSync(FFMPEG, ["-version"]).status === 0 && spawnSync(FFPROBE, ["-version"]).status === 0;

const PNG = Buffer.from(
  "89504e470d0a1a0a0000000d4948445200000001000000010806000000" +
    "1f15c4890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082",
  "hex",
);

/** 用 lavfi 造一段小视频：彩条 + 可选的正弦音。 */
function makeVideo(file: string, o: { w: number; h: number; dur: number; audio: boolean }) {
  const args = ["-y", "-v", "error", "-f", "lavfi", "-i", `testsrc=size=${o.w}x${o.h}:rate=10:duration=${o.dur}`];
  if (o.audio) args.push("-f", "lavfi", "-i", `sine=frequency=440:duration=${o.dur}`);
  args.push("-c:v", "libx264", "-pix_fmt", "yuv420p");
  if (o.audio) args.push("-c:a", "aac", "-shortest");
  args.push(file);
  const r = spawnSync(FFMPEG, args);
  if (r.status !== 0) throw new Error(`makeVideo failed: ${r.stderr}`);
}

function probe(file: string): { width?: number; height?: number; hasAudio: boolean; duration: number } {
  const r = spawnSync(FFPROBE, ["-v", "quiet", "-show_streams", "-show_format", "-of", "json", file]);
  const j = JSON.parse(r.stdout.toString()) as { streams: any[]; format: any };
  const v = j.streams.find((s) => s.codec_type === "video");
  return { width: v?.width, height: v?.height, hasAudio: j.streams.some((s) => s.codec_type === "audio"), duration: Number(j.format.duration) };
}

/** 假平台：对话（记下请求体）、图片超分（按请求的 size 回一张同尺寸的图）、视频超分（回工作区里的 b.mp4）。 */
function fakePlatform(videoBytes: () => Buffer = () => Buffer.alloc(0)) {
  const calls: any[] = [];
  const edits: any[] = [];
  const videoJobs: any[] = [];
  let reply = "一只橘猫坐在窗台上";
  const server = createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", async () => {
      res.setHeader("content-type", "application/json");
      if (req.url === "/v1/chat/completions" && req.method === "POST") {
        calls.push(JSON.parse(raw));
        return res.end(JSON.stringify({ choices: [{ message: { role: "assistant", content: reply }, finish_reason: "stop" }] }));
      }
      if (req.url === "/v1/videos" && req.method === "POST") {
        videoJobs.push(JSON.parse(raw));
        return res.end(JSON.stringify({ task_id: `sr-${videoJobs.length}` }));
      }
      if (/^\/v1\/videos\/sr-\d+$/.test(req.url ?? "")) {
        return res.end(JSON.stringify({ status: "completed", metadata: { url: `http://${req.headers.host}/files/sr.mp4` } }));
      }
      if (req.url === "/files/sr.mp4") {
        res.setHeader("content-type", "video/mp4");
        return res.end(videoBytes());
      }
      if (req.url === "/v1/images/edits" && req.method === "POST") {
        const body = JSON.parse(raw);
        edits.push(body);
        return res.end(JSON.stringify({ data: [{ url: `http://${req.headers.host}/files/hd-${body.size}.png` }] }));
      }
      const m = /^\/files\/hd-(\d+)x(\d+)\.png$/.exec(req.url ?? "");
      if (m) {
        const png = await sharp({ create: { width: Number(m[1]), height: Number(m[2]), channels: 3, background: "#c96" } }).png().toBuffer();
        res.setHeader("content-type", "image/png");
        return res.end(png);
      }
      res.statusCode = 404;
      res.end();
    });
  });
  return { server, calls, edits, videoJobs, setReply: (s: string) => (reply = s) };
}

describe("edit（真实工作区 + 假平台）", () => {
  let app: INestApplication;
  let ws: string;
  let http: ReturnType<typeof request>;
  let platform: ReturnType<typeof fakePlatform>;
  let server: Server;
  const events: any[] = [];
  const abs = (rel: string) => path.join(ws, rel);

  beforeAll(async () => {
    platform = fakePlatform(() => readFileSync(abs("b.mp4")));
    server = platform.server;
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    ws = mkdtempSync(path.join(tmpdir(), "ov-edit-e2e-"));
    const cfg = path.join(mkdtempSync(path.join(tmpdir(), "ov-edit-cfg-")), "config.json");
    writeFileSync(cfg, JSON.stringify({ platform: { base_url: `${base}/v1`, api_key: "k", chat_model: "vision-chat" }, models: { image_upscale: "swiftvr", video_upscale: "swiftvr-video" } }));
    process.env.WORKSPACE_DIR = ws;
    process.env.OV_CONFIG_PATH = cfg;
    app = await createApp();
    app.get(MediaConfigService).clientOverrides = { sleep: async () => undefined, logger: { info() {}, warn() {} } };
    await app.init();
    http = request(app.getHttpServer());
    app.get(GatewayEventBus).subscribe((m) => events.push(m.payload));
    if (HAS_FFMPEG) {
      makeVideo(abs("a.mp4"), { w: 320, h: 240, dur: 1, audio: true });
      makeVideo(abs("b.mp4"), { w: 160, h: 120, dur: 1, audio: false });
      makeVideo(abs("c.mp4"), { w: 320, h: 240, dur: 1, audio: true });
    }
  });
  afterAll(async () => {
    await app.close();
    await new Promise<void>((r) => server.close(() => r()));
    delete process.env.WORKSPACE_DIR;
    delete process.env.OV_CONFIG_PATH;
  });

  async function place(rel: string): Promise<string> {
    await app.get(AssetsService).enroll(rel);
    const r = await http.post("/api/canvas/media-node").send({ assetPath: rel });
    return r.body.nodeId as string;
  }

  // ---------------------------------------------------------------------------
  // ffmpeg
  // ---------------------------------------------------------------------------

  it("ffmpeg：输入必须在工作区内（工作区外 / 越界 / 网络协议 / 不存在都拒绝，不跑 ffmpeg）", async () => {
    const run = (args: string[]) => http.post("/api/edit/ffmpeg").send({ args, filename: "x" });
    expect((await run(["-i", "/etc/hosts", "-c", "copy"])).body).toMatchObject({ ok: false, error: expect.stringMatching(/outside the workspace/) });
    expect((await run(["-i", "../escape.mp4"])).body).toMatchObject({ ok: false, error: expect.stringMatching(/outside the workspace/) });
    expect((await run(["-i", "https://example.com/a.mp4"])).body).toMatchObject({ ok: false, error: expect.stringMatching(/non-file protocol/) });
    expect((await run(["-i", "missing.mp4"])).body).toMatchObject({ ok: false, error: expect.stringMatching(/not found/) });
    expect((await run(["-f", "lavfi", "-i", "movie=/etc/hosts"])).body).toMatchObject({ ok: false, error: expect.stringMatching(/movie/) });
    // 视频拼接要走 merge_videos
    const concat = await run(["-i", "a.mp4", "-i", "c.mp4", "-filter_complex", "[0:v][1:v]concat=n=2:v=1[v]"]);
    expect(concat.body).toMatchObject({ ok: false, error: expect.stringMatching(/merge_videos/) });
    // DTO：filename 必填、output_type 枚举
    expect((await http.post("/api/edit/ffmpeg").send({ args: ["-i", "a.mp4"] })).status).toBe(400);
    expect((await http.post("/api/edit/ffmpeg").send({ args: ["-i", "a.mp4"], filename: "x", output_type: "gif" })).status).toBe(400);
  });

  let aNode = "";
  it.skipIf(!HAS_FFMPEG)("ffmpeg：产物落在根目录、登记入库、从输入节点连派生边；重名加 _1", async () => {
    aNode = await place("a.mp4");
    const r = await http
      .post("/api/edit/ffmpeg")
      .set("x-session-id", "ses-1")
      .send({ args: ["-i", abs("a.mp4"), "-t", "0.5", "-c:v", "libx264", "-c:a", "aac", "out.mp4"], filename: "trimmed", input_paths: [abs("a.mp4")], metadata: { prompt: "裁半秒" } });
    expect(r.status).toBe(201);
    expect(r.body).toEqual({ ok: true, path: "trimmed.mp4" });
    expect(statSync(abs("trimmed.mp4")).size).toBeGreaterThan(0);
    const row = app.get(AssetsService).byPath("trimmed.mp4")!;
    const meta = JSON.parse(row.metadata!);
    expect(meta).toMatchObject({ prompt: "裁半秒", session_id: "ses-1", reference_images: [app.get(AssetsService).byPath("a.mp4")!.id] });
    const c = (await http.get("/api/canvas")).body;
    const node = c.nodes.find((n: any) => n.assetId === row.id);
    expect(node).toMatchObject({ type: "video", data: { prompt: "裁半秒" } });
    expect(c.edges).toContainEqual(expect.objectContaining({ source: aNode, target: node.id, type: "derivation" }));
    expect(events.at(-1)).toMatchObject({ type: "canvas_updated", addedNodes: [{ id: node.id }] });

    const again = await http.post("/api/edit/ffmpeg").send({ args: ["-i", "a.mp4", "-t", "0.5"], filename: "trimmed" });
    expect(again.body).toEqual({ ok: true, path: "trimmed_1.mp4" });
  });

  it.skipIf(!HAS_FFMPEG)("ffmpeg：-f null 是探测，回 _probe 不产出文件；音频输出按编码定扩展名", async () => {
    const r = await http.post("/api/edit/ffmpeg").send({ args: ["-i", abs("a.mp4"), "-f", "null"], filename: "ignored" });
    expect(r.body).toMatchObject({ ok: true, path: "", _probe: { stdout: expect.any(String), stderr: expect.stringContaining("Stream #0") } });
    expect(existsSync(abs("ignored.mp4"))).toBe(false);

    const wav = await http.post("/api/edit/ffmpeg").send({ args: ["-i", "a.mp4", "-vn", "-c:a", "pcm_s16le"], filename: "tone", output_type: "audio" });
    expect(wav.body).toEqual({ ok: true, path: "tone.wav" });
    const bad = await http.post("/api/edit/ffmpeg").send({ args: ["-i", "a.mp4", "-c:a", "pcm_s16le"], filename: "bad" });
    expect(bad.body).toMatchObject({ ok: false, error: expect.stringMatching(/Incompatible/) });
    // ffmpeg 自己失败：占位文件要删掉
    const fail = await http.post("/api/edit/ffmpeg").send({ args: ["-i", "a.mp4", "-c:v", "no-such-codec"], filename: "broken" });
    expect(fail.body).toMatchObject({ ok: false, error: expect.stringMatching(/^ffmpeg failed/) });
    expect(existsSync(abs("broken.mp4"))).toBe(false);
  });

  it.skipIf(!HAS_FFMPEG)("ffmpeg：replace_node_id 原地替换；preserve_source_canvas_node 改为另放并连边", async () => {
    const target = await place("c.mp4");
    const before = (await http.get("/api/canvas")).body.nodes.length;
    const r = await http.post("/api/edit/ffmpeg").send({ args: ["-i", "c.mp4", "-t", "0.5"], filename: "final", replace_node_id: target });
    expect(r.body.ok).toBe(true);
    const c = (await http.get("/api/canvas")).body;
    expect(c.nodes.length).toBe(before);
    expect(c.nodes.find((n: any) => n.id === target).assetId).toBe(app.get(AssetsService).byPath("final.mp4")!.id);

    const keep = await http.post("/api/edit/ffmpeg").send({ args: ["-i", "c.mp4", "-t", "0.5"], filename: "both", replace_node_id: target, preserve_source_canvas_node: true });
    const c2 = (await http.get("/api/canvas")).body;
    expect(c2.nodes.length).toBe(before + 1);
    const both = c2.nodes.find((n: any) => n.assetId === app.get(AssetsService).byPath(keep.body.path)!.id);
    expect(c2.edges).toContainEqual(expect.objectContaining({ source: target, target: both.id }));
  });

  // ---------------------------------------------------------------------------
  // 拼接 / 音轨
  // ---------------------------------------------------------------------------

  it("concatenate：路径越界 400；少于两段 400", async () => {
    expect((await http.post("/api/edit/concatenate-videos").send({ video_paths: ["../x.mp4", "a.mp4"] })).status).toBe(400);
    expect((await http.post("/api/edit/concatenate-videos").send({ video_paths: ["a.mp4"] })).status).toBe(400);
    expect((await http.post("/api/edit/concatenate-videos").send({ video_paths: ["a.mp4", "b.mp4"], scale_mode: "stretch" })).status).toBe(400);
  });

  it.skipIf(!HAS_FFMPEG)("concatenate：分辨率一致直接拼；不一致按 first 缩放并给无声段补静音", async () => {
    const same = await http.post("/api/edit/concatenate-videos").send({ video_paths: ["a.mp4", abs("c.mp4")], filename: "same" });
    expect(same.body).toEqual({ ok: true, path: "same.mp4" });
    expect(probe(abs("same.mp4"))).toMatchObject({ width: 320, height: 240, hasAudio: true });
    expect(probe(abs("same.mp4")).duration).toBeGreaterThan(1.8);

    const mixed = await http.post("/api/edit/concatenate-videos").send({ video_paths: ["b.mp4", "a.mp4"], filename: "mixed", source_node_id: aNode });
    expect(mixed.body).toEqual({ ok: true, path: "mixed.mp4" });
    const p = probe(abs("mixed.mp4"));
    expect(p).toMatchObject({ width: 160, height: 120, hasAudio: true });
    const c = (await http.get("/api/canvas")).body;
    const node = c.nodes.find((n: any) => n.assetId === app.get(AssetsService).byPath("mixed.mp4")!.id);
    expect(c.edges).toContainEqual(expect.objectContaining({ source: aNode, target: node.id }));

    const custom = await http.post("/api/edit/concatenate-videos").send({ video_paths: ["b.mp4", "a.mp4"], filename: "custom", scale_mode: "custom", target_width: 200, target_height: 100 });
    expect(custom.body.ok).toBe(true);
    expect(probe(abs(custom.body.path))).toMatchObject({ width: 200, height: 100 });
  });

  it.skipIf(!HAS_FFMPEG)("extract-audio 拆出音频和静音视频；没音轨的视频报 Video has no audio track", async () => {
    const r = await http.post("/api/edit/extract-audio").send({ video_path: "a.mp4" });
    expect(r.body).toEqual({ ok: true, path: "a-audio.mp3" });
    expect(probe(abs("a-muted.mp4")).hasAudio).toBe(false);
    expect(app.get(AssetsService).byPath("a-muted.mp4")).toBeDefined();
    expect((await http.post("/api/edit/extract-audio").send({ video_path: "b.mp4" })).body).toEqual({ ok: false, error: "Video has no audio track" });
  });

  it.skipIf(!HAS_FFMPEG)("embed-audio：无声视频配上音轨", async () => {
    const r = await http.post("/api/edit/embed-audio").send({ video_path: "b.mp4", audio_path: "a-audio.mp3", filename: "b-with-audio" });
    expect(r.body).toEqual({ ok: true, path: "b-with-audio.mp4" });
    expect(probe(abs("b-with-audio.mp4")).hasAudio).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // 视频 / 音频缩略图
  // ---------------------------------------------------------------------------

  it.skipIf(!HAS_FFMPEG)("thumbnail：视频抽帧按 w 缩放并缓存；音频画波形；坏文件回占位图", async () => {
    const jpeg = (r: request.Response) => sharp(r.body as Buffer).metadata();
    const v = await http.get("/api/thumbnail/a.mp4?w=160").buffer(true);
    expect(v.status).toBe(200);
    expect(v.headers["content-type"]).toMatch(/image\/jpeg/);
    expect(await jpeg(v)).toMatchObject({ format: "jpeg", width: 160, height: 120 });
    const cached = readdirSync(abs(".hilo/.thumbnails")).filter((f) => f.endsWith(".jpg"));
    expect(cached).toHaveLength(1);
    await http.get("/api/thumbnail/a.mp4?w=160");
    expect(readdirSync(abs(".hilo/.thumbnails")).filter((f) => f.endsWith(".jpg"))).toEqual(cached);

    spawnSync(FFMPEG, ["-y", "-v", "error", "-f", "lavfi", "-i", "sine=frequency=440:duration=1", abs("tone.mp3")]);
    expect(await jpeg(await http.get("/api/thumbnail/tone.mp3").buffer(true))).toMatchObject({ width: 320, height: 180 });

    writeFileSync(abs("broken.mp4"), "not a video");
    const broken = await http.get("/api/thumbnail/broken.mp4").buffer(true);
    expect(broken.status).toBe(200);
    expect(await jpeg(broken)).toMatchObject({ width: 320, height: 180 });
  });

  it("thumbnail：不是视频 / 音频 400，不存在 404，越界 400", async () => {
    writeFileSync(abs("pic.png"), PNG);
    expect((await http.get("/api/thumbnail/pic.png")).body.message).toBe("Unsupported file type for thumbnail: png");
    expect((await http.get("/api/thumbnail/ghost.mp4")).status).toBe(404);
    expect((await http.get("/api/thumbnail/%E0%A4%A")).status).toBe(400);
  });

  // ---------------------------------------------------------------------------
  // 超分
  // ---------------------------------------------------------------------------

  it("super-resolution：按源图实际像素算 size，出新图并从源节点连边，只回 {ok, path}", async () => {
    await sharp({ create: { width: 416, height: 232, channels: 3, background: "#369" } }).png().toFile(abs("小图.png"));
    const src = await place("小图.png");
    const r = await http.post("/api/edit/super-resolution").send({ image_path: "小图.png", resolution: "2k", filename: "小图-高清", source_node_id: src });
    expect(r.status).toBe(201);
    expect(r.body).toEqual({ ok: true, path: "小图-高清.png" });
    const sent = platform.edits.at(-1);
    expect(sent).toMatchObject({ model: "swiftvr", size: "2048x1144" });
    expect(sent.image).toMatch(/^data:image\/png;base64,/);
    expect(existsSync(abs("小图.png"))).toBe(true);
    const asset = (await http.get("/api/assets")).body.assets.find((a: any) => a.path === "小图-高清.png");
    expect(asset).toMatchObject({ width: 2048, height: 1144 });
    const canvas = (await http.get("/api/canvas")).body;
    const out = canvas.nodes.find((n: any) => n.assetId === asset.id);
    expect(canvas.edges.some((e: any) => e.source === src && e.target === out.id)).toBe(true);
  });

  it("super-resolution：EXIF 竖拍按显示方向量；4K 方图按总像素收", async () => {
    // 存成 300x200、orientation=6，显示出来是 200x300 的竖图。
    await sharp({ create: { width: 300, height: 200, channels: 3, background: "#963" } }).withMetadata({ orientation: 6 }).jpeg().toFile(abs("竖拍.jpg"));
    const r = await http.post("/api/edit/super-resolution").send({ image_path: "竖拍.jpg", resolution: "1K", filename: "竖拍-1k" });
    expect(r.body.ok).toBe(true);
    expect(platform.edits.at(-1).size).toBe("680x1024");
    await sharp({ create: { width: 464, height: 464, channels: 3, background: "#396" } }).png().toFile(abs("方图.png"));
    const sq = await http.post("/api/edit/super-resolution").send({ image_path: "方图.png", resolution: "4K", filename: "方图-4k" });
    expect(sq.body.ok).toBe(true);
    const [w, h] = String(platform.edits.at(-1).size).split("x").map(Number);
    expect(w! * h!).toBeLessThanOrEqual(3840 * 2160 * 1.01);
  });

  it("super-resolution：已经够大、不是图片都不打平台，失败文案统一前缀；越界 400", async () => {
    await sharp({ create: { width: 2400, height: 1600, channels: 3, background: "#000" } }).png().toFile(abs("大图.png"));
    const before = platform.edits.length;
    expect((await http.post("/api/edit/super-resolution").send({ image_path: "大图.png", resolution: "2K", filename: "x" })).body).toEqual({
      ok: false,
      error: "Super resolution failed: image is already 2400x1600, at or above 2K; nothing to upscale.",
    });
    writeFileSync(abs("notes.txt"), "x");
    expect((await http.post("/api/edit/super-resolution").send({ image_path: "notes.txt", resolution: "2K", filename: "x" })).body).toMatchObject({
      ok: false,
      error: expect.stringMatching(/^Super resolution failed: not an image/),
    });
    expect((await http.post("/api/edit/super-resolution").send({ image_path: "../x.png", resolution: "2K", filename: "x" })).status).toBe(400);
    expect(platform.edits.length).toBe(before);
  });

  it("super-resolution：请求体按参照校验（resolution / filename 必填，image_path 与 video_path 至少一个，不认识的字段 400）", async () => {
    const post = (b: object) => http.post("/api/edit/super-resolution").send(b);
    expect((await post({ image_path: "小图.png", filename: "x" })).status).toBe(400);
    expect((await post({ image_path: "小图.png", resolution: "2K" })).status).toBe(400);
    expect((await post({ resolution: "2K", filename: "x" })).status).toBe(400);
    expect((await post({ image_path: "小图.png", resolution: "2K", filename: "x", replace_node_id: "n" })).status).toBe(400);
  });

  it.skipIf(!HAS_FFMPEG)("super-resolution：视频把档位词交给平台的 sr 任务，结果登记为视频", async () => {
    const src = await place("b.mp4");
    const r = await http.post("/api/edit/super-resolution").send({ video_path: "b.mp4", resolution: "4K", filename: "b-4k", source_node_id: src });
    expect(r.body).toEqual({ ok: true, path: "b-4k.mp4" });
    expect(platform.videoJobs.at(-1)).toMatchObject({ model: "swiftvr-video", metadata: { task_type: "sr", resolution: "4K" } });
    const canvas = (await http.get("/api/canvas")).body;
    expect(canvas.edges.some((e: any) => e.source === src && canvas.nodes.some((n: any) => n.id === e.target && n.type === "video"))).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // 多模态 / 文本
  // ---------------------------------------------------------------------------

  it("analyze-media：图片以 data URI 发给平台的对话模型", async () => {
    writeFileSync(abs("cat.png"), PNG);
    const r = await http.post("/api/edit/analyze-media").send({ file_path: "cat.png", question: "画面里有什么？" });
    expect(r.status).toBe(201);
    expect(r.body).toEqual({ ok: true, text: "一只橘猫坐在窗台上" });
    const body = platform.calls.at(-1);
    expect(body.model).toBe("vision-chat");
    const content = body.messages[0].content;
    expect(content[0]).toEqual({ type: "text", text: "画面里有什么？" });
    expect(content[1].image_url.url).toMatch(/^data:image\/png;base64,/);
  });

  it.skipIf(!HAS_FFMPEG)("analyze-media：视频按时长抽帧", async () => {
    const r = await http.post("/api/edit/analyze-media").send({ file_path: abs("a.mp4"), question: "发生了什么？" });
    expect(r.body.ok).toBe(true);
    const content = platform.calls.at(-1).messages[0].content;
    expect(content[0].text).toMatch(/frames sampled in order/);
    expect(content[0].text).toMatch(/发生了什么？$/);
    expect(content.slice(1).length).toBeGreaterThanOrEqual(1);
    expect(content[1].image_url.url).toMatch(/^data:image\/jpeg;base64,/);
  });

  it("analyze-media：音频 / 不认识的类型 / 不存在 / 越界都回 ok:false", async () => {
    writeFileSync(abs("voice.mp3"), Buffer.from("ID3"));
    writeFileSync(abs("notes.xyz"), "x");
    const post = (file_path: string) => http.post("/api/edit/analyze-media").send({ file_path, question: "?" });
    expect((await post("voice.mp3")).body).toMatchObject({ ok: false, error: expect.stringMatching(/Audio analysis is not supported/) });
    expect((await post("notes.xyz")).body).toMatchObject({ ok: false, error: expect.stringMatching(/Unsupported media type/) });
    expect((await post("ghost.png")).body).toMatchObject({ ok: false, error: expect.stringMatching(/^File not found at: /) });
    expect((await post("../x.png")).body).toMatchObject({ ok: false, error: expect.stringMatching(/Path traversal/) });
  });

  it("generate-text-messages：转成单条 user 消息，用配置里的对话模型，预算有下限", async () => {
    platform.setReply('{"selected":true,"recipe_id":"poster"}');
    const r = await http.post("/api/edit/generate-text-messages").send({ model: "some-cloud-model", max_tokens: 128, prompt: "分类：做一张海报" });
    expect(r.body).toEqual({ ok: true, text: '{"selected":true,"recipe_id":"poster"}' });
    const body = platform.calls.at(-1);
    expect(body).toMatchObject({ model: "vision-chat", messages: [{ role: "user", content: "分类：做一张海报" }] });
    expect(body.max_tokens).toBeGreaterThanOrEqual(1024);
    expect((await http.post("/api/edit/generate-text-messages").send({ model: "m", prompt: "x", max_tokens: 9999 })).status).toBe(400);
  });

  it("/api/generate/text：画布来源才受理，结果写进新建的文本节点，从来源连边", async () => {
    platform.setReply("# 夜猫\n\n一只在窗台上看月亮的猫。");
    const src = await place("cat.png");
    const canvasHeaders = { "x-hilo-source": "canvas" };
    const r = await http
      .post("/api/generate/text")
      .set(canvasHeaders)
      .send({ model_id: "vision-chat", prompt: "给这张图写一段介绍\n要简短", image_paths: ["cat.png"], source_node_id: src });
    expect(r.status).toBe(201);
    expect(r.body).toEqual({ ok: true, path: "给这张图写一段介绍.md" });
    expect(readFileSync(abs("给这张图写一段介绍.md"), "utf8")).toBe("# 夜猫\n\n一只在窗台上看月亮的猫。");
    const body = platform.calls.at(-1);
    expect(body.model).toBe("vision-chat");
    expect(body.messages[0].role).toBe("system");
    expect(body.messages[0].content).toContain('You are "vision-chat"');
    expect(body.messages[1].content[1].image_url.url).toMatch(/^data:image\/png;base64,/);
    const canvas = (await http.get("/api/canvas")).body;
    const asset = (await http.get("/api/assets?include=metadata")).body.assets.find((a: any) => a.path === "给这张图写一段介绍.md");
    expect(asset.metadata).toMatchObject({ prompt: "给这张图写一段介绍\n要简短", model_id: "vision-chat" });
    const node = canvas.nodes.find((n: any) => n.assetId === asset.id);
    expect(node.type).toBe("text");
    expect(node.data).toMatchObject({ prompt: "给这张图写一段介绍\n要简短", model_id: "vision-chat", referenceImageIds: [expect.any(String)] });
    expect(node.data.status).toBeUndefined();
    expect(node.data.textRevision).toEqual(expect.any(Number));
    expect(canvas.edges.some((e: any) => e.source === src && e.target === node.id)).toBe(true);

    // 同名再生成一次：文件名加空格序号，不覆盖。
    expect((await http.post("/api/generate/text").set(canvasHeaders).send({ model_id: "vision-chat", prompt: "给这张图写一段介绍" })).body.path).toBe("给这张图写一段介绍 2.md");
  });

  it("/api/generate/text：replace_node_id 写回已有文本节点；参考文本贴在前面；params.system_prompt 覆盖默认系统提示", async () => {
    writeFileSync(abs("大纲.md"), "第一章：相遇");
    platform.setReply("改写后的正文");
    const first = await http.post("/api/generate/text").set({ "x-hilo-source": "canvas" }).send({ model_id: "vision-chat", prompt: "旧的" });
    const asset = (await http.get("/api/assets")).body.assets.find((a: any) => a.path === first.body.path);
    const nodeId = (await http.get("/api/canvas")).body.nodes.find((n: any) => n.assetId === asset.id).id;
    const r = await http
      .post("/api/generate/text")
      .set({ "x-hilo-source": "canvas" })
      .send({ model_id: "vision-chat", prompt: "按大纲扩写", text_paths: ["大纲.md"], replace_node_id: nodeId, params: { system_prompt: "你是编辑" } });
    expect(r.body).toEqual({ ok: true, path: first.body.path });
    expect(readFileSync(abs(first.body.path), "utf8")).toBe("改写后的正文");
    const body = platform.calls.at(-1);
    expect(body.messages[0]).toEqual({ role: "system", content: "你是编辑" });
    expect(body.messages[1].content).toBe("【文本1】\n第一章：相遇\n\n按大纲扩写");
  });

  it("/api/generate/text：模型不对、不是画布来源、空输出都回 ok:false；请求体按参照校验", async () => {
    const post = (b: object, h: Record<string, string> = { "x-hilo-source": "canvas" }) => http.post("/api/generate/text").set(h).send(b);
    expect((await post({ model_id: "gpt-x", prompt: "x" })).body).toEqual({ ok: false, error: "No text model for this model id", error_code: "client_error" });
    expect((await post({ model_id: "vision-chat", prompt: "x" }, {})).body).toEqual({
      ok: false,
      error: "Text generation is only supported for canvas requests",
      error_code: "client_error",
    });
    platform.setReply("   ");
    const empty = await post({ model_id: "vision-chat", prompt: "空的" });
    expect(empty.body).toEqual({ ok: false, error: "Model returned empty output", error_code: "backend_error", failure_presentation: "terminal" });
    const asset = (await http.get("/api/assets")).body.assets.find((a: any) => a.path === "空的.md");
    const node = (await http.get("/api/canvas")).body.nodes.find((n: any) => n.assetId === asset.id);
    expect(node.data).toMatchObject({ status: "error", errorMessage: "Model returned empty output" });
    expect((await post({ model_id: "vision-chat", prompt: "x", system_prompt: "只回标题" })).status).toBe(400);
    expect((await post({ prompt: "x" })).status).toBe(400);
    expect((await post({ model_id: "vision-chat", prompt: "x", image_paths: "cat.png" })).status).toBe(400);
  });

  it("generate-text：带参考图时发多模态内容", async () => {
    platform.setReply("描述完毕");
    const r = await http.post("/api/edit/generate-text").send({ prompt: "描述这张图", image_paths: ["cat.png"] });
    expect(r.body).toEqual({ ok: true, text: "描述完毕" });
    const content = platform.calls.at(-1).messages[0].content;
    expect(content[1].image_url.url).toMatch(/^data:image\/png;base64,/);
  });
});
