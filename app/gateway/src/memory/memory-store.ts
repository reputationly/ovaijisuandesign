import { createHash, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { withFileLock } from "../common/file-lock.js";

/**
 * 记忆的文件存储：每条一个 `<type>_<name>.md`（YAML frontmatter + markdown 正文），目录下维护自动生成的
 * `MEMORY.md` 索引。和 MCP 的 memory 工具、插件的记忆注入读写的是同一批目录，所以文件名、frontmatter
 * 字段、索引格式、锁都必须和那边一致。
 *
 * 目录：用户级 `$HUB_MEMORY_DIR`（默认 `<数据根>/memory`），项目级 `<工作区>/.hilo/memory`。
 */

export const MEMORY_TYPES = ["user", "feedback", "project", "reference", "media-style", "asset-pin"] as const;
export type MemoryType = (typeof MEMORY_TYPES)[number];
export const ASSET_MODALITIES = ["image", "video", "audio"] as const;
export type AssetModality = (typeof ASSET_MODALITIES)[number];
export const MEMORY_WRITE_SOURCES = ["manual", "auto"] as const;
export type MemoryWriteSource = (typeof MEMORY_WRITE_SOURCES)[number];
export type MemoryScope = "user" | "project";

export const MAX_MEMORY_BODY_BYTES = 30 * 1024;
export const MAX_MEMORY_DESCRIPTION_LENGTH = 200;
export const MEMORY_INDEX_FILENAME = "MEMORY.md";
export const SNAPSHOTS_DIRNAME = ".snapshots";
export const MEMORY_NAME_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;
const ASSET_URI_RE = /^hilo:\/\/asset\/[a-zA-Z0-9_-]+$/;
const ISO_8601_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:?\d{2})$/;

/** 和 MCP 那边的 proper-lockfile 参数一致：30s 算死锁，最多等 5s。 */
const LOCK_OPTS = { staleMs: 30_000, waitMs: 5_000, retryMs: 50 };

export const isMemoryType = (v: unknown): v is MemoryType => typeof v === "string" && (MEMORY_TYPES as readonly string[]).includes(v);
const isAssetModality = (v: unknown): v is AssetModality => typeof v === "string" && (ASSET_MODALITIES as readonly string[]).includes(v);
const isWriteSource = (v: unknown): v is MemoryWriteSource => typeof v === "string" && (MEMORY_WRITE_SOURCES as readonly string[]).includes(v);

/** 业务错误（校验失败、找不到）：接口层转成 400 / 404；其他异常照常抛。 */
export class MemoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MemoryError";
  }
}

export interface MemoryFrontmatter {
  name: string;
  description: string;
  type: MemoryType;
  asset_uri?: string;
  asset_modality?: AssetModality;
  source?: MemoryWriteSource;
  extracted_at?: string;
  compacted_from?: string[];
}

/** 记忆目录的位置：用户级目录总是有，项目级要有打开的工作区。 */
export interface MemoryDirs {
  userDir: string;
  projectRoot?: string;
}

export function projectMemoryDir(projectRoot: string): string {
  return path.join(projectRoot, ".hilo", "memory");
}

// ── frontmatter ──

const FRONTMATTER_RE = /^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/;
const SCALAR_KEYS = new Set(["name", "description", "type", "asset_uri", "asset_modality", "source", "extracted_at"]);

function unquote(value: string): string {
  const t = value.trim();
  if (t.length >= 2) {
    if (t.startsWith('"') && t.endsWith('"')) return t.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, "\\");
    if (t.startsWith("'") && t.endsWith("'")) return t.slice(1, -1).replace(/''/g, "'");
  }
  return t;
}

