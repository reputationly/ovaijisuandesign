import { lstat, readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

import { Injectable, Logger } from "@nestjs/common";
import { detectFileType } from "@ov/protocol";

import { type IgnoreMatcher, parseGitignore } from "./gitignore.js";
import { PROJECT_ASSET_ANCHOR_DIR } from "./project-asset-anchors.service.js";

/** 这些目录永远不进候选：依赖、构建产物、版本库和内部状态，里面的文件没人会去 @。 */
const ALWAYS_EXCLUDED = new Set(["node_modules", "dist", "build", ".git", ".next", ".turbo", ".hilo"]);
const MAX_DEPTH = 8;
/** 扫到这么多就停并标 truncated：工作区指到家目录这种情况下不能一直扫下去。 */
const MAX_FILES = 5000;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
/** 输入框里每敲一个字都会来一次，同一个工作区 30 秒内复用上次的扫描结果。 */
const CACHE_TTL_MS = 30_000;
const MAX_CACHE_ENTRIES = 8;

interface Entry {
  scannedAt: number;
  root: string;
  files: { name: string; path: string }[];
  truncated: boolean;
}

export interface MentionItem {
  name: string;
  path: string;
  kind: "image" | "video" | "audio" | "text" | "other";
  score?: number;
  mtimeMs?: number;
}

function kindOf(name: string): MentionItem["kind"] {
  const t = detectFileType(name);
  return t === "image" || t === "video" || t === "audio" || t === "text" ? t : "other";
}

/**
 * 对话输入框里 @ 提及的文件搜索。
 *
 * 工作区文件：按 `.gitignore`（逐层叠加）过滤后按相对路径做子序列模糊匹配；空查询按修改时间倒序给最近的。
 * 项目资产：只列 `.hilo/project-assets/` 下已经锚定过的文件（加到过对话的），按文件名匹配，
 * 缓存和工作区文件分开 —— 锚定之后要能立刻搜到，不能被工作区的 30 秒缓存挡住。
 */
@Injectable()
export class MentionSearchService {
  private readonly log = new Logger("MentionSearch");
  private readonly cache = new Map<string, Entry>();
  private readonly projectAssetCache = new Map<string, Entry>();

  async search(workspace: string, query: string, limit: number | undefined, signal?: AbortSignal) {
    const entry = await this.cached(this.cache, path.resolve(workspace), (root) => this.scanWorkspace(root, signal));
    return this.searchEntry(entry, query, clampLimit(limit), true);
  }

  async searchProjectAssets(workspace: string, query: string, limit: number | undefined, signal?: AbortSignal) {
    const entry = await this.cached(this.projectAssetCache, path.resolve(workspace), (root) => this.scanProjectAssets(root, signal));
    return this.searchEntry(entry, query, clampLimit(limit), false);
  }

  /** 锚点变了（新锚定、源被删）之后丢掉项目资产的缓存。 */
  invalidateProjectAssets(workspace: string): void {
    this.projectAssetCache.delete(path.resolve(workspace));
  }

  private async searchEntry(entry: Entry, query: string, limit: number, byPath: boolean) {
    const q = query.trim();
    let selected: { name: string; path: string; score?: number; mtimeMs?: number }[];
    if (!q) {
      const withTime = await Promise.all(
        entry.files.map(async (f) => {
          const st = await stat(path.join(entry.root, f.path)).catch(() => undefined);
          return { ...f, mtimeMs: st ? Math.floor(st.mtimeMs) : undefined };
        }),
      );
      selected = withTime.sort((a, b) => (b.mtimeMs ?? 0) - (a.mtimeMs ?? 0) || a.path.localeCompare(b.path)).slice(0, limit);
    } else {
      const scored: { file: { name: string; path: string }; score: number }[] = [];
      for (const f of entry.files) {
        const score = scoreMatch(byPath ? f.path : f.name, q);
        if (score > 0) scored.push({ file: f, score });
      }
      scored.sort((a, b) => b.score - a.score || a.file.path.localeCompare(b.file.path));
      selected = scored.slice(0, limit).map((s) => ({ ...s.file, score: s.score }));
    }
    const items: MentionItem[] = await Promise.all(
      selected.map(async (f) => {
        const mtimeMs = f.mtimeMs ?? (await stat(path.join(entry.root, f.path)).then((s) => Math.floor(s.mtimeMs), () => undefined));
        return { name: f.name, path: f.path, kind: kindOf(f.name), ...(f.score !== undefined ? { score: f.score } : {}), ...(mtimeMs !== undefined ? { mtimeMs } : {}) };
      }),
    );
    return { items, truncated: entry.truncated };
  }

  private async cached(cache: Map<string, Entry>, key: string, scan: (root: string) => Promise<Entry>): Promise<Entry> {
    const hit = cache.get(key);
    if (hit && Date.now() - hit.scannedAt < CACHE_TTL_MS) return hit;
    const fresh = await scan(key);
    if (!cache.has(key) && cache.size >= MAX_CACHE_ENTRIES) {
      const oldest = cache.keys().next().value;
      if (oldest !== undefined) cache.delete(oldest);
    }
    cache.set(key, fresh);
    return fresh;
  }

  private async scanProjectAssets(root: string, signal?: AbortSignal): Promise<Entry> {
    const empty: Entry = { scannedAt: Date.now(), root, files: [], truncated: false };
    const dir = path.join(root, ...PROJECT_ASSET_ANCHOR_DIR.split("/"));
    const st = await lstat(dir).catch(() => undefined);
    if (!st?.isDirectory() || st.isSymbolicLink() || signal?.aborted) return empty;
    const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
    const files = entries
      .filter((e) => e.isFile() && !e.name.endsWith(".tmp-relink"))
      .map((e) => ({ name: e.name, path: `${PROJECT_ASSET_ANCHOR_DIR}/${e.name}` }));
    return { scannedAt: Date.now(), root, files, truncated: false };
  }

  private async scanWorkspace(root: string, signal?: AbortSignal): Promise<Entry> {
    const files: { name: string; path: string }[] = [];
    const state = { truncated: false };
    await this.walk(root, root, 0, [], files, state, signal);
    return { scannedAt: Date.now(), root, files, truncated: state.truncated };
  }

  /** 每层把自己的 `.gitignore` 叠上去；每条规则都按它所在目录的相对路径来判断。 */
  private async walk(
    root: string,
    dir: string,
    depth: number,
    inherited: { base: string; m: IgnoreMatcher }[],
    out: { name: string; path: string }[],
    state: { truncated: boolean },
    signal?: AbortSignal,
  ): Promise<void> {
    if (signal?.aborted) return;
    if (out.length >= MAX_FILES || depth > MAX_DEPTH) {
      state.truncated = true;
      return;
    }
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch (err) {
      this.log.debug(`读不了 ${dir}: ${(err as Error).message}`);
      return;
    }
    const local = await readFile(path.join(dir, ".gitignore"), "utf8").catch(() => "");
    const matchers = local.trim() ? [...inherited, { base: dir, m: parseGitignore(local) }] : inherited;
    for (const e of entries) {
      if (signal?.aborted) return;
      if (out.length >= MAX_FILES) {
        state.truncated = true;
        return;
      }
      if (ALWAYS_EXCLUDED.has(e.name) || e.isSymbolicLink()) continue;
      const abs = path.join(dir, e.name);
      const isDir = e.isDirectory();
      const ignored = matchers.some(({ base, m }) => m.ignores(toPosix(path.relative(base, abs)) + (isDir ? "/" : "")));
      if (ignored) continue;
      if (isDir) await this.walk(root, abs, depth + 1, matchers, out, state, signal);
      else if (e.isFile()) out.push({ name: e.name, path: toPosix(path.relative(root, abs)) });
    }
  }
}

function clampLimit(limit: number | undefined): number {
  return Math.max(1, Math.min(limit || DEFAULT_LIMIT, MAX_LIMIT));
}

function toPosix(p: string): string {
  return path.sep === "/" ? p : p.split(path.sep).join("/");
}

/**
 * 子序列模糊匹配的分数：整条路径的分数 + 文件名部分的分数（文件名命中更靠前）。0 表示没配上。
 * 每配上一个字符 +10，在开头 +5，在分隔符（`/ - _ .`）后面 +3，和上一个配上的字符相邻 +2；跳过的字符各 -1。
 */
export function scoreMatch(target: string, query: string): number {
  if (!query) return 0;
  const whole = subsequenceScore(target, query);
  if (whole <= 0) return 0;
  const slash = target.lastIndexOf("/");
  return whole + Math.max(0, subsequenceScore(slash >= 0 ? target.slice(slash + 1) : target, query));
}

function subsequenceScore(target: string, query: string): number {
  const t = target.toLowerCase();
  const q = query.toLowerCase();
  if (!q || q.length > t.length) return 0;
  let ti = 0;
  let qi = 0;
  let score = 0;
  let last = -2;
  let skipped = 0;
  while (ti < t.length && qi < q.length) {
    if (t[ti] === q[qi]) {
      score += 10;
      if (ti === 0) score += 5;
      else if ("/-_.".includes(t[ti - 1]!)) score += 3;
      if (ti === last + 1) score += 2;
      last = ti;
      qi++;
    } else {
      skipped++;
    }
    ti++;
  }
  return qi < q.length ? 0 : score - skipped;
}
