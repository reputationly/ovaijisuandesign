import { Module } from "@nestjs/common";

import { AssetPreviewController } from "./asset-preview.controller.js";
import { DocumentReadService } from "./document-read.service.js";

@Module({ controllers: [AssetPreviewController], providers: [DocumentReadService] })
export class AssetPreviewModule {}
