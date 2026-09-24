import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { BundleStatus, WorkspaceEntry } from "../ipc/types.js";
import { HiloApp, type HiloAppConfig } from "./hilo-app.js";
import { FakeFactory } from "./testing.js";

let root: string;
let clock: number;
let fx: FakeFactory;
let persisted: string[][];

function makeApp(over: Partial<HiloAppConfig> = {}): HiloApp {
  return new HiloApp({
    createRuntime: fx.create,
    registerChannel: fx.register,
    projectsRoot: () => path.join(root, "Projects"),
    home: "/nonexistent-home",
    maxOpenWorkspaces: 5,
    idleSuspendMs: 10 * 60_000,
    now: () => clock,
    onOpenWorkspacesChanged: (p) => persisted.push(p),
    ...over,
  });
}

const ws = (name: string) => path.join(root, name);

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), "ov-hilo-"));
  clock = 1_000_000;
  fx = new FakeFactory();
  persisted = [];
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

describe("打开与标签", () => {
  it("打开：返回 opened 和带身份的运行信息，挂上 bundle 与 workspace 频道", async () => {
    const app = makeApp();
    const r = await app.openWorkspaceWithResult(ws("a"));
    expect(r.kind).toBe("opened");
    if (r.kind !== "opened") return;
    expect(r.runtime.workspaceId).toBe(ws("a"));
    expect(r.runtime.projectName).toBe("a");
    expect(r.runtime.gatewayBinding.generation).toBe(1);
    expect(r.runtime.wsUrl).toMatch(/^ws:\/\/127\.0\.0\.1:\d+\/ws\?hilo_workspace=c&hilo_workspace_instance=/);
    expect(fx.channels.has(`workspace-bundle-${ws("a")}`)).toBe(true);
    expect(fx.channels.has(`workspace-${ws("a")}`)).toBe(true);
    // 再开同一个是 reused，不起第二套
    const again = await app.openWorkspaceWithResult(ws("a") + "/");
    expect(again.kind).toBe("reused");
    expect(fx.created).toHaveLength(1);
    expect(persisted.at(-1)).toEqual([ws("a")]);
  });

  it("并发打开同一个目录只起一套", async () => {
    const app = makeApp();
    const [a, b] = await Promise.all([app.openWorkspaceWithResult(ws("a")), app.openWorkspaceWithResult(ws("a"))]);
    expect(a).toEqual(b);
    expect(fx.created).toHaveLength(1);
  });

  it("stageWorkspaceTab 只加冷标签不起进程；激活时才起", async () => {
    const app = makeApp();
    const r = app.stageWorkspaceTab(ws("s"));
    expect(r).toEqual({ kind: "staged", entry: { workspaceId: ws("s"), projectName: "s", folderPath: ws("s") } });
    expect(fx.created).toHaveLength(0);
    expect(app.listWorkspaceLifecycleStates()).toEqual({ [ws("s")]: "cold" });
    const opened = await app.activateWorkspaceWithResult(ws("s"));
    expect(opened?.kind).toBe("reused");
    expect(fx.created).toHaveLength(1);
    expect(app.listWorkspaceLifecycleStates()[ws("s")]).toBe("bound");
  });

  it("激活一个，其余 bound 的转为 background；回首页全部 background", async () => {
    let homeShown = 0;
    const app = makeApp({ showHome: () => homeShown++ });
    app.stageWorkspaceTab(ws("a"));
    await app.activateWorkspaceWithResult(ws("a"));
    await app.openWorkspaceWithResult(ws("b"));
    expect(app.listWorkspaceLifecycleStates()).toEqual({ [ws("a")]: "bound", [ws("b")]: "background" });
    await app.activateWorkspaceWithResult(ws("b"));
    expect(app.listWorkspaceLifecycleStates()).toEqual({ [ws("a")]: "background", [ws("b")]: "bound" });
    app.activateHome();
    expect(app.listWorkspaceLifecycleStates()).toEqual({ [ws("a")]: "background", [ws("b")]: "background" });
    expect(homeShown).toBe(1);
  });

  it("onWorkspaceEntriesChanged 给出完整列表；冷标签没有 gateway 字段", async () => {
    const app = makeApp();
    const seen: WorkspaceEntry[][] = [];
    app.onWorkspaceEntriesChanged((e) => seen.push(e));
    await app.openWorkspaceWithResult(ws("a"));
    app.stageWorkspaceTab(ws("b"));
    const last = seen.at(-1)!;
    expect(last.map((e) => e.folderPath)).toEqual([ws("a"), ws("b")]);
    expect(last[0]!.gatewayUrl).toMatch(/^http:/);
    expect(last[1]!.gatewayUrl).toBeUndefined();
  });

  it("另一个应用的目录一律拒绝", async () => {
    const app = makeApp({ home: root });
    const r = await app.openWorkspaceWithResult(path.join(root, "Movies", "Hub", "Projects", "x"));
    expect(r.kind).toBe("cancelled");
    expect(fx.created).toHaveLength(0);
  });

  it("新建：不给目录时在项目根下按名字生成，重名追加 -2", async () => {
    const app = makeApp();
    const a = await app.createWorkspaceWithResult({ name: "海边 日落 / 视频" });
    const b = await app.createWorkspaceWithResult("海边 日落 / 视频");
    expect(a.kind === "opened" && a.runtime.folderPath).toBe(path.join(root, "Projects", "海边 日落 视频"));
    expect(b.kind === "opened" && b.runtime.folderPath).toBe(path.join(root, "Projects", "海边 日落 视频-2"));
  });
});

