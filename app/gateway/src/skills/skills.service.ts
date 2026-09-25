import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

import { Injectable, Logger, NotFoundException } from "@nestjs/common";

import { GatewayEventBus } from "../common/gateway-event-bus.js";
import { RuntimeClient } from "../runtime/runtime-client.js";
import { RuntimeConnection } from "../runtime/runtime-connection.js";
import { buildFileTree, mapSkillDirs, readSkillFileContent, resolveSkillPath, type SkillCandidate } from "./skill-files.js";
import {
  DEFAULT_SKILL_PACKAGE_VERSION,
  isSkillEnabled,
  matchesPattern,
  parseFrontmatter,
  readMetaYaml,
  SKILL_GUIDE_PROMPT_DEFAULTS,
  type SkillMeta,
  type SkillSource,
} from "./skill-meta.js";
import { buildMarketCategories, buildMarketList, type MarketListQuery, type MarketSkillInfo, toMarketSkillInfo } from "./skill-market.js";
import { allSkillsDirs, allSubAgentSkillsDirs, baseConfigPath, installedSkillsDir, runtimeSkillsCachePath, userPermissionsFile, userSkillsDir } from "./skill-paths.js";

type Permissions = Record<string, string>;
interface RuntimeSkill {
  name: string;
  description: string;
}
interface ScannedSkill {
  name: string;
  meta: SkillMeta;
  source: SkillSource;
  mtime: number;
}

const RUNTIME_SKILLS_READY_TIMEOUT_MS = 1500;
const RUNTIME_SKILLS_FAST_ATTEMPT_TIMEOUT_MS = 1500;
const RUNTIME_SKILLS_FETCH_MAX_ATTEMPTS = 2;
const RUNTIME_SKILLS_RETRY_BACKOFF_MS = 150;
const RUNTIME_SKILLS_LKG_CACHE_VERSION = 1;
const RUNTIME_SKILLS_LKG_CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const errorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));

/**
 * 本地技能：列表、开关、文件浏览。
 *
 * 开关 = base.json 里 `media-agent.permission.skill` 的默认值 + 用户覆盖。覆盖存在
 * `skill-permissions.json`（所有工作区 gateway 共用），内存里的是准，写盘失败要报出来 ——
 * 吞掉的话重启后开关悄悄变回去。
 */
@Injectable()
export class SkillsService {
  private readonly logger = new Logger(SkillsService.name);
  private userOverrides: Permissions;
  private runtimeRefresh: Promise<void> | null = null;

  constructor(
    private readonly runtime: RuntimeClient,
    private readonly conn: RuntimeConnection,
    private readonly bus: GatewayEventBus,
  ) {
    this.userOverrides = this.readPermissionsFile();
  }

  /** 主进程广播的覆盖（某个工作区改了开关，其余 gateway 跟上）。 */
  setUserOverrides(overrides: Permissions): void {
    this.userOverrides = { ...overrides };
    this.logger.log(`User skill overrides set: ${Object.keys(overrides).length} entries`);
  }

  getUserOverrides(): Permissions {
    return { ...this.userOverrides };
  }

  /** 卸载 / 删除后清掉覆盖：同名技能以后再装回来不该继承旧开关。 */
  clearSkillOverride(name: string): Permissions {
    delete this.userOverrides[name];
    this.persistOverrides();
    return { ...this.userOverrides };
  }

