import { Module } from "@nestjs/common";

import { TextVersionController } from "./text-version.controller.js";
import { TextVersionSummaryService } from "./text-version-summary.service.js";
import { TextVersionService } from "./text-version.service.js";

@Module({ controllers: [TextVersionController], providers: [TextVersionService, TextVersionSummaryService], exports: [TextVersionService] })
export class TextVersionModule {}
