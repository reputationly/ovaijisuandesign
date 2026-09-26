import { Module } from "@nestjs/common";

import { EditModule } from "../edit/edit.module.js";
import { AssetPreviewController } from "./asset-preview.controller.js";
import { AssetPreviewService } from "./asset-preview.service.js";
import { DocumentReadService } from "./document-read.service.js";

@Module({ imports: [EditModule], controllers: [AssetPreviewController], providers: [DocumentReadService, AssetPreviewService] })
export class AssetPreviewModule {}
