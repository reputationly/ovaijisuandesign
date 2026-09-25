/**
 * 不在本阶段范围内的频道（团队、登录、更新、IM、ComfyUI、内置浏览器相关……）。
 *
 * 频道不注册的话，渲染层每个调用都要等 1 秒才报"未知频道"，首页会明显卡顿。
 * 所以都挂上占位服务：列出来的方法给固定返回值，没列出的方法返回 undefined，
 * 事件永远不触发。
 */
import { format } from "node:util";

import { app, BrowserWindow, clipboard, nativeTheme, powerSaveBlocker, shell } from "electron";

import { Emitter, type Event } from "./ipc/events.js";
import type { GlobalStore } from "./storage/global-store.js";

type Methods = Record<string, (...args: unknown[]) => unknown>;

/**
 * 占位服务：显式方法 + 事件字段；其余方法名一律返回 undefined。
 * 漏列的方法每个报一次 `onMissing`：渲染层拿 undefined 去读字段就会崩，日志里得看得到是哪个。
 */
export function stubService(methods: Methods, events: string[] = [], onMissing?: (method: string) => void): object {
  const target: Record<string, unknown> = { ...methods };
  for (const e of events) target[e] = new Emitter<unknown>().event satisfies Event<unknown>;
  const reported = new Set<string>();
  return new Proxy(target, {
    get(t, prop) {
      if (typeof prop !== "string") return undefined;
      if (prop in t) return t[prop];
      return () => {
        if (onMissing && !reported.has(prop)) {
          reported.add(prop);
          onMissing(prop);
        }
        return undefined;
      };
    },
  });
}

/** 本机固定用户的个人空间快照，字段同团队账号服务的就绪态。 */
export const TEAM_SNAPSHOT = {
  schemaVersion: 1,
  sequence: "1",
  status: "ready",
  identityKey: "team-identity-v1:local",
  activeContext: { accountType: "PERSONAL", groupId: "local", epoch: "1", membershipRevision: null },
} as const;

/** 更新状态机的空闲态（没有可用更新、没有下载、没被忽略）。 */
export function updaterIdleState(lastCheckAt = 0): Record<string, unknown> {
  return {
    phase: "idle",
    forced: false,
    policyStatus: "ready",
    forceSource: "none",
    policySource: "none",
    manualDownloadUrl: null,
    manualOnly: false,
    manualRecoveryReason: null,
    manualRecoverySource: null,
    manualRecoveryCode: null,
    policyCheckedAt: 0,
    currentVersion: app.getVersion(),
    targetVersion: null,
    subtitle: null,
    requiredReason: null,
    changelog: null,
    progress: null,
    error: null,
    lastCheckAt,
    availableSince: 0,
    userTriggeredDownload: false,
    activeCheckUserTriggered: false,
    dismissed: false,
    dismissedVersion: null,
    dismissedAt: 0,
  };
}

const reject = (what: string) => () => Promise.reject(new Error(`${what} is not available in this build`));

export interface StubDeps {
  store: GlobalStore;
  projectsRoot: string;
  dataRoot: string;
  outputDir: string;
  log: (level: string, message: string) => void;
}

function connectorStatus(id: unknown): Record<string, unknown> {
  return { connectorId: id, state: "not_installed", packageStaged: false, packageUsable: false, updateAvailable: false, connectorConfigured: false, addonReachable: false };
}

/** 数据目录迁移的失败结果（没搬任何东西，源数据原样保留）。 */
function noMove(code: string): Record<string, unknown> {
  return {
    success: false,
    migrated: [],
    skipped: [],
    needsRestart: false,
    failure: { code, phase: "preflight", retryable: false, diagnosticId: "", sourcePreserved: true },
    error: code,
  };
}

