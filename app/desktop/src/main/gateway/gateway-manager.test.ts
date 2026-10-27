import { mkdtempSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { GatewayManager } from "./gateway-manager.js";

const entry = path.resolve(import.meta.dirname, "../../../../gateway/dist/main.js");

describe("GatewayManager", () => {
  it("拉起真的 gateway，nonce 对得上才算就绪，停得干净", async () => {
    const ws = mkdtempSync(path.join(tmpdir(), "ov-gw-"));
    // 测试在 Node 里跑，exec 用 node；Electron 里默认是 process.execPath + ELECTRON_RUN_AS_NODE。
    const m = new GatewayManager({ entry, role: "workspace", workspaceDir: ws, exec: process.execPath }, () => {});
    const gw = await m.start();
    const r = await fetch(`${gw.url}/api/health/live`);
    expect(r.headers.get("x-gateway-nonce")).toBe(gw.nonce);
    await m.stop();
    await expect(fetch(`${gw.url}/api/health/live`)).rejects.toThrow();
  }, 30_000);

  it("带工作区身份起的 gateway：健康检查照样就绪，其余请求不带身份 428", async () => {
    const ws = mkdtempSync(path.join(tmpdir(), "ov-gw-"));
    const env = { HILO_WORKSPACE_CLAIM: "d".repeat(64), HILO_WORKSPACE_INSTANCE_ID: "inst-gm", HILO_WORKSPACE_GENERATION: "1" };
    const m = new GatewayManager({ entry, role: "workspace", workspaceDir: ws, exec: process.execPath, env }, () => {});
    const gw = await m.start();
    try {
      expect((await fetch(`${gw.url}/api/v3/capabilities`)).status).toBe(428);
      // v3 产品只跑 resource_v3：v2 的 `/api/canvas` 在这里是 403，所以用 v3 路由验身份。
      expect((await fetch(`${gw.url}/api/v3/capabilities`, { headers: { "x-hilo-workspace": env.HILO_WORKSPACE_CLAIM } })).status).toBe(200);
    } finally {
      await m.stop();
    }
  }, 30_000);

  it("网关进程拿到 resource_v3：v3 专属路由不再 403 PROJECT_V3_DISABLED", async () => {
    const ws = mkdtempSync(path.join(tmpdir(), "ov-gw-"));
    const env = { HILO_WORKSPACE_CLAIM: "e".repeat(64), HILO_WORKSPACE_INSTANCE_ID: "11111111-2222-4333-8444-555555555555", HILO_WORKSPACE_GENERATION: "1" };
    const m = new GatewayManager({ entry, role: "workspace", workspaceDir: ws, exec: process.execPath, env }, () => {});
    const gw = await m.start();
    try {
      // `/api/v3/search/images` 在网关里第一件事就是 `architecture.assertV3()`：
      // 没拿到 HILO_PROJECT_ARCHITECTURE=resource_v3 时会 403，拿到才走到占位实现。
      const r = await fetch(`${gw.url}/api/v3/search/images`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-hilo-workspace": env.HILO_WORKSPACE_CLAIM,
          "x-hilo-workspace-instance": env.HILO_WORKSPACE_INSTANCE_ID,
          "x-hilo-workspace-generation": env.HILO_WORKSPACE_GENERATION,
        },
        body: JSON.stringify({ queries: [{ query: "tiananmen flag" }], composition: { name: "搜索" } }),
      });
      expect(r.status).toBe(200);
      const body = await r.json();
      expect(Array.isArray(body.queries)).toBe(true);
    } finally {
      await m.stop();
    }
  }, 30_000);

  it("端口上是别的服务（nonce 不符）时不认它", async () => {
    // 冒充一个回 200、nonce 不对的旧 gateway 占着端口：新 gateway 起不来（端口被占），
    // 健康检查只会看到旧的，必须判失败而不是把旧的当成功。
    const imposter = createServer((_, res) => {
      res.setHeader("x-gateway-nonce", "stale");
      res.end("{}");
    });
    await new Promise<void>((r) => imposter.listen(0, "127.0.0.1", () => r()));
    const port = (imposter.address() as { port: number }).port;
    const ws = mkdtempSync(path.join(tmpdir(), "ov-gw-"));
    const m = new GatewayManager({ entry, role: "workspace", workspaceDir: ws, exec: process.execPath, port }, () => {});
    await expect(m.start()).rejects.toThrow(/退出|nonce/);
    await m.stop();
    imposter.close();
  }, 30_000);
});
