import { Global, Module } from "@nestjs/common";

import { HealthModule } from "../health/health.module.js";
import { AppGateway } from "./app.gateway.js";
import { ChatService } from "./chat.service.js";
import { ConfirmService } from "./confirm.service.js";
import { InternalSessionsController, InternalToolSchemaController } from "./internal-sessions.controller.js";

@Global()
@Module({
  imports: [HealthModule],
  controllers: [InternalSessionsController, InternalToolSchemaController],
  providers: [AppGateway, ChatService, ConfirmService],
  exports: [ChatService, ConfirmService],
})
export class ChatModule {}
