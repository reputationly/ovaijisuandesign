import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { ProjectRecord } from "../ipc/types.js";
import { GlobalStore } from "../storage/global-store.js";
import { generateProjectDirName, sanitizeDirName } from "./naming.js";
import { type ProjectJournal, ProjectService, type ProjectServiceDeps } from "./project-service.js";

let dir: string;
let store: GlobalStore;
let trashed: string[];
let projectsRoot: string;
let journalDir: string;

function deps(over: Partial<ProjectServiceDeps> = {}): ProjectServiceDeps {
  return {
    getProjects: () => store.get("projects") as ProjectRecord[],
    setProjects: (p) => store.replace("projects", p),
    projectsRoot: () => projectsRoot,
    journalDir,
    trashFolder: async (p) => {
      trashed.push(p);
      rmSync(p, { recursive: true, force: true });
    },
    ...over,
  };
}

async function ready(over: Partial<ProjectServiceDeps> = {}): Promise<ProjectService> {
  const s = new ProjectService(deps(over));
  await s.initialize();
  return s;
}

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "ov-proj-"));
  store = new GlobalStore(path.join(dir, "hub-config.json"));
  trashed = [];
  projectsRoot = path.join(dir, "Projects");
  journalDir = path.join(dir, "project-sync-journal");
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));


