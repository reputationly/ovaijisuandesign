import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../bootstrap.js";

const DRAFT = { modelId: "qwen-image-pro-enhanced", prompt: "一只在窗台晒太阳的橘猫", params: {}, references: [], outputCount: 1 };

describe("v3 画布发起生成", () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;
  let ws: string;

  beforeAll(async () => {
    ws = mkdtempSync(path.join(tmpdir(), "ov-gen-"));
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

  const placePlaceholder = async (nodeId: string, expectedKind: "image" | "video" | "audio" = "image") => {
    const base = await http.get("/api/v3/canvas");
    const placed = await http.post("/api/v3/canvas/commands").send({
      commandId: `place-${nodeId}`,
      expectedRevision: base.body.revision,
      command: {
        type: "canvas.patch",
        nodes: [{
          id: nodeId,
          before: null,
          after: { id: nodeId, parentId: null, position: { x: 10, y: 20 }, size: { width: 350, height: 350 }, zIndex: 1, hidden: false, kind: "placeholder", expectedKind, draft: null },
        }],
        edges: [],
      },
    });
    expect(placed.status).toBe(200);
    return placed.body.document as { revision: number };
  };

  it("占位符发起生成 → 变成带 pendingGeneration 的组合", async () => {
    const document = await placePlaceholder("gen-1");
    const started = await http.post("/api/v3/canvas/commands").send({
      commandId: "start-gen-1",
      expectedRevision: document.revision,
      command: {
        type: "generation.start",
        nodeId: "gen-1",
        draft: DRAFT,
        historyRequest: { requestId: "req-1", outputKey: "primary" },
      },
    });
    expect(started.status).toBe(200);
    const node = started.body.document.nodes["gen-1"];
    expect(node).toMatchObject({
      kind: "composition",
      parentId: null,
      position: { x: 10, y: 20 },
      size: { width: 350, height: 350 },
      activeItem: null,
      pendingGeneration: { requestId: "req-1", outputKey: "primary" },
    });
    expect(node.compositionId).toMatch(/^cmp_/);
    expect(node.draft).toMatchObject({ prompt: "一只在窗台晒太阳的橘猫", outputCount: 1 });
    // 占位符字段不能残留（组合节点不接受 expectedKind）
    expect(node.expectedKind).toBeUndefined();
    // 组合已经建好、可投影
    const content = await http.post("/api/v3/canvas/content").send({ compositionIds: [node.compositionId] });
    expect(content.body.items[0]).toMatchObject({ compositionId: node.compositionId, state: "ready" });
  });

  it("带 create 发起生成会连节点和边一起建出来", async () => {
    const anchor = await placePlaceholder("gen-anchor");
    const started = await http.post("/api/v3/canvas/commands").send({
      commandId: "start-gen-create",
      expectedRevision: anchor.revision,
      command: {
        type: "generation.start",
        nodeId: "gen-new",
        draft: DRAFT,
        historyRequest: { requestId: "req-2", outputKey: "primary" },
        create: {
          expectedKind: "image",
          parentId: null,
          position: { x: 400, y: 0 },
          size: { width: 350, height: 280 },
          zIndex: 2,
          edges: [{ id: "edge-gen", source: "gen-anchor" }],
        },
      },
    });
    expect(started.status).toBe(200);
    expect(started.body.document.nodes["gen-new"]).toMatchObject({
      kind: "composition",
      position: { x: 400, y: 0 },
      size: { width: 350, height: 280 },
      pendingGeneration: { requestId: "req-2", outputKey: "primary" },
    });
    expect(started.body.document.edges["edge-gen"]).toEqual({ id: "edge-gen", source: "gen-anchor", target: "gen-new" });
  });

  it("同组合内出图沿用原组合；目标不是内容节点、组合对不上都会被拒", async () => {
    const document = await placePlaceholder("gen-2");
    const started = await http.post("/api/v3/canvas/commands").send({
      commandId: "start-gen-2",
      expectedRevision: document.revision,
      command: { type: "generation.start", nodeId: "gen-2", draft: DRAFT, historyRequest: { requestId: "req-3", outputKey: "primary" } },
    });
    const compositionId = started.body.document.nodes["gen-2"].compositionId as string;

    // 同一组合再出一次（例如工具连出），组合不变
    const again = await http.post("/api/v3/canvas/commands").send({
      commandId: "start-gen-2-again",
      expectedRevision: started.body.document.revision,
      command: { type: "generation.start", nodeId: "gen-2", draft: DRAFT, outputCompositionId: compositionId, historyRequest: { requestId: "req-4", outputKey: "primary" } },
    });
    expect(again.status).toBe(200);
    expect(again.body.document.nodes["gen-2"].compositionId).toBe(compositionId);
    expect(again.body.document.nodes["gen-2"].pendingGeneration).toEqual({ requestId: "req-4", outputKey: "primary" });

    // 组合对不上
    const mismatch = await http.post("/api/v3/canvas/commands").send({
      commandId: "start-gen-mismatch",
      expectedRevision: again.body.document.revision,
      command: { type: "generation.start", nodeId: "gen-2", draft: DRAFT, outputCompositionId: "cmp_other" },
    });
    expect(mismatch.status).toBe(409);

    // 目标是画框
    const frame = await http.post("/api/v3/canvas/commands").send({
      commandId: "place-frame",
      expectedRevision: again.body.document.revision,
      command: {
        type: "canvas.patch",
        nodes: [{ id: "frame-gen", before: null, after: { id: "frame-gen", parentId: null, position: { x: 0, y: 0 }, size: { width: 400, height: 300 }, zIndex: 0, hidden: false, kind: "frame", title: "组", collapsed: false } }],
        edges: [],
      },
    });
    const onFrame = await http.post("/api/v3/canvas/commands").send({
      commandId: "start-on-frame",
      expectedRevision: frame.body.document.revision,
      command: { type: "generation.start", nodeId: "frame-gen", draft: DRAFT },
    });
    expect(onFrame.status).toBe(409);

    // 既没有节点也没有 create
    const nowhere = await http.post("/api/v3/canvas/commands").send({
      commandId: "start-nowhere",
      expectedRevision: frame.body.document.revision,
      command: { type: "generation.start", nodeId: "ghost", draft: DRAFT },
    });
    expect(nowhere.status).toBe(409);
  });
});
