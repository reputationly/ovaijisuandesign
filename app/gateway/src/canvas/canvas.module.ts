import { Global, Module } from "@nestjs/common";

import { CanvasTagsController } from "./canvas-tags.controller.js";
import { CanvasTagsService } from "./canvas-tags.service.js";
import { CanvasController } from "./canvas.controller.js";
import { CanvasService } from "./canvas.service.js";

@Global()
@Module({ controllers: [CanvasController, CanvasTagsController], providers: [CanvasService, CanvasTagsService], exports: [CanvasService] })
export class CanvasModule {}
