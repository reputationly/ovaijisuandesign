import { Module } from "@nestjs/common";

import { SafetyController } from "./safety.controller.js";

@Module({ controllers: [SafetyController] })
export class SafetyModule {}
