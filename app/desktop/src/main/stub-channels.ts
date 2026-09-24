/**
 * 不在本阶段范围内的频道（团队、登录、更新、IM、ComfyUI、内置浏览器相关……）。
 *
 * 频道不注册的话，渲染层每个调用都要等 1 秒才报"未知频道"，首页会明显卡顿。
 * 所以都挂上占位服务：列出来的方法给固定返回值，没列出的方法返回 undefined，
 * 事件永远不触发。
 */
import { app, clipboard, shell } from "electron";

import { Emitter, type Event } from "./ipc/events.js";
import type { GlobalStore } from "./storage/global-store.js";

type Methods = Record<string, (...args: unknown[]) => unknown>;

/** 占位服务：显式方法 + 事件字段；其余方法名一律返回 undefined。 */
export function stubService(methods: Methods, events: string[] = []): object {
  const target: Record<string, unknown> = { ...methods };
  for (const e of events) target[e] = new Emitter<unknown>().event satisfies Event<unknown>;
  return new Proxy(target, {
    get(t, prop) {
      if (typeof prop !== "string") return undefined;
      if (prop in t) return t[prop];
      return () => undefined;
    },
  });
}

const reject = (what: string) => () => Promise.reject(new Error(`${what} is not available in this build`));

export interface StubDeps {
  store: GlobalStore;
  projectsRoot: string;
  dataRoot: string;
  outputDir: string;
  log: (level: string, message: string) => void;
}

export function stubChannels(deps: StubDeps): Record<string, object> {
  const config = () => deps.store.get("config");
  const log = (level: string) => (message: unknown) => deps.log(level, String(message));
  return {
    log: stubService(
      { getLevel: () => 2, setLevel: () => undefined, trace: log("debug"), debug: log("debug"), info: log("info"), warn: log("warn"), error: log("error") },
      ["onDidChangeLogLevel"],
    ),
    "custom-mcp": stubService({ list: () => [], getRemotePreparation: () => undefined, getMutationRevision: () => 0 }, ["onDidChangeRemotePreparation"]),
    "generic-connector": stubService({
      listSpecs: () => [],
      status: (id) => ({ connectorId: id, state: "not_installed", packageStaged: false, packageUsable: false, updateAvailable: false, connectorConfigured: false, addonReachable: false }),
    }),
    desktopSettings: stubService(
      {
        getActiveCustomModel: () => null,
        saveCustomModel: () => ({ success: false }),
        getTrayVisible: () => config().menuBarVisible !== false,
        getRunOnStartup: () => app.getLoginItemSettings().openAtLogin,
        getGlobalShortcut: () => config().globalAccessShortcut ?? {},
        getPreventSleep: () => config().preventSleep === true,
        getInstallLocationInfo: () => ({ supported: false, installDir: "", isDefaultLocation: true }),
        relaunch: () => {
          app.relaunch();
          app.quit();
        },
        ...Object.fromEntries(
          [
            "setTrayVisible", "setRunOnStartup", "setGlobalShortcut", "openNotificationSettings", "setPreventSleep",
            "setAutoFeedbackEnabled", "setWatermarkEnabled", "setCompactionEnabled", "setLane", "setLanguage", "setTheme",
          ].map((n) => [n, () => ({ success: true })]),
        ),
      },
      ["onDidChangeCustomModel"],
    ),
    dataDirectory: stubService({
      getStatus: () => {
        const open = deps.store.get("openWorkspacePaths");
        return {
          dataDirectory: deps.dataRoot,
          activeDirectory: deps.dataRoot,
          configuredDirectory: "",
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
      apply: reject("moving the data directory"),
      reset: reject("moving the data directory"),
    }),
    assetCenter: stubService({
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
    }),
    notification: stubService(
      { getPermissionStatus: () => ({ supported: true, status: "assumed-granted" }), requestPermission: () => true, show: () => ({ success: false, id: null }) },
      ["onDidClickNotification", "onDidCloseNotification"],
    ),
    networkDiagnostics: stubService({
      getProxyMode: () => config().networkProxyMode ?? "auto",
      setProxyMode: (mode) => ({ success: false, mode, restartHint: true, error: "unsupported" }),
      runDiagnostics: () => ({ generatedAt: Date.now(), online: true, overall: "ok", proxyMode: config().networkProxyMode ?? "auto", checks: [] }),
      getLastSnapshot: () => undefined,
    }),
    "team-account": stubService(
      {
        getSnapshot: () => ({ schemaVersion: 1, sequence: "0", status: "signed_out", identityKey: null, activeContext: null, contexts: [] }),
      },
      ["onDidChange"],
    ),
    "team-operation": stubService({ getSnapshot: () => [] }, ["onDidChange"]),
    "team-data-invalidation": stubService({}, ["onDidInvalidate"]),
    updater: stubService(
      {
        getState: () => ({ state: { type: "idle" }, trigger: "auto" }),
        getVersion: () => app.getVersion(),
        getCapabilities: () => ({ downloadCancellation: false }),
        check: () => ({ accepted: false }),
        checkDownloadedFreshness: () => false,
      },
      ["onDidChangeState"],
    ),
    imBridge: stubService(
      { listAccounts: () => [], listStatuses: () => [], getCredentialMigrationStatus: () => ({ legacyCredentialsPresent: false }), isPlatformAvailable: () => false },
      ["onDidChangeAccounts", "onDidChangeStatus", "onQrLoginUpdate", "onUserAuthUpdate", "onDidReceiveMessage", "onDidChangeBindings"],
    ),
    fileHandlers: stubService({ listHandlers: () => [], getDefaultHandler: () => undefined, chooseAndOpen: () => false }),
    trash: stubService({ trashItem: (p) => shell.trashItem(String(p)) }),
    clipboard: stubService({
      readFiles: () => [],
      readImage: () => null,
      hasFiles: () => clipboard.availableFormats().some((f) => f.startsWith("image/") || f === "text/uri-list"),
      triggerPasteOnFocusedWindow: () => ({ ok: false, reason: "no-window" }),
    }),
    projectAssets: stubService(
      {
        listTransfers: () => [],
        listAssetSyncStates: () => [],
        hasActiveProjectTransfers: () => false,
        listAssets: () => [],
        listLocalFolders: () => [],
        searchLocalAssets: () => [],
        startDownload: reject("cloud assets"),
        startFolderDownload: reject("cloud assets"),
        startUpload: reject("cloud assets"),
      },
      ["onDidChangeTransfer", "onDidChangeAssets"],
    ),
    projectArchive: stubService(
      {
        exportProject: () => ({ cancelled: false, failureReason: "unsupported" }),
        cancelExport: () => false,
        importProject: () => ({ cancelled: true }),
        importProjectFromUrl: reject("project import"),
        importBundledProject: reject("project templates"),
      },
      ["onProgress"],
    ),
    comfyUiModelDownload: stubService(
      { getTasks: () => [], getModelDirectoryState: () => ({ activeDirectory: "", directories: [] }), prepareWorkflow: reject("ComfyUI") },
      ["onDidChange", "onDidChangeModelDirectories"],
    ),
    skillExport: stubService({ exportSkill: reject("skill export") }),
    window: stubService(
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
