import { Global, Module } from "@nestjs/common";

import { GatewayConfig } from "../config/gateway-config.js";
import { AssetChangeLog } from "./asset-change-log.js";
import { AssetsService } from "./assets.service.js";
import { GatewayEventBus } from "./gateway-event-bus.js";
import { WorkspacePathService } from "./workspace-path.service.js";

/** 基础设施：配置、事件总线、工作区路径、资产库。全局可注入。 */
@Global()
@Module({
  providers: [GatewayConfig, GatewayEventBus, WorkspacePathService, AssetChangeLog, AssetsService],
  exports: [GatewayConfig, GatewayEventBus, WorkspacePathService, AssetChangeLog, AssetsService],
})
export class CommonModule {}
