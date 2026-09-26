import { Module } from "@nestjs/common";

import { HealthModule } from "../health/health.module.js";
import { ProjectArchiveActivityService } from "./project-archive-activity.service.js";
import { ProjectArchiveActivityController, ProjectArchiveController } from "./project-archive.controller.js";

@Module({
  imports: [HealthModule],
  controllers: [ProjectArchiveController, ProjectArchiveActivityController],
  providers: [ProjectArchiveActivityService],
})
export class ProjectArchiveModule {}
