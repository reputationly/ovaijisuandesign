import { Module } from "@nestjs/common";

import { ProjectKernelModule } from "../project-kernel/composition.module.js";
import { CodeProjectController } from "./code-project.controller.js";
import { CodeProjectService } from "./code-project.service.js";
import { CodePublishService } from "./code-publish.service.js";

@Module({
  imports: [ProjectKernelModule],
  controllers: [CodeProjectController],
  providers: [CodeProjectService, CodePublishService],
  exports: [CodeProjectService, CodePublishService],
})
export class CodeProjectModule {}
