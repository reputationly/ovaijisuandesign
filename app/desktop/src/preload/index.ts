/**
 * 渲染层能看到的全部主进程能力。
 *
 * - `__HILO_CONFIG__`：主进程经 argv（additionalArguments）传入的运行配置；
 *   `gatewayUrl` 是**应用级** gateway，工作区的 gateway 地址走 `hilo.getWorkspaceRuntime`。
 * - `__HILO_PLATFORM__`：文件、窗口、剪贴板、shell、存储等平台封装。
 * - `hilo`：白名单内的原始 IPC（总线就跑在上面）+ 若干便捷封装。
 * - `__HILO_AUTH__`：没有账号体系，始终是固定的本机用户；`__HILO_UPDATER_BOOTSTRAP__`：没有自动更新，给占位实现，
 *   免得渲染层等一个永远不来的结果。
 */
import os from "node:os";

import { clipboard, contextBridge, ipcRenderer, type IpcRendererEvent, shell, webUtils } from "electron";

import { ALLOWED_IPC_CHANNELS } from "../main/ipc/channels.js";

type Listener = (event: IpcRendererEvent, ...args: unknown[]) => void;

function argValue(name: string): string | undefined {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit === undefined ? undefined : hit.slice(prefix.length);
}

function argFlag(name: string): boolean {
  const v = argValue(name);
  return v === "true" || v === "1" || process.argv.includes(`--${name}`);
}

