import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";

import { createApp } from "../bootstrap.js";

async function boot(env: Record<string, string | undefined>): Promise<{ app: INestApplication; http: ReturnType<typeof request> }> {
  for (const key of ["WORKSPACE_DIR", "HILO_GATEWAY_ROLE", "HILO_PROJECT_ARCHITECTURE"]) delete process.env[key];
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  const app = await createApp();
  await app.init();
  return { app, http: request(app.getHttpServer()) };
}

describe("v3 画布架构", () => {
  let app: INestApplication | undefined;
  let http: ReturnType<typeof request>;

  afterEach(async () => {
    await app?.close();
    app = undefined;
    delete process.env.WORKSPACE_DIR;
    delete process.env.HILO_GATEWAY_ROLE;
    delete process.env.HILO_PROJECT_ARCHITECTURE;
  });

  it("没绑工作区时拒绝", async () => {
    ({ app, http } = await boot({}));
    const denied = await http.get("/api/project/architecture");
    expect(denied.status).toBe(403);
    expect(denied.body.code).toBe("CANVAS_V3_WORKSPACE_REQUIRED");
  });

  it("不认识的架构值拒绝，认识的值原样返回", async () => {
    const ws = mkdtempSync(path.join(tmpdir(), "ov-arch-"));
    ({ app, http } = await boot({ WORKSPACE_DIR: ws, HILO_GATEWAY_ROLE: "workspace", HILO_PROJECT_ARCHITECTURE: "nope" }));
    const bad = await http.get("/api/project/architecture");
    expect(bad.status).toBe(403);
    expect(bad.body.code).toBe("PROJECT_ARCHITECTURE_UNSUPPORTED");
    await app.close();

    ({ app, http } = await boot({ WORKSPACE_DIR: ws, HILO_GATEWAY_ROLE: "workspace", HILO_PROJECT_ARCHITECTURE: "resource_v3" }));
    const ok = await http.get("/api/project/architecture");
    expect(ok.status).toBe(200);
    expect(ok.headers["cache-control"]).toBe("no-store");
    expect(ok.body).toEqual({ projectArchitecture: "resource_v3" });
    const document = await http.get("/api/v3/canvas");
    expect(document.status).toBe(200);
    expect(document.headers["cache-control"]).toBe("no-store");
    expect(document.body).toEqual({ schemaVersion: 1, revision: 0, nodes: {}, edges: {} });
    const again = await http.get("/api/v3/canvas");
    expect(again.body.revision).toBe(0);
  });

  it("补丁写入画布，修订号冲突和同一命令重放都按原样处理", async () => {
    const ws = mkdtempSync(path.join(tmpdir(), "ov-patch-"));
    ({ app, http } = await boot({ WORKSPACE_DIR: ws, HILO_GATEWAY_ROLE: "workspace", HILO_PROJECT_ARCHITECTURE: "resource_v3" }));
    const frame = { id: "frame-1", parentId: null, position: { x: 10, y: 20 }, size: { width: 200, height: 120 }, zIndex: 1, hidden: false, kind: "frame", title: "一组", collapsed: false };
    const body = {
      commandId: "cmd-1",
      expectedRevision: 0,
      command: { type: "canvas.patch", nodes: [{ id: "frame-1", before: null, after: frame }], edges: [] },
    };
    const saved = await http.post("/api/v3/canvas/commands").send(body);
    expect(saved.status).toBe(200);
    expect(saved.body.replayed).toBe(false);
    expect(saved.body.appliedRevision).toBe(1);
    expect(saved.body.document.nodes["frame-1"].title).toBe("一组");
    expect(saved.body.effects.undo.type).toBe("canvas.patch");

    const conflict = await http.post("/api/v3/canvas/commands").send({ ...body, commandId: "cmd-2" });
    expect(conflict.status).toBe(409);
    expect(conflict.body.code).toBe("CANVAS_V3_REVISION_CONFLICT");

    const replay = await http.post("/api/v3/canvas/commands").send(body);
    expect(replay.status).toBe(200);
    expect(replay.body.replayed).toBe(true);
    expect(replay.body.appliedRevision).toBe(1);

    const moved = { ...frame, position: { x: 30, y: 20 } };
    const reused = await http.post("/api/v3/canvas/commands").send({
      commandId: "cmd-1",
      expectedRevision: 1,
      command: { type: "canvas.patch", nodes: [{ id: "frame-1", before: frame, after: moved }], edges: [] },
    });
    expect(reused.status).toBe(409);
    expect(reused.body.code).toBe("CANVAS_V3_COMMAND_ID_REUSED");
  });
});
