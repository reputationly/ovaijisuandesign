import { Body, Controller, Delete, Get, Param, Patch, Post, Put } from "@nestjs/common";
import { Type } from "class-transformer";
import { ArrayMaxSize, ArrayNotEmpty, IsArray, IsIn, IsInt, IsNotEmpty, IsString, Min, ValidateIf, ValidateNested } from "class-validator";

import { MAX_CANVAS_TAG_ASSIGNMENTS_PER_BATCH } from "./canvas-tags.js";
import { CanvasTagsService } from "./canvas-tags.service.js";
import { CanvasService } from "./canvas.service.js";

export class UpdateAssetTagsDto {
  @IsArray() @IsString({ each: true }) tagIds!: string[];
}

export class AssetTagAssignmentDto {
  @IsString() @IsNotEmpty() assetId!: string;
  @IsArray() @IsString({ each: true }) tagIds!: string[];
}

export class UpdateAssetTagsBatchDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(MAX_CANVAS_TAG_ASSIGNMENTS_PER_BATCH)
  @ValidateNested({ each: true })
  @Type(() => AssetTagAssignmentDto)
  assignments!: AssetTagAssignmentDto[];
}

export class MutateAssetTagsBatchDto {
  @IsArray() @ArrayNotEmpty() @ArrayMaxSize(MAX_CANVAS_TAG_ASSIGNMENTS_PER_BATCH) @IsString({ each: true }) assetIds!: string[];
  @IsString() @IsNotEmpty() tagId!: string;
  @IsIn(["assign", "remove"]) operation!: "assign" | "remove";
}

export class CreateCanvasTagDto {
  @IsString() name!: string;
  @IsIn(["keyword"]) kind!: "keyword";
  @IsInt() @Min(0) revision!: number;
}

export class UpdateCanvasTagDto {
  @ValidateIf((_o, v) => v !== undefined) @IsString() name?: string;
  @ValidateIf((_o, v) => v !== undefined) @IsString() color?: string;
  @IsInt() @Min(0) revision!: number;
}

export class ReorderCanvasTagsDto {
  @IsArray() @IsString({ each: true }) tagIds!: string[];
  @IsInt() @Min(0) revision!: number;
}

export class DeleteCanvasTagDto {
  @IsInt() @Min(0) revision!: number;
}

/**
 * 画布标签：标签表的增删改排序、素材打标签。标签表和素材标签的规则都在 CanvasTagsService。
 * 修改类请求都带 revision，和当前不一致回 409（`CANVAS_TAG_REVISION_CONFLICT`），渲染层刷新后重试。
 */
@Controller()
export class CanvasTagsController {
  constructor(
    private readonly tags: CanvasTagsService,
    private readonly canvas: CanvasService,
  ) {}

  @Patch("api/assets/:id/tags")
  updateAssetTags(@Param("id") id: string, @Body() body: UpdateAssetTagsDto) {
    return this.tags.updateAssetTags(id, body.tagIds);
  }

  @Patch("api/assets/tags/batch")
  updateAssetTagsBatch(@Body() body: UpdateAssetTagsBatchDto) {
    return this.tags.updateAssetTagsBatch(body);
  }

  @Patch("api/assets/tags/mutations/batch")
  mutateAssetTagsBatch(@Body() body: MutateAssetTagsBatchDto) {
    return this.tags.mutateAssetTagsBatch(body);
  }

  @Get("api/canvas/tag-registry")
  async getTagRegistry() {
    return { registry: await this.tags.getRegistry() };
  }

  @Post("api/canvas/tags")
  createTag(@Body() body: CreateCanvasTagDto) {
    return this.tags.createTag(body);
  }

  @Put("api/canvas/tags/order")
  async reorderTags(@Body() body: ReorderCanvasTagsDto) {
    return { registry: await this.tags.reorderTags(body) };
  }

  @Patch("api/canvas/tags/:id")
  updateTag(@Param("id") id: string, @Body() body: UpdateCanvasTagDto) {
    return this.tags.updateTag(id, body);
  }

  /** 删除前的确认弹窗要显示「影响多少素材、多少画布节点」。 */
  @Get("api/canvas/tags/:id/impact")
  async impact(@Param("id") id: string) {
    const assetIds = await this.tags.getTaggedAssetIds(id);
    return { tagId: id, assetCount: assetIds.length, nodeCount: await this.countNodesForAssets(assetIds) };
  }

  @Delete("api/canvas/tags/:id")
  async deleteTag(@Param("id") id: string, @Body() body: DeleteCanvasTagDto) {
    const nodeCount = await this.countNodesForAssets(await this.tags.getTaggedAssetIds(id));
    const result = await this.tags.deleteTag(id, body.revision);
    return { ok: true, tagId: id, assetCount: result.affectedAssetIds.length, nodeCount, registry: result.registry, updatedAssets: result.updatedAssets };
  }

  private async countNodesForAssets(assetIds: string[]): Promise<number> {
    if (assetIds.length === 0) return 0;
    const targets = new Set(assetIds);
    const canvas = await this.canvas.getCanvas();
    return canvas.nodes.reduce((n, node) => {
      const data = node.data as { assetId?: unknown } | undefined;
      const assetId = (node as { assetId?: string }).assetId ?? (typeof data?.assetId === "string" ? data.assetId : undefined);
      return assetId && targets.has(assetId) ? n + 1 : n;
    }, 0);
  }
}
