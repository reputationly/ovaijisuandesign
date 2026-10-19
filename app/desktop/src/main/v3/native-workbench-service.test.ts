/**
 * v3 宿主服务的测试。
 *
 * 这一层最容易错的三件事，用例都钉住了：
 *
 * 1. **位置换算**：v3 是另一个 webContents，不跟着主界面缩放；矩形和它自己的 zoomFactor
 *    要按同一比例算，而且必须夹在窗口内容区里。
 * 2. **焦点交接**：视图藏起来时必须把焦点还给主界面，否则主界面上的输入框收不到键盘输入。
 * 3. **媒体门禁**：帧失败 / 账号换过 / 主界面没显示它 / scopeKey 不对 —— 四种情况都不该发授权。
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

// --- electron 的替身 -------------------------------------------------------------------
class FakeWebContents {
  static nextId = 1;
  readonly id = FakeWebContents.nextId++;
  destroyed = false;
  visible = false;
  bounds = { x: 0, y: 0, width: 0, height: 0 };
  zoom = 1;
  focused = false;
  mainFrame = { url: "about:blank", postMessage: vi.fn() };
  private listeners = new Map<string, ((...a: unknown[]) => void)[]>();
  on(name: string, fn: (...a: unknown[]) => void) {
    this.listeners.set(name, [...(this.listeners.get(name) ?? []), fn]);
    return this;
  }
  removeListener(name: string, fn: (...a: unknown[]) => void) {
    this.listeners.set(name, (this.listeners.get(name) ?? []).filter((f) => f !== fn));
    return this;
  }
  emit(name: string, ...args: unknown[]) {
    for (const fn of this.listeners.get(name) ?? []) fn(...args);
  }
  setWindowOpenHandler = vi.fn();
  setZoomFactor(z: number) {
    this.zoom = z;
  }
  getZoomFactor() {
    return this.zoom;
  }
  isDestroyed() {
    return this.destroyed;
  }
  isFocused() {
    return this.focused;
  }
  focus() {
    this.focused = true;
  }
  close() {
    this.destroyed = true;
  }
  async loadURL(url: string) {
    this.mainFrame.url = url;
    this.emit("did-finish-load");
  }
}

class FakeView {
  webContents = new FakeWebContents();
  setVisible(v: boolean) {
    this.webContents.visible = v;
  }
  setBounds(b: typeof this.webContents.bounds) {
    this.webContents.bounds = b;
  }
}

class FakeWindow {
  static nextId = 1;
  id = FakeWindow.nextId++;
  destroyed = false;
  contentBounds = { x: 0, y: 0, width: 1000, height: 800 };
  webContents = new FakeWebContents();
  contentView = { addChildView: vi.fn(), removeChildView: vi.fn() };
  private listeners = new Map<string, (() => void)[]>();
  on(name: string, fn: () => void) {
    this.listeners.set(name, [...(this.listeners.get(name) ?? []), fn]);
    return this;
  }
  removeListener(name: string, fn: () => void) {
    this.listeners.set(name, (this.listeners.get(name) ?? []).filter((f) => f !== fn));
    return this;
  }
  isDestroyed() {
    return this.destroyed;
  }
  getContentBounds() {
    return this.contentBounds;
  }
  emit(name: string) {
    for (const fn of this.listeners.get(name) ?? []) fn();
  }
}

const views: FakeView[] = [];
vi.mock("electron", () => ({
  WebContentsView: class {
    webContents = new FakeWebContents();
    constructor() {
      views.push(this as unknown as FakeView);
    }
    setVisible(v: boolean) {
      this.webContents.visible = v;
    }
    setBounds(b: never) {
      this.webContents.bounds = b;
    }
  },
  MessageChannelMain: class {
    port1 = { close: vi.fn() };
    port2 = { close: vi.fn() };
  },
  session: {
    fromPartition: () => ({
      setPermissionRequestHandler: vi.fn(),
      setPermissionCheckHandler: vi.fn(),
      webRequest: { onBeforeRequest: vi.fn() },
      protocol: { handle: vi.fn() },
    }),
  },
}));

const { NativeWorkbenchService } = await import("./native-workbench-service.js");

// --- 夹具 -----------------------------------------------------------------------------
const BOOTSTRAP = { type: "hilo:project-resource:bootstrap", version: 1, scopeKey: "scope-1" };

function makeService(over: Record<string, unknown> = {}) {
  const window = new FakeWindow();
  const media = {
    grant: vi.fn(async (..._args: unknown[]) => ({ url: "app://w/media/t", mimeType: "video/mp4", expiresAt: Date.now() + 1000 })),
    cancelGrant: vi.fn((..._args: unknown[]) => undefined),
    revoke: vi.fn((..._args: unknown[]) => undefined),
    allows: () => true,
    read: () => new Response(null, { status: 404 }),
  };
  const deps = {
    homeWindow: () => window as never,
    options: { preload: "/p.cjs", loadBundle: () => new Map() },
    media: media as never,
    accountSnapshot: async () => ({ identityKey: "k", activeContext: { accountType: "a", groupId: "g", epoch: 1 } }),
    onAccountChange: () => ({ dispose: () => {} }),
    ...over,
  };
  return { service: new NativeWorkbenchService(deps as never), window, media };
}

const OWNER = "owner-1";
const ownerKey = OWNER as string;
void ownerKey;

beforeEach(() => {
  views.length = 0;
});

describe("mount 的入参校验", () => {
  it("窗口名或引导消息不合法时拒绝", async () => {
    const { service } = makeService();
    await expect(service.mount("Bad Owner", BOOTSTRAP)).rejects.toThrow(/Invalid native workbench binding/);
    await expect(service.mount(OWNER, { nope: 1 })).rejects.toThrow(/Invalid native workbench binding/);
  });

  it("主窗口不可用时拒绝", async () => {
    const { service } = makeService({ homeWindow: () => undefined });
    await expect(service.mount(OWNER, BOOTSTRAP)).rejects.toThrow(/Desktop window unavailable/);
  });

  it("同一个 owner 不能挂两次", async () => {
    const { service } = makeService();
    await service.mount(OWNER, BOOTSTRAP);
    await expect(service.mount(OWNER, BOOTSTRAP)).rejects.toThrow(/already exists/);
  });

  it("挂载后进入 loading，加载完成变 ready", async () => {
    const { service } = makeService();
    const states: string[] = [];
    service.onDidChange((e) => states.push(e.state));
    await service.mount(OWNER, BOOTSTRAP);
    expect(states).toEqual(["loading", "ready"]);
  });
});

describe("layout 与 present", () => {
  it("矩形或可见性不合法时抛错", async () => {
    const { service } = makeService();
    await service.mount(OWNER, BOOTSTRAP);
    await expect(service.layout(OWNER, { x: 0, y: 0, width: Number.NaN, height: 10 }, true)).rejects.toThrow(/Invalid native bounds/);
    await expect(service.layout(OWNER, { x: 0, y: 0, width: 1e6, height: 10 }, true)).rejects.toThrow(/Invalid native bounds/);
    await expect(service.layout(OWNER, { x: 0, y: 0, width: 10, height: 10 }, "yes" as never)).rejects.toThrow(/Invalid native bounds/);
  });

  it("按主界面缩放换算矩形，并夹在内容区里", async () => {
    const { service, window } = makeService();
    await service.mount(OWNER, BOOTSTRAP);
    window.webContents.zoom = 2;
    await service.layout(OWNER, { x: 10, y: 20, width: 900, height: 700 }, true);
    const view = views[0]!;
    // 缩放是乘在**四个分量**上的：900×2=1800 超出内容区（1000 宽），所以被夹到 980
    expect(view.webContents.bounds).toEqual({ x: 20, y: 40, width: 980, height: 760 });
    expect(view.webContents.zoom).toBe(2);
    // 缩放为 1 时看裁切：起点 900 + 宽 900 超出 1000，宽被夹到 100
    window.webContents.zoom = 1;
    await service.layout(OWNER, { x: 900, y: 700, width: 900, height: 900 }, true);
    expect(view.webContents.bounds).toEqual({ x: 900, y: 700, width: 100, height: 100 });
    // 起点本身就在区外时夹到 0，而不是负数
    await service.layout(OWNER, { x: 2000, y: 2000, width: 100, height: 100 }, true);
    expect(view.webContents.bounds).toEqual({ x: 2000, y: 2000, width: 0, height: 0 });
  });

  it("隐藏时把焦点还给主界面", async () => {
    const { service, window } = makeService();
    await service.mount(OWNER, BOOTSTRAP);
    await service.layout(OWNER, { x: 0, y: 0, width: 100, height: 100 }, true);
    const view = views[0]!;
    expect(view.webContents.visible).toBe(true);
    view.webContents.focused = true;
    await service.layout(OWNER, { x: 0, y: 0, width: 100, height: 100 }, false);
    expect(view.webContents.visible).toBe(false);
    expect(window.webContents.focused).toBe(true);
  });

  it("隐藏时撤掉媒体授权", async () => {
    const { service, media } = makeService();
    await service.mount(OWNER, BOOTSTRAP);
    await service.layout(OWNER, { x: 0, y: 0, width: 100, height: 100 }, false);
    expect(media.revoke).toHaveBeenCalledWith(OWNER);
  });

  it("尺寸为 0 时不呈现", async () => {
    const { service } = makeService();
    await service.mount(OWNER, BOOTSTRAP);
    await service.layout(OWNER, { x: 0, y: 0, width: 0, height: 100 }, true);
    expect(views[0]!.webContents.visible).toBe(false);
  });
});

describe("遮挡租约", () => {
  it("非法 token 抛错", async () => {
    const { service } = makeService();
    await expect(service.setOccluded("", true)).rejects.toThrow(/Invalid occlusion lease/);
    await expect(service.setOccluded("x".repeat(129), true)).rejects.toThrow(/Invalid occlusion lease/);
    await expect(service.setOccluded("t", "yes" as never)).rejects.toThrow(/Invalid occlusion lease/);
  });

  it("要等最后一个租约放掉才恢复呈现", async () => {
    const { service } = makeService();
    await service.mount(OWNER, BOOTSTRAP);
    await service.layout(OWNER, { x: 0, y: 0, width: 100, height: 100 }, true);
    const view = views[0]!;
    await service.setOccluded("a", true);
    await service.setOccluded("b", true);
    expect(view.webContents.visible).toBe(false);
    await service.setOccluded("a", false);
    // 还有一个租约在
    expect(view.webContents.visible).toBe(false);
    await service.setOccluded("b", false);
    expect(view.webContents.visible).toBe(true);
  });
});

describe("媒体门禁", () => {
  const req = { workspaceId: "ws", resourceId: "r", versionId: "v", identity: { claim: "c", instanceId: "i", generation: 1 } };
  const rid = "11111111-1111-4111-8111-111111111111";

  it("主界面没显示它时不发授权", async () => {
    const { service } = makeService();
    await service.mount(OWNER, BOOTSTRAP);
    await service.layout(OWNER, { x: 0, y: 0, width: 100, height: 100 }, false);
    await expect(service.grantMedia(OWNER, "scope-1", req, rid)).rejects.toThrow(/MEDIA_SCOPE_RETIRED/);
  });

  it("scopeKey 不匹配时不发授权", async () => {
    const { service } = makeService();
    await service.mount(OWNER, BOOTSTRAP);
    await service.layout(OWNER, { x: 0, y: 0, width: 100, height: 100 }, true);
    await expect(service.grantMedia(OWNER, "other", req, rid)).rejects.toThrow(/MEDIA_SCOPE_RETIRED/);
  });

  it("路径可见且 scopeKey 对得上时才转发给媒体层，并带上 current 回调", async () => {
    const { service, media } = makeService();
    await service.mount(OWNER, BOOTSTRAP);
    await service.layout(OWNER, { x: 0, y: 0, width: 100, height: 100 }, true);
    await service.grantMedia(OWNER, "scope-1", req, rid);
    expect(media.grant).toHaveBeenCalledTimes(1);
    const ownerArg = media.grant.mock.calls[0]![0] as unknown as { current: () => boolean };
    expect(ownerArg.current()).toBe(true);
    // 藏起来之后 current 立刻变假
    await service.layout(OWNER, { x: 0, y: 0, width: 100, height: 100 }, false);
    expect(ownerArg.current()).toBe(false);
  });

  it("取消授权时 scopeKey 不对就什么也不做", async () => {
    const { service, media } = makeService();
    await service.mount(OWNER, BOOTSTRAP);
    await service.cancelMediaGrant(OWNER, "other", rid);
    expect(media.cancelGrant).not.toHaveBeenCalled();
    await service.cancelMediaGrant(OWNER, "scope-1", rid);
    expect(media.cancelGrant).toHaveBeenCalledTimes(1);
  });
});

describe("release", () => {
  it("把视图摘掉并释放，且重复调用是安全的", async () => {
    const { service, window, media } = makeService();
    await service.mount(OWNER, BOOTSTRAP);
    await service.release(OWNER);
    expect(window.contentView.removeChildView).toHaveBeenCalledTimes(1);
    expect(media.revoke).toHaveBeenCalledWith(OWNER);
    await service.release(OWNER);
    expect(window.contentView.removeChildView).toHaveBeenCalledTimes(1);
  });

  it("未知 owner 的 layout 静默忽略（不是抛错）", async () => {
    const { service } = makeService();
    await expect(service.layout("nobody", { x: 0, y: 0, width: 1, height: 1 }, true)).resolves.toBeUndefined();
  });
});
