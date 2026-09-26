import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import yauzl from "yauzl";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import type { GatewayBinding } from "../ipc/types.js";
import { exportProjectToZip, importProjectFromZip, isExcluded, ProjectExportDestinationError, zipHasEocd } from "./archive-bundler.js";
import { ProjectArchiveService } from "./project-archive-service.js";

const REPO = path.resolve(__dirname, "../../../../..");
const SAMPLE = path.join(REPO, "assets", "project-templates", "sample-project.zip");
const quiet = { info() {}, warn() {} };

/** 假 gateway：记下每个请求；快照用 node:sqlite 真写一个库，会话导出回一个会话。 */
function fakeGateway() {
  const calls: { url: string; body: any; headers: Record<string, unknown> }[] = [];
  const server = createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      const body = raw ? JSON.parse(raw) : undefined;
      calls.push({ url: req.url!, body, headers: req.headers });
      res.setHeader("content-type", "application/json");
      const send = (v: unknown) => res.end(JSON.stringify(v));
      switch (req.url) {
        case "/api/projects/archive/activity/begin":
          return send({ started: true });
        case "/api/projects/archive/activity/heartbeat":
          return send({ renewed: true });
        case "/api/projects/archive/activity/end":
          return send({ released: true });
        case "/api/projects/archive/prepare-export": {
          const rel = ".hilo/.tmp/vault-snapshot-test.sqlite";
          mkdirSync(path.join(body.dir, ".hilo", ".tmp"), { recursive: true });
          const db = new DatabaseSync(path.join(body.dir, rel));
          db.exec("CREATE TABLE assets (id TEXT, path TEXT); INSERT INTO assets VALUES ('id-a', 'a.png'), ('id-b', 'b.png')");
          db.close();
          return send({ snapshotRelPath: rel, sizeBytes: statSync(path.join(body.dir, rel)).size });
        }
        case "/api/projects/archive/asset-hashes":
          return send({ hashes: { "a.png": "q:abc:600", "b.png": "q:abc:600" } });
        case "/api/projects/archive/export":
          return send({
            payload: {
              format: "opencode-sessions-v1",
              exportedAt: "2026-01-01T00:00:00Z",
              sourceDirectory: body.dir,
              sessionCount: 1,
              sessions: [{ id: "ses_1", directory: body.dir, title: "t", time_created: 1 }],
              messages: [],
              parts: [],
              todos: [],
            },
          });
        case "/api/projects/archive/import":
          return send({ insertedSessions: body.payload.sessions.length, insertedMessages: 0, insertedParts: 0, insertedTodos: 0 });
        case "/api/projects/archive/rewrite-vault-paths":
          return send({ rewritten: 0 });
      }
      res.statusCode = 404;
      res.end("{}");
    });
  });
  return { server, calls };
}

function zipEntries(zip: string): Promise<Map<string, Buffer>> {
  return new Promise((resolve, reject) => {
    yauzl.open(zip, { lazyEntries: true }, (err, zf) => {
      if (err || !zf) return reject(err);
      const out = new Map<string, Buffer>();
      zf.on("entry", (e: yauzl.Entry) =>
        zf.openReadStream(e, (e2, s) => {
          if (e2 || !s) return reject(e2);
          const chunks: Buffer[] = [];
          s.on("data", (c) => chunks.push(c));
          s.on("end", () => {
            out.set(e.fileName, Buffer.concat(chunks));
            zf.readEntry();
          });
        }),
      );
      zf.on("end", () => resolve(out));
      zf.readEntry();
    });
  });
}

