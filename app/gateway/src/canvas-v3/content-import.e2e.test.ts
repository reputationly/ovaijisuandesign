import { execFileSync } from "node:child_process";
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

describe("v3 画布导入内容", () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;
  let ws: string;

  beforeAll(async () => {
    ws = mkdtempSync(path.join(tmpdir(), "ov-import-"));
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

  /** 写一份 `.htable` 文档，返回它的资源与版本。 */
  const writeTable = async (requestId: string, name: string) => {
    const written = await http.post("/api/v3/document").send({ requestId, mode: "create", format: "htable", name, content: HTABLE });
    expect(written.status).toBe(200);
    return written.body.resource as { resourceId: string; versionId: string; name: string };
  };

  const placement = { parentId: null, position: { x: 120, y: 80 }, size: { width: 350, height: 200 }, zIndex: 1 };

  it("写 .htable → content.import → 画布上出现表格节点", async () => {
    const table = await writeTable("import-table-doc", "需求表.htable");
    const revision = (await http.get("/api/v3/canvas")).body.revision as number;
    const imported = await http.post("/api/v3/canvas/commands").send({
      commandId: "import-table-node",
      expectedRevision: revision,
      command: {
        type: "content.import",
        items: [{ nodeId: "table-node", resourceId: table.resourceId, versionId: table.versionId, placement }],
      },
    });
    expect(imported.status).toBe(200);
    const node = imported.body.document.nodes["table-node"];
    expect(node).toMatchObject({
      id: "table-node",
      kind: "composition",
      parentId: null,
      position: placement.position,
      size: placement.size,
      zIndex: 1,
      hidden: false,
      activeItem: { type: "version", resourceId: table.resourceId, versionId: table.versionId },
      draft: null,
    });
    expect(node.compositionId).toMatch(/^cmp_/);
    // 重新读一次画布：节点是真的落盘了，不是只在响应里。
    const reloaded = await http.get("/api/v3/canvas");
    expect(reloaded.body.nodes["table-node"]).toEqual(node);
    // 组合投影出来是 table 类别，画布据此开表格编辑器。
    const content = await http.post("/api/v3/canvas/content").send({ compositionIds: [node.compositionId] });
    expect(content.body.items[0]).toMatchObject({ compositionId: node.compositionId, state: "ready" });
    expect(content.body.items[0].members).toEqual([expect.objectContaining({ resource: table.resourceId, role: table.name })]);
    expect(content.body.items[0].resources[table.resourceId]).toMatchObject({
      kind: "table",
      availability: "available",
      currentVersionId: table.versionId,
    });
  });

  it("占位符被填充成组合节点，位置和尺寸不变", async () => {
    const table = await writeTable("import-placeholder-doc", "占位表.htable");
    const base = await http.get("/api/v3/canvas");
    const placed = await http.post("/api/v3/canvas/commands").send({
      commandId: "placeholder-node",
      expectedRevision: base.body.revision,
      command: {
        type: "canvas.patch",
        nodes: [{
          id: "slot-node",
          before: null,
          after: { id: "slot-node", parentId: null, position: { x: 10, y: 20 }, size: { width: 300, height: 180 }, zIndex: 1, hidden: false, kind: "placeholder", expectedKind: "table", draft: null },
        }],
        edges: [],
      },
    });
    expect(placed.status).toBe(200);
    const filled = await http.post("/api/v3/canvas/commands").send({
      commandId: "fill-placeholder",
      expectedRevision: placed.body.document.revision,
      command: {
        type: "content.import",
        items: [{ nodeId: "slot-node", resourceId: table.resourceId, versionId: table.versionId, size: { width: 420, height: 240 } }],
      },
    });
    expect(filled.status).toBe(200);
    expect(filled.body.document.nodes["slot-node"]).toMatchObject({
      kind: "composition",
      position: { x: 10, y: 20 },
      size: { width: 420, height: 240 },
      activeItem: { type: "version", resourceId: table.resourceId, versionId: table.versionId },
    });
  });

  it("导入可以带一条边，重放同一条命令不会重复建组合", async () => {
    const table = await writeTable("import-edge-doc", "连线的表.htable");
    const base = await http.get("/api/v3/canvas");
    const anchor = await http.post("/api/v3/canvas/commands").send({
      commandId: "edge-anchor",
      expectedRevision: base.body.revision,
      command: {
        type: "canvas.patch",
        nodes: [{
          id: "anchor-node",
          before: null,
          after: { id: "anchor-node", parentId: null, position: { x: 0, y: 0 }, size: { width: 350, height: 200 }, zIndex: 1, hidden: false, kind: "frame", title: "起点", collapsed: false },
        }],
        edges: [],
      },
    });
    expect(anchor.status).toBe(200);
    const command = {
      type: "content.import",
      items: [{ nodeId: "linked-node", resourceId: table.resourceId, versionId: table.versionId, placement: { ...placement, position: { x: 900, y: 0 } }, edges: [{ id: "edge-1", source: "anchor-node" }] }],
    };
    const imported = await http.post("/api/v3/canvas/commands").send({ commandId: "import-with-edge", expectedRevision: anchor.body.document.revision, command });
    expect(imported.status).toBe(200);
    expect(imported.body.document.edges["edge-1"]).toEqual({ id: "edge-1", source: "anchor-node", target: "linked-node" });
    const replay = await http.post("/api/v3/canvas/commands").send({ commandId: "import-with-edge", expectedRevision: anchor.body.document.revision, command });
    expect(replay.status).toBe(200);
    expect(replay.body.replayed).toBe(true);
    expect(replay.body.document).toEqual(imported.body.document);
  });

  it("批量命令里可以混用 canvas.patch 和 content.import", async () => {
    const table = await writeTable("import-batch-doc", "批量表.htable");
    const base = await http.get("/api/v3/canvas");
    const batched = await http.post("/api/v3/canvas/commands").send({
      commandId: "import-batch",
      expectedRevision: base.body.revision,
      command: {
        type: "canvas.batch",
        commands: [
          {
            type: "canvas.patch",
            nodes: [{
              id: "batch-frame",
              before: null,
              after: { id: "batch-frame", parentId: null, position: { x: 0, y: 0 }, size: { width: 350, height: 200 }, zIndex: 1, hidden: false, kind: "frame", title: "批量", collapsed: false },
            }],
            edges: [],
          },
          {
            type: "content.import",
            items: [{ nodeId: "batch-node", resourceId: table.resourceId, versionId: table.versionId, placement: { ...placement, parentId: "batch-frame", position: { x: 24, y: 48 } } }],
          },
        ],
      },
    });
    expect(batched.status).toBe(200);
    expect(batched.body.document.nodes["batch-frame"]?.kind).toBe("frame");
    expect(batched.body.document.nodes["batch-node"]).toMatchObject({ kind: "composition", parentId: "batch-frame" });
  });

  it("不存在的版本和类别不符的占位符都会被拒绝", async () => {
    const table = await writeTable("import-bad-doc", "坏表.htable");
    const base = await http.get("/api/v3/canvas");
    const missing = await http.post("/api/v3/canvas/commands").send({
      commandId: "import-missing",
      expectedRevision: base.body.revision,
      command: {
        type: "content.import",
        items: [{ nodeId: "ghost-node", resourceId: table.resourceId, versionId: "ver_missing", placement }],
      },
    });
    expect(missing.status).toBe(409);
    expect(missing.body.code).toBe("CANVAS_V3_CONTENT_UNAVAILABLE");

    const wrongSlot = await http.post("/api/v3/canvas/commands").send({
      commandId: "import-wrong-kind",
      expectedRevision: base.body.revision,
      command: {
        type: "content.import",
        items: [{ nodeId: "image-slot", resourceId: table.resourceId, versionId: table.versionId, placement }],
      },
    });
    expect(wrongSlot.status).toBe(200);

    const rejected = await http.post("/api/v3/canvas/commands").send({
      commandId: "import-kind-mismatch",
      expectedRevision: wrongSlot.body.document.revision,
      command: {
        type: "content.import",
        items: [{ nodeId: "image-slot", resourceId: table.resourceId, versionId: "ver_missing", placement }],
      },
    });
    expect(rejected.status).toBe(409);

    const badShape = await http.post("/api/v3/canvas/commands").send({
      commandId: "import-bad-shape",
      expectedRevision: base.body.revision,
      command: { type: "content.import", items: [{ nodeId: "x", resourceId: table.resourceId, versionId: table.versionId, placement: { ...placement, extra: 1 } }] },
    });
    expect(badShape.status).toBe(400);
    expect(badShape.body.code).toBe("CANVAS_V3_INVALID_COMMAND");
  });

  it("表格保存回写：update 带新行 → 磁盘 .htable 里就有这一行", async () => {
    const table = await writeTable("table-save-doc", "回写.htable");
    // writeTable 返回 {resourceId, versionId}，没有再单独读文档；首次保存用 baseRevision=1。
    const withRow = JSON.parse(HTABLE);
    withRow.rows = [{ id: "row_1", cells: { [withRow.columns[0].id]: "回写验证" } }];
    const saved = await http.post("/api/v3/document").send({
      requestId: "table-save-update",
      mode: "replace",
      resourceId: table.resourceId,
      baseVersionId: table.versionId,
      baseRevision: 1,
      name: "回写.htable",
      content: JSON.stringify(withRow),
    });
    if (saved.status >= 300) console.log("SAVE 失败:", saved.status, JSON.stringify(saved.body).slice(0, 400));
    expect(saved.status).toBeLessThan(300);
    const onDisk = execFileSync("python3", ["-c", `
import sqlite3, sys
db = sqlite3.connect("file:" + sys.argv[1] + "/.hilo/index.sqlite?mode=ro", uri=True)
row = db.execute("select v.relative_path from resources r join resource_versions v on v.resource_id=r.resource_id where r.resource_id=? order by v.created_at desc limit 1", (sys.argv[2],)).fetchone()
print(open(sys.argv[1] + "/" + row[0], encoding="utf-8").read())
`, ws, table.resourceId], { encoding: "utf8" });
    expect(onDisk).toContain("回写验证");
  });
});
