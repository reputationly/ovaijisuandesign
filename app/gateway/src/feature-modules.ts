import { Module } from "@nestjs/common";

import { CustomMcpModule } from "./custom-mcp/custom-mcp.module.js";
import { NetworkDiagnosticsModule } from "./diagnostics/network-diagnostics.module.js";
import { ExportModule } from "./export/export.module.js";
import { FeedbackModule } from "./feedback/feedback.service.js";
import { CanvasV3Module } from "./canvas-v3/canvas-v3.module.js";
import { DirectorVcamModule } from "./director-vcam/vcam.module.js";
import { EditorModule } from "./editor-v3/editor.module.js";
import { CanvasGroupExecutorModule } from "./group-executor/canvas-group-executor.module.js";
import { ProjectKernelModule } from "./project-kernel/composition.module.js";
import { HeartbeatModule } from "./heartbeat/heartbeat.module.js";
import { I18nModule } from "./i18n/i18n.module.js";
import { MediaPreviewModule } from "./media-preview/media-preview.module.js";
import { MemoryModule } from "./memory/memory.module.js";
import { SearchModule } from "./search/search.module.js";
import { TextVersionModule } from "./text-version/text-version.module.js";
import { WebMediaModule } from "./web-media/web-media.module.js";
import { SitePreviewModule } from "./site-preview/site-preview.module.js";

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
    FeedbackModule,
    NetworkDiagnosticsModule,
    SearchModule,
    MediaPreviewModule,
    CustomMcpModule,
    CanvasGroupExecutorModule,
    CanvasV3Module,
    EditorModule,
    DirectorVcamModule,
    ProjectKernelModule,
    WebMediaModule,
    SitePreviewModule,
  ],
})
export class FeatureModules {}
