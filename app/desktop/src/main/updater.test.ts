import { describe, expect, it, vi } from "vitest";

import {
  UpdaterService,
  currentUpdateTarget,
  initialUpdaterState,
  shouldAutoUpdate,
  type AutoUpdaterLike,
  type UpdaterDeps,
} from "./updater.js";

/** 假 autoUpdater，事件可以手动触发。 */
function fakeUpdater() {
  const handlers = new Map<string, (...a: unknown[]) => void>();
  const u: AutoUpdaterLike & { emit: (e: string, a?: unknown) => void } = {
    autoDownload: true,
    autoInstallOnAppQuit: false,
    checkForUpdates: vi.fn(async () => ({ version: "3.0.22.0" })),
    downloadUpdate: vi.fn(async () => undefined),
    quitAndInstall: vi.fn(),
    on(e, cb) {
      handlers.set(e, cb);
    },
    emit(e, a) {
      handlers.get(e)?.(a);
    },
  };
  return u;
}

const deps = (over: Partial<UpdaterDeps> = {}): UpdaterDeps => ({
  createAutoUpdater: () => fakeUpdater(),
  currentVersion: () => "3.0.21.1",
  readDismissed: () => ({ version: null, at: 0 }),
  writeDismissed: () => {},
  log: () => {},
  ...over,
});

describe("自动更新：状态形状", () => {
  it("初始状态逐字段对得上官方 UI 的 createInitialState 兜底分支", () => {
    // 这份字段清单是从官方 UI 打包产物里 `createInitialState()` 抄的。
    // **少一个字段不会报错**，只会让某个组件读到 undefined 然后不渲染 ——
    // 表现是「更新横幅偶尔不出现」，所以这里逐个点名。
    expect(Object.keys(initialUpdaterState("3.0.21.1")).sort()).toEqual(
      [
        "phase", "forced", "policyStatus", "forceSource",
        "manualDownloadUrl", "manualOnly", "manualRecoveryReason", "manualRecoverySource", "manualRecoveryCode",
        "policyCheckedAt", "currentVersion", "targetVersion", "subtitle", "requiredReason",
        "changelog", "progress", "error", "lastCheckAt",
        "userTriggeredDownload", "activeCheckUserTriggered", "availableSince",
        "dismissed", "dismissedVersion", "dismissedAt",
      ].sort(),
    );
  });

  it("getState 的形状是 { state, trigger }（UI 按 event.state / event.trigger 读）", () => {
    const svc = new UpdaterService(deps());
    expect(svc.getState()).toEqual({ state: initialUpdaterState("3.0.21.1"), trigger: "auto" });
    expect(svc.getVersion()).toBe("3.0.21.1");
    expect(svc.getCapabilities()).toEqual({ downloadCancellation: true });
  });
});

