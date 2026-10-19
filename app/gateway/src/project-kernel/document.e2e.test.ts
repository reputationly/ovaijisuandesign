import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";

import { createApp } from "../bootstrap.js";

const CALLER_KEY = "doc-caller";

async function boot(): Promise<{ app: INestApplication; http: ReturnType<typeof request>; workspace: string }> {
  const workspace = mkdtempSync(path.join(tmpdir(), "ov-doc-"));
  process.env.WORKSPACE_DIR = workspace;
  process.env.HILO_GATEWAY_ROLE = "workspace";
  process.env.HILO_PROJECT_ARCHITECTURE = "resource_v3";
  process.env.HILO_AGENT_CALLER_KEY = CALLER_KEY;
  const app = await createApp();
  await app.init();
  return { app, http: request(app.getHttpServer()), workspace };
}

describe("v3 文档写入", () => {
  let app: INestApplication | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
    delete process.env.WORKSPACE_DIR;
    delete process.env.HILO_GATEWAY_ROLE;
    delete process.env.HILO_PROJECT_ARCHITECTURE;
    delete process.env.HILO_AGENT_CALLER_KEY;
  });

  it("创建、替换和锚点修改同一篇文档，冲突时不落盘", async () => {
    ({ app } = await boot());
    const http = request(app.getHttpServer());
    const created = await http.post("/api/v3/document").send({ requestId: "doc-1", mode: "create", name: "章节", format: "md", content: "alpha beta alpha" });
    expect(created.status).toBe(200);
    expect(created.body.resource).toMatchObject({ name: "章节", kind: "text", lines: 1, contentRevision: 1 });
    const replay = await http.post("/api/v3/document").send({ requestId: "doc-1", mode: "create", name: "章节", format: "md", content: "alpha beta alpha" });
    expect(replay.body.resource.versionId).toBe(created.body.resource.versionId);
    const changed = await http.post("/api/v3/document").send({ requestId: "doc-1", mode: "create", name: "章节", format: "md", content: "别的内容" });
    expect(changed.status).toBe(409);
    expect(changed.body.error.code).toBe("PROJECT_COMMAND_ID_REUSED");

    const missingRevision = await http.post("/api/v3/document").send({
      requestId: "doc-2",
      mode: "patch",
      resourceId: created.body.resource.resourceId,
      baseVersionId: created.body.resource.versionId,
      edits: [{ exact: "beta", replacement: "gamma" }],
    });
    expect(missingRevision.status).toBe(409);
    expect(missingRevision.body.error.code).toBe("DOCUMENT_REVISION_REQUIRED");

    const patched = await http.post("/api/v3/document").send({
      requestId: "doc-2",
      mode: "patch",
      resourceId: created.body.resource.resourceId,
      baseVersionId: created.body.resource.versionId,
      baseRevision: 1,
      edits: [{ exact: "beta", replacement: "gamma" }],
    });
    expect(patched.status).toBe(200);
    expect(patched.body.resource.contentRevision).toBe(2);
    const file = readFileSync(path.join(process.env.WORKSPACE_DIR ?? "", "store", `${patched.body.resource.versionId}.md`), "utf8");
    expect(file).toBe("alpha gamma alpha");

    const missed = await http.post("/api/v3/document").send({
      requestId: "doc-3",
      mode: "patch",
      resourceId: created.body.resource.resourceId,
      baseVersionId: patched.body.resource.versionId,
      baseRevision: 2,
      edits: [{ exact: "不存在", replacement: "x" }],
    });
    expect(missed.status).toBe(409);
    expect(missed.body.error.conflict.conflicts[0].reason).toBe("not_found");

    const draft = await http.post("/api/v3/document").set("x-hilo-agent-caller", CALLER_KEY).set("x-session-id", "sess").set("x-tool-use-id", "tool").send({
      requestId: "doc-4",
      mode: "create",
      draft: true,
      name: "草稿",
      content: "还没定",
    });
    expect(draft.status).toBe(403);
    expect(draft.body.error.code).toBe("FORBIDDEN");
  });
});