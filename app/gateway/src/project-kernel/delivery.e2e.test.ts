import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";

import { createApp } from "../bootstrap.js";

describe("v3 交付", () => {
  let app: INestApplication | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
    delete process.env.WORKSPACE_DIR;
    delete process.env.HILO_GATEWAY_ROLE;
    delete process.env.HILO_PROJECT_ARCHITECTURE;
    delete process.env.HILO_AGENT_CALLER_KEY;
  });

  it("把工作区文件收成资源并放进组合，同一请求再来交回原回执", async () => {
    const workspace = mkdtempSync(path.join(tmpdir(), "ov-deliver-"));
    writeFileSync(path.join(workspace, "note.txt"), "交付原文");
    process.env.WORKSPACE_DIR = workspace;
    process.env.HILO_GATEWAY_ROLE = "workspace";
    process.env.HILO_PROJECT_ARCHITECTURE = "resource_v3";
    process.env.HILO_AGENT_CALLER_KEY = "deliver-key";
    app = await createApp();
    await app.init();
    const http = request(app.getHttpServer());
    const body = {
      requestId: "del-1",
      sources: [{ path: "note.txt" }],
      output: {
        resources: [{ mode: "create", name: "笔记" }],
        composition: { name: "一组", type: { label: "Delivery" }, placements: [{ role: "note" }] },
      },
    };
    const saved = await http.post("/api/v3/deliveries").send(body);
    expect(saved.status).toBe(200);
    expect(saved.body.delivery.status).toBe("completed");
    expect(saved.body.delivery.resources[0]).toMatchObject({ key: "primary", name: "笔记", kind: "text", availability: "available" });
    const stored = readFileSync(path.join(workspace, "store", `${saved.body.delivery.resources[0].versionId}.txt`), "utf8");
    expect(stored).toBe("交付原文");
    const composition = await http.post("/api/project/compositions/get").send({ compositionId: saved.body.delivery.placements[0].compositionId });
    expect(composition.body.members[0].role).toBe("note");
    const replay = await http.post("/api/v3/deliveries").send(body);
    expect(replay.body.delivery.resources[0].versionId).toBe(saved.body.delivery.resources[0].versionId);
    const changed = await http.post("/api/v3/deliveries").send({ ...body, sources: [{ path: "missing.txt" }] });
    expect(changed.status).toBe(409);
    expect(changed.body.error.code).toBe("PROJECT_COMMAND_ID_REUSED");
    const unplaced = await http.post("/api/v3/deliveries").set("x-hilo-agent-caller", "deliver-key").set("x-session-id", "sess").set("x-tool-use-id", "tool").send({
      requestId: "del-2",
      sources: [{ path: "note.txt" }],
      output: { resources: [{ mode: "create", name: "散的" }] },
    });
    expect(unplaced.status).toBe(400);
    expect(unplaced.body.error.message).toContain("Composition");
  });
});