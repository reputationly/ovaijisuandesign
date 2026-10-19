/**
 * v3 工作台的宿主服务：把一扇独立窗口嵌进主窗口，并管好它的生命周期。
 *
 * v3 不是一个单独的 BrowserWindow，而是 `WebContentsView` —— 它和主界面**共用一个窗口**，
 * 由主进程按主界面报上来的矩形摆位置。这么做的代价是：位置、可见性、焦点、遮挡
 * 全部得手动管，而且每一条都能出错（视图跑到窗口外面、盖住主界面的弹窗、抢走焦点）。
 *
 * 几条贯穿始终的约束：
 *
 * - **一切以 owner 为准**。同一时刻可能有多个资源帧，每个是一份独立的 `WebContentsView`；
 *   所有操作都先 `this.owners.get(ownerId)`，拿不到就什么也不做（不是抛错）——
 *   帧已经被释放是正常情况，不该让调用方看到异常。
 * - **三道闸决定「能不能用」**：`failed`（加载失败过）、`mediaRetired`（账号换过）、
 *   `visible`（主界面没在显示它）。`grantMedia` 的 `current()` 每一次都重查一遍，
 *   因为媒体传输可能持续几分钟。
 * - **导航一律禁止**。v3 页面只应该待在 `app://` 入口上，任何跳转、开新窗、挂 webview
 *   都被明确拒绝 —— 它是产物目录的消费者，不是浏览器。
 *
 * 上游用依赖注入装饰器装配（`@decorateParam`），我们仓库没有这套，改成构造函数显式传入。
 * 其余逻辑逐条照搬。
 */
import { randomUUID } from "node:crypto";
import { MessageChannelMain, session, WebContentsView, type BrowserWindow } from "electron";
import { Disposable, Emitter, type Event } from "../ipc/events.js";
import { isProjectResourceFrameBootstrap } from "@ov/host-contract";
import {
  V3_CSP,
  V3_PARTITION,
  V3_PRESENTATION_QUERY,
  mediaAccountScope,
  nativeWorkbenchEntry,
  validV3Owner,
  type V3AccountSnapshot,
  type V3PageOptions,
} from "./session.js";
import type { V3WorkbenchOptions } from "./host.js";
import type { MediaGrantInput, NativeWorkbenchMedia } from "./native-workbench-media.js";

/** 同时存在的资源帧上限。 */
const MAX_OWNERS = 64;

/** 资源帧与主进程之间的端口通道名。 */
const NATIVE_WORKBENCH_HOST_PORT = "hilo:v3-workbench:host-port";

/** owner 状态变化。 */
export interface WorkbenchStateChange {
  ownerId: string;
  state: "loading" | "ready" | "failed";
}

export interface WorkbenchBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Owner {
  view: Electron.WebContentsView;
  window: BrowserWindow;
  entry: string;
  bootstrap: Record<string, unknown> & { scopeKey: string };
  bounds?: WorkbenchBounds;
  visible: boolean;
  presented: boolean;
  connected: boolean;
  failed: boolean;
  mediaEpoch: number;
  mediaAccountScope: string | undefined;
  mediaRetired: boolean;
  /** 拆掉这帧挂在外面的所有监听。 */
  retire(): void;
}

/** 服务需要的外部能力。 */
export interface WorkbenchDeps {
  /** 主窗口（资源帧嵌在它里面）。 */
  homeWindow(): BrowserWindow | undefined;
  /** 产物读取与 preload 路径。 */
  options: V3WorkbenchOptions;
  /** 媒体代理。 */
  media: NativeWorkbenchMedia;
  /** 账号快照，用于算媒体作用域。 */
  accountSnapshot(): Promise<V3AccountSnapshot>;
  /** 账号变化订阅：变了就把已挂载帧的媒体授权标成作废。 */
  onAccountChange(listener: () => void): { dispose(): void };
}

export class NativeWorkbenchService extends Disposable {
  private readonly owners = new Map<string, Owner>();
  /** 当前生效的遮挡租约（弹窗、系统对话框等）。有租约时所有帧都不呈现。 */
  private readonly occlusions = new Set<string>();
  private assets?: Map<string, { body: Buffer; contentType: string }>;
  private configured = false;
  private accountRevision = 0;
  private readonly changes = this._register(new Emitter<WorkbenchStateChange>());