  async listSkills() {
    const permissions = this.readPermissions();
    const scanned = await this.scanAllSkills();
    return scanned.map((entry) => ({
      name: entry.name,
      summary: entry.meta.summary ?? "",
      summaryZh: entry.meta.summaryZh ?? "",
      description: entry.meta.description ?? "",
      enabled: isSkillEnabled(entry.name, permissions),
      source: entry.source,
      tools: entry.meta.tools ?? [],
      tags: entry.meta.tags ?? [],
      tagsCn: entry.meta.tagsCn ?? [],
      creator: entry.meta.creator ?? "",
      triggerWords: entry.meta.triggerWords ?? [],
      guidePrompt: entry.meta.guidePrompt ?? SKILL_GUIDE_PROMPT_DEFAULTS.zh,
      guidePromptEn: entry.meta.guidePromptEn ?? SKILL_GUIDE_PROMPT_DEFAULTS.en,
      displayNameZh: entry.meta.displayNameZh ?? "",
      tagEn: entry.meta.tagEn ?? "",
      tagCn: entry.meta.tagCn ?? "",
      completeTagsEn: entry.meta.completeTagsEn ?? [],
      completeTagsCn: entry.meta.completeTagsCn ?? [],
      descEn: entry.meta.descEn ?? "",
      descCn: entry.meta.descCn ?? "",
      coverObjectKey: entry.meta.coverObjectKey,
      showcaseObjectKey: entry.meta.showcaseObjectKey,
      marketSource: entry.meta.marketSource,
      coverUrl: entry.meta.coverUrl,
      coverUrlEn: entry.meta.coverUrlEn,
      authorEn: entry.meta.authorEn,
      authorCn: entry.meta.authorCn,
      showcase: entry.meta.showcase,
      structuredInfo: entry.meta.structuredInfo,
      contentLocale: entry.meta.contentLocale,
      version: entry.meta.version || DEFAULT_SKILL_PACKAGE_VERSION,
      updatedAt: entry.mtime,
    }));
  }

  /**
   * opencode 实际加载的技能，用本地 SKILL.md / meta.yaml 补展示字段。
   *
   * opencode 刚起或正在重启时拿不到：先用上次成功的结果（落盘缓存，7 天内有效）顶上并在后台刷新；
   * 缓存也没有才退回本地扫描。空列表不写缓存 —— 多半是 opencode 还没加载完，不是真没有技能。
   */
  async listRuntimeSkills() {
    try {
      if (!(await this.waitForRuntime(RUNTIME_SKILLS_READY_TIMEOUT_MS))) return this.listRuntimeSkillFallback("OpenCode URL not initialized");
      try {
        const skills = await this.runtime.listSkills(RUNTIME_SKILLS_FAST_ATTEMPT_TIMEOUT_MS);
        if (skills.length === 0) return this.listRuntimeSkillFallback("OpenCode runtime returned no skills");
        this.writeRuntimeCache(skills);
        return await this.mapRuntimeSkills(skills);
      } catch (fastErr) {
        const cached = this.readRuntimeCache();
        if (cached.ok) {
          this.scheduleRuntimeRefresh();
          this.logger.warn(`[skills-runtime] source=lkg-cache-fast reason=${errorMessage(fastErr)} count=${cached.skills.length}; background refresh scheduled`);
          return await this.mapRuntimeSkills(cached.skills);
        }
      }
      const skills = await this.fetchRuntimeSkillsWithRetry();
      if (skills.length === 0) return this.listRuntimeSkillFallback("OpenCode runtime returned no skills");
      this.writeRuntimeCache(skills);
      return await this.mapRuntimeSkills(skills);
    } catch (err) {
      this.logger.warn(`Failed to fetch runtime skills: ${errorMessage(err)}`);
      return this.listRuntimeSkillFallback(errorMessage(err));
    }
  }

  /**
   * 技能市场列表 / 搜索。没有云端市场：「市场」就是随应用自带、由主进程铺到已装目录的那批技能，
   * 首页 Skill 页签（精选来源）和技能页的市场都从这里取。它们本来就装好了，所以一律 installed。
   */
  async listMarketSkills(q: MarketListQuery) {
    return buildMarketList(await this.scanBundledSkills(), q);
  }

  /** 市场分类：从自带技能的标签归纳（见 buildMarketCategories）。 */
  async listMarketCategories(tagType?: string) {
    return buildMarketCategories(await this.scanBundledSkills(), tagType);
  }

  private async scanBundledSkills(): Promise<MarketSkillInfo[]> {
    const entries = await mapSkillDirs([installedSkillsDir()], (c) => this.readSkillEntry(c));
    const seen = new Set<string>();
    return entries.flatMap((e) => {
      const name = e.meta.name ?? e.entryName;
      if (seen.has(name)) return [];
      seen.add(name);
      return [toMarketSkillInfo(name, e.meta)];
    });
  }

