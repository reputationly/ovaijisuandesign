/**
 * 全局存储 `<userData>/hub-config.json`。
 *
 * 键名和形状对齐渲染层的 `useStorage("global.*")`，所以渲染层照着同一套键读写即可。
 * 语义：
 * - `set(key, v)`：两边都是普通对象时**浅合并**（渲染层只发它改的那几个字段），否则覆盖；
 * - `replace(key, v)`：直接覆盖，删 map 里的键只能用它。
 * 每次写都是整份原子落盘。
 */
import { Emitter, type Event } from "../ipc/events.js";
import { cloneJson, isPlainObject, readJsonFile, writeJsonAtomic } from "./json-file.js";

export const GLOBAL_STORAGE_VERSION = 30;
export const MAX_OPEN_WORKSPACES = 5;

export interface RecentWorkspace {
  path: string;
  openedAt: number;
  manualOrder?: number;
  displayName?: string;
  coverImage?: string;
}

export interface ProjectEntry {
  id: string;
  name: string;
  kind: "local" | "team";
  createdAt: number;
  updatedAt: number;
  workspacePaths: string[];
  revision: number;
  transactionId: string;
  folderName: string;
  remoteId?: string;
  coverImage?: string;
}

export interface VisiblePreviewTabs {
  version: 1;
  initialized: boolean;
  tabs: Array<{ workspaceId: string; folderPath?: string }>;
}

/** 已知键；存储本身允许任意键（渲染层会写一些这里没列的）。 */
export interface GlobalState {
  _version: number;
  tokens: Record<string, unknown>;
  user: Record<string, unknown>;
  config: Record<string, unknown>;
  recentWorkspaces: RecentWorkspace[];
  projects: ProjectEntry[];
  hiddenProjectIds: string[];
  openWorkspacePaths: string[];
  lastActiveWorkspacePath: string;
  workspaceRestoreHealth: Record<string, number>;
  visiblePreviewTabs: VisiblePreviewTabs;
  workspaceSessionTabs: Record<string, unknown>;
  maxOpenWorkspacesLkg: number;
  [key: string]: unknown;
}

/** 渲染层拿不到、也写不了的键。 */
export const PRIVATE_GLOBAL_KEYS: ReadonlySet<string> = new Set(["customMcpVault"]);

export function defaultConfig(workingDirectory: string): Record<string, unknown> {
  return {
    connectorInstallLocations: {},
    menuBarVisible: true,
    windowCloseBehavior: "ask",
    networkProxyMode: "auto",
    agentModePreference: "auto",
    runOnStartup: false,
    recentProjectsSortMode: "manual",
    recentProjectsGroupMode: "project",
    pinnedWorkspacePaths: [],
    projectsSortMode: "updated",
    globalAccessShortcut: {},
    workingDirectory,
    language: "zh",
    theme: "system",
    islandLayout: true,
    transparentWindowExperiment: false,
    dataDirectory: "",
    dataDirectoryCleanupPaths: [],
    dataDirectoryDeferredCleanupPaths: [],
    assetCenterRestartRequired: false,
    folderWhitelist: [],
    skillAutoUpdate: true,
    localFileRevealAllowedDirs: [],
    autoFeedbackEnabled: false,
    watermarkEnabled: true,
    watermarkOnboardingShown: false,
    assetCenterHidden: false,
    attachmentFaceNoticeAccepted: false,
    creditTransferTermsAccepted: {},
    comfyUiLicenseAcceptances: {},
    compactionEnabled: true,
    devAuthBrowser: "default",
    newProjectPrefs: { loadUserMemory: false },
  };
}

