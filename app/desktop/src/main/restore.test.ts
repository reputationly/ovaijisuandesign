import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { RestoreHealth, runStartupRestore, type RestoreDeps, selectPrewarm, type SessionRestorePayload } from "./restore.js";
import { GlobalStore } from "./storage/global-store.js";
import { HiloApp } from "./workspace/hilo-app.js";
import { FakeFactory } from "./workspace/testing.js";

let dir: string;
let store: GlobalStore;
let sent: SessionRestorePayload[];
let restoredCalls: Array<{ paths: string[]; prewarm?: string }>;
let asked: string[][];

function deps(answer: "restore" | "skip" = "skip", over: Partial<RestoreDeps> = {}): RestoreDeps {
  return {
    store,
    health: new RestoreHealth(store),
    restoreTabs: async (paths, prewarm) => {
      restoredCalls.push({ paths, prewarm });
    },
    askRestoreUnhealthy: async (p) => {
      asked.push(p);
      return answer;
    },
    send: (p) => sent.push(p),
    ...over,
  };
}

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "ov-restore-"));
  store = new GlobalStore(path.join(dir, "hub-config.json"));
  sent = [];
  restoredCalls = [];
  asked = [];
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe("启动恢复", () => {
  it("没有上次的标签：什么都不做", async () => {
    const r = await runStartupRestore(deps());
    expect(r).toEqual({ restored: [], skipped: [] });
    expect(sent).toEqual([]);
  });

  it("全部恢复成标签，只起上次在看的那个，并通知渲染层", async () => {
    store.replace("openWorkspacePaths", ["/a", "/b", "/c", "/b"]);
    store.replace("lastActiveWorkspacePath", "/b");
    const r = await runStartupRestore(deps());
    expect(restoredCalls).toEqual([{ paths: ["/a", "/b", "/c"], prewarm: "/b" }]);
    expect(sent).toEqual([{ source: "session-restore", restoredWorkspaceIds: ["/a", "/b", "/c"], preferredWorkspaceId: "/b" }]);
    // 只给上次在看的那个记账
    expect(store.get("workspaceRestoreHealth")).toEqual({ "/b": 1 });
    expect(r.prewarm).toBe("/b");
  });

  it("上次在看的不在列表里：都记账，起第一个", async () => {
    store.replace("openWorkspacePaths", ["/a", "/b"]);
    store.replace("lastActiveWorkspacePath", "/gone");
    await runStartupRestore(deps());
    expect(store.get("workspaceRestoreHealth")).toEqual({ "/a": 1, "/b": 1 });
    expect(restoredCalls[0]!.prewarm).toBe("/a");
    expect(sent[0]!.preferredWorkspaceId).toBeUndefined();
  });

  it("连续两次没正常退出：问用户；选跳过就把它从恢复列表里去掉并清零", async () => {
    store.replace("openWorkspacePaths", ["/a", "/bad"]);
    store.replace("lastActiveWorkspacePath", "/bad");
    const health = new RestoreHealth(store);
    // 第一次启动：记账到 1，不问
    await runStartupRestore(deps());
    expect(asked).toEqual([]);
    // 没正常退出，第二次启动：记到 2
    await runStartupRestore(deps());
    expect(health.read()).toEqual({ "/bad": 2 });
    // 第三次：熔断
    sent = [];
    restoredCalls = [];
    const r = await runStartupRestore(deps("skip"));
    expect(asked).toEqual([["/bad"]]);
    expect(r.skipped).toEqual(["/bad"]);
    expect(restoredCalls).toEqual([{ paths: ["/a"], prewarm: "/a" }]);
    expect(store.get("openWorkspacePaths")).toEqual(["/a"]);
    expect(health.read()).toEqual({ "/a": 1 });
    expect(sent[0]).toEqual({ source: "session-restore", restoredWorkspaceIds: ["/a"] });
  });

  it("熔断时选恢复：照常恢复并继续记账", async () => {
    store.replace("openWorkspacePaths", ["/bad"]);
    store.replace("workspaceRestoreHealth", { "/bad": 2 });
    const r = await runStartupRestore(deps("restore"));
    expect(r.restored).toEqual(["/bad"]);
    expect(store.get("workspaceRestoreHealth")).toEqual({ "/bad": 3 });
  });

  it("对话框出错按恢复处理", async () => {
    store.replace("openWorkspacePaths", ["/bad"]);
    store.replace("workspaceRestoreHealth", { "/bad": 5 });
    const r = await runStartupRestore(
      deps("skip", {
        askRestoreUnhealthy: async () => {
          throw new Error("no window");
        },
      }),
    );
    expect(r.restored).toEqual(["/bad"]);
  });

  it("正常退出清零", () => {
    store.replace("workspaceRestoreHealth", { "/a": 3 });
    new RestoreHealth(store).reset();
    expect(store.get("workspaceRestoreHealth")).toEqual({});
  });

  it("和真实宿主接起来：其余是冷标签，只有一个在跑", async () => {
    const root = path.join(dir, "ws");
    const paths = ["a", "b", "c"].map((n) => path.join(root, n));
    store.replace("openWorkspacePaths", paths);
    store.replace("lastActiveWorkspacePath", paths[2]);
    const fx = new FakeFactory();
    const app = new HiloApp({ createRuntime: fx.create, registerChannel: fx.register, projectsRoot: () => root, home: "/none" });
    let done: Promise<unknown> = Promise.resolve();
    await runStartupRestore(
      deps("skip", {
        restoreTabs: (p, pre) => {
          done = app.restoreWorkspaceTabs(p, pre);
          return done;
        },
      }),
    );
    await done;
    expect(fx.created.map((r) => r.folderPath)).toEqual([paths[2]]);
    expect(app.listWorkspaceLifecycleStates()).toEqual({ [paths[0]!]: "cold", [paths[1]!]: "cold", [paths[2]!]: "bound" });
  });
});

describe("selectPrewarm", () => {
  it("可见标签记录有效时只在可见标签里选", () => {
    const snap = { initialized: true, tabs: [{ workspaceId: "/c" }, { workspaceId: "/x", folderPath: "/a" }] };
    expect(selectPrewarm(snap, ["/a", "/b", "/c"], "/b")).toBe("/c");
    expect(selectPrewarm(snap, ["/a", "/b", "/c"], "/a")).toBe("/a");
    expect(selectPrewarm({ initialized: true, tabs: [] }, ["/a"], "/a")).toBeUndefined();
    expect(selectPrewarm({ initialized: false, tabs: [] }, ["/a", "/b"], undefined)).toBe("/a");
  });
});
