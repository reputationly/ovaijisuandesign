import { existsSync, mkdirSync, mkdtempSync, readFileSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { migrateRenamedDirs } from "./rename-migration.js";
import { APP_DIR_NAME, LEGACY_APP_DIR_NAMES } from "./roots.js";

/** 最早的那个历史名（迁移链的起点）。 */
const LEGACY = LEGACY_APP_DIR_NAMES[LEGACY_APP_DIR_NAMES.length - 1]!;

describe("改名迁移：蒜狸小助手 → 蒜狸设计台", () => {
  it("把数据根和 userData 一起搬到新名字下，内容原样", () => {
    const home = mkdtempSync(path.join(tmpdir(), "ov-rename-"));
    const oldRoot = path.join(home, "Movies", LEGACY);
    mkdirSync(path.join(oldRoot, "Projects", "demo"), { recursive: true });
    writeFileSync(path.join(oldRoot, "Projects", "demo", "a.txt"), "hello", "utf8");
    const oldUserData = path.join(home, "Application Support", LEGACY);
    mkdirSync(oldUserData, { recursive: true });
    writeFileSync(path.join(oldUserData, "config.json"), "{}", "utf8");
    const userData = path.join(home, "Application Support", APP_DIR_NAME);

    const report = migrateRenamedDirs({ home, appData: path.join(home, "Application Support"), userData });

    expect(report.merged.length).toBeGreaterThanOrEqual(2);
    expect(readFileSync(path.join(home, "Movies", APP_DIR_NAME, "Projects", "demo", "a.txt"), "utf8")).toBe("hello");
    expect(readFileSync(path.join(userData, "config.json"), "utf8")).toBe("{}");
    // 合并语义：旧目录本身保留（用户可自行删除），内容已经搬过去。
    expect(existsSync(path.join(home, "Movies", APP_DIR_NAME))).toBe(true);
  });

  it("两边都有同名文件时保留 mtime 更新的那份（旧目录不会盖掉新配置）", () => {
    const home = mkdtempSync(path.join(tmpdir(), "ov-rename-"));
    const oldRoot = path.join(home, "Movies", LEGACY);
    const newRoot = path.join(home, "Movies", APP_DIR_NAME);
    mkdirSync(oldRoot, { recursive: true });
    mkdirSync(newRoot, { recursive: true });
    writeFileSync(path.join(oldRoot, "config.json"), "old", "utf8");
    writeFileSync(path.join(newRoot, "config.json"), "new", "utf8");
    // 让新配置的 mtime 明确更新
    const later = new Date(Date.now() + 60_000);
    utimesSync(path.join(newRoot, "config.json"), later, later);

    const report = migrateRenamedDirs({ home, userData: path.join(home, "Application Support", APP_DIR_NAME) });

    expect(readFileSync(path.join(newRoot, "config.json"), "utf8")).toBe("new");
    expect(report.skipped.some((item) => item.reason.includes("更新的同名文件"))).toBe(true);
  });

  it("两处都不存在时什么都不做，也不报错", () => {
    const home = mkdtempSync(path.join(tmpdir(), "ov-rename-"));
    const report = migrateRenamedDirs({ home, userData: path.join(home, "Application Support", APP_DIR_NAME) });
    expect(report.merged).toHaveLength(0);
    expect(report.skipped).toHaveLength(0);
  });
});