export function globalDefaults(workingDirectory = ""): GlobalState {
  return {
    _version: GLOBAL_STORAGE_VERSION,
    tokens: {},
    user: {},
    config: defaultConfig(workingDirectory),
    globalSidebarLayout: {},
    currentWorkspace: "",
    recentWorkspaces: [],
    projects: [],
    hiddenProjectIds: [],
    skillPermissions: {},
    customMcpVault: "",
    windowState: null,
    notificationPermissionRequested: false,
    dismissedMoveToApplications: false,
    dismissedLegacyMacAppCleanup: false,
    visiblePreviewTabs: { version: 1, initialized: false, tabs: [] },
    workspaceSessionTabs: {},
    workspaceTextEditSessions: {},
    reportedIncidentTelemetryByUserID: {},
    // 没有登录流程：直接当作已经走完引导，免得登录页、兴趣选择页挡住首页
    hasSelectedInterests: true,
    selectedInterests: [],
    hasEverLoggedIn: true,
    selectedGroupIds: {},
    creditReminderConfigs: {},
    teamCreditTransferIntents: {},
    teamExitProgress: {},
    teamExitTombstones: {},
    dismissedCoachMarks: [],
    sessionEvictionToastCount: 0,
    openWorkspacePaths: [],
    lastActiveWorkspacePath: "",
    workspaceRestoreHealth: {},
    maxOpenWorkspacesLkg: MAX_OPEN_WORKSPACES,
  };
}

export interface GlobalStoreOptions {
  workingDirectory?: string;
  log?: (line: string) => void;
}

export interface GlobalChange {
  key: string;
  value: unknown;
}

/**
 * 缺的键用默认值补上；`config` 按字段补（老文件少了新加的设置项时，渲染层
 * 读到 undefined 会当成关闭）。
 */
function fillDefaults(stored: Record<string, unknown>, defaults: GlobalState): GlobalState {
  const out: Record<string, unknown> = { ...defaults, ...stored };
  if (isPlainObject(stored.config)) out.config = { ...defaults.config, ...stored.config };
  if (typeof out._version !== "number" || out._version < GLOBAL_STORAGE_VERSION) out._version = GLOBAL_STORAGE_VERSION;
  return out as GlobalState;
}

export class GlobalStore {
  private state: GlobalState;
  private readonly changed = new Emitter<GlobalChange>();
  readonly onDidChange: Event<GlobalChange> = this.changed.event;

  constructor(
    readonly file: string,
    private readonly opts: GlobalStoreOptions = {},
  ) {
    const defaults = globalDefaults(opts.workingDirectory);
    const read = readJsonFile<Record<string, unknown>>(file);
    if (read.kind === "ok" && isPlainObject(read.value)) {
      this.state = fillDefaults(read.value, defaults);
    } else {
      if (read.kind === "corrupt") opts.log?.(`全局存储损坏，已备份到 ${read.backup ?? "(备份失败)"}，按默认值重建`);
      this.state = defaults;
      this.flush();
    }
  }

  get<K extends keyof GlobalState>(key: K): GlobalState[K];
  get(key: string): unknown;
  get(key: string): unknown {
    return cloneJson(this.state[key]);
  }

  getAll(): GlobalState {
    return cloneJson(this.state);
  }

  /** 浅合并写入。 */
  set(key: string, value: unknown): void {
    const prev = this.state[key];
    const next = isPlainObject(prev) && isPlainObject(value) ? { ...prev, ...value } : value;
    this.write(key, next);
  }

  /** 覆盖写入。 */
  replace(key: string, value: unknown): void {
    this.write(key, value);
  }

  /** 读-改-写，便于调用方基于最新值计算。 */
  update<K extends keyof GlobalState>(key: K, fn: (prev: GlobalState[K]) => GlobalState[K]): void {
    this.write(key as string, fn(this.get(key)));
  }

  reset(): void {
    this.state = globalDefaults(this.opts.workingDirectory);
    this.flush();
    this.changed.fire({ key: "*", value: undefined });
  }

  private write(key: string, value: unknown): void {
    if (key === "_version") return;
    const copy = cloneJson(value);
    if (copy === undefined) delete this.state[key];
    else this.state[key] = copy;
    this.flush();
    this.changed.fire({ key, value: cloneJson(copy) });
  }

  private flush(): void {
    writeJsonAtomic(this.file, this.state);
  }
}