describe("项目归档：导出 → 导入往返", () => {
  let gw: ReturnType<typeof fakeGateway>;
  let server: Server;
  let url: string;
  let ws: string;
  let out: string;
  let projectsRoot: string;
  let binding: GatewayBinding;

  beforeAll(async () => {
    gw = fakeGateway();
    server = gw.server;
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    binding = { baseUrl: url, claim: "c".repeat(64), instanceId: "inst-1", generation: 2 };
  });
  afterAll(async () => {
    await new Promise<void>((r) => server.close(() => r()));
  });
  beforeEach(() => {
    gw.calls.length = 0;
    const base = mkdtempSync(path.join(tmpdir(), "ov-archive-"));
    ws = path.join(base, "海报项目");
    out = path.join(base, "out");
    projectsRoot = path.join(base, "Projects");
    mkdirSync(path.join(ws, "sub"), { recursive: true });
    mkdirSync(path.join(ws, ".hilo", ".thumbnails"), { recursive: true });
    mkdirSync(path.join(ws, "logs"), { recursive: true });
    mkdirSync(path.join(ws, "node_modules", "x"), { recursive: true });
    writeFileSync(path.join(ws, "a.png"), Buffer.alloc(600, 7));
    writeFileSync(path.join(ws, "b.png"), Buffer.alloc(600, 7));
    writeFileSync(path.join(ws, "sub", "c.txt"), "hello");
    writeFileSync(path.join(ws, ".hilo", "canvas.json"), JSON.stringify({ version: 1, nodes: [] }));
    writeFileSync(path.join(ws, ".hilo", "index.sqlite"), "LIVE-DB-SHOULD-NOT-SHIP");
    writeFileSync(path.join(ws, ".hilo", "index.sqlite-wal"), "wal");
    writeFileSync(path.join(ws, ".hilo", ".thumbnails", "t.jpg"), "thumb");
    writeFileSync(path.join(ws, "logs", "opencode-trace.jsonl"), "secret-token");
    writeFileSync(path.join(ws, "node_modules", "x", "i.js"), "x");
  });

  it("包里：文件原样、同内容只存一份 + 别名表、资产库是快照、会话和 manifest；排除项不进包；带工作区身份头", async () => {
    const progress: number[] = [];
    const r = await exportProjectToZip(ws, path.join(out, "p.zip"), "3.0.16", url, quiet, { workspaceBinding: binding, onProgress: (p) => progress.push(p.processedBytes) });
    expect(r).toMatchObject({ filePath: path.join(out, "p.zip"), opencodeSessionCount: 1, dedupAliasCount: 1 });
    expect(await zipHasEocd(r.filePath)).toBe(true);
    const entries = await zipEntries(r.filePath);
    expect([...entries.keys()].sort()).toEqual([".hilo/canvas.json", ".hilo/index.sqlite", ".hub/aliases.json", ".hub/opencode-export.json", "a.png", "manifest.json", "sub/c.txt"]);
    expect(JSON.parse(entries.get(".hub/aliases.json")!.toString())).toEqual({ version: 1, entries: [{ from: "b.png", to: "a.png" }] });
    expect(entries.get(".hilo/index.sqlite")!.toString()).not.toContain("LIVE-DB");
    expect(JSON.parse(entries.get("manifest.json")!.toString())).toMatchObject({
      magic: "minimax-hub-project",
      manifestVersion: 2,
      name: "海报项目",
      appVersion: "3.0.16",
      sourceDirectory: ws,
      opencodeSessionCount: 1,
      archiveFormat: 2,
      dedupAliasCount: 1,
    });
    // 快照用完就删；包旁边不留 .part
    expect(existsSync(path.join(ws, ".hilo", ".tmp", "vault-snapshot-test.sqlite"))).toBe(false);
    expect(readdirSync(out)).toEqual(["p.zip"]);
    // 租约 begin → end，快照 / 指纹 / 会话导出都带身份头
    const urls = gw.calls.map((c) => c.url);
    expect(urls[0]).toBe("/api/projects/archive/activity/begin");
    expect(urls.at(-1)).toBe("/api/projects/archive/activity/end");
    expect(gw.calls[0]!.body).toMatchObject({ dir: ws, ownerPid: process.pid, operation: "project-archive-export" });
    for (const c of gw.calls) expect(c.headers["x-hilo-workspace"]).toBe(binding.claim);
  });

  it("导入：别名补回、manifest / .hub 删掉、目录名来自 manifest、会话带新旧目录交给应用级 gateway", async () => {
    const zip = (await exportProjectToZip(ws, path.join(out, "p.zip"), "3.0.16", url, quiet, { workspaceBinding: binding })).filePath;
    gw.calls.length = 0;
    const r = await importProjectFromZip(zip, { projectsRoot, gatewayUrl: url, opencodeDbPath: "/x/opencode.db", log: quiet });
    expect(r).toMatchObject({ targetDir: path.join(projectsRoot, "海报项目"), name: "海报项目", originalName: "海报项目", opencodeSessionCount: 1, expectedOpencodeSessionCount: 1, rematerializedAliasCount: 1 });
    const t = r.targetDir;
    expect(readFileSync(path.join(t, "b.png"))).toEqual(Buffer.alloc(600, 7));
    expect(readFileSync(path.join(t, "sub", "c.txt"), "utf8")).toBe("hello");
    expect(existsSync(path.join(t, "manifest.json"))).toBe(false);
    expect(existsSync(path.join(t, ".hub"))).toBe(false);
    const db = new DatabaseSync(path.join(t, ".hilo", "index.sqlite"), { readOnly: true });
    expect(db.prepare("SELECT count(*) AS n FROM assets").get()).toEqual({ n: 2 });
    db.close();
    const imp = gw.calls.find((c) => c.url === "/api/projects/archive/import")!;
    expect(imp.body).toMatchObject({ oldDir: ws, newDir: t, dbPath: "/x/opencode.db" });
    // 中转目录清干净了
    expect(readdirSync(path.join(projectsRoot, ".staging"))).toEqual([]);

    // 再导一次：名字加 -2
    const again = await importProjectFromZip(zip, { projectsRoot, gatewayUrl: url, opencodeDbPath: "", log: quiet });
    expect(again.name).toBe("海报项目-2");
    expect(gw.calls.filter((c) => c.url === "/api/projects/archive/import").at(-1)!.body.dbPath).toBeUndefined();
  });

  it("会话导入失败：文件照样落地，结果里带 opencodeImportError", async () => {
    const zip = (await exportProjectToZip(ws, path.join(out, "p.zip"), "3.0.16", url, quiet, { workspaceBinding: binding })).filePath;
    const r = await importProjectFromZip(zip, { projectsRoot, gatewayUrl: `${url}/nope`, opencodeDbPath: "", log: quiet });
    expect(r.opencodeSessionCount).toBe(0);
    expect(r.expectedOpencodeSessionCount).toBe(1);
    expect(r.opencodeImportError).toMatch(/404/);
    expect(existsSync(path.join(r.targetDir, "a.png"))).toBe(true);
  });

  it("包不能存进项目目录里；不是项目包的 zip 拒绝", async () => {
    await expect(exportProjectToZip(ws, path.join(ws, "self.zip"), "1", url, quiet, { workspaceBinding: binding })).rejects.toBeInstanceOf(ProjectExportDestinationError);
    const zip = (await exportProjectToZip(path.join(ws, "sub"), path.join(out, "sub.zip"), "1", "", quiet)).filePath;
    // 没有 gateway 也能打包（不带会话、不带资产库）
    expect([...(await zipEntries(zip)).keys()].sort()).toEqual(["c.txt", "manifest.json"]);
    writeFileSync(path.join(out, "junk.zip"), "not a zip");
    await expect(importProjectFromZip(path.join(out, "junk.zip"), { projectsRoot, gatewayUrl: url, opencodeDbPath: "", log: quiet })).rejects.toThrow(/incomplete or corrupted|central directory/);
  });

  it.skipIf(!existsSync(SAMPLE))("示例项目包：导入成功，去重掉的两个文件补回来，没有会话", async () => {
    const r = await importProjectFromZip(SAMPLE, { projectsRoot, gatewayUrl: url, opencodeDbPath: "", log: quiet });
    expect(r).toMatchObject({ originalName: "查看项目使用指南-2-6", opencodeSessionCount: 0, expectedOpencodeSessionCount: 0, rematerializedAliasCount: 2 });
    const names = readdirSync(r.targetDir).sort();
    expect(names).toEqual(expect.arrayContaining([".hilo", "MiniMax Design 项目库.pdf", "欢迎使用MiniMax Design项目库.pdf", "feishu-iframe.html", "feishu-iframe(1).html", "create-project-cta.html"]));
    expect(existsSync(path.join(r.targetDir, ".hilo", "canvas.json"))).toBe(true);
    expect(existsSync(path.join(r.targetDir, ".hilo", "index.sqlite"))).toBe(true);
    expect(gw.calls.some((c) => c.url === "/api/projects/archive/import")).toBe(false);
  });

  it("排除规则", () => {
    for (const p of ["node_modules", "a/.git/x", ".hilo/.thumbnails/t.jpg", ".hilo/index.sqlite-wal", ".hilo/index.sqlite", "logs/x", ".hilo/.tmp/s.sqlite", "x/__pycache__/y.pyc"]) expect(isExcluded(p), p).toBe(true);
    for (const p of ["a.png", ".hilo/canvas.json", ".hilo/text-versions/objects/ab", "dialogs/x"]) expect(isExcluded(p), p).toBe(false);
  });
});

