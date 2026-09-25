import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, utimesSync, writeFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";

import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createApp } from "../bootstrap.js";
import { MediaConfigService } from "../generate/media-config.service.js";

const WAV = Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WAVEfmt "), Buffer.alloc(32)]);
const MP3 = Buffer.concat([Buffer.from("ID3"), Buffer.alloc(61)]);

/** 假平台：语音任务提交回任务号，查询直接完成；`failNext` 让下一次查询失败。 */
function fakePlatform() {
  const calls: { method: string; url: string; body?: any }[] = [];
  let base = "";
  let fail = false;
  const server = createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      calls.push({ method: req.method!, url: req.url!, body: raw ? JSON.parse(raw) : undefined });
      const json = (v: unknown) => {
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify(v));
      };
      if (req.url === "/v1/videos" && req.method === "POST") return json({ task_id: `at-${calls.length}` });
      if (req.url!.startsWith("/v1/videos/")) {
        if (fail) {
          fail = false;
          return json({ status: "failed", error: { message: "参考音频太短" } });
        }
        return json({ status: "completed", metadata: { url: `${base}/files/speech` } });
      }
      if (req.url === "/files/speech") {
        res.setHeader("content-type", "audio/mpeg");
        return res.end(MP3);
      }
      res.statusCode = 404;
      res.end();
    });
  });
  return { server, calls, setBase: (b: string) => (base = b), failNext: () => (fail = true) };
}

