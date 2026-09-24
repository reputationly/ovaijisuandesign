import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";

import { app, BrowserWindow } from "electron";

import { dataDirs, resourceRoots } from "./paths.js";
import { readPlatform } from "./platform-config.js";
import { handleAppScheme, registerAppScheme } from "./protocol.js";
import { createMainWindow } from "./window.js";
import { WorkspaceBundle } from "./workspace-bundle.js";

app.setName("蒜狸小助手");
registerAppScheme();

let bundle: WorkspaceBundle | undefined;

/**
 * 当前打开的工作区。M5 换成项目模型（项目列表、每个项目一套进程）；在那之前
 * 用 `OV_WORKSPACE_DIR`，没给就用数据根下的一个固定目录。
 */
function currentWorkspace(hubRoot: string): string {
  const dir = process.env.OV_WORKSPACE_DIR ?? path.join(hubRoot, "workspaces", "default");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

async function boot() {
  const dirs = dataDirs();
  bundle = new WorkspaceBundle({
    roots: resourceRoots(),
    version: app.getVersion(),
    workspaceDir: currentWorkspace(dirs.hubRoot),
    platform: readPlatform(dirs.configPath),
    hubRoot: dirs.hubRoot,
    runtimeDir: dirs.runtimeDir,
    configPath: dirs.configPath,
    nodeExec: process.execPath,
  });
  const gw = await bundle.start();
  createMainWindow(gw.url);
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    const w = BrowserWindow.getAllWindows()[0];
    if (w) {
      if (w.isMinimized()) w.restore();
      w.show();
      w.focus();
    }
  });

  void app.whenReady().then(async () => {
    handleAppScheme();
    try {
      await boot();
    } catch (err) {
      console.error("启动失败", err);
      app.exit(1);
      return;
    }
    // 点 Dock 图标：只在没有可见窗口时才唤起，有可见窗口时什么都不做（macOS 原生行为）。
    app.on("activate", () => {
      if (!BrowserWindow.getAllWindows().some((w) => w.isVisible())) {
        const w = BrowserWindow.getAllWindows()[0];
        if (w) w.show();
        else if (bundle?.gateway.running) createMainWindow(bundle.gateway.running.url);
      }
    });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });

  // gateway 和 opencode 都在独立进程组里，**不会**跟着我们退出。退出前必须停掉，
  // 否则每次关应用都留下一串孤儿进程占着端口。
  let quitting = false;
  app.on("before-quit", (e) => {
    if (quitting || !bundle) return;
    e.preventDefault();
    quitting = true;
    void bundle.stop().finally(() => app.exit(0));
  });
  // 兜底：exit() 时 before-quit 不会触发。
  process.on("exit", () => bundle?.stopSync());
  // 被信号终止（kill、Ctrl-C、终端关掉）时 Node 默认直接退出，连 exit 事件都没有 ——
  // gateway 和 opencode 在独立进程组里，会一直留着占端口。先同步停掉再退。
  for (const sig of ["SIGTERM", "SIGINT", "SIGHUP"] as const) {
    process.on(sig, () => {
      bundle?.stopSync();
      app.exit(0);
    });
  }
}
