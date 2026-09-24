import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

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

describe("activity / suspend-lease", () => {
  let app: INestApplication;
  let dir: string;
  beforeAll(async () => {
    dir = mkdtempSync(path.join(tmpdir(), "gw-activity-"));
    process.env.WORKSPACE_DIR = dir;
    app = await createApp();
    await app.init();
  });
  afterAll(async () => {
    await app.close();
    delete process.env.WORKSPACE_DIR;
    rmSync(dir, { recursive: true, force: true });
  });

  it("空闲时可以挂起，字段是主进程要的那几个", async () => {
    const r = await request(app.getHttpServer()).get("/api/health/activity");
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ idle: true, safe_to_suspend: true, safe_to_close: true, blocking_reasons: [], pending_tasks: 0 });
  });

  it("账上有进行中的生成：不能挂起，并说明原因", async () => {
    mkdirSync(path.join(dir, ".hilo"), { recursive: true });
    writeFileSync(path.join(dir, ".hilo", "active-generations.json"), JSON.stringify({ version: 1, records: [{ id: "g1" }] }));
    const r = await request(app.getHttpServer()).get("/api/health/activity?drain=1");
    expect(r.body.safe_to_suspend).toBe(false);
    expect(r.body.blocking_reasons).toEqual(["active_generation_records:1"]);
    // 不安全时租约当场归还：写请求照常进来（这里 404 说明没被 503 挡住）
    const w = await request(app.getHttpServer()).post("/api/nope").send({});
    expect(w.status).not.toBe(503);
    rmSync(path.join(dir, ".hilo", "active-generations.json"));
  });

  it("drain 拿到租约后拒绝新的写请求，归还后恢复", async () => {
    const d = await request(app.getHttpServer()).get("/api/health/activity?drain=1");
    expect(d.body.safe_to_suspend).toBe(true);
    const blocked = await request(app.getHttpServer()).post("/api/nope").send({});
    expect(blocked.status).toBe(503);
    expect(blocked.body.code).toBe("WORKSPACE_SUSPENDING");
    // 读请求不受影响
    expect((await request(app.getHttpServer()).get("/api/health")).status).toBe(200);
    const rel = await request(app.getHttpServer()).delete("/api/health/suspend-lease");
    expect(rel.body).toEqual({ released: true });
    const after = await request(app.getHttpServer()).post("/api/nope").send({});
    expect(after.status).not.toBe(503);
  });
});
