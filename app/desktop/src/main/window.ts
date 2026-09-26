import { join } from "node:path";

import { app, BrowserWindow, shell } from "electron";

export interface WindowArgs {
  /** 应用级 gateway 的地址（进程可能还没起来，就绪与否走 gateway-readiness）。 */
  gatewayUrl: string;
}

/** preload 从 argv 读这些，拼成 window.__HILO_CONFIG__。 */
function additionalArguments(a: WindowArgs): string[] {
  const args = [
    `--gateway-url=${a.gatewayUrl}`,
    `--app-version=${app.getVersion()}`,
    `--runtime-env=${app.isPackaged ? "production" : "development"}`,
    "--release-channel=prod",
    "--release-region=domestic",
  ];
  if (app.runningUnderARM64Translation) args.push("--running-under-arm64-translation=true");
  return args;
}

/** 开发用：窗口不显示（界面逐屏对比时在后台跑，不抢焦点、不被人误操作）。页面照常渲染，截图走调试协议。 */
export function devHiddenWindow(): boolean {
  return !app.isPackaged && process.env.OV_DEV_HIDDEN_WINDOW === "1";
}

/**
 * 主窗口（唯一的窗口；工作区是渲染层里的标签）。
 *
 * - 1280×800，最小 800×600，`show: false` 等页面画好再显示（否则先看到一块空白）
 * - macOS `hiddenInset` + 红绿灯位置；Windows 隐藏标题栏但保留 `titleBarOverlay`
 *   （这样系统的缩放边框、Aero Snap、Win11 的 Snap Layout 菜单都还在）
 * - `contextIsolation: true`、`nodeIntegration: false`、`sandbox: false`
 *   （preload 是 ESM，sandbox 下不能用 ESM preload）
 */
export function createMainWindow(a: WindowArgs): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    backgroundColor: "#fafafa",
    title: "蒜狸小助手",
    ...(process.platform === "darwin"
      ? { titleBarStyle: "hiddenInset" as const, trafficLightPosition: { x: 12, y: 12 } }
      : {}),
    ...(process.platform === "win32"
      ? { titleBarStyle: "hidden" as const, titleBarOverlay: { color: "#00000000", symbolColor: "#333333" } }
      : {}),
    webPreferences: {
      preload: join(import.meta.dirname, "../preload/index.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      additionalArguments: additionalArguments(a),
    },
  });
  if (!devHiddenWindow()) win.once("ready-to-show", () => win.show());
  // 渲染层用 window.open 开一个透明小窗来放系统级浮层提示；我们没有这种窗口，拒掉后它会退回页面内的提示。
  // 网页链接交给系统浏览器，其余一律不开新窗口。
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) void shell.openExternal(url);
    return { action: "deny" };
  });
  // 开发服务器只供我们自己的界面（OV_UI=ours）用；默认界面是构建好的静态文件，走 app://。
  const dev = process.env.OV_UI === "ours" ? process.env.ELECTRON_RENDERER_URL : undefined;
  if (dev) void win.loadURL(dev);
  else void win.loadURL("app://./");
  return win;
}
