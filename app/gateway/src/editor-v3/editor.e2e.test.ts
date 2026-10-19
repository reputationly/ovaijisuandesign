import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";

import { createApp } from "../bootstrap.js";

async function boot(enabled: boolean): Promise<{ app: INestApplication; http: ReturnType<typeof request> }> {
  for (const key of ["WORKSPACE_DIR", "HILO_GATEWAY_ROLE", "HILO_PROJECT_ARCHITECTURE"]) delete process.env[key];
  if (enabled) {
    process.env.WORKSPACE_DIR = mkdtempSync(path.join(tmpdir(), "ov-editor-"));
    process.env.HILO_GATEWAY_ROLE = "workspace";
    process.env.HILO_PROJECT_ARCHITECTURE = "resource_v3";
  }
  const app = await createApp();
  await app.init();
  return { app, http: request(app.getHttpServer()) };
}

describe("v3 编辑器能力", () => {
  let app: INestApplication | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
    delete process.env.WORKSPACE_DIR;
    delete process.env.HILO_GATEWAY_ROLE;
    delete process.env.HILO_PROJECT_ARCHITECTURE;
  });

  it("没有 v3 工作区时拒绝，有工作区时列出导演台和剪辑器", async () => {
    ({ app } = await boot(false));
    const denied = await request(app.getHttpServer()).get("/api/v3/editors/capabilities");
    expect(denied.status).toBe(409);
    expect(denied.body.error.code).toBe("FORBIDDEN");
    await app.close();

    ({ app } = await boot(true));
    const http = request(app.getHttpServer());
    const listed = await http.get("/api/v3/editors/capabilities");
    expect(listed.status).toBe(200);
    expect(listed.body.capabilities.map((item: { id: string; displayName: string }) => [item.id, item.displayName])).toEqual([
      ["plugin:director-stage", "导演台"],
      ["plugin:clip-studio", "剪辑器"],
    ]);

    const both = await http.post("/api/v3/editors/capabilities").send({ ids: ["plugin:director-stage", "plugin:clip-studio"] });
    expect(both.status).toBe(200);
    expect(both.body.capabilities[0].instructions).toBeUndefined();
    expect(both.body.capabilities[1].methodGroups.map((group: { id: string }) => group.id)).toContain("lifecycle");

    const clip = await http.post("/api/v3/editors/capabilities").send({ ids: ["plugin:clip-studio"] });
    expect(clip.body.capabilities[0].instructions.length).toBeGreaterThan(5);
    expect(clip.body.capabilities[0].craft[0]).toBe("# Clip Editing Craft");
    expect(clip.body.capabilities[0].methodGroups.flatMap((group: { methods: string[] }) => group.methods)).toContain("project.export");

    const method = await http.post("/api/v3/editors/capabilities").send({ ids: ["plugin:clip-studio"], methods: ["command.get"] });
    expect(method.body.capabilities[0].methods).toEqual([
      expect.objectContaining({ method: "command.get", execution: "read", requiresRenderer: false, undoable: false }),
    ]);
    expect(method.body.capabilities[0].methods[0].inputSchema).toMatchObject({ required: ["commandId"] });

    const unknown = await http.post("/api/v3/editors/capabilities").send({ ids: ["plugin:missing"] });
    expect(unknown.body.unavailable).toEqual([{ id: "plugin:missing", reason: "UNKNOWN_CAPABILITY" }]);
    const missingMethod = await http.post("/api/v3/editors/capabilities").send({ ids: ["plugin:clip-studio"], methods: ["nope"] });
    expect(missingMethod.status).toBe(409);
    expect(missingMethod.body.error.code).toBe("METHOD_UNAVAILABLE");
    const guide = await http.post("/api/v3/editors/capabilities").send({ ids: ["plugin:clip-studio"], guides: ["staging"] });
    expect(guide.body.error.code).toBe("GUIDE_UNAVAILABLE");
    const directorGuide = await http.post("/api/v3/editors/capabilities").send({ ids: ["plugin:director-stage"], guides: ["delivery"] });
    expect(directorGuide.status).toBe(200);
    expect(directorGuide.body.capabilities[0].guides[0].title).toBe("失败恢复、降级与真实交付");
  });
});
