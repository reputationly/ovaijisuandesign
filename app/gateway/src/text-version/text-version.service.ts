import { createHash, randomUUID } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import * as fs from "node:fs/promises";
import path from "node:path";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import * as zlib from "node:zlib";

import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  type OnModuleDestroy,
  type OnModuleInit,
  PayloadTooLargeException,
} from "@nestjs/common";
import type { AssetRow, Db } from "@ov/assets";

import { AssetsService } from "../common/assets.service.js";
import { GatewayEventBus } from "../common/gateway-event-bus.js";
import { WorkspacePathService } from "../common/workspace-path.service.js";
import { computeLineDiffHunks } from "./text-line-diff.js";
import { ensureTextVersionSchema } from "./text-version.schema.js";

export type TextVersionCodec = "zstd" | "gzip";
export type TextVersionOrigin = "initial" | "manual" | "restore" | "agent";
export type TextVersionTier = "S" | "M" | "L";

export const TEXT_VERSION_MAX_PER_DOCUMENT = 20;
export const TEXT_VERSION_MAX_STORED_BYTES_PER_DOCUMENT = 512 * 1024 * 1024;
export const TEXT_VERSION_WORKSPACE_SOFT_QUOTA_BYTES = 5 * 1024 * 1024 * 1024;
/** 一轮 agent 改写可能连着落好几次盘，窗口内只留第一份改写前的快照。 */
export const TEXT_VERSION_AGENT_COLLAPSE_WINDOW_MS = 5 * 60 * 1000;
export const TEXT_VERSION_DIFF_HUNK_LIMIT: Record<TextVersionTier, number> = { S: 2000, M: 500, L: 200 };
const TEXT_VERSION_DIFF_CONTEXT_LINES: Record<TextVersionTier, number> = { S: 3, M: 3, L: 1 };
export const TEXT_VERSION_CONTENT_CHUNK_MAX_BYTES = 512 * 1024;
export const TEXT_VERSION_TITLE_MAX_CHARS = 120;
export const TEXT_VERSION_NOTE_MAX_CHARS = 2000;
const TEXT_VERSION_TRACKED_EXTENSIONS = [".md", ".markdown", ".txt"];

const DIFF_MAX_TOTAL_BYTES = 64 * 1024 * 1024;
const VERSIONS_DIR = path.join(".hilo", "text-versions");
const SNAPSHOT_MAX_ATTEMPTS = 3;
const ORPHAN_OBJECT_GRACE_MS = 60 * 60 * 1000;
const ORPHAN_SWEEP_DEBOUNCE_MS = 60_000;
const ORPHAN_SWEEP_BOOT_DELAY_MS = 30_000;

export function resolveTextVersionTier(contentBytes: number): TextVersionTier {
  if (contentBytes <= 1024 * 1024) return "S";
  if (contentBytes <= 8 * 1024 * 1024) return "M";
  return "L";
}

