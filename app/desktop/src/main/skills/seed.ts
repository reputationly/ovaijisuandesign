import { randomUUID } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync } from "node:fs";
import path from "node:path";

import type { ResourceRoots } from "../opencode/index.js";

/** 自带技能在哪：发布包是 `resources/skills`，开发时是仓库的 `assets/skills`。 */
export function locateBundledSkills(roots: ResourceRoots): string | undefined {
  return [roots.resources && path.join(roots.resources, "skills"), roots.repoRoot && path.join(roots.repoRoot, "assets/skills")].find(
    (d): d is string => !!d && existsSync(d) && statSync(d).isDirectory(),
  );
}

export interface SeedReport {
  installed: string[];
  updated: string[];
  unchanged: string[];
  failed: { slug: string; error: string }[];
}

/**
 * 把自带技能铺到用户的技能目录（opencode 从那里加载）。
 *
 * - 按 `meta.yaml` 的 `version` 判断：目标不存在或版本不同才整目录换掉 —— 半新半旧的技能目录里，
 *   SKILL.md 会引用已经删掉的 references；
 * - 先拷到同级临时目录再换名，拷到一半崩了不会留下残缺的技能；
 * - 只动自带列表里的目录，用户自己建的、从别处装的技能不碰。
 */
export function seedBundledSkills(src: string, dest: string): SeedReport {
  const report: SeedReport = { installed: [], updated: [], unchanged: [], failed: [] };
  mkdirSync(dest, { recursive: true });
  for (const slug of readdirSync(src).sort()) {
    const from = path.join(src, slug);
    if (slug.startsWith(".") || !existsSync(path.join(from, "SKILL.md"))) continue;
    const to = path.join(dest, slug);
    const had = existsSync(to);
    if (had && skillVersion(to) === skillVersion(from)) {
      report.unchanged.push(slug);
      continue;
    }
    const tmp = path.join(dest, `.${slug}.seed-${randomUUID().slice(0, 8)}`);
    try {
      cpSync(from, tmp, { recursive: true, dereference: true });
      rmSync(to, { recursive: true, force: true });
      renameSync(tmp, to);
      (had ? report.updated : report.installed).push(slug);
    } catch (err) {
      rmSync(tmp, { recursive: true, force: true });
      report.failed.push({ slug, error: err instanceof Error ? err.message : String(err) });
    }
  }
  return report;
}

/** `meta.yaml` 顶层的 `version:`（引号可有可无）。读不到算 undefined —— 和任何有版本的都不相等，会被覆盖。 */
export function skillVersion(dir: string): string | undefined {
  let text: string;
  try {
    text = readFileSync(path.join(dir, "meta.yaml"), "utf8");
  } catch {
    return undefined;
  }
  const m = /^version:\s*["']?([^"'\s#]+)["']?/m.exec(text);
  return m?.[1];
}
