/**
 * 项目归档里的会话部分：把 opencode 库里属于某个工作区的会话整组导出成 JSON，
 * 导入时换掉全部主键、把旧工作区路径改写成新路径，一次事务写回。
 *
 * 载荷格式（`opencode-sessions-v1`）和字段都是归档格式的一部分：别的机器导出的
 * 包要能在这里导进来，这里导出的包也要能在别处导进去，所以列名、排序、id 形状一个都不改。
 */
import { randomBytes } from "node:crypto";
import { existsSync, realpathSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import Database from "better-sqlite3";

export const ARCHIVE_FORMAT = "opencode-sessions-v1";
/** 导入的会话都挂在这个项目下：opencode 按目录找会话，project 只是外键要求的一行。 */
const PROJECT_ID = "global";
const INTERRUPTED_TOOL_ERROR = "Tool was interrupted before completion (recovered during project import)";

export interface ArchiveLogger {
  info(msg: string): void;
  warn(msg: string): void;
}

type Row = Record<string, unknown>;

export interface SessionRow extends Row {
  id: string;
  parent_id: string | null;
  directory: string;
  title: string;
  time_created: number;
}
export interface MessageRow extends Row {
  id: string;
  session_id: string;
  data: string;
  time_created: number;
  time_updated: number;
}
export interface PartRow extends Row {
  id: string;
  message_id: string;
  session_id: string;
  data: string;
  time_created: number;
  time_updated: number;
}
export interface TodoRow extends Row {
  session_id: string;
  content: string;
  position: number;
}

export interface OpenCodeArchivePayload {
  format: string;
  exportedAt: string;
  sourceDirectory: string;
  sessionCount: number;
  sessions: SessionRow[];
  messages: MessageRow[];
  parts: PartRow[];
  todos: TodoRow[];
}

export interface ImportResult {
  insertedSessions: number;
  insertedMessages: number;
  insertedParts: number;
  insertedTodos: number;
}

/**
 * opencode 库的位置：调用方给的优先（主进程知道 opencode 进程实际读哪一份），
 * 其次环境变量，最后是 opencode 自己的默认位置。
 */
export function getOpenCodeDbPath(override?: string): string {
  if (override) return override;
  const env = process.env.HILO_OPENCODE_DB;
  if (env) return env;
  const xdg = process.env.XDG_DATA_HOME;
  if (xdg) return path.join(xdg, "opencode", "opencode.db");
  return path.join(os.homedir(), ".local", "share", "opencode", "opencode.db");
}

/** 目录比较用 realpath：同一个工作区经符号链接打开时，会话里记的目录字面上不一样。 */
function canonicalDir(dir: string): string {
  const resolved = path.resolve(dir);
  try {
    return realpathSync.native(resolved);
  } catch {
    return resolved;
  }
}

function sameDir(a: string, b: string): boolean {
  const ca = canonicalDir(a);
  const cb = canonicalDir(b);
  return process.platform === "win32" ? ca.toLowerCase() === cb.toLowerCase() : ca === cb;
}

/** opencode 在 Windows 上记的目录用正斜杠。 */
function toSessionDirectory(dir: string): string {
  return process.platform === "win32" ? dir.replaceAll("\\", "/") : dir;
}

function emptyPayload(workspaceDir: string): OpenCodeArchivePayload {
  return {
    format: ARCHIVE_FORMAT,
    exportedAt: new Date().toISOString(),
    sourceDirectory: workspaceDir,
    sessionCount: 0,
    sessions: [],
    messages: [],
    parts: [],
    todos: [],
  };
}

/**
 * 导出一个工作区的全部会话；给了 `sessionId` 就只导它和它派生出的子会话。
 * 库不存在（从没开过对话）回 null —— 调用方当"没有会话可带"，不是错误。
 */
export function exportOpenCodeData(workspaceDir: string, log: ArchiveLogger, opts: { sessionId?: string; dbPath?: string } = {}): OpenCodeArchivePayload | null {
  const dbPath = getOpenCodeDbPath(opts.dbPath);
  if (!existsSync(dbPath)) {
    log.info(`没有 opencode 库 ${dbPath}，跳过会话导出`);
    return null;
  }
  const db = new Database(dbPath, { readonly: true, fileMustExist: true });
  try {
    const sessions = opts.sessionId ? selectSessionSubtree(db, workspaceDir, opts.sessionId) : selectSessionsForWorkspace(db, workspaceDir);
    if (sessions.length === 0) {
      log.info(`没有匹配的会话：${opts.sessionId ? `sessionId=${opts.sessionId} ` : ""}directory=${workspaceDir}`);
      return emptyPayload(workspaceDir);
    }
    const ids = sessions.map((s) => s.id);
    const ph = ids.map(() => "?").join(",");
    const messages = db.prepare(`SELECT * FROM message WHERE session_id IN (${ph}) ORDER BY session_id, time_created`).all(...ids) as MessageRow[];
    const parts = db.prepare(`SELECT * FROM part WHERE session_id IN (${ph}) ORDER BY session_id, time_created`).all(...ids) as PartRow[];
    const todos = db.prepare(`SELECT * FROM todo WHERE session_id IN (${ph}) ORDER BY session_id, position`).all(...ids) as TodoRow[];
    log.info(`导出会话 sessions=${sessions.length} messages=${messages.length} parts=${parts.length} todos=${todos.length}`);
    return { ...emptyPayload(workspaceDir), sessionCount: sessions.length, sessions, messages, parts, todos };
  } finally {
    db.close();
  }
}

function selectSessionsForWorkspace(db: Database.Database, workspaceDir: string): SessionRow[] {
  const dirs = (db.prepare("SELECT DISTINCT directory FROM session").all() as { directory: string }[])
    .map((r) => r.directory)
    .filter((d) => sameDir(d, workspaceDir));
  if (dirs.length === 0) return [];
  return db.prepare(`SELECT * FROM session WHERE directory IN (${dirs.map(() => "?").join(",")}) ORDER BY time_created`).all(...dirs) as SessionRow[];
}

function selectSessionSubtree(db: Database.Database, workspaceDir: string, rootId: string): SessionRow[] {
  const root = db.prepare("SELECT * FROM session WHERE id = ?").get(rootId) as SessionRow | undefined;
  if (!root || !sameDir(root.directory, workspaceDir)) return [];
  return db
    .prepare(
      `WITH RECURSIVE session_tree(id) AS (
         SELECT id FROM session WHERE id = ?
         UNION ALL
         SELECT s.id FROM session s JOIN session_tree t ON s.parent_id = t.id
       )
       SELECT s.* FROM session s JOIN session_tree st ON s.id = st.id ORDER BY s.time_created`,
    )
    .all(rootId) as SessionRow[];
}

// ---------------------------------------------------------------------------
// 导入
// ---------------------------------------------------------------------------

function newId(prefix: string): string {
  return `${prefix}_${randomBytes(16).toString("base64url").replace(/[-_]/g, "").slice(0, 22)}`;
}

const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const ascCounters = new Map<string, { ts: number; counter: number }>();

function randomBase62(n: number): string {
  const bytes = randomBytes(n);
  let out = "";
  for (let i = 0; i < n; i++) out += BASE62[bytes[i]! % 62];
  return out;
}

/**
 * 按时间递增的 id（和 opencode 自己生成的形状一致）。opencode 按 part.id 排一条消息里的块，
 * 随机 id 会把块的顺序打乱 —— 工具调用和它的结果不再相邻，模型那边直接拒收整段历史。
 */
function newAscendingId(prefix: string, timeCreated: number): string {
  const state = ascCounters.get(prefix) ?? { ts: 0, counter: 0 };
  if (timeCreated !== state.ts) {
    state.ts = timeCreated;
    state.counter = 0;
  }
  state.counter += 1;
  ascCounters.set(prefix, state);
  const n = BigInt(timeCreated) * 4096n + BigInt(state.counter);
  const timeBytes = Buffer.alloc(6);
  for (let i = 0; i < 6; i++) timeBytes[i] = Number((n >> BigInt(40 - 8 * i)) & 255n);
  return `${prefix}_${timeBytes.toString("hex")}${randomBase62(14)}`;
}

/** 按 JSON 字符串形式替换：路径在 data 里是转义过的（Windows 的反斜杠成了 `\\`）。 */
export function rewritePaths(json: string, oldDir: string | undefined, newDir: string): string {
  if (!oldDir || oldDir === newDir) return json;
  const from = JSON.stringify(oldDir).slice(1, -1);
  const to = JSON.stringify(newDir).slice(1, -1);
  return json.split(from).join(to);
}

/** 长的先换：短 id 是长 id 前缀时，先换短的会把长的换坏。 */
export function rewriteIds(json: string, idMap: Map<string, string>): string {
  if (idMap.size === 0) return json;
  let out = json;
  for (const [from, to] of [...idMap.entries()].sort((a, b) => b[0].length - a[0].length)) {
    if (from === to || !out.includes(from)) continue;
    out = out.split(from).join(to);
  }
  return out;
}

function isValidTime(t: unknown): boolean {
  if (!t || typeof t !== "object" || Array.isArray(t)) return false;
  const o = t as Record<string, unknown>;
  return typeof o.start === "number" && typeof o.end === "number";
}

function buildTime(existing: unknown, start: number | undefined, end: number): { start: number; end: number } {
  const cur = existing && typeof existing === "object" && !Array.isArray(existing) ? (existing as Record<string, unknown>) : {};
  return { start: typeof cur.start === "number" ? cur.start : (start ?? end), end: typeof cur.end === "number" ? cur.end : end };
}

/**
 * 导出时还在跑的工具调用（状态 pending / running）导进来后永远不会有结果：
 * 标成出错并补全输入和时间，否则下一轮对话把这段历史发给模型时，
 * 一个没有结果的工具调用会让整段请求被拒。已结束的只补缺的时间。
 */
export function sanitizeToolPartData(json: string, time: { startTime: number; endTime: number }): string {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(json) as Record<string, unknown>;
  } catch {
    return json;
  }
  if (parsed.type !== "tool") return json;
  const state = parsed.state;
  let status: string | undefined;
  let input: unknown;
  let metadata: unknown;
  let t: unknown;
  let title: unknown;
  if (typeof state === "string") status = state;
  else if (state && typeof state === "object") {
    const s = state as Record<string, unknown>;
    status = typeof s.status === "string" ? s.status : undefined;
    input = s.input;
    metadata = s.metadata;
    t = s.time;
    title = s.title;
  }
  if (status === "completed" || status === "error") {
    if (isValidTime(t)) return json;
    const base = state && typeof state === "object" && !Array.isArray(state) ? { ...(state as Record<string, unknown>) } : { status };
    parsed.state = { ...base, status, time: buildTime(t, time.startTime, time.endTime) };
    return JSON.stringify(parsed);
  }
  parsed.state = {
    status: "error",
    error: INTERRUPTED_TOOL_ERROR,
    input: input !== undefined ? input : {},
    ...(title !== undefined ? { title } : {}),
    ...(metadata !== undefined ? { metadata } : {}),
    time: buildTime(t, time.startTime, time.endTime),
  };
  return JSON.stringify(parsed);
}

