import { createHash, randomUUID } from "node:crypto";
import type { OnModuleDestroy } from "@nestjs/common";
import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { copyFile, link, lstat, mkdir, mkdtemp, readdir, rm, symlink, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import sharp from "sharp";
import Database from "better-sqlite3";

import { CanvasService } from "../canvas/canvas.service.js";
import { defaultNodeSize, findFreePosition, GROUP_PADDING } from "../canvas/canvas-geometry.js";
import { AssetsService } from "../common/assets.service.js";
import { WorkspacePathService } from "../common/workspace-path.service.js";
import { GatewayConfig } from "../config/gateway-config.js";
import { FileOpsService } from "../files/file-ops.service.js";
import { unzipEntries, zipEntries } from "./zip.js";

const ENTITY_TYPES = ["character", "scene", "style_pack", "prop", "custom"] as const;
const ATTACHMENT_EXTENSIONS: Record<string, string[]> = {
  image: ["png", "jpg", "jpeg", "webp", "gif", "heic", "heif"],
  video: ["mp4", "webm"],
  audio: ["mp3", "wav", "m4a", "ogg"],
  text: ["txt", "md", "json", "jsonl", "yaml", "yml", "csv"],
  document: ["pptx", "ppt", "pot", "potx", "pps", "ppsx", "dps", "dpt", "pptm", "potm", "ppsm", "doc", "dot", "wps", "wpt", "docx", "dotx", "docm", "dotm", "xls", "xlt", "et", "ett", "xlsx", "xltx", "xlsb", "xlsm", "xltm", "ets", "pdf"],
};
const FILE_SIZE_CAP = 200 * 1024 * 1024;

type EntityType = (typeof ENTITY_TYPES)[number];
type AttachmentKind = "image" | "video" | "audio" | "text" | "document";
type SortMode = "updated_at" | "use_count";

export type EntitySummary = {
  id: string;
  name: string;
  type: string;
  description: string;
  updatedAt: number;
  useCount: number;
  coverUrl?: string;
  thumbnailUrl?: string;
  primaryAttachmentKind?: string;
};

export type EntityRecord = {
  id: string;
  type: string;
  name: string;
  description: string;
  schema: Record<string, unknown>;
  metadata: Record<string, unknown>;
  useCount: number;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
  recycledAt: number | null;
  coverUrl?: string;
  attachments?: AttachmentRecord[];
};

export type AttachmentRecord = {
  id: string;
  entityId: string;
  kind: string;
  blobPath: string;
  originalFilename: string;
  byteSize: number;
  ord: number;
  meta: Record<string, unknown>;
};

type Bundle = { root: string; db: Database.Database };

/**
 * 资产中心库只在第一次写入时创建。只读请求看到库不存在就当空库，
 * 这样「从没建过」和「建过但是空的」还能靠 library-status 分开。
 */
@Injectable()
export class AssetCenterService implements OnModuleDestroy {
  private bundle: Bundle | null = null;

  /**
   * **必须显式关库。** better-sqlite3 的句柄不会随进程/模块销毁自动释放：
   * Windows 上不关就删不掉数据目录（`EBUSY: resource busy or locked … asset-center.sqlite`），
   * 用户迁移工作区、删项目、卸装都会撞上。POSIX 上删得掉（unlink 打开的文件是合法的），
   * 所以这个 bug 只在 Windows 显形 —— 测试里的 EBUSY 就是它的影子。
   */
  onModuleDestroy(): void {
    this.bundle?.db.close();
    this.bundle = null;
  }

  constructor(
    private readonly config: GatewayConfig,
    private readonly assets: AssetsService,
    private readonly paths: WorkspacePathService,
    private readonly canvas: CanvasService,
    private readonly files: FileOpsService,
  ) {}

  root(): string {
    return process.env.HILO_ASSET_CENTER_DIR?.trim() || path.join(this.config.hubDir, ".asset-center");
  }

  libraryStatus(): { initialized: boolean } {
    return { initialized: existsSync(this.dbFile()) };
  }

  listEntities(opts: { type?: EntityType; q?: string; limit?: number; sort?: SortMode }): EntitySummary[] {
    const bundle = this.readBundle();
    if (!bundle) return [];
    return listEntities(bundle.db, opts);
  }

  listWorkspaceRefs(workspacePath: string) {
    const bundle = this.readBundle();
    if (!bundle) return [];
    return bundle.db
      .prepare("SELECT * FROM workspace_entity_refs WHERE workspace_path = ? ORDER BY materialized_at DESC")
      .all(workspacePath) as Array<{ workspace_path: string; entity_id: string; materialize_path: string; materialized_at: number }>;
  }

  getEntity(id: string, fields?: string): EntityRecord {
    const bundle = this.readBundle();
    const entity = bundle ? getEntity(bundle.db, id, false) : null;
    if (!entity) throw new NotFoundException({ code: "entity_not_found", message: `Entity not found: ${id}` });
    if (fields === "canvas") entity.attachments = listAttachments(bundle!.db, id);
    return entity;
  }

  createEntity(input: { type: string; name: string; description?: string; schema?: Record<string, unknown>; metadata?: Record<string, unknown>; attachments?: Array<{ blobPath: string; kind: AttachmentKind; originalFilename: string; byteSize: number; meta?: Record<string, unknown> }> }): EntityRecord {
    const type = assertType(input.type);
    const bundle = this.writeBundle();
    assertCover(bundle, input.metadata);
    const attachments = input.attachments ?? [];
    for (const attachment of attachments) assertBlob(bundle, attachment.blobPath, attachment.kind, attachment.originalFilename);
    const created = bundle.db.transaction(() => {
      const entity = insertEntity(bundle.db, { type, name: input.name, description: input.description, schema: input.schema, metadata: input.metadata });
      insertAttachments(bundle.db, entity.id, attachments);
      return getEntity(bundle.db, entity.id, false)!;
    })();
    return created;
  }

  updateEntity(id: string, patch: { type?: string; name?: string; description?: string; schema?: Record<string, unknown>; metadata?: Record<string, unknown>; attachments?: Array<{ blobPath: string; kind: AttachmentKind; originalFilename: string; byteSize: number; meta?: Record<string, unknown> }> }): EntityRecord {
    const bundle = this.writeBundle();
    const existing = getEntity(bundle.db, id, false);
    if (!existing) throw new NotFoundException({ code: "entity_not_found", message: `Entity not found: ${id}` });
    if (patch.type !== undefined) assertType(patch.type);
    assertCover(bundle, patch.metadata);
    if (patch.attachments) {
      for (const attachment of patch.attachments) assertBlob(bundle, attachment.blobPath, attachment.kind, attachment.originalFilename);
    }
    return bundle.db.transaction(() => {
      const typeChanged = patch.type !== undefined && patch.type !== existing.type;
      updateEntityRow(bundle.db, id, { ...patch, schema: typeChanged ? {} : patch.schema });
      if (patch.attachments) {
        bundle.db.prepare("DELETE FROM entity_attachments WHERE entity_id = ?").run(id);
        insertAttachments(bundle.db, id, patch.attachments);
      }
      return getEntity(bundle.db, id, false)!;
    })();
  }

  async deleteEntity(id: string): Promise<{ trashedBlobs: number; trashFailed: number; cleanedWorkspaces: number }> {
    const bundle = this.writeBundle();
    const entity = getEntity(bundle.db, id, true);
    if (!entity) throw new NotFoundException({ code: "entity_not_found", message: `Entity not found: ${id}` });
    if (entity.deletedAt !== null) return { trashedBlobs: 0, trashFailed: 0, cleanedWorkspaces: 0 };
    const cleanedWorkspaces = await unmaterializeAll(bundle, id);
    const attachments = listAttachments(bundle.db, id);
    let trashedBlobs = 0;
    let trashFailed = 0;
    for (const attachment of attachments) {
      try {
        await rm(path.join(bundle.root, attachment.blobPath), { force: true });
        trashedBlobs += 1;
      } catch {
        trashFailed += 1;
      }
    }
    await rm(path.join(bundle.root, "entities", id), { recursive: true, force: true });
    bundle.db.prepare("UPDATE entities SET deleted_at = ?, updated_at = ? WHERE id = ?").run(Date.now(), Date.now(), id);
    return { trashedBlobs, trashFailed, cleanedWorkspaces };
  }

  /**
   * 工作区里不复制一份附件，只链到资产中心里已经整理好的名字。
   * 这样同一张图被多个工作区引用时，磁盘上仍然只有一份。
   */
  async materialize(id: string, workspacePath: string): Promise<{ workspacePath: string; agentPayload: Record<string, unknown> }> {
    const bundle = this.writeBundle();
    const entity = getEntity(bundle.db, id, false);
    if (!entity) throw new NotFoundException({ code: "entity_not_found", message: `Cannot materialize: entity ${id} not found` });
    const attachments = listAttachments(bundle.db, id);
    const names = materializedNames(attachments);
    const entityDir = path.join(bundle.root, "entities", id);
    await mkdir(entityDir, { recursive: true });
    const keep = new Set<string>();
    for (const attachment of attachments) {
      const name = names.get(attachment.id) ?? attachment.originalFilename;
      keep.add(name);
      await linkAttachment(path.join(bundle.root, attachment.blobPath), path.join(entityDir, name));
    }
    await pruneDir(entityDir, keep);
    const materializePath = path.join(workspacePath, ".hilo", "materialized-entities", id);
    await wireWorkspace(entityDir, materializePath);
    const now = Date.now();
    bundle.db.prepare(`INSERT INTO workspace_entity_refs (workspace_path, entity_id, materialize_path, materialized_at) VALUES (?, ?, ?, ?)
      ON CONFLICT (workspace_path, entity_id) DO UPDATE SET materialize_path = excluded.materialize_path, materialized_at = excluded.materialized_at`).run(workspacePath, id, materializePath, now);
    const counted = bundle.db.prepare("UPDATE entities SET use_count = use_count + 1 WHERE id = ? AND deleted_at IS NULL").run(id);
    if (counted.changes !== 1) throw new NotFoundException({ code: "entity_not_found", message: `Cannot materialize: entity ${id} not found` });
    return {
      workspacePath: materializePath,
      agentPayload: {
        id: entity.id,
        name: entity.name,
        description: entity.description,
        type: entity.type,
        ...(entity.metadata.tags !== undefined ? { tags: entity.metadata.tags } : {}),
        attachments: attachments.map((attachment) => {
          const filename = names.get(attachment.id) ?? attachment.originalFilename;
          return {
            id: attachment.id,
            filename,
            path: path.join(materializePath, filename),
            kind: attachment.kind,
            byteSize: attachment.byteSize,
            ...(attachment.meta.user_desc !== undefined ? { user_desc: attachment.meta.user_desc } : {}),
            ...(attachment.meta.prompt !== undefined ? { prompt: attachment.meta.prompt } : {}),
          };
        }),
      },
    };
  }

  /**
   * 把实体的附件复制进当前工作区并落到画布上。两张及以上围成一组，名字用实体名。
   * 资源库项目没有这块旧画布，直接拒绝，避免把节点写进已经不用的画布文件。
   */
  async dropToCanvas(id: string, input: { position?: { x: number; y: number }; attachmentIds?: string[] }): Promise<{ ok: true; nodeIds: string[]; groupId: string | null }> {
    assertLegacyCanvas(this.paths.root);
    const bundle = this.readBundle();
    const entity = bundle ? getEntity(bundle.db, id, false) : null;
    if (!bundle || !entity) throw new NotFoundException({ code: "entity_not_found", message: `Entity not found: ${id}` });
    const selected = input.attachmentIds?.length ? new Set(input.attachmentIds) : null;
    const attachments = listAttachments(bundle.db, id).filter((attachment) => !selected || selected.has(attachment.id));
    if (attachments.length === 0) return { ok: true, nodeIds: [], groupId: null };
    const nodeIds: string[] = [];
    try {
      const canvas = await this.canvas.getCanvas();
      const firstKind = attachments[0]!.kind === "document" ? "file" : attachments[0]!.kind;
      const base = input.position ?? findFreePosition(canvas, canvas.mode, defaultNodeSize(firstKind));
      let x = attachments.length >= 2 ? base.x + GROUP_PADDING.x : base.x;
      const y = attachments.length >= 2 ? base.y + GROUP_PADDING.top : base.y;
      for (const attachment of attachments) {
        const row = await this.importAttachment(bundle.root, attachment);
        const size = defaultNodeSize(rowType(row));
        nodeIds.push(await this.canvas.addNodeByAsset(row, { position: { x, y } }));
        x += size.width + 100;
      }
    } catch (err) {
      if (nodeIds.length > 0) await this.canvas.deleteNodes(nodeIds).catch(() => undefined);
      throw err;
    }
    const groupId = nodeIds.length >= 2 ? (await this.canvas.group({ nodeIds, label: entity.name })).groupId : null;
    return { ok: true, nodeIds, groupId };
  }

  private async importAttachment(root: string, attachment: AttachmentRecord) {
    const tmpDir = await mkdtemp(path.join(tmpdir(), "ov-drop-entity-"));
    try {
      const tmpPath = path.join(tmpDir, path.basename(attachment.originalFilename) || attachment.id);
      await copyFile(path.join(root, attachment.blobPath), tmpPath);
      const imported = await this.files.importExternal([tmpPath]);
      const assetId = imported.imported[0] && typeof imported.imported[0] === "object" && "id" in imported.imported[0] ? String(imported.imported[0].id) : "";
      if (!assetId) throw new BadRequestException({ code: "invalid_request", message: `Import failed for attachment ${attachment.id}: ${imported.errors?.[0]?.error ?? "no asset returned"}` });
      let row = this.assets.byId(assetId);
      if (!row) throw new NotFoundException({ code: "attachment_file_missing", message: `Vault asset not found after import for ${attachment.id}` });
      const extra: Record<string, unknown> = {};
      if (typeof attachment.meta.prompt === "string") extra.prompt = attachment.meta.prompt;
      if (typeof attachment.meta.user_desc === "string") extra.description = attachment.meta.user_desc;
      if (Object.keys(extra).length > 0) {
        const current = parseObject(row.metadata);
        const updated = this.assets.vault.setMetadata(assetId, { ...current, ...extra });
        if (updated) {
          this.assets.announce(updated, "updated");
          row = updated;
        }
      }
      return row;
    } finally {
      await rm(tmpDir, { recursive: true, force: true });
    }
  }

  async unmaterialize(id: string, workspacePath: string): Promise<void> {
    const bundle = this.readBundle() ?? this.writeBundle();
    await removeMaterializeLink(path.join(workspacePath, ".hilo", "materialized-entities", id));
    bundle.db.prepare("DELETE FROM workspace_entity_refs WHERE workspace_path = ? AND entity_id = ?").run(workspacePath, id);
  }

  async createEntityFromPaths(input: { type?: string; name?: string; description?: string; metadata?: Record<string, unknown>; workspaceRootForVault?: string; files?: Array<{ absolutePath?: string; user_desc?: string }> }): Promise<EntityRecord> {
    if (!input.type || !input.name) throw new BadRequestException({ code: "invalid_request", message: "type and name are required" });
    const type = assertType(input.type);
    if (!input.files || input.files.length === 0) throw new BadRequestException("files must be a non-empty array");
    const bundle = this.writeBundle();
    const vaultRoot = path.resolve(bundle.root);
    const resolved: Array<{ absSrc: string; byteSize: number; originalFilename: string; kind: AttachmentKind; blobPath: string; absBlobPath: string; meta: Record<string, unknown>; attachmentId: string }> = [];
    for (const file of input.files) {
      if (typeof file.absolutePath !== "string" || file.absolutePath.length === 0) throw new BadRequestException("Each files[i].absolutePath must be a non-empty string");
      if (!path.isAbsolute(file.absolutePath)) throw new BadRequestException(`files[i].absolutePath must be absolute: "${file.absolutePath}"`);
      const absSrc = path.resolve(file.absolutePath);
      if (absSrc === vaultRoot || absSrc.startsWith(vaultRoot + path.sep)) throw new BadRequestException(`Source path is inside the asset-center vault: ${file.absolutePath}`);
      let stats;
      try {
        stats = statSync(absSrc);
      } catch (err) {
        throw new BadRequestException(`Source file not found at "${file.absolutePath}": ${err instanceof Error ? err.message : String(err)}`);
      }
      if (!stats.isFile()) throw new BadRequestException(`Source path "${file.absolutePath}" is not a regular file`);
      if (stats.size > FILE_SIZE_CAP) throw new BadRequestException({ code: "file_too_large", message: `File too large: ${(stats.size / 1024 / 1024).toFixed(1)}MB (cap: ${FILE_SIZE_CAP / 1024 / 1024}MB)` });
      const originalFilename = path.basename(absSrc);
      const kind = kindForFilename(originalFilename);
      if (!kind) throw new BadRequestException({ code: "attachment_kind_uninferred", message: `Cannot infer attachment kind from filename "${originalFilename}"; unsupported extension` });
      const format = validateAttachmentFormat(kind, originalFilename);
      if (!format.ok) throw new BadRequestException({ code: "attachment_format_unsupported", message: format.reason });
      const meta: Record<string, unknown> = {};
      if (file.user_desc) meta.user_desc = file.user_desc;
      const prompt = promptFromVault(this.assets, input.workspaceRootForVault, absSrc);
      if (prompt) meta.prompt = prompt;
      const attachmentId = randomUUID();
      const ext = extensionOf(originalFilename);
      const blobPath = path.posix.join("attachments", `${attachmentId}.${ext}`);
      resolved.push({ absSrc, byteSize: stats.size, originalFilename, kind, blobPath, absBlobPath: path.join(bundle.root, blobPath), meta, attachmentId });
    }
    const copied: string[] = [];
    try {
      for (const file of resolved) {
        await mkdir(path.dirname(file.absBlobPath), { recursive: true });
        await copyFile(file.absSrc, file.absBlobPath);
        copied.push(file.absBlobPath);
      }
      return bundle.db.transaction(() => {
        const entity = insertEntity(bundle.db, { type, name: input.name!, description: input.description, metadata: input.metadata });
        resolved.forEach((file, index) => {
          bundle.db.prepare("INSERT INTO entity_attachments (id, entity_id, kind, blob_path, original_filename, byte_size, ord, meta_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(file.attachmentId, entity.id, file.kind, file.blobPath, file.originalFilename, file.byteSize, index, JSON.stringify(file.meta));
        });
        return getEntity(bundle.db, entity.id, false)!;
      })();
    } catch (err) {
      await Promise.all(copied.map((file) => unlink(file).catch(() => undefined)));
      throw err;
    }
  }

  /** 把工作区里已经有的文件挂到实体上，原文件留在原地。 */
  async appendFromWorkspace(id: string, input: { absolutePath?: string; workspaceRelPath?: string; user_desc?: string }): Promise<AttachmentRecord> {
    const bundle = this.writeBundle();
    const entity = getEntity(bundle.db, id, false);
    if (!entity) throw new NotFoundException({ code: "entity_not_found", message: `Entity not found: ${id}` });
    const absSrc = this.resolveAttachmentSource(input);
    const vaultRoot = path.resolve(bundle.root);
    if (absSrc === vaultRoot || absSrc.startsWith(vaultRoot + path.sep)) throw new BadRequestException(`Source path is inside the asset-center vault: ${absSrc}`);
    let stats;
    try {
      stats = statSync(absSrc);
    } catch (err) {
      throw new BadRequestException(`Source file not found at "${input.absolutePath ?? input.workspaceRelPath}": ${err instanceof Error ? err.message : String(err)}`);
    }
    if (!stats.isFile()) throw new BadRequestException(`Source path "${input.absolutePath ?? input.workspaceRelPath}" is not a regular file`);
    if (stats.size > FILE_SIZE_CAP) throw new BadRequestException({ code: "file_too_large", message: `File too large: ${(stats.size / 1024 / 1024).toFixed(1)}MB (cap: ${FILE_SIZE_CAP / 1024 / 1024}MB)` });
    const originalFilename = path.basename(absSrc);
    const kind = kindForFilename(originalFilename);
    if (!kind) throw new BadRequestException({ code: "attachment_kind_uninferred", message: `Cannot infer attachment kind from filename "${originalFilename}"; unsupported extension` });
    const format = validateAttachmentFormat(kind, originalFilename);
    if (!format.ok) throw new BadRequestException({ code: "attachment_format_unsupported", message: format.reason });
    const meta: Record<string, unknown> = {};
    if (input.user_desc) meta.user_desc = input.user_desc;
    const prompt = input.workspaceRelPath ? promptFromVault(this.assets, this.paths.root, absSrc) : undefined;
    if (prompt) meta.prompt = prompt;
    const attachmentId = randomUUID();
    const blobPath = path.posix.join("attachments", `${attachmentId}.${extensionOf(originalFilename)}`);
    const absBlob = path.join(bundle.root, blobPath);
    await mkdir(path.dirname(absBlob), { recursive: true });
    await copyFile(absSrc, absBlob);
    try {
      return bundle.db.transaction(() => {
        const ord = listAttachments(bundle.db, id).length;
        bundle.db.prepare("INSERT INTO entity_attachments (id, entity_id, kind, blob_path, original_filename, byte_size, ord, meta_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(attachmentId, id, kind, blobPath, originalFilename, stats.size, ord, JSON.stringify(meta));
        const created = listAttachments(bundle.db, id).find((attachment) => attachment.id === attachmentId);
        if (!created) throw new Error("attachment disappeared after insert");
        return created;
      })();
    } catch (err) {
      await unlink(absBlob).catch(() => undefined);
      throw err;
    }
  }

  search(opts: { q: string; type?: EntityType; limit?: number }): EntitySummary[] {
    return this.listEntities({ q: opts.q, type: opts.type, limit: opts.limit ?? 50, sort: "updated_at" });
  }

  private resolveAttachmentSource(input: { absolutePath?: string; workspaceRelPath?: string }): string {
    if (input.absolutePath) {
      if (!path.isAbsolute(input.absolutePath)) throw new BadRequestException(`Invalid absolutePath: must be absolute`);
      return path.resolve(input.absolutePath);
    }
    if (input.workspaceRelPath) {
      const resolved = this.paths.resolve(input.workspaceRelPath);
      if (!resolved) throw new BadRequestException(`Invalid workspaceRelPath: escapes workspace`);
      return resolved;
    }
    throw new BadRequestException("Either absolutePath or workspaceRelPath is required");
  }

  coverFile(id: string): { absPath: string } {
    const bundle = this.readBundle();
    const entity = bundle ? getEntity(bundle.db, id, false) : null;
    const cover = entity?.metadata.coverBlobPath;
    if (!bundle || !entity || typeof cover !== "string" || !cover) throw new NotFoundException({ code: "attachment_not_found", message: `Entity cover not found: ${id}` });
    const absPath = assertBlobPath(bundle.root, cover);
    if (!existsSync(absPath)) throw new NotFoundException({ code: "attachment_file_missing", message: `Entity cover file not found: ${id}` });
    return { absPath };
  }

  /** 列表卡片按显示宽度要一张缩小的封面，避免把原图整张拉下来。 */
  async coverSized(absPath: string, width: number): Promise<string> {
    const bucket = Math.min(Math.max(Math.round(width), 1), 2048);
    const stamp = statSync(absPath).mtimeMs;
    const key = createHash("sha256").update(`${absPath}:${stamp}:${bucket}`).digest("hex").slice(0, 16);
    const out = path.join(path.dirname(path.dirname(absPath)), ".thumbnails", `${key}.png`);
    if (existsSync(out)) return out;
    await mkdir(path.dirname(out), { recursive: true });
    await sharp(absPath, { failOn: "none" }).rotate().resize({ width: bucket, withoutEnlargement: true }).png().toFile(out);
    return out;
  }

  attachmentBlob(id: string): { absPath: string; filename: string } {
    const bundle = this.readBundle();
    const row = bundle?.db.prepare("SELECT blob_path, original_filename FROM entity_attachments WHERE id = ?").get(id) as { blob_path: string; original_filename: string } | undefined;
    if (!bundle || !row) throw new NotFoundException({ code: "attachment_not_found", message: `Attachment not found: ${id}` });
    return { absPath: assertBlobPath(bundle.root, row.blob_path), filename: row.original_filename };
  }

  private dbFile(): string {
    return path.join(this.root(), "meta", "asset-center.sqlite");
  }

  private readBundle(): Bundle | null {
    if (this.bundle?.root === this.root()) return this.bundle;
    if (!existsSync(this.dbFile())) return null;
    return this.openBundle();
  }

  private writeBundle(): Bundle {
    if (this.bundle?.root === this.root()) return this.bundle;
    mkdirSync(path.dirname(this.dbFile()), { recursive: true });
    return this.openBundle();
  }

  private openBundle(): Bundle {
    this.bundle?.db.close();
    const root = this.root();
    const db = new Database(this.dbFile());
    db.pragma("foreign_keys = ON");
    db.exec(`CREATE TABLE IF NOT EXISTS schema_version (version INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at INTEGER NOT NULL)`);
    const applied = db.prepare("SELECT version FROM schema_version WHERE version = 1").get();
    if (!applied) {
      db.exec(schemaSql());
      db.prepare("INSERT INTO schema_version (version, name, applied_at) VALUES (1, 'initial', ?)").run(Date.now());
    }
    this.bundle = { root, db };
    return this.bundle;
  }
}

function schemaSql(): string {
  const beside = fileURLToPath(new URL("./0001_initial.sql", import.meta.url));
  const fromSource = fileURLToPath(new URL("../../src/asset-center/0001_initial.sql", import.meta.url));
  return readFileSync(existsSync(beside) ? beside : fromSource, "utf8");
}

function listEntities(db: Database.Database, opts: { type?: string; q?: string; limit?: number; sort?: SortMode }): EntitySummary[] {
  const limit = opts.limit ?? 100;
  const orderBy = opts.sort === "use_count" ? "e.use_count DESC, e.updated_at DESC" : "e.updated_at DESC";
  const conds = ["e.deleted_at IS NULL"];
  const params: unknown[] = [];
  if (opts.type) {
    conds.push("e.type = ?");
    params.push(opts.type);
  }
  const thumb = `(SELECT a.id FROM entity_attachments a WHERE a.entity_id = e.id AND a.kind IN ('image', 'video') ORDER BY CASE a.kind WHEN 'image' THEN 0 ELSE 1 END, a.ord ASC LIMIT 1)`;
  const primary = `(SELECT a.kind FROM entity_attachments a WHERE a.entity_id = e.id ORDER BY a.ord ASC LIMIT 1)`;
  const q = opts.q?.trim();
  if (q) {
    conds.push("(e.name LIKE ? OR e.description LIKE ? OR a.original_filename LIKE ?)");
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  params.push(limit);
  const join = q ? "LEFT JOIN entity_attachments a ON a.entity_id = e.id" : "";
  const rows = db.prepare(`SELECT DISTINCT e.id, e.name, e.type, e.description, e.updated_at, e.use_count,
      json_extract(e.metadata_json, '$.coverBlobPath') AS cover_blob_path,
      ${thumb} AS thumb_attachment_id,
      ${primary} AS primary_attachment_kind
    FROM entities e ${join}
    WHERE ${conds.join(" AND ")}
    ORDER BY ${orderBy}
    LIMIT ?`).all(...params) as Array<Record<string, unknown>>;
  return rows.map((row) => {
    const summary: EntitySummary = { id: String(row.id), name: String(row.name), type: String(row.type), description: String(row.description), updatedAt: Number(row.updated_at), useCount: Number(row.use_count) };
    if (typeof row.cover_blob_path === "string" && row.cover_blob_path) summary.coverUrl = `/api/asset-center/entities/${summary.id}/cover?v=${encodeURIComponent(row.cover_blob_path)}`;
    if (typeof row.thumb_attachment_id === "string") summary.thumbnailUrl = `/api/asset-center/attachments/${row.thumb_attachment_id}/blob`;
    if (typeof row.primary_attachment_kind === "string") summary.primaryAttachmentKind = row.primary_attachment_kind;
    return summary;
  });
}

function insertEntity(db: Database.Database, input: { type: string; name: string; description?: string; schema?: Record<string, unknown>; metadata?: Record<string, unknown> }): EntityRecord {
  const id = randomUUID();
  const now = Date.now();
  db.prepare("INSERT INTO entities (id, type, name, description, schema_json, metadata_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(id, input.type, input.name, input.description ?? "", JSON.stringify(input.schema ?? {}), JSON.stringify(input.metadata ?? {}), now, now);
  return getEntity(db, id, false)!;
}

function updateEntityRow(db: Database.Database, id: string, patch: { type?: string; name?: string; description?: string; schema?: Record<string, unknown>; metadata?: Record<string, unknown> }): void {
  const sets: string[] = [];
  const params: unknown[] = [];
  if (patch.type !== undefined) {
    sets.push("type = ?");
    params.push(patch.type);
  }
  if (patch.name !== undefined) {
    sets.push("name = ?");
    params.push(patch.name);
  }
  if (patch.description !== undefined) {
    sets.push("description = ?");
    params.push(patch.description);
  }
  if (patch.schema !== undefined) {
    sets.push("schema_json = ?");
    params.push(JSON.stringify(patch.schema));
  }
  if (patch.metadata !== undefined) {
    sets.push("metadata_json = ?");
    params.push(JSON.stringify(patch.metadata));
  }
  if (sets.length === 0) return;
  sets.push("updated_at = ?");
  params.push(Date.now(), id);
  db.prepare(`UPDATE entities SET ${sets.join(", ")} WHERE id = ?`).run(...params);
}

function getEntity(db: Database.Database, id: string, includeDeleted: boolean): EntityRecord | null {
  const row = db.prepare(`SELECT * FROM entities WHERE id = ?${includeDeleted ? "" : " AND deleted_at IS NULL"}`).get(id) as Record<string, unknown> | undefined;
  if (!row) return null;
  const metadata = parseObject(row.metadata_json);
  const entity: EntityRecord = {
    id: String(row.id),
    type: String(row.type),
    name: String(row.name),
    description: String(row.description),
    schema: parseObject(row.schema_json),
    metadata,
    useCount: Number(row.use_count),
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
    deletedAt: row.deleted_at == null ? null : Number(row.deleted_at),
    recycledAt: row.recycled_at == null ? null : Number(row.recycled_at),
  };
  if (typeof metadata.coverBlobPath === "string" && metadata.coverBlobPath) entity.coverUrl = `/api/asset-center/entities/${entity.id}/cover?v=${encodeURIComponent(metadata.coverBlobPath)}`;
  return entity;
}

function listAttachments(db: Database.Database, entityId: string): AttachmentRecord[] {
  const rows = db.prepare("SELECT * FROM entity_attachments WHERE entity_id = ? ORDER BY ord ASC, id ASC").all(entityId) as Array<Record<string, unknown>>;
  return rows.map((row) => ({
    id: String(row.id),
    entityId: String(row.entity_id),
    kind: String(row.kind),
    blobPath: String(row.blob_path),
    originalFilename: String(row.original_filename),
    byteSize: Number(row.byte_size),
    ord: Number(row.ord),
    meta: parseObject(row.meta_json),
  }));
}

function insertAttachments(db: Database.Database, entityId: string, attachments: Array<{ blobPath: string; kind: string; originalFilename: string; byteSize: number; meta?: Record<string, unknown> }>): void {
  attachments.forEach((attachment, index) => {
    const id = path.basename(attachment.blobPath).replace(/\.[^.]+$/, "") || randomUUID();
    db.prepare("INSERT INTO entity_attachments (id, entity_id, kind, blob_path, original_filename, byte_size, ord, meta_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(id, entityId, attachment.kind, attachment.blobPath, attachment.originalFilename, attachment.byteSize, index, JSON.stringify(attachment.meta ?? {}));
  });
}

function assertType(type: string): EntityType {
  if (!ENTITY_TYPES.includes(type as EntityType)) throw new BadRequestException({ code: "invalid_request", message: `Unknown entity type "${type}"; expected one of: ${ENTITY_TYPES.join(", ")}` });
  return type as EntityType;
}

function assertCover(bundle: Bundle, metadata?: Record<string, unknown>): void {
  const cover = metadata?.coverBlobPath;
  if (typeof cover !== "string" || !cover) return;
  const abs = assertBlobPath(bundle.root, cover);
  if (!existsSync(abs)) throw new BadRequestException({ code: "attachment_file_missing", message: "Entity cover file is missing" });
  const format = validateAttachmentFormat("image", path.basename(cover));
  if (!format.ok) throw new BadRequestException({ code: "attachment_format_unsupported", message: "Entity cover must be an image" });
}

function assertBlob(bundle: Bundle, blobPath: string, kind: string, filename: string): void {
  const abs = assertBlobPath(bundle.root, blobPath);
  if (!existsSync(abs)) throw new BadRequestException({ code: "attachment_file_missing", message: `Blob not found on disk: ${blobPath}` });
  const format = validateAttachmentFormat(kind, filename);
  if (!format.ok) throw new BadRequestException({ code: "attachment_format_unsupported", message: format.reason });
}

function assertBlobPath(root: string, blobPath: string): string {
  if (!blobPath.startsWith("attachments/") || path.isAbsolute(blobPath) || blobPath.includes("\0") || blobPath.split("/").some((part) => part === "." || part === "..")) {
    throw new BadRequestException({ code: "blob_path_invalid", message: `Invalid blob path: ${blobPath}` });
  }
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(root, blobPath);
  if (!resolved.startsWith(`${resolvedRoot}${path.sep}`)) throw new BadRequestException({ code: "blob_path_invalid", message: `Blob path escapes asset center root: ${blobPath}` });
  return resolved;
}

function promptFromVault(assets: AssetsService, workspaceRoot: string | undefined, absSrc: string): string | undefined {
  if (!workspaceRoot) return undefined;
  const root = path.resolve(workspaceRoot);
  if (absSrc !== root && !absSrc.startsWith(root + path.sep)) return undefined;
  const rel = path.relative(root, absSrc).split(path.sep).join("/");
  const raw = assets.byPath(rel)?.metadata;
  if (!raw) return undefined;
  try {
    const metadata = JSON.parse(raw) as { prompt?: unknown };
    return typeof metadata.prompt === "string" ? metadata.prompt : undefined;
  } catch {
    return undefined;
  }
}

function extensionOf(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  return ext.startsWith(".") ? ext.slice(1) : ext;
}

function kindForFilename(filename: string): AttachmentKind | null {
  const ext = extensionOf(filename);
  for (const [kind, extensions] of Object.entries(ATTACHMENT_EXTENSIONS)) {
    if (extensions.includes(ext)) return kind as AttachmentKind;
  }
  return null;
}

function validateAttachmentFormat(kind: string, filename: string): { ok: true } | { ok: false; reason: string } {
  const allowed = ATTACHMENT_EXTENSIONS[kind];
  const ext = extensionOf(filename);
  if (!allowed) return { ok: false, reason: `Unsupported attachment kind "${kind}"` };
  if (!ext || !allowed.includes(ext)) return { ok: false, reason: `attachment "${filename}" extension "${ext}" not allowed for kind=${kind}; allowed: ${allowed.join(", ")}` };
  return { ok: true };
}

async function unmaterializeAll(bundle: Bundle, entityId: string): Promise<number> {
  const refs = bundle.db.prepare("SELECT workspace_path, materialize_path FROM workspace_entity_refs WHERE entity_id = ?").all(entityId) as Array<{ workspace_path: string; materialize_path: string }>;
  for (const ref of refs) {
    await removeMaterializeLink(ref.materialize_path);
    bundle.db.prepare("DELETE FROM workspace_entity_refs WHERE workspace_path = ? AND entity_id = ?").run(ref.workspace_path, entityId);
  }
  return refs.length;
}

async function linkAttachment(poolPath: string, linkPath: string): Promise<void> {
  await unlink(linkPath).catch((err: unknown) => {
    if (codeOf(err) !== "ENOENT") throw err;
  });
  try {
    await link(poolPath, linkPath);
  } catch (err) {
    if (codeOf(err) === "EEXIST") return;
    if (codeOf(err) === "EXDEV") {
      await copyFile(poolPath, linkPath);
      return;
    }
    throw err;
  }
}

async function pruneDir(dir: string, keep: Set<string>): Promise<void> {
  const names = await readdir(dir).catch((err: unknown) => {
    if (codeOf(err) === "ENOENT") return [] as string[];
    throw err;
  });
  for (const name of names) {
    if (!keep.has(name)) await rm(path.join(dir, name), { force: true });
  }
}

async function wireWorkspace(entityDir: string, materializePath: string): Promise<void> {
  await removeMaterializeLink(materializePath);
  await mkdir(path.dirname(materializePath), { recursive: true });
  try {
    await symlink(entityDir, materializePath, "dir");
  } catch {
    await mkdir(materializePath, { recursive: true });
    for (const name of await readdir(entityDir)) {
      const dest = path.join(materializePath, name);
      await unlink(dest).catch(() => undefined);
      try {
        await link(path.join(entityDir, name), dest);
      } catch (err) {
        if (codeOf(err) === "EXDEV") await copyFile(path.join(entityDir, name), dest);
        else if (codeOf(err) !== "EEXIST") throw err;
      }
    }
  }
}

async function removeMaterializeLink(target: string): Promise<void> {
  const stat = await lstat(target).catch((err: unknown) => {
    if (codeOf(err) === "ENOENT") return null;
    throw err;
  });
  if (!stat) return;
  if (stat.isSymbolicLink()) {
    await unlink(target).catch(async (err: unknown) => {
      if (codeOf(err) === "EPERM" || codeOf(err) === "EISDIR") await rm(target, { recursive: false, force: true });
      else throw err;
    });
    return;
  }
  await rm(target, { recursive: true, force: true });
}

function materializedNames(attachments: AttachmentRecord[]): Map<string, string> {
  const used = new Set<string>();
  const names = new Map<string, string>();
  const sorted = attachments.slice().sort((a, b) => a.ord - b.ord || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  for (const attachment of sorted) {
    const base = sanitizeMaterializedName(attachment.originalFilename);
    let candidate = base;
    let key = candidate.toLowerCase();
    if (used.has(key)) {
      const ext = path.extname(base);
      const stem = base.slice(0, base.length - ext.length);
      let n = 2;
      do {
        candidate = `${stem}-${n}${ext}`;
        key = candidate.toLowerCase();
        n += 1;
      } while (used.has(key));
    }
    used.add(key);
    names.set(attachment.id, candidate);
  }
  return names;
}

function sanitizeMaterializedName(name: string): string {
  const cleaned = name.normalize("NFC").replace(/[/\\<>:"|?*\u0000-\u001f]+/g, "_").trim();
  return truncateToBytes(cleaned.length > 0 ? cleaned : "file", 255);
}

function truncateToBytes(value: string, maxBytes: number): string {
  if (Buffer.byteLength(value, "utf8") <= maxBytes) return value;
  let out = "";
  let bytes = 0;
  for (const ch of value) {
    const size = Buffer.byteLength(ch, "utf8");
    if (bytes + size > maxBytes) break;
    out += ch;
    bytes += size;
  }
  return out.length > 0 ? out : "file";
}

function assertLegacyCanvas(workspaceDir: string): void {
  if (process.env.HILO_PROJECT_ARCHITECTURE === "resource_v3") {
    throw new ForbiddenException({ code: "LEGACY_CANVAS_DISABLED", message: "Legacy canvas is not available for this project." });
  }
  if (process.env.HILO_GATEWAY_ROLE === "workspace") return;
  const file = path.join(workspaceDir, ".hilo", "storage.json");
  if (!existsSync(file)) return;
  try {
    const storage = JSON.parse(readFileSync(file, "utf8")) as { preferences?: { projectArchitecture?: unknown } };
    const pin = storage?.preferences?.projectArchitecture;
    if (pin === "resource_v3") throw new ForbiddenException({ code: "LEGACY_CANVAS_DISABLED", message: "Legacy canvas is not available for this project." });
    if (pin !== undefined && pin !== "legacy") throw new ForbiddenException({ code: "PROJECT_ARCHITECTURE_UNSUPPORTED", message: "Project architecture is not supported." });
  } catch (err) {
    if (err instanceof ForbiddenException) throw err;
    throw new ForbiddenException({ code: "PROJECT_ARCHITECTURE_UNSUPPORTED", message: "Project architecture is not supported." });
  }
}

function rowType(row: { path: string }): string {
  const ext = path.extname(row.path).toLowerCase();
  if ([".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(ext)) return "image";
  if ([".mp4", ".webm", ".mov"].includes(ext)) return "video";
  if ([".mp3", ".wav", ".m4a", ".ogg"].includes(ext)) return "audio";
  if ([".txt", ".md"].includes(ext)) return "text";
  return "file";
}

function codeOf(err: unknown): string | undefined {
  return err && typeof err === "object" && "code" in err ? String((err as { code: unknown }).code) : undefined;
}

function parseObject(value: unknown): Record<string, unknown> {
  if (typeof value !== "string" || !value) return {};
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}
