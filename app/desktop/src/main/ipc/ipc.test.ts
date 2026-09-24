import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { CancellationSource, type IMessagePassingProtocol } from "./channel.js";
import { type ClientConnectionEvent, IPCClient, IPCServer } from "./connection.js";
import { createMainIpcServer, type IpcMainLike, type SenderLike } from "./electron-server.js";
import { Emitter, type Event } from "./events.js";
import { fromService, toService } from "./proxy.js";
import { decodeValue, encodeValues } from "./wire.js";

const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));

/** 一对互通的内存连接。消息异步送达，模拟 IPC。 */
function pipe(): [IMessagePassingProtocol, IMessagePassingProtocol] {
  const a = new Emitter<Uint8Array>();
  const b = new Emitter<Uint8Array>();
  return [
    { send: (m) => void queueMicrotask(() => b.fire(m)), onMessage: a.event },
    { send: (m) => void queueMicrotask(() => a.fire(m)), onMessage: b.event },
  ];
}

function connect() {
  const connections = new Emitter<ClientConnectionEvent>();
  const server = new IPCServer<string>(connections.event);
  const [serverSide, clientSide] = pipe();
  const disconnect = new Emitter<void>();
  connections.fire({ protocol: serverSide, onDidClientDisconnect: disconnect.event });
  const client = new IPCClient<string>(clientSide, "renderer");
  return { server, client, disconnect };
}

class DemoService {
  private readonly changed = new Emitter<number>();
  readonly onDidChange: Event<number> = this.changed.event;
  private n = 0;
  add(a: number, b: number) {
    return a + b;
  }
  async echo(v: unknown) {
    return v;
  }
  bump() {
    this.changed.fire(++this.n);
  }
  fail() {
    const e = new Error("boom");
    e.name = "DemoError";
    throw e;
  }
  rejectPlain() {
    return Promise.reject({ code: "plain" });
  }
  slow() {
    return new Promise((r) => setTimeout(() => r("late"), 200));
  }
}

interface Demo {
  add(a: number, b: number): Promise<number>;
  echo<T>(v: T): Promise<T>;
  bump(): Promise<void>;
  fail(): Promise<void>;
  rejectPlain(): Promise<void>;
  slow(): Promise<string>;
  onDidChange: Event<number>;
}

describe("编码", () => {
  it("各类值来回一致", () => {
    const values = [undefined, "", "中文 ✓", 0, 1, 127, 128, 300, 2 ** 31, 4294967295, -1, 1.5, null, true, { a: [1, "x"] }, [1, [2, [3]]], new Uint8Array([1, 2, 255])];
    for (const v of values) expect(decodeValue(encodeValues(v))).toEqual(v);
  });

  it("负数不会被当成无符号解回大正数", () => {
    expect(decodeValue(encodeValues(-5))).toBe(-5);
  });
});

describe("频道往返", () => {
  it("方法调用、同步返回值、复杂参数", async () => {
    const { server, client } = connect();
    server.registerChannel("demo", fromService(new DemoService()));
    const demo = toService<Demo>(client.getChannel("demo"));
    expect(await demo.add(2, 3)).toBe(5);
    expect(await demo.echo({ deep: [1, { x: "y" }], n: null })).toEqual({ deep: [1, { x: "y" }], n: null });
  });

  it("Error 带着 name 过来，非 Error 的拒绝值原样过来", async () => {
    const { server, client } = connect();
    server.registerChannel("demo", fromService(new DemoService()));
    const demo = toService<Demo>(client.getChannel("demo"));
    await expect(demo.fail()).rejects.toMatchObject({ message: "boom", name: "DemoError" });
    await expect(demo.rejectPlain()).rejects.toEqual({ code: "plain" });
  });

  it("没有的方法报 Method not found", async () => {
    const { server, client } = connect();
    server.registerChannel("demo", fromService(new DemoService()));
    await expect(client.getChannel("demo").call("nope", [])).rejects.toThrow("Method not found: nope");
  });

  it("晚注册的频道：请求先搁置，注册后补上", async () => {
    const { server, client } = connect();
    const pending = client.getChannel("late").call<number>("add", [1, 1]);
    await tick(20);
    server.registerChannel("late", fromService(new DemoService()));
    expect(await pending).toBe(2);
  });

  it("一直没注册的频道 1 秒后报 Unknown channel", async () => {
    const { client } = connect();
    await expect(client.getChannel("ghost").call("x", [])).rejects.toMatchObject({ name: "Unknown channel" });
  }, 3000);

  it("取消：本地立即拒绝", async () => {
    const { server, client } = connect();
    server.registerChannel("demo", fromService(new DemoService()));
    const cts = new CancellationSource();
    const p = client.getChannel("demo").call("slow", [], cts.token);
    await tick(10);
    cts.cancel();
    await expect(p).rejects.toMatchObject({ name: "Canceled" });
  });

  it("注销频道后调用失败", async () => {
    const { server, client } = connect();
    server.registerChannel("demo", fromService(new DemoService()));
    const demo = toService<Demo>(client.getChannel("demo"));
    expect(await demo.add(1, 2)).toBe(3);
    server.unregisterChannel("demo");
    await expect(demo.add(1, 2)).rejects.toMatchObject({ name: "Unknown channel" });
  }, 3000);
});

