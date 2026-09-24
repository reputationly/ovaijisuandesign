import type { INestApplication } from "@nestjs/common";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import WebSocket from "ws";

import { createApp } from "../bootstrap.js";
import { GatewayEventBus } from "../common/gateway-event-bus.js";

describe("/ws", () => {
  let app: INestApplication;
  let url: string;
  beforeAll(async () => {
    app = await createApp();
    await app.listen(0, "127.0.0.1");
    const addr = app.getHttpServer().address();
    url = `ws://127.0.0.1:${addr.port}/ws`;
  });
  afterAll(async () => {
    await app.close();
  });

  function connect(): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url);
      ws.once("open", () => resolve(ws));
      ws.once("error", reject);
    });
  }
  function next(ws: WebSocket): Promise<any> {
    return new Promise((resolve) => ws.once("message", (d) => resolve(JSON.parse(String(d)))));
  }

  it("总线上的事件原样广播给每个连接，直接发 payload 不包一层", async () => {
    const [a, b] = await Promise.all([connect(), connect()]);
    const got = Promise.all([next(a), next(b)]);
    app.get(GatewayEventBus).emit("canvas:updated", { type: "canvas_updated", origin: "user-add" });
    expect(await got).toEqual([
      { type: "canvas_updated", origin: "user-add" },
      { type: "canvas_updated", origin: "user-add" },
    ]);
    a.close();
    b.close();
  });

  it("ping 回 pong", async () => {
    const ws = await connect();
    const got = next(ws);
    ws.send(JSON.stringify({ type: "ping" }));
    expect(await got).toEqual({ type: "pong" });
    ws.close();
  });

  it("坏 JSON 回一个结构化错误", async () => {
    const ws = await connect();
    const got = next(ws);
    ws.send("{ 不是 json");
    expect(await got).toMatchObject({ type: "error", error: { error_code: "GATEWAY_BAD_REQUEST" } });
    ws.close();
  });

  it("断开的连接从总线上退订 —— 否则每次广播都往死 socket 写", async () => {
    // 先等前面测试关掉的连接处理完断开，否则基数会把它们也算进去。
    await new Promise((r) => setTimeout(r, 50));
    const ws = await connect();
    const bus = app.get(GatewayEventBus) as any;
    const before = bus.emitter.listenerCount("message");
    ws.close();
    await new Promise((r) => setTimeout(r, 50));
    expect(bus.emitter.listenerCount("message")).toBe(before - 1);
  });
});
