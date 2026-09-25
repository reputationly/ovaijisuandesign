/**
 * 项目资产（`projectAssets` 频道）：每个项目自己的本地素材库。
 *
 * 文件放在 `<projectsRoot>/.projects/<folderName>/.assets/`，索引是同一项目下
 * `.hilo/project-assets.sqlite`（表结构与版本号固定，gateway 按它解析 `{source:"project"}` 引用）。
 * 用户可能直接在访达里往 `.assets/` 里放文件或删文件，所以列表前先对一遍磁盘：
 * 丢了的行删掉，多出来的文件补成 local 记录。
 *
 * 云端同步（上传、下载、审核）不在范围内：传输列表始终为空，发起传输直接失败。
 */
import { randomUUID } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readdirSync, renameSync, statSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { Emitter } from "../ipc/events.js";

const SCHEMA_VERSION = 4;
const ASSETS_DIR = ".assets";
const PROJECTS_DIR = ".projects";
const INTERNAL_DIR = ".hilo";
const INDEX_DB = "project-assets.sqlite";
/** 界面最多显示 4 层文件夹：文件夹最深 3 层，文件最深 4 层。 */
const MAX_FOLDER_DEPTH = 3;
const MAX_FILE_DEPTH = MAX_FOLDER_DEPTH + 1;
const FOLDER_NAME_MAX_CHARS = 50;
const LEAF_MAX_CHARS = 180;
const MAX_OPEN_STORES = 8;
const NON_ASSET_FILES = new Set([".DS_Store"]);

export interface AssetRecord {
  id: string;
  source: "cloud" | "local";
  relPath: string;
  name: string;
  size?: number;
  mime?: string;
  createdAt: number;
  updatedAt?: number;
  downloadedAt?: number;
  remoteUpdatedAt?: number;
  remoteCreatedAt?: number;
}

export interface AssetsChange {
  projectFolderName: string;
  kind: "asset" | "folder";
  change: "created" | "updated" | "deleted";
}

interface ConflictOptions {
  onConflict?: "reject" | "rename";
  missingOk?: boolean;
  remoteUpdatedAt?: number;
}

interface Row {
  id: string;
  source: "cloud" | "local";
  rel_path: string;
  name: string;
  size: number | null;
  mime: string | null;
  created_at: number;
  updated_at: number | null;
  downloaded_at: number | null;
  remote_updated_at: number | null;
  remote_created_at: number | null;
}

function rowToRecord(r: Row): AssetRecord {
  return {
    id: r.id,
    source: r.source,
    relPath: r.rel_path,
    name: r.name,
    ...(r.size !== null ? { size: r.size } : {}),
    ...(r.mime !== null ? { mime: r.mime } : {}),
    createdAt: r.created_at,
    ...(r.updated_at !== null ? { updatedAt: r.updated_at } : {}),
    ...(r.downloaded_at !== null ? { downloadedAt: r.downloaded_at } : {}),
    ...(r.remote_updated_at !== null ? { remoteUpdatedAt: r.remote_updated_at } : {}),
    ...(r.remote_created_at !== null ? { remoteCreatedAt: r.remote_created_at } : {}),
  };
}

/** 文件 / 文件夹名：去掉非法字符、合并空白、去掉开头的点，按码点截断。 */
export function sanitizeFileName(seed: string, maxChars: number): string {
  if (!seed) return "";
  let cleaned = seed
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+/, "")
    .trim();
  const chars = [...cleaned];
  if (chars.length > maxChars) cleaned = chars.slice(0, maxChars).join("").trim();
  return cleaned;
}

/** 文件名：主干和扩展名分开清理，清空了就叫 asset。 */
export function sanitizeAssetLeaf(name: string): string {
  const idx = name.lastIndexOf(".");
  const hasExt = idx > 0 && idx < name.length - 1;
  const stem = hasExt ? name.slice(0, idx) : name;
  const ext = hasExt ? sanitizeFileName(name.slice(idx + 1), 20) : "";
  const safeStem = sanitizeFileName(stem, LEAF_MAX_CHARS);
  if (!safeStem) return ext ? `asset.${ext}` : "asset";
  return ext ? `${safeStem}.${ext}` : safeStem;
}

const toPosix = (p: string) => p.split(path.sep).join("/");
const escapeLike = (s: string) => s.replace(/([\\%_])/g, "\\$1");

