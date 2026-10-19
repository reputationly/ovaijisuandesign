import { BadRequestException, Body, Controller, Delete, Get, Module, Param, Patch, Post, Query, Res } from "@nestjs/common";
import type { Response } from "express";

import { FilesModule } from "../files/files.module.js";
import { AssetCenterService } from "./asset-center.service.js";

const ENTITY_TYPES = ["character", "scene", "style_pack", "prop", "custom"];
const ENTITY_SORT_MODES = ["updated_at", "use_count"];

/**
 * 资产中心放在应用数据根下的 SQLite 里，跨工作区保存角色、场景和风格。
 * 库文件在第一次写入时才建；没建库时列表是空的，library-status 用来区分「没用过」。
 */
@Controller("api/asset-center")
export class AssetCenterController {
  constructor(private readonly center: AssetCenterService) {}

  @Get("entities")
  listEntities(@Query("type") type?: string, @Query("q") q?: string, @Query("limit") limit?: string, @Query("sort") sort?: string) {
    return { entities: this.center.listEntities({ type: parseType(type), q, limit: parseLimit(limit), sort: parseSort(sort) }) };
  }

  @Get("search")
  search(@Query("q") q?: string, @Query("type") type?: string, @Query("limit") limit?: string) {
    if (!q) throw new BadRequestException({ code: "invalid_request", message: "q is required" });
    return { entities: this.center.search({ q, type: parseType(type), limit: parseLimit(limit) }) };
  }

  @Get("library-status")
  libraryStatus() {
    return this.center.libraryStatus();
  }

  @Get("workspace-refs")
  workspaceRefs(@Query("workspace") workspace?: string) {
    if (!workspace) throw new BadRequestException({ code: "invalid_request", message: "workspace query param is required" });
    if (!pathIsAbsolute(workspace)) throw new BadRequestException({ code: "invalid_request", message: "workspace must be an absolute path" });
    return {
      refs: this.center.listWorkspaceRefs(workspace).map((row) => ({
        workspacePath: row.workspace_path,
        entityId: row.entity_id,
        materializePath: row.materialize_path,
        materializedAt: row.materialized_at,
      })),
    };
  }

  @Post("entities")
  createEntity(@Body() body: { type?: string; name?: string; description?: string; schema?: Record<string, unknown>; metadata?: Record<string, unknown>; attachments?: Array<{ blobPath: string; kind: "image" | "video" | "audio" | "text" | "document"; originalFilename: string; byteSize: number; meta?: Record<string, unknown> }> }) {
    if (!body?.type || !body.name) throw new BadRequestException({ code: "invalid_request", message: "type and name are required" });
    return { entity: this.center.createEntity({ type: body.type, name: body.name, description: body.description, schema: body.schema, metadata: body.metadata, attachments: body.attachments }) };
  }

  @Post("entities-from-paths")
  async createEntityFromPaths(@Body() body: { type?: string; name?: string; description?: string; metadata?: Record<string, unknown>; workspaceRootForVault?: string; files?: Array<{ absolutePath?: string; user_desc?: string }> }) {
    return { entity: await this.center.createEntityFromPaths(body ?? {}) };
  }

  @Get("entities/:eid")
  getEntity(@Param("eid") id: string, @Query("fields") fields?: string) {
    return { entity: this.center.getEntity(id, fields) };
  }

  @Patch("entities/:eid")
  updateEntity(@Param("eid") id: string, @Body() body: { type?: string; name?: string; description?: string; schema?: Record<string, unknown>; metadata?: Record<string, unknown> }) {
    return { entity: this.center.updateEntity(id, body ?? {}) };
  }

  @Delete("entities/:eid")
  deleteEntity(@Param("eid") id: string) {
    return this.center.deleteEntity(id);
  }

