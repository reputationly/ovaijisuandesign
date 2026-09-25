import { existsSync, readFileSync } from "node:fs";
import { cp, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { Injectable, Logger } from "@nestjs/common";
import yaml from "js-yaml";

import { atomicSwapDir, extractZipToDir, locateSkillRoot } from "./skill-extract.js";
import { buildImportedSkillInfo, DEFAULT_SKILL_PACKAGE_VERSION, isValidSkillName, parseFrontmatter, type SkillMeta } from "./skill-meta.js";
import { installedSkillsDir, userSkillsDir } from "./skill-paths.js";

/**
 * 用户技能的本地操作：导入（.md / .zip 上传）、确认安装暂存的技能、fork、删除前取路径。
 * 返回形状照参照：失败也是 200 + `{ ok: false, error, errorType? }`，渲染层按 errorType 出文案。
 */

// 同机的另一个同类应用也往系统 tmp 下暂存技能，目录名要和它的错开，否则两边会互相覆盖暂存的包。
export function skillStagingRoot(): string {
  return path.join(tmpdir(), "ov-skill-staging");
}

// 本应用自己导出的技能包带这个标记（接口值，和导出方保持一致），这类包直接装；其余当第三方，先暂存等用户确认。
const HUB_EXPORT_MARKER = /^exported-by:\s*MiniMax-hub/m;

type Conflict = { type: "official" | "user"; existingName: string };

const errorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));

@Injectable()
export class SkillImportService {
  private readonly logger = new Logger(SkillImportService.name);

  /** 真正移到废纸篓由渲染层调 shell.trashItem 做；这里只校验并给出路径。 */
  resolveUserSkillPath(name: string) {
    try {
      const base = path.resolve(userSkillsDir());
      const resolved = path.resolve(base, name);
      if (!existsSync(resolved)) return { ok: false, error: `Skill "${name}" not found in user skills` };
      if (!resolved.startsWith(base + path.sep)) return { ok: false, error: "Invalid skill path" };
      return { ok: true, path: resolved };
    } catch (err) {
      this.logger.error(`Failed to resolve user skill "${name}": ${errorMessage(err)}`);
      return { ok: false, error: errorMessage(err) };
    }
  }

  /** 已装技能复制一份到用户目录（`my-<name>`，重名加序号），用户改副本不怕被自带技能更新覆盖。 */
  async forkSkill(name: string) {
    try {
      const base = path.resolve(installedSkillsDir());
      const sourceDir = path.resolve(base, name);
      if (!existsSync(sourceDir)) return { ok: false, error: `Skill "${name}" not found in installed skills` };
      if (!sourceDir.startsWith(base + path.sep) && sourceDir !== base) return { ok: false, error: "Invalid skill path" };
      const userDir = userSkillsDir();
      const baseName = `my-${name}`;
      let targetName = baseName;
      for (let suffix = 2; existsSync(path.join(userDir, targetName)); suffix++) targetName = `${baseName}-${suffix}`;
      await mkdir(userDir, { recursive: true });
      const targetDir = path.join(userDir, targetName);
      await cp(sourceDir, targetDir, { recursive: true });
      const skillMdPath = path.join(targetDir, "SKILL.md");
      if (existsSync(skillMdPath)) {
        const content = await readFile(skillMdPath, "utf-8");
        await writeFile(skillMdPath, content.replace(/^name:\s*.+$/m, `name: ${targetName}`));
      }
      await writeForkSkillMeta(targetDir, targetName);
      this.logger.log(`Skill "${name}" forked as "${targetName}" to ${targetDir}`);
      return { ok: true, name: targetName };
    } catch (err) {
      this.logger.error(`Failed to fork skill "${name}": ${errorMessage(err)}`);
      return { ok: false, error: errorMessage(err) };
    }
  }

  async importLocalSkill(buffer: Buffer, originalname: string) {
    const ext = path.extname(originalname).toLowerCase();
    if (ext !== ".zip" && ext !== ".md") return { ok: false, errorType: "unsupported_type", error: "Only .zip and .md files are supported" };
    try {
      return ext === ".md" ? await this.importFromMdFile(buffer, originalname) : await this.importFromZipFile(buffer, originalname);
    } catch (err) {
      this.logger.error(`Failed to import skill from "${originalname}": ${errorMessage(err)}`);
      return { ok: false, errorType: "extract_failed", error: errorMessage(err) };
    }
  }

