import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";

import { CanvasService } from "../canvas/canvas.service.js";
import { GatewayEventBus } from "../common/gateway-event-bus.js";
import {
  RestoreTextVersionDto,
  SaveTextVersionDto,
  SummarizeTextVersionDto,
  TextVersionContentQueryDto,
  TextVersionDiffQueryDto,
  UpdateTextVersionDto,
} from "./text-version.dto.js";
import { TextVersionSummaryService } from "./text-version-summary.service.js";
import { TEXT_VERSION_DIFF_HUNK_LIMIT, TextVersionService } from "./text-version.service.js";

/** 首个版本没东西可比时，给摘要看的文档开头最多这么多字节。 */
const SUMMARY_HEAD_BYTES = 24 * 1024;

/**
 * 文本节点的版本历史（全屏编辑器的版本栏）。静态路径（diff / summarize）写在 `:id` 前面。
 */
@Controller()
export class TextVersionController {
  constructor(
    private readonly versions: TextVersionService,
    private readonly summary: TextVersionSummaryService,
    private readonly canvas: CanvasService,
    private readonly bus: GatewayEventBus,
  ) {}

  @Get("api/files/versions/diff")
  diff(@Query() q: TextVersionDiffQueryDto) {
    return this.versions.diff({
      from: q.from,
      ...(q.to ? { to: q.to } : {}),
      ...(q.offset !== undefined ? { offset: q.offset } : {}),
      ...(q.limit !== undefined ? { limit: q.limit } : {}),
    });
  }

  @Get("api/files/versions")
  list(@Query("assetId") assetId?: string, @Query("path") p?: string) {
    if (!assetId && !p) throw new BadRequestException("assetId or path is required");
    return this.versions.list({ ...(assetId ? { assetId } : {}), ...(p ? { path: p } : {}) });
  }

  @Post("api/files/versions")
  save(@Body() body: SaveTextVersionDto) {
    return this.versions.save({
      ...(body.assetId ? { assetId: body.assetId } : {}),
      ...(body.path ? { path: body.path } : {}),
      ...(body.title !== undefined ? { title: body.title } : {}),
      ...(body.note !== undefined ? { note: body.note } : {}),
      ...(body.noteSource ? { noteSource: body.noteSource } : {}),
      ...(body.nodeId ? { nodeId: body.nodeId } : {}),
      origin: "manual",
    });
  }

  /**
   * AI 起标题 + 写备注。带 `versionId` 是"先存、后命名"：总结那个已存的版本；不带就总结当前盘上的内容。
   * 对比基准默认取目标自己的上一版，不会拿一个版本和它自己比。
   */
  @Post("api/files/versions/summarize")
  async summarize(@Body() body: SummarizeTextVersionDto) {
    const ref = { ...(body.assetId ? { assetId: body.assetId } : {}), ...(body.path ? { path: body.path } : {}) };
    const target = body.versionId ? this.versions.get(body.versionId) : undefined;
    const baseId = body.baseVersionId ?? target?.baseVersionId ?? (target ? undefined : this.versions.getLatestVersionId(ref));
    if (baseId) {
      const diff = await this.versions.diff({ from: baseId, ...(target ? { to: target.id } : {}), limit: TEXT_VERSION_DIFF_HUNK_LIMIT.M });
      if (diff.total > 0) {
        return this.summary.summarizeDiff({ hunks: diff.hunks, totalHunks: diff.total, addedLines: diff.addedLines, removedLines: diff.removedLines });
      }
    }
    if (target) {
      const slice = await this.versions.readContent(target.id, 0, SUMMARY_HEAD_BYTES);
      return this.summary.summarizeDocument(slice.content, !slice.eof);
    }
    const head = await this.versions.readCurrentHead(ref, SUMMARY_HEAD_BYTES);
    return this.summary.summarizeDocument(head.head, head.truncated);
  }

  @Get("api/files/versions/:id/content")
  content(@Param("id") id: string, @Query() q: TextVersionContentQueryDto) {
    return this.versions.readContent(id, q.offset ?? 0, q.limit);
  }

  @Post("api/files/versions/:id/restore")
  async restore(@Param("id") id: string, @Body() body: RestoreTextVersionDto) {
    const result = await this.versions.restore(id, {
      ...(body.autoSnapshotNote ? { autoSnapshotNote: body.autoSnapshotNote } : {}),
      ...(body.nodeId ? { nodeId: body.nodeId } : {}),
    });
    await this.notifyTextAssetReplaced(this.versions.get(id).assetId).catch(() => undefined);
    return result;
  }

  @Post("api/files/versions/:id/materialize")
  materialize(@Param("id") id: string) {
    return this.versions.materialize(id);
  }

  @Patch("api/files/versions/:id")
  update(@Param("id") id: string, @Body() body: UpdateTextVersionDto) {
    return this.versions.update(id, body);
  }

  @Delete("api/files/versions/:id")
  async remove(@Param("id") id: string) {
    await this.versions.remove(id);
    return { ok: true };
  }

  /** 文件被整份换掉：引用它的文本节点都 bump 一下 textRevision，打开着的编辑器才会重读。 */
  private async notifyTextAssetReplaced(assetId: string): Promise<void> {
    const nodes = (await this.canvas.getCanvas()).nodes.filter((n) => n.assetId === assetId);
    if (nodes.length === 0) return;
    this.bus.emit("canvas:updated", {
      type: "canvas_updated",
      origin: "mcp-write",
      updatedNodes: nodes.map((n) => ({ ...n, data: { ...(n.data ?? {}), textRevision: Date.now() } })),
    });
  }
}