describe("自动更新：状态机", () => {
  it("查到新版本 → available，带上 targetVersion 并清掉上一版的 dismiss", async () => {
    const u = fakeUpdater();
    let dismissedAt = 1;
    const svc = new UpdaterService(
      deps({
        createAutoUpdater: () => u,
        readDismissed: () => ({ version: "3.0.20.0", at: dismissedAt }),
      }),
    );
    // 启动时读回了上一版的 dismiss
    expect(svc.getState().state.dismissedVersion).toBe("3.0.20.0");

    const r = await svc.check({ userTriggered: true });
    expect(r).toEqual({ status: "available", version: "3.0.22.0" });
    const s = svc.getState().state;
    expect(s.phase).toBe("available");
    expect(s.targetVersion).toBe("3.0.22.0");
    expect(svc.getState().trigger).toBe("user");
    // 新版本出现时不能还挂着旧版的 dismiss，否则用户以为已经忽略过了。
    expect(s.dismissed).toBe(false);
    expect(s.dismissedAt).toBe(0);
  });

  it("没有新版本 → not-available，不是 error", async () => {
    const u = fakeUpdater();
    u.checkForUpdates = vi.fn(async () => null);
    const svc = new UpdaterService(deps({ createAutoUpdater: () => u }));
    expect(await svc.check()).toEqual({ status: "not-available" });
    expect(svc.getState().state.phase).toBe("not-available");
    expect(svc.getState().state.error).toBeNull();
  });

  it("autoDownload 关掉：下载必须由用户点，available 和 downloaded 才是两个能分辨的阶段", async () => {
    const u = fakeUpdater();
    const svc = new UpdaterService(deps({ createAutoUpdater: () => u }));
    await svc.check();
    expect(u.autoDownload).toBe(false);
    expect(u.autoInstallOnAppQuit).toBe(true);
  });

  it("下载进度按事件推进，下载完进 downloaded 并清掉 progress", async () => {
    const u = fakeUpdater();
    const svc = new UpdaterService(deps({ createAutoUpdater: () => u }));
    await svc.check();
    await svc.download();
    expect(svc.getState().state.phase).toBe("downloading");

    u.emit("download-progress", { percent: 42, bytesPerSecond: 100, transferred: 42, total: 100, delta: 1 });
    expect(svc.getState().state.progress).toMatchObject({ percent: 42, bytesPerSecond: 100 });

    u.emit("update-downloaded", { version: "3.0.22.0" });
    const s = svc.getState().state;
    expect(s.phase).toBe("downloaded");
    expect(s.progress).toBeNull();
    expect(s.targetVersion).toBe("3.0.22.0");
  });

  it("查更新出错 → error + error 字段，别假装成 not-available", async () => {
    const u = fakeUpdater();
    u.checkForUpdates = vi.fn(async () => {
      throw new Error("ECONNREFUSED");
    });
    const svc = new UpdaterService(deps({ createAutoUpdater: () => u }));
    expect(await svc.check()).toEqual({ status: "error", error: "ECONNREFUSED" });
    expect(svc.getState().state.phase).toBe("error");
    expect(svc.getState().state.error).toBe("ECONNREFUSED");
  });

  it("安装只在 downloaded 阶段真的退出进程，其余阶段按了也不动", async () => {
    const u = fakeUpdater();
    const quit = vi.spyOn(u, "quitAndInstall");
    const svc = new UpdaterService(deps({ createAutoUpdater: () => u }));
    await svc.check();
    // 还没下载就 install → 什么都不做
    expect(svc.install()).toBe(false);
    expect(quit).not.toHaveBeenCalled();

    await svc.download();
    u.emit("update-downloaded", { version: "3.0.22.0" });
    expect(svc.install()).toBe(true);
    expect(quit).toHaveBeenCalledOnce();
  });

  it("dismiss 落到盘上，且带上被忽略的版本号", async () => {
    const written: { version: string; at: number }[] = [];
    const svc = new UpdaterService(
      deps({ createAutoUpdater: () => fakeUpdater(), writeDismissed: (v, a) => void written.push({ version: v, at: a }) }),
    );
    await svc.check();
    svc.dismiss();
    expect(svc.getState().state.dismissed).toBe(true);
    expect(svc.getState().state.dismissedVersion).toBe("3.0.22.0");
    expect(written).toHaveLength(1);
  });

  it("onStateChanged 是类字段事件（fromService 只枚举可枚举的实例属性）", () => {
    const svc = new UpdaterService(deps());
    const seen: string[] = [];
    svc.onStateChanged((e) => seen.push(e.state.phase));
    expect(typeof svc.onStateChanged).toBe("function");
    // 事件必须真的挂上，不是 undefined
    expect(Object.keys(svc)).toContain("onStateChanged");
    void seen;
  });
});

describe("自动更新：开发态与 target", () => {
  it("开发态不查更新（本地不该被线上版本打断）", () => {
    expect(shouldAutoUpdate(false)).toBe(false);
    expect(shouldAutoUpdate(true)).toBe(true);
  });

  it("target 与发布侧的命名一致", () => {
    // 这几个名字必须和 release.yml 的矩阵、以及 release-desktop.py 写的目录对得上，
    // 对不上就是「清单 404、更新永远查不到新版」。
    expect(currentUpdateTarget("darwin", "arm64")).toBe("darwin-arm64");
    expect(currentUpdateTarget("darwin", "x64")).toBe("darwin-x64");
    expect(currentUpdateTarget("win32", "x64")).toBe("win32-x64");
  });

  it("没有 autoUpdater（开发态 / 未配 feed）时如实说跳过了，不假装查过", async () => {
    const svc = new UpdaterService(deps({ createAutoUpdater: () => null }));
    expect(await svc.check({ userTriggered: true })).toEqual({ status: "skipped", error: "开发模式不检查更新" });
    // 状态还是 idle，别把「没查」报成「已是最新」
    expect(svc.getState().state.phase).toBe("idle");
  });
});