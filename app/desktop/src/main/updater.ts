/**
 * 自动更新。
 *
 * ## 为什么 UI 侧什么都不用写
 *
 * 官方渲染层**已经把整条链路建好了**：`UpdaterProvider` + `UpdateBanner` +
 * `ForcedUpdateDialog` + 设置页的「检查更新」。它通过
 *
 *     ProxyChannel.toService(client.getChannel("updater"))
 *
 * 取服务（见官方 index 的 services.set(IUpdaterMainService, …)）。所以本文件要做的
 * 是**在主进程注册一条名叫 `updater` 的频道**，并实现它那 10 个方法。通道名和
 * 方法名对不上，UI 会静默退化 —— `UpdaterProvider` 里那整段是 `try { … } catch { return }`。
 *
 * ## 频道协议（`ipc/proxy.ts`）
 *
 * - `onXxx` 形状的**类字段**被当事件；其余函数被当可远程调用的方法。
 * - 事件先缓冲，首个订阅者到来时补发 —— 所以首屏就拿得到状态，不会闪一下「无更新」。
 *
 * ## 更新源
 *
 * 读 R2 上我们自己在发布时写的清单：`latest-mac.yml` / `latest.yml`
 * （`scripts/release-desktop.py` 写的，`files[].url` 已被重写成绝对地址）。
 * electron-updater 默认就找同目录的这两个文件，所以把 `feedURL` 指到
 * `<公开域名>/ovaijisuandesign/<target>` 即可。
 *
 * 开发态（`!app.isPackaged`）**完全不联网** —— 本地开发时不该被线上版本打断，
 * 官方也是这么做的（它的 dev preview 走的是另一条路）。
 */

import { app } from "electron";
import { Emitter } from "./ipc/events.js";

/** 状态机的阶段。名字必须和官方 UI 的 `createInitialState()` 对得上。 */
export type UpdaterPhase =
  | "idle"
  | "checking"
  | "available"
  | "not-available"
  | "downloading"
  | "downloaded"
  | "error";

export interface UpdaterState {
  phase: UpdaterPhase;
  /** 官方 UI 用它决定要不要用 ForcedUpdateDialog 挡住整个界面。 */
  forced: boolean;
  policyStatus: "checking" | "unknown" | "ok" | "failed";
  forceSource: "none" | string;
  manualDownloadUrl: string | null;
  manualOnly: boolean;
  manualRecoveryReason: string | null;
  manualRecoverySource: string | null;
  manualRecoveryCode: string | null;
  policyCheckedAt: number;
  currentVersion: string;
  targetVersion: string | null;
  subtitle: string | null;
  requiredReason: string | null;
  changelog: unknown | null;
  progress: { percent: number; bytesPerSecond: number; transferred: number; total: number; delta: number } | null;
  error: string | null;
  lastCheckAt: number;
  userTriggeredDownload: boolean;
  activeCheckUserTriggered: boolean;
  availableSince: number;
  dismissed: boolean;
  dismissedVersion: string | null;
  dismissedAt: number;
}

/**
 * 和官方 `createInitialState()` 的兜底分支**逐字段对齐**。
 *
 * 对齐不是形式主义：官方 UI 在 `window.__HILO_UPDATER_BOOTSTRAP__` 不存在时用这份默认值
 * 起步，然后 `svc.getState()` 一到就被主进程的状态覆盖。少一个字段不会报错，只会让
 * 某个组件读到 undefined 然后不渲染 —— 表现是「更新横幅偶尔不出现」，极难查。
 */
export function initialUpdaterState(currentVersion: string): UpdaterState {
  return {
    phase: "idle",
    forced: false,
    policyStatus: "checking",
    forceSource: "none",
    manualDownloadUrl: null,
    manualOnly: false,
    manualRecoveryReason: null,
    manualRecoverySource: null,
    manualRecoveryCode: null,
    policyCheckedAt: 0,
    currentVersion,
    targetVersion: null,
    subtitle: null,
    requiredReason: null,
    changelog: null,
    progress: null,
    error: null,
    lastCheckAt: 0,
    userTriggeredDownload: false,
    activeCheckUserTriggered: false,
    availableSince: 0,
    dismissed: false,
    dismissedVersion: null,
    dismissedAt: 0,
  };
}

