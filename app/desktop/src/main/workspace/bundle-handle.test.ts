import { EventEmitter } from "node:events";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { BundleState } from "../ipc/types.js";
import type { Endpoint, LaunchSpec, Status } from "../opencode/runtime.js";
import { BundleHandle, type BundleHandleDeps, createSerialGate, type GatewayProcess, type OpencodeProcess } from "./bundle-handle.js";

const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));

class FakeGateway extends EventEmitter implements GatewayProcess {
  running: { url: string } | undefined;
  startResult: "ok" | "fail" = "ok";
  env: Record<string, string> = {};
  constructor(private readonly events: string[]) {
    super();
  }
  async allocatePort() {
    return "http://127.0.0.1:1";
  }
  async start() {
    this.events.push("gateway:start");
    await tick(5);
    if (this.startResult === "fail") throw new Error("health timeout");
    this.running = { url: "http://127.0.0.1:1" };
    return this.running;
  }
  async stop() {
    this.events.push("gateway:stop");
    this.running = undefined;
  }
  stopSync() {
    this.events.push("gateway:stopSync");
  }
}

class FakeOpencode extends EventEmitter implements OpencodeProcess {
  status: Status = { state: "stopped" };
  endpoint: Endpoint | undefined;
  fails = false;
  constructor(
    private readonly events: string[],
    private readonly name: string,
  ) {
    super();
  }
  async start(_spec: LaunchSpec) {
    this.events.push(`${this.name}:start`);
    await tick(10);
    if (this.fails) {
      this.status = { state: "failed", reason: "bad model" };
      throw new Error("bad model");
    }
    this.events.push(`${this.name}:ready`);
    this.endpoint = { url: "http://127.0.0.1:2", username: "u", password: "p" };
    this.status = { state: "ready", url: this.endpoint.url, version: "1" };
    return this.endpoint;
  }
  async stop() {
    this.events.push(`${this.name}:stop`);
  }
  stopSync() {}
  fail(reason: string) {
    this.status = { state: "failed", reason };
  }
}

let events: string[];
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  events = [];
  fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

function make(over: Partial<BundleHandleDeps> = {}, name = "oc") {
  const gw = new FakeGateway(events);
  const oc = new FakeOpencode(events, name);
  const deps: BundleHandleDeps = {
    createGateway: (_dir, env) => {
      gw.env = env;
      return gw;
    },
    createOpencode: () => oc,
    prepareOpencode: () => ({ binary: "x", cwd: "/w", env: {}, configFile: "/tmp/c.json" }),
    log: () => {},
    ...over,
  };
  const h = new BundleHandle("/w/a", "/w/a", 3, deps);
  const states: BundleState[] = [];
  h.onStatusChange((s) => states.push(s.state));
  return { h, gw, oc, states };
}

describe("BundleHandle", () => {
  it("start 拿到地址就返回；之后走到 bound，并把 opencode 地址推给 gateway", async () => {
    const { h, gw, states } = make();
    const first = await h.start();
    expect(first.state).toBe("gateway-starting");
    expect(first.gatewayUrl).toBe("http://127.0.0.1:1");
    expect(h.binding()).toMatchObject({ baseUrl: "http://127.0.0.1:1", generation: 3 });
    expect(gw.env.HILO_WORKSPACE_GENERATION).toBe("3");
    expect(gw.env.HILO_WORKSPACE_CLAIM).toMatch(/^[0-9a-f]{64}$/);
    await tick(40);
    expect(states).toEqual(["gateway-starting", "gateway-starting", "gateway-ready", "opencode-starting", "bound"]);
    expect(h.status()).toMatchObject({ state: "bound", openCodeUrl: "http://127.0.0.1:2", readiness: { chat: "ready" } });
    // gateway 和 opencode 同时起，不是一个等另一个
    expect(events.slice(0, 2).sort()).toEqual(["gateway:start", "oc:start"]);
    const push = fetchMock.mock.calls.find((c) => String(c[0]).endsWith("/api/runtime/opencode-url"));
    expect(push).toBeTruthy();
    expect((push![1] as RequestInit).headers).toMatchObject({ "x-hilo-workspace-generation": "3" });
  });

  it("opencode 拿到和 gateway 同一份身份：插件和 MCP 回连时要带", async () => {
    let identity: Record<string, string> = {};
    const { h, gw } = make({
      prepareOpencode: (_dir, _url, id) => {
        identity = id;
        return { binary: "x", cwd: "/w", env: {}, configFile: "/tmp/c.json" };
      },
    });
    await h.start();
    await tick(40);
    expect(identity).toEqual(gw.env);
    expect(identity.HILO_WORKSPACE_INSTANCE_ID).toBeTruthy();
  });

  it("gateway 起不来：failed，并停掉两个进程", async () => {
    const { h, gw, states } = make();
    gw.startResult = "fail";
    await h.start();
    await tick(40);
    expect(states.at(-1)).toBe("failed");
    expect(h.status().error).toContain("health timeout");
    expect(h.binding()).toBeUndefined();
    expect(events).toContain("gateway:stop");
  });

  it("opencode 起不来：仍然 bound（画布能用），聊天标记为不可用", async () => {
    const { h, oc } = make();
    oc.fails = true;
    await h.start();
    await tick(40);
    expect(h.status()).toMatchObject({ state: "bound", readiness: { chat: "failed" }, error: "bad model" });
  });

  it("运行中 gateway 反复崩溃：failed", async () => {
    const { h, gw } = make();
    await h.start();
    await tick(40);
    gw.emit("failed", "exit 1");
    expect(h.status().state).toBe("failed");
  });

  it("dispose：先停 opencode 再停 gateway，状态到 stopped", async () => {
    const { h, states } = make();
    await h.start();
    await tick(40);
    events.length = 0;
    await h.dispose();
    expect(events).toEqual(["oc:stop", "gateway:stop"]);
    expect(states.slice(-2)).toEqual(["stopping", "stopped"]);
  });

  it("共用的启动闸门：两个工作区的 opencode 不会同时启动", async () => {
    const gate = createSerialGate();
    const a = make({ opencodeStartGate: gate }, "ocA");
    const b = make({ opencodeStartGate: gate }, "ocB");
    await Promise.all([a.h.start(), b.h.start()]);
    await tick(80);
    const order = events.filter((e) => e.startsWith("oc"));
    expect(order).toEqual(["ocA:start", "ocA:ready", "ocB:start", "ocB:ready"]);
    expect(a.h.status().state).toBe("bound");
    expect(b.h.status().state).toBe("bound");
  });

  it("活动探测：drain 时带参数，gateway 不在时返回 undefined", async () => {
    const { h } = make();
    expect(await h.probeActivity()).toBeUndefined();
    await h.start();
    await tick(40);
    fetchMock.mockImplementationOnce(async () => new Response(JSON.stringify({ idle: true, safe_to_suspend: true, safe_to_close: true, blocking_reasons: [] })));
    expect(await h.probeActivity(true)).toMatchObject({ safe_to_suspend: true });
    expect(String(fetchMock.mock.calls.at(-1)![0])).toBe("http://127.0.0.1:1/api/health/activity?drain=1");
  });
});