  /** 暂存的技能（第三方或重名）经用户确认后装进用户目录；name 可以是改过的新名字。 */
  async confirmStagingInstall(stagingPath: string, name: string) {
    try {
      const allowedBase = skillStagingRoot();
      if (!path.resolve(stagingPath).startsWith(allowedBase + path.sep)) return { ok: false, errorType: "invalid_staging_path", error: "Invalid staging path" };
      if (!existsSync(stagingPath)) return { ok: false, errorType: "staging_not_found", error: "Staging directory not found. Please re-upload the file." };
      const stagingSkillMd = path.join(stagingPath, "SKILL.md");
      if (existsSync(stagingSkillMd)) {
        const content = await readFile(stagingSkillMd, "utf-8");
        const current = parseFrontmatter(content).name;
        if (current && current !== name) await writeFile(stagingSkillMd, content.replace(/^name:\s*.+$/m, `name: ${name}`));
      }
      const finalDir = path.join(userSkillsDir(), name);
      await mkdir(userSkillsDir(), { recursive: true });
      await atomicSwapDir(stagingPath, finalDir, (e) => this.logger.error(`Staging install rollback failed for "${name}": ${String(e)}`));
      const skillMdPath = path.join(finalDir, "SKILL.md");
      const meta = parseFrontmatter(existsSync(skillMdPath) ? readFileSync(skillMdPath, "utf-8") : "");
      return { ok: true, skill: buildImportedSkillInfo({ ...meta, name }, "user"), needsRestart: true, warning: this.checkShadowing(name) };
    } catch (err) {
      this.logger.error(`Failed to install staged skill "${name}": ${errorMessage(err)}`);
      return { ok: false, error: errorMessage(err) };
    }
  }

  private async importFromMdFile(buffer: Buffer, originalname: string) {
    const content = buffer.toString("utf-8");
    const { result, autoFixed } = this.autoFixFrontmatter(content, originalname);
    const invalid = this.checkName(result.name, "Cannot determine skill name. Please add a name field to the file.");
    if (invalid) return invalid;
    const name = result.name!;
    const finalContent = autoFixed ? this.rewriteFrontmatter(content, result) : content;
    if (!HUB_EXPORT_MARKER.test(content)) {
      const stagingDir = path.join(skillStagingRoot(), name);
      await mkdir(stagingDir, { recursive: true });
      await writeFile(path.join(stagingDir, "SKILL.md"), finalContent);
      this.logger.log(`Third-party skill "${name}" staged for adaptation at ${stagingDir}`);
      return this.stagedResult(name, stagingDir, result, true);
    }
    if (this.detectNameConflict(name)) {
      const stagingDir = path.join(skillStagingRoot(), name);
      await rm(stagingDir, { recursive: true }).catch(() => {});
      await mkdir(stagingDir, { recursive: true });
      await writeFile(path.join(stagingDir, "SKILL.md"), finalContent);
      return this.stagedResult(name, stagingDir, result, false);
    }
    const targetDir = path.join(userSkillsDir(), name);
    await mkdir(targetDir, { recursive: true });
    await writeFile(path.join(targetDir, "SKILL.md"), finalContent);
    this.logger.log(`Skill "${name}" imported from .md file to ${targetDir}`);
    return this.installedResult(name, targetDir, finalContent, result, autoFixed);
  }

