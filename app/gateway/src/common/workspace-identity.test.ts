import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import WebSocket from "ws";

import { createApp } from "../bootstrap.js";
import { identityFromEnv, verifyIdentity, verifyWebSocketIdentity, workspaceIdentityHostname, workspaceInstanceHostname } from "./workspace-identity.js";

const ID = { claim: "c".repeat(64), instance: "0f8c1a2b-3c4d-4e5f-8a9b-0c1d2e3f4a5b", generation: 3 };
const HEADERS = { "x-hilo-workspace": ID.claim, "x-hilo-workspace-instance": ID.instance, "x-hilo-workspace-generation": String(ID.generation) };
const MISMATCH = {
  statusCode: 409,
  error: "Conflict",
  code: "WORKSPACE_IDENTITY_MISMATCH",
  message: "The gateway belongs to a different workspace. Refresh the runtime and retry.",
};
const REQUIRED = {
  statusCode: 428,
  error: "Precondition Required",
  code: "WORKSPACE_IDENTITY_REQUIRED",
  message: "Workspace identity is required. Refresh the workspace runtime and retry.",
};

const req = (method: string, url: string, headers: Record<string, string> = {}) => ({ method, url, headers: { host: "127.0.0.1:1", ...headers } });

describe("identityFromEnv", () => {
  it("没有 claim 不校验；instance / generation 只给一半拒绝启动", () => {
    expect(identityFromEnv({})).toBeUndefined();
    expect(identityFromEnv({ HILO_WORKSPACE_CLAIM: "c" })).toEqual({ claim: "c" });
    expect(identityFromEnv({ HILO_WORKSPACE_CLAIM: "c", HILO_WORKSPACE_INSTANCE_ID: "i", HILO_WORKSPACE_GENERATION: "2" })).toEqual({ claim: "c", instance: "i", generation: 2 });
    expect(() => identityFromEnv({ HILO_WORKSPACE_CLAIM: "c", HILO_WORKSPACE_INSTANCE_ID: "i" })).toThrow(/partially configured/);
    expect(() => identityFromEnv({ HILO_WORKSPACE_INSTANCE_ID: "i", HILO_WORKSPACE_GENERATION: "0" })).toThrow(/partially configured/);
  });
});

describe("verifyIdentity", () => {
  it("没有期望身份、预检请求都放行", () => {
    expect(verifyIdentity(undefined, req("POST", "/api/canvas"))).toBeNull();
    expect(verifyIdentity(ID, req("OPTIONS", "/api/canvas"))).toBeNull();
  });

  it("读请求也要 claim；只有什么都没带的健康探测放行", () => {
    expect(verifyIdentity(ID, req("GET", "/api/canvas"))).toMatchObject({ status: 428, body: REQUIRED });
    expect(verifyIdentity(ID, req("GET", "/api/canvas", { "x-hilo-workspace": ID.claim }))).toBeNull();
    expect(verifyIdentity(ID, req("GET", "/api/health/ready"))).toBeNull();
    expect(verifyIdentity(ID, req("HEAD", "/api/health"))).toBeNull();
    expect(verifyIdentity(ID, req("POST", "/api/health/suspend-lease"))?.status).toBe(428);
    expect(verifyIdentity(ID, req("GET", "/api/health", { "x-hilo-workspace-generation": "2" }))).toMatchObject({ status: 409, body: MISMATCH });
  });

  it("写请求在有 instance / generation 时要带齐；generation 按数值比", () => {
    expect(verifyIdentity(ID, req("POST", "/x", { "x-hilo-workspace": ID.claim }))?.status).toBe(428);
    expect(verifyIdentity(ID, req("POST", "/x", { ...HEADERS, "x-hilo-workspace-generation": "03" }))).toBeNull();
    expect(verifyIdentity(ID, req("DELETE", "/x", { ...HEADERS, "x-hilo-workspace-generation": "2" }))?.status).toBe(409);
    expect(verifyIdentity(ID, req("PUT", "/x", { ...HEADERS, "x-hilo-workspace-generation": "abc" }))?.status).toBe(409);
    expect(verifyIdentity({ claim: ID.claim }, req("POST", "/x", { "x-hilo-workspace": ID.claim }))).toBeNull();
  });

  it("header 和 query 互相矛盾算对不上；query 单独带也行", () => {
    const q = `?hilo_workspace=${ID.claim}&hilo_workspace_instance=${ID.instance}&hilo_workspace_generation=3`;
    expect(verifyIdentity(ID, req("POST", `/x${q}`))).toBeNull();
    expect(verifyIdentity(ID, req("POST", `/x${q}`, { "x-hilo-workspace-instance": "other" }))?.status).toBe(409);
  });

  it("浏览器专属主机名本身就是身份", () => {
    const host = workspaceInstanceHostname(ID.instance, ID.generation)!;
    expect(host).toBe(`wi-${ID.instance.replaceAll("-", "")}-g3.hilo.localhost`);
    expect(verifyIdentity(ID, req("POST", "/x", { host: `${host}:5173` }))).toBeNull();
    expect(verifyIdentity(ID, req("POST", "/x", { host: workspaceInstanceHostname(ID.instance, 2)! }))?.status).toBe(409);
    const claimHost = workspaceIdentityHostname(ID.claim)!;
    expect(claimHost).toMatch(/^w-[a-z0-9]{50}\.hilo\.localhost$/);
    expect(verifyIdentity({ claim: ID.claim }, req("GET", "/x", { host: claimHost }))).toBeNull();
  });
});

