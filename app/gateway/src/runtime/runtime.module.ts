import { Global, Module } from "@nestjs/common";

import { EventPump } from "./event-pump.js";
import { RuntimeClient } from "./runtime-client.js";
import { RuntimeConnection } from "./runtime-connection.js";
import { RuntimeController } from "./runtime.controller.js";

@Global()
@Module({
  controllers: [RuntimeController],
  providers: [RuntimeConnection, RuntimeClient, EventPump],
  exports: [RuntimeConnection, RuntimeClient, EventPump],
})
export class RuntimeModule {}
