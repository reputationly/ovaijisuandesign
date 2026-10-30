import { ProjectAnalyseController } from "./analyse.controller.js";
import { forwardRef, Module } from "@nestjs/common";

import { CanvasV3Module } from "../canvas-v3/canvas-v3.module.js";
import { EditModule } from "../edit/edit.module.js";
import { ProjectAcquisitionController, ProjectAcquisitionService } from "./acquisition.js";
import { ProjectCompositionController } from "./composition.controller.js";
import { ProjectDeliveryController, ProjectDeliveryService } from "./delivery.js";
import { ProjectDocumentController } from "./document.controller.js";
import { ProjectDocumentService } from "./document.service.js";
import { ProjectCompositionService } from "./composition.service.js";
import { ProjectResourceController } from "./resource.controller.js";
import { ProjectQueryController } from "./query.controller.js";
import { ProjectQueryService } from "./query.service.js";
import { ProjectResourceService } from "./resource.service.js";

@Module({
  imports: [forwardRef(() => CanvasV3Module), EditModule],
  controllers: [ProjectCompositionController, ProjectResourceController, ProjectQueryController, ProjectDocumentController, ProjectAcquisitionController, ProjectDeliveryController, ProjectAnalyseController],
  providers: [ProjectCompositionService, ProjectResourceService, ProjectQueryService, ProjectDocumentService, ProjectAcquisitionService, ProjectDeliveryService],
  exports: [ProjectCompositionService, ProjectResourceService, ProjectDeliveryService],
})
export class ProjectKernelModule {}