  async toggleSkill(name: string, enabled: boolean) {
    const base = this.readBasePermissions();
    if (enabled) {
      if (isSkillEnabled(name, base)) delete this.userOverrides[name];
      else this.userOverrides[name] = "allow";
    } else {
      // 被通配规则放行的技能要显式记 deny；本来就关着的不留多余的覆盖。
      const matchedByWildcard = Object.keys(base).some((p) => p !== "*" && p !== name && matchesPattern(name, p));
      if (matchedByWildcard || isSkillEnabled(name, base)) this.userOverrides[name] = "deny";
      else delete this.userOverrides[name];
    }
    const skill = (await this.listSkills()).find((s) => s.name === name);
    if (!skill) throw new NotFoundException(`Skill "${name}" not found`);
    this.persistOverrides();
    return skill;
  }

  async getSkillFiles(name: string) {
    const skillPath = await resolveSkillPath(name);
    if (!skillPath) throw new NotFoundException(`Skill "${name}" not found`);
    return { skillName: name, skillPath, tree: buildFileTree(skillPath, skillPath) };
  }

  async getSkillFileContent(name: string, relativePath: string) {
    const skillPath = await resolveSkillPath(name);
    if (!skillPath) throw new NotFoundException(`Skill "${name}" not found`);
    return readSkillFileContent(skillPath, relativePath);
  }

  /** 同名技能按目录顺序先到先得（user > installed > 额外目录），冲突记一条警告。 */
  private async scanAllSkills(): Promise<ScannedSkill[]> {
    const userDir = userSkillsDir();
    const seen = new Map<string, string[]>();
    const results: ScannedSkill[] = [];
    for (const item of await mapSkillDirs(allSkillsDirs(), (c) => this.readSkillEntry(c))) {
      const name = item.meta.name ?? item.entryName;
      const locations = seen.get(name);
      if (locations) {
        locations.push(item.skillDir);
        continue;
      }
      seen.set(name, [item.skillDir]);
      results.push({ name, meta: item.meta, source: item.dir === userDir ? "user" : "installed", mtime: item.mtime });
    }
    for (const [name, paths] of seen) {
      if (paths.length > 1) this.logger.warn(`Skill name conflict: "${name}" exists in ${paths.length} locations: ${paths.join(", ")}. Using first occurrence.`);
    }
    return results;
  }

  private async readSkillEntry(c: SkillCandidate): Promise<(SkillCandidate & { meta: SkillMeta; mtime: number }) | null> {
    const skillPath = path.join(c.skillDir, "SKILL.md");
    let content: string;
    try {
      content = await readFile(skillPath, "utf-8");
    } catch (err) {
      const code = (err as NodeJS.ErrnoException)?.code;
      if (code !== "ENOENT" && code !== "ENOTDIR") this.logger.warn(`Failed to read skill ${c.entryName}: ${String(err)}`);
      return null;
    }
    try {
      const fm = parseFrontmatter(content);
      // meta.yaml 比 SKILL.md 里的旧字段新；版本号只认 meta.yaml。
      const ym = await readMetaYaml(c.skillDir, (msg) => this.logger.warn(msg));
      const meta: SkillMeta = { ...fm, ...ym, version: ym.version || DEFAULT_SKILL_PACKAGE_VERSION };
      let mtime = 0;
      try {
        mtime = (await stat(skillPath)).mtimeMs;
      } catch {
        mtime = await stat(c.skillDir).then((s) => s.mtimeMs, () => 0);
      }
      return { ...c, meta, mtime };
    } catch (err) {
      this.logger.warn(`Failed to read skill ${c.entryName}: ${String(err)}`);
      return null;
    }
  }

