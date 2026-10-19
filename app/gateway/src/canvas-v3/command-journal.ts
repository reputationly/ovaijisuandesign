import { AsyncLocalStorage } from "node:async_hooks";
import { createHash } from "node:crypto";
import { closeSync, constants, existsSync, fstatSync, lstatSync, openSync, readSync, realpathSync, unlinkSync } from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";

import { canvasV3Error } from "./errors.js";
import { canvasV3CanonicalJson, canvasV3RequestHash, type CanvasV3CommandRequest } from "./store.js";

const context = new AsyncLocalStorage<{ id: string; journal: CanvasCommandJournal }>();
const quote = (name: string) => `"${name.replaceAll('"', '""')}"`;
const tables = new Set([
  "composition_types",
  "compositions",
  "composition_members",
  "composition_attributes",
  "project_composition_commands",
  "project_editor_compositions",
  "project_editor_composition_members",
  "generation_rounds",
  "generation_slots",
  "generation_round_commands",
  "generation_task_round_commands",
  "resources",
  "resource_versions",
  "resource_document_versions",
  "resource_version_dependencies",
  "resource_version_import",
  "project_resource_commands",
]);

export function resolveWorkspaceResourceDatabasePath(workspaceDir: string): string {
  return path.join(workspaceDir, ".hilo", "index.sqlite");
}

function stamp(stat: { dev: number; ino: number; size: number; mtimeMs: number; ctimeMs: number }): string {
  return JSON.stringify([stat.dev, stat.ino, stat.size, stat.mtimeMs, stat.ctimeMs]);
}

/** 复制进项目的文件在恢复回滚时要能确认还是当时那一份，所以指纹里同时放 inode 和内容哈希。 */
export function copiedFileFingerprint(file: string, expected: { dev: number; ino: number; size: number; mtimeMs: number; ctimeMs: number }): string {
  const fd = openSync(file, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const before = fstatSync(fd);
    if (!before.isFile() || stamp(before) !== stamp(expected)) throw new Error("Copied file changed while fingerprinting");
    const hash = createHash("sha256");
    const buffer = Buffer.allocUnsafe(64 * 1024);
    for (;;) {
      const length = readSync(fd, buffer, 0, buffer.length, null);
      if (length === 0) break;
      hash.update(buffer.subarray(0, length));
    }
    if (stamp(fstatSync(fd)) !== stamp(before)) throw new Error("Copied file changed while fingerprinting");
    return JSON.stringify([stamp(before), hash.digest("hex")]);
  } finally {
    closeSync(fd);
  }
}

function schema(db: Database.Database): void {
  db.exec(`CREATE TABLE IF NOT EXISTS canvas_command_journal (
    command_id TEXT PRIMARY KEY, request_hash TEXT NOT NULL, request_json TEXT NOT NULL,
    phase TEXT NOT NULL, result_json TEXT
  );
  CREATE TABLE IF NOT EXISTS canvas_command_changes (
    seq INTEGER PRIMARY KEY AUTOINCREMENT, command_id TEXT NOT NULL, table_name TEXT NOT NULL,
    before_json TEXT, after_json TEXT
  );
  CREATE TABLE IF NOT EXISTS canvas_command_files (
    command_id TEXT NOT NULL, path TEXT NOT NULL, dev INTEGER NOT NULL, ino INTEGER NOT NULL,
    PRIMARY KEY(command_id,path)
  );`);
  const columns = db.prepare("PRAGMA table_info(canvas_command_files)").all() as { name: string }[];
  if (!columns.some(({ name }) => name === "fingerprint")) db.exec("ALTER TABLE canvas_command_files ADD COLUMN fingerprint TEXT");
}

export function installCanvasCommandJournal(db: Database.Database): void {
  schema(db);
  db.function("canvas_command_id", () => context.getStore()?.id ?? null);
  for (const table of tables) {
    const columns = db.prepare(`PRAGMA table_info(${quote(table)})`).all() as { name: string }[];
    if (!columns.length) continue;
    const image = (row: string) => `json_object(${columns.flatMap(({ name }) => [`'${name}'`, `${row}.${quote(name)}`]).join(",")})`;
    for (const event of ["INSERT", "UPDATE", "DELETE"] as const) {
      db.exec(`CREATE TEMP TRIGGER IF NOT EXISTS ${quote(`canvas_journal_${table}_${event}`)} AFTER ${event} ON main.${quote(table)}
        WHEN canvas_command_id() IS NOT NULL BEGIN
        INSERT INTO canvas_command_changes(command_id,table_name,before_json,after_json)
        VALUES(canvas_command_id(),'${table}',${event === "INSERT" ? "NULL" : image("OLD")},${event === "DELETE" ? "NULL" : image("NEW")}); END`);
    }
  }
}

