/**
 * 主进程入口。
 *
 * 启动顺序：存储 → 总线与各频道 → 项目（重放事务日志）→ 首次迁移 → 占好应用级 gateway
 * 的端口 → **立即**开窗口（不等任何 gateway）→ 应用级 gateway 后台启动 → 恢复上次的标签。
 * 工作区的 gateway + opencode 由 HiloApp 按需起，最多同时 5 套。
 */
import { createWriteStream, mkdirSync, type WriteStream } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

import { app, BrowserWindow, dialog, ipcMain, Notification, shell } from "electron";

import { AppGateway, GatewayReadinessService, readinessView } from "./app-gateway.js";
import { GatewayManager } from "./gateway/gateway-manager.js";
import { APP_LEVEL_GATEWAY_KEY, GatewayRegistry } from "./gateway/gateway-registry.js";
import { IPC } from "./ipc/channels.js";
import { createMainIpcServer } from "./ipc/electron-server.js";
import { DisposableStore } from "./ipc/events.js";
import { fromService } from "./ipc/proxy.js";
import { UpdaterService, createElectronAutoUpdater, shouldAutoUpdate, currentUpdateTarget } from "./updater.js";
import type { ProjectRecord, WorkspaceOpenResult } from "./ipc/types.js";
import { installAppMenu, triggerMenuAction } from "./menu.js";
import { migrateLegacyWorkspace } from "./migration/legacy.js";
import { OpenCodeRuntime, prepareLaunch } from "./opencode/index.js";
import { dataDirs, nodeExecutable, resourceRoots } from "./paths.js";
import { readPlatform } from "./platform-config.js";
import { ProjectArchiveService } from "./project/project-archive-service.js";
import { ProjectAssetsService } from "./project/project-assets.js";
import { ProjectService } from "./project/project-service.js";
import { handleAppScheme, registerAppScheme } from "./protocol.js";
import { readSettings, writeSettings } from "./settings.js";
import { exportLogs, registerRawIpc, wireFullscreenEvents, wireNetworkStatusEvents } from "./raw-ipc.js";
import { RestoreHealth, runStartupRestore } from "./restore.js";
import { GlobalStore, type RecentWorkspace } from "./storage/global-store.js";
import { recordRecentOpen } from "./storage/recents.js";
import { registerStorageIpc } from "./storage/storage-ipc.js";
import { WorkspaceStorageRegistry } from "./storage/workspace-store.js";
import { createSkillExportService } from "./skills/export.js";
import { locateBundledSkills, seedBundledSkills } from "./skills/seed.js";
import { stubChannels } from "./stub-channels.js";
import { createMainWindow, devHiddenWindow } from "./window.js";
import { BundleHandle, createSerialGate } from "./workspace/bundle-handle.js";
import { HiloApp } from "./workspace/hilo-app.js";
import { identityHeaders } from "./workspace/identity.js";

app.setName("蒜狸小助手");
// 开发 / 验证时把 userData 指到临时目录，免得碰到真实的全局存储和迁移标记
if (process.env.OV_USER_DATA_DIR) app.setPath("userData", path.resolve(process.env.OV_USER_DATA_DIR));
registerAppScheme();

interface Running {
  hilo: HiloApp;
  appGateway: AppGateway;
  store: GlobalStore;
  health: RestoreHealth;
  appUrl: string;
  logStream?: WriteStream;
}

let running: Running | undefined;

function makeLogger(logDir: string): { log: (line: string) => void; stream?: WriteStream } {
  let stream: WriteStream | undefined;
  try {
    mkdirSync(logDir, { recursive: true });
    stream = createWriteStream(path.join(logDir, "main.log"), { flags: "a" });
  } catch {
    // 写不了日志文件就只打控制台
  }
  return {
    stream,
    log: (line: string) => {
      console.log(line);
      stream?.write(`${new Date().toISOString()} ${line}\n`);
    },
  };
}

function mainWindow(): BrowserWindow | undefined {
  return BrowserWindow.getAllWindows()[0];
}

function showMainWindow(appUrl: string): BrowserWindow {
  let w = mainWindow();
  if (!w) {
    w = createMainWindow({ gatewayUrl: appUrl });
    wireFullscreenEvents(w);
  }
  if (devHiddenWindow()) return w;
  if (w.isMinimized()) w.restore();
  w.show();
  w.focus();
  return w;
}

