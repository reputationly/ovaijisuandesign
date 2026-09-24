import { Global, Module } from "@nestjs/common";

import { AppGateway } from "./app.gateway.js";
import { ChatService } from "./chat.service.js";
import { ConfirmService } from "./confirm.service.js";
import { InternalSessionsController, InternalToolSchemaController } from "./internal-sessions.controller.js";

@Global()
@Module({
  controllers: [InternalSessionsController, InternalToolSchemaController],
  providers: [AppGateway, ChatService, ConfirmService],
  exports: [ChatService, ConfirmService],
})
export class ChatModule {}
