import { Global, Module } from "@nestjs/common";

import { EditModule } from "../edit/edit.module.js";
import { WatermarkModule } from "../watermark/watermark.module.js";
import { ProjectKernelModule } from "../project-kernel/composition.module.js";
import { CapabilityExecutionService } from "./execute-task.js";
import { MediaEditService } from "./media-edit.js";
import { ProjectTaskController, ProjectTaskService } from "./tasks.js";
import { ActiveGenerationsStore } from "./active-generations.store.js";
import { CapabilitiesController } from "./capabilities.controller.js";
import { GenerateAsyncController, GenerateController } from "./generate.controller.js";
import { GenerationRunner } from "./generation-runner.service.js";
import { MediaConfigService } from "./media-config.service.js";

@Global()
@Module({
  imports: [ProjectKernelModule, EditModule, WatermarkModule],
  controllers: [GenerateAsyncController, GenerateController, CapabilitiesController, ProjectTaskController],
  providers: [ActiveGenerationsStore, GenerationRunner, MediaConfigService, ProjectTaskService, MediaEditService, CapabilityExecutionService],
  exports: [GenerationRunner, MediaConfigService, CapabilityExecutionService],
})
export class GenerateModule {}
