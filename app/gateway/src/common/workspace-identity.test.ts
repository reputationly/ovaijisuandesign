import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import WebSocket from "ws";

import { createApp } from "../bootstrap.js";
import { identityFromEnv, verifyIdentity } from "./workspace-identity.js";

const ID = { claim: "c".repeat(64), instance: "inst-1", generation: "3" };
const HEADERS = { "x-hilo-workspace": ID.claim, "x-hilo-workspace-instance": ID.instance, "x-hilo-workspace-generation": ID.generation };

describe("verifyIdentity", () => {
  it("没有期望身份时什么都放行", () => {
    expect(verifyIdentity(undefined, {}, "POST")).toBeNull();
    expect(identityFromEnv({ HILO_WORKSPACE_INSTANCE_ID: "x" })).toBeUndefined();
    expect(identityFromEnv({ HILO_WORKSPACE_INSTANCE_ID: "x", HILO_WORKSPACE_GENERATION: "1" })).toEqual({ instance: "x", generation: "1" });
  });

  it("读请求不带放行，带错了照样 409", () => {
    expect(verifyIdentity(ID, {}, "GET")).toBeNull();
    expect(verifyIdentity(ID, {}, "HEAD")).toBeNull();
    expect(verifyIdentity(ID, { generation: "2" }, "GET")?.status).toBe(409);
  });

  it("写请求缺哪个都 428；旧 generation 409", () => {
    expect(verifyIdentity(ID, { instance: ID.instance, generation: ID.generation }, "POST")).toMatchObject({
      status: 428,
      body: { error_code: "WORKSPACE_IDENTITY_REQUIRED", error: expect.stringContaining("x-hilo-workspace") },
    });
    expect(verifyIdentity(ID, { ...ID, generation: "2" }, "DELETE")).toMatchObject({ status: 409, body: { error_code: "WORKSPACE_IDENTITY_MISMATCH" } });
    expect(verifyIdentity(ID, ID, "PUT")).toBeNull();
    // 预检请求带不了自定义头。
    expect(verifyIdentity(ID, {}, "OPTIONS")).toBeNull();
  });

  it("主进程没给 claim 时不要求 claim", () => {
    const noClaim = { instance: ID.instance, generation: ID.generation };
    expect(verifyIdentity(noClaim, noClaim, "POST")).toBeNull();
  });
});

describe("工作区身份中间件（gateway 带身份启动）", () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;
  let wsBase: string;

  beforeAll(async () => {
    process.env.WORKSPACE_DIR = mkdtempSync(path.join(tmpdir(), "ov-identity-"));
    process.env.HILO_WORKSPACE_CLAIM = ID.claim;
    process.env.HILO_WORKSPACE_INSTANCE_ID = ID.instance;
    process.env.HILO_WORKSPACE_GENERATION = ID.generation;
    app = await createApp();
    await app.listen(0, "127.0.0.1");
    http = request(app.getHttpServer());
    wsBase = `ws://127.0.0.1:${app.getHttpServer().address().port}/ws`;
  });
  afterAll(async () => {
    await app.close();
    for (const k of ["WORKSPACE_DIR", "HILO_WORKSPACE_CLAIM", "HILO_WORKSPACE_INSTANCE_ID", "HILO_WORKSPACE_GENERATION"]) delete process.env[k];
  });

  it("读请求不带身份照常", async () => {
    expect((await http.get("/api/health")).status).toBe(200);
  });

  it("写请求：不带 428，带错 409，带对了照常", async () => {
    const body = { nodeIds: [] };
    const missing = await http.post("/api/canvas/selection").send(body);
    expect(missing.status).toBe(428);
    expect(missing.body.error_code).toBe("WORKSPACE_IDENTITY_REQUIRED");
    const stale = await http.post("/api/canvas/selection").set({ ...HEADERS, "x-hilo-workspace-generation": "2" }).send(body);
    expect(stale.status).toBe(409);
    const ok = await http.post("/api/canvas/selection").set(HEADERS).send(body);
    expect(ok.status).toBeLessThan(300);
  });

  it("query 形式等价于头（带不了头的请求用）", async () => {
    const q = `hilo_workspace=${ID.claim}&hilo_workspace_instance=${ID.instance}&hilo_workspace_generation=${ID.generation}`;
    expect((await http.post(`/api/canvas/selection?${q}`).send({ nodeIds: [] })).status).toBeLessThan(300);
  });

  it("被拒的响应也带 CORS 头，渲染层读得到原因", async () => {
    const r = await http.post("/api/canvas/selection").set("Origin", "app://renderer").send({ nodeIds: [] });
    expect(r.status).toBe(428);
    expect(r.headers["access-control-allow-origin"]).toBe("app://renderer");
  });

  it("/ws：不带身份能连；带错了握手后立刻以 1008 关掉", async () => {
    const plain = new WebSocket(wsBase);
    await new Promise((resolve, reject) => {
      plain.once("open", resolve);
      plain.once("error", reject);
    });
    plain.close();
    const wrong = new WebSocket(`${wsBase}?hilo_workspace_instance=other`);
    const code = await new Promise<number>((resolve) => wrong.once("close", (c) => resolve(c)));
    expect(code).toBe(1008);
  });
});