/** 旧式打开方法遇到"开不了"的结果时给一条系统通知。 */
function notifyOpenResult(r: WorkspaceOpenResult): void {
  if (!Notification.isSupported()) return;
  let body: string | undefined;
  if (r.kind === "limit_reached") body = `最多同时运行 ${r.maxOpenWorkspaces} 个项目，${r.busyProjectNames.join("、")} 都还在忙。先关掉一个再试。`;
  else if (r.kind === "storage_unavailable" || r.kind === "storage_restart_required") body = "数据目录暂时不可用。";
  if (body) new Notification({ title: "打不开项目", body }).show();
}

async function boot(): Promise<Running> {
  const dirs = dataDirs();
  const { log, stream } = makeLogger(path.join(dirs.userData, "logs"));
  const roots = resourceRoots();
  const nodeExec = nodeExecutable();
  const gatewayEntry = roots.resources
    ? path.join(roots.resources, "gateway/dist/main.js")
    : path.join(roots.repoRoot!, "app/gateway/dist/main.js");
  log(`[main] userData=${dirs.userData} projects=${dirs.projectsRoot} hub=${dirs.hubRoot}`);

  // 自带技能铺到 opencode 加载的目录。要在任何工作区起 opencode 之前做完，否则第一个会话看不到技能。
  const bundledSkills = locateBundledSkills(roots);
  if (bundledSkills) {
    try {
      const r = seedBundledSkills(bundledSkills, path.join(dirs.hubRoot, "skills"));
      log(`[main] 自带技能：新装 ${r.installed.length}、更新 ${r.updated.length}、不变 ${r.unchanged.length}${r.failed.length ? `、失败 ${r.failed.map((f) => `${f.slug}(${f.error})`).join(" ")}` : ""}`);
    } catch (err) {
      log(`[main] 铺自带技能失败：${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // 存储
  const defaultWorkingDirectory = path.join(dirs.hubRoot, "projects");
  const store = new GlobalStore(dirs.globalStorePath, { workingDirectory: defaultWorkingDirectory, log });
  const workspaceStores = new WorkspaceStorageRegistry();
  registerStorageIpc(ipcMain, store, workspaceStores, defaultWorkingDirectory);
  const health = new RestoreHealth(store);

  // 总线
  const ipcServer = createMainIpcServer(ipcMain);
  const registerChannel = (name: string, service: object) => {
    const owned = new DisposableStore();
    ipcServer.registerChannel(name, fromService(service, owned));
    return {
      dispose: () => {
        ipcServer.unregisterChannel(name);
        owned.dispose();
      },
    };
  };

  // 每个 gateway 都要知道的两处位置：opencode 的会话库（项目导出导入读写它）、项目根（画布引用解析项目素材）。
  // opencode 的 XDG_DATA_HOME 指在 runtimeDir 下，见 opencode/index.ts。
  const opencodeDbPath = path.join(dirs.runtimeDir, "data-home", "opencode", "opencode.db");
  const sharedGatewayEnv = {
    HILO_OPENCODE_DB: opencodeDbPath,
    HILO_PROJECTS_ROOT: dirs.projectsRoot,
    // 首页示例图的**可写**缓存。必须给一个包外的地方：发布包里 `resources/home-showcase`
    // 是只读的（macOS 的 .app/Contents 和 Windows 的 Program Files 都不是当前用户能写的），
    // 预热往那儿写会 EACCES。放 userData 是全应用共享的 —— 应用级 gateway 和每个工作区的
    // gateway 都指到同一份，不会每个项目重下一遍。
    HILO_HOMESHOWCASE_CACHE: path.join(dirs.userData, "home-showcase"),
  };

  // 应用级 gateway：先占端口，窗口拿到地址就能开
  mkdirSync(dirs.outputDir, { recursive: true });
  const gateways = new GatewayRegistry();
  const appGatewayProc = new GatewayManager(
    {
      entry: gatewayEntry,
      role: "app-level",
      exec: nodeExec,
      // 没有工作区：状态都落在输出目录，别让它把 gateway 的安装目录当工作区
      env: { OV_CONFIG_PATH: dirs.configPath, OUTPUT_DIR: dirs.outputDir, WORKSPACE_DIR: dirs.outputDir, ...sharedGatewayEnv },
    },
    log,
  );
  const readiness = new GatewayReadinessService();
  const appGateway = new AppGateway(appGatewayProc, readiness, log);
  gateways.register(APP_LEVEL_GATEWAY_KEY, { url: () => appGatewayProc.running?.url });
  const appUrl = await appGateway.allocate();

  // 项目
  const projects = new ProjectService({
    getProjects: () => store.get("projects") as ProjectRecord[],
    setProjects: (p) => store.replace("projects", p),
    projectsRoot: () => dirs.projectsRoot,
    journalDir: dirs.journalDir,
    trashFolder: (p) => shell.trashItem(p),
    log,
  });
  await projects.initialize().catch((err) => log(`[main] 项目存储初始化失败：${String(err)}`));

  // 首次启动迁移旧版数据（只跑一次）
  if (process.env.OV_SKIP_LEGACY_MIGRATION !== "1") {
    await migrateLegacyWorkspace({
      legacyConfigPath: process.env.OV_LEGACY_CONFIG_PATH ?? path.join(app.getPath("appData"), "ovaijisuandesign", "config.json"),
      configPath: dirs.configPath,
      projectsRoot: dirs.projectsRoot,
      markerPath: path.join(dirs.userData, ".legacy-migrated"),
      statePath: path.join(dirs.userData, "legacy-migration", "state.json"),
      store,
      projects,
      log,
    }).catch((err) => log(`[main] 旧版数据迁移失败（下次启动重试）：${err instanceof Error ? err.message : String(err)}`));
  }

  // 多工作区
  const opencodeStartGate = createSerialGate();
  const hilo: HiloApp = new HiloApp({
    createRuntime: (id, folderPath, opts) => {
      const handle = new BundleHandle(id, folderPath, opts.generation, {
        createGateway: (dir, env) =>
          new GatewayManager(
            {
              entry: gatewayEntry,
              role: "workspace",
              workspaceDir: dir,
              exec: nodeExec,
              env: { OV_CONFIG_PATH: dirs.configPath, OUTPUT_DIR: dirs.outputDir, HUB_SKILLS_DIR: path.join(dirs.hubRoot, "skills"), HUB_USER_SKILLS_DIR: dirs.userSkillsDir, ...sharedGatewayEnv, ...env },
            },
            log,
          ),
        createOpencode: () => new OpenCodeRuntime(log),
        prepareOpencode: (dir, gatewayUrl, identity) =>
          prepareLaunch({
            roots,
            version: app.getVersion(),
            workspace: dir,
            // 每次起都重读：设置页改了模型后新开的工作区就用上
            platform: readPlatform(dirs.configPath),
            gatewayUrl,
            identity,
            hubRoot: dirs.hubRoot,
            runtimeDir: dirs.runtimeDir,
            skillsDir: path.join(dirs.hubRoot, "skills"),
            userSkillsDir: dirs.userSkillsDir,
            nodeExec,
          }),
        opencodeStartGate,
        log,
      });
      const reg = gateways.register(id, { url: () => handle.binding()?.baseUrl, binding: () => handle.binding() });
      handle.onStatusChange((s) => {
        if (s.state === "stopped") reg.dispose();
      });
      return handle;
    },
    registerChannel,
    projectsRoot: () => dirs.projectsRoot,
    home: homedir(),
    onWorkspaceOpened: (p) => store.update("recentWorkspaces", (list: RecentWorkspace[]) => recordRecentOpen(list, p, Date.now())),
    onOpenWorkspacesChanged: (paths) => store.replace("openWorkspacePaths", paths),
    onWorkspaceClosed: (p) => health.clear(p),
    applyCreatePreferences: (dir, v) => workspaceStores.applyCreatePreferences(dir, v),
    showHome: () => void showMainWindow(appUrl),
    notify: notifyOpenResult,
    toggleSkill: async (name, enabled) => {
      const target = gateways.firstUrl();
      if (!target) throw new Error("no gateway is running");
      const r = await fetch(`${target.url}/api/skills/${encodeURIComponent(name)}/toggle`, {
        method: "POST",
        headers: { "content-type": "application/json", ...identityHeaders(target.binding) },
        body: JSON.stringify({ enabled }),
      });
      if (!r.ok) throw new Error(`toggle skill failed: ${r.status}`);
      const body = (await r.json()) as { skill?: unknown };
      for (const w of BrowserWindow.getAllWindows()) w.webContents.send(IPC.skillPermissionsChanged);
      return body.skill ?? body;
    },
    retryAppGateway: () => appGateway.retry(),
    log,
  });
  hilo.startIdleSweep();

  registerChannel("hilo", hilo);
  registerChannel("project", projects);
  // 用户自建的技能优先于自带的
  registerChannel("skillExport", createSkillExportService(() => [dirs.userSkillsDir, path.join(dirs.hubRoot, "skills")]));
  registerChannel("projectAssets", new ProjectAssetsService({ projectsRoot: () => dirs.projectsRoot, trashItem: (p) => shell.trashItem(p) }));
  registerChannel("gateway-readiness", readinessView(readiness));
  // 项目导出 / 导入 / 示例项目
  registerChannel(
    "projectArchive",
    new ProjectArchiveService({
      appVersion: app.getVersion(),
      projectsRoot: () => dirs.projectsRoot,
      opencodeDbPath,
      workspaceBinding: (folderPath) => gateways.get(path.resolve(folderPath))?.binding?.(),
      appGatewayUrl: () => appGatewayProc.running?.url,
      templateDirs: () => [roots.resources && path.join(roots.resources, "project-templates"), roots.repoRoot && path.join(roots.repoRoot, "assets", "project-templates")].filter((d): d is string => !!d),
      downloadsDir: () => app.getPath("downloads"),
      showSaveDialog: (o) => {
        const w = BrowserWindow.getFocusedWindow();
        return w ? dialog.showSaveDialog(w, o) : dialog.showSaveDialog(o);
      },
      showOpenDialog: (o) => {
        const w = BrowserWindow.getFocusedWindow();
        const opts = o as Electron.OpenDialogOptions;
        return w ? dialog.showOpenDialog(w, opts) : dialog.showOpenDialog(opts);
      },
      log,
    }),
  );
  // 设置页「模型接入」：读写平台配置。新配置在下次起 opencode 时生效（渲染层保存后会请求重启）
  registerChannel("platform-settings", {
    get: async () => readSettings(dirs.configPath, dirs.projectsRoot, 0),
    save: async (patch: Record<string, unknown>) => {
      writeSettings(dirs.configPath, patch);
      return { ok: true };
    },
  });
  for (const [name, svc] of Object.entries(stubChannels({ store, projectsRoot: dirs.projectsRoot, dataRoot: dirs.dataRoot, outputDir: dirs.outputDir, log: (l, m) => log(`[renderer ${l}] ${m}`) }))) {
    registerChannel(name, svc);
  }

  // 自动更新。官方渲染层已经把整条链路建好了（UpdateBanner / ForcedUpdateDialog /
  // 设置页的「检查更新」），它通过 `ProxyChannel.toService(client.getChannel("updater"))`
  // 取服务 —— 所以这里只要**通道名叫 `updater`** 且实现那 10 个方法，UI 侧零改动。
  // 名字对不上它不会报错，只是静默退化（官方那整段包在 try/catch 里 return）。
  //
  // **实例要提成变量**：raw-ipc 里那个 `updater:check` 也得指到同一个实例，
  // 否则渲染层那半边永远是个返回 `{accepted:false}` 的死桩（见 registerRawIpc 的注释）。
  const updaterService = new UpdaterService({
      // 开发态返回 null：本地开发不该被线上版本打断（官方也是这么做的）。
      createAutoUpdater: () => {
        if (!shouldAutoUpdate()) return null;
        const feed = process.env.OV_UPDATE_FEED_BASE?.trim();
        if (!feed) {
          // 不静默：没有 feed 就没法更新，但用户点了「检查更新」应该有句话看。
          log("[updater] 未配置 OV_UPDATE_FEED_BASE，无法检查更新");
          return null;
        }
        return createElectronAutoUpdater({ feedBase: feed, target: currentUpdateTarget() });
      },
      currentVersion: () => app.getVersion(),
      readDismissed: () => {
        const d = store.get("updaterDismissed") as { version?: string; at?: number } | undefined;
        return { version: d?.version ?? null, at: d?.at ?? 0 };
      },
    writeDismissed: (version, at) => void store.set("updaterDismissed", { version, at }),
    log,
  });

  const menuDeps = {
    createWorkspace: () => hilo.createWorkspace(),
    openLogDir: () => void shell.openPath(path.join(dirs.userData, "logs")),
    exportLogs: (w: BrowserWindow | null) => exportLogs(w, path.join(dirs.userData, "logs")),
  };
  registerRawIpc({
    // 渲染层 preload 的 `hilo.updater` 也指到这个实例 —— 见 registerRawIpc 里
    // `updater:check` 那条的注释：以前是硬编码的 `{accepted:false}` 死桩。
    updater: updaterService,
    logDir: path.join(dirs.userData, "logs"),
    logFile: path.join(dirs.userData, "logs", "main.log"),
    store,
    hubRoot: dirs.hubRoot,
    triggerMenu: (id, sender) => triggerMenuAction(id, menuDeps, sender),
    restartOpencode: () => hilo.restartAllOpencode(),
    log: (level, message) => log(`[renderer ${level}] ${message}`),
  });
  installAppMenu(menuDeps);
  wireNetworkStatusEvents();

  // 窗口不等 gateway
  const win = showMainWindow(appUrl);
  void appGateway.startInBackground();

  // 恢复上次的标签；给渲染层的通知等页面加载完再发（preload 还会替它攒着）
  const pageLoaded = new Promise<void>((resolve) => win.webContents.once("did-finish-load", () => resolve()));
  void runStartupRestore({
    store,
    health,
    restoreTabs: (paths, prewarm) => hilo.restoreWorkspaceTabs(paths, prewarm),
    askRestoreUnhealthy: async (paths) => {
      const { response } = await dialog.showMessageBox(win, {
        type: "warning",
        buttons: ["恢复", "跳过"],
        defaultId: 1,
        cancelId: 1,
        message: "上次有项目没能正常关闭",
        detail: `这些项目在最近几次启动后都没有正常退出，可能是它们导致了问题：\n${paths.join("\n")}\n\n跳过后它们仍在最近项目里，可以手动打开。`,
        noLink: true,
      });
      return response === 0 ? "restore" : "skip";
    },
    send: (payload) => void pageLoaded.then(() => !win.isDestroyed() && win.webContents.send(IPC.menuNewWorkspace, payload)),
    log,
  });

  // 开发用：启动后直接打开这些工作区（路径用系统分隔符隔开），便于不经界面验证多工作区。
  // 按给定顺序一个一个打开，最近项目的先后才是确定的（界面逐屏对比依赖这一点）。
  if (!app.isPackaged && process.env.OV_DEV_OPEN_WORKSPACES) {
    const paths = process.env.OV_DEV_OPEN_WORKSPACES.split(path.delimiter).filter(Boolean);
    void (async () => {
      for (const p of paths) {
        await hilo.openWorkspaceWithResult(p).then(
          (r) => log(`[dev] open ${p} → ${r.kind}${r.kind === "opened" || r.kind === "reused" ? ` ${r.runtime.gatewayUrl}` : ""}`),
          (err) => log(`[dev] open ${p} failed: ${String(err)}`),
        );
      }
    })();
  }

  // 开发用：到时间走一遍正常退出流程（验证退出时不留孤儿进程）
  const quitAfter = Number(process.env.OV_DEV_QUIT_AFTER_MS);
  if (!app.isPackaged && quitAfter > 0) setTimeout(() => app.quit(), quitAfter).unref();

  return { hilo, appGateway, store, health, appUrl, logStream: stream };
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (running) showMainWindow(running.appUrl);
  });

  void app.whenReady().then(async () => {
    handleAppScheme();
    try {
      running = await boot();
    } catch (err) {
      console.error("启动失败", err);
      app.exit(1);
      return;
    }
    // 点 Dock 图标：只在没有可见窗口时才唤起
    app.on("activate", () => {
      if (running && !BrowserWindow.getAllWindows().some((w) => w.isVisible())) showMainWindow(running.appUrl);
    });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });

  // gateway 和 opencode 都在独立进程组里，**不会**跟着我们退出。退出前必须停掉，
  // 否则每次关应用都留下一串孤儿进程占着端口。
  let quitting = false;
  app.on("before-quit", (e) => {
    if (quitting || !running) return;
    e.preventDefault();
    quitting = true;
    const r = running;
    void (async () => {
      await r.hilo.shutdown();
      await r.appGateway.stop();
      // 正常退出：恢复熔断计数清零
      r.health.reset();
      r.logStream?.end();
    })()
      .catch((err) => console.error("退出清理失败", err))
      .finally(() => app.exit(0));
  });
  const stopAllSync = () => {
    running?.hilo.shutdownSync();
    running?.appGateway.stopSync();
  };
  // 兜底：exit() 时 before-quit 不会触发。
  process.on("exit", stopAllSync);
  // 被信号终止（kill、Ctrl-C、终端关掉）时 Node 默认直接退出，连 exit 事件都没有 ——
  // 先同步停掉再退。
  for (const sig of ["SIGTERM", "SIGINT", "SIGHUP"] as const) {
    process.on(sig, () => {
      stopAllSync();
      app.exit(0);
    });
  }
}
