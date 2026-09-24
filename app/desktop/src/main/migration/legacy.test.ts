import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { ProjectRecord } from "../ipc/types.js";
import { ProjectService } from "../project/project-service.js";
import { GlobalStore } from "../storage/global-store.js";
import { type LegacyMigrationDeps, migrateLegacyWorkspace } from "./legacy.js";

const SECRET = "sk-test-DO-NOT-LOG-1234567890";

let tmp: string;
let oldWs: string;
let legacyConfig: string;
let userData: string;
let projectsRoot: string;
let store: GlobalStore;
let logs: string[];

function write(file: string, content: string | object) {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, typeof content === "string" ? content : JSON.stringify(content, null, 2));
}

const imageNode = (id: string, rel: string, assetId?: string) => ({
  id,
  type: "image",
  positions: { workflow: { x: 0, y: 0 } },
  ...(assetId ? { assetId } : {}),
  data: { name: path.basename(rel), path: rel },
});

/** 仿旧版布局：两张有内容的画布 + 一张空的；共用和独有的媒体；一个只经 assetId 引用的文本节点。 */
function buildFixture(opts: { groups?: boolean } = {}) {
  write(path.join(oldWs, "images", "shared.png"), "PNG-shared");
  write(path.join(oldWs, "images", "only-a.png"), "PNG-a");
  write(path.join(oldWs, "images", "only-b.png"), "PNG-b");
  write(path.join(oldWs, "images", "unused.png"), "PNG-unused");
  write(path.join(oldWs, "videos", "clip.mp4"), "MP4-a");
  write(path.join(oldWs, "texts", "说明.md"), "# 文本节点\n内容");
  write(path.join(oldWs, ".hilo", "assets.json"), {
    version: 1,
    by_path: { "texts/说明.md": { id: "asset-text", path: "texts/说明.md", type: "text" } },
  });
  // 当前画布 A：canvas.json 是最新的，存档是旧的（只有 1 个节点）
  const canvasA = {
    version: 1,
    mode: "workflow",
    nodes: [
      imageNode("n1", "images/shared.png"),
      imageNode("n2", "images/only-a.png"),
      { id: "n3", type: "video", positions: {}, data: { path: "videos/clip.mp4" } },
      { id: "n4", type: "text", positions: {}, assetId: "asset-text", data: { name: "说明" } },
      // 绝对路径也认，并改写成相对路径
      imageNode("n5", path.join(oldWs, "images", "shared.png")),
    ],
    edges: [],
  };
  write(path.join(oldWs, ".hilo", "canvas.json"), canvasA);
  write(path.join(oldWs, ".hilo", "canvases", "ca.json"), { ...canvasA, nodes: [canvasA.nodes[0]] });
  write(path.join(oldWs, ".hilo", "canvases", "cb.json"), {
    version: 1,
    mode: "workflow",
    nodes: [imageNode("m1", "images/shared.png"), imageNode("m2", "images/only-b.png"), imageNode("m3", "images/gone.png")],
    edges: [],
  });
  write(path.join(oldWs, ".hilo", "canvases", "cempty.json"), { version: 1, mode: "workflow", nodes: [], edges: [] });
  write(path.join(oldWs, ".hilo", "canvases.json"), {
    current: "ca",
    list: [
      { id: "ca", name: "海边日落：15 秒 / 竖版 短片", updatedAt: 1_700_000_200, nodeCount: 5, ...(opts.groups ? { project: "p1" } : {}) },
      { id: "cb", name: "产品图", updatedAt: 1_700_000_100, nodeCount: 3 },
      { id: "cempty", name: "空画布", updatedAt: 1_700_000_000, nodeCount: 0 },
    ],
    projects: opts.groups ? [{ id: "p1", name: "广告片", created_at: 1 }] : [],
  });
  write(legacyConfig, {
    port: 8100,
    upstream: null,
    platform: { base_url: "https://maas.example/v1", api_key: SECRET, chat_model: "chat-x" },
    models: { image: "img-1", video: "vid-1", voice_map: {} },
    workspace: oldWs,
  });
}

/** 整个旧目录（含旧配置）的指纹：路径 + 内容 + mtime。 */
function fingerprint(): string {
  const h = createHash("sha256");
  const walk = (d: string) => {
    for (const n of readdirSync(d).sort()) {
      const p = path.join(d, n);
      const s = statSync(p);
      h.update(`${p}:${s.mtimeMs}`);
      if (s.isDirectory()) walk(p);
      else h.update(readFileSync(p));
    }
  };
  walk(oldWs);
  h.update(readFileSync(legacyConfig));
  return h.digest("hex");
}

