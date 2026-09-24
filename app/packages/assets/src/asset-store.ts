import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import { type AssetInfo, detectFileType, fileTypeFromMime, MEDIA_SUBDIRS, mimeFromPath } from "@ov/protocol";

import { quickHash } from "./fingerprint.js";
import { probeMedia } from "./probe.js";
import { type Db, openStore } from "./sqlite-store.js";
import { safeResolve } from "./workspace-paths.js";

/** `assets` 表的一行。 */
export interface AssetRow {
  id: string;
  path: string;
  status: "active" | "missing";
  size: number;
  mtime_ms: number;
  dev_id: number | null;
  inode: number | null;
  birthtime_ms: number | null;
  quick_hash: string | null;
  full_hash: string | null;
  width: number | null;
  height: number | null;
  duration_ms: number | null;
  mime_type: string | null;
  name: string;
  metadata: string | null;
  created_at: number;
  updated_at: number;
  candidate_asset_id: string | null;
  candidate_path: string | null;
  soft_deleted_at: number | null;
}

export interface OpenOptions {
  now?: () => number;
  log?: (level: "info" | "warn" | "error", msg: string) => void;
}

/** 同名文件最多试到 `-999`。到头就报错，而不是静默覆盖第 1000 个。 */
const MAX_DEDUPE = 1000;

/**
 * 一个工作区的资产库：`<工作区>/.hilo/index.sqlite`。
 *
 * 路径 ⇄ 稳定 id 的唯一记录。**按路径幂等**：同一个文件重复登记返回同一个 id
 * （画布上引用它的节点才不会变成悬空引用）。
 */
export class AssetStore {
  readonly db: Db;
  /** 开局时原库或旧索引是坏的、已隔离。界面要能看见这个 —— 否则用户只会看到
   *  "素材全不见了"，而真相是文件都在，只是关联信息需要恢复。 */
  readonly degraded: boolean;
  private readonly now: () => number;
  private readonly log: NonNullable<OpenOptions["log"]>;

  constructor(
    readonly root: string,
    opts: OpenOptions = {},
  ) {
    this.now = opts.now ?? Date.now;
    this.log = opts.log ?? ((level, msg) => console[level === "info" ? "log" : level](`[assets] ${msg}`));
    const opened = openStore(path.join(root, ".hilo", "index.sqlite"), this.now);
    this.db = opened.db;
    let degraded = opened.recovered;
    if (opened.recovered) {
      this.log("error", `资产库损坏，原文件已隔离到 ${opened.quarantinedTo}。素材文件都还在盘上，只是关联信息需要恢复。`);
    }
    if (!this.importLegacyIndex()) degraded = true;
    this.degraded = degraded;
  }

  close(): void {
    this.db.close();
  }

  // -------------------------------------------------------------------------
  // 查询
  // -------------------------------------------------------------------------

  /** 按 id 查。**不过滤软删除**：可撤销窗口内，画布和对话里的引用还得解析得出来。 */
  byId(id: string): AssetRow | undefined {
    return this.db.prepare("SELECT * FROM assets WHERE id = ?").get(id) as AssetRow | undefined;
  }

  /** 按路径查。过滤软删除 —— 资产面板和发现路径要把它藏起来。 */
  byPath(rel: string): AssetRow | undefined {
    return this.db.prepare("SELECT * FROM assets WHERE path = ? AND soft_deleted_at IS NULL").get(rel) as AssetRow | undefined;
  }

  /** 全部（不含软删除，含 missing），按路径排序。 */
  list(): AssetRow[] {
    return this.db.prepare("SELECT * FROM assets WHERE soft_deleted_at IS NULL ORDER BY path").all() as AssetRow[];
  }

  // -------------------------------------------------------------------------
  // 写入
  // -------------------------------------------------------------------------