type JournalRow = { command_id: string; request_hash: string; request_json: string; phase: string; result_json: string | null };
type ChangeRow = { table_name: string; before_json: string | null; after_json: string | null };
type FileRow = { path: string; dev: number; ino: number; fingerprint: string | null };

export class CanvasCommandJournal {
  private readonly db: Database.Database;
  private readonly workspace: string;

  static exists(workspace: string): boolean {
    return existsSync(resolveWorkspaceResourceDatabasePath(workspace));
  }

  constructor(workspace: string) {
    this.workspace = realpathSync(workspace);
    const filename = resolveWorkspaceResourceDatabasePath(this.workspace);
    for (const entry of [path.dirname(filename), filename, `${filename}-wal`, `${filename}-shm`, `${filename}-journal`]) {
      try {
        const stat = lstatSync(entry);
        if (stat.isSymbolicLink() || (entry === path.dirname(filename) ? !stat.isDirectory() : !stat.isFile())) {
          throw canvasV3Error(503, "CANVAS_V3_STORAGE_UNAVAILABLE", "Canvas recovery storage is unavailable.");
        }
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
    }
    this.db = new Database(filename);
    try {
      this.db.pragma("busy_timeout = 5000");
      this.db.pragma("synchronous = FULL");
      schema(this.db);
    } catch (error) {
      this.db.close();
      throw error;
    }
  }

  close(): void {
    this.db.close();
  }

  recordFile(id: string, file: string, stat: { dev: number; ino: number }, fingerprint?: string): void {
    this.db.prepare(`INSERT INTO canvas_command_files (command_id,path,dev,ino,fingerprint) VALUES (?,?,?,?,?)
        ON CONFLICT(command_id,path) DO UPDATE SET fingerprint=excluded.fingerprint
        WHERE dev=excluded.dev AND ino=excluded.ino`).run(id, file, stat.dev, stat.ino, fingerprint ?? null);
  }

  recover(commit: (request: CanvasV3CommandRequest, result: { patch: unknown; effects: unknown }) => void): void {
    const pending = this.db.prepare("SELECT * FROM canvas_command_journal WHERE phase IN ('running','ready','cleaning')").all() as JournalRow[];
    for (const entry of pending) {
      if (entry.phase === "ready") {
        commit(JSON.parse(entry.request_json) as CanvasV3CommandRequest, JSON.parse(entry.result_json ?? "null"));
        this.finish(entry.command_id, "committed");
      } else if (entry.phase === "cleaning") {
        this.cleanFiles(entry.command_id);
        this.finish(entry.command_id, "rolled_back");
      } else this.rollback(entry.command_id);
    }
  }

  async execute<T>(request: CanvasV3CommandRequest, run: () => Promise<T>, commit: (result: T) => unknown): Promise<unknown> {
    const id = request.commandId;
    const hash = canvasV3RequestHash(request);
    this.db.transaction(() => {
      const entry = this.db.prepare("SELECT * FROM canvas_command_journal WHERE command_id=?").get(id) as JournalRow | undefined;
      if (entry && entry.request_hash !== hash) throw canvasV3Error(409, "CANVAS_V3_COMMAND_ID_REUSED", "Command ID was already used for another request.");
      this.db.prepare(`INSERT INTO canvas_command_journal VALUES (?,?,?,'running',NULL)
        ON CONFLICT(command_id) DO UPDATE SET phase='running',result_json=NULL`).run(id, hash, JSON.stringify(request));
    }).immediate();
    let result: T;
    try {
      result = await context.run({ id, journal: this }, run);
    } catch (error) {
      this.rollback(id);
      throw error;
    }
    this.db.prepare("UPDATE canvas_command_journal SET phase='ready',result_json=? WHERE command_id=?").run(JSON.stringify(result), id);
    const receipt = commit(result);
    this.finish(id, "committed");
    return receipt;
  }

  private cleanFiles(id: string): void {
    const files = this.db.prepare("SELECT * FROM canvas_command_files WHERE command_id=?").all(id) as FileRow[];
    for (const file of files) {
      try {
        const stat = lstatSync(file.path);
        if (
          !path.resolve(file.path).startsWith(this.workspace + path.sep) ||
          stat.isSymbolicLink() ||
          realpathSync(file.path) !== file.path ||
          stat.dev !== file.dev ||
          stat.ino !== file.ino ||
          !file.fingerprint ||
          copiedFileFingerprint(file.path, stat) !== file.fingerprint
        ) {
          throw canvasV3Error(409, "CANVAS_V3_RECOVERY_CONFLICT", "Copied file changed during command recovery.");
        }
        unlinkSync(file.path);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
    }
    this.db.prepare("DELETE FROM canvas_command_files WHERE command_id=?").run(id);
  }

  private finish(id: string, phase: string): void {
    this.db.transaction(() => {
      this.db.prepare("UPDATE canvas_command_journal SET phase=?,result_json=NULL WHERE command_id=?").run(phase, id);
      this.db.prepare("DELETE FROM canvas_command_changes WHERE command_id=?").run(id);
      if (phase === "committed") this.db.prepare("DELETE FROM canvas_command_files WHERE command_id=?").run(id);
    }).immediate();
  }

  private rollback(id: string): void {
    this.db.pragma("foreign_keys = OFF");
    this.db.transaction(() => {
      const guards = this.db.prepare("SELECT name,sql FROM sqlite_master WHERE type='trigger' AND name IN ('resource_versions_immutable_update','resource_versions_immutable_delete','resource_dependencies_immutable_update','resource_dependencies_immutable_delete')").all() as { name: string; sql: string }[];
      for (const guard of guards) this.db.exec(`DROP TRIGGER ${quote(guard.name)}`);
      const changes = this.db.prepare("SELECT * FROM canvas_command_changes WHERE command_id=? ORDER BY seq DESC").all(id) as ChangeRow[];
      const removedResources = new Set<string>();
      for (const change of changes) {
        if (!tables.has(change.table_name)) throw new Error("Unknown Canvas journal table");
        const before = change.before_json ? (JSON.parse(change.before_json) as Record<string, unknown>) : null;
        const after = change.after_json ? (JSON.parse(change.after_json) as Record<string, unknown>) : null;
        const columns = this.db.prepare(`PRAGMA table_info(${quote(change.table_name)})`).all() as { name: string; pk: number }[];
        const keys = columns.filter((column) => column.pk).map((column) => column.name);
        if (!keys.length) throw new Error("Canvas journal table needs a primary key");
        const identity = after ?? before;
        if (!identity) throw new Error("Canvas journal change has no row");
        const where = keys.map((key) => `${quote(key)} IS ?`).join(" AND ");
        const values = keys.map((key) => identity[key]);
        const table = quote(change.table_name);
        const current = (this.db.prepare(`SELECT * FROM ${table} WHERE ${where}`).get(...values) as Record<string, unknown> | undefined) ?? null;
        if (canvasV3CanonicalJson(current) !== canvasV3CanonicalJson(after)) {
          throw canvasV3Error(409, "CANVAS_V3_RECOVERY_CONFLICT", "Content changed during command recovery; pending recovery was preserved.");
        }
        if (!before) {
          if (change.table_name === "resources") removedResources.add(String(after?.resource_id));
          this.db.prepare(`DELETE FROM ${table} WHERE ${where}`).run(...values);
        } else if (!after) {
          const names = Object.keys(before);
          this.db.prepare(`INSERT INTO ${table} (${names.map(quote).join(",")}) VALUES (${names.map(() => "?").join(",")})`).run(...names.map((name) => before[name]));
        } else {
          const names = Object.keys(before);
          this.db.prepare(`UPDATE ${table} SET ${names.map((name) => `${quote(name)}=?`).join(",")} WHERE ${where}`).run(...names.map((name) => before[name]), ...values);
        }
      }
      if (this.db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='composition_members'").get()) {
        const reference = this.db.prepare("SELECT 1 FROM composition_members WHERE resource_id=? LIMIT 1");
        for (const resourceId of removedResources) {
          if (reference.get(resourceId)) throw canvasV3Error(409, "CANVAS_V3_RECOVERY_CONFLICT", "Copied resource is externally referenced; pending recovery was preserved.");
        }
      }
      for (const guard of guards) this.db.exec(guard.sql);
      if ((this.db.pragma("foreign_key_check") as unknown[]).length) throw new Error("Canvas recovery constraint conflict");
      this.finish(id, "cleaning");
    }).immediate();
    this.cleanFiles(id);
    this.finish(id, "rolled_back");
  }
}
