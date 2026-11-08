import { cpSync, existsSync, mkdirSync, readdirSync, renameSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

import { APP_DIR_NAME, LEGACY_APP_DIR_NAMES } from "./roots.js";

export interface RenameReport {
  /** 实际搬过去的条目（from/to/how）。 */
  merged: { from: string; to: string; how: "rename" | "copy" | "overwrite-newer" }[];
  skipped: { from: string; reason: string }[];
}

/**
 * 产品改名（蒜狸小助手 → 蒜狸设计台）后的一次性迁移。
 *
 * 要动两处，否则用户看到的是"配置丢了 / 项目不见了"：
 * 1. `~/Movies/蒜狸小助手`（数据根：Projects/、skills/）
 * 2. `<appData>/蒜狸小助手`（userData：config.json、ai-runtime、日志、音色）
 *
 * **为什么是合并而不是简单改名**：这台机器上可能已经有同名的新目录（旧 checkout 跑过、
 * 或者 Electron 先一步把目录建出来），那时简单"目标存在就跳过"会让用户拿旧配置启动。
 * 所以按条目合并：
 * - 目标没有 → rename（同卷瞬间；视频项目几十 GB，不能拷）；
 * - 两边都有同名文件 → 保留 **mtime 更新** 的那份；
 * - 两边都有同名目录 → 目标为空才替换，否则跳过（不递归合并，避免半新半旧）；
 * - 任何异常都不抛：最坏情况是继续用旧目录，绝不能让应用起不来。
 */
export function migrateRenamedDirs(opts: {
  home: string;
  /** appData 根（`~/Library/Application Support`）。旧 userData 由它 + 历史目录名拼出来。 */
  appData?: string;
  /** 新 userData（`<appData>/蒜狸设计台`）。 */
  userData: string;
}): RenameReport {
  const report: RenameReport = { merged: [], skipped: [] };
  const pairs: [string, string][] = [];
  for (const legacy of LEGACY_APP_DIR_NAMES) {
    pairs.push([path.join(opts.home, "Movies", legacy), path.join(opts.home, "Movies", APP_DIR_NAME)]);
    if (opts.appData) pairs.push([path.join(opts.appData, legacy), opts.userData]);
  }

  for (const [from, to] of pairs) {
    if (from === to) continue;
    try {
      if (!existsSync(from) || !statSync(from).isDirectory()) continue;
      mkdirSync(to, { recursive: true });
      for (const entry of readdirSync(from)) {
        const src = path.join(from, entry);
        const dst = path.join(to, entry);
        try {
          if (!existsSync(dst)) {
            try {
              renameSync(src, dst);
              report.merged.push({ from: src, to: dst, how: "rename" });
            } catch {
              cpSync(src, dst, { recursive: true, errorOnExist: false, force: true });
              writeFileSync(path.join(to, `.migrated-${entry}`), from, "utf8");
              report.merged.push({ from: src, to: dst, how: "copy" });
            }
            continue;
          }
          const a = statSync(src);
          const b = statSync(dst);
          if (a.isDirectory() && b.isDirectory()) {
            report.skipped.push({ from: src, reason: "两边都有同名目录，保留现有" });
            continue;
          }
          if (a.isFile() && b.isFile() && a.mtimeMs > b.mtimeMs) {
            cpSync(src, dst, { force: true });
            report.merged.push({ from: src, to: dst, how: "overwrite-newer" });
            continue;
          }
          report.skipped.push({ from: src, reason: "目标已有更新的同名文件" });
        } catch (err) {
          report.skipped.push({ from: src, reason: err instanceof Error ? err.message : String(err) });
        }
      }
    } catch (err) {
      report.skipped.push({ from, reason: err instanceof Error ? err.message : String(err) });
    }
  }
  return report;
}
