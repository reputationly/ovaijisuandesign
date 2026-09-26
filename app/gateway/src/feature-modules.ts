import { Module } from "@nestjs/common";

import { CustomMcpModule } from "./custom-mcp/custom-mcp.module.js";
import { NetworkDiagnosticsModule } from "./diagnostics/network-diagnostics.module.js";
import { ExportModule } from "./export/export.module.js";
import { CanvasGroupExecutorModule } from "./group-executor/canvas-group-executor.module.js";
import { HeartbeatModule } from "./heartbeat/heartbeat.module.js";
import { I18nModule } from "./i18n/i18n.module.js";
import { MediaPreviewModule } from "./media-preview/media-preview.module.js";
import { MemoryModule } from "./memory/memory.module.js";
import { SearchModule } from "./search/search.module.js";
import { TextVersionModule } from "./text-version/text-version.module.js";

/**
 * 版本历史、记忆、会话导出、诊断等独立功能模块的汇总。单独成一个模块，根模块只多一行 import，
 * 并行开发的其他模块改根模块时不容易撞车。
 */
@Module({
  imports: [
    TextVersionModule,
    MemoryModule,
    HeartbeatModule,
    I18nModule,
    ExportModule,
    NetworkDiagnosticsModule,
    SearchModule,
    MediaPreviewModule,
    CustomMcpModule,
    CanvasGroupExecutorModule,
  ],
})
export class FeatureModules {}