describe("预算：最多 5 个在跑", () => {
  async function openBackground(app: HiloApp, names: string[]) {
    for (const n of names) {
      await app.openWorkspaceWithResult(ws(n));
      clock += 1000;
    }
  }

  it("第 6 个：挂起转到后台最早的那个空闲工作区腾位置", async () => {
    const app = makeApp();
    await openBackground(app, ["w1", "w2", "w3", "w4", "w5"]);
    expect(app.liveCount).toBe(5);
    const r = await app.openWorkspaceWithResult(ws("w6"));
    expect(r.kind).toBe("opened");
    expect(app.liveCount).toBe(5);
    expect(fx.latest(ws("w1"))!.disposed).toBe(true);
    expect(fx.latest(ws("w1"))!.leasesTaken).toBe(1);
    const states = app.listWorkspaceLifecycleStates();
    expect(states[ws("w1")]).toBe("suspended");
    // 被挂起的仍在标签里（冷壳）
    expect(app.listWorkspaceEntries().map((e) => e.folderPath)).toContain(ws("w1"));
    expect(app.listWorkspaceEntries().find((e) => e.folderPath === ws("w1"))!.gatewayUrl).toBeUndefined();
  });

  it("LRU 按转后台的时间，不按打开顺序；当前激活的不挂", async () => {
    const app = makeApp();
    await openBackground(app, ["w1", "w2", "w3", "w4", "w5"]);
    // w1 被激活过又切走：它转到后台的时间变成最新
    await app.activateWorkspaceWithResult(ws("w1"));
    clock += 1000;
    await app.activateWorkspaceWithResult(ws("w3"));
    clock += 1000;
    await app.openWorkspaceWithResult(ws("w6"));
    expect(fx.latest(ws("w2"))!.disposed).toBe(true);
    expect(fx.latest(ws("w1"))!.disposed).toBe(false);
    expect(fx.latest(ws("w3"))!.disposed).toBe(false);
  });

  it("忙的跳过，挑下一个空闲的", async () => {
    const app = makeApp();
    await openBackground(app, ["w1", "w2", "w3", "w4", "w5"]);
    fx.latest(ws("w1"))!.idle = false;
    await app.openWorkspaceWithResult(ws("w6"));
    expect(fx.latest(ws("w1"))!.disposed).toBe(false);
    expect(fx.latest(ws("w2"))!.disposed).toBe(true);
  });

  it("都忙：返回 limit_reached，列出忙的工作区", async () => {
    const app = makeApp();
    await openBackground(app, ["w1", "w2", "w3", "w4", "w5"]);
    for (const r of fx.created) r.idle = false;
    const r = await app.openWorkspaceWithResult(ws("w6"));
    expect(r).toEqual({
      kind: "limit_reached",
      folderPath: ws("w6"),
      limitScope: "live-runtime-budget",
      reason: "no-safe-suspend-candidate",
      maxOpenWorkspaces: 5,
      openWorkspaceCount: 5,
      busyProjectNames: ["w1", "w2", "w3", "w4", "w5"],
    });
    expect(fx.created).toHaveLength(5);
  });

  it("有未保存改动的不挂", async () => {
    const app = makeApp();
    await openBackground(app, ["w1", "w2", "w3", "w4", "w5"]);
    for (const n of ["w1", "w2", "w3", "w4", "w5"]) {
      const inst = fx.latest(ws(n))!.binding()!.instanceId;
      app.reportWorkspacePersistence({ workspaceId: ws(n), instanceId: inst, state: "dirty" });
    }
    const r = await app.openWorkspaceWithResult(ws("w6"));
    expect(r.kind).toBe("limit_reached");
  });

  it("挂起的工作区激活时重开（resuming → starting → bound）", async () => {
    const app = makeApp();
    await openBackground(app, ["w1", "w2", "w3", "w4", "w5"]);
    await app.openWorkspaceWithResult(ws("w6"));
    expect(app.listWorkspaceLifecycleStates()[ws("w1")]).toBe("suspended");
    const r = await app.activateWorkspaceWithResult(ws("w1"));
    expect(r?.kind).toBe("reused");
    expect(r?.kind === "reused" && r.runtime.gatewayBinding.generation).toBe(2);
    expect(app.listWorkspaceLifecycleStates()[ws("w1")]).toBe("bound");
    expect(app.liveCount).toBe(5);
  });

  it("并发开 3 个时名额不超", async () => {
    const app = makeApp({ maxOpenWorkspaces: 3 });
    await openBackground(app, ["w1", "w2"]);
    // 新开的也在忙，谁都挂不掉
    fx.tweak = (r) => {
      r.idle = false;
    };
    for (const r of fx.created) r.idle = false;
    const results = await Promise.all([app.openWorkspaceWithResult(ws("x")), app.openWorkspaceWithResult(ws("y")), app.openWorkspaceWithResult(ws("z"))]);
    expect(results.filter((r) => r.kind === "opened")).toHaveLength(1);
    expect(results.filter((r) => r.kind === "limit_reached")).toHaveLength(2);
    expect(app.liveCount).toBe(3);
  });
});