let projects: ProjectService;

async function deps(over: Partial<LegacyMigrationDeps> = {}): Promise<LegacyMigrationDeps> {
  return {
    legacyConfigPath: legacyConfig,
    configPath: path.join(userData, "config.json"),
    projectsRoot,
    markerPath: path.join(userData, ".legacy-migrated"),
    statePath: path.join(userData, "legacy-migration", "state.json"),
    store,
    projects,
    log: (l) => logs.push(l),
    ...over,
  };
}

beforeEach(async () => {
  tmp = mkdtempSync(path.join(tmpdir(), "ov-migrate-"));
  oldWs = path.join(tmp, "Documents", "ovaijisuandesign");
  legacyConfig = path.join(tmp, "legacy-app", "config.json");
  userData = path.join(tmp, "userData");
  projectsRoot = path.join(tmp, "Movies", "蒜狸小助手", "Projects");
  store = new GlobalStore(path.join(userData, "hub-config.json"));
  logs = [];
  projects = new ProjectService({
    getProjects: () => store.get("projects") as ProjectRecord[],
    setProjects: (p) => store.replace("projects", p),
    projectsRoot: () => projectsRoot,
    journalDir: path.join(userData, "project-sync-journal"),
    trashFolder: async (p) => rmSync(p, { recursive: true, force: true }),
  });
  await projects.initialize();
});
afterEach(() => rmSync(tmp, { recursive: true, force: true }));