  @Post("entities/:eid/attachments-from-workspace")
  async appendFromWorkspace(@Param("eid") id: string, @Body() body: { absolutePath?: string; workspaceRelPath?: string; user_desc?: string }) {
    return { attachment: await this.center.appendFromWorkspace(id, body ?? {}) };
  }

  @Post("entities/:eid/materialize")
  materialize(@Param("eid") id: string, @Body() body: { workspacePath?: string }) {
    if (!body?.workspacePath) throw new BadRequestException({ code: "invalid_request", message: "workspacePath is required" });
    if (!pathIsAbsolute(body.workspacePath)) throw new BadRequestException({ code: "invalid_request", message: "workspacePath must be an absolute path" });
    return this.center.materialize(id, body.workspacePath);
  }

  @Post("entities/:eid/drop-to-canvas")
  dropToCanvas(@Param("eid") id: string, @Body() body: { position?: { x?: unknown; y?: unknown }; attachmentIds?: string[] }) {
    const position = parsePosition(body?.position);
    return this.center.dropToCanvas(id, { position, attachmentIds: body?.attachmentIds });
  }

  @Delete("entities/:eid/materialize")
  async unmaterialize(@Param("eid") id: string, @Query("workspace") workspace?: string) {
    if (!workspace) throw new BadRequestException({ code: "invalid_request", message: "workspace query param is required" });
    if (!pathIsAbsolute(workspace)) throw new BadRequestException({ code: "invalid_request", message: "workspace must be an absolute path" });
    await this.center.unmaterialize(id, workspace);
    return { ok: true };
  }

  @Get("entities/:eid/cover")
  async cover(@Param("eid") id: string, @Query("w") width: string | undefined, @Res() res: Response) {
    const file = this.center.coverFile(id);
    const parsed = width === undefined ? Number.NaN : Number.parseInt(width, 10);
    const abs = Number.isFinite(parsed) && parsed > 0 ? await this.center.coverSized(file.absPath, parsed) : file.absPath;
    res.sendFile(abs, { dotfiles: "allow" });
  }

  @Get("attachments/:aid/blob")
  attachmentBlob(@Param("aid") id: string, @Res() res: Response) {
    const blob = this.center.attachmentBlob(id);
    res.sendFile(blob.absPath, { dotfiles: "allow" });
  }
}

function pathIsAbsolute(value: string): boolean {
  return value.startsWith("/") || /^[A-Za-z]:[\\/]/.test(value);
}

function parseType(type: string | undefined) {
  if (type === undefined) return undefined;
  if (!ENTITY_TYPES.includes(type)) throw new BadRequestException({ code: "invalid_request", message: `Unknown entity type "${type}"; expected one of: ${ENTITY_TYPES.join(", ")}` });
  return type as "character";
}

function parseLimit(limit: string | undefined): number | undefined {
  if (limit === undefined) return undefined;
  const n = Number.parseInt(limit, 10);
  if (!Number.isFinite(n) || n <= 0) throw new BadRequestException({ code: "invalid_request", message: `Invalid limit: ${limit}` });
  return n;
}

function parseSort(sort: string | undefined) {
  if (sort === undefined) return undefined;
  if (!ENTITY_SORT_MODES.includes(sort)) throw new BadRequestException({ code: "invalid_request", message: `Unknown sort mode "${sort}"; expected one of: ${ENTITY_SORT_MODES.join(", ")}` });
  return sort as "updated_at";
}

function parsePosition(position: { x?: unknown; y?: unknown } | undefined): { x: number; y: number } | undefined {
  if (!position) return undefined;
  if (typeof position.x !== "number" || typeof position.y !== "number" || !Number.isFinite(position.x) || !Number.isFinite(position.y)) {
    throw new BadRequestException({ code: "invalid_request", message: "position.x and position.y must be finite numbers" });
  }
  return { x: position.x, y: position.y };
}

@Module({ imports: [FilesModule], controllers: [AssetCenterController], providers: [AssetCenterService] })
export class AssetCenterModule {}
