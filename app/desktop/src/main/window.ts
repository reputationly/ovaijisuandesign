import { join } from "node:path";

import { app, BrowserWindow } from "electron";

/**
 * 主窗口。
 *
 * - 1280×800，最小 800×600，`show: false` 等页面画好再显示（否则先看到一块空白）
 * - macOS `hiddenInset` + 红绿灯位置；Windows 隐藏标题栏但保留 `titleBarOverlay`
 *   （这样系统的缩放边框、Aero Snap、Win11 的 Snap Layout 菜单都还在）
 * - `contextIsolation: true`、`nodeIntegration: false`、`sandbox: false`
 *   （preload 是 ESM，sandbox 下不能用 ESM preload）
 */
export function createMainWindow(gatewayUrl: string): BrowserWindow {
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
      // preload 从 argv 读这些，拼成 window.__HILO_CONFIG__。
      additionalArguments: [`--gateway-url=${gatewayUrl}`, `--app-version=${app.getVersion()}`],
    },
  });
  win.once("ready-to-show", () => win.show());
  const dev = process.env.ELECTRON_RENDERER_URL;
  if (dev) void win.loadURL(dev);
  else void win.loadURL("app://./");
  return win;
}