describe("verifyWebSocketIdentity", () => {
  const env = { HILO_WORKSPACE_CLAIM: ID.claim, HILO_WORKSPACE_INSTANCE_ID: ID.instance, HILO_WORKSPACE_GENERATION: "3" };
  it("只看 query：没带 REQUIRED，带错 MISMATCH，没有 claim 不校验", () => {
    expect(verifyWebSocketIdentity({}, "/ws")).toBeNull();
    expect(verifyWebSocketIdentity(env, "/ws")).toBe("WORKSPACE_IDENTITY_REQUIRED");
    expect(verifyWebSocketIdentity(env, `/ws?hilo_workspace=${ID.claim}&hilo_workspace_instance=x&hilo_workspace_generation=3`)).toBe("WORKSPACE_IDENTITY_MISMATCH");
    expect(verifyWebSocketIdentity(env, `/ws?hilo_workspace=${ID.claim}&hilo_workspace_instance=${ID.instance}&hilo_workspace_generation=3`)).toBeNull();
  });
});

describe("工作区身份中间件（gateway 带身份启动）", () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;
  let wsBase: string;
  const wsQuery = `hilo_workspace=${ID.claim}&hilo_workspace_instance=${ID.instance}&hilo_workspace_generation=${ID.generation}`;

  beforeAll(async () => {
    process.env.WORKSPACE_DIR = mkdtempSync(path.join(tmpdir(), "ov-identity-"));
    process.env.HILO_WORKSPACE_CLAIM = ID.claim;
    process.env.HILO_WORKSPACE_INSTANCE_ID = ID.instance;
    process.env.HILO_WORKSPACE_GENERATION = String(ID.generation);
    app = await createApp();
    await app.listen(0, "127.0.0.1");
    http = request(app.getHttpServer());
    wsBase = `ws://127.0.0.1:${app.getHttpServer().address().port}/ws`;
  });
  afterAll(async () => {
    await app.close();
    for (const k of ["WORKSPACE_DIR", "HILO_WORKSPACE_CLAIM", "HILO_WORKSPACE_INSTANCE_ID", "HILO_WORKSPACE_GENERATION"]) delete process.env[k];
  });

  it("健康探测不带身份照常；其余读请求不带 428", async () => {
    expect((await http.get("/api/health")).status).toBe(200);
    const r = await http.get("/api/canvas");
    expect(r.status).toBe(428);
    expect(r.body).toEqual(REQUIRED);
    expect((await http.get("/api/canvas").set({ "x-hilo-workspace": ID.claim })).status).toBe(200);
  });

  it("写请求：不带 428，带错 409，带对了照常", async () => {
    const body = { nodeIds: [] };
    const missing = await http.post("/api/canvas/selection").send(body);
    expect(missing.status).toBe(428);
    expect(missing.body).toEqual(REQUIRED);
    const stale = await http.post("/api/canvas/selection").set({ ...HEADERS, "x-hilo-workspace-generation": "2" }).send(body);
    expect(stale.status).toBe(409);
    expect(stale.body).toEqual(MISMATCH);
    const ok = await http.post("/api/canvas/selection").set(HEADERS).send(body);
    expect(ok.status).toBeLessThan(300);
  });

  it("query 形式等价于头，通过后从 URL 里去掉（不会被严格的 query 校验当成多余字段）", async () => {
    expect((await http.post(`/api/canvas/selection?${wsQuery}`).send({ nodeIds: [] })).status).toBeLessThan(300);
    const list = await http.get(`/api/canvas/nodes?limit=1&${wsQuery}`);
    expect(list.status).toBe(200);
  });

  it("被拒的响应也带 CORS 头，渲染层读得到原因", async () => {
    const r = await http.post("/api/canvas/selection").set("Origin", "app://renderer").send({ nodeIds: [] });
    expect(r.status).toBe(428);
    expect(r.headers["access-control-allow-origin"]).toBe("app://renderer");
  });

  it("/ws：带对了能连；不带或带错都在握手后以 1008 关掉", async () => {
    const good = new WebSocket(`${wsBase}?${wsQuery}`);
    await new Promise((resolve, reject) => {
      good.once("open", resolve);
      good.once("error", reject);
    });
    good.close();
    for (const url of [wsBase, `${wsBase}?${wsQuery.replace(ID.instance, "other")}`]) {
      const ws = new WebSocket(url);
      const code = await new Promise<number>((resolve) => ws.once("close", (c) => resolve(c)));
      expect(code).toBe(1008);
    }
  });
});
