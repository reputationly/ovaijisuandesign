import { Controller, Get, Query } from "@nestjs/common";

import { DocumentReadService } from "./document-read.service.js";

@Controller()
export class AssetPreviewController {
  constructor(private readonly documents: DocumentReadService) {}

  /** query 按原始字符串收（不走 DTO）：非法值按默认值处理，而不是回 400 让 read 工具整个失败。 */
  @Get("api/internal/document/read")
  documentRead(@Query("path") p?: string, @Query("offset") offset?: string, @Query("limit") limit?: string) {
    return this.documents.read(p ?? "", offset !== undefined ? Number(offset) : undefined, limit !== undefined ? Number(limit) : undefined);
  }
}
