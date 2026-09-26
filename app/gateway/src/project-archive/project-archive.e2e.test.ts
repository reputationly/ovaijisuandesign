import { existsSync, mkdtempSync, realpathSync, renameSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import type { INestApplication } from "@nestjs/common";
import Database from "better-sqlite3";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../bootstrap.js";
import { AssetsService } from "../common/assets.service.js";
import { sanitizeToolPartData } from "./opencode-archive.js";
import { ProjectArchiveActivityService } from "./project-archive-activity.service.js";

/** 和 opencode 库同名同列（只建导入导出会碰到的那几张表）。 */
function makeOpencodeDb(file: string): Database.Database {
  const db = new Database(file);
  db.exec(`
    CREATE TABLE project (id text PRIMARY KEY, worktree text NOT NULL, vcs text, name text, time_created integer NOT NULL, time_updated integer NOT NULL, sandboxes text NOT NULL);
    CREATE TABLE session (id text PRIMARY KEY, project_id text NOT NULL, workspace_id text, parent_id text, slug text NOT NULL, directory text NOT NULL, title text NOT NULL, version text NOT NULL,
      share_url text, summary_additions integer, summary_deletions integer, summary_files integer, summary_diffs text, revert text, permission text,
      time_created integer NOT NULL, time_updated integer NOT NULL, time_compacting integer, time_archived integer);
    CREATE TABLE message (id text PRIMARY KEY, session_id text NOT NULL, time_created integer NOT NULL, time_updated integer NOT NULL, data text NOT NULL);
    CREATE TABLE part (id text PRIMARY KEY, message_id text NOT NULL, session_id text NOT NULL, time_created integer NOT NULL, time_updated integer NOT NULL, data text NOT NULL);
    CREATE TABLE todo (session_id text NOT NULL, content text NOT NULL, status text NOT NULL, priority text NOT NULL, position integer NOT NULL, time_created integer NOT NULL, time_updated integer NOT NULL, PRIMARY KEY (session_id, position));
  `);
  return db;
}

describe("项目归档：资产库快照 / 去重指纹 / 会话导出导入 / 导出租约", () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;
  let ws: string;
  let dbFile: string;
  let db: Database.Database;
  const other = "/Users/someone/Projects/elsewhere";

  beforeAll(async () => {
    ws = mkdtempSync(path.join(tmpdir(), "ov-archive-ws-"));
    dbFile = path.join(mkdtempSync(path.join(tmpdir(), "ov-archive-oc-")), "opencode.db");
    db = makeOpencodeDb(dbFile);
    const ins = (sql: string, ...args: unknown[]) => db.prepare(sql).run(...args);
    ins("INSERT INTO project VALUES ('global','/',NULL,NULL,1,1,'[]')");
    const sess = "INSERT INTO session (id, project_id, parent_id, slug, directory, title, version, permission, time_created, time_updated) VALUES (?,?,?,?,?,?,?,?,?,?)";
    ins(sess, "ses_root", "global", null, "s", ws, "海报", "1.0", null, 1000, 2000);
    ins(sess, "ses_child", "global", "ses_root", "c", ws, "子任务", "1.0", null, 1100, 2100);
    ins(sess, "ses_other", "global", null, "o", other, "别的项目", "1.0", null, 1200, 2200);
    ins("INSERT INTO message VALUES (?,?,?,?,?)", "msg_a", "ses_root", 1001, 1001, JSON.stringify({ role: "user", sessionID: "ses_root", path: { cwd: ws } }));
    ins("INSERT INTO message VALUES (?,?,?,?,?)", "msg_b", "ses_child", 1101, 1101, JSON.stringify({ role: "assistant", sessionID: "ses_child", parentID: "msg_a" }));
    ins("INSERT INTO part VALUES (?,?,?,?,?,?)", "prt_1", "msg_a", "ses_root", 1002, 1003, JSON.stringify({ type: "text", text: `看 ${path.join(ws, "a.png")}`, messageID: "msg_a" }));
    ins("INSERT INTO part VALUES (?,?,?,?,?,?)", "prt_2", "msg_b", "ses_child", 1102, 1150, JSON.stringify({ type: "tool", tool: "bash", state: { status: "running", input: { cmd: "ls" } } }));
    ins("INSERT INTO todo VALUES (?,?,?,?,?,?,?)", "ses_root", "出图", "pending", "high", 0, 1004, 1004);

    writeFileSync(path.join(ws, "a.png"), Buffer.alloc(600, 1));
    writeFileSync(path.join(ws, "b.png"), Buffer.alloc(600, 1));
    process.env.WORKSPACE_DIR = ws;
    process.env.HILO_OPENCODE_DB = dbFile;
    app = await createApp();
    await app.init();
    http = request(app.getHttpServer());
    await app.get(AssetsService).enroll("a.png");
    await app.get(AssetsService).enroll("b.png");
  });
  afterAll(async () => {
    await app.close();
    db.close();
    delete process.env.WORKSPACE_DIR;
    delete process.env.HILO_OPENCODE_DB;
  });

  it("prepare-export：VACUUM INTO 到 .hilo/.tmp/，快照里有资产行；工作区对不上 400", async () => {
    const r = await http.post("/api/projects/archive/prepare-export").send({ dir: ws });
    expect(r.status).toBe(201);
    expect(r.body.snapshotRelPath).toMatch(/^\.hilo\/\.tmp\/vault-snapshot-[0-9a-f-]{36}\.sqlite$/);
    const snap = path.join(ws, r.body.snapshotRelPath);
    expect(r.body.sizeBytes).toBeGreaterThan(0);
    const s = new Database(snap, { readonly: true });
    expect((s.prepare("SELECT path FROM assets ORDER BY path").all() as { path: string }[]).map((x) => x.path)).toEqual(["a.png", "b.png"]);
    s.close();
    expect(existsSync(`${snap}-wal`)).toBe(false);

    const bad = await http.post("/api/projects/archive/prepare-export").send({ dir: "/tmp/not-this-one" });
    expect(bad.status).toBe(400);
    expect((await http.post("/api/projects/archive/prepare-export").send({})).status).toBe(400);
  });

  it("asset-hashes：内容相同的两个文件拿到同一个键（q:<前 4MB 哈希>:<大小>）", async () => {
    const r = await http.post("/api/projects/archive/asset-hashes").send({ dir: ws });
    expect(Object.keys(r.body.hashes).sort()).toEqual(["a.png", "b.png"]);
    expect(r.body.hashes["a.png"]).toMatch(/^q:[0-9a-f]+:600$/);
    expect(r.body.hashes["a.png"]).toBe(r.body.hashes["b.png"]);
    expect((await http.post("/api/projects/archive/asset-hashes").send({ dir: "/elsewhere" })).status).toBe(400);
  });

  let payload: any;
  it("export：只导这个工作区的会话；sessionId 只导它和子会话", async () => {
    const r = await http.post("/api/projects/archive/export").send({ dir: ws });
    payload = r.body.payload;
    expect(payload).toMatchObject({ format: "opencode-sessions-v1", sourceDirectory: ws, sessionCount: 2 });
    expect(payload.sessions.map((s: any) => s.id)).toEqual(["ses_root", "ses_child"]);
    expect(payload.messages).toHaveLength(2);
    expect(payload.parts).toHaveLength(2);
    expect(payload.todos).toEqual([expect.objectContaining({ session_id: "ses_root", content: "出图", position: 0 })]);

    const sub = await http.post("/api/projects/archive/export").send({ dir: ws, sessionId: "ses_child" });
    expect(sub.body.payload.sessions.map((s: any) => s.id)).toEqual(["ses_child"]);
    const none = await http.post("/api/projects/archive/export").send({ dir: "/nowhere" });
    expect(none.body.payload).toMatchObject({ sessionCount: 0, sessions: [] });
  });

  it("import：换新 id、改写目录和路径、父子关系保留、没跑完的工具调用标成出错", async () => {
    const newDir = mkdtempSync(path.join(tmpdir(), "ov-archive-new-"));
    const r = await http.post("/api/projects/archive/import").send({ payload, oldDir: ws, newDir, dbPath: dbFile });
    expect(r.status).toBe(201);
    expect(r.body).toEqual({ insertedSessions: 2, insertedMessages: 2, insertedParts: 2, insertedTodos: 1 });

    const rows = db.prepare("SELECT * FROM session WHERE directory = ? ORDER BY time_created").all(realDir(newDir)) as any[];
    expect(rows).toHaveLength(2);
    const [root, child] = rows;
    expect(root.id).toMatch(/^ses_/);
    expect(root.id).not.toBe("ses_root");
    expect(child.parent_id).toBe(root.id);
    expect(root.title).toBe("海报");

    const msgs = db.prepare("SELECT * FROM message WHERE session_id IN (?, ?) ORDER BY time_created").all(root.id, child.id) as any[];
    expect(msgs[0].id).toMatch(/^msg_[0-9a-f]{12}/);
    const m0 = JSON.parse(msgs[0].data);
    expect(m0.sessionID).toBe(root.id);
    expect(m0.path.cwd).toBe(newDir);
    expect(JSON.parse(msgs[1].data).parentID).toBe(msgs[0].id);

    const parts = db.prepare("SELECT * FROM part WHERE session_id IN (?, ?) ORDER BY time_created").all(root.id, child.id) as any[];
    expect(JSON.parse(parts[0].data).text).toBe(`看 ${path.join(newDir, "a.png")}`);
    expect(JSON.parse(parts[1].data).state).toMatchObject({ status: "error", input: { cmd: "ls" }, time: { start: 1102, end: 1150 } });
    expect(db.prepare("SELECT count(*) AS n FROM todo WHERE session_id = ?").get(root.id)).toEqual({ n: 1 });

    // 同一个包导两次不冲突
    expect((await http.post("/api/projects/archive/import").send({ payload, oldDir: ws, newDir, dbPath: dbFile })).body.insertedSessions).toBe(2);
    // 格式不认识、库不存在都是 400
    expect((await http.post("/api/projects/archive/import").send({ payload: { ...payload, format: "v9" }, oldDir: ws, newDir })).status).toBe(400);
    expect((await http.post("/api/projects/archive/import").send({ payload, oldDir: ws, newDir, dbPath: "/no/such/opencode.db" })).status).toBe(400);
    // 空载荷直接回 0，不碰库
    expect((await http.post("/api/projects/archive/import").send({ payload: { ...payload, sessions: [] }, oldDir: ws, newDir, dbPath: "/no/such.db" })).body.insertedSessions).toBe(0);
  });

  it("rewrite-vault-paths：只改名叫 index.sqlite 的库，按 from→to 改 path", async () => {
    const snap = path.join(ws, (await http.post("/api/projects/archive/prepare-export").send({ dir: ws })).body.snapshotRelPath);
    const vault = path.join(path.dirname(snap), "index.sqlite");
    renameSync(snap, vault);
    const r = await http.post("/api/projects/archive/rewrite-vault-paths").send({ vaultDbPath: vault, renames: [{ from: "a.png", to: "a-1234.png" }] });
    expect(r.body).toEqual({ rewritten: 1 });
    const v = new Database(vault, { readonly: true });
    expect(v.prepare("SELECT count(*) AS n FROM assets WHERE path = 'a-1234.png'").get()).toEqual({ n: 1 });
    v.close();
    expect((await http.post("/api/projects/archive/rewrite-vault-paths").send({ vaultDbPath: dbFile, renames: [] })).status).toBe(500);
  });

  it("导出租约：begin / heartbeat / end；重复 begin 只续约；工作区不对 400", async () => {
    const lease = { dir: ws, leaseId: "l-1", ownerPid: process.pid, operation: "project-archive-export" };
    expect((await http.post("/api/projects/archive/activity/begin").send(lease)).body).toEqual({ started: true });
    expect((await http.post("/api/projects/archive/activity/begin").send(lease)).body).toEqual({ started: false });
    expect((await http.get("/api/health/activity")).body.active_user_operations).toBeGreaterThanOrEqual(1);
    expect((await http.post("/api/projects/archive/activity/heartbeat").send({ leaseId: "l-1" })).body).toEqual({ renewed: true });
    expect((await http.post("/api/projects/archive/activity/end").send({ leaseId: "l-1" })).body).toEqual({ released: true });
    expect((await http.post("/api/projects/archive/activity/end").send({ leaseId: "l-1" })).body).toEqual({ released: false });
    expect((await http.post("/api/projects/archive/activity/heartbeat").send({ leaseId: "l-1" })).body).toEqual({ renewed: false });
    expect((await http.post("/api/projects/archive/activity/begin").send({ ...lease, dir: "/elsewhere" })).status).toBe(400);
    expect((await http.post("/api/projects/archive/activity/begin").send({ ...lease, operation: "other" })).status).toBe(400);
  });

  it("租约回收：心跳过期且持有进程已退出才回收", () => {
    const svc = app.get(ProjectArchiveActivityService);
    svc.begin(ws, "alive", process.pid);
    svc.begin(ws, "dead", 2 ** 22 + 12345);
    const later = Date.now() + 60_000;
    expect(svc.sweepStaleLeases(later)).toBe(1);
    expect(svc.end("alive")).toBe(true);
    expect(svc.end("dead")).toBe(false);
  });
});

describe("工具调用块的清理", () => {
  it("已完成且时间完整的不动；缺时间的补上；非工具块原样", () => {
    const done = JSON.stringify({ type: "tool", state: { status: "completed", time: { start: 1, end: 2 } } });
    expect(sanitizeToolPartData(done, { startTime: 5, endTime: 6 })).toBe(done);
    expect(JSON.parse(sanitizeToolPartData(JSON.stringify({ type: "tool", state: { status: "error" } }), { startTime: 5, endTime: 6 })).state).toEqual({ status: "error", time: { start: 5, end: 6 } });
    expect(sanitizeToolPartData('{"type":"text"}', { startTime: 1, endTime: 2 })).toBe('{"type":"text"}');
    expect(sanitizeToolPartData("not json", { startTime: 1, endTime: 2 })).toBe("not json");
  });
});

function realDir(p: string): string {
  return realpathSync.native(p);
}
