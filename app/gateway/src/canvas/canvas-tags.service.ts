import { readFile } from "node:fs/promises";
import path from "node:path";

import { BadRequestException, ConflictException, Injectable, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { type AssetRow, toAssetInfo } from "@ov/assets";

import { AssetChangeLog } from "../common/asset-change-log.js";
import { AssetsService } from "../common/assets.service.js";
import { GatewayEventBus } from "../common/gateway-event-bus.js";
import { WorkspacePathService } from "../common/workspace-path.service.js";
import { GatewayConfig } from "../config/gateway-config.js";
import {
  CANVAS_TAG_REGISTRY_VERSION,
  type CanvasTag,
  type CanvasTagRegistry,
  getCanvasTagKnownNames,
  isCanvasColorTag,
  isCanvasTagColor,
  isLegacyRegistryPayload,
  isValidCanvasTagOrder,
  MAX_CANVAS_TAG_ASSIGNMENTS_PER_BATCH,
  mutateCanvasAssetTagIds,
  normalizeTagRegistry,
  orderCanvasTagsByDefaultColor,
  seedTagRegistry,
  validateAssetTagIds,
  validateCanvasTagName,
} from "./canvas-tags.js";

const TAG_REGISTRY_META_KEY = "canvas_tag_registry.v2";
const REVISION_CONFLICT_CODE = "CANVAS_TAG_REVISION_CONFLICT";
const DUPLICATE_NAME_CODE = "CANVAS_TAG_DUPLICATE_NAME";

type Metadata = Record<string, unknown>;

function parseMetadata(raw: string | null | undefined): Metadata | null {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function tagIdsOf(metadata: Metadata): string[] {
  return Array.isArray(metadata.tagIds) ? metadata.tagIds.filter((id): id is string => typeof id === "string") : [];
}

function setTagIds(metadata: Metadata, tagIds: string[]): string {
  if (tagIds.length === 0) delete metadata.tagIds;
  else metadata.tagIds = tagIds;
  return JSON.stringify(metadata);
}

/**
 * 工作区的画布标签：标签表存在资产库的 `workspace_meta` 里（跟着工作区走），素材上的标签存在各自的 metadata。
 *
 * 所有改动都在一个 SQLite 事务里读-校验-写：标签表带 revision，两个窗口同时改时后到的拿 409 重来，
 * 而不是悄悄覆盖掉前一个的改动。改完广播标签表 / 素材变更，别的窗口跟着刷新。
 *
 * 第一次读时如果库里还没有标签表，从数据根下的旧版全局标签文件迁移一份，没有就用预置的 7 个颜色标签。
 */
@Injectable()
export class CanvasTagsService {
  constructor(
    private readonly assets: AssetsService,
    private readonly changes: AssetChangeLog,
    private readonly bus: GatewayEventBus,
    private readonly paths: WorkspacePathService,
    private readonly config: GatewayConfig,
  ) {}

  private get db() {
    return this.assets.vault.db;
  }

  async getRegistry(): Promise<CanvasTagRegistry> {
    const persisted = this.readMeta();
    if (persisted !== undefined) return this.parsePersisted(persisted);
    const migrated = await this.readLegacyRegistry();
    // OR IGNORE：两个请求同时走到这里时，先写入的那份算数。
    this.db.prepare("INSERT OR IGNORE INTO workspace_meta (key, value) VALUES (?, ?)").run(TAG_REGISTRY_META_KEY, JSON.stringify(migrated));
    return this.readRegistry();
  }

  async createTag(req: { name: string; kind: string; revision: number }) {
    return this.mutateRegistry((registry) => {
      this.assertRevision(registry, req.revision);
      const name = this.validateName(req.name);
      this.assertUniqueName(registry, name);
      if (req.kind !== "keyword") throw new BadRequestException("Only keyword tags can be created");
      const tag: CanvasTag = { id: `keyword:${crypto.randomUUID()}`, kind: "keyword", name };
      const tags = [...registry.tags, tag];
      return { tags: registry.orderMode === "default" ? orderCanvasTagsByDefaultColor(tags) : tags, tag };
    });
  }

  async updateTag(id: string, req: { name?: string; color?: string; revision: number }) {
    return this.mutateRegistry((registry) => {
      this.assertRevision(registry, req.revision);
      const current = registry.tags.find((t) => t.id === id);
      if (!current) throw new NotFoundException(`Canvas tag not found: ${id}`);
      if (req.name === undefined && req.color === undefined) throw new BadRequestException("At least one canvas tag field is required");
      const name = req.name === undefined ? current.name : this.validateName(req.name);
      if (req.name !== undefined) this.assertUniqueName(registry, name!, id);
      if (req.color !== undefined && !isCanvasColorTag(current)) throw new BadRequestException("Keyword tags do not have a canvas color");
      const color = req.color ?? current.color;
      if (current.kind === "color" && (typeof color !== "string" || !isCanvasTagColor(color))) throw new BadRequestException("Unsupported canvas tag color");
      // 改了名就不再用翻译名：legacyNameKey 只在用户从没改过名时生效。
      const legacyNameKey = req.name === undefined ? current.legacyNameKey : undefined;
      const tag: CanvasTag = current.kind === "color" ? { ...current, name, color, legacyNameKey } : { ...current, kind: "keyword", name, color: undefined, legacyNameKey };
      const tags = registry.tags.map((t) => (t.id === id ? tag : t));
      return { tags: registry.orderMode === "default" ? orderCanvasTagsByDefaultColor(tags) : tags, tag };
    });
  }

  async reorderTags(req: { tagIds: string[]; revision: number }): Promise<CanvasTagRegistry> {
    await this.getRegistry();
    const next = this.db.transaction(() => {
      const registry = this.readRegistry();
      this.assertRevision(registry, req.revision);
      if (!isValidCanvasTagOrder(req.tagIds, registry)) throw new BadRequestException("Tag order must contain every current tag exactly once");
      const byId = new Map(registry.tags.map((t) => [t.id, t]));
      const next: CanvasTagRegistry = { ...registry, revision: registry.revision + 1, orderMode: "custom", tags: req.tagIds.map((id) => byId.get(id)!) };
      this.writeRegistry(next);
      return next;
    })();
    this.emitRegistry(next);
    return next;
  }

  async updateAssetTags(id: string, tagIds: string[]) {
    const result = await this.updateAssetTagsBatch({ assignments: [{ assetId: id, tagIds }] });
    return { ok: true, tagIds: result.updatedAssets[0]?.tagIds ?? [] };
  }

  async updateAssetTagsBatch(req: { assignments: { assetId: string; tagIds: string[] }[] }) {
    await this.getRegistry();
    const result = this.db.transaction(() => {
      if (req.assignments.length === 0) throw new BadRequestException("At least one asset tag assignment is required");
      if (req.assignments.length > MAX_CANVAS_TAG_ASSIGNMENTS_PER_BATCH) throw new BadRequestException(`At most ${MAX_CANVAS_TAG_ASSIGNMENTS_PER_BATCH} asset tag assignments allowed`);
      const registry = this.readRegistry();
      const seen = new Set<string>();
      const pending: { row: AssetRow; metadata: Metadata; tagIds: string[] }[] = [];
      for (const a of req.assignments) {
        const assetId = a.assetId.trim();
        if (!assetId) throw new BadRequestException("Asset id is required");
        if (seen.has(assetId)) throw new BadRequestException(`Duplicate asset id: ${assetId}`);
        seen.add(assetId);
        const invalid = validateAssetTagIds(a.tagIds, registry);
        if (invalid?.code === "unknown-tag") throw new BadRequestException(`Unknown tag id: ${invalid.tagId}`);
        if (invalid?.code === "duplicate-tag") throw new BadRequestException(`Duplicate tag id: ${invalid.tagId}`);
        if (invalid?.code === "color-limit") throw new BadRequestException(`At most ${invalid.limit} color tag assignment allowed per asset`);
        const { row, metadata } = this.loadAsset(assetId);
        pending.push({ row, metadata, tagIds: [...a.tagIds] });
      }
      const update = this.db.prepare("UPDATE assets SET metadata = ?, updated_at = ? WHERE id = ?");
      const now = Date.now();
      for (const p of pending) update.run(setTagIds(p.metadata, p.tagIds), now, p.row.id);
      return pending.map((p) => ({ id: p.row.id, tagIds: p.tagIds }));
    })();
    this.emitAssetsUpdated(result.map((a) => a.id));
    return { ok: true, updatedAssets: result };
  }

  async mutateAssetTagsBatch(req: { assetIds: string[]; tagId: string; operation: "assign" | "remove" }) {
    await this.getRegistry();
    const result = this.db.transaction(() => {
      if (req.assetIds.length === 0) throw new BadRequestException("At least one asset id is required");
      if (req.assetIds.length > MAX_CANVAS_TAG_ASSIGNMENTS_PER_BATCH) throw new BadRequestException(`At most ${MAX_CANVAS_TAG_ASSIGNMENTS_PER_BATCH} asset ids allowed`);
      const registry = this.readRegistry();
      const tag = this.assertTagExists(registry, req.tagId);
      const seen = new Set<string>();
      const pending: { id: string; metadata: Metadata; current: string[]; tagIds: string[] }[] = [];
      for (const raw of req.assetIds) {
        const assetId = raw.trim();
        if (!assetId) throw new BadRequestException("Asset id is required");
        if (seen.has(assetId)) throw new BadRequestException(`Duplicate asset id: ${assetId}`);
        seen.add(assetId);
        const { metadata } = this.loadAsset(assetId);
        const current = tagIdsOf(metadata);
        pending.push({ id: assetId, metadata, current, tagIds: mutateCanvasAssetTagIds(current, tag, registry, req.operation) });
      }
      const update = this.db.prepare("UPDATE assets SET metadata = ?, updated_at = ? WHERE id = ?");
      const now = Date.now();
      const changed: string[] = [];
      for (const p of pending) {
        if (p.tagIds.length === p.current.length && p.tagIds.every((id, i) => id === p.current[i])) continue;
        update.run(setTagIds(p.metadata, p.tagIds), now, p.id);
        changed.push(p.id);
      }
      return { updatedAssets: pending.map((p) => ({ id: p.id, tagIds: p.tagIds })), changed };
    })();
    this.emitAssetsUpdated(result.changed);
    return { ok: true, updatedAssets: result.updatedAssets };
  }

  async getTaggedAssetIds(tagId: string): Promise<string[]> {
    this.assertTagExists(await this.getRegistry(), tagId);
    return this.findTaggedRows(tagId).map((r) => r.id);
  }

  async deleteTag(tagId: string, revision: number) {
    await this.getRegistry();
    const result = this.db.transaction(() => {
      const registry = this.readRegistry();
      this.assertRevision(registry, revision);
      const tag = this.assertTagExists(registry, tagId);
      if (tag.kind === "color") throw new BadRequestException("Canvas color labels are fixed and cannot be deleted");
      const update = this.db.prepare("UPDATE assets SET metadata = ?, updated_at = ? WHERE id = ?");
      const now = Date.now();
      const updatedAssets: { id: string; tagIds: string[] }[] = [];
      for (const row of this.findTaggedRows(tagId)) {
        const metadata = parseMetadata(row.metadata);
        if (!metadata) continue;
        const tagIds = tagIdsOf(metadata).filter((id) => id !== tagId);
        update.run(setTagIds(metadata, tagIds), now, row.id);
        updatedAssets.push({ id: row.id, tagIds });
      }
      const next: CanvasTagRegistry = { ...registry, revision: registry.revision + 1, tags: registry.tags.filter((t) => t.id !== tag.id) };
      this.writeRegistry(next);
      return { registry: next, affectedAssetIds: updatedAssets.map((a) => a.id), updatedAssets };
    })();
    this.emitRegistry(result.registry);
    this.emitAssetsUpdated(result.affectedAssetIds);
    return result;
  }

  private async mutateRegistry(change: (r: CanvasTagRegistry) => { tags: CanvasTag[]; tag: CanvasTag }) {
    await this.getRegistry();
    const result = this.db.transaction(() => {
      const registry = this.readRegistry();
      const changed = change(registry);
      const next: CanvasTagRegistry = { ...registry, revision: registry.revision + 1, tags: changed.tags };
      this.writeRegistry(next);
      return { registry: next, tag: changed.tag };
    })();
    this.emitRegistry(result.registry);
    return result;
  }

  private readMeta(): string | undefined {
    return (this.db.prepare("SELECT value FROM workspace_meta WHERE key = ?").get(TAG_REGISTRY_META_KEY) as { value: string } | undefined)?.value;
  }

  private readRegistry(): CanvasTagRegistry {
    const raw = this.readMeta();
    if (raw === undefined) throw new InternalServerErrorException("Canvas tag registry is not initialized");
    return this.parsePersisted(raw);
  }

  /** 库里的标签表按严格规则读：有任何一个标签在校正时被丢掉，说明数据写坏了，报错而不是悄悄少几个标签。 */
  private parsePersisted(raw: string): CanvasTagRegistry {
    try {
      const parsed = JSON.parse(raw);
      if (parsed.version !== CANVAS_TAG_REGISTRY_VERSION || !Array.isArray(parsed.tags) || !Number.isSafeInteger(parsed.revision) || parsed.revision < 0) {
        throw new Error("Unsupported registry shape");
      }
      const normalized = normalizeTagRegistry(parsed);
      const ids = new Set(normalized.tags.map((t) => t.id));
      const sourceIds = new Set<string>();
      const invalid = (parsed.tags as unknown[]).some((c) => {
        if (!c || typeof c !== "object" || Array.isArray(c)) return true;
        const id = (c as { id?: unknown }).id;
        if (typeof id !== "string" || !id.trim() || sourceIds.has(id.trim())) return true;
        sourceIds.add(id.trim());
        return !ids.has(id.trim());
      });
      if (invalid) throw new Error("Invalid tag definition");
      return normalized;
    } catch (cause) {
      throw new InternalServerErrorException("Canvas tag registry is corrupted", { cause });
    }
  }

  private writeRegistry(registry: CanvasTagRegistry): void {
    this.db
      .prepare("INSERT INTO workspace_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
      .run(TAG_REGISTRY_META_KEY, JSON.stringify(registry));
  }

  /** 旧版把标签表存在数据根下的一个全局文件里；没有这个文件就是全新用户，用预置表。 */
  private async readLegacyRegistry(): Promise<CanvasTagRegistry> {
    let raw: string;
    try {
      raw = await readFile(path.join(this.config.hubDir, "canvas", "tag-registry.json"), "utf8");
    } catch (err) {
      if ((err as NodeJS.ErrnoException)?.code === "ENOENT") return seedTagRegistry();
      throw new InternalServerErrorException("Legacy canvas tag registry could not be read", { cause: err });
    }
    try {
      const parsed = JSON.parse(raw);
      if (!isLegacyRegistryPayload(parsed)) throw new Error("Unsupported legacy registry shape");
      return normalizeTagRegistry(parsed);
    } catch (cause) {
      throw new InternalServerErrorException("Legacy canvas tag registry is corrupted", { cause });
    }
  }

  private validateName(value: string): string {
    const name = value.trim();
    const invalid = validateCanvasTagName(name);
    if (invalid === "required") throw new BadRequestException("Canvas tag name is required");
    if (invalid === "too-long") throw new BadRequestException("Canvas tag name must contain at most 12 characters");
    return name;
  }

  private assertUniqueName(registry: CanvasTagRegistry, name: string, excludeId?: string): void {
    const dup = registry.tags.find((t) => t.id !== excludeId && getCanvasTagKnownNames(t).includes(name));
    if (dup) throw new ConflictException({ code: DUPLICATE_NAME_CODE, message: "A canvas tag with this name already exists", tagId: dup.id });
  }

  private assertRevision(registry: CanvasTagRegistry, revision: number): void {
    if (registry.revision === revision) return;
    throw new ConflictException({ code: REVISION_CONFLICT_CODE, message: "Canvas tag registry changed; refresh and retry", revision: registry.revision });
  }

  private assertTagExists(registry: CanvasTagRegistry, tagId: string): CanvasTag {
    const tag = registry.tags.find((t) => t.id === tagId);
    if (!tag) throw new NotFoundException(`Canvas tag not found: ${tagId}`);
    return tag;
  }

  private loadAsset(assetId: string): { row: AssetRow; metadata: Metadata } {
    const row = this.db.prepare("SELECT * FROM assets WHERE id = ?").get(assetId) as AssetRow | undefined;
    if (!row) throw new NotFoundException(`Asset not found: ${assetId}`);
    const metadata = parseMetadata(row.metadata);
    if (!metadata) throw new InternalServerErrorException(`Invalid asset metadata: ${assetId}`);
    return { row, metadata };
  }

  private findTaggedRows(tagId: string): AssetRow[] {
    return (this.db.prepare("SELECT * FROM assets WHERE metadata IS NOT NULL").all() as AssetRow[]).filter((row) => {
      const metadata = parseMetadata(row.metadata);
      return metadata ? tagIdsOf(metadata).includes(tagId) : false;
    });
  }

  private emitRegistry(registry: CanvasTagRegistry): void {
    this.bus.emit("canvas-tags:registry-changed", { type: "canvas_tag_registry_changed", registry });
  }

  private emitAssetsUpdated(ids: string[]): void {
    const rows = ids.map((id) => this.assets.byId(id)).filter((r): r is AssetRow => r !== undefined);
    this.changes.emitBatch(
      this.paths.root,
      rows.map((row) => ({ id: row.id, change: "updated" as const, asset: toAssetInfo(row), path: row.path })),
    );
  }
}
