import { lstatSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import type { INestApplication } from "@nestjs/common";
import Database from "better-sqlite3";
import sharp from "sharp";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../bootstrap.js";
import { CANVAS_REFERENCE_PREFIX } from "./canvas-reference.js";
import { CanvasReferencesService } from "./canvas-references.service.js";

const ref = (o: Record<string, unknown>) => ({ source: "project", scope: "proj-1", name: "pic.png", kind: "image", ...o });
const uri = (o: Record<string, unknown>) => CANVAS_REFERENCE_PREFIX + encodeURIComponent(JSON.stringify(ref(o)));

describe("画布引用：项目素材按 id 解析、挂进工作区、出缩略图", () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;
  let ws: string;
  let png: Buffer;
  let assetsDir: string;

  beforeAll(async () => {
    ws = mkdtempSync(path.join(tmpdir(), "ov-refs-ws-"));
    const root = mkdtempSync(path.join(tmpdir(), "ov-refs-projects-"));
    const proj = path.join(root, ".projects", "proj-1");
    assetsDir = path.join(proj, ".assets");
    mkdirSync(path.join(assetsDir, "sub"), { recursive: true });
    mkdirSync(path.join(proj, ".hilo"), { recursive: true });
    png = await sharp({ create: { width: 320, height: 200, channels: 3, background: "#39c" } }).png().toBuffer();
    writeFileSync(path.join(assetsDir, "sub", "pic.png"), png);
    writeFileSync(path.join(assetsDir, "gone.png"), png);
    const db = new Database(path.join(proj, ".hilo", "project-assets.sqlite"));
    db.exec("CREATE TABLE asset_entries (id TEXT PRIMARY KEY, source TEXT NOT NULL, rel_path TEXT NOT NULL UNIQUE, name TEXT NOT NULL, size INTEGER, mime TEXT, created_at INTEGER NOT NULL)");
    db.prepare("INSERT INTO asset_entries VALUES (?,?,?,?,?,?,?)").run("a1", "local", "sub/pic.png", "pic.png", png.length, "image/png", 1);
    db.prepare("INSERT INTO asset_entries VALUES (?,?,?,?,?,?,?)").run("a2", "local", "gone.png", "gone.png", png.length, "image/png", 1);
    db.prepare("INSERT INTO asset_entries VALUES (?,?,?,?,?,?,?)").run("a3", "local", "../../escape.png", "escape.png", 1, "image/png", 1);
    db.close();
    rmSync(path.join(assetsDir, "gone.png"));
    process.env.WORKSPACE_DIR = ws;
    process.env.HILO_PROJECTS_ROOT = root;
    app = await createApp();
    await app.init();
    http = request(app.getHttpServer());
  });
  afterAll(async () => {
    await app.close();
    delete process.env.WORKSPACE_DIR;
    delete process.env.HILO_PROJECTS_ROOT;
  });

  it("search：主体库在本机不可用，回空数组", async () => {
    expect((await http.get("/api/canvas-references/search").query({ q: "人物" })).body).toEqual([]);
  });

  it("resolve：在 / 删了 / 文件丢了 / 越界 / 主体库，各回各的状态；带 include_metadata 时回尺寸和大小", async () => {
    const body = [
      ref({ id: "a1" }),
      ref({ id: "nope" }),
      ref({ id: "a2", name: "gone.png" }),
      ref({ id: "a3" }),
      ref({ source: "subject", scope: "ent-1", id: "att-1", subjectName: "小猫" }),
      { target: "entity", source: "subject", scope: "ent-1", id: "ent-1", name: "小猫", kind: "image", attachmentKinds: ["image"] },
    ];
    const r = await http.post("/api/canvas-references/resolve").query({ include_metadata: "true" }).send(body);
    expect(r.status).toBe(201);
    expect(r.body.map((x: any) => x.status)).toEqual(["available", "deleted", "missing", "unavailable", "unavailable", "unavailable"]);
    expect(r.body[0]).toMatchObject({ name: "pic.png", metadata: { media: { file_size: png.length, width: 320, height: 200 }, attachments: [] } });
    const plain = await http.post("/api/canvas-references/resolve").send([ref({ id: "a1" })]);
    expect(plain.body[0].metadata).toBeUndefined();
  });

  it("resolve：不是数组 / 超过 100 个 / 字段不合法 → 400", async () => {
    expect((await http.post("/api/canvas-references/resolve").send({ a: 1 })).status).toBe(400);
    expect((await http.post("/api/canvas-references/resolve").send(Array.from({ length: 101 }, () => ref({ id: "a1" })))).status).toBe(400);
    expect((await http.post("/api/canvas-references/resolve").send([ref({ id: "a1", kind: "pdf" })])).status).toBe(400);
    expect((await http.post("/api/canvas-references/resolve").send([ref({ id: "a1", scope: "../x", source: "project" })])).body[0].status).toBe("unavailable");
  });

  it("content：挂进 .hilo/canvas-references/<哈希>/ 的软链下回原文件；w 回缩略图；删了的 404", async () => {
    const r = await http.get("/api/canvas-references/content").query({ ref: uri({ id: "a1" }) });
    expect(r.status).toBe(200);
    expect(r.headers["cache-control"]).toBe("no-store");
    expect(Buffer.compare(r.body, png)).toBe(0);
    const rel = await app.get(CanvasReferencesService).prepare(ref({ id: "a1" }) as any);
    expect(rel).toMatch(/^\.hilo\/canvas-references\/[0-9a-f]{64}\/source-[0-9a-f]{16}\/pic\.png$/);
    expect(lstatSync(path.join(ws, path.dirname(rel))).isSymbolicLink()).toBe(true);
    expect(JSON.parse(readFileSync(path.join(ws, path.dirname(path.dirname(rel)), "reference.json"), "utf8"))).toMatchObject({ id: "a1", scope: "proj-1" });
    expect(await app.get(CanvasReferencesService).identifyPrepared(rel)).toMatchObject({ id: "a1" });

    const thumb = await http.get("/api/canvas-references/content").query({ ref: uri({ id: "a1" }), w: "64" });
    expect(thumb.status).toBe(200);
    expect((await sharp(thumb.body).metadata()).width).toBe(64);

    expect((await http.get("/api/canvas-references/content").query({ ref: uri({ id: "nope" }) })).status).toBe(404);
    expect((await http.get("/api/canvas-references/content").query({ ref: "not-a-ref" })).status).toBe(400);
  });
});
