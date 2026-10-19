import { Module } from "@nestjs/common";

import { PluginsModule } from "../plugins/plugins.controller.js";
import { SkillImportService } from "./skill-import.service.js";
import { SkillsController } from "./skills.controller.js";
import { SkillsService } from "./skills.service.js";

@Module({
  imports: [PluginsModule],
  controllers: [SkillsController],
  providers: [SkillsService, SkillImportService],
  exports: [SkillsService],
})
export class SkillsModule {}
