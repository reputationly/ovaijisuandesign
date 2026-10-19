/**
 * v3 工作台的 preload。
 *
 * 这扇窗口的界面代码不是我们自己的 bundle 直接跑起来的 —— 主进程把资源帧的内容
 * **通过 MessagePort 推过来**，这里负责把端口变成页面能用的一个小对象
 * （`window.__HILO_V3_PORT_HOST__`），再把页面的话回推过去。
 *
 * 三条约束决定了这里的形状：
 *
 * 1. **只连一次**。端口是主进程为这个资源帧单独开的，第二次 `connect` 直接拒绝 ——
 *    允许多次会让两个消费者抢同一个端口，消息互相吃掉。
 * 2. **有超时**。主进程那边可能根本没把这帧建起来（owner 已释放、窗口已关），
 *    不设超时就永远挂着，页面看起来像卡死。
 * 3. **`pagehide` 时必须拆干净**。不拆的话端口和 IPC 监听会留在已销毁的文档上，
 *    下次导航回来会撞上「端口已被占用」。
 *
 * `pending` 是模块级可变绑定，**导出是有意的**：协议包那边有一条指向本文件的循环依赖
 *（见 `project-v3/task-mappers`）。看着像没用到，但它在模块图里是真实存在的边，别删。
 */
import { contextBridge, ipcRenderer, type IpcRendererEvent } from "electron";
import { PROJECT_RESOURCE_FRAME_BOOTSTRAP } from "@ov/host-contract";

/** 等主进程把端口送过来最多等这么久。 */
const CONNECT_TIMEOUT_MS = 10_000;

/** 主进程送来的端口与它对应的引导信息。 */
let delivered: { bootstrap: unknown; port: MessagePort } | undefined;

interface Waiting {
  onMessage: (data: unknown) => void;
  resolve: (host: NativePortHost) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

/** 页面在等端口时的状态。绑定是活的：`bind` 会把它清掉。 */
export let pending: Waiting | undefined;

let claimed = false;
let retired = false;
let closePort: (() => void) | undefined;

/** 页面拿到的对象。它自己不管端口，只管转发。 */
export interface NativePortHost {
  bootstrap: unknown;
  postMessage(message: unknown): void;
  start(): void;
  close(): void;
}

/** 端口与等待状态都齐了就把它们接上。两边谁先到都会调一次。 */
function bind(): void {
  if (!delivered || !pending || retired) return;
  const { bootstrap, port } = delivered;
  const waiting = pending;
  pending = undefined;
  clearTimeout(waiting.timer);

  let active = true;
  const receive = (event: MessageEvent) => {
    if (active) waiting.onMessage(event.data);
  };
  const closed = () => {
    if (active) {
      // 端口被对面关掉时，先当成一条消息告诉页面，再收拾自己
      waiting.onMessage({ type: "closed" });
      close();
    }
  };
  function close() {
    if (!active) return;
    active = false;
    port.removeEventListener("message", receive);
    port.removeEventListener("close", closed);
    port.close();
  }

  port.addEventListener("message", receive);
  port.addEventListener("close", closed);
  closePort = close;
  waiting.resolve({
    bootstrap,
    postMessage(message: unknown) {
      if (active && !retired) port.postMessage(message);
    },
    start() {
      if (active && !retired) port.start();
    },
    close,
  });
}

const bridge = {
  version: 2,
  connect(onMessage: (data: unknown) => void): Promise<NativePortHost> {
    if (claimed || retired || typeof onMessage !== "function") {
      return Promise.reject(new Error("Native port unavailable"));
    }
    claimed = true;
    return new Promise((resolve, rejectPromise) => {
      const timer = setTimeout(() => {
        retired = true;
        pending = undefined;
        delivered?.port.close();
        rejectPromise(new Error("Native host unavailable"));
      }, CONNECT_TIMEOUT_MS);
      pending = { onMessage, resolve, reject: rejectPromise, timer };
      bind();
    });
  },
};

contextBridge.exposeInMainWorld("__HILO_V3_PORT_HOST__", bridge);

/** 主进程送端口过来。只认第一条：多的直接关掉，避免端口泄漏。 */
const receivePort = (event: IpcRendererEvent, bootstrap: unknown) => {
  if (retired || delivered || event.ports.length !== 1) {
    for (const port of event.ports) port.close();
    return;
  }
  delivered = { bootstrap, port: event.ports[0]! };
  bind();
};

ipcRenderer.on(PROJECT_RESOURCE_FRAME_BOOTSTRAP, receivePort);

// 文档卸载时把端口、定时器、IPC 监听全部拆掉。`once` 保证只跑一次。
window.addEventListener(
  "pagehide",
  () => {
    retired = true;
    closePort?.();
    delivered?.port.close();
    if (pending) {
      clearTimeout(pending.timer);
      pending.reject(new Error("Native document retired"));
      pending = undefined;
    }
    ipcRenderer.removeListener(PROJECT_RESOURCE_FRAME_BOOTSTRAP, receivePort);
  },
  { once: true },
);

// 产物里这里还留着一条 `import { reject } from protocol/capabilities/request`，
// 同样未被使用。按仓库约定跨包一律走包名，而 `reject` 不在 `@ov/protocol` 的对外导出里，
// 所以这条去掉了（未被使用，不影响行为）。
