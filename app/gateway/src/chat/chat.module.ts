import { Global, Module } from "@nestjs/common";

import { LocalSubjectService } from "../common/local-subject.service.js";
import { GenerateModule } from "../generate/generate.module.js";
import { TaskSubscriptionsService } from "../generate/task-subscriptions.service.js";
import { HealthModule } from "../health/health.module.js";
import { AppGateway } from "./app.gateway.js";
import { ChatAttachmentController } from "./chat-attachment.controller.js";
import { ChatService } from "./chat.service.js";
import { ConfirmService } from "./confirm.service.js";
import { InternalSessionsController, InternalToolSchemaController } from "./internal-sessions.controller.js";
import { ChatModelTraceController, ChatModelTraceService } from "./model-traces.js";
import { NextPromptSuggestionController } from "./next-prompt-suggestion.controller.js";
import { RequestGroupRegistry } from "./request-group.registry.js";
import { NextPromptSuggestionService } from "./next-prompt-suggestion/next-prompt-suggestion.service.js";
import { SessionMetricsService } from "./session-metrics.service.js";

@Global()
@Module({
  imports: [HealthModule, GenerateModule],
  controllers: [InternalSessionsController, InternalToolSchemaController, ChatAttachmentController, ChatModelTraceController, NextPromptSuggestionController],
  providers: [
    AppGateway,
    ChatService,
    ConfirmService,
    SessionMetricsService,
    ChatModelTraceService,
    // 第 26 轮：「下一步提示建议」（4.0.3 新增）
    NextPromptSuggestionService,
    // 第 62 轮：回合范围登记表（4.0.3 新增，外部 Agent 的 external-turn 依赖它）
    RequestGroupRegistry,
    // 第 246 轮：/ws 的任务订阅
    LocalSubjectService,
    TaskSubscriptionsService,
  ],
  exports: [ChatService, ConfirmService, TaskSubscriptionsService],
})
export class ChatModule {}