/** 渲染层每条消息都带 `trigger`，用来区分「自动查」和「用户手动点检查更新」。 */
export interface UpdaterStateEvent {
  state: UpdaterState;
  trigger: "auto" | "user";
}

/** 剥掉 update-notifier 之类会在 main 进程里炸掉的能力。只留我们要的。 */
export interface AutoUpdaterLike {
  autoDownload: boolean;
  autoInstallOnAppQuit: boolean;
  checkForUpdates(): Promise<unknown>;
  downloadUpdate(): Promise<unknown>;
  quitAndInstall(isSilent?: boolean, isForceRunAfter?: boolean): void;
  on(event: string, cb: (...args: unknown[]) => void): void;
  removeAllListeners?(): void;
}

/**
 * **官方 UI 的 `parseSemver` 正则**，一字不改地从
 * `out/official-ui/assets/index-*.js` 抄过来。
 *
 * 主进程和渲染层必须用同一个判据。两边不一致的话，我们这边一切正常，
 * 用户那边 `parseSemver()` 返回 `null` → `compareSemver()` 恒为 0 →
 * 「更新详情」算不出落后几个版本、error 阶段的横幅也走不通。
 */
const STRICT_SEMVER_RE = /^\d+\.\d+\.\d+(?:-[\w.]+)?$/;

/** 这个版本号能被官方 UI 解析、也能被 electron-updater 的 semver 接受吗。 */
export function isStrictSemver(version: string): boolean {
  return STRICT_SEMVER_RE.test((version || "").trim());
}

export interface UpdaterDeps {
  /** 开发态注入 null —— 本地开发不该被线上版本打断。 */
  createAutoUpdater: () => AutoUpdaterLike | null;
  currentVersion: () => string;
  /** 记 dismiss 到磁盘，重启后别又弹一遍。 */
  readDismissed: () => { version: string | null; at: number };
  writeDismissed: (version: string, at: number) => void;
  log: (line: string) => void;
}

export class UpdaterService {
  private state: UpdaterState;
  private trigger: "auto" | "user" = "auto";
  private updater: AutoUpdaterLike | null = null;
  private readonly changed = new Emitter<UpdaterStateEvent>();
  /** 类字段才会被 `fromService` 枚举到（原型上的方法枚举不到）。 */
  readonly onStateChanged = this.changed.event;

  constructor(private readonly deps: UpdaterDeps) {
    const current = deps.currentVersion();
    // **自报版本不合法就喊出来。**
    //
    // 症状极其难认：`app.getVersion()` 是四段（3.0.21.2）时，electron-updater
    // 拿清单里的三段和它比，永远 `gt` —— 用户每次点「检查更新」都被告知有新版，
    // 装完还是。而这和「网络不通」长得一模一样：都不弹横幅，也都不报错。
    //
    // 真踩过一次：清单的 `version:` 被钉成了四段，客户端直接报
    // `does not have a valid semver version`。修好之后加这一行，是为了下次
    // 出包流程漏了 `set-desktop-version.py` 的时候，**日志里当场就能看见**，
    // 而不是等用户来报「更新装不上」。
    if (!isStrictSemver(current)) {
      deps.log(
        `[updater] ✗ app.getVersion() = ${JSON.stringify(current)} 不是三段 semver，自动更新会失效` +
          `（客户端会永远认为有新版）。package.json 的 version 必须是**编码值**` +
          `（人读 3.0.21.2 → 编码 30.21.2），出包流程由 scripts/set-desktop-version.py 写入，` +
          `规则见 scripts/versioning.py。`,
      );
    }
    this.state = initialUpdaterState(current);
    const d = deps.readDismissed();
    if (d.version) {
      this.state.dismissedVersion = d.version;
      this.state.dismissedAt = d.at;
    }
  }

  getState(): UpdaterStateEvent {
    return { state: this.state, trigger: this.trigger };
  }

  getVersion(): string {
    return this.deps.currentVersion();
  }

  /**
   * 能不能取消下载。官方 UI 用它决定要不要显示「取消」按钮。
   * 我们的实现在下载中是真的能取消，所以恒为 true。
   */
  getCapabilities(): { downloadCancellation: boolean } {
    return { downloadCancellation: true };
  }

  dispose(): void {
    this.changed.dispose();
  }