describe("事件", () => {
  it("订阅后收到事件，退订后不再收到", async () => {
    const { server, client } = connect();
    const svc = new DemoService();
    server.registerChannel("demo", fromService(svc));
    const demo = toService<Demo>(client.getChannel("demo"));
    const got: number[] = [];
    const sub = demo.onDidChange((n) => got.push(n));
    await tick(10);
    await demo.bump();
    await demo.bump();
    await tick(10);
    expect(got).toEqual([1, 2]);
    sub.dispose();
    await tick(10);
    await demo.bump();
    await tick(10);
    expect(got).toEqual([1, 2]);
  });

  it("首个订阅者之前发生的事件被补发", async () => {
    const { server, client } = connect();
    const svc = new DemoService();
    server.registerChannel("demo", fromService(svc));
    svc.bump();
    svc.bump();
    const demo = toService<Demo>(client.getChannel("demo"));
    const got: number[] = [];
    demo.onDidChange((n) => got.push(n));
    await tick(20);
    expect(got).toEqual([1, 2]);
  });

  it("多个本地监听器共用一条远端订阅", async () => {
    const { server, client } = connect();
    const svc = new DemoService();
    let remoteSubs = 0;
    const channel = fromService(svc);
    server.registerChannel("demo", {
      call: channel.call,
      listen: (ctx, e, a) => {
        remoteSubs++;
        return channel.listen(ctx, e, a);
      },
    });
    const demo = toService<Demo>(client.getChannel("demo"));
    const a: number[] = [];
    const b: number[] = [];
    demo.onDidChange((n) => a.push(n));
    demo.onDidChange((n) => b.push(n));
    await tick(10);
    svc.bump();
    await tick(10);
    expect(remoteSubs).toBe(1);
    expect(a).toEqual([1]);
    expect(b).toEqual([1]);
  });

  it("连接断开后服务端释放该连接", async () => {
    const { server, client, disconnect } = connect();
    server.registerChannel("demo", fromService(new DemoService()));
    await toService<Demo>(client.getChannel("demo")).add(1, 1);
    expect(server.connectionCount).toBe(1);
    disconnect.fire();
    expect(server.connectionCount).toBe(0);
  });
});

