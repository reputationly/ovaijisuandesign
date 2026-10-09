/**
 * 令牌页的 preload：只暴露三个方法（读模型信息、保存令牌、退出），不带主应用那一整套 `window.hilo`。
 * 通道名和主进程的 `token-gate.ts` 共用 `gate-channels.ts`（零依赖，不会把主进程逻辑打进 preload）。
 */
import { contextBridge, ipcRenderer } from "electron";

import { GATE_CHANNELS } from "../main/onboarding/gate-channels.js";

contextBridge.exposeInMainWorld("ovGate", {
  info: () => ipcRenderer.invoke(GATE_CHANNELS.info),
  save: (token: string) => ipcRenderer.invoke(GATE_CHANNELS.save, token),
  quit: () => ipcRenderer.send(GATE_CHANNELS.quit),
});
