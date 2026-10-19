import { BadRequestException, ConflictException, Controller, Delete, Get, Inject, Injectable, Logger, Param, Post, Body, Query } from "@nestjs/common";

import { AssetsService } from "../common/assets.service.js";

const ROLE_LIST = [
  ["source", "Source", "Primary derivation input."],
  ["init_image", "Init Image", "Starting image for img2img."],
  ["style", "Style", "Style reference."],
  ["subject", "Subject", "Subject identity reference."],
  ["mask", "Mask", "Region mask."],
  ["pose", "Pose", "Pose reference."],
  ["depth", "Depth", "Depth-map reference."],
  ["audio_track", "Audio Track", "Audio track input."],
  ["subtitle", "Subtitle", "Subtitle track."],
  ["frame", "Frame", "Specific video frame."],
  ["reference", "Reference", "Generic reference."],
] as const;

@Injectable()
export class DependenciesService {
  private readonly log = new Logger("Dependencies");
  private seeded = false;

  constructor(@Inject(AssetsService) private readonly assets: AssetsService) {}

  upstream(assetId: string, depth?: string) {
    const capped = clampDepth(depth);
    const rows = this.db().prepare(`${upstreamSql} ORDER BY u.depth ASC, u.input_index ASC NULLS LAST, u.dep_id ASC`).all(assetId, capped) as DepRow[];
    return { asset_id: assetId, depth: capped, nodes: rows.map(toNode) };
  }

  downstream(assetId: string, depth?: string) {
    const capped = clampDepth(depth);
    const rows = this.db().prepare(`${downstreamSql} ORDER BY d.depth ASC, d.input_index ASC NULLS LAST, d.dep_id ASC`).all(assetId, capped) as DepRow[];
    return { asset_id: assetId, depth: capped, nodes: rows.map(toNode) };
  }

  inputs(assetId: string) {
    const rows = this.db().prepare(`SELECT d.id, d.parent_id, d.parent_attachment_id, d.child_id, d.role, d.input_index, d.operation, d.metadata, d.created_at,
      a.path AS parent_path, a.name AS parent_name, a.status AS parent_status
      FROM asset_dependencies d LEFT JOIN assets a ON d.parent_id = a.id
      WHERE d.child_id = ? ORDER BY d.input_index ASC NULLS LAST, d.id ASC`).all(assetId) as DepRow[];
    return { asset_id: assetId, inputs: rows.map(toNode) };
  }

  add(body: { child_id?: string; parent_id?: string | null; role?: string; input_index?: number; operation?: string; metadata?: Record<string, unknown> }) {
    if (!body.child_id) throw new BadRequestException("child_id is required");
    if (!body.role || !ROLE_LIST.some(([role]) => role === body.role)) throw new BadRequestException("invalid role");
    if (body.parent_id && body.parent_id === body.child_id) throw new BadRequestException(`dependency self-reference rejected: child_id and parent_id are both ${body.child_id}`);
    try {
      const result = this.db().prepare(`INSERT INTO asset_dependencies
        (child_id, parent_id, parent_attachment_id, role, input_index, operation, metadata, created_at)
        VALUES (?, ?, NULL, ?, ?, ?, ?, ?)`).run(
        body.child_id,
        body.parent_id ?? null,
        body.role,
        body.input_index ?? null,
        body.operation ?? null,
        body.metadata && Object.keys(body.metadata).length ? JSON.stringify(body.metadata) : null,
        Date.now(),
      );
      return { id: Number(result.lastInsertRowid) };
    } catch (error) {
      const code = (error as { code?: string }).code;
      this.log.warn(`Dependency insert rejected (${code}): ${error instanceof Error ? error.message : String(error)}`);
      if (code === "SQLITE_CONSTRAINT_UNIQUE") throw new ConflictException("this dependency edge already exists");
      if (code === "SQLITE_CONSTRAINT_FOREIGNKEY") throw new BadRequestException("referenced asset does not exist");
      if (code === "SQLITE_CONSTRAINT_CHECK") throw new BadRequestException("invalid role");
      throw new BadRequestException("dependency insert rejected");
    }
  }

  remove(id: string) {
    const numeric = Number(id);
    const result = this.db().prepare("DELETE FROM asset_dependencies WHERE id=?").run(numeric);
    return { ok: true, deleted: result.changes > 0 };
  }

  private db() {
    const database = this.assets.vault.db;
    if (!this.seeded) {
      const now = Date.now();
      const upsert = database.prepare("INSERT OR IGNORE INTO asset_role_defs(role, display_name, description, deprecated, created_at) VALUES(?,?,?,0,?)");
      for (const [role, name, description] of ROLE_LIST) upsert.run(role, name, description, now);
      this.seeded = true;
    }
    return database;
  }
}

