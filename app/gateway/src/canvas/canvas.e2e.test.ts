import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../bootstrap.js";
import { GatewayEventBus } from "../common/gateway-event-bus.js";

const PNG = Buffer.from(
  "89504e470d0a1a0a0000000d4948445200000001000000010806000000" +
    "1f15c4890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082",
  "hex",
);

describe("canvas（真实工作区）", () => {
  let app: INestApplication;
  let ws: string;
  let http: ReturnType<typeof request>;
  const events: any[] = [];

  beforeAll(async () => {
    ws = mkdtempSync(path.join(tmpdir(), "ov-canvas-e2e-"));
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

  it("空画布", async () => {
    expect((await http.get("/api/canvas")).body).toEqual({ version: 1, mode: "workflow", nodes: [], edges: [] });
  });

  let imageNode = "";
  it("media-node：放上画布，第二次复用；没入库 404；文本类型 400", async () => {
    await http.post("/api/upload").attach("file", PNG, "cat.png");
    const a = await http.post("/api/canvas/media-node").send({ assetPath: "cat.png" });
    expect(a.status).toBe(201);
    expect(a.body).toMatchObject({ assetType: "image", reused: false });
    imageNode = a.body.nodeId;
    expect((await http.post("/api/canvas/media-node").send({ assetPath: "cat.png" })).body).toMatchObject({ nodeId: imageNode, reused: true });
    expect((await http.post("/api/canvas/media-node").send({ assetPath: "nope.png" })).status).toBe(404);
    await http.put("/api/files/content").send({ path: "note.md", content: "x" });
    expect((await http.post("/api/canvas/media-node").send({ assetPath: "note.md" })).status).toBe(400);
  });

  let textNode = "";
  let hash = "";
  it("text-node：新建落在根目录；详情带内容和哈希", async () => {
    const r = await http.post("/api/canvas/text-node").send({ content: "第一场：白天。", name: "分镜", sourceNodeIds: [imageNode] });
    expect(r.body).toMatchObject({ path: "分镜.md", created: true, contentLength: 7 });
    textNode = r.body.nodeId;
    expect(readFileSync(path.join(ws, "分镜.md"), "utf8")).toBe("第一场：白天。");
    const d = (await http.post("/api/canvas/nodes/detail").send({ nodeIds: [textNode, "ghost"] })).body;
    expect(d.missing).toEqual(["ghost"]);
    expect(d.nodes[0]).toMatchObject({ type: "text", textContent: "第一场：白天。", incomingEdges: [{ source: imageNode, target: textNode }] });
    hash = d.nodes[0].textContentHash;
    // 同名再建一个：name(1).md
    expect((await http.post("/api/canvas/text-node").send({ content: "y", name: "分镜" })).body.path).toBe("分镜(1).md");
    // mode 只能用在已有节点上。
    expect((await http.post("/api/canvas/text-node").send({ content: "y", mode: "append" })).status).toBe(400);
  });

  it("text-node 更新：哈希对不上 409；append 按换行接上", async () => {
    const bad = await http.post("/api/canvas/text-node").send({ nodeId: textNode, content: "x", expectedContentHash: "0".repeat(64) });
    expect(bad.status).toBe(409);
    expect(bad.body.message).toMatch(/current contentHash: [0-9a-f]{64}/);
    const ok = await http.post("/api/canvas/text-node").send({ nodeId: textNode, content: "第二场：夜晚。", mode: "append", expectedContentHash: hash });
    expect(ok.body).toMatchObject({ nodeId: textNode, created: false });
    expect(readFileSync(path.join(ws, "分镜.md"), "utf8")).toBe("第一场：白天。\n第二场：夜晚。");
    expect(events.at(-1)).toMatchObject({ type: "canvas_updated", origin: "mcp-write" });
  });

  it("apply-edits：成功改写；旧哈希回 conflict（不是 409）", async () => {
    const d = (await http.post("/api/canvas/nodes/detail").send({ nodeIds: [textNode] })).body.nodes[0];
    const r = await http
      .post("/api/canvas/text-node/apply-edits")
      .send({ nodeId: textNode, expectedContentHash: d.textContentHash, edits: [{ annotationId: "a", exact: "夜晚", replacement: "黄昏" }] });
    expect(r.body).toMatchObject({ status: "applied", origin: "agent" });
    expect(readFileSync(path.join(ws, "分镜.md"), "utf8")).toContain("黄昏");
    const stale = await http
      .post("/api/canvas/text-node/apply-edits")
      .send({ nodeId: textNode, expectedContentHash: d.textContentHash, edits: [{ annotationId: "a", exact: "黄昏", replacement: "x" }] });
    expect(stale.status).toBe(201);
    expect(stale.body.results[0]).toMatchObject({ status: "conflict", reason: "version_changed" });
  });

  it("渲染层交了旧快照：gateway 刚加的节点补回去，并以 reconcile 广播", async () => {
    const before = (await http.get("/api/canvas")).body;
    // 渲染层只见过图片节点。
    const stale = { ...before, nodes: before.nodes.filter((n: any) => n.id === imageNode), edges: [] };
    events.length = 0;
    const r = await http.post("/api/canvas").send(stale);
    expect(r.status).toBe(201);
    const after = (await http.get("/api/canvas")).body;
    expect(after.nodes.map((n: any) => n.id).sort()).toEqual(before.nodes.map((n: any) => n.id).sort());
    expect(events.find((e) => e.origin === "reconcile")?.addedNodes?.length).toBeGreaterThan(0);
  });

  it("渲染层确认之后，没有删除证据的缺失就是 409；带证据才删得掉", async () => {
    const c = (await http.get("/api/canvas")).body;
    await http.post("/api/canvas").send(c); // 这次包含全部节点 = 确认
    const without = { ...c, nodes: c.nodes.filter((n: any) => n.id !== textNode), edges: c.edges.filter((e: any) => e.target !== textNode) };
    const bad = await http.post("/api/canvas").send(without);
    expect(bad.status).toBe(409);
    expect(bad.body).toMatchObject({ code: "CANVAS_DESTRUCTIVE_SAVE_REJECTED", reason: "missing_deletion_evidence" });
    const ok = await http.post("/api/canvas").send({ ...without, deletionIntent: { operationId: "op-1", removedNodeIds: [textNode] } });
    expect(ok.status).toBe(201);
    expect((await http.get("/api/canvas")).body.nodes.some((n: any) => n.id === textNode)).toBe(false);
  });

  it("分组 / 解组：子节点坐标相对组，解组后回到原来的绝对位置", async () => {
    const t = await http.post("/api/canvas/text-node").send({ content: "z", name: "旁白" });
    const before = (await http.get("/api/canvas")).body;
    const abs = (id: string) => before.nodes.find((n: any) => n.id === id).positions.workflow;
    const g = await http.post("/api/canvas/group").send({ nodeIds: [imageNode, t.body.nodeId], label: "  第一组  " });
    expect(g.body.groupId).toMatch(/^group-/);
    const mid = (await http.get("/api/canvas")).body;
    const group = mid.nodes.find((n: any) => n.id === g.body.groupId);
    expect(group.data.label).toBe("第一组");
    expect(mid.nodes.find((n: any) => n.id === imageNode).parentId).toBe(g.body.groupId);
    const u = await http.post("/api/canvas/ungroup").send({ groupId: g.body.groupId });
    expect(u.body).toMatchObject({ removed: true, removedNodeIds: [g.body.groupId] });
    const after = (await http.get("/api/canvas")).body;
    expect(after.nodes.find((n: any) => n.id === imageNode).positions.workflow).toEqual(abs(imageNode));
    expect(after.nodes.find((n: any) => n.id === imageNode).parentId).toBeUndefined();
  });

  it("占位卡：创建 → 失败（204）→ 清理", async () => {
    const p = await http.post("/api/canvas/placeholder").send({ sourceNodeId: imageNode, prompt: "变成油画", model: "img", mediaType: "image" });
    expect(p.status).toBe(201);
    const id = p.body.placeholderId;
    let c = (await http.get("/api/canvas")).body;
    expect(c.nodes.find((n: any) => n.id === id).data).toMatchObject({ status: "generating", aspectRatio: "1:1" });
    expect(c.edges.some((e: any) => e.id === `${imageNode}->${id}`)).toBe(true);
    expect((await http.post("/api/canvas/placeholder/fail").send({ placeholderId: id, errorMessage: "平台超时了" })).status).toBe(204);
    c = (await http.get("/api/canvas")).body;
    expect(c.nodes.find((n: any) => n.id === id).data.status).toBe("error");
    expect((await http.post("/api/canvas/placeholder/cleanup").send({ placeholderId: id })).status).toBe(204);
    expect((await http.get("/api/canvas")).body.nodes.some((n: any) => n.id === id)).toBe(false);
    expect((await http.post("/api/canvas/placeholder").send({ sourceNodeId: "ghost", prompt: "x", model: "m" })).body.code).toBe(
      "PLACEHOLDER_SOURCE_NOT_FOUND",
    );
  });

  it("nodes/delete 带走相连的边；不存在的 id 什么都不做", async () => {
    const t = await http.post("/api/canvas/text-node").send({ content: "q", sourceNodeIds: [imageNode] });
    const r = await http.post("/api/canvas/nodes/delete").send({ nodeIds: [t.body.nodeId] });
    expect(r.body).toEqual({ removedNodeIds: [t.body.nodeId], removedEdgeIds: [`${imageNode}->${t.body.nodeId}`] });
    expect((await http.post("/api/canvas/nodes/delete").send({ nodeIds: ["ghost"] })).body).toEqual({ removedNodeIds: [], removedEdgeIds: [] });
  });

  it("列表、搜索、聚焦、选中、安全检查", async () => {
    const list = (await http.get("/api/canvas/nodes?type=image")).body;
    expect(list.nodes[0]).toMatchObject({ id: imageNode, type: "image", name: "cat.png" });
    expect((await http.get("/api/canvas/search?query=CAT")).body.matches[0]).toMatchObject({ id: imageNode, matchedField: "name" });
    expect((await http.post("/api/canvas/focus").send({ nodeIds: [imageNode, "ghost"] })).body).toEqual({ focused: [imageNode], missing: ["ghost"] });
    expect((await http.post("/api/canvas/selection").send({ nodeIds: [imageNode, "ghost"] })).status).toBe(204);
    expect((await http.get("/api/canvas/selection")).body.nodeIds).toEqual([imageNode]);
    expect((await http.post("/api/safety/check-text").send({ content: "hi" })).body).toEqual({ pass: true, decision: "bypass" });
    expect((await http.post("/api/safety/check-text").send({ content: 1 })).status).toBe(400);
  });
});
