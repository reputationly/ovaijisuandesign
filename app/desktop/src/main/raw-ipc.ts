/**
 * 走 `ipcMain.handle` 的原始通道（preload 的平台封装在用）。
 *
 * 首页和工作区页一上来就会碰的那些先做实：窗口、应用信息、网络、shell、剪贴板、
 * 文件、对话框、日志。登录、自动更新、内置浏览器等不在范围内的给固定返回值。
 */
import { copyFile, cp, mkdir, readdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  app,
  BrowserWindow,
  clipboard,
  dialog,
  type IpcMainInvokeEvent,
  ipcMain,
  nativeImage,
  net,
  Notification,
  shell,
} from "electron";

import { IPC } from "./ipc/channels.js";

type Handler = (event: IpcMainInvokeEvent, ...args: unknown[]) => unknown;

const registered = new Set<string>();

/** 重复注册在开发时直接报错：两个 handler 抢一个通道，后注册的静默失效。 */
function handle(channel: string, fn: Handler): void {
  if (registered.has(channel)) throw new Error(`duplicate ipc handler: ${channel}`);
  registered.add(channel);
  ipcMain.handle(channel, async (event, ...args) => {
    try {
      return await fn(event, ...args);
    } catch (err) {
      console.error(`[ipc] ${channel} failed:`, err instanceof Error ? err.message : err);
      throw err;
    }
  });
}

export interface RawIpcDeps {
  logDir: string;
  /** 菜单动作（新建工作区、关标签…）。 */
  triggerMenu: (actionId: string, sender: Electron.WebContents) => void | Promise<void>;
  /** opencode 需要按新配置重启（技能开关变更后渲染层会调）。 */
  restartOpencode: () => Promise<void>;
  log: (level: string, message: string) => void;
}

function windowOf(event: IpcMainInvokeEvent): BrowserWindow | null {
  return BrowserWindow.fromWebContents(event.sender);
}

function str(v: unknown, what: string): string {
  if (typeof v !== "string" || !v) throw new Error(`${what} must be a non-empty string`);
  return v;
}

function absPath(v: unknown): string {
  const p = str(v, "path");
  if (!path.isAbsolute(p)) throw new Error(`path must be absolute: ${p}`);
  return p;
}