  /**
   * 登记一个已经在工作区里的文件。已有记录时保留 id，刷新 size / 尺寸 / 指纹。
   *
   * 文件不存在时抛错，**不写一条空记录** —— 指向不存在文件的记录会让画布上
   * 出现一个永远加载不出来的节点。
   */
  async enroll(rel: string, metadata?: Record<string, unknown>): Promise<AssetRow> {
    const abs = safeResolve(this.root, rel);
    if (!abs) throw new Error(`路径超出工作区: ${rel}`);
    const st = await stat(abs).catch(() => null);
    if (!st?.isFile()) throw new Error(`读不到 ${rel}`);
    const norm = rel.split(/[\\/]+/).filter((p) => p && p !== ".").join("/");
    const [probe, hash] = await Promise.all([probeMedia(abs), quickHash(abs)]);
    const t = this.now();
    const existing = this.db.prepare("SELECT * FROM assets WHERE path = ?").get(norm) as AssetRow | undefined;
    const row: AssetRow = {
      id: existing?.id ?? randomUUID(),
      path: norm,
      status: "active",
      size: st.size,
      mtime_ms: Math.trunc(st.mtimeMs),
      dev_id: Number(st.dev),
      inode: Number(st.ino),
      birthtime_ms: st.birthtimeMs ? Math.trunc(st.birthtimeMs) : null,
      quick_hash: hash,
      full_hash: null,
      width: probe.width ?? null,
      height: probe.height ?? null,
      duration_ms: probe.durationMs ?? null,
      mime_type: mimeFromPath(norm),
      name: path.basename(norm),
      metadata: metadata ? JSON.stringify(metadata) : (existing?.metadata ?? null),
      created_at: existing?.created_at ?? t,
      updated_at: t,
      candidate_asset_id: null,
      candidate_path: null,
      // 重新登记一个软删除中的路径 = 用户又把它放回来了，撤销软删除。
      soft_deleted_at: null,
    };
    this.upsert(row);
    return row;
  }

  /**
   * 把外部来的字节存进工作区并登记，返回登记后的行。
   *
   * `filename` 不可信（来自飞书 / 微信 / 上传）：只取最后一段，挡住 `..`，
   * 否则一个 `../../.ssh/config` 就写到工作区外面去了。**同名不覆盖**：用户
   * 两次发同名文件时，覆盖会把上一张换掉，而画布上引用它的节点看起来毫无变化。
   */
  async store(filename: string, bytes: Uint8Array, metadata?: Record<string, unknown>): Promise<AssetRow> {
    const last = filename.split(/[\\/]/).pop() ?? "";
    const name = last && last !== "." && last !== ".." ? last : "attachment";
    const dot = name.lastIndexOf(".");
    const [stem, ext] = dot > 0 ? [name.slice(0, dot), name.slice(dot).toLowerCase()] : [name, ""];
    const dir = MEDIA_SUBDIRS[detectFileType(name)];
    let rel = `${dir}/${name}`;
    if (existsSync(path.join(this.root, rel))) {
      let found: string | undefined;
      for (let n = 2; n < MAX_DEDUPE; n++) {
        const cand = `${dir}/${stem}-${n}${ext}`;
        if (!existsSync(path.join(this.root, cand))) {
          found = cand;
          break;
        }
      }
      if (!found) throw new Error(`${dir}/ 下同名文件太多: ${name}`);
      rel = found;
    }
    const abs = safeResolve(this.root, rel);
    if (!abs) throw new Error(`路径超出工作区: ${rel}`);
    await mkdir(path.dirname(abs), { recursive: true });
    await writeFile(abs, bytes);
    return this.enroll(rel, metadata);
  }

  /** 路径以 `folder/` 开头的资产（不含软删除）。 */
  listByFolder(folder: string): AssetRow[] {
    const prefix = folder.replace(/\/+$/, "") + "/";
    return this.list().filter((r) => r.path.startsWith(prefix));
  }

