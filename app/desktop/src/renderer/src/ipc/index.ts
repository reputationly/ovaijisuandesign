/**
 * 渲染层到主进程的总线客户端。用法：
 *
 * ```ts
 * import { connectMainProcess } from "./ipc";
 * const main = connectMainProcess();
 * const r = await main.hilo.openWorkspaceWithResult(dir);
 * const off = main.hilo.onWorkspaceEntriesChanged((entries) => …);
 * main.getWorkspaceBundle(id).onStatusChange((s) => …);
 * ```
 */
export { connectMainProcess, type HiloIpcRenderer, type MainProcessConnection } from "./client.js";
export { CancellationError, CancellationSource, type IChannel } from "./channel.js";
export type { Event, IDisposable } from "./events.js";
export { toService } from "./proxy.js";
export type * from "./types.js";
