import { Global, Module } from "@nestjs/common";

import { CanvasController } from "./canvas.controller.js";
import { CanvasService } from "./canvas.service.js";

@Global()
@Module({ controllers: [CanvasController], providers: [CanvasService], exports: [CanvasService] })
export class CanvasModule {}