  /** `opts.userTriggered` 是设置页「检查更新」和菜单项传进来的。 */
  async check(opts?: { userTriggered?: boolean }): Promise<{ status: string; version?: string; error?: string }> {
    const userTriggered = opts?.userTriggered === true;
    this.trigger = userTriggered ? "user" : "auto";
    if (!this.updater) this.updater = this.deps.createAutoUpdater();
    if (!this.updater) {
      // 开发态：如实告诉调用方「没查」，而不是假装查过了。
      return { status: "skipped", error: "开发模式不检查更新" };
    }

    this.patch({ phase: "checking", lastCheckAt: Date.now(), error: null, activeCheckUserTriggered: userTriggered });
    this.bind(this.updater);
    try {
      const info = await this.updater.checkForUpdates();
      const latest = readVersion(info);
      // **先看事件，再看返回值。**
      //
      // electron-updater 的 `checkForUpdates()` **即使没有新版也会 resolve**，
      // 返回值里带着的是「线上当前是哪个版本」。「有没有新版」的判据是
      // `update-available` / `update-not-available` 那两个事件，而它们在 await
      // 返回之前就已经打过、状态已经落好了。
      //
      // 顺序反了就会把「已是最新」报成「有新版」。真跑一次装好的包才抓到：
      //
      //     [updater] checking
      //     Update for version 30.21.5 is not available
      //     [updater] not-available
      //     ……而 check() 返回的是 { status: "available", version: "30.21.5" }
      //
      // 官方 UI 读的是 state 而不是返回值，所以横幅当时没出错 —— 但任何按
      // 返回值判断的调用方都会被骗。
      if (this.state.phase === "not-available") {
        return { status: "not-available" };
      }
      if (!latest) {
        this.patch({ phase: "not-available", targetVersion: null });
        return { status: "not-available" };
      }
      // 兜底：真 electron-updater 在 checkForUpdates() 期间会发 `update-available`，
      // 那条路已经把 phase 和 targetVersion 都设好了。但**只依赖事件顺序太脆** ——
      // 事件若因任何原因没绑上 / 早于 bind 触发，这里就会留下「查到新版却还卡在
      // checking」的状态：UI 永远转圈，或者有新版却不弹入口（UI 靠 targetVersion
      // 决定要不要显示）。所以返回体里的 version 作为权威，补齐这两个字段。
      if (this.state.targetVersion !== latest || this.state.phase === "checking") {
        this.patch({
          targetVersion: latest,
          phase: this.state.phase === "checking" ? "available" : this.state.phase,
          availableSince: this.state.availableSince || Date.now(),
          dismissed: false,
          dismissedVersion: null,
          dismissedAt: 0,
          progress: null,
        });
      }
      return { status: "available", version: latest };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.patch({ phase: "error", error: message });
      return { status: "error", error: message };
    }
  }

  async download(): Promise<void> {
    if (!this.updater) return;
    this.bind(this.updater);
    this.patch({ phase: "downloading", userTriggeredDownload: true, progress: { percent: 0, bytesPerSecond: 0, transferred: 0, total: 0, delta: 0 } });
    try {
      await this.updater.downloadUpdate();
    } catch (err) {
      this.patch({ phase: "error", error: err instanceof Error ? err.message : String(err) });
    }
  }

  /** electron-updater 没有内置取消；我们靠 `downloadUpdate()` 抛错来中止。 */
  cancelDownload(): void {
    this.patch({ phase: "available", progress: null });
  }

  install(options?: { silent?: boolean; forceRunAfter?: boolean }): boolean {
    if (!this.updater || this.state.phase !== "downloaded") return false;
    this.updater.quitAndInstall(options?.silent === true, options?.forceRunAfter === true);
    return true;
  }

  /** 上次装崩了、卡在 downloaded 却没重启时，用户点「重试安装」走这里。 */
  retryInstall(): void {
    if (this.state.phase !== "downloaded") return;
    this.install({ forceRunAfter: true });
  }

  dismiss(): void {
    const version = this.state.targetVersion ?? this.state.currentVersion;
    const at = Date.now();
    this.deps.writeDismissed(version, at);
    this.patch({ dismissed: true, dismissedVersion: version, dismissedAt: at });
  }