describe("闲置挂起", () => {
  it("后台 10 分钟以上且空闲的被挂起；激活中的和不到时间的不动", async () => {
    const app = makeApp();
    await app.openWorkspaceWithResult(ws("old"));
    clock += 5 * 60_000;
    await app.openWorkspaceWithResult(ws("recent"));
    app.stageWorkspaceTab(ws("active"));
    await app.activateWorkspaceWithResult(ws("active"));
    clock += 6 * 60_000;
    expect(await app.suspendIdleWorkspaceRuntimes()).toBe(1);
    expect(fx.latest(ws("old"))!.disposed).toBe(true);
    expect(fx.latest(ws("recent"))!.disposed).toBe(false);
    expect(fx.latest(ws("active"))!.disposed).toBe(false);
    clock += 5 * 60_000;
    expect(await app.suspendIdleWorkspaceRuntimes()).toBe(1);
    expect(fx.latest(ws("recent"))!.disposed).toBe(true);
    expect(fx.latest(ws("active"))!.disposed).toBe(false);
  });

  it("drain 探测后状态变了就归还租约", async () => {
    const app = makeApp();
    await app.openWorkspaceWithResult(ws("a"));
    clock += 11 * 60_000;
    const rt = fx.latest(ws("a"))!;
    const origProbe = rt.probeActivity.bind(rt);
    rt.probeActivity = async (drain) => {
      const r = await origProbe(drain);
      // 拿到租约的同时，用户切回了这个工作区
      if (drain) await app.activateWorkspaceWithResult(ws("a"));
      return r;
    };
    expect(await app.suspendIdleWorkspaceRuntimes()).toBe(0);
    expect(rt.disposed).toBe(false);
    expect(rt.leasesReleased).toBe(1);
  });
});

