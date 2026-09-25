import { Module } from "@nestjs/common";

import { AssetPreviewModule } from "./asset-preview/asset-preview.module.js";
import { CanvasModule } from "./canvas/canvas.module.js";
import { ChatModule } from "./chat/chat.module.js";
import { CommonModule } from "./common/common.module.js";
import { EditModule } from "./edit/edit.module.js";
import { FeedbackExtractorModule } from "./feedback-extractor/feedback-extractor.module.js";
import { FilesModule } from "./files/files.module.js";
import { GenerateModule } from "./generate/generate.module.js";
import { HealthModule } from "./health/health.module.js";
import { OperationsModule } from "./operations/operations.module.js";
import { PlanModule } from "./plan/plan.module.js";
import { RuntimeModule } from "./runtime/runtime.module.js";
import { SafetyModule } from "./safety/safety.module.js";
import { SpeechModule } from "./speech/speech.module.js";

/**
 * 根模块。模块按里程碑逐个补。
 */
@Module({ imports: [CommonModule, HealthModule, OperationsModule, FilesModule, CanvasModule, SafetyModule, RuntimeModule, ChatModule, GenerateModule, SpeechModule, EditModule, PlanModule, FeedbackExtractorModule, AssetPreviewModule] })
export class AppModule {}
