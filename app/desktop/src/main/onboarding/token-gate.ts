import { BrowserWindow, ipcMain, type WebContents } from "electron";

import { GATE_CHANNELS } from "./gate-channels.js";
import { gatePageHtml } from "./gate-page.js";
import { saveToken, usedModelRows } from "./token-core.js";

/**
 * 令牌闸门：没有平台令牌就拦在启动之前。
 *
 * 只开一个令牌页，主窗口**不创建**，直到令牌保存成功。页面上没有「跳过」：
 * 关掉窗口或点「退出」都返回 false，调用方据此退出应用。
 * 只接受这个窗口发来的 IPC，别的窗口（将来要是有）调不到。
 */

export interface TokenGateOptions {
  configPath: string;
  /** gate preload 的产物路径（`out/preload/gate.mjs`）。 */
  preloadPath: string;
  log: (line: string) => void;
}

let open: BrowserWindow | undefined;

/** 令牌页还开着的话把它拉到前面（第二个实例启动时用）。返回是否真的有窗口。 */
export function focusTokenGate(): boolean {
  if (!open || open.isDestroyed()) return false;
  if (open.isMinimized()) open.restore();
  open.show();
  open.focus();
  return true;
}

/** 返回 true = 已保存、可以继续启动；false = 用户关掉了 / 点了退出，应用应当退出。 */
export function requireTokenGate(opts: TokenGateOptions): Promise<boolean> {
  return new Promise((resolve) => {
    let saved = false;
    const win = new BrowserWindow({
      width: 540,
      height: 720,
      resizable: false,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      autoHideMenuBar: true,
      show: false,
      title: "蒜狸小助手",
      backgroundColor: "#fafafa",
      webPreferences: {
        preload: opts.preloadPath,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
      },
    });
    open = win;

    const fromGate = (sender: WebContents) => sender.id === win.webContents.id;

    ipcMain.handle(GATE_CHANNELS.info, (event) => {
      if (!fromGate(event.sender)) throw new Error("forbidden");
      return { rows: usedModelRows(opts.configPath) };
    });
    ipcMain.handle(GATE_CHANNELS.save, (event, token: unknown) => {
      if (!fromGate(event.sender)) throw new Error("forbidden");
      const r = saveToken(opts.configPath, token, (err) => opts.log(`[token-gate] 保存令牌失败：${String(err)}`));
      if (r.ok) {
        saved = true;
        opts.log("[token-gate] 令牌已保存");
        // 等这次回复发出去再关，否则渲染层可能收不到结果。
        setImmediate(() => {
          if (!win.isDestroyed()) win.close();
        });
      }
      return r;
    });
    ipcMain.on(GATE_CHANNELS.quit, (event) => {
      if (fromGate(event.sender) && !win.isDestroyed()) win.close();
    });

    win.once("ready-to-show", () => win.show());
    win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    win.webContents.on("will-navigate", (event) => event.preventDefault());
    win.once("closed", () => {
      ipcMain.removeHandler(GATE_CHANNELS.info);
      ipcMain.removeHandler(GATE_CHANNELS.save);
      ipcMain.removeAllListeners(GATE_CHANNELS.quit);
      if (open === win) open = undefined;
      resolve(saved);
    });

    void win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(gatePageHtml())}`);
  });
}
