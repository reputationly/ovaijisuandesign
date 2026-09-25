/**
 * `storage:*` 原始通道。
 *
 * - global-get 不带 key 时返回整份（私有键抹掉）；带私有键返回 undefined。
 *   `config.customModels` 照常给渲染层读：设置页的自定义模型列表就是从这里取的。
 * - global-set 拒绝私有键和 `config.customModels*`；写 `config` 时忽略渲染层带来的
 *   customModels、保留已存的那份 —— 它只归主进程写。
 * - workspace-* 的目录必须是绝对路径。
 * - tokens / user 只存本地（没有登录流程），不向 gateway 推送。
 */
import { existsSync } from "node:fs";

import { isPlainObject } from "./json-file.js";
import { type GlobalStore, PRIVATE_GLOBAL_KEYS } from "./global-store.js";
import type { WorkspaceStorageRegistry } from "./workspace-store.js";

export interface IpcHandleLike {
  handle(channel: string, listener: (event: unknown, ...args: unknown[]) => unknown): void;
}

export function redactGlobal(all: Record<string, unknown>): Record<string, unknown> {
  const out = { ...all };
  for (const k of PRIVATE_GLOBAL_KEYS) delete out[k];
  return out;
}

export function globalGet(store: GlobalStore, key?: unknown): unknown {
  if (key === undefined || key === null || key === "") return redactGlobal(store.getAll());
  if (typeof key !== "string" || PRIVATE_GLOBAL_KEYS.has(key)) return undefined;
  return store.get(key);
}

export function globalSet(store: GlobalStore, key: unknown, value: unknown): void {
  if (typeof key !== "string" || !key) throw new Error("storage key must be a non-empty string");
  const root = key.split(".")[0] ?? key;
  if (PRIVATE_GLOBAL_KEYS.has(root)) throw new Error(`storage key is private: ${key}`);
  if (key.startsWith("config.customModels")) throw new Error("config.customModels is main-owned");
  if (key === "config" && isPlainObject(value)) {
    const next = { ...value };
    delete next.customModels;
    store.set("config", next);
    return;
  }
  store.set(key, value);
}

/** 工作目录没设或已经不存在时换回默认目录并写回（渲染层按它开新项目）。 */
export function desktopConfig(store: GlobalStore, defaultWorkingDirectory?: string): unknown {
  const config = store.get("config");
  const wd = config.workingDirectory;
  if (defaultWorkingDirectory && (typeof wd !== "string" || !wd || !existsSync(wd))) {
    store.set("config", { workingDirectory: defaultWorkingDirectory });
    return { ...config, workingDirectory: defaultWorkingDirectory };
  }
  return config;
}

export function registerStorageIpc(
  ipc: IpcHandleLike,
  global: GlobalStore,
  workspaces: WorkspaceStorageRegistry,
  defaultWorkingDirectory?: string,
): void {
  ipc.handle("storage:global-get", (_e, key) => globalGet(global, key));
  ipc.handle("storage:global-set", (_e, key, value) => globalSet(global, key, value));
  ipc.handle("storage:workspace-get", (_e, dir, key) => workspaces.get(String(dir), typeof key === "string" ? key : undefined));
  ipc.handle("storage:workspace-set", (_e, dir, key, value) => {
    if (typeof key !== "string" || !key) throw new Error("storage key must be a non-empty string");
    workspaces.set(String(dir), key, value);
  });
  ipc.handle("storage:get-desktop-config", () => desktopConfig(global, defaultWorkingDirectory));
  ipc.handle("storage:set-desktop-config", () => ({ success: false, error: "Deprecated: use storage:global-set('config', …)" }));
  ipc.handle("storage:clear-all", () => {
    global.reset();
    return { success: true };
  });
  ipc.handle("storage:get-tokens", () => global.get("tokens"));
  ipc.handle("storage:get-user", () => global.get("user"));
  ipc.handle("storage:set-tokens", (_e, tokens) => {
    global.replace("tokens", isPlainObject(tokens) ? tokens : {});
    return { success: true };
  });
  ipc.handle("storage:set-user", (_e, user) => {
    global.replace("user", isPlainObject(user) ? user : {});
    return { success: true };
  });
  ipc.handle("storage:clear-tokens", () => {
    global.replace("tokens", { accessToken: "", idToken: "", adAttribution: null });
    return { success: true };
  });
  ipc.handle("storage:clear-user", () => {
    global.replace("user", { userID: "", avatar: "", userName: "" });
    return { success: true };
  });
}