describe("音色：克隆登记进本机音色表，合成时查表（假平台）", () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;
  let platform: ReturnType<typeof fakePlatform>;
  let server: Server;
  let ws: string;
  let hub: string;
  let cfgFile: string;
  let base: string;
  let cfgVersion = 0;

  /** 换配置。按 mtime 缓存，显式拨一下时间免得同一毫秒内写两次被当成没变。 */
  function writeConfig(models: Record<string, unknown>) {
    writeFileSync(cfgFile, JSON.stringify({ platform: { base_url: `${base}/v1`, api_key: "k", chat_model: "chat" }, models }));
    const t = new Date(Date.UTC(2026, 0, 1, 0, 0, ++cfgVersion));
    utimesSync(cfgFile, t, t);
  }
  const fullConfig = () => writeConfig({ speech: "indextts-2.5", voice_map: { narrator: "https://x/ref.wav" } });
  const voiceDirs = () => (existsSync(path.join(hub, "voices")) ? readdirSync(path.join(hub, "voices")) : []);

  beforeAll(async () => {
    platform = fakePlatform();
    server = platform.server;
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    platform.setBase(base);
    ws = mkdtempSync(path.join(tmpdir(), "ov-speech-e2e-"));
    hub = mkdtempSync(path.join(tmpdir(), "ov-speech-hub-"));
    cfgFile = path.join(hub, "config.json");
    fullConfig();
    writeFileSync(path.join(ws, "ref.wav"), WAV);
    writeFileSync(path.join(ws, "note.txt"), "hello");
    process.env.WORKSPACE_DIR = ws;
    process.env.OV_CONFIG_PATH = cfgFile;
    process.env.HILO_DATA_DIR = hub;
    app = await createApp();
    app.get(MediaConfigService).clientOverrides = { sleep: async () => undefined, logger: { info() {}, warn() {} } };
    await app.init();
    http = request(app.getHttpServer());
  });
  afterAll(async () => {
    await app.close();
    await new Promise((r) => server.close(r));
    delete process.env.WORKSPACE_DIR;
    delete process.env.OV_CONFIG_PATH;
    delete process.env.HILO_DATA_DIR;
  });
  beforeEach(() => {
    fullConfig();
    platform.calls.length = 0;
  });

  it("克隆带试听：登记音色、合成试听落进工作区，回 voice_id 和试听的绝对路径", async () => {
    const r = await http.post("/api/speech/voice_clone").send({ audio_path: "ref.wav", demo_text: "你好", demo_model: "speech-2.8-hd" });
    expect(r.status).toBe(201);
    expect(r.body.voice_id).toMatch(/^hub_[0-9a-f-]{36}$/);
    expect(Object.keys(r.body).sort()).toEqual(["demo_audio", "voice_id"]);
    expect(r.body.demo_audio).toBe(path.join(ws, `voice-clone-demo-${r.body.voice_id}.mp3`));
    expect(readFileSync(r.body.demo_audio)).toEqual(MP3);

    // 试听按零样本合成：参考音频以 data URI 走 metadata.voice，模型是配置里的语音模型。
    const submit = platform.calls.find((c) => c.method === "POST");
    expect(submit!.body).toEqual({
      model: "indextts-2.5",
      prompt: "你好",
      metadata: { task_type: "tts", voice: `data:audio/wav;base64,${WAV.toString("base64")}` },
    });

    const dir = path.join(hub, "voices", r.body.voice_id);
    expect(readFileSync(path.join(dir, "reference.wav"))).toEqual(WAV);
    expect(JSON.parse(readFileSync(path.join(dir, "meta.json"), "utf8"))).toMatchObject({ voice_id: r.body.voice_id, kind: "clone", source_name: "ref.wav" });
  });

  it("音色列表 = voice_map + 本机音色表", async () => {
    const r = await http.post("/api/speech/voice_clone").send({ audio_path: path.join(ws, "ref.wav") });
    expect(r.status).toBe(201);
    expect(r.body).toEqual({ voice_id: expect.stringMatching(/^hub_/) });
    expect(platform.calls).toEqual([]);

    const voices = (await http.get("/api/speech/voices?page_size=1000")).body;
    expect(voices[0]).toMatchObject({ voice_id: "narrator", sample_audio: "https://x/ref.wav" });
    expect(voices).toContainEqual({
      voice_id: r.body.voice_id,
      name: "ref",
      description: "Cloned from: ref.wav",
      language: "",
      gender: "",
      age: "",
      accent: "",
      sample_audio: "",
    });
  });

  it("语音合成查本机音色表：克隆出的 voice_id 换回登记的参考音频", async () => {
    const { voice_id } = (await http.post("/api/speech/voice_clone").send({ audio_path: "ref.wav" })).body;
    const r = await http.post("/api/generate/speech").send({ prompt: "欢迎收听", filename: "welcome", params: { voice_id } });
    expect(r.body).toMatchObject({ ok: true, status: "succeeded", result: { path: "welcome.mp3" } });
    const submit = platform.calls.find((c) => c.method === "POST");
    expect(submit!.body.metadata).toEqual({ task_type: "tts", voice: `data:audio/wav;base64,${WAV.toString("base64")}` });
  });

  it("配置里的 voice_map 照旧可用", async () => {
    const r = await http.post("/api/generate/speech").send({ prompt: "hi", filename: "narr", params: { voice_id: "narrator" } });
    expect(r.body).toMatchObject({ ok: true, status: "succeeded" });
    expect(platform.calls.find((c) => c.method === "POST")!.body.metadata.voice).toBe("https://x/ref.wav");
  });

  it("另一个工作区的 gateway 也认得这个音色（音色表是应用级的）", async () => {
    const { voice_id } = (await http.post("/api/speech/voice_clone").send({ audio_path: "ref.wav" })).body;
    const other = mkdtempSync(path.join(tmpdir(), "ov-speech-e2e-other-"));
    process.env.WORKSPACE_DIR = other;
    const app2 = await createApp();
    try {
      app2.get(MediaConfigService).clientOverrides = { sleep: async () => undefined, logger: { info() {}, warn() {} } };
      await app2.init();
      const voices = (await request(app2.getHttpServer()).get("/api/speech/voices")).body;
      expect(voices.map((v: any) => v.voice_id)).toContain(voice_id);
      const r = await request(app2.getHttpServer()).post("/api/generate/speech").send({ prompt: "hi", filename: "x", params: { voice_id } });
      expect(r.body).toMatchObject({ ok: true, status: "succeeded" });
      expect(existsSync(path.join(other, "x.mp3"))).toBe(true);
    } finally {
      await app2.close();
      process.env.WORKSPACE_DIR = ws;
    }
  });

  it("试听合成失败：整个克隆失败，音色表里不留半截", async () => {
    const before = voiceDirs();
    platform.failNext();
    const r = await http.post("/api/speech/voice_clone").send({ audio_path: "ref.wav", demo_text: "hi", demo_model: "speech-2.8-hd" });
    expect(r.status).toBe(502);
    expect(r.body).toEqual({ statusCode: 502, message: expect.stringContaining("参考音频太短") });
    expect(voiceDirs()).toEqual(before);
  });

  it("参数和文件预检：400，文案和上游预检一致", async () => {
    const post = (body: unknown) => http.post("/api/speech/voice_clone").send(body as object);
    expect((await post({ audio_path: "ref.wav", demo_text: "hi" })).body).toEqual({
      statusCode: 400,
      error: "Bad Request",
      message: "demo_model is required when demo_text is provided",
    });
    expect((await post({ audio_path: "missing.wav" })).body.message).toBe(`voice clone audio not found: ${path.join(ws, "missing.wav")}`);
    expect((await post({ audio_path: "note.txt" })).body.message).toBe(`voice clone audio must be mp3/m4a/wav, got .txt: ${path.join(ws, "note.txt")}`);
    expect((await post({ audio_path: "ref.wav", prompt_audio_path: "note.txt", prompt_text: "t" })).body.message).toBe(
      `voice clone audio must be mp3/m4a/wav, got .txt: ${path.join(ws, "note.txt")}`,
    );
    expect((await post({ audio_path: "../ref.wav" })).body.message).toBe("Path traversal detected");
    const invalid = await post({ audio_path: "", voice_id: "mine" });
    expect(invalid.status).toBe(400);
    expect(invalid.body.message).toEqual(expect.arrayContaining(["property voice_id should not exist", "audio_path should not be empty"]));

    const big = path.join(ws, "big.mp3");
    writeFileSync(big, Buffer.alloc(20 * 1024 * 1024 + 1));
    expect((await post({ audio_path: "big.mp3" })).body.message).toBe(`voice clone audio exceeds 20MB (got 20.0MB): ${big}`);
    expect(platform.calls).toEqual([]);
  });

  it("没配语音模型：克隆回不可用，不登记", async () => {
    writeConfig({ image: "qwen-image" });
    const before = voiceDirs();
    const r = await http.post("/api/speech/voice_clone").send({ audio_path: "ref.wav" });
    expect(r.status).toBe(503);
    expect(r.body).toEqual({ statusCode: 503, message: "Voice clone is not available: no speech model is configured. Set one in Settings." });
    expect(voiceDirs()).toEqual(before);
  });

  it("音色设计：参数照样校验，平台没有这种模型，回不可用", async () => {
    const tooLong = await http.post("/api/speech/voice_design").send({ prompt: "warm", preview_text: "x".repeat(501) });
    expect(tooLong.status).toBe(400);
    expect(tooLong.body.message).toEqual(["preview_text must be shorter than or equal to 500 characters"]);
    const r = await http.post("/api/speech/voice_design").send({ prompt: "warm", preview_text: "hi", source_node_id: "n1" });
    expect(r.status).toBe(501);
    expect(r.body).toEqual({
      statusCode: 501,
      message: "Voice design is not available: the configured platform has no text-to-voice design model. Clone a voice from a reference audio instead.",
    });
    expect(platform.calls).toEqual([]);
  });

  it("音色表里坏掉的条目跳过，不影响列表", async () => {
    const bad = path.join(hub, "voices", "hub_00000000-0000-0000-0000-000000000000");
    mkdirSync(bad, { recursive: true });
    writeFileSync(path.join(bad, "meta.json"), "{broken");
    const r = await http.get("/api/speech/voices");
    expect(r.status).toBe(200);
    expect(r.body.map((v: any) => v.voice_id)).not.toContain("hub_00000000-0000-0000-0000-000000000000");
  });
});
