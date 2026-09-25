import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { isForeignAppPath, resolveRoots } from "../roots.js";
import { GLOBAL_STORAGE_VERSION, GlobalStore } from "./global-store.js";
import { globalGet, globalSet, type IpcHandleLike, registerStorageIpc } from "./storage-ipc.js";
import { WorkspaceStorageRegistry, workspaceStoragePath } from "./workspace-store.js";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "ov-store-"));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));


/** 期望值按本机规则算：Windows 上分隔符是反斜杠、根前面有盘符。 */
const J = (p: string) => path.join(p);
const P = (p: string) => path.resolve(p);
describe("GlobalStore", () => {
  it("首次打开写出默认值，键名是渲染层用的那套", () => {
    const file = path.join(dir, "hub-config.json");
    const s = new GlobalStore(file, { workingDirectory: "/w" });
    const onDisk = JSON.parse(readFileSync(file, "utf8"));
    expect(onDisk._version).toBe(GLOBAL_STORAGE_VERSION);
    for (const k of ["recentWorkspaces", "projects", "hiddenProjectIds", "openWorkspacePaths", "lastActiveWorkspacePath", "workspaceRestoreHealth", "visiblePreviewTabs", "workspaceSessionTabs", "config"]) {
      expect(onDisk).toHaveProperty(k);
    }
    expect(s.get("config").workingDirectory).toBe("/w");
    expect(s.get("visiblePreviewTabs")).toEqual({ version: 1, initialized: false, tabs: [] });
  });

  it("set 对普通对象浅合并，replace 覆盖", () => {
    const s = new GlobalStore(path.join(dir, "g.json"));
    s.set("config", { theme: "dark" });
    expect(s.get("config").theme).toBe("dark");
    expect(s.get("config").menuBarVisible).toBe(true);
    s.set("workspaceRestoreHealth", { "/a": 1 });
    s.set("workspaceRestoreHealth", { "/b": 2 });
    expect(s.get("workspaceRestoreHealth")).toEqual({ "/a": 1, "/b": 2 });
    s.replace("workspaceRestoreHealth", { "/b": 2 });
    expect(s.get("workspaceRestoreHealth")).toEqual({ "/b": 2 });
    s.set("openWorkspacePaths", ["/x"]);
    s.set("openWorkspacePaths", ["/y"]);
    expect(s.get("openWorkspacePaths")).toEqual(["/y"]);
  });

  it("重开后值还在，老文件缺的 config 字段被补上", () => {
    const file = path.join(dir, "g.json");
    writeFileSync(file, JSON.stringify({ _version: 30, config: { theme: "light" }, recentWorkspaces: [{ path: "/p", openedAt: 1 }] }));
    const s = new GlobalStore(file);
    expect(s.get("config").theme).toBe("light");
    expect(s.get("config").compactionEnabled).toBe(true);
    expect(s.get("recentWorkspaces")).toEqual([{ path: "/p", openedAt: 1 }]);
    expect(s.get("projects")).toEqual([]);
  });

  it("坏文件先备份再重建，不直接覆盖", () => {
    const file = path.join(dir, "g.json");
    writeFileSync(file, "{not json");
    const s = new GlobalStore(file);
    expect(s.get("projects")).toEqual([]);
    expect(readdirSync(dir).some((n) => n.startsWith("g.json.corrupt-"))).toBe(true);
  });

  it("写盘是原子的：不留临时文件", () => {
    const s = new GlobalStore(path.join(dir, "g.json"));
    for (let i = 0; i < 5; i++) s.set("lastActiveWorkspacePath", `/p${i}`);
    expect(readdirSync(dir).filter((n) => n.endsWith(".tmp"))).toEqual([]);
    expect(new GlobalStore(path.join(dir, "g.json")).get("lastActiveWorkspacePath")).toBe("/p4");
  });

  it("返回的是拷贝，改了不影响存储", () => {
    const s = new GlobalStore(path.join(dir, "g.json"));
    const cfg = s.get("config");
    cfg.theme = "hacked";
    expect(s.get("config").theme).toBe("system");
  });

  it("onDidChange 报出改了哪个键", () => {
    const s = new GlobalStore(path.join(dir, "g.json"));
    const seen: string[] = [];
    s.onDidChange((c) => seen.push(c.key));
    s.set("projects", []);
    expect(seen).toEqual(["projects"]);
  });
});

describe("storage IPC 规则", () => {
  it("私有键读不到也写不了；customModels 由主进程掌管", () => {
    const s = new GlobalStore(path.join(dir, "g.json"));
    s.replace("customMcpVault", "secret");
    s.set("config", { customModels: { p: 1 } });
    expect(globalGet(s, "customMcpVault")).toBeUndefined();
    expect(globalGet(s)).not.toHaveProperty("customMcpVault");
    expect(() => globalSet(s, "customMcpVault", "x")).toThrow();
    expect(() => globalSet(s, "config.customModels", {})).toThrow();
    globalSet(s, "config", { theme: "dark", customModels: { evil: true } });
    expect(s.get("config").customModels).toEqual({ p: 1 });
    expect((globalGet(s, "config") as Record<string, unknown>).customModels).toBeUndefined();
  });

  it("注册的 handler 走通 global/workspace 读写", async () => {
    const handlers = new Map<string, (e: unknown, ...a: unknown[]) => unknown>();
    const ipc: IpcHandleLike = { handle: (ch, fn) => handlers.set(ch, fn) };
    const g = new GlobalStore(path.join(dir, "g.json"));
    const ws = new WorkspaceStorageRegistry();
    registerStorageIpc(ipc, g, ws);
    const call = (ch: string, ...a: unknown[]) => handlers.get(ch)!(null, ...a);
    call("storage:global-set", "hiddenProjectIds", ["p1"]);
    expect(call("storage:global-get", "hiddenProjectIds")).toEqual(["p1"]);
    const wsDir = path.join(dir, "ws");
    call("storage:workspace-set", wsDir, "pinnedSessionIds", ["s"]);
    expect(call("storage:workspace-get", wsDir, "pinnedSessionIds")).toEqual(["s"]);
    expect(() => call("storage:workspace-get", "relative/dir")).toThrow();
    expect((call("storage:set-desktop-config") as { success: boolean }).success).toBe(false);
  });
});