export function isTextVersionTrackedPath(relPath: string): boolean {
  const lower = relPath.toLowerCase();
  return TEXT_VERSION_TRACKED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

interface VersionRow {
  id: string;
  asset_id: string;
  seq: number;
  title: string;
  note: string;
  note_source: "manual" | "ai";
  content_hash: string;
  content_bytes: number;
  stored_bytes: number;
  codec: TextVersionCodec;
  storage_kind: "full" | "delta";
  object_state: "present" | "missing";
  base_version_id: string | null;
  origin: TextVersionOrigin;
  restored_from_version_id: string | null;
  node_id: string | null;
  rel_path: string | null;
  pinned: 0 | 1;
  created_at: number;
}

export interface TextVersion {
  id: string;
  assetId: string;
  seq: number;
  title: string;
  note: string;
  noteSource: "manual" | "ai";
  contentHash: string;
  contentBytes: number;
  storedBytes: number;
  codec: TextVersionCodec;
  storageKind: "full" | "delta";
  objectState: "present" | "missing";
  baseVersionId?: string;
  origin: TextVersionOrigin;
  restoredFromVersionId?: string;
  nodeId?: string;
  relPath?: string;
  pinned: boolean;
  createdAt: number;
}

export interface DocumentRef {
  assetId?: string;
  path?: string;
}

export interface SaveRequest extends DocumentRef {
  title?: string;
  note?: string;
  noteSource?: "manual" | "ai";
  nodeId?: string;
  origin?: TextVersionOrigin;
  restoredFromVersionId?: string;
}

function rowToVersion(row: VersionRow): TextVersion {
  return {
    id: row.id,
    assetId: row.asset_id,
    seq: row.seq,
    title: row.title,
    note: row.note,
    noteSource: row.note_source,
    contentHash: row.content_hash,
    contentBytes: row.content_bytes,
    storedBytes: row.stored_bytes,
    codec: row.codec,
    storageKind: row.storage_kind,
    objectState: row.object_state,
    ...(row.base_version_id ? { baseVersionId: row.base_version_id } : {}),
    origin: row.origin,
    ...(row.restored_from_version_id ? { restoredFromVersionId: row.restored_from_version_id } : {}),
    ...(row.node_id ? { nodeId: row.node_id } : {}),
    ...(row.rel_path ? { relPath: row.rel_path } : {}),
    pinned: row.pinned === 1,
    createdAt: row.created_at,
  };
}

/** 运行时有 zstd 就用 zstd（压得更小更快），老运行时退回 gzip。编码记在每一行上，读的时候按行解。 */
function detectCodec(): TextVersionCodec {
  return typeof (zlib as { createZstdCompress?: unknown }).createZstdCompress === "function" ? "zstd" : "gzip";
}

function createCompressor(codec: TextVersionCodec): NodeJS.ReadWriteStream {
  if (codec === "zstd") return (zlib as unknown as { createZstdCompress: () => NodeJS.ReadWriteStream }).createZstdCompress();
  return zlib.createGzip();
}

function createDecompressor(codec: TextVersionCodec): NodeJS.ReadWriteStream {
  if (codec === "zstd") return (zlib as unknown as { createZstdDecompress: () => NodeJS.ReadWriteStream }).createZstdDecompress();
  return zlib.createGunzip();
}

function objectExtension(codec: TextVersionCodec): string {
  return codec === "zstd" ? "zst" : "gz";
}

/** 按字节分页读 UTF-8 时，把切在多字节字符中间的头尾让掉，不回半个字。 */
function trimUtf8Window(buffer: Buffer, requestedOffset: number, atStart: boolean, atEnd: boolean) {
  let start = 0;
  if (!atStart) while (start < buffer.length && buffer[start]! >= 0x80 && buffer[start]! < 0xc0) start += 1;
  let end = buffer.length;
  if (!atEnd) {
    let probe = end - 1;
    while (probe >= start && buffer[probe]! >= 0x80 && buffer[probe]! < 0xc0) probe -= 1;
    if (probe >= start) {
      const lead = buffer[probe]!;
      const needed = lead >= 0xf0 ? 4 : lead >= 0xe0 ? 3 : lead >= 0xc0 ? 2 : 1;
      if (probe + needed > end) end = probe;
    }
  }
  const slice = buffer.subarray(start, Math.max(start, end));
  return { text: slice.toString("utf8"), offset: requestedOffset + start, length: slice.length };
}

function sanitizeVersionStem(title: string): string {
  const withoutControls = Array.from(title)
    .map((ch) => ((ch.codePointAt(0) ?? 0) < 32 ? " " : ch))
    .join("");
  const cleaned = withoutControls
    .replace(/[\\/:*?"<>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 48);
  return cleaned.length > 0 ? cleaned : `version-${Date.now().toString(36)}`;
}

/**
 * 文本文档的版本历史：版本挂在资产 id 上（改名、移动都跟着走），同一文件的所有画布节点共用一条时间线。
 *
 * 正文按内容哈希压缩存盘，读取按字节窗口解压；对比在这里算完只回 hunk。
 * 所有"顺手补一份"的动作（首个基线、agent 改写前快照）都是尽力而为：历史记账失败不能让文档写入失败。
 */
@Injectable()
export class TextVersionService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger("TextVersion");
  private readonly codec = detectCodec();
  private orphanSweepTimer?: NodeJS.Timeout;
  private orphanSweepRunning = false;
  /** 正在落快照的数量：对象先进 objects/、行后插入，这段空档里清孤儿会误删刚写好的对象。 */
  private inflightSnapshots = 0;
  private readonly settledInitialVersions = new Set<string>();
  private readonly baselineQueue = new Map<string, Promise<void>>();
  private unsubscribe?: () => void;

  constructor(
    private readonly assets: AssetsService,
    private readonly paths: WorkspacePathService,
    private readonly bus: GatewayEventBus,
  ) {}

  /** 启动后延迟一次孤儿清理（不和工作区冷启动抢 IO），之后每次有资产被删再排一次。 */
  onModuleInit(): void {
    if (process.env.HILO_GATEWAY_ROLE === "app-level") return;
    this.scheduleOrphanSweep(ORPHAN_SWEEP_BOOT_DELAY_MS);
    this.unsubscribe = this.bus.subscribe((m) => {
      if (m.event === "assets:changed" && (m.payload as { change?: string } | null)?.change === "removed") this.scheduleOrphanSweep();
    });
  }

  onModuleDestroy(): void {
    if (this.orphanSweepTimer) clearTimeout(this.orphanSweepTimer);
    this.orphanSweepTimer = undefined;
    this.unsubscribe?.();
  }

  private db(): Db {
    return ensureTextVersionSchema(this.assets.vault.db);
  }

  private objectsRoot(): string {
    return path.join(this.paths.root, VERSIONS_DIR, "objects");
  }

  private tmpRoot(): string {
    return path.join(this.paths.root, VERSIONS_DIR, ".tmp");
  }

  private objectPath(hash: string, codec: TextVersionCodec): string {
    return path.join(this.objectsRoot(), hash.slice(0, 2), `${hash}.${objectExtension(codec)}`);
  }

  private absOf(rel: string): string {
    const abs = this.paths.resolve(rel);
    if (!abs) throw new BadRequestException(`Path escapes workspace: ${rel}`);
    return abs;
  }

  /** 同一文档的补基线串行：并发的 list 各自看到"还没有版本"就会插两份一样的基线。 */
  private serializeBaseline<T>(assetId: string, task: () => Promise<T>): Promise<T> {
    const previous = this.baselineQueue.get(assetId) ?? Promise.resolve();
    const next = previous.then(task, task);
    const settled = next.then(
      () => undefined,
      () => undefined,
    );
    this.baselineQueue.set(assetId, settled);
    void settled.then(() => {
      if (this.baselineQueue.get(assetId) === settled) this.baselineQueue.delete(assetId);
    });
    return next;
  }

  /** 版本按资产 id 记，但画布只带路径：两种写法都收。 */
  resolveAsset(ref: DocumentRef): AssetRow {
    if (ref.assetId) {
      const byId = this.assets.byId(ref.assetId);
      if (byId) return byId;
    }
    if (ref.path) {
      const byPath = this.assets.byPath(ref.path);
      if (byPath) return byPath;
    }
    throw new NotFoundException(`Document not found (assetId: ${ref.assetId ?? "-"}, path: ${ref.path ?? "-"})`);
  }

  // ---------------------------------------------------------------------------
  // 查询
  // ---------------------------------------------------------------------------

  async list(ref: DocumentRef) {
    const asset = this.resolveAsset(ref);
    await this.ensureBaselineVersion(asset.id, asset.path);
    const db = this.db();
    const rows = db.prepare("SELECT * FROM text_document_versions WHERE asset_id = ? ORDER BY created_at DESC, seq DESC").all(asset.id) as VersionRow[];
    return { versions: rows.map(rowToVersion), quota: this.readQuota(db, asset.id) };
  }

  get(id: string): TextVersion {
    return rowToVersion(this.requireRow(this.db(), id));
  }

  private requireRow(db: Db, id: string): VersionRow {
    const row = db.prepare("SELECT * FROM text_document_versions WHERE id = ?").get(id) as VersionRow | undefined;
    if (!row) throw new NotFoundException(`Text version not found: ${id}`);
    return row;
  }

  private nextSeq(db: Db, assetId: string): number {
    const row = db.prepare("SELECT MAX(seq) AS maxSeq FROM text_document_versions WHERE asset_id = ?").get(assetId) as { maxSeq: number | null } | undefined;
    return (row?.maxSeq ?? 0) + 1;
  }

  private readQuota(db: Db, assetId: string) {
    const doc = db.prepare("SELECT COALESCE(SUM(stored_bytes), 0) AS bytes FROM text_document_versions WHERE asset_id = ?").get(assetId) as { bytes: number };
    // 同一个对象被多行引用只算一次：配额算的是盘上真实占用。
    const workspace = db
      .prepare("SELECT COALESCE(SUM(bytes), 0) AS bytes FROM (SELECT DISTINCT content_hash, stored_bytes AS bytes FROM text_document_versions)")
      .get() as { bytes: number };
    return {
      documentStoredBytes: doc.bytes,
      workspaceStoredBytes: workspace.bytes,
      workspaceQuotaExceeded: workspace.bytes > TEXT_VERSION_WORKSPACE_SOFT_QUOTA_BYTES,
      maxPerDocument: TEXT_VERSION_MAX_PER_DOCUMENT,
    };
  }

  // ---------------------------------------------------------------------------
  // 保存
  // ---------------------------------------------------------------------------

  async save(req: SaveRequest) {
    this.inflightSnapshots += 1;
    try {
      return await this.saveInternal(req);
    } finally {
      this.inflightSnapshots -= 1;
    }
  }

  private async saveInternal(req: SaveRequest) {
    const asset = this.resolveAsset(req);
    const snapshot = await this.snapshotFile(this.absOf(asset.path));
    const db = this.db();
    const origin = req.origin ?? "manual";
    const latest = db
      .prepare("SELECT id FROM text_document_versions WHERE asset_id = ? ORDER BY created_at DESC, seq DESC LIMIT 1")
      .get(asset.id) as { id: string } | undefined;
    const version: TextVersion = {
      id: randomUUID(),
      assetId: asset.id,
      seq: this.nextSeq(db, asset.id),
      title: this.normalizeTitle(req.title),
      note: this.normalizeNote(req.note),
      noteSource: req.noteSource === "ai" ? "ai" : "manual",
      contentHash: snapshot.hash,
      contentBytes: snapshot.contentBytes,
      storedBytes: snapshot.storedBytes,
      codec: snapshot.codec,
      storageKind: "full",
      objectState: "present",
      ...(latest ? { baseVersionId: latest.id } : {}),
      origin,
      ...(origin === "restore" && req.restoredFromVersionId ? { restoredFromVersionId: req.restoredFromVersionId } : {}),
      ...(req.nodeId ? { nodeId: req.nodeId } : {}),
      relPath: asset.path,
      pinned: false,
      createdAt: Date.now(),
    };
    db.prepare(
      `INSERT INTO text_document_versions (
         id, asset_id, seq, title, note, note_source, content_hash, content_bytes,
         stored_bytes, codec, storage_kind, object_state, base_version_id, origin,
         restored_from_version_id, node_id, rel_path, pinned, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      version.id,
      version.assetId,
      version.seq,
      version.title,
      version.note,
      version.noteSource,
      version.contentHash,
      version.contentBytes,
      version.storedBytes,
      version.codec,
      version.storageKind,
      version.objectState,
      version.baseVersionId ?? null,
      version.origin,
      version.restoredFromVersionId ?? null,
      version.nodeId ?? null,
      version.relPath ?? null,
      0,
      version.createdAt,
    );
    const prunedIds = await this.pruneDocument(db, asset.id);
    return { ok: true as const, version, deduped: snapshot.deduped, prunedIds, quota: this.readQuota(db, asset.id) };
  }

  /**
   * 把当前文件流式写进内容寻址存储：一遍读完同时算哈希和压缩，落到 .tmp 再改名进 objects/。
   * 读前读后比 size / mtime：对不上说明读的过程中有人（agent）在写，重试而不是存一份撕裂的文档。
   */
  private async snapshotFile(absPath: string) {
    let lastError: Error | undefined;
    for (let attempt = 0; attempt < SNAPSHOT_MAX_ATTEMPTS; attempt += 1) {
      const before = await fs.stat(absPath).catch(() => null);
      if (!before) throw new NotFoundException(`File not found: ${absPath}`);
      await fs.mkdir(this.tmpRoot(), { recursive: true });
      const tmpPath = path.join(this.tmpRoot(), `${randomUUID()}.part`);
      const hash = createHash("sha256");
      let contentBytes = 0;
      const meter = new Transform({
        transform(chunk: Buffer, _enc, cb) {
          hash.update(chunk);
          contentBytes += chunk.length;
          cb(null, chunk);
        },
      });
      try {
        await pipeline(createReadStream(absPath), meter, createCompressor(this.codec), createWriteStream(tmpPath));
      } catch (err) {
        await fs.rm(tmpPath, { force: true }).catch(() => undefined);
        throw err;
      }
      const after = await fs.stat(absPath).catch(() => null);
      if (!after || after.size !== before.size || after.mtimeMs !== before.mtimeMs) {
        await fs.rm(tmpPath, { force: true }).catch(() => undefined);
        lastError = new Error("File changed while snapshotting");
        continue;
      }
      const digest = hash.digest("hex");
      const target = this.objectPath(digest, this.codec);
      await fs.mkdir(path.dirname(target), { recursive: true });
      const existing = await fs.stat(target).catch(() => null);
      if (existing) {
        await fs.rm(tmpPath, { force: true }).catch(() => undefined);
        return { hash: digest, contentBytes, storedBytes: existing.size, codec: this.codec, deduped: true };
      }
      const tmpStat = await fs.stat(tmpPath);
      await fs.rename(tmpPath, target);
      return { hash: digest, contentBytes, storedBytes: tmpStat.size, codec: this.codec, deduped: false };
    }
    throw new BadRequestException(`Could not take a consistent snapshot after ${SNAPSHOT_MAX_ATTEMPTS} attempts: ${lastError?.message ?? "unknown"}`);
  }

  /**
   * 文档刚出现时补版本 1。幂等、从不抛：已有任何版本、不是文本、盘上没有文件都直接跳过。
   */
  async ensureInitialVersion(ref: DocumentRef, opts: { nodeId?: string } = {}): Promise<TextVersion | null> {
    try {
      if (ref.path && !isTextVersionTrackedPath(ref.path)) return null;
      const asset = this.resolveAsset(ref);
      if (!isTextVersionTrackedPath(asset.path)) return null;
      return await this.serializeBaseline(asset.id, async () => {
        const existing = this.db().prepare("SELECT 1 AS present FROM text_document_versions WHERE asset_id = ? LIMIT 1").get(asset.id);
        if (existing) return null;
        const st = await fs.stat(this.absOf(asset.path)).catch(() => null);
        if (!st?.isFile()) return null;
        return (await this.save({ assetId: asset.id, origin: "initial", ...(opts.nodeId ? { nodeId: opts.nodeId } : {}) })).version;
      });
    } catch (err) {
      this.log.warn(`ensureInitialVersion skipped for ${ref.path ?? ref.assetId}: ${(err as Error).message}`);
      return null;
    }
  }

  /**
   * agent 改写文档之前，把即将被覆盖的内容存一份。存的是改写前而不是改写后：接受审阅不会再写盘，
   * 真正会丢的是 agent 动手之前的那份。同样从不抛。
   *
   * 三种情况不存：文档还没历史（改写前的内容作为 initial 基线）；最新版本就是这份字节；
   * 最新版本是折叠窗口内的 agent 快照。
   */
  async snapshotBeforeAgentEdit(ref: DocumentRef, opts: { nodeId?: string; contentHash?: string } = {}): Promise<TextVersion | null> {
    try {
      if (ref.path && !isTextVersionTrackedPath(ref.path)) return null;
      const asset = this.resolveAsset(ref);
      if (!isTextVersionTrackedPath(asset.path)) return null;
      const nodeOpts = opts.nodeId ? { nodeId: opts.nodeId } : {};
      const initial = await this.ensureInitialVersion({ assetId: asset.id }, nodeOpts);
      if (initial) return initial;
      const absPath = this.absOf(asset.path);
      const st = await fs.stat(absPath).catch(() => null);
      if (!st?.isFile()) return null;
      const latest = this.db()
        .prepare("SELECT content_hash, origin, created_at FROM text_document_versions WHERE asset_id = ? ORDER BY created_at DESC, seq DESC LIMIT 1")
        .get(asset.id) as { content_hash: string; origin: TextVersionOrigin; created_at: number } | undefined;
      if (latest) {
        const currentHash = opts.contentHash ?? (await this.hashFile(absPath));
        if (currentHash && latest.content_hash === currentHash) return null;
        if (latest.origin === "agent" && Date.now() - latest.created_at < TEXT_VERSION_AGENT_COLLAPSE_WINDOW_MS) return null;
      }
      return (await this.save({ assetId: asset.id, origin: "agent", ...nodeOpts })).version;
    } catch (err) {
      this.log.warn(`snapshotBeforeAgentEdit skipped for ${ref.path ?? ref.assetId}: ${(err as Error).message}`);
      return null;
    }
  }

  /**
   * 打开版本栏时文档一个版本都没有（功能上线前就有的文档，或者走了没补基线的创建路径）：补一份基线。
   * 已有的空 initial 是有意保留的：它代表用户开始时那张空白文本卡，换成第一段自动保存的内容，
   * "初始版本"就还原不回真正的初始状态了。
   */
  async ensureBaselineVersion(assetId: string, relPath: string): Promise<void> {
    if (this.settledInitialVersions.has(assetId)) return;
    try {
      if (!isTextVersionTrackedPath(relPath)) {
        this.settledInitialVersions.add(assetId);
        return;
      }
      await this.serializeBaseline(assetId, async () => {
        if (this.settledInitialVersions.has(assetId)) return;
        const rows = this.db().prepare("SELECT 1 AS present FROM text_document_versions WHERE asset_id = ?").all(assetId);
        if (rows.length > 0) {
          this.settledInitialVersions.add(assetId);
          return;
        }
        const st = await fs.stat(this.absOf(relPath)).catch(() => null);
        if (!st?.isFile()) return;
        await this.save({ assetId, origin: "initial" });
        this.settledInitialVersions.add(assetId);
      });
    } catch (err) {
      this.log.warn(`ensureBaselineVersion skipped for ${relPath}: ${(err as Error).message}`);
    }
  }

  /** 标题可以为空：空串表示"未命名"，界面按位置显示"版本 N"。 */
  private normalizeTitle(raw?: string): string {
    return (raw ?? "").trim().slice(0, TEXT_VERSION_TITLE_MAX_CHARS);
  }

  private normalizeNote(raw?: string): string {
    return (raw ?? "").trim().slice(0, TEXT_VERSION_NOTE_MAX_CHARS);
  }

  // ---------------------------------------------------------------------------
  // 配额淘汰
  // ---------------------------------------------------------------------------

  /**
   * 超出每文档的条数 / 字节上限时淘汰最老的未钉住版本。钉住的永远不淘汰（用户明确钉住的优先于默认配额）；
   * agent 自动快照先于用户手存的版本淘汰：一轮 agent 能产好几份，不能让它们把用户起了名的版本挤掉。
   */
  private async pruneDocument(db: Db, assetId: string): Promise<string[]> {
    const rows = db
      .prepare("SELECT id, stored_bytes, pinned, origin FROM text_document_versions WHERE asset_id = ? ORDER BY created_at ASC, seq ASC")
      .all(assetId) as { id: string; stored_bytes: number; pinned: number; origin: string }[];
    let count = rows.length;
    let bytes = rows.reduce((acc, r) => acc + r.stored_bytes, 0);
    const victims: string[] = [];
    const evictionOrder = [...rows.filter((r) => r.origin === "agent"), ...rows.filter((r) => r.origin !== "agent")];
    for (const row of evictionOrder) {
      if (count <= TEXT_VERSION_MAX_PER_DOCUMENT && bytes <= TEXT_VERSION_MAX_STORED_BYTES_PER_DOCUMENT) break;
      if (row.pinned === 1) continue;
      if (count <= 1) break;
      victims.push(row.id);
      count -= 1;
      bytes -= row.stored_bytes;
    }
    for (const id of victims) await this.remove(id);
    return victims;
  }

  // ---------------------------------------------------------------------------
  // 孤儿对象
  // ---------------------------------------------------------------------------

  /** 排一次孤儿清理。已经排上的不重排：一连串删除不能把定时器一直往后推。 */
  scheduleOrphanSweep(delayMs = ORPHAN_SWEEP_DEBOUNCE_MS): void {
    if (this.orphanSweepTimer) return;
    this.orphanSweepTimer = setTimeout(() => {
      this.orphanSweepTimer = undefined;
      void this.sweepOrphanObjects().catch((err: unknown) => this.log.warn(`Orphan sweep failed: ${(err as Error).message}`));
    }, delayMs);
    this.orphanSweepTimer.unref?.();
  }

  /**
   * 删掉没有任何版本行引用的对象（资产硬删时行随外键级联走了，盘上的对象要这里收）。
   * 一律偏向保留：有快照在写就推迟、一小时内的新对象不动、删之前再查一次引用、任何 fs 错误都下次再说。
   */
  async sweepOrphanObjects(): Promise<{ removed: number; reclaimedBytes: number }> {
    const idle = { removed: 0, reclaimedBytes: 0 };
    if (this.orphanSweepRunning) return idle;
    if (this.inflightSnapshots > 0) {
      this.scheduleOrphanSweep();
      return idle;
    }
    await this.sweepStaleStagingFiles();
    const root = this.objectsRoot();
    const shards = await fs.readdir(root).catch(() => null);
    if (!shards || shards.length === 0) return idle;
    this.orphanSweepRunning = true;
    try {
      const db = this.db();
      const referenced = new Set((db.prepare("SELECT DISTINCT content_hash FROM text_document_versions").all() as { content_hash: string }[]).map((r) => r.content_hash));
      const stillReferenced = db.prepare("SELECT 1 FROM text_document_versions WHERE content_hash = ? LIMIT 1");
      const cutoff = Date.now() - ORPHAN_OBJECT_GRACE_MS;
      let removed = 0;
      let reclaimedBytes = 0;
      for (const shard of shards) {
        const shardDir = path.join(root, shard);
        const entries = await fs.readdir(shardDir).catch(() => null);
        if (!entries) continue;
        for (const entry of entries) {
          const dot = entry.indexOf(".");
          const hash = dot === -1 ? entry : entry.slice(0, dot);
          if (hash.length !== 64 || referenced.has(hash)) continue;
          const objectPath = path.join(shardDir, entry);
          const st = await fs.stat(objectPath).catch(() => null);
          if (!st?.isFile() || st.mtimeMs > cutoff) continue;
          if (this.inflightSnapshots > 0) {
            this.scheduleOrphanSweep();
            return { removed, reclaimedBytes };
          }
          if (stillReferenced.get(hash)) continue;
          try {
            await fs.rm(objectPath, { force: true });
            removed += 1;
            reclaimedBytes += st.size;
          } catch (err) {
            this.log.warn(`Orphan object ${objectPath} could not be removed: ${(err as Error).message}`);
          }
        }
        await fs.rmdir(shardDir).catch(() => undefined);
      }
      if (removed > 0) this.log.log(`Reclaimed ${removed} orphan version object(s), ${reclaimedBytes} bytes`);
      return { removed, reclaimedBytes };
    } finally {
      this.orphanSweepRunning = false;
    }
  }

  /** `.tmp/*.part` 活过宽限期说明写到一半进程没了。 */
  private async sweepStaleStagingFiles(): Promise<void> {
    const entries = await fs.readdir(this.tmpRoot()).catch(() => null);
    if (!entries || entries.length === 0) return;
    const cutoff = Date.now() - ORPHAN_OBJECT_GRACE_MS;
    for (const entry of entries) {
      if (!entry.endsWith(".part")) continue;
      const file = path.join(this.tmpRoot(), entry);
      const st = await fs.stat(file).catch(() => null);
      if (!st?.isFile() || st.mtimeMs > cutoff) continue;
      await fs.rm(file, { force: true }).catch(() => undefined);
    }
  }

  // ---------------------------------------------------------------------------
  // 修改
  // ---------------------------------------------------------------------------

  update(id: string, patch: { title?: string; note?: string; noteSource?: "manual" | "ai"; pinned?: boolean }): TextVersion {
    const db = this.db();
    const row = this.requireRow(db, id);
    const title = patch.title === undefined ? row.title : this.normalizeTitle(patch.title);
    const note = patch.note === undefined ? row.note : this.normalizeNote(patch.note);
    // 改了备注又没说来源：当成用户手改的。
    const noteSource = patch.noteSource ?? (patch.note === undefined ? row.note_source : "manual");
    const pinned = patch.pinned === undefined ? row.pinned : patch.pinned ? 1 : 0;
    db.prepare("UPDATE text_document_versions SET title = ?, note = ?, note_source = ?, pinned = ? WHERE id = ?").run(title, note, noteSource, pinned, id);
    return rowToVersion(this.requireRow(db, id));
  }

  /** 删一行；它是对象的最后一个引用时顺手删对象。删对象失败只记日志：多占点盘好过删行失败卡住界面。 */
  async remove(id: string): Promise<void> {
    const db = this.db();
    const row = db.prepare("SELECT * FROM text_document_versions WHERE id = ?").get(id) as VersionRow | undefined;
    if (!row) return;
    db.prepare("DELETE FROM text_document_versions WHERE id = ?").run(id);
    const remaining = db.prepare("SELECT COUNT(*) AS n FROM text_document_versions WHERE content_hash = ?").get(row.content_hash) as { n: number };
    if (remaining.n > 0) return;
    const target = this.objectPath(row.content_hash, row.codec);
    await fs.rm(target, { force: true }).catch((err: unknown) => this.log.warn(`Failed to remove version object ${target}: ${(err as Error).message}`));
  }

  // ---------------------------------------------------------------------------
  // 读内容
  // ---------------------------------------------------------------------------

  async readContent(id: string, offset = 0, limit?: number) {
    const row = this.requireRow(this.db(), id);
    this.assertObjectPresent(row);
    const start = Math.max(0, Math.min(offset, row.content_bytes));
    const span = Math.max(0, Math.min(limit ?? TEXT_VERSION_CONTENT_CHUNK_MAX_BYTES, TEXT_VERSION_CONTENT_CHUNK_MAX_BYTES));
    const end = Math.min(row.content_bytes, start + span);
    const buffer = await this.readRange(row, start, end);
    const window = trimUtf8Window(buffer, start, start === 0, end >= row.content_bytes);
    return {
      content: window.text,
      offset: window.offset,
      length: window.length,
      totalBytes: row.content_bytes,
      eof: window.offset + window.length >= row.content_bytes,
      tier: resolveTextVersionTier(row.content_bytes),
    };
  }

  private assertObjectPresent(row: VersionRow): void {
    if (row.object_state !== "present") throw new NotFoundException(`Version content is not available locally (state: ${row.object_state})`);
  }

  /** 只解压到覆盖 [start, end) 为止。 */
  private async readRange(row: VersionRow, start: number, end: number): Promise<Buffer> {
    const source = createReadStream(this.objectPath(row.content_hash, row.codec));
    const decompressor = createDecompressor(row.codec);
    source.on("error", (err) => (decompressor as unknown as { destroy(e: Error): void }).destroy(err));
    const stream = source.pipe(decompressor);
    const parts: Buffer[] = [];
    let seen = 0;
    try {
      for await (const chunk of stream as AsyncIterable<Buffer>) {
        const chunkStart = seen;
        seen += chunk.length;
        if (seen <= start) continue;
        const from = Math.max(0, start - chunkStart);
        const to = Math.min(chunk.length, end - chunkStart);
        if (to > from) parts.push(chunk.subarray(from, to));
        if (seen >= end) break;
      }
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        this.markObjectMissing(row.id);
        throw new NotFoundException("Version content object is missing on disk");
      }
      throw err;
    } finally {
      (stream as unknown as { destroy(): void }).destroy();
      source.destroy();
    }
    return Buffer.concat(parts);
  }

  private markObjectMissing(id: string): void {
    this.db().prepare("UPDATE text_document_versions SET object_state = 'missing' WHERE id = ?").run(id);
  }

  private async readWholeVersion(row: VersionRow, budgetBytes: number): Promise<string> {
    if (row.content_bytes > budgetBytes) throw new PayloadTooLargeException(`Version content is ${row.content_bytes} bytes, above the ${budgetBytes} byte budget`);
    this.assertObjectPresent(row);
    return (await this.readRange(row, 0, row.content_bytes)).toString("utf8");
  }

  // ---------------------------------------------------------------------------
  // 对比
  // ---------------------------------------------------------------------------

  /** `from` 对 `to`，不给 `to` 就对当前盘上的内容。 */
  async diff(params: { from: string; to?: string; offset?: number; limit?: number }) {
    const db = this.db();
    const fromRow = this.requireRow(db, params.from);
    const toRow = params.to ? this.requireRow(db, params.to) : null;
    const currentBytes = toRow ? toRow.content_bytes : await this.currentContentBytes(fromRow);
    if (fromRow.content_bytes + currentBytes > DIFF_MAX_TOTAL_BYTES) {
      throw new PayloadTooLargeException(`Diff input is ${fromRow.content_bytes + currentBytes} bytes, above the ${DIFF_MAX_TOTAL_BYTES} byte budget`);
    }
    const oldText = await this.readWholeVersion(fromRow, DIFF_MAX_TOTAL_BYTES);
    const newText = toRow ? await this.readWholeVersion(toRow, DIFF_MAX_TOTAL_BYTES) : await this.readCurrentContent(fromRow);
    const tier = resolveTextVersionTier(Math.max(fromRow.content_bytes, currentBytes));
    const result = computeLineDiffHunks(oldText, newText, {
      contextLines: TEXT_VERSION_DIFF_CONTEXT_LINES[tier],
      maxHunks: Math.min(params.limit ?? TEXT_VERSION_DIFF_HUNK_LIMIT[tier], TEXT_VERSION_DIFF_HUNK_LIMIT[tier]),
      hunkOffset: params.offset ?? 0,
      // 编辑器每次保存都会重排 markdown（表格对齐、空行位置），逐字节比较会把用户真正的改动埋在一堆格式噪音里。
      ignoreWhitespace: true,
      // 改写一节 markdown 会留着段间空行，不桥接的话一处改动被切成每段一对 -/+。
      coalesceBlankGaps: true,
    });
    return {
      hunks: result.hunks,
      offset: params.offset ?? 0,
      total: result.total,
      truncated: result.truncated,
      coarse: result.coarse,
      addedLines: result.addedLines,
      removedLines: result.removedLines,
      tier,
    };
  }

  private async currentContentBytes(row: VersionRow): Promise<number> {
    const st = await fs.stat(this.assetAbsPath(row.asset_id)).catch(() => null);
    return st?.size ?? 0;
  }

  private async readCurrentContent(row: VersionRow): Promise<string> {
    const abs = this.assetAbsPath(row.asset_id);
    const st = await fs.stat(abs).catch(() => null);
    if (!st) return "";
    if (st.size > DIFF_MAX_TOTAL_BYTES) throw new PayloadTooLargeException(`Current document is ${st.size} bytes, above the ${DIFF_MAX_TOTAL_BYTES} byte budget`);
    return fs.readFile(abs, "utf8");
  }

  private assetAbsPath(assetId: string): string {
    return this.absOf(this.resolveAsset({ assetId }).path);
  }

  getLatestVersionId(ref: DocumentRef): string | null {
    const asset = this.resolveAsset(ref);
    const row = this.db()
      .prepare("SELECT id FROM text_document_versions WHERE asset_id = ? ORDER BY created_at DESC, seq DESC LIMIT 1")
      .get(asset.id) as { id: string } | undefined;
    return row?.id ?? null;
  }

  /** 当前文档的开头一段（"首个版本、没东西可比"时给摘要用）。只读一个窗口，15 MB 的文档和 2 KB 的一样快。 */
  async readCurrentHead(ref: DocumentRef, maxBytes: number): Promise<{ head: string; truncated: boolean }> {
    const abs = this.absOf(this.resolveAsset(ref).path);
    const st = await fs.stat(abs).catch(() => null);
    if (!st) return { head: "", truncated: false };
    const end = Math.min(st.size, maxBytes);
    const handle = await fs.open(abs, "r");
    try {
      const buffer = Buffer.alloc(end);
      await handle.read(buffer, 0, end, 0);
      const window = trimUtf8Window(buffer, 0, true, end >= st.size);
      return { head: window.text, truncated: st.size > end };
    } finally {
      await handle.close();
    }
  }

  // ---------------------------------------------------------------------------
  // 还原 / 另存为新文档
  // ---------------------------------------------------------------------------

  /**
   * 用某个版本覆盖文档。先存一份还原前的快照（内容一样就不存），"还原"永远不会是丢东西的那一步；
   * 写入走临时文件 + 改名，中途崩了原文件还是完整的。
   *
   * 还原前快照不写标题，只记 `restoredFromVersionId`：界面按引用现算"还原自 xxx"，被还原的版本改名后跟着变。
   */
  async restore(id: string, opts: { autoSnapshotNote?: string; nodeId?: string } = {}) {
    const row = this.requireRow(this.db(), id);
    this.assertObjectPresent(row);
    const asset = this.resolveAsset({ assetId: row.asset_id });
    const absPath = this.absOf(asset.path);
    const currentHash = await this.hashFile(absPath);
    let autoSnapshot: TextVersion | undefined;
    if (currentHash !== row.content_hash) {
      const saved = await this.save({
        assetId: row.asset_id,
        note: opts.autoSnapshotNote,
        origin: "restore",
        restoredFromVersionId: id,
        ...(opts.nodeId ? { nodeId: opts.nodeId } : {}),
      });
      autoSnapshot = saved.version;
    }
    const tmpPath = `${absPath}.restore-${randomUUID()}.tmp`;
    try {
      await pipeline(createReadStream(this.objectPath(row.content_hash, row.codec)), createDecompressor(row.codec), createWriteStream(tmpPath));
      await fs.rename(tmpPath, absPath);
    } catch (err) {
      await fs.rm(tmpPath, { force: true }).catch(() => undefined);
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        this.markObjectMissing(id);
        throw new NotFoundException("Version content object is missing on disk");
      }
      throw err;
    }
    return { ok: true as const, path: asset.path, ...(autoSnapshot ? { autoSnapshot } : {}) };
  }

  /**
   * 把某个版本写成工作区根目录下的一份新文本资产，画布把它放成原节点旁边的独立节点。
   * 放在根目录而不是 .hilo/：它是普通的用户文档，要出现在文件面板里、能被 agent 按路径引用。
   */
  async materialize(id: string) {
    const row = this.requireRow(this.db(), id);
    this.assertObjectPresent(row);
    const stem = sanitizeVersionStem(row.title);
    const dir = this.paths.root;
    await fs.mkdir(dir, { recursive: true });
    let candidate = stem;
    let counter = 1;
    let absPath = path.join(dir, `${candidate}.md`);
    // wx 占位：两个并发的另存不会写到同一个文件名上。
    for (;;) {
      try {
        await (await fs.open(absPath, "wx")).close();
        break;
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== "EEXIST") throw err;
        counter += 1;
        if (counter > 100) throw new BadRequestException(`Too many existing files for ${stem}.md`);
        candidate = `${stem}-${counter}`;
        absPath = path.join(dir, `${candidate}.md`);
      }
    }
    try {
      await pipeline(createReadStream(this.objectPath(row.content_hash, row.codec)), createDecompressor(row.codec), createWriteStream(absPath));
    } catch (err) {
      await fs.rm(absPath, { force: true }).catch(() => undefined);
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        this.markObjectMissing(id);
        throw new NotFoundException("Version content object is missing on disk");
      }
      throw err;
    }
    let enrolled: AssetRow;
    try {
      enrolled = await this.assets.enroll(`${candidate}.md`);
    } catch (err) {
      throw new BadRequestException(`Text asset enroll failed: ${(err as Error).message}`);
    }
    return { ok: true as const, assetId: enrolled.id, path: `${candidate}.md`, name: `${candidate}.md` };
  }

  /** 流式算当前文件的 sha256，不整份读进内存。 */
  private async hashFile(absPath: string): Promise<string | null> {
    try {
      const hash = createHash("sha256");
      for await (const chunk of createReadStream(absPath)) hash.update(chunk as Buffer);
      return hash.digest("hex");
    } catch {
      return null;
    }
  }
}
