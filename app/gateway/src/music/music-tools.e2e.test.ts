import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";

import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../bootstrap.js";
import { MediaConfigService } from "../generate/media-config.service.js";

const FFMPEG = process.env.FFMPEG_PATH || "ffmpeg";
const HAS_FFMPEG = spawnSync(FFMPEG, ["-version"]).status === 0;
const MP3 = Buffer.concat([Buffer.from("ID3"), Buffer.alloc(61)]);

/** 假平台：对话回一份三段式歌词；音乐任务提交即完成。 */
function fakePlatform() {
  const chats: any[] = [];
  const jobs: any[] = [];
  const server = createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      res.setHeader("content-type", "application/json");
      if (req.url === "/v1/chat/completions") {
        chats.push(JSON.parse(raw));
        const content = "TITLE: 夏夜\nSTYLE: Pop, Summer\nLYRICS:\n[Verse]\n晚风吹过\n[Chorus]\n夏夜的星";
        return res.end(JSON.stringify({ choices: [{ message: { role: "assistant", content }, finish_reason: "stop" }] }));
      }
      if (req.url === "/v1/videos" && req.method === "POST") {
        jobs.push(JSON.parse(raw));
        return res.end(JSON.stringify({ task_id: `m-${jobs.length}` }));
      }
      if (req.url?.startsWith("/v1/videos/")) return res.end(JSON.stringify({ status: "completed", metadata: { url: `http://${req.headers.host}/files/song.mp3` } }));
      if (req.url === "/files/song.mp3") {
        res.setHeader("content-type", "audio/mpeg");
        return res.end(MP3);
      }
      res.statusCode = 404;
      res.end();
    });
  });
  return { server, chats, jobs };
}

describe("音乐辅助接口 / 云端工作流 / 人声提取", () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;
  let platform: ReturnType<typeof fakePlatform>;
  let server: Server;
  let ws: string;
  let cfgFile: string;
  let base: string;
  const writeConfig = (models: Record<string, unknown>) =>
    writeFileSync(cfgFile, JSON.stringify({ platform: { base_url: `${base}/v1`, api_key: "k", chat_model: "chat" }, models }));

  beforeAll(async () => {
    platform = fakePlatform();
    server = platform.server;
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    ws = mkdtempSync(path.join(tmpdir(), "ov-music-tools-"));
    cfgFile = path.join(mkdtempSync(path.join(tmpdir(), "ov-music-cfg-")), "config.json");
    writeConfig({ music: "minimax-music3", music_edit: "ace-step" });
    if (HAS_FFMPEG) spawnSync(FFMPEG, ["-y", "-v", "error", "-f", "lavfi", "-i", "sine=frequency=440:duration=2", path.join(ws, "ref.mp3")]);
    process.env.WORKSPACE_DIR = ws;
    process.env.OV_CONFIG_PATH = cfgFile;
    app = await createApp();
    app.get(MediaConfigService).clientOverrides = { sleep: async () => undefined, logger: { info() {}, warn() {} } };
    await app.init();
    http = request(app.getHttpServer());
  });
  afterAll(async () => {
    await app.close();
    await new Promise<void>((r) => server.close(() => r()));
    delete process.env.WORKSPACE_DIR;
    delete process.env.OV_CONFIG_PATH;
  });

  it("写歌词：用对话模型写，回 song_title / style_tags / lyrics 和成功的 base；点名的歌名优先", async () => {
    const r = await http.post("/api/music/lyrics/generate").send({ mode: "write_full_song", prompt: "一首夏天的歌", title: "晚风" });
    expect(r.status).toBe(201);
    expect(r.body).toEqual({ song_title: "晚风", style_tags: "Pop, Summer", lyrics: "[Verse]\n晚风吹过\n[Chorus]\n夏夜的星", base: { code: 0, message: "success" } });
    expect(platform.chats.at(-1).model).toBe("chat");
    // edit 模式没给原稿是调用方的错
    expect((await http.post("/api/music/lyrics/generate").send({ mode: "edit", prompt: "改一改" })).status).toBe(400);
  });

  it.skipIf(!HAS_FFMPEG)("翻唱预处理：量出时长、登记 cover_feature_id；生成时凭 id 取回参考音频走 ace-step 的 cover", async () => {
    const r = await http.post("/api/music/cover/preprocess").send({ audio: "ref.mp3" });
    expect(r.body).toMatchObject({ ok: true, cover_feature_id: expect.stringMatching(/^cover-/), formatted_lyrics: "", structure_result: "" });
    expect(r.body.audio_duration).toBeGreaterThan(1.5);

    const g = await http.post("/api/generate/music").send({ prompt: "爵士版", backend: "minimax_music_cover", filename: "cover-jazz", params: { cover_feature_id: r.body.cover_feature_id } });
    expect(g.body).toMatchObject({ ok: true });
    const job = platform.jobs.at(-1);
    expect(job).toMatchObject({ model: "ace-step", prompt: "爵士版", metadata: { task_type: "cover", reference_audio: expect.stringMatching(/^data:audio\/mpeg;base64,/) } });

    const stale = await http.post("/api/generate/music").send({ prompt: "x", backend: "minimax_music_cover", filename: "stale", params: { cover_feature_id: "cover-00000000-0000-0000-0000-000000000000" } });
    expect(stale.body).toMatchObject({ ok: false, error: expect.stringContaining("cover_feature_id") });
  });

  it("翻唱预处理：缺 audio / 文件不在 / 越界 / 没配翻唱模型，都回 {ok:false, error}", async () => {
    expect((await http.post("/api/music/cover/preprocess").send({})).body).toEqual({ ok: false, error: "audio is required" });
    expect((await http.post("/api/music/cover/preprocess").send({ audio: "nope.mp3" })).body).toMatchObject({ ok: false, error: expect.stringContaining("not found") });
    expect((await http.post("/api/music/cover/preprocess").send({ audio: "../x.mp3" })).body).toMatchObject({ ok: false, error: expect.stringContaining("traversal") });
    writeConfig({ music: "minimax-music3" });
    expect((await http.post("/api/music/cover/preprocess").send({ audio: "ref.mp3" })).body).toMatchObject({ ok: false, error: expect.stringContaining("music_edit") });
    writeConfig({ music: "minimax-music3", music_edit: "ace-step" });
  });

  it("云端工作流：参数照样校验；通过后 503 能力不可用；查询一律 404", async () => {
    const body = { dag_id: "n-storyboard", inputs: { prompt: "x" }, asset_keys: [] };
    const run = await http.post("/api/dag/run").send(body);
    expect(run.status).toBe(503);
    expect(run.body).toMatchObject({ ok: false, error_code: "CAPABILITY_UNAVAILABLE" });
    expect((await http.post("/api/dag/run-and-watch").send({ ...body, concurrency: 2 })).status).toBe(503);
    expect((await http.post("/api/dag/run-and-watch").send({ ...body, concurrency: 9 })).status).toBe(400);
    expect((await http.post("/api/dag/run").send({ dag_id: "x" })).status).toBe(400);
    expect((await http.get("/api/dag/run/run-1")).status).toBe(404);
  });

  it("人声提取：缺 audio_path 400；否则 503 能力不可用", async () => {
    expect((await http.post("/api/speech/voice_isolation").send({})).status).toBe(400);
    const r = await http.post("/api/speech/voice_isolation").send({ audio_path: "ref.mp3", filename: "ref-isolated" });
    expect(r.status).toBe(503);
    expect(r.body).toMatchObject({ ok: false, error: expect.stringContaining("Voice isolation is not available"), error_code: "CAPABILITY_UNAVAILABLE" });
  });
});
