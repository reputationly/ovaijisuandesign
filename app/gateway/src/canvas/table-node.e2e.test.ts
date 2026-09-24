import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../bootstrap.js";
import { GatewayEventBus } from "../common/gateway-event-bus.js";

describe("POST /api/canvas/table-node", () => {
  let app: INestApplication;
  let ws: string;
  let http: ReturnType<typeof request>;
  const events: any[] = [];

  beforeAll(async () => {
    ws = mkdtempSync(path.join(tmpdir(), "ov-table-e2e-"));
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

  let tableId = "";
  let tablePath = "";
  it("新建：写 .htable、加节点、从来源连边", async () => {
    const text = await http.post("/api/canvas/text-node").send({ content: "角色表", name: "src" });
    const r = await http.post("/api/canvas/table-node").send({
      title: " 角色 ",
      sourceNodeIds: [text.body.nodeId],
      columns: [{ title: "名字" }, { title: "年龄", type: "number" }],
      rows: [{ cells: ["阿青", 18] }, { cells: ["老周"] }],
    });
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({ columnCount: 2, rowCount: 2, created: true });
    tableId = r.body.nodeId;
    tablePath = r.body.tablePath;
    expect(tablePath).toMatch(/^\.hilo\/tables\/[a-z0-9]+\.htable$/);
    const doc = JSON.parse(readFileSync(path.join(ws, tablePath), "utf8"));
    expect(doc.version).toBe(1);
    expect(Object.values(doc.rows[0].cells)).toEqual(["阿青", 18]);
    const c = (await http.get("/api/canvas")).body;
    expect(c.nodes.find((n: any) => n.id === tableId)).toMatchObject({ type: "table", size: { width: 350, height: 200 }, data: { tablePath, title: "角色" } });
    expect(c.edges).toContainEqual(expect.objectContaining({ source: text.body.nodeId, target: tableId, type: "derivation" }));
    expect(events.at(-1)).toMatchObject({ type: "canvas_updated", addedNodes: [{ id: tableId }] });
    // 能通过文件接口读回来（.hilo/tables 在放行名单里）
    expect((await http.get("/api/files/content").query({ path: tablePath })).status).toBe(200);
  });

  it("不带列时建一张空表", async () => {
    const r = await http.post("/api/canvas/table-node").send({});
    expect(r.body).toMatchObject({ columnCount: 1, rowCount: 0, created: true });
  });

  it("替换：整表重写，广播带 tableRevision；标题落盘", async () => {
    const r = await http.post("/api/canvas/table-node").send({ nodeId: tableId, title: "角色 v2", columns: [{ title: "名字" }], rows: [{ cells: ["阿青"] }] });
    expect(r.body).toEqual({ nodeId: tableId, tablePath, columnCount: 1, rowCount: 1, created: false });
    expect(JSON.parse(readFileSync(path.join(ws, tablePath), "utf8")).columns).toHaveLength(1);
    const ev = events.at(-1);
    expect(ev).toMatchObject({ type: "canvas_updated", origin: "mcp-write", updatedNodes: [{ id: tableId, data: { tablePath, title: "角色 v2", tableRevision: expect.any(Number) } }] });
    const saved = (await http.get("/api/canvas")).body.nodes.find((n: any) => n.id === tableId);
    expect(saved.data).toEqual({ tablePath, title: "角色 v2" });
  });

  it("替换的各种错误", async () => {
    expect((await http.post("/api/canvas/table-node").send({ nodeId: tableId })).status).toBe(400);
    expect((await http.post("/api/canvas/table-node").send({ nodeId: "ghost", columns: [{ title: "a" }] })).status).toBe(404);
    const text = (await http.get("/api/canvas")).body.nodes.find((n: any) => n.type === "text");
    const wrong = await http.post("/api/canvas/table-node").send({ nodeId: text.id, columns: [{ title: "a" }] });
    expect(wrong.status).toBe(400);
    expect(wrong.body.message).toMatch(/Node is not a table node/);
    // DTO 校验
    expect((await http.post("/api/canvas/table-node").send({ columns: [{ title: "a", type: "date" }] })).status).toBe(400);
    expect((await http.post("/api/canvas/table-node").send({ columns: [{ title: "a", width: 10 }] })).status).toBe(400);
    expect((await http.post("/api/canvas/table-node").send({ rowHeight: "huge" })).status).toBe(400);
  });
});
