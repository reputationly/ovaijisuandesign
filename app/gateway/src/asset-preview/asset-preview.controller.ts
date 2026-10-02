import { Controller, Get, Param, Query } from "@nestjs/common";

import { AssetPreviewService } from "./asset-preview.service.js";
import { DocumentReadService } from "./document-read.service.js";

@Controller()
export class AssetPreviewController {
  constructor(
    private readonly documents: DocumentReadService,
    private readonly preview: AssetPreviewService,
  ) {}

  /** 素材卡片悬停时的文本预览。chars 按原始字符串收：非法值按默认 200 字处理。 */
  @Get("api/asset/text-preview")
  textPreview(@Query("path") p?: string, @Query("chars") chars?: string) {
    return this.preview.textPreview(p ?? "", chars !== undefined ? Number(chars) : undefined);
  }

  /** query 按原始字符串收（不走 DTO）：非法值按默认值处理，而不是回 400 让 read 工具整个失败。 */
  @Get("api/internal/document/read")
  documentRead(
    @Query("path") p?: string,
    @Query("offset") offset?: string,
    @Query("limit") limit?: string,
    @Query("image_page") imagePage?: string,
  ) {
    return this.documents.read(
      p ?? "",
      offset !== undefined ? Number(offset) : undefined,
      limit !== undefined ? Number(limit) : undefined,
      imagePage !== undefined ? Number(imagePage) : undefined,
    );
  }

  @Get("api/asset/:id/metadata")
  metadata(@Param("id") id: string) {
    return this.preview.metadata(id);
  }
}
