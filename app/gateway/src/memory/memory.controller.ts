import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Param, Post, Query } from "@nestjs/common";
import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

import { ASSET_MODALITIES, type AssetModality, MAX_MEMORY_BODY_BYTES, MAX_MEMORY_DESCRIPTION_LENGTH, MEMORY_TYPES, type MemoryScope, type MemoryType } from "./memory-store.js";
import { MemoryService } from "./memory.service.js";

/** 接口边上的名字形状检查比存储层宽（允许下划线、80 字）：更细的规则由存储层报出具体原因。 */
const NAME_REGEX = /^[a-z0-9][a-z0-9_-]{0,79}$/;
const SCOPE_OPTIONS = ["user", "project"] as const;
const LIST_SCOPE_OPTIONS = ["user", "project", "all"] as const;

export class MemoryWriteDto {
  @IsIn(SCOPE_OPTIONS) scope!: MemoryScope;
  @IsString() @IsNotEmpty() @MaxLength(80) name!: string;
  @IsIn([...MEMORY_TYPES]) type!: MemoryType;
  @IsString() @IsNotEmpty() @MaxLength(MAX_MEMORY_DESCRIPTION_LENGTH) description!: string;
  // 按字符数粗筛（一个字符最多几个字节），精确的字节上限由存储层检查。
  @IsString() @MaxLength(MAX_MEMORY_BODY_BYTES * 2) body!: string;
  @IsOptional() @IsString() asset_uri?: string;
  @IsOptional() @IsIn([...ASSET_MODALITIES]) asset_modality?: AssetModality;
}

export class MemoryListQueryDto {
  @IsOptional() @IsIn(LIST_SCOPE_OPTIONS) scope?: MemoryScope | "all";
}

export class MemorySearchQueryDto {
  @IsString() @IsNotEmpty() q!: string;
  @IsOptional() @IsIn(LIST_SCOPE_OPTIONS) scope?: MemoryScope | "all";
  @IsOptional() @IsIn([...MEMORY_TYPES]) type?: MemoryType;
}

function nameError(name: string): BadRequestException {
  return new BadRequestException(`name shape invalid: ${name} (lowercase kebab-case; type prefix like "user_" auto-stripped)`);
}

@Controller()
export class MemoryController {
  constructor(private readonly memory: MemoryService) {}

  @Get("api/memory")
  async list(@Query() q: MemoryListQueryDto) {
    return { entries: await this.memory.list(q.scope) };
  }

  /** 回看窗口默认 1 小时、最长 7 天；参数不合法就用默认值，不回 400（这是个提示条）。 */
  @Get("api/memory/recent-auto")
  async recentAuto(@Query("lookback_ms") lookback?: string, @Query("limit") limit?: string) {
    const n = Number(lookback);
    const sinceMs = lookback && Number.isFinite(n) && n > 0 ? Math.min(n, 7 * 24 * 60 * 60 * 1000) : 60 * 60 * 1000;
    const l = Number(limit);
    return { entries: await this.memory.recentAuto(sinceMs, limit && Number.isFinite(l) && l > 0 ? Math.floor(l) : undefined) };
  }

  @Get("api/memory/search")
  async search(@Query() q: MemorySearchQueryDto) {
    return { entries: await this.memory.search(q.q, q.scope, q.type) };
  }

  @Get("api/memory/:scope/:name")
  read(@Param("scope") scope: string, @Param("name") name: string) {
    return this.memory.read(assertScope(scope), assertName(name));
  }

  @Post("api/memory")
  @HttpCode(200)
  write(@Body() body: MemoryWriteDto) {
    if (!NAME_REGEX.test(body.name)) throw nameError(body.name);
    return this.memory.write({
      scope: body.scope,
      name: body.name,
      type: body.type,
      description: body.description,
      body: body.body,
      ...(body.asset_uri !== undefined ? { asset_uri: body.asset_uri } : {}),
      ...(body.asset_modality !== undefined ? { asset_modality: body.asset_modality } : {}),
    });
  }

  @Delete("api/memory/:scope/:name")
  remove(@Param("scope") scope: string, @Param("name") name: string) {
    return this.memory.delete(assertScope(scope), assertName(name));
  }
}

function assertScope(scope: string): MemoryScope {
  if (scope !== "user" && scope !== "project") throw new BadRequestException(`scope must be 'user' or 'project', got '${scope}'`);
  return scope;
}

function assertName(name: string): string {
  if (!NAME_REGEX.test(name)) throw nameError(name);
  return name;
}
