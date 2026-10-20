import { Global, Module } from "@nestjs/common";

import { CanvasV3Module } from "../canvas-v3/canvas-v3.module.js";

import { CanvasTagsController } from "./canvas-tags.controller.js";
import { CanvasTagsService } from "./canvas-tags.service.js";
import { CanvasController } from "./canvas.controller.js";
import { LegacyCanvasGuard } from "./legacy-canvas.guard.js";
import { CanvasService } from "./canvas.service.js";

@Global()
@Module({ imports: [CanvasV3Module], controllers: [CanvasController, CanvasTagsController], providers: [CanvasService, CanvasTagsService, LegacyCanvasGuard], exports: [CanvasService] })
export class CanvasModule {}