  private async importFromZipFile(buffer: Buffer, originalname: string) {
    const ts = Date.now();
    const tmpExtractDir = path.join(userSkillsDir(), `__import_tmp_${ts}__`);
    try {
      await mkdir(userSkillsDir(), { recursive: true });
      await extractZipToDir(buffer, tmpExtractDir, `__import_${ts}`);
      const skillRoot = locateSkillRoot(tmpExtractDir);
      if (!skillRoot) return { ok: false, errorType: "no_skill_md", error: "SKILL.md not found in zip file" };
      const skillMdPath = path.join(skillRoot, "SKILL.md");
      const content = await readFile(skillMdPath, "utf-8");
      const { result, autoFixed } = this.autoFixFrontmatter(content, originalname, skillRoot);
      const invalid = this.checkName(result.name, "Cannot determine skill name. Please add a name field to SKILL.md.");
      if (invalid) return invalid;
      const name = result.name!;
      if (autoFixed) await writeFile(skillMdPath, this.rewriteFrontmatter(content, result));

      const thirdParty = !HUB_EXPORT_MARKER.test(content);
      if (thirdParty || this.detectNameConflict(name)) {
        const stagingDir = path.join(skillStagingRoot(), name);
        await rm(stagingDir, { recursive: true }).catch(() => {});
        await mkdir(path.dirname(stagingDir), { recursive: true });
        await moveDir(skillRoot, stagingDir);
        if (thirdParty) this.logger.log(`Third-party skill "${name}" staged for adaptation at ${stagingDir}`);
        return this.stagedResult(name, stagingDir, result, thirdParty);
      }

      const finalDir = path.join(userSkillsDir(), name);
      const rollback = (e: unknown) => this.logger.error(`Import rollback failed for "${name}": ${String(e)}`);
      if (skillRoot !== tmpExtractDir) {
        // 包里套了一层目录：先把那层挪出来，免得 finalDir 下面还多一层。
        const unwrapped = path.join(userSkillsDir(), `__import_unwrap_${Date.now()}__`);
        await rename(skillRoot, unwrapped);
        await rm(tmpExtractDir, { recursive: true }).catch(() => {});
        try {
          await atomicSwapDir(unwrapped, finalDir, rollback);
        } catch (swapErr) {
          await rm(unwrapped, { recursive: true }).catch(() => {});
          throw swapErr;
        }
      } else {
        await atomicSwapDir(tmpExtractDir, finalDir, rollback);
      }
      this.logger.log(`Skill "${name}" imported from zip to ${finalDir}`);
      return this.installedResult(name, finalDir, await readFile(path.join(finalDir, "SKILL.md"), "utf-8"), result, autoFixed);
    } finally {
      await rm(tmpExtractDir, { recursive: true }).catch(() => {});
    }
  }

  private checkName(name: string | undefined, missingMessage: string) {
    if (!name) return { ok: false, errorType: "invalid_format", error: missingMessage, missingFields: ["name"] };
    if (!isValidSkillName(name)) return { ok: false, errorType: "invalid_format", error: `Invalid skill name: "${name}"`, missingFields: ["name"] };
    return null;
  }

  /** 第三方包带 needsAdaptation（渲染层会先让 agent 适配），重名的带 conflict + 建议名。 */
  private stagedResult(name: string, stagingPath: string, meta: SkillMeta, needsAdaptation: boolean) {
    const conflict = this.detectNameConflict(name);
    const common = { stagingPath, skill: buildImportedSkillInfo(meta, "user") };
    if (needsAdaptation) {
      return { ok: true, needsAdaptation: true, ...common, conflict: conflict ?? undefined, suggestedName: conflict ? this.generateSuggestedName(name) : undefined };
    }
    this.logger.log(`Exported skill "${name}" conflicts with ${conflict?.type} skill, staged at ${stagingPath}`);
    return { ok: true, conflict, suggestedName: this.generateSuggestedName(name), ...common };
  }

  private installedResult(name: string, dir: string, content: string, meta: SkillMeta, autoFixed: boolean) {
    const missing = this.checkMissingReferences(dir, content);
    return {
      ok: true,
      skill: buildImportedSkillInfo(meta, "user"),
      needsRestart: true,
      autoFixed,
      warning: this.checkShadowing(name),
      missingReferences: missing.length > 0 ? missing : undefined,
    };
  }