describe("旧版迁移", () => {
  it("每张非空画布成一个工作区，只复制引用到的文件，保持相对路径", async () => {
    buildFixture();
    const before = fingerprint();
    const r = await migrateLegacyWorkspace(await deps());
    expect(r.status).toBe("done");
    expect(r.workspaces.map((w) => path.basename(w.folderPath))).toEqual(["海边日落：15 秒 竖版 短片", "产品图"]);
    expect(r.skippedEmpty).toEqual(["cempty"]);

    const a = path.join(projectsRoot, "海边日落：15 秒 竖版 短片");
    const b = path.join(projectsRoot, "产品图");
    const files = (d: string) =>
      readdirSync(d, { recursive: true, withFileTypes: true })
        .filter((e) => e.isFile())
        .map((e) => path.relative(d, path.join(e.parentPath, e.name)))
        .sort();
    expect(files(a)).toEqual([".hilo/canvas.json", "images/only-a.png", "images/shared.png", "texts/说明.md", "videos/clip.mp4"]);
    expect(files(b)).toEqual([".hilo/canvas.json", "images/only-b.png", "images/shared.png"]);
    expect(readFileSync(path.join(a, "images", "shared.png"), "utf8")).toBe("PNG-shared");
    // 画布：当前那张用的是 canvas.json（5 个节点），不是旧存档；绝对路径改成了相对路径
    const canvasA = JSON.parse(readFileSync(path.join(a, ".hilo", "canvas.json"), "utf8"));
    expect(canvasA.nodes).toHaveLength(5);
    expect(canvasA.nodes[4].data.path).toBe("images/shared.png");
    expect(canvasA.nodes[3].assetId).toBe("asset-text");
    // 索引库留给 gateway 建
    expect(existsSync(path.join(a, ".hilo", "index.sqlite"))).toBe(false);
    expect(r.missingFiles).toBe(0);

    // 旧目录和旧配置原封不动
    expect(fingerprint()).toBe(before);
  });

  it("没有分组时建一个以旧工作区命名的项目，收下全部；最近列表按旧的更新时间排", async () => {
    buildFixture();
    const r = await migrateLegacyWorkspace(await deps());
    const list = projects.list();
    expect(list).toHaveLength(1);
    expect(list[0]!.name).toBe("ovaijisuandesign");
    expect(list[0]!.workspacePaths).toEqual(r.workspaces.map((w) => w.folderPath));
    const recents = store.get("recentWorkspaces");
    expect(recents.map((x) => path.basename(x.path))).toEqual(["海边日落：15 秒 竖版 短片", "产品图"]);
    expect(recents[0]!.openedAt).toBe(1_700_000_200_000);
    expect(recents.map((x) => x.manualOrder)).toEqual([0, 1]);
  });

  it("旧数据有分组：按分组建项目，没分组的不强行归入", async () => {
    buildFixture({ groups: true });
    const r = await migrateLegacyWorkspace(await deps());
    const list = projects.list();
    expect(list.map((p) => p.name)).toEqual(["广告片"]);
    expect(list[0]!.workspacePaths).toEqual([r.workspaces[0]!.folderPath]);
  });

  it("平台配置带到新配置，api_key 不进日志", async () => {
    buildFixture();
    const r = await migrateLegacyWorkspace(await deps());
    expect(r.configCarried).toBe(true);
    const cfg = JSON.parse(readFileSync(path.join(userData, "config.json"), "utf8"));
    expect(cfg.platform).toEqual({ base_url: "https://maas.example/v1", api_key: SECRET, chat_model: "chat-x" });
    expect(cfg.models).toEqual({ image: "img-1", video: "vid-1", voice_map: {} });
    expect(logs.join("\n")).not.toContain(SECRET);
    expect(JSON.stringify(r)).not.toContain(SECRET);
  });

  it("新配置已有的字段不覆盖", async () => {
    buildFixture();
    write(path.join(userData, "config.json"), { platform: { base_url: "https://mine", api_key: "", chat_model: "" }, models: { image: "keep" } });
    await migrateLegacyWorkspace(await deps());
    const cfg = JSON.parse(readFileSync(path.join(userData, "config.json"), "utf8"));
    expect(cfg.platform.base_url).toBe("https://mine");
    expect(cfg.platform.api_key).toBe(SECRET);
    expect(cfg.models.image).toBe("keep");
    expect(cfg.models.video).toBe("vid-1");
  });

  it("新配置路径就是旧配置时不写（旧文件只读）", async () => {
    buildFixture();
    const before = fingerprint();
    await migrateLegacyWorkspace(await deps({ configPath: legacyConfig }));
    expect(fingerprint()).toBe(before);
  });

  it("只跑一次：第二次什么都不做", async () => {
    buildFixture();
    await migrateLegacyWorkspace(await deps());
    const r2 = await migrateLegacyWorkspace(await deps());
    expect(r2.status).toBe("skipped");
    expect(readdirSync(projectsRoot).filter((n) => !n.startsWith(".")).sort()).toEqual(["产品图", "海边日落：15 秒 竖版 短片"]);
    expect(projects.list()).toHaveLength(1);
  });

  it("中途中断后重跑：接着做完，不产生 -2 副本、不重复建项目", async () => {
    buildFixture();
    await expect(
      migrateLegacyWorkspace(
        await deps({
          afterCanvas: (id) => {
            if (id === "ca") throw new Error("power loss");
          },
        }),
      ),
    ).rejects.toThrow("power loss");
    expect(existsSync(path.join(userData, ".legacy-migrated"))).toBe(false);
    const r = await migrateLegacyWorkspace(await deps());
    expect(r.status).toBe("done");
    expect(readdirSync(projectsRoot).filter((n) => !n.startsWith(".")).sort()).toEqual(["产品图", "海边日落：15 秒 竖版 短片"]);
    expect(projects.list()).toHaveLength(1);
    expect(store.get("recentWorkspaces")).toHaveLength(2);
  });

  it("项目根下已有同名目录：按规则追加 -2", async () => {
    buildFixture();
    mkdirSync(path.join(projectsRoot, "产品图"), { recursive: true });
    const r = await migrateLegacyWorkspace(await deps());
    expect(r.workspaces.map((w) => path.basename(w.folderPath))).toContain("产品图-2");
  });

  it("没有旧配置：只写标记", async () => {
    const r = await migrateLegacyWorkspace(await deps({ legacyConfigPath: path.join(tmp, "nope.json") }));
    expect(r.status).toBe("no-legacy");
    expect(existsSync(path.join(userData, ".legacy-migrated"))).toBe(true);
    expect(existsSync(projectsRoot)).toBe(false);
  });

  it("项目根落在旧目录里时拒绝写入", async () => {
    buildFixture();
    const before = fingerprint();
    await expect(migrateLegacyWorkspace(await deps({ projectsRoot: path.join(oldWs, "Projects") }))).rejects.toThrow("refusing to write into legacy data");
    expect(fingerprint()).toBe(before);
  });
});
