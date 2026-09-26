import { constants as fsConstants, type Stats } from "node:fs";
import { copyFile, link, lstat, mkdir, readFile, rename, stat, unlink, utimes } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";
import { type AssetRow, quickHash } from "@ov/assets";

import { AssetsService } from "../common/assets.service.js";
import { WorkspacePathService } from "../common/workspace-path.service.js";
import { GatewayConfig } from "../config/gateway-config.js";

/** 锚点目录：项目资产"加到对话"时落在这里。在 `.hilo/` 下，资产库和目录树都看不见它。 */
export const PROJECT_ASSET_ANCHOR_DIR = ".hilo/project-assets";
/** 主进程在本工作区 gateway 没开着时写下的待处理变更，开机时消费。 */
const PENDING_EVENTS_FILE = ".hilo/anchor-pending-events.jsonl";
const MAX_DEDUP_SUFFIX = 1000;
/** 开机后等资产库先稳定下来再对账，别和启动时的其它 IO 抢。 */
const BOOT_RECONCILE_DELAY_MS = 5000;
const TMP_SUFFIX = ".tmp-relink";

type LinkMode = "hardlink" | "copy";

interface AnchorRow {
  anchor_rel_path: string;
  asset_id: string;
  project_folder: string;
  source_rel_path: string;
  src_ino: number | null;
  src_size: number | null;
  src_mtime_ms: number | null;
  link_mode: LinkMode;
}

export interface AnchorItem {
  path: string;
  assetId?: string;
  projectFolderName?: string;
}

export interface PropagateEvent {
  type: "content-replaced" | "deleted" | "rekeyed" | (string & {});
  assetId: string;
  projectFolderName: string;
  sourcePath?: string;
  previousAssetId?: string;
}

function isSafeFolderName(name: string): boolean {
  return name.length > 0 && name !== "." && name !== ".." && !/[/\\\0]/.test(name);
}

/** 项目空间的根：`<数据根>/Projects/.projects`，和主进程的规则一致（HILO_DATA_DIR 可覆盖数据根）。 */
export function projectSpacesRoot(): string {
  const custom = process.env.HILO_DATA_DIR?.trim();
  return path.join(custom || path.join(homedir(), "Movies", "蒜狸小助手"), "Projects", ".projects");
}

/**
 * 项目资产锚点。
 *
 * 项目资产的文件在 `<项目>/.assets/` 里，归主进程管；"加到对话"时 agent 和对话附件需要一个工作区内的路径，
 * 所以把文件硬链接（跨盘就复制）到 `.hilo/project-assets/<文件名>`。故意不走 import-external：那会登记进资产库、
 * 发 `asset_changed`，画布下次加载就多出一个节点 —— "加到对话"绝不能改画布。
 *
 * 同一个源文件反复锚定得到同一个路径（对话按路径去重靠这个）。带 `assetId + projectFolderName` 的记进台账
 * （工作区 `.hilo/index.sqlite` 的 `project_asset_anchors` 表），主进程改了 / 删了源文件时经 propagate
 * 通知过来，重新链接或删掉锚点；gateway 没开着时错过的，开机时对着项目索引补一遍。
 */
