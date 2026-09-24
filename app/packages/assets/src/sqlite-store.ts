import { mkdirSync, renameSync, existsSync } from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";

import { MIGRATIONS } from "./migrations.js";

export type Db = Database.Database;

export interface OpenResult {
  db: Db;
  /** 原库损坏、已隔离、这是一个新建的空库。 */
  recovered: boolean;
  /** 隔离出去的原库位置（recovered 时有）。 */
  quarantinedTo?: string;
}

/**
 * 打开（或新建）资产库并跑完迁移。
 *
 * - WAL：读写并发时读不阻塞写；`busy_timeout = 5000` 让偶发的锁竞争等一会儿
 *   而不是立刻 SQLITE_BUSY 失败。
 * - 外键必须显式打开，SQLite 默认是关的 —— 不开的话 ON DELETE CASCADE /
 *   SET NULL 全部静默失效，删资产会留下一堆指向不存在资产的依赖边。
 *
 * **库损坏时先隔离再新建**，绝不在原文件上重建：id → path 的映射只在这份
 * 坏文件里，素材文件本身都还在盘上。直接覆盖的话，画布上每个节点都变成悬空
 * 引用，而且再也修不回来。
 */
export function openStore(dbPath: string, now: () => number = Date.now): OpenResult {
  mkdirSync(path.dirname(dbPath), { recursive: true });
  try {
    return { db: openAndMigrate(dbPath), recovered: false };
  } catch (err) {
    if (!isCorruption(err)) throw err;
    const quarantinedTo = quarantine(dbPath, now());
    return { db: openAndMigrate(dbPath), recovered: true, quarantinedTo };
  }
}

function openAndMigrate(dbPath: string): Db {
  const db = new Database(dbPath);
  try {
    db.pragma("journal_mode = WAL");
    db.pragma("busy_timeout = 5000");
    db.pragma("foreign_keys = ON");
    migrate(db);
    return db;
  } catch (err) {
    db.close();
    throw err;
  }
}

export function migrate(db: Db): void {
  db.exec("CREATE TABLE IF NOT EXISTS schema_version (version INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at INTEGER NOT NULL)");
  const done = new Set(
    (db.prepare("SELECT version FROM schema_version").all() as { version: number }[]).map((r) => r.version),
  );
  for (const m of MIGRATIONS) {
    if (done.has(m.version)) continue;
    db.transaction(() => {
      db.exec(m.sql);
      db.prepare("INSERT INTO schema_version (version, name, applied_at) VALUES (?, ?, ?)").run(m.version, m.name, Date.now());
    })();
  }
}

function isCorruption(err: unknown): boolean {
  const code = (err as { code?: string } | null)?.code ?? "";
  return code === "SQLITE_NOTADB" || code === "SQLITE_CORRUPT" || code.startsWith("SQLITE_CORRUPT");
}

/** 原库连同 -wal / -shm 一起挪进 `index-recovery/`。WAL 里可能有还没合并进主文件的数据。 */
function quarantine(dbPath: string, stamp: number): string {
  const dir = path.join(path.dirname(dbPath), "index-recovery");
  mkdirSync(dir, { recursive: true });
  const base = path.basename(dbPath, path.extname(dbPath));
  const dest = path.join(dir, `${base}-${stamp}${path.extname(dbPath)}`);
  for (const suffix of ["", "-wal", "-shm"]) {
    if (existsSync(dbPath + suffix)) renameSync(dbPath + suffix, dest + suffix);
  }
  return dest;
}