  /** owner 状态变化事件。 */
  readonly onDidChange: Event<WorkbenchStateChange> = this.changes.event;

  constructor(private readonly deps: WorkbenchDeps) {
    super();
    this._register(
      deps.onAccountChange(async () => {
        this.accountRevision += 1;
        try {
          const scope = mediaAccountScope(await deps.accountSnapshot());
          // 作用域变了（或没了）就把已有帧的媒体标成作废：旧帧手上的授权只在旧账号下成立
          for (const owner of this.owners.values()) {
            if (!scope || scope !== owner.mediaAccountScope) owner.mediaRetired = true;
          }
        } catch {
          // 拿不到快照时保守处理：全部标作废
          for (const owner of this.owners.values()) owner.mediaRetired = true;
        }
      }),
    );
  }

  /**
   * 配置隔离会话（幂等）。
   *
   * 产物在第一次配置时**一次性读进内存**：之后每个帧都从这份 map 取，
   * 既避免重复读盘，也保证同一进程生命周期里所有帧看到的是同一份产物。
   */
  private configureSession(): Electron.Session {
    const isolated = session.fromPartition(V3_PARTITION);
    if (this.configured) return isolated;
    this.assets = this.deps.options.loadBundle();

    isolated.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
    isolated.setPermissionCheckHandler(() => false);

    isolated.webRequest.onBeforeRequest((details, callback) => {
      try {
        const url = new URL(details.url);
        const owner = this.owners.get(url.hostname);
        callback({
          cancel: !(
            url.protocol === "app:" &&
            owner &&
            (url.pathname.startsWith("/media/")
              ? this.deps.media.allows(url, details.webContentsId)
              : this.assets?.has(decodeURIComponent(url.pathname).slice(1)))
          ),
        });
      } catch {
        callback({ cancel: true });
      }
    });

    isolated.protocol.handle("app", (request) => {
      try {
        const url = new URL(request.url);
        if (url.pathname.startsWith("/media/")) return this.deps.media.read(request);
        const asset =
          this.owners.has(url.hostname) &&
          (!url.search || (url.pathname === "/index.html" && url.search === V3_PRESENTATION_QUERY)) &&
          request.method === "GET"
            ? this.assets?.get(decodeURIComponent(url.pathname).slice(1))
            : undefined;
        if (!asset) return new Response("Not found", { status: 404 });
        return new Response(new Uint8Array(asset.body), {
          headers: {
            "Content-Type": asset.contentType,
            "Content-Security-Policy": V3_CSP,
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "no-store",
          },
        });
      } catch {
        return new Response("Invalid request", { status: 400 });
      }
    });

    this.configured = true;
    return isolated;
  }

