import { Module } from "@nestjs/common";

import { ProjectKernelModule } from "../project-kernel/composition.module.js";
import { SitePreviewController } from "./site-preview.controller.js";
import { SitePreviewService } from "./site-preview.service.js";

@Module({
  imports: [ProjectKernelModule],
  controllers: [SitePreviewController],
  providers: [SitePreviewService],
  exports: [SitePreviewService],
})
export class SitePreviewModule {}
