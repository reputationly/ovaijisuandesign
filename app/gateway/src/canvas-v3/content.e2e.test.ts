import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../bootstrap.js";

describe("v3 画布内容", () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;
  let ws: string;

  beforeAll(async () => {
    ws = mkdtempSync(path.join(tmpdir(), "ov-content-"));
    process.env.WORKSPACE_DIR = ws;
    process.env.HILO_GATEWAY_ROLE = "workspace";
    process.env.HILO_PROJECT_ARCHITECTURE = "resource_v3";
    app = await createApp();
    await app.init();
    http = request(app.getHttpServer());
  });

  afterAll(async () => {
    await app.close();
    delete process.env.WORKSPACE_DIR;
    delete process.env.HILO_GATEWAY_ROLE;
    delete process.env.HILO_PROJECT_ARCHITECTURE;
  });

  it("按组合读出成员资源和版本", async () => {
    const created = await http.post("/api/project/compositions/commands").send({
      commandId: "content-cmp",
      actor: "human",
      command: { type: "composition.create", compositionType: null, name: "海报" },
    });
    const compositionId = created.body.compositionId as string;
    writeFileSync(path.join(ws, "poster.png"), "png");
    await http.post("/api/project/resources/commands").send({
      commandId: "content-res",
      actor: "human",
      command: { type: "resource.create", resourceId: "res_poster", payload: { name: "poster.png", kind: 2 } },
    });
    await http.post("/api/project/resources/commands").send({
      commandId: "content-ver",
      actor: "human",
      command: {
        type: "resource.update",
        resourceId: "res_poster",
        payload: { kind: "new_version", versionId: "ver_poster", baseVersionId: null, relativePath: "poster.png", source: "import", disposition: "adopted", dependencies: [] },
      },
    });
    await http.post("/api/project/compositions/commands").send({
      commandId: "content-member",
      actor: "human",
      expectedRevision: 1,
      command: {
        type: "composition.apply",
        compositionId,
        operations: [{ type: "member.add", member: { memberId: "mem-poster", role: "image", resource: "res_poster" } }],
      },
    });
    const content = await http.post("/api/v3/canvas/content").send({ compositionIds: [compositionId] });
    expect(content.status).toBe(200);
    expect(content.body.items[0]).toMatchObject({
      compositionId,
      state: "ready",
      title: "海报",
      revision: 2,
      protected: false,
    });
    expect(content.body.items[0].members).toEqual([{ memberId: "mem-poster", role: "image", resource: "res_poster" }]);
    expect(content.body.items[0].resources.res_poster).toMatchObject({
      kind: "image",
      availability: "available",
      currentVersionId: "ver_poster",
      versions: [{ versionId: "ver_poster", ordinal: 1, availability: "available" }],
    });
    const missing = await http.post("/api/v3/canvas/content").send({ compositionIds: ["cmp_missing"] });
    expect(missing.body.items[0]).toEqual({ compositionId: "cmp_missing", state: "missing" });
  });

  it("画布可以放下指向现有版本的组合节点，不存在的版本会被拒绝", async () => {
    const created = await http.post("/api/project/compositions/commands").send({
      commandId: "node-cmp",
      actor: "human",
      command: { type: "composition.create", compositionType: null, name: "节点" },
    });
    const compositionId = created.body.compositionId as string;
    writeFileSync(path.join(ws, "node.png"), "png");
    await http.post("/api/project/resources/commands").send({
      commandId: "node-res",
      actor: "human",
      command: { type: "resource.create", resourceId: "res_node", payload: { name: "node.png", kind: 2 } },
    });
    await http.post("/api/project/resources/commands").send({
      commandId: "node-ver",
      actor: "human",
      command: {
        type: "resource.update",
        resourceId: "res_node",
        payload: { kind: "new_version", versionId: "ver_node", baseVersionId: null, relativePath: "node.png", source: "import", disposition: "adopted", dependencies: [] },
      },
    });
    await http.post("/api/project/compositions/commands").send({
      commandId: "node-member",
      actor: "human",
      expectedRevision: 1,
      command: { type: "composition.apply", compositionId, operations: [{ type: "member.add", member: { memberId: "mem-node", role: "image", resource: "res_node" } }] },
    });
    const base = { parentId: null, position: { x: 0, y: 0 }, size: { width: 350, height: 350 }, zIndex: 1, hidden: false };
    const node = { ...base, id: "n1", kind: "composition", compositionId, activeItem: { type: "version", resourceId: "res_node", versionId: "ver_node" }, draft: null };
    const placed = await http.post("/api/v3/canvas/commands").send({
      commandId: "place-n1",
      expectedRevision: 0,
      command: { type: "canvas.patch", nodes: [{ id: "n1", before: null, after: node }], edges: [] },
    });
    expect(placed.status).toBe(200);
    expect(placed.body.document.nodes.n1.compositionId).toBe(compositionId);
    const bad = { ...node, id: "n2", activeItem: { type: "version", resourceId: "res_node", versionId: "ver_missing" } };
    const rejected = await http.post("/api/v3/canvas/commands").send({
      commandId: "place-n2",
      expectedRevision: 1,
      command: { type: "canvas.patch", nodes: [{ id: "n2", before: null, after: bad }], edges: [] },
    });
    expect(rejected.status).toBe(409);
    expect(rejected.body.code).toBe("CANVAS_V3_ITEM_UNAVAILABLE");
  });

  it("只列出代理写过、并且已经挂上资源的组合", async () => {
    const human = await http.post("/api/project/compositions/commands").send({
      commandId: "feed-human",
      actor: "human",
      command: { type: "composition.create", compositionType: null, name: "人手" },
    });
    await http.post("/api/project/compositions/commands").send({
      commandId: "feed-human-member",
      actor: "human",
      expectedRevision: 1,
      command: { type: "composition.apply", compositionId: human.body.compositionId, operations: [{ type: "member.add", member: { memberId: "mem-human", role: "image", resource: "res_poster" } }] },
    });
    const agent = await http.post("/api/project/compositions/commands").send({
      commandId: "feed-agent",
      actor: "agent",
      command: { type: "composition.create", compositionType: null, name: "代理" },
    });
    await http.post("/api/project/compositions/commands").send({
      commandId: "feed-agent-member",
      actor: "agent",
      expectedRevision: 1,
      command: { type: "composition.apply", compositionId: agent.body.compositionId, operations: [{ type: "member.add", member: { memberId: "mem-agent", role: "image", resource: "res_poster" } }] },
    });
    const empty = await http.post("/api/project/compositions/commands").send({
      commandId: "feed-empty",
      actor: "agent",
      command: { type: "composition.create", compositionType: null, name: "空的" },
    });
    const upload = await http.post("/api/project/compositions/commands").send({
      commandId: "chat-upload:turn:composition",
      actor: "human",
      command: { type: "composition.create", compositionType: null, name: "上传" },
    });
    await http.post("/api/project/compositions/commands").send({
      commandId: "feed-upload-member",
      actor: "human",
      expectedRevision: 1,
      command: { type: "composition.apply", compositionId: upload.body.compositionId, operations: [{ type: "member.add", member: { memberId: "mem-upload", role: "file", resource: "res_upload_missing" } }] },
    });
    const feed = await http.get("/api/v3/canvas/agent-compositions").query({ since: "0", limit: "50" });
    expect(feed.status).toBe(200);
    expect(feed.body.items).toEqual([
      { seq: expect.any(Number), compositionId: agent.body.compositionId, kind: "image" },
      { seq: expect.any(Number), compositionId: upload.body.compositionId, kind: "file" },
    ]);
    expect(feed.body.items.map((item: { compositionId: string }) => item.compositionId)).not.toContain(human.body.compositionId);
    expect(feed.body.items.map((item: { compositionId: string }) => item.compositionId)).not.toContain(empty.body.compositionId);
    expect(feed.body.complete).toBe(true);
    const rest = await http.get("/api/v3/canvas/agent-compositions").query({ since: String(feed.body.nextSeq) });
    expect(rest.body).toEqual({ items: [], nextSeq: feed.body.nextSeq, complete: true });
    const bad = await http.get("/api/v3/canvas/agent-compositions").query({ since: "-1" });
    expect(bad.status).toBe(400);
    expect(bad.body.code).toBe("CANVAS_V3_INVALID_COMMAND");
  });
});