describe("Electron 主进程服务端", () => {
  /** 假的 ipcMain + 假的渲染层：渲染层 send 的东西直接进 ipcMain 的监听器。 */
  function fakeElectron() {
    const listeners = new Map<string, Array<(e: { sender: SenderLike }, ...a: unknown[]) => void>>();
    const ipcMain: IpcMainLike = {
      on: (ch, fn) => {
        listeners.set(ch, [...(listeners.get(ch) ?? []), fn]);
      },
    };
    const toRenderer = new Emitter<Uint8Array>();
    const destroyed = new Emitter<void>();
    const sender: SenderLike = {
      id: 7,
      send: (ch, data) => {
        if (ch === "hilo:message") queueMicrotask(() => toRenderer.fire(data as Uint8Array));
      },
      isDestroyed: () => false,
      once: (_e, fn) => destroyed.event(fn),
    };
    const emit = (ch: string, ...a: unknown[]) => queueMicrotask(() => listeners.get(ch)?.forEach((fn) => fn({ sender }, ...a)));
    return { ipcMain, toRenderer, emit, destroyed };
  }

  it("hello → 身份 → 调用 → 事件；刷新页面时旧连接被替换", async () => {
    const fx = fakeElectron();
    const server = createMainIpcServer(fx.ipcMain);
    const svc = new DemoService();
    server.registerChannel("demo", fromService(svc));

    const open = () => {
      fx.emit("hilo:hello");
      const protocol: IMessagePassingProtocol = {
        // Electron 会把 Uint8Array 变成 Buffer 送到主进程；这里用 Buffer 模拟
        send: (m) => fx.emit("hilo:message", Buffer.from(m)),
        onMessage: fx.toRenderer.event,
      };
      return new IPCClient<string>(protocol, "renderer");
    };

    const client = open();
    const demo = toService<Demo>(client.getChannel("demo"));
    expect(await demo.add(20, 22)).toBe(42);
    const got: number[] = [];
    demo.onDidChange((n) => got.push(n));
    await tick(10);
    svc.bump();
    await tick(10);
    expect(got).toEqual([1]);
    expect(server.connectionCount).toBe(1);

    client.dispose();
    open();
    await tick(10);
    expect(server.connectionCount).toBe(1);
    fx.emit("hilo:disconnect");
    await tick(10);
    expect(server.connectionCount).toBe(0);
  });
});

describe("渲染层客户端 connectMainProcess", () => {
  it("经 preload 形状的 ipcRenderer 连上主进程：服务调用、事件、每工作区频道", async () => {
    const listeners = new Map<string, Array<(e: { sender: SenderLike }, ...a: unknown[]) => void>>();
    const ipcMain: IpcMainLike = { on: (ch, fn) => void listeners.set(ch, [...(listeners.get(ch) ?? []), fn]) };
    const rendererSide = new Map<string, Set<(e: unknown, ...a: unknown[]) => void>>();
    const sender: SenderLike = {
      id: 1,
      send: (ch, ...a) => queueMicrotask(() => rendererSide.get(ch)?.forEach((l) => l({}, ...a))),
      isDestroyed: () => false,
      once: () => undefined,
    };
    const ipcRenderer = {
      send: (ch: string, ...a: unknown[]) => queueMicrotask(() => listeners.get(ch)?.forEach((fn) => fn({ sender }, ...a))),
      on: (ch: string, l: (e: unknown, ...a: unknown[]) => void) => {
        const set = rendererSide.get(ch) ?? new Set();
        set.add(l);
        rendererSide.set(ch, set);
        return () => set.delete(l);
      },
    };
    const server = createMainIpcServer(ipcMain);
    const entries = new Emitter<string[]>();
    server.registerChannel("hilo", fromService({ onWorkspaceEntriesChanged: entries.event, listWorkspaceEntries: () => ["a"] }));

    const { connectMainProcess } = await import("../../renderer/src/ipc/client.js");
    const main = connectMainProcess(ipcRenderer);
    expect(await main.hilo.listWorkspaceEntries()).toEqual(["a"]);
    const got: unknown[] = [];
    main.hilo.onWorkspaceEntriesChanged((e) => got.push(e));
    await tick(10);
    entries.fire(["a", "b"]);
    await tick(10);
    expect(got).toEqual([["a", "b"]]);

    // 渲染层先订阅，主进程稍后才注册这个工作区的频道
    const bundle = main.getWorkspaceBundle("/w/x");
    const status = bundle.getStatus();
    await tick(20);
    server.registerChannel("workspace-bundle-/w/x", fromService({ getStatus: () => ({ state: "bound" }) }));
    expect(await status).toEqual({ state: "bound" });

    main.dispose();
    await tick(10);
    expect(server.connectionCount).toBe(0);
  });
});

describe("渲染层副本", () => {
  it("核心文件与主进程这份逐字节一致", () => {
    const here = import.meta.dirname;
    const renderer = path.resolve(here, "../../renderer/src/ipc");
    const shared = ["events.ts", "wire.ts", "channel.ts", "connection.ts", "proxy.ts", "types.ts"];
    const present = readdirSync(renderer);
    for (const f of shared) {
      expect(present).toContain(f);
      expect(readFileSync(path.join(renderer, f), "utf8"), f).toBe(readFileSync(path.join(here, f), "utf8"));
    }
  });
});
