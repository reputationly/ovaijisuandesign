import { existsSync } from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";

import type { ArchiveLogger } from "./opencode-archive.js";

export interface VaultRename {
  from: string;
  to: string;
}

/**
 * 导入时文件系统不收某些文件名（改了名才落得下盘），资产库里的 path 要跟着改，
 * 这些资产才保得住原来的 id —— 画布节点是按 id 引用的。
 *
 * 只认名叫 `index.sqlite` 的绝对路径：这个接口收的是调用方给的库路径，
 * 不能被拿去改任意一个 SQLite 文件。
 */
export function rewriteVaultPaths(dbPath: string, renames: VaultRename[], log: ArchiveLogger): { rewritten: number } {
  if (!path.isAbsolute(dbPath) || path.basename(dbPath) !== "index.sqlite") {
    throw new Error(`refusing to rewrite non-vault db path: ${dbPath}`);
  }
  if (!existsSync(dbPath)) {
    log.info(`资产库不存在 ${dbPath}，不用改写`);
    return { rewritten: 0 };
  }
  if (renames.length === 0) return { rewritten: 0 };
  const db = new Database(dbPath);
  try {
    const updatePath = db.prepare("UPDATE assets SET path = ? WHERE path = ?");
    const updateCandidate = db.prepare("UPDATE assets SET candidate_path = ? WHERE candidate_path = ?");
    let rewritten = 0;
    for (const { from, to } of renames) {
      if (typeof from !== "string" || typeof to !== "string" || !from || !to) continue;
      try {
        rewritten += updatePath.run(to, from).changes;
        updateCandidate.run(to, from);
      } catch (err) {
        log.warn(`资产路径改写跳过 "${from}" -> "${to}": ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    return { rewritten };
  } finally {
    db.close();
  }
}
