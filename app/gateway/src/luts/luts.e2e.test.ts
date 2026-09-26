import { existsSync, mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../bootstrap.js";

const CUBE = 'TITLE "mine"\nLUT_3D_SIZE 2\n0 0 0\n1 0 0\n0 1 0\n1 1 0\n0 0 1\n1 0 1\n0 1 1\n1 1 1\n';

describe("LUT：自带预设 + 工作区导入", () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;
  let ws: string;

  beforeAll(async () => {
    ws = mkdtempSync(path.join(tmpdir(), "ov-luts-"));
    process.env.WORKSPACE_DIR = ws;
    app = await createApp();
    await app.init();
    http = request(app.getHttpServer());
  });
  afterAll(async () => {
    await app.close();
    delete process.env.WORKSPACE_DIR;
  });

  it("列表：十个自带预设排在前面，带 isPreset", async () => {
    const r = await http.get("/api/luts");
    expect(r.status).toBe(200);
    const presets = r.body.luts.filter((l: any) => l.isPreset);
    expect(presets).toHaveLength(10);
    expect(presets[0]).toMatchObject({ name: "01_Portrait_Warm.cube", sizeBytes: expect.any(Number), mtime: expect.any(Number), isPreset: true });
  });

  it("导入：写进 .hilo/luts/，名字补 .cube、开头的点换掉；重名加 (1)；列表里排在预设后面", async () => {
    const a = await http.post("/api/luts/import").attach("file", Buffer.from(CUBE), ".hidden");
    expect(a.status).toBe(201);
    expect(a.body).toEqual({ name: "_hidden.cube" });
    const b = await http.post("/api/luts/import").attach("file", Buffer.from(CUBE), "film.cube");
    const c = await http.post("/api/luts/import").attach("file", Buffer.from(CUBE), "film.cube");
    expect([b.body.name, c.body.name]).toEqual(["film.cube", "film (1).cube"]);
    expect(readdirSync(path.join(ws, ".hilo", "luts")).sort()).toEqual(["_hidden.cube", "film (1).cube", "film.cube"]);
    const list = (await http.get("/api/luts")).body.luts.map((l: any) => l.name);
    expect(list.slice(-3)).toEqual(["_hidden.cube", "film (1).cube", "film.cube"]);
    expect((await http.post("/api/luts/import")).status).toBe(400);
  });

  it("内容：工作区优先，其次预设；名字不合规 400；没有 400", async () => {
    expect((await http.get("/api/luts/content").query({ name: "film.cube" })).body).toEqual({ content: CUBE });
    const preset = await http.get("/api/luts/content").query({ name: "06_Classic_BW.cube" });
    expect(preset.body.content).toContain("LUT_3D_SIZE");
    expect((await http.get("/api/luts/content")).status).toBe(400);
    expect((await http.get("/api/luts/content").query({ name: "../x.cube" })).status).toBe(400);
    expect((await http.get("/api/luts/content").query({ name: "CON.cube" })).status).toBe(400);
    expect((await http.get("/api/luts/content").query({ name: "a.txt" })).status).toBe(400);
    expect((await http.get("/api/luts/content").query({ name: "nope.cube" })).status).toBe(400);
  });

  it("删除：工作区的删掉；预设删不了（403）；不存在的当已删", async () => {
    expect((await http.delete("/api/luts/film.cube")).body).toEqual({ ok: true });
    expect(existsSync(path.join(ws, ".hilo", "luts", "film.cube"))).toBe(false);
    expect((await http.delete("/api/luts/01_Portrait_Warm.cube")).status).toBe(403);
    expect((await http.delete("/api/luts/ghost.cube")).body).toEqual({ ok: true });
    expect(readFileSync(path.join(ws, ".hilo", "luts", "film (1).cube"), "utf8")).toBe(CUBE);
  });
});