  /**
   * 挂载一帧。
   *
   * 顺序是刻意的：**先把所有失败路径都接好，再挂视图、再导航**。反过来的话，
   * 加载期间发生的崩溃/跳转会在监听器装上之前溜掉，留下一扇白屏的窗。
   */
  async mount(ownerId: string, bootstrap: unknown, page?: V3PageOptions): Promise<void> {
    if (!validV3Owner(ownerId) || !isProjectResourceFrameBootstrap(bootstrap)) {
      throw new Error("Invalid native workbench binding");
    }
    const entry = nativeWorkbenchEntry(ownerId, page);
    if (this.owners.has(ownerId)) throw new Error("Native workbench owner already exists");
    if (this.owners.size >= MAX_OWNERS) throw new Error("Native workbench capacity reached");

    const accountRevision = this.accountRevision;
    const accountScope = mediaAccountScope(await this.deps.accountSnapshot());
    if (this.isDisposed || this.owners.size >= MAX_OWNERS) throw new Error("Native workbench unavailable");
    if (this.owners.has(ownerId)) throw new Error("Native workbench owner already exists");

    const window = this.deps.homeWindow();
    if (!window || window.isDestroyed()) throw new Error("Desktop window unavailable");

    const view = new WebContentsView({
      webPreferences: {
        session: this.configureSession(),
        preload: this.deps.options.preload,
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
        webSecurity: true,
        webviewTag: false,
      },
    });
    // 先不可见：位置和尺寸要等主界面报上来
    view.setVisible(false);

    const parent = window.webContents;
    const retire = () => {
      this.occlusions.clear();
      void this.release(ownerId);
    };
    // 主界面一旦开始导航/崩溃/关窗，这帧就没有宿主了，必须一起走
    const navigate = (event: Electron.Event & { isMainFrame?: boolean; isSameDocument?: boolean }) => {
      if (event.isMainFrame && !event.isSameDocument) retire();
    };

    const owner: Owner = {
      view,
      window,
      entry,
      // 深拷贝一份：调用方之后改它不该影响这帧
      bootstrap: structuredClone(bootstrap) as Owner["bootstrap"],
      visible: false,
      presented: false,
      connected: false,
      failed: false,
      mediaEpoch: 0,
      mediaAccountScope: accountScope,
      mediaRetired: !accountScope || this.accountRevision !== accountRevision,
      retire: () => {
        parent.removeListener("did-start-navigation", navigate);
        parent.removeListener("render-process-gone", retire);
        window.removeListener("closed", retire);
      },
    };
    this.owners.set(ownerId, owner);
    parent.on("did-start-navigation", navigate);
    parent.on("render-process-gone", retire);
    window.on("closed", retire);

    const fail = () => {
      // 已经被释放的帧不再报失败，否则会往一个没有 owner 的 id 上发事件
      if (this.owners.get(ownerId) !== owner) return;
      owner.failed = true;
      this.deps.media.revoke(ownerId);
      owner.visible = false;
      this.present(owner);
      this.changes.fire({ ownerId, state: "failed" });
    };

    // 这扇窗口只消费 `app://` 上的产物，任何形式的导航都拒绝
    view.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    view.webContents.on("will-navigate", (event) => event.preventDefault());
    view.webContents.on("will-frame-navigate", ((event: Electron.Event) => event.preventDefault()) as never);
    view.webContents.on("will-attach-webview", ((event: Electron.Event) => event.preventDefault()) as never);
    view.webContents.on("render-process-gone", fail);
    view.webContents.on("did-fail-load", fail);
    view.webContents.on("did-start-navigation", (event) => {
      // 连上之后再跳就是异常
      if (owner.connected && event.isMainFrame && !event.isSameDocument) fail();
    });
    view.webContents.on("did-finish-load", () => {
      // 路由 hash 是页面自己的导航状态，只要求文档部分对得上
      if (
        this.owners.get(ownerId) !== owner ||
        owner.failed ||
        owner.connected ||
        view.webContents.mainFrame.url.split("#")[0] !== entry.split("#")[0]
      ) {
        return;
      }
      owner.connected = true;
      const documentId = randomUUID();
      const channel = new MessageChannelMain();
      try {
        // 端口分两半：主进程留一半，另一半随引导消息交给页面
        parent.mainFrame.postMessage(NATIVE_WORKBENCH_HOST_PORT, { ownerId, documentId }, [channel.port1]);
        view.webContents.mainFrame.postMessage(bootstrap as never, structuredClone(bootstrap), [channel.port2]);
      } catch {
        channel.port1.close();
        channel.port2.close();
        fail();
        return;
      }
      this.changes.fire({ ownerId, state: "ready" });
    });

    window.contentView.addChildView(view);
    this.changes.fire({ ownerId, state: "loading" });
    try {
      await view.webContents.loadURL(entry);
    } catch (error) {
      fail();
      throw error;
    }
  }

  /**
   * 主界面报位置。
   *
   * 不可见时顺手把媒体撤掉：视图被藏起来却还在传视频，是在浪费带宽和账号配额。
   */
  async layout(ownerId: string, bounds: WorkbenchBounds, visible: boolean): Promise<void> {
    const owner = this.owners.get(ownerId);
    if (!owner) return;
    if (
      !bounds ||
      !["x", "y", "width", "height"].every(
        (key) => typeof (bounds as unknown as Record<string, unknown>)[key] === "number" && Number.isFinite((bounds as unknown as Record<string, unknown>)[key]) && Math.abs((bounds as unknown as Record<string, unknown>)[key] as number) <= 1e5,
      ) ||
      typeof visible !== "boolean"
    ) {
      throw new Error("Invalid native bounds");
    }
    if (!visible) {
      owner.mediaEpoch += 1;
      this.deps.media.revoke(ownerId);
    }
    owner.bounds = bounds;
    owner.visible = visible;
    this.present(owner);
  }