  private async mapRuntimeSkills(skills: RuntimeSkill[]) {
    const permissions = this.readPermissions();
    const local = new Map((await this.scanAllSkills()).map((e) => [e.name, { ...e.meta, source: e.source }]));
    const subAgentNames = await this.getSubAgentSkillNames();
    return skills
      .filter((s) => !subAgentNames.has(s.name))
      .map((s) => {
        const meta = local.get(s.name);
        return {
          name: s.name,
          version: meta?.version ?? DEFAULT_SKILL_PACKAGE_VERSION,
          summary: meta?.summary ?? "",
          summaryZh: meta?.summaryZh ?? "",
          description: s.description,
          enabled: isSkillEnabled(s.name, permissions),
          source: meta?.source ?? "installed",
          tools: [],
          tags: meta?.tags ?? [],
          tagsCn: meta?.tagsCn ?? [],
          creator: meta?.creator ?? "",
          triggerWords: meta?.triggerWords ?? [],
          guidePrompt: meta?.guidePrompt ?? SKILL_GUIDE_PROMPT_DEFAULTS.zh,
          guidePromptEn: meta?.guidePromptEn ?? SKILL_GUIDE_PROMPT_DEFAULTS.en,
          displayNameZh: meta?.displayNameZh ?? "",
          tagEn: meta?.tagEn ?? "",
          tagCn: meta?.tagCn ?? "",
          completeTagsEn: meta?.completeTagsEn ?? [],
          completeTagsCn: meta?.completeTagsCn ?? [],
          descEn: meta?.descEn ?? "",
          descCn: meta?.descCn ?? "",
          marketSource: meta?.marketSource,
          coverUrl: meta?.coverUrl,
          coverUrlEn: meta?.coverUrlEn,
          authorEn: meta?.authorEn,
          authorCn: meta?.authorCn,
          showcase: meta?.showcase,
          structuredInfo: meta?.structuredInfo,
          contentLocale: meta?.contentLocale,
        };
      });
  }

  private async listRuntimeSkillFallback(reason: string) {
    const cached = this.readRuntimeCache();
    if (cached.ok) {
      this.logger.warn(`[skills-runtime] fallbackSource=lkg-cache reason=${reason} count=${cached.skills.length}`);
      return this.mapRuntimeSkills(cached.skills);
    }
    this.logger.warn(`[skills-runtime] fallbackSource=local reason=${reason} cache=${cached.reason}`);
    return this.listSkills();
  }

  /** 主进程等 opencode 健康后才推地址；刚起的时候稍等一下，等不到就走缓存。 */
  private waitForRuntime(timeoutMs: number): Promise<boolean> {
    if (this.conn.endpoint) return Promise.resolve(true);
    return new Promise((resolve) => {
      const off = this.bus.subscribe((m) => {
        if (m.event !== "internal:opencode-url") return;
        clearTimeout(timer);
        off();
        resolve(true);
      });
      const timer = setTimeout(() => {
        off();
        resolve(!!this.conn.endpoint);
      }, timeoutMs);
    });
  }

  private async fetchRuntimeSkillsWithRetry(): Promise<RuntimeSkill[]> {
    let lastError: unknown = new Error("Runtime skill fetch did not run");
    for (let attempt = 1; attempt <= RUNTIME_SKILLS_FETCH_MAX_ATTEMPTS; attempt++) {
      try {
        return await this.runtime.listSkills();
      } catch (err) {
        lastError = err;
        if (attempt >= RUNTIME_SKILLS_FETCH_MAX_ATTEMPTS) break;
        await new Promise((r) => setTimeout(r, RUNTIME_SKILLS_RETRY_BACKOFF_MS));
      }
    }
    throw lastError;
  }

  private scheduleRuntimeRefresh(): void {
    if (this.runtimeRefresh) return;
    this.runtimeRefresh = (async () => {
      try {
        const skills = await this.fetchRuntimeSkillsWithRetry();
        if (skills.length > 0) this.writeRuntimeCache(skills);
      } catch (err) {
        this.logger.warn(`[skills-runtime] backgroundRefresh failed: ${errorMessage(err)}`);
      } finally {
        this.runtimeRefresh = null;
      }
    })();
  }