  /** 整份替换 metadata（调用方负责合并）。返回更新后的行；id 不存在回 undefined。 */
  setMetadata(id: string, metadata: Record<string, unknown>): AssetRow | undefined {
    this.db.prepare("UPDATE assets SET metadata = ?, updated_at = ? WHERE id = ?").run(JSON.stringify(metadata), this.now(), id);
    return this.byId(id);
  }

  /** 按路径软删除，返回受影响的行数。 */
  softDeleteByPath(rel: string, at = this.now()): number {
    return this.db.prepare("UPDATE assets SET soft_deleted_at = ?, updated_at = ? WHERE path = ? AND soft_deleted_at IS NULL").run(at, at, rel).changes;
  }

  restoreByPath(rel: string): number {
    return this.db.prepare("UPDATE assets SET soft_deleted_at = NULL, updated_at = ? WHERE path = ?").run(this.now(), rel).changes;
  }

  /** 真删软删除时间不晚于 `before` 的行（级联删依赖边）。返回删掉的行数。 */
  purgeSoftDeleted(before: number): number {
    return this.db.prepare("DELETE FROM assets WHERE soft_deleted_at IS NOT NULL AND soft_deleted_at <= ?").run(before).changes;
  }

  /** 软删除：行还在、id 和依赖边都不断，直到 `hardDelete`。 */
  softDelete(ids: string[]): void {
    const st = this.db.prepare("UPDATE assets SET soft_deleted_at = ?, updated_at = ? WHERE id = ?");
    const t = this.now();
    this.db.transaction(() => ids.forEach((id) => st.run(t, t, id)))();
  }

  restore(ids: string[]): void {
    const st = this.db.prepare("UPDATE assets SET soft_deleted_at = NULL, updated_at = ? WHERE id = ?");
    const t = this.now();
    this.db.transaction(() => ids.forEach((id) => st.run(t, id)))();
  }

  hardDelete(ids: string[]): void {
    const st = this.db.prepare("DELETE FROM assets WHERE id = ?");
    this.db.transaction(() => ids.forEach((id) => st.run(id)))();
  }

  /**
   * 重新读一遍所有资产的尺寸，**不碰画布**。返回尺寸变了的条数。
   * 加了新的尺寸解析（比如视频）之后，已登记的老记录要靠它补上。
   */
  async rescanDimensions(): Promise<number> {
    let changed = 0;
    for (const row of this.list()) {
      const abs = safeResolve(this.root, row.path);
      if (!abs) continue;
      const p = await probeMedia(abs);
      if (p.width == null && p.height == null) continue;
      if (p.width !== row.width || p.height !== row.height) {
        this.db
          .prepare("UPDATE assets SET width = ?, height = ?, updated_at = ? WHERE id = ?")
          .run(p.width ?? null, p.height ?? null, this.now(), row.id);
        changed++;
      }
    }
    return changed;
  }

  private upsert(row: AssetRow): void {
    const cols = Object.keys(row) as (keyof AssetRow)[];
    const sql =
      `INSERT INTO assets (${cols.join(", ")}) VALUES (${cols.map((c) => "@" + c).join(", ")}) ` +
      `ON CONFLICT(path) DO UPDATE SET ${cols.filter((c) => c !== "id" && c !== "path").map((c) => `${c} = excluded.${c}`).join(", ")}`;
    this.db.prepare(sql).run(row);
  }

  // -------------------------------------------------------------------------
  // 旧索引
  // -------------------------------------------------------------------------

