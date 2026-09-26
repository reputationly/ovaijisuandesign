import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../bootstrap.js";
import { selectPlaybackStrategy } from "./media-playback.service.js";

const hasFfmpeg = (() => {
  try {
    execFileSync(process.env.FFMPEG_PATH || "ffmpeg", ["-version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
})();

describe("选播放策略", () => {
  const h264 = { video: { codec: "h264", pixelFormat: "yuv420p", height: 720 }, audio: { codec: "aac" }, hasAudio: true, formatName: "mov,mp4,m4a,3gp,3g2,mj2" };
  it("浏览器能直接放的 MP4 给原文件；容器 / 音轨不行只换封装；其余转码", () => {
    expect(selectPlaybackStrategy(".mp4", h264, 1080)).toEqual({ mode: "direct" });
    expect(selectPlaybackStrategy(".mov", h264, 1080)).toEqual({ mode: "remux", copyAudio: true });
    expect(selectPlaybackStrategy(".mp4", { ...h264, audio: { codec: "pcm_s16le" } }, 1080)).toEqual({ mode: "remux", copyAudio: false });
    expect(selectPlaybackStrategy(".mp4", h264, 480)).toEqual({ mode: "transcode" });
    expect(selectPlaybackStrategy(".mp4", { ...h264, video: { codec: "hevc", pixelFormat: "yuv420p", height: 720 } }, 1080)).toEqual({ mode: "transcode" });
    expect(selectPlaybackStrategy(".mp4", { ...h264, video: { codec: "h264", pixelFormat: "yuv420p10le", height: 720 } }, 1080)).toEqual({ mode: "transcode" });
    expect(selectPlaybackStrategy(".mp4", null, 1080)).toEqual({ mode: "transcode" });
  });
});

describe.skipIf(!hasFfmpeg)("视频播放源和音频波形（真实 ffmpeg）", () => {
  let app: INestApplication;
  let ws: string;
  let http: ReturnType<typeof request>;
  const ff = (...args: string[]) => execFileSync(process.env.FFMPEG_PATH || "ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", ...args], { cwd: ws });

  beforeAll(async () => {
    ws = mkdtempSync(path.join(tmpdir(), "ov-media-"));
    process.env.WORKSPACE_DIR = ws;
    ff("-f", "lavfi", "-i", "testsrc=size=160x120:rate=10:duration=1", "-f", "lavfi", "-i", "sine=frequency=440:duration=1", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", "ok.mp4");
    ff("-f", "lavfi", "-i", "testsrc=size=160x120:rate=10:duration=1", "-c:v", "mpeg4", "odd.mov");
    ff("-f", "lavfi", "-i", "sine=frequency=440:duration=1", "tone.wav");
    writeFileSync(`${ws}/note.txt`, "x");
    app = await createApp();
    await app.init();
    http = request(app.getHttpServer());
  }, 60_000);
  afterAll(async () => {
    await app?.close();
    delete process.env.WORKSPACE_DIR;
  });

  it("浏览器能放的 MP4 原样给出（source 可以带主机名和查询串）", async () => {
    const r = await http.get(`/api/asset/video-playback?source=${encodeURIComponent("http://127.0.0.1:8001/files/ok.mp4?ws=1")}`).buffer(true);
    expect(r.status).toBe(200);
    expect(r.headers["content-type"]).toMatch(/video\/mp4/);
    expect(Number(r.headers["content-length"])).toBe(statSync(path.join(ws, "ok.mp4")).size);
  });

  it("按资产 id 也行；Range 请求回 206", async () => {
    const id = (await http.post("/api/files/track").send({ path: "ok.mp4" })).body.id;
    const r = await http.get(`/api/asset/video-playback?source=${encodeURIComponent(`/files/id/${id}`)}`).set("Range", "bytes=0-99");
    expect(r.status).toBe(206);
    expect(r.headers["content-range"]).toMatch(/^bytes 0-99\//);
  });

  it("放不了的（mpeg4 in MOV）转成 H.264 MP4 并缓存；限高参数进缓存键", async () => {
    const r = await http.get(`/api/asset/video-stream?path=odd.mov&maxHeight=240`).buffer(true);
    expect(r.status).toBe(200);
    expect(r.headers["content-type"]).toMatch(/video\/mp4/);
    const cached = readdirSync(path.join(ws, ".hilo/.video-streams")).filter((f) => f.endsWith(".mp4"));
    expect(cached).toHaveLength(1);
    await http.get(`/api/asset/video-stream?path=odd.mov&maxHeight=240`);
    expect(readdirSync(path.join(ws, ".hilo/.video-streams")).filter((f) => f.endsWith(".mp4"))).toHaveLength(1);
  }, 60_000);

  it("播放源参数：越界 400、不存在 404、不是视频 400、不是本地文件路由 400", async () => {
    expect((await http.get("/api/asset/video-stream?path=../../etc/hosts")).status).toBe(400);
    expect((await http.get("/api/asset/video-stream?path=none.mp4")).status).toBe(404);
    expect((await http.get("/api/asset/video-stream?path=note.txt")).status).toBe(400);
    expect((await http.get("/api/asset/video-stream")).status).toBe(400);
    expect((await http.get(`/api/asset/video-playback?source=${encodeURIComponent("https://example.com/a.mp4")}`)).status).toBe(400);
    expect((await http.get(`/api/asset/video-playback?source=${encodeURIComponent("/files/..%2F..%2Fetc%2Fhosts")}`)).status).toBe(400);
    expect((await http.get(`/api/asset/video-playback?source=${encodeURIComponent("/files/id/nope")}`)).status).toBe(404);
    expect((await http.get("/api/asset/video-playback")).status).toBe(400);
  });

  it("peaks：单声道峰值 + 时长，结果缓存；桶数夹在 50–4096", async () => {
    const r = await http.get("/api/asset/peaks?path=tone.wav&buckets=100");
    expect(r.status).toBe(200);
    expect(r.body.peaks).toHaveLength(1);
    expect(r.body.peaks[0]).toHaveLength(100);
    expect(Math.max(...r.body.peaks[0].map(Math.abs))).toBeGreaterThan(0.1);
    expect(r.body.duration).toBeCloseTo(1, 1);
    expect(existsSync(path.join(ws, ".hilo/.peaks"))).toBe(true);
    expect((await http.get("/api/asset/peaks?path=tone.wav&buckets=1")).body.peaks[0]).toHaveLength(50);
    expect((await http.get("/api/asset/peaks?path=../../x.wav")).status).toBe(400);
    expect((await http.get("/api/asset/peaks?path=none.wav")).status).toBe(404);
    expect((await http.get("/api/asset/peaks?path=note.txt")).status).toBe(400);
    expect((await http.get("/api/asset/peaks")).status).toBe(400);
  });
});
