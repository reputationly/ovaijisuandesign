import { Module } from "@nestjs/common";

import { DirectorVcamController } from "./vcam.controller.js";
import { DirectorVcamService } from "./vcam.service.js";

@Module({
  controllers: [DirectorVcamController],
  providers: [DirectorVcamService],
})
export class DirectorVcamModule {}
