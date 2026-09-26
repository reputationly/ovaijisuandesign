import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createApp } from "../bootstrap.js";
import { GatewayEventBus } from "../common/gateway-event-bus.js";

const PNG = Buffer.from(
  "89504e470d0a1a0a0000000d4948445200000001000000010806000000" +
    "1f15c4890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082",
  "hex",
);

describe("文件面板操作（真实工作区）", () => {
  let app: INestApplication;
  let ws: string;
  let http: ReturnType<typeof request>;
  const events: any[] = [];

  beforeAll(async () => {
    ws = mkdtempSync(path.join(tmpdir(), "ov-fileops-"));
    process.env.WORKSPACE_DIR = ws;
    app = await createApp();
    await app.init();
    http = request(app.getHttpServer());
    app.get(GatewayEventBus).subscribe((m) => events.push(m.payload));
  });
  afterAll(async () => {
    await app.close();
    delete process.env.WORKSPACE_DIR;
  });
  beforeEach(() => {
    events.length = 0;
  });

  const assetAt = async (p: string) => (await http.get(`/api/assets?path=${encodeURIComponent(p)}`)).body.assets[0];
  const undo = () => http.post("/api/operations/undo");
  /** 单条和合批的资产事件摊平成一个列表。 */
  const assetEvents = () => events.flatMap((e) => (e.type === "assets_changed_batch" ? e.events : e.type === "asset_changed" ? [e] : []));

  it("mkdir：建出来、发 dirs_changed；越界和 .hilo 一律 400", async () => {
    expect((await http.post("/api/files/mkdir").send({ path: "素材/角色" })).body).toEqual({ ok: true });
    expect(existsSync(path.join(ws, "素材/角色"))).toBe(true);
    expect(events).toContainEqual({ type: "dirs_changed", path: "素材/角色", change: "added" });
    expect((await http.post("/api/files/mkdir").send({ path: "../外面" })).status).toBe(400);
    expect((await http.post("/api/files/mkdir").send({ path: "/tmp/abs-outside" })).status).toBe(400);
    expect((await http.post("/api/files/mkdir").send({ path: ".hilo/x" })).status).toBe(400);
    expect((await http.post("/api/files/mkdir").send({})).status).toBe(400);
  });

  it("dirs：递归列出，跳过点开头的目录", async () => {
    mkdirSync(path.join(ws, ".secret/inner"), { recursive: true });
    const r = await http.get("/api/files/dirs");
    expect(r.body.ok).toBe(true);
    expect(r.body.dirs).toEqual(expect.arrayContaining(["素材", "素材/角色"]));
    expect(r.body.dirs.some((d: string) => d.startsWith(".") || d.includes("/."))).toBe(false);
  });

  it("check-conflicts：报出被占的名字和占用者的类型；名字带分隔符 400", async () => {
    writeFileSync(path.join(ws, "素材/a.png"), PNG);
    const r = await http.post("/api/files/check-conflicts").send({
      items: [{ name: "a.png", kind: "file", sourcePath: "/x/a.png" }, { name: "角色", kind: "folder" }, { name: "free.png" }],
      targetDir: "素材",
    });
    expect(r.body).toEqual({
      ok: true,
      conflicts: [
        { name: "a.png", sourcePath: "/x/a.png", existingKind: "file" },
        { name: "角色", existingKind: "folder" },
      ],
    });
    expect((await http.post("/api/files/check-conflicts").send({ items: [{ name: "a/b" }] })).status).toBe(400);
    expect((await http.post("/api/files/check-conflicts").send({ items: [{ name: "x" }], targetDir: "../.." })).status).toBe(400);
  });

  let catId = "";
  it("rename：id 不变、发 renamed；同名自动加 (1)；带分隔符的新名字和越界都 400；不存在 404", async () => {
    const up = await http.post("/api/upload").field("folder", "素材").attach("file", PNG, "cat.png");
    catId = up.body.id;
    writeFileSync(path.join(ws, "素材/dog.png"), PNG);
    events.length = 0;
    const r = await http.post("/api/files/rename").send({ path: "素材/cat.png", new_name: "kitty.png" });
    expect(r.body).toEqual({ ok: true, new_path: "素材/kitty.png", new_name: "kitty.png" });
    expect((await assetAt("素材/kitty.png")).id).toBe(catId);
    expect(await assetAt("素材/cat.png")).toBeUndefined();
    expect(assetEvents()).toContainEqual(expect.objectContaining({ id: catId, change: "renamed", path: "素材/kitty.png", old_path: "素材/cat.png" }));

    const clash = await http.post("/api/files/rename").send({ path: "素材/kitty.png", new_name: "dog.png" });
    expect(clash.body).toEqual({ ok: true, new_path: "素材/dog(1).png", new_name: "dog(1).png" });
    expect(readFileSync(path.join(ws, "素材/dog.png"))).toEqual(PNG);
    await undo();
    expect(existsSync(path.join(ws, "素材/kitty.png"))).toBe(true);

    expect((await http.post("/api/files/rename").send({ path: "素材/kitty.png", new_name: "../x.png" })).status).toBe(400);
    expect((await http.post("/api/files/rename").send({ path: "../../etc/hosts", new_name: "x" })).status).toBe(400);
    expect((await http.post("/api/files/rename").send({ path: "素材/没有.png", new_name: "x.png" })).status).toBe(404);
  });

  it("rename 文件夹：里面的资产整体换前缀、id 不变；撤销改回去", async () => {
    const r = await http.post("/api/files/rename").send({ path: "素材", new_name: "图库" });
    expect(r.body.new_path).toBe("图库");
    expect((await assetAt("图库/kitty.png")).id).toBe(catId);
    expect(events).toContainEqual({ type: "dirs_changed", path: "图库", change: "added" });
    const u = await undo();
    expect(u.body).toMatchObject({ ok: true });
    expect(existsSync(path.join(ws, "素材/kitty.png"))).toBe(true);
    expect((await assetAt("素材/kitty.png")).id).toBe(catId);
  });

  it("move：目标可以是根目录的绝对路径（文件面板就这么传）；冲突 409 且整批回滚；挪进自己 400；撤销放回", async () => {
    const r = await http.post("/api/files/move").send({ paths: ["素材/kitty.png"], target: ws });
    expect(r.body).toEqual({ ok: true });
    expect((await assetAt("kitty.png")).id).toBe(catId);

    writeFileSync(path.join(ws, "素材/角色/dog.png"), PNG);
    writeFileSync(path.join(ws, "solo.png"), PNG);
    const clash = await http.post("/api/files/move").send({ paths: ["solo.png", "素材/dog.png"], target: "素材/角色" });
    expect(clash.status).toBe(409);
    // 第一个已经挪过去的被挪回来了。
    expect(existsSync(path.join(ws, "solo.png"))).toBe(true);
    expect(existsSync(path.join(ws, "素材/角色/solo.png"))).toBe(false);

    expect((await http.post("/api/files/move").send({ paths: ["素材"], target: "素材/角色" })).status).toBe(400);
    expect((await http.post("/api/files/move").send({ paths: ["kitty.png"], target: "../" })).status).toBe(400);
    expect((await http.post("/api/files/move").send({ paths: ["kitty.png"], target: "没有这个目录" })).status).toBe(404);

    expect((await undo()).body.ok).toBe(true);
    expect((await assetAt("素材/kitty.png")).id).toBe(catId);
  });

  it("copy：文件和文件夹都能复制，复制出来的登记进库；目标已有同名 409", async () => {
    mkdirSync(path.join(ws, "拷贝"), { recursive: true });
    expect((await http.post("/api/files/copy").send({ paths: ["素材/角色"], target: "拷贝" })).body).toEqual({ ok: true });
    expect(existsSync(path.join(ws, "拷贝/角色/dog.png"))).toBe(true);
    expect(await assetAt("拷贝/角色/dog.png")).toBeDefined();
    expect((await http.post("/api/files/copy").send({ paths: ["素材/角色"], target: "拷贝" })).status).toBe(409);
    expect((await http.post("/api/files/copy").send({ paths: ["素材/kitty.png"], target: "/" })).status).toBe(400);
  });

  it("duplicate：_copy、_copy_2，登记进库；撤销删掉复制出来的那份", async () => {
    const a = await http.post("/api/files/duplicate").send({ paths: ["素材/kitty.png"] });
    expect(a.body.duplicated[0]).toMatchObject({ src: "素材/kitty.png", dst: "素材/kitty_copy.png" });
    expect(a.body.duplicated[0].id).toBeTruthy();
    const b = await http.post("/api/files/duplicate").send({ paths: ["素材/kitty.png"] });
    expect(b.body.duplicated[0].dst).toBe("素材/kitty_copy_2.png");
    expect((await assetAt("素材/kitty_copy_2.png")).id).toBe(b.body.duplicated[0].id);
    expect((await undo()).body.ok).toBe(true);
    expect(existsSync(path.join(ws, "素材/kitty_copy_2.png"))).toBe(false);
    expect(await assetAt("素材/kitty_copy_2.png")).toBeUndefined();
    expect((await http.post("/api/files/duplicate").send({ paths: ["素材"] })).status).toBe(400);
    expect((await http.post("/api/files/duplicate").send({ paths: ["../x.png"] })).status).toBe(400);
  });

  it("删除文件夹：里面的资产一起软删除、发 removed；撤销按原 id 放回", async () => {
    mkdirSync(path.join(ws, "待删/子"), { recursive: true });
    writeFileSync(path.join(ws, "待删/子/x.png"), PNG);
    const id = (await http.post("/api/files/track").send({ path: "待删/子/x.png" })).body.id;
    events.length = 0;
    expect((await http.post("/api/files/delete").send({ paths: ["待删"] })).body).toEqual({ ok: true });
    expect(existsSync(path.join(ws, "待删"))).toBe(false);
    expect(await assetAt("待删/子/x.png")).toBeUndefined();
    expect(assetEvents()).toContainEqual(expect.objectContaining({ id, change: "removed" }));
    expect((await undo()).body.ok).toBe(true);
    expect((await assetAt("待删/子/x.png")).id).toBe(id);
  });

  it("撤销时原位置被占了：报 path-conflict，不覆盖", async () => {
    await http.post("/api/files/rename").send({ path: "solo.png", new_name: "solo2.png" });
    writeFileSync(path.join(ws, "solo.png"), "别人的");
    const u = await undo();
    expect(u.body).toMatchObject({ ok: false, errorType: "path-conflict" });
    expect(readFileSync(path.join(ws, "solo.png"), "utf8")).toBe("别人的");
  });

  it("fork-rename：另存一份独立资产（新 id、放根目录、记 forkedFrom）", async () => {
    const r = await http.post("/api/files/fork-rename").send({ path: "素材/kitty.png", new_name: "kitty 副本.png" });
    expect(r.body).toMatchObject({ ok: true, new_path: "kitty 副本.png", new_name: "kitty 副本.png", type: "image" });
    expect(r.body.new_id).not.toBe(catId);
    const meta = (await http.get(`/api/assets?path=${encodeURIComponent("kitty 副本.png")}&include=metadata`)).body.assets[0].metadata;
    expect(meta.forkedFrom).toBe(catId);
    const again = await http.post("/api/files/fork-rename").send({ path: "素材/kitty.png", new_name: "kitty 副本.png" });
    expect(again.body.new_path).toBe("kitty 副本(1).png");
    expect((await http.post("/api/files/fork-rename").send({ path: "没登记.png", new_name: "x.png" })).status).toBe(404);
  });

  it("import-external：拷进根目录并登记，同名加 (1)；相对路径和目录进 errors", async () => {
    const outside = mkdtempSync(path.join(tmpdir(), "ov-outside-"));
    writeFileSync(path.join(outside, "kitty.png"), PNG);
    const r = await http.post("/api/files/import-external").send({ paths: [path.join(outside, "kitty.png"), "relative.png", outside] });
    expect(r.body.imported).toHaveLength(1);
    expect(r.body.imported[0]).toMatchObject({ path: "kitty.png", type: "image", width: 1, height: 1 });
    expect(r.body.errors.map((e: any) => e.error)).toEqual(["Path must be absolute", "Directories are not supported"]);
    const again = await http.post("/api/files/import-external").send({ paths: [path.join(outside, "kitty.png")] });
    expect(again.body.imported[0].path).toBe("kitty(1).png");
  });

  it("track：登记已有文件（补 imported），重复调用同一个 id；不存在 404；越界 400", async () => {
    writeFileSync(path.join(ws, "手写.md"), "# 手写");
    const a = await http.post("/api/files/track").send({ path: "手写.md", description: "笔记" });
    expect(a.body).toMatchObject({ ok: true, path: "手写.md", type: "text", metadata: { model: "imported", description: "笔记" } });
    expect((await http.post("/api/files/track").send({ path: "手写.md" })).body.id).toBe(a.body.id);
    expect((await http.post("/api/files/track").send({ path: "没有.md" })).status).toBe(404);
    expect((await http.post("/api/files/track").send({ path: "../../etc/passwd" })).status).toBe(400);
  });

  it("GET /api/files：媒体文件列表，按类型过滤", async () => {
    const all = (await http.get("/api/files")).body;
    expect(all.folders).toEqual(expect.arrayContaining(["素材"]));
    expect(all.files.some((f: any) => f.path === "素材/kitty.png" && f.folder === "素材" && f.url === "/files/%E7%B4%A0%E6%9D%90/kitty.png")).toBe(true);
    const texts = (await http.get("/api/files?type=text&sort=name")).body.files;
    expect(texts.every((f: any) => f.type === "text")).toBe(true);
  });

  describe("画布", () => {
    let nodeId = "";
    it("add-node：节点带名字和路径，广播 origin=user-add；资产不存在 404", async () => {
      events.length = 0;
      const r = await http.post("/api/canvas/add-node").send({ assetId: catId, position: { x: 10.5, y: 20 } });
      expect(r.status).toBe(201);
      expect(r.body.ok).toBe(true);
      nodeId = r.body.nodeId;
      const node = (await http.get("/api/canvas")).body.nodes.find((n: any) => n.id === nodeId);
      expect(node).toMatchObject({ type: "image", assetId: catId, positions: { workflow: { x: 10.5, y: 20 } }, data: { name: "kitty.png", path: "素材/kitty.png" } });
      expect(events).toContainEqual(expect.objectContaining({ type: "canvas_updated", origin: "user-add", addedNodes: [expect.objectContaining({ id: nodeId })] }));
      expect((await http.post("/api/canvas/add-node").send({ assetId: "nope" })).status).toBe(404);
      expect((await http.post("/api/canvas/add-node").send({})).status).toBe(400);
    });

    it("add-node：targetNodeId 连一条新节点 → 目标的边；replaceNodeId 原地填", async () => {
      const dup = await http.post("/api/files/duplicate").send({ paths: ["素材/kitty.png"] });
      const r = await http.post("/api/canvas/add-node").send({ assetId: dup.body.duplicated[0].id, targetNodeId: nodeId });
      const c = (await http.get("/api/canvas")).body;
      expect(c.edges).toContainEqual(expect.objectContaining({ source: r.body.nodeId, target: nodeId }));
      const fill = await http.post("/api/canvas/add-node").send({ assetId: catId, replaceNodeId: r.body.nodeId });
      expect(fill.body.nodeId).toBe(r.body.nodeId);
      expect((await http.get("/api/canvas")).body.nodes.find((n: any) => n.id === r.body.nodeId).assetId).toBe(catId);
    });

    it("改名后画布节点上的名字跟着变", async () => {
      await http.post("/api/files/rename").send({ path: "素材/kitty.png", new_name: "tiger.png" });
      await new Promise((r) => setTimeout(r, 50));
      const node = (await http.get("/api/canvas")).body.nodes.find((n: any) => n.id === nodeId);
      expect(node.data).toMatchObject({ name: "tiger.png", path: "素材/tiger.png" });
    });

    it("recovery-result：只认 restored / failed", async () => {
      expect((await http.post("/api/canvas/recovery-result").send({ result: "restored", durationMs: 12.3, preservedCandidateNodeCount: 2 })).body).toEqual({ ok: true });
      expect((await http.post("/api/canvas/recovery-result").send({ result: "maybe" })).status).toBe(400);
    });
  });
});
