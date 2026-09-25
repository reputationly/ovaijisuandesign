import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import type { INestApplication } from "@nestjs/common";
import sharp from "sharp";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../bootstrap.js";

/** supertest 默认不收集图片类响应体，按 Buffer 收。运行时 res 是 Node 的响应流，类型声明里没写这一面。 */
function binary(res: request.Response, cb: (err: Error | null, body: Buffer) => void) {
  const stream = res as unknown as NodeJS.ReadableStream;
  const chunks: Buffer[] = [];
  stream.on("data", (c: Buffer) => chunks.push(c));
  stream.on("end", () => cb(null, Buffer.concat(chunks)));
}

describe("本机文件：scan-media / workspace-summary / local-file", () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;
  let root = "";
  let other = "";

  beforeAll(async () => {
    root = mkdtempSync(path.join(tmpdir(), "ov-local-media-e2e-"));
    process.env.WORKSPACE_DIR = path.join(root, "ws");
    mkdirSync(process.env.WORKSPACE_DIR);
    // 另一个工作区：local-file 访问的就是这种不在当前工作区里的文件。
    other = path.join(root, "other");
    mkdirSync(path.join(other, "sub"), { recursive: true });
    mkdirSync(path.join(other, ".hilo"));
    await sharp({ create: { width: 800, height: 400, channels: 3, background: "#336699" } })
      .png()
      .toFile(path.join(other, "old.png"));
    await sharp({ create: { width: 10, height: 10, channels: 3, background: "#000" } })
      .png()
      .toFile(path.join(other, "new.png"));
    writeFileSync(path.join(other, "clip.mp4"), "not really a video");
    writeFileSync(path.join(other, "voice.mp3"), "not really audio");
    writeFileSync(path.join(other, "notes.md"), "# 笔记");
    writeFileSync(path.join(other, "sub", "deep.png"), "x");
    writeFileSync(path.join(other, ".hilo", "hidden.png"), "x");
    const past = new Date(Date.now() - 60_000);
    utimesSync(path.join(other, "old.png"), past, past);
    app = await createApp();
    await app.init();
    http = request(app.getHttpServer());
  });
  afterAll(async () => {
    await app.close();
    delete process.env.WORKSPACE_DIR;
    rmSync(root, { recursive: true, force: true });
  });

  it("scan-media：只看这一层的媒体；音频 > 视频 > 图片，同类新的在前；limit 生效", async () => {
    const q = `dir=${encodeURIComponent(other)}&device_platform=desktop&app_id=3001`;
    let r = await http.get(`/api/files/scan-media?${q}&limit=10`);
    expect(r.status).toBe(200);
    expect(r.body.files.map((f: any) => f.name)).toEqual(["voice.mp3", "clip.mp4", "new.png", "old.png"]);
    expect(r.body.files[0].absolutePath).toBe(path.join(other, "voice.mp3"));
    r = await http.get(`/api/files/scan-media?${q}`);
    expect(r.body.files).toHaveLength(3);
  });

  it("scan-media / workspace-summary 的参数错误都是 400", async () => {
    expect((await http.get("/api/files/scan-media")).status).toBe(400);
    expect((await http.get("/api/files/scan-media?dir=relative/dir")).status).toBe(400);
    expect((await http.get(`/api/files/scan-media?dir=${encodeURIComponent(path.join(root, "nope"))}`)).status).toBe(400);
    expect((await http.get(`/api/files/scan-media?dir=${encodeURIComponent(path.join(other, "notes.md"))}`)).status).toBe(400);
    expect((await http.get(`/api/files/workspace-summary?dir=${encodeURIComponent(path.join(other, "notes.md"))}`)).status).toBe(400);
  });

  it("workspace-summary：递归计数，跳过隐藏目录", async () => {
    const r = await http.get(`/api/files/workspace-summary?dir=${encodeURIComponent(other)}`);
    expect(r.body).toEqual({ counts: { image: 3, video: 1, audio: 1, text: 1 } });
  });

  it("local-file：原文件；带 w 的图片回缩略图；不存在 404；相对路径 400", async () => {
    const file = path.join(other, "old.png");
    let r = await http.get(`/api/local-file?path=${encodeURIComponent(file)}`).buffer(true).parse(binary);
    expect(r.status).toBe(200);
    expect((await sharp(r.body as Buffer).metadata()).width).toBe(800);

    r = await http.get(`/api/local-file?path=${encodeURIComponent(file)}&w=100&hilo_workspace=abc`).buffer(true).parse(binary);
    expect(r.status).toBe(200);
    // 宽度向上取档：100 → 128。
    expect((await sharp(r.body as Buffer).metadata()).width).toBe(128);

    expect((await http.get(`/api/local-file?path=${encodeURIComponent(path.join(other, "gone.png"))}`)).status).toBe(404);
    expect((await http.get(`/api/local-file?path=${encodeURIComponent(path.join(other, "sub"))}`)).status).toBe(404);
    expect((await http.get("/api/local-file?path=relative.png")).status).toBe(400);
    expect((await http.get("/api/local-file")).status).toBe(400);
  });

  it("local-file：视频要缩略图但抽帧失败时回占位图，不回破图", async () => {
    const r = await http.get(`/api/local-file?path=${encodeURIComponent(path.join(other, "clip.mp4"))}&w=480`).buffer(true).parse(binary);
    expect(r.status).toBe(200);
    expect(r.headers["content-type"]).toMatch(/image\/jpeg/);
  });
});
