import { Global, Module } from "@nestjs/common";

import { TrashBufferService } from "./trash-buffer.service.js";
import { UndoController } from "./undo.controller.js";

@Global()
@Module({ controllers: [UndoController], providers: [TrashBufferService], exports: [TrashBufferService] })
export class OperationsModule {}
