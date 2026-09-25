import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { locateBundledSkills, seedBundledSkills, skillVersion } from "./seed.js";

function skill(root: string, slug: string, version: string | undefined, body = "技能正文", extra: Record<string, string> = {}) {
  const d = path.join(root, slug);
  mkdirSync(path.join(d, "references"), { recursive: true });
  writeFileSync(path.join(d, "SKILL.md"), body);
  if (version !== undefined) writeFileSync(path.join(d, "meta.yaml"), `display-name-zh: ${slug}\nversion: ${version}\n`);
  for (const [f, c] of Object.entries(extra)) writeFileSync(path.join(d, f), c);
}
const tmp = () => mkdtempSync(path.join(tmpdir(), "ov-skills-"));

describe("seedBundledSkills", () => {
  it("没有的装上；版本相同不动；版本不同整目录换掉；用户自己的技能不碰", () => {
    const src = tmp();
    const dest = tmp();
    skill(src, "brand-ad", "1.1.5");
    skill(src, "voice-clone", '"0.4.12"');
    writeFileSync(path.join(src, "README.md"), "说明");
    skill(dest, "my-own", "9.9.9", "用户写的");
    // 旧版本还留着一个新版本已经删掉的文件。
    skill(dest, "voice-clone", "0.4.11", "旧正文", { "obsolete.md": "旧的" });

    const r = seedBundledSkills(src, dest);
    expect(r).toEqual({ installed: ["brand-ad"], updated: ["voice-clone"], unchanged: [], failed: [] });
    expect(readFileSync(path.join(dest, "voice-clone/SKILL.md"), "utf8")).toBe("技能正文");
    expect(existsSync(path.join(dest, "voice-clone/obsolete.md"))).toBe(false);
    expect(readFileSync(path.join(dest, "my-own/SKILL.md"), "utf8")).toBe("用户写的");
    expect(existsSync(path.join(dest, "README.md"))).toBe(false);

    // 用户改过正文但版本没变：不覆盖。
    writeFileSync(path.join(dest, "brand-ad/SKILL.md"), "用户改过");
    expect(seedBundledSkills(src, dest)).toMatchObject({ installed: [], updated: [], unchanged: ["brand-ad", "voice-clone"] });
    expect(readFileSync(path.join(dest, "brand-ad/SKILL.md"), "utf8")).toBe("用户改过");
    expect(readdirSync(dest).filter((f) => f.startsWith("."))).toEqual([]);
  });

  it("目标没有 meta.yaml 的当作旧版覆盖；版本号认引号", () => {
    const src = tmp();
    const dest = tmp();
    skill(src, "a", "1.0.0");
    skill(dest, "a", undefined, "没有版本");
    expect(seedBundledSkills(src, dest).updated).toEqual(["a"]);
    skill(src, "b", "'2.0.1'");
    expect(skillVersion(path.join(src, "b"))).toBe("2.0.1");
  });

  it("仓库自带的 36 个技能都能找到版本", () => {
    const repoRoot = path.resolve(import.meta.dirname, "../../../../..");
    const dir = locateBundledSkills({ repoRoot })!;
    expect(dir).toBe(path.join(repoRoot, "assets/skills"));
    const slugs = readdirSync(dir).filter((s) => existsSync(path.join(dir, s, "SKILL.md")));
    expect(slugs.length).toBeGreaterThanOrEqual(36);
    for (const s of slugs) expect(skillVersion(path.join(dir, s)), s).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
