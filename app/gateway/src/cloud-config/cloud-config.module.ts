import { Module } from "@nestjs/common";

import { CloudConfigController } from "./cloud-config.controller.js";

@Module({ controllers: [CloudConfigController] })
export class CloudConfigModule {}
