import { Module } from "@nestjs/common";

import { AssetCenterModule } from "./asset-center/asset-center.controller.js";
import { AssetPreviewModule } from "./asset-preview/asset-preview.module.js";
import { CanvasModule } from "./canvas/canvas.module.js";
import { CanvasReferencesModule } from "./canvas-references/canvas-references.module.js";
import { ChatModule } from "./chat/chat.module.js";
import { CloudConfigModule } from "./cloud-config/cloud-config.module.js";
import { ComfyUiModule } from "./comfyui/comfyui.controller.js";
import { CommonModule } from "./common/common.module.js";
import { DagModule } from "./dag/dag.module.js";
import { EditModule } from "./edit/edit.module.js";
import { FeedbackExtractorModule } from "./feedback-extractor/feedback-extractor.module.js";
import { FilesModule } from "./files/files.module.js";
import { GenerateModule } from "./generate/generate.module.js";
import { HealthModule } from "./health/health.module.js";
import { LutsModule } from "./luts/luts.module.js";
import { MusicToolsModule } from "./music/music-tools.module.js";
import { OperationsModule } from "./operations/operations.module.js";
import { PlanModule } from "./plan/plan.module.js";
import { PluginsModule } from "./plugins/plugins.controller.js";
import { ProjectArchiveModule } from "./project-archive/project-archive.module.js";
import { RuntimeModule } from "./runtime/runtime.module.js";
import { SafetyModule } from "./safety/safety.module.js";
import { SkillsModule } from "./skills/skills.module.js";
import { SpeechModule } from "./speech/speech.module.js";

/**
 * 根模块。模块按里程碑逐个补。
 */
@Module({ imports: [CommonModule, HealthModule, OperationsModule, FilesModule, CanvasModule, SafetyModule, RuntimeModule, ChatModule, GenerateModule, SpeechModule, EditModule, PlanModule, FeedbackExtractorModule, AssetPreviewModule, SkillsModule, CloudConfigModule, AssetCenterModule, ComfyUiModule, PluginsModule, ProjectArchiveModule, LutsModule, DagModule, CanvasReferencesModule, MusicToolsModule] })
export class AppModule {}