const upstreamSql = `WITH RECURSIVE upstream(dep_id, parent_id, parent_attachment_id, child_id, role, input_index, operation, metadata, depth) AS (
  SELECT id, parent_id, parent_attachment_id, child_id, role, input_index, operation, metadata, 1 FROM asset_dependencies WHERE child_id = ?
  UNION ALL
  SELECT d.id, d.parent_id, d.parent_attachment_id, d.child_id, d.role, d.input_index, d.operation, d.metadata, u.depth + 1
  FROM asset_dependencies d JOIN upstream u ON d.child_id = u.parent_id
  WHERE u.depth < ? AND u.parent_id IS NOT NULL
) SELECT u.dep_id AS id, u.parent_id, u.parent_attachment_id, u.child_id, u.role, u.input_index, u.operation, u.metadata, u.depth,
  a.path AS parent_path, a.name AS parent_name, a.status AS parent_status
  FROM upstream u LEFT JOIN assets a ON u.parent_id = a.id`;

const downstreamSql = `WITH RECURSIVE downstream(dep_id, parent_id, parent_attachment_id, child_id, role, input_index, operation, metadata, depth) AS (
  SELECT id, parent_id, parent_attachment_id, child_id, role, input_index, operation, metadata, 1 FROM asset_dependencies WHERE parent_id = ?
  UNION ALL
  SELECT d.id, d.parent_id, d.parent_attachment_id, d.child_id, d.role, d.input_index, d.operation, d.metadata, ds.depth + 1
  FROM asset_dependencies d JOIN downstream ds ON d.parent_id = ds.child_id
  WHERE ds.depth < ?
) SELECT d.dep_id AS id, d.parent_id, d.parent_attachment_id, d.child_id, d.role, d.input_index, d.operation, d.metadata, d.depth,
  a.path AS parent_path, a.name AS parent_name, a.status AS parent_status
  FROM downstream d LEFT JOIN assets a ON d.child_id = a.id`;

type DepRow = {
  id: number;
  parent_id: string | null;
  parent_attachment_id: string | null;
  child_id: string;
  role: string;
  input_index: number | null;
  operation: string | null;
  metadata: string | null;
  depth?: number;
  created_at?: number;
  parent_path: string | null;
  parent_name: string | null;
  parent_status: string | null;
};

function toNode(row: DepRow) {
  let metadata: unknown = null;
  if (row.metadata) {
    try {
      metadata = JSON.parse(row.metadata);
    } catch {
      metadata = null;
    }
  }
  return {
    id: row.id,
    parent_id: row.parent_id,
    parent_attachment_id: row.parent_attachment_id,
    child_id: row.child_id,
    role: row.role,
    ...(row.input_index === null ? {} : { input_index: row.input_index }),
    ...(row.operation === null ? {} : { operation: row.operation }),
    metadata,
    ...(row.depth === undefined ? {} : { depth: row.depth }),
    ...(row.created_at === undefined ? {} : { created_at: row.created_at }),
    parent_path: row.parent_path,
    parent_name: row.parent_name,
    parent_status: row.parent_status,
  };
}

function clampDepth(depth?: string): number {
  const raw = depth === undefined ? 5 : Number(depth);
  if (!Number.isFinite(raw)) return 5;
  return Math.max(1, Math.min(Math.floor(raw), 50));
}

@Controller("api/dependencies")
export class DependenciesController {
  constructor(@Inject(DependenciesService) private readonly deps: DependenciesService) {}

  @Get(":assetId/upstream")
  upstream(@Param("assetId") assetId: string, @Query("depth") depth?: string) {
    if (!assetId) throw new BadRequestException("assetId path param is required");
    return this.deps.upstream(assetId, depth);
  }

  @Get(":assetId/downstream")
  downstream(@Param("assetId") assetId: string, @Query("depth") depth?: string) {
    if (!assetId) throw new BadRequestException("assetId path param is required");
    return this.deps.downstream(assetId, depth);
  }

  @Get(":assetId/inputs")
  inputs(@Param("assetId") assetId: string) {
    if (!assetId) throw new BadRequestException("assetId path param is required");
    return this.deps.inputs(assetId);
  }

  @Post()
  add(@Body() body: { child_id?: string; parent_id?: string | null; role?: string; input_index?: number; operation?: string; metadata?: Record<string, unknown> }) {
    return this.deps.add(body);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.deps.remove(id);
  }
}