/** `[a, "b, c"]` 这种流式序列：引号内的逗号不切分。 */
function parseFlowSequence(text: string): string[] {
  const inner = text.slice(1, -1).trim();
  if (!inner) return [];
  const items: string[] = [];
  let buf = "";
  let inDouble = false;
  let inSingle = false;
  let escaped = false;
  for (const ch of inner) {
    if (escaped) {
      buf += ch;
      escaped = false;
    } else if (inDouble && ch === "\\") {
      buf += ch;
      escaped = true;
    } else if (!inSingle && ch === '"') {
      inDouble = !inDouble;
      buf += ch;
    } else if (!inDouble && ch === "'") {
      inSingle = !inSingle;
      buf += ch;
    } else if (!inDouble && !inSingle && ch === ",") {
      items.push(unquote(buf));
      buf = "";
    } else {
      buf += ch;
    }
  }
  if (buf.trim() || items.length > 0) items.push(unquote(buf));
  while (items.length > 0 && items[items.length - 1] === "") items.pop();
  return items;
}

/** 只认已知键的极简 YAML：记忆文件由我们自己写，不需要完整 YAML 语义（也避免 `name: 123` 变成数字）。 */
function parseFields(yaml: string): { scalars: Record<string, string>; compacted?: string[] } {
  const scalars: Record<string, string> = {};
  let compacted: string[] | undefined;
  const lines = yaml.split("\n");
  for (let i = 0; i < lines.length; ) {
    const raw = (lines[i] ?? "").replace(/\r$/, "");
    i += 1;
    if (!raw.trim() || raw.trim().startsWith("#")) continue;
    const m = raw.match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
    if (!m?.[1]) continue;
    const key = m[1];
    const rest = m[2] ?? "";
    if (key === "compacted_from") {
      const t = rest.trim();
      if (t.startsWith("[") && t.endsWith("]")) compacted = parseFlowSequence(t);
      else if (t === "") {
        const items: string[] = [];
        while (i < lines.length) {
          const bm = (lines[i] ?? "").replace(/\r$/, "").match(/^\s+-\s*(.*)$/);
          if (!bm) break;
          items.push(unquote(bm[1] ?? ""));
          i += 1;
        }
        compacted = items;
      } else compacted = [];
      continue;
    }
    if (SCALAR_KEYS.has(key)) scalars[key] = unquote(rest);
  }
  return { scalars, ...(compacted ? { compacted } : {}) };
}

export function parseMemoryFile(content: string): { frontmatter: MemoryFrontmatter; body: string } {
  const match = content.match(FRONTMATTER_RE);
  if (!match) throw new MemoryError("memory file missing frontmatter delimited by ---");
  const { scalars, compacted } = parseFields(match[1] ?? "");
  const name = scalars.name;
  if (!name) throw new MemoryError("frontmatter missing required field: name");
  const description = scalars.description;
  if (description == null) throw new MemoryError("frontmatter missing required field: description");
  if (!isMemoryType(scalars.type)) throw new MemoryError(`frontmatter type invalid: ${scalars.type}`);
  const fm: MemoryFrontmatter = { name, description, type: scalars.type };
  if (scalars.asset_uri != null) fm.asset_uri = scalars.asset_uri;
  if (scalars.asset_modality != null) {
    if (!isAssetModality(scalars.asset_modality)) {
      throw new MemoryError(`frontmatter asset_modality invalid: ${scalars.asset_modality} (allowed: ${ASSET_MODALITIES.join(", ")})`);
    }
    fm.asset_modality = scalars.asset_modality;
  }
  if (scalars.source != null) {
    if (!isWriteSource(scalars.source)) throw new MemoryError(`frontmatter source invalid: ${scalars.source}`);
    fm.source = scalars.source;
  }
  if (scalars.extracted_at) fm.extracted_at = scalars.extracted_at;
  if (compacted && compacted.length > 0) fm.compacted_from = compacted;
  return { frontmatter: fm, body: match[2] ?? "" };
}

function assertSingleLine(field: string, value: string): void {
  if (value.includes("\n") || value.includes("\r")) throw new MemoryError(`${field} must not contain newlines`);
}

