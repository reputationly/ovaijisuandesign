/**
 * `storage:*` 原始通道。
 *
 * - global-get 不带 key 时返回整份（私有键抹掉）；带私有键返回 undefined。
 * - global-set 拒绝私有键和 `config.customModels*`；写 `config` 时保留已存的
 *   customModels —— 渲染层拿到的 config 里没有它，整份写回来会把它冲掉。
 * - workspace-* 的目录必须是绝对路径。
 * - tokens / user 只存本地（没有登录流程），不向 gateway 推送。
 */
import { isPlainObject } from "./json-file.js";
import { type GlobalStore, PRIVATE_GLOBAL_KEYS } from "./global-store.js";
import type { WorkspaceStorageRegistry } from "./workspace-store.js";

export interface IpcHandleLike {
  handle(channel: string, listener: (event: unknown, ...args: unknown[]) => unknown): void;
}

export function redactGlobal(all: Record<string, unknown>): Record<string, unknown> {
  const out = { ...all };
  for (const k of PRIVATE_GLOBAL_KEYS) delete out[k];
  if (isPlainObject(out.config)) {
    const cfg = { ...out.config };
    delete cfg.customModels;
    out.config = cfg;
  }
  return out;
}

export function globalGet(store: GlobalStore, key?: unknown): unknown {
  if (key === undefined || key === null) return redactGlobal(store.getAll());
  if (typeof key !== "string" || PRIVATE_GLOBAL_KEYS.has(key)) return undefined;
  const value = store.get(key);
  if (key === "config" && isPlainObject(value)) {
    const cfg = { ...value };
    delete cfg.customModels;
    return cfg;
  }
  return value;
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

export function registerStorageIpc(ipc: IpcHandleLike, global: GlobalStore, workspaces: WorkspaceStorageRegistry): void {
  ipc.handle("storage:global-get", (_e, key) => globalGet(global, key));
  ipc.handle("storage:global-set", (_e, key, value) => globalSet(global, key, value));
  ipc.handle("storage:workspace-get", (_e, dir, key) => workspaces.get(String(dir), typeof key === "string" ? key : undefined));
  ipc.handle("storage:workspace-set", (_e, dir, key, value) => {
    if (typeof key !== "string" || !key) throw new Error("storage key must be a non-empty string");
    workspaces.set(String(dir), key, value);
  });
  ipc.handle("storage:get-desktop-config", () => globalGet(global, "config"));
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
