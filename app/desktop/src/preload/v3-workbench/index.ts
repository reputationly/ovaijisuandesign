/**
 * v3 原生工作台的预加载桥（第 276 轮，按参照 out/preload/index.mjs 重写）。
 *
 * 之前这里暴露的是 `__HILO_V3_PORT_HOST__`，形态也不一样（connect 返回 Promise）。
 * 而渲染层（restored 的 native-workbench-closure.js）要的是
 * `window.__HILO_V3_NATIVE_HOST__`，且期望 `subscribe(ownerId, listener)` +
 * `connect(onMessage)` 返回 `{ bootstrap, postMessage, start, close }`。
 * 名字与形态都对不上 → 渲染层直接抛 "Native workbench preload unavailable"。
 *
 * 主进程侧的通道名一致（hilo:v3-workbench:host-port），所以只改这一层即可。
 */
import { contextBridge, ipcRenderer } from "electron";
import type { IpcRendererEvent } from "electron";

const NATIVE_WORKBENCH_HOST_PORT = "hilo:v3-workbench:host-port";

type Listener = (
  documentId: string,
  port: {
    version: number;
    connect: (onMessage: (message: unknown) => void) => Promise<{
      bootstrap: unknown;
      postMessage: (message: unknown) => void;
      start: () => void;
      close: () => void;
    }>;
  },
) => void;

const bridge = {
  subscribe(ownerId: string, listener: Listener) {
    const close = new Set<() => void>();
    const receive = (event: IpcRendererEvent, raw: unknown) => {
      if (!raw || typeof raw !== "object" || !("ownerId" in raw) || raw.ownerId !== ownerId) return;
      if (!("documentId" in raw) || typeof raw.documentId !== "string" || event.ports.length !== 1) {
        for (const port of event.ports) port.close();
        return;
      }
      const port = event.ports[0]!;
      let claimed = false;
      let active = true;
      let stop = () => {
        active = false;
        port.close();
      };
      close.add(() => stop());
      listener(raw.documentId, {
        version: 2,
        async connect(onMessage) {
          if (claimed || !active) throw new Error("Native workbench port retired or claimed");
          claimed = true;
          const receiveMessage = (message: MessageEvent) => {
            if (active) onMessage(message.data);
          };
          port.addEventListener("message", receiveMessage);
          stop = () => {
            if (!active) return;
            active = false;
            port.removeEventListener("message", receiveMessage);
            port.close();
          };
          return {
            bootstrap: undefined,
            postMessage: (message: unknown) => {
              if (active) port.postMessage(message);
            },
            start: () => {
              if (active) port.start();
            },
            close: stop,
          };
        },
      });
    };
    ipcRenderer.on(NATIVE_WORKBENCH_HOST_PORT, receive);
    return () => {
      ipcRenderer.removeListener(NATIVE_WORKBENCH_HOST_PORT, receive);
      for (const stop of close) stop();
    };
  },
};

contextBridge.exposeInMainWorld("__HILO_V3_NATIVE_HOST__", bridge);
