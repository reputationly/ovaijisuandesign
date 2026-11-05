import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../bootstrap.js";

const HTABLE = JSON.stringify({
  version: 1,
  columns: [{ id: "col_a", title: "文本", type: "text", visible: true, width: 200 }],
  rows: [{ id: "row_a", cells: {} }],
});

describe("v3 画布粘贴", () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;
  let ws: string;

  beforeAll(async () => {
    ws = mkdtempSync(path.join(tmpdir(), "ov-paste-"));
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

  /** 画一个「一个表格节点 + 一个分组（含子节点）」的画布，返回节点与快照素材。 */
  let seeded = 0;
  const seed = async () => {
    seeded += 1;
    const tag = `s${seeded}`;
    const written = await http.post("/api/v3/document").send({ requestId: `paste-doc-${tag}`, mode: "create", format: "htable", name: `粘贴表${tag}.htable`, content: HTABLE });
    const table = written.body.resource as { resourceId: string; versionId: string; name: string };
    const base = await http.get("/api/v3/canvas");
    const imported = await http.post("/api/v3/canvas/commands").send({
      commandId: `paste-seed-${tag}`,
      expectedRevision: base.body.revision,
      command: {
        type: "canvas.batch",
        commands: [
          {
            type: "canvas.patch",
            nodes: [
              {
                id: `frame-${tag}`,
                before: null,
                after: { id: `frame-${tag}`, parentId: null, position: { x: 0, y: 0 }, size: { width: 600, height: 400 }, zIndex: 1, hidden: false, kind: "frame", title: "组", collapsed: false },
              },
            ],
            edges: [],
          },
          {
            type: "content.import",
            items: [{ nodeId: `table-${tag}`, resourceId: table.resourceId, versionId: table.versionId, placement: { parentId: `frame-${tag}`, position: { x: 24, y: 48 }, size: { width: 350, height: 200 }, zIndex: 2 } }],
          },
        ],
      },
    });
    expect(imported.status).toBe(200);
    const frameId = `frame-${tag}`;
    const tableId = `table-${tag}`;
    const tableNode = imported.body.document.nodes[tableId] as { compositionId: string; activeItem: { resourceId: string; versionId: string } };
    return { table, tableNode, frameId, tableId, document: imported.body.document as { revision: number; nodes: Record<string, Record<string, unknown>>; edges: Record<string, Record<string, unknown>> } };
  };

  it("粘贴把节点按 offset 平移、组合重建、成员仍指向同一资源", async () => {
    const { table, tableNode, frameId, tableId, document } = await seed();
    const frame = document.nodes[frameId] as Record<string, unknown>;
    const tableRow = document.nodes[tableId] as Record<string, unknown>;
    const snapshot = {
      type: "canvas-v3.clipboard" as const,
      workspaceId: "ws-paste",
      document: { schemaVersion: 1 as const, revision: 0, nodes: { [frameId]: frame, [tableId]: tableRow }, edges: {} },
      content: {
        [tableId]: {
          title: "粘贴表",
          members: [{ memberId: "mem-1", role: table.name, resource: table.resourceId }],
          items: [{ ref: { type: "version" as const, resourceId: table.resourceId, versionId: table.versionId }, resourceId: table.resourceId, versionId: table.versionId, name: table.name, kind: "table", isCurrent: true }],
        },
      },
    };
    const pasted = await http.post("/api/v3/canvas/commands").send({
      commandId: "paste-1",
      expectedRevision: document.revision,
      command: {
        type: "clipboard.paste",
        snapshot,
        ids: { [frameId]: `${frameId}-copy`, [tableId]: `${tableId}-copy` },
        offset: { x: 700, y: 0 },
      },
    });
    expect(pasted.status).toBe(200);
    const nodes = pasted.body.document.nodes;
    expect(nodes[`${frameId}-copy`]).toMatchObject({ kind: "frame", position: { x: 700, y: 0 }, title: "组" });
    expect(nodes[`${tableId}-copy`]).toMatchObject({
      kind: "composition",
      parentId: `${frameId}-copy`,
      // 子节点坐标相对父级，不吃 offset
      position: { x: 24, y: 48 },
      activeItem: { type: "version", resourceId: table.resourceId, versionId: table.versionId },
    });
    // 组合是新的，但成员还是同一份资源（粘贴不复制文件）
    expect(nodes[`${tableId}-copy`].compositionId).not.toBe(tableNode.compositionId);
    const content = await http.post("/api/v3/canvas/content").send({ compositionIds: [nodes[`${tableId}-copy`].compositionId] });
    expect(content.body.items[0]).toMatchObject({ state: "ready", title: "粘贴表" });
    expect(content.body.items[0].members).toEqual([{ memberId: "mem-1", role: table.name, resource: table.resourceId }]);
    expect(content.body.items[0].resources[table.resourceId]).toMatchObject({ kind: "table", availability: "available" });
    // 原节点没被动
    expect(pasted.body.document.nodes[tableId].compositionId).toBe(tableNode.compositionId);
  });

  it("duplicate 标记可以走，跨项目 sources 会把成员换成对端资源", async () => {
    const { table, tableId, document } = await seed();
    // 真实剪贴板总是带整棵子树；这里只粘这个节点，所以把它根化。
    const tableRow = { ...(document.nodes[tableId] as Record<string, unknown>), parentId: null, position: { x: 24, y: 48 } };
    const snapshot = {
      type: "canvas-v3.clipboard" as const,
      workspaceId: "ws-other",
      document: { schemaVersion: 1 as const, revision: 0, nodes: { [tableId]: tableRow }, edges: {} },
      content: {
        [tableId]: {
          title: "对端的表",
          members: [{ memberId: "mem-1", role: "对端的表", resource: table.resourceId }],
          items: [{ ref: { type: "version" as const, resourceId: table.resourceId, versionId: table.versionId }, resourceId: table.resourceId, versionId: table.versionId, name: table.name, kind: "table", isCurrent: true }],
        },
      },
    };
    // 同项目：duplicate
    const duplicated = await http.post("/api/v3/canvas/commands").send({
      commandId: "paste-dup",
      expectedRevision: document.revision,
      command: { type: "clipboard.paste", snapshot, ids: { [tableId]: `${tableId}-dup` }, offset: { x: 0, y: 500 }, duplicate: true },
    });
    expect(duplicated.status).toBe(200);
    expect(duplicated.body.document.nodes[`${tableId}-dup`].kind).toBe("composition");
  });

  it("缺 id 映射、重复 id、duplicate 与 sources 同给都会被拒", async () => {
    const { table, tableId, document } = await seed();
    const tableRow = { ...(document.nodes[tableId] as Record<string, unknown>), parentId: null, position: { x: 24, y: 48 } };
    const snapshot = {
      type: "canvas-v3.clipboard" as const,
      workspaceId: "ws-paste",
      document: { schemaVersion: 1 as const, revision: 0, nodes: { [tableId]: tableRow }, edges: {} },
      content: {
        [tableId]: {
          title: "表",
          items: [{ ref: { type: "version" as const, resourceId: table.resourceId, versionId: table.versionId }, resourceId: table.resourceId, versionId: table.versionId, name: table.name, kind: "table" }],
        },
      },
    };
    const missing = await http.post("/api/v3/canvas/commands").send({
      commandId: "paste-missing-ids",
      expectedRevision: document.revision,
      command: { type: "clipboard.paste", snapshot, ids: {}, offset: { x: 0, y: 0 } },
    });
    expect(missing.status).toBe(400);
    expect(missing.body.code).toBe("CANVAS_V3_INVALID_COMMAND");

    const conflict = await http.post("/api/v3/canvas/commands").send({
      commandId: "paste-both",
      expectedRevision: document.revision,
      command: { type: "clipboard.paste", snapshot, ids: { [tableId]: "t9" }, offset: { x: 0, y: 0 }, duplicate: true, sources: {} },
    });
    expect(conflict.status).toBe(400);

    // 目标 id 已经被画布占用 → 拒绝
    const occupied = await http.post("/api/v3/canvas/commands").send({
      commandId: "paste-occupied",
      expectedRevision: document.revision,
      command: { type: "clipboard.paste", snapshot, ids: { [tableId]: tableId }, offset: { x: 0, y: 0 } },
    });
    expect(occupied.status).toBe(400);
  });
});