/** 会被 YAML 误读的值（冒号、引号、布尔字面量、数字开头等）加双引号。 */
function quoteIfNeeded(value: string): string {
  const needs =
    value === "" ||
    /[:#&*!|>'"%@`,\][]/.test(value) ||
    value !== value.trim() ||
    /^[-?]\s/.test(value) ||
    /^(true|false|null|yes|no|~)$/i.test(value) ||
    /^-?\d/.test(value);
  return needs ? `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"` : value;
}

export function serializeMemoryFile(fm: MemoryFrontmatter, body: string): string {
  assertSingleLine("name", fm.name);
  assertSingleLine("description", fm.description);
  const lines = ["---", `name: ${quoteIfNeeded(fm.name)}`, `description: ${quoteIfNeeded(fm.description)}`, `type: ${fm.type}`];
  if (fm.asset_uri != null) {
    assertSingleLine("asset_uri", fm.asset_uri);
    lines.push(`asset_uri: ${quoteIfNeeded(fm.asset_uri)}`);
  }
  if (fm.asset_modality != null) lines.push(`asset_modality: ${fm.asset_modality}`);
  if (fm.source != null) lines.push(`source: ${fm.source}`);
  if (fm.extracted_at != null) {
    assertSingleLine("extracted_at", fm.extracted_at);
    lines.push(`extracted_at: ${quoteIfNeeded(fm.extracted_at)}`);
  }
  if (fm.compacted_from && fm.compacted_from.length > 0) {
    fm.compacted_from.forEach((e) => assertSingleLine("compacted_from", e));
    lines.push(`compacted_from: [${fm.compacted_from.map(quoteIfNeeded).join(", ")}]`);
  }
  lines.push("---", "");
  if (body.length > 0) lines.push(body.endsWith("\n") ? body.slice(0, -1) : body, "");
  return lines.join("\n");
}

// ── 锁、目录、索引 ──

/** 以 MEMORY.md 为锁目标：写 / 删和重建索引必须串行，否则两个并发写会互相覆盖索引。 */
export function withMemoryLock<T>(dir: string, fn: () => Promise<T>): Promise<T> {
  return withFileLock(path.join(dir, MEMORY_INDEX_FILENAME), LOCK_OPTS, fn);
}

export interface MemoryFileEntry {
  path: string;
  frontmatter: MemoryFrontmatter;
  body: string;
  mtimeMs: number;
}

/** 列目录里能解析的记忆文件；坏文件静默跳过，不让一条损坏拖垮整个列表。 */
export async function listMemoryFiles(dir: string): Promise<MemoryFileEntry[]> {
  let files: string[];
  try {
    files = await readdir(dir);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
  const out: MemoryFileEntry[] = [];
  for (const file of files) {
    if (file === SNAPSHOTS_DIRNAME || !file.endsWith(".md") || file === MEMORY_INDEX_FILENAME) continue;
    const full = path.join(dir, file);
    try {
      const [content, st] = await Promise.all([readFile(full, "utf8"), stat(full)]);
      out.push({ path: full, ...parseMemoryFile(content), mtimeMs: st.mtimeMs });
    } catch {
      // 跳过坏文件
    }
  }
  return out;
}

export async function rebuildMemoryIndex(dir: string): Promise<void> {
  if (!existsSync(dir)) return;
  const entries = (await listMemoryFiles(dir)).sort((a, b) => b.mtimeMs - a.mtimeMs);
  const lines = ["# Memory Index", "", "<!-- AUTO-GENERATED by memory write/delete; do not edit manually -->", ""];
  for (const e of entries) {
    const desc = e.frontmatter.description ? ` — ${e.frontmatter.description}` : "";
    lines.push(`- [${e.frontmatter.name}](${path.basename(e.path)})${desc}`);
  }
  if (entries.length > 0) lines.push("");
  await writeFile(path.join(dir, MEMORY_INDEX_FILENAME), lines.join("\n"), "utf8");
}

const TYPE_FILENAME_PREFIX: Record<MemoryType, string> = {
  user: "user",
  feedback: "feedback",
  project: "project",
  reference: "reference",
  "media-style": "media_style",
  "asset-pin": "asset_pin",
};

export function resolveScopeDir(scope: MemoryScope, dirs: MemoryDirs): string {
  if (scope === "project") {
    if (!dirs.projectRoot) throw new MemoryError("projectRoot is required when scope === 'project'");
    return projectMemoryDir(dirs.projectRoot);
  }
  return dirs.userDir;
}

function resolvedScopes(dirs: MemoryDirs): { scope: MemoryScope; dir: string }[] {
  const scopes: { scope: MemoryScope; dir: string }[] = [];
  if (dirs.projectRoot) scopes.push({ scope: "project", dir: projectMemoryDir(dirs.projectRoot) });
  scopes.push({ scope: "user", dir: dirs.userDir });
  return scopes;
}

function validateName(name: string): void {
  if (!MEMORY_NAME_RE.test(name)) throw new MemoryError(`name must match /^[a-z0-9][a-z0-9-]{0,63}$/ (kebab-case, 1-64 chars): ${name}`);
}

function validateDescription(description: string): void {
  if (description.length === 0) throw new MemoryError("description must not be empty");
  if (description.length > MAX_MEMORY_DESCRIPTION_LENGTH) {
    throw new MemoryError(`description exceeds ${MAX_MEMORY_DESCRIPTION_LENGTH} chars (got ${description.length})`);
  }
  if (/[\r\n]/.test(description)) throw new MemoryError("description must be a single line");
}

function validateBody(body: string): void {
  const bytes = Buffer.byteLength(body, "utf8");
  if (bytes > MAX_MEMORY_BODY_BYTES) throw new MemoryError(`body exceeds ${MAX_MEMORY_BODY_BYTES} bytes (got ${bytes})`);
}

function validateAssetFields(input: { scope: MemoryScope; type: MemoryType; asset_uri?: string; asset_modality?: string }): void {
  if (input.type === "asset-pin") {
    // 资产 id 只在本项目内稳定，钉到用户级没有意义
    if (input.scope !== "project") throw new MemoryError("type='asset-pin' requires scope='project' (asset URIs are not stable across projects)");
    if (!input.asset_uri) throw new MemoryError("type='asset-pin' requires asset_uri");
    if (!ASSET_URI_RE.test(input.asset_uri)) throw new MemoryError(`asset_uri must match /^hilo:\\/\\/asset\\/[a-zA-Z0-9_-]+$/: ${input.asset_uri}`);
    if (!input.asset_modality) throw new MemoryError("type='asset-pin' requires asset_modality");
    if (!isAssetModality(input.asset_modality)) throw new MemoryError(`asset_modality invalid: ${input.asset_modality}`);
  } else {
    if (input.asset_uri != null) throw new MemoryError(`asset_uri is only allowed when type='asset-pin' (got type='${input.type}')`);
    if (input.asset_modality != null) throw new MemoryError(`asset_modality is only allowed when type='asset-pin' (got type='${input.type}')`);
  }
}

function validateProvenance(input: { source?: string; extracted_at?: string }): void {
  if (input.source != null && !isWriteSource(input.source)) throw new MemoryError(`source invalid: ${input.source}`);
  if (input.source === "auto") {
    if (!input.extracted_at) throw new MemoryError("source='auto' requires extracted_at (ISO 8601 timestamp)");
    if (!ISO_8601_RE.test(input.extracted_at)) throw new MemoryError(`extracted_at must be ISO 8601: ${input.extracted_at}`);
  } else if (input.extracted_at != null) {
    throw new MemoryError(`extracted_at is only allowed when source='auto' (got source='${input.source ?? "manual"}')`);
  }
}

/** 压缩时判重用：同类型、描述规整后相同的两条视为重复。 */
export function dedupHashFor(type: MemoryType, description: string): string {
  const normalized = description.trim().toLowerCase().replace(/\s+/g, " ");
  return createHash("sha256").update(`${type}:${normalized}`).digest("hex");
}

/** 写到同目录临时文件再 rename：读者（插件注入）永远看不到半截文件。临时文件不是 .md，列表会跳过它。 */
async function atomicWrite(target: string, content: string): Promise<void> {
  const tmp = path.join(path.dirname(target), `.mem-${randomUUID()}.tmp`);
  await writeFile(tmp, content, "utf8");
  try {
    await rename(tmp, target);
  } catch (err) {
    await unlink(tmp).catch(() => undefined);
    throw err;
  }
}

// ── 操作 ──

export interface MemoryWriteInput {
  scope: MemoryScope;
  name: string;
  type: MemoryType;
  description: string;
  body: string;
  asset_uri?: string;
  asset_modality?: AssetModality;
  source?: MemoryWriteSource;
  extracted_at?: string;
}

function buildFile(input: MemoryWriteInput): { filename: string; serialized: string } {
  if (!isMemoryType(input.type)) throw new MemoryError(`type invalid: ${String(input.type)}`);
  validateName(input.name);
  validateDescription(input.description);
  validateBody(input.body);
  validateAssetFields(input);
  validateProvenance(input);
  const fm: MemoryFrontmatter = { name: input.name, description: input.description, type: input.type };
  if (input.asset_uri != null) fm.asset_uri = input.asset_uri;
  if (input.asset_modality != null) fm.asset_modality = input.asset_modality;
  if (input.source != null) fm.source = input.source;
  if (input.extracted_at != null) fm.extracted_at = input.extracted_at;
  return { filename: `${TYPE_FILENAME_PREFIX[input.type]}_${input.name}.md`, serialized: serializeMemoryFile(fm, input.body) };
}

export async function memoryWrite(dirs: MemoryDirs, input: MemoryWriteInput): Promise<{ path: string; created: boolean }> {
  const { filename, serialized } = buildFile(input);
  const dir = resolveScopeDir(input.scope, dirs);
  await mkdir(dir, { recursive: true });
  const target = path.join(dir, filename);
  return withMemoryLock(dir, async () => {
    const created = !existsSync(target);
    await atomicWrite(target, serialized);
    await rebuildMemoryIndex(dir);
    return { path: target, created };
  });
}

/** 已经拿着锁的调用方（压缩改写）用：只写文件，不加锁、不重建索引。 */
export async function writeMemoryFileUnlocked(dirs: MemoryDirs, input: MemoryWriteInput): Promise<{ path: string }> {
  const { filename, serialized } = buildFile(input);
  const dir = resolveScopeDir(input.scope, dirs);
  await mkdir(dir, { recursive: true });
  const target = path.join(dir, filename);
  await atomicWrite(target, serialized);
  return { path: target };
}

/** 按 frontmatter 的 name 找，不按文件名：文件名带类型前缀，调用方只知道 name。 */
export async function memoryRead(dirs: MemoryDirs, input: { scope: MemoryScope; name: string }) {
  validateName(input.name);
  const match = (await listMemoryFiles(resolveScopeDir(input.scope, dirs))).find((e) => e.frontmatter.name === input.name);
  if (!match) throw new MemoryError(`memory not found: ${input.scope}/${input.name}`);
  return { frontmatter: match.frontmatter, body: match.body, path: match.path };
}

export async function memoryDelete(dirs: MemoryDirs, input: { scope: MemoryScope; name: string }): Promise<{ deleted: boolean }> {
  validateName(input.name);
  const dir = resolveScopeDir(input.scope, dirs);
  return withMemoryLock(dir, async () => {
    const match = (await listMemoryFiles(dir)).find((e) => e.frontmatter.name === input.name);
    if (!match) return { deleted: false };
    try {
      await unlink(match.path);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return { deleted: false };
      throw err;
    }
    await rebuildMemoryIndex(dir);
    return { deleted: true };
  });
}

export interface MemoryListEntry {
  scope: MemoryScope;
  name: string;
  type: MemoryType;
  description: string;
  updated_at: string;
  path: string;
  match_in?: ("description" | "body")[];
}

function requireProjectRootFor(requested: string, dirs: MemoryDirs): void {
  if (requested !== "user" && !dirs.projectRoot) {
    throw new MemoryError(`projectRoot is required for scope='${requested}' (project entries cannot be located without it)`);
  }
}

export async function memoryList(dirs: MemoryDirs, scope: MemoryScope | "all" = "all"): Promise<{ entries: MemoryListEntry[] }> {
  requireProjectRootFor(scope, dirs);
  const entries: MemoryListEntry[] = [];
  for (const s of resolvedScopes(dirs)) {
    if (scope !== "all" && s.scope !== scope) continue;
    const files = (await listMemoryFiles(s.dir)).sort((a, b) => b.mtimeMs - a.mtimeMs);
    for (const f of files) {
      entries.push({
        scope: s.scope,
        name: f.frontmatter.name,
        type: f.frontmatter.type,
        description: f.frontmatter.description,
        updated_at: new Date(f.mtimeMs).toISOString(),
        path: f.path,
      });
    }
  }
  return { entries };
}

export const DEFAULT_RECENT_AUTO_LIMIT = 50;
export const MAX_RECENT_AUTO_LIMIT = 200;

/** 最近一段时间里自动提取出来的记忆（source=auto），按提取时间新的在前。给界面"刚记住了什么"的提示用。 */
export async function listRecentAutoFeedback(dirs: MemoryDirs, input: { scope: MemoryScope | "all"; sinceMs: number; limit?: number }) {
  requireProjectRootFor(input.scope, dirs);
  if (!Number.isFinite(input.sinceMs) || input.sinceMs < 0) throw new MemoryError(`sinceMs must be a non-negative finite number: ${input.sinceMs}`);
  const limit = Math.min(Math.max(1, Math.floor(input.limit ?? DEFAULT_RECENT_AUTO_LIMIT)), MAX_RECENT_AUTO_LIMIT);
  const cutoff = Date.now() - input.sinceMs;
  const hits: (MemoryListEntry & { source: "auto"; extracted_at: string })[] = [];
  for (const s of resolvedScopes(dirs)) {
    if (input.scope !== "all" && s.scope !== input.scope) continue;
    for (const f of await listMemoryFiles(s.dir)) {
      const { source, extracted_at } = f.frontmatter;
      if (source !== "auto" || !extracted_at) continue;
      const at = Date.parse(extracted_at);
      if (Number.isNaN(at) || at < cutoff) continue;
      hits.push({
        scope: s.scope,
        name: f.frontmatter.name,
        type: f.frontmatter.type,
        description: f.frontmatter.description,
        updated_at: new Date(f.mtimeMs).toISOString(),
        path: f.path,
        source: "auto",
        extracted_at,
      });
    }
  }
  hits.sort((a, b) => Date.parse(b.extracted_at) - Date.parse(a.extracted_at));
  return { entries: hits.slice(0, limit) };
}

/** 大小写不敏感的子串匹配，查 description 和正文。 */
export async function memorySearch(
  dirs: MemoryDirs,
  input: { query: string; scope?: MemoryScope | "all"; type?: string },
): Promise<{ entries: MemoryListEntry[] }> {
  const query = input.query.trim();
  if (!query) throw new MemoryError("query must not be empty");
  const requested = input.scope ?? "all";
  requireProjectRootFor(requested, dirs);
  if (input.type !== undefined && !isMemoryType(input.type)) throw new MemoryError(`type invalid: ${String(input.type)}`);
  const needle = query.toLowerCase();
  const entries: MemoryListEntry[] = [];
  for (const s of resolvedScopes(dirs)) {
    if (requested !== "all" && s.scope !== requested) continue;
    const files = (await listMemoryFiles(s.dir)).sort((a, b) => b.mtimeMs - a.mtimeMs);
    for (const f of files) {
      if (input.type !== undefined && f.frontmatter.type !== input.type) continue;
      const inDesc = f.frontmatter.description.toLowerCase().includes(needle);
      const inBody = f.body.toLowerCase().includes(needle);
      if (!inDesc && !inBody) continue;
      entries.push({
        scope: s.scope,
        name: f.frontmatter.name,
        type: f.frontmatter.type,
        description: f.frontmatter.description,
        updated_at: new Date(f.mtimeMs).toISOString(),
        path: f.path,
        match_in: [...(inDesc ? (["description"] as const) : []), ...(inBody ? (["body"] as const) : [])],
      });
    }
  }
  return { entries };
}
