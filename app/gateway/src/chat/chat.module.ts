import { Global, Module } from "@nestjs/common";

import { HealthModule } from "../health/health.module.js";
import { AppGateway } from "./app.gateway.js";
import { ChatAttachmentController } from "./chat-attachment.controller.js";
import { ChatService } from "./chat.service.js";
import { ConfirmService } from "./confirm.service.js";
import { InternalSessionsController, InternalToolSchemaController } from "./internal-sessions.controller.js";
import { SessionMetricsService } from "./session-metrics.service.js";

@Global()
@Module({
  imports: [HealthModule],
  controllers: [InternalSessionsController, InternalToolSchemaController, ChatAttachmentController],
  providers: [AppGateway, ChatService, ConfirmService, SessionMetricsService],
  exports: [ChatService, ConfirmService],
})
export class ChatModule {}