export function registerRawIpc(deps: RawIpcDeps): void {
  // 窗口
  handle("window:minimize", (e) => windowOf(e)?.minimize());
  handle("window:maximize", (e) => {
    const w = windowOf(e);
    if (!w) return;
    if (w.isMaximized()) w.unmaximize();
    else w.maximize();
  });
  handle("window:close", (e) => windowOf(e)?.close());
  handle("window:is-maximized", (e) => windowOf(e)?.isMaximized() ?? false);
  handle("window:is-fullscreen", (e) => windowOf(e)?.isFullScreen() ?? false);
  handle("window:set-button-visibility", (e, visible) => {
    const w = windowOf(e);
    if (w && process.platform === "darwin") w.setWindowButtonVisibility(Boolean(visible));
  });

  // 应用
  handle("app:get-version", () => app.getVersion());
  handle("app:get-platform", () => ({ platform: process.platform, arch: process.arch }));
  handle("app:quit", () => app.quit());
  handle("app:get-log-path", () => deps.logDir);
  handle("app:open-log-dir", async () => {
    const err = await shell.openPath(deps.logDir);
    return err ? { success: false, error: err } : { success: true };
  });
  handle("app:get-runtime-info", () => ({
    appVersion: app.getVersion(),
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
    platform: process.platform,
    arch: process.arch,
    cpuCount: os.cpus().length,
    totalMemoryMb: Math.round(os.totalmem() / 1048576),
    uptimeSec: Math.round(process.uptime()),
  }));
  handle("app:get-diagnostics-context", () => ({
    userId: "",
    appVersion: app.getVersion(),
    releaseChannel: "prod",
    releaseRegion: "domestic",
    timestamp: Date.now(),
  }));
  handle("app:get-proxy-status", () => ({ status: "direct" }));
  handle("app:add-breadcrumb", () => undefined);
  // 渲染层读 status.online；直接回布尔值会被当成离线，底部一直挂着"网络连接已断开"。
  handle("network:get-status", () => ({ online: net.isOnline() }));

  // 菜单
  handle("menu:trigger", (e, actionId) => deps.triggerMenu(str(actionId, "actionId"), e.sender));

  // shell
  handle("shell:open-external", (_e, url) => {
    const u = str(url, "url");
    if (!/^(https?|mailto):/i.test(u)) throw new Error(`refusing to open ${u}`);
    return shell.openExternal(u);
  });
  handle("shell:open-external-with-fallback", (_e, url) => shell.openExternal(str(url, "url")));
  handle("shell:open-in-app", (_e, url) => shell.openExternal(str(url, "url")));
  handle("shell:open-path", (_e, p) => shell.openPath(absPath(p)));
  handle("shell:show-item-in-folder", (_e, p) => shell.showItemInFolder(absPath(p)));
  handle("shell:trash-item", (_e, p) => shell.trashItem(absPath(p)));
  handle("shell:inspect-file-reference", async (_e, req) => {
    const p = (req as { path?: unknown } | undefined)?.path;
    try {
      const s = await stat(absPath(p));
      return { exists: true, isDirectory: s.isDirectory(), size: s.size };
    } catch {
      return { exists: false };
    }
  });
  handle("shell:reveal-file-reference", (_e, req) => {
    shell.showItemInFolder(absPath((req as { path?: unknown } | undefined)?.path));
    return { success: true };
  });

  // 剪贴板
  handle("clipboard:read-text", () => clipboard.readText());
  handle("clipboard:write-text", (_e, t) => clipboard.writeText(String(t ?? "")));
  handle("clipboard:write-image", (_e, p) => clipboard.writeImage(nativeImage.createFromPath(absPath(p))));
  handle("clipboard:write-image-data", (_e, data) => {
    const img = typeof data === "string" ? nativeImage.createFromDataURL(data) : nativeImage.createFromBuffer(Buffer.from(data as Uint8Array));
    clipboard.writeImage(img);
  });
  handle("clipboard:write-file", (_e, p) => {
    const file = absPath(p);
    if (process.platform === "darwin") clipboard.writeBuffer("NSFilenamesPboardType", Buffer.from(`<?xml version="1.0"?><plist version="1.0"><array><string>${file}</string></array></plist>`));
    else clipboard.writeText(file);
  });

  // 文件
  handle("fs:exists", async (_e, p) => {
    try {
      await stat(absPath(p));
      return true;
    } catch {
      return false;
    }
  });
  handle("fs:read-dir", async (_e, p) => {
    const entries = await readdir(absPath(p), { withFileTypes: true });
    return entries.map((d) => ({ name: d.name, isDirectory: d.isDirectory(), isFile: d.isFile() }));
  });
  handle("fs:read-text-file", (_e, p) => readFile(absPath(p), "utf8"));
  handle("fs:write-text-file", (_e, p, content) => writeFile(absPath(p), String(content ?? "")));
  handle("fs:write-binary-file", (_e, p, data) => writeFile(absPath(p), Buffer.from(data as Uint8Array)));
  handle("fs:mkdir", (_e, p) => mkdir(absPath(p), { recursive: true }).then(() => undefined));
  handle("fs:rename", (_e, a, b) => rename(absPath(a), absPath(b)));
  handle("fs:delete", (_e, p) => rm(absPath(p), { recursive: true, force: true }));
  handle("fs:stat", async (_e, p) => {
    const s = await stat(absPath(p));
    return { size: s.size, isDirectory: s.isDirectory(), isFile: s.isFile(), mtimeMs: s.mtimeMs, ctimeMs: s.ctimeMs };
  });
  handle("fs:copy", async (_e, a, b, overwrite) => {
    const src = absPath(a);
    const dst = absPath(b);
    if ((await stat(src)).isDirectory()) await cp(src, dst, { recursive: true, force: Boolean(overwrite), errorOnExist: !overwrite });
    else await copyFile(src, dst, overwrite ? 0 : 1);
  });
  handle("fs:watch", () => undefined);
  handle("fs:unwatch", () => undefined);
  handle("dialog:open", (e, opts) => {
    const w = windowOf(e);
    const o = (opts ?? {}) as Electron.OpenDialogOptions;
    return w ? dialog.showOpenDialog(w, o) : dialog.showOpenDialog(o);
  });
  handle("dialog:save", (e, opts) => {
    const w = windowOf(e);
    const o = (opts ?? {}) as Electron.SaveDialogOptions;
    return w ? dialog.showSaveDialog(w, o) : dialog.showSaveDialog(o);
  });

  // 通知
  let notificationSeq = 0;
  handle("notification:show", (e, payload) => {
    const p = (payload ?? {}) as { title?: string; body?: string; silent?: boolean };
    // 有窗口在前台时不弹：用户正看着界面，系统通知只会重复打扰
    if (BrowserWindow.getAllWindows().some((w) => w.isFocused())) return { success: true, id: null, suppressed: true };
    if (!Notification.isSupported()) return { success: false, id: null, error: "unsupported" };
    const id = `n${++notificationSeq}`;
    const n = new Notification({ title: String(p.title ?? ""), body: String(p.body ?? ""), silent: Boolean(p.silent) });
    const sender = e.sender;
    n.on("click", () => !sender.isDestroyed() && sender.send("notification:click", id));
    n.on("close", () => !sender.isDestroyed() && sender.send("notification:close", id));
    n.show();
    return { success: true, id };
  });

  // 日志
  handle("log:write", (_e, level, message, category) => deps.log(String(level), `${category ? `[${String(category)}] ` : ""}${String(message)}`));
  handle("log:export", () => ({ success: false, error: "unsupported" }));
  handle("log:upload", () => ({ success: false, error: "unsupported" }));
  handle("memory:get-stats", () => ({ ...process.memoryUsage() }));
  for (const ch of ["perf:capture-cpu", "perf:capture-heap", "perf:capture-trace", "perf:capture-netlog"]) {
    handle(ch, () => ({ success: false, error: "unsupported" }));
  }

  // 不在范围内：固定返回值
  handle("opencode:restart", async () => {
    try {
      await deps.restartOpencode();
    } catch {
      // 与渲染层约定：重启失败不抛
    }
  });
  handle("updater:check", () => ({ accepted: false }));
  handle("updater:get-version", () => app.getVersion());
  handle("screenshot:start", () => ({ success: false, error: "unsupported" }));
  handle("auth:fetch-user-info", () => ({ user: null, error: null }));
  handle("auth:renew-token", () => ({ success: false }));
  handle("auth:login", () => ({ success: false, error: "unsupported" }));
  handle("auth:logout", () => ({ success: true }));
  handle("auth:changed-to-main", () => undefined);
  handle("auth:expired-to-main", () => undefined);
  ipcMain.on("hot-update:get-version-sync", (e) => {
    e.returnValue = app.getVersion();
  });
}

/** 把全屏变化推给窗口里的渲染层。 */
export function wireFullscreenEvents(win: BrowserWindow): void {
  const push = (v: boolean) => !win.webContents.isDestroyed() && win.webContents.send(IPC.fullscreenChanged, v);
  win.on("enter-full-screen", () => push(true));
  win.on("leave-full-screen", () => push(false));
}