describe("WorkspaceStorage", () => {
  it("缺省 v10，浅合并，落在 .hilo/storage.json", () => {
    const ws = new WorkspaceStorageRegistry();
    const d = path.join(dir, "w");
    expect(ws.get(d, "preferences")).toEqual({ loadUserMemory: true });
    ws.set(d, "assetPanel", { sortOrder: "asc" });
    expect(ws.get(d, "assetPanel")).toEqual({ typeFilters: [], dateFilter: { kind: "all" }, sortOrder: "asc" });
    const onDisk = JSON.parse(readFileSync(workspaceStoragePath(d), "utf8"));
    expect(onDisk._version).toBe(10);
    expect(new WorkspaceStorageRegistry().get(d, "assetPanel")).toMatchObject({ sortOrder: "asc" });
  });

  it("新建偏好只在还不是工作区时写", () => {
    const ws = new WorkspaceStorageRegistry();
    const fresh = path.join(dir, "fresh");
    ws.applyCreatePreferences(fresh, false);
    expect(ws.get(fresh, "preferences")).toEqual({ loadUserMemory: false });
    const existing = path.join(dir, "existing");
    mkdirSync(path.join(existing, ".hilo"), { recursive: true });
    writeFileSync(path.join(existing, ".hilo", "index.sqlite"), "");
    ws.applyCreatePreferences(existing, false);
    expect(ws.get(existing, "preferences")).toEqual({ loadUserMemory: true });
  });

  it("在 git 仓库里时把 .hilo/ 加进 .gitignore", () => {
    const d = path.join(dir, "repo");
    mkdirSync(path.join(d, ".git"), { recursive: true });
    new WorkspaceStorageRegistry().get(d);
    expect(readFileSync(path.join(d, ".gitignore"), "utf8")).toContain(".hilo/");
  });
});

describe("数据根", () => {
  it("默认换了名字，不和另一个应用共用；HILO_DATA_DIR 覆盖", () => {
    const r = resolveRoots({ env: {}, home: "/Users/u", userData: "/ud" });
    expect(r.projectsRoot).toBe(J("/Users/u/Movies/蒜狸小助手/Projects"));
    expect(r.projectSpacesRoot).toBe(J("/Users/u/Movies/蒜狸小助手/Projects/.projects"));
    expect(r.hubRoot).toBe(J("/Users/u/.ovhub"));
    expect(r.outputDir).toBe(J("/ud/output_files"));
    expect(r.userSkillsDir).toBe(J("/Users/u/Movies/蒜狸小助手/skills"));
    const c = resolveRoots({ env: { HILO_DATA_DIR: "/d" }, home: "/Users/u", userData: "/ud" });
    expect(c.projectsRoot).toBe(J("/d/Projects"));
    expect(c.outputDir).toBe(J("/d/output_files"));
    expect(c.hubRoot).toBe("/d");
    // 数据根和 hubRoot 重合时用户技能换个目录名，不和自带技能混在 /d/skills
    expect(c.userSkillsDir).toBe(J("/d/user-skills"));
  });

  it("另一个应用的目录被认出来", () => {
    expect(isForeignAppPath("/Users/u/Movies/Hub/Projects/x", "/Users/u")).toBe(true);
    expect(isForeignAppPath("/Users/u/.hub", "/Users/u")).toBe(true);
    expect(isForeignAppPath("/Users/u/Library/Application Support/@hilo/desktop", "/Users/u")).toBe(true);
    expect(isForeignAppPath("/Users/u/Movies/Hubble", "/Users/u")).toBe(false);
    expect(isForeignAppPath("/Users/u/Movies/蒜狸小助手/Projects/a", "/Users/u")).toBe(false);
  });
});

describe("最近项目", () => {
  it("新的放最前；已有的只刷新时间不挪位置；重复项合并", async () => {
    const { recordRecentOpen } = await import("./recents.js");
    const list = [
      { path: "/a", openedAt: 1, manualOrder: 0 },
      { path: "/b", openedAt: 2, manualOrder: 1, displayName: "乙" },
      { path: "/b/", openedAt: 3, manualOrder: 2, coverImage: "c.png" },
    ];
    expect(recordRecentOpen(list, "/b", 10)).toEqual([
      { path: P("/a"), openedAt: 1, manualOrder: 0 },
      { path: P("/b"), openedAt: 10, manualOrder: 1, displayName: "乙", coverImage: "c.png" },
    ]);
    expect(recordRecentOpen(list, "/new", 11)[0]).toEqual({ path: P("/new"), openedAt: 11, manualOrder: 0 });
  });
});
