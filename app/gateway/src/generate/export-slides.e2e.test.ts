import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../bootstrap.js";

const CALLER_KEY = "slides-caller";
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8AAAwAB/AL+2wAAAABJRU5ErkJggg==",
  "base64",
);

/**
 * `edit_media:export_slides`：图片 → `.pptx` 资源。
 * 这是 PPT 的 B 方案（原生能力）的接线验证：能力被接受、产物被发布成资源。
 */
describe("export_slides", () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;
  let workspace: string;

  beforeAll(async () => {
    workspace = mkdtempSync(path.join(tmpdir(), "ov-slides-"));
    const config = path.join(workspace, "config.json");
    writeFileSync(config, JSON.stringify({ platform: { base_url: "http://127.0.0.1:1/v1", api_key: "k", chat_model: "chat" }, models: { image: "qwen-image" } }));
    process.env.WORKSPACE_DIR = workspace;
    process.env.OV_CONFIG_PATH = config;
    process.env.HILO_DATA_DIR = mkdtempSync(path.join(tmpdir(), "ov-slides-hub-"));
    process.env.HILO_GATEWAY_ROLE = "workspace";
    process.env.HILO_PROJECT_ARCHITECTURE = "resource_v3";
    process.env.HILO_AGENT_CALLER_KEY = CALLER_KEY;
    app = await createApp();
    await app.init();
    http = request(app.getHttpServer());
  });

  afterAll(async () => {
    await app.close();
    for (const key of ["WORKSPACE_DIR", "OV_CONFIG_PATH", "HILO_DATA_DIR", "HILO_GATEWAY_ROLE", "HILO_PROJECT_ARCHITECTURE", "HILO_AGENT_CALLER_KEY"]) delete process.env[key];
  });

  it("未知能力仍然 422（保证白名单生效）", async () => {
    const res = await http.post("/api/v3/execute").set("x-hilo-agent-caller", CALLER_KEY).set("x-session-id", "s").set("x-tool-use-id", "t0")
      .send({ capabilityId: "edit_media:nope", input: { references: [] }, output: { resources: [{ key: "primary", mode: "create", name: "x" }] } });
    expect(res.status).toBe(422);
  });

  it("缺 references 时报错而不是崩溃", async () => {
    const res = await http.post("/api/v3/execute").set("x-hilo-agent-caller", CALLER_KEY).set("x-session-id", "s").set("x-tool-use-id", "t1")
      .send({ capabilityId: "edit_media:export_slides", input: { references: [] }, output: { resources: [{ key: "primary", mode: "create", name: "deck" }] } });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });
});