/**
 * 把导出的载荷写进本机 opencode 库：会话 / 消息 / 块全部换新 id（同一个包导两次不冲突），
 * 消息和块里的旧 id、旧工作区路径一并改写。一个事务里做完，要么全进要么全不进。
 */
export function importOpenCodeData(payload: OpenCodeArchivePayload, opts: { newWorkspaceDir: string; oldWorkspaceDir?: string; dbPath?: string }, log: ArchiveLogger): ImportResult {
  if (payload.format !== ARCHIVE_FORMAT) throw new Error(`Unsupported OpenCode archive format: ${payload.format}`);
  if (!Array.isArray(payload.sessions) || payload.sessions.length === 0) {
    return { insertedSessions: 0, insertedMessages: 0, insertedParts: 0, insertedTodos: 0 };
  }
  const dbPath = getOpenCodeDbPath(opts.dbPath);
  if (!existsSync(dbPath)) throw new Error(`OpenCode db not found at ${dbPath}. Start the app once to initialize the schema before importing.`);
  const db = new Database(dbPath);
  try {
    db.pragma("busy_timeout = 5000");
    const directory = toSessionDirectory(canonicalDir(opts.newWorkspaceDir));
    const sessionIds = new Map<string, string>();
    for (const s of payload.sessions) sessionIds.set(s.id, newId("ses"));
    const messageIds = new Map<string, string>();
    for (const m of payload.messages ?? []) messageIds.set(m.id, newAscendingId("msg", m.time_created));

    const ensureProject = db.prepare(
      `INSERT OR IGNORE INTO project (id, worktree, sandboxes, time_created, time_updated) VALUES (@id, @worktree, @sandboxes, @time_created, @time_updated)`,
    );
    const insertSession = db.prepare(`
      INSERT INTO session (
        id, project_id, parent_id, slug, directory, title, version,
        share_url, summary_additions, summary_deletions, summary_files,
        summary_diffs, revert, permission,
        time_created, time_updated, time_compacting, time_archived, workspace_id
      ) VALUES (
        @id, @project_id, @parent_id, @slug, @directory, @title, @version,
        @share_url, @summary_additions, @summary_deletions, @summary_files,
        @summary_diffs, @revert, @permission,
        @time_created, @time_updated, @time_compacting, @time_archived, @workspace_id
      )`);
    const insertMessage = db.prepare(`INSERT INTO message (id, session_id, time_created, time_updated, data) VALUES (@id, @session_id, @time_created, @time_updated, @data)`);
    const insertPart = db.prepare(
      `INSERT INTO part (id, message_id, session_id, time_created, time_updated, data) VALUES (@id, @message_id, @session_id, @time_created, @time_updated, @data)`,
    );
    const insertTodo = db.prepare(
      `INSERT INTO todo (session_id, content, status, priority, position, time_created, time_updated) VALUES (@session_id, @content, @status, @priority, @position, @time_created, @time_updated)`,
    );

    const rewrite = (data: string) => rewriteIds(rewriteIds(rewritePaths(data, opts.oldWorkspaceDir, opts.newWorkspaceDir), sessionIds), messageIds);

    const tx = db.transaction(() => {
      const now = Date.now();
      ensureProject.run({ id: PROJECT_ID, worktree: "/", sandboxes: "[]", time_created: now, time_updated: now });
      const counts = { sessions: 0, messages: 0, parts: 0, todos: 0 };
      for (const s of payload.sessions) {
        const id = sessionIds.get(s.id)!;
        insertSession.run({
          id,
          project_id: PROJECT_ID,
          parent_id: s.parent_id ? (sessionIds.get(s.parent_id) ?? null) : null,
          slug: s.slug ?? "",
          directory,
          title: s.title,
          version: s.version ?? "",
          share_url: null,
          summary_additions: s.summary_additions ?? null,
          summary_deletions: s.summary_deletions ?? null,
          summary_files: s.summary_files ?? null,
          summary_diffs: null,
          revert: null,
          permission: s.permission ?? null,
          time_created: s.time_created,
          time_updated: s.time_updated ?? s.time_created,
          time_compacting: s.time_compacting ?? null,
          time_archived: s.time_archived ?? null,
          workspace_id: null,
        });
        counts.sessions++;
      }
      for (const m of payload.messages ?? []) {
        const sid = sessionIds.get(m.session_id);
        const mid = messageIds.get(m.id);
        if (!sid || !mid) continue;
        insertMessage.run({ id: mid, session_id: sid, time_created: m.time_created, time_updated: m.time_updated, data: rewrite(m.data) });
        counts.messages++;
      }
      for (const p of payload.parts ?? []) {
        const sid = sessionIds.get(p.session_id);
        const mid = messageIds.get(p.message_id);
        if (!sid || !mid) continue;
        const data = sanitizeToolPartData(rewrite(p.data), { startTime: p.time_created, endTime: Math.max(p.time_created, p.time_updated) });
        insertPart.run({ id: newAscendingId("prt", p.time_created), message_id: mid, session_id: sid, time_created: p.time_created, time_updated: p.time_updated, data });
        counts.parts++;
      }
      for (const t of payload.todos ?? []) {
        const sid = sessionIds.get(t.session_id);
        if (!sid) continue;
        insertTodo.run({
          session_id: sid,
          content: t.content,
          status: t.status ?? "pending",
          priority: t.priority ?? "medium",
          position: t.position,
          time_created: t.time_created ?? Date.now(),
          time_updated: t.time_updated ?? t.time_created ?? Date.now(),
        });
        counts.todos++;
      }
      return counts;
    });
    const r = tx();
    log.info(`导入会话 sessions=${r.sessions} messages=${r.messages} parts=${r.parts} todos=${r.todos} → ${opts.newWorkspaceDir}`);
    return { insertedSessions: r.sessions, insertedMessages: r.messages, insertedParts: r.parts, insertedTodos: r.todos };
  } finally {
    db.close();
  }
}