/** 期望值和输入一样按本机规则解析：Windows 上 "/w/one" 会变成 "D:\\w\\one"。 */
const P = (p: string) => path.resolve(p);
describe("ProjectService", () => {
  it("初始化前调用报错", async () => {
    const s = new ProjectService(deps());
    await expect(s.createProject({ name: "x", kind: "local" })).rejects.toThrow("not initialized");
  });

  it("新建：名字规范化、重名追加 -2、建项目空间目录、写进全局存储", async () => {
    const s = await ready();
    const seen: ProjectRecord[][] = [];
    s.onDidChangeProjects((p) => seen.push(p));
    const a = await s.createProject({ name: "  我的   短片 ", kind: "local" });
    const b = await s.createProject({ name: "我的 短片", kind: "local" });
    expect(a.name).toBe("我的 短片");
    expect(b.name).toBe("我的 短片-2");
    expect(a.folderName).toBe("我的 短片");
    expect(b.folderName).toBe("我的 短片-2");
    expect(existsSync(path.join(projectsRoot, ".projects", a.folderName))).toBe(true);
    const stored = store.get("projects");
    expect(stored.map((p) => p.id)).toEqual([b.id, a.id]);
    expect(a.revision).toBe(1);
    expect(a.transactionId).not.toBe("");
    expect(seen).toHaveLength(2);
    expect(existsSync(path.join(journalDir, "pending.json"))).toBe(false);
  });

  it("项目空间目录名和盘上已有目录不冲突（不区分大小写）", async () => {
    mkdirSync(path.join(projectsRoot, ".projects", "demo"), { recursive: true });
    const s = await ready();
    const p = await s.createProject({ name: "Demo", kind: "local" });
    expect(p.folderName).toBe("Demo-2");
  });

  it("改名：冲突抛 project-name-conflict，folderName 不变", async () => {
    const s = await ready();
    const a = await s.createProject({ name: "A", kind: "local" });
    await s.createProject({ name: "B", kind: "local" });
    await expect(s.renameProject(a.id, "b")).rejects.toThrow("project-name-conflict");
    const r = await s.renameProject(a.id, "  新 名字 ");
    expect(r?.name).toBe("新 名字");
    expect(r?.folderName).toBe("A");
    expect(r?.revision).toBe(2);
    expect(await s.renameProject("nope", "x")).toBeUndefined();
    expect(await s.renameProject(a.id, "   ")).toBeUndefined();
  });

  it("工作区只属于一个项目；detach 从所有项目摘掉", async () => {
    const s = await ready();
    const a = await s.createProject({ name: "A", kind: "local" });
    const b = await s.createProject({ name: "B", kind: "local" });
    await s.assignWorkspace(P("/w/one"), a.id, false);
    await s.assignWorkspace(P("/w/two"), a.id, false);
    await s.assignWorkspace(P("/W/ONE"), b.id, true);
    const list = s.list();
    expect(list.find((p) => p.id === a.id)!.workspacePaths).toEqual([P("/w/two")]);
    expect(list.find((p) => p.id === b.id)!.workspacePaths).toEqual([P("/W/ONE")]);
    await expect(s.assignWorkspace(P("/w/x"), "missing", false)).rejects.toThrow("Project not found: missing");
    await s.detachWorkspace(P("/w/two"), false);
    expect(s.list().find((p) => p.id === a.id)!.workspacePaths).toEqual([]);
  });

  it("隐藏 ≠ 删除：hiddenProjectIds 由渲染层写，记录和目录都还在", async () => {
    const s = await ready();
    const a = await s.createProject({ name: "A", kind: "local" });
    store.set("hiddenProjectIds", [a.id]);
    expect(s.list().map((p) => p.id)).toEqual([a.id]);
    expect(existsSync(path.join(projectsRoot, ".projects", "A"))).toBe(true);
    expect(trashed).toEqual([]);
  });

  it("删除：记录去掉，项目空间进废纸篓；不存在的返回 project-not-found", async () => {
    const s = await ready();
    const a = await s.createProject({ name: "A", kind: "local" });
    expect(await s.deleteProject(a.id)).toEqual({ success: true });
    expect(s.list()).toEqual([]);
    expect(trashed).toEqual([path.join(projectsRoot, ".projects", "A")]);
    expect(await s.deleteProject(a.id)).toEqual({ success: false, errorCode: "project-not-found" });
  });

  it("废纸篓失败时什么都不改", async () => {
    const s = await ready({
      trashFolder: async () => {
        throw new Error("denied");
      },
    });
    const a = await s.createProject({ name: "A", kind: "local" });
    expect(await s.deleteProject(a.id)).toEqual({ success: false, errorCode: "project-folder-trash-failed" });
    expect(s.list().map((p) => p.id)).toEqual([a.id]);
  });

  it("示例项目：复用同 id，工作区独占", async () => {
    const s = await ready();
    const p1 = await s.provisionSampleProject({ id: "builtin-sample-project", name: "新手指引", workspacePath: P("/w/sample") });
    const p2 = await s.provisionSampleProject({ id: "builtin-sample-project", name: "新手指引", workspacePath: P("/w/sample2") });
    expect(p1.id).toBe("builtin-sample-project");
    expect(p2.workspacePaths).toEqual([P("/w/sample2"), P("/w/sample")]);
    expect(s.list()).toHaveLength(1);
  });

  it("relocateProjectsRoot 只改旧根下的路径", async () => {
    const s = await ready();
    const a = await s.createProject({ name: "A", kind: "local" });
    await s.assignWorkspace(P("/old/root/x"), a.id);
    await s.assignWorkspace(P("/elsewhere/y"), a.id);
    await s.relocateProjectsRoot(P("/old/root"), P("/new/root"));
    expect(s.list()[0]!.workspacePaths).toEqual([P("/elsewhere/y"), P("/new/root/x")]);
  });

  it("残留日志在启动时重放：删目录、建目录、写存储、删日志", async () => {
    mkdirSync(path.join(projectsRoot, ".projects", "gone"), { recursive: true });
    const journal: ProjectJournal = {
      schemaVersion: 1,
      transactionId: "t1",
      operation: "create-project",
      createdAt: 1,
      projectsRoot,
      projects: [
        { id: "p1", name: "恢复的", kind: "local", createdAt: 1, updatedAt: 1, workspacePaths: [P("/w/a")], revision: 3, transactionId: "t1", folderName: "恢复的" },
      ],
      deletedFolderNames: ["gone"],
      markMigrationComplete: false,
    };
    mkdirSync(journalDir, { recursive: true });
    writeFileSync(path.join(journalDir, "pending.json"), JSON.stringify(journal));
    const s = await ready();
    expect(s.list().map((p) => [p.id, p.revision])).toEqual([["p1", 3]]);
    expect(existsSync(path.join(projectsRoot, ".projects", "恢复的"))).toBe(true);
    expect(trashed).toEqual([path.join(projectsRoot, ".projects", "gone")]);
    expect(readdirSync(journalDir)).toEqual([]);
  });

  it("老记录缺 folderName：启动时补上并建目录", async () => {
    store.replace("projects", [{ id: "abcdef123456", name: "  ", kind: "local", createdAt: 1, updatedAt: 1, workspacePaths: [] }]);
    await ready();
    const p = store.get("projects")[0]!;
    expect(p.folderName).toBe("project-abcdef12");
    expect(existsSync(path.join(projectsRoot, ".projects", "project-abcdef12"))).toBe(true);
  });

  it("写存储失败后锁住后续改动", async () => {
    let fail = false;
    const s = await ready({
      setProjects: (p) => {
        if (fail) throw new Error("disk full");
        store.replace("projects", p);
      },
    });
    fail = true;
    await expect(s.createProject({ name: "A", kind: "local" })).rejects.toThrow("disk full");
    fail = false;
    await expect(s.createProject({ name: "B", kind: "local" })).rejects.toThrow("blocked until restart recovery");
    // 日志留着，下次启动重放
    expect(existsSync(path.join(journalDir, "pending.json"))).toBe(true);
    const again = await ready();
    expect(again.list().map((p) => p.name)).toEqual(["A"]);
  });
});

describe("目录命名", () => {
  it("清洗非法字符、首尾点、保留名、20 个码点", () => {
    expect(sanitizeDirName('a/b:c*d?"e<f>g|h')).toBe("a b c d e f g h");
    expect(sanitizeDirName("...hidden. ")).toBe("hidden");
    expect(sanitizeDirName("CON")).toBe("");
    expect(sanitizeDirName("一二三四五六七八九十一二三四五六七八九十多出来的")).toBe("一二三四五六七八九十一二三四五六七八九十");
    expect(sanitizeDirName("😀".repeat(25))).toBe("😀".repeat(20));
  });

  it("冲突时不区分大小写追加 -n；没名字时用日期", () => {
    mkdirSync(path.join(projectsRoot, "Film"), { recursive: true });
    mkdirSync(path.join(projectsRoot, "film-2"), { recursive: true });
    expect(generateProjectDirName("FILM", projectsRoot)).toBe(path.join(projectsRoot, "FILM-3"));
    expect(path.basename(generateProjectDirName("", projectsRoot))).toMatch(/^Project-\d{4}$/);
  });
});