describe("projectArchive 频道", () => {
  let gw: ReturnType<typeof fakeGateway>;
  let server: Server;
  let url: string;
  let root: string;
  const logs: string[] = [];

  beforeAll(async () => {
    gw = fakeGateway();
    server = gw.server;
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterAll(async () => {
    await new Promise<void>((r) => server.close(() => r()));
  });
  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), "ov-archive-svc-"));
  });

  function service(over: Partial<ConstructorParameters<typeof ProjectArchiveService>[0]> = {}) {
    return new ProjectArchiveService({
      appVersion: "3.0.16",
      projectsRoot: () => path.join(root, "Projects"),
      opencodeDbPath: "/db/opencode.db",
      workspaceBinding: () => undefined,
      appGatewayUrl: () => url,
      templateDirs: () => [path.join(root, "missing"), path.dirname(SAMPLE)],
      downloadsDir: () => root,
      showSaveDialog: async () => ({ canceled: true }),
      showOpenDialog: async () => ({ canceled: true, filePaths: [] }),
      log: (l) => logs.push(l),
      ...over,
    });
  }

  it("导出：工作区没起来回 workspace_not_ready；保存框取消回 dialog；成功回路径和会话数", async () => {
    expect(await service().exportProject(root)).toEqual({ cancelled: false, failureReason: "workspace_not_ready" });
    const ws = path.join(root, "ws");
    mkdirSync(ws);
    writeFileSync(path.join(ws, "a.txt"), "a");
    const binding = { baseUrl: url, claim: "c", instanceId: "i", generation: 1 };
    expect(await service({ workspaceBinding: () => binding }).exportProject(ws)).toEqual({ cancelled: true, cancelReason: "dialog" });
    const dest = path.join(root, "ws.zip");
    let defaultPath: string | undefined;
    const svc = service({ workspaceBinding: () => binding, showSaveDialog: async (o) => ((defaultPath = o.defaultPath), { canceled: false, filePath: dest }) });
    const events: unknown[] = [];
    svc.onProgress((e) => events.push(e));
    expect(await svc.exportProject(ws)).toMatchObject({ cancelled: false, filePath: dest, opencodeSessionCount: 1 });
    expect(defaultPath).toMatch(/ws-\d{4}-\d{2}-\d{2}T.*\.zip$/);
    // 存进项目自己里面：渲染层认识的失败原因
    const inside = service({ workspaceBinding: () => binding, showSaveDialog: async () => ({ canceled: false, filePath: path.join(ws, "x.zip") }) });
    expect(await inside.exportProject(ws)).toEqual({ cancelled: false, failureReason: "destination_inside_project" });
  });

  it.skipIf(!existsSync(SAMPLE))("自带模板：按目录顺序找到 sample-project.zip 导入；不认识的 id / 找不到文件报错", async () => {
    const svc = service();
    const events: any[] = [];
    svc.onProgress((e) => events.push(e));
    const r = await svc.importBundledProject("sample-project");
    expect(r).toMatchObject({ cancelled: false, name: "查看项目使用指南-2-6", originalName: "查看项目使用指南-2-6", opencodeSessionCount: 0, expectedOpencodeSessionCount: 0 });
    expect(existsSync(path.join(root, "Projects", "查看项目使用指南-2-6", ".hilo", "canvas.json"))).toBe(true);
    expect(events.every((e) => e.kind === "import")).toBe(true);
    await expect(svc.importBundledProject("nope")).rejects.toThrow(/Unknown bundled project template/);
    await expect(service({ templateDirs: () => [root] }).importBundledProject("h3-playground")).rejects.toThrow(/missing: h3-playground/);
    await expect(service({ appGatewayUrl: () => undefined }).importBundledProject("sample-project")).rejects.toThrow(/not ready/);
  });

  it("导入：打开框取消回 cancelled；远程模板地址一律拒绝", async () => {
    expect(await service().importProject()).toEqual({ cancelled: true });
    await expect(service().importProjectFromUrl("https://cdn.example.com/x.zip")).rejects.toThrow(/not allowed/);
    expect(await service().cancelExport()).toBe(false);
  });
});