  /**
   * 按矩形与状态把视图摆好。
   *
   * `scale` 是主界面的缩放：v3 视图是**另一个 webContents**，不会自动跟着主界面缩放，
   * 所以矩形和它自己的 zoomFactor 都要按同一个比例换算，否则两边的界面大小对不上。
   */
  present(owner: Owner): void {
    if (owner.window.isDestroyed() || owner.view.webContents.isDestroyed()) return;
    const b = owner.bounds;
    const screen = owner.window.getContentBounds();
    const scale = owner.window.webContents.getZoomFactor();
    if (b) {
      const x = Math.max(0, Math.round(b.x * scale));
      const y = Math.max(0, Math.round(b.y * scale));
      owner.view.setBounds({
        x,
        y,
        // 夹到窗口内：主界面报来的矩形可能超出内容区（比如窗口刚被缩小）
        width: Math.max(0, Math.min(Math.round(b.width * scale), screen.width - x)),
        height: Math.max(0, Math.min(Math.round(b.height * scale), screen.height - y)),
      });
      owner.view.webContents.setZoomFactor(scale);
    }
    const presented = Boolean(b && b.width > 0 && b.height > 0 && owner.visible && !owner.failed && this.occlusions.size === 0);
    const hadFocus = owner.presented && owner.view.webContents.isFocused();
    owner.view.setVisible(presented);
    // 焦点要交接：藏起来时把焦点还给主界面，露出来时拿到自己身上。
    // 不还的话，主界面上的输入框会收不到键盘输入（焦点还在一个不可见的视图上）。
    if (!presented && hadFocus) owner.window.webContents.focus();
    if (presented && !owner.presented) owner.view.webContents.focus();
    owner.presented = presented;
  }

  /**
   * 申请/释放一次遮挡租约。
   *
   * 用租约而不是布尔值，是因为遮挡来源可能重叠（弹窗套弹窗）：谁先释放都不该误放行，
   * 必须等最后一个租约也放掉。
   */
  async setOccluded(token: string, occluded: boolean): Promise<void> {
    if (typeof token !== "string" || token.length > 128 || !token || typeof occluded !== "boolean") {
      throw new Error("Invalid occlusion lease");
    }
    if (occluded) this.occlusions.add(token);
    else this.occlusions.delete(token);
    for (const owner of this.owners.values()) this.present(owner);
  }

  /** 签发媒体授权。`current()` 会被媒体层反复调用，所以每次都重新查一遍。 */
  async grantMedia(ownerId: string, scopeKey: string, request: MediaGrantInput, requestId: string) {
    if (typeof requestId !== "string") throw new Error("MEDIA_INVALID_REQUEST");
    const owner = this.owners.get(ownerId);
    if (!owner || owner.failed || owner.mediaRetired || !owner.visible || owner.bootstrap.scopeKey !== scopeKey) {
      throw new Error("MEDIA_SCOPE_RETIRED");
    }
    const epoch = owner.mediaEpoch;
    return this.deps.media.grant(
      {
        id: ownerId,
        webContentsId: owner.view.webContents.id,
        scopeKey,
        current: () =>
          this.owners.get(ownerId) === owner &&
          !owner.failed &&
          !owner.mediaRetired &&
          owner.visible &&
          owner.mediaEpoch === epoch &&
          !owner.view.webContents.isDestroyed(),
      },
      request,
      requestId,
    );
  }

  async cancelMediaGrant(ownerId: string, scopeKey: string, requestId: string): Promise<void> {
    const owner = this.owners.get(ownerId);
    if (!owner || owner.bootstrap.scopeKey !== scopeKey) return;
    this.deps.media.cancelGrant({ id: ownerId, scopeKey, webContentsId: owner.view.webContents.id }, requestId);
  }

  async release(ownerId: string): Promise<void> {
    const owner = this.owners.get(ownerId);
    if (!owner) return;
    // 先摘出去再收尾：收尾过程中触发的事件不该再看到一个仍然"在册"的 owner
    this.owners.delete(ownerId);
    this.deps.media.revoke(ownerId);
    owner.retire();
    if (!owner.window.isDestroyed()) owner.window.contentView.removeChildView(owner.view);
    if (!owner.view.webContents.isDestroyed()) owner.view.webContents.close({ waitForBeforeUnload: false });
  }

  override dispose(): void {
    for (const id of this.owners.keys()) void this.release(id);
    this.occlusions.clear();
    super.dispose();
  }
}
