/**
 * 走 `ipcMain.handle` 的原始通道（preload 的平台封装在用）。
 *
 * 首页和工作区页一上来就会碰的那些先做实：窗口、应用信息、网络、shell、剪贴板、
 * 文件、对话框、日志。登录、自动更新、内置浏览器等不在范围内的给固定返回值。
 */
import { execFile } from "node:child_process";
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

import { createFileReferenceRevealer, type FileReferenceHost, inspectFileReference, pathKindOnDisk } from "./file-reference.js";
import { IPC } from "./ipc/channels.js";
import type { GlobalStore, RecentWorkspace } from "./storage/global-store.js";

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
  /** 主日志文件（诊断面板显示的是文件路径）。 */
  logFile: string;
  /** 全局存储：本地文件引用要读允许目录、写"信任的目录"。 */
  store: GlobalStore;
  /** 数据根目录，本地文件引用默认放行。 */
  hubRoot: string;
  /** 菜单动作（新建工作区、关标签…）。 */
  triggerMenu: (actionId: string, sender: Electron.WebContents) => void | Promise<void>;
  /** opencode 需要按新配置重启（技能开关变更后渲染层会调）。 */
  restartOpencode: () => Promise<void>;
  /**
   * 自动更新服务。和 `registerChannel("updater", …)` 那个是**同一个实例**。
   *
   * 以前这里是 `handle("updater:check", () => ({ accepted: false }))` —— 一个
   * 硬编码的桩，写它的时候还没有自动更新（preload 注释原话：「没有自动更新，
   * 给占位实现」）。现在真服务有了，桩就成陷阱了：名字一模一样，静默返回
   * `accepted:false`，谁都不会知道它根本没接上。
   */
  updater: { check: (opts?: { userTriggered?: boolean }) => Promise<unknown> };
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
    // 全屏时"最大化"按钮的意思是退出全屏
    if (w.isFullScreen()) w.setFullScreen(false);
    else if (w.isMaximized()) w.unmaximize();
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
  handle("app:get-log-path", () => deps.logFile);
  handle("app:open-log-dir", async () => {
    const err = await shell.openPath(deps.logDir);
    return err ? { success: false, error: err } : { success: true };
  });
  // 诊断面板按 version / env / release.* 拼摘要
  handle("app:get-runtime-info", () => ({
    appId: "ovaijisuandesign",
    appName: app.getName(),
    version: app.getVersion(),
    env: app.isPackaged ? "production" : "development",
    release: { channel: "prod", region: "domestic" },
    logDir: deps.logDir,
    logFilePath: deps.logFile,
  }));
  // userId 没有就给 null（渲染层用 ?? 兜底成 unknown，空串会原样显示），时间是 ISO 字符串
  handle("app:get-diagnostics-context", () => ({
    userId: null,
    appVersion: app.getVersion(),
    releaseChannel: "prod",
    releaseRegion: "domestic",
    timestamp: new Date().toISOString(),
  }));
  // 只做代理解析，不做连通性探测：解析出代理就如实报，但不提示用户（shouldWarn 只在代理连不通时才该为真）
  handle("app:get-proxy-status", async (e) => {
    let raw: string;
    try {
      raw = (await e.sender.session.resolveProxy("https://www.baidu.com")) || "DIRECT";
    } catch {
      return { hasProxy: false, shouldWarn: false, raw: "DIRECT", error: "detection_failed" };
    }
    const hasProxy = raw.split(";").some((part) => part.trim() !== "" && part.trim().toUpperCase() !== "DIRECT");
    return { hasProxy, shouldWarn: false, raw };
  });
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
  const fileRefHost = fileReferenceHost(deps);
  const revealFileReference = createFileReferenceRevealer(fileRefHost);
  handle("shell:inspect-file-reference", (_e, req) => inspectFileReference(fileRefHost, req as Parameters<typeof inspectFileReference>[1]));
  handle("shell:reveal-file-reference", (_e, req) => revealFileReference(req as Parameters<typeof revealFileReference>[0]));

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
    return entries.map((d) => ({ name: d.name, isDirectory: d.isDirectory(), isFile: d.isFile(), isSymbolicLink: d.isSymbolicLink() }));
  });
  handle("fs:read-text-file", async (_e, p) => {
    const file = absPath(p);
    const { size } = await stat(file);
    // 大文件整份读进内存会拖垮主进程
    if (size > MAX_TEXT_READ_BYTES) throw new Error(`File too large to read into memory: ${(size / 1048576).toFixed(1)} MB (limit: 50MB)`);
    return readFile(file, "utf8");
  });
  handle("fs:write-text-file", (_e, p, content) => writeFile(absPath(p), String(content ?? "")));
  handle("fs:write-binary-file", (_e, p, data) => writeFile(absPath(p), Buffer.from(data as Uint8Array)));
  handle("fs:mkdir", (_e, p) => mkdir(absPath(p), { recursive: true }).then(() => undefined));
  handle("fs:rename", (_e, a, b) => rename(absPath(a), absPath(b)));
  handle("fs:delete", (_e, p) => rm(absPath(p), { recursive: true, force: true }));
  handle("fs:stat", async (_e, p) => {
    const s = await stat(absPath(p));
    return { isDirectory: s.isDirectory(), isFile: s.isFile(), size: s.size, mtimeMs: s.mtimeMs, birthtimeMs: s.birthtimeMs };
  });
  handle("fs:copy", async (_e, a, b, overwrite) => {
    const src = absPath(a);
    const dst = absPath(b);
    if ((await stat(src)).isDirectory()) await cp(src, dst, { recursive: true, force: Boolean(overwrite), errorOnExist: !overwrite });
    else await copyFile(src, dst, overwrite ? 0 : 1);
  });
  handle("fs:watch", () => undefined);
  handle("fs:unwatch", () => undefined);
  // 渲染层给的是 { directory, multiple, title, filters }，要的是选中路径数组（取消 = 空数组）
  handle("dialog:open", async (e, opts) => {
    const w = windowOf(e);
    const o = (opts ?? {}) as { directory?: boolean; multiple?: boolean; title?: string; filters?: Electron.FileFilter[]; defaultPath?: string };
    const properties: Electron.OpenDialogOptions["properties"] = o.directory ? ["openDirectory", "createDirectory"] : ["openFile"];
    if (o.multiple) properties.push("multiSelections");
    const options: Electron.OpenDialogOptions = { title: o.title, defaultPath: o.defaultPath, filters: o.filters, properties };
    const r = w ? await dialog.showOpenDialog(w, options) : await dialog.showOpenDialog(options);
    return r.canceled ? [] : r.filePaths;
  });
  // 要的是选中的路径，取消给 undefined（渲染层 `if (!path) return`）
  handle("dialog:save", async (e, opts) => {
    const w = windowOf(e);
    const o = (opts ?? {}) as { title?: string; defaultPath?: string; filters?: Electron.FileFilter[] };
    const options: Electron.SaveDialogOptions = { title: o.title, defaultPath: o.defaultPath, filters: o.filters };
    const r = w ? await dialog.showSaveDialog(w, options) : await dialog.showSaveDialog(options);
    return r.canceled ? undefined : r.filePath;
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
    n.on("click", () => {
      // 点通知要把窗口叫回前台，再让渲染层跳到对应位置
      const w = (sender.isDestroyed() ? null : BrowserWindow.fromWebContents(sender)) ?? BrowserWindow.getAllWindows()[0];
      if (w && !w.isDestroyed()) {
        if (w.isMinimized()) w.restore();
        w.show();
        w.focus();
      }
      if (!sender.isDestroyed()) sender.send("notification:click", id);
    });
    n.on("close", () => !sender.isDestroyed() && sender.send("notification:close", id));
    n.show();
    return { success: true, id };
  });

  // 日志
  handle("log:write", (_e, level, message, category) => deps.log(String(level), `${category ? `[${String(category)}] ` : ""}${String(message)}`));
  handle("log:export", (e) => exportLogs(windowOf(e), deps.logDir));
  // 没有日志上传服务
  handle("log:upload", () => ({ success: false, error: "日志上传不可用，请用「导出日志」", retriable: false }));
  handle("memory:get-stats", () => memoryStats());
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
  // 直通真服务。**不要**再写回 `{ accepted: false }` 那种桩 ——
  // 它和下面 `registerChannel("updater")` 是同一个服务的两条入口，
  // 返回值直接透传（`{status, version?, error?}`），渲染层自己看。
  handle("updater:check", (_e, options?: unknown) => deps.updater.check((options ?? {}) as { userTriggered?: boolean }));
  handle("updater:get-version", () => app.getVersion());
  // 没有热更新：没装热更新包（版本 null），检查一律报禁用
  handle("hot-update:check", () => ({ success: false, error: "Hot update disabled", currentVersion: null }));
  handle("hot-update:clear-cache", () => false);
  handle("hot-update:reload", (e) => {
    e.sender.reloadIgnoringCache();
    return { success: true };
  });
  handle("hot-update:get-version", () => null);
  handle("screenshot:start", () => ({ success: false, error: "unsupported" }));
  handle("auth:fetch-user-info", () => ({ user: null, error: null }));
  handle("auth:renew-token", () => ({ success: false }));
  handle("auth:login", () => ({ success: false, error: "unsupported" }));
  handle("auth:logout", () => ({ success: true }));
  handle("auth:changed-to-main", () => ({ success: true }));
  handle("auth:expired-to-main", () => ({ success: true }));
  ipcMain.on("hot-update:get-version-sync", (e) => {
    e.returnValue = "";
  });
}

