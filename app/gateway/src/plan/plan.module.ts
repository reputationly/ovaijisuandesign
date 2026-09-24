import { Module } from "@nestjs/common";

import { PlanController } from "./plan.controller.js";

@Module({ controllers: [PlanController] })
export class PlanModule {}
