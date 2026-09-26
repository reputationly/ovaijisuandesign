import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { BrowserSkillRequiredError, isBrowserSkillInstalled, isBrowserSkillLoadResult } from "./browser-skill-gate.js";
import { _resetSkillMetaCacheForTests, parseSkillFrontmatter, readSkillMeta } from "./skill-meta-reader.js";
import { allSkillsDirs, installedSkillsDir, userSkillsDir } from "./skill-paths.js";

function skill(dir: string, name: string, frontmatter: string) {
  mkdirSync(path.join(dir, name), { recursive: true });
  writeFileSync(path.join(dir, name, "SKILL.md"), `---\n${frontmatter}\n---\n正文`);
}

const ENV = ["HUB_SKILLS_DIR", "HUB_USER_SKILLS_DIR", "HILO_DATA_DIR", "EXTRA_SKILLS_DIRS", "HILO_EVAL_SKILLS_PATHS"];
let root: string;
beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), "ov-skill-"));
  process.env.HUB_SKILLS_DIR = path.join(root, "installed");
  process.env.HUB_USER_SKILLS_DIR = path.join(root, "user");
  _resetSkillMetaCacheForTests();
});
afterEach(() => {
  for (const k of ENV) delete process.env[k];
});

describe("技能目录", () => {
  it("用户 > 已装 > EXTRA，去重；环境变量缺省时落在数据根下", () => {
    process.env.EXTRA_SKILLS_DIRS = ` ${path.join(root, "x")} ,,${path.join(root, "user")}`;
    expect(allSkillsDirs()).toEqual([path.join(root, "user"), path.join(root, "installed"), path.join(root, "x")]);
    delete process.env.HUB_SKILLS_DIR;
    delete process.env.HUB_USER_SKILLS_DIR;
    process.env.HILO_DATA_DIR = "/data";
    expect(installedSkillsDir()).toBe(path.join("/data", "skills"));
    expect(userSkillsDir()).toBe(path.join("/data", "user-skills"));
  });
});

describe("技能声明的工具", () => {
  it("allowed-tools 给 media-agent，allowed-tools-<agent> 按 agent 分；列表可以是数组或空格 / 逗号分隔", () => {
    expect(parseSkillFrontmatter("---\nname: s\nallowed-tools: [question, hub_generate_image]\nallowed-tools-executor: hub_a, hub_b hub_c\n---\n")).toEqual({
      name: "s",
      tools: ["question", "hub_generate_image"],
      toolsByAgent: { executor: ["hub_a", "hub_b", "hub_c"] },
    });
    expect(parseSkillFrontmatter("---\ntools: hub_x\n---")).toEqual({ tools: ["hub_x"] });
    expect(parseSkillFrontmatter("没有 frontmatter")).toEqual({});
    expect(parseSkillFrontmatter("---\nname: 'broken\nallowed-tools: [x\n---")).toEqual({ name: "'broken" });
  });

  it("按目录顺序找，用户技能优先；没声明工具回 null；结果缓存", () => {
    skill(path.join(root, "installed"), "promo", "name: promo\nallowed-tools: [hub_generate_video]");
    skill(path.join(root, "user"), "promo", "name: promo\nallowed-tools: [hub_generate_image]");
    skill(path.join(root, "installed"), "plain", "name: plain\ndescription: d");
    expect(readSkillMeta("promo")).toEqual({ tools: ["hub_generate_image"] });
    expect(readSkillMeta("plain")).toBeNull();
    expect(readSkillMeta("missing")).toBeNull();
    skill(path.join(root, "installed"), "missing", "name: missing\nallowed-tools: [hub_x]");
    expect(readSkillMeta("missing")).toBeNull();
    _resetSkillMetaCacheForTests();
    expect(readSkillMeta("missing")).toEqual({ tools: ["hub_x"] });
  });

  it("frontmatter 名字和目录名对不上：不是这个技能，继续往后找", () => {
    skill(path.join(root, "user"), "promo", "name: other\nallowed-tools: [hub_a]");
    skill(path.join(root, "installed"), "promo", "name: promo\nallowed-tools: [hub_b]");
    expect(readSkillMeta("promo")).toEqual({ tools: ["hub_b"] });
  });

  it("评测挂载的技能目录优先", () => {
    skill(path.join(root, "installed"), "promo", "name: promo\nallowed-tools: [hub_b]");
    skill(path.join(root, "eval"), "promo", "name: promo\nallowed-tools-media-agent: [hub_eval]");
    process.env.HILO_EVAL_SKILLS_PATHS = path.join(root, "eval", "promo");
    expect(readSkillMeta("promo")).toEqual({ toolsByAgent: { "media-agent": ["hub_eval"] } });
  });
});

describe("内置浏览器技能门", () => {
  it("只有加载了操作说明技能且返回了正文才算加载成功", () => {
    expect(isBrowserSkillLoadResult({ name: "control-in-app-browser" }, "# 说明")).toBe(true);
    expect(isBrowserSkillLoadResult({ name: "control-in-app-browser" }, "  ")).toBe(false);
    expect(isBrowserSkillLoadResult({ name: "other" }, "# 说明")).toBe(false);
  });

  it("技能装在磁盘上才设门；错误信息告诉模型先加载技能", () => {
    expect(isBrowserSkillInstalled([path.join(root, "nothing")])).toBe(false);
    skill(path.join(root, "installed"), "control-in-app-browser", "name: control-in-app-browser");
    expect(isBrowserSkillInstalled([path.join(root, "installed")])).toBe(true);
    const e = new BrowserSkillRequiredError();
    expect(e.code).toBe("BROWSER_SKILL_REQUIRED");
    expect(e.message).toMatch(/^BROWSER_SKILL_REQUIRED: call skill\(\{ "name": "control-in-app-browser" \}\)/);
  });
});
