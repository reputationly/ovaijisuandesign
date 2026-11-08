import { cpSync, existsSync, mkdirSync, renameSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

import { LEGACY_APP_DIR_NAME, APP_DIR_NAME } from "./roots.js";

export interface RenameReport {
  moved: { from: string; to: string }[];
  skipped: { from: string; reason: string }[];
}

/**
 * 产品改名后的一次性目录迁移：`蒜狸小助手` → `蒜狸设计工作台`。
 *
 * 两处都要动，否则用户会看到"配置丢了 / 项目不见了"：
 * 1. `~/Movies/蒜狸小助手`（数据根，装着 Projects/ 与 skills/）
 * 2. `~/Library/Application Support/蒜狸小助手`（userData：ai-runtime、config.json、日志、音色）
 *
 * 规则：
 * - **目标已存在就不动**（用户已经在新名下跑过；旧目录留作备份）；
 * - 同卷优先 `rename`（瞬间完成，视频项目动辄几十 GB，拷贝不可接受）；
 * - 跨卷或 rename 失败时退回递归拷贝，并在日志里说明（拷贝会慢）；
 * - 任何一步失败都**不抛**：迁移失败最多是"还是旧目录"，绝不能让应用起不来。
 */
export function migrateRenamedDirs(opts: { home: string; userData: string; log: (line: string) => void }): RenameReport {
  const report: RenameReport = { moved: [], skipped: [] };
  const pairs: [string, string][] = [
    [path.join(opts.home, "Movies", LEGACY_APP_DIR_NAME), path.join(opts.home, "Movies", APP_DIR_NAME)],
    // userData 由 Electron 按 app name 算出新路径；旧路径就是它的兄弟目录。
    [path.join(path.dirname(opts.userData), LEGACY_APP_DIR_NAME), opts.userData],
  ];
  for (const [from, to] of pairs) {
    try {
      if (from === to) continue;
      if (!existsSync(from) || !statSync(from).isDirectory()) continue;
      if (existsSync(to)) {
        report.skipped.push({ from, reason: "目标已存在" });
        continue;
      }
      mkdirSync(path.dirname(to), { recursive: true });
      try {
        renameSync(from, to);
        report.moved.push({ from, to });
      } catch {
        cpSync(from, to, { recursive: true, errorOnExist: false, force: true });
        // 拷完留个标记：下一次启动不会重复拷（旧目录还在，但目标已存在会走 skipped）。
        try {
          writeFileSync(path.join(to, ".migrated-from-legacy"), from, "utf8");
        } catch {
          // 标记写不进去不影响使用。
        }
        report.moved.push({ from, to });
        opts.log(`[main] 改名迁移：跨卷拷贝完成 ${from} → ${to}`);
      }
    } catch (err) {
      report.skipped.push({ from, reason: err instanceof Error ? err.message : String(err) });
    }
  }
  return report;
}
