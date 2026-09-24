import { Module } from "@nestjs/common";

import { CanvasModule } from "./canvas/canvas.module.js";
import { ChatModule } from "./chat/chat.module.js";
import { CommonModule } from "./common/common.module.js";
import { FilesModule } from "./files/files.module.js";
import { GenerateModule } from "./generate/generate.module.js";
import { HealthModule } from "./health/health.module.js";
import { OperationsModule } from "./operations/operations.module.js";
import { RuntimeModule } from "./runtime/runtime.module.js";
import { SafetyModule } from "./safety/safety.module.js";

/**
 * 根模块。模块按里程碑逐个补。
 */
@Module({ imports: [CommonModule, HealthModule, OperationsModule, FilesModule, CanvasModule, SafetyModule, RuntimeModule, ChatModule, GenerateModule] })
export class AppModule {}
