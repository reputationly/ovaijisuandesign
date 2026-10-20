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
import { SessionMetricsService } from "./session-metrics.service.js";

@Global()
@Module({
  imports: [HealthModule, GenerateModule],
  controllers: [InternalSessionsController, InternalToolSchemaController, ChatAttachmentController, ChatModelTraceController],
  providers: [
    AppGateway,
    ChatService,
    ConfirmService,
    SessionMetricsService,
    ChatModelTraceService,
    // 第 246 轮：/ws 的任务订阅
    LocalSubjectService,
    TaskSubscriptionsService,
  ],
  exports: [ChatService, ConfirmService, TaskSubscriptionsService],
})
export class ChatModule {}
