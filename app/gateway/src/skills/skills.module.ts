import { Module } from "@nestjs/common";

import { SkillImportService } from "./skill-import.service.js";
import { SkillsController } from "./skills.controller.js";
import { SkillsService } from "./skills.service.js";

@Module({
  controllers: [SkillsController],
  providers: [SkillsService, SkillImportService],
  exports: [SkillsService],
})
export class SkillsModule {}