describe("关闭 / 重试 / 失败", () => {
  it("有未保存改动时拒绝关闭，force 或 discard 可以关", async () => {
    const app = makeApp();
    await app.openWorkspaceWithResult(ws("a"));
    const inst = fx.latest(ws("a"))!.binding()!.instanceId;
    app.reportWorkspacePersistence({ workspaceId: ws("a"), instanceId: inst, state: "dirty" });
    expect(await app.closeWorkspace(ws("a"))).toEqual({ closed: false, reason: "unsaved" });
    // 保存中 → clean：清掉
    app.reportWorkspacePersistence({ workspaceId: ws("a"), instanceId: inst, state: "saving" });
    app.reportWorkspacePersistence({ workspaceId: ws("a"), instanceId: inst, state: "clean" });
    expect(app.getUnsavedWorkspaceCount()).toBe(0);
    app.reportWorkspacePersistence({ workspaceId: ws("a"), instanceId: inst, state: "dirty" });
    // dirty 时迟到的 clean 不清
    app.reportWorkspacePersistence({ workspaceId: ws("a"), instanceId: inst, state: "clean" });
    expect(app.getUnsavedWorkspaceCount()).toBe(1);
    expect(await app.closeWorkspace(ws("a"), { discardUnsavedChanges: true })).toEqual({ closed: true });
    expect(fx.latest(ws("a"))!.disposed).toBe(true);
    expect(fx.channels.has(`workspace-bundle-${ws("a")}`)).toBe(false);
    expect(app.listWorkspaceEntries()).toEqual([]);
  });

  it("gateway 报忙时拒绝关闭并给出原因；force 跳过检查", async () => {
    const app = makeApp();
    await app.openWorkspaceWithResult(ws("a"));
    fx.latest(ws("a"))!.idle = false;
    expect(await app.closeWorkspace(ws("a"))).toEqual({ closed: false, reason: "active", blockingReasons: ["agent_running"] });
    expect(await app.closeWorkspace(ws("a"), { force: true })).toEqual({ closed: true });
  });

  it("没有的工作区关闭返回 not-found（视为已关）", async () => {
    const app = makeApp();
    expect(await app.closeWorkspace(ws("nope"))).toEqual({ closed: true, reason: "not-found" });
  });

  it("启动失败：标签留下、状态 failed、bundle 频道还在；重试后起来", async () => {
    const app = makeApp();
    fx.tweak = (r) => {
      r.failOnStart = "端口被占";
    };
    await expect(app.openWorkspaceWithResult(ws("a"))).rejects.toThrow("端口被占");
    expect(app.listWorkspaceLifecycleStates()).toEqual({ [ws("a")]: "failed" });
    expect(fx.channels.has(`workspace-bundle-${ws("a")}`)).toBe(true);
    expect(await app.activateWorkspaceWithResult(ws("a"))).toBeUndefined();
    fx.tweak = undefined;
    const r = await app.retryWorkspaceWithResult(ws("a"));
    expect(r.kind).toBe("reused");
    expect(fx.created[0]!.disposed).toBe(true);
    expect(fx.created[1]!.opts.retryCount).toBe(1);
  });

  it("运行中 gateway 挂掉：移到 failed，标签变冷壳", async () => {
    const app = makeApp();
    await app.openWorkspaceWithResult(ws("a"));
    const statuses: BundleStatus[] = [];
    fx.latest(ws("a"))!.onStatusChange((s) => statuses.push(s));
    fx.latest(ws("a"))!.set("failed", { error: "crash" });
    expect(app.listWorkspaceLifecycleStates()[ws("a")]).toBe("failed");
    expect(app.getWorkspaceRuntime(ws("a"))).toBeUndefined();
    expect(statuses.at(-1)!.state).toBe("failed");
  });

  it("closeAllWorkspaces 停掉全部并清空标签", async () => {
    const app = makeApp();
    await app.openWorkspaceWithResult(ws("a"));
    await app.openWorkspaceWithResult(ws("b"));
    app.stageWorkspaceTab(ws("c"));
    expect(await app.closeAllWorkspaces()).toEqual({ closed: true });
    expect(fx.liveCount()).toBe(0);
    expect(app.listWorkspaceEntries()).toEqual([]);
    expect(persisted.at(-1)).toEqual([]);
  });

  it("恢复标签：全部冷标签，只起 prewarm 那一个", async () => {
    const app = makeApp();
    await app.restoreWorkspaceTabs([ws("a"), ws("b"), ws("c")], ws("b"));
    expect(fx.created.map((r) => r.folderPath)).toEqual([ws("b")]);
    expect(app.listWorkspaceLifecycleStates()).toEqual({ [ws("a")]: "cold", [ws("b")]: "bound", [ws("c")]: "cold" });
  });

  it("shutdown 停掉所有在跑的", async () => {
    const app = makeApp();
    await app.openWorkspaceWithResult(ws("a"));
    await app.openWorkspaceWithResult(ws("b"));
    await app.shutdown();
    expect(fx.liveCount()).toBe(0);
    expect((await app.openWorkspaceWithResult(ws("c"))).kind).toBe("cancelled");
  });
});
