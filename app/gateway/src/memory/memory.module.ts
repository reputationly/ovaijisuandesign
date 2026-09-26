import { Module } from "@nestjs/common";

import { MemoryCompactionController } from "./compaction.controller.js";
import { MemoryCompactionConfigService, MemoryCompactionService, ProposalCache, RewriteLlmService } from "./compaction.service.js";
import { MemoryController } from "./memory.controller.js";
import { MemoryService } from "./memory.service.js";

@Module({
  controllers: [MemoryController, MemoryCompactionController],
  providers: [MemoryService, MemoryCompactionConfigService, ProposalCache, RewriteLlmService, MemoryCompactionService],
  exports: [MemoryService],
})
export class MemoryModule {}