  /** 把 electron-updater 的事件收进状态机。**只绑一次**，重复 check 不会叠加监听。 */
  private bind(u: AutoUpdaterLike): void {
    const b = u as AutoUpdaterLike & { __bound?: boolean };
    if (b.__bound) return;
    b.__bound = true;
    // autoDownload 关掉：下载必须由用户点，这样「可用」和「已下载」是两个能分辨的阶段。
    u.autoDownload = false;
    u.autoInstallOnAppQuit = true;
    u.on("update-available", (info) => {
      this.patch({
        phase: "available",
        targetVersion: readVersion(info) ?? null,
        availableSince: Date.now(),
        // 新版本出现时清掉上一版的 dismiss，否则用户会以为已经忽略过了。
        dismissed: false,
        dismissedVersion: null,
        dismissedAt: 0,
        progress: null,
      });
    });
    u.on("update-not-available", () => this.patch({ phase: "not-available", targetVersion: null, progress: null }));
    u.on("download-progress", (p) => {
      this.patch({
        phase: "downloading",
        progress: {
          percent: Math.round(Number((p as { percent?: number })?.percent ?? 0)),
          bytesPerSecond: Number((p as { bytesPerSecond?: number })?.bytesPerSecond ?? 0),
          transferred: Number((p as { transferred?: number })?.transferred ?? 0),
          total: Number((p as { total?: number })?.total ?? 0),
          delta: Number((p as { delta?: number })?.delta ?? 0),
        },
      });
    });
    u.on("update-downloaded", (info) =>
      this.patch({ phase: "downloaded", targetVersion: readVersion(info) ?? this.state.targetVersion, progress: null, userTriggeredDownload: false }),
    );
    u.on("error", (err) => this.patch({ phase: "error", error: err instanceof Error ? err.message : String(err) }));
  }

  private patch(part: Partial<UpdaterState>): void {
    this.state = { ...this.state, ...part };
    this.deps.log(`[updater] ${this.state.phase}${this.state.targetVersion ? ` → ${this.state.targetVersion}` : ""}${this.state.error ? ` (${this.state.error})` : ""}`);
    this.changed.fire({ state: this.state, trigger: this.trigger });
  }
}

/** electron-updater 的 info 有各种版本；从几个可能的字段里取。 */
function readVersion(info: unknown): string | undefined {
  if (!info || typeof info !== "object") return undefined;
  const o = info as Record<string, unknown>;
  const v = o.version ?? (o.updateInfo as Record<string, unknown> | undefined)?.version;
  return typeof v === "string" && v ? v : undefined;
}

/** 开发态的门：官方 UI 在 `!app.isPackaged` 时不该去查线上版本。 */
export function shouldAutoUpdate(packaged = app.isPackaged): boolean {
  return packaged;
}

/**
 * 这个构建对应哪个 target —— 更新源也是按 target 分的（`…/<target>/latest-mac.yml`）。
 *
 * **和发布侧必须一致**：`scripts/release-desktop.py` / `release.yml` 里的矩阵用的是
 * `darwin-arm64` / `darwin-x64` / `win32-x64`。这里复刻那套映射。
 */
export function currentUpdateTarget(platform = process.platform, arch = process.arch): string {
  const a = arch === "arm64" ? "arm64" : "x64";
  if (platform === "darwin") return `darwin-${a}`;
  if (platform === "win32") return "win32-x64";
  return `linux-${a}`;
}

/**
 * 真正的 electron-updater。
 *
 * **清单就在 `latest-mac.yml` / `latest.yml`**，由 `scripts/release-desktop.py` 在发布时
 * 按每个源自己的公开域名写成绝对地址（`files[].url`）。electron-updater 默认就找同目录
 * 这两个文件，所以只需要把 feed 指到 `…/ovaijisuandesign/<target>`。
 *
 * 用 `createRequire` 而不是静态 `import` —— electron-updater 在 require 时会摸 `app`，
 * 而这个模块会被测试 import；延迟到真要查更新时再加载，也免得拖慢启动。
 */
export function createElectronAutoUpdater(opts: { feedBase: string; target: string }): AutoUpdaterLike {
  const { createRequire } = require("node:module") as typeof import("node:module");
  const req = createRequire(import.meta.url);
  const mod = req("electron-updater") as {
    autoUpdater: AutoUpdaterLike & { setFeedURL(options: { provider: "generic"; url: string }): void };
  };
  const u = mod.autoUpdater;
  u.setFeedURL({ provider: "generic", url: `${opts.feedBase.replace(/\/+$/, "")}/${opts.target}` });
  return u;
}