  private writeRuntimeCache(skills: RuntimeSkill[]): void {
    const file = runtimeSkillsCachePath();
    const cache = { version: RUNTIME_SKILLS_LKG_CACHE_VERSION, cachedAt: Date.now(), skills: skills.map((s) => ({ name: s.name, description: s.description })) };
    try {
      mkdirSync(path.dirname(file), { recursive: true });
      const tmp = `${file}.tmp.${process.pid}`;
      writeFileSync(tmp, `${JSON.stringify(cache, null, 2)}\n`, { mode: 0o600 });
      renameSync(tmp, file);
    } catch (err) {
      this.logger.warn(`[skills-runtime] cacheWriteFailed path=${file} error=${errorMessage(err)}`);
    }
  }

  private readRuntimeCache(): { ok: true; skills: RuntimeSkill[] } | { ok: false; reason: string } {
    const file = runtimeSkillsCachePath();
    let parsed: unknown;
    try {
      parsed = JSON.parse(readFileSync(file, "utf-8"));
    } catch (err) {
      return { ok: false, reason: (err as NodeJS.ErrnoException)?.code === "ENOENT" ? `cache missing at ${file}` : `cache read failed at ${file}: ${errorMessage(err)}` };
    }
    const c = parsed as { version?: unknown; cachedAt?: unknown; skills?: unknown };
    const valid =
      c?.version === RUNTIME_SKILLS_LKG_CACHE_VERSION &&
      typeof c.cachedAt === "number" &&
      Number.isFinite(c.cachedAt) &&
      Array.isArray(c.skills) &&
      c.skills.every((s) => s && typeof s.name === "string" && s.name.length > 0 && typeof s.description === "string");
    if (!valid) return { ok: false, reason: `invalid cache schema at ${file}` };
    const ageMs = Math.max(0, Date.now() - (c.cachedAt as number));
    if (ageMs > RUNTIME_SKILLS_LKG_CACHE_MAX_AGE_MS) return { ok: false, reason: `cache stale at ${file} ageMs=${ageMs}` };
    return { ok: true, skills: (c.skills as RuntimeSkill[]).map((s) => ({ name: s.name, description: s.description })) };
  }

  private async getSubAgentSkillNames(): Promise<Set<string>> {
    const names = await mapSkillDirs(allSubAgentSkillsDirs(), async ({ entryName, skillDir }) => {
      try {
        return parseFrontmatter(await readFile(path.join(skillDir, "SKILL.md"), "utf-8")).name ?? entryName;
      } catch (err) {
        const code = (err as NodeJS.ErrnoException)?.code;
        return code === "ENOENT" || code === "ENOTDIR" ? null : entryName;
      }
    });
    return new Set(names);
  }

  private readPermissions(): Permissions {
    return { ...this.readBasePermissions(), ...this.userOverrides };
  }

  private readBasePermissions(): Permissions {
    try {
      const config = JSON.parse(readFileSync(baseConfigPath(), "utf-8"));
      return config?.agent?.["media-agent"]?.permission?.skill ?? {};
    } catch (err) {
      this.logger.error(`Failed to read config: ${String(err)}`);
      return {};
    }
  }

  private readPermissionsFile(): Permissions {
    const file = userPermissionsFile();
    try {
      const parsed = JSON.parse(readFileSync(file, "utf-8"));
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
      this.logger.warn(`${file} is not a JSON object, ignoring`);
    } catch (err) {
      if ((err as NodeJS.ErrnoException)?.code !== "ENOENT") this.logger.warn(`Failed to read ${file}: ${errorMessage(err)}`);
    }
    return {};
  }

  private persistOverrides(): void {
    const file = userPermissionsFile();
    try {
      mkdirSync(path.dirname(file), { recursive: true });
      const tmp = `${file}.tmp.${process.pid}`;
      writeFileSync(tmp, `${JSON.stringify(this.userOverrides, null, 2)}\n`, { mode: 0o600 });
      renameSync(tmp, file);
    } catch (err) {
      const message = errorMessage(err);
      this.logger.error(`Failed to persist user overrides to ${file}: ${message}`);
      throw new Error(`Failed to persist skill permissions: ${message}`);
    }
  }
}