class AssetIndexStore {
  private readonly db: DatabaseSync;
  private closed = false;

  constructor(
    readonly assetsDir: string,
    indexPath: string,
  ) {
    mkdirSync(assetsDir, { recursive: true });
    mkdirSync(path.dirname(indexPath), { recursive: true });
    this.db = new DatabaseSync(indexPath);
    this.db.exec("PRAGMA journal_mode = WAL");
    this.db.exec("PRAGMA synchronous = NORMAL");
    this.migrate();
  }

  private migrate(): void {
    const { user_version: version } = this.db.prepare("PRAGMA user_version").get() as { user_version: number };
    if (version >= SCHEMA_VERSION) return;
    if (version < 1) {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS asset_entries (
          id                TEXT PRIMARY KEY,
          source            TEXT NOT NULL CHECK (source IN ('cloud', 'local')),
          rel_path          TEXT NOT NULL UNIQUE,
          name              TEXT NOT NULL,
          size              INTEGER,
          mime              TEXT,
          created_at        INTEGER NOT NULL,
          updated_at        INTEGER,
          downloaded_at     INTEGER,
          remote_updated_at INTEGER,
          remote_created_at INTEGER
        );
        CREATE INDEX IF NOT EXISTS idx_asset_entries_source ON asset_entries(source);
      `);
    } else {
      if (version < 2) this.db.exec("ALTER TABLE asset_entries ADD COLUMN updated_at INTEGER");
      if (version < 3) {
        this.db.exec("ALTER TABLE asset_entries ADD COLUMN remote_updated_at INTEGER");
        this.db.exec("UPDATE asset_entries SET remote_updated_at = downloaded_at WHERE source = 'cloud' AND downloaded_at IS NOT NULL");
      }
      if (version < 4) this.db.exec("ALTER TABLE asset_entries ADD COLUMN remote_created_at INTEGER");
    }
    this.db.exec(`PRAGMA user_version = ${SCHEMA_VERSION}`);
  }

  upsert(r: AssetRecord): void {
    this.db
      .prepare(
        `INSERT INTO asset_entries (id, source, rel_path, name, size, mime, created_at, updated_at, downloaded_at, remote_updated_at, remote_created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           source = excluded.source, rel_path = excluded.rel_path, name = excluded.name, size = excluded.size,
           mime = excluded.mime, created_at = excluded.created_at, updated_at = excluded.updated_at,
           downloaded_at = excluded.downloaded_at, remote_updated_at = excluded.remote_updated_at,
           remote_created_at = excluded.remote_created_at`,
      )
      .run(
        r.id, r.source, r.relPath, r.name, r.size ?? null, r.mime ?? null, r.createdAt, r.updatedAt ?? null,
        r.downloadedAt ?? null, r.remoteUpdatedAt ?? null, r.remoteCreatedAt ?? null,
      );
  }

  getById(id: string): AssetRecord | undefined {
    const row = this.db.prepare("SELECT * FROM asset_entries WHERE id = ?").get(id) as Row | undefined;
    return row ? rowToRecord(row) : undefined;
  }

  getByRelPath(relPath: string): AssetRecord | undefined {
    const row = this.db.prepare("SELECT * FROM asset_entries WHERE rel_path = ?").get(relPath) as Row | undefined;
    return row ? rowToRecord(row) : undefined;
  }

  listAll(): AssetRecord[] {
    return (this.db.prepare("SELECT * FROM asset_entries ORDER BY rel_path").all() as unknown as Row[]).map(rowToRecord);
  }

  /** 在某个文件夹（不含子文件夹）里按名字找，不区分大小写。 */
  searchByName(query: string, parentRelPath: string): AssetRecord[] {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return [];
    const like = `%${escapeLike(keyword)}%`;
    const order = "ORDER BY updated_at DESC, created_at DESC, name ASC";
    if (!parentRelPath) {
      const rows = this.db.prepare(`SELECT * FROM asset_entries WHERE lower(name) LIKE ? ESCAPE '\\' AND instr(rel_path, '/') = 0 ${order}`).all(like);
      return (rows as unknown as Row[]).map(rowToRecord);
    }
    const parent = parentRelPath.replace(/^\/+|\/+$/g, "");
    const rows = this.db
      .prepare(`SELECT * FROM asset_entries WHERE lower(name) LIKE ? ESCAPE '\\' AND rel_path LIKE ? ESCAPE '\\' AND instr(substr(rel_path, ?), '/') = 0 ${order}`)
      .all(like, `${escapeLike(parent)}/%`, parent.length + 2);
    return (rows as unknown as Row[]).map(rowToRecord);
  }

  listSyncStates(): Array<{ id: string; relPath: string; mirrorExists: boolean; remoteUpdatedAt?: number }> {
    const rows = this.db.prepare("SELECT id, rel_path, remote_updated_at FROM asset_entries WHERE source = 'cloud'").all() as unknown as Row[];
    return rows.map((r) => ({
      id: r.id,
      relPath: r.rel_path,
      mirrorExists: existsSync(path.join(this.assetsDir, ...r.rel_path.split("/"))),
      ...(r.remote_updated_at !== null ? { remoteUpdatedAt: r.remote_updated_at } : {}),
    }));
  }

  deleteById(id: string): boolean {
    return Number(this.db.prepare("DELETE FROM asset_entries WHERE id = ?").run(id).changes) > 0;
  }

  deleteByRelPathPrefix(prefix: string): number {
    const p = prefix.replace(/\/+$/, "");
    return Number(this.db.prepare("DELETE FROM asset_entries WHERE rel_path LIKE ? ESCAPE '\\'").run(`${escapeLike(p)}/%`).changes);
  }

  updateRelPathPrefix(oldPrefix: string, newPrefix: string): number {
    const from = oldPrefix.replace(/\/+$/, "");
    const to = newPrefix.replace(/\/+$/, "");
    if (!from || !to || from === to) return 0;
    return Number(
      this.db.prepare("UPDATE asset_entries SET rel_path = ? || substr(rel_path, ?) WHERE rel_path LIKE ? ESCAPE '\\'").run(to, from.length + 1, `${escapeLike(from)}/%`).changes,
    );
  }

  absolutePath(r: AssetRecord): string {
    return path.join(this.assetsDir, ...r.relPath.split("/"));
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    try {
      this.db.close();
    } catch {
      // 关不掉也不影响后续重新打开
    }
  }
}

export interface ProjectAssetsDeps {
  projectsRoot: () => string;
  trashItem: (p: string) => Promise<void>;
}

const fail = (reason: string) => new Error(`project-assets: ${reason}`);

export class ProjectAssetsService {
  private readonly assetsChanged = new Emitter<AssetsChange>();
  private readonly transferChanged = new Emitter<unknown>();
  // 类字段才会被频道当成事件
  readonly onDidChangeAssets = this.assetsChanged.event;
  readonly onDidChangeTransfer = this.transferChanged.event;
  /** 打开的索引，按最近使用排（LRU）。 */
  private readonly stores = new Map<string, AssetIndexStore>();

  constructor(private readonly deps: ProjectAssetsDeps) {}

  dispose(): void {
    for (const s of this.stores.values()) s.close();
    this.stores.clear();
    this.assetsChanged.dispose();
    this.transferChanged.dispose();
  }

  // ── 路径 ─────────────────────────────────────────────

  private requireFolderName(name: unknown): asserts name is string {
    if (
      typeof name !== "string" || !name.trim() || name === "." || name === ".." || name.includes("/") || name.includes("\\") ||
      name.includes("\0") || /^[a-zA-Z]:/.test(name) || path.isAbsolute(name)
    ) {
      throw fail("projectFolderName must be a single safe path segment");
    }
  }

  private projectFolder(name: string): string {
    this.requireFolderName(name);
    return path.join(this.deps.projectsRoot(), PROJECTS_DIR, name);
  }

  private assetsDir(name: string): string {
    return path.join(this.projectFolder(name), ASSETS_DIR);
  }

  private assetFolder(name: string, segments: unknown): string {
    const safe = (Array.isArray(segments) ? segments : [])
      .map((s) => sanitizeFileName(String(s), FOLDER_NAME_MAX_CHARS))
      .filter((s) => s.length > 0);
    return path.join(this.assetsDir(name), ...safe);
  }

  private assetPath(name: string, segments: unknown, leaf: string): string {
    return path.join(this.assetFolder(name, segments), sanitizeAssetLeaf(leaf));
  }

  private store(name: string): AssetIndexStore {
    const hit = this.stores.get(name);
    if (hit) {
      this.stores.delete(name);
      this.stores.set(name, hit);
      return hit;
    }
    const created = new AssetIndexStore(this.assetsDir(name), path.join(this.projectFolder(name), INTERNAL_DIR, INDEX_DB));
    this.stores.set(name, created);
    if (this.stores.size > MAX_OPEN_STORES) {
      const oldest = this.stores.keys().next().value;
      if (oldest !== undefined) {
        this.stores.get(oldest)?.close();
        this.stores.delete(oldest);
      }
    }
    return created;
  }

  private fire(name: string, kind: AssetsChange["kind"], change: AssetsChange["change"]): void {
    this.assetsChanged.fire({ projectFolderName: name, kind, change });
  }

  /** 同名时追加 " (1)"、" (2)"…；ownerId 是自己的那一行不算冲突。 */
  private uniquifyTarget(initial: string, store: AssetIndexStore, dir: string, ownerId?: string): string {
    const parent = path.dirname(initial);
    const base = path.basename(initial);
    const dot = base.lastIndexOf(".");
    const hasExt = dot > 0 && dot < base.length - 1;
    const stem = hasExt ? base.slice(0, dot) : base;
    const ext = hasExt ? base.slice(dot) : "";
    for (let n = 0; ; n++) {
      const candidate = n === 0 ? initial : path.join(parent, `${stem} (${n})${ext}`);
      const row = store.getByRelPath(toPosix(path.relative(dir, candidate)));
      if (row && ownerId && row.id === ownerId) return candidate;
      if (!(row && row.id !== ownerId) && !existsSync(candidate)) return candidate;
    }
  }

  private static uniquifyFolder(initial: string): string {
    for (let n = 1; ; n++) {
      const candidate = path.join(path.dirname(initial), `${path.basename(initial)} (${n})`);
      if (!existsSync(candidate)) return candidate;
    }
  }

  private *walk(root: string, wantDirs: boolean, rel = ""): Generator<string> {
    let entries;
    try {
      entries = readdirSync(rel ? path.join(root, ...rel.split("/")) : root, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (!wantDirs && rel === "" && NON_ASSET_FILES.has(e.name)) continue;
      const child = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) {
        if (wantDirs) yield child;
        yield* this.walk(root, wantDirs, child);
      } else if (!wantDirs && e.isFile()) {
        yield child;
      }
    }
  }

  private static subtreeDepths(root: string, depth = 0): { folder: number; file: number } {
    let folder = 0;
    let file = 0;
    let entries;
    try {
      entries = readdirSync(root, { withFileTypes: true });
    } catch {
      return { folder, file };
    }
    for (const e of entries) {
      if (NON_ASSET_FILES.has(e.name)) continue;
      const d = depth + 1;
      if (e.isDirectory()) {
        const child = ProjectAssetsService.subtreeDepths(path.join(root, e.name), d);
        folder = Math.max(folder, d, child.folder);
        file = Math.max(file, child.file);
      } else {
        file = Math.max(file, d);
      }
    }
    return { folder, file };
  }

  // ── 查询 ─────────────────────────────────────────────

  async listAssets(name: string): Promise<AssetRecord[]> {
    const store = this.store(name);
    const dir = this.assetsDir(name);
    for (const r of store.listAll()) {
      let s;
      try {
        s = statSync(store.absolutePath(r));
      } catch {
        store.deleteById(r.id);
        continue;
      }
      const mtime = Math.floor(s.mtimeMs);
      if (r.updatedAt !== mtime || r.size !== s.size) store.upsert({ ...r, size: s.size, updatedAt: mtime });
    }
    const known = new Set(store.listAll().map((r) => r.relPath));
    for (const relPath of this.walk(dir, false)) {
      if (known.has(relPath)) continue;
      let s;
      try {
        s = statSync(path.join(dir, ...relPath.split("/")));
      } catch {
        continue;
      }
      store.upsert({ id: randomUUID(), source: "local", relPath, name: path.posix.basename(relPath), size: s.size, createdAt: Date.now(), updatedAt: Math.floor(s.mtimeMs) });
    }
    return store.listAll();
  }

  async searchLocalAssets(name: string, query: string, parentRelPath: string): Promise<AssetRecord[]> {
    this.requireFolderName(name);
    if (!String(query ?? "").trim()) return [];
    return this.store(name).searchByName(String(query), String(parentRelPath ?? "").replace(/^\/+|\/+$/g, ""));
  }

  async listAssetSyncStates(name: string): Promise<ReturnType<AssetIndexStore["listSyncStates"]>> {
    return this.store(name).listSyncStates();
  }

  async listLocalFolders(name: string): Promise<string[]> {
    return [...this.walk(this.assetsDir(name), true)];
  }

  async getAssetAbsolutePath(name: string, assetId: string): Promise<string | null> {
    const store = this.store(name);
    const r = store.getById(assetId);
    if (!r) return null;
    const abs = store.absolutePath(r);
    return existsSync(abs) ? abs : null;
  }

  async getAssetsDir(name: string): Promise<string> {
    return this.assetsDir(name);
  }

  // ── 修改 ─────────────────────────────────────────────

  async createLocalFolder(name: string, segments: string[]): Promise<void> {
    if (!Array.isArray(segments) || segments.length === 0) throw fail("createLocalFolder requires at least one segment");
    const dir = this.assetsDir(name);
    const abs = this.assetFolder(name, segments);
    if (path.resolve(abs) === path.resolve(dir)) throw fail("folder name is empty after sanitization");
    if (path.relative(dir, abs).split(path.sep).length > MAX_FOLDER_DEPTH) throw fail("depth_exceeded");
    const existed = existsSync(abs);
    mkdirSync(abs, { recursive: true });
    if (!existed) this.fire(name, "folder", "created");
  }

  async renameLocalAsset(name: string, assetId: string, newName: string, options?: ConflictOptions): Promise<AssetRecord | undefined> {
    const trimmed = String(newName ?? "").trim();
    if (!trimmed) throw fail("renameLocalAsset requires a non-empty name");
    const store = this.store(name);
    const r = store.getById(assetId);
    if (!r) {
      if (options?.missingOk) return undefined;
      throw fail("unknown asset id");
    }
    const patch = options?.remoteUpdatedAt !== undefined && r.source === "cloud" ? { remoteUpdatedAt: options.remoteUpdatedAt } : undefined;
    const dir = this.assetsDir(name);
    const current = store.absolutePath(r);
    let target = this.assetPath(name, r.relPath.split("/").slice(0, -1), trimmed);
    if (path.resolve(target) === path.resolve(current)) {
      if (!patch) return r;
      const unchanged = { ...r, ...patch };
      store.upsert(unchanged);
      this.fire(name, "asset", "updated");
      return unchanged;
    }
    const targetRel = toPosix(path.relative(dir, target));
    const other = store.getByRelPath(targetRel);
    // 只改大小写：大小写不敏感的文件系统上目标"已存在"其实就是自己
    const isSelf = other?.id === r.id || targetRel.toLowerCase() === r.relPath.toLowerCase();
    if (!isSelf && (other !== undefined || existsSync(target))) {
      if ((options?.onConflict ?? "reject") === "reject") throw fail("duplicate_name");
      target = this.uniquifyTarget(target, store, dir, r.id);
    }
    renameSync(current, target);
    const updated = { ...r, ...patch, relPath: toPosix(path.relative(dir, target)), name: path.basename(target), updatedAt: Date.now() };
    store.upsert(updated);
    this.fire(name, "asset", "updated");
    return updated;
  }

  async renameLocalFolder(name: string, segments: string[], newName: string, options?: ConflictOptions): Promise<string | undefined> {
    if (!Array.isArray(segments) || segments.length === 0) throw fail("renameLocalFolder requires at least one segment");
    const trimmed = String(newName ?? "").trim();
    if (!trimmed) throw fail("renameLocalFolder requires a non-empty name");
    const store = this.store(name);
    const dir = this.assetsDir(name);
    const current = this.assetFolder(name, segments);
    if (path.resolve(current) === path.resolve(dir)) throw fail("refusing to rename the assets root");
    if (!existsSync(current)) {
      if (options?.missingOk) return undefined;
      throw fail("unknown folder");
    }
    let target = this.assetFolder(name, [...segments.slice(0, -1), trimmed]);
    if (path.resolve(target) === path.resolve(path.dirname(current))) throw fail("folder name is empty after sanitization");
    if (path.resolve(target) === path.resolve(current)) return path.basename(current);
    const caseOnly = path.resolve(target).toLowerCase() === path.resolve(current).toLowerCase();
    if (!caseOnly && existsSync(target)) {
      if ((options?.onConflict ?? "reject") === "reject") throw fail("duplicate_name");
      target = ProjectAssetsService.uniquifyFolder(target);
    }
    renameSync(current, target);
    store.updateRelPathPrefix(toPosix(path.relative(dir, current)), toPosix(path.relative(dir, target)));
    this.fire(name, "folder", "updated");
    return path.basename(target);
  }

  async moveLocalAsset(name: string, assetId: string, targetSegments: string[], options?: ConflictOptions): Promise<AssetRecord | undefined> {
    const store = this.store(name);
    const r = store.getById(assetId);
    if (!r) {
      if (options?.missingOk) return undefined;
      throw fail("unknown asset id");
    }
    const dir = this.assetsDir(name);
    const targetDir = this.assetFolder(name, targetSegments);
    const targetParentRel = toPosix(path.relative(dir, targetDir));
    if (targetParentRel === r.relPath.split("/").slice(0, -1).join("/")) return r;
    if ((targetParentRel === "" ? 0 : targetParentRel.split("/").length) >= MAX_FILE_DEPTH) throw fail("depth_exceeded");
    const initial = this.assetPath(name, targetSegments, r.name);
    const other = store.getByRelPath(toPosix(path.relative(dir, initial)));
    const conflict = (other !== undefined && other.id !== r.id) || (other === undefined && existsSync(initial));
    let target = initial;
    if (conflict) {
      if ((options?.onConflict ?? "reject") === "reject") throw fail("duplicate_name");
      target = this.uniquifyTarget(initial, store, dir, r.id);
    }
    mkdirSync(path.dirname(target), { recursive: true });
    renameSync(store.absolutePath(r), target);
    const updated = { ...r, relPath: toPosix(path.relative(dir, target)), name: path.basename(target), updatedAt: Date.now() };
    store.upsert(updated);
    this.fire(name, "asset", "updated");
    return updated;
  }

  async moveLocalFolder(name: string, segments: string[], targetSegments: string[], options?: ConflictOptions): Promise<string | undefined> {
    if (!Array.isArray(segments) || segments.length === 0) throw fail("moveLocalFolder requires at least one segment");
    const store = this.store(name);
    const dir = this.assetsDir(name);
    const current = path.resolve(this.assetFolder(name, segments));
    if (current === path.resolve(dir)) throw fail("refusing to move the assets root");
    if (!existsSync(current)) {
      if (options?.missingOk) return undefined;
      throw fail("unknown folder");
    }
    const targetDir = path.resolve(this.assetFolder(name, targetSegments));
    if (targetDir === current || targetDir.startsWith(current + path.sep)) throw fail("cannot_move_into_self");
    const base = path.basename(current);
    const initial = path.join(targetDir, base);
    if (path.resolve(initial) === current) return base;
    const newDepth = path.relative(dir, initial).split(path.sep).length;
    const sub = ProjectAssetsService.subtreeDepths(current);
    if (newDepth + sub.folder > MAX_FOLDER_DEPTH || newDepth + sub.file > MAX_FILE_DEPTH) throw fail("depth_exceeded");
    let target = initial;
    if (existsSync(initial)) {
      if ((options?.onConflict ?? "reject") === "reject") throw fail("duplicate_name");
      target = ProjectAssetsService.uniquifyFolder(initial);
    }
    mkdirSync(path.dirname(target), { recursive: true });
    renameSync(current, target);
    store.updateRelPathPrefix(toPosix(path.relative(dir, current)), toPosix(path.relative(dir, target)));
    this.fire(name, "folder", "updated");
    return path.basename(target);
  }

  /** 把选中的文件复制进资产目录（已经在资产目录里的只补索引）。逐个报结果，一个失败不影响别的。 */
  async importLocalAssets(req: { projectFolderName: string; sourcePaths: string[]; folderSegments?: string[] }): Promise<Array<{ sourcePath: string; record?: AssetRecord; error?: string }>> {
    const name = req?.projectFolderName;
    const store = this.store(name);
    const dir = this.assetsDir(name);
    const segments = req.folderSegments ?? [];
    const parentRel = path.relative(dir, this.assetFolder(name, segments));
    if ((parentRel === "" ? 0 : parentRel.split(path.sep).length) >= MAX_FILE_DEPTH) throw fail("depth_exceeded");
    const results: Array<{ sourcePath: string; record?: AssetRecord; error?: string }> = [];
    for (const sourcePath of Array.isArray(req.sourcePaths) ? req.sourcePaths : []) {
      try {
        const s = statSync(sourcePath);
        if (!s.isFile()) {
          results.push({ sourcePath, error: "not_a_file" });
          continue;
        }
        const resolved = path.resolve(sourcePath);
        if (resolved.startsWith(dir + path.sep)) {
          const relPath = toPosix(path.relative(dir, resolved));
          const existing = store.getByRelPath(relPath);
          if (existing) {
            results.push({ sourcePath, record: existing });
            continue;
          }
          const registered: AssetRecord = { id: randomUUID(), source: "local", relPath, name: path.posix.basename(relPath), size: s.size, createdAt: Date.now(), updatedAt: Math.floor(s.mtimeMs) };
          store.upsert(registered);
          results.push({ sourcePath, record: registered });
          continue;
        }
        const target = this.uniquifyTarget(this.assetPath(name, segments, path.basename(sourcePath)), store, dir);
        mkdirSync(path.dirname(target), { recursive: true });
        copyFileSync(resolved, target);
        const record: AssetRecord = { id: randomUUID(), source: "local", relPath: toPosix(path.relative(dir, target)), name: path.basename(target), size: s.size, createdAt: Date.now(), updatedAt: Date.now() };
        store.upsert(record);
        results.push({ sourcePath, record });
      } catch {
        results.push({ sourcePath, error: "copy_failed" });
      }
    }
    if (results.some((r) => r.record)) this.fire(name, "asset", "created");
    return results;
  }

  async deleteLocalAsset(name: string, assetId: string): Promise<{ hadRecord: boolean; removedFile: boolean }> {
    const store = this.store(name);
    const r = store.getById(assetId);
    if (!r) return { hadRecord: false, removedFile: false };
    let removedFile = false;
    const abs = store.absolutePath(r);
    if (existsSync(abs)) {
      await this.deps.trashItem(abs);
      removedFile = true;
    }
    store.deleteById(assetId);
    this.fire(name, "asset", "deleted");
    return { hadRecord: true, removedFile };
  }

  async deleteLocalFolder(name: string, segments: string[]): Promise<void> {
    if (!Array.isArray(segments) || segments.length === 0) throw fail("deleteLocalFolder requires at least one segment");
    const store = this.store(name);
    const dir = this.assetsDir(name);
    const abs = this.assetFolder(name, segments);
    if (path.resolve(abs) === path.resolve(dir)) throw fail("refusing to delete the assets root");
    if (existsSync(abs)) await this.deps.trashItem(abs);
    store.deleteByRelPathPrefix(toPosix(path.relative(dir, abs)));
    this.fire(name, "folder", "deleted");
  }

  /** 删项目时由主进程调：先关掉索引再把整个项目目录放进废纸篓。 */
  async trashProjectFolder(name: string): Promise<void> {
    const dirPath = this.projectFolder(name);
    this.stores.get(name)?.close();
    this.stores.delete(name);
    if (existsSync(dirPath)) await this.deps.trashItem(dirPath);
  }

  // ── 云端传输（不在范围内） ───────────────────────────

  async listTransfers(): Promise<unknown[]> {
    return [];
  }

  async hasActiveProjectTransfers(name: string): Promise<boolean> {
    this.requireFolderName(name);
    return false;
  }

  async cancelTransfer(): Promise<void> {}
  async clearFinishedTransfers(): Promise<void> {}
  async removeTransfer(): Promise<void> {}
  async cancelBatch(): Promise<void> {}
  async refreshReviewingTransfers(): Promise<void> {}

  async startDownload(): Promise<never> {
    throw new Error("cloud assets are not available in this build");
  }

  async startFolderDownload(): Promise<never> {
    throw new Error("cloud assets are not available in this build");
  }

  async startUpload(): Promise<never> {
    throw new Error("cloud assets are not available in this build");
  }
}
