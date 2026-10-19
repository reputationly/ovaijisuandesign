import vm from "node:vm";

import { describe, expect, it } from "vitest";

import { HUB_SDK_SOURCE } from "./hub-sdk.js";

describe("插件宿主脚本", () => {
  it("加载后握手，并把 canvas 调用收成 RPC", async () => {
    const messages: Record<string, unknown>[] = [];
    const listeners = new Map<string, (event: { data: unknown }) => void>();
    const window = {
      parent: { postMessage: (frame: Record<string, unknown>) => messages.push(frame) },
      addEventListener: (type: string, listener: (event: { data: unknown }) => void) => {
        listeners.set(type, listener);
      },
      hub: undefined as unknown,
    };
    vm.runInNewContext(HUB_SDK_SOURCE, { window });
    expect(messages[0]).toEqual({ kind: "hub:handshake", v: "2", from: "sdk" });
    listeners.get("message")?.({ data: { kind: "hub:handshake", v: "2", from: "host", nodeId: "node-1", app: { locale: "zh-CN" } } });
    const pending = (window.hub as { canvas: { getNode: (args: unknown) => Promise<unknown> } }).canvas.getNode({ id: "node-1" });
    const request = messages[1];
    expect(request).toMatchObject({ kind: "hub:rpc:request", v: "2", method: "canvas.getNode", args: { id: "node-1" } });
    listeners.get("message")?.({ data: { kind: "hub:rpc:response", v: "2", id: request?.id, ok: true, result: { id: "node-1" } } });
    await expect(pending).resolves.toEqual({ id: "node-1" });
    (window.hub as { main: { set: (handler: (() => void) | null) => void } }).main.set(() => undefined);
    expect(messages.at(-1)).toMatchObject({ kind: "hub:event", topic: "main:registered" });
  });
});