  /** 第三方 SKILL.md 常常没有 name / 简介：名字依次取文件名、解压目录名、第一个标题，简介取正文第一段。 */
  private autoFixFrontmatter(content: string, originalname: string, extractedRoot?: string): { result: SkillMeta; autoFixed: boolean } {
    const parsed = parseFrontmatter(content);
    let autoFixed = false;
    if (!parsed.name) {
      const base = path.basename(originalname, path.extname(originalname));
      if (base.toLowerCase() !== "skill") {
        parsed.name = sanitizeSkillName(base);
      } else if (extractedRoot) {
        const dirName = path.basename(extractedRoot);
        if (!dirName.startsWith("__")) parsed.name = sanitizeSkillName(dirName);
      }
      if (!parsed.name) {
        const heading = content.match(/^#\s+(.+)$/m);
        if (heading) parsed.name = sanitizeSkillName(heading[1]!);
      }
      if (parsed.name) autoFixed = true;
    }
    if (!parsed.description && !parsed.summary) {
      const bodyMatch = content.match(/^---[\s\S]*?---\s*\n+([\s\S]*)/);
      const body = bodyMatch ? bodyMatch[1]! : content;
      const first = body
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .find((p) => p && !p.startsWith("#"));
      if (first) {
        parsed.summary = first.replace(/\n/g, " ").trim().slice(0, 200);
        autoFixed = true;
      }
    }
    return { result: parsed, autoFixed };
  }

  private rewriteFrontmatter(original: string, parsed: SkillMeta): string {
    const quote = (s: string) => `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
    const fm = original.match(/^---\s*\n([\s\S]*?)\n---/);
    if (fm) {
      let text = fm[1]!;
      if (parsed.name && !/^name:/m.test(text)) text = `name: ${parsed.name}\n${text}`;
      if (parsed.summary && !/^(?:summary|summary-en):/m.test(text)) text = `${text}\nsummary-en: ${quote(parsed.summary)}`;
      return original.replace(/^---\s*\n[\s\S]*?\n---/, () => `---\n${text}\n---`);
    }
    const lines = [`name: ${parsed.name ?? "unnamed"}`];
    if (parsed.summary) lines.push(`summary-en: ${quote(parsed.summary)}`);
    return `---\n${lines.join("\n")}\n---\n\n${original}`;
  }

  private detectNameConflict(name: string): Conflict | null {
    if (existsSync(path.join(installedSkillsDir(), name))) return { type: "official", existingName: name };
    if (existsSync(path.join(userSkillsDir(), name))) return { type: "user", existingName: name };
    return null;
  }

  private generateSuggestedName(name: string): string {
    const baseName = `my-${name}`;
    let target = baseName;
    for (let suffix = 2; existsSync(path.join(userSkillsDir(), target)) || existsSync(path.join(installedSkillsDir(), target)); suffix++) target = `${baseName}-${suffix}`;
    return target;
  }

  private checkShadowing(name: string): string | undefined {
    if (existsSync(path.join(installedSkillsDir(), name))) return "A market skill with the same name exists. Local version will take priority.";
    return undefined;
  }

  /** SKILL.md 里提到的 references/、scripts/ 等文件包里没带的，列出来提醒用户。 */
  private checkMissingReferences(skillDir: string, content: string): string[] {
    const missing: string[] = [];
    const bodyMatch = content.match(/^---[\s\S]*?---\s*\n+([\s\S]*)$/);
    const body = bodyMatch ? bodyMatch[1]! : content;
    const patterns = [/(?:references|scripts|data|html|style-presets)\/[\w./-]+/g, /\[.*?\]\((\.\/[^)]+)\)/g, /Read\s+.*?`([^`]+\.\w+)`/g];
    const seen = new Set<string>();
    for (const pattern of patterns) {
      let m: RegExpExecArray | null;
      while ((m = pattern.exec(body)) !== null) {
        const ref = (m[1] ?? m[0]).replace(/^\.\//, "");
        if (seen.has(ref)) continue;
        seen.add(ref);
        if (!existsSync(path.join(skillDir, ref))) missing.push(ref);
      }
    }
    for (const dir of ["references", "scripts"]) {
      if (body.includes(`${dir}/`) && !existsSync(path.join(skillDir, dir)) && !missing.some((x) => x.startsWith(`${dir}/`))) missing.push(`${dir}/`);
    }
    return missing;
  }
}

function sanitizeSkillName(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
}

/** 暂存目录在系统 tmp，用户目录可能在另一个卷，rename 会 EXDEV。 */
async function moveDir(src: string, dest: string): Promise<void> {
  try {
    await rename(src, dest);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "EXDEV") throw err;
    await cp(src, dest, { recursive: true });
    await rm(src, { recursive: true, force: true });
  }
}

/** fork 出来的是新技能：名字换成新名，版本从头算。 */
async function writeForkSkillMeta(skillDir: string, targetName: string): Promise<void> {
  const metaPath = path.join(skillDir, "meta.yaml");
  let meta: Record<string, unknown> = {};
  try {
    const parsed = yaml.load(await readFile(metaPath, "utf-8"));
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) meta = parsed as Record<string, unknown>;
  } catch {
    // 没有或写坏了的 meta.yaml 直接重写
  }
  Object.assign(meta, { name: targetName, version: DEFAULT_SKILL_PACKAGE_VERSION });
  await writeFile(metaPath, yaml.dump(meta, { noRefs: true, lineWidth: -1 }));
}
