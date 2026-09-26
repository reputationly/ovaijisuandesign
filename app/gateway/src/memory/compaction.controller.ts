import { BadRequestException, Body, Controller, Get, HttpCode, Param, Post, Query } from "@nestjs/common";

import { MemoryCompactionConfigService, MemoryCompactionService } from "./compaction.service.js";

const SNAPSHOT_ID_RE = /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z-[0-9a-f]{8}$/;

/**
 * 记忆压缩只作用于用户级记忆。请求里仍带 `scope`（界面的查询工厂按 scope 分键），但只接受 `user`，
 * 其他值（最可能的是好心传了 `project`）回 400 并说明规则。
 *
 * body 按原始对象收：字段校验在这里逐个做，报错信息比通用校验更具体。
 */
@Controller()
export class MemoryCompactionController {
  constructor(
    private readonly service: MemoryCompactionService,
    private readonly cfg: MemoryCompactionConfigService,
  ) {}

  @Get("api/memory-compaction/preview")
  preview(@Query("scope") scope?: string, @Query("force") force?: string) {
    assertUserScope(scope);
    return this.service.preview(force === "true" || force === "1");
  }

  @Post("api/memory-compaction/execute")
  @HttpCode(200)
  execute(@Body() body: Record<string, unknown>) {
    assertUserScope(body?.scope);
    return this.service.execute(coerceKeepNames(body?.keepNames));
  }

  @Get("api/memory-compaction/snapshots")
  async listSnapshots(@Query("scope") scope?: string) {
    assertUserScope(scope);
    return { snapshots: await this.service.listSnapshots() };
  }

  @Post("api/memory-compaction/snapshots/:id/restore")
  @HttpCode(200)
  restore(@Param("id") id: string, @Body() body: Record<string, unknown>) {
    if (!SNAPSHOT_ID_RE.test(id)) throw new BadRequestException("invalid snapshot id format");
    assertUserScope(body?.scope);
    return this.service.restore(id);
  }

  @Post("api/memory-compaction/rewrite/preview")
  @HttpCode(200)
  rewritePreview(@Body() body: Record<string, unknown>) {
    assertUserScope(body?.scope);
    return this.service.rewritePreview(coerceSelectedNames(body?.selectedNames));
  }

  @Post("api/memory-compaction/rewrite/execute")
  @HttpCode(200)
  rewriteExecute(@Body() body: Record<string, unknown>) {
    assertUserScope(body?.scope);
    if (typeof body?.proposalId !== "string" || body.proposalId.length === 0) throw new BadRequestException("proposalId must be a non-empty string");
    return this.service.rewriteExecute(body.proposalId);
  }

  @Get("api/memory-compaction/config")
  getConfig() {
    return this.cfg.get();
  }

  @Post("api/memory-compaction/config")
  @HttpCode(200)
  setConfig(@Body() body: Record<string, unknown>) {
    try {
      return this.cfg.patch(body ?? {});
    } catch (err) {
      throw new BadRequestException((err as Error).message);
    }
  }
}

function assertUserScope(scope: unknown): void {
  if (scope !== "user") {
    throw new BadRequestException(`scope must be 'user' (compaction operates on user-scope memory only), got '${String(scope)}'`);
  }
}

/** 可以不传；传了必须是字符串数组（界面勾选的保留项，别的形状是界面的 bug）。 */
function coerceKeepNames(raw: unknown): string[] | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!Array.isArray(raw)) throw new BadRequestException("keepNames must be an array of strings");
  for (const item of raw) if (typeof item !== "string") throw new BadRequestException(`keepNames must contain only strings, got ${typeof item}`);
  return raw as string[];
}

/** 必填、非空：合并改写作用于用户手选的条目，空选择是界面的 bug。 */
function coerceSelectedNames(raw: unknown): string[] {
  if (!Array.isArray(raw)) throw new BadRequestException("selectedNames must be an array of strings");
  if (raw.length === 0) throw new BadRequestException("selectedNames must contain at least one entry");
  for (const item of raw) if (typeof item !== "string" || item.length === 0) throw new BadRequestException("selectedNames must contain only non-empty strings");
  return raw as string[];
}
