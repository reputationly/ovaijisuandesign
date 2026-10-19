import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../bootstrap.js";

describe("v3 能力目录", () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;
  const previous = process.env.OV_CONFIG_PATH;

  beforeAll(async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "ov-cap-"));
    const config = path.join(dir, "config.json");
    writeFileSync(config, JSON.stringify({
      platform: { base_url: "https://example.invalid/v1", api_key: "sk-test", chat_model: "qwen" },
      models: { image: "qwen-image", music: "minimax-music3", music_engine: "ace_step", voice_map: {} },
    }));
    process.env.OV_CONFIG_PATH = config;
    process.env.WORKSPACE_DIR = dir;
    process.env.HILO_GATEWAY_ROLE = "workspace";
    process.env.HILO_PROJECT_ARCHITECTURE = "resource_v3";
    app = await createApp();
    await app.init();
    http = request(app.getHttpServer());
  });

  afterAll(async () => {
    await app.close();
    if (previous === undefined) delete process.env.OV_CONFIG_PATH;
    else process.env.OV_CONFIG_PATH = previous;
    delete process.env.WORKSPACE_DIR;
    delete process.env.HILO_GATEWAY_ROLE;
    delete process.env.HILO_PROJECT_ARCHITECTURE;
  });

  it("列出已配置的模型能力，并按编号读取", async () => {
    const listed = await http.get("/api/v3/capabilities");
    expect(listed.status).toBe(200);
    const ids = listed.body.capabilities.map((item: { id: string }) => item.id);
    expect(ids).toContain("generate_image:qwen-image");
    expect(ids).toContain("generate_music:minimax-music3");
    const images = await http.get("/api/v3/capabilities").query({ operation: "generate_image" });
    expect(images.body.capabilities.map((item: { operation: string }) => item.operation)).toEqual(["generate_image"]);
    const one = await http.get("/api/v3/capabilities/generate_image:qwen-image");
    expect(one.status).toBe(200);
    expect(one.body.capability).toMatchObject({ id: "generate_image:qwen-image", operation: "generate_image", displayName: "qwen-image", model: { id: "qwen-image" } });
    expect(one.body.capability.paramSchema.properties.aspect_ratio.enum).toEqual(expect.arrayContaining(["16:9"]));
    const missing = await http.get("/api/v3/capabilities/generate_image:missing");
    expect(missing.status).toBe(404);
    expect(missing.body.message).toBe("Capability unavailable");
    const tools = await http.get("/api/v3/capabilities").query({ source: "tool" });
    expect(tools.body.capabilities).toEqual([]);
    const bad = await http.get("/api/v3/capabilities").query({ source: "cloud" });
    expect(bad.status).toBe(400);
  });
});
