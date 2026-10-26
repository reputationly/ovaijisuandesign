import { lstat, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../bootstrap.js";

describe("资产中心", () => {
  let app: INestApplication;
  let dir = "";
  let source = "";

  beforeAll(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "ov-asset-center-"));
    source = path.join(dir, "face.png");
    await writeFile(source, Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64"));
    process.env.HILO_ASSET_CENTER_DIR = path.join(dir, "center");
    process.env.HILO_DATA_DIR = dir;
    process.env.WORKSPACE_DIR = dir;
    app = await createApp();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    delete process.env.HILO_ASSET_CENTER_DIR;
    // 产品侧已经补了 `onModuleDestroy` 关库；这里就**恢复成严格删除**：
    // 删不掉说明句柄又漏了，必须红，不能被"尽力而为"盖住。
    await rm(dir, { recursive: true, force: true });
  });

  it("从本地文件建实体，列表能看到缩略图，删掉后不再出现", async () => {
    const http = request(app.getHttpServer());
    expect((await http.get("/api/asset-center/library-status")).body).toEqual({ initialized: false });
    const created = await http.post("/api/asset-center/entities-from-paths").send({ type: "character", name: "阿兰", files: [{ absolutePath: source, user_desc: "正面" }] });
    expect(created.status).toBe(201);
    expect(created.body.entity).toMatchObject({ type: "character", name: "阿兰" });
    const listed = await http.get("/api/asset-center/entities?type=character");
    expect(listed.body.entities).toEqual([expect.objectContaining({ name: "阿兰", thumbnailUrl: expect.stringContaining("/api/asset-center/attachments/") })]);
    const canvas = await http.get(`/api/asset-center/entities/${created.body.entity.id}?fields=canvas`);
    expect(canvas.body.entity.attachments[0]).toMatchObject({ originalFilename: "face.png", kind: "image", meta: { user_desc: "正面" } });
    const blob = await http.get(listed.body.entities[0].thumbnailUrl);
    expect(blob.status).toBe(200);
    expect(blob.body.equals(await readFile(source))).toBe(true);
    const renamed = await http.patch(`/api/asset-center/entities/${created.body.entity.id}`).send({ name: "阿兰 2" });
    expect(renamed.body.entity.name).toBe("阿兰 2");
    const removed = await http.delete(`/api/asset-center/entities/${created.body.entity.id}`);
    expect(removed.body.trashedBlobs).toBe(1);
    expect((await http.get("/api/asset-center/entities")).body.entities).toEqual([]);
    expect((await http.get(`/api/asset-center/entities/${created.body.entity.id}`)).status).toBe(404);
    expect((await http.delete(`/api/asset-center/entities/${created.body.entity.id}`)).body).toEqual({ trashedBlobs: 0, trashFailed: 0, cleanedWorkspaces: 0 });
  });

  it("材质化进工作区是一条链接，拆掉链接后实体还在", async () => {
    const http = request(app.getHttpServer());
    const workspace = path.join(dir, "ws");
    const created = await http.post("/api/asset-center/entities-from-paths").send({ type: "scene", name: "码头", description: "夜景", files: [{ absolutePath: source }] });
    const id = created.body.entity.id as string;
    const placed = await http.post(`/api/asset-center/entities/${id}/materialize`).send({ workspacePath: workspace });
    expect(placed.body.agentPayload.attachments[0]).toMatchObject({ filename: "face.png", kind: "image" });
    const linked = placed.body.agentPayload.attachments[0].path as string;
    expect(linked).toBe(path.join(workspace, ".hilo", "materialized-entities", id, "face.png"));
    expect((await lstat(path.dirname(linked))).isSymbolicLink()).toBe(true);
    expect(await readFile(linked)).toEqual(await readFile(source));
    expect((await http.get(`/api/asset-center/entities/${id}`)).body.entity.useCount).toBe(1);
    expect((await http.get(`/api/asset-center/workspace-refs?workspace=${encodeURIComponent(workspace)}`)).body.refs).toEqual([expect.objectContaining({ entityId: id })]);
    expect((await http.delete(`/api/asset-center/entities/${id}/materialize`).query({ workspace })).body).toEqual({ ok: true });
    await expect(lstat(path.dirname(linked))).rejects.toMatchObject({ code: "ENOENT" });
    expect((await http.get("/api/asset-center/entities?type=scene")).body.entities).toEqual([expect.objectContaining({ id, name: "码头" })]);
    await http.post(`/api/asset-center/entities/${id}/materialize`).send({ workspacePath: workspace });
    const removed = await http.delete(`/api/asset-center/entities/${id}`);
    expect(removed.body.cleanedWorkspaces).toBe(1);
    await expect(lstat(path.dirname(linked))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("封面地址指向附件库里的图", async () => {
    const http = request(app.getHttpServer());
    const created = await http.post("/api/asset-center/entities-from-paths").send({ type: "style_pack", name: "夜", files: [{ absolutePath: source }] });
    const id = created.body.entity.id as string;
    const canvas = await http.get(`/api/asset-center/entities/${id}?fields=canvas`);
    const blobPath = canvas.body.entity.attachments[0].blobPath as string;
    const patched = await http.patch(`/api/asset-center/entities/${id}`).send({ metadata: { coverBlobPath: blobPath } });
    expect(patched.body.entity.coverUrl).toContain(`/api/asset-center/entities/${id}/cover`);
    const cover = await http.get(patched.body.entity.coverUrl);
    expect(cover.status).toBe(200);
    expect(cover.body.equals(await readFile(source))).toBe(true);
    const small = await http.get(`/api/asset-center/entities/${id}/cover`).query({ w: 32 });
    expect(small.status).toBe(200);
    expect(small.body.subarray(0, 4).equals(Buffer.from([137, 80, 78, 71]))).toBe(true);
    expect((await http.get("/api/asset-center/entities/missing/cover")).status).toBe(404);
  });

  it("工作区文件可以挂到已有实体上，搜索按名字命中", async () => {
    const http = request(app.getHttpServer());
    const extra = path.join(dir, "灯罩.png");
    await writeFile(extra, await readFile(source));
    const created = await http.post("/api/asset-center/entities").send({ type: "prop", name: "台灯", description: "暖光" });
    const id = created.body.entity.id as string;
    const added = await http.post(`/api/asset-center/entities/${id}/attachments-from-workspace`).send({ workspaceRelPath: "灯罩.png", user_desc: "侧面" });
    expect(added.status).toBe(201);
    expect(added.body.attachment).toMatchObject({ originalFilename: "灯罩.png", kind: "image", meta: { user_desc: "侧面" } });
    expect((await http.get("/api/asset-center/search").query({ q: "台灯" })).body.entities).toEqual([expect.objectContaining({ id, name: "台灯" })]);
    expect((await http.get("/api/asset-center/search")).status).toBe(400);
    expect((await http.post(`/api/asset-center/entities/${id}/attachments-from-workspace`).send({ workspaceRelPath: "../secret.png" })).status).toBe(400);
  });

  it("拖到画布会落成节点，两张以上围成一组", async () => {
    const http = request(app.getHttpServer());
    const second = path.join(dir, "side.png");
    await writeFile(second, await readFile(source));
    const created = await http.post("/api/asset-center/entities-from-paths").send({
      type: "prop",
      name: "灯",
      files: [
        { absolutePath: source, user_desc: "主灯" },
        { absolutePath: second },
      ],
    });
    const id = created.body.entity.id as string;
    const dropped = await http.post(`/api/asset-center/entities/${id}/drop-to-canvas`).send({ position: { x: 40, y: 80 } });
    expect(dropped.body.ok).toBe(true);
    expect(dropped.body.nodeIds).toHaveLength(2);
    expect(typeof dropped.body.groupId).toBe("string");
    const canvas = await http.get("/api/canvas");
    const nodes = canvas.body.nodes as Array<{ id: string; type: string; data?: { description?: string; label?: string }; positions?: { workflow?: { x: number; y: number } } }>;
    expect(nodes.find((node) => node.id === dropped.body.groupId)).toMatchObject({ type: "group", data: { label: "灯" }, positions: { workflow: { x: 40, y: 80 } } });
    expect(nodes.find((node) => node.id === dropped.body.nodeIds[0])).toMatchObject({ type: "image", parentId: dropped.body.groupId, data: { description: "主灯" }, positions: { workflow: { x: 24, y: 48 } } });
    process.env.HILO_PROJECT_ARCHITECTURE = "resource_v3";
    expect((await http.post(`/api/asset-center/entities/${id}/drop-to-canvas`).send({})).status).toBe(403);
    delete process.env.HILO_PROJECT_ARCHITECTURE;
  });
});
