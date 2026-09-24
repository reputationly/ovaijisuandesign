import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../bootstrap.js";

describe("health", () => {
  let app: INestApplication;
  beforeAll(async () => {
    process.env.GATEWAY_NONCE = "n-123";
    app = await createApp();
    await app.init();
  });
  afterAll(async () => {
    await app.close();
    delete process.env.GATEWAY_NONCE;
  });

  it("live 带 nonce 头 —— 主进程靠它认出是不是自己拉起的那个", async () => {
    const r = await request(app.getHttpServer()).get("/api/health/live");
    expect(r.status).toBe(200);
    expect(r.headers["x-gateway-nonce"]).toBe("n-123");
  });

  it("只有 live 带 nonce", async () => {
    const r = await request(app.getHttpServer()).get("/api/health");
    expect(r.status).toBe(200);
    expect(r.headers["x-gateway-nonce"]).toBeUndefined();
  });
});
