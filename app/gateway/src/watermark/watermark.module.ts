import { Module } from "@nestjs/common";

import { EditModule } from "../edit/edit.module.js";
import { WatermarkController } from "./watermark.controller.js";
import { WatermarkService } from "./watermark.service.js";

@Module({
  imports: [EditModule],
  providers: [WatermarkService],
  controllers: [WatermarkController],
  exports: [WatermarkService],
})
export class WatermarkModule {}
