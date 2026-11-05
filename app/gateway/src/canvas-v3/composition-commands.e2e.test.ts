import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../bootstrap.js";

const HTABLE = JSON.stringify({ version: 1, columns: [{ id: "c", title: "文本", type: "text", visible: true, width: 200 }], rows: [{ id: "r", cells: {} }] });

describe("v3 画布组合级命令", () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;
  let ws: string;
  let seeded = 0;

  beforeAll(async () => {
    ws = mkdtempSync(path.join(tmpdir(), "ov-cmd-"));
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

  /** 建一份表格文档 + 一个 subject 组合节点（带两个成员），返回各种 id。 */
  const seedSubject = async () => {
    seeded += 1;
    const tag = `s${seeded}`;
    const docA = await http.post("/api/v3/document").send({ requestId: `cmd-doc-a-${tag}`, mode: "create", format: "htable", name: `表A${tag}.htable`, content: HTABLE });
    const docB = await http.post("/api/v3/document").send({ requestId: `cmd-doc-b-${tag}`, mode: "create", format: "htable", name: `表B${tag}.htable`, content: HTABLE });
    const a = docA.body.resource as { resourceId: string; versionId: string; name: string };
    const b = docB.body.resource as { resourceId: string; versionId: string; name: string };
    const created = await http.post("/api/project/compositions/commands").send({
      commandId: `cmd-cmp-${tag}`,
      actor: "human",
      command: { type: "composition.create", compositionType: null, name: `组合${tag}` },
    });
    const compositionId = created.body.compositionId as string;
    await http.post("/api/project/compositions/commands").send({
      commandId: `cmd-cmp-members-${tag}`,
      actor: "human",
      expectedRevision: 1,
      command: {
        type: "composition.apply",
        compositionId,
        operations: [
          { type: "member.add", member: { memberId: `mem-a-${tag}`, role: `表A${tag}.htable`, resource: a.resourceId } },
          { type: "member.add", member: { memberId: `mem-b-${tag}`, role: `表B${tag}.htable`, resource: b.resourceId } },
        ],
      },
    });
    const base = await http.get("/api/v3/canvas");
    const placed = await http.post("/api/v3/canvas/commands").send({
      commandId: `cmd-place-${tag}`,
      expectedRevision: base.body.revision,
      command: {
        type: "canvas.patch",
        nodes: [{
          id: `subject-${tag}`,
          before: null,
          after: {
            id: `subject-${tag}`,
            parentId: null,
            position: { x: 0, y: 0 },
            size: { width: 360, height: 440 },
            zIndex: 1,
            hidden: false,
            kind: "composition",
            containerKind: "subject",
            compositionId,
            activeItem: null,
            draft: null,
          },
        }],
        edges: [],
      },
    });
    expect(placed.status).toBe(200);
    return { tag, compositionId, nodeId: `subject-${tag}`, a, b, revision: placed.body.document.revision as number };
  };

  const send = (commandId: string, expectedRevision: number, command: unknown) =>
    http.post("/api/v3/canvas/commands").send({ commandId, expectedRevision, command });

  const members = async (compositionId: string) => {
    const content = await http.post("/api/v3/canvas/content").send({ compositionIds: [compositionId] });
    return (content.body.items[0].members ?? []) as { memberId: string; role: string; resource: string | null }[];
  };

  it("subject.layout 写进节点并做乐观校验", async () => {
    const { tag, nodeId, revision } = await seedSubject();
    const layout = { preset: "board", columns: 2, sections: [{ id: "default", title: "素材", resources: [] }], spans: [], rows: [] };
    const applied = await send(`cmd-layout-${tag}`, revision, { type: "subject.layout", nodeId, before: null, after: layout });
    expect(applied.status).toBe(200);
    expect(applied.body.document.nodes[nodeId].subjectLayout).toEqual(layout);
    // before 对不上 → 409
    const stale = await send(`cmd-layout-stale-${tag}`, applied.body.document.revision, { type: "subject.layout", nodeId, before: null, after: { preset: "gallery", columns: 1, sections: [{ id: "default", title: "素材", resources: [] }], spans: [], rows: [] } });
    expect(stale.status).toBe(409);
  });

  it("subject.rename-member / move-member / add-members / remove-members 直接改组合", async () => {
    const { tag, nodeId, compositionId, a, b, revision } = await seedSubject();
    const renamed = await send(`cmd-rename-${tag}`, revision, { type: "subject.rename-member", nodeId, memberId: `mem-a-${tag}`, title: "主角" });
    expect(renamed.status).toBe(200);
    expect(await members(compositionId)).toEqual([
      { memberId: `mem-a-${tag}`, role: "主角", resource: a.resourceId },
      { memberId: `mem-b-${tag}`, role: `表B${tag}.htable`, resource: b.resourceId },
    ]);

    const moved = await send(`cmd-move-${tag}`, renamed.body.document.revision, { type: "subject.move-member", nodeId, memberId: `mem-b-${tag}`, beforeMemberId: `mem-a-${tag}`, fromBeforeMemberId: null });
    expect(moved.status).toBe(200);
    expect((await members(compositionId)).map((m) => m.memberId)).toEqual([`mem-b-${tag}`, `mem-a-${tag}`]);

    const removed = await send(`cmd-remove-${tag}`, moved.body.document.revision, { type: "subject.remove-members", nodeId, items: [{ memberId: `mem-b-${tag}`, resourceId: b.resourceId, versionId: b.versionId }] });
    expect(removed.status).toBe(200);
    expect((await members(compositionId)).map((m) => m.memberId)).toEqual([`mem-a-${tag}`]);

    const added = await send(`cmd-add-${tag}`, removed.body.document.revision, { type: "subject.add-members", nodeId, items: [{ resourceId: b.resourceId, versionId: b.versionId }] });
    expect(added.status).toBe(200);
    const after = await members(compositionId);
    expect(after).toHaveLength(2);
    expect(after.at(-1)).toMatchObject({ resource: b.resourceId, role: b.name });
  });

  it("composition.set-type 与 composition.move 改的是组合本身", async () => {
    const { tag, nodeId, compositionId, revision } = await seedSubject();
    const typed = await send(`cmd-type-${tag}`, revision, { type: "composition.set-type", nodeId, typeId: null, fromTypeId: null });
    // typeId === fromTypeId → 400（与渲染层一致）
    expect(typed.status).toBe(400);

    const moved = await send(`cmd-move-cmp-${tag}`, revision, { type: "composition.move", nodeId, fromPosition: null, position: 5 });
    expect(moved.status).toBe(200);
    const content = await http.post("/api/v3/canvas/content").send({ compositionIds: [compositionId] });
    expect(content.body.items[0].position).toBe(5);
  });

  it("composition.delete 连同子节点与边一起删；composition.restore 再放回来", async () => {
    const { tag, nodeId, compositionId, revision } = await seedSubject();
    const base = await http.get("/api/v3/canvas");
    // 加一个子节点（放进一个 frame 才有 parent）
    const framed = await send(`cmd-frame-${tag}`, base.body.revision, {
      type: "canvas.patch",
      nodes: [{ id: `frame-${tag}`, before: null, after: { id: `frame-${tag}`, parentId: null, position: { x: 0, y: 0 }, size: { width: 600, height: 400 }, zIndex: 0, hidden: false, kind: "frame", title: "组", collapsed: false } }],
      edges: [],
    });
    const child = await send(`cmd-child-${tag}`, framed.body.document.revision, {
      type: "canvas.patch",
      nodes: [{ id: `child-${tag}`, before: null, after: { id: `child-${tag}`, parentId: `frame-${tag}`, position: { x: 10, y: 10 }, size: { width: 100, height: 100 }, zIndex: 2, hidden: false, kind: "placeholder", expectedKind: "image", draft: null } }],
      edges: [{ id: `edge-${tag}`, before: null, after: { id: `edge-${tag}`, source: nodeId, target: `child-${tag}` } }],
    });
    expect(child.status).toBe(200);

    const deleted = await send(`cmd-del-${tag}`, child.body.document.revision, { type: "composition.delete", nodeIds: [nodeId, `frame-${tag}`] });
    expect(deleted.status).toBe(200);
    expect(deleted.body.document.nodes[nodeId]).toBeUndefined();
    expect(deleted.body.document.nodes[`child-${tag}`]).toBeUndefined();
    expect(deleted.body.document.edges[`edge-${tag}`]).toBeUndefined();
    expect(deleted.body.effects.compositionIds).toContain(compositionId);
  });
});
