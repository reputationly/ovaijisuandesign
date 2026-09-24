import { Global, Module } from "@nestjs/common";

import { ActiveGenerationsStore } from "./active-generations.store.js";
import { GenerateAsyncController, GenerateController } from "./generate.controller.js";
import { GenerationRunner } from "./generation-runner.service.js";
import { MediaConfigService } from "./media-config.service.js";

@Global()
@Module({
  controllers: [GenerateAsyncController, GenerateController],
  providers: [ActiveGenerationsStore, GenerationRunner, MediaConfigService],
  exports: [GenerationRunner, MediaConfigService],
})
export class GenerateModule {}
