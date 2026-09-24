/**
 * 渲染层接入主进程总线。
 *
 * 用 preload 暴露的 `window.hilo.ipcRenderer`（白名单内的 send/on）建一条连接：
 * 先 `hilo:hello`，再把身份 "renderer" 作为第一条 `hilo:message` 发出去，之后就是
 * 普通的请求/事件。页面卸载时发 `hilo:disconnect`，主进程据此释放订阅。
 *
 * 除了 `connectMainProcess()` 本身以外，这个目录里的文件（events / wire / channel /
 * connection / proxy / types）与主进程那份逐字节相同，由主进程的测试把关。
 */
import type { IChannel, IMessagePassingProtocol } from "./channel.js";
import { IPCClient } from "./connection.js";
import { Emitter } from "./events.js";
import { toService } from "./proxy.js";
import type { IBundleView, IGatewayReadiness, IHiloApp, IProjectService } from "./types.js";
import { asBytes } from "./wire.js";

/** preload 暴露的最小形状。`on` 返回取消订阅函数。 */
export interface HiloIpcRenderer {
  send(channel: string, ...args: unknown[]): void;
  on(channel: string, listener: (event: unknown, ...args: unknown[]) => void): () => void;
}

export interface MainProcessConnection {
  /** 任意频道。 */
  getChannel(name: string): IChannel;
  /** 把频道包成服务代理。 */
  getService<T extends object>(name: string): T;
  /** 常用服务。 */
  readonly hilo: IHiloApp;
  readonly project: IProjectService;
  readonly gatewayReadiness: IGatewayReadiness;
  /** `workspace-bundle-${id}`，按 id 缓存。 */
  getWorkspaceBundle(workspaceId: string): IBundleView;
  /** 丢掉不在列表里的 bundle 代理（关掉的标签）。 */
  pruneWorkspaceBundles(liveIds: Iterable<string>): void;
  dispose(): void;
}

function defaultIpcRenderer(): HiloIpcRenderer {
  const w = globalThis as unknown as { hilo?: { ipcRenderer?: HiloIpcRenderer } };
  const ipc = w.hilo?.ipcRenderer;
  if (!ipc) throw new Error("window.hilo.ipcRenderer is missing (preload not loaded?)");
  return ipc;
}

export function connectMainProcess(ipc: HiloIpcRenderer = defaultIpcRenderer(), ctx = "renderer"): MainProcessConnection {
  const incoming = new Emitter<Uint8Array>();
  const off = ipc.on("hilo:message", (_event, data) => {
    try {
      incoming.fire(asBytes(data));
    } catch {
      // 非二进制消息忽略
    }
  });
  const protocol: IMessagePassingProtocol = {
    send: (message) => ipc.send("hilo:message", message),
    onMessage: incoming.event,
  };
  ipc.send("hilo:hello");
  const client = new IPCClient<string>(protocol, ctx);

  const services = new Map<string, object>();
  const getService = <T extends object>(name: string): T => {
    let svc = services.get(name);
    if (!svc) {
      svc = toService<T>(client.getChannel(name));
      services.set(name, svc);
    }
    return svc as T;
  };
  const bundles = new Map<string, IBundleView>();

  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    client.dispose();
    off();
    incoming.dispose();
    try {
      ipc.send("hilo:disconnect");
    } catch {
      // 页面正在卸载
    }
  };
  if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
    window.addEventListener("unload", dispose, { once: true });
  }

  return {
    getChannel: (name) => client.getChannel(name),
    getService,
    get hilo() {
      return getService<IHiloApp>("hilo");
    },
    get project() {
      return getService<IProjectService>("project");
    },
    get gatewayReadiness() {
      return getService<IGatewayReadiness>("gateway-readiness");
    },
    getWorkspaceBundle(workspaceId) {
      let b = bundles.get(workspaceId);
      if (!b) {
        b = toService<IBundleView>(client.getChannel(`workspace-bundle-${workspaceId}`));
        bundles.set(workspaceId, b);
      }
      return b;
    },
    pruneWorkspaceBundles(liveIds) {
      const keep = new Set(liveIds);
      for (const id of [...bundles.keys()]) if (!keep.has(id)) bundles.delete(id);
    },
    dispose,
  };
}