  /**
   * 导入旧版 `.hilo/assets.json`（Rust 版的 JSON 索引），**保留原 id** ——
   * 已有画布的节点都是用这些 id 引用素材的。只导一次，导完在 workspace_meta
   * 里记一笔。
   *
   * 旧索引坏了：先原样隔离到 `.hilo/quarantine/`，再返回 false（降级开局）。
   * 返回 true 表示没问题（包括根本没有旧索引）。
   */
  private importLegacyIndex(): boolean {
    const file = path.join(this.root, ".hilo", "assets.json");
    if (!existsSync(file)) return true;
    const done = this.db.prepare("SELECT value FROM workspace_meta WHERE key = 'legacy_assets_json_imported'").get();
    if (done) return true;

    const raw = readFileSync(file, "utf8");
    let parsed: { by_path?: Record<string, LegacyAsset> };
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      const dir = path.join(this.root, ".hilo", "quarantine");
      mkdirSync(dir, { recursive: true });
      const out = path.join(dir, `assets-broken-${this.now()}.json`);
      writeFileSync(out, raw);
      this.log("error", `旧资产索引解析失败（${String(err)}），原文已隔离到 ${out}。素材文件都还在盘上。`);
      return false;
    }

    const t = this.now();
    const rows = Object.values(parsed.by_path ?? {}).filter((a) => a && a.id && a.path);
    this.db.transaction(() => {
      for (const a of rows) {
        const abs = safeResolve(this.root, a.path);
        const found = abs ? statSync(abs, { throwIfNoEntry: false }) : undefined;
        const st = found?.isFile() ? found : null;
        const seconds = Number(a.time);
        const created = Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : t;
        this.db
          .prepare(
            `INSERT OR IGNORE INTO assets (id, path, status, size, mtime_ms, width, height, mime_type, name, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .run(
            a.id,
            a.path,
            st ? "active" : "missing",
            st?.size ?? a.file_size ?? 0,
            st ? Math.trunc(st.mtimeMs) : 0,
            a.width ?? null,
            a.height ?? null,
            mimeFromPath(a.path),
            a.name || path.basename(a.path),
            created,
            t,
          );
      }
      this.db.prepare("INSERT OR REPLACE INTO workspace_meta (key, value) VALUES ('legacy_assets_json_imported', ?)").run(String(t));
    })();
    this.log("info", `已导入旧资产索引 ${rows.length} 条`);
    return true;
  }
}

interface LegacyAsset {
  id: string;
  path: string;
  name?: string;
  width?: number;
  height?: number;
  file_size?: number;
  time?: string;
}

/** 行 → `GET /api/assets` 的返回形状。metadata 里的生成参数平铺出来。 */
export function toAssetInfo(row: AssetRow, opts: { includeMetadata?: boolean } = {}): AssetInfo {
  let metadata: Record<string, unknown> = {};
  if (row.metadata) {
    try {
      metadata = JSON.parse(row.metadata) as Record<string, unknown>;
    } catch {
      metadata = {};
    }
  }
  const m = metadata as Record<string, any>;
  const info: AssetInfo = {
    id: row.id,
    path: row.path,
    type: fileTypeFromMime(row.mime_type, row.path),
    name: row.name,
    prompt: m.prompt ?? "",
    model: m.model ?? "",
    description: m.description ?? "",
    time: new Date(row.created_at).toISOString(),
    fileSize: row.size,
    width: row.width ?? m.width,
    height: row.height ?? m.height,
    aspect_ratio: m.aspect_ratio,
    voice_id: m.voice_id,
    lyrics: m.lyrics,
    composition_plan: m.composition_plan,
    params: m.params,
    backend: m.backend,
    model_id: m.model_id,
    source_tool: m.source_tool,
    cloud_trace_id: m.cloud_trace_id,
    cloud_task_id: m.cloud_task_id,
    gateway_task_id: m.gateway_task_id,
    provider_task_id: m.provider_task_id,
    duration: row.duration_ms !== null ? row.duration_ms / 1000 : m.duration,
    reference_images: m.reference_images,
    subtitle_path: m.subtitle_path,
    tagIds: Array.isArray(m.tagIds) ? m.tagIds.filter((t: unknown) => typeof t === "string") : undefined,
    status: row.status === "missing" ? "missing" : "active",
    candidate: row.candidate_asset_id && row.candidate_path ? { asset_id: row.candidate_asset_id, path: row.candidate_path } : undefined,
  };
  if (opts.includeMetadata) info.metadata = metadata;
  return info;
}
