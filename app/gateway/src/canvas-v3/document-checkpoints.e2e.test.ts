import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../bootstrap.js";

describe("v3 文档检查点", () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;
  let ws: string;

  beforeAll(async () => {
    ws = mkdtempSync(path.join(tmpdir(), "ov-checkpoint-"));
    process.env.WORKSPACE_DIR = ws;
    process.env.HILO_GATEWAY_ROLE = "workspace";
    process.env.HILO_PROJECT_ARCHITECTURE = "resource_v3";
    app = await createApp();
    await app.init();
    http = request(app.getHttpServer());
    writeFileSync(path.join(ws, "note.txt"), "hello");
    await http.post("/api/project/resources/commands").send({
      commandId: "cp-create",
      actor: "human",
      command: { type: "resource.create", resourceId: "res_note", payload: { name: "note.txt", kind: 1 } },
    });
    await http.post("/api/project/resources/commands").send({
      commandId: "cp-version",
      actor: "human",
      command: {
        type: "resource.update",
        resourceId: "res_note",
        payload: { kind: "new_version", versionId: "ver_note", baseVersionId: null, relativePath: "note.txt", source: "import", disposition: "adopted", dependencies: [] },
      },
    });
  });

  afterAll(async () => {
    await app.close();
    delete process.env.WORKSPACE_DIR;
    delete process.env.HILO_GATEWAY_ROLE;
    delete process.env.HILO_PROJECT_ARCHITECTURE;
  });

  it("同一版本文档再存一次会合并，置顶和删除按检查点 id", async () => {
    const conflict = await http.post("/api/v3/canvas/document-checkpoints").send({ operation: "save", resourceId: "res_note", versionId: "ver_note", contentRevision: 2, title: "过期" });
    expect(conflict.status).toBe(409);
    expect(conflict.body.error.code).toBe("DOCUMENT_REVISION_CONFLICT");

    const saved = await http.post("/api/v3/canvas/document-checkpoints").send({ operation: "save", resourceId: "res_note", versionId: "ver_note", title: "初稿", note: "第一段" });
    expect(saved.status).toBe(200);
    expect(saved.body.deduped).toBe(false);
    expect(saved.body.checkpoints[0]).toMatchObject({ resourceId: "res_note", versionId: "ver_note", title: "初稿", note: "第一段", pinned: false });
    const id = saved.body.checkpoints[0].id as string;

    const again = await http.post("/api/v3/canvas/document-checkpoints").send({ operation: "save", resourceId: "res_note", versionId: "ver_note", title: "修订" });
    expect(again.body.deduped).toBe(true);
    expect(again.body.checkpoints[0].id).toBe(id);
    expect(again.body.checkpoints[0].title).toBe("修订");
    expect(again.body.checkpoints[0].note).toBe("第一段");

    const pinned = await http.post("/api/v3/canvas/document-checkpoints").send({ operation: "update", resourceId: "res_note", id, pinned: true });
    expect(pinned.body.checkpoints[0].pinned).toBe(true);
    const listed = await http.post("/api/v3/canvas/document-checkpoints").send({ operation: "list", resourceId: "res_note" });
    expect(listed.body.checkpoints.map((item: { id: string }) => item.id)).toEqual([id]);
    const removed = await http.post("/api/v3/canvas/document-checkpoints").send({ operation: "remove", resourceId: "res_note", id });
    expect(removed.body.checkpoints).toEqual([]);
    const missing = await http.post("/api/v3/canvas/document-checkpoints").send({ operation: "get", resourceId: "res_note", id });
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe("NOT_FOUND");
  });
});
