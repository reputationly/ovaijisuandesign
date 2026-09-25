import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../bootstrap.js";

const PNG = Buffer.from(
  "89504e470d0a1a0a0000000d4948445200000001000000010806000000" +
    "1f15c4890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082",
  "hex",
);

describe("files（真实工作区）", () => {
  let app: INestApplication;
  let ws: string;
  let http: ReturnType<typeof request>;

  beforeAll(async () => {
    ws = mkdtempSync(path.join(tmpdir(), "ov-files-"));
    process.env.WORKSPACE_DIR = ws;
    app = await createApp();
    await app.init();
    http = request(app.getHttpServer());
  });
  afterAll(async () => {
    await app.close();
    delete process.env.WORKSPACE_DIR;
  });

  it("GET /api/workspace", async () => {
    expect((await http.get("/api/workspace")).body).toEqual({ dir: ws });
  });

  let pngId = "";
  it("上传：默认放根目录，同名不覆盖，认得的类型入库并带尺寸", async () => {
    const a = await http.post("/api/upload").attach("file", PNG, "shot.png");
    expect(a.status).toBe(201);
    expect(a.body).toMatchObject({ ok: true, path: "shot.png", relative: "shot.png", width: 1, height: 1 });
    pngId = a.body.id;
    const b = await http.post("/api/upload").attach("file", PNG, "shot.png");
    expect(b.body.path).toBe("shot(1).png");
    expect(readFileSync(path.join(ws, "shot.png"))).toEqual(PNG);
    // 认不得的类型只落盘不入库。
    const z = await http.post("/api/upload").attach("file", Buffer.from("x"), "a.zip");
    expect(z.body.id).toBeUndefined();
  });

  it("GET /api/assets：fileSize 驼峰，metadata 只在 include=metadata 时给", async () => {
    const plain = (await http.get("/api/assets")).body.assets;
    const shot = plain.find((a: any) => a.path === "shot.png");
    expect(shot).toMatchObject({ id: pngId, type: "image", fileSize: PNG.length, status: "active" });
    expect(shot.metadata).toBeUndefined();
    const rich = (await http.get("/api/assets?include=Metadata")).body.assets;
    expect(rich.find((a: any) => a.path === "shot.png").metadata).toMatchObject({ model: "user_uploaded" });
    expect((await http.get("/api/assets?path=shot.png")).body.assets).toHaveLength(1);
    expect((await http.get("/api/assets?path=nope.png")).body.assets).toEqual([]);
  });

  it("PATCH metadata：浅合并，null 删 key；不存在 404", async () => {
    const r = await http.patch(`/api/assets/${pngId}/metadata`).send({ patch: { prompt: "猫", model: null } });
    expect(r.body).toEqual({ ok: true, metadata: { prompt: "猫" } });
    expect((await http.patch("/api/assets/nope/metadata").send({ patch: {} })).status).toBe(404);
    // 多余字段被全局校验挡住。
    expect((await http.patch(`/api/assets/${pngId}/metadata`).send({ patch: {}, x: 1 })).status).toBe(400);
  });

  it("/api/assets/changes 能补拉到刚才的事件", async () => {
    const r = await http.get(`/api/assets/changes?workspace_id=${encodeURIComponent(ws)}`);
    expect(r.body.events.length).toBeGreaterThan(0);
    expect(r.body.events[0]).toMatchObject({ type: "asset_changed", change: "created" });
    expect((await http.get("/api/assets/changes")).status).toBe(400);
  });

  it("/files/id 和 /files/path：字节流、Range、缩略图、越界", async () => {
    const full = await http.get(`/files/id/${pngId}`).buffer(true);
    expect(full.status).toBe(200);
    expect(Buffer.from(full.body)).toEqual(PNG);
    const part = await http.get(`/files/id/${pngId}`).set("Range", "bytes=0-7");
    expect(part.status).toBe(206);
    const miss = await http.get("/files/id/nope");
    expect(miss.status).toBe(404);
    expect(miss.text).toBe("");
    const thumb = await http.get("/files/shot.png?w=64");
    expect(thumb.status).toBe(200);
    expect(existsSync(path.join(ws, ".hilo/.thumbnails/img"))).toBe(true);
    expect((await http.get("/files/..%2F..%2Fetc%2Fpasswd")).status).toBe(400);
  });

  it("文本内容：.hilo 只放行两类路径；unique 写不覆盖", async () => {
    expect((await http.get("/api/files/content?path=.hilo/canvas.json")).status).toBe(403);
    expect((await http.get("/api/files/content")).status).toBe(400);
    const w1 = await http.put("/api/files/content").send({ path: "notes/a.md", content: "一" });
    expect(w1.body).toMatchObject({ ok: true, path: "notes/a.md" });
    expect(w1.body.assetId).toBeTruthy();
    const w2 = await http.put("/api/files/content").send({ path: "notes/a.md", content: "二", unique: true });
    expect(w2.body.path).toBe("notes/a 2.md");
    expect((await http.get("/api/files/content?path=notes/a.md")).body).toEqual({ content: "一" });
    expect((await http.get("/api/files/content?path=nope.md")).status).toBe(404);
  });

  it("文本内容：长文档（超过默认 100kb）写得进去", async () => {
    const long = "第一场。".repeat(60_000);
    const r = await http.put("/api/files/content").send({ path: "长剧本.md", content: long });
    expect(r.status).toBe(200);
    expect((await http.get("/api/files/content?path=长剧本.md")).body.content).toHaveLength(long.length);
  });

  it("删除进缓冲区、资产隐藏；撤销原样放回；空栈明说", async () => {
    mkdirSync(path.join(ws, "images"), { recursive: true });
    writeFileSync(path.join(ws, "images/del.png"), PNG);
    await http.put("/api/files/content").send({ path: "tmp.md", content: "x" });
    const before = (await http.get("/api/assets")).body.assets.length;
    const d = await http.post("/api/files/delete").send({ paths: ["tmp.md", "does-not-exist.md"] });
    expect(d.body).toEqual({ ok: true });
    expect(existsSync(path.join(ws, "tmp.md"))).toBe(false);
    expect((await http.get("/api/assets")).body.assets.length).toBe(before - 1);
    const u = await http.post("/api/operations/undo");
    expect(u.status).toBe(200);
    expect(u.body.ok).toBe(true);
    expect(existsSync(path.join(ws, "tmp.md"))).toBe(true);
    expect((await http.get("/api/assets")).body.assets.length).toBe(before);
    expect((await http.post("/api/operations/undo")).body).toEqual({ ok: false, errorType: "empty-stack" });
  });

  it("导入内网 URL 被 SSRF 拦下，错误逐条给，HTTP 200", async () => {
    const r = await http.post("/api/files/import-url").send({ urls: ["http://127.0.0.1:1/x.png"] });
    expect(r.status).toBe(201);
    expect(r.body.imported).toEqual([]);
    expect(r.body.errors[0].error).toMatch(/SSRF policy rejected URL \(private-address\)/);
  });
});
