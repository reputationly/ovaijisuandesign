import { existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../bootstrap.js";
import { ProjectAssetAnchors } from "./project-asset-anchors.service.js";

/** 按主进程项目资产库的表结构建一个项目：`.assets/` 放文件，`.hilo/project-assets.sqlite` 是索引。 */
function makeProject(dataRoot: string, folder: string, files: Record<string, { id: string; bytes: string }>) {
  const dir = path.join(dataRoot, "Projects", ".projects", folder);
  mkdirSync(path.join(dir, ".assets"), { recursive: true });
  mkdirSync(path.join(dir, ".hilo"), { recursive: true });
  const db = new DatabaseSync(path.join(dir, ".hilo", "project-assets.sqlite"));
  db.exec(`CREATE TABLE IF NOT EXISTS asset_entries (id TEXT PRIMARY KEY, source TEXT NOT NULL, rel_path TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
    size INTEGER, mime TEXT, created_at INTEGER NOT NULL, updated_at INTEGER, downloaded_at INTEGER, remote_updated_at INTEGER, remote_created_at INTEGER)`);
  for (const [rel, f] of Object.entries(files)) {
    writeFileSync(path.join(dir, ".assets", rel), f.bytes);
    db.prepare("INSERT INTO asset_entries (id, source, rel_path, name, created_at) VALUES (?, 'local', ?, ?, ?)").run(f.id, rel, rel, Date.now());
  }
  return { assets: path.join(dir, ".assets"), db };
}

describe("项目资产锚点和 @ 提及搜索（真实工作区）", () => {
  let app: INestApplication;
  let ws: string;
  let dataRoot: string;
  let http: ReturnType<typeof request>;
  let proj: ReturnType<typeof makeProject>;

  beforeAll(async () => {
    ws = mkdtempSync(path.join(tmpdir(), "ov-anchor-"));
    dataRoot = mkdtempSync(path.join(tmpdir(), "ov-data-"));
    process.env.WORKSPACE_DIR = ws;
    process.env.HILO_DATA_DIR = dataRoot;
    proj = makeProject(dataRoot, "项目A", { "pic.png": { id: "a1", bytes: "one" }, "clip.mp4": { id: "a2", bytes: "two" } });
    app = await createApp();
    await app.init();
    http = request(app.getHttpServer());
  });
  afterAll(async () => {
    proj.db.close();
    await app.close();
    delete process.env.WORKSPACE_DIR;
    delete process.env.HILO_DATA_DIR;
  });

  const anchorOf = (items: unknown[]) => http.post("/api/files/anchor-project-asset").send({ items });
  const projectSearch = async (q: string) => (await http.get(`/api/files/project-asset-mention-search?q=${encodeURIComponent(q)}`)).body;

  it("锚定：硬链接进 .hilo/project-assets/，反复锚定得到同一个路径；不进资产库", async () => {
    const src = path.join(proj.assets, "pic.png");
    const r = await anchorOf([{ path: src, assetId: "a1", projectFolderName: "项目A" }]);
    expect(r.status).toBe(201);
    expect(r.body).toEqual({ ok: true, anchored: [{ path: ".hilo/project-assets/pic.png", filename: "pic.png" }] });
    const anchor = path.join(ws, ".hilo/project-assets/pic.png");
    expect(statSync(anchor).ino).toBe(statSync(src).ino);
    expect((await anchorOf([{ path: src, assetId: "a1", projectFolderName: "项目A" }])).body.anchored[0].path).toBe(".hilo/project-assets/pic.png");
    expect((await http.get("/api/assets")).body.assets).toEqual([]);
  });

  it("同名的另一个文件锚成 pic(1).png；老写法只给 paths 也能锚", async () => {
    const other = mkdtempSync(path.join(tmpdir(), "ov-other-"));
    writeFileSync(path.join(other, "pic.png"), "different");
    const r = await http.post("/api/files/anchor-project-asset").send({ paths: [path.join(other, "pic.png")] });
    expect(r.body.anchored).toEqual([{ path: ".hilo/project-assets/pic(1).png", filename: "pic(1).png" }]);
  });

  it("逐条报错：相对路径、目录、不安全的项目名", async () => {
    const r = await anchorOf([
      { path: "relative.png" },
      { path: proj.assets },
      { path: path.join(proj.assets, "clip.mp4"), assetId: "a2", projectFolderName: "../x" },
    ]);
    expect(r.body.anchored).toEqual([]);
    expect(r.body.errors.map((e: any) => e.error)).toEqual(["Path must be absolute", "Only regular files can be anchored", "Invalid projectFolderName"]);
    expect((await http.post("/api/files/anchor-project-asset").send({ items: [{ path: 1 }] })).status).toBe(400);
  });

  it("project-asset-mention-search：只搜锚点，按文件名模糊匹配；锚定后立刻搜得到", async () => {
    expect((await projectSearch("pic")).items.map((i: any) => i.path)).toEqual([".hilo/project-assets/pic.png", ".hilo/project-assets/pic(1).png"]);
    expect((await projectSearch("clip")).items).toEqual([]);
    await anchorOf([{ path: path.join(proj.assets, "clip.mp4"), assetId: "a2", projectFolderName: "项目A" }]);
    expect((await projectSearch("clip")).items[0]).toMatchObject({ name: "clip.mp4", kind: "video" });
    expect((await http.get("/api/files/project-asset-mention-search?limit=500")).status).toBe(400);
  });

  it("propagate：内容替换 → 重新链接；换 id → 台账跟着换；删除 → 锚点删掉、搜索里消失", async () => {
    const src = path.join(proj.assets, "pic.png");
    writeFileSync(`${src}.part`, "new bytes");
    renameSync(`${src}.part`, src);
    const r1 = await http.post("/api/files/project-asset-propagate").send({ events: [{ type: "content-replaced", assetId: "a1", projectFolderName: "项目A", sourcePath: src }] });
    expect(r1.body).toMatchObject({ ok: true, relinked: 1, failed: 0 });
    expect(readFileSync(path.join(ws, ".hilo/project-assets/pic.png"), "utf8")).toBe("new bytes");

    const r2 = await http.post("/api/files/project-asset-propagate").send({ events: [{ type: "rekeyed", assetId: "cloud-1", previousAssetId: "a1", projectFolderName: "项目A" }] });
    expect(r2.body).toMatchObject({ rekeyed: 1 });

    const r3 = await http.post("/api/files/project-asset-propagate").send({
      events: [
        { type: "deleted", assetId: "cloud-1", projectFolderName: "项目A" },
        { type: "deleted", assetId: "unknown", projectFolderName: "项目A" },
        { type: "rekeyed", assetId: "x", projectFolderName: "项目A" },
      ],
    });
    expect(r3.body).toMatchObject({ removed: 1, noop: 1, failed: 1 });
    expect(existsSync(path.join(ws, ".hilo/project-assets/pic.png"))).toBe(false);
    expect((await projectSearch("pic")).items.map((i: any) => i.path)).toEqual([".hilo/project-assets/pic(1).png"]);
    expect((await http.post("/api/files/project-asset-propagate").send({ events: [{ type: "moved", assetId: "a", projectFolderName: "p" }] })).status).toBe(400);
  });

  it("开机对账：项目索引里没了的删锚点，源文件变了的重新链接", async () => {
    const svc = app.get(ProjectAssetAnchors);
    const clip = path.join(proj.assets, "clip.mp4");
    writeFileSync(`${clip}.part`, "clip v2");
    renameSync(`${clip}.part`, clip);
    expect(await svc.reconcile()).toMatchObject({ relinked: 1, removed: 0 });
    expect(readFileSync(path.join(ws, ".hilo/project-assets/clip.mp4"), "utf8")).toBe("clip v2");
    proj.db.prepare("DELETE FROM asset_entries WHERE id = 'a2'").run();
    // 同一个 inode 的文件还在索引里别的 id 下吗？不在 —— 当作删了。
    renameSync(clip, `${clip}.gone`);
    expect(await svc.reconcile()).toMatchObject({ removed: 1 });
    expect(existsSync(path.join(ws, ".hilo/project-assets/clip.mp4"))).toBe(false);
  });

  it("track 一个锚点：落成一份普通工作区文件再登记，锚点本身不进库；再来一次复用", async () => {
    const r = await http.post("/api/files/track").send({ path: ".hilo/project-assets/pic(1).png" });
    expect(r.body).toMatchObject({ ok: true, path: "pic(1).png" });
    expect(readFileSync(path.join(ws, "pic(1).png"), "utf8")).toBe("different");
    expect((await http.post("/api/files/track").send({ path: ".hilo/project-assets/pic(1).png" })).body.id).toBe(r.body.id);
    expect((await http.post("/api/files/track").send({ path: ".hilo/project-assets/没有.png" })).status).toBe(404);
  });

  describe("mention-search", () => {
    const search = (q: string, extra = "") => http.get(`/api/files/mention-search?workspace=${encodeURIComponent(ws)}&q=${encodeURIComponent(q)}${extra}`);

    it("按相对路径模糊匹配；.gitignore（含子目录的）、node_modules、.hilo 都不进候选", async () => {
      mkdirSync(path.join(ws, "scripts/gen"), { recursive: true });
      mkdirSync(path.join(ws, "node_modules/pkg"), { recursive: true });
      mkdirSync(path.join(ws, "logs"), { recursive: true });
      writeFileSync(path.join(ws, "scripts/story.md"), "x");
      writeFileSync(path.join(ws, "scripts/gen/story-draft.md"), "x");
      writeFileSync(path.join(ws, "scripts/gen/.gitignore"), "*.tmp\n");
      writeFileSync(path.join(ws, "scripts/gen/story.tmp"), "x");
      writeFileSync(path.join(ws, "node_modules/pkg/story.md"), "x");
      writeFileSync(path.join(ws, "logs/story.log"), "x");
      writeFileSync(path.join(ws, ".gitignore"), "logs/\n");
      const r = await search("story");
      expect(r.status).toBe(200);
      const paths = r.body.items.map((i: any) => i.path);
      expect(paths).toEqual(expect.arrayContaining(["scripts/story.md", "scripts/gen/story-draft.md"]));
      expect(paths.some((p: string) => p.includes("node_modules") || p.includes("logs/") || p.endsWith(".tmp") || p.startsWith(".hilo"))).toBe(false);
      expect(r.body.items[0]).toMatchObject({ path: "scripts/story.md", kind: "text" });
      expect(r.body.items[0].score).toBeGreaterThan(0);
      expect(r.body.truncated).toBe(false);
    });

    it("空查询按修改时间给最近的；limit 生效", async () => {
      const r = await search("", "&limit=2");
      expect(r.body.items).toHaveLength(2);
      expect(r.body.items[0].mtimeMs).toBeGreaterThanOrEqual(r.body.items[1].mtimeMs);
    });

    it("workspace 必须是存在的绝对目录；limit 超范围 400", async () => {
      expect((await http.get("/api/files/mention-search?workspace=relative&q=a")).status).toBe(400);
      expect((await http.get("/api/files/mention-search?q=a")).status).toBe(400);
      expect((await http.get(`/api/files/mention-search?workspace=${encodeURIComponent(path.join(ws, "nope"))}`)).status).toBe(400);
      expect((await search("a", "&limit=0")).status).toBe(400);
    });
  });
});
