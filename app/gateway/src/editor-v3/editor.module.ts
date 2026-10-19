import { Module } from "@nestjs/common";

import { CanvasV3Module } from "../canvas-v3/canvas-v3.module.js";
import { ProjectKernelModule } from "../project-kernel/composition.module.js";
import { EditorDocumentService } from "./documents.js";
import { EditorController, ExecuteController } from "./editor.controller.js";
import { EditorCapabilityService } from "./editor.service.js";
import { EditorHostService } from "./host.js";
import { EditorSourceFiles } from "./source-files.js";

@Module({
  imports: [CanvasV3Module, ProjectKernelModule],
  controllers: [EditorController, ExecuteController],
  providers: [EditorCapabilityService, EditorSourceFiles, EditorDocumentService, EditorHostService],
})
export class EditorModule {}
