import { Global, Module } from "@nestjs/common";

import { MutationQueue } from "./mutation-queue.js";
import { PathRelocator } from "./path-relocator.service.js";
import { TrashBufferService } from "./trash-buffer.service.js";
import { UndoController } from "./undo.controller.js";

@Global()
@Module({
  controllers: [UndoController],
  providers: [TrashBufferService, MutationQueue, PathRelocator],
  exports: [TrashBufferService, MutationQueue, PathRelocator],
})
export class OperationsModule {}