function argJson(name: string): unknown {
  const raw = argValue(name);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function toWsUrl(httpUrl: string): string {
  if (!httpUrl) return "";
  try {
    const u = new URL(httpUrl);
    u.protocol = u.protocol === "https:" ? "wss:" : "ws:";
    u.pathname = "/ws";
    return u.toString();
  } catch {
    return "";
  }
}

const gatewayUrl = argValue("gateway-url") ?? "";
const appVersion = argValue("app-version") ?? "0.0.0";
const intl = Intl.DateTimeFormat().resolvedOptions();

const runtimeConfig = {
  gatewayUrl,
  wsUrl: toWsUrl(gatewayUrl),
  env: argValue("runtime-env") ?? "production",
  channel: argValue("release-channel") ?? "prod",
  region: argValue("release-region") ?? "domestic",
  appVersion,
  domain: argValue("domain") ?? "",
  folderPath: argValue("folder-path"),
  rendererPid: process.pid,
  deviceId: argValue("device-id") ?? "",
  ipCountry: argValue("ip-country") ?? "",
  downloadSource: argValue("download-source") ?? "",
  runningUnderARM64Translation: argFlag("running-under-arm64-translation"),
  gpuAccelerationDisabled: argFlag("gpu-acceleration-disabled"),
  gpuAccelerationDisabledReason: argValue("gpu-acceleration-disabled-reason"),
  transparentWindowSupported: argFlag("transparent-window-supported"),
  transparentWindowActive: argFlag("transparent-window-active"),
  rumCanaryDisabled: true,
  canvasContentVisibilityOverride: process.env.HILO_CANVAS_CONTENT_VISIBILITY,
  canvasResumeRecoveryEnabled: process.env.HILO_CANVAS_RESUME_RECOVERY === "true",
  electronVersion: process.versions.electron,
  chromeVersion: process.versions.chrome,
  cpuCount: os.cpus().length,
  totalMemoryMb: Math.round(os.totalmem() / (1024 * 1024)),
  locale: intl.locale,
  timezone: intl.timeZone,
  updateBackend: "none",
  // 旧字段：保持兼容
  platform: process.platform,
};

function checkChannel(channel: string): void {
  if (!ALLOWED_IPC_CHANNELS.has(channel)) throw new Error(`IPC channel not allowed: ${channel}`);
}

/** 订阅一个主进程推送，返回取消函数。 */
function subscribe(channel: string, listener: Listener): () => void {
  checkChannel(channel);
  const wrapped: Listener = (event, ...args) => listener(event, ...args);
  ipcRenderer.on(channel, wrapped);
  return () => {
    ipcRenderer.removeListener(channel, wrapped);
  };
}

const invoke = (channel: string, ...args: unknown[]) => ipcRenderer.invoke(channel, ...args);

// 启动恢复的 `menu:new-workspace` 可能在渲染层挂监听之前就到了：只留最后一条，
// 第一个监听者挂上时补发。
const newWorkspaceListeners = new Set<Listener>();
let parkedNewWorkspace: { event: IpcRendererEvent; args: unknown[] } | undefined;
ipcRenderer.on("menu:new-workspace", (event, ...args) => {
  if (newWorkspaceListeners.size === 0) {
    parkedNewWorkspace = { event, args };
    return;
  }
  for (const l of newWorkspaceListeners) l(event, ...args);
});

const noop = () => undefined;
const unsubscribeNoop = () => noop;

function stubMethods(names: string[]): Record<string, (...args: unknown[]) => unknown> {
  const out: Record<string, (...args: unknown[]) => unknown> = {};
  for (const n of names) out[n] = /^on[A-Z]/.test(n) ? unsubscribeNoop : noop;
  return out;
}

const BROWSER_METHODS = [
  "getState", "createTab", "showTab", "hideTab", "destroyTab", "navigate", "back", "forward", "reload", "setBounds",
  "setZoom", "setDevicePreview", "setAnnotation", "screenshot", "captureFrame", "openExternal", "clearCookies",
  "clearCache", "importCookies", "importBookmarks", "setSurfaceOpen", "setNativeViewOcclusion", "openMenu", "closeMenu",
  "updateMenu", "showProjectPreview", "hideProjectPreview", "getDownloads", "downloadAction", "setDownloadSavePrompt",
  "openDownloadsFolder", "openDownloadsPanel", "closeDownloadsPanel", "updateDownloadsPanel", "deleteBookmark",
  "onStateChanged", "onMenuStateChanged", "onDownloadsPanelStateChanged", "onDownloadsChanged", "onDownloadTransfer",
  "onSurfaceRequested", "onProjectPreviewEvent", "onPluginEvent", "onBookmarkDelete",
];

const capabilities = new Set(["fs", "fs.dialogs", "window", "clipboard", "notification", "shell", "storage"]);

const platform = {
  capabilities: { has: (cap: string) => capabilities.has(cap), list: () => [...capabilities] },
  fs: {
    readTextFile: (p: string) => invoke("fs:read-text-file", p),
    writeTextFile: (p: string, content: string) => invoke("fs:write-text-file", p, content),
    writeBinaryFile: (p: string, data: Uint8Array) => invoke("fs:write-binary-file", p, data),
    exists: (p: string) => invoke("fs:exists", p),
    mkdir: (p: string) => invoke("fs:mkdir", p),
    rename: (from: string, to: string) => invoke("fs:rename", from, to),
    delete: (p: string) => invoke("fs:delete", p),
    stat: (p: string) => invoke("fs:stat", p),
    copy: (src: string, dst: string, overwrite = false) => invoke("fs:copy", src, dst, overwrite),
    readDir: (p: string) => invoke("fs:read-dir", p),
    showOpenDialog: (opts: unknown) => invoke("dialog:open", opts),
    showSaveDialog: (opts: unknown) => invoke("dialog:save", opts),
    watch: (dir: string) => invoke("fs:watch", dir),
    unwatch: (dir: string) => invoke("fs:unwatch", dir),
    onFsChange: (cb: (change: unknown) => void) => subscribe("fs:change", (_e, change) => cb(change)),
  },
  window: {
    minimize: () => invoke("window:minimize"),
    toggleMaximize: () => invoke("window:maximize"),
    close: () => invoke("window:close"),
    isMaximized: () => invoke("window:is-maximized"),
    isFullScreen: () => invoke("window:is-fullscreen"),
    onFullScreenChange: (cb: (fullScreen: boolean) => void) => subscribe("window:fullscreen-changed", (_e, v) => cb(Boolean(v))),
    setTitle: (title: string) => {
      document.title = title;
    },
    setWindowButtonVisibility: (visible: boolean) => invoke("window:set-button-visibility", visible),
    setNativeViewOcclusion: noop,
  },
  clipboard: {
    readText: () => clipboard.readText(),
    writeText: (text: string) => clipboard.writeText(text),
    writeImage: (filePath: string) => invoke("clipboard:write-image", filePath),
    writeImageData: (data: unknown) => invoke("clipboard:write-image-data", data),
    writeFile: (filePath: string) => invoke("clipboard:write-file", filePath),
  },
  notification: {
    show: (title: string, body?: string, opts?: { icon?: string; silent?: boolean }) =>
      invoke("notification:show", { title, body, icon: opts?.icon, silent: opts?.silent }),
  },
  shell: {
    openExternal: async (url: string) => {
      // 只放行浏览器该打开的协议；file:、javascript: 之类一律拒绝
      if (!/^(https?|mailto):/i.test(url)) throw new Error(`refusing to open ${url}`);
      await shell.openExternal(url);
    },
    openInApp: (url: string) => invoke("shell:open-in-app", url),
    openExternalWithFallback: (url: string) => invoke("shell:open-external-with-fallback", url),
    openPath: async (p: string) => {
      const err = (await invoke("shell:open-path", p)) as string;
      if (err) throw new Error(err);
    },
    showItemInFolder: (p: string) => invoke("shell:show-item-in-folder", p),
    inspectFileReference: (req: unknown) => invoke("shell:inspect-file-reference", req),
    revealFileReference: (req: unknown) => invoke("shell:reveal-file-reference", req),
    trashItem: (p: string) => invoke("shell:trash-item", p),
  },
  app: {
    version: appVersion,
    platform: "electron",
    os: process.platform,
    arch: process.arch,
    runningUnderARM64Translation: runtimeConfig.runningUnderARM64Translation,
  },
  storage: {
    workspaceLoad: (dir: string) => invoke("storage:workspace-get", dir),
    workspaceGet: (dir: string, key: string) => invoke("storage:workspace-get", dir, key),
    workspaceSet: (dir: string, key: string, value: unknown) => invoke("storage:workspace-set", dir, key, value),
    globalLoad: () => invoke("storage:global-get"),
    globalGet: (key: string) => invoke("storage:global-get", key),
    globalSet: (key: string, value: unknown) => invoke("storage:global-set", key, value),
    onGlobalConfigChanged: (cb: (patch: unknown) => void) => subscribe("storage:global-config-changed", (_e, patch) => cb(patch)),
  },
};

const hilo = {
  ipcRenderer: {
    send(channel: string, ...args: unknown[]) {
      checkChannel(channel);
      ipcRenderer.send(channel, ...args);
    },
    invoke(channel: string, ...args: unknown[]) {
      checkChannel(channel);
      return ipcRenderer.invoke(channel, ...args);
    },
    on(channel: string, listener: Listener) {
      checkChannel(channel);
      if (channel !== "menu:new-workspace") return subscribe(channel, listener);
      newWorkspaceListeners.add(listener);
      const parked = parkedNewWorkspace;
      parkedNewWorkspace = undefined;
      if (parked) listener(parked.event, ...parked.args);
      return () => {
        newWorkspaceListeners.delete(listener);
      };
    },
  },
  projectInvite: { onReceived: unsubscribeNoop },
  auth: {
    getTokens: () => invoke("storage:get-tokens"),
    setTokens: (tokens: unknown) => invoke("storage:set-tokens", tokens),
    clearTokens: () => invoke("storage:clear-tokens"),
    getUser: () => invoke("storage:get-user"),
    setUser: (user: unknown) => invoke("storage:set-user", user),
    clearUser: () => invoke("storage:clear-user"),
  },
  updater: {
    check: () => invoke("updater:check"),
    getVersion: () => invoke("updater:get-version"),
  },
  logger: {
    debug: (message: string, category?: string) => invoke("log:write", "debug", message, category),
    info: (message: string, category?: string) => invoke("log:write", "info", message, category),
    warn: (message: string, category?: string) => invoke("log:write", "warn", message, category),
    error: (message: string, category?: string) => invoke("log:write", "error", message, category),
  },
  diagnostics: {
    getRuntimeInfo: () => invoke("app:get-runtime-info"),
    getDiagnosticsContext: () => invoke("app:get-diagnostics-context"),
    getLogPath: () => invoke("app:get-log-path"),
    openLogDir: () => invoke("app:open-log-dir"),
    exportLogs: () => invoke("log:export"),
    uploadLogs: (reason: string, feedbackContext?: unknown) => invoke("log:upload", reason, feedbackContext),
    getMemoryStats: () => invoke("memory:get-stats"),
    getProxyStatus: () => invoke("app:get-proxy-status"),
    onProxyDetected: (cb: (p: unknown) => void) => subscribe("proxy:detected-toast", (_e, p) => cb(p)),
    onLowMemory: (cb: (p: unknown) => void) => subscribe("memory:low-toast", (_e, p) => cb(p)),
    onMemoryPressure: (cb: (p: unknown) => void) => subscribe("memory:pressure-relief", (_e, p) => cb(p)),
    onRuntimeMemoryReclaim: (cb: (p: unknown) => void) => subscribe("runtime:memory-reclaim", (_e, p) => cb(p)),
    addBreadcrumb: (category: string, message: string, data?: unknown) => invoke("app:add-breadcrumb", category, message, data),
  },
  screenshot: { start: () => Promise.resolve({ success: false, error: "unsupported" }) },
  // 内置浏览器不在范围内：方法都是空操作，订阅返回取消函数。contextBridge 只拷贝
  // 自有属性，所以要逐个列出来，不能用 Proxy。
  browser: {
    ...stubMethods(BROWSER_METHODS),
    browserProfileImport: stubMethods(["listProfiles", "listBookmarkProfiles", "importCookies", "importBookmarks", "cancel", "onRequested", "onBookmarksRequested", "onProgress"]),
  },
  perf: {
    captureCpuProfile: () => invoke("perf:capture-cpu"),
    captureHeapSnapshot: () => invoke("perf:capture-heap"),
    captureTrace: () => invoke("perf:capture-trace"),
    captureNetLog: () => invoke("perf:capture-netlog"),
  },
  hotUpdate: {
    check: () => Promise.resolve({ available: false }),
    clearCache: () => Promise.resolve(),
    reload: () => Promise.resolve(),
    getVersion: () => Promise.resolve(appVersion),
  },
  opencode: { restart: () => invoke("opencode:restart") },
  menu: { trigger: (actionId: string) => invoke("menu:trigger", actionId) },
  webUtils: { getPathForFile: (file: File) => webUtils.getPathForFile(file) },
  network: {
    getStatus: () => invoke("network:get-status"),
    onStatusChanged: (cb: (online: boolean) => void) => subscribe("network:status-changed", (_e, online) => cb(Boolean(online))),
  },
  skills: {
    onPermissionsChanged: (cb: () => void) => subscribe("skill:permissions-changed-to-renderer", () => cb()),
  },
};

const unsupported = () => Promise.reject(new Error("login is not available in this build"));
// 没有账号体系：界面始终处于"已登录"，身份是固定的本机用户。
// accessToken 要是 JWT 的形状：界面会解析 payload.exp 判断是否该续期，这里给到 2100 年。
const LOCAL_ACCESS_TOKEN = `local.${btoa(JSON.stringify({ sub: "local", exp: 4102444800 }))}.local`;
const LOCAL_USER = { userID: "local", avatar: "", username: "用户" };
const LOCAL_TOKENS = { accessToken: LOCAL_ACCESS_TOKEN, idToken: LOCAL_ACCESS_TOKEN, adAttribution: null };
const auth = {
  login: () => Promise.resolve({ success: true }),
  logout: () => Promise.resolve({ success: true }),
  onAuthCallback: unsubscribeNoop,
  fetchUserInfo: () => Promise.resolve({ user: LOCAL_USER, error: null }),
  getStoredAuth: () => Promise.resolve({ tokens: LOCAL_TOKENS, user: LOCAL_USER }),
  storeAuth: () => Promise.resolve(),
  clearAuth: () => Promise.resolve(),
  renewToken: () => Promise.resolve({ token: LOCAL_ACCESS_TOKEN, error: null }),
  notifyAuthChanged: noop,
  notifyAuthExpired: noop,
  onAuthChanged: unsubscribeNoop,
  onAuthExpired: unsubscribeNoop,
};

contextBridge.exposeInMainWorld("__HILO_CONFIG__", runtimeConfig);
contextBridge.exposeInMainWorld("__HILO_PLATFORM__", platform);
contextBridge.exposeInMainWorld("__HILO_UPDATER_BOOTSTRAP__", argJson("updater-bootstrap"));
contextBridge.exposeInMainWorld("hilo", hilo);
contextBridge.exposeInMainWorld("__HILO_AUTH__", auth);
