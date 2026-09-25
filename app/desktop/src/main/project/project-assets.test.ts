import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { type AssetsChange, ProjectAssetsService, sanitizeAssetLeaf } from "./project-assets.js";

let root: string;
let svc: ProjectAssetsService;
let trashed: string[];
let changes: AssetsChange[];
const P = "demo";
const assets = () => path.join(root, ".projects", P, ".assets");

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), "passets-"));
  trashed = [];
  changes = [];
  svc = new ProjectAssetsService({
    projectsRoot: () => root,
    trashItem: async (p) => {
      trashed.push(p);
      rmSync(p, { recursive: true, force: true });
    },
  });
  svc.onDidChangeAssets((c) => changes.push(c));
});

afterEach(() => {
  svc.dispose();
  rmSync(root, { recursive: true, force: true });
});

function source(name: string, body = "x"): string {
  const p = path.join(root, name);
  writeFileSync(p, body);
  return p;
}

describe("项目资产", () => {
  it("导入：复制进 .assets，同名自动改名，逐个报结果", async () => {
    const a = source("a.png");
    const r = await svc.importLocalAssets({ projectFolderName: P, sourcePaths: [a, a, path.join(root, "missing.png")] });
    expect(r.map((x) => x.record?.relPath ?? x.error)).toEqual(["a.png", "a (1).png", "copy_failed"]);
    expect(existsSync(path.join(assets(), "a (1).png"))).toBe(true);
    expect(changes).toEqual([{ projectFolderName: P, kind: "asset", change: "created" }]);
    expect(await svc.getAssetsDir(P)).toBe(assets());
  });

  it("列表会对齐磁盘：外面放进来的文件补记录，被删掉的文件去掉记录", async () => {
    const record = (await svc.importLocalAssets({ projectFolderName: P, sourcePaths: [source("a.png")] }))[0]?.record;
    mkdirSync(path.join(assets(), "sub"), { recursive: true });
    writeFileSync(path.join(assets(), "sub", "dropped.txt"), "hi");
    writeFileSync(path.join(assets(), ".DS_Store"), "");
    rmSync(path.join(assets(), "a.png"));
    const list = await svc.listAssets(P);
    expect(list.map((r) => [r.relPath, r.source])).toEqual([["sub/dropped.txt", "local"]]);
    expect(await svc.getAssetAbsolutePath(P, record!.id)).toBeNull();
    expect(await svc.listLocalFolders(P)).toEqual(["sub"]);
  });

  it("重命名 / 移动：重名默认拒绝，允许时自动改名；文件夹改名带着索引一起走", async () => {
    const [ra, rb] = await svc.importLocalAssets({ projectFolderName: P, sourcePaths: [source("a.png"), source("b.png")] });
    const a = ra?.record;
    const b = rb?.record;
    await expect(svc.renameLocalAsset(P, b!.id, "a.png")).rejects.toThrow("duplicate_name");
    expect((await svc.renameLocalAsset(P, b!.id, "a.png", { onConflict: "rename" }))?.name).toBe("a (1).png");
    await svc.createLocalFolder(P, ["f"]);
    expect((await svc.moveLocalAsset(P, a!.id, ["f"]))?.relPath).toBe("f/a.png");
    expect(await svc.renameLocalFolder(P, ["f"], "g")).toBe("g");
    expect((await svc.listAssets(P)).map((r) => r.relPath)).toEqual(["a (1).png", "g/a.png"]);
    expect(await svc.searchLocalAssets(P, "A", "g")).toMatchObject([{ relPath: "g/a.png" }]);
  });

  it("文件夹最多 3 层；不能把文件夹移进自己", async () => {
    await svc.createLocalFolder(P, ["1", "2", "3"]);
    await expect(svc.createLocalFolder(P, ["1", "2", "3", "4"])).rejects.toThrow("depth_exceeded");
    await expect(svc.moveLocalFolder(P, ["1"], ["1", "2"])).rejects.toThrow("cannot_move_into_self");
  });

  it("删除进废纸篓并清掉索引", async () => {
    const record = (await svc.importLocalAssets({ projectFolderName: P, sourcePaths: [source("a.png")], folderSegments: ["f"] }))[0]?.record;
    expect(await svc.deleteLocalAsset(P, record!.id)).toEqual({ hadRecord: true, removedFile: true });
    expect(await svc.deleteLocalAsset(P, record!.id)).toEqual({ hadRecord: false, removedFile: false });
    await svc.deleteLocalFolder(P, ["f"]);
    expect(trashed).toEqual([path.join(assets(), "f", "a.png"), path.join(assets(), "f")]);
  });

  it("索引表结构与版本号固定（gateway 直接读这份库）", async () => {
    await svc.importLocalAssets({ projectFolderName: P, sourcePaths: [source("a.png")] });
    svc.dispose();
    const db = new DatabaseSync(path.join(root, ".projects", P, ".hilo", "project-assets.sqlite"));
    expect(db.prepare("PRAGMA user_version").get()).toEqual({ user_version: 4 });
    expect(db.prepare("SELECT source, rel_path, name FROM asset_entries").all()).toEqual([{ source: "local", rel_path: "a.png", name: "a.png" }]);
    db.close();
  });

  it("项目目录名必须是单个安全的路径段；云端传输为空", async () => {
    await expect(svc.listAssets("../x")).rejects.toThrow("single safe path segment");
    expect(await svc.listTransfers()).toEqual([]);
    expect(await svc.hasActiveProjectTransfers(P)).toBe(false);
    expect(sanitizeAssetLeaf('a:b?.PNG')).toBe("a b.PNG");
  });
});