const MAX_TEXT_READ_BYTES = 50 * 1024 * 1024;

function fileReferenceHost(deps: RawIpcDeps): FileReferenceHost {
  const safePath = (name: Parameters<typeof app.getPath>[0]) => {
    try {
      return app.getPath(name);
    } catch {
      return "";
    }
  };
  const trustedDirs = () => {
    const dirs = deps.store.get("config").localFileRevealAllowedDirs;
    return Array.isArray(dirs) ? dirs.filter((d): d is string => typeof d === "string") : [];
  };
  return {
    // 用户目录、数据目录、当前 / 最近打开的项目：这些地方的文件直接可点
    getStaticAllowedDirs: () => {
      const config = deps.store.get("config");
      const recents = deps.store.get("recentWorkspaces") as RecentWorkspace[];
      return [
        ...(["userData", "temp", "downloads", "documents", "desktop", "pictures", "music", "videos"] as const).map(safePath),
        deps.hubRoot,
        String(deps.store.get("currentWorkspace") ?? ""),
        String(config.workingDirectory ?? ""),
        String(config.dataDirectory ?? ""),
        ...recents.map((r) => r.path),
      ].filter(Boolean);
    },
    getTrustedDirs: trustedDirs,
    trustDirectory: (dir) => {
      const current = trustedDirs();
      if (!current.includes(dir)) deps.store.set("config", { localFileRevealAllowedDirs: [...current, dir] });
    },
    getPathKind: pathKindOnDisk,
    openPath: (p) => shell.openPath(p),
    showItemInFolder: (p) => shell.showItemInFolder(p),
  };
}

