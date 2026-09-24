import { Global, Module } from "@nestjs/common";

import { RuntimeConnection } from "./runtime-connection.js";
import { RuntimeController } from "./runtime.controller.js";

@Global()
@Module({ controllers: [RuntimeController], providers: [RuntimeConnection], exports: [RuntimeConnection] })
export class RuntimeModule {}
