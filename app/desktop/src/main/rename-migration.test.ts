import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { migrateRenamedDirs } from "./rename-migration.js";
import { APP_DIR_NAME, LEGACY_APP_DIR_NAME } from "./roots.js";

const noop = () => undefined;

describe("改名迁移：蒜狸小助手 → 蒜狸设计工作台", () => {
  it("把数据根和 userData 一起搬到新名字下，内容原样", () => {
    const home = mkdtempSync(path.join(tmpdir(), "ov-rename-"));
    const oldRoot = path.join(home, "Movies", LEGACY_APP_DIR_NAME);
    mkdirSync(path.join(oldRoot, "Projects", "demo"), { recursive: true });
    writeFileSync(path.join(oldRoot, "Projects", "demo", "a.txt"), "hello", "utf8");
    const oldUserData = path.join(home, "Application Support", LEGACY_APP_DIR_NAME);
    mkdirSync(oldUserData, { recursive: true });
    writeFileSync(path.join(oldUserData, "config.json"), "{}", "utf8");
    const userData = path.join(home, "Application Support", APP_DIR_NAME);

    const report = migrateRenamedDirs({ home, userData, log: noop });

    expect(report.moved).toHaveLength(2);
    expect(readFileSync(path.join(home, "Movies", APP_DIR_NAME, "Projects", "demo", "a.txt"), "utf8")).toBe("hello");
    expect(readFileSync(path.join(userData, "config.json"), "utf8")).toBe("{}");
    expect(existsSync(oldRoot)).toBe(false);
  });

  it("目标已存在时不动旧目录（不覆盖用户已有的新数据）", () => {
    const home = mkdtempSync(path.join(tmpdir(), "ov-rename-"));
    mkdirSync(path.join(home, "Movies", LEGACY_APP_DIR_NAME), { recursive: true });
    const newRoot = path.join(home, "Movies", APP_DIR_NAME);
    mkdirSync(newRoot, { recursive: true });
    writeFileSync(path.join(newRoot, "keep.txt"), "new", "utf8");

    const report = migrateRenamedDirs({ home, userData: path.join(home, "Application Support", APP_DIR_NAME), log: noop });

    expect(report.skipped.some((item) => item.reason === "目标已存在")).toBe(true);
    expect(readFileSync(path.join(newRoot, "keep.txt"), "utf8")).toBe("new");
  });

  it("两处都不存在时什么都不做，也不报错", () => {
    const home = mkdtempSync(path.join(tmpdir(), "ov-rename-"));
    const report = migrateRenamedDirs({ home, userData: path.join(home, "Application Support", APP_DIR_NAME), log: noop });
    expect(report.moved).toHaveLength(0);
    expect(report.skipped).toHaveLength(0);
  });
});
