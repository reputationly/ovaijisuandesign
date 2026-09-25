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
      expect((await fetch(`${gw.url}/api/canvas`)).status).toBe(428);
      expect((await fetch(`${gw.url}/api/canvas`, { headers: { "x-hilo-workspace": env.HILO_WORKSPACE_CLAIM } })).status).toBe(200);
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
