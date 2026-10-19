import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../bootstrap.js";

describe("v3 画布文本生成", () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;

  beforeAll(async () => {
    const ws = mkdtempSync(path.join(tmpdir(), "ov-text-"));
    writeFileSync(path.join(ws, "note.txt"), "一段参考");
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

  it("列出模型，拒绝坏请求，并记住同一请求号的结果", async () => {
    const models = await http.get("/api/v3/canvas/text/models");
    expect(models.status).toBe(200);
    expect(models.headers["cache-control"]).toBe("no-store");
    expect(Array.isArray(models.body.models)).toBe(true);
    expect(typeof models.body.defaultModelId).toBe("string");
    const invalid = await http.post("/api/v3/canvas/text/generate").send({ requestId: "req-1", modelId: "chat" });
    expect(invalid.status).toBe(400);
    expect(invalid.body.message).toBe("Invalid text generation request");
    const missing = await http.post("/api/v3/canvas/text/generate").send({ requestId: "req-1", modelId: "missing-model", prompt: "写一段" });
    expect(missing.status).toBe(200);
    expect(missing.body).toMatchObject({ requestId: "req-1", ok: false, error: "No text model for this model id", errorCode: "client_error", presentation: "terminal" });
    const replay = await http.post("/api/v3/canvas/text/generate").send({ requestId: "req-1", modelId: "missing-model", prompt: "写一段" });
    expect(replay.body).toEqual(missing.body);
    const changed = await http.post("/api/v3/canvas/text/generate").send({ requestId: "req-1", modelId: "missing-model", prompt: "另一段" });
    expect(changed.status).toBe(409);
    expect(changed.body.message).toBe("Generation request ID was reused with different input");
    await http.post("/api/project/resources/commands").send({
      commandId: "text-ref",
      actor: "human",
      command: { type: "resource.create", resourceId: "res_note", payload: { name: "note.txt", kind: 1 } },
    });
    await http.post("/api/project/resources/commands").send({
      commandId: "text-ref-version",
      actor: "human",
      command: {
        type: "resource.update",
        resourceId: "res_note",
        payload: { kind: "new_version", versionId: "ver_note", baseVersionId: null, relativePath: "note.txt", source: "import", disposition: "adopted", dependencies: [] },
      },
    });
    const reference = await http.post("/api/v3/canvas/text/generate").send({
      requestId: "req-2",
      modelId: "missing-model",
      prompt: "续写",
      references: [{ resourceId: "res_note", versionId: "ver_missing" }],
    });
    expect(reference.body).toMatchObject({ ok: false, error: "Reference version is unavailable", errorCode: "client_error" });
  });
});