/** 设置页开关的统一返回：抛了就是 { success: false, error }。 */
function settle(fn: () => void): { success: boolean; error?: string } {
  try {
    fn();
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

function notificationSettingsUrl(): string | undefined {
  if (process.platform === "darwin") return "x-apple.systempreferences:com.apple.preference.notifications";
  if (process.platform === "win32") return "ms-settings:notifications";
  return undefined;
}

/** 阻止系统休眠。 */
class PowerBlocker {
  private id: number | null = null;
  isOn(): boolean {
    return this.id !== null && powerSaveBlocker.isStarted(this.id);
  }
  set(on: boolean): void {
    if (on && !this.isOn()) this.id = powerSaveBlocker.start("prevent-app-suspension");
    else if (!on && this.id !== null) {
      if (powerSaveBlocker.isStarted(this.id)) powerSaveBlocker.stop(this.id);
      this.id = null;
    }
  }
}

export function stubChannels(deps: StubDeps): Record<string, object> {
  const config = () => deps.store.get("config");
  const power = new PowerBlocker();
  const updaterChanged = new Emitter<{ state: Record<string, unknown>; trigger: string }>();
  let lastUpdateCheck = 0;
  let lastRelaunch = 0;
  // 启动时按已存的设置把系统层的状态对齐（渲染层只在开关变化时才调 setter）
  try {
    nativeTheme.themeSource = config().theme === "dark" || config().theme === "light" ? (config().theme as "dark" | "light") : "system";
    if (config().preventSleep === true) power.set(true);
  } catch {
    // 设置坏了不影响启动
  }
  // 没有真的探测：给一份"一切正常"的完整快照。渲染层直接读 probes / recommendations，缺字段会整页崩。
  const diagnosticsSnapshot = () => ({
    generatedAt: new Date().toISOString(),
    release: { region: "domestic", channel: "prod" },
    online: true,
    overall: "ok",
    proxyMode: config().networkProxyMode ?? "auto",
    proxyDetected: false,
    proxyRaw: "",
    tunDetected: false,
    tunInterfaces: [],
    probes: [],
    recommendations: [],
  });
  // 日志服务：级别同渲染层的 LogLevel（Trace 0 … Error 4），默认 Info；附加参数拼在消息后面
  let logLevel = 2;
  const logLevelChanged = new Emitter<number>();
  const log = (level: string, threshold: number) => (message: unknown, ...args: unknown[]) => {
    if (threshold < logLevel && level !== "error") return;
    const head = message instanceof Error ? (message.stack ?? message.message) : String(message);
    deps.log(level, args.length ? `${head} ${format(...args)}` : head);
  };
  const stub = (name: string, methods: Methods, events: string[] = []) =>
    stubService(methods, events, (m) => deps.log("warn", `[stub] ${name}.${m} 没有实现，回 undefined`));
  return {
    log: {
      getLevel: () => logLevel,
      setLevel: (level: unknown) => {
        if (typeof level !== "number" || level === logLevel) return;
        logLevel = level;
        logLevelChanged.fire(level);
      },
      trace: log("debug", 0),
      debug: log("debug", 1),
      info: log("info", 2),
      warn: log("warn", 3),
      error: log("error", 4),
      onDidChangeLogLevel: logLevelChanged.event,
    },
    // 自定义 MCP 连接器还没接进 opencode：列表为空，增删改一律按失败返回（渲染层读 ok / code 出提示）
    "custom-mcp": stub(
      "custom-mcp",
      {
        list: () => [],
        getRemotePreparation: () => undefined,
        getMutationRevision: () => 0,
        prepareRemoteConnector: (req) => ({
          connectorId: (req as { connectorId?: string } | undefined)?.connectorId ?? "",
          state: "failed",
          ok: false,
          startupSupported: false,
          mcpConnected: false,
          hostControlVerified: false,
          code: "runtime_unavailable",
        }),
        create: () => ({ ok: false, code: "storage_failed" }),
        setEnabled: () => ({ ok: false, code: "server_not_found" }),
        remove: () => ({ removed: false, code: "server_not_found" }),
      },
      ["onDidChangeRemotePreparation"],
    ),
    // 桌面软件连接器（Blender、PS…）的安装包不随应用分发：一律"本平台不支持"
    "generic-connector": stub("generic-connector", {
      listSpecs: () => [],
      status: (id) => connectorStatus(id),
      preflight: (id) => ({ connectorId: id, platformSupported: false, hostAppState: "unknown", status: connectorStatus(id) }),
      getInstallTargets: () => ({ ok: false, code: "unsupported_platform" }),
      install: () => ({ ok: false, code: "unsupported_platform" }),
      uninstall: () => ({ ok: false, message: "server_not_found" }),
    }),
    desktopSettings: stub("desktopSettings",
      {
        getActiveCustomModel: () => null,
        saveCustomModel: () => ({ success: false }),
        getTrayVisible: () => config().menuBarVisible !== false,
        getRunOnStartup: () => app.getLoginItemSettings().openAtLogin,
        getGlobalShortcut: () => config().globalAccessShortcut,
        getPreventSleep: () => power.isOn(),
        getInstallLocationInfo: () => ({ supported: false, installDir: "", isDefaultLocation: true }),
        relaunch: () => {
          // 连点重启会叠出好几个实例
          if (Date.now() - lastRelaunch < 5000) return;
          lastRelaunch = Date.now();
          app.relaunch();
          app.quit();
        },
        setPreventSleep: (on) => settle(() => power.set(Boolean(on))),
        setTheme: (theme) =>
          settle(() => {
            nativeTheme.themeSource = theme === "dark" || theme === "light" ? theme : "system";
          }),
        // 开发时注册的会是 Electron 本体，只在打包后真的设
        setRunOnStartup: (on) =>
          settle(() => {
            if (app.isPackaged) app.setLoginItemSettings({ openAtLogin: Boolean(on), openAsHidden: false });
          }),
        openNotificationSettings: async () => {
          const url = notificationSettingsUrl();
          if (!url) return { success: false, error: "Notification settings are not supported on this platform" };
          try {
            await shell.openExternal(url);
            return { success: true };
          } catch (err) {
            return { success: false, error: String(err) };
          }
        },
        // 持久化在渲染层（global.config）；这些开关要广播给 gateway 的部分我们还没有，按成功返回
        ...Object.fromEntries(
          ["setTrayVisible", "setGlobalShortcut", "setAutoFeedbackEnabled", "setWatermarkEnabled", "setCompactionEnabled", "setLane", "setLanguage"].map((n) => [
            n,
            () => ({ success: true }),
          ]),
        ),
      },
      ["onDidChangeCustomModel"],
    ),
    // 数据目录不能搬：始终是"系统默认位置"。dataDirectory 非空时设置页会多出"迁回默认"按钮
    dataDirectory: stub("dataDirectory", {
      getStatus: () => {
        const open = deps.store.get("openWorkspacePaths");
        return {
          dataDirectory: "",
          activeDirectory: deps.dataRoot,
          configuredDirectory: deps.dataRoot,
          defaultDirectory: deps.dataRoot,
          state: "active",
          workspacePathRewritePending: false,
          openWorkspaceCount: open.length,
          openWorkspacePaths: open,
          cleanupPaths: [],
          deferredCleanupPaths: [],
        };
      },
      getProjectsRoot: () => deps.projectsRoot,
      getDefaultStorageResidue: () => undefined,
      validate: () => ({ ok: false, error: "invalid_path" }),
      estimateMigrationSize: () => ({ totalBytes: 0, breakdown: [] }),
      // 迁移失败的结构化结果；直接 reject 渲染层只能显示"未知错误"
      apply: () => noMove("migration_failed"),
      reset: () => noMove("migration_failed"),
      recoverDefaultStorageResidue: () => noMove("configured_location_unavailable"),
      getDiskSpace: () => ({ free: 0, total: 0 }),
      cleanupOldData: (paths) => ({ removed: [], failed: Array.isArray(paths) ? paths : [] }),
    }),
    assetCenter: stub("assetCenter", {
      getStatus: () => ({
        directory: `${deps.dataRoot}/.asset-center`,
        defaultDirectory: `${deps.dataRoot}/.asset-center`,
        isCustomDirectory: false,
        currentRootHasData: false,
        currentRootUnavailable: false,
        needsRestart: false,
        dataDirectoryChangePending: false,
      }),
      isCurrentDirectory: () => false,
      directoryHasContent: () => false,
      pickDirectory: () => null,
      inspectDirectory: () => "empty",
      setDirectory: () => ({ needsRestart: false }),
      resetToDefault: () => ({ needsRestart: false }),
      migrateAndSwitch: () => ({ migration: { success: false, reasonCode: "invalid_path" } }),
      // 首页收起资产中心入口后记下来，下次不再出现
      markLegacyEntryHidden: () => {
        if (config().assetCenterHidden !== true) deps.store.set("config", { assetCenterHidden: true });
      },
    }),
    notification: stub("notification",
      { getPermissionStatus: () => ({ supported: true, status: "assumed-granted" }), requestPermission: () => true, show: () => ({ success: false, id: null }) },
      ["onDidClickNotification", "onDidCloseNotification"],
    ),
    networkDiagnostics: stub("networkDiagnostics", {
      getProxyMode: () => config().networkProxyMode ?? "auto",
      // 只记下选择（新开的工作区读它）；渲染层拿 success=false 会弹"切换失败"
      setProxyMode: (mode) => {
        if (mode !== "auto" && mode !== "system" && mode !== "direct") {
          return { success: false, mode: config().networkProxyMode ?? "auto", restartHint: true, error: "invalid mode" };
        }
        deps.store.set("config", { networkProxyMode: mode });
        return { success: true, mode, restartHint: true };
      },
      runDiagnostics: () => diagnosticsSnapshot(),
      getLastSnapshot: () => diagnosticsSnapshot(),
    }),
    // 没有团队体系：始终是就绪的个人空间。signed_out 会让渲染层的提交闸门把对话、画布生成全部拦下
    // （"请先登录"）；sequence 得是能被 BigInt 解析的字符串，否则快照会被当成过期丢掉。
    "team-account": stub(
      "team-account",
      {
        getSnapshot: () => TEAM_SNAPSHOT,
        recoverSelectedGroup: () => TEAM_SNAPSHOT,
        revalidateContext: () => ({ status: "completed", appliedSequence: TEAM_SNAPSHOT.sequence }),
        ...Object.fromEntries(
          ["switchContext", "createTeamAndSwitch", "acceptInvitationAndSwitch", "exitCurrentTeam", "transferCredits"].map((n) => [
            n,
            () => ({ status: "rejected", code: "temporarily_unavailable" }),
          ]),
        ),
        acknowledgeCreditTransfer: () => undefined,
      },
      ["onDidChange"],
    ),
    "team-operation": stub(
      "team-operation",
      {
        getSnapshot: () => [],
        track: () => ({ status: "recovering", reasonCode: "team_operation_upstream_unavailable" }),
        retryUnknown: reject("team operations"),
      },
      ["onDidChange"],
    ),
    "team-data-invalidation": stub("team-data-invalidation", {}, ["onDidInvalidate"]),
    // 没有自动更新：状态机永远停在 idle。渲染层拿 getState().state 整个替换本地状态，缺字段会显示成 undefined。
    // 手动检查时照样走一遍 checking → idle 的事件：界面点"检测"后会一直显示"检查中"，直到看到阶段变化。
    updater: stub("updater", {
      getState: () => ({ state: updaterIdleState(lastUpdateCheck), trigger: "auto" }),
      getVersion: () => app.getVersion(),
      getCapabilities: () => ({ downloadCancellation: false }),
      check: (opts) => {
        const trigger = (opts as { userTriggered?: boolean } | undefined)?.userTriggered ? "user" : "auto";
        updaterChanged.fire({ state: { ...updaterIdleState(lastUpdateCheck), phase: "checking" }, trigger });
        setTimeout(() => {
          lastUpdateCheck = Date.now();
          updaterChanged.fire({ state: updaterIdleState(lastUpdateCheck), trigger });
        }, 300);
        return { accepted: true };
      },
      download: () => ({ success: false, error: "Cannot download: phase is idle" }),
      cancelDownload: () => ({ success: false, error: "No download in progress" }),
      install: () => false,
      retryInstall: () => ({ accepted: false, error: "Retry not applicable in current state" }),
      dismiss: () => undefined,
      checkDownloadedFreshness: () => false,
      onStateChanged: updaterChanged.event as Methods[string],
    }),
    // 飞书 / 微信接入不在范围内：所有平台都不可用，界面不会出现添加入口
    imBridge: stub(
      "imBridge",
      {
        listAccounts: () => [],
        listStatuses: () => [],
        listBindings: () => [],
        getCredentialMigrationStatus: () => ({ legacyCredentialsPresent: false }),
        isPlatformAvailable: () => false,
        startWechatQrLogin: reject("IM bridge"),
        startFeishuQrLogin: reject("IM bridge"),
        startFeishuUserAuth: reject("IM bridge"),
        addAccount: reject("IM bridge"),
      },
      ["onStatusChange", "onBindingsChanged", "onIncomingMessage", "onQuestionAnswer", "onWechatQrState", "onFeishuQrState"],
    ),
    fileHandlers: stub("fileHandlers", {
      listHandlers: () => [],
      getDefaultHandler: () => undefined,
      chooseAndOpen: () => false,
      openWith: () => undefined,
      clearCache: () => undefined,
    }),
    trash: stub("trash", { trashItem: (p) => shell.trashItem(String(p)) }),
    clipboard: stub("clipboard", {
      readFiles: () => [],
      readImage: () => null,
      hasFiles: () => {
        let formats: string[];
        try {
          formats = clipboard.availableFormats();
        } catch {
          // 读不到格式时宁可让渲染层去试一次粘贴
          return true;
        }
        return formats.some((f) => ["NSFilenamesPboardType", "public.file-url", "CF_HDROP", "text/uri-list"].includes(f) || f.startsWith("image/"));
      },
      // 让聚焦窗口走一次系统粘贴，渲染层的 paste 事件里就能拿到剪贴板里的文件
      triggerPasteOnFocusedWindow: () => {
        const win = BrowserWindow.getFocusedWindow();
        if (!win || win.isDestroyed()) return { ok: false, reason: "no-window" };
        if (win.webContents.isDestroyed()) return { ok: false, reason: "destroyed" };
        try {
          win.webContents.paste();
          return { ok: true };
        } catch (err) {
          return { ok: false, reason: "paste-threw", message: err instanceof Error ? err.message : String(err) };
        }
      },
    }),
    projectArchive: stub("projectArchive",
      {
        // failureReason 要是渲染层认识的键，否则提示文案是空的
        exportProject: () => ({ cancelled: false, failureReason: "unexpected" }),
        cancelExport: () => false,
        importProject: () => ({ cancelled: true }),
        importProjectFromUrl: reject("project import"),
        importBundledProject: reject("project templates"),
      },
      ["onProgress"],
    ),
    comfyUiModelDownload: stub("comfyUiModelDownload",
      {
        getTasks: () => [],
        getModelDirectoryState: () => ({ activeDirectory: "", directories: [] }),
        getModelAvailability: (models) => ({
          models: (Array.isArray(models) ? models : []).map((m: { name?: unknown; directory?: unknown }) => ({ name: m?.name, directory: m?.directory, available: false })),
          scanComplete: true,
        }),
        prepareWorkflow: reject("ComfyUI"),
        waitForTask: reject("ComfyUI"),
        registerModelDirectory: reject("ComfyUI"),
        getSystemCompatibilitySnapshot: reject("ComfyUI"),
        openModelsFolder: reject("ComfyUI"),
        openWorkflowsFolder: reject("ComfyUI"),
        cancelTask: () => undefined,
        dismissTask: () => undefined,
      },
      ["onDidChange", "onDidScanModelAvailability"],
    ),
    window: stub("window",
      {
        getPendingWindowCloseConfirmation: () => null,
        setWindowCloseConfirmationReady: () => undefined,
        acknowledgeWindowCloseConfirmation: () => undefined,
        respondWindowCloseConfirmation: () => undefined,
        updateNativeToast: () => undefined,
        refreshNativeToastPointer: () => undefined,
        setNativeToastKeyboardFocus: () => undefined,
      },
      ["onDidChangeWindowCloseConfirmation"],
    ),
  };
}