@Injectable()
export class ProjectAssetAnchors implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger("ProjectAssetAnchor");
  private bootTimer?: NodeJS.Timeout;
  private tableReady = false;

  constructor(
    private readonly paths: WorkspacePathService,
    private readonly assets: AssetsService,
    private readonly cfg: GatewayConfig,
  ) {}

  onModuleInit(): void {
    if (this.cfg.role !== "workspace") return;
    this.bootTimer = setTimeout(() => {
      this.bootTimer = undefined;
      void this.consumePendingEvents()
        .catch((err) => this.log.warn(`开机消费待处理变更失败: ${(err as Error).message}`))
        .then(() => this.reconcile())
        .catch((err) => this.log.warn(`开机对账失败: ${(err as Error).message}`));
    }, BOOT_RECONCILE_DELAY_MS);
    this.bootTimer.unref();
  }

  onModuleDestroy(): void {
    if (this.bootTimer) clearTimeout(this.bootTimer);
    this.bootTimer = undefined;
  }

  /**
   * 台账表建在工作区资产库里、按需建。不放进资产库的迁移序列：它只和这一个功能有关，
   * 建不建不影响资产库本身的版本。
   */
  private get db() {
    const db = this.assets.vault.db;
    if (!this.tableReady) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS project_asset_anchors (
          anchor_rel_path TEXT PRIMARY KEY,
          asset_id        TEXT NOT NULL,
          project_folder  TEXT NOT NULL,
          source_rel_path TEXT NOT NULL,
          src_ino         INTEGER,
          src_size        INTEGER,
          src_mtime_ms    REAL,
          link_mode       TEXT NOT NULL DEFAULT 'hardlink',
          created_at      INTEGER NOT NULL,
          updated_at      INTEGER NOT NULL
        );
        CREATE UNIQUE INDEX IF NOT EXISTS idx_project_asset_anchors_identity ON project_asset_anchors(asset_id, project_folder);
      `);
      this.tableReady = true;
    }
    return db;
  }

  private byIdentity(assetId: string, folder: string): AnchorRow | undefined {
    return this.db.prepare("SELECT * FROM project_asset_anchors WHERE asset_id = ? AND project_folder = ?").get(assetId, folder) as AnchorRow | undefined;
  }

  private upsert(r: Omit<AnchorRow, "link_mode"> & { link_mode: LinkMode }): void {
    const now = Date.now();
    const db = this.db;
    db.transaction(() => {
      // 同一身份只留一个锚点路径。
      db.prepare("DELETE FROM project_asset_anchors WHERE asset_id = ? AND project_folder = ? AND anchor_rel_path != ?").run(r.asset_id, r.project_folder, r.anchor_rel_path);
      db.prepare(
        `INSERT INTO project_asset_anchors (anchor_rel_path, asset_id, project_folder, source_rel_path, src_ino, src_size, src_mtime_ms, link_mode, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(anchor_rel_path) DO UPDATE SET asset_id = excluded.asset_id, project_folder = excluded.project_folder,
           source_rel_path = excluded.source_rel_path, src_ino = excluded.src_ino, src_size = excluded.src_size,
           src_mtime_ms = excluded.src_mtime_ms, link_mode = excluded.link_mode, updated_at = excluded.updated_at`,
      ).run(r.anchor_rel_path, r.asset_id, r.project_folder, r.source_rel_path, r.src_ino, r.src_size, r.src_mtime_ms, r.link_mode, now, now);
    })();
  }

  private deleteRow(anchorRel: string): void {
    this.db.prepare("DELETE FROM project_asset_anchors WHERE anchor_rel_path = ?").run(anchorRel);
  }

  private abs(anchorRel: string): string {
    return path.join(this.paths.root, ...anchorRel.split("/"));
  }

  /** `.hilo/project-assets/<一段文件名>` 才算锚点路径。 */
  isAnchorPath(rel: string): boolean {
    const norm = path.posix.normalize(rel.replace(/\\/g, "/").replace(/^\.\//, ""));
    if (!norm.startsWith(`${PROJECT_ASSET_ANCHOR_DIR}/`)) return false;
    const name = norm.slice(PROJECT_ASSET_ANCHOR_DIR.length + 1);
    return name.length > 0 && name !== "." && name !== ".." && !/[/\\\0]/.test(name);
  }

  // -------------------------------------------------------------------------
  // 锚定
  // -------------------------------------------------------------------------

  /** 逐个锚定，单个失败进 `errors`，成功的照样返回（和 import-external 一样）。 */
  async anchor(items: AnchorItem[]) {
    const anchored: { path: string; filename: string }[] = [];
    const errors: { path: string; error: string }[] = [];
    for (const item of items) {
      const src = item.path;
      try {
        if (!path.isAbsolute(src)) {
          errors.push({ path: src, error: "Path must be absolute" });
          continue;
        }
        const st = await stat(src);
        if (!st.isFile()) {
          errors.push({ path: src, error: "Only regular files can be anchored" });
          continue;
        }
        if (item.assetId && item.projectFolderName) {
          if (!isSafeFolderName(item.projectFolderName)) {
            errors.push({ path: src, error: "Invalid projectFolderName" });
            continue;
          }
          anchored.push(await this.anchorLedgered(src, st, item.assetId, item.projectFolderName));
        } else {
          this.log.log(`锚定（无身份，不进台账）${path.basename(src)}`);
          anchored.push((await this.anchorOne(src, st)).anchor);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.log.warn(`锚定失败 ${src}: ${message}`);
        errors.push({ path: src, error: message });
      }
    }
    return { ok: true, anchored, ...(errors.length ? { errors } : {}) };
  }

  /** 台账里已有这个身份：锚点路径不变，源文件换过就原地重新链接（不另起一个 `(1)`）。 */
  private async anchorLedgered(src: string, st: Stats, assetId: string, folder: string) {
    const sourceRel = sourceRelFor(folder, src);
    const existing = this.byIdentity(assetId, folder);
    if (existing) {
      const anchorAbs = this.abs(existing.anchor_rel_path);
      let mode = existing.link_mode;
      const stale = await isStale(existing, anchorAbs, st);
      if (stale) {
        mode = await relink(src, anchorAbs, st);
        this.log.log(`重新锚定 asset=${assetId} anchor=${existing.anchor_rel_path} mode=${mode} 原因=${stale}`);
      }
      this.upsert({ ...snapshot(st), anchor_rel_path: existing.anchor_rel_path, asset_id: assetId, project_folder: folder, source_rel_path: sourceRel, link_mode: mode });
      return { path: existing.anchor_rel_path, filename: path.posix.basename(existing.anchor_rel_path) };
    }
    const { anchor, mode } = await this.anchorOne(src, st);
    this.upsert({ ...snapshot(st), anchor_rel_path: anchor.path, asset_id: assetId, project_folder: folder, source_rel_path: sourceRel, link_mode: mode });
    this.log.log(`锚定 asset=${assetId} project=${folder} anchor=${anchor.path} mode=${mode}`);
    return anchor;
  }

  /**
   * 占一个 `<锚点目录>/<文件名>`，同名的是别的文件就试 `名字(1)`…。已经是这个文件（同一个 inode，
   * 或者复制过来的、大小和修改时间都一样）就直接复用。`link` / `COPYFILE_EXCL` 都是原子的"不存在才建"，
   * 并发抢同一个名字时输的一方拿到 EEXIST，重新看一遍这个名字上是谁。
   */
  private async anchorOne(src: string, st: Stats): Promise<{ anchor: { path: string; filename: string }; mode: LinkMode }> {
    const dir = this.abs(PROJECT_ASSET_ANCHOR_DIR);
    await mkdir(dir, { recursive: true });
    const name = path.basename(src);
    const ext = path.extname(name);
    const base = name.slice(0, name.length - ext.length);
    for (let i = 0; i <= MAX_DEDUP_SUFFIX; i++) {
      const filename = i === 0 ? name : `${base}(${i})${ext}`;
      const cand = path.join(dir, filename);
      const anchor = { path: `${PROJECT_ASSET_ANCHOR_DIR}/${filename}`, filename };
      const occupant = await lstat(cand).catch((err: NodeJS.ErrnoException) => {
        if (err.code === "ENOENT") return undefined;
        throw err;
      });
      if (occupant) {
        const sameInode = occupant.ino === st.ino && occupant.dev === st.dev;
        const sameCopy = occupant.size === st.size && occupant.mtimeMs === st.mtimeMs;
        if (sameInode || sameCopy) return { anchor, mode: sameInode ? "hardlink" : "copy" };
        continue;
      }
      const mode = await claim(src, cand, st);
      if (mode) return { anchor, mode };
      i--;
    }
    throw new Error(`Could not find a free anchor name for ${name}`);
  }

  // -------------------------------------------------------------------------
  // 写侧变更
  // -------------------------------------------------------------------------

  /**
   * 主进程（项目资产目录的唯一写入方）改动之后通知过来：
   * - content-replaced：源文件被整个换掉（新 inode），锚点重新链接，预览才看得到新内容；
   * - deleted：源没了，删掉锚点和台账行，对话里的引用干脆地 404，而不是一直攥着旧字节；
   * - rekeyed：同一个文件在项目索引里换了 id，台账跟着换，免得开机对账把它当成被删了。
   * 单个事件失败不影响整批。
   */
  async propagate(events: PropagateEvent[]) {
    const result = { ok: true, relinked: 0, rekeyed: 0, removed: 0, noop: 0, failed: 0 };
    for (const ev of events ?? []) {
      try {
        if (!ev?.assetId || !ev.projectFolderName || !isSafeFolderName(ev.projectFolderName) || (ev.type === "rekeyed" && !ev.previousAssetId)) {
          this.log.warn(`变更事件格式不对: ${JSON.stringify(ev)}`);
          result.failed++;
          continue;
        }
        const row = this.byIdentity(ev.type === "rekeyed" ? ev.previousAssetId! : ev.assetId, ev.projectFolderName);
        if (!row) {
          result.noop++;
          continue;
        }
        if (ev.type === "deleted") {
          await unlinkQuiet(this.abs(row.anchor_rel_path));
          this.deleteRow(row.anchor_rel_path);
          result.removed++;
          continue;
        }
        if (ev.type === "content-replaced") {
          if (!ev.sourcePath || !path.isAbsolute(ev.sourcePath)) {
            this.log.warn(`content-replaced 没带绝对路径 asset=${ev.assetId}`);
            result.failed++;
            continue;
          }
          const st = await stat(ev.sourcePath);
          const mode = await relink(ev.sourcePath, this.abs(row.anchor_rel_path), st);
          this.upsert({ ...snapshot(st), anchor_rel_path: row.anchor_rel_path, asset_id: ev.assetId, project_folder: ev.projectFolderName, source_rel_path: sourceRelFor(ev.projectFolderName, ev.sourcePath), link_mode: mode });
          result.relinked++;
          continue;
        }
        if (ev.type === "rekeyed") {
          const collision = this.byIdentity(ev.assetId, ev.projectFolderName);
          if (collision && collision.anchor_rel_path !== row.anchor_rel_path) {
            // 新 id 已经有自己的锚点了：留它，旧的台账行退役（文件不动）。
            this.deleteRow(row.anchor_rel_path);
          } else {
            this.upsert({ ...row, asset_id: ev.assetId });
          }
          result.rekeyed++;
          continue;
        }
        this.log.warn(`未知的变更类型 ${String(ev.type)}`);
        result.failed++;
      } catch (err) {
        result.failed++;
        this.log.warn(`变更事件处理失败 asset=${ev?.assetId ?? "?"} type=${ev?.type ?? "?"}: ${(err as Error).message}`);
      }
    }
    this.log.log(`propagate: events=${events?.length ?? 0} relinked=${result.relinked} rekeyed=${result.rekeyed} removed=${result.removed} noop=${result.noop} failed=${result.failed}`);
    return result;
  }

  /** 先改名再读：主进程这时追加的新行会写进一个新文件，不会和这边的消费撞上。 */
  async consumePendingEvents(): Promise<void> {
    const file = this.abs(PENDING_EVENTS_FILE);
    const claimed = `${file}.consuming`;
    try {
      await rename(file, claimed);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return;
      throw err;
    }
    try {
      const events: PropagateEvent[] = [];
      for (const line of (await readFile(claimed, "utf8")).split("\n")) {
        if (!line.trim()) continue;
        try {
          events.push(JSON.parse(line) as PropagateEvent);
        } catch {
          this.log.warn("待处理变更里有一行坏的，丢掉");
        }
      }
      if (events.length) await this.propagate(events);
    } finally {
      await unlinkQuiet(claimed);
    }
  }

  /**
   * 开机对账：本工作区 gateway 没开着的时候项目资产被删了、被换了，这里对着项目索引
   * （`<项目>/.hilo/project-assets.sqlite`，只读打开，它归主进程）补上：
   * - 索引里没这个 id 了：先看是不是换了 id（同一个 inode，或大小 + 修改时间都对得上），是就把台账挪过去；
   *   都对不上才当作已删除，删锚点；
   * - 源文件变了：重新链接；
   * - 源文件暂时不在但索引行还在：跳过（宁可留着，不能因为一时的状态把锚点删了）。
   * 项目索引打不开的整个项目跳过。
   */
  async reconcile(): Promise<{ checked: number; relinked: number; rekeyed: number; removed: number; skipped: number }> {
    const counters = { checked: 0, relinked: 0, rekeyed: 0, removed: 0, skipped: 0 };
    const rows = this.db.prepare("SELECT * FROM project_asset_anchors ORDER BY project_folder, asset_id").all() as AnchorRow[];
    const indexes = new Map<string, ProjectIndex | null>();
    try {
      for (const row of rows) {
        counters.checked++;
        let idx = indexes.get(row.project_folder);
        if (idx === undefined) {
          idx = openProjectIndex(row.project_folder);
          indexes.set(row.project_folder, idx);
        }
        if (!idx) {
          counters.skipped++;
          continue;
        }
        try {
          const entry = idx.byId(row.asset_id);
          if (!entry) {
            const moved = await idx.findByIdentity(row);
            if (moved) {
              this.upsert({ ...row, asset_id: moved.id });
              counters.rekeyed++;
            } else {
              await unlinkQuiet(this.abs(row.anchor_rel_path));
              this.deleteRow(row.anchor_rel_path);
              counters.removed++;
            }
            continue;
          }
          const srcAbs = idx.absolute(entry.rel_path);
          const st = await stat(srcAbs).catch(() => undefined);
          if (!st?.isFile()) {
            counters.skipped++;
            continue;
          }
          const drifted = row.src_ino !== Number(st.ino) || row.src_size !== st.size || row.src_mtime_ms !== st.mtimeMs;
          const anchorGone = !(await lstat(this.abs(row.anchor_rel_path)).catch(() => undefined));
          if (drifted || anchorGone) {
            const mode = await relink(srcAbs, this.abs(row.anchor_rel_path), st);
            this.upsert({ ...row, ...snapshot(st), source_rel_path: entry.rel_path, link_mode: mode });
            counters.relinked++;
          }
        } catch (err) {
          counters.skipped++;
          this.log.warn(`对账 ${row.anchor_rel_path} 失败: ${(err as Error).message}`);
        }
      }
    } finally {
      for (const idx of indexes.values()) idx?.close();
    }
    this.log.log(`开机对账: ${JSON.stringify(counters)}`);
    return counters;
  }

  // -------------------------------------------------------------------------
  // 落成普通资产（登记锚点时用）
  // -------------------------------------------------------------------------

  /**
   * 生成真的要用某个锚点时，把它复制成一份普通的工作区文件并登记（锚点本身永远不进库，
   * 否则"加到对话"就会改画布）。同一个锚点内容没变时复用上次落下来的那份。
   */
  async materialize(anchorRel: string): Promise<AssetRow | undefined> {
    const norm = path.posix.normalize(anchorRel.replace(/\\/g, "/").replace(/^\.\//, ""));
    if (!this.isAnchorPath(norm)) return undefined;
    const src = this.abs(norm);
    const st = await lstat(src).catch(() => undefined);
    if (!st?.isFile()) return undefined;
    const hash = await quickHash(src);
    for (const row of this.assets.vault.list()) {
      if (row.quick_hash !== hash || !row.metadata) continue;
      try {
        if ((JSON.parse(row.metadata) as Record<string, unknown>).project_asset_anchor === norm) return row;
      } catch {
        // 坏的 metadata 当作不匹配
      }
    }
    const name = path.posix.basename(norm);
    const ext = path.extname(name);
    const base = name.slice(0, name.length - ext.length);
    for (let i = 0; i <= MAX_DEDUP_SUFFIX; i++) {
      const cand = i === 0 ? name : `${base}(${i})${ext}`;
      if (this.assets.byPath(cand)) continue;
      try {
        await copyFile(src, path.join(this.paths.root, cand), fsConstants.COPYFILE_EXCL);
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === "EEXIST") continue;
        throw err;
      }
      return this.assets.enroll(cand, { model: "imported", project_asset_anchor: norm });
    }
    throw new Error(`Could not find a free name for ${name}`);
  }
}

// ---------------------------------------------------------------------------

function snapshot(st: Stats) {
  return { src_ino: Number(st.ino), src_size: st.size, src_mtime_ms: st.mtimeMs };
}

/** 源文件在项目 `.assets/` 下的相对路径（只用来记台账、排查问题）。 */
function sourceRelFor(folder: string, abs: string): string {
  const rel = path.relative(path.join(projectSpacesRoot(), folder, ".assets"), abs);
  if (rel.startsWith("..") || path.isAbsolute(rel)) return path.basename(abs);
  return rel.split(path.sep).join("/");
}

/** 台账里的锚点和源文件还对得上吗：锚点没了、硬链接的 inode 变了、复制品的大小 / 修改时间变了。 */
async function isStale(row: AnchorRow, anchorAbs: string, st: Stats): Promise<string | false> {
  const a = await lstat(anchorAbs).catch((err: NodeJS.ErrnoException) => {
    if (err.code === "ENOENT") return undefined;
    throw err;
  });
  if (!a) return "anchor-missing";
  if (row.link_mode === "hardlink") return a.ino !== st.ino || a.dev !== st.dev ? "inode-drift" : false;
  return a.size !== st.size || a.mtimeMs !== st.mtimeMs ? "copy-drift" : false;
}

/** 先链到临时名再 rename 覆盖：读的人任何时刻都看得到一个完整的锚点，不会碰上它暂时不存在。 */
async function relink(src: string, anchorAbs: string, st: Stats): Promise<LinkMode> {
  const tmp = `${anchorAbs}${TMP_SUFFIX}`;
  await unlinkQuiet(tmp);
  let mode: LinkMode;
  try {
    await link(src, tmp);
    mode = "hardlink";
  } catch {
    await copyFile(src, tmp);
    await utimes(tmp, st.atime, st.mtime).catch(() => undefined);
    mode = "copy";
  }
  await mkdir(path.dirname(anchorAbs), { recursive: true });
  try {
    await rename(tmp, anchorAbs);
  } catch (err) {
    await unlinkQuiet(tmp);
    throw err;
  }
  return mode;
}

/** 原子地占住 `cand`：优先硬链接（同盘、零成本），链不了就独占复制，并把修改时间抄过去（复用判断靠它）。 */
async function claim(src: string, cand: string, st: Stats): Promise<LinkMode | null> {
  try {
    await link(src, cand);
    return "hardlink";
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "EEXIST") return null;
  }
  try {
    await copyFile(src, cand, fsConstants.COPYFILE_EXCL);
    await utimes(cand, st.atime, st.mtime).catch(() => undefined);
    return "copy";
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "EEXIST") return null;
    throw err;
  }
}

async function unlinkQuiet(p: string): Promise<void> {
  await unlink(p).catch((err: NodeJS.ErrnoException) => {
    if (err.code !== "ENOENT") throw err;
  });
}

interface ProjectIndex {
  byId(id: string): { id: string; rel_path: string } | undefined;
  findByIdentity(row: AnchorRow): Promise<{ id: string } | undefined>;
  absolute(rel: string): string;
  close(): void;
}

/** 只读打开一个项目的资产索引。项目或索引不在返回 null（这个项目整个跳过）。 */
function openProjectIndex(folder: string): ProjectIndex | null {
  if (!isSafeFolderName(folder)) return null;
  const projectDir = path.join(projectSpacesRoot(), folder);
  const assetsDir = path.join(projectDir, ".assets");
  let db: DatabaseSync;
  try {
    db = new DatabaseSync(path.join(projectDir, ".hilo", "project-assets.sqlite"), { readOnly: true });
    db.prepare("SELECT 1 FROM asset_entries LIMIT 1").get();
  } catch {
    return null;
  }
  const absolute = (rel: string) => path.join(assetsDir, ...rel.split("/"));
  return {
    byId: (id) => db.prepare("SELECT id, rel_path FROM asset_entries WHERE id = ?").get(id) as { id: string; rel_path: string } | undefined,
    async findByIdentity(row) {
      const all = db.prepare("SELECT id, rel_path FROM asset_entries").all() as unknown as { id: string; rel_path: string }[];
      let bySize: { id: string } | undefined;
      for (const e of all) {
        const st = await stat(absolute(e.rel_path)).catch(() => undefined);
        if (!st?.isFile()) continue;
        if (row.src_ino != null && Number(st.ino) === row.src_ino) return { id: e.id };
        if (!bySize && st.size === row.src_size && st.mtimeMs === row.src_mtime_ms) bySize = { id: e.id };
      }
      return bySize;
    },
    absolute,
    close: () => db.close(),
  };
}