const toMB = (bytes: number) => Math.round((bytes / 1048576) * 100) / 100;

function memoryStats(): Record<string, unknown> {
  const mem = process.memoryUsage();
  const metrics = app.getAppMetrics();
  const renderers = BrowserWindow.getAllWindows()
    .filter((w) => !w.isDestroyed())
    .map((w) => {
      const pid = w.webContents.getOSProcessId();
      const m = metrics.find((x) => x.pid === pid);
      // getAppMetrics 的 workingSetSize 单位是 KB
      return { pid, title: w.getTitle(), workingSetSizeMB: m ? toMB(m.memory.workingSetSize * 1024) : 0 };
    });
  return {
    timestamp: Date.now(),
    main: { heapUsedMB: toMB(mem.heapUsed), heapTotalMB: toMB(mem.heapTotal), rssMB: toMB(mem.rss), externalMB: toMB(mem.external) },
    renderers,
    freeMemMB: toMB(os.freemem()),
    availableMemMB: toMB(os.freemem()),
    memorySource: "os.freemem",
  };
}

/** 选个位置，把日志目录打成 zip。系统自带的 bsdtar（macOS / Windows 10+）能写 zip，Linux 用 zip。 */
export async function exportLogs(win: BrowserWindow | null, logDir: string): Promise<Record<string, unknown>> {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const options: Electron.SaveDialogOptions = {
    title: "导出日志",
    defaultPath: `logs-${stamp}.zip`,
    filters: [{ name: "ZIP Archive", extensions: ["zip"] }],
  };
  const r = win ? await dialog.showSaveDialog(win, options) : await dialog.showSaveDialog(options);
  if (r.canceled || !r.filePath) return { success: false, cancelled: true };
  const filePath = r.filePath;
  try {
    const files = (await readdir(logDir, { withFileTypes: true })).filter((d) => d.isFile()).map((d) => d.name);
    if (files.length === 0) return { success: false, error: "没有可导出的日志", filePath };
    await rm(filePath, { force: true });
    const [cmd, args]: [string, string[]] =
      process.platform === "linux"
        ? ["zip", ["-q", "-j", filePath, ...files.map((f) => path.join(logDir, f))]]
        : ["tar", ["-a", "-c", "-f", filePath, "-C", logDir, ...files]];
    await new Promise<void>((resolve, reject) => execFile(cmd, args, (err) => (err ? reject(err) : resolve())));
    shell.showItemInFolder(filePath);
    return { success: true, fileCount: files.length, diagnosticsSummary: null, filePath };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err), filePath };
  }
}

/** 系统联网状态变化推给所有窗口（载荷是布尔值）。主进程没有联网事件，隔几秒看一次，变了才推。 */
export function wireNetworkStatusEvents(): void {
  let last = net.isOnline();
  setInterval(() => {
    const now = net.isOnline();
    if (now === last) return;
    last = now;
    for (const w of BrowserWindow.getAllWindows()) if (!w.webContents.isDestroyed()) w.webContents.send("network:status-changed", now);
  }, 5000).unref();
}

/** 把全屏变化推给窗口里的渲染层。 */
export function wireFullscreenEvents(win: BrowserWindow): void {
  const push = (v: boolean) => !win.webContents.isDestroyed() && win.webContents.send(IPC.fullscreenChanged, v);
  win.on("enter-full-screen", () => push(true));
  win.on("leave-full-screen", () => push(false));
}
