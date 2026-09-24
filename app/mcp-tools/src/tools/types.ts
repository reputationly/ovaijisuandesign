import type { ReleaseRegion } from "../env.js";
import type { GatewayClient } from "../gateway-client.js";
import type { ToolRegistrar } from "../registrar.js";

/** 每个工具模块导出一个注册函数；加工具 = 写模块 + 在 index.ts 列一行。 */
export type RegisterTools = (registrar: ToolRegistrar, gateway: GatewayClient, region: ReleaseRegion) => void;
